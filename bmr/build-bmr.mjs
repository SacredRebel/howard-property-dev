// Generates properties/black-mountain-ranch.js from validated county parcel data.
import { readFileSync, writeFileSync } from 'fs';
import pc from 'polygon-clipping';

const parcels = JSON.parse(readFileSync('./bmr/all-parcels.json', 'utf8'));
const acreage = JSON.parse(readFileSync('./bmr/acreage.json', 'utf8'));

const fmtApn = (a) => a.slice(0,3) + '-' + a.slice(3,4) + '-' + a.slice(4,7) + '-' + a.slice(7,10);

const lots = [];
for (const [apn, data] of Object.entries(parcels)) {
  const rings = Array.isArray(data) ? [data] : data.rings;
  const page = apn.slice(4,7);
  const circle = apn.slice(7,9);
  lots.push({
    id: apn,
    apn: fmtApn(apn),
    name: 'Lot ' + parseInt(circle, 10) + (page === '350' ? ' (Bk 35 Pg 35)' : ''),
    acreage: acreage[apn],
    rings
  });
}
lots.sort((a, b) => a.id.localeCompare(b.id));

const multi = lots.flatMap(l => l.rings.map(r => [r]));
let union = pc.union(...multi);
const ringArea = (ring) => {
  let A = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1,y1] = ring[i], [x2,y2] = ring[(i+1)%ring.length];
    A += x1*y2 - x2*y1;
  }
  return Math.abs(A/2);
};
union.sort((p1, p2) => ringArea(p2[0]) - ringArea(p1[0]));
console.log('union produced', union.length, 'polygon(s); largest outer ring:', union[0][0].length, 'vertices');
let outer = union[0][0];
if (outer.length > 1 && outer[0][0] === outer[outer.length-1][0] && outer[0][1] === outer[outer.length-1][1]) outer = outer.slice(0, -1);

const SEGS = 10;
const per = Math.ceil(outer.length / SEGS);
const palette = [
  [['#9C27B0','#673AB7','#3F51B5','#2196F3'], '#9C27B0'],
  [['#2196F3','#03A9F4','#00BCD4','#26C6DA'], '#00BCD4'],
  [['#00BCD4','#00ACC1','#0097A7','#4CAF50'], '#00BCD4'],
  [['#4CAF50','#66BB6A','#81C784','#8BC34A'], '#4CAF50'],
  [['#8BC34A','#CDDC39','#D4E157','#FFEB3B'], '#CDDC39'],
  [['#FFEB3B','#FDD835','#FBC02D','#FFC107'], '#FDD835'],
  [['#FFC107','#FFB300','#FFA000','#FF8F00'], '#FFC107'],
  [['#FF8F00','#FF6F00','#E65100','#FF5722'], '#FF6F00'],
  [['#FF5722','#F4511E','#E64A19','#E91E63'], '#FF5722'],
  [['#E91E63','#D81B60','#C2185B','#9C27B0'], '#E91E63']
];
const segNames = ['North Boundary','Northeast Boundary','East Boundary','Southeast Boundary','South Boundary (East)','South Boundary (West)','Southwest Boundary','West Boundary','Northwest Boundary','North Boundary (West)'];
const segs = [];
for (let s = 0; s < SEGS; s++) {
  const start = s * per;
  if (start >= outer.length) break;
  const slice = outer.slice(start, Math.min(start + per + 1, outer.length));
  if (start + per + 1 > outer.length) slice.push(outer[0]);
  if (slice.length < 2) continue;
  segs.push({ idx: s, pts: slice });
}

const toLatLng = (ring) => ring.map(p => [p[1], p[0]]);
const round6 = (ring) => ring.map(p => [ +p[0].toFixed(6), +p[1].toFixed(6) ]);

const boundaryJs = segs.map((s, i) => `  {
    id: 'bmr_boundary_${i+1}',
    coordinates: ${JSON.stringify(round6(toLatLng(s.pts)))},
    thickness: 10,
    gradientColors: ${JSON.stringify(palette[i % palette.length][0])},
    glowColor: '${palette[i % palette.length][1]}',
    description: '${segNames[i] || 'Boundary Section ' + (i+1)} (county parcel union)',
    name: '${segNames[i] || 'Boundary Section ' + (i+1)}',
    length: 'part of ~11 mi perimeter',
    features: ['Assembled from ${lots.length} county parcels'],
    permanent: true,
    section: 'seg${i+1}'
  }`).join(',\n');

const lotsJs = lots.map(l => `  {
    id: '${l.id}',
    apn: '${l.apn}',
    name: ${JSON.stringify(l.name)},
    acreage: ${JSON.stringify(String(l.acreage))},
    rings: ${JSON.stringify(l.rings.map(r => round6(toLatLng(r))))}
  }`).join(',\n');

const allPts = lots.flatMap(l => l.rings.flat());
const lats = allPts.map(p => p[1]), lngs = allPts.map(p => p[0]);
const center = [ +(((Math.min(...lats)+Math.max(...lats))/2).toFixed(6)), +(((Math.min(...lngs)+Math.max(...lngs))/2).toFixed(6)) ];
const totalAc = Object.values(acreage).reduce((s,v)=>s+v,0);
console.log('center:', center, '| county total:', totalAc.toFixed(1), 'ac | lots:', lots.length);

const module_ = `// Black Mountain Ranch — property module for the multi-property map.
// 8434 Ojai Santa Paula Rd, Ojai, CA 93023 · ~3,600 acres reported · 63 tax parcels
// ${lots.length} parcels mapped so far (Assessor Bk 035 Pgs 030 + 350) = ${totalAc.toFixed(1)} county acres.
// Every lot boundary is the REAL county parcel line (Ventura County GIS parcel
// service, WGS84, validated parcel-by-parcel against county acreage records).
// The outer rainbow boundary is the computed union of all lot polygons.

const BMR_PANEL_HTML = '<div class="image-gallery-section" style="margin-bottom: 20px;">' +
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
    '<span class="property-detail-label">Property:</span>' +
    '<span class="property-detail-value">Black Mountain Ranch — one of the largest private holdings in Southern California</span>' +
  '</div>' +
  '<div class="property-detail-row">' +
    '<span class="property-detail-label">Location:</span>' +
    '<span class="property-detail-value">8434 Ojai Santa Paula Rd (Hwy 150), Upper Ojai, CA 93023</span>' +
  '</div>' +
  '<div class="property-detail-row">' +
    '<span class="property-detail-label">Jurisdiction:</span>' +
    '<span class="property-detail-value">County Unincorporated — Ventura County</span>' +
  '</div>' +
  '<div class="property-detail-row">' +
    '<span class="property-detail-label">Total Size:</span>' +
    '<span class="property-detail-value">~3,600 acres reported across 63 tax parcels</span>' +
  '</div>' +
  '<div class="property-detail-row">' +
    '<span class="property-detail-label">Mapped so far:</span>' +
    '<span class="property-detail-value">${lots.length} parcels · ${totalAc.toFixed(0)} county-recorded acres (Assessor Bk 035, Pgs 030 + 350)</span>' +
  '</div>' +
'</div>' +

'<div class="property-info-section">' +
  '<h4>🗺️ The Lots</h4>' +
  '<div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 16px; border-radius: 8px; border-left: 4px solid #667eea;">' +
    '<div style="color: #555; line-height: 1.8; font-size: 14px;">' +
      '<p style="margin: 0 0 10px 0;">The ranch is an amalgamation of separate tax parcels assembled over decades — mostly the original <strong>40-acre Rancho Ojai lots</strong> from the historic Bard Subdivision, exactly as drawn on the county tract maps.</p>' +
      '<p style="margin: 0;">Every white line on the map is a <strong>real recorded parcel boundary</strong>. Tap any lot to see its APN and acreage.</p>' +
    '</div>' +
  '</div>' +
'</div>' +

'<div class="property-info-section">' +
  '<h4>✨ Ranch Highlights</h4>' +
  '<ul class="property-features-list">' +
    '<li><strong>Main Lodge:</strong> 13,250 sq ft resort-style residence</li>' +
    '<li><strong>Guest quarters:</strong> multiple detached cottages and staff housing</li>' +
    '<li><strong>Equestrian & cattle:</strong> working pens, barns, and full facilities</li>' +
    '<li><strong>Trails:</strong> 35+ miles of private hiking, riding, and off-road trails</li>' +
    '<li><strong>Water:</strong> private stocked fishing lake</li>' +
    '<li><strong>Special:</strong> private automobile museum and professional shooting range</li>' +
  '</ul>' +
'</div>' +

'<div class="property-info-section">' +
  '<h4>💡 About This Map</h4>' +
  '<div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 16px; border-radius: 8px; border-left: 4px solid #FF9800;">' +
    '<div style="font-weight: 600; color: #FF9800; margin-bottom: 10px; font-size: 14px;">🚧 Acquisition Study</div>' +
    '<div style="color: #555; line-height: 1.8; font-size: 14px;">' +
      '<p style="margin: 0;">This is the parcel-structure map for the ranch. Roughly 830 reported acres sit on additional assessor pages still being identified against the ownership records. Project zones and vision content come next.</p>' +
    '</div>' +
  '</div>' +
'</div>';

const BMR_BOUNDARY = [
${boundaryJs}
];

const BMR_LOTS = [
${lotsJs}
];

export const BMR_PROPERTY = {
  id: 'black-mountain-ranch',
  name: 'Black Mountain Ranch',
  shortLabel: '⛰️ Black Mtn',
  labelChip: '⛰️ Black Mountain Ranch',
  center: ${JSON.stringify(center)},
  zoom: 14,
  footerTitle: '⛰️ Black Mountain Ranch',
  footerInfo: ['${lots.length} Parcels Mapped', '~3,600 Acres', '8434 Ojai Santa Paula Rd', 'Upper Ojai, CA'],
  cta: {
    heading: "Let's Talk About This Idea",
    paragraph: 'Black Mountain Ranch is the biggest vision on this map — a 3,600-acre legacy landscape. This map lays out its real parcel structure as the foundation for everything that comes next.',
    contacts: [
      { name: 'Mark Panics', email: 'markeduardpancis@gmail.com' },
      { name: 'Paul Muresan', email: 'paulmuresan77@gmail.com' }
    ],
    buttons: []
  },
  panel: { title: 'Black Mountain Ranch — 8434 Ojai Santa Paula Rd', html: BMR_PANEL_HTML },
  lotStyle: { color: '#FFFFFF', weight: 1.4, opacity: 0.85, fillColor: '#FFFFFF', fillOpacity: 0.05 },
  boundary: BMR_BOUNDARY,
  lots: BMR_LOTS,
  zones: []
};
`;
writeFileSync('./properties/black-mountain-ranch.js', module_);
console.log('module written:', module_.length, 'chars');
