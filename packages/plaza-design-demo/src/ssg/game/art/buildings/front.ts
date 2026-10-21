/**
 * BUILDING KIT: a street front at the player's scale, every one seeded and different (Tommi,
 * 2026-10-20: the foreground houses lacked the variety of the tenements behind them). A front is
 * a wall with a skin, a grid of storeys with windows of one kind, a ground floor of bays under a
 * fascia, a roof with gear, and the retrofit a city like this grows: AC boxes, pipes, cable runs,
 * fire escapes, balconies with laundry, screens bolted on, ID scanners by the doors.
 *
 * Everything not fixed by the spec comes from its seed (`'auto'` values), so a row of fronts varies
 * by default; same spec, same front. Drawing is in the front's own frame: origin at its foot on the
 * left, x to the right, heights up (`y = -h`); only the visible storeys are drawn. The shared bodies
 * (Downtown's framed windows and bays, the Market's tenement windows and balconies, the yard's fire
 * escape, AC unit and wall textures) are in `parts.ts`.
 *
 * To add a skin, a window kind, a bay, a roof or gear: add its name to the list below, give the
 * shape generator its seeded defaults (`shapeOf`) and draw it in `paintFront`. The element fields in
 * `elements.ts` read these lists, so the editor offers the new option at once.
 */
import type { Light } from '../../world/light';
import { windowLit } from '../../world/light';
import type { View } from '../core/view';
import { box, rng } from '../core/primitives';
import { visible } from '../architecture/downtown-towers';
import { adScreen } from '../signage/screens';
import { CURTAINS, PACKS } from '../assemblies/construction';
import * as P from './parts';
import { TENANTS, seededTenant, shopWindow } from './tenants';

export const SKINS = ['brick', 'concrete', 'tenement', 'panel', 'glass'] as const;
export type Skin = typeof SKINS[number];
export const WINDOW_KINDS = ['punched', 'framed', 'curtained', 'none'] as const;
export type WindowKind = typeof WINDOW_KINDS[number];
export const BAY_KINDS = ['door', 'glass', 'shutter', 'tagged', 'sealed'] as const;
export type FrontBayKind = typeof BAY_KINDS[number];
export const ROOFS = ['flat', 'parapet', 'cornice', 'stepped', 'ledge'] as const;
export type Roof = typeof ROOFS[number];
export const GEAR = ['tank', 'vent', 'dish', 'ac'] as const;
export type Gear = typeof GEAR[number];
export const SIDES = ['auto', 'none', 'left', 'right'] as const;

/** One explicit ground-floor opening: left edge, width, kind. */
/** A ground-floor bay: position, width, kind; a glass bay's tenant ('auto': from the seed) and fascia name ('' the tenant's, '-' none). */
export type BaySpec = [x: number, w: number, kind: FrontBayKind, tenant?: string, sign?: string];
/** A rectangle in the front's frame kept free of windows: [left, right, bottom, top]. */
export type Rect = [number, number, number, number];

export interface FrontSpec {
  w: number; h: number;
  /** A storey's height and the ground floor's (the shop floor under the fascia). */
  storey: number; ground: number;
  skin: Skin | 'auto';
  windows: WindowKind | 'auto';
  /** Windows per storey; 0 picks from the width. */
  columns: number;
  bays: 'auto' | BaySpec[];
  roof: Roof | 'auto';
  gear: 'auto' | Gear[];
  escape: typeof SIDES[number];
  balconies: 'auto' | 'none' | 'some';
  fascia: boolean;
  /** How much the building has been retrofitted (AC, pipes, cables, screens, scanners), 0..1. */
  density: number;
  /** Share of rooms with a light (each still follows the city clock), 0..1. */
  lit: number;
  seed: number;
  /** Areas kept clear of windows, e.g. behind a sign that has no mask of its own. */
  clear: Rect[];
}

export const FRONT_DEFAULTS: FrontSpec = {
  w: 150, h: 340, storey: 66, ground: 76, skin: 'auto', windows: 'auto', columns: 0, bays: 'auto', roof: 'auto', gear: 'auto',
  escape: 'auto', balconies: 'auto', fascia: true, density: 0.5, lit: 0.45, seed: 1, clear: [],
};

interface Cell { x: number; w: number; wh: number; sill: number; light: number; state: number; col: string; ac: boolean; phase: number; seed: number; plant: boolean }
interface Shape {
  skin: Skin; windows: WindowKind; roof: Roof; fill: string; storeys: number; setback: number;
  rows: Cell[][]; bays: { x: number; w: number; kind: FrontBayKind; tenant?: string; sign?: string }[];
  escape: { x: number; w: number } | null; balconies: ({ x: number; plants: boolean } | null)[];
  pipes: number[]; conduit: { h: number; riser: number; top: number; n: number } | null;
  screens: { x: number; h: number; w: number; tall: number; seed: number }[]; scanners: [number, number][];
  gear: { kind: Gear; x: number; size: number }[]; laundry: string[]; patches: [number, number][]; stains: [number, number, number][];
  tags: number[]; mullion: number; seamX: number[];
}

const pick = <T,>(r: () => number, a: readonly T[]) => a[Math.floor(r() * a.length)];
const hex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
/** Dark wall colours by skin: one family each, nudged by the seed so neighbours differ. */
const FILLS: Record<Skin, [number, number, number]> = { brick: [24, 10, 6], concrete: [18, 16, 14], tenement: [22, 14, 9], panel: [15, 14, 19], glass: [8, 8, 13] };
const tone = (skin: Skin, r: () => number) => { const [a, b, c] = FILLS[skin], d = Math.round(r() * 4) - 2; return '#' + hex(a + d) + hex(b + Math.round(d / 2)) + hex(c + (r() < 0.5 ? 0 : 1)); };

const SHAPES = new Map<string, Shape>();
/** The seeded layout of a front; cached by its spec. */
export function shapeOf(f: FrontSpec): Shape {
  const key = JSON.stringify(f);
  const had = SHAPES.get(key); if (had) return had;
  const r = rng((f.seed * 7919 + 13) % 233280), d = Math.max(0, Math.min(1, f.density));
  const skin: Skin = f.skin === 'auto' ? pick(r, SKINS) : f.skin;
  const windows: WindowKind = f.windows !== 'auto' ? f.windows
    : skin === 'glass' ? 'none' : skin === 'tenement' ? 'curtained' : skin === 'panel' ? 'punched'
    : skin === 'brick' ? (r() < 0.6 ? 'framed' : 'curtained') : (r() < 0.5 ? 'punched' : 'framed');
  const roof: Roof = f.roof !== 'auto' ? f.roof
    : skin === 'brick' ? (r() < 0.6 ? 'cornice' : 'parapet') : skin === 'tenement' ? (r() < 0.5 ? 'parapet' : 'flat')
    : skin === 'glass' ? (r() < 0.6 ? 'stepped' : 'flat') : skin === 'panel' ? 'flat' : pick(r, ['flat', 'parapet', 'stepped'] as const);
  const fill = tone(skin, r), storeys = Math.max(0, Math.floor((f.h - f.ground) / f.storey));
  const setback = roof === 'stepped' && storeys > 1 && f.w > 70 ? Math.round(f.w * (0.1 + r() * 0.08)) : 0;
  // the window grid: one size per building, an even or paired rhythm, centred
  const ww = windows === 'framed' ? 14 : windows === 'curtained' ? 14 + Math.round(r() * 8) : 12 + Math.round(r() * 6);
  const wh = windows === 'framed' ? 28 : windows === 'curtained' ? Math.max(22, Math.min(44, f.storey - 24 - Math.round(r() * 6))) : Math.max(20, Math.min(34, f.storey - 30 + Math.round(r() * 8)));
  const sill = Math.round((f.storey - wh) * (0.36 + r() * 0.1));
  const gap = 10 + Math.round(r() * 12), paired = skin !== 'glass' && r() < 0.3, margin = 8 + Math.round(r() * 6);
  const xs: number[] = [];
  if (windows !== 'none') {
    const step = (i: number) => paired ? (i % 2 ? gap + 8 : 5) : gap;
    for (let x = 0, i = 0; ; i++) { xs.push(x); x += ww + step(i); if (x + ww > f.w - 2 * margin) break; }
    if (f.columns > 0) xs.length = Math.min(xs.length, f.columns);
    const span = xs[xs.length - 1] + ww, off = Math.round((f.w - span) / 2);
    for (let i = 0; i < xs.length; i++) xs[i] += off;
  }
  const rows: Cell[][] = [];
  for (let s = 0; s < storeys; s++) rows.push(xs.map((x, c) => {
    const on = r() < f.lit, q = r();
    return { x, w: ww, wh, sill, light: on ? (q < 0.12 ? 1 : q) : -1, state: on ? (q < 0.45 ? 1 : q < 0.62 ? 2 : q < 0.74 ? 3 : 4) : 0, col: pick(r, CURTAINS),
      ac: skin !== 'glass' && r() < 0.06 + 0.3 * d, phase: r() * 100, seed: f.seed * 1009 + s * 61 + c * 7, plant: r() < 0.05 + 0.1 * d };
  }));
  // the ground floor: explicit bays, or a seeded shop/door layout
  let bays: Shape['bays'];
  if (f.bays !== 'auto') bays = f.bays.map(([x, w, kind, tenant, sign], i) => ({ x, w, kind, tenant: kind === 'glass' ? (!tenant || tenant === 'auto' ? seededTenant(f.seed * 31 + i) : tenant) : undefined, sign }));
  else {
    const kinds: FrontBayKind[] = f.w < 70 ? ['door'] : f.w < 120 ? pick(r, [['glass', 'door'], ['door', 'shutter'], ['shutter', 'door'], ['door', 'glass']] as FrontBayKind[][])
      : pick(r, [['glass', 'door', 'glass'], ['glass', 'door'], ['shutter', 'door', 'glass'], ['door', 'glass'], ['tagged', 'door', 'shutter'], ['glass', 'glass', 'door']] as FrontBayKind[][]);
    const doors = kinds.filter(k => k === 'door').length, space = f.w - 16 - 12 * (kinds.length - 1) - doors * 24, other = Math.max(20, Math.floor(space / Math.max(1, kinds.length - doors)));
    let x = 8; bays = [];
    for (const kind of kinds) { const w = kind === 'door' ? 24 : Math.min(other, 70); if (x + w > f.w - 6) break; bays.push({ x, w, kind: kind === 'shutter' && r() < 0.3 ? 'tagged' : kind, ...(kind === 'glass' ? { tenant: seededTenant(f.seed * 31 + bays.length) } : {}) }); x += w + 12; }
  }
  const scanners: [number, number][] = [];
  for (const b of bays) if ((b.kind === 'door' || b.kind === 'sealed') && r() < 0.25 + 0.5 * d) scanners.push([b.x + b.w + 6 < f.w - 4 ? b.x + b.w + 6 : b.x - 7, 36]);
  // retrofit and attachments
  const tall = storeys >= 2, fe = f.escape === 'auto' ? (tall && f.w >= 80 && skin !== 'glass' && skin !== 'panel' && r() < 0.2 + 0.45 * d ? (r() < 0.5 ? 'left' : 'right') : 'none') : f.escape;
  const ew = Math.min(88, Math.round(f.w * 0.55));
  const escape = fe === 'left' || fe === 'right' ? { x: fe === 'left' ? 6 : f.w - ew - 6, w: ew } : null;
  const wantBalconies = f.balconies === 'some' || (f.balconies === 'auto' && (skin === 'tenement' || skin === 'panel' || (skin === 'brick' && r() < 0.3)));
  const balconies = rows.map(() => wantBalconies && f.w >= 60 && r() < 0.22 + 0.25 * d ? { x: Math.round(4 + r() * (f.w - 54)), plants: r() < 0.4 } : null);
  const pipes: number[] = [];
  if (skin !== 'glass' && r() < 0.45 + 0.4 * d) pipes.push(r() < 0.5 ? 3 + Math.round(r() * 4) : f.w - 7 - Math.round(r() * 4));
  if (d > 0.6 && r() < d - 0.3) pipes.push(Math.round(f.w * (0.3 + r() * 0.4)));
  const conduit = r() < 0.25 + 0.6 * d ? { h: f.ground + 3, riser: Math.round(10 + r() * (f.w - 20)), top: f.ground + Math.round(f.storey * (0.8 + r() * 1.4)), n: 2 + Math.floor(r() * 3) } : null;
  const screens: Shape['screens'] = [];
  if (tall && r() < 0.12 + 0.45 * d) { const w = 26 + Math.round(r() * 16); screens.push({ x: Math.round(w / 2 + 6 + r() * (f.w - w - 12)), h: f.ground + Math.round(f.storey * (0.3 + r())), w, tall: 16 + Math.round(r() * 8), seed: f.seed * 3 + 1 }); }
  const gearList: Gear[] = f.gear === 'auto' ? GEAR.filter(() => r() < 0.35) : f.gear;
  const gear = gearList.map((kind, i) => ({ kind, x: Math.round(setback + 10 + (f.w - 2 * setback - 30) * ((i + 0.3 + r() * 0.4) / Math.max(1, gearList.length))), size: kind === 'tank' ? 18 + Math.round(r() * 8) : kind === 'vent' ? 10 + Math.round(r() * 8) : 6 + Math.round(r() * 3) }));
  const patches: [number, number][] = Array.from({ length: Math.round(f.w * f.h / 9000) }, () => [Math.round(r() * (f.w - 30)), f.ground + Math.round(r() * (f.h - f.ground - 20))]);
  const stains: [number, number, number][] = Array.from({ length: Math.round(f.w / 30 * (0.3 + d)) }, () => [Math.round(r() * f.w), f.ground + Math.round(r() * (f.h - f.ground)), 10 + Math.round(r() * 40)]);
  const tags = bays.length && r() < 0.2 + 0.4 * d ? [Math.round(r() * Math.max(0, f.w - 44))] : [];
  const mullion = 12 + Math.round(r() * 6), seamX: number[] = [];
  for (let x = 40 + Math.round(r() * 16); x < f.w - 6; x += 44 + Math.round(r() * 10)) seamX.push(x);
  const shape: Shape = { skin, windows, roof, fill, storeys, setback, rows, bays, escape, balconies, pipes, conduit, screens, scanners, gear, laundry: Array.from({ length: 6 }, () => pick(r, PACKS)), patches, stains, tags, mullion, seamX };
  if (SHAPES.size > 400) SHAPES.clear();
  SHAPES.set(key, shape);
  return shape;
}

/** A storey's floor height (storey 1 is the first above the shop floor). */
export const storeyFloor = (f: FrontSpec, k: number) => f.ground + (k - 1) * f.storey;
/** The top of the wall including a parapet, for bounds and the roof anchor. */
export const wallTop = (f: FrontSpec) => f.h + (shapeOf(f).roof === 'parapet' ? 10 : 0);

export interface FrontLook {
  t: number; lighting: Light;
  /** The caller's view (its frame clock and lights), for screens; positions are the front's frame. */
  view: View;
  /** Window exclusion rectangles in the front's frame (signs and devices mounted on it). */
  masks?: readonly Rect[];
  /** A lit window or screen, in the front's frame (centre x, centre height), for the scene's light layer. */
  light?: (x: number, h: number, w: number, hh: number, col: string, kind: 'window' | 'screen') => void;
}

const overlaps = (rs: readonly Rect[], x0: number, x1: number, h0: number, h1: number) => rs.some(([a, b, c, e]) => x0 < b && x1 > a && h0 < e && h1 > c);

/** Paint a front in its own frame (the canvas origin at its foot, left edge). */
export function paintFront(x: CanvasRenderingContext2D, f: FrontSpec, o: FrontLook) {
  const S = shapeOf(f), y = (h: number) => -h, [, hi] = visible(x), top = Math.min(f.h, hi + 2), w = f.w;
  const masks: Rect[] = [...(o.masks ?? []), ...f.clear, ...S.screens.map(s => [s.x - s.w / 2 - 2, s.x + s.w / 2 + 2, s.h - 2, s.h + s.tall + 6] as Rect)];
  const body = (h0: number, h1: number, l: number, rr: number) => { x.fillStyle = S.fill; x.fillRect(l, y(h1), rr - l, h1 - h0); };
  const stepAt = S.setback ? f.h - f.storey : f.h;
  // the wall, its material, its rim
  body(0, Math.min(stepAt, top), 0, w);
  if (S.setback && top > stepAt) body(stepAt, top, S.setback, w - S.setback);
  const wallTo = Math.min(stepAt, top);
  if (S.skin === 'brick') P.wallTexture(x, true, 0, w, y(wallTo), 0, S.patches.filter(([, ph]) => ph < wallTo - 16).map(([px, ph]) => [px, y(ph)] as [number, number]), [], []);
  else if (S.skin === 'concrete') { const seamY: number[] = []; for (let h = f.ground + f.storey * 2; h < wallTo; h += f.storey * 2) seamY.push(y(h)); P.wallTexture(x, false, 0, w, y(wallTo), y(f.ground), [], seamY, S.seamX); }
  if (S.skin === 'brick') for (const [px, ph] of S.patches) if (ph < wallTo - 20) { x.fillStyle = px % 3 ? 'rgba(0,0,0,.16)' : 'rgba(255,120,70,.05)'; x.fillRect(px + 4, y(ph + 8), 8 + (px % 7), 8); }
  if (S.skin === 'tenement') for (const [px, ph] of S.patches) if (ph < wallTo - 16) { x.fillStyle = px % 2 ? 'rgba(255,217,165,.05)' : 'rgba(0,0,0,.18)'; x.fillRect(px, y(ph + 14), 22 + (px % 9), 14 + (ph % 7)); }
  if (S.skin === 'panel') { x.fillStyle = 'rgba(0,0,0,.3)'; for (const sx of S.seamX) x.fillRect(sx, y(wallTo), 1, wallTo - f.ground); }
  if (S.skin === 'concrete') for (const [sx, sh, len] of S.stains) if (sh < wallTo) { x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(sx, y(sh), 3, Math.min(len * 2, sh)); }
  if (S.roof === 'ledge') P.ledgeEdge(x, 0, y(top), w, top);
  else { x.strokeStyle = 'rgba(194,65,12,.45)'; x.lineWidth = 1; x.strokeRect(0.5, y(wallTo) + 0.5, w - 1, wallTo); if (S.setback && top > stepAt) x.strokeRect(S.setback + 0.5, y(top) + 0.5, w - 2 * S.setback - 1, top - stepAt); }
  if (S.skin !== 'glass' && S.skin !== 'panel' && S.roof !== 'ledge') P.storeyBands(x, y, 0, w, f.h, top, f.ground, f.storey);
  // the storeys
  for (let s = 0; s < S.storeys; s++) {
    const floor = f.ground + s * f.storey; if (floor > top) break;
    const inset = S.setback && floor >= stepAt ? S.setback : 0, l = inset, rr = w - inset;
    if (S.skin === 'panel') { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(l + 1, y(floor + 2), rr - l - 2, 3); x.fillStyle = 'rgba(255,200,150,.1)'; x.fillRect(l + 1, y(floor + 3), rr - l - 2, 1); }
    if (S.skin === 'glass') { curtainFloor(x, o, l, rr, floor, f.storey, S.mullion, f.seed * 31 + s, f.lit, masks); continue; }
    for (const c of S.rows[s]) {
      if (c.x < l || c.x + c.w > rr) continue;
      const h0 = floor + c.sill, h1 = h0 + c.wh;
      if (h1 > top + c.wh || overlaps(masks, c.x - 1, c.x + c.w + 1, h0 - 2, h1 + 2)) continue;
      const wy = y(h1); let lit = -1;
      if (S.windows === 'framed') lit = P.framedWindow(x, c.x, wy, c.light, false, c.seed, o.t, o.lighting);
      else if (S.windows === 'punched') lit = P.punchedWindow(x, c.x, wy, c.w, c.wh, c.light, c.seed, o.t, o.lighting);
      else if (S.windows === 'curtained') {
        const state = c.state && windowLit(c.seed, o.lighting) ? c.state : 0;
        P.tenementWindow(x, c.x, wy, c.w, c.wh, state, c.col, 1, o.t, c.phase); lit = state ? (state === 2 ? 1 : 0.5) : -1;
      }
      if (S.skin === 'brick' && S.windows !== 'none') { x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(c.x - 2, wy - 4, c.w + 4, 3); }
      if (S.skin === 'concrete' && c.phase > 70) { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(c.x + 2, y(h0) + 2, 2, Math.round(c.phase - 60)); }
      if (lit >= 0) o.light?.(c.x + c.w / 2, (h0 + h1) / 2, c.w - 2, c.wh - 2, lit >= 1 ? '150,170,220' : '255,150,70', 'window');
      if (c.ac) P.acUnit(x, y, c.x + c.w / 2, h0 - 14);
      else if (c.plant) P.planter(x, c.x - 1, y(h0) - 1, c.w + 2, c.seed);
    }
    const b = S.balconies[s];
    if (b && floor > f.ground && floor < top) {
      P.laundryBalcony(x, b.x, y(floor) - 2, 1, S.laundry, s);
      if (b.plants) P.planter(x, b.x + 30, y(floor) - 3, 12, s);
    }
  }
  for (const [sx, sh, len] of S.stains) if (sh < top) { x.fillStyle = 'rgba(0,0,0,.14)'; x.fillRect(sx, y(sh), 1, Math.min(len, sh)); }
  // the ground floor: fascia, openings, tags, scanners
  if (f.fascia && S.roof !== 'ledge' && f.ground < top) P.fascia(x, y, 0, w, f.ground);
  for (const bay of S.bays) {
    if (bay.kind === 'tagged') { P.bay(x, y, bay.x, bay.w, 'shutter'); P.tag(x, y, bay.x + Math.max(0, (bay.w - 44) / 2) - 4, 8, 1.6); }
    else if (bay.kind === 'glass' && bay.tenant) {
      // a rented shop: its interior, awning and its name on the fascia
      const T = TENANTS[bay.tenant] ?? TENANTS.empty, text = bay.sign === '-' ? '' : bay.sign || T.sign;
      shopWindow(x, y, bay.x, bay.w, bay.tenant, o.t, f.seed * 13 + bay.x, f.fascia && S.roof !== 'ledge' ? { text, fascia: f.ground - 6 } : undefined);
      if (T.lit) o.light?.(bay.x + bay.w / 2, 30, bay.w - 4, 46, T.col, 'window');
    }
    else P.bay(x, y, bay.x, bay.w, bay.kind);
  }
  for (const tx of S.tags) if (!S.bays.some(b => tx + 44 > b.x && tx < b.x + b.w)) P.tag(x, y, tx, 4, 1.4);
  for (const [cx, ch] of S.scanners) P.doorScanner(x, cx, y(ch), o.t, cx * 7);
  // retrofit
  for (const px of S.pipes) P.wallPipe(x, px, y(Math.min(top, f.h)), y(0));
  if (S.conduit && S.conduit.h < top) P.conduit(x, 2, w - 2, y(S.conduit.h), S.conduit.n, 26, S.conduit.riser, y(Math.min(S.conduit.top, top)), f.seed);
  if (S.escape && S.storeys >= 2) { const e = S.escape; P.fireEscape(x, dx => e.x + dx, y, e.w, f.ground + 10, f.storey, y(Math.min(f.h - 8, top + f.storey)), e.w - 7); }
  for (const s of S.screens) if (s.h < top) {
    adScreen(x, o.view, { x: s.x, h: s.h, w: s.w, tall: s.tall, mount: 'wall', seed: s.seed, phase: s.seed * 13 });
    o.light?.(s.x, s.h + s.tall / 2, s.w, s.tall, '255,136,0', 'screen');
  }
  // the roof and its gear, when it is in view
  if (f.h <= hi + 40) roofOf(x, f, S, y);
}

function roofOf(x: CanvasRenderingContext2D, f: FrontSpec, S: Shape, y: (h: number) => number) {
  const w = f.w, l = S.setback, rr = w - S.setback, top = y(f.h);
  for (const g of S.gear) {
    if (g.kind === 'tank') P.roofTank(x, g.x, top, g.size, S.fill);
    else if (g.kind === 'vent') P.roofVent(x, g.x, top, g.size, S.fill);
    else if (g.kind === 'dish') P.roofDish(x, g.x, top, g.size, g.x < w / 2 ? -1 : 1, S.fill);
    else P.acUnit(x, y, g.x, f.h);
  }
  if (S.roof === 'parapet') {
    box(x, l, top - 10, rr - l, 10, S.fill, 'rgba(194,65,12,.45)');
    x.fillStyle = 'rgba(194,65,12,.6)'; x.fillRect(l - 1, top - 11, rr - l + 2, 2);
    x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(rr - 14, top - 3, 4, 2);
  } else if (S.roof === 'cornice') {
    P.cornice(x, l, top, rr - l);
    x.fillStyle = 'rgba(194,65,12,.3)'; for (let k = l + 2; k < rr - 2; k += 6) x.fillRect(k, top + 5, 2, 2);
  } else if (S.roof !== 'ledge') {
    x.fillStyle = '#140a05'; x.fillRect(l - 1, top, rr - l + 2, 2); x.fillStyle = 'rgba(194,65,12,.55)'; x.fillRect(l - 1, top, rr - l + 2, 1);
    if (S.setback) { const st = y(f.h - f.storey); x.fillStyle = '#140a05'; x.fillRect(-1, st, w + 2, 2); x.fillStyle = 'rgba(194,65,12,.55)'; x.fillRect(-1, st, w + 2, 1); }
  }
}

/** The glass skin's floor: the curtain wall's tint, mullions, a dark spandrel, the floor lit or not (on the clock). */
function curtainFloor(x: CanvasRenderingContext2D, o: FrontLook, l: number, rr: number, floor: number, st: number, pitch: number, seed: number, lit: number, masks: readonly Rect[]) {
  const y = (h: number) => -h, g0 = floor + st * 0.22, g1 = floor + st * 0.9, h = g1 - g0;
  const on = (seed * 9301 + 49297) % 233280 / 233280 < lit && windowLit(seed, o.lighting);
  x.fillStyle = on ? 'rgba(255,190,120,.16)' : 'rgba(110,90,150,.12)'; x.fillRect(l + 2, y(g1), rr - l - 4, h);
  if (on) { x.fillStyle = 'rgba(40,20,20,.35)'; x.fillRect(l + 2, y(g1), rr - l - 4, Math.round(h * 0.25)); }
  x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(l + 1, y(g0), rr - l - 2, Math.round(st * 0.22));
  x.fillStyle = 'rgba(255,200,170,.16)'; for (let k = l + pitch; k < rr - 4; k += pitch) x.fillRect(k, y(g1), 1, h);
  x.fillStyle = 'rgba(255,160,110,.07)'; x.beginPath(); x.moveTo(l + (rr - l) * 0.2, y(g1)); x.lineTo(l + (rr - l) * 0.34, y(g1)); x.lineTo(l + (rr - l) * 0.14, y(g0)); x.lineTo(l + 2, y(g0)); x.closePath(); x.fill();
  for (const [a, b, c, e] of masks) if (c < g1 && e > g0) { x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(Math.max(l, a), y(Math.min(g1, e)), Math.min(rr, b) - Math.max(l, a), Math.min(g1, e) - Math.max(g0, c)); }
  if (on) o.light?.((l + rr) / 2, (g0 + g1) / 2, rr - l - 4, h, '255,190,120', 'window');
}

/** Anchor points other pieces attach to: the roof, the ground, the fascia, each storey, each bay. */
export function frontAnchors(f: FrontSpec) {
  const S = shapeOf(f), out: Record<string, { x: number; h: number; role: 'surface' | 'mount' | 'entrance' | 'origin' }> = {
    origin: { x: 0, h: 0, role: 'origin' }, top: { x: 0, h: f.h, role: 'surface' }, right: { x: f.w, h: 0, role: 'mount' }, topCenter: { x: f.w / 2, h: f.h, role: 'surface' },
    roof: { x: f.w / 2, h: f.h, role: 'surface' }, ground: { x: f.w / 2, h: 0, role: 'surface' }, fascia: { x: f.w / 2, h: f.ground - 6, role: 'mount' },
  };
  for (let k = 1; k <= S.storeys; k++) out['storey' + k] = { x: f.w / 2, h: storeyFloor(f, k), role: 'mount' };
  S.bays.forEach((b, i) => { out['bay' + i] = { x: b.x + b.w / 2, h: 0, role: 'entrance' }; });
  return out;
}
