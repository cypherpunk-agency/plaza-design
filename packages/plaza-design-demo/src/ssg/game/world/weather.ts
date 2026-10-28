/**
 * The city's weather (TIME.md, "Weather"): states, each district's climate, a forecast generated
 * ahead and seeded (so the report can tell the truth), and the Registry's report.
 *
 * - **States:** clear, cloudy, rain, storm, fog, smog, heat.
 * - **Climates** (`CLIMATES`): weights per district. Downtown rains, the harbor fogs, the Neon
 *   Market smogs, the Galleria is under a roof (no weather inside; the report says so), the Spire
 *   is above the weather (always clear), the Undercity is always wet. The beach has its own: the
 *   harbor's fronts, less fog, heat in the daytime.
 * - **The forecast:** the day is cut into `BLOCK`-minute blocks. Each block draws a state from its
 *   climate, weighted by a city-wide front (wet blocks rain everywhere at once, more or less) and by
 *   the hour (fog at night and early morning, heat only by day); a block keeps the one before with
 *   `STAY`. A new block fades in over `FADE` minutes. Everything is a pure function of the save's
 *   weather seed, the climate and the minute: `weatherAt(climate, day, min)`.
 * - **The report** (`reportLines`, the terminal's `weather`; `screenLine`, public screens): dry,
 *   the Registry's voice, sometimes slightly optimistic (a seeded few rain spans are "showers
 *   possible", a storm can be "rain, windy").
 * - **Sudo** overrides a district or the whole city (`setOverride`); not saved.
 *
 * Pure: no DOM. Scenes say whether weather shows in them (`ambient.weather`); which climate a scene
 * is in follows the city's places (`sceneClimate`).
 */

import { city, DAY_MIN, hm } from './clock';
import type {CitySource,DistrictId} from './city';
import citySource from './city.json';
import type {ClimateDef} from './weather-kinds';

import {WEATHER_KINDS,type WeatherKind} from './weather-kinds';
export {WEATHER_KINDS,isWeather,type WeatherKind} from './weather-kinds';

/** A district's climate, or the beach's own. */
export type Climate = DistrictId | 'beach';

export const CLIMATES = citySource.CLIMATES as Record<Climate,ClimateDef>;
export const CLIMATE_IDS = Object.keys(CLIMATES) as Climate[];
export type WeatherSource=Pick<CitySource,'CLIMATES'|'PLACES'|'DISTRICTS'>;

/** Forecast blocks (minutes), how long a new block fades in, the chance a block keeps the last one's weather. */
export const BLOCK = 180, FADE = 40, STAY = 0.4;
/** Heat only by day: blocks starting from 09:00 up to 18:00. Fog likes night and early morning. */
const DAY_FROM = 9 * 60, DAY_TO = 18 * 60;

// ---------- seeded numbers ----------

const hash = (...n: number[]) => {
  let h = 2166136261;
  for (const v of n) { h ^= v | 0; h = Math.imul(h, 16777619); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; }
  return (h >>> 0) / 4294967296;
};
const cid = (c: Climate,source:WeatherSource) => source.CLIMATES[c].seed;

/** The city-wide front for a block (0 dry … 1 wet): neighbouring blocks lean the same way. */
const front = (seed: number, b: number) => 0.6 * hash(seed, Math.floor(b / 2), 7) + 0.4 * hash(seed, b, 8);

/** A block's own draw, before persistence. */
function fresh(seed: number, c: Climate, b: number,source:WeatherSource): WeatherKind {
  const C = source.CLIMATES[c];
  if (C.fixed) return C.fixed;
  const start = (((b * BLOCK) % DAY_MIN) + DAY_MIN) % DAY_MIN, day = start >= DAY_FROM && start < DAY_TO;
  const wet = front(seed, b), night = start < DAY_FROM || start >= 21 * 60;
  let total = 0;
  const w = WEATHER_KINDS.map((k) => {
    let v = C.weights[k] ?? 0;
    if (k === 'rain' || k === 'storm') v *= 0.25 + 1.5 * wet;
    if (k === 'clear' || k === 'heat') v *= 1.75 - 1.5 * wet;
    if (k === 'heat' && !day) v = 0;
    if (k === 'fog') v *= night ? 1.8 : day ? 0.4 : 1;
    if (k === 'smog' && day) v *= 1.4;
    total += v;
    return v;
  });
  let r = hash(seed, cid(c,source), b, 1) * total;
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0 && w[i] > 0) return WEATHER_KINDS[i]; }
  return 'clear';
}

/** The weather of a block (minutes since day 1 / BLOCK): it may keep the last block's, up to three back. */
function blockKind(seed: number, c: Climate, b: number,source:WeatherSource): WeatherKind {
  if(source.CLIMATES[c].fixed)return source.CLIMATES[c].fixed!;
  let at = b;
  for (let i = 0; i < 3 && hash(seed, cid(c,source), at, 2) < STAY; i++) at--;
  let k = fresh(seed, c, at,source);
  // kept from a daytime block into the evening, heat cools down
  const start = (((b * BLOCK) % DAY_MIN) + DAY_MIN) % DAY_MIN;
  if (k === 'heat' && (start < DAY_FROM || start >= DAY_TO)) k = 'clear';
  return k;
}

// ---------- how a state looks (levels 0..1, for the visuals and for logic) ----------

export interface Weather {
  /** The state now (the new block's once it is half faded in). */
  kind: WeatherKind;
  /** The block before, and how far the new one has faded in (0..1). */
  from: WeatherKind;
  mix: number;
  cloud: number;
  rain: number;
  storm: number;
  fog: number;
  smog: number;
  heat: number;
  /** The ground: wet while it rains and for a while after. */
  wet: number;
  wind: number;
}
type Levels = Omit<Weather, 'kind' | 'from' | 'mix'>;

const ZERO: Levels = { cloud: 0, rain: 0, storm: 0, fog: 0, smog: 0, heat: 0, wet: 0, wind: 0.1 };
function levels(k: WeatherKind, i: number): Levels {
  switch (k) {
    case 'cloudy': return { ...ZERO, cloud: 0.7, wind: 0.2 };
    case 'rain': return { ...ZERO, cloud: 0.85, rain: i, wet: 1, wind: 0.25 + 0.2 * i };
    case 'storm': return { ...ZERO, cloud: 1, rain: 1, storm: 1, wet: 1, wind: 1 };
    case 'fog': return { ...ZERO, cloud: 0.4, fog: i, wet: 0.35, wind: 0.05 };
    case 'smog': return { ...ZERO, cloud: 0.3, smog: i };
    case 'heat': return { ...ZERO, heat: i, wind: 0.05 };
    default: return { ...ZERO };
  }
}
const mixL = (a: Levels, b: Levels, f: number): Levels => {
  const o = { ...a };
  for (const k of Object.keys(o) as (keyof Levels)[]) o[k] = a[k] + (b[k] - a[k]) * f;
  return o;
};
/** A block's strength (0.45..0.95): a drizzle or a downpour, a haze or a pea-souper. */
const strength = (seed: number, c: Climate, b: number,source:WeatherSource) => 0.45 + 0.5 * hash(seed, cid(c,source), b, 3);

// ---------- sudo: overrides ----------

/** Sudo's overrides: a climate, or the whole city (`city`). Not saved. */
const OVERRIDE: Partial<Record<Climate | 'city', WeatherKind>> = {};
export function setOverride(where: Climate | 'city', k: WeatherKind | null) { if (k) OVERRIDE[where] = k; else delete OVERRIDE[where]; }
export const overrideOf = (where: Climate | 'city') => OVERRIDE[where] ?? null;
export const anyOverride = () => Object.keys(OVERRIDE).length > 0;
const forced = (c: Climate,source:WeatherSource): WeatherKind | null => OVERRIDE[c] ?? OVERRIDE[(source.PLACES.find(p=>p.climate===c)?.district??c) as Climate] ?? (source.CLIMATES[c].fixed ? null : OVERRIDE.city ?? null);

// ---------- the API ----------

/** The weather in a climate at a moment (day, minute of the day). Deterministic for the save's seed. */
export function weatherAt(c: Climate, day: number, min: number, seed = city.seed,source:WeatherSource=citySource as WeatherSource): Weather {
  const f = forced(c,source);
  if (f) return { kind: f, from: f, mix: 1, ...levels(f, 0.8) };
  const abs = (day - 1) * DAY_MIN + min, b = Math.floor(abs / BLOCK);
  const k = blockKind(seed, c, b,source), p = blockKind(seed, c, b - 1,source);
  const into = abs - b * BLOCK, raw = Math.min(1, into / FADE), mix = raw * raw * (3 - 2 * raw);
  const now = levels(k, strength(seed, c, b,source)), before = levels(p, strength(seed, c, b - 1,source));
  const out = mixL(before, now, mix);
  // the ground stays wet for the block after rain, drying slowly
  if (p === 'rain' || p === 'storm') out.wet = Math.max(out.wet, 0.8 * (1 - into / BLOCK));
  return { kind: mix >= 0.5 ? k : p, from: p, mix, ...out };
}

/** The weather here and now. */
export const weatherNow = (c: Climate | null,source:WeatherSource=citySource as WeatherSource): Weather => (c ? weatherAt(c, city.day, city.min,city.seed,source) : { kind: 'clear', from: 'clear', mix: 1, ...ZERO });

/** Which climate a scene is in (its place's district; the beach its own). LINE 0's car runs through Downtown's. */
export function sceneClimate(scene:string,source:WeatherSource=citySource as WeatherSource):Climate|null {
 const place=source.PLACES.find(p=>(p.scenes as readonly string[]).includes(scene));
 return place?(place.climate??place.district??'downtown') as Climate:null;
}

/** Isolated authoring/fixture scope; public weather screens and scene effects read one weather. */
export function withSceneWeather<T>(scene: string, kind: WeatherKind | null, render: () => T, reportingClimate:Climate|null|undefined=undefined,source:WeatherSource=citySource as WeatherSource): T {
  const climate = sceneClimate(scene,source), previousHere = here;
  const previous = climate ? overrideOf(climate) : null;
  if (climate) setOverride(climate, kind);
  here = reportingClimate===undefined?climate:reportingClimate;
  try { return render(); } finally { here = previousHere; if (climate) setOverride(climate, previous); }
}

/** The scene on screen (the game sets it), so a public screen can report "here". */
let here: Climate | null = 'downtown';
export const setHereClimate = (c: Climate | null) => { here = c; };
export const hereClimate = () => here;

// ---------- the forecast and the report ----------

export interface Span { kind: WeatherKind; from: number; to: number }

/** The next `hours` as spans of the same weather (absolute minutes since day 1), the first from now. */
export function forecast(c: Climate, hours = 12, abs = city.abs, seed = city.seed,source:WeatherSource=citySource as WeatherSource): Span[] {
  const f = forced(c,source);
  if (f) return [{ kind: f, from: abs, to: abs + hours * 60 }];
  // to the end of the block the horizon falls in (a report says 06:00–09:00, not 06:00–09:40)
  const out: Span[] = [], end = Math.ceil((abs + hours * 60) / BLOCK) * BLOCK;
  for (let b = Math.floor(abs / BLOCK); b * BLOCK < end; b++) {
    const k = blockKind(seed, c, b,source), from = Math.max(abs, b * BLOCK), to = Math.min(end, (b + 1) * BLOCK);
    const last = out[out.length - 1];
    if (last && last.kind === k) last.to = to; else out.push({ kind: k, from, to });
  }
  return out;
}

const NAME: Record<WeatherKind, string> = { clear: 'CLEAR', cloudy: 'CLOUDY', rain: 'RAIN', storm: 'STORM', fog: 'FOG', smog: 'SMOG', heat: 'HEAT' };
/** What the Registry adds, by the worst weather coming. Dry; the people do the jokes. */
const ADVISORY: Record<WeatherKind, string> = {
  storm: 'STAY INDOORS. INDOORS IS ALSO MONITORED.',
  rain: 'THE REGISTRY REMINDS YOU THAT UMBRELLAS ARE REGISTERED.',
  fog: 'VISIBILITY REDUCED. CAMERA COVERAGE IS NOT AFFECTED.',
  smog: 'AIR QUALITY: POOR. FILTER MASKS ARE AVAILABLE TO VERIFIED RESIDENTS.',
  heat: 'HYDRATION IS A PERSONAL RESPONSIBILITY.',
  cloudy: 'NO ACTION NEEDED.',
  clear: 'NO ACTION NEEDED.',
};
const WORST: WeatherKind[] = ['storm', 'rain', 'fog', 'smog', 'heat', 'cloudy', 'clear'];

/** How the Registry words a span: mostly the truth, sometimes a little optimistic (seeded per span). */
function worded(s: Span, seed: number, c: Climate,source:WeatherSource) {
  const r = hash(seed, cid(c,source), Math.floor(s.from / BLOCK), 9);
  if (s.kind === 'rain' && r < 0.25) return 'CLOUDY, SHOWERS POSSIBLE';
  if (s.kind === 'storm' && r < 0.3) return 'RAIN, WINDY';
  if (s.kind === 'smog' && r < 0.2) return 'HAZY';
  return NAME[s.kind];
}
const when = (s: Span, now: number, i: number) => (i === 0 && s.from <= now ? 'NOW' : hm(s.from)) + '–' + hm(s.to);

/** One climate's forecast as one line: "RAIN NOW–00:00. CLOUDY 00:00–06:00." */
export function forecastLine(c: Climate, hours = 12, abs = city.abs, seed = city.seed,source:WeatherSource=citySource as WeatherSource): string {
  const C = source.CLIMATES[c];
  if (C.fixed && !forced(c,source)) return C.note ?? NAME[C.fixed] + '.';
  return forecast(c, hours, abs, seed,source).map((s, i) => worded(s, seed, c,source) + ' ' + when(s, abs, i) + '.').join(' ');
}

/**
 * The terminal's `weather`: the Registry's report for where you are (`here`, null on the move)
 * and the city, the next `hours`, and one advisory for the worst of it.
 */
export function reportLines(here: Climate | null, hours = 12,source:WeatherSource=citySource as WeatherSource): string[] {
  const abs = city.abs, seed = city.seed, out = ['REGISTRY WEATHER SERVICE · ' + city.stamp + ' · NEXT ' + hours + ' HOURS'];
  const at = here ?? 'downtown';
  const line = (c: Climate) => { const C = source.CLIMATES[c]; return C.name + ': ' + (C.roof ? C.roof + ' OUTSIDE: ' : '') + forecastLine(c, hours, abs, seed,source); };
  out.push(line(at).replace(': ', here ? ' (YOUR LOCATION): ' : ': '));
  // the city: every district, and the beach (its own climate) after the harbor
  const all = source.DISTRICTS.flatMap((d): Climate[] => [d.id,...source.PLACES.filter(p=>p.district===d.id&&p.climate&&p.climate!==d.id).map(p=>p.climate as Climate)]);
  for (const c of all) if (c !== at) out.push(line(c));
  const kinds = new Set(forecast(at, hours, abs, seed,source).map((s) => s.kind));
  out.push(ADVISORY[WORST.find((k) => kinds.has(k)) ?? 'clear']);
  return out;
}

/** One short line for a public screen: the weather here and until when, and the advisory. */
export function screenLine(c: Climate | null = here,source:WeatherSource=citySource as WeatherSource): string {
  const at = c ?? 'downtown', C = source.CLIMATES[at];
  if (C.fixed && !forced(at,source)) return 'WEATHER: ' + (C.note ?? NAME[C.fixed]);
  const [now, next] = forecast(at, 12,city.abs,city.seed,source);
  const head = 'WEATHER: ' + worded(now, city.seed, at,source) + ' UNTIL ' + hm(now.to) + (next ? ' · THEN ' + worded(next, city.seed, at,source) : '');
  return head + ' · ' + ADVISORY[now.kind];
}

/** A word for the weather now, for lines that change with it ("rain", "fog"). */
