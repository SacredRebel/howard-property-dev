// V0.13 — Google-Earth behavior:
//  (1) 2D map: fractional smooth zoom, glide inertia, long parabolic chip flights
//  (2) 🌍 3D mode: MapLibre GL fullscreen overlay — Esri satellite draped over real
//      elevation (AWS terrarium DEM), tilt/orbit/cinematic dives, property boundaries,
//      ranch parcel lines, mode-aware zone markers + property chips. Lazy-loaded,
//      destroyed on exit. No keys, no accounts, all free tile sources.
import { readFileSync, writeFileSync } from 'fs';
const F = 'server-complete.js';
let s = readFileSync(F, 'utf8');
let n = 0;
function rep(from, to) {
  if (!s.includes(from)) throw new Error('anchor missing: ' + from.slice(0, 70));
  s = s.replace(from, to); n++;
}
function repAll(from, to) {
  let c = 0;
  while (s.includes(from)) { s = s.replace(from, to); c++; }
  if (!c) throw new Error('anchor missing (all): ' + from.slice(0, 70));
  n++;
}

// ---------- 1. Smooth fractional zoom + glide inertia ----------
rep(`    const map = L.map('map', {
      center: [34.4287, -119.2375],
      zoom: 13,
      zoomControl: true,`,
`    const map = L.map('map', {
      center: [34.4287, -119.2375],
      zoom: 13,
      zoomSnap: 0.25,
      zoomDelta: 0.6,
      wheelPxPerZoomLevel: 90,
      inertiaDeceleration: 2600,
      easeLinearity: 0.16,
      zoomControl: true,`);

// ---------- 2. Cinematic parabolic flights (both chip handlers) ----------
repAll(`map.flyTo(prop.center, prop.zoom, { animate: true, duration: 1.0 });`,
       `map.flyTo(prop.center, prop.zoom, { animate: true, duration: 2.4, easeLinearity: 0.12 });`);

// Recenter control glides out instead of snapping
rep(`        if (window.allPropertiesBounds) map.fitBounds(window.allPropertiesBounds, { padding: [130, 60] });`,
    `        if (window.allPropertiesBounds) map.flyToBounds(window.allPropertiesBounds, { padding: [130, 60], duration: 2.2, easeLinearity: 0.12 });`);

// ---------- 3. HTML: 3D button + fullscreen overlay ----------
rep(`    <span class="mt-opt mt-vision">✨ Vision</span>
  </div>
`,
`    <span class="mt-opt mt-vision">✨ Vision</span>
  </div>

  <!-- 🌍 3D terrain mode (Google-Earth-style) -->
  <div id="earth-toggle" title="Fly the properties in 3D — satellite draped over real terrain">🌍 3D</div>
  <div id="earth3d">
    <div id="earth3d-map"></div>
    <div id="earth3d-exit">✕ Back to Map</div>
    <div id="earth3d-hint">drag to move · right-drag (or two fingers) to tilt &amp; orbit · scroll to dive · click a chip to fly there</div>
    <div id="earth3d-attrib">Imagery © Esri &nbsp;·&nbsp; Terrain: Mapzen / AWS Open Data</div>
  </div>
`);

// ---------- 4. CSS ----------
rep(`      box-shadow: 0 4px 14px rgba(80, 40, 140, 0.55), 0 0 12px rgba(255, 215, 0, 0.25);
    }
`,
`      box-shadow: 0 4px 14px rgba(80, 40, 140, 0.55), 0 0 12px rgba(255, 215, 0, 0.25);
    }

    /* ---- 🌍 3D terrain mode ---- */
    #earth-toggle {
      position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
      z-index: 1200;
      background: linear-gradient(135deg, #10304f 0%, #2c6e9e 100%);
      color: #fff; font-weight: 800; font-size: 12px; letter-spacing: 0.6px;
      padding: 6px 16px; border-radius: 999px;
      border: 1px solid rgba(160, 220, 255, 0.45);
      cursor: pointer; user-select: none;
      box-shadow: 0 5px 16px rgba(0, 0, 0, 0.35);
      transition: box-shadow 0.25s ease, transform 0.15s ease;
    }
    #earth-toggle:hover {
      box-shadow: 0 0 20px rgba(90, 180, 255, 0.6);
      transform: translateX(-50%) scale(1.05);
    }
    #earth3d { position: fixed; inset: 0; z-index: 3000; background: #000; display: none; }
    #earth3d.open { display: block; }
    #earth3d-map { position: absolute; inset: 0; }
    #earth3d-exit {
      position: absolute; top: 14px; left: 14px; z-index: 10;
      background: rgba(12, 14, 24, 0.85); color: #fff;
      padding: 9px 18px; border-radius: 999px;
      font-weight: 700; font-size: 13px; cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.3);
      -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
    }
    #earth3d-exit:hover { background: rgba(40, 44, 66, 0.92); }
    #earth3d-hint {
      position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
      z-index: 10; max-width: 92vw; text-align: center;
      color: rgba(255, 255, 255, 0.88); background: rgba(12, 14, 24, 0.6);
      padding: 6px 16px; border-radius: 999px; font-size: 12px;
      -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
    }
    #earth3d-attrib {
      position: absolute; bottom: 2px; right: 6px; z-index: 10;
      color: rgba(255, 255, 255, 0.5); font-size: 10px;
    }
    #earth3d .prop-chip3d {
      background: linear-gradient(135deg, #4c3a8c 0%, #6a5acd 100%);
      color: #fff; padding: 6px 13px; border-radius: 999px;
      font-weight: 700; font-size: 12px; white-space: nowrap;
      border: 1.5px solid rgba(255, 215, 0, 0.65); cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.55);
    }
    #earth3d .prop-chip3d:hover { box-shadow: 0 0 16px rgba(255, 215, 0, 0.5); }
    #earth3d .zone3d {
      width: 34px; height: 34px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 19px; cursor: pointer;
      border: 2px solid rgba(255, 255, 255, 0.55);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
    }
    @media (max-width: 768px) {
      #earth-toggle { top: 56px; }
      #earth3d-hint { font-size: 11px; }
    }
`);

// ---------- 5. JS engine ----------
rep(`    // ---- Current / Vision mode engine ----`,
`    // ---- 🌍 3D terrain mode (Google-Earth-style, MapLibre GL) ----
    var earth3dMap = null;
    function loadMapLibre(cb) {
      if (window.maplibregl) return cb();
      var css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
      document.head.appendChild(css);
      var sc = document.createElement('script');
      sc.src = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';
      sc.onload = function() { cb(); };
      sc.onerror = function() {
        alert('Could not load the 3D engine - please check your connection and try again.');
        close3D();
      };
      document.head.appendChild(sc);
    }
    function stitchLoop3D(prop) {
      var pts = [];
      (prop.boundary || []).forEach(function(seg) {
        var c = seg.coordinates || [];
        for (var i = 0; i < c.length - 1; i++) pts.push([c[i][1], c[i][0]]);
      });
      if (pts.length) pts.push(pts[0].slice());
      return pts;
    }
    function open3D() {
      document.getElementById('earth3d').classList.add('open');
      loadMapLibre(function() {
        try { build3D(); }
        catch (err) {
          console.error('3D init failed:', err);
          alert('The 3D view could not start on this device (WebGL needed).');
          close3D();
        }
      });
    }
    function close3D() {
      document.getElementById('earth3d').classList.remove('open');
      if (earth3dMap) { try { earth3dMap.remove(); } catch (e) {} earth3dMap = null; }
    }
    function build3D() {
      var c2 = map.getCenter(), z2 = map.getZoom();
      earth3dMap = new maplibregl.Map({
        container: 'earth3d-map',
        style: {
          version: 8,
          sources: {
            sat: {
              type: 'raster',
              tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
              tileSize: 256, maxzoom: 19
            },
            dem: {
              type: 'raster-dem',
              tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
              tileSize: 256, encoding: 'terrarium', maxzoom: 14
            }
          },
          layers: [{ id: 'sat', type: 'raster', source: 'sat' }]
        },
        center: [c2.lng, c2.lat],
        zoom: Math.max(z2 - 1, 10.8),
        pitch: 0, bearing: 0, maxPitch: 80,
        attributionControl: false
      });
      earth3dMap.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
      earth3dMap.on('load', function() {
        earth3dMap.setTerrain({ source: 'dem', exaggeration: 1.35 });

        // Rainbow-line stand-ins: gold glow + violet line per property boundary
        properties.forEach(function(p, idx) {
          var loop = stitchLoop3D(p);
          if (!loop.length) return;
          earth3dMap.addSource('b' + idx, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: loop } } });
          earth3dMap.addLayer({ id: 'bglow' + idx, type: 'line', source: 'b' + idx, paint: { 'line-color': '#FFD700', 'line-width': 7, 'line-blur': 5, 'line-opacity': 0.5 } });
          earth3dMap.addLayer({ id: 'bline' + idx, type: 'line', source: 'b' + idx, paint: { 'line-color': '#B388FF', 'line-width': 2.6 } });
        });

        // Ranch parcel plat lines
        properties.forEach(function(p, idx) {
          if (!p.lots || !p.lots.length) return;
          var feats = [];
          p.lots.forEach(function(lot) {
            (lot.rings || []).forEach(function(ring) {
              feats.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: ring.map(function(q) { return [q[1], q[0]]; }) } });
            });
          });
          earth3dMap.addSource('lots' + idx, { type: 'geojson', data: { type: 'FeatureCollection', features: feats } });
          earth3dMap.addLayer({ id: 'lots' + idx, type: 'line', source: 'lots' + idx, paint: { 'line-color': '#FFFFFF', 'line-width': 0.9, 'line-opacity': 0.6 } });
        });

        // Zone markers - respects the Today / Vision toggle at open time
        zones.forEach(function(z) {
          if (window.zoneVisibleInMode && !window.zoneVisibleInMode(z.mode)) return;
          var el = document.createElement('div');
          el.className = 'zone3d';
          var col = zoneColorMap[z.type] || '#455a64';
          el.style.background = 'linear-gradient(135deg, ' + col + ' 0%, ' + col + 'cc 100%)';
          el.textContent = z.emoji;
          var nm = (window.zoneView ? window.zoneView(z).name : z.name);
          el.title = nm;
          new maplibregl.Marker({ element: el })
            .setLngLat([z.position[1], z.position[0]])
            .setPopup(new maplibregl.Popup({ offset: 20, closeButton: false }).setText(nm))
            .addTo(earth3dMap);
        });

        // Property chips - click = cinematic dive to that property
        properties.forEach(function(p) {
          var el = document.createElement('div');
          el.className = 'prop-chip3d';
          el.textContent = (window.visionMode && p.visionLabelChip) ? p.visionLabelChip : p.labelChip;
          el.addEventListener('click', function(ev) {
            ev.stopPropagation();
            earth3dMap.flyTo({
              center: [p.center[1], p.center[0]],
              zoom: Math.max((p.zoom || 15.5) - 1, 12.8),
              pitch: 62, bearing: -24,
              duration: 3400, curve: 1.55, essential: true
            });
          });
          new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -16] })
            .setLngLat([p.center[1], p.center[0]])
            .addTo(earth3dMap);
        });

        // Entry move: tilt down into the terrain
        setTimeout(function() {
          if (earth3dMap) earth3dMap.easeTo({ pitch: 58, bearing: -18, duration: 2600 });
        }, 600);
        console.log('🌍 3D terrain mode ready -', properties.length, 'properties draped on real elevation');
      });
    }
    var earthBtn = document.getElementById('earth-toggle');
    if (earthBtn) earthBtn.addEventListener('click', open3D);
    var earthExit = document.getElementById('earth3d-exit');
    if (earthExit) earthExit.addEventListener('click', close3D);
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && document.getElementById('earth3d').classList.contains('open')) close3D();
    });

    // ---- Current / Vision mode engine ----`);

writeFileSync(F, s);
console.log('patch13 applied:', n, 'edits');
