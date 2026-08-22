# V0.17 — generates the four property documents into docs/
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

# Howard documents moved to brochures-gen.py (V0.18 \u2014 two Otto-style brochures).

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
