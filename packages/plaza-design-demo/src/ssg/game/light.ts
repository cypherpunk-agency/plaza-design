/**
 * Light from the city clock (TIME.md "Light", "Sun, moon, shadows"): where the sun and the moon
 * are, how much daylight there is, which way shadows fall in a scene, and whether a window is lit.
 *
 * - **The sun** rises at `RISE` (06:00) in the east (azimuth 90) and sets at `SET` (19:30) in the
 *   west (270), crossing the south; `sunAt(min)`: its height `el` (-1 deep night … 0 the horizon …
 *   0.95 noon) and azimuth `az` (compass degrees). No seasons.
 * - **The moon** has phases by the day count (`MOON_DAYS`-day cycle, `moonPhase(day)`: 0 new, 0.5
 *   full). It rises later each day like the real one: new with the sun, full at sunset.
 * - **Facing:** every scene looks toward a compass direction (`SceneDef.facing`, degrees; the sea
 *   is east). `rel(az, facing)` is where something is relative to the view (0 dead ahead, ±90 to
 *   the sides, 180 behind); the sky draws what is within `FOV` of ahead.
 * - **`lightAt`**: everything a frame needs in one object (`Light`): daylight, golden hour, the
 *   weather's cover, how strong the direct sun is, the light layer's strength, the colours. The game
 *   computes it once a frame for the scene on screen (`setLight`); characters and sets read it
 *   (`light()`).
 * - **Windows** (`windowLit`): each lit window has a seed; at dusk they switch on one by one
 *   (17:30–21:00), some go off after midnight, some come on early in the morning, a few stay on by
 *   day (offices), more under a dark sky.
 *
 * Pure: no DOM.
 */

import type { Weather } from './weather';

/** Sunrise and sunset (minutes of the day). Noon is between them (12:45). */
export const RISE = 6 * 60, SET = 19 * 60 + 30;
/** The moon's cycle in days (short, so it changes in play), and day 1's place in it (a waning crescent before dawn). */
export const MOON_DAYS = 16, MOON_DAY1 = 13.5;
/** Half the view's width in degrees: what is within this of ahead is in the picture. */
export const FOV = 55;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const smooth = (a: number, b: number, v: number) => { const f = clamp((v - a) / (b - a), 0, 1); return f * f * (3 - 2 * f); };
export const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
/** Where an azimuth is relative to a view facing `facing`: -180..180 (negative: to the left). */
export const rel = (az: number, facing: number) => ((((az - facing + 540) % 360) + 360) % 360) - 180;

/** A body in the sky: height (-1..~1; 0 the horizon), azimuth (compass degrees), above the horizon. */
export interface Body { el: number; az: number; up: boolean }

/** The sun at a minute of the day. */
export function sunAt(min: number): Body {
  const d = (min - RISE) / (SET - RISE);
  if (d >= 0 && d <= 1) return { el: Math.sin(d * Math.PI) * 0.95, az: 90 + d * 180, up: true };
  // under the horizon: sinking away from it (twilight is the first ~25 minutes either side)
  const off = d < 0 ? -d : d - 1;
  return { el: -Math.min(1, off * 3), az: d < 0 ? 90 - off * 40 : 270 + off * 40, up: false };
}

/** The moon's phase on a day: 0 new, 0.25 first quarter, 0.5 full, 0.75 last quarter. */
export const moonPhase = (day: number) => ((((day - 1 + MOON_DAY1) / MOON_DAYS) % 1) + 1) % 1;
/** How much of the disc is lit (0 new … 1 full). */
export const moonLit = (phase: number) => (1 - Math.cos(phase * Math.PI * 2)) / 2;
const PHASE_NAMES = ['NEW MOON', 'WAXING CRESCENT', 'FIRST QUARTER', 'WAXING GIBBOUS', 'FULL MOON', 'WANING GIBBOUS', 'LAST QUARTER', 'WANING CRESCENT'];
/** "WAXING CRESCENT" (sudo's readout). */
export const moonName = (phase: number) => PHASE_NAMES[Math.round(phase * 8) % 8];

/** The moon on a day at a minute: it rises `phase` of a day after the sun and crosses the sky like it. */
export function moonAt(day: number, min: number): Body & { phase: number; lit: number } {
  const phase = moonPhase(day), lit = moonLit(phase), span = SET - RISE;
  const riseAt = RISE + phase * 1440;
  // minutes since it last rose (yesterday's moon if it has not risen yet today)
  const since = ((((min - riseAt) % 1440) + 1440) % 1440), d = since / span;
  if (d <= 1) return { el: Math.sin(d * Math.PI) * 0.8, az: 90 + d * 180, up: true, phase, lit };
  return { el: -0.5, az: 270, up: false, phase, lit };
}

/** Everything a frame needs to know about the light (`lightAt`). */
export interface Light {
  day: number;
  min: number;
  /** The scene's facing (compass degrees). */
  facing: number;
  /** Outdoors: the sky, cast shadows and the grade apply (interiors take window light instead). */
  outdoor: boolean;
  sun: Body;
  moon: Body & { phase: number; lit: number };
  /** Sun and moon relative to the view (-180..180). */
  sunRel: number;
  moonRel: number;
  /** 0 night … 1 full day: how bright the sky is (before the weather). */
  daylight: number;
  /** 1 deep night … 0 day (the stars, the lit windows' share of the picture). */
  night: number;
  /** Golden hour: 1 with the sun on the horizon, 0 once it is high (and at night). */
  low: number;
  /** The low sun is the morning's (true) or the evening's. */
  morning: boolean;
  /** How much of the sky the weather covers (cloud, rain, fog, smog): 0 clear … 1 gone. */
  cover: number;
  /** How hard the direct sun is (shadows, shafts, the slatted sun): 0 none … 1 clear and up. */
  direct: number;
  /** The light layer's strength (windows, neon, lamps): weak at noon, full at night, more under a dark sky. */
  lamps: number;
  /** The sunlight's colour ("r,g,b"): gold low, white high. */
  sunCol: string;
  /** Shadow length per unit of height (the sun's), and its direction on screen: x per unit, y (depth) per unit. */
  shadow: { len: number; dx: number; dy: number };
  /** The weather it was made with (null indoors or without weather). */
  w: Weather | null;
}

const mixC = (a: number[], b: number[], f: number) => a.map((v, i) => Math.round(v + (b[i] - v) * f));

/**
 * The light now for a view facing `facing`. `w`: the weather here (null: clear, or indoors where
 * only the window's view of it matters; then pass it anyway for the panes).
 */
export function lightAt(day: number, min: number, facing: number, w: Weather | null, outdoor = true): Light {
  const sun = sunAt(min), moon = moonAt(day, min);
  const sunRel = rel(sun.az, facing), moonRel = rel(moon.az, facing);
  const daylight = smooth(-0.14, 0.22, sun.el), night = 1 - smooth(-0.16, 0.04, sun.el);
  const low = sun.el > -0.12 ? 1 - smooth(0.03, 0.32, sun.el) : 0;
  const cover = w ? clamp(Math.max(w.cloud * 0.8, w.rain, w.storm, w.fog * 0.9, w.smog * 0.6), 0, 1) : 0;
  const direct = sun.up ? smooth(0, 0.06, sun.el) * (1 - smooth(0.3, 0.85, cover)) : 0;
  // lamps: full at night, weak by day; a dark sky by day turns them up
  const lamps = clamp(lerp(1, 0.18, daylight) + daylight * cover * 0.35, 0, 1);
  const sunCol = mixC([255, 248, 228], [255, 150, 70], low).join(',');
  // the sun's angle over the horizon (radians) and the shadow it throws
  const ang = Math.max(0.045, sun.el * 1.2);
  const len = Math.min(7, 1 / Math.tan(ang)), r = (sunRel * Math.PI) / 180;
  const shadow = { len, dx: -Math.sin(r) * len, dy: Math.cos(r) * len };
  return { day, min, facing, outdoor, sun, moon, sunRel, moonRel, daylight, night, low, morning: min < 780, cover, direct, lamps, sunCol, shadow, w };
}

// ---------- the frame's light (the game sets it; characters and sets read it) ----------

let NOW: Light = lightAt(1, 9 * 60 + 40, 90, null);
/** The game: this frame's light (for the scene on screen). */
export const setLight = (l: Light) => { NOW = l; };
/** This frame's light. */
export const light = () => NOW;

// ---------- windows ----------

const hash = (...n: number[]) => {
  let h = 2166136261;
  for (const v of n) { h ^= Math.round(v * 1000) | 0; h = Math.imul(h, 16777619); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; }
  return (h >>> 0) / 4294967296;
};
const between = (m: number, a: number, b: number) => { a = ((a % 1440) + 1440) % 1440; b = ((b % 1440) + 1440) % 1440; return a <= b ? m >= a && m < b : m >= a || m < b; };

/**
 * Is a window (one that has a light: the scene decides which rooms have one) lit now? Seeded per
 * window: on one by one at dusk (17:30–21:00, later under a clear long evening), about half off
 * again between 23:00 and 03:30, some on early (05:30–07:00) until 07:30–09:00, a few all day
 * (more when the sky is dark).
 */
export function windowLit(seed: number, l: Light = NOW): boolean {
  if (l !== NOW) return litNow(seed, l);
  const m = Math.floor(l.min), c = Math.round(l.cover * 10);
  if (m !== cache.min || c !== cache.cover || cache.map.size > 20000) { cache.map.clear(); cache.min = m; cache.cover = c; }
  let v = cache.map.get(seed);
  if (v === undefined) { v = litNow(seed, l); cache.map.set(seed, v); }
  return v;
}
/** Windows asked this game minute (thousands of far windows a frame: hash each once a minute). */
const cache = { min: -1, cover: -1, map: new Map<number, boolean>() };
function litNow(seed: number, l: Light): boolean {
  const m = l.min, a = hash(seed, 1), b = hash(seed, 2), c = hash(seed, 3);
  if (c < 0.1 + 0.25 * l.cover * l.daylight) return true;
  const on = 1050 + a * 210, off = b < 0.55 ? 1380 + hash(seed, 4) * 270 : 360 + hash(seed, 5) * 150;
  if (between(m, on, off)) return true;
  // early risers
  if (hash(seed, 6) < 0.4 && between(m, 330 + hash(seed, 7) * 90, 450 + hash(seed, 8) * 90)) return true;
  return false;
}

/** How bright a scene's own painted lights should read (0.2 noon … 1 night): for scenes that dim their glows by day. */
export const glowLevel = (l: Light = NOW) => l.outdoor ? l.lamps : 1;
