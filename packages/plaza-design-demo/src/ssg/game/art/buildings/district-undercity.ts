/**
 * BUILDING KIT, undercity: its building type and special building. The Undercity is not a street but a
 * tunnel system ("Below the record."), so its type is not a front but a cut-open piece of tunnel:
 * - `building.vault`: a concrete vault segment of one or more bays between piers, an arched, flat or
 *   ribbed ceiling across the top of the view (no sky), a pipe bundle sweating condensation, a cable
 *   tray, alcoves where people live behind tarps under battery LED strings, emergency light boxes, chalk
 *   and spray marks (the Ghosts' sign language), rewired screens running off car batteries.
 * - `landmark.flooded-basement`: the flooded server basement, the UNDERNET's home: a broken-through
 *   wall onto a hall of server racks standing in still water, a few still blinking under the surface,
 *   a stair down that ends halfway, a raft with a terminal moored between the racks.
 *
 * Drawn in the piece's own frame like the other district types (types.ts): origin at the foot on the
 * left, heights up (`y = -h`). Unset choices come from the seed; same props, same tunnel.
 */
import type { Element } from '../core/composition';
import { mono, rng } from '../core/primitives';
import { bool, colour, hash, isHex, num, piece, rgba, rgbOf, select, text, y } from './types';

/** The Undercity's card: structure #3a8a80, walls #081010, windows #6fd6c4, neon #e8e0b0 / #ff2a44 / #9ad0ff. */
const STRUCT = '58,138,128', WIN = '111,214,196', PALE = '232,224,176', RED = '255,42,68', COLD = '154,208,255';
const CHALK = '225,222,205';
const CONCRETE = ['#081010', '#091211', '#0a100f', '#081112'];
const TARPS = ['#24343c', '#3a2c20', '#2a3626', '#3c2a26', '#262e36', '#36362a'];
const PIPES = ['70,84,82', '96,72,54', '62,74,84', '112,92,62'];
const R = Math.round;
/** A hex colour lifted (or dropped) by `k` on every channel. */
const lift = (hex: string, k: number) => '#' + [1, 3, 5].map(i => Math.max(0, Math.min(255, parseInt(hex.slice(i, i + 2), 16) + k)).toString(16).padStart(2, '0')).join('');

/** One of the Ghosts' chalk signs, centred on (cx, h): safe place, no, this way, count, water, ask. */
function glyph(x: CanvasRenderingContext2D, kind: number, cx: number, h: number, s: number) {
  const X = R(cx) + 0.5, Y = y(R(h)) + 0.5;
  x.strokeStyle = rgba(CHALK, 0.5); x.lineWidth = 1; x.beginPath();
  if (kind === 0) { x.arc(X, Y, s / 2, 0, Math.PI * 2); x.moveTo(X + 1, Y); x.arc(X, Y, 0.8, 0, Math.PI * 2); }
  else if (kind === 1) { x.moveTo(X - s / 2, Y - s / 2); x.lineTo(X + s / 2, Y + s / 2); x.moveTo(X + s / 2, Y - s / 2); x.lineTo(X - s / 2, Y + s / 2); }
  else if (kind === 2) { x.moveTo(X - s / 2, Y); x.lineTo(X + s / 2, Y); x.moveTo(X + s / 2 - 3, Y - 3); x.lineTo(X + s / 2, Y); x.lineTo(X + s / 2 - 3, Y + 3); }
  else if (kind === 3) { for (let k = 0; k < 4; k++) { x.moveTo(X - s / 2 + k * 2, Y - s / 2); x.lineTo(X - s / 2 + k * 2, Y + s / 2); } x.moveTo(X - s / 2 - 1, Y + 1); x.lineTo(X + s / 2 - 1, Y - 2); }
  else if (kind === 4) { x.moveTo(X - s / 2, Y + s / 2); x.lineTo(X, Y - s / 2); x.lineTo(X + s / 2, Y + s / 2); x.closePath(); x.moveTo(X - s / 2, Y + s / 2 + 3); x.lineTo(X + s / 2, Y + s / 2 + 3); }
  else { x.moveTo(X - s / 2, Y - 2); x.lineTo(X + s / 2, Y - 2); x.moveTo(X - s / 2, Y + 2); x.lineTo(X + s / 2, Y + 2); x.moveTo(X + 1, Y - s / 2 - 2); x.arc(X, Y - s / 2 - 2, 1, 0, Math.PI * 2); }
  x.stroke();
}

/** A spray mark: a blot of paint with its runs, red or the cold blue. */
function spray(x: CanvasRenderingContext2D, l: number, h: number, s: number) {
  const col = hash(s) < 0.55 ? RED : COLD, w = 8 + R(hash(s + 1) * 8), a = 0.22 + hash(s + 2) * 0.12;
  x.fillStyle = rgba(col, a); x.fillRect(R(l), y(R(h) + 5), w, 5); x.fillRect(R(l) + 2, y(R(h) + 7), w - 4, 2);
  for (let k = 0; k < 3; k++) { const dx = R(l + 1 + hash(s + 3 + k) * (w - 2)); x.fillRect(dx, y(R(h)), 1, 2 + R(hash(s + 6 + k) * 7)); }
}

// ---------------------------------------------------------------- the vault (tunnel segment)

export const vaultElement = piece({
  type: 'building.vault', label: 'Tunnel vault (kit, Undercity)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 300, 60, 2000, 1, 'units'), height: num('Height to the ceiling', 300, 140, 600, 1, 'units'),
    ceiling: select('Ceiling', ['arch', 'flat', 'ribbed']), bays: num('Bays between piers (0: by width)', 0, 0, 12),
    rise: num('Arch rise', 120, 0, 300, 1, 'units'), wall: colour('Concrete'),
    pipes: num('Pipes in the bundle', 4, 0, 8), drips: num('Condensation drips', 0.6, 0, 1, 0.05), tray: bool('Cable tray', true),
    alcoves: num('Alcoves lived in behind tarps', 0.6, 0, 1, 0.05), tarp: colour('Tarp colour'),
    led: { kind: 'color', label: 'LED string colour', default: '#e8e0b0' },
    emergency: num('Emergency lights', 2, 0, 8), emergencyColour: { kind: 'color', label: 'Emergency light colour', default: '#ff2a44' },
    marks: num('Chalk and spray marks', 0.5, 0, 1, 0.05), chalk: text('Chalk words on the wall (empty: none)', ''),
    screens: num('Rewired screens', 1, 0, 4), screenText: text('Screen text (empty: static)', ''),
    floodline: num('Old flood line', 28, 0, 120, 1, 'units'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) + 60 }),
  bounds: p => ({ x: 0, h: Number(p.height) + 60, w: Number(p.width), tall: Number(p.height) + 60 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, end: { x: Number(p.width), h: 0, role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), seed = Number(p.seed), t = o.t, r = rng(seed * 6007 + 11);
    const ceiling = String(p.ceiling), wall = isHex(p.wall) ? String(p.wall) : CONCRETE[Math.floor(r() * CONCRETE.length)], near = lift(wall, 9);
    const n = Number(p.bays) > 0 ? Number(p.bays) : Math.max(1, R(w / 150)), pw = 14;
    const rise = ceiling === 'flat' ? 0 : Math.max(0, Math.min(Number(p.rise), H - 90)), sp = rise > 0 ? H - rise : H - 12;
    const fl = Number(p.floodline), led = rgbOf(isHex(p.led) ? String(p.led) : '#e8e0b0'), em = rgbOf(isHex(p.emergencyColour) ? String(p.emergencyColour) : '#ff2a44');
    // the mass: piers, spandrels and the rock over the tunnel, up out of the top of the view
    x.fillStyle = near; x.fillRect(0, y(H + 400), w, H + 400);
    x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(0, y(H + 400), w, 400 - 16);
    x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(0, y(H + 16), w, 1);
    const bays: { L: number; R: number; home: boolean; s: number }[] = [];
    for (let i = 0; i < n; i++) {
      const L = R((i * w) / n + pw / 2), Rr = R(((i + 1) * w) / n - pw / 2), s = seed * 131 + i * 17;
      bays.push({ L, R: Rr, home: hash(s) < Number(p.alcoves), s });
    }
    const recess = (L: number, Rr: number) => {
      x.beginPath();
      if (rise > 0) { x.moveTo(L, 0); x.lineTo(L, y(sp)); x.ellipse((L + Rr) / 2, y(sp), (Rr - L) / 2, rise, 0, Math.PI, 0); x.lineTo(Rr, 0); x.closePath(); }
      else x.rect(L, y(sp), Rr - L, sp);
    };
    // each bay: the back wall, set back between the piers; board marks from the shuttering, damp from the ceiling
    for (const b of bays) {
      x.save(); recess(b.L, b.R); x.clip();
      x.fillStyle = wall; x.fillRect(b.L, y(H), b.R - b.L, H);
      x.fillStyle = 'rgba(255,255,255,.022)'; for (let h = 14; h < H; h += 14) x.fillRect(b.L, y(h), b.R - b.L, 1);
      x.fillStyle = 'rgba(0,0,0,.22)'; for (let k = b.L + 24; k < b.R; k += 48) x.fillRect(k, y(H), 1, H);
      x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(b.L, y(H), b.R - b.L, H - sp + 24);
      for (let k = 0; k < Math.round((b.R - b.L) / 12); k++) { const sx = R(b.L + hash(b.s + k * 3) * (b.R - b.L)), len = 20 + R(hash(b.s + k * 3 + 1) * 90); x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(sx, y(sp + 10), 2, len); }
      x.restore();
      // the edge of the pier against the bay, lit a little; the soffit of the arch
      x.fillStyle = rgba(STRUCT, 0.32); x.fillRect(b.L - 1, y(sp), 1, sp); x.fillRect(b.R, y(sp), 1, sp);
      x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(b.L, y(sp), 2, sp);
      if (rise > 0) {
        x.strokeStyle = rgba(STRUCT, 0.38); x.lineWidth = 2; x.beginPath(); x.ellipse((b.L + b.R) / 2, y(sp), (b.R - b.L) / 2 + 1, rise + 1, 0, Math.PI, 0); x.stroke();
        if (ceiling === 'ribbed') {
          x.strokeStyle = rgba(STRUCT, 0.16); x.lineWidth = 1; x.beginPath(); x.ellipse((b.L + b.R) / 2, y(sp), (b.R - b.L) / 2 - 7, rise - 7, 0, Math.PI, 0); x.stroke();
          x.fillStyle = rgba(STRUCT, 0.3); for (let k = 1; k < 8; k++) { const a = Math.PI + (Math.PI * k) / 8; x.fillRect(R((b.L + b.R) / 2 + Math.cos(a) * ((b.R - b.L) / 2 - 3)), R(y(sp) + Math.sin(a) * (rise - 3)), 2, 2); }
        }
        x.lineWidth = 1;
      }
    }
    if (rise === 0) {
      // the flat slab's beam across the top, its underside catching the light
      x.fillStyle = lift(wall, 14); x.fillRect(0, y(H), w, 12); x.fillStyle = rgba(STRUCT, 0.38); x.fillRect(0, y(sp), w, 1);
      x.fillStyle = 'rgba(0,0,0,.4)'; for (let k = 20; k < w; k += 40) x.fillRect(k, y(H), 1, 12);
    }
    // the piers: a plinth at the foot, a ledge where the arch springs
    for (let i = 0; i <= n; i++) {
      const c = R((i * w) / n), l = Math.max(0, c - pw / 2 - 1), rr = Math.min(w, c + pw / 2 + 1);
      x.fillStyle = lift(wall, 4); x.fillRect(l, y(10), rr - l, 10); x.fillStyle = rgba(STRUCT, 0.25); x.fillRect(l, y(10), rr - l, 1);
      if (rise > 0) { x.fillStyle = lift(wall, 16); x.fillRect(Math.max(0, l - 2), y(sp + 3), Math.min(w, rr + 2) - Math.max(0, l - 2), 3); x.fillStyle = rgba(STRUCT, 0.3); x.fillRect(Math.max(0, l - 2), y(sp + 3), Math.min(w, rr + 2) - Math.max(0, l - 2), 1); }
    }
    // the old flood: darker below the line, a tide mark of silt along it
    if (fl > 0) { x.fillStyle = 'rgba(0,0,0,.24)'; x.fillRect(0, y(fl), w, fl); x.fillStyle = 'rgba(150,170,140,.2)'; x.fillRect(0, y(fl), w, 1); x.fillStyle = 'rgba(60,80,60,.16)'; x.fillRect(0, y(fl) + 1, w, 2); }
    x.fillStyle = rgba(STRUCT, 0.16); x.fillRect(0, y(2), w, 2);
    // the pipe bundle, high on the wall: where it sits decides the tray and the lights above it
    const pt = Math.max(96, Math.min(sp - 14, R(H * 0.55))), np = Number(p.pipes), dia: number[] = [];
    let hb = pt; for (let k = 0; k < np; k++) { const d = 3 + Math.floor(hash(seed * 7 + k) * 4); dia.push(d); hb -= d + 1; }
    // chalk and spray: the Ghosts' signs, high enough to be read over a tarp
    const marks = Number(p.marks);
    for (const b of bays) {
      const m = Math.round(marks * 4), top = Math.min(hb - 10, 118);
      for (let k = 0; k < m; k++) {
        const s = b.s * 7 + k * 13, low = b.home ? 70 : 20, mh = low + hash(s) * Math.max(0, top - low), mx = b.L + 8 + hash(s + 1) * Math.max(0, b.R - b.L - 26);
        if (hash(s + 2) < 0.7) glyph(x, Math.floor(hash(s + 3) * 6), mx + 5, mh, 6 + R(hash(s + 4) * 3)); else spray(x, mx, mh, s);
      }
    }
    const chalk = String(p.chalk ?? '');
    if (chalk) {
      const b = bays[Math.floor(hash(seed + 0.5) * bays.length) % bays.length], h = Math.max(fl, 14) + 5;
      x.font = mono(7, '600'); x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillStyle = rgba(CHALK, 0.6);
      const home = b.home ? 72 : h; x.fillText(chalk, b.L + 8, y(home)); x.fillRect(b.L + 6, y(home - 3), R(x.measureText(chalk).width) + 4, 1);
    }
    // the alcoves: a niche cut into the bay, a tarp on a line, LEDs off a battery, a bed and crates inside
    for (const b of bays) {
      if (!b.home) continue;
      const s = b.s, span = b.R - b.L, aw = Math.min(span - 16, 44 + R(hash(s + 1) * 28));
      if (aw < 30) continue;
      const ah = 48 + R(hash(s + 2) * 12), ax = R(b.L + 8 + hash(s + 3) * Math.max(0, span - aw - 16));
      const lit = hash(s + 4) < 0.85, dying = hash(s + 9) < 0.15, level = !lit ? 0 : dying ? (hash(s + Math.floor(t / 6)) < 0.3 ? 0.3 : 0.9) : 0.82 + 0.18 * Math.sin(t / 70 + s);
      x.fillStyle = lift(wall, 12); x.fillRect(ax - 3, y(ah + 4), aw + 6, 4); x.fillStyle = rgba(STRUCT, 0.3); x.fillRect(ax - 3, y(ah + 4), aw + 6, 1);
      x.fillStyle = '#020505'; x.fillRect(ax, y(ah), aw, ah);
      if (lit) { x.fillStyle = rgba(led, 0.1 * level); x.fillRect(ax, y(ah), aw, ah); }
      // a mattress, a pillow, a crate as a shelf, a bag on a nail
      const thing = lit ? '#1a1712' : '#0a0a08';
      x.fillStyle = lit ? rgba('120,110,90', 0.5 * level + 0.1) : '#0c0c0a'; x.fillRect(ax + 3, y(7), R(aw * 0.55), 7);
      x.fillStyle = lit ? rgba('180,170,140', 0.45 * level) : '#0e0e0c'; x.fillRect(ax + 4, y(10), 7, 3);
      x.fillStyle = thing; x.fillRect(ax + aw - 15, y(16), 12, 16); x.fillStyle = rgba(led, 0.2 * level); x.fillRect(ax + aw - 15, y(16), 12, 1); x.fillRect(ax + aw - 15, y(8), 12, 1);
      x.fillStyle = thing; x.fillRect(ax + R(aw * 0.45), y(ah - 8), 1, 4); x.fillRect(ax + R(aw * 0.45) - 3, y(ah - 18), 7, 10);
      // the tarp: one sheet drawn half across, or two pulled aside
      const tarp = isHex(p.tarp) ? String(p.tarp) : TARPS[Math.floor(hash(s + 5) * TARPS.length)];
      const sheet = (l: number, rr: number, lead: number) => {
        l = R(l); rr = R(rr); if (rr - l < 3) return;
        x.fillStyle = tarp; x.fillRect(l, y(ah - 1), rr - l, ah - 2);
        for (let k = l + 2; k < rr - 1; k += 5) { x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(k, y(ah - 2), 1, ah - 4); x.fillStyle = 'rgba(255,255,255,.05)'; x.fillRect(k + 1, y(ah - 2), 1, ah - 4); }
        x.fillStyle = '#020505'; for (let k = l; k < rr; k += 2) x.fillRect(k, y(2), 2, 1 + R(hash(s + k) * 2));
        x.fillStyle = 'rgba(0,0,0,.6)'; for (let k = l + 1; k < rr; k += 8) x.fillRect(k, y(ah - 1), 2, 2);
        x.fillStyle = rgba(led, 0.28 * level); x.fillRect(lead, y(ah - 3), 1, ah - 6);
      };
      if (hash(s + 6) < 0.5) { const f = 0.45 + hash(s + 7) * 0.3; sheet(ax, ax + aw * f, R(ax + aw * f) - 1); }
      else { sheet(ax, ax + aw * (0.22 + hash(s + 7) * 0.12), R(ax + aw * (0.22 + hash(s + 7) * 0.12)) - 1); sheet(ax + aw * (0.72 - hash(s + 8) * 0.1), ax + aw, R(ax + aw * (0.72 - hash(s + 8) * 0.1))); }
      x.fillStyle = 'rgba(0,0,0,.9)'; x.fillRect(ax - 2, y(ah), aw + 4, 1);
      // the LED string along the top, its wire down to the battery on the floor
      x.fillStyle = 'rgba(0,0,0,.85)'; x.fillRect(ax + 1, y(ah - 3), aw - 2, 1); x.fillRect(ax + aw - 3, y(ah - 3), 1, ah - 9);
      for (let k = ax + 2, i = 0; k < ax + aw - 2; k += 4, i++) {
        const sag = R(2 * Math.sin((Math.PI * (k - ax)) / aw)), tw = 0.75 + 0.25 * Math.sin(t / 17 + i * 1.7 + s);
        x.fillStyle = lit ? rgba(led, Math.min(1, (0.5 + 0.45 * tw) * level + 0.1)) : 'rgba(40,40,32,.9)'; x.fillRect(k, y(ah - 4 - sag) + sag * 2, 2, 1);
      }
      x.fillStyle = '#1c1a14'; x.fillRect(ax + aw - 9, y(6), 8, 6); x.fillStyle = 'rgba(150,140,128,.4)'; x.fillRect(ax + aw - 9, y(6), 8, 1);
      x.fillStyle = Math.floor(t / 50 + s) % 4 === 0 ? 'rgba(255,190,80,.9)' : 'rgba(120,220,120,.85)'; x.fillRect(ax + aw - 4, y(4), 1, 1);
      if (lit) { o.light?.(ax + aw / 2, ah - 4, aw, 6, led, 'screen'); o.light?.(ax + aw / 2, ah / 2, aw - 4, ah - 6, led, 'window'); }
    }
    // wet streaks down the wall under the brackets
    for (let k = 23; k < w; k += 46) { x.fillStyle = 'rgba(0,0,0,.16)'; x.fillRect(k + 1, y(hb), 1, hb - 12); }
    // the cable tray above the pipes, on brackets bolted to the wall, a cable or two sagging out of it
    const tray = Math.min(H - 14, pt + 18);
    if (p.tray !== false && tray > pt + 6) {
      x.fillStyle = '#121615'; for (let k = 10; k < w; k += 40) { x.fillRect(k, y(tray), 2, 10); x.fillRect(k, y(tray), 8, 2); }
      x.fillStyle = 'rgba(150,140,128,.45)'; x.fillRect(0, y(tray + 6), w, 1); x.fillRect(0, y(tray), w, 1);
      x.fillStyle = 'rgba(150,140,128,.25)'; for (let k = 2; k < w; k += 6) x.fillRect(k, y(tray + 6), 1, 6);
      x.fillStyle = '#0a0c0b'; x.fillRect(0, y(tray + 5), w, 3);
      x.strokeStyle = 'rgba(0,0,0,.9)'; x.beginPath();
      for (let k = 0; k < Math.round(w / 90); k++) { const a = R(hash(seed * 3 + k) * (w - 40)), len = 20 + R(hash(seed * 3 + k + 1) * 30); x.moveTo(a + 0.5, y(tray) + 0.5); x.quadraticCurveTo(a + len / 2, y(tray - 12 - hash(seed + k) * 10), a + len + 0.5, y(tray) + 0.5); }
      x.stroke();
    }
    // the pipes: stacked under each other, strapped every 46 units, beads of water along the bottom
    let ph = pt;
    for (let k = 0; k < np; k++) {
      const d = dia[k], col = PIPES[Math.floor(hash(seed * 11 + k) * PIPES.length)];
      x.fillStyle = rgba(col, 0.75); x.fillRect(0, y(ph), w, d);
      x.fillStyle = rgba(col, 0.95); x.fillRect(0, y(ph), w, 1); x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, y(ph - d + 1), w, 1);
      if (hash(seed + k * 5) < 0.5) { x.fillStyle = 'rgba(160,80,40,.22)'; for (let q = 0; q < w; q += 37) x.fillRect(R(q + hash(q + k) * 20), y(ph) + 1, 4 + R(hash(q * 3 + k) * 8), d - 1); }
      ph -= d + 1;
    }
    if (np > 0) {
      x.fillStyle = '#050807'; for (let k = 23; k < w; k += 46) { x.fillRect(k, y(pt + 3), 3, pt + 3 - hb); x.fillStyle = 'rgba(150,140,128,.35)'; x.fillRect(k + 1, y(pt + 2), 1, 1); x.fillStyle = '#050807'; }
      x.fillStyle = 'rgba(200,240,232,.45)'; for (let k = 0; k < w; k += 7) if (hash(seed * 13 + k) < 0.45) x.fillRect(k, y(hb) + 1, 1, 1);
      // drops fall from the bundle to the floor and splash
      const drops = Math.round((w / 26) * Number(p.drips));
      for (let k = 0; k < drops; k++) {
        const px = R(hash(seed * 3 + k * 7) * w), P = 140 + R(hash(seed + k * 5) * 160), ph2 = (t + hash(seed * 9 + k) * 1000) % P, fall = 24;
        if (ph2 < fall) { const f = ph2 / fall, dh = hb - hb * f * f; x.fillStyle = 'rgba(200,240,232,.7)'; x.fillRect(px, y(dh) - 2, 1, 2); }
        else if (ph2 < fall + 6) { x.fillStyle = 'rgba(200,240,232,.4)'; x.fillRect(px - 1, y(1), 3, 1); x.fillRect(px - 2 - (ph2 - fall > 3 ? 1 : 0), y(3), 1, 1); x.fillRect(px + 2 + (ph2 - fall > 3 ? 1 : 0), y(3), 1, 1); }
        else if (ph2 > P - 40) { x.fillStyle = 'rgba(200,240,232,.55)'; x.fillRect(px, y(hb) + 1, 1, 1 + (ph2 > P - 15 ? 1 : 0)); }
      }
    }
    // emergency light boxes over the tray, bolted to the wall, some on a slow pulse
    const ne = Number(p.emergency), eh = Math.min(H - 12, tray + 18);
    for (let i = 0; i < ne; i++) {
      const ex = R((w * (i + 0.5)) / ne), pulse = hash(seed * 17 + i) < 0.4, a = pulse ? (Math.sin(t / 24 + i) > 0 ? 0.95 : 0.25) : 0.85;
      const glow = x.createRadialGradient(ex, y(eh + 3), 0, ex, y(eh + 3), 26); glow.addColorStop(0, rgba(em, 0.16 * a)); glow.addColorStop(1, rgba(em, 0));
      x.fillStyle = glow; x.fillRect(ex - 26, y(eh + 29), 52, 52);
      x.fillStyle = '#16150f'; x.fillRect(ex - 5, y(eh + 6), 10, 7); x.fillStyle = 'rgba(150,140,128,.4)'; x.fillRect(ex - 5, y(eh + 6), 10, 1);
      x.fillStyle = rgba(em, a); x.fillRect(ex - 3, y(eh + 4), 6, 3);
      x.fillStyle = 'rgba(0,0,0,.85)'; x.fillRect(ex, y(eh + 18), 1, 12);
      o.light?.(ex, eh + 3, 8, 4, em, 'screen');
    }
    // rewired screens: old panels bolted up, taped, running off a car battery on the floor
    const ns = Number(p.screens), words = String(p.screenText ?? '');
    for (let i = 0; i < ns; i++) {
      const b = bays[i % bays.length], sw = words ? 42 : 26, sh = 18, sx = R(Math.max(b.L + 4, b.R - sw - 8 - Math.floor(i / bays.length) * (sw + 10))), sb = 72 + (i % 2) * 6;
      x.fillStyle = '#141614'; x.fillRect(sx - 2, y(sb + sh + 2), sw + 4, sh + 4); x.fillStyle = rgba(STRUCT, 0.3); x.fillRect(sx - 2, y(sb + sh + 2), sw + 4, 1);
      x.fillStyle = rgba(COLD, 0.14); x.fillRect(sx, y(sb + sh), sw, sh);
      if (words) {
        x.font = mono(7, '600'); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = rgba(COLD, Math.floor(t / 90 + i) % 7 === 0 ? 0.35 : 0.85); x.fillText(words, sx + sw / 2, y(sb + sh / 2) + 0.5);
      } else {
        const f = Math.floor(t / 3);
        for (let gy = 0; gy < sh; gy += 2) for (let gx = 0; gx < sw; gx += 2) { const q = hash(seed + i * 977 + gx * 31 + gy * 7 + f * 131); x.fillStyle = rgba(COLD, 0.08 + q * 0.45); x.fillRect(sx + gx, y(sb + sh) + gy, 2, 2); }
        const bar = (t * 0.4 + i * 9) % sh; x.fillStyle = rgba(COLD, 0.25); x.fillRect(sx, y(sb + sh) + R(bar), sw, 2);
      }
      x.fillStyle = 'rgba(200,190,150,.4)'; x.fillRect(sx - 2, y(sb + sh + 2), 5, 2); x.fillRect(sx + sw - 4, y(sb - 1), 6, 2);
      x.fillStyle = 'rgba(150,140,128,.5)'; x.fillRect(sx - 1, y(sb + sh + 1), 1, 1); x.fillRect(sx + sw, y(sb + sh + 1), 1, 1); x.fillRect(sx - 1, y(sb - 1), 1, 1); x.fillRect(sx + sw, y(sb - 1), 1, 1);
      // its leads down to the battery on the floor
      const bx = sx + sw / 2 + 4;
      x.strokeStyle = 'rgba(0,0,0,.9)'; x.beginPath(); x.moveTo(sx + sw / 2 - 2 + 0.5, y(sb - 2)); x.quadraticCurveTo(sx + sw / 2 - 6, y(sb / 2), bx + 1.5, y(8)); x.moveTo(sx + sw / 2 + 2 + 0.5, y(sb - 2)); x.quadraticCurveTo(sx + sw / 2 + 10, y(sb / 2), bx + 7.5, y(8)); x.stroke();
      x.fillStyle = '#1e1c16'; x.fillRect(bx, y(8), 10, 8); x.fillStyle = 'rgba(150,140,128,.35)'; x.fillRect(bx, y(8), 10, 1);
      x.fillStyle = rgba(RED, 0.8); x.fillRect(bx + 1, y(9), 2, 1); x.fillStyle = 'rgba(30,30,30,1)'; x.fillRect(bx + 7, y(9), 2, 1);
      o.light?.(sx + sw / 2, sb + sh / 2, sw, sh, COLD, 'screen');
    }
  },
});

// ---------------------------------------------------------------- the flooded server basement

export const floodedBasementElement = piece({
  type: 'landmark.flooded-basement', label: 'The flooded server basement (landmark, Undercity)', category: 'architecture',
  fields: {
    width: num('Width', 460, 300, 1200, 1, 'units'), height: num('Opening height', 240, 170, 420, 1, 'units'),
    racks: num('Racks in the front row', 6, 2, 20), backRow: bool('A second row further back', true),
    depth: num('Water up the racks', 0.45, 0, 0.9, 0.05), running: num('Racks still running', 0.4, 0, 1, 0.05),
    led: { kind: 'color', label: 'Rack LED colour', default: '#6fd6c4' }, ripples: num('Ripples', 1, 0, 2, 0.05),
    stair: select('Stair down', ['left', 'right', 'none']), broken: bool('Stair broken off', true), raft: bool('Raft with a terminal', true),
    letters: text('Stencil on the lintel (empty: none)', 'B2 · DATA HALL'), wall: colour('Concrete', 'Undercity'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) + 60 }),
  bounds: p => ({ x: 0, h: Number(p.height) + 60, w: Number(p.width), tall: Number(p.height) + 60 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, edge: { x: Number(p.width) / 2, h: 0, role: 'entrance' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), seed = Number(p.seed), t = o.t;
    const wall = isHex(p.wall) ? String(p.wall) : '#081010', near = lift(wall, 9), led = rgbOf(isHex(p.led) ? String(p.led) : '#6fd6c4');
    const pad = 20, L = pad, Rr = w - pad, wf = 2, wb = 50, depth = Number(p.depth), running = Number(p.running), rip = Number(p.ripples), stair = String(p.stair);
    const gal = Math.min(H - 56, 130);
    // the wall it was broken through, up into the rock
    x.fillStyle = near; x.fillRect(0, y(H + 400), w, H + 400); x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(0, y(H + 400), w, 400 - 24);
    // the hall beyond: a far wall of columns with their row letters, dead tubes hung from the ceiling
    x.fillStyle = '#030707'; x.fillRect(L, y(H), Rr - L, H);
    for (let k = L + 34, i = 0; k < Rr - 20; k += 72, i++) {
      x.fillStyle = '#060c0c'; x.fillRect(k, y(H), 12, H - wb); x.fillStyle = rgba(STRUCT, 0.1); x.fillRect(k, y(H), 1, H - wb);
      x.font = mono(7, '600'); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = rgba(PALE, 0.22); x.fillText(String.fromCharCode(65 + i), k + 6, y(H - 46));
    }
    x.fillStyle = 'rgba(150,170,140,.08)'; x.fillRect(L, y(wb + 40), Rr - L, 1);
    for (let k = L + 40, i = 0; k < Rr - 30; k += 64, i++) {
      const s = seed * 19 + i, live = hash(s) < 0.22, on = live && hash(s + Math.floor(t / 5)) > 0.25, hang = hash(s + 1) < 0.2;
      x.fillStyle = 'rgba(0,0,0,.9)'; x.fillRect(k - 8, y(H), 1, 16); x.fillRect(k + 8, y(H), 1, hang ? 24 : 16);
      x.save(); x.translate(k, y(H - 17)); if (hang) x.rotate(0.35);
      x.fillStyle = '#101614'; x.fillRect(-10, -2, 20, 4); if (on) { x.fillStyle = rgba(WIN, 0.75); x.fillRect(-9, 1, 18, 1); }
      x.restore();
      if (on) o.light?.(k, H - 18, 18, 3, WIN, 'screen');
    }
    // the water: still, darker towards the far wall, light broken up on the ripples
    for (let h = wf; h < wb; h += 2) { const f = (h - wf) / (wb - wf); x.fillStyle = 'rgb(' + R(6 - 4 * f) + ',' + R(23 - 15 * f) + ',' + R(26 - 17 * f) + ')'; x.fillRect(L, y(h + 2), Rr - L, 2); }
    x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(L, y(wb), Rr - L, 1); x.fillStyle = rgba(WIN, 0.08); x.fillRect(L, y(wb - 1), Rr - L, 1);
    for (let h = wf + 2, row = 0; h < wb - 2; h += 3 + Math.floor((wb - h) / 16), row++) {
      const f = (h - wf) / (wb - wf), drift = t * (0.05 + 0.04 * (1 - f));
      for (let k = L; k < Rr; k += 19) {
        const q = hash(k * 0.13 + row * 7 + seed), len = 3 + R(q * 7), sx = k + ((drift + q * 30) % 19);
        if (sx + len > Rr) continue;
        x.fillStyle = rgba(WIN, (0.04 + 0.08 * (1 - f)) * rip); x.fillRect(R(sx), y(h), len, 1);
      }
    }
    // one server rack: its reflection and the LEDs still going under the surface, then the cabinet over the water
    const rack = (x0: number, base: number, rw: number, rh: number, s: number, far: boolean) => {
      x0 = R(x0);
      const run = hash(s) < running, body = far ? '#060d0d' : '#091313', rim = rgba(STRUCT, far ? 0.2 : 0.38);
      const refl = Math.min(base - wf, R(rh * 0.5));
      for (let k = 1; k < refl; k += 2) { const wob = R(Math.sin(t / 28 + k * 0.8 + s)); x.fillStyle = rgba(STRUCT, (far ? 0.05 : 0.09) * (1 - k / refl)); x.fillRect(x0 + wob, y(base - k), rw, 1); }
      if (run) for (let k = 0; k < 4; k++) {
        const lh = base - 3 - k * 5; if (lh <= wf + 1) break;
        const wob = R(Math.sin(t / 22 + k + s) * 1.2);
        if (hash(s * 5 + k + Math.floor(t / (14 + k * 6))) < 0.55) { x.fillStyle = rgba(led, 0.07); x.fillRect(x0 + 1 + wob, y(lh + 2), rw - 2, 3); x.fillStyle = rgba(led, far ? 0.28 : 0.4); x.fillRect(x0 + 3 + wob, y(lh + 1), 2, 1); }
      }
      x.fillStyle = body; x.fillRect(x0, y(base + rh), rw, rh);
      x.fillStyle = rim; x.fillRect(x0, y(base + rh), rw, 1); x.fillRect(x0, y(base + rh), 1, rh); x.fillRect(x0 + rw - 1, y(base + rh), 1, rh);
      x.fillStyle = 'rgba(0,0,0,.45)'; for (let h = base + 4; h < base + rh - 2; h += far ? 3 : 4) x.fillRect(x0 + 2, y(h), rw - 4, 1);
      x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(x0 + 1, y(base + R(rh * 0.3)), rw - 2, R(rh * 0.3)); x.fillStyle = 'rgba(120,140,110,.2)'; x.fillRect(x0 + 1, y(base + R(rh * 0.3)), rw - 2, 1);
      x.fillStyle = rgba(WIN, far ? 0.16 : 0.32); x.fillRect(x0 - 1, y(base), rw + 2, 1);
      if (run) {
        for (const cx of far ? [x0 + 3] : [x0 + 3, x0 + rw - 5]) for (let h = base + 6, i = 0; h < base + rh - 4; h += far ? 4 : 5, i++) {
          const q = hash(s * 3 + cx * 0.1 + i), on = hash(q * 1000 + Math.floor(t / (6 + q * 30))) < 0.6;
          if (on) { x.fillStyle = q < 0.15 ? 'rgba(255,190,90,.9)' : rgba(led, 0.9); x.fillRect(cx, y(h), far ? 1 : 2, 1); }
        }
        if (!far) {
          x.strokeStyle = 'rgba(0,0,0,.85)'; x.beginPath(); x.moveTo(x0 + rw / 2 + 0.5, y(base + rh)); x.quadraticCurveTo(x0 + rw / 2 + 14, y((base + rh + H) / 2), x0 + rw / 2 + 6.5, y(H)); x.stroke();
          o.light?.(x0 + rw / 2, base + rh / 2, rw, rh * 0.6, led, 'screen');
        }
      } else if (hash(s + 3) < 0.35) { x.fillStyle = rgba(RED, 0.5); x.fillRect(x0 + 3, y(base + rh - 6), 1, 1); }
    };
    // the far row, small and dim at the back of the water
    const nF = Number(p.racks), raft = p.raft !== false;
    if (p.backRow !== false) {
      const nB = nF + 2, step = (Rr - L - 40) / nB, bh = R(58 * (1 - depth * 0.55));
      for (let i = 0; i < nB; i++) rack(L + 20 + i * step + step / 2 - 8, wb - 6, 16, bh, seed * 41 + i, true);
    }
    // the stair down from a door in the side wall: a landing, flights of steel steps, broken off halfway
    const stairs = () => {
      x.fillStyle = '#020404'; x.fillRect(L, y(gal + 46), 22, 46); x.fillStyle = rgba(STRUCT, 0.35); x.fillRect(L + 22, y(gal + 46), 1, 46); x.fillRect(L, y(gal + 47), 23, 1);
      x.fillStyle = '#141a18'; x.fillRect(L, y(gal), 36, 4); x.fillStyle = rgba(STRUCT, 0.4); x.fillRect(L, y(gal), 36, 1);
      const steps = Math.floor((gal - wf - 6) / 6), keep = p.broken !== false ? Math.floor(steps * 0.55) : steps;
      for (let k = 0; k < keep; k++) {
        const sx = L + 36 + k * 6, sh = gal - 6 - k * 6;
        x.fillStyle = '#121816'; x.fillRect(sx, y(sh + 2), 7, 3); x.fillStyle = rgba(STRUCT, 0.35); x.fillRect(sx, y(sh + 2), 7, 1);
        if (k % 3 === 0) { x.fillStyle = '#1a1f1d'; x.fillRect(sx + 3, y(sh + 18), 1, 16); }
      }
      // the stringer under the steps and the handrail along them
      const ex = L + 36 + keep * 6, eh = gal - keep * 6;
      x.strokeStyle = '#1c2220'; x.lineWidth = 2; x.beginPath(); x.moveTo(L + 36, y(gal - 2)); x.lineTo(ex, y(eh - 4)); x.stroke();
      x.strokeStyle = 'rgba(150,140,128,.45)'; x.lineWidth = 1; x.beginPath(); x.moveTo(L + 30, y(gal + 16) + 0.5); x.lineTo(L + 36, y(gal + 16) + 0.5); x.lineTo(ex, y(eh + 14) + 0.5); x.stroke();
      if (p.broken !== false) {
        // where it broke: a bent rail hanging, the lower flight lying in the water
        x.strokeStyle = 'rgba(150,140,128,.4)'; x.beginPath(); x.moveTo(ex + 0.5, y(eh + 14)); x.lineTo(ex + 3.5, y(eh + 2)); x.lineTo(ex + 1.5, y(eh - 8)); x.stroke();
        x.fillStyle = 'rgba(150,110,70,.6)'; x.fillRect(ex, y(eh - 3), 4, 1); x.fillRect(ex + 1, y(eh - 6), 3, 1);
        x.save(); x.translate(ex + 24, y(wf + 5)); x.rotate(-0.22);
        x.fillStyle = '#101614'; x.fillRect(-20, -4, 44, 4);
        for (let k = -18; k < 22; k += 6) { x.fillStyle = '#121816'; x.fillRect(k, -7, 6, 3); x.fillStyle = rgba(STRUCT, 0.3); x.fillRect(k, -7, 6, 1); }
        x.restore();
        x.fillStyle = rgba(WIN, 0.3); x.fillRect(ex + 2, y(wf + 3), 46, 1);
      }
    };
    if (stair === 'left') stairs();
    else if (stair === 'right') { x.save(); x.translate(w, 0); x.scale(-1, 1); stairs(); x.restore(); }
    // the near row standing in the water, a gap where the raft is moored
    const f0 = L + (stair === 'left' ? 150 : 24), f1 = Rr - (stair === 'right' ? 150 : 24), slots = nF + (raft ? 1 : 0), step = (f1 - f0) / slots;
    const rw = Math.max(12, Math.min(26, R(step - 6))), fh = R(100 * (1 - depth * 0.55)), gap = raft ? Math.floor(slots / 2) : -1;
    for (let i = 0, k = 0; i < slots; i++) {
      if (i === gap) continue;
      const s = seed * 53 + k++, cx = f0 + i * step + step / 2;
      if (hash(s + 9) < 0.14 && hash(s) >= running) {
        // a rack gone over, leaning on its neighbour, dead
        x.save(); x.translate(R(cx - rw / 2), y(8)); x.rotate(0.3);
        x.fillStyle = '#081111'; x.fillRect(0, -R(fh * 0.8), rw, R(fh * 0.8)); x.fillStyle = rgba(STRUCT, 0.3); x.fillRect(0, -R(fh * 0.8), rw, 1); x.fillRect(0, -R(fh * 0.8), 1, R(fh * 0.8));
        x.fillStyle = 'rgba(0,0,0,.45)'; for (let h = 4; h < fh * 0.8 - 2; h += 4) x.fillRect(2, -h, rw - 4, 1);
        x.restore(); x.fillStyle = rgba(WIN, 0.3); x.fillRect(R(cx - rw / 2) - 1, y(8), rw + 4, 1);
      } else rack(cx - rw / 2, 10, rw, fh, s, false);
    }
    // the raft: drums and pallets, a crate with a terminal on it, a stool; tied to a rack, powered from the ceiling
    let edge = R((L + Rr) / 2);
    if (raft) {
      const cx = R(f0 + gap * step + step / 2); edge = cx - 15;
      for (let k = 1; k < 6; k += 2) { x.fillStyle = rgba(STRUCT, 0.08); x.fillRect(cx - 22 + R(Math.sin(t / 30 + k)), y(5 - k / 2), 44, 1); }
      x.fillStyle = '#1c2c3a'; x.fillRect(cx - 20, y(8), 12, 4); x.fillRect(cx + 8, y(8), 12, 4);
      x.fillStyle = '#2a2016'; x.fillRect(cx - 23, y(12), 46, 4); x.fillStyle = 'rgba(0,0,0,.5)'; for (let k = cx - 20; k < cx + 23; k += 7) x.fillRect(k, y(12), 1, 4);
      x.fillStyle = 'rgba(200,170,120,.35)'; x.fillRect(cx - 23, y(12), 46, 1);
      x.fillStyle = '#1a140e'; x.fillRect(cx - 8, y(24), 14, 12); x.fillStyle = 'rgba(200,170,120,.25)'; x.fillRect(cx - 8, y(24), 14, 1);
      x.fillStyle = '#121414'; x.fillRect(cx - 9, y(37), 16, 13); x.fillStyle = rgba(led, 0.55); x.fillRect(cx - 8, y(36), 14, 10);
      x.fillStyle = 'rgba(0,0,0,.45)'; for (let k = 0; k < 4; k++) x.fillRect(cx - 7, y(34) + k * 2 + 1, 3 + R(hash(seed + k + Math.floor(t / 40)) * 9), 1);
      x.fillStyle = '#1a140e'; x.fillRect(cx + 11, y(20), 7, 2); x.fillRect(cx + 12, y(18), 1, 6); x.fillRect(cx + 16, y(18), 1, 6);
      x.strokeStyle = 'rgba(0,0,0,.9)'; x.beginPath(); x.moveTo(cx - 1 + 0.5, y(37)); x.quadraticCurveTo(cx - 10, y((37 + H) / 2), cx - 4 + 0.5, y(H)); x.stroke();
      x.strokeStyle = 'rgba(150,130,90,.5)'; x.beginPath(); x.moveTo(cx + 23, y(12) + 0.5); x.quadraticCurveTo(cx + step / 2, y(6), cx + step - rw / 2 + 0.5, y(16)); x.stroke();
      o.light?.(cx - 1, 31, 14, 10, led, 'screen');
    }
    // the lip of the walkway: concrete posts, a pipe rail with a gap, a ladder down into the water
    x.fillStyle = '#1a1c1a'; for (let k = L + 6; k < Rr; k += 36) { if (Math.abs(k - edge - 15) < 22) continue; x.fillRect(k, y(18), 3, 18); x.fillStyle = rgba(STRUCT, 0.3); x.fillRect(k, y(18), 3, 1); x.fillStyle = '#1a1c1a'; }
    x.fillStyle = 'rgba(150,140,128,.5)'; x.fillRect(L, y(18), edge - L, 2); x.fillRect(edge + 30, y(18), Rr - edge - 30, 2);
    x.fillRect(edge - 1, y(17), 2, 4); x.fillRect(edge + 30, y(17), 2, 5);
    x.fillStyle = '#20231f'; x.fillRect(edge + 8, y(20), 2, 18); x.fillRect(edge + 20, y(20), 2, 18);
    x.fillStyle = 'rgba(150,140,128,.5)'; for (let h = 4; h < 20; h += 4) x.fillRect(edge + 8, y(h), 14, 1);
    // drops off the lintel into the water, a ring where each lands
    for (let k = 0; k < 5; k++) {
      const dx = R(L + 30 + hash(seed * 7 + k) * (Rr - L - 60)), land = 14 + R(hash(seed + k * 3) * 30), P = 180 + R(hash(seed * 5 + k) * 160), ph = (t + hash(seed * 2 + k) * 900) % P, fall = 30;
      if (ph < fall) { const f = ph / fall; x.fillStyle = 'rgba(200,240,232,.6)'; x.fillRect(dx, y(H - (H - land) * f * f) - 2, 1, 2); }
      else if (ph < fall + 40) { const g = (ph - fall) / 40, rr = 1 + R(g * 6); x.fillStyle = rgba(WIN, 0.35 * (1 - g)); x.fillRect(dx - rr, y(land), rr * 2 + 1, 1); }
    }
    // the broken edges of the opening: jagged concrete, rebar sticking out
    for (let h = 0; h < H; h += 6) {
      const a = R(hash(seed + h * 0.37) * 10), b = R(hash(seed * 3 + h * 0.53) * 10);
      x.fillStyle = near; x.fillRect(L, y(h + 6), a, 6); x.fillRect(Rr - b, y(h + 6), b, 6);
      x.fillStyle = rgba(STRUCT, 0.3); x.fillRect(L + a, y(h + 6), 1, 6); x.fillRect(Rr - b - 1, y(h + 6), 1, 6);
      if (hash(seed + h) < 0.12) { x.fillStyle = 'rgba(150,110,70,.6)'; x.fillRect(L + a, y(h + 3), 6, 1); x.fillRect(L + a + 5, y(h + 4), 1, 1); }
      if (hash(seed * 5 + h) < 0.12) { x.fillStyle = 'rgba(150,110,70,.6)'; x.fillRect(Rr - b - 7, y(h + 3), 6, 1); }
    }
    // the old flood line across the wall either side
    x.fillStyle = 'rgba(0,0,0,.24)'; x.fillRect(0, y(28), L + 4, 28); x.fillRect(Rr - 4, y(28), w - Rr + 4, 28);
    x.fillStyle = 'rgba(150,170,140,.2)'; x.fillRect(0, y(28), L + 4, 1); x.fillRect(Rr - 4, y(28), w - Rr + 4, 1);
    glyph(x, 0, 9, 78, 7); glyph(x, 4, w - 10, 70, 7);
    // the lintel: a heavy beam, cracked, the hall's name stencilled on it, an emergency light under it
    x.fillStyle = lift(wall, 14); x.fillRect(L - 6, y(H + 22), Rr - L + 12, 22);
    x.fillStyle = rgba(STRUCT, 0.45); x.fillRect(L - 6, y(H), Rr - L + 12, 1); x.fillStyle = rgba(STRUCT, 0.2); x.fillRect(L - 6, y(H + 22), Rr - L + 12, 1);
    x.strokeStyle = 'rgba(0,0,0,.6)'; x.beginPath(); { const c = R(L + (Rr - L) * (0.3 + hash(seed) * 0.4)); x.moveTo(c + 0.5, y(H + 22)); x.lineTo(c + 3.5, y(H + 14)); x.lineTo(c - 0.5, y(H + 7)); x.lineTo(c + 2.5, y(H)); } x.stroke();
    const letters = String(p.letters ?? '');
    if (letters) { x.font = mono(8, '600'); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = rgba(PALE, 0.55); x.fillText(letters, w / 2, y(H + 11) + 0.5); }
    const ea = Math.sin(t / 30) > -0.2 ? 0.9 : 0.3, ex = L + 18;
    x.fillStyle = '#16150f'; x.fillRect(ex - 5, y(H), 10, 7); x.fillStyle = rgba(RED, ea); x.fillRect(ex - 3, y(H - 3), 6, 3);
    o.light?.(ex, H - 4, 8, 4, RED, 'screen');
  },
});

export const undercityElements: Element[] = [vaultElement, floodedBasementElement];
