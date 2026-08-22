// Rose Valley Property — property module for the multi-property map.
// 7343 Rose Valley Rd, Ojai, CA 93023 · APN 015-0-010-120 · 40.016 county acres
// FOR SALE — acquisition target (MLS V1-35138, asking $810,000).
// Boundary is the REAL county parcel line (Ventura County GIS parcel service,
// WGS84, 4-corner parcel, ~5,140 ft perimeter) — an inholding surrounded by
// Los Padres National Forest in Rose Valley, up Highway 33 north of Ojai.

const ROSE_PANEL_HTML = '<div class="image-gallery-section" style="margin-bottom: 20px;">' +
  '<h4 style="margin-bottom: 12px; color: #7C3AED;">📸 Property Gallery</h4>' +
  '<div class="carousel-container">' +
    '<div class="carousel-main" id="property-carousel-main">' +
      '<div class="carousel-loading">Loading images...</div>' +
    '</div>' +
    '<div class="carousel-thumbnails" id="property-carousel-thumbnails"></div>' +
  '</div>' +
'</div>' +

'<div class="property-info-section">' +
  '<h4>🌄 Property Details</h4>' +
  '<div class="property-detail-row">' +
    '<span class="property-detail-label">Address:</span>' +
    '<span class="property-detail-value">7343 Rose Valley Rd, Ojai, CA 93023</span>' +
  '</div>' +
  '<div class="property-detail-row">' +
    '<span class="property-detail-label">APN:</span>' +
    '<span class="property-detail-value">015-0-010-120 (Assessor Bk 015, Pg 01)</span>' +
  '</div>' +
  '<div class="property-detail-row">' +
    '<span class="property-detail-label">Size:</span>' +
    '<span class="property-detail-value">40.016 acres per county records — a clean four-corner parcel</span>' +
  '</div>' +
  '<div class="property-detail-row">' +
    '<span class="property-detail-label">Jurisdiction:</span>' +
    '<span class="property-detail-value">County Unincorporated — Ventura County</span>' +
  '</div>' +
  '<div class="property-detail-row">' +
    '<span class="property-detail-label">Zoning:</span>' +
    '<span class="property-detail-value">OS-160 ac (Open Space, 160-acre minimum) · no overlays</span>' +
  '</div>' +
  '<div class="property-detail-row">' +
    '<span class="property-detail-label">Setting:</span>' +
    '<span class="property-detail-value">Surrounded by Los Padres National Forest — Rose Valley, Hwy 33</span>' +
  '</div>' +
'</div>' +

'<div class="property-info-section">' +
  '<h4>🏷️ For Sale — Acquisition Target</h4>' +
  '<div style="background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%); padding: 16px; border-radius: 8px; border-left: 4px solid #FF9800;">' +
    '<div style="font-weight: 700; color: #E65100; margin-bottom: 8px; font-size: 15px;">Asking $810,000 · MLS V1-35138</div>' +
    '<div style="color: #555; line-height: 1.8; font-size: 14px;">' +
      '<p style="margin: 0 0 8px 0;">Remodeled 3bd/2ba home (1,440 sq ft, 2002) with owned solar, a tested private well, engineered septic, propane, and creek frontage. Corrals, cross-fencing, storage, and an RV area — ready for ranch, equestrian, homestead, or retreat use.</p>' +
      '<p style="margin: 0;">Archaeological review and soils engineering already completed. Listed by Kelly Wiggins, eXp Realty.</p>' +
    '</div>' +
  '</div>' +
'</div>' +

'<div class="property-info-section">' +
  '<h4>✨ Why Rose Valley</h4>' +
  '<ul class="property-features-list">' +
    '<li><strong>National forest on every side</strong> — direct access to Los Padres trails, Rose Valley Falls, and the Sespe Wilderness</li>' +
    '<li><strong>Private inholding</strong> — one of the few deeded parcels in the valley (OS-160 country)</li>' +
    '<li><strong>Water + power independence</strong> — tested well and owned solar</li>' +
    '<li><strong>Creek frontage</strong> and abundant wildlife under dark, star-filled skies</li>' +
    '<li><strong>Due diligence head start</strong> — archaeology and soils work already done</li>' +
  '</ul>' +
'</div>' +

'<div class="property-info-section">' +
  '<h4>📐 Boundary Note</h4>' +
  '<div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 16px; border-radius: 8px; border-left: 4px solid #667eea;">' +
    '<div style="color: #555; line-height: 1.8; font-size: 14px;">' +
      '<p style="margin: 0;">The line shown is the county assessor\'s mapped parcel. Rose Valley sits in <strong>unsurveyed federal township land</strong>, so recorded lines here are protracted (mathematically projected) — the historic fencing on the ground differs from the mapped line by roughly 30–60 m in places, and this is true of every parcel in the valley. A licensed survey is the only way to fix the true corners — recommended as part of purchase due diligence (and a fair negotiation point).</p>' +
    '</div>' +
  '</div>' +
'</div>';

const ROSE_BOUNDARY = [
  {
    id: 'rose_boundary_1',
    coordinates: [[34.54597, -119.188434], [34.549431, -119.188461]],
    thickness: 10,
    gradientColors: ['#FFB74D', '#FFA726', '#FF9800', '#FB8C00'],
    glowColor: '#FF9800',
    description: 'East boundary along the forest edge (county parcel line)',
    name: 'East Boundary',
    length: '~1,265 ft',
    features: ['Los Padres National Forest beyond'],
    permanent: true,
    section: 'east'
  },
  {
    id: 'rose_boundary_2',
    coordinates: [[34.549431, -119.188461], [34.549369, -119.192837]],
    thickness: 10,
    gradientColors: ['#F48FB1', '#F06292', '#EC407A', '#E91E63'],
    glowColor: '#EC407A',
    description: 'North boundary (county parcel line)',
    name: 'North Boundary',
    length: '~1,315 ft',
    features: ['Mountain views toward the Sespe'],
    permanent: true,
    section: 'north'
  },
  {
    id: 'rose_boundary_3',
    coordinates: [[34.549369, -119.192837], [34.545915, -119.19281]],
    thickness: 10,
    gradientColors: ['#CE93D8', '#BA68C8', '#AB47BC', '#9C27B0'],
    glowColor: '#AB47BC',
    description: 'West boundary (county parcel line)',
    name: 'West Boundary',
    length: '~1,260 ft',
    features: ['Los Padres National Forest beyond'],
    permanent: true,
    section: 'west'
  },
  {
    id: 'rose_boundary_4',
    coordinates: [[34.545915, -119.19281], [34.54597, -119.188434]],
    thickness: 10,
    gradientColors: ['#81D4FA', '#4FC3F7', '#29B6F6', '#03A9F4'],
    glowColor: '#29B6F6',
    description: 'South boundary near Rose Valley Rd (county parcel line)',
    name: 'South Boundary',
    length: '~1,300 ft',
    features: ['Access from Rose Valley Rd'],
    permanent: true,
    section: 'south'
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
        '<h4>🌲 The Basecamp Vision</h4>' +
        '<p style="margin: 0 0 10px 0; line-height: 1.7; color: #444;">Forty acres alone inside the national forest: Rose Valley becomes the network&#39;s wilderness basecamp — a retreat outpost for trail journeys, star-filled ceremony nights and deep-quiet residencies, kept nearly as wild as we found it.</p>' +
        '<p style="margin: 0 0 10px 0; line-height: 1.7; color: #444;"><strong>Path:</strong> licensed boundary survey (the county fabric here is unsurveyed township land), then the offer. Asking price today: $810,000.</p>' +
      '</div>' +
 '';

export const ROSE_VALLEY_PROPERTY = {
  id: 'rose-valley',
  name: 'Rose Valley Property',
  shortLabel: '🌄 Rose Valley',
  labelChip: '🌄 Rose Valley Property',
  center: [34.547673, -119.190635],
  zoom: 16,
  footerTitle: '🌄 Rose Valley Property',
  footerInfo: ['40 Acres', 'For Sale — $810K', '7343 Rose Valley Rd', 'Rose Valley, Ojai'],
  cta: {
    heading: "Let's Talk About This Idea",
    paragraph: 'A 40-acre private inholding surrounded on all sides by Los Padres National Forest — wilderness sanctuary, water and power independence, and a due-diligence head start. Rose Valley is on the market and on our acquisition list.',
    contacts: [
      { name: 'Mark Pancis', email: 'markeduardpancis@gmail.com' },
      { name: 'Paul Muresan', email: 'paulmuresan77@gmail.com' }
    ],
    buttons: []
  },
  panel: { title: 'Rose Valley Property — 7343 Rose Valley Rd', html: ROSE_PANEL_HTML },
  status: {"today": {"badge": "\ud83c\udff7\ufe0f For Sale \u2014 $810,000", "rows": [["Listing", "MLS V1-35138"], ["Acreage", "40.016 ac \u00b7 OS-160 zoning"], ["Setting", "Private inholding surrounded by Los Padres National Forest"], ["Includes", "3bd/2ba home, owned solar, well, septic, creek, corrals"]], "note": "Today mode shows the listed property exactly as offered."}, "vision": {"badge": "\ud83c\udf32 Acquisition Target \u2014 Wilderness Basecamp", "rows": [["Role", "Retreat & wilderness basecamp node of the network"], ["Next steps", "Licensed survey + offer"], ["Why", "Four-corner forest inholding \u2014 irreplaceable setting"]], "note": "A quiet outpost in the network of communities: base for retreats, trail journeys and dark-sky nights."}},
  docs: [],
  visionPanel: { title: "Rose Valley \u2014 Wilderness Basecamp Vision", html: VISION_PANEL_HTML },
  boundary: ROSE_BOUNDARY,
  zones: []
};
