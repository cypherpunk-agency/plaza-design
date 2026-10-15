/**
 * The glide's near coast (glide.ts): ONE ground line from the title's beach to LINE 0's tunnel.
 * The strip under it changes material (sand, the quay, the bridge's deck over the bay, the
 * Galleria's plaza, Downtown's street) but never its height; every change is bridged by something
 * that belongs to both sides (the pier that starts on the sand and ends at the port's wall, the
 * quay's corner block, the bridge's abutments, the plaza's steps down to the street) and hidden by
 * a big dark thing passing close to the camera (`drawForeground`). One road runs from the port gate
 * to the tunnel, with traffic on it the whole way.
 *
 * Units: view units (glide.ts), X west of the title's middle (screen x = `sx(X)`), heights from the
 * ground line `GY` down the strip: BACK (where buildings and cranes stand), MID (people, machines),
 * the road's two lanes. The scenes' sets are drawn at a third of their size (`S`), so a person is
 * the same person as in a scene (characters.ts, ps 3).
 *
 * A pure function of the view: everything moves by the frame clock `f` (sudo can seek it).
 */

import { drawCharacter, type Character } from '../characters';
import { sign, text } from '../scenes/kit';
import { drawDrone } from '../sets/air-traffic';
import { drawBonfire, drawDjBooth, drawLounger } from '../sets/beach-party';
import { drawStringLights, saltBack, saltCounter, saltLights, saltLime, saltShell, saltUnder } from '../sets/beach-bar';
import { CH, container, PAL, stack, type Crate } from '../sets/containers';
import { drawGantry, GANTRIES, type Gantry } from '../sets/crane';
import { drawTower, towerRow, type Tower } from '../sets/downtown-towers';
import { drawGalleriaDome } from '../sets/galleria-dome';
import { drawPalm } from '../sets/palm';
import { drawCar, drawForklift, drawReachStacker, drawStraddle, drawTruck } from '../sets/vehicles';
import { frameView, placed } from '../sets/view';

/** The scenes' sets at the near coast: a third of their size. */
export const S = 1 / 3;

/** Where things are along the coast (X, view units west of the title's middle). */
export const PLACES = {
  /** The pier: its stairs on the sand, its seaward end at the port's wall. */
  pier: [400, 606] as [number, number],
  /** The sand ends at the port's corner block. */
  sand: 615,
  gate: 668,
  harbor: 940,
  quayEnd: 1680,
  bridge: [1690, 2130] as [number, number],
  plaza: [2130, 2470] as [number, number],
  galleria: 2305,
  street: 2470,
};
/** Where LINE 0's cutting opens in the street (the train runs down it to the portal, glide.ts), and its length. */
export const CUTTING = 2826, RAMP = 176;
/** Where the road starts (the port gate) and where it ends, at the railing before the cutting. */
const ROAD0 = 640, ROAD1 = CUTTING - 6;

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

const PAPER = '255,217,165', ORANGE = '255,136,0', RED = '255,42,68', DAWN = '255,150,90';
const R = Math.round;
const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const hex = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mixHex = (a: string, b: string, f: number) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => R(lerp(v, B[i], f)).toString(16).padStart(2, '0')).join(''); };
const HIVIS = { garb: 'hivis' as const, hair: 'helmet' as const, acc: '#e8c020' };

/** The strip's lines (heights below the ground line scale with the strip's depth). */
function lines(c: CoastView) {
  const band = c.H - c.GY, k = band / 35;
  return { k, BACK: c.GY + R(3 * k), MID: c.GY + R(14 * k), BEACH: c.GY + R(19 * k), PIER: c.GY - R(14 * k), ROAD0: c.GY + R(18 * k), ROAD1: c.GY + R(30 * k), FAR_LANE: c.GY + R(23 * k), NEAR_LANE: c.GY + R(30 * k) };
}
type Lines = ReturnType<typeof lines>;
type Line = 'back' | 'mid' | 'beach' | 'pier' | 'shallows' | 'terrace';
const lineY = (L: Lines, c: CoastView, l: Line) => l === 'back' ? L.BACK : l === 'mid' ? L.MID : l === 'beach' ? L.BEACH : l === 'pier' ? L.PIER : l === 'terrace' ? L.BACK - 58 : c.GY + 4;

/** Is the stretch X0..X1 (either order) on screen? */
const seen = (c: CoastView, X0: number, X1: number, pad = 20) => { const a = c.sx(Math.max(X0, X1)), b = c.sx(Math.min(X0, X1)); return b > -pad && a < c.W + pad; };

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
  // further along the sand toward the pier
  P(300, 'beach', { seed: 4121, look: { garb: 'coat', hair: 'hood' }, act: 'walk', range: [-150, 150], speed: 0.3 }),
  P(312, 'beach', { seed: 4122, look: { garb: 'tee', hair: 'bun', extras: ['bag'] }, act: 'walk', range: [-150, 150], speed: 0.3 }),
  P(380, 'beach', { look: { bot: 'litterbot', paint: '#c8641e' }, act: 'roll', range: [-120, 120] }),
  P(470, 'beach', { seed: 4123, look: { body: 'kid', garb: 'tee', hair: 'short' }, act: 'walk', range: [-60, 90], speed: 0.6 }),
  P(540, 'beach', { look: 'gull', act: 'walk', range: [-30, 30] }),
  // on the pier: black against the sun
  P(440, 'pier', { seed: 4131, look: { garb: 'coat', hair: 'long' }, act: 'stand', facing: -1, dim: 0.93 }),
  P(447, 'pier', { seed: 4132, look: { garb: 'jacket', hair: 'short' }, act: 'stand', facing: 1, dim: 0.93 }),
  P(492, 'pier', { seed: 4133, look: { garb: 'dress', hair: 'bun' }, act: 'dance', dim: 0.93 }),
  P(503, 'pier', { seed: 4134, look: { garb: 'tee', hair: 'cap' }, act: 'dance', facing: -1, dim: 0.93 }),
  P(514, 'pier', { seed: 4135, look: { body: 'wide', garb: 'tee', hair: 'bald' }, act: 'dance', dim: 0.93 }),
  P(556, 'pier', { seed: 4136, look: { garb: 'jacket', hair: 'hood' }, act: 'phone', dim: 0.93 }),
  P(588, 'pier', { seed: 4137, look: { body: 'old', garb: 'coat', hair: 'brim' }, act: 'sit', h: 2, facing: 1, dim: 0.93 }),
  // the port: a marshal bot waving trucks through, dockers in hi-vis, a guard in the booth
  P(700, 'mid', { look: { bot: 'marshal' }, act: 'direct', facing: -1 }),
  P(668, 'back', { seed: 4141, look: { body: 'wide', garb: 'suit', hair: 'cap', acc: '#2a2a30' }, act: 'stand', facing: -1 }),
  P(862, 'mid', { seed: 4142, look: { ...HIVIS, body: 'avg' }, act: 'walk', range: [-60, 80], speed: 0.3 }),
  P(944, 'mid', { seed: 4143, look: { ...HIVIS, body: 'wide' }, act: 'stand', facing: 1 }),
  P(1012, 'mid', { seed: 4144, look: { ...HIVIS, body: 'slim', extras: ['phone'] }, act: 'phone', facing: -1 }),
  P(1160, 'mid', { seed: 4145, look: { ...HIVIS, body: 'tall' }, act: 'walk', range: [-90, 60], speed: 0.35 }),
  P(1300, 'mid', { seed: 4146, look: { ...HIVIS, body: 'short' }, act: 'stand' }),
  P(1424, 'mid', { seed: 4147, look: { ...HIVIS, body: 'avg' }, act: 'smoke', facing: 1 }),
  P(1432, 'mid', { seed: 4148, look: { ...HIVIS, body: 'old' }, act: 'haggle', facing: -1 }),
  P(1536, 'mid', { seed: 4149, look: { ...HIVIS, body: 'avg', extras: ['backpack'] }, act: 'walk', range: [-80, 80], speed: 0.3 }),
  P(1600, 'mid', { look: { bot: 'loader', paint: '#c8641e' }, act: 'carry', range: [-60, 60] }),
  // the bridge's walkway
  P(1760, 'mid', { seed: 4151, look: { garb: 'jacket', hair: 'short', extras: ['backpack'] }, act: 'walk', range: [-200, 200], speed: 0.45 }),
  P(1890, 'mid', { seed: 4152, look: { garb: 'coat', hair: 'long', extras: ['headphones'] }, act: 'walk', range: [-150, 250], speed: 0.6 }),
  P(1980, 'mid', { look: { bot: 'deliverybot' }, act: 'roll', range: [-180, 180] }),
  P(2070, 'mid', { seed: 4153, look: { body: 'old', garb: 'coat', hair: 'brim', extras: ['cane'] }, act: 'walk', range: [-60, 60], speed: 0.15 }),
  // the Galleria's plaza: shoppers, a busker, a sweeper, security at the door
  P(2160, 'mid', { seed: 4161, look: { garb: 'dress', hair: 'bun', extras: ['bag'] }, act: 'walk', range: [-90, 120], speed: 0.3 }),
  P(2228, 'mid', { seed: 4162, look: { garb: 'suit', hair: 'short', extras: ['bag', 'phone'] }, act: 'phone' }),
  P(2262, 'mid', { look: { bot: 'mech' }, act: 'patrol', range: [-30, 30] }),
  P(2300, 'mid', { seed: 4163, look: { garb: 'coat', hair: 'long', extras: ['bag'] }, act: 'queue' }),
  P(2310, 'mid', { seed: 4164, look: { body: 'kid', garb: 'tee', hair: 'cap' }, act: 'queue' }),
  P(2320, 'mid', { seed: 4165, look: { body: 'wide', garb: 'jacket', hair: 'beanie', extras: ['bag'] }, act: 'queue' }),
  P(2368, 'mid', { look: { bot: 'busker' }, act: 'play' }),
  P(2410, 'mid', { look: { bot: 'sweeper' }, act: 'sweep', range: [-90, 60] }),
  P(2440, 'mid', { seed: 4166, look: { garb: 'jacket', hair: 'mohawk', extras: ['bag'] }, act: 'walk', range: [-120, 80], speed: 0.4 }),
  // Downtown's pavement: umbrellas out, a courier, a drone checking papers
  P(2530, 'mid', { seed: 4171, look: { garb: 'coat', hair: 'hood', extras: ['umbrella'] }, act: 'walk', range: [-100, 140], speed: 0.3 }),
  P(2600, 'mid', { seed: 4172, look: { garb: 'suit', hair: 'short', extras: ['umbrella'] }, act: 'walk', range: [-160, 60], speed: 0.4, facing: -1 }),
  P(2648, 'mid', { seed: 4173, look: { garb: 'jacket', hair: 'beanie' }, act: 'queue' }),
  P(2660, 'mid', { seed: 4174, look: { body: 'old', garb: 'coat', hair: 'scarf' }, act: 'queue' }),
  P(2700, 'mid', { look: 'drone', h: 40, act: 'scan', range: [-80, 80], speed: 0.3 }),
  P(2740, 'mid', { look: { bot: 'android' }, act: 'walk', range: [-120, 120] }),
  P(2770, 'mid', { seed: 4175, look: { garb: 'dress', hair: 'long', extras: ['umbrella'] }, act: 'walk', range: [-80, 60], speed: 0.25 }),
];

/** Palms: X, standing on (back: behind the people; front: at the bottom of the view), height, lean, seed. */
const PALMS: [number, 'back' | 'front', number, number, number][] = [
  [238, 'front', 150, 26, 1], [90, 'back', 112, 14, 4], [-76, 'back', 80, -10, 11], [-196, 'front', 128, -20, 5], [-262, 'back', 92, -6, 6],
  [338, 'back', 70, 10, 7], [452, 'back', 98, -8, 8], [575, 'front', 70, 14, 9],
];
/** Loungers on the beach: X, canopy colour, flipped. */
const LOUNGERS: [number, string, boolean][] = [[-112, '#c83a2a', false], [-152, '#d8b040', false], [-300, '#3a6ad8', true], [262, '#e8e0d0', true]];

/** The stacks behind the cranes: the left edge's X, its boxes bottom up (the containers set). */
const STACKS: { X: number; boxes: Crate[] }[] = [
  { X: 760, boxes: [{ w: 128, p: 0, seed: 81, code: 'MRDU 220 1180' }, { w: 128, p: 5, seed: 82, dx: -4 }] },
  { X: 812, boxes: [{ w: 128, p: 3, seed: 83 }, { w: 128, p: 1, seed: 84, dx: 5 }, { w: 66, p: 6, seed: 85, dx: 30 }] },
  { X: 1000, boxes: [{ w: 128, p: 2, seed: 86, code: 'TDLU 404 7710' }] },
  { X: 1062, boxes: [{ w: 128, p: 7, seed: 87, code: 'NRLU 404 0451' }, { w: 128, p: 6, seed: 88, dx: -6 }, { w: 128, p: 0, seed: 89, dx: 4 }] },
  { X: 1205, boxes: [{ w: 128, p: 4, seed: 90, code: 'KSNU 118 0090' }, { w: 66, p: 2, seed: 91, dx: 8 }] },
  { X: 1262, boxes: [{ w: 128, p: 1, seed: 92 }] },
  { X: 1350, boxes: [{ w: 128, p: 3, seed: 93 }, { w: 128, p: 5, seed: 94, dx: 6 }, { w: 128, p: 2, seed: 95, dx: -3 }] },
  { X: 1408, boxes: [{ w: 128, p: 0, seed: 96 }, { w: 128, p: 7, seed: 97, dx: 4 }] },
  { X: 1572, boxes: [{ w: 66, p: 4, seed: 98 }, { w: 66, p: 1, seed: 99 }] },
];
/** The cranes along the quay, one boom apart and more: X of the origin, which, the boom's pose. STS-2 works. */
const CRANES: { X: number; id: 'sts1' | 'sts2' | 'sts3'; up: number; ph: number }[] = [
  { X: 846, id: 'sts1', up: 1, ph: 0 }, { X: 1150, id: 'sts2', up: 0, ph: 1.3 }, { X: 1488, id: 'sts3', up: 0.94, ph: 2.1 },
];
/** STS-2 in the glide: its boom shortened to fit the quay (the stacks' is longer). */
const STS2_GLIDE: Gantry = { ...GANTRIES.sts2, boom: { ...GANTRIES.sts2.boom, x0: -260, x1: 600 }, stays: [[-256, 0], [596, 0], [380, 4]] };
/** The box STS-2 is moving onto the ship this time. */
const LIFT: Crate = { w: 128, p: 3, seed: 61 };
/** Boxes on trucks, for the road. */
const LOADS: Crate[] = [{ w: 128, p: 2, seed: 71 }, { w: 128, p: 5, seed: 72 }, { w: 128, p: 0, seed: 73 }, { w: 128, p: 6, seed: 74 }];
const CAR_PAINTS = ['#8a2a2a', '#2a4a6a', '#c8c0b0', '#3a3a3a', '#6a5a2a', '#e8e0d0', '#4a2a4a'];
/** Downtown: a row of towers far behind (depth 0.6, across the water), and the street's own row. */
const SIGNS = [
  { text: 'NOODLES · NO LOGS KEPT', col: ORANGE }, { text: 'REGISTRY PREMIUM', col: ORANGE }, { text: 'CAPSULE 7B', col: PAPER },
  { text: 'IDENTITY CHECK AHEAD', col: PAPER }, { text: 'CREDIT 24H', col: ORANGE }, { text: 'QUEUE 4', col: PAPER },
];
const TOWERS_FAR = towerRow(41, 30, [40, 90], [200, 380], SIGNS.slice(3));
const TOWERS: (Tower & { x: number })[] = towerRow(47, 22, [70, 130], [320, 520], SIGNS.slice(0, 3));
/** Lamp posts on the bridge, the plaza and the street (X). */
const LAMPS = [1720, 1790, 1860, 1930, 2000, 2070, 2190, 2450, 2540, 2620, 2700, 2780, 2860];

/** The traffic on the road: lane, direction (1 east), speed (view units a frame), gap, what drives. */
const TRAFFIC: { lane: 'far' | 'near'; dir: 1 | -1; v: number; gap: number; kinds: ('truck' | 'car' | 'van' | 'cab')[] }[] = [
  { lane: 'far', dir: 1, v: 0.55, gap: 190, kinds: ['truck', 'car', 'truck', 'van', 'cab', 'car'] },
  { lane: 'near', dir: -1, v: 0.7, gap: 230, kinds: ['car', 'truck', 'cab', 'car', 'van', 'truck', 'car'] },
];

// ---------- the coast ----------

export function drawCoast(x: CanvasRenderingContext2D, c: CoastView) {
  const L = lines(c);
  farTowers(x, c, L);
  ship(x, c);
  ground(x, c, L);
  pier(x, c, L);
  // the back line: buildings, stacks, cranes, the plinth, the bar
  palms(x, c, L, 'back');
  salt(x, c, L);
  gate(x, c, L);
  harbor(x, c, L);
  bridge(x, c);
  galleria(x, c, L);
  downtown(x, c, L);
  lamps(x, c, L);
  // the middle: people, the port's machines, the beach's things
  beach(x, c, L);
  machines(x, c, L);
  for (const w of PEOPLE) {
    const s = c.sx(w.X);
    if (s < -60 || s > c.W + 60) continue;
    placed(x, R(s), lineY(L, c, w.line), S, () => drawCharacter(x, frameView(c.f), w.c));
  }
  escalator(x, c, L);
  traffic(x, c, L);
  drones(x, c, L);
  palms(x, c, L, 'front');
}

/** The strip under the ground line, material by material; the seams between them carry their own pieces. */
function ground(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  const { GY, W } = c, bottom = c.H + 90;
  const span = (X0: number, X1: number) => { const a = Math.max(-2, Math.floor(c.sx(X1))), b = Math.min(W + 2, Math.ceil(c.sx(X0))); return b > a ? [a, b] : null; };
  const fill = (X0: number, X1: number, top: string, low: string, from = GY) => {
    const s = span(X0, X1); if (!s) return null;
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
      // shells and footprints in the sand, fixed to the beach
      if (hash(wx * 0.37) > 0.93) { x.fillStyle = 'rgba(30,10,20,.35)'; x.fillRect(px, GY + 12 + R(hash(wx) * (c.H - GY - 14)), 2, 1); }
    }
    const br = c.still ? 0.5 : (c.t * 0.5) % 1; x.fillStyle = 'rgba(255,240,230,' + (0.55 * Math.sin(br * Math.PI) * lerp(0.4, 1, c.warm)).toFixed(2) + ')'; x.fillRect(a, GY - 3 + R(br * 3), b - a, 1);
  }
  // the quay: concrete, its coping along the water, the cranes' rails, bollards
  const quay = fill(PLACES.sand, PLACES.quayEnd, '#2e2228', '#120c10');
  if (quay) {
    const [a, b] = quay;
    x.fillStyle = '#4a3a40'; x.fillRect(a, GY, b - a, 2); x.fillStyle = 'rgba(' + ORANGE + ',.55)'; x.fillRect(a, GY, b - a, 1);
    x.fillStyle = 'rgba(200,180,170,.25)'; x.fillRect(a, L.BACK - 1, b - a, 1); x.fillRect(a, L.BACK + 2, b - a, 1);
    for (let X = 660; X < PLACES.quayEnd; X += 46) { const s = c.sx(X); if (s < a - 4 || s > b + 4) continue; x.fillStyle = '#16100e'; x.fillRect(R(s), GY - 3, 4, 4); x.fillStyle = 'rgba(' + ORANGE + ',.5)'; x.fillRect(R(s), GY - 3, 4, 1); }
    // sand blown onto the quay by its corner
    for (let i = 0; i < 9; i++) { const s = c.sx(PLACES.sand + 4 + i * 5 + hash(i) * 4); x.fillStyle = 'rgba(120,64,80,' + (0.5 - i * 0.05).toFixed(2) + ')'; x.fillRect(R(s), GY + 4 + R(hash(i + 3) * 20), 3 + R(hash(i + 5) * 4), 1); }
  }
  // the bridge: its walkway and deck, the girder's face, the bay under it
  const br = span(PLACES.bridge[0] - 10, PLACES.bridge[1]);
  if (br) {
    const [a, b] = br, deckBot = L.ROAD1 + R(4 * L.k);
    // the bay under the deck, the water catching the bridge's lamps
    const wg = x.createLinearGradient(0, deckBot, 0, c.H); wg.addColorStop(0, mixHex('#1a0828', '#3a1446', c.warm)); wg.addColorStop(1, '#0c0414');
    x.fillStyle = wg; x.fillRect(a, deckBot, b - a, bottom - deckBot);
    for (let i = 0; i < 26; i++) { const px = a + ((i * 53 + (c.still ? 0 : c.f * 0.2) - c.g * 0.6) % (b - a + 40) + (b - a + 40)) % (b - a + 40) - 20, py = deckBot + 3 + (i * 7) % Math.max(4, c.H - deckBot - 2); x.fillStyle = 'rgba(255,190,200,' + (0.08 + (i % 3) * 0.04).toFixed(2) + ')'; x.fillRect(R(px), R(py), 4 + (i % 4) * 2, 1); }
    x.fillStyle = '#2a1e2c'; x.fillRect(a, GY, b - a, L.ROAD0 - GY);
    x.fillStyle = '#1a1220'; x.fillRect(a, L.ROAD1, b - a, deckBot - L.ROAD1);
    x.fillStyle = 'rgba(' + ORANGE + ',.4)'; x.fillRect(a, deckBot - 1, b - a, 1);
    // the girder's lights under the deck
    for (let X = PLACES.bridge[0] + 8; X < PLACES.bridge[1]; X += 24) { const s = c.sx(X); if (s < a || s > b) continue; x.fillStyle = 'rgba(255,214,150,.55)'; x.fillRect(R(s), deckBot - 3, 2, 1); x.fillStyle = 'rgba(255,214,150,.12)'; x.fillRect(R(s), deckBot + 2, 2, 8); }
  }
  // the plaza: pale paving, a grid of joints
  const pl = fill(PLACES.plaza[0], PLACES.plaza[1], '#3a2c3c', '#1a121c');
  if (pl) {
    const [a, b] = pl;
    x.fillStyle = 'rgba(255,217,165,.08)'; for (let X = PLACES.plaza[0]; X < PLACES.plaza[1]; X += 12) { const s = c.sx(X); if (s > a && s < b) x.fillRect(R(s), GY, 1, L.ROAD0 - GY); }
    x.fillRect(a, GY + R(6 * L.k), b - a, 1); x.fillRect(a, GY + R(12 * L.k), b - a, 1);
  }
  // the street: the pavement, its kerb, wet when it rains
  const st = fill(PLACES.street, ROAD1 + 400, '#241a22', '#0e0a0e');
  if (st) {
    const [a, b] = st;
    x.fillStyle = 'rgba(255,217,165,.07)'; for (let X = PLACES.street; X < ROAD1; X += 9) { const s = c.sx(X); if (s > a && s < b) x.fillRect(R(s), GY, 1, L.ROAD0 - GY); }
    if (c.rain > 0) {
      // puddles: the neon and the lamps, broken up
      for (let i = 0; i < 22; i++) { const X = PLACES.street + 20 + i * 37, s = c.sx(X); if (s < a - 20 || s > b + 20) continue; const col = ['255,136,0', '255,61,242', '255,217,165', '0,229,229'][i % 4]; x.fillStyle = 'rgba(' + col + ',' + (0.18 * c.rain).toFixed(3) + ')'; x.fillRect(R(s), GY + 3 + (i % 3) * 3, 8 + (i % 5) * 3, 1); }
    }
  }
  // the road: one, from the port gate to the tunnel, its centre line
  const rd = span(ROAD0, ROAD1);
  if (rd) {
    const [a, b] = rd;
    x.fillStyle = '#151014'; x.fillRect(a, L.ROAD0, b - a, L.ROAD1 - L.ROAD0);
    x.fillStyle = 'rgba(255,217,165,.18)'; x.fillRect(a, L.ROAD0, b - a, 1);
    const mid = R((L.ROAD0 + L.ROAD1) / 2);
    x.fillStyle = 'rgba(255,217,165,' + (c.rain > 0 ? 0.45 : 0.35) + ')';
    for (let px = a; px < b; px++) if ((((px - c.g) % 14) + 14) % 14 < 6) x.fillRect(px, mid, 1, 1);
    if (c.rain > 0) { x.fillStyle = 'rgba(160,170,220,' + (0.08 * c.rain).toFixed(3) + ')'; x.fillRect(a, L.ROAD0 + 1, b - a, L.ROAD1 - L.ROAD0 - 1); }
  }
  // the seams' own pieces: the port's corner block, the bridge's abutments, the plaza's steps
  seamPieces(x, c);
}

function seamPieces(x: CanvasRenderingContext2D, c: CoastView) {
  const { GY } = c, bottom = c.H + 90;
  // the port's corner block: the quay's concrete ending on the sand, steps down on the beach side
  let s = c.sx(PLACES.sand);
  if (s > -30 && s < c.W + 30) {
    x.fillStyle = '#3a2c32'; x.fillRect(R(s) - 2, GY - 4, 10, bottom - GY);
    x.fillStyle = 'rgba(' + ORANGE + ',.6)'; x.fillRect(R(s) - 2, GY - 4, 10, 1); x.fillRect(R(s) + 7, GY - 4, 1, bottom - GY);
    for (let k = 0; k < 4; k++) { x.fillStyle = k % 2 ? '#2e2228' : '#3a2c32'; x.fillRect(R(s) + 8 + k * 0, GY + k * 4, 10 - k * 2, 4); x.fillStyle = 'rgba(255,217,165,.2)'; x.fillRect(R(s) + 8, GY + k * 4, 10 - k * 2, 1); }
  }
  // the bridge's abutments: concrete blocks going down into the bay at both ends
  for (const X of [PLACES.bridge[0] - 6, PLACES.bridge[1]]) {
    s = c.sx(X);
    if (s < -30 || s > c.W + 30) continue;
    x.fillStyle = '#2e2228'; x.fillRect(R(s) - 8, GY, 16, bottom - GY);
    x.fillStyle = 'rgba(' + ORANGE + ',.45)'; x.fillRect(R(s) - 8, GY, 1, bottom - GY); x.fillRect(R(s) + 7, GY, 1, bottom - GY);
    x.fillStyle = 'rgba(0,0,0,.3)'; for (let h = GY + 6; h < c.H + 40; h += 6) x.fillRect(R(s) - 7, h, 14, 1);
  }
  // the plaza's steps down to the street
  s = c.sx(PLACES.street);
  if (s > -30 && s < c.W + 30) for (let k = 0; k < 4; k++) { x.fillStyle = k % 2 ? '#3a2c3c' : '#2e2232'; x.fillRect(R(s) - 6 + k * 0, GY + k * 3, 14, 3); x.fillStyle = 'rgba(255,217,165,.25)'; x.fillRect(R(s) - 6, GY + k * 3, 14, 1); }
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
    // the stools in front of the counter
    for (const sx of [40, 96, 170]) { x.fillStyle = '#5a3a24'; x.fillRect(sx - 1, -14, 2, 14); x.fillStyle = '#8a5a3a'; x.fillRect(sx - 5, -16, 10, 3); }
    saltLights(x, w, c.f, c.still);
    // the long run out over the dance floor, to its own pole
    x.fillStyle = '#3a2618'; x.fillRect(558, -82, 3, 82); x.fillRect(554, -82, 11, 2);
    drawStringLights(x, w + 46, 84, 560, 80, c.f, { sag: 12, phase: 3, still: c.still });
  });
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

/** The pier: a deck out over the water on its piles, stairs down to the sand, lamps and lights, a harbour light at its end. */
function pier(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  const [X0, X1] = PLACES.pier;
  if (!seen(c, X0 - 30, X1 + 10)) return;
  const a = R(c.sx(X1)), b = R(c.sx(X0)), deck = L.PIER, k = L.k;
  const ink = '#0a0310';
  // the piles into the water, and their reflections
  for (let X = X0 + 6; X <= X1; X += 15) { const s = R(c.sx(X)); x.fillStyle = ink; x.fillRect(s, deck, 2, c.GY - deck + 1); x.fillStyle = 'rgba(10,3,16,.45)'; x.fillRect(s, c.GY + 1, 2, 4); }
  // the deck and its railing
  x.fillStyle = ink; x.fillRect(a, deck - 1, b - a, 3);
  x.fillRect(a, deck - 8, b - a, 1); for (let X = X0; X <= X1; X += 8) x.fillRect(R(c.sx(X)), deck - 8, 1, 8);
  // stairs from the deck down to the sand at the land end
  for (let i = 0; i < 6; i++) x.fillRect(b - 2 + i * 3, deck + R(i * (L.BEACH - deck) / 6), 4, 2);
  x.fillRect(b + 16, deck, 1, L.BEACH - deck);
  // lamps along it and string lights between them
  const posts = [X0 + 40, X0 + 110, X0 + 180];
  for (const X of posts) { const s = R(c.sx(X)); x.fillStyle = ink; x.fillRect(s, deck - 26, 1, 26); x.fillRect(s - 2, deck - 27, 5, 1); x.fillStyle = 'rgba(255,220,160,.9)'; x.fillRect(s - 1, deck - 26, 3, 1); }
  for (let i = 0; i + 1 < posts.length; i++) {
    const s0 = c.sx(posts[i + 1]), s1 = c.sx(posts[i]);
    placed(x, R(s0), deck, S, () => drawStringLights(x, 0, 72, (s1 - s0) / S, 72, c.f, { sag: 6, phase: i, still: c.still }));
  }
  // the harbour light at its end: green, on a mast, the port's
  const e = R(c.sx(X1 - 2));
  x.fillStyle = ink; x.fillRect(e, deck - 36, 2, 36);
  const on = c.still || Math.floor(c.f / 40) % 2 === 0;
  x.fillStyle = on ? 'rgba(80,255,140,.95)' : 'rgba(40,120,70,.5)'; x.fillRect(e - 1, deck - 39, 4, 3);
  if (on) { const gg = x.createRadialGradient(e + 1, deck - 38, 0, e + 1, deck - 38, 10); gg.addColorStop(0, 'rgba(80,255,140,.3)'); gg.addColorStop(1, 'rgba(80,255,140,0)'); x.fillStyle = gg; x.fillRect(e - 10, deck - 48, 22, 22); }
  void k;
}

/** The ship at the quay behind the cranes: a long hull, boxes on deck, the bridge house aft with its lit windows. */
function ship(x: CanvasRenderingContext2D, c: CoastView) {
  const X0 = 790, X1 = 1530;
  if (!seen(c, X0, X1)) return;
  const a = R(c.sx(X1)), b = R(c.sx(X0)), top = c.GY - 22;
  x.fillStyle = '#1c1220'; x.fillRect(a, top, b - a, c.GY - top);
  x.beginPath(); x.moveTo(b, top); x.lineTo(b + 12, top - 4); x.lineTo(b + 6, c.GY); x.lineTo(b, c.GY); x.fill();
  x.fillStyle = 'rgba(200,60,60,.5)'; x.fillRect(a, c.GY - 4, b - a + 6, 1);
  x.fillStyle = 'rgba(255,170,120,.35)'; x.fillRect(a, top, b - a + 10, 1);
  // boxes on deck: rows of small blocks, faded paint
  for (let X = X0 + 40, i = 0; X < X1 - 70; X += 15, i++) {
    const s = R(c.sx(X)), n = 1 + R(hash(i + 3) * 2);
    for (let j = 0; j < n; j++) { x.fillStyle = PAL[(i * 3 + j) % PAL.length][0]; x.fillRect(s - 14, top - 6 - j * 6, 14, 6); x.fillStyle = 'rgba(255,217,165,.12)'; x.fillRect(s - 14, top - 6 - j * 6, 14, 1); }
  }
  // the bridge house aft (west), its windows, a mast, the funnel
  const h = R(c.sx(X1 - 30));
  x.fillStyle = '#241828'; x.fillRect(h - 18, top - 46, 30, 46); x.fillRect(h - 22, top - 50, 38, 5);
  x.fillStyle = 'rgba(255,214,150,.6)'; for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) if (hash(r * 5 + q) > 0.35) x.fillRect(h - 15 + q * 7, top - 40 + r * 9, 4, 3);
  x.fillStyle = '#3a1a1a'; x.fillRect(h + 2, top - 62, 8, 12); x.fillStyle = 'rgba(200,60,60,.6)'; x.fillRect(h + 2, top - 58, 8, 2);
  x.fillStyle = '#241828'; x.fillRect(h - 8, top - 70, 1, 20);
  x.fillStyle = c.still || Math.floor(c.f / 30) % 2 ? 'rgba(' + RED + ',.9)' : 'rgba(' + RED + ',.3)'; x.fillRect(h - 9, top - 72, 3, 2);
}

/** Downtown's far row, across the water behind the Galleria (depth 0.6): it hides the sun first. */
function farTowers(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  const p = 0.6, X0 = 1900, sc = 0.42;
  for (const b of TOWERS_FAR) {
    const s = c.W / 2 + p * (c.g - (X0 + b.x * sc / p)) - b.w * sc;
    if (s > c.W + 4 || s + b.w * sc < -4) continue;
    placed(x, R(s), c.GY - 2, sc, () => drawTower(x, b, { t: c.f, still: c.still, fill: mixHex('#160c1c', '#2a1434', c.warm * (1 - c.city * 0.3)), edge: 0.22, lit: 0.08, glow: 0.45, below: 40 }));
  }
  void L;
}

/** The port gate: the fence along the quay, the booth with its guard, the barrier on the road, a camera on a pole. */
function gate(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  if (!seen(c, 615, 720, 40)) return;
  const fx = (X: number) => R(c.sx(X)), top = L.BACK - 15;
  // chain-link fence on posts, its mesh, the barbed wire on top
  x.fillStyle = '#4a3e44'; for (let X = 620; X <= 652; X += 8) x.fillRect(fx(X), top, 1, L.BACK - top);
  x.fillRect(fx(652), top, fx(620) - fx(652), 1); x.fillRect(fx(652), top + 7, fx(620) - fx(652), 1);
  x.fillStyle = 'rgba(160,140,150,.18)'; for (let i = fx(652); i < fx(620); i += 2) for (let j = top + 1; j < L.BACK; j += 2) x.fillRect(i + ((j >> 1) % 2), j, 1, 1);
  x.strokeStyle = 'rgba(160,140,150,.5)'; x.lineWidth = 0.5; x.beginPath(); for (let i = fx(652); i < fx(620); i += 3) { x.moveTo(i, top - 1); x.lineTo(i + 2, top - 3); } x.stroke();
  // the booth: lit window, the guard is in it (PEOPLE), PORT AUTHORITY on a plate on its roof
  const b = fx(676);
  x.fillStyle = '#2a2026'; x.fillRect(b, L.BACK - 22, 18, 22); x.fillStyle = 'rgba(' + ORANGE + ',.5)'; x.fillRect(b, L.BACK - 22, 18, 1);
  x.fillStyle = 'rgba(255,217,138,.55)'; x.fillRect(b + 2, L.BACK - 18, 14, 7);
  x.fillStyle = '#0d0705'; x.fillRect(b - 6, L.BACK - 30, 30, 7); x.strokeStyle = 'rgba(' + ORANGE + ',.6)'; x.lineWidth = 1; x.strokeRect(b - 5.5, L.BACK - 29.5, 29, 6);
  x.fillStyle = 'rgba(' + ORANGE + ',.4)'; x.fillRect(b, L.BACK - 23, 1, 1); x.fillRect(b + 17, L.BACK - 23, 1, 1);
  text(x, 'PORT AUTHORITY', b + 9, L.BACK - 26.5, 'rgba(' + PAPER + ',.85)', 3.4, '600');
  // the barrier across the road, rising and falling with the trucks
  const k = c.still ? 0 : Math.max(0, Math.sin(c.f * 0.012)), bx = fx(690), by = L.ROAD0 - 1;
  x.fillStyle = '#3a3036'; x.fillRect(bx - 2, by - 8, 4, 9);
  x.save(); x.translate(bx, by - 6); x.rotate(-k * 1.3);
  for (let i = 0; i < 30; i += 5) { x.fillStyle = (i / 5) % 2 ? '#e8e0d0' : '#d83a2a'; x.fillRect(i, -1, 5, 2); }
  x.restore();
  // the camera on its pole, watching the road
  const cp = fx(656);
  x.fillStyle = '#3a3036'; x.fillRect(cp, L.BACK - 34, 1, 34); x.fillRect(cp - 4, L.BACK - 35, 6, 3);
  x.fillStyle = c.still || Math.floor(c.f / 24) % 2 ? 'rgba(' + RED + ',.95)' : 'rgba(' + RED + ',.25)'; x.fillRect(cp - 4, L.BACK - 34, 1, 1);
}

/** The harbor: the stacks, the cranes (STS-2 at work), the light masts, the port office and its cars. */
function harbor(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  if (!seen(c, 700, PLACES.quayEnd, 260)) return;
  for (const st of STACKS) {
    const s = c.sx(st.X);
    if (s < -60 || s > c.W + 20) continue;
    placed(x, R(s), L.BACK, S, () => stack(x, frameView(c.f), 0, st.boxes));
  }
  for (const cr of CRANES) {
    const s = c.sx(cr.X);
    if (s < -240 || s > c.W + 120) continue;
    placed(x, R(s), L.BACK, S, () => {
      const g = cr.id === 'sts2' ? STS2_GLIDE : GANTRIES[cr.id];
      drawGantry(x, g, c.f, 'all', cr.ph, c.still, { paint: mixHex('#5a2410', '#b4561c', c.warm), lit: 0.5, rim: 0.55, boomUp: cr.up });
      if (cr.id === 'sts2') sts2Load(x, c, L);
    });
  }
  // light masts, their lamps still on in the dawn
  for (const X of [760, 990, 1296, 1626]) {
    const s = c.sx(X);
    if (s < -30 || s > c.W + 30) continue;
    const top = L.BACK - 74;
    x.fillStyle = '#2a2026'; x.fillRect(R(s), top, 2, L.BACK - top); x.fillRect(R(s) - 5, top, 12, 2);
    x.fillStyle = 'rgba(255,230,180,.9)'; x.fillRect(R(s) - 4, top + 2, 10, 1);
    const gg = x.createRadialGradient(s + 1, top + 4, 1, s + 1, top + 4, 30); gg.addColorStop(0, 'rgba(255,220,160,.2)'); gg.addColorStop(1, 'rgba(255,220,160,0)'); x.fillStyle = gg; x.fillRect(s - 30, top - 26, 62, 62);
  }
  // the port office: lit windows, its name on a plate, cars parked in front
  const o = c.sx(1650);
  if (o > -80 && o < c.W + 20) {
    x.fillStyle = '#26202a'; x.fillRect(R(o), L.BACK - 30, 46, 30); x.fillStyle = 'rgba(' + ORANGE + ',.45)'; x.fillRect(R(o), L.BACK - 30, 46, 1);
    x.fillStyle = 'rgba(255,220,150,.55)'; for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) x.fillRect(R(o) + 4 + i * 10, L.BACK - 25 + j * 10, 6, 5);
    x.fillStyle = '#0d0705'; x.fillRect(R(o) + 4, L.BACK - 38, 38, 7); x.strokeStyle = 'rgba(' + ORANGE + ',.55)'; x.lineWidth = 1; x.strokeRect(R(o) + 4.5, L.BACK - 37.5, 37, 6);
    text(x, 'PORT OFFICE', R(o) + 23, L.BACK - 34.5, 'rgba(' + PAPER + ',.8)', 4, '600');
    for (let i = 0; i < 3; i++) placed(x, R(o) + 8 + i * 17, L.MID - 2, S, () => drawCar(x, { t: c.f, paint: CAR_PAINTS[i + 1], kind: (['sedan', 'van', 'hatch'] as const)[i], face: i % 2 ? -1 : 1 }));
  }
}

/** STS-2's trolley at work (in its frame): down to the truck under it, up, out over the ship, down, back. */
function sts2Load(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  const B = STS2_GLIDE.boom, cyc = c.still ? 0.3 : (c.f % 900) / 900;
  const truckH = -((L.MID - L.BACK) / S) + 18 + CH, shipH = (L.BACK - (c.GY - 22)) / S + 2 + CH, high = B.low - 34;
  const ease = (v: number) => v * v * (3 - 2 * v), seg = (a: number, b: number) => ease(Math.max(0, Math.min(1, (cyc - a) / (b - a))));
  const tx0 = 120, tx1 = 470;
  let tx = tx0, h = high, carry = false;
  if (cyc < 0.12) h = lerp(high, truckH, seg(0, 0.12));
  else if (cyc < 0.22) { h = lerp(truckH, high, seg(0.12, 0.22)); carry = true; }
  else if (cyc < 0.45) { tx = lerp(tx0, tx1, seg(0.22, 0.45)); carry = true; }
  else if (cyc < 0.55) { tx = tx1; h = lerp(high, shipH, seg(0.45, 0.55)); carry = true; }
  else if (cyc < 0.65) { tx = tx1; h = lerp(shipH, high, seg(0.55, 0.65)); }
  else if (cyc < 0.9) tx = lerp(tx1, tx0, seg(0.65, 0.9));
  const y = (v: number) => -v;
  x.fillStyle = '#2a160a'; x.fillRect(tx - 12, y(B.low) + 3, 24, 7);
  x.strokeStyle = 'rgba(' + PAPER + ',.5)'; x.lineWidth = 1; x.beginPath(); x.moveTo(tx - 5.5, y(B.low) + 10); x.lineTo(tx - 5.5, y(h + 4)); x.moveTo(tx + 5.5, y(B.low) + 10); x.lineTo(tx + 5.5, y(h + 4)); x.stroke();
  x.fillStyle = '#2a160a'; x.fillRect(tx - 66, y(h + 4), 132, 4);
  x.fillStyle = 'rgba(255,210,58,.7)'; x.fillRect(tx - 66, y(h + 4), 6, 4); x.fillRect(tx + 60, y(h + 4), 6, 4);
  if (carry) container(x, frameView(c.f), tx - 64, h - CH, LIFT);
  // the operator's cab beside the trolley, lit
  x.fillStyle = '#140b06'; x.fillRect(tx - 44, y(B.low - 8), 24, 26); x.fillStyle = 'rgba(255,200,130,.35)'; x.fillRect(tx - 41, y(B.low - 12), 18, 12);
}

/** The bridge: railing along the walkway, two pylons with their cables fanning down to the deck. */
function bridge(x: CanvasRenderingContext2D, c: CoastView) {
  const [X0, X1] = PLACES.bridge;
  if (!seen(c, X0 - 20, X1 + 20, 120)) return;
  const a = R(c.sx(X1)), b = R(c.sx(X0));
  // the railing on the bay side
  x.fillStyle = '#3a2a3a'; x.fillRect(Math.max(-2, a), c.GY - 5, Math.min(c.W + 2, b) - Math.max(-2, a), 1);
  for (let X = X0; X < X1; X += 8) { const s = R(c.sx(X)); if (s > -2 && s < c.W + 2) x.fillRect(s, c.GY - 5, 1, 5); }
  for (const X of [1800, 2030]) {
    const s = R(c.sx(X));
    if (s < -140 || s > c.W + 140) continue;
    const top = c.GY - 104;
    // the cables: a fan each way from the pylon's head to the deck
    x.strokeStyle = 'rgba(255,217,165,.32)'; x.lineWidth = 0.6;
    for (let k = 1; k <= 6; k++) { x.beginPath(); x.moveTo(s, top + 6); x.lineTo(s - k * 18, c.GY - 4); x.moveTo(s + 1, top + 6); x.lineTo(s + 1 + k * 18, c.GY - 4); x.stroke(); }
    // the pylon: two legs through the deck, cross beams, a red light on its head
    x.fillStyle = '#1e1222'; x.fillRect(s - 4, top, 3, c.H + 90 - top); x.fillRect(s + 2, top, 3, c.H + 90 - top);
    x.fillRect(s - 5, top + 20, 11, 3); x.fillRect(s - 5, top + 60, 11, 3); x.fillRect(s - 6, c.GY - 2, 13, 4);
    x.fillStyle = 'rgba(' + ORANGE + ',.4)'; x.fillRect(s + 4, top, 1, c.GY - top);
    x.fillStyle = 'rgba(255,170,120,.35)'; x.fillRect(s - 4, top, 1, c.GY - top);
    x.fillStyle = c.still || Math.floor(c.f / 20) % 2 ? 'rgba(' + RED + ',1)' : 'rgba(' + RED + ',.3)'; x.fillRect(s - 1, top - 3, 3, 3);
  }
}

/** The Galleria: its plinth on the plaza (shop windows, the doors with their ID gate, an ad screen), the terrace, the dome on top. */
function galleria(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  const X0 = 2190, X1 = 2420;
  if (!seen(c, X0 - 30, X1 + 10, 140)) return;
  const a = R(c.sx(X1)), b = R(c.sx(X0)), top = L.BACK - 58, w = b - a;
  // the dome on the terrace (sets/galleria-dome.ts)
  placed(x, R((a + b) / 2), top - 6, 1.25, () => drawGalleriaDome(x, { fill: mixHex('#1a0e1e', '#3a2440', c.warm), lit: 1.5, label: false }));
  // the plinth: a block on the ground, a terrace railing on top
  x.fillStyle = '#2a1830'; x.fillRect(a, top, w, L.BACK - top + 1);
  x.fillStyle = 'rgba(255,190,110,.55)'; x.fillRect(a, top, w, 1);
  x.fillStyle = 'rgba(255,217,165,.25)'; x.fillRect(a, top - 6, w, 1); for (let i = a; i < b; i += 6) x.fillRect(i, top - 6, 1, 6);
  // the shop windows: lit, with what is in them and who is looking
  for (let i = 0; i < 9; i++) {
    if (i === 4) continue;
    const wx = a + 6 + i * ((w - 12) / 9), wy = top + 18;
    x.fillStyle = 'rgba(255,200,140,.55)'; x.fillRect(R(wx), wy, 18, 22);
    x.fillStyle = 'rgba(' + ORANGE + ',.5)'; x.fillRect(R(wx), wy - 2, 18, 1);
    x.fillStyle = 'rgba(40,16,40,.6)'; x.fillRect(R(wx) + 4 + (i % 3) * 3, wy + 8, 3, 14); x.fillRect(R(wx) + 4 + (i % 3) * 3, wy + 5, 3, 3);
    if (i % 2) { x.fillStyle = 'rgba(40,16,40,.5)'; x.fillRect(R(wx) + 11, wy + 10, 4, 12); }
  }
  // the doors in the middle, the ID gate beside them (a red light, a queue in front: PEOPLE)
  const dx = R(a + w / 2 - 12);
  x.fillStyle = 'rgba(255,230,190,.65)'; x.fillRect(dx, top + 16, 24, L.BACK - top - 16);
  x.fillStyle = 'rgba(40,20,30,.6)'; x.fillRect(dx + 11, top + 16, 2, L.BACK - top - 16);
  x.fillStyle = '#1a1018'; x.fillRect(dx - 6, L.BACK - 18, 4, 18);
  x.fillStyle = c.still || Math.floor(c.f / 30) % 3 ? 'rgba(' + RED + ',.95)' : 'rgba(' + RED + ',.3)'; x.fillRect(dx - 5, L.BACK - 16, 2, 2);
  // GALLERIA in neon on a plate over the doors (the plate is the sign's)
  placed(x, R(a + w / 2), top + 8, S, () => sign(x, c.f, 'GALLERIA', 0, 0, '255,190,110', { size: 13, phase: 40 }));
  // an ad screen on the plinth's end: one dry message at a time
  const ads = ['VERIFIED CUSTOMERS ONLY', 'SCORE 600+ · FREE PARKING', 'IDENTITY CHECK AT ENTRANCE'], m = c.still ? 0 : Math.floor(c.f / 200) % ads.length;
  x.fillStyle = '#0c0610'; x.fillRect(a + 4, top + 4, 50, 10); x.strokeStyle = 'rgba(' + ORANGE + ',.45)'; x.lineWidth = 1; x.strokeRect(a + 4.5, top + 4.5, 49, 9);
  text(x, ads[m], a + 29, top + 9.5, 'rgba(' + PAPER + ',.85)', 3.4, '600');
  // planters on the plaza
  for (const X of [2150, 2455]) { const s = R(c.sx(X)); if (s < -20 || s > c.W + 20) continue; x.fillStyle = '#3a2c3c'; x.fillRect(s - 6, L.BACK - 6, 12, 6); x.fillStyle = '#1e2a1a'; x.beginPath(); x.arc(s, L.BACK - 12, 7, 0, 7); x.fill(); x.fillStyle = '#2a3a22'; x.fillRect(s, L.BACK - 6, 1, 4); }
}

/** The escalator from the plaza up to the Galleria's terrace, people riding it up with their shopping. */
const RIDERS_UP: Character[] = [
  { seed: 4181, look: { garb: 'coat', hair: 'long', extras: ['bag'] }, x: 0, act: 'stand', facing: 1 },
  { seed: 4182, look: { garb: 'jacket', hair: 'cap' }, x: 0, act: 'phone', facing: 1 },
  { seed: 4183, look: { body: 'old', garb: 'coat', hair: 'brim', extras: ['bag'] }, x: 0, act: 'stand', facing: 1 },
];
function escalator(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  const X0 = 2190 - 28, X1 = 2190 + 4; // from the plaza (east of the plinth) up to its terrace
  if (!seen(c, X1, X0, 40)) return;
  const s0 = c.sx(X0), s1 = c.sx(X1), y0 = L.MID, y1 = L.BACK - 58;
  x.strokeStyle = '#4a3450'; x.lineWidth = 5; x.beginPath(); x.moveTo(s0, y0); x.lineTo(s1, y1); x.stroke();
  x.strokeStyle = 'rgba(255,190,110,.6)'; x.lineWidth = 1; x.beginPath(); x.moveTo(s0, y0 - 6); x.lineTo(s1, y1 - 6); x.stroke();
  for (let i = 0; i < 3; i++) {
    const k = ((c.still ? 0.3 : c.f * 0.0025) + i / 3) % 1, px = lerp(s0, s1, k), py = lerp(y0, y1, k) - 2;
    placed(x, R(px), R(py), S, () => drawCharacter(x, frameView(c.f), RIDERS_UP[i]));
  }
}

/** Downtown: the street's towers, their signs and lit windows, rising out of the top of the view. */
function downtown(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  const X0 = 2490, sc = 0.45;
  for (const b of TOWERS) {
    const X = X0 + b.x * sc, s = c.sx(X) - b.w * sc;
    if (s > c.W + 4 || s + b.w * sc < -4) continue;
    placed(x, R(s), L.BACK, sc, () => drawTower(x, b, { t: c.f, still: c.still, fill: mixHex('#0f0812', '#1a0e1e', c.warm * 0.5), edge: 0.4, lit: 0.12, glow: 0.75, below: 2 }));
    // a shopfront at its foot: a lit window under an awning
    const fw = R(Math.min(b.w * sc - 6, 26));
    x.fillStyle = 'rgba(255,200,140,.45)'; x.fillRect(R(s) + 3, L.BACK - 12, fw, 10);
    x.fillStyle = ['#7a2a2a', '#2a4a5a', '#5a4a1a', '#3a2a4a'][b.seed % 4]; x.fillRect(R(s) + 2, L.BACK - 15, fw + 2, 3);
  }
}

/** Street lamps on the bridge, the plaza and the street, their light on the ground. */
function lamps(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  for (const X of LAMPS) {
    const s = c.sx(X);
    if (s < -30 || s > c.W + 30) continue;
    const top = L.BACK - 40;
    x.fillStyle = '#0e080c'; x.fillRect(R(s), top, 2, L.BACK - top); x.fillRect(R(s) - 6, top, 8, 2);
    x.fillStyle = 'rgba(255,220,160,.95)'; x.fillRect(R(s) - 6, top + 2, 4, 1);
    const gg = x.createRadialGradient(s - 4, top + 3, 1, s - 4, top + 3, 26); gg.addColorStop(0, 'rgba(255,210,150,.22)'); gg.addColorStop(1, 'rgba(255,210,150,0)'); x.fillStyle = gg; x.fillRect(s - 30, top - 22, 52, 52);
    x.fillStyle = 'rgba(255,210,150,.08)'; x.fillRect(R(s) - 14, L.BACK, 20, L.ROAD0 - L.BACK);
  }
}

/** The port's machines at work: a straddle carrier shuttling a box, the reach stacker, a forklift. */
function machines(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  const f = c.still ? 0 : c.f;
  // the straddle carrier: back and forth between the stacks, a box under it, lifting at each end
  let X = 940 + Math.sin(f * 0.004) * 60, s = c.sx(X);
  if (s > -60 && s < c.W + 60) placed(x, R(s), L.MID, S, () => drawStraddle(x, { t: c.f, box: LOADS[1], lift: 0.5 + 0.5 * Math.cos(f * 0.004), face: Math.cos(f * 0.004) > 0 ? -1 : 1, still: c.still }));
  X = 1376; s = c.sx(X);
  if (s > -60 && s < c.W + 60) placed(x, R(s), L.MID, S, () => drawReachStacker(x, { t: c.f, box: LOADS[2], reach: 0.5 + 0.5 * Math.sin(f * 0.006), face: -1, still: c.still }));
  X = 1262 + Math.sin(f * 0.01) * 22; s = c.sx(X);
  if (s > -30 && s < c.W + 30) placed(x, R(s), L.MID, S, () => drawForklift(x, { t: c.f, lift: 0.5 + 0.5 * Math.sin(f * 0.02), face: Math.cos(f * 0.01) > 0 ? -1 : 1, still: c.still }));
}

/** The road's traffic: one lane each way from the port gate on, a truck waiting under STS-2. */
function traffic(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  const f = c.still ? 0 : c.f, lit = c.city > 0.2 || c.warm < 0.6;
  // the truck under STS-2 on the apron, waiting for its box
  let s = c.sx(1112);
  if (s > -60 && s < c.W + 60) placed(x, R(s), L.MID, S, () => drawTruck(x, { t: c.f, paint: '#2a4a6a', box: null, face: -1, still: c.still }));
  for (const lane of TRAFFIC) {
    const ly = lane.lane === 'far' ? L.FAR_LANE : L.NEAR_LANE, count = Math.floor((ROAD1 - ROAD0) / lane.gap), span = count * lane.gap;
    for (let j = 0; j < count; j++) {
      const X = ROAD0 + ((((j * lane.gap - lane.dir * f * lane.v) % span) + span) % span);
      s = c.sx(X);
      if (s < -70 || s > c.W + 70) continue;
      // out of the port gate fading in, never popping
      const fade = Math.min(1, (X - ROAD0) / 40, (ROAD0 + span - X) / 40);
      if (fade <= 0) continue;
      x.save(); x.globalAlpha = fade;
      const face = (-lane.dir) as 1 | -1, kind = lane.kinds[j % lane.kinds.length], n = j;
      placed(x, R(s), ly, S, () => {
        if (kind === 'truck') drawTruck(x, { t: c.f, paint: ['#c8c0b0', '#8a2a2a', '#3a5a3a'][n % 3], box: n % 4 === 3 ? null : LOADS[n % LOADS.length], face, lights: lit });
        else drawCar(x, { t: c.f, paint: kind === 'cab' ? '#d8b040' : CAR_PAINTS[n % CAR_PAINTS.length], kind: kind === 'car' ? (n % 2 ? 'sedan' : 'hatch') : kind, face, lights: lit });
      });
      x.restore();
    }
  }
}

/** Drones over the stacks, the bridge and the plaza: survey, cargo, one tailing the shoppers. */
function drones(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  const f = c.still ? 0 : c.f;
  const list: [number, number, boolean][] = [[1000 + Math.sin(f * 0.01) * 30, 70, false], [1330 + Math.cos(f * 0.008) * 40, 62, true], [1950 + Math.sin(f * 0.006) * 80, 80, true], [2280 + Math.sin(f * 0.012) * 20, 76, false], [2560 + Math.cos(f * 0.01) * 50, 90, true]];
  for (const [X, h, cargo] of list) {
    const s = c.sx(X);
    if (s < -20 || s > c.W + 20) continue;
    placed(x, R(s), R(L.BACK - h + Math.sin(f * 0.05 + X) * 2), S * 1.2, () => drawDrone(x, { t: c.f, still: c.still, cargo }));
  }
}

/**
 * The foreground wipes: at every seam something big and dark passes close to the camera (depth 1.7),
 * hiding the cut: a palm at the end of the sand, a lamp post at the quay's end, another where the
 * bridge lands on the plaza, a signal pole where the plaza steps down to the street.
 */
export function drawForeground(x: CanvasRenderingContext2D, c: CoastView) {
  const ink = '#040106';
  const wipes: [number, 'palm' | 'post' | 'lamp' | 'signal'][] = [[PLACES.sand - 10, 'palm'], [PLACES.quayEnd, 'post'], [PLACES.plaza[0], 'lamp'], [PLACES.street, 'signal']];
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
