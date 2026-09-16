// ============================================================================
//  lib/store.js — the atlas's persistence layer: JSON files and uploads that
//  live in the repository itself, written through the GitHub API. No database,
//  no second service: the research list, the photo/document uploads and the
//  icon layout are all plain files in git, so they are versioned, reviewable
//  and survive any redeploy. Data-only commits do not trigger a Vercel build
//  (vercel.json `ignoreCommand`), so the API reads them back from GitHub at
//  request time with a short in-memory cache.
//
//  Needs two env vars on Vercel: EDIT_PIN (the shared PIN every write checks)
//  and GITHUB_TOKEN (fine-grained PAT, Contents read/write on this repo);
//  GITHUB_REPO overrides the default slug. Without them every write returns
//  501 `not_configured` and the clients fall back to local storage.
// ============================================================================
const REPO = () => process.env.GITHUB_REPO || 'SacredRebel/howard-property-dev';
const TOKEN = () => process.env.GITHUB_TOKEN || '';
const RAW = () => 'https://raw.githubusercontent.com/' + REPO() + '/main/';
const API = 'https://api.github.com/repos/';
const gh = (path, init = {}) => fetch(API + REPO() + path, Object.assign({}, init, {
  headers: Object.assign({ Authorization: 'Bearer ' + TOKEN(), Accept: 'application/vnd.github+json', 'User-Agent': 'howard-property-atlas', 'X-GitHub-Api-Version': '2022-11-28' }, init.headers || {}),
}));

export const configured = () => !!(process.env.EDIT_PIN && TOKEN());
export const pinOk = (pin) => !!process.env.EDIT_PIN && String(pin || '') === String(process.env.EDIT_PIN);

const mem = new Map();   // path -> { ts, data }
export const cached = (path) => (mem.get(path) || {}).data;
export function remember(path, data) { mem.set(path, { ts: Date.now(), data }); return data; }

// read a JSON file from the repository: fresh through the Contents API when a token is set,
// otherwise from raw.githubusercontent (a CDN, up to ~5 minutes behind). Cached per instance.
export async function readJson(path, fallback, ttlMs = 60000) {
  const hit = mem.get(path);
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data;
  try {
    let data;
    if (TOKEN()) {
      const r = await gh('/contents/' + path + '?ref=main');
      if (r.status === 404) data = fallback;
      else if (!r.ok) throw new Error('github ' + r.status);
      else { const j = await r.json(); data = JSON.parse(Buffer.from(j.content, 'base64').toString('utf8')); }
    } else {
      const r = await fetch(RAW() + path + '?t=' + Math.floor(Date.now() / 60000));
      data = r.ok ? await r.json() : fallback;
    }
    return remember(path, data);
  } catch (e) {
    return hit ? hit.data : fallback;
  }
}

// read-modify-write one JSON file (Contents API); retried once on a sha conflict
export async function updateJson(path, mutate, message) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await gh('/contents/' + path + '?ref=main');
    let sha, cur = null;
    if (r.ok) { const j = await r.json(); sha = j.sha; cur = JSON.parse(Buffer.from(j.content, 'base64').toString('utf8')); }
    else if (r.status !== 404) throw new Error('github read ' + r.status);
    const next = mutate(cur);
    const put = await gh('/contents/' + path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, content: Buffer.from(JSON.stringify(next, null, 2) + '\n').toString('base64'), sha, branch: 'main' }) });
    if (put.ok) { remember(path, next); const j = await put.json(); return { data: next, commit: j.commit && j.commit.sha }; }
    if (put.status !== 409 && put.status !== 422) throw new Error('github write ' + put.status + ' ' + (await put.text()).slice(0, 200));
  }
  throw new Error('github write conflict');
}

// several files in one commit (Git Data API: blobs → tree → commit → ref)
// files: [{ path, content: Buffer | string }]
export async function commitFiles(files, message) {
  const refR = await gh('/git/ref/heads/main'); if (!refR.ok) throw new Error('github ref ' + refR.status);
  const head = (await refR.json()).object.sha;
  const baseTree = (await (await gh('/git/commits/' + head)).json()).tree.sha;
  const tree = [];
  for (const f of files) {
    const content = Buffer.isBuffer(f.content) ? f.content : Buffer.from(f.content);
    const b = await gh('/git/blobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: content.toString('base64'), encoding: 'base64' }) });
    const blob = await b.json();
    if (!blob.sha) throw new Error('blob failed ' + b.status + ': ' + JSON.stringify(blob).slice(0, 200));
    tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const t = await gh('/git/trees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ base_tree: baseTree, tree }) });
  const newTree = await t.json(); if (!newTree.sha) throw new Error('tree failed ' + t.status);
  const c = await gh('/git/commits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, tree: newTree.sha, parents: [head] }) });
  const commit = await c.json(); if (!commit.sha) throw new Error('commit failed ' + c.status);
  const u = await gh('/git/refs/heads/main', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sha: commit.sha }) });
  if (!u.ok) throw new Error('ref update ' + u.status + ' ' + (await u.text()).slice(0, 200));
  return commit.sha;
}

// ---- the files this store knows ----------------------------------------------------------
export const RESEARCH_PATH = 'data/research.json';   // { items: [ResearchItem] }
export const UPLOADS_PATH = 'data/uploads.json';     // { images: { pid: { zid: { cat: [path] } } }, docs: { pid: [{ label, file, uploadedAt }] } }
export const slug = (s) => String(s || 'file').toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'file';
