#!/usr/bin/env node
/**
 * Content gate: refuses to let the site publish something that is not a player-facing entry.
 * Reads content/published + content/reference and checks every rule written in content/README.md.
 * Exits non-zero and prints each violation, so a bad entry cannot reach the build.
 */
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

export const BANNED = ['il2cpp', 'serializedfile', 'pptr', 'schema', 'metadata', 'payload', 'monobehaviour',
  'scriptableobject', 'sha256', 'parser', 'namespace'];
const BANNED_WORDS = ['class', 'classes', 'field', 'fields'];
const IMAGE_FORMATS = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.avif'];
const MIN_IMAGE_BYTES = 1024;

const prose = (e) => [e.title, e.summary, ...(e.body ?? [])].join(' ').toLowerCase();

/** @returns {string[]} violations */
export function checkEntry(entry, dir, ids) {
  const bad = [];
  const p = prose(entry);
  for (const term of BANNED) if (p.includes(term)) bad.push('internal term "' + term + '" in prose');
  for (const w of BANNED_WORDS) if (new RegExp('\\b' + w + '\\b').test(p)) bad.push('internal word "' + w + '" in prose');
  if (!entry.title || entry.title.length < 8) bad.push('title missing or too short');
  if (entry.title && /^[a-z0-9_]+$/.test(entry.title)) bad.push('title is a bare identifier');
  if (!entry.summary || entry.summary.length < 80) bad.push('summary missing or under 80 characters');
  if (entry.summary && entry.title && entry.summary.toLowerCase().replace(/[^a-z ]/g, '').trim() === entry.title.toLowerCase()) bad.push('summary is just the title');
  if ((entry.body ?? []).length < 2) bad.push('needs at least two body paragraphs');
  if (!(entry.facts ?? []).length) bad.push('no fact with evidence');
  for (const f of entry.facts ?? []) if (!f.claim || !f.evidence) bad.push('fact without claim or evidence: ' + JSON.stringify(f));
  if (!(entry.images ?? []).length) bad.push('published entry without an image');
  for (const img of entry.images ?? []) {
    if (!img.file) { bad.push('image without file'); continue; }
    const onDisk = join(dir, img.file);
    if (!existsSync(onDisk)) { bad.push('image not on disk: ' + img.file); continue; }
    const size = statSync(onDisk).size;
    if (size < MIN_IMAGE_BYTES) bad.push('image smaller than 1 KB: ' + img.file);
    if (!IMAGE_FORMATS.includes(img.file.slice(img.file.lastIndexOf('.')).toLowerCase())) bad.push('unsupported image format: ' + img.file);
    if (img.kind !== 'game' && img.kind !== 'diagram') bad.push('image must declare kind "game" or "diagram": ' + img.file);
    if (img.kind === 'diagram' && !(img.disclaimer ?? '').length) bad.push('diagram must carry a disclaimer saying it is not a screenshot: ' + img.file);
    if (!img.alt || !img.alt.en || !img.alt.zh) bad.push('image needs English and Chinese alt text: ' + img.file);
  }
  // An entry must say which kind of picture it was given. A diagram is allowed, but it has to be declared as a
  // diagram-only entry and its diagram has to carry a disclaimer, so an illustration can never pass as a screenshot.
  const hasGame = (entry.images ?? []).some((img) => img.kind === 'game');
  if (entry.imageTier !== 'game-image' && entry.imageTier !== 'diagram-only') {
    bad.push('entry must declare imageTier "game-image" or "diagram-only"');
  } else if (hasGame && entry.imageTier !== 'game-image') {
    bad.push('entry has an image taken from the game but is not marked imageTier "game-image"');
  } else if (!hasGame && entry.imageTier !== 'diagram-only') {
    bad.push('entry without any image taken from the game must be marked imageTier "diagram-only"');
  }
  if (!hasGame) {
    const d = (entry.images ?? []).find((img) => img.kind === 'diagram');
    if (!d || !/not a screenshot/i.test(d.disclaimer ?? '')) {
      bad.push('a diagram-only entry needs a diagram whose disclaimer says it is not a screenshot');
    }
  }
  for (const rel of entry.related ?? []) if (!ids.has(rel)) bad.push('related entry does not exist: ' + rel);
  if (!entry.sources || !entry.sources.length) bad.push('no version/source note');
  return bad;
}

/** @returns {string[]} violations for a published article: every step must say what to do and why it is grounded. */
export function checkArticle(a, ids) {
  const bad = [];
  const prose = [a.title, a.target, ...(a.steps ?? []).map((s) => s.do), ...(a.commonMistakes ?? [])].join(' ').toLowerCase();
  for (const term of BANNED) if (prose.includes(term)) bad.push('internal term "' + term + '" in prose');
  for (const w of BANNED_WORDS) if (new RegExp('\\b' + w + '\\b').test(prose)) bad.push('internal word "' + w + '" in prose');
  if (!a.title || a.title.length < 8 || /^[a-z0-9_]+$/.test(a.title)) bad.push('bad article title');
  if (!a.target || a.target.length < 60) bad.push('target under 60 characters');
  if (!a.version) bad.push('no applicable version');
  if (!(a.prerequisites ?? []).length) bad.push('no prerequisites');
  if ((a.steps ?? []).length < 3) bad.push('fewer than three steps');
  for (const s of a.steps ?? []) if (!s.do || !s.because) bad.push('step without action or grounding: ' + JSON.stringify(s));
  if (!(a.commonMistakes ?? []).length) bad.push('no common mistakes');
  for (const r of a.relatedEntities ?? []) if (!ids.has(r)) bad.push('related entity does not exist: ' + r);
  if (!(a.sources ?? []).length) bad.push('no sources');
  return bad;
}

/** An image that claims to come from the game must match the manifest record that documents its origin. */
export function checkMappedImages(entry, dir, manifest) {
  const bad = [];
  for (const img of entry.images ?? []) {
    if (img.kind !== 'game') continue;
    const rec = (manifest.records ?? []).find((r) => r.file === img.file);
    if (!rec) { bad.push('game image without a manifest record: ' + img.file); continue; }
    const p = join(dir, img.file);
    if (!existsSync(p)) { bad.push('mapped image not on disk: ' + img.file); continue; }
    const buf = readFileSync(p);
    const h = createHash('sha256').update(buf).digest('hex');
    if (h !== rec.sha256 || buf.length !== rec.bytes) bad.push('mapped image does not match its manifest record: ' + img.file);
  }
  return bad;
}

if (process.argv[1] && process.argv[1].endsWith('content-gate.mjs')) {
  const root = process.cwd();
  const pubDir = join(root, 'content', 'published');
  const refDir = join(root, 'content', 'reference');
  const assetsDir = join(root, 'content', 'assets');
  const entries = [];
  for (const dir of [pubDir, refDir]) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      entries.push({ file: join(dir, f), data: JSON.parse(readFileSync(join(dir, f), 'utf8')) });
    }
  }
  const ids = new Set(entries.map((e) => e.data.id));
  const manifestPath = join(root, 'content', 'images-manifest.json');
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { records: [] };
  let violations = 0;
  const titles = new Map();
  for (const e of entries) {
    const isPublished = e.file.includes('published');
    if (!isPublished) continue;
    const bad = checkEntry(e.data, assetsDir, ids).concat(checkMappedImages(e.data, assetsDir, manifest));
    if (e.data.title) titles.set(e.data.title, (titles.get(e.data.title) ?? 0) + 1);
    if (bad.length) { violations += bad.length; console.log('  FAIL ' + e.data.id + ': ' + bad.join('; ')); }
    else console.log('  OK   ' + e.data.id + ' (' + e.data.images.length + ' image(s), ' + e.data.facts.length + ' fact(s))');
  }
  const artDir = join(root, 'content', 'articles');
  const articles = existsSync(artDir) ? readdirSync(artDir).filter((x) => x.endsWith('.json')).map((x) => JSON.parse(readFileSync(join(artDir, x), 'utf8'))) : [];
  for (const a of articles) {
    const bad = checkArticle(a, ids);
    if (bad.length) { violations += bad.length; console.log('  FAIL article ' + a.id + ': ' + bad.join('; ')); }
    else console.log('  OK   article ' + a.id + ' (' + a.steps.length + ' step(s))');
  }
  for (const [t, n] of titles) if (n > 1) { violations++; console.log('  FAIL duplicate title: ' + t); }
  console.log('[content-gate] ' + (entries.length) + ' entry file(s), ' + violations + ' violation(s)');
  process.exit(violations ? 1 : 0);
}