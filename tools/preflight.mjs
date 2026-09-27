#!/usr/bin/env node
/**
 * Preflight: refuse to publish unless every local gate holds. Prints a checklist and exits non-zero on any failure,
 * so the deploy job cannot start from a state that is dirty, un-gated, or missing its machine-readable status.
 */
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const checks = [];
/** @param {string} name @param {boolean} ok @param {string} detail */
const add = (name, ok, detail = '') => { checks.push({ name, ok, detail }); };

try {
  const out = execSync('node tests/site.test.mjs').toString().trim().split('\n').pop() ?? '';
  add('site gates pass', / 0 failed$/.test(out), out);
} catch (e) {
  add('site gates pass', false, String(e).slice(0, 160));
}
const dirty = execSync('git status --porcelain').toString().trim();
add('working tree is clean', dirty === '', dirty.split('\n').slice(0, 2).join(' | '));
const hasStatus = existsSync('reports/status.json');
add('machine-readable status exists', hasStatus, 'reports/status.json');
if (hasStatus) {
  const s = JSON.parse(readFileSync('reports/status.json', 'utf8'));
  add('status declares the published domain and page counts',
    typeof s.site === 'string' && s.site.length > 3 && s.pages > 0 && s.indexable > 0 && s.indexable < s.pages,
    JSON.stringify({ site: s.site, pages: s.pages, indexable: s.indexable }));
}
if (hasStatus) {
  const st = JSON.parse(readFileSync('reports/status.json', 'utf8'));
  const vf = st.valueLayer?.file ?? null;
  let ok = false;
  let detail = 'no value layer recorded';
  if (vf && existsSync(vf)) {
    const d = JSON.parse(readFileSync(vf, 'utf8'));
    const arr = [d, d.instances, d.objects, d.rows, d.classes].find((c) => Array.isArray(c));
    const n = arr ? arr.length : (typeof d.fieldCount === 'number' ? d.fieldCount : null);
    ok = n === st.valueLayer.count;
    detail = 'file=' + n + ' status=' + st.valueLayer.count;
  }
  add('the status value-layer count matches its file', ok, detail);
}
const hasReport = existsSync('reports/local-complete.md');
add('the handoff report exists and is not empty', hasReport && readFileSync('reports/local-complete.md', 'utf8').trim().length > 200,
  hasReport ? readFileSync('reports/local-complete.md', 'utf8').trim().length + ' chars' : 'reports/local-complete.md missing');
const wf = existsSync('.github/workflows/publish.yml') ? readFileSync('.github/workflows/publish.yml', 'utf8') : '';
add('the deploy job waits for the gate job', /needs:\s*gate\b/.test(wf) && wf.includes('node tests/site.test.mjs'));
add('the deploy uses a secret and no token is committed', wf.includes('secrets.CLOUDFLARE_API_TOKEN') && !/apiToken:\s*[A-Za-z0-9_-]{20,}/.test(wf));
const tracked = execSync('git ls-files').toString();
add('raw game packages are not tracked', !tracked.includes('data/raw/'));
add('build output is not tracked', !tracked.includes('web/dist/'));

for (const c of checks) console.log((c.ok ? '  OK   ' : '  FAIL ') + c.name + (c.detail ? ' :: ' + c.detail : ''));
const failed = checks.filter((c) => !c.ok).length;
console.log('[preflight] ' + (checks.length - failed) + ' ok, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
