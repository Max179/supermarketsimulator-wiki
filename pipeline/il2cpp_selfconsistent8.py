#!/usr/bin/env python3
"""v8: dump the first entries of the measured 82-byte type definition so the field pointer can be read off
directly instead of guessed, and test each 4-byte member over the whole table for the two properties a field
start must have: values stay inside the fields table when read as a start, and the sum of the field counts
equals the fields table size."""
import struct, sys
P = sys.argv[1]
data = open(P, 'rb').read()
i32 = lambda o: struct.unpack_from('<i', data, o)[0]
u16 = lambda o: struct.unpack_from('<H', data, o)[0]
u32 = lambda o: struct.unpack_from('<I', data, o)[0]
TO, ST, CNT, FIELDS_CNT = 15573600, 82, 21152, 87732
SO, SS = 918256, 2865150
def name_at(idx):
    e = data.find(b'\x00', SO + idx, min(SO + SS, SO + idx + 200)) if 0 <= idx < SS else -1
    return data[SO + idx:e].decode('ascii', 'replace') if e > 0 else None
print('--- raw entries (i32 members) ---')
for i in range(3):
    b = TO + i * ST
    print('type[%d] name=%r' % (i, name_at(i32(b))))
    print('   i32: ' + ' '.join('%d:%d' % (k, i32(b + k)) for k in range(0, ST - 3, 4)))
    print('   u16: ' + ' '.join('%d:%d' % (k, u16(b + k)) for k in range(0, ST - 1, 2)))
print('--- candidate fieldStart (i32 must be a valid start; counts must sum to %d) ---' % FIELDS_CNT)
for fo in range(0, ST - 3, 4):
    vals = [i32(TO + i * ST + fo) for i in range(CNT)]
    if any(v < 0 or v >= FIELDS_CNT for v in vals):
        continue
    mono = all(vals[i] <= vals[i + 1] for i in range(CNT - 1))
    print('   +%d range=%d..%d monotone=%s' % (fo, min(vals), max(vals), mono))
print('--- candidate fieldCount (u16 sum must be %d) ---' % FIELDS_CNT)
for co in range(0, ST - 1, 2):
    vals = [u16(TO + i * ST + co) for i in range(CNT)]
    if sum(vals) == FIELDS_CNT:
        print('   +%d sum=%d' % (co, sum(vals)))
