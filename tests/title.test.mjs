// lib/title-report.js: the report reader on a fictional PropertyChecker-layout fixture, the evidence
// composition into the Ownership & title rows, and the server routes' validation paths.
import { check, done, here, BASE } from './lib.mjs';
import { readFileSync } from 'fs';
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

// ---- the routes (the server is up: run.mjs boots it) ----
const post = (body) => fetch(BASE + '/api/title-report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const r1 = await post({ pin: 'x', apn: '037-0-012-125', name: 'x.pdf', data: 'JVBERi0=' });
check('route: POST /api/title-report is gated (501 without the env, 401 with a wrong PIN)', r1.status === 501 || r1.status === 401, r1.status);
const g1 = await (await fetch(BASE + '/api/title/0370012125')).json();
check('route: GET /api/title/<apn10> serves the Sulphur evidence on file', g1.ok && g1.evidence && g1.evidence.apn === '037-0-012-125' && g1.evidence.owner.names.length === 1 && g1.evidence.liens.length === 3 && !JSON.stringify(g1.evidence).includes('Residents'), g1.evidence && g1.evidence.owner);
const g2 = await fetch(BASE + '/api/title/0000000000');
check('route: GET /api/title for a parcel without evidence is 404', g2.status === 404);
done('title');
