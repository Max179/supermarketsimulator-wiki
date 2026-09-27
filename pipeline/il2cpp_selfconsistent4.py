#!/usr/bin/env python3
"""v4: the string blob is (off=918256, size=2865150) at header slot 32 - measured by anchor containment plus
a 0.991 identifier yield. Most IL2CPP header entries are (offset, COUNT), not (offset, byteSize); treating
count as a byte size is why earlier searches found nothing. Scan every header pair under both readings and
require sampled entries to resolve to C# identifiers inside the measured string blob."""
import struct, sys, re
P = sys.argv[1]
data = open(P, 'rb').read(); n = len(data)
i32 = lambda o: struct.unpack_from('<i', data, o)[0]
u32 = lambda o: struct.unpack_from('<I', data, o)[0]
ident = re.compile(rb'^[A-Za-z_<][A-Za-z0-9_<>.`$]*$')
SO, SS = 918256, 2865150
print('size=%d sanity=0x%08x version=%d stringBlob=(%d,%d)' % (n, u32(0), i32(4), SO, SS))

def name_at(idx):
    if not (0 <= idx < SS):
        return None
    e = data.find(b'\x00', SO + idx, min(SO + SS, SO + idx + 200))
    if e < 0:
        return None
    s = data[SO + idx:e]
    return s.decode('ascii', 'replace') if ident.match(s) else None

hits = []
for o in range(8, 0x400 - 4, 4):
    a, b = i32(o), i32(o + 4)
    if not (0 < a < n) or b <= 0:
        continue
    for st in range(80, 121):
        for mode in ('count', 'bytes'):
            if mode == 'bytes' and b % st:
                continue
            cnt = b if mode == 'count' else b // st
            if not (200 <= cnt <= 1_500_000):
                continue
            if a + (cnt - 1) * st >= n:
                continue
            step = max(1, cnt // 200)
            rng = range(0, cnt, step)
            ok = sum(1 for i in rng if name_at(i32(a + i * st)))
            if ok >= len(rng) * 0.96:
                first = [name_at(i32(a + i * st)) for i in range(5)]
                hits.append((ok / len(rng), o, a, b, st, mode, cnt, first,
                             name_at(i32(a + (cnt - 1) * st))))
hits.sort(reverse=True)
print('candidates: %d' % len(hits))
for h in hits[:12]:
    print('   yield=%.3f slot=%d off=%d raw=%d stride=%d mode=%s count=%d first=%s last=%r' %
          (h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], h[8]))
