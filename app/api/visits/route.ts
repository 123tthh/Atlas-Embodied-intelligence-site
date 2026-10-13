import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {PAGES_ORIGIN} from '../../../lib/site-mode';
import {beijingDay, knownBot} from '../../../lib/analytics';
import {digest} from '../../../lib/update-auth';

const payload = z.object({eventId: z.string().uuid(), visitorId: z.string().uuid()}).strict();
function originFor(request: Request) {
  const origin = request.headers.get('origin');
  return origin === new URL(request.url).origin || origin === PAGES_ORIGIN ? origin : null;
}
function response(request: Request, data: unknown, status = 200) {
  const origin = originFor(request);
  return Response.json(data, {status, headers: {'Cache-Control': 'no-store', 'Vary': 'Origin', ...(origin ? {'Access-Control-Allow-Origin': origin} : {})}});
}
export function OPTIONS(request: Request) {
  const origin = originFor(request);
  return new Response(null, {status: origin ? 204 : 403, headers: origin ? {
    'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600', 'Vary': 'Origin',
  } : {}});
}
export async function POST(request: Request) {
  if (!originFor(request) || !request.headers.get('content-type')?.startsWith('application/json')) {
    await request.body?.cancel().catch(() => {}); return response(request, {error: 'Invalid origin or content type'}, 403);
  }
  if (request.headers.get('DNT') === '1' || request.headers.get('Sec-GPC') === '1' || knownBot(request.headers.get('user-agent') || '')) {
    await request.body?.cancel().catch(() => {}); return response(request, {received: false, ignored: true});
  }
  if (Number(request.headers.get("content-length")) > 2000) { await request.body?.cancel().catch(() => {}); return response(request, {error: "Event too large"}, 413); }
  let input;
  try { const raw = await request.text(); if (raw.length > 1000) return response(request, {error: 'Event too large'}, 413); input = payload.safeParse(JSON.parse(raw)); }
  catch { return response(request, {error: 'Invalid event'}, 400); }
  if (!input.success) return response(request, {error: 'Invalid event'}, 400);
  const database = env.DB, secret = (env as unknown as {ATLAS_UPDATE_TOKEN?: string}).ATLAS_UPDATE_TOKEN;
  if (!database || !secret) return response(request, {error: 'Statistics unavailable'}, 503);
  const source = request.headers.get('origin') === PAGES_ORIGIN ? 'github-pages' : 'sites';
  const now = Date.now(), day = beijingDay(now), {eventId, visitorId} = input.data;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  const visitorHash = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('atlas-visits-v1\n' + source + '\n' + visitorId))), v => v.toString(16).padStart(2, '0')).join('');
  const fingerprint = await digest(source + '\n' + visitorId);
  try {
    // The event, lifetime counters and daily counters commit together. Replayed events never increment twice.
    await database.batch([
      database.prepare('INSERT OR IGNORE INTO visit_events (id,fingerprint,created_at,applied) SELECT ?,?,?,0 WHERE COALESCE((SELECT pageviews FROM visit_days WHERE day=? AND visitor_hash=?),0) < 500').bind(eventId, fingerprint, now, day, visitorHash),
      database.prepare(`INSERT INTO visit_visitors (visitor_hash,source,first_seen,last_seen,pageviews)
        SELECT ?,?,?,?,1 WHERE EXISTS (SELECT 1 FROM visit_events WHERE id=? AND fingerprint=? AND applied=0)
        ON CONFLICT(visitor_hash) DO UPDATE SET last_seen=excluded.last_seen,pageviews=visit_visitors.pageviews+1`).bind(visitorHash, source, now, now, eventId, fingerprint),
      database.prepare(`INSERT INTO visit_days (day,visitor_hash,source,pageviews)
        SELECT ?,?,?,1 WHERE EXISTS (SELECT 1 FROM visit_events WHERE id=? AND fingerprint=? AND applied=0)
        ON CONFLICT(day,visitor_hash) DO UPDATE SET pageviews=visit_days.pageviews+1`).bind(day, visitorHash, source, eventId, fingerprint),
      database.prepare('UPDATE visit_events SET applied=1 WHERE id=? AND fingerprint=?').bind(eventId, fingerprint),
      database.prepare('DELETE FROM visit_events WHERE created_at<?').bind(now - 7 * 86400000),
      database.prepare('DELETE FROM visit_days WHERE day<?').bind(beijingDay(now - 400 * 86400000)),
    ]);
    const receipt = await database.prepare('SELECT fingerprint FROM visit_events WHERE id=?').bind(eventId).first<{fingerprint: string}>();
    if (!receipt) return response(request, {error: 'Daily event limit reached'}, 429);
    if (receipt.fingerprint !== fingerprint) return response(request, {error: 'Event ID conflict'}, 409);
    return response(request, {received: true});
  } catch { return response(request, {error: 'Event not confirmed'}, 503); }
}
