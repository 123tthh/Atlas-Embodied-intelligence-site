import { env } from 'cloudflare:workers';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../../db';
import { messages } from '../../../db/schema';
import { identity, checkOrigin, privateJson, error } from '../../../lib/server';
import { messagePayload } from '../../../lib/message-contract';
import { PAGES_ORIGIN } from '../../../lib/site-mode';

function permittedOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return origin === new URL(request.url).origin || origin === PAGES_ORIGIN ? origin : null;
}
function publicJson(request: Request, value: unknown, status = 200) {
  const headers: Record<string, string> = { 'Cache-Control': 'no-store', 'Vary': 'Origin' };
  const origin = permittedOrigin(request);
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return Response.json(value, { status, headers });
}
async function digest(text: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
  return [...bytes].map(v => v.toString(16).padStart(2, '0')).join('');
}
async function discardBody(request: Request) {
  // Release unread bodies when rejecting a request before parsing it.
  await request.body?.cancel().catch(() => {});
}

export async function OPTIONS(request: Request) {
  const origin = permittedOrigin(request);
  if (!origin) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '600', 'Vary': 'Origin',
  } });
}

export async function POST(request: Request) {
  if (!permittedOrigin(request) || !request.headers.get('content-type')?.startsWith('application/json')) {
    await discardBody(request);
    return publicJson(request, { error: 'Invalid request origin', code: 'origin' }, 403);
  }
  if (Number(request.headers.get('content-length')) > 24000) {
    await discardBody(request);
    return publicJson(request, { error: 'Message too long', code: 'length' }, 413);
  }
  let parsed;
  try {
    const raw = await request.text();
    if (raw.length > 12000) return publicJson(request, { error: 'Message too long', code: 'length' }, 413);
    parsed = messagePayload.safeParse(JSON.parse(raw));
  } catch { return publicJson(request, { error: 'Invalid message', code: 'invalid' }, 400); }
  if (!parsed.success) return publicJson(request, { error: 'Enter a valid email and a 5–4000 character suggestion', code: 'invalid' }, 400);
  const { requestId, email, message, website } = parsed.data;
  if (website) return publicJson(request, { id: requestId, received: true }, 201);
  try {
    const fingerprint = await digest(JSON.stringify({ email, message }));
    const prior = await getDb().select({ fingerprint: messages.fingerprint }).from(messages).where(eq(messages.id, requestId)).limit(1);
    if (prior.length) return prior[0].fingerprint === fingerprint
      ? publicJson(request, { id: requestId, received: true, replayed: true })
      : publicJson(request, { error: 'This request ID was already used', code: 'conflict' }, 409);
    const now = Date.now();
    const secret = (env as unknown as { ATLAS_UPDATE_TOKEN?: string }).ATLAS_UPDATE_TOKEN || 'local-message-test';
    // Cloudflare provides this header. Do not retain raw network addresses.
    const network = request.headers.get('cf-connecting-ip') || email.toLowerCase();
    const clientHash = await digest(secret + '\n' + new Date(now).toISOString().slice(0, 10) + '\n' + network);
    const source = request.headers.get('origin') === PAGES_ORIGIN ? 'github-pages' : 'website';
    // Check the rate and insert in one statement, so concurrent submissions share the limit.
    const database = env.DB;
    if (!database) throw new Error('Database unavailable');
    const result = await database.prepare(`INSERT INTO messages
      (id,email,message,fingerprint,client_hash,source,status,created_at)
      SELECT ?,?,?,?,?,?,'new',?
      WHERE (SELECT COUNT(*) FROM messages WHERE client_hash=? AND created_at>=?) < 8`)
      .bind(requestId, email, message, fingerprint, clientHash, source, now, clientHash, now - 86400000).run();
    if (!result.meta.changes) return publicJson(request, { error: 'Daily message limit reached. Please use the contact email.', code: 'rate' }, 429);
    return publicJson(request, { id: requestId, received: true }, 201);
  } catch (e) {
    // An identical request can win the insert race; retrying remains safe.
    if (String(e).includes('UNIQUE') || String((e as { cause?: unknown })?.cause).includes('UNIQUE')) {
      return publicJson(request, { error: 'Please retry this request', code: 'retry' }, 409);
    }
    return publicJson(request, { error: 'Message was not confirmed. Retry or use the contact email.', code: 'unavailable' }, 503);
  }
}

export async function GET() {
  const user = await identity();
  if (!user?.isAdmin) return error('只有维护者可以查看留言', 403);
  try {
    const rows = await getDb().select({ id: messages.id, email: messages.email, message: messages.message,
      source: messages.source, status: messages.status, createdAt: messages.createdAt })
      .from(messages).orderBy(desc(messages.createdAt)).limit(200);
    return privateJson({ messages: rows });
  } catch { return error('暂时无法读取留言', 503); }
}

export async function PATCH(request: Request) {
  if (!checkOrigin(request)) { await discardBody(request); return error('请求来源无效', 403); }
  const user = await identity();
  if (!user?.isAdmin) { await discardBody(request); return error('只有维护者可以处理留言', 403); }
  try {
    const value = z.object({ id: z.string().uuid(), status: z.enum(['new', 'done']) }).strict().safeParse(await request.json());
    if (!value.success) return error('无效的处理状态');
    const changed = await getDb().update(messages).set({ status: value.data.status }).where(eq(messages.id, value.data.id)).returning({ id: messages.id });
    return changed.length ? privateJson({ ok: true }) : error('留言不存在', 404);
  } catch { return error('处理状态未能保存', 503); }
}
