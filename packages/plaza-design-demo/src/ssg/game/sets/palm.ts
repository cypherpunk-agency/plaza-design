/**
 * Set piece (ART-GUIDE §12): a palm, as a silhouette against the sky. A ringed trunk that tapers as
 * it curves up to its lean, a crown of nine fronds that droop outward with leaflets hanging off
 * each spine, a few coconuts, all swaying a little; a rim of light down the side the sun is on.
 * Seeded, so a row of palms is never a row of twins: vary `h` and `lean` too. Register:
 * sets/index.ts (`palm`).
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
  const fill = o.fill ?? '#0b0410', h = o.h, side = o.side ?? 1, t = o.still ? 0 : o.t;
  // the whole palm leans a touch further and back in the wind
  const sway = Math.sin(t * 0.02 + o.seed) * h * 0.012, lean = o.lean + sway;
  const k = h / 110; // the draft's palm was 110 tall: widths and steps scale from it
  const w0 = Math.max(3, 4.6 * k), w1 = Math.max(2, 2.2 * k);
  const at = (f: number): [number, number] => [lean * f * f + Math.sin(f * 3) * o.lean * 0.08, -h * f];
  // the trunk: short bands up a curve, tapering, with a ring every few
  const N = Math.max(12, Math.round(h / (1.6 * Math.max(1, k * 0.8))));
  const step = h / N + 0.6;
  for (let i = 0; i <= N; i++) {
    const f = i / N, [px, py] = at(f), w = w0 + (w1 - w0) * f;
    x.fillStyle = fill; x.fillRect(Math.round(px - w / 2), Math.round(py - step), Math.max(1, Math.round(w)), Math.ceil(step) + 1);
  }
  for (let i = 1; i < N; i += 3) {
    const f = i / N, [px, py] = at(f), w = w0 + (w1 - w0) * f;
    // the ring: a lighter notch, and the rim on the sun's side
    x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(Math.round(px - w / 2), Math.round(py), Math.max(1, Math.round(w)), 1);
    if (o.rim) { x.fillStyle = 'rgba(' + o.rim + ',.55)'; x.fillRect(Math.round(px + (side > 0 ? w / 2 - 1 : -w / 2)), Math.round(py - 1), 1, 2); }
  }
  if (o.rim) {
    x.fillStyle = 'rgba(' + o.rim + ',.22)';
    for (let i = 0; i < N; i++) { const f = i / N, [px, py] = at(f), w = w0 + (w1 - w0) * f; if (i % 3 !== 1) x.fillRect(Math.round(px + (side > 0 ? w / 2 - 1 : -w / 2)), Math.round(py - step), 1, Math.ceil(step)); }
  }
  // the crown: nine fronds, each a spine that droops outward and down, leaflets hanging off it
  const [tx, ty] = at(1), sl = 1.5 * k, lw = Math.max(1, 1.6 * k);
  const fronds = 9;
  for (let j = 0; j < fronds; j++) {
    const a0 = -Math.PI + (j / (fronds - 1)) * Math.PI + (rnd(o.seed + j) - 0.5) * 0.3;
    const L = h * (0.36 + rnd(o.seed * 3 + j) * 0.16), steps = Math.max(6, Math.round(L / sl));
    let px = tx, py = ty, ang = a0 + Math.sin(t * 0.03 + j + o.seed) * 0.06;
    const right = Math.cos(ang) > 0;
    for (let s = 0; s < steps; s++) {
      const f = s / steps;
      ang += (Math.cos(ang) > 0 ? 0.035 : -0.035) * (0.6 + f);
      const nx = px + Math.cos(ang) * sl, ny = py + Math.sin(ang) * sl + f * 0.9 * k;
      x.strokeStyle = fill; x.lineWidth = Math.max(0.8, lw * (1 - f * 0.6)); x.beginPath(); x.moveTo(px, py); x.lineTo(nx, ny); x.stroke();
      if (s % 2 === 0 && f > 0.08) {
        // a leaflet: hangs down from the spine, shorter toward the tip, fluttering a little
        const ll = ((1 - f) * 5 + 1.5) * k, la = ang + (Math.cos(ang) > 0 ? 1.2 : -1.2) + (o.still ? 0 : Math.sin(t * 0.08 + s + j) * 0.12);
        x.lineWidth = Math.max(0.7, 0.9 * k * 0.8); x.beginPath(); x.moveTo(nx, ny); x.lineTo(nx + Math.cos(la) * ll, ny + Math.abs(Math.sin(la)) * ll + k); x.stroke();
      }
      // the light on the top of the fronds facing the sun
      if (o.rim && (right ? 1 : -1) * side > 0 && s % 3 === 1 && f < 0.7) { x.fillStyle = 'rgba(' + o.rim + ',.3)'; x.fillRect(Math.round(nx), Math.round(ny - 1), 1, 1); }
      px = nx; py = ny;
    }
  }
  // the crown's heart and the coconuts under it
  x.fillStyle = fill; x.beginPath(); x.arc(tx, ty, 2.6 * k, 0, 7); x.fill();
  x.fillStyle = '#2a1408';
  for (const [dx, dy] of [[-2, 1], [1, 2], [-0.5, 3]]) { x.beginPath(); x.arc(tx + dx * k, ty + dy * k + 1, Math.max(1, 1.2 * k), 0, 7); x.fill(); }
}
