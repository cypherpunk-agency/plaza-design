/**
 * VEHICLES (docs/design/SEAMLESS-WORLD.md §4): a shell with its own frame of reference, carried through zones by a
 * Circuit mover. Pure source and geometry rules used by engine/level-vehicles.ts in the existing level step.
 * Nothing here keeps state: a vehicle is only its movers in a SceneModel
 * (the frame mover and, for a train, its doors mover). Every function reads them, the way engine/level.ts `car()`
 * reads a lift's mover.
 *
 * - The frame mover's position is the **route parameter** `s` (route units from the route's start, plus `origin`).
 *   The route's legs map `s` to a zone and a zone-local place (x, h) of the vehicle's anchor (its left end, floor
 *   level), its facing and its tilt. A leg may curve through one `via` control point, or be a `drop` (x evenly,
 *   h falling faster and faster). A route that crosses a seam is two legs in two zones: where one ends and the next
 *   starts is the same world point once the zones are placed (`routeProblems` checks it against the zone graph).
 * - The interior is level data (`LevelSource`): each car's floors in car-local units, laid out as a consist and fused
 *   across gangways (`consistLevel`). Placed at the vehicle's pose it is one more `LevelPart` for `mergeLevels`, as
 *   a zone of its own named by the vehicle's id, so the level rules (walls, reveal) work in it unchanged.
 * - Doors are read from a doors mover (its position is the openness, a train's `train.doors`) or from the frame
 *   mover's trip (a lift's doors, exactly as `car()` works them out). A door lets the player through only while it
 *   is open past its threshold **and** the vehicle stands at one of its berths (`boardAt`, `alightAt`).
 * - A lift cabin is a vehicle with one leg straight up its shaft, berths at its stops and trip doors (`liftVehicle`).
 */
import type { LevelFloor, LevelLift, LevelPart, LevelSource, MoverModel } from '../engine/level';
import type { ZoneGraphSource } from './zone-graph';
import { placeFrom } from './zone-graph';

export const VEHICLE_KINDS = ['train', 'shuttle', 'lift', 'boat', 'sky-taxi', 'cart', 'van'] as const;
export type VehicleKind = typeof VEHICLE_KINDS[number];

/** A point in a zone's own units. */
export interface ZonePoint { x: number; h: number }
/** A door in its car: centre `x` (car-local) and width; the floor it opens onto is the car floor at its height (`h`, default 0). */
export interface VehicleDoor { id: string; x: number; w: number; h?: number }
export interface VehicleSeat { id: string; x: number; h?: number; /** Optional registered furniture and surface anchor; compiled geometry follows the artwork. */ artwork?:string; anchor?:string }
/** A car floor in car-local units (x from the car's left end, h from its floor). Absent: one deck the car's width at h 0. */
export interface CarFloor { id: string; x: number; w: number; h: number; label?: string; indoor?: true }
/** One car of the consist. Cars are laid out left to right, `gap` apart. A shell-only car (a van, `shellOnly`) has no floors. */
export interface VehicleCar { id: string; width: number; floors?: CarFloor[]; doors: VehicleDoor[]; seats: VehicleSeat[]; shellOnly?: true }
/**
 * One leg of the route, in `zone`'s units: from → to, through `via` (a quadratic curve) or as a `drop`. `length`: route
 * units the leg takes (default: its length along the curve). `facing`: which way the vehicle looks (default: the way the leg
 * runs in x; 1 for a vertical leg). `tilt`: lean with the path's tangent (sky-taxi, a cart on a slope).
 */
export interface RouteLeg { zone: string; from: ZonePoint; to: ZonePoint; via?: ZonePoint; drop?: true; length?: number; facing?: 1 | -1; tilt?: true }
/** `origin`: the frame mover's position at the route's start. `ring`: the route goes round (the mover's ring is its length). */
export interface VehicleRoute { legs: RouteLeg[]; origin?: number; ring?: true }
/** Where the vehicle stands to load: its anchor at (x, h) in `zone` (h absent: any height). `floor`: the landing floor, where known. */
export interface VehicleBerth { id: string; zone: string; x: number; h?: number; floor?: string }
/** How the doors are read: a doors mover's position (0 shut … 1 open), or the frame mover's trip (`trip`: the door time, ms). */
export type VehicleDoorsDrive = { mover: string; open: number } | { trip: number; open: number };
export interface VehicleSource {
  id: string; kind: VehicleKind;
  /** The frame mover, `device.noun`. */
  mover: string;
  /** Optional shared gameplay query authorizing player boarding; alighting remains available. */
  boardQuery?:string;
  /** Optional shared gameplay query controlling whether this service is physically present. */
  presenceQuery?:string;
  doors: VehicleDoorsDrive;
  cars: VehicleCar[];
  /** Between cars, units (default 0). Gangways join neighbouring cars' floors at one height into one walk (default true). */
  gap?: number; gangways?: boolean;
  route: VehicleRoute;
  berths: VehicleBerth[];
  /** Usable only from that building's floors in its zone (a lift drawn inside a building's interior). */
  inside?: string;
  /** The shell's reveal: its instance ids, ghost and speed, as a building's. */
  shell?: string[]; ghost?: number; revealSpeed?: number;
}

/** Where the vehicle is: its anchor in a zone's units, the leg and the share of it, facing and tilt (radians). */
export interface VehiclePose { s: number; zone: string; leg: number; u: number; x: number; h: number; facing: 1 | -1; tilt: number }

const near = (a: number, b: number, d = 0.75) => Math.abs(a - b) <= d;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

// ---------- the route ----------

const SAMPLES = 48;
/** A leg's shape at u (0..1) and its tangent. */
function curve(leg: RouteLeg, u: number): { p: ZonePoint; d: ZonePoint } {
  const { from: a, to: b, via: c } = leg;
  if (c) {
    const v = 1 - u;
    return { p: { x: v * v * a.x + 2 * v * u * c.x + u * u * b.x, h: v * v * a.h + 2 * v * u * c.h + u * u * b.h },
      d: { x: 2 * v * (c.x - a.x) + 2 * u * (b.x - c.x), h: 2 * v * (c.h - a.h) + 2 * u * (b.h - c.h) } };
  }
  if (leg.drop) return { p: { x: a.x + (b.x - a.x) * u, h: a.h + (b.h - a.h) * u * u }, d: { x: b.x - a.x, h: 2 * u * (b.h - a.h) } };
  return { p: { x: a.x + (b.x - a.x) * u, h: a.h + (b.h - a.h) * u }, d: { x: b.x - a.x, h: b.h - a.h } };
}
/** A curved leg's arc-length table: so a mover at constant speed runs evenly along it. */
function arcTable(leg: RouteLeg): number[] {
  const out = [0];
  for (let i = 1, prev = curve(leg, 0).p; i <= SAMPLES; i++) { const p = curve(leg, i / SAMPLES).p; out.push(out[i - 1] + Math.hypot(p.x - prev.x, p.h - prev.h)); prev = p; }
  return out;
}
/** Route units a leg takes. */
export const legLength = (leg: RouteLeg) => leg.length ?? arcTable(leg)[SAMPLES];
/** The whole route's length (a ring's: once round). */
export const routeLength = (route: VehicleRoute) => route.legs.reduce((n, l) => n + legLength(l), 0);

/** The vehicle's place at route parameter `s` (a ring wraps; a line holds at its ends). */
export function routeAt(route: VehicleRoute, s: number): VehiclePose {
  const total = routeLength(route), raw = s - (route.origin ?? 0);
  let left = route.ring && total > 0 ? ((raw % total) + total) % total : Math.max(0, Math.min(total, raw));
  const wrapped = left;
  let i = 0;
  for (; i < route.legs.length - 1 && left >= legLength(route.legs[i]); i++) left -= legLength(route.legs[i]);
  const leg = route.legs[i], len = legLength(leg) || 1, f = Math.max(0, Math.min(1, left / len));
  // a curve runs evenly along its arc; a straight leg and a drop share out x evenly
  let u = f;
  if (leg.via) {
    const t = arcTable(leg), want = f * t[SAMPLES];
    let k = 1; while (k < SAMPLES && t[k] < want) k++;
    u = (k - 1 + (t[k] > t[k - 1] ? (want - t[k - 1]) / (t[k] - t[k - 1]) : 0)) / SAMPLES;
  }
  const { p, d } = curve(leg, u), facing = leg.facing ?? (d.x < 0 ? -1 : 1);
  return { s: wrapped, zone: leg.zone, leg: i, u, x: p.x, h: p.h, facing, tilt: leg.tilt ? Math.atan2(d.h * facing, Math.abs(d.x) || 1e-9) : 0 };
}

/** The route parameter (with `origin`) nearest a zone point: where a berth's mover stop goes. */
export function routeParamAt(route: VehicleRoute, zone: string, at: ZonePoint): number | undefined {
  let best: number | undefined, bd = Infinity, start = route.origin ?? 0;
  for (const leg of route.legs) {
    const len = legLength(leg);
    if(leg.zone===zone&&!leg.via&&!leg.drop){
      const dx=leg.to.x-leg.from.x,dh=leg.to.h-leg.from.h,span=dx*dx+dh*dh,
        u=span?Math.max(0,Math.min(1,((at.x-leg.from.x)*dx+(at.h-leg.from.h)*dh)/span)):0,
        p=curve(leg,u).p,d=Math.hypot(p.x-at.x,p.h-at.h);
      if(d<bd){bd=d;best=start+len*u;}
    }else if (leg.zone === zone) for (let i = 0; i <= 400; i++) {
      const s = start + len * i / 400, p = routeAt({ ...route, ring: undefined }, s);
      const d = Math.hypot(p.x - at.x, p.h - at.h); if (d < bd) { bd = d; best = s; }
    }
    start += len;
  }
  return best;
}

/**
 * What is wrong with a route against the world: unknown zones, a vehicle named like a zone, legs that do not meet
 * (in one zone, the end of one is the start of the next; across zones, a seam joins them and puts them at one point),
 * a ring that does not close, berths off the route.
 */
export function routeProblems(v: VehicleSource, graph: ZoneGraphSource, zones: Readonly<Record<string, unknown>>): string[] {
  const out: string[] = [], legs = v.route.legs;
  if (zones[v.id]) out.push(`${v.id}: a vehicle's id must not be a zone's`);
  for (const [i, l] of legs.entries()) if (!zones[l.zone]) out.push(`${v.id} leg ${i}: unknown zone ${l.zone}`);
  const pairs = legs.map((l, i) => [l, legs[i + 1]] as const).slice(0, -1);
  if (v.route.ring && legs.length) pairs.push([legs[legs.length - 1], legs[0]]);
  for (const [a, b] of pairs) {
    const at = a.zone === b.zone ? { dx: 0, dh: 0 } : placeFrom(graph, a.zone, 1).get(b.zone);
    if (!at) { out.push(`${v.id}: no seam joins ${a.zone} to ${b.zone}`); continue; }
    if (!near(a.to.x, b.from.x + at.dx) || !near(a.to.h, b.from.h + at.dh)) out.push(`${v.id}: the leg in ${a.zone} ends at (${a.to.x}, ${a.to.h}) but the next starts at (${b.from.x + at.dx}, ${b.from.h + at.dh}) from there`);
  }
  for (const b of v.berths) {
    const s = routeParamAt(v.route, b.zone, { x: b.x, h: b.h ?? 0 }), p = s === undefined ? undefined : routeAt(v.route, s);
    if (!p || !near(p.x, b.x, 1) || (b.h !== undefined && !near(p.h, b.h, 1))) out.push(`${v.id}: berth ${b.id} is not on the route`);
  }
  return out;
}

// ---------- reading the movers ----------


/** Where the vehicle is now, from its frame mover. Undefined: no such mover (the vehicle is inert). */
export function vehiclePose(v: VehicleSource, m: MoverModel): VehiclePose | undefined {
  const s = m.movers.position(v.mover);
  return s === undefined ? undefined : routeAt(v.route, s);
}

/** The doors, 0 shut … 1 open: a doors mover's position, or worked out from the frame mover's trip as a lift's are (engine/level.ts `car()`). */
export function vehicleDoors(v: VehicleSource, m: MoverModel): number {
  const d = v.doors;
  if ('mover' in d) return Math.max(0, Math.min(1, m.movers.position(d.mover) ?? 0));
  const trip = m.movers.trip(v.mover); if (!trip) return 0;
  const now = m.now();
  return m.movers.moving(v.mover) ? Math.max(0, 1 - (now - trip.t0) / (d.trip / 3)) : Math.max(0, Math.min(1, (now - trip.t1) / d.trip));
}

/** The berth the vehicle stands at now (its anchor on the berth's spot), if any. */
export function vehicleBerth(v: VehicleSource, pose: VehiclePose): VehicleBerth | undefined {
  return v.berths.find(b => b.zone === pose.zone && near(pose.x, b.x) && (b.h === undefined || near(pose.h, b.h)));
}

// ---------- the interior ----------

/** Each car's left end along the consist. */
export const carOffsets = (v: VehicleSource) => { const out: number[] = []; let x = 0; for (const c of v.cars) { out.push(x); x += c.width + (v.gap ?? 0); } return out; };
export const consistLength = (v: VehicleSource) => { const o = carOffsets(v); return o.length ? o[o.length - 1] + v.cars[v.cars.length - 1].width : 0; };
const carFloors = (c: VehicleCar): CarFloor[] => c.shellOnly ? [] : c.floors ?? [{ id: 'deck', x: 0, w: c.width, h: 0 }];

/**
 * The consist as one level in the vehicle's own units (anchor at 0, 0): every car floor is a floor of the vehicle's
 * building, entered only at a door (`entry: 'door'`), with ids `car.floor`. Across a gangway, a floor reaching its car's
 * right end and the next car's floor starting at its left end at the same height are one floor (the first one's id).
 */
export function consistLevel(v: VehicleSource): LevelSource {
  const at = carOffsets(v), floors: LevelFloor[] = [], gangways = v.gangways ?? true;
  let open: { f: LevelFloor; car: number } | undefined;
  for (const [i, c] of v.cars.entries()) {
    const reaching: LevelFloor[] = [];
    for (const cf of carFloors(c)) {
      const f: LevelFloor = { id: c.id + '.' + cf.id, x: at[i] + cf.x, w: cf.w, h: cf.h, building: v.id, label: cf.label ?? c.id, entry: 'door', ...(cf.indoor ? { indoor: true as const } : {}) };
      const prev = open && open.car === i - 1 && gangways && near(cf.x, 0) && near(open.f.h, f.h) ? open.f : undefined;
      if (prev) { prev.w = f.x + f.w - prev.x; if (near(cf.x + cf.w, c.width)) reaching.push(prev); continue; }
      floors.push(f);
      if (near(cf.x + cf.w, c.width)) reaching.push(f);
    }
    open = reaching[0] ? { f: reaching[0], car: i } : undefined;
  }
  const hs = floors.length ? floors.map(f => f.h) : [0];
  return { floors, links: [], doors: [], lifts: [], shells: { [v.id]: v.shell ?? [] }, interiors: {}, low: Math.min(...hs), high: Math.max(...hs),
    ...(v.ghost !== undefined ? { ghost: { [v.id]: v.ghost } } : {}), ...(v.revealSpeed !== undefined ? { revealSpeed: { [v.id]: v.revealSpeed } } : {}) };
}

/** Where each placed zone lies from the active zone (world/zone-graph.ts `placeFrom`). */
export type Placements = ReadonlyMap<string, { dx: number; dh: number }>;
/** A vehicle in this frame, in the active zone's units: its pose, doors, berth, and its interior as a `LevelPart`. */
export interface VehicleFrame { vehicle: VehicleSource; pose: VehiclePose; doors: number; berth?: VehicleBerth; part: LevelPart;occupied?:readonly string[];boarding?:boolean }

/** The vehicle as the frame sees it, or undefined when its mover is missing or its zone is not placed (not resident). */
export function vehicleFrame(v: VehicleSource, m: MoverModel, placements: Placements, level: LevelSource = consistLevel(v)): VehicleFrame | undefined {
  const pose = vehiclePose(v, m), at = pose && placements.get(pose.zone);
  if (!pose || !at) return undefined;
  return { vehicle: v, pose, doors: vehicleDoors(v, m), berth: vehicleBerth(v, pose), part: { zone: v.id, source: level, dx: at.dx + pose.x, dh: at.dh + pose.h, width: consistLength(v) } };
}

/** Each door in the active zone's units, and whether it lets the player through now (open past the threshold, at a berth). */
export function vehicleDoorsAt(f: VehicleFrame): { id: string; car: string; x: number; w: number; h: number; open: boolean }[] {
  const v = f.vehicle, at = carOffsets(v), open = !!f.berth && f.doors >= v.doors.open;
  return v.cars.flatMap((c, i) => c.doors.map(d => ({ id: c.id + '.' + d.id, car: c.id, x: f.part.dx + at[i] + d.x, w: d.w, h: f.part.dh + (d.h ?? 0), open })));
}
/** Each seat in the active zone's units (where a rider sits; a people flow's `sit`). */
export const vehicleSeatsAt = (f: VehicleFrame) => f.vehicle.cars.flatMap((c, i) => c.seats.map(s => ({ id: c.id + '.' + s.id, x: f.part.dx + carOffsets(f.vehicle)[i] + s.x, h: f.part.dh + (s.h ?? 0) })));

// ---------- boarding and alighting (on the merged level: the zones' parts plus `f.part`) ----------

const covers = (fl: LevelFloor, x: number, h: number) => near(fl.h, h, 2) && x >= fl.x - 0.5 && x <= fl.x + fl.w + 0.5;
const doorAt = (f: VehicleFrame, x: number, h: number) => vehicleDoorsAt(f).find(d => d.open && near(d.h, h, 2) && Math.abs(x - d.x) <= d.w / 2 + 4);
/** Is a landing floor one the vehicle may be used from (a lift inside a building: only that building's floors)? */
const usableFrom = (f: VehicleFrame, fl: LevelFloor) => !f.vehicle.inside || fl.building === (fl.zone ? fl.zone + '/' + f.vehicle.inside : f.vehicle.inside);

/**
 * Stepping aboard: the player on a floor `floor` (of the merged level) at x, at an open door of a vehicle standing at a berth,
 * the door over that floor. Returns the car floor (merged id) the player now stands on, or undefined.
 */
export function boardAt(level: LevelSource, f: VehicleFrame, floor: string, x: number): string | undefined {
  if(f.boarding===false)return undefined;
  const here = level.floors.find(o => o.id === floor);
  if (!here || here.zone === f.vehicle.id || !covers(here, x, here.h) || !usableFrom(f, here)) return undefined;
  const d = doorAt(f, x, here.h); if (!d) return undefined;
  return level.floors.find(o => o.zone === f.vehicle.id && covers(o, x, d.h))?.id;
}
/** Stepping off: the player on a car floor at an open door; returns the landing floor outside it (outdoors first), or undefined. */
export function alightAt(level: LevelSource, f: VehicleFrame, floor: string, x: number): string | undefined {
  const here = level.floors.find(o => o.id === floor);
  if (!here || here.zone !== f.vehicle.id) return undefined;
  const d = doorAt(f, x, here.h); if (!d) return undefined;
  const out = level.floors.filter(o => o.zone !== f.vehicle.id && covers(o, x, d.h) && usableFrom(f, o));
  return (out.find(o => !o.building) ?? out[0])?.id;
}
/**
 * Carrying the player aboard: their place in the vehicle's frame is kept, so they move exactly as the vehicle moved
 * between two frames (no drift). Both frames are in the same active zone's units; a re-based origin is shifted separately.
 */
export function carry(prev: VehicleFrame, next: VehicleFrame, p: { x: number; y: number }) {
  p.x += next.part.dx - prev.part.dx; p.y += next.part.dh - prev.part.dh;
}

// ---------- a lift cabin as a vehicle ----------

/**
 * A level lift as a vehicle: one cabin the shaft's width (anchored at its left wall), one door as wide, its mover's
 * position the cabin's height (a leg straight up the shaft, `origin` its bottom), a berth at every stop, doors from the
 * trip and stepping through only once they are nearly open (as `car()`'s `ready`). Undefined for a broken or unpowered lift.
 * `zone`: the zone the lift is in, as the route names it.
 */
export function liftVehicle(lift: LevelLift, zone: string): VehicleSource | undefined {
  if (!lift.device || lift.broken) return undefined;
  const x = lift.x - lift.w / 2, top = lift.bottom + Math.max(lift.height, ...lift.stops.map(s => s.h - lift.bottom));
  return {
    id: 'lift.' + lift.id, kind: 'lift', mover: lift.device, doors: { trip: lift.doorMs ?? 280, open: 0.9 },
    cars: [{ id: 'cabin', width: lift.w, doors: [{ id: 'door', x: lift.w / 2, w: lift.w }], seats: [] }],
    route: { origin: lift.bottom, legs: [{ zone, from: { x, h: lift.bottom }, to: { x, h: top }, length: top - lift.bottom, facing: 1 }] },
    berths: lift.stops.map(s => ({ id: s.floor, zone, x, h: s.h, floor: s.floor })),
    ...(lift.inside ? { inside: lift.inside } : {}),
  };
}

// ---------- the source's shape ----------

const pt = (o: unknown, where: string): ZonePoint => { const p = o as Partial<ZonePoint> | null; if (!p || !finite(p.x) || !finite(p.h)) throw new Error(`${where}: a point is { x, h }`); return { x: p.x, h: p.h }; };
const idOk = (s: unknown) => typeof s === 'string' && /^[a-z0-9][a-z0-9.-]*$/.test(s);

/** A vehicle source's shape (types, ids, cars, route); `routeProblems` checks it against the zone graph. */
export function validateVehicle(value: unknown): VehicleSource {
  const v = value as Partial<VehicleSource> | null, at = `vehicle ${typeof v?.id === 'string' ? v.id : '?'}`;
  if (!v || !idOk(v.id)) throw new Error(`${at}: id is lower-case letters, digits, dots and dashes`);
  if (!VEHICLE_KINDS.includes(v.kind as VehicleKind)) throw new Error(`${at}: kind is one of ${VEHICLE_KINDS.join(', ')}`);
  if (typeof v.mover !== 'string' || !/^[^.]+\.[^.]+$/.test(v.mover)) throw new Error(`${at}: mover is device.noun`);
  if(v.boardQuery!==undefined&&(typeof v.boardQuery!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(v.boardQuery)))throw Error(`${at}: boarding query names a shared gameplay query`);
  if(v.presenceQuery!==undefined&&(typeof v.presenceQuery!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(v.presenceQuery)))throw Error(`${at}: presence query names a shared gameplay query`);
  const d = v.doors as Partial<{ mover: string; trip: number; open: number }> | undefined;
  if (!d || !finite(d.open) || d.open <= 0 || d.open > 1 || (typeof d.mover !== 'string' && !(finite(d.trip) && d.trip > 0))) throw new Error(`${at}: doors is { mover, open } or { trip, open } with open in (0, 1]`);
  if (!Array.isArray(v.cars) || !v.cars.length) throw new Error(`${at}: a vehicle has at least one car`);
  const ids = new Set<string>();
  for (const c of v.cars) {
    if (!idOk(c?.id) || ids.has(c.id)) throw new Error(`${at}: each car has its own id`); ids.add(c.id);
    if (!finite(c.width) || c.width <= 0) throw new Error(`${at} car ${c.id}: width is a positive number`);
    if (!Array.isArray(c.doors) || !Array.isArray(c.seats)) throw new Error(`${at} car ${c.id}: doors and seats are lists`);
    for (const f of c.floors ?? []) if (!idOk(f.id) || !finite(f.x) || !finite(f.w) || f.w<=0 || !finite(f.h) || f.x < -0.5 || f.x + f.w > c.width + 0.5) throw new Error(`${at} car ${c.id}: floor ${f?.id} lies within the car`);
    for(const list of [c.doors,c.seats]){const keys=new Set<string>();for (const k of list) {
      if (!idOk(k?.id) || keys.has(k.id) || !finite(k.x) || k.x < 0 || k.x > c.width || k.h!==undefined&&!finite(k.h)) throw new Error(`${at} car ${c.id}: ${k?.id} needs a unique id and lies within the car`);
      keys.add(k.id);
    }}
    for(const door of c.doors)if(!finite(door.w)||door.w<=0)throw new Error(`${at} car ${c.id}: door width is positive`);
    for(const seat of c.seats)if((seat.artwork===undefined)!==(seat.anchor===undefined)||seat.artwork!==undefined&&(!idOk(seat.artwork)||!idOk(seat.anchor)))throw new Error(`${at} car ${c.id}: a linked seat names artwork and anchor`);
  }
  if (v.gap !== undefined && (!finite(v.gap) || v.gap < 0)) throw new Error(`${at}: gap is a number ≥ 0`);
  const r = v.route as Partial<VehicleRoute> | undefined;
  if (!r || !Array.isArray(r.legs) || !r.legs.length) throw new Error(`${at}: a route has at least one leg`);
  for (const [i, l] of r.legs.entries()) {
    const w = `${at} leg ${i}`;
    if (typeof l?.zone !== 'string' || !l.zone) throw new Error(`${w}: names its zone`);
    pt(l.from, w); pt(l.to, w); if (l.via) pt(l.via, w);
    if (l.via && l.drop) throw new Error(`${w}: a leg curves through via or drops, not both`);
    if (l.length !== undefined && (!finite(l.length) || l.length <= 0)) throw new Error(`${w}: length is a positive number`);
  }
  if (!Array.isArray(v.berths)) throw new Error(`${at}: berths is a list`);
  for (const b of v.berths) if (!idOk(b?.id) || typeof b.zone !== 'string' || !finite(b.x) || (b.h !== undefined && !finite(b.h))) throw new Error(`${at}: berth ${b?.id} is { id, zone, x, h? }`);
  return v as VehicleSource;
}
