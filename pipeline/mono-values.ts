// Decoder for MonoBehaviour payloads. Every rule is either measured on real bytes or read from the game's own
// assembly (enum underlying size via value__, nested struct layouts via the struct's own field list), and a decode is
// accepted ONLY when it consumes the payload exactly. Anything unmeasured is refused for the whole class.
import type { DotNetAssembly, DotNetField, DotNetType } from './dotnet-metadata.ts';
import { monoBehaviourClass, unitySerializedFields, decodeFieldSignature, fieldTypeName, reachesMonoBehaviour } from './dotnet-metadata.ts';
import { readMonoBehaviourHeader, PRIMITIVE_FIELD_SIZES, PPTR_SIZE } from './mono-layout.ts';

export { readMonoBehaviourHeader };
export interface DecodedValue { name: string; kind: string; value: string | number | boolean | null }

function isObjectReference(assembly: DotNetAssembly, typeName: string): boolean {
  const t = assembly.byName.get(typeName);
  if (!t) return false;
  if (reachesMonoBehaviour(assembly, t)) return true;
  const seen = new Set<string>();
  let cur: DotNetType | undefined = t;
  while (cur && !seen.has(cur.name)) {
    seen.add(cur.name);
    if (cur.baseType === 'ScriptableObject') return true;
    cur = assembly.byName.get(cur.baseType ?? '');
  }
  return false;
}

function enumUnderlying(assembly: DotNetAssembly, typeName: string): string | null {
  const t = assembly.byName.get(typeName);
  if (!t || t.baseType !== 'Enum') return null;
  const v = t.fields.find((f) => f.name === 'value__');
  if (!v) return null;
  const kind = decodeFieldSignature(v.signature).kind;
  return PRIMITIVE_FIELD_SIZES[kind] !== undefined ? kind : null;
}

/** A value type declared in this assembly that is not an enum: a struct we can lay out recursively. */
function structType(assembly: DotNetAssembly, typeName: string): DotNetType | null {
  const t = assembly.byName.get(typeName);
  if (!t || t.baseType === 'Enum') return null;
  if (!t.fields.length) return null;
  return t;
}

function readPrimitive(payload: Buffer, at: number, kind: string): number | boolean | null {
  if (kind === 'bool') return payload.readUInt8(at) !== 0;
  if (kind === 'i1') return payload.readInt8(at);
  if (kind === 'u1') return payload.readUInt8(at);
  if (kind === 'i2') return payload.readInt16LE(at);
  if (kind === 'u2' || kind === 'char') return payload.readUInt16LE(at);
  if (kind === 'int') return payload.readInt32LE(at);
  if (kind === 'uint') return payload.readUInt32LE(at);
  if (kind === 'float') return payload.readFloatLE(at);
  if (kind === 'double') return payload.readDoubleLE(at);
  if (kind === 'i8' || kind === 'u8') return Number(payload.readBigInt64LE(at));
  return null;
}

/**
 * Decode one field list starting at `at`. Returns the values and the next offset, or null when any field's layout is
 * not measured — a partial answer is never returned, because a wrong size silently misaligns everything after it.
 */
function walkFields(assembly: DotNetAssembly, fields: DotNetField[], payload: Buffer, at: number, depth: number): { values: DecodedValue[]; next: number } | null {
  if (depth > 4) return null;
  const values: DecodedValue[] = [];
  let p = at;
  for (const field of fields) {
    const sig = decodeFieldSignature(field.signature);
    const kind = sig.kind;
    const prim = PRIMITIVE_FIELD_SIZES[kind];
    if (prim !== undefined) {
      if (p + prim > payload.length) return null;
      const v = readPrimitive(payload, p, kind);
      if (v === null) return null;
      values.push({ name: field.name, kind, value: v });
      p += prim; while (p % 4 !== 0) p++;
      continue;
    }
    if (kind === 'string') {
      if (p + 4 > payload.length) return null;
      const len = payload.readInt32LE(p);
      if (len < 0 || len > 4096 || p + 4 + len > payload.length) return null;
      values.push({ name: field.name, kind: 'string', value: payload.subarray(p + 4, p + 4 + len).toString('utf8') });
      p += 4 + len; while (p % 4 !== 0) p++;
      continue;
    }
    const resolved = fieldTypeName(assembly, field.signature);
    if (kind === 'class' && isObjectReference(assembly, resolved)) {
      if (p + PPTR_SIZE > payload.length) return null;
      values.push({ name: field.name, kind: 'reference', value: String(payload.readBigInt64LE(p + 4)) });
      p += PPTR_SIZE; while (p % 4 !== 0) p++;
      continue;
    }
    const underlying = (kind === 'valuetype' || kind === 'class') ? enumUnderlying(assembly, resolved) : null;
    if (underlying) {
      const size = PRIMITIVE_FIELD_SIZES[underlying]!;
      if (p + size > payload.length) return null;
      const v = readPrimitive(payload, p, underlying);
      if (v === null) return null;
      values.push({ name: field.name, kind: 'enum:' + resolved, value: v });
      p += size; while (p % 4 !== 0) p++;
      continue;
    }
    if (kind === 'valuetype') {
      const struct = structType(assembly, resolved);
      if (!struct) return null;
      const inner = walkFields(assembly, unitySerializedFields(assembly, struct), payload, p, depth + 1);
      if (!inner) return null;
      for (const v of inner.values) values.push({ name: field.name + '.' + v.name, kind: v.kind, value: v.value });
      p = inner.next;
      continue;
    }
    if (kind === 'array') {
      const innerName = sig.name ?? '';
      const innerPrim = PRIMITIVE_FIELD_SIZES[innerName];
      if (innerPrim === undefined) return null;
      if (p + 4 > payload.length) return null;
      const n = payload.readInt32LE(p); p += 4;
      if (n < 0 || n > 100000 || p + n * innerPrim > payload.length) return null;
      const parts: string[] = [];
      for (let i = 0; i < n; i++) { const v = readPrimitive(payload, p, innerName); parts.push(String(v)); p += innerPrim; }
      values.push({ name: field.name, kind: 'array:' + innerName, value: '[' + parts.join(', ') + ']' });
      while (p % 4 !== 0) p++;
      continue;
    }
    return null;   // not measured: refuse the class wholesale
  }
  return { values, next: p };
}

export function decodeValues(assembly: DotNetAssembly, className: string, payload: Buffer): DecodedValue[] | null {
  const type = monoBehaviourClass(assembly, className);
  if (!type) return null;
  const written = unitySerializedFields(assembly, type);
  if (!written.length) return null;
  const r = walkFields(assembly, written, payload, 0, 0);
  if (!r || r.next !== payload.length) return null;
  return r.values;
}
