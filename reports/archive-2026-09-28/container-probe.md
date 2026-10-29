# Supermarket Simulator — container probe (read-only, 2026-09-25)

| file | note |
|---|---|
| `resources.assets` (384.7 MB) | header begins `0,0,22,0,0,…` |
| `sharedassets2.assets` (97.9 MB) | same generation |
| `level2` / `level3` | same generation |

**v22 (Unity 6 generation)** — the same container generation as TCG Card Shop Simulator and R.E.P.O. The reference
SerializedFile parser (Unity 2019.4 / v21) refuses these by its own self-check, so **instance values are unknown**
until the container parser is extended to v22.

**This title's P0 schema route is IL2CPP**: there is no `Assembly-CSharp.dll`; field layouts live in
`il2cpp_data/Metadata/global-metadata.dat` (18.45 MB, `Il2CppGlobalMetadataHeader` format), which the pipeline does
not read yet. Until it does, no verifiable P0 schema exists for this title, and **no site was generated** — pages are
not padded with unverifiable data.
