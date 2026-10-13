import { env } from 'cloudflare:workers';
import { headers } from 'next/headers';
import { AUTH_ORIGIN, githubIdentity, githubReady, type GitHubSecrets } from './github-auth-core';

export const githubSecrets = () => env as unknown as GitHubSecrets;
export const isGitHubConfigured = () => githubReady(githubSecrets());
export async function getGitHubUser() {
  const requestHeaders = await headers();
  const host = requestHeaders.get('host') || '';
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  return githubIdentity(new Request(local ? `http://${host}` : AUTH_ORIGIN, { headers: requestHeaders }), githubSecrets());
}
