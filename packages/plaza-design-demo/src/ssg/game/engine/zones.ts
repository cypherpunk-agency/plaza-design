/**
 * Zones: sense parts that watch a stretch of the scene (docs/design/CIRCUIT-VOCABULARY.md). A zone
 * runs `from`..`to` along an axis (`x` across the scene, `h` up it), optionally `within` limits on
 * the other axis (one floor of a tower) or a `building` whose floors the player must stand on, and watches the player or a
 * mover (`device.noun`). It raises `enters` and `leaves` (when the part lists them), and `set`
 * writes true or false into a state key. The engine gives it `arm` and `disarm`: a disarmed zone
 * raises nothing.
 *
 * A zone only notices crossings: being inside when the scene starts does not raise `enters`.
 *
 * Pure: no DOM, no timers. The model ticks it with where things are.
 */

import type { Coord, NounData, ZoneData } from '../data/types';

interface Zone { key: string; dev: string; noun: string; data: ZoneData; from: number; to: number; inside: boolean | null; armed: boolean }

/** A zone noticed something cross its edge. */
export interface Crossing { dev: string; noun: string; event: 'enters' | 'leaves'; set?: string }

export const ZONE_VERBS = ['arm', 'disarm'] as const;

/** Where a watched thing is: the player, or a mover's key. Undefined: not here (no crossing). */
/** `building`: the building whose floor the player stands on ('' the street; undefined on a flight or in a lift car). */
export type Locate = (watch: string, track?: "stop") => { x: number; h: number; building?: string } | undefined;

export class Zones {
  private zones = new Map<string, Zone>();

  clear() { this.zones.clear(); }

  /** `coord` works out where the zone's edges are (a number, a place of the artwork, a device's spot). */
  add(dev: string, nouns: NounData[], coord: (c: Coord, axis: 'x' | 'h') => number = (c) => c as number) {
    for (const n of nouns) {
      if (!n.zone) continue;
      const key = dev + '.' + n.id;
      if (!this.zones.has(key)) this.zones.set(key, { key, dev, noun: n.id, data: n.zone, from: coord(n.zone.from, n.zone.axis ?? 'x'), to: coord(n.zone.to, n.zone.axis ?? 'x'), inside: null, armed: n.zone.armed !== false });
    }
  }

  remove(dev: string) { for (const [k, z] of this.zones) if (z.dev === dev) this.zones.delete(k); }

  /** `arm` / `disarm`. False when it was already so. */
  arm(key: string, on: boolean) {
    const z = this.zones.get(key);
    if (!z || z.armed === on) return false;
    z.armed = on;
    return true;
  }

  isArmed(key: string) { return this.zones.get(key)?.armed ?? false; }
  inside(key: string) { return this.zones.get(key)?.inside === true; }

  /** The crossings since the last tick. A disarmed zone keeps track but raises nothing. */
  tick(locate: Locate): Crossing[] {
    const out: Crossing[] = [];
    for (const z of this.zones.values()) {
      const at = locate(z.data.watch, z.data.track);
      if (at === undefined) continue;
      const h = z.data.axis === 'h', p = h ? at.h : at.x, q = h ? at.x : at.h, w = z.data.within;
      const now = p >= Math.min(z.from, z.to) && p <= Math.max(z.from, z.to) && (!w || (q >= Math.min(w[0], w[1]) && q <= Math.max(w[0], w[1]))) && (z.data.building === undefined || at.building === z.data.building);
      const was = z.inside;
      z.inside = now;
      if (was === null || was === now || !z.armed) continue;
      out.push({ dev: z.dev, noun: z.noun, event: now ? 'enters' : 'leaves', set: z.data.set });
    }
    return out;
  }

  snapshot(): Record<string, { off: true }> {
    const out: Record<string, { off: true }> = {};
    for (const z of this.zones.values()) if (!z.armed) out[z.key] = { off: true };
    return out;
  }

  restore(s: Record<string, { off?: boolean }> | undefined) {
    for (const z of this.zones.values()) { z.armed = !(s?.[z.key]?.off) && z.data.armed !== false; z.inside = null; }
  }
}
