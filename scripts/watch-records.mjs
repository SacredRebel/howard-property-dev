#!/usr/bin/env node
// scripts/watch-records.mjs — the weekly watch: re-read the county roll for every watched parcel.
//
//   node scripts/watch-records.mjs <site> [--file data/watch.json] [--summary out.md] [--apns a,b] [--dry]
//
//   Watched = every property APN, every ranch lot, every parcel on the shared research list, plus
//   --apns. Each one is one /api/parcel?refresh=1 call (the anchor alone: one county request,
//   < 1 s) whose `sentinel` is compared with the last check (lib/watch.js). The file is rewritten
//   only when something changed or a parcel was checked for the first time; the summary (for the
//   GitHub issue) is written when a change was seen. Exit code 0 always, 2 if the site never answered.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyCheck, summarize, EMPTY_WATCH } from '../lib/watch.js';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const site = (args.find((a) => !a.startsWith('--')) || 'https://howard-property-dev.vercel.app').replace(/\/$/, '');
const opt = (name, dflt) => { const i = args.indexOf('--' + name); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : dflt; };
const file = resolve(here, '..', opt('file', 'data/watch.json'));
const summaryPath = opt('summary', null);
const extra = (opt('apns', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
const dry = args.includes('--dry');

const getJson = async (url, tries = 2) => {
  for (let i = 0; i < tries; i++) {
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 25000);
      const r = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } });
      clearTimeout(t);
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('http ' + r.status);
      return await r.json();
    } catch (e) { if (i === tries - 1) throw e; await new Promise((ok) => setTimeout(ok, 1500)); }
  }
};

// 1 · what to watch
const targets = new Map();   // apn -> { apn, county, label }
const add = (apn, county, label) => { const k = String(apn || '').trim(); if (!k) return; if (!targets.has(k)) targets.set(k, { apn: k, county: county || null, label: label || null }); };
let props = null, research = null;
try { props = await getJson(site + '/api/properties'); } catch (e) { console.error('properties: ' + e.message); }
try { research = await getJson(site + '/api/research'); } catch (e) { console.error('research: ' + e.message); }
if (!props) { console.error('the site did not answer'); process.exit(2); }
const list = Array.isArray(props) ? props : (props.properties || []);
for (const p of list) {
  if (p.apn) add(p.apn, p.county, p.name);
  for (const l of p.lots || []) if (l.apn) add(l.apn, p.county, (p.shortLabel || p.name) + ' · ' + (l.name || l.id));
}
for (const it of (research && research.items) || []) if (it.apn) add(it.apn, it.county, it.situs || 'research list');
for (const a of extra) add(a, null, 'command line');
console.log('watching ' + targets.size + ' parcels at ' + site);

// 2 · the file
let watch;
try { watch = JSON.parse(readFileSync(file, 'utf8')); } catch { watch = JSON.parse(JSON.stringify(EMPTY_WATCH)); }
watch.parcels = watch.parcels || {};
const before = JSON.stringify(watch);

// 3 · the checks, four at a time
const now = new Date().toISOString();
const queue = Array.from(targets.values());
const results = [];
let failed = 0;
const worker = async () => {
  while (queue.length) {
    const t = queue.shift();
    const url = site + '/api/parcel?apn=' + encodeURIComponent(t.apn) + (t.county ? '&county=' + t.county : '') + '&refresh=1';
    try {
      const parcel = await getJson(url);
      if (!parcel || !parcel.apn10) { console.log('  ' + t.apn + ': no parcel'); failed++; continue; }
      const r = applyCheck(watch, parcel, now);
      if (!r) { console.log('  ' + t.apn + ': no sentinel'); continue; }
      if (t.label && watch.parcels[r.apn10]) watch.parcels[r.apn10].label = t.label;
      r.situs = parcel.situs || null;
      results.push(r);
      console.log('  ' + t.apn + ': ' + (r.first ? 'first check' : r.changes.length ? 'CHANGED — ' + r.changes.map((c) => c.text).join('; ') : 'unchanged'));
    } catch (e) { failed++; console.log('  ' + t.apn + ': ' + e.message); }
  }
};
await Promise.all([worker(), worker(), worker(), worker()]);

// 4 · write only when something is new
const sum = summarize(results, site);
const changed = JSON.stringify(watch) !== before;
console.log('\n' + results.length + ' checked, ' + failed + ' failed, ' + sum.changed + ' changed' + (changed ? '' : ' — file unchanged'));
if (!dry && changed) { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, JSON.stringify(watch, null, 2) + '\n'); console.log('wrote ' + file); }
if (summaryPath && sum.changed) { writeFileSync(summaryPath, sum.text); console.log('summary → ' + summaryPath); }
console.log('\n' + sum.text);
