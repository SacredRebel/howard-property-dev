// Probe the County Record resolver against the live services, no server needed.
//   node scripts/record-probe.mjs core 037-0-012-125
//   node scripts/record-probe.mjs deep 34.4326,-119.1564
//   node scripts/record-probe.mjs all 2048-011-048 --debug
// Needs Node 20+ with network access to the county / state / federal hosts
// (Vercel has it; a sandboxed container may not).
import { resolveCore, resolveDeep, resolveParcel, mergeRecord, readFrom } from '../lib/dossier.js';

const [which = 'core', arg = '037-0-012-125', ...rest] = process.argv.slice(2);
const q = arg.includes(',') ? { lat: parseFloat(arg.split(',')[0]), lon: parseFloat(arg.split(',')[1]) } : { apn: arg };
if (rest.includes('--debug')) q.debug = true;
const county = rest.find((r) => /^--county=/.test(r)); if (county) q.county = county.split('=')[1];
const t = Date.now();
try {
  let r;
  if (which === 'parcel') r = await resolveParcel(q);
  else if (which === 'deep') r = await resolveDeep(q);
  else if (which === 'all') { const [c, d] = await Promise.all([resolveCore(q), resolveDeep(q)]); r = mergeRecord(c, d); }
  else r = await resolveCore(q);
  const head = { ms: Date.now() - t, apn: r.apn, situs: r.situs, acreage: r.acreage, county: r.county && (r.county.name + ' · adapter ' + r.county.adapter), queried: r.sourcesQueried, answered: r.sourcesAnswered, late: r.sourcesLate, records: (r.records || []).length, portals: (r.portals || []).length, raw: (r.raw || []).length };
  console.log(JSON.stringify(head));
  for (const f of r.flags || []) console.log('  ! ' + f.level + ': ' + f.text);
  for (const s of r.sections || []) { console.log('## ' + s.label + ' (' + s.rows.length + ')'); for (const row of s.rows) console.log('  ' + (row[0] ? row[0] + ': ' : '   ') + row[1]); }
  if (r.terrain) console.log('TERRAIN', JSON.stringify(r.terrain));
  if (which !== 'parcel') console.log('READ', JSON.stringify(readFrom(r).map((d) => [d.label, d.value, d.score, d.note])));
  if (r.diag) console.log('DIAG', JSON.stringify(r.diag.filter((d) => d[1] !== 'ok' || d[2] > 3000)));
} catch (e) { console.log('ERR', e.status || '', e.message); process.exitCode = 1; }
