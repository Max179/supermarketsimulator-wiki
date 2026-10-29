# Unity 6 (SerializedFile v22) header — measured by self-consistency, 2026-09-25

Method: **no layout is assumed.** The file length is known, so the u64 (big-endian) in the header that equals it
*is* the fileSize field; metadataSize and dataOffset are then read at the fixed relative slots and validated
(metadata > 0, dataOffset > metadata, dataOffset < fileSize). Run over three different games' files at once.

| file | size | u64 == size at | metadataSize @16 | dataOffset @32 |
|---|---|---|---|---|
| TCG `level1` | 1,814,108 | **@24** | 318,743 | 318,800 |
| TCG `level2` | 58,407,900 | **@24** | 9,308,389 | 9,308,448 |
| TCG `sharedassets1.assets` | 2,862,008 | **@24** | 14,284 | 14,336 |
| R.E.P.O. `level0` | 530,084 | **@24** | 88,111 | 88,160 |
| R.E.P.O. `level1` | 427,956 | **@24** | 70,971 | 71,024 |
| R.E.P.O. `sharedassets0.assets` | 67,228,396 | **@24** | 374,850 | 374,912 |
| R.E.P.O. `resources.assets` | 208,174,496 | **@24** | 30,803,442 | 30,803,504 |
| Supermarket `resources.assets` | 403,373,552 | **@24** | 4,259,770 | 4,259,824 |

**The fileSize slot is identical in 8/8 files across 3 games** (a different engine generation than the reference
pipeline's Unity 2019.4 / v21, which reads metadataSize/fileSize/version/dataOffset as four u32 at 0/4/8/12).

Candidate v22 header, with the fields this measurement fixes:

```
@0   u64   0                      (reserved; not yet identified)
@8   u32   version = 22
@12  u32   0                      (reserved)
@16  u64   metadataSize           <- measured
@24  u64   fileSize == real length <- measured, 8/8
@32  u64   dataOffset             <- measured
@40  u64   0
@48  ascii "6000.0.66f2"          (Unity version string; TCG)
```

**Status: measured, not yet implemented.** The next step is to read the object table through this header and
require the same self-check the reference parser uses (objects must account for the file), then decode MonoBehaviour
payloads with the field layouts already extracted from each game's own assembly. Until that parser exists and
validates, every instance value stays `unknown`.

One earlier sanity heuristic of mine ("object data must be < 90% of the file") was wrong and flagged three
metadata-light `.assets` files; the measurement above does not depend on it.
