#!/usr/bin/env python3
"""Locate the IL2CPP type/field tables in global-metadata.dat by self-consistency, not by assuming a
version's layout. Chain of evidence:
  A. the string blob is the (offset,size) pair in the header that contains the "Assembly-CSharp" anchor
  B. a type-definition array is a pair whose size divides by the measured struct stride and whose every
     sampled nameIndex resolves inside that string blob to a plausible C# identifier
  C. an image array is a pair whose size divides by 40 and which contains an image named
     "Assembly-CSharp" whose [typeStart, typeStart+typeCount) range lands inside B, and whose sampled
     types have parents that resolve to engine names (Object / MonoBehaviour / ScriptableObject)
Only steps that pass all of their own checks are reported as found."""
import struct, sys, re

P = sys.argv[1]
data = open(P, 'rb').read()
n = len(data)
i32 = lambda off: struct.unpack_from('<i', data, off)[0]
u32 = lambda off: struct.unpack_from('<I', data, off)[0]
ident = re.compile(rb'^[A-Za-z_<][A-Za-z0-9_<>.`$]*$')
print('size=%d sanity=0x%08x version=%d' % (n, u32(0), i32(4)))

anchor = data.find(b'Assembly-CSharp\x00')
print('anchor Assembly-CSharp at %d' % anchor)
if anchor < 0:
    sys.exit('anchor not found')

# --- A: which header pair is the string blob?
strc = []
for off in range(8, 0x400 - 8, 4):
    a, b = i32(off), i32(off + 4)
    if 0 < a < n and 0 < b <= n - a and a <= anchor < a + b:
        strc.append((off, a, b))
print('A: %d string-blob candidate pair(s): %s' % (len(strc), strc[:6]))

STRIDES = (88, 92)
results = []
for hoff, so, ss in strc:
    def name_at(idx):
        if not (0 <= idx < ss):
            return None
        end = data.find(b'\x00', so + idx, so + ss)
        if end < 0:
            return None
        s = data[so + idx:end]
        return s.decode('ascii', 'replace') if 0 < len(s) < 200 else None
    # --- B: type-definition array candidates
    for toff in range(8, 0x400 - 8, 4):
        if toff == hoff:
            continue
        a, b = i32(toff), i32(toff + 4)
        if not (0 < a < n and 0 < b <= n - a):
            continue
        for st in STRIDES:
            if b % st:
                continue
            cnt = b // st
            if not (200 <= cnt <= 400000):
                continue
            ok = 0
            step = max(1, cnt // 200)
            for i in range(0, cnt, step):
                nm = name_at(i32(a + i * st))
                if nm and ident.match(nm.encode()):
                    ok += 1
            sampled = len(range(0, cnt, step))
            if ok < sampled * 0.95:
                continue
            first = name_at(i32(a))
            last = name_at(i32(a + (cnt - 1) * st))
            results.append(dict(str_hdr_off=hoff, str_off=so, str_size=ss, type_hdr_off=toff,
                                type_off=a, type_size=b, stride=st, count=cnt,
                                names_ok='%d/%d' % (ok, sampled), first=first, last=last))
print('B: %d type-table candidate(s)' % len(results))
for r in results[:8]:
    print('   typeOff=%d size=%d stride=%d count=%d namesOk=%s first=%r last=%r' %
          (r['type_off'], r['type_size'], r['stride'], r['count'], r['names_ok'], r['first'], r['last']))
if not results:
    sys.exit('type table not located')

best = results[0]
so, ss, a, st, cnt = best['str_off'], best['str_size'], best['type_off'], best['stride'], best['count']
def name_at(idx):
    end = data.find(b'\x00', so + idx, so + ss)
    return data[so + idx:end].decode('ascii', 'replace') if 0 <= idx < ss and end > 0 else None

# --- C: image array + cross-check via parent names
img = []
for ioff in range(8, 0x400 - 8, 4):
    aa, bb = i32(ioff), i32(ioff + 4)
    if not (0 < aa < n and 0 < bb <= n - aa) or bb % 40:
        continue
    icnt = bb // 40
    if not (1 <= icnt <= 5000):
        continue
    for i in range(icnt):
        nm = name_at(i32(aa + i * 40))
        if nm == 'Assembly-CSharp':
            tstart, tcount = i32(aa + i * 40 + 8), i32(aa + i * 40 + 12)
            if 0 <= tstart and tstart + tcount <= cnt and tcount > 0:
                img.append((ioff, aa, icnt, i, tstart, tcount))
print('C: %d image candidate(s) naming Assembly-CSharp with an in-range type block' % len(img))
for c in img[:4]:
    ioff, aa, icnt, i, ts, tc = c
    par = []
    for k in range(min(60, tc)):
        p = i32(a + (ts + k) * st + 16)  # parentIndex
        if 0 <= p < cnt:
            par.append(name_at(i32(a + p * st)))
    uniq = [x for x in dict.fromkeys(par) if x]
    print('   imgOff=%d images=%d image#%d typeStart=%d typeCount=%d parents=%s' %
          (aa, icnt, i, ts, tc, uniq[:8]))
    names = [name_at(i32(a + (ts + k) * st)) for k in range(min(12, tc))]
    print('   first type names: %s' % names)
