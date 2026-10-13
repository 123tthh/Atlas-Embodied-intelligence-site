import { Auth, type AuthConfig } from '@auth/core';
import GitHub from '@auth/core/providers/github';
import { getToken } from '@auth/core/jwt';

export const GITHUB_OWNER_ID = '184354549';
export const AUTH_ORIGIN = 'https://embodied-atlas.xyl1122.chatgpt.site';
export type GitHubSecrets = { AUTH_GITHUB_ID?: string; AUTH_GITHUB_SECRET?: string; AUTH_SECRET?: string };
export function githubReady(secrets: GitHubSecrets) {
  return Boolean(secrets.AUTH_GITHUB_ID && secrets.AUTH_GITHUB_SECRET && secrets.AUTH_SECRET && secrets.AUTH_SECRET.length >= 32);
}
export function safeReturnTo(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/';
  try {
    const url = new URL(value, AUTH_ORIGIN);
    if (url.origin !== AUTH_ORIGIN || /^\/(?:api\/auth|login|signin-with-chatgpt|signout-with-chatgpt|callback)(?:\/|$)/.test(url.pathname)) return '/';
    return url.pathname + url.search + url.hash;
  } catch { return '/'; }
}
export function allowedAuthOrigin(origin: string) {
  const url = new URL(origin);
  return origin === AUTH_ORIGIN || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname));
}
export const sessionCookie = (secure: boolean) => (secure ? '__Host-' : '') + 'atlas.session-token';

export function githubConfig(secrets: GitHubSecrets, origin = AUTH_ORIGIN): AuthConfig {
  const secure = origin.startsWith('https:');
  return {
    secret: secrets.AUTH_SECRET,
    basePath: '/api/auth', trustHost: true, useSecureCookies: secure,
    session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
    cookies: { sessionToken: { name: sessionCookie(secure), options: { httpOnly: true, sameSite: 'lax', path: '/', secure } } },
    pages: { signIn: '/login', error: '/login' },
    providers: [GitHub({
      clientId: secrets.AUTH_GITHUB_ID, clientSecret: secrets.AUTH_GITHUB_SECRET,
      // Public identity only. Never request repository or email permissions.
      authorization: { params: { scope: 'read:user' } },
      checks: ['pkce', 'state'],
      userinfo: {
        url: 'https://api.github.com/user',
        async request({ tokens }: { tokens: { access_token?: string } }) {
          const response = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${tokens.access_token}`, 'User-Agent': 'Embodied-Atlas', Accept: 'application/vnd.github+json' } });
          if (!response.ok) throw new Error('GitHub identity unavailable');
          return response.json() as Promise<Record<string, unknown>>;
        },
      },
      profile(profile) { return { id: String(profile.id), name: profile.login, email: null, image: null }; },
    })],
    callbacks: {
      signIn({ account, profile }) { return account?.provider === 'github' && String(profile?.id) === GITHUB_OWNER_ID; },
      jwt({ token, account, profile }) {
        if (account) {
          if (account.provider !== 'github' || String(profile?.id) !== GITHUB_OWNER_ID) return null;
          // Keep provider access tokens out of both the session and encrypted cookie.
          return { sub: `github:${GITHUB_OWNER_ID}`, githubId: GITHUB_OWNER_ID, name: String(profile?.login || '123tthh') };
        }
        return token.githubId === GITHUB_OWNER_ID && token.sub === `github:${GITHUB_OWNER_ID}` ? token : null;
      },
      session({ session, token }) {
        return { expires: session.expires, user: { name: token.name, email: null, image: null } };
      },
      redirect({ url }) {
        try { const target = new URL(url, origin); return target.origin === origin ? target.href : origin; }
        catch { return origin; }
      },
    },
    // Provider errors may contain request details. Never log credentials or callback codes.
    logger: { error(error) { console.error('GitHub sign-in failed:', error.name); }, warn(code) { console.warn('GitHub sign-in:', code); }, debug() {} },
  };
}

export async function handleGitHubAuth(request: Request, secrets: GitHubSecrets) {
  const url = new URL(request.url);
  if (!allowedAuthOrigin(url.origin)) return new Response('Invalid host', { status: 400 });
  if (!githubReady(secrets)) return Response.json({ error: 'GitHub login is not configured' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  if (request.method === 'POST' && request.headers.get('origin') !== url.origin) return new Response('Invalid origin', { status: 403 });
  const original = await Auth(request, githubConfig(secrets, url.origin));
  const response = new Response(original.body, original);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

export async function githubIdentity(request: Request, secrets: GitHubSecrets) {
  if (!githubReady(secrets)) return null;
  const secure = new URL(request.url).protocol === 'https:';
  // Only a verified first-party session cookie establishes identity. Ignore bearer headers.
  const cookieOnly = new Request(request.url, { headers: { cookie: request.headers.get('cookie') || '' } });
  const token = await getToken({ req: cookieOnly, secret: secrets.AUTH_SECRET!, cookieName: sessionCookie(secure), secureCookie: secure });
  if (token?.githubId !== GITHUB_OWNER_ID || token.sub !== `github:${GITHUB_OWNER_ID}`) return null;
  return { userId: token.sub, displayName: typeof token.name === 'string' ? token.name : '123tthh', fullName: null, email: '', isAdmin: true, provider: 'github' as const };
}
