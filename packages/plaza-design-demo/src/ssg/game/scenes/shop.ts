/**
 * A corner shop at night: shelves, a vending machine, a counter with a
 * shopkeeper behind it, a window onto the rain. Small enough to sit in the
 * middle of a wide screen. Bands: far = the street through the window;
 * middle = the back wall; play = shelves, machine, counter, people.
 */

import { box, C, ceiling, exitDoor, figure, O, onScreen, PAPER, rng, sign, tell, text, type Scene, type View } from './kit';

/** Layout: positions in world units, heights up from the floor. */
const L = {
  width: 760,
  spawn: 84,
  ceil: 140,
  window: { x: 70, w: 80, h0: 34, h1: 110 },
  shelves: [{ x: 180, w: 92 }, { x: 282, w: 92 }, { x: 384, w: 92 }],
  shelfRows: [4, 32, 60, 88],
  vend: { x: 500, w: 38, h: 78 },
  counter: { x: 590, w: 150, h: 26 },
  keeper: 682,
  tubes: [140, 380, 620],
};

/** Goods on the shelves, laid out once: [dx, row, w, h, tone]. */
const GOODS = L.shelves.map((s, i) => { const r = rng(70 + i), g: number[][] = []; L.shelfRows.forEach((_, row) => { for (let dx = 4; dx < s.w - 8; dx += 2 + Math.round(r() * 4) + 5) g.push([dx, row, 4 + Math.round(r() * 4), 6 + Math.round(r() * 12), Math.floor(r() * 4)]); }); return g; });
const TONES = ['rgba(255,217,165,.5)', 'rgba(255,136,0,.5)', 'rgba(200,60,40,.5)', 'rgba(150,140,120,.45)'];
const RAIN = (() => { const r = rng(73); return Array.from({ length: 24 }, () => [r() * 80, r() * 80, 0.5 + r()]); })();

function drawShelf(x: CanvasRenderingContext2D, v: View, s: { x: number; w: number }, i: number) {
  const { sx, y } = v, s0 = sx(s.x);
  if (!onScreen(v, s0, s.w)) return;
  box(x, s0, y(116), s.w, 116, '#170d07', 'rgba(' + O + ',.75)');
  for (const [dx, row, w, h, tone] of GOODS[i]) { x.fillStyle = TONES[tone]; x.fillRect(s0 + dx, y(L.shelfRows[row] + 2 + h), w, h); }
  for (const h of L.shelfRows) { x.fillStyle = 'rgba(' + O + ',.7)'; x.fillRect(s0 + 1, y(h + 2), s.w - 2, 2); }
}

export const shop: Scene = {
  id: 'shop',
  name: 'Corner Shop',
  width: L.width,
  spawn: L.spawn,
  intro: ['A corner shop. The kind that never closes and never has change.'],
  exits: [{ id: 'downtown', x: 32, to: 'downtown', label: '[E] DOWNTOWN', promptH: 82 }],
  readables: [
    { id: 'shelf', x: 330, name: 'SHELF LABEL', promptH: 132, pages: ['NOODLE CUPS · 3 FOR THE PRICE OF 3.'] },
    { id: 'vend', x: 519, name: 'THIRST.EXE', promptH: 94, pages: ['Accepts tokens, coins and regrets.', 'The screen says OUT OF ORDER. It is also selling drinks. Both are true.'] },
    { id: 'keeper', x: L.keeper, name: 'SHOPKEEPER', label: '[E] TALK', h: 40, promptH: 70, pages: ["We're open.", "We're always open. The sticker on the window says so."] },
  ],

  drawBackdrop(x, v) {
    const { sx, y, t } = v, w0 = sx(0), w1 = sx(L.width);
    // outside the shop on wide screens: the dark street
    x.fillStyle = '#020101'; x.fillRect(0, 0, v.viewW, v.viewH);
    // middle band: the back wall, wainscot and the ceiling
    box(x, w0, y(L.ceil), w1 - w0, L.ceil, '#0b0705');
    x.fillStyle = 'rgba(' + O + ',.12)'; for (let wx = 0; wx < L.width; wx += 40) x.fillRect(sx(wx), y(L.ceil), 1, L.ceil - 30);
    box(x, w0, y(30), w1 - w0, 30, '#0e0906'); x.fillStyle = 'rgba(' + O + ',.3)'; x.fillRect(w0, y(30), w1 - w0, 1);
    ceiling(x, v, L.ceil);
    x.fillStyle = 'rgba(' + O + ',.7)'; x.fillRect(w0, 0, 1, v.gy); x.fillRect(w1 - 1, 0, 1, v.gy);

    // tube lights; one of them is on its way out
    for (let i = 0; i < L.tubes.length; i++) {
      const lx = sx(L.tubes[i]), dying = i === 1 && (t % 200 > 180 || (t % 200 > 150 && Math.floor(t) % 6 < 3));
      const g = x.createLinearGradient(0, y(L.ceil - 4), 0, y(0));
      g.addColorStop(0, 'rgba(255,230,190,' + (dying ? 0.03 : 0.1) + ')'); g.addColorStop(1, 'rgba(255,230,190,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(lx - 30, y(L.ceil - 4)); x.lineTo(lx - 100, y(0)); x.lineTo(lx + 100, y(0)); x.lineTo(lx + 30, y(L.ceil - 4)); x.closePath(); x.fill();
      box(x, lx - 30, y(L.ceil - 2), 60, 3, dying ? 'rgba(255,230,190,.25)' : 'rgba(255,240,215,.9)');
    }

    // far band: the street through the window, rain on the glass
    const W = L.window, wx = sx(W.x), top = y(W.h1), wh = W.h1 - W.h0;
    if (onScreen(v, wx, W.w)) {
      box(x, wx, top, W.w, wh, '#04060a');
      x.save(); x.beginPath(); x.rect(wx, top, W.w, wh); x.clip();
      x.fillStyle = '#080402'; x.fillRect(wx + 6, top + 18, 20, wh); x.fillRect(wx + 34, top + 8, 28, wh); x.fillRect(wx + 66, top + 26, 20, wh);
      x.fillStyle = 'rgba(255,136,0,.25)'; x.fillRect(wx + 40, top + 16, 2, 2); x.fillRect(wx + 50, top + 30, 2, 2); x.fillRect(wx + 12, top + 28, 2, 2);
      x.strokeStyle = 'rgba(170,210,255,.25)';
      for (const [rx, ry, sp] of RAIN) { const yy = (ry + t * sp * 2) % wh; x.beginPath(); x.moveTo(wx + rx, top + yy); x.lineTo(wx + rx - 1, top + yy + 4); x.stroke(); }
      x.restore();
      x.strokeStyle = 'rgba(' + O + ',.8)'; x.strokeRect(wx + 0.5, top + 0.5, W.w - 1, wh - 1);
      x.fillStyle = 'rgba(' + O + ',.8)'; x.fillRect(wx + W.w / 2, top, 1, wh);
      // the shop's own sign, backwards from in here, on the glass
      text(x, 'NEPO', wx + W.w / 2, top + wh - 10, 'rgba(255,136,0,.6)', 8, '600');
      // and the sticker under it, facing in
      box(x, wx + 10, top + wh - 30, W.w - 20, 11, 'rgba(255,217,165,.18)', 'rgba(' + PAPER + ',.4)');
      text(x, '24/7/365.25', wx + W.w / 2, top + wh - 24.5, 'rgba(' + PAPER + ',.85)', 7, '600');
    }
    exitDoor(x, v, 32, '#0a0603');

    // play band: shelves, the vending machine, the counter
    L.shelves.forEach((s, i) => drawShelf(x, v, s, i));
    box(x, sx(330) - 26, y(130), 52, 12, '#1a120b', 'rgba(' + O + ',.7)');
    text(x, '3 FOR 3', sx(330), y(124), 'rgba(' + PAPER + ',.9)', 7, '600');
    tell(x, t, sx(330) + 22, y(126));

    const M = L.vend, mx = sx(M.x);
    if (onScreen(v, mx - 20, M.w + 40)) {
      const g = x.createRadialGradient(mx + M.w / 2, y(50), 4, mx + M.w / 2, y(40), 70);
      g.addColorStop(0, 'rgba(0,255,255,.12)'); g.addColorStop(1, 'rgba(0,255,255,0)');
      x.fillStyle = g; x.fillRect(mx - 50, y(110), M.w + 100, 110);
      box(x, mx, y(M.h), M.w, M.h, '#0d1416', 'rgba(' + C + ',.7)');
      box(x, mx + 4, y(M.h - 4), M.w - 8, 42, '#04191b', 'rgba(' + C + ',.35)');
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { x.fillStyle = (r + c) % 3 ? 'rgba(255,136,0,.6)' : 'rgba(255,217,165,.6)'; x.fillRect(mx + 7 + c * 7, y(M.h - 8) + r * 10, 4, 7); }
      box(x, mx + 4, y(30), M.w - 8, 10, '#020606', 'rgba(' + C + ',.35)');
      text(x, 'THIRST', mx + M.w / 2, y(25), 'rgba(' + C + ',' + (0.6 + 0.3 * Math.sin(t * 0.05)) + ')', 7, '600');
      x.fillStyle = '#020303'; x.fillRect(mx + 8, y(12), M.w - 16, 6);
    }

    const K = L.counter, kx = sx(K.x);
    if (onScreen(v, kx - 40, K.w + 80)) {
      // a little TV behind the counter, flickering on the keeper's face
      box(x, kx + 120, y(84), 24, 18, '#05090a', 'rgba(' + O + ',.5)');
      x.fillStyle = 'rgba(170,210,255,' + (0.3 + 0.2 * Math.sin(t * 0.3) * Math.sin(t * 0.07)) + ')'; x.fillRect(kx + 123, y(81), 18, 12);
      box(x, kx + 128, y(66), 8, 2, '#2a160a');
      sign(x, t, 'CASH ONLY', kx + 60, y(110), O, { size: 8, phase: 90 });
      x.strokeStyle = 'rgba(' + O + ',.5)'; x.beginPath(); x.moveTo(kx + 30.5, y(L.ceil)); x.lineTo(kx + 30.5, y(116)); x.moveTo(kx + 89.5, y(L.ceil)); x.lineTo(kx + 89.5, y(116)); x.stroke();
      figure(x, sx(L.keeper), y(0), 46, '#0a0504', 0, 'rgba(170,210,255,.45)');
      box(x, kx, y(K.h), K.w, K.h, '#24130a', 'rgba(' + O + ',.85)');
      x.fillStyle = 'rgba(' + O + ',.9)'; x.fillRect(kx, y(K.h), K.w, 2);
      // the till (nothing to hack here yet, so not cyan) and a plate on the counter
      box(x, kx + 20, y(K.h + 12), 22, 12, '#1a120b', 'rgba(' + O + ',.6)');
      x.fillStyle = 'rgba(' + O + ',.7)'; x.fillRect(kx + 23, y(K.h + 9), 14, 2);
      box(x, kx + 76, y(K.h - 6), 48, 14, '#1a120b', 'rgba(' + O + ',.6)');
      text(x, 'NO LOGS', kx + 100, y(K.h - 13), 'rgba(' + PAPER + ',.85)', 7, '600');
    }

    // the floor: worn tiles
    x.fillStyle = '#060403'; x.fillRect(w0, v.gy, w1 - w0, v.viewH - v.gy);
    x.fillStyle = 'rgba(' + O + ',.6)'; x.fillRect(w0, v.gy, w1 - w0, 1);
    for (let r = 0; r < 4; r++) for (let c = 0; c < L.width; c += 24) {
      if ((c / 24 + r) % 2) continue;
      const tx = sx(c) + r * 6;
      if (tx < w0 || tx > w1 - 20) continue;
      x.fillStyle = 'rgba(255,217,165,.04)'; x.fillRect(tx, v.gy + 3 + r * 12, 20, 10);
    }
  },

  drawFront(x, v) {
    // a near rack of crisps at the bottom of the view
    const s = v.sx(250, 1.25), base = v.gy + 56;
    if (!onScreen(v, s, 90)) return;
    box(x, s, base - 34, 90, 34, '#020100', 'rgba(' + O + ',.3)');
    for (let i = 6; i < 84; i += 14) { x.fillStyle = 'rgba(255,136,0,.18)'; x.fillRect(s + i, base - 30, 10, 12); }
  },
};
