/**
 * STREET KIT: road traffic (Tommi, 2026-10-15 and 2026-10-22: where do the cars come from and go; cars must not
 * appear or vanish; the lane behind must not draw over the lane in front). From the title glide, now a kit piece
 * for any street with side streets:
 *
 * - Every vehicle is a route (world/vehicles.ts `VehicleRoute`, run with `routeAt`) from where it comes from to
 *   where it goes. Each lane is a conveyor of slots moving at the lane's speed, one truck long and a gap, so
 *   nothing overlaps; each slot has a seeded origin and destination: the truck gate (trucks only), one of the side
 *   streets, or the street's portal at its west end.
 * - A side street's cars come along a back street behind the towers, turn down the side street and out of its
 *   mouth onto the road, edge first (the mouth and the building line clip them); leaving, the same way back.
 * - Draw order is depth: the far lane first, the near lane last, a turning car at its own depth.
 * - `pass`: `street` draws the cars still behind the pavement in a side street (place it after the side streets,
 *   before the towers and the people), `road` the rest (after the people). `window` limits a piece to the vehicles
 *   whose middle is in it, so a street split across zones draws each vehicle exactly once, unclipped.
 *
 * Positions are world units east of the piece; the vehicles are the kit's (vehicles.ts) at the player's scale.
 */
import type { Element, Field, Properties } from '../core/composition';
import { inPixels, SHORE, R, ART, type Pixels } from '../core/pixels';
import { drawCar, drawTruck, SIZE, type CarKind } from '../vehicles/vehicles';
import { BOX40, type Crate } from '../props/containers';
import { placed } from '../core/view';
import { routeAt, routeLength, type RouteLeg, type VehicleRoute } from '../../world/vehicles';

const S = 1 / ART;
const num = (label: string, value: number, min = -1e7, max = 1e7, step = 1): Field => ({ kind: 'number', label, default: value, min, max, step });
const fin = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const n = (p: Properties, k: string) => Number(p[k]);

/** Half a side street's open mouth (pixels): its lit lane between the towers. */
export const MOUTH = 26;
const ZONE = 'street-traffic';
type LaneId = 'far' | 'near';
interface Lane { lane: LaneId; dir: 1 | -1; v: number; gap: number; seed: number }
const DEFAULT_LANES: Lane[] = [{ lane: 'far', dir: 1, v: 1.05, gap: 176, seed: 29 }, { lane: 'near', dir: -1, v: 1.25, gap: 176, seed: 11 }];
const DEFAULT_ENDS: [number, number][] = [[-1, 0.2], [0, 0.12], [1, 0.14], [2, 0.14], [3, 0.14], [4, 0.08]];
const PAINTS = ['#8a2a2a', '#2a4a6a', '#c8c0b0', '#3a3a3a', '#6a5a2a', '#e8e0d0', '#4a2a4a'];
const TRUCK_PAINTS = ['#c8c0b0', '#8a2a2a', '#3a5a3a', '#2a3a5a'];
const KINDS = ['sedan', 'hatch', 'cab', 'van', 'sedan', 'bus', 'hatch', 'cab'] as const;
const LOADS: Crate[] = [{ ...BOX40, p: 2, seed: 71 }, { ...BOX40, p: 5, seed: 72 }, { ...BOX40, p: 0, seed: 73 }, { ...BOX40, p: 6, seed: 74 }];
const h01 = (k: number) => { let h = (k * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const at = <T>(list: readonly T[], k: number) => list[((k % list.length) + list.length) % list.length];

/** The street in route units: X runs west in pixels (the route's own frame), from the piece's anchor. */
interface Street { mouths: number[]; gate: number; road: number; quay: number; portal: number; ends: [number, number][] }
const streetOf = (p: Properties): Street => ({
  mouths: (p.mouths as number[]).map(m => -m * S), gate: -n(p, 'gate') * S, road: -n(p, 'gate') * S + 20, quay: -n(p, 'quay') * S, portal: -n(p, 'portal') * S,
  ends: (p.ends as unknown as [number, number][]),
});

function endsOf(st: Street, k: number, seed: number): { near: number; far: number } | null {
  let v = h01(k * 7 + seed), near: number | null = null;
  for (const [i, pr] of st.ends) { if (v < pr) { near = i; break; } v -= pr; }
  if (near === null) return null;
  const PORTAL = st.mouths.length, options = [...st.mouths.map((_, i) => i), PORTAL].filter(i => i > near!), weight = (i: number) => i === st.mouths.length - 1 || i === PORTAL ? 3 : 1;
  let w = h01(k * 13 + seed * 5 + 3) * options.reduce((s, i) => s + weight(i), 0);
  for (const i of options) { w -= weight(i); if (w < 0) return { near, far: i }; }
  return { near, far: options[options.length - 1] };
}
function mouthIn(e: number, u: 1 | -1, hb: number, half: number, facing: 1 | -1): RouteLeg[] {
  const hm = Math.round(hb / 2), z = ZONE;
  return [
    { zone: z, from: { x: e - u * (MOUTH + half + 6), h: hb }, to: { x: e - u * 12, h: hb }, facing },
    { zone: z, from: { x: e - u * 12, h: hb }, via: { x: e, h: hb }, to: { x: e, h: hm }, facing },
    { zone: z, from: { x: e, h: hm }, via: { x: e, h: 0 }, to: { x: e + u * 24, h: 0 }, facing },
  ];
}
function mouthOut(e: number, u: 1 | -1, hb: number, half: number, facing: 1 | -1): RouteLeg[] {
  const hm = Math.round(hb / 2), z = ZONE;
  return [
    { zone: z, from: { x: e - u * 24, h: 0 }, via: { x: e, h: 0 }, to: { x: e, h: hm }, facing },
    { zone: z, from: { x: e, h: hm }, via: { x: e, h: hb }, to: { x: e + u * 12, h: hb }, facing },
    { zone: z, from: { x: e + u * 12, h: hb }, to: { x: e + u * (MOUTH + half + 6), h: hb }, facing },
  ];
}
interface TrafficRoute { route: VehicleRoute; total: number; entry: number; laneX: number; mouths: (number | null)[]; portal: boolean }
const ROUTES = new Map<string, TrafficRoute>();
function trafficRoute(st: Street, from: number, to: number, u: 1 | -1, hb: number, half: number): TrafficRoute {
  const key = [st.mouths.join(','), st.gate, st.portal, st.quay, from, to, u, hb, half].join('|'), hit = ROUTES.get(key);
  if (hit) return hit;
  const PORTAL = st.mouths.length, facing = (-u) as 1 | -1, X = (i: number) => i < 0 ? st.road : i === PORTAL ? st.portal : st.mouths[i];
  const pre = from < 0 || from === PORTAL ? [] : mouthIn(X(from), u, hb, half, facing), post = to < 0 || to === PORTAL ? [] : mouthOut(X(to), u, hb, half, facing);
  const laneX = from < 0 ? st.quay : from === PORTAL ? X(from) - u * (half + 2) : X(from) + u * 24, endX = to < 0 ? st.quay : to === PORTAL ? X(to) + u * (half + 2) : X(to) - u * 24;
  const lane: RouteLeg = { zone: ZONE, from: { x: laneX, h: 0 }, to: { x: endX, h: 0 }, facing };
  const legs = [...pre, lane, ...post], route: VehicleRoute = { legs };
  const out: TrafficRoute = { route, total: routeLength(route), entry: pre.length ? routeLength({ legs: pre }) : 0, laneX, mouths: [...pre.map(() => X(from)), null, ...post.map(() => X(to))], portal: from === PORTAL || to === PORTAL };
  if (ROUTES.size > 512) ROUTES.clear();
  ROUTES.set(key, out);
  return out;
}

export interface TrafficVehicle { id: string; lane: LaneId; k: number; kind: CarKind | 'truck'; face: 1 | -1; s: number; total: number; X: number; sx: number; y: number; half: number; mouth: number | null; portal: boolean; pass: 'street' | 'road'; paint: string; box: Crate | null }

/** Every vehicle near the view this frame, in draw order (far to near, east to west at one depth). Pure: a function of the frame clock and the street. */
export function trafficPlan(P: Pixels, p: Properties, h0: number): TrafficVehicle[] {
  const st = streetOf(p), lanes = p.lanes as unknown as Lane[], f = P.still ? 0 : P.f, out: TrafficVehicle[] = [];
  const back = P.y(h0 + SHORE.back), mid = P.y(h0 + SHORE.mid), far = P.y(h0 + SHORE.farLane), near = P.y(h0 + SHORE.nearLane);
  const [v0, v1] = P.span(), Xe = -(v1 - P.ax) - 520, Xw = -(v0 - P.ax) + 520;
  for (const ln of lanes) {
    const ly = ln.lane === 'far' ? far : near, u = (-ln.dir) as 1 | -1, off = f * ln.v * u, hb = ly - (back - 4);
    for (let k = Math.floor((Xe - off) / ln.gap); k <= Math.ceil((Xw - off) / ln.gap); k++) {
      const ends = endsOf(st, k, ln.seed); if (!ends) continue;
      const [from, to] = u > 0 ? [ends.near, ends.far] : [ends.far, ends.near];
      const gate = ends.near < 0, kind: CarKind | 'truck' = gate ? 'truck' : KINDS[Math.floor(h01(k + ln.seed * 3) * 8)];
      const half = R(SIZE[kind] * S / 2), r = trafficRoute(st, from, to, u, hb, half);
      const X = k * ln.gap + off, s = r.entry + u * (X - r.laneX);
      if (s <= 0 || s >= r.total) continue;
      const q = routeAt(r.route, s), sx = P.u(-q.x), y = ly - q.h, mouth = r.mouths[q.leg];
      out.push({ id: ln.lane + '#' + k, lane: ln.lane, k, kind, face: ln.dir, s, total: r.total, X: q.x, sx, y, half, mouth, portal: r.portal, pass: mouth !== null && y < mid ? 'street' : 'road',
        paint: gate ? at(TRUCK_PAINTS, k) : kind === 'cab' ? '#d8b040' : kind === 'bus' ? '#3a5a6a' : at(PAINTS, k), box: gate && h01(k * 3 + 1) < 0.75 ? at(LOADS, k) : null });
    }
  }
  out.sort((a, b) => a.y - b.y || b.sx - a.sx);
  return out;
}

function drawVehicle(P: Pixels, p: Properties, h0: number, v: TrafficVehicle) {
  const x = P.x, lit = p.lights !== false || P.warm < 0.6, st = streetOf(p);
  x.save();
  if (v.portal) { x.beginPath(); x.rect(R(P.u(-st.portal)), -4000, P.W + 8000, 8000); x.clip(); }
  if (v.mouth !== null) { const m = R(P.u(-v.mouth)), line = P.y(h0 + SHORE.back) + 2; x.beginPath(); x.rect(m - MOUTH, -4000, 2 * MOUTH, 8000); x.rect(-4000, line, P.W + 8000, 8000); x.clip(); }
  placed(x, R(v.sx), R(v.y), S, () => {
    if (v.kind === 'truck') drawTruck(x, { t: P.f, paint: v.paint, box: v.box, face: v.face, lights: lit, still: P.still });
    else drawCar(x, { t: P.f, paint: v.paint, kind: v.kind, face: v.face, lights: lit, still: P.still, route: String(p.route) });
  });
  x.restore();
}

export const trafficElement: Element = {
  type: 'street.traffic', version: 1, label: 'Road traffic between side streets, a truck gate and a portal (street kit)', category: 'vehicles', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: {
    mouths: { kind: 'json', label: 'Side streets, east to west (units east of the piece)', default: [], validate: v => { if (!Array.isArray(v) || v.length > 20 || !v.every(fin)) throw new Error('Side streets: expected numbers'); } },
    gate: num('Truck gate (units east of the piece; trucks come and go there)', 0), quay: num('Trucks run on to (units east of the piece)', 2000), portal: num('The street’s west portal (units east of the piece)', -6000),
    lanes: { kind: 'json', label: 'Lanes, far first (lane far/near, dir 1 east, v pixels a frame, gap, seed)', default: DEFAULT_LANES as never, validate: v => { if (!Array.isArray(v) || v.length > 4 || !v.every(l => !!l && typeof l === 'object' && ['far', 'near'].includes((l as unknown as Lane).lane) && [1, -1].includes((l as unknown as Lane).dir) && fin((l as unknown as Lane).v) && (l as unknown as Lane).gap > 20 && fin((l as unknown as Lane).seed))) throw new Error('Lanes: expected { lane, dir, v, gap, seed } rows'); } },
    ends: { kind: 'json', label: 'Near ends and their chance (end -1: the gate; 0..: a side street)', default: DEFAULT_ENDS as never, validate: v => { if (!Array.isArray(v) || !v.every(e => Array.isArray(e) && e.length === 2 && e.every(fin))) throw new Error('Ends: expected [end, chance] pairs'); } },
    pass: { kind: 'select', label: 'Draws', options: ['road', 'street'], default: 'road' }, windowFrom: num('Only vehicles from (units east of the piece)', -1e7), windowTo: num('to', 1e7),
    lights: { kind: 'boolean', label: 'Headlights on', default: true }, route: { kind: 'string', label: 'Bus route', default: '7' },
  },
  bounds: () => ({ x: -1000, h: 0, w: 2000, tall: 120 }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  draw(ctx, v, p, _s, _pass, at) {
    inPixels(ctx, v, at, P => {
      const a = n(p, 'windowFrom') * S, b = n(p, 'windowTo') * S, pass = String(p.pass);
      for (const veh of trafficPlan(P, p, at.h)) {
        const local = -veh.X; if (local < a || local >= b || veh.pass !== pass) continue;
        if (veh.sx + veh.half < -60 || veh.sx - veh.half > P.W + 60) continue;
        drawVehicle(P, p, at.h, veh);
      }
    });
  },
};
