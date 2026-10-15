/**
 * Set piece (ART-GUIDE §12): a palm, as a silhouette against the sky. A curved, tapering trunk
 * with rings, a crown of drooping fronds that sway a little, a rim of light on the side the sun
 * is on. Seeded, so a row of palms is never a row of twins. Register: sets/index.ts (`palm`).
 *
 * Drawn in its own frame: origin at the foot of the trunk, heights up (y = -h).
 */

export interface PalmLook {
  /** Trunk height and how far its top leans (x, + right). */
  h: number;
  lean: number;
  seed: number;
  /** Animation clock (frames); `still` holds the fronds. */
  t: number;
  still?: boolean;
  fill?: string;
  /** The rim of light (an rgb triple) and the side it falls on (+1: right). */
  rim?: string;
  side?: number;
}

const rnd = (n: number) => { const s = Math.sin(n * 91.7 + 13.1) * 43758.5453; return s - Math.floor(s); };

export function drawPalm(x: CanvasRenderingContext2D, o: PalmLook) {
  const fill = o.fill ?? '#0b0410', h = o.h, lean = o.lean, side = o.side ?? 1;
  const sway = o.still ? 0 : Math.sin(o.t * 0.012 + o.seed) * 0.05;
  const tx = lean, ty = -h, cx = lean * 0.15 - side * h * 0.06, cy = -h * 0.55;
  const w0 = Math.max(3, h * 0.055), w1 = Math.max(2, h * 0.03);
  // the trunk: a tapering band along a curve
  x.fillStyle = fill;
  x.beginPath();
  x.moveTo(-w0, 0); x.quadraticCurveTo(cx - w0 * 0.8, cy, tx - w1, ty);
  x.lineTo(tx + w1, ty); x.quadraticCurveTo(cx + w0 * 0.8, cy, w0, 0); x.closePath(); x.fill();
  // rings on the trunk, and the light along one side of it
  const at = (f: number) => [(1 - f) * (1 - f) * 0 + 2 * (1 - f) * f * cx + f * f * tx, 2 * (1 - f) * f * cy + f * f * ty];
  if (o.rim) {
    x.strokeStyle = 'rgba(' + o.rim + ',.35)'; x.lineWidth = 1; x.beginPath();
    x.moveTo(side * w0, 0); x.quadraticCurveTo(cx + side * w0 * 0.8, cy, tx + side * w1, ty); x.stroke();
  }
  x.fillStyle = 'rgba(0,0,0,.35)';
  for (let f = 0.08; f < 0.95; f += 0.07) { const [px, py] = at(f), ww = w0 + (w1 - w0) * f; x.fillRect(Math.round(px - ww), Math.round(py), Math.round(ww * 2), 1); }
  // the crown: fronds drooping out from the top, each a curved blade
  const n = 7, len = h * 0.42;
  for (let i = 0; i < n; i++) {
    const r = rnd(o.seed * 10 + i), base = -Math.PI / 2 + (i - (n - 1) / 2) * 0.5 + (r - 0.5) * 0.25;
    const a = base + sway * (1 + i * 0.2), l = len * (0.75 + r * 0.4), droop = 0.9 + r * 0.5;
    const ex = tx + Math.cos(a) * l, ey = ty + Math.sin(a) * l * 0.55 + l * 0.35 * droop * Math.abs(Math.cos(a));
    const mx = tx + Math.cos(a) * l * 0.55, my = ty + Math.sin(a) * l * 0.6 - l * 0.12;
    const thick = Math.max(2, l * 0.11);
    x.fillStyle = fill;
    x.beginPath(); x.moveTo(tx, ty); x.quadraticCurveTo(mx, my - thick, ex, ey); x.quadraticCurveTo(mx, my + thick * 0.4, tx, ty + 2); x.fill();
    // leaflets: short strokes hanging off the blade
    x.strokeStyle = fill; x.lineWidth = 1; x.beginPath();
    for (let f = 0.25; f < 0.95; f += 0.12) {
      const qx = (1 - f) * (1 - f) * tx + 2 * (1 - f) * f * mx + f * f * ex, qy = (1 - f) * (1 - f) * ty + 2 * (1 - f) * f * my + f * f * ey;
      x.moveTo(qx, qy); x.lineTo(qx + Math.cos(a) * thick * 0.6, qy + thick * 1.4);
    }
    x.stroke();
    if (o.rim && Math.cos(a) * side > 0.2) { x.strokeStyle = 'rgba(' + o.rim + ',.3)'; x.beginPath(); x.moveTo(tx, ty); x.quadraticCurveTo(mx, my - thick, ex, ey); x.stroke(); }
  }
  // coconuts
  x.fillStyle = fill; for (const d of [-3, 2, 5]) { x.beginPath(); x.arc(tx + d, ty + 4, Math.max(1.5, h * 0.018), 0, 7); x.fill(); }
}
