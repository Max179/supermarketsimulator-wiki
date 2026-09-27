#!/usr/bin/env python3
"""v9: locate the images table and the Il2CppType table.
Images: entries of 40 bytes; every nameIndex must resolve in the measured string blob, typeStart must be
non-decreasing from 0 and the ranges must partition the 21152 type definitions exactly.
Types: entries of 16 bytes; the Il2CppTypeEnum byte (searched, not assumed, over offsets 8..12) must be in
1..0x21 for every entry, and for CLASS/VALUETYPE entries the klassIndex at +0 must be < 21152."""
import struct, sys, re
P = sys.argv[1]
data = open(P, 'rb').read(); n = len(data)
i32 = lambda o: struct.unpack_from('<i', data, o)[0]
u8 = lambda o: data[o]
ident = re.compile(rb'^[A-Za-z_<][A-Za-z0-9_<>.`$]*$')
SO, SS = 918256, 2865150
TO, TC = 15573600, 21152
print('version=%d types=%d' % (i32(4), TC))

def name_at(idx):
    if not (0 <= idx < SS):
        return None
    e = data.find(b'\x00', SO + idx, min(SO + SS, SO + idx + 200))
    if e < 0:
        return None
    s = data[SO + idx:e]
    return s.decode('ascii', 'replace') if ident.match(s) else None

print('--- images table candidates (40-byte entries; ranges must partition %d types) ---' % TC)
imgs = []
for o in range(8, 0x400, 4):
    a, b = i32(o), i32(o + 4)
    if not (0 < a < n) or not (2 <= b <= 5000) or a + b * 40 > n:
        continue
    starts = []; counts = []; ok = True
    for i in range(b):
        e = a + i * 40
        if not name_at(i32(e)):
            ok = False; break
        starts.append(i32(e + 8)); counts.append(i32(e + 12))
    if not ok:
        continue
    if starts[0] != 0 or any(x < 0 for x in starts + counts):
        continue
    if any(starts[i] + counts[i] > starts[i + 1] for i in range(b - 1)):
        continue
    if starts[-1] + counts[-1] != TC:
        continue
    imgs.append((o, a, b, starts, counts))
print('images candidates: %d' % len(imgs))
for o, a, b, st, ct in imgs[:3]:
    names = [name_at(i32(a + i * 40)) for i in range(min(b, 400))]
    interesting = [nm for nm in names if nm and ('Assembly-CSharp' in nm or nm in ('mscorlib', 'System', 'UnityEngine', 'UnityEngine.CoreModule'))]
    print('   slot=%d off=%d images=%d covered=%d..%d sample=%s' %
          (o, a, b, st[0], st[-1] + ct[-1], [nm for nm in names[:5]]))
    print('   named=%s' % interesting[:6])
    if 'Assembly-CSharp' in names:
        k = names.index('Assembly-CSharp')
        print('   Assembly-CSharp is image #%d: types %d..%d' % (k, st[k], st[k] + ct[k] - 1))

print('--- Il2CppType table candidates (16-byte entries; enum byte searched 8..12) ---')
for o in range(8, 0x400, 4):
    a, b = i32(o), i32(o + 4)
    if not (0 < a < n) or not (100 <= b <= 400000) or a + b * 16 > n:
        continue
    for tb in (8, 9, 10, 11, 12):
        good = klass_ok = klass_seen = 0
        for i in range(b):
            e = a + i * 16
            t = u8(e + tb)
            if not (1 <= t <= 0x21):
                break
            good += 1
            if t in (0x11, 0x12):
                klass_seen += 1
                k = i32(e)
                if 0 <= k < TC:
                    klass_ok += 1
        if good == b and klass_seen > 100 and klass_ok == klass_seen:
            print('   slot=%d off=%d count=%d enumByte@+%d all-valid klassOk=%d/%d' % (o, a, b, tb, klass_ok, klass_seen))
