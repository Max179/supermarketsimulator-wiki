# Route D executed: real field values decoded from the games' own bytes (2026-09-25)

## The chain, and what it produced
1. UnityPy loads `globalgamemanagers.assets` (the MonoScripts) **together with** a data file →
   **100% of MonoBehaviours named**: REPO 637/637, TCG 3,568/3,568.
2. Each object's `m_Script` is read **from the raw payload at byte 20** (no typetree needed) and mapped through the
   MonoScript table.
3. The payload after the measured header is handed to the layout decoder whose rules were measured earlier
   (`pipeline/mono-layout.mjs` + the field layouts from each game's own assembly). A decode is accepted **only if it
   consumes the payload exactly**.

## REPO — first real values (498 dumped objects < 256 B: 18 decoded, 297 unknown class, 183 unmeasured layout)
```
DiscordManager.clientId                    = 1412070858389717000
ProgressionManager.roundPointsHauling       = 0
ProgressionManager.roundPointsScouting      = 0
ProgressionManager.roundPointsCombat        = 0
ProgressionManager.roundPointsSupport       = 0
ProgressionManager.roundPointsTotalHaul     = 0
ProgressionManager.roundPointsBonusAllSurvived = false
ProgressionManager.roundPointsBonusNoDeaths   = true
ProgressionManager.penaltyDeath             = 0
SessionManager.crownedPlayerSteamID         = ""
GameManager.localTest                       = false
GameManager.maxPlayersPhoton                = 20
```
These are **game values**, not schema: they can carry `confidence: extracted`, with source
`level0 + globalgamemanagers.assets`, and the refusals stay `unknown`.

## TCG — 0 decoded, and correctly so
2,762 objects dumped: **2,111 refused as unknown class** (`TextMeshProUGUI`, `EventSystem`, `SteamworksBehaviour` …
live in UnityEngine/other assemblies, not in `Assembly-CSharp.dll`) and **651 refused as unmeasured layout** (their
fields include strings, arrays or references). Both are refusals by rule, not failures.

## Why the earlier attempts failed (recorded)
- Single-file loads: the MonoScripts are not in the level/sharedassets files, so `m_Script` had `m_FileID != 0`.
- `o.read()`: the assets are typetree-stripped, so UnityPy cannot parse a fields-bearing MonoBehaviour.
- Searching for the object table with three candidate layouts: the v22 table is not the v21 shape; UnityPy reads it,
  which is why route A (reuse the parsing method) was the right call.

## Probes committed
`pipeline/unitypy_name_all.py`, `pipeline/unitypy_dump_payloads.py`, `pipeline/decode_values.ts`
(run with `node --experimental-strip-types`), plus the earlier five probes. Raw payload dumps stay on Windows and are
git-ignored; they are game data, not source.
