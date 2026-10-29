#!/usr/bin/env node
/**
 * Gates for supermarketsimulator.wiki. Deterministic: builds into a temp dir and inspects the output.
 * A gate that cannot fail is not a gate, so each check asserts something that has been wrong at least once:
 * a missing canonical, a page missing its source line, a sitemap listing the 404 page, a thin entity page
 * being emitted, an inventory whose provenance does not match the file it claims to come from.
 */
import { readFileSync, existsSync, rmSync, readdirSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { build, lookupClasses, SITE, NAV, CATEGORIES, isSchemaPage, REFERENCE_PATHS } from '../pipeline/site.mjs';
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
  const fieldsPage = readFileSync(join(dir, 'reference', 'fields.html'), 'utf8');
  const fieldRows = JSON.parse(readFileSync(join(dir, 'data/fields.json'), 'utf8')).length;
  ok('the fields page ships every distinct field name in its JSON payload',
    fieldRows === inv.fields.names.length && fieldsPage.includes('/data/fields.json'),
    fieldRows + ' vs ' + inv.fields.names.length);
  ok('the fields page itself stays small now that the list is external',
    Buffer.byteLength(fieldsPage) < 20_000, Buffer.byteLength(fieldsPage) + ' bytes');
  ok('the fields page tells the reader, in plain words, that the class link is unverified',
    /not verified|not been verified|does not tell you/i.test(fieldsPage));
  const payloadOf = (file) => {
    const h = readFileSync(join(dir, file), 'utf8');
    const from = h.indexOf('id="data">') + 10;
    return h.slice(from, h.indexOf('</script>', from));
  };
  ok('the search page and the tool page ship different payloads',
    payloadOf('search.html') !== payloadOf('reference/tool.html'),
    'both pages inline the same JSON, which makes them duplicate content');
  ok('the tool page payload is the field list, not the class list',
    JSON.parse(payloadOf('reference/tool.html')).length === inv.fields.names.length);
  ok('no page claims an extracted value', !['search.html', 'reference/collection.html', 'reference/namespaces.html', 'reference/sources.html']
    .some((f) => readFileSync(join(dir, f), 'utf8').includes('confidence: "extracted"')));
  ok('the sources page names the file, its hash and the metadata version', (() => {
    const h = readFileSync(join(dir, 'reference', 'sources.html'), 'utf8');
    return ['sha256', String(inv.source.sha256)].every((s) => h.includes(s)) && /<dt>Metadata version<\/dt>/.test(h);
  })());
  ok('the emitted file set contains no engine-heavy page', readdirSync(dir).filter((f) => f.endsWith('.html')).length <= 20);
  ok('the old top-level addresses of the evidence layer are noindex stubs that point into /reference/', (() => {
    const bad = [];
    for (const [oldRel, name] of [['collection.html', 'collection'], ['fields.html', 'fields'], ['namespaces.html', 'namespaces'], ['tool.html', 'tool'], ['sources.html', 'sources']]) {
      const h = readFileSync(join(dir, oldRel), 'utf8');
      if (!h.includes('noindex, follow') || !h.includes('/reference/' + name + '.html')) bad.push(oldRel);
      if (sitemap.includes(SITE.url + '/' + oldRel)) bad.push(oldRel + ':in sitemap');
    }
    return bad.length ? bad.join(', ') : true;
  })() === true);
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

  // The owner's complaint is checked mechanically now: internal wording stays on the sources page, and every image
  // must explain itself and actually exist in the build.
  // Only OUR prose is checked: tables and class="mono" cells hold the game's own identifiers, and the game really does
  // define namespaces such as Unity.IL2CPP.CompilerServices, so data must not be mistaken for our wording.
  const visibleText = (html) => html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<table[\s\S]*?<\/table>/gi, ' ').replace(/<[^>]*class="mono"[^>]*>[\s\S]*?<\/[a-z]+>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&middot;/g, ' ').replace(/\s+/g, ' ').trim();
  const INTERNAL = ['IL2CPP metadata', 'metadata v', 'sha256', 'noindex', 'canonical', 'stride', 'string blob',
    'type table', 'class attribution', 'not-attributed', 'payload', 'inventory', 'field rows'];
  const jargon = [];
  for (const f of htmlFiles) {
    const rel = '/' + f.slice(dir.length + 1).split('\\').join('/');
    // The evidence layer is where the internal vocabulary belongs: reference pages and the notes are skipped here.
    if (rel.startsWith('/reference/')) continue;
    const text = visibleText(readFileSync(f, 'utf8')).toLowerCase();
    for (const term of INTERNAL) if (text.includes(term.toLowerCase())) jargon.push(rel + ' :: ' + term);
  }
  ok('player-facing pages avoid internal terminology (it belongs on the sources page)', jargon.length === 0, jargon.slice(0, 6).join(', '));

  const imageProblems = [];
  for (const f of htmlFiles) {
    const html = readFileSync(f, 'utf8');
    const rel = f.slice(dir.length + 1).split('\\').join('/');
    for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
      const tag = m[0];
      const alt = (tag.match(/\balt="([^"]*)"/i) ?? [])[1] ?? '';
      const source = (tag.match(/\bsrc="([^"]*)"/i) ?? [])[1] ?? '';
      if (!alt.trim()) imageProblems.push(rel + ' :: img without alt (' + source + ')');
      else if (!source.startsWith('/') || !existsSync(join(dir, source.slice(1)))) imageProblems.push(rel + ' :: missing image ' + source);
    }
  }
  ok('every image exists in the build and carries alt text', imageProblems.length === 0, imageProblems.slice(0, 5).join(', '));
  ok('the home page opens with the game, a version badge, a search box and the three calls to action', (() => {
    const h = readFileSync(join(dir, 'index.html'), 'utf8');
    return h.includes('src="/' + SITE.heroImage + '"') && h.includes(SITE.versionBadge) &&
      /<form class="heroSearch"[^>]*action="\/search\.html"/.test(h) && h.includes('Start here') &&
      h.includes('Browse entities') && h.includes('Read the guides');
  })());
  ok('the home page leads with the game, not with build statistics or internal terminology', (() => {
    const h = readFileSync(join(dir, 'index.html'), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
    return !/\b(schema|il2cpp|assembly-csharp|metadata|namespace|class|classes|field|fields)\b/i.test(h) &&
      !/gameClasses|engineClasses|distinctFieldNames/.test(h);
  })());
  ok('every page links a favicon', htmlFiles.every((f) => readFileSync(f, 'utf8').includes('rel="icon"')));
  // Structured data and social metadata are part of the factory standard: every page must be
  // machine-describable, and its JSON-LD must point at the canonical the page declares.
  const metaProblems = [];
  for (const f of htmlFiles) {
    const rel = '/' + f.slice(dir.length + 1).split('\\').join('/');
    const h = readFileSync(f, 'utf8');
    const lds = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    if (!lds.length) { metaProblems.push(rel + ' :: no JSON-LD'); continue; }
    for (const raw of lds) {
      let obj;
      try { obj = JSON.parse(raw); } catch { metaProblems.push(rel + ' :: JSON-LD does not parse'); continue; }
      if (obj['@context'] !== 'https://schema.org' || !obj['@type']) metaProblems.push(rel + ' :: JSON-LD lacks @context/@type');
    }
    const canonical = (h.match(/<link rel="canonical" href="([^"]+)"/) ?? [])[1] ?? '';
    const pointsAtCanonical = lds.some((raw) => {
      try {
        const obj = JSON.parse(raw);
        return obj.url === canonical || (obj.itemListElement ?? []).some((i) => i.item === canonical);
      } catch { return false; }
    });
    if (!pointsAtCanonical) metaProblems.push(rel + ' :: no JSON-LD node points at the canonical');
    if (!h.includes('<meta property="og:title"') || !h.includes('<meta property="og:description"') ||
      !h.includes('<meta property="og:url"') || !h.includes('<meta name="twitter:card"') || !h.includes('<meta name="theme-color"')) {
      metaProblems.push(rel + ' :: incomplete social metadata');
    }
  }
  ok('every page ships parseable JSON-LD and the full social metadata, and the JSON-LD points at its canonical',
    metaProblems.length === 0, metaProblems.slice(0, 5).join(', '));

  // The content model is what makes this a wiki: nothing may reach the build without passing its rules.
  ok('the published entries pass the content gate', (() => {
    try { execFileSync(process.execPath, ['tools/content-gate.mjs'], { stdio: 'pipe' }); return true; }
    catch (e) { return String(e.stdout ?? '') + String(e.message ?? ''); }
  })() === true);

  // Published entries are the player-facing core, so the build must carry all of their structure, not just a title.
  const published = readdirSync('content/published').filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join('content', 'published', f), 'utf8')));
  // Entities with a confirmed game picture are published at /entries/. A subject with no confirmed picture is a
  // note in the evidence layer, out of the sitemap, and never presented as a finished entry.
  const entityFile = (e) => (e.imageTier === 'game-image' ? join(dir, 'entries', e.id + '.html') : join(dir, 'reference', 'notes', e.id + '.html'));
  const missingPages = published.filter((e) => !existsSync(entityFile(e)));
  ok('every published subject has a page: entities under /entries/, picture-less subjects as notes', missingPages.length === 0, missingPages.map((e) => e.id).join(', '));
  const misSitemapped = published.filter((e) => (e.imageTier === 'game-image'
    ? !sitemap.includes(SITE.url + '/entries/' + e.id + '.html')
    : sitemap.includes(SITE.url + '/reference/notes/' + e.id + '.html')));
  ok('the sitemap lists entities only, and keeps picture-less subjects out of it', misSitemapped.length === 0, misSitemapped.map((e) => e.id).join(', '));
  const thin = [];
  for (const e of published) {
    const h = readFileSync(entityFile(e), 'utf8');
    if (!h.includes(e.title)) thin.push(e.id + ':title');
    if (!h.includes(e.summary)) thin.push(e.id + ':summary');
    if (!/<img[^>]+alt="[^"]+"/.test(h)) thin.push(e.id + ':image');
    if (e.imageTier === 'game-image') {
      if (!h.includes('What the game establishes')) thin.push(e.id + ':facts');
      if (!h.includes('Version and sources')) thin.push(e.id + ':sources');
      if (!h.includes('In play')) thin.push(e.id + ':body');
      const rel = (e.related ?? []).filter((id) => published.some((x) => x.id === id));
      for (const id of rel) if (!h.includes('/entries/' + id + '.html') && !h.includes('/reference/notes/' + id + '.html')) thin.push(e.id + ':related ' + id);
    } else {
      if (!h.includes('What the game establishes')) thin.push(e.id + ':facts');
      if (!h.includes('No confirmed picture from the game yet')) thin.push(e.id + ':note-label');
    }
  }
  ok('every entity page carries its title, summary, picture, facts and sources; every note says why it is a note', thin.length === 0, thin.slice(0, 6).join(', '));
  const hub = readFileSync(join(dir, 'entries', 'index.html'), 'utf8');
  ok('the start-here page is indexable and points readers at the entities and the guides',
    sitemap.includes(SITE.url + '/entries/') && hub.includes('/entities/') && hub.includes('/articles/'));

  // The picture rule, checked on the built pages rather than only in the content files: an entry must say whether
  // its picture came from the game or is an original diagram, and most entries must actually carry a game image.
  const unlabelled = [];
  for (const e of published) {
    const h = readFileSync(entityFile(e), 'utf8');
    const hasGame = (e.images ?? []).some((i) => i.kind === 'game');
    if (hasGame && !h.includes('Picture taken from the game')) unlabelled.push(e.id + ':game');
    if (!hasGame && !h.includes('No confirmed picture from the game yet')) unlabelled.push(e.id + ':diagram');
  }
  ok('every page says whether its picture came from the game or is a diagram note', unlabelled.length === 0, unlabelled.slice(0, 5).join(', '));

  const homeHtml = readFileSync(join(dir, 'index.html'), 'utf8');
  const misfeatured = published.filter((e) => e.imageTier !== 'game-image' && homeHtml.includes('/entries/' + e.id + '.html'));
  ok('the home page features entities with a confirmed game picture only', misfeatured.length === 0, misfeatured.map((e) => e.id).join(', '));
  ok('the home page links the entity hub and the guides', homeHtml.includes('/entities/') && homeHtml.includes('/articles/'));

  const illustrated = published.filter((e) => (e.images ?? []).some((i) => i.kind === 'game'));
  ok('at least half of the published entries carry an image taken from the game',
    illustrated.length * 2 >= published.length, illustrated.length + ' of ' + published.length + ' entries');

  const badRefPages = [...REFERENCE_PATHS].filter((rel) => {
    const file = rel.endsWith('/') ? join(dir, rel.slice(1), 'index.html') : join(dir, rel.slice(1));
    const h = readFileSync(file, 'utf8');
    const inSitemap = sitemap.includes(SITE.url + rel);
    return !h.includes('noindex, follow') || inSitemap;
  });
  ok('technical reference pages are noindex and stay out of the sitemap', badRefPages.length === 0, badRefPages.join(', '));
  // The five player sections, in order. The technical reference is reachable from the footer only, and never from
  // the top navigation: it belongs to the evidence layer.
  const expectedNav = ['/guide.html', '/entities/', '/articles/', '/tools/', '/updates.html'];
  ok('the top navigation is exactly the five player sections, in order',
    NAV.length === expectedNav.length && NAV.every(([h], i) => h === expectedNav[i]) &&
    !NAV.some(([h]) => h === '/reference/' || h === '/collection.html' || h === '/fields.html'),
    NAV.map(([h]) => h).join(' '));

  // The "what's new" list is a set of internal links, so a stale URL there is a broken link on a player page.
  const updates = JSON.parse(readFileSync('content/updates.json', 'utf8'));
  const badUpdates = updates.filter((u) => !u.date || !u.title || !u.kind || !u.url || !existsSync(join(dir, String(u.url).replace(/^\//, ''))));
  ok('every item on the updates page has a date, a title, a kind and a link that exists',
    Array.isArray(updates) && updates.length > 0 && badUpdates.length === 0,
    badUpdates.slice(0, 4).map((u) => u.url).join(', '));
  ok('every page carries the technical reference in its footer and nowhere in its body navigation', (() => {
    const h = readFileSync(join(dir, 'index.html'), 'utf8');
    return h.includes('<footer') && h.includes('/reference/') && !h.split('<footer')[0].includes('/reference/');
  })());
  // Player categories, not code categories: each hub page must carry a cover picture, a filter and cards.
  const catPages = CATEGORIES.filter((c) => published.some((e) => c.src.includes(e.category) && e.imageTier === 'game-image'));
  const badCatPages = catPages.filter((c) => {
    const rel = 'entities/' + c.key + '.html';
    if (!existsSync(join(dir, rel)) || !sitemap.includes(SITE.url + '/' + rel)) return true;
    const h = readFileSync(join(dir, rel), 'utf8');
    return !/<figure class="banner">[\s\S]*?<img/.test(h) || !/id="f"/.test(h) || !/class="card"/.test(h);
  });
  ok('every player category has an indexable page with a cover picture, a filter and cards',
    catPages.length > 0 && badCatPages.length === 0, badCatPages.map((c) => c.key).join(', '));
  ok('a category page lists the entities in that category', (() => {
    const c = catPages[0];
    const first = published.find((e) => c.src.includes(e.category) && e.imageTier === 'game-image');
    if (!c || !first) return 'no categorised entity';
    const h = readFileSync(join(dir, 'entities', c.key + '.html'), 'utf8');
    return h.includes(first.title) && h.includes('/entries/' + first.id + '.html') ? true : 'category page does not list ' + first.id;
  })() === true);
  ok('the entity hub links every category that has entities', (() => {
    const h = readFileSync(join(dir, 'entities', 'index.html'), 'utf8');
    return catPages.every((c) => h.includes('/entities/' + c.key + '.html'));
  })());

  const articles = readdirSync('content/articles').filter((x) => x.endsWith('.json')).map((x) => JSON.parse(readFileSync(join('content', 'articles', x), 'utf8')));
  const missingArticles = articles.filter((a) => !existsSync(join(dir, 'articles', a.id + '.html')));
  ok('every published article has a page', missingArticles.length === 0, missingArticles.map((a) => a.id).join(', '));
  const thinArticles = [];
  for (const a of articles) {
    const h = readFileSync(join(dir, 'articles', a.id + '.html'), 'utf8');
    for (const section of ['Applies to', 'Before you start', 'Steps', 'Common mistakes', 'Related entries', 'Sources']) if (!h.includes(section)) thinArticles.push(a.id + ':' + section);
    if (!/<ol[\s>]/.test(h) || (a.steps ?? []).length < 3) thinArticles.push(a.id + ':steps');
    if (!sitemap.includes(SITE.url + '/articles/' + a.id + '.html')) thinArticles.push(a.id + ':not in sitemap');
    const ids = (a.steps ?? []).flatMap((s) => String(s.because).split(/[(),\s]+/)).filter((x) => /[a-z][A-Z]|[0-9]|_/.test(x));
    for (const id of ids) if (h.includes(id)) thinArticles.push(a.id + ': leaks ' + id);
  }
  ok('every article page carries its goal, version, prerequisites, steps, mistakes, related entities and sources', thinArticles.length === 0, thinArticles.slice(0, 6).join(', '));
  // The player questions the home page uses live in a file of their own and the build swallows a broken one, so
  // check the file itself, that every question belongs to a published guide and that no guide goes unasked.
  let questions = null;
  try { questions = JSON.parse(readFileSync(join('data', 'guide-questions.json'), 'utf8')); } catch (e) { questions = null; }
  const questionProblems = [];
  if (!questions) questionProblems.push('data/guide-questions.json does not parse');
  const asked = Object.keys(questions ?? {});
  for (const a of articles) if (!asked.includes(a.id)) questionProblems.push(a.id + ':no player question');
  for (const id of asked) if (!articles.some((a) => a.id === id)) questionProblems.push(id + ':not a published guide');
  ok('the player questions parse and cover every guide', questionProblems.length === 0, questionProblems.slice(0, 6).join(', '));

  // A published image claiming to come from the game must match the manifest that documents its origin.
  const manifest = JSON.parse(readFileSync('content/images-manifest.json', 'utf8'));
  const gameImages = published.flatMap((e) => (e.images ?? []).filter((i) => i.kind === 'game').map((i) => ({ id: e.id, img: i })));
  const badGameImages = gameImages.filter(({ img }) => {
    const rec = (manifest.records ?? []).find((r) => r.file === img.file);
    if (!rec) return true;
    return !existsSync(join(dir, img.file));
  });
    // The binding picture rule is enforced in two steps: tools/image-sanity.py flags every exported file that carries
  // almost no variation, and this gate refuses to let a flag go unanswered. Every flagged file must have a verdict
  // written into reports/image-reviews.md, so a near-blank or flat sheet cannot sit in the manifest unexamined.
  ok('the sanity report covers every mapped picture', (() => {
    const manifestCount = JSON.parse(readFileSync('content/images-manifest.json', 'utf8')).records.length;
    const totals = readFileSync('reports/image-sanity.md', 'utf8').match(/Totals: (\d+) records, (\d+) flagged/);
    return totals && Number(totals[1]) === manifestCount ? true : 'sanity report does not cover the manifest';
  })() === true);
  ok('every picture the sanity pass flagged has a verdict in the review ledger', (() => {
    const sanity = readFileSync('reports/image-sanity.md', 'utf8');
    const ledger = readFileSync('reports/image-reviews.md', 'utf8');
    const files = [...new Set([...sanity.matchAll(/mapped\/[^\s|)]+/g)].map((m) => m[0].split('/').pop()))];
    const missing = files.filter((f) => !ledger.includes(f));
    return missing.length ? missing.join(', ') : true;
  })() === true);

ok('every game image used in an entry has a manifest record and exists in the build', badGameImages.length === 0 && gameImages.length > 0,
    badGameImages.map((x) => x.id + ':' + x.img.file).join(', ') || (gameImages.length ? '' : 'no game image is used yet'));

  const idLeaks = [];
  for (const e of published) {
    const h = readFileSync(entityFile(e), 'utf8');
    const ids = (e.facts ?? []).flatMap((x) => String(x.evidence).replace(/^identifiers?:?\s*/, '').split(/[,\s]+/)).filter((x) => /[a-z][A-Z]|[0-9]|_/.test(x));
    for (const id of ids) if (h.includes(id)) idLeaks.push(e.id + ': ' + id);
  }
  ok('entry pages do not print code-style identifiers to players', idLeaks.length === 0, idLeaks.slice(0, 5).join(', '));

  const urlsCfg = JSON.parse(readFileSync('config/urls.json', 'utf8'));
  const classified = new Map((urlsCfg.entries ?? []).map((e) => [e.url, e.action]));
  const emitted = htmlFiles.map((f) => '/' + f.slice(dir.length + 1).split('\\').join('/')).filter((p) => p !== '/404.html');
  const unclassified = emitted.filter((p) => !classified.has(p));
  const keepNotInSitemap = [...classified].filter(([u, a]) => a === 'keep' && !sitemap.includes(SITE.url + u)).map(([u]) => u);
  const noindexInSitemap = [...classified].filter(([u, a]) => a === 'noindex' && sitemap.includes(SITE.url + u)).map(([u]) => u);
  const badRedirects = (urlsCfg.redirects ?? []).filter((r) => !existsSync(join(dir, String(r.to).replace(/^\//, ''))));
  ok('every emitted page is classified in config/urls.json and the classification matches the sitemap',
    unclassified.length === 0 && keepNotInSitemap.length === 0 && noindexInSitemap.length === 0 && badRedirects.length === 0,
    JSON.stringify({ unclassified: unclassified.slice(0, 3), keepNotInSitemap: keepNotInSitemap.slice(0, 3), noindexInSitemap: noindexInSitemap.slice(0, 3), badRedirects: badRedirects.slice(0, 3) }));
  const missingAlternates = htmlFiles.filter((f) => {
    const h = readFileSync(f, 'utf8');
    return !h.includes('hreflang="en"') || !h.includes('hreflang="x-default"');
  });
  ok('every page declares the languages it really has (en plus x-default, self-referencing)', missingAlternates.length === 0, missingAlternates.slice(0, 3).join(', '));
  const notMobile = htmlFiles.filter((f) => {
    const h = readFileSync(f, 'utf8');
    if (!h.includes('name="viewport"') || !h.includes('width=device-width')) return true;
    for (const m of h.matchAll(/style="[^"]*width:\s*(\d+)px/gi)) if (Number(m[1]) > 400) return true;
    return false;
  });
  ok('mobile smoke: every page has a responsive viewport and no fixed width wider than a phone', notMobile.length === 0, notMobile.slice(0, 3).join(', '));

  // The deploy target is declared twice (workflow flag and wrangler.toml); the two must agree.
  {
    const wfText = readFileSync('.github/workflows/publish.yml', 'utf8');
    const wrangler = readFileSync('wrangler.toml', 'utf8');
    const inWorkflow = (wfText.match(/--project-name=([a-z0-9-]+)/) ?? [])[1];
    const inWrangler = (wrangler.match(/name = "([a-z0-9-]+)"/) ?? [])[1];
    ok('the workflow and wrangler.toml agree on the Cloudflare Pages project, and the workflow gates the deploy',
      !!inWorkflow && inWorkflow === inWrangler && /needs:\s*gate\b/.test(wfText) && wfText.includes('node tests/site.test.mjs') && wfText.includes('preflight'),
      JSON.stringify({ workflow: inWorkflow, wrangler: inWrangler }));
  }
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


// --- every recorded image origin is re-checkable: the file on disk must match
// the manifest's bytes, sha256 and dimensions. A mapping that cannot be
// re-checked is not evidence, so this is gated rather than reported.
{
  const manifest = JSON.parse(readFileSync('content/images-manifest.json', 'utf8'));
  const pngOrJpegDims = (b) => {
    if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) {
      return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
    }
    if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
      let i = 2;
      while (i + 9 < b.length) {
        if (b[i] !== 0xff) { i++; continue; }
        const m = b[i + 1];
        if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
        const len = b.readUInt16BE(i + 2);
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
          return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
        }
        i += 2 + len;
      }
    }
    return null;
  };
  const records = manifest.records ?? [];
  const bad = [];
  let checked = 0;
  for (const r of records) {
    const f = join('content', 'assets', r.file);
    if (!existsSync(f)) { bad.push(r.file + ' (missing)'); continue; }
    const buf = readFileSync(f);
    const sha = createHash('sha256').update(buf).digest('hex');
    const dim = pngOrJpegDims(buf);
    if (buf.length !== r.bytes) bad.push(r.file + ' (bytes)');
    else if (sha !== r.sha256) bad.push(r.file + ' (sha256)');
    else if (dim && (dim.width !== r.width || dim.height !== r.height)) bad.push(r.file + ' (dimensions)');
    else checked++;
  }
  ok('every image manifest record matches the file on disk (bytes, sha256, dimensions)',
    bad.length === 0, bad.slice(0, 3).join(', '));
  ok('the image manifest is not empty', checked > 0);
}

// --- the ledger preamble calls the review a separate human step, but the gate above only required a
// verdict for pictures the sanity pass happened to flag, so most mappings were never looked at. This
// closes that: a manifest record without a verdict now fails the suite.
{
  const manifest = JSON.parse(readFileSync('content/images-manifest.json', 'utf8'));
  const ledger = readFileSync('reports/image-reviews.md', 'utf8');
  const judged = new Set([...ledger.matchAll(/\|\s*(mapped\/[^\s|]+)\s*\|/g)].map((m) => m[1].trim()));
  const unjudged = manifest.records.filter((r) => !judged.has(r.file)).map((r) => r.file);
  ok('every mapped picture has a verdict in the review ledger', unjudged.length === 0,
    unjudged.slice(0, 3).join(', '));
}

// --- every identifier an entry cites as evidence must be a real identifier in this build
{
  let passed = true, out = '';
  try {
    out = execFileSync(process.execPath, ['tools/verify-citations.mjs'], { encoding: 'utf8' });
  } catch (e) {
    passed = false;
    out = String((e.stdout ?? '') + (e.stderr ?? ''));
  }
  ok('every identifier cited as evidence exists in this build', passed,
    out.trim().split('\n').filter((l) => l.includes('CHECK')).slice(0, 3).join(' | '));
}

console.log('[site-tests] ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);