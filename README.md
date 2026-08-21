# 🗺️ Ojai Valley Properties — Interactive Development Map

**Multi-property platform (V0.5)** — one interactive map, multiple properties in the Upper Ojai Valley: the **Howard Property** (1320 Baldwin Rd), the **Sulphur Mountain Eco-Village** (11962 Sulphur Mountain Rd), and **Keri's Property** (14209 De La Garrigue Rd).

## How it works

The map opens on an **overview** showing both parcels with their glowing rainbow boundaries and name chips. Click a chip (or zoom in) to fly into a property — its project icons appear below zoom 15. Click any icon for the full project page; click a boundary for that property's details panel.

| Property | Projects | Size | Status |
|---|---|---|---|
| 🏔️ Howard Property | 13 proposed | ~44 acres | Proposal draft |
| 🌿 Sulphur Mountain Eco-Village | 18 zones | ~10 acres | V1 production data |
| 🌸 Keri's Property | 3 places | ~34 acres | Starting points |

Sulphur Mountain photos load directly from the [EcoVillage-map repo](https://github.com/SacredRebel/EcoVillage-map) via raw.githubusercontent.com — no image copies in this repo.

## Adding a new property

1. Create `properties/<name>.js` exporting a property object: `{ id, name, shortLabel, labelChip, center, zoom, footerTitle, footerInfo, cta, panel: { title, html }, boundary: [segments], zones: [zones] }` (copy `properties/howard.js` as the template).
2. Register it in `server-complete.js`: add the import and append to `PROPERTIES`.
3. Add an entry in `image-urls.js` under the property's id for photos.

That's it — boundaries, panels, icons, admin tools, and the overview all pick it up automatically.

## Position Editor (currently enabled)

Click the **⚙️ button** (top right) to open the Position Editor — it stays open while you work:

1. **Pick a property** — the map flies there (buttons appear automatically for every property)
2. **Start Editing** — ALL of that property's icons unlock at once with a glowing pulse; drag any of them (the map still pans/zooms; icon taps won't open panels while editing). A live list shows everything you've moved, and **Reset This Property** undoes the session.
3. **🔒 Save Layout for Everyone** — commits the layout straight to git (`data/zone-positions.json`) and Vercel redeploys with it baked in. First save asks for the Edit PIN (then remembers it on that device). **📋 Capture / Export** stays as a backup path.

### How saving works (git-backed)

`data/zone-positions.json` is the live source of truth for icon positions — the server applies it over the built-in defaults at boot. The Save button POSTs to `/api/save-positions`, which verifies the PIN and commits the new file to GitHub via the Contents API, so **every layout change is a git commit** and the site auto-redeploys.

One-time setup (Vercel → project → Settings → Environment Variables):

| Variable | Value |
|---|---|
| `EDIT_PIN` | any PIN you choose — the editor asks for it on first save |
| `GITHUB_TOKEN` | fine-grained PAT, this repo only, **Contents: Read & write** |

Until those are set, the Save button politely says saving isn't configured and the Capture → paste-to-Claude path still works.

## Quick Start

```bash
npm install
npm run dev
# → http://localhost:5001
```

No env vars, no build step.

## Structure

```
├── server-complete.js            # App: Express + embedded Leaflet frontend
├── properties/
│   ├── howard.js                 # Howard Property (zones, boundary, panel, CTA)
│   └── sulphur-mountain.js       # Sulphur Mountain Eco-Village
├── image-urls.js                 # Photo manifests, namespaced by property id
├── api/index.js                  # Vercel serverless entry
└── vercel.json
```

## Roadmap

1. ✅ Howard layout + real county boundary
2. ✅ 13 Howard proposal zones + reposition mode
3. ✅ Multi-property merge (Sulphur Mountain on the same map)
4. ⬜ Final Howard icon positions locked
5. ⬜ Howard photo galleries
6. ⬜ Custom UI theme · hide admin tools for public release

---

© 2026 Howard Property + Sulphur Mountain Eco-Village
