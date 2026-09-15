// The Position Editor: unlock one property's zones as draggable markers, move
// them, then capture the JSON or save it to the repo with the PIN (the same
// POST /api/save-positions contract the classic page uses).
import maplibregl from 'maplibre-gl';
import type { PropertyLayer, Property } from '../data/properties';
import type { Engine } from '../engine/map';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export class Editor {
  root: HTMLElement;
  open = false;
  private pid: string | null = null;
  private markers: maplibregl.Marker[] = [];
  private original = new Map<string, [number, number]>();
  private moved = new Map<string, [number, number]>();   // 'pid/zid' -> [lat,lng]

  constructor(container: HTMLElement, private eng: Engine, private props: PropertyLayer, private toast: (s: string) => void) {
    this.root = document.createElement('aside'); this.root.className = 'editor'; this.root.hidden = true;
    container.appendChild(this.root);
    this.render();
  }

  toggle(force?: boolean) {
    this.open = force ?? !this.open;
    this.root.hidden = !this.open;
    if (!this.open) this.stop();
    else this.render();
  }

  private render() {
    const opts = this.props.props.map(p => `<option value="${p.id}"${p.id === this.pid ? ' selected' : ''}>${esc(p.shortLabel || p.name)} (${p.zones.length})</option>`).join('');
    this.root.innerHTML = `<div class="ed-head"><span>⚙ POSITION EDITOR</span><button class="icon-btn" data-ed="close" title="close (P)">✕</button></div>
      <div class="ed-body">
        <label class="ed-row">Property <select data-ed="prop">${opts}</select></label>
        <div class="ed-acts">
          ${this.pid ? `<button class="mini on" data-ed="stop">Stop editing</button>` : `<button class="mini" data-ed="start">Start editing</button>`}
          <button class="mini" data-ed="reset"${this.pid ? '' : ' disabled'}>Reset</button>
          <button class="mini" data-ed="capture"${this.moved.size ? '' : ' disabled'}>Capture JSON</button>
          <button class="mini gold" data-ed="save"${this.moved.size ? '' : ' disabled'}>🔒 Save to repo</button>
        </div>
        <div class="ed-note">${this.pid ? 'Drag any badge on the map. Every move is listed here until you save or reset.' : 'Pick a property and start editing — its zone badges become draggable.'}</div>
        <div class="ed-moved">${[...this.moved.entries()].map(([k, v]) => `<div class="ed-m"><b>${esc(k.split('/')[1])}</b><span>${v[0].toFixed(6)}, ${v[1].toFixed(6)}</span></div>`).join('')}</div>
        <textarea class="ed-out" hidden readonly></textarea>
      </div>`;
    this.root.onclick = e => {
      const t = (e.target as HTMLElement).closest('[data-ed]') as HTMLElement | null; if (!t) return;
      const a = t.dataset.ed;
      if (a === 'close') this.toggle(false);
      else if (a === 'start') this.start((this.root.querySelector('[data-ed="prop"]') as HTMLSelectElement).value);
      else if (a === 'stop') this.stop();
      else if (a === 'reset') this.reset();
      else if (a === 'capture') this.capture();
      else if (a === 'save') this.save();
    };
    const sel = this.root.querySelector('[data-ed="prop"]') as HTMLSelectElement | null;
    if (sel) sel.onchange = () => { if (this.pid) this.start(sel.value); };
  }

  private start(pid: string) {
    this.stop();
    const p = this.props.props.find(x => x.id === pid); if (!p) return;
    this.pid = pid;
    this.props.setEditing(pid);
    for (const z of p.zones) {
      const key = pid + '/' + z.id;
      if (!this.original.has(key)) this.original.set(key, [z.position[0], z.position[1]]);
      const el = document.createElement('div'); el.className = 'ed-badge'; el.textContent = z.emoji || z.icon || '📍'; el.title = z.name;
      const mk = new maplibregl.Marker({ element: el, draggable: true, anchor: 'center' }).setLngLat([z.position[1], z.position[0]]).addTo(this.eng.map);
      mk.on('dragend', () => { const ll = mk.getLngLat(); z.position = [ll.lat, ll.lng]; this.moved.set(key, [ll.lat, ll.lng]); this.render(); });
      this.markers.push(mk);
    }
    this.props.flyTo(p);
    this.render();
    this.toast(`Editing ${p.shortLabel || p.name}: drag the badges. Save needs the edit PIN.`);
  }
  private stop() {
    for (const m of this.markers) m.remove(); this.markers = [];
    if (this.pid) { this.props.setEditing(null); this.props.refreshZones(); }
    this.pid = null;
    this.render();
  }
  private reset() {
    const p = this.props.props.find(x => x.id === this.pid); if (!p) return;
    for (const z of p.zones) { const o = this.original.get(p.id + '/' + z.id); if (o) z.position = [o[0], o[1]]; this.moved.delete(p.id + '/' + z.id); }
    const pid = this.pid!; this.stop(); this.start(pid);
  }
  private payload() {
    const out: Record<string, Record<string, [number, number]>> = {};
    for (const [k, v] of this.moved) { const [pid, zid] = k.split('/'); (out[pid] ||= {})[zid] = [Number(v[0].toFixed(6)), Number(v[1].toFixed(6))]; }
    return out;
  }
  private capture() {
    const ta = this.root.querySelector('.ed-out') as HTMLTextAreaElement; ta.hidden = false; ta.value = JSON.stringify(this.payload(), null, 2); ta.select();
    try { navigator.clipboard?.writeText(ta.value); this.toast('Positions copied to the clipboard.'); } catch { /* fine */ }
  }
  private async save() {
    let pin = ''; try { pin = localStorage.getItem('ojaiMapEditPin') || ''; } catch { /* private mode */ }
    if (!pin) { pin = window.prompt('Edit PIN') || ''; if (!pin) return; }
    const r = await fetch('/api/save-positions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin, positions: this.payload() }) });
    if (r.status === 401) { try { localStorage.removeItem('ojaiMapEditPin'); } catch { /* fine */ } this.toast('Wrong PIN.'); return; }
    if (r.status === 501) { this.toast('Saving is not configured on this deployment — use Capture JSON and paste it back.'); return; }
    if (!r.ok) { this.toast('Save failed (' + r.status + ').'); return; }
    try { localStorage.setItem('ojaiMapEditPin', pin); } catch { /* fine */ }
    for (const [k, v] of this.moved) this.original.set(k, v);
    this.moved.clear(); this.render();
    this.toast('Saved — the layout is committed to the repo and live on the next deploy.');
  }
}

export type { Property };
