#!/usr/bin/env python3
# V0.19 — 3D performance overhaul, applied as exact string edits on the V0.17 server-complete.js base.
# base sha256[:12] == 9cefbdaca4ff  ->  result sha256[:12] == 5e69e73b1343
import hashlib, sys

path = sys.argv[1] if len(sys.argv) > 1 else 'server-complete.js'
src = open(path, encoding='utf-8').read()
assert hashlib.sha256(src.encode()).hexdigest()[:12] == '9cefbdaca4ff', \
    'unexpected base: ' + hashlib.sha256(src.encode()).hexdigest()[:12]

EDITS = []

# 1 — CSS: pre-build (invisible, sized) + open states
EDITS.append(("""    #earth3d { position: fixed; inset: 0; z-index: 3000; background: #000; display: none; }
    #earth3d.open { display: block; }""",
"""    #earth3d { position: fixed; inset: 0; z-index: 3000; background: #000; display: none; opacity: 1; }
    /* pre-build state: rendered at full size so the GL canvas warms up, but invisible & behind everything */
    #earth3d.prebuilding { display: block; opacity: 0; pointer-events: none; z-index: -1; }
    #earth3d.open { display: block; opacity: 1; pointer-events: auto; z-index: 3000; }"""))

# 2 — Map constructor: cap pixelRatio, kill fade, no antialias
EDITS.append(("""        center: [c2.lng, c2.lat],
        zoom: Math.max(z2 - 1, 10.8),
        pitch: 0, bearing: 0, maxPitch: 80,
        fadeDuration: 150,
        attributionControl: false
      });""",
"""        center: [c2.lng, c2.lat],
        zoom: Math.max(z2 - 1, 10.8),
        pitch: 0, bearing: 0, maxPitch: 80,
        fadeDuration: 0,
        // Cap the render resolution: on retina / 4K screens an uncapped devicePixelRatio makes the
        // GPU push 4-9x the pixels every frame -> the lag & tearing johny saw. 1.5 stays crisp, runs fast.
        pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
        antialias: false,
        attributionControl: false,
        refreshExpiredTiles: false
      });"""))

# 3 — module state + emoji->GPU-image helper + FPS sampler
EDITS.append(("""    var earthBuiltMode = null;
    var earth3dMarkers = [];
    function earthEntry() {""",
"""    var earthBuiltMode = null;
    var earth3dMarkers = [];      // DOM property chips only now (6) — zones live on the GPU
    var zoneImgCache = {};        // "emoji|color" -> map image id (added once, reused across rebuilds)
    var earthFpsChecked = false;
    var earthPrebuilding = false;
    // Render an emoji badge (colored disc + white ring + glyph) to a canvas -> a GPU image.
    // This is what lets ~50 zone markers ride on a symbol layer instead of ~50 reprojected DOM nodes.
    function makeZoneIcon(emoji, col) {
      var R = 2, S = 34, pad = 8, W = (S + pad) * R;
      var cv = document.createElement('canvas');
      cv.width = W; cv.height = W;
      var ctx = cv.getContext('2d');
      var cx = W / 2, r = (S / 2) * R;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 5 * R; ctx.shadowOffsetY = 3 * R;
      var g = ctx.createLinearGradient(cx - r, cx - r, cx + r, cx + r);
      g.addColorStop(0, col); g.addColorStop(1, col + 'cc');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cx, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.lineWidth = 2 * R; ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.arc(cx, cx, r, 0, Math.PI * 2); ctx.stroke();
      ctx.font = (19 * R) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      try { ctx.fillText(emoji, cx, cx + R); } catch (e) {}
      var d = ctx.getImageData(0, 0, W, W);
      return { width: W, height: W, data: d.data };
    }
    // Sample real frame rate once; if the device is struggling, drop terrain (the heaviest layer).
    function sampleFps3D() {
      if (earthFpsChecked || !earth3dMap) return;
      earthFpsChecked = true;
      var gaps = [], last = 0, n = 0;
      function tick(ts) {
        if (!earth3dMap) return;
        if (last) gaps.push(ts - last);
        last = ts; n++;
        if (n < 75) { requestAnimationFrame(tick); return; }
        var s = gaps.slice(20).sort(function(a, b) { return a - b; });   // drop warmup/entry frames
        var med = s.length ? s[Math.floor(s.length / 2)] : 16;
        var fps = 1000 / med;
        try {
          if (fps < 30 && earth3dMap.getTerrain && earth3dMap.getTerrain()) {
            earth3dMap.setTerrain(null);
            console.warn('🌍 weak GPU (~' + fps.toFixed(0) + 'fps) — terrain dropped for smooth navigation');
          } else {
            console.log('🌍 3D running at ~' + fps.toFixed(0) + 'fps');
          }
        } catch (e) {}
      }
      requestAnimationFrame(tick);
    }
    function earthEntry() {"""))

# 4 — buildMarkers3D: GPU symbol layer for zones + 6 DOM chips
EDITS.append(("""    function buildMarkers3D() {
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
    }""",
"""    function buildMarkers3D() {
      if (!earth3dMap || !earth3dMap.getSource('zonesrc')) return;   // zone layer is created on 'load'
      // ---- Zone markers: ONE GPU symbol layer (was ~50 DOM markers — the source of the lag) ----
      var feats = [];
      zones.forEach(function(z) {
        if (window.zoneVisibleInMode && !window.zoneVisibleInMode(z.mode)) return;
        var col = zoneColorMap[z.type] || '#455a64';
        var key = z.emoji + '|' + col;
        var imgId = zoneImgCache[key];
        if (!imgId) {
          imgId = 'zi' + Object.keys(zoneImgCache).length;
          try { if (!earth3dMap.hasImage(imgId)) earth3dMap.addImage(imgId, makeZoneIcon(z.emoji, col), { pixelRatio: 2 }); }
          catch (e) {}
          zoneImgCache[key] = imgId;
        }
        var nm = (window.zoneView ? window.zoneView(z).name : z.name);
        feats.push({ type: 'Feature', properties: { icon: imgId, name: nm },
          geometry: { type: 'Point', coordinates: [z.position[1], z.position[0]] } });
      });
      earth3dMap.getSource('zonesrc').setData({ type: 'FeatureCollection', features: feats });
      // ---- Property chips: 6 DOM markers (negligible), keeps the styled pill look + dive-on-click ----
      earth3dMarkers.forEach(function(m) { try { m.remove(); } catch (e) {} });
      earth3dMarkers = [];
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
    }"""))

# 5 — build3D top: reopen (ready) / in-flight (prebuilding) / fresh-construct branches
EDITS.append(("""    function build3D() {
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
      var c2 = map.getCenter(), z2 = map.getZoom();""",
"""    function build3D() {
      if (earth3dMap && earthReady) {
        // The globe is alive & pre-built — just resync it to the 2D camera and re-enter (instant)
        earth3dMap.resize();
        var rc = map.getCenter(), rz = map.getZoom();
        earth3dMap.jumpTo({ center: [rc.lng, rc.lat], zoom: Math.max(rz - 1, 10.8), pitch: 0, bearing: 0 });
        if (earthBuiltMode !== !!window.visionMode) buildMarkers3D();
        var lel2 = document.getElementById('earth3d-loading');
        if (lel2) lel2.style.display = 'none';
        earthEntry();
        sampleFps3D();
        return;
      }
      if (earth3dMap && !earthReady) {
        // Construction is already in flight (a background pre-build) — just size it;
        // the 'load' handler will finish the entry now that we're no longer prebuilding.
        try { earth3dMap.resize(); } catch (e) {}
        return;
      }
      var c2 = map.getCenter(), z2 = map.getZoom();"""))

# 6 — load handler: create zone source/layer/handlers, branch prebuild-settle vs entry+fps
EDITS.append(("""        buildMarkers3D();
        earthEntry();
        console.log('🌍 globe mode ready -', properties.length, 'properties on a real planet (kept alive between opens)');
      });
    }""",
"""        // Zone markers live here: one empty GeoJSON source + symbol layer, filled by buildMarkers3D()
        earth3dMap.addSource('zonesrc', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        earth3dMap.addLayer({
          id: 'zones3d', type: 'symbol', source: 'zonesrc',
          layout: {
            'icon-image': ['get', 'icon'],
            'icon-size': ['interpolate', ['linear'], ['zoom'], 11, 0.4, 14, 0.62, 17, 0.82],
            'icon-allow-overlap': true, 'icon-ignore-placement': true, 'icon-anchor': 'center'
          }
        });
        earth3dMap.on('click', 'zones3d', function(e) {
          var f = e.features && e.features[0]; if (!f) return;
          new maplibregl.Popup({ offset: 16, closeButton: false })
            .setLngLat(f.geometry.coordinates.slice())
            .setText(f.properties.name).addTo(earth3dMap);
        });
        earth3dMap.on('mouseenter', 'zones3d', function() { earth3dMap.getCanvas().style.cursor = 'pointer'; });
        earth3dMap.on('mouseleave', 'zones3d', function() { earth3dMap.getCanvas().style.cursor = ''; });

        buildMarkers3D();
        if (earthPrebuilding) {
          // Warmed up invisibly. Let tiles settle, then drop back to display:none — the map stays
          // alive & fully built, so the first real open is just resize + jumpTo + fly-in.
          var settle = function() {
            var pe = document.getElementById('earth3d');
            if (pe && !pe.classList.contains('open')) pe.classList.remove('prebuilding');
            earthPrebuilding = false;
          };
          earth3dMap.once('idle', settle); setTimeout(settle, 6000);
          console.log('🌍 globe pre-built silently —', properties.length, 'properties ready before first open');
        } else {
          var leld = document.getElementById('earth3d-loading'); if (leld) leld.style.display = 'none';
          earthEntry();
          sampleFps3D();
          console.log('🌍 globe mode ready -', properties.length, 'properties on a real planet (kept alive between opens)');
        }
      });
    }"""))

# 7 — open3D: promote an in-flight pre-build to a real open
EDITS.append(("""    function open3D(opts) {
      if (document.getElementById('earth3d').classList.contains('open')) return;
      earthOpenedByGesture = !!(opts && opts.gesture);
      earthPendPitch = (opts && typeof opts.pitch === 'number') ? opts.pitch : 0;
      earthPendBearing = 0;
      document.getElementById('earth3d').classList.add('open');
      buildStars();""",
"""    function open3D(opts) {
      var e3 = document.getElementById('earth3d');
      if (e3.classList.contains('open')) return;
      earthPrebuilding = false;           // promote any in-flight background pre-build to a real open
      e3.classList.remove('prebuilding');
      earthOpenedByGesture = !!(opts && opts.gesture);
      earthPendPitch = (opts && typeof opts.pitch === 'number') ? opts.pitch : 0;
      earthPendBearing = 0;
      e3.classList.add('open');
      buildStars();"""))

# 8 — webglcontextlost: also reset the GPU-image cache / flags for a clean rebuild
EDITS.append(("""      earth3dMap.once('webglcontextlost', function() {
        try { earth3dMap.remove(); } catch (e) {}
        earth3dMap = null; window.earth3dRef = null;
        earthBuiltMode = null; earthReady = false;
      });""",
"""      earth3dMap.once('webglcontextlost', function() {
        try { earth3dMap.remove(); } catch (e) {}
        earth3dMap = null; window.earth3dRef = null;
        earthBuiltMode = null; earthReady = false;
        zoneImgCache = {}; earthFpsChecked = false; earthPrebuilding = false;  // rebuild adds fresh GPU images
      });"""))

# 9 — pre-warm -> full silent pre-build
EDITS.append(("""    // Pre-warm the 3D engine in the background so the first open is instant
    setTimeout(function() { loadMapLibre(function() {}); }, 2500);""",
"""    // Pre-BUILD the whole 3D world silently at page load (johny: "pre-loaded and ready to display").
    // The map is constructed in a full-size but invisible overlay so tiles, terrain, shaders and the
    // zone layer are all ready BEFORE the first open — then it drops to display:none, still alive.
    function prebuild3D() {
      var e3 = document.getElementById('earth3d');
      if (earth3dMap || !e3 || e3.classList.contains('open')) return;
      earthPrebuilding = true;
      e3.classList.add('prebuilding');
      loadMapLibre(function() {
        if (document.getElementById('earth3d').classList.contains('open')) return; // user beat us to it
        try { build3D(); }
        catch (e) {
          earthPrebuilding = false;
          e3.classList.remove('prebuilding');
        }
      });
    }
    setTimeout(prebuild3D, 2200);"""))

for i, (old, new) in enumerate(EDITS, 1):
    n = src.count(old)
    assert n == 1, 'edit %d matched %d times' % (i, n)
    src = src.replace(old, new)

out = hashlib.sha256(src.encode()).hexdigest()[:12]
assert out == '5e69e73b1343', 'RESULT sha mismatch: ' + out
open(path, 'w', encoding='utf-8').write(src)
print('V0.19 applied ->', out)
