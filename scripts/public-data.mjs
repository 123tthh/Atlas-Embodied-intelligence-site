import {setTimeout as delay} from 'node:timers/promises';

export function validateCatalog(value, knownIds = []) {
  if (!value || !Array.isArray(value.papers) || value.papers.length > 50000 || !Array.isArray(value.edges)) throw new Error('Invalid public catalog');
  const ids = new Set();
  for (const p of value.papers) {
    if (!p || typeof p.id !== 'string' || !p.id || ids.has(p.id) || typeof p.title !== 'string' || !Array.isArray(p.sources)) throw new Error('Invalid paper record');
    ids.add(p.id);
  }
  const endpoints = new Set([...knownIds, ...ids]);
  if (value.edges.some(e => !e || !endpoints.has(e.source) || !endpoints.has(e.target))) throw new Error('Incomplete public catalog');
}

// The checked-out source owns curated records. A lagging deployment may only add
// public records; it must not replace corrected authors, dates or source evidence.
export function mergePublicCatalog(seed, supplement) {
  validateCatalog(seed); validateCatalog(supplement, seed.papers.map(p => p.id));
  const ids = new Set(seed.papers.map(p => p.id));
  const edgeKey = e => JSON.stringify([e.source, e.target, e.type]);
  const edgeIds = new Set(seed.edges.map(edgeKey));
  const edges = [...seed.edges];
  for (const e of supplement.edges) if (!edgeIds.has(edgeKey(e))) { edges.push(e); edgeIds.add(edgeKey(e)); }
  const result = {...seed,
    papers: [...seed.papers, ...supplement.papers.filter(p => !ids.has(p.id))], edges,
    updated: [seed.updated, supplement.updated].filter(v => typeof v === 'string').sort().at(-1),
  };
  validateCatalog(result);
  return result;
}

export async function readPublicJson(url, {fetcher = fetch, pause = delay, timeoutMs = 8000, attempts = 2} = {}) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    let response;
    try {
      response = await fetcher(url, {signal: AbortSignal.timeout(timeoutMs), redirect: 'error', headers: {Accept: 'application/json'}});
    } catch (error) {
      if (attempt + 1 === attempts) throw error;
      await pause(500 * (attempt + 1)); continue;
    }
    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      await response.body?.cancel();
      if (retryable && attempt + 1 < attempts) { await pause(500 * (attempt + 1)); continue; }
      throw new Error(`Public snapshot request failed (${response.status})`);
    }
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Public snapshot is not JSON');
    const raw = await response.text();
    if (raw.length > 20000000) throw new Error('Public response exceeds limit');
    return JSON.parse(raw);
  }
  throw new Error('No public snapshot attempts configured');
}
