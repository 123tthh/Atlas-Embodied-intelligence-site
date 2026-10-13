// Local preparation only. Publication still uses the authorized Sites/GitHub tools.
import {execFileSync, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync, readdirSync, lstatSync, readlinkSync, existsSync, renameSync} from 'node:fs';
import {resolve, dirname, relative, join} from 'node:path';
import {pathToFileURL} from 'node:url';

const repository = '123tthh/Atlas-Embodied-intelligence-site';
const stateRoot = '.release-state';
const json = value => JSON.stringify(value, null, 2) + '\n';
const hash = value => createHash('sha256').update(value).digest('hex');
export const blobSha = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const git = (root, args) => execFileSync('git', args, {cwd: root, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024}).toString();
const docsOnly = p => /^(docs\/|(?:README|RELEASE_NOTES|AGENTS)\.md$|LICENSE$)/.test(p);
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
function save(path, value) { mkdirSync(dirname(path), {recursive: true}); writeFileSync(path + '.tmp', json(value)); renameSync(path + '.tmp', path); }

export function snapshot(root) {
  const paths = [...new Set(git(root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean))].sort();
  return paths.filter(path => existsSync(join(root, path))).map(path => {
    if (path.startsWith(stateRoot + '/')) throw new Error('Release state must be ignored by Git');
    const file = join(root, path), stat = lstatSync(file);
    if (!stat.isFile() && !stat.isSymbolicLink()) throw new Error('Unsupported source entry: ' + path);
    const bytes = stat.isSymbolicLink() ? Buffer.from(readlinkSync(file)) : readFileSync(file);
    return {path, mode: stat.isSymbolicLink() ? '120000' : stat.mode & 0o111 ? '100755' : '100644', sha: blobSha(bytes), bytes: bytes.length};
  });
}
export const fingerprint = entries => hash(json(entries.map(({path, mode, sha}) => ({path, mode, sha}))));
function baseEntries(root, base) {
  return git(root, ['ls-tree', '-rz', '--full-tree', base]).split('\0').filter(Boolean).map(row => {
    const [, mode, type, sha, path] = row.match(/^(\d+) (\w+) ([0-9a-f]+)\t([\s\S]+)$/);
    if (type !== 'blob') throw new Error('Submodules need a separate release review: ' + path);
    return {path, mode, sha};
  });
}
export function changedFiles(before, after) {
  const old = new Map(before.map(f => [f.path, f])), current = new Map(after.map(f => [f.path, f]));
  return [...new Set([...old.keys(), ...current.keys()])].sort().flatMap(path => {
    const a = old.get(path), b = current.get(path);
    if (a?.sha === b?.sha && a?.mode === b?.mode) return [];
    return [{...b, path, sha: b?.sha || null, previousSha: a?.sha || null, mode: b?.mode || a.mode, operation: !a ? 'add' : !b ? 'delete' : 'modify'}];
  });
}

export function selectChecks(paths, available) {
  const chosen = new Set(); let typecheck = false, all = false;
  for (const p of paths) {
    if (docsOnly(p) || /\.(css|svg|png|jpe?g|webp|ico)$/.test(p)) continue;
    if (/^tests\/[^/]+\.mjs$/.test(p)) { chosen.add(p); continue; }
    if (p === 'scripts/release.mjs') { chosen.add('tests/release.mjs'); continue; }
    if (/^scripts\/(public-data|prepare-pages)\.mjs$/.test(p)) { chosen.add('tests/public-data.mjs'); continue; }
    if (/^(lib\/researcher-network\.ts|app\/ui\/ResearcherNetwork\.tsx)$/.test(p)) {
      chosen.add('tests/researcher-network.mjs'); chosen.add('tests/directory.mjs'); typecheck = true; continue;
    }
    // Catalog, shared code, dependency, CI and unfamiliar changes take the full path.
    all = true; typecheck = true;
  }
  const tests = (all ? available : [...chosen]).filter(p => available.includes(p)).sort();
  return [...tests.map(p => ({id: p, command: ['node', p]})), ...(typecheck ? [{id: 'types', command: ['node', 'node_modules/typescript/bin/tsc', '--noEmit']}] : [])];
}

export function makeGitHubPayload(root, files, baseTree, maxBytes = 120000) {
  const blobs = new Map();
  const entries = files.map(f => {
    if (!f.sha) return {path: f.path, mode: f.mode, type: 'blob', sha: null};
    const file = join(root, f.path), bytes = f.mode === '120000' ? Buffer.from(readlinkSync(file)) : readFileSync(file);
    if (blobSha(bytes) !== f.sha) throw new Error('Source changed during preparation: ' + f.path);
    const content = bytes.toString('utf8'), text = Buffer.from(content).equals(bytes) && !content.includes('\0');
    blobs.set(f.sha, {repository_full_name: repository, encoding: text ? 'utf-8' : 'base64', content: text ? content : bytes.toString('base64')});
    return {path: f.path, mode: f.mode, type: 'blob', ...(text ? {content} : {sha: f.sha})};
  });
  const request = {repository_full_name: repository, base_tree_sha: baseTree, tree_elements: entries};
  while (Buffer.byteLength(json(request)) > maxBytes) {
    const largest = entries.filter(e => 'content' in e).sort((a, b) => Buffer.byteLength(b.content) - Buffer.byteLength(a.content))[0];
    if (!largest) throw new Error('Too many changed paths for one reviewed release; reduce the release scope');
    largest.sha = files.find(f => f.path === largest.path).sha; delete largest.content;
  }
  const required = [...new Set(entries.map(e => e.sha).filter(Boolean))];
  return {tree: request, blobs: required.map(sha => ({sha, request: blobs.get(sha)}))};
}

function artifactHash(root, folder) {
  const entries = [];
  function visit(dir) {
    if (!existsSync(dir)) return;
    for (const item of readdirSync(dir, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = join(dir, item.name);
      if (item.isDirectory()) visit(p);
      else if (item.isFile()) entries.push([relative(root, p), hash(readFileSync(p))]);
      else throw new Error('Unexpected build artifact: ' + p);
    }
  }
  visit(join(root, folder)); return entries.length ? hash(json(entries)) : null;
}
function buildInput(root, entries) {
  const code = entries.filter(f => !docsOnly(f.path) && !/^(tests\/|\.github\/)/.test(f.path));
  const envFiles = readdirSync(root).filter(p => /^\.env(?:\.|$)/.test(p) && lstatSync(join(root, p)).isFile()).sort().map(p => [p, hash(readFileSync(join(root, p)))]);
  const buildEnv = Object.keys(process.env).filter(k => /^(NODE_ENV$|VITE_|NEXT_PUBLIC_|PAGES_BASE_PATH$)/.test(k)).sort().map(k => [k, hash(process.env[k])]);
  return hash(json({source: fingerprint(code), generated: artifactHash(root, 'public/data'), envFiles, buildEnv, node: process.version, platform: process.platform, arch: process.arch}));
}
function availableTests(root) { return readdirSync(join(root, 'tests')).filter(n => n.endsWith('.mjs')).map(n => 'tests/' + n).sort(); }
function loadPlan(root) { const latest = readJson(join(root, stateRoot, 'latest.json')); return readJson(join(root, latest.manifest)); }
function unchanged(root, plan) { if (fingerprint(snapshot(root)) !== plan.fingerprint) throw new Error('Source changed. Prepare a new release plan before resuming.'); }
const shaOption = (value, label) => { if (!/^[0-9a-f]{40}$/.test(value || '')) throw new Error(label + ' must be a verified full Git SHA'); return value; };

function options(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (!/^--[a-z-]+$/.test(args[i])) throw new Error('Unexpected argument: ' + args[i]);
    const key = args[i].slice(2);
    if (['all', 'no-cache'].includes(key)) result[key] = true;
    else { if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Missing value for ' + args[i]); result[key] = args[++i]; }
  }
  return result;
}

export function main(args = process.argv.slice(2), cwd = process.cwd()) {
  const [action = 'status', ...rest] = args, opt = options(rest), root = git(cwd, ['rev-parse', '--show-toplevel']).trim();
  if (action === 'plan') {
    const base = git(root, ['rev-parse', '--verify', (opt.base || 'HEAD') + '^{commit}']).trim();
    const entries = snapshot(root), files = changedFiles(baseEntries(root, base), entries), sig = fingerprint(entries);
    const dir = join(stateRoot, 'releases', sig.slice(0, 20)), manifest = join(dir, 'manifest.json');
    const checks = selectChecks(files.map(f => f.path), availableTests(root));
    const plan = {schema: 1, base, fingerprint: sig, buildInput: buildInput(root, entries), files, checks,
      browserCheck: files.some(f => /^(app\/|static-site\/|public\/)/.test(f.path)),
      apiCheck: files.some(f => /^(app\/api\/|lib\/(server|update-contract)\.ts|db\/|drizzle\/)/.test(f.path)),
      manifest, state: join(dir, 'state.json'), github: null};
    if (opt['github-head'] || opt['github-tree']) {
      const head = shaOption(opt['github-head'], 'GitHub head'), tree = shaOption(opt['github-tree'], 'GitHub base tree');
      const payload = makeGitHubPayload(root, files, tree);
      const treeFile = join(dir, 'github-tree.json'); save(join(root, treeFile), payload.tree);
      const blobs = payload.blobs.map(({sha, request}) => { const file = join(dir, 'blobs', sha + '.json'); save(join(root, file), request); return {sha, file}; });
      plan.github = {head, baseTree: tree, treeFile, treeBytes: Buffer.byteLength(json(payload.tree)), blobs};
    }
    save(join(root, manifest), plan); save(join(root, stateRoot, 'latest.json'), {manifest});
    const previous = existsSync(join(root, plan.state)) ? readJson(join(root, plan.state)) : {receipts: {}, blobs: []};
    const githubBase = plan.github ? plan.github.head + ':' + plan.github.baseTree : null;
    if (previous.githubBase !== githubBase) for (const key of Object.keys(previous.receipts)) if (key.startsWith('github')) delete previous.receipts[key];
    save(join(root, plan.state), {...previous, githubBase});
    console.log(json({manifest, fingerprint: sig, changedFiles: files.length, checks: checks.map(c => c.id), browserCheck: plan.browserCheck, apiCheck: plan.apiCheck, github: plan.github}));
    return plan;
  }
  if (action === 'check') {
    const entries = snapshot(root), available = availableTests(root);
    const checks = opt.all ? [...available.map(p => ({id: p, command: ['node', p]})), {id: 'types', command: ['node', 'node_modules/typescript/bin/tsc', '--noEmit']}] : loadPlan(root).checks;
    if (!opt.all) unchanged(root, loadPlan(root));
    const key = hash(json({files: fingerprint(entries.filter(f => !docsOnly(f.path))), node: process.version, platform: process.platform, arch: process.arch}));
    const file = join(root, stateRoot, 'checks.json'), cache = existsSync(file) ? readJson(file) : {};
    for (const check of checks) {
      if (!opt['no-cache'] && cache[check.id] === key) { console.log('REUSE ' + check.id); continue; }
      const [command, ...argv] = check.command;
      const run = spawnSync(command === 'node' ? process.execPath : command, argv, {cwd: root, stdio: ['ignore', 'inherit', 'inherit']});
      if (run.error || run.status !== 0) { delete cache[check.id]; save(file, cache); throw run.error || new Error('Failed: ' + check.id); }
      cache[check.id] = key; save(file, cache);
    }
    console.log(`Validated ${checks.length} check groups.`); return;
  }
  const plan = loadPlan(root); unchanged(root, plan);
  const stateFile = join(root, plan.state), state = readJson(stateFile);
  if (action === 'stamp-build') {
    if (opt.input !== buildInput(root, snapshot(root))) throw new Error('Build inputs changed; do not reuse this build');
    for (const p of ['dist/server/index.js', 'dist/server/wrangler.json']) if (!existsSync(join(root, p))) throw new Error('Missing successful Worker output: ' + p);
    save(join(root, stateRoot, 'worker-build.json'), {input: opt.input, artifacts: artifactHash(root, 'dist')});
    console.log('Recorded the verified Worker build.'); return;
  }
  if (action === 'verify-tree') {
    const tree = readJson(resolve(root, opt.file));
    if (!Array.isArray(tree.tree) || tree.truncated) throw new Error('A complete GitHub tree is required');
    for (const f of plan.files) {
      const remote = tree.tree.find(e => e.path === f.path);
      if (f.sha ? remote?.sha !== f.sha || remote?.mode !== f.mode : !!remote) throw new Error('Remote content mismatch: ' + f.path);
    }
    state.receipts.githubTree = {id: shaOption(tree.sha, 'Tree'), status: 'verified'}; save(stateFile, state);
    console.log(`Verified ${plan.files.length} released files against GitHub.`); return;
  }
  if (action === 'receipt') {
    const stages = ['sitesSource', 'sitesVersion', 'sitesDeployment', 'githubCommit', 'githubRef', 'githubPages'];
    if (opt.stage === 'blob') {
      const sha = shaOption(opt.sha, 'Blob');
      if (!plan.github?.blobs.some(b => b.sha === sha)) throw new Error('Blob is not part of this release');
      state.blobs = [...new Set([...state.blobs, sha])];
    } else {
      if (!stages.includes(opt.stage)) throw new Error('Unknown release stage');
      if (!opt.id || !/^[a-zA-Z0-9_~.:-]+$/.test(opt.id)) throw new Error('A tool-returned receipt ID is required');
      if (!['saved', 'pending', 'building', 'publishing', 'succeeded', 'failed'].includes(opt.status)) throw new Error('Use the actual returned status');
      if (opt.sha) shaOption(opt.sha, 'Receipt commit');
      state.receipts[opt.stage] = {id: opt.id, status: opt.status, ...(opt.sha ? {commitSha: opt.sha} : {})};
    }
    save(stateFile, state); console.log('Saved release progress without credentials.'); return;
  }
  if (action !== 'status') throw new Error('Unknown command: ' + action);
  const stampFile = join(root, stateRoot, 'worker-build.json'), stamp = existsSync(stampFile) ? readJson(stampFile) : null;
  const reuseBuild = !!stamp && stamp.input === buildInput(root, snapshot(root)) && stamp.artifacts === artifactHash(root, 'dist');
  const status = {manifest: plan.manifest, unchanged: true, reuseWorkerBuild: reuseBuild, buildInput: buildInput(root, snapshot(root)),
    remainingBlobs: plan.github?.blobs.filter(b => !state.blobs.includes(b.sha)) || [], treeRequest: plan.github?.treeFile,
    receipts: state.receipts, browserCheck: plan.browserCheck, apiCheck: plan.apiCheck};
  console.log(json(status)); return status;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
