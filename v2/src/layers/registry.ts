// The layer library. Every entry is fetched live from the publisher's own map
// server the moment it is switched on - nothing is copied, nothing goes stale.
// `z` is the draw order (fills low, lines high, labels top); `src`/`srcUrl`
// credit the publisher; scale-limited sheets carry `maxZoom` and are
// requested at native scale then overzoomed so they soften instead of vanish.

export type Kind = 'export' | 'xyz' | 'wms' | 'imgsvc' | 'image';
export type GroupId = 'county' | 'terrain' | 'geo' | 'seismic' | 'ground' | 'water' | 'land';

export interface RasterDef {
  root?: string;            // service root, defaults to the county
  svc?: string;             // service path under the root
  kind?: Kind;              // transport (default 'export')
  direct?: boolean;         // skip the edge-cached /api/tile proxy for this service
  showLayers?: string;      // ArcGIS sublayer ids, e.g. '28,27,16'
  px?: number;              // export tile size (512 = crisp, 256 = the server's honest CSS scale)
  maxNative?: number;       // xyz caches: deepest cached zoom
  url?: string;             // wms endpoint / image url
  layers?: string;          // wms layer names
  extra?: () => string;     // imgsvc: extra query (mosaic rule)
  attr?: string;
}

export interface OverlayDef extends RasterDef {
  id: string;
  group: GroupId;
  label: string;
  note: string;
  op: number;
  z: number;
  src?: string;
  srcUrl?: string;
  legendText?: string;
  minZoom?: number;
  maxZoom?: number;
  farNote?: string;
  nearNote?: string;
  parts?: RasterDef[];
  bounds?: [[number, number], [number, number]];   // image kind: [[s,w],[n,e]]
  vector?: string;                                  // image kind: url of surveyed vectors
}

export interface GroupDef { id: GroupId; icon: string; label: string; note: string; }

export interface FlightDef { id: string; year: number; when: string; note: string; kind: 'xyz' | 'export'; svc: string; }

export const VC_ROOT = 'https://maps.ventura.org/arcgis/rest/services/';
export const R_CGS = 'https://gis.conservation.ca.gov/server/rest/services/';
export const R_USGS = 'https://basemap.nationalmap.gov/arcgis/rest/services/';
export const R_FEMA = 'https://hazards.fema.gov/arcgis/rest/services/';
export const R_NHD = 'https://hydro.nationalmap.gov/arcgis/rest/services/';
export const R_QF = 'https://earthquake.usgs.gov/arcgis/rest/services/';
export const R_BLM = 'https://gis.blm.gov/arcgis/rest/services/';
export const R_DWR = 'https://gis.water.ca.gov/arcgis/rest/services/';
export const R_HIST = 'https://historical1.arcgis.com/arcgis/rest/services/';
const S_VC = 'Ventura County GIS', S_CGS = 'California Geological Survey', S_USGS = 'USGS', S_FEMA = 'FEMA', S_BLM = 'Bureau of Land Management';

export const GROUPS: GroupDef[] = [
  { id: 'county',  icon: '🏛️', label: 'County & parcels',        note: 'what the county planner sees — parcels, zoning, contours, the survey' },
  { id: 'terrain', icon: '🗻', label: 'Terrain & historic maps', note: 'USGS relief, today’s topo, and every USGS edition of this ground back to 1903' },
  { id: 'geo',     icon: '⛏️', label: 'Geology & minerals',      note: 'what is under the ground — rock units, mineral studies, mines, oil & gas' },
  { id: 'seismic', icon: '🌋', label: 'Faults & earthquakes',    note: 'every mapped fault, the regulated Alquist-Priolo traces, the historical shocks' },
  { id: 'ground',  icon: '🪨', label: 'Landslides & soils',      note: 'slope stability, slides mapped in the field, the soil survey, farmland grades' },
  { id: 'water',   icon: '💧', label: 'Water & flood',           note: 'FEMA flood zones, every named creek, groundwater basins' },
  { id: 'land',    icon: '📏', label: 'Ownership & survey grid', note: 'who holds the land around you, and the township grid every deed refers to' }
];

// every county flight on file, oldest first - driven by the aerial timeline
export const FLIGHTS: FlightDef[] = [
  { id: '1945',  year: 1945, when: '1945',     note: 'the oldest flight on file', kind: 'export', svc: 'SDs/1945Aerial' },
  { id: '2000',  year: 2000, when: 'Apr 2000', note: '', kind: 'export', svc: 'SDs/2000AprAerial' },
  { id: '2001',  year: 2001, when: 'Dec 2001', note: '', kind: 'export', svc: 'SDs/2001DecAerial' },
  { id: '2002',  year: 2002, when: 'Oct 2002', note: '', kind: 'export', svc: 'SDs/2002OctAerial' },
  { id: '2003',  year: 2003, when: 'Jan 2003', note: '', kind: 'export', svc: 'SDs/2003JanAerial' },
  { id: '2004',  year: 2004, when: 'Sep 2004', note: '', kind: 'export', svc: 'SDs/2004SepAerial' },
  { id: '2005',  year: 2005, when: 'Sep 2005', note: '', kind: 'export', svc: 'SDs/2005SepAerial' },
  { id: '2006',  year: 2006, when: 'Jun 2006', note: '', kind: 'export', svc: 'SDs/2006JunAerial' },
  { id: '2007',  year: 2007, when: 'Jul 2007', note: '', kind: 'export', svc: 'SDs/2007JulAerial' },
  { id: '2008',  year: 2008, when: 'Apr 2008', note: '', kind: 'export', svc: 'SDs/2008AprAerial' },
  { id: '2009',  year: 2009, when: 'Apr 2009', note: '', kind: 'export', svc: 'SDs/2009AprAerial' },
  { id: '2010',  year: 2010, when: 'Dec 2010', note: '', kind: 'export', svc: 'SDs/2010DecAerial' },
  { id: '2011',  year: 2011, when: 'Dec 2011', note: '', kind: 'export', svc: 'SDs/2011DecAerial' },
  { id: '2012',  year: 2012, when: 'Dec 2012', note: '', kind: 'export', svc: 'SDs/2012DecAerial' },
  { id: '2014',  year: 2014, when: 'Feb 2014', note: '', kind: 'export', svc: 'SDs/2014FebAerial' },
  { id: '2015',  year: 2015, when: 'Dec 2015', note: '', kind: 'export', svc: 'SDs/2015DecAerial' },
  { id: '2016m', year: 2016, when: 'Mar 2016', note: '', kind: 'export', svc: 'SDs/2016MarAerial' },
  { id: '2016',  year: 2016, when: 'Dec 2016', note: '', kind: 'export', svc: 'SDs/2016DecAerial' },
  { id: '2017',  year: 2017, when: 'Oct 2017', note: 'weeks before the Thomas Fire', kind: 'export', svc: 'SDs/2017OctAerial' },
  { id: '2018',  year: 2018, when: 'Oct 2018', note: '', kind: 'export', svc: 'SDs/2018OctAerial' },
  { id: '2018f', year: 2018, when: 'Nov 2018', note: 'post-Thomas-Fire flight — burn area only', kind: 'export', svc: 'SDs/2018NovDecPostFireAerial' },
  { id: '2019v', year: 2019, when: 'Apr 2019', note: 'Vexcel', kind: 'export', svc: 'SDs/2019MarAprVexcelAerial' },
  { id: '2019',  year: 2019, when: 'Dec 2019', note: '', kind: 'export', svc: 'SDs/2019DecAerial' },
  { id: '2020',  year: 2020, when: '2020',     note: '3 in Vexcel', kind: 'export', svc: 'SDs/2020Vexcel3Inch2' },
  { id: '2021',  year: 2021, when: '2021',     note: '3 in Vexcel — sharpest', kind: 'export', svc: 'SDs/2021Vexcel3Inch' },
  { id: '2022v', year: 2022, when: '2022',     note: '3 in Vexcel', kind: 'export', svc: 'SDs/2022Vexcel3Inch' },
  { id: '2022',  year: 2022, when: '2022',     note: 'full county', kind: 'export', svc: 'SDs/2022FullCountyAerial' },
  { id: '2023u', year: 2023, when: '2023',     note: 'urban · developed areas only', kind: 'xyz', svc: 'SDs/2023UrbanAerial' },
  { id: '2023',  year: 2023, when: '2023',     note: 'countywide', kind: 'xyz', svc: 'SDs/2023CountyWideAerial' },
  { id: '2024u', year: 2024, when: '2024',     note: 'urban · developed areas only', kind: 'xyz', svc: 'SDs/2024UrbanAerial' },
  { id: '2024',  year: 2024, when: '2024',     note: 'countywide', kind: 'xyz', svc: 'SDs/2024CountyWideAerial' },
  { id: '2025',  year: 2025, when: '2025',     note: '3 in · developed areas', kind: 'xyz', svc: 'SDs/2025UrbanAerial' }
];

// the historic USGS editions on file over the Ojai valley (newest edition on or before the year is drawn)
export const HIST_YEARS = [1903, 1947, 1952, 1964, 1967, 1988, 1995];
export const HIST_NOTES: Record<number, string> = {
  1903: '15-minute Santa Paula sheet — surveyed 1901–02, the first map of this ground',
  1947: '15-minute sheet, 1947 revision',
  1952: 'first 7.5-minute Ojai quad — aerial photos 1947',
  1964: '15-minute sheet, 1964 edition',
  1967: '7.5-minute Ojai quad, 1967 edition',
  1988: '7.5-minute Ojai quad, 1988 edition — photos 1984',
  1995: '7.5-minute Ojai quad, 1995 — the last paper edition'
};
export let histYear = 1952;
export function setHistYear(y: number) { histYear = y; }
export function histRule(): string {
  return '&mosaicRule=' + encodeURIComponent(JSON.stringify({
    mosaicMethod: 'esriMosaicAttribute', sortField: 'DateCurrent', sortValue: String(histYear), ascending: false,
    where: 'DateCurrent <= ' + histYear + ' AND Map_Scale <= 62500'
  }));
}

export const OVERLAYS: OverlayDef[] = [
  // —— county & parcels ——
  { id: 'topo', group: 'county', label: '⛰️ Topo contours', note: 'county contours — 100 ft, 20 ft then 5 ft as you zoom in', svc: 'SDs/Topography', op: 0.92, z: 350, src: S_VC, minZoom: 16, farNote: 'zoom in closer to see the contours',
    legendText: 'Contour lines — each one a fixed step in elevation: 100 ft far out, 20 ft, then 5 ft up close. With contours on, click anywhere on the land to read its real elevation (USGS 3DEP, 1 m).' },
  { id: 'survey', group: 'county', label: '📐 Survey sheet — Sulphur Mtn', note: 'Henry Land Surveying, Nov 2024 · 1 ft contours, structures, fences, poles · the surveyed boundary with every bearing, the 16 ft easement and the found monuments', kind: 'image', url: '/images/sulphur-mountain/survey/topo-survey-overlay.png', bounds: [[34.4315996, -119.1582952], [34.4336893, -119.1546039]], vector: '/api/survey/sulphur-mountain', op: 0.88, z: 360, src: 'Henry Land Surveying · record map 14-PM-15', srcUrl: 'https://maps.ventura.org/recordmaps/pm/014/014pm015.pdf',
    legendText: 'The survey sheet, registered to its own surveyed corners (within about 0.3 m on the parcel body). Hover the dashed cyan boundary for each bearing and distance; amber is the 16 ft access easement; white dots are the monuments the surveyor found.' },
  { id: 'bldg', group: 'county', label: '🏚️ Building footprints', note: 'every structure standing today, mapped by the county', svc: 'DataDownloads/CommonData', showLayers: '0', op: 0.95, z: 330, src: S_VC },
  { id: 'parcels', group: 'county', label: '▦ Parcel lines', note: 'official assessor boundaries', svc: 'SDs/Parcels', op: 0.95, z: 345, src: S_VC },
  { id: 'apn', group: 'county', label: '# APN + acreage labels', note: '', svc: 'SDs/ParcelLabels', showLayers: '0,2', op: 0.95, z: 370, src: S_VC },
  { id: 'recmaps', group: 'county', label: '🗂️ Recorded maps index', note: 'every recorded parcel map, tract and record of survey — the sheets a surveyor starts from', svc: 'DataDownloads/Survey', showLayers: '4', op: 0.55, z: 331, src: S_VC + ' · Surveyor', srcUrl: 'https://maps.ventura.org/recordmaps/' },
  { id: 'zoning', group: 'county', label: '⬛ Zoning', note: 'base zone designations', svc: 'SDs/MyZoning', showLayers: '0', op: 0.5, z: 305, src: S_VC + ' · Planning' },
  { id: 'ovz', group: 'county', label: '🦌 Overlay zones', note: 'habitat corridors, wildlife passage, Ojai dark sky', svc: 'SDs/OverlayZones', op: 0.45, z: 306, src: S_VC + ' · Planning' },
  { id: 'habitat', group: 'county', label: '🌿 Habitat & sensitive areas', note: 'ESHA, habitat connectivity, wildlife corridors', svc: 'SDs/CV_PlanningGIS', showLayers: '3,4,6', op: 0.42, z: 307, src: S_VC + ' · Planning' },
  { id: 'water', group: 'county', label: '🏞️ Creeks & surface water', note: 'county drainage lines', svc: 'SDs/CV_PlanningGIS', showLayers: '8', op: 0.8, z: 338, src: S_VC },
  { id: 'flood', group: 'county', label: '💧 County floodplain', note: '100-year and 500-year, county mapping', svc: 'SDs/PWA_Floodplain', op: 0.45, z: 321, src: S_VC + ' · Public Works' },
  { id: 'fire', group: 'county', label: '🔥 CalFire SRA', note: 'state fire responsibility area', svc: 'SDs/PWACalFireSRA', op: 0.35, z: 308, src: S_VC + ' · CAL FIRE' },
  // —— terrain & historic maps ——
  { id: 'shade', group: 'terrain', label: '🗻 Hillshade relief', note: 'USGS 3DEP shaded relief — the lay of the land without leaving 2D', root: R_USGS, svc: 'USGSShadedReliefOnly', kind: 'export', op: 0.55, z: 302, src: S_USGS + ' 3DEP', srcUrl: 'https://www.usgs.gov/3d-elevation-program', attr: 'USGS',
    legendText: 'Light from the north-west; brighter slopes face the light, darker slopes fall away from it. Turn it on under any base to make the terrain read.' },
  { id: 'usgstopo', group: 'terrain', label: '🗺️ USGS topo (today)', note: 'the current US Topo — contours, trails, place names', root: R_USGS, svc: 'USGSTopo', kind: 'xyz', maxNative: 16, op: 0.85, z: 304, src: S_USGS + ' The National Map', srcUrl: 'https://www.usgs.gov/programs/national-geospatial-program/us-topo-maps-america', attr: 'USGS',
    legendText: 'The standard USGS quadrangle style: brown contours, blue water, green woodland, black culture. Drawn to about 1:24,000.' },
  { id: 'histtopo', group: 'terrain', label: '📜 Historic USGS topo', note: 'every USGS edition of this ground since 1903 — drag the year on the timeline', root: R_HIST, svc: 'USA_Historical_Topo_Maps', kind: 'imgsvc', extra: histRule, op: 0.85, z: 306, src: S_USGS + ' Historical Topographic Map Collection · Esri Living Atlas', srcUrl: 'https://www.usgs.gov/programs/national-geospatial-program/historical-topographic-maps-preserving-past', attr: 'USGS / Esri',
    legendText: 'Scanned and georeferenced USGS sheets. The timeline picks the newest edition published on or before that year at 1:62,500 or larger — old sheets are hand-drawn, so expect roads and creeks to sit a few metres off today’s imagery.' },
  // —— geology & minerals ——
  { id: 'geology', group: 'geo', label: '🪨 Geologic map', note: 'rock units, contacts, folds — Geologic Map of California (CGS, 2010)', root: R_CGS, svc: 'CGS/Geologic_Map_of_California', kind: 'export', op: 0.55, z: 310, src: S_CGS, srcUrl: 'https://maps.conservation.ca.gov/cgs/gmc/', attr: 'CGS' },
  { id: 'quat', group: 'geo', label: '🏜️ Quaternary deposits', note: 'the young surface — alluvium, fans, terraces, landslide debris (CGS)', root: R_CGS, svc: 'CGS/QuaternarySurficialDepositsSouthernCA', kind: 'export', px: 256, maxZoom: 13, nearNote: 'CGS drew this at 1:36,000 and wider — it softens as you zoom in closer', op: 0.55, z: 311, src: S_CGS, srcUrl: 'https://www.conservation.ca.gov/cgs', attr: 'CGS' },
  { id: 'minerals', group: 'geo', label: '⛏️ Mineral land classification', note: 'CGS mineral studies, production areas and classification reports · geothermal springs and wells', root: R_CGS, svc: 'CGS/IW_MineralResourcesProgram', kind: 'export', showLayers: '0,1,2,3,4,7,10', op: 0.6, z: 312, src: S_CGS + ' Mineral Resources Program', srcUrl: 'https://www.conservation.ca.gov/cgs/minerals', attr: 'CGS' },
  { id: 'mines', group: 'geo', label: '🚧 Active mines', note: 'permitted surface mines — Mines Online, Division of Mine Reclamation', root: R_CGS, svc: 'MOL/MOLMines', kind: 'export', op: 0.95, z: 336, src: 'CA Division of Mine Reclamation', srcUrl: 'https://maps.conservation.ca.gov/mol/', attr: 'DMR' },
  { id: 'wells', group: 'geo', label: '🛢️ Oil & gas wells', note: 'every CalGEM well — active, idle, plugged (the Ojai oil field is next door)', root: R_CGS, svc: 'WellSTAR/Wells', kind: 'export', op: 0.95, z: 337, src: 'CalGEM WellSTAR', srcUrl: 'https://www.conservation.ca.gov/calgem', attr: 'CalGEM' },
  { id: 'radon', group: 'geo', label: '☢️ Radon potential', note: 'CGS radon potential zones', root: R_CGS, svc: 'CGS/RadonPotentialZones', kind: 'export', op: 0.45, z: 313, src: S_CGS, srcUrl: 'https://www.conservation.ca.gov/cgs/radon', attr: 'CGS' },
  // —— faults & earthquakes ——
  { id: 'faults', group: 'seismic', label: '🌋 Fault activity map', note: 'every mapped fault, colored by how recently it moved (CGS, 2010)', root: R_CGS, svc: 'CGS/FaultActivityMapCA', kind: 'export', px: 256, maxZoom: 12, nearNote: 'a regional map, drawn at 1:150,000 — softens as you zoom in; for close work use Alquist-Priolo and USGS Quaternary faults', op: 0.95, z: 340, src: S_CGS + ' Fault Activity Map', srcUrl: 'https://maps.conservation.ca.gov/cgs/fam/', attr: 'CGS' },
  { id: 'ap', group: 'seismic', label: '⚠️ Alquist-Priolo fault traces', note: 'state-regulated surface-rupture traces — habitable buildings need a fault study and a 50 ft setback', root: R_CGS, svc: 'CGS_Earthquake_Hazard_Zones/SHP_Fault_Traces', kind: 'export', op: 0.95, z: 342, src: S_CGS + ' Seismic Hazards Program', srcUrl: 'https://www.conservation.ca.gov/cgs/alquist-priolo', attr: 'CGS' },
  { id: 'qfaults', group: 'seismic', label: '〰️ USGS Quaternary faults', note: 'national Quaternary fault and fold database, 2014 hazard model', root: R_QF, svc: 'haz/hazfaults2014', kind: 'export', op: 0.9, z: 341, src: S_USGS + ' Earthquake Hazards Program', srcUrl: 'https://www.usgs.gov/programs/earthquake-hazards/faults', attr: 'USGS' },
  { id: 'nshm', group: 'seismic', label: '📈 Fault slip rates', note: 'preferred slip rate on each fault — 2023 National Seismic Hazard Model', root: R_CGS, svc: 'CGS/MS48_NSHM2023_Faults', kind: 'export', op: 0.9, z: 341, src: S_CGS + ' Map Sheet 48', attr: 'CGS' },
  { id: 'quakes', group: 'seismic', label: '💥 Historical earthquakes M3+', note: 'every recorded shock of magnitude 3 and up (CGS catalog)', root: R_CGS, svc: 'CGS/CA_HistEQs_M3Plus', kind: 'export', op: 0.9, z: 343, src: S_CGS, attr: 'CGS' },
  // —— landslides & soils ——
  { id: 'lssusc', group: 'ground', label: '⛰️ Landslide susceptibility', note: 'CGS Map Sheet 58 — slope and rock strength ranked 0 to X', root: R_CGS, svc: 'CGS/MS58_LandslideSusceptibility_Classes', kind: 'export', px: 256, maxZoom: 13, nearNote: 'CGS drew this at 1:36,000 and wider — it softens as you zoom in closer', op: 0.55, z: 314, src: S_CGS + ' Map Sheet 58', srcUrl: 'https://www.conservation.ca.gov/cgs/landslides', attr: 'CGS' },
  { id: 'lsinv', group: 'ground', label: '🪨 Mapped landslides', note: 'CGS landslide inventory — deposits, scarps and source areas actually mapped in the field', op: 0.8, z: 335, src: S_CGS + ' Landslide Inventory', srcUrl: 'https://www.conservation.ca.gov/cgs/landslides', attr: 'CGS',
    parts: [
      { root: R_CGS, svc: 'CGS/LandslideInventory_DC1_Older', kind: 'export' },
      { root: R_CGS, svc: 'CGS/LandslideInventory_DC1_Younger', kind: 'export' },
      { root: R_CGS, svc: 'CGS/LandslideInventory_DC2', kind: 'export' },
      { root: R_CGS, svc: 'CGS/LandslideInventory_DC3', kind: 'export' }
    ] },
  { id: 'soils', group: 'ground', label: '🌱 Soil survey (SSURGO)', note: 'USDA NRCS soil map units — the dossier names the unit under each property', kind: 'wms', url: 'https://SDMDataAccess.sc.egov.usda.gov/Spatial/SDM.wms', layers: 'mapunitpoly', op: 0.7, z: 315, src: 'USDA NRCS Soil Survey', srcUrl: 'https://websoilsurvey.nrcs.usda.gov/', attr: 'USDA NRCS',
    legendText: 'Each outlined area is one soil map unit; the code inside it (e.g. 190, "Sespe–Castaic") is what the county and the septic engineer look up. Open the dossier for the unit under the property.' },
  { id: 'farmland', group: 'ground', label: '🌾 Important farmland', note: 'Prime · Statewide · Unique · Local · Grazing — Farmland Mapping 2022', root: R_CGS, svc: 'DLRP/CaliforniaImportantFarmland_2022', kind: 'xyz', maxNative: 16, op: 0.55, z: 316, src: 'CA Dept of Conservation · Farmland Mapping & Monitoring', srcUrl: 'https://www.conservation.ca.gov/dlrp/fmmp', attr: 'CA DOC' },
  { id: 'williamson', group: 'ground', label: '📜 Williamson Act', note: 'agricultural preserve contracts — lower taxes, restricted use', root: R_CGS, svc: 'DLRP/CaliforniaWilliamsonActEnrollment_2025', kind: 'export', showLayers: '9', op: 0.5, z: 317, src: 'CA Dept of Conservation · Williamson Act 2025', srcUrl: 'https://www.conservation.ca.gov/dlrp/wa', attr: 'CA DOC' },
  // —— water & flood ——
  { id: 'nfhl', group: 'water', label: '🌊 FEMA flood zones', note: 'the National Flood Hazard Layer — A / AE / X zones and base flood elevations', root: R_FEMA, svc: 'public/NFHL', kind: 'export', showLayers: '28,27,16', op: 0.55, z: 320, src: S_FEMA + ' National Flood Hazard Layer', srcUrl: 'https://msc.fema.gov/portal/home', attr: 'FEMA' },
  { id: 'nhd', group: 'water', label: '🏞️ Streams & waterbodies', note: 'National Hydrography Dataset — every named creek and drainage', root: R_NHD, svc: 'nhd', kind: 'export', op: 0.9, z: 339, src: S_USGS + ' National Hydrography Dataset', srcUrl: 'https://www.usgs.gov/national-hydrography', attr: 'USGS' },
  { id: 'gwbasin', group: 'water', label: '🕳️ Groundwater basins', note: 'DWR Bulletin 118 basins and subbasins', root: R_DWR, svc: 'Geoscientific/i08_B118_CA_GroundwaterBasins', kind: 'export', op: 0.4, z: 318, src: 'CA Dept of Water Resources · Bulletin 118', srcUrl: 'https://water.ca.gov/programs/groundwater-management/bulletin-118', attr: 'CA DWR' },
  // —— ownership & survey grid ——
  { id: 'blm', group: 'land', label: '🏕️ Public land ownership', note: 'Forest Service, BLM, Park Service and other federal land', root: R_BLM, svc: 'lands/BLM_Natl_SMA_Cached_without_PriUnk', kind: 'xyz', maxNative: 16, op: 0.5, z: 319, src: S_BLM + ' Surface Management Agency', srcUrl: 'https://gbp-blm-egis.hub.arcgis.com/', attr: 'BLM' },
  { id: 'plss', group: 'land', label: '📐 Township · range · section', note: 'the PLSS grid every legal description refers to (BLM CadNSDI)', root: R_BLM, svc: 'Cadastral/BLM_Natl_PLSS_CadNSDI', kind: 'export', op: 0.85, z: 339, src: S_BLM + ' Cadastral NSDI', srcUrl: 'https://gbp-blm-egis.hub.arcgis.com/', attr: 'BLM' }
];

export function overlayById(id: string): OverlayDef | undefined { return OVERLAYS.find(o => o.id === id); }
export function flightById(id: string): FlightDef | undefined { return FLIGHTS.find(f => f.id === id); }
