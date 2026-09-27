# Decoder rule: nested structs — added, neutral again (2026-09-25)

Rule: a field whose type is a plain value type declared in this assembly (a `[Serializable]` struct) is laid out by
recursing into that struct's own written fields, one level down, up to depth 4. A partial answer is never returned: any
unmeasured field refuses the whole class.

**Measured effect: none.**

| | before | after |
|---|---|---|
| REPO objects decoded (498 dumped) | 36 | **36** |
| TCG objects decoded (2,762 dumped) | 0 | 0 |

No regression (every previously decodable object still decodes), no gain. Two rules in a row (arrays, then structs) have
been neutral on this sample, which is itself the finding:

## The plateau is made of Unity built-ins, not missing rules
The remaining 462 REPO refusals are dominated by classes whose fields include **Unity's own value types** —
`Vector3`, `Color`, `Quaternion`, `AnimationCurve`, `Keyframe`, `LayerMask`. Those types are **not declared in
`Assembly-CSharp.dll`**, so `structType()` returns null and the class is refused by design. The field layouts that do
exist for them live in `UnityEngine.dll`, but their **on-disk encoding is Unity's own**, not the managed field layout —
so reading the assembly is not enough and assuming 12/16 bytes would be exactly the kind of guess this project refuses.

## The next probe (measurable, same method as the header recovery)
Find real objects whose class has a **single** field of one built-in type (or a minimal mix) and solve for that type's
size from the payload length: `size = payload − header − (sizes of the other fields)`. Repeat across many objects and
several files; accept a size only when it is consistent everywhere and makes a whole class consume its payload exactly.
Order of attack: `Vector3`, `Color`, `Quaternion`, `LayerMask`, then `Keyframe`/`AnimationCurve` (a managed class
Unity writes inline — the hardest, and the one most likely to need a reference implementation).
`UnityEngine.dll` sits in the same `Managed` folder, so the *type list* is available; the *sizes* still have to be
measured.
