/**
 * The city clock (TIME.md, "The clock"): one clock for the whole city, saved with the game.
 *
 * - **Saved:** `save.clock` = `{ day, min, seed }` (min 0–1439; `seed` is the weather's, weather.ts).
 *   Old saves have none: day 1, 09:40 (`CLOCK_START`).
 * - **Speed:** `CLOCK_RATE` game minutes per real second (1 game hour = 2 real minutes; a day is 48).
 * - **It runs** in a scene, hack vision and the board included. **It stops** in the menu, the map,
 *   talk (a speech bubble, the engine's talk panel), toys, cutscenes, the title and the glide; the
 *   game decides that each frame (game.ts `clockRuns`) and calls `tick`.
 * - **Travel:** a metro ride is the ride (the car is a scene: the clock runs on board); quick
 *   travel adds `TRAVEL.quick`, the sky taxi `TRAVEL.taxi` (the clock stands still while either plays).
 * - **Pinning:** a story beat pins the clock to a minute (`pin`), and it does not run until
 *   `release`. The opening pins it (opening.ts `OPENING_TIME`: 05:41 on the train … 09:40 the
 *   morning after) and lets go after uplink.so, from 09:42.
 * - **Waiting:** a bench, a bar stool or your bed offers "wait until…" (`WAITS`): the next hour,
 *   dusk, night, morning. The clock jumps (`advance`) behind a short fade and a time card.
 * - **Sudo:** `speed` (stop, 1×, 10×, 60×) and `setTime`; nothing else touches them.
 *
 * Pure: no DOM. The game binds the save's clock (`bind`) and ticks it; scenes, the engine's
 * conditions and the weather read it (`city`).
 */

import type { TimeWindow } from './data/types';

/** Game minutes per real second: 1 game hour = 2 real minutes (TIME.md; a first guess, tune here). */
export const CLOCK_RATE = 0.5;
export const DAY_MIN = 1440;
/** Where a save without a clock starts: day 1, 09:40 (the morning after the opening). */
export const CLOCK_START = { day: 1, min: 9 * 60 + 40 };
/** Fixed costs of travel that does not play out on the clock (game minutes). */
export const TRAVEL = { quick: 15, taxi: 10 };
/** The sudo speeds (multiples of CLOCK_RATE): stop, 1×, 10×, 60×. */
export const CLOCK_SPEEDS = [0, 1, 10, 60];

/** What "wait until…" offers. `at`: a time of day (minutes); `hour`: the next full hour. */
export interface WaitTo { id: string; label: string; at?: number; hour?: true }
export const WAITS: WaitTo[] = [
  { id: 'hour', label: 'next hour', hour: true },
  { id: 'dusk', label: 'dusk · 19:00', at: 19 * 60 },
  { id: 'night', label: 'night · 22:00', at: 22 * 60 },
  { id: 'morning', label: 'morning · 07:00', at: 7 * 60 },
];
/** The wait's fade and time card (frames: fade out, the card, fade in). The opening's sleep has its own (opening.ts SLEEP). */
export const WAIT_CARD = { out: 36, card: 96, in: 36 };

export interface ClockSave { day: number; min: number; seed: number }

const pad = (n: number) => (n < 10 ? '0' : '') + n;
/** 21:40 */
export const hm = (min: number) => { const m = ((Math.floor(min) % DAY_MIN) + DAY_MIN) % DAY_MIN; return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
/** DAY 3 · 21:40 */
export const stamp = (day: number, min: number) => 'DAY ' + day + ' · ' + hm(min);
/** "06:00" → 360; null when it is not a time of day. */
export function parseHM(s: unknown): number | null {
  if (typeof s !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]), mm = Number(m[2]);
  return h < 24 && mm < 60 ? h * 60 + mm : null;
}

/** Is `min` of `day` inside the window? */
export function inWindow(w: TimeWindow, day: number, min: number): boolean {
  const a = parseHM(w.from), b = parseHM(w.to);
  if (a === null || b === null) return false;
  const m = Math.floor(min);
  const inside = a <= b ? m >= a && m < b : m >= a || m < b;
  if (!inside) return false;
  if (!w.days?.length) return true;
  // a window that crosses midnight belongs to the day it started
  const d = a > b && m < b ? day - 1 : day;
  return w.days.some((x) => (x === 'odd' ? d % 2 === 1 : x === 'even' ? d % 2 === 0 : x === d));
}

/** What is wrong with a time window (the build's check), or null. */
export function windowProblem(w: unknown): string | null {
  if (!w || typeof w !== 'object' || Array.isArray(w)) return 'a time window is { "from": "HH:MM", "to": "HH:MM", "days"?: [...] }';
  const o = w as Record<string, unknown>;
  const extra = Object.keys(o).filter((k) => !['from', 'to', 'days'].includes(k));
  if (extra.length) return `unknown key "${extra[0]}" (from, to, days)`;
  if (parseHM(o.from) === null) return `from "${String(o.from)}" is not a time of day (HH:MM, 00:00–23:59)`;
  if (parseHM(o.to) === null) return `to "${String(o.to)}" is not a time of day (HH:MM, 00:00–23:59)`;
  if (o.from === o.to) return 'from and to are the same: the window is empty';
  if (o.days !== undefined && (!Array.isArray(o.days) || !o.days.length || o.days.some((d) => d !== 'odd' && d !== 'even' && !(Number.isInteger(d) && (d as number) > 0)))) {
    return 'days is a list of "odd", "even" or day numbers (1, 2, …)';
  }
  return null;
}

/** Minutes from `min` to the next `at` (a time of day); a whole day when it is that time now. */
export const until = (min: number, at: number) => { const d = (((at - Math.floor(min)) % DAY_MIN) + DAY_MIN) % DAY_MIN; return d || DAY_MIN; };

/** The city clock. One instance (`city`); the game binds the save's clock to it. */
export class CityClock {
  private s: ClockSave = { ...CLOCK_START, seed: 1 };
  /** The minute a story beat holds the clock at, or null: it runs. */
  pinned: number | null = null;
  /** Sudo's multiplier (CLOCK_SPEEDS): 1 as usual, 0 stopped. */
  speed = 1;

  /** Use this save's clock (it is written in place: storing the save stores the clock). */
  bind(s: ClockSave) { this.s = s; }
  get day() { return this.s.day; }
  get min() { return this.s.min; }
  get seed() { return this.s.seed; }
  /** Minutes since day 1, 00:00. */
  get abs() { return (this.s.day - 1) * DAY_MIN + this.s.min; }
  get hour() { return Math.floor(this.s.min / 60); }
  get text() { return hm(this.s.min); }
  get stamp() { return stamp(this.s.day, this.s.min); }

  /** Real seconds pass in a scene: the clock runs (unless pinned or stopped). */
  tick(realSec: number) {
    if (this.pinned !== null || !this.speed) return;
    this.advance(realSec * CLOCK_RATE * this.speed);
  }

  /** Jump ahead (travel, waiting). Pinned: nothing moves. */
  advance(minutes: number) {
    if (this.pinned !== null || minutes <= 0) return;
    this.set(this.abs + minutes);
  }

  /** Hold the clock at a minute of today (a story beat). */
  pin(min: number) { this.pinned = min; this.s.min = min; }
  /** Let it run again, from `from` if given (else from where it was held). */
  release(from?: number) { if (from !== undefined) this.s.min = from; this.pinned = null; }

  /** Sudo: go to this day and minute (a pin stays a pin, at the new minute). */
  setTime(day: number, min: number) {
    this.set((Math.max(1, Math.round(day)) - 1) * DAY_MIN + Math.max(0, Math.min(DAY_MIN - 1e-6, min)));
    if (this.pinned !== null) this.pinned = this.s.min;
  }

  /** Is it inside this window now? */
  within(w: TimeWindow) { return inWindow(w, this.s.day, this.s.min); }

  /** Minutes of waiting to reach a "wait until…" choice. */
  waitFor(w: WaitTo) { return w.hour ? 60 - (this.s.min % 60) : until(this.s.min, w.at!); }

  private set(abs: number) {
    const a = Math.max(0, abs);
    this.s.day = Math.floor(a / DAY_MIN) + 1;
    this.s.min = a - (this.s.day - 1) * DAY_MIN;
  }
}

/** The city's clock (game.ts binds it to the save). */
export const city = new CityClock();

/** A new save's clock: day 1, 09:40, a fresh weather seed. */
export const newClock = (): ClockSave => ({ ...CLOCK_START, seed: 1 + Math.floor(Math.random() * 0x7ffffff) });
/** A stored clock, anything missing or broken filled in (old saves: day 1, 09:40, seed 1). */
export function fixClock(c: unknown): ClockSave {
  const o = (c && typeof c === 'object' ? c : {}) as Partial<ClockSave>;
  const day = Number.isInteger(o.day) && o.day! > 0 ? o.day! : CLOCK_START.day;
  const min = typeof o.min === 'number' && o.min >= 0 && o.min < DAY_MIN ? o.min : CLOCK_START.min;
  const seed = Number.isInteger(o.seed) ? o.seed! : 1;
  return { day, min, seed };
}
