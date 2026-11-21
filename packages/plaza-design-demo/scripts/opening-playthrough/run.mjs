// node scripts/opening-playthrough/run.mjs [outDir] [--no-build] [--dist <dir>]
//
// The prologue smoke run. Plays a NEW GAME of ACCESS DENIED in headless Chrome (own profile, own port) against dist-homepage
// served locally, from the title to the first morning, and fails with a readable message when a beat does not arrive. It writes
// <outDir>/trace.json (one record per beat: scene, phase, flags, city clock, bubble, prompt, hint, goal, checkpoint/card,
// captions, terminal) and a screenshot per beat. See README.md. It starts a chrome and a static server and stops only those.
// It runs `pnpm build:homepage` first unless --no-build is given.
import { launch } from './cdp.mjs';
import { serve } from './serve.mjs';
import { driver } from './lib.mjs';
import { segments } from './prologue.mjs';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '../..'), root = path.resolve(pkg, '../..');
const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(name); return i < 0 ? dflt : args[i + 1]; };
const outDir = path.resolve(args[0] && !args[0].startsWith('--') ? args[0] : path.join(root, '.game-test-output/prologue'));
const dist = path.resolve(flag('--dist', path.join(pkg, 'dist-homepage')));
if (!args.includes('--no-build') && !args.includes('--dist')) {
  const r = spawnSync('pnpm', ['build:homepage'], { cwd: root, stdio: 'inherit', shell: true });
  if (r.status !== 0) throw new Error('pnpm build:homepage failed');
}
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('no build at ' + dist + ' (run without --no-build)');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const port = Number(flag('--port', '9355')), httpPort = Number(flag('--http', '8777'));
const srv = await serve(dist, httpPort);
const b = await launch({ port });
const d = driver(b, outDir);
const t0 = Date.now();
let failure = null;
try {
  for (const [name, run] of segments) {
    console.log('--- segment', name);
    await run(d, b, srv.url);
  }
} catch (e) { failure = e; console.error('FAILED:', e.message); try { await d.beat('FAILURE', String(e.message)); } catch {} }
finally { d.save(); await b.close(); await srv.stop(); }
const took = Math.round((Date.now() - t0) / 1000) + ' s';
if (failure) { console.error(`PROLOGUE FAILED after ${d.beats.length} beats (${took}); trace and screenshots in ${outDir}`); process.exit(1); }
console.log(`PROLOGUE OK: ${d.beats.length} beats in ${took}; trace in ${path.join(outDir, 'trace.json')}`);
