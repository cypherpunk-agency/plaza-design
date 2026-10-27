/**
 * INTERIOR KIT, Downtown everyday (Tommi, 2026-10-22: "what we can get out of Downtown"; Act I walks the
 * hero through ordinary places). Three places, each from reusable pieces:
 * - the FRESHCO corner supermarket: its shopfront (`everyday.freshco-front`), trolleys (`everyday.trolleys`),
 *   the shop floor's back wall in sections (`interior.freshco-floor`), aisle ends seen end-on
 *   (`interior.aisle-end`), the fruit display (`interior.fruit-display`), the ID gate at the door
 *   (`interior.security-gate`), the self-checkouts with one refusing (`interior.self-checkouts`) and the
 *   stockroom and staff room upstairs (`interior.stockroom`);
 * - the 24h diner: its street front (`everyday.diner-front`), the pole sign (`everyday.diner-sign`), the back
 *   wall with windows, griddle, pie case and menu (`interior.diner-room`), the counter and stools
 *   (`interior.diner-counter`) and the booths (`interior.diner-booths`);
 * - the roofs: a roof deck with its plant (`everyday.roof-deck`), the billboard with its catwalk
 *   (`everyday.billboard`), a plank or grating across a gap (`everyday.roof-plank`), and rain for a frame
 *   that needs it (`everyday.rain`).
 *
 * Each piece is drawn in its own frame (origin at its foot on the left, `y(h) = -h`). Attach rooms to a
 * building's interior handle (level kit) so they show only while the player is inside. Every visual
 * choice is a field; unset choices come from the seed. The world's text is dry: the supermarket and the
 * Registry say plainly what they do.
 */
import type { AssetDefinition, Field, Properties, Value } from '../core/composition';
import { mono, neon, rng, text as paintText } from '../core/primitives';
import { drawPane } from '../environment/sky';
import { neonPlate } from '../signage/kit';
import type { View } from '../core/view';
import { residentCharacter } from '../characters/resident';
import { drawCharacter } from '../../runtime/characters';
import { piece, num, select, bool, text, isHex, rgbOf, hash, rgba, y, type Paint } from '../buildings/types';

type X = CanvasRenderingContext2D;
/** The view in a piece's own frame, so the character kit can draw a person inside a piece (seen through glass). */
const localView = (v: View): View => ({ ...v, sx: (wx: number) => wx, y: (h: number) => -h, cam: 0, gy: 0, viewW: 1e5, viewH: 1e5 });
const SEATED_ACTS = ['sit', 'read', 'phone', 'talk', 'doze'] as const;
/** A seated kit person at (cx, h) in the piece's frame, back-band size and dimming, facing left or right. */
function seated(x: X, o: Paint, cx: number, h: number, seed: number, face: 1 | -1) {
  const p = residentCharacter({ kind: 'human', depth: 'back', district: 'downtown', seed, act: SEATED_ACTS[seed % SEATED_ACTS.length], sitting: 'side' }, { x: 0, h: 0 });
  x.save(); x.translate(cx, -h); if (face < 0) x.scale(-1, 1);
  try { drawCharacter(x, localView(o.view), p); } finally { x.restore(); }
}

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
const lines = (v: Value) => String(v ?? '').split('|').map(s => s.trim()).filter(Boolean);
/** Words broken into lines of at most `max` characters (a long word keeps its own line). */
const wrap = (s: string, max: number) => s.split(/\s+/).filter(Boolean).reduce<string[]>((out, word) => {
  const last = out[out.length - 1];
  if (last !== undefined && (last + ' ' + word).length <= max) out[out.length - 1] = last + ' ' + word; else out.push(word);
  return out;
}, []);
/** Width of 7 px Plex Mono text, near enough for fitting plates. */
const textW = (s: string, size = 7) => s.length * size * 0.68;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const box = (p: Properties, w = 'width', h = 'height') => ({ x: 0, h: Number(p[h]), w: Number(p[w]), tall: Number(p[h]) });

export const LIGHT_KINDS = ['tube', 'flicker', 'off'] as const;
/** A ceiling tube at `cx` under the ceiling `top`, its light falling to the floor; returns how bright it is now. */
function tube(x: X, o: Paint, kind: string, cx: number, top: number, seed: number, col = '226,240,236', w = 22) {
  if (kind === 'off') { R(x, cx - w / 2, top - 3, w, 2, '#26282a'); return 0; }
  const flick = kind === 'flicker' ? (hash(Math.floor(o.t / 5) + seed) < 0.22 ? 0.1 : hash(Math.floor(o.t / 37) + seed * 3) < 0.15 ? 0.5 : 1) : 1;
  R(x, cx - w / 2 - 1, top - 1, w + 2, 1, '#151617'); R(x, cx - w / 2, top - 3, w, 2, rgba('245,252,248', 0.3 + 0.65 * flick));
  const g = x.createLinearGradient(0, y(top - 3), 0, y(0));
  g.addColorStop(0, rgba(col, 0.13 * flick)); g.addColorStop(1, rgba(col, 0.02 * flick));
  x.fillStyle = g; x.beginPath(); x.moveTo(cx - w / 2, y(top - 3)); x.lineTo(cx + w / 2, y(top - 3)); x.lineTo(cx + w * 1.6, y(0)); x.lineTo(cx - w * 1.6, y(0)); x.closePath(); x.fill();
  o.light?.(cx, top - 4, w, 3, col, 'screen');
  return flick;
}
/** A warm pendant on a cord from the ceiling `top`, a pool of light under it. */
function pendant(x: X, o: Paint, cx: number, top: number, drop: number, seed: number, col = '255,200,130') {
  R(x, cx, top - drop, 1, drop, 'rgba(10,8,6,.9)');
  R(x, cx - 4, top - drop - 3, 9, 3, '#3a2a1c'); R(x, cx - 3, top - drop - 5, 7, 2, rgba('255,230,180', 0.95));
  const g = x.createRadialGradient(cx, y(top - drop - 6), 1, cx, y(top - drop - 6), 34);
  g.addColorStop(0, rgba(col, 0.2)); g.addColorStop(1, rgba(col, 0));
  x.fillStyle = g; x.fillRect(cx - 34, y(top - drop + 28), 68, 68);
  o.light?.(cx, top - drop - 5, 6, 3, col, 'screen');
  void seed;
}
/** Puffs of steam rising from (cx, h). */
function steam(x: X, cx: number, h: number, t: number, seed: number, n = 3, a = 0.22, rise = 22) {
  for (let k = 0; k < n; k++) {
    const f = ((t * 0.3 + k * (rise / n) + seed * 7) % rise), dx = Math.round(Math.sin(t / 30 + k + seed) * (1 + f / 8));
    R(x, cx + dx - 1 + (k % 2) * 2, h + f, 2 + Math.floor(f / 8), 2, 'rgba(240,240,235,' + Math.max(0, a * (1 - f / rise)).toFixed(3) + ')');
  }
}
/** A ceiling camera dome with its red recording dot. */
function dome(x: X, t: number, cx: number, top: number, seed: number) {
  R(x, cx - 1, top - 3, 3, 3, '#202224'); x.fillStyle = '#121314'; x.beginPath(); x.arc(cx + 0.5, y(top - 3), 4, 0, Math.PI); x.fill();
  if (Math.floor(t / 30 + seed) % 2 === 0) R(x, cx, top - 6, 1, 1, 'rgba(255,60,50,.95)');
}
/** Printed paper notice: a sheet with a red or dark header line and its words (size 7 for anything meant to be read). */
function notice(x: X, cx: number, h: number, w: number, t: number, words: string[], ink = 'rgba(30,30,30,.9)', paper = 'rgba(232,226,208,.88)', head = 'rgba(180,30,30,.9)') {
  R(x, cx - w / 2 - 1, h - 1, w + 2, t + 2, 'rgba(0,0,0,.4)'); R(x, cx - w / 2, h, w, t, paper); R(x, cx - w / 2, h + t - 3, w, 3, head);
  words.forEach((s, i) => paintText(x, s, cx, y(h + t - 8 - i * 8), ink, 7, '600'));
}
/** Goods on a shelf: packets, tins and bottles in a run of colours, with a gap where something sold out. */
function goods(x: X, l: number, h: number, w: number, tall: number, r: () => number, cols: readonly string[], gaps = 0.08) {
  for (let k = l + 1; k < l + w - 3;) {
    const gw = 3 + Math.round(r() * 4), gt = Math.max(3, Math.round(tall * (0.55 + r() * 0.45)));
    if (r() < gaps) { k += gw + 4; continue; }
    const c = pick(r, cols), run = 1 + Math.floor(r() * 3);
    for (let n = 0; n < run && k < l + w - 3; n++, k += gw + 1) { R(x, k, h, gw, gt, rgba(c, 0.85)); R(x, k, h + gt - 1, gw, 1, 'rgba(255,255,255,.22)'); if (gw > 4) R(x, k + 1, h + Math.round(gt / 2), gw - 2, 1, 'rgba(255,255,255,.35)'); }
  }
}
const GOODS_COLS = ['220,60,50', '240,200,60', '60,120,200', '240,240,235', '90,170,80', '230,130,40', '160,70,150', '40,40,45', '200,170,120'];

// ---------------------------------------------------------------- FRESHCO: the street front

export const freshcoFrontElement = piece({
  type: 'everyday.freshco-front', label: 'FRESHCO shopfront: logo, sliding doors, the bright window (Downtown)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 540, 120, 2000, 1, 'units'), height: num('Ground floor height', 92, 60, 200, 1, 'units'),
    logo: text('Logo', 'FRESHCO'), tagline: text('Under the logo (empty: none)', 'GROCERIES · OPEN 06–24'),
    fascia: colourField('Fascia', '#b81f2a'), ink: colourField('Logo letters', '#fff3dc'), leaf: colourField('Leaf mark', '#7cc04a'),
    door: select('Corner entrance', ['left', 'right', 'none'], 'left'), gate: bool('ID gate behind the doors', true),
    posters: text('Window posters (separate with |)', 'MEMBER PRICES|PRICES SET DAILY|ID REQUIRED AT CHECKOUT'),
    index: bool('Price index screen by the door', true), lit: num('Shop lights on', 1, 0, 1, 0.05), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => box(p),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, fascia: { x: Number(p.width) / 2, h: Number(p.height) - 10, role: 'mount' }, top: { x: 0, h: Number(p.height), role: 'mount' },
    door: { x: p.door === 'right' ? Number(p.width) - 34 : 34, h: 0, role: 'entrance' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), seed = Number(p.seed), r = rng(seed * 131 + 9), t = o.t, lit = Number(p.lit);
    const fas = rgbField(p.fascia, '184,31,42'), ink = hexOr(p.ink, '#fff3dc'), leaf = rgbField(p.leaf, '124,192,74'), glow = 0.45 + 0.55 * o.lighting.lamps;
    const fh = 20, top = H - fh - 6, sill = 10;
    R(x, 0, 0, w, H, '#18181b'); R(x, 0, 0, w, sill, '#232327'); R(x, 0, sill - 1, w, 1, 'rgba(255,255,255,.12)');
    // the doors at the corner, the rest of the frontage one long window
    const dl = p.door === 'right' ? w - 62 : 8, dw = 54, hasDoor = p.door !== 'none';
    // a pier beside the doors carries the price index and the entry notice
    const pier = hasDoor ? 46 : 0;
    const wl = hasDoor && p.door === 'left' ? dl + dw + pier : 8, wr = hasDoor && p.door === 'right' ? dl - pier : w - 8;
    // inside, through the glass: cold white light, shelves of colour, the ceiling's tubes
    const inside = (l: number, r2: number, lo: number, hi: number) => {
      R(x, l, lo, r2 - l, hi - lo, rgba('230,238,232', 0.12 + 0.6 * lit * glow));
      for (let sh = lo + 6; sh < hi - 8; sh += 9) { R(x, l, sh, r2 - l, 1, 'rgba(70,74,72,.8)'); goods(x, l + 2, sh + 1, r2 - l - 4, 6, r, GOODS_COLS, 0.12); }
      for (let k = l + 14; k < r2 - 10; k += 46) R(x, k, hi - 3, 20, 2, rgba('255,255,255', 0.4 + 0.5 * lit));
      // end caps of the aisles, nearer the glass, a little darker
      for (let k = l + 30; k < r2 - 20; k += 70 + Math.round(r() * 20)) { R(x, k, lo, 16, hi - lo - 14, 'rgba(48,52,56,.85)'); goods(x, k + 1, lo + 4, 14, 6, r, GOODS_COLS); goods(x, k + 1, lo + 14, 14, 6, r, GOODS_COLS); R(x, k + 2, hi - 14, 12, 5, rgba(fas, 0.9)); }
    };
    inside(wl, wr, sill, top);
    o.light?.((wl + wr) / 2, (sill + top) / 2, wr - wl, top - sill, '230,240,235', 'window');
    // mullions, the glass's sheen, posters stuck on the inside
    for (let k = wl; k <= wr; k += Math.max(40, Math.round((wr - wl) / Math.max(1, Math.round((wr - wl) / 64))))) R(x, Math.min(k, wr - 2), sill, 2, top - sill, '#5a5f66');
    R(x, wl, top - 1, wr - wl, 2, '#5a5f66');
    x.save(); x.beginPath(); x.rect(wl, y(top), wr - wl, top - sill); x.clip();
    for (let k = wl - 40; k < wr; k += 90) { x.fillStyle = 'rgba(255,255,255,.07)'; x.beginPath(); x.moveTo(k, y(sill)); x.lineTo(k + 14, y(sill)); x.lineTo(k + 44, y(top)); x.lineTo(k + 30, y(top)); x.closePath(); x.fill(); }
    x.restore();
    const posters = lines(p.posters);
    posters.forEach((s, i) => {
      const pw = Math.max(48, s.length * 5 + 10), cx = wl + 40 + i * ((wr - wl - 80) / Math.max(1, posters.length - 1 || 1));
      if (cx + pw / 2 > wr - 4) return;
      const yellow = i % 2 === 0;
      R(x, cx - pw / 2, sill + 6, pw, 14, yellow ? 'rgba(250,214,60,.95)' : 'rgba(240,236,224,.95)');
      R(x, cx - pw / 2, sill + 17, pw, 3, yellow ? 'rgba(200,30,40,.95)' : 'rgba(30,30,30,.9)');
      paintText(x, s, cx, y(sill + 11), 'rgba(25,20,20,.95)', 7, '700');
    });
    // the doors: steel frame, two leaves that slide aside when someone comes; the gate's posts behind them
    if (hasDoor) {
      R(x, dl - 3, 0, dw + 6, top + 2, '#7d838a'); R(x, dl, 0, dw, top - 1, '#0e1012');
      inside(dl, dl + dw, 1, top - 1);
      if (p.gate !== false) for (const gx of [dl + 10, dl + dw - 12]) { R(x, gx, 1, 3, 40, 'rgba(210,225,230,.55)'); R(x, gx, 38, 3, 3, Math.floor(t / 90 + seed) % 7 === 0 ? 'rgba(255,60,50,.95)' : 'rgba(80,230,120,.9)'); }
      const cyc = (t + seed * 50) % 520, open = cyc < 60 ? cyc / 60 : cyc < 200 ? 1 : cyc < 260 ? 1 - (cyc - 200) / 60 : 0, slide = Math.round(open * (dw / 2 - 4));
      for (const [lx, d] of [[dl, -1], [dl + dw / 2, 1]] as const) {
        const ll = lx + d * slide; R(x, ll, 1, dw / 2, top - 2, 'rgba(180,215,220,.16)'); R(x, ll, 1, 2, top - 2, '#8a9096'); R(x, ll + dw / 2 - 2, 1, 2, top - 2, '#8a9096'); R(x, ll + 4, 24, dw / 2 - 8, 1, 'rgba(255,255,255,.35)');
      }
      R(x, dl, top - 6, dw, 5, '#2a2c30'); R(x, dl + dw / 2 - 2, top - 5, 4, 3, open > 0 ? 'rgba(80,230,120,.9)' : 'rgba(255,190,90,.8)');
      // the notice over the door, screwed to the frame
      R(x, dl - 4, 0, dw + 8, 1, 'rgba(0,0,0,.6)'); R(x, dl + 4, 0, dw - 8, 1, 'rgba(60,60,60,.9)');
      // on the pier: the entry notice screwed on at eye level, the price index over it
      const sx = p.door === 'right' ? dl - pier + 6 : dl + dw + 12;
      notice(x, sx + 11, 12, 38, 21, ['ID SCAN', 'ON ENTRY']);
      if (p.index !== false) {
        R(x, sx, 38, 22, 20, '#0b0c0d'); R(x, sx + 1, 39, 20, 18, 'rgba(255,170,60,.12)');
        paintText(x, 'INDEX', sx + 11, y(52), 'rgba(255,190,110,.9)', 7, '600');
        paintText(x, (1.2 + ((Math.floor(t / 300) + seed) % 37) / 100).toFixed(2), sx + 11, y(43), 'rgba(255,214,140,.98)', 7, '700');
        R(x, sx + 10, 33, 2, 5, '#3a3c40'); o.light?.(sx + 11, 48, 20, 18, '255,170,60', 'screen');
      }
    }
    // the fascia: a lit box, the leaf and the name; light down onto the pavement
    R(x, 0, top + 1, w, fh + 5, '#141416');
    const fl = 4, fr = w - 4, fb = top + 3;
    const g = x.createLinearGradient(0, y(fb + fh), 0, y(fb));
    g.addColorStop(0, rgba(fas, 0.8 + 0.2 * glow)); g.addColorStop(1, rgba(fas, 0.62 + 0.25 * glow));
    x.fillStyle = g; x.fillRect(fl, y(fb + fh), fr - fl, fh);
    R(x, fl, fb + fh - 1, fr - fl, 1, 'rgba(255,255,255,.3)'); R(x, fl, fb, fr - fl, 1, 'rgba(0,0,0,.4)');
    const logo = String(p.logo ?? 'FRESHCO'), cx = w / 2, tag = String(p.tagline ?? '');
    const lw = logo.length * 9.5;
    x.fillStyle = rgba(leaf, 0.95); x.beginPath(); x.ellipse(cx - lw / 2 - 10, y(fb + fh / 2 + 1), 5, 3, -0.6, 0, Math.PI * 2); x.fill();
    R(x, cx - lw / 2 - 13, fb + fh / 2 - 4, 1, 4, rgba(leaf, 0.9));
    paintText(x, logo, cx + 2, y(fb + fh / 2 + (tag ? 3 : 0)), ink, 14, '700');
    if (tag) paintText(x, tag, cx, y(fb + 4), 'rgba(255,240,220,.85)', 7, '600');
    o.light?.(cx, fb + fh / 2, w * 0.7, fh, fas, 'screen');
    const pool = x.createLinearGradient(0, y(fb), 0, y(0));
    pool.addColorStop(0, rgba(fas, 0.12 * glow)); pool.addColorStop(1, rgba(fas, 0));
    x.fillStyle = pool; x.fillRect(0, y(fb), w, fb);
    // soffit downlights over the pavement
    for (let k = 20; k < w - 10; k += 48) R(x, k, top + 1, 4, 1, rgba('255,230,190', 0.4 + 0.5 * glow));
    R(x, 0, H - 2, w, 2, '#0c0c0e');
  },
});

export const trolleysElement = piece({
  type: 'everyday.trolleys', label: 'Trolleys: a nested row on its chain, a loose one (kit)', category: 'props', libraryUse: 'reusable',
  fields: {
    count: num('Trolleys in the row', 5, 0, 16), loose: num('Loose trolleys', 1, 0, 4), handle: colourField('Handle colour', '#b81f2a'),
    bay: bool('Trolley bay with its sign', true), sign: text('Bay sign', 'RETURN TROLLEYS HERE'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: 34 + Number(p.count) * 6 + Number(p.loose) * 36 + 10, tall: 40 }),
  bounds: p => ({ x: -4, h: 44, w: 44 + Number(p.count) * 6 + Number(p.loose) * 36 + 10, tall: 44 }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  paint(x, p, o) {
    const n = Number(p.count), hc = rgbField(p.handle, '184,31,42'), seed = Number(p.seed);
    const trolley = (l: number, a: number, tilt = 0) => {
      // a side view: wire basket wider at the back, the handle, the chassis and its two wheels
      const c = 'rgba(190,198,205,' + a.toFixed(3) + ')', d = 'rgba(120,128,135,' + a.toFixed(3) + ')';
      x.strokeStyle = c; x.lineWidth = 1; x.beginPath();
      x.moveTo(l + 2, y(12 + tilt)); x.lineTo(l + 24, y(12)); x.lineTo(l + 26, y(26)); x.lineTo(l, y(27 + tilt)); x.closePath(); x.stroke();
      for (let k = l + 5; k < l + 25; k += 4) { x.beginPath(); x.moveTo(k + 0.5, y(12)); x.lineTo(k + 0.5 + (k - l) * 0.06, y(26)); x.strokeStyle = d; x.stroke(); }
      R(x, l + 1, 19, 24, 1, d);
      R(x, l + 25, 26, 2, 6, c); R(x, l + 24, 31, 6, 2, rgba(hc, a));
      R(x, l + 3, 4, 22, 1, c); R(x, l + 4, 4, 1, 8, d); R(x, l + 22, 4, 1, 8, d);
      for (const wx of [l + 4, l + 22]) { R(x, wx - 1, 0, 3, 3, '#1a1a1c'); R(x, wx, 1, 1, 1, 'rgba(200,200,200,.6)'); }
    };
    let at = 4;
    if (p.bay !== false) {
      // the bay: two posts and a roof, the sign on its front edge
      const bw = 34 + n * 6;
      R(x, 0, 0, 2, 40, '#6a6f75'); R(x, bw + 4, 0, 2, 40, '#6a6f75'); R(x, -2, 40, bw + 10, 3, '#4a4e54');
      const s = String(p.sign ?? ''); if (s) neonPlate(x, o.t, (bw + 6) / 2, y(36), { text: s, col: '30,30,30', size: 6, h: 9, printed: true, bolts: false, glow: 0, fill: 'rgba(236,230,214,.9)', ink: 'rgba(30,60,120,.95)' });
      R(x, 2, 16, 3, 5, 'rgba(210,180,90,.9)');
    }
    for (let i = n - 1; i >= 0; i--) trolley(at + i * 6, 0.55 + 0.4 * (i / Math.max(1, n)));
    if (n > 0) { x.strokeStyle = 'rgba(200,190,120,.8)'; x.beginPath(); x.moveTo(3.5, y(17)); x.quadraticCurveTo(10, y(10), at + 30, y(28)); x.stroke(); }
    at += n * 6 + 36;
    for (let i = 0; i < Number(p.loose); i++) trolley(at + i * 36 + Math.round(hash(seed + i) * 6), 0.95, hash(seed * 3 + i) < 0.5 ? 1 : 0);
  },
});

// ---------------------------------------------------------------- FRESHCO: inside

export const SHOP_SECTIONS = ['entrance', 'produce', 'shelves', 'chiller', 'freezer', 'bakery', 'tobacco', 'staff', 'blank'] as const;
const sectionItem: Record<string, Field> = {
  kind: { kind: 'select', label: 'Kind', options: [...SHOP_SECTIONS], default: 'shelves' },
  width: num('Width', 90, 20, 600, 1, 'units'), sign: text('Sign above (empty: none)', ''),
};
const SECTIONS_DEFAULT: Properties[] = [
  { kind: 'entrance', width: 80, sign: '' }, { kind: 'tobacco', width: 70, sign: 'TOBACCO · SPIRITS' }, { kind: 'produce', width: 90, sign: 'PRODUCE' },
  { kind: 'shelves', width: 90, sign: 'TINS · RICE · NOODLES' }, { kind: 'chiller', width: 120, sign: 'DAIRY · CHILLED' }, { kind: 'staff', width: 90, sign: '' },
];

/** The shop's back wall, section by section, under the ceiling's tubes. */
export const freshcoFloorElement = piece({
  type: 'interior.freshco-floor', label: 'Supermarket shop floor, back wall in sections (kit, Downtown)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 540, 60, 4000, 1, 'units'), height: num('Storey height', 92, 50, 200, 1, 'units'),
    sections: listOf('Sections along the back wall', sectionItem, 'Add section', rows => ({ ...SECTIONS_DEFAULT[rows.length % SECTIONS_DEFAULT.length] }), SECTIONS_DEFAULT),
    light: select('Ceiling lights', LIGHT_KINDS), wall: colourField('Wall', '#2a2f2c'), brand: colourField('Brand colour (trims, signs)', '#b81f2a'),
    screen: text('Screen at the entrance (empty: none)', 'CUSTOMER VERIFICATION IN PROGRESS'), cameras: bool('Camera domes', true), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => box(p),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, ceiling: { x: 0, h: Number(p.height), role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), seed = Number(p.seed), t = o.t, r = rng(seed * 71 + 3), brand = rgbField(p.brand, '184,31,42');
    const ceil = H - 6, rows = (Array.isArray(p.sections) ? p.sections : []) as Properties[];
    R(x, 0, 0, w, H, hexOr(p.wall, '#2a2f2c')); R(x, 0, 0, w, 10, 'rgba(0,0,0,.25)'); R(x, 0, 10, w, 2, rgba(brand, 0.7));
    R(x, 0, ceil, w, 6, '#1a1c1c'); for (let k = 0; k < w; k += 20) R(x, k, ceil, 1, 6, 'rgba(255,255,255,.05)');
    let at = 0;
    rows.forEach((row, i) => {
      const sw = Math.min(Number(row.width) || 90, w - at), l = at, kind = String(row.kind), s = seed * 31 + i * 7; at += sw;
      if (sw <= 0) return;
      const hang = (label: string) => {
        if (!label) return;
        const cx = l + sw / 2, sh = ceil - 16;
        R(x, cx - 18, sh + 9, 1, ceil - sh - 9, 'rgba(20,20,20,.9)'); R(x, cx + 18, sh + 9, 1, ceil - sh - 9, 'rgba(20,20,20,.9)');
        neonPlate(x, t, cx, y(sh + 4), { text: label, col: brand, size: 7, h: 11, printed: true, bolts: false, glow: 0, fill: 'rgba(240,236,226,.95)', ink: rgba(brand, 1) });
      };
      if (kind === 'shelves') {
        // a wall run of shelving: five shelves of goods, price strips on every edge
        R(x, l + 3, 0, sw - 6, 64, '#3a3f42');
        for (let sh = 4; sh < 62; sh += 12) { R(x, l + 3, sh, sw - 6, 2, '#5a6066'); R(x, l + 3, sh - 1, sw - 6, 1, 'rgba(250,214,60,.65)'); goods(x, l + 5, sh + 2, sw - 10, 8, r, GOODS_COLS, 0.1); }
        R(x, l + 3, 64, sw - 6, 2, rgba(brand, 0.85));
      } else if (kind === 'produce') {
        // sloped bins of fruit and veg, a mirror strip over them and the mist bar
        R(x, l + 3, 0, sw - 6, 50, '#2f3532'); R(x, l + 3, 50, sw - 6, 8, 'rgba(160,190,190,.25)');
        const cols = ['230,60,40', '250,170,40', '120,190,60', '240,220,70', '170,60,120', '80,150,60'];
        for (let tier = 0; tier < 3; tier++) for (let k = l + 6; k < l + sw - 14; k += 14) {
          const c = pick(r, cols), b = 6 + tier * 14;
          R(x, k, b, 12, 3, '#5a3b20'); for (let d = 0; d < 9; d++) R(x, k + 1 + (d % 5) * 2, b + 3 + Math.floor(d / 5) * 2 + (d % 2), 2, 2, rgba(c, 0.95));
        }
        R(x, l + 4, 56, sw - 8, 1, '#7a8288'); for (let k = l + 10; k < l + sw - 8; k += 16) { R(x, k, 54, 1, 2, '#9aa2a8'); if (Math.floor(t / 400 + s) % 3 === 0) R(x, k - 2, 48 - ((t * 0.2) % 6), 5, 2, 'rgba(220,235,240,.18)'); }
      } else if (kind === 'chiller') {
        // glass doors on a cold-lit cabinet: cartons, bottles, frost at the foot, one door's light failing
        R(x, l + 2, 0, sw - 4, 70, '#1c2024'); R(x, l + 2, 66, sw - 4, 4, '#d8dde0');
        const dn = Math.max(1, Math.round((sw - 6) / 24)), dw = (sw - 6) / dn;
        for (let d = 0; d < dn; d++) {
          const dl = l + 3 + d * dw, fail = d === dn - 1 && hash(Math.floor(t / 7) + s) < 0.25 ? 0.35 : 1;
          R(x, dl + 1, 3, dw - 2, 62, rgba('215,235,245', 0.28 * fail + 0.05));
          for (let sh = 6; sh < 60; sh += 13) { R(x, dl + 1, sh, dw - 2, 1, 'rgba(200,215,225,.55)'); goods(x, dl + 2, sh + 1, dw - 4, sh < 20 ? 10 : 8, r, sh < 20 ? ['240,240,235', '90,150,220', '240,200,60'] : ['240,240,235', '220,60,50', '90,170,80', '250,230,180'], 0.06); }
          R(x, dl, 3, 1, 62, '#9aa4ac'); R(x, dl + dw - 2, 20, 1, 22, '#c8d0d6');
          R(x, dl + 1, 3, dw - 2, 4, 'rgba(240,248,255,.35)');
        }
        o.light?.(l + sw / 2, 34, sw - 8, 60, '215,235,245', 'window');
      } else if (kind === 'freezer') {
        // chest freezers under a run of shelves with the stock nobody wants
        R(x, l + 4, 0, sw - 8, 22, '#d6dadc'); R(x, l + 6, 18, sw - 12, 4, 'rgba(180,215,235,.6)'); R(x, l + 4, 22, sw - 8, 1, '#8a9298');
        for (let k = l + 8; k < l + sw - 10; k += 6) R(x, k, 19, 4, 2, rgba(pick(r, ['90,150,220', '220,60,50', '240,240,235']), 0.8));
        for (let sh = 34; sh < 64; sh += 12) { R(x, l + 4, sh, sw - 8, 2, '#5a6066'); goods(x, l + 6, sh + 2, sw - 12, 8, r, GOODS_COLS, 0.3); }
      } else if (kind === 'bakery') {
        R(x, l + 3, 0, sw - 6, 40, '#4a3220'); R(x, l + 3, 40, sw - 6, 2, '#6a4a2a');
        for (let sh = 8; sh < 40; sh += 11) for (let k = l + 6; k < l + sw - 12; k += 9) { R(x, k, sh, 8, 4, 'rgba(210,150,80,.95)'); R(x, k + 1, sh + 4, 6, 1, 'rgba(240,200,130,.9)'); }
        o.light?.(l + sw / 2, 24, sw - 8, 30, '255,200,130', 'window');
      } else if (kind === 'tobacco') {
        // the locked cabinet behind its own small counter: cartons, bottles, a padlock and the rule
        R(x, l + 6, 20, sw - 12, 46, '#141618'); R(x, l + 7, 21, sw - 14, 44, 'rgba(200,215,220,.12)');
        for (let sh = 24; sh < 62; sh += 9) goods(x, l + 8, sh, sw - 16, 7, r, sh < 40 ? ['200,170,90', '120,60,30', '60,90,60', '220,220,210'] : ['230,230,225', '200,40,40', '40,40,45', '230,200,80'], 0.05);
        R(x, l + Math.round(sw / 2) - 2, 40, 4, 5, 'rgba(210,180,90,.95)');
        R(x, l + 2, 0, sw - 4, 20, '#3a3f44'); R(x, l + 2, 20, sw - 4, 2, rgba(brand, 0.9));
        paintText(x, 'ID CHECKED', l + sw / 2, y(12), 'rgba(240,236,226,.85)', 7, '600');
      } else if (kind === 'staff') {
        // a double swing door with porthole windows, a fire extinguisher, the duty rota
        const dc = l + Math.round(sw * 0.35);
        R(x, dc - 18, 0, 36, 56, '#4a4e52'); R(x, dc - 17, 0, 17, 54, '#5d636a'); R(x, dc + 1, 0, 16, 54, '#5d636a');
        for (const px of [dc - 9, dc + 9]) { x.fillStyle = 'rgba(255,220,160,.5)'; x.beginPath(); x.arc(px, y(40), 4, 0, Math.PI * 2); x.fill(); x.strokeStyle = '#2a2c30'; x.stroke(); }
        R(x, dc - 17, 6, 34, 4, 'rgba(0,0,0,.3)');
        neonPlate(x, t, dc, y(62), { text: 'STAFF ONLY', col: '30,30,30', size: 7, h: 10, printed: true, bolts: false, glow: 0, fill: 'rgba(236,230,214,.92)', ink: 'rgba(170,25,25,.95)' });
        R(x, dc + 26, 0, 5, 12, 'rgba(200,30,30,.95)'); R(x, dc + 27, 12, 3, 2, '#202020');
      } else if (kind === 'entrance') {
        // inside the doors: the verification screen and baskets, the floor mat
        const msg = String(p.screen ?? '');
        if (msg) {
          const sw2 = Math.min(sw - 8, 74), cx = l + sw / 2, rowsT = wrap(msg, Math.floor((sw2 - 6) / 4.4)).slice(0, 3), sh2 = rowsT.length * 8 + 6, sb = 64 - sh2;
          R(x, cx - sw2 / 2 - 2, sb - 2, sw2 + 4, sh2 + 4, '#0c0d0e'); R(x, cx - sw2 / 2, sb, sw2, sh2, rgba('120,170,200', 0.18));
          rowsT.forEach((s2, k) => paintText(x, s2, cx + 3, y(sb + sh2 - 7 - k * 8), 'rgba(230,236,240,.92)', 7, '600'));
          x.strokeStyle = 'rgba(255,90,70,.9)'; x.beginPath(); x.arc(cx - sw2 / 2 + 5, y(sb + sh2 - 5), 2, 0, Math.PI * 2); x.stroke();
          R(x, cx - 1, sb - 8, 2, 6, '#3a3c40'); o.light?.(cx, sb + sh2 / 2, sw2, sh2, '150,190,215', 'screen');
        }
        for (let k = 0; k < 6; k++) { R(x, l + 8, 2 + k * 3, 16, 3, rgba(brand, 0.9)); R(x, l + 9, 3 + k * 3, 14, 1, 'rgba(0,0,0,.35)'); }
        R(x, l + 4, 0, sw - 8, 1, 'rgba(60,60,60,.9)');
      }
      if (kind !== 'entrance' && kind !== 'staff' && kind !== 'blank') hang(String(row.sign ?? ''));
      else if (kind === 'staff' && row.sign) hang(String(row.sign));
    });
    for (let cx = 40; cx < w - 10; cx += 66) tube(x, o, String(p.light), cx, ceil, seed + cx);
    if (p.cameras !== false) for (let cx = 90; cx < w - 20; cx += 150) dome(x, t, cx, ceil, seed + cx);
    // the polished floor gives back the tubes
    for (let cx = 40; cx < w - 10; cx += 66) R(x, cx - 8, 0, 16, 1, 'rgba(255,255,255,.18)');
  },
});

export const aisleEndElement = piece({
  type: 'interior.aisle-end', label: 'Aisle end, seen end-on: end cap and number blade (kit)', category: 'furniture', libraryUse: 'reusable',
  fields: {
    number: num('Aisle number', 3, 0, 99), label: text('What is down the aisle', 'TINS · RICE'), promo: text('Card on the end cap (empty: none)', 'LIMIT 2'),
    width: num('Width', 36, 20, 80, 1, 'units'), height: num('Height', 60, 30, 90, 1, 'units'), blade: num('Blade over it at', 82, 0, 200, 1, 'units'),
    brand: colourField('Brand colour', '#b81f2a'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Math.max(Number(p.height), Number(p.blade) + 8) }),
  bounds: p => ({ x: -14, h: Math.max(Number(p.height), Number(p.blade) + 8), w: Number(p.width) + 28, tall: Math.max(Number(p.height), Number(p.blade) + 8) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, top: { x: Number(p.width) / 2, h: Number(p.height), role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), r = rng(Number(p.seed) * 17 + 1), brand = rgbField(p.brand, '184,31,42'), cx = w / 2;
    // the gondola's end: a plinth, uprights, stacked promotion
    R(x, -2, 0, w + 4, 5, '#2a2c2e'); R(x, 0, 5, w, H - 5, '#4a5056'); R(x, 0, H - 1, w, 1, 'rgba(255,255,255,.25)');
    R(x, 0, 5, 2, H - 5, '#6a7076'); R(x, w - 2, 5, 2, H - 5, '#6a7076');
    const promo = pick(r, GOODS_COLS);
    for (let sh = 6; sh < H - 8; sh += 11) {
      R(x, 2, sh, w - 4, 1, '#7a8086'); R(x, 2, sh + 1, w - 4, 1, 'rgba(250,214,60,.7)');
      // a pyramid of the same tin on the lower shelves, a mix higher up
      if (sh < 30) for (let k = 3; k < w - 6; k += 5) R(x, k, sh + 2, 4, 7, rgba(promo, 0.9)); else goods(x, 3, sh + 2, w - 6, 8, r, GOODS_COLS, 0.15);
    }
    const promoText = String(p.promo ?? '');
    if (promoText) { R(x, cx - 15, 32, 30, 12, 'rgba(250,214,60,.98)'); paintText(x, promoText, cx, y(38), 'rgba(170,20,20,.98)', 7, '700'); }
    // the blade above on its post: number big, the aisle's goods under it
    const b = Number(p.blade);
    if (b > H) {
      R(x, cx - 1, H, 2, b - H - 6, '#2a2c2e');
      R(x, cx - 16, b - 22, 32, 18, rgba(brand, 0.95)); R(x, cx - 16, b - 5, 32, 1, 'rgba(255,255,255,.35)');
      paintText(x, String(Number(p.number)), cx, y(b - 11), 'rgba(255,244,226,.98)', 11, '700');
      const lab = String(p.label ?? '');
      if (lab) { const lw = Math.max(30, textW(lab) + 8); R(x, cx - lw / 2, b - 32, lw, 10, 'rgba(240,236,226,.95)'); paintText(x, lab, cx, y(b - 27), 'rgba(30,30,30,.95)', 7, '600'); }
    }
    void o;
  },
});

const FRUITS: Record<string, string[]> = {
  apples: ['200,40,40', '230,70,50'], oranges: ['250,150,30', '240,130,20'], bananas: ['245,215,60', '230,200,50'], lemons: ['250,235,90', '240,225,70'],
  limes: ['120,190,60', '100,170,50'], melons: ['160,200,90', '200,200,120'], grapes: ['120,60,130', '150,80,160'], tomatoes: ['220,50,40', '200,40,30'], peppers: ['240,200,40', '220,50,40', '90,160,50'],
};
const fruitItem: Record<string, Field> = { kind: { kind: 'select', label: 'Fruit', options: Object.keys(FRUITS), default: 'apples' }, price: text('Price card', '2.40') };
const FRUIT_DEFAULT: Properties[] = [{ kind: 'oranges', price: '3.10' }, { kind: 'apples', price: '2.40' }, { kind: 'bananas', price: '1.90' }, { kind: 'limes', price: '0.60' }, { kind: 'grapes', price: '4.80' }, { kind: 'tomatoes', price: '2.20' }];

export const fruitDisplayElement = piece({
  type: 'interior.fruit-display', label: 'Fruit display: tiered crates, price cards, mist (kit)', category: 'furniture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 96, 40, 300, 1, 'units'), tiers: num('Tiers', 3, 1, 4),
    fruits: listOf('Crates (left to right, row by row)', fruitItem, 'Add crate', rows => ({ ...FRUIT_DEFAULT[rows.length % FRUIT_DEFAULT.length] }), FRUIT_DEFAULT),
    mist: bool('Mist bar', true), scale: bool('Hanging scale', true), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: 56 }),
  bounds: p => ({ x: 0, h: 58, w: Number(p.width), tall: 58 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, top: { x: Number(p.width) / 2, h: 40, role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), tiers = Number(p.tiers), seed = Number(p.seed), t = o.t, crates = (Array.isArray(p.fruits) ? p.fruits : []) as Properties[];
    // the stand: timber tiers stepping back and up, each a row of crates
    R(x, 2, 0, w - 4, 4, '#3a2614');
    const perRow = Math.max(1, Math.ceil(crates.length / tiers)), th = 11;
    for (let tr = 0; tr < tiers; tr++) {
      const b = 4 + tr * th, inset = tr * 4, cw = (w - 8 - inset * 2) / perRow;
      R(x, 4 + inset, b, w - 8 - inset * 2, th, '#5a3b20'); R(x, 4 + inset, b + th - 1, w - 8 - inset * 2, 1, 'rgba(240,190,120,.3)');
      for (let c = 0; c < perRow; c++) {
        const row = crates[tr * perRow + c]; if (!row) continue;
        const cols = FRUITS[String(row.kind)] ?? FRUITS.apples, cl = 4 + inset + c * cw;
        R(x, cl + 1, b + 1, cw - 2, 5, '#7a5530'); R(x, cl + 1, b + 3, cw - 2, 1, 'rgba(0,0,0,.25)');
        // the fruit heaped above the crate's rim
        for (let k = 0; k < Math.floor(cw / 2.5); k++) {
          const fx = cl + 2 + (k * 2.4) % (cw - 5), fh = b + 6 + Math.floor((k * 2.4) / (cw - 5)) * 2 + (k % 2), long = row.kind === 'bananas';
          R(x, fx, fh, long ? 4 : 2, 2, rgba(cols[k % cols.length], 0.95));
        }
        const price = String(row.price ?? '');
        if (price && tr === tiers - 1 || price && tr === 0) { R(x, cl + cw / 2 - 1, b + 6, 1, 6, '#2a2a2a'); R(x, cl + cw / 2 - 9, b + 11, 18, 9, 'rgba(250,250,240,.95)'); paintText(x, price, cl + cw / 2, y(b + 15.5), 'rgba(20,20,20,.95)', 7, '700'); }
      }
    }
    const topH = 4 + tiers * th;
    if (p.mist !== false || p.scale !== false) {
      // a bar on two posts over the stand: the mist nozzles, the scale hung from it
      R(x, 4, topH, 2, 52 - topH, '#6a7076'); R(x, w - 6, topH, 2, 52 - topH, '#6a7076'); R(x, 2, 50, w - 4, 2, '#7a8288');
      if (p.mist !== false) for (let k = 12; k < w - 10; k += 14) { R(x, k, 48, 2, 2, '#9aa2a8'); if (Math.floor(t / 300 + seed) % 2 === 0) for (let d = 0; d < 3; d++) R(x, k - 2 + d * 2, 44 - ((t * 0.3 + d * 3) % 8), 2, 1, 'rgba(220,235,240,.3)'); }
      if (p.scale !== false) { const sx = w - 20; R(x, sx, 38, 1, 12, '#2a2a2a'); R(x, sx - 5, 31, 11, 8, '#d8d8d0'); R(x, sx - 3, 33, 7, 4, '#202020'); R(x, sx, 34, 1, 2, 'rgba(255,60,50,.9)'); x.strokeStyle = 'rgba(200,200,200,.7)'; x.beginPath(); x.moveTo(sx - 6, y(24)); x.quadraticCurveTo(sx + 0.5, y(20), sx + 7, y(24)); x.stroke(); R(x, sx, 24, 1, 7, 'rgba(180,180,180,.6)'); }
    }
  },
});

export const GATE_STATES = ['cycle', 'idle', 'green', 'red'] as const;
export const securityGateElement = piece({
  type: 'interior.security-gate', label: 'ID gate: scanner posts, light bars, the screen (kit)', category: 'machines', libraryUse: 'reusable',
  fields: {
    lanes: num('Lanes', 2, 1, 4), lane: num('Lane width', 24, 16, 40, 1, 'units'), height: num('Post height', 46, 30, 70, 1, 'units'),
    state: select('State', GATE_STATES), label: text('Screen (empty: none)', 'SCAN ID'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.lanes) * (Number(p.lane) + 4) + 4, tall: Number(p.height) + 20 }),
  bounds: p => ({ x: -2, h: Number(p.height) + 22, w: Number(p.lanes) * (Number(p.lane) + 4) + 30, tall: Number(p.height) + 22 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, lane: { x: (Number(p.lane) + 4) / 2 + 2, h: 0, role: 'entrance' } }),
  paint(x, p, o) {
    const n = Number(p.lanes), lw = Number(p.lane), H = Number(p.height), t = o.t, seed = Number(p.seed);
    const st = String(p.state), now = st === 'cycle' ? (Math.floor(t / 140 + seed) % 6 === 4 ? 'red' : Math.floor(t / 140 + seed) % 3 === 0 ? 'green' : 'idle') : st;
    const col = now === 'red' ? '255,60,50' : now === 'green' ? '80,230,120' : '200,210,215';
    for (let i = 0; i <= n; i++) {
      const px = i * (lw + 4);
      // an acrylic post with a lit edge, a sensor head and a light bar
      R(x, px, 0, 4, H, 'rgba(210,225,232,.35)'); R(x, px, 0, 1, H, 'rgba(230,240,245,.7)'); R(x, px - 1, 0, 6, 3, '#2a2c30');
      R(x, px, H - 8, 4, 8, '#2a2c30'); R(x, px + 1, H - 6, 2, 4, rgba(col, now === 'red' && Math.floor(t / 8) % 2 ? 0.4 : 0.95));
      o.light?.(px + 2, H - 4, 4, 6, col, 'screen');
    }
    R(x, 0, 0, n * (lw + 4) + 4, 1, rgba(col, 0.35));
    const label = String(p.label ?? '');
    if (label) {
      const sx = n * (lw + 4) + 10;
      R(x, sx + 6, 0, 2, H - 4, '#3a3c40'); R(x, sx - 2, H - 4, 20, 16, '#0c0d0e'); R(x, sx - 1, H - 3, 18, 14, rgba(col, 0.25));
      paintText(x, now === 'red' ? 'NO ID' : now === 'green' ? 'OK' : label, sx + 7, y(H + 4), rgba(now === 'idle' ? '235,240,240' : col, 0.95), 7, '700');
      o.light?.(sx + 7, H + 4, 18, 14, col, 'screen');
    }
  },
});

export const selfCheckoutsElement = piece({
  type: 'interior.self-checkouts', label: 'Self-checkouts in a row, one refusing (kit)', category: 'machines', libraryUse: 'reusable',
  fields: {
    count: num('Checkouts', 4, 1, 10), spacing: num('Spacing', 40, 30, 80, 1, 'units'), alarm: num('Which one refuses (0: none)', 3, 0, 10),
    message: text('Its message (separate lines with |)', 'UNEXPECTED ITEM|IDENTITY NOT FOUND'), header: text('Sign over the row (empty: none)', 'SELF CHECKOUT · CARD OR ID'),
    gantry: num('Gantry height', 82, 0, 200, 1, 'units'), brand: colourField('Brand colour', '#b81f2a'), attendant: bool('Attendant’s podium', true), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.count) * Number(p.spacing) + (p.attendant !== false ? 26 : 6), tall: Math.max(60, Number(p.gantry) + 4) }),
  bounds: p => ({ x: -6, h: Math.max(60, Number(p.gantry) + 4), w: Number(p.count) * Number(p.spacing) + (p.attendant !== false ? 36 : 16), tall: Math.max(60, Number(p.gantry) + 4) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, refusing: { x: (Math.max(1, Number(p.alarm)) - 0.5) * Number(p.spacing), h: 0, role: 'mount' } }),
  paint(x, p, o) {
    const n = Number(p.count), sp = Number(p.spacing), alarm = Number(p.alarm), t = o.t, seed = Number(p.seed), brand = rgbField(p.brand, '184,31,42'), G = Number(p.gantry);
    const flash = Math.floor(t / 14) % 2 === 0, msg = lines(p.message), rowW = n * sp;
    // the gantry: two posts and a beam carrying the sign and the refusing machine's warning screen
    if (G > 60) {
      R(x, -2, 0, 3, G, '#55595e'); R(x, rowW - 1, 0, 3, G, '#55595e'); R(x, -4, G - 4, rowW + 8, 5, '#3a3d42'); R(x, -4, G, rowW + 8, 1, 'rgba(255,255,255,.2)');
      const head = String(p.header ?? '');
      // the sign keeps to the half of the beam the warning screen leaves free
      const late = alarm > 0 && alarm > n / 2, hx = alarm > 0 ? (late ? rowW * 0.3 : rowW * 0.7) : rowW / 2;
      if (head) neonPlate(x, t, hx, y(G - 10), { text: head, col: brand, size: 7, h: 11, w: textW(head) + 12, printed: true, bolts: false, glow: 0, fill: 'rgba(240,236,226,.95)', ink: rgba(brand, 1) });
    }
    for (let i = 0; i < n; i++) {
      const l = i * sp + 4, bad = alarm === i + 1, s = seed * 13 + i;
      // the cabinet at waist height, the scanner glass, the bagging shelf with a bag on its hooks
      R(x, l, 0, 24, 21, '#3c4046'); R(x, l, 20, 24, 1, 'rgba(255,255,255,.18)'); R(x, l + 2, 4, 20, 1, 'rgba(0,0,0,.35)');
      R(x, l - 2, 21, 28, 3, '#5a5f66'); R(x, l + 3, 23, 12, 1, bad && flash ? 'rgba(255,60,50,.95)' : 'rgba(255,80,60,.6)');
      R(x, l + 25, 21, 10, 2, '#6a6f75'); R(x, l + 26, 23, 1, 10, '#8a9096'); R(x, l + 33, 23, 1, 10, '#8a9096');
      R(x, l + 26, 23, 8, 8, bad ? 'rgba(240,240,232,.92)' : 'rgba(240,240,232,.55)'); if (bad) { R(x, l + 27, 26, 3, 4, 'rgba(240,160,40,.95)'); R(x, l + 30, 25, 3, 5, 'rgba(200,40,40,.9)'); }
      // the card reader and its light
      R(x, l + 18, 24, 5, 6, '#1c1e20'); R(x, l + 19, 28, 3, 1, bad ? 'rgba(255,60,50,.95)' : 'rgba(80,230,120,.85)');
      // the screen on its stem
      R(x, l + 8, 24, 2, 6, '#2a2c30'); R(x, l + 1, 30, 18, 14, '#111214');
      const scr = bad ? (flash ? '255,50,40' : '150,20,20') : '120,210,225';
      R(x, l + 2, 31, 16, 12, rgba(scr, bad ? 0.75 : 0.45));
      if (bad) { paintText(x, '!', l + 10, y(37), 'rgba(255,240,230,.98)', 9, '700'); }
      else { R(x, l + 4, 39, 12, 1, 'rgba(230,250,255,.7)'); R(x, l + 4, 36, 8, 1, 'rgba(230,250,255,.5)'); R(x, l + 4, 33, 10, 2, 'rgba(80,230,120,.7)'); }
      o.light?.(l + 10, 37, 16, 12, scr, 'screen');
      // the status light on its pole: steady, or red and blinking
      R(x, l + 21, 24, 1, 32, '#4a4e54'); R(x, l + 19, 56, 5, 5, '#1a1c1e');
      R(x, l + 20, 57, 3, 3, bad ? (flash ? 'rgba(255,60,50,1)' : 'rgba(120,20,20,.9)') : 'rgba(80,230,120,.9)');
      if (bad && flash) { const g = x.createRadialGradient(l + 21.5, y(58.5), 1, l + 21.5, y(58.5), 26); g.addColorStop(0, 'rgba(255,60,50,.35)'); g.addColorStop(1, 'rgba(255,60,50,0)'); x.fillStyle = g; x.fillRect(l - 6, y(84), 56, 52); }
      o.light?.(l + 21, 58, 4, 4, bad ? '255,60,50' : '80,230,120', 'screen');
      // the refusing machine's warning, on the beam right over it
      if (bad && G > 60 && msg.length) {
        const ww = Math.max(...msg.map(s2 => s2.length)) * 4.6 + 12, wh = msg.length * 9 + 6, cx = l + 12, top = G - 4;
        R(x, cx - ww / 2 + 6, top - 4, 1, 4, '#2a2c30'); R(x, cx + ww / 2 - 7, top - 4, 1, 4, '#2a2c30');
        R(x, cx - ww / 2 - 1, top - 5 - wh, ww + 2, wh + 2, '#0a0a0b'); R(x, cx - ww / 2, top - 4 - wh, ww, wh, flash ? 'rgba(200,24,24,.95)' : 'rgba(60,8,8,.95)');
        msg.forEach((s2, k) => paintText(x, s2, cx, y(top - 8 - k * 9), flash ? 'rgba(255,245,235,.98)' : 'rgba(255,90,70,.95)', 7, '700'));
        o.light?.(cx, top - 4 - wh / 2, ww, wh, '255,50,40', 'screen');
      }
      void s;
    }
    // the attendant's podium: a lectern with a screen nobody is looking at
    if (p.attendant !== false) { const l = rowW + 8; R(x, l, 0, 12, 30, '#3c4046'); R(x, l - 2, 30, 16, 3, '#5a5f66'); R(x, l, 33, 12, 7, '#111214'); R(x, l + 1, 34, 10, 5, 'rgba(120,210,225,.35)'); R(x, l + 2, 12, 8, 6, rgba(brand, 0.85)); }
  },
});

export const stockroomElement = piece({
  type: 'interior.stockroom', label: 'Stockroom and staff room above the shop (kit)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 540, 80, 3000, 1, 'units'), height: num('Storey height', 76, 50, 160, 1, 'units'),
    racks: num('Racking bays', 3, 0, 10), boxes: num('Stock on the racks', 0.75, 0, 1, 0.05), staff: bool('Staff corner: table, microwave, lockers', true),
    monitors: num('Camera monitors', 4, 0, 9), notice: text('Notice in the staff corner', 'LOSSES ARE DEDUCTED FROM WAGES'), light: select('Light', LIGHT_KINDS, 'flicker'),
    wall: colourField('Wall', '#262826'), brand: colourField('Brand colour', '#b81f2a'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => box(p),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, ceiling: { x: 0, h: Number(p.height), role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), seed = Number(p.seed), r = rng(seed * 53 + 11), t = o.t, brand = rgbField(p.brand, '184,31,42'), ceil = H - 6;
    R(x, 0, 0, w, H, hexOr(p.wall, '#262826')); R(x, 0, 0, w, 3, '#1c1d1c'); R(x, 0, ceil, w, 6, '#1a1b1a');
    // racking: orange uprights, blue beams, cartons with the brand's tape
    let at = 10;
    for (let b = 0; b < Number(p.racks) && at + 56 < w; b++, at += 58) {
      R(x, at, 0, 3, ceil - 4, '#c06a1c'); R(x, at + 52, 0, 3, ceil - 4, '#c06a1c');
      for (let lv = 1; lv < 4; lv++) {
        const bh = lv * 20 - 4; if (bh > ceil - 8) break;
        R(x, at, bh, 55, 3, '#2a4a8a');
        for (let k = at + 4; k < at + 50; k += 12) if (r() < Number(p.boxes)) { const bw = 10, tall = 8 + Math.round(r() * 7); R(x, k, bh + 3, bw, tall, 'rgba(176,130,80,.95)'); R(x, k + 4, bh + 3, 2, tall, rgba(brand, 0.75)); R(x, k, bh + 2 + tall, bw, 1, 'rgba(255,230,190,.3)'); }
      }
      if (r() < Number(p.boxes)) { R(x, at + 6, 0, 22, 4, '#6a4a2a'); R(x, at + 8, 4, 18, 12, 'rgba(176,130,80,.95)'); R(x, at + 8, 9, 18, 1, 'rgba(240,240,230,.5)'); }
    }
    // the staff corner: lockers, a table with two chairs, the microwave and kettle, the rota, the notice
    if (p.staff !== false && at + 120 < w) {
      for (let k = 0; k < 4; k++) { R(x, at + 6 + k * 11, 0, 10, 50, '#4a5258'); R(x, at + 7 + k * 11, 40, 8, 1, 'rgba(0,0,0,.4)'); R(x, at + 13 + k * 11, 26, 1, 4, '#9aa2a8'); }
      R(x, at + 6, 50, 44, 2, '#3a4248');
      const tl = at + 60;
      R(x, tl, 18, 40, 2, '#b8b0a0'); R(x, tl + 4, 0, 2, 18, '#5a5a5a'); R(x, tl + 34, 0, 2, 18, '#5a5a5a');
      // two stacking chairs pulled up to it, facing each other
      for (const [cx, d] of [[tl - 8, 1], [tl + 48, -1]] as const) { R(x, cx, 0, 1, 11, '#7a7e82'); R(x, cx + 7 * d, 0, 1, 11, '#7a7e82'); R(x, Math.min(cx, cx + 7 * d), 11, 8, 2, '#3a5a8a'); R(x, cx, 13, 1, 13, '#7a7e82'); R(x, cx - (d > 0 ? 0 : 1), 20, 2, 6, '#3a5a8a'); }
      R(x, tl + 14, 20, 6, 3, 'rgba(240,240,230,.8)'); R(x, tl + 22, 20, 4, 5, 'rgba(200,60,50,.85)');
      R(x, tl + 50, 0, 30, 24, '#4a4e52'); R(x, tl + 50, 24, 30, 2, '#6a6e72');
      R(x, tl + 52, 26, 16, 10, '#d8d8d0'); R(x, tl + 54, 28, 9, 6, '#1a1c1c'); R(x, tl + 64, 30, 2, 2, Math.floor(t / 40) % 2 ? 'rgba(80,230,120,.9)' : 'rgba(80,230,120,.3)');
      R(x, tl + 70, 26, 6, 7, '#c8c8c0'); steam(x, tl + 73, 33, t, seed, 2, 0.16, 10);
      { const nl = wrap(String(p.notice ?? ''), 18).slice(0, 3); if (nl.length) notice(x, tl + 20, Math.min(36, H - 10 - (nl.length * 8 + 7)), Math.max(...nl.map(s2 => textW(s2))) + 10, nl.length * 8 + 7, nl); }
      at = tl + 96;
    }
    // the camera wall: a desk and monitors showing the floor below; one feed is the refusing checkout
    const nm = Number(p.monitors);
    if (nm > 0 && at + 60 < w) {
      const cols = Math.min(3, nm), rws = Math.ceil(nm / cols), mw = 18, mh = 13, ml = at + 10, mb = 26;
      R(x, ml - 4, 0, cols * (mw + 2) + 18, 3, '#2a2c2e'); R(x, ml - 6, 20, cols * (mw + 2) + 22, 3, '#4a4e52'); R(x, ml - 4, 3, 2, 17, '#3a3c3e'); R(x, ml + cols * (mw + 2) + 12, 3, 2, 17, '#3a3c3e');
      for (let i = 0; i < nm; i++) {
        const cx = ml + (i % cols) * (mw + 2), ch = mb + Math.floor(i / cols) * (mh + 2), red = i === nm - 1 && Math.floor(t / 14) % 2 === 0;
        R(x, cx - 1, ch - 1, mw + 2, mh + 2, '#0b0c0d'); R(x, cx, ch, mw, mh, red ? 'rgba(200,40,40,.6)' : 'rgba(150,170,165,.35)');
        // the aisle from above: shelves as lines, a shopper as a moving dot
        for (let k = 0; k < 3; k++) R(x, cx + 2, ch + 2 + k * 4, mw - 4, 1, 'rgba(220,230,225,.35)');
        R(x, cx + 2 + Math.round(((t * 0.05 + i * 7) % (mw - 5))), ch + 3 + (i % 3) * 4, 2, 2, 'rgba(255,255,255,.85)');
        o.light?.(cx + mw / 2, ch + mh / 2, mw, mh, red ? '255,60,50' : '170,200,195', 'screen');
      }
      R(x, ml + 4, 23, 10, 2, '#1a1a1a'); R(x, ml + 20, 23, 6, 4, 'rgba(240,240,230,.7)');
      // the night man's chair: a seat on a gas stem, five feet on castors
      const ch = ml + 30; R(x, ch - 6, 0, 13, 1, '#2a2a2c'); R(x, ch, 1, 2, 10, '#3a3a3c'); R(x, ch - 5, 11, 12, 3, '#1e1e20'); R(x, ch + 6, 11, 2, 14, '#1e1e20');
      void rws;
    }
    for (let cx = 50; cx < w - 10; cx += 110) tube(x, o, String(p.light), cx, ceil, seed + cx, '220,232,228', 18);
  },
});

// ---------------------------------------------------------------- the 24h diner

export const dinerFrontElement = piece({
  type: 'everyday.diner-front', label: 'All-night diner front: chrome, long windows, neon name (Downtown)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 400, 120, 1600, 1, 'units'), height: num('Height', 86, 60, 160, 1, 'units'),
    name: text('Name in neon', 'MARLA’S'), sub: text('Under it (empty: none)', 'DINER · OPEN 24H'), neon: colourField('Neon', '#ff6a5a'),
    door: num('Door position (share of the width)', 0.72, 0, 1, 0.01), booths: bool('Booths and people seen inside', true), rain: bool('Rain running down the glass', true),
    panel: colourField('Enamel band', '#7a1f24'), lit: num('Lights on', 1, 0, 1, 0.05), exhaust: bool('Kitchen exhaust on the roof', true), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) + 20 }),
  bounds: p => ({ x: 0, h: Number(p.height) + 24, w: Number(p.width), tall: Number(p.height) + 24 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, roof: { x: 0, h: Number(p.height), role: 'mount' }, door: { x: Number(p.width) * Number(p.door), h: 0, role: 'entrance' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), seed = Number(p.seed), t = o.t, lit = Number(p.lit), nc = rgbField(p.neon, '255,106,90'), pan = rgbField(p.panel, '122,31,36');
    const band = 22, wl = 8, wr = w - 8, wb = band + 2, wt = H - 24, glow = 0.45 + 0.55 * o.lighting.lamps;
    // the body: stainless lower band, ribbed; the window band; the enamel band with the name
    R(x, 0, 0, w, H, '#141416');
    for (let k = 2; k < band; k += 3) R(x, 0, k, w, 1, 'rgba(200,205,210,' + (0.18 + 0.12 * ((k / 3) % 2)).toFixed(2) + ')');
    R(x, 0, band, w, 2, '#c8ccd0'); R(x, 0, 0, w, 2, '#0a0a0b');
    // through the glass: warm light, the booths' red backs, people at their tables, pendant lights
    R(x, wl, wb, wr - wl, wt - wb, rgba('255,200,140', 0.08 + 0.45 * lit * glow));
    for (let k = wl + 10; k < wr - 10; k += 40) { R(x, k + 12, wt - 10, 1, 8, 'rgba(0,0,0,.6)'); R(x, k + 10, wt - 13, 5, 3, rgba('255,230,180', 0.4 + 0.5 * lit)); }
    const dx = Math.round(w * Number(p.door)), doorL = clamp(dx - 14, wl, wr - 28);
    if (p.booths !== false) for (let k = wl + 6, i = 0; k < wr - 30; k += 52, i++) {
      if (k + 40 > doorL - 4 && k < doorL + 32) continue;
      R(x, k, wb, 6, 18, 'rgba(150,30,40,.9)'); R(x, k + 34, wb, 6, 18, 'rgba(150,30,40,.9)'); R(x, k + 12, wb + 10, 16, 2, 'rgba(220,210,190,.8)'); R(x, k + 19, wb, 2, 10, '#555');
      // the people at the table, drawn by the character kit and cut off by the sill; not every booth is taken
      x.save(); x.beginPath(); x.rect(wl, y(wt), wr - wl, wt - wb); x.clip();
      if (hash(seed + i) < 0.75) seated(x, o, k + 11, wb - 9, Math.floor(seed * 37 + i * 11), 1);
      if (hash(seed * 3 + i) < 0.5) seated(x, o, k + 29, wb - 9, Math.floor(seed * 53 + i * 7), -1);
      x.restore();
      R(x, k + 12, wb + 10, 16, 2, 'rgba(220,210,190,.8)'); R(x, k + 17, wb + 12, 2, 2, 'rgba(250,250,240,.8)');
    }
    o.light?.((wl + wr) / 2, (wb + wt) / 2, wr - wl, wt - wb, '255,200,140', 'window');
    // chrome mullions, the sheen, and rain running down the outside
    for (let k = wl; k <= wr; k += 52) R(x, Math.min(k, wr - 2), wb, 2, wt - wb, '#b8bec4');
    R(x, wl, wb, wr - wl, 1, '#d8dce0'); R(x, wl, wt - 1, wr - wl, 2, '#d8dce0');
    x.save(); x.beginPath(); x.rect(wl, y(wt), wr - wl, wt - wb); x.clip();
    for (let k = wl - 30; k < wr; k += 70) { x.fillStyle = 'rgba(255,255,255,.06)'; x.beginPath(); x.moveTo(k, y(wb)); x.lineTo(k + 10, y(wb)); x.lineTo(k + 34, y(wt)); x.lineTo(k + 24, y(wt)); x.closePath(); x.fill(); }
    if (p.rain !== false) for (let k = 0; k < (wr - wl) / 6; k++) {
      const rx = wl + hash(seed + k * 3.1) * (wr - wl), sp = 0.25 + hash(k * 7.7) * 0.5, len = 3 + Math.floor(hash(k * 1.3) * 6), ry = wt - ((t * sp + hash(k) * 200) % (wt - wb + 10));
      R(x, rx, ry, 1, len, 'rgba(210,225,240,.32)'); R(x, rx, ry, 1, 1, 'rgba(240,248,255,.6)');
    }
    // condensation fogging the bottom of the glass
    const fog = x.createLinearGradient(0, y(wb + 12), 0, y(wb)); fog.addColorStop(0, 'rgba(230,230,230,0)'); fog.addColorStop(1, 'rgba(230,230,230,.16)');
    x.fillStyle = fog; x.fillRect(wl, y(wb + 12), wr - wl, 12);
    x.restore();
    // the door: chrome frame, glass, the OPEN card hung inside, a step
    R(x, doorL - 2, 0, 32, wt + 2, '#c8ccd0'); R(x, doorL, 2, 28, wt - 3, '#1a1410'); R(x, doorL, 2, 28, wt - 3, rgba('255,200,140', 0.08 + 0.4 * lit * glow)); R(x, doorL + 2, 30, 24, 1, '#d8dce0');
    R(x, doorL + 24, 18, 2, 10, '#e0e4e8'); R(x, doorL + 6, 40, 16, 9, 'rgba(240,236,220,.95)'); paintText(x, 'OPEN', doorL + 14, y(44.5), 'rgba(170,25,25,.95)', 7, '700');
    R(x, doorL - 6, -2, 40, 2, '#3a3a3c');
    // the enamel band and the neon name on it
    R(x, 0, wt + 1, w, H - wt - 1, rgba(pan, 0.95)); R(x, 0, wt + 1, w, 1, '#d8dce0'); R(x, 0, H - 2, w, 2, '#c8ccd0');
    const name = String(p.name ?? ''), sub = String(p.sub ?? '');
    if (name) neon(x, t, name, w * 0.32, y(H - 11), nc, { size: 13, phase: seed * 7, bright: true });
    if (sub) neon(x, t, sub, w * 0.7, y(H - 11), '255,190,90', { size: 8, phase: seed * 3 + 40 });
    o.light?.(w * 0.32, H - 11, name.length * 9, 14, nc, 'screen');
    // the roof: a rounded edge, the exhaust hood breathing steam, a vent
    x.fillStyle = '#1c1c1f'; x.beginPath(); x.moveTo(0, y(H)); x.quadraticCurveTo(w / 2, y(H + 8), w, y(H)); x.closePath(); x.fill();
    R(x, 0, H, w, 1, 'rgba(200,205,210,.4)');
    if (p.exhaust !== false) { const ex = Math.round(w * 0.82); R(x, ex, H + 2, 14, 12, '#3a3c40'); R(x, ex - 2, H + 14, 18, 3, '#4a4e52'); steam(x, ex + 7, H + 18, t, seed, 4, 0.25, 26); }
  },
});

export const dinerSignElement = piece({
  type: 'everyday.diner-sign', label: 'Diner pole sign: neon box, chaser-bulb arrow (Downtown)', category: 'signage', libraryUse: 'reusable',
  fields: {
    height: num('Pole height', 120, 30, 400, 1, 'units'), text: text('Sign', 'DINER'), sub: text('Under it (empty: none)', 'OPEN 24H'),
    neon: colourField('Neon', '#ff6a5a'), arrow: bool('Chaser-bulb arrow', true), dead: num('Dead letter (0: none)', 3, 0, 12), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: 90, tall: Number(p.height) + 36 }),
  bounds: p => ({ x: -50, h: Number(p.height) + 40, w: 100, tall: Number(p.height) + 40 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, sign: { x: 0, h: Number(p.height) + 16, role: 'mount' } }),
  paint(x, p, o) {
    const H = Number(p.height), t = o.t, nc = rgbField(p.neon, '255,106,90'), s = String(p.text ?? ''), sub = String(p.sub ?? '');
    // the pole on its foot, the bracket, the box
    R(x, -2, 0, 4, H, '#1a1a1c'); R(x, -5, 0, 10, 4, '#2a2a2c'); R(x, -1, 0, 1, H, 'rgba(255,190,120,.18)');
    const bw = Math.max(70, s.length * 13 + 16), bl = -bw / 2, bb = H + 2, bh = 30;
    R(x, -12, H - 4, 24, 6, '#2a2a2c');
    R(x, bl - 2, bb - 2, bw + 4, bh + 4, '#d0d4d8'); R(x, bl, bb, bw, bh, '#140808');
    const g = x.createRadialGradient(0, y(bb + bh / 2), 4, 0, y(bb + bh / 2), bw * 0.8); g.addColorStop(0, rgba(nc, 0.18)); g.addColorStop(1, rgba(nc, 0));
    x.fillStyle = g; x.fillRect(bl - 30, y(bb + bh + 30), bw + 60, bh + 60);
    if (s) neon(x, t, s, 0, y(bb + bh - (sub ? 11 : 15)), nc, { size: 14, phase: Number(p.seed) * 9, dead: Number(p.dead) - 1, bright: true });
    if (sub) neon(x, t, sub, 0, y(bb + 7), '255,190,90', { size: 7, phase: Number(p.seed) * 5 + 77 });
    o.light?.(0, bb + bh / 2, bw, bh, nc, 'screen');
    // the arrow: a bent bar of bulbs chasing down towards the door
    if (p.arrow !== false) {
      const pts: [number, number][] = [];
      // under the box, pointing along the street to the door: a steel channel with bulbs chasing to its head
      const ah = bb - 12, a0 = bl + 4, a1 = bl + bw + 14, n = Math.floor((a1 - a0) / 6);
      R(x, a0 - 2, ah - 3, a1 - a0 + 2, 7, '#1a1a1c'); R(x, -1, ah + 4, 2, bb - ah - 4, '#2a2a2c');
      x.fillStyle = '#1a1a1c'; x.beginPath(); x.moveTo(a1, y(ah + 8)); x.lineTo(a1 + 12, y(ah)); x.lineTo(a1, y(ah - 8)); x.closePath(); x.fill();
      for (let k = 0; k < n; k++) pts.push([a0 + k * 6, ah - 1]);
      for (let k = 1; k < 3; k++) { pts.push([a1 + k * 4, ah + 6 - k * 3]); pts.push([a1 + k * 4, ah - 6 + k * 3]); }
      pts.push([a1 + 11, ah - 1]);
      pts.forEach(([px, ph], i) => { const on = i >= n || (Math.floor(t / 5) - i) % 4 === 0; R(x, px - 1, ph, 2, 2, on ? 'rgba(255,220,140,.98)' : 'rgba(120,90,50,.8)'); });
      o.light?.((a0 + a1) / 2, ah, a1 - a0, 4, '255,210,140', 'screen');
    }
  },
});

const MENU_DEFAULT = 'EGGS ANY STYLE 6|HASH BROWNS 3|PANCAKES 5|PIE OF THE DAY 4|COFFEE 2 · REFILLS 2';
export const dinerRoomElement = piece({
  type: 'interior.diner-room', label: 'Diner from inside: window wall, griddle, pie case, menu (kit)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 400, 120, 2000, 1, 'units'), height: num('Height', 86, 60, 160, 1, 'units'), windows: num('Window wall (share of the width)', 0.5, 0, 1, 0.01),
    rain: bool('Rain on the windows', true), blinds: bool('Blinds half down', true), griddle: bool('Griddle and hood', true), pie: bool('Pie case', true), coffee: bool('Coffee station', true),
    menu: text('Menu board (separate lines with |)', MENU_DEFAULT), plaque: text('Plaque (empty: none)', 'NO SLEEPING IN BOOTHS'), clock: bool('Wall clock', true),
    jukebox: bool('Jukebox at the back', true), restroom: text('Restroom door sign (empty: no door)', 'RESTROOMS CUSTOMERS ONLY'),
    wall: colourField('Wall', '#3a2c22'), tile: colourField('Wall tiles', '#d8d0c0'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => box(p),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, ceiling: { x: 0, h: Number(p.height), role: 'mount' }, kitchen: { x: Number(p.width) * Number(p.windows), h: 0, role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), seed = Number(p.seed), t = o.t, ceil = H - 5, split = Math.round(w * Number(p.windows)), tile = rgbField(p.tile, '216,208,192');
    R(x, 0, 0, w, H, hexOr(p.wall, '#3a2c22')); R(x, 0, ceil, w, 5, '#1e1612');
    // wainscot of small tiles, a black-and-white band at the top of it
    R(x, 0, 0, w, 26, rgba(tile, 0.55)); for (let k = 0; k < w; k += 4) R(x, k, 0, 1, 26, 'rgba(0,0,0,.08)'); for (let h = 4; h < 26; h += 4) R(x, 0, h, w, 1, 'rgba(0,0,0,.08)');
    for (let k = 0; k < w; k += 6) R(x, k, 26, 3, 3, (k / 6) % 2 ? 'rgba(20,20,20,.9)' : 'rgba(235,230,220,.9)');
    // the window wall: the side street through the glass, rain, blinds; the jukebox boxes on the sill
    if (split > 30) {
      const n = Math.max(1, Math.round(split / 64)), ww = (split - 12) / n;
      for (let i = 0; i < n; i++) {
        const l = 6 + i * ww, wb = 32, wt = ceil - 10, W = ww - 6;
        R(x, l - 2, wb - 2, W + 4, wt - wb + 4, '#c8ccd0');
        drawPane(x, l, y(wt), W, wt - wb, o.lighting, { facing: o.lighting.facing + 180, seed: seed + i * 17, horizon: 0.95 });
        // the far side of the street at night: a neon smear, a passing car's light now and then
        R(x, l, wb, W, 3, 'rgba(255,90,110,' + (0.15 + 0.1 * Math.sin(t / 40 + i)).toFixed(3) + ')');
        const car = (t * 1.4 + i * 90 + seed * 30) % 700; if (car < W) R(x, l + car, wb + 2, 6, 2, 'rgba(255,240,200,.7)');
        if (p.rain !== false) for (let k = 0; k < W / 3; k++) {
          const rx = l + hash(seed + i * 31 + k * 3.1) * W, sp = 0.25 + hash(k * 7.7 + i) * 0.5, len = 2 + Math.floor(hash(k * 1.3 + i) * 5), ry = wt - ((t * sp + hash(k + i) * 200) % (wt - wb));
          R(x, rx, ry, 1, len, 'rgba(200,215,235,.4)');
        }
        if (p.blinds !== false) { const down = Math.round((wt - wb) * (0.25 + 0.35 * hash(seed + i))); for (let k = 0; k < down; k += 2) R(x, l, wt - k - 1, W, 1, 'rgba(200,190,170,.3)'); R(x, l, wt - down - 1, W, 1, 'rgba(120,110,90,.9)'); }
        R(x, l + W / 2 - 1, wb, 2, wt - wb, '#c8ccd0');
        // the tableside jukebox selector under the window
        R(x, l + W / 2 - 5, 26, 10, 7, '#c8ccd0'); R(x, l + W / 2 - 4, 27, 8, 4, 'rgba(255,190,90,.55)');
      }
    }
    // the kitchen side: the back counter, coffee, the pie case, the griddle under its hood, the menu board
    const restroom = String(p.restroom ?? ''), back = (restroom ? 40 : 0) + (p.jukebox !== false ? 30 : 0), kl = split + 8, kr = w - 6 - back;
    if (back > 0) {
      // the back of the room: the jukebox glowing in the corner, the restroom door with its sign
      let bx = w - 6 - back + 4;
      if (p.jukebox !== false) {
        const jc = bx + 12, pulse = 0.6 + 0.4 * Math.sin(o.t / 9);
        R(x, bx, 0, 24, 30, '#3a1a14'); x.fillStyle = '#3a1a14'; x.beginPath(); x.arc(jc, y(30), 12, Math.PI, 0); x.fill();
        x.strokeStyle = rgba('255,150,60', 0.6 + 0.35 * pulse); x.lineWidth = 2; x.beginPath(); x.arc(jc, y(30), 10, Math.PI, 0); x.stroke(); x.lineWidth = 1;
        R(x, bx + 2, 4, 2, 26, rgba('255,90,110', 0.5 + 0.4 * pulse)); R(x, bx + 20, 4, 2, 26, rgba('255,90,110', 0.5 + 0.4 * pulse));
        R(x, bx + 6, 18, 12, 9, 'rgba(255,230,180,.55)'); for (let k = 0; k < 4; k++) R(x, bx + 7, 19 + k * 2, 10, 1, 'rgba(60,30,20,.6)');
        R(x, bx + 6, 6, 12, 8, '#20100c'); for (let k = bx + 7; k < bx + 18; k += 2) R(x, k, 7, 1, 6, 'rgba(200,190,170,.4)');
        o.light?.(jc, 24, 22, 24, '255,150,60', 'screen'); bx += 30;
      }
      if (restroom) {
        R(x, bx, 0, 30, 54, '#2a1e18'); R(x, bx + 2, 0, 26, 52, '#6a4a34'); R(x, bx + 22, 24, 3, 2, '#c8ccd0'); R(x, bx + 6, 44, 18, 4, 'rgba(0,0,0,.2)');
        const sl = wrap(restroom, 9).slice(0, 3); notice(x, bx + 15, 56, Math.max(...sl.map(q => textW(q))) + 6, sl.length * 8 + 6, sl, 'rgba(30,30,30,.92)', 'rgba(236,230,214,.92)', 'rgba(60,60,60,.9)');
      }
    }
    if (kr - kl > 40) {
      R(x, kl, 0, kr - kl, 24, '#5a5048'); R(x, kl, 24, kr - kl, 3, '#b8bcc0'); R(x, kl, 27, kr - kl, 1, 'rgba(255,255,255,.3)');
      let at = kl + 6;
      if (p.coffee !== false) {
        R(x, at, 27, 30, 18, '#2a2a2c'); R(x, at + 1, 44, 28, 2, '#5a5a5c');
        for (const k of [0, 1]) { R(x, at + 3 + k * 13, 27, 10, 2, 'rgba(255,120,50,.9)'); R(x, at + 4 + k * 13, 29, 8, 9, 'rgba(200,220,230,.3)'); R(x, at + 4 + k * 13, 29, 8, 4 + k * 2, 'rgba(60,30,15,.95)'); R(x, at + 11 + k * 13, 33, 2, 2, '#1a1a1a'); }
        steam(x, at + 8, 40, t, seed, 2, 0.18, 12); o.light?.(at + 15, 28, 26, 3, '255,120,50', 'screen');
        at += 38;
      }
      if (p.pie !== false) {
        // a glass case lit from inside: three shelves of pies, one slice gone
        R(x, at, 27, 34, 34, '#2a2a2c'); R(x, at + 1, 28, 32, 32, 'rgba(255,230,190,.28)'); R(x, at, 61, 34, 2, '#c8ccd0');
        for (let sh = 0; sh < 3; sh++) { const b = 30 + sh * 10; R(x, at + 2, b, 30, 1, 'rgba(255,255,255,.45)'); for (let k = 0; k < 2; k++) { const pc = ['200,120,60', '230,190,90', '160,40,60', '120,80,40'][(sh * 2 + k + seed) % 4]; R(x, at + 4 + k * 14, b + 1, 12, 4, 'rgba(220,180,120,.95)'); R(x, at + 5 + k * 14, b + 4, 10, 2, rgba(pc, 0.95)); } }
        R(x, at + 18, 51, 4, 3, '#2a2a2c');
        o.light?.(at + 17, 44, 30, 30, '255,230,190', 'window');
        at += 42;
      }
      if (p.griddle !== false && kr - at > 50) {
        // the flat-top: steel, a row of eggs and patties sizzling, steam and grease into the hood
        const gw = Math.min(70, kr - at - 4);
        R(x, at, 27, gw, 4, '#5a5e62'); R(x, at, 31, gw, 1, 'rgba(255,150,60,.6)');
        for (let k = at + 4; k < at + gw - 8; k += 11) { R(x, k, 31, 7, 2, k % 2 ? 'rgba(250,245,225,.95)' : 'rgba(110,60,30,.95)'); if (k % 2) R(x, k + 2, 32, 3, 1, 'rgba(250,200,40,.95)'); }
        for (let k = 0; k < 4; k++) { const sx = at + 6 + ((t * 0.7 + k * 17) % (gw - 12)); if (Math.floor(t / 3 + k) % 3 === 0) R(x, sx, 33 + (k % 3), 1, 1, 'rgba(255,200,120,.95)'); }
        steam(x, at + gw / 2, 34, t, seed, 5, 0.3, 26);
        // the hood with its filters and the heat lamp glow
        R(x, at - 4, ceil - 22, gw + 8, 20, '#7a7e82'); R(x, at - 2, ceil - 22, gw + 4, 3, '#9aa0a4');
        for (let k = at; k < at + gw; k += 5) R(x, k, ceil - 18, 3, 12, 'rgba(40,40,40,.4)');
        R(x, at - 4, ceil - 24, gw + 8, 2, 'rgba(255,140,60,.6)');
        o.light?.(at + gw / 2, 32, gw, 4, '255,140,60', 'screen');
        // the ticket rail with the night's orders
        R(x, at - 2, 46, gw + 4, 1, '#c8ccd0'); for (let k = 0; k < 5; k++) R(x, at + 2 + k * 12, 40, 8, 6, 'rgba(250,248,235,.92)');
        at += gw + 8;
      }
      // the menu board high up over the back counter, white letters on black
      const menu = lines(p.menu).slice(0, Math.max(0, Math.floor((ceil - 58) / 8)));
      if (menu.length) {
        const mw = Math.min(kr - kl - 12, Math.max(...menu.map(s => s.length)) * 4.6 + 14), mh = menu.length * 8 + 8, mb = ceil - mh - 2;
        const ml = p.griddle !== false ? kl + 6 : (kl + kr) / 2 - mw / 2;
        if (mb >= 46) {
          R(x, ml - 1, mb - 1, mw + 2, mh + 2, '#6a4a2a'); R(x, ml, mb, mw, mh, '#0e0e0e');
          menu.forEach((s, k) => paintText(x, s, ml + 6, y(mb + mh - 7 - k * 8), 'rgba(240,236,226,.92)', 7, '600', 'left'));
        }
      }
    }
    // the clock over the split, the plaque by the door
    if (p.clock !== false) { const cx = Math.max(12, split), ch = ceil - 12; x.fillStyle = 'rgba(240,236,226,.9)'; x.beginPath(); x.arc(cx, y(ch), 6, 0, Math.PI * 2); x.fill(); x.strokeStyle = '#2a2a2a'; x.stroke(); const a = (o.lighting.min / 60) / 12 * Math.PI * 2 - Math.PI / 2, m = (o.lighting.min % 60) / 60 * Math.PI * 2 - Math.PI / 2; x.beginPath(); x.moveTo(cx, y(ch)); x.lineTo(cx + Math.cos(a) * 3, y(ch) + Math.sin(a) * 3); x.moveTo(cx, y(ch)); x.lineTo(cx + Math.cos(m) * 5, y(ch) + Math.sin(m) * 5); x.stroke(); }
    const plaque = String(p.plaque ?? '');
    if (plaque && split > 60) neonPlate(x, t, Math.min(split - 50, 70), y(ceil - 4), { text: plaque, col: '30,30,30', size: 6, h: 9, printed: true, bolts: false, glow: 0, fill: 'rgba(236,230,214,.92)', ink: 'rgba(30,30,30,.95)' });
    for (let cx = 30; cx < w - 10; cx += 60) pendant(x, o, cx, ceil, 8, seed + cx);
  },
});

export const dinerCounterElement = piece({
  type: 'interior.diner-counter', label: 'Diner counter with stools (kit)', category: 'furniture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 200, 40, 1200, 1, 'units'), height: num('Counter height', 24, 16, 36, 1, 'units'), stools: num('Stools', 5, 0, 20),
    top: colourField('Counter top', '#d8d0c0'), front: colourField('Counter front', '#7a1f24'), seat: colourField('Stool seats', '#b02a34'),
    items: bool('Things on the counter', true), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) + 12 }),
  bounds: p => ({ x: 0, h: Number(p.height) + 12, w: Number(p.width), tall: Number(p.height) + 12 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, top: { x: 0, h: Number(p.height), role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), seed = Number(p.seed), t = o.t, front = rgbField(p.front, '122,31,36'), seat = rgbField(p.seat, '176,42,52');
    R(x, 0, 0, w, 3, '#1a1a1c'); R(x, 2, 3, w - 4, H - 4, rgba(front, 0.98));
    for (let h = 8; h < H - 2; h += 6) R(x, 2, h, w - 4, 1, 'rgba(255,255,255,.12)');
    R(x, 2, H - 6, w - 4, 2, '#c8ccd0');
    R(x, -2, H - 1, w + 4, 4, hexOr(p.top, '#d8d0c0')); R(x, -2, H - 1, w + 4, 1, '#9aa0a4'); R(x, -2, H + 2, w + 4, 1, 'rgba(255,255,255,.5)');
    if (p.items !== false) {
      const r = rng(seed * 7 + 5);
      for (let k = 10; k < w - 12; k += 22 + Math.round(r() * 18)) {
        const kind = Math.floor(r() * 4);
        if (kind === 0) { R(x, k, H + 3, 5, 5, 'rgba(240,240,235,.95)'); R(x, k + 5, H + 5, 1, 2, 'rgba(240,240,235,.9)'); steam(x, k + 2, H + 9, t, seed + k, 2, 0.15, 10); }
        else if (kind === 1) { R(x, k, H + 3, 6, 7, '#c8ccd0'); R(x, k + 1, H + 4, 4, 4, 'rgba(250,250,245,.9)'); }
        else if (kind === 2) { R(x, k, H + 3, 2, 7, 'rgba(200,30,30,.95)'); R(x, k + 3, H + 3, 2, 6, 'rgba(240,200,40,.95)'); }
        else { R(x, k - 2, H + 3, 12, 1, 'rgba(240,240,235,.9)'); R(x, k, H + 4, 8, 2, 'rgba(200,140,70,.9)'); }
      }
    }
    // stools in front: a chrome pole on a round foot, a red vinyl seat with a chrome rim
    const n = Number(p.stools), gap = n > 0 ? (w - 20) / n : 0;
    for (let i = 0; i < n; i++) {
      const cx = 10 + gap * (i + 0.5);
      R(x, cx - 5, 0, 10, 1, '#9aa0a4'); R(x, cx - 1, 1, 2, 14, '#b8bec4'); R(x, cx - 5, 15, 11, 1, '#c8ccd0'); R(x, cx - 5, 16, 11, 3, rgba(seat, 0.98)); R(x, cx - 4, 18, 9, 1, 'rgba(255,255,255,.25)');
      R(x, cx - 4, 6, 9, 1, '#8a9096');
    }
  },
});

export const dinerBoothsElement = piece({
  type: 'interior.diner-booths', label: 'Diner booths along the window (kit)', category: 'furniture', libraryUse: 'reusable',
  fields: {
    count: num('Booths', 3, 1, 12), booth: num('Booth width', 60, 44, 100, 1, 'units'), seat: colourField('Upholstery', '#8a1f2a'),
    table: colourField('Table top', '#d8d0c0'), items: bool('Plates and cups', true), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.count) * Number(p.booth), tall: 34 }),
  bounds: p => ({ x: 0, h: 34, w: Number(p.count) * Number(p.booth), tall: 34 }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' }, seat0: { x: 12, h: 13, role: 'mount' } }),
  paint(x, p, o) {
    const n = Number(p.count), bw = Number(p.booth), seat = rgbField(p.seat, '138,31,42'), seed = Number(p.seed), t = o.t;
    for (let i = 0; i < n; i++) {
      const l = i * bw, s = seed * 11 + i;
      // high-backed benches facing each other, a table on its pedestal between
      for (const [bx, d] of [[l, 1], [l + bw - 7, -1]] as const) {
        R(x, bx, 0, 7, 34, rgba(seat, 0.98)); R(x, bx + (d > 0 ? 6 : 0), 0, 1, 34, 'rgba(0,0,0,.35)');
        for (let h = 14; h < 33; h += 5) R(x, bx + 1, h, 5, 1, 'rgba(0,0,0,.18)');
        R(x, bx, 33, 7, 1, 'rgba(255,255,255,.25)');
        const sl = d > 0 ? bx + 7 : bx - 12; R(x, sl, 10, 12, 4, rgba(seat, 0.98)); R(x, sl, 13, 12, 1, 'rgba(255,255,255,.2)'); R(x, sl, 0, 12, 10, '#2a1a14');
      }
      const tc = l + bw / 2;
      R(x, tc - 1, 0, 3, 22, '#9aa0a4'); R(x, tc - 5, 0, 11, 1, '#9aa0a4'); R(x, tc - 11, 22, 23, 2, hexOr(p.table, '#d8d0c0')); R(x, tc - 11, 22, 23, 1, '#9aa0a4');
      if (p.items !== false) {
        R(x, tc - 9, 24, 7, 1, 'rgba(240,240,235,.95)'); if (hash(s) < 0.6) R(x, tc - 8, 25, 4, 1, 'rgba(250,200,40,.95)');
        R(x, tc + 3, 24, 4, 4, 'rgba(240,240,235,.95)'); steam(x, tc + 5, 28, t, s, 2, 0.14, 9);
        R(x, tc - 1, 24, 3, 5, '#c8ccd0');
      }
    }
  },
});

// ---------------------------------------------------------------- the roofs

export const roofDeckElement = piece({
  type: 'everyday.roof-deck', label: 'Roof deck: parapet, plant, tank, the stair hut (kit, Downtown)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 300, 40, 3000, 1, 'units'), parapet: num('Parapet height', 8, 0, 40, 1, 'units'),
    units: num('AC units and condensers', 3, 0, 12), condensers: bool('Big condensers (shop plant) instead of AC units', false),
    tank: select('Water tank', ['none', 'left', 'right'], 'right'), hut: select('Stair hut', ['none', 'left', 'right', 'hatch'], 'left'),
    vents: num('Vents', 2, 0, 8), dishes: num('Dishes', 1, 0, 4), cables: bool('Cable runs along the parapet', true), puddles: bool('Puddles', true),
    sign: text('Notice over the hut door (empty: none)', 'NO ACCESS'),
    hangout: select('Somebody’s hangout: bulbs on two poles, plastic chairs', ['none', 'left', 'middle', 'right'], 'none'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: 90 }),
  bounds: p => ({ x: 0, h: 96, w: Number(p.width), tall: 96 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, end: { x: Number(p.width), h: 0, role: 'mount' },
    hut: { x: p.hut === 'right' ? Number(p.width) - 26 : 26, h: 0, role: 'entrance' } }),
  paint(x, p, o) {
    const w = Number(p.width), seed = Number(p.seed), r = rng(seed * 19 + 3), t = o.t, par = Number(p.parapet), lamp = 0.4 + 0.6 * o.lighting.lamps;
    // the parapet behind, its coping lit by whatever light there is; the gravel and the tar
    if (par > 0) { R(x, 0, 0, w, par, '#1e1b1a'); R(x, 0, par, w, 2, '#4a4440'); R(x, 0, par + 1, w, 1, 'rgba(255,190,120,.25)'); }
    R(x, 0, 0, w, 2, '#2a2624'); for (let k = 0; k < w; k += 3) if (hash(seed + k) < 0.3) R(x, k, 1, 1, 1, 'rgba(200,190,170,.25)');
    if (p.cables !== false && par > 3) { x.strokeStyle = 'rgba(0,0,0,.8)'; x.beginPath(); x.moveTo(0, y(par - 2)); for (let k = 0; k < w; k += 30) x.quadraticCurveTo(k + 15, y(par - 5), k + 30, y(par - 2)); x.stroke(); }
    // keep the hut and the tank clear of the plant
    const hut = String(p.hut), tank = String(p.tank), hl = hut === 'right' ? w - 46 : 6, tl = tank === 'left' ? 8 : w - 50;
    const hg = String(p.hangout ?? 'none'), hs = Math.min(150, w * 0.5), hx = hg === 'left' ? 14 : hg === 'right' ? w - hs - 14 : (w - hs) / 2;
    const free = (l: number, wd: number) => !((hut === 'left' || hut === 'right') && l < hl + 44 && l + wd > hl - 4) && !(tank !== 'none' && l < tl + 46 && l + wd > tl - 4) && !(hg !== 'none' && l < hx + hs + 4 && l + wd > hx - 4);
    if (tank !== 'none') {
      // a timber tank on a steel stand, hoops round it, a conical cap and a ladder
      const tb = 26; R(x, tl + 4, 0, 2, tb, '#2a2a2c'); R(x, tl + 34, 0, 2, tb, '#2a2a2c'); R(x, tl + 2, tb, 36, 2, '#3a3a3c');
      x.strokeStyle = 'rgba(60,60,64,.9)'; x.beginPath(); x.moveTo(tl + 5, y(2)); x.lineTo(tl + 35, y(tb - 2)); x.moveTo(tl + 35, y(2)); x.lineTo(tl + 5, y(tb - 2)); x.stroke();
      R(x, tl + 4, tb + 2, 32, 30, '#4a3424'); for (let k = tl + 6; k < tl + 36; k += 4) R(x, k, tb + 2, 1, 30, 'rgba(0,0,0,.25)');
      for (const hh of [tb + 8, tb + 18, tb + 28]) R(x, tl + 3, hh, 34, 1, '#1a1a1a');
      x.fillStyle = '#3a2a1c'; x.beginPath(); x.moveTo(tl + 2, y(tb + 32)); x.lineTo(tl + 20, y(tb + 42)); x.lineTo(tl + 38, y(tb + 32)); x.closePath(); x.fill();
      for (let k = 2; k < tb + 30; k += 4) R(x, tl + 38, k, 4, 1, '#3a3a3c'); R(x, tl + 38, 0, 1, tb + 30, '#3a3a3c'); R(x, tl + 42, 0, 1, tb + 30, '#3a3a3c');
    }
    if (hut === 'left' || hut === 'right') {
      // the stair hut: a brick box, a steel door left ajar onto the light, a caged lamp, the notice
      R(x, hl, 0, 40, 56, '#3a2a24'); for (let h = 4; h < 56; h += 4) R(x, hl, h, 40, 1, 'rgba(0,0,0,.25)'); R(x, hl - 2, 56, 44, 3, '#4a4440');
      const dl = hl + 12; R(x, dl - 1, 0, 18, 34, '#1a1a1c'); R(x, dl, 0, 16, 33, rgba('255,220,160', 0.25 + 0.4 * lamp)); R(x, dl + 5, 0, 11, 33, '#4a5056'); R(x, dl + 7, 16, 1, 3, '#9aa0a4');
      R(x, dl + 5, 37, 6, 4, '#2a2a2c'); R(x, dl + 6, 38, 4, 2, rgba('255,220,160', 0.5 + 0.5 * lamp));
      const g = x.createRadialGradient(dl + 8, y(38), 1, dl + 8, y(38), 30); g.addColorStop(0, rgba('255,210,150', 0.25 * lamp)); g.addColorStop(1, 'rgba(255,210,150,0)'); x.fillStyle = g; x.fillRect(dl - 22, y(68), 60, 68);
      o.light?.(dl + 8, 38, 4, 2, '255,210,150', 'screen');
      const s = String(p.sign ?? ''); if (s) { const sl = wrap(s, 9).slice(0, 2); notice(x, hl + 20, 42, Math.min(38, Math.max(...sl.map(q => textW(q))) + 6), sl.length * 8 + 6, sl, 'rgba(160,25,25,.95)', 'rgba(236,230,214,.9)', 'rgba(60,60,60,.9)'); }
    } else if (hut === 'hatch') { R(x, 10, 0, 22, 6, '#3a3a3c'); R(x, 10, 6, 22, 2, '#5a5e62'); R(x, 12, 8, 18, 1, 'rgba(255,220,160,.4)'); }
    // the plant: AC units with turning fans, or big condensers humming for the chillers below
    const nu = Number(p.units);
    for (let i = 0, k = 0; i < nu && k < 200; k++) {
      const big = p.condensers === true, uw = big ? 40 : 18, uh = big ? 22 : 14, l = Math.round(10 + r() * (w - uw - 20));
      if (!free(l, uw)) continue; i++;
      R(x, l, 0, uw, 2, '#2a2a2c'); R(x, l + 1, 2, uw - 2, uh, big ? '#8a9096' : '#a8aca8'); R(x, l + 1, uh + 1, uw - 2, 1, 'rgba(255,255,255,.4)');
      const fans = big ? 2 : 1;
      for (let f = 0; f < fans; f++) {
        const fx = l + (big ? 11 + f * 18 : uw / 2), fy = 2 + uh / 2, rad = big ? 8 : 5;
        x.fillStyle = '#2a2c2e'; x.beginPath(); x.arc(fx, y(fy), rad, 0, Math.PI * 2); x.fill();
        x.strokeStyle = 'rgba(150,155,160,.8)'; x.beginPath();
        for (let b = 0; b < 3; b++) { const a = t * 0.5 + seed + i + b * 2.09; x.moveTo(fx, y(fy)); x.lineTo(fx + Math.cos(a) * (rad - 1), y(fy) + Math.sin(a) * (rad - 1)); }
        x.stroke();
      }
      if (big) { R(x, l + 2, uh + 2, 6, 6, '#5a5e62'); R(x, l + uw - 6, 2, 3, 30, '#4a4e52'); }
      else if (hash(seed + i) < 0.5) { R(x, l + 3, -1, 1, 1, 'rgba(160,190,210,.5)'); }
    }
    for (let i = 0, k = 0; i < Number(p.vents) && k < 100; k++) { const l = Math.round(10 + r() * (w - 30)); if (!free(l, 10)) continue; i++; R(x, l + 3, 0, 4, 10, '#4a4e52'); R(x, l, 10, 10, 3, '#5a5e62'); if (i % 2) steam(x, l + 5, 13, t, seed + i, 2, 0.12, 14); }
    for (let i = 0, k = 0; i < Number(p.dishes) && k < 100; k++) {
      const l = Math.round(16 + r() * (w - 40)); if (!free(l, 16)) continue; i++;
      R(x, l + 6, 0, 2, 12, '#3a3a3c'); x.fillStyle = '#c8ccd0'; x.beginPath(); x.ellipse(l + 7, y(18), 4, 8, -0.5, 0, Math.PI * 2); x.fill(); R(x, l + 9, 17, 4, 1, '#3a3a3c');
    }
    if (p.puddles !== false) for (let k = 0; k < Math.round(w / 90); k++) { const px = Math.round(hash(seed * 5 + k) * (w - 30)); R(x, px, 0, 14 + Math.round(hash(k) * 16), 1, rgba(o.lighting.daylight > 0.4 ? '200,215,230' : '255,180,120', 0.25)); }
    // a hangout: a string of bulbs between two poles, plastic chairs round a crate, a cooler
    const hang = String(p.hangout ?? 'none');
    if (hang !== 'none') {
      const span = Math.min(150, w * 0.5), hl0 = hang === 'left' ? 14 : hang === 'right' ? w - span - 14 : (w - span) / 2, ph = 34;
      for (const px of [hl0, hl0 + span]) { R(x, px - 1, 0, 2, ph, '#2a2a2c'); R(x, px - 3, 0, 6, 2, '#3a3a3c'); }
      x.strokeStyle = 'rgba(10,8,6,.9)'; x.beginPath(); x.moveTo(hl0, y(ph)); x.quadraticCurveTo(hl0 + span / 2, y(ph - 14), hl0 + span, y(ph)); x.stroke();
      for (let i = 1; i < 10; i++) { const f = i / 10, bx = hl0 + span * f, bh = ph - 1 - 14 * 2 * f * (1 - f) - 1, dead = hash(seed * 13 + i) < 0.15; R(x, bx - 1, bh - 2, 2, 2, dead ? '#3a2a1a' : rgba('255,210,140', 0.55 + 0.45 * lamp)); if (!dead && i % 3 === 1) o.light?.(bx, bh - 1, 3, 3, '255,200,130', 'screen'); }
      const cl = hl0 + span / 2 - 22;
      R(x, cl + 16, 0, 12, 9, '#6a4a2a'); R(x, cl + 16, 8, 12, 1, 'rgba(240,200,140,.3)'); R(x, cl + 19, 9, 2, 4, 'rgba(120,160,90,.9)'); R(x, cl + 23, 9, 2, 3, 'rgba(200,120,50,.9)');
      for (const [cx, d] of [[cl + 4, 1], [cl + 38, -1]] as const) { R(x, cx, 0, 1, 8, '#d8d8d0'); R(x, cx + 8 * d, 0, 1, 8, '#d8d8d0'); R(x, Math.min(cx, cx + 8 * d), 7, 9, 2, '#e0e0d8'); R(x, d > 0 ? cx : cx + 8 * d, 9, 1, 9, '#d8d8d0'); R(x, d > 0 ? cx : cx + 8 * d, 15, 2, 3, '#e0e0d8'); }
      R(x, cl + 50, 0, 14, 9, 'rgba(40,110,170,.95)'); R(x, cl + 50, 9, 14, 2, 'rgba(230,230,225,.95)');
    }
  },
});

export const ADS = ['registry', 'plaza', 'custom'] as const;
const AD_COPY: Record<string, { title: string; lines: string; small: string }> = {
  registry: { title: 'REGISTRY PREMIUM', lines: 'BE VERIFIED FIRST.|PRIORITY QUEUES · FAST APPEALS', small: 'SUBJECT TO SCORE · TERMS APPLY' },
  plaza: { title: 'PLAZA HOLDINGS', lines: 'THE CITY, MANAGED.|HOMES · SECURITY · SERVICES', small: 'A PLAZA COMPANY' },
  custom: { title: '', lines: '', small: '' },
};
export const billboardElement = piece({
  type: 'everyday.billboard', label: 'Rooftop billboard: back-lit ad, catwalk, lamps, ladder (Downtown)', category: 'signage', libraryUse: 'reusable',
  fields: {
    width: num('Width', 300, 80, 1200, 1, 'units'), panel: num('Panel height', 110, 40, 400, 1, 'units'), legs: num('Catwalk height over the roof', 40, 0, 200, 1, 'units'),
    ad: select('Advertiser', ADS), title: text('Headline (custom, or empty: the advertiser’s)', ''), lines: text('Copy (separate lines with |; empty: the advertiser’s)', ''),
    small: text('Small print (empty: the advertiser’s)', ''), gold: colourField('Gold', '#d8b45a'), back: colourField('Black of the panel', '#070605'),
    lamps: num('Lamps on goosenecks', 4, 0, 12), dead: num('Failing tube (0: none)', 2, 0, 12), ladder: select('Ladder up to the catwalk', ['left', 'right', 'none'], 'left'),
    shelter: bool('Someone’s shelter under the catwalk', true), box: num('Junction box on the catwalk (share of the width, 0: none)', 0.62, 0, 1, 0.01),
    seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.legs) + Number(p.panel) + 10 }),
  bounds: p => ({ x: -12, h: Number(p.legs) + Number(p.panel) + 12, w: Number(p.width) + 24, tall: Number(p.legs) + Number(p.panel) + 12 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, catwalk: { x: 0, h: Number(p.legs), role: 'mount' }, top: { x: 0, h: Number(p.legs) + Number(p.panel) + 8, role: 'mount' },
    ladder: { x: p.ladder === 'right' ? Number(p.width) + 4 : -4, h: 0, role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), P = Number(p.panel), L = Number(p.legs), seed = Number(p.seed), t = o.t, gold = rgbField(p.gold, '216,180,90'), lamp = 0.35 + 0.65 * o.lighting.lamps;
    const pb = L + 6, pt = pb + P, copy = AD_COPY[String(p.ad)] ?? AD_COPY.registry;
    const title = String(p.title || copy.title), body = lines(p.lines || copy.lines), small = String(p.small || copy.small);
    // the steel: legs and bracing from the roof to the catwalk, the frame up the back of the panel
    const legX: number[] = []; for (let k = 10; k < w - 4; k += Math.max(60, (w - 20) / Math.max(1, Math.round((w - 20) / 90)))) legX.push(Math.round(k)); legX.push(w - 14);
    for (const lx of legX) { R(x, lx, 0, 4, pt + 2, '#1c1d20'); R(x, lx, 0, 1, pt + 2, 'rgba(255,190,120,.15)'); R(x, lx - 3, 0, 10, 2, '#2a2b2e'); }
    x.strokeStyle = 'rgba(40,42,46,.95)'; x.lineWidth = 1;
    for (let i = 0; i + 1 < legX.length; i++) { x.beginPath(); x.moveTo(legX[i] + 2, y(2)); x.lineTo(legX[i + 1] + 2, y(L - 2)); x.moveTo(legX[i + 1] + 2, y(2)); x.lineTo(legX[i] + 2, y(L - 2)); x.stroke(); }
    if (L > 4) R(x, 0, L / 2, w, 2, '#26272a');
    // the shelter: a tarp slung from the catwalk to the roof, cardboard, a bedroll, a lamp, a bucket for the rain
    if (p.shelter !== false && L > 26 && legX.length > 1) {
      const sl = legX[0] + 6, sr = Math.min(legX[1] - 2, sl + 70);
      x.fillStyle = 'rgba(40,80,140,.92)'; x.beginPath(); x.moveTo(sl, y(L - 2)); x.lineTo(sr, y(L - 2)); x.lineTo(sr + 6, y(0)); x.lineTo(sr - 22, y(0)); x.lineTo(sl, y(L * 0.45)); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(20,40,80,.9)'; x.beginPath(); x.moveTo(sl + 10, y(L - 2)); x.lineTo(sr - 12, y(0)); x.stroke();
      R(x, sl + 2, 0, 30, 3, '#6a5034'); R(x, sl + 4, 3, 20, 3, 'rgba(120,60,50,.9)'); R(x, sl + 22, 3, 6, 3, 'rgba(200,190,170,.8)');
      R(x, sl + 36, 0, 7, 7, '#4a6a8a'); R(x, sl + 36, 6, 7, 1, 'rgba(180,220,240,.6)');
      R(x, sl + 30, 0, 3, 5, '#2a2a2a'); R(x, sl + 30, 5, 3, 2, rgba('255,200,120', 0.95));
      const g = x.createRadialGradient(sl + 31, y(6), 1, sl + 31, y(6), 24); g.addColorStop(0, 'rgba(255,190,110,.35)'); g.addColorStop(1, 'rgba(255,190,110,0)'); x.fillStyle = g; x.fillRect(sl + 7, y(30), 48, 30);
      o.light?.(sl + 31, 6, 4, 3, '255,190,110', 'screen');
    }
    // the panel: lit from behind, black field, a gold rule and the seal; one tube going
    R(x, -2, pb - 2, w + 4, P + 4, '#2a2b2e');
    R(x, 0, pb, w, P, hexOr(p.back, '#070605'));
    const back = x.createRadialGradient(w / 2, y(pb + P / 2), 10, w / 2, y(pb + P / 2), w * 0.7); back.addColorStop(0, rgba(gold, 0.1 * lamp + 0.03)); back.addColorStop(1, rgba(gold, 0));
    x.fillStyle = back; x.fillRect(0, y(pt), w, P);
    const dead = Number(p.dead);
    if (dead > 0) { const n = Math.max(2, Math.round(w / 40)), k = (dead - 1) % n, dl = Math.round(k * w / n), off = hash(Math.floor(t / 6) + seed) < 0.3; R(x, dl, pb, Math.round(w / n), P, off ? 'rgba(0,0,0,.55)' : 'rgba(0,0,0,.18)'); }
    R(x, 6, pb + 6, w - 12, 1, rgba(gold, 0.85)); R(x, 6, pt - 7, w - 12, 1, rgba(gold, 0.85)); R(x, 6, pb + 6, 1, P - 12, rgba(gold, 0.85)); R(x, w - 7, pb + 6, 1, P - 12, rgba(gold, 0.85));
    const seal = Math.min(P * 0.32, 34), sx = 14 + seal, sy = pb + P / 2;
    x.strokeStyle = rgba(gold, 0.95); x.lineWidth = 2; x.beginPath(); x.arc(sx, y(sy), seal, 0, Math.PI * 2); x.stroke(); x.lineWidth = 1;
    x.beginPath(); x.arc(sx, y(sy), seal * 0.72, 0, Math.PI * 2); x.stroke();
    R(x, sx - seal * 0.5, sy - 1, seal, 2, rgba(gold, 0.95)); R(x, sx - 1, sy - seal * 0.5, 2, seal, rgba(gold, 0.95));
    const tx = sx + seal + 12, tw = w - tx - 14;
    // the headline as large as fits the panel: measured, not guessed
    let ts = Math.max(9, Math.floor(P / 4.5));
    x.save(); for (; ts > 9; ts--) { x.font = mono(ts, '700'); if (x.measureText(title).width <= tw) break; } x.restore();
    if (title) paintText(x, title, tx, y(pt - 12 - ts / 2), rgba(gold, 0.98), ts, '700', 'left');
    body.forEach((s, i) => paintText(x, s, tx, y(pt - 22 - ts - i * 13), i === 0 ? 'rgba(245,238,220,.95)' : rgba(gold, 0.75), i === 0 ? 10 : 7, i === 0 ? '700' : '600', 'left'));
    if (small) paintText(x, small, tx, y(pb + 12), 'rgba(200,190,170,.6)', 7, '', 'left');
    o.light?.(w / 2, pb + P / 2, w, P, gold, 'screen');
    // the catwalk: grating on brackets, a toe board, a rail, the lamps on goosenecks throwing light up the face
    R(x, -6, L - 1, w + 12, 3, '#2e3034'); for (let k = -6; k < w + 6; k += 3) R(x, k, L - 1, 1, 3, 'rgba(0,0,0,.4)'); R(x, -6, L + 2, w + 12, 1, 'rgba(255,190,120,.3)');
    for (let k = -6; k <= w + 6; k += 24) R(x, k, L + 2, 1, 22, '#3a3c40');
    R(x, -6, L + 22, w + 12, 1, '#4a4c50'); R(x, -6, L + 12, w + 12, 1, '#3a3c40');
    const nl = Number(p.lamps);
    for (let i = 0; i < nl; i++) {
      const lx = Math.round((i + 0.5) * w / nl);
      x.strokeStyle = '#3a3c40'; x.beginPath(); x.moveTo(lx, y(L + 2)); x.quadraticCurveTo(lx, y(L + 30), lx + 8, y(L + 26)); x.stroke();
      R(x, lx + 6, L + 24, 6, 3, '#2a2c30'); R(x, lx + 7, L + 26, 4, 1, rgba('255,240,210', 0.4 + 0.55 * lamp));
      const g = x.createLinearGradient(0, y(L + 26), 0, y(pt)); g.addColorStop(0, rgba('255,240,210', 0.16 * lamp)); g.addColorStop(1, 'rgba(255,240,210,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(lx + 7, y(L + 27)); x.lineTo(lx + 11, y(L + 27)); x.lineTo(lx + 40, y(pt)); x.lineTo(lx - 22, y(pt)); x.closePath(); x.fill();
    }
    // the sign's junction box on the catwalk: the reason anyone climbs up here; its cyan tell blinks, conduit runs up the panel
    const jb = Number(p.box ?? 0);
    if (jb > 0) {
      const bx = Math.round(jb * w) - 8;
      R(x, bx + 6, L + 20, 3, pb - L - 18, '#2a2c30'); R(x, bx + 6, pb - 2, 3, 4, '#3a3c40');
      R(x, bx, L + 2, 18, 18, '#4a5258'); R(x, bx + 1, L + 3, 16, 16, '#5a646a'); R(x, bx + 1, L + 18, 16, 1, 'rgba(255,255,255,.25)');
      R(x, bx + 3, L + 6, 8, 6, '#3a4248'); R(x, bx + 14, L + 9, 1, 4, '#2a2c30');
      for (let k = 0; k < 3; k++) R(x, bx + 4 + k * 2, L + 14, 1, 2, 'rgba(250,214,60,.85)');
      const tell = Math.floor(t / 24) % 2 === 0; R(x, bx + 13, L + 15, 2, 2, tell ? 'rgba(0,255,255,1)' : 'rgba(0,140,150,.7)');
      if (tell) o.light?.(bx + 14, L + 16, 2, 2, '0,255,255', 'screen');
    }
    // the ladder from the roof to the catwalk, caged above head height
    const lad = String(p.ladder);
    if (lad !== 'none' && L > 6) {
      const lx = lad === 'right' ? w + 4 : -10;
      R(x, lx, 0, 1, L + 22, '#4a4c50'); R(x, lx + 6, 0, 1, L + 22, '#4a4c50'); for (let k = 4; k < L + 20; k += 5) R(x, lx, k, 7, 1, '#5a5c60');
      for (let k = 30; k < L + 20; k += 10) { x.strokeStyle = 'rgba(70,72,76,.9)'; x.beginPath(); x.arc(lx + 3.5, y(k), 6, Math.PI, 0); x.stroke(); }
    }
  },
});

export const roofPlankElement = piece({
  type: 'everyday.roof-plank', label: 'Across a gap: a plank, a grating or a ladder laid flat (kit)', category: 'architecture', libraryUse: 'reusable',
  fields: { width: num('Span', 40, 10, 300, 1, 'units'), kind: select('Kind', ['plank', 'grating', 'ladder'], 'plank'), rail: bool('A rope to hold', false), sag: num('Sag', 1, 0, 6, 0.5), seed: num('Seed', 1, 0, 1000000) },
  size: p => ({ w: Number(p.width), tall: 20 }),
  bounds: p => ({ x: -6, h: 22, w: Number(p.width) + 12, tall: 26 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, end: { x: Number(p.width), h: 0, role: 'mount' } }),
  paint(x, p) {
    const w = Number(p.width), kind = String(p.kind), sag = Number(p.sag);
    const at = (k: number) => -sag * 4 * (k / w) * (1 - k / w);
    for (let k = -6; k < w + 6; k += 2) {
      const h = at(clamp(k, 0, w));
      if (kind === 'plank') { R(x, k, h - 3, 2, 3, '#6a4a2a'); if (k % 10 === 0) R(x, k, h - 1, 1, 1, 'rgba(0,0,0,.4)'); R(x, k, h - 1, 2, 1, 'rgba(240,200,140,.25)'); }
      else if (kind === 'grating') { R(x, k, h - 3, 2, 3, k % 4 ? '#3a3c40' : '#5a5c60'); }
      else { R(x, k, h - 2, 2, 1, '#8a8f96'); R(x, k, h - 5, 2, 1, '#8a8f96'); if (k % 6 === 0) R(x, k, h - 5, 1, 4, '#9aa0a6'); }
    }
    if (p.rail === true) { x.strokeStyle = 'rgba(200,190,150,.8)'; x.beginPath(); x.moveTo(-4, y(18)); x.quadraticCurveTo(w / 2, y(12 - sag * 2), w + 4, y(18)); x.stroke(); R(x, -5, 0, 2, 20, '#3a3c40'); R(x, w + 3, 0, 2, 20, '#3a3c40'); }
  },
});

export const rainElement = piece({
  type: 'everyday.rain', label: 'Rain over an area, splashing on the ground (kit)', category: 'environment', libraryUse: 'reusable',
  fields: {
    width: num('Width', 1000, 20, 20000, 1, 'units'), height: num('Height', 420, 20, 2000, 1, 'units'), density: num('Density', 0.5, 0, 1, 0.05),
    slant: num('Slant', 0.25, -1, 1, 0.05), colour: colourField('Colour', '#a8bcd0'), when: select('When', ['always', 'weather'], 'always'), splash: bool('Splashes on the ground', true), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => box(p),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), seed = Number(p.seed), t = o.t, col = rgbField(p.colour, '168,188,208'), sl = Number(p.slant);
    const k = p.when === 'weather' ? clamp(o.lighting.w?.rain ?? 0, 0, 1) : 1, n = Math.round(w * H / 900 * Number(p.density) * k);
    if (n <= 0) return;
    x.strokeStyle = rgba(col, 0.32); x.lineWidth = 1; x.beginPath();
    for (let i = 0; i < n; i++) {
      const sp = 5 + hash(seed + i * 1.7) * 3, ph = hash(seed * 3 + i) * H, rx = (hash(seed + i * 9.1) * (w + 60)) - 30, ry = H - ((t * sp + ph) % H), len = 5 + hash(i) * 5;
      const cx = rx + (H - ry) * sl * 0.3; if (cx < 0 || cx > w) continue;
      x.moveTo(cx, y(ry)); x.lineTo(cx - sl * len, y(ry - len));
    }
    x.stroke();
    if (p.splash !== false) for (let i = 0; i < n / 8; i++) { const sx = hash(seed * 7 + i) * w, f = (t * 0.5 + hash(i) * 20) % 20; if (f < 4) R(x, sx - f / 2, 0, f + 1, 1, rgba(col, 0.4 - f * 0.08)); }
  },
});


export const roofSignElement = piece({
  type: 'everyday.roof-sign', label: 'Rooftop letters on a steel frame (kit, Downtown)', category: 'signage', libraryUse: 'reusable',
  fields: {
    text: text('Letters', 'FRESHCO'), size: num('Letter height', 26, 10, 80, 1, 'units'), legs: num('Frame height under the letters', 16, 0, 120, 1, 'units'),
    colour: colourField('Letters', '#fff3dc'), backing: colourField('Backing box', '#b81f2a'), leaf: colourField('Mark', '#7cc04a'),
    bulbs: bool('Bulbs round the box', true), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: signW(p), tall: Number(p.legs) + Number(p.size) + 12 }),
  bounds: p => ({ x: -4, h: Number(p.legs) + Number(p.size) + 12, w: signW(p) + 8, tall: Number(p.legs) + Number(p.size) + 12 }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  paint(x, p, o) {
    const s = String(p.text ?? ''), sz = Number(p.size), L = Number(p.legs), w = signW(p), bh = sz + 12, t = o.t, glow = 0.45 + 0.55 * o.lighting.lamps;
    const back = rgbField(p.backing, '184,31,42'), ink = rgbField(p.colour, '255,243,220'), leaf = rgbField(p.leaf, '124,192,74');
    // the frame: posts on base plates, X-bracing, a rail for whoever changes the bulbs
    const posts: number[] = []; for (let k = 6; k < w - 12; k += 46) posts.push(Math.round(k)); posts.push(Math.round(w - 8));
    for (const px of posts) { R(x, px, 0, 3, L + bh, '#1c1d20'); R(x, px - 3, 0, 9, 2, '#2a2b2e'); }
    x.strokeStyle = 'rgba(40,42,46,.95)'; x.lineWidth = 1;
    for (let i = 0; i + 1 < posts.length && L > 6; i++) { x.beginPath(); x.moveTo(posts[i] + 1, y(2)); x.lineTo(posts[i + 1] + 1, y(L)); x.moveTo(posts[i + 1] + 1, y(2)); x.lineTo(posts[i] + 1, y(L)); x.stroke(); }
    if (L > 4) R(x, 0, L - 2, w, 2, '#26272a');
    // the box and its letters, lit
    R(x, 0, L, w, bh, rgba(back, 0.55 + 0.4 * glow)); R(x, 0, L + bh - 1, w, 1, 'rgba(255,255,255,.3)'); R(x, 0, L, w, 1, 'rgba(0,0,0,.4)');
    x.fillStyle = rgba(leaf, 0.95); x.beginPath(); x.ellipse(sz * 0.8 + 4, y(L + bh / 2 + 1), sz * 0.45, sz * 0.26, -0.6, 0, Math.PI * 2); x.fill();
    paintText(x, s, sz * 1.6 + 8 + (w - sz * 1.6 - 16) / 2, y(L + bh / 2), rgba(ink, 0.75 + 0.25 * glow), sz, '700');
    if (p.bulbs !== false) for (let k = 4; k < w - 2; k += 8) for (const hh of [L + 2, L + bh - 3]) { const dead = hash(Number(p.seed) * 7 + k + hh) < 0.1; R(x, k, hh, 2, 1, dead ? '#3a2a1a' : rgba('255,230,170', 0.5 + 0.5 * glow * (0.85 + 0.15 * Math.sin(t / 13 + k)))); }
    o.light?.(w / 2, L + bh / 2, w, bh, back, 'screen');
  },
});

export const fireEscapeElement = piece({
  type: 'everyday.fire-escape', label: 'Fire escape: landings down a building face (kit; the flights are level stairs)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Landing width', 64, 30, 200, 1, 'units'), landings: num('Landings', 2, 1, 10), storey: num('Storey height', 66, 40, 120, 1, 'units'),
    top: num('Top landing height (from this piece’s foot)', 208, 40, 2000, 1, 'units'), door: bool('A window onto each landing', true),
    plants: bool('Pots and a chair on the top landing', true), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.top) + 36 }),
  bounds: p => ({ x: -4, h: Number(p.top) + 36, w: Number(p.width) + 8, tall: Number(p.top) + 36 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, top: { x: 0, h: Number(p.top), role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), n = Number(p.landings), st = Number(p.storey), top = Number(p.top), seed = Number(p.seed), lamp = 0.4 + 0.6 * o.lighting.lamps;
    for (let i = 0; i < n; i++) {
      const h = top - i * st; if (h < 10) break;
      // the opening onto the landing: a sash window, lit or dark
      if (p.door !== false) { R(x, w / 2 - 9, h + 4, 18, 30, '#0c0a09'); R(x, w / 2 - 8, h + 5, 16, 28, hash(seed + i) < 0.5 ? rgba('255,200,140', 0.2 + 0.4 * lamp) : '#15120f'); R(x, w / 2 - 8, h + 18, 16, 1, '#3a2a1c'); }
      // the grating, its brackets into the wall, the railing
      R(x, -2, h - 3, w + 4, 3, '#2a2b2e'); for (let k = -2; k < w + 2; k += 3) R(x, k, h - 3, 1, 3, 'rgba(0,0,0,.4)'); R(x, -2, h, w + 4, 1, 'rgba(255,190,120,.3)');
      x.strokeStyle = 'rgba(42,43,46,.95)'; x.beginPath(); x.moveTo(2, y(h - 3)); x.lineTo(10, y(h - 16)); x.moveTo(w - 2, y(h - 3)); x.lineTo(w - 10, y(h - 16)); x.stroke();
      R(x, -2, h + 20, w + 4, 1, '#3a3c40'); R(x, -2, h + 10, w + 4, 1, '#2e3034'); for (let k = -2; k <= w + 2; k += 8) R(x, k, h, 1, 20, '#34363a');
      if (p.plants !== false && i === 0) { R(x, w - 14, h, 7, 5, '#7a4a2a'); R(x, w - 13, h + 5, 5, 4, 'rgba(90,150,70,.9)'); }
    }
  },
});

export const deepGapElement = piece({
  type: 'everyday.deep-gap', label: 'Down a gap between buildings: walls falling away to the lit street (kit)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 30, 10, 200, 1, 'units'), height: num('Depth (roof to street)', 340, 40, 2000, 1, 'units'), light: colourField('Street light at the bottom', '#ffb35a'),
    escape: bool('Fire escape zigzag on one wall', true), cables: bool('Cables slung across', true), steam: bool('Steam rising', true), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => box(p),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, top: { x: 0, h: Number(p.height), role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), seed = Number(p.seed), t = o.t, col = rgbField(p.light, '255,179,90'), lamp = 0.4 + 0.6 * o.lighting.lamps;
    // the far wall: dark at the top, the street's light climbing it from below
    const g = x.createLinearGradient(0, y(H), 0, y(0)); g.addColorStop(0, '#050506'); g.addColorStop(0.65, '#0d0b0b'); g.addColorStop(1, rgba(col, 0.3 * lamp + 0.08));
    x.fillStyle = g; x.fillRect(0, y(H), w, H);
    // the inner faces of the two buildings, with a few lit windows down them
    R(x, 0, 0, 4, H, '#151416'); R(x, w - 4, 0, 4, H, '#121114');
    for (let h = 30; h < H - 20; h += 33) { if (hash(seed + h) < 0.35) R(x, 1, h, 2, 6, rgba('255,200,140', 0.5 * lamp)); if (hash(seed * 3 + h) < 0.3) R(x, w - 3, h + 10, 2, 6, rgba('255,200,140', 0.5 * lamp)); }
    // the street at the bottom: a lit strip, a car's lights now and then
    R(x, 4, 0, w - 8, 3, rgba(col, 0.5 + 0.4 * lamp)); const car = (t * 0.9 + seed * 40) % 260; if (car < w) R(x, car - 3, 1, 6, 2, 'rgba(255,240,210,.9)');
    if (p.escape !== false) for (let h = 40; h < H - 30; h += 66) { R(x, 4, h, Math.min(12, w - 10), 1, '#2e3034'); x.strokeStyle = 'rgba(46,48,52,.9)'; x.beginPath(); x.moveTo(5, y(h)); x.lineTo(Math.min(15, w - 6), y(h + 33)); x.stroke(); }
    if (p.cables !== false) { x.strokeStyle = 'rgba(0,0,0,.9)'; for (let k = 0; k < 3; k++) { const ch = H - 30 - k * 70 - hash(seed + k) * 20; x.beginPath(); x.moveTo(0, y(ch)); x.quadraticCurveTo(w / 2, y(ch - 8), w, y(ch + 2)); x.stroke(); } }
    if (p.steam !== false) for (let k = 0; k < 4; k++) { const f = (t * 0.25 + k * 60 + seed * 13) % H; R(x, w / 2 - 3 + Math.sin(t / 40 + k) * 3, f, 6, 3, 'rgba(200,200,200,' + (0.1 * (1 - f / H)).toFixed(3) + ')'); }
  },
});
const signW = (p: Properties) => Math.round(String(p.text ?? '').length * Number(p.size) * 0.66 + Number(p.size) * 1.6 + 20);

export const downtownEveryday: AssetDefinition[] = [
  freshcoFrontElement, trolleysElement, freshcoFloorElement, aisleEndElement, fruitDisplayElement, securityGateElement, selfCheckoutsElement, stockroomElement,
  dinerFrontElement, dinerSignElement, dinerRoomElement, dinerCounterElement, dinerBoothsElement,
  roofDeckElement, billboardElement, roofPlankElement, rainElement, roofSignElement, fireEscapeElement, deepGapElement,
];
