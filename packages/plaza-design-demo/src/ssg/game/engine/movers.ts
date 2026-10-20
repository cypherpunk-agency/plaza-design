/**
 * Movers: act parts that travel between named stops (docs/design/CIRCUIT-VOCABULARY.md). A lift
 * car, a crane trolley, a delivery robot: anything with a path. The engine gives a mover one verb
 * per stop, `go <stop>`, and `return` (back to its first stop). It raises `started` when it
 * leaves and `arrived` when it gets there (when the part lists those events), and `set` writes
 * the stop it is at, or `moving`, into a state key, so a verb's case can say `liftAt=roof`.
 *
 * Positions are world units along the mover's axis (`x` across the scene, `h` up it). Where it
 * is between stops is worked out from the time, so nothing moves while the scene is paused, and
 * a zone (zones.ts) can watch it.
 *
 * Pure: no DOM, no timers. The model ticks it with the time and raises what comes back.
 */

import type { MoverData, NounData } from '../data/types';

interface Mover { key: string; dev: string; noun: string; data: MoverData; events: string[]; at: string; from: number; to: number; target: string; t0: number; t1: number }

/** A mover arrived at a stop. */
export interface Arrival { dev: string; noun: string; stop: string; set?: string }

/** The stops in their data order, and the first one (where it starts unless `start` says). */
export const moverStops = (m: MoverData) => Object.keys(m.stops);
export const moverVerbs = (m: MoverData) => [...moverStops(m).map((s) => 'go ' + s), 'return'];
const home = (m: MoverData) => m.start ?? moverStops(m)[0];

export class Movers {
  private movers = new Map<string, Mover>();

  constructor(private now: () => number) {}

  clear() { this.movers.clear(); }

  /** Add the movers of a device that is here now. */
  add(dev: string, nouns: NounData[]) {
    for (const n of nouns) {
      if (!n.mover) continue;
      const key = dev + '.' + n.id;
      if (this.movers.has(key)) continue;
      const at = home(n.mover), p = n.mover.stops[at] ?? 0, t = this.now();
      this.movers.set(key, { key, dev, noun: n.id, data: n.mover, events: n.events ?? [], at, from: p, to: p, target: at, t0: t, t1: t });
    }
  }

  remove(dev: string) { for (const [k, m] of this.movers) if (m.dev === dev) this.movers.delete(k); }

  has(key: string) { return this.movers.has(key); }

  /** Where it is in the scene: along its axis from `position`, at its `across` place on the other. */
  place(key: string): { x: number; h: number } | undefined {
    const m = this.movers.get(key), p = this.position(key);
    if (!m || p === undefined) return undefined;
    const across = m.data.across ?? 0;
    return (m.data.axis ?? 'x') === 'h' ? { x: across, h: p } : { x: p, h: across };
  }

  /** Where it is now along its axis. */
  position(key: string): number | undefined {
    const m = this.movers.get(key);
    if (!m) return undefined;
    const t = this.now();
    if (t >= m.t1 || m.t1 <= m.t0) return m.to;
    const k = (t - m.t0) / (m.t1 - m.t0), e = k * k * (3 - 2 * k);
    return m.from + (m.to - m.from) * e;
  }

  /** Is any mover on its way (the scene keeps redrawing while one is)? */
  anyMoving() { for (const m of this.movers.values()) if (m.target !== m.at) return true; return false; }

  moving(key: string) { const m = this.movers.get(key); return !!m && m.target !== m.at; }
  at(key: string) { return this.movers.get(key)?.at; }
  /** The stop it is heading for (its own stop when it is still). */
  target(key: string) { return this.movers.get(key)?.target; }
  axis(key: string) { return this.movers.get(key)?.data.axis ?? 'x'; }

  /**
   * Send it to a stop. 'started' when it sets off, 'already' when it is there or on its way,
   * 'unknown' for a stop it does not have. A new order mid-way turns it round from where it is.
   */
  go(key: string, stop: string): 'started' | 'already' | 'unknown' {
    const m = this.movers.get(key);
    if (!m || !(stop in m.data.stops)) return 'unknown';
    if (m.target === stop) return 'already';
    const from = this.position(key) ?? m.to, to = m.data.stops[stop], t = this.now();
    const ms = Math.abs(to - from) / Math.max(1e-6, m.data.speed) * 1000;
    Object.assign(m, { from, to, target: stop, t0: t, t1: t + ms });
    return 'started';
  }

  home(key: string) { const m = this.movers.get(key); return m ? home(m.data) : undefined; }

  /** The arrivals since the last tick. */
  tick(): Arrival[] {
    const t = this.now(), out: Arrival[] = [];
    for (const m of this.movers.values()) {
      if (m.target === m.at || t < m.t1) continue;
      m.at = m.target; m.from = m.to;
      out.push({ dev: m.dev, noun: m.noun, stop: m.at, set: m.data.set });
    }
    return out;
  }

  /** For the save: where each mover is, and where it is going. */
  snapshot(): Record<string, { at: string; to?: string; pos?: number }> {
    const out: Record<string, { at: string; to?: string; pos?: number }> = {};
    for (const m of this.movers.values()) out[m.key] = m.target === m.at ? { at: m.at } : { at: m.at, to: m.target, pos: Math.round((this.position(m.key) ?? m.to) * 100) / 100 };
    return out;
  }

  /** Back to a saved point: a mover on its way sets off again from where it was. */
  restore(s: Record<string, { at: string; to?: string; pos?: number }> | undefined) {
    const t = this.now();
    for (const [k, v] of Object.entries(s ?? {})) {
      const m = this.movers.get(k);
      if (!m || !v || !(v.at in m.data.stops)) continue;
      const p = m.data.stops[v.at];
      Object.assign(m, { at: v.at, target: v.at, from: p, to: p, t0: t, t1: t });
      if (v.to && v.to in m.data.stops) {
        if (typeof v.pos === 'number') Object.assign(m, { from: v.pos, to: v.pos });
        this.go(k, v.to);
      }
    }
  }
}
