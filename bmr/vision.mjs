// Lemuria Headquarters vision layer for Black Mountain Ranch.
// Source: Lemuria Life prospectus + lemurialife.vercel.app master plan
// (BlackMountainRanch.tsx six-zone program) + PPM financials.
// These zones carry mode:'vision' — they appear only when the map's
// Current ⇄ Vision toggle is set to Vision.

export const BMR_VISION_LABEL_CHIP = '⛰️ Lemuria Headquarters';

export const BMR_VISION_ZONES = [
  {
    id: 'chumash-village',
    name: 'Chumash Village',
    emoji: '🏘️',
    position: [34.4185, -119.227],
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
    position: [34.4262, -119.212],
    type: 'ceremonial',
    budget: '$25M development',
    timeline: 'Phase 1–2',
    monthlyRevenue: '500-person capacity',
    roi: 'Spiritual centerpiece',
    mode: 'vision',
    description: 'An acoustically designed spiritual center at the heart of the headquarters — healing and activation chambers, sound therapy facilities, and meditation gardens where the ancient and the new meet in ceremony.',
    features: [
      'Acoustically designed spiritual center (500 capacity)',
      'Healing and activation chambers',
      'Sound therapy facilities',
      'Meditation gardens',
      'Home of the Circle-of-Truth gatherings'
    ]
  },
  {
    id: 'buffalo-rewilding',
    name: 'Buffalo Ranch & Rewilding',
    emoji: '🦬',
    position: [34.4235, -119.1935],
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
    position: [34.4135, -119.2145],
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
    position: [34.4105, -119.2295],
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
  },
  {
    id: 'white-buffalo-dome',
    name: 'White Buffalo Dome',
    emoji: '🛖',
    position: [34.4238, -119.2185],
    type: 'events',
    budget: '$20M development',
    timeline: 'Phase 2',
    monthlyRevenue: 'Year-round cultural events',
    roi: 'Indigenous University anchor',
    mode: 'vision',
    description: 'A Chumash immersive experience center — Native American cultural programs, educational workshops, and community gathering under one great dome, anchoring the Indigenous University: connecting the Ancient and the New.',
    features: [
      'Chumash immersive experience center',
      'Native American cultural programs',
      'Educational workshops — Indigenous University',
      'Community gathering space',
      'Year-round cultural events calendar'
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
  '<h4>🗺️ Six-Zone Master Plan</h4>' +
  '<ul class="property-features-list">' +
    '<li><strong>🏘️ Chumash Village</strong> — 50 carbon-negative homes, museum & craft workshops · $75M</li>' +
    '<li><strong>🕊️ Temple of the White Buffalo</strong> — 500-person acoustic spiritual center · $25M</li>' +
    '<li><strong>🦬 Buffalo Ranch & Rewilding</strong> — 200+ buffalo restoration program · $30M</li>' +
    '<li><strong>🎬 Lemuria Studios</strong> — the New Hollywood, 12+ productions/yr · $40M</li>' +
    '<li><strong>🌾 Regenerative Agriculture</strong> — food for 1,000+ people · $35M</li>' +
    '<li><strong>🛖 White Buffalo Dome</strong> — Chumash immersive center & Indigenous University · $20M</li>' +
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
