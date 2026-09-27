#!/usr/bin/env python3
"""v13: with the real field total (170271 = 2043252/12, and the table tiles exactly to the next table start),
re-run the two tests that failed under the wrong total: does any member of the 82-byte type record sum to the
field count, and is any member a non-decreasing field-start whose last value stays inside the table?"""
import struct, sys
P = sys.argv[1]
data = open(P, 'rb').read()
i32 = lambda o: struct.unpack_from('<i', data, o)[0]
u32 = lambda o: struct.unpack_from('<I', data, o)[0]
u16 = lambda o: struct.unpack_from('<H', data, o)[0]
TO, ST, TC = 15573600, 82, 21152
F_OFF, F_STRIDE, F_CNT = 11105620, 12, 170271
print('tiling check: %d + %d * %d = %d (next table starts at 13148872)' %
      (F_OFF, F_STRIDE, F_CNT, F_OFF + F_STRIDE * F_CNT))
print('field string-start sanity: first 6 names + sample at 1/4, 1/2, 3/4 of the table')
SO, SS = 918256, 2865150
def name_at(idx):
    if not (0 <= idx < SS) or (idx != 0 and data[SO + idx - 1] != 0):
        return None
    e = data.find(b'\x00', SO + idx, min(SO + SS, SO + idx + 200))
    return data[SO + idx:e].decode('ascii', 'replace') if e > 0 else None
for i in [0, 1, 2, 3, 4, 5, F_CNT // 4, F_CNT // 2, (3 * F_CNT) // 4, F_CNT - 1]:
    e = F_OFF + i * F_STRIDE
    print('   field[%6d] name=%r typeIndex=%d token=0x%x' % (i, name_at(i32(e)), i32(e + 4), u32(e + 8)))

print('sum test against %d:' % F_CNT)
for width, rd in (('u32', u32), ('u16', u16)):
    for fo in range(0, ST - (3 if width == 'u32' else 1), 2):
        if width == 'u32' and fo % 4:
            continue
        vals = [rd(TO + i * ST + fo) for i in range(TC)]
        s = sum(vals)
        if abs(s - F_CNT) <= 200:
            print('   %s +%d sums to %d (delta %d)' % (width, fo, s, s - F_CNT))

print('field-start test (non-decreasing, first 0, last < %d):' % F_CNT)
for width, rd, lim in (('i32', i32, 4), ('u16', u16, 2)):
    for fo in range(0, ST - lim + 1, lim):
        vals = [rd(TO + i * ST + fo) for i in range(TC)]
        if any(v < 0 or v >= F_CNT for v in vals):
            continue
        mono = all(vals[i] <= vals[i + 1] for i in range(TC - 1))
        if mono and vals[0] == 0:
            print('   %s +%d last=%d MONOTONE' % (width, fo, vals[-1]))
print('done')
