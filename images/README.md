# 📸 Photo Uploads

Drop photos here and they can be wired into the map's galleries.

## How it's organized

```
images/
└── <property>/
    ├── property/            ← photos of the WHOLE property
    │   ├── current/         ← how it looks today
    │   └── vision/          ← renders, inspiration, masterplans
    └── <project>/           ← one folder per project icon on the map
        ├── current/         ← how that spot looks today
        └── vision/          ← what it will become
```

## Where to put things

| Property | Folder | Projects |
|---|---|---|
| 🏔️ Howard Property | `howard/` | `main-house` · `hugelkultur-project` · `community-hub` · `community-workshop` · `property-nursery` · `nature-gym` · `sacred-spaces` · `mushroom-containers` · `beekeeping` · `pond-swimming-hole` · `growing-dome` · `livestock` · `compost-operation` |
| 🌸 Keri's Property | `keris-property/` | `main-house` · `guest-house` · `ceremony-space` |
| 🌹 Cher's Property | `chers-property/` | `main-house` · `quan-yin-rose-garden` |
| ⛰️ Black Mountain Ranch | `black-mountain-ranch/` | `property/` only for now — project folders come after the vision is set |

🌿 **Sulphur Mountain Eco-Village** photos live in the original [EcoVillage-map repo](https://github.com/SacredRebel/EcoVillage-map) and load from there — don't duplicate them here.

## Tips

- jpg / png / webp all work; keep files under ~5 MB each so the map loads fast.
- Simple filenames help (`lake-1.jpg`, `lodge-front.png`) — spaces are OK too.
- After uploading, the files get listed in `image-urls.js` (ask Claude) and they appear in the galleries.
- The empty `.gitkeep` files just hold the folders open in git — ignore them.
