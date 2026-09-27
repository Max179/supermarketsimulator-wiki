#!/usr/bin/env python3
"""Route B: read m_Script straight out of the raw payload at its fixed offset instead of asking UnityPy to parse it.

The MonoBehaviour header is fixed: m_GameObject PPtr (fileID i32, pathID i64) + m_Enabled u8 (+3 pad) + m_Script PPtr
+ m_Name string. So the script's pathID is at byte 20 and needs no typetree at all.
"""
import UnityPy, os, struct

FILES = [
    ('REPO level0', 'C:/Users/CHEN/Desktop/repo/data/raw/R.E.P.O.v0.4.0/REPO/REPO_Data/level0'),
    ('TCG level1', 'C:/uTorria/Downloads/TCG Card Shop Simulator/Card Shop Simulator_Data/level1'),
]
for name, path in FILES:
    if not os.path.exists(path):
        print(name, 'missing'); continue
    env = UnityPy.load(path)
    # 1. MonoScript pathID -> class name (class 115 is native, so UnityPy parses it without a typetree)
    scripts = {}
    for o in env.objects:
        if o.type.name == 'MonoScript':
            try:
                d = o.read()
                scripts[o.path_id] = (getattr(d, 'm_ClassName', '') or '') + '|' + (getattr(d, 'm_Namespace', '') or '')
            except Exception:
                pass
    # 2. every MonoBehaviour's script pathID straight from its own bytes
    mb = [o for o in env.objects if o.type.name == 'MonoBehaviour']
    linked = 0
    big = []
    for o in mb:
        try:
            raw = o.get_raw_data()
        except Exception:
            continue
        if len(raw) < 28:
            continue
        sfile, spath = struct.unpack_from('<iq', raw, 16)
        if sfile != 0 or spath == 0:
            continue
        if spath in scripts:
            linked += 1
            if o.byte_size > 64 and len(big) < 6:
                big.append((scripts[spath].split('|')[0], o.path_id, o.byte_size, len(raw)))
    print('--- %s  MonoScripts=%d  MonoBehaviours=%d  linked by raw offset=%d (%.1f%%)' % (
        name, len(scripts), len(mb), linked, 100.0 * linked / max(1, len(mb))))
    for cls, pid, bsize, rawlen in big:
        print('    class=%-26s pathID=%-8s byte_size=%-5d raw=%d' % (cls, pid, bsize, rawlen))
