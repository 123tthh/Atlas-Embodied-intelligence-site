import {env} from 'cloudflare:workers';
import {asc, eq, like} from 'drizzle-orm';
import {getDb} from '../../../db';
import {messages, proposals, updateSettings} from '../../../db/schema';
import {catalog, error, privateJson} from '../../../lib/server';
import {authorizedUpdater, digest} from '../../../lib/update-auth';
import {reviewDecision, reviewPolicy} from '../../../lib/review-contract';
import {canonicalUrl} from '../../../lib/domain';
import type {Proposal} from '../../../lib/types';

const recordKey = (kind: string, id: string, runId: string) => `community-review:${kind}:${id}:${runId}`;
const snapshot = (kind: string, row: {id: string; status: string; createdAt: number; payload?: string; message?: string}) => digest(JSON.stringify([kind, row.id, row.status, row.createdAt, row.payload ?? row.message]));

export async function GET(request: Request) {
  if (!await authorizedUpdater(request)) return error('Reviewer authorization required', 401);
  try {
    const db = getDb(), [pending, inbox, history] = await Promise.all([
      db.select().from(proposals).where(eq(proposals.status, 'pending')).orderBy(asc(proposals.createdAt)),
      db.select({id: messages.id, message: messages.message, status: messages.status, createdAt: messages.createdAt}).from(messages).where(eq(messages.status, 'new')).orderBy(asc(messages.createdAt)),
      db.select().from(updateSettings).where(like(updateSettings.key, 'community-review:%')),
    ]);
    const reviews = history.map(r => JSON.parse(r.payload)).sort((a, b) => b.reviewedAt - a.reviewedAt);
    const lastReview = (kind: string, id: string) => reviews.find(r => r.kind === kind && r.id === id) ?? null;
    const runId = new URL(request.url).searchParams.get('runId');
    const policy = await db.select().from(updateSettings).where(eq(updateSettings.key, 'community-review-policy'));
    return privateJson({policy: policy[0] ? JSON.parse(policy[0].payload) : reviewPolicy,
      proposals: await Promise.all(pending.map(async r => ({id: r.id, proposal: JSON.parse(r.payload), createdAt: r.createdAt, snapshot: await snapshot('proposal', r), lastReview: lastReview('proposal', r.id)}))),
      messages: await Promise.all(inbox.map(async r => ({id: r.id, message: r.message, createdAt: r.createdAt, snapshot: await snapshot('message', r), lastReview: lastReview('message', r.id)}))),
      reviews: (runId ? reviews.filter(r => r.runId === runId) : reviews.slice(0, 100)),
    });
  } catch { return error('Review queue unavailable', 503); }
}

export async function POST(request: Request) {
  if (!await authorizedUpdater(request)) { await request.body?.cancel().catch(() => {}); return error('Reviewer authorization required', 401); }
  if (!request.headers.get('content-type')?.startsWith('application/json')) return error('Expected JSON', 415);
  const raw = await request.text();
  if (raw.length > 20000) return error('Review too large', 413);
  let value; try { value = JSON.parse(raw); } catch { return error('Invalid JSON'); }
  const db = getDb();
  if (value?.action === 'configure' && Object.keys(value).length === 1) {
    await db.insert(updateSettings).values({key: 'community-review-policy', payload: JSON.stringify(reviewPolicy)}).onConflictDoUpdate({target: updateSettings.key, set: {payload: JSON.stringify(reviewPolicy)}});
    return privateJson({saved: true, policy: reviewPolicy});
  }
  const parsed = reviewDecision.safeParse(value);
  if (!parsed.success) return error(parsed.error.issues.map(e => e.message).join('; '));
  const v = parsed.data, key = recordKey(v.kind, v.id, v.runId), fingerprint = await digest(raw);
  const previous = await db.select().from(updateSettings).where(eq(updateSettings.key, key));
  if (previous[0]) {
    const review = JSON.parse(previous[0].payload);
    return review.fingerprint === fingerprint ? privateJson({review, replayed: true}) : error('Review ID already exists with different content', 409);
  }
  const rows = v.kind === 'proposal' ? await db.select().from(proposals).where(eq(proposals.id, v.id)) : await db.select().from(messages).where(eq(messages.id, v.id));
  const row = rows[0], expectedStatus = v.kind === 'proposal' ? 'pending' : 'new';
  if (!row || row.status !== expectedStatus || await snapshot(v.kind, row) !== v.snapshot) return error('Submission changed or was already reviewed; reload the queue', 409);
  if (v.decision === 'approved') {
    const data = await catalog();
    if (v.kind === 'proposal') {
      const p = JSON.parse((row as typeof proposals.$inferSelect).payload) as Proposal;
      if (p.relationTo) return error('Relationship proposals require separate maintainer review');
      if (!p.authors.trim() || !v.checks.some(c => canonicalUrl(c.url) === canonicalUrl(p.url))) return error('Verify the original paper and author list before approval');
      if (data.papers.some(q => [q.arxiv, q.project, ...q.sources].some(u => u && canonicalUrl(u) === canonicalUrl(p.url)))) return error('Paper already exists; review as duplicate', 409);
    } else {
      const paper = data.papers.find(p => p.id === v.publishedPaperId);
      if (!paper || !v.checks.some(c => paper.sources.some(s => canonicalUrl(s) === canonicalUrl(c.url)))) return error('Read back the published paper and its checked source before accepting the message');
    }
  }
  const status = v.kind === 'proposal' ? (v.decision === 'deferred' ? 'pending' : v.decision) : (v.decision === 'deferred' ? 'new' : 'done');
  const review = {...v, reviewedAt: Date.now(), fingerprint, status};
  const database = env.DB;
  if (!database) return error('Review storage unavailable', 503);
  // Each D1 batch is atomic. A concurrent withdrawal/review prevents both the audit and status write.
  const table = v.kind === 'proposal' ? 'proposals' : 'messages';
  try {
    const result = await database.batch([
      database.prepare(`INSERT INTO update_settings (key,payload) SELECT ?,? WHERE EXISTS (SELECT 1 FROM ${table} WHERE id=? AND status=?)`).bind(key, JSON.stringify(review), v.id, expectedStatus),
      v.kind === 'proposal'
        ? database.prepare('UPDATE proposals SET status=?,review_note=? WHERE id=? AND status=? AND EXISTS (SELECT 1 FROM update_settings WHERE key=?)').bind(status, v.note, v.id, expectedStatus, key)
        : database.prepare('UPDATE messages SET status=? WHERE id=? AND status=? AND EXISTS (SELECT 1 FROM update_settings WHERE key=?)').bind(status, v.id, expectedStatus, key),
    ]);
    if (!result[0].meta.changes || !result[1].meta.changes) return error('Submission was already handled; reload the queue', 409);
    return privateJson({review});
  } catch { return error('Review was not confirmed; read its runId before retrying the identical request', 409); }
}
