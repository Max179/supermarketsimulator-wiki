#!/usr/bin/env python3
"""Route B/C probe: with the object table solved by UnityPy, get each MonoBehaviour's script class name and its raw
payload. The field layouts for those classes come from each game's own assembly (already extracted)."""
import UnityPy, os
FILES = [
    ('REPO level0', 'C:/Users/CHEN/Desktop/repo/data/raw/R.E.P.O.v0.4.0/REPO/REPO_Data/level0'),
    ('TCG level1', 'C:/uTorria/Downloads/TCG Card Shop Simulator/Card Shop Simulator_Data/level1'),
]
for name, path in FILES:
    if not os.path.exists(path):
        print(name, 'missing'); continue
    env = UnityPy.load(path)
    mb = [o for o in env.objects if o.type.name == 'MonoBehaviour']
    print('---', name, 'MonoBehaviours:', len(mb))
    named = 0
    shown = 0
    for o in mb:
        try:
            data = o.read()
            script = data.m_Script
            if script is None:
                continue
            ms = script.read()
            cls = getattr(ms, 'm_ClassName', None)
            if not cls:
                continue
            named += 1
            if shown < 6 and o.byte_size >= 24:
                raw = o.get_raw_data()
                print('  class=%-28s pathID=%-8s payload=%s bytes' % (cls, o.path_id, len(raw)))
                shown += 1
        except Exception as e:
            continue
    print('  objects with a resolved class name:', named, 'of', len(mb))
