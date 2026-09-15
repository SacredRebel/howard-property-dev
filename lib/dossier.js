// ============================================================================
//  THE COUNTY RECORD RESOLVER  (V0.22 → V0.29)
//
//  Given an APN or a point anywhere in the United States, pull everything the
//  public record holds about that ground and normalise it into one shape.
//
//    core  = the county's own record: assessor, land use, hazards, fire, soils,
//            water, habitat, cultural resources, access, districts, survey
//            control, permits, recorded maps  (one county adapter per county)
//    deep  = the state and federal layers that work anywhere (California
//            Geological Survey, FEMA, USGS, NRCS, BLM, Census) plus the
//            1 m terrain grid: elevation, slope classes, buildable ground
//
//  RULES  · resolve on demand, never bulk-copy a county (250k parcels, stale
//          the day you download them)
//         · every value carries its publisher; a positive "not in a zone" is
//          real information and is stated as such (`miss`)
//         · only the parcel anchor is county-specific; swap the adapter and
//          the same resolver runs on the next county (docs/property-intake.md)
//         · budgets: every request 9 s, the whole fan-out ~8.5 s (Vercel), a
//          source that misses the deadline is reported, not invented
// ============================================================================

export const VC_AGS = 'https://maps.ventura.org/arcgis/rest/services/';
export const RECORDMAP_BASE = 'https://maps.ventura.org/recordmaps/';
export const R_CGS = 'https://gis.conservation.ca.gov/server/rest/services/';
export const R_FEMA = 'https://hazards.fema.gov/arcgis/rest/services/';
export const R_NHD = 'https://hydro.nationalmap.gov/arcgis/rest/services/';
export const R_QF = 'https://earthquake.usgs.gov/arcgis/rest/services/';
export const R_BLM = 'https://gis.blm.gov/arcgis/rest/services/';
export const R_LA = 'https://public.gis.lacounty.gov/public/rest/services/';
const R_3DEP = 'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer';
const R_SDA = 'https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest';
const R_CENSUS = 'https://geocoding.geo.census.gov/geocoder/geographies/coordinates';

const REQ_MS = 7500;          // one upstream request
const BUDGET_MS = 8800;       // the whole fan-out (Vercel functions are short-lived)
const POOL = 28;              // concurrent upstream requests (the county server copes; measured Sep 2026)

// ---------------------------------------------------------------------------
//  transport
// ---------------------------------------------------------------------------
function form(params) {
  const b = new URLSearchParams();
  Object.keys(params).forEach((k) => { if (params[k] !== undefined && params[k] !== null) b.append(k, String(params[k])); });
  return b;
}
async function postJson(url, params, ms = REQ_MS) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'howard-property-atlas/1.0 (+https://howard-property-dev.vercel.app)' }, body: form(params), signal: ctl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    if (j.error) throw new Error(j.error.message || 'ags error');
    return j;
  } finally { clearTimeout(t); }
}
async function getJson(url, ms = REQ_MS) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': 'howard-property-atlas/1.0 (+https://howard-property-dev.vercel.app)' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

// one spatial query against an ArcGIS MapServer layer
export async function agsQuery(root, service, layer, geometry, opts = {}) {
  const url = root + service + '/MapServer/' + layer + '/query';
  const p = Object.assign({
    where: opts.where || '1=1', outFields: opts.outFields || '*',
    returnGeometry: opts.returnGeometry ? 'true' : 'false', outSR: '4326', f: 'json',
  }, geometry || {});
  if (opts.distance) { p.distance = opts.distance; p.units = 'esriSRUnit_Meter'; }
  if (opts.orderBy) p.orderByFields = opts.orderBy;
  if (opts.max) p.resultRecordCount = opts.max;
  const j = await postJson(url, p);
  return (j.features || []);
}
export const ptGeom = (lon, lat) => ({ geometry: lon + ',' + lat, geometryType: 'esriGeometryPoint', inSR: '4326', spatialRel: 'esriSpatialRelIntersects' });
export const envGeom = (b) => ({ geometry: [b.xmin, b.ymin, b.xmax, b.ymax].join(','), geometryType: 'esriGeometryEnvelope', inSR: '4326', spatialRel: 'esriSpatialRelIntersects' });
export const polyGeom = (rings) => ({ geometry: JSON.stringify({ rings, spatialReference: { wkid: 4326 } }), geometryType: 'esriGeometryPolygon', inSR: '4326', spatialRel: 'esriSpatialRelIntersects' });

// ---------------------------------------------------------------------------
//  small helpers
// ---------------------------------------------------------------------------
export const money = (v) => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : '$' + Math.round(Number(v)).toLocaleString('en-US'));
export const clean = (s) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : s);
export const titleish = (s) => (typeof s === 'string' && s === s.toUpperCase() && /[A-Z]/.test(s) ? s.toLowerCase().replace(/(^|[\s\-\/(])([a-z])/g, (m, a, b) => a + b.toUpperCase()) : s);
const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const fmtN = (v, d = 0) => (v === null || v === undefined || !isFinite(v) ? null : Number(v).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d }));
const m2ft = (m) => Math.round(m * 3.28084);
const ymd = (s) => { const d = String(s || ''); return /^\d{8}$/.test(d) ? new Date(d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 8) + 'T12:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : null; };
const epochDate = (ms) => { if (!ms) return null; const d = typeof ms === 'number' || /^\d+$/.test(String(ms)) ? new Date(Number(ms)) : new Date(String(ms).replace(' ', 'T').replace(/(\.\d+)?$/, '') + (/[Zz]|[+-]\d\d:?\d\d$/.test(String(ms)) ? '' : 'Z')); return isNaN(d.getTime()) ? null : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }); };
const uniq = (arr) => arr.filter((x, i) => x && arr.indexOf(x) === i);
const blank = (s) => s === null || s === undefined || String(s).trim() === '';

// metres between two lon/lat points
export function metres(lon1, lat1, lon2, lat2) {
  const R = 6371008.8, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
// nearest vertex of a feature (point / polyline / polygon) to a point
function featureDistance(f, lon, lat) {
  const g = f.geometry || {};
  if (g.x !== undefined) return metres(lon, lat, g.x, g.y);
  const parts = g.paths || g.rings || [];
  let best = Infinity;
  for (const part of parts) for (const p of part) { const d = metres(lon, lat, p[0], p[1]); if (d < best) best = d; }
  return best;
}
export function nearestFeatures(features, lon, lat, n = 3) {
  return features.map((f) => ({ f, m: featureDistance(f, lon, lat) })).sort((a, b) => a.m - b.m).slice(0, n);
}
const near = (m) => (m < 1 ? 'on the parcel' : m < 1000 ? '~' + Math.round(m / 10) * 10 + ' m away' : '~' + (m / 1000).toFixed(1) + ' km away');

// run tasks through a small pool, with an overall deadline; a task that misses it is 'late'.
// Each result is { ok, value, ms } in task order, so callers assemble rows deterministically.
async function runAll(tasks, deadlineMs) {
  const results = new Array(tasks.length).fill(null);
  let i = 0;
  const deadline = Date.now() + deadlineMs;
  const worker = async () => {
    while (i < tasks.length) {
      const k = i++;
      if (Date.now() > deadline) { results[k] = { ok: false, late: true }; continue; }
      const t = Date.now();
      try { results[k] = { ok: true, value: await tasks[k](), ms: Date.now() - t }; }
      catch (e) { results[k] = { ok: false, error: String(e && e.message || e).slice(0, 80), ms: Date.now() - t }; }
    }
  };
  const timer = new Promise((res) => setTimeout(() => res('deadline'), deadlineMs + 800));
  await Promise.race([Promise.all(Array.from({ length: Math.min(POOL, tasks.length) }, worker)), timer]);
  return results.map((r) => (r === null ? { ok: false, late: true } : r));
}

// ---------------------------------------------------------------------------
//  SECTION ORDER — every row lands in one of these; the client keeps this order
// ---------------------------------------------------------------------------
export const SECTION_META = [
  ['identity',   'Identity & location'],
  ['valuation',  'Assessor · valuation & transfer'],
  ['landuse',    'Land use & entitlement'],
  ['structures', 'Structures on record'],
  ['hazards',    'Hazards · flood, slope, ground'],
  ['seismic',    'Faults & earthquakes'],
  ['fire',       'Wildfire'],
  ['terrain',    'Terrain · elevation, slope, buildable ground'],
  ['ground',     'Ground · soils & geology'],
  ['water',      'Water · surface, groundwater, utilities'],
  ['habitat',    'Habitat & biological resources'],
  ['cultural',   'Cultural & tribal resources'],
  ['access',     'Access, roads & lines'],
  ['districts',  'Districts & representation'],
  ['survey',     'Survey control & land grid'],
  ['permits',    'Nearby permits'],
  ['records',    'Recorded maps'],
];

// California Wildlife Habitat Relationships codes that occur around Ojai
const WHR = {
  COW: 'Coastal Oak Woodland', BOW: 'Blue Oak Woodland', VOW: 'Valley Oak Woodland', MHC: 'Mixed Chaparral', CRC: 'Chamise-Redshank Chaparral',
  CSC: 'Coastal Scrub', ASP: 'Aspen', MHW: 'Montane Hardwood', MHF: 'Montane Hardwood-Conifer', AGS: 'Annual Grassland', PGS: 'Perennial Grassland',
  VRI: 'Valley Foothill Riparian', MRI: 'Montane Riparian', URB: 'Urban', AGR: 'Agriculture', BAR: 'Barren',
};

// ---------------------------------------------------------------------------
//  VENTURA COUNTY — the county adapter (every layer verified live, Sep 2026)
//
//  A source row: { sec, svc, layer, root?, geom: 'pt'|'poly'|'env', dist?,
//                  where?, near?: n, hit(attrs, count, extra), miss?() }
//  `hit` receives the first feature's attributes, the count, and { all, cx, cy }
//  and returns rows [label, value, key?]. `near: n` asks for geometry and
//  passes the n nearest features (with .m metres) as extra.nearest.
// ---------------------------------------------------------------------------
const VENTURA_SOURCES = [
  // —— land use & entitlement ——
  { sec: 'landuse', svc: 'SDs/MyZoning', layer: 0, hit: (a) => [['Zoning', a.ZONE, 'zoning'], ['Base zone', a.DEFINITION, 'zone_def']] },
  { sec: 'landuse', svc: 'DataDownloads/LandUse', layer: 1, hit: (a) => [['General Plan', a.genplandes, 'genplan'], ['2040 General Plan', a.f2040gp, 'genplan2040']] },
  { sec: 'landuse', svc: 'DataDownloads/LandUse', layer: 0, hit: (a) => [['Area plan', a.name, 'areaplan'], ['Land use designation', clean(a.designat_2) || a.designatio, 'landuse_des']] },
  { sec: 'landuse', svc: 'DataDownloads/Political', layer: 6, hit: (a) => [['Jurisdiction', 'City of ' + clean(a.name || a.city || a.NAME || ''), 'juris']], miss: () => [['Jurisdiction', 'Unincorporated Ventura County — the county is the permitting authority', 'juris']] },
  { sec: 'landuse', svc: 'DataDownloads/Political', layer: 8, hit: (a) => [['Sphere of influence', clean(a.name || a.city || a.NAME || 'a city sphere of influence'), 'soi']] },
  { sec: 'landuse', svc: 'DataDownloads/RegulatoryBoundaries', layer: 3, hit: () => [['SOAR', 'Inside the county SOAR area — re-designating agricultural or open-space land for urban use needs a countywide vote', 'soar']] },
  { sec: 'landuse', svc: 'DataDownloads/RegulatoryBoundaries', layer: 0, hit: (a) => [['Greenbelt', clean(a.name || a.NAME || 'inside a city–county greenbelt agreement area'), 'greenbelt']] },
  { sec: 'landuse', svc: 'SDs/PlanningGIS_Resources', layer: 17, hit: () => [['Williamson Act', 'Under a Land Conservation Act contract — agricultural use required, lower taxes, restricted development', 'williamson']], miss: () => [['Williamson Act', 'Not under a Williamson Act (Land Conservation Act) contract', 'williamson']] },
  { sec: 'landuse', svc: 'SDs/PlanningGIS_Resources', layer: 16, hit: () => [['Agricultural preserve', 'Inside a county agricultural preserve', 'agpreserve']] },
  { sec: 'landuse', svc: 'SDs/PlanningGIS_Resources', layer: 9, hit: (a) => [['Scenic highway', 'Within the ' + (clean(a.BUFFER) || 'mapped').toLowerCase() + ' corridor of ' + clean(a.ROAD) + ' (' + clean(a.TYPE) + ') — scenic-corridor design standards may apply', 'scenic']] },
  { sec: 'landuse', svc: 'SDs/PlanningGIS_Resources', layer: 24, dist: 300, hit: (a, n) => [['Prominent ridgeline', 'A county-mapped prominent ridgeline lies within 300 m — ridgeline protection standards may limit building height and placement', 'ridgeline']] },
  { sec: 'landuse', svc: 'SDs/LandUse', layer: 7, hit: (a) => [['Quimby park fee district', clean(a.NAME), 'quimby']] },
  { sec: 'landuse', svc: 'DataDownloads/NaturalResources', layer: 0, hit: (a) => [['Farmland classification', clean(a.type_2), 'farmland']] },

  // —— hazards (county mapping) ——
  { sec: 'fire', svc: 'SDs/CV_Hazards', layer: 6, geom: 'poly', hit: (a) => [['Fire hazard severity', a.HAZ_CLASS + (a.SRA ? ' · State Responsibility Area' : ''), 'fire_sev']], miss: () => [['Fire hazard severity', 'Not in a mapped severity zone', 'fire_sev']] },
  { sec: 'hazards', svc: 'SDs/CV_Hazards', layer: 0, geom: 'poly', hit: (a) => [['FEMA flood zone (county copy)', 'Zone ' + a.FLD_ZONE + ' touches the parcel — ' + clean(a.FLOODHAZ), 'flood100']], miss: () => [['FEMA flood zone (county copy)', 'No part of the parcel is in the mapped 100-year floodplain', 'flood100']] },
  { sec: 'hazards', svc: 'SDs/CV_Hazards', layer: 1, geom: 'poly', hit: () => [['500-year floodplain', 'Part of the parcel is in the 0.2 % annual-chance (500-year) floodplain', 'flood500']] },
  { sec: 'seismic', svc: 'DataDownloads/Hazards', layer: 6, geom: 'poly', hit: () => [['Earthquake Fault Zone', 'Inside a state Alquist-Priolo special study zone — a fault investigation is required before building', 'apzone']], miss: () => [['Earthquake Fault Zone', 'Not in an Alquist-Priolo zone', 'apzone']] },
  { sec: 'hazards', svc: 'DataDownloads/Hazards', layer: 5, geom: 'poly', hit: () => [['Liquefaction', 'A mapped liquefaction zone touches the parcel', 'liq']], miss: () => [['Liquefaction', 'Not in a mapped liquefaction zone', 'liq']] },
  { sec: 'hazards', svc: 'DataDownloads/Hazards', layer: 4, geom: 'poly', hit: () => [['Mapped landslide', 'A mapped landslide touches this parcel', 'landslide']], miss: () => [['Mapped landslide', 'None mapped on the parcel', 'landslide']] },
  { sec: 'hazards', svc: 'DataDownloads/Hazards', layer: 3, geom: 'poly', hit: () => [['Earthquake-induced landslide', 'A potential earthquake-induced landslide zone touches the parcel', 'eqls']], miss: () => [['Earthquake-induced landslide', 'Not in a mapped zone', 'eqls']] },
  { sec: 'seismic', svc: 'DataDownloads/Hazards', layer: 2, hit: (a) => (a.venturapga == null ? [] : [['Ground shaking (county model)', (a.venturapga / 1000).toFixed(2) + ' g peak ground acceleration', 'pga_county']]) },
  { sec: 'hazards', svc: 'DataDownloads/Hazards', layer: 7, hit: () => [['Subsidence', 'Inside a mapped subsidence zone', 'subsidence']] },
  { sec: 'hazards', svc: 'SDs/CV_Hazards', layer: 3, hit: () => [['Airport safety zone', 'Inside a mapped airport safety zone — height and use limits apply', 'airport']] },
  { sec: 'hazards', svc: 'SDs/CV_Hazards', layer: 21, hit: () => [['Tsunami inundation', 'Inside the mapped tsunami inundation area', 'tsunami']] },
  { sec: 'hazards', svc: 'SDs/PlanningGIS_Hazzards', layer: 3, hit: () => [['Dam inundation', 'Inside a dam-failure inundation area', 'dam']] },
  { sec: 'hazards', svc: 'SDs/PlanningGIS_Hazzards', layer: 20, hit: () => [['Noise contour', 'Inside a mapped noise contour (airport or highway)', 'noise']] },
  { sec: 'hazards', svc: 'SDs/PlanningGIS_Hazzards', layer: 22, geom: 'poly', hit: (a, n, x) => {
      const cls = uniq(x.all.map((f) => clean(f.attributes.SLOPE_PER))).sort((p, q) => parseFloat(p) - parseFloat(q)).map((s) => s.replace(/\s*-\s*/, '–') + ' %');
      return cls.length ? [['County slope classes on the parcel', cls.join(' · '), 'slope_classes']] : [];
    } },
  { sec: 'seismic', svc: 'SDs/CV_Hazards', layer: 4, dist: 3000, where: "NAME <> ' '", near: 1, hit: (a, n, x) => {
      const q = x.nearest[0]; if (!q) return [];
      return [['Nearest named fault (county / Dibblee mapping)', titleish(clean(q.f.attributes.NAME)) + ' · ' + near(q.m), 'fault_county']];
    } },

  // —— wildfire ——
  { sec: 'fire', svc: 'SDs/PlanningGIS_Hazzards', layer: 6, geom: 'poly', hit: (a, n, x) => {
      const fires = x.all.map((f) => f.attributes).filter((t) => t.FIRE_NAME || t.NAME).sort((p, q) => Number(q.YEAR || 0) - Number(p.YEAR || 0));
      const list = uniq(fires.map((t) => titleish(clean(t.FIRE_NAME || t.NAME).replace(/^\d{2}\s+/, '')) + (t.YEAR ? ' (' + t.YEAR + ')' : '')));
      return [['Wildfires on record over this ground', list.length + ' — ' + list.slice(0, 8).join(', ') + (list.length > 8 ? ' …' : ''), 'fires']];
    }, miss: () => [['Wildfires on record over this ground', 'No recorded wildfire perimeter crosses the parcel (county fire history)', 'fires']] },
  { sec: 'fire', svc: 'SDs/PlanningGIS_Hazzards', layer: 21, geom: 'poly', hit: (a) => [['Most recent large fire', clean(a.INCIDENT || a.NAME) + (a.ACREAGE ? ' · ' + fmtN(a.ACREAGE) + ' ac' : ''), 'fire_recent']] },
  { sec: 'fire', svc: 'SDs/SpecialDistricts', layer: 18, hit: (a) => [['Fire protection district', clean(a.NAME), 'fire_district']] },

  // —— ground: soils & geology (county) ——
  { sec: 'ground', svc: 'DataDownloads/NaturalResources', layer: 3, hit: (a) => {
      const r = [['Soil map unit', clean(a.muname).replace(/erode d\b/i, 'eroded'), 'soil_unit']];
      if (a.musym) r.push(['Soil symbol', a.musym + (a.mukey ? ' · mukey ' + a.mukey : ''), 'soil_sym']);
      if (a.slopegradw != null) r.push(['Representative slope', a.slopegradw + ' %', 'soil_slope']);
      if (a.flodfreqdc) r.push(['Flooding frequency', a.flodfreqdc, 'soil_flood']);
      if (a.pondfreqpr) r.push(['Ponding frequency', a.pondfreqpr, 'soil_pond']);
      if (a.brockdepmi) r.push(['Depth to bedrock', a.brockdepmi + ' cm', 'soil_bedrock']);
      if (a.aws050wta != null) r.push(['Available water, top 50 cm', Number(a.aws050wta).toFixed(1) + ' cm', 'soil_aws']);
      return r;
    } },
  { sec: 'ground', svc: 'DataDownloads/Hazards', layer: 1, hit: (a) => [['Expansive soils', titleish(a.name), 'expansive']] },
  { sec: 'ground', svc: 'SDs/PWA_Hydrology', layer: 7, hit: (a) => {
      const g = ['A', 'B', 'C', 'D'].filter((k) => Number(a[k]) > 0).map((k) => k + ' (' + Math.round(a[k]) + ' %)');
      return g.length ? [['Hydrologic soil group', g.join(' · '), 'hydgrp']] : [];
    } },
  { sec: 'ground', svc: 'SDs/EnvironmentalHealth', layer: 9, hit: (a) => [['Septic (onsite wastewater) designation', clean(a.TYPE) + ' — county Environmental Health limitation class for onsite systems', 'septic_des']] },
  { sec: 'ground', svc: 'SDs/EnvironmentalHealth', layer: 8, hit: (a) => [['Radon potential', clean(a.LEVEL_) + ' — ' + clean(a.DESCRIPTIO) + ' (CGS ' + clean(a.CGS_REPORT) + ')', 'radon']] },
  { sec: 'ground', svc: 'SDs/PlanningGIS_Resources', layer: 2, hit: () => [['Aggregate resources (MRZ-2)', 'Inside a state-classified aggregate resource zone (MRZ-2)', 'mrz2']] },
  { sec: 'ground', svc: 'SDs/PlanningGIS_Resources', layer: 20, hit: (a) => [['Oil field boundary', 'Inside the ' + clean(a.NAME) + ' oil field administrative boundary' + (a.ACRES ? ' (' + fmtN(a.ACRES) + ' ac)' : ''), 'oilfield']] },
  { sec: 'ground', svc: 'SDs/PlanningGIS_Resources', layer: 22, hit: (a) => [['Paleontological sensitivity', titleish(clean(a.DESCRIPTIO)), 'paleo']] },

  // —— water ——
  { sec: 'water', svc: 'SDs/Groundwater', layer: 0, hit: (a) => [['Groundwater basin', clean(a.BASIN_NAME) + ' · DWR basin ' + a.BASIN_NUMB, 'gw_basin']], miss: () => [['Groundwater basin', 'Outside a DWR-defined groundwater basin', 'gw_basin']] },
  { sec: 'water', svc: 'SDs/Groundwater', layer: 1, hit: (a) => [['Sustainability agency (SGMA)', clean(a.GSA_Name || a.AGENCYNAME || a.NAME || 'mapped GSA'), 'gsa']] },
  { sec: 'water', svc: 'SDs/SpecialDistricts', layer: 21, hit: (a) => [['Groundwater management agency', clean(a.NAME), 'gma']] },
  { sec: 'water', svc: 'SDs/EnvironmentalHealth', layer: 16, hit: (a) => [['Watershed', clean(a.MAIN_WATER), 'watershed']] },
  { sec: 'water', svc: 'SDs/EnvironmentalHealth', layer: 12, hit: (a) => [['Subwatershed (HUC-10)', clean(a.NAME) + ' · ' + a.HUC10, 'huc10']] },
  { sec: 'water', svc: 'SDs/EnvironmentalHealth', layer: 11, dist: 400, hit: (a, n, x) => {
      const names = uniq(x.all.map((f) => titleish(clean(f.attributes.NAME))));
      return [['Streams within 400 m', n + ' mapped channel' + (n > 1 ? 's' : '') + (names.length ? ' — ' + names.join(', ') : ''), 'streams']];
    }, miss: () => [['Streams within 400 m', 'No county-mapped stream channel within 400 m', 'streams']] },
  { sec: 'water', svc: 'SDs/PWA_WatershedProtection', layer: 6, dist: 400, hit: (a) => [['Watershed Protection District channel', titleish(clean(a.RIVER_NAME)) + ' (' + clean(a.RIVER_ID) + ')' + (a.DISCRIPTIO ? ' — ' + clean(a.DISCRIPTIO) : ''), 'redline']] },
  { sec: 'water', svc: 'SDs/PWA_WatershedProtection', layer: 8, hit: (a) => [['Watershed Protection District zone', 'Zone ' + a.ZONE, 'wpd_zone']] },
  { sec: 'water', svc: 'SDs/EnvironmentalHealth', layer: 1, dist: 1000, hit: (a, n, x) => [['Impaired (303d) waters within 1 km', uniq(x.all.map((f) => clean(f.attributes.NAME || f.attributes.WBNAME || f.attributes.WATERBODY))).join(', ') || n + ' listed', '303d']] },
  { sec: 'water', svc: 'SDs/PWA_Hydrology', layer: 6, hit: (a) => [['Hydrology rain zone', clean(a.LONG_NAME) + ' (' + clean(a.ZONENAME) + ') · ' + clean(a.WATERSHED) + ' watershed', 'rainzone']] },
  { sec: 'water', svc: 'SDs/PWA_Hydrology', layer: 8, hit: (a) => (a.RAINFALL == null ? [] : [['85th-percentile 24-hour storm', a.RAINFALL + ' in — the design storm for stormwater retention', 'storm85']]) },
  { sec: 'water', svc: 'SDs/PlanningGIS_Resources', layer: 27, dist: 600, hit: (a, n, x) => {
      const act = x.all.filter((f) => /active/i.test(f.attributes.STATUS || '')).length;
      return [['Water wells within 600 m', n + ' on record (' + act + ' active)', 'wells_water']];
    }, miss: () => [['Water wells within 600 m', 'None on record', 'wells_water']] },
  { sec: 'water', svc: 'SDs/EnvironmentalHealth', layer: 10, dist: 600, hit: (a, n) => [['Public sewer', n + ' sewer line segment' + (n > 1 ? 's' : '') + ' mapped within 600 m', 'sewer']], miss: () => [['Public sewer', 'No public sewer line mapped within 600 m — onsite septic', 'sewer']] },
  { sec: 'water', svc: 'SDs/EnvironmentalHealth', layer: 14, dist: 600, hit: (a, n) => [['Public water line', n + ' water line segment' + (n > 1 ? 's' : '') + ' mapped within 600 m', 'waterline']], miss: () => [['Public water line', 'No public water line mapped within 600 m — private well or hauled water', 'waterline']] },
  { sec: 'water', svc: 'SDs/SpecialDistricts', layer: 39, hit: (a) => [['Sanitary district', clean(a.NAME), 'sanitary']], miss: () => [['Sanitary district', 'Not in a sanitary district', 'sanitary']] },
  { sec: 'water', svc: 'SDs/SpecialDistricts', layer: 22, hit: (a) => [['Flood-control district', clean(a.NAME), 'wpd']] },

  // —— habitat & biological resources ——
  { sec: 'habitat', svc: 'DataDownloads/NaturalResources', layer: 2, hit: (a) => {
      const t = WHR[a.whrtype] || a.whrtype; if (!t) return [];
      return [['Habitat type (WHR)', t + (a.whr_range ? ' · ' + a.whr_range + ' % canopy cover' : ''), 'whr']];
    } },
  { sec: 'habitat', svc: 'SDs/PlanningGIS_Biological', layer: 10, hit: (a) => (a.SERIES ? [['Vegetation series', clean(a.SERIES) + (a.IVC_ALLIAN ? ' · ' + clean(a.IVC_ALLIAN) : ''), 'veg']] : []) },
  { sec: 'habitat', svc: 'DataDownloads/NaturalResources', layer: 1, geom: 'poly', hit: () => [['Habitat connectivity', 'A mapped habitat connectivity area touches the parcel', 'connectivity']] },
  { sec: 'habitat', svc: 'SDs/PlanningGIS_Biological', layer: 7, hit: () => [['Wildlife corridor', 'Inside a county-mapped wildlife corridor (Habitat Connectivity and Wildlife Corridor overlay)', 'corridor']] },
  { sec: 'habitat', svc: 'SDs/PlanningGIS_Biological', layer: 13, geom: 'poly', hit: () => [['ESHA', 'An Environmentally Sensitive Habitat Area touches the parcel', 'esha']], miss: () => [['ESHA', 'No mapped Environmentally Sensitive Habitat Area on the parcel', 'esha']] },
  { sec: 'habitat', svc: 'SDs/PlanningGIS_Biological', layer: 4, geom: 'poly', hit: () => [['Federal critical habitat', 'Designated critical habitat touches the parcel', 'crithab']], miss: () => [['Federal critical habitat', 'Not in designated critical habitat', 'crithab']] },
  { sec: 'habitat', svc: 'SDs/PlanningGIS_Biological', layer: 3, geom: 'poly', hit: () => [['CNDDB occurrence', 'A California Natural Diversity Database occurrence is mapped on the parcel', 'cnddb']], miss: () => [['CNDDB occurrence', 'No special-status species occurrence mapped on the parcel', 'cnddb']] },
  { sec: 'habitat', svc: 'SDs/PlanningGIS_Biological', layer: 12, geom: 'poly', hit: (a, n) => [['National Wetlands Inventory', n + ' mapped wetland polygon' + (n > 1 ? 's' : '') + ' — ' + clean(a.WETLAND_TY) + (a.ATTRIBUTE ? ' (' + a.ATTRIBUTE + ')' : ''), 'nwi']], miss: () => [['National Wetlands Inventory', 'No NWI wetland mapped on the parcel', 'nwi']] },
  { sec: 'habitat', svc: 'SDs/PlanningGIS_Biological', layer: 15, geom: 'poly', hit: () => [['Conservation easement', 'A recorded conservation easement covers part of the parcel', 'cons_ease']], miss: () => [['Conservation easement', 'No conservation easement mapped', 'cons_ease']] },
  { sec: 'habitat', svc: 'SDs/PlanningGIS_Biological', layer: 16, geom: 'poly', hit: (a) => [['Protected area (CPAD)', clean(a.UNIT_NAME || a.NAME || 'a protected-area unit') + ' touches the parcel', 'cpad']] },
  { sec: 'habitat', svc: 'SDs/PlanningGIS_Biological', layer: 17, hit: () => [['Foothill yellow-legged frog range', 'Inside the mapped species range — stream work may need CDFW consultation', 'frog']] },

  // —— cultural & tribal ——
  { sec: 'cultural', svc: 'SDs/PlanningGIS_Resources', layer: 1, hit: (a) => [['Tribal consultation area (AB 52)', clean(a.NAME) + (a.CONTACT ? ' — ' + clean(a.CONTACT) : ''), 'ab52']] },
  { sec: 'cultural', svc: 'SDs/PlanningGIS_Resources', layer: 3, hit: (a) => [['Archaeological sensitivity', titleish(clean(a.TYPE)), 'archaeo']], miss: () => [['Archaeological sensitivity', 'Not in a mapped archaeological sensitivity area', 'archaeo']] },
  { sec: 'cultural', svc: 'SDs/PlanningGIS_Resources', layer: 7, dist: 1500, hit: (a, n) => [['Cultural heritage sites within 1.5 km', String(n), 'heritage']] },
  { sec: 'cultural', svc: 'SDs/PlanningGIS_Resources', layer: 13, hit: (a) => [['Historic resources survey', 'Inside the ' + clean(a.CASE_NO) + ' survey area', 'histsurvey']] },

  // —— access, roads & lines ——
  { sec: 'access', svc: 'DataDownloads/Transportation', layer: 15, dist: 250, near: 1, hit: (a, n, x) => {
      const q = x.nearest[0]; if (!q) return []; const t = q.f.attributes;
      return [['Nearest public road', titleish(clean(t.full_name)) + ' · ' + clean(t.descriptio) + (t.leftjurisdiction ? ' · ' + clean(t.leftjurisdiction) : '') + ' · ' + near(q.m), 'road']];
    }, miss: () => [['Nearest public road', 'No public road centreline within 250 m — check the recorded access easement', 'road']] },
  { sec: 'access', svc: 'DataDownloads/Transportation', layer: 4, dist: 250, hit: (a, n) => [['Private streets within 250 m', String(n), 'private_st']] },
  { sec: 'access', svc: 'SDs/PWA_RealEstateLGIM', layer: 0, dist: 25, hit: (a, n) => [['County-held easement / right of way', n + ' mapped at the parcel centre', 'county_ease']] },
  { sec: 'access', svc: 'SDs/PlanningGIS_Hazzards', layer: 5, dist: 1000, hit: (a, n) => [['Electric transmission line within 1 km', String(n), 'transmission']] },
  { sec: 'access', svc: 'SDs/PlanningGIS_Hazzards', layer: 18, dist: 1000, hit: (a, n, x) => [['Minor pipelines within 1 km', n + (a.OPERATOR ? ' · ' + uniq(x.all.map((f) => clean(f.attributes.OPERATOR))).join(', ') : ''), 'pipe_minor']] },
  { sec: 'access', svc: 'SDs/PlanningGIS_Hazzards', layer: 19, dist: 1000, hit: (a, n) => [['Major pipelines within 1 km', String(n), 'pipe_major']] },
  { sec: 'access', svc: 'DataDownloads/Permitting', layer: 0, dist: 3200, hit: (a, n) => [['Communication facilities within 2 miles', String(n), 'comms']] },

  // —— districts & representation ——
  { sec: 'districts', svc: 'DataDownloads/Education', layer: 14, hit: (a) => [['School district (elementary)', clean(a.el_name_1 || a.el_name) + (a.phone ? ' · ' + clean(a.phone) : ''), 'school_el']] },
  { sec: 'districts', svc: 'DataDownloads/Education', layer: 15, hit: (a) => [['School district (secondary)', clean(a.hi_name_1 || a.hi_name), 'school_hi']] },
  { sec: 'districts', svc: 'DataDownloads/Political', layer: 18, hit: (a) => [['County supervisor', clean(a.ordinal) + ' District — ' + clean(a.name), 'supervisor']] },
  { sec: 'districts', svc: 'DataDownloads/Political', layer: 5, hit: (a) => [['State Assembly', clean(a.ordinal) + ' District — ' + clean(a.name), 'assembly']] },
  { sec: 'districts', svc: 'DataDownloads/Political', layer: 19, hit: (a) => [['State Senate', clean(a.ordinal) + ' District — ' + clean(a.name), 'senate']] },
  { sec: 'districts', svc: 'DataDownloads/Political', layer: 9, hit: (a) => [['US Congress', clean(a.ordinal) + ' District' + (a.name ? ' — ' + clean(a.name) : ''), 'congress']] },
  { sec: 'districts', svc: 'DataDownloads/Political', layer: 1, hit: (a) => [['Election precinct', clean(a.number_), 'precinct']] },
  { sec: 'districts', svc: 'SDs/SpecialDistricts', layer: 36, hit: (a) => [['Resource conservation district', clean(a.NAME), 'rcd']] },
  { sec: 'districts', svc: 'SDs/SpecialDistricts', layer: 15, hit: (a) => [['County service area', clean(a.NAME), 'csa']] },
  { sec: 'districts', svc: 'SDs/EnvironmentalHealth', layer: 4, hit: (a) => [['Hazardous-materials (CUPA) inspection district', clean(a.NAME) + (a.INSPECTOR ? ' · inspector ' + clean(a.INSPECTOR) : ''), 'cupa']] },
  { sec: 'districts', svc: 'SDs/EnvironmentalHealth', layer: 17, hit: () => [['Disadvantaged community (SB 535)', 'Inside a designated disadvantaged-community census tract', 'dac']] },
  { sec: 'districts', svc: 'SDs/LandUse', layer: 8, hit: (a) => [['ZIP code', a.ZIP + ' ' + clean(a.PO_NAME), 'zip']] },
  { sec: 'districts', svc: 'SDs/LandUse', layer: 2, hit: (a) => [['Census tract', clean(a.NAMELSAD10) + ' · ' + a.GEOID10, 'tract']] },

  // —— survey control & land grid ——
  { sec: 'survey', svc: 'DataDownloads/Survey', layer: 6, hit: (a) => [['Land grant', clean(a.rancho_nam) + ' — inside a Mexican-era rancho; legal descriptions tie to the rancho survey, not to PLSS sections', 'rancho']] },
  { sec: 'survey', svc: 'DataDownloads/Survey', layer: 5, hit: (a) => {
      const t = a.township || a.TOWNSHIP || a.twn || a.TWN, r = a.range || a.RANGE || a.rng || a.RNG;
      return t || r ? [['Township · Range (county)', 'T' + t + ' R' + r, 'tr_county']] : [];
    } },
  { sec: 'survey', svc: 'SDs/SurveyRecords', layer: 0, dist: 2500, near: 3, hit: (a, n, x) => x.nearest.map((q, i) => {
      const t = q.f.attributes;
      return [i === 0 ? 'Nearest survey benchmarks' : '', clean(t.DESIGNATIO) + ' · ' + (clean(t.SYMBOL_LAB) || 'datum n/a') + (t.COND_REPOR ? ' · ' + titleish(clean(t.COND_REPOR)) : '') + (t.VISIT_DATE ? ' · visited ' + epochDate(t.VISIT_DATE) : '') + ' · ' + near(q.m), 'benchmark'];
    }), miss: () => [['Nearest survey benchmarks', 'No county benchmark within 2.5 km', 'benchmark']] },
  { sec: 'survey', svc: 'SDs/LidarIndex', layer: 0, hit: () => [['LiDAR bare-earth coverage', '2005 county LiDAR', 'lidar2005']] },
  { sec: 'survey', svc: 'SDs/LidarIndex', layer: 1, hit: () => [['', '2018 USGS QL-1 LiDAR (≈ 8 pts/m²)', 'lidar2018q1']] },
  { sec: 'survey', svc: 'SDs/LidarIndex', layer: 2, hit: () => [['', '2018 USGS QL-2 LiDAR', 'lidar2018q2']] },
  { sec: 'survey', svc: 'SDs/SurveyRecordLGIM', layer: 1, dist: 400, hit: (a, n) => [['Corner records within 400 m', String(n), 'corner_rec']] },
  { sec: 'survey', svc: 'SDs/SurveyRecordLGIM', layer: 4, dist: 400, hit: (a, n) => [['County Surveyor records within 400 m', String(n), 'surveyor_rec']] },
  { sec: 'survey', svc: 'SDs/SurveyRecordLGIM', layer: 2, dist: 400, hit: (a, n) => [['Unrecorded maps within 400 m', String(n), 'unrec_maps']] },

  // —— nearby permits ——
  { sec: 'permits', svc: 'DataDownloads/Permitting', layer: 1, dist: 1600, hit: (a, n) => [['Mining permits within 1 mile', String(n), 'mining']], miss: () => [['Mining permits within 1 mile', 'None', 'mining']] },
  { sec: 'permits', svc: 'DataDownloads/Permitting', layer: 2, dist: 1600, hit: (a, n) => [['Oil permits within 1 mile', String(n), 'oilpermits']], miss: () => [['Oil permits within 1 mile', 'None', 'oilpermits']] },
];

// —— the assessor record → identity + valuation rows (Ventura field names) ——
function venturaIdentity(a) {
  const id = [], val = [];
  const apnPretty = a.APN10 ? a.APN10.replace(/^(\d{3})(\d)(\d{3})(\d{3})$/, '$1-$2-$3-$4') : (a.APN || '');
  id.push(['APN', apnPretty, 'apn']);
  if (a.APN10) id.push(['APN (10-digit)', a.APN10, 'apn10']);
  if (a.SITUS) id.push(['Situs address', clean(a.SITUS), 'situs']);
  if (a.BOOK) id.push(['Book · page · block · parcel', [a.BOOK, a.PAGE, a.BLOCK, a.PARCEL].filter(Boolean).join(' · '), 'bookpage']);
  if (a.ACREAGE) id.push(['Acreage (assessor)', parseFloat(a.ACREAGE).toFixed(2) + ' ac', 'acreage']);
  if (a['SHAPE.AREA']) id.push(['Parcel area (GIS)', fmtN(a['SHAPE.AREA']) + ' sq ft · ' + (a['SHAPE.AREA'] / 43560).toFixed(2) + ' ac', 'gis_area']);
  if (a['SHAPE.LEN']) id.push(['Perimeter', fmtN(a['SHAPE.LEN']) + ' ft', 'perimeter']);
  if (a.TRA) id.push(['Tax rate area', a.TRA, 'tra']);
  if (a.TRACT) id.push(['Tract', clean(a.TRACT), 'tract_legal']);
  const lv = num(a.L_V), iv = num(a.I_V);
  if (lv) val.push(['Assessed land value', money(lv), 'land_value']);
  if (iv !== null) val.push(['Assessed improvement value', money(iv), 'imp_value']);
  if (lv) val.push(['Total assessed value', money((lv || 0) + (iv || 0)), 'total_value']);
  if (lv && a.ACREAGE && parseFloat(a.ACREAGE) > 0) val.push(['Assessed land per acre', money(Math.round(lv / parseFloat(a.ACREAGE))), 'value_per_ac']);
  if (a.SQ_FT_I) val.push(['Improved floor area on record', fmtN(a.SQ_FT_I) + ' sq ft', 'sqft']);
  if (a.DOC_NR) val.push(['Last recorded document', a.DOC_NR + (a.DOC_TYPE ? ' · type ' + a.DOC_TYPE + (a.DOC_TYPE === 'D' ? ' (deed)' : '') : ''), 'doc_nr']);
  const dd = ymd(a.DOC_DT); if (dd) val.push(['Document date', dd, 'doc_date']);
  if (a.CL) val.push(['Assessor class code', a.CL + (a.QC ? ' · qual ' + a.QC : ''), 'class']);
  return { apnPretty, apn10: a.APN10 || null, situs: clean(a.SITUS) || null, acreage: a.ACREAGE ? parseFloat(a.ACREAGE) : null, id, val };
}

// —— the county's own portals, deep-linked where the county allows it ——
function venturaPortals(rec) {
  const apn10 = rec.apn10 || '', situs = rec.situs || '';
  return [
    { group: 'county', label: 'Assessor · property search', url: 'https://assessor.venturacounty.gov/assessor-data/property-search/', method: 'post', fields: { apn: apn10 }, note: 'Owner of record, use code, improvements, exemptions — opens the county search with this APN' },
    { group: 'county', label: 'Assessor · map book page', url: 'https://assessor.venturacounty.gov/assessor-data/assessor-maps/', method: 'post', fields: { searchType: 'apn', value: apn10 }, note: 'The assessor plat this APN sits on (book · page)' },
    { group: 'county', label: 'Clerk-Recorder · official records', url: 'https://clerkrecorderselfservice.venturacounty.gov/web/user/disclaimer', note: 'Deeds, easements, liens, maps — search by name or document number; copies orderable online' },
    { group: 'county', label: 'Treasurer-Tax Collector · tax bill', url: 'https://taxpayment.venturacounty.gov/webtaxonline/index.html', note: 'Current and prior tax bills, special assessments, delinquencies — by parcel number' },
    { group: 'county', label: 'VC Citizen Access · permits & planning cases', url: 'https://vcca.venturacounty.gov/CitizenAccess/', note: 'Building permits, planning entitlements, code cases, septic and well permits (Accela) — search by APN or address' },
    { group: 'county', label: 'Recorded maps · county scans', url: 'https://maps.ventura.org/recordmaps/', note: 'Parcel maps, records of survey, tract maps' },
    { group: 'county', label: 'County View · GIS viewer', url: 'https://maps.ventura.org/countyview/', note: 'The county’s own map viewer — zoning, plans, hazards, aerials' },
    { group: 'county', label: 'RMA Planning · zoning information', url: 'https://rma.venturacounty.gov/divisions/planning/zoning-information/', note: 'Zoning ordinance, permit types, application handouts' },
    { group: 'county', label: 'Building & Safety · public records request', url: 'https://rma.venturacounty.gov/divisions/building-and-safety/public-records-search-request/', note: 'Permit history and approved plan sets (e.g. the surveyor’s approved permit set)' },
    { group: 'state', label: 'CGS EQ Zapp · fault & seismic zones', url: 'https://maps.conservation.ca.gov/cgs/informationwarehouse/eqzapp/', note: 'Alquist-Priolo and Seismic Hazard Zones by address' },
    { group: 'state', label: 'CalGEM · well finder', url: 'https://maps.conservation.ca.gov/calgem/findwells/', note: 'Every oil, gas and geothermal well — status, operator, history' },
    { group: 'state', label: 'GeoTracker · contaminated sites', url: 'https://geotracker.waterboards.ca.gov/map/', note: 'Leaking tanks, cleanup sites, monitoring wells' },
    { group: 'state', label: 'EnviroStor · DTSC cleanup sites', url: 'https://www.envirostor.dtsc.ca.gov/public/', note: 'Hazardous-waste and cleanup program sites' },
    { group: 'federal', label: 'FEMA Flood Map Service Center', url: situs ? 'https://msc.fema.gov/portal/search?AddressQuery=' + encodeURIComponent(situs + ', Ventura County, CA') : 'https://msc.fema.gov/portal/home', note: 'The effective FIRM panel, letters of map change, flood insurance study' },
    { group: 'federal', label: 'USGS topoView · historic quad sheets', url: rec.center ? 'https://ngmdb.usgs.gov/topoview/viewer/#13/' + rec.center[0].toFixed(4) + '/' + rec.center[1].toFixed(4) : 'https://ngmdb.usgs.gov/topoview/viewer/', note: 'Every USGS edition of this ground, downloadable as GeoTIFF' },
    { group: 'federal', label: 'NRCS Web Soil Survey', url: 'https://websoilsurvey.sc.egov.usda.gov/App/WebSoilSurvey.aspx', note: 'Full soil report: septic and dwelling limitations, capability class' },
    { group: 'federal', label: 'Google Earth', url: rec.center ? 'https://earth.google.com/web/@' + rec.center[0] + ',' + rec.center[1] + ',0a,900d,35y,0h,45t,0r' : 'https://earth.google.com/web/', note: '3D view and historical imagery slider' },
  ];
}

// —— recorded maps (Ventura Surveyor's index; the scans are public) ——
async function venturaRecords(ctx) {
  if (!ctx.bbox) return [];
  const fs = await agsQuery(VC_AGS, 'DataDownloads/Survey', 4, envGeom(ctx.bbox));
  const seen = {}, records = [];
  fs.forEach((f) => {
    const at = f.attributes;
    if (!at.recordlabel || seen[at.recordlabel]) return;
    seen[at.recordlabel] = 1;
    records.push({
      label: at.recordlabel, type: at.documenttype, year: at.year ? String(Math.round(at.year)) : null,
      surveyor: clean(at.surveyor) || null,
      note: clean(at.description) || (clean(at.recordmap) && clean(at.recordmap) !== 'PM UA' ? clean(at.recordmap) : null),
      pages: at.numberpages ? Math.round(at.numberpages) : null,
      url: at.documentlink ? RECORDMAP_BASE + at.documentlink : null,
    });
  });
  records.sort((x, y) => (Number(y.year || 0) - Number(x.year || 0)));
  return records;
}

// —— building footprints inside the parcel polygon ——
async function venturaStructures(ctx) {
  if (!ctx.rings) return [];
  const fs = await agsQuery(VC_AGS, 'DataDownloads/CommonData', 0, polyGeom(ctx.rings));
  if (!fs.length) return [['Buildings mapped by the county', 'None', 'bldg_count']];
  const rows = [['Buildings mapped by the county', String(fs.length), 'bldg_count']];
  const uses = {};
  fs.forEach((f) => { const at = f.attributes; const u = clean(at.building_d || at.buildingty || at.BUILDING_D || 'unclassified'); uses[u] = (uses[u] || 0) + 1; });
  Object.keys(uses).forEach((u) => rows.push(['— ' + titleish(u), uses[u] + (uses[u] > 1 ? ' structures' : ' structure')]));
  const hs = fs.map((f) => f.attributes.height || f.attributes.HEIGHT).filter((h) => h != null && h > 0);
  if (hs.length) rows.push(['Tallest mapped structure', Math.max.apply(null, hs) + ' ft', 'bldg_tallest']);
  const area = fs.map((f) => f.attributes['st_area(shape)']).filter((v) => v > 0);
  if (area.length) rows.push(['Total mapped footprint', fmtN(area.reduce((x, y) => x + y, 0)) + ' sq ft', 'bldg_footprint']);
  const yr = fs.map((f) => f.attributes.imagedate).filter(Boolean);
  if (yr.length) rows.push(['Footprints traced from imagery of', yr.sort().slice(-1)[0], 'bldg_imagery']);
  return rows;
}

// ---------------------------------------------------------------------------
//  LOS ANGELES COUNTY — a second adapter, proving the blueprint. The county's
//  public parcel layer carries the whole assessor roll (use, year built,
//  bedrooms, roll values, legal description). No county-specific fan-out yet:
//  the state and federal record still resolves for every LA parcel.
// ---------------------------------------------------------------------------
function laIdentity(a) {
  const id = [], val = [];
  const ain = String(a.AIN || '').replace(/[^0-9]/g, '');
  const apnPretty = a.APN || (ain ? ain.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1-$2-$3') : '');
  id.push(['APN / AIN', apnPretty + (ain ? ' · AIN ' + ain : ''), 'apn']);
  if (a.SitusFullAddress) id.push(['Situs address', clean(a.SitusFullAddress), 'situs']);
  if (a.Assr_Map) id.push(['Assessor map · index', clean(a.Assr_Map) + (a.Assr_Index_Map ? ' · ' + clean(a.Assr_Index_Map) : ''), 'bookpage']);
  if (a.LegalDescription) id.push(['Legal description', clean(a.LegalDescription), 'legal']);
  if (a.TaxRateArea) id.push(['Tax rate area', clean(a.TaxRateArea) + (a.TaxRateCity ? ' · ' + titleish(clean(a.TaxRateCity)) : ''), 'tra']);
  if (a['Shape.STArea()']) id.push(['Parcel area (GIS)', fmtN(a['Shape.STArea()']) + ' sq ft · ' + (a['Shape.STArea()'] / 43560).toFixed(2) + ' ac', 'gis_area']);
  if (a.UseDescription) val.push(['Use', clean(a.UseType || '') + (a.UseDescription ? ' — ' + clean(a.UseDescription) : '') + (a.UseCode ? ' · code ' + a.UseCode : ''), 'use']);
  if (a.YearBuilt1 && a.YearBuilt1 !== '0') val.push(['Year built', a.YearBuilt1 + (a.EffectiveYear1 && a.EffectiveYear1 !== a.YearBuilt1 ? ' · effective ' + a.EffectiveYear1 : ''), 'year_built']);
  if (num(a.SQFTmain1)) val.push(['Main building area', fmtN(a.SQFTmain1) + ' sq ft' + (num(a.Units1) ? ' · ' + a.Units1 + ' unit' + (a.Units1 > 1 ? 's' : '') : '') + (num(a.Bedrooms1) ? ' · ' + a.Bedrooms1 + ' bd / ' + a.Bathrooms1 + ' ba' : ''), 'sqft']);
  const lv = num(a.Roll_LandValue), iv = num(a.Roll_ImpValue);
  if (lv) val.push(['Assessed land value (roll ' + (a.Roll_Year || '') + ')', money(lv), 'land_value']);
  if (iv !== null) val.push(['Assessed improvement value', money(iv), 'imp_value']);
  if (lv) val.push(['Total assessed value', money((lv || 0) + (iv || 0)), 'total_value']);
  if (a.Roll_LandBaseYear) val.push(['Base year (Prop 13)', a.Roll_LandBaseYear, 'base_year']);
  if (num(a.Roll_HomeOwnersExemp)) val.push(['Homeowners exemption', money(a.Roll_HomeOwnersExemp), 'hox']);
  const acres = a['Shape.STArea()'] ? a['Shape.STArea()'] / 43560 : null;
  return { apnPretty, apn10: ain || null, situs: clean(a.SitusFullAddress) || null, acreage: acres, id, val };
}
function laPortals(rec) {
  const ain = rec.apn10 || '';
  return [
    { group: 'county', label: 'Assessor portal · parcel detail', url: ain ? 'https://portal.assessor.lacounty.gov/parceldetail/' + ain : 'https://portal.assessor.lacounty.gov/', note: 'Roll values, building details, sales history, map' },
    { group: 'county', label: 'Registrar-Recorder · document search', url: 'https://www.lavote.gov/home/records/property-document-recording/document-search', note: 'Recorded deeds, easements, liens — by name or document number' },
    { group: 'county', label: 'Treasurer-Tax Collector · property tax', url: 'https://ttc.lacounty.gov/property-tax-management-system/', note: 'Tax bills and payments by AIN' },
    { group: 'county', label: 'EPIC-LA · permits & planning cases', url: 'https://epicla.lacounty.gov/', note: 'Building, planning, public-works permits (unincorporated LA County)' },
    { group: 'county', label: 'Regional Planning · GIS-NET', url: 'https://planning.lacounty.gov/gis-net/', note: 'Zoning, plans, hazards viewer' },
    { group: 'county', label: 'Assessor map books', url: 'https://assessor.gis.lacounty.gov/oota/rest/services/MAPPING/AssessorMapBooks_AMP/MapServer', note: 'The plat pages behind each AIN' },
    { group: 'state', label: 'CGS EQ Zapp · fault & seismic zones', url: 'https://maps.conservation.ca.gov/cgs/informationwarehouse/eqzapp/', note: 'Alquist-Priolo and Seismic Hazard Zones by address' },
    { group: 'state', label: 'CalGEM · well finder', url: 'https://maps.conservation.ca.gov/calgem/findwells/', note: 'Every oil, gas and geothermal well' },
    { group: 'federal', label: 'FEMA Flood Map Service Center', url: rec.situs ? 'https://msc.fema.gov/portal/search?AddressQuery=' + encodeURIComponent(rec.situs) : 'https://msc.fema.gov/portal/home', note: 'Effective FIRM panel and letters of map change' },
    { group: 'federal', label: 'USGS topoView', url: rec.center ? 'https://ngmdb.usgs.gov/topoview/viewer/#13/' + rec.center[0].toFixed(4) + '/' + rec.center[1].toFixed(4) : 'https://ngmdb.usgs.gov/topoview/viewer/', note: 'Historic quad sheets' },
    { group: 'federal', label: 'NRCS Web Soil Survey', url: 'https://websoilsurvey.sc.egov.usda.gov/App/WebSoilSurvey.aspx', note: 'Full soil report' },
  ];
}

// generic portals for a county without an adapter: the federal record plus honest "find the county's own" searches
function genericPortals(rec) {
  const c = rec.county || {};
  const q = (s) => 'https://www.google.com/search?q=' + encodeURIComponent(s);
  const cn = (c.name || 'county') + ', ' + (c.stateName || c.state || '');
  const out = [
    { group: 'county', label: c.name ? c.name + ' · assessor parcel search' : 'County assessor', url: q(cn + ' assessor parcel search APN'), note: 'The county’s own assessor portal — no adapter for this county yet (see docs/property-intake.md)' },
    { group: 'county', label: c.name ? c.name + ' · recorder official records' : 'County recorder', url: q(cn + ' recorder official records search'), note: 'Deeds, easements, liens' },
    { group: 'county', label: c.name ? c.name + ' · GIS / parcel viewer' : 'County GIS', url: q(cn + ' GIS parcel viewer'), note: 'Zoning and hazards as the county maps them' },
    { group: 'county', label: c.name ? c.name + ' · building permits' : 'County permits', url: q(cn + ' building permit search'), note: 'Permit history' },
    { group: 'federal', label: 'FEMA Flood Map Service Center', url: 'https://msc.fema.gov/portal/home', note: 'Effective FIRM panel by address' },
    { group: 'federal', label: 'USGS topoView', url: rec.center ? 'https://ngmdb.usgs.gov/topoview/viewer/#13/' + rec.center[0].toFixed(4) + '/' + rec.center[1].toFixed(4) : 'https://ngmdb.usgs.gov/topoview/viewer/', note: 'Historic quad sheets' },
    { group: 'federal', label: 'NRCS Web Soil Survey', url: 'https://websoilsurvey.sc.egov.usda.gov/App/WebSoilSurvey.aspx', note: 'Full soil report' },
    { group: 'federal', label: 'BLM · Mineral & Land Records (MLRS)', url: 'https://mlrs.blm.gov/s/', note: 'Mining claims, federal land patents, mineral leases' },
    { group: 'federal', label: 'BLM · General Land Office records', url: 'https://glorecords.blm.gov/', note: 'The original federal land patent for this ground' },
    { group: 'federal', label: 'Google Earth', url: rec.center ? 'https://earth.google.com/web/@' + rec.center[0] + ',' + rec.center[1] + ',0a,900d,35y,0h,45t,0r' : 'https://earth.google.com/web/', note: '3D view and historical imagery' },
  ];
  if (c.state === 'CA') out.splice(4, 0, { group: 'state', label: 'CGS EQ Zapp · fault & seismic zones', url: 'https://maps.conservation.ca.gov/cgs/informationwarehouse/eqzapp/', note: 'Alquist-Priolo and Seismic Hazard Zones by address' }, { group: 'state', label: 'CalGEM · well finder', url: 'https://maps.conservation.ca.gov/calgem/findwells/', note: 'Oil, gas and geothermal wells' });
  return out;
}

// ---------------------------------------------------------------------------
//  COUNTY ADAPTERS — keyed by the 5-digit FIPS the Census geocoder returns.
//  Only the parcel anchor + identity are county-specific; `sources` is that
//  county's own GIS fan-out (Ventura has 100+ layers; a new county starts with
//  none and still gets the state + federal record).
// ---------------------------------------------------------------------------
export const COUNTY_ADAPTERS = {
  '06111': {
    id: 'ventura', name: 'Ventura County', state: 'CA', stateName: 'California',
    apnPattern: /^\d{3}-\d-\d{3}-\d{3}$/,               // 037-0-012-125 (dashed); bare 10 digits are tried against every adapter
    normalizeApn: (s) => String(s).replace(/[^0-9]/g, ''),
    parcels: { root: VC_AGS, svc: 'SDs/Parcels', layer: 0, apnField: 'APN10' },
    identity: venturaIdentity, portals: venturaPortals, sources: VENTURA_SOURCES,
    records: venturaRecords, structures: venturaStructures,
    authority: 'Ventura County GIS (maps.ventura.org) · Assessor · Surveyor · RMA Planning · Environmental Health · Public Works',
  },
  '06037': {
    id: 'losangeles', name: 'Los Angeles County', state: 'CA', stateName: 'California',
    apnPattern: /^\d{4}-\d{3}-\d{3}$/,                 // 2048-011-048 (dashed)
    normalizeApn: (s) => String(s).replace(/[^0-9]/g, ''),
    parcels: { root: R_LA, svc: 'LACounty_Cache/LACounty_Parcel', layer: 0, apnField: 'AIN' },
    identity: laIdentity, portals: laPortals, sources: [],
    records: null, structures: null,
    authority: 'Los Angeles County eGIS (public.gis.lacounty.gov) · Assessor',
  },
};
export const adapterFor = (fips) => COUNTY_ADAPTERS[fips] || null;
// the adapters that could own this APN, best first: an exact dashed format wins outright;
// a bare run of digits (both counties use ten) is tried against every adapter in order
export function adaptersForApn(apn) {
  const s = String(apn || '').trim();
  const all = Object.values(COUNTY_ADAPTERS);
  const exact = all.filter((a) => a.apnPattern.test(s));
  if (exact.length) return exact;
  if (/^\d{8,12}$/.test(s.replace(/[\s-]/g, ''))) return all;
  return [];
}
export function adapterForApn(apn) { return adaptersForApn(apn)[0] || null; }

// —— which county is this point in? (Census geocoder, nationwide, keyless) ——
export async function geocodeCounty(lon, lat) {
  const url = R_CENSUS + '?x=' + lon + '&y=' + lat + '&benchmark=Public_AR_Current&vintage=Current_Current&format=json';
  const j = await getJson(url, 8000);
  const g = (j && j.result && j.result.geographies) || {};
  const county = (g.Counties || [])[0], state = (g.States || [])[0], tract = (g['Census Tracts'] || [])[0], sub = (g['County Subdivisions'] || [])[0];
  if (!county) return null;
  const abbr = STATE_ABBR[state && state.NAME] || null;
  return { fips: county.GEOID, name: county.NAME, state: abbr, stateName: state ? state.NAME : null, tract: tract ? tract.NAME + ' · ' + tract.GEOID : null, subdivision: sub ? sub.NAME : null,
    congress: ((g['119th Congressional Districts'] || g['118th Congressional Districts'] || [])[0] || {}).NAME || null,
    senate: ((g['2024 State Legislative Districts - Upper'] || [])[0] || {}).NAME || null, assembly: ((g['2024 State Legislative Districts - Lower'] || [])[0] || {}).NAME || null };
}
const MERIDIANS = { '21': 'Humboldt Meridian', '22': 'Mount Diablo Meridian', '27': 'San Bernardino Meridian', '20': 'Montana Principal Meridian', '06': 'Boise Meridian', '11': 'Gila and Salt River Meridian', '23': 'New Mexico Principal Meridian', '31': 'Salt Lake Meridian', '33': 'Sixth Principal Meridian', '34': 'Tallahassee Meridian', '36': 'Uintah Meridian', '37': 'Ute Meridian', '38': 'Washington Meridian', '39': 'Willamette Meridian', '30': 'San Bernardino' };
const STATE_ABBR = { Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', 'District of Columbia': 'DC', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY', 'Puerto Rico': 'PR' };

// ---------------------------------------------------------------------------
//  geometry helpers for the anchor
// ---------------------------------------------------------------------------
function bboxOf(rings) {
  let xmin = 1e9, ymin = 1e9, xmax = -1e9, ymax = -1e9;
  rings.forEach((r) => r.forEach((p) => { if (p[0] < xmin) xmin = p[0]; if (p[0] > xmax) xmax = p[0]; if (p[1] < ymin) ymin = p[1]; if (p[1] > ymax) ymax = p[1]; }));
  return { xmin, ymin, xmax, ymax };
}
function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
// area of a lon/lat ring in m² (equal-area enough at parcel scale)
function ringAreaM2(ring, lat0) {
  const kx = 111320 * Math.cos(lat0 * Math.PI / 180), ky = 110540;
  let s = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) s += (ring[j][0] * kx) * (ring[i][1] * ky) - (ring[i][0] * kx) * (ring[j][1] * ky);
  return Math.abs(s / 2);
}
// a point that is inside the polygon (the centroid of a panhandle parcel can fall outside)
function insidePoint(rings, bbox) {
  const cx = (bbox.xmin + bbox.xmax) / 2, cy = (bbox.ymin + bbox.ymax) / 2;
  if (rings.some((r) => inRing(cx, cy, r))) return [cx, cy];
  for (let k = 1; k < 40; k++) {
    const x = bbox.xmin + (bbox.xmax - bbox.xmin) * ((k * 0.618) % 1), y = bbox.ymin + (bbox.ymax - bbox.ymin) * ((k * 0.382) % 1);
    if (rings.some((r) => inRing(x, y, r))) return [x, y];
  }
  return [cx, cy];
}

// ---------------------------------------------------------------------------
//  the anchor: APN or point → parcel feature (or a point-only site)
// ---------------------------------------------------------------------------
async function anchor(q) {
  let adapter = null, parcel = null, county = null;
  if (q.apn) {
    const candidates = q.county && COUNTY_ADAPTERS[q.county] ? [COUNTY_ADAPTERS[q.county]] : adaptersForApn(q.apn);
    if (!candidates.length) { const e = new Error('No county adapter recognises this APN format — pass county=<FIPS> or a point'); e.status = 400; throw e; }
    for (const cand of candidates) {
      const key = cand.normalizeApn(q.apn);
      const rows = await agsQuery(cand.parcels.root, cand.parcels.svc, cand.parcels.layer, null, { where: cand.parcels.apnField + "='" + key + "'", returnGeometry: true }).catch(() => []);
      if (rows[0]) { adapter = cand; parcel = rows[0]; break; }
    }
    if (!parcel) { const e = new Error('APN ' + q.apn + ' is not in the ' + candidates.map((c) => c.name).join(' or ') + ' parcel layer'); e.status = 404; throw e; }
    county = { fips: Object.keys(COUNTY_ADAPTERS).find((k) => COUNTY_ADAPTERS[k] === adapter), name: adapter.name, state: adapter.state, stateName: adapter.stateName };
  } else {
    county = await geocodeCounty(q.lon, q.lat).catch(() => null);
    if (county && COUNTY_ADAPTERS[county.fips]) adapter = COUNTY_ADAPTERS[county.fips];
    if (!adapter && !county) {
      // the geocoder is down: try the home county anyway
      const rows = await agsQuery(VC_AGS, 'SDs/Parcels', 0, ptGeom(q.lon, q.lat), { returnGeometry: true }).catch(() => []);
      if (rows[0]) { adapter = COUNTY_ADAPTERS['06111']; parcel = rows[0]; county = { fips: '06111', name: adapter.name, state: 'CA', stateName: 'California' }; }
    } else if (adapter) {
      const rows = await agsQuery(adapter.parcels.root, adapter.parcels.svc, adapter.parcels.layer, ptGeom(q.lon, q.lat), { returnGeometry: true });
      parcel = rows[0] || null;
    }
  }
  return { adapter, parcel, county };
}

function siteFrom(q, parcel) {
  const rings = (parcel && parcel.geometry && parcel.geometry.rings) || null;
  let bbox, cx = q.lon, cy = q.lat;
  if (rings) { bbox = bboxOf(rings); [cx, cy] = insidePoint(rings, bbox); }
  else {
    const d = 0.0006; // ~60 m box around a bare point
    bbox = { xmin: q.lon - d, ymin: q.lat - d, xmax: q.lon + d, ymax: q.lat + d };
  }
  return { rings, bbox, cx, cy, point: ptGeom(cx, cy) };
}

// run one source row against a site
async function runSource(s, site, root) {
  const r = s.root || root;
  let g;
  if (s.dist) g = Object.assign({}, site.point, { distance: s.dist, units: 'esriSRUnit_Meter' });
  else if (s.geom === 'poly' && site.rings) g = polyGeom(site.rings);
  else if (s.geom === 'env') g = envGeom(site.bbox);
  else g = site.point;
  const fs = await agsQuery(r, s.svc, s.layer, g, { where: s.where, returnGeometry: !!s.near, max: s.max });
  const extra = { all: fs, cx: site.cx, cy: site.cy, nearest: s.near ? nearestFeatures(fs, site.cx, site.cy, s.near) : [] };
  const rows = fs.length ? (s.hit(fs[0].attributes, fs.length, extra) || []) : (s.miss ? s.miss() || [] : []);
  return rows.filter((row) => row && row[1] !== null && row[1] !== undefined && row[1] !== '');
}

// ---------------------------------------------------------------------------
//  CORE — the county record
// ---------------------------------------------------------------------------
export async function resolveCore(q) {
  const t0 = Date.now();
  const { adapter, parcel, county } = await anchor(q);
  const site = siteFrom(q, parcel);
  const buckets = {}; SECTION_META.forEach(([id]) => { buckets[id] = []; });
  const a = parcel ? parcel.attributes : {};
  const rec = adapter && parcel ? adapter.identity(a) : { apnPretty: null, apn10: null, situs: null, acreage: null, id: [], val: [] };
  const acresGis = site.rings ? site.rings.reduce((s, r) => s + ringAreaM2(r, site.cy), 0) / 4046.856 : null;

  buckets.identity.push(...rec.id);
  if (!parcel) buckets.identity.push(['Point', site.cy.toFixed(5) + ', ' + site.cx.toFixed(5), 'point']);
  if (county) {
    buckets.identity.push(['County', county.name + (county.stateName ? ', ' + county.stateName : ''), 'county']);
    if (county.subdivision) buckets.identity.push(['Census county subdivision', county.subdivision, 'ccd']);
    if (!adapter) buckets.identity.push(['Parcel record', 'No parcel adapter for ' + county.name + ' yet — the state and federal record below still resolves for this point (docs/property-intake.md explains how to add the county)', 'no_adapter']);
  }
  buckets.valuation.push(...rec.val);

  const tasks = [], names = [];
  const srcs = adapter ? adapter.sources : [];
  for (const s of srcs) { names.push(s.svc + '/' + s.layer); tasks.push(() => runSource(s, site, adapter.parcels.root)); }
  if (adapter && adapter.structures && site.rings) { names.push('structures'); tasks.push(() => adapter.structures(site)); }
  let records = [];
  if (adapter && adapter.records) { names.push('records'); tasks.push(async () => { records = await adapter.records(site); return []; }); }
  const done = await runAll(tasks, BUDGET_MS - (Date.now() - t0));
  done.forEach((r, i) => {
    if (!r.ok || !Array.isArray(r.value)) return;
    const sec = i < srcs.length ? srcs[i].sec : 'structures';
    r.value.forEach((row) => buckets[sec].push(row));
  });
  const answered = done.filter((v) => v.ok).length, late = done.filter((v) => v.late).length;
  const diag = q.debug ? done.map((r, i) => [names[i], r.ok ? 'ok' : (r.late ? 'late' : 'error: ' + r.error), r.ms || null]) : undefined;

  // —— flags: what a buyer, a lender or a permit desk would want surfaced first ——
  const flags = [];
  const flat = [].concat.apply([], SECTION_META.map(([id]) => buckets[id]));
  const find = (k) => { const r = flat.find((x) => x[2] === k); return r ? String(r[1]) : ''; };
  if (/very high|high/i.test(find('fire_sev'))) flags.push({ level: 'watch', key: 'fire', text: find('fire_sev') + ' fire severity — expect defensible-space and ignition-resistant construction requirements, and check insurability early.' });
  if (/^Zone /.test(find('flood100'))) flags.push({ level: 'watch', key: 'flood', text: find('flood100') + ' — flood insurance is normally required by a lender, and habitable floors must sit above the base flood elevation.' });
  if (/touches/.test(find('landslide')) || /touches/.test(find('eqls'))) flags.push({ level: 'watch', key: 'landslide', text: 'Mapped landslide terrain on or touching the parcel — a geotechnical report will be part of any building permit; site the structure on the flat ground and keep the toe of the slope clear.' });
  if (/Inside a state Alquist/.test(find('apzone'))) flags.push({ level: 'watch', key: 'ap', text: 'Alquist-Priolo zone — a fault investigation by a licensed geologist is required before a building permit.' });
  if (/Under a Land Conservation/.test(find('williamson'))) flags.push({ level: 'watch', key: 'williamson', text: 'Williamson Act contract — the land must stay in agricultural use; non-agricultural building is restricted and cancellation is slow and costly.' });
  if (/Severe/i.test(find('septic_des')) && /No public sewer/.test(find('sewer'))) flags.push({ level: 'watch', key: 'septic', text: 'No public sewer and a "severe" county septic designation — an engineered onsite wastewater system and percolation testing will drive where anything can be built.' });
  if (/No public water line/.test(find('waterline'))) flags.push({ level: 'note', key: 'water', text: 'No public water line mapped nearby — water is a well, a shared system or hauled; confirm the well log and yield before anything else.' });
  if (/Inside a county-mapped wildlife corridor|touches the parcel/.test(find('corridor') + find('esha'))) flags.push({ level: 'note', key: 'habitat', text: 'Habitat overlay on the parcel (wildlife corridor / ESHA) — expect biological review, lighting, fencing and setback standards.' });
  if (/^\d+ — /.test(find('fires'))) flags.push({ level: 'note', key: 'fires', text: 'Wildfire perimeters on record over this ground: ' + find('fires').replace(/^\d+ — /, '') + '.' });
  if (a.SQ_FT_I && Number(a.SQ_FT_I) > 0 && /None/.test(find('bldg_count'))) flags.push({ level: 'note', key: 'sqft', text: 'The assessor records ' + fmtN(a.SQ_FT_I) + ' sq ft of improvement, but the county maps no building footprint here. Worth reconciling before a lender does.' });
  if (/Site of Merit|survey area/.test(find('histsurvey') + find('heritage'))) { /* informational only */ }
  if (records.length) flags.push({ level: 'good', key: 'records', text: records.length + ' recorded maps cover this parcel, back to ' + (records[records.length - 1].year || 'the earliest on file') + '. Each one is a downloadable scan.' });
  if (late) flags.push({ level: 'note', key: 'late', text: late + ' county sources did not answer within the time budget — refresh the record to fill them in.' });

  // the raw assessor record, every field the county returned, for the researcher who wants the whole thing
  const raw = parcel ? Object.keys(a).filter((k) => !/^(shape|st_|objectid$|globalid$)/i.test(k) && !blank(a[k])).map((k) => [k, String(a[k])]) : [];

  const sections = SECTION_META.map(([id, label]) => ({ id, label, rows: buckets[id] })).filter((s) => s.rows.length);
  const out = {
    part: 'core',
    apn: rec.apnPretty, apn10: rec.apn10, situs: rec.situs,
    acreage: rec.acreage != null ? rec.acreage : (acresGis != null ? Number(acresGis.toFixed(2)) : null),
    center: [site.cy, site.cx], bbox: site.bbox,
    geometry: site.rings ? { rings: site.rings } : null,
    county: county ? Object.assign({}, county, { adapter: adapter ? adapter.id : null, authority: adapter ? adapter.authority : null }) : null,
    flags, sections, records, raw,
    portals: adapter ? adapter.portals({ apn10: rec.apn10, situs: rec.situs, center: [site.cy, site.cx] }) : genericPortals({ county, center: [site.cy, site.cx] }),
    sourcesQueried: tasks.length, sourcesAnswered: answered, sourcesLate: late, partial: late > 0,
    resolvedAt: new Date().toISOString(), ms: Date.now() - t0, diag,
  };
  return out;
}

// ---------------------------------------------------------------------------
//  DEEP — state + federal layers (anywhere in the US) and the terrain grid
// ---------------------------------------------------------------------------
const CA_SOURCES = [
  { sec: 'ground', root: R_CGS, svc: 'CGS/Geologic_Map_of_California', layer: 12, hit: (a) => [['Bedrock / surface unit (CGS 1:750k)', clean(a.PTYPE) + ' — ' + clean(a.GENERAL_LITHOLOGY) + ' · ' + clean(a.AGE) + (a.DESCRIPTION ? ' · ' + clean(a.DESCRIPTION) : ''), 'geo_unit']] },
  { sec: 'ground', root: R_CGS, svc: 'CGS/QuaternarySurficialDepositsSouthernCA', layer: 9, hit: (a) => [['Quaternary surface deposit (CGS 1:100k)', clean(a.ptype) + ' — ' + clean(a.name) + (a.source_quad ? ' · ' + clean(a.source_quad) + ' sheet' : ''), 'quat']] },
  { sec: 'ground', root: R_CGS, svc: 'CGS/RadonPotentialZones', layer: 0, hit: (a) => [['Radon potential zone (CGS)', clean(a.Rn_ZONE_POTENTIAL) + ' — ' + clean(a.DESCRIPTION_RN_ZONE), 'radon_cgs']] },
  { sec: 'ground', root: R_CGS, svc: 'MOL/MOLMines', layer: 0, dist: 5000, hit: (a, n, x) => [['Permitted mines within 5 km', n + ' — ' + uniq(x.all.map((f) => clean(f.attributes.MINE_NAME || f.attributes.NAME || f.attributes.mine_name))).slice(0, 5).join(', '), 'mines']], miss: () => [['Permitted mines within 5 km', 'None (Division of Mine Reclamation)', 'mines']] },
  { sec: 'ground', root: R_CGS, svc: 'WellSTAR/Wells', layer: 0, dist: 1000, hit: (a, n, x) => {
      const st = {}; x.all.forEach((f) => { const s = clean(f.attributes.WellStatus) || 'unknown'; st[s] = (st[s] || 0) + 1; });
      const fields = uniq(x.all.map((f) => clean(f.attributes.FieldName)));
      return [['Oil & gas wells within 1 km (CalGEM)', n + ' — ' + Object.keys(st).map((k) => st[k] + ' ' + k.toLowerCase()).join(', ') + (fields.length ? ' · field: ' + fields.join(', ') : ''), 'wells_og']];
    }, miss: () => [['Oil & gas wells within 1 km (CalGEM)', 'None on record', 'wells_og']] },
  { sec: 'seismic', root: R_CGS, svc: 'CGS_Earthquake_Hazard_Zones/SHP_Fault_Traces', layer: 0, dist: 3000, near: 1, hit: (a, n, x) => { const q = x.nearest[0]; if (!q) return []; const t = q.f.attributes; return [['Nearest Alquist-Priolo trace', clean(t.FAULT_NAME) + (t.LINE_TYPE ? ' · ' + clean(t.LINE_TYPE).toLowerCase() : '') + ' · ' + near(q.m), 'ap_trace']]; }, miss: () => [['Nearest Alquist-Priolo trace', 'None within 3 km', 'ap_trace']] },
  { sec: 'seismic', root: R_CGS, svc: 'CGS/FaultActivityMapCA', layer: 21, dist: 3000, near: 3, hit: (a, n, x) => {
      const seen = {}; const rows = [];
      x.nearest.forEach((q) => { const t = q.f.attributes; const nm = clean(t.FLT_NAME) || 'unnamed'; if (seen[nm]) return; seen[nm] = 1; rows.push([rows.length ? '' : 'Quaternary faults within 3 km (CGS Fault Activity Map)', nm + (t.ZN_NAME && clean(t.ZN_NAME).toLowerCase() !== nm.toLowerCase() ? ' · ' + clean(t.ZN_NAME) : '') + (t.FLT_AGE ? ' · age ' + clean(t.FLT_AGE) : '') + (t.LTYPE ? ' · ' + clean(t.LTYPE) : '') + ' · ' + near(q.m), 'qfault']); });
      return rows;
    }, miss: () => [['Quaternary faults within 3 km (CGS Fault Activity Map)', 'None mapped', 'qfault']] },
  { sec: 'seismic', root: R_CGS, svc: 'CGS/MS48_NSHM2023_Faults', layer: 0, dist: 3000, near: 1, hit: (a, n, x) => { const q = x.nearest[0]; if (!q) return []; const t = q.f.attributes; return [['Nearest hazard-model fault & slip rate (NSHM 2023)', clean(t.FaultName) + ' · ' + t.PrefRate + ' mm/yr (' + t.LowRate + '–' + t.HighRate + ') · ' + near(q.m), 'slip']]; } },
  { sec: 'seismic', root: R_CGS, svc: 'CGS/CA_HistEQs_M3Plus', layer: 0, dist: 15000, hit: (a, n, x) => {
      const eq = x.all.map((f) => f.attributes); const mx = eq.reduce((m, e) => (Number(e.mag) > Number(m.mag) ? e : m), eq[0]);
      const recent = eq.reduce((m, e) => (String(e.dtevent || '') > String(m.dtevent || '') ? e : m), eq[0]);
      const rd = recent ? epochDate(recent.dtevent) : null;
      return [['Recorded earthquakes M3+ within 15 km', n + ' · largest M' + Number(mx.mag).toFixed(1) + (mx.place ? ' (' + clean(mx.place) + ')' : '') + (mx.dtevent && epochDate(mx.dtevent) ? ' on ' + epochDate(mx.dtevent) : '') + (rd ? ' · most recent ' + rd : ''), 'quakes']];
    }, miss: () => [['Recorded earthquakes M3+ within 15 km', 'None in the CGS catalog', 'quakes']] },
  { sec: 'seismic', root: R_CGS, svc: 'CGS/Alquist_Priolo_Site_Investigation_Reports', layer: 0, dist: 5000, near: 3, hit: (a, n, x) => x.nearest.map((q, i) => { const t = q.f.attributes; return [i ? '' : 'Fault investigations filed within 5 km (' + n + ')', clean(t.LOCATION) + ' · ' + clean(t.FAULT_NAME) + ' · fault found: ' + (t.FAULT_FOUND === 'Y' ? 'yes' : 'no') + (t.FAULT_ACTIVITY ? ' (' + clean(t.FAULT_ACTIVITY).toLowerCase() + ')' : '') + (t.REPORT_DATE ? ' · ' + (ymd(t.REPORT_DATE) || t.REPORT_DATE) : '') + (t.CONSULTANT ? ' · ' + clean(t.CONSULTANT) : '') + ' · ' + near(q.m), 'apsi']; }), miss: () => [['Fault investigations filed within 5 km', 'None on file with CGS', 'apsi']] },
  { sec: 'landuse', root: R_CGS, svc: 'DLRP/CaliforniaWilliamsonActEnrollment_2025', layer: 9, hit: (a) => [['Williamson Act enrollment (state 2025 map)', clean(a.TYPE || a.Type || a.CONTRACT_T || 'enrolled'), 'williamson_state']] },
];
// CGS rasters answer through identify, not query
const CA_RASTERS = [
  { sec: 'hazards', svc: 'CGS/MS58_LandslideSusceptibility_Classes', kind: 'map', hit: (v) => [['Landslide susceptibility at the parcel centre (CGS Map Sheet 58)', 'Class ' + v + ' on the 0–X scale — ' + (v === '0' ? 'lowest: gentle ground or strong rock' : Number(v) >= 8 ? 'high: steep slopes on weak rock' : Number(v) >= 5 ? 'moderate' : 'low'), 'ls_susc']] },
  { sec: 'seismic', svc: 'CGS/MS48_GroundMotion_PGA_10pc50', kind: 'image', hit: (v) => [['Peak ground acceleration, 10 % in 50 yr (475-yr)', Number(v).toFixed(2) + ' g — CGS Map Sheet 48 / NSHM 2023', 'pga475']] },
  { sec: 'seismic', svc: 'CGS/MS48_GroundMotion_PGA_2pc50', kind: 'image', hit: (v) => [['Peak ground acceleration, 2 % in 50 yr (2475-yr)', Number(v).toFixed(2) + ' g', 'pga2475']] },
  { sec: 'seismic', svc: 'CGS/MS48_MMI_PGA_10pc50', kind: 'image', hit: (v) => [['Expected shaking intensity, 10 % in 50 yr', 'MMI ' + Number(v).toFixed(1) + ' — ' + mmiWord(Number(v)), 'mmi']] },
  { sec: 'seismic', svc: 'CGS/MS48_Vs30_ShearWaveVelocity2022', kind: 'image', hit: (v) => [['Site shear-wave velocity Vs30', Math.round(Number(v)) + ' m/s — site class ' + (Number(v) > 760 ? 'B (rock)' : Number(v) >= 360 ? 'C (very dense soil / soft rock)' : Number(v) >= 180 ? 'D (stiff soil)' : 'E (soft soil)'), 'vs30']] },
];
function mmiWord(v) { return v >= 9 ? 'violent' : v >= 8 ? 'severe' : v >= 7 ? 'very strong' : v >= 6 ? 'strong' : v >= 5 ? 'moderate' : 'light'; }
async function identifyRaster(r, site) {
  const pt = JSON.stringify({ x: site.cx, y: site.cy, spatialReference: { wkid: 4326 } });
  if (r.kind === 'image') {
    const j = await postJson(R_CGS + r.svc + '/ImageServer/identify', { geometry: pt, geometryType: 'esriGeometryPoint', returnGeometry: 'false', f: 'json' });
    const v = j && j.value; if (v === undefined || v === null || v === 'NoData' || v === '') return [];
    return r.hit(String(v));
  }
  const j = await postJson(R_CGS + r.svc + '/MapServer/identify', { geometry: pt, geometryType: 'esriGeometryPoint', sr: 4326, tolerance: 2, mapExtent: [site.cx - 0.01, site.cy - 0.01, site.cx + 0.01, site.cy + 0.01].join(','), imageDisplay: '400,400,96', layers: 'all', returnGeometry: 'false', f: 'json' });
  const res = (j.results || [])[0]; if (!res) return [];
  const at = res.attributes || {}; const v = at['Raster.Value'] !== undefined ? at['Raster.Value'] : at['Pixel Value'];
  if (v === undefined || v === null || v === 'NoData') return [];
  return r.hit(String(v));
}

const FED_SOURCES = [
  { sec: 'hazards', root: R_FEMA, svc: 'public/NFHL', layer: 28, geom: 'poly', hit: (a, n, x) => {
      const zones = uniq(x.all.map((f) => { const t = f.attributes; return 'Zone ' + t.FLD_ZONE + (t.ZONE_SUBTY ? ' (' + titleish(clean(t.ZONE_SUBTY)) + ')' : ''); }));
      const sfha = x.all.some((f) => f.attributes.SFHA_TF === 'T');
      const bfe = x.all.map((f) => f.attributes.STATIC_BFE).filter((v) => v != null && v > -9000);
      return [['FEMA National Flood Hazard Layer', zones.join(' · ') + (sfha ? ' — part of the parcel is a Special Flood Hazard Area' : ' — no Special Flood Hazard Area on the parcel') + (bfe.length ? ' · base flood elevation ' + Math.round(Math.max.apply(null, bfe)) + ' ft' : ''), 'nfhl']];
    }, miss: () => [['FEMA National Flood Hazard Layer', 'No mapped flood zone on the parcel (unmapped or Zone X)', 'nfhl']] },
  { sec: 'hazards', root: R_FEMA, svc: 'public/NFHL', layer: 3, hit: (a) => [['FIRM panel', clean(a.FIRM_PAN) + (a.EFF_DATE ? ' · effective ' + epochDate(a.EFF_DATE) : '') + (a.PANEL_TYP ? ' · ' + clean(a.PANEL_TYP).toLowerCase() : ''), 'firm']] },
  { sec: 'seismic', root: R_QF, svc: 'haz/hazfaults2014', layer: 0, dist: 3000, near: 2, hit: (a, n, x) => x.nearest.map((q, i) => { const t = q.f.attributes; return [i ? '' : 'USGS Quaternary faults within 3 km (' + n + ')', clean(t.name) + (t.disp_slip_ ? ' · ' + clean(t.disp_slip_) : '') + (t.disp_dips ? ' · dip ' + clean(String(t.disp_dips).replace('&deg;', '°')) + (t.dip_dir ? ' ' + t.dip_dir : '') : '') + (t.disp_sing ? ' · slip ' + clean(t.disp_sing) + ' mm/yr' : '') + ' · ' + near(q.m), 'usgs_fault']; }), miss: () => [['USGS Quaternary faults within 3 km', 'None in the national database', 'usgs_fault']] },
  { sec: 'water', root: R_NHD, svc: 'nhd', layer: 6, dist: 400, hit: (a, n, x) => { const names = uniq(x.all.map((f) => clean(f.attributes.gnis_name))); return [['NHD streams within 400 m', n + ' flowline segment' + (n > 1 ? 's' : '') + (names.length ? ' — ' + names.join(', ') : ' (unnamed)'), 'nhd']]; }, miss: () => [['NHD streams within 400 m', 'No mapped flowline within 400 m', 'nhd']] },
  { sec: 'water', root: R_NHD, svc: 'nhd', layer: 12, dist: 400, hit: (a, n, x) => [['NHD waterbodies within 400 m', uniq(x.all.map((f) => clean(f.attributes.gnis_name))).join(', ') || n + ' unnamed', 'nhd_wb']] },
  { sec: 'landuse', root: R_BLM, svc: 'lands/BLM_Natl_SMA_LimitedScale', layer: 1, hit: (a) => [['Surface management (BLM)', (a.ADMIN_AGENCY_CODE && a.ADMIN_AGENCY_CODE !== 'UND' ? clean(a.ADMIN_AGENCY_CODE) + (a.ADMIN_UNIT_NAME ? ' · ' + clean(a.ADMIN_UNIT_NAME) : '') : 'Private or undetermined — not federal land'), 'sma']] },
  { sec: 'survey', root: R_BLM, svc: 'Cadastral/BLM_Natl_PLSS_CadNSDI', layer: 2, max: 8, hit: (a, n, x) => {
      const feats = x.all.map((f) => f.attributes);
      const label = (id) => { const m = /^([A-Z]{2})(\d{2})(\d{3})(\d)([NS])(\d{3})(\d)([EW])/.exec(String(id || '')); return m ? { tr: 'T' + Number(m[3]) + (m[4] !== '0' ? '.' + m[4] : '') + m[5] + ' R' + Number(m[6]) + (m[7] !== '0' ? '.' + m[7] : '') + m[8], pm: MERIDIANS[m[2]] || ('principal meridian ' + m[2]) } : { tr: String(id || ''), pm: '' }; };
      const sect = feats.filter((t) => t.FRSTDIVNO && t.FRSTDIVNO !== '00').sort((p, q) => (p['Shape.STArea()'] || 0) - (q['Shape.STArea()'] || 0))[0];
      if (sect) { const l = label(sect.PLSSID); return [['Township · Range · Section (BLM PLSS)', l.tr + ' · Section ' + Number(sect.FRSTDIVNO) + ' · ' + l.pm, 'plss']]; }
      const trs = uniq(feats.map((t) => label(t.PLSSID).tr));
      return [['Township · Range (BLM PLSS)', (trs.length > 1 ? 'Unsurveyed block — protracted townships overlap here: ' + trs.join(' · ') + ' — the rancho survey, not a section, governs the legal description' : trs[0] + ' · unsectioned'), 'plss']];
    } },
];

// —— the terrain grid: 3DEP 1 m elevation sampled on a regular grid inside the parcel ——
async function terrainGrid(site) {
  const rings = site.rings || [[[site.bbox.xmin, site.bbox.ymin], [site.bbox.xmax, site.bbox.ymin], [site.bbox.xmax, site.bbox.ymax], [site.bbox.xmin, site.bbox.ymax], [site.bbox.xmin, site.bbox.ymin]]];
  const lat0 = site.cy, kx = 111320 * Math.cos(lat0 * Math.PI / 180), ky = 110540;
  const areaM2 = rings.reduce((s, r) => s + ringAreaM2(r, lat0), 0);
  // spacing: ~1200 interior samples, never finer than 3 m (3DEP is 1 m) nor coarser than 80 m; widened until the request fits 3DEP's 2000-sample limit
  let d = Math.min(80, Math.max(3, Math.sqrt(areaM2 / 1200)));
  let grid = null;
  for (let attempt = 0; attempt < 5 && !grid; attempt++) {
    const dx = d / kx, dy = d / ky;
    const nx = Math.ceil((site.bbox.xmax - site.bbox.xmin) / dx) + 2, ny = Math.ceil((site.bbox.ymax - site.bbox.ymin) / dy) + 2;
    if (nx * ny > 60000) { d *= 1.6; continue; }
    const inside = new Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const x = site.bbox.xmin - dx + i * dx, y = site.bbox.ymin - dy + j * dy; inside[j * nx + i] = rings.some((r) => inRing(x, y, r)); }
    // interior points + a one-cell halo so slopes at the edge have neighbours
    const pts = [], idx = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i; let keep = inside[k];
      if (!keep) for (let dj = -1; dj <= 1 && !keep; dj++) for (let di = -1; di <= 1 && !keep; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < nx && jj < ny && inside[jj * nx + ii]) keep = true; }
      if (keep) { pts.push([site.bbox.xmin - dx + i * dx, site.bbox.ymin - dy + j * dy]); idx.push(k); }
    }
    if (pts.length > 1950) { d *= 1.3; continue; }
    grid = { d, dx, dy, nx, ny, inside, pts, idx };
  }
  if (!grid || grid.pts.length < 4) return null;
  const { d: dd, nx, ny, inside, pts, idx } = grid;
  const j = await postJson(R_3DEP + '/getSamples', { geometry: JSON.stringify({ points: pts, spatialReference: { wkid: 4326 } }), geometryType: 'esriGeometryMultipoint', returnFirstValueOnly: 'true', f: 'json' }, REQ_MS);
  const samples = j.samples || [];
  if (!samples.length) return null;
  // 3DEP returns samples in request order; locationId is the input index
  const z = new Array(nx * ny).fill(null);
  samples.forEach((s) => { const li = s.locationId; const v = parseFloat(s.value); if (isFinite(v) && idx[li] !== undefined) z[idx[li]] = v; });
  let zmin = Infinity, zmax = -Infinity, zsum = 0, zn = 0;
  const slopes = [], aspects = [];
  for (let jj = 0; jj < ny; jj++) for (let i = 0; i < nx; i++) {
    const k = jj * nx + i; if (!inside[k] || z[k] === null) continue;
    zsum += z[k]; zn++; if (z[k] < zmin) zmin = z[k]; if (z[k] > zmax) zmax = z[k];
    const l = z[k - 1], r = z[k + 1], u = z[k + nx], dn = z[k - nx];
    if (i > 0 && i < nx - 1 && jj > 0 && jj < ny - 1 && l !== null && r !== null && u !== null && dn !== null) {
      const gx = (r - l) / (2 * dd), gy = (u - dn) / (2 * dd);
      slopes.push(Math.sqrt(gx * gx + gy * gy) * 100);
      aspects.push((Math.atan2(-gx, -gy) * 180 / Math.PI + 360) % 360);   // downslope direction, 0 = N
    }
  }
  if (!zn || !slopes.length) return null;
  const cellAc = (dd * dd) / 4046.856;
  const cls = [[0, 10, 'gentle (0–10 %)'], [10, 20, 'moderate (10–20 %)'], [20, 30, 'steep (20–30 %)'], [30, 1e9, 'very steep (over 30 %)']];
  const classes = cls.map(([lo, hi, label]) => { const n = slopes.filter((s) => s >= lo && s < hi).length; return { label, acres: Number((n * cellAc).toFixed(2)), share: Math.round(100 * n / slopes.length) }; });
  const mean = slopes.reduce((s, v) => s + v, 0) / slopes.length;
  const sorted = slopes.slice().sort((a, b) => a - b), median = sorted[Math.floor(sorted.length / 2)];
  const oct = new Array(8).fill(0); aspects.forEach((a) => { oct[Math.round(a / 45) % 8]++; });
  const octName = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const dom = oct.indexOf(Math.max.apply(null, oct));
  return {
    samples: zn, spacingM: Number(dd.toFixed(1)), lowFt: m2ft(zmin), highFt: m2ft(zmax), meanFt: m2ft(zsum / zn), reliefFt: m2ft(zmax - zmin),
    meanSlope: Number(mean.toFixed(1)), medianSlope: Number(median.toFixed(1)), classes, aspect: octName[dom], aspectShare: Math.round(100 * oct[dom] / aspects.length),
    gentleAcres: classes[0].acres, buildableAcres: Number((classes[0].acres + classes[1].acres).toFixed(2)), areaAcres: Number((areaM2 / 4046.856).toFixed(2)),
  };
}

// —— NRCS Soil Data Access: the full tabular record for the map unit under the point ——
async function soilsSDA(site) {
  const sql = "SELECT TOP 4 m.mukey, m.musym, m.muname, c.compname, c.comppct_r, c.majcompflag, c.drainagecl, c.hydgrp, c.taxorder, c.slope_r, c.runoff, c.corcon, c.corsteel, a.brockdepmin, a.wtdepannmin, a.flodfreqdcd, a.pondfreqprs, a.aws0150wta, a.niccdcd, a.engdwobdcd, a.engdwbdcd, a.engstafdcd, a.englrsdcd, a.engcmssdcd, a.hydclprs FROM mapunit m INNER JOIN component c ON c.mukey=m.mukey INNER JOIN muaggatt a ON a.mukey=m.mukey WHERE m.mukey IN (SELECT * FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('point(" + site.cx + " " + site.cy + ")')) ORDER BY c.comppct_r DESC";
  const j = await postJson(R_SDA, { query: sql, format: 'JSON+COLUMNNAME' }, REQ_MS);
  const t = j.Table || []; if (t.length < 2) return [];
  const cols = t[0], row = {}; cols.forEach((c, i) => { row[c] = t[1][i]; });
  const rows = [];
  rows.push(['Soil map unit (NRCS SSURGO)', clean(row.muname) + ' · ' + row.musym + ' · mukey ' + row.mukey, 'sda_unit']);
  const comps = t.slice(1).map((r) => { const o = {}; cols.forEach((c, i) => { o[c] = r[i]; }); return o; }).filter((o) => o.compname);
  if (comps.length) rows.push(['Components', comps.map((o) => clean(o.compname) + ' ' + o.comppct_r + ' %').join(' · '), 'sda_comps']);
  const maj = comps.find((o) => /yes/i.test(o.majcompflag || '')) || comps[0];
  if (maj) {
    if (maj.drainagecl) rows.push(['Drainage class', clean(maj.drainagecl), 'sda_drain']);
    if (maj.hydgrp) rows.push(['Hydrologic group', maj.hydgrp + ' — ' + ({ A: 'low runoff, high infiltration', B: 'moderate infiltration', C: 'slow infiltration', D: 'very slow infiltration, high runoff' }[String(maj.hydgrp).charAt(0)] || ''), 'sda_hydgrp']);
    if (maj.taxorder) rows.push(['Soil order', clean(maj.taxorder), 'sda_order']);
    if (maj.slope_r != null) rows.push(['Representative slope of the unit', maj.slope_r + ' %', 'sda_slope']);
    if (maj.runoff) rows.push(['Runoff', clean(maj.runoff), 'sda_runoff']);
    if (maj.corcon || maj.corsteel) rows.push(['Corrosion risk', 'concrete ' + (maj.corcon || '—').toLowerCase() + ' · steel ' + (maj.corsteel || '—').toLowerCase(), 'sda_corr']);
  }
  if (row.brockdepmin != null && row.brockdepmin !== '') rows.push(['Depth to bedrock (min)', row.brockdepmin + ' cm', 'sda_bedrock']);
  if (row.wtdepannmin != null && row.wtdepannmin !== '') rows.push(['Depth to water table (annual min)', row.wtdepannmin + ' cm', 'sda_wt']);
  if (row.flodfreqdcd) rows.push(['Flooding frequency', clean(row.flodfreqdcd), 'sda_flood']);
  if (row.pondfreqprs != null && row.pondfreqprs !== '') rows.push(['Ponding (% of unit)', row.pondfreqprs + ' %', 'sda_pond']);
  if (row.aws0150wta != null && row.aws0150wta !== '') rows.push(['Available water, top 150 cm', Number(row.aws0150wta).toFixed(1) + ' cm', 'sda_aws']);
  if (row.niccdcd) rows.push(['Non-irrigated capability class', String(row.niccdcd), 'sda_cap']);
  if (row.engdwobdcd) rows.push(['Dwellings without basements', clean(row.engdwobdcd), 'sda_dwell']);
  if (row.engdwbdcd) rows.push(['Dwellings with basements', clean(row.engdwbdcd), 'sda_dwellb']);
  if (row.engstafdcd) rows.push(['Septic tank absorption fields', clean(row.engstafdcd), 'sda_septic']);
  if (row.englrsdcd) rows.push(['Local roads and streets', clean(row.englrsdcd), 'sda_roads']);
  if (row.engcmssdcd) rows.push(['Shallow excavations', clean(row.engcmssdcd), 'sda_excav']);
  if (row.hydclprs != null && row.hydclprs !== '') rows.push(['Hydric soil (% of unit)', row.hydclprs + ' %', 'sda_hydric']);
  return rows;
}

export async function resolveDeep(q) {
  const t0 = Date.now();
  const { adapter, parcel, county } = await anchor(q);
  const site = siteFrom(q, parcel);
  const buckets = {}; SECTION_META.forEach(([id]) => { buckets[id] = []; });
  const state = county ? county.state : (adapter ? adapter.state : null);
  const tasks = [], secs = [], names = [];
  const srcs = FED_SOURCES.concat(state === 'CA' ? CA_SOURCES : []);
  for (const s of srcs) { names.push(s.svc + '/' + s.layer); secs.push(s.sec); tasks.push(() => runSource(s, site, s.root)); }
  if (state === 'CA') for (const r of CA_RASTERS) { names.push(r.svc); secs.push(r.sec); tasks.push(() => identifyRaster(r, site)); }
  names.push('sda'); secs.push('ground'); tasks.push(() => soilsSDA(site));
  let terrain = null;
  names.push('3dep-grid'); secs.push('terrain'); tasks.push(async () => { terrain = await terrainGrid(site); return []; });
  if (county && (!adapter || !adapter.sources.length)) {
    if (county.tract) buckets.districts.push(['Census tract', county.tract, 'tract']);
    if (county.congress) buckets.districts.push(['US Congress', county.congress, 'congress']);
    if (county.senate) buckets.districts.push(['State Senate', county.senate, 'senate']);
    if (county.assembly) buckets.districts.push(['State House / Assembly', county.assembly, 'assembly']);
  }
  const done = await runAll(tasks, BUDGET_MS - (Date.now() - t0));
  done.forEach((r, i) => { if (r.ok && Array.isArray(r.value)) r.value.forEach((row) => buckets[secs[i]].push(row)); });
  const answered = done.filter((v) => v.ok).length, late = done.filter((v) => v.late).length;
  const diag = q.debug ? done.map((r, i) => [names[i], r.ok ? 'ok' : (r.late ? 'late' : 'error: ' + r.error), r.ms || null]) : undefined;

  if (terrain) {
    const t = terrain;
    buckets.terrain.push(['Elevation range', fmtN(t.lowFt) + '–' + fmtN(t.highFt) + ' ft · mean ' + fmtN(t.meanFt) + ' ft', 'elev']);
    buckets.terrain.push(['Relief across the parcel', t.reliefFt + ' ft', 'relief']);
    buckets.terrain.push(['Slope', 'mean ' + t.meanSlope + ' % · median ' + t.medianSlope + ' %', 'slope']);
    t.classes.forEach((c, i) => buckets.terrain.push([i === 0 ? 'Slope classes' : '', c.label + ': ' + c.acres + ' ac (' + c.share + ' %)', 'slope_' + i]));
    buckets.terrain.push(['Ground under 20 % slope', t.buildableAcres + ' ac of ' + t.areaAcres + ' — the usual envelope for building pads, septic fields and driveways before setbacks and hazards are taken out', 'buildable']);
    buckets.terrain.push(['Dominant aspect', t.aspect + '-facing (' + t.aspectShare + ' % of the ground)', 'aspect']);
    buckets.terrain.push(['Sampling', t.samples + ' points on a ' + t.spacingM + ' m grid · USGS 3DEP 1 m lidar', 'sampling']);
  }

  const flags = [];
  const flat = [].concat.apply([], SECTION_META.map(([id]) => buckets[id]));
  const find = (k) => { const r = flat.find((x) => x[2] === k); return r ? String(r[1]) : ''; };
  if (/Special Flood Hazard Area on the parcel/.test(find('nfhl')) && !/no Special/.test(find('nfhl'))) flags.push({ level: 'watch', key: 'nfhl', text: 'FEMA’s own layer puts part of the parcel in a Special Flood Hazard Area (' + find('nfhl').split(' — ')[0] + ').' });
  if (terrain && terrain.classes[3].share >= 40) flags.push({ level: 'watch', key: 'steep', text: Math.round(terrain.classes[3].share) + ' % of the parcel is steeper than 30 % — grading, retaining and geotechnical costs will shape the site plan; ' + terrain.buildableAcres + ' ac lies under 20 %.' });
  if (terrain && terrain.buildableAcres > 0 && terrain.classes[3].share < 40) flags.push({ level: 'good', key: 'buildable', text: terrain.buildableAcres + ' ac of ' + terrain.areaAcres + ' is under 20 % slope — ' + (terrain.aspect + '-facing') + ' ground, ' + terrain.reliefFt + ' ft of relief.' });
  if (/Very limited/i.test(find('sda_septic'))) flags.push({ level: 'watch', key: 'sda_septic', text: 'NRCS rates the soil "very limited" for septic absorption fields — expect an engineered system or a mound.' });
  const pga = parseFloat(find('pga475')); if (isFinite(pga) && pga >= 0.5) flags.push({ level: 'note', key: 'pga', text: 'Strong expected shaking: ' + pga.toFixed(2) + ' g peak ground acceleration at the 475-year level — design-level seismic detailing, not a reason to walk away in this county.' });
  if (/yes/.test(find('apsi'))) flags.push({ level: 'note', key: 'apsi', text: 'A fault investigation nearby found a fault — read the report before siting anything on a lineament.' });
  if (late) flags.push({ level: 'note', key: 'late', text: late + ' state/federal sources did not answer within the time budget — refresh to fill them in.' });

  const sections = SECTION_META.map(([id, label]) => ({ id, label, rows: buckets[id] })).filter((s) => s.rows.length);
  return {
    part: 'deep', apn: parcel && adapter ? adapter.identity(parcel.attributes).apnPretty : null, center: [site.cy, site.cx],
    county: county ? Object.assign({}, county, { adapter: adapter ? adapter.id : null }) : null,
    flags, sections, terrain,
    sourcesQueried: tasks.length, sourcesAnswered: answered, sourcesLate: late, partial: late > 0,
    resolvedAt: new Date().toISOString(), ms: Date.now() - t0, diag,
  };
}

// the anchor alone (APN search / fly-to): parcel identity + geometry in well under a second
export async function resolveParcel(q) {
  const t0 = Date.now();
  const { adapter, parcel, county } = await anchor(q);
  const site = siteFrom(q, parcel);
  const rec = adapter && parcel ? adapter.identity(parcel.attributes) : { apnPretty: null, apn10: null, situs: null, acreage: null };
  const acresGis = site.rings ? site.rings.reduce((s, r) => s + ringAreaM2(r, site.cy), 0) / 4046.856 : null;
  return { apn: rec.apnPretty, apn10: rec.apn10, situs: rec.situs, acreage: rec.acreage != null ? rec.acreage : (acresGis != null ? Number(acresGis.toFixed(2)) : null),
    center: [site.cy, site.cx], bbox: site.bbox, geometry: site.rings ? { rings: site.rings } : null,
    county: county ? Object.assign({}, county, { adapter: adapter ? adapter.id : null }) : null, ms: Date.now() - t0 };
}

// merge core + deep into one record (used by ?part=all and by the compare view)
export function mergeRecord(core, deep) {
  if (!deep) return core;
  const secs = SECTION_META.map(([id, label]) => {
    const rows = [].concat((core.sections.find((s) => s.id === id) || { rows: [] }).rows, (deep.sections.find((s) => s.id === id) || { rows: [] }).rows);
    return { id, label, rows };
  }).filter((s) => s.rows.length);
  return Object.assign({}, core, { part: 'all', sections: secs, flags: core.flags.concat(deep.flags), terrain: deep.terrain,
    sourcesQueried: core.sourcesQueried + deep.sourcesQueried, sourcesAnswered: core.sourcesAnswered + deep.sourcesAnswered, sourcesLate: (core.sourcesLate || 0) + (deep.sourcesLate || 0), partial: core.partial || deep.partial, ms: Math.max(core.ms || 0, deep.ms || 0) });
}

// ---------------------------------------------------------------------------
//  THE READ — seven dimensions a buyer can compare across parcels. Every
//  number cites the row it came from (keys), nothing is an opinion.
// ---------------------------------------------------------------------------
export function readFrom(rec) {
  const flat = [].concat.apply([], (rec.sections || []).map((s) => s.rows));
  const get = (k) => { const r = flat.find((x) => x[2] === k); return r ? String(r[1]) : ''; };
  const has = (k) => !!flat.find((x) => x[2] === k);
  const dims = [];
  // 1 buildable area
  const t = rec.terrain;
  dims.push({ id: 'buildable', label: 'Buildable ground', value: t ? t.buildableAcres + ' ac under 20 %' : (has('slope_classes') ? get('slope_classes') : '—'), score: t ? Math.round(100 * Math.min(1, t.buildableAcres / Math.max(0.25, t.areaAcres))) : null, note: t ? 'of ' + t.areaAcres + ' ac · mean slope ' + t.meanSlope + ' % · ' + t.aspect + '-facing' : 'terrain grid not resolved', keys: ['buildable', 'slope', 'aspect'] });
  // 2 entitlement headroom
  const zoning = get('zoning'); const minAc = (() => { const m = /(\d+(?:\.\d+)?)\s*ac/i.exec(zoning + ' ' + get('zone_def')); return m ? parseFloat(m[1]) : null; })();
  const ac = rec.acreage || (t ? t.areaAcres : null);
  const splits = minAc && ac ? Math.floor(ac / minAc) : null;
  dims.push({ id: 'entitlement', label: 'Entitlement headroom', value: zoning ? zoning + (minAc ? ' · ' + minAc + ' ac minimum' : '') : (get('genplan') || '—'), score: splits != null ? Math.min(100, splits * 25) : null, note: splits != null ? (splits >= 2 ? 'acreage would support ' + splits + ' lots at the zoning minimum (subject to plan, access, water and septic)' : splits === 1 ? 'one lot at the zoning minimum — no split' : 'below the zoning minimum lot size') : (get('genplan') ? get('genplan') + (get('williamson').startsWith('Under') ? ' · Williamson Act' : '') : 'zoning not resolved'), keys: ['zoning', 'zone_def', 'genplan', 'williamson', 'soar'] });
  // 3 hazard load
  const hz = [['fire_sev', /very high|high/i, 'fire'], ['flood100', /^Zone /, 'flood'], ['nfhl', /Special Flood Hazard Area on/, 'FEMA SFHA'], ['apzone', /Inside/, 'Alquist-Priolo'], ['liq', /touches/, 'liquefaction'], ['landslide', /touches/, 'landslide'], ['eqls', /touches/, 'EQ-induced landslide'], ['ls_susc', /high/i, 'high landslide susceptibility'], ['subsidence', /Inside/, 'subsidence'], ['dam', /Inside/, 'dam inundation'], ['tsunami', /Inside/, 'tsunami']];
  const hits = hz.filter(([k, re]) => re.test(get(k))).map((x) => x[2]);
  const anyHz = hz.some(([k]) => has(k));
  dims.push({ id: 'hazards', label: 'Hazard load', value: !anyHz ? '—' : hits.length ? hits.join(' · ') : 'no mapped hazard on the parcel', score: anyHz ? Math.max(0, 100 - hits.length * 20) : null, note: (get('pga475') ? 'PGA ' + get('pga475').split(' ')[0] + ' (475-yr)' : '') + (get('fires') && !/No recorded/.test(get('fires')) ? ' · fires on record' : ''), keys: hz.map((x) => x[0]) });
  // 4 water
  const wl = get('waterline'), sw = get('sewer'), gw = get('gw_basin');
  const wscore = (/No public water/.test(wl) ? 0 : 40) + (/No public sewer/.test(sw) ? 0 : 20) + (/Outside/.test(gw) || !gw ? 10 : 30) + (has('streams') && !/No county/.test(get('streams')) ? 10 : 0);
  dims.push({ id: 'water', label: 'Water', value: (/No public water/.test(wl) ? 'no public water line' : wl ? 'public water nearby' : '—') + ' · ' + (/No public sewer/.test(sw) ? 'septic' : sw ? 'sewer nearby' : '—'), score: wl || sw ? Math.min(100, wscore) : null, note: [gw, get('gsa'), get('wells_water')].filter(Boolean).join(' · '), keys: ['waterline', 'sewer', 'gw_basin', 'gsa', 'wells_water', 'streams', 'nhd'] });
  // 5 access & utilities
  const road = get('road');
  dims.push({ id: 'access', label: 'Access & utilities', value: road ? road.split(' · ').slice(0, 2).join(' · ') : '—', score: road ? (/No public road/.test(road) ? 25 : /on the parcel|~\d+ m/.test(road) ? 90 : 60) : null, note: [get('transmission') ? 'transmission line within 1 km' : '', get('comms') ? get('comms') + ' comms facilities within 2 mi' : '', get('county_ease')].filter(Boolean).join(' · ') || 'recorded easements are in the deed, not GIS', keys: ['road', 'private_st', 'transmission', 'county_ease'] });
  // 6 value signal
  const total = get('total_value'), land = get('land_value'), per = get('value_per_ac'), dd = get('doc_date');
  dims.push({ id: 'value', label: 'Value signal', value: total ? total + ' assessed' : '—', score: null, note: [land ? 'land ' + land : '', per ? per + '/ac' : '', dd ? 'last document ' + dd : ''].filter(Boolean).join(' · '), keys: ['total_value', 'land_value', 'value_per_ac', 'doc_date', 'doc_nr'] });
  // 7 change over time
  dims.push({ id: 'change', label: 'Change over time', value: (rec.records || []).length ? (rec.records.length + ' recorded maps, ' + (rec.records[rec.records.length - 1].year || '') + ' → ' + (rec.records[0].year || '')) : '—', score: null, note: (get('fires') && !/No recorded/.test(get('fires')) ? get('fires') : '') + (get('bldg_imagery') ? ' · footprints traced ' + get('bldg_imagery') : ''), keys: ['fires', 'fire_recent', 'bldg_imagery', 'bldg_count'] });
  return dims;
}
