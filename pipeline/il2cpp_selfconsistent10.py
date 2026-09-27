#!/usr/bin/env python3
"""v10: two measurements.
(1) Confirm the entry stride independently: in IL2CPP metadata the type names of an image are stored in sorted
    order, so nameIndex must be non-decreasing across the table. Compare strides 82 / 104 / 164 on that test.
(2) Re-search the field pointer without the 87872 bound I used before: a member may be a BYTE OFFSET into a
    4-byte index table, so allow values up to 4x the field count and report multiplicity of 4."""
import struct, sys
P = sys.argv[1]
data = open(P, 'rb').read()
i32 = lambda o: struct.unpack_from('<i', data, o)[0]
SO, SS = 918256, 2865150
TO, END = 15573600, 15573600 + 1734464
FIELDS_CNT = 87732
print('version=%d' % i32(4))

print('(1) stride by nameIndex monotonicity:')
for S in (82, 104, 164):
    cnt = (END - TO) // S
    vals = [i32(TO + i * S) for i in range(cnt)]
    okrange = all(0 <= v < SS for v in vals)
    mono = okrange and all(vals[i] <= vals[i + 1] for i in range(cnt - 1))
    distinct = len(set(vals))
    print('   stride=%d entries=%d inRange=%s monotone=%s distinct=%d min=%d max=%d' %
          (S, cnt, okrange, mono, distinct, min(vals), max(vals)))

S = 82
CNT = (END - TO) // S
print('(2) member search on stride %d, allowing byte-offset-like values:' % S)
caps = (FIELDS_CNT, 4 * FIELDS_CNT, 1_000_000)
for fo in range(0, S - 3, 4):
    vals = [i32(TO + i * S + fo) for i in range(CNT)]
    if any(v < 0 or v > caps[2] for v in vals):
        continue
    mono = all(vals[i] <= vals[i + 1] for i in range(CNT - 1))
    if not mono or vals[0] != 0:
        continue
    mult4 = all(v % 4 == 0 for v in vals)
    print('   +%d last=%d allMultipleOf4=%s within4xFields=%s' % (fo, vals[-1], mult4, vals[-1] < caps[1]))
print('(2b) members that are merely non-decreasing (any first value):')
for fo in range(0, S - 3, 4):
    vals = [i32(TO + i * S + fo) for i in range(CNT)]
    if all(vals[i] <= vals[i + 1] for i in range(CNT - 1)):
        print('   +%d first=%d last=%d stepMean=%.1f' % (fo, vals[0], vals[-1], (vals[-1] - vals[0]) / max(1, CNT)))
