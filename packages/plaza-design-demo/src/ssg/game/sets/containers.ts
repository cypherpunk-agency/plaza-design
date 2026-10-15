/**
 * Set piece (ART-GUIDE §12): the shipping container, and a stack of them. Corrugated side,
 * door bars at one end, rust, a dent, stencilled codes, a placard; seeded, so every box keeps
 * its look. Register: sets/index.ts (`containers`).
 *
 * Drawn on a scene `View` (world x, heights above the ground). A picture drawn in its own
 * frame (the glide, scaled) translates to the stack's foot and passes `frameView()` (sets/view.ts).
 */

import { box, onScreen, PAPER, rng, text, type View } from '../scenes/kit';

/** A container's height (world units). */
export const CH = 58;
const CH0 = CH;
/** Container paints: fill, outline, rib highlight. Earthy and faded; no cyan (that is for things you can use). */
export const PAL: [string, string, string][] = [
  ['#3a1608', 'rgba(255,136,0,.8)', 'rgba(255,150,60,.12)'], // orange
  ['#0f2024', 'rgba(110,160,160,.65)', 'rgba(140,190,190,.1)'], // faded teal
  ['#2c0c10', 'rgba(220,90,90,.72)', 'rgba(230,110,110,.1)'], // red
  ['#2a2208', 'rgba(230,190,80,.72)', 'rgba(240,210,110,.1)'], // yellow
  ['#142012', 'rgba(130,170,110,.62)', 'rgba(150,190,120,.1)'], // green
  ['#1a1a22', 'rgba(170,170,190,.6)', 'rgba(190,190,210,.09)'], // grey-blue
  ['#24150e', 'rgba(200,150,110,.62)', 'rgba(210,160,120,.1)'], // brown
  ['#2c2824', 'rgba(225,215,200,.6)', 'rgba(235,225,210,.1)'], // dirty white
];

/**
 * One box: width (the scenes: 128 or 66), paint (`PAL` index), seed, its code and the line's name, how
 * crooked it sits on the one below. `h`: its height when it is not the scenes' `CH` (the glide draws boxes
 * true to the player's scale: a 40 ft box 320 x 69, a 20 ft one 160 x 69; see `BOX40`).
 */
export interface Crate { w: number; p: number; seed: number; code?: string; label?: string; dx?: number; h?: number }

/** A box true to the player's scale (48 units = 1.8 m): 40 ft (12.2 m) and 20 ft long, 2.6 m tall. */
export const BOX40 = { w: 320, h: 69 }, BOX20 = { w: 160, h: 69 };

/** A container: corrugated side, door bars at one end, rust, a dent, codes, a placard. Seeded. */
export function container(x: CanvasRenderingContext2D, v: View, wx: number, h: number, b: Crate) {
  const CH = b.h ?? CH0, s0 = Math.round(v.sx(wx + (b.dx ?? 0))), top = Math.round(v.y(h + CH)), w = b.w;
  if (!onScreen(v, s0, w)) return;
  const [fill, edge, hi] = PAL[b.p], r = rng(b.seed * 31 + 7);
  box(x, s0, top, w, CH, fill, edge);
  x.fillStyle = 'rgba(0,0,0,.3)'; for (let i = 4; i < w - 3; i += 4) x.fillRect(s0 + i, top + 4, 1, CH - 8);
  x.fillStyle = hi; for (let i = 6; i < w - 3; i += 4) x.fillRect(s0 + i, top + 4, 1, CH - 8);
  x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(s0 + 1, top + 1, w - 2, 3); x.fillRect(s0 + 1, top + CH - 4, w - 2, 3);
  // corner castings
  x.fillStyle = 'rgba(255,217,165,.25)'; x.fillRect(s0 + 1, top + 1, 3, 3); x.fillRect(s0 + w - 4, top + 1, 3, 3); x.fillRect(s0 + 1, top + CH - 4, 3, 3); x.fillRect(s0 + w - 4, top + CH - 4, 3, 3);
  // the door end: two locking bars with their handles
  const doorL = r() < 0.5, d0 = doorL ? s0 + 5 : s0 + w - 16;
  x.fillStyle = 'rgba(255,217,165,.3)'; x.fillRect(d0, top + 5, 2, CH - 10); x.fillRect(d0 + 8, top + 5, 2, CH - 10);
  x.fillRect(d0 - 2, top + CH / 2, 5, 2); x.fillRect(d0 + 6, top + CH / 2 + 4, 5, 2);
  // rust running down from the top rail
  const n = 1 + Math.floor(r() * 4);
  for (let k = 0; k < n; k++) {
    const rx = Math.round(s0 + 8 + r() * (w - 16)), rl = Math.round(8 + r() * (CH - 16));
    x.fillStyle = 'rgba(150,64,22,.5)'; x.fillRect(rx, top + 4, 2, rl);
    x.fillStyle = 'rgba(150,64,22,.25)'; x.fillRect(rx + 2, top + 4, 1, Math.round(rl * 0.6)); x.fillRect(rx - 3, top + 4, 6, 2);
  }
  if (r() < 0.45) { const dx = Math.round(s0 + 18 + r() * (w - 40)); x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(dx, top + CH * 0.6, 7, 4, 0.3, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(dx - 5, top + CH * 0.6 - 4, 6, 1); }
  // codes and the line's name, stencilled
  const cx = doorL ? s0 + 20 : s0 + 6;
  if (b.code) text(x, b.code, cx, top + 10, 'rgba(' + PAPER + ',.6)', 7, '600', 'left');
  if (b.label && w > 100) text(x, b.label, s0 + w / 2 + (doorL ? 8 : -8), top + CH / 2 + 2, 'rgba(' + PAPER + ',.42)', 7, '600');
  // a placard: hazard diamond, or a barcode sticker
  const q = r(), px = doorL ? s0 + w - 22 : s0 + 26;
  if (q < 0.35) { x.fillStyle = 'rgba(232,200,58,.7)'; x.beginPath(); x.moveTo(px, top + CH - 20); x.lineTo(px + 6, top + CH - 14); x.lineTo(px, top + CH - 8); x.lineTo(px - 6, top + CH - 14); x.closePath(); x.fill(); x.fillStyle = 'rgba(20,10,5,.8)'; x.fillRect(px - 1, top + CH - 16, 2, 4); }
  else if (q < 0.75) { box(x, px - 7, top + CH - 18, 14, 9, 'rgba(232,222,196,.7)'); x.fillStyle = 'rgba(20,10,5,.8)'; for (let i = 0; i < 10; i += 2) x.fillRect(px - 5 + i, top + CH - 16, 1, 5); }
}

/** A stack: boxes bottom to top from `wx` (the bottom box's left edge), each sitting a little crooked (`dx`) on the one below. */
export function stack(x: CanvasRenderingContext2D, v: View, wx: number, boxes: Crate[], h0 = 0) {
  let dx = 0, h = h0;
  boxes.forEach((b) => { dx += b.dx ?? 0; container(x, v, wx + dx - (b.dx ?? 0), h, b); h += b.h ?? CH; });
}
