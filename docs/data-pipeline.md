# Data pipeline — how the normalized index was produced

This document records where the numbers the site prints come from and why they are not reproducible on a clean Mac
clone. The extraction host was a Windows machine with the installed game; the Mac side (and CI) consume only the
committed normalized index.

## Primary source

| Item | Value |
| --- | --- |
| Game | Supermarket Simulator, documented build **1.6.0 (223)** |
| Install path (extraction host) | `C:\uTorria\Downloads\Supermarket Simulator (2025)\Supermarket Simulator` |
| File read | `Supermarket Simulator_Data\il2cpp_data\Metadata\global-metadata.dat` |
| Bytes | 19,350,248 |
| sha256 | `acac0e03010dc02a976b8aafe2d8ec915e902c3681f43ab5bf82028f9bb6c4e0` |
| Metadata version | 39 (sanity `0xfab11baf`) |
| String pool | offset 918,256, size 2,865,150 |
| Type table | offset 15,573,600, 21,152 entries, stride 82, name index at +0 |
| Field table | offset 11,105,620, 170,271 rows, stride 12, name index at +0 (next table starts at 13,148,872 — exact stitching) |
| Product label | `Nokta Games | Supermarket Simulator` (`_Data/app.info`; not a version) |
| Version | `1.6.0 (223)` — the string the game itself stores (player settings / its own data asset), not the product label |

Every extractor self-checks its anchors (sanity, metadata version, string-pool anchors, the type-table tail sentinel at
`15,573,600 + 21,151 × 82`) and asserts before writing anything, so a partial or shifted file is never emitted.

## What is committed, and what stays behind

Committed (the build input):

| File | Bytes | What it is |
| --- | --- | --- |
| `data/normalized/p0-inventory.json` | 3,213,803 | 21,152 types (11,275 game / 9,877 engine/vendor), 474 namespaces + 8,572 global, 170,271 field rows / 15,236 distinct names, all name-confident. The build reads this file only. |
| `data/normalized/supermarket-object-names.json` | 248,871 | Identifiers read from the serialized asset tables; feeds the citation check. |
| `data/normalized/value-index.json` | 1,233 | Checksum and counts of the decoded field-row table: 170,050 rows, sha256 `361f8a8e…`, 5,461,188 B, plus the field-table geometry. |
| `data/normalized/citation-index.json` | 294,793 | The 15,162 identifiers that exist only in the decoded layers, with both decoded files' byte sizes/sha256, documented version and the 43,532-name universe digest (`40736dd3…`). |
| `data/guide-questions.json` | 6,960 | The player question that pairs with each of the 77 guides. |
| `content/images-manifest.json` + `content/assets/` | — | 164 mapped game images (16,035,526 B) + 94 original diagrams, each with provenance and an eyeballed verdict. |

Stays on the extraction host (tracked in the Windows repository history, deliberately not carried to the Mac tree):

| File | Bytes | Replacement on this tree |
| --- | --- | --- |
| `data/normalized/p0-field-rows.json` | 5,461,188 | `value-index.json` (checksum + counts) |
| `data/normalized/p0-schema.json` | 3,251,751 | none needed: `p0-inventory.json` is the derived build input |
| 20 localization tables | 931,720 | no build step, gate or test reads them; the four shipped strings the entries cite are recorded in `tools/verify-citations.mjs` |
| `web/dist/` | ~18.9 MB | rebuilt by `node pipeline/site.mjs` |

The stale Sep-28 copies of `p0-schema.json` / `p0-field-rows.json` were removed from this tree on 2026-10-30
(they remain in git history, commit `1d5735f`); the Oct-2 package's derived indexes are newer and are the intended
light-tree inputs.

## Pipeline steps

Extraction host only (needs `data/normalized/p0-schema.json` + `p0-field-rows.json`):

```sh
node pipeline/schema_to_inventory.mjs   # decoded type schema -> p0-inventory.json
node pipeline/value_index.mjs           # decoded rows -> value-index.json
node pipeline/citation_index.mjs        # both decoded layers -> citation-index.json
node tools/mac-package.mjs . out/       # rebuild the lightweight handoff package
```

Extraction scripts (Python 3.12, UnityPy where noted) live in `pipeline/`:
`il2cpp_*.py` (self-consistency probes that located the type/field tables), `unitypy_*.py` (asset-table reads),
`measure_builtins.ts` / `decode_values2.ts` / `mono-values.ts` (value-layer probes),
`tools/extract-images.py` and `tools/extract-localization.py` (asset export). Their Windows-path provenance is kept
in `reports/archive-2026-09-28/` and in the handoff report.

Mac/CI (the committed tree, no game files, no network):

```sh
node pipeline/site.mjs                  # build web/dist
node tests/site.test.mjs                # site gates
node tools/verify-citations.mjs         # every cited identifier exists
node tools/preflight.mjs                # publish checklist
```

## The one open decoder gap

IL2CPP v39's **type→field attribution** has not been measured. The 82-byte type record holds no monotone field
pointer, no member whose value equals the field count, and no adjacent-difference structure (v10–v15 probes, all
recorded in the archived reports). The site therefore cites type names and asset names — never "this field belongs
to that class" — and publishes the 15,236 field names as their own block with an explicit
`classAttribution.status = "not-attributed"`. That is honest under-reporting, not missing writing.

Next candidates if the attribution is ever needed: locate the `Il2CppType` table, or disassemble the metadata access
functions in `GameAssembly.dll` (no dotnet / Il2CppDumper was available on the extraction host).
