# Mac integration plan — 2026-10-30 (supermarket-dev)

Goal: land the 2026-10-02 Windows handoff package (242 pages / 203 indexable / 457 content files) in
`supermarket-simulator` on top of the Mac design commits, and make the whole chain reproducible here.

## Sources of truth
- Handoff package: `/Users/carl/dsh-handoff-incoming/supermarket-simulator-mac.tar.gz`
  (sha256 `9581c004…` verified; extracted to `/tmp/sm_pkg`, 536 files / 21,267,029 B).
  Its `reports/mac-handoff-manifest.json` is the per-file receipt.
- Mac design work: commits `e35ab15` (player home page), `dd15c32` (source version gate),
  `8984f06` (verified in-game home imagery), `efb7b6b` (shift dashboard interactions).
- Repo history stays intact; `HARNESS-NEXT-ACTION.md` stays.

## Decisions
1. **Generator**: take the package `pipeline/site.mjs` (242-page player/evidence architecture) as the base and port
   the Mac design **onto** it; never restore the 20-page thin generator.
2. **Design-owned shell**: keep the package layout/routes, apply the Mac home-page design on top of it:
   hero with the verified in-game checkout picture, the interactive shift dashboard (tabs + checklist), the
   "what are you trying to do" task grid, the archive split with the featured restocking picture, the Mac design
   tokens (dark green surface, lime accent, warm grey) and the Mac source-version line on `/reference/sources.html`.
   Mac `web/assets/hero-checkout.png` / `featured-restocking.png` are byte-identical to the package's
   `content/assets/mapped/checkout-and-cashiers-selfcheckout.png` / `mapped/restocking-shelves-shelf.png`
   (sha256 verified), so the port references the mapped images (single provenance source, no duplicates).
3. **Data boundary**: this is the Mac light tree. The Windows-only decoded layers
   (`p0-schema.json`, `p0-field-rows.json`, localization tables, `schema_to_inventory.mjs`, `value_index.mjs`,
   `citation_index.mjs`, `mac-package.mjs`, `extract-*.py`) stay on the extraction host; the derived
   `value-index.json` / `citation-index.json` carry their counts and checksums and are the Mac inputs.
   The stale Sep-28 decoded copies currently in HEAD are removed from the tree (they remain in git history).
4. **Build commands (Mac/CI)**: `node pipeline/site.mjs` is the only build step. The workflow's
   `node pipeline/schema_to_inventory.mjs &&` prefix is removed — it cannot run without the decoded schema and is
   an extraction-host step. Cloudflare Pages project name `supermarketsimulator-wiki` is unchanged.
5. **Portable tooling**: add `package.json` + `README.md` modelled on the sibling `repo/` conventions; drop the
   Windows `C:\` `typeRoots` from `tsconfig.json`; typecheck runs the committed `tsconfig.ci.json` with
   `typescript@5` + `@types/node@22` (dev only).
6. **SEO hardening**: the package layout ships no JSON-LD and a partial Open Graph block. Add parseable JSON-LD
   (WebSite/WebPage/Article + BreadcrumbList), the complete OG block, Twitter card and theme-color, and gate them
   in the test suite (the factory standard asks for them on every site).

## Steps
1. Commit this plan.
2. Import package tree: `content/`, `config/`, `data/`, `docs/`, `pipeline/` (except the merged `site.mjs`),
   `tools/`, `tests/`, `web/`, reports evidence; keep repo `HARNESS-NEXT-ACTION.md`.
3. Retire the stale decoded layers; refresh root configs, `package.json`, `README.md`, `docs/data-pipeline.md`;
   reconcile `.github/workflows/publish.yml`.
4. Port the Mac design into `pipeline/site.mjs`; add JSON-LD/OG/Twitter; re-run everything.
5. Regenerate `reports/status.json` and the gate-written reports; add the Mac section to
   `reports/local-complete.md` and the full `reports/revival-2026-10-30.md`; refresh `HARNESS-NEXT-ACTION.md`.
6. Commit in small `type(scope): subject` commits, leave the tree clean, report numbers to the Lead.

## Acceptance
- build `pages=242 indexable=203`; 86 package gates (+ Mac additions) pass; typecheck, preflight, citations,
  content gate, coverage, image coverage, classify, smoke, deploy-check all exit 0.
- no `C:\` path needed at build/test time, no game files, no network.
- `reports/status.json` current, `reports/local-complete.md` Mac section, `reports/revival-2026-10-30.md`,
  clean working tree, local commits only (no push, no deploy).
