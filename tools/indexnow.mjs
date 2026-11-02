#!/usr/bin/env node
/**
 * Submit the built sitemap to IndexNow (Bing/Yandex and the other participating engines).
 *
 * The key file is served at /<key>.txt and web/assets/indexnow-key.txt holds the same value; it is a public
 * ownership marker, not a secret. This script is run by hand after a deploy: it is deliberately NOT part of the
 * build, the gates or the publish workflow, because submitting URLs is an external side effect.
 *
 *   node tools/indexnow.mjs                       # submit https://supermarketsimulator.wiki/sitemap.xml URLs
 *   node tools/indexnow.mjs --dry-run             # print what would be submitted, no network call
 *   node tools/indexnow.mjs https://example.test  # override the base URL
 */
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const base = args.find((a) => /^https?:\/\//.test(a)) ?? 'https://supermarketsimulator.wiki';
const key = readFileSync(new URL('../web/assets/indexnow-key.txt', import.meta.url), 'utf8').trim();
const sitemap = readFileSync(new URL('../web/dist/sitemap.xml', import.meta.url), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const host = new URL(base).host;
const keyLocation = base.replace(/\/$/, '') + '/' + key + '.txt';
const body = { host, key, keyLocation, urlList: urls };
if (dryRun) {
  console.log('[indexnow] dry run: ' + urls.length + ' urls for ' + host + ' | key file ' + keyLocation);
  for (const u of urls) console.log('  ' + u);
  process.exit(0);
}
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});
console.log('[indexnow] ' + res.status + ' ' + res.statusText + ' | ' + urls.length + ' urls | key file ' + keyLocation);
if (![200, 202].includes(res.status)) process.exit(1);
