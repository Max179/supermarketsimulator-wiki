# Quality audit — mobile / static / SEO / AdSense policy (Mac integration, 2026-10-30)

Recorded from the built artefact in `web/dist` on the Mac integration tree. Every number below was produced by the
command named next to it; nothing is typed from memory. This is the check record for the site Definition of Done;
the durable gates are in `tests/site.test.mjs` (87 passing) and the package tools.

## 1. Artefact and counts

```
node pipeline/site.mjs
[site] pages=242 indexable=203 assets=261 mappedGameImages=164 gameClasses=11275 engineClasses=9877 out=web/dist
```

| Fact | Value | How checked |
| --- | --- | --- |
| Emitted HTML pages | 235 | file walk of `web/dist` |
| Indexable pages | 203 | `sitemap.xml` locs = 203, all on `https://supermarketsimulator.wiki` |
| Noindex pages | 31 | 19 notes + 5 old-address stubs + 6 reference pages + reference notes index (31 classified) |
| 404 | 1, `noindex, follow`, not in sitemap | test gate |
| Classified URLs | 234 non-404 (`config/urls.json` 203 keep / 31 noindex / 0 redirects) | `node tools/classify-urls.mjs` |
| Dangling internal links | 0 | every `href="/…"` resolves to a file or `index.html` |
| Images in the build | 164 mapped game images + 94 diagrams (+ shell SVGs) | file walk, `content/images-manifest.json` |
| Every `<img>` has alt + exists | yes | test gate |
| Heaviest page | articles index ≈ 34 KB (budget 1 MiB) | test gate |
| Duplicate indexable content (>90 % containment) | 0 pairs | test gate |
| Unique titles/descriptions | 203/203 | test gate |

## 2. Page spot-check (15 pages, read from the built HTML)

Legend: canonical = absolute canonical on the published domain; robots = meta robots; LD = JSON-LD `@type`s;
source line = the footer "Source: read from a local copy of the game …" provenance line.

| Page | Bytes | Words | Robots | Title | LD | Source line |
| --- | --- | --- | --- | --- | --- | --- |
| `/index.html` | 17,908 | 929 | index, follow | Supermarket Simulator guide and reference | WebSite + BreadcrumbList | yes |
| `/guide.html` | 5,009 | 213 | index, follow | Game guide | WebPage + BreadcrumbList | yes |
| `/entities/index.html` | 8,919 | 302 | index, follow | Entities | WebPage + BreadcrumbList | yes |
| `/entities/products.html` | 14,549 | 470 | index, follow | Products in Supermarket Simulator | WebPage + BreadcrumbList | yes |
| `/entries/checkout-and-cashiers.html` | 9,354 | 595 | index, follow | Checkout and cashiers | Article + BreadcrumbList | yes |
| `/entries/restocking-shelves.html` | 7,920 | 409 | index, follow | Restocking shelves | Article + BreadcrumbList | yes |
| `/articles/restocking-routine.html` | 6,784 | 300 | index, follow | A restocking routine that keeps shelves selling | Article + BreadcrumbList | yes |
| `/articles/index.html` | 34,277 | 3,684 | index, follow | Guides | WebPage + BreadcrumbList | yes |
| `/tools/index.html` | 4,413 | 138 | index, follow | Tools | WebPage + BreadcrumbList | yes |
| `/updates.html` | 6,387 | 228 | index, follow | Updates | WebPage + BreadcrumbList | yes |
| `/about.html` | 4,243 | 167 | index, follow | About | WebPage + BreadcrumbList | yes |
| `/privacy.html` | 3,941 | 108 | index, follow | Privacy | WebPage + BreadcrumbList | yes |
| `/reference/sources.html` | 4,962 | 183 | **noindex, follow** | Sources | WebPage + BreadcrumbList | yes |
| `/reference/notes/hiring-a-cashier.html` | 6,240 | 324 | **noindex, follow** | Hiring a cashier (note) | WebPage + BreadcrumbList | yes |
| `/404.html` | 3,577 | 83 | **noindex, follow** | Not found | WebPage + BreadcrumbList | yes |

All 15 carry: `<html lang="en">`, one `<h1>`, a meta description, a self-referencing canonical honoured by the
JSON-LD, the footer provenance line, and (where indexable) a sitemap entry. The home page carries the Mac design
modules in order: hero (game name, version badge, search, three CTAs, in-game checkout picture) → shift dashboard
(3 tabs + 3-item checklist) → "What this game is" → popular entities → task grid → archive split with the featured
restocking picture → question cards → latest updates → picture/fact provenance. The player pages contain no
C:\ paths or identifier dumps; the only Windows path on the site is the measured source path on the noindex
`/reference/sources.html` evidence page (deliberate provenance).

The five old evidence-layer addresses (`/collection.html`, `/fields.html`, `/namespaces.html`, `/sources.html`,
`/tool.html`) are intentionally `noindex` stubs whose canonical points at their `/reference/` replacement and which
carry a `meta refresh`; they are not in the sitemap and are not linked from the player layer. This is why a naive
canonical-equals-path audit flags exactly those five pages and nothing else.

## 3. SEO checks

| Check | Result |
| --- | --- |
| `sitemap.xml` lists exactly the indexable set (203) and no noindex/404 | PASS |
| `robots.txt` allows crawling and names the sitemap | PASS |
| Every page has a canonical on the published domain | PASS |
| Every page has a robots directive; player pages `index, follow`, evidence layer `noindex, follow` | PASS |
| Titles unique and non-empty; descriptions unique and non-empty; no title repeats the site name | PASS |
| JSON-LD on every page, parseable, `@context` schema.org, points at the page canonical | PASS (new gate) |
| Open Graph (`og:title/type/site_name/locale/description/url/image`) + Twitter card + theme-color on every page | PASS (new gate) |
| `hreflang` en + x-default, self-referencing, on every page | PASS |
| Player/evidence layer split: no player page links into `/reference/` except the footer | PASS |
| Old evidence addresses consolidated by noindex + canonical | PASS |
| Home-page hero supports the indexed title/intent (player-facing first screen) | PASS |
| No placeholder/"coming soon"/TODO text in visible copy | PASS (smoke + gates) |
| Observations (not failures) | Some category-page meta descriptions are long (the page lists its entries); SERP truncation is cosmetic. Descriptive text is intentionally player-language, so several entries share top-level nouns — titles/descriptions stay unique. |

## 4. Mobile / static checks

| Check | Result |
| --- | --- |
| `<meta name="viewport" content="width=device-width,initial-scale=1">` on every page | PASS (test gate) |
| No fixed inline width > 400 px anywhere | PASS (test gate) |
| Responsive breakpoints at 800 px / 620 px / 460 px (nav stacks, hero 1 column, task grid 2→1, shift tabs scroll, checkboxes full width) | PASS (CSS review) |
| Home hero image and cards use lazy/fixed aspect ratios, no layout-shift-inducing sizing | PASS (width/height attributes, `object-fit`) |
| No third-party fonts, no icon font requests | PASS (no external URLs in CSS/JS) |
| Only `/search.js` is an external script; it is `defer` and same-origin | PASS |
| Inline JS only for the shift dashboard (home) and the category filter; no XHR except same-origin `fetch("/data/fields.json")` | PASS |
| No cookies, no localStorage, no analytics/beacons | PASS (`privacy.html` states it; no such calls in the build) |
| Fully static: no server runtime, no API, no build-time network (only schema.org/@context URL strings) | PASS |
| 404 page exists and is noindex | PASS |
| Pages ≤ 1 MiB; total JS ≈ 3 KB (`search.js` + inline) | PASS |

## 5. AdSense policy pre-checks

The site is **not monetised yet** — no ad code is shipped. That is deliberate: the factory standard says ad slots
must never cover the direct answer and are only worth adding once the site is live and indexed. The policy-relevant
state of the build:

| Check | Result |
| --- | --- |
| About / Contact / Privacy / Terms / Disclaimer pages exist and are reachable | PASS |
| No advertising, tracking, cookie or consent code | PASS |
| No advert disguised as navigation, download button, game button or primary action | PASS (no ads at all; CTAs are site navigation) |
| Original writing, not copied from another wiki; every fact carries a source note; unverifiable numbers are withheld | PASS (content gate + citation check) |
| Game images used only to identify their subject, with recorded provenance/licence status; diagrams labelled as diagrams, never as screenshots | PASS (manifest + review ledger + content gate) |
| No thin pages in the index: 19 picture-less subjects are noindex notes, not filler entries | PASS |
| Content depth: 119 entries + 77 guides + 13 category pages + guide hub, 21/21 coverage columns | PASS |
| Navigation clarity (5 player sections + footer policy links) and 3-click reachability | PASS |
| No auto-refresh/interstitial/forced redirect; the only `meta refresh` is on noindex consolidated stubs | PASS |
| Next step (owner) | Apply to AdSense after the domain is live; then place one non-intrusive unit below the direct answer per template, and re-run the gates. |

## 6. How to reproduce this audit

```sh
node pipeline/site.mjs && node tests/site.test.mjs && node tools/smoke.mjs
# then inspect the artefact:
node -e "…"   # the spot-check walker used for §2 (file walk + canonical/robots/title/description/JSON-LD/image/link checks)
```

The permanent, committed version of these checks is `tests/site.test.mjs` (87 gates) plus
`tools/content-gate.mjs`, `tools/verify-citations.mjs`, `tools/coverage.mjs`, `tools/image-coverage.mjs`,
`tools/classify-urls.mjs`, `tools/preflight.mjs` and `tools/smoke.mjs`.
