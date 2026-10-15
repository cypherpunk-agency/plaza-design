/**
 * Set piece (ART-GUIDE §12): Downtown's towers seen from outside and above the street: tall
 * slabs with seeded lit windows, rooftop clutter (masts with red lights, water tanks, AC boxes),
 * and the odd sign on a bracket or a plate. Downtown's own street scene draws its walls from
 * close up; this is the district as a skyline, for the opening glide and anything else that
 * sees Downtown from a distance. Register: sets/index.ts (`downtown-towers`).
 *
 * Drawn in its own frame: origin at a tower's foot, left edge, heights up (y = -h).
 */

import { O, RED, rng } from '../scenes/kit';
import { windowLit } from '../light';

export interface Tower {
  w: number;
  h: number;
  seed: number;
  /** On the roof: a mast with a red light, a water tank, nothing. */
  roof: 'mast' | 'tank' | 'boxes' | 'none';
  /** A sign on the facade: its text, its colour (rgb), its height on the facade. */
  sign?: { text: string; col: string; h: number };
}

export interface TowerLook {
  /** Animation clock (frames): the mast light blinks, a few windows change. `still` holds them. */
  t: number;
  still?: boolean;
  fill: string;
  /** Outline alpha (rust) and how many windows are lit (0..1) and how bright. */
  edge: number;
  lit: number;
  glow: number;
  /** Extra height drawn below the foot (screen units in this frame), so a tower never ends in mid-air. */
  below?: number;
  /** The lit windows follow the city clock (light.ts windowLit: on at dusk, off after midnight). Off: as seeded (the glide). */
  clock?: boolean;
}

/** A row of towers for a stretch of skyline: widths and heights in ranges, signs from `signs` now and then. */
export function towerRow(seed: number, n: number, w: [number, number], h: [number, number], signs: { text: string; col: string }[] = []): (Tower & { x: number })[] {
  const r = rng(seed), out: (Tower & { x: number })[] = [];
  let x = 0, si = 0;
  for (let i = 0; i < n; i++) {
    const tw = Math.round(w[0] + r() * (w[1] - w[0])), th = Math.round(h[0] + r() * (h[1] - h[0]));
    const roof = (['mast', 'tank', 'boxes', 'none'] as const)[Math.floor(r() * 4)];
    const t: Tower & { x: number } = { x, w: tw, h: th, seed: seed * 100 + i, roof };
    if (signs.length && r() < 0.45 && si < signs.length) { const s = signs[si++]; t.sign = { ...s, h: Math.round(th * (0.5 + r() * 0.35)) }; }
    out.push(t);
    x += tw + Math.round(4 + r() * 18);
  }
  return out;
}

export function drawTower(x: CanvasRenderingContext2D, b: Tower, o: TowerLook) {
  const y = (h: number) => -h, below = o.below ?? 0, r = rng(b.seed);
  x.fillStyle = o.fill; x.fillRect(0, y(b.h), b.w, b.h + below);
  x.strokeStyle = 'rgba(194,65,12,' + o.edge + ')'; x.lineWidth = 1; x.strokeRect(0.5, y(b.h) + 0.5, b.w - 1, b.h + below);
  // a rim of the dawn along the top
  x.fillStyle = 'rgba(255,150,90,' + o.edge * 0.8 + ')'; x.fillRect(1, y(b.h) + 1, b.w - 2, 1);
  // windows: a grid, some lit; a few blink on and off over time
  const tick = o.still ? 0 : Math.floor(o.t / 90);
  for (let wy = 8; wy < b.h - 4 + below; wy += 9) for (let wx = 5; wx < b.w - 6; wx += 7) {
    const v = r();
    const on = o.clock ? v < o.lit * 1.6 && windowLit(b.seed * 1009 + wx * 31 + wy) : v < o.lit || (v < o.lit + 0.03 && (tick + wx + wy) % 5 === 0);
    if (!on) continue;
    x.fillStyle = 'rgba(255,' + (v < o.lit * 0.3 ? '217,165' : '170,90') + ',' + o.glow * (0.55 + v) + ')';
    x.fillRect(wx, y(b.h) + wy, 3, 4);
  }
  // the roof
  if (b.roof === 'mast') {
    x.fillStyle = o.fill; x.fillRect(Math.round(b.w * 0.6), y(b.h + 26), 2, 26);
    const on = o.still || Math.sin(o.t * 0.05 + b.seed) > 0;
    x.fillStyle = 'rgba(' + RED + ',' + (on ? 0.9 : 0.2) + ')'; x.fillRect(Math.round(b.w * 0.6) - 1, y(b.h + 28), 4, 3);
  } else if (b.roof === 'tank') {
    const tx = Math.round(b.w * 0.25);
    x.fillStyle = o.fill; x.fillRect(tx, y(b.h + 12), 14, 10); x.fillRect(tx + 2, y(b.h + 2), 2, 2); x.fillRect(tx + 10, y(b.h + 2), 2, 2);
    x.beginPath(); x.moveTo(tx - 1, y(b.h + 12)); x.lineTo(tx + 7, y(b.h + 17)); x.lineTo(tx + 15, y(b.h + 12)); x.fill();
  } else if (b.roof === 'boxes') {
    x.fillStyle = o.fill; x.fillRect(4, y(b.h + 6), 10, 6); x.fillRect(b.w - 16, y(b.h + 8), 12, 8);
  }
  // a sign, on a plate on the facade, its light on the wall around it (ART-GUIDE §5: nothing floats)
  if (b.sign) {
    const s = b.sign, size = 7, pw = Math.min(b.w - 6, Math.round(s.text.length * size * 0.62 + 10)), cx = Math.round(b.w / 2), cy = y(s.h);
    const g = x.createRadialGradient(cx, cy, 2, cx, cy, pw * 0.8);
    g.addColorStop(0, 'rgba(' + s.col + ',.16)'); g.addColorStop(1, 'rgba(' + s.col + ',0)');
    x.fillStyle = g; x.fillRect(cx - pw, cy - pw * 0.6, pw * 2, pw * 1.2);
    x.fillStyle = '#0a0506'; x.fillRect(cx - pw / 2, cy - 7, pw, 13);
    x.strokeStyle = 'rgba(' + s.col + ',.5)'; x.strokeRect(cx - pw / 2 + 0.5, cy - 6.5, pw - 1, 12);
    x.fillStyle = 'rgba(' + O + ',.3)'; x.fillRect(cx - pw / 2 + 3, cy + 6, 1, 4); x.fillRect(cx + pw / 2 - 4, cy + 6, 1, 4);
    x.save(); x.font = '600 ' + size + 'px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.shadowColor = 'rgba(' + s.col + ',.8)'; x.shadowBlur = o.still ? 0 : 5; x.fillStyle = 'rgba(' + s.col + ',.95)';
    x.fillText(s.text, cx, cy + 0.5, pw - 6); x.restore();
  }
}
