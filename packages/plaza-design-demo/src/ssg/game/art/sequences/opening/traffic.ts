/**
 * The glide's road traffic (Tommi, 2026-10-15: where do the cars come from and go?). One road, from
 * the port's truck gate west into Downtown; nothing drives on the pier, the beach or the quay.
 *
 * Each lane is a conveyor of slots moving at the lane's speed, a slot one truck long and a gap, so
 * vehicles never overlap. Every slot's vehicle has a seeded origin (westbound, the near lane) or
 * destination (eastbound, the far lane): the truck gate, or one of Downtown's side streets. A vehicle
 * shows only past its origin (turning in out of its side street, or rolling out under the gate's
 * barrier) and until its destination (turning off). So the road starts slim at the gate, a truck now
 * and then, and fills toward the city as the side streets add their cars. Facing is the lane's
 * direction (`face = dir`). A pure function of the frame clock.
 */

import { drawCar, drawTruck, type CarKind } from "../../vehicles/vehicles";
import { BOX40, type Crate } from "../../props/containers";
import { placed } from "../../core/view";
import { type CoastView, type Lines, R, S } from "./coast";
import { PLACES } from "./path";
import { laneSlots } from "../../vehicles/kit";

/** Downtown's side streets (X): where cars come from and go to (town.ts draws their mouths). */
export const SIDE_STREETS = [3420, 3720, 4130, 4480, 4800];

/** A lane: its direction (1 drives east, toward the port; -1 west, into the city), speed (view units a frame), the slot pitch. */
const LANES = [
  { lane: 'near' as const, dir: -1 as const, v: 1.25, gap: 176, seed: 11 },
  { lane: 'far' as const, dir: 1 as const, v: 1.05, gap: 176, seed: 29 },
];
/** Where a slot's vehicle comes from (westbound) or goes (eastbound), and how likely: the gate takes trucks, the side streets cars. */
const ENDS: [number, number][] = [[PLACES.road, 0.2], [SIDE_STREETS[0], 0.12], [SIDE_STREETS[1], 0.14], [SIDE_STREETS[2], 0.14], [SIDE_STREETS[3], 0.14], [SIDE_STREETS[4], 0.14]];
const PAINTS = ['#8a2a2a', '#2a4a6a', '#c8c0b0', '#3a3a3a', '#6a5a2a', '#e8e0d0', '#4a2a4a'];
const LOADS: Crate[] = [{ ...BOX40, p: 2, seed: 71 }, { ...BOX40, p: 5, seed: 72 }, { ...BOX40, p: 0, seed: 73 }, { ...BOX40, p: 6, seed: 74 }];
const h01 = (n: number) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/** Which end a slot's vehicle has (its X), or null: the slot is empty. */
function endOf(k: number, seed: number) {
  let v = h01(k * 7 + seed);
  for (const [X, p] of ENDS) { if (v < p) return X; v -= p; }
  return null;
}

export function drawTraffic(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  const f = c.still ? 0 : c.f, lit = c.city > 0.2 || c.warm < 0.6, turn = 34;
  for (const ln of LANES) {
    const ly = ln.lane === 'far' ? L.FAR_LANE : L.NEAR_LANE, off = f * ln.v * -ln.dir;
    // the slots on screen: X from the view's east edge to its west edge
    const Xe = c.g - c.W / 2 - 200, Xw = c.g + c.W / 2 + 200;
    for (const { k, x: X } of laneSlots(Xe, Xw, off, ln.gap)) {
      const end = endOf(k, ln.seed);
      if (end === null || X < end) continue;
      const gate = end === PLACES.road, kind = gate ? 'truck' : (['sedan', 'hatch', 'cab', 'van', 'sedan', 'bus', 'hatch', 'cab'] as const)[Math.floor(h01(k + ln.seed * 3) * 8)];
      // turning in from (or off into) a side street, rolling out under (or in through) the gate: fade and slide
      const into = Math.min(1, (X - end) / turn), sx = c.sx(X);
      if (sx < -200 || sx > c.W + 200) continue;
      const y = gate ? ly : R(ly - (1 - into) * (ly - L.BACK - 4));
      x.save(); x.globalAlpha = gate ? Math.min(1, into * 1.5) : into;
      placed(x, R(sx), y, S, () => {
        if (kind === 'truck') drawTruck(x, { t: c.f, paint: ['#c8c0b0', '#8a2a2a', '#3a5a3a', '#2a3a5a'][k & 3], box: h01(k * 3 + 1) < 0.75 ? LOADS[k & 3] : null, face: ln.dir, lights: lit, still: c.still });
        else drawCar(x, { t: c.f, paint: kind === 'cab' ? '#d8b040' : kind === 'bus' ? '#3a5a6a' : PAINTS[k % PAINTS.length], kind: kind as CarKind, face: ln.dir, lights: lit, still: c.still, route: '7' });
      });
      x.restore();
    }
  }
}
