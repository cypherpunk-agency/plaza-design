// A minimal headless-Chrome driver over CDP (no dependencies; Node 22 has WebSocket and fetch).
// It starts its own chrome with a throwaway profile and a debug port, and stops only that process.
//   const b = await launch({port, size:[1280,720]});  await b.goto(url);  await b.eval('1+1');
//   await b.keyDown('ArrowRight'); await b.keyUp('ArrowRight'); await b.tap('e'); await b.shot('x.png'); await b.close();
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => p && fs.existsSync(p));
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function launch({ port = 9333, size = [1280, 720], profileDir } = {}) {
  if (!CHROME) throw new Error('chrome not found (set CHROME_PATH)');
  const profile = profileDir ?? fs.mkdtempSync(path.join(os.tmpdir(), 'opening-cdp-'));
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${size[0]},${size[1]}`, `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', 'about:blank'], { stdio: 'ignore' });
  let ws, id = 0; const pending = new Map();
  let target;
  for (let i = 0; i < 60 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch {} }
  if (!target) { chrome.kill(); throw new Error('chrome did not start'); }
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable'); await send('Runtime.enable');
  const b = {
    send,
    async goto(url) { await send('Page.navigate', { url }); await sleep(2500); await b.eval(`window.__k=(t,key)=>window.dispatchEvent(new KeyboardEvent(t,{key,bubbles:true}));1`); },
    async eval(expr) { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? 'eval failed'); return r.result?.result?.value; },
    keyDown: key => b.eval(`__k('keydown',${JSON.stringify(key)})`),
    keyUp: key => b.eval(`__k('keyup',${JSON.stringify(key)})`),
    async tap(key, hold = 60) { await b.keyDown(key); await sleep(hold); await b.keyUp(key); await sleep(120); },
    async shot(file) { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, Buffer.from(r.result.data, 'base64')); },
    async close() { try { await Promise.race([send('Browser.close'), sleep(3000)]); } catch {} try { ws.close(); } catch {} await sleep(300); chrome.kill(); await sleep(500); if (!profileDir) try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} },
  };
  return b;
}
