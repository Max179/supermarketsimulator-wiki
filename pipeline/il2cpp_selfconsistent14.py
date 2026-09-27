#!/usr/bin/env python3
"""v14: the 170271-entry, 12-byte table at 11105620 holds real field names, but its columns are misaligned: the
second column increments by exactly 1 per row and the third looks random. A real field row is
(Il2CppFieldDefinition) { nameIndex, typeIndex, token } and the token of a field is 0x04xxxxxx in the metadata,
so the correct alignment is the one whose third column is mostly 0x04xxxxxx. Scan every shift."""
import struct, sys
P = sys.argv[1]
data = open(P, 'rb').read()
i32 = lambda o: struct.unpack_from('<i', data, o)[0]
u32 = lambda o: struct.unpack_from('<I', data, o)[0]
SO, SS = 918256, 2865150
F_OFF, F_STRIDE, F_CNT = 11105620, 12, 170271

def strict_name(idx):
    if not (0 <= idx < SS) or (idx != 0 and data[SO + idx - 1] != 0):
        return None
    e = data.find(b'\x00', SO + idx, min(SO + SS, SO + idx + 200))
    return data[SO + idx:e].decode('ascii', 'replace') if e > 0 else None

print('scanning alignment shifts (base = %d - shift):' % F_OFF)
best = []
for shift in range(0, 12):
    base = F_OFF - shift
    nrows = min(F_CNT, (13148872 - base) // F_STRIDE)
    sample = range(0, nrows, max(1, nrows // 300))
    names = tok4 = typeOk = 0
    total = 0
    for i in sample:
        e = base + i * F_STRIDE
        total += 1
        if strict_name(i32(e)):
            names += 1
        t = u32(e + 8)
        if (t >> 24) == 4:
            tok4 += 1
        tv = u32(e + 4)
        if tv < 400000:
            typeOk += 1
    best.append((tok4 / total, names / total, typeOk / total, shift, nrows))
    print('   shift=%2d rows=%6d nameStrict=%.3f tokenLike0x04=%.3f typeInRange=%.3f' %
          (shift, nrows, names / total, tok4 / total, typeOk / total))
top = sorted(best, reverse=True)[0]
print('best shift by token-like third column: shift=%d (%.3f)' % (top[3], top[0]))
base = F_OFF - top[3]
for i in [0, 1, 2, 3, 500, 60000, 120000, 170000]:
    e = base + i * F_STRIDE
    print('   row[%6d] name=%-22r typeIndex=%-10d token=0x%08x' % (i, strict_name(i32(e)), u32(e + 4), u32(e + 8)))
