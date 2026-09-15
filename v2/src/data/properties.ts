// Properties come from /api/properties (the same modules the classic page
// uses, positions already applied). Boundaries are exact geometry - county
// ring or surveyed traverse - drawn as glow + line on the GPU; zones are one
// symbol layer with rasterised emoji badges; property chips are six HTML markers.
import maplibregl from 'maplibre-gl';
import type { Engine } from '../engine/map';
import { PROP_ANCHOR } from '../engine/map';

export interface Segment { id: string; coordinates: [number, number][]; description?: string; length?: string; bearing?: string; }
export interface Zone { id: string; name: string; emoji?: string; icon?: string; position: [number, number]; mode?: 'current' | 'vision' | 'both'; type?: string; description?: string; budget?: string; timeline?: string; roi?: string; monthlyRevenue?: string; features?: string[]; color?: string; }
export interface Lot { id: string; apn: string; name: string; acreage: string; rings: [number, number][][]; }
export interface StatusBlock { badge?: string; rows?: [string, string][]; note?: string; }
export interface Property {
  id: string; name: string; shortLabel: string; labelChip?: string; visionLabelChip?: string;
  center: [number, number]; zoom: number; apn?: string;
  boundary: Segment[]; zones: Zone[]; lots?: Lot[];
  status?: { today?: StatusBlock; vision?: StatusBlock };
  docs?: { label: string; file: string }[];
  footerTitle?: string; footerInfo?: string[];
}

const ZONE_COLORS: Record<string, string> = { agriculture: '#7cb35f', residential: '#e0b64a', community: '#4ab3d1', wellness: '#00838F', ceremonial: '#C2185B', creative: '#D84315', water: '#3d7fd1', energy: '#f4a020', default: '#9c6ad4' };

export function stitch(p: Property): [number, number][] {
  const pts: [number, number][] = [];
  for (const seg of p.boundary || []) {
    const c = seg.coordinates || [];
    for (let i = 0; i < c.length - 1; i++) pts.push([c[i][1], c[i][0]]);
  }
  if (pts.length) pts.push([...pts[0]] as [number, number]);
  return pts;
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

export class PropertyLayer {
  props: Property[] = [];
  private markers: maplibregl.Marker[] = [];
  private icons = new Set<string>();
  onSelect: (kind: 'property' | 'zone' | 'lot', payload: unknown) => void = () => {};
  mode: 'today' | 'vision' = 'today';

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

  build() {
    const m = this.eng.map;
    const bounds: GeoJSON.Feature[] = [], lots: GeoJSON.Feature[] = [], zones: GeoJSON.Feature[] = [];
    for (const p of this.props) {
      const ring = stitch(p);
      if (ring.length > 3) bounds.push({ type: 'Feature', properties: { pid: p.id, name: p.name }, geometry: { type: 'Polygon', coordinates: [ring] } });
      for (const lot of p.lots || []) for (const r of lot.rings || []) {
        const rr = r.map(q => [q[1], q[0]] as [number, number]); if (rr.length && (rr[0][0] !== rr[rr.length - 1][0] || rr[0][1] !== rr[rr.length - 1][1])) rr.push([...rr[0]] as [number, number]);
        lots.push({ type: 'Feature', properties: { pid: p.id, lid: lot.id, apn: lot.apn, name: lot.name, acreage: lot.acreage }, geometry: { type: 'Polygon', coordinates: [rr] } });
      }
      for (const z of p.zones || []) {
        const emoji = z.emoji || z.icon || '📍', color = z.color || ZONE_COLORS[z.type || ''] || ZONE_COLORS.default;
        const key = 'z-' + emoji + '-' + color.replace('#', '');
        if (!this.icons.has(key)) { try { m.addImage(key, badge(emoji, color), { pixelRatio: 2 }); this.icons.add(key); } catch { /* dup */ } }
        zones.push({ type: 'Feature', properties: { pid: p.id, zid: z.id, name: z.name, icon: key, mode: z.mode || 'both' }, geometry: { type: 'Point', coordinates: [z.position[1], z.position[0]] } });
      }
    }
    m.addSource('props', { type: 'geojson', data: { type: 'FeatureCollection', features: bounds } });
    m.addSource('lots', { type: 'geojson', data: { type: 'FeatureCollection', features: lots } });
    m.addSource('zones', { type: 'geojson', data: { type: 'FeatureCollection', features: zones } });
    m.addLayer({ id: 'lot-fill', type: 'fill', source: 'lots', paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.04 } }, PROP_ANCHOR);
    m.addLayer({ id: 'lot-line', type: 'line', source: 'lots', paint: { 'line-color': '#ffffff', 'line-width': 1.2, 'line-opacity': 0.8 } }, PROP_ANCHOR);
    m.addLayer({ id: 'prop-fill', type: 'fill', source: 'props', paint: { 'fill-color': '#e0b64a', 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.18, 13, 0.05] } }, PROP_ANCHOR);
    m.addLayer({ id: 'prop-glow', type: 'line', source: 'props', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#e0b64a', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 4, 16, 14], 'line-blur': ['interpolate', ['linear'], ['zoom'], 10, 3, 16, 9], 'line-opacity': 0.55 } }, PROP_ANCHOR);
    m.addLayer({ id: 'prop-line', type: 'line', source: 'props', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#c9a2ff', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 16, 3.5], 'line-opacity': 0.98 } }, PROP_ANCHOR);
    m.addLayer({ id: 'zones', type: 'symbol', source: 'zones', minzoom: 11.5, layout: {
      'icon-image': ['get', 'icon'], 'icon-size': ['interpolate', ['linear'], ['zoom'], 12, 0.45, 16, 0.8, 19, 1.0], 'icon-allow-overlap': true, 'icon-ignore-placement': true,
      'text-field': ['get', 'name'], 'text-font': ['Open Sans Semibold'], 'text-size': ['interpolate', ['linear'], ['zoom'], 13, 0, 14.5, 10.5, 18, 13], 'text-offset': [0, 1.9], 'text-anchor': 'top', 'text-optional': true
    }, paint: { 'text-color': '#f3f6ee', 'text-halo-color': 'rgba(5,8,6,0.9)', 'text-halo-width': 1.3 } });
    this.applyMode(this.mode);
    this.buildChips();

    m.on('click', 'zones', e => { const f = e.features?.[0]; if (f) { const p = this.props.find(x => x.id === f.properties.pid); const z = p?.zones.find(x => x.id === f.properties.zid); if (p && z) this.onSelect('zone', { property: p, zone: z }); } });
    m.on('click', 'prop-fill', e => { if (m.queryRenderedFeatures(e.point, { layers: ['zones'] }).length) return; const f = e.features?.[0]; const p = f && this.props.find(x => x.id === f.properties.pid); if (p) this.onSelect('property', p); });
    m.on('click', 'lot-fill', e => { if (m.queryRenderedFeatures(e.point, { layers: ['zones', 'prop-fill'] }).length && m.getZoom() < 14) return; const f = e.features?.[0]; if (f) this.onSelect('lot', f.properties); });
    for (const l of ['zones', 'prop-fill', 'lot-fill']) { m.on('mouseenter', l, () => { m.getCanvas().style.cursor = 'pointer'; }); m.on('mouseleave', l, () => { m.getCanvas().style.cursor = ''; }); }
  }

  applyMode(mode: 'today' | 'vision') {
    this.mode = mode;
    const m = this.eng.map;
    const modeFilter: maplibregl.FilterSpecification = ['any', ['==', ['get', 'mode'], 'both'], ['==', ['get', 'mode'], mode === 'today' ? 'current' : 'vision']];
    if (m.getLayer('zones')) m.setFilter('zones', modeFilter);
    for (const mk of this.markers) { const el = mk.getElement(); const p = this.props.find(x => x.id === el.dataset.pid); if (p) el.textContent = (mode === 'vision' && p.visionLabelChip) || p.labelChip || p.shortLabel || p.name; }
  }

  private buildChips() {
    for (const mk of this.markers) mk.remove();
    this.markers = [];
    for (const p of this.props) {
      const el = document.createElement('div');
      el.className = 'chip'; el.dataset.pid = p.id;
      el.textContent = p.labelChip || p.shortLabel || p.name;
      el.addEventListener('click', ev => { ev.stopPropagation(); this.flyTo(p); this.onSelect('property', p); });
      const mk = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([p.center[1], p.center[0]]).addTo(this.eng.map);
      this.markers.push(mk);
    }
  }

  flyTo(p: Property) {
    const ring = stitch(p);
    if (ring.length > 3) {
      const b = new maplibregl.LngLatBounds(); for (const q of ring) b.extend(q);
      this.eng.map.fitBounds(b, { padding: { top: 90, bottom: 140, left: 340, right: 360 }, duration: 1800, pitch: this.eng.map.getPitch(), maxZoom: p.zoom });
    } else this.eng.map.flyTo({ center: [p.center[1], p.center[0]], zoom: p.zoom, duration: 1800 });
  }
}
