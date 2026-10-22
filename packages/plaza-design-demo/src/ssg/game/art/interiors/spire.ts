/**
 * INTERIOR KIT, spire: inside the monolith and up on it (Tommi, 2026-10-21: district interiors).
 *
 * The lobby (`spire-lobby`): an atrium of black stone and gold far too tall for the view, a wall-sized
 * slow screen, one long reception desk, ID gates, stone benches nobody uses, a mezzanine and a bank
 * of gold lift doors (the sky elevator to the decks).
 * - `interior.atrium`: back wall, columns and gold seams running up out of the view, galleries out of
 *   reach, daylight falling from the roof, the portal from inside, a polished floor.
 * - `interior.slow-screen`: the Registry seal turning very slowly, or a calm data picture.
 * - `interior.reception`, `interior.id-gates`, `interior.benches`, `interior.mezzanine`, `interior.lift-bank`.
 *
 * The deck (`spire-deck`): a docking deck above the weather.
 * - `deck.cloud-sea`: the sea of cloud to the horizon, the city's tallest towers poking through, wind.
 * - `deck.spire-wall`: the monolith's black face rising out of the view, with a crew bay at deck level.
 * - `deck.platform`: the cantilevered deck, its truss back to the wall, gold edge lights running to
 *   the pad, the tip's mast and windsock.
 * - `deck.landing-pad`: the pad and its craft: one that settles and leaves on a long cycle, or one parked for
 *   good (hatch lit, boarding ramp down, a power umbilical from a pedestal).
 * - `deck.lounge` and `deck.glass-front`: the glass-walled lounge cut into the wall (front on the shell).
 *
 * Everything is drawn in the piece's own frame: origin at its foot on the left, heights up (`y = -h`).
 * Black stone, gold seams, cold white light; nothing worn; almost no signage (ART-GUIDE).
 */
import type { Element, Properties } from '../core/composition';
import type { View } from '../core/view';
import { addLight } from '../atmosphere/lighting';
import { piece, num, select, bool, text, colour, isHex, rgbOf, rgba, hash, y, type Paint } from '../buildings/types';
import { rng } from '../core/primitives';
import { neonPlate } from '../signage/kit';
import { drawCraft, CRAFT_EXTENT, CRAFT_LEN } from '../vehicles/air-traffic';

const GOLD = '216,180,90', COLD = '220,232,245', RED = '255,42,68', GO = '120,230,160';
const hexOr = (v: unknown, d: string) => isHex(v) ? String(v) : d;
const rgbOr = (v: unknown, d: string) => isHex(v) ? rgbOf(String(v)) : d;
const ease = (v: number) => { const k = Math.max(0, Math.min(1, v)); return k * k * (3 - 2 * k); };
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const daylight = (o: Paint) => clamp01(o.lighting.daylight);
const toRgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
/** Two #rrggbb colours mixed (k 0: a, 1: b), as 'r,g,b'. */
const mix = (a: string, b: string, k: number) => { const A = toRgb(a), B = toRgb(b); return A.map((c, i) => Math.round(c + (B[i] - c) * clamp01(k))).join(','); };
/** The same mix as #rrggbb, to mix again. */
const mixHex = (a: string, b: string, k: number) => '#' + mix(a, b, k).split(',').map(c => Number(c).toString(16).padStart(2, '0')).join('');

/** A rect from height `h` up `tall` units, snapped to whole pixels. */
function box(x: CanvasRenderingContext2D, col: string, X: number, h: number, w: number, tall: number) {
  const l = Math.round(X), r = Math.round(X + w), t = Math.round(-(h + tall)), b = Math.round(-h);
  if (r <= l || b <= t) return;
  x.fillStyle = col; x.fillRect(l, t, r - l, b - t);
}
/** A ring of 2-unit dots (pixel-crisp), centred on screen-local (cx, cy). */
function ring(x: CanvasRenderingContext2D, cx: number, cy: number, r: number, col: string, from = 0, step = 2.2) {
  const n = Math.max(12, Math.round((2 * Math.PI * r) / step));
  x.fillStyle = col;
  for (let i = 0; i < n; i++) { const a = from + (i / n) * Math.PI * 2; x.fillRect(Math.round(cx + Math.cos(a) * r) - 1, Math.round(cy + Math.sin(a) * r) - 1, 2, 2); }
}
const stoneFields = () => ({ stone: colour('Stone', 'Black stone'), gold: colour('Gold', 'Spire gold') });

// ---------------------------------------------------------------- the lobby

export const atriumElement = piece({
  type: 'interior.atrium', label: 'Spire atrium (interior kit: black stone, gold, light from far above)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 1400, 100, 6000, 1, 'units'), height: num('Height (runs on out of the view)', 900, 150, 4000, 1, 'units'), ...stoneFields(),
    bay: num('Column spacing', 160, 40, 600, 1, 'units'), column: num('Column width', 26, 6, 120, 1, 'units'),
    seams: num('Gold seams', 0.6, 0, 1, 0.05), galleryFrom: num('First gallery above (out of reach)', 360, 60, 4000, 1, 'units'),
    galleries: num('Gallery spacing (0: none)', 140, 0, 600, 1, 'units'),
    shafts: num('Daylight from the roof', 0.6, 0, 1, 0.05), slant: num('Light slant', 0.3, -1, 1, 0.05), sheen: num('Floor polish', 0.6, 0, 1, 0.05),
    entry: num('Portal from the left (inside)', 40, 0, 6000, 1, 'units'), entryWidth: num('Portal width (0: none)', 110, 0, 400, 1, 'units'),
    entryHeight: num('Portal height', 170, 40, 600, 1, 'units'), cut: bool('Cut walls at both ends', true), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.height), w: Number(p.width), tall: Number(p.height) + 60 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, end: { x: Number(p.width), h: 0, role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), st = hexOr(p.stone, '#0a0a0d'), g = rgbOr(p.gold, GOLD), bay = Number(p.bay), cw = Number(p.column);
    const seams = Number(p.seams), d = daylight(o), t = o.t, r = rng(Number(p.seed) * 977 + 3), sheen = Number(p.sheen);
    // the back wall, lighter towards the roof far above
    box(x, st, 0, 0, w, H);
    const sky = x.createLinearGradient(0, y(H), 0, y(120)); sky.addColorStop(0, rgba(COLD, 0.05 + 0.1 * d)); sky.addColorStop(1, rgba(COLD, 0));
    x.fillStyle = sky; x.fillRect(0, y(H), w, H - 120);
    for (let k = 20; k < w; k += 40) box(x, 'rgba(255,255,255,.018)', k, 0, 1, H);
    for (let h = 80; h < H; h += 80) box(x, 'rgba(0,0,0,.35)', 0, h, w, 1);
    // galleries nobody down here reaches: thin ledges, a row of small cold lights
    const gs = Number(p.galleries);
    if (gs > 0) for (let h = Number(p.galleryFrom), n = 0; h < H; h += gs, n++) {
      box(x, '#141419', 0, h - 4, w, 4); box(x, rgba(g, 0.35), 0, h, w, 1);
      for (let k = 14 + (n % 3) * 7; k < w; k += 28) box(x, rgba(COLD, 0.2 + 0.2 * (n % 2)), k, h - 3, 2, 1);
    }
    // columns, each with a gold seam breathing slowly, an uplight at the foot
    for (let cx = bay / 2; cx < w - cw / 2; cx += bay) {
      const l = Math.round(cx - cw / 2);
      box(x, '#15151a', l, 0, cw, H); box(x, rgba(COLD, 0.16), l, 0, 1, H); box(x, 'rgba(0,0,0,.4)', l + cw - 2, 0, 2, H);
      box(x, rgba(g, Math.max(0, seams * (0.35 + 0.15 * Math.sin(t / 110 + cx * 0.03)))), l + Math.floor(cw / 2), 8, 1, H - 8);
      box(x, '#1b1b21', l - 3, 0, cw + 6, 8); box(x, rgba(g, 0.6), l - 3, 8, cw + 6, 1);
      const up = x.createLinearGradient(0, y(8), 0, y(90)); up.addColorStop(0, rgba(g, 0.08 + 0.12 * (1 - d))); up.addColorStop(1, rgba(g, 0));
      x.fillStyle = up; x.fillRect(l, y(90), cw, 82);
    }
    // daylight falling from the roof in slanted shafts, pooling on the floor
    const sh = Number(p.shafts) * (0.25 + 0.75 * d), sl = Number(p.slant);
    if (sh > 0) for (let cx = bay; cx < w; cx += bay * 2) {
      const x0 = cx - 30, x1 = cx + 30 + Math.floor(r() * 30), dx = sl * H;
      x.fillStyle = rgba(COLD, 0.045 * sh); x.beginPath();
      x.moveTo(x0 + dx, y(H)); x.lineTo(x1 + dx, y(H)); x.lineTo(x1, 0); x.lineTo(x0, 0); x.closePath(); x.fill();
      box(x, rgba(COLD, 0.1 * sh), x0, 0, x1 - x0, 2);
    }
    // the portal from inside: the plaza's daylight, the gold frame, the light spilling in
    const ew = Number(p.entryWidth), ex = Number(p.entry), eh = Number(p.entryHeight);
    if (ew > 0) {
      box(x, '#000000', ex - 6, 0, ew + 12, eh + 8);
      box(x, rgba(COLD, 0.3 + 0.4 * d), ex, 0, ew, eh); box(x, rgba('120,130,145', 0.5), ex, 0, ew, 10);
      for (let k = 1; k < 4; k++) box(x, 'rgba(0,0,0,.35)', ex + Math.round((ew * k) / 4), 0, 1, eh - 4);
      box(x, rgba(g, 0.85), ex - 3, eh, ew + 6, 3); box(x, rgba(g, 0.85), ex - 3, 0, 3, eh); box(x, rgba(g, 0.85), ex + ew, 0, 3, eh);
      o.light?.(ex + ew / 2, eh / 2, ew, eh, COLD, 'window');
      const sp = x.createLinearGradient(ex, 0, ex + ew * 3, 0); sp.addColorStop(0, rgba(COLD, 0.1 + 0.12 * d)); sp.addColorStop(1, rgba(COLD, 0));
      x.fillStyle = sp; x.fillRect(ex, y(2), ew * 3, 2);
    }
    // the polished floor (the strip below the walking line): a gold inlay, reflections
    box(x, '#070709', 0, -60, w, 60); box(x, rgba(COLD, 0.35), 0, -1, w, 1); box(x, rgba(g, 0.5), 0, -9, w, 1);
    if (sheen > 0) {
      for (let cx = bay / 2; cx < w - cw / 2; cx += bay) box(x, rgba(COLD, 0.05 * sheen), Math.round(cx - cw / 2), -40, cw, 39);
      if (ew > 0) box(x, rgba(COLD, (0.12 + 0.15 * d) * sheen), ex, -30, ew, 29);
    }
    if (p.cut !== false) for (const cx0 of [0, w - 12]) { box(x, '#151519', cx0, -60, 12, H + 60); box(x, rgba(g, 0.5), cx0 === 0 ? 11 : w - 12, 0, 1, H); }
  },
});

/** The Registry's seal: two rings, slow ticks turning between them, the Spire as a blade in the middle. */
function seal(x: CanvasRenderingContext2D, cx: number, cy: number, R: number, ink: string, k: number, t: number, caption: string) {
  const breathe = 0.75 + 0.25 * Math.sin(t / 90);
  ring(x, cx, cy, R, rgba(ink, 0.7 * k * breathe)); ring(x, cx, cy, R * 0.8, rgba(ink, 0.45 * k));
  x.fillStyle = rgba(GOLD, 0.6 * k);
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2 + t * 0.0015; x.fillRect(Math.round(cx + Math.cos(a) * R * 0.9) - 1, Math.round(cy + Math.sin(a) * R * 0.9) - 1, 2, 2); }
  const bw = Math.max(2, Math.round(R * 0.16)), top = Math.round(cy - R * 0.5), foot = Math.round(cy + R * 0.48);
  x.fillStyle = rgba(ink, 0.85 * k); x.fillRect(Math.round(cx - bw / 2), top, bw, foot - top);
  for (let j = 1; j * 2 < bw + 2; j++) x.fillRect(Math.round(cx - bw / 2) + j, top - j * 2, Math.max(1, bw - j * 2), 2);
  x.fillRect(Math.round(cx - R * 0.42), foot, Math.round(R * 0.84), 2);
  if (caption) { x.save(); x.font = '600 6px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = rgba(ink, 0.7 * k); x.fillText(caption, Math.round(cx), Math.round(cy + R + 8)); x.restore(); }
}
/** A calm picture: a field of dots lit slowly by a sweep (everyone indexed), three slow lines. */
function calmData(x: CanvasRenderingContext2D, x0: number, W: number, H: number, ink: string, k: number, t: number, seed: number) {
  const left = x0 + 10, right = W - 10, dw = Math.max(1, right - left), sweep = left + ((t * 0.25) % dw);
  for (let h = Math.round(H * 0.55); h < H - 8; h += 6) for (let c = left; c < right; c += 6) {
    const on = c < sweep, odd = hash(seed * 7 + c * 13 + h) < 0.04;
    x.fillStyle = rgba(odd && on ? GOLD : ink, (on ? 0.45 : 0.1) * k); x.fillRect(c, y(h), 2, 2);
  }
  box(x, rgba(ink, 0.25 * k), left, Math.round(H * 0.5), dw, 1);
  for (let i = 0; i < 3; i++) {
    x.fillStyle = rgba(i === 1 ? GOLD : ink, 0.5 * k);
    for (let c = left; c < right; c += 2) { const hh = H * (0.24 + i * 0.07) + Math.sin((c + seed * 31) * 0.035 + t * 0.008 + i * 2) * H * 0.06; x.fillRect(c, Math.round(y(hh)), 2, 1); }
  }
}

export const slowScreenElement = piece({
  type: 'interior.slow-screen', label: 'Wall-sized slow screen (interior kit: the Registry seal, calm data)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 320, 40, 2000, 1, 'units'), height: num('Height', 150, 20, 1000, 1, 'units'), shows: select('Shows', ['seal', 'data', 'both'], 'both'),
    speed: num('Speed', 0.3, 0, 2, 0.05), glow: num('Brightness', 0.6, 0, 1, 0.05), ink: select('Light', ['cold', 'gold'], 'cold'),
    caption: text('Caption under the seal (empty: none)', ''), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width) + 12, tall: Number(p.height) + 12 }),
  bounds: p => ({ x: -6, h: Number(p.height) + 6, w: Number(p.width) + 12, tall: Number(p.height) + 12 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, middle: { x: Number(p.width) / 2, h: Number(p.height) / 2, role: 'mount' } }),
  paint(x, p, o) {
    const W = Number(p.width), H = Number(p.height), k = Number(p.glow), ink = p.ink === 'gold' ? GOLD : COLD, t = o.t * Number(p.speed);
    // set flush into the stone: a black recess, gold hairlines
    box(x, '#030304', -6, -6, W + 12, H + 12); box(x, rgba(GOLD, 0.55), -6, H + 5, W + 12, 1); box(x, rgba(GOLD, 0.3), -6, -6, W + 12, 1);
    box(x, '#0a0c10', 0, 0, W, H);
    for (let h = 2; h < H; h += 3) box(x, 'rgba(255,255,255,.015)', 0, h, W, 1);
    const showSeal = p.shows !== 'data', showData = p.shows !== 'seal', sw = showSeal && showData ? Math.min(W * 0.4, H * 1.1) : W;
    if (showSeal) seal(x, sw / 2, y(H / 2), Math.max(6, Math.min(sw, H) * 0.36), ink, k, t, String(p.caption ?? ''));
    if (showData) calmData(x, showSeal ? sw : 0, W, H, ink, k, t, Number(p.seed));
    // a faint glare across the glass
    x.fillStyle = 'rgba(255,255,255,.025)'; x.beginPath(); x.moveTo(W * 0.55, y(H)); x.lineTo(W * 0.75, y(H)); x.lineTo(W * 0.5, 0); x.lineTo(W * 0.3, 0); x.closePath(); x.fill();
    o.light?.(W / 2, H / 2, W, H, ink, 'screen');
  },
});

export const receptionElement = piece({
  type: 'interior.reception', label: 'Reception desk (interior kit: one long stone counter)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 200, 40, 1000, 1, 'units'), height: num('Counter height', 24, 12, 44, 1, 'units'), ...stoneFields(),
    screens: num('Screens on the desk', 2, 0, 10), glow: num('Screen glow', 0.6, 0, 1, 0.05), plaque: text('Plaque on the front (empty: none)', ''),
  },
  size: p => ({ w: Number(p.width) + 6, tall: Number(p.height) + 16 }),
  bounds: p => ({ x: -3, h: Number(p.height) + 14, w: Number(p.width) + 6, tall: Number(p.height) + 16 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, top: { x: Number(p.width) / 2, h: Number(p.height), role: 'surface' } }),
  paint(x, p, o) {
    const W = Number(p.width), H = Number(p.height), st = hexOr(p.stone, '#101014'), g = rgbOr(p.gold, GOLD), n = Number(p.screens), k = Number(p.glow);
    box(x, 'rgba(0,0,0,.45)', -2, -2, W + 4, 2);
    box(x, st, 0, 0, W, H - 3); box(x, 'rgba(0,0,0,.5)', 0, 0, W, 3);
    for (let c = 24; c < W; c += 48) box(x, 'rgba(255,255,255,.03)', c, 3, 1, H - 6);
    box(x, rgba(g, 0.55), 0, Math.round(H * 0.45), W, 1);
    // the top: an overhanging slab, its front edge in gold, lit along the top
    box(x, '#1d1d23', -3, H - 3, W + 6, 3); box(x, rgba(g, 0.8), -3, H - 3, W + 6, 1); box(x, rgba(COLD, 0.45), -3, H, W + 6, 1);
    // screens seen from behind, their light on whoever sits there
    for (let i = 0; i < n; i++) {
      const sx = Math.round((W * (i + 1)) / (n + 1));
      box(x, '#0b0c0e', sx - 1, H, 2, 2); box(x, '#0b0c0e', sx - 8, H + 2, 16, 10); box(x, rgba(COLD, 0.25 * k + 0.05), sx - 8, H + 12, 16, 1);
      if (k > 0) o.light?.(sx, H + 8, 14, 8, COLD, 'screen');
    }
    const plaque = String(p.plaque ?? '');
    if (plaque) neonPlate(x, o.t, W / 2, y(Math.round(H * 0.72)), { text: plaque, col: g, size: 6, h: 9, printed: true, bolts: false });
  },
});

export const idGatesElement = piece({
  type: 'interior.id-gates', label: 'ID gates (interior kit: turnstile lanes, glass flaps, scanners)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    lanes: num('Lanes', 4, 1, 16), lane: num('Lane width', 22, 12, 60, 1, 'units'), height: num('Post height', 24, 12, 44, 1, 'units'),
    glass: num('Glass flaps', 0.6, 0, 1, 0.05), cycle: num('Someone passes every (frames)', 300, 60, 3000, 10), refuse: num('Share refused', 0.2, 0, 1, 0.05),
    ...stoneFields(), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.lanes) * Number(p.lane) + 5, tall: Number(p.height) + 2 }),
  bounds: p => ({ x: 0, h: Number(p.height) + 2, w: Number(p.lanes) * Number(p.lane) + 5, tall: Number(p.height) + 4 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, end: { x: Number(p.lanes) * Number(p.lane) + 5, h: 0, role: 'mount' } }),
  paint(x, p, o) {
    const n = Number(p.lanes), L = Number(p.lane), H = Number(p.height), g = rgbOr(p.gold, GOLD), st = hexOr(p.stone, '#17181d'), cyc = Number(p.cycle), seed = Number(p.seed);
    box(x, rgba(g, 0.45), 0, -2, n * L + 5, 1);
    const status: string[] = [];
    for (let i = 0; i < n; i++) {
      const ph = hash(seed * 31 + i) * cyc, u = ((o.t + ph) % cyc) / cyc, visit = Math.floor((o.t + ph) / cyc);
      const refused = hash(seed * 17 + i * 7 + visit * 13) < Number(p.refuse);
      const open = refused ? 0 : u < 0.12 ? ease(u / 0.12) : u < 0.3 ? 1 : u < 0.42 ? 1 - ease((u - 0.3) / 0.12) : 0;
      status.push(u < 0.3 ? (refused ? RED : GO) : '');
      // two glass leaves that fold into the posts
      const px = i * L + 5, leaf = ((L - 5) / 2) * (1 - open);
      if (leaf >= 1) for (const lx of [px, px + L - 5 - leaf]) { box(x, rgba(COLD, 0.08 + 0.22 * Number(p.glass)), lx, 8, leaf, H - 12); box(x, rgba(COLD, 0.5), lx, H - 5, leaf, 1); }
    }
    for (let i = 0; i <= n; i++) {
      const px = i * L, s = status[i] ?? status[i - 1] ?? '';
      box(x, st, px, 0, 5, H); box(x, rgba(COLD, 0.25), px, 0, 1, H); box(x, rgba(g, 0.8), px, H, 5, 1);
      box(x, '#08080a', px + 1, H - 6, 3, 3); box(x, s ? rgba(s, 0.9) : rgba(g, 0.35), px + 1, H - 5, 3, 1);
      if (s) o.light?.(px + 2, H - 5, 3, 2, s, 'screen');
    }
  },
});

export const benchesElement = piece({
  type: 'interior.benches', label: 'Stone benches (interior kit: a waiting area nobody uses)', category: 'architecture', libraryUse: 'reusable',
  fields: { count: num('Benches', 2, 1, 10), width: num('Bench width', 46, 16, 160, 1, 'units'), gap: num('Gap', 18, 0, 200, 1, 'units'), seat: num('Seat height', 10, 6, 24, 1, 'units'), ...stoneFields() },
  size: p => ({ w: Number(p.count) * (Number(p.width) + Number(p.gap)), tall: Number(p.seat) + 2 }),
  bounds: p => ({ x: 0, h: Number(p.seat) + 1, w: Number(p.count) * (Number(p.width) + Number(p.gap)) - Number(p.gap), tall: Number(p.seat) + 8 }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  paint(x, p) {
    const n = Number(p.count), w = Number(p.width), gap = Number(p.gap), s = Number(p.seat), st = hexOr(p.stone, '#121216'), g = rgbOr(p.gold, GOLD);
    for (let i = 0; i < n; i++) {
      const bx = i * (w + gap);
      box(x, 'rgba(0,0,0,.45)', bx, -2, w, 2); box(x, st, bx + 4, 0, w - 8, s - 3);
      box(x, '#1b1b21', bx, s - 3, w, 3); box(x, rgba(g, 0.6), bx, s - 2, w, 1); box(x, rgba(COLD, 0.35), bx, s, w, 1);
      box(x, 'rgba(255,255,255,.03)', bx, -7, w, 5);
    }
  },
});

export const mezzanineElement = piece({
  type: 'interior.mezzanine', label: 'Mezzanine (interior kit: stone slab, glass balustrade, one column)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 540, 40, 4000, 1, 'units'), thickness: num('Slab thickness', 12, 4, 40, 1, 'units'), rail: num('Balustrade height (0: none)', 26, 0, 60, 1, 'units'),
    glass: num('Glass', 0.5, 0, 1, 0.05), downlights: num('Lights under the slab', 0.7, 0, 1, 0.05),
    column: bool('A column down to the floor', true), support: num('Column from the left', 100, 0, 4000, 1, 'units'), clearance: num('Height over the floor below', 140, 20, 1000, 1, 'units'),
    ...stoneFields(),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.rail) + 2 }),
  bounds: p => ({ x: 0, h: Number(p.rail) + 2, w: Number(p.width), tall: Number(p.rail) + 2 + Number(p.clearance) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, end: { x: Number(p.width), h: 0, role: 'mount' } }),
  paint(x, p) {
    const W = Number(p.width), T = Number(p.thickness), R = Number(p.rail), C = Number(p.clearance), g = rgbOr(p.gold, GOLD), st = hexOr(p.stone, '#0d0d11'), dl = Number(p.downlights);
    if (p.column !== false) {
      const cx = Number(p.support);
      box(x, '#141419', cx - 5, -C, 10, C - T); box(x, rgba(COLD, 0.18), cx - 5, -C, 1, C - T); box(x, rgba(g, 0.5), cx, -C + 6, 1, C - T - 6);
      box(x, '#1b1b21', cx - 8, -C, 16, 6); box(x, rgba(g, 0.6), cx - 8, -C + 6, 16, 1);
    }
    // light cones under the slab
    if (dl > 0) for (let c = 20; c < W - 6; c += 40) {
      const cone = x.createLinearGradient(0, y(-T - 1), 0, y(-T - 70)); cone.addColorStop(0, rgba(COLD, 0.07 * dl)); cone.addColorStop(1, rgba(COLD, 0));
      x.fillStyle = cone; x.beginPath(); x.moveTo(c, y(-T - 1)); x.lineTo(c + 3, y(-T - 1)); x.lineTo(c + 16, y(-T - 70)); x.lineTo(c - 13, y(-T - 70)); x.closePath(); x.fill();
      box(x, rgba(COLD, 0.8 * dl), c, -T - 1, 3, 1);
    }
    box(x, st, 0, -T, W, T); box(x, rgba(g, 0.5), 0, -T, W, 1); box(x, rgba(COLD, 0.4), 0, -1, W, 1);
    for (let c = 30; c < W; c += 60) box(x, 'rgba(255,255,255,.035)', c, -T + 2, 1, T - 4);
    box(x, '#1a1a20', 0, -T, 2, T);
    if (R > 0) {
      box(x, '#141419', 0, 0, W, 2); box(x, rgba(COLD, 0.04 + 0.08 * Number(p.glass)), 0, 2, W, R - 2);
      for (let c = 0; c <= W - 1; c += 60) box(x, 'rgba(20,20,26,.9)', Math.min(c, W - 1), 2, 1, R - 2);
      box(x, rgba(g, 0.85), 0, R, W, 1); box(x, rgba(COLD, 0.35), 0, R + 1, W, 1);
    }
  },
});

export const liftBankElement = piece({
  type: 'interior.lift-bank', label: 'Lift bank (interior kit: gold doors, the sky elevator)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    count: num('Lifts', 3, 1, 10), width: num('Door width', 40, 20, 120, 1, 'units'), height: num('Door height', 58, 44, 160, 1, 'units'), gap: num('Gap', 18, 0, 120, 1, 'units'),
    cycle: num('A car arrives every (frames)', 1100, 120, 20000, 10), indicators: bool('Floor indicators', true), label: text('Plaque over the bank (empty: none)', ''),
    ...stoneFields(), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.count) * Number(p.width) + (Number(p.count) - 1) * Number(p.gap) + 24, tall: Number(p.height) + 26 }),
  bounds: p => { const w = Number(p.count) * Number(p.width) + (Number(p.count) - 1) * Number(p.gap) + 24; return { x: 0, h: Number(p.height) + 26, w, tall: Number(p.height) + 26 }; },
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, middle: { x: (Number(p.count) * Number(p.width) + (Number(p.count) - 1) * Number(p.gap) + 24) / 2, h: 0, role: 'entrance' } }),
  paint(x, p, o) {
    const n = Number(p.count), W = Number(p.width), H = Number(p.height), gap = Number(p.gap), cyc = Number(p.cycle), seed = Number(p.seed), g = rgbOr(p.gold, GOLD);
    const total = n * W + (n - 1) * gap + 24;
    box(x, hexOr(p.stone, '#060608'), 0, 0, total, H + 26); box(x, rgba(g, 0.5), 0, H + 25, total, 1); box(x, rgba(g, 0.3), 0, 0, 1, H + 26); box(x, rgba(g, 0.3), total - 1, 0, 1, H + 26);
    for (let i = 0; i < n; i++) {
      const lx = 12 + i * (W + gap), u = ((o.t + hash(seed * 13 + i) * cyc) % cyc) / cyc;
      const open = u < 0.06 ? ease(u / 0.06) : u < 0.22 ? 1 : u < 0.28 ? 1 - ease((u - 0.22) / 0.06) : 0;
      // the car behind the doors: cold white, a ceiling light
      box(x, rgba(COLD, 0.55), lx, 0, W, H); box(x, 'rgba(255,255,255,.3)', lx + 2, H - 4, W - 4, 2);
      if (open > 0.05) { o.light?.(lx + W / 2, H / 2, W * open, H, COLD, 'window'); box(x, rgba(COLD, 0.15 * open), lx, -8, W, 7); }
      // brushed gold leaves sliding apart
      const leaf = Math.round((W / 2) * (1 - open));
      for (const [l0, lw] of [[lx, leaf], [lx + W - leaf, leaf]] as const) if (lw > 0) {
        box(x, '#7a6638', l0, 0, lw, H);
        for (let c = l0 + 2; c < l0 + lw; c += 3) box(x, 'rgba(255,230,170,.07)', c, 0, 1, H);
        box(x, 'rgba(255,236,190,.35)', l0, 0, 1, H);
      }
      if (leaf > 0) box(x, 'rgba(0,0,0,.5)', lx + leaf - 1, 0, 1, H);
      box(x, rgba(g, 0.9), lx - 2, 0, 2, H + 2); box(x, rgba(g, 0.9), lx + W, 0, 2, H + 2); box(x, rgba(g, 0.9), lx - 2, H, W + 4, 2);
      if (p.indicators !== false) {
        const pos = open > 0 ? 1 : clamp01((u - 0.28) / 0.72);
        box(x, '#0a0a0c', lx + W / 2 - 6, H + 6, 12, 5); box(x, rgba(g, 0.9), lx + W / 2 - 5 + Math.round(pos * 8), H + 7, 2, 3);
      }
    }
    const label = String(p.label ?? '');
    if (label) neonPlate(x, o.t, total / 2, y(H + 19), { text: label, col: g, size: 6, h: 9, printed: true, bolts: false });
  },
});

// ---------------------------------------------------------------- the deck

/** Drawn in its own frame without culling (a craft that flies far beyond its pad), its lights on the scene's light layer. */
function framed(x: CanvasRenderingContext2D, v: View, at: { x: number; h: number; scale: number; facing: number; parallax: number }, paint: (o: Paint) => void) {
  const light = at.parallax === 1 ? (lx: number, lh: number, lw: number, hh: number, col: string, kind: 'window' | 'screen') =>
    addLight(v, { x: at.x + lx * at.scale * at.facing, h: at.h + lh * at.scale, kind, w: lw * at.scale, hh: hh * at.scale, r: kind === 'screen' ? 40 : 14, col, a: kind === 'screen' ? 0.45 : 0.6 }) : undefined;
  x.save(); x.translate(v.sx(at.x), v.y(at.h)); x.scale(at.scale * at.facing, at.scale);
  try { paint({ t: v.t, lighting: v.lighting, view: v, ...(light ? { light } : {}) }); } finally { x.restore(); }
}

export const cloudSeaElement: Element = {
  type: 'deck.cloud-sea', version: 1, label: 'Sea of cloud, towers poking through (Spire deck, distance)', category: 'environment', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: {
    width: num('Width', 4000, 200, 40000, 10, 'units'), parallax: num('Parallax (0: fixed, 1: with the deck)', 0.2, 0, 1, 0.01),
    horizon: num('Horizon height', 70, -200, 400, 1, 'units'), below: num('Clouds down to (below the deck)', 120, 0, 600, 1, 'units'),
    banks: num('Cloud banks', 5, 1, 8), drift: num('Drift', 0.3, 0, 3, 0.05), towers: num('Towers poking through', 7, 0, 20),
    towerMax: num('Tallest tower over the horizon', 200, 20, 600, 1, 'units'), haze: num('Haze', 0.5, 0, 1, 0.05),
    cloud: colour('Cloud colour', 'By the clock'), wind: num('Wind streaks', 0.4, 0, 1, 0.05), seed: num('Seed', 1, 0, 1000000),
  },
  bounds: (p, _s, c) => {
    const par = Number(p.parallax), at = c?.placement, shift = at && c ? (c.view.cam * (at.parallax - par)) / (at.scale * at.facing) : 0, tall = Number(p.horizon) + Number(p.towerMax) + 40;
    return { x: shift, h: tall, w: Number(p.width), tall: tall + Number(p.below) };
  },
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  draw(x, v, p: Properties, _s, _pass, at) {
    const par = Number(p.parallax), hz = Number(p.horizon), d = clamp01(v.lighting.daylight), seed = Number(p.seed), t = v.t;
    const left = Math.max(0, Math.floor(v.sx(at.x, par))), right = Math.min(v.viewW, Math.ceil(v.sx(at.x + Number(p.width), par)));
    if (right <= left) return;
    const base = v.y(at.h), Y = (h: number) => Math.round(base - h);
    const top = isHex(p.cloud) ? String(p.cloud) : mixHex('#1a2030', '#e2e7ee', d);
    const shade = mixHex(top, '#3a4658', 0.55), haze = Number(p.haze);
    // the haze over the horizon
    const glow = x.createLinearGradient(0, Y(hz + 70), 0, Y(hz)); glow.addColorStop(0, rgba(mix(top, '#ffffff', 0.2), 0)); glow.addColorStop(1, rgba(mix(top, '#ffffff', 0.2), 0.35 * (0.4 + 0.6 * haze)));
    x.fillStyle = glow; x.fillRect(left, Y(hz + 70), right - left, 70);
    // the towers: dark slabs, hazed by distance, a cold rim, a beacon on top
    const r = rng(seed * 131 + 7);
    for (let i = 0; i < Number(p.towers); i++) {
      const wx = r() * Number(p.width), tw = 8 + Math.floor(r() * 18), th = hz + 16 + Math.floor(r() * (Number(p.towerMax) - 16)), hk = haze * (0.4 + 0.6 * r()), bl = r();
      const sx = Math.round(v.sx(at.x + wx, par));
      if (sx + tw < left || sx > right) continue;
      x.fillStyle = 'rgb(' + mix('#0e1014', top, hk * 0.7) + ')'; x.fillRect(sx, Y(th), tw, Y(hz - 40) - Y(th));
      x.fillRect(sx + 2, Y(th + 6), tw - 4, 6); x.fillRect(sx + (tw >> 1), Y(th + 18), 1, 12);
      x.fillStyle = rgba(COLD, 0.25 * (1 - hk)); x.fillRect(sx + tw - 1, Y(th), 1, Y(hz - 40) - Y(th));
      if (d < 0.6) { x.fillStyle = rgba('255,214,150', 0.45 * (1 - d)); for (let k = th - 8; k > hz; k -= 9) if (hash(seed + i * 31 + k) < 0.4) x.fillRect(sx + 2 + Math.floor(hash(i + k) * (tw - 5)), Y(k), 2, 1); }
      x.fillStyle = Math.floor((t + bl * 300) / 45) % 2 === 0 ? rgba(RED, 0.9) : rgba(RED, 0.25); x.fillRect(sx + (tw >> 1) - 1, Y(th + 19), 3, 2);
    }
    // the banks, far (flat, pale, at the horizon) to near (big billows below the deck, faster)
    const banks = Number(p.banks), below = Number(p.below), drift = Number(p.drift);
    for (let b = 0; b < banks; b++) {
      const f = banks === 1 ? 1 : b / (banks - 1), hb = hz - Math.pow(f, 1.2) * (hz + below - 20), amp = 3 + f * 22, fr = 0.05 - f * 0.035;
      const bpar = par * (1 + f * 2.5), speed = drift * (0.15 + f * 0.6), off = b * 977 + seed * 13;
      const body = 'rgb(' + mix(shade, top, 0.6 - 0.3 * f) + ')', crest = 'rgb(' + mix(top, '#ffffff', 0.15 + 0.25 * d * (1 - f * 0.5)) + ')';
      const topAt = (sx: number) => { const u = sx + v.cam * bpar + t * speed + off; return hb + amp * (0.6 * Math.abs(Math.sin(u * fr)) + 0.4 * Math.abs(Math.sin(u * fr * 2.3 + 1.7))); };
      x.fillStyle = body;
      for (let sx = left - (left % 2); sx < right; sx += 2) { const ty = Y(topAt(sx)); if (ty < v.viewH) x.fillRect(sx, ty + 2, 2, v.viewH - ty - 2); }
      x.fillStyle = crest;
      for (let sx = left - (left % 2); sx < right; sx += 2) x.fillRect(sx, Y(topAt(sx)), 2, 2);
    }
    // wind: thin streaks crossing the sky, faster than the cloud
    const n = Math.round(Number(p.wind) * 14);
    x.fillStyle = rgba('255,255,255', 0.1 * Number(p.wind) * (0.5 + 0.5 * d));
    for (let i = 0; i < n; i++) {
      const rr = hash(seed * 7 + i), hh = hz + 30 + rr * 220, len = 16 + Math.floor(hash(i * 3 + 1) * 50), spd = 2 + hash(i * 5 + 2) * 3, span = v.viewW + 200;
      const sx = ((((rr * 5000 - t * spd) % span) + span) % span) - 100;
      x.fillRect(Math.round(sx), Y(hh), len, 1);
    }
  },
};

export const spireWallElement = piece({
  type: 'deck.spire-wall', label: 'The Spire’s face (deck: black glass rising out of the view, a crew bay)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 430, 40, 4000, 1, 'units'), height: num('Height (runs on out of the view)', 1400, 100, 6000, 1, 'units'), below: num('Runs on below the deck', 90, 0, 600, 1, 'units'),
    ...stoneFields(), seams: num('Gold seams', 0.6, 0, 1, 0.05), seamGap: num('Seam spacing', 48, 8, 400, 1, 'units'), panes: num('Pane grid', 0.5, 0, 1, 0.05),
    edge: num('Lit corner', 0.7, 0, 1, 0.05), corner: select('Corner on the', ['right', 'left'], 'right'),
    bayFrom: num('Crew bay from the left', 120, 0, 4000, 1, 'units'), bayWidth: num('Crew bay width (0: none)', 190, 0, 2000, 1, 'units'),
    bayHeight: num('Crew bay height', 74, 30, 300, 1, 'units'), bayLit: num('Crew bay lights', 0.8, 0, 1, 0.05), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.height), w: Number(p.width), tall: Number(p.height) + Number(p.below) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, bay: { x: Number(p.bayFrom) + Number(p.bayWidth) / 2, h: 0, role: 'entrance' } }),
  paint(x, p, o) {
    const W = Number(p.width), H = Number(p.height), B = Number(p.below), g = rgbOr(p.gold, GOLD), d = daylight(o), seams = Number(p.seams), gap = Number(p.seamGap), pn = Number(p.panes);
    box(x, hexOr(p.stone, '#060709'), 0, -B, W, H + B);
    const sky = x.createLinearGradient(0, y(H), 0, y(-B)); sky.addColorStop(0, rgba('130,150,180', 0.06 + 0.12 * d)); sky.addColorStop(1, rgba('130,150,180', 0.02));
    x.fillStyle = sky; x.fillRect(0, y(H), W, H + B);
    if (pn > 0) { for (let c = 12; c < W; c += 24) box(x, rgba('255,255,255', 0.036 * pn), c, -B, 1, H + B); for (let h = 60; h < H; h += 60) box(x, rgba('255,255,255', 0.07 * pn), 0, h, W, 1); }
    for (let c = gap / 2; c < W; c += gap) box(x, rgba(g, Math.max(0, seams * (0.25 + 0.12 * Math.sin(o.t / 90 + c * 0.05)))), c, -B, 1, H + B);
    const right = p.corner !== 'left', cx = right ? W - 2 : 0;
    box(x, rgba(COLD, 0.35 * Number(p.edge)), cx, -B, 2, H + B); box(x, rgba(g, 0.5 * Number(p.edge)), right ? W - 3 : 2, -B, 1, H + B);
    const bw = Number(p.bayWidth), bx = Number(p.bayFrom), bh = Number(p.bayHeight), lit = Number(p.bayLit);
    if (bw > 0) {
      // the crew bay: a lit recess where the deck robots charge
      box(x, '#000000', bx - 4, 0, bw + 8, bh + 4); box(x, '#0d0e12', bx, 0, bw, bh);
      const wash = x.createLinearGradient(0, y(bh - 6), 0, 0); wash.addColorStop(0, rgba(COLD, 0.16 * lit)); wash.addColorStop(1, rgba(COLD, 0.02));
      x.fillStyle = wash; x.fillRect(bx, y(bh - 6), bw, bh - 6);
      box(x, rgba(COLD, 0.6 * lit), bx + 6, bh - 6, bw - 12, 2);
      for (let c = bx + 14; c + 14 < bx + bw; c += 50) { box(x, '#16171c', c, 0, 14, 22); box(x, rgba(COLD, 0.2), c, 0, 1, 22); box(x, rgba(g, 0.4 + 0.5 * lit * (0.6 + 0.4 * Math.sin(o.t / 40 + c))), c + 5, 18, 4, 2); }
      box(x, rgba(g, 0.4), bx, 0, bw, 1); box(x, rgba(g, 0.7), bx - 4, bh + 3, bw + 8, 1);
      if (lit > 0) o.light?.(bx + bw / 2, bh - 8, bw - 12, 6, COLD, 'window');
    }
  },
});

export const platformElement = piece({
  type: 'deck.platform', label: 'Docking deck (deck: cantilevered slab, truss, edge lights, mast)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 1200, 40, 6000, 1, 'units'), thickness: num('Slab thickness', 14, 4, 60, 1, 'units'), surface: colour('Deck', 'Dark steel'),
    from: num('Truss from (where the wall is)', 430, 0, 6000, 1, 'units'), depth: num('Truss depth at the wall (0: none)', 56, 0, 300, 1, 'units'),
    lights: num('Edge light spacing', 24, 6, 200, 1, 'units'), lightCol: colour('Edge lights', 'Spire gold'), chase: num('Lights running (speed)', 0.6, 0, 3, 0.05),
    chaseTo: num('Lights run towards', 850, 0, 6000, 1, 'units'), mast: num('Mast at the tip (0: none)', 80, 0, 400, 1, 'units'),
    sock: bool('Windsock on the mast', true), wind: num('Wind', 0.6, 0, 1, 0.05), rail: num('Railing at the tip (0: none)', 30, 0, 60, 1, 'units'),
    ...stoneFields(),
  },
  size: p => ({ w: Number(p.width) + 40, tall: Math.max(Number(p.mast), Number(p.rail)) + 10 }),
  bounds: p => { const tall = Math.max(Number(p.mast), Number(p.rail)) + 6; return { x: 0, h: tall, w: Number(p.width) + 6, tall: tall + Number(p.thickness) + Number(p.depth) }; },
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, tip: { x: Number(p.width), h: 0, role: 'mount' } }),
  paint(x, p, o) {
    const W = Number(p.width), T = Number(p.thickness), g = rgbOr(p.gold, GOLD), lc = rgbOr(p.lightCol, GOLD), st = hexOr(p.surface, '#101114'), t = o.t;
    // the truss under the deck, deep at the wall and thin at the tip (nothing floats)
    const tf = Number(p.from), D = Number(p.depth), end = W - 10;
    if (D > 0 && tf < end) {
      const bottom = (xx: number) => -T - D + ((D - 6) * (xx - tf)) / (end - tf);
      for (let xx = tf; xx < end; xx += 2) box(x, '#17181c', xx, bottom(xx), 2, 3);
      for (let xx = tf; xx < end; xx += 60) {
        box(x, '#141519', xx, bottom(xx), 2, -T - bottom(xx)); box(x, rgba(COLD, 0.14), xx, bottom(xx), 1, -T - bottom(xx));
        const nx = Math.min(end, xx + 60);
        for (let s = 0; s < nx - xx; s += 2) box(x, '#141519', xx + s, Math.round(-T + ((bottom(nx) + T) * s) / (nx - xx)) - 1, 2, 2);
      }
    }
    // the slab, its lit top edge and panel joints
    box(x, st, 0, -T, W, T); box(x, 'rgba(0,0,0,.4)', 0, -T, W, 2); box(x, rgba(COLD, 0.5), 0, -1, W, 1);
    for (let c = 40; c < W; c += 40) box(x, 'rgba(255,255,255,.04)', c, -T + 2, 1, T - 3);
    // edge lights in a running chase towards the pad
    const sp = Number(p.lights), chase = Number(p.chase), to = Number(p.chaseTo);
    for (let c = sp / 2; c < W; c += sp) {
      const ph = (Math.abs(c - to) / sp) * 0.5 + (t * chase) / 20, a = chase > 0 ? 0.35 + 0.65 * Math.max(0, 1 - (((ph % 3) + 3) % 3)) : 0.7;
      box(x, rgba(lc, 0.12 * a), c - 3, -7, 6, 6); box(x, rgba(lc, a), c - 1, -5, 2, 2);
    }
    // the tip: a glass rail, the mast with its beacon and a windsock
    const R = Number(p.rail);
    if (R > 0) {
      box(x, rgba(COLD, 0.08), W - 80, 0, 80, R); box(x, rgba(g, 0.8), W - 80, R, 80, 1);
      for (let c = W - 80; c < W; c += 20) box(x, '#1a1b20', c, 0, 1, R);
      box(x, '#1a1b20', W - 3, 0, 3, R + 1);
    }
    const M = Number(p.mast);
    if (M > 0) {
      const mx = W - 12, on = Math.floor(t / 50) % 2 === 0;
      box(x, '#15161a', mx, 0, 3, M); box(x, rgba(COLD, 0.3), mx, 0, 1, M);
      box(x, rgba(RED, on ? 0.95 : 0.25), mx - 1, M, 5, 3);
      if (on) o.light?.(mx + 1, M + 1, 4, 3, RED, 'window');
      if (p.sock !== false) {
        // a windsock streaming downwind (to the left), drooping as the wind drops
        const wind = Number(p.wind), droop = (1 - wind) * 1.2;
        for (let i = 0; i < 5; i++) {
          const sx = Math.round(mx - (i + 1) * 6 * Math.cos(droop)), sh = Math.round(M - 3 - i * 6 * Math.sin(droop) + Math.sin(t / 6 + i) * wind), hh = Math.max(2, Math.round(6 - i * 0.8));
          box(x, i % 2 ? '#e8e4da' : rgba(g, 0.95), sx, sh - hh, 6, hh);
        }
      }
    }
  },
});

/** The craft a pad can take (a hauler's slung box does not fit a pad). */
const PAD_CRAFT = ['shuttle', 'escort', 'medevac', 'taxi'] as const;

export const landingPadElement: Element = {
  type: 'deck.landing-pad', version: 1, label: 'Landing pad and its craft (deck: a visit on a long cycle, or parked for good)', category: 'architecture', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: {
    width: num('Pad length', 420, 120, 2000, 1, 'units'), mode: select('Craft', ['visiting', 'parked', 'none'], 'visiting'), craft: select('Kind of craft', PAD_CRAFT, 'shuttle'),
    cycle: num('One visit (frames)', 2400, 600, 30000, 10), phase: num('Phase (frames)', 0, 0, 30000, 10),
    from: select('Comes in from the (nose points away)', ['right', 'left'], 'right'), leaves: select('Leaves', ['climbing', 'onward'], 'climbing'),
    hover: num('Hover before touchdown', 26, 0, 120, 1, 'units'), paint: colour('Hull', 'Spire black'), stripe: colour('Fleet stripe', 'Gold'),
    ramp: bool('Boarding ramp down (parked)', true), umbilical: bool('Power umbilical (parked)', true), post: num('Power post from the pad’s left', 30, 0, 2000, 1, 'units'),
    lights: bool('Pad lights', true), ...stoneFields(),
  },
  bounds: p => ({ x: 0, h: 120, w: Number(p.width), tall: 124 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, pad: { x: Number(p.width) / 2, h: 3, role: 'surface' } }),
  draw(ctx, v, p, _s, _pass, at) {
    framed(ctx, v, at, o => {
      const x = ctx, W = Number(p.width), g = rgbOr(p.gold, GOLD), cyc = Number(p.cycle), u = ((((o.t + Number(p.phase)) % cyc) + cyc) % cyc) / cyc;
      const s = p.from === 'left' ? -1 : 1, face = (-s) as 1 | -1, hover = Number(p.hover), cx = W / 2, mode = String(p.mode);
      const kind = (PAD_CRAFT as readonly string[]).includes(String(p.craft)) ? String(p.craft) as typeof PAD_CRAFT[number] : 'shuttle';
      const L = CRAFT_LEN[kind] / 2, ext = CRAFT_EXTENT[kind], hatchH = Math.min(30, Math.round(ext.top * 0.6)), hatchW = Math.max(12, Math.round(L * 0.13));
      // where the craft is: in, down onto the pad, a wait with the hatch open, up, away (or parked: down, open, for good)
      let dx = 0, alt = 0, gear = true, hatch = 0;
      if (mode === 'parked') hatch = 1;
      else if (u < 0.28) { const k = ease(u / 0.28); dx = s * 900 * (1 - k); alt = hover + 320 * Math.pow(1 - k, 1.6); gear = k > 0.8; }
      else if (u < 0.38) alt = hover * (1 - ease((u - 0.28) / 0.1));
      else if (u < 0.7) hatch = u < 0.42 ? 0 : u < 0.46 ? (u - 0.42) / 0.04 : u < 0.62 ? 1 : u < 0.66 ? 1 - (u - 0.62) / 0.04 : 0;
      else if (u < 0.78) alt = hover * ease((u - 0.7) / 0.08);
      else {
        const k = Math.pow((u - 0.78) / 0.22, 2); gear = k < 0.05;
        if (p.leaves === 'onward') { dx = face * 1100 * k; alt = hover + 200 * k; } else { dx = face * 60 * k; alt = hover + 700 * k; }
      }
      const busy = mode === 'visiting' && (u < 0.38 || u >= 0.7), blink = Math.floor(o.t / 18) % 2 === 0;
      // the pad: a raised plate, gold chevrons that blink while a craft is moving, lamp posts at both ends
      box(x, '#14151a', 0, 0, W, 3); box(x, rgba(COLD, 0.45), 0, 3, W, 1); box(x, rgba(g, 0.6), 0, 0, W, 1);
      for (let c = 16; c < W - 10; c += 22) box(x, rgba(g, busy ? (blink ? 0.9 : 0.3) : 0.55), c, 1, 8, 1);
      if (p.lights !== false) for (const lx of [2, W - 5]) {
        box(x, '#16171c', lx, 0, 3, 12); box(x, rgba(g, busy && !blink ? 0.3 : 0.95), lx, 12, 3, 2);
        o.light?.(lx + 1, 13, 3, 2, g, 'window');
      }
      if (mode === 'none') return;
      // the downwash: cold light pooling on the pad under a hovering craft
      if (busy && alt < 140) {
        const k = 1 - alt / 140, r = L * 0.85, wash = x.createRadialGradient(cx + dx, -4, 2, cx + dx, -4, r);
        wash.addColorStop(0, rgba(COLD, 0.22 * k)); wash.addColorStop(1, rgba(COLD, 0));
        x.fillStyle = wash; x.fillRect(Math.round(cx + dx - r), -60, Math.round(r * 2), 64);
        for (let i = 0; i < 3; i++) box(x, rgba(COLD, 0.2 * k), Math.round(cx + dx - r * 0.75 + ((o.t * 3 + i * 80) % (r * 1.5))), 4 + i, 24, 1);
      }
      const sx = Math.round(cx + dx), base = Math.round(3 + alt), lift = base + 6 + ext.bottom;
      // the hatch in the craft's own frame (towards the tail) and on the pad
      const hx = -face * Math.round(L * 0.3) - Math.round(hatchW / 2), hatchX = sx + hx;
      // a parked craft's power umbilical: a pedestal on the pad, a cable sagging up to the belly
      if (mode === 'parked' && p.umbilical !== false) {
        const px = Number(p.post), bx = sx + face * Math.round(L * 0.35), bh = base + 6, ph = 24, on = 0.6 + 0.4 * Math.sin(o.t / 50);
        box(x, '#16171c', px - 6, 3, 12, ph); box(x, rgba(COLD, 0.25), px - 6, 3, 1, ph); box(x, rgba(g, 0.8), px - 6, 3 + ph, 12, 1);
        box(x, '#08080a', px - 3, ph - 8, 6, 5); box(x, rgba(g, 0.9 * on), px - 2, ph - 7, 4, 2);
        o.light?.(px, ph - 6, 4, 2, g, 'screen');
        for (let i = 0; i <= 24; i++) { const k = i / 24, cxw = px + (bx - px) * k, ch = (3 + ph - 4) + (bh - (ph - 1)) * k - 8 * 4 * k * (1 - k); box(x, '#0c0d10', cxw - 1, ch - 1, 3, 3); }
        for (let i = 0; i <= 24; i += 6) { const k = i / 24, cxw = px + (bx - px) * k, ch = (3 + ph - 4) + (bh - (ph - 1)) * k - 8 * 4 * k * (1 - k); box(x, rgba(g, 0.5), cxw, ch + 1, 1, 1); }
      }
      if (gear) for (const gx of [-Math.round(L * 0.58), Math.round(L * 0.53)]) { box(x, '#101114', sx + gx, base, 3, 6); box(x, '#101114', sx + gx - 3, base, 9, 1); }
      x.save(); x.translate(sx, y(lift));
      const stripe = isHex(p.stripe) ? String(p.stripe) : '#d8b45a';
      drawCraft(x, kind, { t: o.t, face, paint: hexOr(p.paint, '#16171b'), scale: 1, livery: { stripe } });
      if (hatch > 0) { x.fillStyle = rgba('255,226,180', 0.75 * hatch); x.fillRect(hx, -hatchH, hatchW, Math.round(hatchH * hatch)); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(hx, -hatchH, hatchW, 1); }
      x.restore();
      // the boarding ramp: from the hatch sill down to the pad, towards the tail; lit edge, a handrail
      if (mode === 'parked' && p.ramp !== false) {
        const top = lift, len = Math.max(30, Math.round((top - 3) * 2.6)), x0 = face > 0 ? hatchX : hatchX + hatchW, dir = -face;
        for (let i = 0; i < len; i += 2) { const h = Math.round(top - ((top - 3) * i) / len); box(x, '#1a1b20', x0 + dir * i - (dir < 0 ? 2 : 0), h - 3, 2, 3); box(x, rgba(COLD, 0.4), x0 + dir * i - (dir < 0 ? 2 : 0), h, 2, 1); }
        for (let i = 0; i <= len; i += 2) { const h = Math.round(top - ((top - 3) * i) / len) + 22; box(x, rgba(g, 0.7), x0 + dir * i - (dir < 0 ? 1 : 0), h, 1, 1); }
        for (const i of [0, Math.round(len / 2), len]) { const h = Math.round(top - ((top - 3) * i) / len); box(x, '#1a1b20', x0 + dir * i, h, 1, 22); }
        const spill = x.createLinearGradient(0, y(top), 0, 0); spill.addColorStop(0, rgba('255,226,180', 0.18)); spill.addColorStop(1, rgba('255,226,180', 0));
        x.fillStyle = spill; x.fillRect(Math.min(x0, x0 + dir * len), y(top), len, top);
      }
      o.light?.(sx, base + 34, L * 1.15, 8, '255,240,210', 'window');
      if (hatch > 0) o.light?.(hatchX + hatchW / 2, lift - hatchH / 2, hatchW, hatchH, '255,226,180', 'window');
    });
  },
};

export const loungeElement = piece({
  type: 'deck.lounge', label: 'Deck lounge (deck: a room cut into the Spire, sofa, bar, low lamps)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 340, 60, 2000, 1, 'units'), height: num('Room height', 92, 62, 300, 1, 'units'), slab: num('Floor thickness', 12, 4, 60, 1, 'units'),
    ...stoneFields(), warm: num('Lamps', 0.7, 0, 1, 0.05), sofaFrom: num('Sofa from the left', 30, 0, 2000, 1, 'units'), sofaWidth: num('Sofa width (0: none)', 130, 0, 1000, 1, 'units'),
    barFrom: num('Bar from the left', 240, 0, 2000, 1, 'units'), barWidth: num('Bar width (0: none)', 70, 0, 600, 1, 'units'), seal: bool('The Registry seal on the back wall', true),
  },
  size: p => ({ w: Number(p.width) + 8, tall: Number(p.height) + 8 }),
  bounds: p => ({ x: -4, h: Number(p.height) + 8, w: Number(p.width) + 8, tall: Number(p.height) + 8 + Number(p.slab) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, ceiling: { x: 0, h: Number(p.height), role: 'mount' } }),
  paint(x, p, o) {
    const W = Number(p.width), H = Number(p.height), S = Number(p.slab), g = rgbOr(p.gold, GOLD), warm = Number(p.warm), WARM = '255,214,160';
    box(x, hexOr(p.stone, '#141317'), 0, 0, W, H);
    for (let c = 17; c < W; c += 34) box(x, 'rgba(255,255,255,.025)', c, 0, 1, H);
    const wash = x.createLinearGradient(0, y(H), 0, 0); wash.addColorStop(0, rgba(WARM, 0.12 * warm)); wash.addColorStop(1, rgba(WARM, 0.02 * warm));
    x.fillStyle = wash; x.fillRect(0, y(H), W, H);
    if (p.seal !== false) { ring(x, Math.round(W * 0.42), y(Math.round(H * 0.58)), 15, rgba(g, 0.5)); ring(x, Math.round(W * 0.42), y(Math.round(H * 0.58)), 11, rgba(g, 0.3)); box(x, rgba(g, 0.5), Math.round(W * 0.42) - 1, Math.round(H * 0.58) - 8, 2, 15); }
    // the ceiling and its warm downlights
    box(x, '#0b0b0e', -4, H, W + 8, 8); box(x, rgba(g, 0.5), -4, H, W + 8, 1);
    for (let c = 24; c < W - 10; c += 40) { box(x, rgba('255,226,180', 0.9 * warm), c, H - 1, 6, 1); if (warm > 0) o.light?.(c + 3, H - 6, 6, 4, WARM, 'window'); }
    // the floor slab with a lit edge, brackets under it into the wall
    box(x, '#0d0d11', -4, -S, W + 8, S); box(x, rgba(COLD, 0.4), -4, -1, W + 8, 1); box(x, rgba(g, 0.7), -4, -S, W + 8, 1);
    for (const bx of [16, W - 28]) for (let k = 0; k < 12; k++) box(x, '#121216', bx + k, -S - 12 + k, 12 - k, 1);
    // a long low sofa (seat at 10, a sitter's height), a side table with one glass
    const sf = Number(p.sofaFrom), sw = Number(p.sofaWidth);
    if (sw > 0) {
      box(x, '#1f1c23', sf, 10, sw, 13); box(x, rgba(g, 0.35), sf, 23, sw, 1);
      box(x, '#1c1a1f', sf, 2, sw, 6); box(x, '#2a2630', sf, 8, sw, 2); box(x, rgba(g, 0.5), sf, 9, sw, 1);
      box(x, rgba(g, 0.7), sf + 2, 0, 2, 2); box(x, rgba(g, 0.7), sf + sw - 4, 0, 2, 2);
      box(x, '#1b1b20', sf + sw + 8, 0, 2, 12); box(x, '#1b1b20', sf + sw + 4, 12, 10, 2); box(x, rgba(g, 0.6), sf + sw + 4, 14, 10, 1); box(x, rgba('255,236,190', 0.5), sf + sw + 8, 15, 2, 4);
    }
    // the bar: a stone counter, a lit shelf of bottles behind
    const bf = Number(p.barFrom), bw = Number(p.barWidth);
    if (bw > 0) {
      box(x, '#0b0b0e', bf + 4, 40, bw - 8, 2);
      const sh = x.createLinearGradient(0, y(56), 0, y(40)); sh.addColorStop(0, rgba(WARM, 0)); sh.addColorStop(1, rgba(WARM, 0.25 * warm)); x.fillStyle = sh; x.fillRect(bf + 4, y(56), bw - 8, 16);
      for (let c = bf + 7; c < bf + bw - 8; c += 5) box(x, ['rgba(160,90,50,.8)', 'rgba(210,190,140,.7)', 'rgba(90,110,80,.8)'][Math.floor(hash(c) * 3)], c, 42, 2, 5 + Math.floor(hash(c + 1) * 4));
      box(x, '#121216', bf, 0, bw, 22); box(x, '#202027', bf - 2, 22, bw + 4, 2); box(x, rgba(g, 0.8), bf - 2, 24, bw + 4, 1); box(x, rgba(g, 0.4), bf, 10, bw, 1);
    }
  },
});

export const glassFrontElement = piece({
  type: 'deck.glass-front', label: 'Glass front (deck: the lounge’s tinted wall, sky in the glass)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 340, 40, 4000, 1, 'units'), height: num('Height', 92, 20, 600, 1, 'units'), panes: num('Pane width', 56, 16, 400, 1, 'units'),
    glass: num('Tint', 0.5, 0, 1, 0.05), reflect: num('Sky in the glass', 0.6, 0, 1, 0.05), frame: colour('Frame', 'Black steel'), gold: colour('Gold', 'Spire gold'),
  },
  size: p => ({ w: Number(p.width) + 4, tall: Number(p.height) + 4 }),
  bounds: p => ({ x: -2, h: Number(p.height) + 3, w: Number(p.width) + 4, tall: Number(p.height) + 3 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, top: { x: Number(p.width) / 2, h: Number(p.height), role: 'mount' } }),
  paint(x, p, o) {
    const W = Number(p.width), H = Number(p.height), fr = hexOr(p.frame, '#0a0a0c'), g = rgbOr(p.gold, GOLD), d = daylight(o), rf = Number(p.reflect);
    box(x, rgba('200,215,230', 0.06 + 0.1 * Number(p.glass)), 0, 0, W, H);
    x.save(); x.beginPath(); x.rect(0, y(H), W, H); x.clip();
    const sky = x.createLinearGradient(0, y(H), 0, y(H * 0.4)); sky.addColorStop(0, rgba(COLD, 0.14 * rf * (0.3 + 0.7 * d))); sky.addColorStop(1, rgba(COLD, 0));
    x.fillStyle = sky; x.fillRect(0, y(H), W, H * 0.6);
    x.fillStyle = rgba('255,255,255', 0.05 * rf * (0.5 + 0.5 * d));
    for (let k = -H; k < W; k += 70) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + 18, 0); x.lineTo(k + 18 + H * 0.5, y(H)); x.lineTo(k + H * 0.5, y(H)); x.closePath(); x.fill(); }
    x.restore();
    for (let c = 0; c <= W; c += Number(p.panes)) box(x, fr, Math.min(c, W - 2), 0, 2, H);
    box(x, fr, W - 2, 0, 2, H); box(x, fr, -2, H - 2, W + 4, 4); box(x, fr, -2, 0, W + 4, 3); box(x, rgba(g, 0.6), -2, H + 2, W + 4, 1);
  },
});

export const spireInteriors: Element[] = [atriumElement, slowScreenElement, receptionElement, idGatesElement, benchesElement, mezzanineElement, liftBankElement,
  cloudSeaElement, spireWallElement, platformElement, landingPadElement, loungeElement, glassFrontElement];
