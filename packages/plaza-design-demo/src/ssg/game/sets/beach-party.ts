/**
 * Set pieces (ART-GUIDE §12): a night on the beach. A sun lounger under its parasol (the beach's
 * rentals), a bonfire (logs, flames that never hold still, sparks rising, its warm light on the
 * sand), and the DJ booth (a deck on trestles with its lights, a speaker stack thumping on the beat,
 * the DJ bot nodding along behind it with its headphones on). Register: sets/index.ts
 * (`beach-party`).
 *
 * Drawn in its own frame, in the scenes' units (the player is about 48 tall): origin on the sand
 * at the thing's middle, heights up (y = -h). `t` is the animation clock in frames; `still` holds it.
 */

import { O } from '../scenes/kit';

const y = (h: number) => -h;
const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
const mix = (a: number[], b: number[], f: number) => 'rgba(' + Math.round(lerp(a[0], b[0], f)) + ',' + Math.round(lerp(a[1], b[1], f)) + ',' + Math.round(lerp(a[2], b[2], f)) + ',1)';
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/**
 * A sun lounger and its parasol (the canopy tilted toward the sun). `col`: the canopy's colour;
 * `p`: 0 (low gold sun) .. 1 (dusk) for the bed's paint; `parasol: false` for the bed alone.
 */
export function drawLounger(x: CanvasRenderingContext2D, o: { col: string; p?: number; parasol?: boolean; flip?: boolean }) {
  const p = o.p ?? 0;
  x.save(); if (o.flip) x.scale(-1, 1);
  if (o.parasol !== false) {
    x.fillStyle = '#4a3a2a'; x.fillRect(-12, y(52), 1, 52);
    x.fillStyle = o.col; x.beginPath(); x.moveTo(-32, y(46)); x.quadraticCurveTo(-12, y(60), 8, y(46)); x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,255,255,.2)'; x.fillRect(-30, y(46), 38, 1);
    // the scalloped edge
    x.fillStyle = o.col; for (let k = -30; k < 8; k += 6) x.fillRect(k, y(46), 4, 2);
  }
  // the bed: frame and slats, the backrest up
  x.fillStyle = '#5a4030'; x.fillRect(-14, y(8), 2, 8); x.fillRect(12, y(8), 2, 8);
  const bed = mix([200, 190, 170], [140, 120, 110], p);
  x.fillStyle = bed; x.fillRect(-16, y(10), 32, 3);
  x.strokeStyle = 'rgba(' + O + ',.5)'; x.lineWidth = 1; x.strokeRect(-15.5, y(10) + 0.5, 31, 2);
  x.fillStyle = bed; x.fillRect(10, y(18), 4, 8);
  x.restore();
}

/** A bonfire: its light on the sand and on whoever sits round it, logs, flames, sparks going up. */
export function drawBonfire(x: CanvasRenderingContext2D, o: { t: number; still?: boolean; size?: number }) {
  const s = o.size ?? 1, t = o.still ? 0 : o.t;
  const g = x.createRadialGradient(0, y(10 * s), 2, 0, y(10 * s), 100 * s);
  g.addColorStop(0, 'rgba(255,150,60,.34)'); g.addColorStop(1, 'rgba(255,90,40,0)');
  x.fillStyle = g; x.fillRect(-100 * s, y(110 * s), 200 * s, 130 * s);
  // stones round it, the logs crossed
  for (let k = -3; k <= 3; k++) { x.fillStyle = k % 2 ? '#3a2a2a' : '#4a3634'; x.fillRect(Math.round(k * 6 * s) - 3, y(4), 6, 4); }
  x.strokeStyle = '#2a1408'; x.lineWidth = 4 * s; x.beginPath(); x.moveTo(-16 * s, y(2)); x.lineTo(12 * s, y(10 * s)); x.moveTo(16 * s, y(2)); x.lineTo(-12 * s, y(10 * s)); x.stroke();
  x.fillStyle = 'rgba(255,120,40,.8)'; x.fillRect(-8 * s, y(5), 16 * s, 2);
  // the flames: columns that jump, yellow at the core
  const n = 13, step = Math.floor(t / 3);
  for (let i = 0; i < n; i++) {
    const k = hash(i + step * 13), d = Math.abs(i - (n - 1) / 2) / ((n - 1) / 2), h = (10 + k * 22) * (1 - d * 0.6) * s;
    x.fillStyle = k > 0.62 && d < 0.6 ? '#ffe36a' : k > 0.3 ? '#ff8800' : '#ff4a2a';
    x.fillRect(Math.round((i - n / 2) * 2 * s), Math.round(y(6 + h)), Math.max(2, Math.round(2 * s)), Math.round(h));
  }
  // sparks rising and fading
  for (let i = 0; i < 6; i++) {
    const f = ((t * 0.01 + i / 6) % 1);
    x.fillStyle = 'rgba(255,200,90,' + (1 - f).toFixed(2) + ')';
    x.fillRect(Math.round(Math.sin(f * 6 + i) * 8 * s), Math.round(y(28 * s + f * 70 * s)), 2, 2);
  }
}

/** The DJ booth: speaker stack, the deck on trestles with its lights, the DJ bot behind it. `beat` in frames per beat. */
export function drawDjBooth(x: CanvasRenderingContext2D, o: { t: number; still?: boolean; beat?: number }) {
  const t = o.still ? 0 : o.t, B = o.beat ?? 16, on = Math.floor(t / B) % 2 === 0, k = (t % B) / B;
  // the DJ bot: a box head with a visor, headphones, nodding on the beat; arms on the deck
  const nod = o.still ? 0 : Math.round(Math.max(0, 1 - k * 3) * 2);
  x.fillStyle = '#5a5f66'; x.fillRect(-12, y(40), 22, 16);
  x.fillStyle = '#8b9099'; x.fillRect(-10, y(60) + nod, 18, 18);
  x.fillStyle = 'rgba(220,230,240,.6)'; x.fillRect(-10, y(60) + nod, 18, 1);
  x.fillStyle = '#1a1e24'; x.fillRect(-8, y(55) + nod, 14, 7);
  x.fillStyle = on ? '#ff3df2' : '#ff8800'; x.fillRect(-6, y(52) + nod, 3, 2); x.fillRect(1, y(52) + nod, 3, 2);
  x.fillStyle = '#2a2a30'; x.fillRect(-12, y(62) + nod, 22, 2); x.fillRect(-13, y(57) + nod, 3, 7); x.fillRect(8, y(57) + nod, 3, 7);
  x.fillStyle = '#5a5f66'; x.fillRect(-2, y(66) + nod, 2, 5); x.fillStyle = on ? '#ffd23a' : '#7a6020'; x.fillRect(-3, y(68) + nod, 4, 2);
  x.fillStyle = '#8b9099'; x.fillRect(-16, y(34) - (on ? 1 : 0), 6, 3); x.fillRect(8, y(34) + (on ? 1 : 0), 6, 3);
  // the deck: a table on trestles, two platters, a strip of lights along its front
  x.fillStyle = '#2a1a20'; x.fillRect(-26, y(30), 52, 6);
  x.fillStyle = '#1a0e14'; x.fillRect(-22, y(24), 3, 24); x.fillRect(19, y(24), 3, 24); x.fillRect(-22, y(14), 44, 2);
  x.fillStyle = '#12080c'; x.fillRect(-20, y(33), 12, 3); x.fillRect(8, y(33), 12, 3);
  x.fillStyle = 'rgba(255,217,165,.5)'; x.fillRect(-15, y(33), 2, 1); x.fillRect(13, y(33), 2, 1);
  for (let i = 0; i < 8; i++) { const lit = o.still || (Math.floor(t / 4) + i) % 4 !== 0; x.fillStyle = ['#ff3df2', '#00e5e5', '#ffd23a', '#ff8800'][i % 4]; x.globalAlpha = lit ? 0.95 : 0.3; x.fillRect(-24 + i * 6, y(26), 4, 1); }
  x.globalAlpha = 1;
  // the speaker stack: two cabinets, cones that thump on the beat, its light on the sand
  const sx = 34;
  for (const [h, w, r] of [[0, 22, 8], [26, 18, 6]] as [number, number, number][]) {
    x.fillStyle = '#16100e'; x.fillRect(sx - w / 2, y(h + 26), w, 26);
    x.strokeStyle = 'rgba(' + O + ',.35)'; x.lineWidth = 1; x.strokeRect(sx - w / 2 + 0.5, y(h + 26) + 0.5, w - 1, 25);
    const thump = on && !o.still ? 1 : 0;
    x.fillStyle = '#3a3036'; x.beginPath(); x.arc(sx, y(h + 13), r + thump, 0, 7); x.fill();
    x.fillStyle = on ? '#ff3df2' : '#6a1a60'; x.beginPath(); x.arc(sx, y(h + 13), 2, 0, 7); x.fill();
  }
  if (on && !o.still) { const g = x.createRadialGradient(sx, y(20), 2, sx, y(20), 40); g.addColorStop(0, 'rgba(255,61,242,.16)'); g.addColorStop(1, 'rgba(255,61,242,0)'); x.fillStyle = g; x.fillRect(sx - 40, y(60), 80, 64); }
}
