import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {blobSha, changedFiles, makeGitHubPayload, selectChecks, main} from '../scripts/release.mjs';

const root = mkdtempSync(join(tmpdir(), 'atlas-release-'));
const write = (p, content) => {mkdirSync(join(root, p, '..'), {recursive: true}); writeFileSync(join(root, p), content);};
const git = (...args) => execFileSync('git', args, {cwd: root, stdio: ['ignore', 'pipe', 'pipe']}).toString().trim();
const quiet = fn => { const log = console.log; console.log = () => {}; try { return fn(); } finally { console.log = log; } };
const call = (...args) => quiet(() => main(args, root));
try {
  git('init'); git('config', 'user.email', 'fixture@example.test'); git('config', 'user.name', 'Release fixture');
  write('.gitignore', '.release-state/\n.runs\ndist/\n'); write('README.md', 'fixture');
  const smoke = "import {readFileSync,writeFileSync,existsSync} from 'node:fs'; writeFileSync('.runs',String((existsSync('.runs')?Number(readFileSync('.runs')):0)+1));\n";
  write('tests/smoke.mjs', smoke); git('add', '.'); git('commit', '-m', 'fixture');
  const base = git('rev-parse', 'HEAD');
  const bytes = Buffer.from('中文\n'); write('utf8.txt', bytes);
  assert.equal(blobSha(bytes), git('hash-object', 'utf8.txt'));
  rmSync(join(root, 'utf8.txt'));
  assert.deepEqual(changedFiles([{path: 'gone', sha: '1', mode: '100644'}], []).map(f => [f.path, f.operation, f.sha]), [['gone', 'delete', null]]);
  console.log('PASS release hashes match Git and deleted paths are represented explicitly');

  write('large.json', '汉'.repeat(2000)); write('small.txt', 'hello'); write('binary.bin', Buffer.from([0, 255, 12]));
  const files = ['large.json', 'small.txt', 'binary.bin'].map(path => ({path, sha: blobSha(readFileSync(join(root, path))), mode: '100644'}));
  const payload = makeGitHubPayload(root, files, 'a'.repeat(40), 900);
  assert(Buffer.byteLength(JSON.stringify(payload.tree, null, 2) + '\n') <= 900);
  assert.equal(payload.blobs.length, 2); assert(payload.blobs.some(b => b.request.encoding === 'base64'));
  assert.equal(payload.tree.tree_elements.find(f => f.path === 'small.txt').content, 'hello');
  write('small.txt', 'changed'); assert.throws(() => makeGitHubPayload(root, files, 'a'.repeat(40)), /Source changed/);
  for (const f of files) rmSync(join(root, f.path));
  console.log('PASS UTF-8 byte budgets, binary uploads and changed-content detection keep release requests exact');

  const available = ['tests/release.mjs', 'tests/public-data.mjs', 'tests/domain.mjs'];
  assert.equal(selectChecks(['docs/guide.md'], available).length, 0);
  assert.deepEqual(selectChecks(['scripts/prepare-pages.mjs'], available).map(c => c.id), ['tests/public-data.mjs']);
  assert.equal(selectChecks(['lib/catalog.json'], available).length, available.length + 1);
  assert.equal(selectChecks(['unknown-runtime.js'], available).length, available.length + 1);
  console.log('PASS focused changes select relevant checks and unknown/shared changes retain the full suite');

  write('tests/smoke.mjs', smoke + '// first change\n');
  let plan = call('plan', '--base', base);
  call('check'); call('check'); assert.equal(readFileSync(join(root, '.runs'), 'utf8'), '1');
  write('tests/smoke.mjs', smoke + '// second change\n');
  assert.throws(() => call('check'), /Source changed/);
  plan = call('plan', '--base', base); call('check'); assert.equal(readFileSync(join(root, '.runs'), 'utf8'), '2');
  write('tests/smoke.mjs', smoke + 'process.exit(1);'); call('plan', '--base', base);
  assert.throws(() => call('check'), /Failed/); assert.throws(() => call('check'), /Failed/);
  assert.equal(readFileSync(join(root, '.runs'), 'utf8'), '4');
  write('tests/smoke.mjs', smoke + '// second change\n'); plan = call('plan', '--base', base);
  console.log('PASS unchanged successful checks are reused; changed sources and failed checks are never skipped');

  write('dist/server/index.js', 'export default {}'); write('dist/server/wrangler.json', '{}');
  call('stamp-build', '--input', plan.buildInput); assert.equal(call('status').reuseWorkerBuild, true);
  write('dist/server/index.js', 'altered'); assert.equal(call('status').reuseWorkerBuild, false);
  assert.throws(() => call('stamp-build', '--input', 'wrong'), /Build inputs changed/);
  console.log('PASS build reuse requires matching inputs and unchanged output artifacts');

  plan = call('plan', '--base', base, '--github-head', 'a'.repeat(40), '--github-tree', 'b'.repeat(40));
  write('.release-state/remote.json', JSON.stringify({sha: 'c'.repeat(40), tree: plan.files.map(f => ({path: f.path, sha: f.sha, mode: f.mode}))}));
  call('verify-tree', '--file', '.release-state/remote.json');
  call('receipt', '--stage', 'githubCommit', '--id', 'd'.repeat(40), '--status', 'saved');
  assert(call('status').receipts.githubCommit);
  call('plan', '--base', base, '--github-head', 'e'.repeat(40), '--github-tree', 'b'.repeat(40));
  assert.equal(call('status').receipts.githubCommit, undefined);
  write('.release-state/remote.json', JSON.stringify({sha: 'c'.repeat(40), tree: []}));
  assert.throws(() => call('verify-tree', '--file', '.release-state/remote.json'), /Remote content mismatch/);
  assert.throws(() => call('receipt', '--stage', 'credential', '--id', 'secret', '--status', 'saved'), /Unknown release stage/);
  console.log('PASS remote content is verified, new branch baselines invalidate old receipts, and credentials are not a receipt stage');
} finally { rmSync(root, {recursive: true, force: true}); }
