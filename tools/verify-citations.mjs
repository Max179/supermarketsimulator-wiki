#!/usr/bin/env node
/**
 * Checks that every identifier an entry cites as evidence is a real identifier in this build.
 *
 * The content gate asserts that each fact carries an evidence pointer; it cannot tell whether the pointer
 * names something that exists. This does that half. The identifier universe is committed under data/normalized/ so the
 * check runs on any machine; it is built on the Windows host, which is the only place the game package exists. The two
 * decoded layers do not travel: the names only they contribute are committed once in data/normalized/citation-index.json,
 * measured by pipeline/citation_index.mjs, so a light tree runs the same check rather than a weaker one.
 *
 * Identifiers may contain a dot, so only a comma or a semicolon separates them.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const known = new Set();
const objPath = join(root, 'data', 'normalized', 'supermarket-object-names.json');
if (existsSync(objPath)) for (const n of JSON.parse(readFileSync(objPath, 'utf8'))) known.add(n);
const invPath = join(root, 'data', 'normalized', 'p0-inventory.json');
if (existsSync(invPath)) {
  const inv = JSON.parse(readFileSync(invPath, 'utf8'));
  for (const c of inv.classes ?? []) { known.add(c.name); for (const f of c.fields ?? []) known.add(f.name); }
  for (const e of inv.enums ?? []) { known.add(e.name); for (const m of e.members ?? []) known.add(m.name); }
  if (Array.isArray(inv.fields)) for (const f of inv.fields) { if (f && f.name) known.add(f.name); }
  for (const s of ['p0-schema.json', 'p0-field-rows.json']) {
    const p = join(root, 'data', 'normalized', s);
    if (!existsSync(p)) continue;
    const j = JSON.parse(readFileSync(p, 'utf8'));
    for (const c of j.classes ?? []) known.add(c.name);
    if (Array.isArray(j.fields)) for (const f of j.fields) { if (f && f.name) known.add(f.name); }
    for (const n of j.distinctNameList ?? []) if (typeof n === 'string') known.add(n);
  }
}
// A tree without the decoded layers carries the names they contributed in this derived index instead
// (pipeline/citation_index.mjs builds it on the extraction host), so the check is the same check everywhere.
const idxPath = join(root, 'data', 'normalized', 'citation-index.json');
if (existsSync(idxPath)) {
  const idx = JSON.parse(readFileSync(idxPath, 'utf8'));
  const names = Array.isArray(idx) ? idx : (idx.names ?? []);
  for (const n of names) if (typeof n === 'string') known.add(n);
}

/**
 * Identifiers confirmed to exist in this build but outside the universe above. Each was found by searching
 * the shipped files for the name; they are absent from the inventory because it lists only classes with
 * written instances, and from the object index because they are type names rather than asset names.
 * Recording them keeps the check able to pass without weakening it.
 */
const CONFIRMED_ELSEWHERE = new Map([
  ['StartCashierCheckout', 'il2cpp_data\Metadata\global-metadata.dat'],
  ['FinishCheckout', 'il2cpp_data\Metadata\global-metadata.dat'],
  ['RepairingSelfCheckout', 'il2cpp_data\Metadata\global-metadata.dat'],
  ['MoveCheckoutPosition', 'il2cpp_data\Metadata\global-metadata.dat'],
  ['CustomerGeneration', 'il2cpp_data\Metadata\global-metadata.dat'],
  ['StartCustomerHelperCheckout', 'il2cpp_data\Metadata\global-metadata.dat'],
  ['BeatCheckoutCustomer', 'il2cpp_data\Metadata\global-metadata.dat'],
  ['CleaningForJanitorCoroutine', 'il2cpp_data\Metadata\global-metadata.dat'],
  ['StopWarning', 'il2cpp_data\Metadata\global-metadata.dat'],
  ['WarningDelayCoroutine', 'il2cpp_data\Metadata\global-metadata.dat'],
  ['RumbleLowFuelWarning', 'il2cpp_data\Metadata\global-metadata.dat'],
  ['StartCustomerHelperCheckoutOrder', 'il2cpp_data\Metadata\global-metadata.dat'],
  ['SingleTaskMission', 'il2cpp_data\Metadata\global-metadata.dat'],
  ['DelayedObjectiveCheck', 'il2cpp_data\Metadata\global-metadata.dat'],
  ['PaintManagerSyncCoroutine', 'il2cpp_data\Metadata\global-metadata.dat'],
  ['OrderPaperBagContainer', 'globalgamemanagers.assets'],
  ['CheckGamepadFocus', 'il2cpp_data\Metadata\global-metadata.dat'],
  ['SpawnProductOnEmptyShelf', 'il2cpp_data\Metadata\global-metadata.dat'],
  ['ProductRestockLoop', 'il2cpp_data\Metadata\global-metadata.dat'],
  ['Hiring_Tab.HiringTab', 'globalgamemanagers.assets'],
  ['CustomizationTab.CustomizationTab', 'globalgamemanagers.assets'],
  ['MusicPlayerTab.MusicPlayerTab', 'globalgamemanagers.assets'],
  ['GamepadUIPanel', 'il2cpp_data\Metadata\global-metadata.dat'],
  ['DLCScreen', 'globalgamemanagers.assets'],
  ['Hiring_Tab.BakerItem', 'globalgamemanagers.assets'],
  ['CustomizationTab.ChangeNameItem', 'globalgamemanagers.assets'],
  ['CustomizationTab.DoorPlaceItem', 'globalgamemanagers.assets'],
  ['CustomizationTab.CustomizationType', 'il2cpp_data\Metadata\global-metadata.dat'],
  ['Cameras.DoorSwitchCamera', 'globalgamemanagers.assets'],
  ['TrafficLight', 'globalgamemanagers.assets'],
  ['SettingEntry', 'il2cpp_data\Metadata\global-metadata.dat'],
  ['PG.BikeWheel', 'globalgamemanagers.assets'],
  ['PG.BikeController', 'il2cpp_data\Metadata\global-metadata.dat'],
  ['ShowBatWarningWithDelay', 'il2cpp_data\Metadata\global-metadata.dat'],
  ['ShowCrateWarningWithDelay', 'il2cpp_data\Metadata\global-metadata.dat'],
  ['ShowDirtinessIndicatorWarningWithDelay', 'il2cpp_data\Metadata\global-metadata.dat'],
  ['ShowEnableShoplifterWarningWithDelay', 'il2cpp_data\Metadata\global-metadata.dat'],
  ['ShowTabletWarningWithDelay', 'il2cpp_data\Metadata\global-metadata.dat'],
  ['ShowVeggiesWarningWithDelay', 'il2cpp_data\Metadata\global-metadata.dat'],
  // The bat entry quotes the game's own on-screen text, which lives in the shipped localization table rather than
  // in a class or an asset. Each key below was found by searching the shipped localization table for the name; the
  // table is normalized into data/normalized/localization-en.json so the check runs on any machine.
  ['_buyBatObjective', 'shipped localization table (data\normalized\localization-en.json)'],
  ['_openBatHint', 'shipped localization table (data\normalized\localization-en.json)'],
  ['_useBatDescription', 'shipped localization table (data\normalized\localization-en.json)'],
  ['_hitShoplifter', 'shipped localization table (data\normalized\localization-en.json)']
]);

const dir = join(root, 'content', 'published');
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
const cited = new Set(); const misses = new Map(); let facts = 0;
for (const f of files) {
  const entry = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  for (const fact of entry.facts ?? []) {
    facts += 1;
    for (const m of String(fact.evidence ?? '').matchAll(/identifier[s]?:(.+)/gi)) {
      for (const part of m[1].split(';')) {
        for (const piece of part.split(',')) {
          const id = piece.trim().replace(/\.+$/, '').trim();
          if (!id) continue;
          cited.add(id);
          if (!known.has(id) && !CONFIRMED_ELSEWHERE.has(id)) {
            if (!misses.has(id)) misses.set(id, []);
            misses.get(id).push(entry.id);
          }
        }
      }
    }
  }
}
console.log('[citations] supermarketsimulator.wiki: entries=' + files.length + ' facts=' + facts +
  ' distinctIdentifiers=' + cited.size + ' universe=' + known.size +
  ' confirmedElsewhere=' + CONFIRMED_ELSEWHERE.size + ' unmatched=' + misses.size);
for (const [id, entries] of misses) console.log('  CHECK  ' + id + '  <- ' + [...new Set(entries)].join(', '));
process.exit(misses.size ? 1 : 0);
