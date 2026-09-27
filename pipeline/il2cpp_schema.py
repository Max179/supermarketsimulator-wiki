import struct, json, os
F = 'C:/uTorria/Downloads/Supermarket Simulator (2025)/Supermarket Simulator/Supermarket Simulator_Data/il2cpp_data/Metadata/global-metadata.dat'
OUT = 'C:/Users/CHEN/Desktop/supermarket-simulator/data/normalized/p0-schema.json'
b = open(F,'rb').read()
magic, version = struct.unpack_from('<II', b, 0)
pairs = [struct.unpack_from('<ii', b, 8 + i*8) for i in range(31)]
str_off, str_cnt = pairs[1]
type_off, type_cnt = pairs[21]
print('magic=0x%x version=%d string(%d/%d) typeCandidate(%d/%d)' % (magic, version, str_off, str_cnt, type_off, type_cnt))
def str_at(idx):
    if idx < 0 or idx >= str_cnt: return None
    end = b.find(bytes([0]), str_off + idx)
    if end < 0: return None
    try: return b[str_off+idx:end].decode('utf-8')
    except Exception: return None
ALLOWED = set('_.<>$/')
def plausible(s):
    return bool(s) and s[0].isalpha() and all(c.isalnum() or c in ALLOWED for c in s)
def score(stride, sample=300):
    n = min(sample, max(1, (len(b) - type_off)//stride)); ok = 0
    for i in range(n):
        if plausible(str_at(struct.unpack_from('<i', b, type_off + i*stride)[0])): ok += 1
    return ok/n
cands = [80,84,88,92,96,100,104,108,112]
best = max(cands, key=score)
print('stride measured: %d (agreement %.3f)' % (best, score(best)))
for s in [80,88,92,96,104]: print('   stride %3d -> %.3f' % (s, score(s)))
types = []
i = 0
while len(types) < 5000 and type_off + (i+1)*best <= len(b):
    name_idx, ns_idx = struct.unpack_from('<ii', b, type_off + i*best)
    name = str_at(name_idx)
    if not plausible(name): break
    types.append({'name': name, 'namespace': str_at(ns_idx) or ''})
    i += 1
print('types extracted: %d e.g. %s' % (len(types), ', '.join(t['name'] for t in types[:8])))
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump({'game':'Supermarket Simulator','engine':'unity','scriptBackend':'il2cpp','metadata':{'magic':hex(magic),'version':version,'stringTable':{'offset':str_off,'count':str_cnt},'typeTable':{'offset':type_off,'count':type_cnt,'stride':best,'strideAgreement':round(score(best),4)}},'source':{'file':'il2cpp_data/Metadata/global-metadata.dat','extractor':'il2cpp-schema@0.1.0'},'totals':{'typesExtracted':len(types),'typeCountInHeader':type_cnt},'types':types}, open(OUT,'w',encoding='utf-8'), indent=2)
print('schema written ->', OUT)