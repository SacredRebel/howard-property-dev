// Legends come from the publisher's own /legend endpoint - the app never
// invents one. Filtered to the sublayers we draw (or the service's default-
// visible leaf layers), deduplicated, cached per overlay.
import { svcBase } from './transport';
import type { OverlayDef, RasterDef } from './registry';

export interface LegendItem { layer: string; label: string; img: string; }
const cache = new Map<string, Promise<LegendItem[]>>();

interface ArcLayerInfo { id: number; name: string; defaultVisibility?: boolean; parentLayerId?: number; subLayerIds?: number[] | null; }
interface ArcLegend { layers?: { layerId: number; layerName: string; legend?: { label?: string; imageData: string; contentType?: string }[] }[]; }

async function fetchPart(p: RasterDef): Promise<LegendItem[]> {
  if (p.kind === 'wms' || p.kind === 'imgsvc' || p.kind === 'image') return [];
  const base = svcBase(p);
  const want = p.showLayers ? p.showLayers.split(',').map(Number) : null;
  try {
    const [legend, info] = await Promise.all([
      fetch(base + '/legend?f=json').then(r => r.json() as Promise<ArcLegend>),
      want ? Promise.resolve(null) : fetch(base + '?f=json').then(r => r.json() as Promise<{ layers?: ArcLayerInfo[] }>).catch(() => null)
    ]);
    let vis: Set<number> | null = null;
    if (info && info.layers) {
      const byId = new Map(info.layers.map(l => [l.id, l]));
      vis = new Set();
      for (const l of info.layers) {
        let ok = l.defaultVisibility !== false, par = l.parentLayerId;
        while (ok && par != null && par >= 0 && byId.has(par)) { const pl = byId.get(par)!; ok = pl.defaultVisibility !== false; par = pl.parentLayerId; }
        if (ok && !(l.subLayerIds && l.subLayerIds.length)) vis.add(l.id);
      }
    }
    const out: LegendItem[] = []; const seen = new Set<string>();
    for (const l of legend.layers || []) {
      if (want && !want.includes(l.layerId)) continue;
      if (vis && !vis.has(l.layerId)) continue;
      for (const e of l.legend || []) {
        const key = (e.label || l.layerName) + '|' + (e.imageData || '').slice(0, 64);
        if (seen.has(key)) continue; seen.add(key);
        out.push({ layer: l.layerName, label: e.label || l.layerName, img: `data:${e.contentType || 'image/png'};base64,${e.imageData}` });
      }
    }
    return out;
  } catch { return []; }
}

export function legendFor(def: OverlayDef): Promise<LegendItem[]> {
  let p = cache.get(def.id);
  if (!p) {
    p = Promise.all((def.parts || [def]).map(fetchPart)).then(arrs => arrs.flat());
    cache.set(def.id, p);
  }
  return p;
}
