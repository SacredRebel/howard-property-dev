# CLAUDE.md

Guidance for AI coding assistants working in this repository.

## Overview

**Multi-property interactive map** (V0.9): one Leaflet app serving several properties, each with its own boundary, project zones, panels, and photo galleries. Current properties: `howard` (1320 Baldwin Rd, Ojai — 13 proposal zones), `sulphur-mountain` (Eco-Village — 18 zones, V1 data from `SacredRebel/EcoVillage-map`), `keris-property` (3 zones), `chers-property` (2 zones), and `black-mountain-ranch` (63 real county parcels drawn as lot territories + 6 Lemuria vision zones).

## Architecture

- **`properties/*.js`** — one module per property: `{ id, name, shortLabel, labelChip, center, zoom, footerTitle, footerInfo[], cta { heading, paragraph, contacts[], buttons[] }, panel { title, html }, boundary[], zones[], lots?[], lotStyle? }`. Adding a property = new module + import + append to `PROPERTIES` in server-complete.js.
- **`server-complete.js`** — Express + whole frontend in a template literal. `PROPERTIES` array is injected via the `PROPERTIES_PLACEHOLDER` token (JSON). Aggregates `PROJECT_ZONES` / `PERMANENT_PROPERTY_LINES` feed `/api/health` and `/api/project-zones`.
- **Frontend flow:** map starts at `fitBounds` of all boundaries (overview). Below zoom 13.5 the `#map` div gets `.overview-mode`: per-property **label chips** show (click → flyTo property). Zone markers are shown per property — visible once `zoom >= thatProperty.zoom - 2.5` (`updateMarkerScale`), so a huge ranch shows icons while a small neighbor's stay tucked. Each property renders 3 stacked polylines (glow + animated rainbow + 30px invisible hit line); boundary click → `openPropertyPanel(propId)` which injects `prop.panel.html` and calls `loadPropertyImages(propId)`.
- **🌍 3D terrain mode (V0.13):** `#earth-toggle` (under the mode pill) opens a fullscreen MapLibre GL overlay (`#earth3d`): Esri World Imagery draped over AWS terrarium elevation (`setTerrain`, exaggeration 1.35, maxPitch 80), free/keyless sources. MapLibre 4.7.1 lazy-loads from unpkg on first open; the GL map is destroyed on exit. Rebuilt each open, so it inherits the Current/Vision state: zone markers filter via `window.zoneVisibleInMode`, names via `window.zoneView`, chips honor `visionLabelChip`. Property boundaries render as gold-glow + violet lines, ranch lots as thin white plat lines; chips fly cinematically (`flyTo` pitch 62). 2D map got Google-Earth-feel physics: `zoomSnap 0.25`, long parabolic `flyTo`/`flyToBounds` flights, glide inertia. **V0.14 gesture bridge (one connected map):** middle-mouse-hold-drag on the 2D map (or a parallel two-finger drag on touch — spread change < 45px, |dy| > 38px) opens 3D and the SAME drag keeps driving pitch/bearing — deltas accumulate in `earthPendPitch/Bearing` until GL `load` fires (`earthReady`), then apply live at 0.35°/px; middle-drag orbits inside 3D too (canvas `mousedown` button 1 → shared window-level move handler); `close3D()` hands the camera back (`map.setView(center, glZoom+1)`); gestures are suppressed while `window.positionEditActive`. `#earth3d-gearth` opens the exact current camera in Google Earth web (`earth.google.com/web/@lat,lng,0a,DISTd,35y,Hh,Tt,0r`, no API key). `window.earth3dRef` exposes the GL map for tests.
- **Current ⇄ Vision mode (V0.9):** `#mode-toggle` pill switches `window.visionMode` (persisted in `localStorage.ojaiMapMode`). `zone.mode` (`'current' | 'vision' | 'both'`, default both) gates each zone's marker (`updateMarkerScale`) and territory circle (`window.zoneTerritoryToggles`). In vision mode: property chips swap to `prop.visionLabelChip`, property panels to `prop.visionPanel`, the footer re-renders (`#map-footer-text`), `body.vision-mode` drives gold/purple styling, and property galleries prefer the `vision` image category (fallback `current`). All handled by `applyMode()` near the end of the frontend script. The ranch's vision zones + panel live in `bmr/vision.mjs` — edit there and regenerate.
- **Lot territories (V0.8):** a property with `lots[]` (each `{ id, apn, name, acreage, rings: [[lat,lng]…] }`) renders every ring as a thin white plat-style polygon (styled by `lotStyle`) BEFORE its rainbow boundary, each with an APN/acreage popup. `properties/black-mountain-ranch.js` is GENERATED — `node bmr/build-bmr.mjs` builds it from `bmr/all-parcels.json` (county GIS geometry, per-parcel sha256-verified vs `bmr/parcel-hashes.json`, refetchable with `bmr/fetch-parcels.mjs`); regenerate, never hand-edit.
- **Zone panels:** `generateProjectDetails(zone)` looks up `propertiesById[zone.propertyId]` for the per-property CTA + footer. Zone galleries fetch `/api/images/:propertyId/:zoneId/:category` (manifest: `image-urls.js`, namespaced by property id; `'property'` zoneId = property panel gallery). Sulphur photos are absolute raw.githubusercontent.com URLs into EcoVillage-map.
- **Zone ids may repeat across properties** (both have `community-hub`) — everything is keyed `propertyId + '/' + zoneId` where uniqueness matters (admin markerMap, selector values); the images API namespaces by property.

## Position Editor (V0.4 — ON)

⚙️ opens the Position Editor (never auto-closes on outside clicks): property buttons (auto-generated from `PROPERTIES`) → Start Editing unlocks ALL of that property's markers (`.marker-editing` glow — box-shadow-only animation so it never fights the zoom-scale inline transform) → drags update `zone.position`, redraw the territory circle via `window.zoneTerritories[propId/zoneId]` (single mutable reference — repeat drags never stack duplicate circles), and feed `window.notifyZoneMoved` (live moved-list UI). While `window.positionEditActive` is true, zone-marker and boundary click handlers are suppressed so panels can't open mid-edit. Reset restores `zone.originalPosition` for the whole property. Capture overlay outputs `{ "<propertyId>": { "<zoneId>": [lat, lng], ... }, ... }` for pasting back to Claude. To hide for public release: restore `display: none !important;` on `.admin-menu-toggle`.

## Git-backed layout saving (V0.6)

- `data/zone-positions.json` = live source of truth for icon positions; applied over module defaults at server boot (module positions are the fallback if the file is missing).
- `POST /api/save-positions` `{ pin, positions: {propId: {zoneId: [lat,lng]}} }`: checks `EDIT_PIN` env var, validates ids against `PROPERTIES`, applies in-memory, then commits the file to GitHub via the Contents API using `GITHUB_TOKEN` (fine-grained PAT, Contents R/W on this repo; `GITHUB_REPO` env overrides the default repo slug). Missing env vars → 501; the editor then guides users to the Capture/export fallback.
- The editor's 🔒 Save button drives this; PIN is remembered in `localStorage.ojaiMapEditPin` (cleared on 401).
- When baking positions manually, update BOTH the property modules and `data/zone-positions.json` so defaults and live file agree.

**Testing note:** the frontend lives inside a template literal, so `node --check server-complete.js` does NOT validate the embedded page JS. Always extract the served page's `<script>` block and `node --check` that too.

## Commands

```bash
npm install && npm run dev   # → http://localhost:5001
```

## Key gotchas

- Frontend lives in a template literal — keep `\${...}` / `` \` `` escaping intact; the injection token is exactly `PROPERTIES_PLACEHOLDER`.
- Boundary segments per property must chain (segment N's last coord = segment N+1's first); client stitches and closes each loop.
- `preferCanvas: true` — boundary/circle vector layers are canvas-rendered (no per-path CSS), zone markers + label chips are DOM divIcons.
- `properties/*.js` panel `html` strings are injected into the panel verbatim — plain string-concat HTML, no `<script>` tags allowed (would break the JSON-in-`<script>` injection).
- Vercel: git-connected project `howard-property-dev` auto-deploys `main`; `/images/*` 302s to THIS repo's raw URLs (for future Howard photos).
- `images/` is the photo-upload tree (`images/<property>/<zone>/{current,vision}/`, property gallery = `images/<property>/property/current/`); new files must be listed in `image-urls.js` to show up.
- After ANY server/frontend patch, run the served-page check: boot the server, curl `/`, extract the inline `<script>`, `node --check` it — `node --check server-complete.js` alone does NOT parse the embedded frontend.
