# The data supply chain — where every property platform gets its data, and how the atlas gets the same

*Compiled 2026-09-16 from public documentation, terms of service, privacy notices, fee schedules and statutes — every figure carries its URL. Nothing behind a login was read, no site was scraped, and no paywall was worked around; where a page could not be reached without a browser it is marked **unverified**. The machine-readable index of the same sources is `data/sources.json`, served at `/api/sources`. The atlas's own rule for using any of it is in `docs/property-intake.md` (chapter 4b) and at the end of this document.*

---

## 0. The finding, in one paragraph

Every property platform on the list — PropertyChecker, PropertyShark, PropertyScout, PropStream, U.S. Title Records, ATTOM, BatchData, PropertyRadar, HouseCanary, DataTree, Regrid — is a **re-packager of county government records**. None of them originates an owner name, a deed, a mortgage or a lien. Their "backend" is not a secret piece of code; it is a *purchasing operation*: they buy every county's assessor roll (public by statute, sold in bulk), buy or key the county recorder's grantor/grantee index and document images, pull business filings from the Secretaries of State, and buy court and lien feeds from a handful of wholesalers (ICE/Black Knight, Cotality/CoreLogic, First American, ATTOM). Then they do the one genuinely hard thing — **re-index name-keyed records by parcel** (a "title plant") — and sell the result under a licence that forbids you to store, republish or build a database from it. For fifty states that moat is real. For **one county**, it is not: the same four county products are available to this atlas one hop earlier, three of them free or near-free, one of them a purchase in the low hundreds of dollars a year. The paywall is a licence, not a technology, and the way past it is to buy from the record keeper instead of the reseller.

---

## 1. How the chain works

```
 deed executed → notarised → presented with a PCOR → transfer tax computed → RECORDED (doc number, date)
      → indexed under every grantor and grantee NAME at the county recorder
      → the Assessor reads the PCOR, reassesses, and the new assessee appears on the next ROLL (1 January lien date)
      → the Tax Collector bills that assessee; five years unpaid → power to sell (published list)
      → if the assessee is an entity, its people are on a Statement of Information at the Secretary of State
```

Everything a vendor sells is a copy of one stage of that pipeline:

| Layer | Who holds it | What it carries | How vendors get it |
|---|---|---|---|
| **Assessor roll** | county assessor | assessee **name + mailing address**, situs, values, use, characteristics | bought in bulk under RTC § 408.3 (Sonoma sells it for $180–$240 — [Sonoma price sheet](https://sonomacounty.gov/administrative-support-and-fiscal-services/clerk-recorder-assessor/assessor/property-data-for-sale-to-the-public)) |
| **Transfer list** | county assessor (RTC § 408.1) | transferor, transferee, APN, date, recording reference, consideration | inspection fee capped at **$10** by statute ([RTC § 408.1](https://codes.findlaw.com/ca/revenue-and-taxation-code/rtc-sect-408-1/)) |
| **Recorder index + images** | county clerk-recorder | every deed, deed of trust, reconveyance, lien, NOD, lis pendens, abstract of judgment — **indexed by name** | bulk index arrangements + keying + imaging; ICE says it collects from "over 3,100 county recorder offices… refreshed on a daily basis" ([ICE](https://mortgagetech.ice.com/products/property-data/residential/public-records)) |
| **Title plant** | First American, Cotality, ICE, ATTOM | the recorder's documents **re-indexed by parcel** ("a geographically filed assemblage of title information" — [Stewart](https://www.stewart.com/en/real-estate-dictionary/title-plant)); First American: "5.5 billion recorded document images" ([First American](https://www.firstam.com/news/2015/first-american-launches-the-all-new-datatree-html-20150527.html)) | built over decades; this is the moat |
| **Secretary of State** | CA SOS | entity status, agent for service, addresses; officers on the SOI image | free API + free images ([SOS](https://www.sos.ca.gov/business-programs/business-entities/information-requests)) |
| **Courts, trustees, liens** | county recorder (recorded), superior court (cases), FTB/EDD/CDTSA/IRS (state/federal tax liens recorded at the county — [Gov. Code § 7171](https://codes.findlaw.com/ca/government-code/gov-sect-7171/), [CCP § 2101](https://law.justia.com/codes/california/2022/code-ccp/part-4/title-7/section-2101/)) | brokers (LexisNexis, TLO, Experian) aggregate 58 county indexes + courts and gate them behind GLBA/FCRA permissible-use screens |
| **People / residents** | data brokers (Ekata, TLO — the "Tahoe id" in a PropertyChecker report) | occupants, phones, relatives | not public records; identity-graph data — the atlas does not import it |
| **MLS** | local MLSs | listings, photos, agent remarks | licensed per MLS, never re-displayable (BatchData's own MLS EULA: "personal, non-commercial" use "for the duration of the current viewing session" — [BatchData](https://batchdata.io/mls-terms-and-eula)) |

**The sale-price trick.** When a deed does not state consideration, vendors derive it from the documentary transfer tax: Ventura charges **$0.55 per $500** ([2026 fee schedule](https://clerkrecorder.venturacounty.gov/wp-content/uploads/2026/06/2026.07.01-Fee-Schedule-Rev-9-10-26-1.pdf), RTC § 11911), so *price ≈ DTT ÷ 0.0011*. ICE lists "Transfer tax" right next to "Sales price" in its deed fields ([ICE deeds](https://mortgagetech.ice.com/products/property-data/residential/public-records/property-deeds)). The atlas already does this (`DTT_RATE` in `lib/dossier.js`) and cross-checks it against the roll's `SP`.

**The name-vs-parcel problem.** Ventura's recorder index is searchable online **by name or document number only**; "APN searches require in-person visits with public kiosks in Ventura and Thousand Oaks offices" ([Clerk-Recorder](https://clerkrecorder.venturacounty.gov/county-recorder/county-recorder/)). So the join every vendor sells is *APN → assessee name (roll) → name → documents (index)*. That ordering makes the **roll purchase the keystone** of doing this ourselves.

---

## 2. The primary sources for Ventura County — what they give, what they cost, how the atlas uses them

| # | Source | Gives | Access | Cost · cadence | Atlas today |
|---|---|---|---|---|---|
| 1 | **County GIS** — [maps.ventura.org REST](https://maps.ventura.org/arcgis/rest/services), [ArcGIS Hub parcels monthly](https://venturacountydatadownloads-vcitsgis.hub.arcgis.com/) | APN + geometry and ~100 county layers; **no owner names** on any public layer (verified field list: OBJECTID, APN, APN10, LAT, LON, area, length) | free API, no key, CORS open | $0 · monthly | **live** — the parcel anchor and `VENTURA_SOURCES` |
| 2 | **Assessor secured roll extract** — [Roll Data page](https://assessor.venturacounty.gov/assessor-data/roll-data/) (behind a WAF; contents unverified), [public records request](https://assessor.venturacounty.gov/assessor-data/public-records-request/) | assessee name, mailing address, situs, use code, values, base year, exemptions; characteristics (§ 408.3); the transfer list (§ 408.1) | paid bulk | Ventura's price unverified; Sonoma $180–$240 per extract, transfer list $70/issue or $865/yr; § 408.1 inspection ≤ $10 · annual + monthly | **planned** — see §5 |
| 3 | **2018 roll snapshot** — [ArcGIS Online item](https://services5.arcgis.com/umIjvohPcWJU5ij6/arcgis/rest/services/Ventura_County_Parcels/FeatureServer/0) | names, documents, sale dates, transfer tax, base years as of Nov 2018 | free API | $0 · frozen | **live** — history only |
| 4 | **Clerk-Recorder official records** — [self-service index](https://clerkrecorderselfservice.venturacounty.gov/web/user/disclaimer), [copy ordering](https://clerkrecorder.venturacounty.gov/county-recorder/county-recorder/official-records/ordering-a-copy-of-official-records/), [fee schedule](https://clerkrecorder.venturacounty.gov/wp-content/uploads/2026/06/2026.07.01-Fee-Schedule-Rev-9-10-26-1.pdf) | grantor/grantee index since 1873; document images | free index (browser session), paid images | copies $2.25/page, certification $7, search $5/file; bulk index not advertised — ask RecorderInfo@Ventura.Org (the office sells its voter file on USB for $55) · continuous | portal link; instrument numbers reconciled against evidence |
| 5 | **Treasurer-Tax Collector** — [bill lookup](https://taxpayment.venturacounty.gov/webtaxonline/index.html), [auction FAQ](https://s48024.pcdn.co/ttc/wp-content/uploads/sites/22/2025/01/Frequently-Asked-Questions.pdf) | bill by APN, delinquency; the annual **tax-defaulted / power-to-sell list** (RTC §§ 3692, 3712; Bid4Assets) | free web (browser only) / free annual list | $0 · annual (Dec 10 / Apr 10 installments) | portal link; delinquency from imported evidence |
| 6 | **Secretary of State** — [BE Public Search API](https://calico.sos.ca.gov/cbc/v1/api/) ([developer portal](https://calicodev.sos.ca.gov/), [guide v1.0.4](https://calicodev.sos.ca.gov/content/California%20SOS%20BE%20Public%20Search%20API%20Guide%20v1.0.4.pdf)), [bizfile](https://bizfileonline.sos.ca.gov/search/business) | entity number, type, status, standing, **agent for service**, addresses (API); **officers/managers on the free SOI image** (web) | free API (key) + free web | $0 · corporations file yearly, LLCs every two years | **live with `SOS_API_KEY`** — `sosEntity()`; bizfile portal for every company owner |
| 7 | **Superior Court** — [public portal](https://ventura.ecourt.com/public-portal/), [records desk](https://ventura.courts.ca.gov/divisions/records) | civil/probate/small-claims by party name; documents after 2023-03-20 | free web (account) | $15/search at the desk, $0.50/page · continuous | portal link |
| 8 | **Permits & septic** — [VC Citizen Access](https://vcca.venturacounty.gov/CitizenAccess/), [OWTS records 1978–2016](https://archive.vcrma.org/en/isds-record-search) | unincorporated-county permits, code cases; septic PDFs | free web | $0 | portal links + the county permits layer |
| 9 | **Federal & state GIS** — FEMA, USGS 3DEP, NRCS SDA, BLM, CGS, DWR OSWCR, CAL FIRE, CEC, Census | hazards, terrain, soils, wells, fire, utilities, boundaries | free API | $0 | **live** — `FED_SOURCES`, `CA_SOURCES` |

**What the free routes cannot give:** an APN-keyed deed lookup (name-only index), the owner name joined to geometry (it is on the roll, not the GIS), and anything cross-county. Those three gaps — and only those — are what justify paying anyone.

---

## 3. The vendors — register with verdicts

Every entry: what it is · how a parcel is identified · endpoint (only when the vendor publishes it) · price · the terms that decide whether the atlas can use it · verdict. "Not wired" means the code stays out until the terms or the spec allow it — the atlas never guesses an endpoint.

### 3.1 APIs

**ATTOM Data** — [docs](https://api.developer.attomdata.com/docs) · [legal](https://api.developer.attomdata.com/legal). 155M properties, "more than 430 million transactions covering over 3,140 counties" of recorder data ([summary](https://cloud-help.attomdata.com/article/374-summary)). Parcel by `fips=06111&apn=…` or `attomid` or address. Endpoints for our five needs: `GET /propertyapi/v1.0.0/property/detailowner` (owner + mailing), `/saleshistory/expandedhistory` (deeds with types and document numbers), `/property/detailmortgageowner` (loans), `/allevents/detail` (assessment + AVM + sales), `/preforeclosure/details`; header `apikey`, `accept: application/json`; 200 calls/min ([usage](https://cloud-help.attomdata.com/article/631-api-usage-reset)). Price not published; ATTOM's own example is "$1,000/month covering 100,000 reports ($0.10 each)", billed per *property returned* ([report billing](https://cloud-help.attomdata.com/article/684-api-report)); 30-day trial. **Terms:** developer terms are evaluation-only; the customer shall not "cach[e] or otherwise stor[e] the ATTOM Content… for a period of greater than twenty-four (24) hours", shall not "create, enhance or structure any database in any form", and shall not use it "to create, replace, supplement or enhance any title, legal, vesting, ownership or encumbrance report" ([legal §1.3](https://api.developer.attomdata.com/legal)). **Verdict:** endpoints fit exactly; the terms forbid the very thing this atlas does. Not wired until a negotiated licence says otherwise.

**BatchData** — [docs](https://developer.batchdata.com/docs/batchdata/welcome-to-batchdata) · [pricing](https://batchdata.io/pricing) · [terms](https://batchdata.io/terms-of-service) · [privacy](https://batchdata.io/privacy-policy). `POST https://api.batchdata.com/api/v1/property/lookup` with `requests:[…]` (address; APN supported but the field names sit only in the rendered docs), `/property/search`, `/property/skip-trace`; `Authorization: Bearer`; a **free sandbox token returns mock data**. Sources disclosed plainly: "county recorder, assessor, and tax authority records, court records, and business filings", third-party providers, affiliates; MLS under a separate EULA. Price: **$1,000/month for 100,000 records** at the entry tier (≈ $0.01/record), no pay-as-you-go. **Terms:** "internal business use" by authorised users, caches refreshed every 30 days, no derivative database, no display to third parties. **Verdict:** best-documented and cheapest per record, but a $1,000/month floor for one town, and a public map is outside the click-through terms. Sandbox first if ever.

**PropertyRadar** — [developers](https://developers.propertyradar.com/) · [California coverage](https://www.propertyradar.com/coverage/california) · [pricing](https://www.propertyradar.com/pricing) · [user agreement](https://www.propertyradar.com/user-agreement). The only vendor that publishes what it holds **for Ventura County**: assessor yes, recorder from **Jan 1954**, foreclosure from **Jan 2002**, trustee-sale tracking from **Sep 2006**, **document images from 1977**, property tax status from **2019**. Base `https://api.propertyradar.com/v1`, `Authorization: Bearer`; `/properties` (criteria incl. APN) → `/properties/{RadarID}/transactions` (chain of title: transfers, mortgages, assignments, foreclosures, liens), `/documents/{DocumentID}` (images), `/persons/{PersonKey}/liens|probates|divorces|bankruptcies` — the `/v1` prefix on the sub-paths must be confirmed in the reference console. Billing is per record returned; `Purchase=0` and `Fields=RadarID` are free ([implementation notes](https://help.propertyradar.com/en/articles/8769706-api-implementation-considerations)). Solo **$119/mo** (10,000 exports, 2¢ over), Team $249, Business $599 (API listed there; the API page says every plan — settle with sales). **Terms:** "internal business purposes", no redistribution/display to third parties; derivative database forbidden only "for resale or distribution"; no published caching limit. **Verdict:** the best fit for Ojai by a distance — chain of title and document images for our county at $119/month. Adapter after two answers from sales: the path prefix and public display. Design rule already decided: every search goes out with `Purchase=0` first.

**Regrid** — [API](https://regrid.com/api) · [terms](https://regrid.com/terms/api). `GET https://app.regrid.com/api/v2/parcels/apn?parcelnumb=<APN10>&path=/us/ca/ventura&token=…` → GeoJSON with `properties.fields` (standard schema: owner, mailadd, saledate, saleprice, parval, landval, improvval, usedesc, zoning, yearbuilt…) and Enhanced Ownership (up to four owners, deed ownership, record currency). 200 requests/min; plans include 2,000 records, overage $0.10/$0.15 per record returned; base price not published. **Terms:** "Customer may cache or store the parcel records retrieved or collected by the API"; destroy on termination. **Verdict:** the reference implementation of a lawful adapter — **already wired** (`regridTitle`, `REGRID_TOKEN`).

**PropertyScout** — [API docs](https://docs.propertyscout.io/api) · [OpenAPI spec](https://docs.propertyscout.io/files/propertyscoutio-openapi.yaml) · [API pricing](https://propertyscout.io/faqs/api/) · [privacy](https://propertyscout.io/privacy/). Property Search (address, **APN**, parcel), Deed & Title, People, Typeahead; **$0.10/query** down to $0.07, no minimums, 7-day trial without a card. Owner/occupant data is bought from **Ekata** (identity data), so names can lag the county roll and the residents are not public records. **Terms:** not a consumer report; no reselling without written permission; caching not addressed. **Verdict:** adapter candidate once the spec is read (the proxy here blocked the YAML); keep the People API off.

**RentCast** — [docs](https://developers.rentcast.io/reference/introduction) · [property records](https://developers.rentcast.io/reference/property-records) · [schema](https://developers.rentcast.io/reference/property-data-schema) · [pricing](https://www.rentcast.io/api) · [API terms](https://www.rentcast.io/terms-api). `GET api.rentcast.io/v1/properties` (header `X-Api-Key`) by address, city/state/zip or a circle (`latitude`, `longitude`, `radius` in miles); each record carries `assessorID`, `legalDescription`, `zoning`, `lotSize`, `yearBuilt`, `owner { names[], type, mailingAddress }`, `ownerOccupied`, `lastSaleDate/Price`, `taxAssessments` and `propertyTaxes` by year and a `history` of sale events. **50 free requests a month**, then $74/mo for 1,000. Terms (§1) permit use, storage, display and distribution of the API data; §3.4 requires no attribution. **Verdict: wired (V0.35).** `rentcastTitle` in `lib/providers.js` searches a 0.08-mile circle on the parcel centre and takes only the record whose `assessorID` digits equal our APN (or, when the vendor carries no assessor id, the record with our situs house number and street) — never a neighbour by proximity; the answer is held 30 days per instance and the adapter never runs on the watch loop, so the free plan covers the atlas's own parcels. Set `RENTCAST_KEY` on Vercel. **The plan does not stop at 50** — request 51 costs $0.20 — so V0.36 added a durable meter (`data/provider-meter.json`, counts only, no names) that refuses to call past `RENTCAST_MAX_MONTH` (default 45), skips the lookup while a report under twelve months old is on file, and accepts `&provider=0` (the warm workflow passes it, so a deploy spends nothing).

**HouseCanary** — [site](https://www.housecanary.com/). AVM, forecast, rental value; no owner, no deed, no APN; $790/yr Pro then $0.50–$4 per call; terms forbid storing to create a database. **Verdict:** valuation only, behind a flag if ever.

**Zillow Bridge** — carries public records with ownership for ~148M properties, but "You are not permitted to store information locally" ([Bridge](https://www.bridgeinteractive.com/)). **Verdict:** no. Realtor.com and Redfin expose no owner data at all (Redfin's Data Center is aggregate market metrics).

### 3.2 Wholesale

**First American DataTree / TitleFlex** — [DNA](https://dna.firstam.com/all-data): "100% of documents in each county are collected, indexed, and verified", ~150M records, 200+ attributes; 9+ billion document images; packaged chain of title, legal & vesting, lien releases. Sales-gated API (specs behind a login); TitleFlex trial 1,000 transactions/day; à-la-carte store $4 property detail, $22 transaction history, $15 per recorded document, $25/mo basic. **Terms:** internal verification use only; no third-party use; explicit prohibition on use "in connection with, or to enable development of machine learning… or artificial intelligence technologies". **Verdict:** no adapter; the store is a legitimate one-parcel spot check.

**ICE Mortgage Technology (Black Knight), Cotality (CoreLogic), ATTOM warehouse** — the suppliers of most of the above ("over 3,100 county recorder offices… refreshed on a daily basis"; deeds with "Buyer name, Seller name, Recording date, Sales price, Transfer tax, Legal description, Loan type…" — [ICE](https://mortgagetech.ice.com/products/property-data/residential/public-records)). Enterprise licences; understood, not used.

### 3.3 Consumer desks (human import only)

**PropertyChecker (InfoPay)** — [terms](https://propertychecker.com/terms): monthly subscription, no API; forbids "any automated system, including… spider, robot… scraper" and "systematically retriev[ing] data… to create or compile… a collection". The report bundles public-record sections with people-search data ("Tahoe" ids, residents). **Verdict:** import the PDF you bought (V0.32); never automate.

**PropertyShark (Yardi)** — 46 states, NYC-grade depth, no Ventura landing page; Platinum $169.95/mo includes LLC ownership identification; no API; terms forbid building a database. **Verdict:** portal link at most.

**PropStream (EquiMine)** — assessor data refreshed annually, $5 document images; terms forbid automated access, compilation, resale and commercial use, and monitor "non-customary search patterns". **Verdict:** no.

**U.S. Title Records** — human-produced $29 property detail / $95 lien report (skip the $385 bundle: it contains a personal dossier). **Verdict:** import when a parcel needs an abstractor.

**PropertyDeed** — strictly dearer than NETR's store ($3.50 detail, $5–8 per image) for the same output. **Verdict:** no.

### 3.4 Directories

**NETR Online** — [Ventura page](https://publicrecords.netronline.com/state/CA/county/ventura); links the assessor, recorder, tax collector and GIS (some still on `countyofventura.org`; no court link); its [Property Data Store](https://datastore.netronline.com/pricing) sells $3.50 property detail, $5–8 flat document images, $3 parcel maps. **PublicRecordCenter** — [Ventura page](https://www.publicrecordcenter.com/ventura-county-ca-public-records.html); "We do not sell data or charge fees"; adds the Superior Court and GIS portal links NETR omits. Both are now in the record's *Where to look* under **Directories**.

---

## 4. The law that makes the primary route possible (and the parts that constrain it)

| Provision | Effect |
|---|---|
| [RTC § 408(a)](https://codes.findlaw.com/ca/revenue-and-taxation-code/rtc-sect-408/) | the assessor's working files are **closed** by default |
| RTC §§ 602, 1602 + Rule 252 ([BOE annotation 260.0007](https://www.boe.ca.gov/lawguides/property/current/ptlg/annt/260-0000-all.html)) | the **roll is open**, expressly including "the name and mailing address of the assessee" and the assessed value |
| [RTC § 408.1](https://codes.findlaw.com/ca/revenue-and-taxation-code/rtc-sect-408-1/) | the **transfer list** is "open to inspection by any person"; fee ≤ actual cost "or ten dollars ($10), whichever is the lesser amount" |
| [RTC § 408.3](https://codes.findlaw.com/ca/revenue-and-taxation-code/rtc-sect-408-3/) | property characteristics are public; the county may recover "developmental and indirect costs" — why a roll extract costs hundreds, not cents |
| [Gov. Code § 27201](https://law.justia.com/codes/california/code-gov/title-3/division-2/part-3/chapter-6/article-1/section-27201/) | the recorder's index is the statutory public finding aid |
| Gov. Code § 7920.000 et seq. | the California Public Records Act (cite the 2023 numbering) |
| [Gov. Code § 6254.21(a)](https://law.justia.com/codes/california/2022/code-gov/title-1/division-7/chapter-3-5/article-1/section-6254-21/) | no agency may post an official's home address online without consent — the legislature's own statement that *publishing on a map* is a different act from *keeping in a record room* |
| FCRA / GLBA | assessor and recorder records are not consumer reports, but the moment a product is *used* for credit, insurance, employment or housing eligibility FCRA attaches — every vendor carries a "not a consumer report" notice; the atlas must too |

---

## 5. The plan — not needing the resellers

*One purchase and three habits.* Roughly **$400–$2,500 a year** all-in, against $1,000/month minimums at the API vendors — and the data is the same data, one hop earlier, with no redistribution clause attached by a middleman.

1. **Buy the Ventura secured roll extract** (the keystone). Write to the Assessor — 800 South Victoria Avenue L#1270, Ventura, CA 93009-1270, (805) 654-2181 — and through the [public records request page](https://assessor.venturacounty.gov/assessor-data/public-records-request/) for: (a) the secured roll extract with assessee name, mailing address, situs, use code, values, base year and exemption flags; (b) the property-characteristics file (§ 408.3); (c) the § 408.1 transfer list, monthly; (d) the record layout and delivery format. Cite RTC §§ 602/1602 and BOE annotation 260.0007, § 408.1 with its $10 cap, § 408.3, and the CPRA; name the county's own system (OASIS, the BrainSharp CAMA that the [SB 272 catalog](http://vcportal.venturacounty.gov/County-of-Ventura-SB-272-Catalog.pdf) says holds "Property ownership, mapping data, property characteristics sales data", updated daily); cite Sonoma's $180/$210/$240 tiers so the ask reads as routine. Budget $250–$1,500/yr; if the quote is four figures, narrow the fields (Ojai-area use codes) rather than abandon it. Cadence: annually after the roll closes (~1 July) plus the monthly transfer list.
2. **Ask the Recorder for an index extract** — RecorderInfo@Ventura.Org — document number, recording date, document type, grantor, grantee, APN where captured; no images. Precedent: the office already sells its Master Voter File on USB for $55 and Precinct Index for $91. If refused, the § 408.1 transfer list carries the recording reference number, which is enough to deep-link and to order specific images at $2.25/page. Do **not** scrape the self-service portal (WAF-protected, session-bound, name-only anyway, terms unread).
3. **Secretary of State: key first, bulk if it is real.** Register at [calicodev.sos.ca.gov](https://calicodev.sos.ca.gov/), subscribe to the BE Public Search API, set `SOS_API_KEY` on Vercel — the atlas then resolves every company on title live. Ask bizfile@sos.ca.gov / (916) 653-6814 for the bulk "Master Unload" price sheet (a third party reports $100 data / $800 images — unverified). Accept the limits: the API returns no officers; LLC filings are biennial; timestamp everything.
4. **Free feeds on a schedule.** Parcels monthly from the county's open REST (`Parcels_Quarterly/FeatureServer/0/query`, 2,000 per page); the tax-defaulted list annually; CAL FIRE FHSZ; Census ACS; USPS Addresses 3.0 for normalising mailing addresses before name matching (read its storage terms first).
5. **Paid, if and only if the map needs county-wide chain of title today:** PropertyRadar Solo at $119/month, adapter written with `Purchase=0` first, after sales confirms API on that tier and public display.

**Where the purchased data lives.** Never in this repository (it is public). The roll extract goes into a private store (a private database — Supabase is already connected to this workspace — or private object storage) keyed by APN10; the atlas resolves per APN from it exactly as it resolves from the county GIS today, and the code stays public while the payload stays private. Add the ignores (`*.csv`, roll exports, `*.sqlite`, `*.dump`) before the first extract lands.

---

## 6. The atlas's rules for many sources at once

The user's instruction: *pull from as many sources as possible, from different angles, so that together they build a strong, up-to-date and truthful picture — and never show made-up or outdated data as current.* The atlas implements that as five rules, all of which V0.32 already follows for the roll and the imported report:

1. **Every row names its publisher and its date.** A row without a source is not a row. The "Evidence on file" line dates every source that contributed to the title section.
2. **The newest dated fact per field wins, and the loser is shown.** The tax bill row says *"the live roll now carries $1,078,140 — the report is behind the county"*; the owner row says *"confirmed by the live county roll, whose last document is this same instrument"* or *"⚠ the live county roll carries a NEWER document — this name may already be out of date"*. Agreement is stated; disagreement is stated; nothing is silently averaged.
3. **Sources are merged by identity, not by position.** Instruments match by number (with the county's year prefix handled — `sameDoc`), events by date, entities by exact name; a match adds confidence, a mismatch adds a note.
4. **Age is a flag, not a footnote.** Evidence older than twelve months raises `stale`; the 2018 snapshot is labelled history; SOS entity data carries its filing cadence.
5. **Public record ≠ publishable at scale.** The atlas shows the owner *per parcel* on the record, never a reverse lookup (name → all parcels), never bulk export of names, and drops the residents list on import. Company owners are the public-interest case; natural persons appear by name only on their own parcel's record. The map carries a "not a consumer report" notice in the intake rule and must never feed an eligibility decision. A takedown address for natural persons costs nothing and is owed.

6. **A metered source is capped before it is trusted.** Any vendor with a per-request price gets a durable counter (`data/provider-meter.json` — counts only, never a name) and a hard monthly ceiling that refuses the call and says so on the row. The atlas is allowed to be less informed; it is not allowed to spend money quietly. A lookup is also skipped where it adds nothing — a report on file under a year old already names the owner.
7. **The roll is re-read on a schedule, not on a visit.** The county parcel layer carries a *sentinel* per APN — last instrument number, date and type, value-transfer date, assessed values, sale price, acreage (`lib/watch.js`). `.github/workflows/watch.yml` re-reads it every Monday for every property, every ranch lot and every parcel on the shared research list, logs any change with its date in `data/watch.json` (no names), and opens a GitHub issue when title or value moved — so the atlas learns of a new deed within a week without anyone visiting, and the record says *this parcel is on the weekly watch — last re-read <date>*. A change after the evidence on file raises the `moved` flag: the names, loans and liens from the report are declared possibly stale until a new report is imported.

---

## 7. What is wired, and what each key unlocks

| Env var on Vercel | Unlocks | Status |
|---|---|---|
| `EDIT_PIN` + `GITHUB_TOKEN` | the editor's saves, uploads, research sync, **report imports** | code live (V0.31–32); keys not yet set |
| `SOS_API_KEY` | live Secretary of State rows for every company on title (`sosEntity`) | code live (V0.33); free key at calicodev.sos.ca.gov |
| `REGRID_TOKEN` | live Regrid ownership/value rows (`regridTitle`) | code live (V0.32); paid |
| `RENTCAST_KEY` | live RentCast owner / mailing / sale history / assessment rows (`rentcastTitle`), matched to the APN | code live (V0.35); free plan 50 requests a month |
| — (no key) | county GIS, 2018 roll, federal/state layers, imported reports, portals | live |
| — (no key) | **the weekly watch** of every watched parcel's roll sentinel, with a GitHub issue on change (`watch.yml`) | live (V0.34) |
| PropertyRadar, PropertyScout | chain of title / named owners by address | documented; adapters after their specs and display terms are confirmed |
| ATTOM, BatchData, DataTree, HouseCanary | — | documented; terms or price rule them out for a public map today |

*Sources for this document: the three research sweeps of 2026-09-16 (vendor APIs; consumer platforms and directories; primary county/state sources), each written from public pages only, retained in the session record; every load-bearing figure above links to the page it came from.*
