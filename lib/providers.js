// ============================================================================
//  lib/providers.js — the paid-provider slot for ownership data.
//
//  The public GIS withholds owner names; commercial parcel APIs licence the
//  county rolls and sell them back with names, mailing addresses, sale dates
//  and prices. When a key is present on the server the matching adapter runs
//  inside the normal fan-out and its rows join the Ownership & title section
//  (labelled with the provider and the provider's own refresh date). Without a
//  key nothing here runs, nothing is charged, and the record says so.
//
//  Adapters:
//    · Regrid (REGRID_TOKEN) — app.regrid.com/api/v2/parcels/apn, written from
//      the vendor's OpenAPI spec: parcels.features[].properties.fields with
//      field_labels; standard-schema keys are read when present.
//    · California Secretary of State (SOS_API_KEY) — the free, documented
//      "BE Public Search API" (calico.sos.ca.gov/cbc/v1/api, key from
//      calicodev.sos.ca.gov; guide v1.0.4): turns a company owner's name into
//      entity number, type, status, standing, agent for service and addresses.
//      Officers are NOT in the API — they sit on the Statement of Information
//      image at bizfile, linked from the portals.
//    · RentCast (RENTCAST_KEY) — the Property Records API (api.rentcast.io/v1/properties,
//      header X-Api-Key; developers.rentcast.io "property data schema"): a circle search on
//      the parcel centre, matched to our APN by the record's assessorID digits (or by house
//      number + street when the vendor carries no assessor id), giving owner names, type,
//      owner-occupancy, mailing address, last sale, the sale history, tax assessments and
//      property taxes by year. Free plan: 50 requests a month — answers are cached per
//      instance for 30 days and the adapter is never on the watch loop. Terms (rentcast.io/
//      terms-api §1, §3.4): display and storage permitted, no attribution required.
//  Adding another (ATTOM, CoreLogic/Cotality, DataTree, PropertyRadar): one
//  async function returning { provider, asOf, rows } or null, registered in
//  PROVIDERS. Never guess an endpoint — write it from the vendor's spec.
// ============================================================================
// the three formatting helpers the resolver also uses, duplicated so this module has no import cycle
const money = (v) => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : '$' + Math.round(Number(v)).toLocaleString('en-US'));
const clean = (s) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : s);
const titleish = (s) => (typeof s === 'string' && s === s.toUpperCase() && /[A-Z]/.test(s) ? s.toLowerCase().replace(/(^|[\s\-\/(])([a-z])/g, (m, a, b) => a + b.toUpperCase()) : s);

const TIMEOUT_MS = 6500;
const REGRID_PATHS = { '06111': '/us/ca/ventura', '06037': '/us/ca/los-angeles', '06083': '/us/ca/santa-barbara', '06029': '/us/ca/kern' };

async function getJson(url, ms = TIMEOUT_MS) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': 'howard-property-atlas' } }); if (!r.ok) throw new Error('http ' + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
const nameish = (v) => { const s = clean(v); return s ? titleish(s).replace(/\bLlc\b/g, 'LLC').replace(/\bTr\b/g, 'Trust').replace(/\bInc\b/g, 'Inc.') : null; };
const dateish = (v) => { if (!v) return null; const d = new Date(String(v).slice(0, 10) + 'T12:00:00Z'); return isNaN(d) ? String(v) : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }); };

// ---- Regrid --------------------------------------------------------------------
export async function regridTitle({ apn, apn10, fips }) {
  const token = process.env.REGRID_TOKEN || '';
  if (!token) return null;
  const path = REGRID_PATHS[fips] || null;
  const q = new URLSearchParams({ parcelnumb: String(apn10 || apn || '').replace(/[^0-9A-Za-z]/g, ''), token, limit: '1', return_zoning: 'false', return_matched_buildings: 'false', return_matched_addresses: 'false' });
  if (path) q.set('path', path);
  const j = await getJson('https://app.regrid.com/api/v2/parcels/apn?' + q.toString());
  const f = j && j.parcels && Array.isArray(j.parcels.features) ? j.parcels.features[0] : null;
  if (!f || !f.properties) return null;
  const x = f.properties.fields || {}, lab = f.properties.field_labels || {};
  const asOf = x.ll_last_refresh || x.last_refresh_by_source || x.ll_updated_at || null;
  const rows = [];
  const owners = [x.owner, x.owner2, x.owner3, x.owner4].map(nameish).filter(Boolean);
  if (owners.length) rows.push(['Owner of record (Regrid · county roll' + (asOf ? ' as refreshed ' + dateish(asOf) : '') + ')', owners.join(' & ') + (x.careof ? ' · c/o ' + nameish(x.careof) : '') + (x.owntype ? ' · ' + clean(String(x.owntype)) : ''), 'owner_provider']);
  const mail = [x.mailadd, [x.mail_city, x.mail_state2].filter(Boolean).join(', '), x.mail_zip].filter(Boolean).join(' · ');
  if (mail) rows.push(['Owner’s mailing address (Regrid)', titleish(mail), 'owner_mailing_provider']);
  if (x.saledate || x.saleprice) rows.push(['Last sale (Regrid)', [x.saleprice ? money(x.saleprice) : null, x.saledate ? dateish(x.saledate) : null].filter(Boolean).join(' on '), 'sale_provider']);
  if (x.parval || x.landval || x.improvval) rows.push(['Assessed value (Regrid)', [x.parval ? money(x.parval) + ' total' : null, x.landval ? 'land ' + money(x.landval) : null, x.improvval ? 'improvements ' + money(x.improvval) : null, x.taxamt ? 'tax ' + money(x.taxamt) + (x.taxyear ? ' (' + x.taxyear + ')' : '') : null].filter(Boolean).join(' · '), 'value_provider']);
  // enhanced ownership (when the account has it): one line per record, labelled as the vendor labels it
  const eo = Array.isArray(f.properties.enhanced_ownership) ? f.properties.enhanced_ownership : [];
  eo.slice(0, 4).forEach((o, i) => { const parts = Object.keys(o).filter((k) => o[k] && /owner|name|type|mail|addr/i.test(k)).slice(0, 6).map((k) => (lab[k] || k) + ': ' + clean(String(o[k]))); if (parts.length) rows.push([i ? '' : 'Enhanced ownership (Regrid)', parts.join(' · '), 'eo_provider' + i]); });
  if (!rows.length) return null;
  rows.push(['About the provider rows', 'Regrid licenses the county assessor roll and republishes it with the roll’s own refresh date — a commercial copy of the public record, resolved live for this APN under this atlas’s key.', 'provider_note']);
  return { provider: 'Regrid', asOf, rows };
}

// ---- California Secretary of State · BE Public Search API ---------------------------
// GET /BusinessEntityKeywordSearch?search-term=… → { RecordCount, EntityData: [ {EntityID, EntityName, EntityType,
// FilingDate, StatusDescription, Jurisdiction, AgentName, AgentAddress1…, EntityStreetAddress1…, Mailing…,
// SiFrequency, StandingSOS/FTB/Agent/VCFCF (+ dates)} ] }. Header Ocp-Apim-Subscription-Key.
const SOS_BASE = 'https://calico.sos.ca.gov/cbc/v1/api/';
const entityish = (name) => String(name || '').toUpperCase().replace(/[.,'’]/g, '').replace(/\s+/g, ' ').trim();
// title-case an address but keep the state code and directionals as the post office writes them
const addrish = (a) => titleish(a).replace(/\b([A-Z][a-z])\b(?=, \d{5}|$)/g, (m) => m.toUpperCase()).replace(/\b(Ne|Nw|Se|Sw|Ste|Llc|Inc)\b/g, (m) => ({ Ne: 'NE', Nw: 'NW', Se: 'SE', Sw: 'SW', Ste: 'Ste', Llc: 'LLC', Inc: 'Inc.' })[m]);
export async function sosEntity({ name }) {
  const key = process.env.SOS_API_KEY || '';
  if (!key || !name) return null;
  const q = new URLSearchParams({ 'search-term': String(name).trim() });
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 4500);
  let j;
  try { const r = await fetch(SOS_BASE + 'BusinessEntityKeywordSearch?' + q.toString(), { signal: ctl.signal, headers: { 'Ocp-Apim-Subscription-Key': key, Accept: 'application/json', 'User-Agent': 'howard-property-atlas' } }); if (!r.ok) throw new Error('http ' + r.status); j = await r.json(); }
  finally { clearTimeout(t); }
  const list = Array.isArray(j && j.EntityData) ? j.EntityData : [];
  if (!list.length) return { provider: 'California Secretary of State', asOf: new Date().toISOString().slice(0, 10), rows: [['Business entity (Secretary of State)', 'No California entity found under “' + name + '” — the owner may be a foreign entity, a trust (trusts do not register), or the roll’s spelling differs; search bizfile by hand', 'entity_status']] };
  const want = entityish(name);
  const exact = list.filter((e) => entityish(e.EntityName) === want);
  const pick = (exact.length ? exact : list).sort((a, b) => (/active/i.test(b.StatusDescription || '') ? 1 : 0) - (/active/i.test(a.StatusDescription || '') ? 1 : 0))[0];
  const rows = [];
  const addr = (a1, a2, c, st, z) => [clean(a1), clean(a2), [clean(c), clean(st)].filter(Boolean).join(', '), clean(z)].filter(Boolean).join(', ');
  const standing = [['SOS', pick.StandingSOS], ['FTB', pick.StandingFTB], ['agent', pick.StandingAgent], ['VCFCF', pick.StandingVCFCF]].filter(([, v]) => v).map(([k, v]) => k + ' ' + (/good/i.test(String(v)) ? '✓' : String(v).toLowerCase()));
  rows.push(['Business entity (Secretary of State)', nameish(pick.EntityName) + ' · ' + (pick.EntityType || 'entity') + (pick.EntityID ? ' · no. ' + pick.EntityID : '') + (pick.Jurisdiction ? ' · ' + titleish(String(pick.Jurisdiction)) : '') + (pick.FilingDate ? ' · filed ' + dateish(pick.FilingDate) : '') + ' · status ' + (pick.StatusDescription || pick.StatusCode || 'unknown') + (standing.length ? ' (' + standing.join(' · ') + ')' : '') + (exact.length ? '' : ' — nearest match to the roll’s name, not exact') + (list.length > 1 ? ' · ' + (list.length - 1) + ' other entit' + (list.length === 2 ? 'y matches' : 'ies match') + ' the search' : ''), 'entity_status']);
  if (pick.AgentName) rows.push(['Agent for service of process', nameish(pick.AgentName) + (pick.AgentAddress1 ? ' · ' + addrish(addr(pick.AgentAddress1, pick.AgentAddress2, pick.AgentCity, pick.AgentState, pick.AgentZipCode)) : ''), 'entity_agent']);
  const ea = addr(pick.EntityStreetAddress1, pick.EntityStreetAddress2, pick.EntityCity, pick.EntityState, pick.EntityZipCode), ma = addr(pick.MailingStreetAddress1, pick.MailingStreetAddress2, pick.MailingCity, pick.MailingState, pick.MailingZipCode);
  if (ea || ma) rows.push(['Entity addresses (SOS)', [ea ? 'principal ' + addrish(ea) : null, ma && ma !== ea ? 'mailing ' + addrish(ma) : null].filter(Boolean).join(' · '), 'entity_address']);
  rows.push(['About the entity rows', 'Secretary of State BE Public Search API, read today. The managers, members or officers are on the Statement of Information image at bizfile (free to view; not in the API)' + (pick.SiFrequency ? ' — filed ' + String(pick.SiFrequency).toLowerCase() : '') + '; an LLC files only every two years, so the people behind it can be up to 24 months out of date.', 'entity_note']);
  return { provider: 'California Secretary of State', asOf: new Date().toISOString().slice(0, 10), rows };
}

// ---- RentCast · Property Records API ----------------------------------------------
// GET https://api.rentcast.io/v1/properties?latitude&longitude&radius&limit (header X-Api-Key) →
// [ { id, formattedAddress, addressLine1, county, countyFips, assessorID, legalDescription, zoning, lotSize,
//     yearBuilt, propertyType, owner: { names[], type, mailingAddress: { formattedAddress } }, ownerOccupied,
//     lastSaleDate, lastSalePrice, taxAssessments: { <year>: { year, value, land, improvements } },
//     propertyTaxes: { <year>: { year, total } }, history: { <date>: { event, date, price } } } ]
// ---- the spend meter ---------------------------------------------------------------
//   RentCast's free plan is 50 requests a month and it does NOT stop there: request 51
//   costs $0.20. The in-memory cache below is per serverless instance, and instances are
//   recycled constantly, so it cannot be the only guard. `data/provider-meter.json` keeps
//   a durable count per calendar month — COUNTS ONLY, never a name or an address, so it is
//   safe in this public repository — and the adapter refuses to call once the cap is hit.
//   The cap is RENTCAST_MAX_MONTH (default 45, leaving five in hand). Without a write token
//   the meter lives in memory only, which still caps each instance.
export const METER_PATH = 'data/provider-meter.json';
const EMPTY_METER = { schema: 1, note: 'request counts per provider per month — no names, no addresses, no parcels', months: {} };
const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);
let meterMem = null;
export const meterCap = () => { const n = Number(process.env.RENTCAST_MAX_MONTH); return isFinite(n) && n > 0 ? Math.floor(n) : 45; };
export async function meterRead(store) {
  if (!store) return meterMem || (meterMem = JSON.parse(JSON.stringify(EMPTY_METER)));
  try { const j = await store.readJson(METER_PATH, null, 120000); if (j && j.months) { meterMem = j; return j; } } catch (e) { /* fall through */ }
  return meterMem || (meterMem = JSON.parse(JSON.stringify(EMPTY_METER)));
}
export function meterCount(meter, who, month = monthKey()) { return ((meter && meter.months && meter.months[month]) || {})[who] || 0; }
export async function meterBump(store, who, month = monthKey()) {
  // pure: the same counter is bumped once for memory and once through the store, so mutating the
  // input in place would count every request twice and hit the cap at half the real spend
  const bump = (cur) => {
    const base = cur && cur.months ? cur : EMPTY_METER;
    const next = JSON.parse(JSON.stringify(base));
    next.months = next.months || {};
    next.months[month] = Object.assign({}, next.months[month]);
    next.months[month][who] = (next.months[month][who] || 0) + 1;
    const keys = Object.keys(next.months).sort();
    while (keys.length > 14) delete next.months[keys.shift()];
    next.updatedAt = new Date().toISOString();
    return next;
  };
  meterMem = bump(meterMem);
  if (!store) return meterMem;
  try { const r = await store.updateJson(METER_PATH, bump, 'meter: ' + who + ' request in ' + month); meterMem = r.data || meterMem; } catch (e) { /* the in-memory count still caps this instance */ }
  return meterMem;
}
export const meterReset = () => { meterMem = null; };

const RC_CACHE = new Map();
const RC_TTL = 30 * 86400000;
export async function rentcastTitle({ apn, apn10, lat, lon, situs, store }) {
  const key = process.env.RENTCAST_KEY || '';
  if (!key || lat == null || lon == null || !isFinite(lat) || !isFinite(lon)) return null;
  const digits = String(apn10 || apn || '').replace(/[^0-9]/g, '');
  const ck = digits || (Number(lat).toFixed(5) + ',' + Number(lon).toFixed(5));
  const hit = RC_CACHE.get(ck); if (hit && Date.now() - hit.ts < RC_TTL) return hit.data;
  // the cap: never spend past the free plan without being told to
  const cap = meterCap();
  const used = meterCount(await meterRead(store), 'rentcast');
  if (used >= cap) return { provider: 'RentCast', asOf: new Date().toISOString().slice(0, 10), matched: false, capped: true,
    rows: [['Owner of record (RentCast)', 'Not looked up — this month’s RentCast budget is spent (' + used + ' of ' + cap + ' requests; the free plan allows 50 and bills $0.20 for each one after). The public roll and any report on file still stand; raise RENTCAST_MAX_MONTH or wait for the 1st to resume.', 'owner_provider']] };
  const q = new URLSearchParams({ latitude: String(lat), longitude: String(lon), radius: '0.08', limit: '25' });
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  let list;
  await meterBump(store, 'rentcast');   // counted before the answer: a failed request still costs
  try { const r = await fetch('https://api.rentcast.io/v1/properties?' + q.toString(), { signal: ctl.signal, headers: { 'X-Api-Key': key, Accept: 'application/json', 'User-Agent': 'howard-property-atlas' } }); if (!r.ok) throw new Error('http ' + r.status); list = await r.json(); }
  finally { clearTimeout(t); }
  if (!Array.isArray(list)) list = list && Array.isArray(list.data) ? list.data : [];
  const idDigits = (x) => String(x.assessorID || '').replace(/[^0-9]/g, '');
  const houseNo = (v) => (String(v || '').match(/^\s*(\d+)/) || [])[1] || null;
  let p = digits ? list.find((x) => idDigits(x) === digits) : null;
  let how = p ? 'matched by assessor id' : null;
  if (!p && situs) {
    const hn = houseNo(situs), street = String(situs).replace(/^\s*\d+\s*/, '').split(/\s+/)[0];
    if (hn) p = list.find((x) => houseNo(x.addressLine1) === hn && (!street || new RegExp('\\b' + street.replace(/[^A-Za-z0-9]/g, '') + '\\b', 'i').test(String(x.addressLine1 || ''))));
    if (p) how = 'matched by situs address';
  }
  const asOf = new Date().toISOString().slice(0, 10);
  const rows = [];
  if (!p) {
    rows.push(['Owner of record (RentCast)', 'No RentCast property record matches this parcel within 130 m of its centre (' + list.length + ' record' + (list.length === 1 ? '' : 's') + ' nearby) — the vendor’s coverage varies by county; the public roll and the evidence on file stand', 'owner_provider']);
    const out = { provider: 'RentCast', asOf, rows, matched: false };
    RC_CACHE.set(ck, { ts: Date.now(), data: out });
    return out;
  }
  const o = p.owner || {};
  const names = (Array.isArray(o.names) ? o.names : []).map(nameish).filter(Boolean);
  if (names.length) rows.push(['Owner of record (RentCast · county roll copy as of ' + dateish(asOf) + ')', names.join(' & ') + (o.type ? ' · ' + clean(String(o.type)).toLowerCase() : '') + (p.ownerOccupied === true ? ' · owner-occupied' : p.ownerOccupied === false ? ' · not owner-occupied' : ''), 'owner_provider']);
  const mail = o.mailingAddress && (o.mailingAddress.formattedAddress || [o.mailingAddress.addressLine1, o.mailingAddress.city, o.mailingAddress.state, o.mailingAddress.zipCode].filter(Boolean).join(', '));
  if (mail) rows.push(['Owner’s mailing address (RentCast)', addrish(String(mail)), 'owner_mailing_provider']);
  const hist = Object.values(p.history || {}).filter((h) => h && h.date).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  if (p.lastSaleDate || p.lastSalePrice || hist.length) rows.push(['Last sale (RentCast)', [p.lastSalePrice ? money(p.lastSalePrice) : null, p.lastSaleDate ? dateish(p.lastSaleDate) : null].filter(Boolean).join(' on ') + (hist.length ? ' · ' + hist.length + ' recorded event' + (hist.length === 1 ? '' : 's') + ': ' + hist.slice(0, 4).map((h) => (h.event ? clean(String(h.event)).toLowerCase() + ' ' : '') + dateish(h.date) + (h.price ? ' ' + money(h.price) : '')).join('; ') : ''), 'sale_provider']);
  const years = Object.keys(p.taxAssessments || {}).sort();
  const ta = years.length ? p.taxAssessments[years[years.length - 1]] : null;
  const tyears = Object.keys(p.propertyTaxes || {}).sort();
  const tx = tyears.length ? p.propertyTaxes[tyears[tyears.length - 1]] : null;
  if (ta || tx) rows.push(['Assessed value (RentCast)', [ta && ta.value ? money(ta.value) + ' total (' + (ta.year || years[years.length - 1]) + ')' : null, ta && ta.land ? 'land ' + money(ta.land) : null, ta && ta.improvements ? 'improvements ' + money(ta.improvements) : null, tx && tx.total ? 'tax ' + money(tx.total) + ' (' + (tx.year || tyears[tyears.length - 1]) + ')' : null].filter(Boolean).join(' · ') + (years.length > 1 ? ' · ' + years.length + ' assessment years on file' : ''), 'value_provider']);
  rows.push(['About the provider rows', 'RentCast property record ' + [p.assessorID ? 'assessor id ' + p.assessorID : null, p.legalDescription ? clean(String(p.legalDescription)) : null, p.zoning ? 'zoning ' + p.zoning : null, p.lotSize ? Number(p.lotSize).toLocaleString('en-US') + ' sq ft lot' : null, p.yearBuilt ? 'built ' + p.yearBuilt : null, p.propertyType ? String(p.propertyType).toLowerCase() : null].filter(Boolean).join(' · ') + ' — ' + how + '; a commercial copy of the county roll resolved live under this atlas’s key and held for 30 days (the vendor’s own refresh date is not published per record). ' + (meterCount(meterMem, 'rentcast') + ' of ' + meterCap() + ' lookups used this month.'), 'provider_note']);
  const out = { provider: 'RentCast', asOf, rows, matched: true };
  RC_CACHE.set(ck, { ts: Date.now(), data: out });
  return out;
}
export const rentcastCacheClear = () => RC_CACHE.clear();

export const PROVIDERS = [[regridTitle, 'REGRID_TOKEN'], [rentcastTitle, 'RENTCAST_KEY']];

// run every configured provider; the first that answers wins the owner line, the rest add theirs
export async function providerTitle(ctx) {
  const active = PROVIDERS.filter(([, env]) => !!process.env[env]).map(([p]) => p);
  if (!active.length) return null;
  const results = await Promise.all(active.map((p) => p(ctx).catch((e) => ({ provider: p.name, error: String(e && e.message || e), rows: [] }))));
  const rows = [].concat(...results.filter(Boolean).map((r) => r.rows || []));
  const errors = results.filter((r) => r && r.error);
  errors.forEach((r) => rows.push(['Provider ' + r.provider, 'did not answer (' + r.error + ')', 'provider_error']));
  return rows.length ? { providers: results.filter((r) => r && !r.error).map((r) => r.provider), rows } : null;
}
