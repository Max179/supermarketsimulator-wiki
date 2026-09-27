#!/usr/bin/env python3
"""Dump named MonoBehaviour payloads (small ones) so the Node layout decoder can be run over real game bytes."""
import UnityPy, os, struct, json, base64
SETS = [
  ('repo', 'C:/Users/CHEN/Desktop/repo/data/raw/R.E.P.O.v0.4.0/REPO/REPO_Data', 'level0',
   'C:/Users/CHEN/Desktop/repo/data/normalized/repo-mb-payloads.json'),
  ('tcg', 'C:/uTorria/Downloads/TCG Card Shop Simulator/Card Shop Simulator_Data', 'level1',
   'C:/Users/CHEN/Desktop/tcg-shop/data/normalized/tcg-mb-payloads.json'),
]
for label, root, datafile, out in SETS:
    scripts = os.path.join(root, 'globalgamemanagers.assets')
    data = os.path.join(root, datafile)
    if not (os.path.exists(scripts) and os.path.exists(data)):
        print(label, 'missing'); continue
    env = UnityPy.load(scripts, data)
    smap = {}
    for o in env.objects:
        if o.type.name == 'MonoScript':
            try:
                cls = getattr(o.read(), 'm_ClassName', '') or ''
                if cls: smap[o.path_id] = cls
            except Exception: pass
    rows = []
    for o in env.objects:
        if o.type.name != 'MonoBehaviour' or o.byte_size > 256:
            continue
        try:
            raw = o.get_raw_data()
        except Exception:
            continue
        if len(raw) < 28: continue
        sfile, spath = struct.unpack_from('<iq', raw, 16)
        cls = smap.get(spath)
        if not cls: continue
        rows.append({'class': cls, 'pathId': str(o.path_id), 'size': o.byte_size, 'payload': base64.b64encode(raw).decode('ascii')})
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump({'game': label, 'source': datafile + ' + globalgamemanagers.assets', 'objects': rows}, f)
    print('%-5s dumped %d payloads (<256B) -> %s' % (label, len(rows), out))
