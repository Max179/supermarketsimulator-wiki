#!/usr/bin/env python3
"""Which characters keep 304 type names out of the strict identifier rule? Report the offending characters and
sample names so the rule can be widened by measurement instead of being loosened blindly."""
import struct, sys, re
MD = sys.argv[1]
data = open(MD, 'rb').read()
i32 = lambda o: struct.unpack_from('<i', data, o)[0]
SO, SS = 918256, 2865150
TO, ST, TC = 15573600, 82, 21152
ident = re.compile(rb'^[A-Za-z_<][A-Za-z0-9_<>|.`$]*$')
def raw(idx):
    e = data.find(b'\x00', SO + idx, min(SO + SS, SO + idx + 300))
    return data[SO + idx:e] if 0 <= idx < SS and e > 0 else None
badchars = {}
samples = []
for i in range(TC):
    s = raw(i32(TO + i * ST))
    if s is None or ident.match(s):
        continue
    if len(samples) < 8:
        samples.append(s)
    for b in s:
        if not re.match(rb'[A-Za-z0-9_<>|.`$]', bytes([b])):
            badchars[chr(b)] = badchars.get(chr(b), 0) + 1
print('unresolved samples: %s' % samples)
print('offending characters: %s' % sorted(badchars.items(), key=lambda kv: -kv[1]))
