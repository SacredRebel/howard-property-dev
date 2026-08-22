// V0.15 — the map wraps around the PLANET + 🌀 Portal buttons:
//  - MapLibre 4.7.1 -> 5.24.0: projection {type:'globe'} — scroll out from Ojai
//    and the map curves into a real globe floating in space
//  - Cosmos dressing (playground-cosmos-view vibe): CSS starfield behind the
//    globe + atmosphere halo (sky spec, fades out by z11 so property views stay crisp)
//  - Terrain kept (guarded try/catch in case globe+terrain unsupported on a device)
//  - 🌀 "Enter the Vision" portal button on every property panel: switches to
//    Vision mode + cinematic globe dive into that property. This is the doorway
//    the future gamifications (playground link, AR/VR) will plug into.
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

// 1. engine 4.7.1 -> 5.24.0 (css + js URLs)
repAll(`unpkg.com/maplibre-gl@4.7.1/dist/`, `unpkg.com/maplibre-gl@5.24.0/dist/`);

// 2. globe projection + atmosphere sky in the style
rep(`          layers: [{ id: 'sat', type: 'raster', source: 'sat' }]
        },`,
`          layers: [{ id: 'sat', type: 'raster', source: 'sat' }],
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
        },`);

// 3. terrain guarded (globe+terrain support varies by device)
rep(`        earth3dMap.setTerrain({ source: 'dem', exaggeration: 1.35 });`,
`        try { earth3dMap.setTerrain({ source: 'dem', exaggeration: 1.35 }); }
        catch (e) { console.warn('terrain not available with globe on this device:', e); }`);

// 4. dive state var
rep(`    var orbitDrag = null, midDrag2D = null;`,
`    var orbitDrag = null, midDrag2D = null;
    var earthDiveTo = null;`);

// 5. entry: portal dive > live gesture > auto-tilt
rep(`        // Entry: a live gesture drives the camera; otherwise auto-tilt into the terrain
        if (earthOpenedByGesture) {`,
`        // Entry: portal dive > live gesture > auto-tilt into the terrain
        if (earthDiveTo) {
          var dvp = earthDiveTo; earthDiveTo = null;
          earth3dMap.flyTo({
            center: [dvp.center[1], dvp.center[0]],
            zoom: Math.max((dvp.zoom || 15.5) - 1, 12.8),
            pitch: 62, bearing: -24,
            duration: 4200, curve: 1.7, essential: true
          });
        } else if (earthOpenedByGesture) {`);

// 6. starfield builds on open
rep(`      document.getElementById('earth3d').classList.add('open');
      loadMapLibre(function() {`,
`      document.getElementById('earth3d').classList.add('open');
      buildStars();
      loadMapLibre(function() {`);

// 7. portal handler + starfield generator (after the Google Earth button binding)
rep(`      var gdist = Math.round(40075017 * Math.abs(Math.cos(glat * Math.PI / 180)) / Math.pow(2, gzm + 1));
      window.open('https://earth.google.com/web/@' + glat.toFixed(6) + ',' + glng.toFixed(6) + ',0a,' + gdist + 'd,35y,' + ghd.toFixed(1) + 'h,' + gtl.toFixed(1) + 't,0r', '_blank');
    });`,
`      var gdist = Math.round(40075017 * Math.abs(Math.cos(glat * Math.PI / 180)) / Math.pow(2, gzm + 1));
      window.open('https://earth.google.com/web/@' + glat.toFixed(6) + ',' + glng.toFixed(6) + ',0a,' + gdist + 'd,35y,' + ghd.toFixed(1) + 'h,' + gtl.toFixed(1) + 't,0r', '_blank');
    });

    // 🌀 Portal: property panel -> Vision mode -> cinematic globe dive
    window.enterPortal = function(propId) {
      var pp = document.getElementById('property-panel');
      if (pp) pp.classList.remove('open');
      if (typeof unlockBodyScroll === 'function') unlockBodyScroll();
      if (!window.visionMode) { try { applyMode(true); } catch (e) {} }
      earthDiveTo = propertiesById[propId] || null;
      open3D({ dive: true });
    };
    function buildStars() {
      var el = document.getElementById('earth3d-stars');
      if (!el || el.dataset.built) return;
      el.dataset.built = '1';
      var sh = '';
      for (var i = 0; i < 160; i++) {
        var sx = (Math.random() * 100).toFixed(2);
        var sy = (Math.random() * 100).toFixed(2);
        var so = (Math.random() * 0.7 + 0.25).toFixed(2);
        sh += (sh ? ', ' : '') + sx + 'vw ' + sy + 'vh 0 ' + (Math.random() > 0.85 ? '1px' : '0') + ' rgba(255,255,255,' + so + ')';
      }
      var dot = document.createElement('div');
      dot.style.cssText = 'position:absolute;top:0;left:0;width:2px;height:2px;border-radius:50%;box-shadow:' + sh;
      el.appendChild(dot);
    }`);

// 8. HTML: starfield layer
rep(`  <div id="earth3d">
    <div id="earth3d-map"></div>`,
`  <div id="earth3d">
    <div id="earth3d-stars"></div>
    <div id="earth3d-map"></div>`);

// 9. CSS: stars behind, GL above, portal button
rep(`    #earth3d-map { position: absolute; inset: 0; }`,
`    #earth3d-stars { position: absolute; inset: 0; overflow: hidden; z-index: 0; }
    #earth3d-map { position: absolute; inset: 0; z-index: 1; }`);

rep(`    #earth3d-gearth:hover { box-shadow: 0 0 14px rgba(90, 180, 255, 0.5); }`,
`    #earth3d-gearth:hover { box-shadow: 0 0 14px rgba(90, 180, 255, 0.5); }
    .portal-btn {
      margin: 18px 0 6px; padding: 13px 18px; text-align: center;
      background: linear-gradient(135deg, #2b1a55 0%, #6a3d9a 50%, #2c6e9e 100%);
      color: #fff; font-weight: 800; font-size: 15px; letter-spacing: 0.4px;
      border-radius: 14px; cursor: pointer; user-select: none;
      border: 1.5px solid rgba(255, 215, 0, 0.55);
      box-shadow: 0 4px 18px rgba(80, 40, 140, 0.45);
      transition: box-shadow 0.25s ease, transform 0.15s ease;
    }
    .portal-btn:hover { box-shadow: 0 0 24px rgba(255, 215, 0, 0.4); transform: scale(1.02); }`);

// 10. portal button rides every property panel
rep(`        contentEl.innerHTML = panelData.html;`,
`        contentEl.innerHTML = panelData.html + '<div class="portal-btn" onclick="window.enterPortal(&quot;' + prop.id + '&quot;)">🌀 Enter the Vision</div>';`);

// 11. hint mentions the planet
rep(`    <div id="earth3d-hint">drag to move · hold middle mouse (or right-drag / two fingers) to orbit &amp; tilt · scroll to dive · click a chip to fly there</div>`,
`    <div id="earth3d-hint">drag to move · hold middle mouse (or right-drag / two fingers) to orbit &amp; tilt · scroll out to see the whole planet · click a chip to fly there</div>`);

// 12. log line
rep(`        console.log('🌍 3D terrain mode ready -', properties.length, 'properties draped on real elevation');`,
`        console.log('🌍 globe mode ready -', properties.length, 'properties on a real planet (MapLibre 5, globe projection)');`);

writeFileSync(F, s);
console.log('patch15 applied:', n, 'edits');
