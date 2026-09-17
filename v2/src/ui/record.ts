// The County Record — everything the public record holds on one parcel,
// rendered in full. The server resolves it in two parts (`core` = the county's
// own record, `deep` = state + federal layers and the 1 m terrain grid); both
// are fetched at once and the card fills in as each arrives. Also here: the
// seven-dimension read, the research list (parcels you are looking at, kept
// in this browser) and the compare table across parcels.
export type Row = [string, string, string?];
export interface Flag { level: string; key?: string; text: string; }
export interface Section { id: string; label: string; rows: Row[]; }
export interface RecMap { label: string; type?: string; year?: string | null; surveyor?: string | null; note?: string | null; pages?: number | null; url?: string | null; }
export interface Portal { group: 'county' | 'state' | 'federal' | 'directory'; label: string; url: string; note?: string; method?: 'post'; fields?: Record<string, string>; }
export interface Terrain { samples: number; spacingM: number; lowFt: number; highFt: number; meanFt: number; reliefFt: number; meanSlope: number; medianSlope: number; classes: { label: string; acres: number; share: number }[]; aspect: string; aspectShare: number; gentleAcres: number; buildableAcres: number; areaAcres: number; }
export interface County { fips: string; name: string; state: string | null; stateName: string | null; adapter: string | null; authority?: string | null; }
export interface RecordData {
  part?: string; apn: string | null; apn10?: string | null; situs: string | null; acreage: number | null; center?: [number, number]; bbox?: { xmin: number; ymin: number; xmax: number; ymax: number } | null;
  geometry?: { rings: [number, number][][] } | null; county?: County | null; flags: Flag[]; sections: Section[]; records?: RecMap[]; raw?: [string, string][]; portals?: Portal[]; terrain?: Terrain | null;
  sourcesQueried?: number; sourcesAnswered?: number; sourcesLate?: number; partial?: boolean; resolvedAt?: string; cached?: boolean; ms?: number; error?: string;
  evidence?: { provider: string | null; preparedOn: string | null; importedAt: string | null; path: string } | null;
}
export interface Target { apn?: string; county?: string; lat?: number; lng?: number; label?: string; }
export interface Dim { id: string; label: string; value: string; score: number | null; note: string; }
export interface ResearchItem { apn: string; county?: string; situs?: string | null; acreage?: number | null; center: [number, number]; bbox?: RecordData['bbox']; rings?: [number, number][][] | null; savedAt: string; note?: string; }

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
export const SECTION_ORDER = ['identity', 'valuation', 'title', 'landuse', 'structures', 'hazards', 'seismic', 'fire', 'terrain', 'ground', 'water', 'habitat', 'cultural', 'access', 'districts', 'survey', 'permits', 'records'];

export function targetKey(t: Target): string {
  if (t.apn) return 'apn=' + encodeURIComponent(t.apn) + (t.county ? '&county=' + t.county : '');
  return `lat=${(t.lat ?? 0).toFixed(6)}&lon=${(t.lng ?? 0).toFixed(6)}`;
}

// merge core + deep into one record, sections in the canonical order
export function mergeRecord(core: RecordData, deep?: RecordData | null): RecordData {
  if (!deep || deep.error) return core;
  const sections = SECTION_ORDER.map(id => {
    const a = core.sections.find(s => s.id === id), b = deep.sections.find(s => s.id === id);
    if (!a && !b) return null;
    return { id, label: (a || b)!.label, rows: [...(a?.rows || []), ...(b?.rows || [])] };
  }).filter(Boolean) as Section[];
  return { ...core, part: 'all', sections, flags: [...core.flags, ...deep.flags], terrain: deep.terrain, records: [...(core.records || []), ...(deep.records || [])], sourcesQueried: (core.sourcesQueried || 0) + (deep.sourcesQueried || 0), sourcesAnswered: (core.sourcesAnswered || 0) + (deep.sourcesAnswered || 0), sourcesLate: (core.sourcesLate || 0) + (deep.sourcesLate || 0), partial: !!(core.partial || deep.partial) };
}

// the seven dimensions — mirrors lib/dossier.js readFrom(); every number cites row keys
export function readFrom(rec: RecordData): Dim[] {
  const flat: Row[] = ([] as Row[]).concat(...rec.sections.map(s => s.rows));
  const get = (k: string) => { const r = flat.find(x => x[2] === k); return r ? String(r[1]) : ''; };
  const has = (k: string) => !!flat.find(x => x[2] === k);
  const dims: Dim[] = [];
  const t = rec.terrain;
  dims.push({ id: 'buildable', label: 'Buildable ground', value: t ? t.buildableAcres + ' ac under 20 %' : (has('slope_classes') ? get('slope_classes') : '—'), score: t ? Math.round(100 * Math.min(1, t.buildableAcres / Math.max(0.25, t.areaAcres))) : null, note: t ? 'of ' + t.areaAcres + ' ac · mean slope ' + t.meanSlope + ' % · ' + t.aspect + '-facing' : 'terrain grid not resolved yet' });
  const zoning = get('zoning'); const m = /(\d+(?:\.\d+)?)\s*ac/i.exec(zoning + ' ' + get('zone_def')); const minAc = m ? parseFloat(m[1]) : null;
  const ac = rec.acreage || (t ? t.areaAcres : null); const splits = minAc && ac ? Math.floor(ac / minAc) : null;
  const ease = !/^None/.test(get('padus')) && /conservation easement|— easement/.test(get('padus')), claimsOn = /^\d+ — /.test(get('claims'));
  const encum = (ease ? 'conservation easement on the parcel (PAD-US) · ' : '') + (claimsOn ? 'open federal mining claim on the parcel · ' : '');
  dims.push({ id: 'entitlement', label: 'Entitlement headroom', value: zoning ? zoning + (minAc ? ' · ' + minAc + ' ac minimum' : '') : (get('genplan') || '—'), score: splits != null ? (ease ? Math.min(25, splits * 25) : Math.min(100, splits * 25)) : null, note: encum + (splits != null ? (splits >= 2 ? 'acreage would support ' + splits + ' lots at the zoning minimum (subject to plan, access, water and septic)' : splits === 1 ? 'one lot at the zoning minimum — no split' : 'below the zoning minimum lot size') : (get('genplan') ? get('genplan') + (get('williamson').startsWith('Under') ? ' · Williamson Act' : '') : 'zoning not resolved')) });
  const hz: [string, RegExp, string][] = [['fire_sev', /very high|high/i, 'fire'], ['flood100', /^Zone /, 'flood'], ['nfhl', /Special Flood Hazard Area on/, 'FEMA SFHA'], ['apzone', /Inside/, 'Alquist-Priolo'], ['liq', /touches/, 'liquefaction'], ['landslide', /touches/, 'landslide'], ['eqls', /touches/, 'EQ-induced landslide'], ['ls_susc', /high/i, 'high landslide susceptibility'], ['subsidence', /Inside/, 'subsidence'], ['dam', /Inside/, 'dam inundation'], ['tsunami', /Inside/, 'tsunami']];
  const hits = hz.filter(([k, re]) => re.test(get(k))).map(x => x[2]); const anyHz = hz.some(([k]) => has(k));
  dims.push({ id: 'hazards', label: 'Hazard load', value: !anyHz ? '—' : hits.length ? hits.join(' · ') : 'no mapped hazard on the parcel', score: anyHz ? Math.max(0, 100 - hits.length * 20) : null, note: [(get('pga475') ? 'PGA ' + get('pga475').split(' ')[0] + ' (475-yr)' : ''), (get('fires') && !/No recorded/.test(get('fires')) ? 'fires on record' : '')].filter(Boolean).join(' · ') });
  const wl = get('waterline'), sw = get('sewer'), gw = get('gw_basin');
  const wscore = (/No public water/.test(wl) ? 0 : 40) + (/No public sewer/.test(sw) ? 0 : 20) + (/Outside/.test(gw) || !gw ? 10 : 30) + (has('streams') && !/No county/.test(get('streams')) ? 10 : 0);
  dims.push({ id: 'water', label: 'Water', value: (/No public water/.test(wl) ? 'no public water line' : wl ? 'public water nearby' : '—') + ' · ' + (/No public sewer/.test(sw) ? 'septic' : sw ? 'sewer nearby' : '—'), score: wl || sw ? Math.min(100, wscore) : null, note: [get('wells_on') && /^\d+ — /.test(get('wells_on')) ? get('wells_on').split(' — ')[0] + ' well report' + (get('wells_on').startsWith('1 ') ? '' : 's') + ' on the parcel' : '', gw, get('gsa'), get('wells_water')].filter(Boolean).join(' · ') });
  const road = get('road');
  dims.push({ id: 'access', label: 'Access & utilities', value: road ? road.split(' · ').slice(0, 2).join(' · ') : '—', score: road ? (/No public road/.test(road) ? 25 : /on the parcel|~\d+ m/.test(road) ? 90 : 60) : null, note: [get('electric') ? get('electric').split(' · ')[0] : '', get('fire_station') ? 'fire station ' + ((get('fire_station').match(/~[^ ]+ (?:m|km)/) || [''])[0]) : '', get('transmission') ? 'transmission line within 1 km' : '', get('comms') ? get('comms') + ' comms facilities within 2 mi' : '', get('county_ease')].filter(Boolean).join(' · ') || 'recorded easements are in the deed, not GIS' });
  const total = get('total_value'), land = get('land_value'), per = get('value_per_ac'), docRow = get('doc_nr'), dd = docRow.split(' · ')[2] || '', sale = get('sale_price'), est = get('market_estimate');
  dims.push({ id: 'value', label: 'Value signal', value: total ? total + ' assessed' : '—', score: null, note: [land ? 'land ' + land : '', per ? per + '/ac' : '', /^\$/.test(sale) ? 'last sale ' + sale.split(' — ')[0] : '', /^\$/.test(est) ? 'estimate ' + est.split(' ')[0] : '', dd ? 'last document ' + dd : '', get('value_change') ? '2018 → now ' + ((get('value_change').match(/\(([^)]+)\)/) || [])[1] || '') : ''].filter(Boolean).join(' · ') });
  const recs = (rec.records || []).filter(r => r.type !== 'WCR'), chain = flat.filter(r => /^chain\d/.test(String(r[2] || ''))).length;
  dims.push({ id: 'change', label: 'Change over time', value: recs.length ? (recs.length + ' recorded maps, ' + (recs[recs.length - 1].year || '') + ' → ' + (recs[0].year || '')) : '—', score: null, note: (chain ? chain + ' title event' + (chain > 1 ? 's' : '') + ' on the public roll · ' : '') + (get('fires') && !/No recorded/.test(get('fires')) ? get('fires') : '') + (get('bldg_imagery') ? ' · footprints traced ' + get('bldg_imagery') : '') });
  return dims;
}

// ---- fetching -------------------------------------------------------------------------
export class RecordStore {
  private parts = new Map<string, Promise<RecordData>>();
  fetch(t: Target, part: 'core' | 'deep', refresh = false): Promise<RecordData> {
    const key = part + ':' + targetKey(t);
    if (refresh) this.parts.delete(key);
    let p = this.parts.get(key);
    if (!p) {
      p = fetch('/api/dossier?' + targetKey(t) + '&part=' + part + (refresh ? '&refresh=1' : '')).then(r => r.json() as Promise<RecordData>).catch(() => ({ error: 'unreachable', apn: null, situs: null, acreage: null, flags: [], sections: [] } as RecordData));
      p.then(d => { if (d.error || d.partial) this.parts.delete(key); });   // never memorise a failure or a partial answer
      this.parts.set(key, p);
    }
    return p;
  }
  async full(t: Target, refresh = false): Promise<RecordData> {
    const [core, deep] = await Promise.all([this.fetch(t, 'core', refresh), this.fetch(t, 'deep', refresh)]);
    return mergeRecord(core, deep);
  }
}

// ---- rendering ----------------------------------------------------------------------
const rowHTML = (r: Row) => `<div class="r${r[0] ? '' : ' cont'}"${r[2] ? ` data-key="${esc(r[2])}"` : ''}><span class="k">${esc(r[0])}</span><span class="v">${esc(r[1])}</span></div>`;
export function sectionsHTML(rec: RecordData, open = true, importable = false) {
  // editor mode: the Ownership & title section offers the report import (a purchased property report → owner, loans, liens, taxes, permits for this APN)
  const importBtn = importable && rec.apn ? `<div class="acts up"><button class="mini" data-rec="import">＋ import a property report (PDF)</button><span class="hint">${rec.evidence ? esc((rec.evidence.provider || 'a') + ' report' + (rec.evidence.preparedOn ? ' of ' + rec.evidence.preparedOn : '') + ' on file — importing another replaces it') : 'PropertyChecker report PDF for this APN — names, loans, liens and taxes then resolve here'}</span></div>` : '';
  return rec.sections.map(s => `<details class="fold sub rec-sec" data-sec="${s.id}"${open ? ' open' : ''}><summary>${esc(s.label)}<span class="cnt">${s.rows.length}</span></summary><div class="rows">${s.rows.map(rowHTML).join('')}</div>${s.id === 'title' ? importBtn : ''}</details>`).join('');
}
export function flagsHTML(flags: Flag[]) {
  return flags.map(f => `<div class="ds-flag ${f.level === 'watch' ? 'warn' : esc(f.level)}">${esc(f.text)}</div>`).join('');
}
export function readHTML(dims: Dim[]) {
  return `<div class="read">${dims.map(d => `<div class="rd"><div class="rd-l">${esc(d.label)}</div><div class="rd-v">${esc(d.value)}</div>${d.score != null ? `<div class="rd-bar"><i style="width:${d.score}%"></i></div>` : ''}${d.note ? `<div class="rd-n">${esc(d.note)}</div>` : ''}</div>`).join('')}</div>`;
}
export function recordsHTML(recs: RecMap[]) {
  if (!recs.length) return '';
  const wells = recs.filter(r => r.type === 'WCR').length;
  let h = `<details class="fold sub rec-sec" data-sec="recmaps" open><summary>Recorded maps, surveys &amp; well reports<span class="cnt">${recs.length}</span></summary><div class="rows"><p class="note-p">Every map ever filed over this land — the same documents a surveyor retraces — and every well completion report the state holds nearby${wells ? ` (${wells} well report${wells > 1 ? 's' : ''})` : ''}. Each opens as the record keeper’s own scan.</p>`;
  for (const r of recs) { const meta = [r.type ? { PM: 'Parcel map', RS: 'Record of survey', MR: 'Miscellaneous record', TR: 'Tract map', WCR: 'Well completion report (DWR)' }[r.type] || r.type : null, r.year, r.surveyor, r.note, r.pages ? r.pages + (r.pages > 1 ? ' sheets' : ' sheet') : null].filter(Boolean).join(' · '); h += r.url ? `<a class="doc" href="${esc(r.url)}" target="_blank" rel="noopener"><span><b>${esc(r.label)}</b><i>${esc(meta)}</i></span><span class="o">open ↗</span></a>` : `<div class="r"><span class="k">${esc(r.label)}</span><span class="v">${esc(meta)}</span></div>`; }
  return h + '</div></details>';
}
export function portalsHTML(portals: Portal[], apn: string | null) {
  if (!portals.length) return '';
  const groups: [Portal['group'], string][] = [['county', 'County'], ['state', 'State'], ['federal', 'Federal'], ['directory', 'Directories']];
  let h = `<details class="fold sub rec-sec" data-sec="portals" open><summary>Where to look — the record keepers<span class="cnt">${portals.length}</span></summary><div class="portals"><p class="note-p">GIS answers most questions; the rest live in the county’s own systems. These open the right desk${apn ? ' — the APN is copied to your clipboard on the way' : ''}.</p>`;
  for (const [g, label] of groups) {
    const items = portals.filter(p => p.group === g); if (!items.length) continue;
    h += `<div class="pg"><div class="pg-l">${label}</div>`;
    for (const p of items) {
      const link = p.method === 'post'
        ? `<form class="pf" method="post" action="${esc(p.url)}" target="_blank" rel="noopener" data-apn="${esc(apn || '')}">${Object.keys(p.fields || {}).map(k => `<input type="hidden" name="${esc(k)}" value="${esc(p.fields![k])}">`).join('')}<button class="pl" type="submit">${esc(p.label)} ↗</button></form>`
        : `<a class="pl" href="${esc(p.url)}" target="_blank" rel="noopener" data-apn="${esc(apn || '')}">${esc(p.label)} ↗</a>`;
      h += `<div class="pi">${link}${p.note ? `<div class="pn">${esc(p.note)}</div>` : ''}</div>`;
    }
    h += '</div>';
  }
  return h + '</div></details>';
}
export function rawHTML(raw: [string, string][]) {
  if (!raw.length) return '';
  return `<details class="fold sub rec-sec" data-sec="raw"><summary>Raw assessor record<span class="cnt">${raw.length} fields</span></summary><div class="rows mono">${raw.map(([k, v]) => `<div class="r"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`).join('')}</div></details>`;
}
function footHTML(rec: RecordData, deepState: 'loading' | 'done' | 'failed') {
  const d = rec.resolvedAt ? new Date(rec.resolvedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  return `<div class="ds-foot">${rec.sourcesAnswered || 0} of ${rec.sourcesQueried || 0} public sources answered${rec.sourcesLate ? ` (${rec.sourcesLate} late — refresh to fill them in)` : ''} · resolved ${d}${rec.cached ? ' (from the 30-day cache)' : ''}${deepState === 'loading' ? ' · <span class="wait">state &amp; federal layers and the terrain grid still loading…</span>' : deepState === 'failed' ? ' · the state/federal resolver did not answer' : ''}.<br>Assessor figures are the county’s own and are not an appraisal. Recorded documents, not GIS, are the authority on boundaries and easements. Every row names its publisher; nothing here is inferred.</div>`;
}

export interface RenderOpts { onSave?: (rec: RecordData) => void; saved?: boolean; title?: string; onImport?: (apn: string, file: File) => Promise<boolean>; }
// render the record into `box`, filling in as core and deep arrive; returns a cancel token
export function renderRecord(box: HTMLElement, t: Target, store: RecordStore, opts: RenderOpts = {}): { cancel: () => void } {
  let alive = true;
  const key = targetKey(t);
  box.innerHTML = `<div class="rec"><div class="lg wait">reading the county record…</div></div>`;
  const draw = (core: RecordData, deep: RecordData | null, deepState: 'loading' | 'done' | 'failed', expanded: boolean) => {
    if (!alive) return;
    if (core.error) { box.innerHTML = `<div class="rec"><div class="lg">The county resolver did not answer (${esc(core.error)}). <button class="mini" data-rec="refresh">try again</button></div></div>`; wire(); return; }
    const rec = mergeRecord(core, deep);
    const dims = readFrom(rec);
    const auth = rec.county ? `${esc(rec.county.name)}${rec.county.stateName ? ', ' + esc(rec.county.stateName) : ''}${rec.county.adapter ? ' · ' + esc(rec.county.authority || 'county adapter: ' + rec.county.adapter) : ' · no parcel adapter — federal + state record only'}` : '';
    let h = `<div class="rec" data-key="${esc(key)}"><div class="rec-head"><div class="rec-apn">${esc(rec.apn || (rec.center ? rec.center[0].toFixed(5) + ', ' + rec.center[1].toFixed(5) : ''))}</div><div class="rec-situs">${esc(rec.situs || '')}${rec.acreage ? `${rec.situs ? ' · ' : ''}${rec.acreage.toFixed(2)} ac` : ''}</div>${auth ? `<div class="rec-auth">${auth}</div>` : ''}
      <div class="rec-acts"><button class="mini" data-rec="expand">${expanded ? 'collapse all' : 'expand all'}</button><button class="mini" data-rec="refresh" title="re-resolve from every source">refresh</button><button class="mini" data-rec="print" title="open a clean report in a new tab">report ↗</button><button class="mini" data-rec="json">JSON</button>${rec.apn ? `<button class="mini" data-copy="${esc(rec.apn)}">copy APN</button>` : ''}${opts.onSave ? `<button class="mini gold" data-rec="save">${opts.saved ? '★ in research list' : '☆ save to research'}</button>` : ''}</div></div>`;
    h += flagsHTML(rec.flags);
    h += `<div class="rec-sub">The read — seven things the record can answer${deepState === 'loading' ? ' <span class="wait">(terrain grid loading)</span>' : ''}</div>` + readHTML(dims);
    h += sectionsHTML(rec, expanded, !!opts.onImport);
    h += recordsHTML(rec.records || []);
    h += portalsHTML(rec.portals || [], rec.apn);
    h += rawHTML(rec.raw || []);
    h += footHTML(rec, deepState) + '</div>';
    box.innerHTML = h;
    wire();
  };
  let expanded = true, coreData: RecordData | null = null, deepData: RecordData | null = null, deepState: 'loading' | 'done' | 'failed' = 'loading';
  const wire = () => {
    const root = box.querySelector('.rec') as HTMLElement | null; if (!root) return;
    root.querySelectorAll<HTMLElement>('[data-rec]').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.rec;
      if (a === 'expand') { expanded = !expanded; root.querySelectorAll<HTMLDetailsElement>('details.rec-sec').forEach(d => { if (d.dataset.sec !== 'raw') d.open = expanded; }); b.textContent = expanded ? 'collapse all' : 'expand all'; }
      else if (a === 'refresh') { deepState = 'loading'; load(true); }
      else if (a === 'print') { if (coreData) openReport(mergeRecord(coreData, deepData)); }
      else if (a === 'json') { if (coreData) { const rec = mergeRecord(coreData, deepData); const blob = new Blob([JSON.stringify({ ...rec, read: readFrom(rec) }, null, 2)], { type: 'application/json' }); const u = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = u; link.download = 'county-record-' + (rec.apn || 'point').replace(/[^0-9a-z-]/gi, '') + '.json'; link.click(); setTimeout(() => URL.revokeObjectURL(u), 2000); } }
      else if (a === 'save') { if (coreData && opts.onSave) { opts.onSave(mergeRecord(coreData, deepData)); b.textContent = '★ in research list'; } }
      else if (a === 'import') { if (!coreData || !coreData.apn || !opts.onImport) return; const input = document.createElement('input'); input.type = 'file'; input.accept = 'application/pdf'; input.onchange = async () => { const f = input.files && input.files[0]; if (!f) return; b.textContent = 'importing…'; (b as HTMLButtonElement).disabled = true; const ok = await opts.onImport!(coreData!.apn!, f); if (ok) { deepState = 'loading'; load(true); } else { b.textContent = '＋ import a property report (PDF)'; (b as HTMLButtonElement).disabled = false; } }; input.click(); }
    }));
    root.querySelectorAll<HTMLElement>('.pf, a.pl').forEach(el => el.addEventListener(el.tagName === 'FORM' ? 'submit' : 'click', () => { const apn = el.dataset.apn; if (apn) { try { navigator.clipboard?.writeText(apn); } catch { /* fine */ } } }));
  };
  const load = (refresh: boolean) => {
    store.fetch(t, 'core', refresh).then(core => { if (!alive) return; coreData = core; draw(core, deepData, deepState, expanded); });
    store.fetch(t, 'deep', refresh).then(deep => { if (!alive) return; deepData = deep.error ? null : deep; deepState = deep.error ? 'failed' : 'done'; if (coreData) draw(coreData, deepData, deepState, expanded); });
  };
  load(false);
  return { cancel: () => { alive = false; } };
}

// a clean, printable report in a new tab (light, paper-like; the user's browser prints it to PDF)
export function openReport(rec: RecordData) {
  const dims = readFrom(rec);
  const rows = (rs: Row[]) => rs.map(r => `<tr><th>${esc(r[0])}</th><td>${esc(r[1])}</td></tr>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>County record — ${esc(rec.apn || 'parcel')}</title>
<style>body{font:13px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1f1c;max-width:860px;margin:28px auto;padding:0 20px}h1{font-size:22px;margin:0 0 2px}h2{font-size:14px;letter-spacing:.06em;text-transform:uppercase;color:#4c5a52;margin:26px 0 6px;border-bottom:1px solid #d8ded9;padding-bottom:4px}.sub{color:#4c5a52;margin:0 0 14px}table{border-collapse:collapse;width:100%}th{text-align:left;width:34%;font-weight:600;color:#4c5a52;padding:4px 8px 4px 0;vertical-align:top;border-bottom:1px solid #eef1ee}td{padding:4px 0;vertical-align:top;border-bottom:1px solid #eef1ee}.flag{padding:6px 10px;border-left:3px solid #b98a2b;background:#fbf6e7;margin:4px 0}.flag.good{border-color:#4c8a3f;background:#eef6ea}.read{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px}.rd{border:1px solid #d8ded9;border-radius:6px;padding:8px 10px}.rd b{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#4c5a52}.rd i{display:block;font-style:normal;color:#4c5a52;font-size:11.5px}a{color:#1f5fa0}.foot{margin-top:24px;font-size:11px;color:#4c5a52}@media print{body{margin:0}}</style></head><body>
<h1>${esc(rec.apn || 'Point')}${rec.situs ? ' · ' + esc(rec.situs) : ''}</h1><p class="sub">${rec.acreage ? rec.acreage.toFixed(2) + ' ac · ' : ''}${rec.county ? esc(rec.county.name) + (rec.county.stateName ? ', ' + esc(rec.county.stateName) : '') + ' · ' : ''}resolved ${rec.resolvedAt ? new Date(rec.resolvedAt).toLocaleString() : ''} from ${rec.sourcesAnswered || 0} public sources · Ojai Atlas county record</p>
${rec.flags.map(f => `<div class="flag ${f.level}">${esc(f.text)}</div>`).join('')}
<h2>The read</h2><div class="read">${dims.map(d => `<div class="rd"><b>${esc(d.label)}</b>${esc(d.value)}${d.score != null ? ' · ' + d.score + '/100' : ''}<i>${esc(d.note)}</i></div>`).join('')}</div>
${rec.sections.map(s => `<h2>${esc(s.label)}</h2><table>${rows(s.rows)}</table>`).join('')}
${(rec.records || []).length ? `<h2>Recorded maps, surveys &amp; well reports</h2><table>${(rec.records || []).map(r => `<tr><th>${esc(r.label)}</th><td>${[r.year, r.surveyor, r.note].filter(Boolean).map(esc).join(' · ')}${r.url ? ` — <a href="${esc(r.url)}">scan</a>` : ''}</td></tr>`).join('')}</table>` : ''}
${(rec.portals || []).length ? `<h2>Where to look</h2><table>${(rec.portals || []).map(p => `<tr><th><a href="${esc(p.url)}">${esc(p.label)}</a></th><td>${esc(p.note || '')}</td></tr>`).join('')}</table>` : ''}
${(rec.raw || []).length ? `<h2>Raw assessor record</h2><table>${(rec.raw || []).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>` : ''}
<p class="foot">Assessor figures are the county’s own and are not an appraisal. Recorded documents, not GIS, are the authority on boundaries and easements. Sources: county GIS, California Geological Survey, FEMA, USGS, NRCS, BLM, US Census — each row names its publisher.</p></body></html>`;
  const w = window.open('', '_blank'); if (!w) return;
  w.document.open(); w.document.write(html); w.document.close();
}

// ---- the research list (this browser) ----------------------------------------------
const RS_KEY = 'atlasResearch';
export const research = {
  list(): ResearchItem[] { try { const j = JSON.parse(localStorage.getItem(RS_KEY) || '[]'); return Array.isArray(j) ? j : []; } catch { return []; } },
  save(items: ResearchItem[]) { try { localStorage.setItem(RS_KEY, JSON.stringify(items.slice(0, 60))); } catch { /* quota */ } },
  has(apn: string) { return this.list().some(i => i.apn === apn); },
  add(item: ResearchItem) { const l = this.list().filter(i => i.apn !== item.apn); l.unshift(item); this.save(l); },
  remove(apn: string) { this.save(this.list().filter(i => i.apn !== apn)); },
  note(apn: string, note: string) { const l = this.list(); const it = l.find(i => i.apn === apn); if (it) { it.note = note; this.save(l); } },
  fromRecord(rec: RecordData): ResearchItem | null {
    if (!rec.apn || !rec.center) return null;
    return { apn: rec.apn, county: rec.county?.fips, situs: rec.situs, acreage: rec.acreage, center: rec.center, bbox: rec.bbox || null, rings: rec.geometry?.rings || null, savedAt: new Date().toISOString() };
  }
};

// ---- the shared list: the same parcels for everyone, kept in the repository (data/research.json) ----
// The local list is the working copy; the cloud copy is merged in at boot and written through
// /api/research with the edit PIN. Without the PIN (or on a site without EDIT_PIN + GITHUB_TOKEN)
// the list simply stays in this browser.
export const cloud = { checked: false, synced: false, shared: 0 };
export function storedPin(): string { try { return localStorage.getItem('ojaiMapEditPin') || ''; } catch { return ''; } }
export function askPin(): string { let pin = storedPin(); if (!pin) { pin = window.prompt('Edit PIN (the same PIN the position editor uses)') || ''; if (pin) { try { localStorage.setItem('ojaiMapEditPin', pin); } catch { /* fine */ } } } return pin; }
export async function syncResearch(): Promise<{ synced: boolean; added: number }> {
  try {
    const r = await fetch('/api/research'); const j = await r.json() as { items?: ResearchItem[]; synced?: boolean };
    cloud.checked = true; cloud.synced = !!j.synced; const remote = j.items || []; cloud.shared = remote.length;
    const merged = research.list(); let added = 0;
    for (const it of remote) { const i = merged.findIndex(x => x.apn === it.apn); if (i < 0) { merged.push(it); added++; } else merged[i] = { ...merged[i], ...it, note: it.note ?? merged[i].note }; }
    research.save(merged);
    return { synced: cloud.synced, added };
  } catch { cloud.checked = true; return { synced: false, added: 0 }; }
}
export async function pushResearch(op: 'add' | 'remove' | 'note' | 'merge', payload: Record<string, unknown>, pin: string): Promise<{ ok: boolean; error?: string; status: number }> {
  try {
    const r = await fetch('/api/research', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin, op, ...payload }) });
    const j = await r.json().catch(() => ({})) as { ok?: boolean; error?: string; items?: ResearchItem[] };
    if (r.ok && j.items) cloud.shared = j.items.length;
    if (r.status === 401) { try { localStorage.removeItem('ojaiMapEditPin'); } catch { /* fine */ } }
    return { ok: !!j.ok, error: j.error, status: r.status };
  } catch { return { ok: false, error: 'unreachable', status: 0 }; }
}

// ---- compare ----------------------------------------------------------------------
export interface CompareCol { label: string; sub?: string; target: Target; }
export function compareHTML(cols: CompareCol[], recs: (RecordData | null)[]) {
  const dims = recs.map(r => (r && !r.error ? readFrom(r) : null));
  const get = (r: RecordData | null, k: string) => { if (!r) return ''; for (const s of r.sections) for (const row of s.rows) if (row[2] === k) return String(row[1]); return ''; };
  const short = (s: string, n = 34) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  const ids = ['buildable', 'entitlement', 'hazards', 'water', 'access', 'value', 'change'];
  let h = `<div class="cmp-wrap"><table class="cmp"><thead><tr><th></th>${cols.map(c => `<th><b>${esc(c.label)}</b>${c.sub ? `<i>${esc(c.sub)}</i>` : ''}</th>`).join('')}</tr></thead><tbody>`;
  h += `<tr><th>Acreage</th>${recs.map(r => `<td>${r ? (r.error ? '<span class="bad">no record</span>' : r.acreage != null ? r.acreage.toFixed(2) + ' ac' : '—') : '<span class="wait">…</span>'}</td>`).join('')}</tr>`;
  h += `<tr><th>Assessed value</th>${recs.map(r => `<td>${esc(short(get(r, 'total_value') || '—'))}</td>`).join('')}</tr>`;
  h += `<tr><th>Zoning</th>${recs.map(r => `<td>${esc(short(get(r, 'zoning') || get(r, 'genplan') || '—'))}</td>`).join('')}</tr>`;
  h += `<tr><th>Fire severity</th>${recs.map(r => `<td>${esc(short(get(r, 'fire_sev').split(' · ')[0] || '—', 18))}</td>`).join('')}</tr>`;
  h += `<tr><th>Flood (FEMA)</th>${recs.map(r => `<td>${esc(short((get(r, 'nfhl') || get(r, 'flood100')).split(' — ')[0] || '—', 30))}</td>`).join('')}</tr>`;
  h += `<tr><th>Slope (mean)</th>${recs.map(r => `<td>${r?.terrain ? r.terrain.meanSlope + ' % · ' + r.terrain.aspect : '—'}</td>`).join('')}</tr>`;
  for (const id of ids) {
    h += `<tr class="dim"><th>${esc((dims.find(Boolean) || [])?.find(d => d.id === id)?.label || id)}</th>${dims.map(ds => { const d = ds?.find(x => x.id === id); return `<td>${d ? `${esc(short(d.value, 40))}${d.score != null ? `<div class="rd-bar"><i style="width:${d.score}%"></i></div>` : ''}` : '—'}</td>`; }).join('')}</tr>`;
  }
  h += '</tbody></table></div>';
  return h;
}
