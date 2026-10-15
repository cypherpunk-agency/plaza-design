/**
 * The public library on the canvas (P16 Long overdue): Downtown's branch, a tall old reading room
 * on the street west of the noodle stall. The books were digitized years ago; the shelves stayed
 * for the acoustics and the building for the chairs, and the chairs for the radiators.
 *
 * Play band (brightest): the door, the notice board, the CARD READER on its post, three public
 * terminals with the SESSION TIMER over them (two in use, one free), the librarian's desk with the
 * PRINTER on its end, a paper book chained to a stand, three armchairs and the radiator under the
 * windows (the regulars, and the cat on the radiator), SHELF-E rolling along the empty shelves.
 * Middle band (dim): the empty shelves to the ceiling, the gallery rail, the clock, the Registry's
 * strip and its camera. Far band (dimmest): Downtown's towers through the tall windows, in the rain.
 *
 * World units match the street (the player is 42 tall). Where the devices stand for tapping, E
 * and hack vision is library.json (`layout.spot`); this draws them there.
 */

import { light } from '../light';
import { drawPane, windowShaft } from '../sets/sky';
import { drawGrade } from '../sets/lighting';
import { drawCharacters, type Character } from '../characters';
import type { EngineDraw } from '../engine/host';
import type { SceneModel } from '../engine/model';
import { box, C, exitDoor, GREEN, notice, O, onScreen, PAPER, RED, rng, RUST, tell, text, type View } from '../scenes/kit';
import { camera, taped, ticker, YELLOW } from '../scenes/screens';
import { drawTower, placed, towerRow } from '../sets';

/** The reading room: 960 wide, 176 high inside. */
export const LIBRARY_W = 960;
const CEIL = 176;

/** Where things are (world x; heights above the floor). Devices stand at their `layout.spot` in library.json; these agree. */
export const L = {
  door: 30,
  spawn: 74,
  notice: 106,
  reader: 168,
  desks: [244, 304, 364],
  seats: [228, 288, 348],
  timer: 290,
  counter: { x0: 432, x1: 572, h: 28 },
  librarian: 418,
  printer: 548,
  book: 614,
  chairs: [680, 744, 872, 924],
  radiator: { x0: 770, x1: 836, h: 20 },
  cat: 806,
  windows: [[648, 712], [768, 840], [892, 940]] as [number, number][],
  shelves: { x0: 380, x1: 960 },
};

// ---------- people ----------

/** The librarian: keeps the place open for the chairs, and knows exactly what the printer is doing. */
const librarian: Character = { id: 'librarian', key: true, seed: 7101, look: { body: 'avg', garb: 'coat', hair: 'bun', extras: ['glasses'], top: '#4e5e3a', hairCol: '#d8d2c6' }, x: L.librarian, act: 'stand', facing: -1, name: 'LIBRARIAN', talk: [
  ['Welcome to the public library. The books are on the cloud. The chairs are here.', 'People come for the chairs. And the radiators. Mostly the radiators.'],
  ['No card? Then you are not in the system, and I cannot lend you anything.', 'I can lend you a chair. Chairs are not in the system. I checked.'],
  ['That printer has been printing the same overdue notice for eleven years.', 'Staff\'s. Nobody can cancel it. The staff left. The notice stayed. Like the rest of us.'],
  ['If something comes back to this library after eleven years, I will not ask where it has been.', 'I will stamp it. I have been waiting to stamp something since 2049.'],
] };
/** Terminal 1: twelve minutes of verified identity left, and a thesis. */
const student: Character = { id: 'student', seed: 7102, look: { body: 'slim', garb: 'jacket', hair: 'long', extras: ['headphones', 'backpack'], top: '#46506e' }, x: L.seats[0], h: 12, act: 'sit', facing: 1, name: 'TERMINAL 1', talk: [
  ['Twelve minutes left. I am writing a thesis on why we need more than thirty minutes.', 'Eleven.'],
  ['Do not stand behind me. I think the timer counts people who stand behind me.', 'I have not checked. No time.'],
] };
/** Terminal 2: three minutes left, level nine. */
const kid: Character = { id: 'kid', seed: 7103, look: { body: 'kid', garb: 'tee', hair: 'cap', extras: [], top: '#a84a3a' }, x: L.seats[1], h: 12, act: 'sit', facing: 1, name: 'TERMINAL 2', talk: [
  ['Three minutes. I am on level nine.', 'If you do not talk to me I can finish level nine.'],
  ['My mum is verified. I am her thirty minutes. She is at work. Do not tell the timer.'],
] };
/** A regular in the first armchair: not asleep. */
const sleeper: Character = { id: 'sleeper', seed: 7104, look: { body: 'old', garb: 'coat', hair: 'brim', extras: ['cane'], top: '#6a4a3a' }, x: L.chairs[0], h: 12, act: 'sit', facing: 1, name: 'REGULAR', talk: [
  ['...not asleep. Reading. With my eyes closed. It saves the eyes.'],
  ['Forty years I came here for the books. Now I come for the chair.', 'The chair is better. The chair never ended badly.'],
] };
/** A regular by the radiator, knitting something long. */
const knitter: Character = { id: 'knitter', seed: 7105, look: { body: 'old', garb: 'dress', hair: 'scarf', extras: ['bag'], top: '#7a4e7a', acc: '#d8b040' }, x: L.chairs[1], h: 12, act: 'sit', facing: 1, name: 'REGULAR', talk: [
  ['I come for the radiator. Do not tell the radiator.'],
  ['It is a scarf. For the radiator. It gets cold in February. Everything does.'],
  ['The heating has been over budget every February since they digitized the books.', 'Nobody turns it down. The committee would never allow it. We are the committee.'],
] };
/** A regular with the last paper newspaper, reading it very slowly. */
const reader: Character = { id: 'paper', seed: 7106, look: { body: 'wide', garb: 'suit', hair: 'bald', extras: ['glasses'] }, x: L.chairs[2], h: 12, act: 'sit', facing: -1, name: 'REGULAR', talk: [
  ['The last paper newspaper. I am reading it slowly.', 'If you only read this one, nothing new has happened since. It is very restful.'],
] };
/** SHELF-E: re-shelves the one book that is left, all day, along the empty shelves. */
const shelfE: Character = { id: 'shelfe', seed: 7107, look: { bot: 'servbot', paint: '#8a7a5a', v: 0 }, x: 690, act: 'roll', range: [640, 930], name: 'SHELF-E', talk: [
  ['Re-shelving. One book. Correct place: everywhere.'],
  ['Shelf 14 is empty. Shelf 15 is empty. I keep them in order.'],
] };
const cat: Character = { look: 'cat', seed: 11, x: L.cat, h: L.radiator.h, act: 'sleep', facing: -1 };

/** Everyone who lives here (the engine makes [E] TALK for those with talk, [E] PET for the cat). */
export const PEOPLE: Character[] = [shelfE, librarian, student, kid, sleeper, knitter, reader, cat];

/** Downtown's towers through the windows (a set: sets/downtown-towers.ts). */
const TOWERS = towerRow(71, 12, [22, 44], [90, 190]);
const RAIN = (() => { const r = rng(37); return Array.from({ length: 40 }, () => [r() * 60, r() * 96, 0.5 + r()]); })();

// ---------- the room ----------

/** The reading room's windows look west (light.ts facing). */
export const LIBRARY_FACING = 270;

/** A tall window in the back wall: Downtown's towers in the rain, and its arch and mullions. */
function backWindow(x: CanvasRenderingContext2D, v: View, x0: number, x1: number) {
  const { sx, y, t } = v, l = sx(x0), w = x1 - x0, top = y(150), bot = y(64), h = bot - top;
  if (!onScreen(v, l, w)) return;
  x.save(); x.beginPath(); x.rect(l, top, w, h); x.clip();
  // the sky of the moment (sets/sky.ts: the windows look west, the evening sun low between the towers)
  const lt = light();
  drawPane(x, l, top, w, h, lt, { facing: LIBRARY_FACING, seed: 71 + x0, towers: false, horizon: 0.92 });
  // the towers, slid a little with the camera (far band); their windows on the city's clock
  const off = -((v.cam * 0.25) % 260);
  for (const b of TOWERS) placed(x, l + off + b.x * 0.9, bot + 4, 0.55, () => drawTower(x, b, { t, fill: '#0b0605', edge: 0.3, lit: 0.22, glow: 0.65, clock: true }));
  drawGrade(x, v, lt, true);
  x.strokeStyle = 'rgba(170,210,255,.2)';
  if ((lt.w?.rain ?? 0) > 0.05) for (const [rx, ry, sp] of RAIN) { const yy = (ry + t * sp * 2) % h; x.beginPath(); x.moveTo(l + (rx / 60) * w, top + yy); x.lineTo(l + (rx / 60) * w - 1, top + yy + 4); x.stroke(); }
  x.restore();
  // frame, mullions, the arch over it, the sill
  x.strokeStyle = 'rgba(' + O + ',.55)'; x.strokeRect(l + 0.5, top + 0.5, w - 1, h - 1);
  x.fillStyle = 'rgba(' + O + ',.45)'; x.fillRect(l + Math.round(w / 2), top, 1, h); x.fillRect(l, top + Math.round(h / 3), w, 1);
  x.strokeStyle = 'rgba(' + O + ',.5)'; x.beginPath(); x.arc(l + w / 2, top, w / 2, Math.PI, 0); x.stroke();
  box(x, l - 3, bot, w + 6, 3, '#2a1a10', 'rgba(' + O + ',.6)');
  // the sun through it, onto the reading room's floor
  windowShaft(x, { l, r: l + w, t: top, b: bot }, y(0), Math.min(v.viewH, y(0) + 16), lt, LIBRARY_FACING);
}

/** The empty shelves along the back wall, floor to gallery: dark wood, a few left-behind things. */
function shelves(x: CanvasRenderingContext2D, v: View) {
  const { sx, y } = v, S = L.shelves, r = rng(5);
  for (let wx = S.x0; wx < S.x1; wx += 48) {
    if (L.windows.some(([a, b]) => wx + 44 > a - 6 && wx < b + 6)) continue;
    const s = sx(wx);
    if (!onScreen(v, s, 46)) continue;
    box(x, s, y(150), 44, 150, '#140c07', 'rgba(' + RUST + ',.35)');
    for (let h = 14; h < 150; h += 22) {
      x.fillStyle = '#26170d'; x.fillRect(s + 2, y(h), 40, 2);
      // nearly nothing on them: a mug, a plant, a card saying RESERVED, dust
      const n = r();
      if (n < 0.08) { box(x, s + 8, y(h + 6), 5, 6, '#6a5a4a'); }
      else if (n < 0.14) { x.fillStyle = '#3e6a2a'; x.fillRect(s + 28, y(h + 8), 6, 6); box(x, s + 29, y(h + 3), 4, 3, '#5a3a2a'); }
      else if (n < 0.18) { box(x, s + 14, y(h + 7), 16, 7, 'rgba(' + PAPER + ',.35)'); }
      else { x.fillStyle = 'rgba(' + PAPER + ',.04)'; x.fillRect(s + 4, y(h + 1), 36, 1); }
    }
    // the shelf's number plate
    box(x, s + 14, y(158), 16, 7, '#0d0705', 'rgba(' + O + ',.4)');
    text(x, String(Math.round((wx - S.x0) / 48) + 1), s + 22, y(154.5), 'rgba(' + PAPER + ',.6)', 6);
  }
}

/** The gallery: a rail along the shelves at the top, and the ceiling's coffers. */
function gallery(x: CanvasRenderingContext2D, v: View, w0: number, w1: number) {
  const { y, sx } = v;
  box(x, sx(L.shelves.x0), y(160), w1 - sx(L.shelves.x0), 4, '#2a1a10', 'rgba(' + O + ',.45)');
  for (let wx = L.shelves.x0; wx < LIBRARY_W; wx += 12) { x.fillStyle = 'rgba(' + O + ',.25)'; x.fillRect(sx(wx), y(170), 1, 10); }
  x.fillStyle = 'rgba(' + O + ',.35)'; x.fillRect(sx(L.shelves.x0), y(170), w1 - sx(L.shelves.x0), 1);
  box(x, w0, y(CEIL + 12), w1 - w0, 12, '#0c0705');
  for (let wx = 0; wx < LIBRARY_W; wx += 64) { x.fillStyle = 'rgba(' + O + ',.18)'; x.fillRect(sx(wx), y(CEIL + 12), 1, 12); }
}

/** A hanging lamp: a warm pool of light under it. */
function pendant(x: CanvasRenderingContext2D, v: View, wx: number, h: number, flicker = false) {
  const { sx, y, t } = v, cx = sx(wx);
  if (!onScreen(v, cx - 60, 120)) return;
  x.fillStyle = 'rgba(' + O + ',.3)'; x.fillRect(cx, y(CEIL), 1, y(h + 6) - y(CEIL));
  const on = !flicker || t % 400 < 380 || Math.floor(t) % 3;
  const g = x.createLinearGradient(0, y(h), 0, y(0));
  g.addColorStop(0, 'rgba(255,200,130,' + (on ? 0.12 : 0.03) + ')'); g.addColorStop(1, 'rgba(255,200,130,0)');
  x.fillStyle = g; x.beginPath(); x.moveTo(cx - 6, y(h)); x.lineTo(cx - 54, y(0)); x.lineTo(cx + 54, y(0)); x.lineTo(cx + 6, y(h)); x.closePath(); x.fill();
  x.fillStyle = '#3a4a2a'; x.beginPath(); x.moveTo(cx - 8, y(h)); x.lineTo(cx - 4, y(h + 6)); x.lineTo(cx + 4, y(h + 6)); x.lineTo(cx + 8, y(h)); x.closePath(); x.fill();
  x.fillStyle = 'rgba(255,217,165,' + (on ? 0.9 : 0.3) + ')'; x.fillRect(cx - 5, y(h) , 10, 1);
}

/** The card reader on its post by the terminals: a slot, a small screen, a red NO CARD. */
function cardReader(x: CanvasRenderingContext2D, v: View, m: SceneModel, hover: boolean) {
  const { sx, y, t } = v, cx = sx(L.reader), top = y(52);
  if (!onScreen(v, cx - 20, 40)) return;
  box(x, cx - 2, y(34), 4, 34, '#2a1a10', 'rgba(' + O + ',.5)');
  box(x, cx - 9, y(2), 18, 2, '#2a1a10');
  box(x, cx - 11, top, 22, 18, '#22201c', 'rgba(' + PAPER + ',.5)');
  box(x, cx - 8, top + 3, 16, 7, '#041416', 'rgba(' + C + ',.55)');
  const online = m.net.get('catalog') === 'connected';
  text(x, online ? 'LAN' : 'CARD', cx, top + 6.5, online ? 'rgba(' + C + ',.9)' : 'rgba(' + RED + ',' + (Math.floor(t / 30) % 2 ? 0.9 : 0.5) + ')', 6, '600');
  box(x, cx - 6, top + 12, 12, 2, '#020202');
  tell(x, t, cx + 8, top + 16, 1);
  if (hover) { x.save(); x.strokeStyle = 'rgba(255,61,242,.85)'; x.shadowColor = 'rgba(255,61,242,.8)'; x.shadowBlur = 8; x.strokeRect(cx - 14.5, top - 3.5, 29, 57); x.restore(); }
}

/** The session timer over the terminals: three lamps and their minutes. */
function sessionTimer(x: CanvasRenderingContext2D, v: View, hover: boolean) {
  const { sx, y, t } = v, s = sx(L.timer - 23), top = y(106);
  if (!onScreen(v, s - 10, 66)) return;
  box(x, s - 10, y(116), 66, 9, '#1a120b', 'rgba(' + O + ',.7)');
  text(x, 'PUBLIC TERMINALS', s + 23, y(111.5), 'rgba(' + PAPER + ',.85)', 6, '600');
  box(x, s, top, 46, 22, '#241a12', 'rgba(' + PAPER + ',.5)');
  const mins = [Math.max(0, 12 - Math.floor(t / 3600)), Math.max(0, 3 - Math.floor(t / 3600)), -1];
  mins.forEach((mn, i) => {
    const lx = s + 4 + i * 14;
    box(x, lx, top + 3, 12, 9, '#041416', 'rgba(' + C + ',.5)');
    text(x, mn < 0 ? '--' : String(mn).padStart(2, '0'), lx + 6, top + 7.5, mn < 0 ? 'rgba(' + C + ',.6)' : mn < 5 ? 'rgba(' + YELLOW + ',.95)' : 'rgba(' + C + ',.9)', 6, '600');
    x.fillStyle = 'rgba(' + (mn < 0 ? GREEN : mn < 5 ? YELLOW : RED) + ',.9)'; x.fillRect(lx + 4, top + 15, 4, 2);
  });
  tell(x, t, s + 43, top + 19, 2);
  if (hover) { x.save(); x.strokeStyle = 'rgba(255,61,242,.85)'; x.shadowColor = 'rgba(255,61,242,.8)'; x.shadowBlur = 8; x.strokeRect(s - 3.5, top - 3.5, 53, 29); x.restore(); }
}

/** One public terminal: a desk, a lamp, a screen (a session, or PRESENT CARD), a chair. */
function terminal(x: CanvasRenderingContext2D, v: View, i: number) {
  const { sx, y, t } = v, cx = sx(L.desks[i]);
  if (!onScreen(v, cx - 40, 70)) return;
  // the chair
  const ch = sx(L.seats[i]);
  box(x, ch - 7, y(12), 14, 2, '#3a2416'); x.fillStyle = '#2a1a10'; x.fillRect(ch - 6, y(10), 2, 10); x.fillRect(ch + 4, y(10), 2, 10); x.fillRect(ch - 8, y(26), 2, 16);
  // the desk
  box(x, cx - 22, y(24), 44, 3, '#4a301c', 'rgba(' + O + ',.5)');
  x.fillStyle = '#2a1a10'; x.fillRect(cx - 20, y(21), 3, 21); x.fillRect(cx + 17, y(21), 3, 21);
  // the screen, facing the chair
  box(x, cx - 2, y(46), 18, 20, '#0b0d0e', 'rgba(' + PAPER + ',.4)');
  x.fillStyle = '#1a1a1a'; x.fillRect(cx + 5, y(26), 4, 2);
  const busy = i < 2, glow = busy ? '150,170,220' : C;
  x.fillStyle = 'rgba(' + glow + ',' + (busy ? 0.18 + 0.05 * Math.sin(t * 0.07 + i) : 0.12) + ')'; x.fillRect(cx, y(44), 14, 16);
  if (!busy) text(x, 'CARD', cx + 7, y(36), 'rgba(' + C + ',' + (Math.floor(t / 40) % 2 ? 0.8 : 0.35) + ')', 5, '600');
  else for (let k = 0; k < 4; k++) { x.fillStyle = 'rgba(220,230,255,.35)'; x.fillRect(cx + 2, y(42 - k * 3), 6 + ((k * 5 + i * 3 + Math.floor(t / 50)) % 6), 1); }
  // a banker's lamp, green glass
  x.fillStyle = '#2a1a10'; x.fillRect(cx - 15, y(32), 1, 8);
  x.fillStyle = '#2e5a3a'; x.fillRect(cx - 19, y(34), 9, 3);
  x.fillStyle = 'rgba(255,217,165,.25)'; x.fillRect(cx - 18, y(31), 7, 1);
  // a number on the desk's edge
  text(x, 'T' + (i + 1), cx - 10, y(19), 'rgba(' + PAPER + ',.6)', 6);
}

/** The librarian's desk: a long counter, a stamp, a bell, a sign; the printer on its end. */
function counter(x: CanvasRenderingContext2D, v: View) {
  const { sx, y } = v, K = L.counter, a = sx(K.x0), w = K.x1 - K.x0;
  if (!onScreen(v, a, w)) return;
  box(x, a, y(K.h), w, K.h, '#3a2416', 'rgba(' + O + ',.55)');
  box(x, a - 2, y(K.h + 2), w + 4, 3, '#5a3a20', 'rgba(' + O + ',.7)');
  for (let p = a + 10; p < a + w - 10; p += 26) box(x, p, y(K.h - 6), 20, K.h - 12, '#301d12', 'rgba(' + O + ',.25)');
  // the stamp and its pad, the bell, a plate
  box(x, a + 20, y(K.h + 6), 10, 4, '#1a1a2a'); box(x, a + 23, y(K.h + 11), 4, 5, '#5a3a20');
  x.fillStyle = 'rgba(220,200,120,.8)'; x.beginPath(); x.arc(a + 44, y(K.h + 4), 3, Math.PI, 0); x.fill();
  box(x, a + 58, y(K.h + 9), 34, 7, '#0d0705', 'rgba(' + O + ',.5)');
  text(x, 'RETURNS', a + 75, y(K.h + 5.5), 'rgba(' + PAPER + ',.75)', 6, '600');
}

/** The printer on the counter's end: its window shows the stuck job; a page half out, never further. */
function printer(x: CanvasRenderingContext2D, v: View, hover: boolean) {
  const { sx, y, t } = v, cx = sx(L.printer), base = y(L.counter.h + 2);
  if (!onScreen(v, cx - 20, 40)) return;
  box(x, cx - 15, base - 18, 30, 18, '#c8c0b0', 'rgba(' + PAPER + ',.6)');
  box(x, cx - 13, base - 22, 26, 4, '#a8a090');
  // the page, half out, trembling
  const jig = Math.floor(t / 6) % 2;
  box(x, cx - 9, base - 30 - jig, 18, 10, 'rgba(' + PAPER + ',.9)');
  for (let k = 0; k < 3; k++) { x.fillStyle = 'rgba(60,40,30,.6)'; x.fillRect(cx - 7, base - 28 - jig + k * 3, 10 + (k % 2) * 4, 1); }
  box(x, cx - 12, base - 14, 14, 6, '#041416', 'rgba(' + C + ',.6)');
  text(x, 'JOB 1', cx - 5, base - 11, 'rgba(' + YELLOW + ',.9)', 5, '600');
  x.fillStyle = 'rgba(' + (Math.floor(t / 20) % 2 ? YELLOW : '120,90,20') + ',.95)'; x.fillRect(cx + 8, base - 12, 3, 2);
  tell(x, t, cx + 11, base - 4, 3);
  if (hover) { x.save(); x.strokeStyle = 'rgba(255,61,242,.85)'; x.shadowColor = 'rgba(255,61,242,.8)'; x.shadowBlur = 8; x.strokeRect(cx - 18.5, base - 33.5, 37, 37); x.restore(); }
}

/** A paper book on a stand, chained: REFERENCE ONLY. A bus ticket marks the page someone reads each day. */
function bookStand(x: CanvasRenderingContext2D, v: View) {
  const { sx, y, t } = v, cx = sx(L.book);
  if (!onScreen(v, cx - 20, 40)) return;
  x.fillStyle = '#3a2416'; x.fillRect(cx - 1, y(30), 3, 30); box(x, cx - 8, y(2), 16, 2, '#3a2416');
  x.save(); x.translate(cx, y(34)); x.rotate(-0.25);
  box(x, -12, -4, 24, 6, '#6a2a1a', 'rgba(' + PAPER + ',.4)');
  box(x, -11, -6, 22, 3, 'rgba(' + PAPER + ',.85)');
  x.fillStyle = '#d84a3a'; x.fillRect(3, -10, 2, 6);
  x.restore();
  // the chain to the post
  x.strokeStyle = 'rgba(200,200,210,.5)'; x.beginPath(); x.moveTo(cx + 10, y(32)); x.quadraticCurveTo(cx + 12, y(22), cx + 2, y(20)); x.stroke();
  box(x, cx - 18, y(52), 36, 8, '#0d0705', 'rgba(' + O + ',.5)');
  text(x, 'REFERENCE ONLY', cx, y(48), 'rgba(' + PAPER + ',.75)', 5, '600');
  tell(x, t, cx + 16, y(42), 4);
}

/** An armchair (the regulars sit in them, at 12 above the floor). */
function armchair(x: CanvasRenderingContext2D, v: View, wx: number, seed: number) {
  const { sx, y } = v, cx = sx(wx), col = ['#5a2a2a', '#3a4a5a', '#5a4a2a'][seed % 3];
  if (!onScreen(v, cx - 20, 40)) return;
  box(x, cx - 13, y(34), 7, 34, col, 'rgba(' + O + ',.35)');
  box(x, cx - 13, y(14), 26, 8, col, 'rgba(' + O + ',.35)');
  box(x, cx + 8, y(20), 5, 14, col);
  x.fillStyle = '#1a0d08'; x.fillRect(cx - 12, y(6), 2, 6); x.fillRect(cx + 10, y(6), 2, 6);
}

/** The radiator under the middle window: warm, ticking; the cat on it. */
function radiator(x: CanvasRenderingContext2D, v: View) {
  const { sx, y, t } = v, R = L.radiator, a = sx(R.x0), w = R.x1 - R.x0;
  if (!onScreen(v, a, w)) return;
  for (let k = 0; k < w; k += 6) box(x, a + k, y(R.h), 5, R.h - 2, '#6a4a3a', 'rgba(255,170,90,.4)');
  box(x, a - 1, y(R.h + 1), w + 2, 2, '#7a5a4a');
  // the warmth over it
  for (let k = 0; k < 4; k++) {
    const f = ((t * 0.4 + k * 25) % 100) / 100;
    x.fillStyle = 'rgba(255,170,90,' + 0.12 * (1 - f) + ')'; x.fillRect(a + 8 + k * 14 + Math.sin(t * 0.03 + k) * 2, y(R.h + 4 + f * 26), 2, 4);
  }
}

/** The way out's porch, the notice board, the rest of the play band's paper. */
function boards(x: CanvasRenderingContext2D, v: View) {
  const { sx, y, t } = v;
  notice(x, t, sx(L.notice), y(98), 46, 40, ['PUBLIC', 'LIBRARY', 'DOWNTOWN', 'BRANCH']);
  taped(x, v, { x: L.desks[2] + 8, h: 50, text: ['T3: FREE', 'CARD ONLY'], tilt: 0.05 });
  taped(x, v, { x: L.printer - 30, h: 52, text: ['DO NOT', 'CANCEL'], tilt: -0.07 });
}

/** Draw the library and everything in it. */
export function drawLibrary(x: CanvasRenderingContext2D, v: View, e: EngineDraw) {
  const { sx, y, t } = v, w0 = sx(0), w1 = sx(LIBRARY_W);
  x.fillStyle = '#020101'; x.fillRect(0, 0, v.viewW, v.viewH);
  // middle band: the back wall, the gallery, the empty shelves, the windows
  box(x, w0, y(CEIL), w1 - w0, CEIL, '#120a06');
  x.fillStyle = 'rgba(' + PAPER + ',.03)'; for (let hy = 8; hy < 60; hy += 10) x.fillRect(w0, y(hy), sx(L.shelves.x0) - w0, 1);
  x.fillStyle = 'rgba(' + O + ',.3)'; x.fillRect(w0, y(62), sx(L.shelves.x0) - w0, 1);
  x.fillStyle = 'rgba(' + O + ',.7)'; x.fillRect(w0, 0, 1, v.gy); x.fillRect(w1 - 1, 0, 1, v.gy);
  for (const [a, b] of L.windows) backWindow(x, v, a, b);
  shelves(x, v);
  gallery(x, v, w0, w1);
  // the room's signs: the Registry's strip, its camera, the clock over the desk
  ticker(x, v, { x: 230, h: 140, w: 280, tall: 10, text: 'QUIET PLEASE   ·   CONVERSATIONS ARE TRANSCRIBED   ·   PUBLIC TERMINALS: 30 MIN PER VERIFIED IDENTITY   ·   UNVERIFIED PERSONS MAY SIT   ·   SOFTWARE LENDING SUSPENDED PENDING RETURNS', col: '255,90,70', speed: 0.35 });
  camera(x, v, { x: 400, h: 150, facing: -1, phase: 3 });
  const ck = sx(500);
  if (onScreen(v, ck - 12, 24)) {
    x.fillStyle = '#1a120b'; x.beginPath(); x.arc(ck, y(84), 10, 0, 7); x.fill();
    x.strokeStyle = 'rgba(' + PAPER + ',.6)'; x.beginPath(); x.arc(ck, y(84), 10, 0, 7); x.stroke();
    // it stopped at ten past four in 2049; the second hand still tries
    x.strokeStyle = 'rgba(' + PAPER + ',.8)'; x.beginPath(); x.moveTo(ck, y(84)); x.lineTo(ck + 5, y(87)); x.moveTo(ck, y(84)); x.lineTo(ck + 2, y(91)); x.stroke();
    const a = (Math.floor(t / 30) % 2) * 0.1 - Math.PI / 2;
    x.strokeStyle = 'rgba(' + RED + ',.7)'; x.beginPath(); x.moveTo(ck, y(84)); x.lineTo(ck + Math.cos(a) * 8, y(84) + Math.sin(a) * 8); x.stroke();
  }
  pendant(x, v, 200, 120); pendant(x, v, 330, 124, true); pendant(x, v, 500, 122); pendant(x, v, 760, 126);

  // play band: the door, the notices, the reader, the terminals and their timer, the desk and the printer
  exitDoor(x, v, L.door, '#0a0603', '< DOWNTOWN');
  boards(x, v);
  sessionTimer(x, v, e.hover === 'session');
  for (let i = 0; i < 3; i++) terminal(x, v, i);
  cardReader(x, v, e.m, e.hover === 'reader');
  // SHELF-E rolls along the shelves behind everything
  drawCharacters(x, v, [shelfE]);
  counter(x, v);
  // the librarian at the end of her desk
  drawCharacters(x, v, [librarian]);
  printer(x, v, e.hover === 'printer');
  bookStand(x, v);
  radiator(x, v);
  L.chairs.forEach((c, i) => armchair(x, v, c, i));
  drawCharacters(x, v, PEOPLE.filter((p) => p !== shelfE && p !== librarian));

  // the floor: old parquet, a long runner down the middle, worn where the chairs are
  x.fillStyle = '#0a0604'; x.fillRect(w0, v.gy, w1 - w0, v.viewH - v.gy);
  x.fillStyle = 'rgba(' + O + ',.6)'; x.fillRect(w0, v.gy, w1 - w0, 1);
  for (let r = 0; r < 4; r++) for (let c = 0; c < LIBRARY_W; c += 16) {
    const tx = sx(c) + (r % 2) * 8;
    if (tx < w0 || tx > w1 - 14) continue;
    x.fillStyle = 'rgba(255,170,90,' + (0.025 + ((c / 16 + r) % 3) * 0.01) + ')'; x.fillRect(tx, v.gy + 3 + r * 12, 14, 10);
  }
  x.fillStyle = 'rgba(120,30,30,.25)'; x.fillRect(sx(140), v.gy + 6, sx(600) - sx(140), 12);
}

// ---------- on Downtown's street ----------

/**
 * The library's front on Downtown's street (Downtown draws it at its door): a stone portal round the
 * door, a plate PUBLIC LIBRARY, a lit OPEN · HEATED card, and its reading-room lamps in the windows.
 */
export function drawLibraryFront(x: CanvasRenderingContext2D, v: View, wx: number) {
  const { sx, y, t } = v, cx = sx(wx);
  if (!onScreen(v, cx - 70, 140)) return;
  // the portal: two pilasters and a lintel round the door
  box(x, cx - 21, y(64), 5, 64, '#1d140e', 'rgba(' + PAPER + ',.25)');
  box(x, cx + 16, y(64), 5, 64, '#1d140e', 'rgba(' + PAPER + ',.25)');
  box(x, cx - 25, y(70), 50, 7, '#1d140e', 'rgba(' + PAPER + ',.3)');
  // its plate, lit warm: you can go in (cyan edge)
  box(x, cx - 34, y(84), 68, 11, '#080403', 'rgba(' + C + ',.5)');
  text(x, 'PUBLIC LIBRARY', cx, y(78.5), 'rgba(255,217,165,.9)', 7, '600');
  // the card in the door's glass
  box(x, cx - 7, y(44), 14, 8, 'rgba(255,217,165,.55)');
  text(x, 'OPEN', cx, y(41.5), 'rgba(40,24,12,.9)', 5, '600');
  text(x, 'HEATED', cx, y(38.5), 'rgba(40,24,12,.9)', 4, '600');
  x.fillStyle = Math.sin(t * 0.05) > -0.3 ? 'rgba(0,255,255,.95)' : 'rgba(0,255,255,.3)'; x.fillRect(cx + 7, y(30), 2, 4);
}
