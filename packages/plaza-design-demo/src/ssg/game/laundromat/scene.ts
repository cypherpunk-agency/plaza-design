/**
 * The laundromat on the canvas: a narrow shop between the market's stalls,
 * open late, lit like an operating theatre, four washers along the wall and
 * a breaker that does not want four.
 *
 * Play band (brightest): the door back out to the market, the Registry's
 * notice, the soap dispenser, the schedule box, the four washers (their drums
 * turn while they wash), the breaker with its conduits running in the wall to
 * every washer (P13's fixed cables, drawn where they are), SUDS on its post, the
 * folding table and FOLD-O, the bench with the people waiting, the lost-sock
 * board. Middle band (dim): the back wall, a row of dead dryers over the
 * washers, the TV, the ceiling and, on tall screens, the flats upstairs. Far
 * band (dimmest): the market through the front window, stalls and people
 * passing in the rain.
 *
 * World units match the street (the player is 42 tall). Where the devices
 * stand for tapping, E and hack vision is laundromat.json (`layout.spot`);
 * this draws them there.
 */

import { light, windowLit } from '../light';
import { drawPane, windowShaft } from '../sets/sky';
import { drawGrade } from '../sets/lighting';
import { drawCharacters, type Character } from '../characters';
import type { EngineDraw } from '../engine/host';
import type { SceneModel } from '../engine/model';
import { box, C, exitDoor, GREEN, notice, O, onScreen, PAPER, RED, rng, RUST, tell, text, type View } from '../scenes/kit';
import { adScreen, camera, taped, ticker, YELLOW } from '../scenes/screens';

/** The shop: 880 wide, 150 high inside. */
export const LAUNDROMAT_W = 880;
const CEIL = 150;

/** Where things are (world x; heights above the floor). Devices stand at their `layout.spot` in laundromat.json; these agree. */
export const L = {
  door: 30,
  spawn: 70,
  notice: 74,
  soap: 124,
  clock: 178,
  washers: [290, 350, 410, 470],
  breaker: 530,
  suds: 586,
  table: { x0: 620, x1: 680, h: 26 },
  folder: 646,
  bench: { x0: 690, x1: 772, h: 10 },
  gran: 706,
  sleeper: 744,
  window: { x0: 640, x1: 832, h0: 40, h1: 124 },
  cat: 806,
  socks: 852,
  tubes: [150, 380, 610, 800],
};

// ---------- people ----------

/** Washer 1's owner: six blue shirts in the drum, wearing the seventh. */
const blue: Character = { id: 'blue', seed: 6101, look: { body: 'slim', garb: 'tee', hair: 'cap', extras: ['phone', 'backpack'], top: '#b8a68a' }, x: 232, act: 'phone', facing: 1, name: 'WAITING', talk: [
  ['Washer 1 is mine. Six shirts. All of them.', 'This is my seventh. It is not a shirt. It is a towel with ambition.'],
  ['Every slot the lights dip, three machines start, the breaker gives up and we all start over.', 'I have watched it eleven times. It is the most reliable thing in my life.'],
  ['If you sort that breaker out, mine are the blue ones. Not that I am asking. I am asking.'],
] };
/** Washer 2's owner: has been visiting her laundry since Tuesday. Knows who left the jacket. */
const gran: Character = { id: 'gran', key: true, seed: 6102, look: { body: 'old', garb: 'coat', hair: 'scarf', extras: ['bag'], top: '#6a2a3e', acc: '#d8b040' }, x: L.gran, h: L.bench.h, act: 'sit', facing: -1, name: 'REGULAR', talk: [
  ['Washer 2 is mine. Since Tuesday.', 'At my age you stop waiting for things to finish. You just visit them.'],
  ['The jacket in 3? A young person brought it in. Paid nine cycles, said nobody searches a wash, and ran.', 'I said nobody searches me either, dear. Nobody listened to that either.'],
  ['SUDS starts the paid one when a machine finishes. That is the whole trouble. Nothing in here finishes.', 'Except me, eventually. Do not look like that, it is a joke. Mostly.'],
] };
/** Washer 4's owner, asleep on the bench in his hi-vis. */
const nightShift: Character = { id: 'sleeper', seed: 6103, look: { body: 'wide', garb: 'hivis', hair: 'short', extras: [] }, x: L.sleeper, h: L.bench.h, act: 'sleep', name: 'NIGHT SHIFT', talk: [
  ['Zzz...', '...if four finishes, wake me. If four does not finish, also do not wake me.'],
  ['...I work nights. I wash days. I sleep in between. Here.', '...nobody verifies a bench...'],
] };
/** FOLD-O, the folding robot: folds the one towel that ever came out, over and over. */
const folder: Character = { id: 'folder', seed: 6104, look: { bot: 'servbot', paint: '#8a8478', v: 0 }, x: L.folder, act: 'vend', facing: 1, name: 'FOLD-O', talk: [
  ['I fold. Forty-one thousand shirts so far. Nobody has ever folded me.', 'I do not mind. I would not fit in a drawer.'],
  ['Nothing has come out of a washer since Tuesday. I have refolded this towel two hundred times.', 'It is the best-folded towel in the district. Possibly the city.'],
  ['Socks I do not fold. Socks I pair. Most days I fail.', 'The board by the window is my failures. I pinned them up. It helps.'],
] };
const cat: Character = { look: 'cat', seed: 7, x: L.cat, h: L.window.h0, act: 'sit', facing: -1 };

/** Everyone who lives here (the engine makes [E] TALK for those with talk, [E] PET for the cat). */
export const PEOPLE: Character[] = [blue, folder, gran, nightShift, cat];

/** People in the market, seen through the front window: small, dim, far. */
const OUTSIDE: Character[] = [
  { seed: 6201, x: 600, act: 'walk', range: 300, ps: 2, dim: 0.5, parallax: 0.35, h: 40, speed: 0.35, look: { extras: ['umbrella'] } },
  { seed: 6202, x: 900, act: 'walk', range: -320, ps: 2, dim: 0.55, parallax: 0.35, h: 40, speed: 0.28 },
  { seed: 6203, x: 760, act: 'haggle', facing: 1, ps: 2, dim: 0.6, parallax: 0.35, h: 40 },
];

const RAIN = (() => { const r = rng(91); return Array.from({ length: 30 }, () => [r() * 192, r() * 84, 0.5 + r()]); })();
/** Stable noise for the flats upstairs. */
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ---------- the room ----------

/** The building over the shop, storey after storey, on screens taller than the shop (middle band, dim). */
function upstairs(x: CanvasRenderingContext2D, v: View, w0: number, w1: number) {
  const { y, t, sx } = v;
  for (let k = 0, h0 = CEIL + 10; y(h0) > 0; k++, h0 += 86) {
    x.fillStyle = k % 2 ? '#070403' : '#080504'; x.fillRect(w0, y(h0 + 76), w1 - w0, 76);
    x.fillStyle = '#0d0805'; x.fillRect(w0, y(h0 + 86), w1 - w0, 10);
    x.fillStyle = 'rgba(' + RUST + ',.3)'; x.fillRect(w0, y(h0 + 86), w1 - w0, 1);
    for (let i = 0; i < 5; i++) {
      const n = hash(k * 31 + i * 7), wx = sx(80 + i * 170 + n * 40);
      if (!onScreen(v, wx, 30)) continue;
      const lit = n < 0.4, tv = n > 0.8;
      box(x, wx, y(h0 + 60), 28, 32, lit ? 'rgba(255,170,90,.1)' : tv ? 'rgba(150,170,220,' + (0.05 + 0.03 * Math.sin(t * 0.07 + n * 9)) + ')' : '#030201', 'rgba(' + RUST + ',.35)');
      x.fillStyle = 'rgba(' + RUST + ',.35)'; x.fillRect(wx + 14, y(h0 + 60), 1, 32);
    }
  }
}

/** The front window looks south onto the market (light.ts facing). */
export const LAUNDROMAT_FACING = 180;

/** The market through the front window: the stalls' awnings and bulbs, people passing, rain, the shop's own sign backwards on the glass. */
function frontWindow(x: CanvasRenderingContext2D, v: View) {
  const { sx, y, t } = v, W = L.window, l = sx(W.x0), top = y(W.h1), w = W.x1 - W.x0, h = W.h1 - W.h0;
  if (!onScreen(v, l, w)) return;
  x.save(); x.beginPath(); x.rect(l, top, w, h); x.clip();
  // the sky of the moment over the tenements (sets/sky.ts; the window looks south onto the market)
  const lt = light();
  drawPane(x, l, top, w, h, lt, { facing: LAUNDROMAT_FACING, seed: 23, towers: false, horizon: 0.08 });
  // the tenements across the market, their windows lit by the clock
  x.fillStyle = '#0c0705'; x.fillRect(l, top + 6, w, h);
  for (let yy = top + 10; yy < top + 44; yy += 8) for (let xx = l + 4; xx < l + w - 4; xx += 9) {
    const n = hash(xx * 3 + yy * 11);
    x.fillStyle = n < 0.32 && windowLit(Math.round((xx - l) * 3 + (yy - top) * 11)) ? 'rgba(255,170,90,.35)' : 'rgba(' + RUST + ',.1)'; x.fillRect(xx, yy, 4, 4);
  }
  // the stalls opposite: striped awnings, strings of bulbs
  for (let i = 0; i < 4; i++) {
    const ax = l + 8 + i * 48, ay = top + 48;
    for (let s = 0; s < 40; s += 8) { x.fillStyle = s % 16 ? 'rgba(194,65,12,.5)' : 'rgba(255,217,165,.35)'; x.fillRect(ax + s, ay, 8, 5); }
    x.fillStyle = 'rgba(20,12,8,1)'; x.fillRect(ax + 2, ay + 5, 36, h - 53);
    for (let b = 0; b < 5; b++) { x.fillStyle = (b + Math.floor(t / 40) + i) % 5 ? 'rgba(255,190,110,.6)' : 'rgba(255,217,165,.2)'; x.fillRect(ax + 4 + b * 8, ay - 3, 2, 2); }
  }
  drawCharacters(x, v, OUTSIDE);
  // the market outside takes the hour's grade (sets/lighting.ts)
  drawGrade(x, v, lt, true);
  // rain on the street, and on the glass, when it rains
  x.strokeStyle = 'rgba(170,210,255,.22)';
  if ((lt.w?.rain ?? 0) > 0.05) for (const [rx, ry, sp] of RAIN) { const yy = (ry + t * sp * 2) % h; x.beginPath(); x.moveTo(l + rx, top + yy); x.lineTo(l + rx - 1, top + yy + 4); x.stroke(); }
  x.restore();
  // the frame and its mullions; the shop's name backwards on the glass, lit from inside
  x.strokeStyle = 'rgba(' + O + ',.8)'; x.lineWidth = 1; x.strokeRect(l + 0.5, top + 0.5, w - 1, h - 1);
  x.fillStyle = 'rgba(' + O + ',.75)'; x.fillRect(l + w / 3, top, 1, h); x.fillRect(l + (2 * w) / 3, top, 1, h);
  text(x, 'TAMORDNUAL', l + w / 2, top + 10, 'rgba(255,136,0,.5)', 8, '600');
  // the sill the cat sits on
  box(x, l - 4, y(W.h0), w + 8, 4, '#2a1a10', 'rgba(' + O + ',.7)');
  // the sun through the front window, onto the floor (none at night: the lamps then)
  windowShaft(x, { l, r: l + w, t: top, b: y(W.h0) }, y(0), Math.min(v.viewH, y(0) + 16), lt, LAUNDROMAT_FACING);
}

/** A row of dryers over the washers: dead, stacked, the middle band (one has a note on it). */
function dryers(x: CanvasRenderingContext2D, v: View) {
  const { sx, y } = v;
  L.washers.forEach((wx, i) => {
    const s = sx(wx - 23);
    if (!onScreen(v, s, 46)) return;
    box(x, s, y(100), 46, 40, '#16110d', 'rgba(' + PAPER + ',.18)');
    x.strokeStyle = 'rgba(' + PAPER + ',.16)'; x.beginPath(); x.arc(s + 23, y(80), 11, 0, 7); x.stroke();
    x.fillStyle = '#080605'; x.beginPath(); x.arc(s + 23, y(80), 9, 0, 7); x.fill();
    if (i === 1) { box(x, s + 6, y(94), 34, 9, 'rgba(' + PAPER + ',.75)'); text(x, 'BROKEN', s + 23, y(89.5), '#3a2010', 7, '600'); }
  });
}

/** The conduits from the breaker to every washer, in the wall: P13's fixed cables, where you can see them. */
function conduits(x: CanvasRenderingContext2D, v: View, tripped: boolean) {
  const { sx, y } = v, h = 53, b = sx(L.breaker - 10), a = sx(L.washers[0]);
  x.fillStyle = '#3a2a1c'; x.fillRect(a - 1, y(h + 1), b - a + 2, 3);
  x.fillStyle = 'rgba(' + O + ',.55)'; x.fillRect(a - 1, y(h + 1), b - a + 2, 1);
  for (const wx of L.washers) { x.fillStyle = '#3a2a1c'; x.fillRect(sx(wx) - 1, y(h), 3, 3); }
  // a pulse runs back along them when the breaker trips
  if (tripped) { x.fillStyle = 'rgba(' + RED + ',.55)'; x.fillRect(a, y(h + 1) + 1, b - a, 1); }
}

const CLOTHES: string[][] = [
  ['#3a5a9a', '#2e4a7e', '#46609a', '#33508a'],
  ['#9a5a6a', '#d8b040', '#5a8a3a', '#b8a68a'],
  ['#26262e', '#1e1e24', '#2e2a30', '#26262e'],
  ['#c9a227', '#62626c', '#c9a227', '#3a3438'],
];

/** One washer: body, display, the drum turning while it washes, its lamp; washer 3's door opens at the end. */
function washer(x: CanvasRenderingContext2D, v: View, m: SceneModel, i: number, hover: boolean) {
  const { sx, y, t } = v, id = 'washer' + (i + 1), st = String(m.get('w' + (i + 1))), cx = L.washers[i], s = sx(cx - 23), top = y(50);
  if (!onScreen(v, s - 10, 66)) return;
  const door3 = i === 2 ? String(m.value('door3')) : '';
  // shadow gap, body (white goods: a lit fill, lighter than the wall), the kick plate
  x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(s - 2, top - 1, 50, 51);
  box(x, s, top, 46, 50, '#3b3631', 'rgba(' + PAPER + ',.55)');
  box(x, s + 2, y(5), 42, 5, '#2a2622');
  // the panel: a display (cyan edge: you can use it) and a dial
  box(x, s + 3, top + 3, 30, 10, '#041416', 'rgba(' + C + ',.6)');
  const shown = st === 'running' ? 'WASH' : st === 'done' ? (i === 2 && door3 !== 'open' && door3 !== 'empty' ? 'HELD' : 'DONE') : '1 LEFT';
  text(x, shown, s + 18, top + 8.5, st === 'running' ? 'rgba(255,210,58,.95)' : st === 'done' ? 'rgba(' + GREEN + ',.95)' : 'rgba(' + C + ',.85)', 7, '600');
  x.fillStyle = '#6a625a'; x.beginPath(); x.arc(s + 39, top + 8, 3, 0, 7); x.fill();
  // the lamp: red loaded and locked, amber washing, green done
  const lamp = st === 'running' ? (Math.floor(t / 15) % 2 ? YELLOW : '120,90,20') : st === 'done' ? GREEN : RED;
  x.fillStyle = 'rgba(' + lamp + ',.95)'; x.fillRect(s + 37, top + 14, 4, 2);
  // the progress of a cycle
  if (st === 'running') {
    const at = m.scratch['at.' + id] ?? m.now(), f = Math.min(1, (m.now() - at) / (Number(m.data.tuning.cycleMs) || 5000));
    x.fillStyle = 'rgba(255,210,58,.25)'; x.fillRect(s + 3, top + 15, 30, 2);
    x.fillStyle = 'rgba(255,210,58,.9)'; x.fillRect(s + 3, top + 15, Math.round(30 * f), 2);
  }
  // the porthole: chrome ring, glass, the load (turning while it washes)
  const px = s + 23, py = y(21), r = 13;
  const open = i === 2 && (door3 === 'open' || door3 === 'empty');
  x.save(); x.beginPath(); x.arc(px, py, r - 2, 0, 7); x.clip();
  x.fillStyle = '#081016'; x.fillRect(px - r, py - r, r * 2, r * 2);
  if (!(i === 2 && door3 === 'empty')) {
    const spin = st === 'running' ? t * 0.25 : 0, cols = CLOTHES[i];
    if (i === 2 && st !== 'running') {
      // the jacket, folded once, a sleeve against the glass
      x.fillStyle = cols[0]; x.fillRect(px - 9, py + 1, 18, 9);
      x.fillStyle = cols[2]; x.fillRect(px - 9, py + 1, 18, 1); x.fillRect(px + 2, py - 5, 5, 7);
      x.fillStyle = 'rgba(200,200,210,.5)'; x.fillRect(px - 2, py + 3, 1, 5);
    } else {
      for (let k = 0; k < 4; k++) {
        const a = spin + k * 1.57, bx = px + Math.cos(a) * 5, by = py + 3 + Math.sin(a) * 4;
        x.fillStyle = cols[k]; x.fillRect(Math.round(bx) - 4, Math.round(by) - 3, 8, 6);
      }
    }
    if (st === 'running') {
      x.fillStyle = 'rgba(150,190,230,.25)'; x.fillRect(px - r, py + 2 + Math.sin(t * 0.3) * 1.5, r * 2, r);
      for (let k = 0; k < 3; k++) { x.fillStyle = 'rgba(230,240,255,.5)'; x.fillRect(px - 6 + k * 5, py + 1 + ((t * 0.4 + k * 3) % 8), 1, 1); }
    }
  }
  x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(px - 8, py - 9, 5, 2);
  x.restore();
  x.strokeStyle = 'rgba(210,210,220,.8)'; x.lineWidth = 2; x.beginPath(); x.arc(px, py, r - 1, 0, 7); x.stroke(); x.lineWidth = 1;
  if (open) {
    // the door swung open on its hinge, seen edge-on
    x.fillStyle = 'rgba(210,210,220,.7)'; x.fillRect(px + r + 1, py - r + 1, 4, r * 2 - 2);
    x.fillStyle = 'rgba(' + GREEN + ',.5)'; x.fillRect(px - r, py + r, r * 2, 1);
  }
  // a shake while it spins
  if (st === 'running' && Math.floor(t / 4) % 2) { x.fillStyle = 'rgba(' + PAPER + ',.15)'; x.fillRect(s - 1, y(1), 48, 1); }
  tell(x, t, s + 42, top + 47, i);
  if (hover) {
    x.save(); x.strokeStyle = 'rgba(255,61,242,.85)'; x.shadowColor = 'rgba(255,61,242,.8)'; x.shadowBlur = 8;
    x.strokeRect(s - 3.5, top - 3.5, 53, 57); x.restore();
  }
}

/** The breaker box: one lever, one circuit. Lever up and green, or down and red. */
function breaker(x: CanvasRenderingContext2D, v: View, m: SceneModel, hover: boolean) {
  const { sx, y, t } = v, s = sx(L.breaker - 12), top = y(78), tripped = m.get('breaker') === 'tripped';
  if (!onScreen(v, s - 10, 44)) return;
  box(x, s, top, 24, 34, '#4a4a50', 'rgba(' + PAPER + ',.55)');
  box(x, s + 3, top + 3, 18, 8, '#1a1a1e');
  text(x, 'C1', s + 12, top + 7.5, 'rgba(' + PAPER + ',.85)', 7, '600');
  // the lever in its slot
  box(x, s + 9, top + 13, 6, 16, '#141416');
  x.fillStyle = tripped ? 'rgba(' + RED + ',.9)' : 'rgba(220,220,230,.9)'; x.fillRect(s + 8, tripped ? top + 23 : top + 13, 8, 5);
  const on = tripped ? Math.floor(t / 10) % 2 === 0 : true;
  x.fillStyle = 'rgba(' + (tripped ? RED : GREEN) + ',' + (on ? 0.95 : 0.3) + ')'; x.fillRect(s + 19, top + 14, 2, 3);
  // the cyan tell, and the warning plate under it
  tell(x, t, s + 4, top + 31, 2);
  box(x, s - 4, y(40), 32, 9, '#1a120b', 'rgba(' + YELLOW + ',.6)');
  text(x, 'MAX 2', s + 12, y(35.5), 'rgba(' + YELLOW + ',.9)', 7, '600');
  if (hover) { x.save(); x.strokeStyle = 'rgba(255,61,242,.85)'; x.shadowColor = 'rgba(255,61,242,.8)'; x.shadowBlur = 8; x.strokeRect(s - 3.5, top - 3.5, 31, 41); x.restore(); }
}

/** SUDS on its post: a screen with a face of bubbles. It frowns when the breaker trips and beams when the queue is clear. */
function suds(x: CanvasRenderingContext2D, v: View, m: SceneModel, hover: boolean) {
  const { sx, y, t } = v, cx = sx(L.suds), top = y(56);
  if (!onScreen(v, cx - 30, 60)) return;
  box(x, cx - 2, y(26), 4, 26, '#2a1a10', 'rgba(' + O + ',.6)');
  box(x, cx - 8, y(3), 16, 3, '#2a1a10', 'rgba(' + O + ',.6)');
  const g = x.createRadialGradient(cx, top + 15, 2, cx, top + 15, 40);
  g.addColorStop(0, 'rgba(0,255,255,.1)'); g.addColorStop(1, 'rgba(0,255,255,0)');
  x.fillStyle = g; x.fillRect(cx - 40, top - 25, 80, 80);
  box(x, cx - 15, top, 30, 30, '#05181a', 'rgba(' + C + ',.75)');
  const tripped = m.get('breaker') === 'tripped', clear = !Number(m.value('waiting'));
  const face = 'rgba(' + C + ',.9)';
  // eyes: bubbles; a mouth
  x.strokeStyle = face; x.lineWidth = 1;
  if (tripped) { for (const ex of [-6, 6]) { x.beginPath(); x.moveTo(cx + ex - 2, top + 9); x.lineTo(cx + ex + 2, top + 13); x.moveTo(cx + ex + 2, top + 9); x.lineTo(cx + ex - 2, top + 13); x.stroke(); } }
  else for (const ex of [-6, 6]) { x.beginPath(); x.arc(cx + ex, top + 11, 2.5, 0, 7); x.stroke(); }
  x.beginPath();
  if (tripped) { x.moveTo(cx - 6, top + 23); x.lineTo(cx + 6, top + 23); }
  else if (clear) x.arc(cx, top + 18, 6, 0.2, Math.PI - 0.2);
  else x.arc(cx, top + 16, 6, 0.6, Math.PI - 0.6);
  x.stroke();
  // bubbles rising off the top of the screen
  for (let k = 0; k < 4; k++) {
    const f = ((t * 0.6 + k * 25) % 100) / 100, bx = cx - 9 + k * 6 + Math.sin(t * 0.05 + k) * 2, by = top - f * 22;
    x.strokeStyle = 'rgba(' + C + ',' + (0.5 * (1 - f)) + ')'; x.beginPath(); x.arc(bx, by, 1.5 + k % 2, 0, 7); x.stroke();
  }
  // its plate on the post
  box(x, cx - 14, y(22), 28, 10, '#1a120b', 'rgba(' + O + ',.7)');
  text(x, 'SUDS', cx, y(17), 'rgba(' + PAPER + ',.9)', 7, '600');
  if (hover) { x.save(); x.strokeStyle = 'rgba(255,61,242,.85)'; x.shadowColor = 'rgba(255,61,242,.8)'; x.shadowBlur = 8; x.strokeRect(cx - 18.5, top - 3.5, 37, 59); x.restore(); }
}

/** The schedule: a timer box counting down to the next slot, the opening hours on a plate over it. */
function schedule(x: CanvasRenderingContext2D, v: View, m: SceneModel, hover: boolean) {
  const { sx, y, t } = v, s = sx(L.clock - 17), top = y(88);
  if (!onScreen(v, s - 20, 74)) return;
  box(x, s - 6, y(104), 46, 12, '#1a120b', 'rgba(' + O + ',.7)');
  text(x, '06:00–02:00', s + 17, y(98), 'rgba(' + PAPER + ',.9)', 7, '600');
  box(x, s, top, 34, 30, '#241a12', 'rgba(' + PAPER + ',.5)');
  box(x, s + 3, top + 3, 28, 15, '#041416', 'rgba(' + C + ',.6)');
  const next = m.clocks.next('clock.clock');
  const secs = next ? String(Math.ceil(next.ms / 1000)).padStart(2, '0') : '--';
  text(x, next ? 'SLOT ' + secs : 'STOPPED', s + 17, top + 10.5, next && next.ms < 3000 ? 'rgba(255,210,58,.95)' : 'rgba(' + C + ',.9)', 7, '600');
  for (let k = 0; k < 3; k++) { x.fillStyle = 'rgba(' + PAPER + ',.35)'; x.fillRect(s + 6 + k * 9, top + 22, 5, 3); }
  tell(x, t, s + 31, top + 27, 3);
  // its cable runs down the wall and along the skirting toward the washers
  x.fillStyle = 'rgba(' + RUST + ',.6)'; x.fillRect(s + 33, y(60), 1, 2); x.fillRect(s + 33, y(58), 1, 46); x.fillRect(s + 33, y(12), sx(L.washers[0] - 23) - (s + 33), 1);
  if (hover) { x.save(); x.strokeStyle = 'rgba(255,61,242,.85)'; x.shadowColor = 'rgba(255,61,242,.8)'; x.shadowBlur = 8; x.strokeRect(s - 3.5, top - 3.5, 41, 37); x.restore(); }
}

/** The soap dispenser on the wall: sachets behind a window, a token slot. */
function soap(x: CanvasRenderingContext2D, v: View) {
  const { sx, y, t } = v, s = sx(L.soap - 14);
  if (!onScreen(v, s, 28)) return;
  box(x, s, y(76), 28, 42, '#22302a', 'rgba(' + PAPER + ',.5)');
  box(x, s + 3, y(72), 22, 18, '#0a100e', 'rgba(' + PAPER + ',.3)');
  for (let k = 0; k < 6; k++) { x.fillStyle = ['#5aa83a', '#e8c83a', '#3a6ad8'][k % 3]; x.globalAlpha = 0.7; x.fillRect(s + 5 + (k % 3) * 7, y(70) + Math.floor(k / 3) * 8, 5, 6); x.globalAlpha = 1; }
  box(x, s + 9, y(50), 10, 4, '#020303', 'rgba(' + C + ',.7)');
  box(x, s + 4, y(43), 20, 6, '#020303');
  box(x, s - 4, y(88), 36, 10, '#1a120b', 'rgba(' + O + ',.7)');
  text(x, 'SOAP 1T', s + 14, y(83), 'rgba(' + PAPER + ',.9)', 7, '600');
  tell(x, t, s + 24, y(38), 4);
}

/** The folding table: the one towel, folded and unfolded by FOLD-O, and the neat piles. */
function table(x: CanvasRenderingContext2D, v: View) {
  const { sx, y, t } = v, T = L.table, a = sx(T.x0), w = T.x1 - T.x0;
  if (!onScreen(v, a, w)) return;
  box(x, a, y(T.h), w, 3, '#5a4a3a', 'rgba(' + PAPER + ',.5)');
  x.fillStyle = '#2a1d14'; x.fillRect(a + 3, y(T.h - 3), 2, T.h - 3); x.fillRect(a + w - 5, y(T.h - 3), 2, T.h - 3);
  // the towel: spread out, then folded, then spread out again
  const ph = Math.floor(t / 40) % 3, tw = [22, 12, 6][ph], th = [2, 3, 5][ph];
  x.fillStyle = '#b8a68a'; x.fillRect(a + 34 - tw / 2, y(T.h + th), tw, th);
  x.fillStyle = '#d8c8a8'; x.fillRect(a + 34 - tw / 2, y(T.h + th), tw, 1);
  // a pile of folded nothing, very neat
  for (let k = 0; k < 3; k++) { x.fillStyle = ['#8a7a6a', '#a8987a', '#7a6a5a'][k]; x.fillRect(a + 4, y(T.h + 3 + k * 3), 14, 3); }
}

/** The bench under the window. */
function benchUnderWindow(x: CanvasRenderingContext2D, v: View) {
  const { sx, y } = v, B = L.bench, a = sx(B.x0), w = B.x1 - B.x0;
  if (!onScreen(v, a, w)) return;
  box(x, a, y(B.h), w, 3, '#4a2a1a', 'rgba(' + O + ',.6)');
  x.fillStyle = '#2a1a10'; x.fillRect(a + 4, y(B.h - 3), 3, B.h - 3); x.fillRect(a + w - 7, y(B.h - 3), 3, B.h - 3);
}

/** The lost-sock board: single socks pinned up, notes under them in different hands. */
function sockBoard(x: CanvasRenderingContext2D, v: View) {
  const { sx, y, t } = v, s = sx(L.socks - 18);
  if (!onScreen(v, s, 36)) return;
  box(x, s, y(108), 36, 44, '#4a321e', 'rgba(' + O + ',.7)');
  const cols = ['#c8c0b0', '#8a2a2a', '#3a6ad8', '#62626c', '#d8b040'];
  for (let k = 0; k < 5; k++) {
    const sxk = s + 4 + (k % 3) * 11, syk = y(102) + Math.floor(k / 3) * 18;
    x.fillStyle = cols[k]; x.fillRect(sxk, syk, 3, 8); x.fillRect(sxk, syk + 6, 6, 3);
    x.fillStyle = 'rgba(255,42,68,.8)'; x.fillRect(sxk + 1, syk, 1, 1);
  }
  box(x, s + 4, y(70), 28, 4, 'rgba(' + PAPER + ',.7)');
  tell(x, t, s + 32, y(66), 5);
}

/** Draw the laundromat and everything round it. */
export function drawLaundromat(x: CanvasRenderingContext2D, v: View, e: EngineDraw) {
  const { sx, y, t } = v, m = e.m, w0 = sx(0), w1 = sx(LAUNDROMAT_W);
  x.fillStyle = '#020101'; x.fillRect(0, 0, v.viewW, v.viewH);
  upstairs(x, v, w0, w1);
  // middle band: the back wall (pale tiles to shoulder height, paint above), the ceiling
  box(x, w0, y(CEIL), w1 - w0, CEIL, '#110b08');
  box(x, w0, y(64), w1 - w0, 64, '#15100c');
  x.fillStyle = 'rgba(' + PAPER + ',.04)';
  for (let hy = 4; hy < 64; hy += 8) x.fillRect(w0, y(hy), w1 - w0, 1);
  for (let wx = 0; wx < LAUNDROMAT_W; wx += 12) x.fillRect(sx(wx), y(64), 1, 64);
  x.fillStyle = 'rgba(' + O + ',.3)'; x.fillRect(w0, y(64), w1 - w0, 1);
  box(x, w0, y(CEIL + 10), w1 - w0, 10, '#0d0805');
  x.fillStyle = 'rgba(' + O + ',.4)'; x.fillRect(w0, y(CEIL), w1 - w0, 1);
  x.fillStyle = 'rgba(' + O + ',.7)'; x.fillRect(w0, 0, 1, v.gy); x.fillRect(w1 - 1, 0, 1, v.gy);

  frontWindow(x, v);
  // tube lights, harsh; the one over the washers dips at every slot (the schedule starting three machines)
  const next = m.clocks.next('clock.clock'), dip = m.get('breaker') === 'tripped' || (next !== null && next.ms > 23000);
  L.tubes.forEach((tx, i) => {
    const lx = sx(tx), dim = (i === 1 && dip) || (i === 3 && t % 260 > 248);
    const g = x.createLinearGradient(0, y(CEIL - 4), 0, y(0));
    g.addColorStop(0, 'rgba(225,240,255,' + (dim ? 0.03 : 0.1) + ')'); g.addColorStop(1, 'rgba(225,240,255,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(lx - 30, y(CEIL - 4)); x.lineTo(lx - 100, y(0)); x.lineTo(lx + 100, y(0)); x.lineTo(lx + 30, y(CEIL - 4)); x.closePath(); x.fill();
    box(x, lx - 30, y(CEIL - 2), 60, 3, dim ? 'rgba(225,240,255,.25)' : 'rgba(235,245,255,.9)');
  });

  // the wall: the Registry's strip, the TV, a camera on the washers, the dead dryers
  ticker(x, v, { x: 380, h: 106, w: 300, tall: 10, text: 'WASH CYCLES ARE LOGGED TO YOUR IDENTITY   ·   WATER 40 L PER CYCLE PER ID   ·   UNATTENDED LAUNDRY IS REPORTED AFTER 72 H   ·   ABANDONED PROPERTY IS SCANNED FOR IDENTITY', col: '255,90,70', speed: 0.4 });
  adScreen(x, v, { x: 586, h: 100, w: 70, tall: 22, mount: 'wall', ads: [['REGISTRY PREMIUM', 'PRIORITY SLOTS'], ['DETERGENT', 'TAXED AT SOURCE'], ['VERIFIED RESIDENTS', 'WASH FIRST']], period: 260 });
  camera(x, v, { x: 214, h: 110, facing: 1, phase: 7 });
  dryers(x, v);

  // play band: the door, the notice, soap, the schedule, the washers and their conduits, the breaker, SUDS
  exitDoor(x, v, L.door, '#0a0603', '< MARKET');
  notice(x, t, sx(L.notice), y(96), 40, 30, ['REGISTRY', 'NOTICE']);
  soap(x, v);
  schedule(x, v, m, e.hover === 'clock');
  conduits(x, v, m.get('breaker') === 'tripped');
  for (let i = 0; i < 4; i++) washer(x, v, m, i, e.hover === 'washer' + (i + 1));
  // notes people taped on their machines
  taped(x, v, { x: L.washers[1] + 4, h: 60, text: ['MINE', 'SINCE TUE'], tilt: -0.06 });
  taped(x, v, { x: L.washers[3] - 2, h: 60, text: ['WAKE ME', 'AT DONE'], tilt: 0.05 });
  breaker(x, v, m, e.hover === 'breaker');
  suds(x, v, m, e.hover === 'suds');
  // FOLD-O stands behind its table; the rest in front of what they sit on
  drawCharacters(x, v, [folder]);
  table(x, v);
  benchUnderWindow(x, v);
  sockBoard(x, v);
  drawCharacters(x, v, PEOPLE.filter((p) => p !== folder));

  // the floor: tiles, a drain, a puddle under the washers that reflects the tubes
  x.fillStyle = '#070505'; x.fillRect(w0, v.gy, w1 - w0, v.viewH - v.gy);
  x.fillStyle = 'rgba(' + O + ',.6)'; x.fillRect(w0, v.gy, w1 - w0, 1);
  for (let r = 0; r < 4; r++) for (let c = 0; c < LAUNDROMAT_W; c += 20) {
    if ((c / 20 + r) % 2) continue;
    const tx = sx(c) + r * 5;
    if (tx < w0 || tx > w1 - 18) continue;
    x.fillStyle = 'rgba(235,245,255,.035)'; x.fillRect(tx, v.gy + 3 + r * 12, 16, 10);
  }
  const pa = sx(L.washers[1]), pb = sx(L.washers[3]);
  x.fillStyle = 'rgba(150,190,230,.08)'; x.fillRect(pa, v.gy + 2, pb - pa, 6);
  x.fillStyle = 'rgba(235,245,255,' + (0.06 + 0.03 * Math.sin(t * 0.04)) + ')'; x.fillRect(sx(380) - 20, v.gy + 4, 40, 1);
  box(x, sx(520) - 8, v.gy + 6, 16, 4, '#020101', 'rgba(' + PAPER + ',.2)');
}
