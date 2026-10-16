/** Isolated baseline/candidate renderer and local evidence writer. Not part of production. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
const demo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const root = path.resolve(demo, '../..');
const local = path.join(root, '.scene-system');
const output = path.join(local, 'fixture');
fs.mkdirSync(output, { recursive: true });
const seed = `let fixtureSeed=12345;window.__resetSeed=()=>fixtureSeed=12345;Math.random=()=>((fixtureSeed=Math.imul(fixtureSeed,1664525)+1013904223>>>0)/4294967296);Date.now=()=>1700000000000;window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};Object.defineProperty(performance,'now',{value:()=>1000});`;
for (const mode of ['baseline', 'candidate']) {
  const source = mode === 'baseline' ? path.join(local, 'baseline/source/ssg/game') : path.join(demo, 'src/ssg/game');
  await build({ entryPoints: [path.join(demo, 'scripts/scene-system/fixture.ts')], bundle: true,
    format: 'esm', outfile: path.join(output, `${mode}.js`), banner: { js: seed },
    plugins: [{ name: 'snapshot', setup(b) { b.onResolve({ filter: /^@(fixture|candidate|reference)\// }, a => {
      const current = a.path.startsWith('@candidate/') || (mode === 'candidate' && a.path.startsWith('@fixture/'));
      const aliases: Record<string, string> = { game: 'runtime/game', level: 'runtime/save', clock: 'world/clock', cutscenes: 'story/cutscenes', title: 'story/title', citymap: 'ui/citymap' };
      const name = a.path.replace(/^@\w+\//, '');
      const target = path.join(a.path.startsWith('@reference/') ? path.join(local, 'baseline/source/ssg/game') : a.path.startsWith('@candidate/') ? path.join(demo, 'src/ssg/game') : source, current ? aliases[name] ?? name : name);
      return { path: fs.existsSync(`${target}.ts`) ? `${target}.ts` : path.join(target, 'index.ts') };
    }); } }], });
}
let html = fs.readFileSync(path.join(demo, 'dist-homepage/index.html'), 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
html = html.replace('<html', '<html class="game-mode"');
for (const mode of ['baseline', 'candidate']) fs.writeFileSync(path.join(output, `${mode}.html`), html.replace('</body>', `<script type="module" src="/${mode}.js"></script></body>`));
if (!process.argv.includes('--build-only')) http.createServer(async (req, res) => {
  const url = new URL(req.url!, 'http://127.0.0.1:4190');
  if (req.method === 'POST' && url.pathname === '/evidence') {
    if (req.headers.origin !== 'http://127.0.0.1:4190') { res.writeHead(403).end('Origin rejected'); return; }
    const parts = []; let length = 0;
    for await (const chunk of req) { length += chunk.length; if (length > 40_000_000) { res.writeHead(413).end(); return; } parts.push(chunk); }
    const { name, data } = JSON.parse(Buffer.concat(parts).toString());
    if (!/^[a-zA-Z0-9_.-]+$/.test(name)) { res.writeHead(400).end(); return; }
    const dir = path.join(local, 'evidence'); fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, name);
    const bytes = data.startsWith('data:image/png;base64,') ? Buffer.from(data.split(',')[1], 'base64') : Buffer.from(data);
    if (fs.existsSync(dest) && !fs.readFileSync(dest).equals(bytes)) { res.writeHead(409).end('Evidence already exists; use a new run id'); return; }
    fs.writeFileSync(dest, bytes);
    res.end('saved'); return;
  }
  const base = url.pathname.startsWith('/fonts/') ? path.join(demo, 'dist-homepage') : output;
  const file = path.resolve(base, '.' + url.pathname);
  if (!file.startsWith(base + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.html') ? 'text/html' : 'application/octet-stream');
  res.end(fs.readFileSync(file));
}).listen(4190, '127.0.0.1', () => console.log('Pixel fixture server http://127.0.0.1:4190/baseline.html'));
