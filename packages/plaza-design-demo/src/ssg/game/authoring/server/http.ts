/** Development-only loopback API. The editor receives the token from its trusted launcher. */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { AuthoringStore, StoreError, type Edit } from './store';

export interface AuthoringServerOptions { store: AuthoringStore; editorOrigin: string; port?: number; maxBodyBytes?: number }
export async function startAuthoringServer(options: AuthoringServerOptions) {
  const origin = new URL(options.editorOrigin);
  if (!['http:', 'https:'].includes(origin.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname) || origin.origin !== options.editorOrigin) throw new Error('Editor origin must be an exact loopback origin');
  const token = randomBytes(32).toString('hex');
  const authenticated = (req: IncomingMessage) => {
    const given = req.headers['x-authoring-token'];
    return typeof given === 'string' && given.length === token.length && timingSafeEqual(Buffer.from(given), Buffer.from(token));
  };
  let boundPort = 0;
  const server = createServer(async (req, res) => {
    const reply = (status: number, value: unknown) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Access-Control-Allow-Origin': options.editorOrigin, Vary: 'Origin' });
      res.end(JSON.stringify(value));
    };
    if (req.headers.host !== `127.0.0.1:${boundPort}` || req.headers.origin !== options.editorOrigin || req.socket.remoteAddress !== '127.0.0.1') { reply(403, { error: 'Local editor origin required' }); return; }
    if (req.method === 'OPTIONS') {
      if (req.headers['access-control-request-method'] && !['GET', 'POST'].includes(req.headers['access-control-request-method'])) { reply(405, { error: 'Method not allowed' }); return; }
      res.writeHead(204, { 'Access-Control-Allow-Origin': options.editorOrigin, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'content-type, x-authoring-token', Vary: 'Origin' }); res.end(); return;
    }
    if (!authenticated(req)) { reply(403, { error: 'Invalid editor session' }); return; }
    try {
      const url = new URL(req.url ?? '/', `http://127.0.0.1:${boundPort}`);
      if (url.search) { reply(400, { error: 'Query parameters are not supported' }); return; }
      if (req.method === 'GET' && url.pathname === '/documents') { reply(200, options.store.list()); return; }
      const match = /^\/documents\/([a-zA-Z0-9][a-zA-Z0-9._-]*)$/.exec(url.pathname);
      if (req.method === 'GET' && match) { reply(200, options.store.read(match[1])); return; }
      if (req.method !== 'POST' || !['/save', '/undo'].includes(url.pathname)) { reply(404, { error: 'Unknown authoring operation' }); return; }
      if (req.headers['content-type']?.split(';')[0] !== 'application/json') { reply(415, { error: 'JSON content type required' }); return; }
      const body = await readBody(req, res, options.maxBodyBytes ?? 2 * 1024 * 1024);
      if (body === null) return;
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new StoreError('invalid', 'Expected JSON object');
      const data = body as Record<string, unknown>;
      if (url.pathname === '/save') {
        if (!Array.isArray(data.edits)) throw new StoreError('invalid', 'Expected edits array');
        reply(200, options.store.save(data.edits as Edit[]));
      } else {
        if (typeof data.transaction !== 'string' || !data.revisions || typeof data.revisions !== 'object' || Array.isArray(data.revisions)) throw new StoreError('invalid', 'Expected transaction and revisions');
        reply(200, options.store.undo(data.transaction, data.revisions as Record<string, string>));
      }
    } catch (error) {
      reply(error instanceof StoreError ? error.code === 'conflict' ? 409 : error.code === 'path' ? 403 : error.code === 'invalid' ? 422 : 500 : 500,
        { error: error instanceof StoreError ? error.message : 'Authoring service failed; source was not marked saved' });
    }
  });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(options.port ?? 0, '127.0.0.1', () => { server.off('error', reject); resolve(); }); });
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('Missing loopback address'); boundPort = address.port;
  return { url: `http://127.0.0.1:${boundPort}`, token, close: () => new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())) };
}
async function readBody(req: IncomingMessage, res: ServerResponse, limit: number): Promise<unknown | null> {
  let size = 0; const chunks: Buffer[] = [];
  for await (const chunk of req) { size += chunk.length; if (size > limit) { res.writeHead(413, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify({ error: 'Document request too large' })); req.resume(); return null; } chunks.push(Buffer.from(chunk)); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new StoreError('invalid', 'Malformed JSON request'); }
}
