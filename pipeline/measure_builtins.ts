// Measure Unity built-in value-type sizes by difference: for an object whose written fields are all measured except
// the LAST one, residual = payloadBody - measuredAlignedSum is that field's size. Consistent residuals across many
// objects and files are a measurement; anything inconsistent is reported as such and not used.
import { readFileSync } from 'node:fs';
import { parseAssembly, monoBehaviourClass, unitySerializedFields, decodeFieldSignature, fieldTypeName, reachesMonoBehaviour } from './dotnet-metadata.ts';
import { readMonoBehaviourHeader, PRIMITIVE_FIELD_SIZES, PPTR_SIZE } from './mono-layout.ts';

const JOBS = [
  ['repo', 'C:/Users/CHEN/Desktop/repo/data/normalized/repo-mb-payloads.json',
   'C:/Users/CHEN/Desktop/repo/data/raw/R.E.P.O.v0.4.0/REPO/REPO_Data/Managed/Assembly-CSharp.dll'],
  ['tcg', 'C:/Users/CHEN/Desktop/tcg-shop/data/normalized/tcg-mb-payloads.json',
   'C:/uTorria/Downloads/TCG Card Shop Simulator/Card Shop Simulator_Data/Managed/Assembly-CSharp.dll'],
];
const census = new Map<string, Map<number, number>>();
for (const [label, payloadPath, dll] of JOBS) {
  let doc; try { doc = JSON.parse(readFileSync(payloadPath, 'utf8')); } catch { continue; }
  const asm = parseAssembly(dll);
  let used = 0;
  for (const o of doc.objects) {
    const type = monoBehaviourClass(asm, o.class);
    if (!type) continue;
    const written = unitySerializedFields(asm, type);
    if (written.length < 1) continue;
    const buf = Buffer.from(o.payload, 'base64');
    const h = readMonoBehaviourHeader(buf);
    if (!h) continue;
    const body = buf.subarray(h.bytes);
    let sum = 0, unknown = 0, lastName = '', lastKind = '';
    let ok = true;
    for (let i = 0; i < written.length; i++) {
      const f = written[i]!;
      const sig = decodeFieldSignature(f.signature);
      const kind = sig.kind;
      const prim = PRIMITIVE_FIELD_SIZES[kind];
      const isLast = i === written.length - 1;
      if (prim !== undefined) { sum += prim; while (sum % 4 !== 0) sum++; continue; }
      if (kind === 'string') { if (isLast) { ok = false; break; } const len = body.readInt32LE(sum); sum += 4 + len; while (sum % 4 !== 0) sum++; continue; }
      const resolved = fieldTypeName(asm, f.signature);
      const t = asm.byName.get(resolved);
      const isEnum = !!t && t.baseType === 'Enum';
      const isRef = kind === 'class' && (reachesMonoBehaviour(asm, t!) || (t && t.baseType === 'ScriptableObject'));
      if (isEnum) { sum += 4; while (sum % 4 !== 0) sum++; continue; }
      if (isRef) { sum += PPTR_SIZE; while (sum % 4 !== 0) sum++; continue; }
      if (isLast) { unknown++; lastName = resolved; lastKind = kind; continue; }
      ok = false; break;
    }
    if (!ok || unknown !== 1) continue;
    const residual = body.length - sum;
    if (residual < 1 || residual > 128) continue;
    used++;
    const key = lastKind + ':' + lastName;
    const m = census.get(key) ?? new Map<number, number>();
    m.set(residual, (m.get(residual) ?? 0) + 1);
    census.set(key, m);
  }
  console.log(label + ': objects usable for a size measurement = ' + used);
}
console.log('--- candidate sizes by type (count of objects agreeing) ---');
for (const [key, m] of [...census].sort((a, b) => [...b[1].values()].reduce((x, y) => x + y, 0) - [...a[1].values()].reduce((x, y) => x + y, 0)).slice(0, 18)) {
  const total = [...m.values()].reduce((x, y) => x + y, 0);
  const top = [...m].sort((a, b) => b[1] - a[1])[0]!;
  console.log('  ' + key.padEnd(46) + ' n=' + String(total).padStart(4) + '  mostCommon=' + top[0] + 'B x' + top[1] + (m.size > 1 ? '  (spread: ' + [...m.keys()].join('/') + ')' : ''));
}
