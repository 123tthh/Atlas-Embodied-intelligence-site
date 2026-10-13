import {env} from 'cloudflare:workers';

export const digest = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), v => v.toString(16).padStart(2, '0')).join('');

export async function authorizedUpdater(request: Request) {
  const secret = (env as unknown as {ATLAS_UPDATE_TOKEN?: string}).ATLAS_UPDATE_TOKEN;
  const token = request.headers.get('X-Atlas-Update-Token') || '';
  return Boolean(secret && token && token.length <= 4096 && await digest(secret) === await digest(token));
}
