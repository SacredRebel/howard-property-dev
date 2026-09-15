// The HUD. Top bar (mode, year, breadcrumb), left dock (layer library), right
// inspector (legend / parcel), bottom timeline (aerial flights + historic
// topo), bottom-right controls (compass, 2D/3D, terrain, quality, fps) and
// the hotkeys. Plain DOM, no framework, one CSS file.
import maplibregl from 'maplibre-gl';
import type { Engine } from '../engine/map';
import { BASE_LABELS, ml } from '../engine/map';
import { GROUPS, OVERLAYS, FLIGHTS, HIST_YEARS, HIST_NOTES, overlayById, histYear, type OverlayDef } from '../layers/registry';
import { legendFor } from '../layers/legend';
import type { PropertyLayer, Property, Zone, LotPick } from '../data/properties';
import { galleryFor, galleryHTML, wireGallery, isOpen as lightboxOpen } from './gallery';
import { Editor } from './editor';

interface RichProperty extends Property { panel?: { title: string; html: string }; visionPanel?: { title: string; html: string }; cta?: { heading?: string; paragraph?: string; contacts?: { name: string; email: string }[]; buttons?: { label: string; url: string }[] }; }
const stripClassicGallery = (html: string) => html.replace(/<div class="image-gallery-section"[\s\S]*?<\/div><\/div><\/div>/, '');
function lotBoundsCenter(rings: [number, number][][]): [number, number] { let la = 0, lo = 0, n = 0; for (const r of rings) for (const q of r) { la += q[0]; lo += q[1]; n++; } return n ? [la / n, lo / n] : [0, 0]; }
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const el = (html: string) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild as HTMLElement; };

export interface HudOpts { eng: Engine; props: PropertyLayer; mode: 'today' | 'vision'; onMode: (m: 'today' | 'vision') => void; }

export class Hud {
  root: HTMLElement;
  private eng: Engine;
  private props: PropertyLayer;
  private mode: 'today' | 'vision';
  private onMode: (m: 'today' | 'vision') => void;
  private peek = new Set<string>();
  private legendSig = '';
  private selected: { kind: 'property' | 'zone' | 'lot' | 'ground'; payload: unknown } | null = null;
  private groundPopup: maplibregl.Popup | null = null;
  private dockOpen = window.innerWidth > 760;
  private inspectorOpen = window.innerWidth > 1100;
  private dossierCache = new Map<string, Promise<unknown>>();
  editor!: Editor;
  private lowFps = 0;
  private galleryToken = 0;

  constructor(container: HTMLElement, o: HudOpts) {
    this.eng = o.eng; this.props = o.props; this.mode = o.mode; this.onMode = o.onMode;
    this.root = el('<div class="hud"></div>');
    container.appendChild(this.root);
    this.root.append(this.buildTop(), this.buildDock(), this.buildInspector(), this.buildTimeline(), this.buildControls(), el('<div class="toast" id="toast" hidden></div>'));
    this.editor = new Editor(this.root, this.eng, this.props, m => this.say(m));
    this.wire();
    this.syncAll();
  }

  // ---- top bar ---------------------------------------------------------------
  private buildTop() {
    const t = el(`<header class="hud-top">
      <div class="brand"><span class="brand-mark">◈</span><span class="brand-name">OJAI ATLAS</span><span class="brand-sub">v2 · one engine</span></div>
      <div class="crumb" id="crumb">Ojai Valley · 6 properties</div>
      <div class="top-right">
        <div class="year-pill" id="year-pill" title="base imagery"><b id="year-big">today</b><span id="year-small">Esri satellite</span></div>
        <button class="mode-pill" id="mode-pill" data-mode="${this.mode}"><span class="mode-today">TODAY</span><span class="mode-vision">VISION</span></button>
        <button class="icon-btn" id="btn-help" title="hotkeys (?)">?</button>
      </div>
    </header>`);
    return t;
  }

  // ---- left dock: the layer library ----------------------------------------
  private row(o: OverlayDef) {
    return `<div class="row" data-id="${o.id}"><span class="dot"></span><span class="txt">${o.label}<span class="note" data-note="${o.id}">${esc(o.note)}</span></span><span class="info" data-info="${o.id}" title="legend, source and opacity">i</span></div>`;
  }
  private buildDock() {
    let h = `<aside class="dock" id="dock"><div class="dock-head"><span>LAYERS</span><input id="dock-search" type="search" placeholder="filter… (L to toggle)" autocomplete="off"><button class="icon-btn" id="dock-close" title="close (L)">✕</button></div><div class="dock-body">`;
    h += `<details class="sec" data-sec="base" open><summary><span class="sec-ico">🛰️</span><span class="sec-txt">Base imagery<span class="note">satellite, streets, or any county flight — years on the timeline below</span></span><span class="sec-n" data-n="base"></span><span class="arrow"></span></summary>`;
    for (const id of ['esri', 'gsat', 'osm']) h += `<div class="row radio" data-base="${id}"><span class="dot"></span><span class="txt">${BASE_LABELS[id].label}<span class="note">${esc(BASE_LABELS[id].note)}</span></span></div>`;
    h += `<div class="row radio" data-base="flight"><span class="dot"></span><span class="txt">🛩️ County aerial flights<span class="note">${FLIGHTS.length} flights, 1945 to 2025 — drag the year on the timeline</span></span></div></details>`;
    GROUPS.forEach((g, i) => {
      h += `<details class="sec" data-sec="${g.id}"${g.id === 'county' ? ' open' : ''}><summary><span class="sec-ico">${g.icon}</span><span class="sec-txt">${esc(g.label)}<span class="note">${esc(g.note)}</span></span><span class="sec-n" data-n="${g.id}"></span><kbd>${i + 1}</kbd><span class="arrow"></span></summary>`;
      for (const o of OVERLAYS) if (o.group === g.id) h += this.row(o);
      h += '</details>';
    });
    h += `</div><div class="dock-foot">Live public data — Ventura County GIS, California Geological Survey, USGS, FEMA, NRCS, BLM — fetched from each agency’s own server the moment you switch it on.</div></aside>`;
    return el(h);
  }

  // ---- right inspector -------------------------------------------------------
  private buildInspector() {
    return el(`<aside class="inspector" id="inspector">
      <div class="insp-tabs"><button data-tab="legend" class="on">What you see</button><button data-tab="parcel">Parcel</button><button class="icon-btn" id="insp-close" title="close (I)">✕</button></div>
      <div class="insp-body" id="insp-legend"></div>
      <div class="insp-body" id="insp-parcel" hidden></div>
    </aside>`);
  }

  // ---- bottom timeline -------------------------------------------------------
  private buildTimeline() {
    const fi = this.eng.flightIndex(this.eng.lastFlight), f = FLIGHTS[fi];
    const hi = Math.max(0, HIST_YEARS.indexOf(histYear));
    return el(`<footer class="timeline" id="timeline">
      <div class="tl-row" id="tl-aerial">
        <button class="tl-tag" data-tl="aerial" title="show the county flight for this year as the base">🛩️ Aerial flight</button>
        <b class="tl-year" id="tl-aerial-year">${f.year}</b>
        <div class="tl-track"><input type="range" id="tl-aerial-in" min="0" max="${FLIGHTS.length - 1}" step="1" value="${fi}" aria-label="aerial flight year"><div class="ticks"><span>1945</span><span>2005</span><span>2015</span><span>2025</span></div></div>
        <span class="tl-note" id="tl-aerial-note">${esc(f.when + (f.note ? ' · ' + f.note : ''))}</span>
      </div>
      <div class="tl-row" id="tl-hist">
        <button class="tl-tag" data-tl="hist" title="show the USGS topo edition for this year">📜 Historic topo</button>
        <b class="tl-year" id="tl-hist-year">${histYear}</b>
        <div class="tl-track"><input type="range" id="tl-hist-in" min="0" max="${HIST_YEARS.length - 1}" step="1" value="${hi}" aria-label="historic topo edition"><div class="ticks"><span>1903</span><span>1952</span><span>1967</span><span>1995</span></div></div>
        <span class="tl-note" id="tl-hist-note">${esc(HIST_NOTES[histYear] || '')}</span>
      </div>
    </footer>`);
  }

  // ---- controls --------------------------------------------------------------
  private buildControls() {
    return el(`<div class="controls">
      <button class="ctl" id="ctl-north" title="reset north (N)"><span class="compass" id="compass">▲</span></button>
      <button class="ctl" id="ctl-3d" title="tilt 2D / 3D (T)">3D</button>
      <button class="ctl on" id="ctl-terrain" title="terrain on/off (X)">⛰</button>
      <button class="ctl" id="ctl-layers" title="layers (L)">☰</button>
      <button class="ctl" id="ctl-insp" title="inspector (I)">ⓘ</button>
      <button class="ctl" id="ctl-edit" title="position editor (P)">⚙</button>
      <select class="ctl sel" id="ctl-quality" title="render quality"><option value="high">High</option><option value="medium" selected>Medium</option><option value="low">Low</option></select>
      <span class="fps" id="fps" title="frames per second · tiles still loading">— fps</span>
      <span class="busy" id="busy" title="tiles loading"></span>
    </div>`);
  }

  // ---- wiring ----------------------------------------------------------------
  private q<T extends HTMLElement = HTMLElement>(sel: string) { return this.root.querySelector(sel) as T; }
  private wire() {
    const eng = this.eng, map = eng.map;
    // dock rows
    this.q('#dock').addEventListener('click', e => {
      const t = e.target as HTMLElement;
      const info = t.closest('.info') as HTMLElement | null;
      if (info) { e.preventDefault(); const id = info.dataset.info!; this.peek.has(id) ? this.peek.delete(id) : this.peek.add(id); this.inspectorOpen = true; this.lastPanel = 'insp'; this.setTab('legend'); this.syncAll(); this.scrollLegendTo(id); return; }
      const base = t.closest('.row.radio') as HTMLElement | null;
      if (base) { const b = base.dataset.base!; eng.setBase(b === 'flight' ? eng.lastFlight : b); return; }
      const row = t.closest('.row[data-id]') as HTMLElement | null;
      if (row) { eng.toggleOverlay(row.dataset.id!); return; }
    });
    this.q('#dock-close').addEventListener('click', () => { this.dockOpen = false; this.syncPanels(); });
    this.q<HTMLInputElement>('#dock-search').addEventListener('input', e => this.filterDock((e.target as HTMLInputElement).value));
    // inspector
    this.q('#inspector').addEventListener('click', e => {
      const t = e.target as HTMLElement;
      const tab = t.closest('[data-tab]') as HTMLElement | null; if (tab) { this.setTab(tab.dataset.tab as 'legend' | 'parcel'); return; }
      if (t.closest('#insp-close')) { this.inspectorOpen = false; this.props.selectLot(null); this.syncPanels(); return; }
      const x = t.closest('.lg-x') as HTMLElement | null; if (x) { this.peek.delete(x.dataset.x!); this.renderLegend(true); return; }
      const more = t.closest('.lg-more') as HTMLElement | null; if (more) { const blk = more.closest('.lgb')!; blk.classList.toggle('all'); more.textContent = blk.classList.contains('all') ? 'show fewer' : more.dataset.all!; return; }
      const fly = t.closest('[data-fly]') as HTMLElement | null; if (fly) { const p = this.props.props.find(x => x.id === fly.dataset.fly); if (p) this.props.flyTo(p); return; }
      const off = t.closest('[data-off]') as HTMLElement | null; if (off) { eng.setOverlay(off.dataset.off!, false); return; }
      const dive = t.closest('[data-dive]') as HTMLElement | null; if (dive) { const p = this.props.props.find(x => x.id === dive.dataset.dive); if (p) this.enterVision(p); return; }
      const lot = t.closest('[data-lot]') as HTMLElement | null; if (lot) { const [pid, lid] = lot.dataset.lot!.split('/'); this.props.flyToLot(pid, lid); return; }
      const copy = t.closest('[data-copy]') as HTMLElement | null; if (copy) { try { navigator.clipboard?.writeText(copy.dataset.copy!); this.say('Copied ' + copy.dataset.copy); } catch { /* fine */ } return; }
    });
    this.q('#inspector').addEventListener('input', e => {
      const t = e.target as HTMLInputElement;
      if (t.classList.contains('op-in')) eng.setOpacity(t.dataset.op!, Number(t.value) / 100);
    });
    // timeline
    const ai = this.q<HTMLInputElement>('#tl-aerial-in');
    ai.addEventListener('input', () => { this.aerialLabels(Number(ai.value)); eng.setFlight(Number(ai.value), false); });
    ai.addEventListener('change', () => eng.setFlight(Number(ai.value), true));
    const hi = this.q<HTMLInputElement>('#tl-hist-in');
    hi.addEventListener('input', () => { const y = HIST_YEARS[Number(hi.value)]; this.histLabels(y); if (!eng.active.has('histtopo')) eng.setOverlay('histtopo', true); eng.setHistYear(y, false); });
    hi.addEventListener('change', () => eng.setHistYear(HIST_YEARS[Number(hi.value)], true));
    this.q('[data-tl="aerial"]').addEventListener('click', () => { const onFlight = !!FLIGHTS.find(f => f.id === eng.base); eng.setBase(onFlight ? 'esri' : eng.lastFlight); });
    this.q('[data-tl="hist"]').addEventListener('click', () => eng.toggleOverlay('histtopo'));
    // controls
    this.q('#ctl-north').addEventListener('click', () => map.easeTo({ bearing: 0, pitch: map.getPitch() > 0 && map.getPitch() < 5 ? 0 : map.getPitch(), duration: 600 }));
    this.q('#ctl-3d').addEventListener('click', () => eng.set3D(map.getPitch() < 5));
    this.q('#ctl-terrain').addEventListener('click', () => eng.setTerrain(!eng.terrain));
    this.q('#ctl-layers').addEventListener('click', () => { this.dockOpen = !this.dockOpen; this.lastPanel = 'dock'; this.syncPanels(); });
    this.q('#ctl-insp').addEventListener('click', () => { this.inspectorOpen = !this.inspectorOpen; this.lastPanel = 'insp'; this.syncPanels(); });
    this.q('#ctl-edit').addEventListener('click', () => this.editor.toggle());
    this.q<HTMLSelectElement>('#ctl-quality').addEventListener('change', e => eng.setQuality((e.target as HTMLSelectElement).value as 'low' | 'medium' | 'high'));
    this.q('#mode-pill').addEventListener('click', () => { this.mode = this.mode === 'today' ? 'vision' : 'today'; this.onMode(this.mode); this.syncAll(); });
    this.q('#btn-help').addEventListener('click', () => this.help());
    // engine events
    eng.events.on('base', () => this.syncAll());
    eng.events.on('overlays', () => this.syncAll());
    eng.events.on('histYear', () => this.syncAll());
    eng.events.on('terrain', on => this.q('#ctl-terrain').classList.toggle('on', on));
    // every frame: only the cheap things (compass, 3D button); the row hints only when a zoom settles
    const compass = this.q('#compass'), btn3d = this.q('#ctl-3d');
    let lastPitchOn = false;
    eng.events.on('view', v => { compass.style.transform = `rotate(${-v.bearing}deg)`; const on = v.pitch > 5; if (on !== lastPitchOn) { lastPitchOn = on; btn3d.classList.toggle('on', on); } });
    eng.map.on('zoomend', () => this.zoomHints(eng.map.getZoom()));
    const busy = this.q('#busy'); let busyOn = false;
    eng.events.on('loading', b => { if (b !== busyOn) { busyOn = b; busy.classList.toggle('on', b); } });
    const fpsEl = this.q('#fps');
    eng.events.on('fps', f => {
      const t = eng.tilesLoading();
      fpsEl.textContent = f + ' fps' + (t ? ' · ' + t + ' tiles' : ''); fpsEl.classList.toggle('bad', f < 30);
      // adaptive quality: five straight seconds under 28 fps while moving steps the render scale down once
      if (f < 28 && eng.quality !== 'low' && eng.map.isMoving()) { if (++this.lowFps >= 5) { this.lowFps = 0; const q = eng.quality === 'high' ? 'medium' : 'low'; eng.setQuality(q); (this.q('#ctl-quality') as HTMLSelectElement).value = q; this.say(`Render quality lowered to ${q} for smoother movement — change it back in the corner control any time.`); } }
      else this.lowFps = 0;
    });
    // selection from the map
    this.props.onSelect = (kind, payload) => { if (kind !== 'lot') this.props.selectLot(null); this.groundPopup?.remove(); this.selected = { kind, payload }; this.inspectorOpen = true; this.lastPanel = 'insp'; this.setTab('parcel'); this.renderParcel(); this.syncPanels(); };
    // click on open ground: the readout (coordinates, elevation, dossier for whatever parcel is there)
    map.on('click', e => { if (this.editor.open || this.props.hitsOwn(e.point)) return; this.ground(e.lngLat); });
    // hotkeys
    window.addEventListener('keydown', e => this.key(e));
  }

  private key(e: KeyboardEvent) {
    const tgt = e.target as HTMLElement;
    if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.tagName === 'SELECT')) return;
    if (lightboxOpen()) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const map = this.eng.map, step = 120;
    const k = e.key.toLowerCase();
    const pan = (x: number, y: number) => map.panBy([x, y], { duration: 200 });
    switch (k) {
      case 'w': pan(0, -step); break; case 's': pan(0, step); break; case 'a': pan(-step, 0); break; case 'd': pan(step, 0); break;
      case 'q': map.easeTo({ bearing: map.getBearing() - 15, duration: 250 }); break;
      case 'e': map.easeTo({ bearing: map.getBearing() + 15, duration: 250 }); break;
      case 'r': map.easeTo({ pitch: Math.min(80, map.getPitch() + 10), duration: 250 }); break;
      case 'f': map.easeTo({ pitch: Math.max(0, map.getPitch() - 10), duration: 250 }); break;
      case '+': case '=': map.zoomIn(); break; case '-': map.zoomOut(); break;
      case 't': this.eng.set3D(map.getPitch() < 5); break;
      case 'n': map.easeTo({ bearing: 0, duration: 500 }); break;
      case 'x': this.eng.setTerrain(!this.eng.terrain); break;
      case 'l': this.dockOpen = !this.dockOpen; this.lastPanel = 'dock'; this.syncPanels(); break;
      case 'i': this.inspectorOpen = !this.inspectorOpen; this.lastPanel = 'insp'; this.syncPanels(); break;
      case 'h': this.eng.toggleOverlay('histtopo'); break;
      case 'p': this.editor.toggle(); break;
      case 'g': { const c = map.getCenter(); window.open(`https://earth.google.com/web/@${c.lat},${c.lng},0a,${Math.round(40075016 / Math.pow(2, map.getZoom()) * 0.6)}d,35y,${Math.round(map.getBearing())}h,${Math.round(map.getPitch())}t,0r`, '_blank'); break; }
      case '?': this.help(); break;
      case ' ': e.preventDefault(); this.mode = this.mode === 'today' ? 'vision' : 'today'; this.onMode(this.mode); this.syncAll(); break;
      case 'escape': this.inspectorOpen = false; this.syncPanels(); break;
      case '[': { const i = Math.max(0, this.eng.flightIndex(this.eng.lastFlight) - 1); this.eng.setFlight(i, true); break; }
      case ']': { const i = Math.min(FLIGHTS.length - 1, this.eng.flightIndex(this.eng.lastFlight) + 1); this.eng.setFlight(i, true); break; }
      default:
        if (/^[1-7]$/.test(k)) { const g = GROUPS[Number(k) - 1]; const d = this.q(`details[data-sec="${g.id}"]`) as HTMLDetailsElement; this.dockOpen = true; this.lastPanel = 'dock'; this.syncPanels(); d.open = !d.open; if (d.open) d.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    }
  }

  say(msg: string) {
    const t = this.q('#toast'); t.textContent = msg; t.hidden = false;
    window.clearTimeout((t as unknown as { _t: number })._t); (t as unknown as { _t: number })._t = window.setTimeout(() => { t.hidden = true; }, 6000);
  }
  enterVision(p: Property) {
    if (this.mode !== 'vision') { this.mode = 'vision'; this.onMode('vision'); this.syncAll(); }
    this.inspectorOpen = false; this.syncPanels();
    this.say(`🌀 Entering the Vision — ${p.shortLabel || p.name}`);
    this.props.dive(p, () => { this.selected = { kind: 'property', payload: p }; this.inspectorOpen = true; this.lastPanel = 'insp'; this.setTab('parcel'); this.renderParcel(); this.syncPanels(); });
  }
  help() {
    const t = this.q('#toast');
    t.innerHTML = `<b>Hotkeys</b> — W A S D pan · Q E rotate · R F tilt · + − zoom · T 2D/3D · X terrain · N north · L layers · I inspector · P position editor · 1–7 open a layer group · [ ] step the aerial year · H historic topo · Space Today/Vision · G open in Google Earth · Esc close. <br>Mouse: drag to pan, right-drag / Ctrl-drag / <b>middle-drag</b> to orbit (drag right = turn right), wheel to zoom, click open ground for elevation + the county dossier of any parcel. Touch: two fingers to rotate and tilt.`;
    t.hidden = false; window.clearTimeout((t as unknown as { _t: number })._t); (t as unknown as { _t: number })._t = window.setTimeout(() => { t.hidden = true; }, 9000);
  }

  private filterDock(q: string) {
    q = q.trim().toLowerCase();
    for (const r of this.root.querySelectorAll<HTMLElement>('.dock .row[data-id]')) r.hidden = !!q && !r.textContent!.toLowerCase().includes(q);
    for (const d of this.root.querySelectorAll<HTMLDetailsElement>('.dock details.sec')) if (q) d.open = [...d.querySelectorAll<HTMLElement>('.row[data-id]')].some(r => !r.hidden);
  }

  // ---- sync ------------------------------------------------------------------
  private aerialLabels(i: number) { const f = FLIGHTS[i]; this.q('#tl-aerial-year').textContent = String(f.year); this.q('#tl-aerial-note').textContent = f.when + (f.note ? ' · ' + f.note : ''); }
  private histLabels(y: number) { this.q('#tl-hist-year').textContent = String(y); this.q('#tl-hist-note').textContent = HIST_NOTES[y] || ''; }
  private setTab(t: 'legend' | 'parcel') { for (const b of this.root.querySelectorAll<HTMLElement>('.insp-tabs [data-tab]')) b.classList.toggle('on', b.dataset.tab === t); this.q('#insp-legend').hidden = t !== 'legend'; this.q('#insp-parcel').hidden = t !== 'parcel'; }
  private lastPanel: 'dock' | 'insp' = 'dock';
  private syncPanels() {
    // a phone shows one panel at a time: the one that was opened last wins
    if (this.dockOpen && this.inspectorOpen && window.innerWidth <= 760) { if (this.lastPanel === 'insp') this.dockOpen = false; else this.inspectorOpen = false; }
    this.q('#dock').classList.toggle('open', this.dockOpen); this.q('#ctl-layers').classList.toggle('on', this.dockOpen);
    this.q('#inspector').classList.toggle('open', this.inspectorOpen); this.q('#ctl-insp').classList.toggle('on', this.inspectorOpen);
    this.root.classList.toggle('dock-open', this.dockOpen); this.root.classList.toggle('insp-open', this.inspectorOpen);
    const app = this.root.parentElement; if (app) { app.classList.toggle('dock-open', this.dockOpen); app.classList.toggle('insp-open', this.inspectorOpen); }
  }
  syncAll() {
    const eng = this.eng, onFlight = !!FLIGHTS.find(f => f.id === eng.base);
    // base rows
    for (const r of this.root.querySelectorAll<HTMLElement>('.row.radio')) { const b = r.dataset.base!; r.classList.toggle('on', b === 'flight' ? onFlight : eng.base === b); }
    // overlay rows + section badges
    const counts: Record<string, number> = {};
    for (const r of this.root.querySelectorAll<HTMLElement>('.row[data-id]')) { const on = eng.active.has(r.dataset.id!); r.classList.toggle('on', on); const inf = r.querySelector('.info'); if (inf) inf.classList.toggle('on', this.peek.has(r.dataset.id!)); if (on) { const g = overlayById(r.dataset.id!)?.group || ''; counts[g] = (counts[g] || 0) + 1; } }
    for (const g of GROUPS) { const n = this.q(`.sec-n[data-n="${g.id}"]`); n.textContent = counts[g.id] ? counts[g.id] + ' on' : ''; }
    // timeline state
    const fi = eng.flightIndex(onFlight ? eng.base : eng.lastFlight);
    const ai = this.q<HTMLInputElement>('#tl-aerial-in'); if (Number(ai.value) !== fi) ai.value = String(fi);
    this.aerialLabels(fi);
    this.q('#tl-aerial').classList.toggle('live', onFlight);
    const hOn = eng.active.has('histtopo'), hi = Math.max(0, HIST_YEARS.indexOf(histYear));
    const hin = this.q<HTMLInputElement>('#tl-hist-in'); if (Number(hin.value) !== hi) hin.value = String(hi);
    this.histLabels(histYear);
    this.q('#tl-hist').classList.toggle('live', hOn);
    // top bar year pill
    const f = FLIGHTS[fi];
    this.q('#year-big').textContent = onFlight ? String(f.year) : 'today';
    this.q('#year-small').textContent = onFlight ? 'county flight · ' + f.when : (BASE_LABELS[eng.base]?.label.replace(/^\S+\s/, '') || eng.base);
    this.q('#mode-pill').dataset.mode = this.mode;
    this.root.classList.toggle('vision', this.mode === 'vision');
    this.q('#ctl-terrain').classList.toggle('on', eng.terrain);
    this.zoomHints(eng.map.getZoom());
    this.renderLegend(false);
    this.syncPanels();
  }
  private zoomHints(zoom: number) {
    for (const d of OVERLAYS) {
      if (d.minZoom == null && d.maxZoom == null) continue;
      const note = this.root.querySelector<HTMLElement>(`.note[data-note="${d.id}"]`); if (!note) continue;
      const far = d.minZoom != null && zoom < ml(d.minZoom), near = d.maxZoom != null && zoom > ml(d.maxZoom) + 1.5;
      note.textContent = far ? (d.farNote || 'zoom in closer to see this') : near ? (d.nearNote || 'drawn for a wider view — softer this close') : d.note;
      note.classList.toggle('warn', far || near);
    }
  }

  // ---- legend ------------------------------------------------------------------
  private legendBlock(d: OverlayDef) {
    const op = Math.round(this.eng.opacityOf(d) * 100), on = this.eng.active.has(d.id);
    return `<div class="lgb" data-lg="${d.id}"><div class="lgb-head"><b>${d.label}</b><span class="lgb-acts">${on ? `<button class="mini" data-off="${d.id}" title="switch off">off</button>` : ''}<span class="lg-x" data-x="${d.id}" title="hide this legend">✕</span></span></div>
      ${d.src ? `<div class="src">${esc(d.src)}${d.srcUrl ? ` · <a href="${esc(d.srcUrl)}" target="_blank" rel="noopener">source ↗</a>` : ''}</div>` : ''}
      <label class="op">Opacity <input type="range" class="op-in" data-op="${d.id}" min="10" max="100" value="${op}"><span>${op}%</span></label>
      <div class="lg-list" data-list="${d.id}">${d.legendText ? `<div class="lg">${esc(d.legendText)}</div>` : `<div class="lg wait">loading the legend from ${esc(d.src || 'the source')}…</div>`}</div></div>`;
  }
  private renderLegend(force: boolean) {
    const box = this.q('#insp-legend');
    const ids = OVERLAYS.filter(o => this.eng.active.has(o.id) || this.peek.has(o.id)).map(o => o.id);
    const sig = ids.join(',') + '|' + [...this.eng.active].join(',');
    if (!force && sig === this.legendSig) return;
    this.legendSig = sig;
    if (!ids.length) { box.innerHTML = `<div class="empty">Switch a layer on — its legend, its source and an opacity control appear here. The <b>i</b> on any row shows a legend without switching the layer on.<br><br><span class="hint">Tip: press <kbd>1</kbd>–<kbd>7</kbd> to open a layer group, <kbd>[</kbd> <kbd>]</kbd> to step through the years.</span></div>`; return; }
    box.innerHTML = ids.map(id => this.legendBlock(overlayById(id)!)).join('');
    for (const id of ids) this.fillLegend(overlayById(id)!);
    box.querySelectorAll<HTMLInputElement>('.op-in').forEach(inp => inp.addEventListener('input', () => { (inp.nextElementSibling as HTMLElement).textContent = inp.value + '%'; }));
  }
  private scrollLegendTo(id: string) { const b = this.root.querySelector(`.lgb[data-lg="${id}"]`); if (b) b.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  private async fillLegend(d: OverlayDef) {
    if (d.legendText) return;
    const items = await legendFor(d);
    const box = this.root.querySelector<HTMLElement>(`.lg-list[data-list="${d.id}"]`); if (!box) return;
    if (!items.length) { box.innerHTML = `<div class="lg">${esc(d.note || 'no legend published for this layer')}</div>`; return; }
    const CAP = 24, multi = items.some(i => i.layer !== items[0].layer);
    let h = '', last: string | null = null;
    items.forEach((it, i) => { const more = i >= CAP ? ' more' : ''; if (multi && it.layer !== last) { h += `<div class="lg-sub${more}">${esc(it.layer)}</div>`; last = it.layer; } h += `<div class="lg${more}"><img src="${it.img}" alt="">${esc(it.label)}</div>`; });
    if (items.length > CAP) h += `<div class="lg-more" data-all="show all ${items.length} entries">show all ${items.length} entries</div>`;
    box.innerHTML = h;
  }

  // ---- parcel / property inspector -----------------------------------------------
  private async renderParcel() {
    const box = this.q('#insp-parcel');
    if (!this.selected) { box.innerHTML = '<div class="empty">Click a property, a zone or a ranch lot to inspect it.</div>'; return; }
    const { kind, payload } = this.selected;
    const strip = `<div class="strip ${this.mode}">${this.mode === 'vision' ? 'VISION · the proposal' : 'TODAY · as it stands'}</div>`;
    const token = ++this.galleryToken;
    if (kind === 'property') {
      const p = payload as RichProperty, st = (this.mode === 'vision' ? p.status?.vision : p.status?.today) || p.status?.today;
      const panel = this.mode === 'vision' ? (p.visionPanel || p.panel) : p.panel;
      let h = `<div class="card">${strip}<div class="card-head"><b>${esc(p.name)}</b>${p.apn ? `<span class="apn">APN ${esc(p.apn)}</span>` : ''}</div>`;
      if (p.footerInfo?.length) h += '<div class="facts">' + p.footerInfo.map(f => `<span>${esc(f)}</span>`).join('') + '</div>';
      h += '<div class="gal-slot"></div>';
      if (st?.badge) h += `<div class="badge">${esc(st.badge)}</div>`;
      if (st?.rows?.length) h += '<div class="rows">' + st.rows.map(r => `<div class="r"><span class="k">${esc(r[0])}</span><span class="v">${esc(r[1])}</span></div>`).join('') + '</div>';
      if (st?.note) h += `<div class="note-p">${esc(st.note)}</div>`;
      h += `<div class="acts"><button class="mini" data-fly="${p.id}">fly here</button><button class="mini violet" data-dive="${p.id}">🌀 Enter the Vision</button><a class="mini" href="/classic" target="_blank" rel="noopener">classic page ↗</a></div>`;
      if (p.docs?.length) h += '<div class="docs">' + p.docs.map(d => `<a href="https://raw.githubusercontent.com/SacredRebel/howard-property-dev/main/${esc(d.file)}" target="_blank" rel="noopener">📄 ${esc(d.label)}</a>`).join('') + '</div>';
      if (panel?.html) h += `<details class="fold"><summary>${esc(panel.title || 'Full details')}<span class="cnt">details</span></summary><div class="classic">${stripClassicGallery(panel.html)}</div></details>`;
      if (p.cta) {
        h += `<details class="fold" open><summary>${esc(p.cta.heading || 'Get in touch')}</summary><div class="cta">${p.cta.paragraph ? `<p class="desc">${esc(p.cta.paragraph)}</p>` : ''}`
          + (p.cta.contacts || []).map(c => `<a class="doc" href="mailto:${esc(c.email)}"><span><b>${esc(c.name)}</b><i>${esc(c.email)}</i></span><span class="o">write ↗</span></a>`).join('')
          + (p.cta.buttons || []).map(b => `<a class="mini gold" href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.label)}</a>`).join(' ') + '</div></details>';
      }
      h += `<details class="fold" open><summary>County dossier<span class="cnt" id="ds-cnt"></span></summary><div class="ds" id="ds-body"><div class="lg wait">resolving from public sources…</div></div></details></div>`;
      box.innerHTML = h;
      this.loadDossier(p);
      this.fillGallery(box, p.id, 'property', token);
    } else if (kind === 'zone') {
      const { property: p, zone: z } = payload as { property: Property; zone: Zone };
      let h = `<div class="card">${strip}<div class="card-head"><b>${esc(z.emoji || '')} ${esc(z.name)}</b><span class="apn">${esc(p.shortLabel || p.name)}</span></div><div class="gal-slot"></div>`;
      if (z.description) h += `<p class="desc">${esc(z.description)}</p>`;
      const rows: [string, string][] = [];
      if (z.type) rows.push(['Type', z.type]); if (z.budget) rows.push(['Budget', z.budget]); if (z.timeline) rows.push(['Timeline', z.timeline]); if (z.monthlyRevenue) rows.push(['Revenue', z.monthlyRevenue]); if (z.roi) rows.push(['ROI', z.roi]);
      if (rows.length) h += '<div class="rows">' + rows.map(r => `<div class="r"><span class="k">${esc(r[0])}</span><span class="v">${esc(r[1])}</span></div>`).join('') + '</div>';
      if (z.features?.length) h += '<ul class="feats">' + z.features.map(f => `<li>${esc(f)}</li>`).join('') + '</ul>';
      h += `<div class="acts"><button class="mini" data-fly="${p.id}">property</button><button class="mini violet" data-dive="${p.id}">🌀 Enter the Vision</button></div></div>`;
      box.innerHTML = h;
      this.fillGallery(box, p.id, z.id, token);
    } else if (kind === 'lot') {
      const l = payload as LotPick, hit = this.props.lotOf(l.pid, l.lid), p = hit?.property;
      const bk = /Bk\s*(\d+)\s*Pg\s*(\d+)/i.exec(l.name || ''), title = (l.name || '').replace(/\s*\(.*\)\s*$/, '');
      const rows: [string, string][] = [['Acreage', `${l.acreage} ac`], ['APN', l.apn]];
      if (bk) rows.push(['Assessor map', `Book ${bk[1]} · Page ${bk[2]}`]);
      if (hit) { const c = lotBoundsCenter(hit.lot.rings); rows.push(['Centre', `${c[0].toFixed(5)}, ${c[1].toFixed(5)}`]); }
      let h = `<div class="card">${strip}<div class="card-head"><b>${esc(title)}</b><span class="apn">${esc(p?.shortLabel || p?.name || '')}</span></div>`;
      if (l.name && l.name !== title) h += `<p class="desc">${esc(l.name)}</p>`;
      h += '<div class="rows">' + rows.map(r => `<div class="r"><span class="k">${esc(r[0])}</span><span class="v">${esc(r[1])}</span></div>`).join('') + '</div>';
      h += `<div class="acts"><button class="mini" data-lot="${esc(l.pid)}/${esc(l.lid)}">fly to this lot</button>${p ? `<button class="mini" data-fly="${p.id}">whole ranch</button>` : ''}<button class="mini" data-copy="${esc(l.apn)}">copy APN</button></div>`;
      h += `<p class="note-p">One of ${p?.lots?.length || '—'} county parcels drawn from the assessor fabric. The dossier below is resolved for this parcel alone.</p>`;
      h += `<details class="fold" open><summary>County dossier<span class="cnt" id="ds-cnt"></span></summary><div class="ds" id="ds-body"><div class="lg wait">resolving from public sources…</div></div></details></div>`;
      box.innerHTML = h;
      this.loadDossier({ apn: l.apn } as Property);
    } else {
      const g = payload as { lat: number; lng: number; elev?: string };
      box.innerHTML = `<div class="card">${strip}<div class="card-head"><b>Ground at ${g.lat.toFixed(5)}, ${g.lng.toFixed(5)}</b><span class="apn">any parcel</span></div>
        <div class="rows"><div class="r"><span class="k">Elevation</span><span class="v" id="gr-elev">${esc(g.elev || 'measuring…')}</span></div></div>
        <div class="acts"><button class="mini" data-copy="${g.lat.toFixed(6)}, ${g.lng.toFixed(6)}">copy coordinates</button><a class="mini" href="https://earth.google.com/web/@${g.lat},${g.lng},0a,1200d,35y,0h,45t,0r" target="_blank" rel="noopener">Google Earth ↗</a></div>
        <p class="note-p">The county dossier for whatever parcel lies under this point — zoning, plan, hazards, soils, water, recorded maps — resolved live from public sources.</p>
        <details class="fold" open><summary>County dossier<span class="cnt" id="ds-cnt"></span></summary><div class="ds" id="ds-body"><div class="lg wait">resolving from public sources…</div></div></details></div>`;
      this.loadDossier({ center: [g.lat, g.lng] } as Property);
    }
  }

  // ---- the ground readout ------------------------------------------------------------
  private async ground(ll: maplibregl.LngLat) {
    const m = this.eng.map, lat = ll.lat, lng = ll.lng;
    const fmt = (mtr: number, src: string) => `↑ ${Math.round(mtr * 3.28084).toLocaleString()} ft · ${Math.round(mtr)} m <i>${src}</i>`;
    const est = this.eng.groundElevation(ll);
    if (!this.groundPopup) this.groundPopup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, className: 'ground', maxWidth: '300px', offset: 8 });
    const pop = this.groundPopup;
    pop.setLngLat(ll).setHTML(`<div class="gp"><div class="gp-ll">${lat.toFixed(5)}, ${lng.toFixed(5)}</div><div class="gp-el" id="gp-el">${est != null ? fmt(est, '≈ terrain') : 'measuring…'}</div>
      <div class="gp-acts"><button class="mini gold" id="gp-ds">🗂 county dossier here</button><button class="mini" id="gp-cp">copy</button></div></div>`).addTo(m);
    const el = pop.getElement();
    el.querySelector('#gp-ds')?.addEventListener('click', () => { this.selected = { kind: 'ground', payload: { lat, lng, elev: (el.querySelector('#gp-el')?.textContent || '').trim() } }; this.inspectorOpen = true; this.lastPanel = 'insp'; this.setTab('parcel'); this.renderParcel(); this.syncPanels(); });
    el.querySelector('#gp-cp')?.addEventListener('click', () => { try { navigator.clipboard?.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`); this.say('Coordinates copied.'); } catch { /* fine */ } });
    // refine with USGS 3DEP (1 m lidar where flown) - the classic page's elevation query
    try {
      const pt = encodeURIComponent(JSON.stringify({ x: lng, y: lat, spatialReference: { wkid: 4326 } }));
      const r = await fetch(`https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/identify?geometry=${pt}&geometryType=esriGeometryPoint&returnGeometry=false&f=json`);
      const j = await r.json() as { value?: string | number };
      const v = parseFloat(String(j?.value));
      if (isFinite(v) && pop.isOpen() && pop.getLngLat().lat === lat) { const e2 = el.querySelector('#gp-el'); if (e2) e2.innerHTML = fmt(v, 'USGS 3DEP'); const g = this.root.querySelector('#gr-elev'); if (g) g.innerHTML = fmt(v, 'USGS 3DEP'); }
    } catch { /* offline or blocked - the terrain estimate stays */ }
  }
  private async fillGallery(box: HTMLElement, pid: string, zid: string, token: number) {
    const g = await galleryFor(pid, zid, this.mode);
    if (token !== this.galleryToken) return;   // the card changed meanwhile
    const slot = box.querySelector('.gal-slot') as HTMLElement | null; if (!slot) return;
    slot.innerHTML = galleryHTML(g, this.mode === 'vision' ? 'vision' : 'current');
    wireGallery(slot, g);
  }
  private async loadDossier(p: Property) {
    const key = p.apn ? 'apn=' + encodeURIComponent(p.apn) : `lat=${p.center[0]}&lon=${p.center[1]}`;
    let pr = this.dossierCache.get(key);
    if (!pr) { pr = fetch('/api/dossier?' + key).then(r => r.json()); this.dossierCache.set(key, pr); }
    let d: { apn?: string; situs?: string; acreage?: number; flags?: { level: string; text: string }[]; sections?: { label: string; rows: [string, string][] }[]; records?: { label: string; url?: string; year?: string; surveyor?: string; note?: string; pages?: number }[]; sourcesAnswered?: number; resolvedAt?: string; error?: string };
    try { d = await pr as typeof d; } catch { d = { error: 'unreachable' }; }
    const body = this.root.querySelector('#ds-body'); if (!body) return;
    if (!d || d.error) { body.innerHTML = `<div class="lg">The county resolver did not answer (${esc(d?.error || 'no data')}). Try again in a moment.</div>`; return; }
    let h = `<div class="ds-head"><span class="ds-apn">${esc(d.apn)}</span>${d.situs ? `<span class="ds-situs">${esc(d.situs)}</span>` : ''}${d.acreage ? `<span class="ds-situs">${d.acreage.toFixed(2)} ac</span>` : ''}</div>`;
    for (const f of d.flags || []) h += `<div class="ds-flag ${esc(f.level)}">${esc(f.text)}</div>`;
    (d.sections || []).forEach((s, i) => { h += `<details class="fold sub"${i < 2 ? ' open' : ''}><summary>${esc(s.label)}<span class="cnt">${s.rows.length}</span></summary><div class="rows">${s.rows.map(r => `<div class="r"><span class="k">${esc(r[0])}</span><span class="v">${esc(r[1])}</span></div>`).join('')}</div></details>`; });
    if (d.records?.length) {
      h += `<details class="fold sub"><summary>Recorded maps &amp; surveys<span class="cnt">${d.records.length}</span></summary><div class="rows"><p class="note-p">Every map ever filed over this land — the same documents a surveyor retraces. Each opens as the county’s own scan.</p>`;
      for (const r of d.records) { const meta = [r.year, r.surveyor, r.note, r.pages ? r.pages + (r.pages > 1 ? ' sheets' : ' sheet') : null].filter(Boolean).join(' · '); h += r.url ? `<a class="doc" href="${esc(r.url)}" target="_blank" rel="noopener"><span><b>${esc(r.label)}</b><i>${esc(meta)}</i></span><span class="o">open ↗</span></a>` : `<div class="r"><span class="k">${esc(r.label)}</span><span class="v">${esc(meta)}</span></div>`; }
      h += '</div></details>';
    }
    h += `<div class="ds-foot">Resolved from ${d.sourcesAnswered || 0} public sources on ${d.resolvedAt ? new Date(d.resolvedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}. Assessor figures are not an appraisal; recorded documents, not GIS, are the authority on boundaries.</div>`;
    body.innerHTML = h;
    const cnt = this.root.querySelector('#ds-cnt'); if (cnt) cnt.textContent = String((d.flags || []).length ? (d.flags || []).length + ' flags' : '');
  }
  setCrumb(text: string) { this.q('#crumb').textContent = text; }
}
