// boots the server on :5001 (unless ATLAS_URL points elsewhere), runs both suites, exits non-zero on failure
import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const external = !!process.env.ATLAS_URL;
const alive = async () => { try { return (await fetch('http://localhost:5001/api/health')).ok; } catch { return false; } };
let srv = null;
if (!external && await alive()) console.log('using the server already listening on :5001');
else if (!external) {
  srv = spawn('node', ['server-complete.js'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PORT: '5001' } });
  srv.stderr.on('data', d => process.stderr.write('[server] ' + d));
  for (let i = 0; i < 60; i++) { try { const r = await fetch('http://localhost:5001/api/health'); if (r.ok) break; } catch { /* not yet */ } await new Promise(r => setTimeout(r, 500)); }
}
let code = 0;
for (const f of ['title.test.mjs', 'classic.test.mjs', 'v2.test.mjs']) {
  console.log(`\n=== ${f} ===`);
  const c = await new Promise(res => { const p = spawn('node', [join(here, f)], { stdio: 'inherit', env: process.env }); p.on('exit', res); });
  if (c) code = 1;
}
if (srv) srv.kill();
process.exit(code);
