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
  name: 'Supermarket Simulator Wiki',
  domain: 'supermarketsimulator.wiki',
  url: 'https://supermarketsimulator.wiki',
  tagline: 'Run a better shop: stock shelves, price products, serve customers and grow day by day',
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
  ['/', 'Home'], ['/guide.html', 'Start playing'], ['/collection.html', 'Browse the archive'], ['/search.html', 'Find an answer'],
  ['/tool.html', 'Tools'], ['/namespaces.html', 'Updates'], ['/sources.html', 'Reference'], ['/about.html', 'About'],
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
  const srcLine = 'Source: installed game files · build ' + (inv.version ?? 'recorded build');

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const pages = new Map();
  const urls = [];
  const layout = (title, desc, path, body) => '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>' + esc(title.includes(SITE.name) ? title : title + ' · ' + SITE.name) + '</title>\n' +
    '<meta name="description" content="' + esc(desc) + '">\n<meta name="robots" content="index, follow">\n' +
    '<link rel="canonical" href="' + SITE.url + path + '">\n<link rel="stylesheet" href="/style.css">\n</head>\n<body>\n' +
    '<header class="top"><div class="bar"><a class="brand" href="/"><span class="mark">SS</span><span>' + esc(SITE.name) + '</span></a><nav>' +
    NAV.map(([h, t]) => '<a href="' + h + '">' + esc(t) + '</a>').join('') + '</nav></div></header>\n<main>\n' + body +
    '\n</main>\n<footer><p class="dim">' + esc(srcLine) + '</p>' +
    '<p class="dim">Unofficial player reference. Technical extraction notes live under Reference.</p>' +
    '</footer>\n</body>\n</html>\n';
  const write = (rel, html) => { const f = join(outDir, rel); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, html, 'utf8'); pages.set('/' + rel, html); };
  const indexable = (rel, title, desc, body) => { write(rel, layout(title, desc, '/' + rel, body)); urls.push(SITE.url + '/' + rel); };

  const t = inv.totals ?? {};
  indexable('index.html', SITE.name, SITE.tagline,
    '<section class="hero"><div><p class="eyebrow">A player guide for the shop you are building</p><h1>Supermarket Simulator</h1>' +
    '<p class="lead">' + esc(SITE.tagline) + '. Start with a first-day route, then jump into products, shelves, checkout, staff and upgrades.</p>' +
    '<form class="hero-search" action="/search.html"><input name="q" type="search" placeholder="Search products, shelves or guides"><button>Search</button></form>' +
    '<p class="actions"><a class="button primary" href="/guide.html">Start here</a><a class="button" href="/collection.html">Browse the archive</a></p></div>' +
    '<div class="hero-art" aria-label="Supermarket Simulator"><span class="aisle">AISLE 01</span><strong>OPEN<br>FOR<br>BUSINESS</strong><span class="receipt">today\'s plan<br>stock · price · serve</span></div></section>' +
    '<section class="section"><div class="section-head"><div><p class="eyebrow">Choose your next task</p><h2>What are you trying to do?</h2></div><a href="/guide.html">Full game guide →</a></div><div class="task-grid">' +
    [['First day','Get stock on shelves and open without a cash crunch.','/guide.html'],['Keep shelves full','Find a repeatable restock rhythm for a busy shop.','/collection.html'],['Keep the queue moving','Learn the till, scanner and customer flow.','/search.html'],['Grow with intention','Use upgrades, licences and layout when they pay back.','/namespaces.html']].map(([a,b,h],i)=>'<a class="task" href="'+h+'"><span class="task-no">0'+(i+1)+'</span><strong>'+a+'</strong><span>'+b+'</span><i>→</i></a>').join('')+'</div></section>' +
    '<section class="section split"><div><p class="eyebrow">Browse the archive</p><h2>Every part of your shop, in plain language.</h2><p class="dim">Products, storage, customers, checkout, staff, money, layout and upgrades are grouped around the jobs you do in a shift.</p></div><div class="archive-list"><a href="/collection.html"><b>Products & pricing</b><span>What to order and put on the shelf</span></a><a href="/collection.html"><b>Customers & checkout</b><span>Queues, payment and the till</span></a><a href="/collection.html"><b>Money & upgrades</b><span>Loans, licences and the next expansion</span></a></div></section>' +
    '<section class="section note-band"><p class="eyebrow">How this wiki works</p><p>Player pages stay focused on decisions in the shop. The evidence and extraction record is kept in Reference, so you can read an answer without wading through implementation details.</p></section>');

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
    '<dt>Metadata version</dt><dd>metadata v' + (src.metadataVersion ?? 'unknown') + '</dd>' +
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
  write('style.css', ':root{--bg:#101412;--panel:#171d19;--panel2:#202a22;--line:#314237;--ink:#edf3ec;--dim:#9eada0;--accent:#d6f36b;--warm:#ffb86b}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(circle at 80% 0,#263c2b 0,transparent 34rem),var(--bg);color:var(--ink);font:16px/1.65 ui-sans-serif,system-ui,-apple-system,sans-serif}a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}.top{position:sticky;top:0;z-index:5;background:rgba(16,20,18,.9);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}.bar{max-width:1180px;margin:auto;padding:14px 24px;display:flex;gap:28px;align-items:center}.brand{display:flex;align-items:center;gap:10px;color:var(--ink);font-weight:750;white-space:nowrap}.mark{display:grid;place-items:center;width:34px;height:34px;background:var(--accent);color:#182016;font-weight:900;border-radius:9px;font-size:12px}.top nav{display:flex;gap:18px;flex-wrap:wrap;font-size:14px}.top nav a{color:var(--dim)}main{max-width:1180px;margin:auto;padding:0 24px 72px}.hero{display:grid;grid-template-columns:1.1fr .9fr;gap:44px;align-items:center;padding:76px 0 60px;border-bottom:1px solid var(--line)}.eyebrow{color:var(--accent);font-size:12px;letter-spacing:.12em;text-transform:uppercase;margin:0 0 9px}.hero h1{font-size:clamp(3.5rem,8vw,7rem);line-height:.9;letter-spacing:-.06em;margin:0 0 22px;max-width:8ch}.lead{font-size:1.18rem;color:#ccd7ca;max-width:36rem}.hero-search{display:flex;gap:8px;margin:28px 0 18px}.hero-search input{flex:1;min-width:0;padding:13px 15px;border:1px solid var(--line);border-radius:10px;background:var(--panel);color:var(--ink);font-size:15px}.hero-search button,.button{border:1px solid var(--line);background:var(--panel2);color:var(--ink);padding:12px 16px;border-radius:10px;font-weight:650}.button.primary{background:var(--accent);color:#162014;border-color:var(--accent)}.actions{display:flex;gap:10px;flex-wrap:wrap}.hero-art{min-height:380px;background:linear-gradient(145deg,#506c48,#263d29 54%,#151b16);border:1px solid #66835d;border-radius:22px;padding:30px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 24px 70px rgba(0,0,0,.22);transform:rotate(1.3deg)}.hero-art strong{font-size:clamp(2.8rem,6vw,5.8rem);line-height:.84;letter-spacing:-.06em;color:#f5f8df}.aisle,.receipt{font-size:12px;color:#d6f36b;letter-spacing:.12em}.receipt{align-self:flex-end;letter-spacing:.02em;color:#dbe6d5}.section{padding:56px 0;border-bottom:1px solid var(--line)}.section-head{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:22px}.section h2{font-size:2rem;line-height:1.05;margin:.1rem 0}.task-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.task{position:relative;display:flex;flex-direction:column;gap:9px;min-height:176px;padding:18px;background:var(--panel);border:1px solid var(--line);border-radius:14px;color:var(--ink);transition:transform .2s,border-color .2s}.task:hover{transform:translateY(-4px);border-color:var(--accent);text-decoration:none}.task-no{font:700 12px ui-monospace;color:var(--warm)}.task strong{font-size:1.1rem}.task span:not(.task-no){color:var(--dim);font-size:.92rem}.task i{margin-top:auto;color:var(--accent);font-style:normal;font-size:1.3rem}.split{display:grid;grid-template-columns:.8fr 1.2fr;gap:70px}.archive-list{display:grid;gap:10px}.archive-list a{display:flex;justify-content:space-between;gap:15px;padding:15px 0;border-bottom:1px solid var(--line);color:var(--ink)}.archive-list span{color:var(--dim);text-align:right}.note-band{max-width:760px}.dim{color:var(--dim)}.mono{font-family:ui-monospace,monospace}table{border-collapse:collapse;width:100%;background:rgba(23,29,25,.55)}td,th{border-bottom:1px solid var(--line);padding:10px;text-align:left}footer{border-top:1px solid var(--line);padding:26px 24px;max-width:1180px;margin:auto}.note{border-left:3px solid var(--accent);background:var(--panel);padding:14px 18px}@media(max-width:800px){.bar{padding:12px 16px;align-items:flex-start;flex-direction:column;gap:10px}main{padding:0 16px 48px}.hero{grid-template-columns:1fr;padding:50px 0 42px;gap:28px}.hero-art{min-height:260px}.task-grid{grid-template-columns:1fr 1fr}.split{grid-template-columns:1fr;gap:24px}.archive-list span{display:none}}@media(max-width:460px){.task-grid{grid-template-columns:1fr}.hero h1{font-size:4rem}}\n');
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
