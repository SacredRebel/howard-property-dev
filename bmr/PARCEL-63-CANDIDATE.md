# Parcel 63 candidate — NOT yet on the map (pending ownership verification)

**APN 035-0-020-010** · Book 035 Page 02 (only parcel on that page) · **610.41 county acres** · no situs address

## Evidence it belongs to Black Mountain Ranch

- Its last deed is **doc 010129781, recorded 2001-07-09** — the instrument immediately
  before the ranch's two deeds (010129782 = 3 parcels, 010129783 = 59 parcels),
  all recorded the same day: one closing, three instruments.
- Contiguous: shares ~half its boundary vertices with the mapped ranch (north side).
- Privately taxed: assessed land value $3,919,319, $0 improvements, no exemption.
- The 2021 $100M listing (The Real Deal, 2021-05-12) says the ranch is
  "assembled from 63 separate parcels" — 62 mapped + this one = exactly 63.
- With it: 3,380.2 county acres ("~3,600" in the listing = marketing rounding).

## Why it's NOT on the map yet

Owner (johny) recalled a public park/campground up there. Resolved: that is
**Dennison Park** — a separate county-owned parcel (035-0-290-055, 33.4 ac,
7287 Ojai-Santa Paula Rd, county Parks layer: acquired 1924) at the ranch's
NE corner. The 610-ac parcel is west of the park and is not park land per the
tax rolls. Still, holding it off the map until ownership is confirmed.

## How to confirm

1. Ventura County Assessor owner lookup for APN 035-0-020-010 (owner names are
   not in the public GIS layer), or
2. Ask the owner (Richard Gilleland) / listing broker for the title report or
   the listing's APN schedule.

## To add it once confirmed

Append `"0350020010"` with its acreage to `bmr/acreage.json`, re-run
`bmr/fetch-parcels.mjs` (it fetches + hash-verifies geometry) then
`node bmr/build-bmr.mjs`, and update the counts in the module text
(63 parcels / 3,380 ac). The union boundary and lot rendering pick it up
automatically.
