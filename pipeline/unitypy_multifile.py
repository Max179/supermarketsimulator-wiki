#!/usr/bin/env python3
"""Route B next step: load neighbouring files together so a MonoBehaviour's m_Script (m_FileID != 0) resolves."""
import UnityPy, os, sys

PAIRS = [
    ('REPO level0+resources', ['C:/Users/CHEN/Desktop/repo/data/raw/R.E.P.O.v0.4.0/REPO/REPO_Data/level0',
                               'C:/Users/CHEN/Desktop/repo/data/raw/R.E.P.O.v0.4.0/REPO/REPO_Data/resources.assets',
                               'C:/Users/CHEN/Desktop/repo/data/raw/R.E.P.O.v0.4.0/REPO/REPO_Data/sharedassets0.assets']),
    ('TCG level1+small', ['C:/uTorria/Downloads/TCG Card Shop Simulator/Card Shop Simulator_Data/level1',
                          'C:/uTorria/Downloads/TCG Card Shop Simulator/Card Shop Simulator_Data/resources.assets',
                          'C:/uTorria/Downloads/TCG Card Shop Simulator/Card Shop Simulator_Data/sharedassets1.assets']),
]

def resolve(env, limit=4000):
    named = total = 0
    biggest = 0
    examples = []
    for o in env.objects:
        if o.type.name != 'MonoBehaviour':
            continue
        total += 1
        if total > limit:
            break
        try:
            d = o.read()
            s = d.m_Script
            if s is None:
                continue
            ms = s.read()
            cls = getattr(ms, 'm_ClassName', None)
            if cls:
                named += 1
                size = o.byte_size
                biggest = max(biggest, size)
                if len(examples) < 5 and size > 40:
                    examples.append((cls, size))
        except Exception:
            continue
    return named, total, biggest, examples

for label, files in PAIRS:
    files = [f for f in files if os.path.exists(f)]
    if not files:
        print(label, 'no files'); continue
    try:
        env = UnityPy.load(*files)
    except Exception as e:
        print(label, 'load FAILED:', type(e).__name__, str(e)[:120]); continue
    named, total, biggest, examples = resolve(env)
    print('%-24s files=%d  named=%d/%d (%.1f%%)  biggestResolved=%dB' % (label, len(files), named, total, 100.0*named/max(1,total), biggest))
    for cls, size in examples:
        print('    %-30s payload=%d bytes' % (cls, size))
