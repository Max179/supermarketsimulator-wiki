#!/usr/bin/env python3
"""Plant a synthetic Il2CppType table of the size the header pair advertises, so the full-file scan is given a
table it must find. Planted at offset 3783408 (header slot 44) with enum byte 0x12 at +10 and a class index at +0."""
import struct, sys, shutil
src, dst = sys.argv[1], sys.argv[2]
shutil.copyfile(src, dst)
data = bytearray(open(dst, 'rb').read())
a = struct.unpack_from('<i', data, 44)[0]
cnt = struct.unpack_from('<i', data, 48)[0]
for i in range(cnt):
    e = a + i * 16
    if e + 16 > len(data):
        break
    struct.pack_into('<i', data, e, i % 21152)
    data[e + 10] = 0x12
open(dst, 'wb').write(bytes(data))
print('planted %d rows at %d' % (cnt, a))
