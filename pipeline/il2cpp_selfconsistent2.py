#!/usr/bin/env python3
"""v2: (1) rank the header (offset,size) pairs as the real string blob by the fraction of null-terminated
C# identifiers they yield; (2) with the best blob, scan header pairs x strides 80..120 for a type-definition
array (size divisible by the stride, >=96% of sampled nameIndex values resolving to identifiers)."""
import struct, sys, re
P = sys.argv[1]
data = open(P, 'rb').read(); n = len(data)
i32 = lambda o: struct.unpack_from('<i', data, o)[0]
u32 = lambda o: struct.unpack_from('<I', data, o)[0]
ident = re.compile(rb'^[A-Za-z_<][A-Za-z0-9_<>.`$]*$')
print('size=%d sanity=0x%08x version=%d' % (n, u32(0), i32(4)))

pairs = []
for off in range(8, 0x400 - 4, 4):
    a, b = i32(off), i32(off + 4)
    if 0 < a < n and 0 < b <= n - a and b > 1024:
        pairs.append((off, a, b))

def yield_rank(so, ss):
    pos = so; good = bad = 0; total = 0
    while pos < so + ss and total < 4000:
        end = data.find(b'\x00', pos, min(so + ss, pos + 300))
        if end < 0:
            break
        s = data[pos:end]
        if s:
            total += 1
            if ident.match(s):
                good += 1
            else:
                bad += 1
        pos = end + 1
    return good, bad

ranked = []
for off, a, b in pairs:
    g, bad = yield_rank(a, b)
    if g + bad:
        ranked.append((g / (g + bad), g, bad, off, a, b))
ranked.sort(reverse=True)
print('string-blob ranking (best first):')
for r in ranked[:5]:
    print('   yield=%.3f good=%d bad=%d hdrSlot=%d off=%d size=%d' % r)

best = ranked[0]
ss_off, so, ss = best[3], best[4], best[5]
print('chosen string blob: header slot %d -> off=%d size=%d' % (ss_off, so, ss))

def name_at(idx):
    if not (0 <= idx < ss):
        return None
    end = data.find(b'\x00', so + idx, min(so + ss, so + idx + 200))
    if end < 0:
        return None
    s = data[so + idx:end]
    return s.decode('ascii', 'replace') if ident.match(s) else None

found = []
for off, a, b in pairs:
    if off == ss_off:
        continue
    for st in range(80, 121):
        if b % st:
            continue
        cnt = b // st
        if not (200 <= cnt <= 600000):
            continue
        step = max(1, cnt // 200)
        rng = range(0, cnt, step)
        ok = sum(1 for i in rng if name_at(i32(a + i * st)))
        if ok >= len(rng) * 0.96:
            found.append((ok / len(rng), off, a, b, st, cnt, name_at(i32(a)), name_at(i32(a + (cnt - 1) * st))))
found.sort(reverse=True)
print('type-table candidates: %d' % len(found))
for f in found[:10]:
    print('   yield=%.3f hdrSlot=%d off=%d size=%d stride=%d count=%d first=%r last=%r' % f)
