import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {mergePublicCatalog, readPublicJson, validateCatalog} from './public-data.mjs';

const root = new URL('../', import.meta.url);
const read = async name => JSON.parse(await readFile(new URL(name, root), 'utf8'));
const seed = await read('lib/catalog.json');
const extra = await read('lib/pages-extra-research.json');
let updates = await read('lib/pages-update-log.json');
let catalog = mergePublicCatalog(seed, extra);
const refresh = process.argv.includes('--refresh') || process.argv.includes('--require-refresh');
if (refresh) {
  try {
    const readPublic = path => readPublicJson('https://embodied-atlas.xyl1122.chatgpt.site' + path);
    const [nextCatalog, nextUpdates] = await Promise.all([readPublic('/api/catalog'), readPublic('/api/updates')]);
    validateCatalog(nextCatalog);
    if (!nextCatalog.papers.length) throw new Error('Public catalog is unexpectedly empty');
    if (!nextUpdates?.schedule || !Array.isArray(nextUpdates.runs)) throw new Error('Invalid public update log');
    catalog = mergePublicCatalog(seed, nextCatalog); updates = { ...nextUpdates, snapshotAt: new Date().toISOString() };
    console.log(`Refreshed ${catalog.papers.length} public research records; no visitor data is requested.`);
  } catch (error) {
    if (process.argv.includes('--require-refresh')) throw error;
    console.warn('Public snapshot refresh unavailable; retaining the checked repository snapshot.');
  }
}
validateCatalog(catalog);
const output = new URL('public/data/', root);
await mkdir(output, { recursive: true });
await writeFile(new URL('catalog.json', output), JSON.stringify(catalog));
await writeFile(new URL('updates.json', output), JSON.stringify(updates));
console.log(`Prepared ${catalog.papers.length} papers and ${catalog.edges.length} relationships for ${fileURLToPath(output)}`);
