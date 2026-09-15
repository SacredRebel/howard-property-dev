import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import { Engine } from './engine/map';
import { PropertyLayer } from './data/properties';
import { Hud } from './ui/hud';
import { DEFAULT_STATE, readHash, writeHash, type AppState } from './engine/state';
import { FLIGHTS, OVERLAYS, GROUPS, histYear, overlayById } from './layers/registry';

const state: AppState = { ...DEFAULT_STATE, ...readHash() };
const app = document.getElementById('app')!;
const mapEl = document.createElement('div'); mapEl.id = 'map'; app.appendChild(mapEl);

const eng = new Engine(mapEl, { center: [state.lng, state.lat], zoom: state.zoom, bearing: state.bearing, pitch: state.pitch });
eng.terrain = state.terrain;
const props = new PropertyLayer(eng);
let mode = state.mode;
const hud = new Hud(app, { eng, props, mode, onMode: m => { mode = m; props.applyMode(m); persist(); } });

function persist() {
  const c = eng.map.getCenter();
  writeHash({ lng: c.lng, lat: c.lat, zoom: eng.map.getZoom(), bearing: eng.map.getBearing(), pitch: eng.map.getPitch(), base: eng.base, histYear, layers: [...eng.active], mode, terrain: eng.terrain });
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
  } catch (e) { console.error('properties', e); }
}
if (eng.map.loaded()) boot(); else eng.map.once('load', boot);

// test hooks
declare global { interface Window { atlas: { eng: Engine; props: PropertyLayer; hud: Hud; catalog: () => unknown; state: () => unknown }; } }
window.atlas = {
  eng, props, hud,
  catalog: () => ({ groups: GROUPS.length, overlays: OVERLAYS.map(o => ({ id: o.id, group: o.group, kind: o.kind || 'export', z: o.z, parts: (o.parts || []).length })), flights: FLIGHTS.length }),
  state: () => ({ base: eng.base, overlays: [...eng.active], histYear, terrain: eng.terrain, mode, zoom: eng.map.getZoom(), pitch: eng.map.getPitch(), layers: eng.map.getStyle().layers.map(l => l.id) })
};
