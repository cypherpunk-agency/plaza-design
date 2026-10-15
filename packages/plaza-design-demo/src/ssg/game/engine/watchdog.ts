/**
 * The Registry's watchdog: a process that walks a route of devices and nodes
 * on a fixed rhythm. It sits on each stop for `dwellMs`, then takes `moveMs`
 * to the next, and loops. The device it sits on is frozen (the model refuses
 * its verbs and drops signals in and out of it; see `SceneModel.frozen`).
 *
 * Its place is a pure function of how long it has been walking, so a save
 * keeps one number (ms into its loop) and a test can move the clock. The
 * model calls `tick` with the time; a step to the next stop comes back as
 * `leaves` / `arrives` changes, which the model raises as events on the
 * engine noun `watchdog` of those devices.
 *
 * Pure: no DOM, no timers. The board's sprite is `watchdog-view.ts`.
 */

import type { WatchdogData } from '../data/types';

/** Where a watchdog is: sitting on `at`, or walking `from` → `to` (`progress` 0–1). `left`: ms until it moves on or arrives. */
export interface DogView {
  id: string;
  name: string;
  at: string | null;
  from: string;
  to: string;
  progress: number;
  left: number;
}

/** A step on the route: the dog left one stop, or reached one. */
export interface DogStep { dog: string; leaves?: string; arrives?: string }

interface Dog { id: string; data: WatchdogData; t0: number; stop: number; walking: boolean }

const DEFAULT_ID = 'watchdog';
export const dogId = (d: WatchdogData) => d.id ?? DEFAULT_ID;

export class Watchdogs {
  private dogs: Dog[] = [];

  constructor(private list: WatchdogData[], private now: () => number) { this.reset(); }

  /** Every dog back to its first stop, sitting. */
  reset() {
    const t = this.now();
    this.dogs = this.list.map((data) => ({ id: dogId(data), data, t0: t, stop: 0, walking: false }));
  }

  get any() { return this.dogs.length > 0; }

  /** Every device any route visits, with the dog's id. */
  routes(): Map<string, string> {
    const m = new Map<string, string>();
    for (const d of this.dogs) for (const id of d.data.route) m.set(id, d.id);
    return m;
  }

  /** Where in its loop a dog is at time `t`. */
  private phase(d: Dog, t: number) {
    const { dwellMs, moveMs, route } = d.data, leg = dwellMs + moveMs, loop = leg * route.length;
    const pos = loop > 0 ? (((t - d.t0) % loop) + loop) % loop : 0;
    const stop = Math.min(route.length - 1, Math.floor(pos / leg)), into = pos - stop * leg;
    return into < dwellMs
      ? { stop, walking: false, progress: 0, left: dwellMs - into }
      : { stop, walking: true, progress: moveMs ? (into - dwellMs) / moveMs : 1, left: leg - into };
  }

  /**
   * Bring the dogs up to now. Returns the steps since the last tick, in order
   * (after a long pause only the last leave and arrive of each dog).
   */
  tick(): DogStep[] {
    const t = this.now(), out: DogStep[] = [];
    for (const d of this.dogs) {
      const p = this.phase(d, t);
      if (p.stop === d.stop && p.walking === d.walking) continue;
      const route = d.data.route;
      // it left where it sat (unless it was already walking), and arrives where it sits now (unless it is
      // walking: a stop it passed during a long pause raised nothing, it never sat there for anyone to see)
      if (!d.walking) out.push({ dog: d.id, leaves: route[d.stop] });
      if (!p.walking) out.push({ dog: d.id, arrives: route[p.stop] });
      d.stop = p.stop; d.walking = p.walking;
    }
    return out;
  }

  /** The dog sitting on this device right now (as of the last tick), if any. */
  on(dev: string): string | null {
    const d = this.dogs.find((x) => !x.walking && x.data.route[x.stop] === dev);
    return d ? d.id : null;
  }

  /** What the board shows: where each dog is and how long until it moves. */
  view(name: (d: WatchdogData) => string): DogView[] {
    const t = this.now();
    return this.dogs.map((d) => {
      const p = this.phase(d, t), r = d.data.route, from = r[d.stop], to = r[(d.stop + 1) % r.length];
      // as of the last tick, so the sprite and the freeze agree
      return { id: d.id, name: name(d.data), at: d.walking ? null : from, from, to, progress: d.walking ? p.progress : 0, left: p.left };
    });
  }

  /** For the save: ms into each dog's loop. */
  snapshot(): Record<string, number> {
    const t = this.now(), out: Record<string, number> = {};
    for (const d of this.dogs) {
      const loop = (d.data.dwellMs + d.data.moveMs) * d.data.route.length;
      out[d.id] = loop > 0 ? Math.round((t - d.t0) % loop) : 0;
    }
    return out;
  }

  /** Back to a saved place (unknown ids and bad numbers are ignored). No events: it is simply there. */
  restore(s: Record<string, number> | undefined) {
    const t = this.now();
    for (const d of this.dogs) {
      const ms = s?.[d.id];
      if (typeof ms !== 'number' || !isFinite(ms) || ms < 0) continue;
      d.t0 = t - ms;
      const p = this.phase(d, t);
      d.stop = p.stop; d.walking = p.walking;
    }
  }
}
