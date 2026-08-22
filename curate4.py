# V0.17 content layer — per-property deal status, documents, and mode-pure vision panels.
# johny's numbers (2026-08-22): Keri's NOT for sale (family) · Cher's FOR SALE ~$2.2M
# (acquire to keep in family, finalized as-is; vision = exploratory 2nd ADU) ·
# Ranch $50M acquisition + $50M+ initial development (master plan $250M, $1B+ proj.) ·
# Sulphur $3M raise to buy + develop · Howard = personal proposal (meeting) ·
# Rose Valley $810k acquisition target (already carded).
import json, re

GALLERY = ('\'<div class="image-gallery-section" style="margin-bottom: 20px;">\' +\n'
    '        \'<h4 style="margin-bottom: 12px; color: #7C3AED;">📸 Property Gallery</h4>\' +\n'
    '        \'<div class="carousel-container">\' +\n'
    '          \'<div class="carousel-main" id="property-carousel-main">\' +\n'
    '            \'<div class="carousel-loading">Loading images...</div>\' +\n'
    '          \'</div>\' +\n'
    '          \'<div class="carousel-thumbnails" id="property-carousel-thumbnails"></div>\' +\n'
    '        \'</div>\' +\n'
    '      \'</div>\' +\n')

def esc(t):
    return t.replace("'", "&#39;")

def sec(title, inner):
    return ("'<div class=\"property-info-section\">' +\n"
            f"        '<h4>{esc(title)}</h4>' +\n"
            f"        {inner}\n"
            "      '</div>' +\n")

def para(text):
    return f"'<p style=\"margin: 0 0 10px 0; line-height: 1.7; color: #444;\">{esc(text)}</p>' +"

def inject(fname, status, docs, vp_title, vp_html_js, excise=None):
    p = f'properties/{fname}.js'
    src = open(p).read()
    if excise:
        a, b = excise
        i = src.find(a)
        assert i >= 0, f'{fname}: excise start missing'
        j = src.find(b, i)
        assert j >= 0, f'{fname}: excise end missing'
        src = src[:i] + src[j:]
        # close the now-dangling string concat before the boundary const
        src, cnt = re.subn(r"\+\s*\n(\s*)const " + re.escape(b.split('const ')[1]),
                           ";\n\nconst " + b.split('const ')[1], src, count=1)
        assert cnt == 1, f'{fname}: excise terminator fix failed'
    anchor = '  boundary:'
    assert anchor in src, f'{fname}: boundary anchor'
    block = (f'  status: {json.dumps(status)},\n'
             f'  docs: {json.dumps(docs)},\n'
             f'  visionPanel: {{ title: {json.dumps(vp_title)}, html: VISION_PANEL_HTML }},\n')
    src = src.replace(anchor, block + anchor, 1)
    # define VISION_PANEL_HTML const before the export (expression ends with '+', close with '')
    exp = re.search(r'^export const ', src, re.M)
    assert exp, f'{fname}: export anchor'
    src = src[:exp.start()] + 'const VISION_PANEL_HTML = ' + vp_html_js + " '';\n\n" + src[exp.start():]
    open(p, 'w').write(src)
    print(f'{fname}: status+docs+visionPanel injected')

# ============ HOWARD ============
howard_status = {
  "today": {
    "badge": "🤝 Private Land — Proposal Invited",
    "rows": [["Owner", "Howard (private)"], ["Status", "Not for sale — raw land + residence"],
             ["Openness", "Owner invites agriculture project ideas"], ["Acreage", "~44.1 ac · OS-40 zoning"]],
    "note": "Howard has welcomed ideas for agricultural projects on this land. What you see in Today mode is the property exactly as it stands."
  },
  "vision": {
    "badge": "🌱 Live Proposal — for Howard",
    "rows": [["Proposal", "Regenerative agriculture homestead & community workshop"],
             ["Model", "Resident steward-partner — sweat equity + phased projects"],
             ["Partner", "Paul (johny) — developer, builder, software & creative"],
             ["Ask", "A home base on the land in exchange for full development"]],
    "note": "Everything in Vision mode is a proposal for Howard to consider — 13 projects, each flexible, each a conversation. Full proposal document below."
  }
}
howard_vp = ('\n      ' + GALLERY + "\n      " + sec('🌱 The Proposal in One Breath',
  "'<div style=\"background: linear-gradient(135deg, #f3eefc 0%, #fff8e6 100%); padding: 16px; border-radius: 10px; border-left: 4px solid #6a3d9a;\">' +\n"
  "          " + para("Howard, this map is my proposal to you. You have 44 raw acres and a wish to see agriculture happen here. I am a property developer, software developer, entrepreneur and builder — and I am looking for my next home base. I would like it to be your land.") + "\n"
  "          " + para("<strong>What I bring:</strong> hands-on regenerative development — hugelkultur beds, a nursery, mushroom cultivation, beekeeping, livestock rotation and compost systems — plus the workshop, tools and energy to build it, and the digital craft to document and manage everything (this living map is the first artifact).") + "\n"
  "          " + para("<strong>What I ask:</strong> a place to live on the land while I develop it — starting simply (studio / cabin), growing only with your blessing. Every project on this map is placed as a suggestion; tap any icon to explore it. We build only what we agree on, phase by phase.") + "\n"
  "        '</div>' +") +
  "      " + sec('🔨 How It Would Flow',
  para("<strong>Phase 1 — Arrive & prove (months 0–6):</strong> I settle into the studio, build the first hugelkultur beds, get compost running, and start the nursery. Small, visible, real.") + "\n        " +
  para("<strong>Phase 2 — Grow (months 6–18):</strong> mushrooms, bees, livestock rotation, the pond and swimming hole restored, the community workshop humming.") + "\n        " +
  para("<strong>Phase 3 — Flourish (18+ months):</strong> the full 13-project vision on this map — a regenerative homestead that feeds people, teaches people, and makes the land more alive every season.")) +
  "      " + sec('💡 About This Vision',
  para("Every position and idea on this map is flexible — a conversation starter, not a final plan. The Today toggle shows the property exactly as it is; this Vision shows what we could grow together. The full written proposal is available under Documents below.")))

inject('howard', howard_status,
  [{"label": "Howard Property — Full Proposal (PDF)", "file": "docs/howard/Howard-Property-Proposal.pdf"}],
  'Howard Property — The Proposal', howard_vp,
  excise=("'<div class=\"property-info-section\">' +\n        '<h4>💡 About This Proposal</h4>'", "const HOWARD_BOUNDARY"))

# ============ SULPHUR MOUNTAIN ============
sulphur_status = {
  "today": {
    "badge": "🏡 Operating Property — Stewarded",
    "rows": [["Status", "Active property with residence, barn, garage & storage"],
             ["Community", "Current home of the eco-village founding team"],
             ["Acreage", "~93 ac on Sulphur Mountain Rd"]],
    "note": "Today mode shows the property as it operates right now — the four standing places you can visit on the map."
  },
  "vision": {
    "badge": "💰 Raise Open — $3,000,000",
    "rows": [["Goal", "$3M to acquire + develop"], ["Use of funds", "Property purchase + eco-village build-out"],
             ["Program", "18 projects — retreat village, farm, wellness, ceremony"],
             ["Stage", "Proposal — investment conversations open"]],
    "note": "The Vision shows the full Sulphur Mountain Eco-Village. The one-page raise summary is under Documents below."
  }
}
sulphur_vp = ('\n      ' + GALLERY + "\n      " + sec('🌿 The $3M Eco-Village Vision',
  "'<div style=\"background: linear-gradient(135deg, #f3eefc 0%, #fff8e6 100%); padding: 16px; border-radius: 10px; border-left: 4px solid #6a3d9a;\">' +\n"
  "          " + para("A working eco-village on Sulphur Mountain: 18 interconnected projects — a retreat village and glamping creek, regenerative agriculture and food forests, wellness and spa facilities, ceremony and creative spaces, mushroom cultivation, beekeeping, livestock and dairy — anchored by the residences that already stand.") + "\n"
  "          " + para("<strong>The raise:</strong> $3,000,000 secures the property and funds the first development wave. Explore every vision project by tapping the icons in Vision mode — each carries its budget, timeline and revenue picture.") + "\n"
  "        '</div>' +"))
inject('sulphur-mountain', sulphur_status,
  [{"label": "Sulphur Mountain — $3M Raise One-Pager (PDF)", "file": "docs/sulphur-mountain/Sulphur-Mountain-3M-OnePager.pdf"}],
  'Sulphur Mountain — The $3M Eco-Village Vision', sulphur_vp)

# ============ KERI'S ============
keris_status = {
  "today": {
    "badge": "🔒 Not For Sale — Family Stewardship",
    "rows": [["Status", "Held and stewarded within the family circle"],
             ["Role", "Anchor property of the community"],
             ["Acreage", "~34 ac · De La Garrigue Rd"]],
    "note": "Keri's land is not on the market and not for acquisition — it simply is, and it holds the circle."
  },
  "vision": {
    "badge": "🌸 Steady — No Development Planned",
    "rows": [["Plan", "Remains as it is"], ["Continues", "Ceremony space, guest house, family gatherings"]],
    "note": "The vision for this land is continuity — the same three places, kept alive and loved."
  }
}
keris_vp = ('\n      ' + GALLERY + "\n      " + sec('🌸 A Vision of Continuity',
  para("Some land is not for developing — it is for keeping. Keri's property remains exactly what it is today: the main house, the guest house, and the ceremony space, held in family stewardship as the quiet anchor of everything else on this map.")))
inject('keris-property', keris_status, [], "Keri's Property — Vision of Continuity", keris_vp)

# ============ CHER'S ============
chers_status = {
  "today": {
    "badge": "🏷️ For Sale Now — $2.2M (est.)",
    "rows": [["Status", "On the market"], ["Goal", "Acquire to keep in the family"],
             ["Needed", "≈ $2,200,000"], ["Condition", "Turn-key — finalized as it is"],
             ["Acreage", "2.0 ac · Encino Dr, Oak View"]],
    "note": "The mission here is simple: the house is for sale, and we want to bring it into the family circle before it goes to the open market."
  },
  "vision": {
    "badge": "🌹 Keep & Care — Family Home",
    "rows": [["Plan", "Preserve as-is under family stewardship"],
             ["Exploratory", "Possible second ADU — early idea only"],
             ["Depends on", "Outcome of the acquisition"]],
    "note": "The vision is intentionally light: first the home is secured, then — perhaps — a second ADU. Nothing here is committed; it lives on this map as a possibility."
  }
}
chers_vp = ('\n      ' + GALLERY + "\n      " + sec('🌹 The Vision — Keep It in the Family',
  para("Cher's place is already what it wants to be: a finished, loved home with the Quan Yin rose garden at its heart. The vision is to acquire it (≈ $2.2M) so it stays in the family — and to keep caring for it exactly as it is.") + "\n        " +
  para("<strong>One exploratory idea:</strong> a second ADU could one day join the property. It is an early thought, not a plan — shown here only so the possibility has a place on the map.")))
inject('chers-property', chers_status,
  [{"label": "Cher's Property — Family Acquisition One-Pager (PDF)", "file": "docs/chers-property/Chers-Property-OnePager.pdf"}],
  "Cher's Property — Family Stewardship", chers_vp)

# ============ ROSE VALLEY ============
rose_status = {
  "today": {
    "badge": "🏷️ For Sale — $810,000",
    "rows": [["Listing", "MLS V1-35138"], ["Acreage", "40.016 ac · OS-160 zoning"],
             ["Setting", "Private inholding surrounded by Los Padres National Forest"],
             ["Includes", "3bd/2ba home, owned solar, well, septic, creek, corrals"]],
    "note": "Today mode shows the listed property exactly as offered."
  },
  "vision": {
    "badge": "🌲 Acquisition Target — Wilderness Basecamp",
    "rows": [["Role", "Retreat & wilderness basecamp node of the network"],
             ["Next steps", "Licensed survey + offer"],
             ["Why", "Four-corner forest inholding — irreplaceable setting"]],
    "note": "A quiet outpost in the network of communities: base for retreats, trail journeys and dark-sky nights."
  }
}
rose_vp = ('\n      ' + GALLERY + "\n      " + sec('🌲 The Basecamp Vision',
  para("Forty acres alone inside the national forest: Rose Valley becomes the network's wilderness basecamp — a retreat outpost for trail journeys, star-filled ceremony nights and deep-quiet residencies, kept nearly as wild as we found it.") + "\n        " +
  para("<strong>Path:</strong> licensed boundary survey (the county fabric here is unsurveyed township land), then the offer. Asking price today: $810,000.")))
inject('rose-valley', rose_status, [], 'Rose Valley — Wilderness Basecamp Vision', rose_vp)

print('all five modules updated')
