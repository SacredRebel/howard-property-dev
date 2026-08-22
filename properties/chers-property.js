// Cher's Property — property module for the multi-property map.
// 10622 Encino Dr, Oak View, CA 93022 · APN 034-0-220-135 · 2.00 acres
// Boundary traced from the Ventura County GIS parcel service (APN10 0340220135).

const CHERS_PANEL_HTML = '<div class="image-gallery-section" style="margin-bottom: 20px;">' +
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
    '<span class="property-detail-value">034-0-220-135 (Ventura County)</span>' +
  '</div>' +
  '<div class="property-detail-row">' +
    '<span class="property-detail-label">Location:</span>' +
    '<span class="property-detail-value">10622 Encino Dr, Oak View, CA 93022</span>' +
  '</div>' +
  '<div class="property-detail-row">' +
    '<span class="property-detail-label">Jurisdiction:</span>' +
    '<span class="property-detail-value">County Unincorporated — Ventura County</span>' +
  '</div>' +
  '<div class="property-detail-row">' +
    '<span class="property-detail-label">Total Acreage:</span>' +
    '<span class="property-detail-value">2.00 acres (per County records)</span>' +
  '</div>' +
'</div>' +

'<div class="property-info-section">' +
  '<h4>✨ Site Overview</h4>' +
  '<ul class="property-features-list">' +
    '<li><strong>Frontage:</strong> Curved Encino Drive frontage at the southeast corner</li>' +
    '<li><strong>Boundary:</strong> ~1,240 ft perimeter traced from official County GIS parcel lines</li>' +
    '<li><strong>Setting:</strong> Oak View — the Ventura River valley between Ojai and the coast</li>' +
  '</ul>' +
'</div>' +

'<div class="property-info-section">' +
  '<h4>💡 About This Map</h4>' +
  '<div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 16px; border-radius: 8px; border-left: 4px solid #667eea;">' +
    '<div style="font-weight: 600; color: #667eea; margin-bottom: 10px; font-size: 14px;">🌹 Two Starting Points</div>' +
    '<div style="color: #555; line-height: 1.8; font-size: 14px;">' +
      '<p style="margin: 0;">The map currently shows the property with its two core places — the Main House and the Quan Yin Rose Garden. Tap an icon to explore. Positions are flexible, and more can be added as the vision for the land grows.</p>' +
    '</div>' +
  '</div>' +
'</div>';

const CHERS_BOUNDARY = [
  {
    id: 'cher_boundary_1',
    coordinates: [[34.401676, -119.288093], [34.402453, -119.289147]],
    thickness: 10,
    gradientColors: ['#9C27B0', '#673AB7', '#3F51B5', '#2196F3'],
    glowColor: '#9C27B0',
    description: 'Northeast Boundary - Main Section',
    name: 'Northeast Property Line',
    length: '426 ft',
    features: ['Long northeast side'],
    permanent: true,
    section: 'northeast'
  },
  {
    id: 'cher_boundary_2',
    coordinates: [[34.402453, -119.289147], [34.402184, -119.289648]],
    thickness: 10,
    gradientColors: ['#2196F3', '#03A9F4', '#00BCD4', '#26C6DA'],
    glowColor: '#00BCD4',
    description: 'North Boundary',
    name: 'North Property Line',
    length: '180 ft',
    features: ['Northern corner section'],
    permanent: true,
    section: 'north'
  },
  {
    id: 'cher_boundary_3',
    coordinates: [[34.402184, -119.289648], [34.401557, -119.289361]],
    thickness: 10,
    gradientColors: ['#00BCD4', '#4CAF50', '#66BB6A', '#81C784'],
    glowColor: '#4CAF50',
    description: 'West Boundary',
    name: 'West Property Line',
    length: '245 ft',
    features: ['Western side'],
    permanent: true,
    section: 'west'
  },
  {
    id: 'cher_boundary_4',
    coordinates: [[34.401557, -119.289361], [34.401579, -119.288511]],
    thickness: 10,
    gradientColors: ['#4CAF50', '#8BC34A', '#CDDC39', '#D4E157'],
    glowColor: '#8BC34A',
    description: 'South Boundary',
    name: 'South Property Line',
    length: '256 ft',
    features: ['Southern edge'],
    permanent: true,
    section: 'south'
  },
  {
    id: 'cher_boundary_5',
    coordinates: [[34.401579, -119.288511], [34.401585, -119.288425], [34.401597, -119.288339], [34.401617, -119.288255], [34.401643, -119.288173]],
    thickness: 10,
    gradientColors: ['#FFC107', '#FF8F00', '#E65100', '#9C27B0'],
    glowColor: '#FF8F00',
    description: 'Encino Drive Frontage (curved corner, closes to the east point)',
    name: 'Encino Drive Frontage',
    length: '105 ft (+27 ft closing)',
    features: ['Curved road frontage', 'Property entrance'],
    permanent: true,
    section: 'frontage'
  }
];

const CHERS_ZONES = [
  {
    id: "main-house",
    name: "Main House",
    emoji: "🏠",
    position: [34.402021, -119.288792],
    type: "residential",
    budget: "Existing structure",
    timeline: "Already established",
    monthlyRevenue: "—",
    roi: "Heart of the property",
    description: "The existing main residence at 10622 Encino Dr — the home base of the property. Everything else on this map is placed around it.",
    features: [
      "Existing primary residence",
      "Property home base and utilities hub",
      "Privacy and daily life respected by every other placement"
    ]
  },
  {
    id: "quan-yin-rose-garden",
    name: "Quan Yin Rose Garden",
    emoji: "🌹",
    position: [34.401846, -119.2888],
    type: "landscape",
    budget: "Grown with love",
    timeline: "Living & growing",
    monthlyRevenue: "—",
    roi: "The soul of the property",
    description: "A beautiful rose garden with a Quan Yin statue standing at its center — fruit trees ringing the roses, and winding pathways leading you through the garden. A peaceful, contemplative heart for the whole property.",
    features: [
      "Quan Yin statue at the center of the garden",
      "Rose beds surrounding the statue",
      "Fruit trees ringing the garden's edge",
      "Winding pathways through the roses",
      "Quiet spots for sitting and contemplation"
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
        '<h4>🌹 The Vision — Keep It in the Family</h4>' +
        '<p style="margin: 0 0 10px 0; line-height: 1.7; color: #444;">Cher&#39;s place is already what it wants to be: a finished, loved home with the Quan Yin rose garden at its heart. The vision is to acquire it (≈ $2.2M) so it stays in the family — and to keep caring for it exactly as it is.</p>' +
        '<p style="margin: 0 0 10px 0; line-height: 1.7; color: #444;"><strong>One exploratory idea:</strong> a second ADU could one day join the property. It is an early thought, not a plan — shown here only so the possibility has a place on the map.</p>' +
      '</div>' +
 '';

export const CHERS_PROPERTY = {
  id: 'chers-property',
  name: "Cher's Property",
  shortLabel: "🌹 Cher's",
  labelChip: "🌹 Cher's Property",
  center: [34.401922, -119.288981],
  zoom: 18,
  footerTitle: "🌹 Cher's Property",
  footerInfo: ['2 Places', '2 Acres', '10622 Encino Dr', 'Oak View, CA'],
  cta: {
    heading: "Let's Talk About This Idea",
    paragraph: "This map is a living picture of the property — every icon can move, and new ideas can always be added. If something sparks a thought, let's talk.",
    contacts: [
      { name: 'Mark Panics', email: 'markeduardpancis@gmail.com' },
      { name: 'Paul Muresan', email: 'paulmuresan77@gmail.com' }
    ],
    buttons: []
  },
  panel: { title: "Cher's Property — 10622 Encino Dr", html: CHERS_PANEL_HTML },
  status: {"today": {"badge": "\ud83c\udff7\ufe0f For Sale Now \u2014 $2.2M (est.)", "rows": [["Status", "On the market"], ["Goal", "Acquire to keep in the family"], ["Needed", "\u2248 $2,200,000"], ["Condition", "Turn-key \u2014 finalized as it is"], ["Acreage", "2.0 ac \u00b7 Encino Dr, Oak View"]], "note": "The mission here is simple: the house is for sale, and we want to bring it into the family circle before it goes to the open market."}, "vision": {"badge": "\ud83c\udf39 Keep & Care \u2014 Family Home", "rows": [["Plan", "Preserve as-is under family stewardship"], ["Exploratory", "Possible second ADU \u2014 early idea only"], ["Depends on", "Outcome of the acquisition"]], "note": "The vision is intentionally light: first the home is secured, then \u2014 perhaps \u2014 a second ADU. Nothing here is committed; it lives on this map as a possibility."}},
  docs: [{"label": "Cher's Property \u2014 Family Acquisition One-Pager (PDF)", "file": "docs/chers-property/Chers-Property-OnePager.pdf"}],
  visionPanel: { title: "Cher's Property \u2014 Family Stewardship", html: VISION_PANEL_HTML },
  boundary: CHERS_BOUNDARY,
  zones: CHERS_ZONES
};
