/**
 * The glide's near coast (glide.ts), east of the city: ONE ground line from the title's beach to
 * the Galleria's plaza (town.ts takes over at Downtown's street). The strip under it changes material
 * but never its height, and each change is bridged by a piece that belongs to both sides.
 *
 * Second pass (Tommi, 2026-10-15): leisure and industry never touch. The beach and its pier end at
 * rocks; an INLET of open water (a footbridge over it, the breakwater with its light out in the
 * bay) separates them from the port's fenced BUFFER (gravel, a double fence with its signs and
 * cameras, the staff gate); only then the quay. Ships lie behind the quay's edge, never in front of
 * a crane. The public road starts at the port's TRUCK GATE at the quay's west end (traffic.ts), so
 * nothing drives on the pier or the quay but the port's own machines. Everything is true to one
 * scale (the player 1.8 m; vehicles.ts `M`): the scenes' sets at a third (`S`), the cranes at
 * `CRANE` (their frames are drawn small in the scenes), boxes 12 m.
 *
 * Units: view units (glide.ts), X west of the title's middle (screen x = `sx(X)`), heights from the
 * ground line `GY` down the strip (`lines`). A pure function of the view: everything moves by the
 * frame clock `f` and the glide's clock `gt` (sudo can seek either).
 */

import { drawCharacter, type Character } from '../characters';
import { sign, text } from '../scenes/kit';
import { drawBonfire, drawDjBooth, drawLounger } from '../sets/beach-party';
import { drawStringLights, saltBack, saltCounter, saltLights, saltLime, saltShell, saltUnder } from '../sets/beach-bar';
import { BOX20, BOX40, container, PAL, stack, type Crate } from '../sets/containers';
import { drawGantry, GANTRIES, type Gantry } from '../sets/crane';
import { drawGalleriaDome } from '../sets/galleria-dome';
import { drawPalm } from '../sets/palm';
import { drawCar, drawForklift, drawReachStacker, drawStraddle, drawTruck } from '../sets/vehicles';
import { drawCraft } from '../sets/air-traffic';
import { frameView, placed } from '../sets/view';
import { PLACES } from './path';

/** The scenes' sets at the near coast: a third of their size (the player, 48, is 16 view units). */
export const S = 1 / 3;
/** The cranes' frames at the coast: their scene frames are small (legs 8.7 m), so 1.7× the scenes' scale makes them port cranes beside 12 m boxes. */
export const CRANE = S * 1.7;

export interface CoastView {
  W: number; H: number; GY: number; hz: number;
  /** The camera (west), the frame clock, title seconds, glide seconds. */
  g: number; f: number; t: number; gt: number;
  still: boolean;
  /** Dawn's warmth (0 night), how far into the city, the rain. */
  warm: number; city: number; rain: number;
  sx: (X: number) => number;
  sunX: number;
}

export const PAPER = '255,217,165', ORANGE = '255,136,0', RED = '255,42,68', DAWN = '255,150,90';
export const R = Math.round;
export const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
export const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const hex = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
export const mixHex = (a: string, b: string, f: number) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => R(lerp(v, B[i], f)).toString(16).padStart(2, '0')).join(''); };
const HIVIS = { garb: 'hivis' as const, hair: 'helmet' as const, acc: '#e8c020' };

/** The strip's lines (heights below the ground line scale with the strip's depth). */
export function lines(c: CoastView) {
  const band = c.H - c.GY, k = band / 35;
  return { k, BACK: c.GY + R(3 * k), MID: c.GY + R(14 * k), BEACH: c.GY + R(19 * k), PIER: c.GY - R(14 * k), ROAD0: c.GY + R(18 * k), ROAD1: c.GY + R(30 * k), FAR_LANE: c.GY + R(24 * k), NEAR_LANE: c.GY + R(30 * k) };
}
export type Lines = ReturnType<typeof lines>;
type Line = 'back' | 'mid' | 'beach' | 'pier' | 'shallows' | 'terrace' | 'rocks' | 'bridge';
const lineY = (L: Lines, c: CoastView, l: Line) => l === 'back' ? L.BACK : l === 'mid' ? L.MID : l === 'beach' ? L.BEACH : l === 'pier' ? L.PIER : l === 'terrace' ? L.BACK - 58 : l === 'rocks' ? c.GY + 2 : l === 'bridge' ? L.MID - 2 : c.GY + 4;

/** Is the stretch X0..X1 (either order) on screen? */
export const seen = (c: CoastView, X0: number, X1: number, pad = 20) => { const a = c.sx(Math.max(X0, X1)), b = c.sx(Math.min(X0, X1)); return b > -pad && a < c.W + pad; };

// ---------- who is where (laid out once: characters.ts keys its looks on these objects) ----------

interface Who { X: number; line: Line; c: Character }
const P = (X: number, line: Line, c: Partial<Character>): Who => ({ X, line, c: { x: 0, ...c } });
const PEOPLE: Who[] = [
  // the bar: two at the counter, dancers under the string lights, the bonfire's circle
  P(147, 'beach', { seed: 4101, look: { body: 'tall', garb: 'tee', hair: 'long' }, act: 'lean', facing: 1 }),
  P(133, 'beach', { seed: 4102, look: { body: 'avg', garb: 'dress', hair: 'bun' }, act: 'stand', facing: -1 }),
  P(82, 'beach', { seed: 4103, look: { garb: 'tee', hair: 'mohawk' }, act: 'dance' }),
  P(70, 'beach', { seed: 4104, look: { garb: 'dress', hair: 'long', extras: ['headphones'] }, act: 'dance', facing: -1 }),
  P(58, 'beach', { seed: 4105, look: { body: 'wide', garb: 'jacket', hair: 'cap' }, act: 'dance' }),
  P(46, 'beach', { seed: 4106, look: { body: 'slim', garb: 'tee', hair: 'short', extras: ['visor'] }, act: 'dance', facing: -1 }),
  P(34, 'beach', { seed: 4107, look: { body: 'short', garb: 'robe', hair: 'scarf' }, act: 'dance' }),
  P(20, 'beach', { seed: 4108, look: { garb: 'jacket', hair: 'beanie', extras: ['phone'] }, act: 'phone', facing: -1 }),
  P(-20, 'beach', { seed: 4111, look: { body: 'avg', garb: 'tee', hair: 'long' }, act: 'sit', facing: -1 }),
  P(-31, 'beach', { seed: 4112, look: { body: 'tall', garb: 'jacket', hair: 'brim' }, act: 'smoke', facing: -1 }),
  P(-56, 'beach', { seed: 4113, look: { body: 'kid', garb: 'tee', hair: 'cap' }, act: 'dance' }),
  P(-66, 'beach', { seed: 4114, look: { body: 'old', garb: 'coat', hair: 'bald' }, act: 'sit', facing: 1 }),
  P(-112, 'beach', { seed: 4115, look: { body: 'slim', garb: 'dress', hair: 'long', extras: ['glasses'] }, act: 'sleep', h: 10 }),
  P(-175, 'beach', { seed: 4116, look: { body: 'avg', garb: 'tee', hair: 'short' }, act: 'walk', range: [-120, 140], speed: 0.25 }),
  // two in the shallows, against the sun
  P(-118, 'shallows', { seed: 4117, look: { garb: 'dress', hair: 'long' }, act: 'stand', facing: 1, dim: 0.5 }),
  P(-138, 'shallows', { seed: 4118, look: { garb: 'tee', hair: 'short' }, act: 'phone', facing: -1, dim: 0.5 }),
  // further along the sand toward the pier, and past it
  P(300, 'beach', { seed: 4121, look: { garb: 'coat', hair: 'hood' }, act: 'walk', range: [-150, 150], speed: 0.3 }),
  P(312, 'beach', { seed: 4122, look: { garb: 'tee', hair: 'bun', extras: ['bag'] }, act: 'walk', range: [-150, 150], speed: 0.3 }),
  P(380, 'beach', { look: { bot: 'litterbot', paint: '#c8641e' }, act: 'roll', range: [-120, 120] }),
  P(560, 'beach', { seed: 4123, look: { body: 'kid', garb: 'tee', hair: 'short' }, act: 'walk', range: [-60, 90], speed: 0.6 }),
  P(612, 'beach', { look: 'gull', act: 'walk', range: [-30, 30] }),
  P(700, 'beach', { seed: 4124, look: { body: 'old', garb: 'jacket', hair: 'cap' }, act: 'sit', facing: 1, h: 4 }),
  // on the pier: black against the sun; a fisher at the end
  P(452, 'pier', { seed: 4131, look: { garb: 'coat', hair: 'long' }, act: 'stand', facing: -1, dim: 0.93 }),
  P(459, 'pier', { seed: 4132, look: { garb: 'jacket', hair: 'short' }, act: 'stand', facing: 1, dim: 0.93 }),
  P(520, 'pier', { seed: 4133, look: { garb: 'dress', hair: 'bun' }, act: 'dance', dim: 0.93 }),
  P(531, 'pier', { seed: 4134, look: { garb: 'tee', hair: 'cap' }, act: 'dance', facing: -1, dim: 0.93 }),
  P(590, 'pier', { seed: 4136, look: { garb: 'jacket', hair: 'hood' }, act: 'phone', dim: 0.93 }),
  P(628, 'pier', { seed: 4137, look: { body: 'old', garb: 'coat', hair: 'brim' }, act: 'sit', h: 2, facing: -1, dim: 0.93 }),
  // the rocks and the footbridge: someone fishing, a docker walking to the staff gate
  P(792, 'rocks', { seed: 4138, look: { body: 'wide', garb: 'coat', hair: 'beanie' }, act: 'sit', facing: -1, h: 6 }),
  P(880, 'bridge', { seed: 4139, look: { ...HIVIS, body: 'avg', extras: ['backpack'] }, act: 'walk', range: [-70, 230], speed: 0.32 }),
  // the buffer: the guard at the staff gate, a sweeper bot on the path
  P(1158, 'back', { seed: 4140, look: { body: 'wide', garb: 'suit', hair: 'cap', acc: '#2a2a30' }, act: 'stand', facing: 1 }),
  P(1040, 'mid', { look: { bot: 'sweeper' }, act: 'sweep', range: [-40, 60] }),
  // the port: dockers in hi-vis, a marshal bot at the truck gate, the hub's loader
  P(1300, 'mid', { look: { bot: 'loader', paint: '#c8641e' }, act: 'carry', range: [-40, 60] }),
  P(1420, 'mid', { seed: 4142, look: { ...HIVIS, body: 'avg' }, act: 'walk', range: [-60, 80], speed: 0.3 }),
  P(1690, 'mid', { seed: 4143, look: { ...HIVIS, body: 'wide' }, act: 'stand', facing: 1 }),
  P(1748, 'mid', { seed: 4144, look: { ...HIVIS, body: 'slim', extras: ['phone'] }, act: 'phone', facing: -1 }),
  P(1960, 'mid', { seed: 4145, look: { ...HIVIS, body: 'tall' }, act: 'walk', range: [-90, 60], speed: 0.35 }),
  P(2140, 'mid', { seed: 4147, look: { ...HIVIS, body: 'avg' }, act: 'smoke', facing: 1 }),
  P(2148, 'mid', { seed: 4148, look: { ...HIVIS, body: 'old' }, act: 'haggle', facing: -1 }),
  P(2262, 'mid', { look: { bot: 'marshal' }, act: 'direct', facing: 1 }),
  P(2284, 'back', { seed: 4141, look: { body: 'wide', garb: 'suit', hair: 'cap', acc: '#2a2a30' }, act: 'stand', facing: -1 }),
  // the bridge: one runner, nothing else (the Spire's stretch is quiet)
  P(2480, 'mid', { seed: 4151, look: { garb: 'tee', hair: 'short', extras: ['headphones'] }, act: 'walk', range: [-120, 260], speed: 0.7 }),
  // the Galleria's plaza: shoppers, a busker, a sweeper, security at the door
  P(2810, 'mid', { seed: 4161, look: { garb: 'dress', hair: 'bun', extras: ['bag'] }, act: 'walk', range: [-90, 120], speed: 0.3 }),
  P(2878, 'mid', { seed: 4162, look: { garb: 'suit', hair: 'short', extras: ['bag', 'phone'] }, act: 'phone' }),
  P(2912, 'mid', { look: { bot: 'mech' }, act: 'patrol', range: [-30, 30] }),
  P(2950, 'mid', { seed: 4163, look: { garb: 'coat', hair: 'long', extras: ['bag'] }, act: 'queue' }),
  P(2960, 'mid', { seed: 4164, look: { body: 'kid', garb: 'tee', hair: 'cap' }, act: 'queue' }),
  P(2970, 'mid', { seed: 4165, look: { body: 'wide', garb: 'jacket', hair: 'beanie', extras: ['bag'] }, act: 'queue' }),
  P(3018, 'mid', { look: { bot: 'busker' }, act: 'play' }),
  P(3060, 'mid', { look: { bot: 'sweeper' }, act: 'sweep', range: [-90, 60] }),
  P(3100, 'mid', { seed: 4166, look: { garb: 'jacket', hair: 'mohawk', extras: ['bag'] }, act: 'walk', range: [-120, 60], speed: 0.4 }),
];

/** Palms: X, standing on (back: behind the people; front: at the bottom of the view), height, lean, seed. */
const PALMS: [number, 'back' | 'front', number, number, number][] = [
  [238, 'front', 150, 26, 1], [90, 'back', 112, 14, 4], [-76, 'back', 80, -10, 11], [-196, 'front', 128, -20, 5], [-262, 'back', 92, -6, 6],
  [338, 'back', 70, 10, 7], [452, 'back', 98, -8, 8], [662, 'back', 84, 12, 9], [735, 'back', 60, -14, 12],
];
/** Loungers on the beach: X, canopy colour, flipped. */
const LOUNGERS: [number, string, boolean][] = [[-112, '#c83a2a', false], [-152, '#d8b040', false], [-300, '#3a6ad8', true], [262, '#e8e0d0', true]];

/** Boxes true to scale: the scenes' crates, 12 m (or 6 m) long, 2.6 m tall. */
const B40 = (p: number, seed: number, code?: string, dx?: number): Crate => ({ ...BOX40, p, seed, code, dx });
const B20 = (p: number, seed: number, dx?: number): Crate => ({ ...BOX20, p, seed, dx });
/** The stacks between the cranes: the left edge's X, its boxes bottom up (in scene units). */
const STACKS: { X: number; boxes: Crate[] }[] = [
  { X: 1390, boxes: [B40(0, 81, 'MRDU 220 1180'), B20(6, 85, 30)] },
  { X: 1630, boxes: [B40(7, 87, 'NRLU 404 0451'), B40(6, 88, undefined, -12)] },
  { X: 2010, boxes: [B40(2, 86, 'TDLU 404 7710')] },
  { X: 2190, boxes: [B20(4, 98), B20(1, 99, 6)] },
];
/** The cranes along the quay, well apart: X of the origin, which, the boom's pose. STS-2 works. */
const CRANES: { X: number; id: 'sts1' | 'sts2' | 'sts3'; up: number; ph: number }[] = [
  { X: 1470, id: 'sts1', up: 1, ph: 0 }, { X: 1800, id: 'sts2', up: 0, ph: 1.3 }, { X: 2120, id: 'sts3', up: 0.94, ph: 2.1 },
];
/** STS-2 in the glide: its boom shortened to fit the quay. */
const STS2_GLIDE: Gantry = { ...GANTRIES.sts2, boom: { ...GANTRIES.sts2.boom, x0: -260, x1: 560 }, stays: [[-256, 0], [556, 0], [380, 4]] };
/** The box STS-2 is moving onto the ship this time (in the crane's frame: a 12 m box at the crane's scale). */
const LIFT: Crate = { w: Math.round(BOX40.w * S / CRANE), h: Math.round(BOX40.h * S / CRANE), p: 3, seed: 61 };
const LOADS: Crate[] = [B40(2, 71), B40(5, 72), B40(0, 73), B40(6, 74)];
const CAR_PAINTS = ['#8a2a2a', '#2a4a6a', '#c8c0b0', '#3a3a3a', '#6a5a2a', '#e8e0d0', '#4a2a4a'];

// ---------- the coast ----------

/** The far bay's own pieces, drawn over the sea and under the coast: the breakwater and its light, out beyond the inlet. */
export function drawBreakwater(x: CanvasRenderingContext2D, c: CoastView, seaTop: number, seaBot: number) {
  const p = 0.62, sxp = (X: number) => c.W / 2 + p * (c.g - X);
  const a = sxp(PLACES.inlet[1] + 120), b = sxp(PLACES.inlet[0] - 40);
  if (b < -20 || a > c.W + 20) return;
  const yb = R(lerp(seaTop, seaBot, 0.55));
  // the mole: big rough blocks, the dawn on their tops, the swell breaking white along it
  x.fillStyle = mixHex('#140a16', '#2a1828', c.warm);
  x.beginPath(); x.moveTo(a, yb + 3); for (let s = a; s <= b; s += 4) x.lineTo(s, yb - 3 - (hash(R(s - c.g * p) * 0.3) > 0.5 ? 1 : 0)); x.lineTo(b + 6, yb + 4); x.closePath(); x.fill();
  x.fillStyle = 'rgba(' + DAWN + ',' + (0.3 * c.warm).toFixed(2) + ')'; x.fillRect(R(a), yb - 3, R(b - a), 1);
  const br = c.still ? 0.5 : (Math.sin(c.t * 1.1) + 1) / 2;
  x.fillStyle = 'rgba(255,240,230,' + (0.25 + br * 0.3).toFixed(2) + ')'; for (let s = a; s < b; s += 7) if (hash(R(s - c.g * p)) > 0.4) x.fillRect(R(s), yb + 2 + R(hash(s) * 2), 3, 1);
  // its light tower at the seaward end: red and white bands, the red light flashing
  const lx = R(a + 3);
  for (let k = 0; k < 4; k++) { x.fillStyle = k % 2 ? '#d8d0c4' : '#a82a2a'; x.fillRect(lx, yb - 7 - k * 3, 3, 3); }
  const on = c.still || Math.floor(c.f / 45) % 3 === 0;
  x.fillStyle = on ? 'rgba(' + RED + ',1)' : 'rgba(' + RED + ',.3)'; x.fillRect(lx - 1, yb - 21, 5, 3);
  if (on) { const g = x.createRadialGradient(lx + 1.5, yb - 20, 0, lx + 1.5, yb - 20, 14); g.addColorStop(0, 'rgba(' + RED + ',.35)'); g.addColorStop(1, 'rgba(' + RED + ',0)'); x.fillStyle = g; x.fillRect(lx - 14, yb - 34, 30, 30); }
}

/** The coast's back: the ship, the ground (then `afterGround`: the town's street and road), the pier, the back line. */
export function drawCoast(x: CanvasRenderingContext2D, c: CoastView, afterGround?: (L: Lines) => void) {
  const L = lines(c);
  ship(x, c);
  ground(x, c, L);
  afterGround?.(L);
  pier(x, c, L);
  // the back line: the bar, the inlet's railings, the port's fence, the stacks and cranes, the bridge, the Galleria
  palms(x, c, L, 'back');
  salt(x, c, L);
  lifeguard(x, c, L);
  inlet(x, c, L);
  buffer(x, c, L);
  hub(x, c, L);
  harbor(x, c, L);
  truckGate(x, c, L);
  bridge(x, c, L);
  galleria(x, c, L);
}

/** The coast's middle: the beach's things, the port's machines, people, the escalator's riders. */
export function drawCoastMid(x: CanvasRenderingContext2D, c: CoastView) {
  const L = lines(c);
  beach(x, c, L);
  machines(x, c, L);
  for (const w of PEOPLE) {
    const s = c.sx(w.X);
    if (s < -60 || s > c.W + 60) continue;
    placed(x, R(s), lineY(L, c, w.line), S, () => drawCharacter(x, frameView(c.f), w.c));
  }
  escalator(x, c, L);
}

/** The palms at the bottom of the view, framing the title. */
export function drawCoastFront(x: CanvasRenderingContext2D, c: CoastView) { palms(x, c, lines(c), 'front'); }

/**
 * The foreground wipes: at a few seams something big and dark passes close to the camera (depth 1.7):
 * a palm where the sand ends at the rocks, a post at the quay's end, a lamp where the bridge lands
 * on the plaza, a signal pole where the plaza steps down to the street. None over the bay: the
 * Spire's stretch stays open.
 */
export function drawForeground(x: CanvasRenderingContext2D, c: CoastView) {
  const ink = '#040106';
  const wipes: [number, 'palm' | 'post' | 'lamp' | 'signal'][] = [[PLACES.sand + 8, 'palm'], [PLACES.quay[1] + 20, 'post'], [PLACES.plaza[0], 'lamp'], [PLACES.street, 'signal']];
  for (const [X, kind] of wipes) {
    const s = c.W / 2 + 1.7 * (c.g - X);
    if (s < -120 || s > c.W + 120) continue;
    if (kind === 'palm') { placed(x, R(s), c.H + 30, 1, () => drawPalm(x, { h: c.H * 1.15, lean: 30, seed: 21, t: c.f, still: c.still, fill: ink, rim: DAWN, side: -1 })); continue; }
    const w = kind === 'post' ? 12 : 6;
    x.fillStyle = ink; x.fillRect(R(s), -10, w, c.H + 100);
    if (kind === 'post') { x.fillRect(R(s) - 30, 30, 42, 5); x.fillStyle = 'rgba(255,230,180,.85)'; x.fillRect(R(s) - 28, 35, 14, 2); x.fillStyle = 'rgba(' + ORANGE + ',.25)'; x.fillRect(R(s) + w - 1, 0, 1, c.H); }
    else if (kind === 'lamp') { x.fillRect(R(s) - 18, 44, 24, 4); x.fillStyle = 'rgba(255,230,180,.85)'; x.fillRect(R(s) - 16, 48, 8, 2); }
    else { x.fillRect(R(s) - 4, 50, 14, 30); const go = c.still || Math.floor(c.f / 150) % 2 === 0; x.fillStyle = go ? 'rgba(60,255,140,.9)' : 'rgba(255,42,68,.9)'; x.fillRect(R(s) - 1, go ? 70 : 54, 8, 6); }
  }
}

/** A span of the strip on screen (x0, x1) for the stretch X0..X1, or null. */
function span(c: CoastView, X0: number, X1: number) { const a = Math.max(-2, Math.floor(c.sx(X1))), b = Math.min(c.W + 2, Math.ceil(c.sx(X0))); return b > a ? [a, b] : null; }

/** The strip under the ground line, material by material; the seams between them carry their own pieces. */
function ground(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  const { GY } = c, bottom = c.H + 90;
  const fill = (X0: number, X1: number, top: string, low: string, from = GY) => {
    const s = span(c, X0, X1); if (!s) return null;
    const gr = x.createLinearGradient(0, from, 0, c.H); gr.addColorStop(0, top); gr.addColorStop(1, low);
    x.fillStyle = gr; x.fillRect(s[0], from, s[1] - s[0], bottom - from); return s;
  };
  // the sand: warm at dawn, wet at the waterline, the surf washing in
  const sand = fill(-1e4, PLACES.sand, mixHex('#2a1424', '#5a2a3a', c.warm), '#2a1424');
  if (sand) {
    const [a, b] = sand, wash = c.still ? 0.5 : (Math.sin(c.t * 1.8) + 1) / 2, reach = R(2 + wash * 7);
    x.fillStyle = 'rgba(190,110,150,' + (0.35 * lerp(0.4, 1, c.warm)).toFixed(3) + ')'; x.fillRect(a, GY, b - a, reach + 2);
    for (let px = a - (a % 4); px < b; px += 4) {
      const wx = R(px - c.g), k = hash(Math.floor((px - c.g) / 4) * 3.1), dy = R(reach + (k - 0.5) * 3);
      x.fillStyle = 'rgba(255,236,226,' + ((0.3 + k * 0.45) * lerp(0.4, 1, c.warm)).toFixed(2) + ')'; x.fillRect(px, GY + dy, 3, 1);
      if (k > 0.65) x.fillRect(px + 1, GY + dy - 2, 2, 1);
      if (hash(wx * 0.37) > 0.93) { x.fillStyle = 'rgba(30,10,20,.35)'; x.fillRect(px, GY + 12 + R(hash(wx) * (c.H - GY - 14)), 2, 1); }
    }
    const br = c.still ? 0.5 : (c.t * 0.5) % 1; x.fillStyle = 'rgba(255,240,230,' + (0.55 * Math.sin(br * Math.PI) * lerp(0.4, 1, c.warm)).toFixed(2) + ')'; x.fillRect(a, GY - 3 + R(br * 3), b - a, 1);
  }
  // the rocks: big dark blocks from the sand down into the inlet
  const rk = span(c, PLACES.sand - 10, PLACES.rocks + 6);
  if (rk) for (let i = 0; i < 9; i++) {
    const X = PLACES.sand - 6 + i * 6, s = c.sx(X), d = R(i * 3.2 * L.k);
    x.fillStyle = mixHex('#1a0e16', '#33202a', c.warm * (0.6 + hash(i) * 0.4)); x.beginPath(); x.moveTo(s - 8, bottom); x.lineTo(s - 8, GY + d - 2); x.lineTo(s - 3, GY + d - 6 - R(hash(i + 4) * 4)); x.lineTo(s + 5, GY + d - 4); x.lineTo(s + 8, bottom); x.closePath(); x.fill();
    x.fillStyle = 'rgba(' + DAWN + ',' + (0.25 * c.warm).toFixed(2) + ')'; x.fillRect(R(s - 3), GY + d - 6 - R(hash(i + 4) * 4), 6, 1);
  }
  // the inlet: open water in the strip, deeper toward the camera, the swell coming in from the bay
  const inl = span(c, PLACES.inlet[0], PLACES.inlet[1]);
  if (inl) {
    const [a, b] = inl, wg = x.createLinearGradient(0, GY, 0, c.H); wg.addColorStop(0, mixHex('#2a1438', '#6a2a5a', c.warm)); wg.addColorStop(1, mixHex('#0c0418', '#1e0c2a', c.warm));
    x.fillStyle = wg; x.fillRect(a, GY, b - a, bottom - GY);
    for (let i = 0; i < 30; i++) {
      const row = i % 6, py = GY + 3 + row * (c.H - GY) / 6, len = 6 + row * 3, drift = c.still ? 0 : c.f * (0.12 + row * 0.04);
      const px = a + ((((i * 47 + drift - c.g) % (b - a + 30)) + (b - a + 30)) % (b - a + 30)) - 15;
      x.fillStyle = 'rgba(255,190,200,' + (0.1 + row * 0.03).toFixed(2) + ')'; x.fillRect(R(px), R(py), len, 1);
    }
    // the sun's path crossing it, and the footbridge's shadow
    x.fillStyle = 'rgba(255,170,90,' + (0.18 * c.warm).toFixed(2) + ')'; x.fillRect(R(Math.max(a, c.sunX - 10)), GY + 2, R(Math.max(0, Math.min(b, c.sunX + 10) - Math.max(a, c.sunX - 10))), c.H - GY);
    x.fillStyle = 'rgba(10,4,16,.45)'; x.fillRect(a, L.MID + 2, b - a, 3);
  }
  // the buffer: gravel and weeds, a puddle, tyre ruts
  const buf = fill(PLACES.inlet[1], PLACES.buffer[1], '#2a2026', '#120c10');
  if (buf) {
    const [a, b] = buf;
    for (let px = a - (a % 3); px < b; px += 3) { const k = hash(Math.floor((px - c.g) / 3) * 1.7); if (k > 0.55) { x.fillStyle = 'rgba(150,120,120,' + (0.1 + (k - 0.55) * 0.5).toFixed(2) + ')'; x.fillRect(px, GY + 4 + R(hash(px - c.g) * (c.H - GY - 6)), 2, 1); } if (k > 0.93) { x.fillStyle = 'rgba(60,80,40,.6)'; x.fillRect(px, L.BACK + 1, 1, 3); x.fillRect(px + 1, L.BACK, 1, 4); } }
    x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(a, L.MID + 6, b - a, 1); x.fillRect(a, L.MID + 12, b - a, 1);
  }
  // the quay: concrete, its coping along the water, the cranes' rails, bollards
  const quay = fill(PLACES.quay[0], PLACES.quay[1] + 60, '#2e2228', '#120c10');
  if (quay) {
    const [a, b] = quay;
    x.fillStyle = '#4a3a40'; x.fillRect(a, GY, b - a, 2); x.fillStyle = 'rgba(' + ORANGE + ',.55)'; x.fillRect(a, GY, b - a, 1);
    x.fillStyle = 'rgba(200,180,170,.25)'; x.fillRect(a, L.BACK - 1, b - a, 1); x.fillRect(a, L.BACK + 2, b - a, 1);
    for (let X = PLACES.quay[0] + 20; X < PLACES.quay[1]; X += 46) { const s = c.sx(X); if (s < a - 4 || s > b + 4) continue; x.fillStyle = '#16100e'; x.fillRect(R(s), GY - 3, 4, 4); x.fillStyle = 'rgba(' + ORANGE + ',.5)'; x.fillRect(R(s), GY - 3, 4, 1); }
    // the apron's painted lanes (the port's machines only)
    x.fillStyle = 'rgba(255,200,60,.22)'; for (let px = a; px < b; px++) if ((((px - c.g) % 18) + 18) % 18 < 8) x.fillRect(px, L.FAR_LANE - 2, 1, 1);
  }
  // the bridge: its walkway and deck, the girder's face, the bay under it
  const br = span(c, PLACES.bridge[0] - 10, PLACES.bridge[1]);
  if (br) {
    const [a, b] = br, deckBot = L.ROAD1 + R(4 * L.k);
    const wg = x.createLinearGradient(0, deckBot, 0, c.H); wg.addColorStop(0, mixHex('#1a0828', '#3a1446', c.warm)); wg.addColorStop(1, '#0c0414');
    x.fillStyle = wg; x.fillRect(a, deckBot, b - a, bottom - deckBot);
    for (let i = 0; i < 26; i++) { const px = a + ((i * 53 + (c.still ? 0 : c.f * 0.2) - c.g * 0.6) % (b - a + 40) + (b - a + 40)) % (b - a + 40) - 20, py = deckBot + 3 + (i * 7) % Math.max(4, c.H - deckBot - 2); x.fillStyle = 'rgba(255,190,200,' + (0.08 + (i % 3) * 0.04).toFixed(2) + ')'; x.fillRect(R(px), R(py), 4 + (i % 4) * 2, 1); }
    x.fillStyle = '#2a1e2c'; x.fillRect(a, GY, b - a, L.ROAD0 - GY);
    x.fillStyle = '#1a1220'; x.fillRect(a, L.ROAD1, b - a, deckBot - L.ROAD1);
    x.fillStyle = 'rgba(' + ORANGE + ',.4)'; x.fillRect(a, deckBot - 1, b - a, 1);
    for (let X = PLACES.bridge[0] + 8; X < PLACES.bridge[1]; X += 30) { const s = c.sx(X); if (s < a || s > b) continue; x.fillStyle = 'rgba(255,214,150,.5)'; x.fillRect(R(s), deckBot - 3, 2, 1); x.fillStyle = 'rgba(255,214,150,.1)'; x.fillRect(R(s), deckBot + 2, 2, 8); }
  }
  // the plaza: pale paving, a grid of joints
  const pl = fill(PLACES.plaza[0], PLACES.plaza[1], '#3a2c3c', '#1a121c');
  if (pl) {
    const [a, b] = pl;
    x.fillStyle = 'rgba(255,217,165,.08)'; for (let X = PLACES.plaza[0]; X < PLACES.plaza[1]; X += 12) { const s = c.sx(X); if (s > a && s < b) x.fillRect(R(s), GY, 1, L.ROAD0 - GY); }
    x.fillRect(a, GY + R(6 * L.k), b - a, 1); x.fillRect(a, GY + R(12 * L.k), b - a, 1);
  }
  seamPieces(x, c);
}

function seamPieces(x: CanvasRenderingContext2D, c: CoastView) {
  const { GY } = c, bottom = c.H + 90;
  // the inlet's two walls: the rocks' toe on the beach side, the port's sea wall on the other
  let s = c.sx(PLACES.inlet[1]);
  if (s > -30 && s < c.W + 30) {
    x.fillStyle = '#3a2c32'; x.fillRect(R(s) - 2, GY - 4, 10, bottom - GY);
    x.fillStyle = 'rgba(' + ORANGE + ',.5)'; x.fillRect(R(s) - 2, GY - 4, 10, 1); x.fillRect(R(s) - 2, GY - 4, 1, bottom - GY);
    x.fillStyle = 'rgba(0,0,0,.3)'; for (let h = GY + 4; h < c.H + 40; h += 5) x.fillRect(R(s) - 1, h, 8, 1);
  }
  // the bridge's abutments: concrete blocks going down into the bay at both ends
  for (const X of [PLACES.bridge[0] - 6, PLACES.bridge[1]]) {
    s = c.sx(X);
    if (s < -30 || s > c.W + 30) continue;
    x.fillStyle = '#2e2228'; x.fillRect(R(s) - 8, GY, 16, bottom - GY);
    x.fillStyle = 'rgba(' + ORANGE + ',.45)'; x.fillRect(R(s) - 8, GY, 1, bottom - GY); x.fillRect(R(s) + 7, GY, 1, bottom - GY);
    x.fillStyle = 'rgba(0,0,0,.3)'; for (let h = GY + 6; h < c.H + 40; h += 6) x.fillRect(R(s) - 7, h, 14, 1);
  }
}

/** The palms, back (behind the people) or front (at the bottom of the view, framing the title). */
function palms(x: CanvasRenderingContext2D, c: CoastView, L: Lines, band: 'back' | 'front') {
  for (const [X, b, h, lean, seed] of PALMS) {
    if (b !== band) continue;
    const s = c.sx(X);
    if (s < -h * 0.8 || s > c.W + h * 0.8) continue;
    const base = band === 'front' ? c.H + 4 : L.BACK + 2;
    placed(x, R(s), base, 1, () => drawPalm(x, { h, lean, seed, t: c.f, still: c.still, rim: DAWN, side: c.sunX > s ? 1 : -1, fill: band === 'front' ? '#07020a' : '#0b0410' }));
  }
}

/** SALT on the sand: the bar under its floor, LIME, the string lights out over the dance floor to a pole. */
function salt(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  const X = 196, s = c.sx(X);
  if (s < -260 || s > c.W + 40) return;
  const w = 226;
  placed(x, R(s), L.BEACH, S, () => {
    saltUnder(x, w); saltBack(x, w);
    x.save(); x.translate(113, 0); saltLime(x, c.f); x.restore();
    saltShell(x, w, 0.05, c.f); saltCounter(x, w);
    for (const sx of [40, 96, 170]) { x.fillStyle = '#5a3a24'; x.fillRect(sx - 1, -14, 2, 14); x.fillStyle = '#8a5a3a'; x.fillRect(sx - 5, -16, 10, 3); }
    saltLights(x, w, c.f, c.still);
    x.fillStyle = '#3a2618'; x.fillRect(558, -82, 3, 82); x.fillRect(554, -82, 11, 2);
    drawStringLights(x, w + 46, 84, 560, 80, c.f, { sag: 12, phase: 3, still: c.still });
  });
}

/** The lifeguard's tower past the pier, off duty: a hut on stilts, its shutter down, the flag; the sign by the water. */
function lifeguard(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  const s = c.sx(708);
  if (s < -40 || s > c.W + 40) return;
  const b = L.BACK + 6, ink = '#140812';
  x.fillStyle = ink; x.fillRect(R(s) - 8, b - 26, 2, 26); x.fillRect(R(s) + 7, b - 26, 2, 26); x.fillRect(R(s) - 9, b - 16, 19, 1);
  x.fillRect(R(s) - 11, b - 38, 23, 12); x.beginPath(); x.moveTo(R(s) - 13, b - 38); x.lineTo(R(s), b - 45); x.lineTo(R(s) + 13, b - 38); x.fill();
  x.fillStyle = 'rgba(' + DAWN + ',' + (0.35 * c.warm).toFixed(2) + ')'; x.fillRect(R(s) - 11, b - 38, 23, 1);
  x.fillStyle = 'rgba(80,60,60,.8)'; x.fillRect(R(s) - 8, b - 35, 17, 7);
  x.fillStyle = ink; x.fillRect(R(s) + 9, b - 58, 1, 20);
  const wave = c.still ? 0 : Math.sin(c.f * 0.08) * 1;
  x.fillStyle = '#c8302a'; x.fillRect(R(s) + 10, b - 58 + wave, 6, 4);
  // the sign on its post: NO SWIMMING PAST THE BUOYS
  const p = c.sx(752);
  x.fillStyle = ink; x.fillRect(R(p), L.BACK - 14, 1, 16);
  x.fillStyle = '#e8e0d0'; x.fillRect(R(p) - 12, L.BACK - 22, 25, 9); x.fillStyle = '#c8302a'; x.fillRect(R(p) - 12, L.BACK - 22, 25, 2);
  text(x, 'NO SWIMMING', R(p) + 0.5, L.BACK - 16.5, 'rgba(30,10,10,.9)', 2.6, '600');
}

/** The beach's things on the sand: the DJ booth, the bonfire, the loungers. */
function beach(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  let s = c.sx(100);
  if (s > -40 && s < c.W + 40) placed(x, R(s), L.BEACH, S, () => drawDjBooth(x, { t: c.f, still: c.still }));
  s = c.sx(-42);
  if (s > -60 && s < c.W + 60) placed(x, R(s), L.BEACH + 2, S, () => drawBonfire(x, { t: c.f, still: c.still }));
  for (const [X, col, flip] of LOUNGERS) {
    s = c.sx(X);
    if (s < -20 || s > c.W + 20) continue;
    placed(x, R(s), L.BEACH + 1, S, () => drawLounger(x, { col, p: 0.1, flip }));
  }
}

/**
 * The pier: a timber deck out over the water on braced piles, planks and a railing that catch the
 * dawn, lamps with their glow and string lights between them, a kiosk at the land end (BAIT · ICE ·
 * TEA), benches, a lantern on its mast at the seaward end. Black against the sun, warm at its edges.
 */
function pier(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  const [X0, X1] = PLACES.pier;
  if (!seen(c, X0 - 30, X1 + 10, 40)) return;
  const a = R(c.sx(X1)), b = R(c.sx(X0)), deck = L.PIER;
  const ink = '#0a0310', rim = 'rgba(' + DAWN + ',' + (0.55 * c.warm).toFixed(2) + ')';
  // the piles into the water, their cross-bracing, their reflections
  for (let X = X0 + 6; X <= X1; X += 16) {
    const s = R(c.sx(X)); x.fillStyle = ink; x.fillRect(s, deck, 3, c.GY - deck + 1);
    x.fillStyle = 'rgba(10,3,16,.45)'; x.fillRect(s, c.GY + 1, 3, 5);
    if (X + 16 <= X1) { const s2 = R(c.sx(X + 16)); x.strokeStyle = 'rgba(10,3,16,.8)'; x.lineWidth = 0.8; x.beginPath(); x.moveTo(s, deck + 3); x.lineTo(s2 + 2, c.GY - 2); x.moveTo(s + 2, c.GY - 2); x.lineTo(s2, deck + 3); x.stroke(); }
  }
  // the deck: a thick beam, planks on top catching the light, a lit underside where the lamps fall
  x.fillStyle = ink; x.fillRect(a, deck - 2, b - a, 5);
  x.fillStyle = rim; x.fillRect(a, deck - 2, b - a, 1);
  x.fillStyle = 'rgba(255,190,120,.12)'; for (let s = a; s < b; s += 3) x.fillRect(s, deck - 1, 1, 1);
  // the railing: posts, a top rail with the dawn on it, a mid rail
  x.fillStyle = ink; x.fillRect(a, deck - 9, b - a, 1); x.fillRect(a, deck - 5, b - a, 1);
  for (let X = X0; X <= X1; X += 8) x.fillRect(R(c.sx(X)), deck - 9, 1, 9);
  x.fillStyle = rim; x.fillRect(a, deck - 10, b - a, 1);
  // stairs from the deck down to the sand at the land end, their handrail
  x.fillStyle = ink; for (let i = 0; i < 7; i++) x.fillRect(b - 2 + i * 3, deck + R(i * (L.BEACH - deck) / 7), 5, 2);
  x.fillRect(b + 20, deck, 1, L.BEACH - deck); x.strokeStyle = ink; x.lineWidth = 1; x.beginPath(); x.moveTo(b, deck - 9); x.lineTo(b + 21, L.BEACH - 9); x.stroke();
  // the kiosk at the land end: a hut with a lit hatch and a plate
  const k = R(c.sx(X0 + 26));
  x.fillStyle = '#1a0c18'; x.fillRect(k - 10, deck - 22, 20, 20); x.fillRect(k - 12, deck - 25, 24, 3);
  x.fillStyle = 'rgba(255,200,130,.75)'; x.fillRect(k - 7, deck - 18, 14, 6);
  x.fillStyle = '#0d0705'; x.fillRect(k - 11, deck - 31, 22, 6); x.strokeStyle = 'rgba(' + ORANGE + ',.6)'; x.lineWidth = 0.6; x.strokeRect(k - 10.5, deck - 30.5, 21, 5);
  text(x, 'BAIT · ICE · TEA', k, deck - 28, 'rgba(' + PAPER + ',.85)', 2.4, '600');
  // benches along it
  for (const X of [X0 + 70, X0 + 150]) { const s = R(c.sx(X)); x.fillStyle = ink; x.fillRect(s - 6, deck - 5, 12, 1); x.fillRect(s - 5, deck - 4, 1, 4); x.fillRect(s + 4, deck - 4, 1, 4); x.fillRect(s - 6, deck - 8, 1, 3); }
  // lamps along it, their glow, string lights between them
  const posts = [X0 + 50, X0 + 120, X0 + 190];
  for (const X of posts) {
    const s = R(c.sx(X)); x.fillStyle = ink; x.fillRect(s, deck - 28, 1, 28); x.fillRect(s - 2, deck - 29, 5, 1);
    x.fillStyle = 'rgba(255,220,160,.95)'; x.fillRect(s - 1, deck - 28, 3, 2);
    const g = x.createRadialGradient(s, deck - 26, 0, s, deck - 26, 16); g.addColorStop(0, 'rgba(255,210,150,.25)'); g.addColorStop(1, 'rgba(255,210,150,0)'); x.fillStyle = g; x.fillRect(s - 16, deck - 42, 32, 32);
    x.fillStyle = 'rgba(255,200,140,.18)'; x.fillRect(s - 3, c.GY + 1, 7, 2);
  }
  for (let i = 0; i + 1 < posts.length; i++) {
    const s0 = c.sx(posts[i + 1]), s1 = c.sx(posts[i]);
    placed(x, R(s0), deck, S, () => drawStringLights(x, 0, 78, (s1 - s0) / S, 78, c.f, { sag: 6, phase: i, still: c.still }));
  }
  // the lantern on its mast at the seaward end: a warm white, the pier's own, not the port's
  const e = R(c.sx(X1 - 2));
  x.fillStyle = ink; x.fillRect(e, deck - 34, 2, 34); x.fillRect(e - 2, deck - 36, 6, 2);
  x.fillStyle = 'rgba(255,232,190,.95)'; x.fillRect(e - 1, deck - 41, 4, 5);
  const gg = x.createRadialGradient(e + 1, deck - 39, 0, e + 1, deck - 39, 14); gg.addColorStop(0, 'rgba(255,220,170,.3)'); gg.addColorStop(1, 'rgba(255,220,170,0)'); x.fillStyle = gg; x.fillRect(e - 14, deck - 54, 30, 30);
}

/** The inlet: the footbridge over it (deck, railing, lamps at its ends); a moored dinghy. */
function inlet(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  const [X0, X1] = PLACES.inlet;
  if (!seen(c, X0, X1, 40)) return;
  const a = R(c.sx(X1)), b = R(c.sx(X0)), d = L.MID + 1, ink = '#120a14';
  // the deck: a steel truss walkway at the ground line, its railing
  x.fillStyle = ink; x.fillRect(a, d, b - a, 3); x.fillRect(a, d - 9, b - a, 1); x.fillRect(a, d - 5, b - a, 1);
  for (let X = X0; X <= X1; X += 7) x.fillRect(R(c.sx(X)), d - 9, 1, 9);
  x.strokeStyle = 'rgba(18,10,20,.9)'; x.lineWidth = 0.8; x.beginPath();
  for (let X = X0; X < X1; X += 20) { const s0 = c.sx(X), s1 = c.sx(X + 20); x.moveTo(s0, d + 3); x.lineTo((s0 + s1) / 2, d + 9); x.lineTo(s1, d + 3); }
  x.moveTo(a, d + 9); x.lineTo(b, d + 9); x.stroke();
  x.fillStyle = 'rgba(' + DAWN + ',' + (0.4 * c.warm).toFixed(2) + ')'; x.fillRect(a, d - 10, b - a, 1);
  // the back rail on the far side of the deck (the sea side)
  x.fillStyle = 'rgba(18,10,20,.7)'; x.fillRect(a, L.BACK - 6, b - a, 1); for (let X = X0; X <= X1; X += 14) x.fillRect(R(c.sx(X)), L.BACK - 6, 1, 6);
  // lamps at both ends
  for (const X of [X0 + 6, X1 - 6]) { const s = R(c.sx(X)); x.fillStyle = ink; x.fillRect(s, d - 26, 1, 26); x.fillStyle = 'rgba(255,220,160,.9)'; x.fillRect(s - 1, d - 27, 3, 2); }
  // a dinghy moored by the rocks, bobbing
  const s = R(c.sx(X0 + 30)), bob = c.still ? 0 : R(Math.sin(c.t * 1.3) * 0.8), dy = L.ROAD1 - 2 + bob;
  x.fillStyle = '#2a1820'; x.beginPath(); x.moveTo(s - 12, dy); x.lineTo(s + 12, dy); x.lineTo(s + 9, dy + 4); x.lineTo(s - 10, dy + 4); x.closePath(); x.fill();
  x.fillStyle = 'rgba(200,190,170,.6)'; x.fillRect(s - 12, dy, 24, 1);
  x.strokeStyle = 'rgba(200,190,170,.35)'; x.lineWidth = 0.5; x.beginPath(); x.moveTo(s - 12, dy); x.lineTo(s - 26, d + 2); x.stroke();
}

/** The port's fenced buffer: the double fence on the back line, its signs and cameras, a floodlight, a car shell left on the gravel, the staff gate. */
function buffer(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  const [X0, X1] = PLACES.buffer;
  if (!seen(c, X0 - 20, X1 + 20, 60)) return;
  const fx = (X: number) => R(c.sx(X));
  // the fence: two rows, posts, mesh, the barbed wire on top (rising toward the port)
  for (const [row, dim] of [[L.BACK - 2, 0.6], [L.BACK + 2, 1]] as const) {
    const top = row - 26;
    x.fillStyle = 'rgba(74,62,68,' + dim + ')'; for (let X = X0; X <= X1; X += 10) x.fillRect(fx(X), top, 1, row - top);
    x.fillRect(fx(X1), top, fx(X0) - fx(X1), 1); x.fillRect(fx(X1), top + 12, fx(X0) - fx(X1), 1);
    x.fillStyle = 'rgba(160,140,150,' + (0.14 * dim).toFixed(2) + ')'; for (let i = fx(X1); i < fx(X0); i += 2) for (let j = top + 1; j < row; j += 2) x.fillRect(i + ((j >> 1) % 2), j, 1, 1);
    x.strokeStyle = 'rgba(160,140,150,' + (0.5 * dim).toFixed(2) + ')'; x.lineWidth = 0.5; x.beginPath(); for (let i = fx(X1); i < fx(X0); i += 3) { x.moveTo(i, top - 1); x.lineTo(i + 2, top - 3); x.moveTo(i + 1, top - 3); x.lineTo(i + 3, top - 1); } x.stroke();
  }
  // its signs: red on white plates on the mesh
  const plates: [number, string][] = [[X0 + 30, 'PORT AREA · NO ENTRY'], [X0 + 110, 'CAMERAS IN OPERATION'], [X0 + 180, 'TRESPASS IS LOGGED']];
  for (const [X, s] of plates) { const p = fx(X); x.fillStyle = '#e0d8cc'; x.fillRect(p - 15, L.BACK - 17, 30, 8); x.fillStyle = '#b02a2a'; x.fillRect(p - 15, L.BACK - 17, 30, 2); text(x, s, p, L.BACK - 12, 'rgba(40,10,10,.95)', 2.4, '600'); }
  // a camera pole and a floodlight mast
  const cp = fx(X0 + 70), on = c.still || Math.floor(c.f / 24) % 2;
  x.fillStyle = '#3a3036'; x.fillRect(cp, L.BACK - 46, 1, 46); x.fillRect(cp - 5, L.BACK - 47, 7, 3);
  x.fillStyle = on ? 'rgba(' + RED + ',.95)' : 'rgba(' + RED + ',.25)'; x.fillRect(cp - 5, L.BACK - 46, 1, 1);
  const fm = fx(X0 + 150), top = L.BACK - 82;
  x.fillStyle = '#2a2026'; x.fillRect(fm, top, 2, L.BACK - top); x.fillRect(fm - 6, top, 14, 3);
  x.fillStyle = 'rgba(255,240,210,.9)'; x.fillRect(fm - 5, top + 3, 12, 1);
  const g = x.createLinearGradient(0, top, 0, L.MID); g.addColorStop(0, 'rgba(255,240,210,.14)'); g.addColorStop(1, 'rgba(255,240,210,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(fm - 5, top + 3); x.lineTo(fm - 40, L.MID); x.lineTo(fm + 44, L.MID); x.lineTo(fm + 7, top + 3); x.closePath(); x.fill();
  // a car shell on the gravel by the fence, stripped, nobody's
  const cs = fx(X0 + 120);
  x.save(); x.globalAlpha = 0.9; placed(x, cs, L.BACK + 7, S, () => drawCar(x, { t: 0, paint: '#2a2224', kind: 'hatch', face: 1, still: true })); x.restore();
  x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(cs - 16, L.BACK + 1, 32, 3);
  // the staff gate: a booth with a lit window, a turnstile cage, the plate
  const b = fx(PLACES.staffGate);
  x.fillStyle = '#2a2026'; x.fillRect(b - 18, L.BACK - 24, 18, 24); x.fillStyle = 'rgba(' + ORANGE + ',.5)'; x.fillRect(b - 18, L.BACK - 24, 18, 1);
  x.fillStyle = 'rgba(255,217,138,.55)'; x.fillRect(b - 15, L.BACK - 19, 12, 7);
  x.fillStyle = 'rgba(74,62,68,1)'; x.fillRect(b + 2, L.BACK - 22, 10, 1); for (let i = 0; i < 4; i++) x.fillRect(b + 2 + i * 3, L.BACK - 22, 1, 22);
  x.fillStyle = 'rgba(60,230,140,.9)'; x.fillRect(b + 6, L.BACK - 26, 2, 2);
  x.fillStyle = '#0d0705'; x.fillRect(b - 24, L.BACK - 33, 38, 7); x.strokeStyle = 'rgba(' + ORANGE + ',.6)'; x.lineWidth = 1; x.strokeRect(b - 23.5, L.BACK - 32.5, 37, 6);
  text(x, 'TERMINAL 2 · STAFF', b - 5, L.BACK - 29.5, 'rgba(' + PAPER + ',.85)', 2.8, '600');
}

/** The logistics hub at the quay's east end: a long shed, its roller doors, the drone port on its roof where the delivery stream starts (air.ts). */
function hub(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  const X0 = PLACES.hub - 60, X1 = PLACES.hub + 70;
  if (!seen(c, X0, X1, 40)) return;
  const a = R(c.sx(X1)), b = R(c.sx(X0)), top = L.BACK - 46;
  x.fillStyle = '#241c22'; x.fillRect(a, top, b - a, L.BACK - top);
  x.fillStyle = 'rgba(' + ORANGE + ',.45)'; x.fillRect(a, top, b - a, 1);
  for (let i = 0; i < 4; i++) { const dx = a + 8 + i * ((b - a - 16) / 4); x.fillStyle = i === 1 ? 'rgba(255,214,150,.55)' : '#18121a'; x.fillRect(R(dx), L.BACK - 20, 22, 20); x.fillStyle = 'rgba(0,0,0,.3)'; for (let h = L.BACK - 20; h < L.BACK; h += 3) x.fillRect(R(dx), h, 22, 1); }
  x.fillStyle = '#0d0705'; x.fillRect(a + 10, top + 6, 60, 9); x.strokeStyle = 'rgba(' + ORANGE + ',.55)'; x.lineWidth = 1; x.strokeRect(a + 10.5, top + 6.5, 59, 8);
  text(x, 'LOGISTICS HUB 3', a + 40, top + 10.5, 'rgba(' + PAPER + ',.85)', 3.6, '600');
  // the drone port: racks on the roof, pads with their lights
  x.fillStyle = '#1a141a'; x.fillRect(a + 6, top - 6, b - a - 12, 6);
  for (let i = 0; i < 5; i++) { const px = a + 14 + i * ((b - a - 28) / 4), on = c.still || Math.floor((c.f + i * 13) / 20) % 2 === 0; x.fillStyle = on ? 'rgba(255,190,60,.9)' : 'rgba(255,190,60,.3)'; x.fillRect(R(px), top - 8, 4, 1); }
}

/** The ship at the quay, behind it: a feeder's hull true to scale, 12 m boxes two high on deck, the bridge house aft with its lit windows. */
function ship(x: CanvasRenderingContext2D, c: CoastView) {
  const X0 = 1380, X1 = 2180;
  if (!seen(c, X0, X1)) return;
  const a = R(c.sx(X1)), b = R(c.sx(X0)), top = c.GY - 40;
  x.fillStyle = '#1c1220'; x.fillRect(a, top, b - a, c.GY - top);
  x.beginPath(); x.moveTo(b, top); x.lineTo(b + 22, top - 8); x.lineTo(b + 10, c.GY); x.lineTo(b, c.GY); x.fill();
  x.fillStyle = 'rgba(200,60,60,.5)'; x.fillRect(a, c.GY - 6, b - a + 10, 2);
  x.fillStyle = 'rgba(255,170,120,.35)'; x.fillRect(a, top, b - a + 20, 1);
  // boxes on deck: rows of 40 ft boxes, two high, the containers set at the coast's scale
  for (let X = X0 + 30, i = 0; X < X1 - 130; X += 112, i++) {
    if (hash(i * 3 + 1) < 0.5) continue;
    const s = R(c.sx(X)), n = 1;
    placed(x, s - R(BOX40.w * S), top, S, () => stack(x, frameView(c.f), 0, Array.from({ length: n }, (_, j) => B40((i * 3 + j) % PAL.length, 300 + i * 7 + j))));
  }
  // the bridge house aft (west), its windows, the funnel, a mast
  const h = R(c.sx(X1 - 50));
  x.fillStyle = '#241828'; x.fillRect(h - 26, top - 66, 46, 66); x.fillRect(h - 30, top - 72, 54, 7);
  x.fillStyle = 'rgba(255,214,150,.6)'; for (let r = 0; r < 5; r++) for (let q = 0; q < 5; q++) if (hash(r * 5 + q) > 0.35) x.fillRect(h - 22 + q * 8, top - 60 + r * 11, 5, 4);
  x.fillStyle = '#3a1a1a'; x.fillRect(h + 6, top - 92, 12, 20); x.fillStyle = 'rgba(200,60,60,.6)'; x.fillRect(h + 6, top - 86, 12, 3);
  x.fillStyle = '#241828'; x.fillRect(h - 10, top - 104, 1, 32);
  x.fillStyle = c.still || Math.floor(c.f / 30) % 2 ? 'rgba(' + RED + ',.9)' : 'rgba(' + RED + ',.3)'; x.fillRect(h - 11, top - 106, 3, 2);
}

/** The harbor: the stacks, the cranes (STS-2 at work), the light masts, the port office. */
function harbor(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  if (!seen(c, PLACES.quay[0], PLACES.quay[1], 300)) return;
  for (const st of STACKS) {
    const s = c.sx(st.X);
    if (s < -120 || s > c.W + 20) continue;
    placed(x, R(s), L.BACK, S, () => stack(x, frameView(c.f), 0, st.boxes));
  }
  for (const cr of CRANES) {
    const s = c.sx(cr.X);
    if (s < -420 || s > c.W + 260) continue;
    placed(x, R(s), L.BACK, CRANE, () => {
      const g = cr.id === 'sts2' ? STS2_GLIDE : GANTRIES[cr.id];
      drawGantry(x, g, c.f, 'all', cr.ph, c.still, { paint: mixHex('#5a2410', '#b4561c', c.warm), lit: 0.5, rim: 0.55, boomUp: cr.up });
      if (cr.id === 'sts2') sts2Load(x, c, L);
    });
  }
  // light masts, their lamps still on in the dawn
  for (const X of [1370, 1640, 1960, 2230]) {
    const s = c.sx(X);
    if (s < -30 || s > c.W + 30) continue;
    const top = L.BACK - 110;
    x.fillStyle = '#2a2026'; x.fillRect(R(s), top, 2, L.BACK - top); x.fillRect(R(s) - 6, top, 14, 2);
    x.fillStyle = 'rgba(255,230,180,.9)'; x.fillRect(R(s) - 5, top + 2, 12, 1);
    const gg = x.createRadialGradient(s + 1, top + 4, 1, s + 1, top + 4, 34); gg.addColorStop(0, 'rgba(255,220,160,.2)'); gg.addColorStop(1, 'rgba(255,220,160,0)'); x.fillStyle = gg; x.fillRect(s - 34, top - 30, 70, 70);
  }
}

/** STS-2's trolley at work (in its frame): down to the truck under it, up, out over the ship, down, back. */
function sts2Load(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  const B = STS2_GLIDE.boom, cyc = c.still ? 0.3 : (c.f % 900) / 900, CHc = LIFT.h!;
  // heights in the crane's frame: the truck's box top on the apron (chassis 42 scene units + the box), the ship's deck
  const truckH = -((L.FAR_LANE - L.BACK) / CRANE) + (42 * S) / CRANE + CHc, shipH = (L.BACK - (c.GY - 40)) / CRANE + 2 + CHc * 2;
  const high = B.low - 34;
  const ease = (v: number) => v * v * (3 - 2 * v), seg = (a: number, b: number) => ease(Math.max(0, Math.min(1, (cyc - a) / (b - a))));
  const tx0 = 120, tx1 = 440;
  let tx = tx0, h = high, carry = false;
  if (cyc < 0.12) h = lerp(high, truckH, seg(0, 0.12));
  else if (cyc < 0.22) { h = lerp(truckH, high, seg(0.12, 0.22)); carry = true; }
  else if (cyc < 0.45) { tx = lerp(tx0, tx1, seg(0.22, 0.45)); carry = true; }
  else if (cyc < 0.55) { tx = tx1; h = lerp(high, shipH, seg(0.45, 0.55)); carry = true; }
  else if (cyc < 0.65) { tx = tx1; h = lerp(shipH, high, seg(0.55, 0.65)); }
  else if (cyc < 0.9) tx = lerp(tx1, tx0, seg(0.65, 0.9));
  const y = (v: number) => -v, half = LIFT.w / 2;
  x.fillStyle = '#2a160a'; x.fillRect(tx - 12, y(B.low) + 3, 24, 7);
  x.strokeStyle = 'rgba(' + PAPER + ',.5)'; x.lineWidth = 1; x.beginPath(); x.moveTo(tx - 5.5, y(B.low) + 10); x.lineTo(tx - 5.5, y(h + 4)); x.moveTo(tx + 5.5, y(B.low) + 10); x.lineTo(tx + 5.5, y(h + 4)); x.stroke();
  x.fillStyle = '#2a160a'; x.fillRect(tx - half - 2, y(h + 4), LIFT.w + 4, 4);
  x.fillStyle = 'rgba(255,210,58,.7)'; x.fillRect(tx - half - 2, y(h + 4), 6, 4); x.fillRect(tx + half - 4, y(h + 4), 6, 4);
  if (carry) container(x, frameView(c.f), tx - half, h - CHc, LIFT);
  x.fillStyle = '#140b06'; x.fillRect(tx - half + 10, y(B.low - 8), 24, 26); x.fillStyle = 'rgba(255,200,130,.35)'; x.fillRect(tx - half + 13, y(B.low - 12), 18, 12);
}

/** The truck gate at the quay's west end: the gantry over the road with its plate and camera, the booth, the barrier; the port office beside it. */
function truckGate(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  if (!seen(c, PLACES.gate - 80, PLACES.road + 40, 60)) return;
  const g = R(c.sx(PLACES.gate)), b = R(c.sx(PLACES.road - 4));
  // the port office behind the gate: lit windows, its name, cars parked in front
  const o = R(c.sx(2210));
  x.fillStyle = '#26202a'; x.fillRect(o, L.BACK - 34, 54, 34); x.fillStyle = 'rgba(' + ORANGE + ',.45)'; x.fillRect(o, L.BACK - 34, 54, 1);
  x.fillStyle = 'rgba(255,220,150,.55)'; for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) x.fillRect(o + 4 + i * 10, L.BACK - 28 + j * 12, 6, 6);
  x.fillStyle = '#0d0705'; x.fillRect(o + 6, L.BACK - 42, 42, 7); x.strokeStyle = 'rgba(' + ORANGE + ',.55)'; x.lineWidth = 1; x.strokeRect(o + 6.5, L.BACK - 41.5, 41, 6);
  text(x, 'PORT OFFICE', o + 27, L.BACK - 38.5, 'rgba(' + PAPER + ',.8)', 3.6, '600');
  for (let i = 0; i < 2; i++) placed(x, o + 14 + i * 46, L.MID - 4, S, () => drawCar(x, { t: c.f, paint: CAR_PAINTS[i + 1], kind: (['sedan', 'van'] as const)[i], face: i % 2 ? -1 : 1, still: c.still }));
  // the gantry over the road: two legs, the beam, TERMINAL 2 · TRUCK GATE, a camera, a red/green light
  x.fillStyle = '#3a3036'; x.fillRect(g - 2, L.BACK - 54, 3, L.NEAR_LANE - L.BACK + 54); x.fillRect(g + 36, L.BACK - 54, 3, 54);
  x.fillRect(g - 2, L.BACK - 56, 41, 3);
  x.fillStyle = '#0d0705'; x.fillRect(g + 2, L.BACK - 66, 34, 9); x.strokeStyle = 'rgba(' + ORANGE + ',.6)'; x.strokeRect(g + 2.5, L.BACK - 65.5, 33, 8);
  text(x, 'TERMINAL 2 · TRUCK GATE', g + 19, L.BACK - 61.5, 'rgba(' + PAPER + ',.85)', 2.6, '600');
  const on = c.still || Math.floor(c.f / 24) % 2;
  x.fillStyle = on ? 'rgba(' + RED + ',.95)' : 'rgba(' + RED + ',.25)'; x.fillRect(g + 30, L.BACK - 53, 2, 2);
  // the booth, the guard is in it (PEOPLE); the barrier across the outbound lane, up for a truck, down between
  x.fillStyle = '#2a2026'; x.fillRect(b - 8, L.BACK - 22, 16, 22); x.fillStyle = 'rgba(255,217,138,.55)'; x.fillRect(b - 6, L.BACK - 18, 12, 7);
  const k = c.still ? 0 : Math.max(0, Math.sin(c.f * 0.012)), by = L.ROAD0 + 2;
  x.fillStyle = '#3a3036'; x.fillRect(b - 2, by - 8, 4, 9);
  x.save(); x.translate(b, by - 6); x.rotate(k * 1.3);
  for (let i = 0; i < 36; i += 5) { x.fillStyle = (i / 5) % 2 ? '#e8e0d0' : '#d83a2a'; x.fillRect(-i - 5, -1, 5, 2); }
  x.restore();
}

/** The bay bridge: a low deck, a plain railing, a few lamps; short pylons only at its ends, so the water and the Spire stay open. */
function bridge(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  const [X0, X1] = PLACES.bridge;
  if (!seen(c, X0 - 20, X1 + 20, 80)) return;
  const a = R(c.sx(X1)), b = R(c.sx(X0));
  x.fillStyle = '#3a2a3a'; x.fillRect(Math.max(-2, a), c.GY - 5, Math.min(c.W + 2, b) - Math.max(-2, a), 1);
  for (let X = X0; X < X1; X += 10) { const s = R(c.sx(X)); if (s > -2 && s < c.W + 2) x.fillRect(s, c.GY - 5, 1, 5); }
  for (const X of [X0 + 14, X1 - 14]) {
    const s = R(c.sx(X)); if (s < -20 || s > c.W + 20) continue;
    const top = c.GY - 46;
    x.fillStyle = '#1e1222'; x.fillRect(s - 3, top, 6, c.GY - top); x.fillRect(s - 5, top, 10, 3);
    x.fillStyle = 'rgba(' + ORANGE + ',.35)'; x.fillRect(s + 2, top, 1, c.GY - top);
    x.fillStyle = c.still || Math.floor(c.f / 20) % 2 ? 'rgba(' + RED + ',1)' : 'rgba(' + RED + ',.3)'; x.fillRect(s - 1, top - 3, 3, 3);
  }
  // lamps, far apart
  for (let X = X0 + 80; X < X1 - 40; X += 115) {
    const s = R(c.sx(X)); if (s < -30 || s > c.W + 30) continue;
    const top = L.BACK - 36; x.fillStyle = '#0e080c'; x.fillRect(s, top, 2, L.BACK - top); x.fillRect(s - 6, top, 8, 2);
    x.fillStyle = 'rgba(255,220,160,.95)'; x.fillRect(s - 6, top + 2, 4, 1);
    const gg = x.createRadialGradient(s - 4, top + 3, 1, s - 4, top + 3, 22); gg.addColorStop(0, 'rgba(255,210,150,.18)'); gg.addColorStop(1, 'rgba(255,210,150,0)'); x.fillStyle = gg; x.fillRect(s - 26, top - 18, 44, 44);
  }
}

/** The Galleria: its plinth on the plaza (shop windows, the doors with their ID gate, an ad screen), the terrace with its taxi pad, the dome on top. */
function galleria(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  const [X0, X1] = PLACES.galleria;
  if (!seen(c, X0 - 30, X1 + 10, 160)) return;
  const a = R(c.sx(X1)), b = R(c.sx(X0)), top = L.BACK - 58, w = b - a;
  placed(x, R((a + b) / 2), top - 6, 1.25, () => drawGalleriaDome(x, { fill: mixHex('#1a0e1e', '#3a2440', c.warm), lit: 1.5, label: false }));
  x.fillStyle = '#2a1830'; x.fillRect(a, top, w, L.BACK - top + 1);
  x.fillStyle = 'rgba(255,190,110,.55)'; x.fillRect(a, top, w, 1);
  x.fillStyle = 'rgba(255,217,165,.25)'; x.fillRect(a, top - 6, w, 1); for (let i = a; i < b; i += 6) x.fillRect(i, top - 6, 1, 6);
  // the public taxi pad on its pylon at the plaza's east end, a taxi landing, waiting, leaving
  taxiPad(x, c, L);
  for (let i = 0; i < 9; i++) {
    if (i === 4) continue;
    const wx = a + 6 + i * ((w - 12) / 9), wy = top + 18;
    x.fillStyle = 'rgba(255,200,140,.55)'; x.fillRect(R(wx), wy, 18, 22);
    x.fillStyle = 'rgba(' + ORANGE + ',.5)'; x.fillRect(R(wx), wy - 2, 18, 1);
    x.fillStyle = 'rgba(40,16,40,.6)'; x.fillRect(R(wx) + 4 + (i % 3) * 3, wy + 8, 3, 14); x.fillRect(R(wx) + 4 + (i % 3) * 3, wy + 5, 3, 3);
    if (i % 2) { x.fillStyle = 'rgba(40,16,40,.5)'; x.fillRect(R(wx) + 11, wy + 10, 4, 12); }
  }
  const dx = R(a + w / 2 - 12);
  x.fillStyle = 'rgba(255,230,190,.65)'; x.fillRect(dx, top + 16, 24, L.BACK - top - 16);
  x.fillStyle = 'rgba(40,20,30,.6)'; x.fillRect(dx + 11, top + 16, 2, L.BACK - top - 16);
  x.fillStyle = '#1a1018'; x.fillRect(dx - 6, L.BACK - 18, 4, 18);
  x.fillStyle = c.still || Math.floor(c.f / 30) % 3 ? 'rgba(' + RED + ',.95)' : 'rgba(' + RED + ',.3)'; x.fillRect(dx - 5, L.BACK - 16, 2, 2);
  placed(x, R(a + w / 2), top + 8, S, () => sign(x, c.f, 'GALLERIA', 0, 0, '255,190,110', { size: 13, phase: 40 }));
  const ads = ['VERIFIED CUSTOMERS ONLY', 'SCORE 600+ · FREE PARKING', 'IDENTITY CHECK AT ENTRANCE'], m = c.still ? 0 : Math.floor(c.f / 200) % ads.length;
  x.fillStyle = '#0c0610'; x.fillRect(a + 4, top + 4, 50, 10); x.strokeStyle = 'rgba(' + ORANGE + ',.45)'; x.lineWidth = 1; x.strokeRect(a + 4.5, top + 4.5, 49, 9);
  text(x, ads[m], a + 29, top + 9.5, 'rgba(' + PAPER + ',.85)', 3.4, '600');
  for (const X of [2800, 3110]) { const s = R(c.sx(X)); if (s < -20 || s > c.W + 20) continue; x.fillStyle = '#3a2c3c'; x.fillRect(s - 6, L.BACK - 6, 12, 6); x.fillStyle = '#1e2a1a'; x.beginPath(); x.arc(s, L.BACK - 12, 7, 0, 7); x.fill(); x.fillStyle = '#2a3a22'; x.fillRect(s, L.BACK - 6, 1, 4); }
}

/** The public taxi pad by the Galleria: a deck on a pylon, edge lights, the plate; a sky taxi comes down, waits, lifts off east. */
function taxiPad(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  const s = c.sx(2806);
  if (s < -120 || s > c.W + 140) return;
  const top = L.BACK - 70, on = c.still || Math.floor(c.f / 30) % 2 === 0;
  x.fillStyle = '#1a1018'; x.fillRect(R(s) - 3, top, 6, L.BACK - top); x.fillRect(R(s) - 22, top, 44, 4);
  x.fillStyle = 'rgba(255,217,165,.25)'; x.fillRect(R(s) - 22, top, 44, 1);
  x.fillStyle = on ? 'rgba(255,190,60,.95)' : 'rgba(255,190,60,.35)'; for (let k = 0; k < 5; k++) x.fillRect(R(s) - 22 + k * 10, top - 1, 3, 1);
  x.fillStyle = '#0d0705'; x.fillRect(R(s) - 14, top + 8, 28, 8); x.strokeStyle = 'rgba(255,190,60,.6)'; x.lineWidth = 1; x.strokeRect(R(s) - 13.5, top + 8.5, 27, 7);
  text(x, 'TAXI · PUBLIC', R(s), top + 12, 'rgba(255,190,60,.9)', 2.8, '600');
  // the taxi's cycle: in from the west, down onto the pad, a wait, up and away east
  const cyc = c.still ? 0.45 : (c.f % 1500) / 1500, ease = (v: number) => v * v * (3 - 2 * v);
  let dx = 0, dy = 0, face: 1 | -1 = 1;
  if (cyc < 0.3) { const k = ease(cyc / 0.3); dx = -160 * (1 - k); dy = -70 * (1 - k); face = 1; }
  else if (cyc < 0.62) { dx = 0; dy = 0; }
  else if (cyc < 0.95) { const k = ease((cyc - 0.62) / 0.33); dx = 200 * k; dy = -90 * k * k; face = 1; }
  else return;
  placed(x, R(s + dx), R(top - 6 + dy), S, () => drawCraft(x, 'taxi', { t: c.f, face, still: c.still, scale: S }));
}

/** The escalator from the plaza up to the Galleria's terrace, people riding it up with their shopping. */
const RIDERS_UP: Character[] = [
  { seed: 4181, look: { garb: 'coat', hair: 'long', extras: ['bag'] }, x: 0, act: 'stand', facing: 1 },
  { seed: 4182, look: { garb: 'jacket', hair: 'cap' }, x: 0, act: 'phone', facing: 1 },
  { seed: 4183, look: { body: 'old', garb: 'coat', hair: 'brim', extras: ['bag'] }, x: 0, act: 'stand', facing: 1 },
];
function escalator(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  const X0 = PLACES.galleria[0] - 28, X1 = PLACES.galleria[0] + 4;
  if (!seen(c, X1, X0, 40)) return;
  const s0 = c.sx(X0), s1 = c.sx(X1), y0 = L.MID, y1 = L.BACK - 58;
  x.strokeStyle = '#4a3450'; x.lineWidth = 5; x.beginPath(); x.moveTo(s0, y0); x.lineTo(s1, y1); x.stroke();
  x.strokeStyle = 'rgba(255,190,110,.6)'; x.lineWidth = 1; x.beginPath(); x.moveTo(s0, y0 - 6); x.lineTo(s1, y1 - 6); x.stroke();
  for (let i = 0; i < 3; i++) {
    const k = ((c.still ? 0.3 : c.f * 0.0025) + i / 3) % 1, px = lerp(s0, s1, k), py = lerp(y0, y1, k) - 2;
    placed(x, R(px), R(py), S, () => drawCharacter(x, frameView(c.f), RIDERS_UP[i]));
  }
}

/** The port's machines at work: a straddle carrier back in the yard, the reach stacker between STS-2 and STS-3, the hub's forklift, a yard tractor and the truck under STS-2. */
function machines(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  const f = c.still ? 0 : c.f, on = (X: number, pad = 160) => { const s = c.sx(X); return s > -pad && s < c.W + pad ? s : null; };
  // the straddle carrier out on the far side of the stacks, small with distance: only its top shows over them
  let s = on(1400 + Math.sin(f * 0.003) * 30);
  if (s !== null) placed(x, R(s), L.BACK - 2, S * 0.7, () => drawStraddle(x, { t: c.f, box: LOADS[1], lift: 0.5 + 0.5 * Math.cos(f * 0.003), face: Math.cos(f * 0.003) > 0 ? -1 : 1, still: c.still }));
  s = on(1955);
  if (s !== null) placed(x, R(s), L.MID, S, () => drawReachStacker(x, { t: c.f, box: LOADS[2], reach: 0.5 + 0.5 * Math.sin(f * 0.006), face: -1, still: c.still }));
  s = on(1330 + Math.sin(f * 0.01) * 18);
  if (s !== null) placed(x, R(s), L.MID, S, () => drawForklift(x, { t: c.f, lift: 0.5 + 0.5 * Math.sin(f * 0.02), face: Math.cos(f * 0.01) > 0 ? -1 : 1, still: c.still }));
  // the truck under STS-2, waiting for its box; a yard tractor shuttling empty between the stacks and the crane
  s = on(1760);
  if (s !== null) placed(x, R(s), L.FAR_LANE, S, () => drawTruck(x, { t: c.f, paint: '#2a4a6a', box: null, face: -1, still: c.still, yard: true }));
  const yt = (f * 0.004) % 2, yx = 1480 + (yt < 1 ? yt : 2 - yt) * 520;
  s = on(yx);
  if (s !== null) placed(x, R(s), L.NEAR_LANE - 2, S, () => drawTruck(x, { t: c.f, paint: '#c8a020', box: yt < 1 ? LOADS[3] : null, face: yt < 1 ? -1 : 1, still: c.still, yard: true, lights: true }));
}
