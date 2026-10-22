/**
 * BUILDING KIT, undercity ("Below the record."). Tommi, 2026-10-22: underground needs its own logic,
 * not a street with a ceiling. Space is scarce and pressed: tunnels barely taller than a person and
 * their pipes, rock above and below, levels stacked and joined by ladders, shafts, stairs and a lift
 * that stopped; canals in the sewers; one place that opens up (the data hall). So the kit is sections:
 * - `undercity.rock`: rock, concrete, brick or earth in section, the mass around everything.
 * - `building.tunnel`: a tunnel cut open lengthwise: round, horseshoe, brick sewer or utility gallery,
 *   its cut lining above and below, pipes under the crown, niches lived in behind tarps, lamps, chalk.
 * - `undercity.canal`: the sewer canal below a towpath, still or flowing, litter, a punt or a raft.
 * - `undercity.shaft`: the cut between two levels: a ladder shaft, a stairwell, a dead lift, a drain.
 * - `undercity.ladder`: a ladder to stand on a steep `level.stairs` (run 0) so the player can climb.
 * - `building.vault`: a low vaulted arcade, the arches where the Ghosts live (a junction hall).
 * - Above ground, the way down: `undercity.metro-entrance` (a dead station entrance, its stair passage
 *   and sealed ticket hall cut open below the street) and `undercity.lot` (an overgrown fenced lot).
 * - The data hall: `landmark.data-hall` (the flooded server hall, high, racks in still water, a
 *   gallery and its broken stair), with `undercity.catwalk` and `undercity.pontoon` to walk on.
 *
 * Drawn in the piece's own frame like the other district types (types.ts): origin at the foot on the
 * left, heights up (`y = -h`); a piece that reaches below its floor (lining, water) draws at negative h.
 */
import type { Element } from '../core/composition';
import { mono, rng } from '../core/primitives';
import { bool, colour, hash, isHex, num, piece, rgba, rgbOf, select, text, y, type Paint } from './types';

/** The Undercity's card: structure #3a8a80, walls #081010, windows #6fd6c4, neon #e8e0b0 / #ff2a44 / #9ad0ff. */
const STRUCT = '58,138,128', WIN = '111,214,196', PALE = '232,224,176', RED = '255,42,68', COLD = '154,208,255';
const CHALK = '225,222,205', WARM = '255,190,110';
const CONCRETE = ['#081010', '#091211', '#0a100f', '#081112'];
const TARPS = ['#24343c', '#3a2c20', '#2a3626', '#3c2a26', '#262e36', '#36362a'];
const PIPES = ['70,84,82', '96,72,54', '62,74,84', '112,92,62'];
const R = Math.round;
const seedField = num('Seed', 1, 0, 1000000);
const ledField = (label: string, value: string) => ({ kind: 'color' as const, label, default: value });
const hexOr = (v: unknown, fallback: string) => rgbOf(isHex(v) ? String(v) : fallback);
const mod = (a: number, m: number) => ((a % m) + m) % m;
/** A hex colour lifted (or dropped) by `k` on every channel. */
const lift = (hex: string, k: number) => '#' + [1, 3, 5].map(i => Math.max(0, Math.min(255, parseInt(hex.slice(i, i + 2), 16) + k)).toString(16).padStart(2, '0')).join('');

// ---------------------------------------------------------------- shared drawing

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

/** Chalk words on a wall, underlined, left edge at l. */
function chalkWords(x: CanvasRenderingContext2D, words: string, l: number, h: number) {
  x.font = mono(7, '600'); x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillStyle = rgba(CHALK, 0.6);
  x.fillText(words, R(l), y(R(h))); x.fillRect(R(l) - 2, y(R(h) - 3), R(x.measureText(words).width) + 4, 1);
}

/** Marks scattered over a wall band, avoiding the x-ranges in `keep`. */
function scatterMarks(x: CanvasRenderingContext2D, l: number, r: number, low: number, top: number, density: number, seed: number, keep: [number, number][] = []) {
  if (top - low < 8 || r - l < 20) return;
  const n = R(((r - l) / 60) * density * 2);
  for (let k = 0; k < n; k++) {
    const s = seed * 7 + k * 13, mx = l + 6 + hash(s + 1) * (r - l - 22), mh = low + hash(s) * (top - low);
    if (keep.some(([a, b]) => mx + 14 > a && mx < b)) continue;
    if (hash(s + 2) < 0.7) glyph(x, Math.floor(hash(s + 3) * 6), mx + 5, mh, 6 + R(hash(s + 4) * 3)); else spray(x, mx, mh, s);
  }
}

/** Drops falling from `from` to the floor (0) at `n` seeded places across `w`, a splash where they land. */
function drops(x: CanvasRenderingContext2D, t: number, w: number, from: number, n: number, seed: number, to = 0) {
  for (let k = 0; k < n; k++) {
    const px = R(hash(seed * 3 + k * 7) * w), P = 140 + R(hash(seed + k * 5) * 160), ph = (t + hash(seed * 9 + k) * 1000) % P, fall = Math.max(10, R(Math.sqrt(from - to) * 3));
    if (ph < fall) { const f = ph / fall, dh = from - (from - to) * f * f; x.fillStyle = 'rgba(200,240,232,.7)'; x.fillRect(px, y(dh) - 2, 1, 2); }
    else if (ph < fall + 6) { const s = ph - fall > 3 ? 1 : 0; x.fillStyle = 'rgba(200,240,232,.4)'; x.fillRect(px - 1, y(to + 1), 3, 1); x.fillRect(px - 2 - s, y(to + 3), 1, 1); x.fillRect(px + 2 + s, y(to + 3), 1, 1); }
    else if (ph > P - 40) { x.fillStyle = 'rgba(200,240,232,.55)'; x.fillRect(px, y(from) + 1, 1, 1 + (ph > P - 15 ? 1 : 0)); }
  }
}

/** Pipes stacked down from `top` across `w`, strapped every 46; returns the bundle's bottom height. */
function pipeBundle(x: CanvasRenderingContext2D, w: number, top: number, n: number, seed: number, hangFrom?: number) {
  let ph = top;
  for (let k = 0; k < n; k++) {
    const d = 3 + Math.floor(hash(seed * 7 + k) * 3), col = PIPES[Math.floor(hash(seed * 11 + k) * PIPES.length)];
    x.fillStyle = rgba(col, 0.75); x.fillRect(0, y(ph), w, d);
    x.fillStyle = rgba(col, 0.95); x.fillRect(0, y(ph), w, 1); x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, y(ph - d + 1), w, 1);
    if (hash(seed + k * 5) < 0.5) { x.fillStyle = 'rgba(160,80,40,.22)'; for (let q = 0; q < w; q += 37) x.fillRect(R(q + hash(q + k) * 20), y(ph) + 1, 4 + R(hash(q * 3 + k) * 8), d - 1); }
    ph -= d + 1;
  }
  if (n > 0) {
    const strapTop = hangFrom ?? top + 3;
    x.fillStyle = '#050807'; for (let k = 23; k < w; k += 46) { x.fillRect(k, y(strapTop), 2, strapTop - ph); x.fillStyle = 'rgba(150,140,128,.35)'; x.fillRect(k, y(top) + 1, 1, 1); x.fillStyle = '#050807'; }
    x.fillStyle = 'rgba(200,240,232,.45)'; for (let k = 0; k < w; k += 7) if (hash(seed * 13 + k) < 0.45) x.fillRect(k, y(ph) + 1, 1, 1);
  }
  return ph;
}

/** A small light: a radial glow on the wall and the light layer's share. */
function glowAt(x: CanvasRenderingContext2D, o: Paint, cx: number, h: number, col: string, a: number, r = 24) {
  const g = x.createRadialGradient(cx, y(h), 0, cx, y(h), r); g.addColorStop(0, rgba(col, 0.16 * a)); g.addColorStop(1, rgba(col, 0));
  x.fillStyle = g; x.fillRect(R(cx - r), R(y(h) - r), r * 2, r * 2);
  o.light?.(cx, h, 8, 4, col, 'screen');
}

/** A wall lamp: an emergency box, a caged bulkhead, or LEDs off a battery hung on a nail. */
function lamp(x: CanvasRenderingContext2D, o: Paint, kind: string, cx: number, h: number, col: string, s: number) {
  const t = o.t;
  if (kind === 'emergency') {
    const a = hash(s) < 0.4 ? (Math.sin(t / 24 + s) > 0 ? 0.95 : 0.25) : 0.85;
    glowAt(x, o, cx, h + 3, col, a, 26);
    x.fillStyle = '#16150f'; x.fillRect(cx - 5, y(h + 6), 10, 7); x.fillStyle = 'rgba(150,140,128,.4)'; x.fillRect(cx - 5, y(h + 6), 10, 1);
    x.fillStyle = rgba(col, a); x.fillRect(cx - 3, y(h + 4), 6, 3);
  } else if (kind === 'bulkhead') {
    const dead = hash(s) < 0.25, a = dead ? 0 : 0.85 + 0.15 * Math.sin(t / 50 + s);
    if (!dead) glowAt(x, o, cx, h + 3, col, a, 28);
    x.fillStyle = '#181a16'; x.fillRect(cx - 5, y(h + 7), 10, 8);
    x.fillStyle = dead ? '#24261f' : rgba(col, a); x.fillRect(cx - 4, y(h + 6), 8, 6);
    x.fillStyle = '#181a16'; x.fillRect(cx - 1, y(h + 6), 1, 6); x.fillRect(cx - 4, y(h + 3), 8, 1);
  } else {
    const a = 0.75 + 0.25 * Math.sin(t / 40 + s);
    glowAt(x, o, cx, h + 2, col, a, 20);
    x.fillStyle = 'rgba(0,0,0,.85)'; x.fillRect(cx - 6, y(h + 4), 12, 1); x.fillRect(cx + 5, y(h + 4), 1, 6);
    for (let k = 0; k < 5; k++) { x.fillStyle = rgba(col, Math.min(1, a * (0.7 + 0.3 * Math.sin(t / 13 + k)))); x.fillRect(cx - 6 + k * 3, y(h + 3 - (k % 2)), 2, 1); }
    x.fillStyle = '#1c1a14'; x.fillRect(cx + 3, y(h - 2), 6, 5); x.fillStyle = 'rgba(120,220,120,.85)'; x.fillRect(cx + 7, y(h - 3), 1, 1);
  }
}

/** A niche lived in: a lintel, a bed and crates inside, a tarp on a line, an LED string off a battery. */
function home(x: CanvasRenderingContext2D, o: Paint, ax: number, aw: number, ah: number, s: number, tarpHex: string, led: string, wall: string) {
  const t = o.t, lit = hash(s + 4) < 0.85, dying = hash(s + 9) < 0.15, level = !lit ? 0 : dying ? (hash(s + Math.floor(t / 6)) < 0.3 ? 0.3 : 0.9) : 0.82 + 0.18 * Math.sin(t / 70 + s);
  ax = R(ax); aw = R(aw); ah = R(ah);
  x.fillStyle = lift(wall, 12); x.fillRect(ax - 3, y(ah + 4), aw + 6, 4); x.fillStyle = rgba(STRUCT, 0.3); x.fillRect(ax - 3, y(ah + 4), aw + 6, 1);
  x.fillStyle = '#020505'; x.fillRect(ax, y(ah), aw, ah);
  if (lit) { x.fillStyle = rgba(led, 0.1 * level); x.fillRect(ax, y(ah), aw, ah); }
  const thing = lit ? '#1a1712' : '#0a0a08';
  x.fillStyle = lit ? rgba('120,110,90', 0.5 * level + 0.1) : '#0c0c0a'; x.fillRect(ax + 3, y(7), R(aw * 0.55), 7);
  x.fillStyle = lit ? rgba('180,170,140', 0.45 * level) : '#0e0e0c'; x.fillRect(ax + 4, y(10), 7, 3);
  x.fillStyle = thing; x.fillRect(ax + aw - 15, y(16), 12, 16); x.fillStyle = rgba(led, 0.2 * level); x.fillRect(ax + aw - 15, y(16), 12, 1); x.fillRect(ax + aw - 15, y(8), 12, 1);
  if (ah > 34) { x.fillStyle = thing; x.fillRect(ax + R(aw * 0.45), y(ah - 8), 1, 4); x.fillRect(ax + R(aw * 0.45) - 3, y(ah - 18), 7, 10); }
  const tarp = isHex(tarpHex) ? tarpHex : TARPS[Math.floor(hash(s + 5) * TARPS.length)];
  const sheet = (l: number, rr: number, lead: number) => {
    l = R(l); rr = R(rr); if (rr - l < 3) return;
    x.fillStyle = tarp; x.fillRect(l, y(ah - 1), rr - l, ah - 2);
    for (let k = l + 2; k < rr - 1; k += 5) { x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(k, y(ah - 2), 1, ah - 4); x.fillStyle = 'rgba(255,255,255,.05)'; x.fillRect(k + 1, y(ah - 2), 1, ah - 4); }
    x.fillStyle = '#020505'; for (let k = l; k < rr; k += 2) x.fillRect(k, y(2), 2, 1 + R(hash(s + k) * 2));
    x.fillStyle = 'rgba(0,0,0,.6)'; for (let k = l + 1; k < rr; k += 8) x.fillRect(k, y(ah - 1), 2, 2);
    x.fillStyle = rgba(led, 0.28 * level); x.fillRect(lead, y(ah - 3), 1, ah - 6);
  };
  const f = 0.22 + hash(s + 7) * 0.12;
  if (hash(s + 6) < 0.5) { const g = 0.45 + hash(s + 7) * 0.3; sheet(ax, ax + aw * g, R(ax + aw * g) - 1); }
  else { sheet(ax, ax + aw * f, R(ax + aw * f) - 1); const g = 0.72 - hash(s + 8) * 0.1; sheet(ax + aw * g, ax + aw, R(ax + aw * g)); }
  x.fillStyle = 'rgba(0,0,0,.9)'; x.fillRect(ax - 2, y(ah), aw + 4, 1);
  x.fillStyle = 'rgba(0,0,0,.85)'; x.fillRect(ax + 1, y(ah - 3), aw - 2, 1); x.fillRect(ax + aw - 3, y(ah - 3), 1, ah - 9);
  for (let k = ax + 2, i = 0; k < ax + aw - 2; k += 4, i++) {
    const sag = R(2 * Math.sin((Math.PI * (k - ax)) / aw)), tw = 0.75 + 0.25 * Math.sin(t / 17 + i * 1.7 + s);
    x.fillStyle = lit ? rgba(led, Math.min(1, (0.5 + 0.45 * tw) * level + 0.1)) : 'rgba(40,40,32,.9)'; x.fillRect(k, y(ah - 4 - sag) + sag * 2, 2, 1);
  }
  x.fillStyle = '#1c1a14'; x.fillRect(ax + aw - 9, y(6), 8, 6); x.fillStyle = 'rgba(150,140,128,.4)'; x.fillRect(ax + aw - 9, y(6), 8, 1);
  x.fillStyle = Math.floor(t / 50 + s) % 4 === 0 ? 'rgba(255,190,80,.9)' : 'rgba(120,220,120,.85)'; x.fillRect(ax + aw - 4, y(4), 1, 1);
  if (lit) { o.light?.(ax + aw / 2, ah - 4, aw, 6, led, 'screen'); o.light?.(ax + aw / 2, ah / 2, aw - 4, ah - 6, led, 'window'); }
}

/** Bricks across a rect: courses `ch` tall, bricks `bw` long, a few lighter. */
function bricks(x: CanvasRenderingContext2D, l: number, bottom: number, w: number, tall: number, seed: number, ch = 4, bw = 10) {
  x.fillStyle = 'rgba(0,0,0,.38)';
  for (let h = 0, row = 0; h < tall; h += ch, row++) {
    x.fillRect(l, y(bottom + h + ch), w, 1);
    for (let k = l + (row % 2) * (bw / 2); k < l + w; k += bw) x.fillRect(R(k), y(bottom + h + ch), 1, ch);
  }
  x.fillStyle = 'rgba(255,220,190,.035)';
  for (let i = 0; i < (w * tall) / 260; i++) x.fillRect(R(l + hash(seed + i) * (w - bw)), y(bottom + R(hash(seed * 3 + i) * (tall - ch)) + ch) + 1, bw - 1, ch - 1);
}

// ---------------------------------------------------------------- rock, the mass around everything

const MATERIAL: Record<string, string> = { rock: '#070807', concrete: '#0c1110', brick: '#140d0b', earth: '#0d0a08' };

export const rockElement = piece({
  type: 'undercity.rock', label: 'Rock or fill in section (kit, Undercity)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 800, 10, 10000, 1, 'units'), tall: num('Height', 300, 10, 3000, 1, 'units'),
    material: select('Material', ['rock', 'concrete', 'brick', 'earth']), crust: select('Top surface', ['none', 'paving', 'soil']),
    fill: colour('Colour', 'The material’s own'), seams: num('Strata, cracks and stones', 0.5, 0, 1, 0.05), seep: num('Seeping water', 0.3, 0, 1, 0.05), seed: seedField,
  },
  size: p => ({ w: Number(p.width), tall: Number(p.tall) }),
  bounds: p => ({ x: 0, h: Number(p.tall), w: Number(p.width), tall: Number(p.tall) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, top: { x: Number(p.width) / 2, h: Number(p.tall), role: 'surface' } }),
  paint(x, p) {
    const w = Number(p.width), T = Number(p.tall), mat = String(p.material), base = isHex(p.fill) ? String(p.fill) : MATERIAL[mat] ?? MATERIAL.rock, seams = Number(p.seams), seed = Number(p.seed), r = rng(seed * 977 + 3);
    x.fillStyle = base; x.fillRect(0, y(T), w, T);
    if (mat === 'brick') bricks(x, 0, 0, w, T, seed, 5, 12);
    else if (mat === 'concrete') {
      x.fillStyle = 'rgba(255,255,255,.02)'; for (let h = 12; h < T; h += 12) x.fillRect(0, y(h), w, 1);
      x.fillStyle = 'rgba(0,0,0,.4)'; for (let h = 6; h < T; h += 24) for (let k = 12; k < w; k += 36) x.fillRect(k, y(h), 1, 1);
    } else {
      // strata in broken bands, stones lighter and darker than the rock
      for (let h = 8; h < T; h += 10 + R(r() * 10)) for (let k = 0; k < w;) {
        const len = 20 + R(r() * 80);
        if (r() < 0.4 + 0.5 * seams) { x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(k, y(h), len, 1); x.fillStyle = 'rgba(255,255,255,.025)'; x.fillRect(k, y(h) + 1, len, 1); }
        k += len + R(r() * 30);
      }
    }
    const stones = R(((w * T) / 900) * seams);
    for (let i = 0; i < stones; i++) { x.fillStyle = r() < 0.5 ? lift(base, 9) : 'rgba(0,0,0,.45)'; x.fillRect(R(r() * w), y(R(r() * T)), 2 + R(r() * 5), 1 + R(r() * 3)); }
    // cracks, and water seeping down out of them
    for (let i = 0; i < R((w / 160) * seams); i++) {
      let cx = R(r() * w), ch = R(r() * T); x.fillStyle = 'rgba(0,0,0,.55)';
      for (let k = 0; k < 8; k++) { x.fillRect(cx, y(ch), 1, 3); cx += r() < 0.5 ? -1 : 1; ch -= 3; if (ch < 0) break; }
    }
    for (let i = 0; i < R((w / 40) * Number(p.seep)); i++) { const sx = R(hash(seed + i * 3) * w), top = R(hash(seed * 7 + i) * T); x.fillStyle = rgba(STRUCT, 0.07); x.fillRect(sx, y(top), 1, Math.min(top, 10 + R(hash(seed + i) * 50))); }
    if (p.crust === 'paving') {
      x.fillStyle = '#191b1b'; x.fillRect(0, y(T), w, 6); x.fillStyle = '#0c0d0d'; x.fillRect(0, y(T - 6), w, 2);
      x.fillStyle = 'rgba(200,190,170,.28)'; x.fillRect(0, y(T), w, 1); x.fillStyle = 'rgba(0,0,0,.5)'; for (let k = 15; k < w; k += 30) x.fillRect(k, y(T) + 1, 1, 5);
    } else if (p.crust === 'soil') {
      x.fillStyle = '#16110c'; x.fillRect(0, y(T), w, 6); x.fillStyle = 'rgba(90,110,60,.35)'; x.fillRect(0, y(T), w, 1);
      x.fillStyle = 'rgba(120,100,80,.25)'; for (let k = 3; k < w; k += 7) if (hash(seed + k) < 0.4) x.fillRect(k, y(T - 2 - R(hash(k) * 3)), 2, 1);
      x.fillStyle = 'rgba(40,30,20,.6)'; for (let k = 5; k < w; k += 23) if (hash(seed * 2 + k) < 0.5) x.fillRect(k, y(T - 6), 1, 4 + R(hash(k * 3) * 10));
    }
  },
});

// ---------------------------------------------------------------- the tunnel, cut open lengthwise

const TUNNEL_WALLS: Record<string, string> = { round: '#0b1414', horseshoe: '#0c1312', brick: '#150f0c', gallery: '#0d1312' };

export const tunnelElement = piece({
  type: 'building.tunnel', label: 'Tunnel section (kit, Undercity)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 400, 40, 6000, 1, 'units'), height: num('Clear height (floor to crown)', 64, 44, 200, 1, 'units'),
    profile: select('Section', ['round', 'horseshoe', 'brick', 'gallery']), lining: num('Lining thickness (cut)', 8, 2, 40, 1, 'units'),
    wall: colour('Wall colour'), rings: num('Ring joints every (0: none)', 30, 0, 200, 1, 'units'),
    pipes: num('Pipes under the crown', 2, 0, 6), cables: num('Cable runs on the wall', 0.5, 0, 1, 0.05),
    homes: num('Niches lived in', 0.3, 0, 1, 0.05), tarp: colour('Tarp colour'), led: ledField('LED string colour', '#e8e0b0'),
    lamps: num('Lamps', 2, 0, 40), lamp: select('Lamp kind', ['emergency', 'bulkhead', 'battery']), lampColour: colour('Lamp colour', 'The kind’s own'),
    marks: num('Chalk and spray marks', 0.5, 0, 1, 0.05), chalk: text('Chalk words (empty: none)', ''), chalkAt: num('Chalk words from the left', 40, 0, 6000, 1, 'units'),
    floodline: num('Old flood line', 14, 0, 100, 1, 'units'), drips: num('Drips', 0.4, 0, 1, 0.05),
    ends: select('Closed ends', ['open', 'left', 'right', 'both']), seed: seedField,
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) + Number(p.lining) }),
  bounds: p => ({ x: 0, h: Number(p.height) + Number(p.lining), w: Number(p.width), tall: Number(p.height) + 2 * Number(p.lining) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, end: { x: Number(p.width), h: 0, role: 'mount' }, crown: { x: Number(p.width) / 2, h: Number(p.height), role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), L = Number(p.lining), prof = String(p.profile), seed = Number(p.seed), t = o.t;
    const wall = isHex(p.wall) ? String(p.wall) : TUNNEL_WALLS[prof] ?? TUNNEL_WALLS.round, cut = lift(wall, prof === 'brick' ? 10 : 14), led = hexOr(p.led, '#e8e0b0');
    // the lining, cut: a band over the crown and one under the floor
    x.fillStyle = cut; x.fillRect(0, y(H + L), w, L); x.fillRect(0, y(0), w, L);
    if (prof === 'brick') { bricks(x, 0, H, w, L, seed, 4, 10); bricks(x, 0, -L, w, L, seed + 1, 4, 10); }
    else { x.fillStyle = 'rgba(0,0,0,.35)'; for (let k = 0; k < w; k += 5) { x.fillRect(k, y(H + L) + (k % L), 1, 1); x.fillRect(k, y(0) + ((k + 2) % L), 1, 1); } }
    // the far side of the tube: its wall, the joints, shading where it curves away
    x.fillStyle = wall; x.fillRect(0, y(H), w, H);
    if (prof === 'brick') bricks(x, 0, 0, w, H, seed * 3, 4, 10);
    else if (prof === 'gallery') { x.fillStyle = 'rgba(255,255,255,.022)'; for (let h = 12; h < H; h += 12) x.fillRect(0, y(h), w, 1); }
    const rings = Number(p.rings);
    if (rings > 0 && prof !== 'brick') for (let k = rings / 2; k < w; k += rings) {
      x.fillStyle = 'rgba(0,0,0,.32)'; x.fillRect(R(k), y(H), 1, H); x.fillStyle = 'rgba(255,255,255,.03)'; x.fillRect(R(k) + 1, y(H), 1, H);
      x.fillStyle = 'rgba(150,140,128,.25)'; x.fillRect(R(k) - 2, y(H - 4), 1, 1); x.fillRect(R(k) + 2, y(H - 4), 1, 1); x.fillRect(R(k) - 2, y(5), 1, 1); x.fillRect(R(k) + 2, y(5), 1, 1);
    }
    for (let h = 0; h < H; h += 2) {
      const f = h / H;
      const k = prof === 'gallery' ? (f > 0.88 ? 0.3 : 0) : prof === 'horseshoe' ? (f > 0.6 ? Math.pow((f - 0.6) / 0.4, 2) * 0.55 : f < 0.1 ? (0.1 - f) * 2 : 0) : Math.pow(Math.abs(f - 0.45) * 2, 2) * 0.55;
      if (k > 0.01) { x.fillStyle = 'rgba(0,0,0,' + k.toFixed(3) + ')'; x.fillRect(0, y(h + 2), w, 2); }
    }
    x.fillStyle = rgba(STRUCT, 0.42); x.fillRect(0, y(H), w, 1);
    x.fillStyle = rgba(STRUCT, 0.5); x.fillRect(0, y(0), w, 1); x.fillStyle = rgba(STRUCT, 0.12); x.fillRect(0, y(2), w, 2);
    const fl = Number(p.floodline);
    if (fl > 0 && fl < H) { x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(0, y(fl), w, fl - 2); x.fillStyle = 'rgba(150,170,140,.18)'; x.fillRect(0, y(fl), w, 1); }
    // pipes hung under the crown on straps; the bundle's bottom is where the drops fall from
    const np = Number(p.pipes), hb = np > 0 ? pipeBundle(x, w, H - 3, np, seed, H) : H;
    // cables along the wall, sagging between clips
    const cables = Number(p.cables), ch = Math.min(hb - 6, R(H * 0.72));
    if (cables > 0 && ch > 46) {
      x.strokeStyle = 'rgba(0,0,0,.9)'; x.lineWidth = 1; x.beginPath();
      const nc = 1 + R(cables * 3);
      for (let c = 0; c < nc; c++) for (let a = 0; a < w; a += 30) { const b = Math.min(w, a + 30); x.moveTo(a, y(ch - c * 2) + 0.5); x.quadraticCurveTo((a + b) / 2, y(ch - c * 2 - 3 - (c % 2)) + 0.5, b, y(ch - c * 2) + 0.5); }
      x.stroke();
      x.fillStyle = 'rgba(150,140,128,.35)'; for (let a = 0; a < w; a += 30) x.fillRect(a, y(ch + 1), 1, 2 * nc + 1);
    }
    // lamps first, so the niches keep clear of them
    const nl = Number(p.lamps), kind = String(p.lamp), lampCol = isHex(p.lampColour) ? rgbOf(String(p.lampColour)) : kind === 'emergency' ? RED : kind === 'bulkhead' ? PALE : led;
    const lh = Math.max(28, Math.min(hb - 12, R(H * 0.68))), lampXs = Array.from({ length: nl }, (_, i) => R((w * (i + 0.5)) / Math.max(1, nl)));
    const niches: [number, number, number, number][] = [], homes = Number(p.homes);
    for (let sx = 24 + R(hash(seed) * 40), i = 0; sx < w - 60; i++) {
      const s = seed * 131 + i * 17, aw = 40 + R(hash(s + 1) * 26), ah = Math.min(H - 10, lh - 4, 46 + R(hash(s + 2) * 10));
      if (hash(s) < homes && ah >= 30 && !lampXs.some(lx => lx > sx - 12 && lx < sx + aw + 12)) { niches.push([sx, aw, ah, s]); sx += aw + 30 + R(hash(s + 3) * 70); }
      else sx += 50 + R(hash(s + 3) * 50);
    }
    scatterMarks(x, 0, w, 14, Math.min(hb - 8, H - 10), Number(p.marks), seed, niches.map(([a, b]) => [a - 4, a + b + 4]));
    const chalk = String(p.chalk ?? '');
    if (chalk) chalkWords(x, chalk, Number(p.chalkAt), Math.max(fl, 10) + 6);
    for (const [ax, aw, ah, s] of niches) home(x, o, ax, aw, ah, s, String(p.tarp), led, wall);
    lampXs.forEach((lx, i) => lamp(x, o, kind, lx, lh, lampCol, seed * 17 + i));
    drops(x, t, w, hb, R((w / 40) * Number(p.drips)), seed);
    // a dead end bricked up
    const end = String(p.ends);
    for (const side of end === 'both' ? ['left', 'right'] : end === 'open' ? [] : [end]) {
      const ex = side === 'left' ? 0 : w - 12;
      x.fillStyle = '#1c120e'; x.fillRect(ex, y(H), 12, H); bricks(x, ex, 0, 12, H, seed + ex, 4, 6);
      x.fillStyle = rgba(STRUCT, 0.35); x.fillRect(side === 'left' ? ex + 12 : ex - 1, y(H), 1, H);
    }
  },
});

// ---------------------------------------------------------------- the canal below the towpath

export const canalElement = piece({
  type: 'undercity.canal', label: 'Canal or sewer channel below a path (kit, Undercity)', category: 'environment', libraryUse: 'reusable',
  fields: {
    width: num('Width', 800, 20, 10000, 1, 'units'), depth: num('Water seen below the path', 40, 10, 200, 1, 'units'),
    edge: select('Edge', ['towpath', 'quay', 'none']), water: colour('Water colour', 'Undercity'), glint: ledField('Light on the water', '#6fd6c4'),
    ripples: num('Ripples', 1, 0, 2, 0.05), flow: num('Current (negative: to the left)', 0.3, -3, 3, 0.05), litter: num('Floating litter', 0.4, 0, 1, 0.05),
    boat: select('Boat', ['none', 'punt', 'raft', 'tub']), boatAt: num('Boat from the left', 200, 0, 10000, 1, 'units'), boatDrift: num('Boat drifts (units each way)', 0, 0, 400, 1, 'units'),
    lantern: bool('Lantern on the boat', true), seed: seedField,
  },
  size: p => ({ w: Number(p.width), tall: Number(p.depth) + 60 }),
  bounds: p => ({ x: 0, h: 60, w: Number(p.width), tall: Number(p.depth) + 60 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, end: { x: Number(p.width), h: 0, role: 'mount' }, boat: { x: Number(p.boatAt) + 30, h: -8, role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), D = Number(p.depth), seed = Number(p.seed), t = o.t, edge = String(p.edge), glint = hexOr(p.glint, '#6fd6c4'), flow = Number(p.flow), rip = Number(p.ripples);
    const kerb = edge === 'none' ? 0 : 4, face = edge === 'quay' ? 12 : edge === 'towpath' ? 6 : 2, wt = -(kerb + face);
    if (kerb) {
      x.fillStyle = '#1a2120'; x.fillRect(0, y(0), w, kerb); x.fillStyle = rgba(STRUCT, 0.45); x.fillRect(0, y(0), w, 1);
      x.fillStyle = 'rgba(0,0,0,.5)'; for (let k = 12; k < w; k += 24) x.fillRect(k, y(0) + 1, 1, kerb - 1);
    }
    x.fillStyle = edge === 'quay' ? '#0e1312' : '#0a100f'; x.fillRect(0, y(-kerb), w, face);
    if (edge === 'quay') bricks(x, 0, -kerb - face, w, face, seed, 4, 12);
    x.fillStyle = 'rgba(60,90,60,.25)'; x.fillRect(0, y(wt + 3), w, 2);
    // the water: dark under the wall, a little lighter nearer, its surface broken up by ripples and light
    const base = isHex(p.water) ? String(p.water) : '#06161a', [r0, g0, b0] = [1, 3, 5].map(i => parseInt(base.slice(i, i + 2), 16)), span = D + wt;
    for (let h = 0; h < span; h += 2) { const f = h / span, k = 0.45 + 0.55 * f; x.fillStyle = 'rgb(' + R(r0 * k) + ',' + R(g0 * k) + ',' + R(b0 * k) + ')'; x.fillRect(0, y(wt - h), w, 2); }
    x.fillStyle = rgba(glint, 0.25); x.fillRect(0, y(wt), w, 1);
    for (let h = 3, row = 0; h < span - 1; h += 3 + Math.floor(h / 14), row++) {
      const f = h / span, drift = t * flow * (0.3 + f * 0.6);
      for (let k = -23; k < w; k += 23) {
        const q = hash(k * 0.11 + row * 7 + seed), len = 3 + R(q * 8), sx = k + mod(drift + q * 40, 23);
        if (sx < 0 || sx + len > w) continue;
        x.fillStyle = q < 0.25 ? rgba(glint, (0.1 + 0.08 * f) * rip) : rgba(STRUCT, (0.05 + 0.04 * f) * rip); x.fillRect(R(sx), y(wt - h), len, 1);
      }
    }
    // litter going by on the current
    const nl = R((w / 60) * Number(p.litter));
    for (let i = 0; i < nl; i++) {
      const s = seed * 5 + i, lx = mod(hash(s) * w + t * flow * 0.25 * (0.6 + hash(s + 1)), w), lh = wt - 4 - hash(s + 2) * Math.max(1, span - 8), bob = Math.sin(t / 30 + i) > 0.6 ? 1 : 0;
      x.fillStyle = hash(s + 3) < 0.5 ? 'rgba(200,210,190,.45)' : 'rgba(150,150,140,.35)'; x.fillRect(R(lx), y(lh) - bob, hash(s + 4) < 0.5 ? 3 : 5, hash(s + 4) < 0.5 ? 1 : 2);
    }
    // the boat, moored or drifting slowly
    const boat = String(p.boat);
    if (boat !== 'none') {
      const bx = R(Number(p.boatAt) + Number(p.boatDrift) * Math.sin(t / 400 + seed)), wl = wt - 4;
      const bw = boat === 'punt' ? 72 : boat === 'raft' ? 54 : 24;
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(bx - 2, y(wl - 1), bw + 4, 4);
      for (let k = 1; k < 6; k += 2) { x.fillStyle = rgba(STRUCT, 0.1); x.fillRect(bx + R(Math.sin(t / 30 + k) * 1.5), y(wl - 3 - k), bw, 1); }
      if (boat === 'punt') {
        x.fillStyle = '#1e150e'; x.fillRect(bx + 3, y(wl + 5), bw - 6, 6); x.fillRect(bx, y(wl + 5), 3, 3); x.fillRect(bx + bw - 3, y(wl + 5), 3, 3);
        x.fillStyle = 'rgba(200,170,120,.3)'; x.fillRect(bx, y(wl + 5), bw, 1);
        x.fillStyle = '#1a140e'; x.fillRect(bx + 26, y(wl + 13), 12, 8); x.fillStyle = 'rgba(200,170,120,.2)'; x.fillRect(bx + 26, y(wl + 13), 12, 1);
        x.strokeStyle = '#2a1d12'; x.lineWidth = 2; x.beginPath(); x.moveTo(bx + bw - 10, y(wl - 6)); x.lineTo(bx + bw - 22, y(wl + 58)); x.stroke(); x.lineWidth = 1;
      } else if (boat === 'raft') {
        x.fillStyle = '#1c2c3a'; for (let k = 0; k < 3; k++) x.fillRect(bx + 2 + k * 18, y(wl + 3), 14, 5);
        x.fillStyle = '#2a2016'; x.fillRect(bx, y(wl + 7), bw, 4); x.fillStyle = 'rgba(0,0,0,.5)'; for (let k = bx + 6; k < bx + bw; k += 7) x.fillRect(k, y(wl + 7), 1, 4);
        x.fillStyle = 'rgba(200,170,120,.3)'; x.fillRect(bx, y(wl + 7), bw, 1);
      } else {
        x.fillStyle = '#2a1c12'; x.fillRect(bx, y(wl + 9), bw, 11); x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(bx, y(wl + 6), bw, 1); x.fillRect(bx, y(wl + 1), bw, 1);
        x.fillStyle = 'rgba(200,170,120,.3)'; x.fillRect(bx, y(wl + 9), bw, 1);
      }
      if (p.lantern !== false) {
        const lx = bx + 6, a = 0.75 + 0.2 * Math.sin(t / 9 + seed) * Math.sin(t / 23);
        x.fillStyle = '#140c08'; x.fillRect(lx, y(wl + 24), 1, 18); x.fillRect(lx - 2, y(wl + 25), 5, 1);
        x.fillStyle = rgba(WARM, a); x.fillRect(lx - 1, y(wl + 23), 3, 4);
        x.fillStyle = rgba(WARM, 0.15); x.fillRect(lx - 3 + R(Math.sin(t / 25)), y(wl - 2), 7, 1); x.fillRect(lx - 2 + R(Math.sin(t / 19)), y(wl - 5), 5, 1);
        glowAt(x, o, lx, wl + 21, WARM, a, 22);
      }
    }
  },
});

// ---------------------------------------------------------------- shafts and ladders between levels

export const shaftElement = piece({
  type: 'undercity.shaft', label: 'Shaft between levels (kit, Undercity)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    height: num('Height (bottom floor to top floor)', 110, 20, 2000, 1, 'units'), width: num('Width', 26, 14, 400, 1, 'units'),
    from: num('Cut opens at (the lower tunnel’s crown)', 64, 0, 2000, 1, 'units'),
    kind: select('Kind', ['ladder', 'stairwell', 'lift', 'drain']), top: select('At the top', ['manhole', 'grate', 'hatch', 'open']),
    wall: colour('Wall colour'), stuck: num('Lift car stuck at (share of the way up)', 0.55, 0, 1, 0.01),
    lamp: bool('Battery lamp tied in it', true), lampColour: ledField('Lamp colour', '#e8e0b0'),
    label: text('Chalk mark at the foot (empty: none)', ''), seed: seedField,
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) + 30 }),
  bounds: p => ({ x: -8, h: Number(p.height) + 30, w: Number(p.width) + 16, tall: Number(p.height) + 30 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, top: { x: Number(p.width) / 2, h: Number(p.height), role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), f0 = Math.min(Number(p.from), H), kind = String(p.kind), seed = Number(p.seed), t = o.t;
    const wall = isHex(p.wall) ? String(p.wall) : kind === 'drain' ? '#120c0a' : '#070b0b', cut = lift(wall, 14), tall = H - f0;
    if (tall > 0) {
      x.fillStyle = wall; x.fillRect(0, y(H), w, tall);
      if (kind === 'drain') bricks(x, 0, f0, w, tall, seed, 4, 8);
      else { x.fillStyle = 'rgba(255,255,255,.03)'; for (let h = f0 + 16; h < H; h += 16) x.fillRect(0, y(h), w, 1); }
      x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(0, y(H), 3, tall); x.fillRect(w - 3, y(H), 3, tall);
      x.fillStyle = cut; x.fillRect(-4, y(H), 4, tall); x.fillRect(w, y(H), 4, tall);
      x.fillStyle = rgba(STRUCT, 0.4); x.fillRect(-1, y(H), 1, tall); x.fillRect(w, y(H), 1, tall);
    }
    if (kind === 'stairwell') { x.fillStyle = 'rgba(0,0,0,.25)'; for (let h = f0 + 8; h < H; h += 24) x.fillRect(4, y(h), w - 8, 2); }
    if (kind === 'lift') {
      // a lift that stopped: guide rails, slack cables, the car jammed with its doors pried open
      x.fillStyle = 'rgba(150,140,128,.4)'; x.fillRect(3, y(H + 20), 1, H + 20); x.fillRect(w - 18, y(H + 20), 1, H + 20);
      const cw = Math.max(16, w - 22), ch = R(Math.max(0, H - 44) * Number(p.stuck));
      x.fillStyle = 'rgba(0,0,0,.9)'; x.fillRect(R(cw / 2), y(H + 20), 1, H + 20 - ch - 44); x.fillRect(R(cw / 2) + 3, y(H + 20), 1, H + 20 - ch - 44);
      x.fillStyle = '#14171a'; x.fillRect(4, y(ch + 44), cw, 44); x.fillStyle = 'rgba(150,140,128,.3)'; x.fillRect(4, y(ch + 44), cw, 1); x.fillRect(4, y(ch), cw, 1);
      x.fillStyle = '#07090a'; x.fillRect(8, y(ch + 40), cw - 8, 36);
      x.fillStyle = '#20242a'; x.fillRect(8, y(ch + 40), R((cw - 8) * 0.3), 36); x.fillRect(R(8 + (cw - 8) * 0.72), y(ch + 40), R((cw - 8) * 0.28), 36);
      x.fillStyle = 'rgba(255,42,68,.35)'; x.fillRect(4 + R(cw / 2) - 2, y(ch + 48), 4, 2);
      glyph(x, 1, 4 + cw / 2, ch + 22, 8);
    }
    if (kind === 'drain') {
      // water running down the wall of the drain, a little at a time
      for (let k = 0; k < 6; k++) { const dh = H - mod(t * 1.3 + k * 37, Math.max(1, tall)); x.fillStyle = 'rgba(200,240,232,.45)'; x.fillRect(5 + (k % 2), y(dh), 1, 3); }
      x.fillStyle = rgba(STRUCT, 0.12); x.fillRect(5, y(H), 2, tall);
    }
    // what is at the top, where the upper floor has its hole
    const top = String(p.top), iron = '#1c1d1b';
    if (top !== 'open') { x.fillStyle = iron; x.fillRect(-6, y(H), 6, 3); x.fillRect(w, y(H), 6, 3); x.fillStyle = 'rgba(150,140,128,.4)'; x.fillRect(-6, y(H), 6, 1); x.fillRect(w, y(H), 6, 1); }
    if (top === 'manhole') { x.fillStyle = iron; x.fillRect(w + 8, y(H + Math.min(24, w)), 3, Math.min(24, w)); x.fillStyle = 'rgba(150,140,128,.35)'; x.fillRect(w + 8, y(H + Math.min(24, w)), 1, Math.min(24, w)); }
    else if (top === 'grate') { x.fillStyle = iron; x.fillRect(-8, y(H + 18), 2, 18); x.fillStyle = 'rgba(150,140,128,.4)'; for (let h = 3; h < 18; h += 3) x.fillRect(-9, y(H + h), 4, 1); }
    else if (top === 'hatch') { x.fillStyle = '#20231f'; x.fillRect(-9, y(H + w), 3, w); x.fillStyle = rgba(STRUCT, 0.3); x.fillRect(-6, y(H + w), 1, w); x.fillStyle = 'rgba(255,200,40,.35)'; for (let h = 4; h < w; h += 8) x.fillRect(-9, y(H + h + 3), 3, 3); }
    if (p.lamp !== false) {
      const col = hexOr(p.lampColour, '#e8e0b0'), lh = R((Math.max(f0, 20) + H) / 2), a = 0.8 + 0.2 * Math.sin(t / 60 + seed);
      x.fillStyle = 'rgba(0,0,0,.85)'; x.fillRect(w - 6, y(lh + 8), 1, 6);
      x.fillStyle = '#16150f'; x.fillRect(w - 8, y(lh + 2), 5, 6); x.fillStyle = rgba(col, a); x.fillRect(w - 7, y(lh + 1), 3, 3);
      glowAt(x, o, w - 6, lh - 1, col, a, 22);
    }
    const label = String(p.label ?? '');
    if (label) chalkWords(x, label, w + 8, 24);
  },
});

const METALS: Record<string, string> = { steel: '120,125,130', rust: '130,80,50', galvanised: '150,160,160' };

export const ladderElement = piece({
  type: 'undercity.ladder', label: 'Ladder (kit, Undercity; stand it on a level.stairs with run 0)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    height: num('Height (to the top floor)', 110, 10, 2000, 1, 'units'), width: num('Width', 12, 8, 30, 1, 'units'), rungs: num('Rung spacing', 6, 3, 16, 1, 'units'),
    handles: num('Handles over the top', 30, 0, 60, 1, 'units'), cage: bool('Safety cage', false), metal: select('Metal', ['steel', 'rust', 'galvanised']),
    missing: num('Rungs missing', 0.1, 0, 0.6, 0.05), seed: seedField,
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) + Number(p.handles) }),
  bounds: p => ({ x: -6, h: Number(p.height) + Number(p.handles), w: Number(p.width) + 12, tall: Number(p.height) + Number(p.handles) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, top: { x: 0, h: Number(p.height), role: 'mount' } }),
  paint(x, p) {
    const w = Number(p.width), H = Number(p.height), hd = Number(p.handles), top = H + hd, col = METALS[String(p.metal)] ?? METALS.steel, seed = Number(p.seed), gap = Number(p.rungs);
    x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(2, y(top), w - 4, top);
    for (const rx of [0, w - 2]) { x.fillStyle = rgba(col, 0.9); x.fillRect(rx, y(top), 2, top); x.fillStyle = 'rgba(255,255,255,.14)'; x.fillRect(rx, y(top), 1, top); }
    if (hd > 0) { x.fillStyle = rgba(col, 0.9); x.fillRect(0, y(top), w, 2); }
    for (let h = gap; h < top - 3; h += gap) { if (h < H && hash(seed + h * 0.37) < Number(p.missing)) continue; x.fillStyle = rgba(col, 0.8); x.fillRect(2, y(h), w - 4, 1); }
    x.fillStyle = '#050707'; for (let h = 20; h < H; h += 40) { x.fillRect(-3, y(h), 3, 2); x.fillRect(w, y(h), 3, 2); }
    if (p.cage) {
      x.fillStyle = rgba(col, 0.45); x.fillRect(-5, y(top - 2), 1, top - 32); x.fillRect(w + 4, y(top - 2), 1, top - 32);
      for (let h = 34; h < top - 2; h += 14) x.fillRect(-5, y(h), w + 10, 1);
    }
  },
});

// ---------------------------------------------------------------- the vaulted arcade (the arches where people live)

export const vaultElement = piece({
  type: 'building.vault', label: 'Vaulted arcade (kit, Undercity)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 300, 60, 4000, 1, 'units'), height: num('Height to the crown', 120, 80, 600, 1, 'units'),
    ceiling: select('Ceiling', ['arch', 'flat', 'ribbed']), bays: num('Bays between piers (0: by width)', 0, 0, 24),
    rise: num('Arch rise', 44, 0, 300, 1, 'units'), wall: colour('Concrete'),
    pipes: num('Pipes in the bundle', 3, 0, 8), drips: num('Condensation drips', 0.6, 0, 1, 0.05), tray: bool('Cable tray', true),
    alcoves: num('Alcoves lived in behind tarps', 0.6, 0, 1, 0.05), tarp: colour('Tarp colour'), led: ledField('LED string colour', '#e8e0b0'),
    emergency: num('Emergency lights', 2, 0, 12), emergencyColour: ledField('Emergency light colour', '#ff2a44'),
    marks: num('Chalk and spray marks', 0.5, 0, 1, 0.05), chalk: text('Chalk words on the wall (empty: none)', ''),
    screens: num('Rewired screens', 1, 0, 6), screenText: text('Screen text (empty: static)', ''),
    floodline: num('Old flood line', 28, 0, 120, 1, 'units'), seed: seedField,
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) + 60 }),
  bounds: p => ({ x: 0, h: Number(p.height) + 60, w: Number(p.width), tall: Number(p.height) + 60 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, end: { x: Number(p.width), h: 0, role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), seed = Number(p.seed), t = o.t, r = rng(seed * 6007 + 11);
    const ceiling = String(p.ceiling), wall = isHex(p.wall) ? String(p.wall) : CONCRETE[Math.floor(r() * CONCRETE.length)], near = lift(wall, 9);
    const n = Number(p.bays) > 0 ? Number(p.bays) : Math.max(1, R(w / 150)), pw = 14;
    const rise = ceiling === 'flat' ? 0 : Math.max(0, Math.min(Number(p.rise), H - 60)), sp = rise > 0 ? H - rise : H - 12;
    const fl = Number(p.floodline), led = hexOr(p.led, '#e8e0b0'), em = hexOr(p.emergencyColour, '#ff2a44');
    // where things go, worked out first: pipes high (over the heads), the tray over them, the alcoves under
    const np = Number(p.pipes), pt = Math.max(54, Math.min(sp - 6, R(H * 0.55)));
    let hb = pt; for (let k = 0; k < np; k++) hb -= 3 + Math.floor(hash(seed * 7 + k) * 3) + 1;
    const bays = Array.from({ length: n }, (_, i) => {
      const L = R((i * w) / n + pw / 2), Rr = R(((i + 1) * w) / n - pw / 2), s = seed * 131 + i * 17, span = Rr - L;
      const aw = Math.min(span - 16, 44 + R(hash(s + 1) * 28)), ah = Math.min(48 + R(hash(s + 2) * 12), hb - 6, sp - 6), home = hash(s) < Number(p.alcoves) && aw >= 30 && ah >= 34;
      return { L, R: Rr, s, home, aw, ah, ax: R(L + 8 + hash(s + 3) * Math.max(0, span - aw - 16)) };
    });
    // the mass: piers, spandrels and the rock over the vault, up out of the top of the view
    x.fillStyle = near; x.fillRect(0, y(H + 400), w, H + 400);
    x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(0, y(H + 400), w, 400 - 16);
    x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(0, y(H + 16), w, 1);
    const recess = (L: number, Rr: number) => {
      x.beginPath();
      if (rise > 0) { x.moveTo(L, 0); x.lineTo(L, y(sp)); x.ellipse((L + Rr) / 2, y(sp), (Rr - L) / 2, rise, 0, Math.PI, 0); x.lineTo(Rr, 0); x.closePath(); }
      else x.rect(L, y(sp), Rr - L, sp);
    };
    for (const b of bays) {
      x.save(); recess(b.L, b.R); x.clip();
      x.fillStyle = wall; x.fillRect(b.L, y(H), b.R - b.L, H);
      x.fillStyle = 'rgba(255,255,255,.022)'; for (let h = 14; h < H; h += 14) x.fillRect(b.L, y(h), b.R - b.L, 1);
      x.fillStyle = 'rgba(0,0,0,.22)'; for (let k = b.L + 24; k < b.R; k += 48) x.fillRect(k, y(H), 1, H);
      x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(b.L, y(H), b.R - b.L, H - sp + 12);
      for (let k = 0; k < Math.round((b.R - b.L) / 12); k++) { const sx = R(b.L + hash(b.s + k * 3) * (b.R - b.L)), len = 10 + R(hash(b.s + k * 3 + 1) * sp * 0.6); x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(sx, y(sp + 6), 2, len); }
      x.restore();
      x.fillStyle = rgba(STRUCT, 0.32); x.fillRect(b.L - 1, y(sp), 1, sp); x.fillRect(b.R, y(sp), 1, sp);
      x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(b.L, y(sp), 2, sp);
      if (rise > 0) {
        x.strokeStyle = rgba(STRUCT, 0.38); x.lineWidth = 2; x.beginPath(); x.ellipse((b.L + b.R) / 2, y(sp), (b.R - b.L) / 2 + 1, rise + 1, 0, Math.PI, 0); x.stroke();
        if (ceiling === 'ribbed' && rise > 12) {
          x.strokeStyle = rgba(STRUCT, 0.16); x.lineWidth = 1; x.beginPath(); x.ellipse((b.L + b.R) / 2, y(sp), (b.R - b.L) / 2 - 7, rise - 7, 0, Math.PI, 0); x.stroke();
          x.fillStyle = rgba(STRUCT, 0.3); for (let k = 1; k < 8; k++) { const a = Math.PI + (Math.PI * k) / 8; x.fillRect(R((b.L + b.R) / 2 + Math.cos(a) * ((b.R - b.L) / 2 - 3)), R(y(sp) + Math.sin(a) * (rise - 3)), 2, 2); }
        }
        x.lineWidth = 1;
      }
    }
    if (rise === 0) {
      x.fillStyle = lift(wall, 14); x.fillRect(0, y(H), w, 12); x.fillStyle = rgba(STRUCT, 0.38); x.fillRect(0, y(sp), w, 1);
      x.fillStyle = 'rgba(0,0,0,.4)'; for (let k = 20; k < w; k += 40) x.fillRect(k, y(H), 1, 12);
    }
    for (let i = 0; i <= n; i++) {
      const c = R((i * w) / n), l = Math.max(0, c - pw / 2 - 1), rr = Math.min(w, c + pw / 2 + 1);
      x.fillStyle = lift(wall, 4); x.fillRect(l, y(10), rr - l, 10); x.fillStyle = rgba(STRUCT, 0.25); x.fillRect(l, y(10), rr - l, 1);
      if (rise > 0) { const a = Math.max(0, l - 2), b = Math.min(w, rr + 2); x.fillStyle = lift(wall, 16); x.fillRect(a, y(sp + 3), b - a, 3); x.fillStyle = rgba(STRUCT, 0.3); x.fillRect(a, y(sp + 3), b - a, 1); }
    }
    if (fl > 0) { x.fillStyle = 'rgba(0,0,0,.24)'; x.fillRect(0, y(fl), w, fl); x.fillStyle = 'rgba(150,170,140,.2)'; x.fillRect(0, y(fl), w, 1); x.fillStyle = 'rgba(60,80,60,.16)'; x.fillRect(0, y(fl) + 1, w, 2); }
    x.fillStyle = rgba(STRUCT, 0.16); x.fillRect(0, y(2), w, 2);
    // chalk and spray, kept off the alcoves; the words over the flood line (or the alcove)
    for (const b of bays) scatterMarks(x, b.L, b.R, 16, hb - 6, Number(p.marks), b.s, b.home ? [[b.ax - 4, b.ax + b.aw + 4]] : []);
    const chalk = String(p.chalk ?? '');
    if (chalk) {
      const b = bays[Math.floor(hash(seed + 0.5) * bays.length) % bays.length], above = b.home ? b.ah + 12 : Math.max(fl, 14) + 5;
      if (above < hb - 4) chalkWords(x, chalk, b.L + 8, above);
    }
    for (const b of bays) if (b.home) home(x, o, b.ax, b.aw, b.ah, b.s, String(p.tarp), led, wall);
    for (let k = 23; k < w; k += 46) { x.fillStyle = 'rgba(0,0,0,.16)'; x.fillRect(k + 1, y(hb), 1, Math.max(0, hb - 12)); }
    const tray = Math.min(H - 14, pt + 18);
    if (p.tray !== false && tray > pt + 6) {
      x.fillStyle = '#121615'; for (let k = 10; k < w; k += 40) { x.fillRect(k, y(tray), 2, 10); x.fillRect(k, y(tray), 8, 2); }
      x.fillStyle = 'rgba(150,140,128,.45)'; x.fillRect(0, y(tray + 6), w, 1); x.fillRect(0, y(tray), w, 1);
      x.fillStyle = 'rgba(150,140,128,.25)'; for (let k = 2; k < w; k += 6) x.fillRect(k, y(tray + 6), 1, 6);
      x.fillStyle = '#0a0c0b'; x.fillRect(0, y(tray + 5), w, 3);
      x.strokeStyle = 'rgba(0,0,0,.9)'; x.beginPath();
      for (let k = 0; k < Math.round(w / 90); k++) { const a = R(hash(seed * 3 + k) * (w - 40)), len = 20 + R(hash(seed * 3 + k + 1) * 30); x.moveTo(a + 0.5, y(tray) + 0.5); x.quadraticCurveTo(a + len / 2, y(tray - 10 - hash(seed + k) * 6), a + len + 0.5, y(tray) + 0.5); }
      x.stroke();
    }
    pipeBundle(x, w, pt, np, seed);
    if (np > 0) drops(x, t, w, hb, Math.round((w / 26) * Number(p.drips)), seed);
    const ne = Number(p.emergency), eh = Math.min(H - 12, tray + 16);
    for (let i = 0; i < ne; i++) lamp(x, o, 'emergency', R((w * (i + 0.5)) / ne), eh, em, seed * 17 + i);
    // rewired screens, where a bay has wall to spare between the alcove and the pipes
    const ns = Number(p.screens), words = String(p.screenText ?? ''), sh = 18, sw = words ? 42 : 26;
    for (let i = 0, placed = 0; i < bays.length * 2 && placed < ns; i++) {
      const b = bays[i % bays.length], low = b.home ? b.ah + 8 : 30, sb = Math.min(72, hb - sh - 6);
      if (sb < low || b.R - b.L < sw + 16) continue;
      const sx = R(i < bays.length ? b.R - sw - 8 : b.L + 8);
      placed++;
      x.fillStyle = '#141614'; x.fillRect(sx - 2, y(sb + sh + 2), sw + 4, sh + 4); x.fillStyle = rgba(STRUCT, 0.3); x.fillRect(sx - 2, y(sb + sh + 2), sw + 4, 1);
      x.fillStyle = rgba(COLD, 0.14); x.fillRect(sx, y(sb + sh), sw, sh);
      if (words) { x.font = mono(7, '600'); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = rgba(COLD, Math.floor(t / 90 + i) % 7 === 0 ? 0.35 : 0.85); x.fillText(words, sx + sw / 2, y(sb + sh / 2) + 0.5); }
      else {
        const f = Math.floor(t / 3);
        for (let gy = 0; gy < sh; gy += 2) for (let gx = 0; gx < sw; gx += 2) { const q = hash(seed + i * 977 + gx * 31 + gy * 7 + f * 131); x.fillStyle = rgba(COLD, 0.08 + q * 0.45); x.fillRect(sx + gx, y(sb + sh) + gy, 2, 2); }
        x.fillStyle = rgba(COLD, 0.25); x.fillRect(sx, y(sb + sh) + R((t * 0.4 + i * 9) % sh), sw, 2);
      }
      x.fillStyle = 'rgba(200,190,150,.4)'; x.fillRect(sx - 2, y(sb + sh + 2), 5, 2); x.fillRect(sx + sw - 4, y(sb - 1), 6, 2);
      const bx = sx + sw / 2 + 4;
      x.strokeStyle = 'rgba(0,0,0,.9)'; x.beginPath(); x.moveTo(sx + sw / 2 - 2 + 0.5, y(sb - 2)); x.quadraticCurveTo(sx + sw / 2 - 6, y(sb / 2), bx + 1.5, y(8)); x.moveTo(sx + sw / 2 + 2 + 0.5, y(sb - 2)); x.quadraticCurveTo(sx + sw / 2 + 10, y(sb / 2), bx + 7.5, y(8)); x.stroke();
      x.fillStyle = '#1e1c16'; x.fillRect(bx, y(8), 10, 8); x.fillStyle = 'rgba(150,140,128,.35)'; x.fillRect(bx, y(8), 10, 1);
      x.fillStyle = rgba(RED, 0.8); x.fillRect(bx + 1, y(9), 2, 1);
      o.light?.(sx + sw / 2, sb + sh / 2, sw, sh, COLD, 'screen');
    }
  },
});

// ---------------------------------------------------------------- above ground: the way down

export const metroEntranceElement = piece({
  type: 'undercity.metro-entrance', label: 'Dead metro entrance, cut open below the street (kit, Undercity)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    depth: num('Depth of the ticket hall below the street', 96, 60, 400, 1, 'units'), run: num('Stair run', 120, 60, 400, 1, 'units'),
    landing: num('Ticket hall width', 220, 60, 800, 1, 'units'), tiles: colour('Tile colour', 'Grimy cream'), stripe: ledField('Line colour band', '#8a6a2a'),
    label: text('Sign on the post (empty: none)', 'LINE 4'), notice: text('Board on the railing (empty: none)', 'CLOSED'),
    sealed: select('Far end of the hall', ['bricked', 'boarded', 'rubble']), turnstiles: num('Turnstiles', 3, 0, 8), marks: num('Chalk marks going down', 0.6, 0, 1, 0.05), seed: seedField,
  },
  size: p => ({ w: Number(p.run) + Number(p.landing), tall: 80 }),
  bounds: p => ({ x: -24, h: 80, w: Number(p.run) + Number(p.landing) + 24, tall: 80 + Number(p.depth) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, foot: { x: Number(p.run), h: -Number(p.depth), role: 'mount' }, hall: { x: Number(p.run) + Number(p.landing) / 2, h: -Number(p.depth), role: 'surface' } }),
  paint(x, p, o) {
    const D = Number(p.depth), Rn = Number(p.run), Lw = Number(p.landing), seed = Number(p.seed), t = o.t, W = Rn + Lw;
    const tiles = isHex(p.tiles) ? String(p.tiles) : '#1d1f19', stripe = hexOr(p.stripe, '#8a6a2a');
    const hc = Math.min(-10, -D + 56), xm = R(Math.min(Rn, Math.max(30, (66 * Rn) / D)));
    const path = () => { x.beginPath(); x.moveTo(0, y(0)); x.lineTo(Rn, y(-D)); x.lineTo(W, y(-D)); x.lineTo(W, y(hc)); x.lineTo(Rn, y(hc)); x.lineTo(xm, y(-10)); x.lineTo(xm, y(0)); x.closePath(); };
    // the street slab over the passage, in section
    x.fillStyle = '#191b1b'; x.fillRect(xm, y(0), W - xm, 10); x.fillStyle = 'rgba(0,0,0,.35)'; for (let k = xm; k < W; k += 5) x.fillRect(k, y(0) + ((k - xm) % 9) + 1, 1, 1);
    // the passage and the hall: tiles gone grey, missing in places, the line's colour band, posters torn off
    x.save(); path(); x.clip();
    x.fillStyle = tiles; x.fillRect(0, y(0), W, D + 1);
    x.fillStyle = 'rgba(0,0,0,.28)'; for (let h = -D; h < 0; h += 4) x.fillRect(0, y(h), W, 1); for (let k = 0; k < W; k += 6) x.fillRect(k, y(0), 1, D);
    for (let i = 0; i < W / 9; i++) { x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(R(hash(seed + i) * W / 6) * 6, y(-D + R(hash(seed * 3 + i) * D / 4) * 4 + 4), 6, 4); }
    x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, y(0), W, D + 1);
    x.fillStyle = rgba(stripe, 0.5); x.beginPath(); x.moveTo(0, y(28)); x.lineTo(Rn, y(-D + 28)); x.lineTo(W, y(-D + 28)); x.lineTo(W, y(-D + 24)); x.lineTo(Rn, y(-D + 24)); x.lineTo(0, y(24)); x.closePath(); x.fill();
    for (let i = 0; i < 4; i++) { const px = Rn + 20 + i * ((Lw - 60) / 4); x.fillStyle = 'rgba(200,190,160,.13)'; x.fillRect(R(px), y(-D + 48), 18, 14); x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(R(px) + 3 + (i % 3), y(-D + 48), 6, 9); }
    x.restore();
    x.strokeStyle = rgba(STRUCT, 0.4); x.lineWidth = 1; x.beginPath(); x.moveTo(xm, y(-10) + 0.5); x.lineTo(Rn, y(hc) + 0.5); x.lineTo(W, y(hc) + 0.5); x.stroke();
    x.fillStyle = rgba(STRUCT, 0.45); x.fillRect(Rn, y(-D), Lw, 1);
    // dead ceiling lights, one still flickering
    for (let k = xm + 30, i = 0; k < W - 10; k += 46, i++) {
      const ch = k < Rn ? -10 + ((hc + 10) * (k - xm)) / Math.max(1, Rn - xm) : hc, on = i === 2 && hash(seed + Math.floor(t / 5)) > 0.35;
      x.fillStyle = '#101211'; x.fillRect(k - 8, y(ch) + 1, 16, 3); if (on) { x.fillStyle = rgba(PALE, 0.8); x.fillRect(k - 7, y(ch) + 4, 14, 1); o.light?.(k, ch - 4, 14, 3, PALE, 'screen'); }
    }
    // the ticket hall: dead turnstiles, a shuttered booth, the far end sealed
    const nt = Number(p.turnstiles);
    for (let i = 0; i < nt; i++) { const tx = Rn + 24 + i * 16; x.fillStyle = '#16181a'; x.fillRect(tx, y(-D + 24), 4, 24); x.fillStyle = 'rgba(150,140,128,.35)'; x.fillRect(tx, y(-D + 24), 4, 1); x.fillRect(tx + 4, y(-D + 16), 9, 1); x.fillStyle = 'rgba(255,42,68,.25)'; x.fillRect(tx + 1, y(-D + 20), 2, 2); }
    const bx = R(Rn + Lw * 0.55);
    x.fillStyle = '#121413'; x.fillRect(bx, y(-D + 44), 40, 44); x.fillStyle = 'rgba(150,140,128,.3)'; x.fillRect(bx, y(-D + 44), 40, 1);
    x.fillStyle = 'rgba(150,140,128,.18)'; for (let h = -D + 18; h < -D + 40; h += 3) x.fillRect(bx + 4, y(h), 32, 1);
    const sealed = String(p.sealed), ex = W - 14;
    if (sealed === 'bricked') { x.fillStyle = '#1c120e'; x.fillRect(ex, y(hc), 14, hc + D); bricks(x, ex, -D, 14, hc + D, seed, 4, 7); }
    else if (sealed === 'boarded') { x.fillStyle = '#2a2016'; for (let h = -D + 2; h < hc; h += 7) x.fillRect(ex - 2, y(h + 5), 16, 5); x.fillStyle = 'rgba(0,0,0,.5)'; for (let h = -D + 2; h < hc; h += 7) x.fillRect(ex - 2, y(h), 16, 1); }
    else { x.fillStyle = '#141615'; for (let k = 0; k < 6; k++) x.fillRect(ex - 18 + k * 5, y(-D + 4 + ((k * 7) % 12)), 8, 4 + ((k * 7) % 12)); }
    x.fillStyle = rgba(STRUCT, 0.35); x.fillRect(ex - 1, y(hc), 1, hc + D);
    // the Ghosts' marks start here, pointing down
    const m = R(Number(p.marks) * 6);
    for (let i = 0; i < m; i++) { const f = (i + 0.5) / m, gx = xm + f * (Rn - xm) * 0.9 + 6, gh = -D * (gx / Rn) + 36; glyph(x, i % 3 === 0 ? 0 : 2, gx, gh, 7); }
    if (m > 0) glyph(x, 4, Rn + Lw * 0.3, -D + 52, 8);
    // above the street: the railing round the mouth, the gate hanging open, the board, the dead sign
    x.fillStyle = '#1a1c1c'; for (const px of [0, R(xm / 2), xm - 2]) x.fillRect(px, y(22), 2, 22);
    x.fillStyle = 'rgba(150,140,128,.5)'; x.fillRect(0, y(22), xm, 2); x.fillRect(0, y(12), xm, 1);
    x.fillStyle = '#1a1c1c'; x.fillRect(-8, y(22), 2, 22); x.fillStyle = 'rgba(150,140,128,.45)'; for (let k = -7; k < 0; k += 3) x.fillRect(k, y(21), 1, 20);
    x.fillStyle = 'rgba(150,140,128,.4)'; x.fillRect(-8, y(22), 8, 1); x.fillRect(-8, y(2), 8, 1);
    const notice = String(p.notice ?? '');
    if (notice) {
      x.font = mono(7, '600'); const nw = Math.max(30, R(x.measureText(notice).width) + 8), nx = R(xm / 2 - nw / 2);
      x.fillStyle = '#2a2016'; x.fillRect(nx, y(18), nw, 11); x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(nx + 2, y(17), 1, 1); x.fillRect(nx + nw - 3, y(17), 1, 1);
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = rgba(PALE, 0.75); x.fillText(notice, nx + nw / 2, y(12.5));
    }
    const label = String(p.label ?? '');
    x.fillStyle = '#141516'; x.fillRect(-18, y(70), 2, 70);
    if (label) {
      x.font = mono(7, '600'); const lw = Math.max(28, R(x.measureText(label).width) + 8);
      x.fillStyle = '#101211'; x.fillRect(-17 - lw / 2, y(82), lw, 12); x.fillStyle = 'rgba(150,140,128,.3)'; x.fillRect(-17 - lw / 2, y(82), lw, 1);
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = rgba(PALE, 0.35); x.fillText(label, -17, y(76));
      x.fillStyle = 'rgba(0,0,0,.7)'; x.fillRect(R(-17 - lw / 2 + lw * 0.6), y(82), 1, 12);
    }
  },
});

export const lotElement = piece({
  type: 'undercity.lot', label: 'Overgrown lot behind a fence (kit, Undercity)', category: 'environment', libraryUse: 'reusable',
  fields: {
    width: num('Width', 300, 60, 3000, 1, 'units'), fence: bool('Chain-link fence', true), fenceHeight: num('Fence height', 54, 20, 140, 1, 'units'),
    gap: num('Cut in the fence, from the left (-1: none)', 120, -1, 3000, 1, 'units'), weeds: num('Weeds and bushes', 0.7, 0, 1, 0.05), rubble: num('Rubble and dumped things', 0.5, 0, 1, 0.05),
    sign: text('Sign on the fence (empty: none)', 'NO ENTRY'), marks: num('Chalk on the posts', 0.5, 0, 1, 0.05), seed: seedField,
  },
  size: p => ({ w: Number(p.width), tall: Number(p.fenceHeight) + 30 }),
  bounds: p => ({ x: 0, h: Number(p.fenceHeight) + 30, w: Number(p.width), tall: Number(p.fenceHeight) + 30 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, gap: { x: Number(p.gap) + 12, h: 0, role: 'entrance' } }),
  paint(x, p) {
    const w = Number(p.width), fh = Number(p.fenceHeight), seed = Number(p.seed), r = rng(seed * 313 + 9), weeds = Number(p.weeds), rub = Number(p.rubble);
    x.fillStyle = '#100c09'; x.fillRect(0, y(3), w, 3);
    // rubble: broken slabs with their rebar, a tyre, a mattress
    for (let i = 0; i < R((w / 70) * rub * 2); i++) {
      const rx = R(r() * (w - 30)), rw = 14 + R(r() * 26), rh = 5 + R(r() * 12), k = r();
      if (k < 0.6) { x.fillStyle = '#1a1c1b'; x.beginPath(); x.moveTo(rx, y(0)); x.lineTo(rx + 4, y(rh)); x.lineTo(rx + rw * 0.6, y(rh + 3)); x.lineTo(rx + rw, y(0)); x.closePath(); x.fill(); x.fillStyle = 'rgba(200,190,170,.15)'; x.fillRect(rx + 4, y(rh), R(rw * 0.5), 1); x.fillStyle = 'rgba(150,110,70,.6)'; x.fillRect(rx + R(rw * 0.6), y(rh + 6), 1, 5); }
      else if (k < 0.8) { x.fillStyle = '#0a0a0a'; x.beginPath(); x.ellipse(rx + 8, y(7), 8, 6, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = '#100c09'; x.beginPath(); x.ellipse(rx + 8, y(7), 3, 2, 0, 0, Math.PI * 2); x.fill(); }
      else { x.fillStyle = '#2a2620'; x.fillRect(rx, y(6), 30, 6); x.fillStyle = 'rgba(0,0,0,.35)'; for (let k2 = rx + 4; k2 < rx + 30; k2 += 6) x.fillRect(k2, y(6), 1, 6); }
    }
    // weeds and bushes: dull greens, blades of grass along the foot, a few bushes up the fence
    for (let i = 0; i < R((w / 50) * weeds * 2); i++) {
      const bx = R(r() * w), br = 8 + R(r() * 12), c = ['24,34,20', '30,40,22', '20,30,24'][Math.floor(r() * 3)];
      x.fillStyle = rgba(c, 0.95); x.beginPath(); x.ellipse(bx, y(br * 0.7), br, br * 0.8, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(90,110,60,.2)'; x.fillRect(bx - R(br * 0.5), y(br * 1.3), R(br * 0.7), 1);
    }
    x.fillStyle = 'rgba(60,80,40,.8)';
    for (let k = 0; k < w; k += 2) if (hash(seed + k) < weeds * 0.8) { const h = 2 + R(hash(seed * 3 + k) * 9); x.fillRect(k, y(h), 1, h); }
    if (p.fence !== false) {
      // chain-link on pipe posts, the cut flap peeled back at the gap
      const g = Number(p.gap), gw = 22;
      x.save(); x.beginPath(); x.rect(0, y(fh), w, fh); if (g >= 0) x.rect(g + gw, y(fh), -gw, fh); x.clip('evenodd');
      x.strokeStyle = 'rgba(150,150,140,.22)'; x.lineWidth = 1; x.beginPath();
      for (let k = -fh; k < w; k += 5) { x.moveTo(k + 0.5, y(0)); x.lineTo(k + fh + 0.5, y(fh)); x.moveTo(k + fh + 0.5, y(0)); x.lineTo(k + 0.5, y(fh)); }
      x.stroke(); x.restore();
      if (g >= 0) { x.strokeStyle = 'rgba(150,150,140,.3)'; x.beginPath(); for (let k = 0; k < 14; k += 4) { x.moveTo(g + gw + 0.5, y(k)); x.lineTo(g + gw + 8.5, y(k + 4)); } x.stroke(); }
      x.fillStyle = '#1e201f'; for (let k = 0; k <= w; k += 40) x.fillRect(Math.min(k, w - 2), y(fh + 2), 2, fh + 2);
      x.fillStyle = 'rgba(150,140,128,.45)'; x.fillRect(0, y(fh + 2), w, 1);
      x.strokeStyle = 'rgba(150,140,128,.4)'; x.beginPath(); for (let k = 4; k < w; k += 6) { x.moveTo(k, y(fh + 3)); x.lineTo(k + 3, y(fh + 6)); } x.stroke();
      const sign = String(p.sign ?? '');
      if (sign) {
        x.font = mono(7, '600'); const sw = R(x.measureText(sign).width) + 10, sx = R(w * 0.7 - sw / 2);
        x.fillStyle = '#c8c0a8'; x.fillRect(sx, y(fh * 0.6 + 11), sw, 11); x.fillStyle = 'rgba(160,30,30,.85)'; x.fillRect(sx, y(fh * 0.6 + 11), sw, 2);
        x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#1a1612'; x.fillText(sign, sx + sw / 2, y(fh * 0.6 + 4.5));
      }
      const m = R(Number(p.marks) * 3);
      for (let i = 0; i < m; i++) glyph(x, i === 0 ? 2 : i === 1 ? 0 : 5, Math.min(w - 8, 40 * (i + 1) + 6), 26, 6);
    }
  },
});

// ---------------------------------------------------------------- the data hall

/** One server rack standing in water: its reflection, LEDs still going under the surface, the cabinet. */
function rack(x: CanvasRenderingContext2D, o: Paint, x0: number, base: number, rw: number, rh: number, s: number, far: boolean, led: string, running: number, wf: number, ceiling: number) {
  const t = o.t, run = hash(s) < running, body = far ? '#060d0d' : '#091313', rim = rgba(STRUCT, far ? 0.2 : 0.38);
  x0 = R(x0);
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
      x.strokeStyle = 'rgba(0,0,0,.85)'; x.beginPath(); x.moveTo(x0 + rw / 2 + 0.5, y(base + rh)); x.quadraticCurveTo(x0 + rw / 2 + 14, y((base + rh + ceiling) / 2), x0 + rw / 2 + 6.5, y(ceiling)); x.stroke();
      o.light?.(x0 + rw / 2, base + rh / 2, rw, rh * 0.6, led, 'screen');
    }
  } else if (hash(s + 3) < 0.35) { x.fillStyle = rgba(RED, 0.5); x.fillRect(x0 + 3, y(base + rh - 6), 1, 1); }
}

export const dataHallElement = piece({
  type: 'landmark.data-hall', label: 'The flooded data hall (landmark, Undercity)', category: 'architecture',
  fields: {
    width: num('Width', 1100, 400, 4000, 1, 'units'), height: num('Height to the ceiling', 330, 160, 700, 1, 'units'),
    below: num('Water seen below the walkway', 110, 20, 300, 1, 'units'), far: num('Where the water meets the back wall', 40, 10, 140, 1, 'units'),
    rows: num('Rows of racks', 3, 1, 4), racks: num('Racks in the nearest row', 14, 2, 60), depth: num('Water up the racks', 0.45, 0, 0.9, 0.05),
    running: num('Racks still running', 0.35, 0, 1, 0.05), led: ledField('Rack LED colour', '#6fd6c4'), ripples: num('Ripples', 1, 0, 2, 0.05),
    columns: num('Columns every (0: none)', 220, 0, 1000, 1, 'units'), lights: num('Hall lights still working', 0.2, 0, 1, 0.05), cables: num('Cables hanging from the ceiling', 0.5, 0, 1, 0.05),
    mouth: select('Tunnel mouth', ['left', 'right', 'none']), mouthHeight: num('Tunnel mouth height', 66, 44, 200, 1, 'units'),
    gallery: num('Gallery height', 120, 60, 400, 1, 'units'), galleryFrom: num('Gallery from the left', 640, 0, 4000, 1, 'units'), galleryWidth: num('Gallery width (0: none)', 400, 0, 4000, 1, 'units'),
    stair: bool('Gallery stair, broken off', true), letters: text('Stencil on the back wall (empty: none)', 'B2 · DATA HALL'), wall: colour('Concrete', 'Undercity'), seed: seedField,
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) + 40 }),
  bounds: p => ({ x: 0, h: Number(p.height) + 40, w: Number(p.width), tall: Number(p.height) + 40 + Number(p.below) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, gallery: { x: Number(p.galleryFrom), h: Number(p.gallery), role: 'surface' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), B = Number(p.below), far = Number(p.far), seed = Number(p.seed), t = o.t, depth = Number(p.depth), running = Number(p.running), rip = Number(p.ripples);
    const wall = isHex(p.wall) ? String(p.wall) : '#081010', near = lift(wall, 9), led = hexOr(p.led, '#6fd6c4');
    const gH = Number(p.gallery), gx = Number(p.galleryFrom), gw = Math.min(Number(p.galleryWidth), w - gx);
    // the rock over the hall and its ceiling slab, the back wall in panels
    x.fillStyle = near; x.fillRect(0, y(H + 400), w, 400); x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(0, y(H + 400), w, 380);
    x.fillStyle = lift(wall, 14); x.fillRect(0, y(H + 20), w, 20); x.fillStyle = rgba(STRUCT, 0.45); x.fillRect(0, y(H), w, 1);
    x.fillStyle = 'rgba(0,0,0,.4)'; for (let k = 30; k < w; k += 60) x.fillRect(k, y(H + 20), 1, 20);
    x.fillStyle = '#040909'; x.fillRect(0, y(H), w, H - far);
    x.fillStyle = 'rgba(255,255,255,.02)'; for (let h = far + 30; h < H; h += 30) x.fillRect(0, y(h), w, 1); x.fillStyle = 'rgba(0,0,0,.35)'; for (let k = 40; k < w; k += 80) x.fillRect(k, y(H), 1, H - far);
    x.fillStyle = 'rgba(150,170,140,.08)'; x.fillRect(0, y(far + 70), w, 1); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, y(far + 70), w, 70);
    const letters = String(p.letters ?? '');
    if (letters) { x.font = mono(9, '600'); x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillStyle = rgba(PALE, 0.3); x.fillText(letters, 60, y(H - 52)); }
    // hall lights on chains, most dead; cables hanging down out of the ceiling trays
    for (let k = 50, i = 0; k < w - 30; k += 90, i++) {
      const s = seed * 19 + i, live = hash(s) < Number(p.lights), on = live && hash(s + Math.floor(t / 7)) > 0.15, hang = hash(s + 1) < 0.2;
      x.fillStyle = 'rgba(0,0,0,.9)'; x.fillRect(k - 10, y(H), 1, 22); x.fillRect(k + 10, y(H), 1, hang ? 30 : 22);
      x.save(); x.translate(k, y(H - 23)); if (hang) x.rotate(0.3);
      x.fillStyle = '#101614'; x.fillRect(-12, -2, 24, 4); if (on) { x.fillStyle = rgba(WIN, 0.8); x.fillRect(-11, 1, 22, 1); }
      x.restore();
      if (on) glowAt(x, o, k, H - 24, WIN, 0.8, 40);
    }
    x.strokeStyle = 'rgba(0,0,0,.85)'; x.beginPath();
    for (let i = 0; i < R((w / 40) * Number(p.cables)); i++) { const cx = R(hash(seed * 23 + i) * w) + 0.5, len = 30 + R(hash(seed + i * 7) * (H * 0.5)); x.moveTo(cx, y(H)); x.quadraticCurveTo(cx + 6, y(H - len / 2), cx + 2, y(H - len)); }
    x.stroke();
    // the gallery along the back wall on its posts, and the stair off its end that broke off halfway
    if (gw > 0) {
      x.fillStyle = '#121816'; for (let k = gx + 10; k < gx + gw; k += 60) x.fillRect(k, y(gH), 3, gH - far);
      x.fillStyle = lift(wall, 16); x.fillRect(gx, y(gH), gw, 6); x.fillStyle = rgba(STRUCT, 0.45); x.fillRect(gx, y(gH), gw, 1);
      x.fillStyle = 'rgba(150,140,128,.45)'; x.fillRect(gx, y(gH + 30), gw, 1); x.fillRect(gx, y(gH + 15), gw, 1); for (let k = gx; k < gx + gw; k += 24) x.fillRect(k, y(gH + 30), 1, 30);
      x.fillStyle = '#020505'; x.fillRect(gx + gw - 40, y(gH + 48), 24, 48); x.fillStyle = rgba(STRUCT, 0.3); x.fillRect(gx + gw - 41, y(gH + 49), 26, 1);
      if (p.stair !== false) {
        const steps = Math.floor((gH - far) / 6), keep = Math.floor(steps * 0.55);
        for (let k = 0; k < keep; k++) { const sx = gx - 7 - k * 6, sh = gH - 6 - k * 6; x.fillStyle = '#121816'; x.fillRect(sx, y(sh + 2), 7, 3); x.fillStyle = rgba(STRUCT, 0.35); x.fillRect(sx, y(sh + 2), 7, 1); }
        const ex = gx - keep * 6, eh = gH - keep * 6;
        x.strokeStyle = '#1c2220'; x.lineWidth = 2; x.beginPath(); x.moveTo(gx, y(gH - 2)); x.lineTo(ex, y(eh - 4)); x.stroke(); x.lineWidth = 1;
        x.strokeStyle = 'rgba(150,140,128,.45)'; x.beginPath(); x.moveTo(gx, y(gH + 16) + 0.5); x.lineTo(ex, y(eh + 14) + 0.5); x.lineTo(ex - 3, y(eh + 2)); x.lineTo(ex - 1, y(eh - 8)); x.stroke();
        x.save(); x.translate(ex - 30, y(far - 2)); x.rotate(0.2); x.fillStyle = '#101614'; x.fillRect(-20, -4, 44, 4);
        for (let k = -18; k < 22; k += 6) { x.fillStyle = '#121816'; x.fillRect(k, -7, 6, 3); x.fillStyle = rgba(STRUCT, 0.3); x.fillRect(k, -7, 6, 1); }
        x.restore();
      }
    }
    // the water plane: from far up the back wall down under the walkway, darker far, lighter near
    for (let h = -B; h < far; h += 2) { const f = (h + B) / (far + B); x.fillStyle = 'rgb(' + R(8 - 6 * f) + ',' + R(28 - 20 * f) + ',' + R(32 - 23 * f) + ')'; x.fillRect(0, y(h + 2), w, 2); }
    x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(0, y(far), w, 1); x.fillStyle = rgba(WIN, 0.08); x.fillRect(0, y(far - 1), w, 1);
    for (let h = far - 3, row = 0; h > -B; h -= 3 + Math.floor((far - h) / 18), row++) {
      const f = (far - h) / (far + B), drift = t * (0.04 + 0.05 * f);
      for (let k = -19; k < w; k += 19) {
        const q = hash(k * 0.13 + row * 7 + seed), len = 3 + R(q * (5 + 6 * f)), sx = k + mod(drift + q * 30, 19);
        if (sx < 0 || sx + len > w) continue;
        x.fillStyle = rgba(WIN, (0.04 + 0.09 * f) * rip); x.fillRect(R(sx), y(h), len, 1);
      }
    }
    // the rows of racks, far to near; columns stand among them, holding up the ceiling
    const rows = Number(p.rows), nr = Number(p.racks);
    for (let row = rows - 1; row >= 0; row--) {
      const f = rows > 1 ? row / (rows - 1) : 0, base = R(4 + f * (far - 10)), rw = R(26 - 10 * f), rh = R((100 - 44 * f) * (1 - depth * 0.55)), count = nr + row * 3, step = (w - 60) / count;
      for (let i = 0; i < count; i++) {
        const s = seed * 53 + row * 997 + i, cx = 30 + i * step + step / 2 + (row % 2) * step * 0.4;
        if (hash(s + 11) < 0.08) continue;
        if (row === 0 && hash(s + 9) < 0.08 && hash(s) >= running) {
          x.save(); x.translate(R(cx - rw / 2), y(base - 2)); x.rotate(0.3);
          x.fillStyle = '#081111'; x.fillRect(0, -R(rh * 0.8), rw, R(rh * 0.8)); x.fillStyle = rgba(STRUCT, 0.3); x.fillRect(0, -R(rh * 0.8), rw, 1); x.fillRect(0, -R(rh * 0.8), 1, R(rh * 0.8));
          x.restore(); continue;
        }
        rack(x, o, cx - rw / 2, base, rw, rh, s, row > 0, led, running, -B, H);
      }
      if (row === 1 || (rows === 1 && row === 0)) {
        const cs = Number(p.columns);
        if (cs > 0) for (let k = cs / 2; k < w; k += cs) {
          const cb = rows > 1 ? R(4 + (far - 10) * 0.75) : 4;
          x.fillStyle = lift(wall, 7); x.fillRect(R(k) - 9, y(H), 18, H - cb); x.fillStyle = rgba(STRUCT, 0.3); x.fillRect(R(k) - 9, y(H), 1, H - cb); x.fillRect(R(k) + 8, y(H), 1, H - cb);
          x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(R(k) - 9, y(cb + 40), 18, 40); x.fillStyle = 'rgba(150,170,140,.2)'; x.fillRect(R(k) - 9, y(cb + 40), 18, 1);
          x.fillStyle = rgba(WIN, 0.25); x.fillRect(R(k) - 10, y(cb), 20, 1);
          x.font = mono(7, '600'); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = rgba(PALE, 0.3); x.fillText(String.fromCharCode(65 + Math.floor(k / cs)), R(k), y(cb + 60));
        }
      }
    }
    // the tunnel mouth in the side wall, where the walkway comes in
    const mouth = String(p.mouth), mh = Number(p.mouthHeight);
    if (mouth !== 'none') {
      const mx = mouth === 'left' ? 0 : w - 30;
      x.fillStyle = near; x.fillRect(mx, y(H), 30, H + B); x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(mx, y(H), 30, H + B);
      x.fillStyle = '#050909'; x.fillRect(mx, y(mh), 30, mh); x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(mx, y(mh), 30, 8);
      x.fillStyle = rgba(STRUCT, 0.45); x.fillRect(mx, y(mh), 30, 1); x.fillRect(mouth === 'left' ? mx + 29 : mx, y(H), 1, H - mh);
      x.fillStyle = lift(wall, 16); x.fillRect(mx, y(mh + 8), 30, 8);
    }
  },
});

export const catwalkElement = piece({
  type: 'undercity.catwalk', label: 'Catwalk over water (kit, Undercity)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 600, 20, 6000, 1, 'units'), posts: num('Posts every', 48, 16, 300, 1, 'units'), postDepth: num('Posts down into the water', 110, 10, 400, 1, 'units'),
    rail: select('Handrail', ['full', 'broken', 'none']), ladder: num('Ladder down, from the left (-1: none)', -1, -1, 6000, 1, 'units'), ladderDepth: num('Ladder down to', 40, 10, 400, 1, 'units'),
    lamps: num('Battery lamps on the rail', 3, 0, 40), led: ledField('Lamp colour', '#e8e0b0'), seed: seedField,
  },
  size: p => ({ w: Number(p.width), tall: 40 }),
  bounds: p => ({ x: 0, h: 40, w: Number(p.width), tall: 40 + Number(p.postDepth) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, end: { x: Number(p.width), h: 0, role: 'mount' }, ladder: { x: Number(p.ladder), h: -Number(p.ladderDepth), role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), ps = Number(p.posts), pd = Number(p.postDepth), seed = Number(p.seed), led = hexOr(p.led, '#e8e0b0'), rail = String(p.rail);
    for (let k = 4; k < w; k += ps) {
      x.fillStyle = '#141917'; x.fillRect(k, y(-4), 3, pd - 4); x.fillStyle = rgba(STRUCT, 0.25); x.fillRect(k, y(-4), 1, pd - 4);
      x.fillStyle = rgba(WIN, 0.3); x.fillRect(k - 1, y(-10 - (k % 7)), 5, 1);
      if (k + ps < w) { x.strokeStyle = 'rgba(20,26,24,.9)'; x.beginPath(); x.moveTo(k + 3, y(-5)); x.lineTo(k + ps, y(-28)); x.moveTo(k + ps, y(-5)); x.lineTo(k + 3, y(-28)); x.stroke(); }
    }
    x.fillStyle = '#1c2220'; x.fillRect(0, y(0), w, 4); x.fillStyle = 'rgba(0,0,0,.5)'; for (let k = 1; k < w; k += 3) x.fillRect(k, y(0) + 1, 1, 2);
    x.fillStyle = rgba(STRUCT, 0.5); x.fillRect(0, y(0), w, 1);
    const lad = Number(p.ladder), gapL = lad - 4, gapR = lad + 18;
    if (rail !== 'none') {
      for (let k = 0; k <= w; k += 24) { if (lad >= 0 && k > gapL && k < gapR) continue; if (rail === 'broken' && hash(seed + k) < 0.12) continue; x.fillStyle = 'rgba(150,140,128,.5)'; x.fillRect(Math.min(k, w - 1), y(30), 1, 30); }
      x.fillStyle = 'rgba(150,140,128,.5)';
      for (let k = 0; k < w; k += 24) {
        if (lad >= 0 && k + 24 > gapL && k < gapR) continue;
        if (rail === 'broken' && hash(seed * 3 + k) < 0.15) { x.fillRect(k, y(30), 6, 1); x.fillRect(k + 6, y(29), 1, 6); continue; }
        x.fillRect(k, y(30), Math.min(24, w - k), 1); x.fillRect(k, y(15), Math.min(24, w - k), 1);
      }
    }
    if (lad >= 0) {
      const ld = Number(p.ladderDepth);
      x.fillStyle = 'rgba(150,140,128,.8)'; x.fillRect(lad, y(28), 2, ld + 28); x.fillRect(lad + 10, y(28), 2, ld + 28);
      x.fillStyle = 'rgba(150,140,128,.6)'; for (let h = -ld + 5; h < 26; h += 6) x.fillRect(lad + 2, y(h), 8, 1);
      x.fillStyle = 'rgba(150,140,128,.8)'; x.fillRect(lad, y(28), 12, 2);
    }
    const nl = Number(p.lamps);
    for (let i = 0; i < nl; i++) { const lx = R((w * (i + 0.5)) / nl); x.fillStyle = 'rgba(0,0,0,.85)'; x.fillRect(lx, y(30), 1, 5); lamp(x, o, 'battery', lx, 22, led, seed * 29 + i); }
  },
});

export const pontoonElement = piece({
  type: 'undercity.pontoon', label: 'Pontoon raft with a terminal (kit, Undercity)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 80, 30, 300, 1, 'units'), drums: num('Drums under it', 3, 1, 8), terminal: bool('Terminal on a crate', true),
    screen: ledField('Screen colour', '#6fd6c4'), lamp: bool('Lantern on a pole', true), rope: select('Moored by a rope', ['left', 'right', 'none']), seed: seedField,
  },
  size: p => ({ w: Number(p.width), tall: 50 }),
  bounds: p => ({ x: 0, h: 50, w: Number(p.width), tall: 64 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, terminal: { x: Number(p.width) - 20, h: 0, role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), nd = Number(p.drums), seed = Number(p.seed), t = o.t, scr = hexOr(p.screen, '#6fd6c4');
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(-2, y(-9), w + 4, 4);
    for (let k = 1; k < 7; k += 2) { x.fillStyle = rgba(STRUCT, 0.1); x.fillRect(R(Math.sin(t / 30 + k) * 1.5), y(-10 - k), w, 1); }
    const dw = Math.max(8, Math.floor((w - 4) / nd) - 3);
    x.fillStyle = '#1c2c3a'; for (let k = 0; k < nd; k++) x.fillRect(2 + k * (dw + 3), y(-4), dw, 6); x.fillStyle = rgba(WIN, 0.3); x.fillRect(0, y(-9), w, 1);
    x.fillStyle = '#2a2016'; x.fillRect(0, y(0), w, 4); x.fillStyle = 'rgba(0,0,0,.5)'; for (let k = 6; k < w; k += 7) x.fillRect(k, y(0), 1, 4);
    x.fillStyle = 'rgba(200,170,120,.35)'; x.fillRect(0, y(0), w, 1);
    const rope = String(p.rope);
    if (rope !== 'none') { const rx = rope === 'left' ? 0 : w, d = rope === 'left' ? -1 : 1; x.strokeStyle = 'rgba(150,130,90,.5)'; x.beginPath(); x.moveTo(rx, y(1)); x.quadraticCurveTo(rx + d * 14, y(-6), rx + d * 30, y(4)); x.stroke(); }
    if (p.terminal !== false) {
      const cx = w - 20;
      x.fillStyle = '#1a140e'; x.fillRect(cx - 7, y(12), 14, 12); x.fillStyle = 'rgba(200,170,120,.25)'; x.fillRect(cx - 7, y(12), 14, 1);
      x.fillStyle = '#121414'; x.fillRect(cx - 9, y(26), 18, 14); x.fillStyle = rgba(scr, 0.6); x.fillRect(cx - 8, y(25), 16, 11);
      x.fillStyle = 'rgba(0,0,0,.45)'; for (let k = 0; k < 4; k++) x.fillRect(cx - 7, y(23) + k * 2 + 1, 3 + R(hash(seed + k + Math.floor(t / 40)) * 10), 1);
      x.fillStyle = '#1a140e'; x.fillRect(cx - 24, y(9), 7, 2); x.fillRect(cx - 23, y(7), 1, 7); x.fillRect(cx - 19, y(7), 1, 7);
      x.strokeStyle = 'rgba(0,0,0,.9)'; x.beginPath(); x.moveTo(cx + 9, y(18)); x.quadraticCurveTo(cx + 16, y(8), cx + 12, y(2)); x.stroke();
      x.fillStyle = '#1e1c16'; x.fillRect(cx + 9, y(8), 9, 8); x.fillStyle = rgba(RED, 0.8); x.fillRect(cx + 10, y(9), 2, 1);
      glowAt(x, o, cx, 20, scr, 0.9, 30);
      o.light?.(cx, 20, 16, 11, scr, 'screen');
    }
    if (p.lamp !== false) {
      const a = 0.75 + 0.2 * Math.sin(t / 9 + seed) * Math.sin(t / 23);
      x.fillStyle = '#140c08'; x.fillRect(6, y(34), 1, 34); x.fillRect(4, y(35), 6, 1);
      x.fillStyle = rgba(WARM, a); x.fillRect(5, y(33), 3, 4);
      glowAt(x, o, 6, 31, WARM, a, 26);
    }
  },
});

export const undercityElements: Element[] = [rockElement, tunnelElement, canalElement, shaftElement, ladderElement, vaultElement, metroEntranceElement, lotElement, dataHallElement, catwalkElement, pontoonElement];
