#!/usr/bin/env python3
"""v12: re-search every table with the STRICT name rule I should have used from the start - a real name index
points at the START of a string, i.e. the byte before it is NUL (or it is offset 0). Without that rule a random
integer landing inside the dense text blob decodes to a plausible suffix ('keryManager', 'er', 't'), which is why
an earlier candidate looked like a 99%-valid fields table and is now retracted.
For every header (offset, value) pair, under both the count and the byte-size reading, and for every stride
2..200, the fraction of sampled entries whose first member is a true string start is measured."""
import struct, sys, re
P = sys.argv[1]
data = open(P, 'rb').read(); n = len(data)
i32 = lambda o: struct.unpack_from('<i', data, o)[0]
u32 = lambda o: struct.unpack_from('<I', data, o)[0]
SO, SS = 918256, 2865150
ident = re.compile(rb'^[A-Za-z_<][A-Za-z0-9_<>|.`$=]*$')
STRICT_STATS = {'ok': 0, 'weakOnly': 0, 'range': 0, 'bad': 0}

def decode(idx, strict):
    if not (0 <= idx < SS):
        return None, 'range'
    if strict and idx != 0 and data[SO + idx - 1] != 0:
        return None, 'weakOnly'
    e = data.find(b'\x00', SO + idx, min(SO + SS, SO + idx + 300))
    if e < 0:
        return None, 'bad'
    s = data[SO + idx:e]
    return (s.decode('ascii', 'replace') if ident.match(s) else None), ('ok' if ident.match(s) else 'bad')

print('version=%d size=%d' % (i32(4), n))
print('type table check under the strict rule (off=%d stride=82 count=21152):' % 15573600)
for i in (0, 1, 2, 21151):
    v = i32(15573600 + i * 82)
    nm, why = decode(v, True)
    print('   type[%d] idx=%d -> %r (%s)' % (i, v, nm, why))

print('unknown-field check: how often does a random index pass the WEAK rule but fail the strict one?')
import random
random.seed(1)
weak = strict_ok = 0
for _ in range(20000):
    idx = random.randrange(0, SS)
    a, _w = decode(idx, False)
    b, _s = decode(idx, True)
    if a:
        weak += 1
    if b:
        strict_ok += 1
print('   random index: weak-pass=%d/20000 (%.1f%%), strict-pass=%d/20000 (%.2f%%)' %
      (weak, 100 * weak / 20000, strict_ok, 100 * strict_ok / 20000))

print('table search with the strict rule:')
hits = []
for o in range(8, 0x400 - 4, 4):
    a, b = i32(o), i32(o + 4)
    if not (0 < a < n) or b <= 0:
        continue
    for st in range(2, 201):
        for mode in ('count', 'bytes'):
            if mode == 'bytes' and b % st:
                continue
            cnt = b if mode == 'count' else b // st
            if not (50 <= cnt <= 2_000_000):
                continue
            if a + (cnt - 1) * st >= n:
                continue
            step = max(1, cnt // 120)
            rng = range(0, cnt, step)
            good = 0
            for i in rng:
                nm, why = decode(i32(a + i * st), True)
                if nm:
                    good += 1
            if good >= len(rng) * 0.95:
                hits.append((good / len(rng), o, a, b, st, mode, cnt,
                             decode(i32(a), True)[0], decode(i32(a + (cnt - 1) * st), True)[0]))
hits.sort(key=lambda h: (-h[0], h[2]))
print('candidates: %d' % len(hits))
seen = set()
for h in hits:
    key = (h[2], h[4])
    if key in seen:
        continue
    seen.add(key)
    print('   yield=%.3f slot=%d off=%d raw=%d stride=%d mode=%s count=%d first=%r last=%r' %
          (h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], h[8]))
    if len(seen) >= 14:
        break
