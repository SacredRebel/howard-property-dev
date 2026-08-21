// Fetch the confirmed 63rd parcel (035-0-020-010) from the county GIS,
// canonical-hash it, and add it to the verified dataset.
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
const ROOT='https://maps.ventura.org/arcgis/rest/services/SDs/Parcels/FeatureServer/0/query';
const p = new URLSearchParams({ where:"APN10='0350020010'", outFields:'APN10,ACREAGE', returnGeometry:'true', outSR:'4326', geometryPrecision:'6', f:'geojson' });
const j = await (await fetch(ROOT+'?'+p)).json();
const f = j.features[0];
if (!f) { console.error('NOT FOUND'); process.exit(1); }
const geom = f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : { rings: f.geometry.coordinates.map(pp => pp[0]) };
// python-style canonical json (sort_keys, compact) — must match manifest style
const canon = (v) => {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  return JSON.stringify(v);
};
const h = createHash('sha256').update(canon(geom)).digest('hex').slice(0,12);
const all = JSON.parse(readFileSync('./bmr/all-parcels.json','utf8'));
all['0350020010'] = geom;
writeFileSync('./bmr/all-parcels.json', JSON.stringify(all));
const man = JSON.parse(readFileSync('./bmr/parcel-hashes.json','utf8'));
man['0350020010'] = h;
writeFileSync('./bmr/parcel-hashes.json', JSON.stringify(man, null, 0));
const ring = Array.isArray(geom) ? geom : geom.rings[0];
console.log('63rd parcel added:', ring.length, 'vertices | hash', h, '| parcels now:', Object.keys(all).length);
// area check
const lat0 = ring[0][1]*Math.PI/180, mLon = 111320*Math.cos(lat0), mLat = 110574;
let A = 0;
for (let i=0;i<ring.length-1;i++){ const [x1,y1]=ring[i],[x2,y2]=ring[i+1]; A += (x1*mLon)*(y2*mLat)-(x2*mLon)*(y1*mLat); }
console.log('GIS area:', Math.abs(A/2/4046.856).toFixed(1), 'ac vs county 610.41');
