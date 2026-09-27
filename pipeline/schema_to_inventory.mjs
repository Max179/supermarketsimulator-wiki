#!/usr/bin/env node
/**
 * Turn the measured IL2CPP type schema (data/normalized/p0-schema.json) into the inventory shape the shared
 * site generator consumes. Nothing is invented:
 *   - source/version/totals are copied or counted from p0-schema.json;
 *   - every class keeps its name, its two-tier name confidence and its namespace;
 *   - fields are an empty list with an explicit status, because metadata v39 has no measured type->field
 *     member (see reports/il2cpp-metadata-v39.md). An empty field list is honest; a guessed one is not.
 * The engine/vendor split is a documented predicate over namespaces, and both sides are counted so the site
 * can state how many engine types exist without pretending they are game content.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

/** Namespaces that belong to the engine, the BCL or a third-party library rather than to the game. */
export const ENGINE_PREFIXES = ['System', 'Microsoft', 'Mono', 'Unity', 'UnityEngine', 'Unity.', 'TMPro',
  'Steamworks', 'Newtonsoft', 'DG.', 'NUnit', 'JetBrains', 'I18N', 'ICSharpCode', 'AOT', 'Bee.', 'NSubstitute',
  'MS.', 'Internal.', 'Interop', 'MonoTouch', 'StackExchange', 'Ease', 'ES3', 'Rewired', 'Cinemachine',
  'Spine', 'Kino', 'SickscoreGames', 'BlueRaja', 'Bezier', 'Loxodon', 'NiceJson', 'DM', 'AmplifyMotion'];
export const isEngineNamespace = (ns) => {
  const s = String(ns ?? '');
  if (s === '') return false;                       // the global namespace holds the game's own types
  return ENGINE_PREFIXES.some((p) => s === p || s.startsWith(p + '.'));
};

export function toInventory(schemaPath, outPath) {
  const s = JSON.parse(readFileSync(schemaPath, 'utf8'));
  const classes = (s.classes ?? []).map((c) => ({
    name: c.name ?? c.nameRaw,
    nameRaw: c.nameRaw ?? null,
    nameConfidence: c.nameConfidence ?? 'identifier',
    namespace: c.namespace ?? '',
    base: null,                                     // no measured base-type table yet: unknown, not guessed
    fields: [],
  }));
  const engine = classes.filter((c) => isEngineNamespace(c.namespace)).length;
  const nsCount = new Map();
  for (const c of classes) nsCount.set(c.namespace, (nsCount.get(c.namespace) ?? 0) + 1);
  // Field names are real data even while class attribution is unmeasured, so they are published as their own
  // block with an explicit status rather than being dropped or guessed into a class.
  const fieldPath = schemaPath.replace('p0-schema.json', 'p0-field-rows.json');
  let fieldBlock = null;
  if (existsSync(fieldPath)) {
    const fr = JSON.parse(readFileSync(fieldPath, 'utf8'));
    const counts = new Map();
    for (const row of fr.rows ?? []) counts.set(row[0], (counts.get(row[0]) ?? 0) + 1);
    fieldBlock = {
      rows: fr.fieldCount ?? (fr.rows ?? []).length,
      resolved: fr.resolvedNames ?? null,
      distinct: counts.size,
      source: fr.source ?? null,
      confidence: fr.confidence ?? 'verified-schema',
      classAttribution: fr.classAttribution ?? { status: 'not-attributed', value: null, confidence: 'unknown' },
      names: [...counts.entries()].map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    };
  }
  const enums = s.enums ?? [];
  const inv = {
    schemaVersion: s.schemaVersion,
    source: {
      ...s.source,
      file: s.source?.file ?? null,
      note: 'IL2CPP global-metadata.dat read read-only; class names and namespaces only',
    },
    version: s.version,
    engine: s.engine,
    provenance: {
      fields: 'source file, sha256, metadata version, type-table offset/stride, per-entry name confidence',
      values: 'none: no field values are extracted for this title yet',
    },
    confidence: s.confidence,
    totals: {
      types: s.source?.typeTable?.count ?? classes.length,
      fields: fieldBlock ? fieldBlock.rows : 0,
      distinctFieldNames: fieldBlock ? fieldBlock.distinct : 0,
      classes: classes.length,
      engineClasses: engine,
      gameClasses: classes.length - engine,
      namespaces: [...nsCount.keys()].filter((k) => k !== '').length,
      globalNamespaceClasses: nsCount.get('') ?? 0,
    },
    fieldsStatus: s.fields ?? { status: 'not-attributed', confidence: 'unknown' },
    fields: fieldBlock,
    namespaces: [...nsCount.entries()].map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    enums,
    classes,
  };
  writeFileSync(outPath, JSON.stringify(inv), 'utf8');
  return inv;
}

if (process.argv[1] && process.argv[1].endsWith('schema_to_inventory.mjs')) {
  const inv = toInventory(process.argv[2] ?? 'data/normalized/p0-schema.json',
    process.argv[3] ?? 'data/normalized/p0-inventory.json');
  const t = inv.totals;
  console.log('[inventory] classes=' + t.classes + ' game=' + t.gameClasses + ' engine=' + t.engineClasses +
    ' fields=' + t.fields + ' namespaces=' + t.namespaces + ' global=' + t.globalNamespaceClasses);
  const byPrefix = {};
  for (const c of inv.classes) {
    const first = c.namespace === '' ? '(global)' : c.namespace.split('.')[0];
    byPrefix[first] = (byPrefix[first] ?? 0) + 1;
  }
  const top = Object.entries(byPrefix).sort((a, b) => b[1] - a[1]).slice(0, 12);
  console.log('[inventory] by first segment: ' + top.map(([k, v]) => k + '=' + v).join(' '));
  console.log('[inventory] fieldsStatus=' + JSON.stringify(inv.fieldsStatus.status));
}
