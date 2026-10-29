#!/usr/bin/env node
/**
 * Smoke test for the built site and for the published one.
 *
 * With no argument it checks the artefact in web/dist the way a reader would arrive at it: every URL the
 * classification keeps is a real file, has a title and a canonical on the published domain, no kept page is
 * secretly noindex, no noindex page is in the sitemap, and no page carries placeholder text.
 *
 * With a URL argument it becomes the post-publish test: it fetches every kept URL from the live site and
 * checks the status and the title, so "publish and smoke-test" is one command after the credentials exist.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const base = process.argv[2];
const urls = JSON.parse(readFileSync('config/urls.json', 'utf8'));
const status = existsSync('reports/status.json') ? JSON.parse(readFileSync('reports/status.json', 'utf8')) : {};
const domain = urls.site || status.site;
const outDir = 'web/dist';
const fileFor = (u) => {
  const clean = u.split('#')[0].split('?')[0];
  if (clean.endsWith('/')) return join(outDir, clean.slice(1), 'index.html');
  return join(outDir, clean.replace(/^\//, ''));
};
const PLACEHOLDER = /\b(tbd|todo|lorem ipsum|placeholder|coming soon)\b/i;

if (!base) {
  const fails = [];
  const sitemap = existsSync(join(outDir, 'sitemap.xml')) ? readFileSync(join(outDir, 'sitemap.xml'), 'utf8') : '';
  let kept = 0, noindexed = 0;
  for (const e of urls.entries ?? []) {
    const keep = e.action !== 'noindex';
    const f = fileFor(e.url);
    if (keep) {
      kept++;
      if (!existsSync(f)) { fails.push(e.url + ': no file'); continue; }
      const h = readFileSync(f, 'utf8');
      if (!/<title>[^<]+<\/title>/.test(h)) fails.push(e.url + ': no title');
      if (!h.includes('https://' + domain + '/')) fails.push(e.url + ': canonical is not on ' + domain);
      if (h.includes('noindex')) fails.push(e.url + ': a kept page says noindex');
      if (PLACEHOLDER.test(h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]*>/g, ' '))) fails.push(e.url + ': placeholder text');
    } else {
      noindexed++;
      if (sitemap.includes('https://' + domain + e.url)) fails.push(e.url + ': noindex page is in the sitemap');
      if (existsSync(f) && !readFileSync(f, 'utf8').includes('noindex')) fails.push(e.url + ': is not marked noindex');
    }
  }
  for (const required of ['index.html', '404.html', 'sitemap.xml', 'robots.txt', 'style.css']) {
    if (!existsSync(join(outDir, required))) fails.push(required + ': missing from the artefact');
  }
  if (!sitemap.includes('https://' + domain + '/')) fails.push('sitemap: not on the published domain');
  console.log('[smoke] ' + domain + ': ' + kept + ' kept, ' + noindexed + ' noindex, artefact in ' + outDir);
  if (fails.length) { for (const f of fails.slice(0, 12)) console.log('  FAIL ' + f); console.log('[smoke] ' + fails.length + ' failure(s)'); process.exit(1); }
  console.log('[smoke] the artefact passes; point this script at the live URL after publishing');
  process.exit(0);
}

const root = base.replace(/\/$/, '');
const fails = [];
let checked = 0;
for (const e of urls.entries ?? []) {
  if (e.action === 'noindex') continue;
  const url = root + e.url;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const body = res.ok ? await res.text() : '';
    checked++;
    if (!res.ok) fails.push(url + ': HTTP ' + res.status);
    else if (!/<title>[^<]+<\/title>/.test(body)) fails.push(url + ': no title in the response');
    else if (!body.includes('https://' + domain + '/')) fails.push(url + ': canonical is not on ' + domain);
  } catch (err) {
    fails.push(url + ': ' + String(err).slice(0, 80));
  }
}
console.log('[smoke] live ' + root + ': ' + checked + ' page(s) checked');
if (fails.length) { for (const f of fails.slice(0, 12)) console.log('  FAIL ' + f); console.log('[smoke] ' + fails.length + ' failure(s)'); process.exit(1); }
console.log('[smoke] the live site answers every kept URL with a titled page on the published domain');
