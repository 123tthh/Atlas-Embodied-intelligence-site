// Only run explicitly against the local production preview with the documented fixtures.
import assert from 'node:assert/strict';
import { encode } from '@auth/core/jwt';
const base = 'http://127.0.0.1:4173';
const secret = 'local-only-session-secret-local-only-session-secret';
const missingId = crypto.randomUUID();
async function cookie(id, options = {}) {
  const token = await encode({ token: { sub: 'github:' + id, githubId: id, name: '123tthh' }, secret: options.secret || secret, salt: 'atlas.session-token', maxAge: options.maxAge ?? 3600 });
  return 'atlas.session-token=' + token;
}
const owner = await cookie('184354549'), outsider = await cookie('999999');
async function request(path, cookies = '', options = {}) {
  const response = await fetch(base + path, { redirect: 'manual', ...options, headers: { cookie: cookies, Origin: base, Connection: 'close', 'Content-Type': 'application/json', ...options.headers }, signal: AbortSignal.timeout(60000) });
  return new Response(await response.arrayBuffer(), response);
}
const page = await request('/login?return_to=/?view=proposals');
assert.equal(page.status, 200); assert((await page.text()).includes('123tthh'));
for (const [label, value] of [['anonymous', ''], ['other ID', outsider], ['forged', 'atlas.session-token=forged'], ['expired', await cookie('184354549', { maxAge: -60 })], ['wrong secret', await cookie('184354549', { secret: 'wrong-fixture-secret'.repeat(3) })]]) {
  for (const path of ['/api/messages', '/api/analytics']) assert.equal((await request(path, value)).status, 403, label + path);
  assert.equal((await request('/api/proposals', value, { method: 'PATCH', body: JSON.stringify({ id: 'local-nonexistent-fixture', status: 'approved' }) })).status, 403, label + ' cannot review');
}
console.log('PASS live local routes reject anonymous, other-account, forged, expired and wrong-key sessions');
assert.equal((await request('/api/messages', owner)).status, 200);
assert.equal((await request('/api/analytics', owner)).status, 200);
assert.equal((await request('/api/messages', owner, { method: 'PATCH', headers: { Origin: 'https://evil.invalid' }, body: JSON.stringify({ id: 'local-nonexistent-fixture', status: 'done' }) })).status, 403);
assert.equal((await request('/api/messages', owner, { method: 'PATCH', body: JSON.stringify({ id: missingId, status: 'done' }) })).status, 404);
const html = await (await request('/?view=proposals', owner)).text();
assert(html.includes('地图维护者')); assert(html.includes('/api/auth/signout'));
const legacy = await request('/api/messages', '', { headers: { 'oai-authenticated-user-id': 'qa-admin', 'oai-authenticated-user-email': 'qa-admin@sites.test' } });
assert.equal(legacy.status, 200);
console.log('PASS owner sees the private inbox and analytics; cross-origin moderation fails; ChatGPT maintenance still works');
const csrf = await request('/api/auth/csrf'); assert.equal(csrf.status, 200);
const csrfToken = (await csrf.json()).csrfToken;
const cookies = csrf.headers.getSetCookie().map(s => s.split(';')[0]).join('; ');
const login = await request('/api/auth/signin/github', cookies, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Auth-Return-Redirect': '1' }, body: new URLSearchParams({ csrfToken, callbackUrl: '/?view=proposals' }) });
assert.equal(login.status, 200);
const redirect = new URL((await login.json()).url); assert.equal(redirect.origin, 'https://github.com');
assert.equal(redirect.searchParams.get('client_id'), 'local-fixture-client');
assert(redirect.searchParams.get('state')); assert(redirect.searchParams.get('code_challenge'));
console.log('PASS real Worker login route sets CSRF/state/PKCE and returns a GitHub redirect without contacting GitHub');
