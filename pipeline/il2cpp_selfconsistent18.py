#!/usr/bin/env python3
"""v18: debug why the planted-table control failed. Print the header pair value, the planted bytes, and the
per-condition counts for the exact (stride, byte, mode) that should match."""
import struct, sys, os, shutil
P = sys.argv[1]
tmp = os.path.join(os.environ.get('TEMP', '.'), 'planted-metadata.dat')
shutil.copyfile(P, tmp)
data = bytearray(open(tmp, 'rb').read())
i32 = lambda d, o: struct.unpack_from('<i', d, o)[0]
print('slot 44: value=%d next=%d' % (i32(data, 44), i32(data, 48)))
print('slot 40: value=%d next=%d' % (i32(data, 40), i32(data, 44)))
a = i32(data, 44); b = i32(data, 48)
print('so the pair is (offset=%d, raw=%d)' % (a, b))
CNT = 16000
for i in range(CNT):
    e = a + i * 16
    if e + 16 <= len(data):
        struct.pack_into('<i', data, e, i % 21152)
        data[e + 10] = 0x12
open(tmp, 'wb').write(bytes(data))
d = open(tmp, 'rb').read()
print('planted bytes check: rows 0,1,1000 -> enumByte=%s index=%s' %
      ([d[a + i * 16 + 10] for i in (0, 1, 1000)], [i32(d, a + i * 16) for i in (0, 1, 1000)]))
for st in (16,):
    for mode in ('count', 'bytes'):
        if mode == 'bytes' and b % st:
            print('mode=%s skipped (b %% %d = %d)' % (mode, st, b % st))
            continue
        cnt = b if mode == 'count' else b // st
        step = max(1, cnt // 120)
        rng = list(range(0, cnt, step))
        for tob in (8, 9, 10, 11, 12):
            ok = klassok = klassseen = 0
            fail_at = None
            for i in rng:
                e = a + i * st
                t = d[e + tob]
                if not (1 <= t <= 0x21):
                    fail_at = (i, t)
                    break
                ok += 1
                if t in (0x11, 0x12):
                    klassseen += 1
                    if 0 <= i32(d, e) < 21152:
                        klassok += 1
            print('  mode=%s cnt=%d step=%d tob=%d sampled=%d ok=%d klassseen=%d klassok=%d fail_at=%s' %
                  (mode, cnt, step, tob, len(rng), ok, klassseen, klassok, fail_at))
os.remove(tmp)
