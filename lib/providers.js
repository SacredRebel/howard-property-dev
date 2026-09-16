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
