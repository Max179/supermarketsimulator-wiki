# Mac handoff — supermarketsimulator.wiki

Source-only handoff. This file is the checklist for the Mac side; everything in it was produced and verified on the
Windows machine that read the game files. Raw game packages are **not** included and are not needed.

## What to clone

Two ways to move this tree to the Mac side:

1. **The lightweight package** (recommended). `node tools/mac-package.mjs . <outDir>` writes the whole site — source,
   content, images, the small data indexes and the live reports — with **no git history**, no `web/dist`, no decoded
   layers and no report history. Its receipt is `reports/mac-handoff-manifest.json`: every kept file with its byte
   size and sha256, every excluded path with the reason it was excluded, and the totals.
2. The repository as committed, if a full clone with history is wanted. The decoded layers are tracked there and are
   not needed to build; they are the raw extraction output that stays on the Windows host.

## The package, measured

536 files, 21,267,029 bytes (20.2 MiB) when this file was last built. Rebuilding the package after any edit to this
file moves the total by the size of that edit, so `reports/mac-handoff-manifest.json` inside the package is the
authoritative list; the summary below is the measurement.

| Group | Files | Bytes | What it is |
| --- | --- | --- | --- |
| images | 258 | 16,217,627 | 164 mapped game images (16,035,526 B) + 94 per-entry diagrams in `content/assets/*.svg` (182,101 B) |
| data | 5 | 3,765,660 | `p0-inventory.json` 3,213,803, `supermarket-object-names.json` 248,871, `citation-index.json` 294,793, `guide-questions.json` 6,960, `value-index.json` 1,233 |
| published | 119 | 513,302 | the entry JSON, one file per published subject |
| articles | 77 | 217,348 | the structured guide JSON, one file per guide |
| source | 58 | 362,175 | `pipeline/`, `tools/`, `tests/`, `config/`, `docs/`, `.github/` |
| reports | 7 | 102,850 | `handoff.md` (this file), `status.json`, `coverage-report.md`, `image-coverage.md`, `image-sanity.md`, `image-reviews.md`, and the compact `local-complete.md` |
| content root | 3 | 82,961 | `content/images-manifest.json` 77,595, `content/updates.json` 2,286, `content/README.md` |
| shell | 9 | 5,106 | `web/assets/*` (favicon, hero, guide-flow, README) and the five root config files |

The four files that move most often, with the hash that identifies them:

| File | Bytes | sha256 |
| --- | --- | --- |
| `content/images-manifest.json` | 77,595 | `97a224834ebd198bc4ffb2250f260eb3616892e4d3afeb471869f62b172d26a2` |
| `config/urls.json` | 38,031 | `31a6607f1ba9998d6c4174596068f645ee974bb1a7aa0dca5aebd46889b4d70` |
| `content/updates.json` | 2,286 | `dfecb87715784ad4543dde2d0839c5e1132cd299fedfacdb43d45b153d6addcb` |
| `data/guide-questions.json` | 6,960 | `e7bdc405fb9337a35333bbd29f4bff2bb5ac55ae08cc46d86d29cffa4f777c5e` |

Whole-group digests, each a sha256 over the sorted lines `path TAB bytes TAB sha256`:

- mapped game images (164): `e7db9c4a9a0ec99bb49f515ab1130fedd122d509c791c5d86648542f46c65ef8`
- all images including diagrams (258): `027eb979b2f69bbc2cb27d01efd21e718c74ebeed6b1006eb05f342d9e2c231b`
- published entries (119): `9c4532a3a433890ae3597615741ac7bf871e1f985d577f1626475dbc99841957`
- guide JSON (77): `0ca561efde432e4163655ec9b9b48d6af7da6a96a96cb121fa71da9faf4f9868`

## What stays on the extraction host, and what replaces it

| Stays on Windows | Bytes | Replaced by |
| --- | --- | --- |
| `data/normalized/p0-field-rows.json` (decoded row table) | 5,461,188 | `data/normalized/value-index.json` 1,233 B — the sha256 of the rows file, its row count (170,050), field count (170,271) and version, read by `pipeline/status.mjs` and `tools/preflight.mjs` |
| `data/normalized/p0-schema.json` (decoded type schema) | 3,251,751 | nothing to replace: `data/normalized/p0-inventory.json` (3,213,803 B, committed) is the derived index the build already consumes |
| 20 `data/normalized/localization-*.json` tables | 931,720 | nothing: no build step, gate or test reads them; the four shipped strings the entries cite are recorded in `tools/verify-citations.mjs` |
| decoded names the layers contributed to the citation universe | — | `data/normalized/citation-index.json` 294,793 B — the 15,162 identifiers only those layers hold, with their provenance: both decoded files with byte size and sha256, the documented version, and a digest of the whole 43,532-name universe (`40736dd3d15a…`), so `tools/verify-citations.mjs` checks the same universe on a light tree |
| `web/dist/` | 18,856,111 (on the host) | the build: run `node pipeline/site.mjs` after unpacking |
| extraction-side working reports | 62,588 | the live report set listed above |
| `reports/redesign-p0/*.png` screenshots of the built site | 1,070,100 | the site rebuilds them |
| `HARNESS-NEXT-ACTION.md` (process note) | 1,429 | not site content |
| `.git` | — | the package ships without history |

`pipeline/value_index.mjs` and `pipeline/citation_index.mjs` produce the two indexes and refuse to run without the
decoded layers, so they are extraction-host steps, not Mac steps. Nothing in the package says a number it cannot
back: `reports/status.json` in the package records the value layer as `derived: true` with the index it came from.

The citation index is load-bearing, and that was measured rather than assumed. In a copy of the package with
`data/normalized/citation-index.json` moved aside, `node tools/verify-citations.mjs` exits 1 and lists 83 names —
among them `currentDiscount`, `discountRate` and `bulkDiscountRatio` from the wholesale-offers entry, which exist
only in the decoded layers. Put back, the same command exits 0 with 43,532 names and 0 unmatched. That is why the
index travels with its provenance (both decoded files with byte size and sha256, version 1.6.0 (223), and the
universe digest) instead of the payload travelling with the site.

## Design-owned files: merge, do not overwrite

The Mac design integration (commit `efb7b6b`) owns the page shell. In the package those files are the Windows
copies and a blind `rsync` would take the design back:

- `pipeline/site.mjs` — the whole layout and style: `layout()` from line 104, the emitted `brand.svg` at line 453,
  the emitted `style.css` from line 455, and the `SITE` block (`accent`, `tagline`, `versionBadge`) at line 15.
- `web/assets/favicon.svg`, `web/assets/hero.svg`, `web/assets/guide-flow.svg`.

Content-owned and safe to take as-is: `content/published/*.json`, `content/articles/*.json`,
`content/images-manifest.json`, `content/updates.json`, `content/assets/*` (the mapped game images and the 94
per-entry diagrams), `data/*`, `config/urls.json`, `tools/*`, `tests/*`, `pipeline/*` other than `site.mjs`.

## What the Mac side needs from this tree

- `config/urls.json` — the keep/noindex split the classifier writes;
- `content/images-manifest.json` — every mapped game image with its source bundle, size and hash;
- `content/updates.json` — the rows behind `/updates.html`;
- `data/guide-questions.json` — the player questions that pair one-to-one with the guides;
- `data/normalized/value-index.json` and `data/normalized/citation-index.json` — the derived indexes above;
- `reports/status.json` — the machine-readable counts the preflight checks;
- `reports/coverage-report.md`, `reports/image-coverage.md`, `reports/image-sanity.md`, `reports/image-reviews.md` — the gates' own output, including the verdict on every image;
- `reports/handoff.md` (this file) and `reports/local-complete.md` (the compact copy; the full round-by-round log stays on the extraction host);
- `reports/mac-handoff-manifest.json` — the package receipt (per-file size and sha256, exclusions, totals).

Nothing in the tree is generated at publish time that is not committed or in the package.

## How to build and verify

On the Mac side, from the package root (no game package needed, no decoded layers needed):

    node pipeline/site.mjs                                   # production build into web/dist
    node tests/site.test.mjs                                 # 86 gates
    node tools/verify-citations.mjs                          # every cited identifier exists in the build
    node <22>/node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
    node tools/content-gate.mjs                               # content model: entries and articles
    node tools/classify-urls.mjs                              # refresh config/urls.json
    node tools/preflight.mjs                                  # clean tree, status consistency, deploy gating
    node tools/smoke.mjs                                      # the built artefact, the way a reader arrives at it
    node tools/smoke.mjs https://<domain>                      # after publishing: every kept URL, live
    node tools/deploy-check.mjs                               # local readiness vs external blockers

Extraction host only, never needed on the Mac:

    node pipeline/schema_to_inventory.mjs                     # rebuild p0-inventory.json from the decoded schema
    node pipeline/value_index.mjs                             # rebuild the value index from the decoded rows
    node pipeline/citation_index.mjs                          # rebuild the citation index from both decoded layers
    node tools/mac-package.mjs . <outDir>                     # rebuild this package

If a tree does carry the decoded layers, nothing changes: `pipeline/status.mjs` records the rows file itself and
`tools/verify-citations.mjs` adds the layers to the universe, so both paths are the same checks with the same result.

Re-verified on 2026-10-01 (round 572): the package was unpacked outside the repositories, committed in a scratch git
repository and put through the full thirteen-step runner. All thirteen exited 0 — preflight 11/11, site pages=242
indexable=203, classify 203 keep / 31 noindex, verify entries=119 facts=941 universe=43,532 unmatched=0, gate 119
entries 0 violations, coverage 21/21, image coverage 164 records 0 unused, image sanity 164 records, status recorded
from the value index, tests 86 passing, typecheck exit 0, smoke passed, deploy-check 7 ready / 0 local failures /
3 external blockers (a package carries no remote, so it adds the git-remote blocker to the two Cloudflare secrets).
The same build, gates, typecheck and preflight results reproduce without any game package, without the decoded
layers and without `web/dist`.

## What the site contains (measured at this commit, see reports/status.json)

- Published subjects: 119 — 100 entities with a confirmed game picture under `/entries/`, 19 picture-less subjects kept as noindex notes under `/reference/notes/`; structured guides: 77.
- Real images extracted from the game with a recorded mapping: 164 records. 100 entities carry one; the other 19 subjects are notes and are labelled "no confirmed picture from the game yet". A diagram is never passed off as a screenshot. Per-entry origin is in reports/image-coverage.md.
- Every one of those 164 records has been opened by eye and carries a verdict in `reports/image-reviews.md`, and `tests/site.test.mjs` fails the build if a record is ever added without one. A picture that turns out near-blank, or that shows something other than what the note claims, is rejected and its mapping removed before it reaches the site.
- How transparent art is judged matters: white art on a transparent field looks blank to any viewer that flattens alpha onto white, so `tools/image-sanity.py` composites on the `#0f1116` background the site draws pictures on before it flags a file, and a flagged file still has to be opened and given a verdict. A JPEG mapping is the exception it cannot fix, because a JPEG carries no alpha; every JPEG mapping on this site was opened as the page receives it and reads, so the stored plate colour is cosmetic rather than a correctness problem.
- Build: `pages=242 indexable=203` (39 noindex). URL classification in `config/urls.json`: 203 keep, 31 noindex (the remaining noindex pages are the evidence layer's own tables, which the classifier does not track). The evidence layer lives under `/reference/`; the old top-level addresses are noindex stubs that point there. The player layer is the home page, the game guide, `/entities/` and its 13 category pages, 100 entry pages, 77 guides, `/tools/` and `/updates.html`; the evidence layer is `/reference/` plus the notes.
- Gates: 86 passing, 0 failing. Content gate: 119 entries and 77 articles, 0 violations. Typecheck: exit 0. Preflight: 11/11 on a clean tree.
- Coverage matrix: **21** target columns, **all 21** holding at least one published entry, with no draft folder content. A multiplayer column was added for this title: the game is networked throughout (a lobby and rooms, shared money, networked staff, customers, checkout, furniture and vehicles) and the original column list had nowhere to file it.
- Evidence level: this build's metadata (v39, stride 82) does not allow type-to-field attribution (`fieldsStatus: not-attributed`), so entries here cite type names and asset names rather than individual values. This is the ceiling for this title, not a gap in the writing.
- Technical reference is reachable from every page but marked `noindex` and excluded from `sitemap.xml`.

## Publishing (not done, and why)

`publish.yml` runs the build, the gates, the typecheck and the preflight, then a `needs: gate` job uploads `web/dist`
to Cloudflare Pages with `secrets.CLOUDFLARE_API_TOKEN` / `secrets.CLOUDFLARE_ACCOUNT_ID`. Publishing needs:
1. a git remote and push credentials (none is configured on the Windows machine);
2. the two Cloudflare secrets;
3. binding supermarketsimulator.wiki to the Pages project in the Cloudflare dashboard (deliberately not encoded in the repository).

`node tools/deploy-check.mjs` prints exactly these as external blockers and reports 0 local failures.

## Content breadth at handoff

- Categories covered: Finance, Checkout, Shop, Customers, Staff, Layout, Products, Loans, Shelf and stock, Pricing, Storage, Upgrades.
- Every entry carries facts with grounding, a labelled diagram and/or a game image recorded in
  `content/images-manifest.json`, related links and sources. Numbers this project could not verify are explicitly
  withheld in the entry rather than estimated.
