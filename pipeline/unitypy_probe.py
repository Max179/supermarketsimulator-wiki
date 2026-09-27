#!/usr/bin/env python3
"""Route B probe: read real Unity 6 assets with UnityPy and compare its object table with the measured v22 header.

Reuses another project's *parsing method* (UnityPy, a general library) -- never another game's data.
"""
import sys, struct, os

def header(path):
    with open(path, 'rb') as f:
        b = f.read(40)
    if len(b) < 40:
        return None
    return {
        'version': struct.unpack_from('>I', b, 8)[0],
        'metadataSize': struct.unpack_from('>Q', b, 16)[0],
        'fileSize': struct.unpack_from('>Q', b, 24)[0],
        'dataOffset': struct.unpack_from('>Q', b, 32)[0],
    }

try:
    import UnityPy
    print('UnityPy import: OK', getattr(UnityPy, '__file__', '?'))
except Exception as e:
    print('UnityPy import: FAILED ->', type(e).__name__, e)
    sys.exit(0)

print('python', sys.version.split()[0])
FILES = [
    ('REPO level0', 'C:/Users/CHEN/Desktop/repo/data/raw/R.E.P.O.v0.4.0/REPO/REPO_Data/level0'),
    ('TCG level1', 'C:/uTorria/Downloads/TCG Card Shop Simulator/Card Shop Simulator_Data/level1'),
]
for name, path in FILES:
    if not os.path.exists(path):
        print(name, 'missing'); continue
    h = header(path)
    print('---', name, 'fileSize', h['fileSize'], 'dataOffset', h['dataOffset'])
    try:
        env = UnityPy.load(path)
        objs = list(env.objects)
        kinds = {}
        for o in objs:
            kinds[o.type.name] = kinds.get(o.type.name, 0) + 1
        print('  UnityPy objects:', len(objs), 'kinds:', sorted(kinds.items(), key=lambda kv: -kv[1])[:6])
        mb = [o for o in objs if o.type.name == 'MonoBehaviour']
        print('  MonoBehaviours:', len(mb))
        for o in mb[:3]:
            try:
                tree = o.read_typetree()
                keys = list(tree.keys())[:8]
                print('    pathID', o.path_id, 'size', o.byte_size, 'typetree keys', keys)
            except Exception as e:
                print('    pathID', o.path_id, 'size', o.byte_size, 'typetree FAILED:', type(e).__name__, str(e)[:90])
    except Exception as e:
        print('  UnityPy load FAILED:', type(e).__name__, str(e)[:200])
