// End-to-end decode with the extended rule set (primitives, string, object reference, enum).
import { readFileSync } from 'node:fs';
import { parseAssembly } from './dotnet-metadata.ts';
import { decodeValues, readMonoBehaviourHeader } from './mono-values.ts';

const jobs = [
  ['repo', 'C:/Users/CHEN/Desktop/repo/data/normalized/repo-mb-payloads.json',
   'C:/Users/CHEN/Desktop/repo/data/raw/R.E.P.O.v0.4.0/REPO/REPO_Data/Managed/Assembly-CSharp.dll'],
  ['tcg', 'C:/Users/CHEN/Desktop/tcg-shop/data/normalized/tcg-mb-payloads.json',
   'C:/uTorria/Downloads/TCG Card Shop Simulator/Card Shop Simulator_Data/Managed/Assembly-CSharp.dll'],
];
for (const [label, payloadPath, dll] of jobs) {
  let doc; try { doc = JSON.parse(readFileSync(payloadPath, 'utf8')); } catch { console.log(label + ': no dump'); continue; }
  const asm = parseAssembly(dll);
  let decoded = 0, refHeader = 0, refClass = 0, refLayout = 0;
  const samples: string[] = [];
  const kinds = new Map<string, number>();
  for (const o of doc.objects) {
    const buf = Buffer.from(o.payload, 'base64');
    const h = readMonoBehaviourHeader(buf);
    if (!h) { refHeader++; continue; }
    const r = decodeValues(asm, o.class, buf.subarray(h.bytes));
    if (!r) { refLayout++; continue; }
    decoded++;
    for (const v of r) {
      kinds.set(v.kind.split(':')[0]!, (kinds.get(v.kind.split(':')[0]!) ?? 0) + 1);
      if (samples.length < 14 && String(v.kind).startsWith('enum')) samples.push(o.class + '.' + v.name + ' = ' + v.value + ' (' + v.kind + ')');
    }
  }
  console.log('=== ' + label + ' objects=' + doc.objects.length + ' decoded=' + decoded + ' refused(header)=' + refHeader + ' refused(layout)=' + refLayout);
  console.log('    value kinds: ' + JSON.stringify([...kinds].sort((a, b) => b[1] - a[1]).slice(0, 6)));
  for (const s of samples) console.log('    ' + s);
}
