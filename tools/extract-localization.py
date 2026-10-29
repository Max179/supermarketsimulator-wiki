#!/usr/bin/env python3
"""Extract the shipped Unity Localization tables from a Unity game's addressable bundles.

The game ships one shared bundle (every table collection's keys, keyed by a 64-bit id) and one
bundle per language (id -> text). The bundle's own type information for the nested entry struct
does not load, so the entries are read straight out of the object's bytes by looking for the ids
the shared table already lists - an id that is not in that table is never accepted, and a value
that does not decode as UTF-8 is dropped, so a wrong guess cannot pass as a translation.

Nothing is translated here: every string is the game's own, and every output records the bundle
it came from together with its sha256.

    python tools/extract-localization.py <game-root> <out-dir> [<aa-dir>]

<game-root> holds the *_Data directory (e.g. .../R.E.P.O.v0.4.0/REPO).
"""
import hashlib
import json
import os
import re
import struct
import sys

import UnityPy

SHARED_NAME = "localization-assets-shared_assets_all.bundle"
LOCALE_PREFIX = "localization-string-tables-"


def sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def monobehaviours(path):
    env = UnityPy.load(path)
    return [obj for obj in env.objects if obj.type.name == "MonoBehaviour"]


def scan_entries(raw, wanted):
    """Read (id, text) pairs out of a serialized string table.

    The entry struct's typetree does not resolve for this build, so the ids the shared table
    lists are used as anchors: an anchor that is not followed by a length and a UTF-8 string is
    skipped, and each id is taken at most once.
    """
    found = {}
    for pos in range(0, len(raw) - 12):
        ident = struct.unpack_from("<q", raw, pos)[0]
        if ident not in wanted or ident in found:
            continue
        length = struct.unpack_from("<i", raw, pos + 8)[0]
        if length < 0 or length > 8192 or pos + 12 + length > len(raw):
            continue
        try:
            found[ident] = raw[pos + 12:pos + 12 + length].decode("utf-8")
        except UnicodeDecodeError:
            continue
    return found


def main():
    game_root = sys.argv[1]
    out_dir = sys.argv[2]
    aa_dir = sys.argv[3] if len(sys.argv) > 3 else None
    if aa_dir is None:
        data_dir = next((os.path.join(game_root, name) for name in os.listdir(game_root) if name.endswith("_Data")), None)
        if data_dir is None:
            raise SystemExit("no *_Data directory under " + game_root)
        aa_dir = os.path.join(data_dir, "StreamingAssets", "aa", "StandaloneWindows64")

    shared_path = os.path.join(aa_dir, SHARED_NAME)
    if not os.path.exists(shared_path):
        raise SystemExit("shared localization bundle missing: " + shared_path)

    id_to_key, keys_by_collection = {}, {}
    for obj in monobehaviours(shared_path):
        data = obj.read()
        collection = str(getattr(data, "m_TableCollectionName", "") or "")
        if not collection:
            continue
        keys_by_collection[collection] = {int(entry.m_Id): str(entry.m_Key) for entry in data.m_Entries}
        id_to_key.update(keys_by_collection[collection])
    print("collections: %s (%d keys)" % ({name: len(keys) for name, keys in keys_by_collection.items()}, len(id_to_key)))

    payloads = []
    os.makedirs(out_dir, exist_ok=True)
    written = 0
    for bundle in sorted(name for name in os.listdir(aa_dir) if name.startswith(LOCALE_PREFIX)):
        path = os.path.join(aa_dir, bundle)
        locale, entries, per_collection = "", {}, {}
        for obj in monobehaviours(path):
            data = obj.read()
            rows = getattr(data, "m_TableData", []) or []
            if not rows:
                continue
            wanted = {int(row.m_Id) for row in rows}
            values = scan_entries(obj.get_raw_data(), wanted)
            collection = str(getattr(data, "m_TableName", "") or getattr(data, "m_Name", "") or "").split("_")[0]
            locale = locale or str(getattr(getattr(data, "m_LocaleId", None), "m_Code", "") or "")
            named = {id_to_key[ident]: text for ident, text in values.items() if ident in id_to_key}
            per_collection[collection] = named
            entries.update(named)
            if len(values) != len(rows):
                print("   %s: %d of %d entries recovered" % (getattr(data, "m_Name", "?"), len(values), len(rows)))
        if not locale or not entries:
            print("SKIP", bundle)
            continue
        payload = {
            "schemaVersion": "unity-localization@1.0.0",
            "source": {
                "bundle": bundle,
                "sha256": sha256(path),
                "bytes": os.path.getsize(path),
                "sharedBundle": SHARED_NAME,
                "sharedSha256": sha256(shared_path),
                "extractor": "tools/extract-localization.py@1.0.0",
                "engine": "Unity Localization: SharedTableData (keys) + StringTable (values) inside addressable bundles",
                "rightsStatus": "unknown"
            },
            "locale": locale,
            "count": len(entries),
            "collections": {name: {"count": len(values), "entries": values} for name, values in per_collection.items()},
        }
        out_name = "localization-%s.json" % re.sub(r"[^a-z0-9]+", "-", locale.lower()).strip("-")
        payloads.append((out_name, payload))
        written += 1
        print("locale %-6s entries=%-4d -> %s" % (locale, len(entries), out_name))
    # The shipped tables are not necessarily translations: in this build most values are the
    # English string with a locale marker in front of it ("(pt-BR) Extraction point activated"),
    # which is a placeholder the localizer never replaced. Comparing every locale against the
    # English table separates the two, so nobody mistakes one for the other.
    reference = next((payload for _name, payload in payloads if payload["locale"].startswith("en")), None)
    if reference is not None:
        flat = {}
        for collection in reference["collections"].values():
            flat.update(collection["entries"])
        for _name, payload in payloads:
            if payload["locale"].startswith("en"):
                continue
            same = placeholder = genuine = 0
            for collection in payload["collections"].values():
                for key, text in collection["entries"].items():
                    english = flat.get(key)
                    if english is None:
                        continue
                    if text == english:
                        same += 1
                    elif re.sub(r"^\([a-zA-Z-]+\)\s*", "", text) == english:
                        placeholder += 1
                    else:
                        genuine += 1
            payload["verification"] = {
                "englishReference": reference["locale"],
                "rule": "a value equal to the English string, or equal to it after a leading (<locale>) marker, is a placeholder rather than a translation",
                "sameAsEnglish": same,
                "placeholderEntries": placeholder,
                "genuinelyLocalized": genuine,
            }
    for out_name, payload in payloads:
        with open(os.path.join(out_dir, out_name), "w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=1)

    print("locales written:", written)


if __name__ == "__main__":
    main()
