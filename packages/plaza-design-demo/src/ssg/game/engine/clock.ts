/**
 * CLOCK nouns: event sources on a rhythm. Every `clock.every` ms a clock
 * raises its next event (its `events` in turn, so `["night", "day"]`
 * alternate and a single `tick` repeats; with `once` it raises one and stops, a timer). The engine gives it the verbs
 * `start` and `stop`, so a cable can stop the schedule; cutting its cables
 * is the other way to make it harmless.
 *
 * Clocks of nodes join when the node is connected (`sync`). The model ticks
 * them with the time and raises what comes back. A frozen device's clock
 * still counts, but its events are dropped like any signal out of a frozen
 * device: the watchdog can silence a schedule for a while.
 *
 * Pure: no DOM, no timers.
 */

import type { ClockData, NounData } from '../data/types';

interface Clock { key: string; dev: string; noun: string; data: ClockData; events: string[]; next: number; last: number; on: boolean; first: boolean }

/** A beat: this clock (`dev.noun`) raises this event. */
export interface Beat { dev: string; noun: string; event: string; set?: string }

export class Clocks {
  private clocks = new Map<string, Clock>();

  constructor(private now: () => number) {}

  clear() { this.clocks.clear(); }

  /** Add the clocks of a device that is here now (a scene device at the start, a node when it connects). */
  add(dev: string, nouns: NounData[]) {
    for (const n of nouns) {
      if (!n.clock) continue;
      const key = dev + '.' + n.id;
      if (this.clocks.has(key)) continue;
      this.clocks.set(key, { key, dev, noun: n.id, data: n.clock, events: n.events ?? [], next: 0, last: this.now(), on: n.clock.start !== false, first: true });
    }
  }

  /** Drop the clocks of a device that is gone. */
  remove(dev: string) { for (const [k, c] of this.clocks) if (c.dev === dev) this.clocks.delete(k); }

  private beat(c: Clock) { return c.first ? c.data.first ?? c.data.every : c.data.every; }

  /** The beats due since the last tick, in order (after a long pause, at most one per clock: a schedule does not catch up). */
  tick(): Beat[] {
    const t = this.now(), out: Beat[] = [];
    for (const c of this.clocks.values()) {
      if (!c.on || !c.events.length || t - c.last < this.beat(c)) continue;
      const late = t - c.last - this.beat(c);
      out.push({ dev: c.dev, noun: c.noun, event: c.events[c.next % c.events.length], set: c.data.set });
      c.next = (c.next + 1) % c.events.length; c.first = false;
      // a one-shot clock stops after its beat; `start` sets it going from the top
      if (c.data.once) { c.on = false; c.first = true; continue; }
      // keep the rhythm unless it fell a whole beat behind (a tab in the background)
      c.last = late < c.data.every ? t - late : t;
    }
    return out;
  }

  /** `start` / `stop`. Returns false when it was already so. */
  run(key: string, on: boolean) {
    const c = this.clocks.get(key);
    if (!c || c.on === on) return false;
    c.on = on;
    if (on) { c.last = this.now(); c.first = !!c.data.once; }
    return true;
  }

  /** The event it raises next and ms until then (null when stopped or unknown). */
  next(key: string): { event: string; ms: number } | null {
    const c = this.clocks.get(key);
    if (!c || !c.on || !c.events.length) return null;
    return { event: c.events[c.next % c.events.length], ms: Math.max(0, this.beat(c) - (this.now() - c.last)) };
  }

  isOn(key: string) { return this.clocks.get(key)?.on ?? false; }

  /** For the save: which event is next, how far into the beat, stopped or not. */
  snapshot(): Record<string, { next: number; ms: number; off?: boolean }> {
    const t = this.now(), out: Record<string, { next: number; ms: number; off?: boolean }> = {};
    for (const c of this.clocks.values()) {
      const s: { next: number; ms: number; off?: boolean } = { next: c.next, ms: c.on ? Math.round(Math.min(t - c.last, this.beat(c))) : 0 };
      if (!c.on) s.off = true;
      out[c.key] = s;
    }
    return out;
  }

  /** Back to a saved point; clocks the save does not know start fresh. */
  restore(s: Record<string, { next: number; ms: number; off?: boolean }> | undefined) {
    const t = this.now();
    for (const [k, v] of Object.entries(s ?? {})) {
      const c = this.clocks.get(k);
      if (!c || !v || typeof v.next !== 'number' || typeof v.ms !== 'number') continue;
      c.next = c.events.length ? Math.max(0, Math.floor(v.next)) % c.events.length : 0;
      c.on = !v.off; c.first = false;
      c.last = t - Math.max(0, Math.min(v.ms, this.beat(c)));
    }
  }
}
