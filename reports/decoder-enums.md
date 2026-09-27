# Decoder extension: enums (measured rule), 2026-09-25

## Rule added
An enum field is written as its **underlying integer**, and the size of that integer is read from the enum's own
`value__` field in the game's assembly — the same source as every other layout fact here. The decoder refuses the
whole class when it meets a field whose size is still unmeasured (arrays, nested value types, Unity built-ins).

## Result on real payloads (acceptance = the decode consumes the payload exactly)
| | before (primitives + string + reference) | after (+ enum) |
|---|---|---|
| REPO objects decoded (498 dumped) | 18 | **36** |
| value kinds | bool, float, int, reference, u8 | bool 60, **enum 36**, float 25, int 3, reference 3, u8 1 |
| TCG objects decoded (2,762 dumped) | 0 | 0 (2,762 refused: their classes live in UnityEngine, not Assembly-CSharp) |

Sample values, now `confidence: extracted`:

```
PlayerMaterial.cosmeticType = 12   (enum:CosmeticType)
PlayerMaterial.tintType     = 0    (enum:TintType)
GameManager.maxPlayersPhoton = 20
ProgressionManager.roundPointsBonusNoDeaths = true
DiscordManager.clientId = 1412070858389717000
```

No object that decoded before stopped decoding: the rule only widened the set, which is the acceptance test for
adding a rule.

## Files
`pipeline/mono-values.ts` (decoder: primitives, string, assembly object reference, enum — refuses anything else),
`pipeline/decode_values2.ts` (runner). Next rules, in order of what they unlock: arrays, then nested value types
(`Vector3`, `Color` …), then the Unity built-ins, each measured the same way.
