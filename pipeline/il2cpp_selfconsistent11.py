#!/usr/bin/env python3
"""v11: (a) find the field-count member by SUM (sum over all types must equal the fields-table count), which does
not assume monotonicity; (b) test the classic partition property start[i]+count[i]==start[i+1] for every member
pair, which also does not assume monotonicity; (c) extract the field names the game defines from the measured
fields table (12-byte entries at 11017888) - that table is data in its own right even while the type mapping is
open, so it is extracted with provenance rather than discarded."""
import struct, sys, re, json
P = sys.argv[1]; OUT = sys.argv[2]
data = open(P, 'rb').read()
i32 = lambda o: struct.unpack_from('<i', data, o)[0]
u32 = lambda o: struct.unpack_from('<I', data, o)[0]
u16 = lambda o: struct.unpack_from('<H', data, o)[0]
SO, SS = 918256, 2865150
TO, ST, TC = 15573600, 82, 21152
FIELDS_OFF, FIELDS_CNT = 11017888, 87732
ident = re.compile(rb'^[A-Za-z_<][A-Za-z0-9_<>|.`$]*$')
print('version=%d types=%d fields=%d' % (i32(4), TC, FIELDS_CNT))

print('(a) member whose u32 sum over all types equals %d:' % FIELDS_CNT)
for fo in range(0, ST - 3, 4):
    s = sum(u32(TO + i * ST + fo) for i in range(TC))
    if abs(s - FIELDS_CNT) <= 50:
        print('   +%d sum=%d (delta %d)' % (fo, s, s - FIELDS_CNT))
print('   (no line above means no member sums to the fields count)')

print('(b) partition property start[i]+count[i]==start[i+1]:')
memb = list(range(0, ST - 3, 4))
found = []
for s in memb:
    vs = [i32(TO + i * ST + s) for i in range(TC)]
    for c in memb:
        if c == s:
            continue
        for width in ('u32', 'u16'):
            ok = 0
            for i in range(0, TC - 1, 7):
                nxt = vs[i + 1]
                cnt = u32(TO + i * ST + c) if width == 'u32' else u16(TO + i * ST + c)
                if 0 <= cnt < 4096 and vs[i] + cnt == nxt:
                    ok += 1
            if ok >= 1200:
                found.append((s, c, width, ok))
print('   pairs passing (sampled every 7th type): %s' % found[:6])
if not found:
    print('   none')

print('(c) extracting the field names from the measured fields table')
def name_at(idx):
    if not (0 <= idx < SS):
        return None
    e = data.find(b'\x00', SO + idx, min(SO + SS, SO + idx + 300))
    if e < 0:
        return None
    s = data[SO + idx:e]
    return s.decode('ascii', 'replace') if ident.match(s) else None
fields = []
unres = 0
for i in range(FIELDS_CNT):
    e = FIELDS_OFF + i * 12
    nm = name_at(i32(e))
    if nm is None:
        unres += 1
        continue
    fields.append({'name': nm, 'typeIndex': i32(e + 4)})
distinct = sorted({f['name'] for f in fields})
print('   fields resolved=%d unresolved=%d distinctNames=%d' % (len(fields), unres, len(distinct)))
print('   samples=%s' % [f['name'] for f in fields[:8]])
print('   distinct samples=%s' % distinct[:8])
dupfreq = {}
for f in fields:
    dupfreq[f['name']] = dupfreq.get(f['name'], 0) + 1
top = sorted(dupfreq.items(), key=lambda kv: -kv[1])[:8]
print('   most repeated field names=%s' % top)
json.dump({'fieldCount': FIELDS_CNT, 'resolved': len(fields), 'unresolved': unres,
           'distinctCount': len(distinct), 'distinctNames': distinct,
           'typeIndexSamples': [f['typeIndex'] for f in fields[:8]]},
          open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
print('   wrote %s' % OUT)
