import assert from 'node:assert/strict';
import {mergePublicCatalog, validateCatalog, readPublicJson} from '../scripts/public-data.mjs';

const paper = (id, title = id) => ({id, title, sources: ['https://example.org/' + id]});
const seed = {papers: [paper('a', 'Corrected author'), paper('b', 'New source paper')], edges: [{source: 'a', target: 'b', type: 'uses', evidence: 'New evidence'}], updated: '2026-10-13', cutoff: '2026-10-13'};
const before = JSON.stringify(seed);
const lagging = {papers: [paper('a', 'Old author'), paper('weekly-new')], edges: [{source: 'a', target: 'weekly-new', type: 'uses'}], updated: '2026-10-12'};
const merged = mergePublicCatalog(seed, lagging);
assert.deepEqual(merged.papers.map(p => p.id), ['a', 'b', 'weekly-new']);
assert.equal(merged.papers[0].title, 'Corrected author');
assert.equal(merged.updated, seed.updated); assert.equal(merged.cutoff, seed.cutoff);
assert.equal(JSON.stringify(seed), before);
console.log('PASS lagging cloud data cannot replace corrected or newly added source records');

const duplicate = {...seed, edges: [{...seed.edges[0], evidence: 'Stale evidence'}, seed.edges[0]]};
assert.deepEqual(mergePublicCatalog(seed, duplicate).edges, seed.edges);
assert.equal(mergePublicCatalog(seed, {papers: [paper('extra')], edges: [{source: 'b', target: 'extra', type: 'uses'}]}).edges.length, 2);
assert.throws(() => validateCatalog({papers: [paper('a'), paper('a')], edges: []}));
assert.throws(() => mergePublicCatalog(seed, {papers: [], edges: [{source: 'a', target: 'missing'}]}));
console.log('PASS shared edges retain source evidence, supplemental edges resolve, and malformed snapshots fail');

let calls = 0, pauses = 0;
const value = await readPublicJson('https://example.org/public', {fetcher: async () => { calls++; if (calls === 1) throw new TypeError('Network failure'); return Response.json({ok: true}); }, pause: async () => pauses++});
assert(value.ok); assert.equal(calls, 2); assert.equal(pauses, 1);
calls = 0;
await assert.rejects(readPublicJson('https://example.org/public', {fetcher: async () => { calls++; return new Response('', {status: 503}); }, pause: async () => {}}));
assert.equal(calls, 2);
console.log('PASS transient network/server failures retry once and stop after the bounded attempt limit');

for (const response of [new Response('', {status: 403}), new Response('<html/>'), new Response('{', {headers: {'content-type': 'application/json'}})]) {
  calls = 0;
  await assert.rejects(readPublicJson('https://example.org/public', {fetcher: async () => { calls++; return response; }, pause: async () => { throw new Error('Must not retry'); }}));
  assert.equal(calls, 1);
}
console.log('PASS authorization failures, HTML and malformed JSON are not retried');
