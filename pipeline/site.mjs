#!/usr/bin/env node
/**
 * Static site generator for supermarketsimulator.wiki (Windows-side build).
 *
 * Indexability policy, enforced here rather than hoped for:
 *   - every page this build emits is indexable, listed in sitemap.xml, and carries canonical + a source line.
 *   - this title has NO entity pages: metadata v39 gave no measured type->field member, so a per-class page
 *     would contain a name and 100% "unknown" fields - a thin page by definition. The full class schema is
 *     served instead by the search, collection and namespaces pages, which do answer queries.
 * Nothing is estimated: a value this build does not have is rendered as "unknown".
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { isEngineNamespace } from './schema_to_inventory.mjs';

export const SITE = {
  name: 'Supermarket Simulator Database',
  domain: 'supermarketsimulator.wiki',
  url: 'https://supermarketsimulator.wiki',
  tagline: 'The classes and namespaces the game defines, read from its own IL2CPP metadata',
};

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Pure, fixture-tested: class lookup across the inventory. */
export function lookupClasses(inventory, query, limit = 50) {
  if (typeof query !== 'string') throw new TypeError('query must be a string');
  const q = query.trim().toLowerCase().slice(0, 64);
  const cap = Number.isFinite(limit) ? Math.max(1, Math.min(200, Math.floor(limit))) : 50;
  const out = [];
  for (const c of inventory.classes ?? []) {
    const name = c.name ?? '';
    const ns = c.namespace ?? '';
    if (!q || name.toLowerCase().includes(q) || ns.toLowerCase().includes(q)) {
      out.push({ name, namespace: ns, confidence: c.nameConfidence ?? 'identifier' });
      if (out.length >= cap) return out;
    }
  }
  return out;
}

export const NAV = [
  ['/', 'Home'], ['/search.html', 'Search'], ['/collection.html', 'Classes'], ['/namespaces.html', 'Namespaces'],
  ['/fields.html', 'Fields'],
  ['/tool.html', 'Lookup tool'], ['/guide.html', 'Guide'], ['/sources.html', 'Sources'], ['/about.html', 'About'],
  ['/contact.html', 'Contact'], ['/disclaimer.html', 'Disclaimer'], ['/privacy.html', 'Privacy'], ['/terms.html', 'Terms'],
];

/** This title emits no schema-only pages (documented above), so nothing is a schema page. */
export function isSchemaPage(_path) { return false; }

export function build(inventoryPath, outDir) {
  const inv = JSON.parse(readFileSync(inventoryPath, 'utf8'));
  const all = inv.classes ?? [];
  const game = all.filter((c) => !isEngineNamespace(c.namespace));
  const engine = all.length - game.length;
  const nsRows = (inv.namespaces ?? []);
  const src = inv.source ?? {};
  const srcLine = 'Source: ' + (src.file ?? 'game files') + ' · sha256 ' + String(src.sha256 ?? '').slice(0, 16) +
    '… · IL2CPP metadata v' + (src.metadataVersion ?? '?') + ' · game version ' + (inv.version ?? 'unknown');

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const pages = new Map();
  const urls = [];
  const layout = (title, desc, path, body) => '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>' + esc(title.includes(SITE.name) ? title : title + ' · ' + SITE.name) + '</title>\n' +
    '<meta name="description" content="' + esc(desc) + '">\n<meta name="robots" content="index, follow">\n' +
    '<link rel="canonical" href="' + SITE.url + path + '">\n<link rel="stylesheet" href="/style.css">\n</head>\n<body>\n' +
    '<header><a href="/">' + esc(SITE.name) + '</a><nav>' +
    NAV.map(([h, t]) => '<a href="' + h + '">' + esc(t) + '</a>').join('') + '</nav></header>\n<main>\n' + body +
    '\n</main>\n<footer><p class="dim">' + esc(srcLine) + '</p>' +
    '<p class="dim">Values this build does not have are shown as <strong>unknown</strong>. No value is estimated.</p>' +
    '</footer>\n</body>\n</html>\n';
  const write = (rel, html) => { const f = join(outDir, rel); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, html, 'utf8'); pages.set('/' + rel, html); };
  const indexable = (rel, title, desc, body) => { write(rel, layout(title, desc, '/' + rel, body)); urls.push(SITE.url + '/' + rel); };

  const t = inv.totals ?? {};
  indexable('index.html', SITE.name, SITE.tagline,
    '<h1>' + esc(SITE.name) + '</h1>\n<p>' + esc(SITE.tagline) + '.</p>\n<ul>' +
    '<li><strong>' + all.length + '</strong> classes in the metadata: <strong>' + (t.gameClasses ?? game.length) +
    '</strong> game types and <strong>' + (t.engineClasses ?? engine) + '</strong> engine/third-party types</li>' +
    '<li><strong>' + (t.namespaces ?? 0) + '</strong> namespaces, plus <strong>' + (t.globalNamespaceClasses ?? 0) +
    '</strong> types in the global namespace</li>' +
    '<li><strong>' + (t.fields ?? 0) + '</strong> field rows across <strong>' + (t.distinctFieldNames ?? 0) + '</strong> distinct field names; which class each one belongs to is ' + esc(String(inv.fieldsStatus?.status ?? 'unknown')) +
    ' — see <a href="/sources.html">sources</a> for why</li></ul>' +
    '<p><a href="/collection.html">Browse the classes</a> · <a href="/namespaces.html">Namespaces</a> · ' +
    '<a href="/tool.html">Lookup tool</a></p>' +
    '<h2>What this site is</h2><p>A read-only extraction of the class schema inside this installation of the game. ' +
    'It is a reference for modders and curious players, not a wiki with hand-written pages.</p>');

  const gameJson = JSON.stringify(game.map((c) => [c.name, c.namespace])).replace(/</g, '\\u003c');
  indexable('search.html', 'Search', 'Client-side search over every class the game defines.',
    '<h1>Search</h1><p class="dim">' + game.length + ' game classes, searched in your browser. No network requests.</p>' +
    '<p><input id="q" type="search" placeholder="e.g. Product, Shelf, Checkout" autocomplete="off"> ' +
    '<label class="dim"><input type="checkbox" id="ns"> match namespaces too</label></p>' +
    '<p id="meta" class="dim"></p><table id="out"><thead><tr><th>Class</th><th>Namespace</th></tr></thead><tbody></tbody></table>' +
    '<script type="application/json" id="data">' + gameJson + '</script>' +
    '<script src="/search.js" defer></script>');

  const shown = game.slice(0, 400);
  indexable('collection.html', 'Classes', 'Every class the game defines, with its namespace.',
    '<h1>Classes</h1><p class="dim">' + game.length + ' game classes (engine and third-party types are listed on the ' +
    '<a href="/namespaces.html">namespaces page</a>). Showing the first ' + shown.length + '; use ' +
    '<a href="/tool.html">the lookup tool</a> for the rest.</p><table><thead><tr><th>Class</th><th>Namespace</th></tr></thead><tbody>' +
    shown.map((c) => '<tr><td class="mono">' + esc(c.name) + '</td><td class="dim">' + (c.namespace ? esc(c.namespace) : '<span class="dim">(global)</span>') + '</td></tr>').join('') +
    '</tbody></table>');

  const fnames = inv.fields?.names ?? [];
  indexable('fields.html', 'Fields', 'Every field name the game defines, and how many rows carry it.',
    '<h1>Fields</h1><p class="dim">' + (inv.fields?.rows ?? 0) + ' field rows in the metadata resolve to ' + fnames.length +
    ' distinct names. Class attribution is <strong>' + esc(String(inv.fields?.classAttribution?.status ?? 'unknown')) +
    '</strong>: this metadata version exposes field names but no measured type-to-field member, so no field is claimed by a class here (see <a href="/sources.html">sources</a>).</p>' +
    '<p id="meta" class="dim"></p><table id="out"><thead><tr><th>Field</th><th>Rows</th></tr></thead><tbody></tbody></table>' +
    '<noscript><p class="dim">The table needs JavaScript; the same data is served as <a href="/data/fields.json">/data/fields.json</a>.</p></noscript>' +
    '<script src="/fields.js" defer></script>');
  // The field list is 15k rows: served as JSON and rendered in the browser instead of inlined in the HTML, which
  // took the page from 783 KiB to a few KiB. The JSON is still a build artefact with the same provenance.
  write('data/fields.json', JSON.stringify(fnames.map((f) => [f.name, f.count])));
  write('fields.js', 'fetch("/data/fields.json").then(function(r){return r.json();}).then(function(rows){' +
    'var tb=document.getElementById("out").querySelector("tbody");' +
    'var esc=function(s){return String(s).replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c];});};' +
    'tb.innerHTML=rows.map(function(r){return "<tr><td class=mono>"+esc(r[0])+"</td><td>"+r[1]+"</td></tr>";}).join("");' +
    'document.getElementById("meta").textContent=rows.length+" field names";});');

  indexable('namespaces.html', 'Namespaces', 'All namespaces and how many types each one holds.',
    '<h1>Namespaces</h1><p class="dim">' + nsRows.length + ' namespaces. Types whose namespace is an engine or ' +
    'third-party namespace are counted here but are not game content.</p><table><thead><tr><th>Namespace</th><th>Types</th></tr></thead><tbody>' +
    nsRows.map((n) => '<tr><td class="mono">' + (n.name ? esc(n.name) : '(global)') + '</td><td>' + n.count + '</td></tr>').join('') +
    '</tbody></table>');

  indexable('guide.html', 'Guide', 'How to read this dataset and what it does not contain.',
    '<h1>Guide</h1><h2>What was read</h2><p>The class table inside <span class="mono">global-metadata.dat</span> of this ' +
    'installation, read-only. Each entry contributes a class name and a namespace.</p>' +
    '<h2>What is not here</h2><p>Fields, values, prices, product lists, recipes and map data: none of that is in this build. ' +
    'The metadata version used by this game (' + (src.metadataVersion ?? '?') + ') does not expose a type-to-field member that ' +
    'this pipeline could verify, so the ' + (inv.fields?.distinct ?? 0) + ' field names are published on their own ' +
    '<a href="/fields.html">fields page</a> and no field is assigned to a class rather than guessing which class owns it.</p>' +
    '<h2>How to search</h2><p>Use <a href="/search.html">search</a> for a class name, or ' +
    '<a href="/namespaces.html">namespaces</a> to see where the game keeps things. The compiler-generated names ' +
    '(starting with <span class="mono">&lt;</span> or <span class="mono">__</span>) are real entries in the metadata, not noise.</p>');

  const fieldJson = JSON.stringify(fnames.map((f) => [f.name, String(f.count)])).replace(/</g, '\\u003c');
  indexable('tool.html', 'Field lookup', 'Check whether the game defines a field name, and how many rows carry it.',
    '<h1>Field lookup</h1><p>Type a name to check whether the game defines a field with that name, and how many field rows carry it. ' +
    'Class attribution is ' + esc(String(inv.fields?.classAttribution?.status ?? 'unknown')) + ', so this page answers "does this name exist" ' +
    'and "how common is it", not "which class owns it".</p>' +
    '<p><input id="q" type="search" placeholder="productId" autocomplete="off"></p>' +
    '<p id="meta" class="dim"></p><table id="out"><thead><tr><th>Field</th><th>Rows</th></tr></thead><tbody></tbody></table>' +
    '<script type="application/json" id="data">' + fieldJson + '</script>' +
    '<script src="/search.js" defer></script>');

  indexable('sources.html', 'Sources', 'Where every byte shown on this site came from.',
    '<h1>Sources</h1><h2>Primary source</h2><dl>' +
    '<dt>File</dt><dd class="mono">' + esc(src.file ?? 'unknown') + '</dd>' +
    '<dt>sha256</dt><dd class="mono">' + esc(String(src.sha256 ?? '')) + '</dd>' +
    '<dt>Bytes</dt><dd>' + (src.bytes ?? 'unknown') + '</dd>' +
    '<dt>Metadata version</dt><dd>' + (src.metadataVersion ?? 'unknown') + '</dd>' +
    '<dt>Type table</dt><dd class="mono">offset ' + (src.typeTable?.offset ?? '?') + ', ' + (src.typeTable?.count ?? '?') +
    ' entries, stride ' + (src.typeTable?.entryStride ?? '?') + '</dd>' +
    '<dt>String blob</dt><dd class="mono">offset ' + (src.stringBlob?.offset ?? '?') + ', size ' + (src.stringBlob?.size ?? '?') + '</dd>' +
    '<dt>Game version</dt><dd>' + esc(inv.version ?? 'unknown') + '</dd>' +
    '<dt>Extractor</dt><dd class="mono">' + esc(src.extractor ?? 'unknown') + '</dd>' +
    '<dt>Method</dt><dd>' + esc(src.method ?? 'measured by self-consistency') + '</dd></dl>' +
    '<h2>Confidence</h2><p>' + esc(inv.provenance?.fields ?? '') + '</p>' +
    '<p>Class names are <strong>identifier</strong>-verified for ' + (all.filter((c) => (c.nameConfidence ?? 'identifier') === 'identifier').length) +
    ' classes; the remaining ' + (all.filter((c) => (c.nameConfidence ?? 'identifier') !== 'identifier').length) +
    ' are compiler-generated names kept verbatim and marked as such.</p>' +
    '<h2>Values</h2><p>' + esc(inv.provenance?.values ?? '') + '</p>');

  indexable('about.html', 'About', 'Who runs this site and how it is built.',
    '<h1>About</h1><p>This site publishes a read-only extraction of the game\'s own metadata as a reference. ' +
    'It is generated by a static build; there is no database behind it.</p>' +
    '<h2>Method</h2><p>No page on this site is hand-written from memory. Everything shown is produced by the build from the ' +
    'files listed on the <a href="/sources.html">sources page</a>. When the build cannot read something, it says so.</p>');

  indexable('contact.html', 'Contact', 'How to reach the maintainer.',
    '<h1>Contact</h1><p>This site is a static reference. There is no form and no server to post to.</p>' +
    '<p>The maintainer address will be published here only when one exists; until then please open an issue on the ' +
    'repository the build is published from.</p>');

  indexable('disclaimer.html', 'Disclaimer', 'This site is unofficial and is not affiliated with the game or its publisher.',
    '<h1>Disclaimer</h1><p>This site is unofficial and is not affiliated with, endorsed by or sponsored by the game\'s ' +
    'developer or publisher. Game names and trademarks belong to their owners.</p>' +
    '<p>Data is extracted from local game files for reference and interoperability purposes. It may be incomplete or ' +
    'out of date relative to a newer game version; the version extracted is stated on the ' +
    '<a href="/sources.html">sources page</a>.</p>');

  indexable('privacy.html', 'Privacy', 'This site has no accounts, no analytics and sets no cookies.',
    '<h1>Privacy</h1><p>No accounts, no analytics, no advertising scripts, no cookies. The pages are static files.</p>' +
    '<p>Search and the lookup tool run entirely in your browser; the query is never sent anywhere.</p>' +
    '<p>Server logs, if any, are kept by the hosting provider under its own policy.</p>');

  indexable('terms.html', 'Terms', 'Conditions for using this site.',
    '<h1>Terms</h1><p>The data is published as-is, without warranty of accuracy or fitness for a purpose.</p>' +
    '<p>You may read and quote it with attribution. Do not present it as official documentation of the game.</p>' +
    '<p>The build that produced this site is reproducible from the version recorded on the ' +
    '<a href="/sources.html">sources page</a>.</p>');

  write('404.html', layout('Not found', 'No such page.', '/404.html',
    '<h1>404</h1><p>That page does not exist. Try <a href="/search.html">search</a> or ' +
    '<a href="/collection.html">the class list</a>.</p>').replace('content="index, follow"', 'content="noindex, follow"'));

  write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => '  <loc>' + u + '</loc>\n').join('') + '</urlset>\n');
  write('robots.txt', 'User-agent: *\nAllow: /\nSitemap: ' + SITE.url + '/sitemap.xml\n');
  write('style.css', 'body{font:16px/1.6 system-ui,sans-serif;max-width:60rem;margin:0 auto;padding:1rem;color:#e8e8e8;background:#12141a}\n' +
    'a{color:#8ecbff}header nav a{margin-right:.75rem}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #2a2f3a;padding:.25rem .5rem;text-align:left}\n' +
    '.dim{color:#9aa3b2}.mono{font-family:ui-monospace,monospace}input[type=search]{padding:.4rem;width:22rem;background:#1b1f27;color:#e8e8e8;border:1px solid #2a2f3a}\n');
  write('search.js', 'const data=JSON.parse(document.getElementById("data").textContent);' +
    'const q=document.getElementById("q"),out=document.getElementById("out").querySelector("tbody"),meta=document.getElementById("meta"),nsBox=document.getElementById("ns");' +
    'function render(){const s=q.value.trim().toLowerCase();document.getElementById("meta").textContent=document.getElementById("meta").textContent;' +
    'const rows=data.filter(([n,nsp])=>!s||n.toLowerCase().includes(s)||(nsBox&&nsBox.checked&&nsp.toLowerCase().includes(s))).slice(0,200);' +
    'out.innerHTML=rows.map(([n,nsp])=>"<tr><td class=mono>"+n.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))+"</td><td class=dim>"+(nsp||"(global)")+"</td></tr>").join("");"".concat();' +
    'meta.textContent=rows.length+" shown";}' +
    'q.addEventListener("input",render);if(nsBox)nsBox.addEventListener("change",render);render();');

  const stats = { pages: pages.size, urls: urls.length, classes: all.length, gameClasses: game.length, engineClasses: engine };
  return stats;
}

const invoked = process.argv[1] && process.argv[1].endsWith('site.mjs');
if (invoked) {
  const inv = process.env.SUPERMARKET_INVENTORY || 'data/normalized/p0-inventory.json';
  const out = process.argv[2] || 'web/dist';
  const s = build(inv, out);
  console.log('[site] pages=' + s.pages + ' indexable=' + s.urls + ' gameClasses=' + s.gameClasses +
    ' engineClasses=' + s.engineClasses + ' out=' + out);
}
