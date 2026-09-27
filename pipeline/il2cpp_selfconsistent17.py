#!/usr/bin/env python3
"""v17: control for v16. A search that finds nothing is only evidence if it can find something, so this plants a
synthetic 16-byte Il2CppType table (enum byte 0x12 at +10, class index at +0) into a COPY of the metadata at an
offset that a real header pair already points to, then runs the identical scan and must report it."""
import struct, sys, os, shutil
P = sys.argv[1]
tmp = os.path.join(os.environ.get('TEMP', '.'), 'planted-metadata.dat')
shutil.copyfile(P, tmp)
data = bytearray(open(tmp, 'rb').read())
a = 3783408            # a real header-pair offset (slot 44)
CNT = 2000
for i in range(CNT):
    e = a + i * 16
    struct.pack_into('<i', data, e, i % 21152)      # class index inside the type table
    data[e + 10] = 0x12                              # Il2CppTypeEnum CLASS
open(tmp, 'wb').write(bytes(data))

def scan(path):
    d = open(path, 'rb').read()
    i32 = lambda o: struct.unpack_from('<i', d, o)[0]
    u8 = lambda o: d[o]
    hits = []
    for o in range(8, 0x400 - 4, 4):
        aa, b = i32(o), i32(o + 4)
        if not (0 < aa < len(d)) or b <= 0:
            continue
        for st in (8, 12, 16, 20, 24, 28, 32):
            for mode in ('count', 'bytes'):
                if mode == 'bytes' and b % st:
                    continue
                cnt = b if mode == 'count' else b // st
                if not (1000 <= cnt <= 400000) or aa + (cnt - 1) * st >= len(d):
                    continue
                step = max(1, cnt // 120)
                rng = range(0, cnt, step)
                for tob in range(0, st):
                    if st == 16 and tob not in (8, 9, 10, 11, 12):
                        continue
                    if st != 16 and tob % 4:
                        continue
                    ok = klassok = klassseen = 0
                    for i in rng:
                        e = aa + i * st
                        t = u8(e + tob)
                        if not (1 <= t <= 0x21):
                            break
                        ok += 1
                        if t in (0x11, 0x12):
                            klassseen += 1
                            if 0 <= i32(e) < 21152:
                                klassok += 1
                    if ok == len(rng) and klassseen > 5 and klassok == klassseen:
                        hits.append((o, aa, st, mode, cnt, tob))
    return hits

h = scan(tmp)
print('planted table found: %s' % (len(h) > 0))
for x in h[:4]:
    print('   slot=%d off=%d stride=%d mode=%s count=%d enumByte@+%d' % x)
os.remove(tmp)
print('control verdict: the scan is capable of finding a table of this shape' if h else 'CONTROL FAILED: the scan cannot find even a planted table')
