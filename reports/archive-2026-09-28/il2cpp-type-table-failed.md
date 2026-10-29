# IL2CPP v39 type table: two search campaigns failed (2026-09-25)

Tooling reality measured on this machine:
| tool | state |
|---|---|
| **AssetRipper** | present but **GUI-only** (`AssetRipper.GUI.Free.exe`, 124 MB). No CLI/Console build in the folder. |
| **dotnet** | **not on PATH** (so neither AssetRipper's CLI nor a self-built C# tool can be invoked headlessly here) |
| Il2CppDumper / Cpp2IL / Il2CppInspector | not installed |

## Campaign 1 — single-index test at a fixed offset (retracted)
`pair[21]` at offset 14,347,456, count 64,928, assumed stride 32: "8/8 name indexes inside the string table".
**Not evidence** — a wrong stride satisfies it by chance. Retracted in `reports/il2cpp-pair21-retracted.md`.

## Campaign 2 — stride measured, then two-index test over every pair
- Strides {80,84,88,92,96,100,104,108,112}: best agreement **0.003** (noise). No type table.
- Then, over **all 31 header pairs × strides {80,84,88,92,96,100,104,108,112,120,128}**, each candidate was
  scored on 1,500 consecutive entries requiring **both** the name index and the namespace index to resolve to
  plausible strings (empty namespace allowed):

```
candidates with a high name or namespace rate: 0
no pair/stride passed the stronger two-index test -> type table still not located
```

## Conclusion
Hand-rolling the IL2CPP v39 type table has failed twice with progressively stronger tests. Facts that still stand:
magic `0xFAB11BAF`, version **39**, string table at pair 1 (22,415 / 90,040), string-literal table at pair 0.
**No P0 schema, therefore no Supermarket site** — the site is not generated from unverifiable data.

## Unblocking options (one of these, both outside my hands)
1. **Run AssetRipper's GUI once** (it is already installed): open `C:\Users\CHEN\tools\AssetRipper\AssetRipper.GUI.Free.exe`,
   add the folder `...\Supermarket Simulator_Data`, choose Export → "Dump" (IL2CPP) into
   `C:\Users\CHEN\Desktop\supermarket-simulator\data\raw\il2cpp-dump`, then I can read the dumped
   `*.json`/`DummyDll` types immediately.
2. **Permit installing `Il2CppDumper`** (single self-contained binary): then the type table is produced without the GUI.

Until one of those happens, Supermarket Simulator is **blocked on IL2CPP tooling**, not on my code: the header, the
string tables and the version are all measured, and every failure above is recorded with its command and output.
