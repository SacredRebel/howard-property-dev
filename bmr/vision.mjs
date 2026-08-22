// Lemuria Headquarters vision layer for Black Mountain Ranch.
// Source: Lemuria Life prospectus + lemurialife.vercel.app master plan
// (BlackMountainRanch.tsx six-zone program) + PPM financials.
// These zones carry mode:'vision' — they appear only when the map's
// Current ⇄ Vision toggle is set to Vision.

export const BMR_VISION_LABEL_CHIP = '⛰️ Lemuria Headquarters';

// What exists on the ranch TODAY (from the sale listing + county records +
// imagery reconnaissance) — mode 'both': visible in Today AND Vision, because
// the lodge, barn, lake and working ranch all remain in the Lemuria plan.
export const BMR_TODAY_ZONES = [
  {
    id: 'main-lodge',
    name: 'Main Lodge',
    emoji: '🏛️',
    position: [34.429711, -119.187299],
    type: 'residential',
    budget: 'Existing — built 2004',
    timeline: 'Standing today',
    monthlyRevenue: '13,250 sq ft',
    roi: 'Heart of the ranch',
    mode: 'both',
    description: 'The 13,250 sq ft resort-style main residence at the heart of the ranch — the lodge that anchors the whole property today, with the tennis court and pool terrace nearby. In the Lemuria era it remains the headquarters residence.',
    features: [
      '13,250 sq ft resort-style lodge (built 2004)',
      'Tennis court and outdoor living terraces',
      'Anchors the 8434 Ojai Santa Paula Rd compound',
      'Remains the headquarters residence in the vision'
    ]
  },
  {
    id: 'guest-cottages',
    name: 'Guest House & Cottages',
    emoji: '🏡',
    position: [34.431042, -119.188266],
    type: 'hospitality',
    budget: 'Existing structures',
    timeline: 'Standing today',
    monthlyRevenue: '1,800 + 2,000 sq ft',
    roi: 'Ready guest capacity',
    mode: 'both',
    description: 'The existing guest house (1,800 sq ft), caretaker cottage (2,000 sq ft), and staff housing — about a dozen structures in total support life on the ranch today, and seed the hospitality program of the vision.',
    features: [
      'Guest house — 1,800 sq ft',
      'Caretaker cottage — 2,000 sq ft',
      'Staff housing and support structures',
      'First rooms of the future hospitality network'
    ]
  },
  {
    id: 'carriage-house',
    name: 'Carriage House',
    emoji: '🍷',
    position: [34.429771, -119.188399],
    type: 'community',
    budget: 'Existing — 6,200 sq ft',
    timeline: 'Standing today',
    monthlyRevenue: 'Gym · office · wine cellar',
    roi: 'Turn-key amenity building',
    mode: 'both',
    description: 'The 6,200 sq ft carriage house — gym, office, and wine cellar under one roof today. A turn-key gathering and wellness building that slots straight into the Lemuria program.',
    features: [
      '6,200 sq ft multi-use building',
      'Fitness gym',
      'Office suite',
      'Wine cellar'
    ]
  },
  {
    id: 'auto-gallery',
    name: 'Auto Gallery',
    emoji: '🏎️',
    position: [34.428598, -119.185492],
    type: 'creative',
    budget: 'Existing — 7,200 sq ft',
    timeline: 'Standing today',
    monthlyRevenue: 'Private museum',
    roi: 'Future studio-scale space',
    mode: 'both',
    description: 'A 7,200 sq ft private automobile museum — climate-controlled, gallery-grade space housing the vintage car collection today, and one of the ready-made large interiors for future productions and exhibitions.',
    features: [
      '7,200 sq ft gallery building',
      'Climate-controlled museum space',
      'Houses the vintage automobile collection',
      'Studio-scale interior for the vision era'
    ]
  },
  {
    id: 'barn-corrals',
    name: 'Horse Barn & Working Corrals',
    emoji: '🐎',
    position: [34.429687, -119.193359],
    type: 'agriculture',
    budget: 'Existing facilities',
    timeline: 'Working today',
    monthlyRevenue: 'Cattle + equestrian',
    roi: 'Living ranch operations',
    mode: 'both',
    description: 'The working heart of the cattle and horse operation — barn, corrals, cross-fencing, and equipment storage. The ranch runs livestock today, and these facilities carry straight into the rewilding and regenerative programs.',
    features: [
      'Horse barn and equipment storage',
      'Working cattle pens and corrals',
      'Cross-fenced pastures',
      'Foundation for the buffalo & regenerative programs'
    ]
  },
  {
    id: 'ranch-fields',
    name: 'Ranch Fields & Orchards',
    emoji: '🚜',
    position: [34.431567, -119.193935],
    type: 'agriculture',
    budget: 'Existing — in cultivation',
    timeline: 'Farmed today',
    monthlyRevenue: 'Row crops + orchard blocks',
    roi: 'Proven productive soil',
    mode: 'both',
    description: 'The big cultivated flats along the northern arm — plowed fields and orchard blocks in active use today. Proven water and soil that become the backbone of the regenerative agriculture vision.',
    features: [
      'Large cultivated field visible from Hwy 150',
      'Orchard plantings',
      'Existing irrigation infrastructure',
      'Backbone of the future regenerative agriculture zone'
    ]
  },
  {
    id: 'stocked-lake',
    name: 'Stocked Fishing Lake',
    emoji: '🎣',
    position: [34.421478, -119.199386],
    type: 'water',
    budget: 'Existing water feature',
    timeline: 'Full today',
    monthlyRevenue: 'Private lake',
    roi: 'Water heart of the ranch',
    mode: 'both',
    description: 'The private stocked fishing lake in the green heart of the ranch — surrounded by meadows and cottonwoods today, and the centerpiece water feature of every future gathering.',
    features: [
      'Private stocked fishing lake',
      'Meadow shoreline',
      'Wildlife magnet — herons, deer, waterfowl',
      'Centerpiece water feature in the vision'
    ]
  },
  {
    id: 'shooting-range',
    name: 'Shooting Range',
    emoji: '🎯',
    position: [34.424443, -119.193666],
    type: 'events',
    budget: 'Existing facility',
    timeline: 'In use today',
    monthlyRevenue: 'Professional grade',
    roi: 'Established amenity',
    mode: 'both',
    description: 'The ranch’s professional shooting range — one of the signature amenities of the estate as it stands today.',
    features: [
      'Professional shooting range',
      'Established safety berms and layout',
      'Signature amenity of the current estate'
    ]
  },
  {
    id: 'ranch-trails',
    name: '35+ Miles of Trails',
    emoji: '🌲',
    position: [34.417579, -119.224999],
    type: 'landscape',
    budget: 'Existing network',
    timeline: 'Ride them today',
    monthlyRevenue: 'Hiking · riding · off-road',
    roi: 'The wild backbone',
    mode: 'both',
    description: 'More than 35 miles of private trails web the ranch’s mountains and canyons — hiking, horseback, and off-road routes through the wild western backcountry, today and always.',
    features: [
      '35+ miles of private trails',
      'Hiking, equestrian, and off-road use',
      'Reaches the remote western canyons',
      'Becomes the wildlife-corridor and eco-tour network'
    ]
  }
];

export const BMR_VISION_ZONES = [
  {
    id: 'chumash-village',
    name: 'Chumash Village',
    emoji: '🏘️',
    position: [34.421347, -119.20626],
    type: 'community',
    budget: '$75M development',
    timeline: 'Phase 1–2',
    monthlyRevenue: '50 homes + communal buildings',
    roi: 'Cultural heart of the ranch',
    mode: 'vision',
    description: 'A living village honoring the first people of this valley — 50 carbon-negative residences woven around ceremony and gathering spaces, with a visitors center, museum, and traditional craft workshops built in partnership with the Chumash Nation.',
    features: [
      'Carbon-negative residences (fire & seismic engineered)',
      'Ceremony and gathering spaces',
      'Visitors center and museum',
      'Traditional craft workshops',
      'Built through the Chumash Nation partnership protocols'
    ]
  },
  {
    id: 'white-buffalo-temple',
    name: 'Temple of the White Buffalo',
    emoji: '🕊️',
    position: [34.428682, -119.188206],
    type: 'ceremonial',
    budget: '$45M development — Temple + Dome program',
    timeline: 'Phase 1–2',
    monthlyRevenue: '500-person capacity',
    roi: 'Spiritual centerpiece',
    mode: 'vision',
    description: 'An acoustically designed spiritual center at the heart of the headquarters — healing and activation chambers, sound therapy facilities, and meditation gardens where the ancient and the new meet in ceremony. The White Buffalo Dome lives here too — the Chumash immersive experience center anchoring the Indigenous University, folded into the temple complex.',
    features: [
      'Acoustically designed spiritual center (500 capacity)',
      'Healing and activation chambers',
      'Sound therapy facilities',
      'Meditation gardens',
      'Home of the Circle-of-Truth gatherings',
      'White Buffalo Dome — Chumash immersive experience center',
      'Native American cultural programs & educational workshops',
      'Anchors the Indigenous University: connecting the Ancient and the New',
      'Year-round cultural events calendar'
    ]
  },
  {
    id: 'buffalo-rewilding',
    name: 'Buffalo Ranch & Rewilding',
    emoji: '🐃',
    position: [34.425815, -119.20711],
    type: 'landscape',
    budget: '$30M development',
    timeline: 'Phase 1–3',
    monthlyRevenue: '200+ buffalo target herd',
    roi: 'Living land restoration',
    mode: 'vision',
    description: 'American Buffalo return to these hills — a restoration program with wildlife corridors, habitat regeneration, educational tours, and a research and breeding center, converting the working cattle ranch into a rewilded sanctuary.',
    features: [
      'American Buffalo restoration program (200+ herd target)',
      'Wildlife corridors and habitat restoration',
      'Educational tour facilities',
      'Research and breeding center',
      'Builds on the ranch’s existing working-ranch infrastructure'
    ]
  },
  {
    id: 'lemuria-studios',
    name: 'Lemuria Studios',
    emoji: '🎬',
    position: [34.422283, -119.198104],
    type: 'creative',
    budget: '$40M development',
    timeline: 'Phase 1–2',
    monthlyRevenue: '12+ productions / year',
    roi: 'The New Hollywood construct',
    mode: 'vision',
    description: 'Media and production studios cultivating the New Hollywood — film and television stages, podcast and streaming facilities, VR creation labs, and a distribution center producing content that inspires and implements the Golden Age.',
    features: [
      'Film and television production stages',
      'Podcast and streaming facilities',
      'Virtual reality creation labs',
      'Content distribution center — LightBody Love Productions',
      'Properties as content-creation machines: construction, events, regeneration'
    ]
  },
  {
    id: 'regenerative-agriculture',
    name: 'Regenerative Agriculture',
    emoji: '🌾',
    position: [34.433155, -119.18509],
    type: 'agriculture',
    budget: '$35M development',
    timeline: 'Phase 1–3',
    monthlyRevenue: 'Feeds 1,000+ people',
    roi: 'Food sovereignty engine',
    mode: 'vision',
    description: 'Permaculture farming systems across the ranch flats — medicinal herb cultivation, advanced water management, and soil restoration projects yielding food for more than a thousand people while healing the land.',
    features: [
      'Permaculture farming systems',
      'Medicinal herb and mushroom cultivation',
      'Advanced water management + patented self-generative pumping',
      'Soil restoration projects',
      'Ceremonial herbal garden supplying the healing programs'
    ]
  }
];

const G = '<div class="image-gallery-section" style="margin-bottom: 20px;">' +
  '<h4 style="margin-bottom: 12px; color: #7C3AED;">📸 Vision Gallery</h4>' +
  '<div class="carousel-container">' +
    '<div class="carousel-main" id="property-carousel-main">' +
      '<div class="carousel-loading">Loading images...</div>' +
    '</div>' +
    '<div class="carousel-thumbnails" id="property-carousel-thumbnails"></div>' +
  '</div>' +
'</div>';

export const BMR_VISION_PANEL = {
  title: 'Lemuria Headquarters — Black Mountain Ranch',
  html: G +
'<div class="property-info-section">' +
  '<h4>✨ The Headquarters of Lemuria Life</h4>' +
  '<div style="background: linear-gradient(135deg, #1a1030 0%, #2a1a40 100%); padding: 16px; border-radius: 8px; border-left: 4px solid #FFD700;">' +
    '<div style="color: #FFE9A8; line-height: 1.8; font-size: 14px;">' +
      '<p style="margin: 0 0 10px 0;"><strong>3,600 acres in Upper Ojai become the flagship of the Regenerative Renaissance</strong> — the headquarters of a network designed to inspire, fund, and develop 1,000+ regenerative communities worldwide.</p>' +
      '<p style="margin: 0;">Pending purchase <strong>$50M</strong> · Development investment <strong>$250M</strong> · Projected value <strong>$1B+</strong></p>' +
    '</div>' +
  '</div>' +
'</div>' +

'<div class="property-info-section">' +
  '<h4>🗺️ Master Plan</h4>' +
  '<ul class="property-features-list">' +
    '<li><strong>🏘️ Chumash Village</strong> — 50 carbon-negative homes, museum & craft workshops · $75M</li>' +
    '<li><strong>🕊️ Temple of the White Buffalo</strong> — 500-person acoustic spiritual center + the White Buffalo Dome: Chumash immersive center & Indigenous University · $45M</li>' +
    '<li><strong>🐃 Buffalo Ranch & Rewilding</strong> — 200+ buffalo restoration program · $30M</li>' +
    '<li><strong>🎬 Lemuria Studios</strong> — the New Hollywood, 12+ productions/yr · $40M</li>' +
    '<li><strong>🌾 Regenerative Agriculture</strong> — food for 1,000+ people · $35M</li>' +
  '</ul>' +
'</div>' +

'<div class="property-info-section">' +
  '<h4>🏛️ Flagship Programs</h4>' +
  '<div class="property-detail-row"><span class="property-detail-label">Indigenous University:</span><span class="property-detail-value">Connecting the Ancient and the New</span></div>' +
  '<div class="property-detail-row"><span class="property-detail-label">Lemuria Studios:</span><span class="property-detail-value">Distributed studio network — content for the Golden Age</span></div>' +
  '<div class="property-detail-row"><span class="property-detail-label">Oya Spa Hotels:</span><span class="property-detail-value">Wellness hotel network integrating the Oya Spa brand</span></div>' +
  '<div class="property-detail-row"><span class="property-detail-label">Quantum Energy Center:</span><span class="property-detail-value">Patented self-generative pumping technology</span></div>' +
'</div>' +

'<div class="property-info-section">' +
  '<h4>📈 The Path</h4>' +
  '<div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 16px; border-radius: 8px; border-left: 4px solid #667eea;">' +
    '<div style="color: #555; line-height: 1.8; font-size: 14px;">' +
      '<p style="margin: 0 0 10px 0;"><strong>Phase 1 ($50M):</strong> acquisition + 10 fireproof premium homes on 40-acre lots. <strong>Phase 2 ($250M):</strong> the six zones + hospitality network. <strong>Phase 3 ($1B):</strong> global ecosystem.</p>' +
      '<p style="margin: 0;">Flip the toggle to <strong>Today</strong> to see the real county parcel structure underneath this vision — all 63 confirmed parcels, 3,380 county-recorded acres, every line a recorded boundary.</p>' +
    '</div>' +
  '</div>' +
'</div>'
};
