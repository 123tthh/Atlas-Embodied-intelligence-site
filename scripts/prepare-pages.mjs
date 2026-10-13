import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const read = async name => JSON.parse(await readFile(new URL(name, root), 'utf8'));
const seed = await read('lib/catalog.json');
const extra = await read('lib/pages-extra-research.json');
let updates = await read('lib/pages-update-log.json');
const ids = new Set(seed.papers.map(p => p.id));
let catalog = { ...seed, papers: [...seed.papers, ...extra.papers.filter(p => !ids.has(p.id))],
  edges: [...seed.edges, ...extra.edges.filter(e => !seed.edges.some(s => JSON.stringify(s) === JSON.stringify(e)))],
  updated: seed.updated > extra.updated ? seed.updated : extra.updated };

function validate(value) {
  if (!value || !Array.isArray(value.papers) || value.papers.length < seed.papers.length || value.papers.length > 50000 || !Array.isArray(value.edges)) throw new Error('Invalid public catalog');
  const seen = new Set();
  for (const p of value.papers) {
    if (!p || typeof p.id !== 'string' || seen.has(p.id) || typeof p.title !== 'string' || !Array.isArray(p.sources)) throw new Error('Invalid paper record');
    seen.add(p.id);
  }
  if (seed.papers.some(p => !seen.has(p.id)) || value.edges.some(e => !seen.has(e.source) || !seen.has(e.target))) throw new Error('Incomplete public catalog');
}
const refresh = process.argv.includes('--refresh') || process.argv.includes('--require-refresh');
if (refresh) {
  try {
    const readPublic = async path => {
      const r = await fetch('https://embodied-atlas.xyl1122.chatgpt.site' + path, { signal: AbortSignal.timeout(20000), redirect: 'error', headers: { Accept: 'application/json' } });
      if (!r.ok || !r.headers.get('content-type')?.includes('application/json')) throw new Error(`Public snapshot request failed (${r.status})`);
      const raw = await r.text(); if (raw.length > 20000000) throw new Error('Public response exceeds limit');
      return JSON.parse(raw);
    };
    const [nextCatalog, nextUpdates] = await Promise.all([readPublic('/api/catalog'), readPublic('/api/updates')]);
    validate(nextCatalog);
    if (!nextUpdates?.schedule || !Array.isArray(nextUpdates.runs)) throw new Error('Invalid public update log');
    catalog = nextCatalog; updates = { ...nextUpdates, snapshotAt: new Date().toISOString() };
    console.log(`Refreshed ${catalog.papers.length} public research records; no visitor data is requested.`);
  } catch (error) {
    if (process.argv.includes('--require-refresh')) throw error;
    console.warn('Public snapshot refresh unavailable; retaining the checked repository snapshot.');
  }
}
validate(catalog);
const output = new URL('public/data/', root);
await mkdir(output, { recursive: true });
await writeFile(new URL('catalog.json', output), JSON.stringify(catalog));
await writeFile(new URL('updates.json', output), JSON.stringify(updates));
console.log(`Prepared ${catalog.papers.length} papers and ${catalog.edges.length} relationships for ${fileURLToPath(output)}`);
