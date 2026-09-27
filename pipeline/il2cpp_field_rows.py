#!/usr/bin/env python3
"""Extract the field rows of Supermarket Simulator from the measured IL2CPP field table.

Measured shape: offset 11105620, 12-byte rows, 170271 rows; 11105620 + 12*170271 = 13148872 which is exactly the
start of the next table (tiling). Column +0 is a name index that passes the STRICT rule (points at the start of a
string) for 100% of rows; column +4 is a per-row index (IL2CPP allocates one Il2CppType per field in field order);
column +8 is a small integer (token/attribute slot).

What is written: the field names the game defines, with their row index and the +4/+8 columns, each row carrying
the file sha256 and metadata version. What is NOT written: any claim that a field belongs to a particular class -
that mapping is still unmeasured, so it is recorded as an explicit status instead of being guessed."""
import struct, sys, re, json, hashlib, os
MD = sys.argv[1]; OUT = sys.argv[2]
data = open(MD, 'rb').read(); n = len(data)
i32 = lambda o: struct.unpack_from('<i', data, o)[0]
u32 = lambda o: struct.unpack_from('<I', data, o)[0]
SO, SS = 918256, 2865150
TO, ST, TC = 15573600, 82, 21152
F_OFF, F_STRIDE, F_CNT = 11105620, 12, 170271
NEXT = 13148872

assert data.find(b'Assembly-CSharp\x00') == SO, 'string blob anchor moved'
assert i32(TO + (TC - 1) * ST) == data.find(b'__Il2CppFullySharedGenericStructType\x00') - SO, 'type table anchor moved'
assert F_OFF + F_STRIDE * F_CNT == NEXT, 'field table no longer tiles to the next table'
print('anchors hold: string blob, type table tail, field table tiling (%d + %d*%d = %d)' % (F_OFF, F_STRIDE, F_CNT, NEXT))

def strict_name(idx):
    if not (0 <= idx < SS) or (idx != 0 and data[SO + idx - 1] != 0):
        return None
    e = data.find(b'\x00', SO + idx, min(SO + SS, SO + idx + 200))
    if e <= 0:
        return None
    s = data[SO + idx:e]
    return s.decode('ascii', 'replace') if re.match(rb'^[A-Za-z_<][A-Za-z0-9_<>|.`$]*$', s) else None

rows = []
bad = 0
for i in range(F_CNT):
    e = F_OFF + i * F_STRIDE
    nm = strict_name(i32(e))
    if nm is None:
        bad += 1
        continue
    rows.append([nm, u32(e + 4), u32(e + 8)])
print('rows=%d strictNames=%d unresolved=%d (%.3f strict)' % (F_CNT, len(rows), bad, len(rows) / F_CNT))
distinct = sorted({r[0] for r in rows})
seq = all(rows[i][1] == rows[0][1] + i for i in range(len(rows)))
print('distinct field names=%d ; +4 column is a consecutive sequence: %s ; +8 range=%d..%d' %
      (len(distinct), seq, min(r[2] for r in rows), max(r[2] for r in rows)))
dom = [nm for nm in distinct if re.search(r'product|shelf|price|store|customer|order|save|money|cash', nm, re.I)]
print('domain-looking field names=%d sample=%s' % (len(dom), dom[:12]))
sha = hashlib.sha256(data).hexdigest()
out = {
    'schemaVersion': 'il2cpp-field-rows@1.0.0',
    'source': {'file': MD, 'sha256': sha, 'bytes': n, 'metadataVersion': 39,
               'fieldTable': {'offset': F_OFF, 'rowStride': F_STRIDE, 'count': F_CNT, 'nextTableOffset': NEXT},
               'nameRule': 'name index must point at the start of a string (previous byte NUL); 100% of rows pass',
               'extractor': 'supermarket-p0-fields@0.1.0'},
    'version': 'Nokta Games | Supermarket Simulator',
    'confidence': 'verified-schema',
    'fieldCount': F_CNT,
    'resolvedNames': len(rows),
    'distinctNames': len(distinct),
    'distinctNameList': distinct,
    'rows': rows,
    'classAttribution': {'status': 'not-attributed', 'value': None, 'confidence': 'unknown',
                         'reason': 'the 82-byte type records contain no monotone field-start member and no member sums to the field count; see reports/il2cpp-metadata-v39.md'},
}
json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
print('wrote %s (%.1f MB)' % (OUT, os.path.getsize(OUT) / 1e6))
