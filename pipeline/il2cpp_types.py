#!/usr/bin/env python3
"""Extract the P0 class schema for Supermarket Simulator from the game's own IL2CPP metadata.

Only what was measured is written: the class name and namespace of each of the 21,152 type definitions,
each entry carrying its provenance (file, sha256, metadata version, table offset, entry stride). Field
membership is NOT yet attributable in metadata v39 and is therefore written as an explicit status, never
guessed. The reader re-verifies its own anchors before writing anything and refuses to write if they fail."""
import struct, sys, re, json, hashlib, os

MD = sys.argv[1]
OUT = sys.argv[2]
APPINFO = sys.argv[3] if len(sys.argv) > 3 else None
data = open(MD, 'rb').read(); n = len(data)
i32 = lambda o: struct.unpack_from('<i', data, o)[0]
u32 = lambda o: struct.unpack_from('<I', data, o)[0]
ident = re.compile(rb'^[A-Za-z_<][A-Za-z0-9_<>|.`$]*$')
printable = re.compile(rb'^[\x20-\x7e]{1,300}$')
SO, SS = 918256, 2865150
TO, ST, TC = 15573600, 82, 21152

# --- refuse to write unless the measured anchors still hold on this exact file
assert u32(0) == 0xFAB11BAF, 'sanity mismatch'
assert i32(4) == 39, 'metadata version changed: %d' % i32(4)
assert data.find(b'Assembly-CSharp\x00') == SO, 'string blob anchor moved'
def name_at(idx):
    if not (0 <= idx < SS):
        return None
    e = data.find(b'\x00', SO + idx, min(SO + SS, SO + idx + 300))
    if e < 0:
        return None
    s = data[SO + idx:e]
    return s.decode('ascii', 'replace') if ident.match(s) else None
assert i32(TO + (TC - 1) * ST) == data.find(b'__Il2CppFullySharedGenericStructType\x00') - SO, 'type table tail anchor moved'
def raw_at(idx):
    if not (0 <= idx < SS):
        return None
    e = data.find(b'\x00', SO + idx, min(SO + SS, SO + idx + 300))
    return data[SO + idx:e] if e > 0 else None
print('anchors hold: sanity, version 39, string blob @%d, %d types @%d stride %d' % (SO, TC, TO, ST))

classes = []
bad_name = bad_ns = 0
for i in range(TC):
    e = TO + i * ST
    nm = name_at(i32(e))
    nsi = i32(e + 4)
    ns = name_at(nsi)
    # the empty string in the blob is the global namespace (verified: string[16] == b'', and nsi is never 0)
    if nm is None:
        bad_name += 1
    if ns is None and not (0 <= nsi < SS):
        bad_ns += 1
    rawname = None
    conf = 'identifier'
    if nm is None:
        r = raw_at(i32(e))
        if r is not None and printable.match(r):
            rawname = r.decode('ascii')
            conf = 'printable-raw'
        else:
            conf = 'unresolved'
    classes.append({'name': nm, 'nameRaw': rawname, 'nameConfidence': conf,
                    'namespace': ns if ns is not None else '', 'typeDefIndex': i})
tiers = {}
for c in classes:
    tiers[c['nameConfidence']] = tiers.get(c['nameConfidence'], 0) + 1
print('names by tier: %s ; namespaces unresolved %d' % (tiers, bad_ns))

def norm(c):
    c = c.replace('\x00', '').strip()
    return re.sub(r'[^0-9A-Za-z._+ -]', '', c)

version = ''
if APPINFO and os.path.exists(APPINFO):
    with open(APPINFO, 'rb') as f:
        raw = f.read(4096).decode('utf-8', 'replace')
    parts = [norm(x) for x in raw.replace('\r', '').split('\n') if x.strip()]
    version = ' | '.join(parts[:3])
print('app.info version: %r' % version)
sha = hashlib.sha256(data).hexdigest()
print('metadata sha256=%s size=%d' % (sha, n))

nss = {}
for c in classes:
    if c['namespace']:
        nss[c['namespace']] = nss.get(c['namespace'], 0) + 1
top = sorted(nss.items(), key=lambda kv: -kv[1])[:8]
print('distinct namespaces=%d top=%s' % (len(nss), top))
hits = [c['name'] for c in classes if c['name'] and re.search(r'Product|Shelf|Store|Employee|Customer|Checkout|Register', c['name'])]
print('domain-looking names=%d sample=%s' % (len(hits), sorted(set(hits))[:12]))

out = {
    'schemaVersion': 'il2cpp-types@1.0.0',
    'source': {
        'file': MD,
        'sha256': sha,
        'bytes': n,
        'metadataVersion': 39,
        'sanity': '0xfab11baf',
        'typeTable': {'offset': TO, 'count': TC, 'entryStride': ST, 'nameIndexOffset': 0, 'namespaceIndexOffset': 4},
        'stringBlob': {'offset': SO, 'size': SS},
        'extractor': 'supermarket-p0-types@0.1.0',
        'method': 'measured by self-consistency; type table tail proven by the unique sentinel name __Il2CppFullySharedGenericStructType at offset %d = %d + %d*%d' % (TO + (TC - 1) * ST, TO, TC - 1, ST),
    },
    'version': version,
    'engine': 'Unity (IL2CPP); engine version recorded separately in reports/v22-header.md',
    'confidence': 'verified-schema',
    'classCount': TC,
    'classes': classes,
    'fields': {
        'status': 'not-attributed',
        'reason': 'metadata v39 has no measurable monotone type->field member at stride 82; see reports/il2cpp-metadata-v39.md',
        'value': None,
        'confidence': 'unknown',
    },
}
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print('wrote %s (%d bytes)' % (OUT, os.path.getsize(OUT)))
