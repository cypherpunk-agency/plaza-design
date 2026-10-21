/**
 * BUILDING KIT, the Fringe ("Automated. No residents."): industry run by machines, out past the city.
 * - `building.shed`: long low sheds of corrugated sheet metal, a sawtooth, barrel or flat roof, roller
 *   doors on loading docks, grow-light strips in the clerestory (vertical farms), stacks with heat
 *   shimmer, big stencilled numbers and machine codes, hazard stripes, floodlights on brackets, dust
 *   drifted against the base. Abandoned, it is a dead factory: dark, panels missing, rust.
 * - `landmark.data-cemetery`: where data goes to die. A fenced yard of decommissioned server racks on
 *   terraces, a few still blinking, piles of drives, a gantry crane moving racks, cooling towers
 *   steaming behind, flood masts, a gate with a machine-readable sign. Some racks have candles left by
 *   people (CITY.md: memorial servers of the dead).
 * - `environment.solar-field`: a far plateau of solar panels, distant sheds, stacks and pylons, for the
 *   distance layer; its depth is the placement's parallax.
 *
 * Palette (the Fringe's style card): structure #8a8a94, walls #16151a, windows #ffa040, neon #b07aff,
 * #ffd9a5, #ff2a44. Drawn in the piece's own frame (origin at its foot left, heights up, `y = -h`).
 */
import type { Element, Properties } from '../core/composition';
import { mono, rng } from '../core/primitives';
import { windowLit, type Light } from '../../world/light';
import { neonPlate } from '../signage/kit';
import * as P from './parts';
import { bool, colour, hash, isHex, num, piece, rgba, rgbOf, select, text, y, type Paint } from './types';

const SHEET = '138,138,148', AMBER = '255,160,64', PALE = '255,217,165', RED = '255,42,68', VIOLET = '176,122,255', PAINT = '216,212,200';
const SHED_WALLS = ['#16151a', '#18171c', '#141418', '#1a1816', '#15171a'];
const ROOFS = ['sawtooth', 'barrel', 'flat'] as const;
/** How strong lamps and glows are at this hour (full indoors). */
const glowOf = (l: Light) => (l.outdoor ? l.lamps : 1);
const R = Math.round;

// ---------------------------------------------------------------- shared details

/** Corrugated sheet: a light and a dark rib every 3 units between heights `bottom` and `top`. */
function corrugate(x: CanvasRenderingContext2D, l: number, r: number, top: number, bottom: number, a: number) {
  for (let k = R(l); k < r - 1; k += 3) {
    x.fillStyle = rgba(SHEET, a); x.fillRect(k, y(top), 1, top - bottom);
    x.fillStyle = rgba('0,0,0', Math.min(1, a * 1.8)); x.fillRect(k + 1, y(top), 1, top - bottom);
  }
}

/** A machine-readable code: `cells`² modules of `cell` units on a pale square, three finder corners; the seed picks the pattern. */
export function machineCode(x: CanvasRenderingContext2D, l: number, top: number, cells: number, cell: number, seed: number, a = 0.85) {
  const s = cells * cell, L = R(l), T = R(y(top));
  x.fillStyle = rgba(PAINT, a); x.fillRect(L - 2, T - 2, s + 4, s + 4);
  x.fillStyle = '#0b0b0d';
  for (let i = 0; i < cells; i++) for (let j = 0; j < cells; j++) {
    const fi = i < 3 ? i : i >= cells - 3 ? i - (cells - 3) : -1, fj = j < 3 ? j : j >= cells - 3 ? j - (cells - 3) : -1;
    // three corners carry a hollow finder square; the rest is the seeded pattern
    const finder = fi >= 0 && fj >= 0 && !(i >= cells - 3 && j >= cells - 3);
    const on = finder ? !(fi === 1 && fj === 1) : hash(seed * 0.37 + i * 17.1 + j * 31.7) < 0.5;
    if (on) x.fillRect(L + i * cell, T + j * cell, cell, cell);
  }
}

/** A barcode strip `w` wide, `h` tall, its top at height `top`. */
function barcode(x: CanvasRenderingContext2D, l: number, top: number, w: number, h: number, seed: number, a = 0.8) {
  x.fillStyle = rgba(PAINT, a); x.fillRect(R(l) - 1, R(y(top)) - 1, w + 2, h + 2);
  x.fillStyle = '#0b0b0d'; for (let k = 0; k < w; k++) if (hash(seed + k * 3.3) < 0.55) x.fillRect(R(l) + k, R(y(top)), 1, h);
}

/** Yellow and black diagonal stripes in a band `hh` tall from height `h`, `w` long from `l`. */
function hazard(x: CanvasRenderingContext2D, l: number, w: number, h: number, hh: number, a = 0.85) {
  x.save(); x.beginPath(); x.rect(R(l), R(y(h + hh)), R(w), R(hh)); x.clip();
  x.fillStyle = '#121110'; x.fillRect(R(l), R(y(h + hh)), R(w), R(hh));
  x.fillStyle = rgba('216,160,58', a);
  for (let k = R(l) - hh; k < l + w; k += 8) { x.beginPath(); x.moveTo(k, y(h)); x.lineTo(k + 4, y(h)); x.lineTo(k + 4 + hh, y(h + hh)); x.lineTo(k + hh, y(h + hh)); x.closePath(); x.fill(); }
  x.restore();
}

/** Big stencilled letters centred on (cx, height ch), with the stencil's bridge cut through the middle. */
function stencil(x: CanvasRenderingContext2D, s: string, cx: number, ch: number, size: number, ink: string, wall: string) {
  if (!s) return;
  x.save(); x.font = mono(size, '700'); x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = ink; x.fillText(s, R(cx), R(y(ch)));
  const w = Math.ceil([...s].length * size * 0.62);
  x.fillStyle = wall; x.fillRect(R(cx - w / 2), R(y(ch)), w, 1);
  for (let k = 0; k < [...s].length; k++) x.fillRect(R(cx - w / 2 + (k + 0.5) * size * 0.62), R(y(ch + size * 0.42)), 1, R(size * 0.18));
  x.restore();
}

/** A floodlight on a bracket out from a wall at (bx, height bh): its head, a pale cone down to the ground, its glow. */
function flood(x: CanvasRenderingContext2D, o: Paint, bx: number, bh: number, dir: 1 | -1, on: boolean, col = PALE, arm = 9) {
  const g = glowOf(o.lighting), hx = bx + dir * arm, top = bh - 3;
  x.fillStyle = '#0c0c0f'; x.fillRect(R(Math.min(bx, hx)), R(y(bh)), arm + 1, 2); x.fillRect(R(bx) - 1, R(y(bh + 4)), 2, 8);
  x.fillStyle = '#1e1d22'; x.fillRect(R(hx) - 4, R(y(bh + 2)), 8, 5); x.fillStyle = rgba(SHEET, 0.5); x.fillRect(R(hx) - 4, R(y(bh + 2)), 8, 1);
  if (!on) { x.fillStyle = '#0a0a0c'; x.fillRect(R(hx) - 3, R(y(top)), 6, 1); return; }
  x.fillStyle = rgba(col, 0.45 + 0.55 * g); x.fillRect(R(hx) - 3, R(y(top)), 6, 1);
  const cone = x.createLinearGradient(0, y(top), 0, 0); cone.addColorStop(0, rgba(col, 0.13 * g)); cone.addColorStop(1, rgba(col, 0.02 * g));
  x.fillStyle = cone; x.beginPath(); x.moveTo(hx - 3, y(top)); x.lineTo(hx + 3, y(top)); x.lineTo(hx + 3 + top * 0.35, 0); x.lineTo(hx - 3 - top * 0.35, 0); x.closePath(); x.fill();
  o.light?.(hx, top, 10, 6, col, 'screen');
}

/** A stack: a steel chimney with bands, a red warning light, heat shimmer over its mouth (and a little steam when `smoke`). */
function chimney(x: CanvasRenderingContext2D, o: Paint, cx: number, base: number, w: number, h: number, seed: number, smoke: boolean, alive = true) {
  const l = R(cx - w / 2), top = base + h;
  x.fillStyle = '#111015'; x.fillRect(l, y(top), w, h); x.fillStyle = rgba(SHEET, 0.3); x.fillRect(l, y(top), 1, h);
  x.fillStyle = 'rgba(0,0,0,.4)'; for (let k = base + 14; k < top - 6; k += 16) x.fillRect(l, y(k), w, 1);
  x.fillStyle = '#5a1e22'; x.fillRect(l, y(top - 3), w, 3); x.fillRect(l, y(top - 9), w, 3);
  x.fillStyle = '#0a0a0c'; x.fillRect(l - 1, y(top + 1), w + 2, 2);
  if (!alive) return;
  if (Math.floor((o.t + seed * 37) / 45) % 3 !== 0) { x.fillStyle = rgba(RED, 0.9); x.fillRect(R(cx) - 1, y(top + 3), 2, 2); o.light?.(cx, top + 2, 4, 4, RED, 'screen'); }
  for (let k = 0; k < 7; k++) {
    const rise = (o.t * 0.35 + k * 9 + seed * 7) % 44, wob = R(Math.sin((o.t + k * 23 + seed) / 11) * 2);
    x.fillStyle = 'rgba(255,235,210,' + (0.07 * (1 - rise / 44)).toFixed(3) + ')'; x.fillRect(l + 1 + wob, R(y(top + 3 + rise)), Math.max(1, w - 2), 2);
  }
  if (smoke) for (let k = 0; k < 5; k++) {
    const rise = (o.t * 0.2 + k * 18 + seed * 11) % 90, rr = 3 + rise * 0.12;
    x.fillStyle = 'rgba(170,166,160,' + (0.09 * (1 - rise / 90)).toFixed(3) + ')'; x.beginPath(); x.arc(cx + rise * 0.3, y(top + 6 + rise), rr, 0, Math.PI * 2); x.fill();
  }
}

/** Dust drifted against a wall's foot from `l` to `r`: pale on the wall, a low mound on the ground. */
function dust(x: CanvasRenderingContext2D, l: number, r: number, amount: number, seed: number) {
  if (amount <= 0) return;
  const g = x.createLinearGradient(0, y(28 * amount), 0, 0); g.addColorStop(0, 'rgba(150,138,118,0)'); g.addColorStop(1, rgba('150,138,118', 0.22 * amount));
  x.fillStyle = g; x.fillRect(R(l), R(y(28 * amount)), R(r - l), R(28 * amount));
  x.fillStyle = rgba('120,110,94', 0.55 * amount); x.beginPath(); x.moveTo(l - 4, 0);
  for (let k = l; k <= r; k += 6) x.lineTo(k, y(1 + amount * (2 + 5 * hash(seed + k * 0.13)) * (0.5 + 0.5 * Math.sin(k * 0.07 + seed))));
  x.lineTo(r + 4, 0); x.closePath(); x.fill();
  x.fillStyle = rgba('190,176,150', 0.2 * amount); for (let k = l; k < r; k += 11) x.fillRect(R(k), -1, 3, 1);
}

// ---------------------------------------------------------------- the shed

const shedRoofRise = (p: Properties) => p.roof === 'sawtooth' ? 22 : p.roof === 'barrel' ? Math.min(40, R(Number(p.width) * 0.12)) : 6;

export const shedElement = piece({
  type: 'building.shed', label: 'Industrial shed (kit, Fringe)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 240, 80, 1200, 1, 'units'), height: num('Wall height', 76, 40, 200, 1, 'units'), roof: select('Roof', ROOFS),
    wall: colour('Wall colour'), doors: num('Roller doors', 2, 0, 10), open: num('Doors open (share)', 0.5, 0, 1, 0.05), docks: bool('Loading docks under the doors', true),
    grow: num('Grow lights (vertical farm, share)', 0.6, 0, 1, 0.05), growColour: { kind: 'color', label: 'Grow-light colour', default: '#b07aff' },
    number: text('Stencilled number (empty: none)', '07'), code: bool('Machine code by the number', true), notice: text('Notice by the door (empty: none)', 'NO STAFF ON SITE'),
    hazard: bool('Hazard stripes and bollards', true), stacks: num('Stacks and roof vents', 2, 0, 8), smoke: bool('Stacks steaming', true),
    floods: num('Floodlights on brackets', 2, 0, 8), dust: num('Dust against the base', 0.6, 0, 1, 0.05), dead: bool('Abandoned (dark, panels missing)', false),
    seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) + shedRoofRise(p) + 90 }),
  bounds: p => { const tall = Number(p.height) + shedRoofRise(p) + 90; return { x: -14, h: tall, w: Number(p.width) + 28, tall }; },
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, roof: { x: Number(p.width) / 2, h: Number(p.height) + shedRoofRise(p), role: 'surface' }, door: { x: 32, h: p.docks === false ? 0 : 12, role: 'entrance' } }),
  paint(x, p, o) {
    const w = R(Number(p.width)), H = R(Number(p.height)), roof = String(p.roof), seed = Number(p.seed), r = rng(seed * 6151 + 29), dead = p.dead === true;
    const wall = isHex(p.wall) ? String(p.wall) : SHED_WALLS[Math.floor(r() * SHED_WALLS.length)], g = glowOf(o.lighting);
    const growCol = isHex(p.growColour) ? rgbOf(String(p.growColour)) : VIOLET, grow = dead ? 0 : Number(p.grow), rise = shedRoofRise(p);
    // stacks and vents first: they stand on the roof, its edge covers their feet
    const ns = Number(p.stacks);
    for (let i = 0; i < ns; i++) {
      const cx = R(w * (0.12 + 0.76 * (ns === 1 ? 0.7 : i / (ns - 1)))) + R((r() - 0.5) * 12), s = seed * 17 + i;
      if (i % 2 === 0) chimney(x, o, cx, H, 6 + R(hash(s) * 5), 36 + R(hash(s + 1) * 34), s, p.smoke !== false && !dead, !dead);
      else {
        // a vent stands on the roof's surface where it is (the barrel's curve, the flat roof, a sawtooth valley)
        const f = Math.min(1, Math.abs(cx - w / 2) / (w / 2)), on = roof === 'barrel' ? R(rise * Math.sqrt(1 - f * f)) - 2 : roof === 'flat' ? rise : 2;
        P.roofVent(x, cx, y(H + on), 10 + R(hash(s + 2) * 6), '#121116');
      }
    }
    // the roof
    if (roof === 'sawtooth') {
      const n = Math.max(1, R(w / 44)), tw = w / n;
      for (let i = 0; i < n; i++) {
        const sx = R(i * tw), ex = R((i + 1) * tw), lit = hash(seed * 3 + i) < grow;
        x.fillStyle = '#121116'; x.beginPath(); x.moveTo(sx, y(H)); x.lineTo(sx, y(H + rise)); x.lineTo(ex, y(H)); x.closePath(); x.fill();
        x.strokeStyle = rgba(SHEET, 0.4); x.lineWidth = 1; x.beginPath(); x.moveTo(sx + 0.5, y(H + rise) + 0.5); x.lineTo(ex, y(H) + 0.5); x.stroke();
        // the glazed north face of the tooth, lit by the grow lights inside
        x.fillStyle = lit ? rgba(growCol, 0.45 + 0.4 * g) : '#0a0b0e';
        x.beginPath(); x.moveTo(sx + 1, y(H)); x.lineTo(sx + 5, y(H)); x.lineTo(sx + 5, y(H + rise - 4)); x.lineTo(sx + 1, y(H + rise - 1)); x.closePath(); x.fill();
        if (lit) o.light?.(sx + 3, H + rise / 2, 4, rise, growCol, 'window');
        else if (dead && hash(seed + i) < 0.5) { x.fillStyle = 'rgba(0,0,0,.9)'; x.fillRect(sx + 2, y(H + rise - 6), 3, 5); }
      }
    } else if (roof === 'barrel') {
      x.fillStyle = '#121116'; x.beginPath(); x.ellipse(w / 2, y(H), w / 2 + 2, rise, 0, Math.PI, 0); x.fill();
      x.save(); x.beginPath(); x.ellipse(w / 2, y(H), w / 2 + 2, rise, 0, Math.PI, 0); x.clip();
      x.fillStyle = 'rgba(255,255,255,.035)'; for (let h = H + 4; h < H + rise; h += 4) x.fillRect(0, y(h), w, 1);
      x.restore();
      x.strokeStyle = rgba(SHEET, 0.45); x.lineWidth = 1; x.beginPath(); x.ellipse(w / 2, y(H) + 0.5, w / 2 + 1, rise, 0, Math.PI, 0); x.stroke();
      // a roof lantern along the crown, glazed
      const lw = R(w * 0.3), lx = R((w - lw) / 2), lit = grow > 0.15;
      x.fillStyle = '#101014'; x.fillRect(lx, y(H + rise + 8), lw, 9);
      x.fillStyle = lit ? rgba(growCol, 0.4 + 0.4 * g) : '#0a0b0e'; x.fillRect(lx + 2, y(H + rise + 6), lw - 4, 4);
      x.fillStyle = 'rgba(0,0,0,.5)'; for (let k = lx + 8; k < lx + lw - 2; k += 8) x.fillRect(k, y(H + rise + 6), 1, 4);
      x.fillStyle = rgba(SHEET, 0.4); x.fillRect(lx - 1, y(H + rise + 9), lw + 2, 1);
      if (lit) o.light?.(w / 2, H + rise + 4, lw, 6, growCol, 'window');
    } else {
      x.fillStyle = '#0f0e12'; x.fillRect(-1, y(H + rise), w + 2, rise); x.fillStyle = rgba(SHEET, 0.4); x.fillRect(-1, y(H + rise), w + 2, 1);
      if (r() < 0.7) P.roofTank(x, R(w * 0.3), y(H + rise), 18, '#121116');
      if (r() < 0.6) P.acUnit(x, y, R(w * 0.55), H + rise);
    }
    // the wall: corrugated sheet, its sheets' laps, a few replaced panels, rust run down from the gutter
    x.fillStyle = wall; x.fillRect(0, y(H), w, H);
    corrugate(x, 0, w, H, 0, dead ? 0.05 : 0.07);
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, y(R(H * 0.52)), w, 1); x.fillStyle = rgba(SHEET, 0.08); x.fillRect(0, y(R(H * 0.52) - 1), w, 1);
    for (let i = 0; i < Math.round(w / 70); i++) { const px = R(r() * (w - 30)), pw = 15 + R(r() * 6) * 3; x.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.18)'; x.fillRect(px, y(H * 0.52), pw, R(H * 0.48)); }
    for (let i = 0; i < Math.round(w / (dead ? 10 : 22)); i++) { const sx = R(r() * w); x.fillStyle = rgba('140,70,30', dead ? 0.22 : 0.12); x.fillRect(sx, y(H - 2), 2, 6 + R(r() * (dead ? 40 : 20))); }
    if (dead) for (let i = 0; i < Math.max(1, R(w / 90)); i++) {
      // a sheet torn off: the dark inside, the purlins behind
      const px = R(10 + r() * (w - 50)), ph = 20 + R(r() * 18), pb = R(H * 0.52) + R(r() * Math.max(1, H * 0.48 - ph - 4));
      x.fillStyle = '#050506'; x.fillRect(px, y(pb + ph), 18, ph); x.fillStyle = rgba(SHEET, 0.18); x.fillRect(px, y(pb + R(ph / 2)), 18, 1); x.fillRect(px + 9, y(pb + ph), 1, ph);
    }
    // the clerestory under the eave: a strip of narrow windows, violet where the farm's lights run
    const cb = H - 12;
    for (let k = 6, i = 0; k < w - 14; k += 14, i++) {
      const lit = hash(seed * 11 + i * 1.7) < grow;
      x.fillStyle = '#08090b'; x.fillRect(k, y(cb + 7), 11, 7);
      if (lit) { x.fillStyle = rgba(growCol, 0.5 + 0.4 * g); x.fillRect(k + 1, y(cb + 6), 9, 5); x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(k + 1, y(cb + 4), 9, 1); if (i % 2 === 0) o.light?.(k + 6, cb + 3, 22, 6, growCol, 'window'); }
      else if (dead && hash(seed + i * 5) < 0.4) { x.fillStyle = rgba(SHEET, 0.2); x.fillRect(k + 2, y(cb + 6), 1, 4); x.fillRect(k + 4, y(cb + 4), 3, 1); }
      else { x.fillStyle = rgba(SHEET, 0.1); x.fillRect(k + 1, y(cb + 6), 9, 1); }
    }
    // the eave: flashing and a gutter, a downpipe at each end
    x.fillStyle = '#0a0a0c'; x.fillRect(-2, y(H + 1), w + 4, 3); x.fillStyle = rgba(SHEET, 0.55); x.fillRect(-2, y(H + 1), w + 4, 1);
    for (const px of [2, w - 5]) { x.fillStyle = '#0d0d10'; x.fillRect(px, y(H), 3, H); x.fillStyle = rgba(SHEET, 0.2); x.fillRect(px, y(H), 1, H); }
    // roller doors on their docks
    // the right end is kept for the number, its code and the notice (over the personal door's left); doors fill the rest
    const label = String(p.number ?? ''), notice = String(p.notice ?? ''), size = Math.min(36, Math.max(14, R(H * 0.36))), hasCode = p.code !== false && !!label;
    const textW = label ? Math.ceil([...label].length * size * 0.62) : 0, numW = textW + (hasCode ? 28 : 0), noticeW = notice ? R([...notice].length * 7 * 0.64 + 12) : 0;
    const block = Math.max(numW, noticeW), ncx = R(w - 34 - block / 2), reserve = block ? ncx - block / 2 - 8 : w - 34, nch = R(H * 0.58);
    const dock = p.docks === false ? 0 : 12, dw = 42, dh = Math.max(30, Math.min(H - dock - 22, 54)), nd = Number(p.doors), doorXs: number[] = [];
    for (let i = 0; i < nd; i++) { const dx = 14 + i * (dw + 18); if (dx + dw + 10 > reserve && i > 0) break; doorXs.push(dx); }
    doorXs.forEach((dx, i) => {
      const open = !dead && hash(seed * 7 + i * 3.1) < Number(p.open), farm = hash(seed * 5 + i) < grow, bottom = dock;
      x.fillStyle = '#0a0a0c'; x.fillRect(dx - 3, y(bottom + dh + 4), dw + 6, dh + 4);
      x.fillStyle = rgba(SHEET, 0.35); x.fillRect(dx - 3, y(bottom + dh + 4), dw + 6, 1);
      const roll = open ? R(dh * (0.55 + 0.3 * hash(seed + i * 9))) : 0, shut = dh - roll;
      if (open) {
        const col = farm ? growCol : AMBER;
        x.fillStyle = rgba(col, farm ? 0.28 + 0.15 * g : 0.24 + 0.12 * g); x.fillRect(dx, y(bottom + roll), dw, roll);
        if (farm) {
          // racks of trays going back into the hall, each under its own light bar
          for (let sh = bottom + 4; sh < bottom + roll - 4; sh += 9) {
            x.fillStyle = '#100c16'; x.fillRect(dx + 2, y(sh), dw - 4, 2);
            x.fillStyle = 'rgba(120,200,100,.75)'; for (let k = dx + 3; k < dx + dw - 3; k += 3) x.fillRect(k, y(sh + 2 + (k % 2)), 2, 1 + (k % 2));
            x.fillStyle = rgba(col, 0.85); x.fillRect(dx + 2, y(sh + 7), dw - 4, 1);
          }
        } else {
          // pallets and a racked wall of boxes, a robot arm parked over them
          x.fillStyle = '#1a120a'; x.fillRect(dx + 4, y(bottom + 14), 14, 12); x.fillRect(dx + 22, y(bottom + 10), 12, 8);
          x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(dx + 4, y(bottom + 8), 14, 1); x.fillRect(dx + 4, y(bottom + 3), 30, 2);
          x.fillStyle = '#120d08'; x.fillRect(dx + dw - 8, y(bottom + roll - 2), 2, roll - 16); x.fillRect(dx + dw - 18, y(bottom + roll - 2), 12, 2);
        }
        o.light?.(dx + dw / 2, bottom + roll / 2, dw - 4, roll, col, 'window');
      }
      // the shutter: its slats, the rolled-up part shown as a deeper drum at the top
      x.fillStyle = '#1b1a1f'; x.fillRect(dx, y(bottom + dh), dw, shut);
      x.fillStyle = 'rgba(0,0,0,.45)'; for (let k = 3; k < shut; k += 3) x.fillRect(dx, y(bottom + dh) + k, dw, 1);
      x.fillStyle = rgba(SHEET, 0.18); for (let k = 2; k < shut; k += 3) x.fillRect(dx, y(bottom + dh) + k, dw, 1);
      x.fillStyle = '#0e0d11'; x.fillRect(dx - 2, y(bottom + dh + 4), dw + 4, 5);
      if (shut > 4) { x.fillStyle = '#101013'; x.fillRect(dx, y(bottom + roll) - 2, dw, 2); }
      if (p.hazard !== false) hazard(x, dx, dw, bottom + roll, 3, open ? 0.85 : 0.6);
      // the status lamp beside the door: amber running, red shut, nothing when the place is dead
      if (!dead) { const c = open ? AMBER : RED, blink = open ? Math.floor((o.t + i * 40) / 30) % 2 === 0 : true; x.fillStyle = '#0a0a0c'; x.fillRect(dx + dw + 4, y(bottom + dh - 2), 4, 6); if (blink) { x.fillStyle = rgba(c, 0.9); x.fillRect(dx + dw + 5, y(bottom + dh - 3), 2, 2); o.light?.(dx + dw + 6, bottom + dh - 4, 4, 4, c, 'screen'); } }
      if (dock) {
        // the dock: a concrete block with bumpers, its edge striped
        x.fillStyle = '#1d1c20'; x.fillRect(dx - 6, y(dock), dw + 12, dock); x.fillStyle = rgba(SHEET, 0.5); x.fillRect(dx - 6, y(dock), dw + 12, 1);
        x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(dx - 6, y(4), dw + 12, 1);
        if (p.hazard !== false) hazard(x, dx - 6, dw + 12, dock - 4, 3, 0.7);
        x.fillStyle = '#060607'; x.fillRect(dx - 4, y(dock - 1), 3, 6); x.fillRect(dx + dw + 1, y(dock - 1), 3, 6);
      }
      if (p.hazard !== false) for (const bx of [dx - 10, dx + dw + 8]) {
        // a bollard at each side of the door, striped
        x.fillStyle = '#121110'; x.fillRect(bx, y(16), 3, 16); x.fillStyle = rgba('216,160,58', 0.85); for (let k = 2; k < 16; k += 5) x.fillRect(bx, y(16 - k), 3, 2);
      }
    });
    // the personal door at the far end, its caged lamp, a control-room window above it
    const pd = w - 26;
    x.fillStyle = '#0b0b0d'; x.fillRect(pd - 1, y(31), 16, 31); x.fillStyle = '#1e1d22'; x.fillRect(pd, y(30), 14, 30);
    x.fillStyle = rgba(SHEET, 0.3); x.fillRect(pd, y(30), 14, 1); x.fillRect(pd + 11, y(16), 2, 1);
    if (!dead) { x.fillStyle = rgba(PALE, 0.4 + 0.5 * g); x.fillRect(pd + 5, y(37), 4, 3); x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(pd + 6, y(37), 1, 3); o.light?.(pd + 7, 35, 8, 6, PALE, 'screen'); }
    if (H > 70) {
      const ww = 20, wh = 9, wb = Math.min(H - 30, 46), lit = !dead && windowLit(seed * 13 + 7, o.lighting);
      x.fillStyle = lit ? rgba(AMBER, 0.6) : '#08090b'; x.fillRect(pd - 4, y(wb + wh), ww, wh);
      x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(pd + 6, y(wb + wh), 1, wh); x.fillStyle = rgba(SHEET, 0.3); x.fillRect(pd - 5, y(wb - 1), ww + 2, 1);
      if (lit) o.light?.(pd + 6, wb + wh / 2, ww, wh, AMBER, 'window');
    }
    // the number, big and stencilled, a code and a barcode beside it; under it a printed notice plate
    if (label) {
      const left = ncx - numW / 2;
      stencil(x, label, left + (hasCode ? 28 : 0) + textW / 2, nch, size, rgba(PAINT, dead ? 0.28 : 0.55), wall);
      if (hasCode) { machineCode(x, R(left), nch + 9, 9, 2, seed * 3 + 1, dead ? 0.4 : 0.8); barcode(x, R(left), nch - 13, 18, 5, seed, dead ? 0.35 : 0.7); }
    }
    if (notice) neonPlate(x, o.t, ncx, R(y(Math.min(22, nch - size / 2 - 10))), { text: notice, col: PAINT, size: 7, h: 11, printed: true, bolts: true, ink: rgba('20,18,16', 0.95), fill: dead ? '#6a665c' : '#b8b2a2' } as Parameters<typeof neonPlate>[4]);
    // floodlights on brackets just under the clerestory
    const nf = Number(p.floods);
    for (let i = 0; i < nf; i++) { const fx = R(w * (i + 0.5) / nf), dir: 1 | -1 = i % 2 === 0 ? 1 : -1; flood(x, o, fx, cb - 3, dir, !dead && hash(seed * 19 + i) > 0.1); }
    if (p.hazard !== false) { hazard(x, 0, 4, 0, 30, 0.7); hazard(x, w - 4, 4, 0, 30, 0.7); }
    dust(x, -6, w + 6, Number(p.dust) * (dead ? 1.3 : 1), seed);
  },
});

// ---------------------------------------------------------------- the data cemetery

const RACK_BODY = ['#17161b', '#141318', '#111015', '#0f0e13', '#0d0c11'];
const LED = ['90,230,130', AMBER, '90,230,130', '120,190,255'];

export const dataCemeteryElement = piece({
  type: 'landmark.data-cemetery', label: 'The data cemetery (landmark, Fringe)', category: 'architecture',
  fields: {
    width: num('Width', 520, 400, 1600, 1, 'units'), terraces: num('Terraces of racks', 3, 1, 5), blinking: num('Racks still blinking (share)', 0.22, 0, 1, 0.01),
    piles: num('Piles of drives (share of the gaps)', 0.4, 0, 1, 0.05), memorials: num('Memorial racks (candles, photos)', 3, 0, 12),
    crane: bool('Gantry crane moving racks', true), cycle: num('Crane cycle', 2400, 600, 12000, 10, 'frames'), towers: num('Cooling towers behind', 2, 0, 3), steam: bool('Towers steaming', true),
    masts: num('Flood masts', 2, 0, 6), fence: bool('Fence along the front', true), gate: num('Gate from the left (share of the width)', 0.43, 0, 0.9, 0.01), gateOpen: bool('Gate standing open', true),
    sign: text('Gate sign', 'YARD 7'), notice: text('Notice on the gate (empty: none)', 'DECOMMISSIONED MEDIA'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: 330 }),
  bounds: p => ({ x: -6, h: 330, w: Number(p.width) + 12, tall: 330 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, gate: { x: R(Number(p.width) * Number(p.gate)) + 36, h: 0, role: 'entrance' } }),
  paint(x, p, o) {
    const w = R(Number(p.width)), n = Number(p.terraces), seed = Number(p.seed), g = glowOf(o.lighting), t = o.t;
    const gw = 72, gx = Math.min(w - gw - 8, R(w * Number(p.gate))), step = 34, rackH = 42;
    // cooling towers behind the yard, one or two still breathing
    const nt = Number(p.towers);
    for (let i = 0; i < nt; i++) {
      const cx = R(w * (nt === 1 ? 0.78 : nt === 2 ? 0.7 + i * 0.18 : 0.52 + i * 0.18)), th = 230 - i * 24, wb = 92 - i * 6, waist = 54 - i * 4, top = 62 - i * 4, base = (n - 1) * step;
      x.fillStyle = '#0f0e13'; x.beginPath(); x.moveTo(cx - wb / 2, y(base));
      x.quadraticCurveTo(cx - waist / 2 - 4, y(base + th * 0.62), cx - top / 2, y(base + th)); x.lineTo(cx + top / 2, y(base + th));
      x.quadraticCurveTo(cx + waist / 2 + 4, y(base + th * 0.62), cx + wb / 2, y(base)); x.closePath(); x.fill();
      x.save(); x.clip();
      x.fillStyle = rgba(SHEET, 0.1); x.fillRect(R(cx - wb / 2), y(base + th), 6, th);
      x.fillStyle = 'rgba(0,0,0,.25)'; for (let k = 0; k < 8; k++) x.fillRect(R(cx - wb / 2 + hash(seed + k + i * 9) * wb), y(base + th), 2, R(20 + hash(seed + k * 3) * 60));
      x.fillStyle = rgba(SHEET, 0.12); x.fillRect(R(cx - wb / 2), y(base + th - 8), wb, 1); x.fillRect(R(cx - wb / 2), y(base + 24), wb, 1);
      x.restore();
      x.strokeStyle = rgba(SHEET, 0.3); x.lineWidth = 1; x.beginPath(); x.moveTo(cx - wb / 2 + 0.5, y(base)); x.quadraticCurveTo(cx - waist / 2 - 3.5, y(base + th * 0.62), cx - top / 2 + 0.5, y(base + th)); x.lineTo(cx + top / 2, y(base + th)); x.stroke();
      if (Math.floor((t + i * 70) / 50) % 3 !== 0) for (const dx of [-top / 2 + 2, top / 2 - 4]) { x.fillStyle = rgba(RED, 0.9); x.fillRect(R(cx + dx), y(base + th + 2), 2, 2); o.light?.(cx + dx, base + th + 1, 4, 4, RED, 'screen'); }
      if (p.steam !== false && (i === 0 || hash(seed + i) < 0.5)) for (let k = 0; k < 9; k++) {
        const rise = (t * 0.12 + k * 26 + i * 40) % 230, rr = top * 0.32 + rise * 0.22, a = 0.13 * (1 - rise / 230) * (0.6 + 0.4 * (1 - g * 0.5));
        x.fillStyle = 'rgba(196,194,204,' + a.toFixed(3) + ')'; x.beginPath(); x.arc(cx + Math.sin(k * 1.7 + i) * top * 0.18 + rise * 0.35, y(base + th + 6 + rise), rr, 0, Math.PI * 2); x.fill();
      }
    }
    // the gantry crane's legs and rails stand behind the racks; its girder spans the yard over them
    const G = Math.max(158, (n - 1) * step + rackH + 70), lx = 12, rx = w - 14;
    if (p.crane !== false) for (const cx of [lx, rx]) {
      x.strokeStyle = '#1b1a21'; x.lineWidth = 4; x.beginPath(); x.moveTo(cx - 12, 0); x.lineTo(cx, y(G)); x.lineTo(cx + 12, 0); x.stroke();
      x.lineWidth = 1; x.strokeStyle = rgba(SHEET, 0.35); x.beginPath(); x.moveTo(cx - 12.5, 0); x.lineTo(cx - 0.5, y(G)); x.stroke();
      x.strokeStyle = '#18171d'; for (let h = 24; h < G - 10; h += 28) { const a = 12 * (1 - h / G), b = 12 * (1 - (h + 28) / G); x.beginPath(); x.moveTo(cx - a, y(h)); x.lineTo(cx + b, y(h + 28)); x.moveTo(cx + a, y(h)); x.lineTo(cx - b, y(h + 28)); x.stroke(); }
      x.fillStyle = '#0c0c0f'; x.fillRect(cx - 16, -4, 32, 4); x.fillStyle = '#25242b'; x.fillRect(cx - 12, -6, 8, 4); x.fillRect(cx + 4, -6, 8, 4);
    }
    // terraces, back to front: a retaining wall, racks standing on it, gaps with piles of drives
    let memorialsLeft = Number(p.memorials);
    for (let i = n - 1; i >= 0; i--) {
      const b = i * step, x0 = 18 + i * 8, x1 = w - 18 - i * 8, body = RACK_BODY[Math.min(i, RACK_BODY.length - 1)], la = 1 - 0.17 * i;
      if (i > 0) {
        x.fillStyle = '#19181c'; x.fillRect(x0 - 6, y(b), x1 - x0 + 12, b);
        x.fillStyle = 'rgba(0,0,0,.25)'; for (let h = 8; h < b; h += 8) x.fillRect(x0 - 6, y(h), x1 - x0 + 12, 1);
        for (let k = x0; k < x1; k += 24) x.fillRect(k, y(b), 1, b);
        x.fillStyle = rgba(SHEET, 0.4); x.fillRect(x0 - 6, y(b), x1 - x0 + 12, 1);
        // steps up through the terrace in line with the gate
        const sx = gx + 18, sw = gw - 36;
        x.fillStyle = '#121115'; x.fillRect(sx, y(b), sw, b - (i - 1) * step);
        for (let h = (i - 1) * step + 4; h <= b; h += 5) { x.fillStyle = rgba(SHEET, 0.22); x.fillRect(sx, y(h), sw, 1); }
      }
      for (let k = x0, j = 0; k < x1 - 12; j++) {
        const s = seed * 977 + i * 131 + j * 7, rw = 14 + R(hash(s) * 6), rh = rackH - 4 + R(hash(s + 1) * 6), q = hash(s + 2);
        // keep the gate's aisle clear on the front terrace, and the steps clear further back
        if (k + rw > gx + (i === 0 ? 4 : 16) && k < gx + gw - (i === 0 ? 4 : 16)) { k = gx + gw - (i === 0 ? 4 : 16); continue; }
        if (q < 0.18) {
          const pw = Math.min(rw + 8, x1 - k);
          if (hash(s + 3) < Number(p.piles) * 2.2) {
            // a heap of drives: little grey bricks, a few with a label
            for (let row = 0; row < 5; row++) for (let c = 0; c < Math.floor((pw - row * 3) / 5); c++) {
              const hx = k + 1 + row * 1.5 + c * 5, hs = s + row * 13 + c;
              x.fillStyle = ['#2a2a30', '#232228', '#34333a', '#1c1b20'][Math.floor(hash(hs) * 4)]; x.fillRect(R(hx), y(b + row * 3 + 3), 4, 3);
              if (hash(hs + 1) < 0.12) { x.fillStyle = rgba(PAINT, 0.5 * la); x.fillRect(R(hx) + 1, y(b + row * 3 + 2), 2, 1); }
            }
          }
          k += pw + 2; continue;
        }
        const tilt = hash(s + 4) < 0.1 ? (hash(s + 5) < 0.5 ? -0.07 : 0.07) : 0, alive = hash(s + 6) < Number(p.blinking);
        x.save(); x.translate(k + rw / 2, y(b)); if (tilt) x.rotate(tilt); x.translate(-(k + rw / 2), -y(b));
        x.fillStyle = body; x.fillRect(k, y(b + rh), rw, rh);
        x.fillStyle = rgba(SHEET, 0.32 * la); x.fillRect(k, y(b + rh), 1, rh); x.fillRect(k, y(b + rh), rw, 1);
        x.fillStyle = '#060608'; x.fillRect(k + 1, y(b + 2), rw - 2, 2);
        for (let h = b + 5, row = 0; h < b + rh - 4; h += 4, row++) {
          const empty = hash(s + row * 3.7) < 0.28;
          x.fillStyle = empty ? '#050506' : rgba(SHEET, 0.13 * la); x.fillRect(k + 2, y(h + 3), rw - 4, 3);
          if (!empty) { x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(k + 2, y(h + 1), rw - 4, 1); }
          if (alive && !empty) {
            const ph = hash(s + row), period = 20 + R(ph * 60), on = hash(Math.floor((t + ph * 500) / period) + s + row) < 0.55;
            if (on) { x.fillStyle = rgba(LED[(row + j) % LED.length], 0.9 * la); x.fillRect(k + rw - 4, y(h + 2), 1, 1); }
          } else if (!empty && hash(s + row * 9) < 0.05) { x.fillStyle = rgba(RED, 0.35 * la); x.fillRect(k + rw - 4, y(h + 2), 1, 1); }
        }
        x.fillStyle = rgba(PAINT, 0.45 * la); x.fillRect(k + 3, y(b + rh - 2), 4, 2);
        if (hash(s + 7) < 0.25) { x.strokeStyle = 'rgba(0,0,0,.85)'; x.beginPath(); x.moveTo(k + rw - 2, y(b + rh - 3)); x.quadraticCurveTo(k + rw + 4, y(b + rh * 0.4), k + rw + 1, y(b)); x.stroke(); }
        x.restore();
        if (alive && i <= 1) o.light?.(k + rw - 4, b + rh / 2, 4, rh - 8, '90,230,130', 'screen');
        // a memorial: a photo taped to the door, a candle and flowers at its foot
        if (i === 0 && memorialsLeft > 0 && !tilt && hash(s + 8) < 0.45) {
          memorialsLeft--;
          x.fillStyle = rgba(PAINT, 0.75); x.fillRect(k + R(rw / 2) - 2, y(b + 26), 5, 6); x.fillStyle = 'rgba(40,34,30,.8)'; x.fillRect(k + R(rw / 2) - 1, y(b + 24), 3, 3);
          x.fillStyle = '#2a4a26'; x.fillRect(k + 2, y(b + 5), 1, 5); x.fillRect(k + 5, y(b + 6), 1, 6);
          x.fillStyle = 'rgba(200,60,60,.85)'; x.fillRect(k + 1, y(b + 7), 2, 2); x.fillStyle = 'rgba(230,220,200,.8)'; x.fillRect(k + 5, y(b + 8), 2, 2);
          const fl = 0.65 + 0.35 * Math.sin(t / 5 + s) * Math.sin(t / 13 + j);
          x.fillStyle = rgba(PAINT, 0.8); x.fillRect(k + rw - 5, y(b + 4), 2, 4); x.fillStyle = 'rgba(255,200,110,' + fl.toFixed(3) + ')'; x.fillRect(k + rw - 5, y(b + 6), 2, 2);
          o.light?.(k + rw - 4, b + 5, 4, 4, '255,190,110', 'screen');
        }
        k += rw + 2 + R(hash(s + 9) * 4);
      }
    }
    // the girder and its trolley: picks a rack up, carries it along, sets it down, goes back
    if (p.crane !== false) {
      x.fillStyle = '#1b1a21'; x.fillRect(lx - 8, y(G + 12), rx - lx + 16, 12);
      x.strokeStyle = rgba(SHEET, 0.3); x.lineWidth = 1; for (let k = lx; k < rx - 10; k += 14) { x.beginPath(); x.moveTo(k + 0.5, y(G + 1)); x.lineTo(k + 7.5, y(G + 11)); x.lineTo(k + 14.5, y(G + 1)); x.stroke(); }
      x.fillStyle = rgba(SHEET, 0.5); x.fillRect(lx - 8, y(G + 12), rx - lx + 16, 1); x.fillStyle = '#0a0a0c'; x.fillRect(lx - 8, y(G), rx - lx + 16, 1);
      hazard(x, lx - 8, 14, G + 2, 8, 0.8); hazard(x, rx - 6, 14, G + 2, 8, 0.8);
      const ph = ((t + seed * 131) % Number(p.cycle)) / Number(p.cycle), ease = (k: number) => k * k * (3 - 2 * k), seg = (a: number, b2: number) => ease(Math.min(1, Math.max(0, (ph - a) / (b2 - a))));
      const A = R(w * 0.2), B = R(w * 0.66), top = G - 16, low = step + rackH + 4;
      const tx = ph < 0.22 ? A : ph < 0.5 ? A + (B - A) * seg(0.22, 0.5) : ph < 0.72 ? B : B + (A - B) * seg(0.72, 1);
      const hook = ph < 0.12 ? top - (top - low) * seg(0, 0.12) : ph < 0.22 ? low + (top - low) * seg(0.12, 0.22) : ph < 0.5 ? top : ph < 0.62 ? top - (top - low) * seg(0.5, 0.62) : ph < 0.72 ? low + (top - low) * seg(0.62, 0.72) : top;
      const carrying = ph >= 0.12 && ph < 0.62, moving = (ph >= 0.22 && ph < 0.5) || ph >= 0.72;
      const T = R(tx);
      x.fillStyle = '#26252c'; x.fillRect(T - 11, y(G), 22, 9); x.fillStyle = rgba(SHEET, 0.45); x.fillRect(T - 11, y(G), 22, 1);
      x.fillStyle = '#0a0a0c'; x.fillRect(T - 9, y(G - 9), 4, 3); x.fillRect(T + 5, y(G - 9), 4, 3);
      if (!moving || Math.floor(t / 14) % 2 === 0) { x.fillStyle = rgba(AMBER, 0.95); x.fillRect(T - 1, y(G + 15), 3, 3); o.light?.(T, G + 14, 6, 4, AMBER, 'screen'); }
      x.fillStyle = 'rgba(0,0,0,.85)'; x.fillRect(T - 6, y(G - 9), 1, R(G - 9 - hook)); x.fillRect(T + 5, y(G - 9), 1, R(G - 9 - hook));
      x.fillStyle = '#1e1d23'; x.fillRect(T - 10, y(hook + 1), 20, 3); x.fillStyle = rgba('216,160,58', 0.8); x.fillRect(T - 10, y(hook + 1), 4, 3); x.fillRect(T + 6, y(hook + 1), 4, 3);
      if (carrying) {
        const cw = 16, ch = rackH - 2;
        x.fillStyle = '#18171c'; x.fillRect(T - cw / 2, y(hook - 2), cw, ch); x.fillStyle = rgba(SHEET, 0.35); x.fillRect(T - cw / 2, y(hook - 2), 1, ch); x.fillRect(T - cw / 2, y(hook - 2), cw, 1);
        x.fillStyle = rgba(SHEET, 0.12); for (let h = 5; h < ch - 3; h += 4) x.fillRect(T - cw / 2 + 2, y(hook - 2) + h, cw - 4, 3);
        x.fillStyle = rgba(PAINT, 0.5); x.fillRect(T - cw / 2 + 3, y(hook - 4), 4, 2);
      }
    }
    // flood masts over the yard
    const nm = Number(p.masts);
    for (let i = 0; i < nm; i++) {
      let mx = R(w * (i + 1) / (nm + 1)); if (mx > gx - 10 && mx < gx + gw + 10) mx = gx - 14;
      const mh = 150, on = windowLit(seed * 7 + i, o.lighting) || o.lighting.lamps > 0.3;
      x.fillStyle = '#121116'; x.fillRect(mx - 1, y(mh), 3, mh); x.fillStyle = rgba(SHEET, 0.3); x.fillRect(mx - 1, y(mh), 1, mh);
      x.fillStyle = '#1c1b21'; x.fillRect(mx - 10, y(mh + 2), 21, 3);
      for (const dx of [-9, -3, 3]) {
        x.fillStyle = '#1e1d22'; x.fillRect(mx + dx, y(mh + 8), 6, 6);
        x.fillStyle = on ? rgba(PALE, 0.5 + 0.5 * g) : '#0a0a0c'; x.fillRect(mx + dx + 1, y(mh + 3), 4, 1);
      }
      if (on) {
        const cone = x.createLinearGradient(0, y(mh), 0, 0); cone.addColorStop(0, rgba(PALE, 0.12 * g)); cone.addColorStop(1, rgba(PALE, 0.025 * g));
        x.fillStyle = cone; x.beginPath(); x.moveTo(mx - 9, y(mh)); x.lineTo(mx + 11, y(mh)); x.lineTo(mx + 60, 0); x.lineTo(mx - 58, 0); x.closePath(); x.fill();
        o.light?.(mx + 1, mh + 4, 20, 6, PALE, 'screen');
      }
    }
    // the fence: posts, chain-link, a coil of razor wire; the gate with its sign
    if (p.fence !== false) {
      const fh = 46;
      x.save(); x.beginPath(); x.rect(0, y(fh), gx, fh); x.rect(gx + gw, y(fh), w - gx - gw, fh); x.clip();
      x.strokeStyle = rgba(SHEET, 0.17); x.lineWidth = 1; x.beginPath();
      for (let k = -fh; k < w + fh; k += 6) { x.moveTo(k + 0.5, 0); x.lineTo(k + fh + 0.5, y(fh)); x.moveTo(k + fh + 0.5, 0); x.lineTo(k + 0.5, y(fh)); }
      x.stroke(); x.restore();
      x.fillStyle = rgba(SHEET, 0.55); x.fillRect(0, y(fh), gx, 1); x.fillRect(gx + gw, y(fh), w - gx - gw, 1); x.fillRect(0, y(3), gx, 1); x.fillRect(gx + gw, y(3), w - gx - gw, 1);
      for (let k = 0; k <= w; k += 36) { if (k > gx - 6 && k < gx + gw + 6) continue; x.fillStyle = '#26252b'; x.fillRect(k, y(fh + 6), 2, fh + 6); x.fillStyle = rgba(SHEET, 0.5); x.fillRect(k, y(fh + 6), 1, fh + 6); }
      x.strokeStyle = rgba(SHEET, 0.38); x.beginPath();
      for (let k = 3; k < w - 2; k += 6) { if (k > gx - 3 && k < gx + gw + 3) continue; x.moveTo(k + 3, y(fh + 4)); x.arc(k, y(fh + 4), 3, 0, Math.PI * 2); }
      x.stroke();
      // the gate: two heavy posts, a beam over them, the sign on the beam, leaves of mesh
      const gl = gx, gr = gx + gw, beam = 70;
      x.fillStyle = '#1e1d23'; x.fillRect(gl - 4, y(beam + 4), 5, beam + 4); x.fillRect(gr - 1, y(beam + 4), 5, beam + 4); x.fillRect(gl - 4, y(beam + 4), gw + 8, 5);
      x.fillStyle = rgba(SHEET, 0.55); x.fillRect(gl - 4, y(beam + 4), 1, beam + 4); x.fillRect(gr - 1, y(beam + 4), 1, beam + 4); x.fillRect(gl - 4, y(beam + 4), gw + 8, 1);
      hazard(x, gl - 4, 5, 0, 26, 0.85); hazard(x, gr - 1, 5, 0, 26, 0.85);
      const leaf = (l: number, lw: number) => {
        x.save(); x.beginPath(); x.rect(l, y(fh), lw, fh); x.clip();
        x.strokeStyle = rgba(SHEET, 0.22); x.beginPath(); for (let k = l - fh; k < l + lw + fh; k += 6) { x.moveTo(k + 0.5, 0); x.lineTo(k + fh + 0.5, y(fh)); x.moveTo(k + fh + 0.5, 0); x.lineTo(k + 0.5, y(fh)); } x.stroke(); x.restore();
        x.strokeStyle = rgba(SHEET, 0.6); x.strokeRect(l + 0.5, y(fh) + 0.5, lw - 1, fh - 2);
      };
      if (p.gateOpen !== false) { leaf(gl + 1, 10); leaf(gr - 11, 10); }
      else { leaf(gl + 1, gw / 2 - 1); leaf(gl + gw / 2, gw / 2 - 1); x.fillStyle = '#0c0c0e'; x.fillRect(gl + gw / 2 - 3, y(26), 6, 4); x.fillStyle = rgba(SHEET, 0.6); x.fillRect(gl + gw / 2 - 1, y(28), 2, 3); }
      // the sign plate on the beam: a code and the yard's name, lit by a lamp on the beam
      const sign = String(p.sign ?? ''), sw = Math.max(44, R([...sign].length * 7.2 + 40)), sl = R(gl + gw / 2 - sw / 2), sb = beam + 6, sh = 24;
      if (sign) {
        x.fillStyle = '#0a0a0c'; x.fillRect(sl + 6, y(sb + 2), 2, 4); x.fillRect(sl + sw - 8, y(sb + 2), 2, 4);
        x.fillStyle = '#121115'; x.fillRect(sl, y(sb + sh + 2), sw, sh); x.strokeStyle = rgba(SHEET, 0.65); x.strokeRect(sl + 0.5, y(sb + sh + 2) + 0.5, sw - 1, sh - 1);
        machineCode(x, sl + 4, sb + sh - 1, 9, 2, seed * 5 + 3, 0.85);
        x.save(); x.font = mono(10, '700'); x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillStyle = rgba(PAINT, 0.9); x.fillText(sign, sl + 28, R(y(sb + 2 + sh / 2))); x.restore();
        x.fillStyle = '#1e1d22'; x.fillRect(R(gl + gw / 2) - 3, y(sb + sh + 8), 6, 4); x.fillStyle = rgba(PALE, 0.5 + 0.5 * g); x.fillRect(R(gl + gw / 2) - 2, y(sb + sh + 4), 4, 1);
        o.light?.(gl + gw / 2, sb + sh / 2, sw, sh, PALE, 'screen');
      }
      const notice = String(p.notice ?? '');
      if (notice) {
        const nw = R([...notice].length * 4.6 + 10), nl = R(gl - 6 - nw), ntop = 34;
        x.fillStyle = '#0a0a0c'; x.fillRect(nl + 3, y(ntop), 1, ntop); x.fillRect(nl + nw - 4, y(ntop), 1, ntop);
        x.fillStyle = '#c8c2b2'; x.fillRect(nl, y(ntop + 12), nw, 12); x.fillStyle = rgba(RED, 0.85); x.fillRect(nl, y(ntop + 12), nw, 3);
        x.save(); x.font = mono(7, '600'); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(20,18,16,.95)'; x.fillText(notice, nl + nw / 2, R(y(ntop + 4))); x.restore();
      }
      // a camera on the right gate post, its red light
      x.fillStyle = '#1e1d22'; x.fillRect(gr + 4, y(beam - 6), 10, 5); x.fillRect(gr + 3, y(beam - 4), 2, 4);
      if (Math.floor((t + seed) / 60) % 2 === 0) { x.fillStyle = rgba(RED, 0.9); x.fillRect(gr + 12, y(beam - 8), 1, 1); }
    }
    dust(x, -6, w + 6, 0.7, seed);
  },
});

// ---------------------------------------------------------------- the far Fringe: solar fields, sheds, stacks, pylons

const mixHex = (a: string, b: string, k: number) => '#' + [1, 3, 5].map(i => R(parseInt(a.slice(i, i + 2), 16) * (1 - k) + parseInt(b.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');

export const solarFieldElement = piece({
  type: 'environment.solar-field', label: 'Fringe distance: solar fields, sheds, stacks (kit; set its depth with the placement parallax)', category: 'environment', libraryUse: 'reusable',
  fields: {
    width: num('Length', 1600, 100, 20000, 10, 'units'), form: select('Shows', ['solar', 'sheds', 'mixed']), rise: num('Ground rise (the plateau it stands on)', 70, 0, 400, 1, 'units'),
    rows: num('Rows of panels', 4, 1, 8), stacks: num('Stacks, pylons and masts', 0.5, 0, 1, 0.05), lit: num('Lit windows and warning lights', 0.4, 0, 1, 0.05),
    haze: num('Haze (distance)', 0.5, 0, 1, 0.05), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.rise) + 160 }),
  bounds: p => ({ x: 0, h: Number(p.rise) + 160, w: Number(p.width), tall: Number(p.rise) + 160 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, top: { x: Number(p.width) / 2, h: Number(p.rise), role: 'surface' } }),
  paint(x, p, o) {
    const w = R(Number(p.width)), rise = R(Number(p.rise)), haze = Number(p.haze), seed = Number(p.seed), form = String(p.form), r = rng(seed * 811 + 5);
    const a = 1 - haze * 0.6, fill = mixHex('#0b0a0e', '#24222e', haze), dark = mixHex('#07070a', '#1c1a25', haze), lit = Number(p.lit), day = o.lighting.daylight;
    // the plateau: a dusty embankment, strata in it
    if (rise > 0) {
      x.fillStyle = fill; x.fillRect(0, y(rise), w, rise);
      x.fillStyle = rgba('150,138,118', 0.05 * a); for (let h = 6; h < rise; h += 7) x.fillRect(0, y(h), w, 1);
      x.fillStyle = rgba(SHEET, 0.18 * a); x.fillRect(0, y(rise), w, 1);
    }
    const solarAt = (k: number) => form === 'solar' || (form === 'mixed' && Math.floor((k + seed * 37) / 320) % 2 === 0);
    // sheds and stacks on the plateau
    if (form !== 'solar') {
      for (let k = R(r() * 30); k < w;) {
        const sw = 70 + R(r() * 140), sh = 14 + R(r() * 22), gap = 20 + R(r() * 70), saw = r() < 0.5, s = seed * 53 + k;
        if (!solarAt(k) || form === 'sheds') {
          x.fillStyle = dark; x.fillRect(k, y(rise + sh), sw, sh);
          if (saw) for (let q = k; q < k + sw - 8; q += 12) { x.beginPath(); x.moveTo(q, y(rise + sh)); x.lineTo(q, y(rise + sh + 6)); x.lineTo(q + 12, y(rise + sh)); x.closePath(); x.fill(); if (hash(s + q) < lit && windowLit(s + q, o.lighting)) { x.fillStyle = rgba(VIOLET, 0.55 * a); x.fillRect(q, y(rise + sh + 5), 1, 4); x.fillStyle = dark; } }
          else { x.beginPath(); x.ellipse(k + sw / 2, y(rise + sh), sw / 2, Math.min(10, sw * 0.08), 0, Math.PI, 0); x.fill(); }
          for (let q = k + 4; q < k + sw - 4; q += 5) if (hash(s + q * 0.7) < lit * 0.5 && windowLit(s + q * 3, o.lighting)) { x.fillStyle = rgba(hash(s + q) < 0.5 ? VIOLET : AMBER, 0.5 * a); x.fillRect(q, y(rise + sh - 4), 2, 1); }
          if (hash(s) < Number(p.stacks)) {
            const cx = k + R(sw * (0.2 + 0.6 * hash(s + 1))), ch = 40 + R(hash(s + 2) * 70);
            x.fillStyle = dark; x.fillRect(cx, y(rise + sh + ch), 4, ch);
            if (Math.floor((o.t + s * 7) / 45) % 3 !== 0) { x.fillStyle = rgba(RED, 0.8 * a); x.fillRect(cx + 1, y(rise + sh + ch + 2), 2, 2); }
            for (let m = 0; m < 4; m++) { const up = (o.t * 0.15 + m * 20 + s) % 70; x.fillStyle = 'rgba(180,176,170,' + (0.07 * a * (1 - up / 70)).toFixed(3) + ')'; x.beginPath(); x.arc(cx + 2 + up * 0.3, y(rise + sh + ch + 4 + up), 3 + up * 0.12, 0, Math.PI * 2); x.fill(); }
          }
        }
        k += sw + gap;
      }
    }
    // solar panels: rows rising into the distance, each row a little smaller; they catch the sky by day
    if (form !== 'sheds') for (let row = Number(p.rows) - 1; row >= 0; row--) {
      const base = rise + 2 + row * 5, ph = Math.max(2, 6 - Math.floor(row * 0.6)), pw = Math.max(6, 14 - row), gap = 2;
      for (let k = R((row % 2) * pw / 2); k < w - pw; k += pw + gap) {
        if (!solarAt(k)) continue;
        x.fillStyle = dark; x.fillRect(k + R(pw / 2), y(base + 2), 1, 2);
        x.fillStyle = mixHex('#121a28', '#2a3040', haze); x.beginPath(); x.moveTo(k, y(base + 2)); x.lineTo(k + pw, y(base + 2)); x.lineTo(k + pw - 2, y(base + 2 + ph)); x.lineTo(k + 2, y(base + 2 + ph)); x.closePath(); x.fill();
        x.fillStyle = rgba('170,190,220', (0.12 + 0.35 * day) * a); x.fillRect(k + 2, y(base + 2 + ph), pw - 4, 1);
        const glint = hash(k * 0.13 + row * 7 + seed) < 0.04 && Math.sin(o.t / 90 + k * 0.05) > 0.7;
        if (glint && day > 0.3) { x.fillStyle = rgba('255,250,235', 0.6 * a * day); x.fillRect(k + R(pw / 2) - 1, y(base + 2 + ph), 3, 1); }
      }
    }
    // pylons striding across, wires slung between them
    if (Number(p.stacks) > 0) {
      const span = R(280 - 120 * Number(p.stacks)), tops: number[] = [];
      for (let k = R(hash(seed) * span); k < w; k += span) {
        const ph = 70 + R(hash(seed + k) * 30);
        x.strokeStyle = dark; x.lineWidth = 1; x.beginPath(); x.moveTo(k - 8, y(rise)); x.lineTo(k, y(rise + ph)); x.lineTo(k + 8, y(rise)); x.stroke();
        x.beginPath(); for (let h = 12; h < ph - 6; h += 12) { const q = 8 * (1 - h / ph); x.moveTo(k - q, y(rise + h)); x.lineTo(k + q, y(rise + h)); } x.stroke();
        x.fillStyle = dark; x.fillRect(k - 10, y(rise + ph - 10), 21, 2); x.fillRect(k - 7, y(rise + ph - 20), 15, 2);
        tops.push(k, ph);
      }
      x.strokeStyle = rgba('0,0,0', 0.55 * a); x.beginPath();
      for (let i = 0; i + 2 < tops.length; i += 2) for (const [dx, dh] of [[-9, 10], [9, 10], [-6, 20], [6, 20]]) {
        const ax = tops[i] + dx, ay = y(rise + tops[i + 1] - dh), bx = tops[i + 2] + dx, by = y(rise + tops[i + 3] - dh);
        x.moveTo(ax, ay); x.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + 14, bx, by);
      }
      x.stroke();
    }
  },
});

export const fringeElements: Element[] = [shedElement, dataCemeteryElement, solarFieldElement];
