# 🏔️ Howard Property Interactive Map — 1320 Baldwin Rd, Ojai

**Initial layout release (V0.1)** — interactive satellite map with the real county-recorded property boundary. Project zones, galleries, and development content come next.

## Overview

Interactive web map for the Howard Property:

- **Address:** 1320 Baldwin Rd, Ojai, CA 93023
- **APN:** 032-0-010-090 (Ventura County, unincorporated)
- **Size:** ~44.1 acres (per County GIS parcel geometry)
- **Zoning:** OS-40 ac / SRP / TRU / DKS / HCWC
- **Boundary:** traced from the official Ventura County GIS parcel service (13 vertices, ~5,870 ft perimeter) — rendered as the animated glowing "rainbow" line

Built on the same single-file stack as the [Sulphur Mountain EcoVillage map](https://github.com/SacredRebel/EcoVillage-map): Node.js + Express serving a self-contained Leaflet frontend. Same interactions — satellite/street layer switching, smooth mobile panning, tap the boundary for the property panel, swipe-to-close panels, recenter control.

## Quick Start

```bash
npm install
npm run dev
# → http://localhost:5001
```

No environment variables required.

## Project Structure

```
├── server-complete.js   # The entire app: Express server + embedded Leaflet frontend
├── image-urls.js        # Image gallery manifest (empty until photos are added)
├── api/index.js         # Vercel serverless entry
├── vercel.json          # Vercel routing (images redirect → raw.githubusercontent.com)
├── images/              # (future) property & zone photos
└── package.json
```

## Roadmap

1. ✅ Map layout + real property lines + property info panel
2. ⬜ Property photo gallery (`images/Property/` + `image-urls.js`)
3. ⬜ Project zones: markers, territories, detail panels (`PROJECT_ZONES` in server-complete.js)
4. ⬜ Custom UI theme

## Deployment

Push to `main` and import into Vercel — zero build step. Railway/Render also work (`node server-complete.js`).

---

© 2026 Howard Property
