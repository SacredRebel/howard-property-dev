// Image gallery manifests, namespaced by property id.
// Structure: IMAGE_URLS[propertyId][zoneId] = { current: [urls], vision: [urls] or { Subcategory: [urls] } }
// The special zoneId 'property' feeds each property panel's photo gallery.
//
// Sulphur Mountain photos are served straight from the SacredRebel/EcoVillage-map
// repo via raw.githubusercontent.com (absolute URLs — no local copies needed).
// Howard photos: add files under images/ in THIS repo and list them here with
// /images/... paths (Vercel redirects those to this repo's raw URLs).

export const IMAGE_URLS = {
  'howard': {
    'property': {
      current: []
    }
  },
  'keris-property': {
    'property': {
      current: []
    }
  },
  'chers-property': {
    'property': {
      current: []
    }
  },
  'black-mountain-ranch': {
    'property': {
      current: [
        '/images/black-mountain-ranch/property/current/hero-ojai-mountains.jpg'
      ],
      vision: [
        '/images/black-mountain-ranch/property/vision/vision-hero-split.jpg',
        '/images/black-mountain-ranch/property/vision/hero-communities.jpg'
      ]
    },
    'chumash-village': {
      vision: [
        '/images/black-mountain-ranch/chumash-village/vision/hero-indigenous-ceremony.jpg',
        '/images/black-mountain-ranch/chumash-village/vision/ancient-wisdom.jpg'
      ]
    },
    'white-buffalo-temple': {
      vision: [
        '/images/black-mountain-ranch/white-buffalo-temple/vision/synthesis-ceremony.jpg'
      ]
    },
    'lemuria-studios': {
      vision: [
        '/images/black-mountain-ranch/lemuria-studios/vision/hero-technology-spatial-web.jpg',
        '/images/black-mountain-ranch/lemuria-studios/vision/modern-innovation.jpg'
      ]
    },
    'regenerative-agriculture': {
      vision: [
        '/images/black-mountain-ranch/regenerative-agriculture/vision/hero-regenerative-farm.jpg'
      ]
    },
    'white-buffalo-dome': {
      vision: [
        '/images/black-mountain-ranch/white-buffalo-dome/vision/hero-ar-community.jpg'
      ]
    }
  },
  'sulphur-mountain': {
  "ceremonial-infrastructure": {
    "current": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Ceremonial%20Infrastructure/current/IMG_9366.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Ceremonial%20Infrastructure/current/IMG_9335.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Ceremonial%20Infrastructure/current/IMG_9336.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Ceremonial%20Infrastructure/current/IMG_9338.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Ceremonial%20Infrastructure/current/IMG_9356.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Ceremonial%20Infrastructure/current/IMG_9360.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Ceremonial%20Infrastructure/current/IMG_9370.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Ceremonial%20Infrastructure/current/IMG_9376.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Ceremonial%20Infrastructure/current/IMG_9381.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Ceremonial%20Infrastructure/current/IMG_9389.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Ceremonial%20Infrastructure/current/IMG_9396.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Ceremonial%20Infrastructure/current/IMG_9428.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Ceremonial%20Infrastructure/current/IMG_9430.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Ceremonial%20Infrastructure/current/IMG_9435.JPG"
    ],
    "vision": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Ceremonial%20Infrastructure/vision/sacred%20ceremonial%20space.png",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Ceremonial%20Infrastructure/vision/ceremonial%20forest%20space.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Ceremonial%20Infrastructure/vision/ceremonial%20space%204.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Ceremonial%20Infrastructure/vision/ceremonial%20space.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Ceremonial%20Infrastructure/vision/ceremonie%20space.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Ceremonial%20Infrastructure/vision/mcqeen%20ceremonial%20space%20and%20event%20venue%20%20(1).jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Ceremonial%20Infrastructure/vision/mcqeen%20ceremonial%20space%20and%20event%20venue%20%20(2).jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Ceremonial%20Infrastructure/vision/sacred%20space%2033.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Ceremonial%20Infrastructure/vision/sacred%20water%20system.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Ceremonial%20Infrastructure/vision/yoga%20deck%20in%20forest.jpg"
    ]
  },
  "agricultural-hub": {
    "current": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Agricultural%20Hub/current/IMG_9258.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Agricultural%20Hub/current/IMG_9261.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Agricultural%20Hub/current/IMG_9279.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Agricultural%20Hub/current/IMG_9283.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Agricultural%20Hub/current/Sulphut%20mt%20rd%20-%20property%20pictures%20(25).jpg"
    ],
    "vision": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Agricultural%20Hub/vision/vision%20for%20agricullture.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Agricultural%20Hub/vision/aeroponics.jpeg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Agricultural%20Hub/vision/agriculture%20plan%20design.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Agricultural%20Hub/vision/growing%20walls.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Agricultural%20Hub/vision/hydroponic%20system.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Agricultural%20Hub/vision/Mineral%20mix%20%20(2).png",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Agricultural%20Hub/vision/Organic%20compost%20for%20healthy%20soil.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Agricultural%20Hub/vision/organic%20wormfarm.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Agricultural%20Hub/vision/smart%20farm.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Agricultural%20Hub/vision/vertical%20growing.jpg"
    ]
  },
  "beekeeping-program": {
    "current": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Beekeeping%20&%20Honey%20Production/current/IMG_9250.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Beekeeping%20&%20Honey%20Production/current/IMG_9258.JPG"
    ],
    "vision": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Beekeeping%20&%20Honey%20Production/vision/beekeeoing%20housing.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Beekeeping%20&%20Honey%20Production/vision/beekeeping%20smart%20house.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Beekeeping%20&%20Honey%20Production/vision/beekeeping.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Beekeeping%20&%20Honey%20Production/vision/bees%20and%20beekeeping%20and%20honey.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Beekeeping%20&%20Honey%20Production/vision/smart%20beekeeping.jpg"
    ]
  },
  "community-hub": {
    "current": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Community%20Hub/current/IMG_9305.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Community%20Hub/current/IMG_9297.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Community%20Hub/current/IMG_9303.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Community%20Hub/current/IMG_9309.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Community%20Hub/current/IMG_9311.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Community%20Hub/current/IMG_9313.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Community%20Hub/current/IMG_9314.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Community%20Hub/current/IMG_9315.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Community%20Hub/current/IMG_9328.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Community%20Hub/current/IMG_9331.JPG"
    ],
    "vision": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Community%20Hub/vision/community%20fireplace%20kitchen%20hub.png",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Community%20Hub/vision/communty%20center%20outdoor%20kitchen%20.png",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Community%20Hub/vision/9bf07f4597490223c68888ab091ebe21.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Community%20Hub/vision/a436746300eee02213d26f31bc7056ec.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Community%20Hub/vision/c92cb4960a1dc0cdfb946c29a867c782.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Community%20Hub/vision/ca06f8354d3c813ab20b59500382f392.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Community%20Hub/vision/communty%20kitchen%20design%20idea.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Community%20Hub/vision/communty%20kitchen%20idea.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Community%20Hub/vision/communty%20space.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Community%20Hub/vision/outdoor%20kitchen%202.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Community%20Hub/vision/outdoor%20kitchen%20space.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Community%20Hub/vision/outdoor%20kitchen.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Community%20Hub/vision/outdoot%20kitchen%20style.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Community%20Hub/vision/sauna%20shower.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Community%20Hub/vision/sauna.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Community%20Hub/vision/sweat%20lodge.jpg"
    ]
  },
  "creative-workshop-center": {
    "current": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creative%20Workshop%20&%20Art%20Creation%20Center/current/IMG_9253.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creative%20Workshop%20&%20Art%20Creation%20Center/current/IMG_9254.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creative%20Workshop%20&%20Art%20Creation%20Center/current/IMG_9255.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creative%20Workshop%20&%20Art%20Creation%20Center/current/IMG_9264.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creative%20Workshop%20&%20Art%20Creation%20Center/current/IMG_9614.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creative%20Workshop%20&%20Art%20Creation%20Center/current/IMG_9616.JPG"
    ],
    "vision": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creative%20Workshop%20&%20Art%20Creation%20Center/vision/creative%20studio.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creative%20Workshop%20&%20Art%20Creation%20Center/vision/container%20studio.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creative%20Workshop%20&%20Art%20Creation%20Center/vision/creative%20creation%20center.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creative%20Workshop%20&%20Art%20Creation%20Center/vision/creative%20creator%20studios.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creative%20Workshop%20&%20Art%20Creation%20Center/vision/creative%20studio%202.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creative%20Workshop%20&%20Art%20Creation%20Center/vision/creative%20studio%20container%20style.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creative%20Workshop%20&%20Art%20Creation%20Center/vision/creative%20studio%20design.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creative%20Workshop%20&%20Art%20Creation%20Center/vision/creative%20studio%20space.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creative%20Workshop%20&%20Art%20Creation%20Center/vision/crreative%20studio%20center.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creative%20Workshop%20&%20Art%20Creation%20Center/vision/pottery%20studio.jpg"
    ]
  },
  "glamping-creek-village": {
    "current": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creek-Side%20Glamping%20&%20Lodging%20Village/current/IMG_9376.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creek-Side%20Glamping%20&%20Lodging%20Village/current/IMG_9377.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creek-Side%20Glamping%20&%20Lodging%20Village/current/IMG_9381.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creek-Side%20Glamping%20&%20Lodging%20Village/current/IMG_9403.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creek-Side%20Glamping%20&%20Lodging%20Village/current/IMG_9409.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creek-Side%20Glamping%20&%20Lodging%20Village/current/IMG_9421.JPG"
    ],
    "vision": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creek-Side%20Glamping%20&%20Lodging%20Village/vision/creek%20glamping.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creek-Side%20Glamping%20&%20Lodging%20Village/vision/camping%20along%20creek.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creek-Side%20Glamping%20&%20Lodging%20Village/vision/creek%20glamping%202.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creek-Side%20Glamping%20&%20Lodging%20Village/vision/creek%20glamping%20with%20tent.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creek-Side%20Glamping%20&%20Lodging%20Village/vision/creek%20tiny%20home.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creek-Side%20Glamping%20&%20Lodging%20Village/vision/glamping%20along%20creek%203.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creek-Side%20Glamping%20&%20Lodging%20Village/vision/spaces%20along%20creek%20side.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creek-Side%20Glamping%20&%20Lodging%20Village/vision/teepees%20along%20creek.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creek-Side%20Glamping%20&%20Lodging%20Village/vision/teetees%20on%20creek%20side.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Creek-Side%20Glamping%20&%20Lodging%20Village/vision/tipi%20on%20hillside.jpg"
    ]
  },
  "events-gatherings-hub": {
    "current": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Events%20&%20Workshops/current/sulphur%20mountain%20event%20venue%20%20(8).JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Events%20&%20Workshops/current/sulphur%20mountain%20event%20venue%20%20(1).JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Events%20&%20Workshops/current/sulphur%20mountain%20event%20venue%20%20(2).JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Events%20&%20Workshops/current/sulphur%20mountain%20event%20venue%20%20(3).JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Events%20&%20Workshops/current/sulphur%20mountain%20event%20venue%20%20(4).JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Events%20&%20Workshops/current/sulphur%20mountain%20event%20venue%20%20(5).JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Events%20&%20Workshops/current/sulphur%20mountain%20event%20venue%20%20(6).JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Events%20&%20Workshops/current/sulphur%20mountain%20event%20venue%20%20(7).JPG"
    ],
    "vision": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Events%20&%20Workshops/vision/main%20event%20area%202.jpg",
      "https://i.pinimg.com/736x/99/fa/ad/99faaddcb3846ce1e054a96a52bc9ac1.jpg",
      "https://i.pinimg.com/736x/df/5e/32/df5e32eb5660b7ffc1a8144e5d0e4eb7.jpg",
      "https://i.pinimg.com/736x/79/35/da/7935da41c8d67399c63bac1c073a2ed6.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Events%20&%20Workshops/vision/creative%20shade%20tents.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Events%20&%20Workshops/vision/main%20event%20area.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Events%20&%20Workshops/vision/shade%20structure%20for%20events.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Events%20&%20Workshops/vision/shade%20structure%20for%20stage%20and%20event.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Events%20&%20Workshops/vision/shade%20tarps.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Events%20&%20Workshops/vision/shaded%20event%20area.jpg"
    ]
  },
  "farmstead-produce-stand": {
    "current": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Farmstead%20Produce%20Stand%20&%20Online%20Hub/current/IMG_9596.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Farmstead%20Produce%20Stand%20&%20Online%20Hub/current/IMG_9598.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Farmstead%20Produce%20Stand%20&%20Online%20Hub/current/IMG_9600.JPG"
    ],
    "vision": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Farmstead%20Produce%20Stand%20&%20Online%20Hub/vision/farm%20stead.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Farmstead%20Produce%20Stand%20&%20Online%20Hub/vision/farmstead%20produce%20stand.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Farmstead%20Produce%20Stand%20&%20Online%20Hub/vision/homestead%20produce%20stand%20for%20organic%20produce.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Farmstead%20Produce%20Stand%20&%20Online%20Hub/vision/produce%20stead%20for%20farms%20and%20agriculture.jpg"
    ]
  },
  "infrastructure": {
    "current": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Infrastructure%20&%20Utilities/current/IMG_9494.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Infrastructure%20&%20Utilities/current/IMG_9226.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Infrastructure%20&%20Utilities/current/IMG_9228.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Infrastructure%20&%20Utilities/current/IMG_9411.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Infrastructure%20&%20Utilities/current/IMG_9496.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Infrastructure%20&%20Utilities/current/Sulphut%20mt%20rd%20-%20property%20pictures%20(33).jpg"
    ],
    "vision": {
      "Electric": [
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Infrastructure%20&%20Utilities/vision/Electric/solar.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Infrastructure%20&%20Utilities/vision/Electric/solar%20eco%20forst%20roof.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Infrastructure%20&%20Utilities/vision/Electric/solar%20eco%20roof.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Infrastructure%20&%20Utilities/vision/Electric/solar%20power%20plant%20idea.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Infrastructure%20&%20Utilities/vision/Electric/solar%20power.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Infrastructure%20&%20Utilities/vision/Electric/solar%20roof.jpg"
      ],
      "Roads": [
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Infrastructure%20&%20Utilities/vision/Roads/road%20on%20hillside.jpg"
      ],
      "Septic": [
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Infrastructure%20&%20Utilities/vision/Septic/compost%20toilet%2033.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Infrastructure%20&%20Utilities/vision/Septic/compost%20toilet.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Infrastructure%20&%20Utilities/vision/Septic/composting%20toilet%20off%20grid.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Infrastructure%20&%20Utilities/vision/Septic/composting%20toilet.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Infrastructure%20&%20Utilities/vision/Septic/off%20grid%20composting%20toilet.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Infrastructure%20&%20Utilities/vision/Septic/off%20grid%20toilet%202.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Infrastructure%20&%20Utilities/vision/Septic/off%20grid%20toilet.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Infrastructure%20&%20Utilities/vision/Septic/self%20contained%20toilet.jpg"
      ],
      "Water": [
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Infrastructure%20&%20Utilities/vision/Water/water%20system%20hillsite.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Infrastructure%20&%20Utilities/vision/Water/rain%20water%20collecting%20system.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Infrastructure%20&%20Utilities/vision/Water/rain%20water%20system.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Infrastructure%20&%20Utilities/vision/Water/water%20system.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Infrastructure%20&%20Utilities/vision/Water/water%20systems%2022.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Infrastructure%20&%20Utilities/vision/Water/water%20systems.jpg"
      ]
    }
  },
  "livestock-program": {
    "current": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/current/IMG_9236.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/current/IMG_9203.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/current/IMG_9204.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/current/IMG_9207.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/current/IMG_9212.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/current/IMG_9234.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/current/IMG_9237.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/current/IMG_9293.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/current/IMG_9295.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/current/Sulphut%20mt%20rd%20-%20property%20pictures%20(20).jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/current/Sulphut%20mt%20rd%20-%20property%20pictures%20(21).jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/current/Sulphut%20mt%20rd%20-%20property%20pictures%20(22).jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/current/Sulphut%20mt%20rd%20-%20property%20pictures%20(23).jpg"
    ],
    "vision": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/vision/Animal%20sanctuary%20%20(2).png",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/vision/animal%20barn.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/vision/Animal%20sanctuary%20%20(1).png",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/vision/animal%20sanctuary.jpg"
    ]
  },
  "livestock-dairy": {
    "current": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/current/IMG_9236.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/current/IMG_9203.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/current/IMG_9204.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/current/IMG_9207.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/current/IMG_9212.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/current/IMG_9234.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/current/IMG_9237.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/current/IMG_9293.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/current/IMG_9295.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/current/Sulphut%20mt%20rd%20-%20property%20pictures%20(20).jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/current/Sulphut%20mt%20rd%20-%20property%20pictures%20(21).jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/current/Sulphut%20mt%20rd%20-%20property%20pictures%20(22).jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/current/Sulphut%20mt%20rd%20-%20property%20pictures%20(23).jpg"
    ],
    "vision": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/vision/Animal%20sanctuary%20%20(2).png",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/vision/animal%20barn.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/vision/Animal%20sanctuary%20%20(1).png",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Livestock%20&%20Dairy%20Program/vision/animal%20sanctuary.jpg"
    ]
  },
  "main-residence": {
    "current": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/current/IMG_5874%20(1).JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/current/IMG_9286.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/current/IMG_9287.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/current/IMG_9288.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/current/IMG_9291.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/current/IMG_9483.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/current/IMG_9485.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/current/IMG_9486.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/current/IMG_9491.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/current/IMG_9516.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/current/IMG_9519.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/current/IMG_9523.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/current/Sulphut%20mt%20rd%20-%20property%20pictures%20(5).jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/current/Sulphut%20mt%20rd%20-%20property%20pictures%20(6).jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/current/Sulphut%20mt%20rd%20-%20property%20pictures%20(8).jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/current/Sulphut%20mt%20rd%20-%20property%20pictures%20(9).jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/current/Sulphut%20mt%20rd%20-%20property%20pictures%20(10).jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/current/Sulphut%20mt%20rd%20-%20property%20pictures%20(11).jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/current/Sulphut%20mt%20rd%20-%20property%20pictures%20(12).jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/current/Sulphut%20mt%20rd%20-%20property%20pictures%20(13).jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/current/Sulphut%20mt%20rd%20-%20property%20pictures%20(14).jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/current/Sulphut%20mt%20rd%20-%20property%20pictures%20(16).jpg"
    ],
    "vision": {
      "Floor Plans": [
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Floor%20Plans/creative%20floor%20plan.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Floor%20Plans/creative%20rounds%20floorplan.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Floor%20Plans/creative%20smart%20floor%20plan.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Floor%20Plans/eco%20modern%20floor%20plan.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Floor%20Plans/floor%20plan%20design%20main%20house%20retret%20center.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Floor%20Plans/floor%20plan%20design.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Floor%20Plans/floor%20plan%20idea.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Floor%20Plans/retreat%20center%20floor%20plan.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Floor%20Plans/smart%20floor%20plan%20idea.jpg"
      ],
      "Indoor": [
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Indoor/indoor%20main%20house.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Indoor/indoor%20fireplace%202.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Indoor/indoor%20fireplace.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Indoor/indoor%20house%20design.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Indoor/circle%20eco%20house.jpg",
        "https://i.pinimg.com/1200x/32/b4/d3/32b4d3b279e20465d4fb4f134db98af0.jpg",
        "https://i.pinimg.com/1200x/b3/16/0a/b3160a3d347f2bda6d8ffb47137e9103.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Indoor/house%20indoor.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Indoor/indoor%20main%20kitchen.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Indoor/livingroom.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Indoor/main%20hosue%20eco%20retreat%20center%20livingroom.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Indoor/main%20house%20indoor%20concept.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Indoor/main%20house%20indoor%20design.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Indoor/main%20huse%20indoor%20tree%20in%20livingroom.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Indoor/main%20livingroom%20couch.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Indoor/main%20livingroom%20view.jpg"
      ],
      "Outdoor": [
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Outdoor/Eco%20retreat%20center%20(1).jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Outdoor/Eco%20retreat%20center%20(4).jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Outdoor/Eco%20retreat%20center%20(3).jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Outdoor/Eco%20retreat%20center%20(2).jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Outdoor/main%20ecohouse.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Outdoor/bio%20architecture%20main%20house%20deisgn.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Outdoor/concept%20design.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Outdoor/design%20concept%202.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Outdoor/design%20concept.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Outdoor/Eco%20village%20prototype.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Outdoor/retreat%20concept.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Outdoor/retret%20center%20concept%20design.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Main%20Residence%20Compound/vision/Outdoor/structure.jpg"
      ]
    }
  },
  "mcqueens-garage": {
    "current": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/McQueen's%20Garage%20&%20Creative/current/IMG_9366.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/McQueen's%20Garage%20&%20Creative/current/IMG_9333.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/McQueen's%20Garage%20&%20Creative/current/IMG_9340.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/McQueen's%20Garage%20&%20Creative/current/IMG_9341.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/McQueen's%20Garage%20&%20Creative/current/IMG_9342.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/McQueen's%20Garage%20&%20Creative/current/IMG_9343.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/McQueen's%20Garage%20&%20Creative/current/IMG_9345.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/McQueen's%20Garage%20&%20Creative/current/IMG_9346.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/McQueen's%20Garage%20&%20Creative/current/IMG_9347.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/McQueen's%20Garage%20&%20Creative/current/IMG_9348.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/McQueen's%20Garage%20&%20Creative/current/Sulphut%20mt%20rd%20-%20property%20pictures%20(27).jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/McQueen's%20Garage%20&%20Creative/current/Sulphut%20mt%20rd%20-%20property%20pictures%20(29).jpg"
    ],
    "vision": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/McQueen's%20Garage%20&%20Creative/vision/mcqeen%20ceremonial%20space%20and%20event%20venue%20%20(2).jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/McQueen's%20Garage%20&%20Creative/vision/mcqeen%20ceremonial%20space%20and%20event%20venue%20%20(3).jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/McQueen's%20Garage%20&%20Creative/vision/Mcqueen%20music%20studio%20vision.png",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/McQueen's%20Garage%20&%20Creative/vision/sacred%20ceremonial%20space.png"
    ]
  },
  "mushroom-cultivation": {
    "current": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Mushroom%20Cultivation/current/IMG_9247.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Mushroom%20Cultivation/current/IMG_9252.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Mushroom%20Cultivation/current/IMG_9256.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Mushroom%20Cultivation/current/IMG_9257.JPG"
    ],
    "vision": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Mushroom%20Cultivation/vision/mushroom%20container%20growth%202.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Mushroom%20Cultivation/vision/mushroom%20container%20growth.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Mushroom%20Cultivation/vision/mushroom%20growth%20container.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Mushroom%20Cultivation/vision/mushroom%20growth.jpg"
    ]
  },
  "retreat-village": {
    "current": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/current/IMG_9382.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/current/IMG_9372.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/current/IMG_9370.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/current/IMG_9384.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/current/IMG_9385.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/current/IMG_9387.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/current/IMG_9398.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/current/IMG_9415.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/current/IMG_9418.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/current/IMG_9426.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/current/IMG_9430.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/current/IMG_9433.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/current/IMG_9442.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/current/IMG_9444.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/current/IMG_9464.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/current/IMG_9466.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/current/IMG_9472.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/current/IMG_9473.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/current/IMG_9476.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/current/IMG_9478.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/current/IMG_9481.JPG"
    ],
    "vision": {
      "Cabins": [
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Cabins/beautiful%20cabin.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Cabins/bf013729e0a4d439441de3186df6e2ea.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Cabins/cabin%20hilside%20concept.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Cabins/cabins%20inside%20the%20earth.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Cabins/covered%20cabin%20in%20hillsite.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Cabins/creative%20cabin.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Cabins/Eathen%20cabins.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Cabins/eco%20cabin%205.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Cabins/eco%20smart%20cabin.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Cabins/green%20cabin.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Cabins/green%20modern%20cabin%20in%20forest.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Cabins/hillside%20cabin.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Cabins/modern%20cabin.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Cabins/modern%20habin%20in%20hillside.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Cabins/modern%20rund%20cabin.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Cabins/modern%20wooden%20cabin%20green%20roof.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Cabins/retreat%20village.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Cabins/rounded%20eco%20cabin.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Cabins/simple%20eco%20cabin.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Cabins/tree%20house.jpg"
      ],
      "Indoor": [
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Indoor/cabin%20desgin.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Indoor/dual%20beds%20indoor%20cabin.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Indoor/INDOOR%20CABIN%20design%20earth%20walls.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Indoor/indoor%20cabin%20design.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Indoor/indoor%20smart%20room%20design.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Indoor/retread%20cabin%20indoor.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Indoor/spacios%20earthen%20cabin.jpg"
      ],
      "Sacred Spaces": [
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Sacred%20Spaces/amp%20theather%20and%20ceremonial%20space.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Sacred%20Spaces/ceremonial%20infrastructure.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Sacred%20Spaces/creative%20hangout%20nets.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Sacred%20Spaces/hill%20side%20creative%20space.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Sacred%20Spaces/sacred%20hangout.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Sacred%20Spaces/sacred%20path.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Sacred%20Spaces/sacred%20places%20and%20cereonial%20infrastructure%20with%20healing%20and%20reatreat%20spaces%20%20(1).jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Sacred%20Spaces/sacred%20places%20and%20cereonial%20infrastructure%20with%20healing%20and%20reatreat%20spaces%20%20(10).jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Sacred%20Spaces/sacred%20places%20and%20cereonial%20infrastructure%20with%20healing%20and%20reatreat%20spaces%20%20(11).jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Sacred%20Spaces/sacred%20places%20and%20cereonial%20infrastructure%20with%20healing%20and%20reatreat%20spaces%20%20(12).jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Sacred%20Spaces/sacred%20places%20and%20cereonial%20infrastructure%20with%20healing%20and%20reatreat%20spaces%20%20(13).jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Sacred%20Spaces/sacred%20places%20and%20cereonial%20infrastructure%20with%20healing%20and%20reatreat%20spaces%20%20(14).jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Sacred%20Spaces/sacred%20places%20and%20cereonial%20infrastructure%20with%20healing%20and%20reatreat%20spaces%20%20(2).jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Sacred%20Spaces/sacred%20places%20and%20cereonial%20infrastructure%20with%20healing%20and%20reatreat%20spaces%20%20(3).jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Sacred%20Spaces/sacred%20places%20and%20cereonial%20infrastructure%20with%20healing%20and%20reatreat%20spaces%20%20(4).jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Sacred%20Spaces/sacred%20places%20and%20cereonial%20infrastructure%20with%20healing%20and%20reatreat%20spaces%20%20(5).jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Sacred%20Spaces/sacred%20places%20and%20cereonial%20infrastructure%20with%20healing%20and%20reatreat%20spaces%20%20(6).jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Sacred%20Spaces/sacred%20places%20and%20cereonial%20infrastructure%20with%20healing%20and%20reatreat%20spaces%20%20(7).jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Sacred%20Spaces/sacred%20places%20and%20cereonial%20infrastructure%20with%20healing%20and%20reatreat%20spaces%20%20(8).jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Sacred%20Spaces/sacred%20places%20and%20cereonial%20infrastructure%20with%20healing%20and%20reatreat%20spaces%20%20(9).jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Sacred%20Spaces/sacred%20space%20hillside%20slide.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Sacred%20Spaces/sacred%20tree%20space.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Sacred%20Spaces/sauna.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Retreat%20Village/vision/Sacred%20Spaces/yoga%20studio%20deck.jpg"
      ]
    }
  },
  "tropical-dome-greenhouse": {
    "current": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Tropical%20Dome%20House/current/IMG_9590.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Tropical%20Dome%20House/current/IMG_9591.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Tropical%20Dome%20House/current/IMG_9592.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Tropical%20Dome%20House/current/IMG_9605.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Tropical%20Dome%20House/current/IMG_9608.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Tropical%20Dome%20House/current/IMG_9611.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Tropical%20Dome%20House/current/IMG_9612.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Tropical%20Dome%20House/current/IMG_9613.JPG"
    ],
    "vision": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Tropical%20Dome%20House/vision/tropical%20dome%20structure.png",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Tropical%20Dome%20House/vision/dome%20garden%20place.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Tropical%20Dome%20House/vision/dome%20greenhuse.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Tropical%20Dome%20House/vision/dome%20structure%20and%20garden.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Tropical%20Dome%20House/vision/dome%20structure.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Tropical%20Dome%20House/vision/greenhouse%20dome.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Tropical%20Dome%20House/vision/growing%20green%20house.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Tropical%20Dome%20House/vision/tropical%20dome%20garden.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Tropical%20Dome%20House/vision/tropical%20dome.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Tropical%20Dome%20House/vision/tropical%20garden.jpg"
    ]
  },
  "wellness-facilities": {
    "current": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Wellness%20&%20Spa%20Facilities/current/IMG_9317.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Wellness%20&%20Spa%20Facilities/current/IMG_9320.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Wellness%20&%20Spa%20Facilities/current/IMG_9322.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Wellness%20&%20Spa%20Facilities/current/IMG_9323.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Wellness%20&%20Spa%20Facilities/current/IMG_9324.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Wellness%20&%20Spa%20Facilities/current/IMG_9327.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Wellness%20&%20Spa%20Facilities/current/IMG_9499.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Wellness%20&%20Spa%20Facilities/current/IMG_9502.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Wellness%20&%20Spa%20Facilities/current/IMG_9503.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Wellness%20&%20Spa%20Facilities/current/IMG_9504.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Wellness%20&%20Spa%20Facilities/current/Sulphut%20mt%20rd%20-%20property%20pictures%20(19).jpg"
    ],
    "vision": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Wellness%20&%20Spa%20Facilities/vision/ChatGPT%20Image%20Oct%2018,%202025,%2002_33_58%20PM.png",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Wellness%20&%20Spa%20Facilities/vision/ChatGPT%20Image%20Oct%2018,%202025,%2002_34_02%20PM.png",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Wellness%20&%20Spa%20Facilities/vision/ChatGPT%20Image%20Oct%2018,%202025,%2002_45_07%20PM.png",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Wellness%20&%20Spa%20Facilities/vision/ChatGPT%20Image%20Oct%2018,%202025,%2002_46_34%20PM.png",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Wellness%20&%20Spa%20Facilities/vision/ChatGPT%20Image%20Oct%2018,%202025,%2002_46_44%20PM.png",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Wellness%20&%20Spa%20Facilities/vision/hangout%20space.jpg"
    ]
  },
  "gatelodge-operations-hub": {
    "current": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Gatelodge%20(Operations%20ADU)/current/IMG_4020.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Gatelodge%20(Operations%20ADU)/current/IMG_9183.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Gatelodge%20(Operations%20ADU)/current/IMG_9186.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Gatelodge%20(Operations%20ADU)/current/IMG_9187.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Gatelodge%20(Operations%20ADU)/current/IMG_9189.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Gatelodge%20(Operations%20ADU)/current/IMG_9192.JPG"
    ],
    "vision": {
      "ADU": [
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Gatelodge%20(Operations%20ADU)/vision/ADU/gatelodge%20house%20adu.png",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Gatelodge%20(Operations%20ADU)/vision/ADU/gatelodge%20renovated.png",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Gatelodge%20(Operations%20ADU)/vision/ADU/gatelodge%20renovation.png"
      ],
      "Outdoor Garden": [
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Gatelodge%20(Operations%20ADU)/vision/Outdoor/outdoor%20garden%20desgin.jpg",
        "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Gatelodge%20(Operations%20ADU)/vision/Outdoor/outdoor%20garden%20design.jpg"
      ]
    }
  },
  "sulphur-mountain-sanctuary": {
    "current": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Sanctuary%20The%20Living%20Landscape/current/IMG_9215.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Sanctuary%20The%20Living%20Landscape/current/IMG_9219.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Sanctuary%20The%20Living%20Landscape/current/IMG_9221.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Sanctuary%20The%20Living%20Landscape/current/IMG_9223.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Sanctuary%20The%20Living%20Landscape/current/IMG_9224.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Sanctuary%20The%20Living%20Landscape/current/IMG_9230.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Sanctuary%20The%20Living%20Landscape/current/IMG_9233.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Sanctuary%20The%20Living%20Landscape/current/IMG_9240.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Sanctuary%20The%20Living%20Landscape/current/IMG_9241.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Sanctuary%20The%20Living%20Landscape/current/IMG_9242.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Sanctuary%20The%20Living%20Landscape/current/IMG_9246.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Sanctuary%20The%20Living%20Landscape/current/IMG_9296.JPG",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Sanctuary%20The%20Living%20Landscape/current/sulphur%20mountain%20sanctuary%20place%20.JPG"
    ],
    "vision": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Sanctuary%20The%20Living%20Landscape/vision/sacred%20geometry%20garden.png",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Sanctuary%20The%20Living%20Landscape/vision/0932613b85fadc02744caed65b1f5885.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Sanctuary%20The%20Living%20Landscape/vision/4a768eb02561b1ea87b8bc2c84c3b937.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Sanctuary%20The%20Living%20Landscape/vision/b023c86c5459a21edfd39c79a26f2554.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Sanctuary%20The%20Living%20Landscape/vision/classic%20green%20curved%20rustic%20pathway.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Sanctuary%20The%20Living%20Landscape/vision/fruit%20tree%20orchard%203.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Sanctuary%20The%20Living%20Landscape/vision/fruit%20tree%20orchard.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Sanctuary%20The%20Living%20Landscape/vision/fruit%20tree.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Sanctuary%20The%20Living%20Landscape/vision/green%20pathway.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Sanctuary%20The%20Living%20Landscape/vision/living%20landscape.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Sanctuary%20The%20Living%20Landscape/vision/modern%20green%20pathways%20with%20fruit%20trees.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Sanctuary%20The%20Living%20Landscape/vision/sacred%20garden.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Sanctuary%20The%20Living%20Landscape/vision/sacred%20geometry%20pathways.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Sulphur%20Mountain%20Sanctuary%20The%20Living%20Landscape/vision/sacred%20path%20garden.jpg"
    ]
  },
  "property": {
    "current": [
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Property/Map/Sulphur%20mt%20rd%20-%20property%20land%20map%2003.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Property/Map/Sulphut%20mt%20rd%20-%20property%20land%20map%2001.png",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Property/Map/Sulphut%20mt%20rd%20-%20property%20land%20map%2002.jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Property/Map/Sulphut%20mt%20rd%20-%20property%20pictures%20(4).jpg",
      "https://raw.githubusercontent.com/SacredRebel/EcoVillage-map/main/images/Property/Map/Sulphut%20mt%20rd%20-%20property%20pictures%20(5).jpg"
    ],
    "vision": []
  }
}
};
