/**
 * INTERIOR KIT, market: the Neon Market seen from inside (Tommi, 2026-10-21). Two places:
 * - a stacked-housing block cut open (after Kowloon's subdivided flats): the stall's back room at the
 *   street (`interior.stall-room`), the narrow stair core with its mailboxes and handbills
 *   (`interior.stair-core`), corridors of cage homes and cubicles (`interior.cage-flats`), a landing with
 *   the shrine and the fuse box (`interior.landing`), the roof's shack village (`interior.rooftop`);
 * - the wet market hall (after Hong Kong's municipal markets): the arched steel roof and its fan of
 *   glazing seen from inside (`interior.hall-shell`), stalls in aisles (`interior.market-stall`), the wet
 *   floor with its drains (`interior.wet-floor`), the cooked-food centre upstairs (`interior.cooked-food`,
 *   `interior.round-table`), a gallery rail (`interior.railing`) and the manager's window
 *   (`interior.office-window`).
 *
 * Each piece is the back of a room or a thing standing in it, drawn in its own frame (origin at its foot
 * on the left, `y(h) = -h`). Attach a block's rooms to its interior handle (level kit) so they show only
 * while the player is inside. Every visual choice is a field; unset choices come from the seed.
 * Notices stay matter-of-fact (the world is deadpan); the colour comes from the goods and the light.
 */
import type { AssetDefinition, Field, Properties, Value } from '../core/composition';
import { rng, text as paintText } from '../core/primitives';
import { windowLit } from '../../world/light';
import { neonPlate } from '../signage/kit';
import { piece, num, select, bool, text, colour, isHex, rgbOf, hash, rgba, y, type Paint } from '../buildings/types';
import * as P from '../buildings/parts';

type X = CanvasRenderingContext2D;

// ---------------------------------------------------------------- shared helpers

/** A pixel-crisp rect in the piece's frame: from `l`, its foot at `h`, `w` wide, `t` tall. */
const R = (x: X, l: number, h: number, w: number, t: number, fill: string) => {
  if (w <= 0 || t <= 0) return;
  x.fillStyle = fill; x.fillRect(Math.round(l), Math.round(y(h + t)), Math.max(1, Math.round(w)), Math.max(1, Math.round(t)));
};
const hexOr = (v: Value, fallback: string) => isHex(v) ? String(v) : fallback;
const rgbField = (v: Value, fallback: string) => isHex(v) ? rgbOf(String(v)) : fallback;
const pick = <T,>(r: () => number, list: readonly T[]) => list[Math.floor(r() * list.length) % list.length];
const colourField = (label: string, value: string): Field => ({ kind: 'color', label, default: value });
const listOf = (label: string, item: Record<string, Field>, addLabel: string, next: (rows: Properties[]) => Properties, value: Properties[]): Field => ({
  kind: 'json', label, default: value, editor: { kind: 'list', item, addLabel, next },
  validate: v => { if (!Array.isArray(v) || !v.every(r => !!r && typeof r === 'object' && !Array.isArray(r))) throw new Error(label + ': expected a list'); },
});
const glowOf = (o: Paint) => o.lighting.outdoor ? 0.45 + 0.55 * o.lighting.lamps : 1;

export const LIGHT_KINDS = ['tube', 'bulb', 'flicker', 'off'] as const;
/** A ceiling light at `cx` under the ceiling `top`, with its cone down to `floor`; returns how bright it is now. */
function ceilingLamp(x: X, o: Paint, kind: string, cx: number, top: number, floor: number, seed: number, col = '220,245,232') {
  if (kind === 'off') { R(x, cx - 8, top - 3, 16, 2, '#232527'); return 0; }
  const flick = kind === 'flicker' ? (hash(Math.floor(o.t / 5) + seed) < 0.2 ? 0.12 : hash(Math.floor(o.t / 41) + seed * 3) < 0.12 ? 0.45 : 1) : 1;
  const warm = kind === 'bulb', c = warm ? '255,205,140' : col, lamp = warm ? top - 9 : top - 3, spread = warm ? 20 : 28;
  if (warm) { R(x, cx, top - 7, 1, 7, 'rgba(0,0,0,.85)'); R(x, cx - 1, top - 10, 3, 3, rgba('255,235,190', 0.95 * flick)); }
  else { R(x, cx - 9, top - 1, 18, 1, '#161718'); R(x, cx - 8, top - 3, 16, 2, rgba('240,250,245', 0.25 + 0.7 * flick)); }
  const g = x.createLinearGradient(0, y(lamp), 0, y(floor));
  g.addColorStop(0, rgba(c, 0.17 * flick)); g.addColorStop(1, rgba(c, 0.025 * flick));
  x.fillStyle = g; x.beginPath(); x.moveTo(cx - 5, y(lamp)); x.lineTo(cx + 5, y(lamp)); x.lineTo(cx + spread, y(floor)); x.lineTo(cx - spread, y(floor)); x.closePath(); x.fill();
  o.light?.(cx, lamp - 1, warm ? 4 : 16, 3, c, 'screen');
  return flick;
}
/** Puffs of steam rising from (cx, h), `n` of them, drifting. */
function steam(x: X, cx: number, h: number, t: number, seed: number, n = 3, a = 0.22, rise = 22) {
  for (let k = 0; k < n; k++) {
    const f = ((t * 0.3 + k * (rise / n) + seed * 7) % rise), dx = Math.round(Math.sin(t / 30 + k + seed) * (1 + f / 8));
    R(x, cx + dx - 1 + (k % 2) * 2, h + f, 2 + Math.floor(f / 8), 2, 'rgba(240,240,235,' + Math.max(0, a * (1 - f / rise)).toFixed(3) + ')');
  }
}
/** An oscillating desk or wall fan, blades turning, `r` its radius. */
function fan(x: X, cx: number, h: number, r: number, t: number, seed: number, wall = false) {
  if (wall) R(x, cx - 1, h - 4, 3, 5, '#2a2b2d'); else { R(x, cx - 1, h - r - 6, 2, r + 6 - 2, '#2a2b2d'); R(x, cx - 4, h - r - 7, 8, 2, '#2a2b2d'); }
  x.strokeStyle = 'rgba(200,200,190,.55)'; x.lineWidth = 1; x.beginPath(); x.arc(cx + 0.5, y(h) + 0.5, r, 0, Math.PI * 2); x.stroke();
  const a0 = t * 0.6 + seed;
  x.strokeStyle = 'rgba(180,200,210,.5)'; x.beginPath();
  for (let k = 0; k < 3; k++) { const a = a0 + (k * Math.PI * 2) / 3; x.moveTo(cx + 0.5, y(h) + 0.5); x.lineTo(cx + 0.5 + Math.cos(a) * (r - 1), y(h) + 0.5 + Math.sin(a) * (r - 1)); }
  x.stroke(); R(x, cx, h, 1, 1, 'rgba(230,230,220,.8)');
}
/** A small tube TV on whatever it stands on, playing the races (green), the news (blue) or a drama (warm). */
function crt(x: X, o: Paint, l: number, h: number, w: number, seed: number) {
  const hh = Math.round(w * 0.78), ch = Math.floor(o.t / 160 + seed) % 3, col = ['90,200,110', '110,150,230', '240,170,110'][ch];
  R(x, l, h, w, hh, '#141414'); R(x, l + 2, h + 2, w - 4, hh - 4, rgba(col, 0.55 + 0.2 * hash(Math.floor(o.t / 4) + seed)));
  if (ch === 0) for (let k = 0; k < 3; k++) R(x, l + 2 + ((Math.round(o.t * 0.15) + k * 5 + seed) % (w - 5)), h + 3 + k, 1, 1, ['255,80,80', '255,230,90', '255,255,255'].map(c => 'rgba(' + c + ',.9)')[k]);
  R(x, l + w / 2 - 3, h + hh, 1, 3, '#1a1a1a'); R(x, l + w / 2 + 2, h + hh, 1, 4, '#1a1a1a');
  o.light?.(l + w / 2, h + hh / 2, w, hh, col, 'screen');
}
/** A rice cooker with its warm-light LED and a breath of steam. */
function riceCooker(x: X, o: Paint, l: number, h: number, seed: number) {
  R(x, l, h, 9, 6, 'rgba(225,220,205,.85)'); R(x, l + 1, h + 6, 7, 2, 'rgba(190,185,170,.9)'); R(x, l + 6, h + 2, 1, 1, 'rgba(255,120,60,.95)');
  steam(x, l + 4, h + 8, o.t, seed, 2, 0.18, 12);
}
/** The red-white-blue striped nylon bags everyone keeps their life in. */
function bags(x: X, l: number, h: number, n: number, seed: number) {
  for (let k = 0; k < n; k++) {
    const bw = 9 + Math.round(hash(seed + k) * 4), bh = 6 + Math.round(hash(seed * 3 + k) * 4), bl = l + k * 8 - (k > 2 ? 18 : 0), bb = h + (k > 2 ? 7 : 0);
    R(x, bl, bb, bw, bh, 'rgba(225,220,210,.75)');
    for (let s = 1; s < bw; s += 3) R(x, bl + s, bb, 1, bh, s % 2 ? 'rgba(200,40,40,.75)' : 'rgba(40,70,170,.75)');
    R(x, bl + 2, bb + bh, bw - 4, 1, 'rgba(0,0,0,.5)');
  }
}
/** Mesh: a frame and bars, the wire of a cage home or a stair gate. */
function mesh(x: X, l: number, h: number, w: number, t: number, col: string, step = 3) {
  x.strokeStyle = rgba(col, 0.75); x.lineWidth = 1; x.strokeRect(Math.round(l) + 0.5, Math.round(y(h + t)) + 0.5, Math.round(w) - 1, Math.round(t) - 1);
  for (let b = l + step; b < l + w - 1; b += step) R(x, b, h + 1, 1, t - 2, rgba(col, 0.32));
  R(x, l + 1, h + Math.round(t / 2), w - 2, 1, rgba(col, 0.3));
}
/**
 * The Market's window onto a light well: an aluminium slider (two sashes, one pushed aside) behind a cage
 * grille, big enough to stand in. The view out is the well: pale by day, a neighbour's sign at night.
 */
function slider(x: X, o: Paint, l: number, h: number, w: number, t: number, seed: number, grille = true) {
  const day = o.lighting.daylight, pulse = 0.5 + 0.5 * Math.sin(o.t / 23 + seed);
  R(x, l - 1, h - 1, w + 2, t + 2, '#07090a'); R(x, l, h, w, t, rgba('170,190,195', 0.12 + 0.3 * day)); R(x, l, h + Math.round(t / 2), w, Math.round(t / 2), rgba('255,58,90', (1 - day) * 0.22 * pulse));
  const half = Math.round(w / 2), slid = hash(seed) < 0.5 ? Math.round(w * 0.22) : 0;
  R(x, l, h, w, 1, 'rgba(175,182,186,.6)'); R(x, l, h + t - 1, w, 1, 'rgba(175,182,186,.6)'); R(x, l, h, 1, t, 'rgba(175,182,186,.6)'); R(x, l + w - 1, h, 1, t, 'rgba(175,182,186,.6)');
  R(x, l + half - 1 - slid, h, 1, t, 'rgba(175,182,186,.55)'); R(x, l + half + 1, h, 1, t, 'rgba(175,182,186,.55)');
  if (grille) { for (let k = l + 2; k < l + w - 1; k += 3) R(x, k, h - 1, 1, t + 2, 'rgba(120,115,105,.65)'); R(x, l - 1, h + Math.round(t / 2), w + 2, 1, 'rgba(120,115,105,.65)'); }
  R(x, l - 2, h - 2, w + 4, 2, 'rgba(230,220,190,.18)');
}
/** A painted two-tone stairwell wall: pale over a dark dado, water stains from the floor above. */
function twoTone(x: X, w: number, h: number, wall: string, dado: string, seed: number) {
  R(x, 0, 0, w, h, wall); R(x, 0, 0, w, 24, dado); R(x, 0, 24, w, 1, 'rgba(230,220,190,.18)');
  for (let k = 0; k < Math.round(w / 22); k++) { const sx = Math.round(hash(seed + k) * w), len = 8 + Math.round(hash(seed * 7 + k) * (h * 0.6)); R(x, sx, h - len, 2, len, 'rgba(0,0,0,.18)'); }
  R(x, 0, 0, w, 2, '#121212');
}
/** Handbills stuck on a wall: loans, locksmiths, plumbers, a lost cat; some half torn. */
function handbills(x: X, l: number, w: number, lo: number, hi: number, n: number, seed: number) {
  for (let k = 0; k < n; k++) {
    const fx = l + Math.round(hash(seed + k * 3) * (w - 8)), fh = lo + Math.round(hash(seed + k * 5) * (hi - lo)), fw = 5 + Math.round(hash(seed + k) * 3), ft = 6 + Math.round(hash(seed * 2 + k) * 3);
    const c = ['235,230,215', '250,230,120', '245,180,200', '220,235,240'][k % 4];
    R(x, fx, fh, fw, k % 5 === 0 ? ft - 3 : ft, rgba(c, 0.62));
    R(x, fx + 1, fh + ft - 2, fw - 2, 1, k % 3 ? 'rgba(200,30,30,.75)' : 'rgba(20,20,20,.6)');
    for (let l2 = fh + 1; l2 < fh + ft - 3; l2 += 2) R(x, fx + 1, l2, fw - 2 - (l2 % 3), 1, 'rgba(30,30,30,.4)');
  }
}

// ---------------------------------------------------------------- the block: subdivided flats

export const FLAT_KINDS = ['cage', 'cubicle', 'bunks', 'kitchen', 'empty'] as const;
const flatItem: Record<string, Field> = {
  kind: { kind: 'select', label: 'Kind', options: [...FLAT_KINDS], default: 'cage' },
  tv: { kind: 'boolean', label: 'TV', default: false },
  window: { kind: 'boolean', label: 'Window onto the light well (cubicle, kitchen)', default: true },
  fan: { kind: 'boolean', label: 'Fan', default: true },
  cooker: { kind: 'boolean', label: 'Rice cooker', default: false },
  bags: { kind: 'number', label: 'Belongings in bags', default: 0.5, min: 0, max: 1, step: 0.05 },
  lit: { kind: 'boolean', label: 'Light on', default: true },
  cloth: { kind: 'color', label: 'Blanket or curtain', default: '#8a3a3a' },
};
const FLATS_DEFAULT: Properties[] = [
  { kind: 'cage', tv: true, fan: true, cooker: false, bags: 0.6, lit: true, cloth: '#7a3434' },
  { kind: 'cage', tv: false, fan: true, cooker: true, bags: 0.8, lit: false, cloth: '#345a7a' },
  { kind: 'cubicle', tv: true, fan: true, cooker: true, bags: 0.4, lit: true, cloth: '#6a5a2a' },
  { kind: 'kitchen', tv: false, fan: false, cooker: true, bags: 0.2, lit: true, cloth: '#5a3a5a' },
];

/** A cage home: tiers of wire bed-cages, each a whole home: mattress, a fan clipped to the wire, bags, a padlock. */
function cageUnit(x: X, o: Paint, l: number, w: number, ih: number, tiers: number, row: Properties, seed: number) {
  const th = Math.floor((ih - 2) / tiers), cloth = rgbField(row.cloth, '138,58,58');
  for (let k = 0; k < tiers; k++) {
    const b = 1 + k * th, s = seed + k * 17, on = row.lit !== false && hash(s) < 0.75;
    R(x, l + 2, b, w - 4, th - 1, on ? 'rgba(255,200,130,.22)' : '#0b0a09');
    R(x, l + 3, b + 1, w - 6, 3, rgba(cloth, 0.8)); R(x, l + 3, b + 4, 6, 2, 'rgba(225,220,205,.7)');
    if (on) { R(x, l + Math.round(w / 2), b + th - 3, 2, 2, 'rgba(255,230,180,.95)'); o.light?.(l + w / 2, b + th / 2, w - 6, th - 2, '255,200,130', 'window'); }
    if (Number(row.bags) > 0) bags(x, l + w - 16, b + 4, Math.min(3, Math.round(Number(row.bags) * 3)), s);
    if (row.tv && k === tiers - 1) crt(x, o, l + 10, b + 4, 9, s);
    if (row.cooker && k === 0) riceCooker(x, o, l + 12, b + 4, s);
    if (row.fan && th > 12) fan(x, l + 6, b + th - 6, 3, o.t, s, true);
    // the hanger rail and the towel, the wire front, the padlock
    R(x, l + 3, b + th - 3, w - 6, 1, 'rgba(150,140,128,.4)'); R(x, l + w - 12, b + th - 8, 4, 5, 'rgba(230,220,190,.45)');
    mesh(x, l + 1, b, w - 2, th, '170,165,150');
    R(x, l + w - 6, b + Math.round(th / 2) - 1, 3, 3, 'rgba(210,180,90,.9)');
  }
}
/** A cubicle: plywood partitions, a curtain half drawn, one bed, a shelf with a whole life on it. */
function cubicleUnit(x: X, o: Paint, l: number, w: number, ih: number, row: Properties, seed: number) {
  const on = row.lit !== false, cloth = rgbField(row.cloth, '138,58,58');
  R(x, l + 2, 1, w - 4, ih - 4, on ? 'rgba(255,190,120,.2)' : '#0b0a09');
  if (on) { R(x, l + Math.round(w / 2), ih - 8, 1, 5, '#000'); R(x, l + Math.round(w / 2) - 1, ih - 11, 3, 3, 'rgba(255,230,180,.95)'); o.light?.(l + w / 2, ih / 2, w - 6, ih - 6, '255,190,120', 'window'); }
  // bed along the back, bags under it, a shelf over it, a calendar
  R(x, l + 3, 1, w - 6, 2, '#2a1c12'); R(x, l + 3, 3, w - 6, 9, '#20160f'); R(x, l + 4, 12, w - 8, 3, rgba(cloth, 0.85)); R(x, l + 4, 15, 8, 3, 'rgba(225,220,205,.7)');
  if (Number(row.bags) > 0) bags(x, l + 6, 1, Math.min(4, Math.round(Number(row.bags) * 4)), seed);
  R(x, l + 3, ih - 20, w - 6, 1, '#3a2a1a');
  for (let k = l + 5; k < l + w - 6; k += 5) R(x, k, ih - 19, 3, 3 + Math.round(hash(seed + k) * 3), rgba(['200,60,50', '230,200,120', '90,130,180', '120,170,90'][k % 4], 0.65));
  R(x, l + w - 14, ih - 32, 8, 10, 'rgba(230,225,210,.6)'); R(x, l + w - 14, ih - 25, 8, 3, 'rgba(200,30,30,.8)');
  if (row.tv) crt(x, o, l + 6, ih - 19, 10, seed);
  if (row.fan) fan(x, l + w - 18, 22, 4, o.t, seed);
  if (row.cooker) riceCooker(x, o, l + Math.round(w / 2) - 4, 15, seed);
  // plywood partitions and the curtain on its wire, half drawn
  R(x, l, 0, 3, ih, '#3a2a1a'); R(x, l, ih - 2, w, 2, '#3a2a1a'); R(x, l, ih - 3, w, 1, 'rgba(200,170,120,.25)');
  const cw = Math.round(w * (0.3 + 0.3 * hash(seed + 9)));
  R(x, l + 3, 2, cw, ih - 6, rgba(cloth, 0.7)); for (let k = l + 5; k < l + 3 + cw; k += 3) R(x, k, 2, 1, ih - 6, 'rgba(0,0,0,.25)');
  R(x, l + 2, ih - 5, w - 4, 1, 'rgba(150,140,128,.6)');
}
/** Metal double bunks, open, a ladder at the end: a bedspace rented by the shift. */
function bunksUnit(x: X, o: Paint, l: number, w: number, ih: number, row: Properties, seed: number) {
  const on = row.lit !== false, cloth = rgbField(row.cloth, '138,58,58'), mid = Math.round(ih * 0.48);
  R(x, l + 2, 1, w - 4, ih - 4, on ? 'rgba(200,230,215,.14)' : '#0b0a09');
  if (on) o.light?.(l + w / 2, ih / 2, w - 6, ih - 6, '200,230,215', 'window');
  for (const b of [6, mid + 4]) { R(x, l + 3, b, w - 6, 2, '#4a4f55'); R(x, l + 4, b + 2, w - 8, 3, rgba(cloth, 0.8)); R(x, l + 4, b + 5, 7, 2, 'rgba(225,220,205,.65)'); }
  for (const px of [l + 3, l + w - 5]) R(x, px, 0, 2, mid + 16, '#4a4f55');
  for (let k = 8; k < mid + 14; k += 5) R(x, l + w - 9, k, 5, 1, '#5a5f66');
  if (Number(row.bags) > 0) bags(x, l + 6, 1, Math.min(3, Math.round(Number(row.bags) * 3)), seed);
  if (row.tv) crt(x, o, l + 8, mid + 9, 9, seed);
  if (row.fan) fan(x, l + w - 16, mid + 16, 3, o.t, seed, true);
  if (row.cooker) riceCooker(x, o, l + Math.round(w / 2), 1, seed);
}
/** The shared cooking corner: a two-ring gas stove on a bench, a wok going, the cylinder underneath. */
function kitchenUnit(x: X, o: Paint, l: number, w: number, ih: number, row: Properties, seed: number) {
  const on = row.lit !== false;
  R(x, l + 2, 1, w - 4, ih - 4, on ? 'rgba(255,200,140,.18)' : '#0b0a09');
  for (let k = l + 3; k < l + w - 3; k += 4) R(x, k, 18, 1, ih - 22, 'rgba(255,255,255,.035)');
  R(x, l + 3, 16, w - 6, 2, '#3a3c40'); R(x, l + 4, 1, 2, 15, '#2a2c30'); R(x, l + w - 6, 1, 2, 15, '#2a2c30');
  R(x, l + 8, 1, 7, 11, 'rgba(210,90,40,.85)'); R(x, l + 9, 12, 5, 2, 'rgba(60,60,60,.9)');
  // the wok on its ring, the flame breathing, steam and the cook's spatula on the rail
  const fl = 0.6 + 0.4 * Math.sin(o.t / 3 + seed);
  R(x, l + w - 22, 18, 12, 1, rgba('120,170,255', 0.8)); R(x, l + w - 21, 19, 10, 1 + Math.round(fl * 2), rgba('255,150,60', 0.75));
  x.fillStyle = '#121212'; x.beginPath(); x.ellipse(l + w - 16, y(22), 8, 3, 0, 0, Math.PI); x.fill();
  steam(x, l + w - 16, 24, o.t, seed, 4, 0.28, 24);
  o.light?.(l + w - 16, 20, 10, 4, '255,150,60', 'screen');
  for (let k = 0; k < 4; k++) R(x, l + 6 + k * 4, ih - 16, 1, 7 + (k % 2) * 2, 'rgba(170,170,170,.6)');
  R(x, l + 4, ih - 9, w - 8, 1, 'rgba(150,140,128,.5)');
  for (let k = 0; k < 3; k++) R(x, l + 20 + k * 4, 18, 3, 6 + k, k === 1 ? 'rgba(60,30,10,.9)' : 'rgba(90,130,60,.8)');
  if (row.cooker) riceCooker(x, o, l + Math.round(w / 2) - 6, 18, seed);
  if (row.tv) crt(x, o, l + w - 14, ih - 18, 9, seed);
}
/** A padlocked plywood door with a notice: the unit is between tenants. */
function emptyUnit(x: X, o: Paint, l: number, w: number, ih: number, seed: number) {
  R(x, l + 2, 1, w - 4, ih - 4, '#1c140d'); for (let k = l + 4; k < l + w - 2; k += 6) R(x, k, 1, 1, ih - 4, 'rgba(0,0,0,.3)');
  R(x, l + Math.round(w / 2) + 4, 20, 3, 4, 'rgba(210,180,90,.9)');
  neonPlate(x, o.t, l + w / 2, y(ih - 18), { text: 'TO LET', col: '30,30,30', size: 5, h: 8, printed: true, bolts: false, glow: 0, fill: 'rgba(232,225,205,.8)', ink: 'rgba(30,30,30,.85)' });
  void seed;
}

export const cageFlatsElement = piece({
  type: 'interior.cage-flats', label: 'Subdivided flats, cut open (kit, Neon Market)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 240, 40, 2000, 1, 'units'), height: num('Storey height', 64, 40, 140, 1, 'units'),
    flats: listOf('Flats along the corridor', flatItem, 'Add flat', rows => ({ ...FLATS_DEFAULT[rows.length % FLATS_DEFAULT.length] }), FLATS_DEFAULT),
    tiers: num('Cage tiers (cage homes)', 2, 1, 3), light: select('Corridor light', LIGHT_KINDS),
    wiring: bool('Cables along the ceiling', true), laundry: bool('Washing hung in the corridor', true),
    wall: colourField('Corridor wall', '#262a26'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.height), w: Number(p.width), tall: Number(p.height) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, ceiling: { x: 0, h: Number(p.height), role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), ih = H - 8, seed = Number(p.seed), rows = (Array.isArray(p.flats) ? p.flats : []) as Properties[];
    R(x, 0, 0, w, H, hexOr(p.wall, '#262a26'));
    R(x, 0, 0, w, 3, '#1a1c1a'); for (let k = 0; k < w; k += 7) R(x, k, 0, 1, 3, 'rgba(255,255,255,.04)');
    const n = rows.length, uw = n ? Math.floor((w - 4) / n) : 0;
    rows.forEach((row, i) => {
      const l = 2 + i * uw, s = seed * 97 + i * 13, kind = String(row.kind);
      // a cubicle or the kitchen gets its window first, the room drawn in front of it
      if (row.window !== false && (kind === 'cubicle' || kind === 'kitchen')) {
        const ww = Math.min(22, uw - 14), wt = Math.max(14, Math.min(28, ih - (kind === 'kitchen' ? 44 : 38))), sill = kind === 'kitchen' ? 22 : 16;
        if (ww >= 12) slider(x, o, l + Math.round((uw - ww) / 2), sill, ww, wt, s);
      }
      if (kind === 'cage') cageUnit(x, o, l, uw, ih, Number(p.tiers), row, s);
      else if (kind === 'cubicle') cubicleUnit(x, o, l, uw, ih, row, s);
      else if (kind === 'bunks') bunksUnit(x, o, l, uw, ih, row, s);
      else if (kind === 'kitchen') kitchenUnit(x, o, l, uw, ih, row, s);
      else emptyUnit(x, o, l, uw, ih, s);
      R(x, l, 0, 2, ih, '#141514'); R(x, l + 2, 0, 1, ih, 'rgba(200,170,120,.12)');
      // the flat's number, stencilled
      paintText(x, String.fromCharCode(65 + (i % 26)) + (1 + Math.floor(seed % 9)), l + 7, y(ih - 3), 'rgba(230,220,190,.45)', 5);
    });
    if (n) R(x, 2 + n * uw, 0, 2, ih, '#141514');
    // cables along the ceiling, sagging from box to box; a junction box with its cover off
    if (p.wiring !== false) {
      x.strokeStyle = 'rgba(0,0,0,.85)'; x.lineWidth = 1;
      for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(0, y(ih - 2 - k)); for (let s = 0; s < w; s += 40) x.quadraticCurveTo(s + 20, y(ih - 6 - k * 2 - hash(seed + s + k) * 3), s + 40, y(ih - 2 - k)); x.stroke(); }
      for (let s = 30; s < w; s += 120) { R(x, s, ih - 9, 7, 6, '#3a3c3e'); R(x, s + 1, ih - 8, 5, 4, 'rgba(0,0,0,.4)'); }
    }
    for (let cx = 36; cx < w - 10; cx += 72) ceilingLamp(x, o, String(p.light), cx, ih, 0, seed + cx);
    // washing on a wire across the corridor, dripping
    if (p.laundry !== false) {
      const top = ih - 12; R(x, 4, top, w - 8, 1, 'rgba(150,140,128,.55)');
      for (let k = 10; k < w - 12; k += 9 + Math.round(hash(seed + k) * 9)) {
        if (hash(seed * 5 + k) < 0.35) continue;
        const c = ['200,70,60', '230,220,200', '90,120,170', '230,170,60', '60,60,70', '240,240,240'][Math.floor(hash(seed + k * 3) * 6)];
        const sway = Math.round(Math.sin(o.t / 70 + k) * 0.6), cl = 5 + Math.round(hash(k) * 4), ch = 6 + Math.round(hash(k + 1) * 6);
        R(x, k + sway, top - ch, cl, ch, rgba(c, 0.7)); R(x, k + sway + 1, top - 1, 1, 1, 'rgba(240,200,120,.8)');
      }
    }
  },
});

/** What a stall's back room keeps on its shelves, by what the stall sells (STALLS in buildings/types.ts). */
const STOCK: Record<string, string[]> = {
  roast: ['190,90,30', '150,60,20', '220,190,140'], fish: ['235,235,240', '120,200,230', '200,60,50'], fruit: ['255,160,40', '230,60,40', '240,220,80'],
  electronics: ['255,61,242', '80,180,255', '230,230,240'], dried: ['170,60,30', '200,140,70', '230,200,140'], clothes: ['255,80,200', '80,180,255', '240,240,240'],
  herbs: ['110,170,70', '160,140,60', '200,60,40'],
};

export const stallRoomElement = piece({
  type: 'interior.stall-room', label: 'Stall back room (kit, Neon Market)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 230, 40, 1000, 1, 'units'), height: num('Storey height', 72, 40, 160, 1, 'units'),
    goods: select('What the stall sells', ['roast', 'fish', 'fruit', 'electronics', 'dried', 'clothes', 'herbs'], 'dried'),
    loft: bool('Sleeping loft over the stall', true), altar: bool('Earth god shrine on the floor', true), tv: bool('TV on the shelf', true),
    boxes: num('Boxes and sacks of stock', 0.7, 0, 1, 0.05), bulbs: num('Bare bulbs', 3, 0, 8), shutter: bool('Rolled-up shutter at the front', true),
    wall: colourField('Wall', '#2a221b'), lit: num('Lights on', 1, 0, 1, 0.05), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.height), w: Number(p.width), tall: Number(p.height) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, ceiling: { x: 0, h: Number(p.height), role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), ih = H - 8, seed = Number(p.seed), r = rng(seed * 331 + 5), lit = Number(p.lit), stock = STOCK[String(p.goods)] ?? STOCK.dried;
    R(x, 0, 0, w, H, hexOr(p.wall, '#2a221b')); if (lit > 0) R(x, 0, 0, w, ih, rgba('255,190,120', 0.1 * lit));
    // steel shelving along the back wall, packed with stock in the stall's colours
    const shelfW = Math.min(w - 20, Math.round(w * 0.62)), sl = p.loft !== false ? w - shelfW - 6 : 8;
    for (const sh of [14, 28, 42]) {
      if (sh > ih - 10) break;
      R(x, sl, sh, shelfW, 2, '#3a3a38');
      for (let k = sl + 2; k < sl + shelfW - 6; k += 5 + Math.round(r() * 4)) R(x, k, sh + 2, 4 + Math.round(r() * 3), 4 + Math.round(r() * 6), rgba(pick(r, stock), 0.55 + 0.3 * r()));
    }
    for (const px of [sl, sl + shelfW - 2]) R(x, px, 0, 2, Math.min(ih - 4, 46), '#3a3a38');
    // the loft: a bed on a plank deck over the stall, a ladder, a fan and someone's things
    if (p.loft !== false) {
      const lw = Math.min(w - shelfW - 14, Math.round(w * 0.36)), lh = Math.round(ih * 0.6);
      R(x, 4, lh, lw, 3, '#2a1a0e'); R(x, 4, lh + 3, lw, 1, 'rgba(230,190,120,.25)'); R(x, 4, 0, 2, lh, '#2a1a0e'); R(x, 4 + lw - 2, 0, 2, lh, '#2a1a0e');
      R(x, 7, lh + 3, lw - 8, 3, 'rgba(120,60,60,.85)'); R(x, 8, lh + 6, 7, 2, 'rgba(225,220,205,.7)');
      fan(x, 4 + lw - 9, lh + 9, 3, o.t, seed, true);
      for (let k = 4; k < lh; k += 5) R(x, 4 + lw + 2, k, 5, 1, '#4a3a2a');
      R(x, 4 + lw + 1, 0, 1, lh + 2, '#4a3a2a'); R(x, 4 + lw + 7, 0, 1, lh + 2, '#4a3a2a');
      if (Number(p.boxes) > 0) bags(x, 10, lh + 3, 2, seed + 4);
    }
    // the family's corner: a red calendar, a TV on its bracket, the earth god's shrine on the floor
    const calX = p.loft !== false ? 30 : w - 16, calH = p.loft !== false ? Math.round(ih * 0.6) + 8 : ih - 24;
    R(x, calX, calH, 9, 12, 'rgba(230,225,210,.65)'); R(x, calX, calH + 7, 9, 5, 'rgba(200,30,30,.85)');
    if (p.tv !== false) { R(x, sl + shelfW - 20, ih - 22, 16, 1, '#3a3a38'); crt(x, o, sl + shelfW - 18, ih - 21, 12, seed); }
    const ax = Math.round(w * 0.5) - 7;
    if (p.altar !== false) {
      R(x, ax, 0, 14, 12, '#5a0e0a'); R(x, ax + 2, 2, 10, 7, '#2a0604'); R(x, ax, 12, 14, 1, 'rgba(255,190,90,.7)');
      for (const dx of [3, 10]) { R(x, ax + dx, 4, 1, 3, rgba('255,70,50', 0.7 + 0.3 * Math.sin(o.t / 9 + dx))); o.light?.(ax + dx, 5, 3, 3, '255,60,40', 'screen'); }
      R(x, ax + 5, 2, 4, 2, 'rgba(255,150,40,.9)'); steam(x, ax + 7, 13, o.t * 0.5, seed, 2, 0.16, 16);
    }
    // stock out on the floor: cartons and sacks
    const nb = Math.round(Number(p.boxes) * 6);
    for (let k = 0; k < nb; k++) {
      const bx = sl + 4 + Math.round(hash(seed + k) * Math.max(1, shelfW - 20)), bw = 10 + Math.round(hash(seed + k * 3) * 6), bh = 7 + Math.round(hash(seed + k * 5) * 6), stack = k % 3 === 2 ? 9 : 0;
      if (p.altar !== false && bx + bw > ax - 2 && bx < ax + 16) continue;
      if (k % 2) { R(x, bx, stack, bw, bh, '#5a4020'); R(x, bx, stack + bh, bw, 1, 'rgba(230,210,170,.35)'); R(x, bx + 2, stack + bh - 3, bw - 4, 2, rgba(pick(r, stock), 0.8)); }
      else { R(x, bx, stack, bw, bh, '#6a5232'); R(x, bx + Math.round(bw / 2), stack, 1, bh, 'rgba(0,0,0,.25)'); R(x, bx + 1, stack + bh - 2, bw - 2, 1, 'rgba(255,255,255,.12)'); }
    }
    // bare bulbs on cords, and the shutter rolled up at the front
    const nbulb = Number(p.bulbs);
    for (let k = 0; k < nbulb; k++) if (lit > 0) ceilingLamp(x, o, 'bulb', Math.round((w * (k + 0.5)) / nbulb), ih, 0, seed + k); else R(x, Math.round((w * (k + 0.5)) / nbulb) - 1, ih - 10, 3, 3, '#2a2420');
    if (p.shutter !== false) { R(x, 0, ih - 7, w, 7, '#1c1d1f'); for (let k = 0; k < w; k += 3) R(x, k, ih - 7, 1, 7, 'rgba(255,255,255,.06)'); R(x, 0, ih - 7, w, 1, 'rgba(0,0,0,.6)'); }
  },
});

export const stairCoreElement = piece({
  type: 'interior.stair-core', label: 'Stair core, one storey (kit, Neon Market)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 92, 30, 400, 1, 'units'), height: num('Storey height', 64, 40, 160, 1, 'units'), label: text('Floor painted on the wall', '1/F'),
    labelFrom: num('Floor label from the left', 14, 0, 400, 1, 'units'), labelAt: num('Floor label height', 36, 0, 160, 1, 'units'),
    mailboxes: bool('Mailboxes', false), flyers: num('Handbills on the wall', 0.6, 0, 1, 0.05), window: bool('Barred window to the light well', true), windowFrom: num('Window from the left', 38, 0, 400, 1, 'units'),
    light: select('Light', LIGHT_KINDS, 'bulb'), wall: colourField('Wall', '#2d302a'), dado: colourField('Dado (lower wall)', '#1c3226'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.height), w: Number(p.width), tall: Number(p.height) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, ceiling: { x: 0, h: Number(p.height), role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), ih = H - 8, seed = Number(p.seed);
    twoTone(x, w, H, hexOr(p.wall, '#2d302a'), hexOr(p.dado, '#1c3226'), seed);
    if (p.window !== false) {
      // a window onto the light well, big enough to stand in: an aluminium slider behind a grille
      const wt = Math.max(16, Math.min(28, ih - 24)), sill = Math.max(4, Math.min(ih - wt - 4, 20));
      slider(x, o, Math.min(w - 26, Number(p.windowFrom)), sill, 24, wt, seed);
    }
    const label = String(p.label ?? '');
    if (label) paintText(x, label, Number(p.labelFrom), y(Number(p.labelAt)), 'rgba(230,220,190,.55)', 9, '700');
    if (Number(p.flyers) > 0) handbills(x, 4, w - 8, 12, ih - 16, Math.round(Number(p.flyers) * (w / 9)), seed);
    if (p.mailboxes) {
      // a bank of letterboxes against the far wall, flat numbers on brass tags, one stuffed with flyers
      const ml = w - 28; R(x, ml - 1, 25, 26, 22, '#1a1c1d');
      for (let rI = 0; rI < 3; rI++) for (let c = 0; c < 3; c++) { const bx = ml + c * 8, bh = 26 + rI * 7; R(x, bx, bh, 7, 6, '#3c4044'); R(x, bx + 1, bh + 4, 5, 1, '#0c0d0e'); R(x, bx + 1, bh + 1, 2, 1, 'rgba(210,180,90,.7)'); }
      R(x, ml + 9, 37, 5, 3, 'rgba(250,230,120,.7)'); R(x, ml + 17, 30, 4, 2, 'rgba(235,230,215,.7)');
    }
    ceilingLamp(x, o, String(p.light), Math.round(w / 2), ih, 0, seed);
  },
});

export const landingElement = piece({
  type: 'interior.landing', label: 'Stair landing: shrine and fuse box (kit, Neon Market)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 110, 40, 600, 1, 'units'), height: num('Storey height', 64, 40, 160, 1, 'units'),
    shrine: bool('Shrine on the wall', true), earthGod: bool('Earth god on the floor', true), fuse: select('Fuse box', ['closed', 'open', 'sparking'], 'sparking'),
    meters: num('Electricity meters', 4, 0, 10), gate: bool('Metal gate to a flat', true), shoes: bool('Shoes by the gate', true), chair: bool('Plastic stool', true),
    notice: text('Notice (empty: none)', 'NO HAWKING'), light: select('Light', LIGHT_KINDS, 'tube'),
    wall: colourField('Wall', '#2d302a'), dado: colourField('Dado (lower wall)', '#1c3226'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.height), w: Number(p.width), tall: Number(p.height) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, ceiling: { x: 0, h: Number(p.height), role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), ih = H - 8, seed = Number(p.seed), t = o.t;
    twoTone(x, w, H, hexOr(p.wall, '#2d302a'), hexOr(p.dado, '#1c3226'), seed);
    let at = 6;
    if (p.gate !== false) {
      // a flat's door behind its steel gate, a red paper strip over it, slippers outside
      R(x, at, 0, 24, 44, '#2a1a10'); R(x, at + 18, 20, 2, 3, 'rgba(210,180,90,.8)'); R(x, at - 1, 44, 26, 2, '#1a1a1a');
      mesh(x, at - 1, 0, 26, 44, '150,150,140', 4);
      R(x, at + 2, 46, 20, 4, 'rgba(200,30,30,.85)'); R(x, at + 6, 47, 12, 1, 'rgba(255,210,120,.8)');
      if (p.shoes !== false) for (let k = 0; k < 3; k++) R(x, at + 28 + k * 5, 0, 4, 1 + (k % 2), ['rgba(60,90,160,.9)', 'rgba(220,210,190,.8)', 'rgba(200,50,50,.9)'][k]);
      at += 46;
    }
    if (Number(p.meters) > 0) {
      // the meter board: one dial per flat, the discs turning at different speeds
      const n = Number(p.meters), mw = n * 9 + 4, ml = Math.min(w - mw - 4, at); R(x, ml, ih - 22, mw, 16, '#1d1f20');
      for (let k = 0; k < n; k++) { const mx = ml + 3 + k * 9; R(x, mx, ih - 19, 7, 10, '#3c3e40'); R(x, mx + 1, ih - 13, 5, 3, 'rgba(230,230,220,.7)'); R(x, mx + 1 + (Math.floor(t * (0.05 + hash(seed + k) * 0.2)) % 5), ih - 16, 1, 1, 'rgba(0,0,0,.9)'); }
      at = Math.max(at, ml + mw + 4);
    }
    const fuse = String(p.fuse), fx = Math.min(w - 26, Math.max(at, Math.round(w * 0.45)));
    // the fuse box and the spaghetti coming out of it, up into the ceiling
    x.strokeStyle = 'rgba(0,0,0,.9)'; x.lineWidth = 1;
    for (let k = 0; k < 6; k++) { x.beginPath(); x.moveTo(fx + 3 + k * 2, y(48)); x.bezierCurveTo(fx + 3 + k * 2, y(ih - 6), fx - 20 + k * 12, y(ih - 10 + k), fx - 40 + k * 22, y(ih - 1)); x.stroke(); }
    R(x, fx, 26, 18, 22, '#3a3d40'); R(x, fx + 1, 27, 16, 20, fuse === 'closed' ? '#45494d' : '#15171a');
    if (fuse !== 'closed') {
      for (let rI = 0; rI < 3; rI++) for (let c = 0; c < 4; c++) R(x, fx + 2 + c * 4, 30 + rI * 6, 3, 4, (rI + c + seed) % 5 ? '#d8d4c8' : '#c83a30');
      R(x, fx + 18, 26, 6, 22, '#45494d');
      if (fuse === 'sparking' && hash(Math.floor(t / 3) + seed) < 0.12) { for (let k = 0; k < 4; k++) R(x, fx + 6 + Math.round(hash(t + k) * 8), 40 + Math.round(hash(t * 3 + k) * 8), 1, 1, 'rgba(255,240,170,.95)'); o.light?.(fx + 9, 44, 6, 6, '255,230,150', 'screen'); }
    } else R(x, fx + 8, 34, 2, 4, '#1a1a1a');
    R(x, fx + 3, 48, 12, 4, 'rgba(255,200,40,.85)'); R(x, fx + 5, 49, 8, 1, '#1a1a1a');
    if (p.shrine !== false) {
      // a red altar box on the wall: gold trim, electric candles, oranges, incense curling up
      const sx = Math.min(w - 26, fx + 30); R(x, sx, 30, 22, 20, '#5a0e0a'); R(x, sx + 2, 32, 18, 14, '#260604'); R(x, sx - 1, 50, 24, 2, 'rgba(230,180,80,.85)'); R(x, sx - 1, 29, 24, 2, '#3a0806');
      R(x, sx + 8, 34, 6, 9, 'rgba(230,180,80,.5)'); R(x, sx + 9, 43, 4, 2, 'rgba(230,180,80,.5)');
      for (const dx of [3, 17]) { R(x, sx + dx, 34, 2, 5, rgba('255,60,40', 0.75 + 0.25 * Math.sin(t / 7 + dx))); o.light?.(sx + dx + 1, 38, 4, 4, '255,60,40', 'screen'); }
      for (let k = 0; k < 3; k++) R(x, sx + 4 + k * 5, 30, 4, 3, 'rgba(255,150,40,.95)');
      for (let k = 0; k < 3; k++) R(x, sx + 10 + k, 52, 1, 6, 'rgba(200,120,60,.8)');
      steam(x, sx + 11, 58, t * 0.4, seed, 3, 0.2, 18);
    }
    if (p.earthGod !== false) { const gx = Math.min(w - 16, fx - 2); R(x, gx, 0, 12, 10, '#5a0e0a'); R(x, gx + 2, 2, 8, 6, '#2a0604'); R(x, gx + 3, 3, 2, 2, 'rgba(255,60,40,.9)'); R(x, gx + 7, 3, 2, 2, 'rgba(255,60,40,.9)'); }
    if (p.chair !== false) { const cx = w - 16; R(x, cx, 12, 9, 2, 'rgba(210,40,40,.95)'); R(x, cx, 0, 1, 12, 'rgba(210,40,40,.95)'); R(x, cx + 8, 0, 1, 12, 'rgba(210,40,40,.95)'); }
    const notice = String(p.notice ?? '');
    if (notice) neonPlate(x, t, Math.round(w * 0.5), y(14), { text: notice, col: '30,30,30', size: 5, h: 8, printed: true, bolts: false, glow: 0, fill: 'rgba(232,225,205,.78)', ink: 'rgba(170,25,25,.9)' });
    ceilingLamp(x, o, String(p.light), Math.round(w * 0.6), ih, 0, seed);
  },
});

export const rooftopElement = piece({
  type: 'interior.rooftop', label: 'Rooftop shack village (kit, Neon Market)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 360, 60, 2000, 1, 'units'), shacks: num('Shacks', 3, 0, 10), antennas: num('Antennas', 10, 0, 40), tanks: num('Water tanks', 2, 0, 6),
    hut: num('Stair head from the left', 228, 0, 2000, 1, 'units'), hutWidth: num('Stair head width (0: none)', 132, 0, 400, 1, 'units'),
    laundry: bool('Washing lines', true), plants: bool('Plants in foam boxes', true), coop: bool('Pigeon coop', true), dish: bool('Satellite dish', true),
    bulbs: bool('String of bulbs', true), tarp: colourField('Tarp colour', '#2a5a8a'), lit: num('Shacks with a light', 0.7, 0, 1, 0.05), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: 120 }),
  bounds: p => ({ x: 0, h: 120, w: Number(p.width), tall: 124 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, roof: { x: Number(p.width) / 2, h: 0, role: 'surface' } }),
  paint(x, p, o) {
    const w = Number(p.width), seed = Number(p.seed), r = rng(seed * 7717 + 3), t = o.t, tarp = rgbField(p.tarp, '42,90,138');
    const hutL = Number(p.hut), hutW = Number(p.hutWidth), clear = (l: number, ww: number) => hutW <= 0 || l + ww < hutL - 4 || l > hutL + hutW + 4;
    // the back parapet and its tar-paper roof
    R(x, 0, 0, w, 8, '#121314'); R(x, 0, 8, w, 1, 'rgba(150,140,128,.3)');
    // the antenna forest: masts with TV aerials, guy wires
    x.strokeStyle = 'rgba(0,0,0,.9)'; x.lineWidth = 1;
    for (let k = 0; k < Number(p.antennas); k++) {
      const ax = Math.round(6 + r() * (w - 12)), ah = 34 + Math.round(r() * 60);
      x.beginPath(); x.moveTo(ax + 0.5, y(8)); x.lineTo(ax + 0.5, y(ah)); x.stroke();
      for (let b = 0; b < 3; b++) { const bh = ah - 3 - b * 5, bw = 8 - b * 2; x.beginPath(); x.moveTo(ax - bw + 0.5, y(bh)); x.lineTo(ax + bw + 0.5, y(bh)); x.stroke(); }
      if (k % 3 === 0) { x.strokeStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.moveTo(ax + 0.5, y(ah - 8)); x.lineTo(ax + 18, y(8)); x.stroke(); x.strokeStyle = 'rgba(0,0,0,.9)'; }
      if (k % 4 === 1) R(x, ax, ah, 1, 1, rgba('255,60,40', 0.5 + 0.5 * Math.sin(t / 15 + k)));
    }
    // water tanks on their stands
    for (let k = 0; k < Number(p.tanks); k++) {
      const tw = 18 + Math.round(r() * 8), tl = Math.round(10 + r() * (w - 40)); if (!clear(tl - tw, tw * 2)) continue;
      P.roofTank(x, tl, y(8), tw, '#141516');
    }
    // the stair head: concrete, a dark doorway where the stairs come up, the lift's machine room on top
    if (hutW > 0) {
      const hh = 58; R(x, hutL, 0, hutW, hh, '#1d1f1e'); R(x, hutL, hh, hutW, 2, '#101111'); R(x, hutL, hh + 2, hutW, 1, 'rgba(150,140,128,.3)');
      for (let k = 0; k < 4; k++) R(x, hutL + 4 + Math.round(hash(seed + k) * (hutW - 8)), hh - 22, 2, 22, 'rgba(0,0,0,.2)');
      const dl = hutL + Math.round(hutW * 0.42), dw = Math.round(hutW * 0.5); R(x, dl, 0, dw, 48, '#0c0c0b'); R(x, dl, 0, dw, 48, 'rgba(255,205,140,.08)');
      R(x, dl + Math.round(dw / 2), 44, 2, 2, 'rgba(255,230,180,.9)'); o.light?.(dl + dw / 2, 30, dw, 40, '255,205,140', 'window');
      R(x, hutL + 6, hh + 3, Math.round(hutW * 0.36), 16, '#191a1a'); for (let k = 0; k < 3; k++) R(x, hutL + 9 + k * 6, hh + 8, 4, 6, '#0b0b0b');
      neonPlate(x, t, Math.round(dl + dw / 2), y(53), { text: 'ROOF', col: '30,30,30', size: 5, h: 8, printed: true, bolts: false, glow: 0, fill: 'rgba(232,225,205,.75)', ink: 'rgba(30,30,30,.85)' });
    }
    // shacks of corrugated sheet, tarps held down with tyres, a lit doorway or window, an AC box
    let sx = 6 + Math.round(r() * 8);
    for (let k = 0; k < Number(p.shacks) && sx < w - 30; k++) {
      const sw = 46 + Math.round(r() * 24), sh = 40 + Math.round(r() * 12), sid = seed * 31 + k;
      if (!clear(sx, sw)) { sx = hutL + hutW + 8; k--; if (sx > w - 30) break; continue; }
      R(x, sx, 0, sw, sh, '#151617'); for (let c = sx + 2; c < sx + sw; c += 3) R(x, c, 0, 1, sh, 'rgba(150,140,128,.16)');
      for (let c = 0; c < 3; c++) R(x, sx + Math.round(r() * (sw - 8)), Math.round(r() * (sh - 10)), 6, 8, 'rgba(150,70,30,.18)');
      R(x, sx - 3, sh, sw + 6, 4, rgba(tarp, 0.85)); R(x, sx - 3, sh + 4, sw + 6, 1, 'rgba(255,255,255,.12)');
      for (const tx of [sx + 4, sx + sw - 12]) { R(x, tx, sh + 4, 8, 3, '#0a0a0a'); R(x, tx + 2, sh + 5, 4, 1, '#222'); }
      const on = hash(sid) < Number(p.lit) && windowLit(sid, o.lighting), dl = sx + 4 + Math.round(r() * (sw - 42));
      R(x, dl, 0, 14, 32, on ? 'rgba(255,190,120,.55)' : '#0b0b0a'); R(x, dl - 1, 32, 16, 1, '#0a0a0a');
      if (on) { R(x, dl + 2, 2, 10, 26, 'rgba(140,40,40,.5)'); o.light?.(dl + 7, 16, 14, 32, '255,190,120', 'window'); }
      // a window you could lean out of: 16 x 16 at waist height, glazed in whatever was to hand, a grille
      const wl = dl + 20 + 16 <= sx + sw - 3 ? dl + 20 : dl - 20 >= sx + 3 ? dl - 20 : -1, won = on && hash(sid + 1) < 0.7;
      if (wl >= 0) { R(x, wl, 16, 16, 16, won ? 'rgba(190,230,215,.5)' : '#0b0b0a'); R(x, wl - 1, 15, 18, 1, '#2a2a2a'); R(x, wl - 1, 32, 18, 1, '#2a2a2a'); for (let g = wl + 3; g < wl + 16; g += 4) R(x, g, 16, 1, 16, 'rgba(150,140,128,.5)'); }
      if (hash(sid + 2) < 0.6) P.acUnit(x, y, sx + sw - 9, Math.max(33, sh - 12));
      sx += sw + 10 + Math.round(r() * 20);
    }
    // a satellite dish, the pigeon coop on legs, foam boxes of greens and chillies
    if (p.dish !== false) P.roofDish(x, Math.round(w * 0.18), y(8), 9, 1, '#161718');
    if (p.coop !== false) {
      const cl = hutW > 0 && hutL + hutW + 40 < w ? hutL + hutW + 6 : Math.round(w * 0.82) - 20; if (cl + 34 <= w) {
        for (const lx of [cl + 1, cl + 30]) R(x, lx, 0, 2, 14, '#2a2b2c');
        R(x, cl, 14, 34, 18, '#0d0e0e'); mesh(x, cl, 14, 34, 18, '170,165,150', 4); R(x, cl - 2, 32, 38, 2, '#2a2b2c');
        for (let k = 0; k < 3; k++) { const px = cl + 6 + k * 9 + Math.round(Math.sin(t / 40 + k) * 1); R(x, px, 16, 5, 3, 'rgba(150,150,160,.9)'); R(x, px + 4, 19, 2, 2, 'rgba(150,150,160,.9)'); }
      }
    }
    if (p.plants !== false) for (let k = 0; k < 4; k++) {
      const px = Math.round(10 + hash(seed + k * 7) * (w - 30)); if (!clear(px, 14)) continue;
      R(x, px, 0, 14, 7, 'rgba(235,235,230,.8)'); R(x, px, 7, 14, 1, 'rgba(255,255,255,.4)');
      for (let c = 0; c < 5; c++) R(x, px + 1 + c * 3, 8, 2, 3 + ((c + k) % 3) * 2, 'rgba(80,150,60,.85)');
      if (k % 2) R(x, px + 5, 11, 2, 2, 'rgba(230,40,30,.9)');
    }
    // washing lines strung from the masts; a string of bulbs over the whole roof
    if (p.laundry !== false) for (let k = 0; k < 2; k++) {
      const l0 = Math.round(w * (0.08 + k * 0.45)), l1 = l0 + Math.round(w * 0.32), lh = 40 + k * 6;
      R(x, l0, 0, 2, lh, '#2a2b2c'); R(x, l1, 0, 2, lh, '#2a2b2c'); R(x, l0, lh - 1, l1 - l0, 1, 'rgba(150,140,128,.6)');
      for (let c = l0 + 5; c < l1 - 6; c += 8 + Math.round(hash(c + seed) * 6)) {
        const col = ['200,70,60', '230,220,200', '90,120,170', '230,170,60', '240,240,240', '60,140,90'][Math.floor(hash(c * 3 + seed) * 6)], sway = Math.round(Math.sin(t / 45 + c) * 1.2);
        R(x, c + sway, lh - 1 - (8 + (c % 3) * 3), 6, 8 + (c % 3) * 3, rgba(col, 0.75));
      }
    }
    if (p.bulbs !== false) {
      const top = 76, glow = glowOf(o); x.strokeStyle = 'rgba(0,0,0,.85)'; x.beginPath(); x.moveTo(0, y(top)); x.quadraticCurveTo(w / 2, y(top - 22), w, y(top)); x.stroke();
      for (let k = 6; k < w; k += 14) { const f = k / w, bh = Math.round(top - 44 * f * (1 - f)); const c = ['255,220,150', '255,90,90', '120,220,140', '255,200,60'][Math.floor(k / 14) % 4]; R(x, k, bh - 3, 2, 2, rgba(c, 0.55 + 0.4 * glow)); o.light?.(k + 1, bh - 2, 3, 3, c, 'screen'); }
    }
  },
});

// ---------------------------------------------------------------- the wet market hall

export const hallShellElement = piece({
  type: 'interior.hall-shell', label: 'Market hall from inside: walls, arched roof, glazing (Neon Market)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 1200, 200, 4000, 1, 'units'), spring: num('Walls up to (arch springs at)', 190, 60, 400, 1, 'units'), rise: num('Arch rise', 170, 40, 400, 1, 'units'),
    bay: num('Columns every', 150, 40, 600, 1, 'units'), steel: colourField('Painted steel', '#2f6f62'), wall: colourField('Wall', '#151b19'), tiles: colourField('Tiles (lower wall)', '#2a302d'),
    glass: colourField('Glazing tint', '#9fc8bf'), rings: num('Rings in the fan of glazing', 3, 0, 6), mullions: num('Ribs in the fan of glazing', 18, 4, 60),
    broken: num('Panes patched or missing', 0.12, 0, 1, 0.01), shafts: num('Light shafts by day', 0.8, 0, 1, 0.05), lamps: num('Hanging lamps', 7, 0, 40), lampDrop: num('Lamps hang down to', 168, 40, 500, 1, 'units'),
    fans: bool('Fans on the columns', true), entrance: select('Way in (strip curtain)', ['left', 'right', 'both', 'none'], 'left'),
    banner: text('Board under the tie (empty: none)', 'COOKED FOOD CENTRE · UPSTAIRS'), bannerFrom: num('Board centre from the left', 450, 0, 4000, 1, 'units'),
    notice: text('Notice on the wall (empty: none)', 'NO SPITTING · NO SMOKING'), noticeFrom: num('Notice centre from the left', 330, 0, 4000, 1, 'units'), noticeAt: num('Notice height', 120, 0, 400, 1, 'units'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.spring) + Number(p.rise) + 10 }),
  bounds: p => ({ x: 0, h: Number(p.spring) + Number(p.rise) + 10, w: Number(p.width), tall: Number(p.spring) + Number(p.rise) + 10 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, crown: { x: Number(p.width) / 2, h: Number(p.spring) + Number(p.rise), role: 'mount' }, spring: { x: 0, h: Number(p.spring), role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), s = Number(p.spring), rise = Number(p.rise), seed = Number(p.seed), t = o.t, r = rng(seed * 4241 + 9);
    const steel = rgbField(p.steel, '47,111,98'), glass = rgbField(p.glass, '159,200,191'), day = o.lighting.daylight, glow = glowOf(o);
    const cx = w / 2, rx = w / 2, inner = (k: number) => ({ rx: rx - k, ry: rise - k });
    // the far gable: wall up to the springing, then the fan of glazing under the arch
    R(x, 0, 0, w, s, hexOr(p.wall, '#151b19'));
    x.save(); x.beginPath(); x.ellipse(cx, y(s), rx - 14, rise - 14, 0, Math.PI, 0); x.closePath(); x.clip();
    const sky = x.createLinearGradient(0, y(s + rise), 0, y(s));
    sky.addColorStop(0, rgba(glass, 0.12 + 0.5 * day)); sky.addColorStop(1, rgba(glass, 0.06 + 0.3 * day));
    x.fillStyle = '#0a1012'; x.fillRect(0, y(s + rise), w, rise); x.fillStyle = sky; x.fillRect(0, y(s + rise), w, rise);
    // at night the panes carry the street's neon from outside, smeared
    if (day < 0.6) for (let k = 0; k < 6; k++) { const nx = Math.round(r() * w), c = ['255,58,90', '255,176,46', '194,123,255', '255,90,70'][k % 4]; const g = x.createRadialGradient(nx, y(s + 20), 0, nx, y(s + 20), 90); g.addColorStop(0, rgba(c, (0.6 - day) * 0.35 * (0.8 + 0.2 * Math.sin(t / 30 + k)))); g.addColorStop(1, rgba(c, 0)); x.fillStyle = g; x.fillRect(nx - 90, y(s + 110), 180, 110); }
    // patched panes: plywood, a missing one, a pigeon on a rib
    const nm = Number(p.mullions);
    for (let k = 0; k < nm; k++) for (let ring = 0; ring <= Number(p.rings); ring++) {
      if (r() > Number(p.broken)) continue;
      const a = Math.PI + (Math.PI * (k + 0.5)) / nm, f = (ring + 0.5) / (Number(p.rings) + 1);
      R(x, Math.round(cx + Math.cos(a) * (rx - 14) * f) - 5, s - Math.round(Math.sin(a) * (rise - 14) * f) - 4, 10, 8, r() < 0.6 ? '#2a1e12' : '#05080a');
    }
    x.strokeStyle = rgba(steel, 0.9); x.lineWidth = 2;
    for (let k = 1; k < nm; k++) { const a = Math.PI + (Math.PI * k) / nm; x.beginPath(); x.moveTo(cx, y(s)); x.lineTo(cx + Math.cos(a) * rx, y(s) + Math.sin(a) * rise); x.stroke(); }
    for (let ring = 1; ring <= Number(p.rings); ring++) { const f = ring / (Number(p.rings) + 1); x.beginPath(); x.ellipse(cx, y(s), (rx - 14) * f, (rise - 14) * f, 0, Math.PI, 0); x.stroke(); }
    x.restore(); x.lineWidth = 1;
    // light shafts slanting down through the dusty air, motes turning in them
    const shafts = Number(p.shafts) * day;
    if (shafts > 0.02) for (let k = 0; k < 5; k++) {
      const tx = Math.round(w * (0.14 + k * 0.18)), sl = 70, sw = 36;
      const g = x.createLinearGradient(0, y(s + rise * 0.6), 0, y(0)); g.addColorStop(0, rgba('255,245,215', 0.13 * shafts)); g.addColorStop(1, rgba('255,245,215', 0.015 * shafts));
      x.fillStyle = g; x.beginPath(); x.moveTo(tx, y(s + rise * 0.55)); x.lineTo(tx + sw, y(s + rise * 0.55)); x.lineTo(tx + sw + sl, y(0)); x.lineTo(tx + sl, y(0)); x.closePath(); x.fill();
      for (let m = 0; m < 6; m++) { const mh = ((t * 0.1 + m * 37 + k * 11) % (s + rise * 0.5)), mx = tx + sl * (1 - mh / (s + rise * 0.55)) + ((m * 13 + k * 7) % sw); R(x, mx, mh, 1, 1, rgba('255,245,215', 0.5 * shafts)); }
    }
    // the lower wall: white tiles gone grey, a grid of grout, a gutter at the foot
    R(x, 0, 0, w, 44, hexOr(p.tiles, '#2a302d'));
    for (let h = 6; h < 44; h += 6) R(x, 0, h, w, 1, 'rgba(0,0,0,.22)'); for (let k = 0; k < w; k += 6) R(x, k, 0, 1, 44, 'rgba(0,0,0,.14)');
    R(x, 0, 44, w, 2, rgba(steel, 0.6)); R(x, 0, 0, w, 2, '#0a0c0b');
    // columns: riveted steel, numbered, a fan bolted on, a painted bay number
    const bay = Number(p.bay);
    for (let k = bay / 2, i = 0; k < w - 10; k += bay, i++) {
      const c = Math.round(k); R(x, c - 5, 0, 10, s, rgba(steel, 0.95)); R(x, c - 5, 0, 2, s, 'rgba(0,0,0,.35)'); R(x, c + 3, 0, 1, s, 'rgba(255,255,255,.12)');
      for (let h = 10; h < s; h += 14) R(x, c - 3, h, 1, 1, 'rgba(255,255,255,.25)');
      R(x, c - 8, 0, 16, 6, '#1a1e1c');
      paintText(x, String.fromCharCode(65 + (i % 26)), c, y(s - 18), 'rgba(240,235,220,.7)', 8, '700');
      if (p.fans !== false && i % 2 === 0) fan(x, c + 12, s - 52, 6, t, seed + i, true);
    }
    // the tie girder along the springing, a lattice
    R(x, 0, s - 10, w, 2, rgba(steel, 0.95)); R(x, 0, s - 2, w, 2, rgba(steel, 0.95));
    x.strokeStyle = rgba(steel, 0.8); x.beginPath(); for (let k = 0; k < w; k += 10) { x.moveTo(k, y(s - 8)); x.lineTo(k + 5, y(s - 2)); x.lineTo(k + 10, y(s - 8)); } x.stroke();
    // the near arch rib: a deep lattice truss with the corrugated roof on its back
    const a = inner(0), b = inner(14);
    x.fillStyle = '#0c1110'; x.beginPath(); x.ellipse(cx, y(s), a.rx + 6, a.ry + 6, 0, Math.PI, 0); x.ellipse(cx, y(s), a.rx, a.ry, 0, 0, Math.PI, true); x.closePath(); x.fill();
    for (let k = 0; k < 60; k++) { const th = Math.PI + (Math.PI * k) / 60; R(x, Math.round(cx + Math.cos(th) * (a.rx + 3)), s - Math.round(Math.sin(th) * (a.ry + 3)) - 3, 2, 4 + (k % 3) * 2, 'rgba(150,70,30,.25)'); }
    x.strokeStyle = rgba(steel, 1); x.lineWidth = 2;
    for (const e of [a, b]) { x.beginPath(); x.ellipse(cx, y(s), e.rx, e.ry, 0, Math.PI, 0); x.stroke(); }
    x.lineWidth = 1; x.beginPath();
    for (let k = 0; k < 72; k++) { const t0 = Math.PI + (Math.PI * k) / 72, t1 = Math.PI + (Math.PI * (k + 1)) / 72, o0 = k % 2 ? a : b, o1 = k % 2 ? b : a; x.moveTo(cx + Math.cos(t0) * o0.rx, y(s) + Math.sin(t0) * o0.ry); x.lineTo(cx + Math.cos(t1) * o1.rx, y(s) + Math.sin(t1) * o1.ry); }
    x.stroke();
    x.strokeStyle = 'rgba(255,200,140,.25)'; x.beginPath(); x.ellipse(cx, y(s), b.rx - 1, b.ry - 1, 0, Math.PI, 0); x.stroke();
    // the hall's side walls in section, a way in through a strip curtain
    const ent = String(p.entrance), opening = 96;
    for (const [side, l] of [['left', 0], ['right', w - 10]] as const) {
      const open = ent === side || ent === 'both';
      R(x, l, open ? opening : 0, 10, s - (open ? opening : 0), '#2a2e2c'); R(x, side === 'left' ? l + 9 : l, open ? opening : 0, 1, s - (open ? opening : 0), 'rgba(255,190,120,.35)');
      if (open) {
        // the street glows in through it
        const g = x.createLinearGradient(side === 'left' ? 0 : w, 0, side === 'left' ? 120 : w - 120, 0); g.addColorStop(0, rgba('255,90,120', 0.18 * glow)); g.addColorStop(1, rgba('255,90,120', 0));
        x.fillStyle = g; x.fillRect(side === 'left' ? 0 : w - 120, y(opening), 120, opening);
        R(x, l - 2, opening - 4, 14, 4, '#2a2e2c');
        for (let k = 0; k < 6; k++) { const sx = l + k * 2 + Math.round(Math.sin(t / 50 + k) * 0.8); R(x, sx, 2, 1, opening - 6, 'rgba(210,225,220,.22)'); }
      }
    }
    // hanging lamps on long cords from the rib: enamel shades, warm bulbs, light pooled below
    const nl = Number(p.lamps), drop = Number(p.lampDrop);
    for (let k = 0; k < nl; k++) {
      const lx = Math.round(w * (k + 0.5) / nl), f = (lx - cx) / b.rx, top = s + b.ry * Math.sqrt(Math.max(0, 1 - f * f)), lh = Math.min(drop, top - 14);
      if (lh < 30) continue;
      R(x, lx, lh + 4, 1, Math.round(top - lh - 4), 'rgba(0,0,0,.8)');
      x.fillStyle = rgba(steel, 1); x.beginPath(); x.moveTo(lx - 2, y(lh + 5)); x.lineTo(lx + 3, y(lh + 5)); x.lineTo(lx + 7, y(lh)); x.lineTo(lx - 6, y(lh)); x.closePath(); x.fill();
      R(x, lx - 2, lh - 2, 5, 2, rgba('255,235,190', 0.6 + 0.4 * glow));
      const g = x.createLinearGradient(0, y(lh), 0, y(0)); g.addColorStop(0, rgba('255,215,150', 0.12)); g.addColorStop(1, rgba('255,215,150', 0.02));
      x.fillStyle = g; x.beginPath(); x.moveTo(lx - 6, y(lh)); x.lineTo(lx + 7, y(lh)); x.lineTo(lx + 40, y(0)); x.lineTo(lx - 39, y(0)); x.closePath(); x.fill();
      o.light?.(lx, lh - 2, 8, 4, '255,215,150', 'screen');
    }
    const banner = String(p.banner ?? ''), notice = String(p.notice ?? '');
    if (banner) { const bx = Math.round(Number(p.bannerFrom)); R(x, bx - 40, s - 22, 1, 12, 'rgba(0,0,0,.8)'); R(x, bx + 40, s - 22, 1, 12, 'rgba(0,0,0,.8)'); neonPlate(x, t, bx, y(s - 28), { text: banner, col: '255,200,60', size: 7, h: 12, printed: true, bolts: false, glow: 0, fill: '#14100a', ink: 'rgba(255,210,90,.95)' }); }
    if (notice) neonPlate(x, t, Math.round(Number(p.noticeFrom)), y(Number(p.noticeAt)), { text: notice, col: '30,30,30', size: 6, h: 10, printed: true, bolts: false, glow: 0, fill: 'rgba(232,225,205,.8)', ink: 'rgba(170,25,25,.9)' });
  },
});

export const HALL_STALLS = ['fish', 'meat', 'veg', 'fruit', 'dried', 'tofu', 'flowers', 'herbs', 'rice'] as const;
const HALL_NAMES: Record<string, string> = { fish: 'SEAFOOD', meat: 'FRESH PORK', veg: 'VEGETABLES', fruit: 'FRUIT', dried: 'DRIED SEAFOOD', tofu: 'TOFU · SOY', flowers: 'FLOWERS', herbs: 'HERBAL MEDICINE', rice: 'RICE · GRAIN' };
const HALL_LAMP: Record<string, string> = { fish: 'cold', meat: 'red', veg: 'warm', fruit: 'warm', dried: 'warm', tofu: 'cold', flowers: 'warm', herbs: 'warm', rice: 'warm' };
const LAMP_COL: Record<string, string> = { red: '255,70,70', warm: '255,210,140', cold: '200,235,240', green: '170,255,150' };
const CANOPIES = ['200,40,40', '40,90,200', '230,180,40', '40,150,90', '220,90,160'];

export const marketStallElement = piece({
  type: 'interior.market-stall', label: 'Wet market stall (kit, Neon Market)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 76, 36, 240, 1, 'units'), kind: select('Sells', HALL_STALLS), lamp: select('Lamp colour', ['auto', 'red', 'warm', 'cold', 'green']),
    sign: text('Name board (empty: what it sells, - for none)', ''), number: text('Stall number (empty: none)', 'A12'), neon: bool('Name in neon', false),
    canopy: bool('Plastic canopy', true), canopyColour: colour('Canopy colour'), prices: num('Price cards', 3, 0, 10), wet: bool('Hose and puddle', true), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: 92 }),
  bounds: p => ({ x: -6, h: 92, w: Number(p.width) + 12, tall: 96 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, counter: { x: Number(p.width) / 2, h: 28, role: 'surface' } }),
  paint(x, p, o) {
    const w = Number(p.width), kind = String(p.kind), seed = Number(p.seed), t = o.t, r = rng(seed * 613 + 1);
    const lampKind = p.lamp === 'auto' ? HALL_LAMP[kind] ?? 'warm' : String(p.lamp), lc = LAMP_COL[lampKind] ?? LAMP_COL.warm, glow = glowOf(o);
    const top = 30, rail = 66;
    // the back: a steel frame, lit in the lamp's colour; shelves
    R(x, 0, 0, w, 78, '#0d0f0e'); R(x, 0, top, w, rail - top, rgba(lc, 0.14 + 0.08 * glow));
    R(x, 0, 0, 2, 80, '#3a3d3c'); R(x, w - 2, 0, 2, 80, '#3a3d3c'); R(x, 0, rail, w, 2, '#4a4e4c');
    if (kind === 'fish') {
      // aerated tanks stacked against the back: fish turning, bubbles going up
      for (let row = 0; row < 2; row++) for (let k = 3; k + 16 < w; k += 18) {
        const th = top + 2 + row * 16; R(x, k, th, 16, 14, 'rgba(40,140,170,.45)'); x.strokeStyle = 'rgba(150,220,235,.6)'; x.strokeRect(k + 0.5, y(th + 14) + 0.5, 15, 13);
        for (let f = 0; f < 2; f++) { const fx = k + 2 + ((t * 0.07 + f * 6 + k + row * 3) % 10); R(x, fx, th + 4 + f * 5, 3, 1, f ? 'rgba(255,140,60,.9)' : 'rgba(225,230,240,.85)'); }
        for (let bI = 0; bI < 2; bI++) R(x, k + 12, th + 1 + ((t * 0.4 + bI * 6 + k) % 12), 1, 1, 'rgba(230,250,255,.8)');
        o.light?.(k + 8, th + 7, 14, 12, '120,200,220', 'screen');
      }
      // crushed ice on the counter, fish laid out in rows, a crab or two tied with straw
      R(x, 2, top - 4, w - 4, 4, 'rgba(225,235,240,.85)'); for (let k = 3; k < w - 4; k += 2) R(x, k, top - 1 - (k % 3), 1, 1, 'rgba(160,200,220,.7)');
      for (let k = 5; k < w - 12; k += 11) { x.fillStyle = 'rgba(190,200,210,.95)'; x.beginPath(); x.ellipse(k + 4, y(top + 1), 5, 2, 0, 0, Math.PI * 2); x.fill(); R(x, k + 9, top, 2, 2, 'rgba(190,200,210,.95)'); R(x, k + 1, top + 1, 1, 1, '#111'); }
      for (let k = 0; k < 2; k++) R(x, w - 16 + k * 6, top + 1, 5, 3, 'rgba(230,110,50,.95)');
    } else if (kind === 'meat') {
      // sides and cuts on hooks under the red lamp, the stump block and its cleaver
      for (let k = 4, j = 0; k < w - 8; k += 9, j++) {
        const sw = Math.round(Math.sin(t / 70 + j) * 0.6), len = 14 + (j % 3) * 5;
        R(x, k + 3 + sw, rail - 4, 1, 4, 'rgba(180,180,180,.8)');
        R(x, k + sw, rail - 4 - len, 7, len, j % 2 ? 'rgba(200,80,80,.95)' : 'rgba(180,60,60,.95)'); R(x, k + sw + 1, rail - 4 - len, 2, len, 'rgba(240,215,200,.7)');
      }
      x.fillStyle = '#4a3020'; x.beginPath(); x.ellipse(w / 2, y(top), 14, 3, 0, 0, Math.PI * 2); x.fill(); R(x, w / 2 - 14, top - 6, 28, 6, '#3a2418');
      R(x, w / 2 + 2, top + 2, 9, 5, 'rgba(200,200,205,.9)'); R(x, w / 2 + 11, top + 3, 4, 2, '#2a1a10');
      R(x, 4, top - 3, 14, 3, 'rgba(210,90,90,.9)'); R(x, w - 20, top - 3, 14, 3, 'rgba(230,150,150,.9)');
    } else if (kind === 'veg') {
      // bok choy, gourds and chillies heaped, baskets of tomatoes, ginger in a box
      for (let k = 2; k < w - 4; k += 5) { R(x, k, top - 3, 4, 3, 'rgba(235,240,220,.85)'); R(x, k - 1, top, 6, 4 + (k % 3), 'rgba(70,160,60,.95)'); }
      for (let k = 6; k < w - 12; k += 16) { R(x, k, top + 6, 10, 4, 'rgba(160,200,90,.9)'); R(x, k + 10, top + 7, 2, 2, 'rgba(120,90,40,.9)'); }
      for (let row = 0; row < 3; row++) R(x, 6, top + 12 + row * 8, w - 12, 1, 'rgba(120,90,60,.6)');
      for (let k = 6; k < w - 8; k += 6) { R(x, k, top + 13, 3, 3, 'rgba(230,50,40,.95)'); R(x, k + 2, top + 21, 3, 3, 'rgba(240,140,40,.9)'); R(x, k + 1, top + 29, 2, 4, 'rgba(220,30,30,.9)'); }
    } else if (kind === 'fruit') {
      // pyramids of oranges, dragon fruit, a durian on its own, bananas on the rail
      for (let k = 4; k < w - 14; k += 16) for (let a = 0; a < 3; a++) for (let b2 = 0; b2 < 3 - a; b2++) R(x, k + 2 + b2 * 4 + a * 2, top + a * 3, 3, 3, rgba(['255,150,30', '235,60,120', '240,220,80', '120,200,60'][(k / 16 + seed) % 4 | 0], 0.95));
      for (let k = 4; k < w - 4; k += 6) { R(x, k, rail - 8, 2, 7, 'rgba(240,210,60,.9)'); R(x, k + 2, rail - 10, 2, 6, 'rgba(240,210,60,.9)'); }
      R(x, w - 12, top, 8, 7, 'rgba(150,140,50,.95)'); for (let k = 0; k < 4; k++) R(x, w - 11 + k * 2, top + 7, 1, 1, 'rgba(110,100,30,.9)');
    } else if (kind === 'dried') {
      // open sacks of shrimp, scallops and mushrooms, jars on the shelf, sausages on strings
      for (let k = 3; k < w - 12; k += 13) { R(x, k, top - 6, 12, 8, '#5a4020'); R(x, k + 1, top + 2, 10, 3, rgba(['230,120,80', '230,200,140', '120,80,50', '200,40,30'][(k + seed) % 4], 0.95)); }
      R(x, 2, top + 18, w - 4, 1, '#4a3a2a'); for (let k = 4; k < w - 6; k += 7) { R(x, k, top + 19, 5, 7, 'rgba(220,230,220,.45)'); R(x, k + 1, top + 19, 3, 4, rgba(['200,140,60', '150,60,30', '230,200,140'][k % 3], 0.85)); }
      for (let k = 5; k < w - 6; k += 7) for (let b2 = 0; b2 < 3; b2++) R(x, k, rail - 6 - b2 * 6, 3, 5, 'rgba(160,40,30,.95)');
    } else if (kind === 'tofu') {
      // trays of tofu in water, bottles of soy milk, a steamer going
      for (let k = 4; k < w - 16; k += 18) { R(x, k, top - 2, 16, 3, 'rgba(160,200,215,.55)'); for (let c = 0; c < 3; c++) R(x, k + 1 + c * 5, top - 1, 4, 4, 'rgba(240,235,215,.95)'); }
      for (let k = 4; k < w - 6; k += 5) { R(x, k, top + 18, 3, 8, 'rgba(240,240,230,.85)'); R(x, k, top + 26, 3, 1, 'rgba(60,140,200,.9)'); }
      R(x, w - 16, top, 12, 10, '#7a6a4a'); steam(x, w - 10, top + 10, t, seed, 4, 0.3, 26);
    } else if (kind === 'herbs') {
      // a red cabinet of a hundred drawers, brass pulls, jars on the counter, the scale
      R(x, 3, top, w - 6, rail - top - 4, '#4a1210');
      for (let rI = 0; rI < 4; rI++) for (let k = 5; k < w - 9; k += 8) { R(x, k, top + 3 + rI * 8, 7, 6, '#5a1a14'); R(x, k + 3, top + 5 + rI * 8, 1, 1, 'rgba(230,190,90,.9)'); }
      for (let k = 4; k < w - 20; k += 8) { R(x, k, top - 4, 6, 8, 'rgba(220,230,220,.45)'); R(x, k + 1, top - 4, 4, 4, rgba(['150,90,50', '120,140,60', '200,160,90'][k % 3], 0.85)); }
      R(x, w - 16, top - 4, 12, 1, 'rgba(200,180,120,.9)'); R(x, w - 11, top - 3, 2, 6, 'rgba(200,180,120,.9)'); R(x, w - 15, top + 3, 4, 1, 'rgba(200,180,120,.9)');
    } else if (kind === 'rice') {
      // open sacks rolled down, heaps of rice with a scoop in each, a stack of bags behind
      for (let k = 3; k < w - 14; k += 15) { R(x, k, top - 10, 14, 12, '#7a6a4a'); R(x, k + 1, top + 2, 12, 3, rgba(['245,240,225', '230,215,180', '200,170,120', '120,60,50'][(k + seed) % 4], 0.95)); R(x, k + 9, top + 4, 1, 5, 'rgba(200,200,205,.9)'); }
      for (let rI = 0; rI < 3; rI++) for (let k = 4 + (rI % 2) * 6; k < w - 12; k += 13) { R(x, k, top + 10 + rI * 8, 12, 7, 'rgba(230,220,190,.75)'); R(x, k + 2, top + 12 + rI * 8, 8, 2, 'rgba(200,40,40,.8)'); }
    } else {
      // flowers in buckets, wrapped bunches up the back, a red one for luck
      for (let k = 3; k < w - 10; k += 11) { R(x, k, top - 12, 9, 12, 'rgba(70,90,110,.9)'); for (let f = 0; f < 4; f++) { R(x, k + 1 + f * 2, top, 1, 6 + f, 'rgba(70,140,60,.95)'); R(x, k + f * 2, top + 6 + f, 3, 3, rgba(['255,80,120', '255,220,80', '240,240,240', '200,60,200', '255,120,40'][(k + f + seed) % 5], 0.95)); } }
      for (let k = 4; k < w - 8; k += 9) R(x, k, top + 18, 6, 14, rgba(['255,150,190', '230,230,240', '255,200,120'][k % 3], 0.6));
    }
    // the counter: tiled front, a drip gutter, styrofoam boxes and a red bucket underneath
    R(x, 0, 0, w, top - 4, '#20302c'); for (let k = 0; k < w; k += 5) R(x, k, 0, 1, top - 4, 'rgba(0,0,0,.18)'); for (let h = 5; h < top - 4; h += 5) R(x, 0, h, w, 1, 'rgba(0,0,0,.18)');
    R(x, 0, top - 5, w, 2, '#5a605c'); R(x, 0, top - 4, w, 1, 'rgba(255,255,255,.18)');
    R(x, 4, 0, 14, 8, 'rgba(235,235,240,.85)'); R(x, 5, 8, 12, 1, 'rgba(255,255,255,.5)');
    R(x, w - 14, 0, 9, 9, 'rgba(210,40,40,.95)'); R(x, w - 15, 9, 11, 1, 'rgba(240,80,80,.95)');
    // hanging lamps over the goods, the stall's light pooled on the counter
    for (let k = 0; k < Math.max(1, Math.round(w / 40)); k++) {
      const lx = Math.round((w * (k + 0.5)) / Math.max(1, Math.round(w / 40)));
      R(x, lx, rail - 8, 1, 8, 'rgba(0,0,0,.9)'); R(x, lx - 5, rail - 12, 11, 4, lampKind === 'red' ? '#7a1212' : '#1c3a32'); R(x, lx - 2, rail - 13, 5, 1, rgba(lc, 0.95));
      o.light?.(lx, rail - 14, 8, 3, lc, 'screen');
    }
    o.light?.(w / 2, top + 14, w - 6, 30, lc, 'window');
    // price cards: fluorescent card, black and red marker
    for (let k = 0; k < Number(p.prices); k++) {
      const px = 3 + Math.round(hash(seed + k) * (w - 12)), ph = top + 4 + Math.round(hash(seed * 3 + k) * 22);
      R(x, px, ph, 8, 6, k % 2 ? 'rgba(255,235,80,.95)' : 'rgba(255,140,60,.95)'); R(x, px + 1, ph + 3, 5, 1, 'rgba(20,20,20,.9)'); R(x, px + 1, ph + 1, 6, 1, 'rgba(210,20,20,.95)'); R(x, px + 3, ph - 3, 1, 3, 'rgba(200,180,140,.7)');
    }
    // the canopy: a sloped sheet over the stall, its edge scalloped
    if (p.canopy !== false) {
      const c = isHex(p.canopyColour) ? rgbOf(String(p.canopyColour)) : pick(r, CANOPIES);
      x.fillStyle = rgba(c, 0.9); x.beginPath(); x.moveTo(-5, y(rail + 4)); x.lineTo(w + 5, y(rail + 4)); x.lineTo(w + 2, y(rail + 12)); x.lineTo(-2, y(rail + 12)); x.closePath(); x.fill();
      for (let k = -5; k < w + 5; k += 6) R(x, k + 1, rail + 2, 4, 2, rgba(c, 0.9));
      R(x, -5, rail + 12, w + 10, 1, 'rgba(255,255,255,.18)');
    }
    // the name board on top, the stall number stencilled on the post
    const name = p.sign === '-' ? '' : String(p.sign || HALL_NAMES[kind] || '');
    if (name) { const col = p.neon ? (['255,58,90', '255,176,46', '194,123,255', '255,90,70'][seed % 4]) : '250,240,215'; neonPlate(x, t, Math.round(w / 2), y(84), p.neon ? { text: name, col, size: 6, h: 11, phase: seed, bolts: false } : { text: name, col: '30,30,30', size: 6, h: 11, printed: true, bolts: false, glow: 0, fill: 'rgba(240,232,210,.92)', ink: 'rgba(170,20,20,.95)' }); if (p.neon) o.light?.(w / 2, 84, w * 0.6, 10, col, 'screen'); }
    const number = String(p.number ?? '');
    if (number) paintText(x, number, 8, y(46), 'rgba(240,235,220,.7)', 6, '700');
    if (p.wet !== false) {
      // a hose snaking off the counter, a puddle, drips
      x.strokeStyle = 'rgba(230,200,40,.85)'; x.lineWidth = 2; x.beginPath(); x.moveTo(w - 4, y(top - 6)); x.quadraticCurveTo(w + 8, y(10), w - 2, y(1)); x.lineTo(w - 26, y(1)); x.stroke(); x.lineWidth = 1;
      for (let k = 0; k < 3; k++) R(x, 6 + k * Math.round(w / 3), (top - 6) - ((t * 0.6 + k * 9 + seed) % (top - 6)), 1, 2, 'rgba(180,220,230,.6)');
    }
  },
});

export const wetFloorElement = piece({
  type: 'interior.wet-floor', label: 'Wet market floor: tiles, puddles, drains (kit, Neon Market)', category: 'environment', libraryUse: 'reusable',
  fields: {
    width: num('Width', 1200, 20, 10000, 1, 'units'), depth: num('Depth (down to the frame)', 80, 10, 400, 1, 'units'), tiles: colourField('Tiles', '#18201d'),
    wet: num('Wet (puddles)', 0.8, 0, 1, 0.05), drains: num('Drain every', 140, 30, 800, 1, 'units'), hoses: num('Hoses', 3, 0, 20), edge: colourField('Lit edge', '#3fa88f'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: 4 }),
  bounds: p => ({ x: 0, h: 0, w: Number(p.width), tall: Number(p.depth) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, end: { x: Number(p.width), h: 0, role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), d = Number(p.depth), seed = Number(p.seed), t = o.t, wet = Number(p.wet), edge = rgbField(p.edge, '63,168,143');
    R(x, 0, -d, w, d, hexOr(p.tiles, '#18201d'));
    // tile rows getting deeper towards us, joints staggered
    for (let row = 0, hh = 0; hh < d; row++) { const th = 3 + row * 2; R(x, 0, -hh - 1, w, 1, 'rgba(0,0,0,.35)'); for (let k = (row % 2) * th; k < w; k += th * 2) R(x, k, -hh - th, 1, th, 'rgba(0,0,0,.22)'); hh += th; }
    R(x, 0, -1, w, 1, rgba(edge, 0.5)); R(x, 0, -3, w, 2, 'rgba(0,0,0,.5)');
    // puddles taking the lamps and the stall colours, trembling
    if (wet > 0) for (let k = 0; k < Math.round(w / 60 * wet); k++) {
      const px = Math.round(hash(seed + k) * w), ph = 4 + Math.round(hash(seed * 3 + k) * (d - 10)), pw = 16 + Math.round(hash(seed * 7 + k) * 40);
      const c = ['255,210,140', '255,70,70', '200,235,240', '255,120,60', '170,255,150'][k % 5], a = 0.12 + 0.1 * Math.sin(t / 20 + k);
      x.fillStyle = rgba(c, Math.max(0.03, a * wet)); x.beginPath(); x.ellipse(px, ph, pw / 2, 1.5 + (ph / d) * 3, 0, 0, Math.PI * 2); x.fill();
      R(x, px - Math.round(pw / 4), -ph, Math.round(pw / 2), 1, rgba(c, 0.25 * wet));
    }
    // drain grates in the gutter along the stalls, water running into them
    for (let k = Number(p.drains) / 2; k < w; k += Number(p.drains)) { R(x, k - 8, -8, 16, 4, '#060707'); for (let s = 1; s < 16; s += 3) R(x, k - 8 + s, -8, 1, 4, '#2a2e2c'); R(x, k - 20, -5, 12, 1, rgba('200,235,240', 0.2 * wet)); }
    // hoses lying across the floor
    for (let k = 0; k < Number(p.hoses); k++) {
      const hx = Math.round(hash(seed * 11 + k) * w), c = k % 2 ? '230,200,40' : '60,150,80';
      x.strokeStyle = rgba(c, 0.85); x.lineWidth = 2; x.beginPath(); x.moveTo(hx, 2); x.bezierCurveTo(hx + 20, 10, hx - 30, d * 0.4, hx + 10, d * 0.7); x.stroke();
    }
    x.lineWidth = 1;
  },
});

export const cookedFoodElement = piece({
  type: 'interior.cooked-food', label: 'Cooked-food centre: kitchens and menus (kit, Neon Market)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 560, 80, 3000, 1, 'units'), height: num('Wall height', 88, 50, 300, 1, 'units'), kitchens: num('Kitchens', 3, 0, 10),
    names: text('Kitchen names (comma between)', 'WING KEE,GOLDEN BOWL,LUCKY 8'), menu: num('Menu strips per kitchen', 6, 0, 14), roast: bool('Roast meats in the first window', true),
    steam: num('Steam', 0.8, 0, 1, 0.05), tv: bool('TV on a bracket (the races)', true), clock: bool('Wall clock', true), fridge: bool('Drinks fridge', true),
    notice: text('Notice (empty: none)', 'NO OUTSIDE FOOD'), tiles: colourField('Wall tiles', '#22302b'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.height), w: Number(p.width), tall: Number(p.height) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, counter: { x: Number(p.width) / 2, h: 28, role: 'surface' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), seed = Number(p.seed), t = o.t, n = Number(p.kitchens), names = String(p.names ?? '').split(',').map(s => s.trim()).filter(Boolean), glow = glowOf(o);
    R(x, 0, 0, w, H, hexOr(p.tiles, '#22302b')); for (let k = 0; k < w; k += 5) R(x, k, 0, 1, H, 'rgba(0,0,0,.12)'); for (let h = 5; h < H; h += 5) R(x, 0, h, w, 1, 'rgba(0,0,0,.12)');
    R(x, 0, 0, w, 3, '#101413');
    const kw = 112;
    for (let i = 0; i < n; i++) {
      const l = 8 + i * (kw + 8); if (l + kw > w) break;
      const s = seed * 53 + i, col = ['255,58,90', '255,176,46', '194,123,255', '255,90,70', '120,230,140'][s % 5];
      // the kitchen through its pass: steel, the hood, woks on fierce rings, a cook's light
      R(x, l, 0, kw, 62, '#0c0c0b'); R(x, l, 30, kw, 30, 'rgba(255,190,120,.16)');
      R(x, l + 6, 52, kw - 12, 8, '#3a3c3e'); R(x, l + 6, 52, kw - 12, 1, 'rgba(255,255,255,.2)');
      for (let k = 0; k < 2; k++) {
        const bx = l + 16 + k * 36, fl = 0.5 + 0.5 * Math.sin(t / 2 + s + k * 2);
        R(x, bx - 4, 30, 18, 1, 'rgba(120,170,255,.85)'); R(x, bx - 2, 31, 14, 1 + Math.round(fl * 4), rgba('255,150,50', 0.7 + 0.3 * fl));
        x.fillStyle = '#141414'; x.beginPath(); x.ellipse(bx + 5, y(35), 9, 3, 0, 0, Math.PI); x.fill();
        steam(x, bx + 5, 37, t, s + k, 5, 0.3 * Number(p.steam), 16);
        o.light?.(bx + 5, 32, 14, 6, '255,150,50', 'screen');
      }
      if (p.roast !== false && i === 0) for (let k = l + 82; k < l + kw - 4; k += 6) { R(x, k + 2, 46, 1, 3, 'rgba(180,180,180,.8)'); R(x, k, 36, 5, 10, 'rgba(190,90,30,.95)'); }
      // the counter where you order: steel, a stack of bowls, chopsticks in a tin
      R(x, l, 0, kw, 28, '#4a4e50'); R(x, l, 27, kw, 2, '#6a6e70'); for (let k = l + 4; k < l + kw; k += 12) R(x, k, 0, 1, 27, 'rgba(0,0,0,.2)');
      for (let k = 0; k < 4; k++) R(x, l + 8, 29 + k * 2, 10, 2, 'rgba(235,235,225,.85)'); R(x, l + 24, 29, 5, 7, '#8a8e90'); for (let k = 0; k < 3; k++) R(x, l + 25 + k, 36, 1, 4, 'rgba(200,170,120,.9)');
      // the menu board over the pass: strips of dishes and prices, the name in neon
      const menu = Number(p.menu), mh = 64;
      R(x, l, mh, kw, Math.min(H - mh - 2, 22), '#0a0a09');
      for (let k = 0; k < menu; k++) { const mx = l + 3 + (k % 7) * 15, my = mh + 3 + Math.floor(k / 7) * 9; if (my + 7 > H - 2) break; R(x, mx, my, 14, 7, k % 3 === 0 ? 'rgba(255,230,80,.9)' : k % 3 === 1 ? 'rgba(240,235,220,.85)' : 'rgba(230,60,50,.9)'); R(x, mx + 1, my + 4, 8, 1, 'rgba(20,20,20,.8)'); R(x, mx + 10, my + 4, 3, 1, 'rgba(200,20,20,.9)'); R(x, mx + 1, my + 2, 10, 1, 'rgba(20,20,20,.5)'); }
      const name = names[i % Math.max(1, names.length)] ?? '';
      if (name) { neonPlate(x, t, l + kw / 2, y(mh - 6), { text: name, col, size: 7, h: 11, phase: s, bolts: false, glow: 0.12 }); o.light?.(l + kw / 2, mh - 6, kw * 0.6, 10, col, 'screen'); }
    }
    let at = 8 + Math.min(n, Math.floor((w - 8) / (kw + 8))) * (kw + 8);
    if (p.fridge !== false && at + 34 < w) {
      // a drinks fridge humming, its glass lit, cans and bottles in rows
      R(x, at, 0, 30, 58, '#1a1c1e'); R(x, at + 2, 6, 26, 48, rgba('230,245,240', 0.22 + 0.1 * glow));
      for (let rI = 0; rI < 4; rI++) for (let k = 0; k < 5; k++) R(x, at + 4 + k * 5, 8 + rI * 12, 3, 8, rgba(['220,40,40', '60,160,80', '240,200,60', '230,230,235', '60,90,200'][(k + rI) % 5], 0.85));
      R(x, at + 2, 54, 26, 3, 'rgba(255,58,90,.85)'); o.light?.(at + 15, 30, 26, 48, '230,245,240', 'window'); at += 40;
    }
    if (p.tv !== false && at + 30 < w) { R(x, at + 10, H - 22, 2, 8, '#2a2c2e'); crt(x, o, at, H - 40, 24, seed); at += 34; }
    if (p.clock !== false && at + 16 < w) { x.fillStyle = 'rgba(235,230,215,.85)'; x.beginPath(); x.arc(at + 8, y(H - 22), 6, 0, Math.PI * 2); x.fill(); const m = o.lighting.min; x.strokeStyle = '#111'; x.beginPath(); x.moveTo(at + 8, y(H - 22)); x.lineTo(at + 8 + Math.sin(m / 60 / 12 * Math.PI * 2 * 1) * 3, y(H - 22) - Math.cos((m / 720) * Math.PI * 2) * 3); x.moveTo(at + 8, y(H - 22)); x.lineTo(at + 8 + Math.sin((m % 60) / 60 * Math.PI * 2) * 5, y(H - 22) - Math.cos((m % 60) / 60 * Math.PI * 2) * 5); x.stroke(); at += 20; }
    const notice = String(p.notice ?? '');
    if (notice && at + 40 < w) neonPlate(x, t, at + 40, y(44), { text: notice, col: '30,30,30', size: 6, h: 10, printed: true, bolts: false, glow: 0, fill: 'rgba(232,225,205,.8)', ink: 'rgba(170,25,25,.9)' });
    // fluorescent tubes along the top of the wall
    for (let k = 40; k < w - 20; k += 90) ceilingLamp(x, o, 'tube', k, H, 0, seed + k);
  },
});

export const roundTableElement = piece({
  type: 'interior.round-table', label: 'Round table with stools (kit, Neon Market)', category: 'furniture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 44, 20, 120, 1, 'units'), stools: num('Stools', 4, 0, 8), stoolColour: select('Stool colour', ['red', 'blue', 'mixed']),
    top: colourField('Table top', '#d8cfb8'), dishes: num('Dishes on the table', 0.7, 0, 1, 0.05), bottles: bool('Beer bottles', true), steam: bool('Steam from the bowls', true), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width) + 30, tall: 40 }),
  bounds: p => ({ x: -15, h: 40, w: Number(p.width) + 30, tall: 40 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, top: { x: Number(p.width) / 2, h: 26, role: 'surface' } }),
  paint(x, p, o) {
    const w = Number(p.width), seed = Number(p.seed), n = Number(p.stools), top = rgbField(p.top, '216,207,184');
    const stoolCol = (k: number) => p.stoolColour === 'blue' ? '40,90,200' : p.stoolColour === 'red' ? '210,40,40' : (k + seed) % 2 ? '40,90,200' : '210,40,40';
    const stool = (sx: number, k: number) => { const c = stoolCol(k); R(x, sx, 13, 10, 2, rgba(c, 0.95)); R(x, sx, 0, 1, 13, rgba(c, 0.95)); R(x, sx + 9, 0, 1, 13, rgba(c, 0.95)); R(x, sx + 1, 5, 8, 1, rgba(c, 0.6)); };
    // stools behind the table first, then the table, then the ones in front of it
    for (let k = 0; k < n; k += 2) stool(Math.round(w * (0.2 + 0.6 * (k / Math.max(1, n - 1)))) - 5, k);
    R(x, Math.round(w / 2) - 2, 0, 4, 24, '#2a2c2e'); R(x, Math.round(w / 2) - 10, 0, 20, 2, '#2a2c2e');
    x.fillStyle = rgba(top, 0.95); x.beginPath(); x.ellipse(w / 2, y(26), w / 2, 3, 0, 0, Math.PI * 2); x.fill();
    R(x, 0, 21, w, 4, rgba(top, 0.75)); R(x, 0, 25, w, 1, 'rgba(255,255,255,.3)');
    const nd = Math.round(Number(p.dishes) * 5);
    for (let k = 0; k < nd; k++) {
      const dx = Math.round(w * (0.12 + 0.76 * (k / Math.max(1, nd - 1)))) - 3;
      if (k % 2) { x.fillStyle = 'rgba(240,240,232,.95)'; x.beginPath(); x.ellipse(dx + 3, y(28), 4, 2, 0, 0, Math.PI); x.fill(); if (p.steam !== false) steam(x, dx + 3, 30, o.t, seed + k, 2, 0.22, 12); }
      else { R(x, dx - 1, 27, 9, 1, 'rgba(240,240,232,.9)'); R(x, dx + 1, 28, 5, 2, rgba(['200,90,40', '90,150,60', '230,190,90'][k % 3], 0.9)); }
    }
    if (p.bottles !== false) for (let k = 0; k < 2; k++) { const bx = Math.round(w * (0.38 + k * 0.2)); R(x, bx, 27, 3, 8, 'rgba(60,130,60,.85)'); R(x, bx + 1, 35, 1, 3, 'rgba(60,130,60,.85)'); R(x, bx, 30, 3, 2, 'rgba(230,220,180,.8)'); }
    for (let k = 1; k < n; k += 2) stool(k % 4 === 1 ? -12 : w + 2, k);
  },
});

export const railingElement = piece({
  type: 'interior.railing', label: 'Gallery railing (kit)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 300, 10, 4000, 1, 'units'), height: num('Height', 32, 12, 80, 1, 'units'), style: select('Style', ['pipe', 'mesh', 'bars']),
    posts: num('Posts every', 40, 10, 400, 1, 'units'), kick: bool('Kick plate at the foot', true), colour: colourField('Paint', '#3f7a6c'),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.height), w: Number(p.width), tall: Number(p.height) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, end: { x: Number(p.width), h: 0, role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), h = Number(p.height), c = rgbField(p.colour, '63,122,108'), style = String(p.style);
    for (let k = 0; k <= w; k += Number(p.posts)) R(x, Math.min(k, w - 2), 0, 2, h, rgba(c, 1));
    R(x, 0, h - 2, w, 2, rgba(c, 1)); R(x, 0, h, w, 1, 'rgba(255,200,140,.3)');
    if (style === 'pipe') R(x, 0, Math.round(h / 2), w, 1, rgba(c, 0.95));
    else if (style === 'mesh') { R(x, 0, 4, w, h - 6, rgba(c, 0.12)); for (let k = 0; k < w; k += 3) R(x, k, 4, 1, h - 6, rgba(c, 0.4)); }
    else for (let k = 4; k < w; k += 5) R(x, k, 4, 1, h - 6, rgba(c, 0.85));
    if (p.kick !== false) { R(x, 0, 0, w, 4, rgba(c, 0.9)); R(x, 0, 3, w, 1, 'rgba(255,255,255,.15)'); }
    void o;
  },
});

export const officeWindowElement = piece({
  type: 'interior.office-window', label: 'Manager’s office window on stilts (kit)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 120, 50, 400, 1, 'units'), height: num('Height', 50, 30, 140, 1, 'units'), stilts: num('Stands this high on its stilts', 110, 0, 400, 1, 'units'),
    ladder: bool('Steel stair down', true), blinds: num('Blinds down', 0.45, 0, 1, 0.05), monitors: num('CCTV monitors', 3, 0, 8), clock: bool('Clock and calendar', true),
    sign: text('Sign (empty: none)', 'MANAGEMENT OFFICE'), lit: num('Lights on', 1, 0, 1, 0.05), panel: colourField('Panels', '#24302c'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width) + 20, tall: Number(p.stilts) + Number(p.height) + 16 }),
  bounds: p => ({ x: -20, h: Number(p.stilts) + Number(p.height) + 16, w: Number(p.width) + 24, tall: Number(p.stilts) + Number(p.height) + 16 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, sill: { x: Number(p.width) / 2, h: Number(p.stilts), role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), hh = Number(p.height), base = Number(p.stilts), seed = Number(p.seed), lit = Number(p.lit), t = o.t, panel = hexOr(p.panel, '#24302c');
    if (base > 0) {
      // steel legs braced to the floor, a stair down the side
      for (const lx of [4, w - 8]) R(x, lx, 0, 4, base, '#2f3a36');
      x.strokeStyle = 'rgba(70,90,84,.9)'; x.beginPath(); x.moveTo(6, y(0)); x.lineTo(w - 6, y(base - 4)); x.moveTo(w - 6, y(0)); x.lineTo(6, y(base - 4)); x.stroke();
      if (p.ladder !== false) { const st = Math.max(4, Math.round(base / 7)); x.strokeStyle = 'rgba(90,110,104,.95)'; x.beginPath(); x.moveTo(-18, y(0)); x.lineTo(0, y(base)); x.stroke(); for (let k = 0; k < st; k++) { const f = k / st; R(x, Math.round(-18 + 18 * f) - 2, Math.round(base * f), 6, 1, '#5a6a64'); } }
      R(x, -2, base, w + 4, 3, '#1c2220');
    }
    R(x, 0, base, w, hh, panel); R(x, 0, base + hh - 2, w, 2, 'rgba(255,255,255,.08)');
    const wl = 8, ww = w - 16, wb = base + 10, wh = hh - 18;
    R(x, wl, wb, ww, wh, lit > 0 ? rgba('225,240,235', 0.22 * lit) : '#090b0a');
    if (lit > 0) {
      // the desk, a manager on the phone, the CCTV wall in grey and green
      R(x, wl + 4, wb, ww - 8, 8, '#2a2620'); R(x, wl + 4, wb + 8, ww - 8, 1, 'rgba(255,255,255,.15)');
      for (let k = 0; k < Number(p.monitors); k++) { const mx = wl + ww - 14 - (k % 4) * 13, my = wb + 9 + Math.floor(k / 4) * 10; if (mx < wl + 30) break; R(x, mx, my, 11, 8, '#111'); R(x, mx + 1, my + 1, 9, 6, rgba(k % 3 ? '170,180,175' : '120,200,140', 0.4 + 0.2 * hash(Math.floor(t / 6) + k))); }
      const mx = wl + 18; R(x, mx - 4, wb + 8, 9, 10, '#1a1c1e'); R(x, mx - 2, wb + 18, 5, 5, '#1a1c1e'); R(x, mx + 3, wb + 17, 2, 4, '#0c0c0c');
      if (p.clock !== false) { x.fillStyle = 'rgba(235,230,215,.8)'; x.beginPath(); x.arc(wl + ww / 2, y(wb + wh - 6), 3, 0, Math.PI * 2); x.fill(); R(x, wl + ww / 2 + 8, wb + wh - 12, 7, 9, 'rgba(230,225,210,.7)'); R(x, wl + ww / 2 + 8, wb + wh - 7, 7, 4, 'rgba(200,30,30,.85)'); }
      o.light?.(wl + ww / 2, wb + wh / 2, ww, wh, '225,240,235', 'window');
    }
    // venetian blinds part way down, a slat or two bent
    const bd = Math.round(wh * Number(p.blinds));
    for (let k = 0; k < bd; k += 2) R(x, wl, wb + wh - 1 - k, ww - (hash(seed + k) < 0.1 ? 10 : 0), 1, 'rgba(210,205,190,.55)');
    R(x, wl - 1, wb + wh, ww + 2, 2, '#1a201e'); R(x, wl - 1, wb - 2, ww + 2, 2, '#1a201e');
    // an AC box on its side dripping into a bucket on the floor
    P.acUnit(x, y, w + 2, base + 8); if (base > 0) { R(x, w - 1, 0, 8, 7, 'rgba(60,90,200,.9)'); R(x, w + 2, ((t * 0.7) % Math.max(1, base)) + 7, 1, 2, 'rgba(180,220,230,.6)'); }
    const sign = String(p.sign ?? '');
    if (sign) neonPlate(x, t, w / 2, y(base + hh + 7), { text: sign, col: '30,30,30', size: 5, h: 9, printed: true, bolts: false, glow: 0, fill: 'rgba(232,225,205,.85)', ink: 'rgba(30,30,30,.85)' });
  },
});

// ---------------------------------------------------------------- the hall's basement and top floor

export const coldStoreElement = piece({
  type: 'interior.cold-store', label: 'Cold store doors (kit, market basement)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 240, 60, 1000, 1, 'units'), height: num('Height', 90, 50, 200, 1, 'units'), doors: num('Doors', 2, 1, 6), open: num('Door standing open (0: none)', 1, 0, 6),
    frost: num('Frost', 0.6, 0, 1, 0.05), hanging: bool('Carcasses hanging inside', true), reading: text('Temperature display', '-18'), sign: text('Sign (empty: none)', 'COLD STORE · KEEP SHUT'),
    panel: colourField('Insulated panels', '#2a3338'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.height), w: Number(p.width), tall: Number(p.height) }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), n = Number(p.doors), open = Number(p.open), seed = Number(p.seed), t = o.t, frost = Number(p.frost);
    R(x, 0, 0, w, H - 4, hexOr(p.panel, '#2a3338')); for (let k = 0; k < w; k += 24) R(x, k, 0, 1, H - 4, 'rgba(0,0,0,.35)'); R(x, 0, H - 6, w, 2, 'rgba(255,255,255,.08)');
    const dw = Math.min(46, Math.floor((w - 10) / n) - 10), gap = (w - n * dw) / (n + 1), dh = Math.min(64, H - 26);
    for (let i = 0; i < n; i++) {
      const l = Math.round(gap + i * (dw + gap)), isOpen = i + 1 === open;
      if (isOpen) {
        // a frosty blue room through the strip curtain, carcasses on the rail, a breath of cold air
        R(x, l, 0, dw, dh, 'rgba(150,200,225,.35)'); R(x, l, dh - 6, dw, 1, 'rgba(200,200,205,.8)');
        if (p.hanging !== false) for (let k = l + 4; k < l + dw - 6; k += 9) { R(x, k + 2, dh - 10, 1, 4, 'rgba(200,200,205,.8)'); R(x, k, dh - 34, 6, 24, 'rgba(210,140,140,.85)'); R(x, k + 1, dh - 34, 2, 24, 'rgba(245,230,225,.7)'); }
        for (let k = 0; k < dw; k += 3) R(x, l + k + Math.round(Math.sin(t / 60 + k) * 0.6), 2, 2, dh - 4, 'rgba(220,235,240,.22)');
        steam(x, l + dw / 2, 4, t, seed, 4, 0.2, 18); o.light?.(l + dw / 2, dh / 2, dw, dh, '170,215,235', 'window');
        R(x, l - 6, 0, 5, dh + 2, '#3e484e');
      } else {
        R(x, l, 0, dw, dh, '#3e484e'); R(x, l + 2, 2, dw - 4, dh - 4, '#4a555c'); R(x, l, dh, dw, 2, '#1e2428');
        R(x, l + dw - 9, Math.round(dh / 2) - 2, 7, 3, '#8a9096'); R(x, l + dw - 4, Math.round(dh / 2) - 8, 2, 14, '#8a9096');
        for (const hh of [10, dh - 14]) R(x, l - 2, hh, 4, 6, '#6a7076');
      }
      // frost creeping round the frames
      if (frost > 0) for (let k = 0; k < Math.round(frost * 12); k++) R(x, l - 1 + Math.round(hash(seed + i * 9 + k) * (dw + 2)), dh - 1 + Math.round(hash(seed * 3 + k) * 3), 2, 1, 'rgba(225,240,245,.6)');
      // the thermometer over each door, red digits
      R(x, l + dw / 2 - 8, dh + 4, 16, 8, '#0a0a0a'); paintText(x, String(p.reading ?? ''), l + dw / 2, y(dh + 8), 'rgba(255,60,50,.95)', 6, '700');
      o.light?.(l + dw / 2, dh + 8, 12, 6, '255,60,50', 'screen');
    }
    R(x, 0, 0, w, 2, 'rgba(200,230,240,' + (0.25 * frost).toFixed(3) + ')');
    const sign = String(p.sign ?? '');
    if (sign) neonPlate(x, t, Math.round(w / 2), y(H - 10), { text: sign, col: '30,30,30', size: 5, h: 9, printed: true, bolts: false, glow: 0, fill: 'rgba(232,225,205,.85)', ink: 'rgba(30,60,140,.9)' });
  },
});

export const loadingBayElement = piece({
  type: 'interior.loading-bay', label: 'Loading bay with its ramp (kit, market basement)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 300, 80, 1200, 1, 'units'), height: num('Height', 90, 50, 200, 1, 'units'), door: num('Roller door raised', 0.8, 0, 1, 0.05),
    outside: select('Light up the ramp', ['sodium', 'neon', 'none']), pallets: num('Pallets of boxes', 3, 0, 8), trolley: bool('Hand trolley', true),
    hazard: bool('Hazard stripes on the dock', true), sign: text('Sign (empty: none)', 'LOADING BAY · NO PARKING'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.height), w: Number(p.width), tall: Number(p.height) }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), seed = Number(p.seed), t = o.t, dl = Math.round(w * 0.45), dw = Math.round(w * 0.5), dh = Math.min(66, H - 22), up = Math.round(dh * Number(p.door));
    R(x, 0, 0, w, H - 4, '#1e1f1e'); for (let k = 0; k < 6; k++) R(x, Math.round(hash(seed + k) * w), H - 30, 3, 26, 'rgba(0,0,0,.25)');
    // the opening: the ramp going up and away to the street, lit from above, wet
    const out = String(p.outside), col = out === 'neon' ? '255,58,90' : '255,170,80';
    R(x, dl, 0, dw, dh, '#07080a');
    if (out !== 'none') { const g = x.createLinearGradient(0, y(dh), 0, 0); g.addColorStop(0, rgba(col, 0.32 * glowOf(o))); g.addColorStop(1, rgba(col, 0.04)); x.fillStyle = g; x.fillRect(dl, y(dh), dw, dh); o.light?.(dl + dw / 2, dh / 2, dw, dh, col, 'window'); }
    x.fillStyle = '#141516'; x.beginPath(); x.moveTo(dl, y(0)); x.lineTo(dl + dw, y(0)); x.lineTo(dl + dw, y(dh * 0.55)); x.closePath(); x.fill();
    for (let k = 0; k < dw; k += 8) R(x, dl + k, Math.round((k / dw) * dh * 0.55), 6, 1, rgba(col, 0.25));
    // the roller door, part way up, its drum and guides
    R(x, dl, dh - up, dw, up, '#2c2e30'); for (let k = dh - up + 3; k < dh; k += 3) R(x, dl, k, dw, 1, 'rgba(0,0,0,.35)'); R(x, dl, dh - up, dw, 2, '#4a4d50');
    R(x, dl - 3, 0, 3, dh + 6, '#3a3c3e'); R(x, dl + dw, 0, 3, dh + 6, '#3a3c3e'); R(x, dl - 3, dh, dw + 6, 8, '#2a2b2c');
    if (p.hazard !== false) for (let k = 0; k < dw; k += 8) R(x, dl + k, 0, 4, 3, 'rgba(255,200,40,.85)');
    // pallets stacked with foam fish boxes and cartons, the trolley leaning
    for (let i = 0; i < Number(p.pallets); i++) {
      const px = 6 + i * 34; if (px + 30 > dl - 4) break;
      R(x, px, 0, 30, 4, '#5a4020'); for (let k = 2; k < 30; k += 7) R(x, px + k, 0, 3, 3, '#2a1c0e');
      const rows = 1 + (i + seed) % 3;
      for (let rI = 0; rI < rows; rI++) for (let c = 0; c < 2; c++) { const box = (i + rI + c) % 2 === 0; R(x, px + 1 + c * 14, 4 + rI * 10, 13, 9, box ? 'rgba(235,235,240,.85)' : '#6a5232'); R(x, px + 2 + c * 14, 12 + rI * 10, 11, 1, box ? 'rgba(160,200,230,.7)' : 'rgba(230,210,170,.35)'); }
    }
    if (p.trolley !== false) { const tx = Math.min(w - 16, dl + dw + 8); R(x, tx, 0, 2, 30, '#5a6066'); R(x, tx, 0, 10, 2, '#5a6066'); R(x, tx - 1, 0, 4, 3, '#111'); R(x, tx + 1, 30, 5, 2, '#5a6066'); }
    const sign = String(p.sign ?? '');
    if (sign) neonPlate(x, t, Math.round(dl + dw / 2), y(dh + 13), { text: sign, col: '30,30,30', size: 5, h: 9, printed: true, bolts: false, glow: 0, fill: 'rgba(255,200,40,.9)', ink: 'rgba(20,20,20,.9)' });
    ceilingLamp(x, o, 'tube', Math.round(w * 0.2), H, 0, seed);
  },
});

export const pumpRoomElement = piece({
  type: 'interior.pump-room', label: 'Fish-tank pump room (kit, market basement)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 200, 60, 800, 1, 'units'), height: num('Height', 90, 50, 200, 1, 'units'), tanks: num('Header tanks', 2, 0, 6), pumps: num('Pumps', 3, 0, 8),
    pipes: num('Pipe runs', 4, 0, 10), gauges: bool('Gauges', true), leak: bool('A leak', true), light: select('Light', LIGHT_KINDS, 'flicker'),
    sign: text('Sign (empty: none)', 'SEAWATER PUMPS · STAFF ONLY'), pipe: colourField('Pipe paint', '#2f6a74'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.height), w: Number(p.width), tall: Number(p.height) }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), seed = Number(p.seed), t = o.t, pc = rgbField(p.pipe, '47,106,116');
    R(x, 0, 0, w, H - 4, '#1a1d1d');
    // header tanks of seawater on the back wall, lit blue, bubbling
    const nt = Number(p.tanks), slot = Math.round((w - 16) / Math.max(1, nt));
    for (let i = 0; i < nt; i++) {
      const tl = 8 + i * slot, tw = Math.min(40, slot - 8);
      R(x, tl, 34, tw, 30, '#2a3034'); R(x, tl + 2, 36, tw - 4, 22, 'rgba(40,140,170,.4)'); R(x, tl + 2, 56, tw - 4, 1, 'rgba(150,220,235,.7)');
      for (let k = 0; k < 4; k++) R(x, tl + 4 + ((k * 7 + seed) % Math.max(1, tw - 8)), 36 + ((t * 0.3 + k * 5) % 20), 1, 1, 'rgba(220,250,255,.8)');
      for (const lx of [tl + 2, tl + tw - 4]) R(x, lx, 0, 2, 34, '#3a3e40');
      o.light?.(tl + tw / 2, 46, tw - 4, 20, '120,200,220', 'screen');
    }
    // pipe runs along the wall and down to the pumps, flanges every so often
    for (let i = 0; i < Number(p.pipes); i++) { const ph = H - 12 - i * 6; R(x, 0, ph, w, 4, rgba(pc, 0.95)); R(x, 0, ph + 3, w, 1, 'rgba(255,255,255,.18)'); for (let k = 20 + i * 7; k < w; k += 46) R(x, k, ph - 1, 3, 6, rgba(pc, 1)); }
    // pumps on plinths: a motor with its fan cover turning, a pipe up to the runs
    for (let i = 0; i < Number(p.pumps); i++) {
      const px = 10 + i * 30; if (px + 24 > w) break;
      R(x, px - 2, 0, 26, 4, '#2c2e2e'); R(x, px, 4, 14, 12, '#3a5a4a'); R(x, px + 14, 6, 8, 8, '#4a4e50'); R(x, px + 2, 15, 10, 1, 'rgba(255,255,255,.15)');
      fan(x, px + 18, 10, 3, t * 2, seed + i, true);
      R(x, px + 5, 16, 3, Math.max(2, H - 12 - Number(p.pipes) * 6 - 10), rgba(pc, 0.95)); R(x, px + 4, 22, 5, 2, rgba(pc, 1));
      if (p.gauges !== false) { x.fillStyle = 'rgba(230,230,220,.85)'; x.beginPath(); x.arc(px + 10, y(28), 3, 0, Math.PI * 2); x.fill(); const a = -Math.PI / 2 + Math.sin(t / 40 + i) * 0.6; x.strokeStyle = 'rgba(200,30,30,.95)'; x.beginPath(); x.moveTo(px + 10, y(28)); x.lineTo(px + 10 + Math.cos(a) * 2.5, y(28) + Math.sin(a) * 2.5); x.stroke(); }
    }
    if (p.leak !== false) { const lx = Math.round(w * 0.7); R(x, lx, H - 14 - ((t * 0.8) % (H - 16)), 1, 2, 'rgba(180,220,230,.8)'); x.fillStyle = 'rgba(150,200,215,.2)'; x.beginPath(); x.ellipse(lx, y(0), 10, 1.5, 0, 0, Math.PI * 2); x.fill(); R(x, lx - 5, 0, 10, 8, 'rgba(60,90,200,.9)'); }
    const sign = String(p.sign ?? '');
    if (sign) neonPlate(x, t, Math.round(w / 2), y(H - 40), { text: sign, col: '30,30,30', size: 5, h: 9, printed: true, bolts: false, glow: 0, fill: 'rgba(232,225,205,.85)', ink: 'rgba(170,25,25,.9)' });
    ceilingLamp(x, o, String(p.light), Math.round(w * 0.6), H - 4, 0, seed);
  },
});

export const tunnelDoorElement = piece({
  type: 'interior.tunnel-door', label: 'Way into the tunnels: an arch with a gate (kit)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 110, 40, 400, 1, 'units'), height: num('Height', 90, 40, 200, 1, 'units'), gate: select('Gate', ['shut', 'ajar', 'open'], 'ajar'),
    glow: colourField('Light deep inside', '#5a8a6a'), graffiti: bool('Tags on the wall', true), drip: bool('Water dripping', true),
    sign: text('Sign (empty: none)', 'FLOOD CHANNEL · NO ENTRY'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.height), w: Number(p.width), tall: Number(p.height) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, door: { x: Number(p.width) / 2, h: 0, role: 'entrance' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), seed = Number(p.seed), t = o.t, glow = rgbField(p.glow, '90,138,106');
    // old brick, damp, an arch cut through it
    R(x, 0, 0, w, H - 4, '#231a16'); for (let h = 4; h < H - 4; h += 5) { R(x, 0, h, w, 1, 'rgba(0,0,0,.3)'); for (let k = ((h / 5) % 2) * 6; k < w; k += 12) R(x, k, h, 1, 5, 'rgba(0,0,0,.25)'); }
    const aw = Math.round(w * 0.6), al = Math.round((w - aw) / 2), ah = Math.min(H - 20, Math.round(aw * 0.9)), cx = al + aw / 2, spring = Math.max(4, ah - aw / 2);
    const arch = (inset: number, fill: string) => { const r = Math.max(1, aw / 2 - inset); x.fillStyle = fill; x.beginPath(); x.moveTo(cx - r, y(0)); x.lineTo(cx - r, y(spring)); x.arc(cx, y(spring), r, Math.PI, 0); x.lineTo(cx + r, y(0)); x.closePath(); x.fill(); };
    arch(-3, '#3a2c24'); arch(0, '#050605');
    // the tunnel going away: rings getting darker, one light far in
    for (let k = 1; k < 5; k++) arch(k * Math.round(aw / 11), rgba(glow, 0.03 + k * 0.025));
    R(x, cx - 1, Math.round(spring * 0.6), 3, 2, rgba(glow, 0.8 + 0.2 * Math.sin(t / 40))); o.light?.(cx, spring * 0.6, 6, 4, glow, 'screen');
    R(x, al, 0, aw, 2, rgba(glow, 0.15));
    // the gate: steel bars, padlocked, or pushed open
    const g = String(p.gate), gw = g === 'shut' ? aw : g === 'ajar' ? Math.round(aw * 0.7) : 6;
    for (let k = 2; k < gw; k += 4) R(x, al + k, 0, 1, spring + 4, '#5a5e60');
    R(x, al, spring + 2, gw, 2, '#5a5e60'); R(x, al, Math.round(spring * 0.5), gw, 2, '#5a5e60');
    if (g === 'shut') { R(x, cx - 2, Math.round(spring * 0.5) - 4, 5, 5, 'rgba(210,180,90,.9)'); R(x, cx - 1, Math.round(spring * 0.5) + 1, 3, 2, 'rgba(210,180,90,.9)'); }
    if (p.graffiti !== false) for (let k = 0; k < 3; k++) { const gx = Math.round(hash(seed + k) * (w - 20)), gh = 10 + Math.round(hash(seed * 3 + k) * 30), c = ['255,61,242', '255,200,60', '120,230,140'][k]; if (gx + 18 > al - 3 && gx < al + aw + 3) continue; R(x, gx, gh, 14, 2, rgba(c, 0.55)); R(x, gx + 3, gh + 2, 2, 5, rgba(c, 0.55)); R(x, gx + 9, gh - 3, 6, 2, rgba(c, 0.55)); }
    if (p.drip !== false) for (let k = 0; k < 2; k++) R(x, al + 6 + k * (aw - 12), ah - ((t * 0.7 + k * 30) % ah), 1, 2, 'rgba(180,220,230,.7)');
    const sign = String(p.sign ?? '');
    if (sign) neonPlate(x, t, Math.round(cx), y(Math.min(H - 10, ah + 8)), { text: sign, col: '30,30,30', size: 5, h: 9, printed: true, bolts: false, glow: 0, fill: 'rgba(232,225,205,.85)', ink: 'rgba(170,25,25,.9)' });
  },
});

export const marketOfficesElement = piece({
  type: 'interior.market-offices', label: 'Market management floor: counters, files, storage (kit)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 500, 80, 3000, 1, 'units'), height: num('Wall height', 88, 50, 300, 1, 'units'), counters: num('Service windows', 2, 0, 6),
    label: text('Over the windows', 'LICENSING · STALL FEES'), ticket: bool('Queue number display', true), filing: num('Filing cabinets', 4, 0, 12),
    storage: bool('Storage cage of crates and baskets', true), board: bool('Notice board', true), light: select('Light', LIGHT_KINDS, 'tube'),
    wall: colourField('Wall', '#2a2f2e'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.height), w: Number(p.width), tall: Number(p.height) }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), seed = Number(p.seed), t = o.t;
    R(x, 0, 0, w, H, hexOr(p.wall, '#2a2f2e')); R(x, 0, 0, w, 24, '#232827'); R(x, 0, 24, w, 1, 'rgba(230,220,190,.15)');
    let at = 10;
    // service windows behind glass: papers, a monitor, the slot, a bell
    for (let i = 0; i < Number(p.counters); i++, at += 64) {
      if (at + 56 > w) break;
      R(x, at, 0, 56, 28, '#3a3f3e'); R(x, at, 27, 56, 2, '#5a605e'); R(x, at, 29, 56, 34, 'rgba(210,230,225,.18)'); R(x, at, 63, 56, 2, '#1a1e1d');
      R(x, at + 6, 29, 20, 6, 'rgba(235,230,215,.6)'); R(x, at + 34, 29, 10, 8, '#141618'); R(x, at + 35, 30, 8, 6, 'rgba(120,200,140,.4)');
      R(x, at + 20, 27, 16, 2, '#0a0a0a'); R(x, at + 48, 29, 4, 2, 'rgba(210,180,90,.9)');
      paintText(x, String(i + 1), at + 50, y(56), 'rgba(240,235,220,.7)', 6, '700');
      o.light?.(at + 28, 46, 52, 30, '210,230,225', 'window');
    }
    const label = String(p.label ?? ''), span = at - 10;
    if (label && span > 0) neonPlate(x, t, Math.round(10 + span / 2 - 4), y(Math.min(H - 8, 72)), { text: label, col: '30,30,30', size: 6, h: 10, printed: true, bolts: false, glow: 0, fill: 'rgba(232,225,205,.88)', ink: 'rgba(30,60,140,.9)' });
    if (p.ticket !== false && span > 0) { R(x, at, 44, 24, 12, '#0a0a0a'); paintText(x, String(100 + (Math.floor(t / 400) + seed) % 900), at + 12, y(50), 'rgba(255,60,50,.95)', 6, '700'); o.light?.(at + 12, 50, 20, 8, '255,60,50', 'screen'); at += 32; }
    if (p.board !== false && at + 44 < w) { R(x, at, 34, 40, 26, '#4a3020'); handbills(x, at + 2, 36, 36, 52, 7, seed); at += 50; }
    for (let i = 0; i < Number(p.filing) && at + 16 < w; i++, at += 16) { R(x, at, 0, 14, 40, '#4a5054'); for (let k = 0; k < 4; k++) { R(x, at + 1, 2 + k * 10, 12, 8, '#5a6064'); R(x, at + 5, 6 + k * 10, 4, 1, '#2a2c2e'); } }
    if (p.storage !== false && at + 60 < w) {
      // a wire cage of plastic baskets and spare crates
      const cw = Math.min(w - at - 6, 160); R(x, at + 4, 0, cw, H - 12, '#151817');
      for (let rI = 0; rI < 4; rI++) for (let k = at + 8; k < at + cw - 14; k += 14) { const c = ['210,40,40', '40,90,200', '230,180,40', '40,150,90'][(k + rI + seed) % 4]; R(x, k, rI * 13, 12, 11, rgba(c, 0.75)); R(x, k + 1, rI * 13 + 9, 10, 1, 'rgba(0,0,0,.4)'); }
      mesh(x, at + 4, 0, cw, H - 12, '160,160,150', 4);
    }
    for (let k = 50; k < w - 20; k += 100) ceilingLamp(x, o, String(p.light), k, H, 0, seed + k);
  },
});

export const marketInteriors: AssetDefinition[] = [
  stallRoomElement, stairCoreElement, cageFlatsElement, landingElement, rooftopElement,
  hallShellElement, marketStallElement, wetFloorElement, cookedFoodElement, roundTableElement, railingElement, officeWindowElement,
  coldStoreElement, loadingBayElement, pumpRoomElement, tunnelDoorElement, marketOfficesElement,
];
