#!/usr/bin/env node
/**
 * Gates for supermarketsimulator.wiki. Deterministic: builds into a temp dir and inspects the output.
 * A gate that cannot fail is not a gate, so each check asserts something that has been wrong at least once:
 * a missing canonical, a page missing its source line, a sitemap listing the 404 page, a thin entity page
 * being emitted, an inventory whose provenance does not match the file it claims to come from.
 */
import { readFileSync, existsSync, rmSync, readdirSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { build, lookupClasses, SITE, NAV, isSchemaPage } from '../pipeline/site.mjs';
import { isEngineNamespace, ENGINE_PREFIXES } from '../pipeline/schema_to_inventory.mjs';

const INV = 'data/normalized/p0-inventory.json';
let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { if (cond) { pass++; console.log('  PASS ' + name); } else { fail++; console.log('  FAIL ' + name + (detail ? ' :: ' + detail : '')); } };

const inv = JSON.parse(readFileSync(INV, 'utf8'));
const game = inv.classes.filter((c) => !isEngineNamespace(c.namespace));

// --- the tool's pure function: normal, boundary, invalid
ok('lookupClasses returns rows for a real query', lookupClasses(inv, 'Product', 5).length > 0);
ok('lookupClasses is case-insensitive', lookupClasses(inv, 'PRODUCT', 5).length === lookupClasses(inv, 'product', 5).length);
ok('lookupClasses returns an empty list (not an error) when nothing matches', lookupClasses(inv, 'zzz-no-such-class-zzz', 5).length === 0);
ok('lookupClasses clamps the limit to its documented range', lookupClasses(inv, '', 10_000).length <= 200 && lookupClasses(inv, '', 0).length >= 1);
ok('lookupClasses refuses a non-string query rather than coercing it', (() => { try { lookupClasses(inv, 42); return false; } catch { return true; } })());
ok('lookupClasses reports the namespace of each hit', lookupClasses(inv, 'ProductRestockLoop').some((r) => typeof r.namespace === 'string'));

// --- the engine/game split is a predicate, and its edge cases are pinned
ok('isEngineNamespace classifies engine, BCL and vendor namespaces as engine',
  isEngineNamespace('UnityEngine.UI') && isEngineNamespace('System.Xml') && isEngineNamespace('Steamworks.Data'));
ok('isEngineNamespace keeps the global namespace and game namespaces as game',
  !isEngineNamespace('') && !isEngineNamespace('Nokta') && !isEngineNamespace('Supermarket'));
ok('the inventory split agrees with the predicate', inv.totals.gameClasses === game.length &&
  inv.totals.engineClasses + inv.totals.gameClasses === inv.classes.length,
  inv.totals.gameClasses + '+' + inv.totals.engineClasses + ' vs ' + inv.classes.length);
ok('the engine prefix list is a documented, non-empty list', ENGINE_PREFIXES.length > 10);

// --- provenance: the numbers on the site must be the numbers of the file it names
ok('the inventory records the metadata file, its sha256 and the metadata version',
  typeof inv.source.sha256 === 'string' && inv.source.sha256.length === 64 && inv.source.metadataVersion === 39);
ok('the inventory records the measured type table geometry',
  inv.source.typeTable.count === 21152 && inv.source.typeTable.entryStride === 82, JSON.stringify(inv.source.typeTable));
ok('every class carries a name, with a two-tier confidence',
  inv.classes.every((c) => (c.name ?? c.nameRaw)) &&
  inv.classes.every((c) => ['identifier', 'printable-raw'].includes(c.nameConfidence)));
ok('the confidence tiers sum to the class count',
  inv.classes.filter((c) => c.nameConfidence === 'identifier').length +
  inv.classes.filter((c) => c.nameConfidence === 'printable-raw').length === inv.classes.length);
ok('no class claims a field, and the field list states that attribution is unmeasured',
  inv.classes.every((c) => Array.isArray(c.fields) && c.fields.length === 0) &&
  inv.fields.classAttribution.status === 'not-attributed' && inv.fields.rows === 170271 && inv.fields.distinct === 15236,
  JSON.stringify({ rows: inv.fields?.rows, distinct: inv.fields?.distinct }));

// --- the build
const dir = mkdtempSync(join(tmpdir(), 'supermarket-site-'));
let stats;
try {
  stats = build(INV, dir);
  const required = ['index.html', 'search.html', 'collection.html', 'namespaces.html', 'fields.html', 'guide.html', 'tool.html',
    'sources.html', 'about.html', 'contact.html', 'disclaimer.html', 'privacy.html', 'terms.html',
    '404.html', 'sitemap.xml', 'robots.txt'];
  const missing = required.filter((f) => !existsSync(join(dir, f)));
  ok('every required route is emitted', missing.length === 0, missing.join(', '));
  ok('no thin schema-only page is emitted for this title',
    !isSchemaPage('/entity/X.html') && !existsSync(join(dir, 'entity')),
    'an entity directory exists, but this title has no field data to fill it');
  ok('every navigation target is a page that exists',
    NAV.filter(([h]) => !existsSync(join(dir, h.replace(/^\//, '')))).length === 0,
    NAV.filter(([h]) => !existsSync(join(dir, h.replace(/^\//, '')))).map(([h]) => h).join(', '));

  const PRODUCT = required.filter((f) => f.endsWith('.html') && f !== '404.html');
  const weakMeta = PRODUCT.filter((f) => {
    if (!existsSync(join(dir, f))) return false;
    const h = readFileSync(join(dir, f), 'utf8');
    return !h.includes('rel="canonical"') || !h.includes('index, follow') || !h.includes('Source:');
  });
  ok('every product route carries canonical, an index directive and its source line', weakMeta.length === 0, weakMeta.join(', '));
  ok('the 404 page is noindex', readFileSync(join(dir, '404.html'), 'utf8').includes('noindex, follow'));

  const sitemap = readFileSync(join(dir, 'sitemap.xml'), 'utf8');
  const locs = (sitemap.match(/<loc>/g) ?? []).length;
  ok('the sitemap omits the 404 page and lists every indexable page', !sitemap.includes('/404.html') && locs === stats.urls, locs + ' vs ' + stats.urls);
  ok('every sitemap URL is on the published domain', sitemap.includes('https://' + SITE.domain + '/') &&
    !sitemap.includes('localhost'));
  ok('robots.txt points at the sitemap', readFileSync(join(dir, 'robots.txt'), 'utf8').includes('Sitemap: ' + SITE.url + '/sitemap.xml'));
  ok('the build reports the page count it emitted', stats.pages >= 15, String(stats.pages));

  // the search payload must contain exactly the game classes, so the browser cannot show something the build did not ship
  const page = readFileSync(join(dir, 'search.html'), 'utf8');
  const from = page.indexOf('id="data">') + 10;
  const json = page.slice(from, page.indexOf('</script>', from));
  const payload = JSON.parse(json);
  ok('the search payload carries every game class and no engine class',
    payload.length === game.length && payload.every(([n, ns]) => !isEngineNamespace(ns)),
    payload.length + ' vs ' + game.length);
  ok('the search page states the class count it ships', page.includes(String(game.length)));
  const fieldsPage = readFileSync(join(dir, 'fields.html'), 'utf8');
  const fieldRows = JSON.parse(readFileSync(join(dir, 'data/fields.json'), 'utf8')).length;
  ok('the fields page ships every distinct field name in its JSON payload',
    fieldRows === inv.fields.names.length && fieldsPage.includes('/data/fields.json'),
    fieldRows + ' vs ' + inv.fields.names.length);
  ok('the fields page itself stays small now that the list is external',
    Buffer.byteLength(fieldsPage) < 20_000, Buffer.byteLength(fieldsPage) + ' bytes');
  ok('the fields page states that class attribution is unmeasured', fieldsPage.includes('not-attributed'));
  const payloadOf = (file) => {
    const h = readFileSync(join(dir, file), 'utf8');
    const from = h.indexOf('id="data">') + 10;
    return h.slice(from, h.indexOf('</script>', from));
  };
  ok('the search page and the tool page ship different payloads',
    payloadOf('search.html') !== payloadOf('tool.html'),
    'both pages inline the same JSON, which makes them duplicate content');
  ok('the tool page payload is the field list, not the class list',
    JSON.parse(payloadOf('tool.html')).length === inv.fields.names.length);
  ok('no page claims an extracted value', !['search.html', 'collection.html', 'namespaces.html', 'sources.html']
    .some((f) => readFileSync(join(dir, f), 'utf8').includes('confidence: "extracted"')));
  ok('the sources page names the file, its hash and the metadata version',
    ['sha256', String(inv.source.sha256), 'metadata v39'].every((s) => readFileSync(join(dir, 'sources.html'), 'utf8').includes(s)));
  ok('the emitted file set contains no engine-heavy page', readdirSync(dir).filter((f) => f.endsWith('.html')).length <= 20);
  // Two indexable pages that answer the same query with the same text are duplicate content; the audit that
  // prompted this gate found search.html and tool.html sharing 98.8% of their main text.
  const mains = {};
  for (const m of (sitemap.match(/<loc>([^<]+)<\/loc>/g) ?? [])) {
    const rel = m.replace('<loc>' + SITE.url + '/', '').replace('</loc>', '') || 'index.html';
    const h = readFileSync(join(dir, rel), 'utf8');
    const body = h.match(/<main>([\s\S]*?)<\/main>/);
    mains[rel] = (body ? body[1] : h).replace(/\s+/g, ' ').trim();
  }
  // Character 40-grams with CONTAINMENT. Two earlier versions of this metric failed and are recorded here so the
  // reasoning is not repeated: a Jaccard over character shingles measured 0.070 (union denominator plus a shifted
  // page), and word 6-grams measured 0.048 because the inline JSON payload has almost no whitespace (42 grams for
  // an 18 KB page). Containment against the smaller page tolerates a contiguous insertion and dense payloads.
  /** @param {string} s */
  // Every 40-character window (stride 1, hashed to an int to keep memory bounded). The stride-10 version of this
  // function was measured at 0.131 containment on two pages whose longest common block is 17284 of 18173
  // characters: sampled shingles land on different phases in the two pages, so the sampled sets barely intersect.
  const grams = (s) => {
    const set = new Set();
    for (let i = 0; i + 40 <= s.length; i++) {
      let h = 0;
      for (let k = 0; k < 40; k++) h = (h * 31 + s.charCodeAt(i + k)) | 0;
      set.add(h);
    }
    return set;
  };
  /** @param {Set<string>} a @param {Set<string>} b */
  const containment = (a, b) => { let inter = 0; for (const x of a) if (b.has(x)) inter++; return inter / Math.min(a.size, b.size); };
  const keys = Object.keys(mains).map((k) => ({ name: k, grams: grams(mains[k]) }));
  const tooSimilar = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const s = containment(keys[i].grams, keys[j].grams);
      if (s > 0.9) tooSimilar.push(keys[i].name + ' ~ ' + keys[j].name + ' = ' + s.toFixed(2));
    }
  }
  ok('no two indexable pages share more than 90% of their main content', tooSimilar.length === 0, tooSimilar.join(', '));

  const status = JSON.parse(readFileSync('reports/status.json', 'utf8'));
  ok('the status records the decoded value layer with a positive count',
    status.valueLayer !== null && status.valueLayer.count > 0, JSON.stringify(status.valueLayer));
  ok('the status manifest records a source-only handoff',
    status.handoff.excludedCount === 0 && (status.handoff.byTop['data/raw'] ?? 0) === 0 &&
    (status.handoff.byTop['data'] ?? 0) > 0 && status.handoff.trackedFiles > 5,
    JSON.stringify(status.handoff));
  ok('the machine-readable status matches this build',
    status.pages === stats.pages && status.indexable === stats.urls && status.noindex === stats.pages - stats.urls,
    JSON.stringify({ buildPages: stats.pages, statusPages: status.pages, buildUrls: stats.urls, statusUrls: status.indexable }));

  // Every internal href must resolve: a dangling link is a broken page for a reader and for a crawler.
  const htmlFiles = [];
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const f = join(d, e.name); if (e.isDirectory()) walk(f); else if (e.name.endsWith('.html')) htmlFiles.push(f); } };
  walk(dir);
  const dangling = [];
  for (const f of htmlFiles) {
    const h = readFileSync(f, 'utf8');
    for (const m of h.matchAll(/href="(\/[^"#?]*)([#?][^"]*)?"/g)) {
      const t = m[1] === '/' ? 'index.html' : m[1].slice(1);
      if (!existsSync(join(dir, t)) && !existsSync(join(dir, t, 'index.html'))) dangling.push(f.slice(dir.length) + ' -> ' + m[1]);
    }
  }
  ok('every internal link resolves to an emitted file', dangling.length === 0, dangling.slice(0, 5).join(', '));

  // A title that repeats the site name, or two pages sharing a title or description, is a real SEO defect.
  const seenTitles = new Set(); const seenDescs = new Set(); const badMeta = [];
  for (const u of (sitemap.match(/<loc>([^<]+)<\/loc>/g) ?? [])) {
    const rel = u.replace('<loc>' + SITE.url + '/', '').replace('</loc>', '') || 'index.html';
    const h = readFileSync(join(dir, rel), 'utf8');
    const t = (h.match(/<title>([^<]*)<\/title>/) ?? [])[1] ?? '';
    const d = (h.match(/<meta name="description" content="([^"]*)"/) ?? [])[1] ?? '';
    const repeats = t.split(SITE.name).length - 1;
    if (!t || !d || seenTitles.has(t) || seenDescs.has(d) || repeats > 1) badMeta.push(rel + (repeats > 1 ? ' (site name x' + repeats + ')' : ''));
    seenTitles.add(t); seenDescs.add(d);
  }
  ok('every indexable page has a unique title and description, without a repeated site name', badMeta.length === 0, badMeta.slice(0, 4).join(', '));

  // Page-weight budget: every page must stay openable on a phone. The ceiling is 1 MiB; the largest page today is
  // the 782 KiB field-name list, which the reports record as the next optimisation target.
  const heavyPages = [];
  for (const f of htmlFiles) {
    const bytes = readFileSync(f).length;
    if (bytes > 1048576) heavyPages.push(f.slice(dir.length) + ' = ' + Math.round(bytes / 1024) + ' KiB');
  }
  ok('no emitted page exceeds the 1 MiB weight budget', heavyPages.length === 0, heavyPages.join(', '));

  // Claims this project already falsified must not come back. Each phrase below was true once and is not now, so a
  // page asserting one would be a false statement to a reader rather than a style issue.
  const FORBIDDEN = ['does not parse yet', 'no field is listed', 'Every field value'];
  const offenders = [];
  for (const f of htmlFiles) {
    const h = readFileSync(f, 'utf8');
    for (const phrase of FORBIDDEN) if (h.includes(phrase)) offenders.push(f.slice(dir.length) + ' :: ' + phrase);
  }
  ok('no page repeats a claim this project has already falsified', offenders.length === 0, offenders.slice(0, 4).join(', '));

} finally {
  rmSync(dir, { recursive: true, force: true });
}

// --- the publish configuration is part of the deliverable, so it is gated with the site
{
  const wf = readFileSync('.github/workflows/publish.yml', 'utf8');
  const wr = readFileSync('wrangler.toml', 'utf8');
  ok('the publish workflow builds the site and runs the gates', wf.includes('node pipeline/site.mjs') && wf.includes('node tests/site.test.mjs'));
  ok('the deploy job cannot run unless the gate job succeeded', /needs:\s*gate\b/.test(wf));
  ok('the deploy uses a secret and no token is committed',
    wf.includes('secrets.CLOUDFLARE_API_TOKEN') && !/apiToken:\s*[A-Za-z0-9_-]{20,}/.test(wf));
  ok('the Pages project and its output directory are declared', /name = "[a-z0-9-]+"/.test(wr) && wr.includes('pages_build_output_dir = "web/dist"'));
  ok('a portable typecheck config exists for a clean runner', readFileSync('tsconfig.ci.json', 'utf8').includes('typeRoots'));
  ok('the workflow runs the preflight before deploying', wf.includes('node tools/preflight.mjs'));
  ok('the workflow is free of tabs and uses 2-space indentation levels',
    !/\t/.test(wf) && wf.split('\n').every((l) => l.trim() === '' || (l.match(/^ */)[0].length % 2) === 0));
}

console.log('[site-tests] ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
