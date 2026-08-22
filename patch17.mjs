// V0.17 — proposal architecture (interface layer):
//  - REVERSED middle-drag rotation (drag right now turns the camera right)
//  - mode strip: every panel says clearly whether you're seeing TODAY or the VISION
//  - status/deal card: server-rendered from prop.status {today:{...}, vision:{...}}
//    (for sale / not for sale / raise amounts / proposal state) - injected atop
//    every property panel, different content per mode
//  - documents section: prop.docs [{label,file}] -> download links at panel bottom
//  - community preview card: clicking a property boundary now opens a compact
//    card FIRST (title, mode strip, status, actions) - Full Details / Enter the Vision
//  - switching Today<->Vision live-refreshes any open panel or card
import { readFileSync, writeFileSync } from 'fs';
const F = 'server-complete.js';
let s = readFileSync(F, 'utf8');
let n = 0;
function rep(from, to) {
  if (!s.includes(from)) throw new Error('anchor missing: ' + from.slice(0, 70));
  s = s.replace(from, to); n++;
}

// ---------- 1. rotation direction: drag right = turn right ----------
rep(`        earth3dMap.setBearing(earth3dMap.getBearing() - ddx * 0.35);`,
    `        earth3dMap.setBearing(earth3dMap.getBearing() + ddx * 0.35);`);
rep(`        earthPendBearing -= ddx * 0.35;`,
    `        earthPendBearing += ddx * 0.35;`);

// ---------- 2. property panel: strip + status card + docs + mode-aware portal ----------
rep(`        contentEl.innerHTML = panelData.html + '<div class="portal-btn" onclick="window.enterPortal(&quot;' + prop.id + '&quot;)">🌀 Enter the Vision</div>';`,
`        contentEl.innerHTML = (window.modeStripHTML ? window.modeStripHTML() : '')
          + (window.statusCardHTML ? window.statusCardHTML(prop) : '')
          + panelData.html
          + (window.docsSectionHTML ? window.docsSectionHTML(prop) : '')
          + '<div class="portal-btn" onclick="window.enterPortal(&quot;' + prop.id + '&quot;)">' + (window.visionMode ? '🌍 Fly the Vision in 3D' : '🌀 Enter the Vision') + '</div>';`);

// ---------- 3. boundary click opens the compact community card first ----------
rep(`        openPropertyPanel(prop.id);`,
    `        window.openCommunityCard(prop.id);`);

// ---------- 4. zone panels carry the mode strip too ----------
rep(`        content.innerHTML = generateProjectDetails(zone);`,
    `        content.innerHTML = (window.modeStripHTML ? window.modeStripHTML() : '') + generateProjectDetails(zone);`);

// ---------- 5. helpers: strips, status cards, docs, community card ----------
rep(`    // ---- Current / Vision mode engine ----`,
`    // ---- Status cards, mode strips, documents, community preview cards (V0.17) ----
    window.modeStripHTML = function() {
      if (window.visionMode) {
        return '<div class="mode-strip vision">✨ VISION — proposed potential &amp; plans</div>';
      }
      return '<div class="mode-strip today">🏞️ TODAY — the property as it really is</div>';
    };
    window.statusCardHTML = function(prop) {
      var st = prop.status && (window.visionMode ? prop.status.vision : prop.status.today);
      if (!st) return '';
      var h = '<div class="status-card' + (window.visionMode ? ' vision' : '') + '">';
      h += '<div class="status-badge">' + st.badge + '</div>';
      (st.rows || []).forEach(function(r) {
        h += '<div class="status-row"><span class="status-label">' + r[0] + '</span><span class="status-value">' + r[1] + '</span></div>';
      });
      if (st.note) h += '<div class="status-note">' + st.note + '</div>';
      h += '</div>';
      return h;
    };
    window.docsSectionHTML = function(prop) {
      if (!prop.docs || !prop.docs.length) return '';
      var h = '<div class="docs-section"><h4>📄 Documents &amp; Proposals</h4>';
      prop.docs.forEach(function(d) {
        h += '<a class="doc-link" href="https://raw.githubusercontent.com/SacredRebel/howard-property-dev/main/' + d.file + '" target="_blank" rel="noopener"><span>' + d.label + '</span><span class="doc-dl">open ↗</span></a>';
      });
      h += '</div>';
      return h;
    };
    window.lastCommunityCardId = null;
    window.openCommunityCard = function(propId) {
      var prop = propertiesById[propId];
      if (!prop) return;
      var card = document.getElementById('community-card');
      var box = document.getElementById('community-card-box');
      if (!card || !box) { openPropertyPanel(propId); return; }
      window.lastCommunityCardId = propId;
      var title = (window.visionMode && prop.visionLabelChip) ? prop.visionLabelChip : (prop.labelChip || prop.name);
      var h = '<div class="cc-close" onclick="window.closeCommunityCard()">✕</div>';
      h += '<div class="cc-title">' + title + '</div>';
      h += window.modeStripHTML();
      h += window.statusCardHTML(prop);
      if (prop.docs && prop.docs.length) {
        h += '<div class="cc-docs">📄 ' + prop.docs.length + ' document' + (prop.docs.length > 1 ? 's' : '') + ' in Full Details</div>';
      }
      h += '<div class="cc-actions">';
      h += '<div class="cc-btn primary" onclick="window.closeCommunityCard(); openPropertyPanel(&quot;' + prop.id + '&quot;)">📖 Full Details</div>';
      h += '<div class="cc-btn portal" onclick="window.closeCommunityCard(); window.enterPortal(&quot;' + prop.id + '&quot;)">🌀 Enter the Vision</div>';
      h += '</div>';
      box.innerHTML = h;
      card.classList.add('open');
    };
    window.closeCommunityCard = function() {
      var card = document.getElementById('community-card');
      if (card) card.classList.remove('open');
      window.lastCommunityCardId = null;
    };

    // ---- Current / Vision mode engine ----`);

// ---------- 6. applyMode live-refreshes open panel / card ----------
rep(`      console.log(vision ? '✨ Vision mode — Lemuria awakens' : '🏞️ Current mode — the reality of today');
    }`,
`      // live-refresh any open property panel / community card into the new mode
      var ppEl = document.getElementById('property-panel');
      if (ppEl && ppEl.classList.contains('open') && window.currentPropertyId) {
        openPropertyPanel(window.currentPropertyId);
      }
      var ccElRef = document.getElementById('community-card');
      if (ccElRef && ccElRef.classList.contains('open') && window.lastCommunityCardId) {
        window.openCommunityCard(window.lastCommunityCardId);
      }
      console.log(vision ? '✨ Vision mode — Lemuria awakens' : '🏞️ Current mode — the reality of today');
    }`);

// ---------- 7. HTML: community card overlay ----------
rep(`    <div id="earth3d-attrib">Imagery © Esri &nbsp;·&nbsp; Terrain: Mapzen / AWS Open Data</div>
  </div>`,
`    <div id="earth3d-attrib">Imagery © Esri &nbsp;·&nbsp; Terrain: Mapzen / AWS Open Data</div>
  </div>

  <!-- Community preview card (opens first on property click) -->
  <div id="community-card" onclick="if (event.target === this) window.closeCommunityCard()">
    <div id="community-card-box"></div>
  </div>`);

// ---------- 8. CSS ----------
rep(`    .portal-btn:hover { box-shadow: 0 0 24px rgba(255, 215, 0, 0.4); transform: scale(1.02); }`,
`    .portal-btn:hover { box-shadow: 0 0 24px rgba(255, 215, 0, 0.4); transform: scale(1.02); }
    .mode-strip {
      margin: 0 0 14px; padding: 7px 14px; border-radius: 10px;
      font-size: 11.5px; font-weight: 800; letter-spacing: 0.8px;
      text-align: center; text-transform: uppercase;
    }
    .mode-strip.today { background: rgba(46, 125, 50, 0.14); color: #2e7d32; border: 1px solid rgba(46, 125, 50, 0.35); }
    .mode-strip.vision { background: linear-gradient(135deg, rgba(74, 20, 140, 0.16), rgba(255, 215, 0, 0.10)); color: #6a3d9a; border: 1px solid rgba(255, 215, 0, 0.5); }
    .status-card {
      margin: 0 0 18px; padding: 14px 16px; border-radius: 14px;
      background: rgba(46, 125, 50, 0.07); border: 1.5px solid rgba(46, 125, 50, 0.3);
    }
    .status-card.vision { background: linear-gradient(135deg, rgba(74, 20, 140, 0.08), rgba(255, 215, 0, 0.06)); border-color: rgba(255, 215, 0, 0.55); }
    .status-badge {
      display: inline-block; margin-bottom: 10px; padding: 6px 13px;
      border-radius: 999px; font-size: 13px; font-weight: 800;
      background: #2e7d32; color: #fff;
    }
    .status-card.vision .status-badge { background: linear-gradient(135deg, #4c3a8c, #6a3d9a); box-shadow: 0 0 10px rgba(255, 215, 0, 0.3); }
    .status-row { display: flex; justify-content: space-between; gap: 12px; padding: 5px 0; border-bottom: 1px dashed rgba(120, 120, 120, 0.22); font-size: 13.5px; }
    .status-row:last-of-type { border-bottom: none; }
    .status-label { opacity: 0.75; font-weight: 600; white-space: nowrap; }
    .status-value { text-align: right; font-weight: 700; }
    .status-note { margin-top: 9px; font-size: 12.5px; line-height: 1.45; opacity: 0.85; font-style: italic; }
    .docs-section { margin: 20px 0 4px; padding: 14px 16px; border-radius: 14px; background: rgba(44, 110, 158, 0.08); border: 1.5px solid rgba(44, 110, 158, 0.35); }
    .docs-section h4 { margin: 0 0 10px; }
    .doc-link {
      display: flex; justify-content: space-between; align-items: center; gap: 10px;
      padding: 10px 13px; margin-bottom: 8px; border-radius: 10px;
      background: rgba(44, 110, 158, 0.12); border: 1px solid rgba(44, 110, 158, 0.3);
      color: inherit; text-decoration: none; font-weight: 700; font-size: 13.5px;
    }
    .doc-link:last-child { margin-bottom: 0; }
    .doc-link:hover { background: rgba(44, 110, 158, 0.22); }
    .doc-dl { font-size: 12px; opacity: 0.75; white-space: nowrap; }
    #community-card {
      position: fixed; inset: 0; z-index: 2500; display: none;
      align-items: center; justify-content: center;
      background: rgba(8, 10, 18, 0.55);
      -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
    }
    #community-card.open { display: flex; }
    #community-card-box {
      position: relative; width: min(92vw, 440px); max-height: 82vh; overflow-y: auto;
      background: rgba(20, 22, 34, 0.96); color: #f2f2f6;
      border: 1.5px solid rgba(255, 215, 0, 0.45); border-radius: 20px;
      padding: 22px 22px 18px; box-shadow: 0 18px 60px rgba(0, 0, 0, 0.55);
    }
    #community-card-box .cc-close {
      position: absolute; top: 12px; right: 14px; cursor: pointer;
      font-size: 15px; opacity: 0.7; padding: 4px 8px;
    }
    #community-card-box .cc-close:hover { opacity: 1; }
    #community-card-box .cc-title { font-size: 19px; font-weight: 800; margin: 0 34px 12px 0; }
    #community-card-box .status-card { background: rgba(46, 125, 50, 0.14); }
    #community-card-box .status-card.vision { background: linear-gradient(135deg, rgba(106, 61, 154, 0.22), rgba(255, 215, 0, 0.08)); }
    #community-card-box .cc-docs { margin: 2px 0 4px; font-size: 12.5px; opacity: 0.8; }
    #community-card-box .cc-actions { display: flex; gap: 10px; margin-top: 14px; }
    #community-card-box .cc-btn {
      flex: 1; text-align: center; padding: 12px 10px; border-radius: 12px;
      font-weight: 800; font-size: 13.5px; cursor: pointer; user-select: none;
    }
    #community-card-box .cc-btn.primary { background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.3); }
    #community-card-box .cc-btn.primary:hover { background: rgba(255, 255, 255, 0.2); }
    #community-card-box .cc-btn.portal { background: linear-gradient(135deg, #2b1a55, #6a3d9a); border: 1px solid rgba(255, 215, 0, 0.5); }
    #community-card-box .cc-btn.portal:hover { box-shadow: 0 0 16px rgba(255, 215, 0, 0.4); }`);

// ---------- 9. mode pill rides ABOVE the community card (flip modes while it's open) ----------
rep(`      z-index: 1200; display: flex; gap: 2px;`,
    `      z-index: 2600; display: flex; gap: 2px;`);

writeFileSync(F, s);
console.log('patch17 applied:', n, 'edits');
