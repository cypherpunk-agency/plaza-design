/** Extracted artwork. Scene-owned layout, actors and visual inputs are supplied explicitly. */
import { type View } from "../core/view";
import { light,windowLit } from "../../world/light";
import { drawGrade } from "../atmosphere/lighting";
import { box,C,GREEN,O,onScreen,PAPER,RED,rng,RUST,tell,text } from "../core/primitives";
import { drawPane,windowShaft } from "../environment/sky";
import { YELLOW } from "../signage/screens";
export interface ArtworkInputs { L: { door: number; spawn: number; notice: number; soap: number; clock: number; washers: number[]; breaker: number; suds: number; table: { x0: number; x1: number; h: number; }; folder: number; bench: { x0: number; x1: number; h: number; }; gran: number; sleeper: number; window: { x0: number; x1: number; h0: number; h1: number; }; cat: number; socks: number; tubes: number[]; };
originX?: number; ceiling?: number; LAUNDROMAT_FACING: number; LAUNDROMAT_W: number }
export function createLaundromatArtwork(inputs: ArtworkInputs) {
const { L, LAUNDROMAT_FACING, LAUNDROMAT_W } = inputs;

const CEIL = inputs.ceiling ?? 150, originX = inputs.originX ?? 0;


const RAIN = (() => { const r = rng(91); return Array.from({ length: 30 }, () => [r() * 192, r() * 84, 0.5 + r()]); })();

/** Stable noise for the flats upstairs. */
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };


// ---------- the room ----------

/** The building over the shop, storey after storey, on screens taller than the shop (middle band, dim). */
function upstairs(x: CanvasRenderingContext2D, v: View, w0: number, w1: number) {
  const { y, t, sx } = v;
  for (let k = 0, h0 = CEIL + 10; y(h0) > 0; k++, h0 += 86) {
    x.fillStyle = k % 2 ? '#070403' : '#080504'; x.fillRect(w0, y(h0 + 76), w1 - w0, 76);
    x.fillStyle = '#0d0805'; x.fillRect(w0, y(h0 + 86), w1 - w0, 10);
    x.fillStyle = 'rgba(' + RUST + ',.3)'; x.fillRect(w0, y(h0 + 86), w1 - w0, 1);
    for (let i = 0; i < 5; i++) {
      const n = hash(k * 31 + i * 7), wx = sx(originX + 80 + i * 170 + n * 40);
      if (!onScreen(v, wx, 30)) continue;
      const lit = n < 0.4, tv = n > 0.8;
      box(x, wx, y(h0 + 60), 28, 32, lit ? 'rgba(255,170,90,.1)' : tv ? 'rgba(150,170,220,' + (0.05 + 0.03 * Math.sin(t * 0.07 + n * 9)) + ')' : '#030201', 'rgba(' + RUST + ',.35)');
      x.fillStyle = 'rgba(' + RUST + ',.35)'; x.fillRect(wx + 14, y(h0 + 60), 1, 32);
    }
  }
}


/** The market through the front window: the stalls' awnings and bulbs, people passing, rain, the shop's own sign backwards on the glass. */
function frontWindowBack(x: CanvasRenderingContext2D, v: View) {
  const { sx, y, t } = v, W = L.window, l = sx(W.x0), top = y(W.h1), w = W.x1 - W.x0, h = W.h1 - W.h0;
  if (!onScreen(v, l, w)) return;
  x.save(); x.beginPath(); x.rect(l, top, w, h); x.clip();
  // the sky of the moment over the tenements (sets/sky.ts; the window looks south onto the market)
  const lt = light();
  drawPane(x, l, top, w, h, lt, { facing: LAUNDROMAT_FACING, seed: 23, towers: false, horizon: 0.08 });
  // the tenements across the market, their windows lit by the clock
  x.fillStyle = '#0c0705'; x.fillRect(l, top + 6, w, h);
  for (let yy = top + 10; yy < top + 44; yy += 8) for (let xx = l + 4; xx < l + w - 4; xx += 9) {
    const n = hash(xx * 3 + yy * 11);
    x.fillStyle = n < 0.32 && windowLit(Math.round((xx - l) * 3 + (yy - top) * 11)) ? 'rgba(255,170,90,.35)' : 'rgba(' + RUST + ',.1)'; x.fillRect(xx, yy, 4, 4);
  }
  // the stalls opposite: striped awnings, strings of bulbs
  for (let i = 0; i < 4; i++) {
    const ax = l + 8 + i * 48, ay = top + 48;
    for (let s = 0; s < 40; s += 8) { x.fillStyle = s % 16 ? 'rgba(194,65,12,.5)' : 'rgba(255,217,165,.35)'; x.fillRect(ax + s, ay, 8, 5); }
    x.fillStyle = 'rgba(20,12,8,1)'; x.fillRect(ax + 2, ay + 5, 36, h - 53);
    for (let b = 0; b < 5; b++) { x.fillStyle = (b + Math.floor(t / 40) + i) % 5 ? 'rgba(255,190,110,.6)' : 'rgba(255,217,165,.2)'; x.fillRect(ax + 4 + b * 8, ay - 3, 2, 2); }
  }
  x.restore();
}

function frontWindowFront(x: CanvasRenderingContext2D, v: View) {
  const { sx, y, t } = v, W = L.window, l = sx(W.x0), top = y(W.h1), w = W.x1 - W.x0, h = W.h1 - W.h0;
  if (!onScreen(v, l, w)) return;
  const lt = light();
  x.save(); x.beginPath(); x.rect(l, top, w, h); x.clip();
  // the market outside takes the hour's grade (sets/lighting.ts)
  drawGrade(x, v, lt, true);
  // rain on the street, and on the glass, when it rains
  x.strokeStyle = 'rgba(170,210,255,.22)';
  if ((lt.w?.rain ?? 0) > 0.05) for (const [rx, ry, sp] of RAIN) { const yy = (ry + t * sp * 2) % h; x.beginPath(); x.moveTo(l + rx, top + yy); x.lineTo(l + rx - 1, top + yy + 4); x.stroke(); }
  x.restore();
  // the frame and its mullions; the shop's name backwards on the glass, lit from inside
  x.strokeStyle = 'rgba(' + O + ',.8)'; x.lineWidth = 1; x.strokeRect(l + 0.5, top + 0.5, w - 1, h - 1);
  x.fillStyle = 'rgba(' + O + ',.75)'; x.fillRect(l + w / 3, top, 1, h); x.fillRect(l + (2 * w) / 3, top, 1, h);
  text(x, 'TAMORDNUAL', l + w / 2, top + 10, 'rgba(255,136,0,.5)', 8, '600');
  // the sill the cat sits on
  box(x, l - 4, y(W.h0), w + 8, 4, '#2a1a10', 'rgba(' + O + ',.7)');
  // the sun through the front window, onto the floor (none at night: the lamps then)
  windowShaft(x, { l, r: l + w, t: top, b: y(W.h0) }, y(0), Math.min(v.viewH, y(0) + 16), lt, LAUNDROMAT_FACING);
}


/** A row of dryers over the washers: dead, stacked, the middle band (one has a note on it). */
function dryer(x: CanvasRenderingContext2D, v: View, wx: number, i: number) {
  const { sx, y } = v;
    const s = sx(wx - 23);
    if (!onScreen(v, s, 46)) return;
    box(x, s, y(100), 46, 40, '#16110d', 'rgba(' + PAPER + ',.18)');
    x.strokeStyle = 'rgba(' + PAPER + ',.16)'; x.beginPath(); x.arc(s + 23, y(80), 11, 0, 7); x.stroke();
    x.fillStyle = '#080605'; x.beginPath(); x.arc(s + 23, y(80), 9, 0, 7); x.fill();
    if (i === 1) { box(x, s + 6, y(94), 34, 9, 'rgba(' + PAPER + ',.75)'); text(x, 'BROKEN', s + 23, y(89.5), '#3a2010', 7, '600'); }

}

/** The conduits from the breaker to every washer, in the wall: P13's fixed cables, where you can see them. */
function conduits(x: CanvasRenderingContext2D, v: View, tripped: boolean) {
  const { sx, y } = v, h = 53, b = sx(L.breaker - 10), a = sx(L.washers[0]);
  x.fillStyle = '#3a2a1c'; x.fillRect(a - 1, y(h + 1), b - a + 2, 3);
  x.fillStyle = 'rgba(' + O + ',.55)'; x.fillRect(a - 1, y(h + 1), b - a + 2, 1);
  for (const wx of L.washers) { x.fillStyle = '#3a2a1c'; x.fillRect(sx(wx) - 1, y(h), 3, 3); }
  // a pulse runs back along them when the breaker trips
  if (tripped) { x.fillStyle = 'rgba(' + RED + ',.55)'; x.fillRect(a, y(h + 1) + 1, b - a, 1); }
}


const CLOTHES: string[][] = [
  ['#3a5a9a', '#2e4a7e', '#46609a', '#33508a'],
  ['#9a5a6a', '#d8b040', '#5a8a3a', '#b8a68a'],
  ['#26262e', '#1e1e24', '#2e2a30', '#26262e'],
  ['#c9a227', '#62626c', '#c9a227', '#3a3438'],
];


/** One washer: body, display, the drum turning while it washes, its lamp; washer 3's door opens at the end. */
function washer(x: CanvasRenderingContext2D, v: View, status: string, door: string, progress: number, i: number, hover: boolean) {
  const { sx, y, t } = v, st = status, cx = L.washers[i], s = sx(cx - 23), top = y(50);
  if (!onScreen(v, s - 10, 66)) return;
  const door3 = i === 2 ? door : '';
  // shadow gap, body (white goods: a lit fill, lighter than the wall), the kick plate
  x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(s - 2, top - 1, 50, 51);
  box(x, s, top, 46, 50, '#3b3631', 'rgba(' + PAPER + ',.55)');
  box(x, s + 2, y(5), 42, 5, '#2a2622');
  // the panel: a display (cyan edge: you can use it) and a dial
  box(x, s + 3, top + 3, 30, 10, '#041416', 'rgba(' + C + ',.6)');
  const shown = st === 'running' ? 'WASH' : st === 'done' ? (i === 2 && door3 !== 'open' && door3 !== 'empty' ? 'HELD' : 'DONE') : '1 LEFT';
  text(x, shown, s + 18, top + 8.5, st === 'running' ? 'rgba(255,210,58,.95)' : st === 'done' ? 'rgba(' + GREEN + ',.95)' : 'rgba(' + C + ',.85)', 7, '600');
  x.fillStyle = '#6a625a'; x.beginPath(); x.arc(s + 39, top + 8, 3, 0, 7); x.fill();
  // the lamp: red loaded and locked, amber washing, green done
  const lamp = st === 'running' ? (Math.floor(t / 15) % 2 ? YELLOW : '120,90,20') : st === 'done' ? GREEN : RED;
  x.fillStyle = 'rgba(' + lamp + ',.95)'; x.fillRect(s + 37, top + 14, 4, 2);
  // the progress of a cycle
  if (st === 'running') {
    const f = progress;
    x.fillStyle = 'rgba(255,210,58,.25)'; x.fillRect(s + 3, top + 15, 30, 2);
    x.fillStyle = 'rgba(255,210,58,.9)'; x.fillRect(s + 3, top + 15, Math.round(30 * f), 2);
  }
  // the porthole: chrome ring, glass, the load (turning while it washes)
  const px = s + 23, py = y(21), r = 13;
  const open = i === 2 && (door3 === 'open' || door3 === 'empty');
  x.save(); x.beginPath(); x.arc(px, py, r - 2, 0, 7); x.clip();
  x.fillStyle = '#081016'; x.fillRect(px - r, py - r, r * 2, r * 2);
  if (!(i === 2 && door3 === 'empty')) {
    const spin = st === 'running' ? t * 0.25 : 0, cols = CLOTHES[i];
    if (i === 2 && st !== 'running') {
      // the jacket, folded once, a sleeve against the glass
      x.fillStyle = cols[0]; x.fillRect(px - 9, py + 1, 18, 9);
      x.fillStyle = cols[2]; x.fillRect(px - 9, py + 1, 18, 1); x.fillRect(px + 2, py - 5, 5, 7);
      x.fillStyle = 'rgba(200,200,210,.5)'; x.fillRect(px - 2, py + 3, 1, 5);
    } else {
      for (let k = 0; k < 4; k++) {
        const a = spin + k * 1.57, bx = px + Math.cos(a) * 5, by = py + 3 + Math.sin(a) * 4;
        x.fillStyle = cols[k]; x.fillRect(Math.round(bx) - 4, Math.round(by) - 3, 8, 6);
      }
    }
    if (st === 'running') {
      x.fillStyle = 'rgba(150,190,230,.25)'; x.fillRect(px - r, py + 2 + Math.sin(t * 0.3) * 1.5, r * 2, r);
      for (let k = 0; k < 3; k++) { x.fillStyle = 'rgba(230,240,255,.5)'; x.fillRect(px - 6 + k * 5, py + 1 + ((t * 0.4 + k * 3) % 8), 1, 1); }
    }
  }
  x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(px - 8, py - 9, 5, 2);
  x.restore();
  x.strokeStyle = 'rgba(210,210,220,.8)'; x.lineWidth = 2; x.beginPath(); x.arc(px, py, r - 1, 0, 7); x.stroke(); x.lineWidth = 1;
  if (open) {
    // the door swung open on its hinge, seen edge-on
    x.fillStyle = 'rgba(210,210,220,.7)'; x.fillRect(px + r + 1, py - r + 1, 4, r * 2 - 2);
    x.fillStyle = 'rgba(' + GREEN + ',.5)'; x.fillRect(px - r, py + r, r * 2, 1);
  }
  // a shake while it spins
  if (st === 'running' && Math.floor(t / 4) % 2) { x.fillStyle = 'rgba(' + PAPER + ',.15)'; x.fillRect(s - 1, y(1), 48, 1); }
  tell(x, t, s + 42, top + 47, i);
  if (hover) {
    x.save(); x.strokeStyle = 'rgba(255,61,242,.85)'; x.shadowColor = 'rgba(255,61,242,.8)'; x.shadowBlur = 8;
    x.strokeRect(s - 3.5, top - 3.5, 53, 57); x.restore();
  }
}


/** The breaker box: one lever, one circuit. Lever up and green, or down and red. */
function breaker(x: CanvasRenderingContext2D, v: View, tripped: boolean, hover: boolean) {
  const { sx, y, t } = v, s = sx(L.breaker - 12), top = y(78);
  if (!onScreen(v, s - 10, 44)) return;
  box(x, s, top, 24, 34, '#4a4a50', 'rgba(' + PAPER + ',.55)');
  box(x, s + 3, top + 3, 18, 8, '#1a1a1e');
  text(x, 'C1', s + 12, top + 7.5, 'rgba(' + PAPER + ',.85)', 7, '600');
  // the lever in its slot
  box(x, s + 9, top + 13, 6, 16, '#141416');
  x.fillStyle = tripped ? 'rgba(' + RED + ',.9)' : 'rgba(220,220,230,.9)'; x.fillRect(s + 8, tripped ? top + 23 : top + 13, 8, 5);
  const on = tripped ? Math.floor(t / 10) % 2 === 0 : true;
  x.fillStyle = 'rgba(' + (tripped ? RED : GREEN) + ',' + (on ? 0.95 : 0.3) + ')'; x.fillRect(s + 19, top + 14, 2, 3);
  // the cyan tell, and the warning plate under it
  tell(x, t, s + 4, top + 31, 2);
  box(x, s - 4, y(40), 32, 9, '#1a120b', 'rgba(' + YELLOW + ',.6)');
  text(x, 'MAX 2', s + 12, y(35.5), 'rgba(' + YELLOW + ',.9)', 7, '600');
  if (hover) { x.save(); x.strokeStyle = 'rgba(255,61,242,.85)'; x.shadowColor = 'rgba(255,61,242,.8)'; x.shadowBlur = 8; x.strokeRect(s - 3.5, top - 3.5, 31, 41); x.restore(); }
}


/** SUDS on its post: a screen with a face of bubbles. It frowns when the breaker trips and beams when the queue is clear. */
function suds(x: CanvasRenderingContext2D, v: View, tripped: boolean, clear: boolean, hover: boolean) {
  const { sx, y, t } = v, cx = sx(L.suds), top = y(56);
  if (!onScreen(v, cx - 30, 60)) return;
  box(x, cx - 2, y(26), 4, 26, '#2a1a10', 'rgba(' + O + ',.6)');
  box(x, cx - 8, y(3), 16, 3, '#2a1a10', 'rgba(' + O + ',.6)');
  const g = x.createRadialGradient(cx, top + 15, 2, cx, top + 15, 40);
  g.addColorStop(0, 'rgba(0,255,255,.1)'); g.addColorStop(1, 'rgba(0,255,255,0)');
  x.fillStyle = g; x.fillRect(cx - 40, top - 25, 80, 80);
  box(x, cx - 15, top, 30, 30, '#05181a', 'rgba(' + C + ',.75)');
  const face = 'rgba(' + C + ',.9)';
  // eyes: bubbles; a mouth
  x.strokeStyle = face; x.lineWidth = 1;
  if (tripped) { for (const ex of [-6, 6]) { x.beginPath(); x.moveTo(cx + ex - 2, top + 9); x.lineTo(cx + ex + 2, top + 13); x.moveTo(cx + ex + 2, top + 9); x.lineTo(cx + ex - 2, top + 13); x.stroke(); } }
  else for (const ex of [-6, 6]) { x.beginPath(); x.arc(cx + ex, top + 11, 2.5, 0, 7); x.stroke(); }
  x.beginPath();
  if (tripped) { x.moveTo(cx - 6, top + 23); x.lineTo(cx + 6, top + 23); }
  else if (clear) x.arc(cx, top + 18, 6, 0.2, Math.PI - 0.2);
  else x.arc(cx, top + 16, 6, 0.6, Math.PI - 0.6);
  x.stroke();
  // bubbles rising off the top of the screen
  for (let k = 0; k < 4; k++) {
    const f = ((t * 0.6 + k * 25) % 100) / 100, bx = cx - 9 + k * 6 + Math.sin(t * 0.05 + k) * 2, by = top - f * 22;
    x.strokeStyle = 'rgba(' + C + ',' + (0.5 * (1 - f)) + ')'; x.beginPath(); x.arc(bx, by, 1.5 + k % 2, 0, 7); x.stroke();
  }
  // its plate on the post
  box(x, cx - 14, y(22), 28, 10, '#1a120b', 'rgba(' + O + ',.7)');
  text(x, 'SUDS', cx, y(17), 'rgba(' + PAPER + ',.9)', 7, '600');
  if (hover) { x.save(); x.strokeStyle = 'rgba(255,61,242,.85)'; x.shadowColor = 'rgba(255,61,242,.8)'; x.shadowBlur = 8; x.strokeRect(cx - 18.5, top - 3.5, 37, 59); x.restore(); }
}


/** The schedule: a timer box counting down to the next slot, the opening hours on a plate over it. */
function schedule(x: CanvasRenderingContext2D, v: View, next: { ms: number } | null, hover: boolean) {
  const { sx, y, t } = v, s = sx(L.clock - 17), top = y(88);
  if (!onScreen(v, s - 20, 74)) return;
  box(x, s - 6, y(104), 46, 12, '#1a120b', 'rgba(' + O + ',.7)');
  text(x, '06:00–02:00', s + 17, y(98), 'rgba(' + PAPER + ',.9)', 7, '600');
  box(x, s, top, 34, 30, '#241a12', 'rgba(' + PAPER + ',.5)');
  box(x, s + 3, top + 3, 28, 15, '#041416', 'rgba(' + C + ',.6)');
  const secs = next ? String(Math.ceil(next.ms / 1000)).padStart(2, '0') : '--';
  text(x, next ? 'SLOT ' + secs : 'STOPPED', s + 17, top + 10.5, next && next.ms < 3000 ? 'rgba(255,210,58,.95)' : 'rgba(' + C + ',.9)', 7, '600');
  for (let k = 0; k < 3; k++) { x.fillStyle = 'rgba(' + PAPER + ',.35)'; x.fillRect(s + 6 + k * 9, top + 22, 5, 3); }
  tell(x, t, s + 31, top + 27, 3);
  // its cable runs down the wall and along the skirting toward the washers
  x.fillStyle = 'rgba(' + RUST + ',.6)'; x.fillRect(s + 33, y(60), 1, 2); x.fillRect(s + 33, y(58), 1, 46); x.fillRect(s + 33, y(12), sx(L.washers[0] - 23) - (s + 33), 1);
  if (hover) { x.save(); x.strokeStyle = 'rgba(255,61,242,.85)'; x.shadowColor = 'rgba(255,61,242,.8)'; x.shadowBlur = 8; x.strokeRect(s - 3.5, top - 3.5, 41, 37); x.restore(); }
}


/** The soap dispenser on the wall: sachets behind a window, a token slot. */
function soap(x: CanvasRenderingContext2D, v: View) {
  const { sx, y, t } = v, s = sx(L.soap - 14);
  if (!onScreen(v, s, 28)) return;
  box(x, s, y(76), 28, 42, '#22302a', 'rgba(' + PAPER + ',.5)');
  box(x, s + 3, y(72), 22, 18, '#0a100e', 'rgba(' + PAPER + ',.3)');
  for (let k = 0; k < 6; k++) { x.fillStyle = ['#5aa83a', '#e8c83a', '#3a6ad8'][k % 3]; x.globalAlpha = 0.7; x.fillRect(s + 5 + (k % 3) * 7, y(70) + Math.floor(k / 3) * 8, 5, 6); x.globalAlpha = 1; }
  box(x, s + 9, y(50), 10, 4, '#020303', 'rgba(' + C + ',.7)');
  box(x, s + 4, y(43), 20, 6, '#020303');
  box(x, s - 4, y(88), 36, 10, '#1a120b', 'rgba(' + O + ',.7)');
  text(x, 'SOAP 1T', s + 14, y(83), 'rgba(' + PAPER + ',.9)', 7, '600');
  tell(x, t, s + 24, y(38), 4);
}


/** The folding table: the one towel, folded and unfolded by FOLD-O, and the neat piles. */
function table(x: CanvasRenderingContext2D, v: View) {
  const { sx, y, t } = v, T = L.table, a = sx(T.x0), w = T.x1 - T.x0;
  if (!onScreen(v, a, w)) return;
  box(x, a, y(T.h), w, 3, '#5a4a3a', 'rgba(' + PAPER + ',.5)');
  x.fillStyle = '#2a1d14'; x.fillRect(a + 3, y(T.h - 3), 2, T.h - 3); x.fillRect(a + w - 5, y(T.h - 3), 2, T.h - 3);
  // the towel: spread out, then folded, then spread out again
  const ph = Math.floor(t / 40) % 3, tw = [22, 12, 6][ph], th = [2, 3, 5][ph];
  x.fillStyle = '#b8a68a'; x.fillRect(a + 34 - tw / 2, y(T.h + th), tw, th);
  x.fillStyle = '#d8c8a8'; x.fillRect(a + 34 - tw / 2, y(T.h + th), tw, 1);
  // a pile of folded nothing, very neat
  for (let k = 0; k < 3; k++) { x.fillStyle = ['#8a7a6a', '#a8987a', '#7a6a5a'][k]; x.fillRect(a + 4, y(T.h + 3 + k * 3), 14, 3); }
}


/** The bench under the window. */
function benchUnderWindow(x: CanvasRenderingContext2D, v: View) {
  const { sx, y } = v, B = L.bench, a = sx(B.x0), w = B.x1 - B.x0;
  if (!onScreen(v, a, w)) return;
  box(x, a, y(B.h), w, 3, '#4a2a1a', 'rgba(' + O + ',.6)');
  x.fillStyle = '#2a1a10'; x.fillRect(a + 4, y(B.h - 3), 3, B.h - 3); x.fillRect(a + w - 7, y(B.h - 3), 3, B.h - 3);
}


/** The lost-sock board: single socks pinned up, notes under them in different hands. */
function sockBoard(x: CanvasRenderingContext2D, v: View) {
  const { sx, y, t } = v, s = sx(L.socks - 18);
  if (!onScreen(v, s, 36)) return;
  box(x, s, y(108), 36, 44, '#4a321e', 'rgba(' + O + ',.7)');
  const cols = ['#c8c0b0', '#8a2a2a', '#3a6ad8', '#62626c', '#d8b040'];
  for (let k = 0; k < 5; k++) {
    const sxk = s + 4 + (k % 3) * 11, syk = y(102) + Math.floor(k / 3) * 18;
    x.fillStyle = cols[k]; x.fillRect(sxk, syk, 3, 8); x.fillRect(sxk, syk + 6, 6, 3);
    x.fillStyle = 'rgba(255,42,68,.8)'; x.fillRect(sxk + 1, syk, 1, 1);
  }
  box(x, s + 4, y(70), 28, 4, 'rgba(' + PAPER + ',.7)');
  tell(x, t, s + 32, y(66), 5);
}


function room(x:CanvasRenderingContext2D,v:View){const {sx,y}=v,w0=sx(originX),w1=sx(originX+LAUNDROMAT_W);
  // middle band: the back wall (pale tiles to shoulder height, paint above), the ceiling
  box(x, w0, y(CEIL), w1 - w0, CEIL, '#110b08');
  box(x, w0, y(64), w1 - w0, 64, '#15100c');
  x.fillStyle = 'rgba(' + PAPER + ',.04)';
  for (let hy = 4; hy < 64; hy += 8) x.fillRect(w0, y(hy), w1 - w0, 1);
  for (let wx = originX; wx < originX + LAUNDROMAT_W; wx += 12) x.fillRect(sx(wx), y(64), 1, 64);
  x.fillStyle = 'rgba(' + O + ',.3)'; x.fillRect(w0, y(64), w1 - w0, 1);
  box(x, w0, y(CEIL + 10), w1 - w0, 10, '#0d0805');
  x.fillStyle = 'rgba(' + O + ',.4)'; x.fillRect(w0, y(CEIL), w1 - w0, 1);
  x.fillStyle = 'rgba(' + O + ',.7)'; x.fillRect(w0, 0, 1, v.gy); x.fillRect(w1 - 1, 0, 1, v.gy);

}
function clear(x:CanvasRenderingContext2D,v:View){x.fillStyle='#020101';x.fillRect(0,0,v.viewW,v.viewH);}
function tube(x:CanvasRenderingContext2D,v:View,wx:number,dim:boolean){const {sx,y}=v;
    const lx = sx(wx);
    const g = x.createLinearGradient(0, y(CEIL - 4), 0, y(0));
    g.addColorStop(0, 'rgba(225,240,255,' + (dim ? 0.03 : 0.1) + ')'); g.addColorStop(1, 'rgba(225,240,255,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(lx - 30, y(CEIL - 4)); x.lineTo(lx - 100, y(0)); x.lineTo(lx + 100, y(0)); x.lineTo(lx + 30, y(CEIL - 4)); x.closePath(); x.fill();
    box(x, lx - 30, y(CEIL - 2), 60, 3, dim ? 'rgba(225,240,255,.25)' : 'rgba(235,245,255,.9)');}
function floor(x:CanvasRenderingContext2D,v:View){const {sx}=v,w0=sx(originX),w1=sx(originX+LAUNDROMAT_W);
  // the floor: tiles, a drain, a puddle under the washers that reflects the tubes
  x.fillStyle = '#070505'; x.fillRect(w0, v.gy, w1 - w0, v.viewH - v.gy);
  x.fillStyle = 'rgba(' + O + ',.6)'; x.fillRect(w0, v.gy, w1 - w0, 1);
  for (let r = 0; r < 4; r++) for (let c = 0; c < LAUNDROMAT_W; c += 20) {
    if ((c / 20 + r) % 2) continue;
    const tx = sx(originX + c) + r * 5;
    if (tx < w0 || tx > w1 - 18) continue;
    x.fillStyle = 'rgba(235,245,255,.035)'; x.fillRect(tx, v.gy + 3 + r * 12, 16, 10);
  }
}
return { upstairs,frontWindowBack,frontWindowFront,dryer,conduits,washer,breaker,suds,schedule,soap,table,benchUnderWindow,sockBoard,room,clear,tube,floor };
}
