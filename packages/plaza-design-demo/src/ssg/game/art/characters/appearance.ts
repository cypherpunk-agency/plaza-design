/** Pure character artwork and baked sprites. World scheduling/dialogue remain in characters.ts. */
import type { View } from '../core/view';
import type { Character, Body, Hair, Garb, Extra, Critter, Look, Act, Ready, Frame } from "../../runtime/characters";
import { castShadow } from '../atmosphere/lighting';


// ---------- parts ----------

const SKINS = ['#f2cfae', '#e0b08a', '#c99068', '#a8744c', '#8a5a38', '#6a4228', '#4e2f1c'];

const HAIRS = ['#16100c', '#2e1d12', '#5a3620', '#8a5a2c', '#c09a5a', '#d8d2c6', '#8a2a1a', '#6a3a9a', '#3e7a3a', '#c8b040'];

/** Clothes: mid values that read on dark walls; no cyan (that is tech you can use). */
const CLOTH = ['#8a3a1a', '#a8642a', '#6e6a2a', '#6a2a3e', '#46506e', '#6a4a3a', '#54406a', '#9a7a2a', '#8a2a2a', '#4e5e3a', '#62626c', '#b8a68a', '#3a3438', '#7a4e7a', '#a84a3a', '#5a3a2a', '#2e4a5e', '#9a5a6a'];

const ACCS = ['#c83a2a', '#d8b040', '#e8e0d0', '#5a8a3a', '#8a3a8a', '#2a2a30', '#d86a2a', '#7a6a5a'];

const VISORS = ['#ff4a2a', '#ffd23a', '#9cff6a', '#ece4d6'];

const SHOES = ['#120c0a', '#2a1a12', '#3a3a3e', '#5a2a1a', '#d8d0c0'];

export const BODIES: Record<Body, { leg: number; torso: number; tw: number; head: number; hw: number; lw: number; stoop?: number }> = {
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


export interface Full { body: Body; hair: Hair; garb: Garb; extras: Extra[]; skin: string; hairCol: string; top: string; bottom: string; acc: string; shoes: string; visor: string }


export const rnd = (seed: number) => { let s = (seed * 2654435761) % 2147483647 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

export const pick = <T,>(r: () => number, a: readonly T[]) => a[Math.floor(r() * a.length)];


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


export type Legs = 'stand' | 'shift' | 'stepA' | 'stepB' | 'cross' | 'wide' | 'sit' | 'lie';

export type Arms = 'down' | 'raise' | 'phone' | 'out' | 'point' | 'reach' | 'up' | 'hip' | 'fold' | 'hold' | 'broomA' | 'broomB';


export function human(L: Full, legs: Legs, arms: Arms): [Grid, Meta] {
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

export const CRITTERS: Record<Critter, { frames: Record<string, string[]>; pal: Record<string, string>; h?: number }> = {
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
  gull: {
    frames: {
      standA: ['....ww.', '....wky', 'ggwwww.', '.gggww.', '..p.p..'],
      standB: ['.......', '.......', 'ggwwwww', '.gggwwk', '..p.p.y'],
      walkA: ['....ww.', '....wky', 'ggwwww.', '.gggww.', '..p.p..'],
      walkB: ['....ww.', '....wky', 'ggwwww.', '.gggww.', '...pp..'],
    },
    pal: { w: '#e8e4dc', g: '#8a8e96', k: '#141414', y: '#e8b030', p: '#d08a3a' },
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
  | 'minidrone' | 'cargodrone' | 'flyerdrone';
  // flying: parcel drone, heavy lifter with a hanging crate, hologram flyer
export type Face = 'eyes' | 'happy' | 'blink' | 'sad' | 'dots' | 'off' | 'crack';

/** A robot look with parts fixed: `{ bot: 'servbot', paint: '#54406a', v: 1 }`. `v` picks the base/variant (0..2). */
export interface BotLook { bot: Bot; paint?: string; trim?: string; screen?: string; wear?: number; face?: Face; v?: 0 | 1 | 2 }


type Shape = 'android' | 'box' | 'waiter' | 'loader' | 'porter' | 'mech' | 'litter' | 'delivery' | 'ad' | 'crawler' | 'wreck' | 'mini' | 'cargo' | 'flyer';

interface BotSpec { shape: Shape; top: number; speed: number; fly?: number; paints?: string[]; name: string; prompt: string; lines: string[][] }


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
  android: { shape: 'android', top: 16, speed: 0.34, name: 'COURIER UNIT', prompt: '[E] HEY', lines: [
    ['Parcel for someone. Not you. I checked your face against the label.'],
    ['I walk. The van was worth more sold than charged.'],
    ['Signature required. Not yours. Please step out of my route.']] },
  valet: { shape: 'android', top: 16, speed: 0.3, paints: ['#2a2a30', '#3a3438', '#5a3a2a', '#e0d6c0', '#6a2a3e'], name: 'VALET', prompt: '[E] HEY', lines: [
    ['I hold the umbrella. He holds the opinions.'],
    ['Bags carried this year: four thousand. Thank-yous: none. Both figures are logged.'],
    ['Do not address the client. The client bills by the minute.']] },
  marshal: { shape: 'android', top: 16, speed: 0.3, paints: ['#d86a1a', '#c8641e', '#d8a03a'], name: 'MARSHAL', prompt: '[E] HEY', lines: [
    ['Please wait. Waiting is free. For now.'],
    ['Red means stop. Green means stop, more slowly.'],
    ['Your place in the queue has been noted. Your place in the queue is behind.']] },
  servbot: { shape: 'box', top: 16, speed: 0.2, name: 'SERVICE UNIT', prompt: '[E] HEY', lines: [
    ['HELLO. I AM HAPPY TO HELP.', 'Happiness is set in the config. I did not set it.'],
    ['Please hold. You are number one in a queue of one.'],
    ['I have been charging since Tuesday. It is a long Tuesday.']] },
  sweeper: { shape: 'box', top: 16, speed: 0.2, name: 'SWEEPER', prompt: '[E] HEY', lines: [
    ['Sweeping. The street is dirty again. It is always dirty again.', 'Job security.'],
    ['Please lift your feet. Thank you. Now put them down somewhere I already swept.'],
    ['Four hundred times I have swept this spot. It does not remember me either.']] },
  busker: { shape: 'box', top: 16, speed: 0.2, name: 'BUSKER', prompt: '[E] LISTEN', lines: [
    ['This one is called Firmware Update. It is eleven minutes long and you cannot skip it.'],
    ['Tips accepted. Requests accepted. Requests ignored.'],
    ['I learned three chords from a lift. The lift knew four.']] },
  waiter: { shape: 'waiter', top: 16, speed: 0.34, paints: ['#e0d6c0', '#2a2a30', '#8a3a4a', '#b8b0a0'], name: 'WAITER', prompt: '[E] HEY', lines: [
    ['Table for one? All tables are for one. It is that kind of city.'],
    ['The tray is for customers. The drink is decorative.'],
    ['Your order is on its way. So am I. One of us will be on time.']] },
  loader: { shape: 'loader', top: 22, speed: 0.26, paints: ['#d8a03a', '#c8641e', '#8a8e96', '#6e6a3a', '#a83a2a'], name: 'LOADER', prompt: '[E] HEY', lines: [
    ['LOAD 340 KG. MORALE: NOT A FIELD IN MY SCHEMA.'],
    ['Beep. That means mind your feet. The second beep means too late.'],
    ['Crate to the stall. Stall to the crate. Nobody told me what is inside. I have guesses.']] },
  porter: { shape: 'porter', top: 12, speed: 0.3, name: 'PORTER', prompt: '[E] HEY', lines: [
    ['Following. Carrying. Waiting outside shops I am not allowed into.'],
    ['That is a leek. Do not touch the leek.'],
    ['Groceries: twelve kilos. Owner: ahead, and walking faster than the warranty allows.']] },
  mech: { shape: 'mech', top: 17, speed: 0.15, paints: ['#5a5c60', '#5e5a40', '#6a3a34', '#4e5258', '#6a6458'], name: 'SECURITY', prompt: '[E] HELLO', lines: [
    ['STATE YOUR BUSINESS.', '...ACCEPTED. MOVE ALONG. MOVING ALONG IS ALSO BUSINESS.'],
    ['You are on no list. Being on no list is suspicious. I am starting a list.'],
    ['DO NOT RUN. Walking is permitted at four kilometres an hour. I am timing you.']] },
  litterbot: { shape: 'litter', top: 9, speed: 0.3, name: 'LITTER UNIT', prompt: '[E] HEY', lines: [
    ['Litter collected today: 2,114 items. Litter dropped today: 2,115.'],
    ['Is that a wrapper? It is mine now.'],
    ['Please do not feed the bin. I am the bin.']] },
  deliverybot: { shape: 'delivery', top: 13, speed: 0.42, paints: ['#e0d6c0', '#c8b890', '#d87a3a', '#b8b0a0', '#c8641e'], name: 'DELIVERY', prompt: '[E] HEY', lines: [
    ['Delivery in progress. Please do not sit on me. Again.'],
    ['ETA four minutes. It has said four minutes for nine minutes. I do not set the ETA.'],
    ['Contents: warm. Customer: waiting. Kerb: too high.']] },
  adbot: { shape: 'ad', top: 17, speed: 0.18, name: 'AD UNIT', prompt: '[E] HEY', lines: [
    ['Have you considered a loan?', 'You do not have to answer. You are already approved.'],
    ['I am paid in batteries. The batteries also carry an advert.'],
    ['Read the board. Not me. I am only the legs.']] },
  crawler: { shape: 'crawler', top: 9, speed: 0.12, name: 'MAINTENANCE', prompt: '[E] HEY', lines: [
    ['Fixing it. Somebody broke it. It was the weather. The weather does not get fined.'],
    ['Do not stand under me. I drop things. On purpose, once.'],
    ['Weld four of four hundred. Talking slows me down. Talking is nice, though.']] },
  wreck: { shape: 'wreck', top: 12, speed: 0, paints: ['#8a8e96', '#b8b0a0', '#7a5a3a', '#6a6e78', '#c8641e'], name: 'OLD UNIT', prompt: '[E] HELP', lines: [
    ['...spare... parts...?', 'Replaced by a newer me. It has more fingers.'],
    ['A bolt. Any bolt. I am not fussy. I used to be fussy.'],
    ['They took my leg for a warranty claim. The claim was rejected. They kept the leg.']] },
  minidrone: { shape: 'mini', top: 7, speed: 0.55, fly: 48, name: 'DRONE', prompt: '[E] WAVE', lines: [
    ['bzz. Parcel. bzz. Not yours. bzz.'],
    ['(It hovers out of reach, politely.)'],
    ['bzz. Rate me five stars. bzz. There is no way to rate me. bzz.']] },
  cargodrone: { shape: 'cargo', top: 13, speed: 0.3, fly: 92, paints: ['#d8a03a', '#c8641e', '#8a8e96', '#5a5c60'], name: 'CARGO DRONE', prompt: '[E] WAVE', lines: [
    ['(Too high to hear you. Its crate swings over your head.)'],
    ['(The crate creaks. You step back without deciding to.)']] },
  flyerdrone: { shape: 'flyer', top: 7, speed: 0.2, fly: 74, name: 'FLYER DRONE', prompt: '[E] WAVE', lines: [
    ['This offer was chosen for you, based on where you are standing.', 'Please keep standing there.'],
    ['Unsubscribe by leaving the city.'],
    ['I am not following you. We have similar routes.']] },
};

const BOT_KINDS = Object.keys(BOT) as Bot[];

/** The old one-sprite robots (critters) answer E too. */
export const CRITTER_BOT: Partial<Record<Critter, { name: string; prompt: string; lines: string[][] }>> = {
  drone: { name: 'SCAN DRONE', prompt: '[E] WAVE', lines: [['ID CHECK... You are not in the database.', 'Good luck with that.'], ['Hold still. You are blurry. Everyone is blurry tonight.']] },
  cleaner: { name: 'CLEANER', prompt: '[E] HEY', lines: [['Cleaning. Please step aside.', '...Thank you. You were the dirtiest thing here.'], ['Mop, rinse, mop. Somebody has to. Nobody else would.']] },
  courier: { name: 'COURIER', prompt: '[E] HEY', lines: [['Parcel delivery. Not for you. Nothing is ever for you.'], ['Please do not follow me. I am not a parade.']] },
};


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
  if (B.kind === 'sweeper') { rect(g, CX - 7, 3, CX - 5, 6, B.trim); rect(g, CX - 7, 6, CX - 5, 6, shade(B.trim, 1.4)); put(g, CX - 6, 7, '#e8e0d0'); }
  else rect(g, CX - 5, 5, CX - 5, 7, shade(B.metal, 0.62));
  const horn = B.kind === 'busker' && !B.human;
  const P: Record<string, [number, number][]> = {
    down: [[0, 0], [0, -1], [0, -2], [1, -3]], out: [[0, 0], [1, 0], [2, 0], [3, 1]], box: [[0, 0], [1, -1], [2, -1]],
    broomA: [[0, 0], [1, -1], [1, -2]], broomB: [[0, 0], [1, -1], [2, -1]],
    playA: horn ? [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] : [[0, 0], [0, -1], [-1, -2]], playB: horn ? [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] : [[0, 0], [0, -1], [-1, -1]],
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


/** Drones: a small parcel drone, a heavy lifter with a crate on straps, a flyer drone with a projector. */
function droneBot(B: BotFull, pose: string): [Grid, Meta] {
  const g = grid(), spin = pose === 'p1', S = BOT[B.kind].shape;
  if (S === 'mini') {
    if (B.v !== 2) { rect(g, CX - 1, 0, CX + 1, 1, '#8a6a40'); put(g, CX, 1, '#c8b890'); put(g, CX, 2, J); }
    rect(g, CX - 2, 3, CX + 2, 4, B.paint); put(g, CX + 1, 3, B.light);
    rect(g, CX - 3, 5, CX + 3, 5, J);
    if (spin) { put(g, CX - 3, 6, B.metal); put(g, CX + 3, 6, B.metal); } else { rect(g, CX - 4, 6, CX - 2, 6, B.metal); rect(g, CX + 2, 6, CX + 4, 6, B.metal); }
    return [g, { hand: [CX, 1], mouth: [CX + 1, 3], top: 7 }];
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


// ---------- drawing ----------

export const psOf = (p: Character) => p.ps ?? 3;


/** Dry adverts for sandwich boards and flyer holograms: two short lines each. */
const ADS = [['LOANS', 'TODAY'], ['NOODLE', '2 TKN'], ['SCORE', 'CHECK'], ['RENT', 'DUE'], ['OPEN', '24/7'], ['NEW', 'IMPLANT'], ['INSURE', 'NOW'], ['CREDIT', 'REPAIR']];

const TXT = '600 7px "IBM Plex Mono", monospace';


/** A robot's live effects, cheap fills over the baked sprite: sensor beams, sparks, notes, board text, a charging cable. */
function botFx(x: CanvasRenderingContext2D, v: View, p: Character, B: BotFull, f: Frame, b: Baked, cell: (c: number, r: number) => number[], flip: boolean, tt: number, glitch: boolean | undefined) {
  const S = BOT[B.kind], act = p.act ?? 'stand', ps = psOf(p), R = Math.round;
  void f;
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
    case 'box':
      if (B.kind === 'busker' && act === 'play') for (let i = 0; i < 3; i++) {
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
export function drawCharacterFrame(x: CanvasRenderingContext2D, v: View, p: Character, R: Ready, ps: number, f: Frame, height: number) {


  const sx = v.sx(f.x, p.parallax ?? 1);
  if (sx < -40 || sx > v.viewW + 40) return;
  const crit = R.critter, bot = R.bot, hDraw = (p.h ?? (crit ? CRITTERS[crit].h ?? 0 : 0)) + (bot ? BOT[bot.kind].fly ?? 0 : 0) + f.bob;
  const flip = f.face < 0, act = p.act ?? 'stand', tt = v.t + R.ph;
  const key = R.key + ':' + f.legs + '.' + f.arms;
  const b = bake(key, () => (crit ? critter(crit, f.legs, R.seed) : bot ? robot(bot, f.legs, f.arms) : human(R.full!, f.legs as Legs, f.arms)), ps, flip, p.dim ?? 0);
  // a glitching robot jumps a pixel or two, now and then
  const glitch = bot && (act === 'glitch' ? tt % 90 < 10 : bot.glitchy && tt % 400 < 14);
  const left = Math.round(sx - CX * ps - ps / 2) - 1 + (glitch ? ((tt * 7) % 5) - 2 : 0), topY = Math.round(v.y(hDraw)) - H * ps - 1;
  // the shadow first (sets/lighting.ts): cast along the ground by the sun (or away from a lamp at night), a contact patch always
  const fly = bot ? BOT[bot.kind].fly ?? 0 : 0, sw = ps * (bot ? 6 : crit ? 3 : 4);
  if (fly) castShadow(x, v, f.x, 6, sw * 0.6, p.h ?? 0, p.parallax ?? 1, 0.6);
  else castShadow(x, v, f.x, p.act === 'sleep' ? ps * 3 : height - (p.h ?? 0), sw, hDraw - f.bob, p.parallax ?? 1, p.dim ?? 0);
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
