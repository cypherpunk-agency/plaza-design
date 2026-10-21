/**
 * BUILDING KIT, Skyport and the Exclusion Zone ("Fenced launches."). The port's own shapes, not a
 * skin on the city's fronts (Tommi, 2026-10-21: every district looked like New York with cyberpunk
 * on top):
 * - `building.hangar`: huge low hangars (arched, gabled or flat) with wide sliding doors open a crack,
 *   light spilling out and a craft's nose or freight inside, a painted apron number, floodlight masts,
 *   an ops cabin on a stem like a small control tower; or (`kind: terminal`) the low glazed terminal.
 * - `street.fence`: the perimeter the street runs along: chain link on a concrete footing, razor
 *   wire on top, restricted-zone notices on the mesh, post floodlights, a sliding gate.
 * Special building: `landmark.launch-pad`, the launch tower with a vehicle on it seen over the fence:
 * umbilical arms, steam, floodlights, an assembly hall it rolls out of, and on a long cycle a launch
 * (the pad lit orange, the plume's glow on the clouds, the vehicle rising out of frame).
 *
 * Palette (the Skyport style card): structure #aabed2, wall #12161c, windows #e8f0ff, neon #ffd23a
 * (hazard), #ff2a44 (warning), #aabed2. Notices are matter-of-fact. Drawn in the piece's own frame:
 * origin at its foot on the left, heights up (`y = -h`). `size` scales a piece inside its own frame
 * (use it, not the placement's scale, for a far copy).
 */
import type { Element, Field } from '../core/composition';
import { windowLit } from '../../world/light';
import { mono, paperSign } from '../core/primitives';
import { neonPlate } from '../signage/kit';
import { piece, num, select, bool, text, colour, isHex, rgbOf, hash, rgba, y, type Paint } from './types';

const STRUCT = '170,190,210', WIN = '232,240,255', HAZARD = '255,210,58', WARN = '255,42,68';
const colourField = (label: string, value: string): Field => ({ kind: 'color', label, default: value });
const ease = (k: number) => { const c = Math.max(0, Math.min(1, k)); return c * c * (3 - 2 * c); };
const clamp01 = (k: number) => Math.max(0, Math.min(1, k));
/** #rrggbb mixed toward #rrggbb by k. */
const mixHex = (a: string, b: string, k: number) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - k) + parseInt(b.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');
/** "r,g,b" mixed toward "r,g,b" by k. */
const mixRgb = (a: string, b: string, k: number) => { const p = a.split(',').map(Number), q = b.split(',').map(Number); return p.map((v, i) => Math.round(v + (q[i] - v) * k)).join(','); };
const lampsOf = (o: Paint) => o.lighting.outdoor ? o.lighting.lamps : 1;
/** A light hook that follows the piece's own `size`. */
const sized = (o: Paint, s: number) => (lx: number, lh: number, lw: number, hh: number, col: string, kind: 'window' | 'screen') => o.light?.(lx * s, lh * s, lw * s, hh * s, col, kind);

/** Yellow and black hazard blocks along a band from `l` to `r`, `h0` to `h1` high. */
function hazard(x: CanvasRenderingContext2D, l: number, r: number, h0: number, h1: number, a = 0.75) {
  x.fillStyle = '#0c0d0f'; x.fillRect(Math.round(l), y(h1), Math.round(r - l), h1 - h0);
  x.fillStyle = rgba(HAZARD, a);
  for (let k = Math.round(l); k < r; k += 8) for (let row = 0; row < h1 - h0; row++) { const sx = k + row; if (sx + 4 <= r) x.fillRect(sx, y(h0 + row + 1), 4, 1); }
}
/** A blinking red obstruction light. */
function beacon(x: CanvasRenderingContext2D, bx: number, bh: number, t: number, phase: number) {
  const on = Math.floor((t + phase) / 50) % 2 === 0;
  x.fillStyle = on ? rgba(WARN, 0.95) : rgba(WARN, 0.3); x.fillRect(Math.round(bx) - 1, y(bh + 2), 3, 2);
  if (on) { x.fillStyle = rgba(WARN, 0.18); x.fillRect(Math.round(bx) - 3, y(bh + 4), 7, 6); }
}
/** A lattice floodlight mast standing on the ground at `mx`, its lamp head at `mh` facing `face`; a faint cone at night. */
function floodMast(x: CanvasRenderingContext2D, mx: number, mh: number, face: 1 | -1, on: number, t: number, phase: number, light?: (lx: number, lh: number, lw: number, hh: number, col: string, kind: 'window' | 'screen') => void, col = WIN) {
  x.fillStyle = '#1b2028'; x.fillRect(mx - 4, y(4), 9, 4);
  x.fillStyle = '#20262e'; x.fillRect(mx - 2, y(mh), 1, mh); x.fillRect(mx + 2, y(mh), 1, mh);
  x.fillStyle = rgba(STRUCT, 0.22); for (let h = 8; h < mh - 4; h += 8) { x.fillRect(mx - 1, y(h + 4), 1, 1); x.fillRect(mx, y(h + 2), 1, 1); x.fillRect(mx + 1, y(h), 1, 1); x.fillRect(mx - 2, y(h), 5, 1); }
  // the head: a frame of six lamps, tilted down toward what it lights
  const hx = mx - 7, hh = mh + 2;
  x.fillStyle = '#14181e'; x.fillRect(hx, y(hh + 10), 15, 11);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) { x.fillStyle = rgba(col, 0.35 + 0.6 * on); x.fillRect(hx + 2 + c * 4, y(hh + 8 - r * 5), 3, 3); }
  if (on > 0.15) {
    const g = x.createLinearGradient(0, y(hh), 0, 0); g.addColorStop(0, rgba(col, 0.1 * on)); g.addColorStop(1, rgba(col, 0));
    x.fillStyle = g; x.beginPath(); x.moveTo(mx, y(hh)); x.lineTo(mx + face * 120, 0); x.lineTo(mx + face * 20, 0); x.closePath(); x.fill();
  }
  light?.(mx, hh + 4, 14, 10, col, 'screen');
  beacon(x, mx, mh + 13, t, phase);
}

// ---------------------------------------------------------------- hangar / terminal

const INSIDE = ['craft', 'crates', 'empty'] as const;

export const hangarElement = piece({
  type: 'building.hangar', label: 'Hangar or terminal (kit, Skyport)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    kind: select('Kind', ['hangar', 'terminal']),
    width: num('Width', 420, 120, 1600, 1, 'units'), height: num('Wall height', 150, 60, 360, 1, 'units'),
    roof: select('Roof', ['arched', 'gabled', 'flat']), wall: colour('Wall colour', 'Skyport grey'),
    door: num('Door width (share of the front)', 0.7, 0.3, 0.95, 0.01), doorHeight: num('Door height (share of the wall)', 0.78, 0.4, 0.95, 0.01),
    open: num('Doors opened (0 shut)', 0.12, 0, 1, 0.01), inside: select('Inside the crack', INSIDE),
    craft: colourField('Craft rim colour', '#aabed2'), glow: colourField('Light inside', '#e8f0ff'),
    number: text('Apron number on the doors (empty: none)', '07'), letters: text('Letters on the fascia (empty: none)', 'HANGAR 07'),
    stripes: bool('Hazard stripes along the door foot', true), beacons: bool('Red lights on the roof', true),
    cabin: select('Ops cabin', ['none', 'left', 'right']), cabinHeight: num('Ops cabin height', 230, 60, 600, 1, 'units'),
    masts: num('Floodlight masts', 2, 0, 4), mastHeight: num('Mast height', 210, 60, 600, 1, 'units'),
    lit: num('Terminal windows lit', 0.7, 0, 1, 0.05),
    size: num('Size (far copies smaller)', 1, 0.2, 2, 0.05), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => { const s = Number(p.size); return { w: Number(p.width) * s, tall: (Math.max(Number(p.height) * 1.3, p.cabin === 'none' ? 0 : Number(p.cabinHeight) + 30, Number(p.masts) > 0 ? Number(p.mastHeight) + 16 : 0)) * s }; },
  bounds: p => { const s = Number(p.size), tall = Math.max(Number(p.height) * 1.3, p.cabin === 'none' ? 0 : Number(p.cabinHeight) + 30, Number(p.masts) > 0 ? Number(p.mastHeight) + 16 : 0) * s; return { x: -10 * s, h: tall, w: (Number(p.width) + 20) * s, tall }; },
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, door: { x: Number(p.width) * Number(p.size) / 2, h: 0, role: 'entrance' }, roof: { x: Number(p.width) * Number(p.size) / 2, h: Number(p.height) * Number(p.size), role: 'surface' } }),
  paint(x, p, o) {
    const s = Number(p.size); x.scale(s, s);
    const light = sized(o, s), w = Number(p.width), H = Number(p.height), seed = Number(p.seed), on = lampsOf(o), t = o.t;
    const wall = isHex(p.wall) ? String(p.wall) : '#12161c', glow = isHex(p.glow) ? rgbOf(String(p.glow)) : WIN, rim = isHex(p.craft) ? rgbOf(String(p.craft)) : STRUCT;
    const terminal = p.kind === 'terminal';
    // the ops cabin stands behind the building: a concrete stem, a cab of slanted glass, an antenna
    if (p.cabin !== 'none') {
      const ch = Number(p.cabinHeight), cx = p.cabin === 'left' ? 34 : w - 34;
      x.fillStyle = '#171b21'; x.fillRect(cx - 6, y(ch), 12, ch); x.fillStyle = rgba(STRUCT, 0.12); x.fillRect(cx - 6, y(ch), 1, ch);
      for (let h = 30; h < ch - 10; h += 34) if (windowLit(seed * 17 + h, o.lighting)) { x.fillStyle = rgba(WIN, 0.5); x.fillRect(cx - 1, y(h + 4), 2, 4); }
      x.fillStyle = '#0e1116'; x.fillRect(cx - 18, y(ch + 4), 36, 4);
      x.fillStyle = rgba(glow, 0.3 + 0.45 * on); x.beginPath(); x.moveTo(cx - 18, y(ch + 4)); x.lineTo(cx - 23, y(ch + 20)); x.lineTo(cx + 23, y(ch + 20)); x.lineTo(cx + 18, y(ch + 4)); x.closePath(); x.fill();
      x.fillStyle = 'rgba(0,0,0,.45)'; for (let k = -15; k <= 15; k += 6) x.fillRect(cx + k, y(ch + 19), 1, 15);
      const who = Math.round(Math.sin(t / 140 + seed) * 10); x.fillStyle = '#0a0c10'; x.fillRect(cx + who - 2, y(ch + 13), 4, 9);
      x.fillStyle = '#0e1116'; x.fillRect(cx - 25, y(ch + 23), 50, 3); x.fillStyle = rgba(STRUCT, 0.4); x.fillRect(cx - 25, y(ch + 23), 50, 1);
      x.fillStyle = '#20262e'; x.fillRect(cx + 10, y(ch + 40), 1, 17); x.fillRect(cx - 12, y(ch + 31), 1, 8); x.fillRect(cx - 15, y(ch + 31), 7, 1);
      beacon(x, cx + 10, ch + 40, t, seed * 7);
      light(cx, ch + 12, 44, 16, glow, 'window');
    }
    // the shed: dark ribbed sheet on a concrete plinth
    x.fillStyle = wall; x.fillRect(0, y(H), w, H);
    x.fillStyle = rgba(STRUCT, 0.045); for (let k = 2; k < w; k += 4) x.fillRect(k, y(H), 1, H - 8);
    x.fillStyle = '#1b2027'; x.fillRect(0, y(8), w, 8); x.fillStyle = rgba(STRUCT, 0.18); x.fillRect(0, y(8), w, 1);
    // streaks from the roof
    for (let i = 0; i < Math.round(w / 30); i++) { const k = hash(seed * 31 + i); x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(Math.round(k * w), y(H), 2, Math.round(10 + hash(seed + i * 3) * 40)); }
    // the roof
    const roof = String(p.roof), rise = roof === 'flat' ? 0 : Math.round(Math.min(H * 0.32, w * (roof === 'arched' ? 0.11 : 0.08)));
    x.fillStyle = mixHex(wall, '#000000', 0.25);
    if (roof === 'arched') { x.beginPath(); x.moveTo(-4, y(H)); x.quadraticCurveTo(w / 2, y(H + rise * 2), w + 4, y(H)); x.closePath(); x.fill(); x.strokeStyle = rgba(STRUCT, 0.4); x.lineWidth = 1; x.beginPath(); x.moveTo(-4, y(H) + 0.5); x.quadraticCurveTo(w / 2, y(H + rise * 2) + 0.5, w + 4, y(H) + 0.5); x.stroke(); }
    else if (roof === 'gabled') { x.beginPath(); x.moveTo(-4, y(H)); x.lineTo(w / 2, y(H + rise)); x.lineTo(w + 4, y(H)); x.closePath(); x.fill(); x.strokeStyle = rgba(STRUCT, 0.4); x.beginPath(); x.moveTo(-4, y(H) + 0.5); x.lineTo(w / 2, y(H + rise) + 0.5); x.lineTo(w + 4, y(H) + 0.5); x.stroke(); }
    x.fillStyle = '#0c0f13'; x.fillRect(-4, y(H + 3), w + 8, 4); x.fillStyle = rgba(STRUCT, 0.3); x.fillRect(-4, y(H + 3), w + 8, 1);
    if (p.beacons !== false) { beacon(x, 2, H + 3, t, seed); beacon(x, w - 2, H + 3, t, seed + 25); if (rise) beacon(x, w / 2, H + (roof === 'arched' ? rise * 1.5 : rise), t, seed + 12); }
    if (terminal) {
      // the terminal: a long ribbon of glazing, a canopy over the doors, letters on the parapet
      const g0 = Math.round(H * 0.3), g1 = Math.round(H * 0.82);
      for (let k = 6, i = 0; k < w - 10; k += 14, i++) {
        const lit = hash(seed * 13 + i) < Number(p.lit) && windowLit(seed * 101 + i, o.lighting);
        x.fillStyle = lit ? rgba(glow, 0.42 + 0.2 * hash(i + seed)) : '#090b0e'; x.fillRect(k, y(g1), 12, g1 - g0);
        if (lit) { x.fillStyle = 'rgba(0,0,0,.4)'; if (hash(i * 7 + seed) < 0.4) x.fillRect(k + 3 + Math.round(hash(i) * 6), y(g0 + 14), 3, 14); light(k + 6, (g0 + g1) / 2, 12, g1 - g0, glow, 'window'); }
      }
      x.fillStyle = rgba(STRUCT, 0.35); x.fillRect(4, y(g1 + 1), w - 8, 1); x.fillRect(4, y(g0), w - 8, 1);
      const dw = Math.min(120, w * 0.3), dx = Math.round((w - dw) / 2);
      x.fillStyle = rgba(glow, 0.3 + 0.3 * on); x.fillRect(dx, y(g0 - 10), dw, g0 - 18);
      x.fillStyle = 'rgba(0,0,0,.4)'; for (let k = dx + 12; k < dx + dw; k += 24) x.fillRect(k, y(g0 - 10), 1, g0 - 18);
      x.fillStyle = '#0d1014'; x.fillRect(dx - 16, y(g0 - 6), dw + 32, 5); x.fillStyle = rgba(STRUCT, 0.5); x.fillRect(dx - 16, y(g0 - 6), dw + 32, 1);
      x.fillStyle = rgba(WIN, 0.4 + 0.5 * on); x.fillRect(dx - 12, y(g0 - 11), dw + 24, 1);
      x.fillStyle = '#1b2027'; x.fillRect(dx - 14, y(g0 - 6), 2, g0 - 14); x.fillRect(dx + dw + 12, y(g0 - 6), 2, g0 - 14);
      light(dx + dw / 2, g0 / 2, dw, g0 - 18, glow, 'window');
      const letters = String(p.letters ?? '');
      if (letters) { x.fillStyle = '#20262e'; x.fillRect(w / 2 - 30, y(H + 12), 1, 9); x.fillRect(w / 2 + 30, y(H + 12), 1, 9); neonPlate(x, t, w / 2, y(H + 16), { text: letters, col: WIN, size: 9, h: 13, street: true, bolts: false, phase: seed }); light(w / 2, H + 16, 80, 12, WIN, 'screen'); }
    } else {
      // the doors: a bank of tall sliding leaves, parted a crack in the middle
      const dw = Math.round(w * Number(p.door)), dh = Math.round(H * Number(p.doorHeight)), dx = Math.round((w - dw) / 2), cx = dx + dw / 2;
      const crack = Math.round(dw * Number(p.open)), cl = Math.round(cx - crack / 2);
      x.fillStyle = '#07090c'; x.fillRect(dx - 3, y(dh + 3), dw + 6, dh + 3);
      if (crack > 0) {
        // inside: hard light from the roof, a bright floor, whatever is parked there backlit
        const g = x.createLinearGradient(0, y(dh), 0, 0); g.addColorStop(0, rgba(glow, 0.35)); g.addColorStop(1, rgba(glow, 0.75));
        x.fillStyle = g; x.fillRect(cl, y(dh), crack, dh);
        x.save(); x.beginPath(); x.rect(cl, y(dh), crack, dh); x.clip();
        const inside = String(p.inside);
        if (inside === 'craft') {
          // a craft's nose, seen head on: a broad hull, its windscreen, the nose gear on the floor
          const nw = Math.min(dw * 0.5, 120), nh = Math.min(dh * 0.36, 44), nb = Math.round(dh * 0.18);
          x.fillStyle = '#1a1f26'; x.beginPath(); x.ellipse(cx, y(nb + nh / 2), nw / 2, nh / 2, 0, 0, Math.PI * 2); x.fill();
          x.strokeStyle = rgba(rim, 0.75); x.beginPath(); x.ellipse(cx, y(nb + nh / 2), nw / 2 - 0.5, nh / 2 - 0.5, 0, Math.PI, 0); x.stroke();
          x.fillStyle = '#05070a'; x.fillRect(Math.round(cx - nw * 0.28), y(nb + nh * 0.72), Math.round(nw * 0.56), Math.max(3, Math.round(nh * 0.18)));
          x.fillStyle = rgba(glow, 0.35); x.fillRect(Math.round(cx - nw * 0.24), y(nb + nh * 0.7), Math.round(nw * 0.12), 1);
          x.fillStyle = '#12161b'; x.fillRect(Math.round(cx) - 1, y(nb), 3, nb); x.fillRect(Math.round(cx) - 4, y(5), 9, 5);
          x.fillStyle = rgba(WARN, 0.9); x.fillRect(Math.round(cx - nw / 2) + 2, y(nb + nh / 2), 2, 2);
          // a technician's silhouette at the gear
          x.fillStyle = '#0a0c10'; x.fillRect(Math.round(cx) + 10, y(30), 6, 22); x.fillRect(Math.round(cx) + 11, y(36), 4, 5); x.fillRect(Math.round(cx) + 10, y(8), 2, 8); x.fillRect(Math.round(cx) + 14, y(8), 2, 8);
        } else if (inside === 'crates') {
          for (let k = 0; k < 6; k++) { const bx = Math.round(cx - 50 + k * 18 + hash(seed + k) * 6), bh = 14 + Math.round(hash(seed * 3 + k) * 16); x.fillStyle = '#161b21'; x.fillRect(bx, y(bh), 16, bh); x.fillStyle = rgba(rim, 0.4); x.fillRect(bx, y(bh), 16, 1); x.fillRect(bx, y(bh), 1, bh); }
          x.fillStyle = '#12161b'; x.fillRect(Math.round(cx) - 30, y(dh - 6), 60, 3);
        }
        x.restore();
        // the spill: a bright sill and light thrown on the leaves either side
        x.fillStyle = rgba(glow, 0.8); x.fillRect(cl - 2, y(1), crack + 4, 1);
        light(cx, dh / 2, crack + 10, dh, glow, 'window');
      }
      const leafW = Math.max(18, Math.round(dw / 8)), leaf = (l: number, r: number) => {
        x.fillStyle = '#1a2028'; x.fillRect(l, y(dh), r - l, dh);
        x.fillStyle = 'rgba(0,0,0,.35)'; for (let k = l + leafW; k < r - 2; k += leafW) x.fillRect(k, y(dh), 1, dh);
        x.fillStyle = rgba(STRUCT, 0.06); for (let h = 10; h < dh; h += 10) x.fillRect(l, y(h), r - l, 1);
      };
      leaf(dx, cl); leaf(cl + crack, dx + dw);
      if (crack > 0) { x.fillStyle = rgba(glow, 0.22); x.fillRect(cl - 2, y(dh), 2, dh); x.fillRect(cl + crack, y(dh), 2, dh); }
      if (p.stripes !== false) { hazard(x, dx, cl, 0, 6); hazard(x, cl + crack, dx + dw, 0, 6); }
      // the track beam over the doors, lit from under
      x.fillStyle = '#0c0f13'; x.fillRect(dx - 6, y(dh + 8), dw + 12, 6); x.fillStyle = rgba(WIN, 0.25 + 0.5 * on); x.fillRect(dx - 4, y(dh + 2), dw + 8, 1);
      const number = String(p.number ?? '');
      if (number) {
        const size = Math.max(10, Math.min(48, Math.round(dh * 0.3)));
        x.save(); x.font = mono(size, '700'); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = rgba(STRUCT, 0.55);
        x.fillText(number, Math.round(dx + dw * 0.22), Math.round(y(dh * 0.62))); x.fillText(number, Math.round(dx + dw * 0.78), Math.round(y(dh * 0.62))); x.restore();
      }
      const letters = String(p.letters ?? '');
      if (letters && H - dh > 22) neonPlate(x, t, w / 2, y(dh + 8 + (H - dh - 8) / 2), { text: letters, col: STRUCT, size: 8, h: 12, printed: true, bolts: false, ink: rgba(WIN, 0.85) } as Parameters<typeof neonPlate>[4]);
      // a lamp each side of the door, over a hazard-striped bollard
      for (const lx of [dx - 14, dx + dw + 10]) { x.fillStyle = '#20262e'; x.fillRect(lx, y(dh * 0.6 + 4), 6, 4); x.fillStyle = rgba(WIN, 0.4 + 0.55 * on); x.fillRect(lx + 1, y(dh * 0.6), 4, 1); light(lx + 3, dh * 0.6 - 4, 10, 8, WIN, 'screen'); }
    }
    // floodlight masts before the front, at its ends first
    const masts = Number(p.masts), mh = Number(p.mastHeight), spots = [14, w - 14, Math.round(w * 0.36), Math.round(w * 0.64)];
    for (let i = 0; i < masts; i++) floodMast(x, spots[i], mh, spots[i] < w / 2 ? 1 : -1, on, t, seed + i * 19, light);
  },
});

// ---------------------------------------------------------------- the perimeter fence

export const fenceElement = piece({
  type: 'street.fence', label: 'Perimeter fence (kit, Skyport)', category: 'environment', libraryUse: 'reusable',
  fields: {
    width: num('Width', 1600, 20, 40000, 10, 'units'), height: num('Height', 82, 30, 220, 1, 'units'),
    spacing: num('Post spacing', 96, 30, 400, 1, 'units'), top: select('On top', ['razor', 'barbed', 'none']),
    mesh: colourField('Mesh and posts', '#aabed2'), density: num('Mesh strength', 0.35, 0, 1, 0.05),
    footing: bool('Concrete footing with hazard stripes', true),
    gate: num('Gate from the left (-1: none)', -1, -1, 40000, 1, 'units'), gateWidth: num('Gate width', 96, 30, 400, 1, 'units'),
    gateOpen: num('Gate opened', 0, 0, 1, 0.05), gateLabel: text('Letters over the gate (empty: none)', 'GATE 3'),
    notice: text('Notice on the mesh (lines split by /)', 'NO ENTRY/AUTHORISED STAFF'), header: text('Notice header', 'RESTRICTED AREA'),
    noticeEvery: num('A notice every N bays (0: none)', 3, 0, 40), lampEvery: num('A floodlight every N posts (0: none)', 4, 0, 40),
    seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) + 30 }),
  bounds: p => ({ x: 0, h: Number(p.height) + 30, w: Number(p.width), tall: Number(p.height) + 30 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, end: { x: Number(p.width), h: 0, role: 'mount' }, ...(Number(p.gate) >= 0 ? { gate: { x: Number(p.gate) + Number(p.gateWidth) / 2, h: 0, role: 'entrance' } } : {}) }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), sp = Number(p.spacing), col = isHex(p.mesh) ? rgbOf(String(p.mesh)) : STRUCT, d = Number(p.density), on = lampsOf(o), t = o.t, seed = Number(p.seed);
    const gx = Number(p.gate), gw = Number(p.gateWidth), hasGate = gx >= 0, foot = p.footing !== false ? 6 : 0;
    const inGate = (a: number, b: number) => hasGate && b > gx && a < gx + gw;
    // the footing: a concrete kerb, hazard-striped
    if (foot) { x.fillStyle = '#1a1e24'; x.fillRect(0, y(foot), w, foot); hazard(x, 0, w, 1, foot - 1, 0.55); x.fillStyle = rgba(col, 0.25); x.fillRect(0, y(foot), w, 1); }
    // the mesh: chain link as two sets of diagonals, cut where the gate is
    const meshRun = (l: number, r: number, b: number, top: number, a: number) => {
      if (r <= l) return;
      x.save(); x.beginPath(); x.rect(l, y(top), r - l, top - b); x.clip();
      x.strokeStyle = rgba(col, a); x.lineWidth = 1; x.beginPath();
      const span = top - b;
      for (let k = Math.floor(l / 6) * 6 - span; k < r + span; k += 6) { x.moveTo(k + 0.5, y(b)); x.lineTo(k + span + 0.5, y(top)); x.moveTo(k + span + 0.5, y(b)); x.lineTo(k + 0.5, y(top)); }
      x.stroke(); x.restore();
    };
    const fenceA = 0.12 + 0.35 * d;
    if (hasGate) { meshRun(0, gx, foot + 2, H, fenceA); meshRun(gx + gw, w, foot + 2, H, fenceA); } else meshRun(0, w, foot + 2, H, fenceA);
    // rails top and bottom
    const rail = (l: number, r: number) => { if (r <= l) return; x.fillStyle = '#262c35'; x.fillRect(l, y(H + 1), r - l, 2); x.fillStyle = rgba(col, 0.45); x.fillRect(l, y(H + 1), r - l, 1); x.fillStyle = rgba(col, 0.25); x.fillRect(l, y(foot + 3), r - l, 1); };
    if (hasGate) { rail(0, gx); rail(gx + gw, w); } else rail(0, w);
    // the top: a coil of razor wire, or three strands of barbed wire on raked arms
    const topRun = (l: number, r: number) => {
      if (r <= l) return;
      if (p.top === 'razor') {
        x.strokeStyle = rgba(col, 0.55); x.beginPath();
        for (let k = l + 3; k < r - 2; k += 5) { x.moveTo(k + 4, y(H + 8)); x.ellipse(k, y(H + 8), 4, 6, 0, 0, Math.PI * 2); }
        x.stroke();
        x.fillStyle = rgba(col, 0.7); for (let k = l + 2; k < r; k += 7) x.fillRect(k, y(H + 14 - ((k * 3) % 5)), 1, 1);
      } else if (p.top === 'barbed') {
        x.fillStyle = rgba(col, 0.5); for (const h of [H + 5, H + 10, H + 15]) { x.fillRect(l, y(h), r - l, 1); for (let k = l + 3; k < r; k += 8) x.fillRect(k, y(h + 1), 1, 3); }
      }
    };
    if (hasGate) { topRun(0, gx); topRun(gx + gw, w); } else topRun(0, w);
    // posts, and floodlights on some of them
    const lampEvery = Number(p.lampEvery);
    for (let k = 0, i = 0; k <= w; k += sp, i++) {
      const px = Math.min(w - 3, Math.round(k));
      if (inGate(px - 2, px + 3)) continue;
      x.fillStyle = '#232a33'; x.fillRect(px, y(H + 4), 3, H + 4 - foot); x.fillStyle = rgba(col, 0.5); x.fillRect(px, y(H + 4), 1, H + 4 - foot);
      if (p.top !== 'none') { x.fillStyle = '#232a33'; x.fillRect(px - 1, y(H + 17), 2, 13); }
      if (lampEvery > 0 && i % lampEvery === 2 % lampEvery) {
        x.fillStyle = '#14181e'; x.fillRect(px - 5, y(H + 22), 13, 6); x.fillStyle = rgba(WIN, 0.35 + 0.6 * on); x.fillRect(px - 4, y(H + 17), 11, 1);
        if (on > 0.15) { const g = x.createLinearGradient(0, y(H + 16), 0, 0); g.addColorStop(0, rgba(WIN, 0.09 * on)); g.addColorStop(1, rgba(WIN, 0)); x.fillStyle = g; x.beginPath(); x.moveTo(px - 4, y(H + 16)); x.lineTo(px - 30, 0); x.lineTo(px + 34, 0); x.lineTo(px + 7, y(H + 16)); x.closePath(); x.fill(); }
        o.light?.(px + 1, H + 18, 14, 6, WIN, 'screen');
      }
    }
    // notices wired to the mesh, between the posts
    const every = Number(p.noticeEvery), lines = String(p.notice ?? '').split('/').map(l => l.trim()).filter(Boolean), header = String(p.header ?? '');
    if (every > 0 && (lines.length || header)) {
      const nw = 44, nh = 12 + lines.length * 8;
      for (let k = sp / 2, i = 0; k < w; k += sp, i++) {
        if (i % every !== 1 % every || inGate(k - nw / 2 - 4, k + nw / 2 + 4)) continue;
        const top = y(Math.round(H * 0.62) + nh / 2);
        x.fillStyle = rgba(col, 0.6); x.fillRect(Math.round(k - nw / 2) + 2, top - 2, 1, 2); x.fillRect(Math.round(k + nw / 2) - 3, top - 2, 1, 2);
        paperSign(x, t, Math.round(k), top, nw, nh, { style: 'paper', fill: '#d8dde2', edge: 'rgba(20,24,30,.9)', header: header || undefined, headerFill: rgba(WARN, 0.88), lines, size: 6, lineH: 8 });
      }
    }
    // the gate: two heavy posts, a crossbar with its letters, a framed leaf that slides behind the fence
    if (hasGate) {
      const gt = H + 26;
      x.fillStyle = '#1e242c'; x.fillRect(gx - 5, y(gt), 6, gt); x.fillRect(gx + gw - 1, y(gt), 6, gt);
      x.fillStyle = rgba(col, 0.5); x.fillRect(gx - 5, y(gt), 1, gt); x.fillRect(gx + gw - 1, y(gt), 1, gt);
      x.fillStyle = '#1e242c'; x.fillRect(gx - 5, y(gt), gw + 10, 4); x.fillStyle = rgba(col, 0.4); x.fillRect(gx - 5, y(gt), gw + 10, 1);
      const label = String(p.gateLabel ?? '');
      if (label) neonPlate(x, t, gx + gw / 2, y(gt - 10), { text: label, col: STRUCT, size: 7, h: 11, printed: true, bolts: true, ink: rgba(WIN, 0.9) } as Parameters<typeof neonPlate>[4]);
      const open = Number(p.gateOpen), lx = Math.round(gx + gw * open), lw = gw;
      x.save(); x.beginPath(); x.rect(gx, y(H + 2), gw + 2 + Math.round(gw * open), H + 2); x.clip();
      meshRun(lx + 2, lx + lw - 2, 4, H - 2, fenceA + 0.1);
      x.strokeStyle = rgba(col, 0.6); x.lineWidth = 2; x.strokeRect(lx + 1, y(H - 1), lw - 2, H - 4); x.lineWidth = 1;
      x.beginPath(); x.moveTo(lx + 2, y(4)); x.lineTo(lx + lw - 2, y(H - 2)); x.stroke();
      hazard(x, lx + 2, lx + lw - 2, Math.round(H * 0.45), Math.round(H * 0.45) + 5, 0.8);
      x.restore();
      x.fillStyle = '#1e242c'; x.fillRect(gx - 2, y(2), gw + 4, 2);
      // the gate's light: red while shut, green once it is open
      const ok = open > 0.5; x.fillStyle = ok ? 'rgba(80,220,140,.95)' : rgba(WARN, Math.floor(t / 40 + seed) % 3 === 0 ? 0.4 : 0.95); x.fillRect(gx + gw + 1, y(H + 14), 3, 3);
      o.light?.(gx + gw + 2, H + 12, 6, 6, ok ? '80,220,140' : WARN, 'screen');
      // a reader on the post
      x.fillStyle = '#0c0f13'; x.fillRect(gx - 11, y(46), 6, 10); x.fillStyle = rgba(WARN, 0.85); x.fillRect(gx - 10, y(43), 4, 1);
    }
  },
});

// ---------------------------------------------------------------- the launch pad (landmark)

/** The frame: hardstand from 30 to 330, the service tower at 112..140, the vehicle on the pad at 190, the assembly hall at 360..500. */
const PAD = { w: 520, cx: 190, tower: 112, towerW: 28, towerH: 330, vab: 360, vabW: 150, vabH: 350, base: 44 } as const;

export const launchPadElement = piece({
  type: 'landmark.launch-pad', label: 'Launch pad (landmark, Skyport)', category: 'architecture',
  fields: {
    size: num('Size (far away: smaller)', 0.7, 0.2, 2, 0.05),
    state: select('Launches', ['cycle', 'waiting', 'empty']),
    cycle: num('Launch every', 7200, 3600, 72000, 60, 'frames'), phase: num('Cycle phase', 0, 0, 72000, 10, 'frames'),
    body: colourField('Vehicle colour', '#8e9aa8'), plume: colourField('Plume and launch glow', '#ffa04a'),
    letters: text('Letters down the vehicle (empty: none)', 'SKYPORT 9'), boosters: bool('Side boosters', true),
    hall: bool('Assembly hall it rolls out of', true), waterTower: bool('Water tower', true),
    steam: num('Steam', 1, 0, 2, 0.05), floods: num('Floodlights', 1, 0, 2, 0.05), haze: num('Distance haze', 0.3, 0, 1, 0.05),
    seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: PAD.w * Number(p.size), tall: 420 * Number(p.size) }),
  bounds: p => ({ x: 0, h: 420 * Number(p.size), w: PAD.w * Number(p.size), tall: 420 * Number(p.size) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, pad: { x: PAD.cx * Number(p.size), h: 0, role: 'mount' } }),
  paint(x, p, o) {
    const s = Number(p.size); x.scale(s, s);
    const light = sized(o, s), t = o.t, seed = Number(p.seed), on = lampsOf(o), haze = Number(p.haze), floods = Number(p.floods) * (0.25 + 0.75 * on);
    const fog = (hex: string) => mixHex(hex, '#222a36', haze * 0.6), plume = isHex(p.plume) ? rgbOf(String(p.plume)) : '255,160,74', body = isHex(p.body) ? String(p.body) : '#8e9aa8';
    // where in the cycle: roll out of the hall, arms in, wait venting, arms back, ignition, ascent
    const C = Number(p.cycle), state = String(p.state), ph = state === 'cycle' ? (t + Number(p.phase)) % C : state === 'waiting' ? 2000 : C - 1, L = C - 1500;
    const sinceLaunch = state === 'cycle' ? (ph - L + C) % C : state === 'empty' ? 2400 : 99999;
    const launched = state === 'empty' || (state === 'cycle' && ph >= L);
    const roll = p.hall !== false && state === 'cycle' ? 1 - ease(ph / 1200) : 0, dx = Math.round(roll * (PAD.vab + PAD.vabW / 2 - PAD.cx));
    const arms = state === 'empty' ? 0 : state === 'waiting' ? 1 : ph < 1200 ? 0 : ph < 1320 ? ease((ph - 1200) / 120) : ph < L - 180 ? 1 : ph < L - 60 ? 1 - ease((ph - (L - 180)) / 120) : 0;
    const s0 = launched && state === 'cycle' ? ph - L : -1, rise = s0 >= 0 ? Math.round(0.0011 * s0 * s0) : 0;
    const k = state === 'cycle' ? (s0 < 0 ? (ph > L - 60 ? (ph - (L - 60)) / 60 * 0.3 : 0) : s0 < 300 ? 1 : Math.max(0, 1 - (s0 - 300) / 900)) : 0;
    const vehicleThere = !(launched && (state === 'empty' || rise > 900));
    const lit = mixRgb(WIN, plume, clamp01(k * 1.2)), litA = clamp01(0.2 + 0.5 * floods + 0.6 * k);
    // the launch glow on the clouds and the sky round the pad
    if (k > 0.01) {
      x.save(); x.globalCompositeOperation = 'lighter';
      const gy = y(PAD.base + Math.min(rise, 600) + 40), g = x.createRadialGradient(PAD.cx, gy, 4, PAD.cx, gy, 320);
      g.addColorStop(0, rgba(plume, 0.55 * k)); g.addColorStop(0.4, rgba(plume, 0.2 * k)); g.addColorStop(1, rgba(plume, 0));
      x.fillStyle = g; x.fillRect(PAD.cx - 330, gy - 330, 660, 660);
      const cg = x.createRadialGradient(PAD.cx, y(560), 10, PAD.cx, y(560), 520); cg.addColorStop(0, rgba(plume, 0.22 * k)); cg.addColorStop(1, rgba(plume, 0));
      x.fillStyle = cg; x.fillRect(PAD.cx - 540, y(1080), 1080, 1040);
      x.restore();
    }
    // the hardstand: a raised concrete deck with sloped sides, the flame trench under the pad
    x.fillStyle = fog('#1a1f26'); x.beginPath(); x.moveTo(20, 0); x.lineTo(44, y(12)); x.lineTo(340, y(12)); x.lineTo(352, 0); x.closePath(); x.fill();
    x.fillStyle = rgba(lit, 0.25 * litA); x.fillRect(44, y(12), 296, 1);
    x.fillStyle = '#07080a'; x.fillRect(PAD.cx - 26, y(10), 52, 10);
    // the rails from the hall to the pad
    x.fillStyle = rgba(STRUCT, 0.25); x.fillRect(PAD.cx, y(13), PAD.vab + PAD.vabW / 2 - PAD.cx, 1);
    // the water tower: a tank on four legs, for the deluge
    if (p.waterTower !== false) {
      x.fillStyle = fog('#1d232b'); for (const lx of [36, 44, 56, 64]) x.fillRect(lx, y(110), 2, 98);
      x.fillStyle = rgba(STRUCT, 0.2); for (let h = 24; h < 110; h += 20) x.fillRect(36, y(h), 30, 1);
      x.fillStyle = fog('#222831'); x.beginPath(); x.ellipse(51, y(126), 22, 20, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = rgba(lit, 0.3 * litA); x.fillRect(31, y(128), 2, 8); x.fillStyle = rgba(STRUCT, 0.5); x.fillRect(42, y(130), 18, 1);
      beacon(x, 51, 146, t, seed + 4);
    }
    // the assembly hall, its tall door open; the vehicle waits inside, then rolls out on its crawler
    const hx = PAD.vab, hw = PAD.vabW, hh = PAD.vabH, doorW = 76, doorX = hx + (hw - doorW) / 2, doorH = 318;
    if (p.hall !== false) {
      x.fillStyle = rgba(WIN, 0.16 + 0.24 * on); x.fillRect(doorX, y(doorH), doorW, doorH - 12);
      x.fillStyle = rgba(STRUCT, 0.12); for (let h = 40; h < doorH; h += 40) x.fillRect(doorX, y(h), doorW, 1);
    }
    // the vehicle and its launch platform, on the crawler or on the pad
    const vx = PAD.cx + dx, vb = PAD.base + rise;
    {
      // the platform stays on the pad after a launch, scorched; it goes back to the hall with the next one
      const mx = PAD.cx + (launched ? 0 : dx);
      x.fillStyle = fog('#181c22'); x.fillRect(mx - 46, y(PAD.base), 92, PAD.base - 26); x.fillStyle = rgba(lit, 0.35 * litA); x.fillRect(mx - 46, y(PAD.base), 92, 1);
      x.fillStyle = '#07080a'; x.fillRect(mx - 14, y(PAD.base - 2), 28, 8);
      x.fillStyle = fog('#14171c'); x.fillRect(mx - 40, y(26), 30, 13); x.fillRect(mx + 10, y(26), 30, 13);
      x.fillStyle = rgba(STRUCT, 0.25); for (let q = 0; q < 30; q += 4) { const tr = Math.round((dx * 0.5 + q) % 30); x.fillRect(mx - 40 + tr, y(14), 2, 1); x.fillRect(mx + 10 + tr, y(14), 2, 1); }
    }
    if (vehicleThere) drawVehicle(x, vx, vb, { body: fog(body), lit, litA, t, letters: String(p.letters ?? ''), boosters: p.boosters !== false, burning: s0 >= 0 || k > 0, plume, seed });
    if (p.hall !== false) {
      // the hall's walls round the door, drawn over whatever is still inside
      x.fillStyle = fog('#141920'); x.fillRect(hx, y(hh), doorX - hx, hh); x.fillRect(doorX + doorW, y(hh), hx + hw - doorX - doorW, hh); x.fillRect(doorX, y(hh), doorW, hh - doorH);
      x.fillStyle = rgba(STRUCT, 0.05); for (let q = hx + 3; q < hx + hw; q += 5) if (q < doorX || q > doorX + doorW) x.fillRect(q, y(hh), 1, hh);
      x.fillStyle = rgba(STRUCT, 0.35); x.fillRect(hx, y(hh), hw, 1); x.fillRect(doorX - 1, y(doorH), 1, doorH); x.fillRect(doorX + doorW, y(doorH), 1, doorH);
      x.fillStyle = '#0c0f13'; x.fillRect(hx - 2, y(hh + 4), hw + 4, 4);
      for (let i = 0; i < 4; i++) { const wy = 60 + i * 70; if (windowLit(seed * 7 + i, o.lighting)) { x.fillStyle = rgba(WIN, 0.45); x.fillRect(hx + 6, y(wy + 4), 10, 4); x.fillRect(hx + hw - 16, y(wy + 4), 10, 4); } }
      hazard(x, doorX, doorX + doorW, doorH, doorH + 6, 0.7);
      beacon(x, hx + 4, hh + 4, t, seed + 9); beacon(x, hx + hw - 4, hh + 4, t, seed + 33);
      neonPlate(x, t, hx + hw / 2, y(hh - 14), { text: 'ASSEMBLY 2', col: STRUCT, size: 8, h: 12, printed: true, bolts: false, ink: rgba(WIN, 0.8) } as Parameters<typeof neonPlate>[4]);
    }
    // the service tower: a steel lattice, platforms, a lift cage, the umbilical arms, a lightning mast
    const tl = PAD.tower, tw = PAD.towerW, th = PAD.towerH;
    x.fillStyle = fog('#1a1f26'); x.fillRect(tl, y(th), 2, th - 12); x.fillRect(tl + tw - 2, y(th), 2, th - 12);
    x.strokeStyle = rgba(STRUCT, 0.28); x.lineWidth = 1; x.beginPath();
    for (let h = 12; h < th - 4; h += 20) { x.moveTo(tl + 1, y(h)); x.lineTo(tl + tw - 1, y(h + 20)); x.moveTo(tl + tw - 1, y(h)); x.lineTo(tl + 1, y(h + 20)); }
    x.stroke();
    x.fillStyle = rgba(lit, 0.75 * litA); x.fillRect(tl + tw - 1, y(th), 1, th - 12);
    for (let h = 52; h < th; h += 40) { x.fillStyle = fog('#11151a'); x.fillRect(tl - 4, y(h), tw + 8, 3); x.fillStyle = rgba(lit, 0.5 * litA); x.fillRect(tl - 4, y(h), tw + 8, 1); }
    const car = 20 + Math.round((Math.sin(t / 400 + seed) * 0.5 + 0.5) * (th - 60));
    x.fillStyle = rgba(WIN, 0.25 + 0.5 * on); x.fillRect(tl + 4, y(car + 8), 6, 8);
    x.fillStyle = fog('#1a1f26'); x.fillRect(tl + tw / 2 - 1, y(th + 50), 2, 50); x.fillRect(tl + tw / 2 - 6, y(th + 4), 12, 4);
    beacon(x, tl + tw / 2, th + 50, t, seed); beacon(x, tl, th, t, seed + 20); beacon(x, tl + tw, th, t, seed + 40);
    {
      // the arms reach the vehicle at three heights; swung back, only their stubs show
      for (const [ah, n] of [[PAD.base + 228, 1], [PAD.base + 160, 0], [PAD.base + 90, 0]] as const) {
        const reach = vx - 12 - (n ? 0 : 10) - (tl + tw), len = Math.max(4, Math.round(reach * arms));
        x.fillStyle = fog('#20262e'); x.fillRect(tl + tw, y(ah + 4), len, 5); x.fillStyle = rgba(lit, 0.6 * litA); x.fillRect(tl + tw, y(ah + 4), len, 1);
        if (n && arms > 0.9) { x.fillStyle = rgba(WIN, 0.5 + 0.3 * on); x.fillRect(tl + tw + len - 8, y(ah + 2), 4, 3); }
      }
    }
    // floodlights on two masts, aimed at the vehicle
    if (Number(p.floods) > 0) { floodMast(x, 86, 220, 1, Math.min(1, floods), t, seed + 2, light); floodMast(x, 318, 200, -1, Math.min(1, floods), t, seed + 6, light); }
    // steam: boil-off from the vehicle's side and off the pad while it waits
    const steam = Number(p.steam);
    if (steam > 0 && vehicleThere && !launched && roll === 0) {
      const pre = ph > L - 240 && state === 'cycle' ? 1 + 2 * ((ph - (L - 240)) / 240) : 1;
      puffs(x, t, vx + 13, vb + 196, 1, steam * pre, seed, 7, 0.35, 0.28);
      puffs(x, t, vx - 30, PAD.base - 4, -1, steam * pre, seed + 50, 10, 0.5, 0.1);
      puffs(x, t, vx + 30, PAD.base - 4, 1, steam * pre, seed + 90, 10, 0.5, 0.1);
    }
    // the launch: the exhaust's ground cloud rolling out both ways, the trail up to the climbing vehicle
    if (sinceLaunch < 2400) {
      const sl = sinceLaunch, grow = ease(sl / 360), fade = 1 - ease((sl - 900) / 1300), grey = clamp01(sl / 700);
      const cloudCol = mixRgb(mixRgb(plume, '255,235,210', 0.4), '120,128,140', grey);
      for (let i = 0; i < 46; i++) {
        const q = hash(seed * 7 + i), q2 = hash(seed * 13 + i * 3), dir = i % 2 ? 1 : -1;
        const cx = PAD.cx + dir * (8 + grow * (40 + q * 170) + sl * 0.02 * q2), ch = 10 + grow * q2 * 60 + sl * 0.015, r = 8 + grow * (10 + q * 22);
        x.fillStyle = rgba(cloudCol, 0.55 * fade * (0.6 + 0.4 * q2)); x.beginPath(); x.ellipse(Math.round(cx), Math.round(y(ch)), Math.round(r), Math.round(r * 0.7), 0, 0, Math.PI * 2); x.fill();
      }
      if (rise > 0) {
        const trailA = Math.max(0, 0.45 - sl / 2400), top = Math.min(rise + PAD.base, 900);
        const tg = x.createLinearGradient(0, y(top), 0, y(PAD.base)); tg.addColorStop(0, rgba(mixRgb(plume, '230,230,235', 0.3), trailA)); tg.addColorStop(1, rgba('170,175,185', trailA * 0.6));
        x.fillStyle = tg; x.beginPath(); x.moveTo(PAD.cx - 4, y(top)); x.lineTo(PAD.cx + 4, y(top)); x.lineTo(PAD.cx + 26 + sl * 0.02, y(PAD.base)); x.lineTo(PAD.cx - 26 - sl * 0.02, y(PAD.base)); x.closePath(); x.fill();
      }
    }
    if (k > 0.05) light(PAD.cx, PAD.base, 200, 60, plume, 'screen');
  },
});

/** Puffs of steam drifting off a vent at (vx, vh), toward `dir`: blocky pale clouds that grow and fade. */
function puffs(x: CanvasRenderingContext2D, t: number, vx: number, vh: number, dir: 1 | -1, amount: number, seed: number, n: number, drift: number, lift: number) {
  const life = 220;
  for (let i = 0; i < n; i++) {
    const age = (t + i * Math.round(life / n) + seed * 13) % life, f = age / life, q = hash(seed + i);
    const px = vx + dir * (age * drift * (0.6 + 0.4 * q)), pz = vh + age * lift + q * 4, r = Math.round(2 + f * 9 * (0.7 + 0.3 * q));
    const a = Math.min(0.45, 0.32 * amount) * (1 - f);
    x.fillStyle = 'rgba(220,228,240,' + a.toFixed(3) + ')'; x.fillRect(Math.round(px - r), Math.round(y(pz + r / 2)), r * 2, r); x.fillRect(Math.round(px - r / 2), Math.round(y(pz + r)), r, r * 2);
  }
}

interface VehicleLook { body: string; lit: string; litA: number; t: number; letters: string; boosters: boolean; burning: boolean; plume: string; seed: number }
/** The launch vehicle on its base at (cx, base): a core stage with an ogive nose, two strap-on boosters, fins, a flame when it burns. */
function drawVehicle(x: CanvasRenderingContext2D, cx: number, base: number, o: VehicleLook) {
  const core = 24, ch = 196, nose = 34, shade = mixHex(o.body, '#000000', 0.45), l = cx - core / 2;
  if (o.burning) {
    // the flame under the nozzles: a white core, orange round it, flickering
    const fl = 26 + Math.round(Math.abs(Math.sin(o.t * 0.9)) * 10 + Math.sin(o.t * 2.3) * 4);
    x.fillStyle = rgba(o.plume, 0.85); x.beginPath(); x.moveTo(cx - 12, y(base)); x.lineTo(cx, y(base - fl - 14)); x.lineTo(cx + 12, y(base)); x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,245,220,.95)'; x.beginPath(); x.moveTo(cx - 6, y(base)); x.lineTo(cx, y(base - fl)); x.lineTo(cx + 6, y(base)); x.closePath(); x.fill();
    if (o.boosters) for (const bx of [l - 6, l + core + 6]) { x.fillStyle = 'rgba(255,240,210,.9)'; x.beginPath(); x.moveTo(bx - 4, y(base)); x.lineTo(bx, y(base - fl * 0.8)); x.lineTo(bx + 4, y(base)); x.closePath(); x.fill(); }
  }
  // the core: lit down its left side by the floods, shaded right
  x.fillStyle = o.body; x.fillRect(l, y(base + ch), core, ch);
  x.fillStyle = shade; x.fillRect(l + core - 8, y(base + ch), 8, ch);
  x.fillStyle = rgba(o.lit, 0.55 * o.litA); x.fillRect(l, y(base + ch), 2, ch);
  // bands: the interstage, the tank domes, the payload fairing's seam
  for (const [bh, bt] of [[base + 120, 6], [base + 60, 2], [base + 170, 2]] as const) { x.fillStyle = '#14181e'; x.fillRect(l, y(bh + bt), core, bt); }
  // the nose: an ogive fairing
  x.fillStyle = o.body; x.beginPath(); x.moveTo(l, y(base + ch)); x.quadraticCurveTo(l + 1, y(base + ch + nose * 0.8), cx, y(base + ch + nose)); x.quadraticCurveTo(l + core - 1, y(base + ch + nose * 0.8), l + core, y(base + ch)); x.closePath(); x.fill();
  x.fillStyle = shade; x.beginPath(); x.moveTo(cx + 4, y(base + ch)); x.quadraticCurveTo(l + core - 1, y(base + ch + nose * 0.6), cx, y(base + ch + nose)); x.lineTo(l + core, y(base + ch)); x.closePath(); x.fill();
  x.fillStyle = rgba(o.lit, 0.5 * o.litA); x.fillRect(l, y(base + ch + 6), 1, 6);
  // the boosters, a fin each, nozzles
  if (o.boosters) for (const [bl, side] of [[l - 11, -1], [l + core + 1, 1]] as const) {
    x.fillStyle = side < 0 ? o.body : shade; x.fillRect(bl, y(base + 112), 10, 112);
    x.beginPath(); x.moveTo(bl, y(base + 112)); x.lineTo(bl + 5, y(base + 126)); x.lineTo(bl + 10, y(base + 112)); x.closePath(); x.fill();
    if (side < 0) { x.fillStyle = rgba(o.lit, 0.5 * o.litA); x.fillRect(bl, y(base + 112), 1, 112); }
    x.fillStyle = '#14181e'; x.fillRect(bl, y(base + 74), 10, 2);
    x.fillStyle = shade; x.beginPath(); x.moveTo(bl + (side < 0 ? 0 : 10), y(base + 20)); x.lineTo(bl + (side < 0 ? -6 : 16), y(base)); x.lineTo(bl + (side < 0 ? 0 : 10), y(base)); x.closePath(); x.fill();
    x.fillStyle = '#0c0e12'; x.fillRect(bl + 2, y(base), 6, 3);
  }
  x.fillStyle = '#0c0e12'; x.fillRect(l + 3, y(base), core - 6, 4);
  // hazard bands at the base and a warning light on the fairing
  hazard(x, l, l + core, base + 4, base + 9, 0.7);
  x.fillStyle = rgba(WARN, Math.floor((o.t + o.seed) / 50) % 2 ? 0.95 : 0.35); x.fillRect(cx - 1, y(base + ch + nose - 6), 2, 2);
  // the letters stencilled down the core
  if (o.letters) {
    x.save(); x.font = mono(7, '700'); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(16,20,26,.85)';
    [...o.letters].forEach((c, i) => x.fillText(c, Math.round(cx - 3), Math.round(y(base + 112 - 10 - i * 8)) + 0.5));
    x.restore();
  }
}

export const skyportElements: Element[] = [hangarElement, fenceElement, launchPadElement];
