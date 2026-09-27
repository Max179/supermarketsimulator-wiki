# Unity 6 (v22) object table — attempted by self-consistency, 2026-09-25 (NEGATIVE RESULT)

Method (same as the header recovery that worked): a candidate entry layout is accepted only if the objects' byte
ranges **tile the data section exactly** — `max(byteStart + byteSize) === fileSize - dataOffset` — which is the
self-check the reference parser uses for v21. No layout was assumed to be right; each was tested.

Files tested: TCG `level1`, TCG `level2`, R.E.P.O. `level0`, R.E.P.O. `level1`, R.E.P.O. `sharedassets0.assets`.

| candidate entry layout | result |
|---|---|
| L20 — `pathID i64, byteStart u32, byteSize u32, typeID i32` | **no exact tiling** |
| L24 — `align i32, pathID i64, byteStart u32, byteSize u32, typeID i32` | **no exact tiling** |
| L24b — `pathID i64, byteStart i64, byteSize i64, typeID i32` | **no exact tiling** |

Scan: every 4-byte offset from 48 up to `metadataSize`, candidate counts 1..200,000, entries bounded by the file.

## What this rules out, and what it does not
- It rules out these three encodings **under the exact-tiling assumption**.
- It does not prove the object table is elsewhere: the assumption itself may be what is wrong for v22 (Unity may pad,
  or leave gaps, or the ranges may be relative to something other than `dataOffset`).

## Next attempt (recorded so it is not re-derived)
1. Relax the tiling test to `maxEnd <= dataSize && maxEnd > 0.9 * dataSize` and see whether a layout appears
   consistently; if one does, verify it by decoding a MonoBehaviour payload end-to-end (header + known class + exact
   length), which is a stronger check than tiling alone.
2. Read the **type table** first (it precedes the object table and its size is knowable from counts), so the object
   table's offset becomes derivable rather than searched.
3. If neither works, obtain a v22 layout reference (a public Unreal/Unity format description or a tool's source) and
   validate it here with the same exact-consumption rule.

**Consequence for the sites:** every instance value stays `unknown` with `confidence: verified-schema`; nothing is
estimated to fill the gap.
