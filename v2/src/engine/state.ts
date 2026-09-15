// Shareable state lives in the URL hash: camera, base imagery, timeline years,
// active layers and mode. Everything else is transient.
export interface AppState {
  lng: number; lat: number; zoom: number; bearing: number; pitch: number;
  base: string;              // 'esri' | 'gsat' | 'osm' | flight id
  histYear: number;
  layers: string[];
  mode: 'today' | 'vision';
  terrain: boolean;
}

export const DEFAULT_STATE: AppState = {
  lng: -119.19, lat: 34.45, zoom: 10.6, bearing: 0, pitch: 0,
  base: 'esri', histYear: 1952, layers: [], mode: 'today', terrain: true
};

export function readHash(): Partial<AppState> {
  const h = location.hash.replace(/^#/, '');
  if (!h) return {};
  const out: Partial<AppState> = {};
  const [cam, qs] = h.split('?');
  const c = cam.split('/').filter(Boolean).map(Number);
  if (c.length >= 3 && c.every(isFinite)) { out.lat = c[0]; out.lng = c[1]; out.zoom = c[2]; if (c.length > 3) out.bearing = c[3]; if (c.length > 4) out.pitch = c[4]; }
  const q = new URLSearchParams(qs || '');
  if (q.get('b')) out.base = q.get('b')!;
  if (q.get('t')) out.histYear = Number(q.get('t'));
  if (q.get('l') != null) out.layers = q.get('l')!.split(',').filter(Boolean);
  if (q.get('m') === 'vision' || q.get('m') === 'today') out.mode = q.get('m') as 'today' | 'vision';
  if (q.get('3d') === '0') out.terrain = false;
  return out;
}

let pending: number | null = null;
export function writeHash(s: AppState) {
  if (pending) return;
  pending = window.setTimeout(() => {
    pending = null;
    const q = new URLSearchParams();
    if (s.base !== 'esri') q.set('b', s.base);
    if (s.histYear !== 1952) q.set('t', String(s.histYear));
    if (s.layers.length) q.set('l', s.layers.join(','));
    if (s.mode !== 'today') q.set('m', s.mode);
    if (!s.terrain) q.set('3d', '0');
    const cam = [s.lat.toFixed(6), s.lng.toFixed(6), s.zoom.toFixed(2), Math.round(s.bearing), Math.round(s.pitch)].join('/');
    const qs = q.toString();
    history.replaceState(null, '', '#' + cam + (qs ? '?' + qs : ''));
  }, 250);
}

// tiny typed event bus so UI and engine never import each other
type Handler<T> = (v: T) => void;
export class Emitter<Events extends Record<string, unknown>> {
  private h: { [K in keyof Events]?: Handler<Events[K]>[] } = {};
  on<K extends keyof Events>(k: K, f: Handler<Events[K]>) { (this.h[k] ||= []).push(f); return () => { this.h[k] = (this.h[k] || []).filter(x => x !== f); }; }
  emit<K extends keyof Events>(k: K, v: Events[K]) { for (const f of this.h[k] || []) f(v); }
}
