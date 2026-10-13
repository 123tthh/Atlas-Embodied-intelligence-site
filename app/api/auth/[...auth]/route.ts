import { handleGitHubAuth } from '../../../../lib/github-auth-core';
import { githubSecrets } from '../../../../lib/github-auth';
export const dynamic = 'force-dynamic';
export const GET = (request: Request) => handleGitHubAuth(request, githubSecrets());
export const POST = GET;
