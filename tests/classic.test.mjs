// The classic page (/classic): Leaflet served from tests/node_modules, stub tiles, a stubbed county
// record (core answers at once, the full part 700 ms later) — the community card, the full record on
// the property panel, collapse / expand / refresh / report, the lot record, the editor gate.
import { launch, check, done, PNG, BASE, EXT, OUT, here } from './lib.mjs';
import { readFileSync } from 'fs';
import { join } from 'path';

const LJS = readFileSync(join(here, 'node_modules', 'leaflet', 'dist', 'leaflet.js'));
const LCSS = readFileSync(join(here, 'node_modules', 'leaflet', 'dist', 'leaflet.css'));
const b = await launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
const pg = await ctx.newPage();
const errs = []; pg.on('pageerror', e => errs.push('PAGE ' + e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 200)); });
const calls = [];
const ORDER = ['identity', 'valuation', 'title', 'landuse', 'structures', 'hazards', 'seismic', 'fire', 'terrain', 'ground', 'water', 'habitat', 'cultural', 'access', 'districts', 'survey', 'permits', 'records'];
function core(apn) {
  return { part: 'core', apn, apn10: apn.replace(/-/g, ''), situs: '11962 SULPHUR MOUNTAIN RD', acreage: 9.47, center: [34.4326, -119.1564], county: { fips: '06111', name: 'Ventura County', state: 'CA', stateName: 'California', adapter: 'ventura', authority: 'Ventura County GIS · Assessor' },
    flags: [{ level: 'watch', key: 'fire', text: 'Very High fire severity — check insurability early.' }, { level: 'good', key: 'records', text: '10 recorded maps cover this parcel, back to 1872.' }],
    sections: [{ id: 'identity', label: 'Identity & location', rows: [['APN', apn, 'apn'], ['Situs address', '11962 SULPHUR MOUNTAIN RD', 'situs'], ['', 'continuation row', null]] }, { id: 'valuation', label: 'Assessor · valuation & transfer', rows: [['Total assessed value', '$1,078,140', 'total_value']] }, { id: 'title', label: 'Ownership & title', rows: [['Owner on the 2018 assessor roll', 'Dolan Rebecca Trust · mailing address in Paso Robles, CA', 'owner_2018'], ['Title timeline (public roll)', 'November 29, 1978 — sale · ≈$117,500', 'chain0'], ['', 'August 2, 2024 — deed (D) · 2024000052341', 'chain1']] }, { id: 'landuse', label: 'Land use & entitlement', rows: [['Zoning', 'RA-5 ac/HCWC', 'zoning']] }, { id: 'hazards', label: 'Hazards · flood, slope, ground', rows: [['FEMA flood zone (county copy)', 'Zone A touches the parcel', 'flood100']] }, { id: 'water', label: 'Water', rows: [['Public sewer', 'No public sewer line mapped within 600 m — onsite septic', 'sewer']] }],
    records: [{ label: 'WCR2021-011297', type: 'WCR', url: 'https://cadwr.app.box.com/v/WellCompletionReports/file/899273414917', year: '2021', surveyor: 'Sierra Exploration Drilling Co Inc', note: '260 ft · 55 gpm' }, { label: '14-PM-15', type: 'PM', url: 'https://maps.ventura.org/recordmaps/pm/014/014pm015.pdf', year: '1973', surveyor: 'Heathcote, Kenneth S', pages: 2 }, { label: '1A-MR-17', type: 'MR', url: 'https://maps.ventura.org/recordmaps/mr/001/001Amr017.pdf', year: '1872', surveyor: 'Thompson, George H' }],
    raw: [['APN10', apn.replace(/-/g, '')], ['SITUS', '11962 SULPHUR MOUNTAIN RD'], ['L_V', '961860']],
    portals: [{ group: 'county', label: 'Assessor · property search', url: 'https://assessor.venturacounty.gov/assessor-data/property-search/', method: 'post', fields: { apn: apn.replace(/-/g, '') }, note: 'Owner of record, use code' }, { group: 'county', label: 'Clerk-Recorder · official records', url: 'https://clerkrecorderselfservice.venturacounty.gov/web/user/disclaimer', note: 'Deeds, easements, liens' }, { group: 'state', label: 'CGS EQ Zapp', url: 'https://maps.conservation.ca.gov/cgs/EQZApp/app/' }, { group: 'federal', label: 'FEMA Flood Map Service Center', url: 'https://msc.fema.gov/portal/home', note: 'FIRM panel' }],
    sourcesQueried: 103, sourcesAnswered: 101, sourcesLate: 0, partial: false, resolvedAt: new Date().toISOString(), ms: 8800 };
}
const deepSecs = [{ id: 'seismic', label: 'Faults & earthquakes', rows: [['Peak ground acceleration', '0.66 g — CGS Map Sheet 48', 'pga475']] }, { id: 'terrain', label: 'Terrain', rows: [['Ground under 20 % slope', '3.19 ac of 9.45', 'buildable']] }, { id: 'hazards', label: 'Hazards · flood, slope, ground', rows: [['FEMA National Flood Hazard Layer', 'Zone A — part of the parcel is a SFHA', 'nfhl']] }];
const readOf = (deep) => ['Buildable ground', 'Entitlement headroom', 'Hazard load', 'Water', 'Access & utilities', 'Value signal', 'Change over time'].map((label, i) => ({ id: 'd' + i, label, value: i === 0 ? (deep ? '3.19 ac under 20 %' : '—') : 'value ' + i, score: i < 5 ? 40 + i * 10 : null, note: i === 0 && !deep ? 'terrain grid not resolved yet' : 'note ' + i }));
await pg.route('**/*', r => {
  const u = r.request().url();
  if (/unpkg\.com\/maplibre/.test(u)) return r.abort();   // the 3D engine pre-warm: silent onerror, no WebGL here anyway
  if (/unpkg\.com\/leaflet@/.test(u)) return r.fulfill({ status: 200, contentType: /\.css/.test(u) ? 'text/css' : 'application/javascript', body: /\.css/.test(u) ? LCSS : LJS });
  if (/^https?:\/\/(?!localhost|127\.0\.0\.1)/.test(u) && !EXT.test(u) && !/\/api\//.test(u)) return r.abort();
  if (u.includes('/api/dossier')) {
    calls.push(u.slice(u.indexOf('?')));
    const apn = decodeURIComponent((/apn=([^&]+)/.exec(u) || [])[1] || '037-0-012-125');
    const c = core(apn);
    if (/part=all/.test(u)) {
      const secs = ORDER.map(id => { const a = c.sections.find(s => s.id === id), d = deepSecs.find(s => s.id === id); if (!a && !d) return null; return { id, label: (a || d).label, rows: [...(a ? a.rows : []), ...(d ? d.rows : [])] }; }).filter(Boolean);
      const all = { ...c, part: 'all', sections: secs, flags: [...c.flags, { level: 'watch', key: 'steep', text: '42 % of the parcel is steeper than 30 %' }], terrain: { buildableAcres: 3.19, areaAcres: 9.45 }, sourcesQueried: 128, sourcesAnswered: 126, read: readOf(true) };
      return setTimeout(() => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(all) }), 700);
    }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...c, read: readOf(false) }) });
  }
  if (EXT.test(u)) return r.fulfill({ status: 200, contentType: 'image/png', body: PNG });
  return r.continue();
});
const ev = (fn, arg) => pg.evaluate(fn, arg);

await pg.goto(BASE + '/classic', { waitUntil: 'domcontentloaded', timeout: 30000 });
await pg.waitForFunction(() => window.leafletMap && typeof window.loadDossier === 'function' && typeof window.openLotRecord === 'function', { timeout: 30000 });
await pg.waitForTimeout(800);
const boot = await ev(() => ({ chips: document.querySelectorAll('.property-label-chip, .label-chip').length, adminHidden: (document.getElementById('admin-menu-toggle') || {}).style?.display === 'none', layers: !!document.getElementById('layers-toggle'), earth: !!document.getElementById('earth-toggle'), mode: !!document.getElementById('mode-toggle') }));
check('boot: map, layers / 3D / mode controls; the editor toggle is hidden for visitors (V0.31 gate)', boot.layers && boot.earth && boot.mode && boot.adminHidden, boot);

// 1. community card → property panel → the county record, core first then the full part
await ev(() => { window.openCommunityCard('sulphur-mountain'); }); await pg.waitForTimeout(250);
check('community card opens from the boundary', await ev(() => document.getElementById('community-card').classList.contains('open')));
await pg.click('#community-card .cc-btn.primary');
await pg.waitForSelector('#dossier-body .ds-head .ds-apn', { timeout: 8000 });
const s1 = await ev(() => ({ apn: document.querySelector('#dossier-body .ds-apn').textContent, acts: [...document.querySelectorAll('#dossier-body .ds-acts .ds-btn')].length, flags: document.querySelectorAll('#dossier-body .ds-flag').length, tiles: document.querySelectorAll('#dossier-body .ds-read .ds-rd').length, secs: [...document.querySelectorAll('#dossier-body details.ds-sec')].map(d => d.dataset.sec), waitI: !!document.querySelector('#dossier-body .ds-wait-i') }));
check('record (core): APN, actions, 2 flags, the seven tiles, Ownership & title between valuation and land use, a waiting indicator for the full part', s1.apn === '037-0-012-125' && s1.acts >= 5 && s1.flags === 2 && s1.tiles === 7 && s1.secs.indexOf('title') === s1.secs.indexOf('valuation') + 1 && s1.secs.indexOf('landuse') === s1.secs.indexOf('title') + 1 && s1.waitI, s1);
await pg.waitForFunction(() => !document.querySelector('#dossier-body .ds-wait-i'), { timeout: 8000 });
const s2 = await ev(() => ({ flags: document.querySelectorAll('#dossier-body .ds-flag').length, secs: [...document.querySelectorAll('#dossier-body details.ds-sec')].map(d => d.dataset.sec + (d.open ? '+' : '-')), hazRows: document.querySelectorAll('#dossier-body details[data-sec=hazards] .ds-row').length, contRows: document.querySelectorAll('#dossier-body .ds-row.cont').length, tile0: document.querySelector('#dossier-body .ds-rd .ds-rd-v').textContent, forms: document.querySelectorAll('#dossier-body form.ds-pf input[type=hidden]').length, links: document.querySelectorAll('#dossier-body a.ds-pl').length, groups: [...document.querySelectorAll('#dossier-body .ds-pg-l')].length, docs: document.querySelectorAll('#dossier-body a.ds-doc').length, wcr: [...document.querySelectorAll('#dossier-body a.ds-doc')].some(a => /WCR2021/.test(a.textContent)), rawOpen: document.querySelector('#dossier-body details[data-sec=raw]').open, rawRows: document.querySelectorAll('#dossier-body details[data-sec=raw] .ds-row').length, atlasLink: document.querySelector('#dossier-body a.ds-btn[href^="/?apn="]')?.getAttribute('href') }));
check('record (all): 3 flags, merged hazards (2 rows), continuation rows, the buildable tile filled, POST bridge + portal links in 3 groups, 3 records incl. the well report, raw closed, open-in-the-atlas link', s2.flags === 3 && s2.hazRows === 2 && s2.contRows === 2 && /3\.19/.test(s2.tile0) && s2.forms >= 1 && s2.links >= 3 && s2.groups === 3 && s2.docs === 3 && s2.wcr && s2.rawOpen === false && s2.rawRows === 3 && s2.atlasLink === '/?apn=037-0-012-125', s2);
check('record: every section but raw is open', s2.secs.filter(s => s.endsWith('-')).every(s => /^raw|^portals/.test(s)) && s2.secs.filter(s => s.endsWith('+')).length >= 8, s2.secs);
check('record: the panel asks for core+read and all+read at once', calls.some(c => /part=core/.test(c) && /read=1/.test(c)) && calls.some(c => /part=all/.test(c) && /read=1/.test(c)), calls);

// 2. collapse / expand
await pg.click('#dossier-body [data-ds=expand]');
const c1 = await ev(() => [...document.querySelectorAll('#dossier-body details.ds-sec')].filter(d => d.open).length);
await pg.click('#dossier-body [data-ds=expand]');
const c2 = await ev(() => [...document.querySelectorAll('#dossier-body details.ds-sec')].filter(d => d.open).length);
check('collapse all → none open; expand all → every section open', c1 === 0 && c2 >= 8, { c1, c2 });

// 3. refresh bypasses the cache
calls.length = 0;
await pg.click('#dossier-body [data-ds=refresh]');
await pg.waitForFunction(() => document.querySelector('#dossier-body .ds-head') && !document.querySelector('#dossier-body .ds-wait-i'), { timeout: 8000 });
check('refresh re-asks both parts with refresh=1', calls.length === 2 && calls.every(c => /refresh=1/.test(c)), calls);

// 4. the printable report opens in a new tab
const [rep] = await Promise.all([ctx.waitForEvent('page', { timeout: 5000 }), pg.click('#dossier-body [data-ds=print]')]);
await rep.waitForLoadState('domcontentloaded');
const report = { title: await rep.title(), h2s: await rep.evaluate(() => document.querySelectorAll('h2').length), tables: await rep.evaluate(() => document.querySelectorAll('table').length) };
check('report: a titled page with a heading and a table per section', /037-0-012-125/.test(report.title) && report.h2s >= 8 && report.tables >= 8, report);
await rep.close();
await ev(() => document.getElementById('dossier-section').scrollIntoView()); await pg.waitForTimeout(300);
await pg.screenshot({ path: join(OUT, 'classic-record.png') });

// 5. lot popup → the lot record
await ev(() => { if (typeof closePropertyPanel === 'function') closePropertyPanel(); }); await pg.waitForTimeout(300);
calls.length = 0;
await ev(() => window.openLotRecord('black-mountain-ranch', '051-0-050-010'));
await pg.waitForSelector('#dossier-body .ds-head .ds-apn', { timeout: 8000 });
const lot = await ev(() => ({ sub: document.getElementById('dossier-sub').textContent, apn: document.querySelector('#dossier-body .ds-apn').textContent }));
check('lot record: opens the panel on that lot’s APN', lot.apn === '051-0-050-010' && /051-0-050-010|lot/i.test(lot.sub) && calls.every(c => /051-0-050-010/.test(c)), { lot, calls });
const popups = await ev(() => Object.values(window.leafletMap._layers).filter(l => l.getPopup && l.getPopup() && /county record for this lot/.test(l.getPopup().getContent())).length);
check('every ranch lot popup links to the record for that lot (63 lots)', popups >= 63, popups);

// 6. the editor gate: ?edit=1 shows the toggle, ?edit=0 hides it again
await pg.goto(BASE + '/classic?edit=1', { waitUntil: 'domcontentloaded', timeout: 30000 });
await pg.waitForFunction(() => window.leafletMap, { timeout: 30000 }); await pg.waitForTimeout(400);
check('editor gate: ?edit=1 shows the ⚙ toggle', await ev(() => document.getElementById('admin-menu-toggle').style.display !== 'none' && localStorage.getItem('ojaiMapEditor') === '1'));
await pg.goto(BASE + '/classic?edit=0', { waitUntil: 'domcontentloaded', timeout: 30000 });
await pg.waitForFunction(() => window.leafletMap, { timeout: 30000 }); await pg.waitForTimeout(400);
check('editor gate: ?edit=0 hides it and forgets', await ev(() => document.getElementById('admin-menu-toggle').style.display === 'none' && localStorage.getItem('ojaiMapEditor') === null));

check('no page errors', errs.length === 0, errs.slice(0, 5));
await b.close();
done('classic');
