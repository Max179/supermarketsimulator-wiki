# Route A/B: UnityPy solves the Unity 6 object table (measured, 2026-09-25)

## Environment finding (route C)
`python` on PATH is **Python 3.10.6 and broken** (`Fatal Python error: init_fs_encoding ... No module named 'encodings'`).
UnityPy is installed under **Python 3.12.10**; call it explicitly:

```
C:\Users\CHEN\AppData\Local\Programs\Python\Python312\python.exe
```

`import UnityPy` → OK (`...\Python312\Lib\site-packages\UnityPy\__init__.py`). Probes live in
`pipeline/unitypy_probe.py` and `pipeline/unitypy_scripts.py`.

## Object tables read from real files (route B)
| file | objects | MonoBehaviours | top kinds |
|---|---|---|---|
| REPO `level0` (530,084 B) | **3,211** | **635** | GameObject 982, MonoBehaviour 635, RectTransform 616, Transform 366, CanvasRenderer 345 |
| TCG `level1` (1,814,108 B) | **13,060** | **3,567** | MonoBehaviour 3,567, GameObject 3,540, RectTransform 3,498, CanvasRenderer 2,229, Animation 144 |

The object table I could not locate by search (three candidate layouts, all refused) **is read correctly by a general
library already on this machine**. The rule holds: the parsing *method* is reused; no other game's data is used.

## Class names per object: partial, and why
`MonoBehaviour.read().m_Script.read().m_ClassName` resolves for **55 of 635** (REPO) and **12 of 3,567** (TCG).
The resolved objects are the small ones (`payload=32 bytes` = the header with an empty name: PPtr + enabled + PPtr +
string length, i.e. a component with no serialized fields). The rest need the **MonoScript object, which lives in a
different file** of the same install (`m_FileID != 0`), so a single-file load cannot resolve it.

**Next step (concrete, testable):** load the neighbouring files together (e.g. `REPO_Data` resources.assets +
level0, or UnityPy's directory load) so the cross-file PPtr resolves; then every MonoBehaviour has a class name, and
the raw payload can be handed to the field-layout decoder whose rules were already measured
(`pipeline/mono-layout.mjs` + the per-game assembly layouts).

## What this changes
- The v22 object table is **no longer a blocker**: UnityPy reads it, and its output (pathID, byte size, order) can be
  used to validate or refute my measured header model on real data.
- Extracting values becomes: UnityPy object + raw payload → existing layout decoder → `confidence: extracted` for
  values that consume the payload exactly, `unknown` otherwise.
- Supermarket (IL2CPP v39) keeps its own path: type table candidate at pair 21 (offset 14,347,456, count 64,928,
  8/8 name indexes valid) — AssetRipper (`C:\Users\CHEN\tools\AssetRipper`) is the fallback.
