import {colorField} from '../core/fields';
import {fixedGeometry} from '../core/spatial';
import {rectangleControls,combineControls,axisControl,conditionalControls} from '../core/spatial';
import {appearanceBoolean,appearanceChoice,appearanceColor,appearanceRatio,appearanceStructure,appearanceText,generationCount,generationSeed,semantic,shapeLength,shapePosition} from '../core/fields';
/**
 * The approach to the wet market hall (Tommi, 2026-10-22: the hall is only hinted at on the district
 * street, so it gets a scene of its own where you come up to it from outside). The pieces:
 * - `landmark.market-hall-front`: the hall's front at full size, an arched steel gable with its fan of
 *   glazing lit from inside, a band with the big name, doorways open onto the lit hall (the middle one
 *   the obvious way in), a clerestory, a canopy, a clock, boards on the piers, pigeons on the ledge;
 * - `market.forecourt-stall`: a stall spilled out of the hall onto the forecourt, under a tarp or an
 *   umbrella, on a trestle with polystyrene boxes under it;
 * - `market.crates`: stacked polystyrene fish boxes and plastic crates, a hand cart or a flatbed trolley;
 * - `market.lorry`: the small delivery lorry with its side open and the tail lift down;
 * - `market.hose`: a standpipe and a hose washing the ground, the puddle it makes;
 * - `market.footbridge`: a covered footbridge between the housing and the hall's upper floor.
 *
 * Every piece is drawn in its own frame (origin at its foot on the left, `y(h) = -h`), every visual
 * choice is a field, unset choices come from the seed. The world's text stays deadpan.
 */
import type { AssetDefinition, Properties, Value } from '../core/composition';
import { rng, text as paintText } from '../core/primitives';
import { windowLit } from '../../world/light';
import { neonPlate } from '../signage/kit';
import { piece, num, select, bool, text, colour, isHex, rgbOf, hash, rgba, y, type Paint } from '../buildings/types';
import * as P from '../buildings/parts';
const fixedNativeGeometry=fixedGeometry("This market approach component has no independently authored size. Its native kernel and prepared source layout determine its geometry. Edit the source layout or Transform rather than stretching its body.");

type X = CanvasRenderingContext2D;

/** A pixel-crisp rect in the piece's frame: from `l`, its foot at `h`, `w` wide, `t` tall. */
const R = (x: X, l: number, h: number, w: number, t: number, fill: string) => {
  if (w <= 0 || t <= 0) return;
  x.fillStyle = fill; x.fillRect(Math.round(l), Math.round(y(h + t)), Math.max(1, Math.round(w)), Math.max(1, Math.round(t)));
};
const colourField = colorField;
const rgbOr = (v: Value, fallback: string) => isHex(v) ? rgbOf(String(v)) : fallback;
const glowOf = (o: Paint) => o.lighting.outdoor ? 0.45 + 0.55 * o.lighting.lamps : 1;
const between = (m: number, a: number, b: number) => a <= b ? m >= a && m < b : m >= a || m < b;
const LAMP: Record<string, string> = { warm: '255,214,150', cold: '215,240,240', red: '255,90,80' };
const paperBoard = (x: X, t: number, cx: number, cy: number, s: string, size = 7) =>
  neonPlate(x, t, Math.round(cx), Math.round(cy), { text: s, col: '30,30,30', size, h: size + 5, printed: true, bolts: false, glow: 0, fill: 'rgba(226,220,198,.9)', ink: 'rgba(150,24,20,.95)' } as Parameters<typeof neonPlate>[4]);

/** Puffs of steam rising from (cx, h). */
function steam(x: X, cx: number, h: number, t: number, seed: number, n: number, a: number, rise: number) {
  for (let k = 0; k < n; k++) {
    const up = (t * 0.22 + k * (rise / n) + seed * 7) % rise, drift = Math.round(Math.sin(t / 40 + k + seed) * 2 + up * 0.15);
    R(x, cx - 2 + drift + (k % 3) * 2, h + up, 2 + (k % 2), 2, 'rgba(240,240,232,' + Math.max(0, a * (1 - up / rise)).toFixed(3) + ')');
  }
}

// ---------------------------------------------------------------- the hall's front

export const marketHallFrontElement = piece({
  spatial:rectangleControls({width:'width'}),
  type: 'landmark.market-hall-front', label: 'Market hall front, full size (landmark, Neon Market)', category: 'architecture',
  fields: {
    width: shapeLength(num('Width', 760, 300, 2400, 1, 'units')), base: shapeLength(num('Front wall height (to the arch)', 165, 80, 400, 1, 'units')), rise: shapeLength(num('Arch rise over the wall', 165, 40, 600, 1, 'units')),
    steel: appearanceColor(colourField('Steel (painted)', '#2f6f62')), wall: appearanceColor(colourField('Wall', '#121a18')), rust: appearanceRatio(num('Rust and streaks', 0.5, 0, 1, 0.05)),
    glazing: appearanceColor(colourField('Light behind the glazing', '#ffbe78')), glow: appearanceRatio(num('Glazing lit from inside', 0.8, 0, 1, 0.05)),
    ribs: generationCount(num('Glazing bars (fan)', 16, 4, 48)), rings: shapeLength(num('Glazing rings', 3, 0, 10)), boarded: appearanceRatio(num('Panes boarded or broken', 0.1, 0, 1, 0.05)),
    doors: generationCount(num('Doorways', 5, 1, 9)), mainDoor: shapeLength(num('Main doorway width', 130, 50, 400, 1, 'units')), sideDoor: shapeLength(num('Side doorway width', 70, 30, 300, 1, 'units')),
    doorHeight: shapeLength(num('Doorway height', 104, 50, 300, 1, 'units')), doorTop: appearanceChoice(select('Doorway head', ['arched', 'square'])),
    shutters: appearanceRatio(num('Side shutters pulled down', 0.25, 0, 1, 0.05)), inside: appearanceRatio(num('Bustle seen inside', 0.8, 0, 1, 0.05)),
    canopy: appearanceBoolean(bool('Canopy over the main doorway', true)), transom: appearanceBoolean(bool('Lit clerestory over the doorways', true)),
    letters: appearanceText(text('Name', 'WET MARKET')), lettersColour: appearanceColor(colourField('Name colour', '#ff5a46')), fontSize: semantic(num('Name letter size', 18, 7, 48),{"group":"Appearance","quantity":"length","unit":"artwork pixels","space":"artwork"}),
    nameAt: appearanceChoice(select('Name mounted', ['band', 'crown'])), subline: appearanceText(text('Second line (empty: none)', 'MARKET AND COOKED FOOD CENTRE')),
    clock: semantic(bool('Clock in the gable', true),{"group":"Motion","quantity":"boolean","unit":"boolean"}), hours: appearanceChoice(select('Open', ['clock', 'open', 'closed'])),
    openingHour: semantic(num('Opens at (clock)', 5, 0, 24, 0.5, 'h'),{"group":"Motion","quantity":"time-of-day","unit":"city hours"}), closingHour: semantic(num('Closes at (clock)', 21, 0, 24, 0.5, 'h'),{"group":"Motion","quantity":"time-of-day","unit":"city hours"}),
    notices: appearanceText(text('Boards on the piers (comma separated)', 'OPEN 05:00-21:00,NO TROLLEYS INSIDE')),
    camera: appearanceBoolean(bool('Camera over the main doorway', true)), birds: generationCount(num('Pigeons on the ledge', 6, 0, 30)), spill: appearanceRatio(num('Light spilled on the ground', 0.6, 0, 1, 0.05)),
    seed: generationSeed(num('Seed', 1, 0, 1000000)),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.base) + Number(p.rise) + Math.max(44, Number(p.fontSize) + 20) }),
  bounds: p => { const tall = Number(p.base) + Number(p.rise) + Math.max(44, Number(p.fontSize) + 20); return { x: -4, h: tall, w: Number(p.width) + 8, tall }; },
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, door: { x: Number(p.width) / 2, h: 0, role: 'entrance' }, crown: { x: Number(p.width) / 2, h: Number(p.base) + Number(p.rise), role: 'mount' }, ledge: { x: Number(p.width) / 2, h: Number(p.base), role: 'surface' } }),
  paint(x, p, o) {
    const w = Number(p.width), base = Number(p.base), rise = Number(p.rise), seed = Number(p.seed), t = o.t, cx = w / 2;
    const steel = rgbOr(p.steel, '47,111,98'), wall = isHex(p.wall) ? String(p.wall) : '#121a18', warm = rgbOr(p.glazing, '255,190,120'), nameCol = rgbOr(p.lettersColour, '255,90,70');
    const glow = glowOf(o), lit = Number(p.glow), rust = Number(p.rust), day = o.lighting.outdoor ? o.lighting.daylight : 0;
    const open = p.hours === 'open' ? true : p.hours === 'closed' ? false : between(o.lighting.min / 60, Number(p.openingHour), Number(p.closingHour));
    const size = Number(p.fontSize), band = Math.max(18, size + 10), bandBot = base - band, pw = 18;
    const dh = Math.min(Number(p.doorHeight), bandBot - 6), md = Math.min(Number(p.mainDoor), w - 2 * pw - 20), sd = Number(p.sideDoor), arched = p.doorTop !== 'square';

    // ---- the arched gable: the roof's barrel behind it, the frame, the fan of glazing
    const rx = cx - 6, ry = rise, yb = y(base);
    x.fillStyle = '#0a0f0e'; x.beginPath(); x.ellipse(cx, yb, rx + 6, ry + 6, 0, Math.PI, 0); x.fill();
    for (let k = 0; k < 40; k++) {
      // rust bleeding from the roof's edge down over the frame
      const a = Math.PI + (Math.PI * (k + 0.5)) / 40, ex = cx + Math.cos(a) * (rx + 3), ey = yb + Math.sin(a) * (ry + 3);
      if (hash(seed + k * 3) < rust) { x.fillStyle = 'rgba(160,70,30,' + (0.1 + 0.12 * rust).toFixed(3) + ')'; x.fillRect(Math.round(ex), Math.round(ey), 2, 4 + Math.round(hash(seed + k) * 10)); }
    }
    x.fillStyle = '#0e1412'; x.beginPath(); x.ellipse(cx, yb, rx, ry, 0, Math.PI, 0); x.fill();
    const rxi = rx - 8, ryi = ry - 8, hubF = Math.min(0.3, 30 / Math.max(30, ryi)) + 0.08, rings = Number(p.rings), ribs = Math.max(2, Math.round(Number(p.ribs)));
    const fr: number[] = []; for (let i = 0; i <= rings + 1; i++) fr.push(hubF + ((1 - hubF) * i) / (rings + 1));
    const at = (f: number, a: number): [number, number] => [cx + Math.cos(a) * rxi * f, yb + Math.sin(a) * ryi * f];
    for (let i = 0; i < fr.length - 1; i++) for (let j = 0; j < ribs; j++) {
      const a0 = Math.PI + (Math.PI * j) / ribs, a1 = Math.PI + (Math.PI * (j + 1)) / ribs, k = hash(seed * 131 + i * 17 + j * 3 + 1);
      x.beginPath(); x.moveTo(...at(fr[i], a0));
      for (let s = 1; s <= 4; s++) x.lineTo(...at(fr[i + 1], a0 + ((a1 - a0) * (s - 1)) / 3));
      for (let s = 3; s >= 0; s--) x.lineTo(...at(fr[i], a0 + ((a1 - a0) * s) / 3));
      x.closePath();
      if (k < Number(p.boarded)) x.fillStyle = hash(k * 91) < 0.5 ? '#0a0d0c' : 'rgba(110,90,60,.35)';
      else x.fillStyle = rgba(warm, Math.max(0, (0.08 + 0.2 * hash(k * 7)) * (0.3 + 0.7 * lit) * (open ? 1 : 0.35) * glow * (1.25 - 0.5 * fr[i])));
      x.fill();
      if (day > 0 && k >= Number(p.boarded)) { x.fillStyle = 'rgba(160,190,200,' + (0.05 * day).toFixed(3) + ')'; x.fill(); }
    }
    x.strokeStyle = rgba(steel, 0.75); x.lineWidth = 1;
    for (let j = 0; j <= ribs; j++) { const a = Math.PI + (Math.PI * j) / ribs; x.beginPath(); x.moveTo(...at(hubF, a)); x.lineTo(...at(1, a)); x.stroke(); }
    for (const f of fr) { x.beginPath(); x.ellipse(cx, yb, rxi * f, ryi * f, 0, Math.PI, 0); x.stroke(); }
    // the hub: a steel half-disc the bars spring from
    x.fillStyle = '#121a18'; x.beginPath(); x.ellipse(cx, yb, rxi * hubF, ryi * hubF, 0, Math.PI, 0); x.fill();
    x.strokeStyle = rgba(steel, 0.9); x.stroke();
    // the outer rib, riveted
    x.lineWidth = 4; x.strokeStyle = rgba(steel, 0.9); x.beginPath(); x.ellipse(cx, yb, rx - 3, ry - 3, 0, Math.PI, 0); x.stroke(); x.lineWidth = 1;
    x.strokeStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.ellipse(cx, yb, rx - 1, ry - 1, 0, Math.PI, 0); x.stroke();
    x.fillStyle = 'rgba(200,225,215,.35)'; for (let a = Math.PI + 0.04; a < Math.PI * 2 - 0.02; a += 0.05) x.fillRect(Math.round(cx + Math.cos(a) * (rx - 3)), Math.round(yb + Math.sin(a) * (ry - 3)), 1, 1);
    if (lit > 0 && open) o.light?.(cx, base + ry * 0.4, rxi * 1.4, ry * 0.6, warm, 'window');

    // ---- the clock in the hub
    if (p.clock !== false) {
      const cr = Math.max(8, Math.min(20, Math.round(ryi * hubF * 0.75), Math.round(rxi * hubF * 0.5))), ccy = base + cr + 5, m = o.lighting.min;
      x.fillStyle = '#0b100f'; x.beginPath(); x.arc(cx, y(ccy), cr + 3, 0, Math.PI * 2); x.fill();
      x.fillStyle = rgba('236,232,212', 0.45 + 0.45 * glow); x.beginPath(); x.arc(cx, y(ccy), cr, 0, Math.PI * 2); x.fill();
      x.strokeStyle = rgba(steel, 0.9); x.lineWidth = 2; x.beginPath(); x.arc(cx, y(ccy), cr + 1, 0, Math.PI * 2); x.stroke(); x.lineWidth = 1;
      x.fillStyle = 'rgba(20,20,20,.8)'; for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; x.fillRect(Math.round(cx + Math.sin(a) * (cr - 2)), Math.round(y(ccy) - Math.cos(a) * (cr - 2)), 1, 1); }
      const hand = (frac: number, len: number, wd: number) => { const a = frac * Math.PI * 2; x.lineWidth = wd; x.strokeStyle = 'rgba(15,15,15,.95)'; x.beginPath(); x.moveTo(cx, y(ccy)); x.lineTo(cx + Math.sin(a) * len, y(ccy) - Math.cos(a) * len); x.stroke(); x.lineWidth = 1; };
      hand(((m / 60) % 12) / 12, cr * 0.55, 2); hand((m % 60) / 60, cr * 0.85, 1);
      o.light?.(cx, ccy, cr * 2, cr * 2, '236,232,212', 'screen');
    }

    // ---- the name on a lattice frame on the crown
    const letters = String(p.letters ?? ''), sub = String(p.subline ?? '');
    if (letters && p.nameAt === 'crown') {
      const ph = size + 8, top = base + ry + 6;
      x.strokeStyle = 'rgba(0,0,0,.9)';
      for (const dx of [-0.3, 0, 0.3]) { const sx = Math.round(cx + dx * letters.length * size * 0.64); x.beginPath(); x.moveTo(sx + 0.5, y(base + ry - 2)); x.lineTo(sx + 0.5, y(top)); x.stroke(); }
      x.beginPath(); x.moveTo(cx - letters.length * size * 0.2, y(base + ry)); x.lineTo(cx + letters.length * size * 0.2, y(top)); x.moveTo(cx + letters.length * size * 0.2, y(base + ry)); x.lineTo(cx - letters.length * size * 0.2, y(top)); x.stroke();
      neonPlate(x, t, Math.round(cx), Math.round(y(top + ph / 2)), { text: letters, col: nameCol, size, h: ph, phase: seed, bolts: false });
      o.light?.(cx, top + ph / 2, letters.length * size * 0.7, ph, nameCol, 'screen');
    }

    // ---- the front wall: end piers, tile courses, streaks
    R(x, 0, 0, w, base, wall);
    R(x, 0, 0, w, base, 'rgba(255,255,255,.02)');
    for (let h = 6; h < bandBot; h += 6) R(x, 0, h, w, 1, 'rgba(0,0,0,.12)');
    for (let i = 0; i < Math.round(w / 14); i++) { const sx = Math.round(hash(seed * 3 + i) * w), len = 10 + Math.round(hash(seed * 5 + i) * 50 * (0.4 + rust)); R(x, sx, bandBot - len, 2, len, 'rgba(' + (hash(i) < rust * 0.6 ? '120,60,30,.16' : '0,0,0,.16') + ')'); }
    for (const px of [0, w - pw]) {
      R(x, px, 0, pw, base + 22, '#0f1513'); R(x, px, base + 20, pw, 2, rgba(steel, 0.7)); R(x, px + (px ? 0 : pw - 1), 0, 1, base + 22, 'rgba(255,255,255,.06)');
      P.wallPipe(x, px + (px ? 4 : pw - 7), y(base + 18), y(0));
    }
    P.acUnit(x, y, pw + 14, bandBot - 22); P.acUnit(x, y, w - pw - 14, bandBot - 30);

    // ---- doorways: the main one in the middle, side ones spaced over the halves
    const doors: { c: number; dw: number; main: boolean }[] = [{ c: cx, dw: md, main: true }];
    const nSide = Math.max(0, Math.round(Number(p.doors)) - 1), nl = Math.floor(nSide / 2), nr = nSide - nl;
    const spread = (a: number, b: number, n: number) => { for (let i = 0; i < n; i++) doors.push({ c: a + ((b - a) * (i + 0.5)) / n, dw: Math.min(sd, (b - a) / n - 16), main: false }); };
    spread(pw + 10, cx - md / 2 - 14, nl); spread(cx + md / 2 + 14, w - pw - 10, nr);
    const headOf = (dw: number) => arched ? Math.min(Math.round(dw * 0.25), 24) : 0;
    const doorPath = (d: { c: number; dw: number }) => {
      const l = Math.round(d.c - d.dw / 2), r = l + Math.round(d.dw), hr = headOf(d.dw);
      x.beginPath(); x.moveTo(l, 0); x.lineTo(l, y(dh - hr));
      if (hr > 0) x.ellipse((l + r) / 2, y(dh - hr), (r - l) / 2, hr, 0, Math.PI, 0); else x.lineTo(r, y(dh));
      x.lineTo(r, 0); x.closePath();
    };
    const crowd = Number(p.inside), shut = Number(p.shutters);
    doors.forEach((d, di) => {
      const l = Math.round(d.c - d.dw / 2), dw = Math.round(d.dw), hr = headOf(dw);
      if (dw < 8) return;
      x.save(); doorPath(d); x.clip();
      if (open) {
        // the hall inside: warm light under the roof, rows of stalls, bulbs, people crossing
        R(x, l, 0, dw, dh, '#140d08');
        const g = x.createLinearGradient(0, y(dh), 0, 0); g.addColorStop(0, rgba(warm, 0.06 + 0.06 * glow)); g.addColorStop(0.55, rgba(warm, 0.18 + 0.16 * glow)); g.addColorStop(1, rgba(warm, 0.3 + 0.2 * glow));
        x.fillStyle = g; x.fillRect(l, y(dh), dw, dh);
        const chord = Math.round(dh * 0.74); R(x, l, chord, dw, 2, rgba(steel, 0.45));
        x.strokeStyle = rgba(steel, 0.3); x.beginPath(); for (let k = l - 6 + ((seed + di * 5) % 12); k < l + dw + 6; k += 12) { x.moveTo(k, y(chord)); x.lineTo(k + 6, y(dh)); x.lineTo(k + 12, y(chord)); } x.stroke();
        for (let k = l + 5 + (di * 3) % 9; k < l + dw - 2; k += 11) { R(x, k, chord - 9, 1, 9, 'rgba(0,0,0,.6)'); R(x, k - 1, chord - 11, 3, 2, rgba('255,235,190', 0.6 + 0.4 * glow)); }
        for (let k = l + 8 + (di * 7) % 20; k < l + dw - 10; k += 26) { R(x, k, chord - 24, 12, 7, '#1a1410'); R(x, k + 2, chord - 21, 8, 1, rgba(warm, 0.6)); }
        for (let k = l - 4 + (di * 5) % 13, j = 0; k < l + dw; k += 13, j++) {
          const c = ['200,50,50', '50,100,190', '220,170,40', '50,150,90', '200,90,150'][(j + di + seed) % 5];
          R(x, k, 30, 11, 4, rgba(c, 0.75)); R(x, k, 14, 11, 14, '#1c120a'); R(x, k + 2, 26, 7, 2, rgba(['230,230,240', '240,150,40', '90,170,60', '220,60,50'][(j + di) % 4], 0.8));
        }
        R(x, l, 0, dw, 2, rgba(warm, 0.35 + 0.2 * glow));
        steam(x, l + dw * 0.4, 34, t, seed + di, Math.max(1, Math.round(3 * crowd)), 0.18, 22);
        const nW = Math.round(crowd * dw / 26);
        for (let k = 0; k < nW; k++) {
          const s = seed * 37 + di * 11 + k, dir = hash(s) < 0.5 ? 1 : -1, sp = 0.12 + hash(s + 1) * 0.22, tall = 16 + Math.round(hash(s + 2) * 6), span = dw + 20;
          const px = l - 10 + ((((t * sp * dir + hash(s + 3) * span * 4) % span) + span) % span), bob = Math.floor(t * sp / 4 + k) % 2;
          R(x, px, bob, 6, tall - 5, '#0c0806'); R(x, px + 1, tall - 5 + bob, 4, 4, '#0c0806');
          if (hash(s + 4) < 0.35) R(x, px + (dir > 0 ? 5 : -2), 6, 3, 5, 'rgba(230,60,50,.7)');
        }
        o.light?.(d.c, dh / 2, dw, dh, warm, 'window');
      }
      // roller shutters: the side ones part down, all of them down when the hall is shut
      const sh = !open ? dh : d.main ? 0 : Math.round(shut * dh * 0.7);
      if (sh > 0) {
        R(x, l, dh - sh, dw, sh, '#1a201e');
        for (let h = dh - sh + 1; h < dh; h += 3) R(x, l, h, dw, 1, 'rgba(0,0,0,.35)');
        R(x, l, dh - sh, dw, 2, 'rgba(255,255,255,.08)');
        if (!open) { R(x, l + dw / 2 - 2, 4, 4, 5, 'rgba(180,170,150,.6)'); }
      }
      x.restore();
      // the frame: steel jambs, the shutter box over the head
      x.strokeStyle = rgba(steel, 0.85); x.lineWidth = 3; doorPath(d); x.stroke(); x.lineWidth = 1;
      R(x, l - 3, dh + 2, dw + 6, 6, '#141b19'); R(x, l - 3, dh + 7, dw + 6, 1, rgba(steel, 0.6));
      if (hr > 0) R(x, l - 2, 0, 2, dh - hr, 'rgba(0,0,0,.4)');
      if (open && Number(p.spill) > 0) {
        // the hall's light spilled out over the wet ground in front
        const a = 0.2 * Number(p.spill) * glow, g = x.createLinearGradient(0, 0, 0, 14);
        g.addColorStop(0, rgba(warm, a)); g.addColorStop(1, rgba(warm, 0));
        x.fillStyle = g; x.beginPath(); x.moveTo(l, 0); x.lineTo(l + dw, 0); x.lineTo(l + dw + 12, 14); x.lineTo(l - 12, 14); x.closePath(); x.fill();
      }
    });

    // ---- the clerestory over the doorways
    const tb = dh + 12, tt = bandBot - 4;
    if (p.transom !== false && tt - tb >= 8) {
      for (let k = pw + 4, i = 0; k + 14 < w - pw - 4; k += 18, i++) {
        const on = open || windowLit(seed * 59 + i, o.lighting);
        R(x, k, tb, 14, tt - tb, on ? rgba(warm, 0.14 + 0.22 * glow) : '#080b0a'); R(x, k + 7, tb, 1, tt - tb, rgba(steel, 0.6));
        if (on && hash(seed + i * 13) < 0.25) R(x, k + 2, tb + 2, 3, tt - tb - 4, 'rgba(0,0,0,.35)');
      }
      R(x, pw, tb - 2, w - 2 * pw, 2, rgba(steel, 0.7)); R(x, pw, tt, w - 2 * pw, 2, rgba(steel, 0.7));
      if (open) o.light?.(cx, (tb + tt) / 2, w - 2 * pw, tt - tb, warm, 'window');
    }

    // ---- the band at the arch's spring, with the name
    R(x, 0, bandBot, w, band, '#0c1210'); R(x, 0, base - 1, w, 1, rgba(steel, 0.7)); R(x, 0, bandBot, w, 1, rgba(steel, 0.7));
    for (let k = 6; k < w; k += 14) R(x, k, bandBot + 2, 1, 1, 'rgba(200,225,215,.3)');
    if (letters && p.nameAt !== 'crown') {
      neonPlate(x, t, Math.round(cx), Math.round(y(bandBot + band / 2)), { text: letters, col: nameCol, size, h: band - 4, phase: seed });
      o.light?.(cx, bandBot + band / 2, letters.length * size * 0.7, band, nameCol, 'screen');
    } else if (sub) paintText(x, sub, Math.round(cx), Math.round(y(bandBot + band / 2)), 'rgba(225,235,228,.75)', 8, '600');

    // ---- the canopy over the main doorway, the second line on its edge, the camera above
    if (p.canopy !== false) {
      const cl = Math.round(cx - md / 2 - 18), cw = Math.round(md + 36), ch = dh + 9;
      x.strokeStyle = 'rgba(0,0,0,.85)'; x.beginPath(); x.moveTo(cl + 3, y(ch + 9)); x.lineTo(cl + 18, y(ch + 34)); x.moveTo(cl + cw - 3, y(ch + 9)); x.lineTo(cl + cw - 18, y(ch + 34)); x.stroke();
      R(x, cl, ch, cw, 10, '#151c1a'); R(x, cl, ch + 9, cw, 1, rgba(steel, 0.8));
      R(x, cl + 4, ch - 1, cw - 8, 1, rgba('235,245,240', 0.4 + 0.5 * glow));
      if (sub && p.nameAt !== 'crown') paintText(x, sub, Math.round(cx), Math.round(y(ch + 5)), 'rgba(225,235,228,.8)', 7, '600');
      o.light?.(cx, ch - 6, cw - 10, 6, '235,245,240', 'screen');
    }
    if (p.camera !== false) {
      const kx = Math.round(cx + md / 2 - 6), kh = dh + 26, on = Math.floor(t / 30 + seed) % 3 !== 0;
      R(x, kx, kh, 2, 8, '#0a0d0c'); R(x, kx - 8, kh - 4, 10, 5, '#1c2220'); R(x, kx - 10, kh - 3, 2, 3, '#05070a');
      if (on) R(x, kx - 1, kh - 2, 1, 1, 'rgba(255,42,68,.95)');
    }

    // ---- boards on the piers between the doorways
    const notes = String(p.notices ?? '').split(',').map(s => s.trim()).filter(Boolean);
    const piers = doors.filter(d => !d.main).map(d => d.c + (d.c < cx ? d.dw / 2 + 8 : -d.dw / 2 - 8)).sort((a, b) => Math.abs(a - cx) - Math.abs(b - cx));
    if (!piers.length) piers.push(cx - md / 2 - 30, cx + md / 2 + 30);
    notes.forEach((n, i) => { const px = piers[i % piers.length], bw = n.length * 4.6 + 10; if (px - bw / 2 > 0 && px + bw / 2 < w) paperBoard(x, t, px, y(dh * 0.62 - Math.floor(i / piers.length) * 16), n); });

    // ---- pigeons on the ledge over the band
    for (let i = 0; i < Number(p.birds); i++) {
      const bx = Math.round(pw + 6 + hash(seed * 17 + i) * (w - 2 * pw - 12)), peck = Math.floor(t / (40 + i * 7) + i) % 5 === 0 ? 1 : 0, face = hash(seed + i * 5) < 0.5 ? 1 : -1;
      R(x, bx, base, 5, 3, 'rgba(120,125,130,.9)'); R(x, bx + (face > 0 ? 4 : -1), base + 2 - peck, 2, 2, 'rgba(140,145,150,.95)'); R(x, bx + 1, base + 1, 3, 1, 'rgba(90,140,120,.6)');
    }
  },
});

// ---------------------------------------------------------------- a stall out on the forecourt

const FORE_GOODS = ['fish', 'veg', 'fruit', 'dried', 'roast', 'flowers', 'tofu'] as const;
const FORE_NAMES: Record<string, string> = { fish: 'SEAFOOD', veg: 'VEGETABLES', fruit: 'FRUIT', dried: 'DRIED GOODS', roast: 'ROAST MEATS', flowers: 'FLOWERS', tofu: 'TOFU' };
const TARP_COLS = ['200,40,40', '40,90,200', '230,180,40', '40,150,90', '60,110,190'];

export const forecourtStallElement = piece({
  spatial:rectangleControls({width:'width',height:'height'}),
  type: 'market.forecourt-stall', label: 'Forecourt stall under a tarp (kit, Neon Market)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: shapeLength(num('Width', 90, 40, 260, 1, 'units')), kind: appearanceChoice(select('Sells', FORE_GOODS)), cover: appearanceChoice(select('Cover', ['tarp', 'umbrella', 'none'])),
    tarp: appearanceStructure(colour('Tarp colour')), stripes: appearanceBoolean(bool('Striped tarp', true)), height: shapeLength(num('Cover height', 76, 50, 140, 1, 'units')), poles: appearanceChoice(select('Poles', ['bamboo', 'steel'])),
    table: shapeLength(num('Table height', 26, 14, 40, 1, 'units')), boxes: generationCount(num('Polystyrene boxes under the table', 3, 0, 10)), bulbs: generationCount(num('Bare bulbs', 2, 0, 8)),
    lamp: appearanceChoice(select('Bulb light', ['warm', 'cold', 'red'])), sign: appearanceText(text('Name board (empty: what it sells, - for none)', '')), neon: appearanceBoolean(bool('Name in neon', false)),
    prices: generationCount(num('Price cards', 3, 0, 10)), steam: appearanceRatio(num('Steam', 0, 0, 1, 0.05)), wet: appearanceBoolean(bool('Wet ground under it', true)), seed: generationSeed(num('Seed', 1, 0, 1000000)),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) + 30 }),
  bounds: p => ({ x: -10, h: Number(p.height) + 30, w: Number(p.width) + 20, tall: Number(p.height) + 30 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, counter: { x: Number(p.width) / 2, h: Number(p.table), role: 'surface' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), tb = Number(p.table), kind = String(p.kind), seed = Number(p.seed), t = o.t, r = rng(seed * 811 + 9);
    const glow = glowOf(o), lc = LAMP[String(p.lamp)] ?? LAMP.warm, cover = String(p.cover), bamboo = p.poles !== 'steel';
    const pole = (px: number, top: number) => { R(x, px, 0, 2, top, bamboo ? '#6a5434' : '#3a3f3e'); if (bamboo) for (let h = 12; h < top; h += 14) R(x, px - 1, h, 4, 1, '#4a3a22'); };
    // the light under the cover, pooled on the goods
    if (cover !== 'none') { R(x, 0, tb, w, H - tb, rgba(lc, 0.06 + 0.08 * glow)); }
    // goods hung from the frame bar at the back
    const bar = H - 8;
    if (cover === 'tarp') R(x, 0, bar, w, 1, 'rgba(40,30,20,.9)');
    if (kind === 'roast') {
      for (let k = 6, j = 0; k < w - 8; k += 9, j++) { const sw = Math.round(Math.sin(t / 60 + j) * 0.6); R(x, k + 3 + sw, bar - 5, 1, 5, 'rgba(30,20,10,.9)'); R(x, k + sw, bar - 20, 7, 15, j % 3 ? 'rgba(190,90,30,.95)' : 'rgba(150,60,20,.95)'); R(x, k + 1 + sw, bar - 18, 1, 10, 'rgba(255,200,120,.6)'); }
    } else if (kind === 'dried') {
      for (let k = 5, j = 0; k < w - 6; k += 8, j++) { R(x, k + 2, bar - 22, 1, 22, 'rgba(40,25,10,.9)'); for (let b = 0; b < 4; b++) R(x, k, bar - 6 - b * 5, 5, 4, rgba(['170,60,30', '200,140,70', '120,60,30'][(j + b) % 3], 0.9)); }
    } else if (kind === 'fruit') {
      for (let k = 5; k < w - 5; k += 7) { R(x, k, bar - 8, 2, 7, 'rgba(240,210,60,.9)'); R(x, k + 2, bar - 10, 2, 6, 'rgba(240,210,60,.9)'); }
    } else if (kind === 'veg') {
      for (let k = 6; k < w - 10; k += 14) { R(x, k + 4, bar - 4, 1, 4, 'rgba(30,20,10,.9)'); R(x, k, bar - 12, 9, 8, 'rgba(120,90,50,.9)'); R(x, k + 1, bar - 6, 7, 2, 'rgba(90,170,60,.9)'); }
    }
    // bare bulbs on cords from the frame
    for (let k = 0; k < Number(p.bulbs) && cover !== 'none'; k++) {
      const lx = Math.round((w * (k + 0.5)) / Number(p.bulbs)), drop = 5 + ((k + seed) % 3) * 3, sway = Math.round(Math.sin(t / 70 + k + seed) * 0.6);
      R(x, lx, bar - drop, 1, drop, 'rgba(0,0,0,.85)'); R(x, lx - 1 + sway, bar - drop - 3, 3, 3, rgba(lc, 0.55 + 0.45 * glow));
      o.light?.(lx, bar - drop - 2, 4, 4, lc, 'screen');
    }
    // the trestle and what is laid out on it
    x.strokeStyle = 'rgba(40,30,20,.95)'; x.beginPath();
    for (const lx of [4, w - 14]) { x.moveTo(lx, 0); x.lineTo(lx + 10, y(tb - 3)); x.moveTo(lx + 10, 0); x.lineTo(lx, y(tb - 3)); }
    x.stroke();
    for (let k = 0; k < Number(p.boxes); k++) {
      const bx = 2 + ((k * 15) % Math.max(15, w - 14)), lvl = Math.floor((k * 15) / Math.max(15, w - 14));
      if (lvl > 1) break;
      R(x, bx, lvl * 9, 14, 8, 'rgba(226,229,233,.88)'); R(x, bx, lvl * 9, 14, 1, 'rgba(140,150,160,.7)'); R(x, bx, lvl * 9 + 7, 14, 1, 'rgba(255,255,255,.5)'); R(x, bx + 3, lvl * 9 + 3, 4, 1, 'rgba(200,30,30,.8)');
    }
    if (hash(seed * 3) < 0.6) { R(x, w - 12, 0, 9, 10, 'rgba(210,40,40,.95)'); R(x, w - 13, 10, 11, 1, 'rgba(240,80,80,.95)'); }
    R(x, -2, tb - 3, w + 4, 3, kind === 'fish' || kind === 'tofu' ? '#5a605c' : '#2a2016'); R(x, -2, tb - 1, w + 4, 1, 'rgba(255,255,255,.15)');
    const top = tb;
    if (kind === 'fish') {
      R(x, 1, top, w - 2, 3, 'rgba(225,235,240,.85)'); for (let k = 2; k < w - 3; k += 2) R(x, k, top + 2 + (k % 3 ? 0 : 1), 1, 1, 'rgba(160,200,220,.7)');
      for (let k = 4; k < w - 12; k += 11) { x.fillStyle = 'rgba(190,200,210,.95)'; x.beginPath(); x.ellipse(k + 4, y(top + 5), 5, 2, 0, 0, Math.PI * 2); x.fill(); R(x, k + 9, top + 4, 2, 2, 'rgba(190,200,210,.95)'); R(x, k + 1, top + 5, 1, 1, '#111'); }
      for (let k = 0; k < 3; k++) R(x, w - 20 + k * 6, top + 3, 5, 3, 'rgba(230,110,50,.95)');
      // a basin of live fish, aerated, lit cold
      R(x, w / 2 - 10, top + 3, 20, 8, 'rgba(50,140,170,.55)'); R(x, w / 2 - 10, top + 10, 20, 1, 'rgba(150,220,235,.7)');
      R(x, w / 2 - 6 + ((t * 0.08 + seed) % 10), top + 6, 3, 1, 'rgba(255,140,60,.9)');
    } else if (kind === 'veg') {
      for (let k = 1; k < w - 4; k += 5) { R(x, k, top, 4, 3, 'rgba(235,240,220,.85)'); R(x, k - 1, top + 3, 6, 4 + (k % 3), 'rgba(70,160,60,.95)'); }
      for (let k = 6; k < w - 8; k += 12) { R(x, k, top + 3, 8, 4, '#3a2a14'); for (let c = 0; c < 3; c++) R(x, k + 1 + c * 2, top + 7, 2, 2, 'rgba(230,50,40,.95)'); }
    } else if (kind === 'fruit') {
      for (let k = 2, j = 0; k < w - 14; k += 15, j++) { R(x, k, top, 13, 5, '#3a240e'); for (let a = 0; a < 3; a++) for (let b = 0; b < 3 - a; b++) R(x, k + 2 + b * 3 + a * 1.5, top + 5 + a * 2, 3, 2, rgba(['255,150,30', '235,60,120', '240,220,80', '120,200,60'][(j + seed) % 4], 0.95)); }
    } else if (kind === 'dried') {
      for (let k = 2, j = 0; k < w - 12; k += 13, j++) { R(x, k, top, 12, 9, '#5a4020'); R(x, k + 1, top + 8, 10, 3, rgba(['230,120,80', '230,200,140', '120,80,50', '200,40,30'][(j + seed) % 4], 0.95)); }
    } else if (kind === 'roast') {
      R(x, w / 2 - 14, top, 28, 6, '#3a1a0a'); R(x, w / 2 - 6, top + 6, 12, 2, 'rgba(230,220,200,.75)'); R(x, w / 2 + 8, top + 6, 8, 3, 'rgba(200,200,205,.9)');
      R(x, 4, top, 16, 4, 'rgba(190,90,30,.95)'); R(x, w - 20, top, 16, 4, 'rgba(160,60,30,.95)');
    } else if (kind === 'flowers') {
      for (let k = 2; k < w - 10; k += 11) { R(x, k, top, 9, 10, 'rgba(70,90,110,.9)'); for (let f = 0; f < 4; f++) { R(x, k + 1 + f * 2, top + 10, 1, 5 + f, 'rgba(70,140,60,.95)'); R(x, k + f * 2, top + 14 + f, 3, 3, rgba(['255,80,120', '255,220,80', '240,240,240', '200,60,200', '255,120,40'][(k + f + seed) % 5], 0.95)); } }
    } else {
      for (let k = 3; k < w - 16; k += 18) { R(x, k, top, 16, 3, 'rgba(160,200,215,.55)'); for (let c = 0; c < 3; c++) R(x, k + 1 + c * 5, top + 1, 4, 4, 'rgba(240,235,215,.95)'); }
      R(x, w - 16, top, 12, 10, '#7a6a4a');
    }
    if (Number(p.steam) > 0) steam(x, w / 2, top + 10, t, seed, Math.round(2 + 4 * Number(p.steam)), 0.28 * Number(p.steam), 26);
    for (let k = 0; k < Number(p.prices); k++) {
      const px = 3 + Math.round(hash(seed + k) * (w - 12)), ph = top + 4 + Math.round(hash(seed * 3 + k) * 8);
      R(x, px, ph + 3, 1, 3, 'rgba(200,180,140,.7)'); R(x, px - 3, ph + 6, 8, 6, k % 2 ? 'rgba(255,235,80,.95)' : 'rgba(255,140,60,.95)'); R(x, px - 2, ph + 9, 5, 1, 'rgba(20,20,20,.9)'); R(x, px - 2, ph + 7, 6, 1, 'rgba(210,20,20,.95)');
    }
    o.light?.(w / 2, top + 8, w - 6, 16, lc, 'window');
    // the cover: a tarp on four poles (the front pair seen), or a big market umbrella
    const tc = isHex(p.tarp) ? rgbOf(String(p.tarp)) : TARP_COLS[Math.floor(r() * TARP_COLS.length)];
    if (cover === 'tarp') {
      pole(1, H); pole(w - 3, H);
      const sag = Math.min(4, Math.round(w / 40));
      for (let k = -6; k < w + 6; k += 6) {
        const f = (k + 6) / (w + 12), dip = Math.round(4 * sag * f * (1 - f)), c = p.stripes !== false && Math.floor((k + 6) / 6) % 2 ? '230,225,210' : tc;
        R(x, k, H - dip, Math.min(6, w + 6 - k), 10, rgba(c, 0.9)); R(x, k + 1, H - dip - 2, 4, 2, rgba(c, 0.9));
      }
      R(x, -6, H + 9, w + 12, 1, 'rgba(255,255,255,.15)'); R(x, -6, H - 3 - sag, w + 12, 1, 'rgba(0,0,0,.4)');
      x.strokeStyle = 'rgba(0,0,0,.7)'; x.beginPath(); x.moveTo(-6, y(H + 8)); x.lineTo(-14, 0); x.moveTo(w + 6, y(H + 8)); x.lineTo(w + 14, 0); x.stroke();
    } else if (cover === 'umbrella') {
      const ux = Math.round(w / 2), ur = Math.round(w / 2 + 12);
      R(x, ux, 0, 2, H + 4, '#3a3f3e');
      for (let k = 0; k < 8; k++) {
        x.fillStyle = rgba(p.stripes !== false && k % 2 ? '230,225,210' : tc, 0.92); x.beginPath(); x.moveTo(ux + 1, y(H + 18));
        x.lineTo(ux + 1 - ur + (k * 2 * ur) / 8, y(H)); x.lineTo(ux + 1 - ur + ((k + 1) * 2 * ur) / 8, y(H)); x.closePath(); x.fill();
      }
      R(x, ux - ur, H - 2, ur * 2 + 2, 2, 'rgba(0,0,0,.4)');
    }
    // the name board on the tarp's edge or on a stick
    const name = p.sign === '-' ? '' : String(p.sign || FORE_NAMES[kind] || '');
    if (name) {
      const ny = cover === 'none' ? tb + 26 : H - 8;
      if (cover === 'none') R(x, w / 2, tb, 1, 22, 'rgba(60,50,40,.9)');
      const col = ['255,58,90', '255,176,46', '255,90,70'][seed % 3];
      if (p.neon) { neonPlate(x, t, Math.round(w / 2), Math.round(y(ny)), { text: name, col, size: 7, h: 12, phase: seed, bolts: false }); o.light?.(w / 2, ny, w * 0.6, 10, col, 'screen'); }
      else paperBoard(x, t, w / 2, y(ny), name);
    }
    if (p.wet !== false) {
      // the wet ground: a dark sheen with the bulbs caught in it
      R(x, -8, -6, w + 16, 6, 'rgba(10,14,16,.35)');
      for (let k = 0; k < Number(p.bulbs); k++) R(x, Math.round((w * (k + 0.5)) / Number(p.bulbs)) - 1, -4 - (k % 2), 3, 1, rgba(lc, 0.25 * glow));
    }
  },
});

// ---------------------------------------------------------------- boxes, crates and a hand cart

const CRATE_COLS: Record<string, string> = { red: '190,40,40', blue: '40,90,190', green: '40,140,80', yellow: '220,180,40' };
const cratesWidth = (p: Properties) => Number(p.boxes) * 16 + Math.ceil(Number(p.crates) / 2) * 18 + (p.cart === 'none' ? 0 : 38);

export const marketCratesElement = piece({spatial:fixedNativeGeometry,
  type: 'market.crates', label: 'Fish boxes, crates and a hand cart (kit, Neon Market)', category: 'furniture', libraryUse: 'reusable',
  fields: {
    boxes: generationCount(num('Polystyrene stacks', 3, 0, 12)), tall: generationCount(num('Boxes per stack (most)', 4, 1, 9)), crates: generationCount(num('Plastic crates', 3, 0, 12)),
    crateColour: appearanceChoice(select('Crate colour', ['mixed', 'red', 'blue', 'green', 'yellow'])), contents: appearanceChoice(select('In the crates', ['veg', 'fish', 'fruit', 'empty'])),
    cart: appearanceChoice(select('Hand cart', ['none', 'trolley', 'flatbed'])), cartLoad: generationCount(num('Boxes on the cart', 3, 0, 8)), ice: appearanceBoolean(bool('Melting ice (drips, a puddle)', true)),
    seed: generationSeed(num('Seed', 1, 0, 1000000)),
  },
  size: p => ({ w: Math.max(10, cratesWidth(p)), tall: Number(p.tall) * 9 + 40 }),
  bounds: p => ({ x: -6, h: Math.max(Number(p.tall) * 9, 50) + 10, w: Math.max(10, cratesWidth(p)) + 12, tall: Math.max(Number(p.tall) * 9, 50) + 16 }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  paint(x, p, o) {
    const seed = Number(p.seed), t = o.t, boxes = Number(p.boxes), crates = Number(p.crates), contents = String(p.contents);
    const box = (bx: number, bh: number, open: boolean, k: number) => {
      R(x, bx, bh, 14, 8, 'rgba(226,229,233,.9)'); R(x, bx, bh, 14, 1, 'rgba(140,150,160,.75)'); R(x, bx, bh + 7, 14, 1, 'rgba(255,255,255,.55)');
      if (hash(seed + k * 7) < 0.6) R(x, bx + 2 + (k % 3), bh + 3, 4 + (k % 2) * 2, 1, 'rgba(200,30,30,.85)');
      if (open) { R(x, bx + 1, bh + 8, 12, 2, 'rgba(200,225,240,.8)'); R(x, bx + 3, bh + 9, 6, 2, 'rgba(180,190,200,.95)'); R(x, bx + 9, bh + 9, 2, 1, 'rgba(180,190,200,.95)'); }
    };
    let cx = 0, k = 0;
    for (let s = 0; s < boxes; s++, cx += 16) {
      const n = 1 + Math.floor(hash(seed * 13 + s) * Number(p.tall));
      for (let b = 0; b < n; b++, k++) box(cx + (b % 2 ? 1 : 0), b * 9, b === n - 1 && hash(seed + s * 3) < 0.5, k);
    }
    const crateCol = (i: number) => p.crateColour === 'mixed' ? Object.values(CRATE_COLS)[Math.floor(hash(seed * 5 + i) * 4)] : CRATE_COLS[String(p.crateColour)] ?? CRATE_COLS.red;
    for (let i = 0; i < crates; i++) {
      const bx = cx + Math.floor(i / 2) * 18, bh = (i % 2) * 11, c = crateCol(i);
      R(x, bx, bh, 16, 10, rgba(c, 0.92)); R(x, bx, bh + 9, 16, 1, 'rgba(255,255,255,.25)');
      for (let r = 0; r < 2; r++) for (let q = 0; q < 4; q++) R(x, bx + 2 + q * 3.5, bh + 2 + r * 4, 2, 2, 'rgba(0,0,0,.35)');
      const topmost = i % 2 === 1 || i === crates - 1;
      if (topmost && contents !== 'empty') for (let q = 0; q < 5; q++) R(x, bx + 1 + q * 3, bh + 10, 3, 2 + (q % 2), contents === 'veg' ? 'rgba(80,170,60,.95)' : contents === 'fruit' ? rgba(['255,150,30', '240,220,80', '230,60,40'][q % 3], 0.95) : 'rgba(190,200,210,.95)');
    }
    cx += Math.ceil(crates / 2) * 18;
    if (p.cart === 'trolley') {
      // a two-wheeled hand truck, leaning back, boxes strapped on
      const tx = cx + 6;
      R(x, tx + 22, 0, 2, 40, '#3a3f3e'); R(x, tx + 18, 38, 8, 2, '#3a3f3e'); R(x, tx + 4, 0, 20, 2, '#4a504e');
      x.fillStyle = '#0a0a0a'; x.beginPath(); x.arc(tx + 20, y(4), 4, 0, Math.PI * 2); x.fill(); R(x, tx + 19, 3, 2, 2, '#6a6e6c');
      for (let b = 0; b < Math.min(4, Number(p.cartLoad)); b++) box(tx + 6, 2 + b * 9, false, 50 + b);
      R(x, tx + 6, 14, 15, 1, 'rgba(230,180,40,.9)');
    } else if (p.cart === 'flatbed') {
      // a flatbed trolley with a handle at one end
      const tx = cx + 2;
      R(x, tx, 5, 34, 3, '#2a3a5a'); R(x, tx + 33, 5, 2, 26, '#3a3f3e'); R(x, tx + 29, 30, 6, 2, '#3a3f3e');
      for (const wx of [tx + 4, tx + 28]) { x.fillStyle = '#0a0a0a'; x.beginPath(); x.arc(wx, y(2), 2.5, 0, Math.PI * 2); x.fill(); }
      for (let b = 0; b < Number(p.cartLoad); b++) box(tx + 1 + (b % 2) * 15, 8 + Math.floor(b / 2) * 9, false, 60 + b);
    }
    if (p.ice !== false) {
      // meltwater: drips off the boxes, a puddle catching the light
      const w = cratesWidth(p);
      R(x, -4, -5, w + 8, 4, 'rgba(150,190,210,.14)'); R(x, 2, -3, w - 4, 1, 'rgba(200,230,240,.12)');
      for (let d = 0; d < Math.min(6, boxes); d++) { const fall = (t * 0.5 + d * 13 + seed) % 22; R(x, d * 16 + 4 + (d % 2) * 6, 22 - fall, 1, 2, 'rgba(190,225,240,.6)'); }
    }
  },
});

// ---------------------------------------------------------------- the delivery lorry

export const marketLorryElement = piece({
  type: 'market.lorry', label: 'Delivery lorry, side open (kit, Neon Market)', category: 'vehicles', libraryUse: 'reusable',
  fields: {
    length: shapeLength(num('Length', 160, 110, 260, 1, 'units')), cab: appearanceColor(colourField('Cab colour', '#d9d5c8')), body: appearanceChoice(select('Body', ['box', 'flatbed', 'reefer'])),
    bodyColour: appearanceColor(colourField('Body colour', '#c8c4b4')), name: appearanceText(text('Name on the body (empty: none)', 'TAI KEE TRANSPORT')),
    open: appearanceBoolean(bool('Side open, the load showing', true)), tailLift: appearanceBoolean(bool('Tail lift down', true)), load: appearanceRatio(num('Load', 0.7, 0, 1, 0.05)), loadKind: appearanceChoice(select('Load', ['fish', 'veg', 'mixed'])),
    hazards: appearanceBoolean(bool('Hazard lights blinking', true)), headlights: appearanceBoolean(bool('Headlights on', false)), engine: appearanceBoolean(bool('Engine running (exhaust)', true)), seed: generationSeed(num('Seed', 1, 0, 1000000)),
  },
  size: p => ({ w: Number(p.length), tall: 96 }),
  bounds: p => ({ x: p.tailLift !== false ? -24 : -4, h: 96, w: Number(p.length) + (p.tailLift !== false ? 30 : 10), tall: 96 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, tail: { x: 0, h: 18, role: 'mount' }, cab: { x: Number(p.length) - 20, h: 0, role: 'entrance' } }),
  paint(x, p, o) {
    const L = Number(p.length), seed = Number(p.seed), t = o.t, glow = glowOf(o), cab = isHex(p.cab) ? String(p.cab) : '#d9d5c8', bodyHex = isHex(p.bodyColour) ? String(p.bodyColour) : '#c8c4b4';
    const cabL = 42, bodyR = L - cabL - 4, floor = 20, roof = 84, kind = String(p.body), open = p.open !== false && kind !== 'reefer', load = Number(p.load), blink = p.hazards !== false && Math.floor(t / 24) % 2 === 0;
    // chassis and wheels
    R(x, 4, 12, L - 8, 6, '#121314'); R(x, 0, 14, 6, 6, '#1a1a1a');
    const wheel = (wx: number) => { x.fillStyle = '#080808'; x.beginPath(); x.arc(wx, y(10), 10, 0, Math.PI * 2); x.fill(); x.fillStyle = '#4a4e4c'; x.beginPath(); x.arc(wx, y(10), 4, 0, Math.PI * 2); x.fill(); R(x, wx - 13, 19, 26, 2, '#0e0f10'); };
    wheel(30); wheel(L - 24);
    // the body: a box with its side shutter rolled up, a flatbed with rails, or a closed reefer
    if (kind === 'flatbed') {
      R(x, 0, floor - 2, bodyR, 4, '#2a2c2e'); R(x, 0, floor + 22, bodyR, 2, bodyHex);
      for (let k = 0; k <= bodyR; k += Math.max(10, Math.round(bodyR / 6))) R(x, Math.min(k, bodyR - 2), floor, 2, 24, bodyHex);
    } else {
      R(x, 0, floor, bodyR, roof - floor, bodyHex); R(x, 0, roof - 1, bodyR, 1, 'rgba(255,255,255,.25)'); R(x, 0, floor, bodyR, 2, 'rgba(0,0,0,.35)');
      for (let k = 12; k < bodyR; k += 24) R(x, k, floor, 1, roof - floor, 'rgba(0,0,0,.12)');
      if (open) {
        // the side shutter rolled up under the roof, the load inside lit by the street
        R(x, 4, floor + 2, bodyR - 8, roof - floor - 12, '#0c0b0a'); R(x, 2, roof - 10, bodyR - 4, 6, '#9a968a'); R(x, 2, roof - 10, bodyR - 4, 1, 'rgba(0,0,0,.4)');
      }
      if (kind === 'reefer') { R(x, bodyR - 18, roof, 16, 8, '#2a2c2e'); for (let k = 0; k < 3; k++) R(x, bodyR - 16 + k * 5, roof + 2, 3, 4, '#111'); R(x, bodyR - 10, roof - 4, 1, ((t * 0.3) % 6), 'rgba(190,225,240,.5)'); }
    }
    if (open || kind === 'flatbed') {
      const lk = String(p.loadKind), rows = Math.round(load * 5), cols = Math.floor((bodyR - 10) / 15);
      for (let c = 0; c < cols; c++) {
        const n = Math.round(rows * (0.6 + 0.4 * hash(seed + c * 7))), fish = lk === 'fish' || (lk === 'mixed' && hash(seed * 3 + c) < 0.5);
        for (let r = 0; r < n; r++) {
          const bx = 6 + c * 15, bh = floor + 2 + r * 9;
          if (fish) { R(x, bx, bh, 14, 8, 'rgba(226,229,233,.9)'); R(x, bx, bh, 14, 1, 'rgba(140,150,160,.75)'); R(x, bx + 3, bh + 3, 4, 1, 'rgba(200,30,30,.85)'); }
          else { const cc = Object.values(CRATE_COLS)[(c + r + seed) % 4]; R(x, bx, bh, 14, 8, rgba(cc, 0.9)); R(x, bx + 2, bh + 2, 10, 1, 'rgba(0,0,0,.35)'); R(x, bx + 1, bh + 8, 12, 1, 'rgba(90,170,60,.9)'); }
        }
      }
    }
    const name = String(p.name ?? '');
    if (name && kind !== 'flatbed') paintText(x, name, Math.round(bodyR / 2), Math.round(y(open ? roof - 7 : (floor + roof) / 2)), open ? 'rgba(30,30,30,.85)' : 'rgba(160,30,25,.9)', 7, '700');
    // the cab: a flat-fronted cab-over, window, door, mirror, step
    const cl = L - cabL;
    x.fillStyle = cab; x.beginPath(); x.moveTo(cl, y(14)); x.lineTo(cl, y(72)); x.lineTo(L - 8, y(72)); x.lineTo(L, y(56)); x.lineTo(L, y(14)); x.closePath(); x.fill();
    R(x, cl, 71, cabL - 8, 1, 'rgba(255,255,255,.35)'); R(x, cl + 2, 14, 1, 56, 'rgba(0,0,0,.3)');
    x.fillStyle = '#10161a'; x.beginPath(); x.moveTo(cl + 6, y(46)); x.lineTo(cl + 6, y(68)); x.lineTo(L - 9, y(68)); x.lineTo(L - 3, y(56)); x.lineTo(L - 3, y(46)); x.closePath(); x.fill();
    R(x, cl + 8, 64, 10, 1, 'rgba(200,220,230,.25)');
    R(x, cl + 22, 22, 1, 22, 'rgba(0,0,0,.4)'); R(x, cl + 24, 34, 5, 2, '#2a2c2e'); R(x, cl + 6, 16, 14, 2, '#1a1a1a');
    R(x, cl - 3, 52, 2, 14, '#1a1a1a'); R(x, cl - 5, 58, 3, 8, '#1a1a1a');
    R(x, L - 4, 16, 4, 8, '#2a2c2e');
    if (p.headlights) { R(x, L - 2, 26, 3, 5, rgba('255,240,210', 0.95)); o.light?.(L + 6, 28, 16, 8, '255,240,210', 'screen'); }
    else R(x, L - 2, 26, 3, 5, 'rgba(200,200,190,.5)');
    // lights at the tail and the cab corner; the hazards blinking amber
    R(x, 0, 22, 2, 6, 'rgba(200,30,30,' + (blink ? 0.95 : 0.6) + ')');
    if (blink) { R(x, 0, 30, 2, 3, 'rgba(255,170,40,.95)'); R(x, L - 3, 34, 3, 3, 'rgba(255,170,40,.95)'); o.light?.(0, 30, 6, 6, '255,170,40', 'screen'); o.light?.(L - 2, 35, 6, 6, '255,170,40', 'screen'); }
    o.light?.(1, 24, 4, 6, '200,30,30', 'screen');
    if (p.tailLift !== false) {
      // the tail lift down at the kerb, its arms up to the floor
      R(x, -20, 0, 22, 3, '#3a3f3e'); R(x, -20, 2, 22, 1, 'rgba(255,255,255,.18)');
      x.strokeStyle = '#2a2c2e'; x.lineWidth = 2; x.beginPath(); x.moveTo(-1, y(3)); x.lineTo(3, y(floor - 2)); x.stroke(); x.lineWidth = 1;
      for (let k = -18; k < 0; k += 6) R(x, k, 1, 3, 1, 'rgba(230,180,40,.8)');
    }
    if (p.engine !== false) for (let k = 0; k < 4; k++) { const up = (t * 0.3 + k * 6 + seed) % 24; R(x, cl - 6 - Math.round(up * 0.4), 10 + up, 3, 2, 'rgba(180,180,175,' + Math.max(0, 0.25 - up * 0.01).toFixed(3) + ')'); }
    void glow;
  },
});

// ---------------------------------------------------------------- a hose washing the ground

export const marketHoseElement = piece({
  type: 'market.hose', label: 'Hose washing the ground (kit, Neon Market)', category: 'environment', libraryUse: 'reusable',
  fields: {
    length: shapeLength(num('Hose length', 110, 20, 400, 1, 'units')), tap: appearanceChoice(select('Tap', ['standpipe', 'wall', 'none'])), hose: appearanceColor(colourField('Hose colour', '#d8b828')),
    flow: appearanceRatio(num('Water (0: off)', 0.8, 0, 1, 0.05)), sprayReach: shapeLength(num('Spray reach', 50, 10, 160, 1, 'units')), puddleWidth: shapeLength(num('Puddle width', 140, 0, 600, 1, 'units')),
    coils: generationCount(num('Loops lying on the ground', 1, 0, 4)), seed: generationSeed(num('Seed', 1, 0, 1000000)),
  },
  size: p => ({ w: Number(p.length), tall: 30 }),
  bounds: p => { const back = Math.max(Number(p.sprayReach), Number(p.puddleWidth) / 2 + Number(p.sprayReach) / 2); return { x: -back, h: 30, w: Number(p.length) + back + 6, tall: 36 }; },
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, tap: { x: Number(p.length), h: 0, role: 'mount' } }),
  paint(x, p, o) {
    const L = Number(p.length), seed = Number(p.seed), t = o.t, flow = Number(p.flow), reach = Number(p.sprayReach), hose = isHex(p.hose) ? String(p.hose) : '#d8b828', glow = glowOf(o);
    // the puddle first: the wet ground's sheen, rings where the spray lands
    const pw = Number(p.puddleWidth), pc = -reach * flow * 0.7;
    if (pw > 0) {
      R(x, pc - pw / 2, -6, pw, 5, 'rgba(120,160,180,.12)'); R(x, pc - pw / 2 + 6, -2, pw - 12, 1, 'rgba(200,230,240,' + (0.1 + 0.1 * glow).toFixed(3) + ')');
      if (flow > 0) for (let k = 0; k < 3; k++) { const g = ((t * 0.4 + k * 10) % 30) / 30; R(x, pc - 4 - g * 14, -3 - k, 8 + g * 28, 1, 'rgba(210,235,245,' + (0.25 * (1 - g)).toFixed(3) + ')'); }
    }
    // the tap
    if (p.tap === 'standpipe') { R(x, L - 1, 0, 4, 24, '#3a3f3e'); R(x, L - 3, 22, 8, 2, '#4a504e'); R(x, L - 3, 26, 8, 2, 'rgba(190,40,40,.95)'); R(x, L, 24, 2, 2, '#2a2c2e'); R(x, L - 4, 14, 4, 3, '#4a504e'); }
    else if (p.tap === 'wall') { R(x, L - 2, 22, 8, 4, '#4a504e'); R(x, L - 2, 26, 4, 3, 'rgba(190,40,40,.95)'); R(x, L - 4, 18, 3, 6, '#4a504e'); }
    // the hose: down from the tap, along the ground, a loop or two lying flat, to the nozzle
    x.strokeStyle = hose; x.lineWidth = 2; x.beginPath();
    const sx = p.tap === 'none' ? L : L - 3, sh = p.tap === 'standpipe' ? 15 : p.tap === 'wall' ? 19 : 1;
    x.moveTo(sx, y(sh)); x.quadraticCurveTo(sx - 6, y(sh * 0.4), sx - 10, y(1));
    const coils = Math.round(Number(p.coils)), run = sx - 10;
    for (let k = 0; k < coils; k++) { const ccx = run - ((k + 1) * run) / (coils + 2); x.lineTo(ccx + 8, y(1)); x.ellipse(ccx, y(2), 8, 2, 0, 0, Math.PI * 2); }
    for (let k = 1; k <= 6; k++) { const f = 1 - k / 6; x.lineTo(Math.round(run * f), y(1 + (k % 2))); }
    x.stroke(); x.lineWidth = 1;
    R(x, -5, 1, 6, 2, 'rgba(190,150,60,.95)'); R(x, -6, 1, 1, 2, '#2a2c2e');
    // the spray: a flat jet onto the ground, droplets thrown off, splash where it lands
    if (flow > 0) {
      const n = Math.round(10 + 22 * flow), rr = reach * flow;
      for (let i = 0; i < n; i++) {
        const s = ((t * 0.035 + i / n + hash(seed + i) * 0.3) % 1), dx = -6 - s * rr, dh = 2 + 10 * s * (1 - s) * (0.6 + hash(i * 3 + seed));
        R(x, dx, dh, 1 + (i % 2), 1, 'rgba(205,232,245,' + (0.65 * (1 - s * 0.6)).toFixed(3) + ')');
      }
      for (let i = 0; i < 4; i++) { const up = (t * 0.6 + i * 5) % 8; R(x, -6 - rr + (i - 2) * 3, up * 0.6, 1, 1, 'rgba(220,240,250,' + (0.5 - up * 0.06).toFixed(3) + ')'); }
    }
  },
});

// ---------------------------------------------------------------- a covered footbridge

export const marketFootbridgeElement = piece({
  type: 'market.footbridge', label: 'Covered footbridge (kit, Neon Market)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: shapeLength(num('Span', 200, 60, 1600, 1, 'units')), deckY: shapePosition(num('Deck height', 116, 50, 400, 1, 'units')), height: shapeLength(num('Deck to roof', 40, 24, 80, 1, 'units')),
    roof: appearanceBoolean(bool('Roof', true)), sides: appearanceChoice(select('Sides', ['glass', 'mesh', 'solid'])), paintColor: appearanceColor(colourField('Steel colour', '#2f3a38')),
    lit: appearanceRatio(num('Lights inside', 0.8, 0, 1, 0.05)), piers: generationCount(num('Piers to the ground', 1, 0, 8)), stairs: appearanceChoice(select('Stair down', ['none', 'left', 'right'])),
    sign: appearanceText(text('Sign on the side (empty: none)', 'MARKET · LEVEL 1')), walkers: generationCount(num('People crossing', 2, 0, 8)), seed: generationSeed(num('Seed', 1, 0, 1000000)),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.deckY) + Number(p.height) + 6 }),
  bounds: p => { const st = p.stairs === 'none' ? 0 : Math.round(Number(p.deckY) * 1.1); return { x: p.stairs === 'left' ? -st : 0, h: Number(p.deckY) + Number(p.height) + 6, w: Number(p.width) + st, tall: Number(p.deckY) + Number(p.height) + 6 }; },
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, deck: { x: Number(p.width) / 2, h: Number(p.deckY), role: 'surface' } }),
  paint(x, p, o) {
    const S = Number(p.width), D = Number(p.deckY), top = D + Number(p.height), seed = Number(p.seed), t = o.t, steel = isHex(p.paintColor) ? String(p.paintColor) : '#2f3a38', glow = glowOf(o), lit = Number(p.lit), lc = '225,240,235';
    // piers to the ground
    const piers = Math.round(Number(p.piers));
    for (let i = 0; i < piers; i++) { const px = Math.round((S * (i + 1)) / (piers + 1)) - 4; R(x, px, 0, 8, D - 8, steel); R(x, px, 0, 1, D - 8, 'rgba(255,255,255,.08)'); R(x, px - 3, 0, 14, 4, '#1a1d1c'); R(x, px - 2, D - 12, 12, 4, steel); }
    // the stair down
    if (p.stairs !== 'none') {
      const dir = p.stairs === 'left' ? -1 : 1, x0 = dir > 0 ? S : 0, run = Math.round(D * 1.1), steps = Math.max(4, Math.round(D / 8));
      for (let k = 0; k < steps; k++) { const f = k / steps, sx = x0 + dir * f * run, sh = D - f * D; R(x, dir > 0 ? sx : sx - run / steps, sh - 3, run / steps + 1, 3, steel); }
      x.strokeStyle = 'rgba(160,175,170,.55)'; x.beginPath(); x.moveTo(x0, y(D + 18)); x.lineTo(x0 + dir * run, y(18)); x.stroke();
      R(x, x0 + dir * run - (dir > 0 ? 3 : 0), 0, 3, 18, steel);
    }
    // the inside: a lit strip under the roof, people crossing seen through the sides
    const inner = top - D - 8, on = lit * (0.4 + 0.6 * glow);
    R(x, 0, D, S, top - D, '#0a0d0c');
    if (on > 0) { R(x, 0, D, S, top - D, rgba(lc, 0.12 * on)); R(x, 2, top - 4, S - 4, 1, rgba(lc, 0.6 * on)); o.light?.(S / 2, D + inner / 2, S, inner, lc, 'window'); }
    for (let k = 0; k < Number(p.walkers); k++) {
      const s = seed * 41 + k, dir = hash(s) < 0.5 ? 1 : -1, sp = 0.2 + hash(s + 1) * 0.2, span = S + 20, px = -10 + ((((t * sp * dir + hash(s + 2) * span * 3) % span) + span) % span), tall = 24 + Math.round(hash(s + 3) * 6);
      R(x, px, D, 6, tall - 6, '#050606'); R(x, px + 1, D + tall - 6, 4, 5, '#050606');
    }
    // the sides: a solid parapet, glass or mesh above it
    const par = D + Math.round((top - D) * 0.42);
    if (p.sides === 'solid') { R(x, 0, D, S, par - D, steel); for (let k = 10; k < S; k += 20) R(x, k, D, 1, par - D, 'rgba(0,0,0,.25)'); }
    else if (p.sides === 'mesh') { x.strokeStyle = 'rgba(150,165,160,.45)'; x.beginPath(); for (let k = -20; k < S; k += 5) { x.moveTo(Math.max(0, k), y(D + Math.max(0, -k))); x.lineTo(Math.min(S, k + (par - D)), y(par - Math.max(0, k + (par - D) - S))); } x.stroke(); }
    else { R(x, 0, D, S, par - D, 'rgba(150,190,190,.12)'); }
    R(x, 0, par, S, 2, steel);
    for (let k = 0; k <= S; k += 24) R(x, Math.min(k, S - 2), D, 2, top - D, steel);
    if (p.sides === 'glass') for (let k = 6; k < S; k += 24) R(x, k, par + 4, 1, top - par - 8, 'rgba(255,255,255,.12)');
    // deck slab and roof
    R(x, -2, D - 8, S + 4, 8, steel); R(x, -2, D - 1, S + 4, 1, 'rgba(255,255,255,.15)'); R(x, -2, D - 8, S + 4, 1, 'rgba(0,0,0,.4)');
    if (p.roof !== false) { R(x, -4, top, S + 8, 5, '#121615'); R(x, -4, top + 4, S + 8, 1, 'rgba(160,175,170,.35)'); for (let k = 0; k < S; k += 9) if (hash(seed + k) < 0.3) R(x, k, top - 6, 1, 6, 'rgba(100,60,30,.25)'); }
    const sign = String(p.sign ?? '');
    if (sign) paintText(x, sign, Math.round(S / 2), Math.round(y(D - 4)), 'rgba(225,235,228,.8)', 7, '600');
  },
});

export const marketApproach: AssetDefinition[] = [marketHallFrontElement, forecourtStallElement, marketCratesElement, marketLorryElement, marketHoseElement, marketFootbridgeElement];

marketLorryElement.spatial=rectangleControls({width:'length',baseline:20});
marketHoseElement.spatial=combineControls(axisControl('length','x',15,'Tap endpoint'),axisControl('sprayReach','x',2,'Maximum spray reach',{direction:-1,offset:-6}),rectangleControls({width:'puddleWidth',originX:.5,offsetX:p=>-Number(p.sprayReach)*Number(p.flow)*.7,baseline:-6}));
marketFootbridgeElement.spatial=combineControls(rectangleControls({width:'width',baseline:'deckY'}),axisControl('deckY','h',p=>Number(p.width)/2,'Deck elevation'),conditionalControls(axisControl('height','h',p=>Number(p.width)/2,'Roof edge',{offset:p=>Number(p.deckY)}),p=>p.roof!==false));
