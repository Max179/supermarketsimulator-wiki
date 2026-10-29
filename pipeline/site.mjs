#!/usr/bin/env node
/**
 * Static site generator for supermarketsimulator.wiki (Windows-side build).
 *
 * Design: a player-facing game reference, not a reflection tool.
 *   - Player layer: home, game guide, entity hub + category pages, entity pages, guides, tools, updates.
 *   - Evidence layer: identifiers, tables and provenance, kept at /reference/ and marked noindex.
 *   - An entry with no confirmed game image is NOT published as an entity page: it becomes a noindex note under
 *     /reference/notes/ and is listed on its category page only as a note.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { isEngineNamespace } from './schema_to_inventory.mjs';

export const SITE = {
  name: 'Supermarket Simulator Wiki',
  gameName: 'Supermarket Simulator',
  domain: 'supermarketsimulator.wiki',
  url: 'https://supermarketsimulator.wiki',
  // Design value from the Mac design commits (the handoff marks the SITE block as design-owned).
  accent: '#d6f36b',
  tagline: 'Run a better shop: stock shelves, price products, serve customers and grow day by day',
  searchPlaceholder: 'Search products, shelves, customers or guides',
  versionBadge: 'Supermarket Simulator · read from a local copy',
  // Pictures taken from the game, used on the home page. Byte-identical to the Mac design commits' imagery
  // (web/assets/hero-checkout.png and featured-restocking.png); the mapped copy is the single provenance record.
  heroImage: 'mapped/checkout-and-cashiers-selfcheckout.png',
  heroAlt: 'The game\'s own checkout and self-checkout area.',
  featuredImage: 'mapped/restocking-shelves-shelf.png',
  featuredAlt: 'The game\'s own shelf art used for restocking.',
  // A curated starting set for the home page: entries a new player is most likely to need, each with a picture
  // taken from the game. Not a popularity ranking - there is no data for that - and never a picture-less subject.
  featured: ['products-and-deliveries', 'restocking-shelves', 'checkout-and-cashiers', 'customers-and-helpers',
    'the-shop-computer', 'money-as-an-object-in-the-shop', 'how-a-vehicle-drives', 'storage-crates-and-the-storage-tab'],
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

/** The five player-facing sections. Nothing technical belongs here. */
export const NAV = [
  ['/guide.html', 'Game guide'],
  ['/entities/', 'Entities'],
  ['/articles/', 'Guides'],
  ['/tools/', 'Tools'],
  ['/updates.html', 'Updates'],
];

/** Evidence layer: reachable from the footer and /reference/ only, never indexed. */
export const REFERENCE_PATHS = new Set(['/collection.html', '/namespaces.html', '/fields.html', '/tool.html', '/sources.html', '/reference/']);
export function isSchemaPage(path) { return REFERENCE_PATHS.has(path) || path.startsWith('/reference/'); }

/** Player categories: what someone is dealing with in the shop, not what the code calls it. */
export const CATEGORIES = [
  { key: 'products', name: 'Products', src: ['Products', 'Pricing'], blurb: 'What you order, price and put on the shelf, and the offers the market runs.' },
  { key: 'shelves-and-stock', name: 'Shelves and stock', src: ['Shelf and stock', 'Storage'], blurb: 'Filling shelves, holding stock, and the back room that feeds them.' },
  { key: 'customers', name: 'Customers', src: ['Customers'], blurb: 'Who comes in, what they want, and how they move through the shop.' },
  { key: 'checkout', name: 'Checkout', src: ['Checkout'], blurb: 'The tills, the scanner, paying, and getting a queue through.' },
  { key: 'staff', name: 'Staff', src: ['Staff'], blurb: 'Cashiers, restockers, janitors and what you can hand over to them.' },
  { key: 'layout', name: 'Layout and decoration', src: ['Layout'], blurb: 'Floors, walls, paint, signs and the shape of the shop itself.' },
  { key: 'money', name: 'Money, bills and loans', src: ['Finance', 'Loans'], blurb: 'What comes in, what goes out, and the paperwork behind it.' },
  { key: 'upgrades', name: 'Upgrades and licences', src: ['Upgrades'], blurb: 'Shop levels, licences and the things they unlock.' },
  { key: 'vehicles', name: 'Vehicles', src: ['Vehicles'], blurb: 'Driving, deliveries and the vehicles you can use.' },
  { key: 'running-the-shop', name: 'Running the shop', src: ['Shop', 'Tasks'], blurb: 'The day cycle, objectives, cleaning, security and the rest of the routine.' },
  { key: 'interface', name: 'Interface', src: ['Interface'], blurb: 'The screens, menus and readouts you work with.' },
  { key: 'multiplayer', name: 'Playing together', src: ['Multiplayer'], blurb: 'Running one shop with other players.' },
  { key: 'basics', name: 'Basics and answers', src: ['FAQ', 'Glossary', 'Versions'], blurb: 'Common questions, the words this site uses, and which build it documents.' },
];

const groupOf = (category) => (CATEGORIES.find((c) => c.src.includes(category)) ?? CATEGORIES[CATEGORIES.length - 1]);

export function build(inventoryPath, outDir) {
  const inv = JSON.parse(readFileSync(inventoryPath, 'utf8'));
  const all = inv.classes ?? [];
  const game = all.filter((c) => !isEngineNamespace(c.namespace));
  const engine = all.length - game.length;
  const nsRows = (inv.namespaces ?? []);
  const src = inv.source ?? {};
  // The player layer never prints the raw source file name: that lives on /sources.html, in the evidence layer.
  const srcLine = 'Source: read from a local copy of the game · version ' + (inv.version ?? 'unknown') + ' · nothing invented';

  // Pictures taken from the game are identified by asset name; the manifest is the record of that mapping.
  let manifest = { records: [] };
  try { manifest = JSON.parse(readFileSync(join(process.cwd(), 'content', 'images-manifest.json'), 'utf8')); } catch { /* no manifest yet */ }
  const assetOf = (file) => (manifest.records ?? []).find((r) => r.file === file);

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const pages = new Map();
  const urls = [];
  const isRef = (path) => isSchemaPage(path);
  // Search engines and social clients get a page that can describe itself: JSON-LD plus a complete preview block.
  const layout = (title, desc, path, body) => {
    const pageUrl = SITE.url + path;
    const isHome = path === '/' || path === '/index.html';
    const isArticle = (path.startsWith('/entries/') && path !== '/entries/index.html') ||
      (path.startsWith('/articles/') && path !== '/articles/index.html');
    const ldType = isHome ? 'WebSite' : (isArticle ? 'Article' : 'WebPage');
    const pageTitle = title.includes(SITE.name) ? title : title + ' · ' + SITE.name;
    const image = SITE.url + '/' + SITE.heroImage;
    const ld = { '@context': 'https://schema.org', '@type': ldType, name: title, description: desc, url: pageUrl,
      isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.url } };
    if (isArticle) { ld.headline = title; ld.image = image; }
    if (isHome) {
      ld.inLanguage = 'en';
      ld.potentialAction = { '@type': 'SearchAction', target: SITE.url + '/search.html?q={search_term_string}', 'query-input': 'required name=search_term_string' };
    }
    const crumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: isHome
      ? [{ '@type': 'ListItem', position: 1, name: SITE.name, item: SITE.url + '/' }]
      : [{ '@type': 'ListItem', position: 1, name: SITE.name, item: SITE.url + '/' },
        { '@type': 'ListItem', position: 2, name: title, item: pageUrl }] };
    const ldJson = (o) => '<script type="application/ld+json">' + JSON.stringify(o).replace(/</g, '\\u003c') + '</script>';
    return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>' + esc(pageTitle) + '</title>\n' +
    '<meta name="description" content="' + esc(desc) + '">\n<meta name="robots" content="' + (isRef(path) ? 'noindex, follow' : 'index, follow') + '">\n' +
    '<meta name="theme-color" content="#101412">\n' +
    '<link rel="canonical" href="' + pageUrl + '">\n<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n' +
    '<link rel="alternate" hreflang="en" href="' + pageUrl + '">' +
    '<link rel="alternate" hreflang="x-default" href="' + pageUrl + '">' +
    '<meta property="og:title" content="' + esc(title) + '"><meta property="og:type" content="' + (isArticle ? 'article' : 'website') + '"><meta property="og:site_name" content="' + esc(SITE.name) + '"><meta property="og:locale" content="en_US">\n' +
    '<meta property="og:description" content="' + esc(desc) + '"><meta property="og:url" content="' + pageUrl + '">\n' +
    '<meta property="og:image" content="' + image + '"><meta property="og:image:width" content="800"><meta property="og:image:height" content="500"><meta property="og:image:alt" content="' + esc(SITE.heroAlt) + '">\n' +
    '<meta name="twitter:card" content="summary"><meta name="twitter:title" content="' + esc(title) + '"><meta name="twitter:description" content="' + esc(desc) + '">\n' +
    ldJson(ld) + '\n' + ldJson(crumbs) + '\n' +
    '<style>:root{--accent:' + SITE.accent + '}</style>\n<link rel="stylesheet" href="/style.css">\n</head>\n<body>\n' +
    '<a class="skip" href="#main">Skip to content</a>\n' +
    '<header class="top">\n<div class="wrap bar">\n' +
    '<a class="brand" href="/"><img src="/brand.svg" alt="' + esc(SITE.gameName) + '" width="34" height="34"><span>' + esc(SITE.gameName) + '<em>wiki</em></span></a>\n' +
    '<nav class="main" aria-label="Sections">' + NAV.map(([h, t]) =>
      '<a href="' + h + '"' + (path === h || (h !== '/' && path.startsWith(h.replace(/\.html$/, '').replace(/index\.html$/, '')) ) ? ' class="on"' : '') + '>' + esc(t) + '</a>').join('') + '</nav>\n' +
    '<form class="hsearch" action="/search.html" method="get" role="search"><input type="search" name="q" placeholder="' + esc(SITE.searchPlaceholder) + '" aria-label="Search this site"><button type="submit">Search</button></form>\n' +
    '</div>\n</header>\n<main id="main" class="wrap">\n' + body + '\n</main>\n' +
    '<footer class="foot"><div class="wrap">\n<p class="dim">' + esc(srcLine) + '</p>\n' +
    '<p class="dim">A diagram is always labelled as a diagram. A number we could not verify is not printed.</p>\n' +
    '<p class="dim"><a href="/about.html">About</a> · <a href="/contact.html">Contact</a> · <a href="/privacy.html">Privacy</a> · ' +
    '<a href="/terms.html">Terms</a> · <a href="/disclaimer.html">Disclaimer</a> · <a href="/reference/">Technical reference</a></p>\n' +
    '</div></footer>\n</body>\n</html>\n';
  };
  const write = (rel, html) => { const f = join(outDir, rel); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, html, 'utf8'); pages.set('/' + rel, html); };
  const indexable = (rel, title, desc, body) => { write(rel, layout(title, desc, '/' + rel, body)); urls.push(SITE.url + '/' + rel); };
  const reference = (rel, title, desc, body) => { write(rel, layout(title, desc, '/' + rel, body)); };

  // Player entries. Illustrated entries are entities; the rest are notes in the evidence layer.
  const entriesDir = join(process.cwd(), 'content', 'published');
  const entries = existsSync(entriesDir)
    ? readdirSync(entriesDir).filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(readFileSync(join(entriesDir, f), 'utf8')))
      .sort((a, b) => a.title.localeCompare(b.title))
    : [];
  const entities = entries.filter((e) => e.imageTier === 'game-image');
  const notes = entries.filter((e) => e.imageTier !== 'game-image');
  const byId = new Map(entries.map((e) => [e.id, e]));
  const imgOf = (e) => (e.images ?? []).find((i) => i.kind === 'game') ?? (e.images ?? [])[0];
  const entryHref = (id) => (byId.get(id)?.imageTier === 'game-image' ? '/entries/' + id + '.html' : '/reference/notes/' + id + '.html');
  const oneLine = (e) => ((e.facts ?? [])[0]?.claim ?? e.summary ?? '');
  // The "why" clause in a guide carries identifiers in a trailing bracket. The player layer keeps the reason and
  // drops the bracket; the identifiers stay in the content file and can be read in the evidence layer.
  const whyOf = (because) => String(because ?? '').replace(/\s*\([^()]*\)\s*$/, '').trim();

  const card = (e) => {
    const img = imgOf(e);
    return '<a class="card" href="' + entryHref(e.id) + '">' +
      (img ? '<img loading="lazy" src="/' + esc(img.file) + '" alt="' + esc(img.alt?.en ?? '') + '" width="480" height="300">' : '') +
      '<span class="chip">' + esc(groupOf(e.category).name) + '</span>' +
      '<strong>' + esc(e.title) + '</strong><span class="dim">' + esc(oneLine(e)) + '</span></a>';
  };
  const noteRow = (e) => '<li><a href="/reference/notes/' + esc(e.id) + '.html">' + esc(e.title) + '</a> <span class="dim small">— note, no confirmed game picture yet</span></li>';

  // ---- articles (player guides) -------------------------------------------------------------
  let articles = [];
  try { articles = readdirSync(join(process.cwd(), 'content', 'articles')).filter((x) => x.endsWith('.json')).map((x) => JSON.parse(readFileSync(join(process.cwd(), 'content', 'articles', x), 'utf8'))).sort((a, b) => a.title.localeCompare(b.title)); } catch { /* none yet */ }
  let updates = [];
  try { updates = JSON.parse(readFileSync(join(process.cwd(), 'content', 'updates.json'), 'utf8')); } catch { /* none yet */ }
  let questions = {};
  try { questions = JSON.parse(readFileSync(join(process.cwd(), 'data', 'guide-questions.json'), 'utf8')); } catch { /* none yet */ }
  // The changelog on the player layer lists entities and guides only: links into the evidence layer stay in the footer.
  const playerUpdates = updates.filter((u) => !String(u.url ?? '').startsWith('/reference/'));

  // ---- home ---------------------------------------------------------------------------------
  const featured = (SITE.featured ?? []).map((id) => byId.get(id)).filter((e) => e && e.imageTier === 'game-image');
  const featuredList = (featured.length ? featured : entities).slice(0, 8);
  const questionCards = articles.filter((a) => questions[a.id]).slice(0, 6);
  // The Mac design's shift board: three player phases switched in the browser, each one landing on a player
  // page. It never links into the evidence layer, so the player/evidence boundary of the redesign spec holds.
  const shiftBoard = '<section class="shift-board" aria-labelledby="shift-title">\n' +
    '<div class="shift-heading"><div><p class="eyebrow">Your next shift</p><h2 id="shift-title">Run the shop in three moves</h2>' +
    '<p class="dim">Pick a phase to see the decision that matters most right now.</p></div>' +
    '<span class="shift-status" id="shift-status">Day 1 · opening prep</span></div>\n' +
    '<div class="shift-tabs" role="tablist" aria-label="Shop phases">' +
    '<button class="shift-tab is-active" type="button" role="tab" aria-selected="true" data-shift="open">01 Open</button>' +
    '<button class="shift-tab" type="button" role="tab" aria-selected="false" data-shift="serve">02 Serve</button>' +
    '<button class="shift-tab" type="button" role="tab" aria-selected="false" data-shift="grow">03 Grow</button></div>\n' +
    '<div class="shift-stage" data-stage="open"><div class="stage-kicker">Opening prep</div><h3>Put the first earners within reach</h3>' +
    '<p>Place a small, reliable range, check every price tag and leave a clear path to the till.</p>' +
    '<a class="text-link" href="/guide.html">Read the first-day route <span>&rarr;</span></a></div>\n' +
    '<div class="shift-stage" data-stage="serve" hidden><div class="stage-kicker">Serving the rush</div><h3>Keep stock and the queue moving</h3>' +
    '<p>Watch the shelf that sells first, then choose whether your next action is restock, scan or checkout.</p>' +
    '<a class="text-link" href="/entities/checkout.html">Find checkout answers <span>&rarr;</span></a></div>\n' +
    '<div class="shift-stage" data-stage="grow" hidden><div class="stage-kicker">Growing the store</div><h3>Spend the next upgrade on flow</h3>' +
    '<p>Compare licences, storage and layout before you commit your next day of profit.</p>' +
    '<a class="text-link" href="/entities/upgrades.html">Browse shop systems <span>&rarr;</span></a></div>\n' +
    '<div class="shift-checklist" aria-label="Shift checklist">' +
    '<label><input type="checkbox" data-check="stock"> <span>Stock a fast shelf</span></label>' +
    '<label><input type="checkbox" data-check="price"> <span>Check a price</span></label>' +
    '<label><input type="checkbox" data-check="queue"> <span>Clear the queue</span></label>' +
    '<span class="check-count" id="check-count">0/3 done</span></div></section>\n';
  const shiftTasks = [
    ['First day', 'Get stock on shelves and open without a cash crunch.', '/guide.html'],
    ['Keep shelves full', 'Find a repeatable restock rhythm for a busy shop.', '/entities/shelves-and-stock.html'],
    ['Keep the queue moving', 'Learn the till, the scanner and the customer flow.', '/entities/checkout.html'],
    ['Grow with intention', 'Use upgrades, licences and layout when they pay back.', '/entities/upgrades.html'],
  ];
  const shiftScript = '<script>document.querySelectorAll("[data-shift]").forEach(function(tab){tab.addEventListener("click",function(){' +
    'var key=tab.dataset.shift;document.querySelectorAll("[data-shift]").forEach(function(t){var active=t===tab;t.classList.toggle("is-active",active);t.setAttribute("aria-selected",String(active));});' +
    'document.querySelectorAll("[data-stage]").forEach(function(stage){stage.hidden=stage.dataset.stage!==key;});' +
    'document.getElementById("shift-status").textContent=key==="open"?"Day 1 · opening prep":key==="serve"?"Day 1 · customer rush":"Day 1 · next upgrade";});});' +
    'var checks=[].slice.call(document.querySelectorAll("[data-check]"));function count(){var done=checks.filter(function(c){return c.checked;}).length;' +
    'document.getElementById("check-count").textContent=done+"/3 done";if(done===3){document.getElementById("shift-status").textContent="Shift complete · choose your next guide";}}' +
    'checks.forEach(function(c){c.addEventListener("change",count);});</script>';
  indexable('index.html', SITE.gameName + ' guide and reference', SITE.tagline + ' — a player-written reference built from what the game itself establishes.',
    '<section class="hero">\n<div class="heroText">\n' +
    '<p class="kicker">' + esc(SITE.versionBadge) + '</p>\n' +
    '<h1>' + esc(SITE.gameName) + '</h1>\n' +
    '<p class="lead">' + esc(SITE.tagline) + '. Start with a first-day route, then jump into products, shelves, checkout, staff and upgrades. Every entry says what the game itself establishes, and nothing here is estimated.</p>\n' +
    '<form class="heroSearch" action="/search.html" method="get" role="search"><input type="search" name="q" placeholder="' + esc(SITE.searchPlaceholder) + '" aria-label="Search this site"><button type="submit">Search</button></form>\n' +
    '<p class="ctas"><a class="btn primary" href="/entries/">Start here</a> <a class="btn" href="/entities/">Browse entities</a> <a class="btn" href="/articles/">Read the guides</a></p>\n' +
    '</div>\n<figure class="heroArt"><img src="/' + esc(SITE.heroImage) + '" alt="' + esc(SITE.heroAlt) + '" width="800" height="500"><figcaption class="dim small">In-game checkout view · picture taken from the game itself.</figcaption></figure>\n</section>\n' +
    shiftBoard +
    '<section class="block">\n<h2>What this game is</h2>\n<p>' + esc(SITE.gameName) + ' is a shop simulator: you order stock, fill shelves, set prices, serve customers and grow the shop. This site covers the parts of it you actually deal with — ' +
    'products, shelves, customers, tills, staff, layout, money and the routine of a day — and it documents one build at a time.</p>\n' +
    '<p class="dim small">Documented build: ' + esc(inv.version ?? 'unknown') + '. Where the game changes between builds, the entry says which one it was checked against.</p>\n</section>\n' +
    '<section class="block">\n<h2>Popular entities</h2>\n<p class="dim">A curated starting set, each with a picture taken from the game.</p>\n<div class="grid">' + featuredList.map(card).join('') + '</div>\n<p><a href="/entities/">All entities by part of the shop &rarr;</a></p>\n</section>\n' +
    '<section class="block">\n<h2>What are you trying to do?</h2>\n<p class="dim">Choose the job in front of you; each card opens the pages that answer it.</p>\n<div class="task-grid">' +
    shiftTasks.map(([taskTitle, taskText, taskHref], i) => '<a class="task" href="' + taskHref + '"><span class="task-no">0' + (i + 1) + '</span><strong>' + esc(taskTitle) + '</strong><span>' + esc(taskText) + '</span><i>&rarr;</i></a>').join('') +
    '</div>\n</section>\n' +
    '<section class="block split">\n<div><p class="eyebrow">Browse the archive</p><h2>Every part of your shop, in plain language.</h2>' +
    '<p class="dim">Products, storage, customers, checkout, staff, money, layout and upgrades are grouped around the jobs you do in a shift.</p>' +
    '<figure class="feature-card"><img loading="lazy" src="/' + esc(SITE.featuredImage) + '" alt="' + esc(SITE.featuredAlt) + '" width="520" height="180"><figcaption>Featured: restocking shelves</figcaption></figure></div>' +
    '<div class="archive-list">' +
    '<a href="/entities/products.html"><b>Products &amp; pricing</b><span>What to order and put on the shelf</span></a>' +
    '<a href="/entities/checkout.html"><b>Customers &amp; checkout</b><span>Queues, payment and the till</span></a>' +
    '<a href="/entities/money.html"><b>Money &amp; upgrades</b><span>Loans, licences and the next expansion</span></a>' +
    '</div>\n</section>\n' +
    '<section class="block">\n<h2>The question you probably have</h2>\n<div class="qgrid">' + questionCards.map((a) =>
      '<a class="qcard" href="/articles/' + esc(a.id) + '.html"><strong>' + esc(questions[a.id]) + '</strong><span class="dim">' + esc(a.title) + '</span></a>').join('') +
    '</div>\n<p><a href="/articles/">All guides &rarr;</a></p>\n</section>\n' +
    '<section class="block">\n<h2>Latest updates</h2>\n' + (playerUpdates.length
      ? '<ul class="updates">' + playerUpdates.slice(0, 6).map((u) => '<li><span class="when">' + esc(u.date) + '</span> <a href="' + esc(u.url) + '">' + esc(u.title) + '</a> <span class="dim small">' + esc(u.kind ?? '') + '</span></li>').join('') + '</ul>'
      : '<p class="dim">No update notes yet.</p>') +
    '\n<p><a href="/updates.html">All updates &rarr;</a></p>\n</section>\n' +
    '<section class="block">\n<h2>Where the pictures and facts come from</h2>\n' +
    '<p>Pictures are taken from a local copy of the game itself, each one recorded with the asset it came from; a diagram drawn for this site is always labelled as a diagram and is never passed off as a screenshot. ' +
    'Facts are read from the game\'s own files, not from a wiki or a forum. The build this site documents is <strong>' + esc(inv.version ?? 'unknown') + '</strong>.</p>\n' +
    '<p class="dim small">The raw identifiers, tables and extraction notes are kept in a technical reference, reachable from the footer of every page and kept out of search engines on purpose.</p>\n' +
    '<div class="note-band"><p class="eyebrow">How this wiki works</p><p>Player pages stay focused on decisions in the shop. The evidence and extraction record is kept in Reference, so you can read an answer without wading through implementation details.</p></div>\n</section>\n' +
    shiftScript);

  // ---- game guide ---------------------------------------------------------------------------
  indexable('guide.html', 'Game guide', 'Where to start in Supermarket Simulator, and what to do in the first days of a shop.',
    '<h1>Game guide</h1><p class="lead">A short path through your first days, with a link to the entries behind each step.</p>\n' +
    '<h2>1. Get stock onto a shelf</h2><p>Order, receive and fill. The shelves and how they are filled are their own subject: <a href="/entities/shelves-and-stock.html">shelves and stock</a>.</p>\n' +
    '<h2>2. Let customers in</h2><p>Who comes, what they want and how they find it: <a href="/entities/customers.html">customers</a>.</p>\n' +
    '<h2>3. Take the money</h2><p>The tills, the scanner and paying: <a href="/entities/checkout.html">checkout</a>, then the running costs in <a href="/entities/money.html">money</a>.</p>\n' +
    '<h2>4. Grow the shop</h2><p>Levels, licences and fittings: <a href="/entities/upgrades.html">upgrades</a> and <a href="/entities/layout.html">layout</a>.</p>\n' +
    '<h2>5. Hand work over</h2><p>Staff, objectives and the daily routine: <a href="/entities/staff.html">staff</a> and <a href="/entities/running-the-shop.html">running the shop</a>.</p>\n' +
    '<h2>How to use this site</h2><p>Use the search box, browse <a href="/entities/">entities by part of the shop</a>, or read a <a href="/articles/">guide</a> that walks through one job from start to finish. ' +
    'Pictures come from the game; a diagram is always labelled as a diagram.</p>');

  // ---- entity hub and category pages --------------------------------------------------------
  indexable('entities/index.html', 'Entities', 'Every part of the shop this site documents, with pictures taken from the game.',
    '<h1>Entities</h1><p class="lead">Browse by what you are dealing with in the shop. Each entry says what the game itself establishes, and carries a picture taken from the game.</p>\n' +
    '<div class="grid">' + CATEGORIES.map((c) => {
      const list = entities.filter((e) => groupOf(e.category).key === c.key);
      const cover = list.map(imgOf).find(Boolean);
      if (!list.length) return '';
      return '<a class="card" href="/entities/' + c.key + '.html">' +
        (cover ? '<img loading="lazy" src="/' + esc(cover.file) + '" alt="' + esc(cover.alt?.en ?? '') + '" width="480" height="300">' : '') +
        '<strong>' + esc(c.name) + '</strong><span class="dim">' + esc(c.blurb) + '</span>' +
        '<span class="chip">' + list.length + ' entries</span></a>';
    }).join('') + '</div>\n' +
    '<p class="dim small">' + notes.length + ' further subjects exist only as notes so far, because no picture has been confirmed from the game for them. They are listed on their category page and kept out of search engines.</p>');
  for (const c of CATEGORIES) {
    const list = entities.filter((e) => groupOf(e.category).key === c.key);
    const onlyNotes = notes.filter((e) => groupOf(e.category).key === c.key);
    if (!list.length && !onlyNotes.length) continue;
    const cover = list.map(imgOf).find(Boolean);
    indexable('entities/' + c.key + '.html', c.name + ' in ' + SITE.gameName, c.blurb + ' ' + list.map((e) => e.title).join(', ') + '.',
      '<h1>' + esc(c.name) + '</h1><p class="lead">' + esc(c.blurb) + '</p>\n' +
      (cover ? '<figure class="banner"><img src="/' + esc(cover.file) + '" alt="' + esc(cover.alt?.en ?? '') + '" width="900" height="380"><figcaption class="dim small">Picture taken from the game itself.</figcaption></figure>' : '') +
      '<div class="filter"><label for="f">Filter ' + esc(c.name.toLowerCase()) + '</label> <input id="f" type="search" placeholder="Type a word" autocomplete="off"> <span id="count" class="dim small"></span></div>\n' +
      '<div class="grid" id="cards">' + list.map(card).join('') + '</div>\n' +
      (onlyNotes.length ? '<section class="block notes"><h2>Notes without a confirmed picture</h2><p class="dim">These subjects rest on the same verified facts, but no picture from the game has been confirmed for them yet, so they are notes rather than finished entries.</p><ul>' + onlyNotes.map(noteRow).join('') + '</ul></section>' : '') +
      '<p><a href="/entities/">Back to all entities</a></p>\n' +
      '<script>var f=document.getElementById("f"),cards=Array.prototype.slice.call(document.querySelectorAll("#cards .card")),c=document.getElementById("count");' +
      'function run(){var q=f.value.trim().toLowerCase(),n=0;cards.forEach(function(el){var hit=!q||el.textContent.toLowerCase().indexOf(q)>=0;el.style.display=hit?"":"none";if(hit)n++;});c.textContent=n+" shown";}f.addEventListener("input",run);run();</script>');
  }

  // ---- entries ------------------------------------------------------------------------------
  for (const e of entities) {
    const img = imgOf(e);
    const asset = img ? assetOf(img.file) : null;
    const related = (e.related ?? []).filter((id) => byId.has(id));
    indexable('entries/' + e.id + '.html', e.title, e.summary,
      '<article class="entry">\n' +
      (img ? '<figure class="heroimg"><img src="/' + esc(img.file) + '" alt="' + esc(img.alt?.en ?? '') + '" title="' + esc(img.alt?.zh ?? '') + '" width="900" height="520"><figcaption class="dim small">Picture taken from the game to identify this item; it remains the property of the developer.</figcaption></figure>' : '') +
      '<p class="kicker">' + esc(groupOf(e.category).name) + ' · ' + esc(SITE.versionBadge) + '</p>\n<h1>' + esc(e.title) + '</h1>\n' +
      '<p class="oneline">' + esc(oneLine(e)) + '</p>\n<p class="lead">' + esc(e.summary) + '</p>\n' +
      '<aside class="facts"><h2>At a glance</h2><dl>' +
      '<dt>Part of the shop</dt><dd><a href="/entities/' + groupOf(e.category).key + '.html">' + esc(groupOf(e.category).name) + '</a></dd>' +
      '<dt>Picture</dt><dd>taken from the game itself</dd>' +
      '<dt>Documented build</dt><dd>' + esc(inv.version ?? 'unknown') + '</dd>' +
      '<dt>Related entries</dt><dd>' + related.length + '</dd>' +
      '</dl></aside>\n' +
      '<h2>What the game establishes</h2><ul class="verified">' + (e.facts ?? []).map((f) => '<li>' + esc(f.claim) + ' <span class="dim small">(checked against the game\'s own files)</span></li>').join('') + '</ul>\n' +
      '<h2>In play</h2>' + (e.body ?? []).map((p) => '<p>' + esc(p) + '</p>').join('') + '\n' +
      (related.length ? '<h2>Related</h2><div class="grid">' + related.map((id) => card(byId.get(id))).join('') + '</div>' : '') +
      '<h2>Version and sources</h2><p class="dim small">' + esc((e.sources ?? []).join(' ')) + ' Documented build: ' + esc(inv.version ?? 'unknown') + '.</p>\n' +
      '</article>');
  }
  indexable('entries/index.html', 'Start here', 'How to use this site, and where to begin with the shop.',
    '<h1>Start here</h1><p class="lead">This site is a player-written reference for ' + esc(SITE.gameName) + '. It does not try to be a full wiki: every entry states what the game itself establishes, and says plainly when something has not been verified.</p>\n' +
    '<h2>The four things you can do</h2><ul>' +
    '<li><strong>Browse <a href="/entities/">entities</a></strong> by the part of the shop you are dealing with.</li>' +
    '<li><strong>Follow the <a href="/guide.html">game guide</a></strong> through your first days.</li>' +
    '<li><strong>Read a <a href="/articles/">guide</a></strong> that walks through one job from start to finish.</li>' +
    '<li><strong>Search</strong> from the box at the top of any page.</li></ul>\n' +
    '<h2>What the pictures are</h2><p>Where a picture could be taken from the game, it is; each one is labelled on the entry. Where no picture has been confirmed, the subject is kept as a note rather than dressed up as a finished entry.</p>\n' +
    '<h2>What we will never do</h2><p>We do not print a number we could not verify, we do not fill a gap with a guess, and a diagram is always labelled as a diagram.</p>');

  // ---- notes for subjects without a confirmed picture ----------------------------------------
  for (const e of notes) {
    const img = imgOf(e);
    reference('reference/notes/' + e.id + '.html', e.title + ' (note)', e.summary,
      '<h1>' + esc(e.title) + '</h1>\n<p class="note"><strong>No confirmed picture from the game yet.</strong> This subject is kept as a note for now: the facts below are verified against the game\'s own files, but no image has been confirmed for it, so it is not published as a finished entry and is kept out of search engines.</p>\n' +
      (img ? '<figure><img src="/' + esc(img.file) + '" alt="' + esc(img.alt?.en ?? '') + '" width="720" height="420"><figcaption class="dim small">' + esc(img.disclaimer ?? 'Original diagram drawn for this site. It is not a screenshot of the game.') + '</figcaption></figure>' : '') +
      '<h2>What the game establishes</h2><ul class="verified">' + (e.facts ?? []).map((f) => '<li>' + esc(f.claim) + '</li>').join('') + '</ul>\n' +
      '<h2>In play</h2>' + (e.body ?? []).map((p) => '<p>' + esc(p) + '</p>').join('') + '\n' +
      '<p><a href="/entities/">Back to the entities</a> · <a href="/reference/">Technical reference</a></p>');
  }
  reference('reference/notes/index.html', 'Notes', 'Subjects waiting for a confirmed picture from the game.',
    '<h1>Notes</h1><p class="lead">These subjects are documented from the game\'s own files, but no picture has been confirmed for them yet, so they are notes rather than finished entries.</p><ul>' +
    notes.map(noteRow).join('') + '</ul><p><a href="/reference/">Technical reference</a></p>');

  // ---- articles ------------------------------------------------------------------------------
  for (const a of articles) {
    const related = (a.relatedEntities ?? []).filter((id) => byId.has(id));
    indexable('articles/' + a.id + '.html', a.title, a.target,
      '<article class="entry"><p class="kicker">Guide</p>\n<h1>' + esc(a.title) + '</h1>\n<p class="lead">' + esc(a.target) + '</p>\n' +
      '<h2>Applies to</h2><p class="dim">' + esc(a.version ?? SITE.versionBadge) + '</p>\n' +
      '<h2>Before you start</h2><ul>' + (a.prerequisites ?? []).map((p) => '<li>' + esc(p) + '</li>').join('') + '</ul>\n' +
      '<h2>Steps</h2><ol class="steps">' + (a.steps ?? []).map((s) => '<li><strong>' + esc(s.do) + '</strong><br><span class="dim small">' + esc(whyOf(s.because)) + '</span></li>').join('') + '</ol>\n' +
      '<h2>Common mistakes</h2><ul>' + (a.commonMistakes ?? []).map((m) => '<li>' + esc(m) + '</li>').join('') + '</ul>\n' +
      (related.length ? '<h2>Related entries</h2><div class="grid">' + related.map((id) => card(byId.get(id))).join('') + '</div>' : '') +
      '<h2>Sources</h2><p class="dim small">' + esc((a.sources ?? []).join(' ')) + '</p></article>');
  }
  indexable('articles/index.html', 'Guides', 'Step-by-step guides for the shop, each grounded in what the game itself establishes.',
    '<h1>Guides</h1><p class="lead">Each guide has a goal, the build it applies to, what you need first, the steps and the mistakes people make. Every step says why it works.</p>\n' +
    '<div class="grid">' + articles.map((a) => '<a class="card qcard" href="/articles/' + esc(a.id) + '.html">' +
      (questions[a.id] ? '<strong>' + esc(questions[a.id]) + '</strong><span>' + esc(a.title) + '</span>' : '<strong>' + esc(a.title) + '</strong>') +
      '<span class="dim">' + esc(a.target) + '</span></a>').join('') + '</div>');

  // ---- tools and updates ---------------------------------------------------------------------
  indexable('tools/index.html', 'Tools', 'Search boxes and checkers for looking something up on this site.',
    '<h1>Tools</h1><p class="lead">The tools here run in your browser; nothing you type is sent anywhere.</p>\n<div class="grid">' +
    '<a class="card" href="/search.html"><strong>Search names</strong><span class="dim">Check whether a name you saw in a mod or a save file is one the game uses.</span></a>' +
    '<a class="card" href="/reference/tool.html"><strong>Data name checker</strong><span class="dim">Check a data name the game stores values under.</span></a>' +
    '<a class="card" href="/articles/"><strong>Guides</strong><span class="dim">Step-by-step write-ups for one job at a time.</span></a>' +
    '</div><p class="dim small">These utilities report what the game\'s files contain. They are not part of the player reference and carry no advice.</p>');
  indexable('updates.html', 'Updates', 'What has been added to this site, newest first.',
    '<h1>Updates</h1><p class="lead">What has been added, newest first. Entries are added only when a fact has been checked against the game or a picture confirmed.</p>\n' +
    (playerUpdates.length ? '<ul class="updates">' + playerUpdates.map((u) => '<li><span class="when">' + esc(u.date) + '</span> <a href="' + esc(u.url) + '">' + esc(u.title) + '</a> <span class="dim small">' + esc(u.kind ?? '') + '</span></li>').join('') + '</ul>' : '<p class="dim">No update notes yet.</p>') +
    '<p class="dim small">Notes for subjects that have no confirmed picture yet are listed in the technical reference, which is reachable from the footer.</p>');

  // ---- evidence layer (unchanged content, reachable from the footer only) --------------------
  const gameJson = JSON.stringify(game.map((c) => [c.name, c.namespace])).replace(/</g, '\\u003c');
  indexable('search.html', 'Search', 'Search every name the game defines, in your browser.',
    '<h1>Search</h1><p class="dim">' + game.length + ' names, searched in your browser. No network requests.</p>' +
    '<p><input id="q" type="search" placeholder="e.g. Product, Shelf, Checkout" autocomplete="off"> ' +
    '<label class="dim"><input type="checkbox" id="ns"> match namespaces too</label></p>' +
    '<p id="meta" class="dim"></p><table id="out"><thead><tr><th>Name</th><th>Namespace</th></tr></thead><tbody></tbody></table>' +
    '<script type="application/json" id="data">' + gameJson + '</script>' +
    '<script src="/search.js" defer></script>');

  const shown = game.slice(0, 400);
  reference('reference/collection.html', 'All names', 'Every name the game defines, with its namespace.',
    '<h1>All names</h1><p class="dim">' + game.length + ' game names (engine and third-party types are listed on the ' +
    '<a href="/reference/namespaces.html">namespaces page</a>). Showing the first ' + shown.length + '; use ' +
    '<a href="/reference/tool.html">the lookup tool</a> for the rest.</p><table><thead><tr><th>Name</th><th>Namespace</th></tr></thead><tbody>' +
    shown.map((c) => '<tr><td class="mono">' + esc(c.name) + '</td><td class="dim">' + (c.namespace ? esc(c.namespace) : '<span class="dim">(global)</span>') + '</td></tr>').join('') +
    '</tbody></table>');

  const fnames = inv.fields?.names ?? [];
  reference('reference/fields.html', 'Data names', 'Every data name the game defines, and how many rows carry it.',
    '<h1>Data names</h1><p>' + fnames.length + ' names the game stores data under — things like ' +
    '<span class="mono">productId</span>, <span class="mono">storeLevel</span> or <span class="mono">customerCount</span>. ' +
    'The number next to each name is how many times the game uses that name.</p>' +
    '<p class="dim">What this page does <strong>not</strong> tell you: which owner each name belongs to. That link has not been ' +
    'verified yet, so we leave it out rather than guess it. Details on the <a href="/reference/sources.html">sources page</a>.</p>' +
    '<p id="meta" class="dim"></p><table id="out"><thead><tr><th>Name</th><th>Rows</th></tr></thead><tbody></tbody></table>' +
    '<noscript><p class="dim">The table needs JavaScript; the same data is served as <a href="/data/fields.json">/data/fields.json</a>.</p></noscript>' +
    '<script src="/fields.js" defer></script>');
  write('data/fields.json', JSON.stringify(fnames.map((f) => [f.name, f.count])));
  write('fields.js', 'fetch("/data/fields.json").then(function(r){return r.json();}).then(function(rows){' +
    'var tb=document.getElementById("out").querySelector("tbody");' +
    'var esc=function(s){return String(s).replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c];});};' +
    'tb.innerHTML=rows.map(function(r){return "<tr><td class=mono>"+esc(r[0])+"</td><td>"+r[1]+"</td></tr>";}).join("");' +
    'document.getElementById("meta").textContent=rows.length+" data names";});');

  reference('reference/namespaces.html', 'Namespaces', 'All namespaces and how many types each one holds.',
    '<h1>Namespaces</h1><p class="dim">' + nsRows.length + ' namespaces. Types whose namespace is an engine or ' +
    'third-party namespace are counted here but are not game content.</p><table><thead><tr><th>Namespace</th><th>Types</th></tr></thead><tbody>' +
    nsRows.map((n) => '<tr><td class="mono">' + (n.name ? esc(n.name) : '(global)') + '</td><td>' + n.count + '</td></tr>').join('') +
    '</tbody></table>');

  const fieldJson = JSON.stringify(fnames.map((f) => [f.name, String(f.count)])).replace(/</g, '\\u003c');
  reference('reference/tool.html', 'Name checker', 'Type a name and see whether the game defines it.',
    '<h1>Name checker</h1><p>Type a name to check whether the game stores data under it, and how many times it is used ' +
    '(for example <span class="mono">productId</span> or <span class="mono">storeLevel</span>).</p>' +
    '<p><input id="q" type="search" placeholder="productId" autocomplete="off"></p>' +
    '<p id="meta" class="dim"></p><table id="out"><thead><tr><th>Name</th><th>Rows</th></tr></thead><tbody></tbody></table>' +
    '<script type="application/json" id="data">' + fieldJson + '</script>' +
    '<script src="/search.js" defer></script>');

  reference('reference/sources.html', 'Sources', 'Where every byte shown on this site came from.',
    '<h1>Sources</h1><p class="dim">This page is for developers and for anyone checking our work. ' +
    'You do not need it to use the site.</p><h2>Primary source</h2><dl>' +
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

  reference('reference/index.html', 'Technical reference', 'Identifiers, tables and provenance for modders. Not indexed.',
    '<h1>Technical reference</h1><p class="lead">This section is for modders and for anyone checking our data. It is deliberately ' +
    'kept out of search engines: it lists identifiers read from the game\'s files, which are useful to a modder but are not answers ' +
    'to a player\'s question.</p><ul>' +
    '<li><a href="/reference/collection.html">All names, A to Z</a></li>' +
    '<li><a href="/reference/namespaces.html">Where the game keeps its code</a></li>' +
    '<li><a href="/reference/fields.html">Data names</a></li>' +
    '<li><a href="/reference/tool.html">Name checker</a></li>' +
    '<li><a href="/reference/sources.html">Sources and method</a></li>' +
    '<li><a href="/reference/notes/">Notes waiting for a confirmed picture</a></li></ul>' +
    '<p><a href="/entities/">Back to the player reference</a></p>');

  // ---- legal pages ----------------------------------------------------------------------------
  indexable('about.html', 'About', 'Who runs this site and how it is built.',
    '<h1>About</h1><p>This site is a player-written reference for ' + esc(SITE.gameName) + '. It is generated by a static build; there is no database behind it.</p>' +
    '<h2>Method</h2><p>No page on this site is hand-written from memory. Everything shown is produced by the build from the ' +
    'files listed on the <a href="/reference/sources.html">sources page</a>. When the build cannot read something, it says so.</p>' +
    '<h2>What is on which layer</h2><p>The player reference — entities, guides, the game guide and the tools — is what the site is for. ' +
    'The identifiers, tables and extraction notes are an evidence layer behind the <a href="/reference/">technical reference</a>, kept out of search engines on purpose.</p>');

  indexable('contact.html', 'Contact', 'How to reach the maintainer.',
    '<h1>Contact</h1><p>This site is a static reference. There is no form and no server to post to.</p>' +
    '<p>The maintainer address will be published here only when one exists; until then please open an issue on the ' +
    'repository the build is published from.</p>');

  indexable('disclaimer.html', 'Disclaimer', 'This site is unofficial and is not affiliated with the game or its publisher.',
    '<h1>Disclaimer</h1><p>This site is unofficial and is not affiliated with, endorsed by or sponsored by the game\'s ' +
    'developer or publisher. Game names and trademarks belong to their owners.</p>' +
    '<p>Some images on this site are taken from the game itself, only to identify the item they belong to; those images remain the property of the developer. Diagrams drawn for this site are labelled as diagrams and are not screenshots.</p>' +
    '<p>Data is extracted from local game files for reference and interoperability purposes. It may be incomplete or ' +
    'out of date relative to a newer game version; the version extracted is stated on the ' +
    '<a href="/reference/sources.html">sources page</a>.</p>');

  indexable('privacy.html', 'Privacy', 'This site has no accounts, no analytics and sets no cookies.',
    '<h1>Privacy</h1><p>No accounts, no analytics, no advertising scripts, no cookies. The pages are static files.</p>' +
    '<p>Search and the lookup tool run entirely in your browser; the query is never sent anywhere.</p>' +
    '<p>Server logs, if any, are kept by the hosting provider under its own policy.</p>');

  indexable('terms.html', 'Terms', 'Conditions for using this site.',
    '<h1>Terms</h1><p>The data is published as-is, without warranty of accuracy or fitness for a purpose.</p>' +
    '<p>You may read and quote it with attribution. Do not present it as official documentation of the game.</p>' +
    '<p>The build that produced this site is reproducible from the version recorded on the ' +
    '<a href="/reference/sources.html">sources page</a>.</p>');

  write('404.html', layout('Not found', 'No such page.', '/404.html',
    '<h1>404</h1><p>That page does not exist. Try the <a href="/entities/">entities</a> or the search box at the top of the page.</p>').replace('content="index, follow"', 'content="noindex, follow"'));

  // Old top-level addresses for the evidence layer keep working: each one is a noindex page that points at the
  // reference page now. Nothing here is indexable and none of it is linked from the player layer.
  const stub = (oldRel, newPath, title) => {
    const html = layout(title + ' (moved)', 'This page has moved into the technical reference.', '/' + oldRel,
      '<h1>' + esc(title) + '</h1><p class="note">This page has moved into the <a href="' + newPath + '">technical reference</a>. The address was kept so an old link still lands somewhere useful.</p>')
      .replace('content="index, follow"', 'content="noindex, follow"')
      .split(SITE.url + '/' + oldRel).join(SITE.url + newPath)
      .replace('<head>', '<head>\n<meta http-equiv="refresh" content="0; url=' + newPath + '">');
    write(oldRel, html);
  };
  for (const [oldRel, name, title] of [
    ['collection.html', 'collection', 'All names'], ['fields.html', 'fields', 'Data names'],
    ['namespaces.html', 'namespaces', 'Namespaces'], ['tool.html', 'tool', 'Name checker'], ['sources.html', 'sources', 'Sources'],
  ]) stub(oldRel, '/reference/' + name + '.html', title);

  // ---- machine-readable bits ------------------------------------------------------------------
  write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => '  <loc>' + u + '</loc>\n').join('') + '</urlset>\n');
  write('robots.txt', 'User-agent: *\nAllow: /\nSitemap: ' + SITE.url + '/sitemap.xml\n');
  write('search.js', 'var dataEl=document.getElementById("data");var data=dataEl?JSON.parse(dataEl.textContent):[];' +
    'var q=document.getElementById("q"),out=document.getElementById("out")?document.getElementById("out").querySelector("tbody"):null,meta=document.getElementById("meta"),nsBox=document.getElementById("ns");' +
    'if(q&&out){var pre=new URLSearchParams(location.search).get("q");if(pre)q.value=pre;' +
    'var render=function(){var s=q.value.trim().toLowerCase();' +
    'var rows=data.filter(function(r){return !s||r[0].toLowerCase().indexOf(s)>=0||(nsBox&&nsBox.checked&&String(r[1]||"").toLowerCase().indexOf(s)>=0);}).slice(0,200);' +
    'out.innerHTML=rows.map(function(r){return "<tr><td class=mono>"+String(r[0]).replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c];})+"</td><td class=dim>"+(r[1]||"(global)")+"</td></tr>";}).join("");' +
    'if(meta)meta.textContent=rows.length+" shown";};q.addEventListener("input",render);if(nsBox)nsBox.addEventListener("change",render);render();}');

  // Brand mark: drawn for this site (no game artwork), one per site accent.
  write('brand.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="' + esc(SITE.gameName) + '"><rect width="64" height="64" rx="14" fill="' + SITE.accent + '"/><path d="M18 24h28l-3 20H21z" fill="#0f1116"/><path d="M24 24c0-6 3-9 8-9s8 3 8 9" fill="none" stroke="#0f1116" stroke-width="4"/></svg>\n');

  write('style.css', [
    ':root{--bg:#101412;--panel:#171d19;--panel2:#202a22;--line:#314237;--ink:#edf3ec;--dim:#9eada0;--accent:#d6f36b;--warm:#ffb86b}',
    '*{box-sizing:border-box}',
    'html{scroll-behavior:smooth}',
    'body{margin:0;background:radial-gradient(circle at 80% 0,#263c2b 0,transparent 34rem),var(--bg);color:var(--ink);font:16px/1.65 ui-sans-serif,system-ui,-apple-system,sans-serif}',
    'a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}',
    '.wrap{max-width:1180px;margin:0 auto;padding:0 24px}',
    '.skip{position:absolute;left:-9999px}',
    'header.top{position:sticky;top:0;z-index:20;background:rgba(16,20,18,.92);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}',
    '.bar{display:flex;align-items:center;gap:28px;flex-wrap:wrap;padding:14px 24px}',
    '.brand{display:flex;align-items:center;gap:10px;color:var(--ink);font-weight:750;white-space:nowrap}',
    '.brand img{display:block;width:34px;height:34px;border-radius:9px}',
    '.brand em{color:var(--dim);font-style:normal;font-weight:500}',
    'nav.main{display:flex;gap:18px;flex:1 1 auto;flex-wrap:wrap;font-size:.95rem}',
    'nav.main a{color:var(--dim);padding:.25rem 0;border-bottom:2px solid transparent}',
    'nav.main a.on{color:var(--ink);border-bottom-color:var(--accent)}',
    '.hsearch{display:flex;gap:8px}',
    'input[type=search]{padding:10px 12px;background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:10px;min-width:12rem;font-size:15px}',
    'button{padding:10px 14px;border:1px solid var(--line);background:var(--panel2);color:var(--ink);border-radius:10px;cursor:pointer;font-weight:650}',
    'button:hover{border-color:var(--accent)}',
    'main{padding:0 24px 72px}',
    'h1{font-size:clamp(2.2rem,5vw,3.4rem);line-height:1.05;margin:.4rem 0 .6rem;letter-spacing:-.02em}',
    'h2{font-size:clamp(1.5rem,3vw,2rem);line-height:1.1;margin:2rem 0 .6rem}',
    '.lead{font-size:1.12rem;color:#ccd7ca;max-width:44rem}',
    '.dim{color:var(--dim)}.small{font-size:.85rem}.mono{font-family:ui-monospace,monospace}',
    '.kicker,.eyebrow{color:var(--accent);font-size:.8rem;letter-spacing:.12em;text-transform:uppercase;margin:0 0 .3rem}',
    '.hero{display:grid;grid-template-columns:1.1fr .9fr;gap:44px;align-items:center;padding:56px 0 48px;border-bottom:1px solid var(--line)}',
    '.heroText h1{font-size:clamp(2.6rem,6vw,4.6rem);line-height:.95;letter-spacing:-.04em;margin:0 0 20px}',
    '.heroSearch{display:flex;gap:8px;margin:26px 0 18px}.heroSearch input{flex:1 1 auto;min-width:0}',
    '.ctas{display:flex;gap:10px;flex-wrap:wrap}',
    '.btn{display:inline-block;padding:12px 16px;border:1px solid var(--line);border-radius:10px;background:var(--panel2);color:var(--ink);font-weight:650}',
    '.btn.primary{background:var(--accent);color:#162014;border-color:var(--accent)}',
    '.heroArt{margin:0;position:relative;min-height:380px;border:1px solid #66835d;border-radius:22px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.3);transform:rotate(1.3deg);background:#263d29}',
    '.heroArt img{display:block;width:100%;height:380px;object-fit:cover}',
    '.heroArt figcaption,.feature-card figcaption{position:absolute;left:0;right:0;bottom:0;padding:12px 16px;background:linear-gradient(transparent,rgba(0,0,0,.8));color:#eef7e8;font-size:12px}',
    '.block{margin:2.2rem 0}',
    '.shift-board{margin:2.2rem 0 0;padding:28px;border:1px solid #506a55;border-radius:18px;background:linear-gradient(135deg,rgba(38,58,41,.96),rgba(21,27,22,.98));box-shadow:0 20px 60px rgba(0,0,0,.18)}',
    '.shift-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}.shift-heading h2{margin:.1rem 0 .35rem;letter-spacing:-.03em}',
    '.shift-status{font:700 12px ui-monospace,monospace;color:#d6f36b;padding:8px 10px;border:1px solid #66835d;border-radius:7px;white-space:nowrap}',
    '.shift-tabs{display:flex;gap:8px;margin:24px 0 14px;border-bottom:1px solid #405642}',
    '.shift-tab{border:0;border-bottom:2px solid transparent;padding:10px 14px;background:transparent;color:#aebdad;font:700 13px ui-monospace,monospace;cursor:pointer;border-radius:0}',
    '.shift-tab:hover,.shift-tab:focus-visible{color:#edf3ec}',
    '.shift-tab.is-active{color:#d6f36b;border-bottom-color:#d6f36b}',
    '.shift-stage{padding:20px 0 14px;max-width:650px}.shift-stage h3{margin:.2rem 0 .4rem;font-size:1.55rem}.shift-stage p{margin:0 0 14px;max-width:56ch;color:#d1ddd0}',
    '.stage-kicker{color:#ffb86b;font:700 11px ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase}',
    '.text-link{color:#d6f36b;font-weight:700}.text-link span{display:inline-block;transition:transform .2s}.text-link:hover span{transform:translateX(4px)}',
    '.shift-checklist{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:10px;padding-top:16px;border-top:1px solid #405642;color:#d1ddd0;font-size:14px}',
    '.shift-checklist label{display:flex;align-items:center;gap:7px;padding:8px 10px;border:1px solid #405642;border-radius:8px;background:rgba(12,18,14,.35);cursor:pointer;transition:border-color .2s,background .2s}',
    '.shift-checklist label:has(input:checked){border-color:#d6f36b;background:rgba(214,243,107,.1)}',
    '.shift-checklist input{accent-color:#d6f36b}',
    '.check-count{margin-left:auto;color:#d6f36b;font:700 12px ui-monospace,monospace}',
    '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(15rem,1fr));gap:1rem}',
    '.card{display:flex;flex-direction:column;gap:.4rem;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:.7rem;color:var(--ink);transition:transform .2s,border-color .2s}',
    '.card:hover{border-color:var(--accent);transform:translateY(-4px);text-decoration:none}',
    '.card img{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:10px;background:#000}',
    '.card strong{font-size:1rem}.card .dim{font-size:.9rem}',
    '.chip{align-self:flex-start;font-size:.72rem;color:var(--dim);border:1px solid var(--line);border-radius:999px;padding:.1rem .5rem}',
    '.task-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}',
    '.task{position:relative;display:flex;flex-direction:column;gap:9px;min-height:176px;padding:18px;background:var(--panel);border:1px solid var(--line);border-radius:14px;color:var(--ink);transition:transform .2s,border-color .2s}',
    '.task:hover{transform:translateY(-4px);border-color:var(--accent);text-decoration:none}',
    '.task-no{font:700 12px ui-monospace,monospace;color:var(--warm)}',
    '.task strong{font-size:1.1rem}.task span:not(.task-no){color:var(--dim);font-size:.92rem}',
    '.task i{margin-top:auto;color:var(--accent);font-style:normal;font-size:1.3rem}',
    '.split{display:grid;grid-template-columns:.8fr 1.2fr;gap:70px;align-items:start}',
    '.archive-list{display:grid;gap:10px}',
    '.archive-list a{display:flex;justify-content:space-between;gap:15px;padding:15px 0;border-bottom:1px solid var(--line);color:var(--ink)}',
    '.archive-list span{color:var(--dim);text-align:right}',
    '.feature-card{position:relative;margin:26px 0 0;max-width:520px;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--panel)}',
    '.feature-card img{display:block;width:100%;height:180px;object-fit:cover}',
    '.note-band{max-width:760px;margin-top:1.4rem;border-left:3px solid var(--accent);background:var(--panel);padding:.8rem 1rem;border-radius:0 10px 10px 0}',
    '.qgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(16rem,1fr));gap:1rem}',
    '.qcard{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:.9rem;display:flex;flex-direction:column;gap:.35rem}',
    '.filter{display:flex;gap:.6rem;align-items:center;margin:1rem 0}',
    '.updates{list-style:none;padding:0}.updates li{padding:.45rem 0;border-bottom:1px solid var(--line)}.when{color:var(--dim);font-size:.85rem;margin-right:.5rem}',
    '.entry{max-width:46rem}.entry h2{margin-top:2rem}',
    '.heroimg{margin:0 0 1rem}.banner{margin:0 0 1rem}',
    '.heroimg img,.banner img{width:100%;height:auto;border-radius:14px;border:1px solid var(--line);display:block}',
    '.oneline{font-size:1.12rem;background:var(--panel);border-left:3px solid var(--accent);border-radius:0 10px 10px 0;padding:.7rem .9rem;max-width:46rem}',
    '.facts{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:.8rem 1rem;max-width:46rem}',
    '.facts dl{display:grid;grid-template-columns:max-content 1fr;gap:.3rem 1rem;margin:.3rem 0 0}.facts dt{color:var(--dim)}.facts dd{margin:0}',
    '.verified li{margin:.4rem 0}.steps li{margin:.6rem 0}',
    '.note{border-left:3px solid var(--accent);background:var(--panel);padding:.8rem 1rem;border-radius:0 10px 10px 0;max-width:46rem}',
    'footer.foot{border-top:1px solid var(--line);padding:1.4rem 0 2.4rem;margin-top:2rem}',
    'footer.foot p{margin:.35rem 0}',
    'table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid var(--line);padding:.3rem .5rem;text-align:left}',
    '@media(max-width:800px){.bar{padding:12px 16px;align-items:flex-start;flex-direction:column;gap:10px}main{padding:0 16px 48px}.hero{grid-template-columns:1fr;padding:40px 0;gap:28px}.heroArt{min-height:260px}.heroArt img{height:260px}.task-grid{grid-template-columns:1fr 1fr}.split{grid-template-columns:1fr;gap:24px}.archive-list span{display:none}.hsearch{width:100%}.hsearch input{flex:1 1 auto;min-width:0}}',
    '@media(max-width:620px){.shift-heading{display:block}.shift-status{display:inline-block;margin-top:12px}.shift-tabs{overflow:auto}.shift-tab{white-space:nowrap;padding-inline:10px}.shift-checklist{align-items:stretch}.shift-checklist label{flex:1 1 100%}.check-count{margin-left:0}}',
    '@media(max-width:460px){.task-grid{grid-template-columns:1fr}}',
  ].join('\n') + '\n');
  // Static assets are copied verbatim from web/assets and content/assets.
  let assetCount = 0;
  const mappedCount = { n: 0 };
  const copyDir = (src, rel) => {
    if (!existsSync(src)) return;
    for (const entry of readdirSync(src, { withFileTypes: true })) {
      const child = join(src, entry.name);
      const childRel = rel ? rel + '/' + entry.name : entry.name;
      if (entry.isDirectory()) { copyDir(child, childRel); continue; }
      if (entry.name === 'README.txt') continue;
      const dest = join(outDir, childRel);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, readFileSync(child));
      assetCount++;
      if (childRel.startsWith('mapped/')) mappedCount.n++;
    }
  };
  for (const root of ['web/assets', 'content/assets']) copyDir(join(process.cwd(), root), '');
  const stats = { pages: pages.size, urls: urls.length, classes: all.length, gameClasses: game.length, engineClasses: engine, assets: assetCount, mappedImages: mappedCount.n, entities: entities.length, notes: notes.length };
  return stats;
}

const invoked = process.argv[1] && process.argv[1].endsWith('site.mjs');
if (invoked) {
  const inv = process.env.SUPERMARKET_INVENTORY || 'data/normalized/p0-inventory.json';
  const out = process.argv[2] || 'web/dist';
  const s = build(inv, out);
  console.log('[site] pages=' + s.pages + ' indexable=' + s.urls + ' assets=' + s.assets + ' mappedGameImages=' + s.mappedImages + ' gameClasses=' + s.gameClasses +
    ' engineClasses=' + s.engineClasses + ' out=' + out);
}