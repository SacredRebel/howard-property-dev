// V0.16 — POLISH PASS: smooth controls, perfect camera, faster loading
//  Loading:
//   - preconnect to all asset hosts (tiles, DEM, CDN, images)
//   - 3D engine pre-warms in the background 2.5s after page load -> first open is instant
//   - the globe STAYS ALIVE on exit (hidden, not destroyed) -> reopening is instant;
//     markers rebuild only if the Today/Vision mode changed; WebGL context-lost safe
//   - gallery images served resized via wsrv.nl image CDN (webp, right-sized) with
//     automatic fallback to the original; only first images eager, rest lazy;
//     the preload-everything loop (up to 51 full-res fetches per panel!) tamed to 2
//   - "waking the planet…" pulsing orb while the engine boots
//  Camera / controls:
//   - buttery continuous wheel zoom (zoomSnap 0, tuned wheel), quicker response
//   - flight durations now scale with distance (Leaflet auto) - short hops snappy,
//     valley crossings cinematic
//   - markers rescale DURING zoom animation (not just at the end)
//   - middle-drag orbit gets inertia: release mid-spin and the planet glides
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

// ---------- A. buttery 2D physics ----------
rep(`      zoomSnap: 0.25,
      zoomDelta: 0.6,
      wheelPxPerZoomLevel: 90,
      inertiaDeceleration: 2600,`,
`      zoomSnap: 0,
      zoomDelta: 0.5,
      wheelDebounceTime: 20,
      wheelPxPerZoomLevel: 110,
      inertiaDeceleration: 2400,`);

// ---------- B. distance-scaled flight durations ----------
repAll(`map.flyTo(prop.center, prop.zoom, { animate: true, duration: 2.4, easeLinearity: 0.12 });`,
       `map.flyTo(prop.center, prop.zoom, { animate: true, easeLinearity: 0.12 });`);
rep(`map.flyToBounds(window.allPropertiesBounds, { padding: [130, 60], duration: 2.2, easeLinearity: 0.12 });`,
    `map.flyToBounds(window.allPropertiesBounds, { padding: [130, 60], easeLinearity: 0.12 });`);

// ---------- C. markers scale DURING zoom ----------
rep(`    map.on('zoomend', updateMarkerScale);`,
`    map.on('zoomend', updateMarkerScale);
    map.on('zoom', updateMarkerScale);`);

// ---------- D. preconnect to every asset host ----------
rep(`  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />`,
`  <link rel="preconnect" href="https://server.arcgisonline.com" crossorigin>
  <link rel="preconnect" href="https://s3.amazonaws.com" crossorigin>
  <link rel="preconnect" href="https://unpkg.com" crossorigin>
  <link rel="preconnect" href="https://raw.githubusercontent.com" crossorigin>
  <link rel="preconnect" href="https://wsrv.nl" crossorigin>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />`);

// ---------- E. queued loader + silent background pre-warm ----------
rep(`    function loadMapLibre(cb) {
      if (window.maplibregl) return cb();
      var css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css';
      document.head.appendChild(css);
      var sc = document.createElement('script');
      sc.src = 'https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js';
      sc.onload = function() { cb(); };
      sc.onerror = function() {
        alert('Could not load the 3D engine - please check your connection and try again.');
        close3D();
      };
      document.head.appendChild(sc);
    }`,
`    var mlQueue = [], mlLoading = false;
    function loadMapLibre(cb) {
      if (window.maplibregl) return cb();
      mlQueue.push(cb);
      if (mlLoading) return;
      mlLoading = true;
      var css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css';
      document.head.appendChild(css);
      var sc = document.createElement('script');
      sc.src = 'https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js';
      sc.onload = function() {
        mlLoading = false;
        var q = mlQueue.splice(0);
        q.forEach(function(f) { try { f(); } catch (e) { console.error(e); } });
      };
      sc.onerror = function() {
        mlLoading = false; mlQueue.length = 0;
        if (document.getElementById('earth3d').classList.contains('open')) {
          alert('Could not load the 3D engine - please check your connection and try again.');
          close3D();
        }
      };
      document.head.appendChild(sc);
    }`);

// ---------- F. open3D shows the loading orb while the engine is cold ----------
rep(`      document.getElementById('earth3d').classList.add('open');
      buildStars();
      loadMapLibre(function() {`,
`      document.getElementById('earth3d').classList.add('open');
      buildStars();
      var lel = document.getElementById('earth3d-loading');
      if (lel) lel.style.display = (earth3dMap && earthReady) ? 'none' : 'flex';
      loadMapLibre(function() {`);

// ---------- G. exit HIDES the globe instead of destroying it ----------
rep(`    function close3D() {
      if (earth3dMap) {
        try {
          var cc = earth3dMap.getCenter();
          map.setView([cc.lat, cc.lng], Math.max(Math.min(earth3dMap.getZoom() + 1, 19), 9), { animate: false });
        } catch (e) {}
        try { earth3dMap.remove(); } catch (e) {}
        earth3dMap = null;
      }
      earthReady = false;
      window.earth3dRef = null;
      document.getElementById('earth3d').classList.remove('open');
    }`,
`    function close3D() {
      if (earth3dMap) {
        try {
          var cc = earth3dMap.getCenter();
          map.setView([cc.lat, cc.lng], Math.max(Math.min(earth3dMap.getZoom() + 1, 19), 9), { animate: false });
        } catch (e) {}
      }
      document.getElementById('earth3d').classList.remove('open');
    }`);

// ---------- H. build3D refactor: keep-alive reopen + split marker builder + entry ----------
{
  const start = s.indexOf('    function build3D() {');
  const end = s.indexOf("\n    var earthBtn = document.getElementById('earth-toggle');");
  if (start < 0 || end < 0) throw new Error('build3D splice anchors missing');
  const NEW = `    var earthBuiltMode = null;
    var earth3dMarkers = [];
    function earthEntry() {
      if (earthDiveTo) {
        var dvp = earthDiveTo; earthDiveTo = null;
        earth3dMap.flyTo({
          center: [dvp.center[1], dvp.center[0]],
          zoom: Math.max((dvp.zoom || 15.5) - 1, 12.8),
          pitch: 62, bearing: -24,
          duration: 4200, curve: 1.7, essential: true
        });
      } else if (earthOpenedByGesture) {
        earth3dMap.easeTo({ pitch: earthPendPitch, bearing: earthPendBearing, duration: 450 });
      } else {
        setTimeout(function() {
          if (earth3dMap) earth3dMap.easeTo({ pitch: 58, bearing: -18, duration: 2600 });
        }, 500);
      }
    }
    function buildMarkers3D() {
      earth3dMarkers.forEach(function(m) { try { m.remove(); } catch (e) {} });
      earth3dMarkers = [];
      // Zone markers - respects the Today / Vision toggle
      zones.forEach(function(z) {
        if (window.zoneVisibleInMode && !window.zoneVisibleInMode(z.mode)) return;
        var el = document.createElement('div');
        el.className = 'zone3d';
        var col = zoneColorMap[z.type] || '#455a64';
        el.style.background = 'linear-gradient(135deg, ' + col + ' 0%, ' + col + 'cc 100%)';
        el.textContent = z.emoji;
        var nm = (window.zoneView ? window.zoneView(z).name : z.name);
        el.title = nm;
        earth3dMarkers.push(new maplibregl.Marker({ element: el })
          .setLngLat([z.position[1], z.position[0]])
          .setPopup(new maplibregl.Popup({ offset: 20, closeButton: false }).setText(nm))
          .addTo(earth3dMap));
      });
      // Property chips - click = cinematic dive
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
        earth3dMarkers.push(new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -16] })
          .setLngLat([p.center[1], p.center[0]])
          .addTo(earth3dMap));
      });
      earthBuiltMode = !!window.visionMode;
    }
    function build3D() {
      if (earth3dMap) {
        // The globe never died - just resync it to where the 2D map is and re-enter
        earth3dMap.resize();
        var rc = map.getCenter(), rz = map.getZoom();
        earth3dMap.jumpTo({ center: [rc.lng, rc.lat], zoom: Math.max(rz - 1, 10.8), pitch: 0, bearing: 0 });
        if (earthBuiltMode !== !!window.visionMode) buildMarkers3D();
        var lel2 = document.getElementById('earth3d-loading');
        if (lel2) lel2.style.display = 'none';
        earthEntry();
        return;
      }
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
          layers: [{ id: 'sat', type: 'raster', source: 'sat' }],
          projection: { type: 'globe' },
          sky: {
            'sky-color': 'rgba(2, 4, 12, 0)',
            'horizon-color': 'rgba(110, 175, 255, 0.5)',
            'fog-color': 'rgba(12, 26, 51, 0.6)',
            'sky-horizon-blend': 0.7,
            'horizon-fog-blend': 0.6,
            'fog-ground-blend': 0.85,
            'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 8, 1, 11, 0]
          }
        },
        center: [c2.lng, c2.lat],
        zoom: Math.max(z2 - 1, 10.8),
        pitch: 0, bearing: 0, maxPitch: 80,
        fadeDuration: 150,
        attributionControl: false
      });
      earth3dMap.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
      window.earth3dRef = earth3dMap;
      // Google-Earth middle-mouse orbit (right-drag / ctrl-drag / two-finger work natively)
      var cvs3d = earth3dMap.getCanvasContainer();
      cvs3d.addEventListener('mousedown', function(e) {
        if (e.button === 1) { e.preventDefault(); orbitDrag = { x: e.clientX, y: e.clientY }; }
      });
      cvs3d.addEventListener('auxclick', function(e) { e.preventDefault(); });
      earth3dMap.once('webglcontextlost', function() {
        try { earth3dMap.remove(); } catch (e) {}
        earth3dMap = null; window.earth3dRef = null;
        earthBuiltMode = null; earthReady = false;
      });
      earth3dMap.on('load', function() {
        earthReady = true;
        var lel = document.getElementById('earth3d-loading');
        if (lel) lel.style.display = 'none';
        try { earth3dMap.setTerrain({ source: 'dem', exaggeration: 1.35 }); }
        catch (e) { console.warn('terrain not available with globe on this device:', e); }

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

        buildMarkers3D();
        earthEntry();
        console.log('🌍 globe mode ready -', properties.length, 'properties on a real planet (kept alive between opens)');
      });
    }
`;
  s = s.slice(0, start) + NEW + s.slice(end);
  n++;
}

// ---------- I. orbit inertia: release mid-drag and the planet glides ----------
rep(`    window.addEventListener('mousemove', function(e) {
      if (midDrag2D) {
        var gdx = e.clientX - midDrag2D.x, gdy = e.clientY - midDrag2D.y;
        if (!midDrag2D.live) {
          if (Math.abs(gdx) + Math.abs(gdy) > 5) { midDrag2D.live = true; open3D({ gesture: true, pitch: 0 }); }
        } else {
          earthGestureDelta(gdx, gdy);
        }
        midDrag2D.x = e.clientX; midDrag2D.y = e.clientY;
        return;
      }
      if (orbitDrag && earth3dMap) {
        earthGestureDelta(e.clientX - orbitDrag.x, e.clientY - orbitDrag.y);
        orbitDrag.x = e.clientX; orbitDrag.y = e.clientY;
      }
    });
    window.addEventListener('mouseup', function(e) {
      if (e.button === 1) { midDrag2D = null; orbitDrag = null; }
    });`,
`    var orbitVel = null;
    window.addEventListener('mousemove', function(e) {
      if (midDrag2D) {
        var gdx = e.clientX - midDrag2D.x, gdy = e.clientY - midDrag2D.y;
        if (!midDrag2D.live) {
          if (Math.abs(gdx) + Math.abs(gdy) > 5) { midDrag2D.live = true; open3D({ gesture: true, pitch: 0 }); }
        } else {
          earthGestureDelta(gdx, gdy);
          orbitVel = { x: gdx, y: gdy };
        }
        midDrag2D.x = e.clientX; midDrag2D.y = e.clientY;
        return;
      }
      if (orbitDrag && earth3dMap) {
        var odx = e.clientX - orbitDrag.x, ody = e.clientY - orbitDrag.y;
        earthGestureDelta(odx, ody);
        orbitVel = { x: odx, y: ody };
        orbitDrag.x = e.clientX; orbitDrag.y = e.clientY;
      }
    });
    window.addEventListener('mouseup', function(e) {
      if (e.button !== 1) return;
      var hadDrag = !!(midDrag2D && midDrag2D.live) || !!orbitDrag;
      midDrag2D = null; orbitDrag = null;
      if (hadDrag && orbitVel && earth3dMap && earthReady && (Math.abs(orbitVel.x) > 2 || Math.abs(orbitVel.y) > 2)) {
        var vx = orbitVel.x, vy = orbitVel.y;
        (function glide() {
          vx *= 0.9; vy *= 0.9;
          if ((Math.abs(vx) < 0.4 && Math.abs(vy) < 0.4) || !earth3dMap) return;
          earthGestureDelta(vx, vy);
          requestAnimationFrame(glide);
        })();
      }
      orbitVel = null;
    });`);

// ---------- J. background pre-warm after the 2D map settles ----------
rep(`      var dot = document.createElement('div');
      dot.style.cssText = 'position:absolute;top:0;left:0;width:2px;height:2px;border-radius:50%;box-shadow:' + sh;
      el.appendChild(dot);
    }`,
`      var dot = document.createElement('div');
      dot.style.cssText = 'position:absolute;top:0;left:0;width:2px;height:2px;border-radius:50%;box-shadow:' + sh;
      el.appendChild(dot);
    }

    // Pre-warm the 3D engine in the background so the first open is instant
    setTimeout(function() { loadMapLibre(function() {}); }, 2500);`);

// ---------- K. loading orb HTML + CSS ----------
rep(`    <div id="earth3d-stars"></div>`,
`    <div id="earth3d-stars"></div>
    <div id="earth3d-loading"><div class="earth-orb"></div><span>waking the planet…</span></div>`);

rep(`    #earth3d-map { position: absolute; inset: 0; z-index: 1; }`,
`    #earth3d-map { position: absolute; inset: 0; z-index: 1; }
    #earth3d-loading {
      position: absolute; inset: 0; z-index: 5; display: none;
      flex-direction: column; align-items: center; justify-content: center;
      gap: 14px; color: rgba(255, 255, 255, 0.85); font-size: 13px;
      letter-spacing: 0.4px; pointer-events: none;
    }
    .earth-orb {
      width: 46px; height: 46px; border-radius: 50%;
      background: radial-gradient(circle at 32% 30%, #7ec4ff 0%, #2c6e9e 45%, #10304f 100%);
      animation: orbPulse 1.4s ease-in-out infinite;
    }
    @keyframes orbPulse {
      0%, 100% { transform: scale(1); box-shadow: 0 0 22px rgba(90, 180, 255, 0.45); }
      50% { transform: scale(1.12); box-shadow: 0 0 34px rgba(120, 200, 255, 0.75); }
    }`);

// ---------- L. gallery: right-sized CDN images, lazy loading, tamed preloader ----------
rep(`    function createImageCarousel(images, zoneId, category) {`,
`    function cdnImg(src, w) {
      if (!src || src.indexOf('http') !== 0) return src;
      return 'https://wsrv.nl/?url=' + encodeURIComponent(src) + '&w=' + w + '&q=82&output=webp';
    }
    function createImageCarousel(images, zoneId, category) {`);

// main carousel images: CDN-resized + raw fallback; first eager, rest lazy
{
  const re = /<img src="\\\$\{src\}"[ \t]*\n(\s+)class="carousel-image \\\$\{index === 0 \? 'active' : ''\}"[ \t]*\n(\s+)alt="Image \\\$\{index \+ 1\}"[ \t]*\n(\s+)loading="eager"/;
  if (!re.test(s)) throw new Error('anchor missing: carousel mains img');
  s = s.replace(re, (m, i1, i2, i3) =>
    `<img src="\\\${cdnImg(src, 1400)}"\n${i1}data-raw="\\\${src}"\n${i1}onerror="if(this.dataset.raw&&this.src!==this.dataset.raw){this.src=this.dataset.raw}"\n${i1}class="carousel-image \\\${index === 0 ? 'active' : ''}"\n${i2}alt="Image \\\${index + 1}"\n${i3}loading="\\\${index === 0 ? 'eager' : 'lazy'}"`);
  n++;
}

// thumbnails: small CDN renditions + raw fallback, lazy
{
  const re = /<img src="\\\$\{src\}"[ \t]*\n(\s+)class="carousel-thumbnail \\\$\{index === 0 \? 'active' : ''\}"[ \t]*\n(\s+)alt="Thumbnail \\\$\{index \+ 1\}"[ \t]*\n(\s+)data-index="\\\$\{index\}"[ \t]*\n(\s+)loading="eager"/;
  if (!re.test(s)) throw new Error('anchor missing: carousel thumbs img');
  s = s.replace(re, (m, i1, i2, i3, i4) =>
    `<img src="\\\${cdnImg(src, 240)}"\n${i1}data-raw="\\\${src}"\n${i1}onerror="if(this.dataset.raw&&this.src!==this.dataset.raw){this.src=this.dataset.raw}"\n${i1}class="carousel-thumbnail \\\${index === 0 ? 'active' : ''}"\n${i2}alt="Thumbnail \\\${index + 1}"\n${i3}data-index="\\\${index}"\n${i4}loading="lazy"`);
  n++;
}

// tame the preload-everything loop: warm only the first 2 slides per subcategory
rep(`        const imgEls = content.querySelectorAll('.carousel-image, .carousel-thumbnail');`,
    `        const imgEls = content.querySelectorAll('.carousel-image');`);
rep(`        imgEls.forEach(img => {
          const src = img.getAttribute('src');
          if (!src) return;
          const preloader = new Image();
          preloader.src = src;
        });`,
`        Array.prototype.slice.call(imgEls, 0, 2).forEach(img => {
          const src = img.getAttribute('src');
          if (!src) return;
          const preloader = new Image();
          preloader.src = src;
        });`);

// property panel gallery: CDN main image with raw fallback (thumbs stay as-is, few of them)
rep(`      const mainImg = document.createElement('img');
      mainImg.src = imageUrls[0];`,
`      const mainImg = document.createElement('img');
      mainImg.src = cdnImg(imageUrls[0], 1400);
      mainImg.dataset.raw = imageUrls[0];
      mainImg.onerror = function() { if (this.dataset.raw && this.src !== this.dataset.raw) this.src = this.dataset.raw; };`);

rep(`          mainImage.style.opacity = '0.5';
          mainImage.src = imageUrls[currentIndex];`,
`          mainImage.style.opacity = '0.5';
          mainImage.dataset.raw = imageUrls[currentIndex];
          mainImage.src = cdnImg(imageUrls[currentIndex], 1400);`);

writeFileSync(F, s);
console.log('patch16 applied:', n, 'edits');
