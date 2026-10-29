#!/usr/bin/env node
/**
 * Report what is ready to publish and what is blocked from outside this machine.
 * A local failure is fatal (exit 1). A missing credential is only an external blocker: it is printed and counted,
 * but it does not fail the check, because everything on this machine is still verifiable.
 */
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const items = [];
const add = (name, ok, detail = '', fatal = true) => items.push({ name, ok, detail, fatal });

add('production build exists', existsSync('web/dist/index.html'));
try {
  const out = execSync('node tests/site.test.mjs').toString().trim().split('\n').pop() ?? '';
  add('gates pass', /0 failed$/.test(out), out);
} catch (e) { add('gates pass', false, String(e).slice(0, 140)); }
add('publish workflow present', existsSync('.github/workflows/publish.yml'));
add('Cloudflare Pages config present', existsSync('wrangler.toml'));
add('portable typecheck config present', existsSync('tsconfig.ci.json'));
add('URL classification present', existsSync('config/urls.json'));
add('image manifest present', existsSync('content/images-manifest.json'));
const remotes = execSync('git remote -v').toString().trim();
add('git remote configured', remotes.length > 0, remotes || 'external blocker: no remote, so nothing can be pushed from here', false);
for (const v of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID']) {
  add(v + ' present', !!process.env[v], process.env[v] ? 'present' : 'external blocker: not present in this environment', false);
}

for (const i of items) console.log((i.ok ? '  OK    ' : i.fatal ? '  FAIL  ' : '  BLOCK ') + i.name + (i.detail ? ' :: ' + i.detail : ''));
const fatal = items.filter((i) => !i.ok && i.fatal).length;
const blocked = items.filter((i) => !i.ok && !i.fatal).length;
console.log('[deploy-check] ' + (items.length - fatal - blocked) + ' ready, ' + fatal + ' local failure(s), ' + blocked + ' external blocker(s)');
process.exit(fatal ? 1 : 0);