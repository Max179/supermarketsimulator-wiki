#!/usr/bin/env node
/**
 * Derive the small committed value index (data/normalized/value-index.json) from the decoded value layer.
 *
 * The decoded rows themselves (data/normalized/p0-field-rows.json, several megabytes of raw extraction output) stay
 * on the Windows host that read the game package. Everything the site build, the gates, the tests and a reader need
 * from that layer is a checksum and three counts, so those are carried in this file instead. A tree without the rows
 * file still builds, still passes every gate, and still says out loud what it is missing.
 *
 * Run on the extraction host only:  node pipeline/value_index.mjs
 */
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

const rowsPath = process.env.VALUE_ROWS || 'data/normalized/p0-field-rows.json';
const outPath = process.env.VALUE_INDEX_OUT || 'data/normalized/value-index.json';

if (!existsSync(rowsPath)) {
  console.error('[value-index] no ' + rowsPath + ' here — this script runs on the host that holds the decoded layer');
  process.exit(2);
}
const buf = readFileSync(rowsPath);
const d = JSON.parse(buf.toString('utf8'));
const arr = [d, d.instances, d.objects, d.rows, d.classes].find((c) => Array.isArray(c));
if (!arr) {
  console.error('[value-index] ' + rowsPath + ' holds no row array; refusing to write an index that says nothing');
  process.exit(2);
}
const index = {
  schemaVersion: '1',
  derivedFrom: rowsPath.split('\\').join('/'),
  sha256: createHash('sha256').update(buf).digest('hex'),
  bytes: statSync(rowsPath).size,
  source: d.source ?? {},
  version: d.version ?? 'unknown',
  confidence: d.confidence ?? 'unknown',
  count: arr.length,
  countMeaning: 'length of the row array pipeline/status.mjs reads from the value layer, measured the same way',
  fieldCount: d.fieldCount ?? null,
  distinctNames: d.distinctNames ?? null,
  note: 'the decoded rows stay on the extraction host; the site, its gates and its tests read this index instead and never need the rows file',
};
writeFileSync(outPath, JSON.stringify(index, null, 2) + '\n');
console.log('[value-index] count=' + index.count + ' fieldCount=' + index.fieldCount + ' distinct=' + index.distinctNames +
  ' bytes=' + index.bytes + ' sha256=' + index.sha256.slice(0, 12) + ' out=' + outPath);
