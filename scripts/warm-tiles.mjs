#!/usr/bin/env node
// Pre-bake the atlas: request every proxied tile over the property areas so the
// CDN edge cache (and the county's own cache) is warm before anyone visits.
//
//   node scripts/warm-tiles.mjs [site] [--zooms 12-16] [--pad 0.15] [--layers topo,parcels] [--flights] [--concurrency 12]
//
// Reads /api/properties (boundaries) and /v2/tiles.json (every raster template the
// app can request, emitted at build time) from the site itself, so it never drifts
// from what the map actually asks for. Web-mercator tile math only; no dependencies.
const site = (process.argv[2] && !process.argv[2].startsWith('--')) ? process.argv[2].replace(/\/$/, '') : 'https://howard-property-dev.vercel.app';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > -1 ? process.argv[i + 1] : d; };
const [zMin, zMax] = arg('zooms', '12-16').split('-').map(Number);
const pad = Number(arg('pad', '0.15'));
const only = (arg('layers', '') || '').split(',').filter(Boolean);
const flightsToo = process.argv.includes('--flights');
const conc = Number(arg('concurrency', '12'));

const R = 6378137, MAX = 20037508.342789244;
const merc = ([lat, lng]) => [lng * MAX / 180, Math.log(Math.tan((90 + lat) * Math.PI / 360)) * R];
function tileRange(bboxM, z, tileSize) {
  // MapLibre raster sources use a 512-px-per-tile world at zoom z (tileSize 512) - a 256-px source shifts one level
  const n = Math.pow(2, z) * (tileSize === 256 ? 2 : 1), world = 2 * MAX, t = world / n;
  const x0 = Math.floor((bboxM[0] + MAX) / t), x1 = Math.floor((bboxM[2] + MAX) / t);
  const y0 = Math.floor((MAX - bboxM[3]) / t), y1 = Math.floor((MAX - bboxM[1]) / t);
  const out = [];
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) out.push({ x, y, bbox: [x * t - MAX, MAX - (y + 1) * t, (x + 1) * t - MAX, MAX - y * t] });
  return out;
}
const props = await (await fetch(site + '/api/properties')).json();
const manifest = await (await fetch(site + '/v2/tiles.json')).json();
const areas = props.map(p => {
  const pts = [];
  for (const seg of p.boundary || []) for (const c of seg.coordinates || []) pts.push(merc(c));
  for (const lot of p.lots || []) for (const r of lot.rings || []) for (const c of r) pts.push(merc(c));
  if (!pts.length) pts.push(merc(p.center));
  const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
  const px = Math.max(w * pad, 400), py = Math.max(h * pad, 400);
  return { id: p.id, bbox: [Math.min(...xs) - px, Math.min(...ys) - py, Math.max(...xs) + px, Math.max(...ys) + py] };
});
const layers = manifest.overlays.filter(o => o.proxied && (!only.length || only.includes(o.id.replace(/-p\d+$/, ''))));
const flights = flightsToo ? manifest.flights.filter(f => f.proxied) : [];
const jobs = [];
for (const L of [...layers, ...flights]) {
  const tmpl = L.tiles[0];
  for (const a of areas) for (let z = zMin; z <= zMax; z++) {
    const tz = z + ((L.tileSize || 512) === 256 ? 1 : 0);      // 256-px sources fetch one tile level deeper
    if (L.maxzoom != null && tz > L.maxzoom) continue;
    for (const t of tileRange(a.bbox, z, L.tileSize || 512)) jobs.push({ id: L.id, url: site + tmpl.replace('{bbox-epsg-3857}', t.bbox.map(v => v.toFixed(4)).join(',')) });
  }
}
console.log(`${site}: ${areas.length} areas · ${layers.length} layers${flights.length ? ' + ' + flights.length + ' flights' : ''} · zooms ${zMin}-${zMax} · ${jobs.length} tiles · concurrency ${conc}`);
let done = 0, ok = 0, hit = 0, fail = 0, bytes = 0; const t0 = Date.now(); const perLayer = {};
async function worker() {
  while (jobs.length) {
    const j = jobs.shift();
    try {
      const r = await fetch(j.url, { headers: { 'User-Agent': 'atlas-warm/1.0' } });
      const b = await r.arrayBuffer(); bytes += b.byteLength;
      const cache = r.headers.get('x-vercel-cache') || '';
      if (r.ok) { ok++; if (/HIT|STALE/.test(cache)) hit++; } else fail++;
      (perLayer[j.id] ||= { ok: 0, fail: 0 }); r.ok ? perLayer[j.id].ok++ : perLayer[j.id].fail++;
    } catch (e) { fail++; (perLayer[j.id] ||= { ok: 0, fail: 0 }).fail++; }
    if (++done % 100 === 0) console.log(`  ${done} done · ${ok} ok (${hit} already at the edge) · ${fail} failed · ${(bytes / 1048576).toFixed(1)} MB · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
}
await Promise.all(Array.from({ length: conc }, worker));
console.log(`finished: ${ok} ok (${hit} edge hits) · ${fail} failed · ${(bytes / 1048576).toFixed(1)} MB in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
for (const [id, c] of Object.entries(perLayer)) if (c.fail) console.log(`  ${id}: ${c.ok} ok, ${c.fail} failed`);
