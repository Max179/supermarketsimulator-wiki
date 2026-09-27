#!/usr/bin/env python3
"""v7: solve the type-table stride from two UNIQUE names instead of guessing. Every occurrence of
'<Module>' and of '__Il2CppFullySharedGenericStructType' in the file is located as a 32-bit string index.
The first belongs to type[0] only, the last to type[count-1] only, so for the true pair of positions p0 and
pN there is an integer entry count with (pN-p0)=(count-1)*stride. Every (count, stride) that closes is printed."""
import struct, sys
P = sys.argv[1]
data = open(P, 'rb').read(); n = len(data)
i32 = lambda o: struct.unpack_from('<i', data, o)[0]
u16 = lambda o: struct.unpack_from('<H', data, o)[0]
SO, SS = 918256, 2865150
TO = 15573600
FIELDS_CNT = 87732
a_off = data.find(b'<Module>\x00'); z_off = data.find(b'__Il2CppFullySharedGenericStructType\x00')
a_idx, z_idx = a_off - SO, z_off - SO
print('version=%d <Module> string@%d idx=%d ; sentinel string@%d idx=%d' % (i32(4), a_off, a_idx, z_off, z_idx))

def positions(val, lo, hi):
    out = []
    p = lo
    while p < hi - 4:
        q = data.find(struct.pack('<i', val), p, hi)
        if q < 0:
            break
        out.append(q)
        p = q + 1
    return out

lo, hi = TO, TO + 1734464 + 256
ps = [p for p in positions(a_idx, lo, hi) if (p - TO) % 1 == 0]
pz = positions(z_idx, lo, hi)
print('occurrences: first-name idx at %d position(s) %s' % (len(ps), ps[:6]))
print('             last-name  idx at %d position(s) %s' % (len(pz), pz[:6]))
sols = []
for p0 in ps:
    for pN in pz:
        if pN <= p0:
            continue
        d = pN - p0
        for cnt in range(2000, 40001):
            if d % (cnt - 1):
                continue
            st = d // (cnt - 1)
            if 40 <= st <= 200:
                sols.append((cnt, st, p0, pN))
print('solutions (count, stride, p0, pN): %s' % sols[:8])
if not sols:
    sys.exit('no (count,stride) closes')
CNT, ST, P0 = sols[0][0], sols[0][1], sols[0][2]
base = P0 - 0  # nameIndex is the first member of the entry
print('measured: entry count=%d stride=%d nameIndex at +0 -> table base=%d' % (CNT, ST, base))
print('member search on the measured stride:')
for width, rd, lim in (('i32', i32, 4), ('u16', u16, 2)):
    for fo in range(0, ST - lim + 1):
        if width == 'i32' and fo % 4:
            continue
        if width == 'u16' and fo % 2:
            continue
        prev = -1; firstv = None; ok = True
        for i in range(CNT):
            v = rd(base + i * ST + fo)
            if firstv is None:
                firstv = v
            if v < prev or v >= FIELDS_CNT:
                ok = False; break
            prev = v
        if ok and firstv == 0 and prev > 1000:
            print('   fieldStart-like: %s @+%d last=%d' % (width, fo, prev))
for i in (0, 1, 2, CNT // 2, CNT - 1):
    print('   type[%d] fields=%d..%d' % (i, i32(base + i * ST + 8), i32(base + i * ST + 8) + u16(base + i * ST + 8 + 4)))
