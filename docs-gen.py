# V0.17 — generates the four property documents into docs/
#   docs/howard/Howard-Property-Proposal.pdf          (5-page personal proposal)
#   docs/black-mountain-ranch/Black-Mountain-Ranch-OnePager.pdf
#   docs/sulphur-mountain/Sulphur-Mountain-3M-OnePager.pdf
#   docs/chers-property/Chers-Property-OnePager.pdf
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, PageBreak, HRFlowable)

PURPLE = colors.HexColor('#5b2d91')
GOLD = colors.HexColor('#c9a227')
GREEN = colors.HexColor('#2e7d32')
INK = colors.HexColor('#232323')
SOFT = colors.HexColor('#666666')
PALE = colors.HexColor('#f5f1fb')
PALEG = colors.HexColor('#eef6ee')

ss = getSampleStyleSheet()
S = {
  'cover_title': ParagraphStyle('ct', parent=ss['Title'], fontName='Helvetica-Bold',
      fontSize=27, leading=33, textColor=PURPLE, alignment=TA_CENTER, spaceAfter=6),
  'cover_sub': ParagraphStyle('cs', parent=ss['Normal'], fontName='Helvetica',
      fontSize=13, leading=18, textColor=SOFT, alignment=TA_CENTER),
  'h1': ParagraphStyle('h1', parent=ss['Heading1'], fontName='Helvetica-Bold',
      fontSize=17, leading=22, textColor=PURPLE, spaceBefore=14, spaceAfter=8),
  'h2': ParagraphStyle('h2', parent=ss['Heading2'], fontName='Helvetica-Bold',
      fontSize=12.5, leading=16, textColor=GREEN, spaceBefore=10, spaceAfter=5),
  'body': ParagraphStyle('b', parent=ss['Normal'], fontName='Helvetica',
      fontSize=10.5, leading=15.5, textColor=INK, spaceAfter=7),
  'lead': ParagraphStyle('ld', parent=ss['Normal'], fontName='Helvetica',
      fontSize=11.5, leading=17, textColor=INK, spaceAfter=8),
  'small': ParagraphStyle('sm', parent=ss['Normal'], fontName='Helvetica',
      fontSize=9, leading=12.5, textColor=SOFT),
  'foot': ParagraphStyle('ft', parent=ss['Normal'], fontName='Helvetica-Oblique',
      fontSize=9, leading=12, textColor=SOFT, alignment=TA_CENTER),
}

def rule(color=GOLD, w='60%', th=1.6, before=4, after=10):
    return HRFlowable(width=w, thickness=th, color=color, spaceBefore=before,
                      spaceAfter=after, hAlign='CENTER')

LBL = ParagraphStyle('lbl', fontName='Helvetica', fontSize=9.5, leading=13, textColor=SOFT)
VAL = ParagraphStyle('val', fontName='Helvetica-Bold', fontSize=9.8, leading=13.5, textColor=INK)
HDR = ParagraphStyle('hdr', fontName='Helvetica-Bold', fontSize=10.5, leading=14, textColor=colors.white)

def kv_table(rows, header=None, col=(1.75, 4.65), accent=PURPLE, pale=PALE):
    data = []
    if header:
        data.append([Paragraph(str(header[0]), HDR), Paragraph(str(header[1]), HDR)])
    for r in rows:
        data.append([Paragraph(str(r[0]), LBL), Paragraph(str(r[1]), VAL)])
    t = Table(data, colWidths=[col[0] * inch, col[1] * inch])
    style = [
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LINEBELOW', (0, 0), (-1, -2), 0.4, colors.HexColor('#dddddd')),
        ('BACKGROUND', (0, 0), (-1, -1), pale),
        ('BOX', (0, 0), (-1, -1), 0.8, accent),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]
    if header:
        style += [('BACKGROUND', (0, 0), (-1, 0), accent)]
    t.setStyle(TableStyle(style))
    return t

MAPNOTE = ('Explore this property on the interactive map: '
           '<b>howard-property-dev.vercel.app</b> — the <b>Today</b> toggle shows the '
           'property exactly as it is; the <b>Vision</b> toggle shows the proposed potential. '
           'Press the 3D button to fly the land in three dimensions.')
CONTACT = ('<b>Paul Muresan</b> · paulmuresan77@gmail.com &nbsp;&nbsp;|&nbsp;&nbsp; '
           '<b>Mark Panics</b> · markeduardpancis@gmail.com')

def build(path, story):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    SimpleDocTemplate(path, pagesize=letter, topMargin=0.9 * inch,
                      bottomMargin=0.8 * inch, leftMargin=0.95 * inch,
                      rightMargin=0.95 * inch, title=os.path.basename(path)[:-4],
                      author='Paul Muresan', invariant=1).build(story)
    print('built', path, os.path.getsize(path), 'bytes')

P = Paragraph
def sp(h=10): return Spacer(1, h)

# ============================================================ HOWARD PROPOSAL
st = []
st += [sp(90), P('A Proposal for the<br/>Howard Property', S['cover_title']), rule(),
       P('1320 Baldwin Rd, Ojai, California · ~44 acres', S['cover_sub']), sp(6),
       P('Prepared for <b>Howard</b> by <b>Paul Muresan</b> · August 2026', S['cover_sub']), sp(140),
       P('“You said you would love to see agriculture happen on this land —<br/>'
         'and asked for ideas. This is mine.”', ParagraphStyle('q', parent=S['cover_sub'],
         fontName='Helvetica-Oblique', fontSize=12, leading=18, textColor=PURPLE)), sp(120),
       P(MAPNOTE, S['foot']), PageBreak()]

st += [P('Dear Howard,', S['h1']),
  P('Thank you for the openness you have shown — both with your land and with the idea that '
    'something meaningful could grow on it. You mentioned you would welcome agricultural '
    'projects and asked for ideas. I have taken that invitation seriously. This document, and '
    'the interactive map that comes with it, are my answer.', S['lead']),
  P('First, who I am. I am a property developer and a software developer, an entrepreneur and '
    'a builder — a creative mind that likes to make things real. I develop land and I develop '
    'technology, and my favorite work is where the two meet: regenerative projects that are '
    'planned well, built by hand, and documented beautifully. The living 3D map of your '
    'property that accompanies this proposal is a small taste of how I work.', S['body']),
  P('My situation is simple: I am transitioning from my current base on Sulphur Mountain and '
    'I am looking for my next home — not just a place to stay, but a place to pour myself '
    'into. When I think about where the next years of my energy should go, I keep coming '
    'back to your 44 acres on Baldwin Road.', S['body']),
  P('What I See in Your Land', S['h1']),
  P('Raw land is potential in its purest form. Your property has water possibilities, sun, '
    'good bones, and room for real agriculture — and it sits in a valley where regenerative '
    'projects thrive and neighbors pay attention to land done well. The full picture lives on '
    'the map, but the heart of it is agriculture-first: soil, food, and living systems, '
    'built in an order that makes each step pay for the next.', S['body']),
  sp(4),
  kv_table([
    ['The offer', 'I develop your land — hands-on, phase by phase, at my cost in labor and craft'],
    ['The ask', 'A home base on the land while I do it — starting small, growing only with your blessing'],
    ['The spirit', 'Everything is a conversation. We build only what we agree on.'],
  ], accent=PURPLE),
  PageBreak()]

st += [P('The Vision — Thirteen Projects, Agriculture First', S['h1']),
  P('Each of these lives as an icon on the interactive map — tap any of them to see its story, '
    'budget thinking, and place on the land. Positions are suggestions, not commitments.', S['body']),
  P('Growing Systems', S['h2']),
  kv_table([
    ['Hugelkultur Beds', 'Buried-wood raised beds that hold water through the dry season — first soil built'],
    ['Property Nursery', 'Native + food-tree nursery; plants for the land first, sales later'],
    ['Mushroom Cultivation', 'Container-based gourmet mushroom production — fast yield, small footprint'],
    ['Beekeeping', 'Pollination for everything else + honey; quiet corners of the land'],
    ['Livestock Rotation', 'Small rotating herd — fertility on legs, fire-fuel reduction'],
    ['Compost Operation', 'The engine: turns ranch + community waste into the soil bank'],
    ['Growing Dome', 'Year-round protected growing; seedlings and greens'],
  ], accent=GREEN, pale=PALEG),
  P('Living & Community', S['h2']),
  kv_table([
    ['Pond & Swimming Hole', 'Water feature restored for irrigation storage + summer life'],
    ['Community Workshop', 'The existing studio grows into a real workshop — tools, repair, making'],
    ['Community Hub', 'A small cob-style cabin — my proposed home base and the land&#39;s welcome point'],
    ['Nature Gym', 'Simple outdoor training among the oaks'],
    ['Sacred Spaces', 'Quiet places to sit with the land'],
    ['Main House', 'Untouched — your home remains the heart of the property'],
  ], accent=GREEN, pale=PALEG),
  PageBreak()]

st += [P('How It Would Flow', S['h1']),
  kv_table([
    ['Phase 1 · months 0–6', 'Arrive & prove: settle into the studio, first hugelkultur beds, compost running, nursery started. Small, visible, real.'],
    ['Phase 2 · months 6–18', 'Grow: mushrooms, bees, livestock rotation, pond restored, workshop humming.'],
    ['Phase 3 · 18+ months', 'Flourish: the full thirteen-project vision — a regenerative homestead that feeds and teaches.'],
  ], accent=PURPLE),
  P('Principles', S['h1']),
  P('<b>1. Your land, your call.</b> Every project starts as a conversation and ends where you '
    'want it to end. Nothing irreversible happens without your explicit yes.', S['body']),
  P('<b>2. Phase by phase.</b> Each phase is small enough to stop, good enough to keep. I '
    'prove value before asking for more room.', S['body']),
  P('<b>3. Documented like software.</b> Everything gets mapped, photographed and written up — '
    'the interactive map stays living documentation of what we build. You will always know '
    'exactly what is happening on your land.', S['body']),
  P('<b>4. Agriculture first.</b> The order of work follows your wish: soil, water, food. The '
    'community pieces only grow around a working agricultural core.', S['body']),
  P('What I Bring, Concretely', S['h1']),
  P('Hands: carpentry, earthworks, systems building, animal care. Head: project planning, '
    'budgeting, software, mapping, documentation — I built the interactive map and this whole '
    'platform myself. Heart: I am not looking for a landlord; I am looking for land to serve '
    'and a neighbor to build trust with.', S['body']),
  PageBreak()]

st += [sp(60), P('Next Step', S['h1']),
  P('Walk the land with me. Bring this map on a phone — stand on the spots, move the icons '
    'where you feel they belong (the map lets us reposition everything live), and tell me '
    'what excites you and what does not. From there we shape Phase 1 together.', S['lead']),
  sp(10), rule(color=PURPLE),
  P(MAPNOTE, S['body']), sp(16), P(CONTACT, S['body']), sp(40),
  P('With respect and excitement,', S['body']),
  P('<b>Paul Muresan</b>', S['lead']),
  P('Property developer · software developer · entrepreneur · builder', S['small'])]
build('docs/howard/Howard-Property-Proposal.pdf', st)

# ============================================================ BMR ONE-PAGER
st = [P('Black Mountain Ranch', S['cover_title']), rule(),
  P('8434 Ojai Santa Paula Rd · 63 county parcels · 3,380 recorded acres (~3,600 gross)', S['cover_sub']), sp(14),
  P('The Opportunity', S['h1']),
  P('A complete, working trophy ranch on the market — main lodge compound, guest homes, '
    'barns and corrals, a stocked lake, working cattle operations, fields, orchards and '
    'miles of trails. Every parcel line on our map is a county-recorded boundary.', S['body']),
  kv_table([
    ['Acquisition', '$50,000,000 — the entire ranch, 63 parcels'],
    ['Initial development', '$50,000,000+ — first wave'],
    ['Full master plan', '$250M build-out'],
    ['Projected value', '$1B+ ecosystem'],
  ], header=['The Numbers', ''], accent=PURPLE),
  P('The Vision — Lemuria Headquarters', S['h1']),
  P('<b>Phase 1 ($50M + $50M+):</b> acquisition plus ten fireproof premium homes on 40-acre '
    'lots and core infrastructure. <b>Phase 2 (to $250M):</b> the Lemuria zones — Chumash '
    'Village, Temple of the White Buffalo with the Indigenous University, buffalo rewilding, '
    'Lemuria Studios, regenerative agriculture — plus the hospitality network. '
    '<b>Phase 3:</b> the $1B+ global ecosystem.', S['body']),
  P('What Stands Today', S['h1']),
  P('13,250 sq ft main lodge at the 8434 compound · guest house & cottages · carriage house '
    '· auto gallery · horse barn & corrals · working fields & orchards · stocked fishing '
    'lake · ranch trails across the ridgelines. Everything that stands today remains in the '
    'vision.', S['body']),
  sp(6), rule(color=PURPLE), P(MAPNOTE, S['body']), sp(8), P(CONTACT, S['body'])]
build('docs/black-mountain-ranch/Black-Mountain-Ranch-OnePager.pdf', st)

# ============================================================ SULPHUR ONE-PAGER
st = [P('Sulphur Mountain Eco-Village', S['cover_title']), rule(),
  P('Sulphur Mountain Rd, Ojai · ~93 acres · operating property', S['cover_sub']), sp(14),
  P('The Raise — $3,000,000', S['h1']),
  P('Three million dollars secures the property and funds the first development wave of a '
    'working eco-village: eighteen interconnected projects on land that already lives and '
    'operates today.', S['body']),
  kv_table([
    ['Goal', '$3,000,000 — acquisition + first development wave'],
    ['Standing today', 'Main residence, barn, garage & storage structures'],
    ['Program', '18 projects — retreat village, farm systems, wellness, ceremony'],
    ['Stage', 'Proposal — investment conversations open'],
  ], header=['At a Glance', ''], accent=PURPLE),
  P('The Vision', S['h1']),
  P('A retreat village and glamping creek · regenerative agriculture, food forests and a '
    'farmstead produce stand · wellness & spa facilities · ceremony and creative spaces '
    '(McQueen&#39;s garage becomes a gathering and music space) · mushroom cultivation, '
    'beekeeping, livestock & dairy · a tropical dome greenhouse — all anchored by the '
    'residences that already stand.', S['body']),
  P('Why It Works', S['h1']),
  P('The property operates today — this is not bare-land speculation. Each of the eighteen '
    'projects carries its own budget, timeline and revenue picture on the interactive map: '
    'flip to Vision mode and tap any icon.', S['body']),
  sp(6), rule(color=PURPLE), P(MAPNOTE, S['body']), sp(8), P(CONTACT, S['body'])]
build('docs/sulphur-mountain/Sulphur-Mountain-3M-OnePager.pdf', st)

# ============================================================ CHER'S ONE-PAGER
st = [P('Cher&#39;s Property', S['cover_title']), rule(),
  P('10622 Encino Dr, Oak View · 2.0 acres · turn-key home + Quan Yin rose garden', S['cover_sub']), sp(14),
  P('The Mission — Keep It in the Family', S['h1']),
  P('The house is on the market now. The goal is simple and time-sensitive: acquire it '
    'before it goes to an outside buyer, so it stays inside the family circle that loves '
    'it. The property is finished — no development needed, nothing to fix.', S['body']),
  kv_table([
    ['Status', 'For sale — on the market now'],
    ['Needed', '≈ $2,200,000'],
    ['Condition', 'Turn-key, finalized as it is'],
    ['Heart of it', 'The Quan Yin rose garden — statue, roses, fruit trees, winding paths'],
  ], header=['At a Glance', ''], accent=PURPLE),
  P('The Vision — Intentionally Light', S['h1']),
  P('First the home is secured. Then it is simply kept and cared for. One exploratory idea '
    'lives on the map — a possible second ADU — but it is an early thought, not a plan, and '
    'depends entirely on how the acquisition unfolds.', S['body']),
  sp(6), rule(color=PURPLE), P(MAPNOTE, S['body']), sp(8), P(CONTACT, S['body'])]
build('docs/chers-property/Chers-Property-OnePager.pdf', st)

print('all four documents built')
