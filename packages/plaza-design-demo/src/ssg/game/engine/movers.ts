/**
 * Movers: act parts that travel between named stops (docs/design/CIRCUIT-VOCABULARY.md). A lift
 * car, a crane trolley, a delivery robot: anything with a path. The engine gives a mover one verb
 * per stop, `go <stop>`, and `return` (back to its first stop), unless it is `wired: false` and only
 * the scene's own effects send it. It raises `started` when it leaves and `arrived` when it gets
 * there (when the part lists those events), and `set` writes the stop it is at, or `moving`, into a
 * state key, so a verb's case can say `liftAt=roof`.
 *
 * A stop is a place on the mover's axis, or a point on both axes (a trolley and its spreader are one
 * mover). A trip is one leg to a stop; a path (`paths`) is a route of legs from wherever the mover is,
 * each with its own time or speed, ease, load label and end event, and choices between legs that look
 * at the scene's state when they are reached. Where it is between stops is worked out from the time, so
 * nothing moves while the scene is paused, and a zone (zones.ts) can watch it.
 *
 * Pure: no DOM, no timers. The model ticks it with the time and raises what comes back.
 */

import type { Coord, MoverData, MoverEase, MoverLeg, MoverStep, Num, NounData } from '../data/types';

/** What the movers need from the scene: its clock, its numbers, its places and its conditions. */
export interface MoverHost {
  now(): number;
  /** A number as written: a literal, or a tuning name. */
  num(n: Num): number;
  /** Where a coordinate is on an axis (a `place` of the scene's artwork, a device's `spot`). */
  coord(c: Coord, axis: 'x' | 'h'): number;
  /** Does a data condition (`lock=open`) hold now? */
  test(cond: string): boolean;
}

interface Pt { x: number; h: number }
interface Leg { to?: string; load?: string; event?: string; ease: MoverEase | undefined }
interface Mover {
  key: string; dev: string; noun: string; data: MoverData; events: string[];
  stops: Record<string, Pt>;
  /** The stop it is at (while travelling: the one it left). */
  at: string;
  /** The leg in progress: where it started, where it ends, when it set off, reached its end, and is done (after any wait). */
  from: Pt; to: Pt; t0: number; tMove: number; tEnd: number;
  leg: Leg | null;
  /** The steps still to come on this trip. */
  queue: MoverStep[];
  /** A plain `go` trip (one that a save resumes), not a path. */
  plain: boolean;
  /** The last stop a leg of this trip went to: where it is once the trip is over. */
  lastTo?: string;
  /** The path last run (while it runs, and after). */
  run?: string;
  tripT0: number; tripT1: number;
}

/** The mover's own happenings: a leg's `event`, and `arrived` (carrying what `set` writes). */
export interface MoverEvent { dev: string; noun: string; event: string; stop?: string; set?: string }
/** A state write a mover asks for: the key, the value, and the device it belongs to. */
export interface MoverWrite { dev: string; key: string; value: string }

export const MOVER_EASES = ['smooth', 'linear', 'ease-in', 'ease-out'] as const;

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
  return t * t * (3 - 2 * t);
}

/** The stops in their data order, and the first one (where it starts unless `start` says). */
export const moverStops = (m: MoverData) => Object.keys(m.stops);
export const moverVerbs = (m: MoverData) => m.wired === false ? [] : [...moverStops(m).map((s) => 'go ' + s), 'return'];
const home = (m: MoverData) => m.start ?? moverStops(m)[0];
export const isChoice = (s: MoverStep): s is Extract<MoverStep, { if: string }> => 'if' in s;
/** Every leg a path may run, choices opened (for checks and editors). */
export const moverLegs = (steps: readonly MoverStep[]): MoverLeg[] => steps.flatMap((s) => isChoice(s) ? [...moverLegs(s.then), ...moverLegs(s.else ?? [])] : [s]);
const isPoint = (s: unknown): s is { x?: Coord; h?: Coord } => !!s && typeof s === 'object' && !('place' in s) && !('spot' in s);

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
      const d = n.mover, axis = d.axis ?? 'x', across = d.across ?? 0, stops: Record<string, Pt> = {};
      for (const [name, s] of Object.entries(d.stops)) {
        stops[name] = isPoint(s)
          ? { x: s.x !== undefined ? this.host.coord(s.x, 'x') : across, h: s.h !== undefined ? this.host.coord(s.h, 'h') : across }
          : axis === 'h' ? { x: across, h: this.host.coord(s, 'h') } : { x: this.host.coord(s, 'x'), h: across };
      }
      const at = home(d), p = stops[at], t = this.host.now();
      this.movers.set(key, { key, dev, noun: n.id, data: d, events: n.events ?? [], stops, at, from: p, to: p, t0: t, tMove: t, tEnd: t, leg: null, queue: [], plain: true, tripT0: t, tripT1: t });
    }
    this.follows();
  }

  remove(dev: string) { for (const [k, m] of this.movers) if (m.dev === dev) this.movers.delete(k); this.follows(); }

  has(key: string) { return this.movers.has(key); }

  /** Where it is in the scene, on both axes. */
  place(key: string): { x: number; h: number } | undefined {
    const m = this.movers.get(key);
    if (!m) return undefined;
    const p = this.pointAt(m, this.host.now());
    return { x: p.x, h: p.h };
  }

  /** Where it is now along its axis. */
  position(key: string): number | undefined {
    const m = this.movers.get(key);
    return m ? this.along(m, this.pointAt(m, this.host.now())) : undefined;
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

  /** Is any mover on its way (the scene keeps redrawing while one is)? */
  anyMoving() { for (const m of this.movers.values()) if (m.leg) return true; return false; }

  moving(key: string) { return !!this.movers.get(key)?.leg; }
  at(key: string) { return this.movers.get(key)?.at; }
  /** The stop it is heading for (its own stop when it is still). */
  target(key: string) { const m = this.movers.get(key); return m ? this.heading(m) : undefined; }
  axis(key: string) { return this.movers.get(key)?.data.axis ?? 'x'; }
  /** What rides along with it during the leg it is on (undefined: nothing, or still). */
  load(key: string) { return this.movers.get(key)?.leg?.load; }
  /** The path it last ran (while it runs, and after); undefined for a plain trip or none yet. */
  lastRun(key: string) { return this.movers.get(key)?.run; }

  private heading(m: Mover) { return m.leg ? m.leg.to ?? m.lastTo ?? m.at : m.at; }

  /** The next leg of the trip: choices are settled now, by the scene's state. */
  private nextLeg(m: Mover): MoverLeg | undefined {
    while (m.queue.length) {
      const step = m.queue.shift()!;
      if (isChoice(step)) { m.queue.unshift(...(this.host.test(step.if) ? step.then : step.else ?? [])); continue; }
      return step;
    }
    return undefined;
  }

  private begin(m: Mover, step: MoverLeg, t: number) {
    const from = m.to, to = step.to === undefined ? from : m.stops[step.to];
    if (!to) throw new Error('Mover ' + m.key + ' has no stop ' + step.to);
    const speed = step.speed ?? (step.ms === undefined && m.data.ms === undefined ? m.data.speed : undefined);
    let ms = 0;
    if (step.ms !== undefined) ms = this.host.num(step.ms) * (step.share ?? 1);
    else if (speed !== undefined) ms = Math.hypot(to.x - from.x, to.h - from.h) / Math.max(1e-6, this.host.num(speed)) * 1000;
    else if (m.data.ms !== undefined) ms = this.host.num(m.data.ms) * (step.share ?? 1);
    const wait = step.minMs === undefined ? 0 : this.host.num(step.minMs);
    Object.assign(m, { from, to, t0: t, tMove: t + ms, tEnd: t + Math.max(ms, wait), leg: { to: step.to, load: step.load, event: step.event, ease: step.ease ?? m.data.ease } });
    if (step.to !== undefined) m.lastTo = step.to;
  }

  /** Set off on a trip from where it is. */
  private start(m: Mover, steps: MoverStep[], plain: boolean, run?: string): boolean {
    const t = this.host.now(), here = this.pointAt(m, t);
    Object.assign(m, { to: here, from: here, plain, run, queue: [...steps], lastTo: undefined, tripT0: t, leg: null });
    const first = this.nextLeg(m);
    if (!first) { m.to = here; return false; }
    this.begin(m, first, t);
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

  /** Set off on a named path, from where it is (a path already under way is dropped). 'unknown' for a path it lacks. */
  runPath(key: string, path: string): 'started' | 'unknown' {
    const m = this.movers.get(key), steps = m?.data.paths?.[path];
    if (!m || !steps) return 'unknown';
    return this.start(m, steps, false, path) ? 'started' : 'unknown';
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
      while (m.leg && t >= m.tEnd) {
        const te = m.tEnd, leg = m.leg;
        m.from = m.to;
        const next = this.nextLeg(m);
        if (next) this.begin(m, next, te);
        else {
          m.leg = null; m.tripT1 = te;
          if (m.lastTo !== undefined) { m.at = m.lastTo; m.to = m.from = m.stops[m.at]; }
          out.push({ dev: m.dev, noun: m.noun, event: 'arrived', stop: m.at, set: m.data.set });
        }
        if (leg.event) out.push({ dev: m.dev, noun: m.noun, event: leg.event });
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
  snapshot(): Record<string, { at: string; to?: string; pos?: number }> {
    const out: Record<string, { at: string; to?: string; pos?: number }> = {};
    for (const m of this.movers.values()) out[m.key] = m.leg && m.plain ? { at: m.at, to: this.heading(m), pos: Math.round((this.position(m.key) ?? 0) * 100) / 100 } : { at: m.at };
    return out;
  }

  /** Back to a saved point: a mover on its way sets off again from where it was. Returns the state it now holds. */
  restore(s: Record<string, { at: string; to?: string; pos?: number }> | undefined): MoverWrite[] {
    const t = this.host.now(), out: MoverWrite[] = [];
    for (const [k, v] of Object.entries(s ?? {})) {
      const m = this.movers.get(k);
      if (!m || !v || !(v.at in m.stops)) continue;
      const p = m.stops[v.at];
      Object.assign(m, { at: v.at, from: p, to: p, t0: t, tMove: t, tEnd: t, leg: null, queue: [], tripT0: t, tripT1: t });
      if (v.to && v.to in m.stops) {
        if (typeof v.pos === 'number') { const here = { ...p, [(m.data.axis ?? 'x') === 'h' ? 'h' : 'x']: v.pos }; Object.assign(m, { from: here, to: here }); }
        this.go(k, v.to);
      }
      if (m.data.set) out.push({ dev: m.dev, key: m.data.set, value: m.leg ? m.data.moving ?? 'moving' : m.at });
    }
    return out;
  }
}
