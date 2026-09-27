#!/usr/bin/env python3
"""v5: the type table is at 15573600 with 21152 entries (first=<Module>, last=__Il2CppFullySharedGenericStructType).
Measure the entry stride and the fieldStart member by requiring, across all 21152 entries, that fieldStart is
non-decreasing, starts at 0 and its last value plus that type's field_count matches the fields table size.
Then locate the fields table from the header under the same name-resolution test."""
import struct, sys, re
P = sys.argv[1]
data = open(P, 'rb').read(); n = len(data)
i32 = lambda o: struct.unpack_from('<i', data, o)[0]
u16 = lambda o: struct.unpack_from('<H', data, o)[0]
u32 = lambda o: struct.unpack_from('<I', data, o)[0]
ident = re.compile(rb'^[A-Za-z_<][A-Za-z0-9_<>.`$]*$')
SO, SS = 918256, 2865150
TO, TC = 15573600, 21152
print('version=%d typeTable=(%d,%d)' % (i32(4), TO, TC))

def name_at(idx):
    if not (0 <= idx < SS):
        return None
    e = data.find(b'\x00', SO + idx, min(SO + SS, SO + idx + 200))
    if e < 0:
        return None
    s = data[SO + idx:e]
    return s.decode('ascii', 'replace') if ident.match(s) else None

# total fields from the header: a pair whose "count" equals the number of 12-byte field entries whose
# nameIndex all resolve, searched over header slots.
fields_off = fields_cnt = None
for o in range(8, 0x400 - 4, 4):
    a, b = i32(o), i32(o + 4)
    if not (0 < a < n) or not (100 <= b <= 400000):
        continue
    if a + b * 12 > n:
        continue
    step = max(1, b // 150)
    rng = range(0, b, step)
    ok = sum(1 for i in rng if name_at(i32(a + i * 12)))
    if ok >= len(rng) * 0.95:
        print('   fields-table candidate slot=%d off=%d count=%d nameYield=%.3f' % (o, a, b, ok / len(rng)))
        if fields_off is None:
            fields_off, fields_cnt = a, b

print('stride measurement (fieldStart must be non-decreasing from 0):')
best = []
for S in range(78, 100):
    if TO + TC * S > n:
        continue
    for fo in range(8, S - 3, 4):
        prev = -1; ok = True; firstv = None
        for i in range(TC):
            v = i32(TO + i * S + fo)
            if firstv is None:
                firstv = v
            if v < prev:
                ok = False; break
            prev = v
        if ok and firstv == 0:
            best.append((S, fo, prev))
for b in best:
    extra = ''
    if fields_cnt:
        # the type with the largest fieldStart should end at fields_cnt
        for i in range(TC - 1, -1, -1):
            if i32(TO + i * b[0] + b[1]) == b[2]:
                for co in range(b[1] + 4, min(b[0], b[1] + 40), 2):
                    if u16(TO + i * b[0] + co) > 0 and b[2] + u16(TO + i * b[0] + co) == fields_cnt:
                        extra = ' | fieldStart %d + fieldCount(u16@+%d)=%d == fieldsCount %d' % (b[2], co - b[1], fields_cnt, fields_cnt)
                        break
                break
    print('   stride=%d fieldStart@+%d last=%d%s' % (b[0], b[1], b[2], extra))
if best:
    S, fo, last = best[0]
    print('chosen stride=%d fieldStart@+%d' % (S, fo))
    for i in list(range(0, 6)) + [TC // 2, TC - 3, TC - 2, TC - 1]:
        nm = name_at(i32(TO + i * S))
        fs = i32(TO + i * S + fo)
        fc = u16(TO + i * S + fo + 4)
        print('   type[%d] %-42s fields=%d..%d' % (i, nm, fs, fs + fc))
