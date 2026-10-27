/**
 * INTERIOR KIT, oldq: the Old Quarter seen cut open (Tommi, 2026-10-21: every district building can be
 * entered; the Old Quarter's are the tube house and St. Agnes).
 *
 * The tube house (after Hoi An and Hanoi) is long and narrow; cut open it reads left to right as the
 * front room, the light well open to the sky, the room with the family altar and the stair, the
 * kitchen at the back; the bedroom and a storeroom upstairs; a roof terrace. St. Agnes (after Hanoi's
 * St. Joseph's) is a nave seen side-on: an arcade of pointed arches, stained glass, pews, a stand of
 * votive candles, confessionals, an organ loft, an altar in the apse, and the bell tower with its
 * stair up to the belfry.
 *
 * Pieces draw in their own frame (origin at the foot on the left, `y(h) = -h`), every visual choice is
 * a field, light comes from the city clock (`o.lighting`) and the light layer (`o.light`). Walkable
 * lines, doors and flights are the level kit's (art/levels); `interior.stair` only re-dresses a level
 * flight in timber or stone, drawn over it with the same run and rise.
 */
import type { AssetDefinition, Properties } from '../core/composition';
import type { View } from '../core/view';
import { rng } from '../core/primitives';
import { neonPlate } from '../signage/kit';
import { bool, colour, hash, isHex, num, piece, rgba, select, text, y, type Paint } from '../buildings/types';

type Ctx = CanvasRenderingContext2D;
/** A crisp rect from height `h` up `t`, `w` wide from `l`. */
const R = (x: Ctx, l: number, h: number, w: number, t: number, c: string) => {
  if (w <= 0 || t <= 0) return;
  x.fillStyle = c; x.fillRect(Math.round(l), Math.round(-(h + t)), Math.max(1, Math.round(w)), Math.max(1, Math.round(t)));
};
const colourOr = (v: unknown, fallback: string) => isHex(v) ? String(v) : fallback;
const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(',');
/** Candle, lamp and lantern strength: always visible inside, full at night. */
const flameLevel = (o: Paint) => o.lighting.outdoor ? Math.max(0.6, o.lighting.lamps) : 1;
/** How much daylight comes through a window or down a light well. */
const sky = (o: Paint) => o.lighting.daylight * (1 - 0.5 * o.lighting.cover);
const flicker = (t: number, k: number) => 0.82 + 0.18 * Math.sin(t / 7 + k * 1.7) * Math.sin(t / 19 + k);
/** A pointed arch outline from `base` up to `spring`, meeting at `apex`. */
function arch(x: Ctx, l: number, w: number, base: number, spring: number, apex: number) {
  const c = spring + (apex - spring) * 0.72;
  x.moveTo(l, y(base)); x.lineTo(l, y(spring)); x.quadraticCurveTo(l, y(c), l + w / 2, y(apex)); x.quadraticCurveTo(l + w, y(c), l + w, y(spring)); x.lineTo(l + w, y(base)); x.closePath();
}
/** A small flame with its glow on the light layer. */
function flame(x: Ctx, o: Paint, cx: number, h: number, k: number, col = '255,210,120') {
  const a = flameLevel(o) * flicker(o.t, k);
  R(x, cx, h, 1, 2, rgba(col, Math.min(1, 0.55 + 0.45 * a)));
  R(x, cx, h + 2, 1, 1, rgba('255,240,200', 0.5 * a));
  o.light?.(cx, h + 1, 4, 4, col, 'screen');
}
/** A printed card or plate on a surface, centred at (cx, h). */
function card(x: Ctx, o: Paint, cx: number, h: number, words: string, paper = true) {
  if (!words) return;
  neonPlate(x, o.t, cx, y(h), { text: words, col: paper ? '120,100,80' : '200,190,170', size: 7, h: 11, printed: true, bolts: false, glow: 0, edge: 0.6,
    fill: paper ? '#d6cdb6' : '#14100c', ink: paper ? 'rgba(36,28,22,.95)' : 'rgba(220,205,170,.85)' } as Parameters<typeof neonPlate>[4]);
}
/** Stone blocks: joints every 8 units up, staggered. */
function blocks(x: Ctx, l: number, w: number, h0: number, h1: number, a = 0.22) {
  x.fillStyle = 'rgba(0,0,0,' + a + ')';
  for (let h = h0 + 8; h < h1; h += 8) { x.fillRect(Math.round(l), Math.round(y(h)), Math.round(w), 1); for (let jx = l + (((h - h0) / 8) % 2) * 7; jx < l + w; jx += 14) x.fillRect(Math.round(jx), Math.round(y(h + 8)) + 1, 1, 7); }
}
/** Damp running down a wall from `top`, darkest at the foot. */
function damp(x: Ctx, l: number, w: number, top: number, amount: number, seed: number) {
  for (let k = l + 2; k < l + w - 2; k += 5) { const a = (0.06 + hash(k + seed) * 0.14) * amount; if (a < 0.02) continue; x.fillStyle = 'rgba(4,8,6,' + a.toFixed(3) + ')'; x.fillRect(Math.round(k), Math.round(y(top)), 3, Math.round(top * (0.25 + hash(k * 3 + seed) * 0.5))); }
  const g = x.createLinearGradient(0, y(Math.min(top, 30)), 0, 0); g.addColorStop(0, 'rgba(10,18,10,0)'); g.addColorStop(1, 'rgba(10,18,10,' + (0.35 * amount).toFixed(3) + ')');
  x.fillStyle = g; x.fillRect(Math.round(l), Math.round(y(Math.min(top, 30))), Math.round(w), Math.round(Math.min(top, 30)));
}
const GLASS = ['200,60,60', '220,180,80', '70,110,190', '110,170,90', '160,80,170'];
/** The same glass with the sun straight on it: deeper, more saturated colours. */
const GLASS_LIT = ['235,45,40', '255,205,50', '45,110,240', '80,210,80', '200,70,225'];
/** Which way a window looks out, relative to the view: the far wall looks where the camera looks (0), the ends right (90) or left (-90). */
export const WINDOW_FACES: Record<string, number> = { 'far wall': 0, 'right end': 90, 'left end': -90 };
/**
 * Light on a window from the city clock: `diffuse` is the sky's daylight through it, `sun` how squarely
 * the sun stands behind it (0 when the sun is on the other side, down, or behind cloud).
 */
function glassLight(o: Paint, faces: number) {
  const L = o.lighting, diffuse = sky(o), on = Math.max(0, Math.cos(((L.sunRel - faces) * Math.PI) / 180));
  return { diffuse, sun: L.sun.up ? diffuse * L.direct * on : 0 };
}
/**
 * The sun's (or by night the moon's) beam in the side view: horizontal travel per unit of drop, from its
 * bearing relative to the view and its height (as the city clock's shadows: long and low morning and
 * evening, steep at noon). Null when neither is up.
 */
function sunSlope(o: Paint, night = false): number | null {
  const L = o.lighting, b = night ? L.moon : L.sun, rel = night ? L.moonRel : L.sunRel;
  if (!b.up || b.el <= 0) return null;
  const ang = Math.max(0.12, b.el * 1.2);
  return Math.max(-3, Math.min(3, -Math.sin((rel * Math.PI) / 180) / Math.tan(ang)));
}
/** How bright a window's glass reads: dim by night, a little by daylight, full with the sun behind it. */
const glassBright = (g: { diffuse: number; sun: number }) => 0.08 + 0.42 * g.diffuse + 0.5 * g.sun;
const mixRgb = (a: string, b: string, k: number) => { const A = a.split(',').map(Number), B = b.split(',').map(Number); return A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(','); };
/** A stained-glass lancet: coloured panes in lead, brighter by day; with the sun on it (`sun` 0..1) the colours deepen and glow over the lead. */
function lancet(x: Ctx, l: number, w: number, base: number, top: number, bright: number, seed: number, sun = 0) {
  x.fillStyle = '#0a0a0c'; x.beginPath(); arch(x, l - 1, w + 2, base - 1, top - w * 0.7, top + 1); x.fill();
  const panes: [number, number, string][] = [];
  for (let h = base; h < top; h += 5) for (let k = 0; k < w; k += 3) {
    const i = Math.floor(hash(seed + h * 7 + k * 13) * GLASS.length), lim = h > top - w * 0.7 ? Math.abs(k + 1.5 - w / 2) <= (top - h) / 0.7 / 2 : true;
    if (!lim) continue;
    const c = sun > 0 ? mixRgb(GLASS[i], GLASS_LIT[i], Math.min(1, sun * 1.3)) : GLASS[i];
    R(x, l + k, h, 2, 4, rgba(c, Math.min(0.97, 0.12 + 0.75 * bright * (0.7 + 0.3 * hash(seed + h + k)))));
    panes.push([l + k, h, c]);
  }
  if (sun < 0.05) return;
  // the sun through it: each pane bleeds a little light over its lead, the whole window has a soft halo
  x.save(); x.globalCompositeOperation = 'screen';
  for (const [px, ph, c] of panes) R(x, px - 1, ph - 1, 4, 6, rgba(c, 0.22 * sun));
  const g = x.createRadialGradient(l + w / 2, y((base + top) / 2), 0, l + w / 2, y((base + top) / 2), Math.max(w, top - base) * 0.75);
  g.addColorStop(0, 'rgba(255,236,200,' + (0.16 * sun).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,236,200,0)');
  x.fillStyle = g; x.fillRect(l - w, y(top + w), w * 3, top - base + 2 * w);
  x.restore();
}

// ---------------------------------------------------------------- the tube house

const ROOMS = ['tailor', 'living', 'kitchen', 'bedroom', 'store', 'tea', 'plain'] as const;
const ROOM_WALL: Record<string, string> = { tailor: '#4a3a1e', living: '#4a3620', kitchen: '#3a2e1c', bedroom: '#3e3424', store: '#362c1c', tea: '#46361c', plain: '#423420' };
const CLOTH = ['150,40,40', '190,150,70', '60,80,130', '210,200,180', '70,110,70', '130,60,100', '200,110,60'];
const WOOD = '#2a1a0d', WOOD_LIT = 'rgba(230,170,100,.35)';

/** One storey of a tube house seen cut open: lime-washed back wall, floor, posts and beams, what stands in it, its lamp. */
export const oldqRoomElement = piece({
  type: 'interior.oldq-room', label: 'Old Quarter room (cut open)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 120, 20, 2000, 1, 'units'), height: num('Height (floor to ceiling)', 66, 30, 300, 1, 'units'),
    kind: select('Kind', ROOMS), wall: colour('Wall colour', 'The kind’s own'),
    floor: select('Floor', ['tile', 'timber', 'stone']), beams: bool('Timber posts and beams', true),
    lamp: select('Lamp', ['bulb', 'oil lamp', 'none']), lit: num('Lamp on', 1, 0, 1, 0.05),
    door: select('Back door', ['none', 'left', 'right']), cut: select('Cut wall (section)', ['none', 'left', 'right', 'both']),
    seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.height), w: Number(p.width), tall: Number(p.height) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, ceiling: { x: 0, h: Number(p.height), role: 'mount' }, middle: { x: Number(p.width) / 2, h: 0, role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), kind = String(p.kind), seed = Number(p.seed), r = rng(seed * 977 + 5), lit = Number(p.lit) * flameLevel(o);
    const wall = colourOr(p.wall, ROOM_WALL[kind] ?? ROOM_WALL.plain);
    R(x, 0, 0, w, H, wall);
    // lime wash redone in patches, a darker dado, damp at the foot
    for (let i = 0; i < Math.round(w / 30); i++) R(x, r() * (w - 16), 14 + r() * (H - 24), 10 + r() * 16, 6 + r() * 8, 'rgba(255,235,190,.05)');
    R(x, 0, 0, w, 12, 'rgba(0,0,0,.18)'); R(x, 0, 12, w, 1, 'rgba(0,0,0,.28)');
    damp(x, 0, w, 20, 0.6, seed);
    // the back door: a dark opening, the door leaf ajar, the alley's light on the sill
    if (p.door !== 'none') {
      const dw = 16, dx = p.door === 'left' ? 6 : w - dw - 6;
      R(x, dx - 2, 0, dw + 4, 48, '#1a1008'); R(x, dx, 0, dw, 46, '#07090a');
      R(x, dx + 2, 0, dw - 4, 46, rgba('150,170,190', 0.06 + 0.25 * sky(o)));
      R(x, p.door === 'left' ? dx : dx + dw - 5, 0, 5, 46, '#2c1a0c'); R(x, dx, 0, dw, 1, rgba('200,210,220', 0.1 + 0.3 * sky(o)));
    }
    furnish(x, kind, w, H, o, seed);
    // floor: terracotta tiles, boards or flags, its lit edge
    const fl = String(p.floor);
    for (let k = 0; k < w; k += fl === 'timber' ? 14 : 8) {
      const alt = Math.floor(k / 8) % 2 === 0;
      R(x, k, 0, fl === 'timber' ? 13 : 8, 3, fl === 'tile' ? (alt ? '#5a2c1a' : '#4a2414') : fl === 'timber' ? (alt ? '#3a2412' : '#33200f') : (alt ? '#3a3834' : '#32302c'));
    }
    R(x, 0, 3, w, 1, 'rgba(255,200,140,.14)');
    if (p.beams !== false) {
      R(x, 0, H - 5, w, 5, WOOD); R(x, 0, H - 5, w, 1, WOOD_LIT);
      for (let k = 10; k < w - 6; k += 22) R(x, k, H - 8, 4, 3, '#1e1209');
      R(x, 0, 0, 3, H, WOOD); R(x, w - 3, 0, 3, H, WOOD); R(x, 2, 0, 1, H, WOOD_LIT);
    }
    // the cut party walls: brick and lime in section
    const cut = String(p.cut);
    for (const side of ['left', 'right'] as const) if (cut === side || cut === 'both') {
      const cx = side === 'left' ? 0 : w - 6; R(x, cx, 0, 6, H, '#5a3a26');
      x.fillStyle = 'rgba(0,0,0,.3)'; for (let h = 4; h < H; h += 4) x.fillRect(Math.round(cx), Math.round(y(h)), 6, 1);
      R(x, side === 'left' ? cx + 5 : cx, 0, 1, H, 'rgba(255,190,120,.35)');
    }
    // the lamp: a bare bulb on its cord, or an oil lamp on a bracket; it lights the wall round it
    const lamp = String(p.lamp);
    if (lamp !== 'none') {
      const lx = lamp === 'bulb' ? Math.round(w / 2) : Math.round(w * 0.82), lh = lamp === 'bulb' ? H - 18 : 40;
      if (lamp === 'bulb') { R(x, lx, lh + 3, 1, H - 5 - lh - 3, '#0c0806'); R(x, lx - 1, lh + 2, 3, 2, '#1a120c'); R(x, lx - 1, lh, 3, 2, lit > 0 ? rgba('255,220,150', 0.5 + 0.5 * lit) : '#3a3428'); }
      else { R(x, lx - 3, lh - 2, 7, 2, WOOD); R(x, lx, lh - 6, 1, 4, WOOD); R(x, lx - 1, lh, 3, 6, 'rgba(220,230,220,.25)'); if (lit > 0) R(x, lx, lh + 1, 1, 3, rgba('255,200,110', 0.6 + 0.4 * lit * flicker(o.t, seed))); }
      if (lit > 0) {
        const cy = y(lh + 1), rad = Math.max(w, H) * 0.75, g = x.createRadialGradient(lx, cy, 0, lx, cy, rad);
        g.addColorStop(0, 'rgba(255,190,110,' + (0.2 * lit).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,190,110,0)');
        x.fillStyle = g; x.fillRect(0, y(H), w, H);
        o.light?.(lx, lh + 1, 8, 8, '255,190,110', 'screen');
      }
    }
  },
});

/** What stands in a room of each kind, against its back wall. */
function furnish(x: Ctx, kind: string, w: number, H: number, o: Paint, seed: number) {
  const at = (f: number) => Math.round(w * f), r = rng(seed * 131 + 9);
  const calendar = (cx: number, h: number) => { R(x, cx - 1, h + 12, 2, 1, '#1a1008'); R(x, cx - 5, h, 10, 12, 'rgba(225,215,195,.8)'); R(x, cx - 5, h + 9, 10, 3, 'rgba(190,40,30,.85)'); R(x, cx - 3, h + 3, 6, 4, 'rgba(60,40,30,.5)'); };
  if (kind === 'tailor') {
    // shelves of cloth bolts, a rail of finished work, a dress form, the cutting table, the treadle machine
    for (let s = 0; s < 3; s++) { const sh = 24 + s * 13; if (sh > H - 10) break; R(x, at(0.04), sh, at(0.27), 2, '#24160b'); for (let k = at(0.05); k < at(0.3) - 5; k += 6) R(x, k, sh + 2, 5, 9, rgba(CLOTH[Math.floor(r() * CLOTH.length)], 0.8)); }
    const rl = at(0.36), rr = at(0.62); R(x, rl, H - 16, rr - rl, 1, '#6a5a40');
    for (let k = rl + 3; k < rr - 6; k += 9) { const c = CLOTH[Math.floor(r() * CLOTH.length)]; R(x, k + 3, H - 20, 1, 4, '#1a1008'); R(x, k, H - 26 - Math.round(r() * 10), 7, 6, rgba(c, 0.75)); R(x, k + 1, 22, 5, H - 48, rgba(c, 0.6)); }
    const df = at(0.52); R(x, df, 0, 1, 18, '#1a1008'); R(x, df - 3, 0, 7, 1, '#1a1008'); R(x, df - 4, 18, 9, 18, 'rgba(225,210,180,.85)'); R(x, df - 3, 36, 7, 3, 'rgba(225,210,180,.85)'); R(x, df - 4, 26, 9, 1, 'rgba(200,60,50,.8)');
    R(x, at(0.04), 22, at(0.33), 3, '#3a2412'); R(x, at(0.04), 25, at(0.33), 1, WOOD_LIT); R(x, at(0.06), 0, 2, 22, '#24160b'); R(x, at(0.35), 0, 2, 22, '#24160b');
    R(x, at(0.1), 25, at(0.16), 3, rgba(CLOTH[seed % CLOTH.length], 0.85)); R(x, at(0.29), 25, 5, 1, 'rgba(210,215,220,.8)');
    const mx = at(0.7); R(x, mx, 0, 2, 22, '#121214'); R(x, mx + at(0.2) - 2, 0, 2, 22, '#121214'); R(x, mx + 2, 5, at(0.2) - 4, 1, '#121214');
    R(x, mx + 4, 2, 8, 2, '#1c1c20'); R(x, mx - 1, 22, at(0.2) + 2, 3, '#3a2412'); R(x, mx - 1, 25, at(0.2) + 2, 1, WOOD_LIT);
    R(x, mx + 3, 25, 14, 4, '#0e0e10'); R(x, mx + 13, 25, 4, 11, '#0e0e10'); R(x, mx + 5, 33, 12, 3, '#0e0e10'); R(x, mx + 6, 34, 6, 1, 'rgba(210,170,80,.7)'); R(x, mx + 4, 25, 1, 3, 'rgba(210,215,220,.6)');
    R(x, mx - 10, 0, 1, 10, '#24160b'); R(x, mx - 4, 0, 1, 10, '#24160b'); R(x, mx - 11, 10, 9, 2, '#3a2412');
    calendar(at(0.86), H - 30);
  } else if (kind === 'living') {
    // a low table for homework and tea, a pendulum clock, a calendar, a plank bed against the wall
    R(x, at(0.1), 10, at(0.3), 2, '#3a2412'); R(x, at(0.1), 12, at(0.3), 1, WOOD_LIT); R(x, at(0.12), 0, 2, 10, '#24160b'); R(x, at(0.37), 0, 2, 10, '#24160b');
    R(x, at(0.16), 12, 6, 1, 'rgba(230,225,210,.85)'); R(x, at(0.16) + 7, 12, 5, 1, 'rgba(230,225,210,.7)'); R(x, at(0.3), 12, 3, 4, 'rgba(160,190,170,.6)');
    const cx = at(0.47), ch = H - 34; R(x, cx - 4, ch, 9, 18, '#2c1a0c'); R(x, cx - 3, ch + 10, 7, 7, 'rgba(225,215,190,.8)'); R(x, cx, ch + 13, 1, 3, '#140c08');
    const sw = Math.round(Math.sin(o.t / 30) * 2); R(x, cx + sw, ch + 2, 1, 7, 'rgba(200,160,70,.8)'); R(x, cx - 1 + sw, ch + 1, 3, 2, 'rgba(200,160,70,.9)');
    calendar(at(0.8), H - 28);
    R(x, at(0.62), 0, at(0.36), 12, '#2a1a0d'); R(x, at(0.62), 12, at(0.36), 2, '#4a2e16'); R(x, at(0.62), 13, at(0.36), 1, WOOD_LIT); R(x, at(0.64), 14, at(0.14), 3, 'rgba(170,140,90,.6)');
  } else if (kind === 'kitchen') {
    // the clay charcoal stove and its pot, bowls on a shelf, ladles on hooks
    const sx = at(0.12); R(x, sx, 0, 14, 10, '#4a2a1a'); R(x, sx + 3, 4, 8, 3, rgba('255,120,50', 0.6 * flicker(o.t, 3))); o.light?.(sx + 7, 6, 10, 6, '255,120,50', 'screen');
    R(x, sx + 1, 10, 12, 8, '#141416'); R(x, sx + 1, 17, 12, 1, 'rgba(200,200,200,.25)');
    for (let s = 0; s < 3; s++) { const rise = (o.t * 0.25 + s * 6 + seed) % 16; R(x, sx + 4 + s * 3, 20 + rise, 1, 2, rgba('255,245,230', Math.max(0, 0.3 - rise * 0.018))); }
    R(x, at(0.06), H - 26, at(0.46), 2, '#24160b'); for (let k = at(0.08); k < at(0.5); k += 6) R(x, k, H - 24, 5, 3, rgba(['210,205,190', '120,150,160', '170,90,50'][k % 3], 0.75));
    for (let k = 0; k < 3; k++) { const hx = at(0.12) + k * 5; R(x, hx, H - 36, 1, 6, '#2a2a2c'); R(x, hx - 1, H - 39, 3, 3, '#2a2a2c'); }
  } else if (kind === 'bedroom') {
    // a wooden bed under its mosquito net, a wardrobe with a mirror, a trunk, the wedding photograph
    const bx = at(0.06), bw = at(0.42); R(x, bx, 0, bw, 14, '#2c1a0c'); R(x, bx, 14, bw, 4, 'rgba(190,170,130,.7)'); R(x, bx + 2, 18, 10, 3, 'rgba(220,215,200,.8)');
    R(x, bx - 1, 0, 2, 52, '#24160b'); R(x, bx + bw - 1, 0, 2, 52, '#24160b'); R(x, bx - 1, 52, bw + 2, 2, '#24160b');
    x.fillStyle = 'rgba(225,225,215,.16)'; x.fillRect(bx + 1, y(52), bw - 2, 34); x.fillStyle = 'rgba(225,225,215,.12)'; for (let k = bx + 4; k < bx + bw - 2; k += 6) x.fillRect(k, y(52), 1, 34);
    const wx = at(0.6); R(x, wx, 0, at(0.2), 50, '#2a180b'); R(x, wx, 50, at(0.2), 2, '#3a2412'); R(x, wx + Math.round(at(0.2) / 2), 4, 1, 44, 'rgba(0,0,0,.4)'); R(x, wx + 3, 14, Math.round(at(0.2) / 2) - 5, 26, 'rgba(160,180,190,.25)');
    R(x, at(0.84), 0, at(0.13), 10, '#3a2014'); R(x, at(0.84), 10, at(0.13), 1, WOOD_LIT); R(x, at(0.84) + 3, 4, 3, 2, 'rgba(210,170,80,.6)');
    R(x, at(0.86), H - 30, 10, 13, '#140c08'); R(x, at(0.86) + 1, H - 29, 8, 11, 'rgba(200,180,150,.5)'); R(x, at(0.86) + 2, H - 25, 2, 4, 'rgba(60,40,30,.6)'); R(x, at(0.86) + 5, H - 25, 2, 4, 'rgba(60,40,30,.6)');
  } else if (kind === 'store') {
    // crates and baskets, sacks, bolts of cloth on end, an old bicycle on the wall
    for (let k = 0; k < Math.max(1, Math.floor(w / 70)); k++) {
      const cx = at(0.05) + k * 50; if (cx + 20 > w - 6) break;
      R(x, cx, 0, 18, 14, '#3a2614'); R(x, cx, 14, 18, 1, WOOD_LIT); R(x, cx, 6, 18, 1, 'rgba(0,0,0,.35)');
      if (r() < 0.6) { R(x, cx + 2, 15, 14, 10, '#33220f'); R(x, cx + 2, 25, 14, 1, WOOD_LIT); }
      R(x, cx + 22, 0, 8, 12 + Math.round(r() * 8), 'rgba(170,150,110,.6)');
    }
    const bx = at(0.62), wh = 9;
    x.strokeStyle = 'rgba(150,140,120,.7)'; x.lineWidth = 1; x.beginPath(); x.arc(bx, y(26), wh, 0, Math.PI * 2); x.moveTo(bx + 34 + wh, y(26)); x.arc(bx + 34, y(26), wh, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = 'rgba(40,60,80,.9)'; x.beginPath(); x.moveTo(bx, y(26)); x.lineTo(bx + 14, y(38)); x.lineTo(bx + 28, y(38)); x.lineTo(bx + 34, y(26)); x.moveTo(bx + 14, y(38)); x.lineTo(bx + 18, y(26)); x.lineTo(bx + 28, y(38)); x.moveTo(bx + 12, y(42)); x.lineTo(bx + 18, y(42)); x.stroke();
    R(x, bx + 6, 46, 1, 6, '#2a2a2c');
  } else if (kind === 'tea') {
    // tins on shelves, low stools, a kettle on a brazier
    for (let s = 0; s < 2; s++) { R(x, at(0.06), 30 + s * 14, at(0.5), 2, '#24160b'); for (let k = at(0.08); k < at(0.54); k += 7) R(x, k, 32 + s * 14, 5, 6, rgba(['160,40,30', '40,80,60', '190,150,70'][(k + s) % 3], 0.75)); }
    for (let k = 0; k < 3; k++) { const sx = at(0.2) + k * 18; R(x, sx, 9, 10, 2, '#4a2e16'); R(x, sx + 1, 0, 1, 9, '#24160b'); R(x, sx + 8, 0, 1, 9, '#24160b'); }
    const kx = at(0.8); R(x, kx, 0, 10, 8, '#3a2014'); R(x, kx + 2, 3, 6, 2, rgba('255,120,50', 0.5 * flicker(o.t, 5))); R(x, kx + 1, 8, 8, 7, '#2a2a2c'); R(x, kx + 9, 12, 3, 1, '#2a2a2c');
  }
}

/** The open courtyard between the front and back of a tube house: sky light falls in on plants and the water jar. */
export const lightWellElement = piece({
  type: 'interior.light-well', label: 'Light well (tube house courtyard)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 56, 20, 400, 1, 'units'), height: num('Height of its walls', 170, 40, 600, 1, 'units'), wall: colour('Wall colour', 'Lime wash'),
    light: num('Sky light falling in', 1, 0, 1, 0.05), plants: num('Potted plants', 4, 0, 10), jar: bool('Water jar', true),
    bridge: num('Walkway across at (0: none)', 72, 0, 400, 1, 'units'), laundry: bool('Washing line', true), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.height), w: Number(p.width), tall: Number(p.height) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, bridge: { x: 0, h: Number(p.bridge), role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), seed = Number(p.seed), r = rng(seed * 313 + 1), s = sky(o) * Number(p.light), night = o.lighting.night * Number(p.light);
    const wall = colourOr(p.wall, '#4c3e24');
    R(x, 0, 0, w, H, wall);
    // the far wall is lit from above: brightest at the top, dim and mossy at the foot
    const g = x.createLinearGradient(0, y(H), 0, 0); g.addColorStop(0, 'rgba(225,230,235,' + (0.05 + 0.3 * s).toFixed(3) + ')'); g.addColorStop(0.7, 'rgba(225,230,235,' + (0.06 * s).toFixed(3) + ')'); g.addColorStop(1, 'rgba(0,0,0,.2)');
    x.fillStyle = g; x.fillRect(0, y(H), w, H);
    if (night > 0) { x.fillStyle = 'rgba(120,140,190,' + (0.06 * night).toFixed(3) + ')'; x.fillRect(0, y(H), w, H); }
    for (let i = 0; i < 5; i++) R(x, r() * (w - 8), 10 + r() * (H - 30), 6 + r() * 10, 4 + r() * 6, 'rgba(255,235,190,.05)');
    for (let k = 2; k < w - 2; k += 4) if (hash(seed + k) < 0.5) R(x, k, 0, 2, 8 + Math.round(hash(seed * 3 + k) * 30), 'rgba(20,40,16,.35)');
    R(x, 0, H - 3, w, 3, '#2a1c10'); R(x, 0, H, w, 1, 'rgba(255,200,140,.3)');
    // the shaft of light from the sky to the floor, and the pool it makes
    if (s > 0.02) {
      x.fillStyle = 'rgba(255,244,220,' + (0.05 + 0.12 * s * (0.4 + 0.6 * o.lighting.direct)).toFixed(3) + ')';
      x.beginPath(); x.moveTo(w * 0.25, y(H)); x.lineTo(w * 0.95, y(H)); x.lineTo(w * 0.7, 0); x.lineTo(w * 0.05, 0); x.closePath(); x.fill();
      R(x, w * 0.05, 0, w * 0.65, 2, 'rgba(255,244,220,' + (0.15 + 0.3 * s).toFixed(3) + ')');
    }
    // flagstones and a drain
    for (let k = 0; k < w; k += 10) R(x, k, 0, 9, 3, k % 20 ? '#3e3c36' : '#363430');
    R(x, Math.round(w / 2) - 3, 0, 6, 1, '#0a0a0a');
    // the washing line high across, with the day's laundry
    if (p.laundry) {
      const lh = H - 22; R(x, 0, lh, w, 1, 'rgba(30,24,20,.9)');
      for (let k = 4; k < w - 8; k += 11) { const c = CLOTH[Math.floor(hash(seed + k) * CLOTH.length)], sw = Math.round(Math.sin(o.t / 60 + k) * 1); R(x, k + sw, lh - 12, 8, 12, rgba(c, 0.75)); R(x, k + sw, lh - 1, 8, 1, 'rgba(0,0,0,.3)'); }
    }
    // the walkway across at the upper floor: timber deck and rail
    const bh = Number(p.bridge);
    if (bh > 0) {
      R(x, 0, bh - 5, w, 5, '#2a1a0d'); R(x, 0, bh - 1, w, 1, WOOD_LIT); R(x, 0, bh - 6, w, 1, 'rgba(0,0,0,.4)');
      for (let k = 2; k < w; k += 6) R(x, k, bh, 2, 14, '#2a1a0d');
      R(x, -1, bh + 14, w + 2, 3, '#3a2412'); R(x, -1, bh + 16, w + 2, 1, WOOD_LIT);
    }
    // potted plants along the floor: low shrubs, a tall areca palm, a bonsai on a stand
    const n = Number(p.plants), right = p.jar ? w - 22 : w - 4;
    for (let i = 0; i < n; i++) {
      const px = Math.round(4 + (i + 0.5) * (right - 8) / Math.max(1, n)) - 4, tall = 8 + Math.round(hash(seed * 7 + i) * 22), palm = hash(seed + i * 5) < 0.3;
      R(x, px, 0, 8, 7, '#7a3a20'); R(x, px - 1, 6, 10, 2, '#8a4a2a'); R(x, px, 6, 8, 1, 'rgba(255,200,150,.3)');
      if (palm) { R(x, px + 3, 8, 1, tall, '#3a4a22'); for (let f = 0; f < 4; f++) { R(x, px + 4, 8 + tall - f * 4, 6 - f, 1, '#4a6a2a'); R(x, px - 2 + f, 8 + tall - f * 4, 5 - f, 1, '#4a6a2a'); } }
      else { for (let k = 0; k < 6; k++) R(x, px - 2 + Math.round(hash(seed + i * 11 + k) * 9), 8 + Math.round(hash(seed + i * 13 + k) * tall * 0.8), 4, 3, k % 2 ? '#2e4a22' : '#3a5a28'); R(x, px + 1, 8 + Math.round(tall * 0.8), 5, 1, rgba('150,200,110', 0.25 + 0.4 * s)); }
    }
    // the glazed water jar with its lid and the coconut-shell ladle
    if (p.jar) {
      const jx = w - 18; x.fillStyle = '#3a2214'; x.beginPath(); x.ellipse(jx + 7, y(10), 8, 10, 0, 0, Math.PI * 2); x.fill();
      R(x, jx + 2, 19, 10, 2, '#4a2a18'); R(x, jx + 1, 21, 12, 2, '#2a1a0d'); R(x, jx + 2, 23, 3, 2, '#5a3a20');
      R(x, jx + 2, 6, 1, 10, rgba('255,230,190', 0.15 + 0.35 * s)); R(x, jx + 5, 0, 5, 1, 'rgba(0,0,0,.4)');
    }
  },
});

/** The family altar: a red lacquered shelf (or cabinet) with photographs, incense, fruit and oil lamps. */
export const altarElement = piece({
  type: 'interior.altar', label: 'Family altar (Old Quarter)', category: 'furniture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 36, 18, 120, 1, 'units'), stand: select('Stands on', ['wall shelf', 'cabinet']), lacquer: { kind: 'color', label: 'Lacquer', default: '#5a140c' },
    photos: num('Photographs', 3, 0, 6), incense: num('Incense sticks', 3, 0, 9), smoke: bool('Smoke rising', true),
    fruit: bool('Fruit offering', true), lamps: num('Oil lamps', 2, 0, 4), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: (p.stand === 'cabinet' ? 34 : 0) + 46 }),
  bounds: p => { const tall = (p.stand === 'cabinet' ? 34 : 0) + 46; return { x: -4, h: tall, w: Number(p.width) + 8, tall: tall + 6 }; },
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, top: { x: Number(p.width) / 2, h: p.stand === 'cabinet' ? 34 : 0, role: 'surface' } }),
  paint(x, p, o) {
    const w = Number(p.width), lac = String(p.lacquer), seed = Number(p.seed), gold = 'rgba(220,170,70,.85)', cab = p.stand === 'cabinet';
    let b = 0;
    if (cab) { R(x, 1, 0, w - 2, 34, '#2a1008'); R(x, 3, 4, w / 2 - 4, 26, lac); R(x, w / 2 + 1, 4, w / 2 - 4, 26, lac); R(x, Math.round(w / 2) - 1, 14, 2, 3, gold); R(x, 1, 33, w - 2, 1, gold); b = 34; }
    else { R(x, 3, -7, 2, 7, '#24160b'); R(x, w - 5, -7, 2, 7, '#24160b'); R(x, 3, -2, 6, 2, '#24160b'); R(x, w - 9, -2, 6, 2, '#24160b'); }
    // the back board with its gold border and painted characters, the shelf
    R(x, 1, b + 3, w - 2, 28, lac); R(x, 1, b + 30, w - 2, 1, gold); R(x, 1, b + 3, 1, 28, gold); R(x, w - 2, b + 3, 1, 28, gold);
    for (let k = 0; k < 3; k++) R(x, Math.round(w / 2) - 1, b + 22 - k * 5, 3, 3, 'rgba(220,170,70,.6)');
    R(x, -2, b + 31, w + 4, 3, '#3a0c06'); R(x, -2, b + 33, w + 4, 1, gold); R(x, -2, b, w + 4, 3, '#3a0c06'); R(x, -2, b + 2, w + 4, 1, gold);
    // photographs in black frames, faded
    const n = Number(p.photos);
    for (let i = 0; i < n; i++) { const px = Math.round(4 + (i + 0.5) * (w - 8) / n) - 3; R(x, px, b + 12, 7, 9, '#120a06'); R(x, px + 1, b + 13, 5, 7, 'rgba(200,180,150,.55)'); R(x, px + 2, b + 15, 3, 4, 'rgba(60,45,35,.6)'); }
    // fruit, the incense pot and its sticks, oil lamps at the ends
    if (p.fruit) for (let k = 0; k < 3; k++) { x.fillStyle = 'rgba(230,130,40,.85)'; x.beginPath(); x.arc(5 + k * 3, y(b + 5 + (k === 1 ? 2 : 0)), 2, 0, Math.PI * 2); x.fill(); }
    const cx = Math.round(w / 2); R(x, cx - 4, b + 3, 9, 5, '#7a5a2a'); R(x, cx - 4, b + 7, 9, 1, 'rgba(255,220,150,.4)');
    const sticks = Number(p.incense);
    for (let i = 0; i < sticks; i++) {
      const sx = cx - Math.floor(sticks / 2) + i, tip = b + 18 + (i % 2) * 2; R(x, sx, b + 8, 1, tip - b - 8, 'rgba(150,60,40,.8)'); R(x, sx, tip, 1, 1, rgba('255,90,40', 0.6 + 0.4 * flicker(o.t, i)));
      if (p.smoke) for (let k = 0; k < 4; k++) { const rise = (o.t * 0.18 + k * 5 + i * 3 + seed) % 22, drift = Math.round(Math.sin((o.t + k * 40) / 50 + i) * 2); R(x, sx + drift, tip + 2 + rise, 1, 2, rgba('230,230,225', Math.max(0, 0.28 - rise * 0.012))); }
    }
    const lamps = Number(p.lamps);
    for (let i = 0; i < lamps; i++) { const lx = lamps === 1 ? w - 6 : Math.round(3 + i * (w - 8) / (lamps - 1)); R(x, lx - 1, b + 3, 4, 3, '#8a6a2a'); flame(x, o, lx + 1, b + 6, i + seed, '255,170,80'); }
    o.light?.(cx, b + 16, w, 24, '255,110,60', 'screen');
  },
});

/** A cut timber floor (boards on joists) or a tiled roof slab between storeys. */
export const timberFloorElement = piece({
  type: 'interior.timber-floor', label: 'Timber floor (cut, Old Quarter)', category: 'architecture', libraryUse: 'reusable',
  fields: { width: num('Width', 120, 10, 4000, 1, 'units'), thickness: num('Thickness', 6, 2, 30, 1, 'units'), surface: select('Surface', ['boards', 'tiles']), wood: { kind: 'color', label: 'Timber', default: '#2a1a0d' } },
  size: p => ({ w: Number(p.width), tall: Number(p.thickness) }),
  bounds: p => ({ x: 0, h: 0, w: Number(p.width), tall: Number(p.thickness) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, end: { x: Number(p.width), h: 0, role: 'mount' } }),
  paint(x, p) {
    const w = Number(p.width), t = Number(p.thickness), wood = String(p.wood);
    R(x, 0, -t, w, t, wood);
    for (let k = 6; k < w - 4; k += 20) R(x, k, -t, 4, Math.max(1, t - 2), 'rgba(0,0,0,.35)');
    if (p.surface === 'tiles') for (let k = 0; k < w; k += 8) R(x, k, -2, 8, 2, Math.floor(k / 8) % 2 ? '#5a2c1a' : '#4a2414');
    else R(x, 0, -2, w, 2, 'rgba(90,58,30,.9)');
    R(x, 0, -1, w, 1, 'rgba(255,190,120,.4)');
  },
});

/** A tiled roof (curved clay tiles, ridge ends turned up) over a cut-open house. */
export const roofSectionElement = piece({
  type: 'interior.roof-section', label: 'Tiled roof (Old Quarter)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 132, 20, 2000, 1, 'units'), rise: num('Rise', 26, 4, 120, 1, 'units'), inset: num('Ridge set in', 16, 0, 400, 1, 'units'),
    tiles: { kind: 'color', label: 'Tiles', default: '#1c0d08' }, ends: bool('Ridge ends turned up', true), moss: num('Moss', 0.3, 0, 1, 0.05), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.rise) + 8 }),
  bounds: p => ({ x: 0, h: Number(p.rise) + 8, w: Number(p.width), tall: Number(p.rise) + 8 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, ridge: { x: Number(p.width) / 2, h: Number(p.rise), role: 'mount' } }),
  paint(x, p) {
    const w = Number(p.width), rise = Number(p.rise), inset = Math.min(Number(p.inset), w / 2 - 2), seed = Number(p.seed);
    x.fillStyle = String(p.tiles); x.beginPath(); x.moveTo(0, 0); x.lineTo(inset, y(rise)); x.lineTo(w - inset, y(rise)); x.lineTo(w, 0); x.closePath(); x.fill();
    for (let k = 0; k < rise; k += 3) {
      const f = k / rise, a = inset * f, b = w - inset * f;
      R(x, a, k + 1, b - a, 1, 'rgba(150,70,40,.28)');
      x.fillStyle = 'rgba(0,0,0,.35)'; for (let tx = a + ((k / 3) % 2) * 3; tx < b; tx += 6) x.fillRect(Math.round(tx), Math.round(y(k + 2)), 1, 2);
      if (hash(seed + k) < Number(p.moss) * 0.5) R(x, a + hash(seed * 3 + k) * (b - a - 8), k + 1, 6, 1, 'rgba(70,100,50,.5)');
    }
    R(x, -1, -1, w + 2, 3, '#0c0604');
    R(x, inset - 2, rise, w - 2 * inset + 4, 3, '#2a140c'); R(x, inset - 2, rise + 2, w - 2 * inset + 4, 1, 'rgba(255,170,110,.35)');
    if (p.ends !== false) for (const [ex, dir] of [[inset - 2, -1], [w - inset + 2, 1]] as const) { R(x, ex + (dir < 0 ? -3 : 0), rise + 2, 3, 3, '#2a140c'); R(x, ex + dir * 3 + (dir < 0 ? -2 : 0), rise + 5, 2, 2, '#2a140c'); }
  },
});

/** A roof terrace: a parapet with green glazed tiles, pots, water jars, a washing line, the small altar to heaven. */
export const roofTerraceElement = piece({
  type: 'interior.roof-terrace', label: 'Roof terrace (Old Quarter)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 144, 30, 1000, 1, 'units'), parapet: num('Parapet height', 14, 4, 40, 1, 'units'), wall: colour('Parapet colour', 'Lime wash'),
    plants: num('Potted plants', 4, 0, 10), jars: num('Water jars', 2, 0, 4), laundry: bool('Washing on bamboo poles', true),
    shrine: bool('Altar to heaven on a post', true), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: 50 }),
  bounds: p => ({ x: 0, h: 50, w: Number(p.width), tall: 50 }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  paint(x, p, o) {
    const w = Number(p.width), ph = Number(p.parapet), seed = Number(p.seed), wall = colourOr(p.wall, '#4a3c22');
    // the parapet at the back, its band of green glazed openwork, the coping
    R(x, 0, 0, w, ph, wall); R(x, 0, ph, w, 2, '#2a1c10'); R(x, 0, ph + 1, w, 1, 'rgba(255,200,140,.3)');
    for (let k = 4; k < w - 6; k += 8) { R(x, k, ph - 8, 6, 5, 'rgba(70,120,90,.75)'); R(x, k + 2, ph - 7, 2, 3, '#14100c'); }
    damp(x, 0, w, ph, 0.4, seed);
    // washing on a line between two bamboo poles
    if (p.laundry) {
      const a = Math.round(w * 0.12), b = Math.round(w * 0.62); R(x, a, 0, 1, 42, 'rgba(190,150,80,.85)'); R(x, b, 0, 1, 42, 'rgba(190,150,80,.85)'); R(x, a, 40, b - a, 1, 'rgba(30,24,20,.9)');
      for (let k = a + 4; k < b - 8; k += 12) { const c = CLOTH[Math.floor(hash(seed + k) * CLOTH.length)], sw = Math.round(Math.sin(o.t / 55 + k)); R(x, k + sw, 26, 9, 14, rgba(c, 0.75)); }
    }
    // the altar to heaven: a small red box on a post, incense in front
    if (p.shrine) { const sx = Math.round(w * 0.8); R(x, sx, 0, 2, 24, '#2a1a0d'); R(x, sx - 6, 24, 14, 10, '#5a140c'); R(x, sx - 6, 33, 14, 1, 'rgba(220,170,70,.8)'); R(x, sx - 3, 26, 8, 5, '#2a0806'); R(x, sx, 31, 1, 4, 'rgba(150,60,40,.8)'); R(x, sx, 35, 1, 1, rgba('255,90,40', 0.6 + 0.4 * flicker(o.t, 2))); }
    const jars = Number(p.jars);
    for (let i = 0; i < jars; i++) { const jx = Math.round(w * 0.66) + i * 12; if (jx + 10 > w) break; x.fillStyle = '#3a2214'; x.beginPath(); x.ellipse(jx + 5, y(7), 6, 7, 0, 0, Math.PI * 2); x.fill(); R(x, jx + 1, 13, 8, 2, '#2a1a0d'); R(x, jx + 2, 4, 1, 6, 'rgba(255,230,190,.25)'); }
    const n = Number(p.plants);
    for (let i = 0; i < n; i++) {
      const px = Math.round(6 + (i + 0.5) * (w * 0.6) / Math.max(1, n)), tall = 6 + Math.round(hash(seed * 5 + i) * 14);
      R(x, px, 0, 7, 6, '#7a3a20'); R(x, px - 1, 5, 9, 2, '#8a4a2a');
      for (let k = 0; k < 5; k++) R(x, px - 2 + Math.round(hash(seed + i * 9 + k) * 8), 7 + Math.round(hash(seed + i * 7 + k) * tall), 4, 3, k % 2 ? '#2e4a22' : '#3a5a28');
    }
    for (let k = 0; k < w; k += 8) R(x, k, -2, 8, 2, Math.floor(k / 8) % 2 ? '#5a2c1a' : '#4a2414');
  },
});

/**
 * A level flight re-dressed: the same run and rise as a `level.stairs` placed at the same spot, drawn
 * over it in timber (a steep house stair) or stone (a tower's turning stair). It covers the concrete
 * flight, its rail and posts; the level flight still does the walking.
 */
export const stairDressElement: AssetDefinition = {
  type: 'interior.stair', version: 1, label: 'Stair dressing (timber or stone, over a level flight)', category: 'architecture', parts: ['backdrop'], libraryUse: 'reusable',
  fields: {
    run: num('Run (as its level flight)', 40, -2000, 2000, 1, 'units'), rise: num('Rise (as its level flight)', 72, -2000, 2000, 1, 'units'),
    material: select('Material', ['timber', 'stone']), colour: colour('Colour', 'The material’s own'),
  },
  bounds: p => { const r = Number(p.run), h = Number(p.rise); return { x: Math.min(0, r) - 2, h: Math.max(0, h) + 34, w: Math.abs(r) + 4, tall: Math.abs(h) + 46 }; },
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, top: { x: Number(p.run), h: Number(p.rise), role: 'mount' } }),
  draw: (x, v, p) => dressFlight(x, v, p),
};
function dressFlight(x: Ctx, v: View, p: Properties) {
  const run = Number(p.run), rise = Number(p.rise), stone = p.material === 'stone', n = Math.max(2, Math.round(Math.abs(rise) / 8)), dx = run / n, dh = rise / n, s = Math.sign(run) || 1;
  const body = colourOr(p.colour, stone ? '#3e3c3a' : '#3a2412'), side = stone ? '#2a2928' : '#24150a', tread = stone ? '#5a5652' : '#5a3a1c', edge = stone ? 'rgba(200,190,175,.45)' : 'rgba(230,170,100,.5)';
  const rect = (wx: number, h: number, w: number, tall: number, c: string) => { const a = v.sx(wx), b = v.sx(wx + w), top = v.y(h + tall), bottom = v.y(h); x.fillStyle = c; x.fillRect(Math.floor(Math.min(a, b)), Math.floor(Math.min(top, bottom)), Math.max(1, Math.ceil(Math.abs(b - a))), Math.max(1, Math.ceil(Math.abs(bottom - top)))); };
  // the stringer (or the masonry under a stone flight), a unit wider than the level flight's
  x.fillStyle = side; x.beginPath(); x.moveTo(v.sx(-s), v.y(1)); x.lineTo(v.sx(run + s), v.y(rise + 1)); x.lineTo(v.sx(run + s), v.y(rise - 11)); x.lineTo(v.sx(-s), v.y(-11)); x.closePath(); x.fill();
  for (let i = 0; i < n; i++) { rect(i * dx - s, (i + 1) * dh - 3, dx + 2 * s, 3, tread); rect(i * dx - s, i * dh - 1, dx + 2 * s, dh, body); rect(i * dx, (i + 1) * dh - 1, dx, 1, edge); }
  // the handrail and its posts over the level flight's: a timber rail, or a rope on iron pins along a stone wall
  x.strokeStyle = stone ? '#6a5a40' : '#4a2e16'; x.lineWidth = 3; x.beginPath(); x.moveTo(v.sx(-s), v.y(30.5)); x.lineTo(v.sx(run + s), v.y(rise + 30.5)); x.stroke();
  x.strokeStyle = edge; x.lineWidth = 1; x.beginPath(); x.moveTo(v.sx(0), v.y(32)); x.lineTo(v.sx(run), v.y(rise + 32)); x.stroke();
  for (let i = 0; i <= n; i += 2) rect(i * dx - 1, i * dh, 3, 31, stone ? '#1e1c1a' : '#2a1a0d');
}

// ---------------------------------------------------------------- St. Agnes

/**
 * The nave seen side-on: the far arcade of pointed arches on piers with the aisle behind, the triforium,
 * the clerestory's stained glass, the rib vault and the roof over it; a crossing opens into the transept,
 * the apse at the right end has tall windows. Daylight falls through in coloured shafts.
 */
export const naveElement = piece({
  type: 'interior.nave', label: 'Church nave (cut open, side-on)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 860, 200, 4000, 1, 'units'), height: num('Vault height', 236, 120, 500, 1, 'units'), arcade: num('Arcade height', 124, 60, 300, 1, 'units'),
    bay: num('Bay width', 110, 50, 300, 1, 'units'), crossing: num('Crossing at (0: none)', 550, 0, 4000, 1, 'units'), crossingWidth: num('Crossing width', 100, 40, 300, 1, 'units'),
    apse: num('Apse at the right end (0: none)', 210, 0, 1000, 1, 'units'), stone: { kind: 'color', label: 'Stone', default: '#2a2a2c' },
    glass: num('Stained glass', 0.8, 0, 1, 0.05), shafts: num('Daylight shafts', 0.6, 0, 1, 0.05), damp: num('Damp', 0.6, 0, 1, 0.05),
    chandeliers: num('Candle chandeliers', 2, 0, 8), chandelierFrom: num('Chandeliers from', 0, 0, 4000, 1, 'units'), roof: bool('Roof over the vault', true), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) + (p.roof !== false ? 56 : 0) }),
  bounds: p => { const tall = Number(p.height) + (p.roof !== false ? 56 : 0); return { x: 0, h: tall, w: Number(p.width), tall }; },
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, crossing: { x: Number(p.crossing) + Number(p.crossingWidth) / 2, h: 0, role: 'mount' }, apse: { x: Number(p.width) - Number(p.apse) / 2, h: 0, role: 'mount' } }),
  paint(x, p, o) {
    const W = Number(p.width), H = Number(p.height), A = Math.min(Number(p.arcade), H - 60), B = Number(p.bay), seed = Number(p.seed), stone = String(p.stone);
    const cr = Number(p.crossing), cw = Number(p.crossingWidth), apse = Math.min(Number(p.apse), W), end = W - apse, glass = Number(p.glass);
    // the far wall's glass and the apse's (it looks out to the right) each see the sun from their own side
    const far = glassLight(o, 0), east = glassLight(o, 90), bright = glassBright(far), brightApse = glassBright(east), dark = '#151517', aisle = '#111113', pierW = 14;
    const triTop = A + 20, clTop = Math.min(H - 30, triTop + 66), vs = clTop + 4;
    // the walls: the vault zone darker than the clerestory, the clerestory than the arcade
    R(x, 0, 0, W, H, stone); R(x, 0, vs, W, H - vs, '#202022');
    x.fillStyle = '#1c1c1e'; x.beginPath(); x.moveTo(0, y(H - 8)); x.lineTo(W, y(H - 8)); x.lineTo(W, y(H)); x.lineTo(0, y(H)); x.fill();
    blocks(x, 0, W, 0, H, 0.16);
    // where the piers stand: every bay up to the crossing, the crossing's two piers, on to the apse
    const piers: number[] = [];
    const upto = cr > 0 ? Math.min(cr, end) : end;
    for (let px = 0; px <= upto + 0.5; px += B) piers.push(px);
    if (cr > 0 && cr < end) { if (piers[piers.length - 1] < cr - 1) piers.push(cr); for (let px = cr + cw; px <= end + 0.5; px += B) piers.push(px); }
    if (piers[piers.length - 1] < end - 1 && apse > 0) piers.push(end);
    const isCrossing = (a: number) => cr > 0 && Math.abs(a - cr) < 1;
    // each bay: the arch opening onto the dark aisle, the aisle's own window and the blind arcade behind
    for (let i = 0; i + 1 < piers.length; i++) {
      const a = piers[i], b = piers[i + 1], l = a + pierW / 2, w = b - a - pierW;
      if (w < 10) continue;
      if (isCrossing(a)) {
        // the crossing: a tall arch into the transept, its far wall dim, a low door in it
        const apex = Math.min(H - 20, A + 84), spring = apex - w * 0.6;
        x.fillStyle = dark; x.beginPath(); arch(x, l, w, 0, spring, apex); x.fill();
        blocks(x, l, w, 0, spring, 0.12);
        R(x, l + w / 2 - 9, 0, 18, 34, '#0c0c0d'); x.fillStyle = '#0c0c0d'; x.beginPath(); arch(x, l + w / 2 - 9, 18, 30, 34, 44); x.fill();
        lancet(x, l + 8, 8, 26, 84, bright * glass * 0.7, seed + i * 31, far.sun * glass); lancet(x, l + w - 16, 8, 26, 84, bright * glass * 0.7, seed + i * 37, far.sun * glass);
        continue;
      }
      const spring = Math.max(A * 0.45, A - w * 0.55);
      x.fillStyle = aisle; x.beginPath(); arch(x, l, w, 0, spring, A); x.fill();
      // depth: the aisle wall's blind arcade beyond, fainter and smaller
      x.strokeStyle = 'rgba(120,115,108,.18)'; x.lineWidth = 1; x.beginPath(); arch(x, l + w * 0.18, w * 0.64, 0, spring * 0.78, A * 0.8); x.stroke();
      x.strokeStyle = 'rgba(120,115,108,.1)'; x.beginPath(); arch(x, l + w * 0.3, w * 0.4, 0, spring * 0.62, A * 0.64); x.stroke();
      lancet(x, l + w / 2 - 5, 10, 34, Math.min(spring + 6, A - 18), bright * glass * 0.8, seed + i * 13, far.sun * glass);
      x.strokeStyle = 'rgba(150,140,128,.35)'; x.beginPath(); arch(x, l, w, 0, spring, A); x.stroke();
    }
    // triforium: a string course and small dark openings in pairs
    for (const [l, r] of cr > 0 && cr < end ? [[0, cr], [cr + cw, end]] : [[0, end]]) {
      R(x, l, A + 3, r - l, 2, '#3a3a3c'); R(x, l, A + 5, r - l, 1, 'rgba(210,190,160,.18)'); R(x, l, triTop, r - l, 2, '#343436');
    }
    for (let i = 0; i + 1 < piers.length; i++) {
      const a = piers[i], b = piers[i + 1]; if (isCrossing(a) || b > end + 0.5) continue;
      for (let k = a + 14; k < b - 12; k += 10) { R(x, k, A + 7, 5, 9, '#0c0c0d'); x.fillStyle = '#0c0c0d'; x.beginPath(); arch(x, k, 5, A + 14, A + 15, A + 18); x.fill(); }
      // the clerestory: two stained-glass lancets per bay
      const m = (a + b) / 2, lw = Math.min(14, (b - a) / 6);
      lancet(x, m - lw - 4, lw, triTop + 6, clTop - 4, bright * glass, seed + i * 7, far.sun * glass); lancet(x, m + 4, lw, triTop + 6, clTop - 4, bright * glass, seed + i * 11, far.sun * glass);
      if (far.sun > 0.1) o.light?.(m, (triTop + clTop) / 2, 2 * lw + 8, clTop - triTop, '230,200,160', 'window');
      // a faint wash of the sun's light from them on the wall below (the strong shafts are interior.window-light), on the sun's slant
      const s = Number(p.shafts) * far.sun, k = sunSlope(o);
      if (s > 0.02 && k !== null) {
        const top = clTop - 4, ka = (m - lw - 4) + top * k, kb = (m + lw + 4) + (triTop + 6) * k;
        x.fillStyle = rgba('255,240,215', 0.05 * s); x.beginPath(); x.moveTo(m - lw - 4, y(top)); x.lineTo(m + lw + 4, y(top)); x.lineTo(m + lw + 4, y(triTop + 6)); x.lineTo(kb, 0); x.lineTo(ka, 0); x.closePath(); x.fill();
      }
    }
    // the apse: tall lancets close together, the half dome's ribs over them
    if (apse > 0) {
      R(x, end, 0, apse, H, '#242426'); blocks(x, end, apse, 0, H, 0.14);
      const n = Math.max(1, Math.floor(apse / 44));
      for (let k = 0; k < n; k++) { const lx = end + (k + 0.5) * apse / n - 6; lancet(x, lx, 12, 46, Math.min(H - 50, 190), brightApse * glass, seed + k * 17 + 5, east.sun * glass); }
      x.strokeStyle = 'rgba(150,140,128,.3)'; for (let k = 1; k <= 3; k++) { x.beginPath(); x.moveTo(end, y(H - 30 - k * 8)); x.quadraticCurveTo(end + apse / 2, y(H - 4 - k * 4), W, y(H - 30 - k * 8)); x.stroke(); }
      R(x, end, 30, apse, 2, '#3a3a3c');
    }
    // the rib vault: diagonal ribs from every pier up to the ridge, so the bays march along the nave
    x.lineWidth = 2;
    for (let i = 0; i + 1 < piers.length; i++) {
      const a = piers[i], b = piers[i + 1], m = (a + b) / 2; if (b > end + 0.5) continue;
      x.strokeStyle = '#3a3836'; x.beginPath(); x.moveTo(a, y(vs)); x.quadraticCurveTo(a + (b - a) * 0.12, y(H - 10), m, y(H - 8)); x.quadraticCurveTo(b - (b - a) * 0.12, y(H - 10), b, y(vs)); x.stroke();
    }
    x.lineWidth = 1; x.strokeStyle = 'rgba(210,190,160,.15)';
    for (let i = 0; i + 1 < piers.length; i++) { const a = piers[i], b = piers[i + 1], m = (a + b) / 2; if (b > end + 0.5) continue; x.beginPath(); x.moveTo(a, y(vs + 1)); x.quadraticCurveTo(a + (b - a) * 0.12, y(H - 9), m, y(H - 7)); x.stroke(); }
    R(x, 0, H - 9, end, 2, '#3a3836');
    // the piers: plinth, shaft, capital, and the vaulting shaft rising to the ribs; a warm rim from the candles
    for (const px of piers) {
      const big = isCrossing(px) || (cr > 0 && Math.abs(px - cr - cw) < 1), pw = big ? 20 : pierW, l = px - pw / 2;
      if (px > end + 0.5) continue;
      R(x, l - 2, 0, pw + 4, 8, '#3a3a3c'); R(x, l, 8, pw, A * 0.62 - 8, '#343436'); R(x, l - 3, A * 0.62, pw + 6, 5, '#3e3e40'); R(x, l - 3, A * 0.62 + 4, pw + 6, 1, 'rgba(210,190,160,.3)');
      R(x, px - 2, A * 0.62 + 5, 4, vs - A * 0.62 - 5, '#38383a'); R(x, px - 3, vs - 2, 6, 3, '#3e3e40');
      R(x, l, 8, 1, A * 0.62 - 8, 'rgba(255,190,120,.3)'); R(x, l + pw - 2, 8, 2, A * 0.62 - 8, 'rgba(0,0,0,.3)');
    }
    damp(x, 0, W, H * 0.8, Number(p.damp), seed);
    // candle chandeliers on chains from the vault: an iron ring of candles over the nave
    const ch = Number(p.chandeliers), c0 = Math.min(Number(p.chandelierFrom), end - 20), span = (cr > c0 ? Math.min(cr, end) : end) - c0;
    for (let k = 0; k < ch; k++) {
      const cx = Math.round(c0 + (k + 0.5) * span / ch), hh = A + 6; R(x, cx, hh + 4, 1, vs - hh - 4, 'rgba(20,18,16,.9)');
      R(x, cx - 12, hh, 25, 2, '#1a1816'); R(x, cx - 8, hh - 4, 17, 2, '#1a1816'); R(x, cx, hh - 8, 1, 6, '#1a1816');
      for (let c = -12; c <= 12; c += 6) { R(x, cx + c, hh + 2, 1, 3, 'rgba(230,220,200,.8)'); flame(x, o, cx + c, hh + 5, k * 5 + c); }
      const g = x.createRadialGradient(cx, y(hh + 4), 0, cx, y(hh + 4), 46); g.addColorStop(0, 'rgba(255,190,110,' + (0.12 * flameLevel(o)).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,190,110,0)');
      x.fillStyle = g; x.fillRect(cx - 46, y(hh + 50), 92, 92);
    }
    // the floor: worn flags
    for (let k = 0; k < W; k += 16) R(x, k, 0, 15, 2, k % 32 ? '#3a3836' : '#343230');
    R(x, 0, 2, W, 1, 'rgba(210,190,160,.15)');
    // the roof over the vault, seen along its length: a cornice, slates in rows, the ridge and its cross
    if (p.roof !== false) {
      R(x, 0, H, W, 4, '#1a1a1c'); R(x, 0, H + 3, W, 1, 'rgba(210,190,160,.2)');
      x.fillStyle = '#121214'; x.beginPath(); x.moveTo(-4, y(H + 4)); x.lineTo(20, y(H + 50)); x.lineTo(W - 20, y(H + 50)); x.lineTo(W + 4, y(H + 4)); x.closePath(); x.fill();
      for (let k = 6; k < 46; k += 4) { const f = (k - 4) / 46, a = -4 + 24 * f, b = W + 4 - 24 * f; R(x, a, H + k, b - a, 1, 'rgba(120,120,130,.12)'); }
      R(x, 18, H + 49, W - 36, 3, '#1e1e20'); R(x, 18, H + 51, W - 36, 1, 'rgba(210,190,160,.25)');
    }
  },
});

/** A rose window: petals of coloured glass in stone tracery, round a small centre. */
export const roseWindowElement = piece({
  type: 'interior.rose-window', label: 'Rose window', category: 'architecture', libraryUse: 'reusable',
  fields: { radius: num('Radius', 34, 10, 120, 1, 'units'), petals: num('Petals', 12, 6, 24), glass: num('Stained glass', 0.9, 0, 1, 0.05), frame: { kind: 'color', label: 'Stone frame', default: '#1a1918' },
    faces: select('Looks out from', Object.keys(WINDOW_FACES)), seed: num('Seed', 1, 0, 1000000) },
  size: p => ({ w: Number(p.radius) * 2 + 8, tall: Number(p.radius) * 2 + 8 }),
  bounds: p => { const d = Number(p.radius) * 2 + 8; return { x: 0, h: d, w: d, tall: d }; },
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, centre: { x: Number(p.radius) + 4, h: Number(p.radius) + 4, role: 'mount' } }),
  paint(x, p, o) {
    const r = Number(p.radius), c = r + 4, cy = y(c), n = Number(p.petals), seed = Number(p.seed), gl = glassLight(o, WINDOW_FACES[String(p.faces)] ?? 0), bright = glassBright(gl) * Number(p.glass), sun = gl.sun * Number(p.glass);
    const tint = (i: number) => sun > 0 ? mixRgb(GLASS[i % GLASS.length], GLASS_LIT[i % GLASS.length], Math.min(1, sun * 1.3)) : GLASS[i % GLASS.length];
    x.fillStyle = String(p.frame); x.beginPath(); x.arc(c, cy, r + 4, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#08080a'; x.beginPath(); x.arc(c, cy, r, 0, Math.PI * 2); x.fill();
    for (let k = 0; k < n; k++) {
      const a0 = (k * Math.PI * 2) / n, a1 = ((k + 1) * Math.PI * 2) / n, col = tint(k + seed);
      x.fillStyle = rgba(col, Math.min(0.97, 0.15 + 0.75 * bright)); x.beginPath(); x.moveTo(c, cy); x.arc(c, cy, r - 1, a0 + 0.04, a1 - 0.04); x.closePath(); x.fill();
      x.fillStyle = rgba(tint(k + seed + 2), Math.min(0.95, 0.1 + 0.6 * bright)); x.beginPath(); x.moveTo(c, cy); x.arc(c, cy, r * 0.55, a0 + 0.08, a1 - 0.08); x.closePath(); x.fill();
    }
    x.strokeStyle = String(p.frame); x.lineWidth = 2;
    for (let k = 0; k < n; k++) { const a = (k * Math.PI * 2) / n; x.beginPath(); x.moveTo(c + Math.cos(a) * r * 0.2, cy + Math.sin(a) * r * 0.2); x.lineTo(c + Math.cos(a) * r, cy + Math.sin(a) * r); x.stroke(); }
    x.beginPath(); x.arc(c, cy, r * 0.55, 0, Math.PI * 2); x.stroke();
    x.fillStyle = String(p.frame); x.beginPath(); x.arc(c, cy, r * 0.2, 0, Math.PI * 2); x.fill();
    x.fillStyle = rgba('220,180,80', 0.2 + 0.7 * bright); x.beginPath(); x.arc(c, cy, r * 0.12, 0, Math.PI * 2); x.fill();
    // the sun through it: a soft glow over the tracery and a halo round the stone
    if (sun > 0.05) {
      x.save(); x.globalCompositeOperation = 'screen';
      for (let k = 0; k < n; k++) { const a = ((k + 0.5) * Math.PI * 2) / n; x.fillStyle = rgba(tint(k + seed), 0.2 * sun); x.beginPath(); x.arc(c + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62, r * 0.42, 0, Math.PI * 2); x.fill(); }
      const g = x.createRadialGradient(c, cy, r * 0.5, c, cy, r * 1.6); g.addColorStop(0, 'rgba(255,236,200,' + (0.2 * sun).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,236,200,0)');
      x.fillStyle = g; x.fillRect(c - r * 1.6, cy - r * 1.6, r * 3.2, r * 3.2);
      x.restore();
    }
    x.strokeStyle = 'rgba(210,190,160,.25)'; x.lineWidth = 1; x.beginPath(); x.arc(c, cy, r + 4, Math.PI * 1.05, Math.PI * 1.6); x.stroke();
    if (sun > 0.1) o.light?.(c, c, r * 2, r * 2, '230,180,140', 'window');
  },
});

/** Pews seen from their ends, facing right (towards the altar): back, seat, kneeler, hymn books; a second row behind. */
export const pewsElement = piece({
  type: 'interior.pews', label: 'Church pews (seen from the end)', category: 'furniture', libraryUse: 'reusable',
  fields: {
    count: num('Pews', 6, 1, 30), spacing: num('Spacing', 44, 24, 120, 1, 'units'), rows: num('Rows in depth', 2, 1, 3),
    wood: { kind: 'color', label: 'Wood', default: '#3a2414' }, kneelers: bool('Kneelers', true), books: bool('Hymn books', true),
  },
  size: p => ({ w: Number(p.count) * Number(p.spacing), tall: 36 }),
  bounds: p => ({ x: 0, h: 36, w: Number(p.count) * Number(p.spacing), tall: 36 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, seat: { x: 10, h: 0, role: 'surface' }, next: { x: Number(p.spacing), h: 0, role: 'mount' } }),
  paint(x, p) {
    const n = Number(p.count), sp = Number(p.spacing), wood = String(p.wood), rows = Number(p.rows);
    for (let row = rows - 1; row >= 0; row--) {
      const ox = row * 5, oh = row * 3, back = row > 0;
      for (let i = 0; i < n; i++) {
        const x0 = i * sp + ox;
        R(x, x0, oh, 3, 30, wood); R(x, x0 - 1, oh + 30, 5, 2, wood); R(x, x0, oh + 13, 20, 3, wood); R(x, x0 + 17, oh, 2, 13, wood); R(x, x0 + 2, oh, 2, 13, wood);
        if (p.kneelers !== false) R(x, x0 + sp - 12, oh + 3, 9, 2, '#2a1a0e');
        if (p.books !== false) { R(x, x0 - 5, oh + 20, 5, 1, wood); R(x, x0 - 4, oh + 21, 1, 4, 'rgba(120,30,30,.8)'); R(x, x0 - 3, oh + 21, 1, 3, 'rgba(40,40,60,.8)'); }
        if (back) { const d = 'rgba(0,0,0,' + (0.3 + row * 0.15) + ')'; R(x, x0, oh, 3, 30, d); R(x, x0 - 1, oh + 30, 5, 2, d); R(x, x0, oh + 13, 20, 3, d); R(x, x0 + 17, oh, 2, 13, d); R(x, x0 + 2, oh, 2, 13, d); continue; }
        R(x, x0, oh + 31, 4, 1, 'rgba(255,200,140,.4)'); R(x, x0, oh + 15, 20, 1, 'rgba(255,200,140,.3)'); R(x, x0, oh, 1, 30, 'rgba(255,200,140,.2)');
      }
    }
  },
});

/** The high altar: steps, a stone altar with its cloth and frontal, candles, a crucifix, the red sanctuary lamp, flowers. */
export const churchAltarElement = piece({
  type: 'interior.church-altar', label: 'Church altar', category: 'furniture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 90, 40, 300, 1, 'units'), steps: num('Steps', 2, 0, 4), candles: num('Candles', 6, 0, 12),
    cloth: { kind: 'color', label: 'Altar cloth', default: '#d8d0c0' }, frontal: { kind: 'color', label: 'Frontal', default: '#5a1a18' },
    crucifix: bool('Crucifix', true), lamp: bool('Sanctuary lamp', true), flowers: bool('Flowers', true),
  },
  size: p => ({ w: Number(p.width), tall: 150 }),
  bounds: p => ({ x: -Number(p.steps) * 8 - 20, h: 150, w: Number(p.width) + Number(p.steps) * 16 + 20, tall: 150 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, front: { x: -Number(p.steps) * 8, h: 0, role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), st = Number(p.steps), ph = st * 4, cloth = String(p.cloth), cx = Math.round(w / 2), gold = 'rgba(210,170,80,.85)';
    for (let s = 0; s < st; s++) { const k = (st - s) * 8; R(x, -k, s * 4, w + 2 * k, 4, s % 2 ? '#3e3c3a' : '#3a3836'); R(x, -k, s * 4 + 3, w + 2 * k, 1, 'rgba(210,190,160,.3)'); }
    if (p.crucifix !== false) { R(x, cx - 1, ph + 30, 3, 70, '#1e140c'); R(x, cx - 14, ph + 84, 29, 3, '#1e140c'); R(x, cx, ph + 70, 1, 14, 'rgba(220,205,180,.7)'); R(x, cx - 7, ph + 82, 15, 1, 'rgba(220,205,180,.6)'); R(x, cx - 1, ph + 84, 3, 3, 'rgba(220,205,180,.7)'); }
    R(x, 8, ph, w - 16, 30, '#3a3836'); blocks(x, 8, w - 16, ph, ph + 30, 0.2);
    R(x, cx - 16, ph + 3, 32, 22, String(p.frontal)); R(x, cx - 16, ph + 24, 32, 1, gold); R(x, cx - 16, ph + 3, 32, 1, gold); R(x, cx - 1, ph + 7, 2, 14, gold); R(x, cx - 5, ph + 16, 10, 2, gold);
    R(x, 4, ph + 28, w - 8, 3, cloth); R(x, 4, ph + 14, 3, 14, cloth); R(x, w - 7, ph + 14, 3, 14, cloth); R(x, 4, ph + 30, w - 8, 1, 'rgba(255,250,240,.5)');
    const n = Number(p.candles);
    for (let i = 0; i < n; i++) { const lx = Math.round(10 + (i + 0.5) * (w - 20) / n); if (Math.abs(lx - cx) < 4) continue; R(x, lx - 2, ph + 31, 5, 1, '#8a6a2a'); R(x, lx, ph + 32, 1, 6, '#8a6a2a'); R(x, lx, ph + 38, 1, 7, 'rgba(235,228,215,.9)'); flame(x, o, lx, ph + 45, i * 3); }
    if (n > 0) { const g = x.createRadialGradient(cx, y(ph + 44), 0, cx, y(ph + 44), w * 0.8); g.addColorStop(0, 'rgba(255,190,110,' + (0.16 * flameLevel(o)).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,190,110,0)'); x.fillStyle = g; x.fillRect(cx - w, y(ph + 44 + w), 2 * w, 2 * w); }
    if (p.flowers !== false) for (const fx of [-st * 8 + 2, w + st * 8 - 8]) { R(x, fx, ph, 6, 8, '#5a5650'); for (let k = 0; k < 4; k++) R(x, fx - 1 + k * 2, ph + 9 + (k % 2) * 3, 2, 2, 'rgba(235,230,215,.9)'); R(x, fx + 2, ph + 8, 1, 6, '#2e4a22'); }
    if (p.lamp !== false) { const lx = -st * 8 - 12; R(x, lx, 112, 1, 38, 'rgba(60,50,40,.9)'); R(x, lx - 3, 106, 7, 6, '#4a3a20'); R(x, lx - 2, 107, 5, 4, rgba('230,40,30', 0.55 + 0.4 * flicker(o.t, 9))); o.light?.(lx, 109, 6, 6, '230,40,30', 'screen'); }
  },
});

/** A votive stand: tiers of small candles, a cash box on its post and the card that goes with it. */
export const votiveStandElement = piece({
  type: 'interior.votive-stand', label: 'Votive candle stand with cash box', category: 'furniture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 40, 20, 160, 1, 'units'), tiers: num('Tiers', 3, 1, 5), candles: num('Candles', 18, 0, 60), lit: num('Share lit', 0.7, 0, 1, 0.05),
    box: bool('Cash box', true), notice: text('Card on the box post', 'CASH ONLY'), price: text('Card on the stand (empty: none)', 'CANDLES 2'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width) + (p.box !== false ? 30 : 0), tall: 80 }),
  bounds: p => ({ x: -10, h: 80, w: Number(p.width) + (p.box !== false ? 50 : 20), tall: 80 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, box: { x: Number(p.width) + 10, h: 0, role: 'handle' } }),
  paint(x, p, o) {
    const w = Number(p.width), tiers = Number(p.tiers), n = Number(p.candles), seed = Number(p.seed), top = 18 + (tiers - 1) * 8;
    // the warm patch the candles throw on the wall behind
    const g = x.createRadialGradient(w / 2, y(top), 0, w / 2, y(top), w + 30); g.addColorStop(0, 'rgba(255,180,90,' + (0.2 * flameLevel(o) * Number(p.lit)).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,180,90,0)');
    x.fillStyle = g; x.fillRect(w / 2 - w - 30, y(top + w + 30), 2 * (w + 30), 2 * (w + 30));
    R(x, 2, 0, 2, 18, '#1a1614'); R(x, w - 4, 0, 2, 18, '#1a1614'); R(x, 0, 0, w, 1, '#1a1614');
    let i = 0;
    for (let k = 0; k < tiers; k++) {
      const th = 18 + k * 8, inset = k * 4, tw = w - 2 * inset; R(x, inset, th, tw, 2, '#2a2420'); R(x, inset, th + 1, tw, 1, 'rgba(255,200,140,.35)');
      const per = Math.ceil(n / tiers);
      for (let c = 0; c < per && i < n; c++, i++) {
        const cx = Math.round(inset + 2 + (c + 0.5) * (tw - 4) / per); R(x, cx, th + 2, 1, 3, 'rgba(235,228,215,.85)');
        if (hash(seed * 17 + i) < Number(p.lit)) { R(x, cx, th + 5, 1, 1, rgba('255,210,120', 0.6 + 0.4 * flicker(o.t, i))); if (i % 4 === 0) o.light?.(cx, th + 5, 4, 4, '255,200,110', 'screen'); }
      }
    }
    if (p.price) { R(x, Math.round(w / 2), top + 2, 1, 6, '#1a1614'); card(x, o, Math.round(w / 2), top + 14, String(p.price)); }
    if (p.box !== false) {
      const bx = w + 10; R(x, bx - 1, 0, 3, 64, '#2a1c10'); R(x, bx - 4, 0, 9, 2, '#2a1c10');
      R(x, bx - 8, 26, 17, 12, '#3a2414'); R(x, bx - 8, 37, 17, 1, 'rgba(255,200,140,.35)'); R(x, bx - 4, 36, 9, 1, '#050403'); R(x, bx - 1, 28, 3, 3, '#8a7a4a');
      card(x, o, bx, 70, String(p.notice ?? ''));
    }
  },
});

/** A confessional: a carved timber cabinet with the priest's door between two curtained sides, a small light over it. */
export const confessionalElement = piece({
  type: 'interior.confessional', label: 'Confessional', category: 'furniture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 70, 40, 200, 1, 'units'), height: num('Height', 62, 44, 120, 1, 'units'),
    wood: { kind: 'color', label: 'Wood', default: '#2e1c10' }, curtain: { kind: 'color', label: 'Curtains', default: '#4a1418' },
    occupied: bool('Priest inside (light on)', true), sign: text('Card on the door (empty: none)', ''),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) + 8 }),
  bounds: p => ({ x: 0, h: Number(p.height) + 8, w: Number(p.width), tall: Number(p.height) + 8 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, door: { x: Number(p.width) / 2, h: 0, role: 'entrance' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), wood = String(p.wood), cur = String(p.curtain), side = Math.round(w * 0.3), mid = w - 2 * side;
    R(x, 0, 0, w, H - 6, wood); R(x, -2, H - 8, w + 4, 4, wood); R(x, -2, H - 5, w + 4, 1, 'rgba(255,200,140,.3)');
    for (const [l, bw] of [[0, side], [side, mid], [w - side, side]] as const) { x.fillStyle = wood; x.beginPath(); x.moveTo(l + 1, y(H - 4)); x.lineTo(l + bw / 2, y(H + 8)); x.lineTo(l + bw - 1, y(H - 4)); x.closePath(); x.fill(); R(x, Math.round(l + bw / 2), H + 6, 1, 3, wood); }
    for (const l of [3, w - side + 3]) { R(x, l, 2, side - 6, H - 14, cur); for (let k = l + 2; k < l + side - 7; k += 3) R(x, k, 2, 1, H - 14, 'rgba(0,0,0,.3)'); R(x, l, H - 12, side - 6, 1, 'rgba(200,170,90,.6)'); }
    R(x, side + 2, 0, mid - 4, H - 12, '#24160b'); R(x, side + 4, 4, mid - 8, 14, 'rgba(0,0,0,.25)'); R(x, side + 4, H - 34, mid - 8, 14, '#0a0806');
    x.fillStyle = 'rgba(120,90,50,.6)'; for (let k = side + 6; k < side + mid - 4; k += 3) x.fillRect(k, y(H - 20), 1, 14);
    R(x, side + mid - 8, 24, 2, 2, 'rgba(200,170,90,.8)');
    R(x, 0, 0, 1, H - 6, 'rgba(255,200,140,.3)'); R(x, side, 0, 2, H - 8, 'rgba(0,0,0,.3)'); R(x, w - side - 2, 0, 2, H - 8, 'rgba(0,0,0,.3)');
    const on = p.occupied !== false; R(x, Math.round(w / 2) - 2, H - 11, 4, 3, on ? rgba('255,200,110', 0.6 + 0.4 * flicker(o.t, 4)) : '#2a2420'); if (on) o.light?.(w / 2, H - 10, 6, 4, '255,200,110', 'screen');
    if (p.sign) card(x, o, Math.round(w / 2), H - 44, String(p.sign));
  },
});

/** The organ loft: a gallery on a beam and its column, a balustrade, the organ case with its pipes. */
export const organLoftElement = piece({
  type: 'interior.organ-loft', label: 'Organ loft', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 170, 60, 600, 1, 'units'), height: num('Loft floor height', 100, 50, 300, 1, 'units'), columns: num('Columns under it', 1, 0, 4),
    pipes: num('Pipes', 17, 0, 60), metal: { kind: 'color', label: 'Pipe metal', default: '#8a7a5a' }, wood: { kind: 'color', label: 'Wood', default: '#2e1c10' },
    stone: { kind: 'color', label: 'Stone', default: '#343436' },
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) + 96 }),
  bounds: p => ({ x: 0, h: Number(p.height) + 96, w: Number(p.width), tall: Number(p.height) + 96 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, floor: { x: 0, h: Number(p.height), role: 'surface' } }),
  paint(x, p, o) {
    const w = Number(p.width), h = Number(p.height), wood = String(p.wood), metal = String(p.metal), mrgb = rgb(isHex(metal) ? metal : '#8a7a5a');
    // the case and its pipes behind the balustrade: three flats, the middle one tallest
    const c0 = Math.round(w * 0.12), c1 = Math.round(w * 0.88), cH = 90;
    R(x, c0, h + 2, c1 - c0, cH - 20, wood); R(x, c0 + 8, h + cH - 18, c1 - c0 - 16, 16, wood);
    x.fillStyle = wood; x.beginPath(); x.moveTo(c0 + 8, y(h + cH - 2)); x.lineTo((c0 + c1) / 2, y(h + cH + 6)); x.lineTo(c1 - 8, y(h + cH - 2)); x.closePath(); x.fill();
    const n = Number(p.pipes), pw = 4, gap = n > 0 ? (c1 - c0 - 12) / n : 0;
    for (let i = 0; i < n; i++) {
      const px = Math.round(c0 + 6 + i * gap), f = Math.abs((i + 0.5) / n - 0.5) * 2, ph = Math.round((cH - 14) * (1 - 0.45 * f)) - (i % 2) * 4;
      R(x, px, h + 18, pw, ph - 16, rgba(mrgb, 0.85)); R(x, px, h + 18, 1, ph - 16, 'rgba(255,240,210,.35)'); R(x, px + pw - 1, h + 18, 1, ph - 16, 'rgba(0,0,0,.35)');
      R(x, px, h + 24, pw, 2, '#14100c'); R(x, px + 1, h + 18, pw - 2, 3, 'rgba(0,0,0,.4)');
    }
    R(x, c0, h + 18, c1 - c0, 2, '#1e1209');
    // the music desk light: one small warm lamp
    R(x, (c0 + c1) / 2 - 6, h + 14, 12, 2, '#1e1209'); R(x, (c0 + c1) / 2 - 1, h + 16, 3, 2, rgba('255,210,140', 0.7 * flameLevel(o))); o.light?.((c0 + c1) / 2, h + 17, 6, 4, '255,210,140', 'screen');
    // the columns, the beam with its carved fascia, the balustrade
    const cols = Number(p.columns);
    for (let k = 0; k < cols; k++) { const cx = cols === 1 ? w - 6 : Math.round((k + 1) * w / cols) - 6; R(x, cx - 4, 0, 8, h - 10, String(p.stone)); R(x, cx - 6, 0, 12, 6, String(p.stone)); R(x, cx - 6, h - 14, 12, 4, '#3e3e40'); R(x, cx - 4, 6, 1, h - 20, 'rgba(255,190,120,.25)'); }
    R(x, 0, h - 10, w, 10, '#24180e'); for (let k = 6; k < w - 10; k += 16) R(x, k, h - 8, 10, 6, 'rgba(0,0,0,.3)'); R(x, 0, h - 1, w, 1, 'rgba(255,200,140,.35)'); R(x, 0, h - 11, w, 1, 'rgba(0,0,0,.5)');
    R(x, 0, h, w, 2, wood); for (let k = 2; k < w; k += 6) R(x, k, h + 2, 2, 12, wood);
    R(x, -2, h + 14, w + 4, 3, wood); R(x, -2, h + 16, w + 4, 1, 'rgba(255,200,140,.35)');
  },
});

/**
 * The bell tower cut open: the stone shaft with its slit windows, landings turning left and right for
 * the flights, the bell rope, the belfry floor, the bells in their frame and the open arches over the
 * roofs (the scene's sky and the Spire show through them), the pyramid roof.
 */
export const bellTowerElement = piece({
  type: 'interior.bell-tower', label: 'Bell tower (cut open)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 180, 60, 400, 1, 'units'), shaft: num('Belfry floor height', 256, 40, 800, 1, 'units'), belfry: num('Belfry height', 74, 40, 200, 1, 'units'),
    flights: num('Flights (landings between them)', 4, 1, 12), landing: num('Landing width', 60, 20, 200, 1, 'units'),
    bells: num('Bells', 3, 0, 4), swing: num('Bells swinging', 0.2, 0, 1, 0.05), openings: num('Arches open to the sky', 2, 1, 4), louvres: num('Louvres over the arches', 0.3, 0, 1, 0.05),
    roofs: bool('Roofs seen through the arches', true), rope: bool('Bell rope', true), door: select('Door at the foot', ['right', 'left', 'none']),
    stone: { kind: 'color', label: 'Stone', default: '#2a2a2c' }, seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.shaft) + Number(p.belfry) + 70 }),
  bounds: p => { const tall = Number(p.shaft) + Number(p.belfry) + 70; return { x: 0, h: tall, w: Number(p.width), tall }; },
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, belfry: { x: 0, h: Number(p.shaft), role: 'surface' } }),
  paint(x, p, o) {
    const W = Number(p.width), S = Number(p.shaft), Bh = Number(p.belfry), top = S + Bh, seed = Number(p.seed), stone = String(p.stone), fl = Number(p.flights), lw = Number(p.landing), s = sky(o);
    // the shaft's far wall, dim and damp, slit windows on the turns
    R(x, 0, 0, W, S, '#1e1e20'); blocks(x, 0, W, 0, S, 0.2); damp(x, 0, W, S, 0.7, seed);
    for (let k = 1; k <= fl; k++) {
      const sh = (k - 0.5) * S / fl, sx = k % 2 ? Math.round(W * 0.3) : Math.round(W * 0.66);
      R(x, sx - 1, sh - 1, 6, 24, '#0a0a0b'); R(x, sx, sh, 4, 22, rgba('190,200,215', 0.08 + 0.5 * s)); if (s > 0.1) R(x, sx - 6, sh - 22, 16, 2, rgba('220,225,230', 0.08 * s));
    }
    // landings where the stair turns: right, left, right…
    for (let k = 1; k < fl; k++) { const lh = k * S / fl, lx = k % 2 ? W - lw : 0; R(x, lx, lh - 6, lw, 6, '#3a3836'); R(x, lx, lh - 1, lw, 1, 'rgba(210,190,160,.4)'); R(x, lx, lh - 7, lw, 1, 'rgba(0,0,0,.4)'); }
    // the belfry: its back wall with the arches left open, the louvres over their lower part
    const n = Number(p.openings), aw = Math.min(40, (W - 16) / n - 12), ab = S + 12, at = top - 8;
    x.fillStyle = stone; x.beginPath(); x.rect(0, y(top), W, Bh);
    for (let k = 0; k < n; k++) { const ax = 8 + (k + 0.5) * (W - 16) / n - aw / 2; arch(x, ax, aw, ab, at - aw * 0.7, at); }
    x.fill('evenodd');
    blocks(x, 0, W, S, top, 0.16);
    for (let k = 0; k < n; k++) {
      const ax = 8 + (k + 0.5) * (W - 16) / n - aw / 2;
      if (p.roofs !== false) {
        // far roofs over the city, low in the arch: dark tiles, a lit window or two
        for (let rx = 0; rx < aw; rx += 7) { const rh = 4 + Math.round(hash(seed + k * 31 + rx) * 10); R(x, ax + rx, ab, 7, rh, '#120c0a'); R(x, ax + rx, ab + rh, 7, 1, 'rgba(150,80,50,.35)'); if (hash(seed * 3 + rx + k) < 0.25) R(x, ax + rx + 3, ab + 2, 1, 1, rgba('255,190,110', 0.4 + 0.5 * o.lighting.night)); }
      }
      const lv = Number(p.louvres);
      for (let h = at - 6; h > at - (at - ab) * lv; h -= 5) { R(x, ax, h, aw, 2, '#1e1610'); R(x, ax, h + 1, aw, 1, 'rgba(255,200,140,.15)'); }
      x.strokeStyle = 'rgba(210,190,160,.35)'; x.lineWidth = 1; x.beginPath(); arch(x, ax, aw, ab, at - aw * 0.7, at); x.stroke();
      R(x, ax - 2, ab - 2, aw + 4, 2, '#3a3836');
    }
    // the bells in their timber frame
    const nb = Number(p.bells), beam = top - 14;
    if (nb > 0) { R(x, 10, S, 4, beam - S + 4, '#2a1a0d'); R(x, W - 14, S, 4, beam - S + 4, '#2a1a0d'); R(x, 8, beam, W - 16, 5, '#2a1a0d'); R(x, 8, beam + 4, W - 16, 1, 'rgba(255,200,140,.3)'); }
    for (let k = 0; k < nb; k++) {
      const bx = Math.round(W * (k + 1) / (nb + 1)), size = 16 - k * 3, ang = Number(p.swing) * 0.25 * Math.sin(o.t / 45 + k * 1.3);
      x.save(); x.translate(bx, y(beam)); x.rotate(ang);
      x.fillStyle = '#4a3418'; x.fillRect(-1, 0, 3, 4);
      x.beginPath(); x.moveTo(-size * 0.35, 4); x.lineTo(size * 0.35, 4); x.lineTo(size * 0.45, 4 + size * 0.7); x.lineTo(size * 0.7, 4 + size * 1.1); x.lineTo(-size * 0.7, 4 + size * 1.1); x.lineTo(-size * 0.45, 4 + size * 0.7); x.closePath(); x.fill();
      x.fillStyle = 'rgba(230,180,100,.45)'; x.fillRect(Math.round(-size * 0.4), 5, 1, Math.round(size * 0.7)); x.fillRect(Math.round(-size * 0.7), Math.round(3 + size * 1.1), Math.round(size * 1.4), 1);
      x.fillStyle = '#1a120a'; x.fillRect(-1, Math.round(4 + size * 1.1), 2, 3);
      x.restore();
    }
    if (p.rope !== false && nb > 0) { const rx = Math.round(W / (nb + 1)); R(x, rx, 40, 1, beam - 40 - 2, 'rgba(170,150,110,.8)'); for (let k = 0; k < 4; k++) R(x, rx - 1, 40 + k * 4, 3, 2, k % 2 ? 'rgba(200,40,40,.8)' : 'rgba(220,210,190,.8)'); }
    // pigeons' mess on the beam and the floor
    for (let k = 0; k < 14; k++) R(x, 4 + hash(seed + k * 7) * (W - 8), k % 2 ? S : beam + 5, 1, 1, 'rgba(220,220,210,.5)');
    // the belfry floor of planks
    R(x, 0, S - 6, W, 6, '#2a1a0d'); R(x, 0, S - 1, W, 1, 'rgba(255,200,140,.4)'); for (let k = 0; k < W; k += 12) R(x, k, S - 6, 1, 5, 'rgba(0,0,0,.4)');
    // the cut side walls, a doorway in one at the foot
    for (const side of ['left', 'right'] as const) {
      const sx = side === 'left' ? 0 : W - 8, gap = p.door === side ? 52 : 0;
      R(x, sx, gap, 8, top - gap, '#3a3a3c'); x.fillStyle = 'rgba(0,0,0,.3)'; for (let h = gap + 4; h < top; h += 4) x.fillRect(sx, y(h), 8, 1);
      R(x, side === 'left' ? sx + 7 : sx, gap, 1, top - gap, 'rgba(255,190,120,.3)');
      if (gap) { R(x, sx, gap - 4, 8, 4, '#3e3e40'); R(x, sx, 0, 8, 1, 'rgba(255,190,120,.4)'); }
    }
    towerRoof(x, W, top, stone);
  },
});
/** The tower's crown: a cornice with small pinnacles, a slate pyramid, the iron cross. */
function towerRoof(x: Ctx, W: number, top: number, stone: string) {
  R(x, -3, top, W + 6, 5, stone); R(x, -3, top + 4, W + 6, 1, 'rgba(210,190,160,.3)');
  for (let k = -3; k < W + 3; k += 9) R(x, k, top + 5, 5, 5, stone);
  x.fillStyle = '#141416'; x.beginPath(); x.moveTo(6, y(top + 5)); x.lineTo(W / 2, y(top + 56)); x.lineTo(W - 6, y(top + 5)); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(120,120,130,.15)'; x.lineWidth = 1; for (let k = 10; k < 50; k += 6) { const f = k / 56; x.beginPath(); x.moveTo(6 + (W / 2 - 6) * f, y(top + 5 + k)); x.lineTo(W - 6 - (W / 2 - 6) * f, y(top + 5 + k)); x.stroke(); }
  for (const px of [-3, W - 2]) { R(x, px, top + 5, 5, 16, stone); R(x, px + 1, top + 21, 3, 4, stone); }
  R(x, Math.round(W / 2) - 1, top + 56, 2, 14, '#0e0d0c'); R(x, Math.round(W / 2) - 5, top + 64, 10, 2, '#0e0d0c');
}

/** The bell tower from inside the church, shut: a stone mass with slits, louvred belfry arches, its roof, the door at its foot and a plaque. */
export const towerFaceElement = piece({
  type: 'interior.tower-face', label: 'Bell tower face (shut)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 180, 60, 400, 1, 'units'), height: num('Height to the cornice', 330, 60, 1000, 1, 'units'), stone: { kind: 'color', label: 'Stone', default: '#2a2a2c' },
    door: select('Door', ['right', 'left', 'none']), open: num('Door open', 0.35, 0, 1, 0.05), plaque: text('Plaque by the door (empty: none)', 'BELFRY · 112 STEPS'),
    openings: num('Belfry arches', 2, 1, 4), damp: num('Damp', 0.6, 0, 1, 0.05), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) + 70 }),
  bounds: p => { const tall = Number(p.height) + 70; return { x: 0, h: tall, w: Number(p.width), tall }; },
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, door: { x: p.door === 'left' ? 20 : Number(p.width) - 20, h: 0, role: 'entrance' } }),
  paint(x, p, o) {
    const W = Number(p.width), H = Number(p.height), stone = String(p.stone), seed = Number(p.seed), s = sky(o);
    R(x, 0, 0, W, H, stone); blocks(x, 0, W, 0, H, 0.2); damp(x, 0, W, H, Number(p.damp), seed);
    R(x, 0, 0, 2, H, 'rgba(255,190,120,.25)'); R(x, W - 3, 0, 3, H, 'rgba(0,0,0,.35)');
    for (const sh of [70, 140, 200]) if (sh < H - 90) { const sx = Math.round(W * (sh === 140 ? 0.3 : 0.62)); R(x, sx - 1, sh - 1, 6, 24, '#0a0a0b'); R(x, sx, sh, 4, 22, rgba('190,200,215', 0.06 + 0.35 * s)); }
    // the belfry stage behind its louvres, and a string course under it
    const n = Number(p.openings), aw = Math.min(40, (W - 16) / n - 12), ab = H - 62, at = H - 8;
    R(x, -2, ab - 6, W + 4, 4, '#3a3a3c'); R(x, -2, ab - 3, W + 4, 1, 'rgba(210,190,160,.3)');
    for (let k = 0; k < n; k++) {
      const ax = 8 + (k + 0.5) * (W - 16) / n - aw / 2;
      x.fillStyle = '#0a0a0b'; x.beginPath(); arch(x, ax, aw, ab, at - aw * 0.7, at); x.fill();
      for (let h = ab; h < at - 4; h += 5) { R(x, ax, h, aw, 2, '#1e1610'); R(x, ax, h + 1, aw, 1, 'rgba(255,200,140,.12)'); }
      x.strokeStyle = 'rgba(210,190,160,.3)'; x.lineWidth = 1; x.beginPath(); arch(x, ax, aw, ab, at - aw * 0.7, at); x.stroke();
    }
    towerRoof(x, W, H, stone);
    // the door at the foot: pointed, timber, ajar on the dark stair; the plaque on the wall beside it
    if (p.door !== 'none') {
      const dw = 22, dh = 46, dx = p.door === 'left' ? 8 : W - dw - 8, open = Number(p.open);
      x.fillStyle = '#3a3a3c'; x.beginPath(); arch(x, dx - 3, dw + 6, 0, dh, dh + 16); x.fill();
      x.fillStyle = '#060607'; x.beginPath(); arch(x, dx, dw, 0, dh - 2, dh + 12); x.fill();
      R(x, dx + 2, 0, dw - 4, 30, rgba('255,190,120', 0.05 + 0.1 * flameLevel(o)));
      const leaf = Math.round(dw * (1 - open)); x.fillStyle = '#2e1c10'; x.beginPath(); arch(x, dx, leaf, 0, dh - 2, dh + 12 - (dw - leaf) * 0.5); x.fill();
      x.fillStyle = 'rgba(0,0,0,.35)'; for (let k = dx + 4; k < dx + leaf - 1; k += 5) x.fillRect(k, y(dh), 1, dh);
      R(x, dx + 2, 20, Math.max(1, leaf - 4), 2, '#14100c'); R(x, dx + Math.max(2, leaf - 5), 24, 2, 2, 'rgba(200,170,90,.7)');
      x.strokeStyle = 'rgba(210,190,160,.35)'; x.beginPath(); arch(x, dx - 3, dw + 6, 0, dh, dh + 16); x.stroke();
      const words = String(p.plaque ?? ''); if (words) { const cx = p.door === 'left' ? Math.min(W - 50, dx + dw + 52) : Math.max(50, dx - 52); card(x, o, cx, 40, words, false); }
    }
  },
});

// ---------------------------------------------------------------- light through stained glass

/**
 * The light a row of stained-glass windows (or a rose window) throws into a church: coloured shafts
 * slanting down to the floor, the pools they leave on the stone, dust turning in them. By day it follows
 * the sun (or a fixed slant); at night a weak, paler moonlight. Place it over the pews and furniture
 * (layer set) with the windows' positions; it only adds light (screen), so people and pews show through.
 */
const LIGHT_FIELDS = {
  source: select('Window', ['lancets', 'rose']), count: num('Windows', 5, 1, 30), spacing: num('Spacing', 110, 4, 600, 0.5, 'units'),
  width: num('Window width (rose: diameter)', 36, 4, 240, 1, 'units'), low: num('Window bottom', 150, 0, 900, 1, 'units'), high: num('Window top', 202, 4, 1000, 1, 'units'),
  faces: select('Windows look out from', Object.keys(WINDOW_FACES)),
  slant: num('Slant (0: follow the sun or moon; negative: to the left)', 0, -3, 3, 0.05), strength: num('Strength by day', 1, 0, 1.5, 0.05),
  moon: num('Moonlight at night', 0.5, 0, 1, 0.05), colour: num('Colour in the light', 0.85, 0, 1, 0.05), dust: num('Dust in the beams', 0.6, 0, 1, 0.05),
  pools: bool('Pools on the floor', true),
  from: num('Light stays right of (from the first window)', -2000, -6000, 0, 1, 'units'), to: num('Light stays left of (from the first window)', 4000, 0, 8000, 1, 'units'),
  seed: num('Seed', 1, 0, 1000000),
};
export const windowLightElement: AssetDefinition = {
  type: 'interior.window-light', version: 1, label: 'Light through stained glass (shafts, pools, dust)', category: 'environment', coordinates: 'world', parts: ['backdrop'], libraryUse: 'reusable',
  fields: LIGHT_FIELDS,
  bounds: p => { const w = (Number(p.count) - 1) * Number(p.spacing) + Number(p.width); return { x: 0, h: Number(p.high), w, tall: Number(p.high) }; },
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  draw(ctx, v, p, _s, _pass, at) {
    ctx.save(); ctx.translate(v.sx(at.x), v.y(at.h));
    try { paintGlassLight(ctx, p, { t: v.t, lighting: v.lighting, view: v }); } finally { ctx.restore(); }
  },
};
const mixWhite = (c: string, k: number) => c.split(',').map(n => Math.round(Number(n) * k + 255 * (1 - k))).join(',');
function paintGlassLight(x: Ctx, p: Properties, o: Paint) {
  // only a sun (or moon) standing behind the windows' wall throws shafts through them; none from the other side
  const L = o.lighting, faces = WINDOW_FACES[String(p.faces)] ?? 0, behind = (rel: number) => Math.max(0, Math.cos(((rel - faces) * Math.PI) / 180));
  const day = glassLight(o, faces).sun * Number(p.strength);
  const moon = L.moon.up && L.moon.el > 0 ? L.night * (0.3 + 0.7 * L.moon.lit) * Number(p.moon) * (1 - L.cover * 0.7) * behind(L.moonRel) : 0;
  const byDay = day >= moon * 0.6, a0 = byDay ? day * 0.1 : moon * 0.045;
  if (a0 < 0.003) return;
  // the slant: down and away from the sun (or moon) as it stands now, long and low morning and evening, steep at noon
  let s = Number(p.slant);
  if (s === 0) { const k = sunSlope(o, !byDay); if (k === null) return; s = k; }
  x.save(); x.beginPath(); x.rect(Number(p.from), y(Number(p.high) + 20), Number(p.to) - Number(p.from), Number(p.high) + 36); x.clip();
  const n = Number(p.count), sp = Number(p.spacing), w = Number(p.width), lo = Number(p.low), hi = Math.max(lo + 2, Number(p.high)), rose = p.source === 'rose', seed = Number(p.seed);
  const tint = Number(p.colour) * (byDay ? 1 : 0.3), strip = 3;
  x.globalCompositeOperation = 'screen';
  for (let i = 0; i < n; i++) {
    const x0 = i * sp;
    for (let k = 0; k < w; k += strip) {
      const xa = x0 + k, xb = Math.min(x0 + w, xa + strip), xc = (xa + xb) / 2;
      let sl = lo, sh = hi;
      if (rose) { const r = w / 2, cy = (lo + hi) / 2, d = xc - x0 - r, half = Math.sqrt(Math.max(0, r * r - d * d)) * (hi - lo) / w; if (half < 1) continue; sl = cy - half; sh = cy + half; }
      const glass = GLASS[Math.floor(hash(seed + i * 31 + Math.floor(k / strip) * 7) * GLASS.length)], col = byDay ? mixWhite(glass, tint) : mixWhite('190,205,235', 1 - 0.3 * (1 - tint));
      const a = a0 * (0.75 + 0.5 * hash(seed * 3 + i + k));
      // the beam: from the window strip down along the slant to the floor, fading as it spreads
      const g = x.createLinearGradient(0, y(sh), 0, 0); g.addColorStop(0, rgba(col, Math.min(0.33, a))); g.addColorStop(1, rgba(col, Math.min(0.33, a * 0.45)));
      x.fillStyle = g; x.beginPath();
      if (s < 0) { x.moveTo(xa, y(sh)); x.lineTo(xb, y(sh)); x.lineTo(xb, y(sl)); x.lineTo(xb + sl * s, 0); x.lineTo(xa + sh * s, 0); }
      else { x.moveTo(xb, y(sh)); x.lineTo(xa, y(sh)); x.lineTo(xa, y(sl)); x.lineTo(xa + sl * s, 0); x.lineTo(xb + sh * s, 0); }
      x.closePath(); x.fill();
      // where it lands: a coloured pool on the flags, and its spread on the floor towards us
      if (p.pools !== false) {
        const fa = Math.min(xa + sh * s, xb + sl * s, xa + sl * s, xb + sh * s), fb = Math.max(xa + sh * s, xb + sl * s, xa + sl * s, xb + sh * s);
        R(x, fa, 0, fb - fa, 2, rgba(col, Math.min(0.45, a * 2.1))); R(x, fa + 2 * s, -10, fb - fa, 10, rgba(col, Math.min(0.3, a * 1.0)));
      }
    }
    // dust turning slowly in the beam
    const motes = Math.round(Number(p.dust) * 14 * Math.min(1, a0 * 16));
    for (let j = 0; j < motes; j++) {
      const u = (hash(seed + i * 17 + j * 5) + o.t * 0.0006 * (0.6 + hash(j + i))) % 1, hs = lo + (hi - lo) * hash(seed * 7 + j + i * 3), xs = x0 + w * hash(seed * 11 + j * 13 + i);
      const px = xs + u * hs * s + Math.sin(o.t / 70 + j) * 2, ph = hs * (1 - u);
      R(x, px, ph, 1, 1, rgba('255,244,220', Math.min(0.7, a0 * 6 * Math.sin(Math.PI * u))));
    }
  }
  x.restore();
}

// ---------------------------------------------------------------- St. Agnes from outside, its yard

/**
 * St. Agnes' west front staged on its own forecourt (after St. Joseph's, Hanoi): two square towers
 * with buttresses, statue niches, louvred belfries and a crenellated top; the gable with the rose
 * window between them; three pointed portals with recessed orders, the middle one open on the candles
 * inside; steps up to it. Grey stone gone black with damp.
 */
export const churchFrontElement = piece({
  type: 'landmark.church-front', label: 'St. Agnes west front (landmark, forecourt)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 340, 160, 800, 1, 'units'), towers: num('Tower height', 280, 120, 700, 1, 'units'), gable: num('Gable height', 200, 80, 600, 1, 'units'),
    stone: { kind: 'color', label: 'Stone', default: '#262628' }, steps: num('Steps up to the doors', 3, 0, 8), open: num('Middle door open', 0.6, 0, 1, 0.05),
    inside: num('Candlelight inside', 1, 0, 1, 0.05), letters: text('Letters over the door (empty: none)', 'ST. AGNES'), notice: text('Board by the door (empty: none)', 'MASS 6 AND 9'),
    statues: bool('Statues in the niches', true), damp: num('Damp', 0.8, 0, 1, 0.05), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Math.max(Number(p.towers) + 30, Number(p.gable) + 34) }),
  bounds: p => { const tall = Math.max(Number(p.towers) + 30, Number(p.gable) + 34); return { x: -Number(p.steps) * 6, h: tall, w: Number(p.width) + Number(p.steps) * 12, tall }; },
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, door: { x: Number(p.width) / 2, h: Number(p.steps) * 4, role: 'entrance' } }),
  paint(x, p, o) {
    const W = Number(p.width), T = Number(p.towers), G = Number(p.gable), stone = String(p.stone), seed = Number(p.seed), st = Number(p.steps), base = st * 4;
    const tw = Math.round(W * 0.27), cx = W / 2, inside = Number(p.inside) * flameLevel(o), candle = (a: number) => rgba('255,170,80', Math.min(0.9, a * inside * (0.85 + 0.15 * Math.sin(o.t / 11))));
    const dark = '#0b0a0a', edge = 'rgba(210,190,160,.28)';
    // the nave front and its gable, the rose window
    R(x, tw, 0, W - 2 * tw, G - 40, stone);
    x.fillStyle = stone; x.beginPath(); x.moveTo(tw, y(G - 40)); x.lineTo(cx, y(G + 12)); x.lineTo(W - tw, y(G - 40)); x.closePath(); x.fill();
    blocks(x, tw, W - 2 * tw, 0, G - 40, 0.22); damp(x, tw, W - 2 * tw, G - 40, Number(p.damp), seed);
    x.strokeStyle = edge; x.lineWidth = 1; x.beginPath(); x.moveTo(tw, y(G - 40)); x.lineTo(cx, y(G + 12)); x.lineTo(W - tw, y(G - 40)); x.stroke();
    R(x, cx - 1, G + 12, 3, 20, '#0e0d0c'); R(x, cx - 6, G + 24, 13, 3, '#0e0d0c');
    const rr = Math.min(30, (W - 2 * tw) / 5), ry = G - 64;
    x.fillStyle = '#121112'; x.beginPath(); x.arc(cx, y(ry), rr + 4, 0, Math.PI * 2); x.fill();
    for (let k = 0; k < 12; k++) { x.fillStyle = rgba(GLASS[(k + seed) % GLASS.length], 0.08 + 0.3 * inside * (0.5 + 0.5 * o.lighting.night) + 0.08 * sky(o)); x.beginPath(); x.moveTo(cx, y(ry)); x.arc(cx, y(ry), rr, (k * Math.PI) / 6 + 0.05, ((k + 1) * Math.PI) / 6 - 0.05); x.closePath(); x.fill(); }
    x.strokeStyle = '#121112'; x.lineWidth = 2; x.beginPath(); x.arc(cx, y(ry), rr * 0.5, 0, Math.PI * 2); x.stroke(); x.lineWidth = 1;
    x.strokeStyle = edge; x.beginPath(); x.arc(cx, y(ry), rr + 4, Math.PI * 1.05, Math.PI * 1.7); x.stroke();
    if (inside > 0.2) o.light?.(cx, ry, rr * 2, rr * 2, '255,170,90', 'window');
    // the gallery of small arches over the portals, a statue in each
    const gy = Math.round(G * 0.52), gn = Math.max(3, Math.floor((W - 2 * tw) / 22));
    R(x, tw, gy - 3, W - 2 * tw, 3, '#343436'); R(x, tw, gy - 1, W - 2 * tw, 1, edge); R(x, tw, gy + 24, W - 2 * tw, 2, '#343436');
    for (let k = 0; k < gn; k++) {
      const ax = tw + 4 + k * (W - 2 * tw - 8) / gn, aw = (W - 2 * tw - 8) / gn - 4;
      x.fillStyle = dark; x.beginPath(); arch(x, ax, aw, gy, gy + 14, gy + 22); x.fill();
      if (p.statues !== false) { R(x, ax + aw / 2 - 2, gy, 4, 13, 'rgba(150,145,135,.55)'); R(x, ax + aw / 2 - 1, gy + 13, 3, 3, 'rgba(150,145,135,.55)'); }
    }
    // the towers: buttresses stepping in, string courses, lancets, a niche, the belfry, the crenellated top
    for (const tx of [0, W - tw]) {
      R(x, tx, 0, tw, T, stone); blocks(x, tx, tw, 0, T, 0.22); damp(x, tx, tw, T, Number(p.damp), seed + tx);
      for (const bx of [tx, tx + tw - 8]) { R(x, bx - 2, 0, 10, T * 0.36, '#2e2e30'); R(x, bx - 1, T * 0.36, 8, T * 0.3, '#2e2e30'); R(x, bx, T * 0.66, 6, T * 0.34, '#2e2e30'); R(x, bx - 2, 0, 1, T * 0.36, edge); R(x, bx - 1, T * 0.36, 1, T * 0.3, edge); }
      for (const sh of [Math.round(T * 0.36), Math.round(T * 0.66), T - 6]) { R(x, tx - 2, sh - 2, tw + 4, 4, '#343436'); R(x, tx - 2, sh + 1, tw + 4, 1, edge); }
      const m = tx + tw / 2;
      for (const dx of [-9, 3]) lancet(x, m + dx, 6, Math.round(T * 0.2), Math.round(T * 0.32), 0.15 + 0.4 * inside * o.lighting.night, seed + tx + dx);
      x.fillStyle = dark; x.beginPath(); arch(x, m - 8, 16, Math.round(T * 0.42), Math.round(T * 0.54), Math.round(T * 0.6)); x.fill();
      if (p.statues !== false) { R(x, m - 3, T * 0.42, 6, 20, 'rgba(160,155,145,.6)'); R(x, m - 2, T * 0.42 + 20, 4, 4, 'rgba(160,155,145,.6)'); R(x, m - 4, T * 0.42, 8, 2, 'rgba(160,155,145,.4)'); }
      for (const dx of [-14, 2]) {
        const ax = m + dx, ab = Math.round(T * 0.7), at = T - 14;
        x.fillStyle = dark; x.beginPath(); arch(x, ax, 12, ab, at - 8, at); x.fill();
        for (let h = ab + 2; h < at - 4; h += 4) R(x, ax, h, 12, 2, '#1e1814');
        x.strokeStyle = edge; x.beginPath(); arch(x, ax, 12, ab, at - 8, at); x.stroke();
      }
      R(x, tx - 3, T, tw + 6, 5, '#343436'); R(x, tx - 3, T + 4, tw + 6, 1, edge);
      for (let k = tx - 3; k < tx + tw + 3; k += 10) R(x, k, T + 5, 6, 7, stone);
      for (const px of [tx - 3, tx + tw - 3]) { R(x, px, T + 5, 6, 18, stone); x.fillStyle = stone; x.beginPath(); x.moveTo(px, y(T + 23)); x.lineTo(px + 3, y(T + 30)); x.lineTo(px + 6, y(T + 23)); x.fill(); }
      R(x, tx, 0, 1, T, 'rgba(255,190,120,.18)');
    }
    // three portals with recessed orders; the middle one stands open on the candles
    const portal = (px: number, pw: number, ph: number, open: number) => {
      for (let k = 3; k >= 0; k--) { x.fillStyle = k ? (k % 2 ? '#303032' : '#2a2a2c') : dark; x.beginPath(); arch(x, px - pw / 2 - k * 3, pw + k * 6, base, base + ph + k * 2, base + ph + pw * 0.6 + k * 4); x.fill(); }
      x.strokeStyle = edge; x.beginPath(); arch(x, px - pw / 2 - 9, pw + 18, base, base + ph + 6, base + ph + pw * 0.6 + 12); x.stroke();
      R(x, px - pw / 2, base + ph - 2, pw, 2, '#3a3a3c');
      const leaf = pw / 2 * (1 - open);
      if (open > 0) { R(x, px - pw / 2, base, pw, ph - 2, candle(0.4)); for (const dx of [-8, -3, 2, 7]) if (Math.abs(dx) < pw / 2 - 2) R(x, px + dx, base + 12, 1, 2, candle(1.2)); o.light?.(px, base + ph / 2, pw, ph, '255,170,80', 'window'); }
      for (const side of [-1, 1]) { const lx = side < 0 ? px - pw / 2 : px + pw / 2 - leaf; R(x, lx, base, leaf, ph - 2, '#2a1a0e'); for (let k = 3; k < leaf - 1; k += 5) R(x, lx + k, base, 1, ph - 2, 'rgba(0,0,0,.35)'); }
    };
    portal(cx, 40, 70, Number(p.open)); portal(tw / 2, 22, 48, 0); portal(W - tw / 2, 22, 48, 0);
    const words = String(p.letters ?? ''); if (words) card(x, o, cx, base + 70 + 36, words, false);
    const board = String(p.notice ?? ''); if (board) { R(x, tw + 12, base, 2, 30, '#1e1209'); card(x, o, tw + 13, base + 34, board); }
    // the steps up to the doors, wider at the bottom
    for (let s = 0; s < st; s++) { const k = (st - s) * 6, l = cx - 50 - k * 2, w = 100 + k * 4; R(x, l, s * 4, w, 4, s % 2 ? '#3a3836' : '#343230'); R(x, l, s * 4 + 3, w, 1, 'rgba(210,190,160,.3)'); }
  },
});

/** A churchyard's front: a stone plinth, an iron railing between pillars with lanterns, a gate with an iron arch. */
export const yardWallElement = piece({
  type: 'street.yard-wall', label: 'Churchyard wall, railing and gate', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 660, 40, 6000, 1, 'units'), height: num('Wall height', 14, 4, 80, 1, 'units'), railing: num('Railing height (0: none)', 28, 0, 80, 1, 'units'),
    pillars: num('A pillar every', 80, 20, 600, 1, 'units'), gate: num('Gate from the left (-1: none)', 330, -1, 6000, 1, 'units'), gateWidth: num('Gate width', 40, 16, 200, 1, 'units'),
    gateOpen: num('Gate opened', 0.8, 0, 1, 0.05), lanterns: bool('Lanterns on the pillars', true), letters: text('Letters on the gate arch (empty: no arch)', 'ST. AGNES'),
    stone: { kind: 'color', label: 'Stone', default: '#2e2d2c' }, seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) + Number(p.railing) + 50 }),
  bounds: p => { const tall = Number(p.height) + Number(p.railing) + 50; return { x: 0, h: tall, w: Number(p.width), tall }; },
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, gate: { x: Number(p.gate) + Number(p.gateWidth) / 2, h: 0, role: 'entrance' } }),
  paint(x, p, o) {
    const W = Number(p.width), wh = Number(p.height), rh = Number(p.railing), stone = String(p.stone), seed = Number(p.seed), g0 = Number(p.gate), gw = Number(p.gateWidth), g1 = g0 + gw, hasGate = g0 >= 0;
    const inGate = (a: number, b: number) => hasGate && b > g0 && a < g1;
    const lantern = (lx: number, lh: number, k: number) => {
      R(x, lx - 3, lh, 7, 2, '#0e0c0a'); R(x, lx - 2, lh + 2, 5, 7, rgba('255,190,100', 0.35 + 0.55 * flameLevel(o) * flicker(o.t, k)));
      R(x, lx - 3, lh + 9, 7, 2, '#0e0c0a'); R(x, lx, lh + 11, 1, 2, '#0e0c0a'); R(x, lx - 2, lh + 5, 5, 1, 'rgba(0,0,0,.4)');
      o.light?.(lx, lh + 5, 6, 8, '255,190,100', 'screen');
    };
    // the plinth, broken by the gate's threshold
    for (const [a, b] of hasGate ? [[0, g0], [g1, W]] : [[0, W]]) { if (b <= a) continue; R(x, a, 0, b - a, wh, stone); blocks(x, a, b - a, 0, wh, 0.25); R(x, a, wh, b - a, 3, '#3a3836'); R(x, a, wh + 2, b - a, 1, 'rgba(210,190,160,.35)'); damp(x, a, b - a, wh, 0.6, seed); }
    if (hasGate) { R(x, g0, 0, gw, 3, '#3a3836'); R(x, g0, 2, gw, 1, 'rgba(210,190,160,.3)'); }
    // the railing: iron bars with spear tips, two rails
    if (rh > 0) for (let k = 2; k < W; k += 4) { if (inGate(k, k + 1)) continue; R(x, k, wh + 3, 1, rh - 2, '#101012'); R(x, k, wh + rh + 1, 1, 2, 'rgba(150,150,160,.5)'); }
    if (rh > 0) for (const [a, b] of hasGate ? [[0, g0], [g1, W]] : [[0, W]]) { R(x, a, wh + 6, b - a, 1, '#101012'); R(x, a, wh + rh - 4, b - a, 1, '#101012'); }
    // pillars with caps and lanterns
    const ph = wh + rh + 6;
    for (let k = 0; k <= W; k += Number(p.pillars)) {
      const px = Math.min(W - 10, k); if (inGate(px - 6, px + 16)) continue;
      R(x, px, 0, 10, ph, stone); R(x, px - 1, ph, 12, 3, '#3a3836'); R(x, px - 1, ph + 2, 12, 1, 'rgba(210,190,160,.35)'); R(x, px, 0, 1, ph, 'rgba(255,190,120,.2)');
      if (p.lanterns !== false) lantern(px + 5, ph + 3, k);
    }
    // the gate: taller pillars with crosses, the leaves swung in, an iron arch with the letters
    if (hasGate) {
      const gp = ph + 16;
      for (const px of [g0 - 14, g1]) { R(x, px, 0, 14, gp, stone); blocks(x, px, 14, 0, gp, 0.2); R(x, px - 2, gp, 18, 4, '#3a3836'); R(x, px - 2, gp + 3, 18, 1, 'rgba(210,190,160,.35)'); R(x, px + 6, gp + 4, 2, 12, '#141312'); R(x, px + 3, gp + 11, 8, 2, '#141312'); R(x, px, 0, 1, gp, 'rgba(255,190,120,.25)'); }
      const leaf = Math.max(2, Math.round(gw / 2 * (1 - Number(p.gateOpen))));
      for (const lx of [g0, g1 - leaf]) { for (let k = 0; k < leaf; k += 3) R(x, lx + k, 4, 1, rh + wh - 2, '#101012'); R(x, lx, 8, leaf, 1, '#101012'); R(x, lx, wh + rh, leaf, 1, '#101012'); }
      const words = String(p.letters ?? '');
      if (words) {
        x.strokeStyle = '#101012'; x.lineWidth = 2; x.beginPath(); x.moveTo(g0 - 7, y(gp)); x.quadraticCurveTo(g0 + gw / 2, y(gp + 30), g1 + 7, y(gp)); x.stroke(); x.lineWidth = 1;
        R(x, g0 + gw / 2, gp + 10, 1, 5, '#101012'); card(x, o, g0 + gw / 2, gp + 4, words, false);
      }
      if (p.lanterns !== false) { lantern(g0 - 7, gp + 16, 1); lantern(g1 + 7, gp + 16, 2); }
    }
  },
});

/** A tree of the Old Quarter: a banyan with hanging roots, a frangipani in flower, a broad tamarind; paper lanterns can hang in it. */
export const oldqTreeElement = piece({
  type: 'environment.oldq-tree', label: 'Tree (banyan, frangipani, tamarind)', category: 'environment', libraryUse: 'reusable',
  fields: {
    kind: select('Kind', ['banyan', 'frangipani', 'tamarind']), height: num('Height', 170, 40, 500, 1, 'units'), spread: num('Spread', 130, 30, 500, 1, 'units'),
    leaves: { kind: 'color', label: 'Leaves', default: '#16220f' }, blossom: num('Blossom (frangipani)', 0.7, 0, 1, 0.05), sway: num('Sway', 0.4, 0, 1, 0.05),
    lanterns: num('Paper lanterns hanging in it', 3, 0, 12), lantern: { kind: 'color', label: 'Lantern colour', default: '#ff6a3a' }, seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.spread), tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.height), w: Number(p.spread), tall: Number(p.height) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, trunk: { x: Number(p.spread) / 2, h: 0, role: 'mount' } }),
  paint(x, p, o) { paintTree(x, p, o); },
});
type Limb = { x0: number; h0: number; x1: number; h1: number; w: number; depth: number };
/** The shape of each kind: how tall the bole is, how the limbs leave it, how they fork, how big the leaf masses are. */
const TREE_FORM: Record<string, { bole: number; limbs: number[]; len: number; depth: number; spread: number; lift: number; base: number; clump: number; bark: string; barkLit: string }> = {
  banyan: { bole: 0.34, limbs: [-1.25, -0.75, -0.2, 0.35, 0.85, 1.3], len: 0.36, depth: 2, spread: 0.45, lift: 0.75, base: 24, clump: 19, bark: '#211d17', barkLit: '#3a3329' },
  frangipani: { bole: 0.3, limbs: [-0.45, 0.4], len: 0.26, depth: 3, spread: 0.42, lift: 0.85, base: 9, clump: 8, bark: '#4a4640', barkLit: '#6e685e' },
  tamarind: { bole: 0.4, limbs: [-0.85, -0.25, 0.3, 0.9], len: 0.3, depth: 3, spread: 0.5, lift: 0.8, base: 13, clump: 13, bark: '#1e1712', barkLit: '#352a20' },
};
/**
 * A tree drawn as a tree: a tapering bole with its root flare (a banyan's buttresses and the prop roots
 * it lets down), limbs forking out to the crown, leaf masses at their ends in three tones (shade,
 * body, the lit top) with the back ones darker so the crown has depth, and lanterns hung from real limbs.
 */
function paintTree(x: Ctx, p: Properties, o: Paint) {
  const kind = TREE_FORM[String(p.kind)] ? String(p.kind) : 'banyan', F = TREE_FORM[kind], H = Number(p.height), S = Number(p.spread), cx = S / 2, seed = Number(p.seed), r = rng(seed * 61 + 3);
  const leaf = String(p.leaves), lrgb = rgb(isHex(leaf) ? leaf : '#16220f'), lit = 0.25 + 0.75 * sky(o), sway = Number(p.sway);
  // grow the limbs, then fit the crown into the tree's height and spread
  const limbs: Limb[] = [], tips: { x: number; h: number; depth: number }[] = [];
  const grow = (x0: number, h0: number, ang: number, len: number, w: number, depth: number) => {
    const x1 = x0 + Math.sin(ang) * len, h1 = h0 + Math.cos(ang) * len;
    limbs.push({ x0, h0, x1, h1, w, depth });
    if (depth >= F.depth) { tips.push({ x: x1, h: h1, depth }); return; }
    const kids = kind === 'frangipani' ? 2 : 2 + (r() < 0.4 ? 1 : 0);
    for (let k = 0; k < kids; k++) {
      const off = (kids === 1 ? 0 : (k / (kids - 1) - 0.5) * 2) * F.spread + (r() - 0.5) * 0.25;
      grow(x1, h1, ang * F.lift + off, len * (0.62 + r() * 0.16), Math.max(1, w * 0.62), depth + 1);
    }
  };
  const boleTop = H * F.bole;
  // limbs leave the bole at different heights, the lower ones reaching further out
  F.limbs.forEach((a, i) => { const at = boleTop * (kind === 'frangipani' ? 1 : 0.62 + 0.38 * ((i * 7 + seed) % F.limbs.length) / F.limbs.length); grow(cx + Math.sign(a) * F.base * 0.15, at, a + (r() - 0.5) * 0.15, H * F.len * (0.85 + r() * 0.3) * (1.15 - 0.3 * at / boleTop), F.base * 0.5, 1); });
  const rc = F.clump, maxX = Math.max(1, ...tips.map(t => Math.abs(t.x - cx))), maxH = Math.max(boleTop + 1, ...tips.map(t => t.h));
  const kx = Math.max(0.3, (S / 2 - rc) / maxX), kh = Math.max(0.3, (H - rc * 0.8 - boleTop) / (maxH - boleTop));
  const fit = (px: number, ph: number) => [cx + (px - cx) * kx, ph <= boleTop ? ph : boleTop + (ph - boleTop) * kh] as const;
  for (const l of limbs) { [l.x0, l.h0] = fit(l.x0, l.h0); [l.x1, l.h1] = fit(l.x1, l.h1); }
  for (const t of tips) [t.x, t.h] = fit(t.x, t.h);
  const swayAt = (px: number, ph: number) => Math.round(Math.sin(o.t / 90 + px * 0.07 + seed) * sway * 1.6 * (ph / H));
  const clump = (tx: number, th: number, rad: number, tone: number, k: number) => {
    const dx = swayAt(tx, th), ry = rad * 0.62;
    x.fillStyle = rgba(mixRgb(lrgb, '0,0,0', 0.45 + 0.25 * (1 - tone)), 1); x.beginPath(); x.ellipse(tx + dx + 1, y(th - ry * 0.35), rad, ry, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = rgba(mixRgb(lrgb, '0,0,0', 0.25 * (1 - tone)), 1); x.beginPath(); x.ellipse(tx + dx, y(th), rad * 0.92, ry * 0.9, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = rgba(mixRgb(lrgb, '170,200,110', 0.22 * tone), lit); x.beginPath(); x.ellipse(tx + dx - rad * 0.2, y(th + ry * 0.35), rad * 0.6, ry * 0.45, 0, 0, Math.PI * 2); x.fill();
    // leaf texture: a scatter of small leaves catching the light, a few gaps showing the dark inside
    for (let i = 0; i < Math.round(rad * 0.9); i++) {
      const a = hash(seed + k * 37 + i * 3) * Math.PI * 2, d = Math.sqrt(hash(seed * 5 + k * 11 + i)), lx = tx + dx + Math.cos(a) * rad * 0.9 * d, lh = th + Math.sin(a) * ry * 0.9 * d;
      R(x, lx, lh, 2, 1, lh > th ? rgba(mixRgb(lrgb, '190,220,130', 0.35 * tone), 0.7 * lit) : rgba(mixRgb(lrgb, '0,0,0', 0.5), 0.8));
    }
  };
  // the crown's back: darker masses behind the limbs, so it has depth
  if (kind !== 'frangipani') for (let i = 0; i < tips.length; i++) { const t = tips[i]; clump(t.x + (hash(seed + i) - 0.5) * rc, t.h + rc * 0.45, rc * 1.05, 0, i + 100); }
  // the root flare and the bole: wide at the foot, tapering, lit on one side
  const wb = F.base, wt = F.base * 0.55;
  x.fillStyle = F.bark; x.beginPath(); x.moveTo(cx - wb / 2 - wb * 0.5, 0); x.quadraticCurveTo(cx - wb / 2, y(4), cx - wb / 2, y(10)); x.lineTo(cx - wt / 2, y(boleTop + 2)); x.lineTo(cx + wt / 2, y(boleTop + 2)); x.lineTo(cx + wb / 2, y(10)); x.quadraticCurveTo(cx + wb / 2, y(4), cx + wb / 2 + wb * 0.5, 0); x.closePath(); x.fill();
  x.strokeStyle = F.barkLit; x.lineWidth = 1; x.beginPath(); x.moveTo(cx - wb / 2 + 1, y(10)); x.lineTo(cx - wt / 2 + 1, y(boleTop)); x.stroke();
  x.fillStyle = 'rgba(0,0,0,.3)'; for (let k = 0; k < Math.round(wb / 4); k++) { const bx = cx - wb / 2 + 3 + k * 4 + (k % 2); x.fillRect(Math.round(bx), Math.round(y(boleTop * (0.3 + 0.6 * hash(seed + k)))), 1, Math.round(boleTop * 0.3)); }
  if (kind === 'banyan') for (const [dx, len] of [[-1, 1], [-0.55, 0.7], [0.5, 0.75], [1, 1]] as const) { x.fillStyle = F.bark; x.beginPath(); x.moveTo(cx + dx * wb * 0.3, y(boleTop * 0.35)); x.quadraticCurveTo(cx + dx * wb * 0.55, y(6), cx + dx * wb * (0.8 + 0.6 * len), 0); x.lineTo(cx + dx * wb * 0.25, 0); x.fill(); }
  R(x, cx - wb * 1.3, -2, wb * 2.6, 3, 'rgba(0,0,0,.35)');
  // the limbs, thinning as they fork
  x.lineCap = 'round';
  // each limb bows upward a little on its way out (a curve, not a spoke); a thin lit line along the big ones' backs
  const bow = (l: Limb, lift: number) => { const mx = (l.x0 + l.x1) / 2, mh = (l.h0 + l.h1) / 2 + Math.abs(l.x1 - l.x0) * 0.18; x.beginPath(); x.moveTo(l.x0, y(l.h0 + lift)); x.quadraticCurveTo(mx, y(mh + lift), l.x1 + swayAt(l.x1, l.h1) * 0.5, y(l.h1 + lift)); x.stroke(); };
  for (const l of limbs) { x.strokeStyle = F.bark; x.lineWidth = Math.max(1, l.w); bow(l, 0); }
  for (const l of limbs) if (l.w >= 4) { x.strokeStyle = F.barkLit; x.lineWidth = 1; bow(l, l.w / 2 - 1); }
  x.lineCap = 'butt';
  // a banyan's prop roots: some hanging roots reached the ground and became pillars; the rest still hang
  if (kind === 'banyan') {
    const firsts = limbs.filter(l => l.depth === 1);
    for (let k = 0; k < firsts.length; k++) {
      const l = firsts[k], f = 0.55 + 0.3 * hash(seed + k), px = l.x0 + (l.x1 - l.x0) * f, ph = l.h0 + (l.h1 - l.h0) * f;
      if (Math.abs(px - cx) < wb) continue;
      if (k % 2 === 0) { R(x, px - 1, 0, 3, ph, F.bark); R(x, px - 1, 0, 1, ph, F.barkLit); R(x, px - 3, 0, 7, 2, F.bark); }
      else for (let j = 0; j < 3; j++) R(x, px - 2 + j * 2, ph - 10 - Math.round(hash(seed + k * 3 + j) * ph * 0.6), 1, 10 + Math.round(hash(seed + k * 3 + j) * ph * 0.6), 'rgba(52,46,36,.9)');
    }
  }
  // the crown's front masses, lit on top; the frangipani's leaf rosettes and flowers at its blunt tips
  for (let i = 0; i < tips.length; i++) {
    const t = tips[i];
    if (kind === 'frangipani') {
      const dx = swayAt(t.x, t.h);
      for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k / 6 - 0.5) * 2.6; x.fillStyle = rgba(mixRgb(lrgb, k % 2 ? '0,0,0' : '150,190,100', k % 2 ? 0.2 : 0.2 * lit), 1); x.beginPath(); x.ellipse(t.x + dx + Math.cos(a) * 6, y(t.h) + Math.sin(a) * 5, 6, 2, a, 0, Math.PI * 2); x.fill(); }
      for (let b = 0; b < 4; b++) if (hash(seed + i * 7 + b) < Number(p.blossom)) { const bx = t.x + dx - 4 + b * 3, bh = t.h + 4 + (b % 2) * 2; R(x, bx - 1, bh, 3, 1, 'rgba(240,235,215,.95)'); R(x, bx, bh - 1, 1, 3, 'rgba(240,235,215,.95)'); R(x, bx, bh, 1, 1, 'rgba(240,200,80,.95)'); }
    } else {
      clump(t.x, t.h, rc * (0.85 + 0.3 * hash(seed + i * 5)), 1, i);
      if (hash(seed * 3 + i) < 0.6) clump(t.x + (hash(seed + i * 9) - 0.5) * rc * 1.4, t.h - rc * 0.35, rc * 0.7, 0.6, i + 50);
    }
  }
  // lanterns on strings from the limbs themselves, where a limb runs out under the crown
  const n = Number(p.lanterns), lc = rgb(String(p.lantern));
  const hooks = limbs.filter(l => l.depth <= 2 && Math.abs(l.x1 - l.x0) > 6).map(l => ({ x: l.x0 + (l.x1 - l.x0) * 0.7, h: l.h0 + (l.h1 - l.h0) * 0.7 })).filter(h => h.h > 50 && Math.abs(h.x - cx) > wb).sort((a, b) => a.x - b.x);
  for (let i = 0; i < n && hooks.length; i++) {
    const hk = hooks[Math.min(hooks.length - 1, Math.floor((i + 0.5) * hooks.length / n))], drop = 6 + Math.round(hash(seed * 3 + i) * 10), sw = Math.sin(o.t / 50 + i + seed) * 1.2;
    const ly = hk.h - drop, a = 0.45 + 0.5 * flameLevel(o) * (0.88 + 0.12 * Math.sin(o.t / 9 + i * 3));
    x.strokeStyle = 'rgba(0,0,0,.85)'; x.lineWidth = 1; x.beginPath(); x.moveTo(hk.x, y(hk.h)); x.lineTo(hk.x + sw, y(ly)); x.stroke();
    R(x, hk.x + sw - 2, ly, 5, 1, '#100806');
    x.fillStyle = rgba(lc, a); x.beginPath(); x.ellipse(hk.x + sw + 0.5, y(ly - 5), 3.5, 4.5, 0, 0, Math.PI * 2); x.fill();
    R(x, hk.x + sw - 3, ly - 3, 7, 1, 'rgba(0,0,0,.25)'); R(x, hk.x + sw - 1, ly - 10, 3, 1, '#100806'); R(x, hk.x + sw, ly - 13, 1, 3, rgba(lc, 0.5));
    o.light?.(hk.x, ly - 5, 8, 10, lc, 'screen');
  }
}

/** A few graves in a churchyard: crosses, headstones with a photograph, small tiled tombs; candles and flowers. */
export const gravesElement = piece({
  type: 'environment.graves', label: 'Graves (churchyard)', category: 'environment', libraryUse: 'reusable',
  fields: {
    count: num('Graves', 4, 1, 20), spacing: num('Spacing', 30, 14, 120, 1, 'units'), kinds: select('Kinds', ['mixed', 'crosses', 'headstones', 'tombs']),
    stone: { kind: 'color', label: 'Stone', default: '#4a4844' }, candles: bool('Candles', true), flowers: bool('Flowers', true), moss: num('Moss', 0.5, 0, 1, 0.05), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.count) * Number(p.spacing), tall: 34 }),
  bounds: p => ({ x: 0, h: 34, w: Number(p.count) * Number(p.spacing), tall: 34 }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  paint(x, p, o) {
    const n = Number(p.count), sp = Number(p.spacing), stone = String(p.stone), seed = Number(p.seed), KINDS = ['crosses', 'headstones', 'tombs'], edge = 'rgba(220,210,190,.3)';
    for (let i = 0; i < n; i++) {
      const gx = i * sp + Math.round(sp / 2) - 8, kind = p.kinds === 'mixed' ? KINDS[Math.floor(hash(seed + i * 13) * 3)] : String(p.kinds);
      R(x, gx - 2, 0, 20, 3, '#2a2826');
      if (kind === 'crosses') { R(x, gx + 3, 3, 10, 5, stone); R(x, gx + 7, 8, 3, 20, stone); R(x, gx + 3, 21, 11, 3, stone); R(x, gx + 7, 8, 1, 20, edge); }
      else if (kind === 'headstones') { R(x, gx + 1, 3, 14, 16, stone); x.fillStyle = stone; x.beginPath(); x.arc(gx + 8, y(19), 7, Math.PI, 0); x.fill(); R(x, gx + 1, 3, 1, 16, edge); x.fillStyle = 'rgba(200,185,160,.6)'; x.beginPath(); x.ellipse(gx + 8, y(17), 2.5, 3.5, 0, 0, Math.PI * 2); x.fill(); R(x, gx + 4, 9, 8, 1, 'rgba(0,0,0,.4)'); R(x, gx + 5, 7, 6, 1, 'rgba(0,0,0,.4)'); }
      else { R(x, gx - 2, 3, 20, 10, stone); R(x, gx - 3, 13, 22, 2, '#5a2c1a'); x.fillStyle = '#4a2414'; x.beginPath(); x.moveTo(gx - 3, y(15)); x.lineTo(gx + 8, y(21)); x.lineTo(gx + 19, y(15)); x.fill(); R(x, gx + 7, 21, 2, 6, stone); R(x, gx + 5, 24, 6, 1, stone); R(x, gx - 2, 3, 20, 1, edge); }
      for (let k = 0; k < 4; k++) if (hash(seed * 5 + i * 7 + k) < Number(p.moss)) R(x, gx + Math.round(hash(seed + i + k * 3) * 14), 3 + Math.round(hash(seed * 9 + i + k) * 10), 3, 2, 'rgba(60,90,40,.55)');
      if (p.flowers !== false && hash(seed + i * 3) < 0.7) { R(x, gx + 15, 3, 3, 4, '#3a3632'); R(x, gx + 15, 7, 1, 3, '#2e4a22'); R(x, gx + 14, 10, 2, 2, rgba(['230,220,200', '220,80,60', '230,190,60'][i % 3], 0.85)); }
      if (p.candles !== false && hash(seed * 7 + i) < 0.6) { R(x, gx - 1, 3, 3, 3, 'rgba(180,30,30,.8)'); flame(x, o, gx, 6, i * 5 + seed); }
    }
  },
});

/** A grotto shrine of the Virgin: a heap of rough stone with a niche, the white statue in a blue mantle, candles and flowers. */
export const grottoElement = piece({
  type: 'environment.grotto', label: 'Grotto shrine (churchyard)', category: 'environment', libraryUse: 'reusable',
  fields: {
    width: num('Width', 60, 30, 240, 1, 'units'), height: num('Height', 64, 30, 240, 1, 'units'), rock: { kind: 'color', label: 'Rock', default: '#24221f' },
    mantle: { kind: 'color', label: 'Statue’s mantle', default: '#4a6a9a' }, candles: num('Candles', 8, 0, 30), lit: num('Share lit', 0.8, 0, 1, 0.05), flowers: bool('Flowers', true),
    plaque: text('Plaque (empty: none)', ''), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.height), w: Number(p.width), tall: Number(p.height) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, niche: { x: Number(p.width) / 2, h: Number(p.height) * 0.35, role: 'mount' } }),
  paint(x, p, o) {
    const W = Number(p.width), H = Number(p.height), seed = Number(p.seed), r = rng(seed * 17 + 1), rock = String(p.rock), cx = Math.round(W / 2);
    // the rock heap: overlapping rough boulders, lit on their upper edges
    for (let k = 0; k < 14; k++) {
      const f = k / 13, bx = Math.round(W * (0.08 + 0.84 * r())), bh = Math.round(H * (0.15 + 0.75 * (1 - Math.abs(bx - cx) / W * 1.6) * r())), rad = 8 + r() * 10;
      x.fillStyle = k % 2 ? rock : '#2c2925'; x.beginPath(); x.ellipse(bx, y(Math.max(rad * 0.6, bh)), rad, rad * 0.7, 0, 0, Math.PI * 2); x.fill();
      R(x, bx - rad * 0.5, Math.max(rad * 0.6, bh) + rad * 0.55, rad * 0.8, 1, 'rgba(210,190,160,.2)'); void f;
    }
    // the niche and the statue in it
    const nw = Math.max(16, Math.round(W * 0.3)), nb = Math.round(H * 0.3), nt = Math.round(H * 0.9);
    x.fillStyle = '#0c0b0a'; x.beginPath(); arch(x, cx - nw / 2, nw, nb, nt - nw * 0.6, nt); x.fill();
    const sh = nb + 2; R(x, cx - 4, sh, 8, 22, 'rgba(225,220,210,.9)'); R(x, cx - 3, sh + 22, 6, 5, 'rgba(225,215,200,.9)'); R(x, cx - 2, sh + 23, 4, 3, 'rgba(210,190,170,.9)');
    R(x, cx - 5, sh + 2, 2, 22, String(p.mantle)); R(x, cx + 3, sh + 2, 2, 22, String(p.mantle)); R(x, cx - 4, sh + 26, 8, 2, String(p.mantle)); R(x, cx - 1, sh + 12, 2, 1, 'rgba(70,100,160,.9)');
    R(x, cx - 5, sh + 30, 10, 1, 'rgba(240,210,120,.5)');
    // candles on a ledge at its foot, flowers either side
    R(x, cx - nw / 2 - 6, nb - 3, nw + 12, 3, '#3a3634');
    const n = Number(p.candles);
    for (let i = 0; i < n; i++) { const lx = Math.round(cx - nw / 2 - 4 + (i + 0.5) * (nw + 8) / n); R(x, lx, nb, 1, 3, 'rgba(235,228,215,.85)'); if (hash(seed + i * 7) < Number(p.lit)) flame(x, o, lx, nb + 3, i); }
    if (n > 0) { const g = x.createRadialGradient(cx, y(nb + 10), 0, cx, y(nb + 10), W * 0.6); g.addColorStop(0, 'rgba(255,180,90,' + (0.18 * flameLevel(o) * Number(p.lit)).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,180,90,0)'); x.fillStyle = g; x.fillRect(cx - W * 0.6, y(nb + 10 + W * 0.6), W * 1.2, W * 1.2); }
    if (p.flowers !== false) for (const fx of [cx - nw / 2 - 10, cx + nw / 2 + 4]) { R(x, fx, 0, 6, 7, '#5a5650'); for (let k = 0; k < 4; k++) R(x, fx - 1 + k * 2, 8 + (k % 2) * 3, 2, 2, rgba(k % 2 ? '235,230,215' : '230,120,140', 0.9)); }
    if (p.plaque) card(x, o, cx, Math.round(H * 0.18), String(p.plaque));
  },
});

/** A candle seller's pitch: a low table of candles and incense, a parasol with lanterns, a cash tin and a card. */
export const candleStallElement = piece({
  type: 'street.candle-stall', label: 'Candle seller’s stall', category: 'furniture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 46, 24, 160, 1, 'units'), parasol: { kind: 'color', label: 'Parasol', default: '#7a2a1c' }, lanterns: num('Lanterns under the parasol', 2, 0, 6),
    card: text('Card (empty: none)', 'CANDLES 2'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: 64 }),
  bounds: p => ({ x: -10, h: 64, w: Number(p.width) + 20, tall: 64 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, seller: { x: -6, h: 0, role: 'mount' }, table: { x: Number(p.width) / 2, h: 14, role: 'surface' } }),
  paint(x, p, o) {
    const W = Number(p.width), seed = Number(p.seed), pc = String(p.parasol), cx = Math.round(W / 2);
    // the parasol on its pole, ribs, lanterns from its rim
    R(x, cx, 0, 1, 56, '#1a1008');
    x.fillStyle = pc; x.beginPath(); x.moveTo(cx - W / 2 - 10, y(50)); x.quadraticCurveTo(cx, y(66), cx + W / 2 + 10, y(50)); x.closePath(); x.fill();
    x.fillStyle = 'rgba(0,0,0,.3)'; for (let k = -2; k <= 2; k++) x.fillRect(Math.round(cx + k * (W / 5)), y(52 + (2 - Math.abs(k)) * 2), 1, 3);
    R(x, cx - W / 2 - 10, 49, W + 20, 1, 'rgba(255,200,140,.3)');
    const n = Number(p.lanterns);
    for (let i = 0; i < n; i++) { const lx = Math.round(cx - W / 2 - 6 + (i + 0.5) * (W + 12) / n), sw = Math.sin(o.t / 50 + i) * 1; R(x, lx, 44, 1, 5, '#100806'); x.fillStyle = rgba('255,120,60', 0.45 + 0.5 * flameLevel(o)); x.beginPath(); x.ellipse(lx + sw + 0.5, y(40), 3, 4, 0, 0, Math.PI * 2); x.fill(); o.light?.(lx, 40, 8, 8, '255,120,60', 'screen'); }
    // the table: bundles of tapers, red votive cups, incense, the cash tin
    R(x, 0, 12, W, 2, '#3a2412'); R(x, 0, 13, W, 1, 'rgba(255,200,140,.35)'); R(x, 2, 0, 2, 12, '#24160b'); R(x, W - 4, 0, 2, 12, '#24160b');
    for (let k = 3; k < W * 0.45; k += 5) { R(x, k, 14, 4, 2, 'rgba(160,120,70,.8)'); for (let s = 0; s < 3; s++) R(x, k + s, 16, 1, 9 + (s % 2) * 2, 'rgba(235,228,215,.85)'); }
    for (let k = Math.round(W * 0.5); k < W * 0.8; k += 4) { R(x, k, 14, 3, 3, 'rgba(180,30,30,.85)'); if (hash(seed + k) < 0.4) flame(x, o, k + 1, 17, k); }
    R(x, Math.round(W * 0.82), 14, 6, 4, '#6a6a70'); R(x, Math.round(W * 0.82), 17, 6, 1, 'rgba(255,255,255,.3)');
    for (let s = 0; s < 4; s++) R(x, Math.round(W * 0.47) + s, 14, 1, 12, 'rgba(150,60,40,.8)');
    if (p.card) { R(x, W - 3, 14, 1, 10, '#1a1008'); card(x, o, W - 3, 28, String(p.card)); }
  },
});

/** A stone hump bridge over a side canal, seen side-on in the middle band; covered with a timber roof as at Hoi An if wanted. */
export const oldqBridgeElement = piece({
  type: 'environment.oldq-bridge', label: 'Canal bridge (Old Quarter)', category: 'environment', libraryUse: 'reusable',
  fields: {
    span: num('Span', 130, 40, 600, 1, 'units'), rise: num('Rise of the deck', 22, 4, 80, 1, 'units'), stone: { kind: 'color', label: 'Stone', default: '#34302a' },
    covered: bool('Covered (timber roof)', true), lanterns: num('Lanterns', 4, 0, 12), lantern: { kind: 'color', label: 'Lantern colour', default: '#ff6a3a' }, water: bool('Water under the arch', true), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.span), tall: Number(p.rise) + (p.covered ? 70 : 24) }),
  bounds: p => { const tall = Number(p.rise) + (p.covered ? 70 : 24); return { x: 0, h: tall, w: Number(p.span), tall }; },
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, top: { x: Number(p.span) / 2, h: Number(p.rise), role: 'surface' } }),
  paint(x, p, o) {
    const S = Number(p.span), rise = Number(p.rise), stone = String(p.stone), seed = Number(p.seed), deck = (u: number) => rise * Math.sin(Math.PI * Math.max(0, Math.min(1, u)));
    // the side canal under it, then the masonry with its arch
    if (p.water !== false) { R(x, 0, -6, S, 10, '#05080a'); for (let k = 0; k < 8; k++) { const sx = (k * 23 + o.t * 0.2 + hash(seed + k) * 40) % S; R(x, sx, 1 - (k % 3) * 2, 4 + (k % 4), 1, 'rgba(255,170,90,.18)'); } }
    x.fillStyle = stone; x.beginPath(); x.moveTo(0, y(0)); for (let u = 0; u <= 1.001; u += 0.05) x.lineTo(S * u, y(deck(u))); x.lineTo(S, 0); x.closePath(); x.fill();
    const aw = S * 0.56, ah = rise * 0.85 + 4;
    x.fillStyle = '#07090a'; x.beginPath(); x.moveTo(S / 2 - aw / 2, y(0)); x.quadraticCurveTo(S / 2 - aw / 2, y(ah), S / 2, y(ah)); x.quadraticCurveTo(S / 2 + aw / 2, y(ah), S / 2 + aw / 2, y(0)); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(210,190,160,.3)'; x.lineWidth = 1; x.beginPath(); x.moveTo(S / 2 - aw / 2 - 3, y(0)); x.quadraticCurveTo(S / 2 - aw / 2 - 3, y(ah + 4), S / 2, y(ah + 4)); x.quadraticCurveTo(S / 2 + aw / 2 + 3, y(ah + 4), S / 2 + aw / 2 + 3, y(0)); x.stroke();
    if (p.water !== false) R(x, S / 2 - aw / 2 + 4, 1, aw - 8, 1, 'rgba(255,170,90,.15)');
    // parapet along the deck
    x.strokeStyle = '#1e1a16'; x.lineWidth = 4; x.beginPath(); for (let u = 0; u <= 1.001; u += 0.05) { const px = S * u, ph = deck(u) + 8; if (u === 0) x.moveTo(px, y(ph)); else x.lineTo(px, y(ph)); } x.stroke();
    x.strokeStyle = 'rgba(210,190,160,.3)'; x.lineWidth = 1; x.beginPath(); for (let u = 0; u <= 1.001; u += 0.05) { const px = S * u, ph = deck(u) + 10; if (u === 0) x.moveTo(px, y(ph)); else x.lineTo(px, y(ph)); } x.stroke();
    // the covered bridge's roof on timber posts
    if (p.covered) {
      const top = rise + 46;
      for (let k = 8; k < S - 4; k += 22) R(x, k, deck(k / S) + 8, 3, top - deck(k / S) - 8, '#3a1e10');
      x.fillStyle = '#1c0d08'; x.beginPath(); x.moveTo(-6, y(top)); x.lineTo(14, y(top + 18)); x.lineTo(S - 14, y(top + 18)); x.lineTo(S + 6, y(top)); x.closePath(); x.fill();
      for (let k = 3; k < 18; k += 3) R(x, -6 + 20 * k / 18, top + k, S + 12 - 40 * k / 18, 1, 'rgba(150,70,40,.28)');
      R(x, -7, top - 1, S + 14, 3, '#0c0604'); R(x, 12, top + 18, S - 24, 3, '#2a140c'); R(x, 12, top + 20, S - 24, 1, 'rgba(255,170,110,.35)');
    }
    const n = Number(p.lanterns), lc = rgb(String(p.lantern)), lh = p.covered ? rise + 44 : rise + 30;
    for (let i = 0; i < n; i++) { const lx = Math.round(S * (i + 0.5) / n), sw = Math.sin(o.t / 50 + i + seed) * 1.1; R(x, lx, lh - 4, 1, 4, '#100806'); x.fillStyle = rgba(lc, 0.45 + 0.5 * flameLevel(o)); x.beginPath(); x.ellipse(lx + sw + 0.5, y(lh - 9), 3.5, 4.5, 0, 0, Math.PI * 2); x.fill(); o.light?.(lx, lh - 9, 8, 10, lc, 'screen'); }
  },
});

export const oldqInteriors: AssetDefinition[] = [oldqRoomElement, lightWellElement, altarElement, timberFloorElement, roofSectionElement, roofTerraceElement, stairDressElement,
  naveElement, roseWindowElement, pewsElement, churchAltarElement, votiveStandElement, confessionalElement, organLoftElement, bellTowerElement, towerFaceElement,
  windowLightElement, churchFrontElement, yardWallElement, oldqTreeElement, gravesElement, grottoElement, candleStallElement, oldqBridgeElement];
