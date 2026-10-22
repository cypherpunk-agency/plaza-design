/**
 * People flows (docs/design/SEAMLESS-WORLD.md §5, step 6): people who walk a route across zones, wait, queue
 * and board vehicles. **A spike: a pure model, not yet wired.** Nothing here keeps state or runs a loop; the
 * game loop (or an editor preview) asks "who is where at time t" and draws the answer.
 *
 * - A **flow** is source: a route of waypoints (walk, wait, queue, board, leave) whose points may lie in
 *   different zones joined by seams (world/zone-graph.ts), a spawn rule (an interval with a rate by hour,
 *   a cohort per vehicle trip, people stepping off a vehicle, or a routine such as "leaves home 07:40"), a
 *   look pool and a seed.
 * - **Every person is a pure function of seed and time** (`personAt`). Person `index` of a flow always has the
 *   same look, speed and schedule. Queues are worked out per release batch (all people waiting for one trip
 *   or one gate opening), so order and spacing are pure too.
 * - **On-screen state** is only what the pure schedule cannot know: a person held up on screen (talked to,
 *   blocked) stands for the hold and then runs that much behind it (`hold`, `Lags`). `remember` keeps those people, and who was on screen, for
 *   `PEOPLE_MEMORY` seconds after their zone unloads; `recall` gives them back inside that window and nothing
 *   after it, when the pure schedule (new people) takes over.
 * - **Boarding hands a person to a vehicle** (`state: 'aboard'`, with the vehicle id, trip and door). From
 *   there the vehicle owns them (seats, standing, alighting). `handedOff` lists who boarded a trip, which is the
 *   car's manifest, so the same people are seen on the platform and inside.
 *
 * Time is **flow seconds**: real seconds as the player experiences them. A `scene`-clock flow (a platform tied
 * to today's timetable, which runs on the station scene's time) uses `sceneFlowTime`; a `city`-clock flow
 * (routines, ambient walkers by hour) uses `cityFlowTime`, so a routine at 07:40 is where the city clock says
 * and still walks at walking speed (the clock runs CLOCK_RATE game minutes per real second).
 *
 * Limits of the spike: one queue or board waypoint per route; consecutive waypoints lie in the same zone or in
 * zones joined directly by a seam; a vehicle's doors at a stop lie in the board waypoint's zone.
 */

import {CLOCK_RATE, DAY_MIN, parseHM} from './clock';
import {seamsOf, type SeamKind, type ZoneGraphSource} from './zone-graph';

/** How long people last on screen are remembered after their zone unloads (flow seconds, about a minute). */
export const PEOPLE_MEMORY = 60;
/** A proposed density cap per visible zone (§5). */
export const PEOPLE_CAP = 12;
/** Walking speed, units per second (the player walks at about 1.6 units a frame; people stroll slower). */
export const WALK_SPEED = 38;

// ---------- time ----------

/** Flow seconds for city minutes since day 1, 00:00 (`city.abs`): real seconds of play at CLOCK_RATE. */
export const cityFlowTime = (absMin: number) => absMin / CLOCK_RATE;
/** City minutes since day 1, 00:00 for flow seconds (the inverse of `cityFlowTime`). */
export const flowCityMin = (t: number) => t * CLOCK_RATE;
/** The hour of day (0–23) at flow seconds `t` on the city clock. */
export const flowHour = (t: number) => Math.floor((((flowCityMin(t) % DAY_MIN) + DAY_MIN) % DAY_MIN) / 60);
/** Flow seconds of a time of day ("07:40") on `day` (1, 2, …). */
export function routineTime(at: string, day: number): number {
  const m = parseHM(at);
  if (m === null) throw new Error(`people flow: "${at}" is not a time of day (HH:MM)`);
  return cityFlowTime((day - 1) * DAY_MIN + m);
}
/** Flow seconds of a station scene's platform timeline (frames of scene time plus its `platformShift`, world/transport/line.ts). */
export const sceneFlowTime = (tl: {t: number; shift: number}, fps = 60) => (tl.t + tl.shift) / fps;

// ---------- source ----------

/** A point on a zone's floor, in that zone's local units. */
export interface FlowPoint {zone: string; x: number; h?: number}
/** Walk to the point. */
export interface WalkPoint extends FlowPoint {kind: 'walk'}
/** Walk to the point and stand there `dwell` seconds. */
export interface WaitPoint extends FlowPoint {kind: 'wait'; dwell: number}
/**
 * A line of `slots` places, `spacing` apart, its head at the point and its tail towards `dir` (default: back
 * the way people come). People stand in arrival order and shuffle forward; a batch is let through one person
 * every `gap` seconds.
 */
export interface QueueShape {slots: number; spacing: number; gap: number; dir?: 1 | -1}
/** A queue at a gate or a kiosk: let through at every multiple of `every` seconds. */
export interface QueuePoint extends FlowPoint, QueueShape {kind: 'queue'; every: number}
/** A queue for a vehicle: let through when its doors open; each walks to the nearest door and is handed to the vehicle. */
export interface BoardPoint extends FlowPoint, QueueShape {kind: 'board'; vehicle: string}
/** Walk to the point (an edge or a door) and go out of view. */
export interface LeavePoint extends FlowPoint {kind: 'leave'}
export type Waypoint = WalkPoint | WaitPoint | QueuePoint | BoardPoint | LeavePoint;

/** Who a flow brings, and when. */
export type FlowSpawn =
  /** One person every `every` seconds (±`jitter` of it), kept with the probability `byHour[hour]` (city clock). */
  | {kind: 'interval'; every: number; jitter?: number; byHour?: readonly number[]}
  /** A cohort for each trip of a vehicle: `count` places, each filled with probability `on`, walking in spread over `window` (seconds relative to the doors opening). */
  | {kind: 'trip'; vehicle: string; count: number; on: number; window: readonly [number, number]}
  /** People stepping off a vehicle when its doors open: `count` places, each filled with probability `on`, `gap` seconds apart. */
  | {kind: 'alight'; vehicle: string; count: number; on: number; gap: number}
  /** One person, the same every day, setting off at a time of day (on the listed days, else every day). */
  | {kind: 'routine'; at: string; days?: readonly number[]};

export interface FlowSource {
  id: string;
  /** `scene`: flow seconds from the zone's scene time (timetabled platforms). `city`: from the city clock. */
  clock: 'city' | 'scene';
  seed: number;
  spawn: FlowSpawn;
  /** The route. Its first point is where people appear (except `alight`, who appear at a door). */
  route: readonly Waypoint[];
  /** Looks to pick from (rider kinds or archetype ids; the drawing side decides what they mean). */
  looks: readonly string[];
  /** Walking speed, units per second (default WALK_SPEED); each person varies it by ±15 %. */
  speed?: number;
  /** The longest a person may stand waiting for a release, seconds (default 120): bounds the look-back. */
  maxWait?: number;
}

// ---------- vehicles (the interface this model needs; world/vehicles.ts owns vehicles) ----------

/** One stop of a vehicle with its doors open: trip number, when they open and close, where the doors are. */
export interface DoorWindow {trip: number; open: number; close: number; doors: readonly FlowPoint[]}
/**
 * What a flow needs from a vehicle at one stop. Minimal on purpose; world/vehicles.ts is expected to provide
 * it (or an adapter) for each berth. Times are flow seconds on the flow's clock.
 */
export interface FlowVehicle {
  id: string;
  /** The trip whose doors close next after `t` (doors closing exactly at `t` belong to the next trip). */
  tripAt(t: number): number;
  /** That trip's door window here, or null when it does not stop (a closed station). */
  doors(trip: number): DoorWindow | null;
}

/** What the model reads about the world: the zone graph (seam offsets) and the vehicles by id. */
export interface FlowWorld {graph: ZoneGraphSource; vehicles: Readonly<Record<string, FlowVehicle>>}

/**
 * A FlowVehicle from a station's timetable as world/transport/line.ts runs it today (frames of the station
 * scene's time): trip n runs in from frame n·loop − offset, stands `dwell`, leaves. The doors read open from
 * 7.5 % into the dwell until 7.5 % before its end (line.ts `platformOpen`: open > 0.6). Doors at `doors` (x).
 */
export function timetableVehicle(o: {id: string; zone: string; timetable: {loop: number; arrive: number; dwell: number; leave: number}; offset: number; doors: readonly number[]; fps?: number; stops?: (trip: number) => boolean}): FlowVehicle {
  const fps = o.fps ?? 60, T = o.timetable, start = (n: number) => (n * T.loop - o.offset) / fps;
  const open = (n: number) => start(n) + (T.arrive + 0.075 * T.dwell) / fps, close = (n: number) => start(n) + (T.arrive + 0.925 * T.dwell) / fps;
  return {
    id: o.id,
    tripAt(t) { let n = Math.floor((t * fps + o.offset) / T.loop); while (close(n) <= t) n++; while (close(n - 1) > t) n--; return n; },
    doors(n) { return o.stops && !o.stops(n) ? null : {trip: n, open: open(n), close: close(n), doors: o.doors.map(x => ({zone: o.zone, x}))}; },
  };
}

// ---------- people ----------

/** A person on a floor. `step`: index of the waypoint they are heading for or standing at. */
export interface PersonHere {state: 'here'; key: string; flow: string; index: number; look: string; phase: number; zone: string; x: number; h: number; facing: 1 | -1; act: 'walk' | 'stand' | 'queue'; step: number}
/** A person handed to a vehicle: from here the vehicle owns them. */
export interface PersonAboard {state: 'aboard'; key: string; flow: string; index: number; look: string; phase: number; vehicle: string; trip: number; door: number}
export type Person = PersonHere | PersonAboard;
/** A person held up on screen: standing still from `from` for `seconds` (talked to, blocked by a barrier). */
export interface Hold {from: number; seconds: number}
/** The holds of people held up on screen, by key: the only on-screen state the pure schedule cannot know. */
export type Lags = ReadonlyMap<string, readonly Hold[]>;

/** A held person's own clock: real time less the time spent held so far. Without holds it is `t`. */
export const ownTime = (holds: readonly Hold[] | undefined, t: number) => t - (holds ?? []).reduce((s, h) => s + Math.min(h.seconds, Math.max(0, t - h.from)), 0);
/** The real time at which a held person's own clock reads `own` (the inverse of `ownTime`). */
export function realTime(holds: readonly Hold[] | undefined, own: number): number {
  let t = own;
  for (const h of [...(holds ?? [])].sort((a, b) => a.from - b.from)) if (h.from < t) t += h.seconds;
  return t;
}

export const personKey = (flow: string, index: number) => flow + '#' + index;

/** A small seeded hash in [0, 1). Pure, no shared generator. */
function rand(...n: number[]): number {
  let h = 0x811c9dc5;
  for (const v of n) { h = Math.imul(h ^ (Math.floor(v) | 0), 0x01000193); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; }
  h = Math.imul(h ^ (h >>> 16), 0x297a2d39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
const strSeed = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = Math.imul(h, 31) + s.charCodeAt(i) | 0; return h; };

interface Basics {index: number; key: string; look: string; phase: number; speed: number; spawn: number; on: boolean; start: FlowPoint; trip?: number}

/** Who person `index` is and when they set off (before any lag). */
function basics(flow: FlowSource, world: FlowWorld, index: number): Basics {
  const s = flow.spawn, r = (k: number) => rand(flow.seed, index, k), fixed = s.kind === 'routine';
  const u = (k: number) => fixed ? rand(flow.seed, k) : r(k);
  const look = flow.looks[Math.floor(u(1) * flow.looks.length)] ?? 'commuter', phase = Math.floor(u(2) * 1000) / 100;
  const speed = (flow.speed ?? WALK_SPEED) * (0.85 + 0.3 * u(3)), key = personKey(flow.id, index), start = flow.route[0];
  const base = {index, key, look, phase, speed, start};
  if (s.kind === 'interval') {
    const spawn = (index + (s.jitter ?? 0) * (r(4) - 0.5)) * s.every;
    return {...base, spawn, on: !s.byHour || r(5) < (s.byHour[flowHour(spawn)] ?? 0)};
  }
  if (s.kind === 'routine') {
    const day = index, spawn = routineTime(s.at, day);
    return {...base, spawn, on: day >= 1 && (!s.days || s.days.includes(day))};
  }
  const v = vehicle(world, s.vehicle), trip = Math.floor(index / s.count), slot = index - trip * s.count, w = v.doors(trip);
  const on = !!w && r(5) < s.on;
  if (s.kind === 'trip') {
    const at = w ? w.open : 0;
    return {...base, trip, spawn: at + s.window[0] + (s.window[1] - s.window[0]) * ((slot + r(4)) / s.count), on};
  }
  const door = w?.doors[slot % Math.max(1, w.doors.length)];
  return {...base, trip, spawn: (w ? w.open : 0) + slot * s.gap, on: on && !!door, start: door ?? start};
}

const vehicle = (world: FlowWorld, id: string) => {
  const v = world.vehicles[id];
  if (!v) throw new Error(`people flow: no vehicle ${id}`);
  return v;
};

// ---------- geometry across seams ----------

/** Where zone `zone`'s origin sits in zone `frame`'s units, and the seam between them. */
function offset(world: FlowWorld, zone: string, frame: string): {dx: number; dh: number; kind: SeamKind | null} {
  if (zone === frame) return {dx: 0, dh: 0, kind: null};
  const s = seamsOf(world.graph, frame).find(e => e.other === zone);
  if (!s) throw new Error(`people flow: ${zone} and ${frame} are not joined by a seam`);
  return {dx: s.dx, dh: s.dh, kind: s.seam.kind};
}

/**
 * A point on the walk from `a` to `b`, given in `b`'s units, as a point in the zone that owns it. Over a walk
 * seam the zone changes at the shared edge; on stairs and through doors at the midpoint (`f` ≥ 0.5), as the
 * player's "here" does (§2 "Which zone is here").
 */
function locate(world: FlowWorld, a: FlowPoint, b: FlowPoint, x: number, h: number, f: number): {zone: string; x: number; h: number} {
  if (a.zone === b.zone) return {zone: b.zone, x, h};
  const o = offset(world, a.zone, b.zone);
  const inB = o.kind === 'walk' ? (o.dx < 0 ? x >= 0 : x < o.dx) : f >= 0.5;
  return inB ? {zone: b.zone, x, h} : {zone: a.zone, x: x - o.dx, h: h - o.dh};
}

/** `a` in `b`'s units. */
function inFrame(world: FlowWorld, a: FlowPoint, frame: string): {x: number; h: number} {
  const o = offset(world, a.zone, frame);
  return {x: a.x + o.dx, h: (a.h ?? 0) + o.dh};
}

const dist = (world: FlowWorld, a: FlowPoint, b: FlowPoint) => { const p = inFrame(world, a, b.zone); return Math.abs((b.x) - p.x) + Math.abs((b.h ?? 0) - p.h); };

/** A leg of a plan: walk from `a` to `b` (or stand at `a` when `b` is undefined) from `t0` to `t1`. */
interface Leg {t0: number; t1: number; a: FlowPoint; b?: FlowPoint; step: number; act: 'walk' | 'stand'}

/** Walk the waypoints from `start`, from `t`; stops before a queue or board. */
function walkLegs(world: FlowWorld, start: FlowPoint, route: readonly Waypoint[], from: number, to: number, t: number, speed: number): {legs: Leg[]; at: FlowPoint; t: number; left: boolean} {
  const legs: Leg[] = [];
  let at = start;
  for (let i = from; i < to; i++) {
    const w = route[i], d = dist(world, at, w);
    if (d > 0) { legs.push({t0: t, t1: t + d / speed, a: at, b: w, step: i, act: 'walk'}); t += d / speed; }
    at = w;
    if (w.kind === 'wait') { legs.push({t0: t, t1: t + w.dwell, a: w, step: i, act: 'stand'}); t += w.dwell; }
    if (w.kind === 'leave') return {legs, at, t, left: true};
  }
  return {legs, at, t, left: false};
}

function legPose(world: FlowWorld, leg: Leg, t: number, facing: 1 | -1): {zone: string; x: number; h: number; facing: 1 | -1} {
  if (!leg.b) return {zone: leg.a.zone, x: leg.a.x, h: leg.a.h ?? 0, facing};
  const f = leg.t1 > leg.t0 ? Math.min(1, Math.max(0, (t - leg.t0) / (leg.t1 - leg.t0))) : 1, p = inFrame(world, leg.a, leg.b.zone);
  const x = p.x + (leg.b.x - p.x) * f, h = p.h + ((leg.b.h ?? 0) - p.h) * f;
  return {...locate(world, leg.a, leg.b, x, h, f), facing: leg.b.x === p.x ? facing : leg.b.x > p.x ? 1 : -1};
}

// ---------- queues: worked out per release batch ----------

const heldAt = (route: readonly Waypoint[]) => route.findIndex(w => w.kind === 'queue' || w.kind === 'board');

/** The head of the queue's tail direction: back the way people come, unless the point says. */
function tailDir(world: FlowWorld, q: QueuePoint | BoardPoint, from: FlowPoint): 1 | -1 {
  if (q.dir) return q.dir;
  return inFrame(world, from, q.zone).x >= q.x ? 1 : -1;
}

/** `t0`, `arrive`: on the person's own clock; `reach`: the real time they would reach the queue's head. */
interface Approach {b: Basics; t0: number; arrive: number; reach: number; from: FlowPoint; legs: Leg[]}

/** Person's walk up to the queue: the legs before it, the last stretch's start, and when they would reach its head. */
function approach(flow: FlowSource, world: FlowWorld, b: Basics, holds: readonly Hold[] | undefined): Approach | null {
  const q = heldAt(flow.route), first = flow.spawn.kind === 'alight' ? 0 : 1;
  const pre = walkLegs(world, b.start, flow.route, first, q, b.spawn, b.speed);
  if (pre.left) return null;
  const head = flow.route[q], arrive = pre.t + dist(world, pre.at, head) / b.speed;
  return {b, t0: pre.t, arrive, reach: realTime(holds, arrive), from: pre.at, legs: pre.legs};
}

interface Member {a: Approach; order: number; release: number}
export interface Batch {batch: number; open: number; close: number; members: Member[]; door?: DoorWindow}

/** A release batch's key for an arrival at the queue head. */
function batchOf(flow: FlowSource, world: FlowWorld, arrive: number): {n: number; open: number; close: number; door?: DoorWindow} | null {
  const q = flow.route[heldAt(flow.route)] as QueuePoint | BoardPoint, margin = q.slots * q.gap;
  if (q.kind === 'queue') { const n = Math.floor(arrive / q.every) + 1; return {n, open: n * q.every, close: (n + 1) * q.every}; }
  const v = vehicle(world, q.vehicle);
  for (let n = v.tripAt(arrive + margin), k = 0; k < 64; n++, k++) {
    const w = v.doors(n);
    if (w && w.close - margin > arrive) return {n, open: w.open, close: w.close, door: w};
  }
  return null;
}

/** The release batch before batch `n` (the previous gate opening, or the vehicle's previous stop here), or null. */
function previousBatch(flow: FlowSource, world: FlowWorld, n: number): {n: number; open: number; close: number; door?: DoorWindow} | null {
  const q = flow.route[heldAt(flow.route)] as QueuePoint | BoardPoint;
  if (q.kind === 'queue') return {n: n - 1, open: (n - 1) * q.every, close: n * q.every};
  const v = vehicle(world, q.vehicle);
  for (let k = n - 1; k > n - 64; k--) { const w = v.doors(k); if (w) return {n: k, open: w.open, close: w.close, door: w}; }
  return null;
}

/** Indices of people whose (lag-free) spawn time may fall in [t0, t1]: a superset, filtered by the caller. */
function candidates(flow: FlowSource, world: FlowWorld, t0: number, t1: number): number[] {
  const s = flow.spawn, out: number[] = [];
  if (s.kind === 'interval') { for (let i = Math.floor(t0 / s.every) - 1; i <= Math.ceil(t1 / s.every) + 1; i++) out.push(i); return out; }
  if (s.kind === 'routine') { const d0 = Math.floor(flowCityMin(t0) / DAY_MIN), d1 = Math.floor(flowCityMin(t1) / DAY_MIN) + 1; for (let d = Math.max(1, d0); d <= d1 + 1; d++) out.push(d); return out; }
  const v = vehicle(world, s.vehicle), lead = s.kind === 'trip' ? Math.min(0, s.window[0]) : 0;
  for (let n = v.tripAt(t0 - 1) - 1; n <= v.tripAt(t1 - lead + 1) + 1; n++) for (let k = 0; k < s.count; k++) out.push(n * s.count + k);
  return out;
}

/** The longest walk before the queue, seconds, at the slowest speed (bounds the look-back for a batch). */
function preSpan(flow: FlowSource, world: FlowWorld): number {
  const q = heldAt(flow.route), slow = (flow.speed ?? WALK_SPEED) * 0.85;
  if (flow.spawn.kind === 'alight') return 0;
  const w = walkLegs(world, flow.route[0], flow.route, 1, q < 0 ? flow.route.length : q, 0, slow);
  return w.t + (q >= 0 ? dist(world, w.at, flow.route[q]) / slow : 0);
}

const maxLag = (lags?: Lags) => { let m = 0; lags?.forEach(v => { m = Math.max(m, v.reduce((s, h) => s + h.seconds, 0)); }); return m; };

/** Everyone in one release batch, in queue order, with the time each is let through (pure; cached per call). */
function batch(flow: FlowSource, world: FlowWorld, n: number, key: {open: number; close: number; door?: DoorWindow}, lags: Lags | undefined, cache: Map<string, Batch>): Batch {
  const id = flow.id + '@' + n, hit = cache.get(id);
  if (hit) return hit;
  const q = flow.route[heldAt(flow.route)] as QueuePoint | BoardPoint, margin = q.slots * q.gap;
  const prev = q.kind === 'queue' ? key.open - q.every : (() => { const v = vehicle(world, q.vehicle); for (let k = n - 1; k > n - 64; k--) { const w = v.doors(k); if (w) return w.close; } return key.open - 3600; })();
  const span = preSpan(flow, world) + maxLag(lags) + 1, all: Approach[] = [];
  for (const i of candidates(flow, world, prev - margin - span, key.close)) {
    const b = basics(flow, world, i);
    if (!b.on) continue;
    const a = approach(flow, world, b, lags?.get(b.key));
    if (a && batchOf(flow, world, a.reach)?.n === n) all.push(a);
  }
  all.sort((x, y) => x.reach - y.reach || x.b.index - y.b.index);
  const members: Member[] = [];
  let last = -Infinity;
  for (const a of all.slice(0, q.slots)) { const release = Math.max(key.open, a.reach, last + q.gap); members.push({a, order: members.length, release}); last = release; }
  const out: Batch = {batch: n, open: key.open, close: key.close, members, ...(key.door ? {door: key.door} : {})};
  cache.set(id, out);
  return out;
}

const toward = (from: number, to: number, by: number) => from < to ? Math.min(to, from + by) : Math.max(to, from - by);

/**
 * Person `index` of a flow at flow seconds `t`: on a floor (`here`), handed to a vehicle (`aboard`), or null
 * (not yet set off, gone, not in this flow's draw, or turned away from a full queue). Pure: the same seed,
 * index, time and lags always give the same answer.
 */
export function personAt(flow: FlowSource, world: FlowWorld, index: number, t: number, lags?: Lags, cache = new Map<string, Batch>()): Person | null {
  const b = basics(flow, world, index), holds = lags?.get(b.key), own = ownTime(holds, t);
  if (!b.on || own < b.spawn) return null;
  const who = {key: b.key, flow: flow.id, index, look: b.look, phase: b.phase};
  const here = (p: {zone: string; x: number; h: number; facing: 1 | -1}, act: PersonHere['act'], step: number): PersonHere => ({state: 'here', ...who, ...p, act, step});
  const q = heldAt(flow.route);
  /** Pose along `legs` at time `at` (the person's own clock before a queue, real time after it). */
  const plain = (legs: Leg[], end: FlowPoint, endT: number, left: boolean, step: number, at: number): Person | null => {
    let facing: 1 | -1 = 1;
    for (const leg of legs) {
      const p = legPose(world, leg, Math.min(at, leg.t1), facing);
      facing = p.facing;
      if (at < leg.t1) return here(p, leg.act === 'walk' && holds?.some(h => t >= h.from && t < h.from + h.seconds) ? 'stand' : leg.act, leg.step);
    }
    if (left && at >= endT) return null;
    return here({zone: end.zone, x: end.x, h: end.h ?? 0, facing}, 'stand', step);
  };
  if (q < 0) {
    const w = walkLegs(world, b.start, flow.route, flow.spawn.kind === 'alight' ? 0 : 1, flow.route.length, b.spawn, b.speed);
    return plain(w.legs, w.at, w.t, w.left, flow.route.length - 1, own);
  }
  const a = approach(flow, world, b, holds);
  if (!a) return null;
  // whether they are in this flow's draw is decided before they set off: someone turned away never appears
  const key = batchOf(flow, world, a.reach);
  const bt = key ? batch(flow, world, key.n, key, lags, cache) : null, me = bt?.members.find(m => m.a.b.index === index);
  if (bt && !me) return null; // the queue would be full when they got there
  if (own < a.t0) return plain(a.legs, a.from, a.t0, false, q, own);
  const head = flow.route[q] as QueuePoint | BoardPoint, dir = tailDir(world, head, a.from), slot = (s: number) => head.x + dir * head.spacing * s;
  const f = (tt: number) => Math.min(1, Math.max(0, (ownTime(holds, tt) - a.t0) / Math.max(1e-6, a.arrive - a.t0)));
  const from = inFrame(world, a.from, head.zone), walkX = (tt: number) => from.x + (head.x - from.x) * f(tt), walkH = (tt: number) => from.h + ((head.h ?? 0) - from.h) * f(tt);
  const face: 1 | -1 = head.x === from.x ? 1 : head.x > from.x ? 1 : -1;
  if (!bt || !me) { // no service: stand at the tail of an endless wait (a closed line)
    const x = dir > 0 ? Math.max(walkX(t), slot(head.slots - 1)) : Math.min(walkX(t), slot(head.slots - 1));
    return here({...locate(world, a.from, head, x, walkH(t), 1), facing: face}, x === walkX(t) && t < a.reach ? 'walk' : 'queue', q);
  }
  // the last batch's stragglers still stand in front (they are all let through before this batch's release)
  const before = previousBatch(flow, world, bt.batch), prev = before ? batch(flow, world, before.n, before, lags, cache).members : [];
  const ahead = [...prev, ...bt.members.slice(0, me.order)], order = prev.length + me.order;
  /** Where they stand in the queue frame at time `tt` ≤ their release: the walk in, or their slot, whichever is further back. */
  const queuedX = (tt: number) => {
    const gone = ahead.filter(m => m.release <= tt).length, s = order - gone;
    const since = gone > 0 ? ahead[gone - 1].release : -Infinity, shuffle = toward(slot(s + 1), slot(s), me.a.b.speed * (tt - since));
    const target = gone > 0 ? shuffle : slot(s), w = walkX(tt);
    return dir > 0 ? Math.max(w, target) : Math.min(w, target);
  };
  if (t < me.release) {
    const x = queuedX(t), moving = Math.abs(x - queuedX(t - 0.05)) > 1e-3;
    return here({...locate(world, a.from, head, x, walkH(t), f(t)), facing: face}, moving ? 'walk' : 'queue', q);
  }
  const out: FlowPoint = {zone: head.zone, x: queuedX(me.release), h: walkH(me.release)};
  if (head.kind === 'board') {
    const doors = bt.door?.doors ?? [];
    let door = 0;
    doors.forEach((d, i) => { if (Math.abs(d.x - out.x) < Math.abs(doors[door].x - out.x)) door = i; });
    const to = doors[door] ?? out, reach = me.release + Math.abs(to.x - out.x) / me.a.b.speed;
    if (t >= reach) return {state: 'aboard', ...who, vehicle: head.vehicle, trip: bt.batch, door};
    return plain([{t0: me.release, t1: reach, a: out, b: to, step: q, act: 'walk'}], to, reach, false, q, t);
  }
  // after the queue the walk runs on real time: holds after a release are not modelled in the spike
  const w = walkLegs(world, out, flow.route, q + 1, flow.route.length, me.release, me.a.b.speed);
  return plain(w.legs, w.at, w.t, w.left, flow.route.length - 1, t);
}

/** The longest a person of this flow can be about, seconds (bounds which indices `populate` asks). */
function lifeSpan(flow: FlowSource, world: FlowWorld): number {
  const slow = (flow.speed ?? WALK_SPEED) * 0.85, w = walkLegs(world, flow.route[0], flow.route, 1, flow.route.length, 0, slow);
  return w.t + (heldAt(flow.route) >= 0 ? flow.maxWait ?? 120 : 0) + (flow.spawn.kind === 'routine' ? 0 : 1);
}

/** Every person of a flow on a floor at `t` (any zone), or aboard. */
export function flowPeople(flow: FlowSource, world: FlowWorld, t: number, lags?: Lags, cache = new Map<string, Batch>()): Person[] {
  const out: Person[] = [], seen = new Set<number>();
  for (const i of candidates(flow, world, t - lifeSpan(flow, world) - maxLag(lags), t)) {
    if (seen.has(i)) continue; seen.add(i);
    const p = personAt(flow, world, i, t, lags, cache);
    if (p) out.push(p);
  }
  return out;
}

/**
 * The people standing or walking in `zone` at `t`, over all flows, at most `cap` (default PEOPLE_CAP). People
 * in `keep` (those on screen, or remembered) are kept first; the rest are picked by a hash of their key, so
 * the pick is stable from frame to frame.
 */
export function populate(flows: readonly FlowSource[], world: FlowWorld, zone: string, t: number, o: {lags?: Lags; keep?: ReadonlySet<string>; cap?: number} = {}): PersonHere[] {
  const cache = new Map<string, Batch>(), all: PersonHere[] = [];
  for (const f of flows) for (const p of flowPeople(f, world, t, o.lags, cache)) if (p.state === 'here' && p.zone === zone) all.push(p);
  const rank = (p: PersonHere) => (o.keep?.has(p.key) ? 0 : 1) + rand(strSeed(p.key), 99);
  return all.sort((a, b) => rank(a) - rank(b)).slice(0, o.cap ?? PEOPLE_CAP).sort((a, b) => a.x - b.x || (a.key < b.key ? -1 : 1));
}

/** Who boarded a vehicle trip from this flow, in boarding order, with their doors: the car's manifest from this platform. */
export function handedOff(flow: FlowSource, world: FlowWorld, trip: number, lags?: Lags): PersonAboard[] {
  const q = heldAt(flow.route), head = flow.route[q];
  if (!head || head.kind !== 'board') return [];
  const w = vehicle(world, head.vehicle).doors(trip);
  if (!w) return [];
  const bt = batch(flow, world, trip, {open: w.open, close: w.close, door: w}, lags, new Map());
  return bt.members.map(m => personAt(flow, world, m.a.b.index, w.close, lags)).filter((p): p is PersonAboard => p?.state === 'aboard');
}

// ---------- on-screen state and the short memory ----------

/** A person on screen held up at `now` for `seconds` (talked to, blocked by a barrier): they stand, then carry on that much later. */
export const hold = (lags: Lags, key: string, now: number, seconds: number): Map<string, readonly Hold[]> =>
  new Map(lags).set(key, [...(lags.get(key) ?? []), {from: now, seconds: Math.max(0, seconds)}]);

/** The people last on screen in a zone: who they were, their holds, where they stood. A `SceneSave.people` candidate. */
export interface PeopleMemory {at: number; until: number; people: {key: string; holds: Hold[]; zone: string; x: number}[]}

/** Remember the people on screen when their zone stops being visible (or the page goes), for `window` seconds. */
export function remember(onScreen: readonly PersonHere[], lags: Lags, now: number, window = PEOPLE_MEMORY): PeopleMemory {
  return {at: now, until: now + window, people: onScreen.map(p => ({key: p.key, holds: [...(lags.get(p.key) ?? [])], zone: p.zone, x: p.x}))};
}

/**
 * Back within the memory: the same people (kept first by `populate`), still as late as their holds made them,
 * having carried on meanwhile (Decided 14: reloaded, not frozen). After it, or without one: null, and the pure
 * schedule gives whoever is there now.
 */
export function recall(memory: PeopleMemory | undefined, now: number): {lags: Map<string, readonly Hold[]>; keep: Set<string>} | null {
  if (!memory || now >= memory.until || now < memory.at) return null;
  return {lags: new Map(memory.people.filter(p => p.holds.length).map(p => [p.key, p.holds])), keep: new Set(memory.people.map(p => p.key))};
}

// ---------- today's platform queue as a flow ----------

/**
 * A flow that plays like today's `platformQueue` riders (world/transport/line.ts) at one door: a cohort of `count`
 * places per train, each filled with probability 0.55 as `crowd()` does, gathering after the last train has
 * gone, queueing at the door and all aboard by half the dwell, the moment `platformQueue` says `boarded`.
 * Instead of appearing and vanishing they walk in from `entry` and walk aboard.
 */
export function platformFlow(o: {id: string; zone: string; vehicle: string; entry: FlowPoint; door: number; count: number; seed: number; looks: readonly string[]; timetable: {loop: number; arrive: number; dwell: number; leave: number}; fps?: number}): FlowSource {
  const fps = o.fps ?? 60, T = o.timetable, open = T.arrive + 0.075 * T.dwell, gone = T.arrive + T.dwell + T.leave - T.loop;
  const from = (gone - open) / fps, boardBy = (T.arrive + 0.5 * T.dwell - open) / fps, gap = boardBy / (o.count + 0.5);
  return {
    id: o.id, clock: 'scene', seed: o.seed, looks: o.looks,
    spawn: {kind: 'trip', vehicle: o.vehicle, count: o.count, on: 0.55, window: [from, from * 0.4]},
    route: [{kind: 'walk', ...o.entry}, {kind: 'board', zone: o.zone, x: o.door, vehicle: o.vehicle, slots: o.count, spacing: 14, gap}],
  };
}

/** What is wrong with a flow against the world: unknown vehicles, waypoints in zones not joined by a seam, more than one queue, a queue that cannot board in time. */
export function flowProblems(flow: FlowSource, world: FlowWorld): string[] {
  const out: string[] = [], r = flow.route;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(flow.id)) out.push(`${flow.id}: id is lower-case letters, digits and dashes`);
  if (!r.length) out.push(`${flow.id}: a route needs at least one point`);
  if (!flow.looks.length) out.push(`${flow.id}: a look pool needs at least one look`);
  if (r.filter(w => w.kind === 'queue' || w.kind === 'board').length > 1) out.push(`${flow.id}: one queue or board point per route`);
  if (flow.spawn.kind === 'routine' && parseHM(flow.spawn.at) === null) out.push(`${flow.id}: routine time "${flow.spawn.at}" is not HH:MM`);
  if (flow.spawn.kind === 'routine' && flow.clock !== 'city' || flow.spawn.kind === 'interval' && flow.spawn.byHour && flow.clock !== 'city') out.push(`${flow.id}: routines and rates by hour run on the city clock`);
  if (flow.spawn.kind === 'interval' && flow.spawn.byHour && flow.spawn.byHour.length !== 24) out.push(`${flow.id}: a rate by hour has 24 values`);
  const ids = [flow.spawn.kind === 'trip' || flow.spawn.kind === 'alight' ? flow.spawn.vehicle : null, ...r.map(w => w.kind === 'board' ? w.vehicle : null)];
  for (const id of ids) if (id && !world.vehicles[id]) out.push(`${flow.id}: no vehicle ${id}`);
  for (let i = 1; i < r.length; i++) if (r[i].zone !== r[i - 1].zone && !seamsOf(world.graph, r[i - 1].zone).some(s => s.other === r[i].zone)) out.push(`${flow.id}: waypoints ${i - 1} (${r[i - 1].zone}) and ${i} (${r[i].zone}) are in zones not joined by a seam`);
  for (const w of r) if (w.kind === 'board' || w.kind === 'queue') {
    if (w.slots < 1 || w.gap <= 0 || w.spacing < 0) out.push(`${flow.id}: a queue has slots ≥ 1, gap > 0, spacing ≥ 0`);
    if (w.kind === 'queue' && w.every <= w.slots * w.gap) out.push(`${flow.id}: a gate lets a full queue through before it shuts (every > slots × gap)`);
    if (w.kind === 'board' && world.vehicles[w.vehicle]) {
      const v = world.vehicles[w.vehicle], d = v.doors(v.tripAt(0)) ?? v.doors(v.tripAt(0) + 1);
      if (d && d.close - d.open < w.slots * w.gap) out.push(`${flow.id}: a full queue cannot board while the doors stand open (${(d.close - d.open).toFixed(1)} s < ${w.slots} × ${w.gap} s)`);
      if (d && d.doors.some(p => p.zone !== w.zone)) out.push(`${flow.id}: the vehicle's doors here are not in ${w.zone}`);
    }
  }
  return out;
}
