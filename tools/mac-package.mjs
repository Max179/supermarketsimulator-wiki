#!/usr/bin/env node
/**
 * Build the lightweight Mac handoff package for this site: source, content, images and the small derived indexes.
 *
 *   node tools/mac-package.mjs [repoDir] [outDir]
 *
 * What travels: every source file, config/, the published entries and articles as JSON, content/images-manifest.json,
 * every optimized image under content/assets/, the small indexes under data/normalized/, the site shell, and the live
 * reports (handoff, status, coverage, image coverage, image sanity, image reviews, and a compact copy of the running
 * log). What stays on the extraction host: git history, web/dist, the decoded layers (type schema, row table, instances,
 * extracted locale tables), the extraction-side working reports and the process note in the repository root. Every
 * excluded path and its size is written into reports/mac-handoff-manifest.json next to a sha256 for every kept file.
 *
 * The excluded decoded layers are replaced by two derived indexes that pipeline/value_index.mjs and
 * pipeline/citation_index.mjs generate on the extraction host, so the package's build, gates and tests run the same
 * checks as the host rather than weaker ones.
 */
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync, mkdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, dirname, relative, sep } from 'node:path';

const repo = resolve(process.cwd(), process.argv[2] ?? '.');
const status = JSON.parse(readFileSync(join(repo, 'reports', 'status.json'), 'utf8'));
const site = String(status.site ?? 'site');
const out = resolve(process.cwd(), process.argv[3] ?? join('mac-handoff', site));

const SKIP_DIRS = new Set(['.git', 'node_modules', 'web/dist', 'dist', '.next', '__pycache__']);
const DATA_KEEP = /^(p0-inventory|[a-z0-9-]*object-names|value-index|citation-index)\.json$/;
const SKIP_FILES = new Map([['HARNESS-NEXT-ACTION.md', 'a process note for the extraction host, not site content']]);
const REPORTS_KEEP = new Set(['handoff.md', 'status.json', 'coverage-report.md', 'image-coverage.md', 'image-sanity.md', 'image-reviews.md']);
const whyReport = (rel) => (rel.startsWith('reports/redesign-p0/')
  ? 'screenshots of the built site taken on the extraction host; the site rebuilds them'
  : 'extraction-side working record; the live reports listed in the manifest are kept');

const kept = [];
const dropped = [];
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const abs = join(dir, e.name);
    const rel = relative(repo, abs).split(sep).join('/');
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(rel)) { dropped.push({ rel: rel + '/', bytes: null, why: 'git history and build output are not part of a source handoff' }); continue; }
      walk(abs);
      continue;
    }
    if (SKIP_FILES.has(rel)) { dropped.push({ rel, bytes: statSync(abs).size, why: SKIP_FILES.get(rel) }); continue; }
    if (rel.startsWith('data/normalized/') && !DATA_KEEP.test(rel.slice('data/normalized/'.length))) {
      dropped.push({ rel, bytes: statSync(abs).size, why: 'decoded layer or extracted locale table: raw output, stays on the extraction host' });
      continue;
    }
    if (rel.startsWith('reports/') && !REPORTS_KEEP.has(rel.split('/').pop())) {
      if (rel === 'reports/local-complete.md') continue;
      dropped.push({ rel, bytes: statSync(abs).size, why: whyReport(rel) });
      continue;
    }
    const buf = readFileSync(abs);
    kept.push({ rel, bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex') });
    const dest = join(out, rel);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, buf);
  }
};

if (out === repo || out.startsWith(repo + sep)) {
  console.error('[mac-package] refusing to write inside the repository (' + out + ')');
  process.exit(2);
}
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
walk(repo);

// The compact copy of the running log: the full round-by-round record stays on the extraction host.
const fullLogPath = join(repo, 'reports', 'local-complete.md');
const log = readFileSync(fullLogPath, 'utf8').split(/\r?\n/);
const bullets = log.filter((l) => /^\s*[-*] /.test(l));
const digest = [
  '# Local completion record - compact copy',
  '',
  'The full round-by-round log (' + log.length + ' lines, ' + statSync(fullLogPath).size + ' bytes, ' + bullets.length + ' recorded rounds)',
  'is the working record of the extraction host and stays there. This copy carries the standing state at the handoff commit plus the',
  'most recent recorded rounds verbatim, so the Mac side has the facts without the history. Nothing here is generated at publish time.',
  '',
  '## Standing state at the handoff commit',
  '- Build: pages=' + status.pages + ' indexable=' + status.indexable + ' noindex=' + status.noindex + '; documented version ' + status.version + '.',
  '- Documented identifiers: ' + status.classes + ' types and ' + status.fields + ' field rows; the rows themselves are carried by',
  '  data/normalized/value-index.json (checksum and counts) and data/normalized/citation-index.json (the names they contribute).',
  '- This package ships without git history: the tree counts in reports/status.json describe the extraction host tree, not the package.',
  '',
  '## Most recent recorded rounds (verbatim, oldest first)',
  ...bullets.slice(-5),
  '',
  'The five entries above are the last recorded rounds. The complete list - every rejected picture, every gate run - lives in',
  'reports/local-complete.md on the extraction host.',
  '',
].join('\n');
mkdirSync(join(out, 'reports'), { recursive: true });
writeFileSync(join(out, 'reports', 'local-complete.md'), digest);
kept.push({ rel: 'reports/local-complete.md', bytes: Buffer.byteLength(digest), sha256: createHash('sha256').update(digest).digest('hex') });

// Stamp the packaged status for a tree that does not carry the decoded layers: recorded from the derived index, which is
// exactly what pipeline/status.mjs writes when it runs on the Mac side.
const pkgStatusPath = join(out, 'reports', 'status.json');
const vidxPath = join(out, 'data', 'normalized', 'value-index.json');
if (existsSync(vidxPath)) {
  const pkgStatus = JSON.parse(readFileSync(pkgStatusPath, 'utf8'));
  const vidx = JSON.parse(readFileSync(vidxPath, 'utf8'));
  if (!existsSync(join(out, vidx.derivedFrom))) {
    pkgStatus.valueLayer = { file: 'data/normalized/value-index.json', count: vidx.count, derived: true, derivedFrom: vidx.derivedFrom, sha256: vidx.sha256 };
    pkgStatus.valueLayerNote = 'stamped for the light tree: the decoded rows stay on the extraction host and this index carries their checksum and counts';
    const buf = Buffer.from(JSON.stringify(pkgStatus, null, 2) + '\n');
    writeFileSync(pkgStatusPath, buf);
    const k = kept.find((f) => f.rel === 'reports/status.json');
    k.bytes = buf.length;
    k.sha256 = createHash('sha256').update(buf).digest('hex');
  }
}

const groups = {
  source: /^(pipeline|tools|tests|config|docs|\.github)\//,
  published: /^content\/published\//,
  articles: /^content\/articles\//,
  images: /^content\/assets\//,
  data: /^data\//,
  contentRoot: /^content\/[^/]+$/,
  shell: /^(web\/|[^/]+$)/,
  reports: /^reports\//,
};
const totals = {}; for (const g of Object.keys(groups)) totals[g] = { files: 0, bytes: 0 };
for (const f of kept) { for (const [g, re] of Object.entries(groups)) if (re.test(f.rel)) { totals[g].files++; totals[g].bytes += f.bytes; break; } }
// One digest per group, over the sorted lines "path TAB bytes TAB sha256", so a receiver can compare a whole group with
// one command without walking the file list.
const digestOf = (list) => createHash('sha256').update(list.map((f) => f.rel + '\t' + f.bytes + '\t' + f.sha256 + '\n').join('')).digest('hex');
const inGroup = (re) => kept.filter((f) => re.test(f.rel));
const manifest = {
  generatedFor: site,
  generatedOn: 'the extraction host (Windows)',
  basis: { head: status.head, commits: status.commits, pages: status.pages, indexable: status.indexable },
  gitHistoryIncluded: false,
  hashAlgorithm: 'sha256',
  files: kept.sort((a, b) => a.rel.localeCompare(b.rel)),
  totals: {
    files: kept.length,
    bytes: kept.reduce((n, f) => n + f.bytes, 0),
    byGroup: totals,
    groupSha256: Object.fromEntries(Object.entries(groups).map(([g, re]) => [g, digestOf(inGroup(re))])),
    allSha256: digestOf(kept),
  },
  excluded: { files: dropped.sort((a, b) => a.rel.localeCompare(b.rel)), bytes: dropped.reduce((n, f) => n + (f.bytes ?? 0), 0) },
};
writeFileSync(join(out, 'reports', 'mac-handoff-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('[mac-package] ' + out);
console.log('[mac-package] kept ' + kept.length + ' files, ' + manifest.totals.bytes + ' bytes; dropped ' + dropped.length + ' entries, ' + manifest.excluded.bytes + ' bytes');
for (const [g, t] of Object.entries(totals)) console.log('[mac-package]   ' + g.padEnd(10) + t.files + ' files, ' + t.bytes + ' bytes');
