#!/usr/bin/env python3
"""v15: if +8 is a field start index, then start[i+1]-start[i] is that type's field count: a small integer,
non-negative everywhere except at block boundaries. Measure the difference distribution and locate violations
instead of asserting monotonicity over the whole table."""
import struct, sys, collections
P = sys.argv[1]
data = open(P, 'rb').read()
i32 = lambda o: struct.unpack_from('<i', data, o)[0]
TO, ST, TC = 15573600, 82, 21152
F_CNT = 170271
for fo in (8, 12, 16, 20, 24, 28):
    vals = [i32(TO + i * ST + fo) for i in range(TC)]
    diffs = [vals[i + 1] - vals[i] for i in range(TC - 1)]
    neg = sum(1 for d in diffs if d < 0)
    small = sum(1 for d in diffs if 0 <= d <= 32)
    zero = sum(1 for d in diffs if d == 0)
    big = sum(1 for d in diffs if d > 32)
    pos = [v for v in vals if v >= 0]
    print('+%-2d min=%-9d max=%-9d neg=%5d zero=%5d small(0..32)=%5d big=%5d first=%d last=%d' %
          (fo, min(vals), max(vals), neg, zero, small, big, vals[0], vals[-1]))
    if fo == 8:
        top = collections.Counter(diffs).most_common(8)
        print('   most common deltas: %s' % top)
        vi = [i for i, d in enumerate(diffs) if d < 0][:6]
        print('   first negative-delta positions: %s' % [(i, vals[i], vals[i + 1]) for i in vi])
        print('   sum of positive deltas=%d (field table rows=%d)' % (sum(d for d in diffs if d > 0), F_CNT))
        print('   sample deltas 0..14: %s' % diffs[:14])
        print('   sample at 1/4, 1/2, 3/4: %s' % [diffs[TC // 4], diffs[TC // 2], diffs[3 * TC // 4]])
