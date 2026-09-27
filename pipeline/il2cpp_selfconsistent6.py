#!/usr/bin/env python3
"""v6: constrain the type-table stride from the gap to the next table instead of assuming the entry count.
For each candidate stride S, the table can hold (END-TO)//S entries; the true S is the one for which a
large sample of those entries resolves to C# identifiers. Then, on the true stride, search for the member
that behaves like a field start (non-decreasing, first 0, last < fields count) under both i32 and u16."""
import struct, sys, re
P = sys.argv[1]
data = open(P, 'rb').read(); n = len(data)
i32 = lambda o: struct.unpack_from('<i', data, o)[0]
u16 = lambda o: struct.unpack_from('<H', data, o)[0]
ident = re.compile(rb'^[A-Za-z_<][A-Za-z0-9_<>.`$]*$')
SO, SS = 918256, 2865150
TO, END = 15573600, 15573600 + 1734464
FIELDS_OFF, FIELDS_CNT = 11017888, 87732
print('version=%d typeTableStart=%d nextTableStart=%d gapsize=%d fields=%d' % (i32(4), TO, END, END - TO, FIELDS_CNT))

def name_at(idx):
    if not (0 <= idx < SS):
        return None
    e = data.find(b'\x00', SO + idx, min(SO + SS, SO + idx + 200))
    if e < 0:
        return None
    s = data[SO + idx:e]
    return s.decode('ascii', 'replace') if ident.match(s) else None

print('stride from the gap (yield over the whole table):')
rank = []
for S in range(78, 201):
    cnt = (END - TO) // S
    if cnt < 100:
        continue
    step = max(1, cnt // 400)
    rng = range(0, cnt, step)
    ok = sum(1 for i in rng if name_at(i32(TO + i * S)))
    rank.append((ok / len(rng), S, cnt))
rank.sort(reverse=True)
for r in rank[:6]:
    print('   stride=%d entries=%d nameYield=%.4f' % (r[1], r[2], r[0]))
if not rank or rank[0][0] < 0.9:
    sys.exit('no stride resolves; the type table is not a fixed-stride array at this offset')
S, CNT = rank[0][1], rank[0][2]
print('chosen stride=%d entries=%d' % (S, CNT))
print('field-start member search (non-decreasing, starts 0, last < %d):' % FIELDS_CNT)
for width, rd in (('i32', i32), ('u16', u16)):
    for fo in range(0, S - (4 if width == 'i32' else 2)):
        if width == 'i32' and fo % 4:
            continue
        prev = -1; firstv = None; ok = True
        for i in range(CNT):
            v = rd(TO + i * S + fo)
            if firstv is None:
                firstv = v
            if v < prev or v >= FIELDS_CNT:
                ok = False; break
            prev = v
        if ok and firstv == 0 and prev > 1000:
            print('   %s @+%d last=%d' % (width, fo, prev))
