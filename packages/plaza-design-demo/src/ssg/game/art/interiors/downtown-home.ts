/**
 * INTERIOR KIT, downtown-home: the hero's home ground in Downtown, cut open (Tommi, 2026-10-22: Act I walks
 * the hero through many Downtown places). Three places use it:
 * - the capsule building: its lobby (CONCIERGE's wall panel, the mailboxes, the notice board, the emergency
 *   exit with its push bar), the micro-flats stacked above it, the service basement with CONCIERGE's
 *   cabinet, and the back courtyard with its washing lines and the areaway down to the service latch;
 * - Moth's walk-up: an old stairwell with flat doors, shoes, bikes and peeling paint, a skylight at the top,
 *   and Moth's door at 4C (extra locks, the camera taped over); behind it the empty hideout: the pinned wall
 *   (`interior.dt-pinwall`) and what was left in a hurry (`interior.dt-left-behind`);
 * - Dr. Kessel's room behind the fixer's noodle kitchen: the kitchen's pots and burners, and a ripperdoc's
 *   treatment room improvised in a storeroom (chair, lamp, implant tray, parts fridge, privacy screen, cot).
 *
 * Pieces draw in their own frame (origin at the foot on the left, `y(h) = -h`), every visual choice is a
 * field, light comes from the city clock (`o.lighting`) and the light layer (`o.light`). Walkable lines,
 * doors, flights and lifts are the level kit's (art/levels). Notices are dry; the people are the jokes.
 */
import type { Element, Properties, Value } from '../core/composition';
import { rng, text as paintText } from '../core/primitives';
import { windowLit } from '../../world/light';
import { neonPlate } from '../signage/kit';
import { piece, num, select, bool, text, colour, isHex, rgbOf, hash, rgba, y, type Paint } from '../buildings/types';

type X = CanvasRenderingContext2D;

// ---------------------------------------------------------------- shared helpers

/** A crisp rect from height `h` up `t`, `w` wide from `l`. */
const R = (x: X, l: number, h: number, w: number, t: number, c: string) => {
  if (w <= 0 || t <= 0) return;
  x.fillStyle = c; x.fillRect(Math.round(l), Math.round(-(h + t)), Math.max(1, Math.round(w)), Math.max(1, Math.round(t)));
};
const hexOr = (v: Value, fallback: string) => isHex(v) ? String(v) : fallback;
const rgbOr = (v: Value, fallback: string) => isHex(v) ? rgbOf(String(v)) : fallback;
const pick = <T,>(r: () => number, list: readonly T[]) => list[Math.floor(r() * list.length) % list.length];
/** Lamps and screens indoors: always on, a touch stronger at night when seen from outside. */
const glowOf = (o: Paint) => o.lighting.outdoor ? 0.45 + 0.55 * o.lighting.lamps : 1;
/** How much daylight comes through a window or a skylight. */
const skyOf = (o: Paint) => o.lighting.daylight * (1 - 0.5 * o.lighting.cover);
/** A printed label centred at (cx, h): dark board with pale ink, or paper with dark ink. */
function label(x: X, o: Paint, cx: number, h: number, words: string, style: 'paper' | 'board' | 'red' | 'green' = 'paper', size = 7) {
  if (!words) return;
  const fill = style === 'paper' ? '#d8d2bf' : style === 'red' ? '#7a1410' : style === 'green' ? '#0d5a2a' : '#15130f';
  const ink = style === 'paper' ? 'rgba(30,26,20,.95)' : style === 'board' ? 'rgba(230,215,180,.88)' : 'rgba(250,245,230,.95)';
  neonPlate(x, o.t, Math.round(cx), y(h), { text: words, col: '60,50,40', size, h: size + 4, printed: true, bolts: false, glow: 0, edge: 0.5, fill, ink } as Parameters<typeof neonPlate>[4]);
}
/** A sheet of paper on a wall, with lines of print and an optional red header. */
function sheet(x: X, l: number, h: number, w: number, t: number, seed: number, header = false, a = 0.8) {
  R(x, l, h, w, t, rgba('228,222,205', a)); R(x, l, h, w, 1, 'rgba(0,0,0,.25)');
  if (header) R(x, l + 1, h + t - 3, w - 2, 2, 'rgba(170,30,25,.85)');
  for (let k = h + 2; k < h + t - (header ? 4 : 2); k += 2) R(x, l + 1, k, Math.max(1, w - 2 - Math.round(hash(seed + k) * (w / 3))), 1, 'rgba(40,36,30,.42)');
}
/** A ceiling light at `cx` under the ceiling `top`, with its cone down to `floor`; returns its brightness now. */
export const LIGHT_KINDS = ['tube', 'flicker', 'bulb', 'off'] as const;
function ceilingLamp(x: X, o: Paint, kind: string, cx: number, top: number, floor: number, seed: number, col = '226,240,230') {
  if (kind === 'off') { R(x, cx - 8, top - 3, 16, 2, '#232527'); return 0; }
  const flick = kind === 'flicker' ? (hash(Math.floor(o.t / 5) + seed) < 0.22 ? 0.1 : hash(Math.floor(o.t / 37) + seed * 3) < 0.15 ? 0.5 : 1) : 1;
  const warm = kind === 'bulb', c = warm ? '255,205,140' : col, lamp = warm ? top - 10 : top - 3, spread = warm ? 22 : 30;
  if (warm) { R(x, cx, top - 8, 1, 8, 'rgba(0,0,0,.85)'); R(x, cx - 1, top - 11, 3, 3, rgba('255,235,190', 0.95 * flick)); }
  else { R(x, cx - 10, top - 1, 20, 1, '#161718'); R(x, cx - 9, top - 3, 18, 2, rgba('240,250,245', 0.25 + 0.7 * flick)); }
  const g = x.createLinearGradient(0, y(lamp), 0, y(floor));
  g.addColorStop(0, rgba(c, 0.18 * flick)); g.addColorStop(1, rgba(c, 0.03 * flick));
  x.fillStyle = g; x.beginPath(); x.moveTo(cx - 6, y(lamp)); x.lineTo(cx + 6, y(lamp)); x.lineTo(cx + spread, y(floor)); x.lineTo(cx - spread, y(floor)); x.closePath(); x.fill();
  o.light?.(cx, lamp - 1, warm ? 4 : 18, 3, c, 'screen');
  return flick;
}
/** Steam puffs rising from (cx, h). */
function steam(x: X, cx: number, h: number, t: number, seed: number, n = 3, a = 0.22, rise = 22) {
  for (let k = 0; k < n; k++) {
    const f = ((t * 0.3 + k * (rise / n) + seed * 7) % rise), dx = Math.round(Math.sin(t / 30 + k + seed) * (1 + f / 8));
    R(x, cx + dx - 1 + (k % 2) * 2, h + f, 2 + Math.floor(f / 8), 2, 'rgba(240,240,235,' + Math.max(0, a * (1 - f / rise)).toFixed(3) + ')');
  }
}
/** A window in a back wall, big enough to stand in: the sky by day, a neighbour's lit window at night; blinds. */
function backWindow(x: X, o: Paint, l: number, sill: number, w: number, t: number, seed: number, blinds = 0.4, foil = false) {
  const day = skyOf(o), night = 1 - o.lighting.daylight;
  R(x, l - 2, sill - 2, w + 4, t + 4, '#2a2622'); R(x, l, sill, w, t, rgba('120,150,175', 0.2 + 0.55 * day));
  if (!foil) {
    R(x, l, sill, w, Math.round(t * 0.45), rgba('30,26,36', 0.75 * night + 0.2));
    if (night > 0.3) for (let k = 0; k < 3; k++) if (hash(seed + k) < 0.7) R(x, l + 3 + k * Math.round(w / 3), sill + 5 + (k % 2) * 7, 4, 5, rgba('255,190,110', 0.55 * night));
  } else {
    // tinfoil taped over the glass: it catches whatever light the room has
    R(x, l, sill, w, t, 'rgba(170,175,180,.75)');
    for (let k = 0; k < w; k += 4) R(x, l + k, sill, 1, t, 'rgba(80,85,90,.45)');
    R(x, l + 2, sill + t - 4, w - 4, 2, 'rgba(220,220,210,.5)');
  }
  R(x, l, sill + t - Math.round(t * blinds), w, Math.round(t * blinds), 'rgba(205,195,170,.55)');
  for (let k = sill + t - Math.round(t * blinds); k < sill + t; k += 2) R(x, l, k, w, 1, 'rgba(0,0,0,.18)');
  R(x, l + Math.round(w / 2), sill, 1, t, '#2a2622'); R(x, l - 3, sill - 3, w + 6, 2, 'rgba(225,215,190,.35)');
}
/** A painted wall in two tones with stains, and paint peeling off to the plaster where `peel` says. */
function wall(x: X, w: number, H: number, top: string, dado: string, dadoH: number, seed: number, peel: number, grime: number) {
  R(x, 0, 0, w, H, top); if (dadoH > 0) { R(x, 0, 0, w, dadoH, dado); R(x, 0, dadoH, w, 1, 'rgba(235,225,195,.2)'); R(x, 0, dadoH + 1, w, 1, 'rgba(0,0,0,.22)'); }
  const r = rng(seed * 313 + 7);
  for (let k = 0; k < Math.round((w / 18) * (0.3 + grime)); k++) { const sx = Math.round(r() * w), len = 6 + Math.round(r() * H * 0.5); R(x, sx, H - len, 2 + Math.round(r() * 2), len, rgba('0,0,0', 0.08 + 0.14 * grime)); }
  for (let k = 0; k < Math.round((w / 26) * peel * 3); k++) {
    const px = Math.round(r() * (w - 12)), ph = 6 + Math.round(r() * (H - 18)), pw = 4 + Math.round(r() * 10), pt = 3 + Math.round(r() * 7);
    R(x, px, ph, pw, pt, 'rgba(196,182,150,.42)'); R(x, px, ph - 1, pw, 1, 'rgba(0,0,0,.3)'); R(x, px + pw, ph, 1, pt, 'rgba(255,240,210,.18)');
    if (r() < 0.4) R(x, px + 2, ph + pt, Math.max(2, pw - 4), 2, 'rgba(210,198,165,.35)');
  }
  const g = x.createLinearGradient(0, y(Math.min(H, 26)), 0, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, rgba('0,0,0', 0.15 + 0.25 * grime));
  x.fillStyle = g; x.fillRect(0, y(Math.min(H, 26)), Math.round(w), Math.round(Math.min(H, 26)));
}
const FLOORS = ['terrazzo', 'lino', 'tile', 'concrete', 'boards'] as const;
function floorStrip(x: X, w: number, kind: string, seed: number) {
  for (let k = 0; k < w; k += kind === 'boards' ? 14 : kind === 'tile' ? 8 : 12) {
    const alt = Math.floor(k / 8) % 2 === 0, step = kind === 'boards' ? 13 : kind === 'tile' ? 8 : 12;
    const c = kind === 'terrazzo' ? (alt ? '#4a4640' : '#45413b') : kind === 'lino' ? (alt ? '#3b4a3c' : '#364536') : kind === 'tile' ? (alt ? '#c9c3b2' : '#a8a292') : kind === 'boards' ? (alt ? '#3a2614' : '#33210f') : (alt ? '#3a3a38' : '#353533');
    R(x, k, 0, step, 3, c);
  }
  if (kind === 'terrazzo') for (let k = 2; k < w; k += 5) R(x, k + (seed % 3), 1, 1, 1, 'rgba(230,220,200,.3)');
  R(x, 0, 3, w, 1, kind === 'tile' ? 'rgba(255,255,255,.25)' : 'rgba(255,200,140,.14)');
}
/** A steel door leaf with a number plate, as seen from the corridor or landing it opens onto. */
function doorLeaf(x: X, l: number, w: number, t: number, leaf: string, trim = '#141210') {
  R(x, l - 2, 0, w + 4, t + 2, trim); R(x, l, 0, w, t, leaf); R(x, l + 2, 4, w - 4, t - 8, 'rgba(255,255,255,.04)');
  R(x, l + 2, t - 4, w - 4, 1, 'rgba(255,255,255,.08)'); R(x, l, 0, w, 1, 'rgba(0,0,0,.5)');
}
/** Shoes left outside a door: pairs of trainers, slippers, a kid's boots. */
function shoes(x: X, l: number, n: number, seed: number) {
  const cols = ['230,225,215', '200,50,50', '60,90,170', '40,40,40', '240,200,60', '120,170,90'];
  for (let k = 0; k < n; k++) { const c = cols[Math.floor(hash(seed + k * 7) * cols.length)], sx = l + k * 7, small = hash(seed * 3 + k) < 0.3; R(x, sx, 0, small ? 3 : 4, small ? 2 : 2, rgba(c, 0.9)); R(x, sx + (small ? 3 : 4), 0, small ? 2 : 3, 1, rgba(c, 0.9)); R(x, sx, 0, small ? 5 : 7, 1, 'rgba(0,0,0,.35)'); }
}
/** Conduit up from (cx, from) to `to`: what a wall box hangs on. */
const conduit = (x: X, cx: number, from: number, to: number) => { if (to > from) { R(x, cx, from, 2, to - from, '#2a2c2e'); R(x, cx, from, 1, to - from, 'rgba(255,255,255,.07)'); for (let k = from + 8; k < to; k += 16) R(x, cx - 1, k, 4, 1, '#3a3c3e'); } };

// ---------------------------------------------------------------- the room

const ROOM_KINDS = ['lobby', 'corridor', 'stairwell', 'service', 'storeroom', 'kitchen', 'plain'] as const;
const ROOM_WALL: Record<string, [string, string, number]> = {
  lobby: ['#3e4a44', '#2a3631', 30], corridor: ['#45423a', '#2f3a33', 26], stairwell: ['#4a463c', '#23352c', 28],
  service: ['#3a3b3a', '#2c2d2c', 0], storeroom: ['#4a443a', '#3a342c', 18], kitchen: ['#bdb8a8', '#8e9a92', 34], plain: ['#46423a', '#34302a', 0],
};

/** One Downtown room seen cut open: its back wall, floor, ceiling light and what age has done to it. */
export const dtRoomElement = piece({
  type: 'interior.dt-room', label: 'Downtown room, cut open (kit: lobby, corridor, stairwell, service, storeroom, kitchen)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 200, 20, 2000, 1, 'units'), height: num('Height (floor to ceiling)', 80, 30, 300, 1, 'units'),
    kind: select('Kind', ROOM_KINDS), wall: colour('Wall colour', 'The kind’s own'), dado: colour('Dado colour (lower wall)', 'The kind’s own'),
    floor: select('Floor', FLOORS), light: select('Light', LIGHT_KINDS), lights: num('Ceiling lights', 1, 0, 8),
    peel: num('Peeling paint', 0.3, 0, 1, 0.05), grime: num('Grime', 0.4, 0, 1, 0.05), pipes: bool('Pipes along the ceiling', false),
    window: select('Window', ['none', 'left', 'middle', 'right']), blinds: num('Blinds down', 0.4, 0, 1, 0.05),
    cut: select('Cut wall (section)', ['none', 'left', 'right', 'both']),
    label: text('Floor painted on the wall (empty: none)', ''), labelFrom: num('Floor label from the left', 12, 0, 2000, 1, 'units'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.height), w: Number(p.width), tall: Number(p.height) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, ceiling: { x: 0, h: Number(p.height), role: 'mount' }, middle: { x: Number(p.width) / 2, h: 0, role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), kind = String(p.kind), seed = Number(p.seed), [wc, dc, dh] = ROOM_WALL[kind] ?? ROOM_WALL.plain;
    wall(x, w, H, hexOr(p.wall, wc), hexOr(p.dado, dc), dh, seed, Number(p.peel), Number(p.grime));
    if (kind === 'kitchen') {
      // white tiles to the ceiling, grease darkening them towards the burners
      for (let h = 4; h < H; h += 6) R(x, 0, h, w, 1, 'rgba(60,70,66,.25)');
      for (let k = 0; k < w; k += 6) R(x, k, 0, 1, H, 'rgba(60,70,66,.18)');
      const g = x.createLinearGradient(0, y(H), 0, y(H * 0.4)); g.addColorStop(0, 'rgba(40,28,10,.35)'); g.addColorStop(1, 'rgba(40,28,10,0)'); x.fillStyle = g; x.fillRect(0, y(H), w, H * 0.6);
    } else if (kind === 'service') {
      // bare blockwork
      for (let h = 8; h < H; h += 8) { R(x, 0, h, w, 1, 'rgba(0,0,0,.25)'); for (let k = ((h / 8) % 2) * 9; k < w; k += 18) R(x, k, h - 8, 1, 8, 'rgba(0,0,0,.2)'); }
    } else if (kind === 'lobby') {
      // a tiled dado, the paint above it a hopeful green once
      for (let k = 0; k < w; k += 6) R(x, k, 0, 1, dh, 'rgba(0,0,0,.18)');
      for (let h = 6; h < dh; h += 6) R(x, 0, h, w, 1, 'rgba(0,0,0,.18)');
    }
    const win = String(p.window);
    if (win !== 'none') { const ww = 30, wl = win === 'left' ? 10 : win === 'right' ? w - ww - 10 : Math.round(w / 2 - ww / 2); backWindow(x, o, wl, 18, ww, Math.min(40, H - 30), seed, Number(p.blinds)); }
    if (p.pipes) {
      R(x, 0, H - 12, w, 3, '#3a3a36'); R(x, 0, H - 12, w, 1, 'rgba(255,255,255,.1)'); R(x, 0, H - 17, w, 2, '#5a3a22');
      for (let k = 14; k < w; k += 40) { R(x, k, H - 13, 3, 13, '#232321'); R(x, k + 20, H - 18, 2, 18, '#232321'); }
    }
    const lb = String(p.label ?? '');
    if (lb) { paintText(x, lb, Number(p.labelFrom), y(Math.min(H - 16, 44)), 'rgba(235,225,195,.5)', 11, '700', 'left'); }
    floorStrip(x, w, String(p.floor), seed);
    const n = Number(p.lights);
    for (let k = 0; k < n; k++) ceilingLamp(x, o, String(p.light), Math.round((w * (k + 0.5)) / n), H, 0, seed + k * 11);
    const cut = String(p.cut);
    for (const side of ['left', 'right'] as const) if (cut === side || cut === 'both') {
      const cx = side === 'left' ? 0 : w - 6; R(x, cx, 0, 6, H, '#3c3a36');
      for (let h = 4; h < H; h += 4) R(x, cx, h, 6, 1, 'rgba(0,0,0,.28)');
      R(x, side === 'left' ? cx + 5 : cx, 0, 1, H, 'rgba(255,170,90,.35)');
    }
  },
});

// ---------------------------------------------------------------- the lobby

const seed = (p: Properties) => Number(p.seed ?? 1);

/** CONCIERGE: the building's door system, a panel on the wall (or a desk unit) with a face it uses for everyone. */
export const conciergeElement = piece({
  type: 'interior.dt-concierge', label: 'CONCIERGE panel (kit: the building’s door system)', category: 'electronics', libraryUse: 'reusable',
  fields: {
    mount: select('Mount', ['wall', 'desk']), mood: select('State', ['idle', 'refusing', 'standby', 'broken']),
    name: text('Nameplate', 'CONCIERGE'), line: text('Line on its screen (empty: none)', 'PLEASE PRESENT ID'),
    conduit: num('Conduit up to the ceiling', 30, 0, 200, 1, 'units'), camera: bool('Camera on top', true), slot: bool('Card slot and reader', true),
    tell: bool('Cyan tell (usable)', true), seed: num('Seed', 1, 0, 1000000),
  },
  size: () => ({ w: 44, tall: 110 }),
  bounds: p => ({ x: 0, h: 74 + Number(p.conduit), w: 44, tall: 74 + Number(p.conduit) }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' }, screen: { x: 22, h: 52, role: 'mount' } }),
  paint(x, p, o) {
    const mood = String(p.mood), desk = p.mount === 'desk', t = o.t, base = desk ? 24 : 30, sw = 30, st = 26, l = 7;
    const col = mood === 'refusing' ? '255,70,60' : mood === 'standby' ? '120,160,170' : mood === 'broken' ? '150,150,150' : '90,235,255';
    const glow = glowOf(o) * (mood === 'standby' ? 0.35 : mood === 'broken' ? 0.15 : 1);
    if (desk) {
      // a laminate desk nobody sits behind, the unit on a stand where the receptionist was
      R(x, 0, 0, 44, 22, '#2e2a24'); R(x, 0, 22, 44, 2, '#4a443a'); R(x, 0, 23, 44, 1, 'rgba(255,230,190,.3)'); R(x, 4, 4, 36, 14, 'rgba(0,0,0,.2)');
      R(x, 20, 24, 4, 4, '#1a1a1a');
    } else conduit(x, 21, base + st + 10, base + st + 10 + Number(p.conduit));
    // housing: a grey steel box, a speaker grille under the screen
    R(x, l - 2, base - 2, sw + 4, st + 16, '#1c1e20'); R(x, l - 1, base - 1, sw + 2, st + 14, '#3a3e42'); R(x, l - 1, base + st + 12, sw + 2, 1, 'rgba(255,255,255,.18)');
    for (let k = 0; k < 4; k++) R(x, l + 9 + k * 3, base + 1, 2, 4, '#15171a');
    // the screen and its face: two eyes and a mouth line, blinking, or the refusal
    R(x, l, base + 8, sw, st - 2, '#071014'); R(x, l, base + 8, sw, st - 2, rgba(col, 0.08 * glow));
    const blink = mood === 'idle' && Math.floor(t / 7) % 31 === 0, ex = l + Math.round(sw / 2);
    if (mood === 'broken') { for (let k = 0; k < 6; k++) R(x, l + 2 + Math.round(hash(seed(p) + k) * (sw - 6)), base + 10 + k * 3, 4 + (k % 3) * 3, 1, 'rgba(200,200,200,.35)'); }
    else {
      if (!blink) { R(x, ex - 8, base + 22, 4, 4, rgba(col, 0.9 * glow)); R(x, ex + 4, base + 22, 4, 4, rgba(col, 0.9 * glow)); }
      else { R(x, ex - 8, base + 23, 4, 1, rgba(col, 0.9 * glow)); R(x, ex + 4, base + 23, 4, 1, rgba(col, 0.9 * glow)); }
      if (mood === 'refusing') { R(x, ex - 6, base + 14, 12, 1, rgba(col, 0.9 * glow)); R(x, ex - 7, base + 13, 1, 1, rgba(col, 0.9 * glow)); R(x, ex + 6, base + 13, 1, 1, rgba(col, 0.9 * glow)); }
      else R(x, ex - 6, base + 15, 12, 1, rgba(col, 0.75 * glow));
    }
    if (p.tell !== false && mood !== 'broken') { R(x, l - 1, base + st + 6, sw + 2, 1, rgba('0,255,255', 0.5 + 0.4 * Math.sin(t / 20))); }
    o.light?.(ex, base + 20, sw, st, col, 'screen');
    if (p.camera !== false) { R(x, ex - 3, base + st + 13, 6, 3, '#202326'); R(x, ex - 2, base + st + 12, 4, 1, '#0a0a0a'); R(x, ex + 1, base + st + 14, 1, 1, Math.floor(t / 40) % 2 ? 'rgba(255,40,40,.95)' : 'rgba(255,40,40,.35)'); }
    if (p.slot !== false) { const rx = l + sw + 4; R(x, rx, base + 6, 7, 14, '#1a1c1e'); R(x, rx + 1, base + 14, 5, 1, '#000'); R(x, rx + 2, base + 9, 3, 2, rgba(mood === 'refusing' ? '255,60,50' : '60,230,120', 0.85 * glow)); }
    label(x, o, ex, base - 9, String(p.name ?? ''), 'board');
    const line = String(p.line ?? '');
    if (line && mood !== 'broken' && mood !== 'standby') { x.save(); x.beginPath(); x.rect(l + 1, y(base + 12), sw - 2, 6); x.clip(); paintText(x, line, l + 1 + sw - ((t * 0.4) % (sw + line.length * 4.2)), y(base + 9), rgba(col, 0.85 * glow), 5, '600', 'left'); x.restore(); }
  },
});

/** A bank of letterboxes: rows by floor, columns by flat; some stuffed, one taped shut, parcels on top. */
export const mailboxesElement = piece({
  type: 'interior.dt-mailboxes', label: 'Mailbox bank (kit)', category: 'furniture', libraryUse: 'reusable',
  fields: {
    columns: num('Columns (flats a floor)', 5, 1, 16), rows: num('Rows (floors)', 7, 1, 14), from: num('Bottom row height', 14, 0, 60, 1, 'units'),
    metal: select('Metal', ['steel', 'brass', 'green']), stuffed: num('Stuffed with flyers', 0.3, 0, 1, 0.05), taped: num('Taped shut', 1, 0, 10),
    parcels: num('Parcels on top', 2, 0, 6), floor: num('Flyers on the floor', 4, 0, 20), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.columns) * 8 + 4, tall: Number(p.from) + Number(p.rows) * 7 + 14 }),
  bounds: p => ({ x: 0, h: Number(p.from) + Number(p.rows) * 7 + 14, w: Number(p.columns) * 8 + 4, tall: Number(p.from) + Number(p.rows) * 7 + 14 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, top: { x: (Number(p.columns) * 8 + 4) / 2, h: Number(p.from) + Number(p.rows) * 7 + 4, role: 'surface' } }),
  paint(x, p, o) {
    const C = Number(p.columns), Rw = Number(p.rows), f = Number(p.from), s = Number(p.seed), r = rng(s * 71 + 3), W = C * 8 + 4, top = f + Rw * 7 + 4;
    const face = p.metal === 'brass' ? '#6a5a32' : p.metal === 'green' ? '#2f4a3c' : '#4a4e52', dark = '#1a1c1e';
    R(x, 0, f - 2, W, Rw * 7 + 6, dark); R(x, 0, top, W, 1, 'rgba(255,255,255,.2)');
    let taped = Number(p.taped);
    for (let row = 0; row < Rw; row++) for (let c = 0; c < C; c++) {
      const bx = 2 + c * 8, bh = f + row * 7; R(x, bx, bh, 7, 6, face); R(x, bx + 1, bh + 4, 5, 1, '#0b0c0d'); R(x, bx + 1, bh + 1, 2, 1, 'rgba(225,215,170,.7)');
      if (r() < Number(p.stuffed)) R(x, bx + 1 + Math.round(r() * 2), bh + 4, 3, 2, pick(r, ['rgba(250,230,120,.85)', 'rgba(235,230,215,.85)', 'rgba(245,170,190,.85)']));
      else if (taped > 0 && r() < 0.08) { taped--; R(x, bx, bh + 2, 7, 2, 'rgba(210,190,120,.8)'); }
    }
    for (let k = 0; k < Number(p.parcels); k++) { const pw = 9 + Math.round(r() * 6), pt = 5 + Math.round(r() * 5), px = 1 + Math.round(r() * Math.max(0, W - pw - 2)); R(x, px, top + 1, pw, pt, '#8a6a42'); R(x, px + Math.round(pw / 2), top + 1, 1, pt, 'rgba(220,200,150,.6)'); R(x, px + 1, top + pt - 2, 4, 2, 'rgba(240,240,230,.8)'); }
    for (let k = 0; k < Number(p.floor); k++) R(x, -6 + Math.round(r() * (W + 12)), 0, 4 + Math.round(r() * 2), 1, pick(r, ['rgba(250,230,120,.8)', 'rgba(235,230,215,.8)', 'rgba(245,170,190,.8)']));
    o.light?.(W / 2, top - 6, W, 6, '230,220,190', 'window');
  },
});

/** A notice board: a readable headline and a sheaf of smaller notices pinned round it. */
export const noticeBoardElement = piece({
  type: 'interior.dt-notices', label: 'Notice board (kit)', category: 'signage', libraryUse: 'reusable',
  fields: {
    width: num('Width', 60, 20, 300, 1, 'units'), height: num('Height', 34, 12, 120, 1, 'units'), from: num('Bottom edge height', 20, 0, 120, 1, 'units'),
    style: select('Style', ['cork', 'glass case', 'bare wall']), header: text('Header (red, empty: none)', 'NOTICE'),
    headline: text('Headline', 'LIFT OUT OF ORDER'), second: text('Second notice (empty: none)', 'RENT IS DUE ON THE 1ST'),
    papers: num('Other notices', 6, 0, 30), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.from) + Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.from) + Number(p.height), w: Number(p.width), tall: Number(p.from) + Number(p.height) }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), f = Number(p.from), s = Number(p.seed), r = rng(s * 53 + 1), style = String(p.style);
    if (style !== 'bare wall') {
      R(x, -2, f - 2, w + 4, H + 4, style === 'cork' ? '#3a2614' : '#2a2c2e'); R(x, 0, f, w, H, style === 'cork' ? '#7a5634' : '#1a1c1e');
      if (style === 'cork') for (let k = 0; k < w * H / 18; k++) R(x, Math.round(r() * (w - 1)), f + Math.round(r() * (H - 1)), 1, 1, 'rgba(40,24,10,.35)');
    }
    for (let k = 0; k < Number(p.papers); k++) { const pw = 9 + Math.round(r() * 8), pt = 10 + Math.round(r() * 8); sheet(x, 2 + Math.round(r() * Math.max(0, w - pw - 4)), f + 2 + Math.round(r() * Math.max(0, H - pt - 4)), pw, pt, s + k, r() < 0.3, 0.75); }
    const head = String(p.header ?? ''), hl = String(p.headline ?? ''), two = String(p.second ?? '');
    if (two) label(x, o, Math.round(w * 0.5), f + 8, two, 'paper');
    if (hl) { label(x, o, Math.round(w * 0.5), f + H - (head ? 17 : 8), hl, 'paper'); if (head) label(x, o, Math.round(w * 0.5), f + H - 6, head, 'red'); }
    if (style === 'glass case') { R(x, 0, f, w, H, 'rgba(160,200,220,.08)'); x.strokeStyle = 'rgba(200,230,240,.25)'; x.beginPath(); x.moveTo(4, y(f + 4)); x.lineTo(14, y(f + H - 4)); x.stroke(); }
  },
});

/** The emergency exit: a steel door with a push bar, the green running man over it, the alarm sticker. */
export const fireExitElement = piece({
  type: 'interior.dt-fire-exit', label: 'Emergency exit door with push bar (kit)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Door width', 26, 18, 60, 1, 'units'), height: num('Door height', 52, 44, 90, 1, 'units'), open: num('Open', 0, 0, 1, 0.05),
    hinge: select('Hinge side', ['right', 'left']), sign: select('Sign over the door', ['lit', 'unlit', 'none']), signText: text('Sign', 'EXIT'),
    sticker: text('Sticker on the door (empty: none)', 'ALARM WILL SOUND'), propped: bool('Propped with a wedge', false),
    leaf: colour('Door colour', '#5a1e16'), outside: select('What is outside', ['yard', 'street', 'dark']),
  },
  size: p => ({ w: Number(p.width) + 8, tall: Number(p.height) + 22 }),
  bounds: p => ({ x: -4, h: Number(p.height) + 22, w: Number(p.width) + 8, tall: Number(p.height) + 22 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, middle: { x: Number(p.width) / 2, h: 0, role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), open = Number(p.open), left = p.hinge === 'left', leaf = hexOr(p.leaf, '#5a1e16'), day = skyOf(o);
    R(x, -3, 0, w + 6, H + 3, '#121212');
    // what the opening shows: the yard by day or night, the street's sodium, or nothing
    const out = p.outside === 'street' ? rgba('255,170,90', 0.25 + 0.2 * day) : p.outside === 'yard' ? rgba('130,150,170', 0.12 + 0.45 * day) : 'rgba(8,8,10,1)';
    R(x, 0, 0, w, H, out);
    if (p.outside === 'yard') { for (let k = 0; k < 3; k++) R(x, 2 + k * 8, H - 14 - k * 3, 5, 6, rgba('230,230,220', 0.25 + 0.2 * day)); R(x, 0, H - 16, w, 1, 'rgba(30,30,30,.6)'); }
    const lw = Math.max(3, Math.round(w * (1 - 0.85 * open))), lx = left ? 0 : w - lw;
    R(x, lx, 0, lw, H, leaf); R(x, lx, H - 1, lw, 1, 'rgba(255,255,255,.12)'); R(x, lx + (left ? lw - 1 : 0), 0, 1, H, 'rgba(0,0,0,.45)');
    if (lw > 10) {
      // the push bar across the leaf, its red label
      R(x, lx + 2, 24, lw - 4, 3, '#b8b8b0'); R(x, lx + 2, 24, lw - 4, 1, 'rgba(255,255,255,.4)'); R(x, lx + 2, 22, 2, 7, '#5a5a56'); R(x, lx + lw - 4, 22, 2, 7, '#5a5a56');
      R(x, lx + Math.round(lw / 2) - 4, 25, 8, 1, 'rgba(200,30,30,.9)');
      const st = String(p.sticker ?? '');
      if (st) { const sw = Math.min(lw - 4, 18); R(x, lx + Math.round((lw - sw) / 2), 34, sw, 8, 'rgba(230,40,30,.9)'); R(x, lx + Math.round((lw - sw) / 2) + 1, 37, sw - 2, 1, 'rgba(255,240,220,.85)'); R(x, lx + Math.round((lw - sw) / 2) + 1, 39, sw - 4, 1, 'rgba(255,240,220,.85)'); }
    }
    if (p.propped) { R(x, left ? lw + 1 : lx - 6, 0, 5, 2, '#8a6a3a'); R(x, left ? lw + 1 : lx - 6, 2, 3, 1, '#8a6a3a'); }
    // the sign box on a bracket over the frame, lit green; it lights the wall round it
    const sx = Math.round(w / 2), sh = H + 6, glow = p.sign === 'lit' ? glowOf(o) : 0;
    if (p.sign === 'none') return;
    R(x, sx - 1, H + 2, 2, 4, '#202020'); R(x, sx - 13, sh, 26, 11, '#1a1a1a');
    R(x, sx - 12, sh + 1, 24, 9, glow > 0 ? rgba('40,210,110', 0.4 + 0.55 * glow) : '#1e3a28');
    paintText(x, String(p.signText ?? ''), sx + 3, y(sh + 5.5), glow > 0 ? 'rgba(235,255,240,.95)' : 'rgba(120,150,130,.8)', 7, '700');
    R(x, sx - 10, sh + 3, 2, 5, glow > 0 ? 'rgba(235,255,240,.9)' : 'rgba(120,150,130,.7)'); R(x, sx - 9, sh + 7, 2, 2, glow > 0 ? 'rgba(235,255,240,.9)' : 'rgba(120,150,130,.7)');
    if (glow > 0) {
      const g = x.createRadialGradient(sx, y(sh + 5), 0, sx, y(sh + 5), 40); g.addColorStop(0, rgba('40,220,120', 0.18 * glow)); g.addColorStop(1, 'rgba(40,220,120,0)');
      x.fillStyle = g; x.fillRect(sx - 40, y(sh + 45), 80, 80); o.light?.(sx, sh + 5, 24, 9, '40,220,120', 'screen');
    }
  },
});

/** A service door or hatch with its latch box: steel, stencilled, a hasp, the box's cyan LED (it can be persuaded). */
export const serviceLatchElement = piece({
  type: 'interior.dt-service-latch', label: 'Service door with a latch box (kit)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    kind: select('Kind', ['door', 'hatch']), state: select('State', ['locked', 'unlatched', 'open', 'forced']),
    width: num('Width', 24, 16, 60, 1, 'units'), height: num('Height', 50, 20, 90, 1, 'units'), stencil: text('Stencil', 'SERVICE'),
    plate: text('Plate (empty: none)', 'NO ENTRY'), lamp: bool('Cage lamp over it', true), tell: bool('Cyan tell on the latch box', true),
    leaf: colour('Steel colour', '#3a4044'),
  },
  size: p => ({ w: Number(p.width) + 16, tall: Number(p.height) + 16 }),
  bounds: p => ({ x: -2, h: Number(p.height) + 16, w: Number(p.width) + 18, tall: Number(p.height) + 16 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, latch: { x: Number(p.width) + 6, h: 26, role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = p.kind === 'hatch' ? Math.min(30, Number(p.height)) : Number(p.height), state = String(p.state), leaf = hexOr(p.leaf, '#3a4044'), t = o.t;
    R(x, -2, 0, w + 4, H + 2, '#0e0f10');
    if (state === 'open') { R(x, 0, 0, w, H, '#050506'); R(x, 2, 0, w - 4, 6, 'rgba(255,190,110,.12)'); R(x, w - 4, 0, 4, H, leaf); }
    else {
      R(x, 0, 0, w, H, leaf); R(x, 0, H - 1, w, 1, 'rgba(255,255,255,.15)');
      for (let h = 4; h < H; h += 10) for (const k of [2, w - 3]) R(x, k, h, 1, 1, 'rgba(255,255,255,.3)');
      R(x, 2, Math.round(H * 0.5), w - 4, 1, 'rgba(0,0,0,.35)');
      if (state === 'forced') { R(x, w - 6, 18, 6, 12, '#8a8a80'); R(x, w - 3, 16, 2, 2, 'rgba(255,220,160,.8)'); R(x, 2, 0, w - 4, 2, 'rgba(255,190,110,.18)'); }
      const st = String(p.stencil ?? '');
      if (st && w >= 18) paintText(x, st, w / 2, y(H - 10), 'rgba(235,215,90,.85)', 6, '700');
    }
    // the hasp and padlock, and the latch box beside the frame with its conduit up the wall
    const lx = w + 3;
    R(x, w - 2, 24, 6, 3, '#6a6a64'); if (state === 'locked') { R(x, w + 1, 18, 4, 5, '#b8a050'); R(x, w + 2, 23, 2, 2, '#6a6a64'); }
    conduit(x, lx + 4, 36, H + 14);
    R(x, lx, 20, 10, 16, '#1a1c1e'); R(x, lx + 1, 21, 8, 14, '#2a2e32'); R(x, lx + 2, 30, 6, 3, '#0a1012');
    const ok = state === 'unlatched' || state === 'open' || state === 'forced';
    R(x, lx + 2, 25, 2, 2, ok ? 'rgba(60,230,120,.95)' : rgba('255,50,40', 0.5 + 0.45 * Math.sin(t / 15)));
    if (p.tell !== false) { R(x, lx + 5, 25, 3, 2, rgba('0,255,255', 0.55 + 0.4 * Math.sin(t / 18))); R(x, lx, 36, 10, 1, 'rgba(0,255,255,.45)'); }
    const pl = String(p.plate ?? '');
    if (pl && p.kind !== 'hatch') label(x, o, w / 2, H + 7, pl, 'red');
    if (p.lamp !== false) {
      const glow = o.lighting.outdoor ? Math.max(0.25, o.lighting.lamps) : 1, cx = w / 2, lh = H + (pl && p.kind !== 'hatch' ? 14 : 6);
      R(x, cx - 3, lh, 7, 5, '#1a1a1a'); R(x, cx - 2, lh + 1, 5, 3, rgba('255,210,140', 0.5 + 0.5 * glow));
      for (const k of [-3, 0, 3]) R(x, cx + k, lh, 1, 5, '#0d0d0d');
      const g = x.createRadialGradient(cx, y(lh), 0, cx, y(lh), 34); g.addColorStop(0, rgba('255,200,130', 0.18 * glow)); g.addColorStop(1, 'rgba(255,200,130,0)');
      x.fillStyle = g; x.fillRect(cx - 34, y(lh + 34), 68, 68); o.light?.(cx, lh + 2, 6, 4, '255,200,130', 'screen');
    }
  },
});

// ---------------------------------------------------------------- flats

const FLAT_KINDS = ['capsule', 'studio', 'family', 'hoarder', 'empty', 'sealed', 'hideout', 'quiet', 'home'] as const;

/** One micro-flat seen cut open: what a life fits in, by kind; a door to the corridor behind, its lock, its light. */
export const microFlatElement = piece({
  type: 'interior.dt-flat', label: 'Micro-flat, cut open (kit: capsule, studio, family, hoarder, empty, sealed, hideout)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 70, 36, 300, 1, 'units'), height: num('Height (floor to ceiling)', 68, 40, 200, 1, 'units'),
    kind: select('Kind', FLAT_KINDS), number: text('Flat number', '7B'), door: select('Door to the corridor', ['left', 'right', 'none']),
    lock: select('Lock', ['smart', 'keys', 'refusing', 'none']), lit: num('Room light', 1, 0, 1, 0.05), window: bool('Window', true),
    wall: colour('Wall colour', 'Seeded'), partition: bool('Partition on the left', true), plate: bool('Brass number plate on the door', false),
    curtain: colour('Curtain colour (quiet)', 'Seeded'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.height), w: Number(p.width), tall: Number(p.height) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, middle: { x: Number(p.width) / 2, h: 0, role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), kind = String(p.kind), s = Number(p.seed), r = rng(s * 911 + 17), t = o.t;
    const walls = kind === 'quiet' || kind === 'home' ? ['#3a3a36', '#363a38', '#3a3634'] : ['#4a4438', '#3e463e', '#4a3e3e', '#3c4248', '#46443a'], dark = kind === 'sealed' || kind === 'empty';
    const lit = (kind === 'sealed' ? 0 : Number(p.lit)) * (o.lighting.outdoor ? 0.6 + 0.4 * o.lighting.lamps : 1);
    wall(x, w, H, hexOr(p.wall, pick(r, walls)), '#2a2824', 0, s, kind === 'empty' || kind === 'sealed' ? 0.6 : 0.2, 0.4);
    const door = String(p.door), dw = 18, dx = door === 'left' ? 4 : w - dw - 4;
    if (p.window !== false) { const ww = Math.min(26, Math.max(16, Math.round(w * 0.3))), wl = door === 'left' ? w - ww - 8 : door === 'right' ? 8 : Math.round(w / 2 - ww / 2); backWindow(x, o, wl, 22, ww, Math.min(30, H - 32), s, kind === 'hideout' ? 0 : kind === 'home' ? 0.45 : 0.3 + r() * 0.5, kind === 'hideout');
      if (kind === 'quiet') {
        // curtains drawn: the room's light through them when it is on, a dark fold when not
        const wt = Math.min(30, H - 32), cc = rgbOr(p.curtain, pick(r, ['150,60,50', '60,80,110', '120,110,80', '80,100,70'])), on = Number(p.lit) > 0.5;
        R(x, wl - 3, 22 + wt + 2, ww + 6, 1, '#1a1a1a'); R(x, wl - 2, 20, ww + 4, wt + 2, rgba(cc, on ? 0.75 : 0.55));
        for (let k = wl; k < wl + ww + 2; k += 3) R(x, k, 20, 1, wt + 2, 'rgba(0,0,0,.22)');
        if (on) R(x, wl, 22, ww, wt, rgba('255,190,120', 0.18));
      } }
    if (door !== 'none') {
      doorLeaf(x, dx, dw, 46, kind === 'sealed' ? '#3a2e26' : '#4a3a2a');
      R(x, dx + (door === 'left' ? dw - 4 : 2), 22, 2, 3, 'rgba(210,190,120,.8)');
      if (p.plate) { R(x, dx + 2, 36, dw - 4, 9, '#8a7238'); R(x, dx + 3, 37, dw - 6, 7, '#b8983e'); R(x, dx + 2, 44, dw - 4, 1, 'rgba(255,240,190,.5)'); }
      paintText(x, String(p.number ?? ''), dx + dw / 2, y(40), p.plate ? 'rgba(30,22,10,.95)' : 'rgba(235,225,200,.9)', 7, '700');
      const lock = String(p.lock), lkx = door === 'left' ? dx + dw + 4 : dx - 8;
      if (lock !== 'none' && lock !== 'keys') { R(x, lkx, 20, 4, 8, '#16181a'); R(x, lkx + 1, 25, 2, 2, lock === 'refusing' ? rgba('255,50,40', 0.55 + 0.45 * Math.sin(t / 12)) : 'rgba(60,230,120,.9)'); }
      if (kind === 'sealed') { x.save(); x.strokeStyle = 'rgba(220,40,30,.85)'; x.lineWidth = 2; x.beginPath(); x.moveTo(dx - 2, y(8)); x.lineTo(dx + dw + 2, y(40)); x.moveTo(dx - 2, y(40)); x.lineTo(dx + dw + 2, y(8)); x.stroke(); x.restore(); sheet(x, dx + 3, 26, 12, 9, s, true, 0.85); }
    }
    // what lives here, against the back wall, clear of the door
    const fl = door === 'left' ? dx + dw + 8 : 4, fr = door === 'right' ? dx - 10 : w - 4, fw = Math.max(10, fr - fl);
    if (kind === 'capsule') {
      // a loft bed over a desk: mattress and a curtain up top, the screen glowing under it, a mini fridge, clothes on hooks
      const bw = Math.min(fw, 44), bl = fr - bw;
      R(x, bl, 30, bw, 3, '#2a2622'); R(x, bl, 0, 2, 30, '#2a2622'); R(x, bl + bw - 2, 0, 2, 30, '#2a2622');
      R(x, bl + 2, 33, bw - 4, 5, pick(r, ['#c8c0b0', '#8a9ab0', '#b08a8a'])); R(x, bl + 3, 38, 8, 3, '#e0d8c8');
      R(x, bl + 2, 38, 4, Math.max(4, H - 46), rgba(rgbOf(pick(r, ['#7a3434', '#345a7a', '#5a6a34'])), 0.7));
      R(x, bl + 6, 16, bw - 12, 2, '#3a3026'); R(x, bl + 10, 18, 10, 7, '#0c1214'); R(x, bl + 11, 19, 8, 5, rgba('120,200,255', 0.55 * Math.max(0.3, lit)));
      o.light?.(bl + 15, 21, 8, 5, '120,200,255', 'screen');
      R(x, bl + 6, 0, 10, 12, '#d8d4c8'); R(x, bl + 7, 6, 8, 1, 'rgba(0,0,0,.3)');
      for (let k = 0; k < 3; k++) R(x, fl + 2 + k * 5, 34 - k, 4, 12 + k * 2, rgba(rgbOf(pick(r, ['#2a4a6a', '#6a2a2a', '#3a3a3a', '#8a7a5a'])), 0.85));
      R(x, fl, 46, Math.min(18, fw), 1, '#1a1a1a');
    } else if (kind === 'studio') {
      R(x, fl, 0, Math.min(36, fw), 12, pick(r, ['#8a5a4a', '#4a5a7a', '#6a6a5a'])); R(x, fl, 12, Math.min(36, fw), 3, '#d8d0c0'); R(x, fl + 1, 15, 8, 3, '#e8e0d0');
      const tx = Math.min(fr - 16, fl + 40); R(x, tx, 14, 14, 2, '#3a2a1a'); R(x, tx + 2, 0, 1, 14, '#3a2a1a'); R(x, tx + 11, 0, 1, 14, '#3a2a1a');
      R(x, tx + 1, 16, 12, 9, '#141414'); R(x, tx + 2, 17, 10, 7, rgba(pick(r, ['110,150,230', '240,170,110', '90,200,110']), 0.55)); o.light?.(tx + 7, 20, 10, 7, '160,170,220', 'screen');
      R(x, fr - 6, 0, 3, 10, '#5a3a2a'); R(x, fr - 9, 10, 9, 8, '#3a7a3a');
    } else if (kind === 'family') {
      // bunks, kids' drawings, a rice cooker on a folding table, laundry on a line indoors
      const bw = Math.min(30, fw); R(x, fl, 0, 2, H - 14, '#3a3a3a'); R(x, fl + bw, 0, 2, H - 14, '#3a3a3a');
      for (const bh of [8, 34]) { R(x, fl, bh, bw + 2, 2, '#3a3a3a'); R(x, fl + 2, bh + 2, bw - 2, 4, pick(r, ['#c86a5a', '#5a8ac8', '#d8c050'])); }
      for (let k = 0; k < 3; k++) R(x, fl + bw + 6 + k * 7, 38 + (k % 2) * 3, 6, 6, rgba(pick(r, ['250,240,200', '240,230,250', '230,250,240']), 0.85));
      const tx = Math.min(fr - 16, fl + bw + 8); R(x, tx, 14, 16, 2, '#6a6a60'); R(x, tx + 2, 0, 1, 14, '#4a4a44'); R(x, tx + 13, 0, 1, 14, '#4a4a44'); R(x, tx + 3, 16, 7, 5, 'rgba(225,220,205,.9)'); steam(x, tx + 6, 22, t, s, 2, 0.16, 10);
      R(x, fl, H - 18, fw, 1, '#2a2a2a'); for (let k = fl + 4; k < fr - 6; k += 8) R(x, k, H - 26, 6, 8, rgba(rgbOf(pick(r, ['#c8c0b0', '#7a3434', '#345a7a', '#d8c050'])), 0.85));
    } else if (kind === 'hoarder') {
      for (let k = fl; k < fr - 4; k += 9) { const st = 2 + Math.floor(r() * 5); for (let j = 0; j < st; j++) { const bh = j * 9; if (bh + 9 > H - 6) break; R(x, k, bh, 8 + (j % 2), 8, pick(r, ['#7a5a3a', '#6a4a2a', '#8a6a42', '#5a5a5a', '#c8c0b0'])); R(x, k, bh + 7, 8, 1, 'rgba(255,255,255,.12)'); } }
      R(x, fl + Math.round(fw * 0.4), 0, 10, 2, '#2a2420');
    } else if (kind === 'quiet') {
      // the calm base: a low bed, a shelf, a stool; little else
      R(x, fl + 2, 0, Math.min(34, fw - 4), 7, '#2e2a26'); R(x, fl + 2, 7, Math.min(34, fw - 4), 3, pick(r, ['#5a5a6a', '#6a5a4a', '#4a5a5a'])); R(x, fl + 3, 10, 8, 2, '#8a8478');
      R(x, fr - 16, 34, 14, 2, '#2a221a'); for (let k = 0; k < 3; k++) R(x, fr - 15 + k * 4, 36, 3, 5 + (k % 2) * 2, pick(r, ['#5a4a3a', '#4a5a6a', '#6a4a4a']));
    } else if (kind === 'home') {
      // the hero's: dark and locked; a jacket on the hook, the kettle, Pixel's bed and bowl, the deck on the desk on standby
      const jx = door === 'left' ? dx + dw + 10 : dx - 24; R(x, jx + 3, 46, 3, 1, '#8a8a80'); R(x, jx, 26, 10, 19, '#2a3a52'); R(x, jx + 1, 42, 8, 3, '#22324a'); R(x, jx + 4, 26, 2, 18, 'rgba(0,0,0,.3)'); R(x, jx, 26, 1, 19, 'rgba(255,255,255,.12)');
      const kx = fl + 14; R(x, kx - 2, 0, 22, 18, '#2a2622'); R(x, kx - 2, 18, 22, 1, 'rgba(255,230,190,.25)'); R(x, kx + 2, 19, 6, 6, '#c8ccd0'); R(x, kx + 8, 22, 2, 1, '#c8ccd0'); R(x, kx + 4, 25, 2, 1, '#1a1a1a'); R(x, kx + 3, 20, 1, 1, rgba('255,60,40', 0.5 + 0.5 * Math.sin(t / 30)));
      const dk = Math.min(fr - 26, kx + 24); R(x, dk, 16, 24, 2, '#3a2a1a'); R(x, dk + 2, 0, 2, 16, '#2a2018'); R(x, dk + 20, 0, 2, 16, '#2a2018');
      R(x, dk + 4, 18, 14, 3, '#1a1c20'); for (let k = 0; k < 6; k++) R(x, dk + 5 + k * 2, 19, 1, 1, 'rgba(150,160,170,.6)'); R(x, dk + 16, 20, 1, 1, rgba('0,255,255', 0.4 + 0.6 * (Math.floor(t / 40) % 2)));
      o.light?.(dk + 16, 20, 2, 1, '0,255,255', 'screen');
      const px = Math.max(fl, dk - 2) + 26 > fr ? fl + 2 : dk + 24; R(x, px, 0, 14, 3, '#5a3a2a'); R(x, px + 1, 3, 12, 2, '#8a6a4a'); R(x, px + 3, 2, 8, 2, '#c8b8a0'); R(x, px + 15, 0, 5, 2, '#a83a2a'); R(x, px + 16, 2, 3, 1, '#c84a3a');
    } else if (kind === 'empty') {
      R(x, fl + 4, 0, Math.min(34, fw - 4), 6, '#8a8270'); for (let k = 0; k < 3; k++) R(x, fl + 8 + k * 9, 6, 6, 1, 'rgba(0,0,0,.25)');
      R(x, fr - 12, 26, 8, 10, 'rgba(225,220,205,.25)');
    } else if (kind === 'hideout') {
      // Moth's: monitors in a cluster on a door laid over trestles, cables to a router shelf, a fish tank glowing, string lights, a sleeping bag on the sofa
      const dl = fl, dwd = Math.min(52, fw);
      R(x, dl, 18, dwd, 2, '#3a2a1a'); R(x, dl + 2, 0, 2, 18, '#2a2a2a'); R(x, dl + dwd - 4, 0, 2, 18, '#2a2a2a');
      const mons: [number, number, number, number][] = [[2, 21, 14, 10], [17, 21, 16, 11], [34, 21, 14, 10], [10, 33, 14, 9], [26, 33, 14, 9]];
      for (const [mx, mh, mw, mt] of mons) if (mx + mw <= dwd) { R(x, dl + mx, mh, mw, mt, '#0a0c0e'); R(x, dl + mx + 1, mh + 1, mw - 2, mt - 2, rgba(pick(r, ['70,220,150', '90,180,255', '240,90,110']), 0.4 + 0.25 * hash(Math.floor(t / 9) + mx))); for (let k = mh + 2; k < mh + mt - 2; k += 2) R(x, dl + mx + 2, k, Math.round(hash(s + k + mx) * (mw - 5)) + 1, 1, 'rgba(230,255,240,.35)'); o.light?.(dl + mx + mw / 2, mh + mt / 2, mw, mt, '120,220,200', 'screen'); }
      R(x, dl + 6, 12, 12, 6, '#1a2a30'); R(x, dl + 7, 13, 10, 4, rgba('80,200,255', 0.45)); R(x, dl + 9, 13, 2, 1, 'rgba(255,160,60,.9)'); o.light?.(dl + 12, 15, 10, 4, '80,200,255', 'screen');
      x.strokeStyle = 'rgba(0,0,0,.85)'; x.lineWidth = 1; for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(dl + 10 + k * 9, y(20)); x.bezierCurveTo(dl + 10 + k * 9, y(6), dl + dwd + 6, y(4 + k), dl + dwd + 8, y(30 + k * 2)); x.stroke(); }
      const sx = Math.min(fr - 26, dl + dwd + 6); if (sx > dl + dwd) { R(x, sx, 0, 26, 9, '#4a3a5a'); R(x, sx, 9, 26, 3, '#5a4a6a'); R(x, sx + 2, 12, 22, 4, '#3a6a4a'); R(x, sx, 9, 3, 10, '#4a3a5a'); }
      for (let k = 0; k < Math.floor(w / 8); k++) { const bx = 4 + k * 8, bh = H - 8 - Math.round(Math.sin(k * 0.9) * 2); R(x, bx, bh, 2, 2, rgba(pick(r, ['255,200,120', '255,120,160', '120,220,255']), 0.6 + 0.4 * Math.sin(t / 25 + k))); }
      x.strokeStyle = 'rgba(30,26,20,.8)'; x.beginPath(); x.moveTo(2, y(H - 7)); for (let k = 0; k <= Math.floor(w / 8); k++) x.lineTo(4 + k * 8, y(H - 7 - Math.round(Math.sin(k * 0.9) * 2))); x.stroke();
    }
    if (p.partition !== false) { R(x, 0, 0, 3, H, '#24221e'); R(x, 2, 0, 1, H, 'rgba(255,220,170,.18)'); }
    // the room light: a bulb or a strip, and the warmth it puts on the walls
    if (lit > 0 && !dark) {
      const cx = Math.round(w * (door === 'left' ? 0.62 : 0.4)); R(x, cx - 4, H - 3, 8, 2, rgba('255,225,170', 0.6 + 0.4 * lit));
      const g = x.createRadialGradient(cx, y(H - 6), 0, cx, y(H - 6), Math.max(w, H) * 0.8); g.addColorStop(0, rgba('255,200,130', 0.16 * lit)); g.addColorStop(1, 'rgba(255,200,130,0)');
      x.fillStyle = g; x.fillRect(0, y(H), w, H); o.light?.(cx, H - 4, 8, 3, '255,210,150', 'screen');
    } else { const home = kind === 'home', g = x.createLinearGradient(0, y(H), 0, 0); g.addColorStop(0, home ? 'rgba(0,0,0,.3)' : 'rgba(0,0,0,.45)'); g.addColorStop(1, home ? 'rgba(0,0,0,.08)' : 'rgba(0,0,0,.2)'); x.fillStyle = g; x.fillRect(0, y(H), w, H); }
  },
});

/** A flat's front door on a landing: number, lock, the light under it, shoes and a mat; or Moth's, which is hiding. */
export const flatDoorElement = piece({
  type: 'interior.dt-flat-door', label: 'Flat door on a landing (kit: plain, smart lock, steel gate, hiding)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    number: text('Number', '4C'), kind: select('Kind', ['plain', 'smart lock', 'steel gate', 'hiding']), leaf: colour('Door colour', 'Seeded'),
    shoes: num('Pairs of shoes outside', 2, 0, 6), mat: bool('Doormat', true), under: num('Light under the door', 0.6, 0, 1, 0.05),
    camera: select('Camera over the door', ['none', 'watching', 'taped over']), locks: num('Extra locks', 0, 0, 5), seed: num('Seed', 1, 0, 1000000),
  },
  size: () => ({ w: 40, tall: 68 }),
  bounds: () => ({ x: -4, h: 68, w: 48, tall: 68 }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' }, middle: { x: 13, h: 0, role: 'mount' } }),
  paint(x, p, o) {
    const s = Number(p.seed), r = rng(s * 37 + 5), kind = String(p.kind), w = 26, H = 50, t = o.t;
    const leaf = hexOr(p.leaf, pick(r, ['#5a3a26', '#3a4a5a', '#5a2a24', '#4a4a3a', '#2a3a2e']));
    doorLeaf(x, 0, w, H, leaf);
    if (Number(p.under) > 0) { R(x, 1, 0, w - 2, 1, rgba('255,210,150', 0.7 * Number(p.under) * glowOf(o))); o.light?.(w / 2, 1, w, 1, '255,200,140', 'window'); }
    R(x, 4, 38, 1, 1, '#0a0a0a'); R(x, 3, 37, 3, 3, 'rgba(210,190,120,.5)');
    paintText(x, String(p.number ?? ''), w / 2 + 2, y(44), 'rgba(225,205,150,.95)', 7, '700');
    R(x, w - 5, 22, 3, 2, 'rgba(210,190,120,.85)');
    if (kind === 'smart lock') { R(x, w - 6, 26, 4, 7, '#16181a'); R(x, w - 5, 30, 2, 2, 'rgba(60,230,120,.9)'); }
    if (kind === 'steel gate') { x.strokeStyle = 'rgba(150,150,140,.75)'; x.lineWidth = 1; x.strokeRect(-1.5, y(H) + 0.5, w + 3, H - 1); for (let k = 1; k < w + 2; k += 4) R(x, -1 + k, 1, 1, H - 2, 'rgba(150,150,140,.35)'); }
    const locks = kind === 'hiding' ? Math.max(3, Number(p.locks)) : Number(p.locks);
    for (let k = 0; k < locks; k++) { const lh = 14 + k * 7; R(x, w - 6, lh, 4, 4, k % 2 ? '#8a8a80' : '#b8a050'); R(x, w - 5, lh + 1, 2, 1, '#1a1a1a'); }
    if (kind === 'hiding') {
      // a chain across, the peephole taped from the outside too, a strip of foil at the threshold, a note: no deliveries
      R(x, w - 12, 30, 9, 1, 'rgba(180,180,170,.8)'); R(x, 2, 36, 6, 4, 'rgba(210,190,120,.85)');
      R(x, 1, 0, w - 2, 2, 'rgba(180,185,190,.7)');
      sheet(x, 8, 26, 12, 8, s, false, 0.85);
    }
    const cam = String(p.camera);
    if (cam !== 'none') {
      const cx = w + 2, ch = H + 6; R(x, cx, ch, 2, 4, '#1a1a1a'); R(x, cx - 6, ch + 3, 8, 5, '#202326'); R(x, cx - 7, ch + 4, 2, 3, '#0a0a0a');
      if (cam === 'taped over') { R(x, cx - 9, ch + 3, 6, 5, 'rgba(60,60,58,.95)'); R(x, cx - 9, ch + 5, 6, 1, 'rgba(120,120,115,.9)'); x.save(); x.strokeStyle = 'rgba(0,0,0,.8)'; x.beginPath(); x.moveTo(cx, y(ch + 2)); x.bezierCurveTo(cx + 2, y(ch - 10), cx + 8, y(ch - 4), cx + 9, y(ch + 18)); x.stroke(); x.restore(); }
      else R(x, cx - 2, ch + 6, 1, 1, Math.floor(t / 40) % 2 ? 'rgba(255,40,40,.95)' : 'rgba(255,40,40,.3)');
    }
    if (p.mat !== false) R(x, -2, 0, w + 4, 1, pick(r, ['#5a4a2a', '#3a4a3a', '#6a3a2a']));
    if (Number(p.shoes) > 0) shoes(x, w + 3, Number(p.shoes), s);
  },
});

/** A bicycle against the wall or chained to the rail: a commuter's, a cargo bike with its box, a kid's. */
export const bikeElement = piece({
  type: 'interior.dt-bike', label: 'Bicycle (kit)', category: 'props', libraryUse: 'reusable',
  fields: { kind: select('Kind', ['commuter', 'cargo', 'kids']), frame: colour('Frame colour', 'Seeded'), chained: bool('Chained', true), flat: bool('Flat tyre', false), seed: num('Seed', 1, 0, 1000000) },
  size: p => ({ w: p.kind === 'cargo' ? 46 : p.kind === 'kids' ? 22 : 32, tall: 22 }),
  bounds: p => ({ x: 0, h: 22, w: p.kind === 'cargo' ? 46 : p.kind === 'kids' ? 22 : 32, tall: 22 }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  paint(x, p) {
    const s = Number(p.seed), r = rng(s * 19 + 3), k = String(p.kind), sc = k === 'kids' ? 0.65 : 1, fr = rgbOr(p.frame, pick(r, ['200,50,40', '40,90,170', '220,200,60', '60,140,90', '230,230,220', '30,30,30']));
    const wr = Math.round(6 * sc), back = wr + 1, front = k === 'cargo' ? 38 : Math.round(25 * sc);
    x.save(); x.strokeStyle = 'rgba(20,20,20,.95)'; x.lineWidth = 1.5;
    for (const cx of [back, front]) { x.beginPath(); if (p.flat && cx === front) x.ellipse(cx + 0.5, y(wr - 1) + 0.5, wr, wr - 1.5, 0, 0, Math.PI * 2); else x.arc(cx + 0.5, y(wr) + 0.5, wr, 0, Math.PI * 2); x.stroke(); }
    x.strokeStyle = rgba(fr, 0.95); x.lineWidth = 1.5; const seat = Math.round(14 * sc) + 2, bar = front - Math.round(4 * sc);
    x.beginPath(); x.moveTo(back, y(wr)); x.lineTo(back + Math.round(9 * sc), y(wr)); x.lineTo(back + Math.round(6 * sc), y(seat)); x.lineTo(back, y(wr));
    x.moveTo(back + Math.round(9 * sc), y(wr)); x.lineTo(bar, y(seat - 1)); x.lineTo(back + Math.round(6 * sc), y(seat)); x.moveTo(bar, y(seat - 1)); x.lineTo(front, y(wr)); x.stroke(); x.restore();
    R(x, back + Math.round(4 * sc), seat, 5, 2, '#141414'); R(x, bar - 2, seat + 2, 6, 1, '#141414');
    if (k === 'cargo') { R(x, front - 14, wr + 2, 16, 10, '#5a4a2a'); R(x, front - 14, wr + 11, 16, 1, 'rgba(255,230,180,.3)'); }
    if (p.chained) { R(x, back + 2, wr - 1, 3, 3, 'rgba(200,200,190,.85)'); R(x, back - 2, wr, 4, 1, 'rgba(160,160,150,.8)'); }
  },
});

/** The top of a stairwell: the roof slab with a wired-glass skylight in it, the sky through it, its light falling down the well. */
export const skylightElement = piece({
  type: 'interior.dt-skylight', label: 'Skylight over a stairwell (kit)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 140, 30, 600, 1, 'units'), opening: num('Glass width', 60, 10, 400, 1, 'units'), from: num('Glass from the left', 40, 0, 600, 1, 'units'),
    thickness: num('Roof thickness', 10, 4, 30, 1, 'units'), shaft: num('Light shaft length', 220, 0, 800, 1, 'units'),
    dirt: num('Dirt and leaves on it', 0.4, 0, 1, 0.05), broken: bool('A pane broken (pigeons)', false), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.thickness) + 16 }),
  bounds: p => ({ x: 0, h: Number(p.thickness) + 16, w: Number(p.width), tall: Number(p.thickness) + 16 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, top: { x: Number(p.width) / 2, h: Number(p.thickness), role: 'surface' } }),
  paint(x, p, o) {
    const w = Number(p.width), T = Number(p.thickness), ow = Number(p.opening), ol = Math.min(Number(p.from), w - ow), s = Number(p.seed), L = o.lighting, day = skyOf(o);
    R(x, 0, 0, w, T, '#2a2826'); R(x, 0, T, w, 1, 'rgba(255,200,140,.25)'); R(x, 0, 0, w, 1, 'rgba(0,0,0,.6)');
    // the lantern: a little glass roof raised over the opening, wired glass catching the sky
    const skyC = L.daylight > 0.3 ? (L.low > 0.4 ? '255,190,130' : '170,200,230') : '40,46,70';
    R(x, ol, 0, ow, T, '#0c0d10'); R(x, ol - 3, T, 3, 12, '#3a3836'); R(x, ol + ow, T, 3, 12, '#3a3836');
    x.fillStyle = rgba(skyC, 0.35 + 0.5 * day); x.beginPath(); x.moveTo(ol, y(T)); x.lineTo(ol + ow / 2, y(T + 14)); x.lineTo(ol + ow, y(T)); x.closePath(); x.fill();
    R(x, ol, 0, ow, T, rgba(skyC, 0.3 + 0.55 * day));
    for (let k = ol + 3; k < ol + ow; k += 4) R(x, k, 0, 1, T, 'rgba(40,40,40,.4)'); for (let h = 2; h < T; h += 4) R(x, ol, h, ow, 1, 'rgba(40,40,40,.4)');
    const r = rng(s * 7 + 1); for (let k = 0; k < Math.round(ow / 4 * Number(p.dirt)); k++) R(x, ol + Math.round(r() * (ow - 3)), Math.round(r() * (T - 2)), 2 + Math.round(r() * 2), 2, pick(r, ['rgba(60,50,30,.8)', 'rgba(90,80,40,.7)', 'rgba(30,30,30,.7)']));
    if (p.broken) { R(x, ol + Math.round(ow * 0.6), 0, 6, T, rgba(skyC, 0.15 + 0.3 * day)); R(x, ol + Math.round(ow * 0.6) + 2, 0, 1, T - 2, 'rgba(255,255,255,.45)'); }
    // the light falling down the well: by day a column of grey-white, at night only what the city gives back
    const len = Number(p.shaft), a = 0.04 + 0.16 * day + (L.daylight < 0.2 ? 0.03 : 0);
    if (len > 0) { const g = x.createLinearGradient(0, 0, 0, len); g.addColorStop(0, rgba(skyC, a)); g.addColorStop(1, rgba(skyC, 0)); x.fillStyle = g; x.beginPath(); x.moveTo(ol, 0); x.lineTo(ol + ow, 0); x.lineTo(ol + ow + ow * 0.2, len); x.lineTo(ol - ow * 0.2, len); x.closePath(); x.fill(); }
  },
});

// ---------------------------------------------------------------- outside, at the back

/** The courtyard behind the building: neighbours' back walls, washing on pulley lines between them, bins, a drain, puddles. */
export const courtyardElement = piece({
  type: 'interior.dt-courtyard', label: 'Back courtyard with washing lines (kit)', category: 'environment', libraryUse: 'reusable',
  fields: {
    width: num('Width', 240, 60, 1200, 1, 'units'), height: num('Back wall height', 320, 60, 900, 1, 'units'), wall: colour('Back wall colour', '#3a2620'),
    lines: num('Washing lines', 4, 0, 12), lowest: num('Lowest line height', 90, 40, 400, 1, 'units'), spacing: num('Line spacing', 52, 20, 120, 1, 'units'),
    washing: num('Washing on the lines', 0.7, 0, 1, 0.05), pole: bool('Laundry pole on the right', true),
    bins: num('Bins', 3, 0, 8), binsFrom: num('Bins from the left', 12, 0, 1200, 1, 'units'), puddles: bool('Puddles', true), lamp: bool('Cage lamp on the back wall', true), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.height), w: Number(p.width), tall: Number(p.height) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, right: { x: Number(p.width), h: 0, role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), s = Number(p.seed), r = rng(s * 131 + 7), L = o.lighting, day = skyOf(o), wc = hexOr(p.wall, '#3a2620');
    // the far back wall: brick of the next block, small windows (some lit), drainpipes, AC units, all a step darker than the play band
    R(x, 0, 0, w, H, wc);
    for (let h = 3; h < H; h += 3) R(x, 0, h, w, 1, 'rgba(0,0,0,.14)');
    for (let fh = 30; fh < H - 30; fh += 60) for (let k = 14; k < w - 20; k += 38) {
      const lit = windowLit(s * 31 + fh * 7 + k, L) ;
      R(x, k - 1, fh - 1, 16, 24, '#1a1210'); R(x, k, fh, 14, 22, lit ? rgba('255,190,120', 0.35 + 0.35 * L.lamps) : rgba('80,90,110', 0.15 + 0.3 * day));
      R(x, k + 7, fh, 1, 22, '#1a1210'); if (lit) o.light?.(k + 7, fh + 11, 14, 22, '255,190,120', 'window');
      if (hash(s + fh + k) < 0.3) { R(x, k + 1, fh - 7, 12, 6, '#5a5a56'); R(x, k + 2, fh - 6, 10, 1, 'rgba(255,255,255,.2)'); }
    }
    for (let k = 6; k < w; k += 88) { R(x, k, 0, 3, H, '#2a2a28'); for (let h = 20; h < H; h += 40) R(x, k - 1, h, 5, 2, '#1a1a18'); }
    const shade = x.createLinearGradient(0, y(H), 0, 0); shade.addColorStop(0, 'rgba(0,0,0,.05)'); shade.addColorStop(1, 'rgba(0,0,0,.45)'); x.fillStyle = shade; x.fillRect(0, y(H), w, H);
    // the yard floor: cracked concrete, a drain, puddles
    R(x, 0, 0, w, 3, '#2a2826'); R(x, 0, 3, w, 1, 'rgba(255,200,140,.12)');
    R(x, Math.round(w * 0.55), 0, 10, 2, '#0a0a0a'); for (let k = 1; k < 10; k += 2) R(x, Math.round(w * 0.55) + k, 0, 1, 2, 'rgba(120,120,110,.5)');
    if (p.puddles !== false) for (let k = 0; k < 3; k++) { const px = Math.round(r() * (w - 30)); R(x, px, 0, 16 + Math.round(r() * 16), 1, rgba('170,190,210', 0.2 + 0.25 * day + 0.15 * L.lamps)); }
    // the pole and the lines on pulleys from the building's wall (the left edge) to it
    const pole = p.pole !== false, px = w - 6, n = Number(p.lines), top = Number(p.lowest) + Math.max(0, n - 1) * Number(p.spacing);
    if (pole) { R(x, px, 0, 4, top + 14, '#4a4a46'); R(x, px, 0, 1, top + 14, 'rgba(255,255,255,.18)'); R(x, px - 2, 0, 8, 3, '#2a2a28'); }
    for (let i = 0; i < n; i++) {
      const lh = Number(p.lowest) + i * Number(p.spacing), end = pole ? px : w, sag = 6 + Math.round(r() * 6);
      R(x, 0, lh - 2, 5, 5, '#2a2a28'); R(x, 1, lh - 1, 3, 3, '#6a6a64'); if (pole) { R(x, px - 3, lh - 2, 5, 5, '#2a2a28'); R(x, px - 2, lh - 1, 3, 3, '#6a6a64'); }
      x.save(); x.strokeStyle = 'rgba(200,200,190,.5)'; x.lineWidth = 1; x.beginPath(); x.moveTo(3, y(lh)); x.quadraticCurveTo(end / 2, y(lh - sag * 2), end - 1, y(lh)); x.stroke(); x.restore();
      for (let k = 10; k < end - 10; k += 7 + Math.round(r() * 6)) {
        if (r() > Number(p.washing)) continue;
        const u = k / end, dip = 4 * u * (1 - u) * sag, hh = lh - dip, kind = r(), c = rgbOf(pick(r, ['#c8c0b0', '#7a3434', '#345a7a', '#d8c050', '#e8e4d8', '#3a5a3a', '#9a6a9a', '#2a2a2a']));
        const sway = Math.round(Math.sin(o.t / 40 + k + i) * 0.8);
        if (kind < 0.35) { R(x, k + sway, hh - 14, 9, 14, rgba(c, 0.92)); R(x, k + sway - 2, hh - 5, 2, 5, rgba(c, 0.92)); R(x, k + sway + 9, hh - 5, 2, 5, rgba(c, 0.92)); }
        else if (kind < 0.6) { R(x, k + sway, hh - 16, 4, 16, rgba(c, 0.92)); R(x, k + sway + 5, hh - 16, 4, 16, rgba(c, 0.92)); R(x, k + sway, hh - 3, 9, 3, rgba(c, 0.92)); }
        else if (kind < 0.8) R(x, k + sway, hh - 20, 14, 20, rgba(c, 0.85));
        else R(x, k + sway, hh - 6, 4, 6, rgba(c, 0.92));
        R(x, k + sway + 1, hh - 1, 1, 2, 'rgba(240,240,230,.7)');
      }
    }
    for (let k = 0; k < Number(p.bins); k++) {
      const bx = Number(p.binsFrom) + k * 22 + Math.round(r() * 4), bc = pick(r, ['#2a4a2e', '#3a3a3a', '#2a3a5a']);
      R(x, bx, 0, 18, 22, bc); R(x, bx - 1, 22, 20, 3, '#1a1a1a'); R(x, bx + 2, 4, 14, 1, 'rgba(255,255,255,.12)'); R(x, bx + 2, 0, 3, 2, '#0a0a0a'); R(x, bx + 13, 0, 3, 2, '#0a0a0a');
      if (r() < 0.5) R(x, bx + 4, 25, 10, 3, pick(r, ['rgba(40,40,40,.95)', 'rgba(230,230,220,.8)']));
    }
    if (p.lamp !== false) {
      const lx = Math.round(w * 0.45), lh = 96, glow = L.outdoor ? Math.max(0.2, L.lamps) : 1;
      R(x, lx - 1, lh + 4, 2, 5, '#1a1a1a'); R(x, lx - 4, lh - 1, 9, 6, '#1a1a1a'); R(x, lx - 3, lh, 7, 4, rgba('255,200,130', 0.5 + 0.5 * glow));
      const g = x.createRadialGradient(lx, y(lh), 0, lx, y(lh), 90); g.addColorStop(0, rgba('255,190,120', 0.2 * glow)); g.addColorStop(1, 'rgba(255,190,120,0)'); x.fillStyle = g; x.fillRect(lx - 90, y(lh + 90), 180, 180);
      o.light?.(lx, lh + 2, 7, 4, '255,190,120', 'screen');
    }
  },
});

/** The areaway: a concrete pit by the back wall with steps down to the basement door, a railing round its top. */
export const areawayElement = piece({
  type: 'interior.dt-areaway', label: 'Areaway: cellar steps down by a wall (kit; pair with a level.stairs)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 90, 30, 300, 1, 'units'), depth: num('Depth', 80, 20, 200, 1, 'units'), railing: num('Railing height', 18, 0, 40, 1, 'units'),
    gate: bool('Gate in the railing', true), rubbish: num('Rubbish at the bottom', 0.5, 0, 1, 0.05), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.railing) + 4 }),
  bounds: p => ({ x: 0, h: Number(p.railing) + 4, w: Number(p.width), tall: Number(p.railing) + Number(p.depth) + 4 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, bottom: { x: 0, h: -Number(p.depth), role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), D = Number(p.depth), rl = Number(p.railing), s = Number(p.seed), r = rng(s * 3 + 9);
    // the pit: poured concrete walls, darker going down, the street's light catching its rim
    R(x, 0, -D, w, D, '#34312d'); for (let h = -D + 10; h < 0; h += 10) R(x, 0, h, w, 1, 'rgba(0,0,0,.28)');
    for (let k = 6; k < w; k += 23) R(x, k, -D + 4 + Math.round(r() * 10), 2, 10 + Math.round(r() * (D * 0.4)), 'rgba(0,0,0,.2)');
    const g = x.createLinearGradient(0, y(0), 0, y(-D)); g.addColorStop(0, 'rgba(0,0,0,.05)'); g.addColorStop(1, 'rgba(0,0,0,.45)'); x.fillStyle = g; x.fillRect(0, 0, w, D);
    R(x, w - 5, -D, 5, D, '#4a4640'); R(x, w - 5, -D, 1, D, 'rgba(255,220,180,.18)'); R(x, 0, -2, w, 2, '#5a5650'); R(x, 0, -1, w, 1, 'rgba(255,210,150,.35)');
    R(x, 0, -D, w, 3, '#3e3a36'); R(x, 0, -D + 3, w, 1, 'rgba(255,200,140,.18)');
    for (let k = 0; k < Math.round(6 * Number(p.rubbish)); k++) R(x, 4 + Math.round(r() * (w * 0.4)), -D + 2, 3 + Math.round(r() * 4), 2 + Math.round(r() * 2), pick(r, ['rgba(230,225,210,.6)', 'rgba(90,70,40,.8)', 'rgba(40,40,40,.9)']));
    if (rl > 0) {
      R(x, 0, rl, w, 2, '#1c1c1c'); R(x, 0, rl + 1, w, 1, 'rgba(255,200,140,.25)');
      for (let k = 0; k < w; k += 5) if (!(p.gate !== false && k > w - 26 && k < w - 6)) R(x, k, 0, 1, rl, '#1c1c1c');
      if (p.gate !== false) { R(x, w - 26, 0, 2, rl + 2, '#1c1c1c'); R(x, w - 6, 0, 2, rl + 2, '#1c1c1c'); x.save(); x.strokeStyle = 'rgba(28,28,28,1)'; x.beginPath(); x.moveTo(w - 24, y(rl)); x.lineTo(w - 34, y(rl - 3)); x.lineTo(w - 34, y(2)); x.lineTo(w - 24, y(1)); x.stroke(); x.restore(); }
      for (const k of [0, w - 2]) R(x, k, 0, 2, rl + 3, '#1c1c1c');
    }
    o.light?.(w / 2, -D / 2, 1, 1, '0,0,0', 'window');
  },
});

/** A parcel: cardboard, tape, a printed label, a sticker; left where it should not be. */
export const parcelElement = piece({
  type: 'interior.dt-parcel', label: 'Parcel (kit)', category: 'props', libraryUse: 'reusable',
  fields: { width: num('Width', 16, 6, 60, 1, 'units'), height: num('Height', 11, 4, 40, 1, 'units'), wrap: select('Wrapping', ['cardboard', 'grey mailer', 'black bag']), sticker: select('Sticker', ['none', 'fragile', 'red', 'cyan']), seed: num('Seed', 1, 0, 1000000) },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.height), w: Number(p.width), tall: Number(p.height) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, top: { x: Number(p.width) / 2, h: Number(p.height), role: 'surface' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), wrap = String(p.wrap), st = String(p.sticker);
    const c = wrap === 'cardboard' ? '#9a7448' : wrap === 'grey mailer' ? '#8a8e92' : '#141414';
    R(x, 0, 0, w, H, c); R(x, 0, H - 1, w, 1, 'rgba(255,255,255,.2)'); R(x, 0, 0, w, 1, 'rgba(0,0,0,.4)');
    if (wrap === 'cardboard') { R(x, Math.round(w / 2) - 1, 0, 2, H, 'rgba(220,200,150,.65)'); R(x, 0, Math.round(H / 2), w, 1, 'rgba(220,200,150,.4)'); }
    if (wrap === 'black bag') { R(x, Math.round(w / 2), H, 2, 3, '#141414'); R(x, 2, 2, w - 4, 1, 'rgba(255,255,255,.12)'); }
    R(x, 2, 2, Math.min(8, w - 4), Math.min(5, H - 3), 'rgba(240,240,232,.9)'); R(x, 3, 3, Math.min(6, w - 6), 1, 'rgba(0,0,0,.5)');
    if (st !== 'none') R(x, w - 6, H - 5, 4, 3, st === 'fragile' ? 'rgba(230,40,30,.95)' : st === 'red' ? 'rgba(230,40,30,.95)' : rgba('0,255,255', 0.6 + 0.35 * Math.sin(o.t / 18)));
  },
});

/** The building's service room: meters, a water heater, the riser pipes, CONCIERGE's cabinet humming, bins and a mop. */
export const servicePlantElement = piece({
  type: 'interior.dt-service-plant', label: 'Basement plant: meters, heater, CONCIERGE cabinet (kit)', category: 'machinery', libraryUse: 'reusable',
  fields: {
    width: num('Width', 200, 60, 800, 1, 'units'), meters: num('Electricity meters', 8, 0, 24), heater: bool('Water heater', true),
    cabinet: select('Server cabinet', ['CONCIERGE', 'plain', 'none']), cabinetFrom: num('Cabinet from the left', 120, 0, 800, 1, 'units'),
    bins: num('Bins', 2, 0, 6), mop: bool('Mop and bucket', true), tell: bool('Cyan tell on the cabinet', true), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: 70 }),
  bounds: p => ({ x: 0, h: 70, w: Number(p.width), tall: 70 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, cabinet: { x: Number(p.cabinetFrom) + 13, h: 0, role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), s = Number(p.seed), t = o.t, r = rng(s * 43 + 1);
    let at = 6;
    if (Number(p.meters) > 0) {
      const n = Number(p.meters), cols = Math.min(n, 6), rows = Math.ceil(n / cols), mw = cols * 9 + 4;
      R(x, at, 30, mw, rows * 12 + 4, '#1d1f20');
      for (let k = 0; k < n; k++) { const mx = at + 3 + (k % cols) * 9, mh = 32 + Math.floor(k / cols) * 12; R(x, mx, mh, 7, 10, '#3c3e40'); R(x, mx + 1, mh + 5, 5, 3, 'rgba(230,230,220,.7)'); R(x, mx + 1 + (Math.floor(t * (0.05 + hash(s + k) * 0.2)) % 5), mh + 6, 1, 1, 'rgba(0,0,0,.9)'); }
      x.strokeStyle = 'rgba(0,0,0,.9)'; x.lineWidth = 1; for (let k = 0; k < 5; k++) { x.beginPath(); x.moveTo(at + 4 + k * 8, y(30 + rows * 12 + 4)); x.lineTo(at + 4 + k * 8, y(70)); x.stroke(); }
      at += mw + 8;
    }
    if (p.heater !== false) {
      R(x, at, 0, 22, 50, '#8a8a82'); R(x, at + 1, 1, 20, 48, '#a8a8a0'); R(x, at + 2, 1, 3, 48, 'rgba(255,255,255,.2)'); R(x, at + 6, 20, 10, 6, '#2a2a28'); R(x, at + 9, 22, 2, 2, 'rgba(255,120,40,.9)');
      R(x, at + 6, 50, 3, 20, '#6a4a2a'); R(x, at + 14, 50, 3, 20, '#3a5a6a'); o.light?.(at + 10, 23, 2, 2, '255,120,40', 'screen'); at += 30;
    }
    for (let k = 0; k < Number(p.bins); k++) { const bx = at + k * 20; R(x, bx, 0, 17, 24, pick(r, ['#2a4a2e', '#3a3a3a', '#2a3a5a'])); R(x, bx - 1, 24, 19, 3, '#1a1a1a'); R(x, bx + 2, 4, 13, 1, 'rgba(255,255,255,.12)'); }
    at += Number(p.bins) * 20 + 4;
    if (p.mop !== false) { R(x, at, 0, 10, 8, '#c8a028'); R(x, at + 1, 8, 8, 1, '#8a6a18'); R(x, at + 6, 2, 1, 36, '#6a4a2a'); R(x, at + 4, 0, 5, 4, 'rgba(220,220,210,.6)'); }
    const cab = String(p.cabinet);
    if (cab !== 'none') {
      const cx = Math.min(w - 28, Number(p.cabinetFrom)), cw = 26, ch = 56;
      R(x, cx - 1, 0, cw + 2, ch + 1, '#0c0d0e'); R(x, cx, 0, cw, ch, '#1e2124'); R(x, cx + 2, 2, cw - 4, ch - 4, '#121416');
      for (let row = 0; row < 8; row++) { const rh = 6 + row * 6; R(x, cx + 3, rh, cw - 6, 4, '#24282c'); for (let k = 0; k < 4; k++) if (hash(Math.floor(t / (6 + k * 3)) + row * 7 + k + s) < 0.6) R(x, cx + 5 + k * 3, rh + 1, 1, 1, k === 3 ? 'rgba(255,170,40,.95)' : 'rgba(80,255,140,.95)'); }
      if (p.tell !== false) R(x, cx, ch - 1, cw, 1, rgba('0,255,255', 0.5 + 0.4 * Math.sin(t / 22)));
      o.light?.(cx + cw / 2, ch / 2, cw - 6, ch - 8, '80,255,140', 'screen');
      if (cab === 'CONCIERGE') { R(x, cx + 3, ch - 9, cw - 6, 6, '#d8d2bf'); paintText(x, 'CNCRG', cx + cw / 2, y(ch - 6), 'rgba(30,26,20,.95)', 5, '700'); label(x, o, cx - 34, 40, 'DO NOT SWITCH OFF', 'red', 6); }
      x.strokeStyle = 'rgba(0,0,0,.9)'; x.lineWidth = 1; for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(cx + 6 + k * 4, y(ch)); x.bezierCurveTo(cx + 6 + k * 4, y(ch + 8), cx - 10 - k * 6, y(ch + 4), cx - 14 - k * 6, y(76)); x.stroke(); }
    }
  },
});

// ---------------------------------------------------------------- the fixer's kitchen and Kessel's room

/** The noodle kitchen's fittings: steel counters, stock pots steaming on burners, the hood and its duct, bowls, ladles, sacks, the strip curtain to the back. */
export const noodleKitchenElement = piece({
  type: 'interior.dt-noodle-kitchen', label: 'Noodle kitchen fittings (kit)', category: 'furniture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 140, 60, 600, 1, 'units'), height: num('Room height', 90, 50, 200, 1, 'units'), pots: num('Stock pots', 3, 0, 6),
    burners: num('Burners lit', 1, 0, 1, 0.05), steam: num('Steam', 0.8, 0, 1, 0.05), hood: bool('Extractor hood and duct', true),
    curtain: select('Strip curtain doorway', ['right', 'left', 'none']), slips: num('Order slips on the rail', 5, 0, 12), sacks: num('Flour sacks', 2, 0, 6),
    seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.height), w: Number(p.width), tall: Number(p.height) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, doorway: { x: p.curtain === 'left' ? 16 : Number(p.width) - 16, h: 0, role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), s = Number(p.seed), r = rng(s * 59 + 3), t = o.t, cur = String(p.curtain);
    const cl = cur === 'left' ? 34 : 4, cr = cur === 'right' ? w - 34 : w - 4, cw = cr - cl;
    // the curtain doorway: a frame and plastic strips, swaying, a warm room behind them
    if (cur !== 'none') {
      const dx = cur === 'left' ? 4 : w - 30; R(x, dx - 2, 0, 28, 54, '#2a2622'); R(x, dx, 0, 24, 52, '#140e0a'); R(x, dx, 0, 24, 52, rgba('255,220,190', 0.08 * glowOf(o)));
      R(x, dx, 0, 24, 52, rgba('255,200,140', 0.14 * glowOf(o)));
      for (let k = 0; k < 5; k++) { const sw = Math.round(Math.sin(t / 30 + k) * 0.7); R(x, dx + 1 + k * 5 + sw, 2, 4, 50, 'rgba(210,225,220,.16)'); R(x, dx + 1 + k * 5 + sw, 2, 1, 50, 'rgba(255,255,255,.14)'); }
    }
    // the counter run: steel on legs, a shelf under it with bowls stacked
    R(x, cl, 0, cw, 26, '#2a2c2e'); R(x, cl, 26, cw, 2, '#b8bcbe'); R(x, cl, 27, cw, 1, 'rgba(255,255,255,.55)'); R(x, cl + 2, 10, cw - 4, 1, '#5a5e60');
    for (let k = cl + 4; k < cr - 8; k += 12) { R(x, k, 11, 9, 2, '#e8e4d8'); R(x, k + 1, 13, 7, 2, '#e8e4d8'); R(x, k + 2, 15, 5, 1, 'rgba(200,40,30,.8)'); }
    for (let k = 0; k < Number(p.sacks); k++) { const sx = cl + 6 + k * 13; R(x, sx, 0, 11, 9, '#d8d0b8'); R(x, sx + 2, 9, 7, 2, '#c8c0a8'); R(x, sx + 2, 3, 7, 2, 'rgba(180,40,30,.7)'); }
    // stock pots on the burners, lids rattling, steam
    const n = Number(p.pots), lit = Number(p.burners);
    for (let k = 0; k < n; k++) {
      const px = cl + 10 + Math.round(((cw - 40) * (k + 0.5)) / Math.max(1, n)), pw = 18 + (k % 2) * 4, ph = 16 + (k % 2) * 4;
      R(x, px - 2, 28, pw + 4, 2, '#1a1a1a'); if (lit > 0) { R(x, px + 2, 28, pw - 4, 1, rgba('90,150,255', 0.6 + 0.35 * Math.sin(t / 3 + k))); o.light?.(px + pw / 2, 29, pw, 2, '90,150,255', 'screen'); }
      R(x, px, 30, pw, ph, '#9a9ea0'); R(x, px + 1, 30, 3, ph, 'rgba(255,255,255,.25)'); R(x, px - 2, 30 + ph - 4, 2, 2, '#6a6e70'); R(x, px + pw, 30 + ph - 4, 2, 2, '#6a6e70');
      R(x, px - 1, 30 + ph, pw + 2, 2, '#7a7e80'); R(x, px + pw / 2 - 2, 30 + ph + 2 + (Math.sin(t / 4 + k) > 0.8 ? 1 : 0), 4, 1, '#3a3a3a');
      if (Number(p.steam) > 0) steam(x, px + pw / 2, 32 + ph, t, s + k * 5, 4, 0.28 * Number(p.steam), 30);
    }
    // the wok burner at the end: a roar of flame now and then
    const wx = cr - 18; R(x, wx, 28, 14, 3, '#1a1a1a'); x.fillStyle = '#2a2a2a'; x.beginPath(); x.ellipse(wx + 7, y(33), 9, 3, 0, 0, Math.PI); x.fill();
    if (lit > 0 && Math.sin(t / 50 + s) > 0.4) { R(x, wx + 2, 31, 10, 2 + Math.round(hash(Math.floor(t / 2)) * 3), 'rgba(255,170,60,.85)'); o.light?.(wx + 7, 33, 10, 4, '255,160,60', 'screen'); }
    // the hood over the burners and its duct up through the ceiling, ladles hanging off its rail, the slip rail
    if (p.hood !== false) {
      const hl = cl + 4, hw = Math.max(30, cw - 8), hh = Math.min(H - 14, 70);
      x.fillStyle = '#6a6e70'; x.beginPath(); x.moveTo(hl, y(hh)); x.lineTo(hl + hw, y(hh)); x.lineTo(hl + hw - 8, y(hh + 10)); x.lineTo(hl + 8, y(hh + 10)); x.closePath(); x.fill();
      R(x, hl, hh - 1, hw, 2, '#4a4e50'); R(x, hl + 8, hh + 10, hw - 16, 1, 'rgba(255,255,255,.2)');
      R(x, hl + Math.round(hw / 2) - 6, hh + 10, 12, H - hh - 10, '#5a5e60'); R(x, hl + Math.round(hw / 2) - 6, hh + 10, 2, H - hh - 10, 'rgba(255,255,255,.15)');
      for (let k = hl + 6; k < hl + hw - 6; k += 9) { R(x, k, hh - 9, 1, 8, '#8a8e90'); R(x, k - 1, hh - 12, 3, 3, '#8a8e90'); }
      const sl = Number(p.slips); R(x, hl + 4, hh - 16, Math.min(hw - 8, sl * 7 + 4), 1, '#8a8e90'); for (let k = 0; k < sl; k++) R(x, hl + 6 + k * 7, hh - 26, 5, 9, 'rgba(240,236,225,.85)');
    }
    // a shelf high on the wall: tins, bottles of sauce, a cat that waves
    const shH = Math.min(H - 10, 76), shL = cl + Math.round(cw * 0.05);
    R(x, shL, shH, Math.min(46, cw * 0.4), 2, '#3a2a1a');
    for (let k = 0; k < 6; k++) R(x, shL + 2 + k * 7, shH + 2, 5, 6 + (k % 3) * 2, pick(r, ['#b83a2a', '#d8c050', '#3a6a3a', '#c8c0b0', '#6a3a2a']));
  },
});

/** Kessel's chair: a reclining dentist chair, the surgical lamp on its arm, the instrument tray, the vitals monitor, plastic sheeting behind. */
export const docChairElement = piece({
  type: 'interior.dt-doc-chair', label: 'Treatment chair, lamp and tray (kit: ripperdoc)', category: 'furniture', libraryUse: 'reusable',
  fields: {
    recline: num('Recline', 0.6, 0, 1, 0.05), upholstery: colour('Upholstery', '#2a5a5a'), lamp: select('Surgical lamp', ['ceiling arm', 'floor stand', 'none']),
    lampOn: num('Lamp on', 1, 0, 1, 0.05), ceiling: num('Ceiling height (for the arm)', 86, 50, 200, 1, 'units'), tray: bool('Instrument tray with implants', true),
    monitor: bool('Vitals monitor', true), straps: bool('Straps', true), sheeting: bool('Plastic sheeting behind', true), seed: num('Seed', 1, 0, 1000000),
  },
  size: () => ({ w: 80, tall: 86 }),
  bounds: p => ({ x: -10, h: Number(p.ceiling), w: 96, tall: Number(p.ceiling) }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' }, seat: { x: 30, h: 22, role: 'surface' } }),
  paint(x, p, o) {
    const rec = Number(p.recline), up = hexOr(p.upholstery, '#2a5a5a'), t = o.t, C = Number(p.ceiling), on = Number(p.lampOn);
    if (p.sheeting !== false) {
      // clean where it matters: heavy plastic stapled to a batten under the ceiling, a rectangle of white floor
      R(x, -6, 0, 88, C - 2, 'rgba(225,235,235,.16)'); R(x, -6, C - 4, 88, 2, '#6a5a44');
      for (let k = -4; k < 82; k += 7) R(x, k, 2, 1, C - 6, 'rgba(255,255,255,.08)');
      R(x, -6, 0, 88, 2, 'rgba(230,236,232,.55)');
    }
    // the base and pump, the seat, the back reclined by `rec`, the head rest, the arm rest
    R(x, 24, 0, 16, 3, '#3a3c3e'); R(x, 29, 3, 6, 13, '#5a5e60'); R(x, 30, 3, 1, 13, 'rgba(255,255,255,.3)');
    R(x, 14, 16, 34, 6, up); R(x, 14, 21, 34, 1, 'rgba(255,255,255,.2)');
    const ang = (0.25 + 0.95 * rec), bx = 46, bh = 18, len = 30;
    x.save(); x.translate(bx, y(bh)); x.rotate(-(Math.PI / 2 - ang)); x.fillStyle = up; x.fillRect(0, -len, 7, len); x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(0, -len, 1, len); x.fillStyle = up; x.fillRect(1, -len - 7, 5, 6); x.restore();
    x.fillStyle = up; x.beginPath(); x.moveTo(14, y(20)); x.lineTo(2, y(12)); x.lineTo(2, y(8)); x.lineTo(14, y(16)); x.closePath(); x.fill();
    R(x, 0, 6, 4, 4, up);
    R(x, 20, 26, 18, 2, '#3a3c3e'); R(x, 22, 22, 2, 4, '#3a3c3e');
    if (p.straps !== false) { R(x, 22, 16, 2, 7, 'rgba(30,30,30,.9)'); R(x, 6, 10, 2, 6, 'rgba(30,30,30,.9)'); R(x, 22, 27, 3, 1, 'rgba(200,200,190,.8)'); }
    // the lamp: a dish on a jointed arm, its pool of white on the chair
    const lampX = 36, lampH = 58;
    if (p.lamp !== 'none') {
      x.save(); x.strokeStyle = '#8a8e90'; x.lineWidth = 2; x.beginPath();
      if (p.lamp === 'ceiling arm') { x.moveTo(60, y(C)); x.lineTo(60, y(C - 10)); x.lineTo(46, y(lampH + 16)); x.lineTo(lampX + 4, y(lampH + 4)); }
      else { x.moveTo(72, y(0)); x.lineTo(72, y(52)); x.lineTo(lampX + 6, y(lampH + 4)); R(x, 66, 0, 12, 2, '#5a5e60'); }
      x.stroke(); x.restore();
      x.fillStyle = '#c8ccce'; x.beginPath(); x.ellipse(lampX, y(lampH), 9, 4, -0.25, 0, Math.PI * 2); x.fill();
      x.fillStyle = on > 0 ? rgba('255,255,245', 0.6 + 0.4 * on) : '#5a5e60'; x.beginPath(); x.ellipse(lampX - 1, y(lampH - 2), 7, 2, -0.25, 0, Math.PI * 2); x.fill();
      if (on > 0) {
        x.fillStyle = rgba('240,250,255', 0.12 * on); x.beginPath(); x.moveTo(lampX - 7, y(lampH - 2)); x.lineTo(lampX + 6, y(lampH - 3)); x.lineTo(48, y(18)); x.lineTo(6, y(14)); x.closePath(); x.fill();
        o.light?.(lampX, lampH - 2, 14, 4, '240,250,255', 'screen'); o.light?.(28, 22, 30, 8, '240,250,255', 'screen');
      }
    }
    // the tray on a trolley: instruments laid out, implants in their foam, one glowing pink
    if (p.tray !== false) {
      const tx = 54; R(x, tx, 0, 2, 30, '#8a8e90'); R(x, tx + 18, 0, 2, 30, '#8a8e90'); R(x, tx - 1, 30, 22, 2, '#b8bcbe'); R(x, tx, 12, 20, 1, '#8a8e90');
      R(x, tx + 1, 32, 18, 3, '#1a1c1e'); for (let k = 0; k < 4; k++) R(x, tx + 2 + k * 4, 33, 3, 1, k === 2 ? rgba('255,80,200', 0.6 + 0.35 * Math.sin(t / 14)) : 'rgba(200,220,230,.85)');
      R(x, tx + 2, 13, 6, 3, '#3a6a8a'); R(x, tx + 10, 13, 8, 2, '#d8d4c8');
      o.light?.(tx + 10, 33, 4, 1, '255,80,200', 'screen');
    }
    if (p.monitor !== false) {
      const mx = 62, mh = 50; R(x, mx + 6, 34, 2, mh - 34, '#5a5e60'); R(x, mx, mh, 18, 12, '#141618'); R(x, mx + 1, mh + 1, 16, 10, '#06100a');
      for (let k = 0; k < 16; k++) { const ph = (k + Math.floor(t / 2)) % 16, beat = ph === 8 ? 4 : ph === 9 ? -2 : 0; R(x, mx + 1 + k, mh + 5 + beat, 1, 1, 'rgba(80,255,140,.9)'); }
      o.light?.(mx + 9, mh + 6, 16, 10, '80,255,140', 'screen');
    }
  },
});

/** A glass-door fridge of parts: implants in labelled bags, jars, a padlock and chain, the compressor's hum. */
export const partsFridgeElement = piece({
  type: 'interior.dt-parts-fridge', label: 'Fridge of parts (kit: ripperdoc)', category: 'furniture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 26, 14, 80, 1, 'units'), height: num('Height', 56, 24, 100, 1, 'units'), contents: select('Contents', ['implants', 'jars', 'drinks', 'mixed']),
    lit: num('Inside light', 1, 0, 1, 0.05), chain: bool('Padlock and chain', true), label: text('Label on the door (empty: none)', 'NO FOOD'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.height), w: Number(p.width), tall: Number(p.height) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, top: { x: Number(p.width) / 2, h: Number(p.height), role: 'surface' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), s = Number(p.seed), r = rng(s * 29 + 5), lit = Number(p.lit) * glowOf(o), c = String(p.contents);
    R(x, 0, 0, w, H, '#d8dad6'); R(x, 0, H - 1, w, 1, 'rgba(255,255,255,.6)'); R(x, 0, 0, w, 6, '#2a2c2e');
    R(x, 2, 7, w - 4, H - 12, '#0a1418'); R(x, 2, 7, w - 4, H - 12, rgba('170,225,255', 0.16 * lit));
    for (let sh = 16; sh < H - 6; sh += 11) {
      R(x, 3, sh, w - 6, 1, rgba('200,230,240', 0.5));
      for (let k = 4; k < w - 6; k += 5) {
        const kind = c === 'mixed' ? pick(r, ['implants', 'jars', 'drinks']) : c;
        if (kind === 'implants') { R(x, k, sh + 1, 4, 5, rgba('220,235,240', 0.35)); R(x, k + 1, sh + 2, 2, 2, pick(r, ['rgba(255,80,200,.9)', 'rgba(80,220,255,.9)', 'rgba(200,200,190,.9)'])); }
        else if (kind === 'jars') { R(x, k, sh + 1, 4, 7, rgba('230,210,160', 0.35)); R(x, k + 1, sh + 2, 2, 3, pick(r, ['rgba(160,60,60,.8)', 'rgba(200,180,120,.7)'])); R(x, k, sh + 8, 4, 1, '#5a5a56'); }
        else { R(x, k + 1, sh + 1, 2, 8, pick(r, ['rgba(80,200,90,.8)', 'rgba(230,120,40,.8)', 'rgba(230,230,220,.8)'])); }
      }
    }
    R(x, 2, 7, 1, H - 12, 'rgba(255,255,255,.35)'); R(x, w - 4, 20, 1, 14, '#8a8e90');
    if (lit > 0) o.light?.(w / 2, H / 2, w - 4, H - 12, '170,225,255', 'screen');
    if (p.chain !== false) { for (let k = 0; k < w; k += 3) R(x, k, 28 + (k % 6 === 0 ? 1 : 0), 2, 2, '#8a8a80'); R(x, w / 2 - 2, 24, 4, 5, '#b8a050'); }
    const lb = String(p.label ?? ''); if (lb) label(x, o, w / 2, H - 14, lb, 'red', 5);
    R(x, 2, 1, w - 4, 1, rgba('60,230,120', 0.6));
  },
});

/** A privacy screen: a hospital folding screen on castors, or a roller shutter half down; between the chair and the door. */
export const privacyScreenElement = piece({
  type: 'interior.dt-privacy-screen', label: 'Privacy screen or shutter (kit)', category: 'furniture', libraryUse: 'reusable',
  fields: {
    kind: select('Kind', ['folding', 'roller shutter']), width: num('Width', 36, 12, 200, 1, 'units'), height: num('Height', 48, 20, 200, 1, 'units'),
    closed: num('Closed', 0.8, 0, 1, 0.05), fabric: colour('Fabric', '#bfd0c8'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.height), w: Number(p.width), tall: Number(p.height) }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), cl = Number(p.closed), fab = rgbOr(p.fabric, '191,208,200'), glow = glowOf(o);
    if (p.kind === 'roller shutter') {
      const down = Math.round((H - 6) * cl); R(x, -2, H - 6, w + 4, 6, '#2a2c2e'); R(x, -2, H - 6, w + 4, 1, 'rgba(255,255,255,.2)');
      R(x, 0, H - 6 - down, w, down, '#4a4c4e'); for (let h = H - 6 - down + 2; h < H - 6; h += 3) R(x, 0, h, w, 1, 'rgba(0,0,0,.3)');
      R(x, 0, H - 6 - down, w, 1, '#8a8e90'); R(x, -2, 0, 2, H, '#2a2c2e'); R(x, w, 0, 2, H, '#2a2c2e');
      return;
    }
    // panels of fabric in steel frames, folded where it is open
    const panels = Math.max(2, Math.round(w / 12)), pw = Math.max(4, Math.round((w * (0.35 + 0.65 * cl)) / panels));
    for (let k = 0; k < panels; k++) {
      const px = k * pw, shade = k % 2 ? 0.75 : 0.9;
      R(x, px, 4, pw, H - 6, '#8a8e90'); R(x, px + 1, 6, pw - 2, H - 10, rgba(fab, shade * (0.55 + 0.3 * glow)));
      R(x, px + 1, 6, pw - 2, 1, 'rgba(255,255,255,.3)'); R(x, px + Math.round(pw / 2) - 1, 0, 2, 4, '#3a3c3e');
    }
  },
});

/** A camp cot with a blanket and a pillow, a crate beside it with a bottle and a lamp: someone sleeps here between patients. */
export const cotElement = piece({
  type: 'interior.dt-cot', label: 'Camp cot with crate (kit)', category: 'furniture', libraryUse: 'reusable',
  fields: { length: num('Length', 46, 30, 80, 1, 'units'), blanket: colour('Blanket', '#6a5a3a'), crate: bool('Crate with bottle and lamp', true), lamp: num('Lamp on', 0.6, 0, 1, 0.05), seed: num('Seed', 1, 0, 1000000) },
  size: p => ({ w: Number(p.length) + 16, tall: 20 }),
  bounds: p => ({ x: 0, h: 20, w: Number(p.length) + 16, tall: 20 }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' }, bed: { x: 20, h: 12, role: 'surface' } }),
  paint(x, p, o) {
    const L = Number(p.length), bl = rgbOr(p.blanket, '106,90,58');
    for (const k of [2, L - 4]) { x.save(); x.strokeStyle = '#3a3c3e'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(k - 3, y(0)); x.lineTo(k + 3, y(10)); x.moveTo(k + 3, y(0)); x.lineTo(k - 3, y(10)); x.stroke(); x.restore(); }
    R(x, 0, 10, L, 2, '#4a4c3e'); R(x, 1, 12, L - 2, 3, rgba(bl, 0.95)); R(x, 4, 15, Math.round(L * 0.6), 2, rgba(bl, 0.9)); R(x, L - 12, 12, 10, 4, '#d8d0c0');
    if (p.crate !== false) {
      const cx = L + 3; R(x, cx, 0, 12, 12, '#6a4a2a'); R(x, cx, 5, 12, 1, 'rgba(0,0,0,.35)'); R(x, cx + 1, 12, 2, 7, 'rgba(120,160,90,.85)');
      const on = Number(p.lamp) * glowOf(o); R(x, cx + 6, 12, 5, 1, '#2a2a2a'); R(x, cx + 8, 13, 1, 4, '#2a2a2a'); R(x, cx + 6, 17, 5, 3, on > 0 ? rgba('255,200,130', 0.5 + 0.5 * on) : '#4a3a2a');
      if (on > 0) o.light?.(cx + 8, 17, 6, 3, '255,200,130', 'screen');
    }
  },
});

/** A storeroom's shelving: steel racks of boxed stock (noodles, cleaning supplies), a few things that are not stock. */
export const stockShelvesElement = piece({
  type: 'interior.dt-shelves', label: 'Storeroom shelving (kit)', category: 'furniture', libraryUse: 'reusable',
  fields: { width: num('Width', 40, 14, 300, 1, 'units'), height: num('Height', 70, 20, 200, 1, 'units'), shelves: num('Shelves', 4, 1, 10), fill: num('Fill', 0.8, 0, 1, 0.05), stock: select('Stock', ['noodles', 'medical', 'cleaning', 'mixed']), seed: num('Seed', 1, 0, 1000000) },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.height), w: Number(p.width), tall: Number(p.height) }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  paint(x, p) {
    const w = Number(p.width), H = Number(p.height), n = Number(p.shelves), r = rng(Number(p.seed) * 67 + 1), st = String(p.stock);
    R(x, 0, 0, 2, H, '#5a5e60'); R(x, w - 2, 0, 2, H, '#5a5e60');
    for (let i = 0; i < n; i++) {
      const sh = 4 + Math.round(((H - 8) * i) / n), next = 4 + Math.round(((H - 8) * (i + 1)) / n);
      R(x, 0, sh, w, 2, '#6a6e70'); R(x, 0, sh + 1, w, 1, 'rgba(255,255,255,.2)');
      for (let k = 3; k < w - 6; k += 7 + Math.round(r() * 3)) {
        if (r() > Number(p.fill)) continue;
        const kind = st === 'mixed' ? pick(r, ['noodles', 'medical', 'cleaning']) : st, bh = Math.min(next - sh - 4, 6 + Math.round(r() * 6));
        const c = kind === 'noodles' ? pick(r, ['#c83a2a', '#d8b040', '#8a6a42']) : kind === 'medical' ? pick(r, ['#d8dcd8', '#a8c8d8', '#d8d0c0']) : pick(r, ['#3a7ab8', '#d8d8c8', '#5aa85a', '#e8c040']);
        R(x, k, sh + 2, 6, bh, c); R(x, k, sh + 1 + bh, 6, 1, 'rgba(255,255,255,.18)');
        if (kind === 'medical') R(x, k + 2, sh + 3, 2, Math.max(1, bh - 3), 'rgba(200,40,40,.8)');
      }
    }
  },
});

// ---------------------------------------------------------------- underneath: the clinic going down (Tommi, 2026-10-22: a normal front room, the improvised room, then the cyber room)

/** Sacks, crates and drums of dry goods stacked against a cellar wall: rice, flour, cooking oil. */
export const drySacksElement = piece({
  type: 'interior.dt-dry-goods', label: 'Dry goods: sacks, crates, oil drums (kit)', category: 'props', libraryUse: 'reusable',
  fields: { width: num('Width', 60, 16, 300, 1, 'units'), sacks: num('Sacks', 6, 0, 30), crates: num('Crates', 3, 0, 12), drums: num('Oil drums', 1, 0, 6), print: select('Print on the sacks', ['red', 'blue', 'green']), seed: num('Seed', 1, 0, 1000000) },
  size: p => ({ w: Number(p.width), tall: 40 }),
  bounds: p => ({ x: 0, h: 40, w: Number(p.width), tall: 40 }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  paint(x, p) {
    const w = Number(p.width), r = rng(Number(p.seed) * 13 + 1), ink = p.print === 'blue' ? 'rgba(40,70,170,.8)' : p.print === 'green' ? 'rgba(40,120,60,.8)' : 'rgba(180,40,30,.8)';
    let at = 0;
    for (let k = 0; k < Number(p.drums) && at < w - 12; k++) { R(x, at, 0, 12, 20, pick(r, ['#2a5a8a', '#8a2a1a', '#d8b030'])); R(x, at, 6, 12, 1, 'rgba(0,0,0,.35)'); R(x, at, 14, 12, 1, 'rgba(0,0,0,.35)'); R(x, at + 1, 0, 2, 20, 'rgba(255,255,255,.18)'); at += 14; }
    for (let k = 0; k < Number(p.crates) && at < w - 14; k++) { const st = 1 + (k % 2); for (let j = 0; j < st; j++) { R(x, at, j * 11, 14, 10, '#6a4a2a'); R(x, at, j * 11 + 4, 14, 1, 'rgba(0,0,0,.35)'); R(x, at + 1, j * 11 + 9, 12, 1, 'rgba(255,220,170,.2)'); } at += 16; }
    const n = Number(p.sacks), per = Math.max(1, Math.ceil(n / 3));
    for (let k = 0; k < n; k++) { const row = Math.floor(k / per), col = k % per, sx = at + col * 12 + (row % 2) * 6, sh = row * 7; if (sx + 12 > w) continue; R(x, sx, sh, 12, 8, pick(r, ['#d8d0b8', '#ccc4a8', '#e0d8c0'])); R(x, sx + 1, sh + 7, 10, 1, 'rgba(0,0,0,.25)'); R(x, sx + 3, sh + 3, 6, 2, ink); }
  },
});

/** A bundle of cables: along the ceiling in sagging loops, ties every so often, then down the wall to the floor. */
export const cableRunElement = piece({
  type: 'interior.dt-cables', label: 'Cable bundles along a ceiling and down a wall (kit)', category: 'electronics', libraryUse: 'reusable',
  fields: {
    width: num('Width', 160, 20, 1200, 1, 'units'), height: num('Ceiling height', 90, 20, 400, 1, 'units'), cables: num('Cables', 6, 1, 20), sag: num('Sag', 10, 0, 40, 1, 'units'),
    drops: num('Drops to the floor', 2, 0, 10), colours: select('Colours', ['black', 'mixed', 'neon']), lit: num('Glowing cables', 0.2, 0, 1, 0.05), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.height), w: Number(p.width), tall: Number(p.height) }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), n = Number(p.cables), r = rng(Number(p.seed) * 41 + 9), sag = Number(p.sag);
    const cols = p.colours === 'black' ? ['16,16,18', '26,26,28', '36,34,32'] : p.colours === 'neon' ? ['0,230,255', '255,60,200', '20,20,24', '120,255,160'] : ['16,16,18', '170,40,30', '40,80,170', '200,180,60', '30,30,30'];
    x.save(); x.lineWidth = 1;
    for (let k = 0; k < n; k++) {
      const c = pick(r, cols), glow = r() < Number(p.lit), base = H - 3 - (k % 3), span = 30 + Math.round(r() * 40);
      x.strokeStyle = glow ? rgba(p.colours === 'neon' ? c : '0,230,255', 0.55 + 0.35 * Math.sin(o.t / 15 + k)) : rgba(c, 0.95);
      x.beginPath(); x.moveTo(0, y(base));
      for (let sx = 0; sx < w; sx += span) { const e = Math.min(w, sx + span); x.quadraticCurveTo((sx + e) / 2, y(base - sag * (0.5 + r() * 0.7)), e, y(base)); }
      x.stroke();
      if (glow) o.light?.(w / 2, base - sag / 2, w, 2, '0,230,255', 'screen');
    }
    for (let k = 20; k < w; k += 46) R(x, k, H - 6, 2, 6, '#5a5a56');
    for (let d = 0; d < Number(p.drops); d++) {
      const dx = Math.round(((d + 0.5) * w) / Number(p.drops)) + Math.round(r() * 10 - 5);
      for (let k = 0; k < 3; k++) { x.strokeStyle = rgba(pick(r, cols), 0.95); x.beginPath(); x.moveTo(dx + k * 2, y(H - 3)); x.bezierCurveTo(dx + k * 2 + 6, y(H * 0.6), dx + k * 2 - 6, y(H * 0.3), dx + k * 3 + 4, y(0)); x.stroke(); }
      R(x, dx - 1, 0, 12, 2, '#1a1a1a');
    }
    x.restore();
  },
});

const SCAN_KINDS = ['brain', 'body', 'spine', 'waveform'] as const;
/** A diagnostic screen: a brain scan with a slice moving through it, a body map with its implants marked, a spine, a waveform. */
export const diagnosticElement = piece({
  type: 'interior.dt-diagnostic', label: 'Diagnostic screen: brain scan, body map, waveform (kit)', category: 'electronics', libraryUse: 'reusable',
  fields: {
    kind: select('Shows', SCAN_KINDS), width: num('Width', 30, 12, 160, 1, 'units'), height: num('Height', 22, 8, 120, 1, 'units'), from: num('Bottom edge height', 40, 0, 300, 1, 'units'),
    mount: select('Mount', ['wall', 'arm from the ceiling', 'stand']), ceiling: num('Ceiling height (arm)', 90, 20, 400, 1, 'units'),
    colour: select('Colour', ['cyan', 'magenta', 'green', 'amber']), glitch: num('Glitch', 0.1, 0, 1, 0.05), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.from) + Number(p.height) }),
  bounds: p => { const tall = p.mount === 'arm from the ceiling' ? Number(p.ceiling) : Number(p.from) + Number(p.height); return { x: 0, h: tall, w: Number(p.width), tall }; },
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), f = Number(p.from), t = o.t, s = Number(p.seed), kind = String(p.kind);
    const col = p.colour === 'magenta' ? '255,60,200' : p.colour === 'green' ? '80,255,140' : p.colour === 'amber' ? '255,180,60' : '0,230,255';
    if (p.mount === 'arm from the ceiling') { const C = Number(p.ceiling); R(x, w / 2 - 1, f + H, 2, Math.max(0, C - f - H), '#4a4e52'); R(x, w / 2 - 4, C - 2, 8, 2, '#2a2c2e'); }
    else if (p.mount === 'stand') { R(x, w / 2 - 1, 0, 2, f, '#4a4e52'); R(x, w / 2 - 7, 0, 14, 2, '#2a2c2e'); }
    R(x, -1, f - 1, w + 2, H + 2, '#0a0b0c'); R(x, 0, f, w, H, '#03080a'); R(x, 0, f, w, H, rgba(col, 0.08));
    const cx = w / 2, cy = f + H / 2;
    x.save(); x.beginPath(); x.rect(0, y(f + H), w, H); x.clip();
    if (kind === 'brain') {
      const rx = Math.min(w * 0.2, H * 0.38), ry = H * 0.32, slice = (t / 3) % (rx * 2);
      for (const k of [-1, 1]) {
        const bx = cx + k * w * 0.24; x.lineWidth = 1; x.strokeStyle = rgba(col, 0.85); x.beginPath(); x.ellipse(bx, y(cy), rx, ry, 0, 0, Math.PI * 2); x.stroke();
        for (let j = 0; j < 4; j++) { x.strokeStyle = rgba(col, 0.35); x.beginPath(); x.ellipse(bx + Math.sin(j + s) * 1.5, y(cy + Math.cos(j * 2)), rx * (0.3 + j * 0.15), ry * (0.25 + j * 0.16), 0, 0, Math.PI * 2); x.stroke(); }
        R(x, bx - rx / 2 + Math.round(hash(s + k) * rx), cy - 1, 2, 2, 'rgba(255,60,200,.95)');
      }
      R(x, cx - w * 0.24 - rx + slice, f + 1, 1, H - 2, rgba(col, 0.7));
    } else if (kind === 'body' || kind === 'spine') {
      R(x, cx - 2, f + H - 7, 4, 4, rgba(col, 0.8)); R(x, cx - 3, f + H * 0.4, 6, H * 0.6 - 8, rgba(col, 0.55));
      if (kind === 'body') { R(x, cx - 6, f + H * 0.55, 3, H * 0.3, rgba(col, 0.45)); R(x, cx + 3, f + H * 0.55, 3, H * 0.3, rgba(col, 0.45)); R(x, cx - 3, f + 2, 2, H * 0.4, rgba(col, 0.45)); R(x, cx + 1, f + 2, 2, H * 0.4, rgba(col, 0.45)); }
      for (let k = 0; k < 6; k++) R(x, cx - 1, f + H * 0.42 + k * (H * 0.08), 2, 1, 'rgba(255,255,255,.7)');
      const mark = Math.floor(t / 30) % 3; R(x, cx - 2 + (mark - 1) * 3, f + H - 9 - mark * 4, 2, 2, 'rgba(255,60,200,.95)');
      for (let k = 0; k < 3; k++) R(x, 2, f + H - 4 - k * 3, Math.round(w * 0.25 * hash(s + k + Math.floor(t / 40))), 1, rgba(col, 0.6));
    } else {
      x.strokeStyle = rgba(col, 0.85); x.lineWidth = 1; x.beginPath();
      for (let k = 0; k <= w; k++) { const ph = (k + t * 0.6) % 24, v = ph > 10 && ph < 12 ? H * 0.35 : ph > 12 && ph < 13 ? -H * 0.2 : Math.sin(k / 3) * 1.2; if (k === 0) x.moveTo(k, y(cy + v)); else x.lineTo(k, y(cy + v)); }
      x.stroke();
    }
    for (let k = f + 1; k < f + H; k += 2) R(x, 0, k, w, 1, 'rgba(0,0,0,.25)');
    if (hash(Math.floor(t / 4) + s) < Number(p.glitch) * 0.3) R(x, 0, f + Math.round(hash(t) * H), w, 2, rgba(col, 0.5));
    x.restore();
    o.light?.(cx, cy, w, H, col, 'screen');
  },
});

/** A shelf of specimen jars: implants and grafts floating in tinted fluid, lit from below. */
export const jarShelfElement = piece({
  type: 'interior.dt-jars', label: 'Shelf of implant jars (kit: ripperdoc)', category: 'props', libraryUse: 'reusable',
  fields: { width: num('Width', 40, 10, 200, 1, 'units'), from: num('Shelf height', 46, 0, 200, 1, 'units'), jars: num('Jars', 5, 1, 20), fluid: select('Fluid', ['amber', 'cyan', 'green', 'magenta', 'mixed']), glow: num('Glow', 0.7, 0, 1, 0.05), seed: num('Seed', 1, 0, 1000000) },
  size: p => ({ w: Number(p.width), tall: Number(p.from) + 14 }),
  bounds: p => ({ x: 0, h: Number(p.from) + 14, w: Number(p.width), tall: 22 }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  paint(x, p, o) {
    const w = Number(p.width), f = Number(p.from), n = Number(p.jars), r = rng(Number(p.seed) * 23 + 3), g = Number(p.glow) * glowOf(o);
    const fl: Record<string, string> = { amber: '255,180,60', cyan: '0,230,255', green: '120,255,140', magenta: '255,60,200' };
    // a steel shelf on two brackets screwed to the wall
    R(x, 0, f - 2, w, 2, '#6a6e72'); R(x, 2, f - 8, 2, 6, '#3a3c3e'); R(x, w - 4, f - 8, 2, 6, '#3a3c3e');
    for (let k = 0; k < n; k++) {
      const jw = 6, jx = 2 + Math.round(((w - jw - 4) * k) / Math.max(1, n - 1)), jh = 8 + Math.round(r() * 4), c = p.fluid === 'mixed' ? pick(r, Object.values(fl)) : fl[String(p.fluid)];
      R(x, jx, f, jw, jh, rgba(c, 0.25 + 0.35 * g)); R(x, jx, f, 1, jh, 'rgba(255,255,255,.35)'); R(x, jx - 1, f + jh, jw + 2, 2, '#8a8e90');
      const bob = Math.round(Math.sin(o.t / 40 + k) * 0.8); R(x, jx + 2, f + 3 + bob, 2, 3, pick(r, ['rgba(220,220,210,.9)', 'rgba(200,120,110,.9)', 'rgba(60,60,64,.95)']));
      R(x, jx + 4, f + 2 + ((Math.floor(o.t / 6) + k) % (jh - 3)), 1, 1, 'rgba(255,255,255,.5)');
      if (g > 0) o.light?.(jx + 3, f + jh / 2, 6, jh, c, 'screen');
    }
  },
});

// ---------------------------------------------------------------- the cyber room

const STRIP: Record<string, string> = { cyan: '0,230,255', magenta: '255,50,200', white: '220,235,255', amber: '255,170,60' };
/** The clean room: black glass panels, LED strips in two colours, a lit grating floor, frosted cooling pipes on the ceiling. */
export const labRoomElement = piece({
  type: 'interior.dt-lab-room', label: 'Cyber lab room, cut open (kit: panels, LED strips, grating, cooling pipes)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 300, 40, 2000, 1, 'units'), height: num('Height (floor to ceiling)', 120, 40, 400, 1, 'units'), panel: colour('Panel colour', '#0c0e14'),
    stripA: select('Strip colour A', Object.keys(STRIP)), stripB: select('Strip colour B', ['magenta', 'cyan', 'white', 'amber']),
    strips: num('LED strips', 3, 0, 8), grating: bool('Lit grating floor', true), pipes: num('Cooling pipes on the ceiling', 3, 0, 8), frost: num('Frost on the pipes', 0.5, 0, 1, 0.05),
    cut: select('Cut wall (section)', ['none', 'left', 'right', 'both']), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.height), w: Number(p.width), tall: Number(p.height) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, ceiling: { x: 0, h: Number(p.height), role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), t = o.t, A = STRIP[String(p.stripA)] ?? STRIP.cyan, B = STRIP[String(p.stripB)] ?? STRIP.magenta;
    R(x, 0, 0, w, H, hexOr(p.panel, '#0c0e14'));
    for (let k = 0; k < w; k += 24) { R(x, k, 0, 1, H, 'rgba(255,255,255,.06)'); R(x, k + 1, 0, 1, H, 'rgba(0,0,0,.4)'); }
    for (let h = 30; h < H; h += 30) R(x, 0, h, w, 1, 'rgba(255,255,255,.05)');
    const g = x.createLinearGradient(0, y(H), 0, 0); g.addColorStop(0, rgba(B, 0.16)); g.addColorStop(1, rgba(A, 0.16)); x.fillStyle = g; x.fillRect(0, y(H), w, H);
    const n = Number(p.strips);
    for (let k = 0; k < n; k++) { const sh = Math.round(H * (n === 1 ? 0.5 : 0.18 + (0.55 * k) / (n - 1))), c = k % 2 ? B : A, pulse = 0.75 + 0.25 * Math.sin(t / 30 + k); R(x, 0, sh, w, 1, rgba(c, 0.85 * pulse)); R(x, 0, sh - 1, w, 3, rgba(c, 0.14 * pulse)); o.light?.(w / 2, sh, w, 2, c, 'screen'); }
    for (let k = 0; k < Number(p.pipes); k++) {
      const ph = H - 7 - k * 5; R(x, 0, ph, w, 4, '#5a6470'); R(x, 0, ph + 3, w, 1, 'rgba(255,255,255,.25)');
      if (Number(p.frost) > 0) for (let j = 6 + k * 9; j < w; j += 17) R(x, j, ph - 1, 6, 1, rgba('220,240,255', 0.5 * Number(p.frost)));
      for (let j = 30 + k * 13; j < w; j += 70) R(x, j, ph - 1, 3, 6, '#2a2e34');
    }
    if (p.grating !== false) { R(x, 0, 0, w, 4, '#14181e'); for (let k = 0; k < w; k += 3) R(x, k, 0, 1, 4, rgba(A, 0.25 + 0.15 * Math.sin(k / 9 + t / 20))); R(x, 0, 4, w, 1, rgba(A, 0.6)); }
    else R(x, 0, 0, w, 3, '#1a1c22');
    const cut = String(p.cut);
    for (const side of ['left', 'right'] as const) if (cut === side || cut === 'both') { const cx = side === 'left' ? 0 : w - 6; R(x, cx, 0, 6, H, '#2a2c30'); R(x, side === 'left' ? cx + 5 : cx, 0, 1, H, rgba(A, 0.5)); }
  },
});

/** The surgical rig: a ceiling gantry with a carriage and articulated arms (laser, drill, suture, manipulator) over the cradle. */
export const surgicalGantryElement = piece({
  type: 'interior.dt-surgical-gantry', label: 'Surgical rig on a ceiling gantry, articulated arms (kit)', category: 'machinery', libraryUse: 'reusable',
  fields: {
    width: num('Rail length', 120, 30, 600, 1, 'units'), ceiling: num('Ceiling height', 120, 50, 400, 1, 'units'), reach: num('Arm reach down', 60, 10, 300, 1, 'units'),
    arms: num('Arms', 4, 1, 6), active: num('Working', 1, 0, 1, 0.05), laser: select('Laser colour', ['magenta', 'cyan', 'red']), body: colour('Body colour', '#c8ccd2'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.ceiling) }),
  bounds: p => ({ x: 0, h: Number(p.ceiling), w: Number(p.width), tall: Number(p.reach) + 20 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, tip: { x: Number(p.width) / 2, h: Number(p.ceiling) - Number(p.reach), role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), C = Number(p.ceiling), reach = Number(p.reach), n = Number(p.arms), act = Number(p.active), t = o.t, body = hexOr(p.body, '#c8ccd2');
    const lc = p.laser === 'cyan' ? '0,230,255' : p.laser === 'red' ? '255,40,40' : '255,50,200';
    R(x, 0, C - 8, w, 5, '#2a2e34'); R(x, 0, C - 4, w, 1, 'rgba(255,255,255,.25)'); for (let k = 4; k < w; k += 40) R(x, k, C - 3, 3, 3, '#1a1c20');
    const cx = Math.round(w / 2 + Math.sin(t / 120) * w * 0.12 * act);
    R(x, cx - 18, C - 16, 36, 9, body); R(x, cx - 18, C - 8, 36, 1, 'rgba(0,0,0,.4)'); R(x, cx - 16, C - 13, 4, 2, rgba('0,230,255', 0.9)); R(x, cx + 12, C - 13, 3, 2, rgba(lc, 0.6 + 0.4 * Math.sin(t / 7)));
    for (let k = 0; k < n; k++) {
      const sx = cx - 14 + Math.round((28 * k) / Math.max(1, n - 1)), side = k < n / 2 ? -1 : 1, ph = t / (40 + k * 7) + k;
      const ex = sx + side * (10 + Math.sin(ph) * 3 * act), eh = C - 16 - reach * 0.45;
      const tx = Math.round(w / 2 + side * (4 + k * 2) + Math.sin(ph * 1.3) * 2 * act), th = C - 16 - reach + Math.round(Math.abs(Math.sin(ph)) * 4 * act);
      x.save(); x.strokeStyle = body; x.lineWidth = 3; x.lineCap = 'round'; x.beginPath(); x.moveTo(sx, y(C - 16)); x.lineTo(ex, y(eh)); x.lineTo(tx, y(th + 5)); x.stroke();
      x.strokeStyle = '#3a3e44'; x.lineWidth = 1; x.beginPath(); x.moveTo(sx + 1, y(C - 16)); x.lineTo(ex + 1, y(eh)); x.lineTo(tx + 1, y(th + 5)); x.stroke(); x.restore();
      R(x, ex - 2, eh - 2, 4, 4, '#3a3e44'); R(x, ex - 1, eh - 1, 2, 2, rgba('0,230,255', 0.85));
      R(x, tx - 1, th, 3, 5, '#e8ecf0');
      if (k === 0 && act > 0 && Math.sin(t / 9) > 0) { R(x, tx, th - 10, 1, 10, rgba(lc, 0.9)); R(x, tx - 1, th - 11, 3, 2, 'rgba(255,255,255,.95)'); o.light?.(tx, th - 10, 6, 6, lc, 'screen'); }
    }
  },
});

/** Racks of neural hardware: glowing modules in rows, status lights chasing, coolant lines up into the ceiling. */
export const neuralRackElement = piece({
  type: 'interior.dt-neural-rack', label: 'Racks of glowing neural hardware (kit)', category: 'electronics', libraryUse: 'reusable',
  fields: {
    racks: num('Racks', 2, 1, 8), height: num('Height', 90, 30, 300, 1, 'units'), colour: select('Module light', ['cyan', 'magenta', 'mixed', 'amber']),
    glass: bool('Glass doors', true), coolant: bool('Coolant lines to the ceiling', true), ceiling: num('Ceiling height (coolant)', 120, 30, 400, 1, 'units'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.racks) * 26, tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.ceiling), w: Number(p.racks) * 26, tall: Number(p.ceiling) }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  paint(x, p, o) {
    const n = Number(p.racks), H = Number(p.height), t = o.t, s = Number(p.seed), r = rng(s * 17 + 1);
    const cols = p.colour === 'cyan' ? ['0,230,255'] : p.colour === 'magenta' ? ['255,50,200'] : p.colour === 'amber' ? ['255,170,60'] : ['0,230,255', '255,50,200'];
    for (let k = 0; k < n; k++) {
      const l = k * 26; R(x, l, 0, 24, H, '#08090c'); R(x, l, H - 1, 24, 1, 'rgba(255,255,255,.25)'); R(x, l, 0, 1, H, 'rgba(255,255,255,.12)');
      for (let u = 6; u < H - 8; u += 7) {
        const c = pick(r, cols), on = hash(s + k * 31 + u) < 0.85;
        R(x, l + 3, u, 18, 5, '#15181e'); if (on) { R(x, l + 4, u + 1, 10, 3, rgba(c, 0.35 + 0.25 * Math.sin(t / 20 + u + k))); R(x, l + 4, u + 2, 10, 1, rgba(c, 0.85)); }
        R(x, l + 16 + ((Math.floor(t / 5) + u + k) % 4), u + 2, 1, 1, 'rgba(120,255,160,.95)');
      }
      if (p.glass !== false) { R(x, l + 1, 2, 22, H - 4, 'rgba(160,200,230,.06)'); x.strokeStyle = 'rgba(200,230,255,.15)'; x.lineWidth = 1; x.beginPath(); x.moveTo(l + 4, y(8)); x.lineTo(l + 12, y(H - 8)); x.stroke(); }
      o.light?.(l + 12, H / 2, 20, H - 10, cols[k % cols.length], 'screen');
      if (p.coolant !== false) { const C = Number(p.ceiling); R(x, l + 5, H, 3, Math.max(0, C - H), '#4a6a8a'); R(x, l + 15, H, 3, Math.max(0, C - H), '#8a4a6a'); R(x, l + 5, H, 3, 1, 'rgba(220,240,255,.6)'); }
    }
  },
});

/** The transfer cradle: a padded couch under a halo ring, a crown of contacts on a thick cable loom, a glass lid raised. */
export const transferCradleElement = piece({
  type: 'interior.dt-transfer-cradle', label: 'Mind-transfer cradle (kit)', category: 'machinery', libraryUse: 'reusable',
  fields: {
    length: num('Length', 60, 40, 140, 1, 'units'), ring: bool('Halo ring', true), lid: num('Lid open', 0.7, 0, 1, 0.05), glow: select('Glow', ['cyan', 'magenta']),
    active: num('Transfer running', 0.5, 0, 1, 0.05), loom: num('Cable loom to the left', 40, 0, 300, 1, 'units'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.length), tall: 50 }),
  bounds: p => ({ x: -Number(p.loom), h: 56, w: Number(p.length) + Number(p.loom), tall: 56 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, bed: { x: Number(p.length) / 2, h: 20, role: 'surface' } }),
  paint(x, p, o) {
    const L = Number(p.length), t = o.t, act = Number(p.active), c = p.glow === 'magenta' ? '255,50,200' : '0,230,255', c2 = p.glow === 'magenta' ? '0,230,255' : '255,50,200';
    R(x, 6, 0, L - 12, 12, '#1a1c22'); R(x, 6, 11, L - 12, 1, 'rgba(255,255,255,.2)'); R(x, 8, 1, L - 16, 2, rgba(c, 0.75)); o.light?.(L / 2, 2, L - 16, 2, c, 'screen');
    R(x, 2, 12, L - 4, 6, '#d8dce2'); R(x, 4, 18, L - 8, 3, '#2a3a4a'); R(x, L - 14, 21, 10, 3, '#2a3a4a');
    const hx = L - 6; R(x, hx - 6, 20, 12, 10, '#3a3e44'); for (let k = 0; k < 5; k++) R(x, hx - 5 + k * 2, 28, 1, 4, rgba(c, 0.5 + 0.5 * Math.sin(t / 6 + k)));
    x.save(); x.lineWidth = 2; for (let k = 0; k < 4; k++) { x.strokeStyle = k % 2 ? '#14161a' : rgba(c2, 0.65); x.beginPath(); x.moveTo(hx - 4 + k * 2, y(22)); x.bezierCurveTo(hx + 10, y(10 - k), -Number(p.loom) * 0.4, y(40 + k * 3), -Number(p.loom), y(0)); x.stroke(); } x.restore();
    const lid = Number(p.lid); x.save(); x.translate(4, y(21)); x.rotate(-lid * 1.1); x.fillStyle = rgba('180,220,255', 0.16); x.fillRect(0, -6, L - 8, 6); x.fillStyle = 'rgba(220,240,255,.5)'; x.fillRect(0, -6, L - 8, 1); x.restore();
    if (p.ring !== false) {
      const rx = Math.round(L * 0.62), rh = 32, sp = t / 10;
      R(x, rx - 2, 0, 4, rh - 20, '#2a2e34');
      x.save(); x.strokeStyle = '#2a2e34'; x.lineWidth = 4; x.beginPath(); x.ellipse(rx, y(rh), 5, 20, 0, 0, Math.PI * 2); x.stroke();
      x.strokeStyle = rgba(c, 0.5 + 0.5 * act); x.lineWidth = 1; x.beginPath(); x.ellipse(rx, y(rh), 5, 20, 0, 0, Math.PI * 2); x.stroke(); x.restore();
      for (let k = 0; k < 3; k++) { const a = sp + k * 2.1; R(x, rx + Math.round(Math.cos(a) * 4), rh + Math.round(Math.sin(a) * 19), 2, 2, 'rgba(255,255,255,.95)'); }
      if (act > 0) { x.fillStyle = rgba(c, 0.14 * act); x.fillRect(rx - 4, y(rh + 18), 8, 36); o.light?.(rx, rh, 10, 40, c, 'screen'); }
    }
  },
});

/** A charging frame: a steel cage with clamps holding a robot body off the floor, a charge bar, the umbilical. Place the body (a DLV-9) in it. */
export const robotFrameElement = piece({
  type: 'interior.dt-robot-frame', label: 'Charging frame for a robot body (kit; put a DLV-9 in it)', category: 'machinery', libraryUse: 'reusable',
  fields: {
    width: num('Width', 34, 16, 120, 1, 'units'), height: num('Height', 56, 20, 200, 1, 'units'), lift: num('Body held at', 18, 0, 120, 1, 'units'),
    charge: num('Charge', 0.6, 0, 1, 0.05), status: select('Status light', ['cyan', 'amber', 'magenta', 'green']), label: text('Plate (empty: none)', 'DLV-9'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.height) + 12, w: Number(p.width), tall: Number(p.height) + 12 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, body: { x: Number(p.width) / 2, h: Number(p.lift), role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), H = Number(p.height), lift = Number(p.lift), t = o.t, sc = p.status === 'amber' ? '255,170,60' : p.status === 'magenta' ? '255,50,200' : p.status === 'green' ? '80,255,140' : '0,230,255';
    R(x, 0, 0, w, 3, '#2a2e34'); R(x, 0, 0, 3, H, '#4a4e54'); R(x, w - 3, 0, 3, H, '#4a4e54'); R(x, 0, H - 4, w, 4, '#4a4e54'); R(x, 1, 0, 1, H, 'rgba(255,255,255,.25)');
    R(x, 0, 2, w, 1, rgba(sc, 0.6));
    R(x, 3, lift - 1, 7, 3, '#8a8e94'); R(x, w - 10, lift - 1, 7, 3, '#8a8e94'); R(x, 3, lift + 12, 6, 2, '#8a8e94'); R(x, w - 9, lift + 12, 6, 2, '#8a8e94');
    x.save(); x.strokeStyle = '#14161a'; x.lineWidth = 2; x.beginPath(); x.moveTo(w / 2, y(H - 4)); x.bezierCurveTo(w / 2 + 6, y(H - 14), w / 2 - 6, y(lift + 24), w / 2 + 2, y(lift + 14)); x.stroke(); x.restore();
    const ch = Math.round((H - 12) * Number(p.charge)); R(x, w - 2, 4, 1, H - 12, 'rgba(0,0,0,.6)'); R(x, w - 2, 4, 1, ch, rgba(sc, 0.6 + 0.4 * Math.sin(t / 25)));
    o.light?.(w / 2, H - 4, w, 2, sc, 'screen');
    const lb = String(p.label ?? ''); if (lb) label(x, o, w / 2, H + 6, lb, 'board', 6);
  },
});

/** Cold fog rolling along a floor, thickest at the foot, drifting. */
export const floorFogElement = piece({
  type: 'interior.dt-fog', label: 'Floor fog (kit)', category: 'atmosphere', libraryUse: 'reusable',
  fields: { width: num('Width', 300, 20, 2000, 1, 'units'), depth: num('Depth', 18, 4, 80, 1, 'units'), density: num('Density', 0.5, 0, 1, 0.05), colour: select('Colour', ['cyan', 'magenta', 'white']), seed: num('Seed', 1, 0, 1000000) },
  size: p => ({ w: Number(p.width), tall: Number(p.depth) }),
  bounds: p => ({ x: 0, h: Number(p.depth), w: Number(p.width), tall: Number(p.depth) }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  paint(x, p, o) {
    const w = Number(p.width), D = Number(p.depth), a = Number(p.density), s = Number(p.seed), c = p.colour === 'magenta' ? '255,140,230' : p.colour === 'white' ? '230,236,245' : '170,235,255';
    x.save(); x.beginPath(); x.rect(0, y(D + 8), w, D + 8); x.clip();
    const g = x.createLinearGradient(0, y(D), 0, 0); g.addColorStop(0, rgba(c, 0)); g.addColorStop(1, rgba(c, 0.24 * a)); x.fillStyle = g; x.fillRect(0, y(D), w, D);
    for (let k = 0; k < Math.round(w / 14); k++) {
      const bx = ((k * 37 + hash(s + k) * 200 + o.t * (0.08 + hash(k) * 0.1)) % (w + 40)) - 20, bh = 2 + Math.round(hash(s * 3 + k) * D * 0.6), bw = 18 + Math.round(hash(k + s) * 26);
      x.fillStyle = rgba(c, 0.08 * a); x.beginPath(); x.ellipse(bx, y(bh), bw / 2, 3 + bh / 4, 0, 0, Math.PI * 2); x.fill();
    }
    x.restore();
  },
});

// ---------------------------------------------------------------- Moth's empty hideout (Act I step 10, 2026-10-22: Moth is gone, the monitors are still on)

/** A wall of pinned paper: printouts, photos, a map of the block, red string between pins; a long list with names struck out. */
export const pinWallElement = piece({
  type: 'interior.dt-pinwall', label: 'Pinned wall: printouts, photos, a map, red string (kit: Moth’s hideout)', category: 'props', libraryUse: 'reusable',
  fields: {
    width: num('Width', 44, 16, 300, 1, 'units'), height: num('Height', 30, 10, 200, 1, 'units'), from: num('Bottom edge height', 24, 0, 200, 1, 'units'),
    sheets: num('Sheets and photos', 9, 0, 40), strings: num('Red strings', 5, 0, 30), map: bool('Map of the block', true), list: bool('A long list, names struck out', true),
    gaps: num('Pins left where sheets were taken', 3, 0, 20), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.from) + Number(p.height) }),
  bounds: p => ({ x: 0, h: Number(p.from) + Number(p.height), w: Number(p.width), tall: Number(p.from) + Number(p.height) }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  paint(x, p) {
    const w = Number(p.width), H = Number(p.height), f = Number(p.from), s = Number(p.seed), r = rng(s * 71 + 3);
    const pins: [number, number][] = [];
    if (p.map !== false) {
      const mw = Math.min(20, Math.round(w * 0.45)), mh = Math.min(16, H - 4), ml = Math.round(w - mw - 2), mb = f + H - mh - 2;
      R(x, ml, mb, mw, mh, 'rgba(220,214,190,.85)');
      for (let k = 3; k < mw; k += 5) R(x, ml + k, mb, 1, mh, 'rgba(90,80,60,.4)'); for (let k = 3; k < mh; k += 4) R(x, ml, mb + k, mw, 1, 'rgba(90,80,60,.4)');
      R(x, ml + Math.round(mw * 0.6), mb + Math.round(mh * 0.4), 2, 2, 'rgba(200,30,30,.95)'); pins.push([ml + Math.round(mw * 0.6) + 1, mb + Math.round(mh * 0.4) + 1]);
    }
    if (p.list !== false) {
      const ll = 2, lw = 9, lh = Math.min(H - 2, 26);
      R(x, ll, f + H - lh - 1, lw, lh, 'rgba(232,228,214,.9)');
      for (let k = f + H - 4; k > f + H - lh; k -= 2) { R(x, ll + 1, k, lw - 2 - Math.round(r() * 3), 1, 'rgba(40,36,30,.5)'); if (r() < 0.35) R(x, ll, k, lw, 1, 'rgba(200,30,30,.75)'); }
      pins.push([ll + 4, f + H - 2]);
    }
    for (let k = 0; k < Number(p.sheets); k++) {
      const photo = r() < 0.4, sw = photo ? 6 : 7 + Math.round(r() * 4), st = photo ? 7 : 8 + Math.round(r() * 4);
      const sl = 12 + Math.round(r() * Math.max(0, w - sw - 14)), sb = f + 1 + Math.round(r() * Math.max(0, H - st - 2));
      if (photo) { R(x, sl, sb, sw, st, 'rgba(240,238,230,.9)'); R(x, sl + 1, sb + 2, sw - 2, st - 3, pick(r, ['rgba(90,110,130,.9)', 'rgba(120,90,80,.9)', 'rgba(70,80,70,.9)'])); }
      else sheet(x, sl, sb, sw, st, s + k * 3, r() < 0.25, 0.8);
      pins.push([sl + Math.round(sw / 2), sb + st - 1]);
    }
    for (const [px, ph] of pins) R(x, px, ph, 1, 1, pick(r, ['rgba(220,40,40,1)', 'rgba(240,200,60,1)', 'rgba(60,120,220,1)']));
    for (let k = 0; k < Number(p.gaps); k++) { const gx = 12 + Math.round(r() * Math.max(1, w - 16)), gh = f + 2 + Math.round(r() * Math.max(1, H - 4)); R(x, gx, gh, 1, 1, 'rgba(220,40,40,1)'); R(x, gx - 1, gh - 1, 3, 1, 'rgba(240,236,220,.35)'); }
    if (pins.length > 1) {
      x.save(); x.strokeStyle = 'rgba(200,30,30,.8)'; x.lineWidth = 0.6; x.beginPath();
      for (let k = 0; k < Number(p.strings); k++) { const a = pins[Math.floor(r() * pins.length)], b = pins[Math.floor(r() * pins.length)]; if (a === b) continue; x.moveTo(a[0] + 0.5, y(a[1]) + 0.5); x.lineTo(b[0] + 0.5, y(b[1]) + 0.5); }
      x.stroke(); x.restore();
    }
  },
});

/** What someone leaves when they go in a hurry: a chair pushed back, papers on the floor, a cold mug, a clean patch where a bag stood, an empty bowl. */
export const leftBehindElement = piece({
  type: 'interior.dt-left-behind', label: 'Left in a hurry: chair, papers, mug, the patch where a bag stood (kit)', category: 'props', libraryUse: 'reusable',
  fields: {
    width: num('Width', 60, 20, 300, 1, 'units'), chair: select('Chair', ['pushed back', 'tipped over', 'none'], 'pushed back'), chairAt: num('Chair from the left', 8, 0, 300, 1, 'units'),
    papers: num('Papers on the floor', 7, 0, 40), mug: bool('Mug left on the floor', true), boxes: num('Takeaway boxes', 2, 0, 10),
    bag: num('Clean patch where a bag stood, from the left (-1: none)', 40, -1, 300, 1, 'units'), bowl: bool('Pet bowl, empty', true), drawer: bool('A crate tipped out', true), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: 20 }),
  bounds: p => ({ x: 0, h: 20, w: Number(p.width), tall: 20 }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  paint(x, p) {
    const w = Number(p.width), r = rng(Number(p.seed) * 43 + 9), bag = Number(p.bag);
    // dust on the floor, and the clean rectangle where something stood until today
    R(x, 0, 0, w, 1, 'rgba(150,140,120,.18)');
    if (bag >= 0) { R(x, bag, 0, 14, 1, 'rgba(60,50,40,.9)'); R(x, bag, 1, 14, 1, 'rgba(200,190,170,.12)'); }
    if (p.drawer !== false) { const dx = Math.min(w - 16, Math.round(w * 0.55)); R(x, dx, 0, 12, 8, '#4a3a2a'); R(x, dx, 7, 12, 1, 'rgba(255,220,170,.2)'); R(x, dx + 1, 8, 10, 1, '#3a2a1a'); for (let k = 0; k < 4; k++) R(x, dx + 13 + k * 3, 0, 2, 1 + (k % 2), pick(r, ['#c8c0a8', '#8a9aa8', '#a83a2a'])); }
    for (let k = 0; k < Number(p.papers); k++) { const px = Math.round(r() * (w - 6)); R(x, px, 0, 5 + Math.round(r() * 3), 1, 'rgba(225,220,205,.85)'); if (r() < 0.4) R(x, px + 1, 1, 4, 1, 'rgba(225,220,205,.6)'); }
    for (let k = 0; k < Number(p.boxes); k++) { const bx = Math.round(r() * (w - 6)); R(x, bx, 0, 5, 4, '#e8e2d0'); R(x, bx, 3, 5, 1, 'rgba(200,40,30,.8)'); R(x, bx + 1, 4, 3, 1, '#d8d2c0'); }
    if (p.mug !== false) { const mx = Math.round(w * 0.3); R(x, mx, 0, 4, 5, '#c8c4b8'); R(x, mx + 4, 1, 1, 3, '#c8c4b8'); R(x, mx + 1, 4, 2, 1, '#3a2614'); }
    if (p.bowl !== false) { const bx = w - 9; R(x, bx, 0, 8, 2, '#a83a2a'); R(x, bx + 1, 2, 6, 1, '#c84a3a'); }
    const ch = String(p.chair), cx = Number(p.chairAt);
    if (ch === 'pushed back') { R(x, cx + 5, 2, 2, 9, '#2a2f33'); R(x, cx, 0, 12, 2, '#1f2326'); R(x, cx, 11, 12, 3, '#3a3f44'); R(x, cx - 1, 13, 3, 13, '#3a3f44'); }
    else if (ch === 'tipped over') { R(x, cx, 0, 14, 3, '#3a3f44'); R(x, cx + 14, 0, 3, 10, '#3a3f44'); R(x, cx + 3, 3, 2, 4, '#2a2f33'); R(x, cx + 9, 3, 2, 4, '#2a2f33'); }
  },
});

export const downtownHomeInteriors: Element[] = [dtRoomElement, conciergeElement, mailboxesElement, noticeBoardElement, fireExitElement, serviceLatchElement,
  microFlatElement, flatDoorElement, bikeElement, skylightElement, courtyardElement, areawayElement, parcelElement, servicePlantElement,
  noodleKitchenElement, docChairElement, partsFridgeElement, privacyScreenElement, cotElement, stockShelvesElement,
  drySacksElement, cableRunElement, diagnosticElement, jarShelfElement, labRoomElement, surgicalGantryElement, neuralRackElement, transferCradleElement, robotFrameElement, floorFogElement,
  pinWallElement, leftBehindElement];
