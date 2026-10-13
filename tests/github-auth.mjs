// Authentication protocol fixtures only; never contact GitHub or a hosted Site.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { encode } from '@auth/core/jwt';
let code = ts.transpile(await readFile(new URL('../lib/github-auth-core.ts', import.meta.url), 'utf8'), { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 });
code = code.replace(/from '(@auth\/core[^']*)'/g, (_, name) => `from '${import.meta.resolve(name)}'`);
const { handleGitHubAuth: auth, githubIdentity, githubReady, safeReturnTo, sessionCookie, GITHUB_OWNER_ID, AUTH_ORIGIN: origin } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const secrets = { AUTH_GITHUB_ID: 'local-fixture-client', AUTH_GITHUB_SECRET: 'local-fixture-secret', AUTH_SECRET: 'local-only-session-secret-'.repeat(3) };
const originalFetch = globalThis.fetch;
let profileId = GITHUB_OWNER_ID, requests = [];
globalThis.fetch = async (input, init) => {
  const request = new Request(input, init); requests.push(request.url);
  if (request.url === 'https://github.com/login/oauth/access_token') {
    const body = new URLSearchParams(await request.text());
    assert(body.get('code_verifier'), 'PKCE verifier must be exchanged');
    assert.equal(body.get('redirect_uri'), origin + '/api/auth/callback/github');
    return Response.json({ access_token: 'fixture-provider-token', token_type: 'bearer', scope: 'read:user' });
  }
  if (request.url === 'https://api.github.com/user') {
    assert.equal(request.headers.get('authorization'), 'Bearer fixture-provider-token');
    return Response.json({ id: Number(profileId), login: '123tthh', name: 'Fixture', email: null });
  }
  throw new Error('Unexpected outbound request: ' + request.url);
};
function remember(response, jar) {
  for (const cookie of response.headers.getSetCookie()) {
    const [pair] = cookie.split(';'), index = pair.indexOf('=');
    jar.set(pair.slice(0, index), pair.slice(index + 1));
  }
}
const cookieHeader = jar => [...jar].map(([k, v]) => k + '=' + v).join('; ');
async function request(path, { method = 'GET', jar = new Map(), body, requestOrigin = origin } = {}) {
  const headers = { cookie: cookieHeader(jar), origin: requestOrigin };
  if (body) headers['content-type'] = 'application/x-www-form-urlencoded';
  const response = await auth(new Request(origin + path, { method, headers, body: body ? new URLSearchParams(body) : undefined }), secrets);
  remember(response, jar); return response;
}
async function start() {
  const jar = new Map();
  const csrf = await request('/api/auth/csrf', { jar });
  assert.equal(csrf.headers.get('cache-control'), 'no-store');
  const { csrfToken } = await csrf.json(); assert(csrfToken);
  const signin = await request('/api/auth/signin/github', { method: 'POST', jar, body: { csrfToken, callbackUrl: '/?view=proposals#maintainer-inbox' } });
  const url = new URL(signin.headers.get('location'));
  assert.equal(url.origin, 'https://github.com');
  assert.equal(url.searchParams.get('scope'), 'read:user');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert(url.searchParams.get('state')); assert(url.searchParams.get('code_challenge'));
  assert(signin.headers.getSetCookie().every(s => /HttpOnly/.test(s) && /Secure/.test(s) && /SameSite=Lax/.test(s)));
  return { jar, state: url.searchParams.get('state') };
}
try {
  assert(githubReady(secrets)); assert(!githubReady({}));
  for (const path of ['https://evil.invalid', '//evil.invalid', '/\\evil.invalid', '/api/auth/signin/github', '/login', '/callback']) assert.equal(safeReturnTo(path), '/');
  assert.equal(safeReturnTo('/?view=proposals#maintainer-inbox'), '/?view=proposals#maintainer-inbox');
  assert.equal((await auth(new Request(origin + '/api/auth/csrf'), {})).status, 503);
  assert.equal((await auth(new Request('https://evil.invalid/api/auth/csrf'), secrets)).status, 400);
  assert.equal((await request('/api/auth/signin/github', { method: 'POST', requestOrigin: 'https://evil.invalid' })).status, 403);
  const missingCsrf = await request('/api/auth/signin/github', { method: 'POST', body: { callbackUrl: '/' } });
  assert(!missingCsrf.headers.get('location')?.startsWith('https://github.com'));
  console.log('PASS missing configuration, hostile hosts/redirects, cross-origin POST and missing CSRF fail closed');

  let flow = await start();
  const before = requests.length;
  let response = await request('/api/auth/callback/github?code=fixture&state=wrong', { jar: flow.jar });
  assert.equal(requests.length, before); assert(response.headers.get('location').includes('error='));
  response = await request('/api/auth/callback/github?code=fixture&state=orphan');
  assert.equal(requests.length, before); assert(response.headers.get('location').includes('error='));
  console.log('PASS state and PKCE are required before any provider token exchange');

  flow = await start();
  response = await request('/api/auth/callback/github?code=fixture&state=' + encodeURIComponent(flow.state), { jar: flow.jar });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), origin + '/?view=proposals#maintainer-inbox');
  const sessionCookies = response.headers.getSetCookie().filter(s => s.startsWith(sessionCookie(true)));
  assert(sessionCookies.length); assert(sessionCookies.every(s => /Secure/.test(s) && /HttpOnly/.test(s) && /Path=\//.test(s) && !/Domain=/.test(s)));
  const owner = await githubIdentity(new Request(origin, { headers: { cookie: cookieHeader(flow.jar) } }), secrets);
  assert.equal(owner.userId, 'github:' + GITHUB_OWNER_ID); assert.equal(owner.isAdmin, true);
  const publicSession = await (await request('/api/auth/session', { jar: flow.jar })).json();
  assert.equal(publicSession.user.name, '123tthh'); assert(!JSON.stringify(publicSession).includes('fixture-provider-token'));
  console.log('PASS complete mocked GitHub exchange grants only the fixed owner, with protected session cookies');

  const csrfToken = (await (await request('/api/auth/csrf', { jar: flow.jar })).json()).csrfToken;
  const logout = await request('/api/auth/signout', { method: 'POST', jar: flow.jar, body: { csrfToken, callbackUrl: '/signout-with-chatgpt?return_to=/' } });
  assert.equal(logout.headers.get('location'), origin + '/signout-with-chatgpt?return_to=/');
  assert.equal(await githubIdentity(new Request(origin, { headers: { cookie: cookieHeader(flow.jar) } }), secrets), null);
  console.log('PASS sign-out clears the GitHub session and proceeds to ChatGPT sign-out');

  profileId = '999999'; flow = await start();
  response = await request('/api/auth/callback/github?code=fixture&state=' + encodeURIComponent(flow.state), { jar: flow.jar });
  assert(response.headers.get('location').includes('AccessDenied'));
  assert.equal(await githubIdentity(new Request(origin, { headers: { cookie: cookieHeader(flow.jar) } }), secrets), null);
  console.log('PASS matching username with a different immutable GitHub ID cannot become a maintainer');

  for (const [label, token, maxAge, secret] of [
    ['other account', { sub: 'github:999999', githubId: '999999', name: '123tthh' }, 100, secrets.AUTH_SECRET],
    ['wrong subject', { sub: 'github:999999', githubId: GITHUB_OWNER_ID }, 100, secrets.AUTH_SECRET],
    ['expired', { sub: 'github:' + GITHUB_OWNER_ID, githubId: GITHUB_OWNER_ID }, -60, secrets.AUTH_SECRET],
    ['wrong signing key', { sub: 'github:' + GITHUB_OWNER_ID, githubId: GITHUB_OWNER_ID }, 100, 'different-key'.repeat(8)],
  ]) {
    const encoded = await encode({ token, secret, salt: sessionCookie(true), maxAge });
    assert.equal(await githubIdentity(new Request(origin, { headers: { cookie: sessionCookie(true) + '=' + encoded } }), secrets), null, label);
  }
  assert.equal(await githubIdentity(new Request(origin, { headers: { cookie: sessionCookie(true) + '=forged' } }), secrets), null);
  const encoded = await encode({ token: { sub: 'github:' + GITHUB_OWNER_ID, githubId: GITHUB_OWNER_ID }, secret: secrets.AUTH_SECRET, salt: sessionCookie(true), maxAge: 100 });
  assert.equal(await githubIdentity(new Request(origin, { headers: { Authorization: 'Bearer ' + encoded } }), secrets), null);
  console.log('PASS altered, expired, forged, wrong-subject and bearer-only sessions are rejected');
  assert(requests.every(url => !url.includes('/emails') && !url.includes('/repos')));
} finally { globalThis.fetch = originalFetch; }
