declare const __ATLAS_STATIC__: boolean;
declare const __ATLAS_BASE__: string;

export const STATIC_MODE = typeof __ATLAS_STATIC__ !== 'undefined' && __ATLAS_STATIC__;
export const BASE_PATH = STATIC_MODE && typeof __ATLAS_BASE__ !== 'undefined' ? __ATLAS_BASE__ : '/';
export const LIVE_ORIGIN = 'https://embodied-atlas.xyl1122.chatgpt.site';
export const PAGES_ORIGIN = 'https://123tthh.github.io';
export const REPOSITORY_URL = 'https://github.com/123tthh/Atlas-Embodied-intelligence-site';
export const CONTACT_EMAIL = 'khanhlinh3450l@gmail.com';

export function publicApi(path: string) {
  if (!STATIC_MODE) return path;
  if (path === '/api/catalog') return BASE_PATH + 'data/catalog.json';
  if (path === '/api/updates') return BASE_PATH + 'data/updates.json';
  return LIVE_ORIGIN + path;
}

export function signInUrl(returnTo = '/') {
  return (STATIC_MODE ? LIVE_ORIGIN : '') + '/signin-with-chatgpt?return_to=' + encodeURIComponent(returnTo);
}

export function paperUrl(url: URL, id: string, preserveView = false) {
  if (STATIC_MODE || preserveView) {
    url.pathname = BASE_PATH;
    url.searchParams.set('paper', id);
    if (!preserveView) url.searchParams.set('view', 'graph');
  } else {
    url.pathname = '/paper/' + encodeURIComponent(id);
    url.search = '';
  }
  return url;
}
