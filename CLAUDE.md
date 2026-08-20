# CLAUDE.md

Guidance for AI coding assistants working in this repository.

## Overview

Interactive property map for the **Howard Property** — 1320 Baldwin Rd, Ojai, CA 93023 (APN 032-0-010-090, ~44.1 acres, zoning OS-40 ac/SRP/TRU/DKS/HCWC). This is a duplicate of the Sulphur Mountain EcoVillage map stack (`SacredRebel/EcoVillage-map`) rebuilt for a new parcel. Currently at **initial layout stage**: map + real boundary + property panel, with **no project zones yet**.

## Architecture — single-file app

`server-complete.js` (~6,300 lines) is the entire application:

- **Lines ~1–30:** Express setup (compression, cors, json). Port 5001 locally; `export default app` + `api/index.js` for Vercel serverless.
- **`PROJECT_ZONES = []`:** intentionally empty. Adding a zone object here (id, name, emoji, `position: [lat,lng]`, type, budget, description, features, etc.) automatically renders its marker, territory circle, and full detail side panel — the whole rendering/panel pipeline from the EcoVillage map is intact and dormant.
- **`PERMANENT_PROPERTY_LINES`:** 8 segments = the REAL parcel boundary from the Ventura County GIS parcel service (`maps.ventura.org/arcgis/rest/services/SDs/Parcels/FeatureServer/0`, query `APN10='0320010090'`, WGS84). Segments share endpoints and are stitched client-side into one closed loop rendered as 3 stacked polylines (gold glow + animated rainbow line + invisible 30px hit line).
- **`app.get('/')`:** the whole frontend (HTML/CSS/JS + Leaflet 1.9.4 from unpkg) as a template literal; zone/boundary data injected via `ZONES_DATA_PLACEHOLDER` / `PERMANENT_LINES_PLACEHOLDER` string replacement.
- **Map:** centered `[34.424346, -119.319557]` (parcel centroid), zoom 16.5. Esri World Imagery default, Google Satellite + OSM alternates with auto-failover. Recenter control bottom-right.
- **Panels:** clicking the boundary opens the right-side property panel (hardcoded parcel facts in `openPropertyPanel()`). Zone side panel (left) is dormant until zones exist.
- **APIs:** `/api/project-zones`, `/api/health`, `/api/images/:zoneId/:category` (reads `image-urls.js`), static `/images` (30-day cache; on Vercel `/images/*` 302-redirects to raw.githubusercontent.com — see vercel.json).

## Commands

```bash
npm install
npm run dev      # node server-complete.js → http://localhost:5001
```

No env vars, no build step, no database.

## Adding content later

1. **Zones:** append objects to `PROJECT_ZONES`. Reposition visually: unhide the admin tool (remove `display: none !important` from `.admin-menu-toggle` CSS), drag markers, use "Capture All Positions", paste coordinates back, re-hide.
2. **Photos:** add `images/<Zone Name>/{current,vision}/` files, list them (URL-encoded) in `image-urls.js`, and map ids → folder names in `PROJECT_FOLDER_MAP`.
3. **Property gallery:** `IMAGE_URLS.property.current` array.

## Key gotchas (inherited from the V1 stack)

- Frontend code lives inside a template literal — inner template syntax is escaped (`\${...}`, `\``). Don't break the escaping.
- The two placeholder tokens must remain exactly `ZONES_DATA_PLACEHOLDER` and `PERMANENT_LINES_PLACEHOLDER`.
- Boundary segments must chain (each segment's last coord = next segment's first); the client drops each segment's last point when stitching and auto-closes the loop.
- `vercel.json` hardcodes this repo's raw.githubusercontent URL for `/images/*` — update if the repo is renamed/forked.
- Hidden admin tools (⚙️ zone mover, 🎨 territory painter) are shipped but display:none'd in CSS.
