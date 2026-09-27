#!/usr/bin/env python3
"""Route B, final step: name every MonoBehaviour by reading m_Script from its own bytes.

MonoScripts live in globalgamemanagers.assets; the components live in level* / sharedassets*. UnityPy cannot parse a
fields-bearing MonoBehaviour (the assets are typetree-stripped), so instead of read() this reads the fixed header
straight from the object's bytes: m_GameObject PPtr (12) + m_Enabled (1, padded to 4) + m_Script PPtr (12), i.e. the
script's pathID sits at byte 20.
"""
import UnityPy, os, struct, glob

SETS = [
  ('REPO', 'C:/Users/CHEN/Desktop/repo/data/raw/R.E.P.O.v0.4.0/REPO/REPO_Data', 'level0'),
  ('TCG',  'C:/uTorria/Downloads/TCG Card Shop Simulator/Card Shop Simulator_Data', 'level1'),
]
for label, root, datafile in SETS:
    scripts = os.path.join(root, 'globalgamemanagers.assets')
    data = os.path.join(root, datafile)
    if not (os.path.exists(scripts) and os.path.exists(data)):
        print(label, 'missing files'); continue
    env = UnityPy.load(scripts, data)
    smap = {}
    for o in env.objects:
        if o.type.name == 'MonoScript':
            try:
                d = o.read()
                cls = getattr(d, 'm_ClassName', '') or ''
                if cls:
                    smap[o.path_id] = cls
            except Exception:
                pass
    named = total = withfields = 0
    examples = []
    for o in env.objects:
        if o.type.name != 'MonoBehaviour':
            continue
        total += 1
        try:
            raw = o.get_raw_data()
        except Exception:
            continue
        if len(raw) < 28:
            continue
        sfile, spath = struct.unpack_from('<iq', raw, 16)
        cls = smap.get(spath)
        if not cls:
            continue
        named += 1
        if o.byte_size > 40:
            withfields += 1
            if len(examples) < 6:
                examples.append((cls, o.path_id, o.byte_size, len(raw)))
    print('--- %s  MonoScripts mapped=%d  MonoBehaviour=%d  named=%d (%.1f%%)  namedWithFields=%d' % (
        label, len(smap), total, named, 100.0 * named / max(1, total), withfields))
    for cls, pid, bsize, rawlen in examples:
        print('    %-28s pathID=%-8s byte_size=%-5d raw=%d' % (cls, pid, bsize, rawlen))
