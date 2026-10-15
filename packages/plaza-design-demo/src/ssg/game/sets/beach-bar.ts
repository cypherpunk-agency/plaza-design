/**
 * Set piece (ART-GUIDE ยง12): SALT, the beach bar. A shack on stilts with lit windows, a ragged
 * palm-thatch roof, SALT in yellow neon on its front, a ladder up, string lights from the eaves to
 * two poles, and a warm light under it. What happens under the floor (the shelves, LIME, the
 * counter, the jukebox and the mixer) is the beach scene's, drawn between `saltUnder` and
 * `saltShell`. Register: sets/index.ts (`beach-bar`).
 *
 * Drawn in its own frame: origin at the shack's left edge on the sand, x to the right, heights up
 * (y = -h). `w` is the shack's width (the beach's is 226). `p`: 0 (low gold sun) .. 1 (dusk).
 */

import { O, sign } from '../scenes/kit';
import { YELLOW } from '../scenes/screens';

/** The floor's and the eaves' heights. */
export const SALT = { floor: 64, roof: 116 };

const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
const mix = (a: number[], b: number[], f: number) => 'rgba(' + Math.round(lerp(a[0], b[0], f)) + ',' + Math.round(lerp(a[1], b[1], f)) + ',' + Math.round(lerp(a[2], b[2], f)) + ',1)';
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/** The warm light under and around the bar, and the stilts. */
export function saltUnder(x: CanvasRenderingContext2D, w: number) {
  const y = (h: number) => -h, { floor } = SALT;
  const lg = x.createRadialGradient(124, y(30), 4, 124, y(30), 160);
  lg.addColorStop(0, 'rgba(255,190,110,.28)'); lg.addColorStop(1, 'rgba(255,190,110,0)');
  x.fillStyle = lg; x.fillRect(-120, y(150), w + 240, 160);
  for (const sx of [6, 80, 150, w - 8]) { x.fillStyle = '#3a2618'; x.fillRect(sx - 2, y(floor), 5, floor); x.fillStyle = 'rgba(' + O + ',.35)'; x.fillRect(sx - 2, y(floor), 1, floor); }
}

/** The shack up on the stilts: walls, lit windows, the ladder, the thatch, the SALT sign. `t` flickers the neon (frames). */
export function saltShell(x: CanvasRenderingContext2D, w: number, p: number, t: number) {
  const y = (h: number) => -h, { floor, roof } = SALT, r = w;
  x.fillStyle = mix([120, 84, 56], [70, 48, 38], p); x.fillRect(-4, y(roof - 6), w + 8, roof - 6 - floor);
  x.strokeStyle = 'rgba(' + O + ',.75)'; x.lineWidth = 1; x.strokeRect(-3.5, y(roof - 6) + 0.5, w + 7, roof - 7 - floor);
  for (let bx = 0; bx < w; bx += 8) { x.fillStyle = 'rgba(20,10,6,.25)'; x.fillRect(bx, y(roof - 6), 1, roof - 6 - floor); }
  // windows up there, lit from inside
  for (const wx of [24, w - 52]) {
    x.fillStyle = 'rgba(255,190,110,.55)'; x.fillRect(wx, y(roof - 18), 28, 18);
    x.strokeStyle = 'rgba(' + O + ',.8)'; x.strokeRect(wx + 0.5, y(roof - 18) + 0.5, 27, 17);
    x.fillStyle = 'rgba(40,20,10,.6)'; x.fillRect(wx + 13, y(roof - 18), 2, 18);
  }
  // the ladder up
  for (let k = 0; k < 7; k++) { x.fillStyle = '#5a3a24'; x.fillRect(r + 4, y(8 + k * 8), 10, 2); }
  x.fillStyle = '#5a3a24'; x.fillRect(r + 4, y(floor), 2, floor); x.fillRect(r + 13, y(floor), 2, floor);
  // the roof: palm thatch, ragged
  x.fillStyle = mix([170, 130, 70], [100, 74, 50], p);
  x.beginPath(); x.moveTo(-16, y(roof - 6)); x.lineTo(w / 2, y(roof + 18)); x.lineTo(r + 16, y(roof - 6)); x.closePath(); x.fill();
  x.fillStyle = 'rgba(40,20,10,.35)';
  for (let k = 0; k < 30; k++) x.fillRect(-14 + k * ((w + 28) / 30), y(roof - 6), 2, 3 + Math.round(hash(k) * 4));
  // SALT in neon on the shack front
  sign(x, t, 'SALT', Math.round(w * 0.504), y(floor + 22), YELLOW, { size: 11, phase: 30 });
}

/** The back wall under the floor, with two shelves of bottles. */
export function saltBack(x: CanvasRenderingContext2D, w: number) {
  const y = (h: number) => -h, { floor } = SALT;
  x.fillStyle = '#24140c'; x.fillRect(8, y(floor - 2), w - 16, floor - 30);
  x.strokeStyle = 'rgba(' + O + ',.35)'; x.lineWidth = 1; x.strokeRect(8.5, y(floor - 2) + 0.5, w - 17, floor - 31);
  const bc = ['#5aa83a', '#d8b040', '#c83a2a', '#e8e0d0', '#3a6ad8', '#8a3a8a', '#d86a2a'];
  for (let row = 0; row < 2; row++) {
    const sy = y(36 + row * 13);
    x.fillStyle = 'rgba(' + O + ',.5)'; x.fillRect(12, sy, w - 24, 1);
    for (let k = 0; k < 18; k++) {
      const bx = 16 + k * ((w - 30) / 18), n = hash(k + row * 40);
      if (n < 0.15) continue;
      x.fillStyle = bc[Math.floor(n * bc.length)]; x.fillRect(Math.round(bx), sy - 7, 3, 7); x.fillRect(Math.round(bx) + 1, sy - 9, 1, 2);
      if (n > 0.7) { x.fillStyle = 'rgba(255,240,200,.5)'; x.fillRect(Math.round(bx), sy - 6, 1, 3); }
    }
  }
}

/** LIME, the robot bartender: a slim chrome body on a rail behind the counter, a round face screen, shaking a shaker. Origin: LIME's rail, on the sand. `t` in frames. */
export function saltLime(x: CanvasRenderingContext2D, t: number) {
  const y = (h: number) => -h, c = Math.round(Math.sin(t * 0.01) * 6);
  x.fillStyle = '#5a5e66'; x.fillRect(c - 1, y(33), 3, 16);
  x.fillStyle = '#8e949e'; x.fillRect(c - 8, y(49), 16, 18); x.strokeStyle = 'rgba(220,230,240,.7)'; x.lineWidth = 1; x.strokeRect(c - 7.5, y(49) + 0.5, 15, 17);
  x.fillStyle = '#5aa83a'; x.fillRect(c - 8, y(37), 16, 2); // a lime-green band: its name
  // the face: a round screen, two eyes that blink
  x.fillStyle = '#1a1e24'; x.beginPath(); x.arc(c, y(57), 7, 0, 7); x.fill();
  x.strokeStyle = 'rgba(220,230,240,.7)'; x.beginPath(); x.arc(c, y(57), 7, 0, 7); x.stroke();
  const blink = t % 300 < 8;
  x.fillStyle = 'rgba(160,240,140,.95)'; x.fillRect(c - 4, y(58), 2, blink ? 1 : 2); x.fillRect(c + 2, y(58), 2, blink ? 1 : 2);
  x.fillRect(c - 2, y(54), 4, 1);
  // the shaker arm
  const sh = Math.round(Math.sin(t * 0.4) * 2), shaking = t % 400 < 120;
  x.fillStyle = '#8e949e'; x.fillRect(c + 8, y(45), 6, 2);
  x.fillStyle = '#d8d2c6'; x.fillRect(c + 12, y(shaking ? 51 + sh : 43), 4, 8);
}

/** The counter under the floor, waist high, with a lit rim and its planks. */
export function saltCounter(x: CanvasRenderingContext2D, w: number) {
  const y = (h: number) => -h;
  x.fillStyle = '#3a2414'; x.fillRect(2, y(26), w - 4, 26);
  x.strokeStyle = 'rgba(255,170,80,.75)'; x.lineWidth = 1; x.strokeRect(2.5, y(26) + 0.5, w - 5, 25);
  x.fillStyle = 'rgba(255,190,110,.9)'; x.fillRect(2, y(26), w - 4, 2);
  for (let bx = 10; bx < w - 4; bx += 14) { x.fillStyle = 'rgba(20,10,6,.35)'; x.fillRect(bx, y(24), 1, 24); }
}

/** The bulbs: warm white, pink, cyan, amber (neon on a beach: the city's colours on holiday). */
const BULBS = ['255,214,120', '255,61,242', '0,229,229', '255,150,40'];

/** String lights from the eaves to two poles, swaying, each bulb breathing and throwing a little glow. `still`: no sway, steady. */
export function saltLights(x: CanvasRenderingContext2D, w: number, t: number, still = false) {
  const y = (h: number) => -h, { floor } = SALT;
  const poles = [-40, w + 46];
  for (const px of poles) { x.fillStyle = '#3a2618'; x.fillRect(px - 1, y(86), 3, 86); }
  drawStringLights(x, poles[0], 84, -4, floor + 34, t, { sag: 8, phase: 0, still });
  drawStringLights(x, -4, floor + 34, w + 4, floor + 34, t, { sag: 10, phase: 1, still });
  drawStringLights(x, w + 4, floor + 34, poles[1], 84, t, { sag: 8, phase: 2, still });
}

/**
 * One run of string lights from (ax, ah) to (bx, bh) (heights up), sagging and swaying, a bulb
 * every 14 units. Whoever calls it draws what the ends hang from (ART-GUIDE ง5): a pole, the eaves.
 */
export function drawStringLights(x: CanvasRenderingContext2D, ax: number, ah: number, bx: number, bh: number, t: number, o: { sag?: number; phase?: number; still?: boolean } = {}) {
  const y = (h: number) => -h, sag = o.sag ?? 8, ri = o.phase ?? 0, still = !!o.still, sw = still ? 0 : Math.sin(t * 0.02 + ri) * 1.5;
  x.strokeStyle = 'rgba(40,24,16,.9)'; x.lineWidth = 1; x.beginPath(); x.moveTo(ax, y(ah)); x.quadraticCurveTo((ax + bx) / 2 + sw, y((ah + bh) / 2 - sag * 2), bx, y(bh)); x.stroke();
  const n = Math.max(3, Math.round(Math.abs(bx - ax) / 14));
  for (let k = 1; k < n; k++) {
    const f = k / n, mx = (ax + bx) / 2 + sw, my = y((ah + bh) / 2 - sag * 2);
    const qx = (1 - f) * (1 - f) * ax + 2 * (1 - f) * f * mx + f * f * bx, qy = (1 - f) * (1 - f) * y(ah) + 2 * (1 - f) * f * my + f * f * y(bh);
    const col = BULBS[(k + ri) % 4], on = still ? 1 : 0.5 + 0.5 * Math.sin(t * 0.06 + k * 1.7 + ri);
    x.fillStyle = 'rgba(30,14,10,.9)'; x.fillRect(Math.round(qx) - 1, Math.round(qy), 2, 1);
    x.fillStyle = 'rgba(' + col + ',' + (0.45 + on * 0.55).toFixed(2) + ')'; x.fillRect(Math.round(qx) - 1, Math.round(qy) + 1, 2, 3);
    const gg = x.createRadialGradient(qx, qy + 2, 0, qx, qy + 2, 8);
    gg.addColorStop(0, 'rgba(' + col + ',' + (0.28 * on).toFixed(3) + ')'); gg.addColorStop(1, 'rgba(' + col + ',0)');
    x.fillStyle = gg; x.fillRect(qx - 8, qy - 6, 16, 16);
  }
}
