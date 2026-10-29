# Measuring Unity built-in field sizes by difference (2026-09-25)

Method: for an object whose written fields are all measured **except the last one**, the residual
`payloadBody − measuredAlignedSum` is that field's size. Consistent residuals across objects and games are a
measurement; inconsistent ones are reported and refused.

Usable objects: REPO 13, TCG 5 (the sample is small — most classes have more than one unmeasured field).

| field type | n | candidate size | verdict |
|---|---|---|---|
| `class:GameObject` | 3 | **12 B (3/3)** | consistent |
| `class:TextMeshProUGUI` | 3 | **12 B (3/3)** | consistent |
| `class:Transform` | 1 | 12 B | consistent with the above |
| `class:Camera` | 1 | 12 B | consistent with the above |
| `class:AnimationCurve` | 2 | 72 / 100 | **inconsistent → refused** (written inline, size varies) |
| `class:Sound` | 1 | 80 B | single sample → not accepted |
| `generic` | 7 | 16 / 24 / 28 / 32 / 92 / 108 | **no measurement** (unbounded spread) |

## What this establishes
1. **A reference to a `UnityEngine.Object` subclass is 12 bytes** — five independent confirmations across two games
   (`GameObject`, `Transform`, `Camera`, `TextMeshProUGUI`). Today the decoder only accepts references to object
   classes **defined in `Assembly-CSharp.dll`**, so most gameplay references are still refused. This result says they
   can be accepted, if the decoder can tell which external types are `UnityEngine.Object` subclasses.
2. **`AnimationCurve`-like inline classes cannot be laid out by a fixed size**, and `generic` fields have no measured
   size at all. Both stay refused — the measurement refused them rather than filling them with a plausible number.

## Next step (concrete)
Parse **`UnityEngine.dll`** (a Mono assembly already sitting in the same `Managed` folder) with the existing
ECMA-335 reader to obtain the `UnityEngine.Object` hierarchy, then treat a `class` field whose resolved type reaches
`Object`/`Component`/`Behaviour`/`MonoBehaviour` in that assembly as a 12-byte reference. That is the same
"derive it from the assembly" rule already used for enums, applied across assemblies — and it should unlock a large
share of the 462 refusals, because gameplay classes overwhelmingly reference Transforms and GameObjects.
