// Howard Property — property module for the multi-property map.
// 1320 Baldwin Rd, Ojai, CA 93023 · APN 032-0-010-090 · ~44.1 acres
// Boundary traced from the Ventura County GIS parcel service.
// To add another property to the map: copy this file's shape, then register
// the export in server-complete.js's PROPERTIES array.

const HOWARD_PANEL_HTML = '<div class="image-gallery-section" style="margin-bottom: 20px;">' +
        '<h4 style="margin-bottom: 12px; color: #7C3AED;">📸 Property Gallery</h4>' +
        '<div class="carousel-container">' +
          '<div class="carousel-main" id="property-carousel-main">' +
            '<div class="carousel-loading">Loading images...</div>' +
          '</div>' +
          '<div class="carousel-thumbnails" id="property-carousel-thumbnails"></div>' +
        '</div>' +
      '</div>' +

      '<div class="property-info-section">' +
        '<h4>🏔️ Property Details</h4>' +
        '<div class="property-detail-row">' +
          '<span class="property-detail-label">APN:</span>' +
          '<span class="property-detail-value">032-0-010-090 (Ventura County)</span>' +
        '</div>' +
        '<div class="property-detail-row">' +
          '<span class="property-detail-label">Location:</span>' +
          '<span class="property-detail-value">1320 Baldwin Rd, Ojai, CA 93023</span>' +
        '</div>' +
        '<div class="property-detail-row">' +
          '<span class="property-detail-label">Jurisdiction:</span>' +
          '<span class="property-detail-value">County Unincorporated — Ventura County</span>' +
        '</div>' +
        '<div class="property-detail-row">' +
          '<span class="property-detail-label">Total Acreage:</span>' +
          '<span class="property-detail-value">~44.1 acres (per County GIS parcel geometry)</span>' +
        '</div>' +
        '<div class="property-detail-row">' +
          '<span class="property-detail-label">Zoning:</span>' +
          '<span class="property-detail-value">OS-40 ac / SRP / TRU / DKS / HCWC (Open Space, 40-acre min.)</span>' +
        '</div>' +
      '</div>' +

      '<div class="property-info-section">' +
        '<h4>✨ Site Overview</h4>' +
        '<ul class="property-features-list">' +
          '<li><strong>Frontage:</strong> Baldwin Road (Highway 150 corridor) at the northern point</li>' +
          '<li><strong>Boundary:</strong> ~5,870 ft perimeter traced from official County GIS parcel lines</li>' +
          '<li><strong>Terrain:</strong> Oak woodland and hillside with orchard areas and internal ranch trails</li>' +
          '<li><strong>Setting:</strong> Upper Ojai Valley — near Taft Gardens & Nature Preserve and Baldwin Ranch</li>' +
        '</ul>' +
      '</div>' +

      '<div class="property-info-section">' +
        '<h4>📋 Zoning Overlays</h4>' +
        '<ul class="property-features-list">' +
          '<li><strong>Scenic Resource Protection (SRP):</strong> Scenic Resource overlay area</li>' +
          '<li><strong>Habitat Connectivity (HCWC):</strong> Habitat Connectivity & Wildlife Corridors overlay</li>' +
          '<li><strong>Ojai Valley Dark Sky (DKS):</strong> Night-sky lighting protection overlay</li>' +
          '<li><strong>Temporary Rental Units (TRU):</strong> TRU overlay area</li>' +
        '</ul>' +
      '</div>' ;

const HOWARD_BOUNDARY = [
  {
    id: 'boundary_line_1',
    coordinates: [[34.427313, -119.319499], [34.42734, -119.319654], [34.427361, -119.31981], [34.427318, -119.319841]],
    thickness: 10,
    gradientColors: ['#9C27B0', '#673AB7', '#3F51B5', '#2196F3'],
    glowColor: '#9C27B0',
    description: 'North Point at Baldwin Road',
    name: 'North Point (Baldwin Rd Frontage)',
    length: '114 ft',
    features: ['Baldwin Road frontage', 'Property entrance area', 'Highway 150 corridor'],
    permanent: true,
    section: 'north-point'
  },
  {
    id: 'boundary_line_2',
    coordinates: [[34.427318, -119.319841], [34.424242, -119.322091]],
    thickness: 10,
    gradientColors: ['#2196F3', '#03A9F4', '#00BCD4', '#26C6DA'],
    glowColor: '#00BCD4',
    description: 'Northwest Boundary - Main Section',
    name: 'Northwest Property Line',
    length: '1,312 ft',
    features: ['Long western descent', 'Oak woodland edge', 'Adjacent to Taft Gardens area'],
    permanent: true,
    section: 'northwest'
  },
  {
    id: 'boundary_line_3',
    coordinates: [[34.424242, -119.322091], [34.423299, -119.321376], [34.421954, -119.320357]],
    thickness: 10,
    gradientColors: ['#00BCD4', '#4CAF50', '#66BB6A', '#81C784'],
    glowColor: '#4CAF50',
    description: 'Southwest Boundary',
    name: 'Southwest Property Line',
    length: '985 ft',
    features: ['West corner landmark', 'Hillside terrain', 'Orchard proximity'],
    permanent: true,
    section: 'southwest'
  },
  {
    id: 'boundary_line_4',
    coordinates: [[34.421954, -119.320357], [34.421004, -119.319137]],
    thickness: 10,
    gradientColors: ['#4CAF50', '#8BC34A', '#CDDC39', '#D4E157'],
    glowColor: '#8BC34A',
    description: 'South Boundary - West Section',
    name: 'South Property Line (West)',
    length: '505 ft',
    features: ['Approach to southern tip', 'Native chaparral'],
    permanent: true,
    section: 'south-west'
  },
  {
    id: 'boundary_line_5',
    coordinates: [[34.421004, -119.319137], [34.421583, -119.318752], [34.423628, -119.317391]],
    thickness: 10,
    gradientColors: ['#CDDC39', '#FFEB3B', '#FDD835', '#FBC02D'],
    glowColor: '#FDD835',
    description: 'Southeast Boundary',
    name: 'Southeast Property Line',
    length: '1,093 ft',
    features: ['Southern tip landmark', 'Rising eastern slope', 'Valley views'],
    permanent: true,
    section: 'southeast'
  },
  {
    id: 'boundary_line_6',
    coordinates: [[34.423628, -119.317391], [34.42511, -119.318304]],
    thickness: 10,
    gradientColors: ['#FFC107', '#FFB300', '#FFA000', '#FF8F00'],
    glowColor: '#FFC107',
    description: 'East Boundary',
    name: 'East Property Line',
    length: '607 ft',
    features: ['Eastern ridge', 'Orchard rows', 'Morning sun exposure'],
    permanent: true,
    section: 'east'
  },
  {
    id: 'boundary_line_7',
    coordinates: [[34.42511, -119.318304], [34.426918, -119.317682]],
    thickness: 10,
    gradientColors: ['#FF8F00', '#FF6F00', '#E65100', '#FF5722'],
    glowColor: '#FF6F00',
    description: 'Northeast Boundary',
    name: 'Northeast Property Line',
    length: '686 ft',
    features: ['Northeast slope', 'Oak groves', 'Neighboring estates'],
    permanent: true,
    section: 'northeast'
  },
  {
    id: 'boundary_line_8',
    coordinates: [[34.426918, -119.317682], [34.42715, -119.318667]],
    thickness: 10,
    gradientColors: ['#FF5722', '#E91E63', '#9C27B0', '#9C27B0'],
    glowColor: '#E91E63',
    description: 'North Boundary - East Section (closes at Baldwin Rd point)',
    name: 'North Property Line (East)',
    length: '309 ft',
    features: ['Return to Baldwin Road', 'Upper plateau', 'Gate proximity'],
    permanent: true,
    section: 'north-east'
  }
];

const HOWARD_ZONES = [
  {
    id: "main-house",
    name: "Main House",
    emoji: "🏠",
    position: [34.426548, -119.320077],
    type: "residential",
    budget: "Existing structure",
    timeline: "Already established",
    monthlyRevenue: "—",
    roi: "Heart of the property",
    description: "The existing main residence — home base of the property and the natural center that all proposed projects are designed around. Every idea on this map is placed to respect the privacy, views, and daily life of the main house.",
    features: [
      "Existing primary residence and operations home base",
      "All proposed projects positioned around it, never on top of it",
      "Privacy and quiet protected by design",
      "Utilities hub — existing water and power connections radiate from here"
    ]
  },
  {
    id: "hugelkultur-project",
    name: "Hugelkultur Project",
    emoji: "⛰️",
    position: [34.426104, -119.320536],
    type: "landscape",
    budget: "Ongoing — materials already on the land",
    timeline: "Active & ongoing",
    monthlyRevenue: "Long-term soil & land value",
    roi: "Flatter, richer, water-holding land",
    description: "The property's ongoing hugelkultur program (from the German 'Hügel' — hill): large raised beds built over buried logs, branches, and organic material. Bed by bed, the process is gradually terracing and flattening the hillsides while turning them into deep, self-fertilizing, water-holding growing ground.",
    features: [
      "Hugelkultur beds built from on-site wood and organic material",
      "Progressively flattens and terraces the hillsides over time",
      "Buried wood acts as a sponge — beds hold water through dry months",
      "Decomposing wood feeds the soil for 10-20 years without fertilizer",
      "Perfect planting ground for fruit trees, perennials, and vegetables",
      "Ties directly into the nursery and compost operations",
      "Part of the property's ongoing maintenance and improvement program"
    ],
    regenerativeFeatures: [
      "Sequesters carbon in the soil instead of burning or hauling wood",
      "Eliminates irrigation dependency as beds mature",
      "Builds topsoil on eroding hillsides",
      "Creates microclimates and habitat"
    ]
  },
  {
    id: "community-hub",
    mode: "vision",
    name: "Community Hub",
    emoji: "🏡",
    position: [34.423913, -119.318389],
    type: "community",
    budget: "Self-funded by Paul — needs only a spot + water & electric access",
    timeline: "Can start immediately",
    monthlyRevenue: "Full-time hands on the land",
    roi: "Every structure built stays with the property",
    description: "Paul's live-in base on the land, designed to grow into the property's Community Hub. It starts with just a raw, flat space in nature with water and electricity within reach — and grows into a beautiful, hidden gathering place built from natural materials, tucked into the hillside. Whatever gets built stays with the property afterward and keeps adding value as a shared space for everyone on the land.",
    optionsTitle: "🏗️ Structure Options (flexible — whatever works best)",
    options: [
      {
        name: "Hobbit-Style Earth Home",
        details: "Built into the hillside with cob and natural materials — hidden, sculptural, and beautiful. A one-of-a-kind structure that becomes a permanent feature of the property."
      },
      {
        name: "Cob Structure in the Hills",
        details: "Hand-built cob dwelling placed discreetly in the landscape. Creative, fireproof-friendly natural building that can grow organically over time."
      },
      {
        name: "Garden Shed Conversion",
        details: "Paul already owns a basic 12×12 metal garden shed that can be brought in and transformed into a clean, tidy temporary living setup while the permanent structure takes shape."
      },
      {
        name: "Trailer On-Site",
        details: "If allowed, a trailer can be placed as the simplest immediate living solution — zero construction, fully reversible, gone whenever it needs to be."
      },
      {
        name: "Support Structures",
        details: "Compost toilet, outdoor shower, and small amenity structures added as needed — all built in the same hidden, natural, leave-it-better style."
      }
    ],
    features: [
      "Needs only: a raw flat spot + access to water and electricity",
      "Hidden placement — invisible from the road and the main house",
      "Built regeneratively with natural and salvaged materials",
      "Everything constructed stays with the property when Paul moves on",
      "Paul on-site = daily hands for every other project on this map"
    ]
  },
  {
    id: "community-workshop",
    name: "Studio",
    visionName: "Community Workshop",
    emoji: "🛠️",
    position: [34.426016, -119.31941],
    type: "creative",
    budget: "Starts as a shade structure — grows with the work",
    timeline: "Phase 1 — early priority",
    monthlyRevenue: "Products, collaborations & property value",
    roi: "The engine room for every other project",
    description: "The existing structure here is in use today as a studio — a working creative space as it stands. In the vision it grows into the property's shared Community Workshop, built out with Andrew and Logan.",
    visionDescription: "The property's main workshop — it can begin as nothing more than a beautifully built shade structure in nature, housing an organized tool and materials setup. From there it becomes the engine room of the whole property: processing lumber and building supplies, organizing materials, and producing everything the other projects need.",
    features: [
      "Existing structure in active use as a studio",
      "Working creative space today",
      "Grows into the shared Community Workshop in the vision"
    ],
    visionFeatures: [
      "Main tool workshop for the entire property",
      "Can start as a nice open-air shade structure — walls come later",
      "Organized storage for tools, materials, and building supplies",
      "Processing station for lumber, cob, and salvaged materials",
      "Shared/community workshop model with skilled collaborators",
      "Andrew (talented woodworker) and Logan ready to plug in",
      "Builds and maintains everything else on this map"
    ],
    revenueStreams: [
      "Custom woodwork and artisan products made and sold from the shop",
      "Collaborative builds with invited makers — shared revenue",
      "Every hour in the shop beautifies the property and raises its value"
    ]
  },
  {
    id: "property-nursery",
    mode: "vision",
    name: "Nursery",
    emoji: "🌱",
    position: [34.426823, -119.318002],
    type: "agriculture",
    budget: "Lean start — beds, tables, irrigation, starter stock",
    timeline: "Phase 1 — front-of-property priority",
    monthlyRevenue: "Plant & tree sales + tree services",
    roi: "Regreens the property AND pays for itself",
    description: "A working nursery at the front of the property, close to the Baldwin Road entrance — growing fruit trees, plants, and vegetable starts in a year-round propagation cycle. First mission: make the property itself dramatically more vegetated, fruitful, and regenerative. Second mission: an official nursery the public can visit to buy trees and plants — with John's respected local tree services folded right in.",
    features: [
      "Located at the front entrance for easy public access",
      "Year-round propagation cycle — seeds, sprouts, and saplings always going",
      "Fruit trees, natives, herbs, and vegetable starts",
      "Supplies the property first: food forest and hugel beds get planted free",
      "Official retail nursery — neighbors come and buy",
      "Natural home base for John's tree services and local reputation",
      "Expands over time into deeper products and services"
    ],
    revenueStreams: [
      "Fruit tree and plant sales to the local community",
      "Tree services booked through the nursery front",
      "Vegetable starts and seasonal plant sales",
      "Future: grafting workshops, orchard consulting, delivery & planting services"
    ],
    developmentTimeline: [
      {
        phase: "Phase 1 — Setup",
        deliverables: "Build propagation beds, potting tables, shade cloth, and simple irrigation near the entrance. Start the first propagation cycles with fruit trees and natives. Begin planting out the property.",
        status: "Foundation"
      },
      {
        phase: "Phase 2 — Open to the Public",
        deliverables: "Signage at Baldwin Road, organized retail rows, regular open hours. Fold in tree services scheduling. Add compost and growing supplies from the on-site compost operation.",
        status: "Operating nursery"
      }
    ]
  },
  {
    id: "nature-gym",
    mode: "vision",
    name: "Outdoor Nature Gym",
    emoji: "🏋️",
    position: [34.426701, -119.318685],
    type: "wellness",
    budget: "Self-made equipment + smart secondhand finds",
    timeline: "Phase 1-2",
    monthlyRevenue: "Membership potential",
    roi: "Movement space for the whole community",
    description: "A beautifully designed outdoor gym set under the trees — real training equipment, but nature-styled: solid self-built stations combined with quality secondhand finds, laid out with enough space for a real workout community. Ping-pong table, possibly a small basketball court, climbing and play elements for kids — an all-ages movement space in nature, close to the street so members come and go easily.",
    features: [
      "Set under mature trees — shaded, beautiful, breathable",
      "Real equipment: self-built rigs + curated secondhand finds",
      "Space for group workouts and regular training",
      "Ping-pong table (+ optional half-court basketball)",
      "Climbing features and play elements for kids",
      "All ages — kids, young adults, parents together",
      "Near the street for simple member access"
    ],
    revenueStreams: [
      "Monthly memberships — individuals and families",
      "Day passes for visitors",
      "Future: outdoor training sessions and kids' movement classes"
    ]
  },
  {
    id: "sacred-spaces",
    mode: "vision",
    name: "Ceremony & Sacred Spaces",
    emoji: "🔥",
    position: [34.42452, -119.318856],
    type: "ceremonial",
    budget: "Built by hand, space by space",
    timeline: "Grows with the property",
    monthlyRevenue: "Gatherings & community events",
    roi: "Draws conscious community to the land",
    description: "A collection of hand-built sacred and ceremonial spaces placed wherever the land feels strongest — a kiva, yoga decks, meditation spots, and ceremonial fire circles. Spaces for ceremony, gatherings, and community events that give people a reason to come to the land and a reason to care for it.",
    features: [
      "Kiva — earthen, in-ground ceremonial space",
      "Yoga and meditation decks set in nature",
      "Ceremonial fire circles for gatherings",
      "Placed at the property's most powerful quiet spots",
      "Built naturally: earth, stone, and local wood",
      "Hosts ceremonies, gatherings, and community events"
    ]
  },
  {
    id: "mushroom-containers",
    mode: "vision",
    name: "Mushroom Growing Containers",
    emoji: "🍄",
    position: [34.426219, -119.318052],
    type: "agriculture",
    budget: "Investment project — can phase in later",
    timeline: "Phase 2+ (after nursery is running)",
    monthlyRevenue: "Restaurant + local sales potential",
    roi: "High-margin crop in a tiny footprint",
    description: "Shipping containers or trailers converted into controlled growing environments for organic culinary mushrooms — oyster, shiitake, lion's mane. Feeds the community first and supplies local restaurants and neighbors who want genuinely local, organic mushrooms. A real investment project, but one that can wait — and it slots naturally next to the nursery at the front.",
    features: [
      "Converted shipping containers or trailers — compact and contained",
      "Organic culinary varieties: oyster, shiitake, lion's mane",
      "Climate-controlled year-round production",
      "Pairs with the nursery and compost operation at the front",
      "Spent substrate feeds the compost and hugel beds",
      "Can start with a single container and scale"
    ],
    revenueStreams: [
      "Local restaurant supply — chefs love verified-local organic mushrooms",
      "Direct sales to neighbors and community",
      "Future: dried mushrooms, tinctures, and grow kits via the nursery"
    ],
    developmentTimeline: [
      {
        phase: "Phase 1 — First Container",
        deliverables: "Source and convert one container or trailer: insulation, racks, humidity and airflow. First flushes for the community and test sales.",
        status: "When the investment makes sense"
      },
      {
        phase: "Phase 2 — Scale",
        deliverables: "Add capacity, establish standing restaurant accounts, integrate sales through the nursery front.",
        status: "Growth"
      }
    ]
  },
  {
    id: "beekeeping",
    mode: "vision",
    name: "Beekeeping & Honey Production",
    emoji: "🐝",
    position: [34.425716, -119.320085],
    type: "beekeeping",
    budget: "$5,000 - $10,000",
    timeline: "Phase 1 (0-3 months)",
    monthlyRevenue: "$500+",
    roi: "Starting phase",
    description: "Collaborative beekeeping initiative with local beekeepers for honey production, bee products, and pollination services through partnership model.",
    features: [
      "Partnership with local beekeepers",
      "10-20 hives with scaling potential",
      "Dedicated processing shed and secure fencing",
      "Honey extraction and processing facility",
      "Value-added products: wax, skincare, soaps, tinctures",
      "Online and farmers market sales",
      "Pollination services for regenerative agriculture",
      "Educational beekeeping experiences"
    ],
    revenueStreams: [
      "Honey and bee products sharing: $800/month",
      "Value-added wax products: $200/month",
      "Revenue starts within 3 months"
    ]
  },
  {
    id: "pond-swimming-hole",
    mode: "vision",
    name: "Pond & Swimming Hole",
    emoji: "🐟",
    position: [34.426395, -119.319394],
    type: "water",
    budget: "One-time earthworks + ecosystem establishment",
    timeline: "One-time build, then self-sustaining",
    monthlyRevenue: "Protein + lifestyle + property value",
    roi: "Catch a fish, have a meal — forever",
    description: "A dug (or dammed, depending on the landscape) natural pond serving double duty: a beautiful swimming hole and a working fish pond. One-time setup of a healthy, self-maintaining ecosystem — the right water-cleaning plants and the right fish varieties keep the water clear and the system balanced. Grow-your-own protein and a massive quality-of-life upgrade for everyone on the land.",
    features: [
      "Natural swimming pond — no chlorine, plants do the filtering",
      "Fish varieties chosen for a balanced, self-sustaining ecosystem",
      "Grow-your-own protein: catch a fish, have a meal",
      "Aquatic plants clean and maintain the water year-round",
      "Wildlife habitat and on-property water storage",
      "Placement follows the landscape — wherever water wants to sit",
      "Major property value and community lifestyle addition"
    ]
  },
  {
    id: "growing-dome",
    mode: "vision",
    name: "Growing Dome Greenhouse",
    emoji: "🌴",
    position: [34.426238, -119.318776],
    type: "agriculture",
    budget: "Scales from hoop house to full dome",
    timeline: "Hand in hand with the nursery",
    monthlyRevenue: "Year-round growing power",
    roi: "Tropical fruit in Ojai, all year",
    description: "A growing dome or greenhouse working hand in hand with the nursery — sprouting and growing straight through winter, and bringing tropical fruit trees and plants into the property's ecosystem. Tropical fruits, veggies, and starts growing all year long, feeding both the nursery cycle and the property's food supply.",
    features: [
      "Year-round sprouting and propagation for the nursery cycle",
      "Winter growing — no dead season",
      "Tropical fruit trees and plants brought into the ecosystem",
      "Climate buffer for sensitive starts and mother plants",
      "Can start as a simple hoop house and grow into a full dome",
      "Positioned to share water and workflow with the nursery"
    ]
  },
  {
    id: "livestock",
    name: "Livestock & Animals",
    emoji: "🐐",
    position: [34.426122, -119.320153],
    type: "agriculture",
    budget: "Infrastructure first — fencing, shelter, water",
    timeline: "Rebuild & expand at John's pace",
    monthlyRevenue: "Land management + produce",
    roi: "The hillside maintenance crew that feeds you",
    description: "John has had goats on the land before — this project rebuilds and upgrades the livestock infrastructure properly (fencing, shelters, water lines) and helps bring more animals back to the property. Goats manage brush on the hillsides, chickens turn scraps into eggs, and every animal feeds the compost operation. Scaled entirely to what John wants.",
    features: [
      "Goats — natural brush and fire-fuel management on the hillsides",
      "Chickens for eggs and pest control (optional expansion)",
      "Proper fencing, shelters, and water lines built right once",
      "Rotational grazing to regenerate the land",
      "Manure feeds the compost operation directly",
      "Fresh produce for the property — eggs, milk, more as desired",
      "Sized and scaled entirely to John's comfort"
    ]
  },
  {
    id: "compost-operation",
    mode: "vision",
    name: "Compost Operation",
    emoji: "♻️",
    position: [34.425869, -119.31823],
    type: "agriculture",
    budget: "Bins, bays & a good pitchfork",
    timeline: "Phase 1 — starts with the nursery",
    monthlyRevenue: "Free fertility + bagged compost sales",
    roi: "Turns waste streams into soil",
    description: "A proper organic compost operation right next to the nursery — turning livestock manure, kitchen waste, and organic material from around the property into rich compost. Can also take in manure delivered by (or picked up from) neighboring farms and stables, turning the whole neighborhood's 'waste problem' into this property's fertility engine.",
    features: [
      "Sited next to the nursery — compost goes straight to the plants",
      "Feeds on livestock manure, kitchen waste, and property trimmings",
      "Manure pickup/drop-off from local neighbors, farms, and stables",
      "Hot composting bays plus worm composting for fine material",
      "Supplies the nursery, hugel beds, orchard, and gardens for free",
      "Neighbors' waste stream becomes the property's soil bank"
    ],
    revenueStreams: [
      "Bagged organic compost sold at the nursery stand",
      "Worm castings — premium product for local gardeners",
      "Possible pickup service fee from stables needing manure removal"
    ]
  }
];

const VISION_PANEL_HTML = 
      '<div class="image-gallery-section" style="margin-bottom: 20px;">' +
        '<h4 style="margin-bottom: 12px; color: #7C3AED;">📸 Property Gallery</h4>' +
        '<div class="carousel-container">' +
          '<div class="carousel-main" id="property-carousel-main">' +
            '<div class="carousel-loading">Loading images...</div>' +
          '</div>' +
          '<div class="carousel-thumbnails" id="property-carousel-thumbnails"></div>' +
        '</div>' +
      '</div>' +

      '<div class="property-info-section">' +
        '<h4>🌱 The Proposal in One Breath</h4>' +
        '<div style="background: linear-gradient(135deg, #f3eefc 0%, #fff8e6 100%); padding: 16px; border-radius: 10px; border-left: 4px solid #6a3d9a;">' +
          '<p style="margin: 0 0 10px 0; line-height: 1.7; color: #444;">Howard, this map is my proposal to you. You have 44 raw acres and a wish to see agriculture happen here. I am a property developer, software developer, entrepreneur and builder — and I am looking for my next home base. I would like it to be your land.</p>' +
          '<p style="margin: 0 0 10px 0; line-height: 1.7; color: #444;"><strong>What I bring:</strong> hands-on regenerative development — hugelkultur beds, a nursery, mushroom cultivation, beekeeping, livestock rotation and compost systems — plus the workshop, tools and energy to build it, and the digital craft to document and manage everything (this living map is the first artifact).</p>' +
          '<p style="margin: 0 0 10px 0; line-height: 1.7; color: #444;"><strong>What I ask:</strong> a place to live on the land while I develop it — starting simply (studio / cabin), growing only with your blessing. Every project on this map is placed as a suggestion; tap any icon to explore it. We build only what we agree on, phase by phase.</p>' +
        '</div>' +
      '</div>' +
      '<div class="property-info-section">' +
        '<h4>🔨 How It Would Flow</h4>' +
        '<p style="margin: 0 0 10px 0; line-height: 1.7; color: #444;"><strong>Phase 1 — Arrive & prove (months 0–6):</strong> I settle into the studio, build the first hugelkultur beds, get compost running, and start the nursery. Small, visible, real.</p>' +
        '<p style="margin: 0 0 10px 0; line-height: 1.7; color: #444;"><strong>Phase 2 — Grow (months 6–18):</strong> mushrooms, bees, livestock rotation, the pond and swimming hole restored, the community workshop humming.</p>' +
        '<p style="margin: 0 0 10px 0; line-height: 1.7; color: #444;"><strong>Phase 3 — Flourish (18+ months):</strong> the full 13-project vision on this map — a regenerative homestead that feeds people, teaches people, and makes the land more alive every season.</p>' +
      '</div>' +
      '<div class="property-info-section">' +
        '<h4>💡 About This Vision</h4>' +
        '<p style="margin: 0 0 10px 0; line-height: 1.7; color: #444;">Every position and idea on this map is flexible — a conversation starter, not a final plan. The Today toggle shows the property exactly as it is; this Vision shows what we could grow together. The full written proposal is available under Documents below.</p>' +
      '</div>' +
 '';

export const HOWARD_PROPERTY = {
  id: 'howard',
  name: 'Howard Property',
  shortLabel: '🏔️ Howard',
  labelChip: '🏔️ Howard Property',
  center: [34.424346, -119.319557],
  zoom: 16.5,
  footerTitle: '🏔️ Howard Property',
  footerInfo: ['13 Proposed Projects', '44 Acres', '1320 Baldwin Rd', 'Upper Ojai, CA'],
  cta: {
    heading: "Let's Talk About This Idea",
    paragraph: "Everything on this map is a flexible proposal — a picture of what's possible on this land. If an idea speaks to you, belongs in a different spot, or sparks something better, let's talk.",
    contacts: [
      { name: 'Mark Panics', email: 'markeduardpancis@gmail.com' },
      { name: 'Paul Muresan', email: 'paulmuresan77@gmail.com' }
    ],
    buttons: []
  },
  panel: { title: 'Howard Property — 1320 Baldwin Rd', html: HOWARD_PANEL_HTML },
  status: {"today": {"badge": "\ud83e\udd1d Private Land \u2014 Proposal Invited", "rows": [["Owner", "Howard (private)"], ["Status", "Not for sale \u2014 raw land + residence"], ["Openness", "Owner invites agriculture project ideas"], ["Acreage", "~44.1 ac \u00b7 OS-40 zoning"]], "note": "Howard has welcomed ideas for agricultural projects on this land. What you see in Today mode is the property exactly as it stands."}, "vision": {"badge": "\ud83c\udf31 Live Proposal \u2014 for Howard", "rows": [["Proposal", "Regenerative agriculture homestead & community workshop"], ["Model", "Resident steward-partner \u2014 sweat equity + phased projects"], ["Partner", "Paul (johny) \u2014 developer, builder, software & creative"], ["Ask", "A home base on the land in exchange for full development"]], "note": "Everything in Vision mode is a proposal for Howard to consider \u2014 13 projects, each flexible, each a conversation. Full proposal document below."}},
  docs: [{"label": "Howard Property \u2014 Full Proposal (PDF)", "file": "docs/howard/Howard-Property-Proposal.pdf"}],
  visionPanel: { title: "Howard Property \u2014 The Proposal", html: VISION_PANEL_HTML },
  boundary: HOWARD_BOUNDARY,
  zones: HOWARD_ZONES
};
