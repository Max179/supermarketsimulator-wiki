# Harness next action — supermarket-simulator

Updated 2026-10-30 by the Mac integration and the picture replacement/completeness passes. The 2026-10-02
handoff package is now in the real repository, the pictures are sourced in-game pictures with a provenance gate,
and the local gates are green; the publish leg belongs to the Lead.

## State

- Build: `node pipeline/site.mjs` -> **pages=242 indexable=211** (88 gates passing, typecheck exit 0).
- Content: 119 published entries (108 with a sourced in-game picture + 11 noindex notes), 77 guides, 108 mapped
  in-game pictures, 94 diagrams, coverage 21/21 columns.
- Data: `data/normalized/p0-inventory.json` (21,152 types / 170,271 field rows / 15,236 names) plus the derived
  `value-index.json` / `citation-index.json`; the decoded layers and the game package stay on the Windows host.
- Design: Mac design commits ported onto the package generator (player home page, in-game imagery, shift-dashboard
  interactions, source version gate) and extended with JSON-LD / Open Graph / Twitter metadata.
- Evidence: `reports/revival-2026-10-30.md` (assessment, merge, verification), `reports/local-complete.md` (full
  record incl. the Mac section), `reports/quality-audit-2026-10-30.md` (mobile/static/SEO/AdSense checks),
  `reports/verification.md` (the Mac run table), `reports/status.json` (regenerated from this tree).

## Next actions

1. **Lead**: push `main` and let GitHub Actions gate + deploy; then run
   `node tools/smoke.mjs https://supermarketsimulator.wiki` as the post-publish check. Do not edit the workflow
   deploy secrets logic (only the build step changed: it no longer runs the extraction-host
   `schema_to_inventory.mjs`).
2. **Growth/Data (later)**: raise coverage with new entries only when grounded; replace the remaining
   diagram-only subjects with confirmed game pictures one at a time (each needs a manifest record + review verdict);
   swap the remaining clearly-off-subject pictures (four vehicle entries still show the storefront) in a later pack.
3. **Extraction host (later)**: new game build -> re-run the extractors and the derived indexes; type→field
   attribution for IL2CPP v39 remains an open decoder problem (see `docs/data-pipeline.md`).
4. **AdSense**: after the site is live and indexed, apply and place non-intrusive units below direct answers; keep
   the gates green (no ads in the first screen).

Unknown numeric fields stay unknown. Parser failures must not block scaffold/build/SEO/tests/commit.
Commit milestones. Deploy only after local gates pass.
