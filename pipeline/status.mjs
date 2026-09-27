#!/usr/bin/env node
/**
 * Emit reports/status.json from measurements rather than prose, so the handoff status is machine-readable and can
 * be checked by a gate. Every number here comes from a fresh build into a temp directory plus git; none is typed in.
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { build, SITE } from './site.mjs';

const invPath = process.env.SITE_INVENTORY || 'data/normalized/p0-inventory.json';
const dir = mkdtempSync(join(tmpdir(), 'status-'));
try {
  const stats = build(invPath, dir);
  const inv = JSON.parse(readFileSync(invPath, 'utf8'));
  const out = {
    site: SITE.domain,
    head: execSync('git rev-parse --short HEAD').toString().trim(),
    commits: Number(execSync('git rev-list --count HEAD').toString().trim()),
    pages: stats.pages,
    indexable: stats.urls,
    noindex: stats.pages - stats.urls,
    classes: (inv.classes ?? []).length,
    fields: inv.totals?.fields ?? 0,
    version: inv.version ?? 'unknown',
    generatedBy: 'pipeline/status.mjs',
    // head is the commit this file was GENERATED from; committing the file itself moves HEAD one step on, so a
    // reader must compare it against the commit that introduced reports/status.json, not against the tip.
    headNote: 'generated from this commit; the commit that adds this file is one step later',
  };
  // The handoff boundary is part of the deliverable: record what is tracked and assert nothing derived is.
  const tracked = execSync('git ls-files').toString().trim().split('\n').filter(Boolean);
  const byTop = {};
  for (const f of tracked) {
    const top = f.includes('/') ? f.split('/')[0] : '(root)';
    byTop[top] = (byTop[top] ?? 0) + 1;
  }
  const excluded = tracked.filter((f) => f.startsWith('data/raw/') || f.startsWith('web/dist/') || f.endsWith('payloads.json'));
  out.handoff = { trackedFiles: tracked.length, byTop, excludedCount: excluded.length, excluded: excluded.slice(0, 5) };
  // Value-layer coverage: how much decoded data exists, recorded so a reader does not have to infer it from prose.
  const valueFile = ['data/normalized/p0-instances.json', 'data/normalized/p0-field-rows.json'].find((f) => existsSync(f)) ?? null;
  let valueCount = null;
  if (valueFile) {
    const d = JSON.parse(readFileSync(valueFile, 'utf8'));
    const candidates = [d, d.instances, d.objects, d.rows, d.classes];
    const arr = candidates.find((c) => Array.isArray(c));
    valueCount = arr ? arr.length : (typeof d.fieldCount === 'number' ? d.fieldCount : null);
  }
  out.valueLayer = valueFile ? { file: valueFile, count: valueCount } : null;
  writeFileSync('reports/status.json', JSON.stringify(out, null, 2) + '\n');
  console.log('[status] ' + JSON.stringify(out));
} finally {
  rmSync(dir, { recursive: true, force: true });
}
