# Verification record — Mac integration (2026-10-30)

Recorded from a full local run on the integrated tree. Every line below was produced by the command above it;
status is machine-readable in `reports/status.json`, which a gate compares against a fresh build (a stale status
file fails the suite). The extraction-host (Windows) verification history is in `reports/local-complete.md`; this
file records the Mac-side verification of the delivered tree.

| Item | Value |
| --- | --- |
| Verified on | 2026-10-30, macOS, Node 22.23.2 / npm 10.9.8, TypeScript 5.9.3 |
| Build | `[site] pages=242 indexable=203 assets=261 mappedGameImages=164 gameClasses=11275 engineClasses=9877 out=web/dist` |
| Site gates | `[site-tests] 87 passed, 0 failed` |
| Typecheck | `npx tsc --noEmit -p tsconfig.ci.json` exit 0 |
| Preflight | `[preflight] 11 ok, 0 failed` exit 0 |
| Content gate | `119 entry file(s), 0 violation(s)` exit 0 |
| Citation check | `entries=119 facts=941 distinctIdentifiers=1184 universe=43532 unmatched=0` exit 0 |
| Coverage matrix | `columns=21 covered=21 published=119 draft=0 reference=0 absent=0 qualityFailures=0` exit 0 |
| Image coverage | `entries=119 withGameImage=100 diagramOnly=19 manifestRecords=164 unusedRecords=0` exit 0 |
| URL classification | `203 keep, 31 noindex, 0 redirect(s)` exit 0 |
| Smoke | `203 kept, 31 noindex`; artefact passes exit 0 |
| Deploy check | `8 ready, 0 local failure(s), 2 external blocker(s)` exit 0 |
| Decoded value layer | 170,050 rows via `data/normalized/value-index.json` (sha256 `361f8a8e…`, derived from the extraction host's 5,461,188 B row table) |
| Tracked tree | 600+ files: 0 raw game packages, 0 build output, 0 game files needed |

## Commands (the exact local chain)

```sh
node pipeline/site.mjs                          # build: pages=242 indexable=203
node tests/site.test.mjs                        # 87 gates
npx tsc --noEmit -p tsconfig.ci.json            # typecheck (npm install once for typescript/@types/node)
node tools/content-gate.mjs                     # content model
node tools/verify-citations.mjs                 # every cited identifier exists
node tools/coverage.mjs                         # coverage matrix (writes reports/coverage-report.md)
node tools/image-coverage.mjs                   # image tiers (writes reports/image-coverage.md)
node tools/classify-urls.mjs                    # refresh config/urls.json from a full build
node tools/preflight.mjs                        # publish checklist (needs a clean tree)
node tools/smoke.mjs                            # the built artefact, the way a reader arrives at it
node tools/deploy-check.mjs                     # local readiness + external blockers
git status --porcelain                          # must print nothing
```

After publishing, the live check is:

```sh
node tools/smoke.mjs https://supermarketsimulator.wiki
```

## Handoff boundary

- **In Git**: `content/`, `data/` (normalized index + guide questions), `pipeline/` (generator, status,
  extraction tooling), `tests/`, `tools/`, `config/`, `docs/`, `reports/`, `web/assets/`,
  `package.json`, `README.md`, `tsconfig*.json`, `wrangler.toml`, `.github/workflows/publish.yml`.
- **Not in Git**: `data/raw/**` (game packages), `web/dist/**` (build output), `node_modules/**`, and the
  extraction host's decoded layers (`p0-schema.json`, `p0-field-rows.json`, localization tables) which are
  replaced by the derived `value-index.json` / `citation-index.json`.
- **Not reproducible on a Mac clone**: re-extraction from the game. The committed normalized index is the build
  input; see `docs/data-pipeline.md`.

## Not done (external, by design)

- **Not pushed and not deployed from this Mac.** The Lead owns the publish leg. The workflow's gate job builds
  and gates, the deploy job (`needs: gate`) runs preflight + smoke and uploads `web/dist` to Cloudflare Pages
  project `supermarketsimulator-wiki` with the repository secrets. The custom domain is bound in the dashboard.
- **No newer game build extracted**: the site documents `1.6.0 (223)` until a new package is produced on the
  Windows extraction host.
- **Type→field attribution** remains unmeasured for IL2CPP v39 (documented ceiling, see `docs/data-pipeline.md`).
