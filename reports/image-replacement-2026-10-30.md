# Image replacement — supermarketsimulator.wiki, 2026-10-30

**Why.** The build shipped 164 raw Unity texture exports as the pictures on entry pages: UI atlases, white-on-black
icon sheets, grey placeholders and ground textures. They read as broken pictures rather than pictures of the game, and
they claimed an origin ("the colour texture the game ships") that a player cannot use. The Lead built a sourcing
pipeline for in-game pictures (official Steam store screenshots and files from the game's community wikis on Fandom)
and delivered a frozen pack at `/tmp/imgpack-supermarket-simulator`; this record covers the integration of that pack.

## What changed

| Item | Before | After |
| --- | --- | --- |
| Mapped pictures in `content/assets/mapped/` | 164 raw texture exports (89 jpg, 75 png) | 100 sourced in-game pictures (jpg, 1200x750), all old files deleted |
| `content/images-manifest.json` | 164 records with source bundle + asset name only — no page, date or rights review | 100 records, each with `sourceName`, `sourcePage`, `originalUrl`, `license`, `rightsReview`, `retrievedAt`, `verdict`, `reviewer`, `reviewDate`, width/height/bytes/sha256 |
| `content/published/` | 100 entries carried old texture pictures | the same 100 entries carry the new picture first, with their original diagrams kept; the 19 diagram-only entries are untouched |
| Home page hero / featured | mapped textures | `web/assets/hero-shop.jpg` (251619 B, sha256 `9678855c…`) and `web/assets/featured-card.jpg` (308028 B, sha256 `d39a16fa…`), official store screenshots |
| `/reference/sources.html` | asset-name provenance only | a build-generated **Picture sources** table: one row per manifest record with file, entry, source site, source-page link, rights review and retrieval date |
| `/disclaimer` and README | claimed pictures were taken from a local copy of the game | say pictures are in-game pictures from the official store page and community wikis, credited, used only to identify, and owned by the developer/uploaders |
| Tests | 87 gates | 88 gates: the new picture-provenance gate fails on a record without `sourceName`/`sourcePage`/`retrievedAt`/rights review, on a non-absolute `sourcePage`, or on a record missing from the sources page |

Pack bookkeeping copied unchanged into the tree: `reports/image-sources.md`, `reports/image-reviews.md` (a verdict row
for each of the 100 mapped files) and the pack instruction record as `reports/image-pack-2026-10-30.json`. The pack's
provenance fields were not edited. `reports/image-sanity.md` and `reports/image-coverage.md` were regenerated from the
new manifest (100 records, 0 flagged; 100 used, 0 unused).

## Source breakdown (from `content/images-manifest.json`)

- 100 mapped pictures, 48 unique pictures (52 records reuse a picture; 13 shared groups of 2–7 entries).
- **61 from the Supermarket Simulator Wiki (Fandom)** — source pages on `supermarket-simulator.fandom.com` (e.g.
  `/wiki/FAQ`, `/wiki/First_Steps`, `/wiki/Market`), `rightsReview: fair_use_review`, licence "Fandom wiki file —
  fair-use review recorded (no licence template on the file page)".
- **39 from the Steam store page (official)** — the files are official store screenshots on `shared.akamai.steamstatic.com`;
  licence "Developer promotional screenshot — identification use, fair-use review recorded".
- Home page: `hero-shop.jpg` and `featured-card.jpg` are cropped official store screenshots; their source page,
  original URL, rights review and retrieval date are in `reports/image-pack-2026-10-30.json`.
- Diagrams: 94 original SVGs are unchanged and every one that a page shows still carries its "not a screenshot" label.

## Exact commands and results (macOS, 2026-10-30)

```
python3 tools/image-sanity.py       -> [image-sanity] 100 records, 0 flagged                        exit 0
node tools/image-coverage.mjs       -> entries=119 withGameImage=100 diagramOnly=19
                                       manifestRecords=100 unusedRecords=0                          exit 0
node pipeline/site.mjs              -> [site] pages=242 indexable=203 assets=199
                                       mappedGameImages=100 gameClasses=11275 engineClasses=9877   exit 0
node tests/site.test.mjs            -> [site-tests] 88 passed, 0 failed                             exit 0
npx tsc --noEmit -p tsconfig.ci.json-> (TypeScript 5.9.3, no output)                                exit 0
node tools/content-gate.mjs         -> [content-gate] 119 entry file(s), 0 violation(s)             exit 0
node tools/verify-citations.mjs     -> entries=119 facts=941 distinctIdentifiers=1184
                                       universe=43532 confirmedElsewhere=43 unmatched=0             exit 0
node tools/coverage.mjs             -> columns=21 covered=21 published=119 draft=0 reference=0
                                       absent=0 qualityFailures=0                                   exit 0
node tools/classify-urls.mjs        -> [classify] 203 keep, 31 noindex, 0 redirect(s)               exit 0
node tools/preflight.mjs            -> [preflight] 11 ok, 0 failed                                   exit 0
node tools/smoke.mjs                -> [smoke] 203 kept, 31 noindex, artefact in web/dist; pass     exit 0
```

Build counts are unchanged from the pre-pack tree: **242 pages / 203 indexable**, 39 noindex. The only asset-count
change is the picture set itself (164 mapped textures -> 100 mapped pictures).

## Known follow-up (reported to the Lead, not hidden)

The mix is honest but not yet all on-subject. Two pack-level defects are recorded here for the next pack revision:

1. **Wrong-subject pictures (46 entries).** Many Fandom-sourced images are item renders (book covers, coins, beer
   bottles/kegs) or generic store screenshots attached to system-level entries, and the 13 reused pictures are spread
   across categories rather than confined to the entry's own category. Examples: `the-vehicles-you-can-use` (beer
   bottle), `the-shop-entrance` (quarter coin), `how-a-vehicle-drives` (storefront), `playing-with-a-controller`
   (cashier at the register), `the-meat-and-dairy-section` (storefront). The full list of entry ids was sent to the
   Lead; each is a picture swap, not a provenance edit.
2. **Source-page attribution for the 39 Steam records.** `sourceName` says "Steam store page (official)" but
   `sourcePage` is the third-party article the screenshot was indexed from (`gamertweak.com`, `steamreviews.info`,
   `playdanji.com`, `instant-gaming.com`, `games-stats.com`, `nexusmods.com`). The files themselves are official
   store screenshots; either `sourcePage` should be `https://store.steampowered.com/app/2670630/` or `sourceName`
   should name the actual page. The sources page currently shows the page as recorded, so a reader can see both.
3. The four pictures taken from the wiki's `FAQ Banner.jpg` carry a large "Frequently Asked Questions" banner across
   the image (`barcodes-and-the-scanner`, `checkout-and-cashiers`, `paper-bags-and-packing-a-purchase`,
   `questions-players-ask`); `how-products-are-displayed` is an upscaled small file. Both are quality, not provenance.
