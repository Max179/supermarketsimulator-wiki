# MonoScript location — the missing link for naming MonoBehaviour objects (measured, 2026-09-25)

## Finding
MonoScript objects are **not** in the level or sharedassets files (so every MonoBehaviour's `m_Script` had
`m_FileID != 0`, which is why single-file loads named almost nothing). They are all in
**`globalgamemanagers.assets`**:

| install | file | objects | MonoScript | MonoBehaviour |
|---|---|---|---|---|
| REPO | `globalgamemanagers.assets` | 3,452 | **3,445** | 2 |
| REPO | `sharedassets0.assets` | 15,056 | 0 | **4,747** |
| REPO | `level0` / `level1` / `level2` | 3,211 / 2,709 / 2,743 | 0 | 635 / 505 / 515 |
| TCG | `globalgamemanagers.assets` | 3,814 | **3,803** | 1 |
| TCG | `level2` | 387,211 | 0 | **89,483** |
| TCG | `sharedassets0.assets` | 49,641 | 0 | **13,546** |
| TCG | `level1` | 13,060 | 0 | 3,567 |
| TCG | `resources.assets` | 3,946 | 0 | 1,009 |

(Scan limited to files under 120 MB; REPO `resources.assets` at 198 MB was excluded by that bound, not by absence.)

## The pipeline this makes possible
1. Load `globalgamemanagers.assets` **together with** the data file → build `pathID -> m_ClassName` from the
   MonoScript objects (class 115 is native, so UnityPy parses it with no typetree).
2. For each MonoBehaviour read `m_Script` **straight from its own bytes at offset 20** (`i32 fileID, i64 pathID`)
   rather than asking UnityPy to parse the object — that needs no typetree and works for objects with real fields,
   which `read()` refuses (measured: every "resolved" object was a 32-byte header with no fields, and the raw-offset
   read returned 0 links only because the MonoScripts were in another file).
3. Hand the payload after the header to the already-measured layout decoder (`pipeline/mono-layout.mjs` + the field
   layouts extracted from each game's own assembly). Values that consume the payload exactly become
   `confidence: extracted`; everything else stays `unknown`.

## Probes committed with this report
`pipeline/unitypy_probe.py`, `pipeline/unitypy_scripts.py`, `pipeline/unitypy_multifile.py`,
`pipeline/unitypy_rawscript.py`, `pipeline/unitypy_find_scripts.py` — all read-only, all run with
`C:\Users\CHEN\AppData\Local\Programs\Python\Python312\python.exe` (the `python` on PATH is a broken 3.10.6).
