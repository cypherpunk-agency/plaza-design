/**
 * Set piece (ART-GUIDE §12): THE RING, the elevated highway round the city (CITY.md: "the Ring
 * highway and its trucks"; Downtown's street lives in its shadow). A concrete box girder on single
 * columns with cap beams, a barrier and a steel railing along its edge (the traffic shows through
 * it), sodium lamps on posts, light strips under the deck, the joints between spans, and a sign
 * gantry now and then (RING · EXIT 4 · DOWNTOWN). Its traffic is two streams, one each way, a pure
 * function of the clock (`ringTraffic`).
 *
 * TRUE TO THE PLAYER'S SCALE (vehicles.ts `M`): the deck's underside 10.7 m up (`RING.under`), the road
 * on it at 12.5 m, spans of 34 m. Drawn in its own frame: x along the road in scene units (the caller
 * passes the stretch it sees, `a`..`b`, so columns and lamps stay put in the world), heights up from
 * the ground (y = -h). Register: sets/index.ts (`ring-highway`).
 */

import { text } from '../core/primitives';
import { drawCar, drawTruck, type CarKind } from "../vehicles/vehicles";
import { laneSlots } from "../vehicles/kit";
import type { Crate } from "../props/containers";

/** Heights (scene units): the deck's underside, its road surface, the barrier's and the railing's tops; the span between columns. */
export const RING = { under: 285, road: 334, barrier: 352, rail: 376, span: 900, lamp: 450, col: 54 };

export interface RingLook {
  t: number;
  still?: boolean;
  /** The concrete's fill. */
  fill?: string;
  /** Lamps on (dawn: still on). */
  lamps?: boolean;
  /** Sign gantries at these frame x. */
  gantries?: number[];
}

/** The deck from frame x `a` to `b` (a < b), columns down to the ground at every span. */
export function drawRing(x: CanvasRenderingContext2D, a: number, b: number, o: RingLook, traffic?: () => void) {
  const y = (h: number) => -h, fill = o.fill ?? '#1e161c', R = RING;
  // the columns and their cap beams (behind the deck's face)
  for (let k = Math.floor(a / R.span) * R.span; k <= b + R.span; k += R.span) {
    if (k < a - R.col * 2 || k > b + R.col * 2) continue;
    x.fillStyle = fill; x.fillRect(k - R.col / 2, y(R.under), R.col, R.under);
    x.fillStyle = 'rgba(255,150,90,.12)'; x.fillRect(k - R.col / 2, y(R.under), 3, R.under);
    x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(k + R.col / 2 - 8, y(R.under), 8, R.under);
    x.fillStyle = fill; x.beginPath(); x.moveTo(k - R.col / 2, y(R.under - 40)); x.lineTo(k - R.col * 1.6, y(R.under)); x.lineTo(k + R.col * 1.6, y(R.under)); x.lineTo(k + R.col / 2, y(R.under - 40)); x.closePath(); x.fill();
    // a stencilled number, grime at the foot
    text(x, 'R4-' + Math.abs(Math.round(k / R.span)), k, y(R.under - 80), 'rgba(255,217,165,.35)', 14, '600');
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(k - R.col / 2, y(40), R.col, 40);
  }
  // the traffic behind the barrier
  if (traffic) traffic();
  // the girder's face, the joints, the light strip under the deck
  x.fillStyle = fill; x.fillRect(a, y(R.barrier), b - a, R.barrier - R.under);
  x.fillStyle = 'rgba(255,150,90,.22)'; x.fillRect(a, y(R.barrier), b - a, 2);
  x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(a, y(R.road - 4), b - a, 3);
  for (let k = Math.floor(a / R.span) * R.span + R.span / 2; k < b; k += R.span) { x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(k, y(R.barrier), 3, R.barrier - R.under); }
  const on = o.lamps ?? true;
  if (on) {
    x.fillStyle = 'rgba(255,190,110,.5)'; x.fillRect(a, y(R.under) - 3, b - a, 2);
    const g = x.createLinearGradient(0, y(R.under), 0, y(R.under - 120)); g.addColorStop(0, 'rgba(255,180,110,.14)'); g.addColorStop(1, 'rgba(255,180,110,0)');
    x.fillStyle = g; x.fillRect(a, y(R.under), b - a, 120);
  }
  // the railing over the barrier: posts and two rails, the traffic seen through it
  x.fillStyle = 'rgba(60,46,54,1)'; x.fillRect(a, y(R.rail), b - a, 3); x.fillRect(a, y(R.rail - 12), b - a, 2);
  for (let k = Math.ceil(a / 30) * 30; k < b; k += 30) x.fillRect(k, y(R.rail), 2, R.rail - R.barrier);
  // lamps on posts, leaning over the road
  for (let k = Math.floor(a / R.lamp) * R.lamp + R.lamp / 3; k < b + 40; k += R.lamp) {
    x.fillStyle = '#16101a'; x.fillRect(k, y(R.rail + 150), 4, 150); x.fillRect(k - 40, y(R.rail + 150), 44, 4);
    if (on) {
      x.fillStyle = 'rgba(255,214,150,.95)'; x.fillRect(k - 38, y(R.rail + 146), 18, 3);
      const g = x.createRadialGradient(k - 29, y(R.rail + 144), 2, k - 29, y(R.rail + 144), 90); g.addColorStop(0, 'rgba(255,200,130,.25)'); g.addColorStop(1, 'rgba(255,200,130,0)');
      x.fillStyle = g; x.fillRect(k - 120, y(R.rail + 234), 180, 180);
    }
  }
  // the sign gantries over the carriageway
  for (const gx of o.gantries ?? []) {
    if (gx < a - 400 || gx > b + 400) continue;
    x.fillStyle = '#16101a'; x.fillRect(gx - 160, y(R.rail + 190), 8, 190); x.fillRect(gx + 152, y(R.rail + 190), 8, 190); x.fillRect(gx - 160, y(R.rail + 194), 320, 8);
    x.fillStyle = '#0c0a10'; x.fillRect(gx - 140, y(R.rail + 186), 280, 64);
    x.strokeStyle = 'rgba(255,217,165,.5)'; x.lineWidth = 2; x.strokeRect(gx - 139, y(R.rail + 185), 278, 62);
    text(x, 'RING · EXIT 4', gx, y(R.rail + 164), 'rgba(255,217,165,.9)', 22, '600');
    text(x, 'DOWNTOWN  ↓', gx, y(R.rail + 138), 'rgba(255,217,165,.7)', 18, '600');
  }
}

const PAINTS = ['#8a2a2a', '#2a4a6a', '#c8c0b0', '#3a3a3a', '#6a5a2a', '#e8e0d0', '#4a2a4a', '#2a3a2a'];
const LOADS: Crate[] = [{ w: 320, p: 2, seed: 171 }, { w: 320, p: 5, seed: 172 }, { w: 320, p: 0, seed: 173 }, { w: 320, p: 7, seed: 174 }];

/**
 * The Ring's traffic over frame x `a`..`b`: a lane each way (the far lane a little higher, so it shows
 * over the near one), vehicles on slots that slide along at their lane's speed; which slots are full
 * and what drives in them is seeded. `f` is the clock in frames.
 */
export function ringTraffic(x: CanvasRenderingContext2D, a: number, b: number, f: number, still: boolean, lights: boolean) {
  for (const [dir, v, lift, gap] of [[-1, 4.2, 18, 560], [1, 3.6, 0, 600]] as const) {
    for (const { k, x: fx } of laneSlots(a, b, still ? 0 : f * v * dir, gap, 1)) {
      const h = ((k * 2654435761) >>> 0) % 1000 / 1000;
      if (h < 0.3) continue;
      x.save(); x.translate(fx, -RING.road - lift);
      const kind: 'truck' | CarKind = h < 0.5 ? 'truck' : h < 0.56 ? 'bus' : (['sedan', 'hatch', 'van', 'cab', 'sedan'] as const)[Math.floor(h * 97) % 5];
      if (kind === 'truck') drawTruck(x, { t: f, paint: PAINTS[k & 7], box: h < 0.42 ? LOADS[k & 3] : null, face: dir, lights, still });
      else drawCar(x, { t: f, paint: kind === 'cab' ? '#d8b040' : PAINTS[(k * 3) & 7], kind, face: dir, lights, still, route: 'X4' });
      x.restore();
    }
  }
}
