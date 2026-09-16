// Photo galleries: the same /api/images manifest the classic page uses,
// thumbnails through the wsrv.nl resizing CDN, one lightbox for the whole app.
const RAW = 'https://raw.githubusercontent.com/SacredRebel/howard-property-dev/main';
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export function abs(src: string): string { return src.startsWith('http') ? src : RAW + src; }
export function cdn(src: string, w: number): string { return `https://wsrv.nl/?url=${encodeURIComponent(abs(src))}&w=${w}&q=82&output=webp`; }

interface ImagesResponse { success?: boolean; images?: string[]; hasSubcategories?: boolean; subcategoryData?: Record<string, string[]> | null; }
const cache = new Map<string, Promise<ImagesResponse>>();
export function invalidate(pid: string, zid: string) { for (const k of [...cache.keys()]) if (k.startsWith(`${pid}/${zid}/`)) cache.delete(k); }
function fetchImages(pid: string, zid: string, cat: string): Promise<ImagesResponse> {
  const k = `${pid}/${zid}/${cat}`;
  let p = cache.get(k);
  if (!p) { p = fetch(`/api/images/${encodeURIComponent(pid)}/${encodeURIComponent(zid)}/${cat}`).then(r => r.json()).catch(() => ({ images: [] })); cache.set(k, p); }
  return p;
}

export interface GallerySet { category: 'current' | 'vision'; groups: { label: string | null; images: string[] }[]; count: number; }

// the mode's category first, the other as a fallback so a card is never empty
export async function galleryFor(pid: string, zid: string, mode: 'today' | 'vision'): Promise<GallerySet | null> {
  const order: ('current' | 'vision')[] = mode === 'vision' ? ['vision', 'current'] : ['current', 'vision'];
  for (const cat of order) {
    const r = await fetchImages(pid, zid, cat);
    const groups: GallerySet['groups'] = [];
    if (r.hasSubcategories && r.subcategoryData) {
      for (const [label, imgs] of Object.entries(r.subcategoryData)) if (imgs.length) groups.push({ label, images: imgs });
    } else if (r.images?.length) groups.push({ label: null, images: r.images });
    const count = groups.reduce((n, g) => n + g.images.length, 0);
    if (count) return { category: cat, groups, count };
  }
  return null;
}

export function galleryHTML(g: GallerySet | null, fallbackCat: 'current' | 'vision'): string {
  if (!g) return '';
  let h = `<div class="gal"><div class="gal-head"><span>📸 ${g.count} photo${g.count === 1 ? '' : 's'}</span><span class="gal-cat ${g.category}">${g.category === 'vision' ? 'VISION' : 'TODAY'}${g.category !== fallbackCat ? ' · no ' + fallbackCat + ' photos yet' : ''}</span></div>`;
  let idx = 0;
  const all: string[] = [];
  for (const grp of g.groups) {
    if (grp.label) h += `<div class="gal-sub">${esc(grp.label)}</div>`;
    h += '<div class="gal-strip">';
    for (const src of grp.images) { h += `<img class="gal-th" src="${cdn(src, 320)}" data-i="${idx}" alt="" loading="${idx < 6 ? 'eager' : 'lazy'}" decoding="async">`; all.push(src); idx++; }
    h += '</div>';
  }
  h += '</div>';
  return h;
}

// ---- lightbox ----------------------------------------------------------------
let box: HTMLElement | null = null, list: string[] = [], cur = 0;
function ensure() {
  if (box) return box;
  box = document.createElement('div'); box.className = 'lightbox'; box.hidden = true;
  box.innerHTML = `<button class="lb-x" title="close (Esc)">✕</button><button class="lb-prev" title="previous (←)">‹</button><img alt=""><button class="lb-next" title="next (→)">›</button><div class="lb-n"></div>`;
  document.body.appendChild(box);
  box.addEventListener('click', e => { const t = e.target as HTMLElement; if (t.closest('.lb-x') || t === box) close(); else if (t.closest('.lb-prev')) show(cur - 1); else if (t.closest('.lb-next')) show(cur + 1); });
  window.addEventListener('keydown', e => { if (!box || box.hidden) return; if (e.key === 'Escape') { close(); e.stopPropagation(); } else if (e.key === 'ArrowLeft') show(cur - 1); else if (e.key === 'ArrowRight') show(cur + 1); });
  // swipe on touch: a horizontal flick turns the page, a downward flick closes
  let sx = 0, sy = 0, st = 0;
  box.addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; st = performance.now(); }, { passive: true });
  box.addEventListener('touchend', e => {
    const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy, dt = performance.now() - st;
    if (dt > 700) return;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) show(dx < 0 ? cur + 1 : cur - 1);
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.4) close();
  }, { passive: true });
  return box;
}
function show(i: number) {
  const b = ensure(); if (!list.length) return;
  cur = (i + list.length) % list.length;
  const img = b.querySelector('img')!; img.src = cdn(list[cur], 1600);
  b.querySelector('.lb-n')!.textContent = `${cur + 1} / ${list.length}`;
  for (const j of [cur + 1, cur - 1]) { const pre = new Image(); pre.src = cdn(list[(j + list.length) % list.length], 1600); }
}
export function openLightbox(images: string[], i: number) { list = images; ensure().hidden = false; show(i); }
export function close() { if (box) box.hidden = true; }
export function isOpen() { return !!box && !box.hidden; }

// wire thumbnails inside a container (call after innerHTML)
export function wireGallery(root: HTMLElement, g: GallerySet | null) {
  if (!g) return;
  const all = g.groups.flatMap(x => x.images);
  root.querySelectorAll<HTMLImageElement>('.gal-th').forEach(el => el.addEventListener('click', () => openLightbox(all, Number(el.dataset.i))));
}
