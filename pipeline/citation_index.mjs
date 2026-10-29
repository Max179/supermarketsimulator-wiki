#!/usr/bin/env node
/**
 * Derive the small committed citation index (data/normalized/citation-index.json).
 *
 * tools/verify-citations.mjs builds the universe of identifiers that may appear as evidence from four files: the object
 * index, the inventory, and the two decoded layers (the type schema and the row table). Only the first two travel to the
 * Mac side; the decoded layers stay on the Windows host that read the game package. This script measures exactly the
 * names the decoded layers contribute — nothing else — and records where they came from, so the check on a light tree is
 * the same check the extraction host runs and a reader can see which raw file each name rests on.
 *
 * Run on the extraction host only:  node pipeline/citation_index.mjs
 */
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

const path = (f) => 'data/normalized/' + f;
const LAYERS = ['p0-schema.json', 'p0-field-rows.json'];
for (const f of ['supermarket-object-names.json', 'p0-inventory.json', ...LAYERS]) {
  if (!existsSync(path(f))) {
    console.error('[citation-index] no ' + path(f) + ' here — this script runs on the host that holds the decoded layers');
    process.exit(2);
  }
}
const sha256 = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');

const known = new Set();
for (const n of JSON.parse(readFileSync(path('supermarket-object-names.json'), 'utf8'))) if (typeof n === 'string') known.add(n);
const inv = JSON.parse(readFileSync(path('p0-inventory.json'), 'utf8'));
for (const c of inv.classes ?? []) { if (typeof c.name === 'string') known.add(c.name); for (const f of c.fields ?? []) if (typeof f.name === 'string') known.add(f.name); }
for (const e of inv.enums ?? []) { if (typeof e.name === 'string') known.add(e.name); for (const m of e.members ?? []) if (typeof m.name === 'string') known.add(m.name); }
if (Array.isArray(inv.fields)) for (const f of inv.fields) if (f && typeof f.name === 'string') known.add(f.name);

const extra = new Set();
for (const s of LAYERS) {
  const j = JSON.parse(readFileSync(path(s), 'utf8'));
  for (const c of j.classes ?? []) if (typeof c.name === 'string') extra.add(c.name);
  if (Array.isArray(j.fields)) for (const f of j.fields) if (f && typeof f.name === 'string') extra.add(f.name);
  for (const n of j.distinctNameList ?? []) if (typeof n === 'string') extra.add(n);
}
for (const n of known) extra.delete(n);
const names = [...extra].sort();
const universe = [...new Set([...known, ...names])].sort();
const rowsVersion = JSON.parse(readFileSync(path('p0-field-rows.json'), 'utf8')).version ?? 'unknown';

const index = {
  schemaVersion: '1',
  version: rowsVersion,
  derivedFrom: LAYERS.map((f) => path(f)),
  sources: LAYERS.map((f) => ({ file: path(f), bytes: statSync(path(f)).size, sha256: sha256(path(f)) })),
  count: names.length,
  universeCount: universe.length,
  universeSha256: createHash('sha256').update(universe.join('\n')).digest('hex'),
  note: 'the identifiers above exist only in the decoded layers, which stay on the extraction host; verify-citations.mjs adds them back so the citation check is the same check on every machine',
  names,
};
writeFileSync(path('citation-index.json'), JSON.stringify(index, null, 2) + '\n');
console.log('[citation-index] ' + names.length + ' identifiers only the decoded layers contribute; universe ' +
  universe.length + ' names, sha256 ' + index.universeSha256.slice(0, 12) + ', version ' + rowsVersion);
