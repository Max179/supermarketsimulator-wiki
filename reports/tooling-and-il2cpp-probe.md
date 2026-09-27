# Tooling + IL2CPP probe (read-only, 2026-09-25)

## Route A — reusable parsers already on this machine
| tool | found | path |
|---|---|---|
| **UnityPy** (Python) | **YES** | `C:\Users\CHEN\AppData\Local\Programs\Python\Python312\Lib\site-packages\UnityPy` |
| **AssetRipper** | **YES** | `C:\Users\CHEN\tools\AssetRipper` |
| Il2CppDumper / Cpp2IL / Il2CppInspector / AssetsTools / UABEA / unitypack | no | — |
| node unity parsers in the reference project's node_modules | none | — |
| python | present (`python`) | — |

**Consequence:** the v22 object table does not have to be reverse-engineered from scratch. UnityPy reads SerializedFiles
(including modern versions) and can dump objects; AssetRipper can dump assets, typetrees and IL2CPP. The rule for this
project stands: **reuse the parsing method, never another game's data.**

## Route E — IL2CPP metadata header, version 39 (19,350,248 bytes)
The header is `magic(4) + version(4)` then an ordered list of `(offset:int32, count:int32)` pairs whose **order is
version-dependent**, so each pair was validated against the file size and against the string table rather than assumed.

Measured, validated pairs (first twelve of 24 plausible):

| pair | offset | count | note |
|---|---|---|---|
| 0 | 380 | 89,660 | string literals |
| 1 | 22,415 | 90,040 | **string table** (names) |
| 2 | 828,216 | 22,414 | |
| 3 | 918,256 | 2,865,150 | |
| 4 | 155,359 | 3,783,408 | |
| 6 | 3,797,088 | 615,660 | |
| 8 | 5,105,760 | 159,555 | |
| 9 | 9,518,508 | 48,876 | |
| 12 | 9,833,208 | 1,184,680 | |
| **21** | **14,347,456** | **64,928** | **type/field table candidate — 8/8 name indexes fall inside the string table** |

A first attempt assumed the type table sat at pair index 19 (a common layout for older versions); that pair failed the
name-index test, and pair 21 passed it. 64,928 type definitions is plausible for this title.

## Next steps (each one measurable)
1. **UnityPy**: open `REPO_Data/resources.assets` and TCG's `sharedassets*` with UnityPy, list objects by type, and
   compare its object table (pathIDs, byte ranges) with the v22 header module — that **validates or refutes** the
   candidate layouts on real data instead of by search.
2. Extract MonoBehaviour values for the P0 classes whose field layouts are already known → upgrade
   `confidence: verified-schema` to `extracted` only for values that decode exactly.
3. **IL2CPP**: read the type/field tables at pair 21 and the string table at pair 1 to produce the P0 schema, then
   reuse the already-verified site generator and tests. AssetRipper is the fallback if the minimal reader stalls.
