// Sulphur Mountain Eco-Village — property module for the multi-property map.
// 11962 Sulphur Mountain Rd, Upper Ojai, CA · ~10 acres · 18 project zones
// Zones + boundary extracted verbatim from SacredRebel/EcoVillage-map (V1
// production data). Photos load from that repo via raw.githubusercontent.com.

const SULPHUR_PANEL_HTML = '<div class="image-gallery-section" style="margin-bottom: 20px;">' +
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
          '<span class="property-detail-label">Total Acreage:</span>' +
          '<span class="property-detail-value">9.47 acres (marketed as 10 acres)</span>' +
        '</div>' +
        '<div class="property-detail-row">' +
          '<span class="property-detail-label">APN:</span>' +
          '<span class="property-detail-value">Ventura County, CA</span>' +
        '</div>' +
        '<div class="property-detail-row">' +
          '<span class="property-detail-label">Zoning:</span>' +
          '<span class="property-detail-value">Unique Upper Ojai Zoning (Residential, Agricultural, Community)</span>' +
        '</div>' +
        '<div class="property-detail-row">' +
          '<span class="property-detail-label">Location:</span>' +
          '<span class="property-detail-value">11962 Sulphur Mountain Road, Upper Ojai, CA</span>' +
        '</div>' +
      '</div>' +
      
      '<div class="property-info-section">' +
        '<h4>✨ Property Features</h4>' +
        '<ul class="property-features-list">' +
          '<li><strong>Valuation:</strong> Current value $1.5M | Projected ARV $6.9M+ (Phase 3 completion)</li>' +
          '<li><strong>Water Access:</strong> Active on-site well producing 17 GPM, connected to structures</li>' +
          '<li><strong>Power:</strong> Two live power lines currently connected</li>' +
          '<li><strong>Sewer:</strong> Main residence connected to city sewer system</li>' +
          '<li><strong>Views:</strong> Unobstructed panoramic views of Topa-Topa Mountains ("Ojai Pink Moment")</li>' +
        '</ul>' +
      '</div>' +
      
      '<div class="property-info-section">' +
        '<h4>📝 Additional Information</h4>' +
        '<div style="display: flex; flex-direction: column; gap: 16px;">' +
          
          '<div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 16px; border-radius: 8px; border-left: 4px solid #667eea;">' +
            '<div style="font-weight: 600; color: #667eea; margin-bottom: 10px; font-size: 14px;">🗺️ Property Layout</div>' +
            '<div style="color: #555; line-height: 1.8; font-size: 14px;">' +
              '<p style="margin: 0 0 10px 0;">The property is naturally divided into <strong>three strategic sections</strong>, each optimized for specific uses:</p>' +
              '<p style="margin: 0 0 6px 0; padding-left: 12px;"><span style="color: #667eea; font-weight: 600;">• Front Left Section:</span> Agriculture and operations hub</p>' +
              '<p style="margin: 0 0 6px 0; padding-left: 12px;"><span style="color: #667eea; font-weight: 600;">• Middle Section:</span> Livestock and community kitchen facilities</p>' +
              '<p style="margin: 0 0 0 0; padding-left: 12px;"><span style="color: #667eea; font-weight: 600;">• Right Hillside:</span> Guest lodging and event spaces</p>' +
            '</div>' +
          '</div>' +
          
          '<div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 16px; border-radius: 8px; border-left: 4px solid #4CAF50;">' +
            '<div style="font-weight: 600; color: #4CAF50; margin-bottom: 10px; font-size: 14px;">✅ Permitting & Development Status</div>' +
            '<div style="color: #555; line-height: 1.8; font-size: 14px;">' +
              '<p style="margin: 0 0 10px 0;">Permitting for the <strong>first three key structures</strong> is ready for submission.</p>' +
              '<p style="margin: 0;">The permitting process is anticipated to clear quickly, allowing construction to begin on schedule.</p>' +
            '</div>' +
          '</div>' +
          
          '<div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 16px; border-radius: 8px; border-left: 4px solid #FF9800;">' +
            '<div style="font-weight: 600; color: #FF9800; margin-bottom: 10px; font-size: 14px;">💰 Investment Overview</div>' +
            '<div style="color: #555; line-height: 1.8; font-size: 14px;">' +
              '<p style="margin: 0 0 10px 0;">The total phased development budget is approximately <strong style="color: #FF9800;">$3 Million</strong>.</p>' +
              '<p style="margin: 0;">This investment supports comprehensive regenerative development plans across all property sections.</p>' +
            '</div>' +
          '</div>' +
          
          '<div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 16px; border-radius: 8px; border-left: 4px solid #10B981;">' +
            '<div style="font-weight: 600; color: #10B981; margin-bottom: 10px; font-size: 14px;">🌱 Regenerative Agriculture & Lodging</div>' +
            '<div style="color: #555; line-height: 1.8; font-size: 14px;">' +
              '<p style="margin: 0 0 10px 0;"><strong>Guest Lodging:</strong> Plans include <strong>18-35+ unique units</strong> featuring 8-10 hillside cabins, 10-25+ creek-side glamping (tipis, yurts, safari tents), with phased expansion.</p>' +
              '<p style="margin: 0 0 10px 0;"><strong>Agriculture:</strong> <strong>10-acre property</strong> dedicated to regenerative farming with fruit orchards, vegetable gardens, and integrated permaculture systems.</p>' +
              '<p style="margin: 0;"><strong>Livestock & Nursery:</strong> Integrated permaculture system with beekeeping, mushroom cultivation, and plant nursery programs.</p>' +
            '</div>' +
          '</div>' +
          
        '</div>' +
      '</div>' +
      
      '<div class="property-info-section">' +
        '<h4>🔗 Project Links & Partners</h4>' +
        '<div style="display: flex; flex-direction: column; gap: 20px;">' +
          
          '<div>' +
            '<div style="font-weight: 600; color: #667eea; margin-bottom: 12px; font-size: 15px; display: flex; align-items: center; gap: 8px;">' +
              '<span style="font-size: 18px;">🏔️</span> Sulphur Mountain Projects' +
            '</div>' +
            '<div style="display: flex; flex-direction: column; gap: 10px;">' +
              '<a href="https://sulphurmountainroad.vercel.app/" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; transition: all 0.3s ease; font-size: 14px; font-weight: 500;">' +
                '<span style="font-size: 18px;">🌐</span>' +
                '<span>Sulphur Mountain Website</span>' +
                '<span style="margin-left: auto; font-size: 16px;">→</span>' +
              '</a>' +
              '<div style="display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%); color: #6c757d; border-radius: 8px; font-size: 14px; font-weight: 500;">' +
                '<span style="font-size: 18px;">🚀</span>' +
                '<span>Sulphur Onboarding Platform</span>' +
                '<span style="margin-left: auto; font-style: italic; font-size: 12px;">Coming Soon...</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          
          '<div style="border-top: 2px dashed #e9ecef; padding-top: 16px;">' +
            '<div style="font-weight: 600; color: #10B981; margin-bottom: 12px; font-size: 15px; display: flex; align-items: center; gap: 8px;">' +
              '<span style="font-size: 18px;">🤝</span> Partners' +
            '</div>' +
            '<div style="display: flex; flex-direction: column; gap: 10px;">' +
              '<a href="https://santa-maria.vercel.app/" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; text-decoration: none; border-radius: 8px; transition: all 0.3s ease; font-size: 14px; font-weight: 500;">' +
                '<span style="font-size: 18px;">🏝️</span>' +
                '<span>Santa Maria</span>' +
                '<span style="margin-left: auto; font-size: 16px;">→</span>' +
              '</a>' +
              '<a href="https://preview--lemuria-life.lovable.app/" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; text-decoration: none; border-radius: 8px; transition: all 0.3s ease; font-size: 14px; font-weight: 500;">' +
                '<span style="font-size: 18px;">🌺</span>' +
                '<span>Lemuria Life</span>' +
                '<span style="margin-left: auto; font-size: 16px;">→</span>' +
              '</a>' +
            '</div>' +
          '</div>' +
          
        '</div>' +
      '</div>';

const SULPHUR_BOUNDARY = [
  {
    id: 'boundary_line_1',
    coordinates: [[34.433576, -119.156878], [34.433578, -119.155856], [34.433580, -119.154834]],
    thickness: 10,
    gradientColors: ['#9C27B0', '#673AB7', '#3F51B5', '#2196F3'],
    glowColor: '#9C27B0',
    description: 'Eastern Boundary - Main Section',
    name: 'Eastern Property Line',
    length: '1,250 ft',
    features: ['Panoramic mountain views', 'Mature oak trees', 'Natural elevation'],
    permanent: true,
    section: 'east'
  },
  {
    id: 'boundary_line_2', 
    coordinates: [[34.433585, -119.154840], [34.433215, -119.154843], [34.432846, -119.154845]],
    thickness: 10,
    gradientColors: ['#2196F3', '#03A9F4', '#00BCD4', '#26C6DA'],
    glowColor: '#00BCD4',
    description: 'Southern Boundary - Section 1',
    name: 'South Property Line (East)',
    length: '580 ft',
    features: ['Gentle slope', 'Garden potential', 'Solar exposure'],
    permanent: true,
    section: 'south-east'
  },
  {
    id: 'boundary_line_3',
    coordinates: [[34.432855, -119.154845], [34.432857, -119.154885], [34.432859, -119.154925]],
    thickness: 10,
    gradientColors: ['#00BCD4', '#00ACC1', '#0097A7'],
    glowColor: '#00BCD4',
    description: 'Southern Corner Connection',
    name: 'South Corner Transition',
    length: '85 ft',
    features: ['Corner landmark', 'Property marker'],
    permanent: true,
    section: 'south-corner'
  },
  {
    id: 'boundary_line_4',
    coordinates: [[34.432855, -119.154920], [34.432370, -119.154912], [34.432185, -119.154908], [34.431886, -119.154904]],
    thickness: 10,
    gradientColors: ['#00BCD4', '#4CAF50', '#66BB6A', '#81C784'],
    glowColor: '#4CAF50',
    description: 'Southern Boundary - Section 2',
    name: 'South Property Line (West)',
    length: '750 ft',
    features: ['Flat terrain', 'Agricultural zone', 'Creek proximity'],
    permanent: true,
    section: 'south-west'
  },
  {
    id: 'boundary_line_5',
    coordinates: [[34.431886, -119.154893], [34.431890, -119.155854], [34.431894, -119.156814]], 
    thickness: 10,
    gradientColors: ['#4CAF50', '#8BC34A', '#CDDC39', '#D4E157'],
    glowColor: '#8BC34A',
    description: 'Western Boundary - Main Section',
    name: 'West Property Line',
    length: '1,420 ft',
    features: ['Seasonal creek', 'Riparian corridor', 'Wildlife habitat'],
    permanent: true,
    section: 'west'
  },
  {
    id: 'boundary_line_6',
    coordinates: [[34.431899, -119.156808], [34.432000, -119.156816], [34.432102, -119.156824]],
    thickness: 10,
    gradientColors: ['#CDDC39', '#C0CA33', '#AFB42B'],
    glowColor: '#CDDC39',
    description: 'Western Corner Connection',
    name: 'West Corner Transition',
    length: '180 ft',
    features: ['Creek crossing', 'Corner marker'],
    permanent: true,
    section: 'west-corner'
  },
  {
    id: 'boundary_line_7', 
    coordinates: [[34.432102, -119.156824], [34.432160, -119.157278], [34.432217, -119.157731]],
    thickness: 10,
    gradientColors: ['#CDDC39', '#FFEB3B', '#FDD835', '#FBC02D'],
    glowColor: '#FDD835',
    description: 'Northwestern Boundary - Section 1',
    name: 'Northwest Property Line',
    length: '680 ft',
    features: ['Creek valley', 'Natural amphitheater', 'Oak woodland'],
    permanent: true,
    section: 'northwest'
  },
  {
    id: 'boundary_line_8',
    coordinates: [[34.432222, -119.157726], [34.432293, -119.157742], [34.432363, -119.157758]],
    thickness: 10,
    gradientColors: ['#FDD835', '#F9A825', '#F57F17'],
    glowColor: '#FDD835',
    description: 'Northwestern Corner Connection',
    name: 'Northwest Corner Transition',
    length: '125 ft',
    features: ['Elevated viewpoint', 'Corner landmark'],
    permanent: true,
    section: 'northwest-corner'
  },
  {
    id: 'boundary_line_9',
    coordinates: [[34.432368, -119.157758], [34.432470, -119.157326], [34.432571, -119.156894]],
    thickness: 10,
    gradientColors: ['#FFC107', '#FFB300', '#FFA000', '#FF8F00'],
    glowColor: '#FFC107',
    description: 'Northern Boundary - Section 1',
    name: 'North Property Line (West)',
    length: '720 ft',
    features: ['Upper plateau', 'Mountain views', 'Ceremony sites'],
    permanent: true,
    section: 'north-west'
  },
  {
    id: 'boundary_line_10',
    coordinates: [[34.432576, -119.156899], [34.433078, -119.156889], [34.433580, -119.156878]],
    thickness: 10,
    gradientColors: ['#FF8F00', '#FF6F00', '#E65100', '#9C27B0'],
    glowColor: '#FF6F00',
    description: 'Northern Boundary - Section 2',
    name: 'North Property Line (East)',
    length: '780 ft',
    features: ['Ridge line', 'Sunset views', 'Highest elevation'],
    permanent: true,
    section: 'north-east'
  }
];

const SULPHUR_ZONES = [
  {
    id: "agricultural-hub",
    mode: "vision",
    name: "Agricultural Hub", 
    emoji: "🌾",
    position: [34.433478, -119.155982],
    polygon: [[34.4325, -119.1560], [34.4330, -119.1560], [34.4330, -119.1550], [34.4325, -119.1550]],
    type: "agriculture",
    budget: "$35,000 - $40,000",
    timeline: "Phase 1-3",
    monthlyRevenue: "Phase 2: $500+ | Phase 3: $2,000+",
    roi: "64% annual ROI",
    description: "Fruit tree propagation, extensive gardens, educational components, and organic nursery products.",
    features: [
      "Planning on planting 500+ fruit trees on the property - next 1-2 years",
      "Regenerative vegetable gardens (3+ acres)",
      "Herb gardens and medicinal plants",
      "Educational workshops and farm tours",
      "Compost, mycelium, mineral, wormfarm operations",
      "On-site nursery for plant propagation",
      "Gravity-fed irrigation systems"
    ],
    revenueStreams: [
      "Nursery products sale - online/offline: $500-$1,000/month",
      "Community Supported Agriculture program and products: $500-$1,500+/month",
      "Educational workshops: $1,500/month", 
      "Farm-to-table events: $3,000/month"
    ],
    developmentTimeline: [
      {
        phase: "Phase 1 (Months 1-3)",
        deliverables: "Move and set up garden and agriculture space with fencing, proper garden beds, and all mentioned features and infrastructure. Setting up sales channels - online/offline collaborations.",
        investment: "$10,000-$15,000",
        status: "Foundation and setup"
      },
      {
        phase: "Phase 2 (Months 4-6)",
        deliverables: "Start planting and growing food, compost operations. Starting first sales online/offline - nursery products.",
        investment: "~$5,000/month for expanding infrastructure",
        monthlyRevenue: "$500+",
        status: "Initial growth and sales"
      },
      {
        phase: "Phase 3 (Month 7+)",
        deliverables: "Harvesting products, systemized operations for products, maintaining whole agriculture infrastructure and products. Reinvesting part of profits for maintenance and improvements.",
        monthlyRevenue: "$2,000+/month",
        status: "Full production and maintenance"
      }
    ],
    regenerativeFeatures: [
      "Permaculture design principles",
      "Soil regeneration through composting",
      "Mycelium network enhancement",
      "Mineral supplementation programs",
      "Wormfarm composting systems",
      "Water conservation and rainwater harvesting",
      "Biodiversity enhancement"
    ]
  },
  {
    id: "main-residence",
    name: "Main Residence Compound",
    emoji: "🏠", 
    position: [34.433118, -119.155333],
    polygon: [[34.4330, -119.1555], [34.4335, -119.1555], [34.4335, -119.1545], [34.4330, -119.1545]],
    type: "residential",
    budget: "$420,000 - $700,000",
    timeline: "Phase 1-3 (16 months)",
    monthlyRevenue: "$25K-$30K (post-construction)",
    roi: "43-68% annual + ~$7.7M property increase",
    description: "4,000-5,000 sq ft modern eco-retreat center with bio-architecture, curved designs, and regenerative building materials - the operational hub of the EcoVillage.",
    features: [
      "4,000-5,000 sq ft modern retreat center with bio-architecture design",
      "5-6 bedrooms (3 main suites, 2 guest rooms), 6 bathrooms",
      "Main kitchen and spacious living areas",
      "High ceilings with open floor plan and ceremonial fire space",
      "Retreat amenities: infinity pool, hot tub, sauna",
      "Outdoor BBQ areas, entertainment decks, and green lawn",
      "Sacred geometry gardens and water features",
      "Panoramic mountain views throughout property",
      "Operational hub for EcoVillage management",
      "Executive hosting and high-end event capabilities"
    ],
    
    regenerativeFeatures: [
      "Bio-mimic architecture with curved and rounded structures",
      "Steel frame construction with fireproof materials",
      "Large glass windows for natural light optimization",
      "Earth cob styling and natural insulation",
      "Sustainable regenerative building materials",
      "Rainwater harvesting and greywater systems",
      "Solar energy integration with battery storage",
      "Green roofs and living walls",
      "Sacred geometrical positioning and design principles",
      "Elemental design with round shapes",
      "Energy-efficient passive cooling and heating systems",
      "Native landscaping practices"
    ],
    
    propertyValue: {
      current: "$1,500,000",
      appraisedPrefab: "$6,900,000",
      projectedCustom: "~$10,000,000",
      increase: "~$8,500,000",
      note: "Current value reflects land with existing structure to be demolished. Official appraisal for 4,000-5,000 sq ft prefab home with standard design. Projected custom eco-retreat with curved bio-architecture, steel frame, and regenerative systems commands premium market value."
    },
    
    revenueStreams: [
      "Retreats, Events & Private Gatherings: $5,000-$15,000+/month (post-construction)",
      "EcoVillage Operations Hub: Included in management"
    ],
    
    developmentTimeline: [
      {
        phase: "Phase 1 (Months 0-6): Demolition, Design & Permits",
        deliverables: "Demolish existing 1,400 sq ft structure and remove all debris. Complete architectural design for 4,000-5,000 sq ft eco-retreat with bio-architecture and curved steel frame. Secure all building permits and approvals. Clear and grade building site, establish construction access, and install temporary utilities for construction phase.",
        investment: "$75,000 (Demolition & Site Clearance), $45,000 (Architecture & Permits)",
        monthlyRevenue: "$0",
        status: "Currently underway"
      },
      {
        phase: "Phase 2 (Months 7-12): Foundation & Infrastructure",
        deliverables: "Install drainage systems and upgrade utilities infrastructure to support main residence. Pour foundation and structural supports per approved bio-architecture plans. Complete site readiness for main construction phase including staging areas and material delivery access.",
        investment: "$80,000",
        monthlyRevenue: "$0",
        status: "Begins after Phase 1 completion"
      },
      {
        phase: "Phase 3 (Months 13-24): Main Residence Construction",
        deliverables: "Build and expand main residence to 4,000-5,000 sq ft with steel frame, bio-architecture, and eco-design throughout. Modern sustainable construction using premium materials. Full build executed per approved architectural plans. Construction partner contributes materials and labor for proportional equity stake in property.",
        investment: "$1,300,000 (Partner equity contribution: materials + labor)",
        monthlyRevenue: "$5,000-$15,000+ (post-completion)",
        status: "Pending Phases 1 & 2"
      }
    ],
    
    projectedValue: {
      totalDevelopment: "~$1,500,000",
      postBuildValue: "$7,000,000-$10,000,000+",
      valueIncrease: "400-500%+ ROI",
      note: "Total investment: $120,000 (Phase 1) + $80,000 (Phase 2) + $1,300,000 (Phase 3 partner contribution). Comparable 5,000 sq ft prefab homes appraised at $6.9M+. Bio-architecture steel frame eco-design on 9.47 acres commands premium valuation. Subject to professional appraisal post-construction."
    }
  },
  {
    id: "community-hub",
    mode: "vision",
    name: "Community Hub",
    emoji: "🏛️",
    position: [34.432771, -119.155387],
    polygon: [[34.4320, -119.1555], [34.4325, -119.1555], [34.4325, -119.1545], [34.4320, -119.1545]],
    type: "community", 
    budget: "$20,000 - $30,000",
    timeline: "Phase 1-2 (3+ months)",
    monthlyRevenue: "$7K-$10K+",
    roi: "214-336% annual ROI",
    description: "Outdoor community hub centered around a restored 100+ year old fireplace kitchen, natural gathering spaces, and creek-side seating. Serves as the heart of community life with farm-to-table events, shared meal preparation, and amenities for residents, retreat guests, and visitors. Features outdoor kitchen facilities, community fridges, showers, and bathrooms integrated into the natural landscape.",
    features: [
      "Outdoor community kitchen with restored 100+ year old fireplace",
      "Historic BBQ station (repurposed firepit monument)",
      "Outdoor pizza oven and wood-fired cooking areas",
      "Open-air prep tables and cooking surfaces",
      "Natural seating areas around creek and oak trees",
      "Community showers and bathroom facilities",
      "Outdoor nature hangout spot with community library",
      "Children's play area and nursery space",
      "Community refrigerators and food storage",
      "Farm-to-table event preparation spaces",
      "Creek-side gathering and dining areas",
      "Fire pit and communal eating zones",
      "Shared cooking equipment and utensils",
      "Integration with on-site gardens and livestock"
    ],
    
    farmToTableProgramming: [
      "Farm-to-table cooking events with on-site produce and livestock",
      "Community meal preparation and shared dining experiences",
      "Membership-based meal programs and cooking workshops",
      "Guest kitchen access for Airbnb and retreat visitors",
      "Event and ceremony meal preparation headquarters",
      "Community fridges with designated storage for members"
    ],
    
    revenueStreams: [
      "Event hosting: $7,000/month",
      "Community meal memberships: $3,000/month",
      "Workshop facilitation: $2,000/month"
    ],
    
    developmentTimeline: [
      {
        phase: "Phase 1 (Months 0-3)",
        deliverables: "Restore and integrate 100+ year old fireplace into outdoor kitchen structure, build basic outdoor kitchen framework with cooking surfaces, install basic community seating around kitchen area, set up temporary/basic toilet and shower facilities, create initial pathways and gathering spaces, test kitchen functionality with small community events",
        investment: "$10,000-$15,000",
        monthlyRevenue: "$0",
        status: "Foundation and basic amenities"
      },
      {
        phase: "Phase 2 (Months 3+)",
        deliverables: "Beautify kitchen area with permanent structures and finishes, build long-term shower and bathroom facilities, expand creek-side seating and nature hangout areas, install community fridges and food storage, complete children's play area and outdoor library setup, ongoing improvements and aesthetic enhancements, launch full event and membership programs",
        investment: "$10,000-$15,000",
        monthlyRevenue: "$7,000-$10,000+",
        status: "Operational with continuous improvement"
      }
    ]
  },
  {
    id: "retreat-village",
    mode: "vision", 
    name: "Retreat Village",
    emoji: "🏡",
    position: [34.432173, -119.155628],
    polygon: [[34.4335, -119.1560], [34.4340, -119.1560], [34.4340, -119.1550], [34.4335, -119.1550]],
    type: "hospitality",
    budget: "P1: $70K-$80K | P2: $20K+ (flexible)",
    timeline: "Phase 1-3 (12-18 months)", 
    monthlyRevenue: "$24K-$35K (fully operational)",
    roi: "187-273% annual ROI",
    description: "Luxury eco-cabin retreat village nestled on the hillside with 8-10 individually designed cabins (150-300 sq ft each). A mix of 5 high-end retreat cabins and 5 residential cabins for land stewards and community members.\n\nEach cabin features cob construction with steel frame fireproof materials, individual bathhouses with spa amenities, meditation decks, and sacred hillside views. Self-sustainable systems power each cabin—rainwater collection, individual water tanks, solar power, and personal garden beds.\n\nHealing gardens, sacred paths, and quiet zones create a regenerative living community. Built as a proof-of-concept for eco-luxury cob housing and self-regenerative living, demonstrating a new model of sustainable retreat and residential integration.\n\nDesigned for both high-end retreat bookings and long-term residential stewardship, with flexible contractor partnership models allowing builders to showcase cabin designs and share revenue through guest bookings.",
    features: [
      "8-10 luxury eco-cabins (150-300 sq ft each)",
      "Individual bathhouses with spa amenities (hot tubs, ice baths)",
      "Meditation decks and quiet zones per cabin",
      "Sacred paths and hillside views",
      "Healing gardens with individual garden beds",
      "Self-sustainable utilities (solar, water tanks, rainwater collection)",
      "Cob construction with steel frame fireproof materials",
      "High ceilings and large windows with organic design",
      "Stonework masonry and creative handwork",
      "Integration with ceremonial spaces and sacred forest circles"
    ],
    
    regenerativeDesign: [
      "Regenerative design philosophy: proof-of-concept for self-regenerative living",
      "Eco-cob natural wall construction with stone masonry",
      "Steel frame fireproof materials ensuring safety and durability",
      "Self-sustainable utility systems: solar power, rainwater collection, water tanks",
      "Individual garden beds and permaculture systems per cabin",
      "Organic materials and organic design flow throughout",
      "High ceilings and large windows creating light and connection to nature",
      "Handmade, artisanal construction showcasing creative craftsmanship"
    ],
    
    marketContext: "The global retreat and wellness industry is experiencing rapid growth, with increasing demand for authentic eco-retreats and regenerative living communities. Communal living models and co-ownership opportunities are trending among conscious travelers and land stewards seeking meaningful community connection. Eco-luxury cob housing and self-sustainable cabin villages represent the future of retreat accommodations.",
    
    revenueStreams: [
      "High-End Retreat Cabins (5 units):",
      "  • Retreat bookings: $12,000-$15,000/month",
      "  • Wellness retreat packages: $4,000-$6,000/month",
      "  • Wedding and ceremony events: $2,000-$3,000/month",
      "Residential Cabins (5 units):",
      "  • Private cabin rentals: $3,000-$5,000/month",
      "  • Land steward memberships: $1,000-$2,000/month",
      "Contractor Partnership Model:",
      "  • Contractor revenue-share (Airbnb/bookings): $2,000-$4,000/month",
      "  • Contractors supply materials and labor; we revenue-share guest bookings",
      "  • Flexible partnership deals with builders and designers",
      "Total Monthly Revenue: $24,000-$35,000"
    ],
    
    developmentTimeline: [
      {
        phase: "Phase 1 (Months 0-6)",
        deliverables: "Land Work: Create main hillside road and 10-12 cabin flat spots ($50K). Utilities: Extend water system and electrical distribution to hillside ($15K-$20K). Sacred Spaces: Establish distributed meditation areas and forest circles ($5K-$10K). Complete permitting and site planning.",
        investment: "$70,000-$80,000",
        status: "Hillside infrastructure ready for cabin development"
      },
      {
        phase: "Phase 2 (Months 6-12+)",
        deliverables: "Invite contractor partners with revenue-share agreements. Contractors build showcase cabins (materials + labor supplied by contractors). Property members/stewards build residential cabins. Establish revenue-share model through Airbnb/booking platforms. Complete first 3-5 cabins. Begin wellness amenities (spa, meditation decks).",
        investment: "$20,000+ (flexible, contractor-supplied)",
        status: "Cabins under construction, partnerships active"
      },
      {
        phase: "Phase 3 (Months 12+)",
        deliverables: "Complete remaining cabins as contractors finish. Launch full retreat booking operations. Begin weekend rental and event hosting. Establish wellness programs and ceremonies. Activate healing gardens and sacred paths. Full integration with McQueen's Garage events and Ceremonial Infrastructure.",
        investment: "Ongoing as cabins complete (contractor-funded)",
        status: "Full retreat village operational and revenue-generating"
      }
    ]
  },
  {
    id: "infrastructure",
    mode: "vision",
    name: "Infrastructure & Utilities",
    emoji: "⚡",
    position: [34.432386, -119.155966],
    polygon: [[34.4315, -119.1560], [34.4320, -119.1560], [34.4320, -119.1550], [34.4315, -119.1550]],
    type: "infrastructure",
    budget: "P1: $62K-$77K | P2: $40K-$60K | P3: $40K-$50K",
    timeline: "Phase 1-3 (18 months)", 
    monthlyRevenue: "Enables $75K-$92.5K monthly revenue",
    roi: "5.3:1 to 6.5:1 revenue-to-cost ratio",
    description: "Strategic infrastructure and utilities foundation enabling all village development. Phased water system upgrades (maintenance, creek extension, hillside expansion), electric reactivation with solar integration, hillside road development, and distributed composting toilet network.\n\nEach utility system is strategically phased to support specific projects—water extends to glamping and community hub, electric powers event venues and community spaces, roads enable hillside village construction, and sewage systems serve each phase.\n\nThis infrastructure-first approach ensures reliable utilities while minimizing costs through strategic phasing and natural material solutions.",
    features: [
      "Solar array and battery storage systems (phased expansion)",
      "Well water system with filtration and upgrades",
      "Water distribution to creek-side glamping sites",
      "Water extension to hillside for retreat village",
      "Composting toilet network (5 distributed units, Phase 1)",
      "Greywater treatment and recycling systems",
      "Hillside road network with 10+ cabin flat spots",
      "Main residence landscaping and access roads",
      "Electric reactivation and distribution system",
      "Solar panel integration with battery backup",
      "Septic and sewage systems for hillside village",
      "Pathways and utility corridors throughout property"
    ],
    
    utilitySystemsBreakdown: [
      {
        system: "Water System",
        phase1: "Current maintenance and upgrade: $5,000",
        phase1b: "Creek-side extension for glamping: $10,000-$15,000",
        phase2: "Hillside extension for retreat village: $15,000-$20,000",
        total: "$30,000-$40,000"
      },
      {
        system: "Electric System",
        phase1: "Reactivation and maintenance: $2,000 + $500/month",
        phase2: "Solar integration with battery storage: $5,000-$10,000",
        phase3: "Full hillside power system: $40,000-$50,000",
        total: "$47,000-$62,000"
      },
      {
        system: "Road Infrastructure",
        phase1: "Hillside road and land work (10+ cabin spots): $50,000",
        total: "$50,000"
      },
      {
        system: "Sewage System",
        phase1: "Composting toilet network (5 units): $5,000-$10,000",
        phase2: "Hillside septic and plumbing: $20,000-$30,000",
        total: "$25,000-$40,000"
      }
    ],
    
    marketContext: "Independent and solar-powered infrastructure systems are increasingly essential for rural properties and eco-tourism destinations. Solar integration with battery storage reduces long-term operational costs while supporting the growing demand for sustainable, off-grid capable retreats and events. Composting toilet systems and water recycling align with modern sustainability expectations, reducing environmental impact while lowering infrastructure maintenance costs.",
    
    revenueStreams: [
      "Infrastructure enables all property revenue streams",
      "Solar excess energy potential grid-tie revenue ($500-$1,000/month future)",
      "Water system supports glamping ($240K-$360K annual)",
      "Water system supports community hub ($84K-$120K annual)",
      "Electric system enables event venue ($180K-$300K annual)",
      "Roads enable retreat village ($222K-$330K annual)",
      "Sewage systems enable all guest accommodations",
      "Note: Infrastructure is cost center enabling $900K-$1.1M annual revenue"
    ],
    
    infrastructureEssentials: [
      "Phased utility expansion tied to project development timelines",
      "Natural material construction (cob composting toilets) for cost savings",
      "Solar and battery systems reducing grid dependency and long-term costs",
      "Water recycling and greywater treatment for sustainability",
      "Distributed sanitation network avoiding centralized sewage costs",
      "Strategic road development enabling cabin and village expansion",
      "Maintenance-first approach with $500-$1,000/month operational budget"
    ],
    
    developmentTimeline: [
      {
        phase: "Phase 1 (Months 0-6)",
        deliverables: "Water: Current system maintenance and upgrade ($5K), creek-side extension for glamping ($10K-$15K). Electric: Reactivation ($2K), ongoing maintenance ($500/month). Roads: Hillside development with 10+ cabin flat spots ($50K). Sewage: Build 5 distributed composting toilets ($5K-$10K).",
        investment: "$62,000-$77,000",
        status: "Foundation utilities and hillside access"
      },
      {
        phase: "Phase 2 (Months 6-12)",
        deliverables: "Water: Extend to hillside for retreat village ($15K-$20K). Electric: Install solar panels with battery storage ($5K-$10K). Sewage: Develop hillside septic and plumbing infrastructure ($20K-$30K).",
        investment: "$40,000-$60,000",
        status: "Expansion utilities for village development"
      },
      {
        phase: "Phase 3 (Months 12-18)",
        deliverables: "Electric: Create comprehensive power system for hillside village, event venue, music studio, and ceremonial infrastructure ($40K-$50K). All systems fully operational and integrated.",
        investment: "$40,000-$50,000",
        status: "Full property electrification and operational"
      }
    ]
  },
  {
    id: "mcqueens-garage",
    name: "McQueen's Garage",
    visionName: "McQueen's Garage & Creative",
    emoji: "🎭",
    position: [34.432549, -119.155279],
    polygon: [[34.4340, -119.1555], [34.4345, -119.1555], [34.4345, -119.1545], [34.4340, -119.1545]],
    type: "creative",
    budget: "$150,000 - $300,000",
    timeline: "Phase 1-3 (18 months)",
    monthlyRevenue: "$15K-$25K+",
    roi: "87-97% annual ROI",
    description: "The legendary 3,200 sq ft warehouse from the Steve McQueen era — today it is simply the garage: solid, storied, and waiting. The vision transforms it into the creative ceremony and gathering space described on the Vision card.",
    visionDescription: "Premium music recording studio and live event venue featuring a professional stage, outdoor ceremony space, and state-of-the-art recording facilities. The warehouse transformation includes performance areas for live music festivals, kirtans, and high-end retreats, with VIP back-end rooms, recording booths, and overnight accommodations for visiting artists and retreat guests. Positioned as Ojai's destination for intimate concerts, ceremony gatherings, and live music recordings.",
    features: [
      "3,200 sq ft historic warehouse / garage",
      "Steve McQueen provenance",
      "Sound structure, ready for conversion",
      "Becomes the creative & ceremony gathering space in the vision"
    ],
    visionFeatures: [
      "Professional music recording studio with isolation booths",
      "Live performance stage with professional sound and lighting",
      "Outdoor ceremony space for festivals and gatherings",
      "VIP back-end rooms for artists and retreat facilitators",
      "Multiple recording booths and production spaces",
      "Event venue for 50-150 person capacity gatherings",
      "Gallery-style performance area for intimate concerts",
      "Green rooms and artist preparation spaces",
      "Overnight accommodations for visiting musicians and guests",
      "Full warehouse transformation with acoustic treatment",
      "Equipment storage and production management areas",
      "Integration with glamping village for high-ticket retreats"
    ],
    
    venueTransformation: [
      "Solar energy integration for sustainable venue operations",
      "Rainwater harvesting for landscape and facility use",
      "Full warehouse insulation and climate control systems",
      "Sustainable building materials with high energy efficiency",
      "Professional stage with modular design for multiple event types",
      "VIP rooms and green rooms for artists and facilitators",
      "Recording booths with acoustic isolation and treatment",
      "Overnight guest accommodations for visiting musicians and retreat leaders"
    ],
    
    marketContext: "Ojai has established itself as a cultural and spiritual hub with a thriving festival scene including the renowned Ojai Music Festival, cacao ceremonies, kirtan gatherings, and wellness retreats. The demand for intimate concert venues, ceremony spaces, and retreat facilities continues to grow as Ojai attracts artists, spiritual practitioners, and conscious event organizers seeking authentic gathering spaces. McQueen's Garage fills a unique niche as a professional recording venue with live event capabilities, serving both the local community and visiting musicians drawn to Ojai's creative energy.",
    
    revenueStreams: [
      "Live Events & Performances:",
      "  • Music festivals and concerts: $5,000-$8,000/month",
      "  • Kirtans and spiritual ceremonies: $2,000-$3,000/month",
      "  • High-end retreat venue rental: $3,000-$5,000/month",
      "  • Weddings and private ceremonies: $2,000-$4,000/month",
      "Studio & Recording Services:",
      "  • Music recording studio sessions: $2,500-$4,000/month",
      "  • Live recording packages: $1,500-$2,500/month",
      "  • Production space rentals: $1,000-$2,000/month",
      "Overnight & VIP Services:",
      "  • Artist overnight accommodations: $800-$1,200/month",
      "  • VIP retreat packages: $1,500-$2,500/month"
    ],
    
    developmentTimeline: [
      {
        phase: "Phase 1 (Months 0-6)",
        deliverables: "Use warehouse for equipment and material storage, workshop space for ongoing construction projects, minimal investment in basic organization and shelving, assess structural integrity and remodel requirements, begin conceptual design for venue transformation",
        investment: "$5,000-$10,000",
        monthlyRevenue: "$0",
        status: "Storage and workshop facility"
      },
      {
        phase: "Phase 2 (Months 6-12)",
        deliverables: "Hire architect for warehouse-to-venue conversion, design recording studio layout and acoustic treatment, create stage and ceremony space plans, submit permits for commercial event venue use, engineering for electrical/HVAC/soundproofing, finalize VIP rooms and recording booth layouts, secure necessary event venue licenses",
        investment: "$25,000-$50,000",
        monthlyRevenue: "$0",
        status: "Permitting and design development"
      },
      {
        phase: "Phase 3 (Months 12-18)",
        deliverables: "Complete insulation and climate control, build professional recording studio and isolation booths, install performance stage with sound/lighting, create outdoor ceremony space with landscaping, construct VIP rooms and green rooms, acoustic treatment and soundproofing, install recording and performance equipment, furnish artist accommodations, final inspections and licensing, launch with inaugural festival event",
        investment: "$120,000-$240,000",
        monthlyRevenue: "$15,000-$25,000+",
        status: "Operational high-end event and recording venue"
      }
    ]
  },
  {
    id: "ceremonial-infrastructure",
    mode: "vision",
    name: "Ceremonial Infrastructure", 
    emoji: "🔮",
    position: [34.432501, -119.155582],
    polygon: [[34.4325, -119.1565], [34.4330, -119.1565], [34.4330, -119.1555], [34.4325, -119.1555]],
    type: "ceremonial",
    budget: "$55,000 - $120,000",
    timeline: "Phase 1-3 (24 months)",
    monthlyRevenue: "Integrated with McQueen's Garage ($15K-$25K+)",
    roi: "Integrated with warehouse (87-97% annual)",
    description: "Main ceremonial infrastructure featuring a natural stone and earthen kiva with sacred fire circle, positioned directly in front of McQueen's Garage to integrate with live events, ceremonies, and retreat programming. The heart of all ceremonial activities including fire circles, drum circles, spiritual retreats, and community gatherings. Additionally, multiple sacred spaces and meditation areas are distributed throughout the property—forest circles, quiet reflection spots, crystal grids, and nature connection zones—creating a network of ceremonial infrastructure that supports ongoing spiritual practices without disrupting future construction phases.",
    features: [
      "Natural stone and earthen kiva with sacred fire circle and seating",
      "Main ceremonial space positioned in front of McQueen's Garage",
      "Prayer gardens and meditation spaces throughout property",
      "Sweat lodge facilities for purification ceremonies",
      "Ice bath stations for cold immersion and purification",
      "Multiple sacred fire circles distributed across land",
      "Meditation spaces and quiet reflection areas in nature",
      "Labyrinth and walking meditation paths",
      "Crystal gardens and energy grids",
      "Forest ceremony circles for intimate gatherings",
      "Drum circle and community gathering areas",
      "Integration with event venue for large ceremonies and retreats"
    ],
    
    sacredSpaceElements: [
      "Sacred fire circles with elemental design and ancestral honoring",
      "Crystal grids and energy pathways woven through forest trails",
      "Kiva construction using traditional earthen and stone techniques",
      "Sacred forest circles integrated with native oak groves",
      "Yoga decks and movement spaces positioned at natural vortex points",
      "Nature meditation alcoves with natural stone seating",
      "Ceremonial pathways connecting all sacred spaces across property"
    ],
    
    marketContext: "The ceremonial infrastructure works in tandem with McQueen's Garage event venue to create Ojai's premier destination for spiritual gatherings, retreat programming, and conscious celebrations. The combination of indoor performance space and outdoor sacred kiva allows for seamless ceremony-to-concert experiences, multi-day retreat programming, and festival-style gatherings. This integrated model meets the growing demand for authentic ceremonial venues that blend traditional sacred practices with modern event production capabilities.",
    
    revenueStreams: [
      "Integrated with McQueen's Garage event venue revenue",
      "Ceremonies and retreats use both warehouse and ceremonial spaces",
      "Fire circles and drum circles included in event packages",
      "Kiva ceremonies complement indoor performances",
      "Ice baths and sweat lodges enhance retreat offerings",
      "Combined venue capacity increases event value and pricing",
      "Note: Revenue reflected in McQueen's Garage projections ($15K-$25K+/month)"
    ],
    
    developmentTimeline: [
      {
        phase: "Phase 1 (Months 0+)",
        deliverables: "Create forest ceremony circles in undeveloped areas, establish meditation spaces and quiet reflection areas, install small fire circles and gathering spots, set up sweat lodge and ice bath facilities, plant crystal grids and sacred paths, build prayer gardens and nature altars, develop walking meditation paths away from construction zones, all spaces positioned strategically to avoid disruption",
        investment: "$5,000-$20,000+",
        monthlyRevenue: "Integrated with retreat operations",
        status: "Ongoing creation of distributed sacred network"
      },
      {
        phase: "Phase 2 (Months 6-18)",
        deliverables: "Design natural stone and earthen kiva layout, plan integration with McQueen's Garage outdoor space, assess sacred fire circle and seating requirements, coordinate with warehouse completion timeline, prepare materials and traditional building methods, continue maintaining and expanding Phase 1 spaces",
        investment: "Included in planning/coordination",
        monthlyRevenue: "Phase 1 spaces operational",
        status: "Design and coordination phase"
      },
      {
        phase: "Phase 3 (Months 18-24)",
        deliverables: "Construct natural stone and earthen kiva, install sacred fire circle with permanent seating, create main drum circle and gathering area, integrate with McQueen's Garage outdoor ceremony space, professional landscaping connecting warehouse to kiva, complete labyrinth and crystal gardens, final touches on all distributed sacred spaces, grand opening ceremony with first major retreat",
        investment: "$50,000-$100,000",
        monthlyRevenue: "Fully operational, enhancing warehouse event revenue",
        status: "Primary ceremonial infrastructure complete"
      }
    ]
  },
  {
    id: "wellness-facilities",
    name: "Storage Structures",
    visionName: "Wellness & Spa Facilities",
    emoji: "🧘",
    position: [34.432930, -119.155062],
    polygon: [[34.4330, -119.1565], [34.4335, -119.1565], [34.4335, -119.1555], [34.4330, -119.1555]],
    type: "wellness", 
    budget: "$65,000 - $100,000",
    timeline: "Phase 1-3 (12+ months)",
    monthlyRevenue: "$10K-$15K (post-launch)",
    roi: "87-131% annual ROI",
    description: "Today these are storage structures — practical buildings holding equipment and materials for the property. In the vision this spot becomes the Wellness & Spa Facilities.",
    visionDescription: "800 sq ft integrated wellness center and spa facility connecting three existing structures across multiple levels into one unified ADU. Features dedicated yoga studio, fitness center, healing modalities rooms, and oak tree deck for outdoor wellness practices. Serves retreat guests, community members, and monthly wellness memberships through workshops, healing sessions, and regenerative wellness programming.",
    features: [
      "Existing structures used for storage",
      "Equipment and materials for property operations",
      "Site of the future Wellness & Spa Facilities"
    ],
    visionFeatures: [
      "800 sq ft connected ADU spanning 3 levels",
      "Dedicated yoga and movement studio",
      "Fitness center with workout equipment area",
      "Oak tree deck for outdoor yoga and creative movement",
      "Stone sauna with infrared and traditional heat",
      "Cold plunge pools for contrast therapy",
      "Red light therapy and crystal healing rooms",
      "Private massage and bodywork suites",
      "Sound healing and meditation rooms",
      "Wellness consultation spaces",
      "Integration with retreat and event programming"
    ],
    
    wellnessAmenities: [
      "Yoga studio with natural light and mountain views",
      "Workout area with functional fitness equipment",
      "Stone sauna (traditional and infrared options)",
      "Cold plunge pools for contrast therapy and recovery",
      "Red light therapy rooms for cellular rejuvenation",
      "Crystal healing rooms with sacred geometry",
      "Private massage and bodywork treatment suites",
      "Sound healing rooms with acoustic optimization",
      "Meditation spaces and quiet zones",
      "Herbal tea lounge and wellness consultation area",
      "Outdoor calisthenics and movement area",
      "Workshop and group healing spaces",
      "Collaborator treatment rooms for visiting healers",
      "Integration with on-site gardens for herbal wellness"
    ],
    
    membershipTiers: [
      {
        name: "Basic Wellness",
        price: "$20-$30/month",
        benefits: "Access to yoga studio and gym space, community yoga classes (weekly), open hours use of fitness equipment"
      },
      {
        name: "Enhanced Wellness",
        price: "$50/month",
        benefits: "Everything in Basic + 1 sauna session per week, 1 cold plunge session per week, discounted workshop rates"
      },
      {
        name: "Premium Wellness",
        price: "$100/month",
        benefits: "Everything in Enhanced + unlimited sauna & cold plunge access, 1 red light therapy session per month, priority workshop booking, 10% discount on healing treatments"
      },
      {
        name: "EcoVillage All-Access",
        price: "$150/month",
        benefits: "Everything in Premium Wellness + access to all property events, event discounts, retreat package discounts"
      }
    ],
    
    revenueModel: {
      membershipRevenue: "$3,000/month (Year 1+)",
      workshopRevenue: "$2,700/month (4-6 workshops/month)",
      collaboratorRevenue: "$1,680/month (healer partnerships at 30-40% revenue share)",
      spaServices: "$900/month (private sessions)",
      retreatAddOns: "$1,500-$2,500/month (guest amenities)",
      totalYear1: "$9,780-$11,780/month",
      projectedYear2_3: "$12,000-$18,000/month (50-100 members, increased programming)",
      note: "Membership growth expected 1+ years after structure remodeling and launch"
    },
    
    developmentTimeline: [
      {
        phase: "Phase 1 (Months 0-6)",
        deliverables: "Clean up existing 3 structures for temporary storage use, survey and assess structural integrity, hire architect for 800 sq ft ADU design connecting structures, obtain permits for ADU conversion and multi-level connection, finalize plans for deck on top of A-frame structure, engineering assessments for connecting structures, design oak tree deck integration",
        investment: "$5,000-$10,000",
        monthlyRevenue: "$0",
        status: "Planning, permitting & storage phase"
      },
      {
        phase: "Phase 2 (Months 6-12)",
        deliverables: "Foundation work and structural reinforcement, connect all 3 structures into unified 800 sq ft space, renovate into envisioned wellness center layout, install walls/insulation/main structural elements, build oak tree deck on top of lower A-frame structure, rough plumbing and electrical for sauna/cold plunge, install windows/doors/weatherproofing, create multi-level access between structures",
        investment: "$50,000-$70,000",
        monthlyRevenue: "$0",
        status: "Active construction & renovation (side project)"
      },
      {
        phase: "Phase 3 (Months 12+)",
        deliverables: "Interior finishes and wellness amenity installation, sauna/cold plunge/red light therapy setup, yoga studio flooring/mirrors/equipment, fitness equipment installation, soundproofing for healing rooms, launch membership programs and workshop schedule, partner with healers and wellness practitioners, market to retreat guests and community, full operational wellness center and ADU",
        investment: "$10,000-$20,000",
        monthlyRevenue: "$10,000-$15,000",
        status: "Operational wellness center with memberships & workshops"
      }
    ]
  },
  {
    id: "mushroom-cultivation",
    mode: "vision",
    name: "Mushroom Cultivation",
    emoji: "🍄",
    position: [34.433474, -119.156218],
    polygon: [[34.4335, -119.1565], [34.4340, -119.1565], [34.4340, -119.1555], [34.4335, -119.1555]],
    type: "agriculture",
    budget: "$2,000-$6,000 (Phase 1-2 launch)", 
    timeline: "Phases 1-3 (Months 0-6+ ramp)",
    monthlyRevenue: "$29,700 per flush (4-week cycles)",
    roi: "288% annual ROI",
    description: "Commercial mushroom production facility that can operate as an on-site vehicle, mobile commercial unit, or local regenerative supply hub. Multiple growing environments support fresh culinary mushrooms, medicinal extracts, and value-added products for farm-to-table partners, wellness clients, and in-house use across the EcoVillage.",
    features: [
      "Climate-controlled growing rooms",
      "Substrate preparation and composting area", 
      "Multiple mushroom varieties (shiitake, oyster, lion's mane)",
      "Value-added processing kitchen",
      "Packaging and distribution center",
      "Educational tours and workshops",
      "Research and development lab"
    ],
    revenueStreams: [
      "Revenue per flush: $29,700 (4-week cycles)",
      "Annual production: 1,980 lbs/flush × 13 flushes = 25,740 lbs/year",
      "Market price: $15/lb",
      "Annual gross revenue: $386,100",
      "Annual net profit: $300,150 (after operational costs)",
      "ROI: 288% annually"
    ],
    smartCultivationSystems: [
      "Solar-backed microgrid with battery storage powering sealed grow environments",
      "Automated HVAC, humidity, and CO₂ monitoring for precision harvest cycles",
      "Rain and greywater harvesting loops for substrate hydration and sanitation",
      "Modular trellis racks and mobile grow pods enabling rapid expansion",
      "Chef and reseller collaboration program minimizing waste and driving product development"
    ],
    developmentTimeline: [
      {
        phase: "Phase 1 (Months 1-2)",
        deliverables: "Site prep and deal negotiations happen in parallel: Clear and grade site, improve access, prep utility tie-ins, ready pads for trailer delivery, while simultaneously finalizing collaborator agreements.",
        investment: "$1,000-$2,000",
        status: "Site prepared and partnerships secured"
      },
      {
        phase: "Phase 2 (Month 3)",
        deliverables: "Container delivery and setup: Schedule trailer drop-off, connect power/water, stage substrate systems, and train core team. Setup takes 1-2 weeks.",
        investment: "$1,000-$4,000",
        status: "Infrastructure installed and ready for production"
      },
      {
        phase: "Phase 3 (Months 4-6+)",
        deliverables: "Install $149K turnkey system (2 production units), launch cultivation cycles, begin fresh mushroom deliveries at 1,980 lbs/flush, produce tinctures and dried blends, expand wholesale and farm-to-table partnerships.",
        investment: "$149,000 (turnkey system) + operational capital",
        status: "Active cultivation with $29,700 revenue per flush (4-week cycles), $386,100 annual gross"
      }
    ],
    marketAnalysis: "Functional and culinary mushrooms continue to surge in demand for immunity, cognition, gut health, and culinary innovation. Supplying local restaurants, wellness practitioners, and farm-to-table markets with fresh lion's mane, shiitake, and oyster mushrooms creates premium, regenerative revenue while value-added tinctures and powders unlock e-commerce channels. Educational workshops deepen community wellness and establish loyal customers, while onsite production recycles agricultural byproducts and reinforces EcoVillage food security."
  },
  {
    id: "beekeeping-program",
    mode: "vision",
    name: "Beekeeping & Honey Production",
    emoji: "🐝",
    position: [34.433477, -119.155820],
    polygon: [[34.4320, -119.1565], [34.4325, -119.1565], [34.4325, -119.1555], [34.4320, -119.1555]],
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
    id: "events-gatherings-hub",
    mode: "vision",
    name: "Events & Gatherings Hub",
    emoji: "🎪",
    position: [34.433394, -119.155065],
    polygon: [[34.4335, -119.1548], [34.4340, -119.1548], [34.4340, -119.1543], [34.4335, -119.1543]],
    type: "events",
    budget: "$20,000 - $30,000",
    timeline: "Phase 1-3 (12+ months)",
    monthlyRevenue: "$4.5K-$9K (P1) → $11K-$22K (P2) → $27K-$41K (P3)",
    roi: "680% annual ROI",
    description: "Strategic events and gatherings infrastructure designed as a major revenue hub for retreats, ceremonies, festivals, workshops, and collaborative gatherings—central to community ethos and diversified income streams.",
    
    venues: [
      {
        name: "McQueen's Garage - Hybrid Event Venue",
        size: "3,200 sq. ft. steel-frame warehouse",
        location: "Right Hillside Section, end of property",
        uses: "Retreats, sound journeys, ceremonies, music performances, private dinners, seasonal festivals",
        features: "Hybrid indoor-outdoor flow, creekside communal kitchen access, ceremonial area proximity",
        revenue: "$8,000/month (from Month 14)"
      },
      {
        name: "Main Residence Compound",
        size: "5,000–7,200 sq. ft. + green lawn/open yard",
        location: "Central property hub",
        uses: "Executive hosting, retreat operations, immersive experiences, VIP residencies",
        features: "Vintage pool structure, spacious grounds for communal gatherings",
        revenue: "Included in retreat packages"
      },
      {
        name: "Sacred Ceremonial Zones",
        location: "Throughout property under mature oak trees",
        uses: "Purification, healing, bonding, sound healing, breathwork, movement, sacred circles",
        features: "Full-scale ceremonial kiva, sweat lodges, sacred fire circles, ritual zones",
        revenue: "$4,000/month (from Month 20)"
      },
      {
        name: "Community Zones",
        location: "Creekside and shaded areas",
        uses: "Communal meals, culinary workshops, spontaneous interaction, play",
        features: "Shaded communal kitchen, creekside dining with long tables and benches",
        revenue: "Supports overall event revenue"
      }
    ],
    
    eventTypes: [
      {
        format: "Weekend Retreats",
        capacity: "15-40 people",
        frequency: "Monthly",
        revenue: "Ticketed with lodging packages",
        phase: "Phase 2+"
      },
      {
        format: "Ceremonies (Cacao, Full Moon)",
        capacity: "10-30 people",
        frequency: "Bi-weekly",
        revenue: "Pay-per-ceremony",
        phase: "Phase 1+"
      },
      {
        format: "Festivals",
        capacity: "50-150 attendees",
        frequency: "Quarterly",
        revenue: "Entry fee + vendor fees",
        phase: "Phase 2+"
      },
      {
        format: "Workshops & Classes",
        capacity: "15-30 attendees",
        frequency: "Weekly/Regular",
        revenue: "Ticketed sessions (yoga, breathwork, permaculture, natural building, sacred art, dance)",
        phase: "Phase 1 (from Month 6)"
      },
      {
        format: "Farm-to-Table Dinners",
        capacity: "Varies",
        frequency: "Regular",
        revenue: "Ticketed dinners with farm produce",
        phase: "Phase 2 (from Month 16)"
      },
      {
        format: "Private Event Rentals",
        capacity: "Varies",
        frequency: "Ad hoc",
        revenue: "Site fees (weddings, private functions)",
        phase: "Phase 2+"
      }
    ],
    
    features: [
      "Multiple dedicated event venues across property",
      "Sacred ceremonial zones with kivas and fire circles",
      "Community kitchen and creekside dining areas",
      "Capacity for 50-500+ attendees depending on event type",
      "Weekly ceremonies, bi-weekly workshops, quarterly festivals",
      "Weekly workshops in yoga, breathwork, permaculture, art",
      "Farm-to-table dinner series with on-site produce",
      "Private event rental opportunities (weddings, gatherings)",
      "Educational partnerships and workshop monetization",
      "Virtual events via 3D digital twin platform (Coming Soon)",
      "Experiential onboarding for community members",
      "Event collaboration with wellness operators"
    ],
    
    regenerativeFeatures: [
      "Organic Composting Programs - All event waste composted on-site, participants learn composting practices",
      "Regenerative Building Workshops - Natural building techniques integrated into event programming (cob, earthbag, timber framing)",
      "Land Stewardship Events - Work-exchange events where participants help with property regeneration",
      "Farm-to-Table Integration - Events showcase produce from on-site agriculture, teaching food sovereignty",
      "Community Gift Economy - Pay-what-you-can events and skill-share workshops",
      "Sacred Earth Connection - Ceremonies honoring the land, seasonal celebrations, nature immersion practices"
    ],
    
    revenueStreams: [
      "Phase 1 Events (2-4/month): $4,500-$9,000/month (50-70 people @ $25-$50/ticket)",
      "Phase 2 Events (4-7/month): $11,000-$22,000/month",
      "Phase 3 Events (8-10/month): $27,000-$41,000/month (MAX capacity)",
      "Premium Festival Packages: $250-$1,000/ticket (glamping, food, premium services)",
      "Membership Programs (Phase 3): $5,000-$7,000/month",
      "Educational Partnerships: $500-$1,000/month"
    ],
    
    developmentTimeline: [
      {
        phase: "Phase 1 (Months 0-3)",
        deliverables: "Clear and prepare primary event area, build main shaded gathering space with stage, set up seating and basic amenities, create ceremony circles and fire pit areas, install basic sound system, prepare parking and access roads, set up portable restroom facilities",
        investment: "$10,000-$15,000",
        monthlyRevenue: "$4,500-$9,000",
        status: "Foundation building & initial events (2-4 events/month @ 50-70 people)"
      },
      {
        phase: "Phase 2 (Months 3-12)",
        deliverables: "Reinvest event revenue into infrastructure, expand event spaces around property, build additional ceremony zones, improve guest accommodation areas (camping, basic lodging), enhance community kitchen facilities, create multiple smaller event venues, improve landscaping and pathways, add permanent covered structures",
        investment: "$10,000-$15,000 (additional + reinvested revenue)",
        monthlyRevenue: "$11,000-$22,000",
        status: "Consistent events & infrastructure expansion (4-7 events/month + quarterly festivals)"
      },
      {
        phase: "Phase 3 (Months 12+)",
        deliverables: "Full retreat packages and ceremonial programs, lodging units for overnight guests, large-scale quarterly and monthly festivals (250-500 people), advanced event infrastructure, professional event production capabilities, multiple simultaneous event spaces",
        investment: "Reinvested profits for maintenance and improvements",
        monthlyRevenue: "$27,000-$41,000",
        status: "Full-scale event operations at MAX capacity (8-10 events/month + festivals + memberships)"
      }
    ],
    
    communityEngagement: [
      "Experiential onboarding through workshops and retreats",
      "Entry point for land experience and compatibility assessment",
      "Event collaboration partnerships with wellness operators",
      "Job Board task roles for event organization (micro-jobs)",
      "Event participation path (exchange hours for rewards/tokens)",
      "Public website /events page for RSVP and listings",
      "Member dashboard with Upcoming Events widget",
      "Virtual events via interactive 3D digital twin",
      "Global access bridged with on-site experiences"
    ]
  },
  {
    id: "livestock-dairy",
    mode: "vision",
    name: "Livestock & Dairy Program",
    emoji: "🐄",
    position: [34.432797, -119.156143],
    polygon: [[34.4340, -119.1565], [34.4345, -119.1565], [34.4345, -119.1555], [34.4340, -119.1555]],
    type: "agriculture",
    budget: "P1: $20K-$25K | P2: $5K/month",
    timeline: "Phase 1-3 (8+ months)",
    monthlyRevenue: "$10,500-$15,000 (Phase 3+)",
    roi: "300%+ annual ROI",
    description: "Regenerative livestock and dairy farm producing organic dairy, grass-fed meat, fiber products, and eggs. The farm operates on rotational grazing principles for land regeneration, featuring goats, sheep, alpacas, horses, and chickens.\n\nBeyond production, the farm offers diverse revenue streams: on-site dairy and meat processing, fiber and textile products, educational farm tours and workshops, animal therapies including horse therapy, and creative services like goat rentals for land clearing.\n\nProducts are sold through multiple channels: farmers markets, online shop, farmstead membership programs, and direct visitor exchanges. The farm serves as both a production operation and an educational destination, demonstrating regenerative agriculture practices while building community connections and supporting local food systems.",
    features: [
      "Rotational grazing system for land regeneration",
      "Small dairy herd (goats and sheep)",
      "Fiber animals (alpacas, sheep) for textiles",
      "Egg production and poultry management",
      "Mobile shelters and water systems",
      "On-site processing and value-added products",
      "Grass-fed meat production",
      "Horse therapies and animal-assisted wellness programs",
      "Educational farm tours and workshops",
      "Composting system for manure regeneration"
    ],
    
    regenerativePractices: [
      "Rotational grazing system regenerating soil health and biodiversity",
      "Composting of animal manures creating nutrient-rich soil amendments",
      "Rainwater harvesting system supporting livestock water needs",
      "On-site processing reducing transportation and packaging waste",
      "Closed-loop farm system: animals support land, land supports animals",
      "Educational model demonstrating regenerative agriculture to community"
    ],
    
    marketContext: "The market for organic, locally-produced dairy, meat, and fiber products continues to grow as consumers prioritize food quality, transparency, and environmental impact. Direct-to-consumer sales through farmers markets, online platforms, and membership programs provide premium pricing opportunities. Regenerative agriculture practices and animal-assisted wellness therapies align with consumer values around health, sustainability, and community connection. Farmstead experiences and educational workshops create additional revenue while building customer loyalty and brand community.",
    
    revenueStreams: [
      "Farm Products: $6,500-$7,000/month (dairy, meat, eggs, fiber)",
      "Services & Experiences: $2,000-$4,000/month (therapies, tours, grazing)",
      "Multi-Channel Sales: $2,500-$4,000/month (farmers markets, online, memberships)",
      "Total Monthly Revenue (Phase 3+): $10,500-$15,000"
    ],
    
    developmentTimeline: [
      {
        phase: "Phase 1 (Months 0-3+)",
        deliverables: "Farm Preparation: Redo and prepare property for horses and animals. Create shelters for chickens, horses, and livestock. Install mobile shelters and water systems. Set up initial composting system. Begin rotational grazing setup. Start with initial livestock (goats, sheep, chickens, horses). Establish basic on-site processing capability.",
        investment: "$20,000-$25,000",
        status: "Initial livestock setup and farm preparation"
      },
      {
        phase: "Phase 2 (Months 4-8+)",
        deliverables: "Scaling & Growth: Scale livestock numbers based on Phase 1 success. Develop on-site dairy and meat processing. Launch farmers market sales. Set up online shop and direct shipping. Begin animal therapy programs. Expand educational farm tours and workshops. Reinvest revenue into growth and improvements.",
        investment: "$5,000/month (ongoing improvements)",
        status: "Growing operations and expanding revenue streams"
      },
      {
        phase: "Phase 3 (Months 8+)",
        deliverables: "Full Operations: All product lines fully operational. Multiple sales channels active (farmers market, online, membership). Animal therapy programs established. Educational workshops and farm tours regular offering. Farmstead membership and visitor exchange program active. Optimized operations and profitability.",
        investment: "Ongoing operational costs",
        status: "Fully operational regenerative farm"
      }
    ]
  },
  {
    id: "creative-workshop-center",
    mode: "vision",
    name: "Creative Workshop & Art Creation Center",
    emoji: "🎨",
    position: [34.433470, -119.156486],
    type: "creative",
    budget: "$30,000-$45,000 (initial build-out)",
    timeline: "Phase 1 (Months 6-12 build-out)",
    monthlyRevenue: "To be determined (post-launch programming)",
    roi: "Dependent on program adoption and partnerships",
    description: "Multi-use creative workshop serving as a multipurpose learning and creation space with woodwork, pottery, natural building workshops, and sacred art creation.",
    features: [
      "Woodworking & eco-building workshops ($100-$500 per weekend)",
      "Pottery & art creation studios ($75-$300 per session)", 
      "Natural building workshops & co-build events",
      "Sacred art & altar creation spaces",
      "Sound healing & instrument crafting areas",
      "Tool & materials storage depot",
      "Stacked shipping container studios and storage pods",
      "Dedicated data/computing lab (future node?)",
      "Creative residencies & retreat spaces",
      "Permaculture workshop integration"
    ],
    revenueStreams: [
      "Creative workshops: $1,500/month",
      "Woodworking courses: $1,800/month",
      "Pottery sessions: $900/month", 
      "Art residencies: $600/month",
      "Artist collaborations & revenue-share commissions (TBD)",
      "Online classes and digital content releases (TBD)"
    ],
    regenerativeSystems: [
      "Solar array with battery storage powering workshops and future data room",
      "Rainwater harvesting with greywater reuse for clay work, cleaning stations, and landscape hydration",
      "Reclaimed lumber and recycled materials embedded in fabrication projects",
      "Shared resource loops with mushroom operations and farm stand product lines",
      "Onsite fabrication reducing transport and logistics footprints",
      "Artist and school collaborations reinforcing a circular creative economy"
    ],
    investmentBreakdown: [
      { label: "Site clearing & grading", cost: "$300-$500" },
      { label: "Container pads & foundations", cost: "$1,000-$2,000" },
      { label: "3-4 shipping containers (delivered)", cost: "$10,000-$15,000" },
      { label: "Container renovations & interior framing", cost: "$10,000-$15,000" },
      { label: "Tools & equipment outfitting", cost: "$10,000-$15,000" }
    ],
    investmentNotes: "Initial build-out totals $30K-$45K with optional future upgrades for advanced tooling or expanded studios.",
    developmentTimeline: [
      {
        phase: "Phase 1 (Months 6-12)",
        deliverables: "Clear and prep site. Install container pads/foundations ($1K-$2K). Source and place 3-4 shipping containers ($10K-$15K). Begin container renovation ($10K-$15K). Relocate tools and storage from warehouse into new hub.",
        investment: "$21,300-$32,500",
        status: "Container campus established and core infrastructure placed"
      },
      {
        phase: "Phase 2 (Month 12+)",
        deliverables: "Complete interior build-outs for wood shop, pottery studio, art labs, storage depot, and tentative data/computing room ($10K-$15K). Install discipline-specific tool sets. Launch collaborative programs, residencies, instrument fabrication, online classes, and school partnerships.",
        investment: "$10,000-$15,000",
        status: "Operational programming and partnerships activated"
      },
      {
        phase: "Ongoing (Post-launch)",
        deliverables: "Host creative events, craft fairs, maker scholarships, youth programs, and eco-village fabrication support while expanding artist collaborations and digital offerings.",
        investment: "Revenue-supported enhancements",
        status: "Evolving creative campus and community hub"
      }
    ],
    marketAnalysis: "Regenerative maker spaces that blend onsite production, educational tourism, and digital creation are surging in demand. This container campus positions the EcoVillage as a regional hub for Ojai artists, schools, and eco-tourism partners, diversifying income through workshops, residencies, artisan collaborations, online classes, and instrument/tool fabrication while supporting the mushroom unit, farm stand, and ceremonial zones with in-house fabrication."
  },
  {
    id: "glamping-creek-village",
    mode: "vision",
    name: "Creek-Side Glamping & Lodging Village",
    emoji: "🏕️",
    position: [34.432479, -119.156540],
    type: "hospitality",
    budget: "$20,000 - $30,000",
    timeline: "Phase 1-2 (4+ months)",
    monthlyRevenue: "$8.75K-$10K (operational)",
    roi: "259-605% annual ROI",
    description: "Unique creek-side lodging village with 10-25+ glamping units including teepees, yurts, and safari tents along the seasonal creek corridor for nature immersion experiences. Starting with 5 tipis in Phase 1, with phased expansion driven by revenue reinvestment and market demand.",
    features: [
      "10-25+ unique glamping units along seasonal creek",
      "Teepees, yurts, and safari tents for overnight experiences",
      "Each tipi with dedicated solar power source",
      "Individual water and toilet facilities per unit (where feasible)",
      "Private wooden decks and hangout spaces with fire pits",
      "Close infrastructure access (roads, electricity, water within 50ft)",
      "Shared outdoor showers and compost toilet clusters",
      "Creek-side pathways connecting to ceremony and garden zones",
      "Propane lines for seasonal heating and cooking",
      "Greywater filtration and modular septic systems",
      "Stargazing areas and nature observation points",
      "Event space for group gatherings and workshops"
    ],
    
    regenerativePractices: [
      "Each tipi equipped with dedicated solar power source",
      "Individual water systems for each unit (where feasible)",
      "Private compost toilet facilities per tent",
      "Greywater filtration and natural drainage systems",
      "Native plant landscaping and creek restoration",
      "Each unit has private deck and outdoor hangout space",
      "Propane heating from sustainable sources",
      "Biodegradable and eco-friendly amenities",
      "Seasonal creek protection and watershed management",
      "Leave-no-trace guest education programs",
      "Integration with permaculture gardens",
      "Wildlife habitat preservation along creek corridor"
    ],
    
    marketAnalysis: "Creek-side glamping village positioned in Ojai Valley's nature-based wellness tourism market. Starting with 5 tipis and expanding to 25+ units aligns with U.S. glamping industry growth (12.8% CAGR). Tipis and tents are the fastest-growing, most cost-efficient glamping accommodation, ideal for phased expansion and high ROI in eco-tourism destinations.",
    
    revenueStreams: [
      "Nightly stays: $100/night per tipi (45% avg occupancy)",
      "5 tipis operational: $6,750/month from stays",
      "Events, workshops, retreats: $2,000-$3,000/month",
      "Total Year 1: $8,750-$10,000/month",
      "Year 2-3 expansion: $15,000-$22,000/month (10-15 units)"
    ],
    
    developmentTimeline: [
      {
        phase: "Phase 1 (Months 0-4)",
        deliverables: "Clean out creek-side spaces and prepare terrain, install infrastructure (roads, electricity lines, water access), set up 5 tipis with decks and hangout spaces, install solar power for each tipi, connect each tipi to nearby water and toilet facilities, create pathways and fire pit areas, ensure all tipis have close access to infrastructure, test systems and prepare for guests",
        investment: "$10,000-$20,000",
        monthlyRevenue: "$0",
        status: "Infrastructure setup and tipi installation"
      },
      {
        phase: "Phase 2 (Months 3+)",
        deliverables: "Launch nightly stays with 5 tipis operational, start hosting events/workshops/retreats, market to retreat guests and eco-tourists, reinvest revenue into adding more units in phased development, add yurts and safari tents in Year 2-3, scale to 10-25+ units over 2-3 years",
        investment: "$10,000+ (ongoing expansion from revenue reinvestment)",
        monthlyRevenue: "$8,750-$10,000",
        status: "Operational with phased expansion"
      }
    ]
  },
  {
    id: "gatelodge-operations-hub",
    name: "The Barn",
    visionName: "Sulphur Mountain Gatelodge (Operations ADU)",
    emoji: "🏘️",
    position: [34.433082, -119.156728],
    type: "infrastructure",
    budget: "$25,000-$40,000 (estimated)",
    timeline: "Phase 1 (0-12 months)",
    monthlyRevenue: "Operational support (not revenue-generating)",
    roi: "Enables all property businesses to operate",
    description: "Today the structure at the property entrance is a working barn — storage and ranch utility right by the gate. The vision converts it into the Sulphur Mountain Gatelodge, the operations ADU that welcomes every arrival.",
    visionDescription: "Central operational hub and team housing ADU expanding from 360 sq ft to 800 sq ft two-story loft barn. Serves as the nerve center for property management, business operations, and coordination of all revenue-generating projects.\n\nThe facility features a full-service living and working space: downstairs living room and kitchen, upstairs loft bedroom and office system, integrated bathroom facilities, and dedicated workshop area with operational tools. A deck provides indoor/outdoor access for team coordination and oversight.\n\nAdjacent to the main structure is a closed-in garden system featuring vertical growing towers and a propagation facility. This integrated garden produces vegetables, fruits, herbs, and propagates seeds and fruit trees for both property use and the agriculture hub's product lines.\n\nThis operational hub is strategically positioned as the coordination center for all property businesses, enabling efficient logistics, team management, and agricultural operations oversight.",
    features: [
      "Existing barn structure at the property entrance",
      "Storage and ranch utility use today",
      "Becomes the Gatelodge / Operations ADU in the vision"
    ],
    visionFeatures: [
      "Expansion from 360 to 800 sq ft (2-story loft barn)",
      "Full integrated kitchen and bathroom systems",
      "Loft bedroom upstairs with office system",
      "Living room downstairs",
      "Workshop area with operational tools",
      "Deck for indoor/outdoor access",
      "Dedicated business operations unit",
      "Core operational team housing with on-site presence",
      "Connected to active well (17 GPM water access)",
      "One existing live power line with planned solar grid integration"
    ],
    
    integratedGardenSystem: [
      "Closed-in garden system with vertical growing towers",
      "Propagation facility for seeds, seedlings, and fruit trees",
      "Year-round vegetable, fruit, and herb production",
      "Products for property use and agriculture hub sales",
      "Strategic location enabling agriculture operations oversight",
      "Connected to creative workshop and mushroom center for coordination"
    ],
    
    operationalFunction: "This is an operational support unit that enables all property businesses to operate efficiently. It provides on-site team management and coordination, oversees agriculture operations and the propagation facility, coordinates logistics between the creative workshop, mushroom center, and agriculture hub, and manages property operations and maintenance. The integrated garden system supports the agriculture hub's revenue streams while reducing property operational costs.",
    
    regenerativeSystems: [
      "Full solar roofing with battery storage for energy independence",
      "Rainwater harvesting system supporting garden and property needs",
      "Greywater recycling for garden irrigation and landscape watering",
      "Integrated garden system reducing property food costs",
      "On-site operational tools and workshop reducing logistics needs",
      "Central location minimizing travel time for property coordination"
    ],
    
    revenueStreams: [
      "OPERATIONAL SUPPORT (Enables all property businesses):",
      "  • On-site team management and coordination",
      "  • Agriculture operations oversight",
      "  • Logistics coordination between centers",
      "  • Property operations and maintenance",
      "INTEGRATED GARDEN PRODUCTS (Connected to Agriculture Hub):",
      "  • Vegetables, fruits, herbs for property use",
      "  • Propagated seeds and fruit trees for agriculture hub sales",
      "  • Plant starts for creative workshop and projects",
      "NOTE: This is an operational support unit, not a revenue-generating rental property."
    ],
    
    developmentTimeline: [
      {
        phase: "Phase 1 (Months 0-12)",
        deliverables: "Permitting: Apply for remodeled permits (3+ months approval). Construction: Build two-story loft with upstairs bedroom and office, install full kitchen and bathroom systems, create downstairs living room, build workshop area with operational tools, install deck for indoor/outdoor access. Garden System: Construct integrated garden with vertical growing towers, set up propagation facility. Systems: Install solar roofing and battery storage, implement rainwater harvesting and greywater recycling. Complete all interior finishes and systems integration.",
        investment: "$25,000-$40,000 (estimated)",
        status: "Fully operational team housing and business operations hub"
      }
    ]
  },
  {
    id: "tropical-dome-greenhouse",
    mode: "vision",
    name: "Tropical Dome Greenhouse",
    emoji: "🌴",
    position: [34.432888, -119.156763],
    type: "agriculture",
    budget: "$30,000 (estimated with Phase 1 investment)",
    timeline: "Phase 1 (6+ months to start)",
    monthlyRevenue: "$4,200 (post-launch)",
    roi: "168% annual ROI (Year 1)",
    description: "Geodesic dome greenhouse for year-round tropical plant cultivation, propagation station, and seedling nursery - enabling exotic fruit production and plant starts in a controlled microclimate.",
    
    regenerativeSystems: [
      "Solar integration for energy independence",
      "Rainwater harvesting system supporting tropical irrigation",
      "Integrated pond inside tropical garden for water storage and ecosystem",
      "Pond water repurposing for irrigation and other property uses",
      "Year-round tropical fruit trees and tropical plant production",
      "Vertical growing systems maximizing tropical vegetable and herb yields"
    ],
    
    marketContext: "The specialty plant nursery market is experiencing strong growth, particularly for tropical fruit trees and exotic propagated plants. California's growing interest in tropical and subtropical fruits (avocado, mango, citrus varieties) creates premium pricing opportunities. Medicinal herb starts and propagation supplies serve the expanding wellness and herbal medicine markets. Educational workshops on tropical plant propagation attract both home gardeners and commercial growers seeking sustainable propagation techniques.",
    
    developmentTimeline: [
      {
        phase: "Phase 1 (Months 0-6+)",
        deliverables: "Permitting and site preparation (0-6 months). Geodesic dome construction and systems installation (6-12 months). Solar integration and rainwater harvesting setup. Integrated pond construction inside tropical garden. Initial plant propagation and production setup. Begin propagation operations and revenue generation.",
        investment: "$30,000 (estimated)",
        status: "Dome construction, systems integration, initial propagation"
      },
      {
        phase: "Phase 2 (Months 12+)",
        deliverables: "Full propagation operations. Multiple revenue streams active (saplings, herbs, fresh produce, kits, workshops). Pond fully integrated for water management. Educational workshop program established. Scaling production based on demand.",
        investment: "Reinvested revenue for expansion",
        status: "Fully operational propagation facility and tropical production"
      }
    ],
    
    tropicalFruitTrees: [
      {
        name: "Banana & Plantain",
        propagation: "Cloning via pup division",
        products: "Pups for sale, fresh fruit"
      },
      {
        name: "Mango",
        propagation: "Grafting and air-layering",
        products: "Grafted mango saplings, fresh fruit"
      },
      {
        name: "Papaya",
        propagation: "Seed propagation",
        products: "Seedlings, fresh fruit"
      }
    ],
    
    productsOfferings: [
      {
        category: "Live Plants & Propagation",
        items: [
          "Tropical fruit saplings (mango, banana, papaya)",
          "Culinary & medicinal herb starts (rosemary, lavender, mint, basil, sage)",
          "Propagation kits with rooting supplies and instructions"
        ]
      },
      {
        category: "Fresh & Value-Added",
        items: [
          "Seasonal tropical fruits and fresh herbs",
          "Dried herb bundles and herbal tea blends",
          "Specialty plant collections and garden starter kits"
        ]
      }
    ],
    
    features: [
      "Geodesic dome structure for optimal growing conditions",
      "Climate-controlled tropical microclimate year-round",
      "Dedicated propagation station for cuttings and grafting",
      "Seedling nursery with grow lights and heat mats",
      "Misting system for tropical humidity control",
      "Specialized growing benches and vertical growing systems",
      "Tissue culture and cloning propagation area",
      "Educational workshops on tropical plant care",
      "Grafting and air-layering demonstration space",
      "Temperature and humidity monitoring systems"
    ],
    
    revenueStreams: [
      "Tropical fruit tree saplings: $1,500/month",
      "Herb and medicinal plant starts: $800/month",
      "Fresh produce and herbs: $600/month",
      "Propagation kits and supplies: $500/month",
      "Educational workshops: $800/month"
    ]
  },
  {
    id: "sulphur-mountain-sanctuary",
    mode: "vision",
    name: "Sulphur Mountain Sanctuary: The Living Landscape",
    emoji: "🌺",
    position: [34.433038, -119.155827],
    polygon: [[34.4320, -119.1570], [34.4330, -119.1570], [34.4330, -119.1560], [34.4320, -119.1560]],
    type: "landscape",
    budget: "",
    timeline: "Ongoing (post-main residence construction)",
    monthlyRevenue: "Year 3-5+ orchard harvest potential (TBD)",
    roi: "Long-term property value appreciation",
    description: "An immersive living environment where beauty and abundance intertwine, featuring regenerative food forests, sacred geometry gardens, and curated nature pathways that create seamless flow between gathering spaces and nature.",
    features: [
      "500+ fruit trees in extensive orchard system on gentle slope",
      "3+ acres of rich topsoil for regenerative farming",
      "Sacred geometry gardens with stone terraces and walls", 
      "Flower gardens on right side of driveway slope",
      "Curated nature trails weaving through sacred installations",
      "Experiential pathways connecting all zones",
      "Direct links from Main Residence to ceremonial zones",
      "Sacred gathering groves and meditation clearings",
      "Stone terraces, limestone retaining walls, and pathways",
      "Crystal grids and energy-aligned installations",
      "Gravity-fed water channels linking tree guilds",
      "Contemplative rest zones throughout landscape",
      "Elemental installations for nature immersion"
    ],
    regenerativePractices: [
      "Propagating and planting fruit trees grown on-site to expand the orchard",
      "Layered perennial guilds restoring soil health and biodiversity",
      "Stonework, crystal grids, and sacred geometry layouts aligned with land energies",
      "Gravity-fed water features and pools that cascade nourishment between plantings",
      "Pollinator gardens and native understory plantings enhancing habitat",
      "Living mulches and composting practices building long-term fertility"
    ],
    revenueStreams: [
      "Future fruit harvests and nursery tree sales once orchards mature (Year 3-5+)",
      "Seasonal blossoms, botanicals, and ceremonial materials supporting onsite experiences"
    ],
    marketAnalysis: "Mature fruit trees, sacred gardens, and perennial landscapes measurably increase property value while regenerating soils, supporting pollinators, and creating memorable visitor experiences that strengthen the estate's long-term desirability."
  },
  {
    id: "farmstead-produce-stand",
    mode: "vision",
    name: "Farmstead Produce Stand & Online Hub",
    emoji: "🛒",
    position: [34.432483, -119.156935],
    polygon: [[34.4334, -119.1560], [34.4336, -119.1560], [34.4336, -119.1558], [34.4334, -119.1558]],
    type: "agriculture",
    budget: "$7,000-$10,000 (estimated)",
    timeline: "Phase 1 (Month 3+ launch)",
    monthlyRevenue: "$6,400-$8,300 (Phase 1+)",
    roi: "500%+ annual ROI (dependent on connected operations)",
    description: "Central direct-to-consumer sales hub at the property entrance, serving as the primary sales channel for all regenerative farm products, livestock goods, and artisan creations. Combines physical roadside farm stand with robust e-commerce platform and online neighborhood delivery, creating dual-channel revenue streams that significantly expand market reach beyond walk-up retail.",
    
    regenerativeSystems: [
      "Solar energy integration for operational independence",
      "Rainwater harvesting system supporting water needs",
      "Central hub connecting all property regenerative production",
      "Direct-to-consumer sales eliminating middlemen margins",
      "Online shop platform extending market reach to neighborhoods",
      "Organic product focus supporting regenerative agriculture across property"
    ],
    
    marketContext: "The direct-to-consumer farm market is experiencing explosive growth as consumers increasingly seek organic, locally-grown products with transparent sourcing. This farmstead hub serves as the central sales channel for all property regenerative production: organic vegetables and fruits from the agriculture hub, grass-fed meat and dairy from the livestock program, specialty mushrooms, tropical fruits, and artisan goods from the creative workshop. The dual-channel approach—physical roadside stand plus online e-commerce—captures both walk-up retail customers and neighborhood online shoppers. Online sales significantly expand market reach beyond foot traffic, enabling delivery to surrounding neighborhoods. With consistent supply from maintained agricultural operations, the online shop can command premium pricing for organic, regeneratively-grown products. Market projections show 25-40% annual growth in organic food e-commerce and direct-to-consumer sales.",
    
    features: [
      "Physical roadside stand at main entrance/gate",
      "Refrigerated display cases for fresh produce",
      "E-commerce platform for online orders",
      "CSA box subscription fulfillment center",
      "Product shelving and display systems",
      "POS system for walk-up transactions",
      "Cold storage for dairy and meat products"
    ],
    
    revenueStreams: [
      "PHYSICAL FARM STAND SALES:",
      "  • Fresh produce, herbs, and nursery starts: $2,000-$2,500/month",
      "  • Eggs, honey, and pasture-raised meats: $2,000-$2,500/month",
      "  • Value-added goods (tinctures, soaps, candles): $800-$1,000/month",
      "ONLINE ORDERS & LOCAL DELIVERY:",
      "  • Online produce boxes & CSA renewals: $1,000-$1,500/month",
      "  • Neighborhood deliveries & subscriptions: $600-$800/month",
      "CONNECTED PROPERTY PRODUCTION:",
      "  • Agriculture hub products (vegetables, fruits, herbs)",
      "  • Livestock hub products (dairy, meat, eggs, therapies)",
      "  • Mushroom center products (specialty mushrooms)",
      "  • Tropical dome products (tropical fruits, plant starts)",
      "  • Creative workshop artisan goods (value-added products)",
      "TOTAL MONTHLY REVENUE (Phase 1+): $6,400-$8,300/month"
    ],
    
    developmentTimeline: [
      {
        phase: "Phase 1 (Month 3+)",
        deliverables: "Farm Stand Setup: Design and build nice, fancy roadside stand ($2K-$5K). Install refrigerated display cases, shelving, POS system, and signage. Online Shop Development: Set up e-commerce platform ($5K). Develop website and branding. Integrate payment processing. Plan delivery logistics. Launch social media and marketing. Integration & Launch: Connect to agriculture hub production. Connect to livestock hub products. Set up CSA box fulfillment. Begin online orders and local delivery. Launch marketing campaign.",
        investment: "$7,000-$10,000 (estimated)",
        status: "Central sales hub operational with dual channels"
      },
      {
        phase: "Phase 2 (Month 4+)",
        deliverables: "Full Operations: Physical stand and online shop both active. Multiple revenue streams generating. Neighborhood delivery established. CSA subscriptions active. Marketing driving customer acquisition. Scaling: Expand product offerings as supply increases. Optimize online operations. Build customer loyalty programs. Integrate new products from connected operations.",
        investment: "Reinvested revenue for expansion",
        status: "Fully operational dual-channel sales hub"
      }
    ],
    products: {
      freshProduce: {
        category: "🌱 Fresh Farm Produce",
        description: "Seasonal regenerative produce from the 3-acre farm zone",
        items: [
          {
            name: "Seasonal Fruits",
            source: "500+ fruit trees (food forest)",
            availability: "Seasonal rotation",
            details: "Grown using regenerative practices and permaculture design"
          },
          {
            name: "Organic Vegetables & Greens",
            source: "3-acre farm zone, structured garden beds",
            availability: "Year-round (seasonal varieties)",
            details: "Fresh harvest available daily"
          },
          {
            name: "Culinary & Medicinal Herbs",
            source: "Dedicated herb gardens",
            availability: "Fresh & dried options",
            uses: "Cooking, teas, medicine-making, aromatherapy"
          },
          {
            name: "Specialty Mushrooms",
            source: "Trailer cultivation + log farming",
            varieties: "Shiitake, Oyster, Lion's Mane, and more",
            revenue: "$10,000-$20,000/month potential",
            roi: "650% ROI on log-based cultivation"
          },
          {
            name: "Nursery Plants & Seedlings",
            source: "On-site propagation nursery",
            types: "Seedlings, vegetable starts, fruit tree saplings, native plants"
          }
        ]
      },
      livestockProducts: {
        category: "🐝 Livestock & Apiary Products",
        description: "Regenerative animal products with $108,000 annual revenue projection",
        annualRevenue: "$108,000",
        roi: "227% ROI with 12-month payback",
        items: [
          {
            category: "Honey & Beeswax",
            products: ["Raw wildflower honey", "Beeswax blocks", "Propolis"],
            revenue: "$12,000/year",
            timeline: "Revenue starts within 3 months",
            details: "Partnership with local beekeepers, 10-20 hives"
          },
          {
            category: "Poultry & Eggs",
            products: ["Fresh eggs (chicken & duck)", "Pasture-raised chicken meat"],
            revenue: "$20,000/year",
            details: "Free-range, rotational grazing, organic feed supplementation"
          },
          {
            category: "Grass-Fed Beef",
            products: ["Beef cuts (various)", "Optional: Raw milk, cheese"],
            revenue: "$30,000/year",
            details: "Rotational grazing for land regeneration, hormone-free"
          },
          {
            category: "Goat Products",
            products: ["Goat meat", "Optional: Goat milk, cheese"],
            revenue: "$15,000/year",
            details: "Brush management specialists, dual-purpose breeds"
          },
          {
            category: "Lamb & Wool",
            products: ["Lamb meat", "Optional: Raw wool, yarn"],
            revenue: "$16,000/year",
            details: "Grass maintenance, fiber arts potential"
          },
          {
            category: "Pork",
            products: ["Pork cuts", "Breeding stock"],
            revenue: "$15,000/year",
            details: "Forest foraging, land management through rooting"
          }
        ]
      },
      valueAdded: {
        category: "✨ Artisan & Value-Added Creations",
        description: "Creative goods leveraging farm materials and Creative Workshop output",
        items: [
          {
            category: "Wellness Products",
            products: ["Herbal tinctures", "Medicinal teas", "Herbal remedies", "Healing salves"],
            ingredients: "Farm-grown herbs & botanicals",
            createdIn: "Creative Workshop collaboration"
          },
          {
            category: "Body Care",
            products: ["Skincare creams & lotions", "Handmade soaps", "Beeswax lip balms", "Herbal bath products"],
            ingredients: "Beeswax, farm herbs, essential oils",
            createdIn: "Creative Workshop & Art Creation Center"
          },
          {
            category: "Home & Altar Goods",
            products: ["Beeswax candles", "Altar tools", "Artisan woodwork", "Sacred art pieces", "Incense blends"],
            source: "Creative Workshop artist collaborations",
            details: "Commission-based revenue sharing with creators"
          },
          {
            category: "Farm Inputs & Amendments",
            products: ["Organic compost (bagged)", "Mycelium spawn/products", "Worm castings"],
            source: "Excess from on-site composting and mycelium operations",
            details: "Soil remediation byproducts available for sale"
          }
        ]
      }
    },
    salesChannels: {
      physical: {
        name: "Roadside Farm Stand",
        location: "Property entrance on Sulphur Mountain Road",
        hours: "Variable based on seasonal supply",
        features: ["Walk-up retail", "Self-service honor system option", "Refrigerated displays"]
      },
      online: {
        name: "E-Commerce Store",
        platform: "Dedicated online marketplace",
        features: ["Product catalog", "Pre-orders", "Delivery scheduling", "CSA subscriptions"],
        reach: "Local Ojai + regional online customers"
      },
      csa: {
        name: "Community Supported Agriculture",
        model: "Weekly/bi-weekly subscription boxes",
        price: "$35-$65 per box",
        features: ["Seasonal produce variety", "Add-on products", "Pickup or delivery"]
      },
      wholesale: {
        name: "B2B Sales",
        partners: ["Local restaurants", "Hotels", "Cafes"],
        focus: "Specialty mushrooms, fresh produce, honey",
        details: "Farm-to-table partnerships with Ojai hospitality"
      }
    },
    infrastructure: {
      physical: [
        "Refrigerated display units ($8,000)",
        "Product shelving and fixtures ($3,500)",
        "POS system and payment processing ($2,000)",
        "Signage and branding ($4,000)",
        "Cold storage expansion ($12,000)",
        "Packaging supplies and materials ($2,500)"
      ],
      digital: [
        "E-commerce platform development ($15,000)",
        "Inventory management system ($5,000)",
        "Photography and product imaging ($3,000)",
        "Digital marketing setup ($4,000)"
      ],
      site: [
        "Stand structure and roofing ($20,000)",
        "Customer parking area ($6,000)"
      ]
    },
    contributionPaths: [
      {
        type: "Investment",
        focus: "Stand infrastructure and technology",
        minimum: "$5,000",
        rewardModel: "10% revenue share from product sales",
        examples: ["Refrigeration units", "E-commerce platform", "Display fixtures"]
      },
      {
        type: "Job - Sales & Fulfillment Steward",
        responsibilities: ["Manage daily stand operations", "Customer service", "Inventory management", "Order fulfillment"],
        compensation: "ECO tokens + housing credits or hourly rate"
      },
      {
        type: "Job - E-Commerce Manager",
        responsibilities: ["Online store management", "Digital marketing", "Order processing", "Customer communications"],
        compensation: "Revenue share or token-based compensation"
      },
      {
        type: "Creative Expansion",
        focus: "Value-added product creation",
        examples: ["Tinctures", "Soaps", "Candles", "Artisan goods"],
        rewardModel: "40% creator / 60% village revenue split"
      }
    ],
    financialProjection: {
      phase1: {
        timeline: "Month 5-12",
        monthlyRevenue: "$3,000",
        focus: "Nursery & agriculture products, initial CSA"
      },
      phase2: {
        timeline: "Month 12-18",
        monthlyRevenue: "$5,000",
        focus: "Expanded CSA, livestock products, value-added goods"
      },
      phase3: {
        timeline: "Month 18+",
        monthlyRevenue: "$9,000+",
        focus: "Full product range, wholesale partnerships, scaled livestock ($216k/year potential)"
      },
      totalProjection: {
        year1: "$54,000",
        year2: "$108,000",
        year3: "$216,000 (with scaled livestock operations)"
      }
    },
    valueProposition: {
      financial: "Immediate cash flow from product sales; diversifies revenue beyond lodging/events; 12-month payback on livestock investment; high-margin value-added goods",
      ecological: "Creates market demand for regenerative practices; incentivizes sustainable farming; completes the farm-to-consumer loop; reduces food miles",
      community: "Public-facing brand ambassador; local employment opportunities; educational signage about regenerative practices; builds Ojai community relationships",
      marketing: "Tangible proof of eco-village concept; attracts local support and visitors; farm-to-table experience for retreat guests; authentic regenerative brand story",
      strategic: "Self-funding revenue engine for Phase 1 development; validates agriculture business model; scalable to $216k/year; creates recurring customer base"
    }
  }
];

export const SULPHUR_PROPERTY = {
  id: 'sulphur-mountain',
  name: 'Sulphur Mountain Eco-Village',
  shortLabel: '🌿 Sulphur',
  labelChip: '🌿 Sulphur Mountain Eco-Village',
  visionLabelChip: '🌿 Lemuria Pilot Community — Est. 2024',
  center: [34.433086, -119.155336],
  zoom: 17,
  footerTitle: '🌿 Sulphur Mountain Eco-Village',
  footerInfo: ['18 Project Zones', '$3M Investment', '10-Acre Property', 'Ojai Valley, CA'],
  cta: {
    heading: 'Ready to Join This Vision?',
    paragraph: "Be part of creating a sustainable future at Sulphur Mountain Eco-Village. Whether you're an investor, partner, or future resident, we'd love to hear from you.",
    contacts: [
      { name: 'Mark Panics', email: 'markeduardpancis@gmail.com' },
      { name: 'Paul Muresan', email: 'paulmuresan77@gmail.com' },
      { name: 'Johnatan Braniff', email: 'jbraniff1117@gmail.com' }
    ],
    buttons: [
      { label: '🌐 Visit Website', url: 'https://sulphurmountainroad.vercel.app/' }
    ]
  },
  panel: { title: 'Sulphur Mountain Property', html: SULPHUR_PANEL_HTML },
  boundary: SULPHUR_BOUNDARY,
  zones: SULPHUR_ZONES
};
