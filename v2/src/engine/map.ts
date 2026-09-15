// The one engine: MapLibre GL for 2D and 3D alike. 2D is the same scene at
// pitch 0. Bases crossfade with an opacity transition; overlays are inserted
// in declared z order before a fixed anchor; terrain and hillshade come from
// one DEM; globe only when zoomed far out.
import maplibregl, { Map as MLMap, type StyleSpecification, type LngLatLike } from 'maplibre-gl';
import { FLIGHTS, OVERLAYS, flightById, overlayById, histYear, setHistYear, HIST_YEARS, type OverlayDef, type FlightDef } from '../layers/registry';
import { rasterSource } from '../layers/transport';
import { Emitter } from './state';

export interface EngineEvents extends Record<string, unknown> {
  base: string;
  overlays: string[];
  opacity: { id: string; v: number };
  histYear: number;
  terrain: boolean;
  view: { zoom: number; pitch: number; bearing: number };
  loading: boolean;
  fps: number;
}

export const BASE_DIRECT: Record<string, { tiles: string[]; maxzoom: number; attribution: string; tileSize?: number }> = {
  esri: { tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], maxzoom: 19, attribution: 'Esri, Maxar, Earthstar Geographics' },
  gsat: { tiles: ['https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'], maxzoom: 20, attribution: 'Google' },
  osm:  { tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'], maxzoom: 19, attribution: '© OpenStreetMap contributors' }
};
export const BASE_LABELS: Record<string, { label: string; note: string }> = {
  esri: { label: '🛰️ Satellite (Esri)', note: 'global, always current' },
  gsat: { label: '🛰️ Satellite (Google)', note: '' },
  osm:  { label: '🗺️ Street map', note: '' }
};

const DEM_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
export const TERRAIN_EXAG = 1.5;
// a starfield for the space around the globe: one 512-px tile drawn once, set as the container background
function starfield(): string {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d')!;
  g.fillStyle = '#02030a'; g.fillRect(0, 0, 512, 512);
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 420; i++) { const x = rnd() * 512, y = rnd() * 512, r = rnd() * 1.3 + 0.2, a = rnd() * 0.7 + 0.3; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = `rgba(${220 + Math.round(rnd() * 35)},${225 + Math.round(rnd() * 30)},255,${a.toFixed(2)})`; g.fill(); }
  return c.toDataURL('image/png');
}
const OV_ANCHOR = 'ov-anchor';       // overlays are inserted before this
export const PROP_ANCHOR = 'prop-anchor';   // property vectors are inserted before this (above overlays)
// Leaflet-style (256-tile) zooms in the registry -> MapLibre (512-tile) zooms
export const ml = (leafletZoom: number) => leafletZoom - 1;

export class Engine {
  readonly map: MLMap;
  readonly events = new Emitter<EngineEvents>();
  base = 'esri';
  lastFlight = '2024';
  terrain = true;
  readonly active = new Set<string>();
  tilesInFlight = 0;
  quality: 'low' | 'medium' | 'high' = 'medium';
  readonly opacity = new Map<string, number>();
  private present = new Map<string, { z: number; layers: string[]; sources: string[] }>();
  private baseTimer: number | null = null;
  private baseSettle: (() => void) | null = null;
  private flightTimer: number | null = null;
  private histTimer: number | null = null;
  private histSlot = 0;
  private surveyVec: GeoJSON.FeatureCollection | null = null;

  constructor(container: HTMLElement, opts: { center: LngLatLike; zoom: number; bearing: number; pitch: number; pixelRatio?: number }) {
    const style: StyleSpecification = {
      version: 8,
      glyphs: location.origin + '/v2/fonts/{fontstack}/{range}.pbf',   // self-hosted, works from / and /v2/
      sources: {
        'base-esri': { type: 'raster', tileSize: 256, ...BASE_DIRECT.esri },
        dem: { type: 'raster-dem', tiles: [DEM_TILES], tileSize: 256, encoding: 'terrarium', maxzoom: 14, attribution: 'Terrain: Mapzen / AWS' }
      },
      layers: [
        { id: 'bg', type: 'background', paint: { 'background-color': '#04060a' } },
        { id: 'base-esri', type: 'raster', source: 'base-esri', paint: { 'raster-opacity': 1, 'raster-fade-duration': 150 } },
        { id: 'hillshade', type: 'hillshade', source: 'dem', layout: { visibility: 'none' },
          paint: { 'hillshade-exaggeration': 0.45, 'hillshade-shadow-color': '#0b1220', 'hillshade-highlight-color': '#ffffff', 'hillshade-accent-color': '#2a3a20' } },
        { id: OV_ANCHOR, type: 'background', layout: { visibility: 'none' }, paint: { 'background-opacity': 0 } },
        { id: PROP_ANCHOR, type: 'background', layout: { visibility: 'none' }, paint: { 'background-opacity': 0 } }
      ],
      sky: { 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7.5, 0] } as never
    };
    this.map = new maplibregl.Map({
      container, style, center: opts.center, zoom: opts.zoom, bearing: opts.bearing, pitch: opts.pitch,
      maxPitch: 80, minZoom: 1.5, maxZoom: 21, hash: false, attributionControl: false,
      pixelRatio: opts.pixelRatio ?? Math.min(window.devicePixelRatio || 1, 1.5),
      fadeDuration: 0, antialias: false, keyboard: false, dragRotate: true, touchPitch: true,
      canvasContextAttributes: { antialias: false, powerPreference: 'high-performance' } as never
    } as never);
    this.map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
    try { container.style.background = `#02030a url(${starfield()}) repeat`; } catch { /* no canvas */ }
    this.enableOrbit(container);
    this.map.on('load', () => this.onLoad());
    this.map.on('zoomend', () => this.projectionFor(this.map.getZoom()));
    this.map.on('move', () => this.events.emit('view', { zoom: this.map.getZoom(), pitch: this.map.getPitch(), bearing: this.map.getBearing() }));
    this.map.on('dataloading', () => { this.events.emit('loading', true); });
    this.map.on('idle', () => { this.tilesInFlight = 0; this.events.emit('loading', false); });
    this.startFps();
  }

  private onLoad() {
    this.setTerrain(this.terrain, true);
    this.projectionFor(this.map.getZoom());
  }

  // ---- projection & terrain ----------------------------------------------
  private projectionFor(zoom: number) {
    const want = zoom < 6.5 ? 'globe' : 'mercator';
    const cur = (this.map.getProjection() as { type?: string } | undefined)?.type || 'mercator';
    if (cur !== want) { try { this.map.setProjection({ type: want } as never); } catch { /* older engine */ } }
  }
  setTerrain(on: boolean, silent = false) {
    this.terrain = on;
    try {
      this.map.setTerrain(on ? { source: 'dem', exaggeration: 1.5 } : null);
      this.map.setLayoutProperty('hillshade', 'visibility', on ? 'visible' : 'none');
    } catch { /* not loaded yet */ }
    if (!silent) this.events.emit('terrain', on);
  }
  set3D(on: boolean) {
    this.map.easeTo({ pitch: on ? 62 : 0, duration: 900 });
    if (on && !this.terrain) this.setTerrain(true);
  }

  // ---- bases with crossfade ------------------------------------------------
  private ensureBase(id: string) {
    const src = 'base-' + id;
    if (this.map.getSource(src)) return src;
    const f = flightById(id);
    if (f) this.map.addSource(src, rasterSource({ kind: f.kind, svc: f.svc }, { transparent: false }));
    else if (BASE_DIRECT[id]) this.map.addSource(src, { type: 'raster', tileSize: 256, ...BASE_DIRECT[id] });
    else return null;
    return src;
  }
  setBase(id: string) {
    if (id === this.base && this.map.getLayer('base-' + id)) return;
    const src = this.ensureBase(id);
    if (!src) return;
    const lid = 'base-' + id, prev = 'base-' + this.base;
    if (flightById(id)) this.lastFlight = id;
    if (this.map.getLayer(lid)) this.map.removeLayer(lid);
    // the new imagery goes on top of the old one and fades in; the old is hidden once the new has drawn
    this.map.addLayer({ id: lid, type: 'raster', source: src, paint: { 'raster-opacity': 0, 'raster-fade-duration': 120, 'raster-opacity-transition': { duration: 320, delay: 0 } } }, 'hillshade');
    requestAnimationFrame(() => { try { this.map.setPaintProperty(lid, 'raster-opacity', 1); } catch { /* removed */ } });
    if (this.baseTimer) window.clearTimeout(this.baseTimer);
    if (this.baseSettle) this.map.off('idle', this.baseSettle);
    // only ever keep the base that is current at settle time - a later switch may have happened meanwhile
    const settle = () => {
      this.baseTimer = null; this.baseSettle = null;
      const keep = 'base-' + this.base;
      for (const l of this.map.getStyle().layers) {
        if (l.id.startsWith('base-') && l.id !== keep && this.map.getLayer(l.id)) this.map.removeLayer(l.id);
      }
    };
    this.base = id;
    if (prev !== lid) { this.baseSettle = settle; this.map.once('idle', settle); this.baseTimer = window.setTimeout(settle, 3500); }
    this.events.emit('base', id);
  }
  flightIndex(id: string) { const i = FLIGHTS.findIndex(f => f.id === id); return i < 0 ? FLIGHTS.length - 1 : i; }
  setFlight(idx: number, immediate: boolean) {
    const f: FlightDef = FLIGHTS[Math.max(0, Math.min(FLIGHTS.length - 1, idx))];
    if (this.flightTimer) window.clearTimeout(this.flightTimer);
    if (immediate) this.setBase(f.id); else this.flightTimer = window.setTimeout(() => this.setBase(f.id), 160);
  }

  // ---- overlays in declared z order ----------------------------------------
  private beforeFor(z: number): string {
    let best: string | null = null, bestZ = Infinity;
    for (const [, p] of this.present) if (p.layers.length && p.z > z && p.z < bestZ) { bestZ = p.z; best = p.layers[0]; }
    return best || OV_ANCHOR;
  }
  opacityOf(def: OverlayDef) { return this.opacity.get(def.id) ?? def.op; }
  private addRaster(def: OverlayDef, slot = '') {
    const before = this.beforeFor(def.z), op = this.opacityOf(def);
    const layers: string[] = [], sources: string[] = [];
    const parts = def.parts || [def];
    parts.forEach((p, i) => {
      const lid = 'ov-' + def.id + slot + (def.parts ? '-p' + i : ''), sid = 'src-' + lid;
      this.map.addSource(sid, rasterSource(p, { transparent: true, maxZoom: def.maxZoom }));
      this.map.addLayer({ id: lid, type: 'raster', source: sid, paint: { 'raster-opacity': op, 'raster-fade-duration': 150, 'raster-opacity-transition': { duration: 250, delay: 0 } } }, before);
      layers.push(lid); sources.push(sid);
    });
    return { layers, sources };
  }
  private async addImage(def: OverlayDef, entry: { z: number; layers: string[]; sources: string[] }) {
    const before = this.beforeFor(def.z), op = this.opacityOf(def), bb = def.bounds!;
    const sid = 'src-ov-' + def.id, lid = 'ov-' + def.id;
    this.map.addSource(sid, { type: 'image', url: def.url!, coordinates: [[bb[0][1], bb[1][0]], [bb[1][1], bb[1][0]], [bb[1][1], bb[0][0]], [bb[0][1], bb[0][0]]] });
    this.map.addLayer({ id: lid, type: 'raster', source: sid, paint: { 'raster-opacity': op, 'raster-fade-duration': 150 } }, before);
    const layers = entry.layers, sources = entry.sources;
    layers.push(lid); sources.push(sid);
    if (def.vector) {
      if (!this.surveyVec) {
        try {
          const s = await (await fetch(def.vector)).json() as { corners: { latlng: [number, number] }[]; calls: { bearing: string; distance_ft: number }[]; easement16: [number, number][][]; monuments: { at: [number, number]; label: string }[] };
          const feats: GeoJSON.Feature[] = [];
          const ring = s.corners.map(c => [c.latlng[1], c.latlng[0]]);
          ring.forEach((p, i) => { const q = ring[(i + 1) % ring.length], call = s.calls[i];
            feats.push({ type: 'Feature', properties: { k: 'call', tip: call ? `${call.bearing} · ${Number(call.distance_ft).toFixed(2)} ft` : 'surveyed line' }, geometry: { type: 'LineString', coordinates: [p, q] } }); });
          for (const poly of s.easement16 || []) feats.push({ type: 'Feature', properties: { k: 'ease', tip: '16 ft access easement — as drawn on the survey' }, geometry: { type: 'Polygon', coordinates: [[...poly.map(q => [q[1], q[0]]), [poly[0][1], poly[0][0]]]] } });
          for (const m of s.monuments || []) feats.push({ type: 'Feature', properties: { k: 'mon', tip: m.label }, geometry: { type: 'Point', coordinates: [m.at[1], m.at[0]] } });
          this.surveyVec = { type: 'FeatureCollection', features: feats };
        } catch (e) { console.warn('survey vectors', e); }
      }
      if (this.surveyVec && this.active.has(def.id) && this.present.get(def.id) === entry) {
        const vs = sid + '-vec';
        this.map.addSource(vs, { type: 'geojson', data: this.surveyVec });
        this.map.addLayer({ id: lid + '-ease', type: 'fill', source: vs, filter: ['==', ['get', 'k'], 'ease'], paint: { 'fill-color': '#ffc24d', 'fill-opacity': 0.3, 'fill-outline-color': '#ffc24d' } }, before);
        this.map.addLayer({ id: lid + '-line', type: 'line', source: vs, filter: ['==', ['get', 'k'], 'call'], paint: { 'line-color': '#7ff0ff', 'line-width': 2.5, 'line-dasharray': [3, 2] } }, before);
        this.map.addLayer({ id: lid + '-mon', type: 'circle', source: vs, filter: ['==', ['get', 'k'], 'mon'], paint: { 'circle-radius': 5, 'circle-color': '#7ff0ff', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } }, before);
        layers.push(lid + '-ease', lid + '-line', lid + '-mon'); sources.push(vs);
        for (const l of ['-line', '-mon', '-ease']) this.tipLayer(lid + l, p => String(p.tip || ''));
      }
    }
  }
  private remove(id: string) {
    const p = this.present.get(id); if (!p) return;
    for (const l of p.layers) if (this.map.getLayer(l)) this.map.removeLayer(l);
    for (const s of p.sources) if (this.map.getSource(s)) this.map.removeSource(s);
    this.present.delete(id);
  }
  setOverlay(id: string, on: boolean) {
    const def = overlayById(id); if (!def) return;
    if (on === this.active.has(id)) return;
    if (on) {
      this.active.add(id);
      const entry = { z: def.z, layers: [] as string[], sources: [] as string[] };
      this.present.set(id, entry);
      if (def.kind === 'image') { this.addImage(def, entry); }   // raster now, surveyed vectors when they arrive
      else { const r = this.addRaster(def); entry.layers = r.layers; entry.sources = r.sources; }
      // a regional sheet switched on while zoomed in tight: pull back so it can actually be seen
      if (def.maxZoom && this.map.getZoom() > ml(def.maxZoom) + 1.5) this.map.flyTo({ zoom: ml(def.maxZoom) + 0.5, duration: 1100 });
      if (def.bounds) {
        const b = new maplibregl.LngLatBounds([def.bounds[0][1], def.bounds[0][0]], [def.bounds[1][1], def.bounds[1][0]]);
        const v = this.map.getBounds();
        if (!(v.contains(b.getNorthEast()) || v.contains(b.getSouthWest()) || b.contains(v.getCenter()))) this.map.fitBounds(b, { padding: 60, duration: 1200 });
      }
    } else {
      this.active.delete(id);
      this.remove(id);
    }
    this.events.emit('overlays', [...this.active]);
  }
  toggleOverlay(id: string) { return this.setOverlay(id, !this.active.has(id)); }
  setOpacity(id: string, v: number) {
    const def = overlayById(id); if (!def) return;
    this.opacity.set(id, v);
    const p = this.present.get(id);
    if (p) for (const l of p.layers) { const lyr = this.map.getLayer(l); if (lyr && lyr.type === 'raster') this.map.setPaintProperty(l, 'raster-opacity', v); }
    this.events.emit('opacity', { id, v });
  }
  // the historic-topo year changed: rebuild that layer, new above old, old removed once the new has drawn
  setHistYear(year: number, immediate: boolean) {
    if (!HIST_YEARS.includes(year)) return;
    if (this.histTimer) window.clearTimeout(this.histTimer);
    const apply = () => {
      if (year === histYear && this.present.has('histtopo')) return;
      setHistYear(year);
      this.events.emit('histYear', year);
      if (!this.active.has('histtopo')) return;
      const def = overlayById('histtopo')!, old = this.present.get('histtopo');
      this.histSlot ^= 1;
      const r = this.addRaster(def, this.histSlot ? '~' : '');
      this.present.set('histtopo', { z: def.z, layers: r.layers, sources: r.sources });
      const settle = () => { if (old) { for (const l of old.layers) if (this.map.getLayer(l)) this.map.removeLayer(l); for (const s of old.sources) if (this.map.getSource(s)) this.map.removeSource(s); } };
      if (old) { this.map.once('idle', settle); window.setTimeout(settle, 3500); }
    };
    if (immediate) apply(); else this.histTimer = window.setTimeout(apply, 180);
  }

  // ---- perf ------------------------------------------------------------------
  private startFps() {
    let frames = 0, last = performance.now();
    const tick = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 1000) { this.events.emit('fps', Math.round(frames * 1000 / (now - last))); frames = 0; last = now; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  // ground height under a point from the terrain DEM (exaggeration removed), metres; null when terrain is off / unknown
  groundElevation(lngLat: LngLatLike): number | null {
    if (!this.terrain) return null;
    try { const v = this.map.queryTerrainElevation(lngLat); return v == null || !isFinite(v) ? null : v / TERRAIN_EXAG; } catch { return null; }
  }

  // ---- hover tips (survey calls, monuments, ...) ---------------------------
  private tip: maplibregl.Popup | null = null;
  private tipLayers = new Set<string>();
  tipLayer(layerId: string, text: (p: Record<string, unknown>) => string) {
    if (this.tipLayers.has(layerId)) return;
    this.tipLayers.add(layerId);
    const m = this.map;
    m.on('mousemove', layerId, e => {
      const f = e.features?.[0]; if (!f) return;
      if (!this.tip) this.tip = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'tip', offset: 10, maxWidth: '260px' });
      this.tip.setLngLat(e.lngLat).setText(text(f.properties as Record<string, unknown>)).addTo(m);
      m.getCanvas().style.cursor = 'crosshair';
    });
    m.on('mouseleave', layerId, () => { this.tip?.remove(); m.getCanvas().style.cursor = ''; });
  }

  // ---- middle-mouse orbit: drag right = turn right, drag up = tilt up, with inertia ------
  private enableOrbit(container: HTMLElement) {
    const m = this.map; let on = false, lx = 0, ly = 0, vb = 0, vp = 0, last = 0, pend: number | null = null, db = 0, dp = 0;
    const apply = () => { pend = null; if (!db && !dp) return; m.jumpTo({ bearing: m.getBearing() + db, pitch: Math.max(0, Math.min(80, m.getPitch() + dp)) }); db = dp = 0; };
    container.addEventListener('mousedown', e => { if (e.button !== 1) return; e.preventDefault(); on = true; lx = e.clientX; ly = e.clientY; vb = vp = 0; last = performance.now(); container.style.cursor = 'grabbing'; });
    window.addEventListener('mousemove', e => {
      if (!on) return;
      const dx = e.clientX - lx, dy = e.clientY - ly, now = performance.now(), dt = Math.max(1, now - last); lx = e.clientX; ly = e.clientY; last = now;
      db += dx * 0.35; dp += -dy * 0.35; vb = dx * 0.35 / dt; vp = -dy * 0.35 / dt;
      if (pend == null) pend = requestAnimationFrame(apply);
    });
    const end = () => {
      if (!on) return; on = false; container.style.cursor = '';
      const idle = performance.now() - last; if (idle > 80) return;      // the hand stopped before letting go
      const k = 260;                                                       // ms of glide
      m.easeTo({ bearing: m.getBearing() + vb * k, pitch: Math.max(0, Math.min(80, m.getPitch() + vp * k)), duration: 650, easing: t => 1 - Math.pow(1 - t, 3) });
    };
    window.addEventListener('mouseup', e => { if (e.button === 1) end(); });
    window.addEventListener('blur', end);
    container.addEventListener('auxclick', e => { if (e.button === 1) e.preventDefault(); });
  }

  // tiles still loading right now, counted from the source caches (aborted requests never drift it)
  tilesLoading(): number {
    try {
      const caches = (this.map as unknown as { style: { sourceCaches: Record<string, { _tiles: Record<string, { state: string }> }> } }).style.sourceCaches;
      let n = 0;
      for (const sc of Object.values(caches)) for (const t of Object.values(sc._tiles)) if (t.state === 'loading' || t.state === 'reloading') n++;
      this.tilesInFlight = n;
      return n;
    } catch { return this.tilesInFlight; }
  }
  setQuality(q: 'low' | 'medium' | 'high') {
    this.quality = q;
    const pr = q === 'low' ? 1 : q === 'medium' ? Math.min(window.devicePixelRatio || 1, 1.5) : (window.devicePixelRatio || 1);
    try { (this.map as unknown as { setPixelRatio: (n: number) => void }).setPixelRatio(pr); } catch { /* n/a */ }
    try { localStorage.setItem('atlasQuality', q); } catch { /* fine */ }
  }
  overlaysSorted(): OverlayDef[] { return OVERLAYS.filter(o => this.active.has(o.id)); }
}
