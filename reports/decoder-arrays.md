# Decoder rule: arrays — added, neutral on this sample (2026-09-25)

Rule: an array is `i32 count` + that many elements + alignment to 4. Only element kinds whose size is already known
are accepted — primitives, and references to object classes defined in this assembly. Arrays of nested value types,
Unity built-ins or enums are refused (not guessed).

**Measured effect: none on the current sample.**

| | before | after |
|---|---|---|
| REPO objects decoded (498 dumped) | 36 | **36** (no change) |
| TCG objects decoded (2,762 dumped) | 0 | 0 |

No regression: every object that decoded before still decodes (acceptance test for adding a rule is satisfied), but no
additional object became decodable, so the rule is **not yet earning anything on this corpus sample**.

## What the remaining 462 REPO refusals actually are
- **classes not in `Assembly-CSharp.dll`** (UnityEngine / third-party): refused because the field layout source is
  absent, not because a rule is missing;
- **classes containing nested value types** (`Vector3`, `Color`, `AnimationCurve`, `Keyframe` …) or Unity built-ins:
  these dominate gameplay classes, and their on-disk layout is Unity's own, not the managed field layout.

## Next (in the order the evidence points)
1. **Nested value types that are plain `[Serializable]` structs declared in this assembly** — recursion into the
   struct's own written fields is the same walk one level down, and is measurable by exact consumption.
2. Then Unity built-ins `Vector3`/`Color`/`Quaternion` (fixed 12/16/16 bytes) — measurable, but they must be
   **measured**, not assumed, so a probe identical to the header recovery is required before they enter the decoder.
3. Arrays stay in the rule set; they will pay off once (1) lands, because arrays of structs are common.
