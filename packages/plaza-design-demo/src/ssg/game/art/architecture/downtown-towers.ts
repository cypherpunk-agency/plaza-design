/**
 * Set piece (ART-GUIDE §12): Downtown's towers seen from outside, for skylines and streets. Every
 * tower is seeded and different (Tommi, 2026-10-15: "the towers all look the same"):
 *
 * - **skins**: punched concrete (the old grid), a glass curtain wall (mullions, spandrels, whole office
 *   floors lit or dark, the sky's tint on the glass), stacked capsule blocks (modules with round
 *   windows, some sticking out, AC boxes), precast panel blocks with balcony bands (laundry, plants),
 *   and the old brick walk-up (framed windows, a fire escape, a cornice);
 * - **massing**: footprints and heights from the row's ranges, setbacks (the tower steps in), crowns
 *   (flat, a needle spire, stepped, a slanted cut, a lattice antenna, a lit halo band, a pyramid);
 * - **roof gear**: water tanks on legs, antennas, dishes, AC boxes, a roof garden, a taxi pad with its
 *   lights, a billboard on a frame;
 * - **age**: grime streaks and stains, a few dead windows;
 * - **signs** (every one mounted, ART-GUIDE §5): a plate, a vertical neon blade on brackets, stacked
 *   letter boxes, a scrolling LED ticker across the facade, an animated holo ad over its emitter, a
 *   rooftop billboard on its truss. Neon flickers; now and then a letter is dead. The copy is dry
 *   (Registry notices, scores, products). `signGlows` tells the caller where their colour falls, for
 *   the reflections on a wet street.
 *
 * Units: the tower's frame, origin at its foot, left edge, heights up (y = -h). `storey` (TowerLook)
 * is a storey's height in those units: 9 for the old small skylines (the library's windows), 85 for a
 * tower true to the player's scale (3.2 m; the opening glide). Every detail scales with it. Only the
 * rows on screen are drawn, so a tall tower costs what you see of it.
 * Register: sets/index.ts (`downtown-towers`).
 */

import { O, RED, rng } from '../core/primitives';
import { type Light, windowLit } from "../../world/light";

export type Skin = 'concrete' | 'glass' | 'capsule' | 'panel' | 'brick';
export type Crown = 'flat' | 'spire' | 'stepped' | 'slant' | 'antenna' | 'halo' | 'pyramid';
export type Gear = 'tank' | 'antenna' | 'dish' | 'ac' | 'garden' | 'pad' | 'billboard';
export type SignKind = 'plate' | 'blade' | 'stack' | 'ticker' | 'holo' | 'billboard';

export interface TowerSign {
  kind: SignKind;
  /** The copy: one message; a holo ad cycles messages split by `|`. */
  text: string;
  /** Its colour (rgb). */
  col: string;
  /** Height on the facade (its middle; a ticker's band; a billboard ignores it and stands on the roof). */
  h: number;
  /** Across the facade, 0 (left) .. 1 (right). */
  at?: number;
  /** A dead letter (its index), or none. */
  dead?: number;
}

export interface Tower {
  w: number;
  h: number;
  seed: number;
  /** The old roof (kept for callers that set it): a mast with a red light, a water tank, boxes, nothing. */
  roof: 'mast' | 'tank' | 'boxes' | 'none';
  /** The old single sign on a plate (callers that set it); `signs` is the new list. */
  sign?: { text: string; col: string; h: number };
  skin?: Skin;
  /** Setbacks: at this fraction of the height the tower steps in by this fraction of its width (each side). */
  steps?: [number, number][];
  crown?: Crown;
  gear?: Gear[];
  /** Balconies on the facade (panel and concrete). */
  balconies?: boolean;
  /** Age: grime streaks and stains, 0 .. 1. */
  grime?: number;
  signs?: TowerSign[];
  /** A lit shopfront at the foot (street rows). */
  shop?: boolean;
}

interface TowerAppearance {
  /** Animation clock (frames): lights blink, neon flickers, tickers scroll, holo ads cycle. `still` holds them. */
  t: number;
  still?: boolean;
  fill: string;
  /** Outline alpha (rust) and how many windows are lit (0..1) and how bright. */
  edge: number;
  lit: number;
  glow: number;
  /** Extra height drawn below the foot (screen units in this frame), so a tower never ends in mid-air. */
  below?: number;
  /** The lit windows follow the city clock (light.ts windowLit: on at dusk, off after midnight). Off: as seeded (the glide). */

  /** A storey's height in the frame's units (default 9; 85 is true to the player's scale). */
  storey?: number;
  /** Haze over a far row, 0 .. 1 (its colour mixed toward `hazeCol`). */
  haze?: number;
  hazeCol?: string;
}

export type TowerLook = TowerAppearance & ({clock:true;lighting:Light}|{clock?:false;lighting?:never});

/** Copy for the signs: dry, plain, the city's (ART-GUIDE §10). Products, services, the Registry. */
export const SIGN_COPY = {
  shop: ['NOODLES', 'PHARMACY · ID REQUIRED', 'CAPSULE HOTEL', 'PAWN', 'CREDIT 24H', 'KOBA SOY', 'LAUNDRY', 'CLINIC', 'NUTRIPASTE', 'HYDRO · WATER 40L', 'REPAIRS', 'KARAOKE', 'OPEN', 'HOTEL', 'SLEEP 8H · 40C', 'BAR'],
  registry: ['REGISTRY', 'IDENTITY CHECK AHEAD', 'SCORE 600+ WELCOME', 'VERIFIED CUSTOMERS ONLY', 'QUEUE 4', 'REGISTRY SERVICE POINT'],
  ticker: [
    'REGISTRY NOTICE · SCORES RECALCULATED AT 04:00 · UNREGISTERED PERSONS REPORT TO SECTOR 4 · ',
    'WATER RATION TODAY 40 L · CURFEW SECTOR 9 FROM 23:00 · LINE 0 RUNNING · ',
    'KOBA SOY 2.10 · NUTRIPASTE 1.40 · CREDIT RATE 31% · SCORE MEDIAN 588 · ',
  ],
  holo: ['VERIFY TODAY|SCORE 600+ · PRIORITY LANE', 'PREMIUM CITIZENSHIP|12T / MONTH', 'KOBA SOY|PROTEIN 31%', 'YOUR SCORE|IS VISIBLE TO EMPLOYERS'],
  billboard: ['REGISTRY · VERIFY TODAY', 'KASHI PHARMA', 'NUTRIPASTE · COMPLETE', 'SCORE 712 · APPROVED', 'CREDIT IN 4 MINUTES'],
};
/** Neon colours for signs (no cyan or pink: those are for things you can use, ART-GUIDE §6). */
export const NEON = ['255,136,0', '255,217,165', '255,42,68', '255,190,60', '170,130,255', '190,215,255'];

const SKINS: Skin[] = ['concrete', 'glass', 'capsule', 'panel', 'brick'];
const CROWNS: Crown[] = ['flat', 'spire', 'stepped', 'slant', 'antenna', 'halo', 'pyramid'];
const GEARS: Gear[] = ['tank', 'antenna', 'dish', 'ac', 'garden', 'pad', 'billboard'];

export interface RowOpts {
  /** A storey (TowerLook.storey): sizes the row's low buildings and the signs' heights. Default 9. */
  storey?: number;
  /** Gaps between towers, min and max. */
  gap?: [number, number];
  /** Chance of a low building (a brick walk-up of 3–6 storeys) in the row. */
  low?: number;
  /** Shopfronts at the foot (a street row). */
  shops?: boolean;
  /** How many signs a tower carries, at most (street rows: more). Default: one when `signs` are given, else none. */
  signs?: number;
  /** Skins to pick from (the building kit's rows); default the four tower skins. Low buildings stay brick. */
  skins?: readonly Skin[];
}

/** A row of towers for a stretch of skyline: widths and heights in ranges, every one varied by its seed; signs from `signs` (or the city's copy). */
export function towerRow(seed: number, n: number, w: [number, number], h: [number, number], signs: { text: string; col: string }[] = [], opt: RowOpts = {}): (Tower & { x: number })[] {
  const r = rng(seed), out: (Tower & { x: number })[] = [], st = opt.storey ?? 9, gap = opt.gap ?? [4, 22];
  let x = 0, si = 0;
  for (let i = 0; i < n; i++) {
    const low = r() < (opt.low ?? 0);
    let tw = Math.round(w[0] + r() * (w[1] - w[0])), th = Math.round(h[0] + r() * (h[1] - h[0]));
    if (low) { th = Math.round(st * (3 + Math.floor(r() * 4)) + st * 0.6); tw = Math.round(tw * (0.6 + r() * 0.4)); }
    const skin: Skin = low ? 'brick' : opt.skins ? opt.skins[Math.floor(r() * opt.skins.length)] : SKINS[Math.floor(r() * 4)];
    const roof = (['mast', 'tank', 'boxes', 'none'] as const)[Math.floor(r() * 4)];
    const t: Tower & { x: number } = { x, w: tw, h: th, seed: seed * 100 + i, roof, skin, shop: opt.shops };
    // massing: setbacks on the tall ones, a crown, gear on the roof
    if (!low && r() < 0.55) { const k = 1 + Math.floor(r() * 2); t.steps = []; for (let j = 0; j < k; j++) t.steps.push([0.45 + j * 0.2 + r() * 0.12, 0.08 + r() * 0.1]); }
    t.crown = low ? 'flat' : CROWNS[Math.floor(r() * CROWNS.length)];
    t.gear = [];
    for (let j = 0, m = 1 + Math.floor(r() * 3); j < m; j++) { const g = GEARS[Math.floor(r() * GEARS.length)]; if (!t.gear.includes(g)) t.gear.push(g); }
    t.balconies = skin === 'panel' || (skin === 'concrete' && r() < 0.4);
    t.grime = r() * (low ? 1 : 0.7);
    // signs: the caller's first, then the city's copy, in kinds that suit the tower
    t.signs = [];
    const most = opt.signs ?? (signs.length ? 1 : 0);
    for (let j = 0; j < most; j++) {
      if (r() > (j === 0 ? 0.7 : 0.45)) continue;
      const fromCaller = si < signs.length && r() < 0.6;
      const kindPick = r(), kinds: SignKind[] = low ? ['plate', 'blade', 'billboard', 'stack'] : ['blade', 'plate', 'ticker', 'holo', 'stack', 'billboard'];
      const kind = kinds[Math.floor(kindPick * kinds.length)];
      const pool = kind === 'ticker' ? SIGN_COPY.ticker : kind === 'holo' ? SIGN_COPY.holo : kind === 'billboard' ? SIGN_COPY.billboard : r() < 0.3 ? SIGN_COPY.registry : SIGN_COPY.shop;
      const c = fromCaller && kind !== 'ticker' && kind !== 'holo' ? signs[si++] : { text: pool[Math.floor(r() * pool.length)], col: NEON[Math.floor(r() * NEON.length)] };
      const hh = kind === 'ticker' ? st * (1.6 + Math.floor(r() * 3)) : kind === 'billboard' ? th : st * (1.4 + r() * 3.2);
      t.signs.push({ kind, text: c.text, col: c.text === 'OPEN' || c.text.startsWith('PHARMACY') ? '60,230,140' : c.col, h: Math.min(Math.round(hh), th - st), at: r(), dead: r() < 0.3 ? Math.floor(r() * c.text.length) : -1 });
    }
    out.push(t);
    x += tw + Math.round(gap[0] + r() * (gap[1] - gap[0]));
  }
  return out;
}

const hash = (a: number, b: number) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const hexRgb = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mixRgb = (a: string, b: string, f: number) => { const A = hexRgb(a), B = hexRgb(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * f)).join(',') + ')'; };

/** The visible band of heights in this frame (rows outside it are skipped). */
export function visible(x: CanvasRenderingContext2D): [number, number] {
  const m = x.getTransform();
  if (m.b !== 0 || m.c !== 0 || m.d === 0) return [-1e9, 1e9];
  const a = -m.f / m.d, b = (x.canvas.height - m.f) / m.d;
  return [-Math.max(a, b), -Math.min(a, b)];
}
/** Screen pixels per frame unit (for text: below a size, signs draw as bars of light). */
const pxPer = (x: CanvasRenderingContext2D) => Math.abs(x.getTransform().d) || 1;

/** The tower's massing: its segments bottom up (left, right, from, to), inset at each setback. */
function segments(b: Tower): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  let l = 0, rr = b.w, h0 = 0;
  for (const [f, inset] of b.steps ?? []) { const h1 = Math.round(b.h * f); if (h1 <= h0 + 4) continue; out.push([l, rr, h0, h1]); const d = Math.max(2, Math.round((rr - l) * inset)); l += d; rr -= d; h0 = h1; if (rr - l < 8) break; }
  out.push([l, rr, h0, b.h]);
  return out;
}

export function drawTower(x: CanvasRenderingContext2D, b: Tower, o: TowerLook) {
  const y = (h: number) => -h, below = o.below ?? 0, st = o.storey ?? 9, u = st / 9;
  const tick = o.still ? 0 : Math.floor(o.t / 90);
  const fill = o.haze ? mixRgb(o.fill, o.hazeCol ?? '#3a2440', o.haze) : o.fill;
  const [vLo, vHi] = visible(x);
  const segs = segments(b), top = segs[segs.length - 1];
  const skin = b.skin ?? 'concrete';
  // the body, segment by segment, its rim, the dawn along each top
  for (const [l, rr, h0, h1] of segs) {
    x.fillStyle = fill; x.fillRect(l, y(h1), rr - l, h1 - h0 + (h0 === 0 ? below : 0));
    x.strokeStyle = 'rgba(194,65,12,' + o.edge + ')'; x.lineWidth = Math.max(1, u * 0.6); x.strokeRect(l + 0.5, y(h1) + 0.5, rr - l - 1, h1 - h0 + (h0 === 0 ? below : 0));
    x.fillStyle = 'rgba(255,150,90,' + o.edge * 0.8 + ')'; x.fillRect(l + 1, y(h1) + 1, rr - l - 2, Math.max(1, u * 0.5));
    facade(x, b, skin, o, l, rr, Math.max(h0, vLo - st), Math.min(h1, vHi + st), h0, h1, st, u, tick);
  }
  // age: grime running down from the top and the ledges
  if (b.grime) {
    const n = Math.round(b.w / (6 * u) * b.grime);
    for (let i = 0; i < n; i++) {
      const gx = Math.round(hash(b.seed, i) * b.w), gl = Math.round((0.1 + hash(i, b.seed) * 0.4) * b.h);
      if (!inside(segs, gx, b.h - 2)) continue;
      x.fillStyle = 'rgba(0,0,0,' + (0.12 + b.grime * 0.12) + ')'; x.fillRect(gx, y(b.h), Math.max(1, Math.round(u * 0.7)), gl);
    }
  }
  if (b.shop) shopfront(x, b, o, st, u);
  if (b.h > vLo - 40 * u) { crown(x, b, top, o, st, u); for (const g of b.gear ?? []) gear(x, b, g, top, o, st, u); oldRoof(x, b, o, top); }
  if (b.sign) plate(x, b.sign.text, b.sign.col, b.w / 2, b.sign.h, b.w - 6, 7 * Math.min(u, 2), o, -1);
  for (const s of b.signs ?? []) if (s.kind === 'billboard' || (s.h > vLo - 6 * st && s.h < vHi + 6 * st)) drawSign(x, b, s, o, st, u);
}

/** Is (fx, h) inside the tower's massing? */
function inside(segs: [number, number, number, number][], fx: number, h: number) { return segs.some(([l, rr, h0, h1]) => fx >= l && fx < rr && h >= h0 && h < h1); }

/** A window's light: seeded, a few blinking; on the city clock when `clock`. */
function winOn(b: Tower, o: TowerLook, i: number, j: number, tick: number) {
  const v = hash(b.seed * 31 + i, j * 17 + 3);
  const on = o.clock ? v < o.lit * 1.6 && windowLit(b.seed * 1009 + i * 31 + j, o.lighting) : v < o.lit || (v < o.lit + 0.03 && (tick + i + j) % 5 === 0);
  return on ? v : -1;
}
const warm = (v: number, o: TowerLook, a = 1) => 'rgba(255,' + (v < o.lit * 0.3 ? '217,165' : '170,90') + ',' + Math.min(1, o.glow * (0.55 + v) * a).toFixed(3) + ')';

/** The facade of one segment between heights lo and hi (only the visible rows). */
function facade(x: CanvasRenderingContext2D, b: Tower, skin: Skin, o: TowerLook, l: number, rr: number, lo: number, hi: number, h0: number, h1: number, st: number, u: number, tick: number) {
  const y = (h: number) => -h;
  if (hi <= lo) return;
  const w = rr - l;
  if (skin === 'glass') {
    // the curtain wall: the sky's tint, mullions, a spandrel each floor, whole floors lit or dark
    const g = x.createLinearGradient(0, y(h1), 0, y(h0)); g.addColorStop(0, 'rgba(120,90,150,.22)'); g.addColorStop(1, 'rgba(40,30,60,.1)');
    x.fillStyle = g; x.fillRect(l + 1, y(hi), w - 2, hi - lo);
    const f0 = Math.max(0, Math.floor((lo - h0) / st)), f1 = Math.ceil((hi - h0) / st);
    for (let f = f0; f < f1; f++) {
      const fh = h0 + f * st; if (fh + st > h1) break;
      const v = hash(b.seed + 7, f), lit = o.clock ? v < o.lit * 1.4 && windowLit(b.seed * 1009 + f * 31, o.lighting) : v < o.lit * 1.8;
      if (lit) { x.fillStyle = warm(v * 0.5, o, 0.55); x.fillRect(l + 2, y(fh + st - st * 0.2), w - 4, st * 0.62); }
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(l + 1, y(fh + st * 0.2), w - 2, Math.max(1, st * 0.16));
    }
    x.fillStyle = 'rgba(255,200,170,.12)'; for (let k = l + 4 * u; k < rr - 2; k += 4.5 * u) x.fillRect(Math.round(k), y(hi), Math.max(1, Math.round(u * 0.4)), hi - lo);
    // the dawn sliding down the glass
    x.fillStyle = 'rgba(255,160,110,.08)'; x.beginPath(); x.moveTo(l + w * 0.2, y(h1)); x.lineTo(l + w * 0.45, y(h1)); x.lineTo(l + w * 0.1, y(h0)); x.lineTo(l, y(h0)); x.closePath(); x.fill();
    return;
  }
  if (skin === 'capsule') {
    // stacked capsule modules, each with its round window and an AC box; columns offset, some sticking out
    const mw = 8 * u, mh = 7 * u, cols = Math.max(1, Math.floor((w - 2 * u) / mw));
    const r0 = Math.max(0, Math.floor((lo - h0) / mh)), r1 = Math.ceil((hi - h0) / mh);
    for (let c = 0; c < cols; c++) for (let rr2 = r0; rr2 < r1; rr2++) {
      const mh0 = h0 + rr2 * mh + (c % 2) * mh * 0.5; if (mh0 + mh > h1 - u) continue;
      const mx = l + u + c * mw, out = hash(b.seed + c, rr2) < 0.12 ? u : 0;
      x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(Math.round(mx - out), y(mh0 + mh), Math.round(mw - u * 0.6), Math.max(1, Math.round(u * 0.5)));
      if (out) { x.fillStyle = o.fill; x.fillRect(Math.round(mx - out), y(mh0 + mh - u * 0.5), Math.round(mw), Math.round(mh - u)); }
      const on = winOn(b, o, c, rr2, tick);
      x.fillStyle = on >= 0 ? warm(on, o) : 'rgba(10,6,14,.6)';
      x.beginPath(); x.arc(mx + mw * 0.42 - out, y(mh0 + mh * 0.55), Math.max(0.8, u * 1.5), 0, 7); x.fill();
      if (hash(c, b.seed + rr2) < 0.3) { x.fillStyle = 'rgba(80,70,80,.6)'; x.fillRect(Math.round(mx + mw * 0.65 - out), y(mh0 + mh * 0.35), Math.max(1, Math.round(u * 1.6)), Math.max(1, Math.round(u * 1.4))); }
    }
    return;
  }
  // the punched grid (concrete, panel, brick): windows on a bay pitch, a floor each storey
  const brick = skin === 'brick', panel = skin === 'panel';
  const px = brick ? 9 * u : 7 * u, ww = brick ? 4 * u : 3 * u, wh = brick ? 5 * u : 4 * u;
  const cols = Math.max(1, Math.floor((w - 4 * u) / px)), off = l + (w - cols * px) / 2 + (px - ww) / 2;
  const r0 = Math.max(0, Math.floor((lo - h0) / st)), r1 = Math.ceil((hi - h0) / st);
  for (let f = r0; f < r1; f++) {
    const fh = h0 + f * st + st * 0.35; if (fh + wh > h1 - u) continue;
    if (panel || b.balconies) {
      // a balcony band: the slab's edge, a railing; laundry, a plant, a chair now and then
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(l + 1, y(fh - st * 0.12), w - 2, Math.max(1, u * 0.7));
      x.fillStyle = 'rgba(255,200,150,.14)'; x.fillRect(l + 1, y(fh + st * 0.12), w - 2, Math.max(1, u * 0.4));
      if (hash(b.seed, f) < 0.4) { const lx = l + hash(f, b.seed) * (w - 8 * u); x.fillStyle = ['rgba(200,190,170,.5)', 'rgba(170,60,60,.5)', 'rgba(60,90,150,.5)'][f % 3]; for (let k = 0; k < 3; k++) x.fillRect(Math.round(lx + k * 2 * u), y(fh + st * 0.08), Math.max(1, Math.round(u * 1.2)), Math.max(1, Math.round(u * 2))); }
      if (hash(f + 3, b.seed) < 0.25) { x.fillStyle = 'rgba(60,110,60,.55)'; x.fillRect(Math.round(l + hash(f, 9) * (w - 4 * u)), y(fh + st * 0.12 + u * 1.4), Math.max(1, Math.round(u * 1.6)), Math.max(1, Math.round(u * 1.4))); }
    }
    for (let c = 0; c < cols; c++) {
      const wx = Math.round(off + c * px), on = winOn(b, o, c, f + Math.round(h0), tick);
      if (on < 0) {
        if (brick || st > 30) { x.fillStyle = 'rgba(8,4,12,.55)'; x.fillRect(wx, y(fh + wh), Math.round(ww), Math.round(wh)); }
        continue;
      }
      x.fillStyle = warm(on, o); x.fillRect(wx, y(fh + wh), Math.round(ww), Math.round(wh));
      // at true scale a lit window shows its room: a blind half down, a figure now and then
      if (st > 30) {
        if (on > o.lit * 0.6) { x.fillStyle = 'rgba(60,30,30,.35)'; x.fillRect(wx, y(fh + wh), Math.round(ww), Math.round(wh * 0.3)); }
        if (hash(c * 3, f) < 0.12) { x.fillStyle = 'rgba(30,14,20,.55)'; x.fillRect(wx + Math.round(ww * 0.5), y(fh + wh * 0.7), Math.round(ww * 0.25), Math.round(wh * 0.7)); }
      }
    }
    if (brick) { x.fillStyle = 'rgba(0,0,0,.25)'; for (let c = 0; c < cols; c++) x.fillRect(Math.round(off + c * px - u * 0.5), y(fh - u * 0.2), Math.round(ww + u), Math.max(1, Math.round(u * 0.6))); }
  }
  // the brick walk-up: a fire escape zigzag down one side, a cornice under the roof
  if (brick && hi >= h1 - st) {
    x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(l, y(h1), w, Math.max(1, Math.round(u * 1.2)));
    x.fillStyle = 'rgba(255,190,140,.18)'; x.fillRect(l - u, y(h1 - u * 1.2), w + 2 * u, Math.max(1, Math.round(u * 0.6)));
  }
  if (brick) {
    const fx = l + (hash(b.seed, 2) < 0.5 ? w * 0.12 : w * 0.62);
    x.strokeStyle = 'rgba(20,10,14,.85)'; x.lineWidth = Math.max(1, u * 0.5); x.beginPath();
    for (let f = Math.max(1, r0); f < r1; f++) { const fh = h0 + f * st; if (fh > h1 - st * 0.5) break; x.moveTo(fx, y(fh)); x.lineTo(fx + w * 0.26, y(fh)); x.moveTo(fx + (f % 2 ? 0 : w * 0.26), y(fh)); x.lineTo(fx + (f % 2 ? w * 0.26 : 0), y(fh + st)); }
    x.stroke();
  }
}

/** A shopfront at the foot: a lit window under an awning, its door. */
function shopfront(x: CanvasRenderingContext2D, b: Tower, o: TowerLook, st: number, u: number) {
  const y = (h: number) => -h, w = b.w, sh = st * 0.95;
  const col = ['#7a2a2a', '#2a4a5a', '#5a4a1a', '#3a2a4a', '#2a4a2a'][b.seed % 5];
  x.fillStyle = 'rgba(255,200,140,' + (0.35 + 0.2 * o.glow) + ')'; x.fillRect(Math.round(w * 0.06), y(sh * 0.85), Math.round(w * 0.62), Math.round(sh * 0.75));
  x.fillStyle = 'rgba(40,20,30,.5)'; for (let k = 0; k < 3; k++) x.fillRect(Math.round(w * (0.12 + k * 0.17)), y(sh * 0.6), Math.round(u * 1.5), Math.round(sh * 0.5));
  x.fillStyle = 'rgba(255,230,190,.55)'; x.fillRect(Math.round(w * 0.74), y(sh * 0.85), Math.round(w * 0.14), Math.round(sh * 0.85));
  x.fillStyle = col; x.fillRect(Math.round(w * 0.04), y(sh), Math.round(w * 0.88), Math.round(u * 1.6));
  x.fillStyle = 'rgba(0,0,0,.3)'; for (let k = Math.round(w * 0.04); k < w * 0.92; k += Math.round(u * 2)) x.fillRect(k, y(sh) + Math.round(u * 0.8), Math.max(1, Math.round(u * 0.8)), Math.max(1, Math.round(u * 0.8)));
}

/** The crown over the top segment. */
function crown(x: CanvasRenderingContext2D, b: Tower, top: [number, number, number, number], o: TowerLook, st: number, u: number) {
  const y = (h: number) => -h, [l, rr, , h] = top, w = rr - l, cx = l + w / 2, fill = o.haze ? mixRgb(o.fill, o.hazeCol ?? '#3a2440', o.haze) : o.fill;
  const blink = (ph: number) => o.still || Math.sin(o.t * 0.05 + b.seed + ph) > 0;
  x.fillStyle = fill;
  switch (b.crown) {
    case 'spire': {
      x.beginPath(); x.moveTo(cx - w * 0.12, y(h)); x.lineTo(cx, y(h + st * 3.5)); x.lineTo(cx + w * 0.12, y(h)); x.closePath(); x.fill();
      x.fillRect(Math.round(cx - u * 0.4), y(h + st * 5), Math.max(1, Math.round(u * 0.8)), Math.round(st * 1.6));
      x.fillStyle = 'rgba(' + RED + ',' + (blink(0) ? 0.95 : 0.2) + ')'; x.fillRect(Math.round(cx - u), y(h + st * 5 + u), Math.max(2, Math.round(u * 2)), Math.max(2, Math.round(u * 1.6)));
      break;
    }
    case 'stepped': x.fillRect(l + w * 0.15, y(h + st * 0.9), w * 0.7, st * 0.9); x.fillRect(l + w * 0.3, y(h + st * 1.7), w * 0.4, st * 0.8); x.fillStyle = 'rgba(255,150,90,' + o.edge * 0.7 + ')'; x.fillRect(l + w * 0.15, y(h + st * 0.9), w * 0.7, 1); break;
    case 'slant': x.beginPath(); x.moveTo(l, y(h)); x.lineTo(l, y(h + st * 1.6)); x.lineTo(rr, y(h)); x.closePath(); x.fill(); x.strokeStyle = 'rgba(255,150,90,' + o.edge + ')'; x.lineWidth = Math.max(1, u * 0.5); x.beginPath(); x.moveTo(l, y(h + st * 1.6)); x.lineTo(rr, y(h)); x.stroke(); break;
    case 'antenna': {
      const ax = Math.round(l + w * 0.7), ah = st * 4;
      x.strokeStyle = fill; x.lineWidth = Math.max(1, u * 0.7); x.beginPath(); x.moveTo(ax - u * 2, y(h)); x.lineTo(ax, y(h + ah)); x.lineTo(ax + u * 2, y(h)); for (let k = st * 0.6; k < ah; k += st * 0.6) { const half = u * 2 * (1 - k / ah); x.moveTo(ax - half, y(h + k)); x.lineTo(ax + half, y(h + k)); } x.stroke();
      x.fillStyle = 'rgba(' + RED + ',' + (blink(1) ? 0.95 : 0.2) + ')'; x.fillRect(ax - Math.max(1, u), y(h + ah + u), Math.max(2, Math.round(u * 2)), Math.max(2, Math.round(u * 1.4)));
      x.fillStyle = 'rgba(' + RED + ',' + (blink(2) ? 0.8 : 0.15) + ')'; x.fillRect(ax - Math.max(1, u), y(h + ah * 0.5), Math.max(2, Math.round(u * 1.6)), Math.max(1, Math.round(u)));
      break;
    }
    case 'halo': {
      x.fillRect(l + w * 0.1, y(h + st * 1.2), w * 0.8, st * 1.2);
      const a = 0.35 + 0.25 * (o.still ? 1 : Math.sin(o.t * 0.02 + b.seed));
      x.fillStyle = 'rgba(190,215,255,' + a.toFixed(3) + ')'; x.fillRect(l + w * 0.1, y(h + st * 0.9), w * 0.8, Math.max(1, Math.round(st * 0.18)));
      break;
    }
    case 'pyramid': x.beginPath(); x.moveTo(l + w * 0.05, y(h)); x.lineTo(cx, y(h + st * 2.2)); x.lineTo(rr - w * 0.05, y(h)); x.closePath(); x.fill(); x.fillStyle = 'rgba(255,214,150,.5)'; x.fillRect(Math.round(cx - u), y(h + st * 1.2), Math.max(1, Math.round(u * 2)), Math.max(1, Math.round(u * 2))); break;
    default: x.fillRect(l, y(h + u * 1.2), w, u * 1.2);
  }
}

/** Gear on the roof (on the top segment's roof, beside the crown). */
function gear(x: CanvasRenderingContext2D, b: Tower, g: Gear, top: [number, number, number, number], o: TowerLook, st: number, u: number) {
  const y = (h: number) => -h, [l, rr, , h] = top, w = rr - l, fill = o.haze ? mixRgb(o.fill, o.hazeCol ?? '#3a2440', o.haze) : o.fill;
  const at = (k: number) => Math.round(l + w * k);
  x.fillStyle = fill;
  if (g === 'tank') { const tx = at(0.18), tw = 10 * u; x.fillRect(tx, y(h + st * 1.4), tw, st * 0.95); x.fillRect(tx + u, y(h + st * 0.45), Math.max(1, u * 0.6), st * 0.45); x.fillRect(tx + tw - u * 1.6, y(h + st * 0.45), Math.max(1, u * 0.6), st * 0.45); x.beginPath(); x.moveTo(tx - u * 0.5, y(h + st * 1.4)); x.lineTo(tx + tw / 2, y(h + st * 1.4 + u * 3)); x.lineTo(tx + tw + u * 0.5, y(h + st * 1.4)); x.fill(); }
  else if (g === 'antenna') { for (let k = 0; k < 3; k++) x.fillRect(at(0.55 + k * 0.08), y(h + st * (1 + k * 0.5)), Math.max(1, Math.round(u * 0.5)), st * (1 + k * 0.5)); }
  else if (g === 'dish') { x.beginPath(); x.ellipse(at(0.8), y(h + u * 3), u * 3, u * 2, -0.6, 0, Math.PI); x.fill(); x.fillRect(at(0.8), y(h + u * 2), Math.max(1, Math.round(u * 0.6)), u * 2); }
  else if (g === 'ac') { for (let k = 0; k < 3; k++) { x.fillRect(at(0.08 + k * 0.12), y(h + u * 3), u * 4, u * 3); } }
  else if (g === 'garden') { x.fillStyle = 'rgba(40,70,40,.9)'; for (let k = 0; k < 4; k++) { x.beginPath(); x.arc(at(0.2 + k * 0.16), y(h + u * 2), u * (2 + (k % 2)), 0, 7); x.fill(); } }
  else if (g === 'pad') {
    // a taxi pad: a deck on the roof, its H, the edge lights
    const pw = Math.min(w * 0.6, 26 * u), px = Math.round(l + (w - pw) / 2);
    x.fillRect(px, y(h + u * 1.6), pw, u * 1.6);
    const on = o.still || Math.floor((o.t + b.seed) / 30) % 2 === 0;
    x.fillStyle = on ? 'rgba(255,190,60,.95)' : 'rgba(255,190,60,.35)'; for (let k = 0; k <= 4; k++) x.fillRect(Math.round(px + k * (pw - u) / 4), y(h + u * 2.2), Math.max(1, Math.round(u)), Math.max(1, Math.round(u * 0.6)));
  }
}

/** The old single roof (mast, tank, boxes) for towers that set it without the new massing. */
function oldRoof(x: CanvasRenderingContext2D, b: Tower, o: TowerLook, top: [number, number, number, number]) {
  if (b.crown) return;
  const y = (h: number) => -h, [l, rr, , h] = top, w = rr - l;
  if (b.roof === 'mast') {
    x.fillStyle = o.fill; x.fillRect(Math.round(l + w * 0.6), y(h + 26), 2, 26);
    const on = o.still || Math.sin(o.t * 0.05 + b.seed) > 0;
    x.fillStyle = 'rgba(' + RED + ',' + (on ? 0.9 : 0.2) + ')'; x.fillRect(Math.round(l + w * 0.6) - 1, y(h + 28), 4, 3);
  } else if (b.roof === 'tank') {
    const tx = Math.round(l + w * 0.25);
    x.fillStyle = o.fill; x.fillRect(tx, y(h + 12), 14, 10); x.fillRect(tx + 2, y(h + 2), 2, 2); x.fillRect(tx + 10, y(h + 2), 2, 2);
    x.beginPath(); x.moveTo(tx - 1, y(h + 12)); x.lineTo(tx + 7, y(h + 17)); x.lineTo(tx + 15, y(h + 12)); x.fill();
  } else if (b.roof === 'boxes') {
    x.fillStyle = o.fill; x.fillRect(l + 4, y(h + 6), 10, 6); x.fillRect(rr - 16, y(h + 8), 12, 8);
  }
}

/** Neon lettering: per-letter flicker, a dead letter, the glow. `vertical` stacks the letters. */
function neonText(x: CanvasRenderingContext2D, s: string, cx: number, cy: number, col: string, size: number, o: TowerLook, dead: number, vertical: boolean, seed: number, maxW?: number) {
  const px = pxPer(x) * size;
  if (px < 3.2) {
    // too small to read: bars of light where the letters are
    x.fillStyle = 'rgba(' + col + ',.85)';
    if (vertical) x.fillRect(Math.round(cx - size * 0.3), Math.round(cy - s.length * size * 0.55), Math.max(1, Math.round(size * 0.6)), Math.round(s.length * size * 1.1));
    else { const w = Math.min(maxW ?? 1e9, s.length * size * 0.62); x.fillRect(Math.round(cx - w / 2), Math.round(cy - size * 0.3), Math.round(w), Math.max(1, Math.round(size * 0.6))); }
    return;
  }
  x.save(); x.font = '600 ' + size + 'px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
  if (!o.still) { x.shadowColor = 'rgba(' + col + ',.85)'; x.shadowBlur = Math.min(8, size * 0.6); }
  const flick = o.still ? 1 : hash(seed, Math.floor(o.t / 7)) < 0.04 ? 0.35 : 1;
  const chars = [...s], n = chars.length;
  for (let i = 0; i < n; i++) {
    if (chars[i] === ' ') continue;
    const isDead = i === dead, a = isDead ? (o.still ? 0.12 : hash(seed + i, Math.floor(o.t / 5)) < 0.15 ? 0.7 : 0.1) : 0.95 * flick;
    x.fillStyle = 'rgba(' + col + ',' + a + ')';
    if (vertical) x.fillText(chars[i], cx, cy + (i - (n - 1) / 2) * size * 1.08);
    else { const w = Math.min(maxW ?? 1e9, n * size * 0.62) / n; x.fillText(chars[i], cx + (i - (n - 1) / 2) * w, cy); }
  }
  x.restore();
}

/** A plate: dark backing, the rim in the sign's colour, its light on the wall, two mounting bolts below. */
function plate(x: CanvasRenderingContext2D, s: string, col: string, cx: number, h: number, maxW: number, size: number, o: TowerLook, dead: number) {
  const pw = Math.min(maxW, Math.round(s.length * size * 0.64 + size * 1.4)), ph = Math.round(size * 1.8), cy = -h;
  const g = x.createRadialGradient(cx, cy, 2, cx, cy, pw * 0.8); g.addColorStop(0, 'rgba(' + col + ',.16)'); g.addColorStop(1, 'rgba(' + col + ',0)');
  x.fillStyle = g; x.fillRect(cx - pw, cy - pw * 0.6, pw * 2, pw * 1.2);
  x.fillStyle = '#0a0506'; x.fillRect(Math.round(cx - pw / 2), Math.round(cy - ph / 2), pw, ph);
  x.strokeStyle = 'rgba(' + col + ',.5)'; x.lineWidth = Math.max(1, size * 0.12); x.strokeRect(Math.round(cx - pw / 2) + 0.5, Math.round(cy - ph / 2) + 0.5, pw - 1, ph - 1);
  x.fillStyle = 'rgba(' + O + ',.3)'; x.fillRect(Math.round(cx - pw / 2 + size * 0.4), Math.round(cy + ph / 2), Math.max(1, size * 0.15), size * 0.5); x.fillRect(Math.round(cx + pw / 2 - size * 0.6), Math.round(cy + ph / 2), Math.max(1, size * 0.15), size * 0.5);
  neonText(x, s, cx, cy + 0.5, col, size, o, dead, false, s.length * 7 + h, pw - size * 0.8);
}

/** One sign of any kind on the tower. */
function drawSign(x: CanvasRenderingContext2D, b: Tower, s: TowerSign, o: TowerLook, st: number, u: number) {
  const y = (h: number) => -h, w = b.w, at = s.at ?? 0.5, seed = b.seed * 13 + s.h;
  if (s.kind === 'plate') { plate(x, s.text, s.col, Math.round(w * (0.25 + at * 0.5)), s.h, w - 4 * u, Math.max(5, st * 0.42), o, s.dead ?? -1); return; }
  if (s.kind === 'blade' || s.kind === 'stack') {
    // vertical: a blade on brackets off the facade's edge, or stacked letter boxes flush to the wall
    const size = Math.max(5, st * 0.22), n = s.text.replace(/ · /g, '·').length, len = n * size * 1.08 + size, bw = size * 1.5;
    const bx = Math.round(at < 0.5 ? w * 0.04 : w * 0.96 - bw), cy = y(s.h);
    const txt = s.text.replace(/ · /g, '·');
    const g = x.createRadialGradient(bx + bw / 2, cy, 2, bx + bw / 2, cy, len * 0.7); g.addColorStop(0, 'rgba(' + s.col + ',.18)'); g.addColorStop(1, 'rgba(' + s.col + ',0)');
    x.fillStyle = g; x.fillRect(bx - len * 0.5, cy - len * 0.7, len + bw, len * 1.4);
    if (s.kind === 'blade') {
      x.fillStyle = '#0a0506'; x.fillRect(bx, Math.round(cy - len / 2), Math.round(bw), Math.round(len));
      x.strokeStyle = 'rgba(' + s.col + ',.55)'; x.lineWidth = Math.max(1, size * 0.1); x.strokeRect(bx + 0.5, Math.round(cy - len / 2) + 0.5, Math.round(bw) - 1, Math.round(len) - 1);
      x.fillStyle = 'rgba(' + O + ',.4)'; const arm = at < 0.5 ? -size * 0.6 : bw; x.fillRect(Math.round(bx + arm), Math.round(cy - len / 2 + size * 0.4), Math.round(size * 0.6), Math.max(1, size * 0.2)); x.fillRect(Math.round(bx + arm), Math.round(cy + len / 2 - size * 0.6), Math.round(size * 0.6), Math.max(1, size * 0.2));
    } else {
      x.fillStyle = 'rgba(10,5,6,.85)'; for (let i = 0; i < n; i++) x.fillRect(bx, Math.round(cy - len / 2 + size * 0.5 + i * size * 1.08 - size * 0.48), Math.round(bw), Math.round(size * 1.0));
    }
    neonText(x, txt, bx + bw / 2, cy + size * 0.05, s.col, size, o, s.dead ?? -1, true, seed);
    return;
  }
  if (s.kind === 'ticker') {
    // an LED band across the facade: the copy scrolling right to left
    const bh = Math.max(4, st * 0.42), size = bh * 0.72, cy = y(s.h);
    x.fillStyle = '#060304'; x.fillRect(1, Math.round(cy - bh / 2), w - 2, Math.round(bh));
    x.fillStyle = 'rgba(' + s.col + ',.35)'; x.fillRect(1, Math.round(cy - bh / 2), w - 2, 1); x.fillRect(1, Math.round(cy + bh / 2) - 1, w - 2, 1);
    if (pxPer(x) * size < 3.2) { x.fillStyle = 'rgba(' + s.col + ',.6)'; for (let k = 3; k < w - 6; k += size * 1.4) if (hash(seed, Math.floor(k / size) + Math.floor((o.still ? 0 : o.t) / 6)) < 0.7) x.fillRect(Math.round(k), Math.round(cy - size * 0.25), Math.max(1, Math.round(size * 0.9)), Math.max(1, Math.round(size * 0.5))); return; }
    x.save(); x.beginPath(); x.rect(2, cy - bh / 2, w - 4, bh); x.clip();
    x.font = '600 ' + size + 'px "IBM Plex Mono", monospace'; x.textBaseline = 'middle'; x.textAlign = 'left';
    const tw = x.measureText(s.text).width, shift = o.still ? 0 : ((o.t * 0.6 * u) % tw);
    x.fillStyle = 'rgba(' + s.col + ',.95)';
    for (let k = -shift; k < w; k += tw) x.fillText(s.text, k, cy + 0.5);
    x.restore();
    return;
  }
  if (s.kind === 'holo') {
    // an emitter on a bracket, its beam up into a translucent panel; messages cycle, scanlines roll, it jitters
    const msgs = s.text.split('|'), m = o.still ? 0 : Math.floor((o.t + seed) / 220) % msgs.length, msg = msgs[m];
    const size = Math.max(5, st * 0.4), pw = Math.min(w * 0.9, msg.length * size * 0.64 + size * 2), ph = size * 2.4;
    const ex = Math.round(w * (0.2 + at * 0.6)), eh = s.h - ph * 0.9, cy = y(s.h);
    const jit = o.still ? 0 : (hash(seed, Math.floor(o.t / 3)) < 0.06 ? size * 0.3 : 0);
    x.fillStyle = '#1a1418'; x.fillRect(ex - size * 0.6, y(eh), size * 1.2, size * 0.6); x.fillRect(ex - size * 0.1, y(eh - size * 0.1), size * 0.2, size * 0.8);
    const g = x.createLinearGradient(0, y(eh), 0, cy); g.addColorStop(0, 'rgba(' + s.col + ',.35)'); g.addColorStop(1, 'rgba(' + s.col + ',0.04)');
    x.fillStyle = g; x.beginPath(); x.moveTo(ex - size * 0.3, y(eh)); x.lineTo(ex + size * 0.3, y(eh)); x.lineTo(ex + pw / 2, cy + ph / 2); x.lineTo(ex - pw / 2, cy + ph / 2); x.closePath(); x.fill();
    x.fillStyle = 'rgba(' + s.col + ',.12)'; x.fillRect(ex - pw / 2 + jit, cy - ph / 2, pw, ph);
    x.fillStyle = 'rgba(' + s.col + ',.18)'; const roll = o.still ? 0 : (o.t * 0.4) % (size * 0.6); for (let k = cy - ph / 2 + roll; k < cy + ph / 2; k += size * 0.6) x.fillRect(ex - pw / 2 + jit, k, pw, Math.max(0.5, size * 0.08));
    x.strokeStyle = 'rgba(' + s.col + ',.5)'; x.lineWidth = Math.max(0.5, size * 0.08); x.strokeRect(ex - pw / 2 + jit, cy - ph / 2, pw, ph);
    neonText(x, msg, ex + jit, cy, s.col, size, o, -1, false, seed + m, pw - size);
    return;
  }
  // a rooftop billboard: the truss legs on the roof, the lit panel, lamps on arms aimed at it
  const segs = segments(b), top = segs[segs.length - 1], tl = top[0], tr = top[1], bw = Math.min(tr - tl, Math.max(60 * u * 0.3, (tr - tl) * 0.9)), bh = st * 1.6;
  const bx = Math.round(tl + (tr - tl - bw) / 2), base = top[3] + st * 0.6;
  x.strokeStyle = 'rgba(40,30,34,1)'; x.lineWidth = Math.max(1, u * 0.6); x.beginPath();
  for (let k = 0; k <= 4; k++) { const lx = bx + k * bw / 4; x.moveTo(lx, y(top[3])); x.lineTo(lx, y(base)); if (k < 4) { x.moveTo(lx, y(top[3])); x.lineTo(lx + bw / 4, y(base)); } }
  x.stroke();
  x.fillStyle = '#0c0608'; x.fillRect(bx, y(base + bh), Math.round(bw), Math.round(bh));
  const g = x.createLinearGradient(0, y(base + bh), 0, y(base)); g.addColorStop(0, 'rgba(' + s.col + ',.28)'); g.addColorStop(1, 'rgba(' + s.col + ',.08)');
  x.fillStyle = g; x.fillRect(bx + 1, y(base + bh) + 1, Math.round(bw) - 2, Math.round(bh) - 2);
  x.strokeStyle = 'rgba(' + s.col + ',.55)'; x.strokeRect(bx + 0.5, y(base + bh) + 0.5, Math.round(bw) - 1, Math.round(bh) - 1);
  x.fillStyle = 'rgba(255,240,200,.8)'; for (let k = 0; k < 3; k++) { const lx = bx + bw * (0.2 + k * 0.3); x.fillRect(Math.round(lx), y(base + bh + u * 1.6), Math.max(1, Math.round(u * 1.4)), Math.max(1, Math.round(u * 0.6))); }
  neonText(x, s.text, bx + bw / 2, y(base + bh / 2), s.col, Math.max(5, Math.min(bh * 0.42, (bw * 0.9) / (s.text.length * 0.62))), o, s.dead ?? -1, false, seed, bw * 0.92);
}

/** Where a tower's signs throw their colour (frame x, width, rgb, strength), for the reflections on a wet street below. */
export function signGlows(b: Tower): { x: number; w: number; col: string; a: number }[] {
  const out: { x: number; w: number; col: string; a: number }[] = [];
  for (const s of b.signs ?? []) {
    const at = s.at ?? 0.5;
    if (s.kind === 'billboard') continue;
    const cx = s.kind === 'blade' || s.kind === 'stack' ? (at < 0.5 ? b.w * 0.08 : b.w * 0.92) : s.kind === 'ticker' ? b.w / 2 : b.w * (0.25 + at * 0.5);
    const w = s.kind === 'ticker' ? b.w * 0.8 : s.kind === 'blade' || s.kind === 'stack' ? b.w * 0.1 : b.w * 0.4;
    out.push({ x: cx, w, col: s.col, a: s.kind === 'holo' ? 0.5 : 1 });
  }
  if (b.sign) out.push({ x: b.w / 2, w: b.w * 0.5, col: b.sign.col, a: 1 });
  return out;
}
