// Public deployment checks. No credentials, visitor data, or valid messages are sent.
import assert from 'node:assert/strict';

const pages = 'https://123tthh.github.io/Atlas-Embodied-intelligence-site/';
const cloud = 'https://embodied-atlas.xyl1122.chatgpt.site';
const origin = new URL(pages).origin;
async function request(url, options = {}) {
  return fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000), ...options });
}

const homepage = await request(pages);
assert.equal(homepage.status, 200, 'The Pages homepage must be publicly accessible');
const html = await homepage.text();
assert.match(html, /Embodied Atlas/);
const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(m => new URL(m[1], pages));
assert.ok(assets.length >= 2, 'The application needs a script and stylesheet');
for (const asset of assets) {
  assert.equal(asset.origin, origin, 'Core assets must be hosted with the Pages website');
  const response = await request(asset);
  assert.equal(response.status, 200, 'Published asset: ' + asset.pathname);
  await response.arrayBuffer();
}
const catalogResponse = await request(new URL('data/catalog.json', pages));
assert.equal(catalogResponse.status, 200);
const catalog = await catalogResponse.json();
assert.ok(catalog.papers.length >= 354 && catalog.edges.length >= 137, 'The public catalog must be complete');
console.log('PASS public Pages homepage, local assets and ' + catalog.papers.length + ' research records');

const preflight = await request(cloud + '/api/messages', { method: 'OPTIONS', headers: {
  Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type',
} });
assert.equal(preflight.status, 204, 'Anonymous Pages preflight must succeed');
assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
assert.match(preflight.headers.get('access-control-allow-methods') || '', /POST/);
assert.equal(preflight.headers.get('access-control-allow-credentials'), null);
console.log('PASS anonymous cross-origin inbox preflight');

// An empty invalid payload exercises anonymous delivery without creating a message.
const invalid = await request(cloud + '/api/messages', { method: 'POST', headers: {
  Origin: origin, 'Content-Type': 'application/json',
}, body: '{}' });
assert.equal(invalid.status, 400, 'Anonymous POST must reach input validation without sign-in');
assert.equal(invalid.headers.get('access-control-allow-origin'), origin);
assert.equal((await invalid.json()).code, 'invalid');
console.log('PASS anonymous inbox reaches validation without authentication');

const privateInbox = await request(cloud + '/api/messages');
assert.equal(privateInbox.status, 403, 'Visitor messages must stay private');
assert.ok((await privateInbox.json()).error);
console.log('PASS anonymous readers cannot access private messages');
