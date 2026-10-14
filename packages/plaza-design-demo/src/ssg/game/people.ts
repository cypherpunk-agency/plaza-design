/**
 * PEOPLE KIT: the city's people (and its cats, pigeons and robots), built from parts.
 *
 * HOW A SCENE ADDS PEOPLE
 *
 *   import { drawPeople, type Person } from '../people';
 *
 *   const STREET: Person[] = [
 *     { seed: 3, x: 300, act: 'walk', range: 220 },                  // a passer-by, walks 300 ⇄ 520
 *     { seed: 8, x: 410, act: 'haggle', facing: -1 },                // two people haggling...
 *     { seed: 9, x: 386, act: 'haggle', facing: 1 },                 // ...facing each other
 *     { look: { body: 'old', garb: 'coat', hair: 'brim' }, x: 600, act: 'smoke' },
 *     { look: 'cat', x: 700, act: 'sit' },                           // non-humans: cat pigeon cleaner drone courier
 *     { id: 'gran', seed: 21, x: 820, act: 'sit', h: 10, name: 'GRAN',
 *       talk: [['First visit?', 'The fish is fresh.'], ['Still here?']] },  // talks; pages cycle per visit
 *   ];
 *   export const myScene: Scene = { ..., people: STREET,                 // the engine makes [E] TALK targets
 *     drawBackdrop(x, v) { ...walls...; drawPeople(x, v, STREET); ...counters in front... } };
 *
 * - A person is plain data: `seed` picks every part; `look` fixes some parts (the seed fills the rest).
 *   The same seed always gives the same person; neighbouring seeds give very different ones.
 * - `x` is world x (the centre of the feet), `h` the height they stand or sit on (a bench is about 10,
 *   a counter 24). `facing` 1 = right, -1 = left. `act` is what they do (see Act); walkers ('walk',
 *   'sweep', 'steal') go between `x` and `x + range` (or `range: [a, b]`), pausing at each end.
 * - `id` + `talk` make a person talkable: the scene lists them in `people` and the engine adds the
 *   [E] TALK prompt above them. `talk` is one set of pages, or a list of sets (one per visit, the last
 *   repeats). `name` heads the bubble. `key: true` marks the one person per scene with something that
 *   matters (a rumour, a hint): they get a faint speech mark so a curious player finds them.
 * - Behind a counter: use a 'tall' or 'avg' body, or lift them with `h` (a crate to stand on), so
 *   more than a forehead shows over the goods.
 * - Draw order is the scene's: call `drawPeople` (or `drawPerson`) where the people belong, behind a
 *   counter or in front of a stall. `ps` (pixel size, default 3 = the player's scale) and `dim` (0..1)
 *   and `parallax` put people in a back band; a back crowd is `crowd(seed, n, from, to, { ps: 2, dim: .55, parallax: .9 })`.
 * - Fast: every look and pose is baked once into a small canvas (with its rim) and blitted after that.
 * - People are never cyan (cyan = tech you can use); a rim keeps them off dark walls (ART-GUIDE §4, §6).
 */

import type { View } from './scenes/kit';

export type Body = 'avg' | 'tall' | 'short' | 'wide' | 'slim' | 'kid' | 'old';
export type Hair = 'bald' | 'short' | 'long' | 'bun' | 'mohawk' | 'cap' | 'beanie' | 'hood' | 'brim' | 'helmet' | 'scarf';
export type Garb = 'tee' | 'jacket' | 'coat' | 'dress' | 'apron' | 'hivis' | 'suit' | 'robe';
export type Extra = 'umbrella' | 'bag' | 'backpack' | 'cyberarm' | 'visor' | 'mask' | 'phone' | 'headphones' | 'glasses' | 'cane';
export type Critter = 'cat' | 'pigeon' | 'cleaner' | 'drone' | 'courier';
/**
 * What a person does. In place: stand (shifts weight, looks around), sit (on whatever is at `h`),
 * lean (legs crossed, arms folded), smoke, phone, haggle (gestures; pair two facing each other),
 * argue (faster, bigger), queue, sleep (lying on `h`), dance, vend (behind a counter, offers and waits).
 * Moving between `x` and `range`: walk, sweep (with a broom), steal (sneaks to the far end, reaches, runs back).
 * Drones: 'scan' hovers and sweeps a red beam down on whoever is below.
 */
export type Act = 'stand' | 'walk' | 'sit' | 'lean' | 'smoke' | 'phone' | 'haggle' | 'argue' | 'sweep' | 'queue' | 'sleep' | 'dance' | 'vend' | 'steal' | 'scan';

export interface Look {
  body?: Body; hair?: Hair; garb?: Garb; extras?: Extra[];
  /** Colours (hex): skin, hair, top, bottom (trousers, skirt), acc (hat, bag, umbrella, visor). */
  skin?: string; hairCol?: string; top?: string; bottom?: string; acc?: string;
}

export interface Person {
  /** Needed for talk (the engine's target id). */
  id?: string;
  seed?: number;
  look?: Look | Critter;
  x: number;
  h?: number;
  act?: Act;
  range?: number | [number, number];
  facing?: 1 | -1;
  /** World units per frame for walkers (the player walks 1.3). */
  speed?: number;
  name?: string;
  talk?: string[] | string[][];
  key?: boolean;
  /** Pixel size: 3 = the player's scale; 2 for a back band; 4–5 for a near foreground. */
  ps?: number;
  /** Darkens the person (0..1), for back bands. */
  dim?: number;
  parallax?: number;
}

// ---------- parts ----------

const SKINS = ['#f2cfae', '#e0b08a', '#c99068', '#a8744c', '#8a5a38', '#6a4228', '#4e2f1c'];
const HAIRS = ['#16100c', '#2e1d12', '#5a3620', '#8a5a2c', '#c09a5a', '#d8d2c6', '#8a2a1a', '#6a3a9a', '#3e7a3a', '#c8b040'];
/** Clothes: mid values that read on dark walls; no cyan (that is tech you can use). */
const CLOTH = ['#8a3a1a', '#a8642a', '#6e6a2a', '#6a2a3e', '#46506e', '#6a4a3a', '#54406a', '#9a7a2a', '#8a2a2a', '#4e5e3a', '#62626c', '#b8a68a', '#3a3438', '#7a4e7a', '#a84a3a', '#5a3a2a', '#2e4a5e', '#9a5a6a'];
const ACCS = ['#c83a2a', '#d8b040', '#e8e0d0', '#5a8a3a', '#8a3a8a', '#2a2a30', '#d86a2a', '#7a6a5a'];
const VISORS = ['#ff4a2a', '#ffd23a', '#9cff6a', '#ece4d6'];
const SHOES = ['#120c0a', '#2a1a12', '#3a3a3e', '#5a2a1a', '#d8d0c0'];
const BODIES: Record<Body, { leg: number; torso: number; tw: number; head: number; hw: number; lw: number; stoop?: number }> = {
  avg: { leg: 5, torso: 5, tw: 6, head: 4, hw: 5, lw: 2 },
  tall: { leg: 6, torso: 6, tw: 6, head: 4, hw: 5, lw: 2 },
  short: { leg: 4, torso: 4, tw: 6, head: 4, hw: 5, lw: 2 },
  wide: { leg: 4, torso: 6, tw: 8, head: 4, hw: 5, lw: 3 },
  slim: { leg: 6, torso: 5, tw: 4, head: 4, hw: 5, lw: 1 },
  kid: { leg: 3, torso: 3, tw: 4, head: 3, hw: 4, lw: 1 },
  old: { leg: 4, torso: 5, tw: 6, head: 4, hw: 5, lw: 2, stoop: 1 },
};
const BODY_LIST: Body[] = ['avg', 'avg', 'tall', 'short', 'wide', 'slim', 'old', 'avg', 'tall', 'wide'];
const HAIR_LIST: Hair[] = ['short', 'long', 'bun', 'bald', 'mohawk', 'cap', 'beanie', 'hood', 'brim', 'helmet', 'scarf', 'short', 'long'];
const GARB_LIST: Garb[] = ['tee', 'jacket', 'jacket', 'coat', 'dress', 'hivis', 'suit', 'robe', 'coat', 'tee'];
const EXTRA_LIST: Extra[] = ['umbrella', 'bag', 'backpack', 'cyberarm', 'visor', 'mask', 'phone', 'headphones', 'glasses', 'phone', 'bag'];

interface Full { body: Body; hair: Hair; garb: Garb; extras: Extra[]; skin: string; hairCol: string; top: string; bottom: string; acc: string; shoes: string; visor: string }

const rnd = (seed: number) => { let s = (seed * 2654435761) % 2147483647 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const pick = <T,>(r: () => number, a: readonly T[]) => a[Math.floor(r() * a.length)];

/** A full look from a seed, with any parts the scene fixed. */
export function lookFrom(seed: number, fix: Look = {}): Full {
  const r = rnd(seed + 11);
  const body = fix.body ?? pick(r, BODY_LIST);
  const garb = fix.garb ?? pick(r, GARB_LIST);
  let extras = fix.extras;
  if (!extras) {
    extras = [];
    const n = r() < 0.25 ? 0 : r() < 0.75 ? 1 : 2;
    for (let i = 0; i < n; i++) { const e = pick(r, EXTRA_LIST); if (!extras.includes(e)) extras.push(e); }
    if (body === 'old' && r() < 0.6) extras.push('cane');
    if (extras.includes('umbrella') && extras.includes('cane')) extras = extras.filter((e) => e !== 'cane');
  }
  const top = fix.top ?? pick(r, CLOTH);
  let bottom = fix.bottom ?? pick(r, CLOTH);
  if (bottom === top) bottom = shade(top, 0.6);
  return {
    body, garb, extras,
    hair: fix.hair ?? (body === 'kid' ? pick(r, ['short', 'cap', 'long', 'bun', 'beanie'] as Hair[]) : pick(r, HAIR_LIST)),
    skin: fix.skin ?? pick(r, SKINS), hairCol: fix.hairCol ?? (body === 'old' ? pick(r, ['#d8d2c6', '#a8a29a', '#e8e4dc']) : pick(r, HAIRS)),
    top, bottom, acc: fix.acc ?? pick(r, ACCS), shoes: pick(r, SHOES), visor: pick(r, VISORS),
  };
}

export function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16), c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return '#' + ((1 << 24) | (c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).slice(1);
}

// ---------- the pixel grid ----------

/** Grid columns and rows: wide enough for an umbrella or a person lying down; row 0 is the feet. */
const W = 21, CX = 10, H = 26;
type Grid = (string | 0)[];
const grid = (): Grid => new Array(W * H).fill(0);
const put = (g: Grid, c: number, r: number, col: string) => { if (c >= 0 && c < W && r >= 0 && r < H) g[r * W + c] = col; };
const clr = (g: Grid, c: number, r: number) => { if (c >= 0 && c < W && r >= 0 && r < H) g[r * W + c] = 0; };
const rect = (g: Grid, c0: number, r0: number, c1: number, r1: number, col: string) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) put(g, c, r, col); };

/** Where the hand and mouth ended up (grid cells), for live effects (smoke, phone glow, zzz). */
interface Meta { hand: [number, number]; mouth: [number, number]; top: number }

type Legs = 'stand' | 'shift' | 'stepA' | 'stepB' | 'cross' | 'wide' | 'sit' | 'lie';
type Arms = 'down' | 'raise' | 'phone' | 'out' | 'point' | 'reach' | 'up' | 'hip' | 'fold' | 'hold' | 'broomA' | 'broomB';

function human(L: Full, legs: Legs, arms: Arms): [Grid, Meta] {
  if (legs === 'lie') return lying(L);
  const B = BODIES[L.body], g = grid(), has = (e: Extra) => L.extras.includes(e);
  const tw = B.tw, Lc = CX - (tw >> 1), Rc = Lc + tw - 1, T = B.torso;
  const sit = legs === 'sit', seat = Math.ceil(B.leg / 2);
  const base = sit ? seat + 1 : B.leg, sh = base + T - 1, hb = sh + 1, ht = hb + B.head - 1;
  const hx = CX + (B.stoop ?? 0), hl = hx - 2, hr = hl + B.hw - 1;
  const legCol = L.garb === 'dress' ? shade(L.skin, 0.8) : L.bottom;
  if (has('umbrella') || has('cane')) { if (arms === 'down' || arms === 'hip') arms = 'hold'; }

  // legs
  if (sit) {
    rect(g, Lc, seat, Rc + 3, seat, L.garb === 'dress' || L.garb === 'robe' ? L.top : legCol);
    rect(g, Rc + 2, 1, Rc + 1 + B.lw, seat - 1, legCol);
    rect(g, Rc + 2, 0, Rc + 2 + B.lw, 0, L.shoes);
  } else {
    const [dL, dR] = legs === 'shift' ? [0, 1] : legs === 'stepA' ? [-1, 1] : legs === 'stepB' ? [1, -1] : legs === 'cross' ? [0, -2] : legs === 'wide' ? [-1, 1] : [0, 0];
    const low = legs === 'wide' ? 3 : 2;
    for (let r = 0; r < B.leg; r++) {
      const oL = r < low ? dL : 0, oR = r < low ? dR : 0, col = r === 0 ? L.shoes : legCol;
      rect(g, Lc + oL, r, Lc + B.lw - 1 + oL, r, col);
      rect(g, Rc - B.lw + 1 + oR, r, Rc + oR, r, col);
    }
    put(g, Rc + dR + 1, 0, L.shoes);
  }
  // torso and clothes
  const top = L.garb === 'hivis' ? '#c9a227' : L.garb === 'suit' ? '#26262e' : L.top;
  rect(g, Lc, base, Rc, sh, top);
  rect(g, Lc, base, Rc, base, shade(L.bottom, 0.7));
  if (!sit && (L.garb === 'coat' || L.garb === 'robe')) rect(g, Lc, L.garb === 'robe' ? 1 : Math.max(1, B.leg - 2), Rc, base, top);
  if (!sit && L.garb === 'dress') rect(g, Lc - 1, Math.max(1, B.leg - 3), Rc + 1, base, top);
  if (L.garb === 'jacket') rect(g, CX, base + 1, CX, sh - 1, shade(top, 1.3));
  if (L.garb === 'coat') { put(g, CX, sh, shade(top, 1.35)); put(g, CX + 1, sh - 1, shade(top, 1.35)); }
  if (L.garb === 'apron') { rect(g, Lc + 1, sit ? base : Math.max(1, base - 2), Rc - 1, sh - 1, '#cbbd9c'); put(g, Lc + 2, base + 1, '#8a5a3a'); }
  if (L.garb === 'hivis') rect(g, Lc, sh - 2, Rc, sh - 2, '#efe6c8');
  if (L.garb === 'suit') { put(g, CX, sh, '#ddd5c5'); put(g, CX + 1, sh, '#ddd5c5'); put(g, CX, sh - 1, '#a82020'); put(g, CX, sh - 2, '#a82020'); }
  if (has('backpack')) { rect(g, Lc - 2, Math.max(base, sh - T + 2), Lc - 1, sh - 1, L.acc); rect(g, Lc - 2, sh - 1, Lc - 1, sh - 1, shade(L.acc, 0.7)); }
  if (has('bag')) { for (let k = 0; k < Math.min(tw, T); k++) put(g, Rc - k, sh - k, shade(L.acc, 0.6)); if (!sit) rect(g, Lc - 2, base - 1, Lc - 1, base + 1, L.acc); }

  // arms: the back one (darker) first, then the front one in the pose
  const sleeve = L.garb === 'tee' ? L.skin : shade(top, 0.82);
  const cyber = has('cyberarm'), front = cyber ? '#8e949e' : sleeve, hand = cyber ? '#bfc4cc' : L.skin;
  const back = shade(sleeve, 0.68);
  if (arms === 'up') { rect(g, Lc - 1, sh, Lc - 1, sh + 2, back); put(g, Lc - 1, sh + 3, shade(L.skin, 0.75)); }
  else { rect(g, Lc - 1, sh - T + 2, Lc - 1, sh, back); put(g, Lc - 1, sh - T + 1, shade(L.skin, 0.75)); }
  if (L.garb === 'tee') { put(g, Lc - 1, sh, shade(top, 0.7)); }
  const R = Rc + 1;
  const ARM: Record<Arms, [number, number][]> = {
    down: Array.from({ length: T }, (_, k) => [0, -k] as [number, number]),
    raise: [[0, 0], [0, -1], [1, -1], [1, 0], [0, 1]],
    phone: [[0, 0], [0, -1], [1, -1], [2, -1]],
    out: [[0, 0], [1, -1], [2, -1], [3, -1]],
    point: [[0, 0], [1, 0], [2, 1], [3, 2]],
    reach: [[0, 0], [1, 0], [2, 0], [3, 0]],
    up: [[0, 0], [0, 1], [0, 2], [0, 3]],
    hip: [[0, 0], [1, -1], [1, -2], [0, -2]],
    fold: [[0, 0], [0, -1]],
    hold: [[0, 0], [0, -1], [1, -1]],
    broomA: [[0, 0], [1, -1], [1, -2]],
    broomB: [[0, 0], [1, -1], [2, -1]],
  };
  const path = ARM[arms];
  path.forEach(([dc, dr], i) => put(g, R + dc, sh + dr, i === path.length - 1 && arms !== 'fold' ? hand : front));
  if (L.garb === 'tee' && !cyber) put(g, R, sh, shade(top, 0.85));
  if (cyber && path.length > 1) put(g, R + path[1][0], sh + path[1][1], '#ffb030');
  let [hc, hrow] = path[path.length - 1];
  hc += R; hrow += sh;
  if (arms === 'fold') { rect(g, Lc + 1, sh - 2, R, sh - 2, front); put(g, Lc + 1, sh - 2, hand); hc = Lc + 1; hrow = sh - 2; }
  if (arms === 'phone') put(g, R + 2, sh, '#e4ecff');
  if (arms === 'hold') {
    const S = R + 1;
    if (has('umbrella')) {
      rect(g, S, sh, S, ht + 2, '#2a2018');
      rect(g, S - 5, ht + 3, S + 5, ht + 3, L.acc); rect(g, S - 4, ht + 4, S + 4, ht + 4, L.acc); rect(g, S - 2, ht + 5, S + 2, ht + 5, shade(L.acc, 1.2));
      put(g, S - 5, ht + 2, shade(L.acc, 0.6)); put(g, S + 5, ht + 2, shade(L.acc, 0.6));
    } else rect(g, S, 0, S, sh - 2, '#7a5a3a');
  }
  if (arms === 'broomA' || arms === 'broomB') {
    const lean = arms === 'broomA' ? 3 : 2;
    for (let r = hrow; r >= 1; r--) put(g, hc + 1 + Math.floor((hrow - r) / lean), r, '#6a4a2a');
    const end = hc + 1 + Math.floor((hrow - 1) / lean);
    rect(g, end - 1, 0, end + 1, 0, '#b89a50');
  }

  // head, face, hair
  const skin = L.hair === 'hood' ? shade(L.skin, 0.62) : L.skin, eye = B.head === 4 ? hb + 1 : hb + 1;
  rect(g, hl, hb, hr, ht, skin);
  put(g, hr - 2, eye, '#1a0d05'); put(g, hr, eye, '#1a0d05');
  const hcCol = L.hairCol, acc = L.acc;
  switch (L.hair) {
    case 'bald': clr(g, hl, ht); clr(g, hr, ht); break;
    case 'short': rect(g, hl, ht, hr, ht, hcCol); put(g, hl, ht - 1, hcCol); break;
    case 'long': rect(g, hl, ht, hr, ht, hcCol); rect(g, hl - 1, hb - 1, hl, ht - 1, hcCol); put(g, hr, ht - 1, hcCol); break;
    case 'bun': rect(g, hl, ht, hr, ht, hcCol); put(g, hl, ht - 1, hcCol); rect(g, hl, ht + 1, hl + 1, ht + 1, hcCol); break;
    case 'mohawk': rect(g, hl + 1, ht + 1, hr - 1, ht + 1, hcCol); put(g, hx, ht + 2, hcCol); put(g, hx - 1, ht + 2, hcCol); break;
    case 'cap': rect(g, hl, ht, hr, ht, acc); put(g, hr + 1, ht, shade(acc, 0.75)); put(g, hl, ht - 1, hcCol); break;
    case 'beanie': rect(g, hl, ht, hr, ht, shade(acc, 0.8)); rect(g, hl + 1, ht + 1, hr - 1, ht + 1, acc); break;
    case 'hood': rect(g, hl, ht, hr, ht + 1, top); rect(g, hl - 1, hb, hl, ht, top); put(g, hr, ht, top); clr(g, hl, ht + 1); break;
    case 'brim': rect(g, hl + 1, ht + 1, hr - 1, ht + 1, acc); rect(g, hl - 1, ht, hr + 1, ht, shade(acc, 0.75)); break;
    case 'helmet': rect(g, hl, ht - 1, hr, ht + 1, acc); clr(g, hl, ht + 1); clr(g, hr, ht + 1); rect(g, hl + 1, eye, hr + 1, eye, L.visor); break;
    case 'scarf': rect(g, hl, ht, hr, ht, acc); rect(g, hl, hb, hl, ht, acc); rect(g, hl, hb, hr, hb, shade(acc, 0.8)); break;
  }
  if (has('visor') && L.hair !== 'helmet') rect(g, hl + 1, eye, hr + 1, eye, L.visor);
  if (has('glasses')) rect(g, hr - 2, eye, hr, eye, '#0d0806');
  if (has('mask') && L.hair !== 'scarf') rect(g, hl + 1, hb, hr, hb, acc === '#2a2a30' ? '#e8e0d0' : acc);
  if (has('headphones')) { put(g, hl, eye, '#2a2a30'); put(g, hl, eye + 1, '#2a2a30'); rect(g, hl + 1, ht + 1, hr - 1, ht + 1, '#2a2a30'); put(g, hl, eye, acc); }
  return [g, { hand: [hc, hrow], mouth: [hr + 1, hb], top: Math.max(ht + 1, has('umbrella') && arms === 'hold' ? ht + 5 : 0) }];
}

/** Asleep on a bench or a counter, under a newspaper. */
function lying(L: Full): [Grid, Meta] {
  const B = BODIES[L.body], g = grid(), len = B.leg + B.torso + 3, a = CX - (len >> 1);
  rect(g, a, 0, a + B.leg - 1, 1, L.bottom); rect(g, a, 0, a, 1, L.shoes);
  rect(g, a + B.leg, 0, a + B.leg + B.torso - 1, 2, L.top);
  const hs = a + B.leg + B.torso;
  rect(g, hs, 0, hs + 2, 2, L.skin); rect(g, hs + 3, 0, hs + 3, 2, L.hairCol); put(g, hs + 1, 2, L.hairCol); put(g, hs + 1, 1, '#3a2010');
  rect(g, a + 2, 2, a + B.leg + B.torso - 2, 3, '#b8ad94'); rect(g, a + 3, 3, a + 5, 3, '#6a6458');
  return [g, { hand: [hs - 1, 2], mouth: [hs + 2, 2], top: 4 }];
}

// ---------- non-humans ----------

const CRITTERS: Record<Critter, { frames: Record<string, string[]>; pal: Record<string, string>; h?: number }> = {
  cat: {
    frames: {
      sitA: ['...k.k', '...kkk', '...kek', '..kkkk', '.kkkkk', 'kkkkkk'],
      sitB: ['...k.k', '...kkk', '...kek', 'k.kkkk', 'k.kkkk', '.kkkkk'],
      walkA: ['k......k.k', '.k.....kkk', '..kkkkkkek', '..kkkkkk..', '..k.k..k.k'],
      walkB: ['k......k.k', '.k.....kkk', '..kkkkkkek', '..kkkkkk..', '...k.kk.k.'],
    },
    pal: { k: '#2a2420', e: '#e8d040' },
  },
  pigeon: {
    frames: {
      standA: ['...hh.', '...heb', '.gggg.', 'ggggg.', '..p.p.'],
      standB: ['......', '......', '.ggggh', 'gggghe', '..p.pb'],
      walkA: ['...hh.', '...heb', '.gggg.', 'ggggg.', '..p.p.'],
      walkB: ['...hh.', '...heb', '.gggg.', 'ggggg.', '...pp.'],
    },
    pal: { g: '#7a7a88', h: '#4a7a6a', e: '#ff7a2a', b: '#c8a890', p: '#c86a5a' },
  },
  cleaner: {
    frames: {
      walkA: ['....ww....', '...wwww...', '.wwwwwwww.', '.wkkkkkkw.', '.wkeekkkw.', '.wwwwwwww.', '.wyyyyyyw.', 'bb.k..k.bb'],
      walkB: ['....ww....', '...wwww...', '.wwwwwwww.', '.wkkkkkkw.', '.wkkeekkw.', '.wwwwwwww.', '.wyyyyyyw.', '.b.k..k.b.'],
    },
    pal: { w: '#c8c0b0', k: '#1a1a1e', e: '#ffb030', y: '#d8a020', b: '#8a7a5a' },
  },
  drone: {
    frames: {
      walkA: ['pp....pp', '.ssssss.', 'sskrrkss', '..s..s..'],
      walkB: ['.p....p.', '.ssssss.', 'sskrrkss', '..s..s..'],
    },
    pal: { p: '#8a8e96', s: '#4a4f5a', k: '#16161a', r: '#ff2a44' },
    h: 64,
  },
  courier: {
    frames: {
      walkA: ['.oooooo.', '.oyoooo.', '.oooooo.', 'dddddddd', 'dkeekkkd', 'dddddddd', '.d....d.', '.d....d.', 'dd....dd'],
      walkB: ['.oooooo.', '.oyoooo.', '.oooooo.', 'dddddddd', 'dkkeekkd', 'dddddddd', '..d..d..', '..d..d..', '.dd..dd.'],
    },
    pal: { o: '#8a5a2a', y: '#d8c070', d: '#5a606a', k: '#141418', e: '#ffb030' },
  },
};
const CAT_COATS = ['#2a2420', '#b8682a', '#6a6460', '#d8d0c0', '#4a3a2a'];

function critter(kind: Critter, frame: string, seed: number): [Grid, Meta] {
  const C = CRITTERS[kind], rows = C.frames[frame] ?? Object.values(C.frames)[0], g = grid();
  const pal = kind === 'cat' ? { ...C.pal, k: CAT_COATS[seed % CAT_COATS.length] } : C.pal;
  const w = rows[0].length, c0 = CX - (w >> 1);
  rows.forEach((row, j) => { for (let i = 0; i < w; i++) if (row[i] !== '.') put(g, c0 + i, rows.length - 1 - j, pal[row[i]]); });
  return [g, { hand: [c0 + w - 1, rows.length - 1], mouth: [c0 + w - 1, rows.length - 2], top: rows.length }];
}

// ---------- baking ----------

interface Baked { c: HTMLCanvasElement; meta: Meta }
const BAKED = new Map<string, Baked>();
/** The rim: opaque, a warm mid tone two steps over the dark walls (ART-GUIDE §4). */
const RIM = '#6e4c36';

function bake(key: string, make: () => [Grid, Meta], ps: number, flip: boolean, dim: number): Baked {
  const k = key + '|' + ps + '|' + (flip ? 1 : 0) + '|' + dim;
  let b = BAKED.get(k);
  if (b) return b;
  const [g, meta] = make();
  const c = document.createElement('canvas');
  c.width = W * ps + 2; c.height = H * ps + 2;
  const x = c.getContext('2d')!;
  const at = (col: number) => (flip ? 2 * CX - col : col);
  // the rim: the silhouette one unit bigger all round, then the pixels on it
  x.fillStyle = RIM;
  for (let r = 0; r < H; r++) for (let col = 0; col < W; col++) if (g[r * W + col]) x.fillRect(at(col) * ps, (H - 1 - r) * ps, ps + 2, ps + 2);
  for (let r = 0; r < H; r++) for (let col = 0; col < W; col++) { const v = g[r * W + col]; if (v) { x.fillStyle = v; x.fillRect(1 + at(col) * ps, 1 + (H - 1 - r) * ps, ps, ps); } }
  if (dim > 0) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(6,3,2,' + dim + ')'; x.fillRect(0, 0, c.width, c.height); }
  b = { c, meta: flip ? { ...meta, hand: [at(meta.hand[0]), meta.hand[1]], mouth: [at(meta.mouth[0]), meta.mouth[1]] } : meta };
  BAKED.set(k, b);
  return b;
}

// ---------- behaviour ----------

interface Ready { full?: Full; critter?: Critter; key: string; ph: number; seed: number; a: number; b: number }
const READY = new WeakMap<Person, Ready>();
let looks = 0;

function ready(p: Person): Ready {
  let R = READY.get(p);
  if (R) return R;
  const seed = p.seed ?? Math.round(p.x * 7 + 3), crit = typeof p.look === 'string' ? p.look : undefined;
  const [a, b] = Array.isArray(p.range) ? p.range : [p.x, p.x + (p.range ?? 0)];
  R = { critter: crit, full: crit ? undefined : lookFrom(seed, (p.look as Look) ?? {}), key: 'L' + looks++, ph: (seed * 97) % 997, seed, a, b };
  READY.set(p, R);
  return R;
}

/** Where a walker is and which way it faces: there and back between a and b, with a pause at each end. */
function walkAt(p: Person, R: Ready, t: number, speed: number, pause: number) {
  const len = Math.abs(R.b - R.a);
  if (len < 1) return { x: R.a, face: p.facing ?? 1, moving: false, end: 0 };
  const run = len / speed, period = 2 * (run + pause), u = (t + R.ph * 3) % period, dir = R.b > R.a ? 1 : -1;
  if (u < pause) return { x: R.a, face: dir as 1 | -1, moving: false, end: -1 };
  if (u < pause + run) return { x: R.a + dir * (u - pause) * speed, face: dir as 1 | -1, moving: true, end: 0 };
  if (u < 2 * pause + run) return { x: R.b, face: -dir as 1 | -1, moving: false, end: 1 };
  return { x: R.b - dir * (u - 2 * pause - run) * speed, face: -dir as 1 | -1, moving: true, end: 0 };
}

const DEFAULT_SPEED: Partial<Record<Critter | 'human', number>> = { human: 0.32, cat: 0.45, pigeon: 0.12, cleaner: 0.22, drone: 0.35, courier: 0.55 };
const MOVERS: Act[] = ['walk', 'sweep', 'steal', 'scan'];

interface Frame { x: number; face: 1 | -1; legs: Legs | string; arms: Arms; bob: number; moving: boolean }

function frameOf(p: Person, R: Ready, t: number): Frame {
  const act = p.act ?? 'stand', ph = R.ph, tt = t + ph;
  let x = p.x, face: 1 | -1 = p.facing ?? 1, moving = false, end = 0;
  if (MOVERS.includes(act) && R.a !== R.b) {
    const sp = p.speed ?? DEFAULT_SPEED[R.critter ?? 'human'] ?? 0.3;
    const w = act === 'steal' ? stealAt(R, t, sp) : walkAt(p, R, t, sp, act === 'sweep' ? 160 : R.critter === 'pigeon' ? 200 : 70 + (ph % 90));
    ({ x, face, moving, end } = w);
  }
  const step = Math.floor(tt / (act === 'steal' && moving && face !== (R.b > R.a ? 1 : -1) ? 5 : 9)) % 2 ? 'stepA' : 'stepB';
  if (R.critter) {
    const c = R.critter;
    if (c === 'cat') return { x, face, legs: moving ? (Math.floor(tt / 8) % 2 ? 'walkA' : 'walkB') : tt % 500 < 60 ? 'sitB' : 'sitA', arms: 'down', bob: 0, moving };
    if (c === 'pigeon') return { x, face: moving ? face : (Math.floor(tt / 170) % 2 ? 1 : -1), legs: moving ? (Math.floor(tt / 6) % 2 ? 'walkA' : 'walkB') : tt % 90 < 25 ? 'standB' : 'standA', arms: 'down', bob: 0, moving };
    const spin = Math.floor(tt / (c === 'drone' ? 3 : 8)) % 2 ? 'walkA' : 'walkB';
    return { x, face, legs: c === 'courier' && !moving ? 'walkA' : spin, arms: 'down', bob: c === 'drone' ? Math.round(Math.sin(tt * 0.06) * 2) : 0, moving };
  }
  const slow = (n: number) => Math.floor(tt / n);
  const shift: Legs = tt % 420 < 210 ? 'stand' : 'shift';
  switch (act) {
    case 'walk': return { x, face, legs: moving ? step : shift, arms: 'down', bob: moving && step === 'stepA' ? 1 : 0, moving };
    case 'sweep': return { x, face, legs: moving ? step : 'stand', arms: slow(12) % 2 ? 'broomA' : 'broomB', bob: 0, moving };
    case 'steal': return { x, face, legs: moving ? step : 'stand', arms: !moving && end === 1 ? (slow(14) % 2 ? 'reach' : 'out') : 'down', bob: 0, moving };
    case 'sit': { const u = tt % 360; return { x, face, legs: 'sit', arms: R.full?.extras.includes('phone') ? 'phone' : u < 70 ? 'raise' : u < 110 ? 'out' : 'down', bob: 0, moving }; }
    case 'lean': return { x, face, legs: 'cross', arms: 'fold', bob: 0, moving };
    case 'smoke': { const u = tt % 280; return { x, face, legs: shift, arms: u < 50 ? 'raise' : 'hip', bob: 0, moving }; }
    case 'phone': return { x, face, legs: shift, arms: 'phone', bob: 0, moving };
    case 'haggle': return { x, face, legs: shift, arms: (['out', 'down', 'point', 'out', 'hip', 'down'] as Arms[])[slow(34) % 6], bob: 0, moving };
    case 'argue': { const k = slow(13); return { x, face, legs: k % 5 === 0 ? 'wide' : 'stand', arms: (['point', 'out', 'up', 'out', 'point', 'hip'] as Arms[])[k % 6], bob: k % 7 === 0 ? 1 : 0, moving }; }
    case 'queue': return { x, face, legs: shift, arms: R.full?.extras.includes('phone') ? 'phone' : slow(300) % 2 ? 'fold' : 'down', bob: 0, moving };
    case 'sleep': return { x, face, legs: 'lie', arms: 'down', bob: 0, moving };
    case 'dance': { const k = slow(16); return { x, face: k % 8 < 4 ? face : (-face as 1 | -1), legs: (['wide', 'stepA', 'wide', 'stepB'] as Legs[])[k % 4], arms: (['up', 'out', 'up', 'point'] as Arms[])[k % 4], bob: k % 2, moving }; }
    case 'vend': { const u = tt % 420; return { x, face, legs: 'stand', arms: u < 60 ? 'out' : u < 120 ? 'down' : u < 170 ? 'hip' : 'down', bob: 0, moving }; }
    default: {
      // stand: shifts weight, and now and then looks the other way
      const look = tt % 700 > 640 ? -face as 1 | -1 : face;
      return { x, face: look, legs: shift, arms: 'down', bob: 0, moving };
    }
  }
}

/** The kid's loop: sneak from a to b (the fruit), reach, then run back fast. */
function stealAt(R: Ready, t: number, sp: number) {
  const len = Math.abs(R.b - R.a), sneak = len / (sp * 0.6), grab = 70, run = len / (sp * 3), wait = 200;
  const u = (t + R.ph) % (sneak + grab + run + wait), dir = R.b > R.a ? 1 : -1;
  if (u < sneak) return { x: R.a + dir * (u / sneak) * len, face: dir as 1 | -1, moving: true, end: 0 };
  if (u < sneak + grab) return { x: R.b, face: dir as 1 | -1, moving: false, end: 1 };
  if (u < sneak + grab + run) return { x: R.b - dir * ((u - sneak - grab) / run) * len, face: -dir as 1 | -1, moving: true, end: 0 };
  return { x: R.a, face: -dir as 1 | -1, moving: false, end: -1 };
}

// ---------- drawing ----------

const psOf = (p: Person) => p.ps ?? 3;

/** One person, as they are at time v.t. */
export function drawPerson(x: CanvasRenderingContext2D, v: View, p: Person) {
  const R = ready(p), ps = psOf(p), f = frameOf(p, R, v.t);
  const sx = v.sx(f.x, p.parallax ?? 1);
  if (sx < -40 || sx > v.viewW + 40) return;
  const crit = R.critter, hDraw = (p.h ?? (crit ? CRITTERS[crit].h ?? 0 : 0)) + f.bob;
  const flip = f.face < 0;
  const key = R.key + ':' + f.legs + '.' + f.arms;
  const b = bake(key, () => (crit ? critter(crit, f.legs, R.seed) : human(R.full!, f.legs as Legs, f.arms)), ps, flip, p.dim ?? 0);
  const left = Math.round(sx - CX * ps - ps / 2) - 1, topY = Math.round(v.y(hDraw)) - H * ps - 1;
  x.drawImage(b.c, left, topY);
  if (p.dim && p.dim > 0.4) return;
  // live effects, from the baked hand and mouth
  const cell = (c: number, r: number) => [left + 1 + c * ps + ps / 2, topY + 1 + (H - 1 - r) * ps + ps / 2];
  const act = p.act ?? 'stand', tt = v.t + R.ph;
  if (act === 'smoke') {
    const [hx, hy] = cell(b.meta.hand[0], b.meta.hand[1]);
    x.fillStyle = 'rgba(255,' + (f.arms === 'raise' ? 120 : 80) + ',40,.95)'; x.fillRect(Math.round(hx + (flip ? -ps : ps)), Math.round(hy - 1), 2, 2);
    const u = tt % 280;
    if (u > 55 && u < 170) for (let i = 0; i < 4; i++) {
      const k = (u - 55) / 115 + i * 0.12, [mx, my] = cell(b.meta.mouth[0], b.meta.mouth[1]);
      x.fillStyle = 'rgba(200,190,180,' + Math.max(0, 0.28 - k * 0.22) + ')';
      x.fillRect(Math.round(mx + (flip ? -1 : 1) * k * 10 + Math.sin(k * 6) * 2), Math.round(my - k * 22), 3 + Math.round(k * 3), 2 + Math.round(k * 2));
    }
  }
  if (f.arms === 'phone') {
    const [hx, hy] = cell(b.meta.hand[0] + (flip ? -0 : 0), b.meta.hand[1] + 1);
    x.fillStyle = 'rgba(210,225,255,.12)'; x.fillRect(Math.round(hx - 7), Math.round(hy - 10), 14, 12);
  }
  if (act === 'sleep') {
    const [mx, my] = cell(b.meta.mouth[0], b.meta.mouth[1]);
    for (let i = 0; i < 3; i++) {
      const k = ((tt * 0.01 + i / 3) % 1);
      x.font = '600 ' + (6 + i) + 'px "IBM Plex Mono", monospace'; x.fillStyle = 'rgba(255,217,165,' + (0.6 * (1 - k)) + ')';
      x.fillText('z', Math.round(mx + 3 + k * 8), Math.round(my - 6 - k * 18));
    }
  }
  if (crit === 'drone') {
    const blink = Math.floor(tt / 20) % 3 === 0;
    const [ex, ey] = cell(CX, 1);
    if (blink) { x.fillStyle = 'rgba(255,42,68,.35)'; x.fillRect(Math.round(ex - 4), Math.round(ey - 3), 8, 6); }
    if (act === 'scan') {
      const sw = Math.sin(tt * 0.05) * 10, gy = v.y(p.h ?? 0) + 0;
      x.fillStyle = 'rgba(255,42,68,.08)';
      x.beginPath(); x.moveTo(ex - 2, ey + 3); x.lineTo(ex - 14 + sw, v.y(0)); x.lineTo(ex + 14 + sw, v.y(0)); x.lineTo(ex + 2, ey + 3); x.closePath(); x.fill();
      x.fillStyle = 'rgba(255,42,68,.55)'; x.fillRect(Math.round(ex - 12 + sw), Math.round(v.y(0) - 12 - Math.abs(Math.sin(tt * 0.09)) * 30), 24, 1);
      void gy;
    }
  }
  if (crit === 'cleaner') {
    const on = Math.floor(tt / 15) % 2 === 0, [bx, by] = cell(CX, 7);
    if (on) { x.fillStyle = 'rgba(255,170,40,.95)'; x.fillRect(Math.round(bx - 2), Math.round(by - 3), 4, 2); x.fillStyle = 'rgba(255,170,40,.12)'; x.fillRect(Math.round(bx - 10), Math.round(by - 8), 20, 10); }
  }
  if (p.key && p.talk && !crit) {
    // the faint speech mark over someone with something to say (paper, not cyan: it is a person)
    const [mx] = cell(CX, 0), top = topY + 1 + (H - b.meta.top) * ps - 7 + (Math.floor(tt / 30) % 2);
    x.fillStyle = 'rgba(255,217,165,.75)'; x.fillRect(Math.round(mx - 3), top - 4, 7, 4); x.fillRect(Math.round(mx - 2), top, 2, 2);
  }
}

/** Draw a list of people, back to front in the order given. */
export function drawPeople(x: CanvasRenderingContext2D, v: View, list: readonly Person[]) {
  for (const p of list) drawPerson(x, v, p);
}

/** Where a person is now (walkers move). */
export function personX(p: Person, t: number) { return frameOf(p, ready(p), t).x; }

/** How tall a person is drawn, in world units (for prompts and bubbles). */
export function personHeight(p: Person) {
  const R = ready(p), ps = psOf(p);
  if (R.critter) return CRITTERS[R.critter].frames[Object.keys(CRITTERS[R.critter].frames)[0]].length * ps + (p.h ?? CRITTERS[R.critter].h ?? 0);
  const B = BODIES[R.full!.body];
  return (B.leg + B.torso + B.head + 1) * ps + (p.h ?? 0);
}

const SAID = new Map<Person, number>();
/** The pages a person says now: one set, or the next of several (the last repeats). */
export function talkTo(p: Person): { name: string; pages: string[] } {
  const T = p.talk ?? [];
  const name = p.name ?? 'STRANGER';
  if (!T.length || typeof T[0] === 'string') return { name, pages: T as string[] };
  const n = SAID.get(p) ?? 0;
  SAID.set(p, n + 1);
  const sets = T as string[][];
  return { name, pages: sets[Math.min(n, sets.length - 1)] };
}

/**
 * A crowd of distinct ambient people between `from` and `to`: walkers, a few standing about.
 * For back bands pass { ps: 2, dim: .5, parallax: .9 }.
 */
export function crowd(seed: number, n: number, from: number, to: number, opt: { ps?: number; dim?: number; parallax?: number; h?: number; acts?: Act[] } = {}): Person[] {
  const r = rnd(seed), acts = opt.acts ?? ['walk', 'walk', 'walk', 'stand', 'phone', 'walk', 'smoke'];
  return Array.from({ length: n }, (_, i) => {
    const x = from + r() * (to - from), act = pick(r, acts);
    return { seed: seed * 31 + i * 7, x, act, range: act === 'walk' ? (r() < 0.5 ? -1 : 1) * (120 + r() * 300) : 0, facing: r() < 0.5 ? 1 : -1, ps: opt.ps, dim: opt.dim, parallax: opt.parallax, h: opt.h };
  });
}

/**
 * A head-and-shoulders portrait of a seed's person, for screens (WANTED, ID cards, ads that know you):
 * drawn into the box (cx, top, w, h), clipped.
 */
export function drawPortrait(x: CanvasRenderingContext2D, seed: number, cx: number, top: number, w: number, h: number, ps = 2, look: Look = {}) {
  const full = lookFrom(seed, look), B = BODIES[full.body];
  const b = bake('P' + seed + JSON.stringify(look), () => human(full, 'stand', 'down'), ps, false, 0);
  const headTopRow = B.leg + B.torso + B.head + 1;
  x.save(); x.beginPath(); x.rect(cx - w / 2, top, w, h); x.clip();
  x.drawImage(b.c, Math.round(cx - CX * ps - ps / 2) - 1, Math.round(top + 3 - (H - headTopRow) * ps));
  x.restore();
}
