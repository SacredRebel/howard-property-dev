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

export const PROVIDERS = [regridTitle];

// run every configured provider; the first that answers wins the owner line, the rest add theirs
export async function providerTitle(ctx) {
  const active = PROVIDERS.filter((p) => (p === regridTitle ? !!process.env.REGRID_TOKEN : true));
  if (!active.length) return null;
  const results = await Promise.all(active.map((p) => p(ctx).catch((e) => ({ provider: p.name, error: String(e && e.message || e), rows: [] }))));
  const rows = [].concat(...results.filter(Boolean).map((r) => r.rows || []));
  const errors = results.filter((r) => r && r.error);
  errors.forEach((r) => rows.push(['Provider ' + r.provider, 'did not answer (' + r.error + ')', 'provider_error']));
  return rows.length ? { providers: results.filter((r) => r && !r.error).map((r) => r.provider), rows } : null;
}
