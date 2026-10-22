/** Pure character artwork and baked sprites. World scheduling/dialogue remain in characters.ts. */
import type { View } from '../core/view';
import type { Character, Body, Hair, Garb, Extra, Critter, Look, Act, Ready, Frame, Beam } from "../../runtime/characters";
import { castShadow } from '../atmosphere/lighting';
import { ARCHETYPES, EVERYDAY, archetypeOf, type Archetype, type ArchetypeId, type Facial } from './archetypes';
import { HAIR_GREY, HAIR_NATURAL, SKIN_TONES, lightness, paletteFor, peopleRevision, peopleStyle, vivify } from './people-style';
import { districtStyle } from './crowds';


// ---------- parts ----------

// The `legacy` people style draws from these (the kit before named looks); muted and vivid use people-style.ts.
const SKINS = ['#f2cfae', '#e0b08a', '#c99068', '#a8744c', '#8a5a38', '#6a4228', '#4e2f1c'];

const HAIRS = ['#16100c', '#2e1d12', '#5a3620', '#8a5a2c', '#c09a5a', '#d8d2c6', '#8a2a1a', '#6a3a9a', '#3e7a3a', '#c8b040'];

/** Clothes: mid values that read on dark walls; no cyan (that is tech you can use). */
const CLOTH = ['#8a3a1a', '#a8642a', '#6e6a2a', '#6a2a3e', '#46506e', '#6a4a3a', '#54406a', '#9a7a2a', '#8a2a2a', '#4e5e3a', '#62626c', '#b8a68a', '#3a3438', '#7a4e7a', '#a84a3a', '#5a3a2a', '#2e4a5e', '#9a5a6a'];

const ACCS = ['#c83a2a', '#d8b040', '#e8e0d0', '#5a8a3a', '#8a3a8a', '#2a2a30', '#d86a2a', '#7a6a5a'];

/** Tech light colours (visors, LED trim, wrist screens, earpieces, AR glints): red, amber, green, paper. Never cyan. */
const VISORS = ['#ff4a2a', '#ffd23a', '#9cff6a', '#ece4d6'];

const SHOES = ['#120c0a', '#2a1a12', '#3a3a3e', '#5a2a1a', '#d8d0c0'];

export const BODIES: Record<Body, { leg: number; torso: number; tw: number; head: number; hw: number; lw: number; stoop?: number; belly?: number }> = {
  avg: { leg: 5, torso: 5, tw: 6, head: 4, hw: 5, lw: 2 },
  tall: { leg: 6, torso: 6, tw: 6, head: 4, hw: 5, lw: 2 },
  short: { leg: 4, torso: 4, tw: 6, head: 4, hw: 5, lw: 2 },
  wide: { leg: 4, torso: 6, tw: 8, head: 4, hw: 5, lw: 3 },
  slim: { leg: 6, torso: 5, tw: 4, head: 4, hw: 5, lw: 1 },
  kid: { leg: 3, torso: 3, tw: 4, head: 3, hw: 4, lw: 1 },
  old: { leg: 4, torso: 5, tw: 6, head: 4, hw: 5, lw: 2, stoop: 1 },
  teen: { leg: 5, torso: 4, tw: 5, head: 4, hw: 5, lw: 1 },
  heavy: { leg: 4, torso: 6, tw: 8, head: 4, hw: 5, lw: 3, belly: 1 },
  broad: { leg: 6, torso: 6, tw: 8, head: 4, hw: 5, lw: 2 },
  frail: { leg: 4, torso: 5, tw: 4, head: 4, hw: 5, lw: 1, stoop: 1 },
};

const BODY_LIST: Body[] = ['avg', 'avg', 'tall', 'short', 'wide', 'slim', 'old', 'avg', 'tall', 'wide'];

const HAIR_LIST: Hair[] = ['short', 'long', 'bun', 'bald', 'mohawk', 'cap', 'beanie', 'hood', 'brim', 'helmet', 'scarf', 'short', 'long'];

const GARB_LIST: Garb[] = ['tee', 'jacket', 'jacket', 'coat', 'dress', 'hivis', 'suit', 'robe', 'coat', 'tee'];

const EXTRA_LIST: Extra[] = ['umbrella', 'bag', 'backpack', 'cyberarm', 'visor', 'mask', 'phone', 'headphones', 'glasses', 'phone', 'bag'];

/** Muted/vivid people with fixed parts but no named look: everyday things and tech. */
const PLAIN_EXTRAS: Extra[] = ['umbrella', 'bag', 'backpack', 'glasses', 'bag', 'muffler'];
const TECH_EXTRAS: Extra[] = ['phone', 'headphones', 'earpiece', 'arglasses', 'wristscreen', 'cyberarm', 'visor'];
const SUITS = ['#26262e', '#2e3440', '#3a3438', '#4a4e58'];
const TIES = ['#a82020', '#2e4a7a', '#6a2a3e', '#b08a3a'];
const VESTS = ['#c9a227', '#d8702a'];


/**
 * A dressed person. `vest`, `suit`, `tie`, `facial`, `patch` and `archetype` are set by the muted and
 * vivid styles; a legacy look leaves them out and draws exactly as the kit did before.
 */
export interface Full {
  body: Body; hair: Hair; garb: Garb; extras: Extra[]; skin: string; hairCol: string; top: string; bottom: string; acc: string; shoes: string;
  /** The tech light colour (visor, LED trim, wrist screen, earpiece, AR glint). */
  visor: string;
  facial?: Facial; vest?: string; suit?: string; tie?: string; patch?: string[]; archetype?: ArchetypeId;
}


export const rnd = (seed: number) => { let s = (seed * 2654435761) % 2147483647 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

export const pick = <T,>(r: () => number, a: readonly T[]) => a[Math.floor(r() * a.length)];

const weighted = <T extends string>(r: () => number, w: Partial<Record<T, number>>): T => {
  const rows = Object.entries(w) as [T, number][], total = rows.reduce((a, [, n]) => a + n, 0);
  let x = r() * total; for (const [k, n] of rows) if ((x -= n) <= 0) return k; return rows[0][0];
};


/**
 * A full look from a seed, with any parts the scene fixed, in the current people style
 * (people-style.ts). A named look (`archetype`) fixes its defining parts; the scene's own parts win.
 */
export function lookFrom(seed: number, fix: Look = {}): Full {
  if (peopleStyle() === 'legacy') {
    const A = archetypeOf(fix.archetype);
    if (!A) return legacyLook(seed, fix);
    // the named look's parts, the old random colours
    const r = rnd(seed + 5);
    return { ...legacyLook(seed, { body: pick(r, A.body), hair: pick(r, A.hair), garb: pick(r, A.garb), extras: [...(A.extras ?? [])], ...fix }), archetype: fix.archetype };
  }
  // a person's own style, else their district's (people.json), else the game-wide default
  return curatedLook(seed, fix, (fix.style ?? districtStyle(fix.district) ?? peopleStyle()) === 'vivid');
}

/** The kit before named looks (people style `legacy`): every part and colour at random. */
function legacyLook(seed: number, fix: Look): Full {
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
    ...(fix.facial ? { facial: fix.facial } : {}),
  };
}

/**
 * Muted and vivid people: a named look (the scene's, else an everyday one when the scene fixed no parts),
 * curated skin and hair, the district's clothing palette, and no clashes (a top and its trousers stay apart).
 */
function curatedLook(seed: number, fix: Look, vivid: boolean): Full {
  const r = rnd(seed + 17);
  const fixedParts = fix.body || fix.hair || fix.garb || fix.extras;
  const id: ArchetypeId | undefined = fix.archetype ?? (fixedParts ? undefined : weighted(r, EVERYDAY));
  const A: Archetype | undefined = id ? ARCHETYPES[id] : undefined;
  const body = fix.body ?? (A ? pick(r, A.body) : pick(r, BODY_LIST));
  const age = A?.age ?? (body === 'kid' ? 'kid' : body === 'teen' ? 'teen' : body === 'old' || body === 'frail' ? 'elder' : 'adult');
  const garb = fix.garb ?? (A ? pick(r, A.garb) : pick(r, GARB_LIST));
  const hair = fix.hair ?? (A ? pick(r, A.hair) : age === 'kid' ? pick(r, ['short', 'cap', 'long', 'bun', 'beanie', 'ponytail'] as Hair[]) : pick(r, HAIR_LIST));
  let extras: Extra[];
  if (fix.extras) extras = [...fix.extras];
  else {
    extras = [...(A?.extras ?? [])];
    const add = (e: Extra | undefined) => { if (e && !extras.includes(e)) extras.push(e); };
    const maybe = A ? A.maybe ?? [] : PLAIN_EXTRAS;
    if (maybe.length && r() < 0.45) add(pick(r, maybe));
    const tech = A ? A.tech ?? TECH_EXTRAS : TECH_EXTRAS;
    // ordinary clothes plus one or two pieces of tech
    if ((fix.kitted ?? r() < (A?.kitted ?? (age === 'kid' ? 0 : 0.35))) && tech.length) { add(pick(r, tech)); if (r() < 0.35) add(pick(r, tech)); }
    if (!A && age === 'elder' && r() < 0.5) add('cane');
    if (extras.includes('umbrella') && extras.includes('cane')) extras = extras.filter((e) => e !== 'cane');
  }
  const P = paletteFor(fix.district), C = A?.colours ?? {};
  const cloth = (pinned: string[] | undefined, list: string[], k: number) => pinned ? pick(r, pinned) : vivid ? vivify(pick(r, list), k) : pick(r, list);
  const top = fix.top ?? cloth(C.top, P.tops, 1);
  let bottom = fix.bottom ?? cloth(C.bottom, P.bottoms, 0.45);
  // keep seeded trousers apart from the top (a dress or a robe is one piece anyway); a colour someone set always wins
  if (fix.bottom === undefined && Math.abs(lightness(top) - lightness(bottom)) < 0.07) bottom = shade(bottom, lightness(top) > 0.3 ? 0.62 : 1.5);
  let acc = fix.acc ?? cloth(C.acc, P.accs, 1.2);
  if (fix.acc === undefined && acc === top && !C.acc) acc = shade(acc, 1.35);
  const grey = age === 'elder' || body === 'old' || body === 'frail';
  // an old body goes grey unless its named look has greys of its own to pick from
  const hairCol = fix.hairCol ?? (grey && !C.hair?.some((h) => HAIR_GREY.includes(h)) ? pick(r, HAIR_GREY) : pick(r, C.hair ?? HAIR_NATURAL));
  const facial: Facial = fix.facial ?? (age === 'kid' || age === 'teen' ? 'none' : pick(r, A?.facial ?? ['none', 'none', 'none', 'stubble', 'moustache', 'beard']));
  return {
    body, garb, hair, extras, skin: fix.skin ?? pick(r, SKIN_TONES), hairCol, top, bottom, acc, shoes: pick(r, SHOES), visor: pick(r, C.light ?? VISORS), facial,
    ...(garb === 'hivis' ? { vest: C.vest ? pick(r, C.vest) : pick(r, VESTS) } : {}),
    ...(garb === 'suit' ? { suit: C.top || fix.top ? top : pick(r, SUITS), tie: C.tie ? pick(r, C.tie) : pick(r, TIES) } : {}),
    ...(garb === 'patched' || extras.includes('patches') ? { patch: [acc, cloth(undefined, P.accs, 1), shade(top, 1.4)] } : {}),
    ...(id ? { archetype: id } : {}),
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


type Cell = [number, number];
/**
 * Where the hand and mouth ended up (grid cells), for live effects (smoke, phone glow, zzz, a robot's lens
 * and status light); `eye`, `wrist`, `ear`: where AR glasses glint, a wrist screen and an earpiece light.
 */
interface Meta { hand: Cell; mouth: Cell; top: number; eye?: Cell; wrist?: Cell; ear?: Cell }


/**
 * Legs: side-on poses, and the front and three-quarter views (`sitFront`, `sit3q` on a bench or a seat that
 * faces the camera; `front`, `front3q` standing toward the camera). `lie` is curled up under a newspaper
 * (sleep); `rest` lies on the back, head toward +c (a patient, a cot, a cradle).
 */
export type Legs = 'stand' | 'shift' | 'stepA' | 'stepB' | 'cross' | 'wide' | 'sit' | 'lie' | 'rest' | 'sitFront' | 'sit3q' | 'front' | 'front3q';

/** `nod`: arms folded, eyes shut (dozing). */
export type Arms = 'down' | 'raise' | 'phone' | 'out' | 'point' | 'reach' | 'up' | 'hip' | 'fold' | 'hold' | 'broomA' | 'broomB' | 'paper' | 'nod';

const FRONTAL: readonly Legs[] = ['sitFront', 'sit3q', 'front', 'front3q'];

/** The colours a garment puts on the body: torso, sleeves and legs. */
function clothOf(L: Full) {
  const top = L.garb === 'hivis' ? L.vest ?? '#c9a227' : L.garb === 'suit' ? L.suit ?? '#26262e' : L.garb === 'whites' ? WHITES : L.top;
  // a tabard is worn over a shirt: the sleeves are the shirt (the accent colour)
  return { top, sleeve: L.garb === 'tee' || L.garb === 'polo' ? (L.garb === 'polo' ? top : L.skin) : L.garb === 'tabard' ? L.acc : shade(top, 0.82), legCol: L.garb === 'dress' ? shade(L.skin, 0.8) : L.bottom };
}
/** Coats that reach the thighs. */
const LONG: readonly Garb[] = ['coat', 'robe', 'oilskin', 'patched'];
const METAL = '#8e949e';
/** Kitchen whites, a white apron or collar, paper (a notepad, a name badge, an ID card). */
const WHITES = '#e8e4d8', LINEN = '#ece4d6', PAPER = '#f2efe6';

/** A few patches sewn on, at the given cells. */
function patches(g: Grid, L: Full, at: Cell[]) { const cols = L.patch ?? [L.acc, shade(L.top, 1.4)]; at.forEach(([c, r], i) => put(g, c, r, cols[i % cols.length])); }

/**
 * Hair and headwear, side on (`front` false: the face toward +c) or toward the camera. `q` is the
 * three-quarter turn (the face one column toward +c).
 */
function hairOn(g: Grid, L: Full, front: boolean, hl: number, hr: number, hb: number, ht: number, eye: number, top: string) {
  const hc = L.hairCol, acc = L.acc, hx = (hl + hr) >> 1;
  switch (L.hair) {
    case 'bald': clr(g, hl, ht); clr(g, hr, ht); break;
    case 'short': rect(g, hl, ht, hr, ht, hc); put(g, hl, ht - 1, hc); if (front) put(g, hr, ht - 1, hc); break;
    case 'long':
      rect(g, hl, ht, hr, ht, hc); rect(g, hl - 1, hb - 1, hl, ht - 1, hc); put(g, hr, ht - 1, hc);
      if (front) { rect(g, hr, hb - 1, hr + 1, ht - 1, hc); put(g, hl, eye, L.skin); put(g, hr, eye, L.skin); }
      break;
    case 'bun': rect(g, hl, ht, hr, ht, hc); put(g, hl, ht - 1, hc); if (front) { put(g, hr, ht - 1, hc); rect(g, hx - 1, ht + 1, hx, ht + 1, hc); } else rect(g, hl, ht + 1, hl + 1, ht + 1, hc); break;
    case 'mohawk':
      if (front) { clr(g, hl, ht); clr(g, hr, ht); rect(g, hx, ht, hx, ht + 2, hc); put(g, hx - 1, ht + 1, hc); }
      else { rect(g, hl + 1, ht + 1, hr - 1, ht + 1, hc); put(g, hx, ht + 2, hc); put(g, hx - 1, ht + 2, hc); }
      break;
    case 'cap':
      if (front) { rect(g, hl, ht, hr, ht, shade(acc, 0.75)); rect(g, hl, ht + 1, hr, ht + 1, acc); clr(g, hl, ht + 1); clr(g, hr, ht + 1); put(g, hl, ht - 1, hc); put(g, hr, ht - 1, hc); }
      else { rect(g, hl, ht, hr, ht, acc); put(g, hr + 1, ht, shade(acc, 0.75)); put(g, hl, ht - 1, hc); }
      break;
    case 'beanie': rect(g, hl, ht, hr, ht, shade(acc, 0.8)); rect(g, hl + 1, ht + 1, hr - 1, ht + 1, acc); break;
    case 'hood':
      rect(g, hl, ht, hr, ht + 1, top); rect(g, hl - 1, hb, hl, ht, top); put(g, hr, ht, top); clr(g, hl, ht + 1);
      if (front) { rect(g, hr, hb, hr + 1, ht, top); clr(g, hr, ht + 1); rect(g, hl + 1, hb, hr - 1, ht - 1, shade(L.skin, 0.62)); }
      break;
    case 'brim': rect(g, hl + 1, ht + 1, hr - 1, ht + 1, acc); rect(g, hl - 1, ht, hr + 1, ht, shade(acc, 0.75)); break;
    case 'helmet': rect(g, hl, ht - 1, hr, ht + 1, acc); clr(g, hl, ht + 1); clr(g, hr, ht + 1); rect(g, front ? hl : hl + 1, eye, hr + (front ? 0 : 1), eye, L.visor); break;
    case 'scarf': rect(g, hl, ht, hr, ht, acc); rect(g, hl, hb, hl, ht, acc); rect(g, hl, hb, hr, hb, shade(acc, 0.8)); if (front) rect(g, hr, hb, hr, ht, acc); break;
    case 'afro': {
      const t0 = Math.max(eye + 1, ht - 1);
      rect(g, hl - 1, t0, hr + (front ? 1 : 0), ht + 1, hc); clr(g, hl - 1, ht + 1); clr(g, hr + (front ? 1 : 0), ht + 1);
      rect(g, hl - 1, eye, hl - 1, t0, hc); if (front) rect(g, hr + 1, eye, hr + 1, t0, hc);
      break;
    }
    case 'ponytail':
      rect(g, hl, ht, hr, ht, hc); put(g, hl, ht - 1, hc);
      if (front) put(g, hr, ht - 1, hc); else { put(g, hl - 1, ht - 1, hc); put(g, hl - 2, ht - 1, hc); put(g, hl - 2, ht - 2, hc); }
      break;
    case 'buzz': rect(g, front ? hl + 1 : hl, ht, front ? hr - 1 : hr - 1, ht, shade(hc, 0.85)); clr(g, hl, ht); if (front) clr(g, hr, ht); break;
    case 'beret': rect(g, hl, ht, hr, ht, acc); rect(g, hl - 1, ht + 1, hr - (front ? 0 : 1), ht + 1, acc); put(g, front ? hr + 1 : hl - 1, ht, shade(acc, 0.8)); break;
    case 'hardhat':
      rect(g, hl, ht, hr, ht + 1, acc); clr(g, hl, ht + 1); clr(g, hr, ht + 1); rect(g, hl - 1, ht, hr + 1, ht, shade(acc, 0.8));
      put(g, hx, ht + 1, shade(acc, 1.25));
      break;
    case 'headwrap': rect(g, hl, ht, hr, ht + 1, acc); clr(g, hr, ht + 1); if (front) { clr(g, hl, ht + 1); put(g, hx, ht + 1, shade(acc, 0.8)); } else { put(g, hl - 1, ht, shade(acc, 0.8)); put(g, hl - 1, ht - 1, shade(acc, 0.8)); } break;
    case 'chefcap':
      // a cook's white cap, a little hair under it at the back
      rect(g, hl, ht, hr, ht + 1, PAPER); put(g, front ? hr : hl, ht + 1, shade(PAPER, 0.85)); if (front) clr(g, hl, ht + 1); else put(g, hl, ht - 1, hc);
      break;
    case 'hairnet':
      // hair pulled up under a net: lighter, a few knots of the net over it
      rect(g, hl, ht, hr, ht, shade(hc, 1.2)); put(g, hl, ht - 1, hc); if (front) { put(g, hr, ht - 1, hc); rect(g, hx - 1, ht + 1, hx, ht + 1, shade(hc, 1.2)); } else rect(g, hl, ht + 1, hl + 1, ht + 1, shade(hc, 1.2));
      for (let c = hl; c <= hr; c += 2) put(g, c, ht, '#b8b0a4');
      break;
    case 'peaked':
      // a uniform cap: the crown wider than the head, a dark band, the peak over the eyes
      rect(g, hl - 1, ht + 1, hr + (front ? 1 : 0), ht + 1, acc); rect(g, hl, ht, hr, ht, shade(acc, 0.6));
      if (front) rect(g, hl, ht - 1 > eye ? ht - 1 : ht, hr, ht - 1 > eye ? ht - 1 : ht, '#1a1a1e'); else put(g, hr + 1, ht, '#1a1a1e');
      break;
  }
}

/** Face things: eyewear, masks, headphones, an earpiece, facial hair. Side on the face is at hr. */
function faceOn(g: Grid, L: Full, front: boolean, q: number, hl: number, hr: number, hb: number, ht: number, eye: number, meta: Partial<Meta>) {
  const has = (e: Extra) => L.extras.includes(e), acc = L.acc, hc = L.hairCol;
  // facial hair first, so masks go over it
  if (L.facial && L.facial !== 'none') {
    if (L.facial === 'beard') { rect(g, front ? hl : hl + 1, hb, hr, hb, hc); if (front) { put(g, hl, eye, hc); put(g, hr, eye, hc); } else put(g, hl + 1, eye, hc); }
    else if (L.facial === 'moustache') { if (front) rect(g, hl + 1 + q, hb, hr - 1, hb, hc); else rect(g, hr - 1, hb, hr, hb, hc); }
    else rect(g, front ? hl + 1 : hl + 1, hb, front ? hr - 1 : hr, hb, shade(L.skin, 0.82));
  }
  if (has('visor') && L.hair !== 'helmet') rect(g, front ? hl : hl + 1, eye, hr + (front ? 0 : 1), eye, L.visor);
  if (has('glasses')) { if (front) rect(g, hl + 1 + q, eye, hr - (q ? 0 : 1), eye, '#0d0806'); else rect(g, hr - 2, eye, hr, eye, '#0d0806'); }
  if (has('arglasses')) {
    // a dark frame, one lens lit (the glint plays over it live)
    const lens = shade(L.visor, 0.5);
    if (front) { rect(g, hl, eye, hr, eye, '#2a2630'); put(g, hl + 1 + q, eye, lens); put(g, hr - 1 + q, eye, lens); meta.eye = [hr - 1 + q, eye]; }
    else { rect(g, hr - 2, eye, hr + 1, eye, '#2a2630'); put(g, hr, eye, lens); meta.eye = [hr, eye]; }
  }
  if (has('mask') && L.hair !== 'scarf') rect(g, hl + 1, hb, front ? hr - 1 : hr, hb, acc === '#2a2a30' ? '#e8e0d0' : acc);
  if (has('respirator')) {
    if (front) { rect(g, hl + 1, hb, hr - 1, hb, '#2a2a30'); put(g, hl, hb, '#6a6e78'); put(g, hr, hb, '#6a6e78'); }
    else { rect(g, hr - 1, hb, hr + 1, hb, '#2a2a30'); put(g, hr + 1, hb + 1 <= eye - 1 ? hb + 1 : hb, '#6a6e78'); put(g, hl + 1, eye, '#2a2a30'); }
  }
  if (has('headphones')) {
    if (front) { put(g, hl - 1, eye, acc); put(g, hr + 1, eye, acc); rect(g, hl, ht + 1, hr, ht + 1, '#2a2a30'); }
    else { put(g, hl, eye, '#2a2a30'); put(g, hl, eye + 1, '#2a2a30'); rect(g, hl + 1, ht + 1, hr - 1, ht + 1, '#2a2a30'); put(g, hl, eye, acc); }
  }
  if (has('earpiece')) { const c: Cell = front ? (q ? [hl, eye] : [hr + 1, eye]) : [hl + 1, eye]; put(g, c[0], c[1], L.visor); meta.ear = c; }
}

/** `shin`: a seated person's lap row when a seat height sets it (default ceil(leg / 2)); `cover`: a blanket colour when lying on the back. */
export function human(L: Full, legs: Legs, arms: Arms, shin?: number, cover?: string): [Grid, Meta] {
  if (legs === 'lie') return lying(L);
  if (legs === 'rest') return resting(L, arms, cover);
  if (FRONTAL.includes(legs)) return humanFront(L, legs, arms, shin);
  const B = BODIES[L.body], g = grid(), has = (e: Extra) => L.extras.includes(e);
  const tw = B.tw, Lc = CX - (tw >> 1), Rc = Lc + tw - 1, T = B.torso, belly = B.belly ?? 0;
  const sit = legs === 'sit', seat = sit && shin ? shin : Math.ceil(B.leg / 2);
  const base = sit ? seat + 1 : B.leg, sh = base + T - 1, hb = sh + 1, ht = hb + B.head - 1;
  const hx = CX + (B.stoop ?? 0), hl = hx - 2, hr = hl + B.hw - 1;
  const { top, sleeve, legCol } = clothOf(L);
  if (has('umbrella') || has('cane')) { if (arms === 'down' || arms === 'hip') arms = 'hold'; }
  const meta: Partial<Meta> = {};

  // legs
  if (sit) {
    rect(g, Lc, seat, Rc + 3, seat, L.garb === 'dress' || L.garb === 'robe' ? L.top : legCol);
    rect(g, Rc + 2, 1, Rc + 1 + B.lw, seat - 1, legCol);
    rect(g, Rc + 2, 0, Rc + 2 + B.lw, 0, L.shoes);
    if (has('exobrace')) { rect(g, Rc + 2 + B.lw, 1, Rc + 2 + B.lw, seat - 1, METAL); put(g, Rc + 2 + B.lw, seat, L.visor); }
  } else {
    const [dL, dR] = legs === 'shift' ? [0, 1] : legs === 'stepA' ? [-1, 1] : legs === 'stepB' ? [1, -1] : legs === 'cross' ? [0, -2] : legs === 'wide' ? [-1, 1] : [0, 0];
    const low = legs === 'wide' ? 3 : 2;
    for (let r = 0; r < B.leg; r++) {
      const oL = r < low ? dL : 0, oR = r < low ? dR : 0, col = r === 0 ? L.shoes : legCol;
      rect(g, Lc + oL, r, Lc + B.lw - 1 + oL, r, col);
      rect(g, Rc - B.lw + 1 + oR, r, Rc + oR, r, col);
      // an exo-brace up the front leg, its knee joint lit
      if (has('exobrace') && r > 0) put(g, Rc + oR + 1, r, r === Math.ceil(B.leg / 2) ? L.visor : METAL);
    }
    put(g, Rc + dR + 1, 0, L.shoes);
  }
  // torso and clothes
  rect(g, Lc, base, Rc, sh, top);
  rect(g, Lc, base, Rc, base, shade(L.bottom, 0.7));
  if (belly) rect(g, Rc + 1, base + 1, Rc + belly, Math.min(sh - 1, base + 3), top);
  if (!sit && LONG.includes(L.garb)) rect(g, Lc, L.garb === 'robe' ? 1 : Math.max(1, B.leg - 2), Rc, base, top);
  if (!sit && L.garb === 'dress') rect(g, Lc - 1, Math.max(1, B.leg - 3), Rc + 1, base, top);
  if (L.garb === 'jacket') rect(g, CX, base + 1, CX, sh - 1, shade(top, 1.3));
  if (L.garb === 'coat' || L.garb === 'patched') { put(g, CX, sh, shade(top, 1.35)); put(g, CX + 1, sh - 1, shade(top, 1.35)); }
  if (L.garb === 'apron') { rect(g, Lc + 1, sit ? base : Math.max(1, base - 2), Rc - 1, sh - 1, '#cbbd9c'); put(g, Lc + 2, base + 1, '#8a5a3a'); }
  if (L.garb === 'hivis') rect(g, Lc, sh - 2, Rc, sh - 2, '#efe6c8');
  if (L.garb === 'whites') { for (let r = base + 1; r < sh; r += 2) put(g, Rc - 1, r, '#b8b0a0'); rect(g, CX, sh, Rc, sh, shade(WHITES, 0.88)); }
  if (L.garb === 'diner') { rect(g, Lc + 1, sh, Rc, sh, LINEN); rect(g, Rc - 1, sit ? base : Math.max(1, base - 2), Rc, base + 1, LINEN); put(g, Rc - 1, base, shade(LINEN, 0.8)); }
  if (L.garb === 'polo') { rect(g, CX, sh, Rc, sh, shade(top, 1.35)); for (let c = Lc; c < CX; c++) put(g, c, sh - 1, (c - Lc) % 2 ? shade(top, 1.4) : '#d8d0c0'); }
  if (L.garb === 'tabard') rect(g, CX - 1, base + 1, CX - 1, sh - 2, sleeve);
  if (L.garb === 'shirt') { put(g, Rc, sh, shade(top, 1.15)); put(g, Rc - 1, sh, shade(top, 0.8)); }
  if (L.garb === 'suit') { put(g, CX, sh, '#ddd5c5'); put(g, CX + 1, sh, '#ddd5c5'); put(g, CX, sh - 1, L.tie ?? '#a82020'); put(g, CX, sh - 2, L.tie ?? '#a82020'); }
  if (L.garb === 'hoodie') { rect(g, Lc + 2, base + 1, Rc, base + 1, shade(top, 0.8)); put(g, Lc, sh + 1, shade(top, 0.9)); put(g, Lc + 1, sh + 1, shade(top, 0.9)); }
  if (L.garb === 'shell') { rect(g, Rc - 1, base + 1, Rc - 1, sh - 1, shade(top, 1.25)); put(g, Rc, sh, shade(top, 1.15)); if (!sit) rect(g, Lc, base - 1, Rc, base - 1, top); }
  if (L.garb === 'oilskin') { put(g, Rc - 1, base + 2, shade(top, 1.35)); put(g, Rc, sh - 1, shade(top, 1.35)); if (!sit) put(g, Rc - 1, Math.max(1, B.leg - 1), shade(top, 1.3)); put(g, CX, sh, shade(top, 0.7)); }
  if (L.garb === 'uniform') { rect(g, Lc, base + 1, Rc, base + 1, '#1c1a18'); put(g, Rc, base + 1, '#c8a050'); put(g, Rc, base + 3, shade(top, 1.3)); put(g, CX, sh, shade(top, 1.25)); }
  if (L.garb === 'patched' || has('patches')) patches(g, L, [[Lc + 1, base + 2], [Rc - 1, sh - 1], [CX, base + (sit ? 1 : -1)]]);
  if (has('ledtrim')) rect(g, Lc, base, Rc, base, L.visor);
  if (has('muffler')) { rect(g, Lc + 1, sh, Rc, sh, L.acc); put(g, Lc, sh - 1, L.acc); put(g, Lc, sh - 2, shade(L.acc, 0.8)); }
  if (has('backpack')) { rect(g, Lc - 2, Math.max(base, sh - T + 2), Lc - 1, sh - 1, L.acc); rect(g, Lc - 2, sh - 1, Lc - 1, sh - 1, shade(L.acc, 0.7)); }
  if (has('bag')) { for (let k = 0; k < Math.min(tw, T); k++) put(g, Rc - k, sh - k, shade(L.acc, 0.6)); if (!sit) rect(g, Lc - 2, base - 1, Lc - 1, base + 1, L.acc); }
  // a parcel up on the back shoulder (the head is drawn over its front corner)
  if (has('parcel')) { rect(g, Lc - 2, sh + 1, Lc + 1, sh + 3, '#a07040'); rect(g, Lc - 2, sh + 2, Lc + 1, sh + 2, '#d8c8a0'); }
  // staff things: a towel over the shoulder, a name badge, an ID card on a lanyard, a radio on the chest
  if (has('towel')) { rect(g, Lc, sh, Lc + 2, sh, LINEN); rect(g, Lc, Math.max(base, sh - 3), Lc, sh, LINEN); put(g, Lc, Math.max(base, sh - 3), shade(LINEN, 0.8)); }
  if (has('badge')) put(g, Rc - 1, sh - 1, PAPER);
  if (has('lanyard')) { put(g, Rc - 1, sh, L.acc); put(g, Rc - 1, sh - 1, L.acc); rect(g, Rc - 1, Math.max(base, sh - 3), Rc - 1, sh - 2, PAPER); }
  if (has('radio')) { rect(g, Rc, sh - 2, Rc, sh - 1, '#16161a'); put(g, Rc, sh, '#3a3a40'); put(g, Rc - 1, sh - 1, '#c83a2a'); }

  // arms: the back one (darker) first, then the front one in the pose
  const cyber = has('cyberarm'), front = cyber ? METAL : sleeve, hand = cyber ? '#bfc4cc' : L.skin;
  const back = shade(sleeve, 0.68);
  if (arms === 'up') { rect(g, Lc - 1, sh, Lc - 1, sh + 2, back); put(g, Lc - 1, sh + 3, shade(L.skin, 0.75)); }
  else { rect(g, Lc - 1, sh - T + 2, Lc - 1, sh, back); put(g, Lc - 1, sh - T + 1, shade(L.skin, 0.75)); }
  if (L.garb === 'tee') { put(g, Lc - 1, sh, shade(top, 0.7)); }
  const R = Rc + 1 + belly;
  const path = arms === 'down' ? armDown(T) : ARM[arms === 'nod' ? 'fold' : arms];
  path.forEach(([dc, dr], i) => put(g, R + dc, sh + dr, i === path.length - 1 && arms !== 'fold' && arms !== 'nod' ? hand : front));
  if (L.garb === 'tee' && !cyber) put(g, R, sh, shade(top, 0.85));
  if (cyber && path.length > 1) put(g, R + path[1][0], sh + path[1][1], '#ffb030');
  // an inspector's armband, on both upper arms
  if (has('armband')) { put(g, R + path[0][0], sh + path[0][1] - (arms === 'up' ? -1 : 1), '#c83a2a'); put(g, Lc - 1, sh - 1, '#a82020'); }
  let [hc, hrow] = path[path.length - 1];
  hc += R; hrow += sh;
  if (arms === 'fold' || arms === 'nod') { rect(g, Lc + 1, sh - 2, R, sh - 2, front); put(g, Lc + 1, sh - 2, hand); hc = Lc + 1; hrow = sh - 2; }
  if (has('wristscreen')) { const w: Cell = arms === 'fold' || arms === 'nod' ? [Lc + 2, sh - 2] : path.length > 1 ? [R + path[path.length - 2][0], sh + path[path.length - 2][1]] : [hc, hrow]; put(g, w[0], w[1], L.visor); meta.wrist = w; }
  if (arms === 'phone') put(g, R + 2, sh, '#e4ecff');
  // a newspaper held up in front of the face, columns of print on it
  if (arms === 'paper') { rect(g, R + 2, sh - 2, R + 3, hb + 2, '#d8d0c0'); for (let r = sh - 1; r <= hb + 1; r += 2) put(g, R + 3, r, '#8a8478'); put(g, R + 2, hb + 2, '#b8ad94'); hc = R + 2; hrow = sh + 1; }
  if (has('notepad') && arms !== 'paper' && arms !== 'fold' && arms !== 'nod') { rect(g, hc, hrow + 1, hc + 1, hrow + 2, PAPER); put(g, hc + 1, hrow + 2, '#8a8478'); }
  // a briefcase: hanging from the hand, or on the floor by a sitter's feet
  if (has('briefcase')) {
    if (sit) { rect(g, Lc - 4, 0, Lc - 1, 2, '#3a2418'); put(g, Lc - 3, 3, '#2a1a10'); put(g, Lc - 2, 1, '#c8a050'); }
    else if (arms === 'down') { const hr0 = sh - T + 1, cc = R; rect(g, cc - 1, Math.max(1, hr0 - 3), cc + 2, Math.max(1, hr0 - 1), '#3a2418'); put(g, cc + 1, Math.max(1, hr0 - 2), '#c8a050'); }
  }
  if (arms === 'hold') held(g, L, R + 1, sh, ht);
  if (arms === 'broomA' || arms === 'broomB') {
    const lean = arms === 'broomA' ? 3 : 2;
    for (let r = hrow; r >= 1; r--) put(g, hc + 1 + Math.floor((hrow - r) / lean), r, '#6a4a2a');
    const end = hc + 1 + Math.floor((hrow - 1) / lean);
    rect(g, end - 1, 0, end + 1, 0, '#b89a50');
  }

  // head, face, hair
  const skin = L.hair === 'hood' ? shade(L.skin, 0.62) : L.skin, eye = hb + 1, lid = arms === 'nod' ? shade(skin, 0.55) : '#1a0d05';
  rect(g, hl, hb, hr, ht, skin);
  put(g, hr - 2, eye, lid); put(g, hr, eye, lid);
  hairOn(g, L, false, hl, hr, hb, ht, eye, top);
  faceOn(g, L, false, 0, hl, hr, hb, ht, eye, meta);
  return [g, { ...meta, hand: [hc, hrow], mouth: [hr + 1, hb], top: Math.max(ht + 1, has('umbrella') && arms === 'hold' ? ht + 5 : 0) }];
}

/** An umbrella over the head or a cane, held at column S. */
function held(g: Grid, L: Full, S: number, sh: number, ht: number) {
  if (L.extras.includes('umbrella')) {
    rect(g, S, sh, S, ht + 2, '#2a2018');
    rect(g, S - 5, ht + 3, S + 5, ht + 3, L.acc); rect(g, S - 4, ht + 4, S + 4, ht + 4, L.acc); rect(g, S - 2, ht + 5, S + 2, ht + 5, shade(L.acc, 1.2));
    put(g, S - 5, ht + 2, shade(L.acc, 0.6)); put(g, S + 5, ht + 2, shade(L.acc, 0.6));
  } else rect(g, S, 0, S, sh - 2, '#7a5a3a');
}

/** Arm paths from the shoulder (side on, the front arm; toward the camera, the right-hand arm). */
const ARM: Record<Exclude<Arms, 'nod'>, Cell[]> = {
  down: [], raise: [[0, 0], [0, -1], [1, -1], [1, 0], [0, 1]], phone: [[0, 0], [0, -1], [1, -1], [2, -1]],
  out: [[0, 0], [1, -1], [2, -1], [3, -1]], point: [[0, 0], [1, 0], [2, 1], [3, 2]], reach: [[0, 0], [1, 0], [2, 0], [3, 0]],
  up: [[0, 0], [0, 1], [0, 2], [0, 3]], hip: [[0, 0], [1, -1], [1, -2], [0, -2]], fold: [[0, 0], [0, -1]], hold: [[0, 0], [0, -1], [1, -1]],
  broomA: [[0, 0], [1, -1], [1, -2]], broomB: [[0, 0], [1, -1], [2, -1]], paper: [[0, 0], [1, 0], [1, 1]],
};
const armDown = (T: number): Cell[] => Array.from({ length: T }, (_, k) => [0, -k] as Cell);

/**
 * A person seen from the front (`sitFront`, `front`) or turned three-quarter toward +c (`sit3q`, `front3q`):
 * on a bench or a train seat that faces the camera, or waiting in a crowd. Same parts and colours as side on.
 */
function humanFront(L: Full, legs: Legs, arms: Arms, shin?: number): [Grid, Meta] {
  const B = BODIES[L.body], g = grid(), has = (e: Extra) => L.extras.includes(e);
  const q = legs === 'sit3q' || legs === 'front3q' ? 1 : 0, sit = legs === 'sitFront' || legs === 'sit3q';
  const half = (B.tw + 1) >> 1, L0 = CX - half, R0 = CX + half, T = B.torso, belly = B.belly ?? 0, lw = B.lw;
  const seat = sit && shin ? shin : Math.ceil(B.leg / 2), base = sit ? seat + 1 : B.leg, sh = base + T - 1, hb = sh + 1, ht = hb + B.head - 1;
  const hl = CX - 2 + q, hr = hl + 4, eye = hb + 1;
  const { top, sleeve, legCol } = clothOf(L);
  // sitting, an umbrella stays furled against the knee; standing, it is up
  if (has('umbrella') && !sit || has('cane')) { if (arms === 'down' || arms === 'hip') arms = 'hold'; }
  else if (has('umbrella')) { rect(g, R0 + 2 + q, 0, R0 + 2 + q, seat + 3, '#2a2018'); rect(g, R0 + 2 + q, 1, R0 + 3 + q, seat + 1, shade(L.acc, 0.8)); }
  const meta: Partial<Meta> = {};
  const legL = CX - lw, legR = CX + 1;

  // legs: standing straight, or the lap toward the camera and the shins down to the floor
  if (sit) {
    rect(g, L0, seat, R0 + q, seat, L.garb === 'dress' || L.garb === 'robe' ? L.top : legCol);
    for (let r = 1; r < seat; r++) { rect(g, legL + q, r, CX - 1 + q, r, legCol); rect(g, legR + q, r, CX + lw + q, r, legCol); }
    rect(g, legL - 1 + q, 0, CX - 1 + q, 0, L.shoes); rect(g, legR + q, 0, CX + lw + 1 + q, 0, L.shoes);
    if (has('exobrace')) { put(g, legL - 1 + q, seat, L.visor); put(g, CX + lw + 1 + q, seat, L.visor); for (let r = 1; r < seat; r++) { put(g, legL - 1 + q, r, METAL); put(g, CX + lw + 1 + q, r, METAL); } }
  } else {
    for (let r = 0; r < B.leg; r++) { const col = r === 0 ? L.shoes : legCol; rect(g, legL, r, CX - 1, r, col); rect(g, legR, r, CX + lw, r, col); }
    put(g, legL - 1, 0, L.shoes); put(g, CX + lw + 1 + q, 0, L.shoes);
    if (has('exobrace')) for (let r = 1; r < B.leg; r++) { const k = r === Math.ceil(B.leg / 2) ? L.visor : METAL; put(g, legL - 1, r, k); put(g, CX + lw + 1, r, k); }
  }
  // torso and clothes
  rect(g, L0, base, R0, sh, top);
  rect(g, L0, base, R0, base, shade(L.bottom, 0.7));
  if (belly) rect(g, L0 - belly, base + 1, R0 + belly, Math.min(sh - 1, base + 2), top);
  if (!sit && LONG.includes(L.garb)) rect(g, L0, L.garb === 'robe' ? 1 : Math.max(1, B.leg - 2), R0, base, top);
  if (!sit && L.garb === 'dress') rect(g, L0 - 1, Math.max(1, B.leg - 3), R0 + 1, base, top);
  if (q) rect(g, L0, base, L0, sh, shade(top, 0.8));
  const lo = sit ? base + 1 : Math.max(1, B.leg - 2);
  switch (L.garb) {
    case 'jacket': rect(g, CX + q, base + 1, CX + q, sh - 1, shade(top, 1.3)); break;
    case 'coat': case 'patched': rect(g, CX + q, lo, CX + q, sh - 1, shade(top, 0.78)); put(g, CX - 1 + q, sh, shade(top, 1.35)); put(g, CX + 1 + q, sh, shade(top, 1.35)); break;
    case 'robe': for (let k = 0; k < T - 1; k++) put(g, R0 - 1 - k, sh - k, L.acc); break;
    case 'apron': rect(g, L0 + 1, sit ? base : Math.max(1, base - 2), R0 - 1, sh - 1, '#cbbd9c'); put(g, L0 + 1, sh, '#cbbd9c'); put(g, R0 - 1, sh, '#cbbd9c'); put(g, CX + q, base + 1, '#8a5a3a'); break;
    case 'hivis': rect(g, L0, sh - 2, R0, sh - 2, '#efe6c8'); rect(g, L0 + 1, sh - 1, L0 + 1, sh, '#efe6c8'); rect(g, R0 - 1, sh - 1, R0 - 1, sh, '#efe6c8'); break;
    case 'suit': rect(g, CX - 1 + q, sh, CX + 1 + q, sh, '#ddd5c5'); put(g, CX + q, sh - 1, L.tie ?? '#a82020'); put(g, CX + q, sh - 2, L.tie ?? '#a82020'); break;
    case 'hoodie': rect(g, L0 + 1, base + 1, R0 - 1, base + 1, shade(top, 0.8)); put(g, CX - 1 + q, sh - 1, '#d8d0c0'); put(g, CX + 1 + q, sh - 1, '#d8d0c0'); break;
    case 'shell': rect(g, L0 + 1, base + 1, L0 + 1, sh - 1, shade(top, 1.25)); rect(g, CX + q, base + 1, CX + q, sh, shade(top, 0.75)); break;
    case 'oilskin': rect(g, CX + q, lo, CX + q, sh - 1, shade(top, 0.75)); put(g, L0 + 1, base + 2, shade(top, 1.35)); put(g, R0 - 1, sh - 1, shade(top, 1.35)); put(g, CX - 1 + q, sh, shade(top, 0.7)); put(g, CX + 1 + q, sh, shade(top, 0.7)); break;
    case 'uniform': rect(g, L0, base + 1, R0, base + 1, '#1c1a18'); put(g, CX + q, base + 1, '#c8a050'); put(g, CX + q, base + 3, shade(top, 1.3)); put(g, L0, sh, shade(top, 1.25)); put(g, R0, sh, shade(top, 1.25)); break;
    case 'whites': for (let r = base + 1; r < sh; r += 2) { put(g, CX - 1 + q, r, '#b8b0a0'); put(g, CX + 1 + q, r, '#b8b0a0'); } rect(g, CX - 1 + q, sh, CX + 1 + q, sh, shade(WHITES, 0.88)); break;
    case 'diner': rect(g, CX - 1 + q, sh, CX + 1 + q, sh, LINEN); rect(g, L0 + 1, sit ? base : Math.max(1, base - 2), R0 - 1, base + 1, LINEN); put(g, CX + q, base, shade(LINEN, 0.8)); break;
    case 'polo': rect(g, CX - 1 + q, sh, CX + 1 + q, sh, shade(top, 1.35)); put(g, CX + q, sh - 1, shade(top, 1.35)); rect(g, L0 + 1, sh - 1, CX - 2 + q, sh - 1, '#d8d0c0'); break;
    case 'tabard': rect(g, L0, base + 1, L0, sh - 1, sleeve); rect(g, R0, base + 1, R0, sh - 1, sleeve); put(g, CX + q, sh, sleeve); break;
    case 'shirt': put(g, CX - 1 + q, sh, shade(top, 1.15)); put(g, CX + 1 + q, sh, shade(top, 1.15)); for (let r = base + 1; r < sh; r += 2) put(g, CX + q, r, shade(top, 0.8)); break;
  }
  if (L.garb === 'patched' || has('patches')) patches(g, L, [[L0 + 1, base + 2], [R0 - 1, sh - 1], [CX + 1, base + 1]]);
  if (has('ledtrim')) rect(g, L0, base, R0, base, L.visor);
  if (has('backpack')) { const s = shade(L.acc, 0.7); rect(g, L0 + 1, sh - 1, L0 + 1, sh, s); rect(g, R0 - 1, sh - 1, R0 - 1, sh, s); }
  if (has('bag')) { for (let k = 0; k < Math.min(R0 - L0, T); k++) put(g, R0 - k, sh - k, shade(L.acc, 0.6)); if (sit) rect(g, L0 + 1, seat + 1, L0 + 3, seat + 2, L.acc); else rect(g, L0 - 2, base - 1, L0 - 1, base + 1, L.acc); }
  if (has('parcel')) { rect(g, R0 - 1, sh + 1, R0 + 2, sh + 3, '#a07040'); rect(g, R0 - 1, sh + 2, R0 + 2, sh + 2, '#d8c8a0'); }
  if (has('muffler')) { rect(g, L0 + 1, sh, R0 - 1, sh, L.acc); put(g, CX - 1 + q, sh - 1, shade(L.acc, 0.85)); put(g, CX - 1 + q, sh - 2, shade(L.acc, 0.85)); }
  if (has('towel')) { rect(g, L0, Math.max(base, sh - 3), L0 + 1, sh, LINEN); put(g, L0, Math.max(base, sh - 3), shade(LINEN, 0.8)); }
  if (has('badge')) rect(g, R0 - 2, sh - 1, R0 - 1, sh - 1, PAPER);
  if (has('lanyard')) { put(g, CX - 1 + q, sh, L.acc); put(g, CX + 1 + q, sh, L.acc); put(g, CX + q, sh - 1, L.acc); rect(g, CX + q, Math.max(base, sh - 3), CX + q, sh - 2, PAPER); }
  if (has('radio')) { rect(g, L0 + 1, sh - 2, L0 + 1, sh - 1, '#16161a'); put(g, L0 + 1, sh, '#3a3a40'); }

  // arms: the left-hand one hangs (darker when turned away), the right-hand one does the pose
  const aL = L0 - 1 - belly, aR = R0 + 1 + belly, cyber = has('cyberarm');
  const sideSleeve = q ? shade(sleeve, 0.72) : sleeve, front = cyber ? METAL : sleeve, hand = cyber ? '#bfc4cc' : L.skin;
  let hc = aR, hrow = sh - T + 1;
  if (arms === 'fold' || arms === 'nod') {
    rect(g, aL, sh - 1, aL, sh, sideSleeve); rect(g, aR, sh - 1, aR, sh, front); rect(g, L0, sh - 2, R0, sh - 2, shade(front, 0.92));
    put(g, CX + 2, sh - 2, hand); put(g, CX - 2, sh - 2, L.skin); hc = CX + 2; hrow = sh - 2;
  } else if (arms === 'paper') {
    // a paper held up in front of the face: only the forehead and hair show over it
    rect(g, aL, sh - 1, aL, sh, sideSleeve); rect(g, aR, sh - 1, aR, sh, front); hc = CX; hrow = hb;
  } else if (arms === 'phone') {
    // looking down at it in both hands, at the chest
    rect(g, aL, sh - 2, aL, sh, sideSleeve); rect(g, aR, sh - 2, aR, sh, front);
    rect(g, L0, sh - 2, CX - 1, sh - 2, sideSleeve); rect(g, CX + 1, sh - 2, R0, sh - 2, front);
    put(g, CX - 1, sh - 1, L.skin); put(g, CX + 1, sh - 1, hand); put(g, CX, sh - 1, '#e4ecff'); hc = CX; hrow = sh - 1;
  } else {
    if (arms === 'hip') { put(g, aL, sh, sideSleeve); put(g, aL - 1, sh - 1, sideSleeve); put(g, aL - 1, sh - 2, sideSleeve); put(g, aL, sh - 2, L.skin); }
    else { rect(g, aL, sh - T + 2, aL, sh, sideSleeve); put(g, aL, sh - T + 1, L.skin); }
    const path = arms === 'down' ? armDown(T) : ARM[arms];
    path.forEach(([dc, dr], i) => put(g, aR + dc, sh + dr, i === path.length - 1 ? hand : front));
    [hc, hrow] = [aR + path[path.length - 1][0], sh + path[path.length - 1][1]];
    if (cyber && path.length > 1) put(g, aR + path[1][0], sh + path[1][1], '#ffb030');
  }
  if (L.garb === 'tee') { put(g, aL, sh, top); if (!cyber) put(g, aR, sh, top); }
  if (has('armband')) { put(g, aL, sh - 1, '#a82020'); put(g, aR, sh - 1, '#c83a2a'); }
  if (has('wristscreen')) { const w: Cell = arms === 'fold' || arms === 'nod' || arms === 'phone' || arms === 'paper' ? [CX - 2, sh - 2] : [aL, sh - T + 2]; put(g, w[0], w[1], L.visor); meta.wrist = w; }
  if (has('briefcase')) {
    if (sit) { rect(g, R0 + 2 + q, 0, R0 + 5 + q, 2, '#3a2418'); put(g, R0 + 3 + q, 3, '#2a1a10'); put(g, R0 + 4 + q, 1, '#c8a050'); }
    else if (arms === 'down') { const hr0 = sh - T + 1; rect(g, aR - 1, Math.max(1, hr0 - 3), aR + 2, Math.max(1, hr0 - 1), '#3a2418'); put(g, aR + 1, Math.max(1, hr0 - 2), '#c8a050'); }
  }
  if (has('notepad') && arms !== 'paper' && arms !== 'fold' && arms !== 'nod' && arms !== 'phone') { rect(g, hc, hrow + 1, hc + 1, hrow + 2, PAPER); put(g, hc + 1, hrow + 2, '#8a8478'); }
  if (arms === 'hold') held(g, L, aR + 1, sh, ht);
  if (arms === 'broomA' || arms === 'broomB') { for (let r = hrow; r >= 1; r--) put(g, hc + 1, r, '#6a4a2a'); rect(g, hc, 0, hc + 2, 0, '#b89a50'); }
  if (L.garb === 'hoodie') { put(g, hl - 1, hb, top); put(g, hr + 1, hb, top); }

  // head, face, hair
  const skin = L.hair === 'hood' ? shade(L.skin, 0.62) : L.skin, lid = arms === 'nod' ? shade(skin, 0.55) : '#1a0d05';
  rect(g, hl, hb, hr, ht, skin);
  if (q) { put(g, hl + 2, eye, lid); put(g, hr, eye, lid); put(g, hl, eye, shade(skin, 0.85)); }
  else { put(g, hl + 1, eye, lid); put(g, hr - 1, eye, lid); }
  hairOn(g, L, true, hl, hr, hb, ht, eye, top);
  faceOn(g, L, true, q, hl, hr, hb, ht, eye, meta);
  if (arms === 'paper') {
    // the paper goes over the face; the hands hold its edges
    rect(g, L0, sh - 2, R0, hb + 1, '#d8d0c0');
    for (const r of [sh - 1, hb]) for (let c = L0 + 1; c < R0; c += 2) put(g, c, r, '#8a8478');
    rect(g, CX, sh - 2, CX, hb + 1, '#b8ad94'); put(g, L0, sh - 1, L.skin); put(g, R0, sh - 1, cyber ? '#bfc4cc' : L.skin);
    delete meta.eye;
  }
  return [g, { ...meta, hand: [hc, hrow], mouth: [hr - 1 + q, hb], top: Math.max(ht + 1, has('umbrella') && arms === 'hold' ? ht + 5 : 0) }];
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

/**
 * Lying on the back, side on, head toward +c (`rest`): a patient on a cot or in a treatment chair, a
 * sleeper on a bench, a baby in a cradle. Row 0 rests on the surface. The feet stand up at the far end,
 * the front arm lies along the side (`fold`: hands on the chest; `nod`: eyes shut). `cover`: a blanket to the chest.
 */
function resting(L: Full, arms: Arms, cover?: string): [Grid, Meta] {
  const B = BODIES[L.body], g = grid(), has = (e: Extra) => L.extras.includes(e), { top, sleeve, legCol } = clothOf(L);
  const len = 1 + B.leg + B.torso + B.head + 1, a = CX - (len >> 1), th = B.tw > 6 ? 3 : 2, belly = B.belly ?? 0;
  // feet up at the end, the legs, the torso (a little thicker), the head on its back
  const l0 = a + 1, t0 = l0 + B.leg, hs = t0 + B.torso, he = hs + B.head - 1;
  rect(g, a, 0, a, 2, L.shoes);
  rect(g, l0, 0, t0 - 1, 1, LONG.includes(L.garb) || L.garb === 'dress' ? top : legCol);
  if (LONG.includes(L.garb)) rect(g, t0 - 2, 0, t0 - 1, 1, top);
  rect(g, t0, 0, hs - 1, th, top);
  if (belly) rect(g, t0 + 1, th + 1, hs - 2, th + belly, top);
  rect(g, t0, 0, t0, th, shade(L.bottom, 0.7));
  if (L.garb === 'hivis') rect(g, hs - 2, 0, hs - 2, th, '#efe6c8');
  if (L.garb === 'apron' || L.garb === 'whites') rect(g, t0 + 1, th, hs - 2, th, L.garb === 'whites' ? '#f2efe6' : '#cbbd9c');
  if (L.garb === 'suit') { put(g, hs - 1, th, '#ddd5c5'); put(g, hs - 2, th, L.tie ?? '#a82020'); }
  if (has('lanyard') || has('badge')) put(g, hs - 2, th, has('badge') ? '#ece4d6' : L.acc);
  // the front arm: along the side, or the hands folded on the chest
  const hand = has('cyberarm') ? '#bfc4cc' : L.skin, arm = has('cyberarm') ? METAL : sleeve;
  let hc: Cell = [t0 + 1, 1];
  if (arms === 'fold' || arms === 'nod') { rect(g, t0 + 2, th, hs - 2, th, arm); put(g, t0 + 2, th + 1 + belly, hand); hc = [t0 + 2, th + 1 + belly]; }
  else { rect(g, t0 + 2, 1, hs - 1, 1, shade(arm, 0.9)); put(g, t0 + 1, 1, hand); }
  // head: the face looks up (the nose a pixel higher), the back of the head on the surface
  const skin = L.hair === 'hood' ? shade(L.skin, 0.62) : L.skin, ht = 3;
  rect(g, hs, 0, he, ht, skin); put(g, hs + 1, ht + 1, skin);
  const eye: Cell = [hs + 2, ht];
  put(g, eye[0], eye[1], arms === 'nod' ? shade(skin, 0.55) : '#1a0d05');
  const hc0 = L.hairCol, acc = L.acc;
  switch (L.hair) {
    case 'bald': break;
    case 'cap': case 'beanie': case 'helmet': case 'hardhat': case 'peaked': case 'beret': case 'headwrap': case 'scarf': case 'chefcap': case 'hairnet':
      rect(g, he, 0, he + 1, ht, L.hair === 'chefcap' ? '#f2efe6' : L.hair === 'hairnet' ? shade(hc0, 1.15) : acc); put(g, he - 1, ht, L.hair === 'chefcap' ? '#f2efe6' : acc); break;
    case 'hood': rect(g, he, 0, he + 1, ht + 1, top); put(g, hs, ht + 1, top); break;
    case 'long': case 'ponytail': case 'afro': rect(g, he, 0, he + 1, ht, hc0); rect(g, hs, 0, he, 0, hc0); if (L.hair === 'afro') put(g, he + 2, 1, hc0); break;
    case 'mohawk': rect(g, he + 1, 1, he + 2, 2, hc0); break;
    default: rect(g, he, 0, he, ht, hc0); put(g, he - 1, ht, hc0); put(g, he + 1, 1, hc0);
  }
  if (L.facial === 'beard') rect(g, hs, 0, hs + 1, 1, hc0); else if (L.facial === 'moustache') put(g, hs, ht, hc0);
  if (has('glasses') || has('arglasses')) put(g, eye[0] - 1, eye[1], '#0d0806');
  if (has('respirator') || has('mask')) rect(g, hs, ht, hs + 1, ht, has('mask') ? '#e8e0d0' : '#2a2a30');
  // a blanket up to the chest, a lighter fold at the top, the feet a bump under it
  if (cover) {
    rect(g, a, 0, hs - 2, th, cover); rect(g, a, th + 1, a + 1, th + 1, cover); put(g, a, th + 2, cover);
    rect(g, hs - 2, 0, hs - 2, th + 1, shade(cover, 1.3)); if (belly) rect(g, t0 + 1, th + 1, hs - 3, th + belly, cover);
    if (arms === 'fold' || arms === 'nod') { rect(g, hs - 4, th + 1, hs - 3, th + 1, arm); put(g, hs - 4, th + 1, hand); hc = [hs - 4, th + 1]; }
  }
  return [g, { hand: hc, mouth: [hs, ht + 1], top: ht + 2, ...(has('arglasses') ? { eye } : {}) }];
}

// ---------- non-humans ----------

/** A gull, standing, walking and flying (wings up, wings down; the body stays on row 2 so it flaps in place). */
const GULL: Record<string, string[]> = {
  standA: ['....ww.', '....wky', 'ggwwww.', '.gggww.', '..p.p..'],
  standB: ['.......', '.......', 'ggwwwww', '.gggwwk', '..p.p.y'],
  walkA: ['....ww.', '....wky', 'ggwwww.', '.gggww.', '..p.p..'],
  walkB: ['....ww.', '....wky', 'ggwwww.', '.gggww.', '...pp..'],
  flyA: ['g.......g..', '.gg...gg...', '..gwwwwwky.', '...........', '...........'],
  flyB: ['...........', '...........', '..gwwwwwky.', '.gg...gg...', 'g.......g..'],
};

/** Pixel-frame critters. `bot`: drawn with the robot kit instead (keeps the critter's name, voice and `h`). */
export const CRITTERS: Record<Critter, { frames: Record<string, string[]>; pal: Record<string, string>; h?: number; bot?: BotLook }> = {
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
  gull: { frames: GULL, pal: { w: '#e8e4dc', g: '#8a8e96', k: '#141414', y: '#e8b030', p: '#d08a3a' } },
  /** The Registry's gull-shaped drone: the gull's frames in gunmetal, a red eye where the beak is. */
  robogull: { frames: GULL, pal: { w: '#9a9ea8', g: '#6a6e78', k: '#3a3e46', y: '#ff2a44', p: '#3a3e46' }, h: 120 },
  /** A beach crab: scuttles sideways, stops to dig, claws up. */
  crab: {
    frames: {
      standA: ['cc....cc', '.ce..ec.', '.oooooo.', 'oooooooo', 'l.l..l.l'],
      walkA: ['cc....cc', '.ce..ec.', '.oooooo.', 'oooooooo', 'l.l..l.l'],
      walkB: ['.cc..cc.', '.ce..ec.', '.oooooo.', 'oooooooo', '.l.ll.l.'],
      digA: ['..e..e..', '.oooooo.', 'oooooooo', 'cl.l..lc'],
      digB: ['s.e..e.s', '.oooooo.', 'oooooooo', 'cl.l..lc'],
    },
    pal: { o: '#d8582a', c: '#e8703a', e: '#16100c', l: '#a8401a', s: '#c8a070' },
  },
  cleaner: {
    frames: {
      walkA: ['....ww....', '...wwww...', '.wwwwwwww.', '.wkkkkkkw.', '.wkeekkkw.', '.wwwwwwww.', '.wyyyyyyw.', 'bb.k..k.bb'],
      walkB: ['....ww....', '...wwww...', '.wwwwwwww.', '.wkkkkkkw.', '.wkkeekkw.', '.wwwwwwww.', '.wyyyyyyw.', '.b.k..k.b.'],
    },
    pal: { w: '#c8c0b0', k: '#1a1a1e', e: '#ffb030', y: '#d8a020', b: '#8a7a5a' },
  },
  // the old drone critter: drawn as the robot kit's scan drone (one drone body), at its old height
  drone: { frames: {}, pal: {}, h: 64, bot: { bot: 'scandrone', paint: '#4a4f5a', v: 1 } },
  courier: {
    frames: {
      walkA: ['.oooooo.', '.oyoooo.', '.oooooo.', 'dddddddd', 'dkeekkkd', 'dddddddd', '.d....d.', '.d....d.', 'dd....dd'],
      walkB: ['.oooooo.', '.oyoooo.', '.oooooo.', 'dddddddd', 'dkkeekkd', 'dddddddd', '..d..d..', '..d..d..', '.dd..dd.'],
    },
    pal: { o: '#8a5a2a', y: '#d8c070', d: '#5a606a', k: '#141418', e: '#ffb030' },
  },
};

const CAT_COATS = ['#2a2420', '#b8682a', '#6a6460', '#d8d0c0', '#4a3a2a'];


export function critter(kind: Critter, frame: string, seed: number): [Grid, Meta] {
  const C = CRITTERS[kind], rows = C.frames[frame] ?? Object.values(C.frames)[0], g = grid();
  const pal = kind === 'cat' ? { ...C.pal, k: CAT_COATS[seed % CAT_COATS.length] } : C.pal;
  const w = rows[0].length, c0 = CX - (w >> 1);
  rows.forEach((row, j) => { for (let i = 0; i < w; i++) if (row[i] !== '.') put(g, c0 + i, rows.length - 1 - j, pal[row[i]]); });
  return [g, { hand: [c0 + w - 1, rows.length - 1], mouth: [c0 + w - 1, rows.length - 2], top: rows.length }];
}


// ---------- robots ----------

/**
 * Robots, each built around a job you can see it doing. The kind picks the body and the job;
 * the seed picks paint, trim, wear and rust, a sticker, a mismatched replacement part, the
 * screen face and the lights, so no two of a kind look alike.
 */
export type Bot =
  | 'android' | 'valet' | 'marshal'            // humanoids: parcel courier on foot, personal assistant, queue/traffic marshal
  | 'servbot' | 'sweeper' | 'busker' | 'waiter' // boxy screen-faced service bots: vendor/stocker, street sweeper, musician, waiter with a tray
  | 'loader' | 'porter'                         // carrying: tall fork-lifter frame with a crate, a grocery cart that follows its owner
  | 'mech'                                      // security: heavy, slow, a sweeping red sensor
  | 'litterbot' | 'deliverybot' | 'adbot'       // small wheeled: litter picker, kerb delivery box, sandwich-board advertiser
  | 'crawler'                                   // spider-legged maintenance bot for walls and ledges: welds, scrubs
  | 'wreck'                                     // broken, unemployed, slumped against a wall, asking for parts
  | 'minidrone' | 'cargodrone' | 'flyerdrone' | 'scandrone'
  // flying: parcel drone, heavy lifter with a hanging crate, hologram flyer, Registry/rescue scan drone
  | 'djbot';                                    // a busker box with headphones, working a deck
export type Face = 'eyes' | 'happy' | 'blink' | 'sad' | 'dots' | 'off' | 'crack';

/** A robot look with parts fixed: `{ bot: 'servbot', paint: '#54406a', v: 1 }`. `v` picks the base/variant (0..2). */
export interface BotLook { bot: Bot; paint?: string; trim?: string; screen?: string; wear?: number; face?: Face; v?: 0 | 1 | 2 }


type Shape = 'android' | 'box' | 'waiter' | 'loader' | 'porter' | 'mech' | 'litter' | 'delivery' | 'ad' | 'crawler' | 'wreck' | 'mini' | 'cargo' | 'flyer' | 'scan';

interface BotSpec { shape: Shape; top: number; speed: number; fly?: number; paints?: string[] }


/** Paint: orange, mustard, paper, greys, rust, red, olive, browns. Never cyan (cyan = tech the player can use). */
const PAINTS = ['#c8641e', '#d8a03a', '#b8b0a0', '#8a8e96', '#6a6e78', '#9a4a2a', '#a83a2a', '#6e6a3a', '#e0d6c0', '#7a5a3a', '#c8b890', '#8a3a4a', '#d87a3a', '#5a5048'];

const TRIMS = ['#2a2624', '#3a3430', '#e8e0d0', '#d8b040', '#4a4440', '#8a2a1a'];

const SCREENS = ['#ffb030', '#ff7a2a', '#ece4d6', '#ff4a3a', '#ffd23a'];

const BOT_LIGHTS = ['#ff2a44', '#ffb030', '#ff7a2a'];

const RUSTS = ['#7a3a1a', '#8a4a22', '#5e2c14'];

const STICKERS = ['#e8e0d0', '#d8b040', '#c83a2a', '#a8642a', '#8a3a8a'];

const BAGS = ['#e8e0d0', '#c83a2a', '#d8b040', '#2a2a30', '#a8642a'];

const J = '#1c1816';


export const BOT: Record<Bot, BotSpec> = {
  android: { shape: 'android', top: 16, speed: 0.34 },
  valet: { shape: 'android', top: 16, speed: 0.3, paints: ['#2a2a30', '#3a3438', '#5a3a2a', '#e0d6c0', '#6a2a3e'] },
  marshal: { shape: 'android', top: 16, speed: 0.3, paints: ['#d86a1a', '#c8641e', '#d8a03a'] },
  servbot: { shape: 'box', top: 16, speed: 0.2 },
  sweeper: { shape: 'box', top: 16, speed: 0.2 },
  busker: { shape: 'box', top: 16, speed: 0.2 },
  waiter: { shape: 'waiter', top: 16, speed: 0.34, paints: ['#e0d6c0', '#2a2a30', '#8a3a4a', '#b8b0a0'] },
  loader: { shape: 'loader', top: 22, speed: 0.26, paints: ['#d8a03a', '#c8641e', '#8a8e96', '#6e6a3a', '#a83a2a'] },
  porter: { shape: 'porter', top: 12, speed: 0.3 },
  mech: { shape: 'mech', top: 17, speed: 0.15, paints: ['#5a5c60', '#5e5a40', '#6a3a34', '#4e5258', '#6a6458'] },
  litterbot: { shape: 'litter', top: 9, speed: 0.3 },
  deliverybot: { shape: 'delivery', top: 13, speed: 0.42, paints: ['#e0d6c0', '#c8b890', '#d87a3a', '#b8b0a0', '#c8641e'] },
  adbot: { shape: 'ad', top: 17, speed: 0.18 },
  crawler: { shape: 'crawler', top: 9, speed: 0.12 },
  wreck: { shape: 'wreck', top: 12, speed: 0, paints: ['#8a8e96', '#b8b0a0', '#7a5a3a', '#6a6e78', '#c8641e'] },
  minidrone: { shape: 'mini', top: 7, speed: 0.55, fly: 48 },
  cargodrone: { shape: 'cargo', top: 13, speed: 0.3, fly: 92, paints: ['#d8a03a', '#c8641e', '#8a8e96', '#5a5c60'] },
  flyerdrone: { shape: 'flyer', top: 7, speed: 0.2, fly: 74 },
  scandrone: { shape: 'scan', top: 5, speed: 0.35, fly: 64, paints: ['#4a4f5a', '#5a5c60', '#8a8e96', '#e8e0d0', '#6a6e78'] },
  djbot: { shape: 'box', top: 18, speed: 0.2, paints: ['#5a5f66', '#8b9099', '#3a3438', '#6a2a3e'] },
};

const BOT_KINDS = Object.keys(BOT) as Bot[];

export interface BotFull { kind: Bot; seed: number; paint: string; trim: string; metal: string; screen: string; light: string; wear: number; rust: string; sticker: string | null; odd: string | null; v: number; antenna: boolean; human: boolean; face: Face; plate: string; glitchy: boolean; bag: string }


export function botFrom(seed: number, kind: Bot, fix: Partial<BotLook> = {}): BotFull {
  const r = rnd(seed + 29), S = BOT[kind];
  const paint = fix.paint ?? pick(r, S.paints ?? PAINTS);
  let trim = fix.trim ?? pick(r, TRIMS);
  if (trim === paint) trim = shade(paint, 0.5);
  const wear = fix.wear ?? (kind === 'wreck' ? 0.9 : Math.pow(r(), 1.7) * 0.8);
  const sticker = r() < 0.45 ? pick(r, STICKERS) : null, odd = r() < 0.35 ? pick(r, PAINTS) : null;
  return {
    kind, seed, paint, trim, wear, sticker, odd: odd === paint ? null : odd,
    metal: pick(r, ['#8e949e', '#a09a90', '#7a7670']), screen: fix.screen ?? pick(r, SCREENS), light: pick(r, BOT_LIGHTS), rust: pick(r, RUSTS),
    v: fix.v ?? Math.floor(r() * 3), antenna: r() < 0.4, human: r() < 0.5, face: fix.face ?? pick(r, ['eyes', 'eyes', 'happy', 'dots', 'sad'] as Face[]),
    plate: pick(r, ['#e6d8c4', '#efe8dc', '#d8c0a8', '#c8b8a8']), glitchy: r() < 0.12, bag: pick(r, BAGS),
  };
}


export const botKind = (look: Character['look']): Bot | undefined =>
  typeof look === 'string' ? (BOT_KINDS.includes(look as Bot) ? look as Bot : undefined) : look && 'bot' in look ? look.bot : undefined;


const FACES: Record<Face, string[]> = {
  eyes: ['.....', '.o.o.', '.....'], happy: ['.o.o.', 'o...o', '.ooo.'], blink: ['.....', 'oo.oo', '.....'],
  sad: ['.o.o.', '.ooo.', 'o...o'], dots: ['.....', 'o.o.o', '.....'], off: ['.....', '.....', '.....'], crack: ['..o..', '.o.o.', 'o...o'],
};

/** A 5×3 screen face, its top row at `top`. */
function screenFace(g: Grid, c0: number, top: number, B: BotFull, face: Face) {
  rect(g, c0, top - 2, c0 + 4, top, '#140e0a');
  const col = face === 'crack' ? '#6a5a4a' : B.screen;
  (FACES[face] ?? FACES.eyes).forEach((row, j) => { for (let i = 0; i < 5; i++) if (row[i] === 'o') put(g, c0 + i, top - j, col); });
}

/** Wear on a panel: rust spots and drips, dents, and (panel 1) a sticker. Fixed to the panel, so it never moves between poses. */
function wearOn(g: Grid, c0: number, r0: number, c1: number, r1: number, B: BotFull, id: number) {
  const r = rnd(B.seed * 13 + id * 101), w = c1 - c0 + 1, h = r1 - r0 + 1, n = Math.round((B.wear * w * h) / 6), dent = shade(B.paint, 0.7);
  for (let i = 0; i < n; i++) {
    const c = c0 + Math.floor(r() * w), rr = r0 + Math.floor(r() * h), rust = r() < 0.65, drip = r() < 0.4;
    if (g[rr * W + c]) put(g, c, rr, rust ? B.rust : dent);
    if (rust && drip && rr > r0 && g[(rr - 1) * W + c]) put(g, c, rr - 1, shade(B.rust, 0.8));
  }
  if (B.sticker && id === 1 && w > 3 && h > 2) { const c = c0 + 1 + Math.floor(r() * (w - 3)), rr = r0 + 1 + Math.floor(r() * (h - 2)); put(g, c, rr, B.sticker); put(g, c + 1, rr, B.sticker); }
}

/** A 2×2 wheel whose hub turns between two frames. */
const wheel = (g: Grid, c: number, B: BotFull, pose: string) => { rect(g, c, 0, c + 1, 1, J); put(g, pose === 'r1' ? c + 1 : c, pose === 'r1' ? 0 : 1, B.metal); };

const stepOf = (pose: string): [number, number] => (pose === 'stepA' ? [-1, 1] : pose === 'stepB' ? [1, -1] : [0, 0]);


/** Humanoids: thin limbs with dark joints; a smooth porcelain face (nearly human) or a metal head with a visor slit. */
function android(B: BotFull, pose: string, st: string): [Grid, Meta] {
  const g = grid(), leg = B.v === 2 ? 6 : 5, T = 5, tw = B.v === 1 ? 5 : 6;
  const Lc = CX - (tw >> 1), Rc = Lc + tw - 1, sh = leg + T, hb = sh + 2, ht = hb + 3, hl = CX - 2, hr = CX + 2;
  const limb = B.human ? B.paint : B.metal, arm = B.odd ?? limb, [dL, dR] = stepOf(pose);
  for (let r = 0; r < leg; r++) {
    const oL = r < 2 ? dL : 0, oR = r < 2 ? dR : 0, col = r === 0 ? B.trim : r === 2 ? J : limb;
    put(g, Lc + 1 + oL, r, col); put(g, Rc - 1 + oR, r, col);
    if (r === 0) { put(g, Lc + 2 + oL, 0, B.trim); put(g, Rc + oR, 0, B.trim); }
  }
  rect(g, Lc + 1, leg, Rc - 1, leg, J);
  rect(g, Lc, leg + 1, Rc, sh, B.paint);
  rect(g, Lc + 1, leg + 1, Rc - 1, leg + 1, shade(B.paint, 0.75));
  if (B.kind === 'marshal') rect(g, Lc, sh - 2, Rc, sh - 2, '#efe6c8');
  if (B.kind === 'valet') { put(g, CX, sh, '#ddd5c5'); put(g, CX + 1, sh, '#ddd5c5'); put(g, CX, sh - 1, '#a82020'); }
  else { put(g, CX, sh - 1, shade(B.paint, 0.7)); put(g, CX, sh - 3, shade(B.paint, 0.7)); }
  put(g, Rc - 1, sh - 1, B.light);
  put(g, Lc, sh, B.trim); put(g, Rc, sh, B.trim);
  wearOn(g, Lc, leg + 1, Rc, sh, B, 1);
  put(g, CX, sh + 1, J);
  if (B.human) {
    rect(g, hl, hb, hr, ht, B.plate);
    rect(g, hl, ht, hr, ht, B.paint); put(g, hl, ht - 1, B.paint);
    rect(g, hl + 1, hb, hr, hb, shade(B.plate, 0.84));
    put(g, hr - 2, hb + 1, '#1a0d05'); put(g, hr, hb + 1, '#1a0d05'); put(g, hl, hb + 1, J);
  } else {
    rect(g, hl, hb, hr, ht, B.odd && B.kind !== 'valet' ? B.odd : B.metal); clr(g, hl, ht);
    rect(g, hl + 1, hb + 1, hr + 1, hb + 1, B.screen); put(g, hl, hb, J);
    if (B.antenna) { put(g, CX - 1, ht + 1, J); put(g, CX - 1, ht + 2, B.light); }
  }
  const back = shade(limb, 0.62);
  rect(g, Lc - 1, sh - T + 2, Lc - 1, sh, back); put(g, Lc - 1, sh - 2, J);
  const R = Rc + 1;
  const PATH: Record<string, [number, number][]> = {
    down: [[0, 0], [0, -1], [0, -2], [0, -3]], bags: [[0, 0], [0, -1], [0, -2], [0, -3]], carry: [[0, 0], [1, -1], [2, -1], [3, -1]],
    umb: [[0, 0], [0, -1], [1, -1]], stop: [[0, 0], [1, 0], [2, 0], [3, 0]], go: [[0, 0], [0, 1], [0, 2], [0, 3]],
  };
  const path = PATH[st] ?? PATH.down, mid = path.length >> 1;
  path.forEach(([dc, dr], i) => put(g, R + dc, sh + dr, i === mid ? J : i === path.length - 1 ? B.trim : arm));
  let [hc, hrow] = path[path.length - 1];
  hc += R; hrow += sh;
  let top = ht + 1 + (B.antenna && !B.human ? 2 : 0);
  if (st === 'carry') { rect(g, R + 1, sh - 4, R + 4, sh - 1, '#8a6a40'); rect(g, R + 2, sh - 4, R + 2, sh - 1, '#c8b890'); put(g, R + 4, sh - 4, '#e8e0d0'); }
  if (st === 'bags') { rect(g, hc, hrow - 3, hc + 1, hrow - 1, B.bag); put(g, hc, hrow, '#2a2018'); rect(g, Lc - 2, sh - T - 1, Lc - 1, sh - T + 1, shade(B.bag, 0.75)); }
  if (st === 'umb') {
    const S = R + 1, can = B.odd ?? (B.bag === '#2a2a30' ? '#c83a2a' : B.bag);
    rect(g, S, sh, S, ht + 2, '#2a2018');
    rect(g, S - 4, ht + 3, S + 5, ht + 3, can); rect(g, S - 3, ht + 4, S + 4, ht + 4, can); rect(g, S - 1, ht + 5, S + 2, ht + 5, shade(can, 1.2));
    put(g, S - 4, ht + 2, shade(can, 0.6)); put(g, S + 5, ht + 2, shade(can, 0.6));
    top = ht + 6;
  }
  if (st === 'stop') { rect(g, R + 4, sh - 1, R + 6, sh + 1, '#c83a2a'); put(g, R + 5, sh, '#efe6c8'); }
  if (st === 'go') { rect(g, R - 1, sh + 4, R + 1, sh + 6, '#4a9a3a'); put(g, R, sh + 5, '#efe6c8'); top = Math.max(top, sh + 7); }
  return [g, { hand: [hc, hrow], mouth: [hr + 1, hb + 1], top }];
}


/** Boxy retro service bots with a screen face: on treads (v0), one wheel (v1) or stubby legs (v2). */
function boxBot(B: BotFull, pose: string, st: string): [Grid, Meta] {
  const g = grid(), [arms, fc] = st.split('|') as [string, Face];
  if (B.v === 0) { rect(g, CX - 4, 0, CX + 3, 2, J); rect(g, CX - 4, 2, CX + 3, 2, B.trim); for (let c = CX - 3 + (pose === 'r1' ? 1 : 0); c <= CX + 2; c += 2) put(g, c, 1, B.metal); }
  else if (B.v === 1) { rect(g, CX - 1, 0, CX + 1, 2, J); clr(g, CX - 1, 0); clr(g, CX + 1, 0); put(g, CX, 1, B.metal); put(g, pose === 'r1' ? CX + 1 : CX - 1, 1, B.metal); rect(g, CX - 2, 1, CX - 2, 2, B.trim); rect(g, CX + 2, 1, CX + 2, 2, B.trim); }
  else { const [dL, dR] = stepOf(pose); rect(g, CX - 3, 1, CX - 2, 2, B.metal); rect(g, CX + 1, 1, CX + 2, 2, B.metal); rect(g, CX - 4 + dL, 0, CX - 2 + dL, 0, B.trim); rect(g, CX + 1 + dR, 0, CX + 3 + dR, 0, B.trim); }
  rect(g, CX - 4, 3, CX + 3, 8, B.paint);
  rect(g, CX - 4, 3, CX + 3, 3, shade(B.paint, 0.7));
  rect(g, CX - 4, 8, CX + 3, 8, shade(B.paint, 1.15));
  for (let c = CX - 3; c <= CX; c += 2) { put(g, c, 5, J); put(g, c, 6, J); }
  put(g, CX + 2, 6, B.light);
  wearOn(g, CX - 4, 3, CX + 3, 8, B, 1);
  rect(g, CX - 1, 9, CX, 9, J);
  rect(g, CX - 3, 10, CX + 3, 14, B.odd ?? shade(B.paint, 1.1));
  wearOn(g, CX - 3, 10, CX + 3, 14, B, 2);
  screenFace(g, CX - 2, 13, B, fc);
  let top = 15;
  if (B.antenna) { put(g, CX + 2, 15, J); put(g, CX + 2, 16, J); put(g, CX + 2, 17, B.light); top = 18; }
  if (B.kind === 'djbot') { rect(g, CX - 3, 15, CX + 3, 15, '#2a2a30'); rect(g, CX - 4, 11, CX - 4, 14, '#2a2a30'); rect(g, CX + 4, 11, CX + 4, 14, '#2a2a30'); put(g, CX + 4, 12, B.light); top = Math.max(top, 16); }
  if (B.kind === 'sweeper') { rect(g, CX - 7, 3, CX - 5, 6, B.trim); rect(g, CX - 7, 6, CX - 5, 6, shade(B.trim, 1.4)); put(g, CX - 6, 7, '#e8e0d0'); }
  else rect(g, CX - 5, 5, CX - 5, 7, shade(B.metal, 0.62));
  const horn = B.kind === 'busker' && !B.human;
  const P: Record<string, [number, number][]> = {
    down: [[0, 0], [0, -1], [0, -2], [1, -3]], out: [[0, 0], [1, 0], [2, 0], [3, 1]], box: [[0, 0], [1, -1], [2, -1]],
    broomA: [[0, 0], [1, -1], [1, -2]], broomB: [[0, 0], [1, -1], [2, -1]],
    playA: horn ? [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] : [[0, 0], [0, -1], [-1, -2]], playB: horn ? [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] : [[0, 0], [0, -1], [-1, -1]],
    djA: [[0, 0], [1, 0], [2, 0], [3, -1]], djB: [[0, 0], [1, 1], [2, 1], [3, 0]],
  };
  const R = CX + 4, sh = 7, path = P[arms] ?? P.down;
  path.forEach(([dc, dr], i) => put(g, R + dc, sh + dr, i === path.length - 1 ? J : B.metal));
  let [hc, hrow] = path[path.length - 1];
  hc += R; hrow += sh;
  if (arms === 'box') { rect(g, CX + 4, 4, CX + 8, 8, '#8a6a40'); rect(g, CX + 6, 4, CX + 6, 8, '#c8b890'); }
  if (arms === 'broomA' || arms === 'broomB') {
    const lean = arms === 'broomA' ? 3 : 2;
    for (let r = hrow; r >= 1; r--) put(g, hc + 1 + Math.floor((hrow - r) / lean), r, '#6a4a2a');
    const end = hc + 1 + Math.floor((hrow - 1) / lean);
    rect(g, end - 1, 0, end + 1, 0, '#b89a50');
  }
  if (arms === 'playA' || arms === 'playB') {
    if (horn) { rect(g, CX + 4, 12, CX + 7, 12, '#d8b040'); rect(g, CX + 8, arms === 'playA' ? 11 : 12, CX + 8, 13, '#e8c860'); if (arms === 'playA') put(g, CX + 9, 12, '#e8c860'); }
    else {
      const sq = arms === 'playA' ? 0 : 1;
      for (let c = CX - 2 + sq; c <= CX + 3 - sq; c++) rect(g, c, 4, c, 7, c & 1 ? '#e8e0d0' : '#a83a2a');
      rect(g, CX - 3 + sq, 4, CX - 3 + sq, 7, J); rect(g, CX + 4 - sq, 4, CX + 4 - sq, 7, J);
    }
    rect(g, CX + 6, 0, CX + 7, 1, B.metal); put(g, CX + 6, 1, '#d8b040');
  }
  return [g, { hand: [hc, hrow], mouth: [CX + 3, 12], top }];
}


/** The waiter: one wheel, a towel over the back arm, a tray of drinks, a bow tie on its paint. */
function waiterBot(B: BotFull, pose: string, st: string): [Grid, Meta] {
  const g = grid(), [arms, fc] = st.split('|') as [string, Face];
  rect(g, CX - 1, 0, CX + 1, 2, J); clr(g, CX - 1, 0); clr(g, CX + 1, 0); put(g, CX, 1, B.metal); put(g, pose === 'r1' ? CX + 1 : CX - 1, 1, B.metal);
  rect(g, CX - 1, 3, CX + 1, 3, B.trim); rect(g, CX, 4, CX, 6, B.metal);
  rect(g, CX - 2, 7, CX + 2, 10, B.paint); rect(g, CX, 7, CX, 9, B.paint === '#e0d6c0' ? '#b8ad94' : '#ece4d6');
  put(g, CX - 1, 10, '#a82020'); put(g, CX + 1, 10, '#a82020'); put(g, CX, 10, '#6a1010');
  wearOn(g, CX - 2, 7, CX + 2, 9, B, 1);
  put(g, CX, 11, J);
  rect(g, CX - 2, 12, CX + 2, 15, B.odd ?? shade(B.paint, 1.1)); clr(g, CX - 2, 15); clr(g, CX + 2, 15);
  screenFace(g, CX - 2, 14, B, fc);
  rect(g, CX - 3, 7, CX - 3, 10, shade(B.metal, 0.62)); rect(g, CX - 4, 7, CX - 4, 9, '#e8e0d0');
  const d = arms === 'offer' ? 1 : 0, path: [number, number][] = d ? [[0, 0], [1, 1], [2, 1], [3, 1]] : [[0, 0], [1, 0], [2, 0], [2, 1]];
  path.forEach(([dc, dr], i) => put(g, CX + 3 + dc, 10 + dr, i === path.length - 1 ? J : B.metal));
  rect(g, CX + 3 + d, 12, CX + 8 + d, 12, '#c8c0b0');
  rect(g, CX + 4 + d, 13, CX + 4 + d, 14, '#e8e0d0'); put(g, CX + 6 + d, 13, '#ffb030'); put(g, CX + 6 + d, 14, '#ffd9a5'); rect(g, CX + 8 + d, 13, CX + 8 + d, 15, '#4a2a1a');
  return [g, { hand: [CX + 6 + d, 13], mouth: [CX + 2, 13], top: 16 }];
}


/** The loader: a tall thin frame on reverse knees, a hazard plate, forks out front, a crate (or none, on the way back). */
function loaderBot(B: BotFull, pose: string, st: string): [Grid, Meta] {
  const g = grid(), [dL, dR] = stepOf(pose);
  for (const [c, d] of [[CX - 2, dL], [CX + 2, dR]] as [number, number][]) {
    rect(g, c - 1 + d, 0, c + 1 + d, 0, B.trim);
    for (let r = 1; r <= 8; r++) put(g, r <= 4 ? c + 1 + (r < 3 ? d : 0) : c, r, r === 4 || r === 5 ? J : B.metal);
  }
  rect(g, CX - 3, 9, CX + 3, 9, J);
  rect(g, CX - 1, 10, CX, 18, B.paint);
  for (let r = 12; r <= 16; r++) for (let c = CX - 2; c <= CX + 1; c++) put(g, c, r, (c + r) % 3 === 0 ? '#1a1410' : '#d8a020');
  rect(g, CX - 4, 13, CX - 3, 17, B.trim); put(g, CX - 4, 15, B.metal);
  wearOn(g, CX - 4, 10, CX + 1, 18, B, 1);
  rect(g, CX - 1, 19, CX + 2, 21, B.odd ?? shade(B.paint, 1.1)); put(g, CX + 1, 20, '#140e0a'); put(g, CX + 2, 20, B.light);
  put(g, CX + 1, 18, B.metal); put(g, CX + 2, 17, B.metal); rect(g, CX + 3, 12, CX + 3, 16, B.metal); put(g, CX + 3, 14, J);
  rect(g, CX + 3, 11, CX + 9, 11, J);
  if (st === 'load') {
    if (B.v === 0) { rect(g, CX + 4, 12, CX + 9, 17, '#8a5a2a'); rect(g, CX + 4, 13, CX + 9, 13, '#6a4220'); rect(g, CX + 4, 16, CX + 9, 16, '#6a4220'); rect(g, CX + 6, 14, CX + 7, 14, '#c8b890'); }
    else if (B.v === 1) { rect(g, CX + 4, 12, CX + 8, 14, '#a8845a'); rect(g, CX + 5, 15, CX + 9, 17, '#b8946a'); rect(g, CX + 6, 12, CX + 6, 14, '#d8c8a0'); rect(g, CX + 7, 15, CX + 7, 17, '#d8c8a0'); }
    else { rect(g, CX + 4, 12, CX + 9, 15, '#d86a1a'); for (let c = CX + 5; c <= CX + 8; c += 2) put(g, c, 13, J); for (let c = CX + 4; c <= CX + 9; c += 2) rect(g, c, 16, c, 17, '#6a4a2a'); }
  }
  return [g, { hand: [CX + 9, 11], mouth: [CX + 2, 20], top: 22 }];
}


/** The porter: a wire basket on wheels, full of somebody else's groceries, with a little head on a stalk. */
function porterBot(B: BotFull, pose: string): [Grid, Meta] {
  const g = grid();
  wheel(g, CX - 4, B, pose); wheel(g, CX + 2, B, pose);
  rect(g, CX - 5, 2, CX + 4, 2, J);
  rect(g, CX - 5, 3, CX + 3, 7, shade(B.paint, 0.55));
  for (let r = 4; r <= 6; r++) for (let c = CX - 4; c <= CX + 2; c++) if ((c + r) & 1) put(g, c, r, B.paint);
  rect(g, CX - 5, 7, CX + 3, 7, B.paint); rect(g, CX - 5, 3, CX - 5, 7, B.paint); rect(g, CX + 3, 3, CX + 3, 7, B.paint);
  rect(g, CX - 4, 8, CX - 2, 10, '#b8a07a'); rect(g, CX - 1, 8, CX - 1, 10, '#5a8a3a'); put(g, CX - 1, 11, '#c8d8a0');
  put(g, CX + 1, 8, '#e87a2a'); rect(g, CX + 2, 8, CX + 2, 10, '#8a2a2a');
  rect(g, CX - 7, 6, CX - 6, 6, B.metal); put(g, CX - 7, 7, B.metal);
  rect(g, CX + 4, 3, CX + 4, 6, B.metal); rect(g, CX + 4, 7, CX + 6, 9, B.odd ?? B.trim); put(g, CX + 6, 8, B.screen);
  wearOn(g, CX - 5, 3, CX + 3, 7, B, 1);
  return [g, { hand: [CX + 6, 8], mouth: [CX + 6, 8], top: 12 }];
}


/** Security mech: wide, slow, armoured, a red sensor bar in a sunken head, a Registry tag on its chest. */
function mechBot(B: BotFull, pose: string): [Grid, Meta] {
  const g = grid(), lift = pose === 'stepA' ? [1, 0] : pose === 'stepB' ? [0, 1] : [0, 0];
  rect(g, CX - 9, 5, CX - 8, 10, shade(B.metal, 0.6)); rect(g, CX - 9, 3, CX - 7, 4, shade(B.trim, 0.8));
  ([[CX - 6, lift[0]], [CX + 2, lift[1]]] as [number, number][]).forEach(([c0, l]) => { rect(g, c0, l, c0 + 4, l, B.trim); rect(g, c0 + 1, 1 + l, c0 + 3, 4, B.metal); put(g, c0 + 2, 3, J); });
  rect(g, CX - 4, 5, CX + 4, 5, J);
  rect(g, CX - 6, 6, CX + 6, 12, B.paint);
  rect(g, CX - 6, 9, CX + 6, 9, shade(B.paint, 0.72));
  for (let c = CX - 2; c <= CX + 2; c += 2) rect(g, c, 7, c, 8, J);
  rect(g, CX + 6, 6, CX + 6, 12, shade(B.paint, 1.25));
  put(g, CX + 3, 11, '#e8e0d0'); put(g, CX + 4, 11, '#e8e0d0');
  wearOn(g, CX - 6, 6, CX + 5, 12, B, 1);
  rect(g, CX - 9, 11, CX - 6, 13, shade(B.paint, 0.85)); rect(g, CX + 6, 11, CX + 9, 13, shade(B.paint, 1.15)); rect(g, CX + 6, 13, CX + 9, 13, B.trim);
  rect(g, CX - 2, 13, CX + 3, 15, shade(B.paint, 0.8)); rect(g, CX - 1, 14, CX + 3, 14, J); rect(g, CX + 1, 14, CX + 3, 14, '#ff2a44');
  rect(g, CX - 1, 16, CX + 2, 16, B.paint);
  rect(g, CX + 8, 5, CX + 9, 10, B.odd ?? B.metal); put(g, CX + 8, 8, J); rect(g, CX + 7, 3, CX + 10, 4, B.trim);
  return [g, { hand: [CX + 10, 3], mouth: [CX + 3, 14], top: 17 }];
}


/** Litter picker: a hopper on two wheels, a grabber that reaches for the ground and lifts what it finds. */
function litterBot(B: BotFull, pose: string, st: string): [Grid, Meta] {
  const g = grid();
  wheel(g, CX - 3, B, pose); wheel(g, CX + 1, B, pose);
  rect(g, CX - 3, 2, CX + 3, 5, B.paint); rect(g, CX - 3, 3, CX + 3, 3, B.trim); put(g, CX + 3, 4, B.light);
  wearOn(g, CX - 3, 2, CX + 3, 5, B, 1);
  rect(g, CX - 2, 6, CX + 2, 6, J); rect(g, CX - 3, 6, CX - 3, 8, B.trim); rect(g, CX + 3, 6, CX + 3, 8, B.trim);
  put(g, CX - 2, 7, '#e8e0d0'); put(g, CX - 1, 7, '#8a6a40'); put(g, CX + 1, 7, '#c83a2a'); put(g, CX, 8, '#d8d0c0');
  if (B.v === 2) rect(g, CX + 3, 0, CX + 4, 0, '#b89a50');
  const P: Record<string, [number, number][]> = {
    tuck: [[4, 5], [4, 4], [5, 4]], reach: [[4, 5], [5, 4], [5, 3], [6, 2], [6, 1], [6, 0]], lift: [[4, 6], [4, 7], [4, 8], [3, 9]],
  };
  const path = P[st] ?? P.tuck;
  path.forEach(([c, r], i) => put(g, CX + c, r, i === path.length - 1 ? J : B.odd ?? B.metal));
  if (st === 'reach') put(g, CX + 7, 0, J);
  if (st === 'lift') put(g, CX + 2, 9, '#e8e0d0');
  const [hc, hr] = path[path.length - 1];
  return [g, { hand: [CX + hc, hr], mouth: [CX + 3, 4], top: 10 }];
}


/** Kerb delivery box: six wheels, a lid, a label, a whip flag so traffic sees it (traffic does not). */
function deliveryBot(B: BotFull, pose: string): [Grid, Meta] {
  const g = grid();
  wheel(g, CX - 4, B, pose); wheel(g, CX - 1, B, pose); wheel(g, CX + 2, B, pose);
  rect(g, CX - 5, 2, CX + 4, 6, B.paint); rect(g, CX - 5, 6, CX + 4, 6, shade(B.paint, 1.1)); rect(g, CX - 5, 5, CX + 4, 5, shade(B.paint, 0.7));
  rect(g, CX + 4, 3, CX + 4, 4, '#140e0a'); put(g, CX + 4, 4, B.screen);
  rect(g, CX - 3, 3, CX - 1, 4, '#e8e0d0'); put(g, CX - 2, 3, J);
  wearOn(g, CX - 5, 2, CX + 4, 6, B, 1);
  rect(g, CX - 4, 7, CX - 4, 12, J); rect(g, CX - 3, 11, CX - 1, 12, B.odd ?? '#e8641e');
  return [g, { hand: [CX + 4, 4], mouth: [CX + 4, 4], top: 13 }];
}


/** Sandwich-board advertiser: a little screen-faced head over a board it carries everywhere. */
function adBot(B: BotFull, pose: string, st: string): [Grid, Meta] {
  const g = grid();
  wheel(g, CX - 3, B, pose); wheel(g, CX + 2, B, pose);
  rect(g, CX - 3, 2, CX + 3, 2, J); rect(g, CX, 3, CX, 3, B.metal);
  rect(g, CX - 6, 4, CX + 6, 12, B.trim); rect(g, CX - 5, 5, CX + 5, 11, '#c8baa0');
  wearOn(g, CX - 6, 4, CX + 6, 4, B, 2);
  put(g, CX - 7, 9, B.metal); put(g, CX + 7, 9, B.metal);
  rect(g, CX - 2, 13, CX + 2, 16, B.odd ?? B.paint);
  screenFace(g, CX - 2, 15, B, st as Face);
  return [g, { hand: [CX + 7, 9], mouth: [CX + 2, 14], top: 17 }];
}


/** Spider-legged maintenance bot, seen flat on a wall or a ledge: six legs, one eye, a torch or a brush. */
function crawlerBot(B: BotFull, pose: string, st: string): [Grid, Meta] {
  const g = grid(), A = pose === 'cA';
  const LEGS: [number, number][][] = [
    [[-3, 6], [-4, 7], [-5, 8], [-6, 8]], [[-3, 5], [-4, 5], [-5, 5], [-6, 4]], [[-3, 3], [-4, 2], [-5, 1], [-5, 0]],
  ];
  LEGS.forEach((leg, k) => {
    for (const side of [-1, 1]) {
      const up = (k !== 1) === (side < 0) ? A : !A;
      leg.forEach(([dc, dr], i) => put(g, CX + dc * -side, dr + (i === 3 && up ? 1 : 0), i === 1 ? J : B.metal));
    }
  });
  rect(g, CX - 2, 3, CX + 2, 6, B.paint); clr(g, CX - 2, 3); clr(g, CX + 2, 3); clr(g, CX - 2, 6); clr(g, CX + 2, 6);
  rect(g, CX - 1, 6, CX + 1, 6, B.trim); put(g, CX, 4, B.light); put(g, CX + 1, 4, '#140e0a');
  wearOn(g, CX - 2, 3, CX + 2, 6, B, 1);
  let hand: [number, number] = [CX + 2, 4];
  if (st === 'weld') { put(g, CX + 3, 4, B.odd ?? B.metal); put(g, CX + 4, 4, J); put(g, CX + 5, 4, '#ffd23a'); hand = [CX + 5, 4]; }
  if (st === 'scrubA' || st === 'scrubB') { const r = st === 'scrubA' ? 6 : 7; put(g, CX + 3, 5, B.metal); put(g, CX + 4, r - 1, B.metal); rect(g, CX + 4, r, CX + 5, r, '#b89a50'); hand = [CX + 5, r]; }
  return [g, { hand, mouth: [CX, 4], top: 9 }];
}


/** A derelict: sat against the wall, one leg gone, an arm on the ground, a cracked screen, a cardboard sign. */
function wreckBot(B: BotFull, pose: string, st: string): [Grid, Meta] {
  const g = grid();
  rect(g, CX - 2, 2, CX - 2, 5, shade(B.metal, 0.6));
  rect(g, CX - 1, 0, CX + 4, 1, shade(B.paint, 0.7));
  rect(g, CX + 4, 0, CX + 7, 0, B.metal); rect(g, CX + 8, 0, CX + 8, 1, B.trim);
  put(g, CX + 4, 1, '#c83a2a'); put(g, CX + 5, 1, '#d8b040');
  for (let r = 2; r <= 7; r++) { const s = r >= 5 ? -1 : 0; rect(g, CX - 1 + s, r, CX + 4 + s, r, B.paint); }
  put(g, CX, 3, J); put(g, CX + 2, 3, J); put(g, CX + 3, 5, B.rust);
  wearOn(g, CX - 2, 2, CX + 4, 7, B, 1);
  const up = pose === 'twitch' ? 2 : 0, hc = up ? CX : CX + 1;
  rect(g, hc, 6 + up, hc + 4, 9 + up, B.odd ?? shade(B.paint, 1.1));
  screenFace(g, hc, 8 + up, B, st as Face);
  rect(g, CX + 9, 0, CX + 10, 0, B.odd ?? B.metal);
  rect(g, CX - 10, 0, CX - 3, 4, '#9a7a4a'); rect(g, CX - 10, 4, CX - 3, 4, '#7a5a34'); clr(g, CX - 9, 4); clr(g, CX - 5, 4);
  return [g, { hand: [CX + 10, 0], mouth: [hc + 4, 7 + up], top: 12 }];
}


/** Rotor boom at row `r`, `half` cells each side, blades on its tips: long, or short while they spin past. */
function rotors(g: Grid, B: BotFull, r: number, half: number, spin: boolean) {
  rect(g, CX - half, r, CX + half, r, J);
  if (spin) { put(g, CX - half, r + 1, B.metal); put(g, CX + half, r + 1, B.metal); }
  else { rect(g, CX - half - 1, r + 1, CX - half + 1, r + 1, B.metal); rect(g, CX + half - 1, r + 1, CX + half + 1, r + 1, B.metal); }
}

/** Drones: a small parcel drone, a scan drone, a heavy lifter with a crate on straps, a flyer drone with a projector. */
function droneBot(B: BotFull, pose: string): [Grid, Meta] {
  const g = grid(), spin = pose === 'p1', S = BOT[B.kind].shape;
  if (S === 'mini') {
    if (B.v !== 2) { rect(g, CX - 1, 0, CX + 1, 1, '#8a6a40'); put(g, CX, 1, '#c8b890'); put(g, CX, 2, J); }
    rect(g, CX - 2, 3, CX + 2, 4, B.paint); put(g, CX + 1, 3, B.light);
    rotors(g, B, 5, 3, spin);
    return [g, { hand: [CX, 1], mouth: [CX + 1, 3], top: 7 }];
  }
  if (S === 'scan') {
    // the scan drone (Registry, rescue, port watchdog): a sensor pod under a flat body, a status light, rotors.
    // v picks the pod: one lens (0), twin lenses (1), a wide dome (2). hand = the status light, mouth = the lens.
    const lens = '#ff2a44';
    if (B.v === 2) { rect(g, CX - 2, 0, CX + 2, 0, J); clr(g, CX - 2, 0); clr(g, CX + 2, 0); put(g, CX, 0, lens); }
    else { rect(g, CX - 1, 0, CX + 1, 0, J); if (B.v === 1) { put(g, CX - 1, 0, lens); put(g, CX + 1, 0, lens); } else put(g, CX, 0, lens); }
    rect(g, CX - 3, 1, CX + 3, 2, B.paint); rect(g, CX - 3, 1, CX + 3, 1, shade(B.paint, 0.72)); put(g, CX - 3, 2, B.trim); put(g, CX + 3, 2, B.trim);
    wearOn(g, CX - 3, 1, CX + 3, 2, B, 1);
    put(g, CX + 1, 2, B.light);
    rotors(g, B, 3, 4, spin);
    return [g, { hand: [CX + 1, 2], mouth: [CX, 0], top: 5 }];
  }
  if (S === 'cargo') {
    const crate = B.v === 1 ? '#d86a1a' : '#8a5a2a';
    rect(g, CX - 3, 0, CX + 3, 4, crate); rect(g, CX - 3, 2, CX + 3, 2, shade(crate, 0.75)); rect(g, CX - 1, 1, CX, 1, '#c8b890');
    rect(g, CX - 2, 5, CX - 2, 6, J); rect(g, CX + 2, 5, CX + 2, 6, J);
    rect(g, CX - 3, 7, CX + 3, 9, B.paint); put(g, CX, 7, B.light); rect(g, CX - 3, 9, CX + 3, 9, B.trim);
    wearOn(g, CX - 3, 7, CX + 3, 9, B, 1);
    rect(g, CX - 7, 10, CX + 7, 10, B.metal); put(g, CX - 7, 11, J); put(g, CX + 7, 11, J);
    if (spin) { rect(g, CX - 8, 12, CX - 6, 12, '#a09a90'); rect(g, CX + 6, 12, CX + 8, 12, '#a09a90'); } else { rect(g, CX - 9, 12, CX - 5, 12, '#a09a90'); rect(g, CX + 5, 12, CX + 9, 12, '#a09a90'); }
    return [g, { hand: [CX, 0], mouth: [CX, 7], top: 13 }];
  }
  rect(g, CX - 2, 2, CX + 2, 4, B.paint); put(g, CX + 2, 3, B.light); rect(g, CX - 1, 1, CX + 1, 1, J); put(g, CX, 1, '#ffb030');
  wearOn(g, CX - 2, 2, CX + 2, 4, B, 1);
  put(g, CX, 5, J);
  if (spin) rect(g, CX - 2, 6, CX + 2, 6, B.metal); else rect(g, CX - 4, 6, CX + 4, 6, B.metal);
  return [g, { hand: [CX, 1], mouth: [CX, 1], top: 7 }];
}


function robot(B: BotFull, pose: string, st: string): [Grid, Meta] {
  switch (BOT[B.kind].shape) {
    case 'android': return android(B, pose, st);
    case 'box': return boxBot(B, pose, st);
    case 'waiter': return waiterBot(B, pose, st);
    case 'loader': return loaderBot(B, pose, st);
    case 'porter': return porterBot(B, pose);
    case 'mech': return mechBot(B, pose);
    case 'litter': return litterBot(B, pose, st);
    case 'delivery': return deliveryBot(B, pose);
    case 'ad': return adBot(B, pose, st);
    case 'crawler': return crawlerBot(B, pose, st);
    case 'wreck': return wreckBot(B, pose, st);
    default: return droneBot(B, pose);
  }
}


/** What a screen face shows now: its own default, a blink now and then, 'blink' cycles moods, a glitch shows dots. */
export function faceAt(B: BotFull, act: Act, tt: number): Face {
  if (act === 'blink') return (['eyes', 'happy', 'dots', 'sad', 'eyes', 'blink'] as Face[])[Math.floor(tt / 70) % 6];
  if ((act === 'glitch' || B.glitchy) && tt % 400 < 24) return 'dots';
  if (act === 'charge') return tt % 200 < 100 ? 'blink' : 'dots';
  return tt % 260 < 8 ? 'blink' : B.face;
}


// ---------- baking ----------

interface Baked { c: HTMLCanvasElement; meta: Meta }

const BAKED = new Map<string, Baked>();

/** The rim: opaque, a warm mid tone two steps over the dark walls (ART-GUIDE §4). */
const RIM = '#6e4c36';


function bake(key: string, make: () => [Grid, Meta], ps: number, flip: boolean, dim: number, rim = true): Baked {
  const k = key + '|' + ps + '|' + (flip ? 1 : 0) + '|' + dim + (rim ? '' : '|n');
  let b = BAKED.get(k);
  if (b) return b;
  const [g, meta] = make();
  const c = document.createElement('canvas');
  c.width = W * ps + 2; c.height = H * ps + 2;
  const x = c.getContext('2d')!;
  const at = (col: number) => (flip ? 2 * CX - col : col);
  // the rim: the silhouette one unit bigger all round, then the pixels on it
  x.fillStyle = RIM;
  if (rim) for (let r = 0; r < H; r++) for (let col = 0; col < W; col++) if (g[r * W + col]) x.fillRect(at(col) * ps, (H - 1 - r) * ps, ps + 2, ps + 2);
  for (let r = 0; r < H; r++) for (let col = 0; col < W; col++) { const v = g[r * W + col]; if (v) { x.fillStyle = v; x.fillRect(1 + at(col) * ps, 1 + (H - 1 - r) * ps, ps, ps); } }
  if (dim > 0) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(6,3,2,' + dim + ')'; x.fillRect(0, 0, c.width, c.height); }
  const fl = (p: Cell | undefined): Cell | undefined => p && [at(p[0]), p[1]];
  b = { c, meta: flip ? { ...meta, hand: fl(meta.hand)!, mouth: fl(meta.mouth)!, eye: fl(meta.eye), wrist: fl(meta.wrist), ear: fl(meta.ear) } : meta };
  BAKED.set(k, b);
  return b;
}


// ---------- drawing ----------

export const psOf = (p: Character) => p.ps ?? 3;


/** Dry adverts for sandwich boards and flyer holograms: two short lines each. */
const ADS = [['LOANS', 'TODAY'], ['NOODLE', '2 TKN'], ['SCORE', 'CHECK'], ['RENT', 'DUE'], ['OPEN', '24/7'], ['NEW', 'IMPLANT'], ['INSURE', 'NOW'], ['CREDIT', 'REPAIR']];

const TXT = '600 7px "IBM Plex Mono", monospace';


/** A robot's live effects, cheap fills over the baked sprite: sensor beams, sparks, notes, board text, a charging cable. */
function botFx(x: CanvasRenderingContext2D, v: View, p: Character, B: BotFull, f: Frame, b: Baked, cell: (c: number, r: number) => number[], flip: boolean, tt: number, glitch: boolean | undefined) {
  const S = BOT[B.kind], act = p.act ?? 'stand', ps = psOf(p), R = Math.round;
  void f;
  if (p.light) {
    // a state-driven status light (a device's drone: green, red), painted over the baked one
    const [lx, ly] = cell(b.meta.hand[0], b.meta.hand[1]);
    x.fillStyle = p.light; x.fillRect(R(lx - ps / 2), R(ly - ps / 2), ps, ps);
    x.globalAlpha = 0.3; x.fillRect(R(lx - ps * 1.5), R(ly - ps), ps * 3, ps * 2); x.globalAlpha = 1;
  }
  if (glitch) { const [gx, gy] = cell(CX, S.top >> 1); x.fillStyle = 'rgba(255,217,165,.35)'; x.fillRect(R(gx - 12), R(gy + ((tt * 13) % 9) - 4), 24, 1); }
  if (act === 'charge') {
    // cabled to a socket on the wall behind, the socket's pips counting up
    const [bx, by] = cell(flip ? CX + 4 : CX - 4, 4), wx = bx + (flip ? 1 : -1) * 6 * ps, wy = v.y((p.h ?? 0) + 24);
    x.fillStyle = '#2a1d14'; x.fillRect(R(wx - 4), R(wy - 6), 8, 12); x.fillStyle = 'rgba(194,65,12,.7)'; x.fillRect(R(wx - 4), R(wy - 6), 8, 1);
    x.strokeStyle = '#120c08'; x.lineWidth = 2; x.beginPath(); x.moveTo(wx, wy + 4); x.quadraticCurveTo((wx + bx) / 2, Math.max(wy, by) + 10, bx, by); x.stroke(); x.lineWidth = 1;
    const lvl = Math.floor(tt / 30) % 4;
    for (let i = 0; i <= lvl; i++) { x.fillStyle = 'rgba(255,176,48,.9)'; x.fillRect(R(wx - 2), R(wy + 3 - i * 2), 4, 1); }
  }
  switch (S.shape) {
    case 'mech': {
      // the sensor sweeps the street ahead
      const [ex, ey] = cell(b.meta.mouth[0], b.meta.mouth[1]), dir = flip ? -1 : 1, far = ex + dir * 30 * ps, fy = ey + 9 * ps + Math.sin(tt * 0.03) * 7 * ps;
      x.fillStyle = 'rgba(255,42,68,.07)'; x.beginPath(); x.moveTo(ex, ey); x.lineTo(far, fy - 14); x.lineTo(far, fy + 14); x.closePath(); x.fill();
      x.fillStyle = 'rgba(255,42,68,.5)'; x.fillRect(R(far), R(fy - 10), 1, 20);
      x.fillStyle = 'rgba(255,42,68,.3)'; x.fillRect(R(ex - 6), R(ey - 3), 12, 6);
      break;
    }
    case 'crawler': {
      const [hx, hy] = cell(b.meta.hand[0], b.meta.hand[1]);
      if (act === 'weld' && tt % 90 < 60) {
        x.fillStyle = 'rgba(255,220,140,.18)'; x.fillRect(R(hx - 8), R(hy - 8), 16, 16);
        for (let i = 0; i < 5; i++) {
          const k = (tt * 0.07 + i * 0.37) % 1, a = i * 2.1 + Math.floor(tt / 6);
          x.fillStyle = i % 2 ? '#ffd23a' : '#fff0c8'; x.fillRect(R(hx + Math.cos(a) * k * 12), R(hy + Math.sin(a) * k * 8 + k * k * 14), 1 + (i & 1), 1);
        }
      }
      if (act === 'scrub') for (let i = 0; i < 4; i++) {
        const k = (tt * 0.02 + i / 4) % 1;
        x.fillStyle = 'rgba(236,228,214,' + (0.6 * (1 - k)).toFixed(2) + ')'; x.fillRect(R(hx + Math.sin(i * 3 + tt * 0.05) * 6), R(hy + k * 12), 2, 2);
      }
      break;
    }
    case 'scan': {
      const [ex, ey] = cell(b.meta.mouth[0], b.meta.mouth[1]);
      if (!p.light && Math.floor(tt / 20) % 3 === 0) { x.fillStyle = 'rgba(255,42,68,.35)'; x.fillRect(R(ex - 4), R(ey - 3), 8, 6); }
      if (act === 'scan') scanBeam(x, v, p.beam, ex, ey, tt);
      break;
    }
    case 'box':
      if ((B.kind === 'busker' || B.kind === 'djbot') && act === 'play') for (let i = 0; i < 3; i++) {
        // notes rising off the instrument
        const k = (tt * 0.006 + i / 3) % 1, [mx, my] = cell(CX + (flip ? -2 : 2), 12);
        const nx = R(mx + (flip ? -1 : 1) * (4 + k * 14) + Math.sin(k * 7 + i) * 3), ny = R(my - 4 - k * 30);
        x.fillStyle = 'rgba(255,217,165,' + (0.85 * (1 - k)).toFixed(2) + ')'; x.fillRect(nx, ny, 3, 2); x.fillRect(nx + 2, ny - 6, 1, 6);
      }
      break;
    case 'ad':
      if (ps >= 3) {
        const [cx0, cy0] = cell(CX, 8), page = ADS[(B.seed + Math.floor(tt / 300)) % ADS.length];
        x.font = TXT; x.textAlign = 'center'; x.fillStyle = '#2a1a0e';
        x.fillText(page[0], R(cx0), R(cy0 - 1)); x.fillText(page[1], R(cx0), R(cy0 + 8)); x.textAlign = 'start';
      }
      break;
    case 'wreck':
      if (ps >= 3) {
        // its cardboard sign, in marker
        const [sx0, sy0] = cell(flip ? CX + 6.5 : CX - 6.5, 2);
        x.font = TXT; x.textAlign = 'center'; x.fillStyle = '#2a1a0e';
        x.fillText('NEED', R(sx0), R(sy0 - 1)); x.fillText('PARTS', R(sx0), R(sy0 + 6)); x.textAlign = 'start';
      }
      break;
    case 'flyer': {
      // the hologram flyer it projects under itself: warm, flickering, never cyan
      const [px, py] = cell(CX, 1), w = 40, h = 26, top = py + 12, fl = tt % 170 < 4 ? 0.3 : 1, page = ADS[(B.seed + 3 + Math.floor(tt / 260)) % ADS.length];
      x.fillStyle = 'rgba(255,170,90,' + (0.05 * fl).toFixed(3) + ')'; x.beginPath(); x.moveTo(px - 1, py + 2); x.lineTo(px - w / 2, top); x.lineTo(px + w / 2, top); x.lineTo(px + 1, py + 2); x.closePath(); x.fill();
      x.fillStyle = 'rgba(255,170,90,' + (0.12 * fl).toFixed(3) + ')'; x.fillRect(R(px - w / 2), R(top), w, h);
      x.fillStyle = 'rgba(255,190,110,' + (0.06 * fl).toFixed(3) + ')'; for (let yy = 2; yy < h; yy += 3) x.fillRect(R(px - w / 2), R(top + yy), w, 1);
      x.strokeStyle = 'rgba(255,190,110,' + (0.5 * fl).toFixed(2) + ')'; x.strokeRect(R(px - w / 2) + 0.5, R(top) + 0.5, w - 1, h - 1);
      x.font = TXT; x.textAlign = 'center'; x.fillStyle = 'rgba(255,217,165,' + (0.9 * fl).toFixed(2) + ')';
      x.fillText(page[0], R(px), R(top + 11)); x.fillText(page[1], R(px), R(top + 21)); x.textAlign = 'start';
      break;
    }
    case 'cargo': case 'mini':
      if (Math.floor(tt / 25) % 2) { const [lx, ly] = cell(b.meta.mouth[0], b.meta.mouth[1]); x.fillStyle = S.shape === 'cargo' ? 'rgba(255,176,48,.4)' : 'rgba(255,42,68,.35)'; x.fillRect(R(lx - 4), R(ly - 3), 8, 6); }
      break;
  }
}


/** A scan beam from the lens at (ex, ey): a faint cone down to its foot, and a bright line bouncing over it. */
function scanBeam(x: CanvasRenderingContext2D, v: View, beam: Beam | undefined, ex: number, ey: number, tt: number) {
  const o = beam ?? {}, rgb = o.rgb ?? '255,42,68', s = o.spread ?? 14, sw = Math.sin(tt * (o.rate ?? 0.05)) * (o.sweep ?? 10) + (o.lean ?? 0), foot = v.y(o.foot ?? 0);
  x.fillStyle = 'rgba(' + rgb + ',' + (o.alpha ?? 0.08) + ')';
  x.beginPath(); x.moveTo(ex - 2, ey + 3); x.lineTo(ex - s + sw, foot); x.lineTo(ex + s + sw, foot); x.lineTo(ex + 2, ey + 3); x.closePath(); x.fill();
  if (o.line ?? true) { x.fillStyle = 'rgba(' + rgb + ',.55)'; x.fillRect(Math.round(ex - s + 2 + sw), Math.round(foot - 12 - Math.abs(Math.sin(tt * 0.09)) * 30), Math.max(1, 2 * s - 4), 1); }
}

/** A person's tech lights, live over the baked sprite: AR glasses glint now and then, a wrist screen glows, an earpiece blinks. */
function techFx(x: CanvasRenderingContext2D, m: Meta, cell: (c: number, r: number) => number[], tt: number, ps: number) {
  const R = Math.round;
  if (m.eye && tt % 220 < 10) { const [ex, ey] = cell(m.eye[0], m.eye[1]); x.fillStyle = 'rgba(255,246,226,.95)'; x.fillRect(R(ex - 1), R(ey - ps / 2), 2, 2); x.fillStyle = 'rgba(255,240,210,.25)'; x.fillRect(R(ex - ps), R(ey - ps), ps * 2, ps * 2); }
  if (m.wrist) { const [wx, wy] = cell(m.wrist[0], m.wrist[1]); x.fillStyle = 'rgba(255,210,140,' + (0.16 + 0.06 * Math.sin(tt * 0.05)).toFixed(3) + ')'; x.fillRect(R(wx - ps), R(wy - ps), ps * 2, ps * 2); }
  if (m.ear && tt % 90 < 30) { const [qx, qy] = cell(m.ear[0], m.ear[1]); x.fillStyle = 'rgba(255,190,90,.35)'; x.fillRect(R(qx - ps / 2 - 1), R(qy - ps / 2 - 1), ps + 2, ps + 2); }
}

/**
 * A head-and-shoulders portrait of a seed's person, for screens (WANTED, ID cards, ads that know you):
 * drawn into the box (cx, top, w, h), clipped.
 */
export function drawPortrait(x: CanvasRenderingContext2D, seed: number, cx: number, top: number, w: number, h: number, ps = 2, look: Look = {}) {
  const full = lookFrom(seed, look), B = BODIES[full.body];
  const b = bake('P' + seed + JSON.stringify(look) + '|r' + peopleRevision(), () => human(full, 'stand', 'down'), ps, false, 0);
  const headTopRow = B.leg + B.torso + B.head + 1;
  x.save(); x.beginPath(); x.rect(cx - w / 2, top, w, h); x.clip();
  x.drawImage(b.c, Math.round(cx - CX * ps - ps / 2) - 1, Math.round(top + 3 - (H - headTopRow) * ps));
  x.restore();
}
export function drawCharacterFrame(x: CanvasRenderingContext2D, v: View, p: Character, R: Ready, ps: number, f: Frame, height: number) {


  const sx = v.sx(f.x, p.parallax ?? 1);
  if (sx < -40 || sx > v.viewW + 40) return;
  // a critter with a robot body (the drone) keeps the critter's height rule: h (or its default), no extra flight height
  const crit = R.critter, bot = R.bot, lift = f.lift ?? 0, hDraw = (p.h ?? (crit ? CRITTERS[crit].h ?? 0 : 0)) + (bot && !crit ? BOT[bot.kind].fly ?? 0 : 0) + f.bob + lift;
  const flip = f.face < 0, act = p.act ?? 'stand', tt = v.t + R.ph;
  const key = R.key + ':' + f.legs + '.' + f.arms + (f.shin !== undefined ? '~' + f.shin : '') + (f.legs === 'rest' && p.cover ? '#' + p.cover : '');
  const b = bake(key, () => (bot ? robot(bot, f.legs, f.arms) : crit ? critter(crit, f.legs, R.seed) : human(R.full!, f.legs as Legs, f.arms, f.shin, f.legs === 'rest' ? p.cover : undefined)), ps, flip, p.dim ?? 0, p.rim ?? true);
  // a glitching robot jumps a pixel or two, now and then
  const glitch = bot && (act === 'glitch' ? tt % 90 < 10 : bot.glitchy && tt % 400 < 14);
  const left = Math.round(sx - CX * ps - ps / 2) - 1 + (glitch ? ((tt * 7) % 5) - 2 : 0), topY = Math.round(v.y(hDraw)) - H * ps - 1;
  // the shadow first (sets/lighting.ts): cast along the ground by the sun (or away from a lamp at night), a contact patch always
  const fly = bot ? BOT[bot.kind].fly ?? 0 : 0, sw = ps * (bot ? 6 : crit ? 3 : 4);
  if (p.shadow === false) { /* flying against the sky, or inside a window */ }
  else if (fly) castShadow(x, v, f.x, 6, sw * 0.6, crit ? 0 : p.h ?? 0, p.parallax ?? 1, 0.6);
  else if (lift) castShadow(x, v, f.x, f.legs === 'rest' ? ps * 3 : height - (p.h ?? 0) - lift, f.legs === 'rest' ? sw * 2 : sw, hDraw - f.bob - lift, p.parallax ?? 1, p.dim ?? 0);
  else castShadow(x, v, f.x, p.act === 'sleep' || p.act === 'lie' ? ps * 3 : height - (p.h ?? 0), p.act === 'lie' ? sw * 2 : sw, hDraw - f.bob, p.parallax ?? 1, p.dim ?? 0);
  x.drawImage(b.c, left, topY);
  if (p.dim && p.dim > 0.4) return;
  // live effects, from the baked hand and mouth
  const cell = (c: number, r: number) => [left + 1 + c * ps + ps / 2, topY + 1 + (H - 1 - r) * ps + ps / 2];
  if (bot) botFx(x, v, p, bot, f, b, cell, flip, tt, glitch);
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
  if (R.full) techFx(x, b.meta, cell, tt, ps);
  if (act === 'sleep' || act === 'doze' || act === 'lie' && p.asleep) {
    const [mx, my] = cell(b.meta.mouth[0], b.meta.mouth[1]);
    for (let i = 0; i < (act === 'doze' ? 2 : 3); i++) {
      const k = ((tt * 0.01 + i / 3) % 1);
      x.font = '600 ' + (6 + i) + 'px "IBM Plex Mono", monospace'; x.fillStyle = 'rgba(255,217,165,' + (0.6 * (1 - k)) + ')';
      x.fillText('z', Math.round(mx + 3 + k * 8), Math.round(my - 6 - k * 18));
    }
  }
  if (crit === 'robogull') {
    // its red eye glows now and then; scanning, it sweeps the kit's beam down from its belly
    const [ex, ey] = cell(b.meta.mouth[0], b.meta.mouth[1]);
    if (Math.floor(tt / 20) % 3 === 0) { x.fillStyle = 'rgba(255,42,68,.35)'; x.fillRect(Math.round(ex - 3), Math.round(ey - 2), 6, 4); }
    if (act === 'scan') { const [bx, by] = cell(CX, 2); scanBeam(x, v, p.beam, bx, by, tt); }
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
