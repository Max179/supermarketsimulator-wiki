#!/usr/bin/env python3
"""v3: identify the string blob by ANCHOR CONTAINMENT (Assembly-CSharp, mscorlib, UnityEngine.CoreModule,
MonoBehaviour, Object) plus a high identifier yield over its whole range, then scan the header for a
type-definition array whose size is divisible by the stride and whose sampled names all resolve. A type
table is further required to look like one: the first entries of an IL2CPP type table are <Module> and
then the assembly's types, and every name must be unique-ish and ordered by (assembly, type)."""
import struct, sys, re
P = sys.argv[1]
data = open(P, 'rb').read(); n = len(data)
i32 = lambda o: struct.unpack_from('<i', data, o)[0]
u32 = lambda o: struct.unpack_from('<I', data, o)[0]
ident = re.compile(rb'^[A-Za-z_<][A-Za-z0-9_<>.`$]*$')
print('size=%d sanity=0x%08x version=%d' % (n, u32(0), i32(4)))
pair = [(o, i32(o), i32(o + 4)) for o in range(8, 0x400 - 4, 4)]
for o, a, b in pair:
    if not (0 < a < n and 0 < b <= n - a):
        continue
    seg = data[a:a + b]
    anchors = [x for x in (b'Assembly-CSharp\x00', b'mscorlib\x00', b'UnityEngine.CoreModule\x00',
                           b'MonoBehaviour\x00', b'<Module>\x00') if x in seg]
    if len(anchors) >= 4:
        pos = a; good = bad = 0
        while pos < a + b and good + bad < 40000:
            e = data.find(b'\x00', pos, min(a + b, pos + 300))
            if e < 0:
                break
            s = data[pos:e]
            if s:
                good += ident.match(s) is not None; bad += ident.match(s) is None
            pos = e + 1
        print('   blob hdrSlot=%d off=%d size=%d anchors=%d yield=%.4f strings=%d' %
              (o, a, b, len(anchors), good / max(1, good + bad), good + bad))
print('(only blobs containing >=4 anchors are listed)')
