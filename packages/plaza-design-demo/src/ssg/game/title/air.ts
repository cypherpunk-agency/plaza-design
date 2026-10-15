/**
 * The glide's sky traffic (Tommi, 2026-10-15: "air traffic is only private"). The city's kinds
 * (sets/air-traffic.ts), each where it makes sense, on lanes that read:
 *
 * - private pods on two high lanes, sparse over the beach, busy over the city, never across the Spire;
 * - sky taxis (yellow) on their own lane over the city, one landing on the public pad by the Galleria;
 * - Registry patrols on fixed loops: one over the port's fence (its searchlight on the buffer), one
 *   over Downtown;
 * - the delivery-drone stream out of the logistics hub at the harbor, west to the city;
 * - corporate shuttles between Downtown and the Spire (and docking at its decks, sets/spire.ts);
 * - a slow, low cargo hauler with a box over the harbor;
 * - a medevac crossing fast toward the city at the inlet;
 * - a military dropship and its two escorts going over Downtown, slow and big;
 * - the ad blimp far over the bay.
 *
 * Every craft is at its depth's true scale (`S · p`). A pure function of the frame clock and the
 * glide's clock: the choreographed ones (medevac, hauler, dropship) are placed by `gt`.
 */

import { BLIMP_SCALE, drawBlimp, drawCraft, drawDrone, type CraftKind } from '../sets/air-traffic';
import { placed } from '../sets/view';
import { type CoastView, R, S } from './coast';
import { glideDist, PLACES, SPIRE_P, SPIRE_X } from './path';

const smooth = (a: number, b: number, v: number) => { const f = Math.max(0, Math.min(1, (v - a) / (b - a))); return f * f * (3 - 2 * f); };
const h01 = (n: number) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/** Lanes: kind, depth, height (of the view), direction (1 east), speed (lane units a frame), pitch, seed, where along the coast they are busy. */
const LANES: { kind: CraftKind; p: number; y: number; dir: 1 | -1; v: number; gap: number; seed: number; busy: (X: number) => number; paints?: string[] }[] = [
  { kind: 'pod', p: 0.42, y: 0.12, dir: 1, v: 1.7, gap: 520, seed: 3, busy: (X) => 0.25 + 0.75 * smooth(2900, 3700, X), paints: ['#e8e0d0', '#c8c0b0', '#8a2a2a', '#2a4a6a'] },
  { kind: 'pod', p: 0.5, y: 0.18, dir: -1, v: 1.5, gap: 560, seed: 5, busy: (X) => 0.2 + 0.8 * smooth(2900, 3700, X), paints: ['#e8e0d0', '#3a3a3a', '#6a5a2a'] },
  { kind: 'taxi', p: 0.58, y: 0.25, dir: 1, v: 1.9, gap: 640, seed: 7, busy: (X) => smooth(2800, 3400, X) * 0.8 },
  { kind: 'taxi', p: 0.62, y: 0.29, dir: -1, v: 1.6, gap: 700, seed: 9, busy: (X) => smooth(2800, 3400, X) * 0.7 },
  { kind: 'shuttle', p: 0.32, y: 0.2, dir: 1, v: 2.2, gap: 1300, seed: 13, busy: (X) => (X > SPIRE_X && X < SPIRE_X + 2200 ? 0.8 : 0) },
  { kind: 'shuttle', p: 0.34, y: 0.23, dir: -1, v: 2.0, gap: 1400, seed: 17, busy: (X) => (X > SPIRE_X && X < SPIRE_X + 2200 ? 0.7 : 0) },
];

export function drawAir(x: CanvasRenderingContext2D, c: CoastView, lift: (p: number) => number) {
  const f = c.still ? 0 : c.f, H = c.H, W = c.W;
  const spx = W / 2 + SPIRE_P * (c.g - SPIRE_X);
  const at = (X: number, p: number) => W / 2 + p * (c.g - X);
  const craft = (kind: CraftKind, X: number, p: number, yy: number, face: 1 | -1, o: { paint?: string; beam?: boolean; t?: number } = {}) => {
    const s = at(X, p), sc = S * p;
    if (s < -120 || s > W + 120) return;
    placed(x, R(s), R(yy + lift(p)), sc, () => drawCraft(x, kind, { t: o.t ?? c.f, face, still: c.still, paint: o.paint, scale: sc, beam: o.beam }));
  };
  // the blimp, far over the bay, drifting east, its ads changing
  { const X = 500 - f * 0.05, p = 0.09; const s = at(X, p); if (s > -80 && s < W + 80) placed(x, R(s), R(H * 0.09 + lift(p)), S * p * BLIMP_SCALE, () => drawBlimp(x, { t: f, still: c.still })); }
  // the lanes
  for (const ln of LANES) {
    const off = -ln.dir * f * ln.v, Xe = c.g - (W / 2 + 160) / ln.p, Xw = c.g + (W / 2 + 160) / ln.p;
    for (let k = Math.floor((Xe - off) / ln.gap); k <= Math.ceil((Xw - off) / ln.gap); k++) {
      const X = k * ln.gap + off;
      if (h01(k * 31 + ln.seed) > ln.busy(X)) continue;
      // the Spire's air stays clear of everyone else's lanes
      if (ln.kind !== 'shuttle' && Math.abs(at(X, ln.p) - spx) < 90 && c.g > SPIRE_X - 900 && c.g < SPIRE_X + 1400) continue;
      const bob = c.still ? 0 : Math.sin(f * 0.03 + k) * 1.2;
      craft(ln.kind, X, ln.p, H * ln.y + ((k * 37) % 5) - 2 + bob, ln.dir, { paint: ln.paints?.[Math.abs(k) % ln.paints.length], t: c.f + k * 13 });
    }
  }
  // the Registry's patrols on their fixed loops: over the port's fence (searchlight on), over Downtown
  for (const [cx, p, cy, rx, ry, period, beam] of [[1080, 0.55, 0.33, 150, 8, 1300, true]] as const) {
    const a = (f / period) * Math.PI * 2, X = cx + Math.cos(a) * rx, face = (Math.sin(a) > 0 ? 1 : -1) as 1 | -1;
    craft('patrol', X, p, H * cy + Math.sin(a) * ry, face, { beam: beam && Math.abs(X - 1080) < 120 });
  }
  // the delivery drones streaming out of the logistics hub, up to their height and west to the city
  { const p = 0.92, gap = 96, v = 1.3, off = f * v;
    for (let k = Math.floor((c.g - 600 - off) / gap); k <= Math.ceil((c.g + 600 - off) / gap); k++) {
      const X = k * gap + off, d = X - PLACES.hub;
      if (d < 0 || X > 2300) continue;
      const s = at(X, p); if (s < -20 || s > W + 20) continue;
      const climb = smooth(0, 160, d), fade = Math.min(1, (2300 - X) / 160), yy = lerp(c.GY - 52, H * (0.34 + 0.06 * h01(k * 5)), climb) + Math.sin(k) * 2;
      x.save(); x.globalAlpha = fade; placed(x, R(s), R(yy + lift(p)), S * p, () => drawDrone(x, { t: c.f + k * 7, still: c.still, cargo: true })); x.restore();
    }
  }
  // a cargo hauler, slow and low, a box under it, back from the city over the buffer into the port (gone before the cranes)
  if (c.gt > 12 && c.gt < 26) { const X = glideDist(17) - 80 - 25 * (c.gt - 17); craft('hauler', X, 0.7, H * 0.2, 1, {}); }
  // the medevac, fast toward the city at the inlet, strobing
  if (c.gt > 6 && c.gt < 14) { const X = glideDist(8) - (W / 2 + 60) / 0.6 + 260 * (c.gt - 8); craft('medevac', X, 0.6, H * 0.22, -1); }
}

/**
 * Downtown's sky, down in the street's canyon (drawn in front of the street's towers, behind the
 * Ring): the street's towers hide everything further off, so what flies here flies low between them:
 * the Registry's patrol on its loop over the street and a sky taxi lane (`canyon`, behind the Ring),
 * and the dropship with its two escorts going over, slow and big, nearer than the Ring (`over`).
 */
export function drawAirNear(x: CanvasRenderingContext2D, c: CoastView, lift: (p: number) => number, pass: 'canyon' | 'over') {
  const f = c.still ? 0 : c.f, H = c.H, W = c.W, at = (X: number, p: number) => W / 2 + p * (c.g - X);
  if (c.g < PLACES.street - 300) return;
  const craft = (kind: CraftKind, X: number, p: number, yy: number, face: 1 | -1, o: { beam?: boolean; t?: number } = {}) => {
    const s = at(X, p), sc = S * p;
    if (s < -160 || s > W + 160) return;
    placed(x, R(s), R(yy + lift(p)), sc, () => drawCraft(x, kind, { t: o.t ?? c.f, face, still: c.still, scale: sc, beam: o.beam }));
  };
  if (pass === 'over') {
    // the dropship and its escorts, slow and big, going east (to the exclusion zone beyond the Fringe)
    if (c.gt > 52 && c.gt < 70) {
      const p = 0.5, X = glideDist(55) + (W / 2 + 200) / p - 40 * (c.gt - 55);
      craft('escort', X + 340, p * 1.02, H * 0.15, 1);
      craft('dropship', X, p, H * 0.09, 1);
      craft('escort', X - 260, p * 0.98, H * 0.04, 1);
    }
    return;
  }
  // the patrol's loop over the street, its searchlight on the pavement now and then
  { const a = (f / 1500) * Math.PI * 2, X = 3700 + Math.cos(a) * 300, face = (Math.sin(a) > 0 ? 1 : -1) as 1 | -1;
    craft('patrol', X, 0.62, H * 0.13 + Math.sin(a) * 6, face, { beam: Math.cos(a * 3) > 0.6 }); }
  // a taxi lane low over the street, westbound
  { const gap = 900, v = 1.7, off = f * v;
    for (let k = Math.floor((c.g - 900 - off) / gap); k <= Math.ceil((c.g + 900 - off) / gap); k++) { const X = k * gap + off; if (X < PLACES.street || h01(k * 13) > 0.6) continue; craft('taxi', X, 0.7, H * 0.07, -1, { t: c.f + k * 9 }); } }
}

const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
