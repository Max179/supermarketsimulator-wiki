# Content model — three tiers

Every page on the site comes from this folder. The build refuses to emit a tier it cannot justify.

| Tier | Folder | In sitemap | Indexable | What may be in it |
| --- | --- | --- | --- | --- |
| published | `content/published/` | yes | yes | Player-facing entries with a verified factual core: what it is, where you find it, how you get it, what it is for, prerequisites or numbers. Needs images and evidence. |
| reference | `content/reference/` | no | no (noindex) | Technical material for modders: identifiers read from the game's files. Linked from published entries, never advertised as content. |
| draft | `content/draft/` | no | not built | Work in progress. Never emitted, never linked. |

## Rules the gate enforces (`tools/content-gate.mjs`)

1. A published entry needs: a real player title (not a bare identifier), a factual summary of at least 80 characters that answers a question, at least two body paragraphs, at least one fact with an evidence pointer, at least one image, at least one related entry, a version/source note, English **and** Chinese alt text for every image.
2. Prose in published entries may not contain internal implementation terms (the gate holds a banned-word list: IL2CPP, SerializedFile, PPtr, schema, metadata, payload, MonoBehaviour, ScriptableObject, parser, hash, and the words class / field / namespace used as nouns).
3. Images must exist on disk, be a supported format, be larger than 1 KB, and be declared as either a real game image (`kind: "game"`, which requires a mapping the extractor confirmed) or an original diagram (`kind: "diagram"`, which must say so in the entry and must never be presented as a screenshot).
4. A published entry without an image is not published: it belongs in draft or reference.
5. No placeholder text: title/summary pairs must be unique, and a summary may not be the title reworded.

## Images: game image or labelled diagram

6. **Every published entry declares its picture tier** in `imageTier`:
   - `"game-image"` — the entry carries at least one image exported from the game itself. The gate checks the file against
     `content/images-manifest.json` (source bundle, asset name, width, height, bytes, sha256), so the origin is re-checkable.
   - `"diagram-only"` — no image from the game was mapped to this entity yet. The entry must carry an original diagram whose
     disclaimer says it is not a screenshot, its page says so in a notice at the top, and it is listed apart from the featured
     entries instead of being mixed in with them.
7. **A diagram never stands in for a screenshot.** No entry may present an original illustration as a picture of the game, and
   an entity with no mapped image is not given a filler picture to make it look complete.
8. `node tools/image-coverage.mjs` writes `reports/image-coverage.md`, which lists every published entry with its tier and,
   for illustrated entries, the recorded origin of the image. It exits non-zero if a used image has no manifest record or if
   the manifest holds a record no entry uses.
