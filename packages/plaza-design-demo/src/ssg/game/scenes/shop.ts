/**
 * A corner shop at night: shelves packed with colour, humming fridges, a vending machine, a
 * shopkeeper at the till under a camera, a lottery screen, a security mirror, a customer or two,
 * a cat asleep on the fridge. Small enough to sit in the middle of a wide screen.
 * Bands: far = the street through the window (people passing in the rain); middle = the back
 * wall and, on tall screens, the building above the shop in cutaway (the stockroom, then flats);
 * play = shelves, fridges, machine, counter, people.
 *
 * Built from the kits: people (../characters.ts), screens (screens.ts), shelves and fridges (build.ts).
 */

import { light } from '../light';
import { drawPane, windowShaft } from '../sets/sky';
import { drawGrade } from '../sets/lighting';

/** The shop is on the street's east side: its window looks west (light.ts facing). */
const SHOP_FACING = 270;
import { drawCharacters, drawCharacter, type Character } from '../characters';
import { fridge, shelf, type ShelfSpec } from './build';
import { box, C, exitDoor, O, onScreen, PAPER, rng, tell, text, type SceneDef, type ItemId, type SceneUse, type View } from './kit';
import { adScreen, camera, lotteryScreen, ticker, wallSign } from './screens';

/** Layout: positions in world units, heights up from the floor. */
const L = {
  width: 900,
  spawn: 84,
  ceil: 160,
  window: { x: 70, w: 80, h0: 34, h1: 116 },
  mirror: { x: 166, h: 140 },
  shelves: [
    { x: 182, w: 92, h: 112, rows: 4, seed: 71, stock: 'snacks' },
    { x: 284, w: 92, h: 112, rows: 4, seed: 72, stock: 'noodles' },
    { x: 386, w: 92, h: 112, rows: 4, seed: 73, stock: 'mixed' },
  ] as ShelfSpec[],
  vend: { x: 500, w: 38, h: 78 },
  fridge: { x: 556, w: 108, h: 98, seed: 5, doors: 2 },
  counter: { x: 700, w: 170, h: 26 },
  till: 730,
  keeper: 800,
  tubes: [140, 400, 660],
  /** The building above the shop: a slab, then storeys (the first is the stockroom). */
  slab: 10,
  storey: 76,
  /** Pipes rising through every floor. */
  risers: [44, 856],
};

const RAIN = (() => { const r = rng(73); return Array.from({ length: 24 }, () => [r() * 80, r() * 80, 0.5 + r()]); })();

// ---------- people ----------

const keeper: Character = { id: 'keeper', seed: 5101, look: { body: 'avg', hair: 'short', garb: 'jacket', extras: ['glasses'], top: '#6a2a3e' }, x: L.keeper, act: 'vend', facing: -1, name: 'SHOPKEEPER', talk: [
  ['We\'re open.', 'We\'re always open. The sticker says 24/7. I wanted 24/7/365.25. The printer said no.'],
  ['The camera? The Registry insists. It films the till.', 'The till has nothing to hide. The till has nothing at all, most nights.'],
  ['Buy something or keep the cat company. The cat charges less.'],
] };
const PEOPLE: Character[] = [
  { id: 'browser', seed: 5102, x: 200, act: 'walk', range: [200, 450], speed: 0.18, look: { body: 'tall', extras: ['phone', 'backpack'] }, name: 'CUSTOMER', talk: [
    ['They moved the cheap noodles to the top shelf.', 'Top shelf is for people with legs.so. I have the free legs.'],
    ['I come in to read the labels. It is warmer than the library and the library closed.'],
  ] },
  { seed: 5103, x: 610, act: 'stand', facing: -1, look: { body: 'short', garb: 'coat', hair: 'beanie', extras: ['bag'] } },
  { look: 'cat', seed: 4, x: 640, h: 99, act: 'sit', facing: -1 },
  // the robots: a stock unit restocking the shelves, an android buying batteries, a crawler on the ceiling fixing the light by the window
  { look: { bot: 'servbot', v: 0 }, seed: 5105, x: 470, act: 'carry', range: [470, 300], speed: 0.16 },
  { id: 'android', seed: 5106, look: 'android', x: 688, act: 'queue', facing: 1, name: 'CUSTOMER', talk: [
    ['Batteries. Two packs. Do not make it weird.'],
    ['People ask what I do for fun. I queue. I am very good at it. I have never once been served first.'],
  ] },
  { look: 'crawler', seed: 5107, x: 124, h: 133, act: 'weld', facing: 1 },
];

/** People passing outside, seen through the window: small, dim, far. */
const OUTSIDE: Character[] = [
  { seed: 5201, x: 40, act: 'walk', range: 260, ps: 2, dim: 0.45, parallax: 0.3, h: 36, speed: 0.4, look: { extras: ['umbrella'] } },
  { seed: 5202, x: 300, act: 'walk', range: -260, ps: 2, dim: 0.5, parallax: 0.3, h: 36, speed: 0.3 },
];

// ---------- buying ----------

let bought = 0;
const GOODS = [
  ['One BLUE. The flavour is blue. Nobody knows more than that.', 'It tastes like the colour. Don\'t think about it.'],
  ['Crisps, salt and vinegar. The vinegar is synthetic. The salt is from the harbor.', 'Don\'t ask the harbor.'],
  ['Noodle cup. Three for three tokens, one for one.', 'The maths is the only honest thing in this shop.'],
  ['Gum. The last pack.', 'It has been the last pack since I opened.'],
];
/** What each of GOODS puts in your hands. */
const GOOD_ITEMS: ItemId[] = ['blue', 'crisps', 'noodlecup', 'gum'];
const USES: SceneUse[] = [
  { id: 'buy', x: L.till, label: '[E] BUY · 1 TOKEN', name: 'SHOPKEEPER', promptH: 62, use: (c) => {
    if (!c.pay(1)) return ['One token. You have none. I can do nothing for you, at no charge.', 'Credit? This is a corner shop, not a bank. Banks have better locks.'];
    c.set('shop:bought'); c.add(GOOD_ITEMS[bought % GOOD_ITEMS.length]);
    return GOODS[bought++ % GOODS.length];
  } },
];

/** Per upper room: boxes [x, w, h] on the floor, windows [x, lit], a bulb x. Laid out once, for 8 floors. */
const ROOMS = Array.from({ length: 8 }, (_, k) => {
  const r = rng(140 + k), boxes: number[][] = [], wins: number[][] = [];
  for (let bx = 70; bx < L.width - 60; bx += 18 + Math.round(r() * 60)) if (k === 0 || r() < 0.25) boxes.push([bx, 16 + Math.round(r() * 18), 10 + Math.round(r() * (k === 0 ? 30 : 14))]);
  for (let wx = 90 + Math.round(r() * 40); wx < L.width - 80; wx += 150 + Math.round(r() * 90)) wins.push([wx, r() < 0.35 ? 1 : 0]);
  return { boxes, wins, bulb: 160 + Math.round(r() * 540) };
});

/**
 * The building above the shop, in cutaway, for screens taller than the shop: a
 * stockroom, then flats, storey after storey up out of the view. Middle band:
 * dim walls, dim boxes, a few warm windows and bulbs, nothing cyan.
 */
function drawUpstairs(x: CanvasRenderingContext2D, v: View, w0: number, w1: number) {
  const { sx, y, t } = v, top = v.gy, width = w1 - w0;
  if (top <= L.ceil) return;
  box(x, w0, y(L.ceil + L.slab), width, L.slab, '#0d0805');
  for (let k = 0, h0 = L.ceil + L.slab; h0 < top && k < ROOMS.length; k++, h0 += L.storey + L.slab) {
    const R = ROOMS[k], h1 = h0 + L.storey;
    x.fillStyle = k === 0 ? '#090604' : '#070403'; x.fillRect(w0, y(h1), width, L.storey);
    x.fillStyle = 'rgba(' + O + ',.05)'; for (let wx = 20; wx < L.width; wx += 60) x.fillRect(sx(wx), y(h1), 1, L.storey);
    for (const [wx, lit] of R.wins) {
      const s = sx(wx);
      if (!onScreen(v, s, 34)) continue;
      box(x, s, y(h0 + 56), 30, 34, lit ? 'rgba(255,170,90,.12)' : '#030201', 'rgba(194,65,12,.4)');
      x.fillStyle = 'rgba(194,65,12,.4)'; x.fillRect(s + 15, y(h0 + 56), 1, 34); x.fillRect(s - 2, y(h0 + 22), 34, 2);
      if (lit) { x.fillStyle = 'rgba(255,217,165,.08)'; x.fillRect(s + 2, y(h0 + 54), 6, 30); }
    }
    const bx = sx(R.bulb), by = y(h1 - 18), on = k === 0 || k % 3 === 2;
    x.strokeStyle = 'rgba(' + PAPER + ',.25)'; x.beginPath(); x.moveTo(bx + 0.5, y(h1)); x.lineTo(bx + 0.5, by); x.stroke();
    if (on) {
      const g = x.createRadialGradient(bx, by, 1, bx, by, 60);
      g.addColorStop(0, 'rgba(255,190,110,.1)'); g.addColorStop(1, 'rgba(255,190,110,0)');
      x.fillStyle = g; x.fillRect(bx - 60, y(h1), 120, L.storey);
    }
    x.fillStyle = on ? 'rgba(255,217,165,' + (0.55 + 0.05 * Math.sin(t * 0.03 + k)) + ')' : 'rgba(255,217,165,.15)'; x.fillRect(bx - 1, by, 3, 3);
    for (const [wx, w, h] of R.boxes) {
      box(x, sx(wx), y(h0 + h), w, h, k === 0 ? '#150c06' : '#0d0805', 'rgba(194,65,12,' + (k === 0 ? 0.45 : 0.3) + ')');
      if (k === 0 && h > 22) box(x, sx(wx) + 2, y(h0 + h + 14), w - 4, 14, '#120a05', 'rgba(194,65,12,.4)');
    }
    if (k === 0 && R.boxes[2]) { const [wx, w, h] = R.boxes[2]; text(x, 'NOODLES', sx(wx) + w / 2, y(h0 + h / 2), 'rgba(' + PAPER + ',.3)', 7, '600'); }
    box(x, w0, y(h1 + L.slab), width, L.slab, '#0d0805');
    x.fillStyle = 'rgba(194,65,12,.35)'; x.fillRect(w0, y(h1 + L.slab), width, 1);
  }
  x.fillStyle = 'rgba(194,65,12,.4)'; for (let h = L.ceil + L.slab; h < top; h += L.storey + L.slab) x.fillRect(w0, y(h), width, 1);
  for (const p of L.risers) {
    const s = sx(p);
    x.fillStyle = 'rgba(201,138,63,.22)'; x.fillRect(s, 0, 3, y(L.ceil));
    x.fillStyle = 'rgba(201,138,63,.35)'; for (let h = L.ceil + L.slab + 20; h < top; h += L.storey + L.slab) x.fillRect(s - 1, y(h), 5, 2);
  }
}

/** The convex security mirror up in the corner: the shop, bent, in silver. */
function mirror(x: CanvasRenderingContext2D, v: View) {
  const cx = v.sx(L.mirror.x), cy = v.y(L.mirror.h), r = 11;
  if (!onScreen(v, cx - r - 10, r * 2 + 20)) return;
  x.fillStyle = '#2a1d14'; x.fillRect(cx - 14, cy - 1, 4, 2);
  x.save(); x.beginPath(); x.arc(cx, cy, r, 0, 7); x.clip();
  x.fillStyle = '#20242a'; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  const cols = ['#d83a2a', '#e8c83a', '#5aa83a', '#f08a2a', '#c83a8a'];
  for (let i = 0; i < 9; i++) { x.fillStyle = cols[i % cols.length]; x.globalAlpha = 0.5; x.fillRect(cx - r + i * 2.5, cy + 2 - Math.abs(i - 4) * 0.8, 2, 6); }
  x.globalAlpha = 1;
  x.fillStyle = 'rgba(240,245,255,.5)'; x.fillRect(cx + 3, cy - 4, 2, 3); x.fillRect(cx - 4, cy - 2, 3, 6);
  x.fillStyle = 'rgba(255,255,255,.25)'; x.beginPath(); x.ellipse(cx - 4, cy - 5, 4, 2, -0.6, 0, 7); x.fill();
  x.restore();
  x.strokeStyle = 'rgba(210,210,220,.8)'; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.stroke(); x.lineWidth = 1;
}

export const shop: SceneDef = {
  id: 'shop',
  name: 'Corner Shop',
  // facing (light.ts): on the street's east side: its window looks west across Downtown's street
  facing: 270,
  width: L.width,
  spawn: L.spawn,
  intro: ['A corner shop. The kind that never closes and never has change.'],
  exits: [{ id: 'downtown', x: 32, to: 'downtown', at: 'shop', label: '[E] DOWNTOWN', promptH: 82 }],
  readables: [
    { id: 'shelf', x: 330, name: 'SHELF LABEL', promptH: 150, pages: ['NOODLE CUPS · LIMIT 3 PER CUSTOMER.', 'PURCHASES OVER LIMIT ARE REPORTED.'] },
    { id: 'vend', x: 519, name: 'THIRST.EXE', promptH: 94, pages: ['ACCEPTS TOKENS. CHANGE NOT GIVEN.', 'SCREEN: OUT OF ORDER. DISPENSING NORMALLY.'] },
  ],
  people: [keeper, ...PEOPLE],
  uses: USES,

  drawBackdrop(x, v) {
    const { sx, y, t } = v, w0 = sx(0), w1 = sx(L.width);
    x.fillStyle = '#020101'; x.fillRect(0, 0, v.viewW, v.viewH);
    // middle band: the back wall (warmer, painted), wainscot and the ceiling
    box(x, w0, y(L.ceil), w1 - w0, L.ceil, '#120a07');
    x.fillStyle = 'rgba(' + O + ',.1)'; for (let wx = 0; wx < L.width; wx += 40) x.fillRect(sx(wx), y(L.ceil), 1, L.ceil - 30);
    box(x, w0, y(30), w1 - w0, 30, '#160c08'); x.fillStyle = 'rgba(' + O + ',.3)'; x.fillRect(w0, y(30), w1 - w0, 1);
    drawUpstairs(x, v, w0, w1);
    x.fillStyle = 'rgba(' + O + ',.35)'; x.fillRect(w0, y(L.ceil), w1 - w0, 1);
    x.fillStyle = 'rgba(' + O + ',.7)'; x.fillRect(w0, 0, 1, v.gy); x.fillRect(w1 - 1, 0, 1, v.gy);

    // tube lights; one of them is on its way out
    for (let i = 0; i < L.tubes.length; i++) {
      const lx = sx(L.tubes[i]), dying = i === 1 && (t % 200 > 180 || (t % 200 > 150 && Math.floor(t) % 6 < 3));
      const g = x.createLinearGradient(0, y(L.ceil - 4), 0, y(0));
      g.addColorStop(0, 'rgba(255,230,190,' + (dying ? 0.04 : 0.12) + ')'); g.addColorStop(1, 'rgba(255,230,190,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(lx - 30, y(L.ceil - 4)); x.lineTo(lx - 110, y(0)); x.lineTo(lx + 110, y(0)); x.lineTo(lx + 30, y(L.ceil - 4)); x.closePath(); x.fill();
      box(x, lx - 30, y(L.ceil - 2), 60, 3, dying ? 'rgba(255,230,190,.25)' : 'rgba(255,240,215,.9)');
    }

    // far band: the street through the window, people passing in the rain
    const W = L.window, wx = sx(W.x), top = y(W.h1), wh = W.h1 - W.h0;
    if (onScreen(v, wx, W.w)) {
      // the street outside at this hour (sets/sky.ts: the window looks west across Downtown's street)
      const lt = light();
      x.save(); x.beginPath(); x.rect(wx, top, W.w, wh); x.clip();
      drawPane(x, wx, top, W.w, wh, lt, { facing: SHOP_FACING, seed: 51, towers: [[0.07, 0.25, 0.22], [0.42, 0.35, 0.1], [0.82, 0.25, 0.32]], horizon: 0.5 });
      drawCharacters(x, v, OUTSIDE);
      drawGrade(x, v, lt, true);
      x.strokeStyle = 'rgba(170,210,255,.25)';
      if ((lt.w?.rain ?? 0) > 0.05) for (const [rx, ry, sp] of RAIN) { const yy = (ry + t * sp * 2) % wh; x.beginPath(); x.moveTo(wx + rx, top + yy); x.lineTo(wx + rx - 1, top + yy + 4); x.stroke(); }
      x.restore();
      x.strokeStyle = 'rgba(' + O + ',.8)'; x.strokeRect(wx + 0.5, top + 0.5, W.w - 1, wh - 1);
      x.fillStyle = 'rgba(' + O + ',.8)'; x.fillRect(wx + W.w / 2, top, 1, wh);
      text(x, 'NEPO', wx + W.w / 2, top + wh - 10, 'rgba(255,136,0,.6)', 8, '600');
      box(x, wx + 22, top + wh - 30, W.w - 44, 11, 'rgba(255,217,165,.18)', 'rgba(' + PAPER + ',.4)');
      text(x, '24/7', wx + W.w / 2, top + wh - 24.5, 'rgba(' + PAPER + ',.85)', 7, '600');
      windowShaft(x, { l: wx, r: wx + W.w, t: top, b: y(W.h0) }, y(0), Math.min(v.viewH, y(0) + 16), lt, SHOP_FACING);
    }
    exitDoor(x, v, 32, '#0a0603');
    mirror(x, v);

    // the back wall's top band: the Registry's strip running over the shelves
    ticker(x, v, { x: 330, h: 136, w: 290, tall: 10, text: 'ID REQUIRED FOR ALL PURCHASES   ·   CASH TRANSACTIONS ARE LOGGED   ·   SHOPLIFTING IS REPORTED TO THE REGISTRY   ·   CURFEW 01:00', col: '255,90,70', speed: 0.4 });

    // play band: shelves, the label, the vending machine, the fridges
    for (const s of L.shelves) shelf(x, v, s);
    box(x, sx(330) - 26, y(130), 52, 12, '#1a120b', 'rgba(' + O + ',.7)');
    text(x, 'LIMIT 3', sx(330), y(124), 'rgba(' + PAPER + ',.9)', 7, '600');
    tell(x, t, sx(330) + 22, y(126));

    const M = L.vend, mx = sx(M.x);
    if (onScreen(v, mx - 20, M.w + 40)) {
      const g = x.createRadialGradient(mx + M.w / 2, y(50), 4, mx + M.w / 2, y(40), 70);
      g.addColorStop(0, 'rgba(0,255,255,.12)'); g.addColorStop(1, 'rgba(0,255,255,0)');
      x.fillStyle = g; x.fillRect(mx - 50, y(110), M.w + 100, 110);
      box(x, mx, y(M.h), M.w, M.h, '#0d1416', 'rgba(' + C + ',.7)');
      box(x, mx + 4, y(M.h - 4), M.w - 8, 42, '#04191b', 'rgba(' + C + ',.35)');
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { x.fillStyle = ['#d83a2a', '#e8c83a', '#5aa83a', '#f08a2a'][(r + c) % 4]; x.globalAlpha = 0.75; x.fillRect(mx + 7 + c * 7, y(M.h - 8) + r * 10, 4, 7); x.globalAlpha = 1; }
      box(x, mx + 4, y(30), M.w - 8, 10, '#020606', 'rgba(' + C + ',.35)');
      text(x, 'THIRST', mx + M.w / 2, y(25), 'rgba(' + C + ',' + (0.6 + 0.3 * Math.sin(t * 0.05)) + ')', 7, '600');
      x.fillStyle = '#020303'; x.fillRect(mx + 8, y(12), M.w - 16, 6);
    }
    fridge(x, v, L.fridge);
    adScreen(x, v, { x: L.fridge.x + L.fridge.w / 2, h: 116, w: 96, tall: 26, mount: 'hang', to: L.ceil, ads: [['COLD DRINKS', 'VERIFIED RESIDENTS'], ['OXYGEN SURCHARGE', 'IN EFFECT'], ['WATER 2L', 'PER ID PER DAY']], period: 240 });

    // the counter: lottery behind, the camera over the till, the keeper
    const K = L.counter, kx = sx(K.x);
    if (onScreen(v, kx - 60, K.w + 120)) {
      lotteryScreen(x, v, { x: K.x + 120, h: 76, w: 80, tall: 36, mount: 'wall' });
      wallSign(x, v, { x: K.x + 60, h: 126, text: 'CASH ONLY', col: O, size: 8, phase: 90 });
      camera(x, v, { x: K.x + 14, h: 134, facing: 1, phase: 3 });
      drawCharacter(x, v, keeper);
      box(x, kx, y(K.h), K.w, K.h, '#24130a', 'rgba(' + O + ',.85)');
      x.fillStyle = 'rgba(' + O + ',.9)'; x.fillRect(kx, y(K.h), K.w, 2);
      // the till (paying is something you can do: a cyan edge), a jar of sweets, the plate
      box(x, kx + 18, y(K.h + 14), 26, 14, '#1a120b', 'rgba(' + C + ',.6)');
      x.fillStyle = 'rgba(' + C + ',.5)'; x.fillRect(kx + 21, y(K.h + 11), 14, 3);
      tell(x, t, kx + 40, y(K.h + 4), 1);
      box(x, kx + 56, y(K.h + 12), 10, 12, 'rgba(200,210,220,.15)', 'rgba(220,220,230,.5)');
      for (let i = 0; i < 6; i++) { x.fillStyle = ['#d83a2a', '#e8c83a', '#5aa83a'][i % 3]; x.fillRect(kx + 58 + (i % 3) * 2, y(K.h + 4 + Math.floor(i / 3) * 3), 2, 2); }
      box(x, kx + 112, y(K.h - 6), 48, 14, '#1a120b', 'rgba(' + O + ',.6)');
      text(x, 'NO LOGS', kx + 136, y(K.h - 13), 'rgba(' + PAPER + ',.85)', 7, '600');
      // stickers on the counter front, faded
      x.fillStyle = 'rgba(232,200,58,.35)'; x.fillRect(kx + 80, y(K.h - 8), 8, 6);
      x.fillStyle = 'rgba(216,58,42,.35)'; x.fillRect(kx + 92, y(K.h - 12), 6, 6);
    }
    drawCharacters(x, v, PEOPLE);

    // the floor: worn tiles
    x.fillStyle = '#060403'; x.fillRect(w0, v.gy, w1 - w0, v.viewH - v.gy);
    x.fillStyle = 'rgba(' + O + ',.6)'; x.fillRect(w0, v.gy, w1 - w0, 1);
    for (let r = 0; r < 4; r++) for (let c = 0; c < L.width; c += 24) {
      if ((c / 24 + r) % 2) continue;
      const tx = sx(c) + r * 6;
      if (tx < w0 || tx > w1 - 20) continue;
      x.fillStyle = 'rgba(255,217,165,.04)'; x.fillRect(tx, v.gy + 3 + r * 12, 20, 10);
    }
    // the fridges' glow on the floor
    const fx = sx(L.fridge.x);
    x.fillStyle = 'rgba(220,235,255,.05)'; x.fillRect(fx, v.gy + 1, L.fridge.w, 10);
  },

  drawFront(x, v) {
    // a near rack of crisps at the bottom of the view, every bag a different colour
    const s = v.sx(250, 1.25), base = v.gy + 56;
    if (!onScreen(v, s, 90)) return;
    box(x, s, base - 34, 90, 34, '#020100', 'rgba(' + O + ',.3)');
    const cols = ['#d83a2a', '#e8c83a', '#5aa83a', '#f08a2a', '#3a6ad8', '#c83a8a'];
    for (let i = 6, k = 0; i < 84; i += 14, k++) { x.fillStyle = cols[k % cols.length]; x.globalAlpha = 0.32; x.fillRect(s + i, base - 30, 10, 12); x.globalAlpha = 1; }
  },
};
