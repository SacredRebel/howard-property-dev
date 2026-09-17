// lib/title-report.js: the report reader on a fictional PropertyChecker-layout fixture, the evidence
// composition into the Ownership & title rows, and the server routes' validation paths.
import { check, done, here, BASE } from './lib.mjs';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { parseReport, monthsSince } from '../lib/title-report.js';
import { composeTitle, evidenceStructures, readFrom } from '../lib/dossier.js';

const text = readFileSync(join(here, 'fixtures', 'report-sample.txt'), 'utf8');
const ev = parseReport(text, { CreationDate: "D:20250316202655-04'00'", Title: 'Property Report - 4410 Quail Ridge Rd, Ojai, CA 93023' });
check('parser: recognises the layout and finds the APN', !!ev && ev.apn === '099-0-123-456' && ev.apn10 === '0990123456', ev && ev.apn);
check('parser: source, situs, county, coordinates', ev.source.provider === 'PropertyChecker' && ev.source.preparedOn === '2025-03-16' && ev.situs === '4410 QUAIL RIDGE RD, OJAI, CA 93023' && ev.county === 'VENTURA' && Array.isArray(ev.latlon), { source: ev.source, situs: ev.situs });
check('parser: owner of record, company, not occupied, mailing address, held 7 months', ev.owner.names.join() === '4410 QUAIL RIDGE HOLDINGS LLC' && ev.owner.company && ev.owner.occupied === false && /Example Way/.test(ev.owner.mailing) && ev.owner.ownershipLength === '7mo', ev.owner);
check('parser: the ownership timeline (4 events, dated, one priced)', ev.timeline.length === 4 && ev.timeline[0].type === 'GRANT DEED' && ev.timeline[0].date === '2024-07-29' && ev.timeline[2].price === 750000 && ev.timeline[3].year === 1996, ev.timeline);
check('parser: the deed (grantee, document, recorded)', ev.deed.grantee === '4410 QUAIL RIDGE HOLDINGS LLC' && ev.deed.document === '0000099999' && ev.deed.recorded === '2024-08-02' && ev.deed.ownerOccupied === false, ev.deed);
check('parser: 4 loans newest first with lender, type and amount', ev.loans.length === 4 && ev.loans[0].amount === 1200000 && ev.loans[0].lender === 'EXAMPLE CAPITAL LLC' && ev.loans[0].date === '2024-08-02' && ev.loans[3].date === '1996-04-02', ev.loans);
check('parser: 3 liens with the debtor reduced to initials, amount, case, creditor, court', ev.liens.length === 3 && ev.liens.every(l => /^([A-Z]\. ?)+$/.test(l.debtor)) && ev.liens[0].amount === 12000 && ev.liens[0].caseNumber === '20151209000000001' && ev.liens[0].type === 'STATE TAX LIEN' && ev.liens[0].creditor === 'STATE OF CALIFORNIA' && /VENTURA COUNTY COURT/.test(ev.liens[0].court), ev.liens);
check('parser: no full names anywhere in the evidence', !/Alex|Chris|Tenant|Renter/.test(JSON.stringify(ev)), Object.keys(ev));
check('parser: judgments and pre-foreclosures read as empty', Array.isArray(ev.judgments) && ev.judgments.length === 0 && Array.isArray(ev.preForeclosures) && ev.preForeclosures.length === 0);
check('parser: values (estimate, per sq ft, rent, last sale)', ev.values.marketEstimate === 1495000 && ev.values.perSqFt === 1171 && ev.values.rentEstimate === 6637 && ev.values.lastSaleDate === '2018-12-18' && ev.values.lastSaleAmount === 750000, ev.values);
check('parser: taxes (bill, year, assessed split, delinquency, zoning code)', ev.taxes.bill === 9558 && ev.taxes.year === 2024 && ev.taxes.assessedTotal === 874915 && ev.taxes.assessedLand === 765552 && ev.taxes.delinquent === '2023' && ev.taxes.zoningCode === 'RA5AC' && ev.taxes.exemption === null, ev.taxes);
check('parser: 12 years of tax history, oldest first', ev.taxHistory.length === 12 && ev.taxHistory[0].year === 2012 && ev.taxHistory[11].year === 2023 && ev.taxHistory[8].assessment === 816000, ev.taxHistory.map(h => h.year + ':' + h.assessment));
check('parser: 2 permits with wrapped descriptions and split keys', ev.permits.length === 2 && ev.permits[0].number === 'B18-000001' && ev.permits[0].fees === 248 && /thomas fire/.test(ev.permits[0].description) && ev.permits[1].number === 'E00-000002' && /general wiring throughout$/.test(ev.permits[1].description), ev.permits);
check('parser: building facts', ev.building.beds === 2 && ev.building.baths === 1 && ev.building.sqft === 1277 && ev.building.yearBuilt === 1920 && ev.building.lotAcres === 9 && ev.building.garageSqft === 480 && ev.building.construction === 'WOOD' && ev.building.fireplace === 1, ev.building);
check('parser: a non-report PDF text is rejected', parseReport('Hello world\nnothing here', {}) === null);
check('monthsSince: months between an ISO date and now', monthsSince('2025-03-16', new Date('2026-09-16T00:00:00Z')) === 18);

// ---- composition with a roll that carries the same instrument (year-prefixed) ----
ev.importedAt = '2026-09-16T00:00:00.000Z';
const rollRows = [['Owner on the 2018 assessor roll', 'Prior Owner Trust · mailing address in Somewhere, CA', 'owner_2018'], ['Owner of record today', 'Changed or re-titled after the 2018 snapshot: …', 'owner_now'], ['Last recorded document (live roll)', 'deed (D) · 2024000099999 · August 2, 2024', 'doc_nr'], ['Sale price on the roll', 'None carried on the live roll; …', 'sale_price'], ['Title timeline (public roll)', 'November 29, 1978 — sale · ≈$117,500', 'chain0'], ['', 'August 2, 2024 — deed (D) · 2024000099999 · change in ownership, not a recorded sale price', 'chain1'], ['Prop 13 base year', '78/11 on the 2018 roll', 'base_year'], ['About these rows', 'Live rows come from…', 'title_note']];
const rows = composeTitle(rollRows, ev, { doc: '2024000099999', date8: '20240802', desc: 'deed (D)', total: 1078140 }, null);
const key = k => rows.find(r => r[2] === k), val = k => (key(k) ? String(key(k)[1]) : '');
check('compose: owner of record first, named, confirmed by the roll’s same instrument', rows[0][2] === 'owner_now' && /4410 Quail Ridge Holdings LLC \(a company, not owner-occupied\)/.test(val('owner_now')) && /confirmed by the live county roll/.test(val('owner_now')), val('owner_now'));
check('compose: mailing address and held-since follow', rows[1][2] === 'owner_mailing' && rows[2][2] === 'owner_since' && /July 29, 2024/.test(val('owner_since')), rows.slice(0, 4).map(r => r[2]));
check('compose: last sale from the report replaces the roll’s empty sale row', /^\$750,000 on December 18, 2018 — grant deed to Pat E Seller/.test(val('sale_price')), val('sale_price'));
const chain = rows.filter(r => /^chain\d+$/.test(r[2])).map(r => String(r[1]));
check('compose: one merged timeline, dated and sorted, roll duplicates dropped, deeds of trust folded into their loans', chain.length === 8 && /^November 29, 1978/.test(chain[0]) && chain.filter(c => /2024000099999|0000099999/.test(c)).length === 1 && !chain.some(c => /deed of trust · /.test(c)) && chain.every((c, i) => !i || c.slice(0, 4) >= '1978'), chain);
check('compose: loans, liens, judgments, tax bill, delinquency, history, permits, estimate rows present', ['loan0', 'loan3', 'lien0', 'lien2', 'judgments', 'tax_bill', 'tax_delinquent', 'tax_history', 'permit0', 'permit1', 'market_estimate', 'base_year', 'owner_2018', 'title_source', 'title_note'].every(k => !!key(k)), rows.map(r => r[2]));
check('compose: the tax bill says the live roll moved past the report', /the live roll now carries \$1,078,140/.test(val('tax_bill')), val('tax_bill'));
check('compose: the tax history names the 2020 reassessment', /reassessed ×3\.4 in 2020/.test(val('tax_history')), val('tax_history'));
check('compose: the history row is last-but-two and the evidence line dates both sources', rows[rows.length - 3][2] === 'owner_2018' && /PropertyChecker report of March 16, 2025 \(\d+ months old\)/.test(val('title_source')) && /live county roll was read/.test(val('title_source')), val('title_source'));
const newer = composeTitle(rollRows, ev, { doc: '2025000012345', date8: '20250601', desc: 'grant deed (GD)', total: 1078140 }, null);
check('compose: a newer roll document flags the report’s name as possibly stale', /⚠ the live county roll carries a NEWER document \(grant deed \(GD\) 2025000012345 of June 1, 2025\)/.test(String(newer[0][1])), newer[0][1]);
const bare = composeTitle(rollRows, null, { doc: '2024000099999', date8: '20240802', desc: 'deed (D)', total: null }, null);
check('compose: without evidence the roll’s rows stand and the evidence line says how to add some', bare[0][2] === 'owner_now' && /^Changed or re-titled/.test(String(bare[0][1])) && /No property report imported/.test(String(bare.find(r => r[2] === 'title_source')[1])), bare.map(r => r[2]));
check('structures: the dwelling line from the report', /2 bd \/ 1 ba · 1,277 sq ft · built 1920 · 1 story · wood frame · garage 480 sq ft · fireplace/.test(String(evidenceStructures(ev)[0][1])), evidenceStructures(ev));
const dims = readFrom({ sections: [{ id: 'title', rows }, { id: 'valuation', rows: [['Total assessed value', '$1,078,140', 'total_value']] }], records: [] });
check('read: the value dimension carries the last sale and the vendor estimate', /last sale \$750,000/.test(dims[5].note) && /estimate \$1,495,000/.test(dims[5].note), dims[5]);
check('read: the change dimension counts the merged title events', /8 title events/.test(dims[6].note), dims[6]);

// ---- the Secretary of State adapter, against a stubbed API (the shape from the SOS API guide v1.0.4) ----
const { sosEntity, providerTitle } = await import('../lib/providers.js');
check('providers: nothing runs without a key', (await providerTitle({ apn: '037-0-012-125', apn10: '0370012125', fips: '06111', state: 'CA' })) === null && (await sosEntity({ name: 'X LLC' })) === null);
process.env.SOS_API_KEY = 'test-key';
const realFetch = globalThis.fetch; let lastUrl = '', lastHeaders = {};
globalThis.fetch = async (url, init) => { lastUrl = String(url); lastHeaders = (init && init.headers) || {}; return { ok: true, json: async () => ({ RecordCount: 2, EntityData: [
  { EntityID: '202461812345', EntityType: 'Limited Liability Company', FilingDate: '2024-06-14', StatusDescription: 'Active', EntityName: '11962 SULPHUR MOUNTAIN LLC', Jurisdiction: 'CALIFORNIA', AgentName: 'REGISTERED AGENTS INC', AgentAddress1: '1401 21ST ST STE R', AgentCity: 'SACRAMENTO', AgentState: 'CA', AgentZipCode: '95811', EntityStreetAddress1: '28175 S ANCHOVY AVE', EntityCity: 'SAN PEDRO', EntityState: 'CA', EntityZipCode: '90732', MailingStreetAddress1: '28175 S ANCHOVY AVE', MailingCity: 'SAN PEDRO', MailingState: 'CA', MailingZipCode: '90732', SiFrequency: 'Biennial', StandingSOS: 'Good', StandingFTB: 'Good', StandingAgent: 'Good', StandingVCFCF: 'Good' },
  { EntityID: '201900000001', EntityType: 'Limited Liability Company', FilingDate: '2019-01-01', StatusDescription: 'Terminated', EntityName: '11962 SULPHUR MOUNTAIN HOLDINGS LLC', Jurisdiction: 'CALIFORNIA' } ] }) }; };
const ent = await sosEntity({ name: '11962 Sulphur Mountain LLC' });
check('sos: calls the documented endpoint with the subscription-key header', /^https:\/\/calico\.sos\.ca\.gov\/cbc\/v1\/api\/BusinessEntityKeywordSearch\?search-term=/.test(lastUrl) && lastHeaders['Ocp-Apim-Subscription-Key'] === 'test-key', { lastUrl, lastHeaders });
check('sos: picks the exact-name active entity and states number, type, filing date, status and standing', ent && ent.provider === 'California Secretary of State' && /^11962 Sulphur Mountain LLC · Limited Liability Company · no\. 202461812345 · California · filed June 14, 2024 · status Active \(SOS ✓ · FTB ✓ · agent ✓ · VCFCF ✓\) · 1 other entity matches the search/.test(String(ent.rows[0][1])), ent && ent.rows[0]);
check('sos: agent, addresses and the officers note follow', ent.rows.map(r => r[2]).join() === 'entity_status,entity_agent,entity_address,entity_note' && /Registered Agents Inc\. · 1401 21st St Ste R, Sacramento, CA, 95811/.test(String(ent.rows[1][1])) && /principal 28175 S Anchovy Ave, San Pedro, CA, 90732/.test(String(ent.rows[2][1])) && /filed biennial/.test(String(ent.rows[3][1])), ent.rows.map(r => r[1]));
globalThis.fetch = async () => ({ ok: true, json: async () => ({ RecordCount: 0, EntityData: [] }) });
const none = await sosEntity({ name: 'Nobody Trust' });
check('sos: no match is stated as a positive miss', /No California entity found under “Nobody Trust”/.test(String(none.rows[0][1])), none.rows[0]);
globalThis.fetch = realFetch; delete process.env.SOS_API_KEY;
const withEntity = composeTitle(rollRows, ev, { doc: '2024000099999', date8: '20240802', desc: 'deed (D)', total: 1078140 }, { providers: ['California Secretary of State'], rows: ent.rows });
const noEv = composeTitle(rollRows, null, { doc: '2024000052341', date8: '20240802', desc: 'deed (D)', total: 1078140 }, { providers: ['RentCast'], rows: [['Owner of record (RentCast · county roll copy as of today)', 'Someone LLC · organization', 'owner_provider'], ['About the provider rows', 'x', 'provider_note']] });
check('compose: without evidence a provider that names the owner leads and the roll verdict corroborates', noEv.slice(0, 3).map(r => r[2]).join() === 'owner_provider,provider_note,owner_roll' && /\(public roll\)$/.test(noEv[2][0]), noEv.slice(0, 3));
const noEvMiss = composeTitle(rollRows, null, { doc: '2024000052341', date8: '20240802', desc: 'deed (D)', total: 1078140 }, { providers: ['RentCast'], rows: [['Owner of record (RentCast)', 'No RentCast property record matches this parcel', 'owner_provider']] });
check('compose: a provider miss stays behind the roll verdict', noEvMiss[0][2] === 'owner_now' && noEvMiss[1][2] === 'owner_provider', noEvMiss.slice(0, 2).map(r => r[2]));
check('compose: provider rows sit right after the owner block', withEntity.slice(0, 7).map(r => r[2]).join() === 'owner_now,owner_mailing,owner_since,entity_status,entity_agent,entity_address,entity_note', withEntity.slice(0, 7).map(r => r[2]));

// ---- the RentCast adapter, against a stubbed API (the shape from developers.rentcast.io "property data schema") ----
{
  const { rentcastTitle, rentcastCacheClear } = await import('../lib/providers.js');
  check('rentcast: nothing runs without a key', (await rentcastTitle({ apn10: '0370012125', lat: 34.43, lon: -119.156, situs: '11962 SULPHUR MOUNTAIN RD' })) === null);
  process.env.RENTCAST_KEY = 'rc-test';
  const realFetch2 = globalThis.fetch; let calls = 0, rcUrl = '', rcHeaders = {};
  const REC = { id: '11962-Sulphur-Mountain-Rd', formattedAddress: '11962 Sulphur Mountain Rd, Ojai, CA 93023', addressLine1: '11962 Sulphur Mountain Rd', county: 'Ventura', countyFips: '111', assessorID: '037-0-012-125', legalDescription: 'PAR 2 PM 14-15', zoning: 'OS-160', lotSize: 412513, yearBuilt: 1962, propertyType: 'Single Family',
    owner: { names: ['11962 SULPHUR MOUNTAIN LLC'], type: 'Organization', mailingAddress: { formattedAddress: '28175 S Anchovy Ave, San Pedro, CA 90732' } }, ownerOccupied: false,
    lastSaleDate: '2024-07-29T00:00:00.000Z', lastSalePrice: 1650000,
    taxAssessments: { '2023': { year: 2023, value: 1057000, land: 880000, improvements: 177000 }, '2024': { year: 2024, value: 1078140, land: 900000, improvements: 178140 } },
    propertyTaxes: { '2024': { year: 2024, total: 11902 } },
    history: { '2018-12-18': { event: 'Sale', date: '2018-12-18T00:00:00.000Z', price: 800000 }, '2024-07-29': { event: 'Sale', date: '2024-07-29T00:00:00.000Z', price: 1650000 } } };
  const OTHER = { id: 'x', addressLine1: '11900 Sulphur Mountain Rd', assessorID: '037-0-012-120', owner: { names: ['SOMEONE ELSE'] } };
  globalThis.fetch = async (url, init) => { calls++; rcUrl = String(url); rcHeaders = (init && init.headers) || {}; return { ok: true, json: async () => [OTHER, REC] }; };
  const rc = await rentcastTitle({ apn: '037-0-012-125', apn10: '0370012125', lat: 34.4326, lon: -119.1564, situs: '11962 SULPHUR MOUNTAIN RD' });
  check('rentcast: a circle search on the parcel centre with the X-Api-Key header', /^https:\/\/api\.rentcast\.io\/v1\/properties\?latitude=34\.4326&longitude=-119\.1564&radius=0\.08&limit=25$/.test(rcUrl) && rcHeaders['X-Api-Key'] === 'rc-test', { rcUrl, rcHeaders });
  check('rentcast: the record is matched by assessor id, never by proximity alone', rc && rc.matched && rc.provider === 'RentCast' && /^11962 Sulphur Mountain LLC · organization · not owner-occupied$/.test(String(rc.rows[0][1])) && !JSON.stringify(rc.rows).includes('Someone Else'), rc && rc.rows[0]);
  check('rentcast: owner, mailing, sale history, assessment and the provenance note, in the provider key order', rc.rows.map(r => r[2]).join() === 'owner_provider,owner_mailing_provider,sale_provider,value_provider,provider_note' && /28175 S Anchovy Ave, San Pedro, CA 90732/.test(rc.rows[1][1]) && /^\$1,650,000 on July 29, 2024 · 2 recorded events: sale July 29, 2024 \$1,650,000; sale December 18, 2018 \$800,000$/.test(rc.rows[2][1]) && /^\$1,078,140 total \(2024\) · land \$900,000 · improvements \$178,140 · tax \$11,902 \(2024\) · 2 assessment years on file$/.test(rc.rows[3][1]) && /assessor id 037-0-012-125 · PAR 2 PM 14-15 · zoning OS-160 · 412,513 sq ft lot · built 1962 · single family — matched by assessor id/.test(rc.rows[4][1]), rc.rows.map(r => r[1]));
  const again = await rentcastTitle({ apn10: '0370012125', lat: 34.4326, lon: -119.1564 });
  check('rentcast: the answer is held for 30 days (the free plan is 50 requests a month)', again === rc && calls === 1, calls);
  rentcastCacheClear();
  globalThis.fetch = async () => ({ ok: true, json: async () => [Object.assign({}, REC, { assessorID: null })] });
  const bySitus = await rentcastTitle({ apn10: '0370012125', lat: 34.4326, lon: -119.1564, situs: '11962 SULPHUR MOUNTAIN RD' });
  check('rentcast: without an assessor id the situs house number + street matches', bySitus.matched && /matched by situs address/.test(bySitus.rows[bySitus.rows.length - 1][1]), bySitus.rows[bySitus.rows.length - 1]);
  rentcastCacheClear();
  globalThis.fetch = async () => ({ ok: true, json: async () => [OTHER] });
  const miss = await rentcastTitle({ apn10: '0370012125', lat: 34.4326, lon: -119.1564, situs: '11962 SULPHUR MOUNTAIN RD' });
  check('rentcast: no match is a positive miss naming how many records sat nearby', !miss.matched && /No RentCast property record matches this parcel within 130 m of its centre \(1 record nearby\)/.test(miss.rows[0][1]), miss.rows[0]);
  const both = await providerTitle({ apn: '037-0-012-125', apn10: '0370012125', fips: '06111', state: 'CA', lat: 34.4326, lon: -119.1564, situs: '11962 SULPHUR MOUNTAIN RD' });
  check('providers: the fan-out runs only the providers whose key is set', both && both.providers.join() === 'RentCast' && both.rows.length === 1, both);
  rentcastCacheClear();

  // ---- the spend meter: the free plan is 50/month and bills $0.20 after, so it must be capped
  const { meterCap, meterCount, meterBump, meterRead, meterReset, METER_PATH } = await import('../lib/providers.js');
  meterReset();
  check('meter: the default cap leaves five of the fifty in hand, and RENTCAST_MAX_MONTH overrides it', meterCap() === 45 && (() => { process.env.RENTCAST_MAX_MONTH = '10'; const c = meterCap(); delete process.env.RENTCAST_MAX_MONTH; return c === 10; })(), meterCap());
  // a fake store: exactly the two calls lib/store.js exposes
  let stored = null, writes = 0;
  const store = { readJson: async (path, dflt) => (path === METER_PATH ? stored || dflt : dflt), updateJson: async (path, mutate) => { writes++; stored = mutate(stored); return { data: stored }; } };
  await meterBump(store, 'rentcast'); await meterBump(store, 'rentcast');
  const month = new Date().toISOString().slice(0, 7);
  check('meter: counts persist through the store, per provider per month, with no names in the file', meterCount(await meterRead(store), 'rentcast') === 2 && writes === 2 && stored.months[month].rentcast === 2 && !/name|owner|address|apn/i.test(JSON.stringify(stored.months)), stored);
  check('meter: a store that throws never breaks the lookup — the count still holds in memory', await (async () => { const bad = { readJson: async () => { throw new Error('no token'); }, updateJson: async () => { throw new Error('no token'); } }; await meterBump(bad, 'rentcast'); return meterCount(await meterRead(bad), 'rentcast') === 3; })());
  meterReset();
  process.env.RENTCAST_MAX_MONTH = '2';
  const capStore = { readJson: async () => ({ schema: 1, months: { [month]: { rentcast: 2 } } }), updateJson: async () => { throw new Error('should not write'); } };
  let capCalls = 0;
  globalThis.fetch = async () => { capCalls++; return { ok: true, json: async () => [REC] }; };
  const capped = await rentcastTitle({ apn10: '0370012125', lat: 34.4326, lon: -119.1564, situs: '11962 SULPHUR MOUNTAIN RD', store: capStore });
  check('meter: at the cap the adapter does not call, and says so with the numbers', capCalls === 0 && capped.capped === true && /budget is spent \(2 of 2 requests; the free plan allows 50 and bills \$0\.20 for each one after\)/.test(capped.rows[0][1]), capped.rows[0][1]);
  delete process.env.RENTCAST_MAX_MONTH; meterReset(); rentcastCacheClear();

  globalThis.fetch = realFetch2; delete process.env.RENTCAST_KEY;
}

// ---- resolveCore end to end, with every network call stubbed --------------------------
//   This is the guard that the record's own function body runs: a scope slip or a typo inside
//   resolveCore never shows up in the route tests (they stub /api/dossier), and the local
//   container cannot reach the county, so the county is stubbed here instead.
{
  const { resolveCore } = await import('../lib/dossier.js');
  const realFetch3 = globalThis.fetch;
  const PARCEL = { attributes: { APN10: '0370012125', APN: '037-0-012-125', SITUS: '11962 SULPHUR MOUNTAIN RD', ACREAGE: '9.47', L_V: '961860', I_V: '116280', DOC_NR: '2024000052341', DOC_DT: '20240802', DOC_TYPE: 'D', DT_V_TRF_Y: '20240802', SQ_FT_I: '1277', TRA: '05006' },
    geometry: { rings: [[[-119.158, 34.4316], [-119.1546, 34.4316], [-119.1546, 34.4337], [-119.158, 34.4337], [-119.158, 34.4316]]] } };
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls++;
    const u = String(url);
    if (/\/query/.test(u)) return { ok: true, json: async () => ({ features: /\/Parcels\/MapServer\/0\/query/.test(u) ? [PARCEL] : [] }) };
    if (/raw\.githubusercontent|api\.github\.com/.test(u)) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, json: async () => ({ results: [], features: [] }), text: async () => '' };
  };
  let rec = null, err = null;
  try { rec = await resolveCore({ apn: '037-0-012-125', debug: true }); } catch (e) { err = e; }
  globalThis.fetch = realFetch3;
  check('resolveCore: the whole function body runs — no scope slip, no undefined reference', !err && rec && rec.apn === '037-0-012-125', err ? String(err && err.message) : 'ok');
  check('resolveCore: the parcel anchors and the identity rows are built', rec && rec.apn10 === '0370012125' && rec.situs === '11962 SULPHUR MOUNTAIN RD' && rec.acreage === 9.47 && rec.sections.some(s => s.id === 'identity'), rec && { apn10: rec.apn10, acreage: rec.acreage });
  check('resolveCore: the evidence on file is read beside the fan-out and composes the owner-first title section', rec && rec.evidence && rec.evidence.provider === 'PropertyChecker' && rec.sections.find(s => s.id === 'title').rows[0][2] === 'owner_now' && /11962 Sulphur Mountain LLC/.test(String(rec.sections.find(s => s.id === 'title').rows[0][1])), rec && rec.evidence);
  check('resolveCore: the side reads are reported beside the fan-out, not as late county sources', rec && (rec.diag || []).filter(d => /beside the fan-out/.test(d[0])).length >= 2 && (rec.diag || []).find(d => d[0] === 'evidence (beside the fan-out)')[1] === 'ok', rec && (rec.diag || []).filter(d => /beside/.test(d[0])));
  // the paid lookup is not spent where a fresh report already names the owner
  process.env.RENTCAST_KEY = 'rc-test';
  let rcCalls = 0;
  const realFetch4 = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (/api\.rentcast\.io/.test(u)) { rcCalls++; return { ok: true, json: async () => [] }; }
    if (/\/query/.test(u)) return { ok: true, json: async () => ({ features: /\/Parcels\/MapServer\/0\/query/.test(u) ? [PARCEL] : [] }) };
    if (/raw\.githubusercontent|api\.github\.com/.test(u)) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, json: async () => ({ results: [], features: [] }), text: async () => '' };
  };
  process.env.PROVIDER_SKIP_MONTHS = '240';   // treat the fixture's 2025 report as fresh
  const withFresh = await resolveCore({ apn: '037-0-012-125', debug: true });
  delete process.env.PROVIDER_SKIP_MONTHS;
  const withStale = await resolveCore({ apn: '037-0-012-125', debug: true, refresh: true });
  const off = await resolveCore({ apn: '037-0-012-125', debug: true, provider: false, refresh: true });
  globalThis.fetch = realFetch4; delete process.env.RENTCAST_KEY;
  check('resolveCore: a metered lookup is skipped while the report on file is still fresh, and runs once it is stale', rcCalls === 1 && /skipped — a report of March 16, 2025 is on file and still fresh/.test(String((withFresh.diag || []).find(d => /^provider/.test(d[0]))[1])) && (withStale.diag || []).find(d => /^provider/.test(d[0]))[1] === 'ok', { rcCalls, fresh: (withFresh.diag || []).find(d => /^provider/.test(d[0])), stale: (withStale.diag || []).find(d => /^provider/.test(d[0])) });
  check('resolveCore: provider=0 turns the metered lookup off entirely', !(off.diag || []).some(d => /^provider/.test(d[0])), (off.diag || []).filter(d => /beside/.test(d[0])).map(d => d[0]));

  check('resolveCore: the flags name the owner and the liens from the evidence', rec && rec.flags.some(f => f.key === 'owner_named') && rec.flags.some(f => f.key === 'liens'), rec && rec.flags.map(f => f.key));
}

// ---- the routes (the server is up: run.mjs boots it) ----
const post = (body) => fetch(BASE + '/api/title-report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const r1 = await post({ pin: 'x', apn: '037-0-012-125', name: 'x.pdf', data: 'JVBERi0=' });
check('route: POST /api/title-report is gated (501 without the env, 401 with a wrong PIN)', r1.status === 501 || r1.status === 401, r1.status);
const g1 = await (await fetch(BASE + '/api/title/0370012125')).json();
check('route: GET /api/title/<apn10> serves the Sulphur evidence on file', g1.ok && g1.evidence && g1.evidence.apn === '037-0-012-125' && g1.evidence.owner.names.length === 1 && g1.evidence.liens.length === 3 && !JSON.stringify(g1.evidence).includes('Residents'), g1.evidence && g1.evidence.owner);
const g2 = await fetch(BASE + '/api/title/0000000000');
check('route: GET /api/title for a parcel without evidence is 404', g2.status === 404);
const src = await (await fetch(BASE + '/api/sources')).json();
check('route: GET /api/sources serves the register with tiers and verified entries', src.schema === 1 && Array.isArray(src.sources) && src.sources.length >= 20 && src.sources.every(x => x.id && x.tier && x.url && x.verified && x.atlas) && src.sources.some(x => x.id === 'ca-sos-api'), src.sources && src.sources.length);

// ---- the watch (lib/watch.js): the roll sentinel, the diff, the log, the row and the flag ----
const { sentinelFrom, diffSentinel, applyCheck, watchRow, watchFlag, summarize, EMPTY_WATCH } = await import('../lib/watch.js');
const rollA = { APN10: '0370012125', DOC_NR: '2024000052341', DOC_DT: '20240802', DOC_TYPE: 'D', DT_V_TRF_Y: '20240802', L_V: '900000', I_V: '178140', SP: '', ACREAGE: '9.47', NAME_1: 'SHOULD NEVER APPEAR' };
const sA = sentinelFrom('ventura', rollA);
check('watch: the Ventura sentinel is the instrument, the dates, the values and the acreage — no names', sA.doc.nr === '2024000052341' && sA.doc.date === '2024-08-02' && sA.doc.kind === 'D' && sA.transfer === '2024-08-02' && sA.values.total === 1078140 && sA.acreage === 9.47 && !JSON.stringify(sA).includes('NEVER'), sA);
const sLA = sentinelFrom('losangeles', { Roll_LandValue: '500000', Roll_ImpValue: '250000', Roll_Year: '2025', Roll_LandBaseYear: '2019', 'Shape.STArea()': '87120' });
check('watch: the Los Angeles sentinel uses the base year and the roll values', sLA.doc === null && sLA.baseYear === '2019' && sLA.values.total === 750000 && sLA.acreage === 2, sLA);
const sB = sentinelFrom('ventura', Object.assign({}, rollA, { DOC_NR: '2026000010001', DOC_DT: '20260301', DOC_TYPE: 'GD', DT_V_TRF_Y: '20260301', L_V: '1500000', I_V: '200000', SP: '1700000' }));
const d = diffSentinel(sA, sB);
check('watch: a new deed shows as document, date, type, transfer, value and sale changes, in that order', d.map(c => c.key).join() === 'doc.nr,doc.date,doc.kind,transfer,values.total,sale' && /last recorded document: 2024000052341 → 2026000010001/.test(d[0].text) && /assessed total: \$1,078,140 → \$1,700,000/.test(d[4].text), d.map(c => c.text));
check('watch: a missing value on the new side is never a change, and identical sentinels diff to nothing', diffSentinel(sA, Object.assign({}, sA, { doc: null, sale: null })).length === 0 && diffSentinel(sA, JSON.parse(JSON.stringify(sA))).length === 0);
const w = JSON.parse(JSON.stringify(EMPTY_WATCH));
const c1 = applyCheck(w, { apn: '037-0-012-125', apn10: '0370012125', situs: '11962 SULPHUR MOUNTAIN RD', county: { fips: '06111' }, sentinel: sA }, '2026-09-21T13:17:00.000Z');
const c2 = applyCheck(w, { apn: '037-0-012-125', apn10: '0370012125', county: { fips: '06111' }, sentinel: sA }, '2026-09-28T13:17:00.000Z');
const c3 = applyCheck(w, { apn: '037-0-012-125', apn10: '0370012125', county: { fips: '06111' }, sentinel: sB }, '2026-10-05T13:17:00.000Z');
const e = w.parcels['0370012125'];
check('watch: the log keeps first seen, last checked, the count and only real changes', c1.first && !c1.changes.length && !c2.changes.length && c3.changes.length === 6 && e.firstSeen === '2026-09-21T13:17:00.000Z' && e.lastChecked === '2026-10-05T13:17:00.000Z' && e.checks === 3 && e.history.length === 1 && e.history[0].at === '2026-10-05T13:17:00.000Z' && e.current.doc.nr === '2026000010001' && w.updatedAt === '2026-10-05T13:17:00.000Z', e);
check('watch: an answer without a sentinel is ignored', applyCheck(w, { apn10: '0000000000' }, '2026-10-05T13:17:00.000Z') === null && !w.parcels['0000000000']);
const row = watchRow(e);
check('watch: the title row states the last check, the count and the latest change', row && row[2] === 'title_watch' && /re-read October 5, 2026 \(3 checks since September 21, 2026\) · 1 change seen — latest October 5, 2026: last recorded document 2024000052341 → 2026000010001; document date August 2, 2024 → March 1, 2026/.test(row[1]), row);
check('watch: a never-checked parcel has no row', watchRow(null) === null && watchRow({ history: [] }) === null);
const fl = watchFlag(e, ev);
check('watch: the roll moving after the evidence on file raises the `moved` flag naming the report date', fl && fl.key === 'moved' && fl.level === 'watch' && /roll move on October 5, 2026 — last recorded document 2024000052341 → 2026000010001;.*after the evidence on file \(March 16, 2025\)/.test(fl.text), fl);
check('watch: no flag when the only change came before the report, or when nothing changed', watchFlag({ history: [{ at: '2024-09-01T00:00:00Z', changes: [{ key: 'doc.nr', from: 'a', to: 'b' }] }] }, ev) === null && watchFlag({ history: [] }, ev) === null && watchFlag({ history: [{ at: '2026-10-05T00:00:00Z', changes: [{ key: 'acreage', from: 9.47, to: 9.5 }] }] }, ev) === null);
const sm = summarize([c1, c3], 'https://example.test/');
check('watch: the summary names the parcel, each change and the record link', sm.changed === 1 && /### 037-0-012-125/.test(sm.text) && /- last recorded document: 2024000052341 → 2026000010001/.test(sm.text) && /https:\/\/example\.test\/\?apn=037-0-012-125/.test(sm.text), sm.text);
// the script end to end, against a mock of the three routes it reads
{
  const { createServer } = await import('node:http');
  const { spawn } = await import('node:child_process');
  const { mkdirSync, existsSync, rmSync } = await import('node:fs');
  let calls = [];
  const mock = createServer((req, res) => {
    calls.push(req.url);
    const j = (o, code = 200) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (req.url.startsWith('/api/properties')) return j([{ id: 'p1', name: 'One', apn: '037-0-012-125', county: '06111', lots: [{ id: 'l1', name: 'Lot 1', apn: '035-0-020-010' }] }]);
    if (req.url.startsWith('/api/research')) return j({ items: [{ apn: '011-0-040-135', county: '06111', situs: 'SOMEWHERE' }], synced: false });
    if (req.url.startsWith('/api/parcel')) {
      const apn = decodeURIComponent((/apn=([^&]+)/.exec(req.url) || [])[1] || '');
      if (apn === '011-0-040-135') return j({ error: 'nope' }, 404);
      return j({ apn, apn10: apn.replace(/-/g, ''), situs: apn === '037-0-012-125' ? '11962 SULPHUR MOUNTAIN RD' : null, county: { fips: '06111' }, sentinel: apn === '037-0-012-125' ? sB : sA });
    }
    j({ error: 'not_found' }, 404);
  });
  await new Promise(ok => mock.listen(0, '127.0.0.1', ok));
  const port = mock.address().port;
  const out = join(here, 'out'); mkdirSync(out, { recursive: true });
  const wf = join(out, 'watch.json'), sf = join(out, 'watch-summary.md');
  if (existsSync(sf)) rmSync(sf);
  writeFileSync(wf, JSON.stringify({ schema: 1, updatedAt: '2026-09-01T00:00:00.000Z', parcels: { '0370012125': { apn: '037-0-012-125', county: '06111', firstSeen: '2026-09-01T00:00:00.000Z', checks: 1, lastChecked: '2026-09-01T00:00:00.000Z', history: [], current: sA } } }));
  const run = await new Promise((ok) => { const c = spawn(process.execPath, [join(here, '..', 'scripts', 'watch-records.mjs'), 'http://127.0.0.1:' + port, '--file', wf, '--summary', sf], { env: Object.assign({}, process.env, { NO_PROXY: '127.0.0.1,localhost', no_proxy: '127.0.0.1,localhost' }) }); let stdout = '', stderr = ''; c.stdout.on('data', d => stdout += d); c.stderr.on('data', d => stderr += d); const t = setTimeout(() => c.kill(), 60000); c.on('close', (status) => { clearTimeout(t); ok({ status, stdout, stderr }); }); });
  const after = JSON.parse(readFileSync(wf, 'utf8'));
  check('script: watches the properties, the lots and the research list, asks /api/parcel with refresh=1', run.status === 0 && calls.some(u => /^\/api\/parcel\?apn=037-0-012-125&county=06111&refresh=1$/.test(u)) && calls.some(u => /apn=035-0-020-010/.test(u)) && calls.some(u => /apn=011-0-040-135/.test(u)), { status: run.status, calls, err: run.stderr.slice(0, 300) });
  check('script: logs the change on the known parcel, the first check on the lot, and skips the parcel the county could not find', after.parcels['0370012125'].history.length === 1 && after.parcels['0370012125'].checks === 2 && after.parcels['0370012125'].label === 'One' && after.parcels['0350020010'] && after.parcels['0350020010'].checks === 1 && after.parcels['0350020010'].label === 'One · Lot 1' && !after.parcels['0110040135'] && Object.keys(after.parcels).length === 2, Object.keys(after.parcels));
  check('script: writes the summary for the issue only because something moved', existsSync(sf) && /### 037-0-012-125 — 11962 SULPHUR MOUNTAIN RD/.test(readFileSync(sf, 'utf8')) && /1 changed/.test(run.stdout), run.stdout.slice(-400));
  mock.close();
}
const wr = await (await fetch(BASE + '/api/watch')).json();
check('route: GET /api/watch serves the log (schema 1, a parcels map)', wr.schema === 1 && wr.parcels && typeof wr.parcels === 'object', wr);
const wr2 = await fetch(BASE + '/api/watch?apn=999-9-999-999');
check('route: GET /api/watch?apn= for an unwatched parcel is 404 not_watched', wr2.status === 404 && (await wr2.json()).error === 'not_watched');
done('title');
