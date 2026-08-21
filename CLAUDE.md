# CLAUDE.md

Guidance for AI coding assistants working in this repository.

## Overview

**Multi-property interactive map** (V0.3): one Leaflet app serving several properties, each with its own boundary, project zones, panels, and photo galleries. Current properties: `howard` (1320 Baldwin Rd, Ojai — 13 proposal zones, reposition mode ON) and `sulphur-mountain` (Sulphur Mountain Eco-Village — 18 zones, V1 production data from `SacredRebel/EcoVillage-map`).

## Architecture

- **`properties/*.js`** — one module per property: `{ id, name, shortLabel, labelChip, center, zoom, footerTitle, footerInfo[], cta { heading, paragraph, contacts[], buttons[] }, panel { title, html }, boundary[], zones[] }`. Adding a property = new module + import + append to `PROPERTIES` in server-complete.js.
- **`server-complete.js`** — Express + whole frontend in a template literal. `PROPERTIES` array is injected via the `PROPERTIES_PLACEHOLDER` token (JSON). Aggregates `PROJECT_ZONES` / `PERMANENT_PROPERTY_LINES` feed `/api/health` and `/api/project-zones`.
- **Frontend flow:** map starts at `fitBounds` of all boundaries (overview). Below zoom 15 the `#map` div gets `.overview-mode`: zone markers hide, per-property **label chips** show (click → flyTo property). Each property renders 3 stacked polylines (glow + animated rainbow + 30px invisible hit line); boundary click → `openPropertyPanel(propId)` which injects `prop.panel.html` and calls `loadPropertyImages(propId)`.
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
