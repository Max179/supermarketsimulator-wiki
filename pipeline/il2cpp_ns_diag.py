#!/usr/bin/env python3
"""Diagnose the namespaceIndex member: how many entries are 0, out of range, or fail to resolve, and what the
raw strings actually look like. Also check whether string index 0 being 'Assembly-CSharp' can leak into the
namespace field."""
import struct, sys, re
MD = sys.argv[1]
data = open(MD, 'rb').read()
i32 = lambda o: struct.unpack_from('<i', data, o)[0]
SO, SS = 918256, 2865150
TO, ST, TC = 15573600, 82, 21152
ident = re.compile(rb'^[A-Za-z_<][A-Za-z0-9_<>.`$]*$')
def raw(idx):
    if not (0 <= idx < SS):
        return None
    e = data.find(b'\x00', SO + idx, min(SO + SS, SO + idx + 200))
    return data[SO + idx:e] if e > 0 else None
print('string[0..5] = %s' % [raw(i) for i in (0, 12, 16, 20, 24)])
zero = oor = unres = res = 0
samples = []
for i in range(TC):
    v = i32(TO + i * ST + 4)
    if v == 0:
        zero += 1
    elif not (0 <= v < SS):
        oor += 1
        if len(samples) < 5:
            samples.append((i, v, None))
    else:
        s = raw(v)
        if s is not None and ident.match(s):
            res += 1
        else:
            unres += 1
            if len(samples) < 5:
                samples.append((i, v, s))
print('namespaceIndex: zero=%d out-of-range=%d resolves=%d unresolved=%d' % (zero, oor, res, unres))
print('samples of unresolved: %s' % samples)
# same diagnostic for the name member, to compare
nz = noor = nunres = nres = 0
nsamples = []
for i in range(TC):
    v = i32(TO + i * ST)
    if v == 0:
        nz += 1
    elif not (0 <= v < SS):
        noor += 1
    else:
        s = raw(v)
        if s is not None and ident.match(s):
            nres += 1
        else:
            nunres += 1
            if len(nsamples) < 5:
                nsamples.append((i, v, s))
print('nameIndex:      zero=%d out-of-range=%d resolves=%d unresolved=%d' % (nz, noor, nres, nunres))
print('samples of unresolved names: %s' % nsamples)
