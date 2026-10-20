/** Independent Downtown electronics kernels. Visual snapshots never read a scene model. */
import type { View } from '../core/view';
import { box,C,GREEN,RED,sign,tell,text } from '../core/primitives';
import { drawDriven, type Character } from '../../runtime/characters';
/** DLV-9 is the kit's kerb delivery robot; the device keeps its cyan port, its label and its state. */
const DLV9: Character = { seed: 9, look: { bot: 'deliverybot', paint: '#3a3e44', trim: '#d86a1a', v: 0, wear: 0.3 }, x: 0, ps: 2 };
export interface DowntownDeviceState { controlled:boolean;gateHeld:boolean;lock:string;scanned:boolean;feed:string;dlvAt:string;trace:number;signTestMs:number;signSince:number;visible:boolean;hoverSpot:{x:number;y:number;w:number;h:number}|null }
const live = (t: number, i: number) => (t + i * 13) % 50 < 25;
function verticalNeon(x: CanvasRenderingContext2D, t: number, s: string, cx: number, top: number, dead: number, lit: number | null) {
  const size = 12;
  x.save();
  x.font = '600 ' + size + 'px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const flick = lit === null && t % 240 > 232 && Math.floor(t) % 4 < 2;
  [...s].forEach((ch, i) => {
    const off = flick || i === dead || (lit !== null && i !== lit);
    x.fillStyle = 'rgba(' + C + ',' + (off ? 0.13 : 0.95) + ')';
    x.shadowColor = 'rgba(' + C + ',.9)'; x.shadowBlur = off ? 0 : 8;
    x.fillText(ch, cx, top + i * (size + 2));
  });
  x.restore();
}
function plate(x: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, col: string) {
  const x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2), r = Math.max(w, h) * 0.75;
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, 'rgba(' + col + ',.1)'); g.addColorStop(1, 'rgba(' + col + ',0)');
  x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  box(x, x0, y0, w, h, '#080403', 'rgba(' + col + ',.4)');
  x.fillStyle = 'rgba(255,217,165,.45)';
  for (const [px, py] of [[x0 + 2, y0 + 2], [x0 + w - 3, y0 + 2], [x0 + 2, y0 + h - 3], [x0 + w - 3, y0 + h - 3]]) x.fillRect(px, py, 1, 1);
}
export function drawDeviceSign(x: CanvasRenderingContext2D, v: View, wx: number, state: DowntownDeviceState) { const {sx,y,t,viewW}=v;const seen=(point:number,w=60)=>{const s=sx(point);return s > -w && s < viewW+w;};if (seen(wx)) {
    const s = sx(wx), ms = state.signTestMs, since = state.signSince;
    plate(x, s, y(114), 20, 90, C);
    verticalNeon(x, t, 'VERIFY', s, y(150), 1, since < ms ? Math.floor((since / ms) * 6) : null);
  }}
export function drawDeviceBox(x: CanvasRenderingContext2D, v: View, wx: number, state: DowntownDeviceState) { const {sx,y,t,viewW}=v;const seen=(point:number,w=60)=>{const s=sx(point);return s > -w && s < viewW+w;};const leds=(lx:number,ly:number,n:number,ok:boolean)=>{for(let i=0;i<n;i++){x.fillStyle=live(t,i)?(ok?'rgba(34,197,94,.95)':'rgba(255,42,68,.95)'):'rgba(34,197,94,.18)';x.fillRect(lx+i*6,ly,3,2);}};if (seen(wx)) {
    const s = sx(wx);
    box(x, s - 14, y(70), 28, 34, '#1a1410', 'rgba(255,136,0,.7)');
    leds(s - 9, y(58), 4, state.controlled);
    text(x, '0x2F', s, y(64), 'rgba(255,217,165,.6)', 6);
    tell(x, t, s + 9, y(42), 1);
  }}
export function drawDeviceTill(x: CanvasRenderingContext2D, v: View, wx: number, state: DowntownDeviceState) { const {sx,y,viewW}=v;const seen=(point:number,w=60)=>{const s=sx(point);return s > -w && s < viewW+w;};if (seen(wx)) {
    const s = sx(wx);
    box(x, s - 9, y(44), 18, 12, '#0d1a1a', 'rgba(0,255,255,.6)');
    x.fillStyle = state.controlled ? 'rgba(34,197,94,.9)' : 'rgba(0,255,255,.7)'; x.fillRect(s - 6, y(41), 12, 2);
  }}
export function drawDeviceRelay(x: CanvasRenderingContext2D, v: View, wx: number, state: DowntownDeviceState) { const {sx,y,t,viewW}=v;const seen=(point:number,w=60)=>{const s=sx(point);return s > -w && s < viewW+w;};const leds=(lx:number,ly:number,n:number,ok:boolean)=>{for(let i=0;i<n;i++){x.fillStyle=live(t,i)?(ok?'rgba(34,197,94,.95)':'rgba(255,42,68,.95)'):'rgba(34,197,94,.18)';x.fillRect(lx+i*6,ly,3,2);}};if (seen(wx)) {
    const s = sx(wx), h = 0, tr = state.trace;
    box(x, s - 12, y(h + 22), 24, 22, '#1a1410', 'rgba(255,136,0,.7)');
    x.strokeStyle = 'rgba(255,136,0,.7)'; x.beginPath(); x.moveTo(s + 6.5, y(h + 22)); x.lineTo(s + 6.5, y(h + 40)); x.stroke();
    x.fillStyle = 'rgba(255,42,68,' + (Math.floor(t / 30) % 2 ? 0.9 : 0.3) + ')'; x.fillRect(s + 5, y(h + 42), 3, 2);
    leds(s - 8, y(h + 14), 3, state.controlled && tr <= 0);
    if (tr > 0) { x.fillStyle = 'rgba(255,42,68,.85)'; x.fillRect(s - 10, y(h + 4), Math.round((20 * tr) / 100), 2); }
    tell(x, t, s - 8, y(h + 6), 2);
  }}
export function drawDeviceGate(x: CanvasRenderingContext2D, v: View, wx: number, state: DowntownDeviceState) { const {sx,y,t,viewW}=v;const seen=(point:number,w=60)=>{const s=sx(point);return s > -w && s < viewW+w;};if (seen(wx, 90)) {
    const s = sx(wx), open = state.lock === 'open' || state.gateHeld;
    box(x, s - 40, y(80), 80, 80, '#0c0907');
    if (open) {
      x.fillStyle = 'rgba(255,170,80,.14)'; x.fillRect(s - 38, y(66), 76, 66);
      for (let k = 0; k < 9; k++) { x.fillStyle = k % 2 ? 'rgba(255,190,110,.75)' : 'rgba(255,136,0,.6)'; x.fillRect(s - 34 + k * 8, y(58) + Math.round(Math.abs(k - 4) * 0.8), 2, 3); }
      for (const [ax, aw] of [[-34, 30], [4, 30]]) {
        for (let k = 0; k < aw; k += 6) { x.fillStyle = (k / 6) % 2 ? '#1a0a03' : 'rgba(255,136,0,.55)'; x.fillRect(s + ax + k, y(34), Math.min(6, aw - k), 6); }
        box(x, s + ax, y(16), aw, 16, '#22120a'); x.fillStyle = 'rgba(255,136,0,.6)'; x.fillRect(s + ax, y(16), aw, 1);
      }
      x.fillStyle = '#1a1008'; x.fillRect(s - 38, y(80), 76, 12);
      for (let yy = 2; yy < 12; yy += 3) { x.fillStyle = 'rgba(255,136,0,.2)'; x.fillRect(s - 38, y(80) + yy, 76, 1); }
    } else {
      for (let yy = 4; yy < 80; yy += 6) { x.fillStyle = 'rgba(255,136,0,.12)'; x.fillRect(s - 38, y(80) + yy, 76, 2); }
    }
    x.strokeStyle = 'rgba(255,136,0,.6)'; x.lineWidth = 1; x.strokeRect(s - 39.5, y(80) + 0.5, 79, 79);
    // the scanner on the right post: a cyan window with a sweep; the lamp under it says open or shut
    box(x, s + 30, y(62), 8, 14, '#0a1214', 'rgba(0,255,255,.55)');
    x.fillStyle = 'rgba(0,255,255,' + (state.scanned ? 0.9 : 0.45) + ')'; x.fillRect(s + 31, y(61) + ((t * 0.4) % 12), 6, 1);
    x.fillStyle = open ? 'rgba(' + GREEN + ',.95)' : 'rgba(' + RED + ',.9)'; x.fillRect(s + 31, y(44), 5, 5);
  }}
export function drawDeviceFence(x: CanvasRenderingContext2D, v: View, wx: number, _state: DowntownDeviceState) { const {sx,y,t,viewW}=v;const seen=(point:number,w=60)=>{const s=sx(point);return s > -w && s < viewW+w;};if (seen(wx)) {
    const s = sx(wx);
    x.fillStyle = 'rgba(255,210,58,.9)'; x.fillRect(s - 18, y(36), 36, 14);
    text(x, 'NO ENTRY', s, y(29), '#000', 6, '600');
    tell(x, t, s + 14, y(20), 3);
  }}
export function drawDeviceScan(x: CanvasRenderingContext2D, v: View, wx: number, _state: DowntownDeviceState) { const {sx,y,t,viewW}=v;const seen=(point:number,w=60)=>{const s=sx(point);return s > -w && s < viewW+w;};if (seen(wx)) {
    const s = sx(wx);
    x.strokeStyle = 'rgba(255,42,68,.7)'; x.lineWidth = 2; x.strokeRect(s - 22, y(84), 44, 84); x.lineWidth = 1;
    x.fillStyle = 'rgba(255,42,68,.5)'; x.fillRect(s - 20, y(84) + ((t * 0.8) % 80), 40, 2);
    tell(x, t, s + 26, y(40), 4);
  }}
export function drawDeviceCam3(x: CanvasRenderingContext2D, v: View, wx: number, _state: DowntownDeviceState) { const {sx,y,t,viewW}=v;const seen=(point:number,w=60)=>{const s=sx(point);return s > -w && s < viewW+w;};if (seen(wx)) {
    const s = sx(wx);
    box(x, s - 1, y(78), 3, 78, '#2a160a', 'rgba(255,136,0,.45)');
    box(x, s - 6, y(74), 12, 3, '#2a160a');
    box(x, s - 2, y(86), 14, 8, '#151a1c', 'rgba(255,136,0,.6)');
    x.fillStyle = 'rgba(0,255,255,.85)'; x.fillRect(s + 10, y(83), 3, 3);
    x.fillStyle = Math.floor(t / 30) % 2 ? 'rgba(255,42,68,.95)' : 'rgba(255,42,68,.25)'; x.fillRect(s, y(84), 2, 2);
  }}
export function drawDeviceBillboard(x: CanvasRenderingContext2D, v: View, wx: number, state: DowntownDeviceState) { const {sx,y,t,viewW}=v;const seen=(point:number,w=60)=>{const s=sx(point);return s > -w && s < viewW+w;};if (seen(wx, 80)) {
    const s = sx(wx);
    tell(x, t, s + 57, y(112), 5);
    if (state.feed === 'cam3') {
      box(x, s - 60, y(145), 120, 34, '#0b1416');
      x.fillStyle = 'rgba(0,255,255,.06)'; for (let yy = 0; yy < 34; yy += 2) x.fillRect(s - 60, y(145) + yy, 120, 1);
      const bob = Math.round(Math.sin(t * 0.08)), px = s - 14, py = y(118) + bob;
      x.fillStyle = '#8a8f9a'; x.fillRect(px, py - 12, 22, 12); x.fillRect(px + 16, py - 20, 10, 10);
      x.fillStyle = '#ffd25a'; x.fillRect(px + 26, py - 16, 4, 2);
      x.fillStyle = '#000'; x.fillRect(px + 21, py - 17, 2, 2);
      x.fillStyle = '#5a5f6a'; x.fillRect(px + 5, py, 2, 4); x.fillRect(px + 13, py, 2, 4);
      text(x, '● CAM-3 · LIVE', s - 36, y(139), 'rgba(0,255,255,.85)', 6, '600');
    }
  }}
export function drawDeviceDlv9(x: CanvasRenderingContext2D, v: View, wx: number, state: DowntownDeviceState) { const {sx,y,t,viewW}=v;const seen=(point:number,w=60)=>{const s=sx(point);return s > -w && s < viewW+w;};if (state.visible && seen(wx)) {
    const s = sx(wx), rolling = state.dlvAt === 'driving';
    drawDriven(x, v, DLV9, { x: wx, moving: rolling, act: rolling ? 'roll' : 'stand' });
    // the device's own marks over the kit body: its cyan port (you can use it), the beacon on the flag, its label
    x.fillStyle = 'rgba(0,255,255,.9)'; x.fillRect(s + 6, y(9), 2, 2);
    x.fillStyle = live(t, 2) ? 'rgba(255,170,60,.95)' : 'rgba(255,170,60,.3)'; x.fillRect(s - 10, y(28), 2, 2);
    text(x, 'DLV-9', s - 2, y(8), 'rgba(255,217,165,.75)', 5, '600');
  }}
export function drawDeviceMap(x: CanvasRenderingContext2D, v: View, wx: number, _state: DowntownDeviceState) { const {sx,y,t,viewW}=v;const seen=(point:number,w=60)=>{const s=sx(point);return s > -w && s < viewW+w;};if (seen(wx)) {
    const s = sx(wx);
    box(x, s - 1, y(34), 3, 34, '#2a160a', 'rgba(255,136,0,.5)');
    box(x, s - 13, y(64), 26, 30, '#0a1214', 'rgba(255,136,0,.75)');
    box(x, s - 11, y(62), 22, 22, '#06191b', 'rgba(0,255,255,.6)');
    x.fillStyle = 'rgba(0,255,255,.35)';
    for (const [a, b, w, h] of [[-9, 2, 6, 5], [-2, 4, 8, 6], [-8, 10, 5, 7], [1, 13, 7, 5]]) x.fillRect(s + a, y(62) + b, w, h);
    x.fillStyle = Math.floor(t / 25) % 2 ? 'rgba(255,42,68,.95)' : 'rgba(255,42,68,.35)'; x.fillRect(s - 2, y(62) + 9, 2, 2);
    sign(x, t, 'CITY MAP', s, y(72), C, { size: 7, phase: 50 });
    tell(x, t, s + 9, y(38), 6);
  }}
export function drawDeviceHover(x: CanvasRenderingContext2D, v: View, _wx: number, state: DowntownDeviceState) { const {sx,y}=v;if (state.hoverSpot) {
    const sp = state.hoverSpot;
    if (sp) {
      const s = sx(sp.x);
      x.save(); x.strokeStyle = 'rgba(255,61,242,.7)'; x.setLineDash([3, 2]);
      x.strokeRect(Math.round(s - sp.w / 2) - 2.5, y(sp.y + sp.h) - 2.5, sp.w + 5, sp.h + 5);
      x.restore();
    }
  }}
