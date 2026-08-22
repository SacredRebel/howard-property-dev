// Keri's Property — property module for the multi-property map.
// 14209 De La Garrigue Rd, Ojai, CA 93023 · APN 011-0-040-135 · ~34.0 acres
// Boundary traced from the Ventura County GIS parcel service (APN10 0110040135).

const KERIS_PANEL_HTML = '<div class="image-gallery-section" style="margin-bottom: 20px;">' +
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
    '<span class="property-detail-value">011-0-040-135 (Ventura County)</span>' +
  '</div>' +
  '<div class="property-detail-row">' +
    '<span class="property-detail-label">Location:</span>' +
    '<span class="property-detail-value">14209 De La Garrigue Rd, Ojai, CA 93023</span>' +
  '</div>' +
  '<div class="property-detail-row">' +
    '<span class="property-detail-label">Jurisdiction:</span>' +
    '<span class="property-detail-value">County Unincorporated — Ventura County</span>' +
  '</div>' +
  '<div class="property-detail-row">' +
    '<span class="property-detail-label">Total Acreage:</span>' +
    '<span class="property-detail-value">~34.0 acres (per County GIS parcel geometry)</span>' +
  '</div>' +
  '<div class="property-detail-row">' +
    '<span class="property-detail-label">Zoning:</span>' +
    '<span class="property-detail-value">OS-80 ac / TRU / DKS / HCWC (Open Space, 80-acre min.)</span>' +
  '</div>' +
'</div>' +

'<div class="property-info-section">' +
  '<h4>✨ Site Overview</h4>' +
  '<ul class="property-features-list">' +
    '<li><strong>Boundary:</strong> ~5,030 ft perimeter traced from official County GIS parcel lines</li>' +
    '<li><strong>Access:</strong> De La Garrigue Road, west Upper Ojai Valley</li>' +
    '<li><strong>Setting:</strong> Quiet valley-edge acreage minutes from the Howard Property</li>' +
  '</ul>' +
'</div>' +

'<div class="property-info-section">' +
  '<h4>📋 Zoning Overlays</h4>' +
  '<ul class="property-features-list">' +
    '<li><strong>Habitat Connectivity (HCWC):</strong> Habitat Connectivity & Wildlife Corridors overlay</li>' +
    '<li><strong>Ojai Valley Dark Sky (DKS):</strong> Night-sky lighting protection overlay</li>' +
    '<li><strong>Temporary Rental Units (TRU):</strong> TRU overlay area</li>' +
  '</ul>' +
'</div>' +

'<div class="property-info-section">' +
  '<h4>💡 About This Map</h4>' +
  '<div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 16px; border-radius: 8px; border-left: 4px solid #667eea;">' +
    '<div style="font-weight: 600; color: #667eea; margin-bottom: 10px; font-size: 14px;">🌱 Three Starting Points</div>' +
    '<div style="color: #555; line-height: 1.8; font-size: 14px;">' +
      '<p style="margin: 0;">The map currently shows the property with its three core places — the Main House, the Guest House, and a Ceremony Space. Tap any icon to explore. Positions are flexible, and more can be added as the vision for the land grows.</p>' +
    '</div>' +
  '</div>' +
'</div>';

const KERIS_BOUNDARY = [
  {
    id: 'keri_boundary_1',
    coordinates: [[34.432416, -119.329002], [34.435706, -119.330851]],
    thickness: 10,
    gradientColors: ['#9C27B0', '#673AB7', '#3F51B5', '#2196F3'],
    glowColor: '#9C27B0',
    description: 'Northeast Boundary - Main Section',
    name: 'Northeast Property Line',
    length: '1,324 ft',
    features: ['Long northeast side', 'Valley views'],
    permanent: true,
    section: 'northeast'
  },
  {
    id: 'keri_boundary_2',
    coordinates: [[34.435706, -119.330851], [34.435561, -119.331026], [34.435091, -119.331265]],
    thickness: 10,
    gradientColors: ['#2196F3', '#03A9F4', '#00BCD4', '#26C6DA'],
    glowColor: '#00BCD4',
    description: 'North Point',
    name: 'North Point',
    length: '261 ft',
    features: ['Northern tip of the parcel'],
    permanent: true,
    section: 'north-point'
  },
  {
    id: 'keri_boundary_3',
    coordinates: [[34.435091, -119.331265], [34.434392, -119.332029], [34.433726, -119.332446]],
    thickness: 10,
    gradientColors: ['#00BCD4', '#4CAF50', '#66BB6A', '#81C784'],
    glowColor: '#4CAF50',
    description: 'Northwest Boundary',
    name: 'Northwest Property Line',
    length: '617 ft',
    features: ['Stepped northwest edge', 'Hillside terrain'],
    permanent: true,
    section: 'northwest'
  },
  {
    id: 'keri_boundary_4',
    coordinates: [[34.433726, -119.332446], [34.432333, -119.333726]],
    thickness: 10,
    gradientColors: ['#4CAF50', '#8BC34A', '#CDDC39', '#D4E157'],
    glowColor: '#8BC34A',
    description: 'West Boundary',
    name: 'West Property Line',
    length: '638 ft',
    features: ['Western descent to the far corner'],
    permanent: true,
    section: 'west'
  },
  {
    id: 'keri_boundary_5',
    coordinates: [[34.432333, -119.333726], [34.431501, -119.333344], [34.431204, -119.332956]],
    thickness: 10,
    gradientColors: ['#CDDC39', '#FFEB3B', '#FDD835', '#FBC02D'],
    glowColor: '#FDD835',
    description: 'Southwest Boundary',
    name: 'Southwest Property Line',
    length: '484 ft',
    features: ['Southwest slope'],
    permanent: true,
    section: 'southwest'
  },
  {
    id: 'keri_boundary_6',
    coordinates: [[34.431204, -119.332956], [34.430715, -119.333067]],
    thickness: 10,
    gradientColors: ['#FFC107', '#FFB300', '#FFA000', '#FF8F00'],
    glowColor: '#FFC107',
    description: 'West Corner Jog',
    name: 'South Corner Transition',
    length: '182 ft',
    features: ['Corner marker'],
    permanent: true,
    section: 'south-corner'
  },
  {
    id: 'keri_boundary_7',
    coordinates: [[34.430715, -119.333067], [34.430639, -119.330819]],
    thickness: 10,
    gradientColors: ['#FF8F00', '#FF6F00', '#E65100', '#9C27B0'],
    glowColor: '#FF6F00',
    description: 'South Boundary (closes along the southeast edge)',
    name: 'South Property Line',
    length: '678 ft',
    features: ['Southern edge', 'Closes to the east corner (~849 ft)'],
    permanent: true,
    section: 'south'
  }
];

const KERIS_ZONES = [
  {
    id: "main-house",
    name: "Main House",
    emoji: "🏠",
    position: [34.433071, -119.331222],
    type: "residential",
    budget: "Existing structure",
    timeline: "Already established",
    monthlyRevenue: "—",
    roi: "Heart of the property",
    description: "The existing main residence at 14209 De La Garrigue Rd — the home base of the property. Everything else on this map is placed around it.",
    features: [
      "Existing primary residence",
      "Property home base and utilities hub",
      "Privacy and daily life respected by every other placement"
    ]
  },
  {
    id: "guest-house",
    name: "Guest House",
    emoji: "🏡",
    position: [34.433521, -119.331145],
    type: "hospitality",
    budget: "Existing / to define together",
    timeline: "Flexible",
    monthlyRevenue: "Guest hosting potential",
    roi: "Comfortable space for visitors",
    description: "The guest house — a comfortable second dwelling for family, friends, and visitors. With the property sitting in the TRU (Temporary Rental Units) overlay, it also holds gentle hosting potential if that is ever wanted.",
    features: [
      "Separate guest accommodations",
      "Private from the main house",
      "Sits within the TRU overlay — hosting potential if desired",
      "Natural base for longer family stays"
    ]
  },
  {
    id: "ceremony-space",
    name: "Ceremony Space",
    emoji: "🔥",
    position: [34.432483, -119.332106],
    type: "ceremonial",
    budget: "Built by hand, naturally",
    timeline: "Flexible",
    monthlyRevenue: "Gatherings & community",
    roi: "A place for meaning on the land",
    description: "A dedicated outdoor ceremony space — a fire circle and gathering spot placed where the land feels strongest, built simply and naturally from earth, stone, and local wood. A quiet setting for ceremony, celebration, and community moments under the Ojai dark sky.",
    features: [
      "Ceremonial fire circle and gathering space",
      "Built naturally: earth, stone, and local wood",
      "Placed at a quiet, powerful spot on the land",
      "Dark-sky setting — stars stay part of every gathering",
      "Position flexible — wherever the land calls for it"
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
        '<h4>🌸 A Vision of Continuity</h4>' +
        '<p style="margin: 0 0 10px 0; line-height: 1.7; color: #444;">Some land is not for developing — it is for keeping. Keri&#39;s property remains exactly what it is today: the main house, the guest house, and the ceremony space, held in family stewardship as the quiet anchor of everything else on this map.</p>' +
      '</div>' +
 '';

export const KERIS_PROPERTY = {
  id: 'keris-property',
  name: "Keri's Property",
  shortLabel: "🌸 Keri's",
  labelChip: "🌸 Keri's Property",
  center: [34.432692, -119.331337],
  zoom: 16.5,
  footerTitle: "🌸 Keri's Property",
  footerInfo: ['3 Projects', '34 Acres', '14209 De La Garrigue Rd', 'Upper Ojai, CA'],
  cta: {
    heading: "Let's Talk About This Idea",
    paragraph: "This map is a living picture of the property — every icon can move, and new ideas can always be added. If something sparks a thought, let's talk.",
    contacts: [
      { name: 'Mark Panics', email: 'markeduardpancis@gmail.com' },
      { name: 'Paul Muresan', email: 'paulmuresan77@gmail.com' }
    ],
    buttons: []
  },
  panel: { title: "Keri's Property — 14209 De La Garrigue Rd", html: KERIS_PANEL_HTML },
  status: {"today": {"badge": "\ud83d\udd12 Not For Sale \u2014 Family Stewardship", "rows": [["Status", "Held and stewarded within the family circle"], ["Role", "Anchor property of the community"], ["Acreage", "~34 ac \u00b7 De La Garrigue Rd"]], "note": "Keri's land is not on the market and not for acquisition \u2014 it simply is, and it holds the circle."}, "vision": {"badge": "\ud83c\udf38 Steady \u2014 No Development Planned", "rows": [["Plan", "Remains as it is"], ["Continues", "Ceremony space, guest house, family gatherings"]], "note": "The vision for this land is continuity \u2014 the same three places, kept alive and loved."}},
  docs: [],
  visionPanel: { title: "Keri's Property \u2014 Vision of Continuity", html: VISION_PANEL_HTML },
  boundary: KERIS_BOUNDARY,
  zones: KERIS_ZONES
};
