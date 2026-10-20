/**
 * CONSTRUCTION KIT: pieces to build places from. Not generic: every piece takes a `seed` and varies
 * by default (size, colour within its role, wear, what is on it, a dent, a sticker, a taped note,
 * a flickering bulb), so a row of them never looks copy-pasted (ART-GUIDE §10). Same seed, same piece.
 * World coordinates; `x` is the LEFT edge unless noted, heights are up from the ground.
 *
 *   stall(x, v, { x, w, seed, sign, goods, awning, light, vendor, damage, note, back })
 *       A market stall: light, back panel (`back` draws screens on it), poles, the vendor (a Character,
 *       drawn behind the counter), awning, counter, goods on display, the sign on hangers.
 *       goods: fruit fish noodles dumplings umbrellas sims implants tech junk bottles
 *       awning: stripe scallop tarp tin none · light: bulb tube lantern none · damage 0..1
 *   booth(x, v, { x, w, seed, ... })   a narrow closed kiosk with a window hatch (same options as stall)
 *   facade(x, v, { x, w, seed, parallax, from, alpha, ground })
 *       A building front from `from` up past the top of the view: storeys of windows (lit, dark,
 *       a TV, someone at the window, blinds), AC units dripping, balconies with laundry, pipes,
 *       a fire escape, shutters at street level. Middle band by default (alpha .55, parallax .7).
 *   shelf(x, v, { x, w, h, rows, seed, stock })   shop shelving with coloured goods, price tags, gaps, a fallen pack
 *       stock: snacks drinks noodles cans household mixed
 *   fridge(x, v, { x, w, h, seed, doors })         glass-door fridge lit from inside, one tube humming
 *   clutter(x, v, { x, seed, n, kinds })           a pile on the ground: crate barrel box bag tyre
 *   bench(x, v, { x, w, seed })                    seat at h 10 (people with act 'sit' and h 10 sit on it)
 *   stool(x, v, { x, seed })                       a stool, seat at h 10
 *   lamp(x, v, { x, h, seed, dead })               a street lamp: pole, head, light cone, reflection
 *   bin(x, v, { x, seed })                         a bin, usually overflowing
 *   bollard(x, v, { x, seed })
 *   vending(x, v, { x, seed, lines })              an ambient vending machine (orange/red: NOT usable; usable ones are cyan)
 */

import type { PreparedCharacter } from "../../runtime/characters";
import { drawCharacterFrame } from '../characters/appearance';
import { type View } from '../core/view';
import { box, onScreen, O, PAPER, reflect, rng, text } from '../core/primitives';
import { taped, wallSign } from "../signage/screens";
import { escapeZigzag, laundryBalcony, sillAc, streetShutter, tenementWindow } from "../buildings/parts";

const R0 = rng;
const pick = <T,>(r: () => number, a: readonly T[]) => a[Math.floor(r() * a.length)];
const rgba = (c: string, a: number) => 'rgba(' + c + ',' + a + ')';

/** Awning stripe pairs, all in the world's warm roles (no cyan). */
const AWNINGS: [string, string][] = [
  ['rgba(255,136,0,.85)', '#1a0a03'], ['rgba(255,217,165,.75)', '#160d07'], ['rgba(200,60,40,.85)', '#170704'],
  ['rgba(214,170,60,.8)', '#1a1206'], ['rgba(120,140,70,.75)', '#0e1206'], ['rgba(150,60,90,.75)', '#14060c'],
];
const TARPS = ['#3a4a5e', '#5a3a2a', '#4a5a3a', '#6a2a2a', '#5a4a6a'];
const WOODS = ['#24130a', '#2a1a0e', '#1e140c', '#2c1c12', '#30200f'];
const FRUIT = ['#d83a2a', '#f08a2a', '#e8c83a', '#7ab83a', '#8a3a8a', '#e85a6a'];
export const PACKS = ['#d83a2a', '#f08a2a', '#e8c83a', '#5aa83a', '#3a6ad8', '#c83a8a', '#e8e0d0', '#8a3ad8', '#2a2a2a', '#d86a2a'];

export type Goods = 'fruit' | 'fish' | 'noodles' | 'dumplings' | 'umbrellas' | 'sims' | 'implants' | 'tech' | 'junk' | 'bottles';

export interface StallSpec {
  x: number; w: number; seed: number;
  sign?: string; col?: string;
  goods?: Goods;
  awning?: 'stripe' | 'scallop' | 'tarp' | 'tin' | 'none';
  light?: 'bulb' | 'tube' | 'lantern' | 'none';
  /** Actor preparation belongs to the scene controller; pass vendorPose to the painter. */
  vendor?: never;
  damage?: number;
  /** A hand-written note taped to the counter front. */
  note?: string[];
  /** Draw on the back panel (a menu screen, a price list): gets the panel's world box. */
  back?: (x: CanvasRenderingContext2D, v: View, panel: { x: number; w: number; h0: number; h1: number }) => void;
  /** Counter height (default: varies around the player's waist). */
  counter?: number;
}

interface StallShape { panel: number; awn: number; depth: number; counter: number; pole: number; pair: [string, string]; tarp: string; wood: string; dent: number; sticker: number; stickerCol: string; patch: number; tilt: number }
const SHAPES = new WeakMap<object, StallShape>();
function shapeOf(s: StallSpec): StallShape {
  let sh = SHAPES.get(s);
  if (sh) return sh;
  const r = R0(s.seed * 13 + 7);
  sh = {
    panel: 70 + Math.round(r() * 20), awn: 0, depth: 12 + Math.round(r() * 5), counter: s.counter ?? 22 + Math.round(r() * 5), pole: 3 + Math.round(r() * 2),
    pair: pick(r, AWNINGS), tarp: pick(r, TARPS), wood: pick(r, WOODS), dent: r(), sticker: r(), stickerCol: pick(r, PACKS), patch: r(), tilt: (r() - 0.5) * 0.12,
  };
  sh.awn = sh.panel + 8 + Math.round(r() * 8);
  SHAPES.set(s, sh);
  return sh;
}

/** A market stall, everything in its draw order. */
export function stall(x: CanvasRenderingContext2D, v: View, s: StallSpec, visual?: { vendorPose?: PreparedCharacter }) {
  const { sx, y, t } = v, s0 = sx(s.x), cx = s0 + s.w / 2, S = shapeOf(s), dmg = s.damage ?? 0;
  if (!onScreen(v, s0 - 30, s.w + 60)) return;
  const light = s.light ?? 'bulb', lit = light !== 'none';
  const flick = lit && dmg > 0.4 && (t + s.seed * 31) % 140 < 12 && Math.floor(t / 3) % 2 === 0;
  // its own light: on the stall and the street below
  if (lit && !flick) {
    const warm = light === 'tube' ? '235,235,220' : light === 'lantern' ? '255,90,60' : '255,190,110';
    const g = x.createRadialGradient(cx, y(S.panel - 4), 2, cx, y(30), s.w * 0.8);
    g.addColorStop(0, rgba(warm, 0.22)); g.addColorStop(1, rgba(warm, 0));
    x.fillStyle = g; x.fillRect(s0 - s.w * 0.3, y(S.awn + 4), s.w * 1.6, S.awn + 4);
  }
  // back panel, a step lighter than the wall; poles
  box(x, s0 + 4, y(S.panel), s.w - 8, S.panel - S.counter, '#2c170b', rgba(O, 0.35));
  for (let k = 12; k < S.panel - S.counter; k += 9 + (s.seed % 4)) { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(s0 + 5, y(S.panel) + k, s.w - 10, 1); }
  s.back?.(x, v, { x: s.x + 4, w: s.w - 8, h0: S.counter, h1: S.panel });
  box(x, s0 + 2, y(S.awn), S.pole, S.awn, '#2a160a', rgba(O, 0.7));
  box(x, s0 + s.w - 2 - S.pole, y(S.awn), S.pole, S.awn, '#2a160a', rgba(O, 0.7));
  if (dmg > 0.2) { x.fillStyle = 'rgba(200,190,170,.5)'; x.fillRect(s0 + 1, y(40), S.pole + 2, 4); }
  if (visual?.vendorPose !== undefined) {
    const p = visual.vendorPose;
    if (p.visible) drawCharacterFrame(x,v,p.character,p.ready,p.pixelSize,p.frame,p.height);
  }
  // goods that hang (umbrellas, fish, lanterns) under the awning
  hanging(x, v, s, S);
  // awning
  awning(x, v, s, S, dmg);
  // light fitting
  if (light === 'bulb') {
    x.strokeStyle = rgba(PAPER, 0.4); x.beginPath(); x.moveTo(cx + 0.5, y(S.awn - S.depth)); x.lineTo(cx + 0.5, y(S.awn - S.depth - 6)); x.stroke();
    x.fillStyle = flick ? 'rgba(255,217,165,.2)' : 'rgba(255,217,165,.95)'; x.fillRect(cx - 2, y(S.awn - S.depth - 6), 4, 4);
  } else if (light === 'tube') {
    x.fillStyle = flick ? 'rgba(235,235,220,.2)' : 'rgba(240,240,225,.9)'; x.fillRect(s0 + 14, y(S.awn - S.depth - 2), s.w - 28, 2);
  }
  // counter, its wear, and what is on it
  const ch = S.counter;
  box(x, s0, y(ch), s.w, ch, S.wood, rgba(O, 0.85));
  x.fillStyle = rgba(O, 0.9); x.fillRect(s0, y(ch), s.w, 2);
  for (let k = 8; k < ch - 2; k += 6) { x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(s0 + 2, y(ch) + k, s.w - 4, 1); }
  if (S.dent > 0.4) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(s0 + 8 + Math.round(S.dent * (s.w - 30)), y(ch) + 6, 7, 4); }
  if (S.sticker > 0.35) { x.fillStyle = S.stickerCol; x.globalAlpha = 0.7; x.fillRect(s0 + s.w - 14 - Math.round(S.sticker * 20), y(ch) + 5, 6, 5); x.globalAlpha = 1; }
  if (dmg > 0.5) { x.strokeStyle = 'rgba(0,0,0,.5)'; x.beginPath(); x.moveTo(s0 + s.w * 0.6, y(ch) + 2); x.lineTo(s0 + s.w * 0.66, y(ch) + 10); x.lineTo(s0 + s.w * 0.62, y(4)); x.stroke(); }
  onCounter(x, v, s, S);
  if (s.note) taped(x, v, { x: s.x + s.w * (0.3 + S.patch * 0.4), h: ch * 0.5, text: s.note, tilt: S.tilt });
  // the sign on two hangers above the awning
  if (s.sign) {
    x.strokeStyle = rgba(O, 0.6); x.beginPath(); x.moveTo(cx - 20.5, y(S.awn)); x.lineTo(cx - 20.5, y(S.awn + 8)); x.moveTo(cx + 20.5, y(S.awn)); x.lineTo(cx + 20.5, y(S.awn + 8)); x.stroke();
    wallSign(x, v, { x: s.x + s.w / 2, h: S.awn + 14, text: s.sign, col: s.col ?? O, size: 8, phase: s.seed * 37, dead: dmg > 0.3 ? Math.floor(S.dent * s.sign.length) : -1 });
  }
  if (lit && !flick) reflect(x, v, cx, '255,190,110', 0.8, 18);
}

/** Where the counter top is and how tall the stall is, for placing people and props. */
export function stallBox(s: StallSpec) { const S = shapeOf(s); return { counter: S.counter, panel: S.panel, awning: S.awn }; }

function awning(x: CanvasRenderingContext2D, v: View, s: StallSpec, S: StallShape, dmg: number) {
  const kind = s.awning ?? 'stripe';
  if (kind === 'none') { box(x, v.sx(s.x) - 2, v.y(S.awn), s.w + 4, 4, '#2a160a', rgba(O, 0.6)); return; }
  const ax = v.sx(s.x) - 8, aw = s.w + 16, top = v.y(S.awn), d = S.depth;
  if (kind === 'tin') {
    box(x, ax, top, aw, 6, '#3a3430', 'rgba(200,170,140,.5)');
    for (let k = 2; k < aw; k += 4) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(ax + k, top, 1, 6); }
    x.fillStyle = 'rgba(160,70,30,.5)'; x.fillRect(ax + aw * 0.6, top + 2, aw * 0.2, 4);
    return;
  }
  if (kind === 'tarp') {
    const sag = 3 + Math.round(dmg * 5);
    x.fillStyle = S.tarp; x.beginPath(); x.moveTo(ax, top); x.lineTo(ax + aw, top); x.lineTo(ax + aw, top + d); x.quadraticCurveTo(ax + aw / 2, top + d + sag, ax, top + d); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(255,217,165,.35)'; x.stroke();
    if (S.patch > 0.3) { x.fillStyle = 'rgba(200,180,140,.45)'; x.fillRect(ax + aw * S.patch * 0.7, top + 3, 9, 6); }
    // a rope tie to each pole
    x.strokeStyle = 'rgba(200,170,120,.5)'; x.beginPath(); x.moveTo(ax + 3, top + d); x.lineTo(ax + 10, top + d + 6); x.moveTo(ax + aw - 3, top + d); x.lineTo(ax + aw - 10, top + d + 6); x.stroke();
    return;
  }
  const [a, b] = S.pair, sw = 6 + (s.seed % 3) * 2, tear = dmg > 0.3 ? Math.floor(S.patch * (aw / sw)) : -1;
  for (let k = 0, i = 0; k < aw; k += sw, i++) {
    if (i === tear) { x.fillStyle = (i % 2 ? b : a); x.fillRect(ax + k, top, Math.min(sw, aw - k), Math.round(d * 0.4)); continue; }
    x.fillStyle = i % 2 ? b : a; x.fillRect(ax + k, top, Math.min(sw, aw - k), d);
    if (kind === 'scallop') { x.beginPath(); x.arc(ax + k + sw / 2, top + d, sw / 2, 0, Math.PI); x.fill(); }
  }
  x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(ax, top, aw, 2);
}

/** Things hung from the awning bar. */
function hanging(x: CanvasRenderingContext2D, v: View, s: StallSpec, S: StallShape) {
  const r = R0(s.seed * 5 + 1), s0 = v.sx(s.x), bar = v.y(S.awn - S.depth);
  if (s.goods === 'umbrellas') {
    for (let k = 14; k < s.w - 12; k += 9 + Math.round(r() * 4)) {
      const c = pick(r, FRUIT), len = 18 + Math.round(r() * 8), sw = Math.round(Math.sin(v.t * 0.03 + k) * 1);
      x.fillStyle = '#3a2a1a'; x.fillRect(s0 + k + sw, bar, 1, 4);
      x.fillStyle = c; x.beginPath(); x.moveTo(s0 + k - 3 + sw, bar + 4); x.lineTo(s0 + k + 4 + sw, bar + 4); x.lineTo(s0 + k + 1 + sw, bar + 4 + len); x.closePath(); x.fill();
      x.fillStyle = '#2a1a10'; x.fillRect(s0 + k + sw, bar + 4 + len, 1, 4);
    }
  } else if (s.goods === 'fish') {
    for (let k = 16; k < s.w - 16; k += 18 + Math.round(r() * 8)) {
      x.fillStyle = '#4a3a2a'; x.fillRect(s0 + k, bar, 1, 6);
      x.fillStyle = r() < 0.5 ? '#a8b0b8' : '#c88a7a'; x.beginPath(); x.ellipse(s0 + k, bar + 14, 3, 8, 0, 0, 7); x.fill();
      x.beginPath(); x.moveTo(s0 + k, bar + 21); x.lineTo(s0 + k - 3, bar + 26); x.lineTo(s0 + k + 3, bar + 26); x.fill();
    }
  } else if (s.light === 'lantern') {
    for (let k = 10; k < s.w; k += Math.max(24, s.w / 3)) {
      x.fillStyle = '#3a2010'; x.fillRect(s0 + k, bar, 1, 3);
      x.fillStyle = 'rgba(220,60,40,.9)'; x.beginPath(); x.ellipse(s0 + k + 0.5, bar + 8, 5, 6, 0, 0, 7); x.fill();
      x.fillStyle = 'rgba(255,200,120,.6)'; x.fillRect(s0 + k - 1, bar + 6, 3, 4);
    }
  }
}

/** The goods on display, by kind; every stall's layout comes from its seed. */
function onCounter(x: CanvasRenderingContext2D, v: View, s: StallSpec, S: StallShape) {
  const r = R0(s.seed * 3 + 2), s0 = v.sx(s.x), top = v.y(S.counter), t = v.t, w = s.w;
  const steam = (sx: number, sy: number, n = 3) => {
    for (let i = 0; i < n; i++) {
      const ph = t * 0.04 + i * 2 + sx; x.strokeStyle = 'rgba(255,255,255,' + (0.1 + 0.05 * Math.sin(ph)) + ')'; x.beginPath();
      for (let j = 0; j < 14; j++) { const yy = sy - j * 1.6, xx = sx + i * 5 + Math.sin(ph + j * 0.35) * 2.5; j ? x.lineTo(xx, yy) : x.moveTo(xx, yy); }
      x.stroke();
    }
  };
  switch (s.goods) {
    case 'fruit': {
      for (let k = 8; k < w - 14;) {
        const c = pick(r, FRUIT), n = 2 + Math.floor(r() * 2), sz = 3 + Math.floor(r() * 2);
        box(x, s0 + k - 2, top - 4, n * sz + 4, 4, '#5a3a1e', 'rgba(255,190,110,.4)');
        for (let row = 0; row < n; row++) for (let i = 0; i < n - row; i++) {
          x.fillStyle = c; x.fillRect(s0 + k + i * sz + row * sz / 2, top - 4 - (row + 1) * sz, sz - 1, sz - 1);
          x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(s0 + k + i * sz + row * sz / 2, top - 4 - (row + 1) * sz, 1, 1);
        }
        k += n * sz + 7;
      }
      break;
    }
    case 'fish': {
      box(x, s0 + 6, top - 3, w - 12, 3, '#c8d0d0');
      for (let k = 10; k < w - 16; k += 10 + Math.round(r() * 4)) {
        x.fillStyle = r() < 0.6 ? '#9aa4ae' : '#d0907a'; x.beginPath(); x.ellipse(s0 + k + 4, top - 5, 6, 2.5, -0.1, 0, 7); x.fill();
        x.fillStyle = '#101010'; x.fillRect(s0 + k + 8, top - 6, 1, 1);
      }
      break;
    }
    case 'noodles': {
      box(x, s0 + 10, top - 16, 22, 16, '#3a3634', 'rgba(220,200,180,.5)');
      x.fillStyle = 'rgba(255,190,110,.6)'; x.fillRect(s0 + 12, top - 16, 18, 2);
      steam(s0 + 14, top - 18, 3);
      for (let k = 40; k < w - 14; k += 13) { x.fillStyle = r() < 0.5 ? '#e8e0d0' : '#d84a2a'; x.beginPath(); x.ellipse(s0 + k + 4, top - 3, 5, 3, 0, 0, Math.PI); x.fill(); x.fillRect(s0 + k - 1, top - 4, 10, 1); }
      break;
    }
    case 'dumplings': {
      for (let k = 8; k < w - 20; k += 24 + Math.round(r() * 10)) {
        const n = 1 + Math.floor(r() * 2);
        for (let i = 0; i < n; i++) box(x, s0 + k, top - 6 - i * 6, 20, 6, '#a8824a', 'rgba(60,40,20,.6)');
        if (r() < 0.7) steam(s0 + k + 5, top - 8 - n * 6, 2);
      }
      break;
    }
    case 'umbrellas': {
      x.fillStyle = pick(r, FRUIT); x.beginPath(); x.arc(s0 + w * 0.6, top - 3, 14, Math.PI, 0); x.fill();
      x.fillStyle = 'rgba(0,0,0,.3)'; for (let i = -12; i < 14; i += 6) x.fillRect(s0 + w * 0.6 + i, top - 12, 1, 9);
      break;
    }
    case 'sims': {
      box(x, s0 + 10, top - 22, 34, 22, '#1a1410', 'rgba(255,190,110,.4)');
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { x.fillStyle = pick(r, PACKS); x.fillRect(s0 + 13 + i * 8, top - 20 + j * 7, 5, 5); }
      for (let k = 54; k < w - 14; k += 12) { box(x, s0 + k, top - 9, 7, 9, '#141418', 'rgba(220,210,200,.4)'); x.fillStyle = 'rgba(220,230,255,' + (0.3 + 0.2 * Math.sin(t * 0.05 + k)) + ')'; x.fillRect(s0 + k + 1, top - 8, 5, 5); }
      break;
    }
    case 'implants': {
      for (let k = 8; k < w - 16; k += 14 + Math.round(r() * 4)) {
        box(x, s0 + k, top - 14, 10, 14, 'rgba(120,160,110,.25)', 'rgba(220,230,210,.55)');
        x.fillStyle = 'rgba(160,190,140,.3)'; x.fillRect(s0 + k + 1, top - 9, 8, 8);
        const what = r();
        x.fillStyle = what < 0.4 ? '#e8e0d0' : what < 0.7 ? '#8e949e' : '#c86a5a';
        if (what < 0.4) { x.fillRect(s0 + k + 3, top - 8, 4, 4); x.fillStyle = '#3a2a1a'; x.fillRect(s0 + k + 4, top - 7, 2, 2); } else x.fillRect(s0 + k + 2, top - 10, 5, 7);
        box(x, s0 + k - 1, top - 16, 12, 2, '#4a3a2a');
      }
      break;
    }
    case 'tech': {
      for (let k = 8; k < w - 16; k += 12 + Math.round(r() * 8)) {
        const bh = 5 + Math.round(r() * 10); box(x, s0 + k, top - bh, 10, bh, '#26221e', 'rgba(220,200,180,.4)');
        x.fillStyle = (Math.floor(t / 30) + k) % 3 ? 'rgba(90,200,90,.9)' : 'rgba(255,42,68,.9)'; x.fillRect(s0 + k + 2, top - bh + 2, 1, 1);
      }
      x.strokeStyle = 'rgba(200,120,60,.6)'; x.beginPath(); x.ellipse(s0 + w - 16, top - 4, 6, 3, 0, 0, 7); x.stroke();
      break;
    }
    case 'bottles': {
      for (let k = 8; k < w - 10; k += 6) { const c = pick(r, PACKS), bh = 8 + Math.round(r() * 6); x.fillStyle = c; x.globalAlpha = 0.85; x.fillRect(s0 + k, top - bh, 4, bh); x.fillRect(s0 + k + 1, top - bh - 3, 2, 3); x.globalAlpha = 1; }
      break;
    }
    case 'junk':
    default: {
      for (let k = 8; k < w - 14; k += 6 + Math.round(r() * 8)) {
        const bw = 4 + Math.round(r() * 6), bh = 3 + Math.round(r() * 9);
        x.fillStyle = pick(r, ['rgba(255,217,165,.55)', 'rgba(255,136,0,.55)', 'rgba(170,140,110,.5)', 'rgba(120,120,130,.6)']); x.fillRect(s0 + k, top - bh, bw, bh);
      }
    }
  }
  // a price card on a stick, somewhere
  if (r() < 0.75) { const px = s0 + 8 + r() * (w - 30); x.fillStyle = '#3a2a1a'; x.fillRect(px + 6, top - 12, 1, 12); box(x, px, top - 18, 13, 7, '#e8dcc0'); x.fillStyle = '#a02020'; x.fillRect(px + 2, top - 15, 9, 1); }
}

/** A narrow kiosk with a window hatch: a stall with walls. */
export function booth(x: CanvasRenderingContext2D, v: View, s: StallSpec, visual?: { vendorPose?: PreparedCharacter }) {
  const S = shapeOf(s), s0 = v.sx(s.x), y = v.y;
  if (!onScreen(v, s0 - 20, s.w + 40)) return;
  box(x, s0, y(S.panel + 6), s.w, S.panel + 6, '#1e140e', rgba(O, 0.75));
  box(x, s0 + 6, y(S.panel - 6), s.w - 12, S.panel - 6 - S.counter - 4, '#0a0705', rgba(O, 0.4));
  const g = x.createLinearGradient(0, y(S.panel - 6), 0, y(S.counter));
  g.addColorStop(0, 'rgba(255,190,110,.18)'); g.addColorStop(1, 'rgba(255,190,110,.04)');
  x.fillStyle = g; x.fillRect(s0 + 6, y(S.panel - 6), s.w - 12, S.panel - 6 - S.counter - 4);
  s.back?.(x, v, { x: s.x + 6, w: s.w - 12, h0: S.counter + 4, h1: S.panel - 6 });
  if (visual?.vendorPose !== undefined) {
    x.save(); x.beginPath(); x.rect(s0 + 6, y(S.panel - 6), s.w - 12, S.panel); x.clip();
    if (visual?.vendorPose !== undefined) {
      const p = visual.vendorPose;
      if (p.visible) drawCharacterFrame(x, v, p.character, p.ready, p.pixelSize, p.frame, p.height);
    }
    x.restore();
  }
  box(x, s0 - 3, y(S.counter + 4), s.w + 6, 4, S.wood, rgba(O, 0.85));
  awning(x, v, { ...s, w: s.w }, { ...S, awn: S.panel + 10, depth: 8 }, s.damage ?? 0);
  if (s.sign) wallSign(x, v, { x: s.x + s.w / 2, h: S.panel + 22, text: s.sign, col: s.col ?? O, size: 8, phase: s.seed * 13 });
  if (s.note) taped(x, v, { x: s.x + s.w / 2, h: S.counter * 0.55, text: s.note, tilt: S.tilt });
  reflect(x, v, s0 + s.w / 2, '255,190,110', 0.6, 14);
}

// ---------- facades ----------

export interface FacadeSpec { x: number; w: number; seed: number; parallax?: number; from?: number; alpha?: number; storey?: number; ground?: boolean; fill?: string }
interface Win { x: number; w: number; state: number; col: string; ac: boolean; drip: number }
interface FacadeShape { wins: Win[][]; balcony: number[]; escape: boolean; pipe: number; shutter: number; tag: number; laundry: string[] }
/** Shapes depend only on the seed and the width; keyed by them so a fresh spec each frame still hits. */
const FACADES = new Map<string, FacadeShape>();
export const CURTAINS = ['255,170,90', '255,140,70', '255,210,150', '230,120,90', '200,160,110'];

function facadeShape(f: FacadeSpec): FacadeShape {
  const key = f.seed + ':' + f.w;
  let s = FACADES.get(key);
  if (s) return s;
  const r = R0(f.seed * 17 + 3), wins: Win[][] = [], ww = 12 + Math.round(r() * 8), gap = 10 + Math.round(r() * 14);
  for (let k = 0; k < 14; k++) {
    const row: Win[] = [];
    for (let wx = 8 + Math.round(r() * 6); wx + ww < f.w - 6; wx += ww + gap) {
      const q = r();
      // 0 dark, 1 lit, 2 tv, 3 someone at the window, 4 blinds
      row.push({ x: wx, w: ww, state: q < 0.5 ? 0 : q < 0.72 ? 1 : q < 0.8 ? 2 : q < 0.86 ? 3 : 4, col: pick(r, CURTAINS), ac: r() < 0.18, drip: r() * 100 });
    }
    wins.push(row);
  }
  s = {
    wins, balcony: Array.from({ length: 14 }, () => (r() < 0.25 ? Math.round(r() * (f.w - 50)) : -1)), escape: r() < 0.35, pipe: Math.round(r() * f.w),
    shutter: r(), tag: r(), laundry: Array.from({ length: 6 }, () => pick(r, PACKS)),
  };
  if (FACADES.size > 512) FACADES.clear();
  FACADES.set(key, s);
  return s;
}

/** A building front, from `from` (default the ground) up past the top of the view. */
export function facade(x: CanvasRenderingContext2D, v: View, f: FacadeSpec) {
  const par = f.parallax ?? 0.7, l = v.sx(f.x, par);
  if (!onScreen(v, l - 4, f.w + 8)) return;
  const S = facadeShape(f), a = f.alpha ?? 0.55, st = f.storey ?? 40, base = f.from ?? 0, y = v.y;
  x.fillStyle = f.fill ?? '#0a0503'; x.fillRect(l, 0, f.w, y(base));
  x.strokeStyle = rgba('194,65,12', 0.35 * a + 0.05); x.strokeRect(l + 0.5, -1, f.w - 1, y(base) + 1);
  // the pipe down the front
  x.fillStyle = rgba('150,110,70', 0.25 * a); x.fillRect(l + S.pipe, 0, 2, y(base));
  for (let k = 0; ; k++) {
    const h0 = base + (f.ground === false ? 0 : 44) + k * st, top = y(h0 + st);
    if (y(h0) < 0) break;
    const row = S.wins[k % S.wins.length];
    x.fillStyle = rgba('194,65,12', 0.18 * a); x.fillRect(l, y(h0), f.w, 1);
    for (const w of row) {
      const wx = l + w.x, wy = top + 8, wh = st - 16;
      tenementWindow(x, wx, wy, w.w, wh, w.state, w.col, a, v.t, w.drip);
      if (w.ac) sillAc(x, wx, wy + wh, a, v.t, w.drip);
    }
    const bx = S.balcony[k % S.balcony.length];
    if (bx >= 0) laundryBalcony(x, l + bx, y(h0) - 2, a, S.laundry, k);
  }
  if (S.escape) escapeZigzag(x, y, l + f.w * 0.62, base + 44 + st, st, a);
  if (f.ground !== false) {
    // street level: a rolled shutter with a tag on it, or a dark doorway
    const sw = Math.min(f.w - 16, 60), sx0 = l + 8 + Math.round(S.shutter * (f.w - sw - 16));
    streetShutter(x, y, sx0, base, sw, a, S.tag > 0.4);
  }
}

// ---------- shop shelving ----------

export interface ShelfSpec { x: number; w: number; h: number; rows: number; seed: number; stock?: 'snacks' | 'drinks' | 'noodles' | 'cans' | 'household' | 'mixed' }
interface Item { dx: number; row: number; w: number; h: number; col: string; band: string; kind: number }
const SHELVES = new WeakMap<object, { items: Item[]; fallen: number; gapRow: number }>();

export function shelf(x: CanvasRenderingContext2D, v: View, s: ShelfSpec) {
  const s0 = v.sx(s.x), y = v.y;
  if (!onScreen(v, s0 - 4, s.w + 8)) return;
  let L = SHELVES.get(s);
  if (!L) {
    const r = R0(s.seed * 7 + 5), items: Item[] = [], stock = s.stock ?? 'mixed';
    for (let row = 0; row < s.rows; row++) {
      const kind = stock === 'mixed' ? Math.floor(r() * 5) : ['snacks', 'drinks', 'noodles', 'cans', 'household'].indexOf(stock);
      const col = pick(r, PACKS);
      for (let dx = 4; dx < s.w - 8;) {
        if (r() < 0.07) { dx += 10; continue; }
        const iw = kind === 1 ? 4 : kind === 3 ? 5 : kind === 2 ? 8 : 6 + Math.round(r() * 3), ih = kind === 1 ? 12 + Math.round(r() * 4) : kind === 3 ? 7 : kind === 2 ? 8 : 9 + Math.round(r() * 7);
        items.push({ dx, row, w: iw, h: ih, col: r() < 0.6 ? col : pick(r, PACKS), band: pick(r, PACKS), kind });
        dx += iw + 1 + (r() < 0.2 ? 1 : 0);
      }
    }
    L = { items, fallen: r(), gapRow: Math.floor(r() * s.rows) };
    SHELVES.set(s, L);
  }
  const step = s.h / s.rows;
  box(x, s0, y(s.h + 4), s.w, s.h + 4, '#170d07', rgba(O, 0.75));
  for (const it of L.items) {
    const bx = s0 + it.dx, by = y(it.row * step + 2 + it.h);
    x.fillStyle = it.col; x.globalAlpha = 0.88; x.fillRect(bx, by, it.w, it.h);
    x.fillStyle = it.band; x.fillRect(bx, by + Math.round(it.h * 0.35), it.w, 2);
    if (it.kind === 1) { x.fillRect(bx + 1, by - 2, 2, 2); }
    x.globalAlpha = 1;
    x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(bx, by, 1, it.h);
  }
  for (let row = 0; row < s.rows; row++) {
    const hy = y(row * step + 2);
    x.fillStyle = rgba(O, 0.7); x.fillRect(s0 + 1, hy, s.w - 2, 2);
    for (let px = 6; px < s.w - 10; px += 22) { x.fillStyle = 'rgba(232,222,196,.8)'; x.fillRect(s0 + px, hy + 2, 7, 3); }
  }
  // one pack has fallen over
  const fx = s0 + 6 + Math.round(L.fallen * (s.w - 20));
  x.fillStyle = PACKS[Math.floor(L.fallen * PACKS.length)]; x.fillRect(fx, y(L.gapRow * step + 2 + 5), 11, 5);
}

/** A glass-door fridge lit from inside, one tube humming. */
export function fridge(x: CanvasRenderingContext2D, v: View, f: { x: number; w: number; h: number; seed: number; doors?: number }) {
  const s0 = v.sx(f.x), y = v.y, doors = f.doors ?? 2, dw = (f.w - 4) / doors, r = R0(f.seed * 11 + 1);
  if (!onScreen(v, s0 - 30, f.w + 60)) return;
  const g = x.createRadialGradient(s0 + f.w / 2, y(f.h / 2), 4, s0 + f.w / 2, y(f.h / 2), f.w);
  g.addColorStop(0, 'rgba(220,235,255,.12)'); g.addColorStop(1, 'rgba(220,235,255,0)');
  x.fillStyle = g; x.fillRect(s0 - f.w / 2, y(f.h + 20), f.w * 2, f.h + 20);
  box(x, s0, y(f.h), f.w, f.h, '#1c1c20', 'rgba(220,220,230,.6)');
  for (let d = 0; d < doors; d++) {
    const dx = s0 + 2 + d * dw, hum = d === doors - 1 && (v.t + f.seed * 50) % 260 < 14 && Math.floor(v.t / 2) % 2 === 0;
    box(x, dx + 1, y(f.h - 4), dw - 2, f.h - 14, hum ? 'rgba(200,215,235,.06)' : 'rgba(200,215,235,.16)', 'rgba(220,220,230,.5)');
    x.fillStyle = hum ? 'rgba(235,245,255,.3)' : 'rgba(240,248,255,.9)'; x.fillRect(dx + 3, y(f.h - 5), dw - 6, 1);
    for (let row = 0; row < 4; row++) {
      const ry = y(f.h - 10 - row * ((f.h - 18) / 4));
      x.fillStyle = 'rgba(200,210,220,.35)'; x.fillRect(dx + 2, ry + 1, dw - 4, 1);
      for (let bx = dx + 3; bx < dx + dw - 5; bx += 4) {
        if (r() < 0.12) continue;
        x.fillStyle = pick(r, PACKS); x.globalAlpha = hum ? 0.4 : 0.85; x.fillRect(bx, ry - 8, 3, 8); x.fillRect(bx + 1, ry - 10, 1, 2); x.globalAlpha = 1;
      }
    }
    x.fillStyle = 'rgba(220,220,230,.8)'; x.fillRect(d % 2 ? dx + 3 : dx + dw - 5, y(f.h * 0.6), 2, 14);
    x.fillStyle = 'rgba(255,255,255,.05)'; x.beginPath(); x.moveTo(dx + 4, y(f.h - 4)); x.lineTo(dx + 10, y(f.h - 4)); x.lineTo(dx + 4, y(14)); x.closePath(); x.fill();
  }
  box(x, s0, y(10), f.w, 10, '#141418', 'rgba(220,220,230,.4)');
  for (let k = 4; k < f.w - 4; k += 3) { x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(s0 + k, y(8), 1, 6); }
}

// ---------- clutter and street furniture ----------

export type Junk = 'crate' | 'barrel' | 'box' | 'bag' | 'tyre';
/** A pile on the ground from `x` rightwards. */
export function clutter(x: CanvasRenderingContext2D, v: View, c: { x: number; seed: number; n?: number; kinds?: Junk[]; parallax?: number }) {
  const r = R0(c.seed * 19 + 3), n = c.n ?? 3, kinds = c.kinds ?? ['crate', 'box', 'barrel', 'bag', 'crate', 'tyre'];
  let wx = 0;
  const s0 = v.sx(c.x, c.parallax ?? 1);
  if (!onScreen(v, s0 - 10, n * 30 + 20)) return;
  for (let i = 0; i < n; i++) {
    const k = pick(r, kinds), bx = s0 + wx, g = v.y(0);
    if (k === 'crate') {
      const w = 16 + Math.round(r() * 8), h = 12 + Math.round(r() * 8), stack = r() < 0.4;
      for (let s = 0; s < (stack ? 2 : 1); s++) {
        const off = s ? Math.round((r() - 0.5) * 6) : 0;
        box(x, bx + off, g - h * (s + 1), w - s * 4, h, '#3a2412', 'rgba(255,170,90,.5)');
        x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(bx + off + 2, g - h * (s + 1) + h / 2, w - s * 4 - 4, 1);
      }
      wx += w + 2;
    } else if (k === 'barrel') {
      const w = 12, h = 18;
      box(x, bx, g - h, w, h, r() < 0.5 ? '#4a2a1a' : '#2e3a44', 'rgba(220,180,140,.45)');
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(bx, g - h + 5, w, 1); x.fillRect(bx, g - 5, w, 1);
      wx += w + 3;
    } else if (k === 'box') {
      const w = 10 + Math.round(r() * 10), h = 8 + Math.round(r() * 8);
      box(x, bx, g - h, w, h, '#6a5034', 'rgba(255,217,165,.35)'); x.fillStyle = 'rgba(232,210,160,.5)'; x.fillRect(bx + w / 2 - 1, g - h, 2, h);
      wx += w + 1;
    } else if (k === 'bag') {
      x.fillStyle = r() < 0.5 ? '#1a1a1c' : '#3a3a2a'; x.beginPath(); x.ellipse(bx + 7, g - 5, 8, 6, 0, Math.PI, 0); x.fill(); x.fillRect(bx - 1, g - 5, 16, 5);
      x.fillStyle = 'rgba(220,220,220,.2)'; x.fillRect(bx + 3, g - 9, 3, 1);
      wx += 15;
    } else {
      x.strokeStyle = '#18140f'; x.lineWidth = 4; x.beginPath(); x.ellipse(bx + 8, g - 4, 7, 3, 0, 0, 7); x.stroke(); x.lineWidth = 1;
      wx += 16;
    }
  }
}

/** A bench; the seat is at h 10, the same as a sitting person's `h`. */
export function bench(x: CanvasRenderingContext2D, v: View, b: { x: number; w?: number; seed: number }) {
  const r = R0(b.seed * 23 + 1), w = b.w ?? 40 + Math.round(r() * 16), s0 = v.sx(b.x), y = v.y;
  if (!onScreen(v, s0, w)) return;
  x.fillStyle = '#2a1a10'; x.fillRect(s0 + 3, y(10), 3, 10); x.fillRect(s0 + w - 6, y(10), 3, 10);
  box(x, s0, y(12), w, 3, '#4a3020', 'rgba(255,170,90,.6)');
  box(x, s0 + 1, y(24), w - 2, 3, '#4a3020', 'rgba(255,170,90,.45)');
  x.fillStyle = '#2a1a10'; x.fillRect(s0 + 4, y(24), 2, 12); x.fillRect(s0 + w - 6, y(24), 2, 12);
  if (r() < 0.5) { x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(s0 + 10 + Math.round(r() * (w - 24)), y(24), 6, 3); }
  if (r() < 0.6) { x.fillStyle = pick(r, PACKS); x.globalAlpha = 0.6; x.fillRect(s0 + w - 16, y(23), 4, 2); x.globalAlpha = 1; }
}

export function stool(x: CanvasRenderingContext2D, v: View, s: { x: number; seed: number }) {
  const s0 = v.sx(s.x), y = v.y, tilt = (s.seed % 3) - 1;
  if (!onScreen(v, s0 - 10, 20)) return;
  x.fillStyle = '#2a1a10'; x.fillRect(s0 - 5, y(8), 2, 8); x.fillRect(s0 + 3 + tilt, y(8), 2, 8);
  box(x, s0 - 7, y(10), 14, 3, s.seed % 2 ? '#8a2a1a' : '#4a3a2a', 'rgba(255,170,90,.5)');
}

/** A street lamp with its cone of light and its reflection in the wet street. */
export function lamp(x: CanvasRenderingContext2D, v: View, l: { x: number; h?: number; seed: number; dead?: boolean; parallax?: number }) {
  const r = R0(l.seed * 29 + 7), h = l.h ?? 90 + Math.round(r() * 20), s0 = v.sx(l.x, l.parallax ?? 1), y = v.y;
  if (!onScreen(v, s0 - 60, 120)) return;
  const flick = !l.dead && r() < 0.4 && (v.t + l.seed * 41) % 240 < 10 && Math.floor(v.t / 3) % 2 === 0;
  const on = !l.dead && !flick, arm = r() < 0.5 ? 1 : -1;
  if (on) {
    const g = x.createLinearGradient(0, y(h), 0, y(0));
    g.addColorStop(0, 'rgba(255,200,130,.14)'); g.addColorStop(1, 'rgba(255,200,130,.02)');
    x.fillStyle = g; x.beginPath(); x.moveTo(s0 + arm * 12 - 4, y(h - 3)); x.lineTo(s0 + arm * 12 - 34, y(0)); x.lineTo(s0 + arm * 12 + 34, y(0)); x.lineTo(s0 + arm * 12 + 4, y(h - 3)); x.closePath(); x.fill();
  }
  x.fillStyle = '#2a1d14'; x.fillRect(s0 - 1, y(h), 3, h); x.fillRect(s0 - 4, y(4), 9, 4);
  x.fillRect(Math.min(s0, s0 + arm * 14), y(h), 14, 2);
  box(x, s0 + arm * 12 - 5, y(h - 1), 10, 4, '#3a2a1e', 'rgba(255,190,120,.5)');
  x.fillStyle = on ? 'rgba(255,230,180,.95)' : 'rgba(255,230,180,.15)'; x.fillRect(s0 + arm * 12 - 3, y(h - 4), 6, 1);
  x.fillStyle = 'rgba(232,222,196,.5)'; x.fillRect(s0 - 2, y(40), 5, 6);
  if (on) reflect(x, v, s0 + arm * 12, '255,200,130', 0.7, 16);
}

export function bin(x: CanvasRenderingContext2D, v: View, b: { x: number; seed: number }) {
  const r = R0(b.seed * 31 + 3), s0 = v.sx(b.x), y = v.y;
  if (!onScreen(v, s0 - 20, 40)) return;
  box(x, s0, y(20), 14, 20, '#2a3a2a', 'rgba(220,200,160,.45)');
  x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(s0 + 2, y(16), 10, 1);
  for (let i = 0; i < 4; i++) { x.fillStyle = pick(r, PACKS); x.globalAlpha = 0.7; x.fillRect(s0 + 1 + i * 3, y(23 + r() * 3), 4, 4); x.globalAlpha = 1; }
  if (r() < 0.7) { x.fillStyle = '#18181a'; x.beginPath(); x.ellipse(s0 + 20, y(4), 6, 5, 0, Math.PI, 0); x.fill(); x.fillRect(s0 + 14, y(4), 12, 4); }
}

export function bollard(x: CanvasRenderingContext2D, v: View, b: { x: number; seed: number }) {
  const s0 = v.sx(b.x), y = v.y;
  if (!onScreen(v, s0 - 6, 12)) return;
  box(x, s0 - 3, y(16), 6, 16, '#2a2622', 'rgba(220,200,160,.5)');
  x.fillStyle = b.seed % 2 ? 'rgba(214,170,60,.8)' : 'rgba(200,60,40,.7)'; x.fillRect(s0 - 3, y(13), 6, 2);
}

/** An ambient vending machine: orange and red, because you cannot use it (cyan would say you can). */
export function vending(x: CanvasRenderingContext2D, v: View, m: { x: number; seed: number; lines?: string[] }) {
  const r = R0(m.seed * 37 + 9), s0 = v.sx(m.x), y = v.y, w = 30 + Math.round(r() * 8), h = 66 + Math.round(r() * 10);
  if (!onScreen(v, s0 - 30, w + 60)) return;
  const g = x.createRadialGradient(s0 + w / 2, y(h / 2), 3, s0 + w / 2, y(h / 2), w * 1.4);
  g.addColorStop(0, 'rgba(255,120,40,.12)'); g.addColorStop(1, 'rgba(255,120,40,0)');
  x.fillStyle = g; x.fillRect(s0 - w, y(h + 20), w * 3, h + 20);
  box(x, s0, y(h), w, h, '#2a0e08', 'rgba(255,136,0,.7)');
  box(x, s0 + 3, y(h - 3), w - 6, h * 0.5, '#120604', 'rgba(255,136,0,.35)');
  for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) { x.fillStyle = pick(r, PACKS); x.globalAlpha = 0.75; x.fillRect(s0 + 6 + i * ((w - 12) / 3), y(h - 6) + j * 8, 4, 6); x.globalAlpha = 1; }
  const lines = m.lines ?? ['ID FIRST'];
  box(x, s0 + 3, y(h * 0.45), w - 6, 10, '#000', 'rgba(255,42,68,.5)');
  text(x, lines[Math.floor(v.t / 160) % lines.length], s0 + w / 2, y(h * 0.45) + 5.5, 'rgba(255,42,68,.9)', 7, '600');
  x.fillStyle = '#050202'; x.fillRect(s0 + 6, y(12), w - 12, 6);
}
