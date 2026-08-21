// Fetches all 62 ranch parcels straight from the Ventura County GIS parcel
// service (same API + precision as the validated originals) and verifies each
// against the per-parcel hash manifest before writing all-parcels.json.
import { writeFileSync, readFileSync } from 'fs';
import { createHash } from 'crypto';

const acreage = JSON.parse(readFileSync('./bmr/acreage.json', 'utf8'));
const manifest = JSON.parse(readFileSync('./bmr/parcel-hashes.json', 'utf8'));
const apns = Object.keys(acreage).sort();

const BASE = 'https://maps.ventura.org/arcgis/rest/services/SDs/Parcels/FeatureServer/0/query';
async function fetchBatch(list) {
  const where = "APN10 IN (" + list.map(a => "'" + a + "'").join(',') + ")";
  const url = BASE + '?where=' + encodeURIComponent(where) +
    '&outFields=APN10&returnGeometry=true&outSR=4326&geometryPrecision=6&f=geojson';
  const r = await fetch(url);
  if (!r.ok) throw new Error('county query failed: ' + r.status);
  return (await r.json()).features;
}

// python-style canonical JSON (sorted keys, compact) to match the local manifest
function canon(v) {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  }
  return JSON.stringify(v);
}

const out = {};
const page030 = apns.filter(a => a.startsWith('0350030'));
const page350 = apns.filter(a => a.startsWith('0350350'));
for (const group of [page030, page350]) {
  const feats = await fetchBatch(group);
  for (const f of feats) {
    const apn = f.properties.APN10;
    let data;
    if (f.geometry.type === 'Polygon') data = f.geometry.coordinates[0];
    else data = { rings: f.geometry.coordinates.map(p => p[0]) };
    out[apn] = data;
  }
}

let ok = 0, bad = [];
for (const apn of apns) {
  if (!out[apn]) { bad.push(apn + ' MISSING'); continue; }
  const h = createHash('sha256').update(canon(out[apn])).digest('hex').slice(0, 12);
  if (h === manifest[apn]) ok++;
  else bad.push(apn + ' hash ' + h + ' != ' + manifest[apn]);
}
console.log('parcels fetched:', Object.keys(out).length, '| hash-verified:', ok, '/62');
if (bad.length) { console.log('MISMATCHES:'); bad.forEach(b => console.log(' ', b)); }

// preserve the exact key-insertion order used locally (glob batch order is
// irrelevant — the module builder sorts by id — so sorted order is fine)
writeFileSync('./bmr/all-parcels.json', JSON.stringify(out));
console.log(bad.length === 0 ? 'ALL VERIFIED' : 'VERIFY FAILED');
