/**
 * Set piece (ART-GUIDE §12): SALT, the beach bar. A shack on stilts with lit windows, a ragged
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

/** String lights from the eaves to two poles, swaying. `still`: no sway, no blinking. */
export function saltLights(x: CanvasRenderingContext2D, w: number, t: number, still = false) {
  const y = (h: number) => -h, { floor } = SALT;
  const poles = [-40, w + 46];
  for (const px of poles) { x.fillStyle = '#3a2618'; x.fillRect(px - 1, y(86), 3, 86); }
  const runs: [number, number, number, number][] = [[poles[0], 84, -4, floor + 34], [-4, floor + 34, w + 4, floor + 34], [w + 4, floor + 34, poles[1], 84]];
  runs.forEach(([ax, ah, bx, bh], ri) => {
    const sag = ri === 1 ? 10 : 8, sw = still ? 0 : Math.sin(t * 0.02 + ri) * 1.5;
    x.strokeStyle = 'rgba(40,24,16,.9)'; x.beginPath(); x.moveTo(ax, y(ah)); x.quadraticCurveTo((ax + bx) / 2 + sw, y((ah + bh) / 2 - sag * 2), bx, y(bh)); x.stroke();
    const n = Math.max(3, Math.round(Math.abs(bx - ax) / 14));
    for (let k = 1; k < n; k++) {
      const f = k / n, mx = (ax + bx) / 2 + sw, my = y((ah + bh) / 2 - sag * 2);
      const qx = (1 - f) * (1 - f) * ax + 2 * (1 - f) * f * mx + f * f * bx, qy = (1 - f) * (1 - f) * y(ah) + 2 * (1 - f) * f * my + f * f * y(bh);
      const col = ['255,200,110', '255,120,90', '255,230,160', '140,220,120'][(k + ri) % 4], on = still || (Math.floor(t / 25) + k) % 9 !== 0;
      x.fillStyle = 'rgba(' + col + ',' + (on ? 0.95 : 0.3) + ')'; x.fillRect(Math.round(qx) - 1, Math.round(qy) + 1, 2, 3);
      if (on) { x.fillStyle = 'rgba(' + col + ',.12)'; x.fillRect(Math.round(qx) - 4, Math.round(qy) - 2, 8, 8); }
    }
  });
}
