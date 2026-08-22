// V0.14 — one connected map, Google-Earth navigation 1:1:
//  - Hold MIDDLE MOUSE + drag on the 2D map -> tilts straight into 3D, the same
//    drag keeps driving pitch/bearing (pending deltas applied the moment GL loads)
//  - Parallel two-finger drag (not a pinch) on mobile does the same
//  - Middle-drag orbits inside 3D too (right-drag / ctrl-drag / two-finger native)
//  - Exiting 3D hands the camera back to the 2D map (center + zoom sync)
//  - New "🌐 Google Earth" button opens the EXACT current 3D view in Google Earth web
import { readFileSync, writeFileSync } from 'fs';
const F = 'server-complete.js';
let s = readFileSync(F, 'utf8');
let n = 0;
function rep(from, to) {
  if (!s.includes(from)) throw new Error('anchor missing: ' + from.slice(0, 70));
  s = s.replace(from, to); n++;
}

// ---------- 1. open3D/close3D rebuilt: gesture state + camera hand-back ----------
rep(`    function open3D() {
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
    }`,
`    var earthOpenedByGesture = false, earthReady = false;
    var earthPendPitch = 0, earthPendBearing = 0;
    var orbitDrag = null, midDrag2D = null;
    function earthGestureDelta(ddx, ddy) {
      if (earth3dMap && earthReady) {
        earth3dMap.setPitch(Math.max(0, Math.min(80, earth3dMap.getPitch() - ddy * 0.35)));
        earth3dMap.setBearing(earth3dMap.getBearing() - ddx * 0.35);
      } else {
        earthPendPitch = Math.max(0, Math.min(80, earthPendPitch - ddy * 0.35));
        earthPendBearing -= ddx * 0.35;
      }
    }
    function open3D(opts) {
      if (document.getElementById('earth3d').classList.contains('open')) return;
      earthOpenedByGesture = !!(opts && opts.gesture);
      earthPendPitch = (opts && typeof opts.pitch === 'number') ? opts.pitch : 0;
      earthPendBearing = 0;
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
    }`);

// ---------- 2. middle-mouse orbit handlers on the GL canvas ----------
rep(`      earth3dMap.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');`,
`      earth3dMap.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
      window.earth3dRef = earth3dMap;
      // Google-Earth middle-mouse orbit (right-drag / ctrl-drag / two-finger work natively)
      var cvs3d = earth3dMap.getCanvasContainer();
      cvs3d.addEventListener('mousedown', function(e) {
        if (e.button === 1) { e.preventDefault(); orbitDrag = { x: e.clientX, y: e.clientY }; }
      });
      cvs3d.addEventListener('auxclick', function(e) { e.preventDefault(); });`);

// ---------- 3. mark engine ready at load ----------
rep(`      earth3dMap.on('load', function() {
        earth3dMap.setTerrain({ source: 'dem', exaggeration: 1.35 });`,
`      earth3dMap.on('load', function() {
        earthReady = true;
        earth3dMap.setTerrain({ source: 'dem', exaggeration: 1.35 });`);

// ---------- 4. entry: live gesture drives the camera; else auto-tilt ----------
rep(`        // Entry move: tilt down into the terrain
        setTimeout(function() {
          if (earth3dMap) earth3dMap.easeTo({ pitch: 58, bearing: -18, duration: 2600 });
        }, 600);`,
`        // Entry: a live gesture drives the camera; otherwise auto-tilt into the terrain
        if (earthOpenedByGesture) {
          earth3dMap.easeTo({ pitch: earthPendPitch, bearing: earthPendBearing, duration: 450 });
        } else {
          setTimeout(function() {
            if (earth3dMap) earth3dMap.easeTo({ pitch: 58, bearing: -18, duration: 2600 });
          }, 600);
        }`);

// ---------- 5. button handler no longer receives the event as opts ----------
rep(`    var earthBtn = document.getElementById('earth-toggle');
    if (earthBtn) earthBtn.addEventListener('click', open3D);`,
`    var earthBtn = document.getElementById('earth-toggle');
    if (earthBtn) earthBtn.addEventListener('click', function() { open3D(); });`);

// ---------- 6. the gesture bridge: 2D and 3D become one map ----------
rep(`    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && document.getElementById('earth3d').classList.contains('open')) close3D();
    });`,
`    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && document.getElementById('earth3d').classList.contains('open')) close3D();
    });

    // ---- Google-Earth gesture bridge: hold middle mouse (or two fingers) to tilt into 3D ----
    var mapEl2D = document.getElementById('map');
    if (mapEl2D) {
      mapEl2D.addEventListener('mousedown', function(e) {
        if (e.button !== 1 || window.positionEditActive) return;
        if (document.getElementById('earth3d').classList.contains('open')) return;
        e.preventDefault();
        midDrag2D = { x: e.clientX, y: e.clientY, live: false };
      });
      mapEl2D.addEventListener('auxclick', function(e) { e.preventDefault(); });
      var twoFinger = null;
      mapEl2D.addEventListener('touchstart', function(e) {
        if (e.touches.length === 2 && !window.positionEditActive) {
          var tdx = e.touches[0].clientX - e.touches[1].clientX;
          var tdy = e.touches[0].clientY - e.touches[1].clientY;
          twoFinger = { d: Math.sqrt(tdx * tdx + tdy * tdy), y: (e.touches[0].clientY + e.touches[1].clientY) / 2 };
        } else { twoFinger = null; }
      }, { passive: true });
      mapEl2D.addEventListener('touchmove', function(e) {
        if (!twoFinger || e.touches.length !== 2) return;
        if (document.getElementById('earth3d').classList.contains('open')) return;
        var mdx = e.touches[0].clientX - e.touches[1].clientX;
        var mdy = e.touches[0].clientY - e.touches[1].clientY;
        var nd = Math.sqrt(mdx * mdx + mdy * mdy);
        var ny = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        if (Math.abs(nd - twoFinger.d) < 45 && Math.abs(ny - twoFinger.y) > 38) {
          twoFinger = null;
          open3D({ gesture: true, pitch: 52 });
        }
      }, { passive: true });
      mapEl2D.addEventListener('touchend', function() { twoFinger = null; }, { passive: true });
    }
    window.addEventListener('mousemove', function(e) {
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
    });
    var gearthBtn = document.getElementById('earth3d-gearth');
    if (gearthBtn) gearthBtn.addEventListener('click', function() {
      var glat = 34.4287, glng = -119.2375, gzm = 13, ghd = 0, gtl = 0;
      if (earth3dMap) {
        var gcc = earth3dMap.getCenter(); glat = gcc.lat; glng = gcc.lng;
        gzm = earth3dMap.getZoom(); ghd = earth3dMap.getBearing(); gtl = earth3dMap.getPitch();
      }
      var gdist = Math.round(40075017 * Math.abs(Math.cos(glat * Math.PI / 180)) / Math.pow(2, gzm + 1));
      window.open('https://earth.google.com/web/@' + glat.toFixed(6) + ',' + glng.toFixed(6) + ',0a,' + gdist + 'd,35y,' + ghd.toFixed(1) + 'h,' + gtl.toFixed(1) + 't,0r', '_blank');
    });`);

// ---------- 7. HTML: hint text + Google Earth button ----------
rep(`    <div id="earth3d-hint">drag to move · right-drag (or two fingers) to tilt &amp; orbit · scroll to dive · click a chip to fly there</div>
    <div id="earth3d-attrib">Imagery © Esri &nbsp;·&nbsp; Terrain: Mapzen / AWS Open Data</div>`,
`    <div id="earth3d-hint">drag to move · hold middle mouse (or right-drag / two fingers) to orbit &amp; tilt · scroll to dive · click a chip to fly there</div>
    <div id="earth3d-gearth" title="Open this exact view in Google Earth (new tab)">🌐 Google Earth</div>
    <div id="earth3d-attrib">Imagery © Esri &nbsp;·&nbsp; Terrain: Mapzen / AWS Open Data</div>`);

rep(`  <div id="earth-toggle" title="Fly the properties in 3D — satellite draped over real terrain">🌍 3D</div>`,
`  <div id="earth-toggle" title="Tilt into 3D — or just hold your middle mouse button and drag on the map (two-finger drag on mobile)">🌍 3D</div>`);

// ---------- 8. CSS: Google Earth button + mobile spacing ----------
rep(`    @media (max-width: 768px) {
      #earth-toggle { top: 56px; }
      #earth3d-hint { font-size: 11px; }
    }`,
`    #earth3d-gearth {
      position: absolute; bottom: 16px; right: 14px; z-index: 10;
      background: rgba(12, 14, 24, 0.85); color: #fff;
      padding: 7px 14px; border-radius: 999px;
      font-weight: 700; font-size: 12px; cursor: pointer;
      border: 1px solid rgba(140, 200, 255, 0.4);
      -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
    }
    #earth3d-gearth:hover { box-shadow: 0 0 14px rgba(90, 180, 255, 0.5); }
    @media (max-width: 768px) {
      #earth-toggle { top: 56px; }
      #earth3d-hint { font-size: 11px; }
      #earth3d-gearth { bottom: 56px; }
    }`);

writeFileSync(F, s);
console.log('patch14 applied:', n, 'edits');
