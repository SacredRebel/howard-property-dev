import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import { Engine } from './engine/map';
import { PropertyLayer } from './data/properties';
import { Hud } from './ui/hud';
import { DEFAULT_STATE, readHash, writeHash, type AppState } from './engine/state';
import { FLIGHTS, OVERLAYS, GROUPS, histYear, overlayById } from './layers/registry';

// no hash in the URL -> the last visit's base, layers, year and mode come back (a first visit is Esri + nothing)
function remembered(): Partial<AppState> {
  const out: Partial<AppState> = {};
  try {
    const j = JSON.parse(localStorage.getItem('atlasLast') || 'null');
    if (j && typeof j === 'object') {
      if (typeof j.base === 'string') out.base = j.base;
      if (Array.isArray(j.layers)) out.layers = j.layers.filter((x: unknown) => typeof x === 'string');
      if (Number.isFinite(j.histYear)) out.histYear = j.histYear;
      if (j.mode === 'vision' || j.mode === 'today') out.mode = j.mode;
      if (typeof j.terrain === 'boolean') out.terrain = j.terrain;
    }
  } catch { /* private mode */ }
  return out;
}
const state: AppState = { ...DEFAULT_STATE, ...(location.hash ? {} : remembered()), ...readHash() };
const app = document.getElementById('app')!;
const mapEl = document.createElement('div'); mapEl.id = 'map'; app.appendChild(mapEl);

const eng = new Engine(mapEl, { center: [state.lng, state.lat], zoom: state.zoom, bearing: state.bearing, pitch: state.pitch });
eng.terrain = state.terrain;
// tile cache: immutable aerials / historic topo / DEM tiles come back instantly on the next visit
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(e => console.info('[atlas] sw', e)); });
}
const props = new PropertyLayer(eng);
let mode = state.mode;
const hud = new Hud(app, { eng, props, mode, onMode: m => { mode = m; props.applyMode(m); persist(); } });
// remembered render quality (low / medium / high) - applied before the first real frame
try { const q = localStorage.getItem('atlasQuality'); if (q === 'low' || q === 'medium' || q === 'high') { eng.setQuality(q); const sel = document.getElementById('ctl-quality') as HTMLSelectElement | null; if (sel) sel.value = q; } } catch { /* private mode */ }

let persistTimer: number | null = null;
function persist() {
  if (persistTimer != null) return;                       // coalesce bursts (move + layer + base) into one write
  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    const c = eng.map.getCenter();
    writeHash({ lng: c.lng, lat: c.lat, zoom: eng.map.getZoom(), bearing: eng.map.getBearing(), pitch: eng.map.getPitch(), base: eng.base, histYear, layers: [...eng.active], mode, terrain: eng.terrain });
    try { localStorage.setItem('atlasLast', JSON.stringify({ base: eng.base, layers: [...eng.active], histYear, mode, terrain: eng.terrain })); } catch { /* fine */ }
  }, 120);
}
eng.map.on('moveend', persist);
eng.events.on('base', persist); eng.events.on('overlays', persist); eng.events.on('histYear', persist); eng.events.on('terrain', persist);

async function boot() {
  console.info('[atlas] engine ready');
  // restore shared state
  if (state.base !== 'esri') eng.setBase(state.base);
  if (state.histYear !== histYear) eng.setHistYear(state.histYear, true);
  for (const id of state.layers) if (overlayById(id)) eng.setOverlay(id, true);
  try {
    await props.load();
    props.build();
    props.applyMode(mode);
    hud.setCrumb(`Ojai Valley · ${props.props.length} properties · ${props.props.reduce((n, p) => n + (p.zones?.length || 0), 0)} zones`);
    if (!location.hash) eng.map.fitBounds(props.bounds(), { padding: { top: 80, bottom: 150, left: 40, right: 40 }, duration: 0 });
    const want = new URLSearchParams(location.search).get('p');
    const p = want && props.props.find(x => x.id === want);
    if (p) setTimeout(() => props.flyTo(p), 400);
    const apn = new URLSearchParams(location.search).get('apn');   // ?apn=037-0-012-125 -> straight to that parcel's county record
    if (apn && !p) setTimeout(() => hud.lookup(apn), 600);
    window.atlas.ready = true;
  } catch (e) { console.error('properties', e); }
}
if (eng.map.loaded()) boot(); else eng.map.once('load', boot);

// test hooks
declare global { interface Window { atlas: { eng: Engine; props: PropertyLayer; hud: Hud; ready?: boolean; catalog: () => unknown; state: () => unknown }; } }
window.atlas = {
  eng, props, hud,
  catalog: () => ({ groups: GROUPS.length, overlays: OVERLAYS.map(o => ({ id: o.id, group: o.group, kind: o.kind || 'export', z: o.z, parts: (o.parts || []).length })), flights: FLIGHTS.length }),
  state: () => ({ base: eng.base, overlays: [...eng.active], histYear, terrain: eng.terrain, mode, zoom: eng.map.getZoom(), pitch: eng.map.getPitch(), layers: eng.map.getStyle().layers.map(l => l.id) })
};
