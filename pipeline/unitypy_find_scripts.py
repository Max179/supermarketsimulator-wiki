#!/usr/bin/env python3
"""Which file in the install holds the MonoScript objects? Without them a MonoBehaviour cannot be named."""
import UnityPy, os, glob

SETS = {
  'REPO': 'C:/Users/CHEN/Desktop/repo/data/raw/R.E.P.O.v0.4.0/REPO/REPO_Data',
  'TCG': 'C:/uTorria/Downloads/TCG Card Shop Simulator/Card Shop Simulator_Data',
}
for label, root in SETS.items():
    if not os.path.isdir(root):
        print(label, 'missing'); continue
    files = []
    for pat in ('*.assets', 'level*', 'globalgamemanagers'):
        files += glob.glob(os.path.join(root, pat))
    files = [f for f in files if os.path.getsize(f) < 120 * 1024 * 1024]
    print('===', label, len(files), 'files under 120 MB')
    for f in sorted(files, key=os.path.getsize, reverse=True):
        try:
            env = UnityPy.load(f)
            counts = {}
            for o in env.objects:
                counts[o.type.name] = counts.get(o.type.name, 0) + 1
            ms = counts.get('MonoScript', 0)
            mb = counts.get('MonoBehaviour', 0)
            if ms or mb:
                print('  %-22s %-9d objects  MonoScript=%-5d MonoBehaviour=%-5d' % (os.path.basename(f), sum(counts.values()), ms, mb))
        except Exception as e:
            print('  %-22s FAILED %s' % (os.path.basename(f), str(e)[:60]))
