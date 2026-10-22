/**
 * Movers: act parts that travel between named stops (docs/design/CIRCUIT-VOCABULARY.md). A lift
 * car, a crane trolley, a delivery robot, a metro train: anything with a path. The engine gives a mover one verb
 * per stop, `go <stop>`, and `return` (back to its first stop), unless it is `wired: false` and only
 * the scene's own effects send it. It raises `started` when it leaves and `arrived` when it gets
 * there (when the part lists those events), and `set` writes the stop it is at, or `moving`, into a
 * state key, so a verb's case can say `liftAt=roof`.
 *
 * A stop is a place on the mover's axis, or a point on both axes (a trolley and its spreader are one
 * mover). A trip is one leg to a stop; a path (`paths`) is a route of legs from wherever the mover is,
 * each with its own time or speed, ease, load label and end event, and choices between legs that look
 * at the scene's state when they are reached. A path may end by running another path (`run`): a route that
 * goes round, with no scheduler: the next trip begins at the instant the last one ended. A leg may name a stop
 * that a state key holds (`@key`), start already part way in (`ahead`) and send another mover of the device
 * along one of its paths (`drives`: a train's doors). The axis may be a `ring` (a loop line). Where it is between
 * stops is worked out from the time, so nothing moves while the scene is paused, and a zone (zones.ts) can watch it.
 *
 * The emergency stop (`brake`) is the one calculation here that is not an eased leg: from its speed when pulled,
 * a mover slows at a constant rate to rest ahead of where it is, exactly at a named stop when it would
 * have stopped close to one, and then runs the path for where it stopped. It is a retained primitive
 * (typed in `MoverBrake`, validated by data/check.ts) because it is a physical calculation; it owns no clock.
 *
 * Pure: no DOM, no timers. The model ticks it with the time and raises what comes back.
 */

import type { Coord, MoverCue, MoverData, MoverEase, MoverFrom, MoverLeg, MoverRun, MoverStep, Num, NounData } from '../data/types';
import type {MoverSave} from '../data/types';

/** What the movers need from the scene: its clock, its numbers, its places and its conditions. */
export interface MoverHost {
  now(): number;
  /** A number as written: a literal, or a tuning name. */
  num(n: Num): number;
  /** Where a coordinate is on an axis (a `place` of the scene's artwork, a device's `spot`). */
  coord(c: Coord, axis: 'x' | 'h'): number;
  /** Does a data condition (`lock=open`) hold now? */
  test(cond: string): boolean;
  /** The value of a state key or computed value of the scene (a leg's `@key` stop), as seen from a device. */
  read(key: string, dev: string): unknown;
}

interface Pt { x: number; h: number }
interface Leg { to?: string; load?: string; event?: string; cue?: MoverCue; ease: MoverEase | undefined; braking?: boolean }
interface Mover {
  key: string; dev: string; noun: string; data: MoverData; events: string[];
  stops: Record<string, Pt>;
  /** The ring's length (0: the axis is a line). */
  ring: number;
  /** The stop it is at (while travelling: the one it left). */
  at: string;
  /** The leg in progress: where it started, where it ends, when it set off, reached its end, and is done (after any wait). On a ring the points are not wrapped: `to` is ahead of `from`. */
  from: Pt; to: Pt; t0: number; tMove: number; tEnd: number;
  leg: Leg | null;
  /** The steps still to come on this trip. */
  queue: MoverStep[];
  /** The path to run when this trip ends (the trip's last step was a `run`). */
  after?: string;
  /** A plain `go` trip (one that a save resumes), not a path. */
  plain: boolean;
  /** The last stop a leg of this trip went to: where it is once the trip is over. */
  lastTo?: string;
  /** Where an emergency stop stopped it: `track`, or the snap stop; until it moves on again. */
  halt?: string;
  /** The path last run (while it runs, and after). */
  run?: string;
  tripT0: number; tripT1: number;
}

/** The mover's own happenings: a leg's `event`, `arrived` and `started` (carrying what `set` writes), and a leg's sound. */
export interface MoverEvent { dev: string; noun: string; event: string; stop?: string; set?: string; value?: string; cue?: MoverCue }
/** A state write a mover asks for: the key, the value, and the device it belongs to. */
export interface MoverWrite { dev: string; key: string; value: string }
/** What an emergency stop did. */
export type BrakeResult = { result: 'braking'; where: string } | { result: 'standing' | 'already' | 'arriving' | 'unknown' };

export const MOVER_EASES = ['smooth', 'sine', 'linear', 'ease-in', 'ease-out'] as const;
export const MOVER_CUES = ['open', 'close'] as const;

/** Progress (0 to 1) after `k` (0 to 1) of the time, along the named curve or the timing table. */
export function easeAt(e: MoverEase | undefined, k: number): number {
  const t = k <= 0 ? 0 : k >= 1 ? 1 : k;
  if (Array.isArray(e)) {
    const pts: [number, number][] = [[0, 0], ...e.filter(([x]) => x > 0 && x < 1).sort((a, b) => a[0] - b[0]), [1, 1]];
    for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return x1 === x0 ? y1 : y0 + (y1 - y0) * (t - x0) / (x1 - x0); }
    return 1;
  }
  if (e === 'linear') return t;
  if (e === 'ease-in') return t * t;
  if (e === 'ease-out') return 1 - (1 - t) * (1 - t);
  if (e === 'sine') return (1 - Math.cos(Math.PI * t)) / 2;
  return t * t * (3 - 2 * t);
}

/** The stops in their data order, and the first one (where it starts unless `start` says). */
export const moverStops = (m: MoverData) => Object.keys(m.stops);
export const moverVerbs = (m: MoverData) => m.wired === false ? [] : [...moverStops(m).map((s) => 'go ' + s), 'return'];
const home = (m: MoverData) => m.start ?? moverStops(m)[0];
export const isChoice = (s: MoverStep): s is Extract<MoverStep, { if: string }> => 'if' in s;
export const isRun = (s: MoverStep): s is MoverRun => 'run' in s;
export const isFrom = (s: MoverStep): s is MoverFrom => 'from' in s;
/** Every leg a path may run, choices opened (for checks and editors). */
export const moverLegs = (steps: readonly MoverStep[]): MoverLeg[] => steps.flatMap((s) => isChoice(s) ? [...moverLegs(s.then), ...moverLegs(s.else ?? [])] : isRun(s) || isFrom(s) ? [] : [s]);
/** Every path a path may run next (`run` steps), choices opened. */
export const moverRuns = (steps: readonly MoverStep[]): string[] => steps.flatMap((s) => isChoice(s) ? [...moverRuns(s.then), ...moverRuns(s.else ?? [])] : isRun(s) ? [s.run] : []);
const isPoint = (s: unknown): s is { x?: Coord; h?: Coord } => !!s && typeof s === 'object' && !('place' in s) && !('spot' in s);
const wrap = (x: number, ring: number) => ring > 0 ? ((x % ring) + ring) % ring : x;
/** The driven mover and path a leg's `drives` names: `noun:path`. */
export const splitDrive = (drives: string): [string, string] => { const i = drives.indexOf(':'); return [drives.slice(0, i), drives.slice(i + 1)]; };

/** One leg worked out from where it starts: where it ends, how long it moves, and how long it lasts. */
interface Plan { name: string | undefined; to: Pt; ms: number; wait: number; ahead: number; moves: boolean }

export class Movers {
  private movers = new Map<string, Mover>();
  /** The movers that follow a state key (kept as the movers come and go, so a frame allocates nothing). */
  private following: { key: string; dev: string; noun: string; state: string }[] = [];

  constructor(private host: MoverHost) {}

  clear() { this.movers.clear(); this.following = []; }
  private follows() { this.following = [...this.movers.values()].filter((m) => m.data.follow).map((m) => ({ key: m.key, dev: m.dev, noun: m.noun, state: m.data.follow! })); }

  /** Add the movers of a device that is here now. */
  add(dev: string, nouns: NounData[]) {
    for (const n of nouns) {
      if (!n.mover) continue;
      const key = dev + '.' + n.id;
      if (this.movers.has(key)) continue;
      const d = n.mover, axis = d.axis ?? 'x', across = d.across ?? 0, stops: Record<string, Pt> = {}, ring = d.ring !== undefined ? this.host.num(d.ring) : 0;
      for (const [name, s] of Object.entries(d.stops)) {
        const p: Pt = isPoint(s)
          ? { x: s.x !== undefined ? this.host.coord(s.x, 'x') : across, h: s.h !== undefined ? this.host.coord(s.h, 'h') : across }
          : axis === 'h' ? { x: across, h: this.host.coord(s, 'h') } : { x: this.host.coord(s, 'x'), h: across };
        stops[name] = ring > 0 ? { x: wrap(p.x, ring), h: p.h } : p;
      }
      const at = home(d), p = stops[at], t = this.host.now();
      const m: Mover = { key, dev, noun: n.id, data: d, events: n.events ?? [], stops, ring, at, from: p, to: p, t0: t, tMove: t, tEnd: t, leg: null, queue: [], plain: true, tripT0: t, tripT1: t };
      this.movers.set(key, m);
    }
    // (after every mover of the device is here: a leg may drive another one)
    for (const n of nouns) if (n.mover?.auto) this.startAuto(this.movers.get(dev + '.' + n.id)!);
    this.follows();
  }

  remove(dev: string) { for (const [k, m] of this.movers) if (m.dev === dev) this.movers.delete(k); this.follows(); }

  has(key: string) { return this.movers.has(key); }

  /** A mover that is idle runs its `auto` path. */
  private startAuto(m: Mover) {
    const steps = m.data.auto ? m.data.paths?.[m.data.auto] : undefined;
    if (steps && !m.leg) this.start(m, steps, false, m.data.auto);
  }

  /** Where it is in the scene, on both axes (on a ring, the position is wrapped). */
  place(key: string): { x: number; h: number } | undefined {
    const m = this.movers.get(key);
    if (!m) return undefined;
    const p = this.pointAt(m, this.host.now());
    return { x: wrap(p.x, m.ring), h: p.h };
  }

  /** Where it is now along its axis. */
  position(key: string): number | undefined {
    const m = this.movers.get(key);
    if (!m) return undefined;
    const p = this.along(m, this.pointAt(m, this.host.now()));
    return (m.data.axis ?? 'x') === 'x' ? wrap(p, m.ring) : p;
  }

  /** The stops' places along its axis (a lift's floors). */
  stopPositions(key: string): Record<string, number> | undefined {
    const m = this.movers.get(key);
    return m ? Object.fromEntries(Object.entries(m.stops).map(([k, p]) => [k, this.along(m, p)])) : undefined;
  }

  private along(m: Mover, p: Pt) { return (m.data.axis ?? 'x') === 'h' ? p.h : p.x; }

  private pointAt(m: Mover, t: number): Pt {
    if (!m.leg || t >= m.tMove || m.tMove <= m.t0) return m.to;
    const k = (t - m.t0) / (m.tMove - m.t0), e = easeAt(m.leg.ease, k);
    return { x: m.from.x + (m.to.x - m.from.x) * e, h: m.from.h + (m.to.h - m.from.h) * e };
  }

  /** How fast it is going along its axis now, units per ms (0 while it stands or waits). */
  private legSpeed(m: Mover, t: number): number {
    if (!m.leg || t >= m.tMove || m.tMove <= m.t0) return 0;
    const ms = m.tMove - m.t0, dist = Math.abs(this.along(m, m.to) - this.along(m, m.from));
    if (!(dist > 0)) return 0;
    const k = (t - m.t0) / ms, a = Math.max(0, k - 1e-4), b = Math.min(1, k + 1e-4);
    return dist * (easeAt(m.leg.ease, b) - easeAt(m.leg.ease, a)) / ((b - a) * ms);
  }

  /** Is any mover on its way (the scene keeps redrawing while one is)? */
  anyMoving() { for (const m of this.movers.values()) if (m.leg) return true; return false; }

  moving(key: string) { return !!this.movers.get(key)?.leg; }
  /** Physical travel, excluding a path's stationary dwell or wait. */
  travelling(key:string){const m=this.movers.get(key);return !!m?.leg&&this.host.now()<m.tMove&&(m.from.x!==m.to.x||m.from.h!==m.to.h);}
  at(key: string) { return this.movers.get(key)?.at; }
  /** The stop it is heading for (its own stop when it is still). */
  target(key: string) { const m = this.movers.get(key); return m ? this.heading(m) : undefined; }
  axis(key: string) { return this.movers.get(key)?.data.axis ?? 'x'; }
  /** What rides along with it during the leg it is on (undefined: nothing, or still). */
  load(key: string) { return this.movers.get(key)?.leg?.load; }
  /** The path it last ran (while it runs, and after); undefined for a plain trip or none yet. */
  lastRun(key: string) { return this.movers.get(key)?.run; }
  /** Where an emergency stop stopped it (`track`, or the name of the stop it snapped to), until it moves on again. */
  halted(key: string) { return this.movers.get(key)?.halt; }

  /** The leg in progress: its label and when it began, ends (after any wait) and what time it is (scene ms). Undefined while none. */
  legInfo(key: string): { load?: string; to?: string; t0: number; end: number; now: number } | undefined {
    const m = this.movers.get(key);
    return m?.leg ? { load: m.leg.load, to: m.leg.to, t0: m.t0, end: m.tEnd, now: this.host.now() } : undefined;
  }

  private heading(m: Mover) { return m.leg ? m.leg.to ?? m.lastTo ?? m.at : m.at; }

  /** The next leg of the trip: choices are settled now, by the scene's state; a `run` ends the trip and names what follows. */
  private nextLeg(m: Mover): MoverLeg | undefined {
    while (m.queue.length) {
      const step = m.queue.shift()!;
      if (isChoice(step)) { m.queue.unshift(...(this.host.test(step.if) ? step.then : step.else ?? [])); continue; }
      if (isRun(step)) { m.after = step.run; m.queue.length = 0; return undefined; }
      if (isFrom(step)) continue;
      return step;
    }
    return undefined;
  }

  /** The stop a leg names (a `@key` is read now). */
  private stopOf(m: Mover, to: string | undefined): string | undefined {
    if (to === undefined || !to.startsWith('@')) return to;
    const v = this.host.read(to.slice(1), m.dev);
    if (typeof v !== 'string') throw new Error('Mover ' + m.key + ': ' + to + ' holds no stop name');
    return v;
  }

  /** A leg from where the mover stands: where it ends, its time, and how long it lasts. */
  private plan(m: Mover, step: MoverLeg, at: Pt): Plan {
    const from = this.norm(m, at), name = this.stopOf(m, step.to), target = name === undefined ? from : m.stops[name];
    if (!target) throw new Error('Mover ' + m.key + ' has no stop ' + name);
    const speed = step.speed ?? (step.ms === undefined && m.data.ms === undefined ? m.data.speed : undefined);
    let ms: number | undefined;
    if (step.ms !== undefined) ms = this.host.num(step.ms) * (step.share ?? 1);
    else if (speed === undefined && m.data.ms !== undefined) ms = this.host.num(m.data.ms) * (step.share ?? 1);
    let to: Pt = target, dist = Math.hypot(target.x - from.x, target.h - from.h);
    if (m.ring > 0 && name !== undefined) {
      dist = wrap(target.x - from.x, m.ring);
      // to the stop it stands at: once round, unless the leg takes no time
      if (dist === 0 && !(ms !== undefined && ms <= 0)) dist = m.ring;
      to = { x: from.x + dist, h: target.h };
    }
    if (ms === undefined) ms = speed !== undefined ? dist / Math.max(1e-6, this.host.num(speed)) * 1000 : 0;
    const wait = step.minMs === undefined ? 0 : this.host.num(step.minMs);
    return { name, to, ms, wait, ahead: step.ahead === undefined ? 0 : this.host.num(step.ahead), moves: dist > 0 };
  }

  private norm(m: Mover, p: Pt): Pt { return m.ring > 0 ? { x: wrap(p.x, m.ring), h: p.h } : p; }

  private begin(m: Mover, step: MoverLeg, t: number, ahead = 0,drive = true) {
    const from = this.norm(m, m.to), p = this.plan(m, step, from), t0 = t - p.ahead - ahead;
    Object.assign(m, { from, to: p.to, t0, tMove: t0 + p.ms, tEnd: t0 + Math.max(p.ms, p.wait), leg: { to: p.name, load: step.load, event: step.event, cue: step.cue, ease: step.ease ?? m.data.ease } });
    if (p.name !== undefined) m.lastTo = p.name;
    if (p.moves) m.halt = undefined;
    if (drive&&step.drives) this.drive(m, step.drives);
  }

  /** A leg sends another mover of the device along one of its paths. */
  private drive(m: Mover, drives: string) {
    const [noun, path] = splitDrive(drives), key = m.dev + '.' + noun;
    if (this.runPath(key, path) !== 'started') throw new Error('Mover ' + m.key + ' cannot drive ' + drives);
  }

  /** Set off on a trip from where it is (`t`: when, `ahead`: ms of the first leg already gone). */
  private start(m: Mover, steps: readonly MoverStep[], plain: boolean, run?: string, t = this.host.now(), ahead = 0): boolean {
    // a path may begin by putting the mover at a stop
    const first0 = steps[0];
    if (first0 && isFrom(first0)) { const p = m.stops[first0.from]; if (!p) throw new Error('Mover ' + m.key + ' has no stop ' + first0.from); Object.assign(m, { at: first0.from, from: p, to: p, t0: t, tMove: t, tEnd: t, leg: null, halt: undefined }); }
    const here = this.pointAt(m, t);
    // (a path started while an emergency stop holds it is still on its run: it keeps the stop it was heading for)
    Object.assign(m, { to: here, from: here, plain, run, queue: [...steps], after: undefined, lastTo: m.halt !== undefined ? m.lastTo : undefined, tripT0: t, leg: null });
    const first = this.nextLeg(m);
    if (!first) { m.to = here; return false; }
    this.begin(m, first, t, ahead);
    m.tripT1 = m.tEnd;
    return true;
  }

  /**
   * Send it to a stop. 'started' when it sets off, 'already' when it is there or on its way,
   * 'unknown' for a stop it does not have. A new order mid-way turns it round from where it is.
   */
  go(key: string, stop: string): 'started' | 'already' | 'unknown' {
    const m = this.movers.get(key);
    if (!m || !(stop in m.stops)) return 'unknown';
    if (this.heading(m) === stop) return 'already';
    return this.start(m, [{ to: stop }], true) ? 'started' : 'unknown';
  }

  /**
   * Set off on a named path, from where it is (a path already under way is dropped). 'unknown' for a path it lacks.
   * `from` first puts it at a stop (a train that is boarded at a station); `ahead` begins the first leg that many ms in.
   */
  runPath(key: string, path: string, opts: { from?: string; ahead?: number } = {}): 'started' | 'unknown' {
    const m = this.movers.get(key), steps = m?.data.paths?.[path];
    if (!m || !steps) return 'unknown';
    if (opts.from !== undefined) {
      const p = m.stops[opts.from];
      if (!p) return 'unknown';
      const t = this.host.now();
      Object.assign(m, { at: opts.from, from: p, to: p, t0: t, tMove: t, tEnd: t, leg: null, queue: [], after: undefined, halt: undefined });
    }
    return this.start(m, steps, false, path, this.host.now(), opts.ahead ?? 0) ? 'started' : 'unknown';
  }

  /**
   * What an emergency stop would do now, without doing it: 'braking' with where it would stop (`track`, or the snap stop),
   * 'standing' when it is not moving, 'already' while it is braking, 'arriving' when it would arrive before it could stop
   * (it goes on to its stop), 'unknown' for a mover that cannot brake.
   */
  private brakePlan(m: Mover): BrakeResult & { D?: number; ms?: number; to?: Pt; here?: Pt; then?: string } {
    const b = m.data.brake;
    if (!b) return { result: 'unknown' };
    if (m.leg?.braking) return { result: 'already' };
    const t = this.host.now(), v = this.legSpeed(m, t);
    if (!(v > 1e-9)) return { result: 'standing' };
    const decel = this.host.num(b.decel) / 1e6, here = this.pointAt(m, t), s = this.along(m, here), end = this.along(m, m.to);
    const dir = m.ring > 0 ? 1 : (Math.sign(end - this.along(m, m.from)) || 1), remaining = (end - s) * dir, stopD = v * v / (2 * decel);
    if (stopD >= remaining) return { result: 'arriving' };
    let D = stopD, where = 'track';
    for (const sn of b.snap ?? []) {
      const p = m.stops[sn.stop];
      if (!p) continue;
      const sp = this.along(m, p), ahead = m.ring > 0 ? wrap(sp - s, m.ring) : (sp - s) * dir;
      if (ahead > (sn.minAhead === undefined ? 30 : this.host.num(sn.minAhead)) && ahead < remaining && Math.abs(stopD - ahead) <= this.host.num(sn.window)) { D = ahead; where = sn.stop; break; }
    }
    const to: Pt = (m.data.axis ?? 'x') === 'h' ? { x: here.x, h: s + dir * D } : { x: s + dir * D, h: here.h };
    return { result: 'braking', where, D, ms: 2 * D / v, to, here, then: b.then[where] ?? b.then.track };
  }

  /** What the emergency stop would do now (nothing changes): where it would stop, or why it would not. */
  brakePreview(key: string): BrakeResult {
    const m = this.movers.get(key), p = m ? this.brakePlan(m) : undefined;
    return p ? (p.result === 'braking' ? { result: 'braking', where: p.where } : { result: p.result }) : { result: 'unknown' };
  }

  /**
   * The emergency stop: slows it to rest ahead of where it is (see `MoverBrake`), then runs the path for where it stopped.
   * Results as `brakePreview`.
   */
  brake(key: string): BrakeResult {
    const m = this.movers.get(key), p = m ? this.brakePlan(m) : undefined;
    if (!m || !p) return { result: 'unknown' };
    if (p.result !== 'braking') return { result: p.result };
    const t = this.host.now(), b = m.data.brake!;
    Object.assign(m, {
      from: p.here, to: p.to, t0: t, tMove: t + p.ms!, tEnd: t + p.ms!, plain: false, run: p.then, after: undefined, halt: p.where, tripT1: t + p.ms!,
      leg: { to: undefined, load: b.load, event: b.event, ease: 'ease-out', braking: true },
      queue: [...(m.data.paths?.[p.then!] ?? [])],
    });
    return { result: 'braking', where: p.where };
  }

  /** Where it would come to rest if it braked now (its own place while it stands, or the braking leg's end): what a zone on `track: 'stop'` watches. */
  stopPoint(key: string): { x: number; h: number } | undefined {
    const m = this.movers.get(key);
    if (!m) return undefined;
    const t = this.host.now(), here = this.pointAt(m, t), b = m.data.brake;
    if (m.leg?.braking) return { x: wrap(m.to.x, m.ring), h: m.to.h };
    const v = b ? this.legSpeed(m, t) : 0;
    if (!b || !(v > 1e-9)) return { x: wrap(here.x, m.ring), h: here.h };
    const d = v * v / (2 * this.host.num(b.decel) / 1e6) * (m.ring > 0 ? 1 : (Math.sign(this.along(m, m.to) - this.along(m, m.from)) || 1));
    return (m.data.axis ?? 'x') === 'h' ? { x: here.x, h: here.h + d } : { x: wrap(here.x + d, m.ring), h: here.h };
  }

  /**
   * Scene ms until the end of the next leg labelled `load` (a train's `opening`: the doors are open): what is left of the
   * leg in progress and the legs still to come, following the trip's `run` on into the next path and settling choices by
   * the scene's state now. 0 while it is on that leg, or not travelling; the whole of what it could see when none is labelled so.
   */
  etaTo(key: string, load: string): number {
    const m = this.movers.get(key);
    if (!m?.leg || m.leg.load === load) return 0;
    let sum = Math.max(0, m.tEnd - this.host.now()), at: Pt = m.to, runs = 0;
    const queue = [...m.queue];
    while (queue.length) {
      const step = queue.shift()!;
      if (isChoice(step)) { queue.unshift(...(this.host.test(step.if) ? step.then : step.else ?? [])); continue; }
      if (isFrom(step)) continue;
      if (isRun(step)) { if (++runs > 3) break; queue.unshift(...(m.data.paths?.[step.run] ?? [])); continue; }
      let p: Plan;
      try { p = this.plan(m, step, at); } catch { break; }
      sum += Math.max(0, Math.max(p.ms, p.wait) - p.ahead); at = p.to;
      if (step.load === load) break;
    }
    return sum;
  }

  home(key: string) { const m = this.movers.get(key); return m ? home(m.data) : undefined; }
  /** When its last trip set off and when it arrives (scene time, ms): what follows it (a lift's doors) reads these. */
  trip(key: string) { const m = this.movers.get(key); return m ? { t0: m.tripT0, t1: m.leg ? m.tEnd : m.tripT1 } : undefined; }

  /** The movers that follow a state key, and the key. */
  followers() { return this.following; }
  hasStop(key: string, stop: string) { const m = this.movers.get(key); return !!m && stop in m.stops; }

  /** The legs that ended and the trips that finished since the last tick, in order. */
  tick(): MoverEvent[] {
    const t = this.host.now(), out: MoverEvent[] = [];
    for (const m of this.movers.values()) {
      let guard = 0;
      while (m.leg && t >= m.tEnd) {
        if (++guard > 256) throw new Error('Mover ' + m.key + ' goes round without taking any time');
        const te = m.tEnd, leg = m.leg;
        m.from = m.to;
        const next = this.nextLeg(m);
        let chain: string | undefined;
        if (next) this.begin(m, next, te);
        else {
          m.leg = null; m.tripT1 = te;
          const moved = m.lastTo !== undefined;
          if (moved) { m.at = m.lastTo!; m.to = m.from = m.stops[m.at]; m.halt = undefined; }
          // a trip that only waits and is followed by another is no arrival
          if (moved || !m.after) out.push({ dev: m.dev, noun: m.noun, event: 'arrived', stop: m.at, set: m.data.set });
          chain = m.after; m.after = undefined;
        }
        if (leg.event) out.push({ dev: m.dev, noun: m.noun, event: leg.event });
        if (leg.cue) out.push({ dev: m.dev, noun: m.noun, event: 'cue', cue: leg.cue });
        const steps = chain === undefined ? undefined : m.data.paths?.[chain];
        if (steps && this.start(m, steps, false, chain, te)) out.push({ dev: m.dev, noun: m.noun, event: 'started', set: m.data.set, value: m.data.moving ?? 'moving' });
      }
    }
    return out;
  }

  /**
   * Put the movers whose `set` key names one of their stops at that stop, and ask for a stop to be
   * written where the key names none (a trip a save cut short). `read` is the scene's state.
   */
  sync(read: (dev: string, key: string) => unknown): MoverWrite[] {
    const out: MoverWrite[] = [];
    for (const m of this.movers.values()) {
      if (!m.data.set || m.leg) continue;
      const v = read(m.dev, m.data.set);
      if (typeof v === 'string' && v in m.stops) {
        const t = this.host.now(), p = m.stops[v];
        Object.assign(m, { at: v, from: p, to: p, t0: t, tMove: t, tEnd: t, tripT0: t, tripT1: t });
      } else if (v === (m.data.moving ?? 'moving')) out.push({ dev: m.dev, key: m.data.set, value: m.at });
    }
    return out;
  }

  /**
   * For the save: where each mover is. A plain trip on its way is saved with where it was going; a
   * path under way is settled where it set off (the scene's checkpoint does the same for its state).
   */
  snapshot(keepPaths:ReadonlySet<string>=new Set()): Record<string, MoverSave> {
    const out: Record<string, MoverSave> = {};
    for (const m of this.movers.values()) {
      out[m.key]=m.leg&&m.plain?{at:m.at,to:this.heading(m),pos:Math.round((this.position(m.key)??0)*100)/100}:{at:m.at};
      const steps=m.run&&m.data.paths?.[m.run];
      if(keepPaths.has(m.key)&&m.leg&&!m.plain&&steps&&!steps.some(isChoice)){
        const step=steps.length-m.queue.length-1;
        if(step>=0&&!isRun(steps[step])&&!isFrom(steps[step]))out[m.key].path={name:m.run!,step,elapsed:this.host.now()-m.t0,from:{...m.from},...(m.lastTo?{lastTo:m.lastTo}:{})};
      }
    }
    return out;
  }

  /** Back to a saved point: a mover on its way sets off again from where it was. Returns the state it now holds. */
  restore(s: Record<string, MoverSave> | undefined): MoverWrite[] {
    const t = this.host.now(), out: MoverWrite[] = [];
    for (const [k, v] of Object.entries(s ?? {})) {
      const m = this.movers.get(k);
      if (!m || !v || !Object.prototype.hasOwnProperty.call(m.stops,v.at)) continue;
      const p = m.stops[v.at];
      Object.assign(m, { at: v.at, from: p, to: p, t0: t, tMove: t, tEnd: t, leg: null, queue: [], after: undefined, halt: undefined, tripT0: t, tripT1: t });
      const path=v.path,steps=path&&typeof path.name==='string'&&m.data.paths&&Object.prototype.hasOwnProperty.call(m.data.paths,path.name)?m.data.paths[path.name]:undefined,finite=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1e9;
      if(path&&steps&&!steps.some(isChoice)&&Number.isInteger(path.step)&&path.step>=0&&path.step<steps.length&&finite(path.elapsed)&&path.elapsed>=0&&path.from&&finite(path.from.x)&&finite(path.from.h)&&(!path.lastTo||Object.prototype.hasOwnProperty.call(m.stops,path.lastTo))){
        const step=steps[path.step];
        if(!isRun(step)&&!isFrom(step)&&!isChoice(step)){
          const plan=this.plan(m,step,path.from);
          if(path.elapsed<=Math.max(plan.ms,plan.wait)){
            Object.assign(m,{from:{...path.from},to:{...path.from},run:path.name,queue:steps.slice(path.step+1),plain:false,lastTo:path.lastTo,tripT0:t-path.elapsed});
            this.begin(m,step,t-path.elapsed+plan.ahead,0,false);m.tripT1=m.tEnd;
          }
        }
      }
      if (!m.leg&&v.to && v.to in m.stops) {
        if (finite(v.pos)) { const here = { ...p, [(m.data.axis ?? 'x') === 'h' ? 'h' : 'x']: v.pos! }; Object.assign(m, { from: here, to: here }); }
        this.go(k, v.to);
      }
      if (!m.leg) this.startAuto(m);
      if (m.data.set) out.push({ dev: m.dev, key: m.data.set, value: m.leg ? m.data.moving ?? 'moving' : m.at });
    }
    return out;
  }
}
