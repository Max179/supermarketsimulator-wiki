# IL2CPP type table: my pair-21 claim is RETRACTED (2026-09-25)

## What I claimed earlier
In `reports/tooling-and-il2cpp-probe.md` I wrote that the type/field table was a candidate at **pair 21**
(offset 14,347,456, count 64,928) because "8/8 name indexes fall inside the string table". That test was **not
evidence**: it used an assumed entry stride of 32 bytes and only checked that the first int32 of the entry landed
inside the string table — which any offset near the string data satisfies by chance.

## What the proper test shows
The entry stride is not assumed any more: for each candidate stride in {80, 84, 88, 92, 96, 100, 104, 108, 112}, 300
consecutive entries were required to have a first int32 that indexes a string that looks like an identifier.

```
stride measured: 84  (agreement 0.003)     <- noise, not a measurement
   stride  80 -> 0.000      stride  88 -> 0.000      stride  92 -> 0.000
   stride  96 -> 0.000      stride 104 -> 0.000      others -> 0.000
types extracted: 0
```

**Conclusion: pair 21 is not the type-definition table**, and the type table has **not** been located. The only
IL2CPP facts that stand are the ones that were directly verifiable and remain so:

| fact | evidence |
|---|---|
| magic `0xFAB11BAF`, version **39** | read from the first 8 bytes |
| string table at pair 1 (offset 22,415, count 90,040) | the strings are readable there and `string_at()` returns identifiers |
| string-literal table at pair 0 (offset 380, count 89,660) | same shape |

## What replaces it
`AssetRipper` is installed at `C:\Users\CHEN\tools\AssetRipper` and is built for exactly this job; it should be the
route for the IL2CPP schema rather than a hand-rolled header walk. A hand-rolled reader is only worth continuing if a
type table can be found by a test that a wrong stride cannot pass — e.g. requiring that a long run of entries yields
plausible names, each namespace index also valid, and that the run ends when the table's own count is reached.

**No P0 schema was produced for Supermarket Simulator.** The artifact written by this probe
(`data/normalized/p0-schema.json`) contains `typesExtracted: 0` and must not be treated as data; it stays as
evidence of the failed test.
