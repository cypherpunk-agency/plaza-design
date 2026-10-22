/**
 * Frames of the title and the glide at fixed times, drawn in Chromium exactly as the game draws them (Opening.draw),
 * saved as PNGs for before/after review:
 *   npx tsx scripts/game-tests/capture-glide-frames.mts <out-dir> [label]
 * Needs playwright-core and a Chromium (PLAYWRIGHT_CORE, CHROMIUM; defaults are this container's).
 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url'; import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url)), pkg = path.resolve(here, '../..'), root = path.resolve(pkg, '../..');
const out = path.resolve(process.argv[2] ?? path.join(root, '.game-test-output/glide-frames')), label = process.argv[3] ?? 'frame';
fs.mkdirSync(out, { recursive: true });
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE ?? '/opt/node-tools/node_modules/playwright-core');
const exe = process.env.CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const js = path.join(root, '.game-test-output/glide-frames.js');
await build({ entryPoints: [path.join(here, 'capture-glide-browser.ts')], outfile: js, bundle: true, platform: 'browser', format: 'iife', target: 'es2022', logLevel: 'warning', loader: { '.png': 'dataurl' } });
const fonts = ['400', '500', '600', '700'].map(w => `@font-face{font-family:"IBM Plex Mono";font-weight:${w};src:url(/fonts/ibm-plex-mono-latin-${w}-normal.woff2)}`).join('');
const html = `<!doctype html><meta charset="utf-8"><style>${fonts}body{margin:0;background:#000}</style><script src="/glide.js"></script>`;
const server = http.createServer((req, res) => {
  const route = new URL(req.url!, 'http://127.0.0.1').pathname;
  if (route === '/') { res.setHeader('Content-Type', 'text/html'); res.end(html); return; }
  if (route === '/glide.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(fs.readFileSync(js)); return; }
  const font = /^\/fonts\/(ibm-plex-mono-latin-\d00-normal\.woff2)$/.exec(route);
  if (font) { res.setHeader('Content-Type', 'font/woff2'); res.end(fs.readFileSync(path.join(root, 'packages/plaza-design-core/fonts', font[1]))); return; }
  res.statusCode = 404; res.end();
});
await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
const port = (server.address() as { port: number }).port;

/** The times: the settled title, then the glide's beats and the stretches between them. */
const taus: (number | null)[] = [null, 0, 4, 9, 13, 15, 17, 19, 22, 26, 30, 35, 40, 44, 47.5, 50, 52.5, 55, 57.5, 60, 62.7, 64.5, 67];
const sizes = [{ width: 1280, height: 720, k: 2 }, { width: 960, height: 540, k: 2 }];
const browser = await chromium.launch({ executablePath: exe, args: ['--disable-gpu', '--font-render-hinting=none'] });
try {
  const page = await browser.newPage();
  page.on('pageerror', (e: Error) => console.error('page error:', e.message));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => typeof (window as any).glideShots === 'function');
  for (const size of sizes) {
    const shots = taus.map(tau => ({ id: `${size.width}x${size.height}-${tau === null ? 'title' : 'tau' + String(tau).padStart(4, '0')}`, tau, ...size }));
    const frames: { id: string; png: string; ms: number }[] = await page.evaluate((s: unknown) => (window as any).glideShots(s), shots);
    for (const f of frames) { fs.writeFileSync(path.join(out, `${label}-${f.id}.png`), Buffer.from(f.png.split(',')[1], 'base64')); console.log(f.id, f.ms.toFixed(1) + ' ms'); }
  }
} finally { await browser.close(); server.close(); }
