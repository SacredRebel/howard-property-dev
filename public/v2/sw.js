/* Atlas tile cache — a service worker for the map.
 *
 * Aerial flights, historic topo sheets, the terrain DEM, base imagery and the
 * photo CDN are immutable: once a tile has been seen it is served from the
 * cache first (instant on the next visit, no network wait while panning back
 * over ground already loaded). County / CGS / USGS dynamic `/export` images and
 * legend JSON are served stale-while-revalidate: the cached copy paints at once
 * and a fresh copy is fetched in the background for next time. Nothing under
 * /api/ is ever cached except /api/tile (the edge-cached proxy, stale-while-revalidate).
 * Caches are capped so the browser's quota is respected.
 */
const VERSION = 'v2';
const TILES = 'atlas-tiles-' + VERSION;   // immutable tiles + images
const DYN = 'atlas-dyn-' + VERSION;       // dynamic exports + legend json
const APP = 'atlas-app-' + VERSION;       // hashed app bundle
const TILES_MAX = 1800, DYN_MAX = 1500, APP_MAX = 40;

const IMMUTABLE = [
  /^https:\/\/maps\.ventura\.org\/arcgis\/rest\/services\/.*\/tile\/\d+\/\d+\/\d+/,      // county flight caches
  /^https:\/\/s3\.amazonaws\.com\/elevation-tiles-prod\/terrarium\//,                    // DEM
  /^https:\/\/(server|services)\.arcgisonline\.com\/.*\/tile\/\d+\/\d+\/\d+/,             // Esri imagery
  /^https:\/\/basemap\.nationalmap\.gov\/.*\/tile\/\d+\/\d+\/\d+/,                        // USGS topo cache
  /^https:\/\/gis\.blm\.gov\/.*\/tile\/\d+\/\d+\/\d+/,                                    // BLM ownership cache
  /^https:\/\/historical1\.arcgis\.com\/.*\/exportImage\?/,                               // historic topo (mosaicRule in the URL)
  /^https:\/\/wsrv\.nl\/\?/,                                                              // photo CDN (size in the URL)
  /^https:\/\/raw\.githubusercontent\.com\/.*\.(png|jpe?g|webp)$/i,                       // survey overlay + originals
  /^https:\/\/(mt\d|khms\d)\.google\.com\//,
  /^https:\/\/tile\.openstreetmap\.org\//
];
const DYNAMIC = [
  /^https:\/\/maps\.ventura\.org\/arcgis\/rest\/services\/.*\/export\?/,
  /^https:\/\/gis\.conservation\.ca\.gov\/.*\/export\?/,
  /^https:\/\/gis\.water\.ca\.gov\/.*\/export\?/,
  /^https:\/\/hazards\.fema\.gov\/.*\/export\?/,
  /^https:\/\/earthquake\.usgs\.gov\/.*\/export\?/,
  /^https:\/\/hydro\.nationalmap\.gov\/.*\/export\?/,
  /^https:\/\/sdmdataaccess\.sc\.egov\.usda\.gov\/.*REQUEST=GetMap/i,
  /\/MapServer\/legend\?f=json/,
  /\/MapServer\?f=json$/
];
const APP_RE = /^https?:\/\/[^/]+\/v2\/(assets|fonts)\//;

self.addEventListener('install', e => { e.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keep = new Set([TILES, DYN, APP]);
    for (const k of await caches.keys()) if (k.startsWith('atlas-') && !keep.has(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

const puts = { [TILES]: 0, [DYN]: 0, [APP]: 0 };
async function put(name, req, res, max) {
  try {
    const c = await caches.open(name);
    await c.put(req, res);
    if (++puts[name] % 40 === 0) {                       // trim the oldest entries now and then
      const keys = await c.keys();
      if (keys.length > max) for (const k of keys.slice(0, keys.length - max)) await c.delete(k);
    }
  } catch (_) { /* quota or opaque-size limits: caching is best-effort */ }
}
const cacheable = r => r && (r.ok || r.type === 'opaque');

async function cacheFirst(req, name, max) {
  const hit = await caches.match(req, { cacheName: name });
  if (hit) return hit;
  const res = await fetch(req);
  if (cacheable(res)) put(name, req, res.clone(), max);
  return res;
}
async function staleWhileRevalidate(req, name, max) {
  const c = await caches.open(name);
  const hit = await c.match(req);
  const refresh = fetch(req).then(res => { if (cacheable(res)) put(name, req, res.clone(), max); return res; }).catch(() => null);
  if (hit) return hit;
  const res = await refresh;
  if (res) return res;
  return new Response('', { status: 504, statusText: 'offline' });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = req.url;
  if (/\/api\/tile\?/.test(url)) { e.respondWith(staleWhileRevalidate(req, DYN, DYN_MAX)); return; }   // our edge-cached proxy
  if (url.includes('/api/')) return;                        // live data, never cached
  if (APP_RE.test(url)) { e.respondWith(cacheFirst(req, APP, APP_MAX)); return; }
  for (const re of IMMUTABLE) if (re.test(url)) { e.respondWith(cacheFirst(req, TILES, TILES_MAX)); return; }
  for (const re of DYNAMIC) if (re.test(url)) { e.respondWith(staleWhileRevalidate(req, DYN, DYN_MAX)); return; }
});

self.addEventListener('message', e => {
  if (e.data === 'atlas:clear') e.waitUntil((async () => { for (const k of await caches.keys()) if (k.startsWith('atlas-')) await caches.delete(k); })());
});
