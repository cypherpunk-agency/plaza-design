/**
 * The harbor at night: a working pier. Containers of every colour stacked crooked, two gantry
 * cranes with their operators lit in the cabs, the customs scanner arch, a fish stand and a tea
 * cart for the night shift, the Tide's open container with cards on a crate, a bonded store with
 * a guard who can be persuaded to admire the sea, fishermen at the end, gulls (and one that is
 * not a gull). Black water behind, moving, with the Registry's patrol boat passing on its round.
 *
 * Bands: far = the sky, the far city, ships and cranes on the horizon, the water;
 * middle = the ferry, the patrol boat, a dark boat with a lamp; play = the pier and everything
 * on it, the people, and the near water under the pier's edge.
 *
 * Built from the kits (ART-GUIDE §10): people (../people.ts), screens (screens.ts), stalls and
 * clutter (build.ts). Signs are dry; the people have the jokes.
 */

import { drawTaxiPad } from '../city';
import { drawPeople, drawPerson, type Person } from '../people';
import { clutter, stall, type StallSpec } from './build';
import { box, drawTowers, exitDoor, GREEN, notice, O, onScreen, PAPER, RED, rng, sign, tell, text, towers, C, type Scene, type SceneUse, type View } from './kit';
import { camera, menuBoard, ticker, YELLOW } from './screens';

/** The horizon: water from the pier's back edge up to here. */
const HZ = 84;

/** Layout: positions in world units, heights up from the pier. */
const L = {
  width: 2480,
  spawn: 76,
  hut: { x: 0, w: 74, h: 72 },
  notice: 118,
  arch: { x0: 160, x1: 310, h: 100 },
  podium: 352,
  manifest: 600,
  callBox: 688,
  cranes: [{ x: 780, name: 'STS-2', phase: 0 }, { x: 1880, name: 'STS-3', phase: 2.1 }],
  fish: { x: 900, w: 112, use: 940 },
  drinks: { x: 1032, w: 96, use: 1082 },
  den: 1200,
  fence: { x0: 1418, x1: 1640, gate: 1430 },
  ghost: 1484,
  bribe: 1452,
  ghostUse: 1560,
  bollards: [140, 664, 1176, 1396, 1660, 2210, 2350],
  berth: 1975,
  rails: 2396,
  beacon: 2466,
  /** Play-level ways out: the metro station door in the guard hut, the sky-taxi pad on the pier. */
  metro: 26,
  taxi: 2280,
  ferry: 2370,
};

const CH = 58;
/** Container paints: fill, outline, rib highlight. Earthy and faded; no cyan (that is for things you can use). */
const PAL: [string, string, string][] = [
  ['#3a1608', 'rgba(255,136,0,.8)', 'rgba(255,150,60,.12)'], // orange
  ['#0f2024', 'rgba(110,160,160,.65)', 'rgba(140,190,190,.1)'], // faded teal
  ['#2c0c10', 'rgba(220,90,90,.72)', 'rgba(230,110,110,.1)'], // red
  ['#2a2208', 'rgba(230,190,80,.72)', 'rgba(240,210,110,.1)'], // yellow
  ['#142012', 'rgba(130,170,110,.62)', 'rgba(150,190,120,.1)'], // green
  ['#1a1a22', 'rgba(170,170,190,.6)', 'rgba(190,190,210,.09)'], // grey-blue
  ['#24150e', 'rgba(200,150,110,.62)', 'rgba(210,160,120,.1)'], // brown
  ['#2c2824', 'rgba(225,215,200,.6)', 'rgba(235,225,210,.1)'], // dirty white
];

interface Crate { w: number; p: number; seed: number; code?: string; label?: string; dx?: number }
/** Container stacks: `x` the left edge, boxes bottom to top, `dx` how crooked each sits. */
const STACKS: { x: number; boxes: Crate[] }[] = [
  { x: 390, boxes: [
    { w: 128, p: 0, seed: 1, code: 'MRDU 118 2207', label: 'MERIDIAN BULK' },
    { w: 128, p: 5, seed: 2, code: 'PLZU 300 1981', label: 'PLAZA HOLDINGS FREIGHT', dx: -6 },
    { w: 66, p: 3, seed: 3, code: 'TDLU 771', dx: 34 },
  ] },
  { x: 524, boxes: [
    { w: 128, p: 2, seed: 4, code: 'KSNU 552 9014', label: 'CONTENTS: UNDECLARED' },
    { w: 128, p: 1, seed: 5, code: 'NRLU 220 3310', label: 'NULLROUTE LOGISTICS', dx: 5 },
  ] },
  { x: 1660, boxes: [
    { w: 128, p: 6, seed: 6, code: 'NRLU 404 0451', label: 'NULLROUTE LOGISTICS' },
    { w: 128, p: 4, seed: 7, code: 'HLXU 090 6620', label: 'THIS SIDE UP', dx: -4 },
    { w: 128, p: 7, seed: 8, code: 'CSQU 314 1592', label: 'HOLD FOR CUSTOMS', dx: 7 },
  ] },
  { x: 2000, boxes: [
    { w: 66, p: 2, seed: 9, code: 'BRNU 007' },
    { w: 66, p: 0, seed: 10, code: 'MRDU 440', dx: 3 },
  ] },
];
const GHOST: Crate = { w: 128, p: 5, seed: 11, code: 'PLZU 610 0002' };
/** The container on the customs chassis, sliding through the arch's scan. */
const SCANNED: Crate = { w: 128, p: 3, seed: 12, code: 'TDLU 771 0890', label: 'MERIDIAN BULK' };
const HANGING: Crate = { w: 128, p: 0, seed: 13, code: 'NRLU 118 0207', label: 'IN TRANSIT' };
const HANGING3: Crate = { w: 128, p: 2, seed: 14, code: 'KSNU 909 1200', label: 'IN TRANSIT' };

const SKYLINE = towers(41, 1700, [16, 40], [18, 70], 0.08);
/** The tall towers of the far city, further off still, behind the low skyline. */
const SPIRES = towers(45, 2200, [12, 30], [60, 190], 0.05);
/** Cloud banks lit from below by the city: [x, width, height offset, thickness], laid out once. */
const CLOUDS = (() => { const r = rng(47); return Array.from({ length: 40 }, () => [r() * 2400, 120 + r() * 260, r() * 30, 6 + r() * 10]); })();
const ripples: [number, number, number][] = (() => { const r = rng(43); return Array.from({ length: 110 }, () => [r() * 2000, 4 + r() * (HZ - 8), 4 + r() * 14]); })();
/** Ships on the horizon: [x, length, height of the stacks], far band. */
const SHIPS = [[300, 230, 16], [1150, 300, 20], [1900, 180, 12]];
/** Gulls in flight: [x, height, speed, parallax, phase]. */
const GULLS = (() => { const r = rng(91); return Array.from({ length: 7 }, () => [r() * 2600, 130 + r() * 150, 0.25 + r() * 0.35, 0.7 + r() * 0.3, r() * 100]); })();
/** Crane apex: height of the A-frame's top. */
const APEX = 320;

// ---------- people ----------

const UNIFORM = { garb: 'jacket' as const, top: '#2e3a4a', bottom: '#1e2430', hair: 'cap' as const, acc: '#1a1a22' };
const OILSKIN = { garb: 'coat' as const, top: '#8a7a2a', hair: 'brim' as const, acc: '#8a7a2a' };

const watchman: Person = { seed: 6101, look: { body: 'avg', garb: 'jacket', hair: 'cap', extras: ['phone'], top: '#46506e' }, x: 56, h: 30, act: 'phone', facing: -1, ps: 2 };
const customs: Person = { id: 'customs', seed: 6102, look: { body: 'wide', ...UNIFORM, extras: ['visor'] }, x: 336, act: 'stand', facing: -1, name: 'CUSTOMS', talk: [
  ['Every container goes through the arch. The arch scans the outside.', 'What is inside is declared by the shipper. The shipper is very honest. It says so on the form.'],
  ['You are not a container. Keep it that way and we\'ll get on fine.'],
] };
const fishSeller: Person = { seed: 6103, look: { body: 'old', garb: 'apron', hair: 'scarf', acc: '#5a8a3a', extras: [] }, x: 958, h: 2, act: 'vend', facing: -1 };
const teaMan: Person = { seed: 6104, look: { body: 'wide', garb: 'apron', hair: 'beanie', acc: '#c83a2a', extras: [] }, x: 1080, act: 'vend', facing: -1 };
const docker: Person = { id: 'docker', seed: 6105, look: { body: 'tall', garb: 'hivis', hair: 'helmet', acc: '#d8b040', extras: [] }, x: 1150, act: 'smoke', facing: -1, name: 'DOCKER', talk: [
  ['Twelve hours lifting boxes I\'m not allowed to open.', 'Some of them are cold. Some of them hum. One of them knocked once. I lifted that one gently.'],
  ['Union rule: one break per shift. Management rule: the shift doesn\'t end.'],
] };
const tide: Person = { id: 'tide', key: true, seed: 6106, look: { body: 'slim', ...OILSKIN, extras: ['cyberarm'] }, x: 1374, act: 'lean', facing: -1, name: 'TIDE RUNNER', talk: [
  ['Don\'t stare at the den. Stare at the water, like a normal person.', 'You\'re the deleted one. Moth\'s friend. The scanners slide right off you. I like that in a customer.'],
  ['We\'re the Tide. We move what the Registry can\'t count: goods, data, the odd person in a crate marked FROZEN FISH.', 'Your friend came through here like that once. Captain Brine carried the crate personally.', 'The Captain doesn\'t do favours. The Captain does invoices.'],
  ['Moth still owes the Captain. Moth knows it.', 'There\'s a little boat at the end of the beach pier, paid up by the month in Moth\'s name. The Captain\'s idea of a reminder.'],
  ['Want to meet Brine? Nobody wants to. The boat\'s never in the same berth twice.', 'If the Captain wants you, you\'ll see a lamp out on the water. Three long. Don\'t wave back, it\'s rude.'],
] };
const guard: Person = { seed: 6107, look: { body: 'tall', ...UNIFORM, hair: 'short', hairCol: '#2e1d12', extras: [] }, x: 1452, act: 'stand', facing: -1 };
const fisher: Person = { id: 'fisher', seed: 6108, look: { body: 'avg', garb: 'coat', hair: 'beanie', top: '#4e5e3a', acc: '#c83a2a', extras: [] }, x: 2160, act: 'stand', facing: 1, name: 'FISHERMAN', talk: [
  ['Fish don\'t need ID. Best neighbours I\'ve had.', 'Caught a drone gull once. Threw it back. It filed a complaint.'],
  ['The patrol boat comes round every few minutes. The fish know the schedule better than the Registry does.'],
] };
/** The crane operators, in their cabs (they move with the trolley). */
const operators: Person[] = [
  { seed: 6109, look: { body: 'avg', garb: 'hivis', hair: 'short', extras: ['headphones'] }, x: 0, h: 158, act: 'sit', facing: -1, ps: 2 },
  { seed: 6110, look: { body: 'wide', garb: 'hivis', hair: 'cap', extras: [] }, x: 0, h: 158, act: 'sit', facing: -1, ps: 2 },
];
/** The forklift's driver (moves with the forklift). */
const driver: Person = { seed: 6111, look: { body: 'avg', garb: 'hivis', hair: 'helmet', acc: '#d86a2a', extras: [] }, x: 0, h: 12, act: 'sit', facing: 1 };
/** The Tide's card game inside the open container. */
const DEN: Person[] = [
  { seed: 6112, look: { body: 'wide', ...OILSKIN, top: '#6e6a2a', extras: [] }, x: L.den + 34, h: 14, act: 'sit', facing: 1 },
  { seed: 6113, look: { body: 'old', ...OILSKIN, hair: 'beanie', acc: '#2a2a30', extras: ['glasses'] }, x: L.den + 96, h: 14, act: 'sit', facing: -1 },
];
const CAT: Person = { look: 'cat', seed: 3, x: 2212, h: 12, act: 'sit', facing: -1 };

/** Everyone else on the pier, drawn in front of the stacks. Plain data. */
const PIER: Person[] = [
  { seed: 6201, look: { body: 'tall', garb: 'hivis', hair: 'helmet', acc: '#e8e0d0', extras: [] }, x: 806, act: 'argue', facing: 1 },
  { seed: 6202, look: { body: 'avg', garb: 'hivis', hair: 'helmet', acc: '#d8b040', extras: ['backpack'] }, x: 420, act: 'walk', range: [420, 640], speed: 0.28 },
  { seed: 6203, look: { body: 'short', garb: 'hivis', hair: 'hood', extras: ['phone'] }, x: 1128, h: 18, act: 'sit', facing: 1 },
  { seed: 6204, x: 990, act: 'queue', facing: -1, look: { body: 'avg', garb: 'coat', hair: 'brim', acc: '#8a7a2a', extras: [] } },
  { seed: 6205, x: 1250, act: 'walk', range: [1250, 900], speed: 0.22, look: { body: 'wide', garb: 'hivis', hair: 'helmet', acc: '#d86a2a', extras: [] } },
  { seed: 6206, x: 2118, h: 8, act: 'sit', facing: 1, look: { body: 'old', garb: 'coat', hair: 'brim', acc: '#5a3a2a', extras: [] } },
  { look: 'drone', x: 236, h: 78, act: 'scan' },
  { look: 'courier', x: 1180, act: 'walk', range: [1180, 2100], speed: 0.45 },
  { seed: 6207, x: 2040, act: 'walk', range: [2040, 2300], speed: 0.3, look: { body: 'avg', garb: 'jacket', hair: 'hood', extras: ['umbrella'], acc: '#2a2a30' } },
];
const TALKERS: Person[] = [customs, docker, tide, fisher];
/** The pier's birds: every one answers E (ART-GUIDE §10). The gulls react; the pigeon gets shooed. */
const GULL_TALK = [
  ['(The gull looks at you, then at your pockets, then screams.)'],
  ['(It takes a step closer. It has done this before. You are the one being mugged.)'],
  ['(It stares at you with one eye, then the other, and finds you lacking from both sides.)'],
];
const gullTalk = (k: number) => [GULL_TALK[k % 3], GULL_TALK[(k + 1) % 3], GULL_TALK[(k + 2) % 3]];
const BIRDS: Person[] = [
  { id: 'gull1', look: 'gull', x: 430, h: 3 * CH, act: 'stand', name: 'GULL', talk: gullTalk(0) },
  { id: 'gull2', look: 'gull', seed: 2, x: 1730, h: 3 * CH, act: 'walk', range: 50, name: 'GULL', talk: gullTalk(1) },
  { id: 'gull3', look: 'gull', seed: 3, x: 1660, h: 12, act: 'stand', facing: -1, name: 'GULL', talk: gullTalk(2) },
  { id: 'gull4', look: 'gull', seed: 4, x: 2420, h: 25, act: 'stand', name: 'GULL', talk: gullTalk(1) },
  { id: 'gull5', look: 'gull', seed: 5, x: 760, act: 'walk', range: 50, name: 'GULL', talk: gullTalk(0) },
  { look: 'pigeon', seed: 6, x: 480, act: 'walk', range: 20 },
];

// ---------- things to do ----------

/** What you carry, for this visit: fish for the cat, tea for the crane. */
let fishHeld = 0, teaHeld = 0, fishSold = 0, teaSold = 0, craneTeas = 0, bribeAsked = false;
/** When the crane last came down for a cup (frames), to animate the spreader. */
let craneCall = -1e9;
const CALL = 820;

const FISH_LINES = [
  ['One mackerel. Caught this morning, by me, with a hook, like an animal.', 'Wrapped in yesterday\'s Registry notice. Only thing they\'re good for.'],
  ['Sardines. Small, honest, and nobody has put a chip in one yet.'],
  ['Another? The cat on the bollard will love you. The cat loves anyone holding a fish.'],
];
const TEA_LINES = [
  ['Tea. Black, because milk needs a permit.', 'If you\'re not drinking it, take it to the crane. The operator hasn\'t come down since Tuesday.'],
  ['Synth coffee. Tastes like coffee described by someone who once heard about it.'],
  ['Broth. Don\'t ask what it was. It was brave.'],
];

const USES: SceneUse[] = [
  { id: 'fish', x: L.fish.use, label: '[E] BUY FISH · 1 TOKEN', name: 'FISH SELLER', promptH: 92, use: (c) => {
    if (!c.pay(1)) return ['One token a fish. You have the look of someone with no tokens and strong opinions.', 'Come back richer. The fish will still be here. Less fresh, but here.'];
    fishHeld++; c.set('harbor:fish');
    return FISH_LINES[fishSold++ % FISH_LINES.length];
  } },
  { id: 'drink', x: L.drinks.use, label: '[E] HOT DRINK · 1 TOKEN', name: 'TEA CART', promptH: 92, use: (c) => {
    if (!c.pay(1)) return ['One token. Warmth is extra and I don\'t sell it.'];
    teaHeld++; c.set('harbor:tea');
    return TEA_LINES[teaSold++ % TEA_LINES.length];
  } },
  { id: 'crane', x: L.callBox, label: '[E] CRANE CALL BOX', name: 'STS-2 CAB', promptH: 78, use: (c) => {
    if (teaHeld <= 0) return ['(The intercom crackles.) STS-2. Unless you\'re a container, I can\'t help you.', 'Unless you\'ve got tea. The cart down the pier does tea. I can\'t come down: if I come down they make me fill in a form about why.'];
    teaHeld--; craneCall = c.t;
    if (craneTeas++ === 0) {
      c.give(1); c.set('harbor:crane');
      return ['Is that tea? Hold it up. Higher. Right, stand clear.', '(Sixty tonnes of spreader come down, very gently, for one paper cup.)', 'Bless you. Fourteen hours up here. Have a token, don\'t tell the union.', 'From up here I see every box on the pier. Tonight the schedule has one nobody can find in the manifest. I lift what the schedule says.'];
    }
    return ['Another one? You\'re spoiling me. (Up goes the cup.)', 'The patrol boat never looks up, you know. Nobody looks up.'];
  } },
  { id: 'bribe', x: L.bribe, label: '[E] TALK TO THE GUARD', name: 'GUARD', promptH: 62, use: (c) => {
    if (c.flags['harbor:bribed']) return ['I\'m not looking. I\'m admiring the water. Very busy water tonight.'];
    if (!bribeAsked) { bribeAsked = true; return ['Bonded store. Sealed cargo. Nothing to see.', 'Not seeing anything costs three tokens.']; }
    if (!c.pay(3)) return ['Three. I can count, even if the Registry won\'t let me vote.'];
    c.set('harbor:bribed');
    return ['(He pockets the tokens without looking at them, which is a skill.)', 'I\'m going to have a smoke and look at the sea for exactly as long as it takes. Go on.'];
  } },
  { id: 'mark', x: L.ghostUse, label: '[E] LOOK AT THE MARK', name: 'GUARD', promptH: 78, use: (c) => {
    if (!c.flags['harbor:bribed']) return ['Oi. Bonded store. Step back from the seals.'];
    c.set('harbor:ghostmark');
    return { name: 'PAINTED MARK', pages: ['A lantern, painted by hand in whitewash over the company logo. The paint is still tacky.', 'Under it, in pencil: COUNTED OUT? THE CANALS, UNDER THE THIRD BRIDGE. ASK FOR A LANTERN.'] };
  } },
  { id: 'cat', x: CAT.x, label: '[E] THE CAT', name: 'DOCK CAT', promptH: 40, use: (c) => {
    if (fishHeld <= 0) return ['(The cat looks at your empty hands, then at the fish stand, then back at you. The message is clear.)'];
    fishHeld--; c.set('harbor:cat');
    return ['(You put the fish down. The cat inspects it like a customs officer, then eats it like a smuggler.)', '(It lets you scratch one ear, once. That\'s the deal.)'];
  } },
];

// ---------- drawing ----------

/**
 * The sky over the water, so a tall screen sees more night rather than a dead band:
 * the far city's spires with their warning lights, and banks of cloud lit orange
 * from below by the city, dimmer the higher they are. Far band only.
 */
function drawSkyDepth(x: CanvasRenderingContext2D, v: View) {
  const { y, t } = v, top = v.gy;
  drawTowers(x, v, SPIRES, 0.06, y(HZ), 0.06, '#020100', 1);
  for (const b of SPIRES) {
    if (b.h < 150) continue;
    const s = v.sx(b.x, 0.06) + Math.floor(b.w / 2);
    if (s < 0 || s > v.viewW) continue;
    x.fillStyle = 'rgba(' + RED + ',' + (Math.sin(t * 0.03 + b.x) > 0.3 ? 0.55 : 0.12) + ')'; x.fillRect(s - 1, y(HZ + b.h) - 2, 2, 2);
  }
  const span = 2400;
  for (let k = 0, h = HZ + 120; h < top - 6; k++, h += 70) {
    const a = 0.07 * Math.max(0.35, 1 - k * 0.2);
    for (let i = k % 2; i < CLOUDS.length; i += 2) {
      const [cx, w, dh, th] = CLOUDS[i];
      const s = (((cx + k * 530 - t * 0.03 * (1 + k * 0.3) - v.cam * (0.04 + k * 0.01)) % span) + span) % span - 300;
      if (s > v.viewW || s + w < 0) continue;
      const cy = y(h + dh);
      x.fillStyle = 'rgba(194,65,12,' + a * 0.6 + ')'; x.beginPath(); x.ellipse(s + w / 2, cy, w / 2, th, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(255,136,0,' + a * 0.5 + ')'; x.fillRect(Math.round(s + w * 0.2), Math.round(cy + th * 0.6), Math.round(w * 0.6), 1);
    }
  }
}

/** Ships riding at anchor on the horizon and the far terminal's cranes: dim, still, far band. */
function drawHorizon(x: CanvasRenderingContext2D, v: View) {
  const { y, t } = v, base = y(HZ);
  // the far container terminal's cranes, a row of dim A-frames
  x.strokeStyle = 'rgba(194,65,12,.16)'; x.beginPath();
  for (let wx = 120; wx < 2600; wx += 210) {
    const s = v.sx(wx, 0.14);
    if (s < -40 || s > v.viewW + 40) continue;
    x.moveTo(s, base); x.lineTo(s, base - 34); x.moveTo(s + 16, base); x.lineTo(s + 16, base - 34);
    x.moveTo(s - 20, base - 30); x.lineTo(s + 40, base - 30); x.moveTo(s + 8, base - 44); x.lineTo(s - 20, base - 30); x.moveTo(s + 8, base - 44); x.lineTo(s + 40, base - 30);
  }
  x.stroke();
  for (const [sx0, len, sh] of SHIPS) {
    const s = v.sx(sx0, 0.1);
    if (s > v.viewW || s + len < 0) continue;
    x.fillStyle = '#040302';
    x.beginPath(); x.moveTo(s, base - 9); x.lineTo(s + len, base - 9); x.lineTo(s + len - 10, base); x.lineTo(s + 6, base); x.closePath(); x.fill();
    for (let k = 14; k < len - 40; k += 9) x.fillRect(s + k, base - 9 - sh + ((k * 7) % 5), 8, sh - ((k * 7) % 5));
    x.fillRect(s + len - 34, base - 9 - sh - 12, 16, sh + 12);
    x.strokeStyle = 'rgba(194,65,12,.18)'; x.strokeRect(s + 0.5, base - 9.5, len, 1);
    x.fillStyle = 'rgba(255,217,165,.35)'; x.fillRect(s + len - 30, base - 9 - sh - 8, 2, 1); x.fillRect(s + len - 24, base - 9 - sh - 8, 2, 1);
    x.fillStyle = Math.sin(t * 0.03 + sx0) > 0.4 ? 'rgba(' + RED + ',.7)' : 'rgba(' + RED + ',.15)'; x.fillRect(s + len - 26, base - 9 - sh - 16, 2, 2);
    x.fillStyle = 'rgba(' + GREEN + ',.45)'; x.fillRect(s + 2, base - 11, 2, 2);
  }
}

/** The water: dark, with slow ripples further off and a swell that runs under the lights. */
function drawWater(x: CanvasRenderingContext2D, v: View) {
  const { y, t, gy } = v;
  x.fillStyle = '#01040a'; x.fillRect(0, y(HZ), v.viewW, gy - y(HZ));
  x.fillStyle = 'rgba(' + O + ',.12)'; x.fillRect(0, y(HZ), v.viewW, 1);
  const span = v.viewW + 40;
  for (const [rx, rh, len] of ripples) {
    const p = 0.12 + 0.5 * (1 - rh / HZ), sw = Math.sin(t * 0.02 + rx) * 3;
    const px = (((rx - v.cam * p + t * 0.08) % span) + span) % span - 20;
    x.fillStyle = 'rgba(170,210,255,' + (0.04 + 0.07 * (1 - rh / HZ)) + ')';
    x.fillRect(Math.round(px + sw), y(rh), Math.round(len * (0.8 + 0.3 * Math.sin(t * 0.03 + rh))), 1);
  }
  // the city's glow lying on the water near the horizon
  for (let i = 0; i < 4; i++) { x.fillStyle = 'rgba(194,65,12,' + (0.05 - i * 0.01) + ')'; x.fillRect(0, y(HZ - 2 - i * 3), v.viewW, 1); }
}

/** A dark boat far out with one lamp; now and then it signals: three long. Middle band. */
function drawLampBoat(x: CanvasRenderingContext2D, v: View) {
  const s = v.sx(1650, 0.3), wl = y0(v, 56);
  if (!onScreen(v, s - 30, 60)) return;
  const bob = Math.round(Math.sin(v.t * 0.03) * 1);
  x.fillStyle = '#050403'; x.beginPath(); x.moveTo(s - 22, wl - 5 + bob); x.lineTo(s + 22, wl - 5 + bob); x.lineTo(s + 17, wl + bob); x.lineTo(s - 18, wl + bob); x.closePath(); x.fill();
  x.fillRect(s - 6, wl - 11 + bob, 12, 6); x.fillRect(s + 2, wl - 22 + bob, 1, 11);
  const u = v.t % 1100, on = u < 150 ? (u % 50) < 36 : false;
  x.fillStyle = on ? 'rgba(255,230,170,.95)' : 'rgba(255,230,170,.12)'; x.fillRect(s + 1, wl - 24 + bob, 3, 3);
  if (on) {
    const g = x.createRadialGradient(s + 2, wl - 22, 1, s + 2, wl - 22, 18);
    g.addColorStop(0, 'rgba(255,230,170,.25)'); g.addColorStop(1, 'rgba(255,230,170,0)');
    x.fillStyle = g; x.fillRect(s - 16, wl - 40, 36, 36);
    x.fillStyle = 'rgba(255,230,170,.2)'; for (let i = 0; i < 4; i++) x.fillRect(s - 1 + Math.sin(v.t * 0.05 + i) * 2, wl + 2 + i * 3, 5, 1);
  }
}
const y0 = (v: View, h: number) => v.y(h);

/** The Registry's patrol boat on its round: a grey hull, a red light, a searchlight sweeping the water. */
function drawPatrol(x: CanvasRenderingContext2D, v: View) {
  const P = 2600, u = v.t % P, run = 1700;
  if (u > run) return;
  const bx = -500 + (u / run) * 3600, s = v.sx(bx, 0.5), wl = v.y(46), bob = Math.round(Math.sin(v.t * 0.05));
  if (!onScreen(v, s - 140, 280)) return;
  // the searchlight on the water ahead of it
  const sw = Math.sin(v.t * 0.02) * 60;
  const g = x.createLinearGradient(s + 30, wl - 30, s + 150 + sw, wl + 4);
  g.addColorStop(0, 'rgba(235,240,255,.22)'); g.addColorStop(1, 'rgba(235,240,255,.02)');
  x.fillStyle = g; x.beginPath(); x.moveTo(s + 32, wl - 30 + bob); x.lineTo(s + 120 + sw, wl + 6); x.lineTo(s + 190 + sw, wl + 6); x.closePath(); x.fill();
  x.fillStyle = 'rgba(235,240,255,.18)'; x.fillRect(Math.round(s + 120 + sw), wl + 4, 70, 2);
  // wake
  for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(220,230,240,' + (0.12 - i * 0.018) + ')'; x.fillRect(Math.round(s - 70 - i * 18 + Math.sin(v.t * 0.06 + i) * 3), wl + 1 + (i % 2), 20 - i * 2, 1); }
  // hull, cabin, mast
  x.fillStyle = '#20232a'; x.beginPath(); x.moveTo(s - 66, wl - 12 + bob); x.lineTo(s + 58, wl - 12 + bob); x.lineTo(s + 70, wl - 16 + bob); x.lineTo(s + 56, wl + bob); x.lineTo(s - 62, wl + bob); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(200,205,215,.3)'; x.stroke();
  box(x, s - 30, wl - 26 + bob, 52, 14, '#22262e', 'rgba(200,205,215,.3)');
  x.fillStyle = 'rgba(235,240,255,.55)'; for (let i = -24; i < 18; i += 9) x.fillRect(s + i, wl - 22 + bob, 6, 4);
  x.fillStyle = '#2a2e36'; x.fillRect(s - 4, wl - 40 + bob, 2, 14); x.fillRect(s + 24, wl - 30 + bob, 8, 5);
  x.fillStyle = Math.floor(v.t / 14) % 2 ? 'rgba(' + RED + ',.95)' : 'rgba(' + RED + ',.25)'; x.fillRect(s - 5, wl - 43 + bob, 4, 3);
  text(x, 'REGISTRY MARINE', s - 4, wl - 6 + bob, 'rgba(' + PAPER + ',.4)', 7, '600');
  x.fillStyle = 'rgba(' + RED + ',.7)'; x.fillRect(s - 60, wl - 9 + bob, 6, 2);
}

/** The night ferry, crossing on a long loop. */
function drawFerry(x: CanvasRenderingContext2D, v: View) {
  const { t, y } = v, fspan = 2600, fx = ((t * 0.16) % fspan) - 400, f = v.sx(fx, 0.45), wl = y(34);
  if (!onScreen(v, f - 100, 200)) return;
  x.fillStyle = '#0a0705'; x.beginPath(); x.moveTo(f - 96, wl - 14); x.lineTo(f + 96, wl - 14); x.lineTo(f + 84, wl); x.lineTo(f - 88, wl); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(' + O + ',.45)'; x.stroke();
  box(x, f - 60, wl - 28, 120, 14, '#0c0806', 'rgba(' + O + ',.35)');
  box(x, f - 36, wl - 38, 64, 10, '#0c0806', 'rgba(' + O + ',.35)');
  x.fillStyle = 'rgba(255,217,165,.55)';
  for (let i = -54; i < 56; i += 8) x.fillRect(f + i, wl - 24, 4, 4);
  for (let i = -30; i < 24; i += 8) x.fillRect(f + i, wl - 35, 4, 3);
  x.fillStyle = 'rgba(255,217,165,.9)'; x.fillRect(f + 20, wl - 48, 2, 10); x.fillRect(f + 19, wl - 50, 4, 2);
  text(x, 'NIGHT FERRY 7', f, wl - 8, 'rgba(' + PAPER + ',.45)', 7);
  for (let i = 0; i < 5; i++) { x.fillStyle = 'rgba(255,217,165,' + (0.07 - i * 0.012) + ')'; x.fillRect(f - 56 + Math.sin(t * 0.05 + i) * 2, wl + 2 + i * 3, 112, 1); }
}

/** A gull in flight, wings beating: white body, grey wings, 2 px a cell. */
function gullFlying(x: CanvasRenderingContext2D, sx: number, sy: number, t: number, dir: number, robot = false) {
  const up = Math.floor(t / 7) % 2 === 0, c = Math.round(sx), r = Math.round(sy);
  x.fillStyle = robot ? '#6a6e78' : '#8a8e96';
  if (up) { x.fillRect(c - 7, r - 4, 2, 2); x.fillRect(c - 5, r - 2, 3, 2); x.fillRect(c + 2, r - 2, 3, 2); x.fillRect(c + 5, r - 4, 2, 2); }
  else { x.fillRect(c - 7, r + 1, 3, 2); x.fillRect(c - 4, r, 2, 2); x.fillRect(c + 2, r, 2, 2); x.fillRect(c + 4, r + 1, 3, 2); }
  x.fillStyle = robot ? '#9a9ea8' : '#e8e4dc'; x.fillRect(c - 2, r - 1, 5, 3);
  x.fillStyle = robot ? 'rgba(' + RED + ',.95)' : '#e8b030'; x.fillRect(c + (dir > 0 ? 3 : -4), r, 2, 1);
  if (robot) { x.fillStyle = '#3a3e46'; x.fillRect(c, r - 3, 1, 2); }
}

/** A container: corrugated side, door bars at one end, rust, a dent, codes, a placard. Seeded. */
function container(x: CanvasRenderingContext2D, v: View, wx: number, h: number, b: Crate) {
  const s0 = Math.round(v.sx(wx + (b.dx ?? 0))), top = Math.round(v.y(h + CH)), w = b.w;
  if (!onScreen(v, s0, w)) return;
  const [fill, edge, hi] = PAL[b.p], r = rng(b.seed * 31 + 7);
  box(x, s0, top, w, CH, fill, edge);
  x.fillStyle = 'rgba(0,0,0,.3)'; for (let i = 4; i < w - 3; i += 4) x.fillRect(s0 + i, top + 4, 1, CH - 8);
  x.fillStyle = hi; for (let i = 6; i < w - 3; i += 4) x.fillRect(s0 + i, top + 4, 1, CH - 8);
  x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(s0 + 1, top + 1, w - 2, 3); x.fillRect(s0 + 1, top + CH - 4, w - 2, 3);
  // corner castings
  x.fillStyle = 'rgba(255,217,165,.25)'; x.fillRect(s0 + 1, top + 1, 3, 3); x.fillRect(s0 + w - 4, top + 1, 3, 3); x.fillRect(s0 + 1, top + CH - 4, 3, 3); x.fillRect(s0 + w - 4, top + CH - 4, 3, 3);
  // the door end: two locking bars with their handles
  const doorL = r() < 0.5, d0 = doorL ? s0 + 5 : s0 + w - 16;
  x.fillStyle = 'rgba(255,217,165,.3)'; x.fillRect(d0, top + 5, 2, CH - 10); x.fillRect(d0 + 8, top + 5, 2, CH - 10);
  x.fillRect(d0 - 2, top + CH / 2, 5, 2); x.fillRect(d0 + 6, top + CH / 2 + 4, 5, 2);
  // rust running down from the top rail
  const n = 1 + Math.floor(r() * 4);
  for (let k = 0; k < n; k++) {
    const rx = Math.round(s0 + 8 + r() * (w - 16)), rl = Math.round(8 + r() * (CH - 16));
    x.fillStyle = 'rgba(150,64,22,.5)'; x.fillRect(rx, top + 4, 2, rl);
    x.fillStyle = 'rgba(150,64,22,.25)'; x.fillRect(rx + 2, top + 4, 1, Math.round(rl * 0.6)); x.fillRect(rx - 3, top + 4, 6, 2);
  }
  if (r() < 0.45) { const dx = Math.round(s0 + 18 + r() * (w - 40)); x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(dx, top + CH * 0.6, 7, 4, 0.3, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(dx - 5, top + CH * 0.6 - 4, 6, 1); }
  // codes and the line's name, stencilled
  const cx = doorL ? s0 + 20 : s0 + 6;
  if (b.code) text(x, b.code, cx, top + 10, 'rgba(' + PAPER + ',.6)', 7, '600', 'left');
  if (b.label && w > 100) text(x, b.label, s0 + w / 2 + (doorL ? 8 : -8), top + CH / 2 + 2, 'rgba(' + PAPER + ',.42)', 7, '600');
  // a placard: hazard diamond, or a barcode sticker
  const q = r(), px = doorL ? s0 + w - 22 : s0 + 26;
  if (q < 0.35) { x.fillStyle = 'rgba(232,200,58,.7)'; x.beginPath(); x.moveTo(px, top + CH - 20); x.lineTo(px + 6, top + CH - 14); x.lineTo(px, top + CH - 8); x.lineTo(px - 6, top + CH - 14); x.closePath(); x.fill(); x.fillStyle = 'rgba(20,10,5,.8)'; x.fillRect(px - 1, top + CH - 16, 2, 4); }
  else if (q < 0.75) { box(x, px - 7, top + CH - 18, 14, 9, 'rgba(232,222,196,.7)'); x.fillStyle = 'rgba(20,10,5,.8)'; for (let i = 0; i < 10; i += 2) x.fillRect(px - 5 + i, top + CH - 16, 1, 5); }
}

/** The gantry crane: A-frame, legs, boom, machinery house; the trolley carries the operator's cab and a container. */
function drawCrane(x: CanvasRenderingContext2D, v: View, ci: number) {
  const c = L.cranes[ci], cx = c.x, phase = c.phase, { sx, y, t } = v, l0 = sx(cx - 80), l1 = sx(cx + 74);
  if (!onScreen(v, sx(cx - 230), 460)) return;
  const steel = '#21110a', edge = 'rgba(' + O + ',.8)';
  const ap = sx(cx - 20), b0 = sx(cx - 230), b1 = sx(cx + 150);
  x.strokeStyle = 'rgba(' + O + ',.5)'; x.lineWidth = 3; x.beginPath();
  x.moveTo(l0 + 3, y(232)); x.lineTo(ap, y(APEX)); x.lineTo(l1 + 3, y(232)); x.stroke(); x.lineWidth = 1;
  x.strokeStyle = 'rgba(' + O + ',.3)'; x.beginPath();
  x.moveTo(ap, y(APEX)); x.lineTo(b0 + 4, y(206)); x.moveTo(ap, y(APEX - 4)); x.lineTo(sx(cx - 130), y(206));
  x.moveTo(ap, y(APEX)); x.lineTo(b1 - 4, y(206)); x.stroke();
  box(x, ap - 6, y(APEX + 6), 12, 6, steel, edge);
  x.fillStyle = Math.sin(t * 0.04 + phase + 1) > 0 ? 'rgba(' + RED + ',.9)' : 'rgba(' + RED + ',.2)'; x.fillRect(ap - 1, y(APEX + 9), 3, 3);
  for (const lx of [l0, l1]) box(x, lx, y(232), 6, 232, steel, edge);
  box(x, l0, y(48), l1 - l0 + 6, 6, steel, edge);
  box(x, l0, y(170), l1 - l0 + 6, 8, steel, edge);
  x.strokeStyle = 'rgba(' + O + ',.35)'; x.beginPath();
  x.moveTo(l0 + 6, y(54)); x.lineTo(l1, y(162)); x.moveTo(l1, y(54)); x.lineTo(l0 + 6, y(162)); x.stroke();
  // yellow-and-black hazard bands on the legs' feet, and the wheels on the rail
  for (const lx of [l0, l1]) { for (let k = 0; k < 4; k++) { x.fillStyle = k % 2 ? 'rgba(20,12,6,1)' : 'rgba(' + YELLOW + ',.6)'; x.fillRect(lx, y(30 - k * 6), 6, 6); } box(x, lx - 6, y(8), 18, 8, '#2a160a', edge); }
  box(x, b0, y(206), b1 - b0, 4, steel, edge); box(x, b0, y(194), b1 - b0, 3, steel, edge);
  x.strokeStyle = 'rgba(' + O + ',.4)'; x.beginPath();
  for (let i = b0; i < b1 - 10; i += 12) { x.moveTo(i, y(191)); x.lineTo(i + 12, y(203)); }
  x.stroke();
  box(x, sx(cx - 40), y(232), 80, 26, '#1a0e08', edge);
  text(x, c.name, sx(cx), y(219), 'rgba(' + PAPER + ',.75)', 8, '600');
  x.fillStyle = Math.sin(t * 0.04 + phase) > 0 ? 'rgba(' + RED + ',1)' : 'rgba(' + RED + ',.25)';
  x.fillRect(sx(cx) - 2, y(238), 4, 4);

  // the trolley: its normal round, or (STS-2) coming down for a cup of tea
  let twx = cx - 40 + Math.sin(t * 0.004 + phase) * 150, hang = 128 + Math.round(Math.sin(t * 0.01 + phase) * 6), carry = true;
  const u = t - craneCall;
  if (ci === 0 && u >= 0 && u < CALL) {
    const k = u < 160 ? u / 160 : u < CALL - 160 ? 1 : (CALL - u) / 160, ease = k * k * (3 - 2 * k);
    twx = twx + (L.callBox + 14 - twx) * ease;
    const dn = u < 160 ? 0 : u < 360 ? (u - 160) / 200 : u < 470 ? 1 : u < 660 ? 1 - (u - 470) / 190 : 0;
    hang = Math.round(hang + (14 - hang) * dn * dn * (3 - 2 * dn));
    carry = false;
  }
  const tx = sx(twx);
  box(x, tx - 10, y(194) + 3, 20, 6, '#2a160a', edge);
  // the operator's cab under the trolley: lit, with the operator in it
  const cabL = tx - 44, cabT = y(188);
  box(x, cabL, cabT, 26, 30, '#140b06', edge);
  x.fillStyle = 'rgba(255,200,130,.28)'; x.fillRect(cabL + 3, cabT + 4, 20, 16);
  const op = operators[ci];
  op.x = twx - 31;
  x.save(); x.beginPath(); x.rect(cabL + 3, cabT + 4, 20, 22); x.clip(); drawPerson(x, v, op); x.restore();
  x.fillStyle = 'rgba(255,240,215,.12)'; x.fillRect(cabL + 3, cabT + 4, 7, 16);
  x.fillStyle = 'rgba(' + O + ',.8)'; x.fillRect(cabL + 3, cabT + 20, 20, 1);
  const glow = x.createRadialGradient(cabL + 13, cabT + 14, 2, cabL + 13, cabT + 14, 34);
  glow.addColorStop(0, 'rgba(255,200,130,.1)'); glow.addColorStop(1, 'rgba(255,200,130,0)');
  x.fillStyle = glow; x.fillRect(cabL - 22, cabT - 20, 70, 70);
  // cables, spreader, the container (or a paper cup)
  x.strokeStyle = 'rgba(' + PAPER + ',.45)'; x.beginPath(); x.moveTo(tx - 4.5, y(188)); x.lineTo(tx - 4.5, y(hang + 4)); x.moveTo(tx + 4.5, y(188)); x.lineTo(tx + 4.5, y(hang + 4)); x.stroke();
  box(x, tx - 66, y(hang + 4), 132, 4, '#2a160a', edge);
  for (const k of [-66, 60]) { x.fillStyle = 'rgba(' + YELLOW + ',.6)'; x.fillRect(tx + k, y(hang + 4), 6, 4); }
  if (carry) container(x, v, twx - 64, hang - CH, ci === 0 ? HANGING : HANGING3);
  else if (u > 360 && u < 600) { box(x, tx - 3, y(hang + 10), 6, 6, '#e8dcc0'); x.fillStyle = 'rgba(255,255,255,.3)'; x.fillRect(tx - 1, y(hang + 14), 1, 3); }
  // floodlight under the portal beam, lighting the pier below
  const fx = sx(cx);
  const g = x.createLinearGradient(0, y(166), 0, y(0));
  g.addColorStop(0, 'rgba(255,217,165,.16)'); g.addColorStop(1, 'rgba(255,217,165,.03)');
  x.fillStyle = g; x.beginPath(); x.moveTo(fx - 4, y(166)); x.lineTo(fx - 70, y(0)); x.lineTo(fx + 70, y(0)); x.lineTo(fx + 4, y(166)); x.closePath(); x.fill();
  box(x, fx - 6, y(170) + 8, 12, 4, '#ffd9a5');
}

/** The customs arch: a steel portal with a scan bar sweeping a container on its chassis. */
function drawArch(x: CanvasRenderingContext2D, v: View) {
  const { sx, y, t } = v, A = L.arch, a0 = sx(A.x0), a1 = sx(A.x1);
  if (!onScreen(v, a0 - 20, a1 - a0 + 60)) return;
  // the chassis and its container, inching through
  const cw = sx(A.x0 + 11);
  box(x, cw - 4, y(12), 136, 4, '#2a2622', 'rgba(220,200,160,.5)');
  for (const k of [6, 18, 104, 116]) { x.fillStyle = '#0c0a08'; x.beginPath(); x.arc(cw + k, y(5), 5, 0, 7); x.fill(); x.strokeStyle = 'rgba(220,200,160,.4)'; x.stroke(); }
  container(x, v, A.x0 + 11, 14, SCANNED);
  // the scan: a sheet of red light running down the box, green when it clears
  const u = t % 420, clear = u > 330, sy = y(14 + CH) + Math.min(1, u / 330) * CH;
  if (!clear) {
    x.fillStyle = 'rgba(' + RED + ',.1)'; x.fillRect(cw, y(14 + CH), 128, sy - y(14 + CH));
    x.fillStyle = 'rgba(' + RED + ',.85)'; x.fillRect(cw - 2, Math.round(sy), 132, 2);
  } else { x.fillStyle = 'rgba(' + GREEN + ',.08)'; x.fillRect(cw, y(14 + CH), 128, CH); }
  // the portal
  const steel = '#2a2622', edge = 'rgba(220,200,160,.6)';
  box(x, a0 - 6, y(A.h + 18), 10, A.h + 18, steel, edge); box(x, a1 - 4, y(A.h + 18), 10, A.h + 18, steel, edge);
  box(x, a0 - 10, y(A.h + 26), a1 - a0 + 20, 12, steel, edge);
  for (let k = 0; k < a1 - a0 + 16; k += 10) { x.fillStyle = k % 20 ? 'rgba(20,12,6,1)' : 'rgba(' + YELLOW + ',.55)'; x.fillRect(a0 - 8 + k, y(A.h + 16), 10, 3); }
  // emitter heads along the beam's underside
  for (let k = 8; k < a1 - a0; k += 22) { x.fillStyle = clear ? 'rgba(' + GREEN + ',.7)' : 'rgba(' + RED + ',' + (0.4 + 0.4 * Math.sin(t * 0.2 + k)) + ')'; x.fillRect(a0 + k, y(A.h + 13), 6, 2); }
  // the plate bolted to the beam: printed, not neon
  const mx = (a0 + a1) / 2;
  box(x, mx - 64, y(A.h + 44), 128, 18, '#e0d4b8', 'rgba(40,30,20,.9)');
  text(x, 'CUSTOMS INSPECTION', mx, y(A.h + 39), 'rgba(30,18,8,.95)', 8, '700');
  text(x, 'ALL CONTAINERS', mx, y(A.h + 31), 'rgba(110,20,20,.95)', 7, '700');
  x.fillStyle = 'rgba(160,120,90,.8)'; x.fillRect(mx - 62, y(A.h + 42), 1, 1); x.fillRect(mx + 61, y(A.h + 42), 1, 1);
  // a status screen on the right post and a lamp on top
  const st = a1 + 6;
  x.fillStyle = '#2a2622'; x.fillRect(st - 2, y(92), 4, 3);
  box(x, st, y(100), 30, 18, '#050303', 'rgba(' + O + ',.55)');
  text(x, clear ? 'CLEAR' : 'SCAN', st + 15, y(95), clear ? 'rgba(' + GREEN + ',.95)' : 'rgba(' + RED + ',.95)', 7, '600');
  text(x, Math.min(100, Math.floor(u / 3.3)) + '%', st + 15, y(87), 'rgba(' + PAPER + ',.7)', 7, '600');
  x.fillStyle = clear ? 'rgba(' + GREEN + ',.95)' : 'rgba(' + RED + ',' + (Math.floor(t / 20) % 2 ? 0.95 : 0.3) + ')'; x.fillRect(a0 - 3, y(A.h + 32), 4, 4);
}

/** The Tide's den: a container with its side doors folded open, a bulb, cards on a crate, a signal lamp. */
function drawDen(x: CanvasRenderingContext2D, v: View) {
  const { sx, y, t } = v, s0 = sx(L.den), w = 128;
  if (!onScreen(v, s0 - 60, w + 120)) return;
  const top = y(CH + 2);
  // its light spills out onto the pier
  const g = x.createRadialGradient(s0 + w / 2, y(30), 4, s0 + w / 2, y(20), 120);
  g.addColorStop(0, 'rgba(255,180,100,.2)'); g.addColorStop(1, 'rgba(255,180,100,0)');
  x.fillStyle = g; x.fillRect(s0 - 70, y(110), w + 140, 110);
  box(x, s0, top, w, CH + 2, '#1c120a', 'rgba(255,136,0,.8)');
  // the inside: warm, a rug, a calendar, shelves of jars
  x.fillStyle = '#2a1a0c'; x.fillRect(s0 + 4, top + 4, w - 8, CH - 6);
  x.fillStyle = 'rgba(255,190,110,.12)'; x.fillRect(s0 + 4, top + 4, w - 8, CH - 6);
  x.fillStyle = '#5a2a1a'; x.fillRect(s0 + 18, y(4), w - 36, 3);
  box(x, s0 + 10, top + 10, 14, 18, '#d8ccb0'); x.fillStyle = 'rgba(160,30,30,.8)'; x.fillRect(s0 + 12, top + 12, 10, 3);
  for (let k = 0; k < 3; k++) { x.fillStyle = 'rgba(' + O + ',.6)'; x.fillRect(s0 + 92, top + 14 + k * 9, 28, 1); for (let j = 0; j < 4; j++) { x.fillStyle = ['#c86a2a', '#8a7a2a', '#d8ccb0', '#5a8a3a'][(j + k) % 4]; x.fillRect(s0 + 94 + j * 7, top + 9 + k * 9, 4, 5); } }
  // the bulb on its flex
  const sway = Math.sin(t * 0.03) * 2;
  x.strokeStyle = 'rgba(' + PAPER + ',.4)'; x.beginPath(); x.moveTo(s0 + w / 2, top + 4); x.lineTo(s0 + w / 2 + sway, top + 16); x.stroke();
  x.fillStyle = 'rgba(255,230,180,.95)'; x.fillRect(s0 + w / 2 - 2 + sway, top + 16, 4, 4);
  // the card table: a crate, cards, a pot of tokens
  drawPeople(x, v, DEN);
  box(x, s0 + 52, y(20), 26, 20, '#5a3a1e', 'rgba(255,190,110,.5)');
  x.fillStyle = '#e8e0d0'; x.fillRect(s0 + 55, y(21), 4, 2); x.fillRect(s0 + 62, y(21), 4, 2); x.fillStyle = '#c83a2a'; x.fillRect(s0 + 70, y(21), 3, 2);
  x.fillStyle = 'rgba(' + YELLOW + ',.8)'; x.fillRect(s0 + 64, y(23), 3, 2);
  // the doors, folded back flat against the box's ends
  box(x, s0 - 10, top + 2, 10, CH - 2, PAL[4][0], PAL[4][1]); box(x, s0 + w, top + 2, 10, CH - 2, PAL[4][0], PAL[4][1]);
  x.fillStyle = 'rgba(255,217,165,.25)'; x.fillRect(s0 - 6, top + 6, 1, CH - 10); x.fillRect(s0 + w + 5, top + 6, 1, CH - 10);
  text(x, 'TDLU 771 0063', s0 + 34, top - 6, 'rgba(' + PAPER + ',.5)', 7, '600');
  // the Tide's signal lamp on a pole beside it, hooded, blinking slow
  const lx = s0 + w + 22;
  box(x, lx - 1, y(78), 3, 78, '#2a160a', 'rgba(' + O + ',.5)');
  box(x, lx - 6, y(86), 12, 9, '#3a3020', 'rgba(255,217,165,.6)');
  const on = Math.floor(t / 90) % 3 !== 0;
  x.fillStyle = on ? 'rgba(255,230,170,.9)' : 'rgba(255,230,170,.2)'; x.fillRect(lx + 4, y(83), 3, 4);
}

/** The bonded store: a chain-link fence and gate in front of the container the Ghosts painted. */
function drawBonded(x: CanvasRenderingContext2D, v: View) {
  const { sx, y, t } = v, F = L.fence, f0 = sx(F.x0), f1 = sx(F.x1);
  if (!onScreen(v, f0 - 20, f1 - f0 + 40)) return;
  container(x, v, L.ghost, 0, GHOST);
  container(x, v, L.ghost + 10, CH, { w: 66, p: 3, seed: 15, code: 'TDLU 112', dx: 2 });
  // the Ghosts' mark: a lantern in whitewash, painted over the logo, dripping
  const gx = sx(L.ghost + 70), gy = y(CH - 4), k = 1.5;
  x.strokeStyle = 'rgba(240,236,224,.9)'; x.lineWidth = 3; x.beginPath();
  x.moveTo(gx - 6 * k, gy + 6 * k); x.lineTo(gx + 6 * k, gy + 6 * k); x.moveTo(gx - 9 * k, gy + 10 * k); x.lineTo(gx - 9 * k, gy + 30 * k); x.lineTo(gx + 9 * k, gy + 30 * k); x.lineTo(gx + 9 * k, gy + 10 * k); x.closePath();
  x.moveTo(gx, gy); x.lineTo(gx, gy + 6 * k); x.moveTo(gx - 5 * k, gy + 33 * k); x.lineTo(gx + 5 * k, gy + 33 * k); x.stroke(); x.lineWidth = 1;
  x.fillStyle = 'rgba(255,220,150,.75)'; x.fillRect(gx - 3, gy + 17 * k, 6, 11 * k);
  x.fillStyle = 'rgba(240,236,224,.7)';
  for (const [dx, len] of [[-9, 7], [9, 4], [-2, 9], [4, 5]]) x.fillRect(gx + dx * k - 1, gy + 31 * k, 2, len);
  // red customs seals on the doors
  for (const k of [10, 18]) { x.fillStyle = 'rgba(' + RED + ',.8)'; x.fillRect(sx(L.ghost) + k, y(CH / 2) - 2, 3, 6); }
  // the fence, posts and mesh
  x.strokeStyle = 'rgba(200,190,170,.1)'; x.beginPath();
  for (let k = 0; k < f1 - f0; k += 9) { x.moveTo(f0 + k, y(4)); x.lineTo(f0 + k + 30, y(70)); x.moveTo(f0 + k + 30, y(4)); x.lineTo(f0 + k, y(70)); }
  x.stroke();
  x.fillStyle = '#0a0705'; x.fillRect(f1, y(72), 40, 72);
  for (let k = 0; k <= f1 - f0; k += 44) box(x, f0 + k - 1, y(74), 3, 74, '#2a2622', 'rgba(220,200,160,.5)');
  box(x, f0, y(72), f1 - f0, 2, '#2a2622', 'rgba(220,200,160,.5)');
  x.strokeStyle = 'rgba(200,190,170,.35)'; x.beginPath(); for (let k = 0; k < f1 - f0; k += 6) { x.moveTo(f0 + k, y(74)); x.lineTo(f0 + k + 3, y(80)); x.lineTo(f0 + k + 6, y(74)); } x.stroke();
  // the gate stands ajar once the guard is admiring the sea
  const gt = sx(F.gate), open = v.flags['harbor:bribed'];
  box(x, gt + (open ? 30 : 0), y(66), open ? 10 : 40, 62, 'rgba(0,0,0,0)', 'rgba(220,200,160,.55)');
  x.fillStyle = '#2a2622'; x.fillRect(gt + 2, y(92), 2, 20); x.fillRect(gt + 74, y(92), 2, 20);
  box(x, gt - 4, y(104), 86, 18, '#e0d4b8', 'rgba(40,30,20,.9)');
  text(x, 'BONDED STORE', gt + 39, y(99), 'rgba(30,18,8,.95)', 7, '700');
  text(x, 'AUTHORISED PERSONNEL', gt + 39, y(91), 'rgba(110,20,20,.95)', 7, '700');
  camera(x, v, { x: F.x1 - 4, h: 86, facing: -1, phase: 33 });
  void t;
}

/** A forklift on its shuttle between the stacks, carrying a pallet; its driver at the wheel. */
function drawForklift(x: CanvasRenderingContext2D, v: View) {
  const P = 1500, u = v.t % P, a = 1600, b = 1800;
  const k = u < 500 ? u / 500 : u < 750 ? 1 : u < 1250 ? 1 - (u - 750) / 500 : 0;
  const fwx = a + (b - a) * k * k * (3 - 2 * k), dir: 1 | -1 = u < 500 || u >= 1250 ? 1 : -1;
  const s = v.sx(fwx), { y } = v;
  if (!onScreen(v, s - 50, 100)) return;
  const front = s + dir * 18;
  // mast, forks and a pallet of sacks
  box(x, front - (dir > 0 ? 0 : 4), y(46), 4, 46, '#2a2622', 'rgba(220,200,160,.5)');
  const lift = 6 + Math.round(Math.sin(v.t * 0.01) * 2);
  x.fillStyle = '#5a5048'; x.fillRect(dir > 0 ? front + 4 : front - 22, y(lift), 18, 2);
  box(x, dir > 0 ? front + 4 : front - 22, y(lift + 14), 18, 12, '#6a5034', 'rgba(255,217,165,.4)');
  // body, counterweight, wheels
  box(x, s - 18, y(18), 36, 12, '#5a4210', 'rgba(' + YELLOW + ',.7)');
  box(x, s - dir * 18 - (dir > 0 ? 6 : 0), y(22), 6, 16, '#3a2a0a', 'rgba(' + YELLOW + ',.5)');
  for (const wx of [-11, 11]) { x.fillStyle = '#0c0a08'; x.beginPath(); x.arc(s + wx, y(5), 5, 0, 7); x.fill(); x.strokeStyle = 'rgba(220,200,160,.4)'; x.stroke(); }
  driver.x = fwx - dir * 4; driver.facing = dir;
  drawPerson(x, v, driver);
  // the roof cage over the driver, a beacon on it
  x.strokeStyle = 'rgba(220,200,160,.6)'; x.beginPath(); x.moveTo(s - 14.5, y(18)); x.lineTo(s - 14.5, y(56)); x.lineTo(s + 12.5, y(56)); x.lineTo(s + 12.5, y(18)); x.stroke();
  x.fillStyle = Math.floor(v.t / 10) % 2 ? 'rgba(255,170,40,.95)' : 'rgba(255,170,40,.3)'; x.fillRect(s - 2, y(60), 4, 3);
}

/** The guard hut by the metro, its watchman in the window. */
function drawHut(x: CanvasRenderingContext2D, v: View) {
  const { sx, y, t } = v, hx = sx(L.hut.x);
  if (!onScreen(v, hx, L.hut.w)) return;
  box(x, hx, y(L.hut.h), L.hut.w, L.hut.h, '#140b06', 'rgba(' + O + ',.8)');
  box(x, hx + 40, y(60), 28, 24, '#2a1a0c', 'rgba(' + O + ',.6)');
  x.save(); x.beginPath(); x.rect(hx + 41, y(60) + 1, 26, 22); x.clip();
  x.fillStyle = 'rgba(255,217,165,.18)'; x.fillRect(hx + 41, y(60), 26, 24);
  drawPerson(x, v, watchman);
  x.restore();
  x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(hx + 42, y(59), 6, 20);
  box(x, hx - 4, y(L.hut.h + 4), L.hut.w + 8, 5, '#1c0f07', 'rgba(' + O + ',.8)');
  // a mug on the sill
  box(x, hx + 60, y(38), 5, 4, '#c8b8a0'); void t;
}

export const harbor: Scene = {
  id: 'harbor',
  name: 'Harbor',
  width: L.width,
  spawn: L.spawn,
  ambient: { sky: true, rain: true },
  intro: ['The harbor. Everything here is in a box, and nobody asks what.'],
  exits: [
    { id: 'metro', x: L.metro, to: 'harborStation', at: 'harbor', label: '[E] TO THE METRO', promptH: 82 },
    { id: 'taxi', x: L.taxi, to: '', action: 'taxi', label: '[E] HAIL TAXI', promptH: 122 },
    // the pier runs on east along the shore to the beach (beach/: its left edge leads back here)
    { id: 'beach', x: 2450, to: 'beach', at: 'harbor', label: 'BEACH >', edge: 'right' },
  ],
  readables: [
    { id: 'notice', x: L.notice, name: 'PORT AUTHORITY', promptH: 78, pages: ['ALL CARGO IS SUBJECT TO INSPECTION AT THE CUSTOMS ARCH.', 'INSPECTION METHOD: EXTERNAL SCAN. CONTENTS AS DECLARED BY THE SHIPPER.'] },
    { id: 'manifest', x: L.manifest, name: 'MANIFEST', promptH: 74, pages: ['CONTAINER MANIFEST · BERTH 4 · NIGHT LOADING.', 'NRLU 404 0451 · CONTENTS: NOT DECLARED · ORIGIN: REDACTED · DESTINATION: REDACTED · INSURANCE: VOID.'] },
    { id: 'ferry', x: L.ferry, name: 'NIGHT FERRY', promptH: 78, pages: ['NIGHT FERRY 7 · DEPARTS WHEN FULL.', 'TICKETS ARE NOT SOLD AT THIS PIER. FARES ARE BILLED TO YOUR REGISTRY ACCOUNT.'] },
  ],
  people: [...TALKERS, ...BIRDS],
  uses: USES,

  drawBackdrop(x, v) {
    const { sx, y, t, gy } = v;
    // ---- far band: the smog glow, the far city, ships at anchor, the water ----
    const glow = x.createLinearGradient(0, y(HZ + 70), 0, y(HZ));
    glow.addColorStop(0, 'rgba(194,65,12,0)'); glow.addColorStop(1, 'rgba(194,65,12,.12)');
    x.fillStyle = glow; x.fillRect(0, y(HZ + 70), v.viewW, 70);
    drawSkyDepth(x, v);
    drawTowers(x, v, SKYLINE, 0.12, y(HZ), 0.12, '#030100', 1);
    drawHorizon(x, v);
    drawWater(x, v);
    // gulls high over the water
    for (const [gx0, gh, sp, par, ph] of GULLS) {
      const wx = ((gx0 + t * sp) % 2800) - 200, s = v.sx(wx, par);
      if (s < -10 || s > v.viewW + 10) continue;
      gullFlying(x, s, y(gh + Math.sin(t * 0.02 + ph) * 8), t + ph, 1);
    }

    // ---- middle band: boats ----
    drawLampBoat(x, v);
    drawFerry(x, v);
    drawPatrol(x, v);

    // ---- play band: the pier ----
    x.fillStyle = '#0e0905'; x.fillRect(0, y(6), v.viewW, 6);
    x.fillStyle = 'rgba(' + O + ',.6)'; x.fillRect(0, y(6), v.viewW, 1);
    // the crane rail along the pier
    x.fillStyle = 'rgba(200,190,170,.25)'; x.fillRect(0, y(2), v.viewW, 1);

    drawHut(x, v);
    exitDoor(x, v, L.metro, '#0a0603', '< METRO');
    const nx = sx(L.notice);
    if (onScreen(v, nx - 30, 60)) { box(x, nx - 1, y(44), 3, 44, '#2a160a'); notice(x, t, nx, y(72), 52, 30, ['PORT', 'AUTHORITY']); }

    // crane legs stand behind everything on the pier
    drawCrane(x, v, 0);
    drawCrane(x, v, 1);

    L_STACKS(x, v);
    drawArch(x, v);
    // the customs podium: a screen on a stand, the officer beside it
    const px = sx(L.podium);
    if (onScreen(v, px - 20, 40)) {
      box(x, px - 2, y(30), 4, 30, '#2a2622', 'rgba(220,200,160,.5)');
      box(x, px - 11, y(44), 22, 15, '#050303', 'rgba(' + O + ',.55)');
      x.fillStyle = 'rgba(' + PAPER + ',.5)'; for (let r = 0; r < 3; r++) x.fillRect(px - 8, y(41) + r * 4, 10 + ((r * 5 + Math.floor(t / 60)) % 6), 1);
      x.fillStyle = Math.floor(t / 30) % 2 ? 'rgba(' + RED + ',.9)' : 'rgba(' + RED + ',.3)'; x.fillRect(px + 7, y(42), 2, 2);
    }
    // the manifest, a paper on the door end of stack 2
    const mx = sx(L.manifest);
    if (onScreen(v, mx - 20, 40)) notice(x, t, mx, y(46), 30, 26, ['MANI', 'FEST'], 1);
    // the crane's call box on its post
    const cb = sx(L.callBox);
    if (onScreen(v, cb - 20, 40)) {
      box(x, cb - 1, y(36), 3, 36, '#2a2622');
      box(x, cb - 8, y(52), 16, 18, '#0d1416', 'rgba(' + C + ',.7)');
      x.fillStyle = 'rgba(' + C + ',.4)'; for (let r = 0; r < 3; r++) x.fillRect(cb - 5, y(48) + r * 3, 10, 1);
      tell(x, t, cb + 4, y(38), 2);
      text(x, 'STS-2', cb, y(58), 'rgba(' + PAPER + ',.7)', 7, '600');
    }

    // the fish stand and the tea cart, for the night shift
    stall(x, v, FISH_STALL);
    stall(x, v, TEA_STALL);
    clutter(x, v, { x: 1112, seed: 41, n: 2, kinds: ['crate', 'crate'] });
    drawDen(x, v);
    drawBonded(x, v);
    drawForklift(x, v);

    for (const bx of L.bollards) {
      const b = sx(bx);
      if (!onScreen(v, b - 8, 16)) continue;
      box(x, b - 5, y(10), 10, 10, '#1a0f08', 'rgba(' + O + ',.7)'); box(x, b - 7, y(12), 14, 3, '#24140a', 'rgba(' + O + ',.7)');
    }

    // fishing rods out over the edge
    for (const [rx, rh, reach] of [[2128, 22, 70], [2172, 30, 84]]) {
      const s = sx(rx);
      if (!onScreen(v, s - 10, reach + 20)) continue;
      x.strokeStyle = 'rgba(150,110,70,.85)'; x.beginPath(); x.moveTo(s, y(rh)); x.lineTo(s + reach, y(rh + 34)); x.stroke();
      const dip = Math.sin(t * 0.03 + rx) * 3;
      x.strokeStyle = 'rgba(220,220,220,.25)'; x.beginPath(); x.moveTo(s + reach, y(rh + 34)); x.lineTo(s + reach + 6, gy + 30 + dip); x.stroke();
      x.fillStyle = 'rgba(' + RED + ',.8)'; x.fillRect(s + reach + 5, gy + 30 + dip, 2, 2);
    }
    box(x, sx(2112), y(8), 12, 8, '#3a3a2a', 'rgba(220,200,160,.4)');

    // BERTH 9 on its post, the taxi pad, the ferry timetable
    box(x, sx(L.berth) - 1, y(88), 3, 88, '#2a160a');
    sign(x, t, 'BERTH 9', sx(L.berth), y(96), O, { size: 8, phase: 30 });
    drawTaxiPad(x, v, L.taxi);
    const fx = sx(L.ferry);
    if (onScreen(v, fx - 30, 60)) { box(x, fx - 1, y(44), 3, 44, '#2a160a'); notice(x, t, fx, y(74), 58, 32, ['FERRY', 'TIMES'], 2); }
    ticker(x, v, { x: L.ferry + 2, h: 84, w: 74, tall: 10, mount: 'pole', text: 'NIGHT FERRY 7 · BOARDING SUSPENDED · AWAITING CARGO CLEARANCE', col: YELLOW, speed: 0.35 });

    // end of the pier: the railing, its padlocks, the beacon
    const ex = sx(L.rails);
    if (onScreen(v, ex - 10, 100)) {
      x.strokeStyle = 'rgba(' + O + ',.6)'; x.beginPath(); x.moveTo(ex, y(24) + 0.5); x.lineTo(ex + 76, y(24) + 0.5); x.moveTo(ex, y(14) + 0.5); x.lineTo(ex + 76, y(14) + 0.5); x.stroke();
      for (let i = 0; i <= 76; i += 19) { x.beginPath(); x.moveTo(ex + i + 0.5, y(0)); x.lineTo(ex + i + 0.5, y(24)); x.stroke(); }
      const LOCKS = ['#c83a2a', '#d8b040', '#8e949e', '#5a8a3a', '#e8e0d0', '#8a3a8a', '#d86a2a', '#c86a5a', '#8e949e'];
      LOCKS.forEach((col, i) => { const lx = ex + 6 + i * 7 + (i > 4 ? 6 : 0); x.fillStyle = col; x.fillRect(lx, y(23) + 2, 4, 4); x.strokeStyle = col; x.beginPath(); x.arc(lx + 2, y(23) + 2, 1.5, Math.PI, 0); x.stroke(); });
      x.fillStyle = 'rgba(200,60,60,.8)'; x.fillRect(ex + 41, y(23) + 6, 1, 6); x.fillRect(ex + 43, y(23) + 6, 1, 5);
      const bx = sx(L.beacon);
      box(x, bx - 1, y(110), 3, 110, '#2a160a', 'rgba(' + O + ',.6)');
      x.fillStyle = Math.sin(t * 0.03) > 0.6 ? 'rgba(255,217,165,.2)' : 'rgba(255,217,165,.9)'; x.fillRect(bx - 3, y(116), 7, 6);
    }

    // the people of the pier, and the stray drone gull doing its rounds
    drawPeople(x, v, PIER);
    guard.facing = v.flags['harbor:bribed'] ? 1 : -1;
    guard.act = v.flags['harbor:bribed'] ? 'smoke' : 'stand';
    drawPerson(x, v, guard);
    drawPeople(x, v, TALKERS);
    drawPeople(x, v, BIRDS);
    drawPerson(x, v, CAT);
    camera(x, v, { x: 156, h: 136, facing: 1, phase: 11 });
    const du = t * 0.006, dwx = 1460 + Math.sin(du) * 240, dh = 128 + Math.sin(du * 2) * 22, ds = sx(dwx, 0.95), dy = y(dh);
    if (onScreen(v, ds - 30, 60)) {
      if (Math.sin(du * 3) > 0.55) {
        x.fillStyle = 'rgba(' + RED + ',.07)'; x.beginPath(); x.moveTo(ds - 1, dy + 2); x.lineTo(ds - 18, y(0)); x.lineTo(ds + 18, y(0)); x.lineTo(ds + 1, dy + 2); x.closePath(); x.fill();
        x.fillStyle = 'rgba(' + RED + ',.5)'; x.fillRect(Math.round(ds - 16), Math.round(y(0) - 10 - Math.abs(Math.sin(t * 0.09)) * 30), 32, 1);
      }
      gullFlying(x, ds, dy, t, Math.cos(du) > 0 ? 1 : -1, true);
    }

    // ---- the pier's face and the water in front of it, moving ----
    x.fillStyle = '#0c0805'; x.fillRect(0, gy, v.viewW, 12);
    x.fillStyle = 'rgba(' + O + ',.55)'; x.fillRect(0, gy, v.viewW, 1);
    x.fillStyle = '#01030a'; x.fillRect(0, gy + 12, v.viewW, v.viewH - gy - 12);
    for (let wx = 60; wx < L.width; wx += 180) {
      const s = sx(wx);
      if (!onScreen(v, s - 8, 16)) continue;
      x.strokeStyle = 'rgba(40,30,25,1)'; x.lineWidth = 3; x.beginPath(); x.arc(s, gy + 9, 5, 0, 7); x.stroke(); x.lineWidth = 1;
    }
    for (let k = 0; k < 7; k++) {
      const wy = gy + 16 + k * 6, sp = 0.2 + k * 0.08, a = 0.09 - k * 0.009;
      for (let wx = -60; wx < v.viewW + 60; wx += 46 + k * 9) {
        const px2 = ((wx - v.cam * (1 + k * 0.04) + t * sp) % (v.viewW + 120) + v.viewW + 120) % (v.viewW + 120) - 60;
        x.fillStyle = 'rgba(170,210,255,' + a + ')'; x.fillRect(Math.round(px2), Math.round(wy + Math.sin(t * 0.04 + wx) * 1.5), 14 + k * 2, 1);
      }
    }
    for (const c of L.cranes) {
      const s = sx(c.x);
      for (let i = 0; i < 8; i++) { x.fillStyle = 'rgba(255,217,165,' + 0.08 * (1 - i / 8) + ')'; x.fillRect(s - 8 + Math.sin(t * 0.05 + i) * 2, gy + 16 + i * 4, 16, 2); }
    }
    for (const lx of [L.den + 64, L.fish.x + 56, L.drinks.x + 48]) {
      const s = sx(lx);
      for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(255,190,110,' + 0.07 * (1 - i / 6) + ')'; x.fillRect(s - 10 + Math.sin(t * 0.05 + i + lx) * 2, gy + 16 + i * 5, 20, 2); }
    }
  },

  drawFront(x, v) {
    // near bollards with their ropes, passing at the bottom of the view; a gull on one
    for (const fx of [360, 1040, 1900]) {
      const s = v.sx(fx, 1.3), base = v.gy + 46;
      if (!onScreen(v, s - 20, 140)) continue;
      box(x, s - 10, base - 18, 20, 18, '#020100', 'rgba(' + O + ',.3)'); box(x, s - 14, base - 22, 28, 5, '#020100', 'rgba(' + O + ',.3)');
      x.strokeStyle = 'rgba(120,90,60,.5)'; x.lineWidth = 2; x.beginPath(); x.moveTo(s + 10, base - 14); x.quadraticCurveTo(s + 60, base - 2, s + 120, base - 30); x.stroke(); x.lineWidth = 1;
    }
  },
};

const FISH_STALL: StallSpec = { x: L.fish.x, w: L.fish.w, seed: 31, sign: 'FISH', col: PAPER, goods: 'fish', awning: 'tarp', light: 'bulb', vendor: fishSeller, note: ['CASH', 'ONLY'] };
const TEA_STALL: StallSpec = { x: L.drinks.x, w: L.drinks.w, seed: 34, sign: 'HOT DRINKS', col: O, goods: 'noodles', awning: 'tin', light: 'tube', vendor: teaMan,
  back: (x, v, p) => menuBoard(x, v, { x: p.x + p.w * 0.5, h: p.h0 + 10, w: 60, tall: 36, title: 'NIGHT SHIFT', items: [['TEA', '1T'], ['COFFEE', '1T'], ['BROTH', '1T']], phase: 50 }) };

/** The container stacks, bottom to top, each box sitting a little crooked on the one below. */
function L_STACKS(x: CanvasRenderingContext2D, v: View) {
  for (const s of STACKS) {
    if (!onScreen(v, v.sx(s.x) - 20, 180)) continue;
    let dx = 0;
    s.boxes.forEach((b, i) => { dx += b.dx ?? 0; container(x, v, s.x + dx - (b.dx ?? 0), i * CH, b); });
  }
}
