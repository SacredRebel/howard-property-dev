// shared harness: a Chromium with software GL, stub tiles, the checks list
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
export const here = dirname(fileURLToPath(import.meta.url));
export const OUT = join(here, 'out'); mkdirSync(OUT, { recursive: true });
export const PNG = readFileSync(join(here, 'fixtures', 'stub256.png'));
export const DEM = readFileSync(join(here, 'fixtures', 'dem256.png'));
export const BASE = process.env.ATLAS_URL || 'http://localhost:5001';
export const EXT = /wsrv\.nl|raw\.githubusercontent|conservation\.ca\.gov|nationalmap\.gov|fema\.gov|usgs\.gov|blm\.gov|water\.ca\.gov|historical1\.arcgis\.com|egov\.usda\.gov|maps\.ventura\.org|arcgisonline|amazonaws|google\.com|openstreetmap|demotiles|unpkg\.com\/maplibre/;
export async function launch() {
  const opts = { args: ['--no-sandbox', '--enable-unsafe-swiftshader'] };
  // CHROMIUM_PATH overrides; otherwise Playwright's own download, or a system Chromium if one is at a known path
  const sys = ['/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
  if (process.env.CHROMIUM_PATH) opts.executablePath = process.env.CHROMIUM_PATH;
  else if (!existsSync(chromium.executablePath()) && sys) opts.executablePath = sys;
  return chromium.launch(opts);
}
const failures = [];
export function check(name, ok, detail) { const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 400) : ''}`; console.log(line); if (!ok) failures.push(name); }
export function done(suite) { if (failures.length) { console.log(`\n${suite}: ${failures.length} failed — ${failures.join(', ')}`); process.exitCode = 1; } else console.log(`\n${suite}: all checks passed`); }
