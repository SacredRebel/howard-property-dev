// ============================================================================
//  lib/title-report.js — a purchased property report (PropertyChecker today;
//  the parser is written so another vendor's layout can be added beside it)
//  turned into dated, structured title evidence for one APN.
//
//  Public GIS never carries the current owner's name, the loans, the liens or
//  the tax bill. A report the owner of this atlas buys does. So: the PDF is
//  parsed here — text out of the PDF with pdf.js, then a layout-aware reader —
//  and only the *evidence* is kept (data/title/<apn10>.json): owner of record,
//  mailing address, the ownership timeline, the last deed, loans, liens (with
//  the debtor reduced to initials — the case number is what a researcher needs),
//  taxes, tax history, permits, the vendor's value estimate and the building
//  facts. The report's "residents" list is deliberately dropped, and the PDF
//  itself is never stored: this repository is public.
// ============================================================================

// ---- pdf → text ------------------------------------------------------------
// Lines in reading order, page markers removed. pdf.js (legacy build) runs in
// Node with no canvas; the items carry their own baseline so lines can be split
// where the layout does, not where a font run ends.
export async function pdfText(bytes) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(bytes.buffer ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) : bytes);   // a plain Uint8Array — pdf.js refuses a Buffer
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true, disableFontFace: true, isEvalSupported: false }).promise;
  let out = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    let line = '', lastY = null;
    for (const it of tc.items) {
      if (!('str' in it)) continue;
      const y = it.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) { out += line.trimEnd() + '\n'; line = ''; }
      line += it.str + (it.hasEOL ? '\n' : '');
      lastY = y;
    }
    out += line.trimEnd() + '\n';
  }
  let meta = null;
  try { const m = await doc.getMetadata(); meta = m && m.info ? m.info : null; } catch { meta = null; }
  await doc.destroy();
  return { text: out, meta };
}

// ---- helpers -----------------------------------------------------------------
const NA = (v) => v == null || /^(n\/a|none|not on file|-|—)$/i.test(String(v).trim()) ? null : String(v).trim();
const money = (v) => { const s = NA(v); if (!s) return null; const n = Number(s.replace(/[^0-9.-]/g, '')); return isFinite(n) ? n : null; };
const int = (v) => { const s = NA(v); if (!s) return null; const n = parseInt(s.replace(/[^0-9-]/g, ''), 10); return isFinite(n) ? n : null; };
const usDate = (v) => { const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(v || '')); return m ? m[3] + '-' + m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0') : null; };
const pdfDate = (v) => { const m = /^D:(\d{4})(\d{2})(\d{2})/.exec(String(v || '')); return m ? m[1] + '-' + m[2] + '-' + m[3] : null; };
const initials = (name) => String(name || '').trim().split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase() + '.').join(' ');
const tidy = (s) => String(s || '').replace(/\s+/g, ' ').trim();

// a block of "Key: value" lines, where the layout sometimes breaks a key over two lines
// ("Business" / "Name:") or puts the value on the next line ("Document:" / "0000052341"),
// and wraps a long value onto a following line with no colon.
function kv(lines) {
  const out = {}; let lastKey = null;
  const L = lines.slice();
  for (let i = 0; i < L.length; i++) {
    let s = L[i];
    if (!s) continue;
    if (!/:/.test(s) && i + 1 < L.length && /^[A-Za-z#]+:$/.test(L[i + 1])) { s = s + ' ' + L[i + 1]; L.splice(i + 1, 1); }   // "Permit" + "Number:"
    const m = /^([A-Za-z][A-Za-z0-9 #,'’\/().%-]{0,48}):\s*(.*)$/.exec(s);
    if (m) {
      const key = m[1].trim(); let val = m[2].trim();
      if (!val && i + 1 < L.length && !/^[A-Za-z][A-Za-z0-9 #,'’\/().%-]{0,48}:/.test(L[i + 1])) { val = L[i + 1].trim(); i++; }
      out[key] = val; lastKey = key;
    } else if (lastKey && out[lastKey] !== undefined) {
      out[lastKey] = (out[lastKey] + ' ' + s).trim();   // wrapped value
    }
  }
  return out;
}

// split the report into named sections in the order the vendor prints them
const SECTION_HEADS = ['Summary', 'Ownership', 'Ownership Timeline', 'Deeds', 'Building Permits', 'Liens & Judgments', 'Liens', 'Judgments', 'Pre-Foreclosures', 'Values', 'Taxes', 'Tax History', 'Property Details', 'Rooms', 'Area', 'Parking', 'Construction Details', 'Property Features', 'Utilities / Green Energy Details', 'Parcel', 'Legal', 'Loans', 'Previous Loans', 'Residents', 'Images', 'Neighborhood'];
function sections(lines) {
  const out = {}; let cur = 'head'; out[cur] = [];
  for (const raw of lines) {
    const s = raw.trim();
    if (SECTION_HEADS.includes(s) && !(s === 'Liens' && cur !== 'Liens & Judgments' && cur !== 'Liens')) { cur = s; out[cur] = out[cur] || []; continue; }
    if (s === 'Liens' && cur === 'Liens & Judgments') { cur = 'Liens'; out[cur] = out[cur] || []; continue; }
    out[cur].push(s);
  }
  return out;
}

// ---- the PropertyChecker layout ------------------------------------------------
function parsePropertyChecker(lines, meta) {
  const S = sections(lines);
  const head = (S.head || []).join(' ');
  const sum = kv([].concat(S.head || [], S.Summary || []));   // the cover facts (beds, lot, ownership length, market value) print before the Summary heading
  const apn = NA(sum['APN']) || (/APN:\s*([0-9-]+)/.exec(lines.join('\n')) || [])[1] || null;
  if (!apn) return null;
  const ev = {
    schema: 1,
    apn, apn10: apn.replace(/[^0-9]/g, ''),
    source: { provider: 'PropertyChecker', kind: 'purchased property report', preparedOn: pdfDate(meta && meta.CreationDate) || null, title: tidy((meta && meta.Title) || head) || null },
    situs: [NA(sum['Property Address']), NA(sum['City, State, Zipcode'])].filter(Boolean).join(', ') || null,
    county: NA(sum['County']),
    latlon: (money(sum['Latitude']) != null && money(sum['Longitude']) != null) ? [money(sum['Latitude']), money(sum['Longitude'])] : null,
    propertyType: NA(sum['Property Type']),
    use: NA(sum['Property Use']),
    owner: null, timeline: [], deed: null, loans: [], liens: [], judgments: null, preForeclosures: null,
    values: {}, taxes: {}, taxHistory: [], permits: [], building: {},
  };
  // ownership: names then mailing address, each possibly on several lines
  const own = S.Ownership || [];
  const iN = own.indexOf("Owner's Name(s)"), iM = own.indexOf("Owner's Mailing Address");
  const names = iN >= 0 ? own.slice(iN + 1, iM >= 0 ? iM : undefined).filter(Boolean) : [];
  const mail = iM >= 0 ? own.slice(iM + 1).filter(Boolean) : [];
  ev.owner = {
    names: names.map(tidy).filter(Boolean),
    mailing: tidy(mail.join(' ')) || null,
    type: NA(sum['Owner Type']) || null,
    company: /yes/i.test(sum['Company Flag'] || '') || /company/i.test(sum['Owner Type'] || ''),
    occupied: /not occupied/i.test(sum['Owner Status'] || '') ? false : (/occupied/i.test(sum['Owner Status'] || '') ? true : null),
    ownershipLength: NA(sum['Ownership Length']),
    trust: NA(sum['Trust Description']),
  };
  // timeline: "2024 Some Name" then indented pairs
  const tl = S['Ownership Timeline'] || [];
  let cur = null;
  for (const s of tl) {
    const m = /^(\d{4})\s+(.+)$/.exec(s);
    if (m && !/:/.test(s)) { cur = { year: Number(m[1]), party: tidy(m[2]), type: null, date: null, price: null }; ev.timeline.push(cur); continue; }
    if (!cur) continue;
    const p = /^([^:]+):\s*(.*)$/.exec(s); if (!p) continue;
    const k = p[1].trim().toLowerCase(), v = p[2].trim();
    if (k === 'transaction type') cur.type = NA(v);
    else if (k === 'date of transaction') cur.date = usDate(v);
    else if (k === 'transaction price') cur.price = money(v);
  }
  // deed block
  const d = kv(S.Deeds || []);
  if (Object.keys(d).length) ev.deed = {
    grantee: NA(d["Grantee’s Name(s)"] || d["Grantee's Name(s)"]), grantor: NA(d["Grantor’s Name(s)"] || d["Grantor's Name(s)"]),
    ownerAddress: NA(d['Deed Owner Address']), category: NA(d['Ownership Category']), ownerOccupied: /^1$/.test(String(d['Owner Occupied'] || '')) ? true : (/^0$/.test(String(d['Owner Occupied'] || '')) ? false : null),
    document: NA(d['Document']) || NA(d['Transfer Transaction #']), recorded: usDate(d['Transaction Date']), documentType: NA(d['Document Type']), transactionType: NA(d['Transaction Type']),
    amount: money(d['Transaction Amount']), mortgage: money(d['Transaction Mortgage Amount']), titleCompany: NA(d['Title Company']),
  };
  // permits: "Permit #n" blocks
  const pm = S['Building Permits'] || [];
  let block = null; const blocks = [];
  for (const s of pm) { if (/^Permit #\d+$/.test(s)) { block = []; blocks.push(block); continue; } if (block) block.push(s); }
  ev.permits = blocks.map((b) => { const k = kv(b); return { number: NA(k['Permit Number']), date: usDate(k['Effective Date']), type: NA(k['Type']), subType: NA(k['Sub Type']), status: NA(k['Status']), jobValue: money(k['Job Value']), fees: money(k['Fees']), contractor: NA(k['Business Name']), description: NA(k['Description']) }; }).filter((p) => p.number || p.date);
  // liens: "Lien: name | address" blocks; the debtor becomes initials, everything a researcher needs to pull the record stays
  const li = S.Liens || [];
  let lb = null; const lblocks = [];
  for (const s of li) { if (/^Lien:/.test(s)) { lb = [s]; lblocks.push(lb); continue; } if (lb) lb.push(s); }
  ev.liens = lblocks.map((b) => {
    const m = /^Lien:\s*([^|]+)\|\s*(.*)$/.exec(b[0]) || [];
    const k = kv(b.slice(1));
    const cred = (b.indexOf('Creditor') >= 0) ? kv(b.slice(b.indexOf('Creditor') + 1, b.indexOf('Court') >= 0 ? b.indexOf('Court') : undefined)) : {};
    const court = (b.indexOf('Court') >= 0) ? kv(b.slice(b.indexOf('Court') + 1)) : {};
    return {
      debtor: initials(m[1]), matchedAddress: tidy(m[2] || '') || null,
      type: NA(k['Filing Type Description']) || NA(k['Action Type Description']) || (NA(k['Filing Type']) === 'ST' ? 'STATE TAX LIEN' : NA(k['Filing Type'])),
      filed: usDate(k['Filing Date']), reported: usDate(k['Report Date']), amount: money(k['Liability Amount']),
      caseNumber: NA(k['Case Number']), otherCaseNumber: NA(k['Other Case Number']), state: NA(k['File State']),
      creditor: NA(cred['Business Name']) || NA(cred['Last Name']) || null, court: NA(court['Name']) || null, courtPhone: NA(court['Phone']) || null,
    };
  });
  const all = lines.join(' ');
  ev.judgments = /could not locate any judgment/i.test(all) ? [] : null;               // null = the report had some and this reader does not parse them yet
  ev.preForeclosures = /could not locate any pre-foreclosure/i.test(all) ? [] : null;
  // values, taxes, tax history
  const v = kv(S.Values || []);
  ev.values = { marketEstimate: money(v['Market Value Estimate']) || money(sum['Market Value']), perSqFt: money(v['Market Value Per Sq Ft']), rentEstimate: money(v['Rent Estimate']), lastSaleDate: usDate(v['Last Sale Date']), lastSaleAmount: money(v['Last Sale Amount']) };
  const t = kv(S.Taxes || []);
  ev.taxes = { bill: money(t['Tax Bill Amount']), year: int(t['Tax Year Assessed']), assessedTotal: money(t['Total Assessed Value']), assessedLand: money(t['Land Assessed Value']), assessedImprovements: money(t['Additions Assessed Value']), previousAssessed: money(t['Previous Assessed Value']), changePct: NA(t['Tax Assessed Change %']), rollUpdated: usDate(t['Last Assessor Tax Roll Update']), exemption: NA(t['Tax Exemption']), delinquent: NA(t['Tax Delinquent']), zoningCode: NA(t['Zoned Code Local']), zoningType: NA(t['Zoning Type']), useCode: NA(t['Property Use Standardized']) };
  for (const s of S['Tax History'] || []) { const m = /^(\d{4})\s+\$([\d,]+)\s+(\S+)\s+\$([\d,]+)\s+(\S+)$/.exec(s); if (m) ev.taxHistory.push({ year: Number(m[1]), tax: money(m[2]), taxChange: NA(m[3]), assessment: money(m[4]), assessmentChange: NA(m[5]) }); }
  ev.taxHistory.sort((a, b) => a.year - b.year);
  // building facts
  const pd = kv([].concat(S['Property Details'] || [], S.Rooms || [], S.Area || [], S.Parking || [], S['Construction Details'] || [], S['Property Features'] || [], S['Utilities / Green Energy Details'] || []));
  ev.building = { beds: int(pd['Bedrooms']) ?? int(pd['Bedrooms Count']), baths: money(pd['Bathrooms']) ?? int(pd['Bath Count']), sqft: int(pd['Living Area']) ?? int(sum['Living Area']), yearBuilt: int(pd['Year Built']) ?? int(sum['Year Built']), stories: int(pd['Stories Count']) ?? int(sum['Stories']), rooms: int(pd['Rooms Count']), units: int(pd['Units Count']), lotAcres: money(pd['Lot Acres']) ?? money(pd['Lot Size']), lotSqFt: money(pd['Lot SF']), garageSqft: int(pd['Garage Area']), parkingSpaces: int(pd['Space Count']), construction: NA(pd['Construction']), fireplace: /yes/i.test(pd['Fireplace'] || '') ? (int(pd['Fireplace Count']) || 1) : 0, heating: NA(pd['HVAC Heating Detail']), pool: money(pd['Pool Area']) > 0 };
  Object.keys(ev.building).forEach((k) => { if (ev.building[k] === null || ev.building[k] === undefined) delete ev.building[k]; });
  // loans
  const ln = S['Previous Loans'] || S.Loans || [];
  let lo = null; const loblocks = [];
  for (const s of ln) { if (/^Loan #\d+$/.test(s)) { lo = []; loblocks.push(lo); continue; } if (lo) lo.push(s); }
  ev.loans = loblocks.map((b) => { const k = kv(b); return { amount: money(k['Transaction Mortgage Amount']), date: usDate(k['Mortgage Date']), lender: NA(k['Lender']), lenderType: NA(k['Lender Type']), loanType: NA(k['Loan Type']) }; }).filter((l) => l.amount || l.date);
  ev.loans.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  ev.legal = NA(kv(S.Legal || [])['Description']) || NA(sum['Legal Description']);
  return ev;
}

// ---- entry point ----------------------------------------------------------------
// text + pdf metadata → evidence, or null when the layout is not one we read.
export function parseReport(text, meta) {
  const lines = String(text || '').split('\n').map((s) => s.trim()).filter((s) => s && !/^=====PAGE \d+$/.test(s));
  if (/Property Report Prepared On/i.test(lines.slice(0, 5).join(' ')) || (/Ownership Timeline/.test(text) && /Tax History/.test(text))) return parsePropertyChecker(lines, meta || {});
  return null;
}

export async function parsePdf(bytes) {
  const { text, meta } = await pdfText(bytes);
  const ev = parseReport(text, meta);
  if (!ev) throw Object.assign(new Error('not_a_known_report'), { status: 422 });
  return ev;
}

// months between an ISO date and now — for the "this report is N months old" line
export const monthsSince = (iso, now = new Date()) => { if (!iso) return null; const d = new Date(iso + 'T00:00:00Z'); if (isNaN(d)) return null; return Math.max(0, Math.round((now - d) / (30.44 * 86400000))); };
