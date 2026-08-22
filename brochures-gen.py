# V0.18 — the two Howard documents, designed after the Immanuel Otto brochure:
#   docs/howard/Paul-Muresan-Brochure.pdf          (who Paul is — land, code & craft)
#   docs/howard/Howard-Property-Land-Potential.pdf (the land today + the development picture)
# Cream paper, serif display, tracked small-caps kickers, proposal callout,
# two-column ruled sections, italic pull-quotes, green CTA band. Core fonts only
# (Times/Helvetica) so the bytes are fully reproducible (invariant=1).
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                Spacer, Table, TableStyle, NextPageTemplate,
                                PageBreak, HRFlowable, KeepTogether)

W, H = letter
CREAM = colors.HexColor('#F7F3EB')
INK = colors.HexColor('#2B2416')
BROWN = colors.HexColor('#6B5D48')
KICK = colors.HexColor('#8A6D3B')
GREEN = colors.HexColor('#3D5636')
GREENL = colors.HexColor('#5A7048')
BRICK = colors.HexColor('#8A3324')
PANEL = colors.HexColor('#EDE8DC')
RULE = colors.HexColor('#C9C0AE')
QUOTE = colors.HexColor('#55663F')
CTA_TXT = colors.HexColor('#DFE7D5')

MARG = 0.78 * inch
USABLE = W - 2 * MARG
COL = (USABLE - 0.28 * inch) / 2

def track(t):
    return ' '.join(t) if False else ' '.join(t)

def kicker_text(words):
    return '&nbsp;&nbsp;&nbsp;'.join(' '.join(w) for w in words.split(' '))

ST = {
 'kicker': ParagraphStyle('k', fontName='Helvetica-Bold', fontSize=8, leading=11,
     textColor=KICK, spaceAfter=6),
 'display': ParagraphStyle('d', fontName='Times-Bold', fontSize=23.5, leading=26.5,
     textColor=INK, spaceAfter=7),
 'sub': ParagraphStyle('s', fontName='Times-Italic', fontSize=11.6, leading=15.5,
     textColor=BROWN, spaceAfter=8),
 'sect': ParagraphStyle('sec', fontName='Helvetica-Bold', fontSize=8.6, leading=11,
     textColor=INK, spaceBefore=0, spaceAfter=2),
 'body': ParagraphStyle('b', fontName='Helvetica', fontSize=9.2, leading=13.1,
     textColor=INK, spaceAfter=6),
 'dash': ParagraphStyle('da', fontName='Helvetica', fontSize=9.2, leading=12.8,
     textColor=INK, spaceAfter=5, leftIndent=10, firstLineIndent=-10),
 'quote': ParagraphStyle('q', fontName='Times-Italic', fontSize=12.6, leading=17.5,
     textColor=QUOTE, alignment=TA_CENTER, spaceBefore=4, spaceAfter=4),
 'callout_label': ParagraphStyle('cl', fontName='Helvetica-Bold', fontSize=8,
     leading=10, textColor=GREEN, spaceAfter=4),
 'callout_head': ParagraphStyle('ch', fontName='Times-Bold', fontSize=14.5,
     leading=18, textColor=INK, spaceAfter=6),
 'callout_body': ParagraphStyle('cb', fontName='Helvetica', fontSize=9.2,
     leading=13.4, textColor=INK),
 'pill': ParagraphStyle('p', fontName='Helvetica-Bold', fontSize=8.4, leading=10,
     textColor=colors.white),
 'cred_label': ParagraphStyle('crl', fontName='Helvetica-Bold', fontSize=7.6,
     leading=10, textColor=KICK, alignment=TA_CENTER, spaceAfter=3),
 'cred': ParagraphStyle('cr', fontName='Times-Roman', fontSize=9.4, leading=12,
     textColor=INK, alignment=TA_CENTER),
 'photocap': ParagraphStyle('pc', fontName='Helvetica', fontSize=7.6, leading=10.5,
     textColor=BROWN, spaceAfter=2),
 'cta_head': ParagraphStyle('cth', fontName='Times-Bold', fontSize=15.5, leading=19,
     textColor=colors.white, spaceAfter=5),
 'cta_body': ParagraphStyle('ctb', fontName='Helvetica', fontSize=8.8, leading=12.6,
     textColor=CTA_TXT, spaceAfter=8),
 'cta_label': ParagraphStyle('ctl', fontName='Helvetica-Bold', fontSize=7,
     leading=9, textColor=colors.HexColor('#A9BC97'), spaceAfter=2),
 'cta_val': ParagraphStyle('ctv', fontName='Times-Bold', fontSize=10.5, leading=13,
     textColor=colors.white),
 'p2title': ParagraphStyle('p2', fontName='Times-Bold', fontSize=19, leading=23,
     textColor=INK),
 'p2id': ParagraphStyle('p2i', fontName='Helvetica', fontSize=7.8, leading=10,
     textColor=BROWN, alignment=2),
}

def P(t, s): return Paragraph(t, ST[s])
def sp(h): return Spacer(1, h)

def sect_header(title):
    return [P(kicker_text(title.upper()), 'sect'),
            HRFlowable(width='100%', thickness=0.8, color=RULE, spaceBefore=1.5, spaceAfter=7)]

def two_col(left, right, pad_top=0):
    t = Table([[left, right]], colWidths=[COL, COL], hAlign='CENTER',
              style=TableStyle([
                  ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                  ('LEFTPADDING', (0, 0), (0, 0), 0),
                  ('RIGHTPADDING', (0, 0), (0, 0), 0.14 * inch),
                  ('LEFTPADDING', (1, 0), (1, 0), 0.14 * inch),
                  ('RIGHTPADDING', (1, 0), (1, 0), 0),
                  ('TOPPADDING', (0, 0), (-1, -1), pad_top),
                  ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
              ]))
    return t

def callout(label, head, body_lines):
    inner = [P(kicker_text(label.upper()), 'callout_label'), P(head, 'callout_head')]
    for b in body_lines:
        inner.append(P(b, 'callout_body'))
    return Table([[inner]], colWidths=[USABLE], hAlign='CENTER', style=TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PANEL),
        ('LINEBEFORE', (0, 0), (0, -1), 3, GREEN),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))

def pill(text):
    return Table([[P(kicker_text(text.upper()), 'pill')]], hAlign='LEFT', style=TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BRICK),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))

def quote_block(text):
    return [sp(3), P('“' + text + '”', 'quote'), sp(3)]

def cta_band(head, body, cells):
    grid = Table([[ [P(kicker_text(lbl.upper()), 'cta_label'), P(val, 'cta_val')] for lbl, val in cells ]],
                 colWidths=[(USABLE - 28) / len(cells)] * len(cells),
                 style=TableStyle([
                     ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                     ('LEFTPADDING', (0, 0), (-1, -1), 0),
                     ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                     ('LINEABOVE', (0, 0), (-1, 0), 0.6, colors.HexColor('#5c7350')),
                     ('TOPPADDING', (0, 0), (-1, -1), 8),
                 ]))
    inner = [P(head, 'cta_head'), P(body, 'cta_body'), grid]
    return Table([[inner]], colWidths=[USABLE], hAlign='CENTER', style=TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), GREEN),
        ('LEFTPADDING', (0, 0), (-1, -1), 16),
        ('RIGHTPADDING', (0, 0), (-1, -1), 16),
        ('TOPPADDING', (0, 0), (-1, -1), 14),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
    ]))

def make_doc(path, header_name, header_right, foot_left, foot_right_p1, foot_right_p2, story):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    def paint(canv, doc, foot_right):
        canv.saveState()
        canv.setFillColor(CREAM)
        canv.rect(0, 0, W, H, stroke=0, fill=1)
        # header
        canv.setFillColor(INK)
        canv.setFont('Times-Bold', 15)
        canv.drawString(MARG, H - 0.62 * inch, header_name)
        canv.setFont('Helvetica', 7.8)
        canv.setFillColor(BROWN)
        canv.drawRightString(W - MARG, H - 0.60 * inch, header_right)
        canv.setStrokeColor(INK)
        canv.setLineWidth(1.1)
        canv.line(MARG, H - 0.74 * inch, W - MARG, H - 0.74 * inch)
        # footer
        canv.setStrokeColor(RULE)
        canv.setLineWidth(0.7)
        canv.line(MARG, 0.62 * inch, W - MARG, 0.62 * inch)
        canv.setFont('Helvetica', 7.4)
        canv.setFillColor(BROWN)
        canv.drawString(MARG, 0.46 * inch, foot_left)
        canv.drawRightString(W - MARG, 0.46 * inch, foot_right)
        canv.restoreState()
    frame = Frame(MARG, 0.80 * inch, USABLE, H - 0.80 * inch - 0.98 * inch,
                  leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc = BaseDocTemplate(path, pagesize=letter, title=os.path.basename(path)[:-4],
                          author='Paul Muresan', invariant=1)
    doc.addPageTemplates([
        PageTemplate(id='p1', frames=[frame], onPage=lambda c, d: paint(c, d, foot_right_p1)),
        PageTemplate(id='p2', frames=[frame], onPage=lambda c, d: paint(c, d, foot_right_p2)),
    ])
    doc.build([NextPageTemplate('p2')] + story)
    print('built', path, os.path.getsize(path), 'bytes')

MAP = 'howard-property-dev.vercel.app'

# ==============================================================================
# DOC A — PAUL MURESAN: LAND, CODE & CRAFT
# ==============================================================================
who_l = sect_header('Who I Am') + [
  P('I am a visionary, a designer, a creator — an action taker and a trailblazer. I see '
    'what land can become, design the path, and bring together the people who make it '
    'real. I develop properties and technology as one craft.', 'body'),
  P('I orchestrate teams and workflows toward a shared mission, while the digital layer '
    'I create myself — living maps, 3D worlds, platforms — keeps every project visible. '
    'Most recently: landscape &amp; regenerative lead of an Ojai eco-village.', 'body'),
]
what_r = sect_header('What I’m Looking For') + [
  P('A <b>home base on land with potential</b> — a place to live simply (a studio, cabin '
    'or small dwelling to start) in exchange for leading the property&#8217;s development, phase '
    'by phase, with the owner’s blessing at every step.', 'body'),
  P('The right land has more potential than its owner has time for — and an owner who '
    'wants to see it come alive without carrying the work alone. Ojai Valley first; long '
    'enough to matter. I put down roots, I don’t pass through.', 'body'),
]
kind_l = sect_header('The Kind of Partner I Am') + [
  P('Everything in writing, everything visible. Projects begin as conversations, get '
    'agreed on paper, then get built — documented with photos, budgets and a living map '
    'the owner can open any day. Nothing irreversible without an explicit yes; phases '
    'small enough to stop, good enough to keep.', 'body'),
]
why_r = sect_header('Why Now') + [
  P('I am transitioning from my current base on Sulphur Mountain and choosing the next '
    'chapter deliberately. I am not looking for a room — I am looking for the land where '
    'the next years of my energy belong. <b>Available now; ready to walk a property this '
    'week.</b>', 'body'),
]

docA = [
  P(kicker_text('OJAI VALLEY · VISIONARY · DESIGNER · CREATOR · TRAILBLAZER'), 'kicker'),
  P('Land, Code &amp; Vision —<br/>a Visionary Looking for<br/>His Next Ground.', 'display'),
  P('Vision, design and team orchestration — full land development led end to end, '
    'offered in exchange for a home base on the right property.', 'sub'),
  pill('Available now · Ojai Valley · ready to walk your land'),
  sp(10),
  callout('The Offer', 'I lead your land&#8217;s development — you keep the land, the harvest, and the story.',
    ['I design the vision, assemble the right hands, and navigate the teams that make it '
     'real — agriculture, water, structures, living systems. Alongside it, the layer almost '
     'nobody else brings: <b>a living interactive map of your property</b>, proposals, '
     'budgets and documentation of everything that happens. '
     '<b>Real leadership, real schedules, real accountability.</b>']),
  sp(12),
  two_col(who_l, what_r),
  *quote_block('I don’t develop properties from a distance — I live on them, '
              'design their becoming, and give them a digital soul.'),
  two_col(kind_l, why_r),
  sp(6),
  P(kicker_text('PROJECTS & PLATFORMS'), 'cred_label'),
  P('Sulphur Mountain Eco-Village · The Ojai Valley Living Map (2D/3D) · '
    'Lemuria Life · Black Mountain Ranch Vision · Rose Valley Basecamp Study', 'cred'),
  PageBreak(),
  # -------- page 2 --------
  two_col(
    [P('The Practical Side', 'p2title')],
    [sp(6), P('Paul Muresan · Land, Code &amp; Vision', 'p2id')]),
  sp(10),
  two_col(
    sect_header('How I Develop Land') + [
      P('–  <b>Vision &amp; master design:</b> the whole property thought as one living '
        'system — agriculture, water, structures, gathering places.', 'dash'),
      P('–  <b>Teams, not solo hands:</b> I assemble the right specialists, crews and '
        'collaborators for each project, and navigate them through the work.', 'dash'),
      P('–  <b>Workflow &amp; accountability:</b> plans, schedules and budgets that keep '
        'every hand moving toward the same mission.', 'dash'),
      P('–  <b>Regenerative systems:</b> hugelkultur, nurseries, mushrooms, bees, '
        'rotational livestock, compost — designed into one interlocking whole.', 'dash'),
    ] + [sp(6)] + sect_header('What I Build in Code') + [
      P('–  <b>Living property maps:</b> interactive 2D/3D maps with real county '
        'parcel data, project layers and photo galleries — see Recent Work.', 'dash'),
      P('–  <b>Proposals &amp; investor documents</b> that make land visions '
        'concrete: budgets, phases, one-pagers, full decks.', 'dash'),
      P('–  <b>Platforms &amp; automation</b> for managing projects, communities '
        'and property operations.', 'dash'),
      P('–  <b>Tomorrow:</b> AR/VR-ready digital twins of real properties — '
        'the direction my whole stack is pointed.', 'dash'),
    ],
    sect_header('What I’m Proposing') + [
      P('–  <b>A home base</b> — studio, cabin or small dwelling on your land, '
        'starting simple and growing only with your blessing.', 'dash'),
      P('–  <b>Leadership as the trade:</b> vision, design, orchestration and digital '
        'platforms against the arrangement — and every project carries its own plan, '
        'budget and crew, funded as we agree before it begins.', 'dash'),
      P('–  <b>Phased agreements in writing</b> — settled together on a '
        'walkthrough, once we both see what the land actually needs.', 'dash'),
      P('–  <b>A term long enough to be worth both our while.</b>', 'dash'),
    ] + [sp(6)] + sect_header('How This Could Look') + [
      P('–  <b>Raw land with a vision</b> — the first phase proves value in months, '
        'not years, and we grow from there.', 'dash'),
      P('–  <b>An operating property</b> that needs a steward-partner to carry '
        'projects the owner cannot.', 'dash'),
      P('–  <b>An acquisition project</b> that needs a development partner with '
        'vision, teams and platforms.', 'dash'),
    ] + [sp(6)] + sect_header('Recent Work') + [
      P('<b>The Ojai Valley Living Map</b> — six real properties, county-true parcel '
        'lines, a Today / Vision toggle, and a 3D globe you can fly — designed and '
        'built solo, live at <b>' + MAP + '</b>.', 'body'),
      P('<b>Sulphur Mountain Eco-Village</b> — landscape &amp; regenerative lead: '
        '18-project vision, operations and land care on ~93 acres.', 'body'),
    ]),
  *quote_block('If you have land with more potential than you have time for — '
              'that is exactly where I belong.'),
  sp(4),
  cta_band('Let’s talk, then walk your land.',
    'The right arrangement is settled in person. A conversation first, then a walkthrough — '
    'and we will both know quickly whether it fits.',
    [('Email', 'paulmuresan77@gmail.com'), ('The Living Map', MAP), ('Based', 'Ojai Valley, CA')]),
]
make_doc('docs/howard/Paul-Muresan-Brochure.pdf',
         'Paul Muresan', 'Ojai Valley, California · paulmuresan77@gmail.com · ' + MAP,
         'Paul Muresan · Ojai Valley', 'The practical side overleaf →',
         'Land, Code & Vision · available now', docA)

# ==============================================================================
# DOC B — THE HOWARD PROPERTY: LAND & POTENTIAL
# ==============================================================================
offer_l = sect_header('What the Land Offers') + [
  P('Scale that means freedom: forty-four acres under Open Space zoning, in a valley '
    'where regenerative projects thrive and neighbors notice land done well.', 'body'),
  P('A working spine already in place — the residence, a studio ready to become a real '
    'workshop, first hugelkultur beds and animals on the ground. The land has begun; '
    'it is asking to continue.', 'body'),
  P('Protected beauty: scenic-resource and dark-sky overlays keep this corner of Baldwin '
    'Road the kind of quiet that is disappearing from the valley.', 'body'),
]
carry_r = sect_header('What It Could Carry') + [
  P('A full <b>regenerative agriculture homestead</b>: growing systems that feed people '
    'and build soil — hugelkultur, nursery, mushrooms, bees, rotational livestock, '
    'compost, a growing dome.', 'body'),
  P('A <b>living-and-community layer</b> that grows only as wanted: the restored pond, '
    'the workshop, a small welcome cabin, quiet sacred spaces among the oaks.', 'body'),
  P('All thirteen projects live as icons on the interactive map — every one placed as a '
    'suggestion, every one a conversation.', 'body'),
]

docB = [
  P(kicker_text('OJAI · BALDWIN ROAD · 44 ACRES · AGRICULTURE INVITED'), 'kicker'),
  P('Forty-Four Acres,<br/>Waiting to Become<br/>a Farm.', 'display'),
  P('A land study and development vision for Howard — what the property truly is today, '
    'and everything it could grow into.', 'sub'),
  pill('Prepared for Howard · by Paul Muresan · August 2026'),
  sp(10),
  callout('The Land Today', '~44.1 acres of raw potential with a working spine.',
    ['<b>1320 Baldwin Rd, Ojai</b> · APN 032-0-010-090 · County unincorporated · '
     '~44.1 acres per County GIS · <b>OS-40 zoning</b> (Open Space, 40-acre minimum) with '
     'Scenic Resource Protection, Dark Sky, Habitat Connectivity &amp; Wildlife Corridor and '
     'Temporary Rental Unit overlays. Standing today: the main residence, a studio, first '
     'hugelkultur beds and livestock. The rest is open land — raw, quiet, and full of room.']),
  sp(12),
  two_col(offer_l, carry_r),
  *quote_block('Raw land is potential in its purest form — and this land has '
              'already taken its first breath.'),
  sp(2),
  P(kicker_text('SEE IT LIVE'), 'cred_label'),
  P('The interactive map at <b>' + MAP + '</b> shows this property two ways: '
    '<b>Today</b> — exactly as it is · <b>Vision</b> — everything below, placed on '
    'the real land · and in full 3D.', 'cred'),
  PageBreak(),
  # -------- page 2 --------
  two_col(
    [P('The Development Picture', 'p2title')],
    [sp(6), P('The Howard Property · 1320 Baldwin Rd, Ojai', 'p2id')]),
  sp(12),
  two_col(
    sect_header('Growing Systems') + [
      P('–  <b>Hugelkultur beds</b> — buried-wood beds that hold water through '
        'the dry season; the first are already in the ground.', 'dash'),
      P('–  <b>Property nursery</b> — natives and food trees; plants for this '
        'land first, sales later.', 'dash'),
      P('–  <b>Mushroom cultivation</b> — container-based gourmet production; '
        'fast yield, small footprint.', 'dash'),
      P('–  <b>Beekeeping</b> — pollination for everything else, honey besides.', 'dash'),
      P('–  <b>Livestock rotation</b> — fertility on legs, fire-fuel reduction.', 'dash'),
      P('–  <b>Compost operation</b> — the engine that turns waste into the '
        'soil bank.', 'dash'),
      P('–  <b>Growing dome</b> — year-round protected growing.', 'dash'),
    ] + [sp(6)] + sect_header('Living & Community') + [
      P('–  <b>Pond &amp; swimming hole</b> restored — irrigation storage plus '
        'summer life.', 'dash'),
      P('–  <b>Community workshop</b> — the studio grown into a real makerspace.', 'dash'),
      P('–  <b>Welcome cabin</b> — a small cob-style dwelling; the land’s '
        'front door and Paul’s proposed home base.', 'dash'),
      P('–  <b>Nature gym &amp; sacred spaces</b> — simple, quiet, among the oaks.', 'dash'),
      P('–  <b>The main house — untouched.</b> Howard’s home remains the '
        'heart of the property.', 'dash'),
    ],
    sect_header('The Phased Path') + [
      P('–  <b>Phase 1 · months 0–6 — arrive &amp; prove:</b> studio settled, '
        'first beds built, compost running, nursery started. Small, visible, real.', 'dash'),
      P('–  <b>Phase 2 · months 6–18 — grow:</b> mushrooms, bees, livestock '
        'rotation, the pond restored, the workshop humming.', 'dash'),
      P('–  <b>Phase 3 · beyond — flourish:</b> the full thirteen-project '
        'homestead that feeds, teaches, and makes the land more alive every season.', 'dash'),
    ] + [sp(6)] + sect_header('Stewardship Principles') + [
      P('–  <b>Your land, your call.</b> Nothing irreversible without an '
        'explicit yes.', 'dash'),
      P('–  <b>Phase by phase.</b> Each phase small enough to stop, good '
        'enough to keep.', 'dash'),
      P('–  <b>Documented like software.</b> Mapped, photographed, written up — '
        'the living map stays your window into your own land.', 'dash'),
      P('–  <b>Agriculture first.</b> Soil, water and food lead; community '
        'pieces grow only around a working agricultural core.', 'dash'),
    ] + [sp(6)] + sect_header('Who Would Bring It to Life') + [
      P('Paul Muresan — visionary, designer and creator; landscape &amp; regenerative '
        'lead of the Sulphur Mountain Eco-Village and creator of the valley’s living '
        'property map. He designs the vision and orchestrates the teams that make it '
        'real. His own brochure accompanies this one.', 'body'),
    ]),
  *quote_block('Everything here is a conversation starter — nothing is final '
              'until we shape it together on the land.'),
  sp(4),
  cta_band('Walk the land, then decide together.',
    'Bring the map on a phone, stand on the spots, move any icon where it belongs. '
    'From there, Phase 1 shapes itself.',
    [('Paul', 'paulmuresan77@gmail.com'), ('Mark', 'markeduardpancis@gmail.com'),
     ('The Living Map', MAP)]),
]
make_doc('docs/howard/Howard-Property-Land-Potential.pdf',
         'The Howard Property', '1320 Baldwin Rd, Ojai · prepared by Paul Muresan · August 2026',
         'The Howard Property · Ojai, California', 'The development picture overleaf →',
         'A study in potential · August 2026', docB)

print('both brochures built')
