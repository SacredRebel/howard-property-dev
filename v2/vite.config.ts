import { defineConfig, type Plugin } from 'vite';
import { OVERLAYS, FLIGHTS } from './src/layers/registry';
import { rasterSource } from './src/layers/transport';

// tiles.json: every raster template the app can request, so scripts/warm-tiles.mjs
// can pre-bake the property areas into the edge cache without a browser.
function tileManifest(): Plugin {
  return {
    name: 'tile-manifest',
    generateBundle() {
      const overlays: unknown[] = [];
      for (const o of OVERLAYS) {
        if (o.kind === 'image') continue;
        const parts = o.parts || [o];
        parts.forEach((p, i) => {
          const s = rasterSource(p, { transparent: true, maxZoom: o.maxZoom });
          overlays.push({ id: o.id + (o.parts ? '-p' + i : ''), group: o.group, label: o.label, tiles: s.tiles, tileSize: s.tileSize, maxzoom: s.maxzoom, minZoom: o.minZoom ?? null, proxied: String(s.tiles?.[0] || '').startsWith('/api/tile') });
        });
      }
      const flights = FLIGHTS.map(f => { const s = rasterSource({ kind: f.kind, svc: f.svc }, { transparent: false }); return { id: f.id, year: f.year, tiles: s.tiles, tileSize: s.tileSize, maxzoom: s.maxzoom, proxied: String(s.tiles?.[0] || '').startsWith('/api/tile') }; });
      this.emitFile({ type: 'asset', fileName: 'tiles.json', source: JSON.stringify({ generated: new Date().toISOString().slice(0, 10), overlays, flights }, null, 1) });
    }
  };
}

// Built output is committed to ../public/v2 and served by the existing Express app at / and /v2/.
export default defineConfig({
  base: '/v2/',
  plugins: [tileManifest()],
  build: {
    outDir: '../public/v2',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: { maplibre: ['maplibre-gl'] }
      }
    }
  }
});
