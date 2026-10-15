/**
 * The stacks on the canvas: terminal 2 behind the harbor pier, berth 4, at
 * night. Container blocks A, B and C, ship-to-shore crane STS-2 straddling the
 * quay with its boom out over the water, the Port Authority's thermal gate the
 * crane's load passes through, and NIGHT FERRY 7 tied up at the quay, its hatch
 * open, waiting for one box.
 *
 * Play band (brightest): the gate booth back to the pier, the Port Authority's
 * board, the lane to warehouse 4, the front row of the blocks, STS-2's legs,
 * ladder and chassis lane, the straddle carrier, the thermal gate, the ferry's
 * deck (gangway terminal, hatch, lashers, and 0451 once it lands), the people.
 * Middle band: the blocks' back rows, the crane's boom and machinery house, the
 * ferry's bridge, the Registry's watchdog flying its round as a drone. Far band:
 * the bay, the far city, the Spire standing in the water with its antenna,
 * ships at anchor.
 *
 * Where the devices stand for tapping, E and hack vision is stacks.json
 * (`layout.spot`); this draws them there. Where STS-2's trolley is and what it
 * carries is rules.ts (`trolley`), so the gate's timing and the picture agree.
 */

import { drawCharacter, drawCharacters, type Character } from '../characters';
import type { EngineDraw } from '../engine/host';
import type { SceneModel } from '../engine/model';
import { CH, container, gullFlying, type Crate } from '../scenes/harbor';
import { box, C, drawTowers, GREEN, notice, O, onScreen, PAPER, RED, rng, sign, tell, text, towers, type View } from '../scenes/kit';
import { camera, taped, ticker, YELLOW } from '../scenes/screens';
import { H, KIND, trolley, X } from './rules';

/** The terminal: 1760 wide. */
export const STACKS_W = 1760;

/** Where things are (world x; heights above the quay). Devices stand at their `layout.spot` in stacks.json; these agree. */
export const L = {
  booth: { x: 0, w: 62, h: 70 },
  gate: 34,
  spawn: 86,
  gatekeeper: 108,
  notice: 160,
  lane: 214,
  blocks: [{ x: 252, tiers: 2 }, { x: X.slot - 64, tiers: 2 }, { x: 580, tiers: 1 }],
  legs: [744, 1000],
  ladder: 770,
  signaller: 868,
  inspector: 1010,
  quay: 1112,
  kiosk: 1214,
  hatch: { x0: 1262, x1: 1340 },
  lasher: 1376,
  bridge: { x0: 1572, x1: 1744 },
  boom: 206,
};

// ---------- people ----------

const HIVIS = { garb: 'hivis' as const, hair: 'helmet' as const };
const gatekeeper: Character = { id: 'gatekeeper', seed: 7301, look: { body: 'wide', garb: 'jacket', hair: 'cap', top: '#2e3a4a', extras: ['glasses'] }, x: L.gatekeeper, act: 'stand', facing: 1, name: 'GATEKEEPER', talk: [
  ['Terminal 2. Authorised vehicles only.', 'You are not a vehicle, so the rule does not cover you. I am not paid to extend it.'],
  ['Warehouse 4 is down the lane. Registry evidence now. Used to be the Tide\'s.', 'I used to wave at the Tide\'s trucks. Now I wave at nobody, on a schedule.'],
] };
const inspector: Character = { id: 'inspector', key: true, seed: 7302, look: { body: 'tall', garb: 'jacket', hair: 'short', top: '#3a4458', extras: ['visor'] }, x: L.inspector, act: 'stand', facing: -1, name: 'PORT INSPECTOR', talk: [
  ['Thermal inspection. A container is meant to be the temperature on its label.', 'A reefer at four degrees reads four. If it reads thirty-one, something in it is breathing, and breathing cargo is my paperwork.'],
  ['The gate wires itself to the alarm. I don\'t touch it. The Registry\'s watchdog checks the wiring every round.', 'When the dog sits on my gate the whole gate freezes. Nothing gets in or out of it. I take my break then. Everyone does.'],
  ['The crane only lifts once the dog has cleared the ferry. Then it\'s three seconds and it\'s back at my gate.', 'You learn its walk. Port, crane, ferry. Port, crane, ferry. Like a man who forgot why he came into a room.'],
] };
const signaller: Character = { id: 'signaller', seed: 7303, look: { body: 'old', ...HIVIS, acc: '#d8b040' }, x: L.signaller, act: 'direct', facing: 1, name: 'SIGNALLER', talk: [
  ['I wave at the crane. The crane ignores me.', 'Forty years. Longest relationship I\'ve had.'],
  ['The camera on STS-2 reads every roof in the blocks. The yard system lost one tonight. The camera never loses anything. Shame about the people upstairs.'],
] };
const lasher: Character = { id: 'lasher', seed: 7304, look: { body: 'avg', ...HIVIS, acc: '#d86a2a', extras: ['headphones'] }, x: L.lasher, act: 'stand', facing: -1, name: 'LASHER', talk: [
  ['Eleven boxes down the hatch, lashed. One slot on deck for a reefer, plug ready.', 'Schedule says NRLU-something. Yard system says it doesn\'t exist. I\'ve lashed things that don\'t exist before. They pay the same.'],
  ['The ferry leaves when it\'s full. It\'s been one box from full since Tuesday.', 'The captain\'s asleep in the bridge. He says wake him when it\'s full. He says it like a man who knows.'],
] };
const MOTH: Character = { seed: 4510, look: { body: 'slim', garb: 'coat', hair: 'hood', top: '#3a3438', acc: '#5a3a6a', extras: ['headphones'] }, x: X.deck + 52, h: 6, act: 'sit', facing: -1 };
/** STS-2's operator, in the cab under the trolley. */
const operator: Character = { seed: 7305, look: { body: 'avg', garb: 'hivis', hair: 'short', extras: ['headphones'] }, x: 0, h: 166, act: 'sit', facing: 1, ps: 2 };
const tally: Character = { id: 'tally', seed: 7306, look: { bot: 'minidrone', paint: '#d8a03a' }, x: 300, h: 132, act: 'hover', range: [300, 640], name: 'TALLY-4', talk: [
  ['COUNT: 1,204 CONTAINERS. COUNT: 1,204. COUNT: 1,203.', 'RECOUNT.'],
  ['BLOCK B, BACK ROW, SLOT 6: YARD RECORD MISSING. CONTAINER PRESENT. CONTAINER CANNOT BE PRESENT. RECOUNT.'],
] };
const GULLS: Character[] = [
  { id: 'gull1', look: 'gull', x: 322, h: 2 * CH, act: 'stand', facing: -1, name: 'GULL', talk: [['(The gull looks at you, then at the stack under its feet, then screams as if you own it.)'], ['(It edges along the container roof to keep exactly out of reach.)']] },
  { id: 'gull2', look: 'gull', seed: 3, x: 1196, act: 'walk', range: 40, name: 'GULL', talk: [['(It is guarding the gangway. From whom is not clear. Possibly you.)'], ['(It steps aside. It steps back. It has made a point.)']] },
];
const pigeon: Character = { look: 'pigeon', seed: 11, x: 196, act: 'walk', range: 26 };
/** People who are here without a word for you: a docker on his break, a second lasher, a robot carrying lashing bars. */
const QUIET: Character[] = [
  { seed: 7311, look: { body: 'wide', ...HIVIS, acc: '#e8e0d0' }, x: 704, h: 10, act: 'sit', facing: -1 },
  { seed: 7312, look: { body: 'short', ...HIVIS, acc: '#d8b040', extras: ['backpack'] }, x: 560, act: 'sweep', range: [560, 640] },
  { look: { bot: 'loader', paint: '#c8641e' }, x: 1170, act: 'carry', range: [1170, 1350] },
];

/** Everyone who answers E here (the engine makes the targets). */
export const PEOPLE: Character[] = [gatekeeper, inspector, signaller, lasher, tally, ...GULLS, pigeon];

// ---------- the far band ----------

const SKYLINE = towers(57, 1700, [16, 40], [18, 66], 0.08);
const ripples: [number, number, number][] = (() => { const r = rng(61); return Array.from({ length: 90 }, () => [r() * 2000, 4 + r() * 70, 4 + r() * 14]); })();
const HZ = 76;

/** The bay: water to the horizon, the far city, the Spire standing in the water with its antenna, ships. */
function farBand(x: CanvasRenderingContext2D, v: View, m: SceneModel) {
  const { y, t } = v;
  drawTowers(x, v, SKYLINE, 0.12, y(HZ), 0.12, '#030100', 1);
  // the Spire: its foot in the bay, its towers on a deck, the antenna on the tallest (a landmark: the one bright thing far off)
  const sp = v.sx(1500, 0.1);
  if (onScreen(v, sp - 80, 200)) {
    x.fillStyle = '#040203';
    x.fillRect(sp - 8, y(HZ + 150), 26, 150); x.fillRect(sp - 60, y(HZ + 172), 130, 22);
    x.fillRect(sp - 50, y(HZ + 230), 22, 58); x.fillRect(sp - 18, y(HZ + 260), 30, 88); x.fillRect(sp + 24, y(HZ + 214), 24, 42);
    x.strokeStyle = 'rgba(' + O + ',.12)'; x.strokeRect(sp - 60.5, y(HZ + 172) + 0.5, 130, 22); x.strokeRect(sp - 7.5, y(HZ + 150) + 0.5, 26, 150);
    x.fillStyle = 'rgba(' + O + ',.18)'; x.fillRect(sp - 3, y(HZ + 300), 2, 40);
    x.fillStyle = Math.sin(t * 0.05) > 0.2 ? 'rgba(' + RED + ',.85)' : 'rgba(' + RED + ',.2)'; x.fillRect(sp - 4, y(HZ + 302), 4, 3);
    for (let i = 0; i < 12; i++) { x.fillStyle = 'rgba(255,217,165,' + (0.08 + 0.1 * ((i * 7) % 3) / 2) + ')'; x.fillRect(sp - 14 + (i % 4) * 7, y(HZ + 250 - Math.floor(i / 4) * 22), 3, 2); }
  }
  // the water
  x.fillStyle = '#01040a'; x.fillRect(0, y(HZ), v.viewW, v.gy - y(HZ));
  x.fillStyle = 'rgba(' + O + ',.1)'; x.fillRect(0, y(HZ), v.viewW, 1);
  const span = v.viewW + 40;
  for (const [rx, rh, len] of ripples) {
    const px = (((rx - v.cam * (0.12 + 0.4 * (1 - rh / HZ)) + t * 0.08) % span) + span) % span - 20;
    x.fillStyle = 'rgba(170,210,255,' + (0.04 + 0.06 * (1 - rh / HZ)) + ')'; x.fillRect(Math.round(px), y(rh), Math.round(len), 1);
  }
  // the Spire's lights lying on the water
  if (onScreen(v, sp - 20, 40)) for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(' + RED + ',' + 0.05 * (1 - i / 6) + ')'; x.fillRect(sp - 6 + Math.sin(t * 0.04 + i) * 2, y(HZ - 4 - i * 6), 8, 1); }
  // a ship at anchor, and once the ferry has gone, its lights far out on the water
  const s1 = v.sx(260, 0.12);
  if (onScreen(v, s1, 200)) { x.fillStyle = '#040302'; x.fillRect(s1, y(HZ + 10), 190, 10); for (let k = 10; k < 150; k += 9) x.fillRect(s1 + k, y(HZ + 26), 8, 16); x.fillStyle = 'rgba(' + GREEN + ',.4)'; x.fillRect(s1 + 2, y(HZ + 12), 2, 2); }
  if (m.get('departed')) {
    const fx = v.sx(1900 - Math.min(700, (t % 40000) * 0.02), 0.25), wl = y(HZ - 18);
    if (onScreen(v, fx - 40, 80)) { x.fillStyle = '#060403'; x.fillRect(fx - 30, wl - 6, 60, 6); x.fillStyle = 'rgba(255,217,165,.6)'; for (let i = -24; i < 24; i += 6) x.fillRect(fx + i, wl - 4, 2, 2); x.fillStyle = 'rgba(' + GREEN + ',.7)'; x.fillRect(fx + 28, wl - 8, 2, 2); }
  }
  // gulls high up
  for (let i = 0; i < 5; i++) {
    const wx = ((i * 431 + t * (0.3 + i * 0.07)) % 2200) - 200, s = v.sx(wx, 0.8);
    if (s > -10 && s < v.viewW + 10) gullFlying(x, s, y(150 + i * 22 + Math.sin(t * 0.02 + i) * 8), t + i * 9, 1);
  }
}

// ---------- the blocks ----------

/** Block fronts: the row you see, bottom to top (the back rows rise behind, dimmer). Codes face the other way: the roofs carry them for the crane. */
const FRONT: Crate[][] = [
  [{ w: 128, p: 0, seed: 21 }, { w: 128, p: 5, seed: 22, dx: -5 }],
  [{ w: 128, p: 2, seed: 23 }, { w: 128, p: 1, seed: 24, dx: 6 }],
  [{ w: 128, p: 6, seed: 25 }, { w: 66, p: 3, seed: 26, dx: 30 }],
];
const BACK: Crate[][] = [
  [{ w: 128, p: 4, seed: 31 }, { w: 128, p: 7, seed: 32 }, { w: 128, p: 2, seed: 33 }],
  [{ w: 128, p: 3, seed: 34 }, { w: 128, p: 5, seed: 35 }, { w: 128, p: 0, seed: 36 }],
  [{ w: 128, p: 1, seed: 37 }, { w: 128, p: 6, seed: 38 }],
];

function blocks(x: CanvasRenderingContext2D, v: View, back: boolean) {
  L.blocks.forEach((b, i) => {
    if (!onScreen(v, v.sx(b.x) - 30, 200)) return;
    if (back) {
      // the back rows, behind and higher: drawn small-offset and dimmed
      x.save(); x.globalAlpha = 0.45;
      BACK[i].forEach((k, j) => container(x, v, b.x + 10, j * CH + 8, k));
      x.restore();
      return;
    }
    FRONT[i].slice(0, b.tiers).forEach((k, j) => container(x, v, b.x, j * CH, k));
    // the block's letter on a plate on its end, and the bay number painted on the ground
    const lx = v.sx(b.x) - 6;
    box(x, lx - 12, v.y(48), 14, 14, '#e0d4b8', 'rgba(40,30,20,.9)');
    text(x, 'ABC'[i], lx - 5, v.y(41), 'rgba(30,18,8,.95)', 9, '700');
  });
  // someone's tomatoes in paint tins on top of block A, with a watering can: a garden on a box
  const g = v.sx(L.blocks[0].x + 30), top = v.y(2 * CH);
  if (onScreen(v, g - 10, 80)) {
    for (let i = 0; i < 4; i++) {
      const px = g + i * 14;
      box(x, px, top - 9, 9, 9, ['#8a8e96', '#c8b890', '#6a6e78', '#a8642a'][i], 'rgba(255,217,165,.4)');
      x.fillStyle = '#3e6a2a'; x.fillRect(px + 4, top - 18, 1, 9); x.fillRect(px + 1, top - 15, 7, 2); x.fillRect(px + 2, top - 19, 5, 2);
      x.fillStyle = '#c83a2a'; x.fillRect(px + 1, top - 13, 2, 2); if (i % 2) x.fillRect(px + 6, top - 16, 2, 2);
    }
    box(x, g + 60, top - 7, 10, 7, '#5a8a3a', 'rgba(255,217,165,.35)'); x.fillStyle = '#5a8a3a'; x.fillRect(g + 70, top - 7, 5, 1);
  }
}

// ---------- STS-2 ----------

/** The crane's frame: legs, portal beam, the boom out over the water, the machinery house, the A-frame. */
function craneFrame(x: CanvasRenderingContext2D, v: View, m: SceneModel, front: boolean) {
  const { sx, y, t } = v, [a, b] = L.legs, steel = '#21110a', edge = 'rgba(' + O + ',.8)';
  if (!front) {
    // the boom, the A-frame and the machinery house: behind everything on the quay
    const b0 = sx(230), b1 = sx(1736), ap = sx(870);
    x.strokeStyle = 'rgba(' + O + ',.45)'; x.lineWidth = 3; x.beginPath(); x.moveTo(sx(a) + 3, y(232)); x.lineTo(ap, y(300)); x.lineTo(sx(b) + 3, y(232)); x.stroke(); x.lineWidth = 1;
    x.strokeStyle = 'rgba(' + O + ',.28)'; x.beginPath(); x.moveTo(ap, y(300)); x.lineTo(b0 + 4, y(L.boom + 4)); x.moveTo(ap, y(300)); x.lineTo(b1 - 4, y(L.boom + 4)); x.moveTo(ap, y(296)); x.lineTo(sx(1300), y(L.boom + 4)); x.stroke();
    box(x, b0, y(L.boom + 6), b1 - b0, 5, steel, edge); box(x, b0, y(L.boom - 6), b1 - b0, 3, steel, edge);
    x.strokeStyle = 'rgba(' + O + ',.35)'; x.beginPath(); for (let i = b0; i < b1 - 12; i += 14) { x.moveTo(i, y(L.boom - 6)); x.lineTo(i + 14, y(L.boom + 4)); } x.stroke();
    box(x, sx(820), y(258), 100, 26, '#1a0e08', edge);
    text(x, 'STS-2', sx(870), y(244), 'rgba(' + PAPER + ',.8)', 9, '600');
    x.fillStyle = Math.sin(t * 0.04) > 0 ? 'rgba(' + RED + ',1)' : 'rgba(' + RED + ',.25)'; x.fillRect(ap - 2, y(306), 4, 4);
    // the far leg pair, dimmer
    for (const lx of [a + 18, b + 18]) box(x, sx(lx), y(232), 5, 232, '#140a06', 'rgba(' + O + ',.35)');
    return;
  }
  // the near legs, the portal beam, the cross-bracing, hazard feet, the ladder and its cage
  for (const lx of [a, b]) {
    box(x, sx(lx), y(232), 8, 232, steel, edge);
    for (let k = 0; k < 4; k++) { x.fillStyle = k % 2 ? 'rgba(20,12,6,1)' : 'rgba(' + YELLOW + ',.6)'; x.fillRect(sx(lx), y(30 - k * 6), 8, 6); }
    box(x, sx(lx) - 8, y(9), 24, 9, '#2a160a', edge);
  }
  box(x, sx(a), y(176), sx(b) - sx(a) + 8, 8, steel, edge);
  x.strokeStyle = 'rgba(' + O + ',.3)'; x.beginPath(); x.moveTo(sx(a) + 8, y(60)); x.lineTo(sx(b), y(168)); x.moveTo(sx(b), y(60)); x.lineTo(sx(a) + 8, y(168)); x.stroke();
  const ld = sx(L.ladder);
  x.strokeStyle = 'rgba(' + PAPER + ',.35)'; x.beginPath(); x.moveTo(ld - 6.5, y(0)); x.lineTo(ld - 6.5, y(170)); x.moveTo(ld + 6.5, y(0)); x.lineTo(ld + 6.5, y(170)); x.stroke();
  x.fillStyle = 'rgba(' + PAPER + ',.3)'; for (let h = 6; h < 170; h += 8) x.fillRect(ld - 6, y(h), 12, 1);
  // the crane's ground panel by the ladder: cyan, it is a thing you use (its status lamp follows the crane)
  box(x, ld - 9, y(52), 18, 22, '#0d1416', 'rgba(' + C + ',.75)');
  const busy = m.scratch.liftT0 !== undefined || m.scratch.retT0 !== undefined;
  x.fillStyle = busy ? 'rgba(255,170,40,' + (Math.floor(t / 8) % 2 ? 0.95 : 0.3) + ')' : 'rgba(' + C + ',.5)'; x.fillRect(ld - 6, y(48), 12, 3);
  x.fillStyle = 'rgba(' + C + ',.35)'; for (let r = 0; r < 3; r++) x.fillRect(ld - 6, y(42) + r * 3, 8 + (r % 2) * 3, 1);
  tell(x, t, ld + 5, y(34), 3);
  // the berth ticker on the far leg
  ticker(x, v, { x: b + 4, h: 120, w: 86, tall: 10, mount: 'wall', text: m.get('departed') ? 'BERTH 4 · NIGHT FERRY 8 · LOADING · DEPARTS WHEN FULL' : m.get('boxAt') === 'ferry' ? 'BERTH 4 · NIGHT FERRY 7 · 12 OF 12 · CLEARED TO DEPART' : 'BERTH 4 · NIGHT FERRY 7 · 11 OF 12 · AWAITING NRLU 404 0451', col: YELLOW, speed: 0.35 });
}

/** The trolley under the boom, the operator's cab, the hoist ropes, the spreader and its load (a box, or 0451). */
function load(x: CanvasRenderingContext2D, v: View, m: SceneModel, hover: boolean) {
  const { sx, y, t } = v, tr = trolley(m), tx = sx(tr.x), edge = 'rgba(' + O + ',.8)';
  if (!onScreen(v, tx - 90, 180)) return;
  box(x, tx - 12, y(L.boom - 6) + 3, 24, 7, '#2a160a', edge);
  // the cab, hanging beside the trolley, lit, with the operator in it
  const cabL = tx - 48, cabT = y(196);
  box(x, cabL, cabT, 26, 30, '#140b06', edge);
  x.fillStyle = 'rgba(255,200,130,.28)'; x.fillRect(cabL + 3, cabT + 4, 20, 16);
  operator.x = tr.x - 35;
  x.save(); x.beginPath(); x.rect(cabL + 3, cabT + 4, 20, 22); x.clip(); drawCharacter(x, v, operator); x.restore();
  x.fillStyle = 'rgba(' + O + ',.8)'; x.fillRect(cabL + 3, cabT + 20, 20, 1);
  // ropes and spreader
  const top = tr.h + CH;
  x.strokeStyle = 'rgba(' + PAPER + ',.45)'; x.beginPath(); x.moveTo(tx - 5.5, y(L.boom - 6) + 10); x.lineTo(tx - 5.5, y(top + 4)); x.moveTo(tx + 5.5, y(L.boom - 6) + 10); x.lineTo(tx + 5.5, y(top + 4)); x.stroke();
  box(x, tx - 66, y(top + 4), 132, 4, '#2a160a', edge);
  for (const k of [-66, 60]) { x.fillStyle = 'rgba(' + YELLOW + ',.6)'; x.fillRect(tx + k, y(top + 4), 6, 4); }
  if (!tr.carry) return;
  // what it carries, cut off at the deck when it goes down into the hold
  x.save(); x.beginPath(); x.rect(0, 0, v.viewW, v.gy - (tr.x > L.quay ? 0 : -60)); x.clip();
  if (tr.carry === KIND.box) reefer(x, v, tr.x - 64, tr.h, false, t);
  else container(x, v, tr.x - 64, tr.h, { w: 128, p: [0, 3, 5, 6, 2][Number(m.get('loaded') ?? 0) % 5], seed: 70 + Number(m.get('loaded') ?? 0) % 9 });
  x.restore();
  void hover;
}

/** NRLU 404 0451: a white reefer with its unit humming at one end and the crew's intercom panel. `open`: the door ajar from inside. */
function reefer(x: CanvasRenderingContext2D, v: View, wx: number, h: number, open: boolean, t: number) {
  const s0 = Math.round(v.sx(wx)), top = Math.round(v.y(h + CH)), w = 128;
  if (!onScreen(v, s0, w)) return;
  box(x, s0, top, w, CH, '#c8c4b8', 'rgba(242,238,228,.9)');
  x.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 5; i < w - 20; i += 4) x.fillRect(s0 + i, top + 4, 1, CH - 8);
  x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(s0 + 1, top + 1, w - 2, 3); x.fillRect(s0 + 1, top + CH - 4, w - 2, 3);
  // the refrigeration unit: grille, a fan behind it, a lamp
  box(x, s0 + 3, top + 5, 20, CH - 10, '#5a5a5e', 'rgba(242,238,228,.6)');
  const a = t * 0.3;
  x.strokeStyle = '#2a2a2e'; x.beginPath(); x.moveTo(s0 + 13 + Math.cos(a) * 6, top + 20 + Math.sin(a) * 6); x.lineTo(s0 + 13 - Math.cos(a) * 6, top + 20 - Math.sin(a) * 6); x.stroke();
  x.fillStyle = 'rgba(0,0,0,.35)'; for (let r = 0; r < 5; r++) x.fillRect(s0 + 5, top + 32 + r * 3, 16, 1);
  // the intercom panel: cyan, a thing you use
  box(x, s0 + 6, top + CH - 20, 12, 10, '#0d1416', 'rgba(' + C + ',.8)');
  x.fillStyle = 'rgba(' + C + ',' + (0.4 + 0.3 * Math.sin(t * 0.08)) + ')'; x.fillRect(s0 + 8, top + CH - 17, 8, 2);
  // the code, stencilled, and the reading the label does not agree with
  text(x, 'NRLU 404 0451', s0 + 30, top + 11, 'rgba(30,24,18,.85)', 7, '700', 'left');
  text(x, 'SET 4°C', s0 + 30, top + 21, 'rgba(30,24,18,.6)', 7, '600', 'left');
  // the doors at the far end: closed bars, or one leaf ajar onto a dark inside
  if (open) {
    x.fillStyle = '#060404'; x.fillRect(s0 + w - 30, top + 4, 26, CH - 8);
    const g = x.createLinearGradient(s0 + w - 30, 0, s0 + w - 4, 0); g.addColorStop(0, 'rgba(255,200,130,.0)'); g.addColorStop(1, 'rgba(255,200,130,.12)');
    x.fillStyle = g; x.fillRect(s0 + w - 30, top + 4, 26, CH - 8);
    box(x, s0 + w - 2, top + 3, 14, CH - 6, '#bdb9ad', 'rgba(242,238,228,.8)');
  } else {
    x.fillStyle = 'rgba(40,36,30,.4)'; x.fillRect(s0 + w - 18, top + 5, 2, CH - 10); x.fillRect(s0 + w - 10, top + 5, 2, CH - 10);
  }
}

/** The Port Authority's thermal gate: two posts close together, a crossbar, and a sheet of red light the load passes through. */
function gate(x: CanvasRenderingContext2D, v: View, m: SceneModel, part: 'far' | 'near', hover: boolean) {
  const { sx, y, t } = v, g = sx(X.gate), s = m.scratch, now = m.now();
  if (!onScreen(v, g - 40, 80)) return;
  const steel = '#2a2622', edge = 'rgba(220,200,160,.6)';
  const alarm = s.alarm !== undefined && now - s.alarm < 3500, cold = s.cold !== undefined && now - s.cold < 1200, warm = s.warm !== undefined && now - s.warm < 1500;
  const frozen = m.frozen('port');
  if (part === 'far') {
    box(x, g + 6, y(204), 6, 204, '#1c1a16', 'rgba(220,200,160,.35)');
    // the scanning sheet, a band of light across the boom's path
    const col = alarm || warm ? RED : cold ? GREEN : frozen ? '120,120,140' : RED;
    const sweep = (t * 2) % 70;
    x.fillStyle = 'rgba(' + col + ',' + (alarm ? 0.16 : 0.07) + ')'; x.fillRect(g - 3, y(196), 14, 76);
    if (!frozen) { x.fillStyle = 'rgba(' + col + ',.8)'; x.fillRect(g - 4, y(196 - sweep), 16, 1); }
    return;
  }
  box(x, g - 6, y(208), 8, 208, steel, edge);
  box(x, g - 10, y(214), 26, 8, steel, edge);
  for (let k = 0; k < 3; k++) { x.fillStyle = k % 2 ? 'rgba(20,12,6,1)' : 'rgba(' + YELLOW + ',.6)'; x.fillRect(g - 6, y(24 - k * 8), 8, 8); }
  // emitters along the post where the sheet is
  for (let h = 124; h < 196; h += 12) { x.fillStyle = frozen ? 'rgba(140,140,160,.5)' : 'rgba(' + RED + ',' + (0.4 + 0.4 * Math.sin(t * 0.2 + h)) + ')'; x.fillRect(g + 2, y(h), 3, 2); }
  // the beacon on top and its alarm
  const on = alarm && Math.floor(t / 6) % 2 === 0;
  x.fillStyle = on ? 'rgba(' + RED + ',1)' : 'rgba(' + RED + ',.25)'; x.fillRect(g - 4, y(222), 8, 6);
  if (on) {
    const glow = x.createRadialGradient(g, y(219), 2, g, y(219), 70);
    glow.addColorStop(0, 'rgba(' + RED + ',.3)'); glow.addColorStop(1, 'rgba(' + RED + ',0)');
    x.fillStyle = glow; x.fillRect(g - 70, y(290), 140, 140);
  }
  // the gate's panel at hand height: cyan, a thing you use; its plate printed, not neon
  box(x, g - 22, y(66), 30, 22, '#0d1416', 'rgba(' + C + ',.75)');
  text(x, frozen ? 'FROZEN' : alarm ? 'ALARM' : cold ? 'CLEAR' : 'SCAN', g - 7, y(58), frozen ? 'rgba(200,200,220,.9)' : alarm ? 'rgba(' + RED + ',.95)' : cold ? 'rgba(' + GREEN + ',.95)' : 'rgba(' + C + ',.85)', 7, '600');
  text(x, 'BERTH 4', g - 7, y(50), 'rgba(' + PAPER + ',.6)', 7, '600');
  box(x, g - 40, y(90), 64, 16, '#e0d4b8', 'rgba(40,30,20,.9)');
  text(x, 'THERMAL GATE', g - 8, y(85), 'rgba(30,18,8,.95)', 7, '700');
  text(x, 'PORT AUTHORITY', g - 8, y(78), 'rgba(110,20,20,.95)', 7, '700');
  tell(x, t, g + 6, y(38), 5);
  if (hover) { x.save(); x.strokeStyle = 'rgba(255,61,242,.85)'; x.shadowColor = 'rgba(255,61,242,.8)'; x.shadowBlur = 8; x.strokeRect(g - 26.5, y(152) - 0.5, 40, 154); x.restore(); }
}

/** The Registry's watchdog, as you see it from the quay: a grey drone with a red eye flying its round, port → crane → ferry. */
function watchdogDrone(x: CanvasRenderingContext2D, v: View, m: SceneModel) {
  const d = m.watchdogs()[0];
  if (!d) return;
  const at: Record<string, number> = { port: X.gate - 4, sts2: L.ladder + 40, ferry: L.kiosk + 6 };
  const k = d.progress * d.progress * (3 - 2 * d.progress);
  const wx = d.at ? at[d.at] : at[d.from] + (at[d.to] - at[d.from]) * k;
  const hh = d.at ? 132 + Math.sin(v.t * 0.05) * 3 : 150 + Math.sin(Math.PI * d.progress) * 24;
  const s = v.sx(wx), sy = v.y(hh);
  if (!onScreen(v, s - 30, 60)) return;
  if (d.at) {
    // sitting: it looks the device over, a cone of grey light
    x.fillStyle = 'rgba(200,205,220,.07)'; x.beginPath(); x.moveTo(s - 2, sy + 4); x.lineTo(s - 26, v.y(0)); x.lineTo(s + 26, v.y(0)); x.lineTo(s + 2, sy + 4); x.closePath(); x.fill();
  }
  box(x, s - 9, sy - 3, 18, 6, '#4a4e58', 'rgba(220,225,235,.6)');
  x.fillStyle = '#2a2e36'; x.fillRect(s - 15, sy - 5, 6, 1); x.fillRect(s + 9, sy - 5, 6, 1);
  const spin = Math.floor(v.t / 2) % 2;
  x.fillStyle = 'rgba(220,225,235,.5)'; x.fillRect(s - 17 + spin * 2, sy - 6, 6, 1); x.fillRect(s + 11 - spin * 2, sy - 6, 6, 1);
  x.fillStyle = 'rgba(' + RED + ',' + (Math.floor(v.t / 10) % 2 ? 1 : 0.4) + ')'; x.fillRect(s - 1, sy + 1, 3, 2);
  text(x, 'REGISTRY', s, sy - 9, 'rgba(' + PAPER + ',.45)', 7, '600');
}

/** NIGHT FERRY 7 at berth 4 (NIGHT FERRY 8 once 7 has gone): deck, gangway terminal, the hatch, the bridge. */
function ferry(x: CanvasRenderingContext2D, v: View, m: SceneModel, hover: string | null) {
  const { sx, y, t, gy } = v, q = sx(L.quay), right = sx(STACKS_W);
  if (!onScreen(v, q, right - q)) return;
  const name = m.get('departed') ? 'NIGHT FERRY 8' : 'NIGHT FERRY 7';
  // the bridge: tall, windows lit, a funnel and a mast with its lights
  const b0 = sx(L.bridge.x0), b1 = sx(L.bridge.x1);
  box(x, b0, y(108), b1 - b0, 108, '#2a0e0a', 'rgba(' + O + ',.7)');
  box(x, b0 + 18, y(146), b1 - b0 - 30, 38, '#240c08', 'rgba(' + O + ',.6)');
  x.fillStyle = 'rgba(255,217,165,.5)'; for (let i = b0 + 24; i < b1 - 18; i += 12) x.fillRect(i, y(136), 8, 6);
  x.fillStyle = 'rgba(255,217,165,.25)'; for (let r = 0; r < 3; r++) for (let i = b0 + 8; i < b1 - 8; i += 14) if ((i + r * 5) % 3) x.fillRect(i, y(90 - r * 24), 6, 5);
  box(x, b0 + 60, y(178), 24, 32, '#3a1a10', 'rgba(' + O + ',.6)'); x.fillStyle = 'rgba(' + RED + ',.7)'; x.fillRect(b0 + 60, y(172), 24, 3);
  box(x, b1 - 30, y(210), 2, 64, '#2a160a');
  x.fillStyle = Math.floor(t / 30) % 2 ? 'rgba(255,240,215,.95)' : 'rgba(255,240,215,.3)'; x.fillRect(b1 - 31, y(212), 4, 3);
  x.fillStyle = 'rgba(' + GREEN + ',.8)'; x.fillRect(b1 - 6, y(64), 3, 3);
  text(x, name, (b0 + b1) / 2, y(28), 'rgba(' + PAPER + ',.75)', 8, '700');
  // the hatch coaming, the hold open behind it (regular boxes go down there)
  const h0 = sx(L.hatch.x0), h1 = sx(L.hatch.x1);
  box(x, h0, y(22), h1 - h0, 22, '#3a1a10', 'rgba(' + O + ',.7)');
  for (let i = h0 + 4; i < h1 - 4; i += 10) { x.fillStyle = 'rgba(' + YELLOW + ',.5)'; x.fillRect(i, y(22) + 2, 5, 2); }
  text(x, 'HOLD 2', (h0 + h1) / 2, y(10), 'rgba(' + PAPER + ',.55)', 7, '600');
  // deck lamps on posts
  for (const lx of [1250, 1520]) { const s = sx(lx); box(x, s - 1, y(70), 3, 70, '#2a160a'); box(x, s - 5, y(76), 10, 6, '#3a3020', 'rgba(255,217,165,.6)'); const gl = x.createLinearGradient(0, y(70), 0, y(0)); gl.addColorStop(0, 'rgba(255,217,165,.12)'); gl.addColorStop(1, 'rgba(255,217,165,.02)'); x.fillStyle = gl; x.beginPath(); x.moveTo(s - 3, y(70)); x.lineTo(s - 40, y(0)); x.lineTo(s + 40, y(0)); x.lineTo(s + 3, y(70)); x.closePath(); x.fill(); }
  // the gangway terminal: the purser's screen on a post
  const k = sx(L.kiosk);
  box(x, k - 1, y(40), 3, 40, '#2a2622');
  box(x, k - 12, y(58), 24, 18, '#0d1416', 'rgba(' + C + ',.75)');
  x.fillStyle = 'rgba(' + C + ',.4)'; for (let r = 0; r < 3; r++) x.fillRect(k - 9, y(54) + r * 4, 12 + (r % 2) * 4, 1);
  tell(x, t, k + 8, y(36), 6);
  if (hover === 'ferry') { x.save(); x.strokeStyle = 'rgba(255,61,242,.85)'; x.shadowColor = 'rgba(255,61,242,.8)'; x.shadowBlur = 8; x.strokeRect(k - 15.5, y(60) - 0.5, 31, 62); x.restore(); }
  // the bulwark rail along the deck's edge (behind the player), and the gangway down to the quay
  x.strokeStyle = 'rgba(' + O + ',.4)'; x.beginPath(); x.moveTo(q + 10, y(16) + 0.5); x.lineTo(b0, y(16) + 0.5); x.stroke();
  x.fillStyle = 'rgba(' + O + ',.4)'; for (let i = q + 10; i < b0; i += 24) x.fillRect(i, y(16), 1, 16);
  void gy;
}

/** The hull's side below the deck, in the near strip: rust red, its name, the waterline. */
function hull(x: CanvasRenderingContext2D, v: View, m: SceneModel) {
  const { sx, gy, t } = v, q = sx(L.quay + 6), r = sx(STACKS_W + 20);
  if (r < 0 || q > v.viewW) return;
  x.fillStyle = '#3a120c'; x.fillRect(q, gy, r - q, 26);
  x.fillStyle = 'rgba(' + O + ',.6)'; x.fillRect(q, gy, r - q, 1);
  x.fillStyle = 'rgba(0,0,0,.25)'; for (let i = q; i < r; i += 30) x.fillRect(i, gy + 2, 1, 24);
  text(x, m.get('departed') ? 'NIGHT FERRY 8' : 'NIGHT FERRY 7', sx(1420), gy + 15, 'rgba(240,230,215,.7)', 9, '700');
  x.fillStyle = '#1a0806'; x.fillRect(q, gy + 26, r - q, 4);
  x.fillStyle = 'rgba(' + RED + ',.3)'; x.fillRect(q, gy + 30, r - q, 1);
  // the gap of black water between quay and hull, and fenders
  x.fillStyle = '#01030a'; x.fillRect(q - 8, gy, 8, 40);
  for (const fx of [1160, 1360, 1560]) { const s = sx(fx); x.fillStyle = '#141010'; x.beginPath(); x.ellipse(s, gy + 12, 6, 9, 0, 0, 7); x.fill(); }
  void t;
}

// ---------- the quay ----------

/** The gate booth back to the pier, its barrier, the gatekeeper's window. */
function booth(x: CanvasRenderingContext2D, v: View) {
  const { sx, y, t } = v, B = L.booth, b = sx(B.x);
  if (!onScreen(v, b - 10, B.w + 60)) return;
  box(x, b, y(B.h), B.w, B.h, '#140b06', 'rgba(' + O + ',.8)');
  box(x, b + 8, y(54), 24, 46, '#0a0603', 'rgba(' + O + ',.7)');
  text(x, '< PIER', b + 20, y(60), 'rgba(' + PAPER + ',.75)', 7, '600');
  box(x, b + 38, y(58), 18, 20, 'rgba(255,217,165,.16)', 'rgba(' + O + ',.6)');
  box(x, b - 4, y(B.h + 4), B.w + 8, 5, '#1c0f07', 'rgba(' + O + ',.8)');
  sign(x, t, 'TERMINAL 2', b + B.w / 2, y(B.h + 14), O, { size: 8, phase: 20 });
  // the barrier arm, up
  box(x, b + B.w + 2, y(26), 6, 26, '#2a2622', 'rgba(220,200,160,.5)');
  x.save(); x.translate(b + B.w + 5, y(24)); x.rotate(-1.2);
  for (let i = 0; i < 70; i += 10) { x.fillStyle = (i / 10) % 2 ? 'rgba(' + RED + ',.8)' : 'rgba(240,230,215,.8)'; x.fillRect(i, -2, 10, 3); }
  x.restore();
}

/** The lane to warehouse 4: a gap between the booth's fence and block A, a sign on a post pointing down it. */
function lane(x: CanvasRenderingContext2D, v: View) {
  const { sx, y, t } = v, s = sx(L.lane);
  if (!onScreen(v, s - 40, 80)) return;
  // the lane recedes: darker asphalt, a lamp far down it, the warehouse's end wall
  x.fillStyle = '#060403'; x.fillRect(s - 22, y(70), 44, 70);
  box(x, s - 16, y(64), 32, 50, '#120a06', 'rgba(' + O + ',.35)');
  x.fillStyle = 'rgba(255,217,165,' + (0.25 + 0.1 * Math.sin(t * 0.03)) + ')'; x.fillRect(s - 2, y(58), 4, 3);
  text(x, 'WH 4', s, y(36), 'rgba(' + PAPER + ',.35)', 7, '600');
  // the sign over the lane's mouth, on a post at its corner
  box(x, s - 24, y(104), 3, 104, '#2a160a');
  box(x, s - 22, y(104), 46, 14, '#e0d4b8', 'rgba(40,30,20,.9)');
  text(x, 'WAREHOUSE 4', s + 1, y(99), 'rgba(30,18,8,.95)', 7, '700');
}

/** The straddle carrier: four tall legs, a cab on top, a box slung between its legs, shuttling to the chassis lane. */
function straddle(x: CanvasRenderingContext2D, v: View) {
  const P = 2200, u = v.t % P, a = 1060, b = 790;
  const k = u < 800 ? u / 800 : u < 1100 ? 1 : u < 1900 ? 1 - (u - 1100) / 800 : 0;
  const e = k * k * (3 - 2 * k), wx = a + (b - a) * e, loaded = u < 1100 || u > 2100;
  const s = v.sx(wx, 0.92), { y } = v;
  if (!onScreen(v, s - 50, 100)) return;
  const col = '#8a5a1a', edge = 'rgba(' + YELLOW + ',.55)';
  box(x, s - 36, y(96), 72, 6, col, edge);
  for (const lx of [-36, 32]) box(x, s + lx, y(96), 4, 96, col, edge);
  box(x, s + 14, y(110), 18, 14, '#1a0e06', edge);
  x.fillStyle = 'rgba(255,200,130,.3)'; x.fillRect(s + 16, y(108), 14, 6);
  x.fillStyle = Math.floor(v.t / 9) % 2 ? 'rgba(255,170,40,.95)' : 'rgba(255,170,40,.3)'; x.fillRect(s - 2, y(100), 4, 3);
  for (const lx of [-34, 34]) { x.fillStyle = '#0c0a08'; x.beginPath(); x.arc(s + lx, y(5), 5, 0, 7); x.fill(); }
  if (loaded) { x.save(); x.globalAlpha = 0.9; box(x, s - 30, y(78), 60, 30, '#2c2824', 'rgba(225,215,200,.5)'); x.restore(); }
  text(x, 'SC-11', s, y(92), 'rgba(20,12,6,.9)', 7, '700');
}

/** The chassis under the crane, with the next regular box on it (unless the spreader has it). */
function chassis(x: CanvasRenderingContext2D, v: View, m: SceneModel) {
  const { sx, y } = v, c = sx(X.chassis - 64), s = m.scratch;
  if (!onScreen(v, c - 10, 150)) return;
  box(x, c - 4, y(12), 136, 4, '#2a2622', 'rgba(220,200,160,.5)');
  for (const k of [6, 18, 104, 116]) { x.fillStyle = '#0c0a08'; x.beginPath(); x.arc(c + k, y(5), 5, 0, 7); x.fill(); x.strokeStyle = 'rgba(220,200,160,.4)'; x.stroke(); }
  const taken = s.liftT0 !== undefined && s.liftKind === KIND.regular && m.now() - s.liftT0 > 1000;
  if (!taken) container(x, v, X.chassis - 64, H.chassis, { w: 128, p: [5, 0, 3, 6, 2][(Number(m.get('loaded') ?? 0) + 1) % 5], seed: 71 + Number(m.get('loaded') ?? 0) % 9 });
}

/** The night shift's tea urn on a crate by block C, and the crate the smoking docker sits on. */
function urn(x: CanvasRenderingContext2D, v: View) {
  const { sx, y, t } = v, u = sx(672);
  if (!onScreen(v, u - 20, 70)) return;
  box(x, u - 12, y(22), 24, 22, '#5a3a1e', 'rgba(255,190,110,.5)');
  box(x, u - 6, y(40), 12, 18, '#8a8e96', 'rgba(240,236,224,.6)');
  x.fillStyle = '#2a2624'; x.fillRect(u - 3, y(44), 6, 4); x.fillRect(u + 6, y(30), 4, 2);
  for (let i = 0; i < 3; i++) { x.fillStyle = 'rgba(235,240,245,' + (0.12 - i * 0.03) + ')'; x.fillRect(u - 2 + Math.sin(t * 0.05 + i) * 2, y(46 + i * 5), 3, 2); }
  box(x, u + 20, y(10), 22, 10, '#4a3420', 'rgba(255,190,110,.4)');
}

/** The Port Authority's board at the gate: a printed notice on two posts. */
function board(x: CanvasRenderingContext2D, v: View) {
  const { sx, y, t } = v, s = sx(L.notice);
  if (!onScreen(v, s - 40, 80)) return;
  box(x, s - 24, y(40), 3, 40, '#2a160a'); box(x, s + 21, y(40), 3, 40, '#2a160a');
  notice(x, t, s, y(78), 56, 38, ['PORT', 'AUTHORITY', 'NOTICE']);
}

/** Everything in the stacks, back to front. `hover`: the device under the pointer, for its outline. */
export function drawStacks(x: CanvasRenderingContext2D, v: View, e: EngineDraw) {
  if (e.layer === 'devices') return;
  const m = e.m, { sx, y, t, gy } = v;
  // the sky's glow over the city, and the far band
  const glow = x.createLinearGradient(0, y(HZ + 70), 0, y(HZ));
  glow.addColorStop(0, 'rgba(194,65,12,0)'); glow.addColorStop(1, 'rgba(194,65,12,.12)');
  x.fillStyle = glow; x.fillRect(0, y(HZ + 70), v.viewW, 70);
  farBand(x, v, m);

  // middle band: the blocks' back rows, the crane's boom and house, the far leg pair; the Registry's drone
  blocks(x, v, true);
  craneFrame(x, v, m, false);
  // the quay's floor and its crane rail
  x.fillStyle = '#0e0905'; x.fillRect(0, y(6), sx(L.quay), 6);
  x.fillStyle = 'rgba(' + O + ',.6)'; x.fillRect(0, y(6), sx(L.quay), 1);
  x.fillStyle = 'rgba(200,190,170,.25)'; x.fillRect(0, y(2), sx(L.quay), 1);
  ferry(x, v, m, e.hover);

  // play band
  booth(x, v);
  board(x, v);
  lane(x, v);
  gate(x, v, m, 'far', false);
  load(x, v, m, e.hover === 'sts2');
  blocks(x, v, false);
  straddle(x, v);
  chassis(x, v, m);
  urn(x, v);
  craneFrame(x, v, m, true);
  if (e.hover === 'sts2') { const s = sx(L.ladder); x.save(); x.strokeStyle = 'rgba(255,61,242,.85)'; x.shadowColor = 'rgba(255,61,242,.8)'; x.shadowBlur = 8; x.strokeRect(s - 22.5, y(110) - 0.5, 45, 112); x.restore(); }
  gate(x, v, m, 'near', e.hover === 'port');
  camera(x, v, { x: 1040, h: 150, facing: -1, phase: 17 });
  taped(x, v, { x: L.legs[0] + 4, h: 70, text: ['TEA RUN', '02:00', 'ASK BEFORE', 'YOU TAKE'], tilt: -0.05 });
  // 0451 on the deck, once it has landed: the door ajar from inside, Moth sitting in it
  const tr = trolley(m);
  if (m.get('boxAt') === 'ferry' && !m.get('departed') && tr.carry !== KIND.box) {
    reefer(x, v, X.deck - 64, H.deck, true, t);
    x.strokeStyle = 'rgba(30,30,30,.9)'; x.beginPath(); x.moveTo(sx(X.deck - 60), y(16)); x.quadraticCurveTo(sx(X.deck - 80), y(2), sx(X.deck - 100), y(2)); x.stroke();
    drawCharacter(x, v, MOTH);
    if (e.hover === 'reefer') { const s = sx(X.deck); x.save(); x.strokeStyle = 'rgba(255,61,242,.85)'; x.shadowColor = 'rgba(255,61,242,.8)'; x.shadowBlur = 8; x.strokeRect(s - 66.5, y(H.deck + CH + 2) - 0.5, 133, CH + 4); x.restore(); }
  }
  // the people
  drawCharacters(x, v, QUIET);
  drawCharacters(x, v, PEOPLE);
  watchdogDrone(x, v, m);

  // the quay's face and the water in front of it, and the ferry's hull beside the quay
  x.fillStyle = '#0c0805'; x.fillRect(0, gy, sx(L.quay), 12);
  x.fillStyle = 'rgba(' + O + ',.55)'; x.fillRect(0, gy, sx(L.quay), 1);
  x.fillStyle = '#01030a'; x.fillRect(0, gy + 12, v.viewW, v.viewH - gy - 12);
  hull(x, v, m);
  for (let k = 0; k < 6; k++) {
    const wy = gy + 34 + k * 6, sp = 0.2 + k * 0.08, a = 0.08 - k * 0.01;
    for (let wx = -60; wx < v.viewW + 60; wx += 46 + k * 9) {
      const px2 = ((wx - v.cam * (1 + k * 0.04) + t * sp) % (v.viewW + 120) + v.viewW + 120) % (v.viewW + 120) - 60;
      x.fillStyle = 'rgba(170,210,255,' + a + ')'; x.fillRect(Math.round(px2), Math.round(wy + Math.sin(t * 0.04 + wx) * 1.5), 14 + k * 2, 1);
    }
  }
  // the gate's light and the crane's floodlight on the water
  const gs = sx(X.gate);
  for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(' + RED + ',' + 0.06 * (1 - i / 6) + ')'; x.fillRect(gs - 8 + Math.sin(t * 0.05 + i) * 2, gy + 34 + i * 4, 16, 2); }
  void PAPER;
}

/** Near bollards with their ropes, passing at the bottom of the view. */
export function drawStacksFront(x: CanvasRenderingContext2D, v: View) {
  for (const fx of [520, 1080, 1460]) {
    const s = v.sx(fx, 1.3), base = v.gy + 46;
    if (!onScreen(v, s - 20, 140)) continue;
    box(x, s - 10, base - 18, 20, 18, '#020100', 'rgba(' + O + ',.3)'); box(x, s - 14, base - 22, 28, 5, '#020100', 'rgba(' + O + ',.3)');
    x.strokeStyle = 'rgba(120,90,60,.5)'; x.lineWidth = 2; x.beginPath(); x.moveTo(s + 10, base - 14); x.quadraticCurveTo(s + 60, base - 2, s + 120, base - 30); x.stroke(); x.lineWidth = 1;
  }
}
