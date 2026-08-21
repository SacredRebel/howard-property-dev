# CLAUDE.md

Guidance for AI coding assistants working in this repository.

## Overview

Interactive **proposal map** for the Howard Property — 1320 Baldwin Rd, Ojai, CA 93023 (APN 032-0-010-090, ~44.1 acres, zoning OS-40 ac/SRP/TRU/DKS/HCWC). Duplicated from the Sulphur Mountain EcoVillage stack (`SacredRebel/EcoVillage-map`). Current state: **V0.2** — real county boundary + 13 proposed project zones + reposition mode ENABLED.

## Architecture — single-file app

`server-complete.js` (~6,800 lines) is the entire application:

- **`PROJECT_ZONES`** — 13 proposal zone objects (main-house, hugelkultur-project, community-hub, community-workshop, property-nursery, nature-gym, sacred-spaces, mushroom-containers, beekeeping, pond-swimming-hole, growing-dome, livestock, compost-operation). Each renders a 3D-style emoji marker + territory circle + full detail side panel. Zone fields: id, name, emoji, position [lat,lng], type, budget, timeline, monthlyRevenue, roi, description, features[], optional revenueStreams[], developmentTimeline[], regenerativeFeatures[], and **optionsTitle + options[{name, details}]** (custom section added in V0.2, used by community-hub for structure options).
- **`PERMANENT_PROPERTY_LINES`** — 8 segments of the REAL parcel boundary from Ventura County GIS (`maps.ventura.org/.../SDs/Parcels/FeatureServer/0`, `APN10='0320010090'`). Stitched client-side into one closed animated rainbow loop.
- **`app.get('/')`** — whole frontend as a template literal (inner escapes `\${...}` / `` \` ``); data injected via `ZONES_DATA_PLACEHOLDER` / `PERMANENT_LINES_PLACEHOLDER`.
- **Map:** center `[34.424346, -119.319557]`, zoom 16.5, Esri World Imagery + Google/OSM failover.
- **Types → colors** (frontend `zoneColorMap`): agriculture, residential, community, hospitality, infrastructure, creative, ceremonial, wellness, landscape, beekeeping, events, **water** (added V0.2 for the pond).

## Reposition mode (V0.2 — currently ON)

- The ⚙️ admin toggle is **visible** (`.admin-menu-toggle` has `display: flex`). Flow: select zone → unlock → drag marker → lock → **Capture All Positions** → overlay shows `{ "zone-id": [lat, lng], ... }` JSON with copy/download.
- The user (johny) pastes that JSON back to Claude; Claude updates each zone's `position` in `PROJECT_ZONES` and commits.
- **After positions are final:** re-hide the admin tool by restoring `display: none !important;` on `.admin-menu-toggle`.
- The 🎨 territory-editor toggle stays hidden (canvas drawing, not wired to persistence).

## Commands

```bash
npm install
npm run dev      # → http://localhost:5001
```

No env vars, no build, no database.

## Next steps

1. Lock final positions (paste from capture overlay → update `PROJECT_ZONES`).
2. Photos: `images/<Zone Name>/{current,vision}/` + entries in `image-urls.js` + ids→folders in `PROJECT_FOLDER_MAP`.
3. Public release: hide admin toggle again.

## Key gotchas

- Frontend lives inside a template literal — keep `\${...}` / `` \` `` escaping intact; placeholders `ZONES_DATA_PLACEHOLDER` / `PERMANENT_LINES_PLACEHOLDER` must remain.
- Boundary segments chain end-to-start; client drops each segment's last point and closes the loop.
- `vercel.json` hardcodes this repo's raw.githubusercontent URL for `/images/*`.
- Zone panel CTA contacts: Mark Panics + Paul Muresan (proposal audience: John Ellis).
