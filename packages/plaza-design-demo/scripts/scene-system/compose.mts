/** Development-only launcher. The production game never imports this service or browser entry. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { build } from 'esbuild';
import { buildPlayRuntime } from './build-play-runtime.mts';
import { AuthoringStore } from '../../src/ssg/game/authoring/server/store';
import { startAuthoringServer } from '../../src/ssg/game/authoring/server/http';
import { buildEventInspection } from '../../src/ssg/game/authoring/event-inspector-model';
import { SourceReader,SourceReadError,readSourceRequest } from '../../src/ssg/game/authoring/server/source-reader';
import { sourceDocuments, validateSourceDocuments } from '../../src/ssg/game/authoring/source-documents';

const demo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const workspace = path.resolve(demo, '../..'), game = path.join(demo, 'src/ssg/game');
const option = (name: string, fallback: number) => {
  const index = process.argv.indexOf(name), value = index < 0 ? fallback : Number(process.argv[index + 1]);
  if (!Number.isInteger(value) || value < 1024 || value > 65535) throw new Error(`${name} requires a port from 1024 to 65535`);
  return value;
};
const port = option('--port', 4192), apiPort = option('--api-port', 4193), origin = `http://127.0.0.1:${port}`;
if (port === apiPort) throw new Error('Editor and API ports must differ');
const output = path.join(workspace, `.game-test-output/composer-${port}`);
fs.mkdirSync(output, { recursive: true });
const play=await buildPlayRuntime(game,output);
await build({ entryPoints: [path.join(game, 'authoring/entry.ts')], outfile: path.join(output, 'app.js'), define:{EDITOR_PLAY_ENTRY:JSON.stringify('./'+play.entry)},bundle: true, format: 'esm', sourcemap: true });
const store = new AuthoringStore({ root: game, documents: sourceDocuments, validateAll: validateSourceDocuments });
// Refuse to open an editor whose prospective cross-document set is invalid.
validateSourceDocuments(new Map(store.list().map(doc => [doc.id, doc.value])));
const inspection=buildEventInspection({documents:store.list()});
const sourceReader=new SourceReader(game,new Set([...sourceDocuments.map(d=>d.file),...[...inspection.nodes,...inspection.edges].map(item=>item.source.file)]));
const api = await startAuthoringServer({ store, editorOrigin: origin, port: apiPort });
const csp = `default-src 'none'; script-src 'self'; frame-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self' ${api.url}; img-src 'self' blob: data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`;
const faces = [400, 500, 600, 700].map(weight => `@font-face{font-family:'IBM Plex Mono';src:url('/fonts/ibm-plex-mono-latin-${weight}-normal.woff2') format('woff2');font-weight:${weight};font-display:block}`).join('');
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Game scene composer · local</title><style>${faces}html,body,#composer{margin:0;width:100%;height:100%;background:#10151d;color:#e1e8f1}#boot-error{padding:20px;font-family:system-ui}</style><body><main id="composer"></main><script type="module" src="/app.js"></script></body></html>`;
const server = createServer((req, res) => {
  const send = (status: number, type: string, data: string | Buffer) => { res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': req.url==='/'+play.entry?"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'none'; img-src data:; font-src data:; form-action 'none'":csp, 'Referrer-Policy': 'no-referrer' }); res.end(data); };
  if (req.headers.host !== `127.0.0.1:${port}` || req.socket.remoteAddress !== '127.0.0.1' || (!['/'+play.entry,'/'+play.script].includes(req.url ?? '') && (req.headers.origin && req.headers.origin !== origin || req.headers['sec-fetch-site'] === 'cross-site'))) { send(403, 'text/plain', 'Local editor origin required'); return; }
  if (req.method !== 'GET') { send(405, 'text/plain', 'Method not allowed'); return; }
  const url = new URL(req.url ?? '/', origin);
  if(url.pathname==='/source'){try{send(200,'application/json; charset=utf-8',JSON.stringify(readSourceRequest(sourceReader,url)));}catch(error){send(error instanceof SourceReadError?error.status:500,'text/plain; charset=utf-8',error instanceof SourceReadError?error.message:'Source unavailable');}return;}
  if (url.search) { send(400, 'text/plain', 'Query parameters are not supported'); return; }
  if (url.pathname === '/') { send(200, 'text/html; charset=utf-8', html); return; }
  if (url.pathname === '/bootstrap') { send(200, 'application/json', JSON.stringify({ api: { url: api.url, token: api.token } })); return; }
  if (['/app.js', '/app.js.map','/'+play.script,'/'+play.entry].includes(url.pathname)) { send(200, url.pathname.endsWith('.map') ? 'application/json' : url.pathname.endsWith('.css')?'text/css':url.pathname.endsWith('.html')?'text/html':'text/javascript', fs.readFileSync(path.join(output, url.pathname.slice(1)))); return; }
  if (/^\/fonts\/[a-zA-Z0-9_-]+\.woff2$/.test(url.pathname)) {
    const file = path.join(workspace, 'packages/plaza-design-core', url.pathname.slice(1));
    if (fs.existsSync(file)) { send(200, 'font/woff2', fs.readFileSync(file)); return; }
  }
  send(404, 'text/plain', 'Not found');
});
try { await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); }); }
catch (error) { await api.close(); throw error; }
console.log(`Local scene composer: ${origin}\nSource documents: ${sourceDocuments.length}\nSource writes require this editor session. Ctrl+C closes both services.`);
let closing = false;
const close = async () => { if (closing) return; closing = true; server.close(); await api.close(); process.exit(0); };
process.on('SIGINT', close); process.on('SIGTERM', close);
