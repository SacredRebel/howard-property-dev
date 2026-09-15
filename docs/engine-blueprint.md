# Engine blueprint — from a map page to a game engine

*Written 15 Sep 2026 at V0.25, for the next stretch of work. Everything measured here was measured on the live site or from an open sandbox; nothing is a guess.*

## 1. Where the lines actually stand today (the millimetre question)

The request was to investigate why the rainbow property line, the county parcel line and the survey sheet did not agree, "down to the millimetre". Here is what the audit found, property by property.

Howard, Keri's, Cher's and Rose Valley: the rainbow boundary **is** the county parcel polygon, vertex for vertex. Measured deviation 0.0 m. Where those lines look different from the parcel layer it is only line width and glow.

Sulphur Mountain: the rainbow boundary had been hand-drawn. Against the county polygon it was 5.6 m off on average and 12.6 m off at worst. That is why nothing lined up there. As of V0.24 it is the surveyed traverse — the eleven recorded calls from the Henry Land Surveying sheet, each segment carrying its bearing and true length — and the traverse closes to 0.007 ft and gives 9.465 ac (assessor 9.470). The survey raster is registered to those same corners by a perspective fit; the held-out notch corners land within 0.2–0.6 px, about 0.3 m.

What still disagrees, and should: the county GIS parcel fabric matches the record on the east side of Sulphur but drifts up to 29 ft west of the record line on the west side (county north line ~657 ft against the recorded 630.04 ft). The county line is wrong there, not ours. Never site anything near the west line or the easement from the county polygon.

The honest precision statement, source by source, because "correct" means each layer shown at its own accuracy:

| Source | Inherent accuracy | Notes |
|---|---|---|
| Recorded survey (Sulphur) | ±0.05 ft relative between corners; absolute tie to NAD83 CA Zone 5 depends on the surveyor's control (typically ±0.1 ft with RTK) | Note 2 on the sheet: preliminary boundary, not a boundary establishment survey |
| Our survey overlay registration | ~0.3 m on the parcel body, ~3 m at the panhandle tip (edge of the photo) | Limited by the photographs, not the survey |
| County parcel fabric | ±1 m in town, ±5–30 ft on rural parcels | 29 ft drift documented at Sulphur's west line |
| Esri / Google imagery | ±1–3 m horizontal | Orthorectified, but on hillsides tree-tops lean |
| County aerial flights (1945–2025) | 3 in–1 ft pixels; positional ±0.5–2 m modern, ±5–15 m for 1945 | The 1945 flight was rectified decades later |
| USGS 3DEP elevation | 1 m grid, ~0.3 m vertical RMSE | The elevation readout on click |
| USGS historic topo sheets | ±10–40 m | Hand-drawn 1:62,500 and 1:24,000 sheets, scanned and warped |
| CGS geology / faults | ±50–250 m | Regional sheets at 1:250,000 and 1:750,000; the Alquist-Priolo traces are better (±10–20 m) |
| FEMA NFHL | ±5–15 m | Digitised from FIRM panels |

Millimetres are not a property of any public dataset. They are a property of a field survey. Two ways to get from ~0.3 m to centimetres on Sulphur, both cheap: request the approved permit set (the surveyor's PDF/CAD) from Ventura County Building & Safety — the sheet carries their APPROVED stamp of 30 Jan 2026 and permit files are public records; or have the four found monuments shot with RTK GPS (a half-day). Either gives exact State Plane coordinates to ingest directly, replacing the photo registration. Everything else in this document is designed so that when those coordinates arrive they drop in without touching anything else.

## 2. The positioning contract (what makes layers "bulletproof")

Every layer in the app now passes through one function. `vcSvcBase(def)` names the service, `vcExportTail(def)` builds everything after the bounding box, and both the Leaflet tile layer and the MapLibre raster source consume the same string. So 2D and 3D request the same bytes for the same ground, and a bug can only exist in one place.

The contract each source must satisfy:

1. **One projection.** Everything renders in EPSG:3857 on the standard 256-tile grid. Sources in other projections are reprojected server-side (ArcGIS `imageSR=3857`, WMS `SRS=EPSG:3857`) or rectified once in the pipeline (the survey PNG).
2. **Declared transport.** `export`, `xyz`, `wms`, `imgsvc`, `image`, or `parts` — never ad-hoc URLs in the UI.
3. **Declared scale range.** Regional sheets carry `maxZoom` and are requested at native scale then overzoomed, so they soften rather than vanish (V0.25).
4. **Declared provenance.** `src`, `srcUrl`, and the legend fetched from the publisher's own `/legend` endpoint — the app never invents a legend.
5. **A grid-alignment test.** For every new raster source, fetch one export tile at our computed bbox and compare it with the server's own cached tile (where a cache exists) or with a control point. The V0.25 check: USGSTopo `/export` at our bbox for tile 15/13041/5537 correlates **0.995 at zero pixel shift** with the CDN's own tile. That is the whole bbox pipeline proven on the servers' grid, and it is the test to keep running.
6. **Exact geometry for boundaries.** County ring or surveyed traverse, never hand-drawn (the V0.24 rule). Scanned sheets are stored with their registration transform and residuals (`data/sulphur-survey.json`), so the error is known, not hidden.

## 3. Why the current build cannot be made fast, and what replaces it

What the browser downloads today: one 610 KB HTML page (about 110 KB over the wire) containing the whole application and the 235 KB properties payload inline; Leaflet 1.9.4 from unpkg; MapLibre GL 5.24 (about 800 KB, deferred) from unpkg; then, 2.2 s after load, a second complete map — the 3D world — pre-builds in the background while the 2D map is still fetching tiles and photos. Two engines, two copies of every boundary, two tile pipelines, one CPU.

The 3D slowness has four measured causes: globe projection with terrain and atmosphere active even when zoomed to a 9-acre parcel (the most expensive fragment path in MapLibre); terrain tiles requested to zoom 15 with 1.5× exaggeration; raster overlays fetched as 512 px dynamic exports to zoom 21 in a pitched view (dozens of 300–1000 ms requests per frame of movement); and `vcSync3DLayers()` tearing down and re-adding every county layer on any change instead of diffing. The V0.19 work (GPU symbol layer, pixel-ratio cap, pre-build) fixed the marker cost; these are what is left.

The replacement is a **single-engine game architecture**:

**Engine.** MapLibre GL JS only, for 2D and 3D alike. 2D is the same scene at pitch 0. This removes Leaflet, the second map, the sync layer and every "did 3D get the update" bug. Globe projection only below zoom 9 (the cosmic zoom-out); mercator for property work. Terrain from the terrarium DEM at `maxzoom 14`; hillshade computed on the GPU from that same DEM (`hillshade` layer) instead of fetched as a raster. Raster overlays capped at zoom 17 in 3D, 256 px tiles. A quality setting (Low / Medium / High: pixel ratio 1 / 1.5 / 2, terrain on/off) and a perf HUD (fps, tiles in flight) so speed is measured, not felt.

**Languages, each for what it is good at.** TypeScript for the application (modules, types, a build step, tests). The MapLibre style JSON as the declarative scene language — every layer, colour and z-order is data, not code, which is also what a native or VR client reads. GLSL for the few custom shaders worth having (contour glow, survey-line pulse, the crossfade). Python with GDAL/rasterio/tippecanoe for the pipeline: parcel fetch and hash-verify (exists), survey registration (exists), and tile pre-baking (new). Rust-built tools (tippecanoe, pmtiles) for the bake itself. WebXR through three.js for VR.

**Layout of the code.** `engine/` (map bootstrap, camera, time state, quality), `layers/registry.ts` (the catalog you see in the panel today, typed), `layers/transports/` (one file per transport, each with its alignment test), `ui/` (HUD components), `data/` (properties as JSON, surveys as GeoJSON with CRS metadata, zone positions), `pipeline/` (Python), `api/` (Vercel functions: dossier, survey). Vite builds a static bundle; the page shell is under 30 KB; each property's data loads when its chip is clicked.

**Loading budget.** First map paint under 1.5 s on a phone: shell 30 KB, MapLibre self-hosted and preloaded (260 KB gz), imagery from the CDN, nothing from the county until asked. For the layers that are slow by nature — county 5 ft contours, geology, the fault sheets, the 1945 flight — pre-bake PMTiles for the six property areas at zooms 12–19 once, serve them from Vercel's edge, and fall back to the live service outside those areas. That turns 300–1000 ms tiles into 20–50 ms ones, and a service worker keeps repeat visits instant. The rule stays: resolve on demand, never copy the county — the bake is a cache with a known extent and date, not a copy.

**Time as first-class state.** The aerial year and the topo year become one timeline in the HUD, in the URL hash, with the crossfade done by the engine (`raster-fade-duration`) rather than by swapping layers. Future time layers plug into the same scrubber: UCSB FrameFinder aerials (1927 onward, need georeferencing in the pipeline), county building footprints by permit year from the dossier.

**The interface, Empire Earth style.** Top bar: Today/Vision mode, current year, property name. Left dock: the layer library, grouped as now, hotkeys 1–7 for the groups, `L` to toggle. Right inspector: the dossier for whatever is under the cursor or selected, zone panels, the survey legend. Bottom: the timeline scrubber with tick marks for every flight and edition. Compass and tilt control bottom-right. Keyboard: WASD pan, Q/E rotate, R/F pitch, +/− zoom, T terrain, Space Vision, G Google Earth, Esc close. Bookmarked views as shareable URLs. Icons as a MapLibre sprite (one PNG, one JSON) so the same icons draw in 2D, 3D and VR.

**VR.** The data contract above is what makes VR correct; no new surveying is needed for it. Path A: a MapLibre custom layer hosting a three.js scene, entered through WebXR (`navigator.xr`) — terrain mesh from the same DEM tiles, imagery and layers as textures, boundaries as extruded lines. Path B, for a headset build: export each property area as glTF (terrain + draped imagery + vectors) from the pipeline. Both read `data/` unchanged.

## 4. How to get there without breaking what is live

Strangler pattern. The new engine ships beside the old one at `/v2` on the same Vercel project, reading the same `properties/`, `data/` and `/api/*`. Features port in order: base imagery and the two time sliders; the layer library with legends and opacity; properties, zones, panels and the dossier; 3D and terrain; the Position Editor; portals and Vision. When `/v2` reaches parity the alias flips and the old page stays at `/classic` for a while. Nothing the user relies on goes dark in between.

Estimated effort, in sessions like this one: 1 (engine + bases + time), 1 (layer library + legends), 1 (properties, panels, dossier, editor), 1 (3D, quality, perf HUD, PMTiles bake). Parity in four to five sessions; every session leaves `/v2` usable.

The alternative — keep patching the single file — stays possible for individual features (it is how V0.21 through V0.25 shipped), but it cannot deliver the loading budget, the single positioning pipeline or the VR path, because all three depend on retiring the second engine.
