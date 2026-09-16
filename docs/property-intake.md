# Property intake — the rule for adding any parcel, anywhere

*This is the standing rule for adding a property to the atlas and for researching any parcel with it. Read it before touching `properties/`, `lib/dossier.js` or the county adapters. It is written for a human and for the next AI assistant alike. Last verified against the live services on 15 September 2026.*

## 1. The principle

The atlas never copies a county. It **resolves**: one parcel, on demand, from the record keepers' own servers, and every value it shows names its publisher. Adding a property is therefore not "collect the data" — it is "tell the system where the parcel is, and which authority speaks for it". Once that is done the county record, the state record and the federal record resolve by themselves, in the property card, in the lot cards and from the search box.

Three layers of authority, from the most specific to the most general:

| Layer | Who publishes it | What it settles | Where it lives in the code |
|---|---|---|---|
| **County** | the assessor, recorder, surveyor, planning, environmental health, public works of *that* county | the parcel line, APN, situs, assessed values, last deed, zoning, plan, county hazards, soils, water, districts, recorded maps, permits | a **county adapter** in `lib/dossier.js` (`COUNTY_ADAPTERS`) |
| **State** | the state geological survey, oil & gas regulator, conservation department | bedrock, faults, shaking, landslide susceptibility, radon, mines, wells, Williamson Act | `CA_SOURCES` / `CA_RASTERS` (California); one block per state as they are added |
| **Federal** | FEMA, USGS, NRCS, BLM, US Census | the official flood layer, Quaternary faults, hydrography, elevation and slope (1 m 3DEP), soils tabular (SSURGO), surface management, PLSS grid, protected areas and conservation easements (PAD-US), mineral sites (MRDS), open mining claims (MLRS), county / tract / districts | `FED_SOURCES`, `terrainGrid`, `soilsSDA`, `geocodeCounty` — **work anywhere in the United States** |

Only the first layer is county-specific. A parcel in a county without an adapter still gets the state (if any) and federal record, and the card says plainly which authority is missing.

## 2. Adding a property (Ventura or Los Angeles County — an adapter exists)

1. **Get the APN from the county, not from a listing.** Listings mistype APNs. Look the address up in the county's assessor search (Ventura: `assessor.venturacounty.gov/assessor-data/property-search/`; Los Angeles: `portal.assessor.lacounty.gov`). Write the APN in the county's own format (`037-0-012-125`, `2048-011-048`).
2. **Check it resolves:** open the atlas, type the APN in the top search box. The cyan dashed outline must land on the right ground and the card must show the right situs. `GET /api/parcel?apn=…` returns the same thing as JSON. If the county says "not in the parcel layer", the APN is wrong or the parcel was recently split — go back to step 1.
3. **Create the module** `properties/<id>.js` from an existing one. The county ring is the boundary (`/api/parcel` gives you the rings — never hand-draw; see the V0.24 rule in CLAUDE.md). Fill `id`, `name`, `shortLabel`, `labelChip`, `center` (inside the parcel), `zoom`, **`apn`**, **`county`** (the 5-digit FIPS: Ventura `06111`, Los Angeles `06037`), `footerInfo`, `status`, `docs`, `panel`, `cta`, `zones` (may be empty). A multi-parcel property carries `lots[]` with one `apn` per lot and a `county` at the top; the generator `bmr/build-bmr.mjs` shows the pattern.
4. **Register it** in `server-complete.js` (`import` + `PROPERTIES`). Photos go under `images/<id>/…` and into `image-urls.js`.
5. **Run the gates** (CLAUDE.md → Testing note) and open the property card: the County record section must fill with the identity, valuation, land use, hazards, fire, terrain, soils, water, habitat, cultural, access, districts, survey, permits and recorded maps blocks, and the seven-dimension read. Anything "late" fills in with **refresh**.
6. **Read the record before writing the proposal.** The flags at the top (fire severity, flood, landslide, Alquist-Priolo, Williamson Act, septic, water) are what a lender, an insurer and the permit desk will raise first.

## 3. Adding a property in a county that has no adapter yet (any other county, any state)

This is the expected case for a parcel outside Ventura. It works in two stages; the first is immediate.

**Stage A — research it today, with no code.** Type the coordinates (`lat, lng`) of the parcel in the search box, or click the ground. The card resolves the **federal record** (FEMA flood zone and FIRM panel, USGS Quaternary faults, NHD streams, 3DEP elevation / slope / buildable acres on the 60 m site around the point, NRCS soils with the septic and dwelling ratings, BLM surface management and PLSS section, PAD-US protected areas and conservation easements, USGS mineral sites, open BLM mining claims, Census county / tract / districts) and, in California, the **state record** (CGS geology, faults, shaking, landslide susceptibility, radon, CalGEM wells, mines). The "Where to look" list gives the county's own portals as searches (assessor, recorder, GIS, permits) plus the federal ones (FEMA MSC, topoView, Web Soil Survey, BLM MLRS and GLO patents). Save it to the research list; it compares against the others on the same seven questions.

**Stage B — add the county adapter (an hour, once per county).** An adapter is one entry in `COUNTY_ADAPTERS` in `lib/dossier.js`:

```js
'06083': {                                           // FIPS from the Census geocoder
  id: 'santabarbara', name: 'Santa Barbara County', state: 'CA', stateName: 'California',
  apnPattern: /^\d{3}-?\d{3}-?\d{2,3}$/,             // how this county writes an APN
  normalizeApn: (s) => String(s).replace(/[^0-9]/g, ''),
  parcels: { root: 'https://<host>/arcgis/rest/services/', svc: '<folder>/<Parcels>', layer: 0, apnField: 'APN' },
  identity: (attrs) => ({ apnPretty, apn10, situs, acreage, id: [rows], val: [rows] }),   // map the assessor fields
  portals: (rec) => [ { group: 'county', label, url, note, method?: 'post', fields? } … ],
  sources: [],                                        // that county's own GIS fan-out — grow it layer by layer
  records: null, structures: null,                    // recorded-maps index and building footprints, if the county serves them
  authority: '<County> GIS · Assessor',
},
```

How to find the pieces, in order:

1. **The parcel layer.** Search `"<County> County" parcels ArcGIS REST MapServer` (or `FeatureServer`). Open `…/MapServer?f=json` and find the layer whose fields include the APN and the assessor attributes. Probe it with a point query (`…/<layer>/query?geometry=lon,lat&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&f=json`) at a known address. Verify it is public, keyless and answers CORS (`Access-Control-Allow-Origin`) — the resolver runs server-side, so CORS only matters for map layers, but keyless and public are non-negotiable. Some counties publish parcels only through a state or vendor host (California: `maps.calagpermits.org` carries several counties; Los Angeles: `public.gis.lacounty.gov`; many counties: their ArcGIS Online hub). If a county offers **no** public parcel service, the adapter cannot be built — say so in the card (Stage A still works) and use the county's assessor portal by hand.
2. **The identity map.** Read one feature's attributes and map them: APN (formatted + digits-only), situs, acreage or shape area, book / page, tax rate area, legal description, land / improvement value, last document number and date, use code, year built. Only map what the county publishes; blanks stay blank.
3. **The portals.** Find the county's assessor property search, recorder official-records search, tax collector bill lookup, permit portal (often Accela "Citizen Access"), planning / zoning viewer, recorded maps or survey index, and the state's own tools. Prefer a **GET deep link with the APN** when the site accepts one (Los Angeles: `portal.assessor.lacounty.gov/parceldetail/<AIN>`); when the site only takes a **POST form** (Ventura's assessor), use `method: 'post'` with the form's field names — the card submits the form in a new tab and copies the APN to the clipboard first; when neither works, link the search page and let the copied APN do the rest.
4. **The county's own GIS layers** (`sources`). Enumerate the county's ArcGIS folders (`…/rest/services?f=json`), then each service's layers. For every layer that answers a buyer's question, add a row `{ sec, svc, layer, geom|dist, hit, miss }` — `hit` turns the first feature into `[label, value, key]` rows, `miss` states the useful negative ("Not in an Alquist-Priolo zone"). Keep the row keys stable (`zoning`, `fire_sev`, `flood100`, `waterline`, `sewer`, `road`, `total_value` …) so the seven-dimension read and the compare table work across counties. Ventura's 100-row table is the reference.
5. **Recorded maps and footprints** (`records`, `structures`) if the county serves them — Ventura's Surveyor index links every scan; most counties do not, and the recorder portal is the fallback.
6. **Prove it** with `node scripts/record-probe.mjs core <apn>` and `deep` against the live services (any Node 20 with network — the Composio sandbox, or Vercel itself), then add the county to `/api/counties`' examples and to this document.

**Another state** adds a state block the same way (`XX_SOURCES`, keyed on the Census state abbreviation in `resolveDeep`). Every state geological survey and oil & gas regulator publishes some of this; the federal layers already cover the rest.

## 4. Where the record comes from — the verified endpoints

All keyless and public; each row's publisher is shown in the card. Ventura County: `maps.ventura.org/arcgis/rest/services/` — `SDs/Parcels` (anchor, assessor roll), `SDs/MyZoning`, `DataDownloads/LandUse`, `DataDownloads/Hazards`, `SDs/CV_Hazards`, `SDs/PlanningGIS_Hazzards` (fire history, slope classes, pipelines, transmission), `SDs/PlanningGIS_Resources` (AB 52 tribal areas, archaeological sensitivity, scenic highways, ridgelines, water wells, oil fields, Williamson Act, paleontology), `SDs/PlanningGIS_Biological` (CNDDB, critical habitat, corridors, wetlands, ESHA, easements, vegetation), `DataDownloads/NaturalResources` (soils, habitat, farmland), `SDs/Groundwater`, `SDs/EnvironmentalHealth` (watersheds, streams, septic designation, radon, sewer and water lines, CUPA), `SDs/PWA_WatershedProtection`, `SDs/PWA_Hydrology`, `DataDownloads/Education`, `DataDownloads/Political`, `SDs/SpecialDistricts`, `SDs/LandUse` (ZIP, census tract, Quimby), `DataDownloads/RegulatoryBoundaries` (SOAR, greenbelts), `DataDownloads/Transportation` (road centrelines), `DataDownloads/Permitting`, `DataDownloads/CommonData` (building footprints), `DataDownloads/Survey` (recorded maps — scans at `maps.ventura.org/recordmaps/<link>` — rancho boundaries, PLSS), `SDs/SurveyRecords` (benchmarks), `SDs/SurveyRecordLGIM` (corner and surveyor records), `SDs/LidarIndex`. Los Angeles County: `public.gis.lacounty.gov/public/rest/services/LACounty_Cache/LACounty_Parcel` (the full roll on the parcel). California: `gis.conservation.ca.gov/server/rest/services/` — `CGS/Geologic_Map_of_California`, `CGS/QuaternarySurficialDepositsSouthernCA`, `CGS_Earthquake_Hazard_Zones/SHP_Fault_Traces`, `CGS/FaultActivityMapCA`, `CGS/MS48_NSHM2023_Faults`, `CGS/CA_HistEQs_M3Plus`, `CGS/Alquist_Priolo_Site_Investigation_Reports`, `CGS/MS58_LandslideSusceptibility_Classes` (identify), `CGS/MS48_GroundMotion_PGA_*` and `MS48_MMI_*` and `MS48_Vs30_*` (ImageServer identify), `CGS/RadonPotentialZones`, `MOL/MOLMines`, `WellSTAR/Wells`, `DLRP/CaliforniaWilliamsonActEnrollment_2025`. Federal: `hazards.fema.gov/arcgis/rest/services/public/NFHL` (28 flood zones, 3 FIRM panels), `earthquake.usgs.gov/arcgis/rest/services/haz/hazfaults2014`, `hydro.nationalmap.gov/arcgis/rest/services/nhd` (6 flowlines, 12 waterbodies), `gis.blm.gov/arcgis/rest/services/lands/BLM_Natl_SMA_LimitedScale` and `Cadastral/BLM_Natl_PLSS_CadNSDI`, `elevation.nationalmap.gov/…/3DEPElevation/ImageServer/getSamples` (multipoint, ≤ 2,000 samples), `sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest` (SSURGO SQL), `geocoding.geo.census.gov/geocoder/geographies/coordinates` (county, tract, districts), USGS on ArcGIS Online `services.arcgis.com/v01gqwM5QqNysAAi/arcgis/rest/services/` — `Manager_Name_PADUS/FeatureServer/0` (PAD-US 4.1: public land, parks, wilderness, recorded conservation easements) and `Mineral_Resources_Data_System_MRDS_Compact_Version/FeatureServer/0` (mines, prospects, occurrences) — and the BLM hub `gis.blm.gov/nlsdb/rest/services/HUB/BLM_Natl_MLRS_Mining_Claims_Not_Closed/FeatureServer/0` (open federal mining claims). A service written `…/FeatureServer` in a source entry is queried as a hosted feature layer; everything else is a MapServer.

What is **not** in any GIS and must be read from documents: the deed chain and its easements, exceptions and mineral reservations (recorder), the title report, the permit files and approved plan sets (Building & Safety public-records request), the well log (state DWR well completion reports), the septic permit (Environmental Health). The card's "Where to look" section is the map to those desks; the atlas never invents what they hold.

## 5. Rules that keep the system honest

- **Resolve, never copy.** No bulk downloads of a county's parcels into the repo. The resolver caches one parcel for 30 days and never caches a partial answer.
- **Every value names its publisher.** A row without a source does not go in. A useful negative is stated ("No public sewer line mapped within 600 m").
- **Exact geometry only.** The county ring, or a recorded survey when one exists. Where they disagree (Sulphur's west line, 29 ft), the survey wins and the card says so.
- **Assessor figures are not an appraisal; GIS is not a boundary.** Both disclaimers stay on the card and on the report.
- **Out of county is normal.** A parcel in Montana resolves the federal record and says which county adapter is missing; it is never shown as "no data".
- **Identity:** the owner appears as Sacred Rebel in pages, labels and logs (the workspace rule in the Notion operating rules); never a legal name.
