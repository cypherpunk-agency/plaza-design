/**
 * The glide's road traffic (Tommi, 2026-10-15: where do the cars come from and go?). One road, from
 * the port's truck gate west into Downtown, ending at the inlet; nothing drives on the pier or the beach.
 *
 * Tommi, 2026-10-22: cars and people must not just appear and disappear, and the lane behind must not
 * draw over the lane in front. So every vehicle is a route (world/vehicles.ts `VehicleRoute`, run with
 * `routeAt`) from where it comes from to where it goes, and nothing fades:
 *
 * - **Where from, where to.** Each lane is a conveyor of slots moving at the lane's speed, a slot one
 *   truck long and a gap, so vehicles on the road never overlap. Each slot's vehicle has a seeded origin
 *   and destination: the truck gate (trucks only) or one of Downtown's side streets. Westbound (the near
 *   lane) runs from the gate or a side street to a side street further west, most often the last one
 *   before the inlet; eastbound (the far lane) the other way round. The road starts slim at the gate, a
 *   truck now and then, and fills toward the city as the side streets add their cars.
 * - **The gate's trucks** come along the quay from the terminal (off screen east, `QUAY_END`) and roll out
 *   through the gate, or drive in through it and on along the quay out of view.
 * - **A side street's cars** come along a back street behind the towers, turn down the side street and
 *   out of its mouth onto the road; leaving, the same way back. Behind the building line they are hidden
 *   by the towers either side: only the mouth (`MOUTH` either side of the street's middle) and what is
 *   already in front of the building line show, so a car is revealed edge first, never faded in. While a
 *   car is still behind the pavement's people (its wheels over `L.MID`) it is drawn with its side street
 *   (glide.ts draws `drawSideStreetTraffic` after the street's piece, before the towers and the people);
 *   from there on with the road.
 * - **Draw order** is depth: the far lane first, the near lane last, a car turning in between them at its
 *   own depth; at one depth, east to west. Facing is the lane's direction. A pure function of the frame clock.
 */

import { drawCar, drawTruck, SIZE, type CarKind } from "../../vehicles/vehicles";
import { BOX40, type Crate } from "../../props/containers";
import { placed } from "../../core/view";
import { type CoastView, type Lines, R, S } from "./coast";
import { PLACES, WEST } from "./path";
import { routeAt, routeLength, type RouteLeg, type VehicleRoute } from "../../../world/vehicles";

/** Downtown's side streets (X): where cars come from and go to (town.ts draws their mouths and keeps its towers 28 clear of them). */
export const SIDE_STREETS = [3420, 3720, 4130, 4480, 4800];
/** Half the side street's open mouth (view units): its lit lane between the towers (town.ts `drawTownBack`). */
export const MOUTH = 26;
/** Where a gate truck's route starts or ends on the quay (X): east of everything the glide shows. */
export const QUAY_END = 1500;
/**
 * THE RING's two ends in the glide (X): west at the junction with the inlet, east where it curves away inland
 * (PLACES.ring). Its traffic (ring-highway.ts `ringTraffic`, town.ts `drawRingOver`) is clipped exactly here and runs
 * through: every vehicle comes in from beyond one end and leaves past the other. Each end is closed by a structure
 * drawn over the traffic, so a vehicle passes into it rather than appearing out of the air.
 */
export const RING_ENDS = { west: WEST.junction, east: PLACES.ring };
/** The route's zone: the glide's one strip of road, in view units (x is X, h is depth behind the lane's wheel line). */
const ZONE = 'glide-road';

type LaneId = 'far' | 'near';
/** A lane: its direction (1 drives east, toward the port; -1 west, into the city), speed (view units a frame), the slot pitch. Far first: it is drawn first. */
export const LANES: readonly { lane: LaneId; dir: 1 | -1; v: number; gap: number; seed: number }[] = [
  { lane: 'far', dir: 1, v: 1.05, gap: 176, seed: 29 },
  { lane: 'near', dir: -1, v: 1.25, gap: 176, seed: 11 },
];
/**
 * The near end of a slot's route (westbound: its origin, eastbound: its destination) and how likely: the gate
 * takes trucks, the side streets cars; the last side street is only ever the far end. The rest of the slots are empty.
 */
const ENDS: [number, number][] = [[-1, 0.2], [0, 0.12], [1, 0.14], [2, 0.14], [3, 0.14]];
const PAINTS = ['#8a2a2a', '#2a4a6a', '#c8c0b0', '#3a3a3a', '#6a5a2a', '#e8e0d0', '#4a2a4a'];
const TRUCK_PAINTS = ['#c8c0b0', '#8a2a2a', '#3a5a3a', '#2a3a5a'];
const KINDS = ['sedan', 'hatch', 'cab', 'van', 'sedan', 'bus', 'hatch', 'cab'] as const;
const LOADS: Crate[] = [{ ...BOX40, p: 2, seed: 71 }, { ...BOX40, p: 5, seed: 72 }, { ...BOX40, p: 0, seed: 73 }, { ...BOX40, p: 6, seed: 74 }];
/** How tall each kind stands over its wheels (view units), for its bounds. */
const TALL: Record<CarKind | 'truck', number> = { sedan: 48 * S, hatch: 42 * S, cab: 48 * S, van: 56 * S, bus: 88 * S, truck: 150 * S };
const h01 = (n: number) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const at = <T>(list: readonly T[], k: number) => list[((k % list.length) + list.length) % list.length];

/** A slot's route ends as side-street indices (-1: the gate), or null: the slot is empty. `from` < `to` along X (west). */
function endsOf(k: number, seed: number): { near: number; far: number } | null {
  let v = h01(k * 7 + seed), near: number | null = null;
  for (const [i, p] of ENDS) { if (v < p) { near = i; break; } v -= p; }
  if (near === null) return null;
  // the far end: a side street west of the near end, the last one (the city's way out) three times as likely as each other
  const options = SIDE_STREETS.map((_, i) => i).filter(i => i > near!), weight = (i: number) => i === SIDE_STREETS.length - 1 ? 3 : 1;
  let w = h01(k * 13 + seed * 5 + 3) * options.reduce((n, i) => n + weight(i), 0);
  for (const i of options) { w -= weight(i); if (w < 0) return { near, far: i }; }
  return { near, far: options[options.length - 1] };
}

/**
 * Into the road from side street `e`'s mouth, travelling `u` along X (1 west): along the back street behind the
 * towers (from where the whole vehicle is still hidden), round the corner down the side street, round onto the lane.
 * `hb`: the back street's depth behind the lane's wheel line.
 */
function mouthIn(e: number, u: 1 | -1, hb: number, half: number, facing: 1 | -1): RouteLeg[] {
  const hm = Math.round(hb / 2), z = ZONE;
  return [
    { zone: z, from: { x: e - u * (MOUTH + half + 6), h: hb }, to: { x: e - u * 12, h: hb }, facing },
    { zone: z, from: { x: e - u * 12, h: hb }, via: { x: e, h: hb }, to: { x: e, h: hm }, facing },
    { zone: z, from: { x: e, h: hm }, via: { x: e, h: 0 }, to: { x: e + u * 24, h: 0 }, facing },
  ];
}
/** Off the road into side street `e`, the same way back. */
function mouthOut(e: number, u: 1 | -1, hb: number, half: number, facing: 1 | -1): RouteLeg[] {
  const hm = Math.round(hb / 2), z = ZONE;
  return [
    { zone: z, from: { x: e - u * 24, h: 0 }, via: { x: e, h: 0 }, to: { x: e, h: hm }, facing },
    { zone: z, from: { x: e, h: hm }, via: { x: e, h: hb }, to: { x: e + u * 12, h: hb }, facing },
    { zone: z, from: { x: e + u * 12, h: hb }, to: { x: e + u * (MOUTH + half + 6), h: hb }, facing },
  ];
}

/** A vehicle's whole route and where on it the lane's conveyor slot is: `entry` route units before the lane leg starts at `laneX`. */
export interface TrafficRoute { route: VehicleRoute; total: number; entry: number; laneX: number; mouths: (number | null)[] }
const ROUTES = new Map<string, TrafficRoute>();
/** The route from end `from` to end `to` (side-street indices, -1 the gate) for a lane travelling `u` (1 west). */
export function trafficRoute(from: number, to: number, u: 1 | -1, hb: number, half: number): TrafficRoute {
  const key = [from, to, u, hb, half].join('|'), hit = ROUTES.get(key);
  if (hit) return hit;
  const facing = (-u) as 1 | -1, X = (i: number) => i < 0 ? PLACES.road : SIDE_STREETS[i];
  const pre = from < 0 ? [] : mouthIn(X(from), u, hb, half, facing), post = to < 0 ? [] : mouthOut(X(to), u, hb, half, facing);
  const laneX = from < 0 ? QUAY_END : X(from) + u * 24, endX = to < 0 ? QUAY_END : X(to) - u * 24;
  const lane: RouteLeg = { zone: ZONE, from: { x: laneX, h: 0 }, to: { x: endX, h: 0 }, facing };
  const legs = [...pre, lane, ...post], route: VehicleRoute = { legs };
  const out: TrafficRoute = { route, total: routeLength(route), entry: routeLength({ legs: pre.length ? pre : [lane] }) * (pre.length ? 1 : 0), laneX,
    mouths: [...pre.map(() => X(from)), null, ...post.map(() => X(to))] };
  if (ROUTES.size > 256) ROUTES.clear();
  ROUTES.set(key, out);
  return out;
}

/** One vehicle this frame: where it is drawn (screen x, wheel line y), how it looks, which mouth clips it, and which pass draws it. */
export interface TrafficVehicle {
  id: string; lane: LaneId; k: number; kind: CarKind | 'truck'; face: 1 | -1;
  /** Along its route (route units) and the route's length: shown only strictly between 0 and `total`. */
  s: number; total: number;
  X: number; sx: number; y: number; half: number; tall: number;
  /** The side street (X) whose mouth it is in (it shows only through the mouth and in front of the building line), or null on the road. */
  mouth: number | null;
  /** `street`: still behind the pavement's people, drawn with its side street; `road`: drawn with the road. */
  pass: 'street' | 'road';
  paint: string; box: Crate | null;
}

const PLANS = new WeakMap<Lines, { key: string; list: TrafficVehicle[] }>();
/** Every vehicle on its route this frame (in or near the view), in draw order: far to near, east to west at one depth. */
export function trafficPlan(c: CoastView, L: Lines): TrafficVehicle[] {
  const f = c.still ? 0 : c.f, key = [c.g, f, c.W, c.H].join('|'), hit = PLANS.get(L);
  if (hit && hit.key === key) return hit.list;
  const out: TrafficVehicle[] = [];
  // the slots near the view: X from past its east edge to past its west edge (a slot runs ahead of or behind a car still in its side street)
  const Xe = c.g - c.W / 2 - 520, Xw = c.g + c.W / 2 + 520;
  for (const ln of LANES) {
    const ly = ln.lane === 'far' ? L.FAR_LANE : L.NEAR_LANE, u = (-ln.dir) as 1 | -1, off = f * ln.v * u, hb = ly - (L.BACK - 4);
    for (let k = Math.floor((Xe - off) / ln.gap); k <= Math.ceil((Xw - off) / ln.gap); k++) {
      const ends = endsOf(k, ln.seed);
      if (!ends) continue;
      const [from, to] = u > 0 ? [ends.near, ends.far] : [ends.far, ends.near];
      const gate = ends.near < 0, kind: CarKind | 'truck' = gate ? 'truck' : KINDS[Math.floor(h01(k + ln.seed * 3) * 8)];
      const half = R(SIZE[kind] * S / 2), r = trafficRoute(from, to, u, hb, half);
      const X = k * ln.gap + off, s = r.entry + u * (X - r.laneX);
      if (s <= 0 || s >= r.total) continue;
      const p = routeAt(r.route, s), sx = c.sx(p.x), y = ly - p.h, mouth = r.mouths[p.leg];
      if (sx + half < -60 || sx - half > c.W + 60) continue;
      out.push({ id: ln.lane + '#' + k, lane: ln.lane, k, kind, face: ln.dir, s, total: r.total, X: p.x, sx, y, half, tall: TALL[kind], mouth, pass: mouth !== null && y < L.MID ? 'street' : 'road',
        paint: gate ? at(TRUCK_PAINTS, k) : kind === 'cab' ? '#d8b040' : kind === 'bus' ? '#3a5a6a' : at(PAINTS, k), box: gate && h01(k * 3 + 1) < 0.75 ? at(LOADS, k) : null });
    }
  }
  out.sort((a, b) => a.y - b.y || b.sx - a.sx);
  PLANS.set(L, { key, list: out });
  return out;
}

/** The part of the view a vehicle in side street `mouth` shows in: the open mouth, and everything in front of the building line (the towers stand on `L.BACK`, two units below it). */
export function mouthClip(c: CoastView, L: Lines, mouth: number) {
  const m = R(c.sx(mouth)), line = L.BACK + 2;
  return { x0: m - MOUTH, x1: m + MOUTH, line };
}

function drawVehicle(x: CanvasRenderingContext2D, c: CoastView, L: Lines, v: TrafficVehicle) {
  const lit = c.city > 0.2 || c.warm < 0.6;
  x.save();
  if (v.mouth !== null) {
    const m = mouthClip(c, L, v.mouth);
    x.beginPath(); x.rect(m.x0, -4000, m.x1 - m.x0, 8000); x.rect(-4000, m.line, c.W + 8000, 8000); x.clip();
  }
  placed(x, R(v.sx), R(v.y), S, () => {
    if (v.kind === 'truck') drawTruck(x, { t: c.f, paint: v.paint, box: v.box, face: v.face, lights: lit, still: c.still });
    else drawCar(x, { t: c.f, paint: v.paint, kind: v.kind, face: v.face, lights: lit, still: c.still, route: '7' });
  });
  x.restore();
}

/** The road's vehicles (all but those still behind the pavement in a side street), back to front. */
export function drawTraffic(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  for (const v of trafficPlan(c, L)) if (v.pass === 'road') drawVehicle(x, c, L, v);
}
/** The vehicles still behind the pavement in side street `mouth` (drawn after the street, before the towers and the people). */
export function drawSideStreetTraffic(x: CanvasRenderingContext2D, c: CoastView, L: Lines, mouth: number) {
  for (const v of trafficPlan(c, L)) if (v.pass === 'street' && v.mouth === mouth) drawVehicle(x, c, L, v);
}
