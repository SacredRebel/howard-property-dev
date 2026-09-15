// One URL builder for every raster source. MapLibre expands {bbox-epsg-3857}
// per tile, so any ArcGIS export endpoint, any WMS and any ImageServer can be
// consumed as a plain raster source - and 2D and 3D are the same engine here,
// so there is exactly one place a positioning bug could live.
import type { RasterSourceSpecification } from 'maplibre-gl';
import { VC_ROOT, type RasterDef } from './registry';

export const VC_ATTR = 'Ventura County GIS';

export function svcBase(def: RasterDef): string {
  return (def.root || VC_ROOT) + def.svc + '/' + (def.kind === 'imgsvc' ? 'ImageServer' : 'MapServer');
}
export function exportBase(def: RasterDef): string {
  return svcBase(def) + (def.kind === 'imgsvc' ? '/exportImage' : '/export');
}
// everything after the bbox
export function exportTail(def: RasterDef, transparent: boolean, px: number): string {
  const q = `&bboxSR=3857&imageSR=3857&size=${px},${px}&f=image`;
  if (def.kind === 'imgsvc') return q + '&format=jpgpng' + (def.extra ? def.extra() : '');
  return q + `&format=${transparent ? 'png32' : 'jpg'}&transparent=${transparent ? 'true' : 'false'}`
    + (def.showLayers ? '&layers=show:' + def.showLayers : '') + '&dpi=96';
}
export function wmsUrl(def: RasterDef): string {
  return `${def.url}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=${encodeURIComponent(def.layers || '')}`
    + '&STYLES=&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&FORMAT=image/png&TRANSPARENT=true';
}

export interface RasterOpts { transparent?: boolean; maxZoom?: number; }

// Slow dynamic services (county + CGS /export, WMS) go through our own edge-cached
// proxy: the first visitor pays the county's render time once, everyone after gets
// the tile from the CDN edge, and scripts/warm-tiles.mjs pre-bakes the property areas.
// Static caches (xyz) and the Esri image service stay direct - they are fast already.
export const PROXY_KINDS = new Set<string>(['export', 'wms']);
export function proxied(url: string): string {
  return '/api/tile?u=' + encodeURIComponent(url).replace(/%7Bbbox-epsg-3857%7D/g, '{bbox-epsg-3857}');
}
export function shouldProxy(def: RasterDef): boolean { return !def.direct && PROXY_KINDS.has(def.kind || 'export'); }

// the MapLibre source for one def (never a `parts` def)
export function rasterSource(def: RasterDef, opts: RasterOpts = {}): RasterSourceSpecification {
  const attribution = def.attr || VC_ATTR;
  if (def.kind === 'xyz') {
    return { type: 'raster', tiles: [svcBase(def) + '/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: def.maxNative || 21, attribution };
  }
  if (def.kind === 'wms') {
    const u = wmsUrl(def);
    return { type: 'raster', tiles: [shouldProxy(def) ? proxied(u) : u], tileSize: 256, maxzoom: 19, attribution };
  }
  const px = def.px || 512;
  const transparent = opts.transparent !== false;
  const u = exportBase(def) + '?bbox={bbox-epsg-3857}' + exportTail(def, transparent, px);
  return {
    type: 'raster', tileSize: px, attribution,
    maxzoom: opts.maxZoom ?? (def.root ? 19 : 20),
    tiles: [shouldProxy(def) ? proxied(u) : u]
  };
}
