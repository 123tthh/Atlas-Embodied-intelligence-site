import { isGitHubConfigured } from '../../lib/github-auth';
import { safeReturnTo, AUTH_ORIGIN } from '../../lib/github-auth-core';
import LoginOptions from './LoginOptions';
export const dynamic = 'force-dynamic';
export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  let destination = query.return_to || query.callbackUrl || '/?view=proposals#maintainer-inbox';
  if (typeof destination === 'string' && destination.startsWith(AUTH_ORIGIN + '/')) destination = destination.slice(AUTH_ORIGIN.length);
  const returnTo = safeReturnTo(destination);
  return <main className="atlas-login"><LoginOptions githubReady={isGitHubConfigured()} returnTo={returnTo} error={typeof query.error === 'string' ? query.error : ''}/></main>;
}
