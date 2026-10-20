/** Extracted artwork. Scene-owned layout, actors and visual inputs are supplied explicitly. */
import { type View } from "../core/view";
import { box,C,drawTowers,GREEN,O,onScreen,PAPER,RED,tell,text,towers } from "../core/primitives";
import { placed } from "../core/view";
import { drawBoat } from "../vehicles/boats";
import { drawSky,seaCols,sunPath } from "../environment/sky";
import { drawLounger } from "../props/beach-party";
import { adScreen,registryBoard,YELLOW } from "../signage/screens";
import { saltLime } from "./beach-bar";
export interface BeachLayout{stairs:number;board:number;boardwalk:number;kiosk:number;sunbeds:number[];mine:number;shack:{x0:number;x1:number};jukebox:number;lime:number;order:number;mixer:number;crab:number;tower:number;drone:number;net:number;castle:number;surfer:number;shore:number;pier0:number;pierLights:number;fisher:number;gull:number;boat:number}
export interface BeachVisualState{rented:boolean;billingPaused:boolean;billed:number;freeDrink:boolean;danger:boolean;lamps:boolean;gullShooed:number}
export interface ArtworkInputs{HORIZON:number;WATERLINE:number;L:BeachLayout;BEACH_W:number}
export function createBeachArtwork(inputs:ArtworkInputs){const{HORIZON,WATERLINE,L,BEACH_W}=inputs;
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
const mix = (a: number[], b: number[], f: number, al = 1) => 'rgba(' + Math.round(lerp(a[0], b[0], f)) + ',' + Math.round(lerp(a[1], b[1], f)) + ',' + Math.round(lerp(a[2], b[2], f)) + ',' + al + ')';
const CITY = towers(41, 300, [4, 10], [8, 26], 0.3);
function sky(x: CanvasRenderingContext2D, V: View, p: number) {
  const hy = V.y(HORIZON), L = V.lighting;
  drawSky(x, V, L, { horizon: hy, fillTo: hy + 1 });
  const k = 1 - L.cover * 0.6;
  for (let i = 0; i < 5; i++) {
    const cw = 80 + hash(i) * 120, cx = ((hash(i + 3) * 1400 - V.cam * 0.08 + V.t * 0.01 * (1 + i * 0.2)) % 1600 + 1600) % 1600 - 200, cy = hy * (0.25 + hash(i + 7) * 0.5);
    x.fillStyle = mix([255, 170, 120], [150, 70, 100], p, 0.22 * k); x.fillRect(Math.round(cx), Math.round(cy), Math.round(cw), 2);
    x.fillStyle = mix([255, 210, 160], [200, 90, 90], p, 0.18 * k); x.fillRect(Math.round(cx + cw * 0.2), Math.round(cy + 2), Math.round(cw * 0.5), 1);
  }
}
function city(x: CanvasRenderingContext2D, V: View, p: number) {
  const base = V.y(HORIZON) + 1;
  x.save(); x.beginPath(); x.rect(0, 0, V.viewW, base); x.clip();
  drawTowers(x, V, CITY, 0.08, base, 0.08 + p * 0.1, mix([120, 70, 90], [40, 24, 52], p), 1);
  // the antenna on Plaza Central, its red light
  const ax = V.sx(150, 0.08);
  if (onScreen(V, ax - 4, 8)) {
    x.fillStyle = mix([120, 70, 90], [40, 24, 52], p); x.fillRect(ax - 1, base - 46, 1, 20);
    if (Math.floor(V.t / 40) % 2) { x.fillStyle = 'rgba(255,42,68,.8)'; x.fillRect(ax - 1, base - 48, 2, 2); }
  }
  x.restore();
}
function shore(x: CanvasRenderingContext2D, V: View, p: number) {
  const wl = V.y(WATERLINE);
  // the beach itself, behind the play line: sand from the waterline down
  const g = x.createLinearGradient(0, wl, 0, V.gy);
  g.addColorStop(0, mix([92, 70, 62], [52, 36, 40], p)); g.addColorStop(1, mix([132, 96, 66], [78, 54, 46], p));
  x.fillStyle = g; x.fillRect(0, wl, V.viewW, V.gy - wl);
  // the wash: up the sand and back, in a slow rhythm; wet sand shines under it
  const wash = (Math.sin(V.t * 0.018) + 1) / 2, reach = Math.round(2 + wash * 9);
  x.fillStyle = mix([150, 120, 120], [80, 60, 80], p, 0.45); x.fillRect(0, wl, V.viewW, reach + 3);
  for (let sx = -(V.cam % 6); sx < V.viewW; sx += 6) {
    const k = hash(Math.floor((sx + V.cam) / 6) * 3), dy = Math.round(reach + (k - 0.5) * 3);
    x.fillStyle = 'rgba(255,240,226,' + (0.35 + k * 0.4).toFixed(2) + ')'; x.fillRect(Math.round(sx), wl + dy, 5, 1);
    if (k > 0.6) { x.fillStyle = 'rgba(255,240,226,.25)'; x.fillRect(Math.round(sx + 1), wl + dy - 2, 3, 1); }
  }
  // a breaking wave just off the sand, curling in on its own beat
  const br = ((V.t * 0.006) % 1);
  x.fillStyle = 'rgba(255,240,226,' + (0.5 * Math.sin(br * Math.PI)).toFixed(2) + ')'; x.fillRect(0, wl - 4 + Math.round(br * 3), V.viewW, 1);
  // ripples in the dry sand, and footprints along the play line
  x.fillStyle = 'rgba(40,24,16,.18)';
  for (let i = 0; i < 26; i++) { const sx = ((hash(i) * 2000 - V.cam) % 2000 + 2000) % 2000 - 100, sy = wl + 14 + hash(i + 5) * (V.gy - wl - 16); if (sx < V.viewW) x.fillRect(Math.round(sx), Math.round(sy), 6 + Math.round(hash(i + 9) * 10), 1); }
}
function stairs(x: CanvasRenderingContext2D, V: View, p: number) {
  const s0 = V.sx(0), y = V.y;
  if (!onScreen(V, s0 - 10, 220)) return;
  // the sea wall under the promenade, and the promenade railing over it
  box(x, s0 - 200, y(64), 400, 64, '#2a1e1a', 'rgba(' + O + ',.45)');
  x.fillStyle = 'rgba(' + O + ',.12)'; for (let k = 1; k < 5; k++) x.fillRect(s0 - 200, y(k * 13), 400, 1);
  x.fillStyle = '#3a2a22'; x.fillRect(s0 - 200, y(66), 400, 3);
  x.fillStyle = 'rgba(' + O + ',.55)'; x.fillRect(s0 - 200, y(66), 400, 1);
  for (let k = 0; k < 20; k++) x.fillRect(s0 - 196 + k * 20, y(80), 1, 14);
  x.fillRect(s0 - 200, y(80), 400, 1);
  // the stairs down from the promenade, from the left edge
  for (let k = 0; k < 8; k++) box(x, s0 + k * 6 - 4, y(64 - k * 8), 12, 8, mix([90, 66, 50], [54, 40, 34], p), 'rgba(' + O + ',.55)');
  x.fillStyle = 'rgba(' + O + ',.7)'; x.fillRect(s0 - 4, y(84), 2, 20); x.beginPath(); x.moveTo(s0 - 3, y(84)); x.lineTo(s0 + 46, y(22)); x.lineTo(s0 + 47, y(23)); x.lineTo(s0 - 2, y(85)); x.fill();
  // the way out, on a plate by the stairs (cyan: you can use it)
  box(x, s0 + 4, y(108), 64, 12, '#04100f', 'rgba(' + C + ',.6)');
  text(x, '< HARBOR', s0 + 34, y(102), 'rgba(' + C + ',.95)', 7, '600');
  x.fillStyle = '#2a1d14'; x.fillRect(s0 + 34, y(96), 2, 12);
  tell(x, V.t, s0 + 62, y(102));
}
function kiosk(x: CanvasRenderingContext2D, V: View, state:BeachVisualState, hover: string | null) {
  const c = V.sx(L.kiosk), y = V.y;
  if (!onScreen(V, c - 40, 80)) return;
  box(x, c - 15, y(50), 30, 50, '#e8e0d0', 'rgba(' + O + ',.8)');
  box(x, c - 15, y(50), 30, 8, '#c83a2a');
  for (let k = 0; k < 4; k++) { x.fillStyle = k % 2 ? '#e8e0d0' : '#c83a2a'; x.fillRect(c - 19 + k * 10, y(56), 10, 4); }
  // the meter's screen (cyan: you can use it), ticking while you rent
  box(x, c - 11, y(44), 22, 14, '#04100f', 'rgba(' + C + ',.7)');
  const rented = state.rented, paused = state.billingPaused;
  text(x, rented ? (paused ? 'II' : String(state.billed) + 'T') : '1T', c, y(37), 'rgba(' + C + ',' + (rented && !paused && Math.floor(V.t / 30) % 2 ? 0.5 : 0.95) + ')', 7, '600');
  box(x, c - 6, y(26), 12, 6, '#2a2a30', 'rgba(' + C + ',.5)');
  tell(x, V.t, c + 10, y(22), 1);
  // the sign on top, on its frame
  x.fillStyle = '#2a1d14'; x.fillRect(c - 12, y(64), 2, 6); x.fillRect(c + 10, y(64), 2, 6);
  box(x, c - 40, y(76), 80, 12, '#1a120b', 'rgba(' + O + ',.7)');
  text(x, 'SUNBEDS 1T / MIN', c, y(70), 'rgba(' + PAPER + ',.95)', 7, '600');
  if (hover === 'kiosk') glow(x, c - 15, y(50), 30, 50);
}
function lime(x: CanvasRenderingContext2D, V: View) {
  const c = V.sx(L.lime);
  if (!onScreen(V, c - 20, 40)) return;
  placed(x, c, V.y(0), 1, () => saltLime(x, V.t));
}
function crab(x: CanvasRenderingContext2D, V: View) {
  const cx = V.sx(L.crab + Math.sin(V.t * 0.01) * 10), y = V.y;
  if (!onScreen(V, cx - 8, 16)) return;
  x.fillStyle = '#6e4c36'; x.fillRect(cx - 5, y(4), 10, 4);
  x.fillStyle = '#d8582a'; x.fillRect(cx - 4, y(3), 8, 3);
  const leg = Math.floor(V.t / 6) % 2;
  x.fillRect(cx - 6, y(1 + leg), 2, 1); x.fillRect(cx + 4, y(2 - leg), 2, 1);
  x.fillRect(cx - 6, y(6), 2, 2); x.fillRect(cx + 4, y(6), 2, 2);
  x.fillStyle = '#16100c'; x.fillRect(cx - 2, y(5), 1, 1); x.fillRect(cx + 1, y(5), 1, 1);
}
function volleyball(x: CanvasRenderingContext2D, V: View) {
  const c = V.sx(L.net), y = V.y;
  if (!onScreen(V, c - 80, 160)) return;
  // the net runs across the sand, seen at an angle: a far pole (higher up the beach), a near one, the mesh between
  const far = c + 8, near = c - 8;
  x.fillStyle = '#a8a094'; x.fillRect(far - 1, y(64), 2, 46);
  x.fillStyle = '#e8e0d0'; x.fillRect(near - 1, y(56), 2, 56);
  x.strokeStyle = 'rgba(232,222,196,.45)'; x.lineWidth = 1;
  x.beginPath();
  for (let k = 0; k <= 4; k++) { x.moveTo(near, y(54 - k * 4) + 0.5); x.lineTo(far, y(62 - k * 4) + 0.5); }
  for (let k = 0; k <= 4; k++) { const fx = near + k * 4; x.moveTo(fx + 0.5, y(54 + k * 2)); x.lineTo(fx + 0.5, y(38 + k * 2)); }
  x.stroke();
  x.fillStyle = '#e8e0d0'; x.beginPath(); x.moveTo(near, y(56)); x.lineTo(far, y(64)); x.lineTo(far, y(62)); x.lineTo(near, y(54)); x.closePath(); x.fill();
  // the ball: back and forth between the two sides, high over the net
  const f = (V.t * 0.006) % 2, s = f < 1 ? f : 2 - f, bx = c - 36 + 72 * s, by = y(46 + Math.sin(s * Math.PI) * 44);
  x.fillStyle = '#e8e0d0'; x.fillRect(Math.round(bx) - 2, Math.round(by) - 2, 4, 4); x.fillStyle = '#d8b040'; x.fillRect(Math.round(bx) - 1, Math.round(by) - 2, 1, 4);
  x.fillStyle = 'rgba(20,10,6,.25)'; x.fillRect(Math.round(bx) - 3, y(0) - 1, 6, 1);
}
function castle(x: CanvasRenderingContext2D, V: View, p: number) {
  const c = V.sx(L.castle), y = V.y, sand = mix([200, 160, 110], [130, 96, 72], p), dark = mix([150, 116, 80], [96, 70, 56], p);
  if (!onScreen(V, c - 30, 60)) return;
  box(x, c - 14, y(14), 28, 14, sand, 'rgba(60,36,20,.5)');
  box(x, c - 18, y(22), 8, 22, sand, 'rgba(60,36,20,.5)'); box(x, c + 10, y(22), 8, 22, sand, 'rgba(60,36,20,.5)');
  for (const tx of [c - 18, c - 14, c + 10, c + 14]) { x.fillStyle = sand; x.fillRect(tx, y(24), 3, 2); }
  x.fillStyle = dark; x.fillRect(c - 3, y(8), 6, 8);
  x.fillStyle = '#2a1d14'; x.fillRect(c + 14, y(32), 1, 10); x.fillStyle = 'rgba(' + RED + ',.9)'; x.fillRect(c + 15, y(32), 5, 3);
  // the queue: shells in a row to the door
  for (let k = 0; k < 6; k++) { x.fillStyle = k % 2 ? '#e8e0d0' : '#d8a080'; x.fillRect(c - 24 - k * 5, y(2), 3, 2); }
  // a bucket and spade
  box(x, c + 22, y(8), 6, 8, '#3a6ad8'); x.fillStyle = '#d8b040'; x.fillRect(c + 30, y(12), 1, 12);
}
function board(x: CanvasRenderingContext2D, V: View) {
  const c = V.sx(L.surfer + 12), y = V.y;
  if (!onScreen(V, c - 6, 12)) return;
  box(x, c - 3, y(50), 6, 50, '#e8e0d0', 'rgba(' + O + ',.6)');
  x.fillStyle = '#c83a2a'; x.fillRect(c - 3, y(34), 6, 3);
}
function rod(x: CanvasRenderingContext2D, V: View) {
  const c = V.sx(L.fisher), y = V.y;
  if (!onScreen(V, c - 10, 90)) return;
  box(x, c - 5, y(8), 10, 8, '#3a6a8a'); // his bucket
  const bend = Math.sin(V.t * 0.03) * 2;
  x.strokeStyle = '#5a3a24'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(c + 8, y(20)); x.quadraticCurveTo(c + 30, y(48), c + 50, y(50 + bend)); x.stroke(); x.lineWidth = 1;
  x.strokeStyle = 'rgba(232,222,196,.35)'; x.beginPath(); x.moveTo(c + 50, y(50 + bend)); x.lineTo(c + 56, y(WATERLINE + 4)); x.stroke();
  x.fillStyle = 'rgba(' + RED + ',.9)'; x.fillRect(c + 55, y(WATERLINE + 5) + Math.round(Math.sin(V.t * 0.05)), 2, 2);
}
function boat(x: CanvasRenderingContext2D, V: View, hover: string | null, p: number) {
  const c = V.sx(L.boat), y = V.y, bob = Math.round(Math.sin(V.t * 0.03) * 1.5);
  if (!onScreen(V, c - 80, 160)) return;
  const by = y(0) + bob;
  // the boat (the kit's cabin boat): hull, waterline stripe, its hand-painted name, the cabin and the bare mast
  placed(x, c, y(0), 1, () => drawBoat(x, 'cabin', { t: V.t, heave: -bob, paint: mix([214, 206, 190], [130, 120, 124], p), trim: mix([180, 172, 160], [110, 100, 104], p), name: 'NOT FISHING' }));
  // the cover tied down over the back, the hatch with two padlocks
  box(x, c - 8, by - 50, 14, 24, '#3a2a22', 'rgba(' + O + ',.5)');
  x.fillStyle = '#d8b040'; x.fillRect(c + 2, by - 40, 3, 4); x.fillRect(c + 2, by - 34, 3, 4);
  x.fillStyle = '#4a5a3a'; x.fillRect(c + 18, by - 40, 40, 14);
  x.fillStyle = 'rgba(232,222,196,.6)'; for (const k of [24, 38, 52]) x.fillRect(c + k, by - 40, 1, 14);
  // the harbour's notice, taped to the cabin, with its red stamp
  box(x, c - 30, by - 37, 16, 11, 'rgba(232,222,196,.92)');
  for (let k = 0; k < 3; k++) { x.fillStyle = 'rgba(40,20,10,.6)'; x.fillRect(c - 28, by - 35 + k * 3, 12, 1); }
  x.fillStyle = 'rgba(' + RED + ',.9)'; x.fillRect(c - 19, by - 30, 4, 3);
  // the mooring line to the post
  x.strokeStyle = 'rgba(200,180,140,.6)'; x.beginPath(); x.moveTo(c - 58, by - 22); x.quadraticCurveTo(c - 70, by - 8, c - 76, y(8)); x.stroke();
  tell(x, V.t, c + 58, by - 22, 6);
  if (hover === 'boat') glow(x, c - 60, by - 54, 124, 54);
}
function postGull(x: CanvasRenderingContext2D, V: View, state:BeachVisualState) {
  const c = V.sx(L.gull), y = V.y, since = V.t - state.gullShooed;
  if (!onScreen(V, c - 200, 400)) return;
  x.fillStyle = '#3a2618'; x.fillRect(c - 3, y(30), 6, 30);
  if (since < 600) {
    // up and away over the water, then back down
    const f = since / 600, out = f < 0.5 ? f * 2 : 2 - f * 2, gx = c + out * 160, gy = y(32 + out * 90);
    gullShape(x, gx, gy, V.t, 1);
    return;
  }
  x.fillStyle = '#e8e4dc'; x.fillRect(c - 4, y(36), 8, 4); x.fillRect(c + 2, y(39), 3, 3);
  x.fillStyle = '#8a8e96'; x.fillRect(c - 4, y(36), 5, 2);
  x.fillStyle = '#d8b040'; x.fillRect(c + 5, y(38), 2, 1);
  x.fillStyle = '#16100c'; x.fillRect(c + 3, y(38), 1, 1);
}
function gullShape(x: CanvasRenderingContext2D, gx: number, gy: number, t: number, s: number) {
  const up = Math.floor(t / 8) % 2;
  x.fillStyle = '#e8e4dc';
  x.fillRect(Math.round(gx) - 1, Math.round(gy), 3 * s, 2);
  x.fillRect(Math.round(gx) - 5 * s, Math.round(gy) - (up ? 2 : -1), 4 * s, 1); x.fillRect(Math.round(gx) + 2 * s, Math.round(gy) - (up ? 2 : -1), 4 * s, 1);
}
function gulls(x: CanvasRenderingContext2D, V: View) {
  for (let i = 0; i < 7; i++) {
    const r = hash(i + 50), cx = (r * 1600 + Math.sin(V.t * 0.004 + i) * 120) - V.cam * (0.3 + r * 0.5), cy = V.y(130 + hash(i + 70) * 80) + Math.sin(V.t * 0.02 + i * 2) * 8;
    const sx = ((cx % 1700) + 1700) % 1700 - 100;
    if (sx < -10 || sx > V.viewW + 10) continue;
    gullShape(x, sx, cy, V.t + i * 3, r > 0.6 ? 2 : 1);
  }
}
function foreground(x: CanvasRenderingContext2D, V: View, state:BeachVisualState, p: number, lampPositions:number[]) {
  const gy = V.gy, edge = V.sx(L.shore);
  // water under the pier, out to the end
  const g = x.createLinearGradient(0, gy, 0, V.viewH);
  g.addColorStop(0, mix([40, 52, 72], [18, 22, 40], p)); g.addColorStop(1, mix([20, 28, 44], [8, 10, 22], p));
  x.fillStyle = g; x.fillRect(Math.max(0, edge - 40), gy, V.viewW, V.viewH - gy);
  for (let k = 0; k < 12; k++) {
    const yy = gy + 4 + k * 5, off = (V.t * 0.3 + k * 17) % 30;
    x.fillStyle = 'rgba(255,236,214,' + (0.06 + 0.02 * (k % 3)) + ')';
    for (let sx = edge - 40 + off; sx < V.viewW; sx += 30) x.fillRect(Math.round(sx), yy, 8, 1);
  }
  if (state.lamps) for (const lampX of lampPositions) {
    const lx = V.sx(lampX);
    if (lx < -20 || lx > V.viewW + 20) continue;
    for (let i = 0; i < 8; i++) { x.fillStyle = 'rgba(255,214,150,' + (0.16 * (1 - i / 8)).toFixed(2) + ')'; x.fillRect(Math.round(lx - 5 + Math.sin(V.t * 0.05 + i) * 2), gy + 10 + i * 5, 10, 2); }
  }
  // the sand in front, its edge sloping into the water
  if (edge > -60) {
    x.fillStyle = mix([150, 112, 76], [88, 62, 50], p);
    x.beginPath(); x.moveTo(-2, gy); x.lineTo(edge, gy); x.lineTo(edge - 40, V.viewH); x.lineTo(-2, V.viewH); x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,240,226,.4)'; x.fillRect(edge - 4, gy + 2, 3, 1); x.fillRect(edge - 14, gy + 14, 4, 1);
    x.fillStyle = 'rgba(40,24,16,.2)';
    for (let i = 0; i < 18; i++) { const sx = ((hash(i + 30) * 1300 - V.cam) % 1300 + 1300) % 1300 - 60; if (sx < edge - 50) x.fillRect(Math.round(sx), gy + 6 + Math.round(hash(i + 40) * (V.viewH - gy - 12)), 5, 1); }
  }
  x.fillStyle = 'rgba(' + O + ',.4)'; x.fillRect(0, gy, Math.max(0, Math.min(V.viewW, edge)), 1);
}
function glow(x: CanvasRenderingContext2D, l: number, t: number, w: number, h: number) {
  x.save(); x.strokeStyle = 'rgba(255,61,242,.85)'; x.shadowColor = 'rgba(255,61,242,.8)'; x.shadowBlur = 8;
  x.strokeRect(l - 3.5, t - 3.5, w + 7, h + 7); x.restore();
}
function seaBase(x:CanvasRenderingContext2D,V:View,p:number){
  const top = V.y(HORIZON), bot = V.y(WATERLINE), h = bot - top;
  // the water takes the sky's colours (sets/sky.ts seaCols), a little warmer near the shore
  const L = V.lighting, [c0, c1, c2] = seaCols(L);
  const g = x.createLinearGradient(0, top, 0, bot);
  g.addColorStop(0, c0); g.addColorStop(0.4, c1); g.addColorStop(1, c2);
  x.fillStyle = g; x.fillRect(0, top, V.viewW, h + 1);
  x.fillStyle = mix([150, 84, 92], [70, 32, 70], p, 0.25); x.fillRect(0, top, V.viewW, h + 1);
  x.fillStyle = mix([255, 210, 150], [255, 140, 90], p, 0.5); x.fillRect(0, top, V.viewW, 1);
  // the sun's path on the water, under the sun (or the moon's at night)
  sunPath(x, V, L, top, bot);
  // swell lines, rolling in: further rows are slower and fainter
  const N = 9;
  for (let i = 0; i < N; i++) {
    const d = ((i / N + V.t * 0.0009) % 1), yy = Math.round(top + h * d * d), a = 0.08 + d * 0.4;
    for (let sx = -((V.cam * (0.2 + d * 0.7)) % 14); sx < V.viewW; sx += 14) {
      const k = hash(Math.floor((sx + V.cam * (0.2 + d * 0.7)) / 14) * 7 + i * 31);
      if (k < 0.35) continue;
      x.fillStyle = 'rgba(255,236,214,' + (a * k).toFixed(2) + ')';
      x.fillRect(Math.round(sx), yy, Math.round(4 + k * 8 * d + 2), 1);
    }
  }
}
function buoy(x:CanvasRenderingContext2D,V:View,wx:number,height:number){  // the buoy, far out, bobbing: the edge of the swim zone
  const bx = V.sx(wx, 0.55), by = V.y(height) + Math.round(Math.sin(V.t * 0.05) * 1.2);
  if (onScreen(V, bx - 6, 12)) {
    x.fillStyle = '#d8d0c0'; x.fillRect(bx - 3, by - 6, 6, 3); x.fillStyle = 'rgba(' + RED + ',.95)'; x.fillRect(bx - 3, by - 3, 6, 3);
    x.fillStyle = '#2a1d14'; x.fillRect(bx, by - 10, 1, 4);
    if (Math.floor(V.t / 50) % 2) { x.fillStyle = 'rgba(' + RED + ',.9)'; x.fillRect(bx - 1, by - 12, 2, 2); }
  }
}
function surfing(x:CanvasRenderingContext2D,V:View,origin:number){const top=V.y(HORIZON),h=V.y(WATERLINE)-top;  // a surfer riding a swell, back and forth along it
  const sd = 0.62, sy = Math.round(top + h * sd * sd) - 1, sxw = origin + Math.sin(V.t * 0.004) * 220, ssx = V.sx(sxw, 0.6), face = Math.cos(V.t * 0.004) > 0 ? 1 : -1;
  if (onScreen(V, ssx - 10, 20)) {
    x.fillStyle = 'rgba(255,236,214,.35)'; x.fillRect(ssx - 10 * face - 4, sy + 1, 10, 1);
    x.fillStyle = '#d8b040'; x.fillRect(ssx - 5, sy, 10, 1);
    x.fillStyle = '#1a1210'; x.fillRect(ssx - 1, sy - 6, 2, 5); x.fillRect(ssx - 3 + face, sy - 5, 6, 1);
    x.fillStyle = '#c99068'; x.fillRect(ssx - 1, sy - 8, 2, 2);
  }
}
function swimmer(x:CanvasRenderingContext2D,V:View,i:number,s:{x:number;d:number}){const top=V.y(HORIZON),h=V.y(WATERLINE)-top;
    const wx = s.x + Math.sin(V.t * 0.006 + i) * 12, px = V.sx(wx, 0.45 + s.d * 0.4), yy = Math.round(top + h * s.d * s.d) + Math.round(Math.sin(V.t * 0.04 + i * 2));
    if (!onScreen(V, px - 4, 8)) return;
    x.fillStyle = 'rgba(255,236,214,.3)'; x.fillRect(px - 4, yy + 2, 8, 1);
    x.fillStyle = ['#c99068', '#8a5a38', '#f2cfae', '#6a4228'][i % 4]; x.fillRect(px - 1, yy - 1, 3, 3);
    x.fillStyle = ['#2e1d12', '#c83a2a', '#16100c', '#d8b040'][i % 4]; x.fillRect(px - 1, yy - 2, 3, 1);
    if ((V.t + i * 40) % 160 < 30) { x.fillStyle = '#c99068'; x.fillRect(px + 2, yy - 4, 1, 3); }
  }
function boardwalk(x:CanvasRenderingContext2D,V:View,p:number,from:number){
  const l = V.sx(from), r = V.sx(L.boardwalk), y = V.y;
  if (r < -4 || l > V.viewW + 4) return;
  // planks, a step above the sand
  box(x, l, y(4), r - l, 6, mix([110, 78, 52], [66, 46, 36], p), 'rgba(' + O + ',.6)');
  for (let bx = from; bx < L.boardwalk; bx += 9) { x.fillStyle = 'rgba(20,10,6,.4)'; x.fillRect(V.sx(bx), y(4), 1, 6); }
}
function publicNotice(x:CanvasRenderingContext2D,V:View,){const y=V.y;  // the Registry's beach notice, on its post
  registryBoard(x, V, { x: L.board, h: 34, w: 128, tall: 60, mount: 'pole', title: 'PUBLIC BEACH', seed: 3, lines: ['TOWELS: SHOW VALID ID', 'SAND: MUNICIPAL PROPERTY', 'UNVERIFIED: SECTOR 4'] });
  tell(x, V.t, V.sx(L.board + 60), y(44));
}
function sunbed(x:CanvasRenderingContext2D,V:View,bx:number,i:number,col:string,mine:boolean,state:BeachVisualState,p:number){const y=V.y;
    const c = V.sx(bx);
    if (!onScreen(V, c - 30, 60)) return;
    // the parasol and the bed (sets/beach-party.ts)
    placed(x, c, y(0), 1, () => drawLounger(x, { col: col, p }));
    // a numbered tag on each: the kiosk rents them by number
    box(x, c - 4, y(6), 8, 6, '#1a120b', 'rgba(' + PAPER + ',.5)');
    text(x, String(4 + i), c, y(3), 'rgba(' + PAPER + ',.9)', 7, '600');
    if (mine && state.rented) {
      // your towel, and the kiosk's red tag on it
      x.fillStyle = '#3a8a8a'; x.fillRect(c - 14, y(12), 22, 2);
      x.fillStyle = '#e8e0d0'; x.fillRect(c - 12, y(12), 2, 2); x.fillRect(c - 6, y(12), 2, 2);
      x.fillStyle = 'rgba(' + RED + ',.9)'; x.fillRect(c + 6, y(14), 4, 3);
    }
  }
function barPhoto(x:CanvasRenderingContext2D,V:View,wx:number){const y=V.y;  // Moth's photo, propped behind the gin (a small square of paper on the top shelf)
  const ph = V.sx(wx);
  box(x, ph - 4, y(58), 8, 9, '#e8e0d0');
  x.fillStyle = '#2a2a30'; x.fillRect(ph - 3, y(57), 6, 5); x.fillStyle = '#c99068'; x.fillRect(ph - 1, y(56), 2, 2); x.fillStyle = '#46506e'; x.fillRect(ph - 2, y(54), 4, 2);
}
function barStool(x:CanvasRenderingContext2D,V:View,sx:number){const y=V.y;x.fillStyle='#5a3a24';x.fillRect(V.sx(sx)-1,y(14),2,14);box(x,V.sx(sx)-5,y(16),10,3,'#8a5a3a','rgba('+O+',.6)');}
function jukebox(x:CanvasRenderingContext2D,V:View,hover:string|null){const y=V.y;  // the jukebox
  const jx = V.sx(L.jukebox);
  box(x, jx - 13, y(44), 26, 44, '#3a2a30', 'rgba(255,190,120,.8)');
  x.fillStyle = 'rgba(255,190,120,.5)'; x.beginPath(); x.arc(jx, y(36), 11, Math.PI, 0); x.fill();
  const beat = Math.floor(V.t / 12) % 4;
  for (let k = 0; k < 3; k++) { x.fillStyle = ['rgba(255,120,90,.9)', 'rgba(255,210,58,.9)', 'rgba(140,220,120,.9)', 'rgba(255,120,90,.9)', 'rgba(255,210,58,.9)'][(k + beat) % 5]; x.fillRect(jx - 10 + k * 4, y(24), 3, 2); }
  box(x, jx - 8, y(20), 16, 8, '#04100f', 'rgba(' + C + ',.7)');
  for (let k = 0; k < 3; k++) { x.fillStyle = 'rgba(' + C + ',.6)'; x.fillRect(jx - 6, y(18 - k * 2), 12, 1); }
  tell(x, V.t, jx + 9, y(8), 2);
  // music in the air, while it plays
  for (let k = 0; k < 3; k++) { const f = ((V.t * 0.01 + k / 3) % 1); x.fillStyle = 'rgba(255,217,165,' + (0.5 * (1 - f)).toFixed(2) + ')'; x.fillRect(jx + 6 + f * 10, y(48 + f * 20), 2, 2); x.fillRect(jx + 7 + f * 10, y(52 + f * 20), 1, 4); }
  if (hover === 'jukebox') glow(x, jx - 13, y(44), 26, 44);
}
function mixer(x:CanvasRenderingContext2D,V:View,state:BeachVisualState,hover:string|null,drinkX:number,drinkH=0){const y=V.y;  // the mixer on the counter: bottles upside down over one pump
  const mx = V.sx(L.mixer), poured = state.freeDrink;
  box(x, mx - 11, y(52), 22, 26, '#2a2a30', 'rgba(255,190,120,.8)');
  for (let k = 0; k < 4; k++) { x.fillStyle = ['#d8b040', '#c83a2a', '#e8e0d0', '#3a6ad8'][k]; x.fillRect(mx - 9 + k * 5, y(52), 3, 8); }
  box(x, mx - 7, y(40), 14, 6, '#04100f', 'rgba(' + C + ',.7)');
  x.fillStyle = 'rgba(' + C + ',.9)'; x.fillRect(mx - 5, y(38), poured ? 10 : 4, 1);
  tell(x, V.t, mx + 8, y(30), 3);
  if (poured) {
    // the free drink, on the counter in front of the stool
    x.fillStyle = 'rgba(255,170,90,.85)'; x.fillRect(V.sx(drinkX) - 2, y(32+drinkH), 5, 6);
    x.fillStyle = '#7ab83a'; x.fillRect(V.sx(drinkX) + 2, y(33+drinkH), 2, 2);
  }
  if (hover === 'mixer') glow(x, mx - 11, y(52), 22, 26);
}
function tower(x:CanvasRenderingContext2D,V:View,state:BeachVisualState){
  const c = V.sx(L.tower), y = V.y;
  if (!onScreen(V, c - 70, 140)) return;
  x.strokeStyle = '#d8d0c0'; x.lineWidth = 2; x.beginPath();
  x.moveTo(c - 22, y(0)); x.lineTo(c - 14, y(58)); x.moveTo(c + 22, y(0)); x.lineTo(c + 14, y(58));
  x.moveTo(c - 20, y(16)); x.lineTo(c + 17, y(46)); x.moveTo(c + 20, y(16)); x.lineTo(c - 17, y(46)); x.stroke(); x.lineWidth = 1;
  box(x, c - 22, y(60), 44, 3, '#e8e0d0', 'rgba(' + O + ',.6)');
  // the ad panel on the tower's legs
  adScreen(x, V, { x: L.tower, h: 18, w: 40, tall: 28, ads: [['REGISTRY', 'PREMIUM'], ['RESCUE', 'PRIORITY', '700+'], ['VERIFIED', 'SWIMMERS', 'ONLY']], period: 300, cols: [YELLOW, PAPER, PAPER], seed: 5 });
  // the cabin roof
  box(x, c - 24, y(108), 48, 6, '#c83a2a', 'rgba(255,190,120,.7)');
  x.fillStyle = '#d8d0c0'; x.fillRect(c - 20, y(102), 2, 40); x.fillRect(c + 18, y(102), 2, 40);
  // the flag on its pole: green, or red when the drone has called danger
  const red = state.danger, fx = c - 30;
  x.fillStyle = '#d8d0c0'; x.fillRect(fx, y(130), 1, 70);
  const wave = Math.round(Math.sin(V.t * 0.08) * 1.5);
  x.fillStyle = red ? 'rgba(' + RED + ',.95)' : 'rgba(' + GREEN + ',.95)';
  x.beginPath(); x.moveTo(fx + 1, y(130)); x.lineTo(fx + 15, y(126 + wave)); x.lineTo(fx + 1, y(120)); x.closePath(); x.fill();
}
function drone(x:CanvasRenderingContext2D,V:View,state:BeachVisualState,hover:string|null){const y=V.y,red=state.danger;  // the drone, hovering over the water side, scanning the sea
  const dx = V.sx(L.drone), dy = y(124) + Math.round(Math.sin(V.t * 0.06) * 2);
  x.fillStyle = 'rgba(255,230,140,.06)';
  x.beginPath(); x.moveTo(dx - 2, dy + 8); x.lineTo(dx - 40 + Math.sin(V.t * 0.02) * 20, y(WATERLINE + 30)); x.lineTo(dx + 10 + Math.sin(V.t * 0.02) * 20, y(WATERLINE + 30)); x.lineTo(dx + 2, dy + 8); x.closePath(); x.fill();
  const rot = Math.floor(V.t / 2) % 2;
  x.fillStyle = '#8e949e'; x.fillRect(dx - 15, dy - 1, rot ? 10 : 6, 1); x.fillRect(dx + 5 + (rot ? 0 : 4), dy - 1, rot ? 10 : 6, 1);
  x.fillStyle = '#4a4f5a'; x.fillRect(dx - 11, dy, 2, 3); x.fillRect(dx + 9, dy, 2, 3);
  box(x, dx - 9, dy + 2, 18, 7, '#e8e0d0', 'rgba(' + O + ',.6)');
  x.fillStyle = red ? 'rgba(' + RED + ',.95)' : 'rgba(' + GREEN + ',.9)'; x.fillRect(dx - 6, dy + 4, 4, 2);
  tell(x, V.t, dx + 5, dy + 5, 4);
  if (hover === 'drone') glow(x, dx - 15, dy - 2, 30, 13);
}
function pierDeck(x:CanvasRenderingContext2D,V:View,p:number,railingEnd:number){
  const l = V.sx(L.pier0), r = V.sx(BEACH_W + 20), y = V.y;
  if (r < 0 || l > V.viewW) return;
  // piles down into the water (behind the deck)
  for (let px = L.pier0 + 20; px < BEACH_W + 20; px += 46) { x.fillStyle = '#2a1a12'; x.fillRect(V.sx(px) - 2, y(0), 5, V.viewH - V.gy); }
  // the deck
  box(x, l, y(3), r - l, 6, mix([110, 78, 52], [66, 46, 36], p), 'rgba(' + O + ',.65)');
  for (let bx = L.pier0; bx < BEACH_W + 20; bx += 9) { x.fillStyle = 'rgba(20,10,6,.35)'; x.fillRect(V.sx(bx), y(3), 1, 6); }
  // the railing on the far side
  x.fillStyle = 'rgba(' + O + ',.5)'; x.fillRect(l, y(24), V.sx(railingEnd) - l, 1);
  for (let bx = L.pier0; bx <= railingEnd; bx += 23) x.fillRect(V.sx(bx), y(24), 1, 21);
}
function pierLamp(x:CanvasRenderingContext2D,V:View,wx:number,lit:boolean){const y=V.y;
    const lx = V.sx(wx);
    if (!onScreen(V, lx - 40, 80)) return;
    if (lit) {
      const g = x.createRadialGradient(lx, y(56), 2, lx, y(40), 46);
      g.addColorStop(0, 'rgba(255,214,150,.22)'); g.addColorStop(1, 'rgba(255,214,150,0)');
      x.fillStyle = g; x.fillRect(lx - 46, y(100), 92, 100);
    }
    x.fillStyle = '#2a1d14'; x.fillRect(lx - 1, y(56), 2, 54);
    box(x, lx - 3, y(60), 6, 5, '#3a2a1e', 'rgba(255,190,120,.5)');
    x.fillStyle = lit ? 'rgba(255,230,180,.95)' : 'rgba(255,230,180,.15)'; x.fillRect(lx - 2, y(57), 4, 2);
  }
function pierController(x:CanvasRenderingContext2D,V:View,state:BeachVisualState,hover:string|null){const y=V.y,lit=state.lamps;  // the controller box at the pier's foot (cyan: the schedule can be read and hacked)
  const bx = V.sx(L.pierLights);
  x.fillStyle = '#2a1d14'; x.fillRect(bx - 1, y(14), 3, 14);
  box(x, bx - 9, y(36), 18, 22, '#5a5e66', 'rgba(220,230,240,.6)');
  box(x, bx - 6, y(32), 12, 6, '#04100f', 'rgba(' + C + ',.7)');
  x.fillStyle = lit ? 'rgba(255,230,180,.95)' : 'rgba(' + C + ',.35)'; x.fillRect(bx - 4, y(30), 3, 2);
  tell(x, V.t, bx + 5, y(18), 5);
  if (hover === 'pier') glow(x, bx - 9, y(36), 18, 22);
}
function berthSign(x:CanvasRenderingContext2D,V:View,wx:number){const y=V.y;  // a sign on the railing at the pier's start
  // the harbour's board, bolted to the railing
  const sg = V.sx(wx);
  x.fillStyle = '#2a1d14'; x.fillRect(sg - 30, y(36), 2, 36); x.fillRect(sg + 28, y(36), 2, 36);
  box(x, sg - 34, y(44), 68, 20, '#1a120b', 'rgba(' + O + ',.7)');
  text(x, 'BERTHS 1-9', sg, y(38), 'rgba(' + PAPER + ',.95)', 7, '600');
  text(x, 'PERMIT HOLDERS', sg, y(30), 'rgba(' + PAPER + ',.8)', 7, '600');
}
return{sky,city,shore,stairs,kiosk,lime,crab,volleyball,castle,board,rod,boat,postGull,gulls,foreground,seaBase,buoy,surfing,swimmer,boardwalk,publicNotice,sunbed,barPhoto,barStool,jukebox,mixer,tower,drone,pierDeck,pierLamp,pierController,berthSign};
}
