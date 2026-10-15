/**
 * Warehouse 4, from outside: down the lane behind the stacks (Harbor & Shore).
 * Twenty years the Tide's bonded store, now the Registry's evidence custody:
 * what the Registry seizes from people it counts out is kept here "pending
 * review". Its evidence locker is Act II (root fragment 3); for now the place is
 * its forecourt and a door that does not open, for a reason it states.
 *
 * Play band: the lane back to the stacks, a Tide hand mending a net on the
 * loading dock, the dock's roller doors sealed with Registry tape, the
 * personnel door with its warrant reader, the plaque, the Registry's notice
 * screen, a security mech on its round, the evidence van, a single shoe with an
 * evidence tag on the dock's edge. Middle band: the warehouse's corrugated wall,
 * high and windowless but for one lit office. Far band: the sky over the stacks,
 * the cranes, the Spire's antenna.
 *
 * No devices: nothing here to hack yet. Dry signs; the people have the jokes.
 */

import { drawCharacters, type Character } from '../characters';
import { box, C, drawTowers, notice, O, onScreen, PAPER, RED, rng, sign, text, towers, type SceneDef, type View } from './kit';
import { camera, taped, ticker, YELLOW } from './screens';

const L = {
  width: 900,
  back: 34,
  spawn: 80,
  mender: 136,
  dock: { x0: 180, x1: 430, h: 16 },
  door: 486,
  plaque: 546,
  board: 628,
  van: { x: 740, w: 120 },
  shoe: 836,
  wall: { x0: 160, x1: 900, h: 240 },
};

const mender: Character = { id: 'mender', key: true, seed: 7401, look: { body: 'old', garb: 'coat', hair: 'beanie', top: '#8a7a2a', acc: '#8a7a2a', extras: [] }, x: L.mender, h: 10, act: 'sit', facing: 1, name: 'TIDE HAND', talk: [
  ['Twenty years this was the Tide\'s. Fish in, fish out, the odd crate nobody asked about.', 'Then the Registry bought the building, the lock and the silence. Now it\'s evidence.'],
  ['Evidence of what? They don\'t say. Things people had when they got counted out. Phones. Keys. Shoes, for some reason.', 'If the Registry ever took something of yours, it\'s behind that door. Pending review.'],
  ['I mend nets out here because they let me. Nobody seizes a net. Too many holes to file.'],
] };
const PEOPLE: Character[] = [
  mender,
  { id: 'gull', look: 'gull', seed: 8, x: 736, act: 'walk', range: 30, name: 'GULL', talk: [['(The gull is standing guard over a chip packet that belongs to nobody. It looks at you like you are the review.)'], ['(It takes one step towards you. Pending.)']] },
  { look: 'pigeon', seed: 9, x: 360, h: L.dock.h, act: 'walk', range: 40 },
  { look: { bot: 'mech', paint: '#6a6e78' }, x: 560, act: 'patrol', range: [560, 820] },
];

/** The warehouse door's answer: locked, and why. */
const DOOR = ['EVIDENCE CUSTODY · ACCESS BY REGISTRY WARRANT CARD.', 'READER: PRESENT YOUR CARD. YOUR IDENTITY: NOT FOUND. A PERSON WHO IS NOT FOUND CANNOT HOLD A WARRANT. DOOR REMAINS LOCKED.'];

const FAR = towers(77, 1200, [14, 36], [20, 60], 0.06);

function drawWarehouse(x: CanvasRenderingContext2D, v: View) {
  const { sx, y, t, gy } = v;
  // far band: the city low on the horizon, STS-2's boom over the stacks' roofs, the Spire's antenna blinking
  drawTowers(x, v, FAR, 0.15, y(40), 0.1, '#030100', 1);
  const cb = sx(-200, 0.3);
  x.strokeStyle = 'rgba(' + O + ',.18)'; x.beginPath(); x.moveTo(cb, y(170)); x.lineTo(cb + 360, y(170)); x.moveTo(cb + 120, y(170)); x.lineTo(cb + 150, y(220)); x.lineTo(cb + 180, y(170)); x.stroke();
  const sp = sx(980, 0.1);
  x.fillStyle = '#040203'; x.fillRect(sp - 10, y(260), 22, 220);
  x.fillStyle = Math.sin(t * 0.05) > 0.2 ? 'rgba(' + RED + ',.8)' : 'rgba(' + RED + ',.2)'; x.fillRect(sp - 1, y(266), 3, 3);
  // the stacks' tops behind the lane, dim
  for (let i = 0; i < 6; i++) { const s = sx(-120 + i * 70, 0.6); box(x, s, y(60 + (i % 3) * 20), 64, 60 + (i % 3) * 20, '#0c0806', 'rgba(' + O + ',.15)'); }

  // middle band: the warehouse's wall, corrugated, gabled, one office lit high up
  const W = L.wall, w0 = sx(W.x0), w1 = sx(W.x1);
  x.fillStyle = '#100907'; x.fillRect(w0, y(W.h), w1 - w0, W.h);
  x.fillStyle = 'rgba(' + O + ',.06)'; for (let i = w0 + 4; i < w1; i += 6) x.fillRect(i, y(W.h), 1, W.h);
  x.strokeStyle = 'rgba(' + O + ',.4)'; x.strokeRect(w0 + 0.5, y(W.h) + 0.5, w1 - w0, W.h);
  x.fillStyle = '#0c0705'; x.beginPath(); x.moveTo(w0, y(W.h)); x.lineTo((w0 + w1) / 2, y(W.h + 50)); x.lineTo(w1, y(W.h)); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(' + O + ',.3)'; x.stroke();
  // the name, painted big and old, the Tide's under it half scrubbed off
  text(x, 'WAREHOUSE 4', sx(520), y(196), 'rgba(' + PAPER + ',.5)', 16, '700');
  text(x, 'T D  M R N', sx(520), y(176), 'rgba(' + PAPER + ',.12)', 9, '700');
  // a lit office window high up: a night clerk's lamp
  box(x, sx(720), y(150), 30, 22, 'rgba(255,200,130,.2)', 'rgba(' + O + ',.5)');
  x.fillStyle = 'rgba(255,200,130,.5)'; x.fillRect(sx(724), y(136), 4, 6);
  for (const wx of [260, 380, 620]) box(x, sx(wx), y(150), 30, 22, '#060403', 'rgba(' + O + ',.35)');
  // a gull on the gutter, a camera on the corner
  camera(x, v, { x: 170, h: 120, facing: 1, phase: 21 });
  camera(x, v, { x: 880, h: 120, facing: -1, phase: 41 });

  // play band: the lane back, the loading dock with its sealed roller doors
  const bl = sx(L.back);
  box(x, bl - 24, y(64), 48, 64, '#0a0603', 'rgba(' + O + ',.55)');
  text(x, '< STACKS', bl, y(70), 'rgba(' + PAPER + ',.7)', 7, '600');
  const D = L.dock, d0 = sx(D.x0), d1 = sx(D.x1);
  box(x, d0, y(D.h), d1 - d0, D.h, '#1a120b', 'rgba(' + O + ',.8)');
  for (let i = d0; i < d1; i += 10) { x.fillStyle = 'rgba(' + YELLOW + ',.45)'; x.fillRect(i, y(D.h) + 1, 5, 2); }
  for (const rx of [200, 316]) {
    const r = sx(rx);
    box(x, r, y(D.h + 92), 100, 92, '#1e1a16', 'rgba(220,200,160,.5)');
    x.fillStyle = 'rgba(0,0,0,.3)'; for (let k = 4; k < 92; k += 5) x.fillRect(r + 1, y(D.h + 92) + k, 98, 1);
    // Registry seal tape across it
    x.save(); x.translate(r + 50, y(D.h + 46)); x.rotate(-0.25);
    for (let k = -60; k < 60; k += 12) { x.fillStyle = (k / 12) % 2 ? 'rgba(' + RED + ',.75)' : 'rgba(240,230,215,.75)'; x.fillRect(k, -3, 12, 6); }
    x.restore();
    text(x, rx === 200 ? 'DOCK 1' : 'DOCK 2', r + 50, y(D.h + 100), 'rgba(' + PAPER + ',.55)', 7, '600');
  }
  // the personnel door: steel, a red lamp over it, the warrant reader beside it (red: it says no)
  const dr = sx(L.door);
  box(x, dr - 14, y(54), 28, 54, '#16110e', 'rgba(220,200,160,.6)');
  x.fillStyle = 'rgba(220,200,160,.4)'; x.fillRect(dr + 8, y(28), 3, 4);
  box(x, dr + 18, y(40), 10, 14, '#120606', 'rgba(' + RED + ',.7)');
  x.fillStyle = Math.floor(t / 40) % 2 ? 'rgba(' + RED + ',.95)' : 'rgba(' + RED + ',.35)'; x.fillRect(dr + 20, y(37), 6, 2);
  x.fillStyle = 'rgba(' + RED + ',.9)'; x.fillRect(dr - 3, y(62), 6, 3);
  const g = x.createRadialGradient(dr, y(61), 1, dr, y(61), 30); g.addColorStop(0, 'rgba(' + RED + ',.16)'); g.addColorStop(1, 'rgba(' + RED + ',0)');
  x.fillStyle = g; x.fillRect(dr - 30, y(90), 60, 60);
  // the plaque, printed and bolted
  const pl = sx(L.plaque);
  box(x, pl - 26, y(72), 52, 30, '#e0d4b8', 'rgba(40,30,20,.9)');
  text(x, 'EVIDENCE', pl, y(64), 'rgba(110,20,20,.95)', 7, '700');
  text(x, 'CUSTODY', pl, y(56), 'rgba(110,20,20,.95)', 7, '700');
  text(x, 'REGISTRY', pl, y(48), 'rgba(30,18,8,.95)', 7, '700');
  // the Registry's notice: a printed sheet behind glass on a post, its backlog figure on a red strip
  const nb = sx(L.board);
  box(x, nb - 1, y(36), 3, 36, '#2a2622');
  box(x, nb - 50, y(92), 100, 56, '#d8d0bc', 'rgba(40,30,20,.9)');
  x.fillStyle = 'rgba(' + RED + ',.85)'; x.fillRect(nb - 50, y(92), 100, 9);
  text(x, 'REGISTRY NOTICE', nb, y(85), 'rgba(250,240,225,.95)', 7, '700');
  ['SEIZED PROPERTY', 'HELD PENDING REVIEW', 'BACKLOG: 4 YEARS', 'CLAIMS NOT ACCEPTED'].forEach((l, i) => text(x, l, nb, y(74 - i * 9), 'rgba(30,18,8,.9)', 7, '600'));
  ticker(x, v, { x: 486, h: 92, w: 110, tall: 10, mount: 'wall', text: 'EVIDENCE CUSTODY · INTAKE 24 H · RELEASE: ON COMPLETION OF REVIEW · REVIEW: SCHEDULED', col: '255,90,70', speed: 0.3 });
  // the evidence van
  const vn = sx(L.van.x - L.van.w / 2);
  box(x, vn, y(44), L.van.w, 36, '#c8c4b8', 'rgba(242,238,228,.7)');
  box(x, vn + L.van.w - 30, y(44), 30, 36, '#b8b4a8', 'rgba(242,238,228,.7)');
  x.fillStyle = 'rgba(20,30,40,.8)'; x.fillRect(vn + L.van.w - 24, y(40), 18, 12);
  x.fillStyle = 'rgba(' + RED + ',.8)'; x.fillRect(vn, y(24), L.van.w, 3);
  text(x, 'REGISTRY', vn + 44, y(32), 'rgba(30,24,18,.85)', 7, '700');
  text(x, 'EVIDENCE TRANSPORT', vn + 44, y(16), 'rgba(30,24,18,.7)', 7, '600');
  for (const k of [18, L.van.w - 18]) { x.fillStyle = '#0c0a08'; x.beginPath(); x.arc(vn + k, y(6), 6, 0, 7); x.fill(); }
  // the shoe on the dock's edge: one, left, with its tag
  const sh = sx(L.shoe);
  box(x, sh - 6, y(5), 12, 5, '#3a2a1e', 'rgba(255,217,165,.4)'); box(x, sh - 6, y(9), 5, 4, '#3a2a1e');
  x.strokeStyle = 'rgba(240,230,215,.6)'; x.beginPath(); x.moveTo(sh + 6, y(4)); x.lineTo(sh + 12, y(8)); x.stroke();
  box(x, sh + 11, y(12), 8, 5, '#e8dcc0');
  taped(x, v, { x: 120, h: 60, text: ['NETS MENDED', 'ASK INSIDE', '(DON\'T)'], tilt: 0.04 });
  // the mender's crate, and the people
  box(x, sx(L.mender) - 10, y(10), 20, 10, '#4a3420', 'rgba(255,190,110,.4)');
  drawCharacters(x, v, PEOPLE);
  sign(x, t, 'NO ENTRY', sx(L.door), y(80), O, { size: 7, phase: 12 });
  // the forecourt's floor
  x.fillStyle = '#0c0805'; x.fillRect(0, gy, v.viewW, v.viewH - gy);
  x.fillStyle = 'rgba(' + O + ',.5)'; x.fillRect(0, gy, v.viewW, 1);
  x.fillStyle = 'rgba(' + YELLOW + ',.2)'; for (let i = sx(600); i < sx(820); i += 14) x.fillRect(i, gy + 6, 8, 1);
  void C; void notice; void rng; void onScreen;
}

export const warehouse: SceneDef = {
  id: 'warehouse',
  name: 'Warehouse 4',
  width: L.width,
  spawn: L.spawn,
  ambient: { sky: true, weather: true },
  exits: [{ id: 'stacks', x: L.back, to: 'stacks', at: 'warehouse', label: '[E] STACKS', promptH: 82 }],
  intro: ['Warehouse 4. The Registry keeps what it takes in here.', 'The door has a reader. The reader has an opinion about me.'],
  pixel: 'along',
  people: PEOPLE,
  readables: [
    { id: 'plaque', x: L.plaque, name: 'PLAQUE', promptH: 80, pages: ['BONDED WAREHOUSE 4 · REGISTRY EVIDENCE CUSTODY.', 'SEIZED PROPERTY IS HELD PENDING REVIEW. OWNERS WILL BE CONTACTED AT THEIR REGISTERED ADDRESS.'] },
    { id: 'shoe', x: L.shoe, name: 'EVIDENCE TAG', promptH: 30, pages: ['ITEM 44-0812 · 1 SHOE (LEFT) · OWNER: COUNTED OUT · STATUS: PENDING REVIEW.'] },
  ],
  uses: [
    { id: 'door', x: L.door, label: '[E] THE DOOR', name: 'WARRANT READER', promptH: 74, use: () => DOOR },
  ],
  drawBackdrop: (x, v) => drawWarehouse(x, v),
};
