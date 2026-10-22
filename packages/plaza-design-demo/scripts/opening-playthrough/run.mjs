// node scripts/opening-playthrough/run.mjs <outDir> [--build] [--dist <dir>] [--from <segment> --profile <dir>] [--only <segment,...>]
//
// Plays the opening of ACCESS DENIED in headless Chrome (own profile, own port) against dist-homepage served locally,
// and writes <outDir>/trace.json (one record per beat: scene, phase, flags, city clock, bubble, prompt, hint, goal,
// checkpoint/card, captions, terminal) and a screenshot per beat. See README.md. It starts a chrome and a static server and
// stops only those. `--build` runs `pnpm build:homepage` first (from the repository root).
import { launch } from './cdp.mjs';
import { serve } from './serve.mjs';
import { driver } from './lib.mjs';
import { segments } from './opening.mjs';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '../..');
const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(name); return i < 0 ? dflt : args[i + 1]; };
const outDir = path.resolve(args[0] && !args[0].startsWith('--') ? args[0] : 'opening-playthrough-out');
const dist = path.resolve(flag('--dist', path.join(pkg, 'dist-homepage')));
if (args.includes('--build')) {
  const r = spawnSync('pnpm', ['build:homepage'], { cwd: path.resolve(pkg, '../..'), stdio: 'inherit', shell: true });
  if (r.status !== 0) throw new Error('pnpm build:homepage failed');
}
fs.mkdirSync(outDir, { recursive: true });
const profileDir = flag('--profile');
const from = flag('--from'), only = flag('--only')?.split(',');
const port = Number(flag('--port', '9355')), httpPort = Number(flag('--http', '8777'));
const srv = await serve(dist, httpPort);
const b = await launch({ port, profileDir });
const d = driver(b, outDir);
let failure = null;
try {
  let on = !from;
  for (const [name, run] of segments) {
    if (name === from) on = true;
    if (!on || (only && !only.includes(name))) continue;
    console.log('--- segment', name);
    if (from && name === from && name !== 'title') { await b.goto(srv.url + '?play&probe'); await new Promise(r => setTimeout(r, 1500)); await b.tap('Escape'); await new Promise(r => setTimeout(r, 800)); await b.tap('ArrowDown'); await b.tap('Enter'); await new Promise(r => setTimeout(r, 1500)); }
    await run(d, b, srv.url);
  }
} catch (e) { failure = e; console.error('FAILED:', e.message); try { await d.beat('FAILURE', String(e.message)); } catch {} }
finally { d.save(); await b.close(); await srv.stop(); }
if (failure) process.exit(1);
console.log('wrote', path.join(outDir, 'trace.json'), d.beats.length, 'beats');
