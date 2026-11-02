# SEO audit — supermarketsimulator.wiki, 2026-11-02

Scope: make the 211 indexable pages correct for search and social crawlers before the next deploy. Measured before
and after with the same script over `web/dist`; the numbers below are counts from the built artefact, not claims.
Build counts are unchanged: **242 pages / 211 indexable**.

## Before → after

| Measure | Before | After |
| --- | --- | --- |
| Indexable pages / sitemap URLs | 211 / 211 | 211 / 211 |
| Sitemap `<lastmod>` values | 0 | **118** (only pages with a recorded date; the other 93 omit it) |
| Titles over 60 characters | **113** | **0** (max 60) |
| Titles under 25 characters | 0 | 0 (min 32) |
| Titles in the 45–60 target band | 74 (≤70-bucket reading; mean 60.95) | **121** (mean 46.1) |
| Duplicate titles | 0 | 0 |
| Descriptions over 160 characters | **149** (max 801) | **0** (max 159) |
| Descriptions under 70 characters | **10** (min 28) | **0** (min 77) |
| Duplicate descriptions | 0 | 0 |
| Canonical URLs in the redirecting `.html` form | **211** | **0** (211 clean) |
| `og:url` in the `.html` form | **211** | **0** (211 clean) |
| Internal `.html` links (each one a 308 hop) | **2311** | **0** |
| Pages with `twitter:image` (equal to `og:image`) | 0 | **211** |
| Sitemap XML validity / exact URL set | regex only | **parsed in the gate**, 211/211 clean URLs |
| JSON-LD pages | 211 (types: 1 WebSite, 25 WebPage, 185 Article) | 211, same class split, now with clean urls, BreadcrumbList, Article headline/description/image and truthful dates |
| IndexNow key + submission tool | **none** | `/<key>.txt` served from the artefact root + `tools/indexnow.mjs` (manual, not in CI) |
| Gate suite | 88 gates | **95 gates** (7 new SEO gates) |

Title buckets after: 30 titles 25–34, 60 titles 35–44, 67 titles 45–54, 54 titles 55–60. The short ones are mostly
entity names that read best at the front ("Vending machines · Supermarket Simulator Wiki"); the hard limit (25–60)
is met and the 45–60 band now holds 121 of 211 pages. Description buckets after: 2 ≤80, 9 ≤100, 19 ≤120, 20 ≤140,
161 ≤160.

## URL scheme: clean URLs everywhere

Cloudflare Pages serves `/entries/foo` from `entries/foo.html` and 308-redirects `/entries/foo.html` to it, so the
canonical form of every URL is now the clean one. The build still writes the same 242 `.html` files (that is what
Pages serves the clean URLs from); what changed is every place a URL is printed:

- canonical, `og:url`, `hreflang en` / `x-default`, JSON-LD `url` / breadcrumb `item` / SearchAction target;
- sitemap `<loc>` values, and `robots.txt` still points at `/sitemap.xml`;
- every internal `href` and form `action` (2311 links cleaned; the one page that keeps a meta-refresh, the old
  evidence-layer address, now refreshes to the clean target);
- `config/urls.json` is re-keyed by clean URL (211 keep / 23 noindex, 235 entries); the classifier, smoke test and
  site tests all map a clean URL back to its emitted `.html` file;
- home is `/`, section hubs are `/entities/`, `/articles/`, `/tools/`, and every other page is `/path`.

No new pages were added and none removed: the file set is identical, so the page count and URL set size are
unchanged (211 indexable URLs, all in the sitemap; 23 reachable-but-noindex evidence pages).

## Sitemap and lastmod (truthful dates only)

- 211 entries, exactly the indexable set, every loc a clean URL, XML declaration + `urlset` namespace, one
  `<url>` per loc; a small XML parser in the test suite checks that it is well-formed.
- 118 pages carry a `<lastmod>` and the only values used are **2026-10-01** and **2026-10-30**, because those are
  the only dated records in the repository: `content/updates.json` (14 pages added 2026-10-01) and
  `content/images-manifest.json` (`retrievedAt` 2026-10-30 for the 108 pictured entries; the home page shows those
  pictures). 108 entries and the home page use 2026-10-30; 8 guides plus the updates page use 2026-10-01.
- The other 93 pages (hubs, categories, guide, tools, search, legal pages, notes) have no recorded date, so they get
  **no `<lastmod>`** — the build date is deliberately not used. The gate recomputes the allowed date set from those
  two content files and fails if any other date appears.

## Titles and descriptions

- Titles: the page's own truthful title stays at the front (primary keyword first); the ` · Supermarket Simulator
  Wiki` suffix is appended only when the result fits 60 characters, otherwise it is omitted rather than truncated.
  One page title is longer than 60 on its own (`the-shops-status-its-doors-and-its-ground`, 61 chars) and uses a
  shortened, still-truthful label ("Shop status, doors and the ground customers walk on", 51) while its `<h1>` keeps
  the full title. No title is cut mid-word.
- Descriptions: 70–160 characters, cut at a word boundary with a trailing ellipsis when the source text is longer
  (never mid-word), and when a page's own description is shorter than 70 the fixed, truthful site line
  "A player-written Supermarket Simulator reference checked against the game's own files." is appended — no facts
  are added. Descriptions are unique across all 211 pages.
- Home title/description, hub, category, legal, tools, search and guide descriptions were rewritten to describe the
  page truthfully (e.g. home "Supermarket Simulator Wiki: shop guide and reference"; guide
  "Supermarket Simulator game guide").

## Structured data and social

- Every page has two JSON-LD blocks that parse: the page schema and a BreadcrumbList whose last item is the
  canonical. Home is `WebSite` with `SearchAction` target `/search?q={search_term_string}` (clean URL); indexable
  pages are `WebPage`; entries and guides are `Article` with `headline`, `description`, `url`, clean canonical,
  `image` (the entry's own picture on entry pages) and — where the repository records a date — `datePublished` /
  `dateModified` from the same truthful set. All JSON-LD URLs are clean and equal to the canonical.
- Every indexable page carries `og:title`, `og:description`, `og:url`, `og:type`, `og:image` (+ width/height/alt)
  and `twitter:card=summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`; the Twitter image
  is always the Open Graph image. Entry pages use the entry's own in-game picture as the social image; other pages
  use the site hero picture (1600×900).

## robots.txt (unchanged content, now gated)

```
User-agent: *
Allow: /
Sitemap: https://supermarketsimulator.wiki/sitemap.xml
```

No `Disallow` rules, no `noindex` on paid/player pages; the evidence layer under `/reference/` (and the remaining
11 diagram-only notes) stays `noindex, follow` and out of the sitemap.

## IndexNow

- Public key **819413a198ad7679e8eb70465295a15a** (an ownership marker, not a secret) in
  `web/assets/indexnow-key.txt` and `web/assets/<key>.txt`; both are copied to the site root by the build, so
  `https://supermarketsimulator.wiki/819413a198ad7679e8eb70465295a15a.txt` will serve the key.
- `tools/indexnow.mjs` reads the built `web/dist/sitemap.xml` and submits the URL list to
  `https://api.indexnow.org/indexnow` (host + keyLocation + urlList). Run by hand after a deploy:
  `npm run indexnow -- --dry-run` to print the list, `npm run indexnow` to submit. It is deliberately **not** part of
  the build, the gates or `.github/workflows/publish.yml`.
- Submission has not been executed from this machine: it is an external side effect and the site has not been
  deployed with this build yet.

## Gate: what is enforced now

Seven new gates in `tests/site.test.mjs` (suite 88 → **95 passed, 0 failed**), all measured on the built artefact:

1. Every indexable page has a unique 25–60 char title and a unique 70–160 char description; no title repeats the
   site name; nothing ends mid-word.
2. Canonical, `og:url`, both hreflang alternates, the JSON-LD URL and JSON-LD BreadcrumbList all equal the sitemap
   URL; every sitemap URL maps to an emitted page; no page links to a `.html` URL.
3. Open Graph + Twitter card complete, title/description identical to the page's, `twitter:image == og:image`, the
   social image is absolute and served.
4. JSON-LD parses; WebSite + clean SearchAction on the home page; WebPage or Article on every indexable page;
   BreadcrumbList everywhere; Article headline/description/canonical/image; `datePublished`/`dateModified` only from
   recorded dates and never inverted.
5. The sitemap parses as XML, lists exactly the indexable clean URLs, and any `<lastmod>` is a recorded date.
6. `robots.txt` allows `/`, has no `Disallow`, and advertises the sitemap.
7. IndexNow: key in `web/assets`, per-key file served from the built root with matching content, the manual tool
   exists and calls IndexNow, and the publish workflow does not run it.

**Mutation check (gate really fails).** Temporarily lengthening the home title past 60 characters in
`pipeline/site.mjs` and running `node tests/site.test.mjs` produced:

```
FAIL every indexable page has a unique 25-60 char title and a unique 70-160 char description :: index.html title length 71
[site-tests] 94 passed, 1 failed
```

The source was restored immediately (verified byte-identical) and the gate is green again. Another negative control
is already permanent: the pre-change build fails gate 1, gate 2 and gate 5, which is why this pass exists.

## Exact commands and results (macOS, 2026-11-02, committed tree)

```
node pipeline/site.mjs              -> [site] pages=242 indexable=211 assets=209
                                       mappedGameImages=108 gameClasses=11275 engineClasses=9877   exit 0
node tests/site.test.mjs            -> [site-tests] 95 passed, 0 failed                             exit 0
npx tsc --noEmit -p tsconfig.ci.json-> (TypeScript 5.9.3, no output)                                exit 0
node tools/content-gate.mjs         -> [content-gate] 119 entry file(s), 0 violation(s)             exit 0
node tools/verify-citations.mjs     -> entries=119 facts=941 distinctIdentifiers=1184
                                       universe=43532 confirmedElsewhere=43 unmatched=0             exit 0
node tools/coverage.mjs             -> columns=21 covered=21 published=119 draft=0 reference=0
                                       absent=0 qualityFailures=0                                   exit 0
node tools/classify-urls.mjs        -> [classify] 211 keep, 23 noindex, 0 redirect(s)               exit 0
python3 tools/image-sanity.py       -> [image-sanity] 108 records, 0 flagged                        exit 0
node tools/image-coverage.mjs       -> entries=119 withGameImage=108 diagramOnly=11
                                       manifestRecords=108 unusedRecords=0                          exit 0
node tools/preflight.mjs            -> [preflight] 11 ok, 0 failed                                   exit 0
node tools/smoke.mjs                -> [smoke] 211 kept, 23 noindex, artefact in web/dist; pass     exit 0
```

## Remaining items (outside this repository or deliberately deferred)

1. **IndexNow submission** after the next deploy: `npm run indexnow -- --dry-run` then `npm run indexnow`. The key
   only becomes reachable once this build is live.
2. **Google Search Console / Bing Webmaster Tools**: verification, sitemap submission and IndexNow registration are
   account actions for the site owner, not code.
3. **Live verification** after deploy: the Lead runs `node tools/smoke.mjs https://supermarketsimulator.wiki`, which
   now checks every kept URL's clean canonical; a live response should be HTTP 200 for `/guide` (not a 308 for
   `/guide.html`).
4. 90 indexable titles sit below the 45-character target band (32–44); they are short entity/guide names that read
   best unbranded. Not a defect under the 25–60 requirement; a later copy pass could lengthen a few.

## 2026-11-03 addendum — one new guide in the customer cluster

The customer-route cluster now has one more indexable guide:
`/articles/keeping-the-route-from-the-door-to-the-till-clear` ("Keeping the route from the door to the till clear").
It follows the route from the entrance to the till: the entrance, the walkable ground the game prepares, the
fixtures that stand in the way, the shelf approach, the queue and the delivery boxes. Every step is grounded in
facts already published on the entry pages; no number is estimated. The only template addition is a small optional
"Related guides" block; no existing section was rewritten.

Internal links added:

- the new guide links to three existing entries (`how-customers-find-their-way`, `furniture-and-shop-layout`,
  `checkout-and-cashiers`);
- the new guide links to two existing guides (`laying-out-a-shop-you-can-work-in`,
  `signing-the-shop-so-customers-find-things`);
- three existing guides now link back to it (the same two, plus `keeping-the-tills-moving-as-the-shop-grows`).

No noindex page was promoted: all 11 remaining notes are diagram-only and have no confirmed in-game picture, which
is the site's documented bar for an indexable entry. No new image pack was available and IL2CPP was not re-run.

Measured after the change: **243 page outputs / 212 indexable / 23 noindex HTML pages** (the status generator's
`noindex` field reads 31 because it also counts the 404 and the 7 non-HTML outputs), sitemap 212 clean URLs, 119
`<lastmod>` values (108 entry pictures from 2026-10-30; 8 guides from 2026-10-01; the new guide, home and updates
page from 2026-11-03), and the 95-gate suite still green. `config/urls.json` is 212 keep / 23 noindex / 0 redirects.

