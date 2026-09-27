#!/usr/bin/env python3
"""v16: locate the Il2CppType table. No layout is assumed: for every header (offset, value) pair, every stride
8..32 and every byte position inside the row, the entry must satisfy (a) the Il2CppTypeEnum byte is in 1..0x21
for ALL sampled entries and (b) for CLASS (0x12) / VALUETYPE (0x11) entries the index at +0 is inside the
measured type-definition table (21152). Both must hold for the whole sample, which a wrong stride cannot do."""
import struct, sys, collections
P = sys.argv[1]
data = open(P, 'rb').read(); n = len(data)
i32 = lambda o: struct.unpack_from('<i', data, o)[0]
u8 = lambda o: data[o]
TC = 21152
print('version=%d size=%d types=%d' % (i32(4), n, TC))
TYPES = (0x11, 0x12)
hits = []
for o in range(8, 0x400 - 4, 4):
    a, b = i32(o), i32(o + 4)
    if not (0 < a < n) or b <= 0:
        continue
    for st in (8, 12, 16, 20, 24, 28, 32):
        for mode in ('count', 'bytes'):
            if mode == 'bytes' and b % st:
                continue
            cnt = b if mode == 'count' else b // st
            if not (1000 <= cnt <= 400000):
                continue
            if a + (cnt - 1) * st >= n:
                continue
            step = max(1, cnt // 120)
            rng = range(0, cnt, step)
            for tob in range(0, st):
                if st == 16 and tob not in (8, 9, 10, 11, 12):
                    continue
                if st != 16 and tob % 4:
                    continue
                oktypes = klassok = klassseen = 0
                for i in rng:
                    e = a + i * st
                    t = u8(e + tob)
                    if not (1 <= t <= 0x21):
                        break
                    oktypes += 1
                    if t in TYPES:
                        klassseen += 1
                        v = i32(e)
                        if 0 <= v < TC:
                            klassok += 1
                if oktypes == len(rng) and klassseen > 5 and klassok == klassseen:
                    hits.append((o, a, b, st, mode, cnt, tob, klassseen))
print('candidates: %d' % len(hits))
for h in hits[:12]:
    print('   slot=%d off=%d raw=%d stride=%d mode=%s count=%d enumByte@+%d klassSeen=%d' % h)
if not hits:
    print('   none: the Il2CppType table is not a fixed-stride array with a valid enum byte at any tested position')
    print('   control: what a wrong stride looks like is not needed - the test requires 120/120 sampled entries')
