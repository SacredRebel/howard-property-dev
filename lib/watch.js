// lib/watch.js — the watch: the county roll re-read on a schedule, so a title that moves is seen.
//
//   The county parcel layer carries, per APN, the last recorded instrument (number, date, kind),
//   the date of the last value transfer, the assessed values, the roll's sale price, the Prop 13
//   base year and the acreage. When any of those change, title or value moved — a new deed, a
//   reassessment, a lot split. `sentinelFrom(adapterId, attributes)` is that set of facts and
//   nothing else (no names, so the log can live in the public repository).
//
//   `scripts/watch-records.mjs` reads /api/parcel for every watched APN once a week (the GitHub
//   Action in .github/workflows/watch.yml), `applyCheck` folds each answer into data/watch.json
//   (per parcel: the current sentinel, when it was last checked, the dated list of changes), and
//   the record shows a *Watch* row in Ownership & title plus a `moved` flag when the roll changed
//   after the evidence on file was prepared. A change also opens a GitHub issue, so the owner of
//   the atlas is told by email without anyone visiting.

export const WATCH_PATH = 'data/watch.json';
export const EMPTY_WATCH = { schema: 1, updatedAt: null, parcels: {} };

const clean = (v) => (v == null ? '' : String(v).trim());
const num = (v) => { const s = clean(v); if (!s) return null; const n = Number(s.replace(/[^0-9.-]/g, '')); return isFinite(n) ? n : null; };
const iso8 = (v) => (/^\d{8}$/.test(clean(v)) ? clean(v).replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3') : null);
const isoAny = (v) => { const s = clean(v); if (!s) return null; if (/^\d{8}$/.test(s)) return iso8(s); if (/^\d{13}$/.test(s)) return new Date(Number(s)).toISOString().slice(0, 10); const d = new Date(s); return isNaN(d) ? null : d.toISOString().slice(0, 10); };
const long = (iso) => { if (!iso) return null; const d = new Date(String(iso).slice(0, 10) + 'T12:00:00Z'); return isNaN(d) ? String(iso) : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }); };
const money = (n) => (n == null ? null : '$' + Math.round(n).toLocaleString('en-US'));

// the roll facts whose change means "title or value moved", per county adapter
export function sentinelFrom(adapterId, a) {
  a = a || {};
  if (adapterId === 'losangeles') {
    const lv = num(a.Roll_LandValue), iv = num(a.Roll_ImpValue);
    return {
      doc: null,
      transfer: null,
      baseYear: clean(a.Roll_LandBaseYear) || null,
      values: { land: lv, imp: iv, total: lv != null || iv != null ? (lv || 0) + (iv || 0) : null, rollYear: clean(a.Roll_Year) || null },
      sale: null,
      acreage: num(a['Shape.STArea()']) ? Number((num(a['Shape.STArea()']) / 43560).toFixed(3)) : null,
      exemption: num(a.Roll_HomeOwnersExemp) || null,
    };
  }
  // Ventura (and any adapter with the same roll fields)
  const lv = num(a.L_V), iv = num(a.I_V);
  const nr = clean(a.DOC_NR);
  return {
    doc: nr ? { nr, date: iso8(a.DOC_DT), kind: clean(a.DOC_TYPE) || null } : null,
    transfer: isoAny(a.DT_V_TRF_Y),
    baseYear: null,
    values: { land: lv, imp: iv, total: lv != null || iv != null ? (lv || 0) + (iv || 0) : null, rollYear: null },
    sale: num(a.SP) || null,
    acreage: num(a.ACREAGE) != null ? Number(num(a.ACREAGE).toFixed(3)) : null,
    exemption: null,
  };
}

// what is compared between two checks, in the order it is reported
export const WATCHED = [
  ['doc.nr', 'last recorded document', (v) => v || '—'],
  ['doc.date', 'document date', (v) => long(v) || '—'],
  ['doc.kind', 'document type', (v) => v || '—'],
  ['transfer', 'value-transfer date', (v) => long(v) || '—'],
  ['baseYear', 'Prop 13 base year', (v) => v || '—'],
  ['values.total', 'assessed total', (v) => money(v) || '—'],
  ['sale', 'sale price on the roll', (v) => money(v) || '—'],
  ['acreage', 'acreage', (v) => (v == null ? '—' : v + ' ac')],
  ['exemption', 'homeowner’s exemption', (v) => money(v) || '—'],
];
const at = (o, path) => path.split('.').reduce((v, k) => (v == null ? null : v[k]), o);

// the changes between two sentinels; a missing value on the new side never counts as a change
// (a late or partial answer must not log a false "removed")
export function diffSentinel(prev, next) {
  if (!prev || !next) return [];
  const out = [];
  for (const [key, label, fmt] of WATCHED) {
    const a = at(prev, key), b = at(next, key);
    if (b == null || b === '') continue;
    if (String(a == null ? '' : a) === String(b)) continue;
    out.push({ key, label, from: a == null ? null : a, to: b, text: label + ': ' + fmt(a) + ' → ' + fmt(b) });
  }
  return out;
}

// fold one /api/parcel answer into the watch file; returns what changed (or null when unusable)
export function applyCheck(watch, parcel, now) {
  now = now || new Date().toISOString();
  if (!parcel || !parcel.apn10 || !parcel.sentinel) return null;
  watch.parcels = watch.parcels || {};
  const key = String(parcel.apn10);
  const entry = watch.parcels[key] || { apn: parcel.apn || key, county: parcel.county ? parcel.county.fips : null, label: null, firstSeen: now, checks: 0, history: [] };
  const changes = diffSentinel(entry.current, parcel.sentinel);
  if (changes.length) entry.history = [{ at: now, changes: changes.map((c) => ({ key: c.key, from: c.from, to: c.to })) }].concat(entry.history || []).slice(0, 60);
  entry.current = parcel.sentinel;
  entry.lastChecked = now;
  entry.checks = (entry.checks || 0) + 1;
  if (parcel.situs) entry.situs = parcel.situs;
  if (parcel.acreage != null) entry.acreage = parcel.acreage;
  watch.parcels[key] = entry;
  watch.updatedAt = now;
  return { apn: entry.apn, apn10: key, changes, first: entry.checks === 1 };
}

const fmtChange = (c) => { const w = WATCHED.find((x) => x[0] === c.key); return w ? w[1] + ' ' + w[2](c.from) + ' → ' + w[2](c.to) : c.key; };

// the row in Ownership & title
export function watchRow(entry) {
  if (!entry || !entry.lastChecked) return null;
  const n = (entry.history || []).length;
  const latest = n ? entry.history[0] : null;
  const text = 'This parcel is on the weekly watch — the live county roll was re-read ' + long(entry.lastChecked) + ' (' + (entry.checks || 1) + ' check' + ((entry.checks || 1) === 1 ? '' : 's') + ' since ' + long(entry.firstSeen) + ')'
    + (n ? ' · ' + n + ' change' + (n === 1 ? '' : 's') + ' seen — latest ' + long(latest.at) + ': ' + latest.changes.map(fmtChange).join('; ') : ' · nothing has moved on the roll since the watch began')
    + '. A change here means a new document, a reassessment or a lot change at the county; the names come from the evidence on file, so re-order a report when the watch moves.';
  return ['Watch', text, 'title_watch'];
}

// a flag when the roll moved after the evidence on file was prepared
export function watchFlag(entry, evidence) {
  if (!entry || !(entry.history || []).length) return null;
  const evWhen = evidence ? ((evidence.source || {}).preparedOn || String(evidence.importedAt || '').slice(0, 10)) : null;
  const moved = entry.history.find((h) => h.changes.some((c) => /^(doc\.|transfer|baseYear|sale)/.test(c.key)) && (!evWhen || String(h.at).slice(0, 10) > evWhen));
  if (!moved) return null;
  const what = moved.changes.filter((c) => /^(doc\.|transfer|baseYear|sale)/.test(c.key)).map(fmtChange).join('; ');
  return { level: 'watch', key: 'moved', text: 'The watch saw the county roll move on ' + long(moved.at) + ' — ' + what + (evWhen ? '. That is after the evidence on file (' + long(evWhen) + '): the owner, the loans and the liens named above may be out of date; re-order the report before relying on them.' : '. Pull the document at the Recorder to see what changed.') };
}

// summary for the GitHub issue / the action log
export function summarize(results, site) {
  const changed = results.filter((r) => r && r.changes.length);
  const lines = [];
  lines.push('The weekly watch re-read the county roll for ' + results.filter(Boolean).length + ' parcel' + (results.filter(Boolean).length === 1 ? '' : 's') + ' on ' + long(new Date().toISOString()) + '.');
  lines.push('');
  if (!changed.length) lines.push('Nothing moved.');
  changed.forEach((r) => {
    lines.push('### ' + r.apn + (r.situs ? ' — ' + r.situs : ''));
    r.changes.forEach((c) => lines.push('- ' + (c.text || fmtChange(c))));
    if (site) lines.push('- record: ' + site.replace(/\/$/, '') + '/?apn=' + encodeURIComponent(r.apn));
    lines.push('');
  });
  return { changed: changed.length, text: lines.join('\n') };
}
