// Properties come from /api/properties (the same modules the classic page
// uses, positions already applied). Boundaries are exact geometry - county
// ring or surveyed traverse - drawn as glow + animated rainbow line on the GPU;
// zone territories are polygons (Sulphur) or 15 m circles coloured by type;
// zones are one symbol layer with rasterised emoji badges that reveal per
// property (a huge ranch shows its icons while a small neighbour's stay tucked);
// property chips are six HTML markers that tuck away once their zones show.
import maplibregl from 'maplibre-gl';
import type { Engine } from '../engine/map';
import { PROP_ANCHOR } from '../engine/map';

export interface Segment { id: string; coordinates: [number, number][]; description?: string; length?: string; bearing?: string; }
export interface Zone { id: string; name: string; emoji?: string; icon?: string; position: [number, number]; polygon?: [number, number][]; mode?: 'current' | 'vision' | 'both'; type?: string; description?: string; budget?: string; timeline?: string; roi?: string; monthlyRevenue?: string; features?: string[]; color?: string; }
export interface Lot { id: string; apn: string; name: string; acreage: string; rings: [number, number][][]; }
export interface StatusBlock { badge?: string; rows?: [string, string][]; note?: string; }
export interface Property {
  id: string; name: string; shortLabel: string; labelChip?: string; visionLabelChip?: string;
  center: [number, number]; zoom: number; apn?: string; county?: string;
  boundary: Segment[]; zones: Zone[]; lots?: Lot[];
  status?: { today?: StatusBlock; vision?: StatusBlock };
  docs?: { label: string; file: string }[];
  footerTitle?: string; footerInfo?: string[];
}
export interface LotPick { pid: string; lid: string; apn: string; name: string; acreage: string; }

// the classic page's zone palette, so the territories look the same on both maps
export const ZONE_COLORS: Record<string, string> = {
  agriculture: '#4CAF50', residential: '#2196F3', community: '#FF9800', hospitality: '#9C27B0', infrastructure: '#607D8B',
  creative: '#795548', ceremonial: '#E91E63', wellness: '#00BCD4', landscape: '#8BC34A', beekeeping: '#FFD700', events: '#FF6B6B',
  water: '#0288D1', energy: '#f4a020', default: '#9c6ad4'
};
export const zoneColor = (z: Zone) => z.color || ZONE_COLORS[z.type || ''] || ZONE_COLORS.default;
// Leaflet zoom -> MapLibre zoom (256- vs 512-px tiles); a property's zones reveal at its zoom - 2.5 (classic rule)
export const revealZoom = (p: Property) => (p.zoom || 15) - 2.5 - 1;

export function stitch(p: Property): [number, number][] {
  const pts: [number, number][] = [];
  for (const seg of p.boundary || []) {
    const c = seg.coordinates || [];
    for (let i = 0; i < c.length - 1; i++) pts.push([c[i][1], c[i][0]]);
  }
  if (pts.length) pts.push([...pts[0]] as [number, number]);
  return pts;
}
// a 15 m circle around a point (the classic territory), 24 vertices
function circle(lat: number, lng: number, r = 15): [number, number][] {
  const out: [number, number][] = [], dLat = r / 111320, dLng = r / (111320 * Math.cos(lat * Math.PI / 180));
  for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2; out.push([lng + Math.cos(a) * dLng, lat + Math.sin(a) * dLat]); }
  return out;
}
export function lotBounds(lot: Lot): maplibregl.LngLatBounds {
  const b = new maplibregl.LngLatBounds();
  for (const r of lot.rings || []) for (const q of r) b.extend([q[1], q[0]]);
  return b;
}

function badge(emoji: string, color: string): ImageData {
  const s = 64, c = document.createElement('canvas'); c.width = s; c.height = s;
  const g = c.getContext('2d')!;
  g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 3, 0, Math.PI * 2); g.fillStyle = 'rgba(8,12,10,0.86)'; g.fill();
  g.lineWidth = 3; g.strokeStyle = color; g.stroke();
  g.font = '34px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(emoji, s / 2, s / 2 + 2);
  return g.getImageData(0, 0, s, s);
}

// the rainbow: 12 hue stops along each boundary, phase-shifted for the animation
export function rainbow(phase: number): maplibregl.ExpressionSpecification {
  const e: unknown[] = ['interpolate', ['linear'], ['line-progress']];
  const n = 12;
  for (let i = 0; i <= n; i++) { const t = i / n, hue = Math.round(((t + phase) % 1) * 360); e.push(t, `hsl(${hue}, 95%, 62%)`); }
  return e as maplibregl.ExpressionSpecification;
}
// zoom-and-property opacity: 1 once the map zoom passes the feature's own reveal zoom (0.5-step ladder)
function revealOpacity(max = 1, floor = 9): maplibregl.ExpressionSpecification {
  const e: unknown[] = ['step', ['zoom'], 0];
  for (let z = 9; z <= 16; z += 0.5) e.push(z, z < floor ? 0 : ['case', ['<=', ['get', 'minz'], z], max, 0]);
  return e as maplibregl.ExpressionSpecification;
}

export class PropertyLayer {
  props: Property[] = [];
  private markers: maplibregl.Marker[] = [];
  private icons = new Set<string>();
  onSelect: (kind: 'property' | 'zone' | 'lot', payload: unknown) => void = () => {};
  mode: 'today' | 'vision' = 'today';
  private phase = 0;
  private rainbowTimer: number | null = null;
  selectedLot: string | null = null;

  constructor(private eng: Engine) {}

  async load(): Promise<Property[]> {
    const r = await fetch('/api/properties');
    this.props = await r.json();
    return this.props;
  }

  bounds(): maplibregl.LngLatBounds {
    const b = new maplibregl.LngLatBounds();
    for (const p of this.props) for (const q of stitch(p)) b.extend(q);
    return b;
  }

  private editing: string | null = null;
  private zoneFeatures(): GeoJSON.Feature[] {
    const m = this.eng.map, zones: GeoJSON.Feature[] = [];
    for (const p of this.props) for (const z of p.zones || []) {
      const emoji = z.emoji || z.icon || '📍', color = zoneColor(z);
      const key = 'z-' + emoji + '-' + color.replace('#', '');
      if (!this.icons.has(key)) { try { m.addImage(key, badge(emoji, color), { pixelRatio: 2 }); this.icons.add(key); } catch { /* dup */ } }
      zones.push({ type: 'Feature', properties: { pid: p.id, zid: z.id, name: z.name, icon: key, mode: z.mode || 'both', minz: revealZoom(p) }, geometry: { type: 'Point', coordinates: [z.position[1], z.position[0]] } });
    }
    return zones;
  }
  private territoryFeatures(): GeoJSON.Feature[] {
    const out: GeoJSON.Feature[] = [];
    for (const p of this.props) for (const z of p.zones || []) {
      const ring: [number, number][] = z.polygon && z.polygon.length > 2 ? [...z.polygon.map(q => [q[1], q[0]] as [number, number]), [z.polygon[0][1], z.polygon[0][0]]] : circle(z.position[0], z.position[1]);
      out.push({ type: 'Feature', properties: { pid: p.id, zid: z.id, mode: z.mode || 'both', color: zoneColor(z), minz: revealZoom(p), kind: z.polygon ? 'poly' : 'circle' }, geometry: { type: 'Polygon', coordinates: [ring] } });
    }
    return out;
  }
  refreshZones() {
    const src = this.eng.map.getSource('zones') as maplibregl.GeoJSONSource | undefined; if (src) src.setData({ type: 'FeatureCollection', features: this.zoneFeatures() });
    const t = this.eng.map.getSource('terr') as maplibregl.GeoJSONSource | undefined; if (t) t.setData({ type: 'FeatureCollection', features: this.territoryFeatures() });
  }
  setEditing(pid: string | null) { this.editing = pid; this.applyMode(this.mode); }

  build() {
    const m = this.eng.map;
    const bounds: GeoJSON.Feature[] = [], rings: GeoJSON.Feature[] = [], lots: GeoJSON.Feature[] = [];
    for (const p of this.props) {
      const ring = stitch(p);
      if (ring.length > 3) {
        bounds.push({ type: 'Feature', properties: { pid: p.id, name: p.name }, geometry: { type: 'Polygon', coordinates: [ring] } });
        // the rainbow needs line-progress along the ring, which geojson-vt only measures for LineStrings
        rings.push({ type: 'Feature', properties: { pid: p.id }, geometry: { type: 'LineString', coordinates: ring } });
      }
      for (const lot of p.lots || []) for (const r of lot.rings || []) {
        const rr = r.map(q => [q[1], q[0]] as [number, number]); if (rr.length && (rr[0][0] !== rr[rr.length - 1][0] || rr[0][1] !== rr[rr.length - 1][1])) rr.push([...rr[0]] as [number, number]);
        lots.push({ type: 'Feature', properties: { pid: p.id, lid: lot.id, apn: lot.apn, name: lot.name, acreage: lot.acreage }, geometry: { type: 'Polygon', coordinates: [rr] } });
      }
    }
    const zones = this.zoneFeatures();
    m.addSource('props', { type: 'geojson', data: { type: 'FeatureCollection', features: bounds } });
    m.addSource('propline', { type: 'geojson', data: { type: 'FeatureCollection', features: rings }, lineMetrics: true });
    m.addSource('lots', { type: 'geojson', data: { type: 'FeatureCollection', features: lots } });
    m.addSource('terr', { type: 'geojson', data: { type: 'FeatureCollection', features: this.territoryFeatures() } });
    m.addSource('zones', { type: 'geojson', data: { type: 'FeatureCollection', features: zones } });
    const reveal = revealOpacity();
    m.addLayer({ id: 'lot-fill', type: 'fill', source: 'lots', paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.04 } }, PROP_ANCHOR);
    m.addLayer({ id: 'lot-line', type: 'line', source: 'lots', paint: { 'line-color': '#ffffff', 'line-width': 1.2, 'line-opacity': 0.8 } }, PROP_ANCHOR);
    m.addLayer({ id: 'lot-sel', type: 'line', source: 'lots', filter: ['==', ['get', 'lid'], ''], layout: { 'line-join': 'round' }, paint: { 'line-color': '#7ff0ff', 'line-width': 3, 'line-opacity': 0.95 } }, PROP_ANCHOR);
    m.addLayer({ id: 'prop-fill', type: 'fill', source: 'props', paint: { 'fill-color': '#e0b64a', 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.18, 13, 0.05] } }, PROP_ANCHOR);
    m.addLayer({ id: 'prop-glow', type: 'line', source: 'propline', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#e0b64a', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 4, 16, 14], 'line-blur': ['interpolate', ['linear'], ['zoom'], 10, 3, 16, 9], 'line-opacity': 0.55 } }, PROP_ANCHOR);
    m.addLayer({ id: 'prop-line', type: 'line', source: 'propline', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-gradient': rainbow(0), 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.8, 16, 4], 'line-opacity': 0.98 } }, PROP_ANCHOR);
    // territories: the coloured ground each zone claims (polygon where surveyed, 15 m circle otherwise)
    m.addLayer({ id: 'terr-fill', type: 'fill', source: 'terr', minzoom: 10, paint: { 'fill-color': ['get', 'color'], 'fill-opacity': revealOpacity(0.28), 'fill-opacity-transition': { duration: 350, delay: 0 } } }, PROP_ANCHOR);
    m.addLayer({ id: 'terr-line', type: 'line', source: 'terr', minzoom: 10, paint: { 'line-color': ['get', 'color'], 'line-width': 1.6, 'line-opacity': revealOpacity(0.85), 'line-opacity-transition': { duration: 350, delay: 0 } } }, PROP_ANCHOR);
    // a searched / clicked parcel that is not one of ours: cyan dashed outline (the research candidate)
    m.addSource('cand', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    m.addLayer({ id: 'cand-fill', type: 'fill', source: 'cand', paint: { 'fill-color': '#7ff0ff', 'fill-opacity': 0.08 } }, PROP_ANCHOR);
    m.addLayer({ id: 'cand-line', type: 'line', source: 'cand', layout: { 'line-join': 'round' }, paint: { 'line-color': '#7ff0ff', 'line-width': 2.4, 'line-dasharray': [2, 1.2], 'line-opacity': 0.95 } }, PROP_ANCHOR);
    m.addLayer({ id: 'zones', type: 'symbol', source: 'zones', minzoom: 9, layout: {
      'icon-image': ['get', 'icon'], 'icon-size': ['interpolate', ['linear'], ['zoom'], 12, 0.45, 16, 0.8, 19, 1.0], 'icon-allow-overlap': true, 'icon-ignore-placement': true,
      'text-field': ['get', 'name'], 'text-font': ['Open Sans Semibold'], 'text-size': ['interpolate', ['linear'], ['zoom'], 12.5, 4, 14.5, 10.5, 18, 13], 'text-offset': [0, 1.9], 'text-anchor': 'top', 'text-optional': true
    }, paint: { 'icon-opacity': reveal, 'text-opacity': revealOpacity(1, 13.5), 'icon-opacity-transition': { duration: 350, delay: 0 }, 'text-opacity-transition': { duration: 350, delay: 0 }, 'text-color': '#f3f6ee', 'text-halo-color': 'rgba(5,8,6,0.9)', 'text-halo-width': 1.3 } });
    this.applyMode(this.mode);
    this.buildChips();
    this.startRainbow();

    const revealed = (f: maplibregl.MapGeoJSONFeature) => m.getZoom() >= Number(f.properties.minz ?? 0);
    m.on('click', 'zones', e => { const f = e.features?.[0]; if (f && revealed(f)) { const p = this.props.find(x => x.id === f.properties.pid); const z = p?.zones.find(x => x.id === f.properties.zid); if (p && z) this.onSelect('zone', { property: p, zone: z }); } });
    m.on('click', 'terr-fill', e => { if (m.queryRenderedFeatures(e.point, { layers: ['zones'] }).some(revealed)) return; const f = e.features?.[0]; if (f && revealed(f)) { const p = this.props.find(x => x.id === f.properties.pid); const z = p?.zones.find(x => x.id === f.properties.zid); if (p && z) this.onSelect('zone', { property: p, zone: z }); } });
    m.on('click', 'prop-fill', e => { if (m.queryRenderedFeatures(e.point, { layers: ['zones', 'terr-fill'] }).some(revealed)) return; const f = e.features?.[0]; const p = f && this.props.find(x => x.id === f.properties.pid); if (p) this.onSelect('property', p); });
    m.on('click', 'lot-fill', e => { if (m.queryRenderedFeatures(e.point, { layers: ['zones', 'terr-fill'] }).some(revealed)) return; if (m.queryRenderedFeatures(e.point, { layers: ['prop-fill'] }).length && m.getZoom() < 14) return; const f = e.features?.[0]; if (f) { this.selectLot(String(f.properties.lid)); this.onSelect('lot', f.properties as unknown as LotPick); } });
    for (const l of ['zones', 'prop-fill', 'lot-fill', 'terr-fill']) { m.on('mouseenter', l, () => { m.getCanvas().style.cursor = 'pointer'; }); m.on('mouseleave', l, () => { m.getCanvas().style.cursor = ''; }); }
    m.on('zoom', () => this.tuckChips());
    this.tuckChips();
  }

  // true when the map is over any of our own features (the ground readout stays out of the way then)
  // the research candidate: rings in [lat, lng] order (as the county returns them via the record) or [lng, lat] GeoJSON
  showCandidate(rings: [number, number][][] | null, label = '') {
    const src = this.eng.map.getSource('cand') as maplibregl.GeoJSONSource | undefined; if (!src) return;
    const feats: GeoJSON.Feature[] = rings && rings.length ? [{ type: 'Feature', properties: { label }, geometry: { type: 'Polygon', coordinates: rings.map(r => r.map(q => [q[0], q[1]] as [number, number])) } }] : [];
    src.setData({ type: 'FeatureCollection', features: feats });
  }
  clearCandidate() { this.showCandidate(null); }
  // fly to a lon/lat bbox {xmin,ymin,xmax,ymax} the way flyToLot does (works with terrain and pitch)
  flyToBox(b: { xmin: number; ymin: number; xmax: number; ymax: number }) {
    const m = this.eng.map;
    const bounds = new maplibregl.LngLatBounds([b.xmin, b.ymin], [b.xmax, b.ymax]);
    const cam = m.cameraForBounds(bounds, { padding: { top: 90, bottom: 150, left: 40, right: 40 }, maxZoom: 17 });
    if (!cam) return;
    m.flyTo({ center: cam.center as maplibregl.LngLatLike, zoom: Math.min(cam.zoom ?? 15, 17), pitch: this.eng.terrain ? Math.max(m.getPitch(), 40) : m.getPitch(), curve: 1.4, speed: 1.1, essential: true });
  }
  hitsOwn(point: maplibregl.Point): boolean {
    const m = this.eng.map, z = m.getZoom();
    return m.queryRenderedFeatures(point, { layers: ['zones', 'terr-fill', 'prop-fill', 'lot-fill'].filter(l => !!m.getLayer(l)) }).some(f => f.properties.minz == null || z >= Number(f.properties.minz));
  }

  selectLot(lid: string | null) {
    this.selectedLot = lid;
    if (this.eng.map.getLayer('lot-sel')) this.eng.map.setFilter('lot-sel', ['==', ['get', 'lid'], lid || '']);
  }
  lotOf(pid: string, lid: string): { property: Property; lot: Lot } | null {
    const p = this.props.find(x => x.id === pid); const lot = p?.lots?.find(l => l.id === lid);
    return p && lot ? { property: p, lot } : null;
  }
  flyToLot(pid: string, lid: string) {
    const hit = this.lotOf(pid, lid); if (!hit) return;
    const m = this.eng.map, b = lotBounds(hit.lot);
    // cameraForBounds is computed for a flat view; the tilt is applied by the flight itself (a fit with pitch + terrain can bail out)
    const cam = m.cameraForBounds(b, { padding: { top: 90, bottom: 150, left: 40, right: 40 }, maxZoom: 17, bearing: m.getBearing() });
    const pitch = this.eng.terrain ? Math.max(m.getPitch(), 40) : m.getPitch();
    m.flyTo({ center: cam?.center ?? b.getCenter(), zoom: cam?.zoom ?? 15.5, pitch, bearing: m.getBearing(), curve: 1.4, speed: 1.1, essential: true });
  }

  // the rainbow crawls along every boundary. Each step is one paint-property change, which costs a
  // full scene render, so it runs at 6 fps and only while the map rests, nothing is loading and the
  // tab is visible - the map still renders nothing at all when you are not looking at it.
  private startRainbow() {
    if (this.rainbowTimer) return;
    const m = this.eng.map;
    this.rainbowTimer = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || m.isMoving() || !m.getLayer('prop-line') || this.eng.tilesLoading() > 0) return;
      this.phase = (this.phase + 0.02) % 1;
      m.setPaintProperty('prop-line', 'line-gradient', rainbow(this.phase));
    }, 166);
  }
  pauseRainbow(on: boolean) { if (!on && this.rainbowTimer) { window.clearInterval(this.rainbowTimer); this.rainbowTimer = null; } else if (on) this.startRainbow(); }

  applyMode(mode: 'today' | 'vision') {
    this.mode = mode;
    const m = this.eng.map;
    const modeFilter: maplibregl.FilterSpecification = ['all', ['any', ['==', ['get', 'mode'], 'both'], ['==', ['get', 'mode'], mode === 'today' ? 'current' : 'vision']], ['!=', ['get', 'pid'], this.editing || '']];
    for (const l of ['zones', 'terr-fill', 'terr-line']) if (m.getLayer(l)) m.setFilter(l, modeFilter);
    for (const mk of this.markers) { const el = mk.getElement(); const p = this.props.find(x => x.id === el.dataset.pid); if (p) el.textContent = (mode === 'vision' && p.visionLabelChip) || p.labelChip || p.shortLabel || p.name; }
  }

  private buildChips() {
    for (const mk of this.markers) mk.remove();
    this.markers = [];
    for (const p of this.props) {
      const el = document.createElement('div');
      el.className = 'chip'; el.dataset.pid = p.id; el.dataset.minz = String(revealZoom(p));
      el.textContent = p.labelChip || p.shortLabel || p.name;
      el.addEventListener('click', ev => { ev.stopPropagation(); this.flyTo(p); this.onSelect('property', p); });
      const mk = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([p.center[1], p.center[0]]).addTo(this.eng.map);
      this.markers.push(mk);
    }
  }
  // a chip tucks away once its property's zones are showing (or, for a property without zones, once you are well inside it)
  private tuckChips() {
    const z = this.eng.map.getZoom();
    for (const mk of this.markers) { const el = mk.getElement(); const off = z >= Number(el.dataset.minz); if (el.classList.contains('off') !== off) el.classList.toggle('off', off); }
  }

  // a cinematic approach: parabolic flight, settling into a gentle tilt when terrain is on
  flyTo(p: Property) {
    const m = this.eng.map, ring = stitch(p);
    const pitch = this.eng.terrain ? Math.max(m.getPitch(), 48) : m.getPitch();
    if (ring.length > 3) {
      const b = new maplibregl.LngLatBounds(); for (const q of ring) b.extend(q);
      const cam = m.cameraForBounds(b, { padding: { top: 90, bottom: 150, left: 40, right: 40 }, maxZoom: p.zoom - 1 });
      m.flyTo({ center: cam?.center ?? [p.center[1], p.center[0]], zoom: Math.min(cam?.zoom ?? p.zoom - 1, p.zoom - 1), pitch, bearing: m.getBearing(), curve: 1.55, speed: 0.9, essential: true });
    } else m.flyTo({ center: [p.center[1], p.center[0]], zoom: p.zoom - 1, pitch, curve: 1.55, speed: 0.9, essential: true });
  }
  // the portal: a 4 s dive from high above into the Vision of a property
  dive(p: Property, onArrive?: () => void) {
    const m = this.eng.map;
    if (!this.eng.terrain) this.eng.setTerrain(true);
    m.flyTo({ center: [p.center[1], p.center[0]], zoom: Math.max((p.zoom || 15.5) - 1.2, 12.8), pitch: 62, bearing: -24, duration: 4200, curve: 1.7, essential: true });
    if (onArrive) m.once('moveend', onArrive);
  }
}
