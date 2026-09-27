import struct, json, os
F='C:/uTorria/Downloads/Supermarket Simulator (2025)/Supermarket Simulator/Supermarket Simulator_Data/il2cpp_data/Metadata/global-metadata.dat'
b=open(F,'rb').read()
magic,version=struct.unpack_from('<II',b,0)
pairs=[struct.unpack_from('<ii',b,8+i*8) for i in range(31)]
str_off,str_cnt=pairs[1]
def str_at(idx):
    if idx<0 or idx>=str_cnt: return None
    end=b.find(bytes([0]),str_off+idx)
    if end<0 or end-str_off-idx>256: return None
    try: return b[str_off+idx:end].decode('utf-8')
    except Exception: return None
ALLOWED=set('_.<>$/')
def plausible(s): return bool(s) and s[0].isalpha() and all(c.isalnum() or c in ALLOWED for c in s)
def run_score(off,S,n):
    names=0; ns=0
    for i in range(n):
        base=off+i*S
        if base+8>len(b): break
        ni,nsi=struct.unpack_from('<ii',b,base)
        if plausible(str_at(ni)): names+=1
        t=str_at(nsi)
        if t is not None and (t=='' or plausible(t)): ns+=1
    return names/n, ns/n
best=[]
STRIDES=(80,84,88,92,96,100,104,108,112,120,128)
for pi,(off,cnt) in enumerate(pairs):
    if off<=8 or off>=len(b) or cnt<=0 or cnt>2000000: continue
    for S in STRIDES:
        n=min(1500,(len(b)-off)//S,max(cnt,1))
        if n<100: continue
        nr,nsr=run_score(off,S,n)
        if nr>0.8 or nsr>0.8: best.append((pi,off,cnt,S,round(nr,3),round(nsr,3),n))
best.sort(key=lambda x:-(x[4]+x[5]))
print('magic=0x%x version=%d' % (magic,version))
print('candidates with a high name or namespace rate: %d' % len(best))
for c in best[:8]: print('   pair[%d] off=%d count=%d stride=%d nameRate=%.3f nsRate=%.3f n=%d' % c)
if best and best[0][4]>0.9 and best[0][5]>0.9:
    pi,off,cnt,S,nr,nsr,n=best[0]
    types=[]; i=0
    while len(types)<6000 and off+(i+1)*S<=len(b):
        name_idx,ns_idx=struct.unpack_from('<ii',b,off+i*S)
        name=str_at(name_idx)
        if not plausible(name): break
        types.append({'name':name,'namespace':str_at(ns_idx) or ''})
        i+=1
    OUT='C:/Users/CHEN/Desktop/supermarket-simulator/data/normalized/p0-schema.json'
    os.makedirs(os.path.dirname(OUT),exist_ok=True)
    json.dump({'game':'Supermarket Simulator','engine':'unity','scriptBackend':'il2cpp','metadata':{'magic':hex(magic),'version':version,'typeTable':{'pair':pi,'offset':off,'count':cnt,'stride':S,'nameRate':nr,'nsRate':nsr},'stringTable':{'offset':str_off,'count':str_cnt}},'source':{'file':'il2cpp_data/Metadata/global-metadata.dat','extractor':'il2cpp-schema@0.2.0'},'totals':{'typesExtracted':len(types),'typeCountInHeader':cnt},'types':types},open(OUT,'w',encoding='utf-8'),indent=2)
    print('SCHEMA WRITTEN: %d types -> %s' % (len(types),OUT))
    print('   e.g. %s' % ', '.join(t['name'] for t in types[:10]))
else:
    print('no pair/stride passed the stronger two-index test -> type table still not located')