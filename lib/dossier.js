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

import { readFile } from 'node:fs/promises';
import { readJson as storeRead, cached as storeCached } from './store.js';
import { providerTitle, sosEntity } from './providers.js';

export const VC_AGS = 'https://maps.ventura.org/arcgis/rest/services/';
export const RECORDMAP_BASE = 'https://maps.ventura.org/recordmaps/';
export const R_CGS = 'https://gis.conservation.ca.gov/server/rest/services/';
export const R_FEMA = 'https://hazards.fema.gov/arcgis/rest/services/';
export const R_NHD = 'https://hydro.nationalmap.gov/arcgis/rest/services/';
export const R_QF = 'https://earthquake.usgs.gov/arcgis/rest/services/';
export const R_BLM = 'https://gis.blm.gov/arcgis/rest/services/';
export const R_LA = 'https://public.gis.lacounty.gov/public/rest/services/';
export const R_USGS_AGOL = 'https://services.arcgis.com/v01gqwM5QqNysAAi/arcgis/rest/services/';   // USGS on ArcGIS Online: PAD-US 4.1, MRDS
export const R_MLRS = 'https://gis.blm.gov/nlsdb/rest/services/';                                    // BLM MLRS hub: mining claims
export const R_VCROLL2018 = 'https://services5.arcgis.com/umIjvohPcWJU5ij6/arcgis/rest/services/';  // public copy of the Nov-2018 Ventura assessor roll (owner names, sale dates, base years)
export const R_OSWCR = 'https://utility.arcgis.com/usrsvcs/servers/c074ca40fd684e41babd776eebefd009/rest/services/';  // DWR Online System for Well Completion Reports
export const R_CEC = 'https://services3.arcgis.com/bWPjFyq029ChCGur/arcgis/rest/services/';        // California Energy Commission (utility service territories)
export const R_LADRP = 'https://arcgis.gis.lacounty.gov/arcgis/rest/services/';                     // LA County Regional Planning open data
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

// one spatial query against an ArcGIS layer — a MapServer by default; a service written
// '<name>/FeatureServer' (hosted feature layers on ArcGIS Online, the BLM hub) is used as given
export async function agsQuery(root, service, layer, geometry, opts = {}) {
  const url = root + service + (/\/(Map|Feature)Server$/.test(service) ? '' : '/MapServer') + '/' + layer + '/query';
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
  ['title',      'Ownership & title'],
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
  { sec: 'access', svc: 'SDs/CriticalFacilities', layer: 0, dist: 20000, near: 1, max: 40, hit: (a, n, x) => { const q = x.nearest[0]; if (!q) return []; const t = q.f.attributes; const ag = { VNC: 'Ventura County Fire', LPF: 'US Forest Service (Los Padres)', VEN: 'Ventura City Fire', OXN: 'Oxnard Fire', FIL: 'Fillmore Fire', SPA: 'Santa Paula Fire' }[t.AGENCY_COD] || clean(t.AGENCY_COD) || 'Fire'; return [['Nearest fire station', ag + ' · Station ' + (t.STATION_NU || t.STATION_LA || '') + ' · ' + near(q.m) + ' (straight line)', 'fire_station']]; }, miss: () => [['Nearest fire station', 'None within 20 km in the county facilities layer', 'fire_station']] },
  { sec: 'access', svc: 'SDs/CriticalFacilities', layer: 1, dist: 40000, near: 1, max: 40, hit: (a, n, x) => { const q = x.nearest[0]; if (!q) return []; const t = q.f.attributes; return [['Nearest hospital', clean(t.HOSP_NAM || t.NAME || 'hospital') + (t.CITY ? ', ' + clean(t.CITY) : '') + ' · ' + near(q.m) + ' (straight line)', 'hospital']]; } },
  { sec: 'access', svc: 'SDs/IWMDServiceAreasPublic', layer: 0, hit: (a) => [['Trash & recycling service area (county IWMD)', clean(a.SERVICEAREANAME) + (a.SERVICEAREANUMBER ? ' · area ' + a.SERVICEAREANUMBER : ''), 'hauler']] },

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
  if (a.CL) val.push(['Assessor class code', a.CL + (a.QC ? ' · qual ' + a.QC : ''), 'class']);
  return { apnPretty, apn10: a.APN10 || null, situs: clean(a.SITUS) || null, acreage: a.ACREAGE ? parseFloat(a.ACREAGE) : null, id, val };
}

// —— ownership & title: the live roll (documents, sale price, value transfer) read against the
//    public November-2018 copy of the same roll, which carries the owner names the county now
//    withholds from its GIS. Together they give an honest, dated chain: who held it on the 2018
//    roll, when it last sold and for how much, and whether a newer document has moved it since.
const DOC_TYPES = { D: 'deed', GD: 'grant deed', QD: 'quitclaim deed', AT: 'affidavit — death of trustee', AJ: 'affidavit — death of joint tenant', AD: 'administrator’s deed', ED: 'executor’s deed', TS: 'trustee’s deed (foreclosure sale)', TX: 'tax deed', FC: 'foreclosure', SD: 'sheriff’s deed', ID: 'interspousal deed', TD: 'trust transfer deed' };
const docDesc = (t) => { const c = clean(t) || ''; return c ? (DOC_TYPES[c] ? DOC_TYPES[c] + ' (' + c + ')' : 'document type ' + c + ' as coded on the roll') : 'document'; };
const DTT_RATE = 1.10;   // documentary transfer tax, $ per $1,000 of price (county rate; cities may add their own)
const baseYear = (v) => { const m = /^(\d{2})(\d{2})/.exec(String(v || '').trim()); if (!m) return null; const y = Number(m[1]); return ((y >= 50 ? 1900 : 2000) + y) + '/' + m[2] + (/\*/.test(String(v)) ? ' (*)' : ''); };
const nameish = (n1, n2) => {
  const fix = (x) => titleish(clean(x) || '').replace(/\bTr\b/g, 'Trust').replace(/\bTrs\b/g, 'Trustees').replace(/\bEst\b/g, 'Estate').replace(/\bEt Al\b/g, 'et al.').replace(/\bLlc\b/g, 'LLC').replace(/\bInc\b/g, 'Inc.').replace(/\bAdm\b/g, 'Administrator');
  const a = fix(n1), b = clean(n2) || '';
  if (!a) return null;
  if (/^ATTN\b/i.test(b)) return a + ' (attn ' + fix(b.replace(/^ATTN:?\s*/i, '')) + ')';
  return b ? a + ' · ' + fix(b) : a;
};
async function venturaTitle(a, site) {
  const rows = [];
  const apn10 = String(a.APN10 || site.apn10 || '').replace(/[^0-9]/g, '');
  let snap = null;
  if (apn10) { try { const fs = await agsQuery(R_VCROLL2018, 'Ventura_County_Parcels/FeatureServer', 0, null, { where: "APN10='" + apn10 + "'", max: 1 }); snap = fs.length ? fs[0].attributes : null; } catch (e) { snap = null; } }
  const liveDoc = clean(a.DOC_NR) || '', liveDate = ymd(a.DOC_DT), liveType = clean(a.DOC_TYPE) || '';
  const sp = num(a.SP);
  const snapDoc = snap ? (clean(snap.DOC_NR) || '') : '';
  const sameDoc = !!(snap && snapDoc && liveDoc && snapDoc.replace(/^0+/, '') === liveDoc.replace(/^0+/, ''));
  const owner = snap ? nameish(snap.NAME_1, snap.NAME_2) : null;
  const cityish = (v) => titleish(clean(v) || '').replace(/\s+([A-Z][a-z])$/, (m, st) => ', ' + st.toUpperCase());
  if (owner) rows.push(['Owner on the 2018 assessor roll', owner + (clean(snap.CTY_STA) ? ' · mailing address in ' + cityish(snap.CTY_STA) : ''), 'owner_2018']);
  if (snap && sameDoc) rows.push(['Owner of record today', 'No newer document on the roll since the 2018 snapshot — the 2018 name is, in all likelihood, still the owner of record (the county publishes the current name through its assessor search, not its GIS)', 'owner_now']);
  else if (snap) rows.push(['Owner of record today', 'Changed or re-titled after the 2018 snapshot: the roll’s last document is a ' + docDesc(liveType) + ' ' + liveDoc + (liveDate ? ' of ' + liveDate : '') + ' — the grantee on that document is the current owner (assessor search, or the Recorder’s grantor/grantee index)', 'owner_now']);
  else rows.push(['Owner of record', 'Not published on the county’s public GIS — the assessor search and the Recorder’s index carry it (see Where to look)', 'owner_now']);
  if (liveDoc) rows.push(['Last recorded document (live roll)', docDesc(liveType) + ' · ' + liveDoc + (liveDate ? ' · ' + liveDate : ''), 'doc_nr']);
  const vt = ymd(a.DT_V_TRF_Y); if (vt) rows.push(['Date of value transfer (last reassessment event)', vt, 'value_transfer']);
  const dts = snap ? num(String(snap.DTS || '').trim()) : null;
  const implied = dts ? Math.round(dts / DTT_RATE * 1000) : null;
  const saleDate = snap ? ymd(snap.DT_SALE) : null;
  const spMatches = !!(sp && implied && Math.abs(implied - sp) < 2);
  if (sp) rows.push(['Sale price on the roll', money(sp) + (spMatches ? ' — the ' + (saleDate || 'earlier') + ' sale (documentary transfer tax $' + dts.toFixed(2) + ' at $' + DTT_RATE.toFixed(2) + ' per $1,000)' + (sameDoc ? '' : '; the later document was not a sale') : (liveDate ? ' — recorded with the ' + liveDate + ' document' : '')), 'sale_price']);
  else if (implied) rows.push(['Sale price on the roll', 'None carried on the live roll; the last arm’s-length sale on the 2018 snapshot was ' + (saleDate || 'undated') + ' at ≈' + money(implied) + ' (from the documentary transfer tax of $' + dts.toFixed(2) + ')', 'sale_price']);
  else rows.push(['Sale price on the roll', 'None — the last document was not a sale (a trust, family or entity transfer), or the sale predates the roll’s price field', 'sale_price']);
  const ev = [];
  const d8 = (v) => /^\d{8}$/.test(String(v || '')) ? String(v) : null;
  if (snap && d8(snap.DT_SALE)) ev.push({ d: d8(snap.DT_SALE), t: 'sale' + (implied ? ' · ≈' + money(implied) : '') + (d8(snap.DOC_DT) === d8(snap.DT_SALE) && snapDoc ? ' · ' + docDesc(snap.DOC_TYPE) + ' ' + snapDoc + (owner ? ' → ' + owner : '') : '') });
  if (snap && snapDoc && d8(snap.DOC_DT) && d8(snap.DOC_DT) !== d8(snap.DT_SALE)) ev.push({ d: d8(snap.DOC_DT), t: docDesc(snap.DOC_TYPE) + ' · ' + snapDoc + (owner ? ' → ' + owner + ' (owner on the 2018 roll)' : '') });
  if (liveDoc && !sameDoc && d8(a.DOC_DT)) ev.push({ d: d8(a.DOC_DT), t: docDesc(liveType) + ' · ' + liveDoc + (sp && !spMatches ? ' · sale ' + money(sp) : ' · change in ownership, not a recorded sale price') });
  ev.sort((x, y) => x.d.localeCompare(y.d));
  ev.forEach((e, i) => rows.push([i ? '' : 'Title timeline (public roll)', ymd(e.d) + ' — ' + e.t, 'chain' + i]));
  if (!ev.length) rows.push(['Title timeline (public roll)', 'No dated transfer on the public roll', 'chain0']);
  if (snap && baseYear(snap.BSE_YR)) rows.push(['Prop 13 base year', baseYear(snap.BSE_YR) + ' on the 2018 roll' + (!sameDoc && vt ? ' — reset by the ' + vt + ' change in ownership' : ''), 'base_year']);
  if (snap) { const l18 = num(snap.L_V) || 0, i18 = num(snap.I_V) || 0, ln = num(a.L_V) || 0, inn = num(a.I_V) || 0; if (l18 + i18 > 0 && ln + inn > 0) rows.push(['Assessed value, 2018 roll → today', money(l18 + i18) + ' → ' + money(ln + inn) + ' (' + (ln + inn >= l18 + i18 ? '+' : '') + Math.round(100 * ((ln + inn) / (l18 + i18) - 1)) + ' %)', 'value_change']); }
  if (snap && clean(snap.EXMP_CD1)) rows.push(['Exemptions on the 2018 roll', (clean(snap.EXMP_CD1) === 'HO' ? 'Homeowner’s exemption — owner-occupied at the time' : 'code ' + clean(snap.EXMP_CD1)) + (num(snap.EXMP_V1) ? ' · ' + money(snap.EXMP_V1) : ''), 'exemption']);
  if (snap && clean(snap.SITE_USE)) rows.push(['Assessor site-use code', clean(snap.SITE_USE) + ' (2018 roll)', 'use_code']);
  rows.push(['About these rows', 'Live rows come from the county’s parcel layer (maps.ventura.org, updated continuously; the county withholds owner names there). The 2018 rows come from a public copy of the county roll on ArcGIS Online (262,354 parcels, November 2018). Names are as printed on the roll. Deeds, deeds of trust, liens, notices of default and easements are indexed at the Clerk-Recorder by name, and the tax bill (paid or delinquent) at the Tax Collector by APN — see Where to look.', 'title_note']);
  return rows;
}

// —— title evidence: a purchased property report imported for this APN (lib/title-report.js) ——
//    Kept in data/title/<apn10>.json. Two copies can exist: the one bundled with the deployment
//    and a newer one written to the repository since (data-only commits do not redeploy); the
//    later `importedAt` wins. Nothing here is fetched from a vendor at request time.
export const evidencePath = (apn10) => 'data/title/' + String(apn10 || '').replace(/[^0-9]/g, '') + '.json';
export async function loadEvidence(apn10) {
  const p = String(apn10 || '').replace(/[^0-9]/g, '');
  if (!p) return null;
  const path = evidencePath(p);
  let local = null, remote = null;
  try { local = JSON.parse(await readFile(new URL('../' + path, import.meta.url), 'utf8')); } catch { local = null; }
  try { remote = await storeRead(path, null, 300000); } catch { remote = null; }
  const pick = [local, remote].filter((e) => e && e.apn10 === p).sort((a, b) => String(b.importedAt || '').localeCompare(String(a.importedAt || '')))[0] || null;
  return pick;
}
const isoLong = (iso) => { if (!iso) return null; const d = new Date(String(iso).slice(0, 10) + 'T12:00:00Z'); return isNaN(d) ? null : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }); };
const ageOf = (iso) => { if (!iso) return null; const m = Math.round((Date.now() - new Date(String(iso).slice(0, 10) + 'T00:00:00Z')) / (30.44 * 86400000)); return m < 1 ? 'this month' : m < 24 ? m + ' month' + (m === 1 ? '' : 's') + ' old' : (m / 12).toFixed(1).replace(/\.0$/, '') + ' years old'; };
const sinceOf = (iso) => { if (!iso) return null; const m = Math.round((Date.now() - new Date(String(iso).slice(0, 10) + 'T00:00:00Z')) / (30.44 * 86400000)); return m < 1 ? 'less than a month' : m < 24 ? m + ' month' + (m === 1 ? '' : 's') : (m / 12).toFixed(1).replace(/\.0$/, '') + ' years'; };
const lowerish = (v) => String(v || '').toLowerCase();
const ownerish = (name) => nameish(name, null) || String(name || '');

// The Ownership & title rows, owner first, with the evidence (when there is any) merged into the
// roll's own rows: names, mailing address, the timeline, loans, liens, taxes, permits, the vendor
// estimate, and one honest line about how old each source is. `roll` = what the county's live
// layer said (document number and date, so the two can be reconciled).
export function composeTitle(rollRows, ev, roll, prov) {
  const rows = rollRows.slice();
  const out = [];
  const take = (k) => { const i = rows.findIndex((r) => r[2] === k); return i >= 0 ? rows.splice(i, 1)[0] : null; };
  const takeAll = (re) => { const got = rows.filter((r) => re.test(String(r[2] || ''))); got.forEach((g) => rows.splice(rows.indexOf(g), 1)); return got; };
  const rollOwnerNow = take('owner_now'), rollOwner2018 = take('owner_2018'), rollDoc = take('doc_nr'), rollSale = take('sale_price'), rollVt = take('value_transfer');
  const rollChain = takeAll(/^chain\d+$/);
  const rest = rows;   // base_year, value_change, exemption, use_code, title_note, parcel_created …
  const src = ev ? ev.source || {} : {};
  const when = ev ? (src.preparedOn || String(ev.importedAt || '').slice(0, 10)) : null;
  const stamp = ev ? (src.provider || 'imported') + ' report' + (when ? ' of ' + isoLong(when) : '') : null;
  const stripZeros = (d) => String(d || '').replace(/[^0-9]/g, '').replace(/^0+/, '');
  // the county prefixes its instrument numbers with the year (2024000052341); a report prints the bare serial (0000052341)
  const sameDoc = (x, y) => { const a = stripZeros(x), b = stripZeros(y); return !!(a && b && a.length >= 5 && b.length >= 5 && (a === b || a.endsWith(b) || b.endsWith(a))); };

  // 1 · owner of record
  if (ev && ev.owner && ev.owner.names && ev.owner.names.length) {
    const names = ev.owner.names.map(ownerish).join(' & ');
    const deed = ev.deed || {};
    const first = (ev.timeline || []).find((t) => /GRANT DEED|DEED$|QUITCLAIM|TRUST TRANSFER|INTERSPOUSAL/i.test(t.type || '') && !/DEED OF TRUST/i.test(t.type || ''));
    let verdict = names + (ev.owner.company ? ' (a company' : ' (') + (ev.owner.occupied === false ? ', not owner-occupied)' : ev.owner.occupied ? ', owner-occupied)' : ')');
    if (first) verdict += ' — grantee on the ' + lowerish(first.type) + ' of ' + isoLong(first.date);
    if (deed.document) verdict += (first ? ', recorded ' : ' — deed recorded ') + (deed.recorded ? isoLong(deed.recorded) : '') + ' as document ' + deed.document;
    verdict += ' · ' + stamp;
    if (roll && roll.doc && deed.document && sameDoc(roll.doc, deed.document)) verdict += ' · confirmed by the live county roll, whose last document is this same instrument';
    else if (roll && roll.doc && roll.date8 && deed.recorded && roll.date8 > deed.recorded.replace(/-/g, '')) verdict += ' · ⚠ the live county roll carries a NEWER document (' + roll.desc + ' ' + roll.doc + ' of ' + ymd(roll.date8) + ') — this name may already be out of date; the grantee on that document is the owner of record';
    else if (roll && roll.doc) verdict += ' · the live county roll’s last document (' + roll.doc + (roll.date8 ? ' of ' + ymd(roll.date8) : '') + ') predates this deed — the roll had not caught up when read, or the numbers differ in form';
    out.push(['Owner of record', verdict, 'owner_now']);
    if (ev.owner.mailing) out.push(['Owner’s mailing address', ev.owner.mailing + ' (as printed on the report)', 'owner_mailing']);
    if (first && first.date) out.push(['Held since', isoLong(first.date) + ' — ' + sinceOf(first.date) + ' as of today', 'owner_since']);
  } else if (rollOwnerNow) out.push(rollOwnerNow);
  if (prov && prov.rows) prov.rows.forEach((r) => out.push(r));
  if (rollDoc) out.push(rollDoc);

  // 2 · the last sale
  if (ev && ev.values && ev.values.lastSaleAmount) {
    const t = (ev.timeline || []).find((x) => x.price && x.date === ev.values.lastSaleDate) || (ev.timeline || []).find((x) => x.price);
    out.push(['Last sale', money(ev.values.lastSaleAmount) + (ev.values.lastSaleDate ? ' on ' + isoLong(ev.values.lastSaleDate) : '') + (t ? ' — ' + lowerish(t.type) + ' to ' + ownerish(t.party) : '') + ' · ' + stamp + (rollSale && /^\$/.test(String(rollSale[1])) && stripZeros(String(rollSale[1]).split(' ')[0]) !== stripZeros(money(ev.values.lastSaleAmount)) ? ' · the live roll carries ' + String(rollSale[1]).split(' — ')[0] : ''), 'sale_price']);
  } else if (rollSale) out.push(rollSale);
  if (rollVt) out.push(rollVt);

  // 3 · the timeline, merged: every dated event from the report, plus roll events it does not already carry
  const events = [];
  if (ev) {
    (ev.timeline || []).forEach((t) => { if (!t.date) return; if (/DEED OF TRUST/i.test(t.type || '') && (ev.loans || []).some((l) => l.date === t.date)) return; events.push({ d: t.date.replace(/-/g, ''), t: lowerish(t.type || 'document') + (t.party ? ' · ' + ownerish(t.party) : '') + (t.price ? ' · ' + money(t.price) : '') + ' (report)' }); });
    if (ev.deed && ev.deed.recorded && ev.deed.document) events.push({ d: ev.deed.recorded.replace(/-/g, ''), t: 'recorded as document ' + ev.deed.document + (ev.deed.grantee ? ' → ' + ownerish(ev.deed.grantee) : '') + ' (report)' });
    (ev.loans || []).forEach((l) => { if (l.date) events.push({ d: l.date.replace(/-/g, ''), t: 'loan ' + (money(l.amount) || '') + (l.lender ? ' from ' + ownerish(l.lender) : '') + (l.loanType ? ' · ' + lowerish(l.loanType) : '') + ' (report)' }); });
  }
  rollChain.forEach((r) => {
    const m = /^([A-Z][a-z]+ \d{1,2}, \d{4}) — (.*)$/.exec(String(r[1]));
    if (!m) { events.push({ d: '00000000', t: String(r[1]) }); return; }
    const d8 = (() => { const dt = new Date(m[1] + ' 12:00:00 UTC'); return isNaN(dt) ? '00000000' : dt.toISOString().slice(0, 10).replace(/-/g, ''); })();
    const docNo = (/\b(\d{6,})\b/.exec(m[2]) || [])[1];
    const dup = events.some((e) => { const ed = (e.t.match(/document (\d+)/) || [])[1]; return (docNo && ed && sameDoc(ed, docNo)) || (Math.abs(Number(e.d) - Number(d8)) <= 7 && /sale|deed/.test(e.t) && /sale|deed/.test(m[2])); });
    if (!dup) events.push({ d: d8, t: m[2] + ' (county roll)' });
  });
  events.sort((x, y) => x.d.localeCompare(y.d));
  events.forEach((e, i) => out.push([i ? '' : 'Title timeline', (e.d === '00000000' ? '' : ymd(e.d) + ' — ') + e.t, 'chain' + i]));

  // 4 · loans, liens, judgments (report only — the county GIS has none of these)
  if (ev) {
    const loans = ev.loans || [];
    if (loans.length) loans.forEach((l, i) => out.push([i ? '' : 'Loans of record (' + loans.length + ', report)', [money(l.amount), l.lender ? ownerish(l.lender) : null, l.loanType ? lowerish(l.loanType) : null, l.lenderType ? lowerish(l.lenderType) : null, l.date ? isoLong(l.date) : null].filter(Boolean).join(' · ') + ' — recorded deeds of trust are released by reconveyance; whether each is still open is a title-company question', 'loan' + i]));
    else out.push(['Loans of record (report)', 'None listed by the report', 'loan0']);
    const liens = ev.liens || [];
    if (liens.length) liens.forEach((l, i) => out.push([i ? '' : 'Liens (' + liens.length + ', report · address-matched)', [l.type ? titleish(l.type) : 'lien', money(l.amount), l.filed ? 'filed ' + isoLong(l.filed) : null, l.creditor ? 'creditor ' + titleish(l.creditor) : null, l.court ? titleish(l.court) : null, l.caseNumber ? 'case ' + l.caseNumber : null, l.debtor ? 'debtor ' + l.debtor : null].filter(Boolean).join(' · ') + ' — matched to this address by the report, not necessarily to the title; a lien against a former occupant does not bind the land unless it was recorded against it. Verify under the case number at the Recorder', 'lien' + i]));
    else out.push(['Liens (report)', 'None found by the report against this address', 'lien0']);
    out.push(['Judgments · pre-foreclosures (report)', (Array.isArray(ev.judgments) ? (ev.judgments.length ? ev.judgments.length + ' judgment(s)' : 'no judgments found') : 'judgments: not read from this report') + ' · ' + (Array.isArray(ev.preForeclosures) ? (ev.preForeclosures.length ? ev.preForeclosures.length + ' pre-foreclosure notice(s)' : 'no pre-foreclosure notices found') : 'pre-foreclosures: not read from this report'), 'judgments']);
  }

  // 5 · taxes
  if (ev && ev.taxes && (ev.taxes.bill || ev.taxes.assessedTotal)) {
    const t = ev.taxes;
    out.push(['Tax bill (report)', [t.bill ? money(t.bill) + (t.year ? ' for the ' + t.year + ' roll year' : '') : null, t.assessedTotal ? 'assessed ' + money(t.assessedTotal) + (t.assessedLand ? ' (land ' + money(t.assessedLand) + (t.assessedImprovements ? ' + improvements ' + money(t.assessedImprovements) : '') + ')' : '') : null, t.rollUpdated ? 'roll updated ' + isoLong(t.rollUpdated) : null, t.exemption ? 'exemption ' + t.exemption : null].filter(Boolean).join(' · ') + (roll && roll.total && t.assessedTotal && Math.abs(roll.total - t.assessedTotal) > 1 ? ' · the live roll now carries ' + money(roll.total) + ' — the report is behind the county' : ''), 'tax_bill']);
    if (t.delinquent) out.push(['Tax delinquency (report)', 'Flagged delinquent for ' + t.delinquent + ' — confirm at the Tax Collector: unpaid taxes become a lien on the land, and after five years of default the county can sell the parcel', 'tax_delinquent']);
    else out.push(['Tax delinquency (report)', 'No delinquency flag on the report', 'tax_delinquent']);
    const h = ev.taxHistory || [];
    if (h.length >= 2) {
      const jump = h.slice(1).map((y, i) => ({ y: y.year, r: h[i].assessment ? y.assessment / h[i].assessment : 1 })).sort((a, b) => b.r - a.r)[0];
      out.push(['Tax history (report)', h[0].year + ' → ' + h[h.length - 1].year + ': tax ' + money(h[0].tax) + ' → ' + money(h[h.length - 1].tax) + ' · assessment ' + money(h[0].assessment) + ' → ' + money(h[h.length - 1].assessment) + (jump && jump.r > 1.5 ? ' · reassessed ×' + jump.r.toFixed(1) + ' in ' + jump.y + ' (a change in ownership resets the Prop 13 base)' : ' · Prop 13 2 %/yr steps only'), 'tax_history']);
    }
  }

  // 6 · permits
  if (ev && ev.permits && ev.permits.length) ev.permits.forEach((p, i) => out.push([i ? '' : 'Building permits (' + ev.permits.length + ', report)', [p.number, p.type ? titleish(p.type) : null, p.date ? isoLong(p.date) : null, p.status ? lowerish(p.status) : null, p.jobValue ? 'job value ' + money(p.jobValue) : null, p.fees ? 'fees ' + money(p.fees) : null].filter(Boolean).join(' · ') + (p.description ? ' — ' + p.description : ''), 'permit' + i]));

  // 7 · the vendor's estimate
  if (ev && ev.values && ev.values.marketEstimate) out.push(['Market value estimate (report)', money(ev.values.marketEstimate) + (ev.values.perSqFt ? ' · ' + money(ev.values.perSqFt) + '/sq ft' : '') + (ev.values.rentEstimate ? ' · rent estimate ' + money(ev.values.rentEstimate) + '/mo' : '') + ' — an automated valuation as of ' + (when ? isoLong(when) : 'the report date') + ', not an appraisal', 'market_estimate']);

  // 8 · the roll's remaining rows, then history and provenance
  rest.filter((r) => r[2] !== 'title_note').forEach((r) => out.push(r));
  if (rollOwner2018) out.push([rollOwner2018[0].replace('Owner on the 2018 assessor roll', 'Owner on the 2018 roll snapshot (history)'), rollOwner2018[1], 'owner_2018']);
  if (ev) out.push(['Evidence on file', stamp + (when ? ' (' + ageOf(when) + ')' : '') + (ev.importedAt ? ' · imported ' + isoLong(ev.importedAt) : '') + ' · the live county roll was read ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) + '. Names, loans and liens age: a report older than a year should be re-ordered before an offer, and a preliminary title report from a title company is the only thing a lender relies on.', 'title_source']);
  else out.push(['Evidence on file', 'No property report imported for this parcel — the public GIS carries no owner name, loans or liens. Order one (PropertyChecker, ATTOM, a title company) and import the PDF in editor mode; every row above then resolves per APN.', 'title_source']);
  const note = rest.find((r) => r[2] === 'title_note'); if (note) out.push(note);
  return out;
}

// building facts from a report land in the structures section
export function evidenceStructures(ev) {
  if (!ev || !ev.building || !Object.keys(ev.building).length) return [];
  const b = ev.building;
  const parts = [b.beds != null || b.baths != null ? (b.beds != null ? b.beds + ' bd' : '') + (b.baths != null ? (b.beds != null ? ' / ' : '') + b.baths + ' ba' : '') : null, b.sqft ? fmtN(b.sqft) + ' sq ft' : null, b.yearBuilt ? 'built ' + b.yearBuilt : null, b.stories ? b.stories + ' stor' + (b.stories === 1 ? 'y' : 'ies') : null, b.construction ? lowerish(b.construction) + ' frame' : null, b.garageSqft ? 'garage ' + fmtN(b.garageSqft) + ' sq ft' : null, b.fireplace ? 'fireplace' : null, b.heating ? 'heating: ' + lowerish(b.heating) : null, b.pool ? 'pool' : null].filter(Boolean);
  return parts.length ? [['Dwelling (report)', parts.join(' · ') + ' · ' + ((ev.source || {}).provider || 'imported') + ' report' + (ev.source && ev.source.preparedOn ? ' of ' + isoLong(ev.source.preparedOn) : ''), 'report_building']] : [];
}

// —— the county's own portals, deep-linked where the county allows it ——
function venturaPortals(rec) {
  const apn10 = rec.apn10 || '', situs = rec.situs || '';
  return [
    { group: 'county', label: 'Assessor · property search', url: 'https://assessor.venturacounty.gov/assessor-data/property-search/', method: 'post', fields: { apn: apn10 }, note: 'Owner of record today, use code, improvements, exemptions — opens the county search with this APN' },
    { group: 'county', label: 'Assessor · map book page', url: 'https://assessor.venturacounty.gov/assessor-data/assessor-maps/', method: 'post', fields: { searchType: 'apn', value: apn10 }, note: 'The assessor plat this APN sits on (book · page)' },
    { group: 'county', label: 'Clerk-Recorder · official records', url: 'https://clerkrecorderselfservice.venturacounty.gov/web/user/disclaimer', note: 'The grantor/grantee index: every deed, deed of trust, reconveyance, lien, notice of default and easement — search by the owner’s name (from the roll) or a document number; copies orderable online' },
    { group: 'county', label: 'Treasurer-Tax Collector · tax bill', url: 'https://taxpayment.venturacounty.gov/webtaxonline/index.html', note: 'Current bill, paid or unpaid, prior-year delinquency, special assessments and bonds — by parcel number (the site takes the APN by hand)' },
    { group: 'county', label: 'VC Citizen Access · permits & planning cases', url: 'https://vcca.venturacounty.gov/CitizenAccess/', note: 'Building permits, planning entitlements, code cases, septic and well permits (Accela) — search by APN or address' },
    { group: 'county', label: 'Recorded maps · county scans', url: 'https://maps.ventura.org/recordmaps/', note: 'Parcel maps, records of survey, tract maps' },
    { group: 'county', label: 'Superior Court · civil, probate & small claims', url: 'https://ventura.ecourt.com/public-portal/', note: 'Case index by party name — lis pendens, quiet-title, partition and probate actions surface here (free account needed; records desk $15 per search)' },
    { group: 'county', label: 'Treasurer-Tax Collector · tax-defaulted properties & auction', url: 'https://venturacounty.gov/ttc/', note: 'The annual notice of impending power to sell (five years delinquent) and the Bid4Assets tax-sale list — the county’s one free bulk distress dataset' },
    { group: 'county', label: 'Environmental Health · septic (OWTS) record search', url: 'https://archive.vcrma.org/en/isds-record-search', note: 'Individual sewage disposal system records 1978–2016 as PDFs — search by address' },
    { group: 'county', label: 'County open data · parcels monthly (ArcGIS Hub)', url: 'https://venturacountydatadownloads-vcitsgis.hub.arcgis.com/', note: 'The county’s own open parcel feed (APN + geometry, no owner names) and the Williamson Act layer — free, paginated REST' },
    { group: 'county', label: 'Assessor · roll data (bulk purchase)', url: 'https://assessor.venturacounty.gov/assessor-data/roll-data/', note: 'The secured roll with assessee names is public (RTC §§ 602/1602) and sold as an extract; the §408.1 transfer list is capped at $10 — see docs/data-sources.md' },
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
    { group: 'directory', label: 'NETR Online · Ventura County desks', url: 'https://publicrecords.netronline.com/state/CA/county/ventura', note: 'Free directory of the official assessor, recorder and tax-collector desks (some Ventura links lag the county’s domain move)' },
    { group: 'directory', label: 'PublicRecordCenter · Ventura County', url: 'https://www.publicrecordcenter.com/ventura-county-ca-public-records.html', note: 'Free directory — adds the Superior Court and GIS portal links NETR omits' },
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
// LA County's own fan-out: Regional Planning (zoning, plans, overlays) + eGIS (hazards, districts).
// Row keys match Ventura's so the read and the flags work unchanged.
const R_LADYN = R_LA + 'LACounty_Dynamic/';
const LA_SOURCES = [
  { sec: 'landuse', root: R_LADRP, svc: 'DRP/Open_Data', layer: 3, hit: (a) => { const m = /-(\d+)$/.exec(clean(a.ZONE) || ''); const lot = m ? (Number(m[1]) >= 1000 ? (Number(m[1]) / 43560).toFixed(2) + ' ac (' + fmtN(m[1]) + ' sq ft)' : m[1] + ' ac') + ' minimum lot' : ''; return [['Zoning (unincorporated LA County)', clean(a.ZONE) + (a.Z_DESC ? ' — ' + clean(a.Z_DESC) : ''), 'zoning'], ['Base zone', clean(a.Z_NAME) + (a.Z_CATEGORY ? ' · ' + clean(a.Z_CATEGORY) : '') + (lot ? ' · ' + lot : '') + (a.PLNG_AREA ? ' · ' + clean(a.PLNG_AREA) + ' planning area' : ''), 'zone_def']]; }, miss: () => [['Zoning (unincorporated LA County)', 'Not in the county zoning layer — inside a city, where the city’s own zoning applies', 'zoning']] },
  { sec: 'landuse', root: R_LADRP, svc: 'DRP/Open_Data', layer: 8, hit: (a) => [['General Plan 2035 land use', clean(a.PLAN_LEG || a.PLAN_) + (a.COMM_NAME ? ' · ' + clean(a.COMM_NAME) : ''), 'genplan']] },
  { sec: 'landuse', root: R_LADRP, svc: 'DRP/Open_Data', layer: 7, hit: (a) => [['Community / area plan land use', clean(a.PLAN_LEG || a.PLAN_) + (a.COMM_NAME ? ' · ' + clean(a.COMM_NAME) : '') + (a.TYPE ? ' · ' + clean(a.TYPE) : ''), 'areaplan']] },
  { sec: 'landuse', root: R_LADRP, svc: 'DRP/Open_Data', layer: 4, hit: (a) => [['Community Standards District', clean(a.CSD_NAME) + (a.ADOPTED ? ' · adopted ' + clean(String(a.ADOPTED)).slice(0, 10) : ''), 'csd']] },
  { sec: 'landuse', root: R_LADRP, svc: 'DRP/Open_Data', layer: 37, hit: (a) => [['Rural Preservation Area', clean(a.Town_Name || a.TYPE), 'rural_pres']] },
  { sec: 'landuse', root: R_LADRP, svc: 'DRP/Open_Data', layer: 6, hit: (a) => [['Equestrian District', clean(a.FULL_NAME || a.NAME), 'equestrian']] },
  { sec: 'landuse', root: R_LADRP, svc: 'DRP/Open_Data', layer: 10, hit: (a) => [['Rural Outdoor Lighting District (dark skies)', clean(a.NAME) || 'Inside', 'dark_sky']] },
  { sec: 'landuse', root: R_LADRP, svc: 'DRP/Open_Data', layer: 43, hit: (a) => [['Airport influence area', clean(a.AIRPORT_NAME || a.AIRPORT), 'airport']] },
  { sec: 'habitat', root: R_LADRP, svc: 'DRP/Open_Data', layer: 12, hit: (a) => [['Significant Ecological Area (SEA)', clean(a.SEA_NAME) + (a.SEA_TYPE ? ' · ' + clean(a.SEA_TYPE) : ''), 'sea']], miss: () => [['Significant Ecological Area (SEA)', 'Not inside a mapped SEA', 'sea']] },
  { sec: 'cultural', root: R_LADRP, svc: 'DRP/Open_Data', layer: 13, hit: (a) => [['Significant ridgeline', clean(a.TYPE) || 'On a mapped significant ridgeline', 'ridgeline']] },
  { sec: 'cultural', root: R_LADRP, svc: 'DRP/Open_Data', layer: 11, dist: 500, hit: (a) => [['Scenic highway within 500 m', clean(a.NAMEA_ALF || a.RTE1_ALF), 'scenic']] },
  { sec: 'cultural', root: R_LADRP, svc: 'DRP/Open_Data', layer: 35, dist: 300, near: 2, hit: (a, n, x) => x.nearest.map((q, i) => { const t = q.f.attributes; return [i ? '' : 'Historic resources within 300 m (' + n + ')', clean(t.Name) + (t.Year_Built ? ' · built ' + t.Year_Built : '') + (t.Status_Code_Description ? ' · ' + clean(t.Status_Code_Description) : '') + ' · ' + near(q.m), 'historic']; }) },
  { sec: 'fire', root: R_LADYN, svc: 'Hazards', layer: 2, geom: 'poly', hit: (a) => [['Fire hazard severity', clean(a.HAZ_CLASS) + (a.SRA === 'SRA' || a.SRA === 'Y' ? ' · State Responsibility Area' : ' · Local Responsibility Area'), 'fire_sev']], miss: () => [['Fire hazard severity', 'Not in a mapped severity zone', 'fire_sev']] },
  { sec: 'seismic', root: R_LADYN, svc: 'Hazards', layer: 5, geom: 'poly', hit: () => [['Earthquake Fault Zone', 'Inside a state Alquist-Priolo special study zone — a fault investigation is required before building', 'apzone']], miss: () => [['Earthquake Fault Zone', 'Outside every Alquist-Priolo zone', 'apzone']] },
  { sec: 'hazards', root: R_LADYN, svc: 'Hazards', layer: 8, geom: 'poly', hit: () => [['Seismic hazard zone · landslide', 'A state earthquake-induced landslide zone touches this parcel', 'eqls']], miss: () => [['Seismic hazard zone · landslide', 'Not in a mapped earthquake-induced landslide zone', 'eqls']] },
  { sec: 'hazards', root: R_LADYN, svc: 'Hazards', layer: 9, geom: 'poly', hit: () => [['Liquefaction', 'A mapped liquefaction zone touches the parcel', 'liq']], miss: () => [['Liquefaction', 'Not in a mapped liquefaction zone', 'liq']] },
  { sec: 'hazards', root: R_LADYN, svc: 'Hazards', layer: 11, geom: 'poly', hit: (a) => [['FEMA flood zone (county copy)', 'Zone ' + clean(a.FLD_ZONE) + ' touches the parcel' + (a.ZONE_SUBTY ? ' — ' + titleish(clean(a.ZONE_SUBTY)) : ''), 'flood100']], miss: () => [['FEMA flood zone (county copy)', 'No part of the parcel is in the mapped 100-year floodplain', 'flood100']] },
  { sec: 'hazards', root: R_LADYN, svc: 'Hazards', layer: 12, geom: 'poly', hit: () => [['500-year floodplain', 'Part of the parcel is in the 0.2 % annual-chance (500-year) floodplain', 'flood500']] },
  { sec: 'hazards', root: R_LADYN, svc: 'Hazards', layer: 14, hit: (a) => [['Dam inundation', 'Inside a dam-failure inundation area' + (a.DAM_NAME ? ' — ' + titleish(clean(a.DAM_NAME)) : ''), 'dam']] },
  { sec: 'hazards', root: R_LADYN, svc: 'Hazards', layer: 7, hit: () => [['Tsunami inundation', 'Inside the mapped tsunami inundation area', 'tsunami']] },
  { sec: 'districts', root: R_LADYN, svc: 'Political_Boundaries', layer: 27, hit: (a) => [['County supervisor', clean(a.LABEL) || ('District ' + a.DISTRICT), 'supervisor']] },
  { sec: 'districts', root: R_LADYN, svc: 'Political_Boundaries', layer: 29, hit: (a) => [['US Congress', 'District ' + clean(String(a.DIST_CONG)), 'congress']] },
  { sec: 'districts', root: R_LADYN, svc: 'Political_Boundaries', layer: 30, hit: (a) => [['State Assembly', 'District ' + clean(String(a.DIST_STASS)), 'assembly']] },
  { sec: 'districts', root: R_LADYN, svc: 'Political_Boundaries', layer: 31, hit: (a) => [['State Senate', 'District ' + clean(String(a.DIST_STSEN)), 'senate']] },
  { sec: 'districts', root: R_LADYN, svc: 'Political_Boundaries', layer: 25, hit: (a, n, x) => [['School district(s)', uniq(x.all.map((f) => clean(f.attributes.LABEL) + (f.attributes.DISTRICT_TYPE ? ' (' + clean(f.attributes.DISTRICT_TYPE).toLowerCase() + ')' : ''))).join(' · '), 'school_el']] },
  { sec: 'districts', root: R_LADYN, svc: 'Political_Boundaries', layer: 19, hit: (a) => [['City', /unincorporated/i.test(String(a.CITY_NAME || a.CITY_LABEL || '')) ? 'Unincorporated Los Angeles County' : clean(a.CITY_LABEL || a.CITY_NAME) + (a.PHONE ? ' · ' + clean(a.PHONE) : ''), 'city']], miss: () => [['City', 'Unincorporated Los Angeles County', 'city']] },
  { sec: 'districts', root: R_LADYN, svc: 'Political_Boundaries', layer: 23, hit: (a) => [['Community (countywide statistical area)', clean(a.LABEL || a.COMMUNITY), 'community']] },
  { sec: 'districts', root: R_LADYN, svc: 'Administrative_Boundaries', layer: 5, hit: (a) => [['ZIP code', clean(String(a.ZIPCODE)), 'zip']] },
  { sec: 'access', root: R_LADYN, svc: 'Administrative_Boundaries', layer: 19, hit: (a) => [['LA County Fire station area', 'Station ' + clean(String(a.STANUM)) + (a.BATTID ? ' · battalion ' + clean(String(a.BATTID)) : '') + (a.DIV ? ' · division ' + clean(String(a.DIV)) : ''), 'fire_station']] },
];
function laTitle(a) {
  const rows = [];
  rows.push(['Owner of record', 'Not published on the county’s public GIS — the Assessor portal (parcel detail) shows ownership and the sales history; the Registrar-Recorder’s index holds the documents', 'owner_now']);
  if (a.Roll_LandBaseYear) rows.push(['Prop 13 base year', clean(String(a.Roll_LandBaseYear)) + (a.Roll_ImpBaseYear && a.Roll_ImpBaseYear !== a.Roll_LandBaseYear ? ' (land) · ' + clean(String(a.Roll_ImpBaseYear)) + ' (improvements)' : ''), 'base_year']);
  if (num(a.Roll_HomeOwnersExemp)) rows.push(['Exemptions on the roll', 'Homeowner’s exemption — owner-occupied' + ' · ' + money(a.Roll_HomeOwnersExemp), 'exemption']);
  if (a.ParcelCreateDate) rows.push(['Parcel created', clean(String(a.ParcelCreateDate)).slice(0, 10), 'parcel_created']);
  return rows;
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
    identity: venturaIdentity, portals: venturaPortals, sources: VENTURA_SOURCES, title: venturaTitle,
    records: venturaRecords, structures: venturaStructures,
    authority: 'Ventura County GIS (maps.ventura.org) · Assessor · Surveyor · RMA Planning · Environmental Health · Public Works',
  },
  '06037': {
    id: 'losangeles', name: 'Los Angeles County', state: 'CA', stateName: 'California',
    apnPattern: /^\d{4}-\d{3}-\d{3}$/,                 // 2048-011-048 (dashed)
    normalizeApn: (s) => String(s).replace(/[^0-9]/g, ''),
    parcels: { root: R_LA, svc: 'LACounty_Cache/LACounty_Parcel', layer: 0, apnField: 'AIN' },
    identity: laIdentity, portals: laPortals, sources: LA_SOURCES, title: laTitle,
    records: null, structures: null,
    authority: 'Los Angeles County eGIS (public.gis.lacounty.gov) · Assessor · Regional Planning',
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
  const at = (parcel && parcel.attributes) || {};
  return { rings, bbox, cx, cy, point: ptGeom(cx, cy), apn10: String(at.APN10 || at.AIN || '').replace(/[^0-9]/g, '') };
}

// run one source row against a site
async function runSource(s, site, root, sink) {
  const r = s.root || root;
  let g;
  if (s.dist) g = Object.assign({}, site.point, { distance: s.dist, units: 'esriSRUnit_Meter' });
  else if (s.geom === 'poly' && site.rings) g = polyGeom(site.rings);
  else if (s.geom === 'env') g = envGeom(site.bbox);
  else g = site.point;
  const fs = await agsQuery(r, s.svc, s.layer, g, { where: s.where, returnGeometry: !!s.near, max: s.max });
  const extra = { all: fs, cx: site.cx, cy: site.cy, rings: site.rings, apn10: site.apn10, nearest: s.near ? nearestFeatures(fs, site.cx, site.cy, s.near) : [] };
  const rows = fs.length ? (s.hit(fs[0].attributes, fs.length, extra) || []) : (s.miss ? s.miss() || [] : []);
  if (sink && s.docs && fs.length) { try { (s.docs(fs, extra) || []).forEach((d) => sink.push(d)); } catch (e) { /* a document list is a bonus, never a failure */ } }
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

  const tasks = [], names = [], secs = [], docs = [];
  const srcs = adapter ? adapter.sources : [];
  for (const s of srcs) { names.push(s.svc + '/' + s.layer); secs.push(s.sec); tasks.push(() => runSource(s, site, adapter.parcels.root, docs)); }
  if (adapter && adapter.structures && site.rings) { names.push('structures'); secs.push('structures'); tasks.push(() => adapter.structures(site)); }
  if (adapter && adapter.title && parcel) { names.push('title'); secs.push('title'); tasks.push(() => adapter.title(a, site)); }
  let evidence = null, provider = null;
  if (rec.apn10) { names.push('evidence'); secs.push('title'); tasks.push(async () => { evidence = await loadEvidence(rec.apn10); return []; }); }
  if (rec.apn10 && county) { names.push('provider'); secs.push('title'); tasks.push(async () => { provider = await providerTitle({ apn: rec.apnPretty, apn10: rec.apn10, fips: county.fips, state: county.state }); return []; }); }
  let records = [];
  if (adapter && adapter.records) { names.push('records'); secs.push('records'); tasks.push(async () => { records = await adapter.records(site); return []; }); }
  const done = await runAll(tasks, BUDGET_MS - (Date.now() - t0));
  done.forEach((r, i) => {
    if (!r.ok || !Array.isArray(r.value)) return;
    r.value.forEach((row) => buckets[secs[i]].push(row));
  });
  if (docs.length) records = records.concat(docs);
  // a company on title: resolve it at the Secretary of State (needs SOS_API_KEY; ~1 s; inside the budget)
  if (process.env.SOS_API_KEY && evidence && evidence.owner && evidence.owner.company && evidence.owner.names && evidence.owner.names.length && Date.now() - t0 < BUDGET_MS - 1500) {
    try { const ent = await sosEntity({ name: evidence.owner.names[0] }); if (ent && ent.rows) provider = { providers: (provider ? provider.providers : []).concat(ent.provider), rows: (provider ? provider.rows : []).concat(ent.rows) }; } catch (e) { /* the portal link still stands */ }
  }
  // owner-first Ownership & title: the roll's rows, the imported evidence and any provider merged
  buckets.title = composeTitle(buckets.title, evidence, { doc: clean(a.DOC_NR) || clean(a.AIN_DOC) || null, date8: /^\d{8}$/.test(String(a.DOC_DT || '')) ? String(a.DOC_DT) : null, desc: a.DOC_TYPE ? docDesc(a.DOC_TYPE) : 'document', total: (num(a.L_V) || 0) + (num(a.I_V) || 0) || null }, provider);
  evidenceStructures(evidence).forEach((r) => buckets.structures.push(r));
  const answered = done.filter((v) => v.ok).length, late = done.filter((v) => v.late).length;
  const diag = q.debug ? done.map((r, i) => [names[i], r.ok ? 'ok' : (r.late ? 'late' : 'error: ' + r.error), r.ms || null]) : undefined;

  // —— flags: what a buyer, a lender or a permit desk would want surfaced first ——
  const flags = [];
  const flat = [].concat.apply([], SECTION_META.map(([id]) => buckets[id]));
  const find = (k) => { const r = flat.find((x) => x[2] === k); return r ? String(r[1]) : ''; };
  if (/^(trustee’s deed|tax deed|foreclosure|sheriff’s deed)/.test(find('doc_nr'))) flags.push({ level: 'watch', key: 'distress', text: 'The last recorded document on the roll is a ' + find('doc_nr').split(' · ')[0] + ' — a foreclosure, tax sale or court transfer; pull the full chain at the Recorder before relying on the title.' });
  if (/^Changed or re-titled/.test(find('owner_now'))) flags.push({ level: 'note', key: 'owner', text: 'Ownership changed or was re-titled after the 2018 roll snapshot — the current owner of record is the grantee on ' + find('doc_nr').split(' · ').slice(0, 2).join(' ') + '; confirm at the Assessor or the Recorder.' });
  if (evidence && evidence.owner && evidence.owner.names && evidence.owner.names.length) {
    const src = evidence.source || {}, when = src.preparedOn || String(evidence.importedAt || '').slice(0, 10);
    flags.push({ level: /⚠ the live county roll carries a NEWER/.test(find('owner_now')) ? 'watch' : 'good', key: 'owner_named', text: 'Owner of record per the imported ' + (src.provider || '') + ' report' + (when ? ' (' + isoLong(when) + ')' : '') + ': ' + evidence.owner.names.map(ownerish).join(' & ') + (/⚠ the live county roll carries a NEWER/.test(find('owner_now')) ? ' — but the live roll shows a newer document since; the name may have changed.' : '.') });
    if ((evidence.liens || []).length) flags.push({ level: 'watch', key: 'liens', text: (evidence.liens.length) + ' lien' + (evidence.liens.length > 1 ? 's' : '') + ' address-matched to this parcel in the report (' + evidence.liens.map((l) => (l.type ? titleish(l.type) : 'lien') + (l.amount ? ' ' + money(l.amount) : '') + (l.filed ? ' ' + String(l.filed).slice(0, 4) : '')).join(', ') + ') — check each case number at the Recorder before relying on the title.' });
    if (evidence.taxes && evidence.taxes.delinquent) flags.push({ level: 'watch', key: 'taxdue', text: 'The report flags delinquent property taxes (' + evidence.taxes.delinquent + ') — unpaid taxes are a lien ahead of every other claim; confirm the balance at the Tax Collector.' });
    const open = (evidence.loans || []).filter((l) => l.amount && l.date && (!evidence.values || !evidence.values.lastSaleDate || l.date >= evidence.values.lastSaleDate));
    if (open.length) flags.push({ level: 'note', key: 'loans', text: money(open.reduce((s, l) => s + l.amount, 0)) + ' in deeds of trust recorded since the last sale (' + open.length + ' loan' + (open.length > 1 ? 's' : '') + ', report) — a payoff figure comes from the lender, a reconveyance from the Recorder.' });
    const months = when ? Math.round((Date.now() - new Date(when + 'T00:00:00Z')) / (30.44 * 86400000)) : null;
    if (months != null && months >= 12) flags.push({ level: 'note', key: 'stale', text: 'The imported report is ' + ageOf(when) + ' — names, loans and liens can have moved since; re-order it before an offer.' });
  }
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
    portals: (adapter ? adapter.portals({ apn10: rec.apn10, situs: rec.situs, center: [site.cy, site.cx] }) : genericPortals({ county, center: [site.cy, site.cx] })).concat(evidence && evidence.owner && evidence.owner.company && county && county.state === 'CA' ? [{ group: 'state', label: 'Secretary of State · business search (bizfile)', url: 'https://bizfileonline.sos.ca.gov/search/business', note: 'Look up “' + evidence.owner.names.map(ownerish).join(' / ') + '” — the statement of information names the managers, members and the agent for service' }] : []),
    evidence: evidence ? { provider: (evidence.source || {}).provider || null, preparedOn: (evidence.source || {}).preparedOn || null, importedAt: evidence.importedAt || null, path: evidencePath(rec.apn10) } : null,
    sourcesQueried: tasks.length, sourcesAnswered: answered, sourcesLate: late, partial: late > 0,
    resolvedAt: new Date().toISOString(), ms: Date.now() - t0, diag,
  };
  return out;
}

// ---------------------------------------------------------------------------
//  DEEP — state + federal layers (anywhere in the US) and the terrain grid
// ---------------------------------------------------------------------------
const wellDesc = (t) => [clean(t.PlannedUseFormerUse) ? clean(t.PlannedUseFormerUse).replace(/^Water Supply /i, '').toLowerCase() : null, t.TotalCompletedDepth ? Math.round(t.TotalCompletedDepth) + ' ft deep' : null, num(t.StaticWaterLevel) !== null && isFinite(num(t.StaticWaterLevel)) ? 'water at ' + Math.round(num(t.StaticWaterLevel)) + ' ft' : null, num(t.WellYield) ? Math.round(num(t.WellYield)) + ' ' + String(t.WellYieldUnitofMeasure || 'gpm').toLowerCase() : null, t.DateWorkEnded ? String(new Date(t.DateWorkEnded).getUTCFullYear()) : null, clean(t.RecordType) && !/^New$/i.test(clean(t.RecordType)) ? clean(t.RecordType).toLowerCase() : null].filter(Boolean).join(' · ');
const CA_SOURCES = [
  // —— DWR well completion reports: every drilled water well with a filed report (depth, static level, yield, driller, the scanned report) ——
  { sec: 'water', root: R_OSWCR, svc: 'Environment/i07_WellCompletionReports', layer: 0, dist: 800, near: 3, max: 60, hit: (a, n, x) => {
      const apn = (x.apn10 || '').replace(/[^0-9]/g, '');
      const on = x.all.filter((f) => { const t = f.attributes; const ta = String(t.APN || '').replace(/[^0-9]/g, ''); return (apn && ta && ta === apn) || (x.rings && f.geometry && f.geometry.x !== undefined && x.rings.some((r) => inRing(f.geometry.x, f.geometry.y, r))); });
      const rows = [];
      const one = (f) => { const d = wellDesc(f.attributes); return f.attributes.WCRNumber + (d ? ' · ' + d : ' (legacy report — open the scan)'); };
      if (on.length) rows.push(['Wells on this parcel (DWR well completion reports)', on.length + ' — ' + on.slice(0, 6).map(one).join(' ‖ ') + (on.length > 6 ? ' ‖ + ' + (on.length - 6) + ' more — those with a scanned report are listed under recorded maps & reports' : ''), 'wells_on']);
      else rows.push(['Wells on this parcel (DWR well completion reports)', 'No report is filed against this APN or inside the boundary — a well may still exist (reports before 1949 and some later ones were never filed; the county’s own well count is above)', 'wells_on']);
      const nearby = x.nearest.filter((q) => !on.includes(q.f)).slice(0, 3);
      nearby.forEach((q, i) => rows.push([i ? '' : 'Well reports within 800 m (' + (n - on.length) + ')', one(q.f) + ' · ' + near(q.m), 'wells_near']));
      return rows;
    }, miss: () => [['Wells (DWR well completion reports)', 'No well completion report within 800 m — the state index has no drilled water well here', 'wells_on']],
    docs: (fs, x) => { const apn = (x.apn10 || '').replace(/[^0-9]/g, ''); const onP = (f) => (apn && String(f.attributes.APN || '').replace(/[^0-9]/g, '') === apn ? 1 : 0); return fs.filter((f) => f.attributes.WCRLinks).sort((p, q) => onP(q) - onP(p)).slice(0, 40).map((f) => { const t = f.attributes; return { label: t.WCRNumber, type: 'WCR', year: t.DateWorkEnded ? String(new Date(t.DateWorkEnded).getUTCFullYear()) : null, surveyor: titleish(clean(t.DrillerName)) || null, note: [onP(f) ? 'on this parcel' : null, clean(t.WellLocation), t.TotalCompletedDepth ? Math.round(t.TotalCompletedDepth) + ' ft' : null, num(t.WellYield) ? Math.round(num(t.WellYield)) + ' gpm' : null].filter(Boolean).join(' · '), pages: null, url: t.WCRLinks }; }); } },
  // —— which utility serves the parcel (CEC load-serving entities) ——
  { sec: 'access', root: R_CEC, svc: 'ElectricLoadServingEntities_IOU_POU/FeatureServer', layer: 0, hit: (a) => [['Electric utility (CEC service territory)', clean(a.Utility) + (a.Acronym ? ' (' + clean(a.Acronym) + ')' : '') + (a.Type ? ' · ' + (a.Type === 'IOU' ? 'investor-owned' : a.Type === 'POU' ? 'publicly owned' : clean(a.Type)) : '') + (a.Phone ? ' · ' + clean(a.Phone) : '') + (a.URL ? ' · ' + clean(a.URL).replace(/^https?:\/\//, '').replace(/\/$/, '') : ''), 'electric']], miss: () => [['Electric utility (CEC service territory)', 'Not inside an investor- or publicly-owned utility territory — a cooperative or off-grid; the line-extension quote decides', 'electric']] },
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
  // —— PAD-US 4.1 (USGS Gap Analysis Project): every public land, park, wilderness and recorded conservation easement in the national inventory ——
  { sec: 'habitat', root: R_USGS_AGOL, svc: 'Manager_Name_PADUS/FeatureServer', layer: 0, geom: 'env', max: 12, hit: (a, n, x) => {
      const cat = { Fee: 'fee-owned public land', Designation: 'designation', Easement: 'conservation easement', 'Unknown Easement': 'easement', Proclamation: 'proclamation boundary', Marine: 'marine area' };
      const acc = { OA: 'open to the public', RA: 'restricted access', XA: 'closed to the public', UK: 'access unknown' };
      const units = uniq(x.all.map((f) => { const t = f.attributes; return clean(t.Unit_Nm || t.Loc_Nm || t.Loc_Ds) + ' — ' + (cat[t.Category] || clean(t.Category)) + (t.Loc_Mang || t.Mang_Name ? ' · ' + clean(t.Loc_Mang || t.Mang_Name) : '') + (t.EsmtHldr ? ' · held by ' + clean(t.EsmtHldr) : '') + (t.Pub_Access && acc[t.Pub_Access] ? ' · ' + acc[t.Pub_Access] : '') + (t.GAP_Sts ? ' · GAP status ' + t.GAP_Sts : '') + (t.Date_Est ? ' · est. ' + t.Date_Est : ''); }));
      return [['Protected areas & easements on the parcel (PAD-US 4.1)', units.join(' ‖ '), 'padus']];
    }, miss: () => [['Protected areas & easements (PAD-US 4.1)', 'None in the national inventory — no public land, park, wilderness or recorded conservation easement on the parcel', 'padus']] },
  // —— USGS Mineral Resources Data System: recorded mines, prospects and mineral occurrences ——
  { sec: 'ground', root: R_USGS_AGOL, svc: 'Mineral_Resources_Data_System_MRDS_Compact_Version/FeatureServer', layer: 0, dist: 3000, near: 3, hit: (a, n, x) => x.nearest.map((q, i) => { const t = q.f.attributes; return [i ? '' : 'USGS mineral sites within 3 km (MRDS · ' + n + ')', clean(t.SITE_NAME) + (t.CODE_LIST ? ' · ' + clean(t.CODE_LIST).split(/\s+/).filter(Boolean).join(', ').toLowerCase() : '') + (t.DEV_STAT && !/unknown/i.test(t.DEV_STAT) ? ' · ' + clean(t.DEV_STAT).toLowerCase() : '') + ' · ' + near(q.m), 'mrds']; }), miss: () => [['USGS mineral sites within 3 km (MRDS)', 'None recorded — no mine, prospect or occurrence in the national database', 'mrds']] },
  // —— BLM MLRS: mining claims that are not closed (active, pending, under appeal) — federal claims can sit under private surface ——
  { sec: 'landuse', root: R_MLRS, svc: 'HUB/BLM_Natl_MLRS_Mining_Claims_Not_Closed/FeatureServer', layer: 0, dist: 2000, near: 3, max: 40, hit: (a, n, x) => {
      const on = x.all.filter((f) => (f.geometry && f.geometry.rings || []).some((r) => inRing(x.cx, x.cy, r)));
      const one = (f) => { const t = f.attributes; return clean(t.CSE_NAME) + ' · ' + clean(t.BLM_PROD || 'claim').toLowerCase() + ' · ' + clean(t.CSE_DISP || '').toLowerCase() + (t.LEG_CSE_NR ? ' · ' + t.LEG_CSE_NR : '') + (t.RCRD_ACRS ? ' · ' + Number(t.RCRD_ACRS).toFixed(1) + ' ac' : ''); };
      if (on.length) return [['Federal mining claims on the parcel (BLM MLRS)', on.length + ' — ' + on.slice(0, 4).map(one).join(' ‖ ') + ' — a located claim is a possessory interest in the minerals; check the deed for a mineral reservation', 'claims']];
      return x.nearest.map((q, i) => [i ? '' : 'Federal mining claims within 2 km (BLM MLRS · ' + n + ')', one(q.f) + ' · ' + near(q.m), 'claims']);
    }, miss: () => [['Federal mining claims (BLM MLRS)', 'None on the parcel or within 2 km — no open claim in the federal Mineral & Land Records System', 'claims']] },
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
  const tasks = [], secs = [], names = [], docs = [];
  const srcs = FED_SOURCES.concat(state === 'CA' ? CA_SOURCES : []);
  for (const s of srcs) { names.push(s.svc + '/' + s.layer); secs.push(s.sec); tasks.push(() => runSource(s, site, s.root, docs)); }
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
  const padus = /^None/.test(find('padus')) ? '' : find('padus');
  if (/conservation easement|— easement/.test(padus)) flags.push({ level: 'watch', key: 'easement', text: 'A recorded conservation easement covers this parcel in the national inventory (PAD-US) — the easement deed, not the zoning, sets what can be built; read it before anything else.' });
  else if (/fee-owned public land|— designation/i.test(padus)) flags.push({ level: 'note', key: 'padus', text: 'The parcel lies within a mapped public-land or designation boundary (PAD-US): ' + padus.split(' ‖ ')[0].split(' — ')[0] + ' — private inholdings inside these boundaries are common; the assessor roll and the deed decide ownership, and the agency’s rules apply at the fence line (access, fire, grazing, water).' });
  if (/^\d+ — /.test(find('claims'))) flags.push({ level: 'watch', key: 'claims', text: 'An open federal mining claim is located on this parcel (BLM MLRS) — a claimant may hold the locatable minerals; the title report and the deed’s mineral reservation decide who owns what beneath the surface.' });
  if (late) flags.push({ level: 'note', key: 'late', text: late + ' state/federal sources did not answer within the time budget — refresh to fill them in.' });

  const sections = SECTION_META.map(([id, label]) => ({ id, label, rows: buckets[id] })).filter((s) => s.rows.length);
  return {
    part: 'deep', apn: parcel && adapter ? adapter.identity(parcel.attributes).apnPretty : null, center: [site.cy, site.cx],
    county: county ? Object.assign({}, county, { adapter: adapter ? adapter.id : null }) : null,
    flags, sections, terrain, records: docs,
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
  return Object.assign({}, core, { part: 'all', sections: secs, flags: core.flags.concat(deep.flags), terrain: deep.terrain, records: (core.records || []).concat(deep.records || []),
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
  const ease = !/^None/.test(get('padus')) && /conservation easement|— easement/.test(get('padus')), claimsOn = /^\d+ — /.test(get('claims'));
  const encum = (ease ? 'conservation easement on the parcel (PAD-US) · ' : '') + (claimsOn ? 'open federal mining claim on the parcel · ' : '');
  dims.push({ id: 'entitlement', label: 'Entitlement headroom', value: zoning ? zoning + (minAc ? ' · ' + minAc + ' ac minimum' : '') : (get('genplan') || '—'), score: splits != null ? (ease ? Math.min(25, splits * 25) : Math.min(100, splits * 25)) : null, note: encum + (splits != null ? (splits >= 2 ? 'acreage would support ' + splits + ' lots at the zoning minimum (subject to plan, access, water and septic)' : splits === 1 ? 'one lot at the zoning minimum — no split' : 'below the zoning minimum lot size') : (get('genplan') ? get('genplan') + (get('williamson').startsWith('Under') ? ' · Williamson Act' : '') : 'zoning not resolved')), keys: ['zoning', 'zone_def', 'genplan', 'williamson', 'soar', 'padus', 'claims'] });
  // 3 hazard load
  const hz = [['fire_sev', /very high|high/i, 'fire'], ['flood100', /^Zone /, 'flood'], ['nfhl', /Special Flood Hazard Area on/, 'FEMA SFHA'], ['apzone', /Inside/, 'Alquist-Priolo'], ['liq', /touches/, 'liquefaction'], ['landslide', /touches/, 'landslide'], ['eqls', /touches/, 'EQ-induced landslide'], ['ls_susc', /high/i, 'high landslide susceptibility'], ['subsidence', /Inside/, 'subsidence'], ['dam', /Inside/, 'dam inundation'], ['tsunami', /Inside/, 'tsunami']];
  const hits = hz.filter(([k, re]) => re.test(get(k))).map((x) => x[2]);
  const anyHz = hz.some(([k]) => has(k));
  dims.push({ id: 'hazards', label: 'Hazard load', value: !anyHz ? '—' : hits.length ? hits.join(' · ') : 'no mapped hazard on the parcel', score: anyHz ? Math.max(0, 100 - hits.length * 20) : null, note: (get('pga475') ? 'PGA ' + get('pga475').split(' ')[0] + ' (475-yr)' : '') + (get('fires') && !/No recorded/.test(get('fires')) ? ' · fires on record' : ''), keys: hz.map((x) => x[0]) });
  // 4 water
  const wl = get('waterline'), sw = get('sewer'), gw = get('gw_basin');
  const wscore = (/No public water/.test(wl) ? 0 : 40) + (/No public sewer/.test(sw) ? 0 : 20) + (/Outside/.test(gw) || !gw ? 10 : 30) + (has('streams') && !/No county/.test(get('streams')) ? 10 : 0);
  dims.push({ id: 'water', label: 'Water', value: (/No public water/.test(wl) ? 'no public water line' : wl ? 'public water nearby' : '—') + ' · ' + (/No public sewer/.test(sw) ? 'septic' : sw ? 'sewer nearby' : '—'), score: wl || sw ? Math.min(100, wscore) : null, note: [get('wells_on') && /^\d+ — /.test(get('wells_on')) ? get('wells_on').split(' — ')[0] + ' well report' + (get('wells_on').startsWith('1 ') ? '' : 's') + ' on the parcel' : '', gw, get('gsa'), get('wells_water')].filter(Boolean).join(' · '), keys: ['waterline', 'sewer', 'gw_basin', 'gsa', 'wells_water', 'wells_on', 'wells_near', 'streams', 'nhd'] });
  // 5 access & utilities
  const road = get('road');
  dims.push({ id: 'access', label: 'Access & utilities', value: road ? road.split(' · ').slice(0, 2).join(' · ') : '—', score: road ? (/No public road/.test(road) ? 25 : /on the parcel|~\d+ m/.test(road) ? 90 : 60) : null, note: [get('electric') ? get('electric').split(' · ')[0] : '', get('fire_station') ? 'fire station ' + (get('fire_station').match(/~[^ ]+ (?:m|km)/) || [''])[0] : '', get('transmission') ? 'transmission line within 1 km' : '', get('comms') ? get('comms') + ' comms facilities within 2 mi' : '', get('county_ease')].filter(Boolean).join(' · ') || 'recorded easements are in the deed, not GIS', keys: ['road', 'private_st', 'transmission', 'county_ease', 'electric', 'fire_station', 'hospital', 'hauler'] });
  // 6 value signal
  const total = get('total_value'), land = get('land_value'), per = get('value_per_ac'), docRow = get('doc_nr'), dd = docRow.split(' · ')[2] || '', sale = get('sale_price'), est = get('market_estimate');
  dims.push({ id: 'value', label: 'Value signal', value: total ? total + ' assessed' : '—', score: null, note: [land ? 'land ' + land : '', per ? per + '/ac' : '', /^\$/.test(sale) ? 'last sale ' + sale.split(' — ')[0] : '', /^\$/.test(est) ? 'estimate ' + est.split(' ')[0] : '', dd ? 'last document ' + dd : '', get('value_change') ? '2018 → now ' + (get('value_change').match(/\(([^)]+)\)/) || [])[1] : ''].filter(Boolean).join(' · '), keys: ['total_value', 'land_value', 'value_per_ac', 'doc_nr', 'sale_price', 'value_change'] });
  // 7 change over time
  const maps = (rec.records || []).filter((r) => r.type !== 'WCR'), chain = flat.filter((r) => /^chain\d/.test(String(r[2] || ''))).length;
  dims.push({ id: 'change', label: 'Change over time', value: maps.length ? (maps.length + ' recorded maps, ' + (maps[maps.length - 1].year || '') + ' → ' + (maps[0].year || '')) : '—', score: null, note: (chain ? chain + ' title event' + (chain > 1 ? 's' : '') + ' on the public roll · ' : '') + (get('fires') && !/No recorded/.test(get('fires')) ? get('fires') : '') + (get('bldg_imagery') ? ' · footprints traced ' + get('bldg_imagery') : ''), keys: ['fires', 'fire_recent', 'bldg_imagery', 'bldg_count'] });
  return dims;
}
