/**
 * PEOPLE STYLE: the two review switches for the people kit, and its curated colours.
 *
 * - `style`: how a seeded person is coloured and dressed.
 *   `vivid` (default, Tommi's pick 2026-10-20): ordinary clothes plus one or two pieces of tech, in
 *   stronger colour, one bold piece each.
 *   `muted`: the same people in realistic everyday colours from the district's clothing palette. A
 *   scene that wants a quieter crowd sets `style: 'muted'` on those people's looks.
 *   `legacy`: the kit before named looks: fully random parts and colours (kept for comparison).
 * - `seated`: how people sit on benches and train seats that face the camera. `mixed` (default): each
 *   person picks front, three-quarter or side and now and then shifts to another (`sittingView`).
 *   `front`, `threeQuarter` or `side` put everyone in that one pose, for review.
 *   A person's own `sitView` wins over it.
 *
 * The game's defaults come from the People document (`people.json`, edited in Library › People). The
 * Characters workbench (Library › Characters) changes them live for review without saving.
 * Changing a switch bumps `peopleRevision()`, which re-dresses every person on their next draw.
 */
import PEOPLE from './people.json';

export const PEOPLE_STYLES = ['vivid', 'muted', 'legacy'] as const;
export type PeopleStyle = typeof PEOPLE_STYLES[number];
export const SEATED_VIEWS = ['mixed', 'front', 'threeQuarter', 'side'] as const;
export type SeatedView = typeof SEATED_VIEWS[number];
/** The poses a seated person can be in. */
export type SitPose = Exclude<SeatedView, 'mixed'>;

const settings: { style: PeopleStyle; seated: SeatedView } = { style: PEOPLE.style as PeopleStyle, seated: PEOPLE.seated as SeatedView };
let revision = 0;

export const peopleStyle = (): PeopleStyle => settings.style;
export const seatedView = (): SeatedView => settings.seated;
/** Bumped whenever a switch changes; cached looks older than this are rebuilt. */
export const peopleRevision = () => revision;
export function setPeopleStyle(style: PeopleStyle) { if (settings.style !== style) { settings.style = style; revision++; } }
export function setSeatedView(view: SeatedView) { if (settings.seated !== view) { settings.seated = view; revision++; } }

/** How often each pose comes up: front and three-quarter twice as often as side on. */
const SIT_WEIGHTS: readonly [SitPose, number][] = [['front', 2], ['threeQuarter', 2], ['side', 1]];
/** Frames a seated person holds a pose: 12 to 26 seconds at 60 fps, different for everyone. */
const SIT_HOLD = 720, SIT_HOLD_SPREAD = 840;
const mix = (a: number, b: number) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return (h >>> 0) / 4294967296; };
/** The weighted pose for a person's `n`th hold, never the one before it. */
function poseAt(seed: number, n: number, prev?: SitPose): SitPose {
  const rows = SIT_WEIGHTS.filter(([p]) => p !== prev), total = rows.reduce((a, [, w]) => a + w, 0);
  let x = mix(seed, n) * total; for (const [p, w] of rows) if ((x -= w) < 0) return p; return rows[0][0];
}

/**
 * Where a seated person is looking at frame `t` under the `mixed` switch: a pose from their seed, held
 * for a while, then a shift to another. Deterministic, so a paused picture and a replay agree.
 */
export function sittingView(seed: number, t: number): SitPose {
  const hold = SIT_HOLD + (seed * 37) % SIT_HOLD_SPREAD, k = Math.floor((t + (seed * 131) % hold) / hold);
  // the previous hold's pose only depends on its own number, so neighbours differ without a chain back to 0
  return poseAt(seed, k, poseAt(seed, k - 1));
}

// ---------- colours ----------

/** Skin: a wide, realistic range from very fair to very dark, warm and olive undertones. */
export const SKIN_TONES = ['#f4d6bf', '#eec4a2', '#e2b08a', '#d8b48a', '#d09c74', '#c08860', '#b8916a', '#a8744c', '#946038', '#80502e', '#6c4228', '#583420', '#46281a', '#382014'];

/** Natural hair, dark to light, then greys for elders. */
export const HAIR_NATURAL = ['#141010', '#1e1612', '#2e1d12', '#4a2e1c', '#6a3e22', '#7a3420', '#9a7a48', '#c4a46a'];
export const HAIR_GREY = ['#8a8680', '#a8a29a', '#d8d4cc', '#e8e4dc'];
/** Dyed hair (punks, fixers, some teens). No cyan. */
export const HAIR_DYED = ['#9a2a7a', '#3e8a3a', '#b02a1a', '#6a3a9a', '#e0d8a0', '#d86a2a'];

/** A district's clothing palette: tops, bottoms (trousers, skirts) and accents (hats, bags, scarves). */
export interface ClothPalette { tops: string[]; bottoms: string[]; accs: string[] }

const BOTTOMS = ['#2e2e34', '#3a3430', '#2a3038', '#46403a', '#383e46', '#4a4238', '#3e3a44'];

/**
 * Muted (everyday) palettes per district (world/city.json ids). Mid values that read on dark walls
 * with the rim; nothing cyan (cyan is tech the player can use).
 */
export const DISTRICT_PALETTES: Record<string, ClothPalette> = {
  // commuter greys, navy, olive, a rust or mustard here and there
  city: { tops: ['#5a5650', '#4e5662', '#6a5a48', '#4e5a46', '#6e6458', '#5e4a50', '#7a6a50', '#8a7a62', '#6a3e30', '#5e6a5a'], bottoms: BOTTOMS, accs: ['#8a3a2a', '#b08a3a', '#d8d0c0', '#4a6a4a', '#6a4a6a', '#2a2a30', '#a8642a'] },
  downtown: { tops: ['#4e5662', '#5a5650', '#6a5a48', '#4e5a46', '#46505e', '#6e6458', '#7a4a32', '#8a7a62', '#5a5e6a'], bottoms: BOTTOMS, accs: ['#8a3a2a', '#b08a3a', '#d8d0c0', '#2a2a30', '#a8642a', '#4a6a4a'] },
  market: { tops: ['#8a4a2a', '#9a7a2a', '#6a2a3e', '#4e5e3a', '#a8642a', '#7a4e6a', '#6a3a2a', '#8a5a3a', '#5a4a6a'], bottoms: ['#3a3430', '#46403a', '#2e2e34', '#4a3a2e', '#3e3a44'], accs: ['#c83a2a', '#d8b040', '#8a3a8a', '#d86a2a', '#e8e0d0', '#5a8a3a'] },
  galleria: { tops: ['#b89a72', '#d8ccb4', '#2a2628', '#6a2a34', '#3a4a3a', '#8a7a6a', '#4a3a48', '#c8b8a0'], bottoms: ['#2a2628', '#3a3430', '#5a4e44', '#2a3038', '#d0c4ae'], accs: ['#c8a050', '#e8e0d0', '#6a2a34', '#2a2a30', '#8a6a4a'] },
  harbor: { tops: ['#3a4658', '#5a6a3a', '#7a4a2a', '#5a5a5e', '#4a5a6a', '#6a5a3a', '#8a6a2a'], bottoms: ['#2a3038', '#383e46', '#3a3430', '#46403a', '#2e2e34'], accs: ['#c8641e', '#8a2a2a', '#d8d0c0', '#2e3a4a', '#b08a3a'] },
  oldq: { tops: ['#6a4a3a', '#7a3a30', '#8a7a5a', '#5a5a3e', '#6a5a50', '#9a8468', '#5a3e3a', '#7a6a4a'], bottoms: ['#3a3430', '#4a4238', '#46403a', '#2e2a28', '#5a4e40'], accs: ['#b08a3a', '#8a3a2a', '#d8d0c0', '#4a5a3a', '#6a4a5a'] },
  undercity: { tops: ['#4a4038', '#4e5040', '#5a5048', '#3e4044', '#5e4a3a', '#46423e', '#5a5a4a'], bottoms: ['#2a2826', '#34302c', '#2e3034', '#3a3630'], accs: ['#8a4a22', '#6a6a5a', '#5a3a2a', '#9a8a6a', '#7a2a1a'] },
  spire: { tops: ['#1e1e24', '#2e2e34', '#d8d4cc', '#4a4e58', '#3a3440', '#5a5a60'], bottoms: ['#1e1e24', '#2a2a30', '#3a3a40', '#c8c4bc'], accs: ['#c8a050', '#e8e0d0', '#2a2a30', '#8a2a2a'] },
  fringe: { tops: ['#c8641e', '#6a6a60', '#5a6040', '#8a5a2a', '#4e5458', '#b8962a'], bottoms: ['#2e2e34', '#383e46', '#3a3430', '#46403a'], accs: ['#d8b030', '#2a2a30', '#c8641e', '#d8d0c0'] },
  skyport: { tops: ['#2e3a4e', '#5a5e66', '#6a6248', '#3a4040', '#4a5262', '#7a7466'], bottoms: ['#1e2430', '#2e2e34', '#383e46', '#46403a'], accs: ['#a82a2a', '#d8d0c0', '#c8a050', '#2a2a30'] },
};
export const paletteFor = (district?: string): ClothPalette => DISTRICT_PALETTES[district ?? 'city'] ?? DISTRICT_PALETTES.city;

// ---------- colour helpers ----------

const hex2rgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const rgb2hex = (r: number, g: number, b: number) => '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1);

function toHsl(h: string): [number, number, number] {
  const [r, g, b] = hex2rgb(h).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const hh = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [hh * 60, s, l];
}
function fromHsl(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgb2hex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/** Relative lightness 0..1 (for keeping a top and its trousers apart). */
export const lightness = (h: string) => { const [r, g, b] = hex2rgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

/**
 * The vivid version of a cloth colour: more saturation, a little lighter, hues steered out of the
 * cyan band (cyan is usable tech). Greys gain a warm or cool cast instead of going grey-on-grey.
 */
export function vivify(h: string, k = 1): string {
  let [hue, s, l] = toHsl(h);
  if (s < 0.08) { hue = lightness(h) > 0.5 ? 35 : 220; s = 0.18; }
  s = Math.min(0.78, s * (1.9 * k) + 0.12);
  l = Math.min(0.62, Math.max(0.24, l * 1.08 + 0.03));
  if (hue > 160 && hue < 205) hue = hue < 182 ? 140 : 215;
  return fromHsl(hue, s, l);
}
