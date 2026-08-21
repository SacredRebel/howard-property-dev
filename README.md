# 🏔️ Howard Property Interactive Map — 1320 Baldwin Rd, Ojai

**Proposal release (V0.2)** — interactive satellite map with the real county-recorded property boundary and **13 proposed projects**, built as a visual proposal for the property owner. Reposition mode is ON: icons can be dragged, locked, and captured.

## Overview

Interactive web map for the Howard Property:

- **Address:** 1320 Baldwin Rd, Ojai, CA 93023
- **APN:** 032-0-010-090 (Ventura County, unincorporated)
- **Size:** ~44.1 acres (per County GIS parcel geometry)
- **Zoning:** OS-40 ac / SRP / TRU / DKS / HCWC
- **Boundary:** traced from the official Ventura County GIS parcel service — the animated glowing "rainbow" line

## The 13 Proposed Projects

🏠 Main House · ⛰️ Hugelkultur Project · 🛖 Community Hub · 🛠️ Community Workshop · 🌱 Nursery · 🏋️ Outdoor Nature Gym · 🔥 Ceremony & Sacred Spaces · 🍄 Mushroom Growing Containers · 🐝 Beekeeping & Honey Production · 🐟 Pond & Swimming Hole · 🌴 Growing Dome Greenhouse · 🐐 Livestock & Animals · ♻️ Compost Operation

Click any icon for its full proposal page: description, features, structure options, revenue ideas, and timelines.

## Repositioning Icons (currently enabled)

Positions are initial estimates. To fix them:

1. Click the **⚙️ button** (top right) → "Move & Lock Icons"
2. Select a zone → **🔓 Unlock** → drag its icon → **🔒 Lock**
3. Repeat for each icon, then hit **💾 Capture All Positions**
4. **📋 Copy** the JSON and paste it to Claude — the new positions get committed permanently

## Quick Start

```bash
npm install
npm run dev
# → http://localhost:5001
```

No environment variables required.

## Roadmap

1. ✅ Map layout + real property lines + property info panel
2. ✅ 13 proposal zones + drag-to-reposition mode
3. ⬜ Final positions locked in (after owner/johny review)
4. ⬜ Photo galleries per project (`images/` + `image-urls.js`)
5. ⬜ Custom UI theme · hide admin tools for public link

## Deployment

Push to `main` and import into Vercel — zero build step. Railway/Render also work (`node server-complete.js`).

---

© 2026 Howard Property
