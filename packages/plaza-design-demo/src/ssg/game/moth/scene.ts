/**
 * Moth's place on the canvas: flat 4C in an old tenement over Downtown's east
 * end, left in a hurry three days ago.
 *
 * Play band (brightest): the door, the hall table with the mail, the
 * corkboard over the unused fishing rod, the record player on its crate,
 * Moth's rig (three screens, a router on the shelf, tape on every camera),
 * Sprat's tank, Fern in the smart pot under the window, the answering
 * machine, the sofa bed and the takeaway boxes. Middle band (dim): the flat's
 * walls, ceiling and floorboards. Far band (dimmest): the neighbours' flats in
 * cutaway all round, and the street through the window, where a Registry
 * drone goes past now and then, looking in.
 *
 * World units match the street (the player is 42 tall). Where the devices
 * stand for tapping, E and hack vision is moth.json (`layout.spot`); this
 * draws them there.
 */

import type { DrawView } from '../engine/host';
import type { SceneModel } from '../engine/model';
import { box, C, GREEN, O, PAPER, RED, RUST, text, tell } from '../scenes/kit';

/** The flat: 660 wide, 112 high. */
export const MOTH_W = 660;
const CEIL = 112, SLAB = 12, WALL = 8;
/** The door (out to Downtown); you come in just right of it. */
export const MOTH_DOOR_X = 30;
export const MOTH_SPAWN = MOTH_DOOR_X + 22;

/** Furniture, left to right (world x; heights above the floor). */
const L = {
  mail: 84,
  board: { x: 150, y: 30, w: 44, h: 34 },
  rod: 178,
  guitar: 194,
  turntable: 222,
  desk: { x0: 272, x1: 348, h: 28 },
  tank: { x: 402, w: 46, base: 22, h: 24 },
  window: { x0: 442, x1: 516, h0: 42, h1: 100 },
  pot: 478,
  phone: 548,
  sofa: { x0: 586, x1: 650 },
};

/** Stable noise, so the building looks the same on every frame. */
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

const CELL_W = 150, CELL_H = CEIL + SLAB;

/** The tenement round the flat, in cutaway: older, browner and more lived-in than the capsule tower. */
function drawBuilding(x: CanvasRenderingContext2D, v: DrawView) {
  const { sx, y, viewW, viewH, t } = v;
  x.fillStyle = '#040201'; x.fillRect(0, 0, viewW, viewH);
  const left = -sx(0), right = left + viewW;
  const c0 = Math.floor(left / CELL_W) - 1, c1 = Math.ceil(right / CELL_W) + 1;
  for (let k = -1; y(k * CELL_H) > -CELL_H; k++) {
    for (let c = c0; c <= c1; c++) {
      const x0 = c * CELL_W;
      if (k === 0 && x0 + CELL_W > 0 && x0 < MOTH_W) continue;
      const l = sx(x0) + 2, top = y(k * CELL_H + CEIL), w = CELL_W - 4;
      if (l > viewW || l + w < 0) continue;
      const n = hash(c * 23 + k * 97);
      x.fillStyle = n < 0.3 ? '#090504' : '#060302'; x.fillRect(l, top, w, CEIL);
      // brick courses, barely there
      x.fillStyle = 'rgba(' + RUST + ',.05)';
      for (let b = 10; b < CEIL; b += 10) x.fillRect(l, top + b, w, 1);
      x.strokeStyle = 'rgba(' + RUST + ',.12)'; x.lineWidth = 1; x.strokeRect(l + 0.5, top + 0.5, w - 1, CEIL - 1);
      const floor = y(k * CELL_H);
      // who lives there: a table, a bed, a television's flicker, a lamp
      x.fillStyle = 'rgba(' + RUST + ',.09)'; x.fillRect(l + 10 + Math.floor(n * 50), floor - 14, 40, 14);
      if (n < 0.35) {
        const gx = l + 60 + Math.floor(n * 120) % 60, g = x.createRadialGradient(gx, floor - 50, 1, gx, floor - 50, 46);
        g.addColorStop(0, 'rgba(255,170,90,.07)'); g.addColorStop(1, 'rgba(255,170,90,0)');
        x.fillStyle = g; x.fillRect(l, top, w, CEIL);
        x.fillStyle = 'rgba(255,217,165,.25)'; x.fillRect(gx - 1, top + 12, 2, 3);
      } else if (n > 0.75) {
        x.fillStyle = 'rgba(150,170,220,' + (0.05 + 0.04 * Math.sin(t * 0.07 + n * 9)) + ')'; x.fillRect(l + 96, floor - 34, 20, 13);
      }
    }
    x.fillStyle = '#0b0604'; x.fillRect(0, y(k * CELL_H), viewW, SLAB);
    x.fillStyle = 'rgba(' + RUST + ',.2)'; x.fillRect(0, y(k * CELL_H), viewW, 1);
  }
}

/** The street through the window: rain, the block across the road, a sign, and now and then a Registry drone looking in. */
function drawOutside(x: CanvasRenderingContext2D, l: number, top: number, w: number, h: number, t: number) {
  x.save();
  x.beginPath(); x.rect(l, top, w, h); x.clip();
  const sky = x.createLinearGradient(0, top, 0, top + h);
  sky.addColorStop(0, '#07060f'); sky.addColorStop(1, '#1a0d12');
  x.fillStyle = sky; x.fillRect(l, top, w, h);
  // the block across the road: a wall of windows, some lit
  x.fillStyle = '#0d0709'; x.fillRect(l, top + 8, w, h - 8);
  for (let yy = top + 12; yy < top + h - 4; yy += 9) for (let xx = l + 3; xx < l + w - 4; xx += 8) {
    const n = hash(xx * 7 + yy * 3);
    if (n < 0.3) { x.fillStyle = n < 0.08 ? 'rgba(150,170,220,.35)' : 'rgba(255,170,90,.4)'; x.fillRect(xx, yy, 4, 5); }
    else { x.fillStyle = 'rgba(' + RUST + ',.12)'; x.fillRect(xx, yy, 4, 5); }
  }
  // a pharmacy cross on the block's corner, on its bracket
  const px = l + w - 14, py = top + 20;
  x.fillStyle = 'rgba(' + O + ',.4)'; x.fillRect(px + 5, py - 1, 6, 1);
  x.fillStyle = 'rgba(' + GREEN + ',' + (0.55 + 0.25 * Math.sin(t * 0.06)) + ')'; x.fillRect(px - 1, py - 4, 3, 9); x.fillRect(px - 4, py - 1, 9, 3);
  // a Registry drone drifts past, every so often, its red eye sweeping the windows
  const cyc = (t % 900) / 900;
  if (cyc < 0.3) {
    const dx = l - 10 + (w + 20) * (cyc / 0.3), dy = top + 26 + Math.sin(t * 0.08) * 2;
    x.fillStyle = '#1b1b22'; x.fillRect(Math.round(dx) - 5, Math.round(dy), 10, 3);
    x.fillStyle = 'rgba(160,160,180,.6)'; x.fillRect(Math.round(dx) - 7, Math.round(dy) - 1, 3, 1); x.fillRect(Math.round(dx) + 4, Math.round(dy) - 1, 3, 1);
    x.fillStyle = 'rgba(' + RED + ',.95)'; x.fillRect(Math.round(dx) - 1, Math.round(dy) + 3, 2, 2);
    const g = x.createLinearGradient(0, dy + 4, 0, dy + 40);
    g.addColorStop(0, 'rgba(255,42,68,.22)'); g.addColorStop(1, 'rgba(255,42,68,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(dx - 1, dy + 4); x.lineTo(dx + 1, dy + 4); x.lineTo(dx + 12, dy + 40); x.lineTo(dx - 12, dy + 40); x.closePath(); x.fill();
  }
  // rain on the glass
  x.strokeStyle = 'rgba(170,200,255,.22)';
  for (let i = 0; i < 14; i++) {
    const rx = l + ((hash(i) * w + t * 0.4 * (0.6 + hash(i + 9))) % w), ry = top + ((hash(i + 3) * h + t * 1.6) % h);
    x.beginPath(); x.moveTo(rx, ry); x.lineTo(rx - 1, ry + 5); x.stroke();
  }
  x.restore();
}

/** Draw the flat and everything around it. `hover`: the device under the pointer. */
export function drawMoth(x: CanvasRenderingContext2D, m: SceneModel, v: DrawView, hover: string | null) {
  const { sx, y, t } = v, gy = y(0);
  drawBuilding(x, v);
  const glow = (id: string, x0: number, top: number, w: number, h: number) => {
    if (hover !== id) return;
    x.save(); x.strokeStyle = 'rgba(255,61,242,.85)'; x.shadowColor = 'rgba(255,61,242,.8)'; x.shadowBlur = 8;
    x.strokeRect(x0 - 3.5, top - 3.5, w + 7, h + 7); x.restore();
  };

  // ---------- the flat's shell (middle band) ----------
  const fl = sx(0), fr = sx(MOTH_W), top = y(CEIL);
  x.fillStyle = '#1a0f09'; x.fillRect(fl, top, fr - fl, CEIL);
  // old wallpaper: thin stripes, a lighter patch where a cabinet used to be
  x.fillStyle = 'rgba(' + O + ',.035)';
  for (let wx = WALL + 12; wx < MOTH_W - WALL; wx += 12) x.fillRect(sx(wx), top, 1, CEIL - 6);
  x.fillStyle = 'rgba(' + PAPER + ',.025)'; x.fillRect(sx(560), y(96), 34, 40);
  x.fillStyle = '#1d1009'; x.fillRect(fl, y(6), fr - fl, 6); x.fillStyle = 'rgba(' + O + ',.25)'; x.fillRect(fl, y(6), fr - fl, 1);
  // the ceiling, one bare bulb on a flex in the middle, and the smoke alarm Moth taped over
  x.fillStyle = '#0e0805'; x.fillRect(fl, y(CEIL + SLAB), fr - fl, SLAB);
  x.fillStyle = 'rgba(' + O + ',.45)'; x.fillRect(fl, top, fr - fl, 1);
  const bulb = sx(360);
  x.fillStyle = 'rgba(' + PAPER + ',.35)'; x.fillRect(bulb, top + 1, 1, 12);
  x.fillStyle = 'rgba(255,217,165,.9)'; x.fillRect(bulb - 2, top + 13, 5, 4);
  const lg = x.createRadialGradient(bulb, top + 16, 2, bulb, top + 40, 190);
  lg.addColorStop(0, 'rgba(255,190,120,.13)'); lg.addColorStop(1, 'rgba(255,190,120,0)');
  x.fillStyle = lg; x.fillRect(fl, top, fr - fl, CEIL);
  const smoke = sx(240);
  box(x, smoke - 6, top + 1, 12, 4, '#d8d0c0', undefined);
  x.strokeStyle = 'rgba(80,60,40,.9)'; x.beginPath(); x.moveTo(smoke - 7, top + 1); x.lineTo(smoke + 7, top + 6); x.moveTo(smoke + 7, top + 1); x.lineTo(smoke - 7, top + 6); x.stroke();
  // side walls, edge-on
  x.fillStyle = '#0a0604'; x.fillRect(fl, top, WALL, CEIL); x.fillRect(fr - WALL, top, WALL, CEIL);
  x.fillStyle = 'rgba(' + O + ',.4)'; x.fillRect(fl + WALL - 1, top, 1, CEIL); x.fillRect(fr - WALL, top, 1, CEIL);
  // floorboards, then the near strip in front of the play band
  x.fillStyle = '#0b0604'; x.fillRect(fl, gy, fr - fl, v.viewH - gy);
  x.fillStyle = 'rgba(' + O + ',.55)'; x.fillRect(fl, gy, fr - fl, 1);
  x.fillStyle = 'rgba(' + O + ',.08)'; for (let i = 1; i < 4; i++) x.fillRect(fl, gy + i * 5 + i * i, fr - fl, 1);
  x.fillStyle = 'rgba(' + O + ',.06)'; for (let bx = 40; bx < MOTH_W; bx += 46) x.fillRect(sx(bx), gy + 1, 1, 6);
  x.strokeStyle = 'rgba(' + O + ',.5)'; x.strokeRect(fl - 0.5, y(CEIL + SLAB) - 0.5, fr - fl + 1, CEIL + SLAB + 1);

  // ---------- the window and the street ----------
  const W0 = L.window, wl = sx(W0.x0), ww = W0.x1 - W0.x0, wt = y(W0.h1), wh = W0.h1 - W0.h0;
  box(x, wl - 3, wt - 3, ww + 6, wh + 6, '#1a0e07', 'rgba(' + O + ',.6)');
  drawOutside(x, wl, wt, ww, wh, t);
  x.fillStyle = '#1a0e07'; x.fillRect(wl + ww / 2 - 1, wt, 2, wh);
  // the sill, with a plant that did not make it
  x.fillStyle = 'rgba(' + O + ',.7)'; x.fillRect(wl - 5, y(W0.h0) , ww + 10, 2);
  box(x, wl + 6, y(W0.h0 + 7), 8, 7, '#3a2216', 'rgba(' + O + ',.5)');
  x.strokeStyle = 'rgba(150,110,60,.6)'; x.beginPath(); x.moveTo(wl + 10, y(W0.h0 + 7)); x.lineTo(wl + 8, y(W0.h0 + 15)); x.lineTo(wl + 4, y(W0.h0 + 13)); x.stroke();
  // the street's light on the floor under the window
  x.fillStyle = 'rgba(150,160,220,.05)'; x.fillRect(wl - 6, gy - 1, ww + 12, 2);
  // while the drone goes past, its red scan comes in through the glass and crosses the floor
  const cyc = (t % 900) / 900;
  if (cyc < 0.3) {
    const f = cyc / 0.3, bx = wl + ww * f, a = 0.1 * Math.sin(f * Math.PI);
    x.fillStyle = 'rgba(255,42,68,' + a + ')';
    x.beginPath(); x.moveTo(bx - 4, wt + wh); x.lineTo(bx + 4, wt + wh); x.lineTo(bx - 30 + f * 20, gy); x.lineTo(bx - 70 + f * 20, gy); x.closePath(); x.fill();
  }

  // ---------- string lights along the top of the wall: Moth's one concession to cosy ----------
  for (let i = 0; i < 22; i++) {
    const lx = 372 + i * 12.5, sag = Math.sin(((i % 7) / 6) * Math.PI) * 6, ly = y(CEIL - 6 - sag);
    if (i) { x.strokeStyle = 'rgba(' + PAPER + ',.18)'; x.beginPath(); x.moveTo(sx(lx - 12.5), y(CEIL - 6 - Math.sin((((i - 1) % 7) / 6) * Math.PI) * 6)); x.lineTo(sx(lx), ly); x.stroke(); }
    const on = 0.45 + 0.35 * Math.sin(t * 0.03 + i * 1.7);
    x.fillStyle = 'rgba(255,200,120,' + on + ')'; x.fillRect(sx(lx), ly, 2, 2);
  }

  // ---------- the flat's resident panel: every flat has one, and it is always counting ----------
  const rp = sx(96), rpt = y(64);
  x.fillStyle = 'rgba(' + PAPER + ',.2)'; x.fillRect(rp, y(CEIL), 1, CEIL - 64);
  box(x, rp - 30, rpt, 60, 18, '#0b0808', 'rgba(' + PAPER + ',.45)');
  const hrs = 72 + Math.floor(t / 3600), mins = Math.floor(t / 60) % 60;
  const lines = Math.floor(t / 180) % 2 ? ['RESIDENT 4C', 'NOT VERIFIED'] : ['LAST SEEN', hrs + ':' + String(mins).padStart(2, '0') + ' H AGO'];
  text(x, lines[0], rp, rpt + 5.5, 'rgba(' + PAPER + ',.75)', 7);
  text(x, lines[1], rp, rpt + 12.5, 'rgba(' + RED + ',.85)', 7, '600');

  // ---------- a calendar by the rig, one day circled, a moth drawn in the corner ----------
  const cl = sx(248);
  box(x, cl, y(88), 15, 20, 'rgba(240,232,216,.8)', undefined);
  x.fillStyle = 'rgba(' + RED + ',.7)'; x.fillRect(cl, y(88), 15, 4);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { x.fillStyle = 'rgba(60,40,20,.45)'; x.fillRect(cl + 2 + c * 3, y(82) + r * 3, 2, 1); }
  x.strokeStyle = 'rgba(' + RED + ',.9)'; x.strokeRect(cl + 7.5, y(79) + 0.5, 4, 3);

  // ---------- a shelf of books over the answering machine ----------
  const bs = sx(528);
  x.fillStyle = 'rgba(' + O + ',.7)'; x.fillRect(bs, y(66), 44, 2);
  [[2, 12, '#5a2a2a'], [6, 14, '#2a3a5a'], [10, 11, '#4a4a2a'], [14, 13, '#2a4a3a'], [18, 9, '#5a3a1a'], [22, 14, '#3a2a4a']].forEach(([ox, hh, col]) => {
    box(x, bs + (ox as number), y(66 + (hh as number)), 4, hh as number, col as string, 'rgba(' + PAPER + ',.25)');
  });
  x.save(); x.translate(bs + 32, y(67)); x.rotate(-0.35); box(x, 0, -12, 4, 12, '#5a4a3a', 'rgba(' + PAPER + ',.25)'); x.restore();

  // ---------- the door, its three locks, and the way out ----------
  const dx = sx(MOTH_DOOR_X);
  box(x, dx - 16, y(58), 32, 58, '#020100', 'rgba(' + O + ',.75)');
  box(x, dx - 13, y(55), 26, 55, '#2a170c', 'rgba(' + O + ',.5)');
  x.fillStyle = 'rgba(' + O + ',.15)'; x.fillRect(dx - 10, y(50), 20, 18); x.fillRect(dx - 10, y(27), 20, 18);
  for (const h of [40, 33, 26]) { x.fillStyle = 'rgba(' + PAPER + ',.6)'; x.fillRect(dx + 8, y(h), 3, 2); }
  x.strokeStyle = 'rgba(' + PAPER + ',.45)'; x.beginPath(); x.moveTo(dx + 9, y(44)); x.quadraticCurveTo(dx + 4, y(40), dx + 9, y(36)); x.stroke();
  box(x, dx - 7, y(64), 14, 8, '#0d0805', 'rgba(' + PAPER + ',.45)');
  text(x, '4C', dx, y(60), 'rgba(' + PAPER + ',.85)', 7, '600');
  // the exit plate over it, so the way out reads at a glance
  box(x, dx - 22, y(80), 44, 11, '#04100f', 'rgba(' + C + ',.6)');
  text(x, '< STREET', dx, y(74.5), 'rgba(' + C + ',.95)', 7, '600');

  // ---------- the hall table and three days of mail ----------
  const mx = sx(L.mail);
  box(x, mx - 14, y(22), 28, 3, '#3a2214', 'rgba(' + O + ',.8)');
  x.fillStyle = '#1e110a'; x.fillRect(mx - 12, y(19), 3, 19); x.fillRect(mx + 9, y(19), 3, 19);
  // letters in a heap, and the notice on top: white, with a red stamp
  [[-9, 0.4], [-3, 0.3], [2, 0.35]].forEach(([ox, a]) => { x.fillStyle = 'rgba(' + PAPER + ',' + a + ')'; x.fillRect(mx + ox, y(25), 8, 3); });
  box(x, mx - 4, y(29), 11, 5, '#e8e2d8', undefined);
  x.fillStyle = 'rgba(' + RED + ',.85)'; x.fillRect(mx + 3, y(28), 3, 2);
  x.fillStyle = 'rgba(60,40,20,.6)'; x.fillRect(mx - 2, y(27), 4, 1);
  // a bowl of keys that open nothing (anymore)
  box(x, mx - 13, y(26), 7, 3, '#2a1a10', 'rgba(' + O + ',.5)');
  tell(x, t, mx + 11, y(14), 1);
  glow('mail', mx - 14, y(30), 28, 30);

  // ---------- the corkboard, and the fishing rod that never went fishing ----------
  const b = L.board, bl = sx(b.x - b.w / 2), bt = y(b.y + b.h);
  box(x, bl, bt, b.w, b.h, '#3a2412', 'rgba(' + O + ',.75)');
  x.fillStyle = 'rgba(' + O + ',.12)'; for (let i = 0; i < 9; i++) x.fillRect(bl + 3 + Math.floor(hash(i) * (b.w - 6)), bt + 3 + Math.floor(hash(i + 4) * (b.h - 6)), 1, 1);
  // the photo: two people at a counter, a warm light
  box(x, bl + 4, bt + 4, 14, 12, '#e8dcc4', undefined);
  x.fillStyle = '#5a3a24'; x.fillRect(bl + 5, bt + 5, 12, 8);
  x.fillStyle = 'rgba(255,190,110,.8)'; x.fillRect(bl + 6, bt + 6, 10, 2);
  x.fillStyle = '#1a1010'; x.fillRect(bl + 7, bt + 9, 3, 4); x.fillRect(bl + 12, bt + 9, 3, 4);
  // the list, items ticked and not
  box(x, bl + 22, bt + 3, 12, 17, 'rgba(255,233,200,.85)', undefined);
  for (let i = 0; i < 5; i++) { x.fillStyle = 'rgba(60,30,10,.7)'; x.fillRect(bl + 24, bt + 6 + i * 3, 7, 1); x.fillStyle = i < 2 ? 'rgba(' + RED + ',.6)' : 'rgba(' + GREEN + ',.7)'; x.fillRect(bl + 32, bt + 6 + i * 3, 1, 1); }
  // the receipt, long and curling
  box(x, bl + 36, bt + 6, 5, 20, 'rgba(240,236,228,.75)', undefined);
  for (const [px, py] of [[bl + 10, bt + 3], [bl + 28, bt + 2], [bl + 38, bt + 5]]) { x.fillStyle = 'rgba(' + RED + ',.9)'; x.fillRect(px, py, 2, 2); }
  tell(x, t, bl + b.w - 4, bt + b.h - 3, 2);
  glow('board', bl, bt, b.w, b.h);
  // the rod: leaning on the wall below, still in its plastic, the tag on the reel
  const rx = sx(L.rod);
  x.strokeStyle = 'rgba(' + PAPER + ',.55)'; x.lineWidth = 2; x.beginPath(); x.moveTo(rx - 4, gy); x.lineTo(rx + 6, y(86)); x.stroke(); x.lineWidth = 1;
  x.strokeStyle = 'rgba(200,220,255,.25)'; x.strokeRect(rx - 6.5, y(40) + 0.5, 9, 38);
  box(x, rx - 4, y(18), 6, 6, '#2a2a30', 'rgba(' + PAPER + ',.5)');
  x.fillStyle = 'rgba(255,233,200,.85)'; x.fillRect(rx + 2, y(16), 4, 3);

  // ---------- the guitar on the wall (it sang the song, once) ----------
  const gx = sx(L.guitar);
  // the hook, the headstock and its pegs, the neck, then the body: two round bouts and a sound hole
  x.fillStyle = 'rgba(' + PAPER + ',.6)'; x.fillRect(gx - 1, y(100), 3, 2);
  box(x, gx - 2, y(98), 5, 7, '#3a200e', 'rgba(' + O + ',.6)');
  x.fillStyle = 'rgba(' + PAPER + ',.55)'; for (const py of [96, 93]) { x.fillRect(gx - 4, y(py), 2, 1); x.fillRect(gx + 3, y(py), 2, 1); }
  x.fillStyle = '#5a3418'; x.fillRect(gx - 1, y(91), 3, 22);
  x.fillStyle = 'rgba(' + PAPER + ',.35)'; for (let f = 0; f < 5; f++) x.fillRect(gx - 1, y(88 - f * 4), 3, 1);
  const bout = (cy: number, r: number) => { x.beginPath(); x.ellipse(gx + 0.5, y(cy), r, r * 0.9, 0, 0, Math.PI * 2); x.fill(); x.stroke(); };
  x.fillStyle = '#8a4e24'; x.strokeStyle = 'rgba(' + O + ',.75)';
  bout(56, 9); bout(67, 7);
  x.fillStyle = '#140a05'; x.beginPath(); x.arc(gx + 0.5, y(63), 2.5, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#2a160a'; x.fillRect(gx - 3, y(53), 7, 2);
  x.fillStyle = 'rgba(' + PAPER + ',.35)'; x.fillRect(gx, y(91), 1, 38);

  // ---------- the record player on its crate ----------
  const tx = sx(L.turntable), next = m.clocks.next('turntable.record'), beat = next ? 1 - next.ms / 2000 : 0;
  box(x, tx - 15, y(22), 30, 22, '#3a2414', 'rgba(' + O + ',.7)');
  x.fillStyle = 'rgba(' + O + ',.25)'; x.fillRect(tx - 15, y(11), 30, 1); x.fillRect(tx - 1, y(21), 2, 20);
  // records in the crate, spines out
  for (let i = 0; i < 6; i++) { x.fillStyle = ['#1a1a2a', '#3a1a1a', '#1a2a1a', '#2a2a1a'][i % 4]; x.fillRect(tx - 13 + i * 2, y(20), 1, 8); }
  box(x, tx - 14, y(30), 28, 8, '#14100c', 'rgba(' + PAPER + ',.55)');
  // the record turning: a dark disc with a light label and a glint that goes round
  x.fillStyle = '#050505'; x.fillRect(tx - 10, y(33), 16, 3);
  x.fillStyle = 'rgba(' + RED + ',.8)'; x.fillRect(tx - 3, y(33), 3, 2);
  const spin = (t * 0.25) % 16;
  if (next) { x.fillStyle = 'rgba(' + PAPER + ',.6)'; x.fillRect(tx - 10 + Math.floor(spin), y(33), 1, 1); }
  // the tonearm, and the cyan tell on its deck
  x.strokeStyle = 'rgba(' + PAPER + ',.7)'; x.beginPath(); x.moveTo(tx + 10, y(36)); x.lineTo(tx + 9, y(34)); x.lineTo(tx + 3, y(33)); x.stroke();
  tell(x, t, tx + 10, y(26), 3);
  // notes rising with the beat while it plays
  if (next && beat > 0 && beat < 0.6) {
    const a = 0.8 * (1 - beat / 0.6);
    text(x, '♪', tx - 4 + beat * 6, y(40 + beat * 26), 'rgba(' + PAPER + ',' + a + ')', 8);
    text(x, '♪', tx + 6 - beat * 4, y(44 + beat * 20), 'rgba(' + PAPER + ',' + a * 0.7 + ')', 7);
  }
  glow('turntable', tx - 15, y(38), 30, 38);

  // ---------- Moth's rig: the desk, three screens, the router on the shelf ----------
  const d = L.desk, dl = sx(d.x0), dw = d.x1 - d.x0, dc = dl + dw / 2;
  const sg = x.createRadialGradient(dc, y(48), 2, dc, y(48), 90);
  sg.addColorStop(0, 'rgba(0,255,255,.08)'); sg.addColorStop(1, 'rgba(0,255,255,0)');
  x.fillStyle = sg; x.fillRect(dc - 90, y(120), 180, 120);
  // the shelf and the router, lights blinking, cables hanging down behind the desk
  x.fillStyle = 'rgba(' + O + ',.7)'; x.fillRect(dl + 6, y(80), dw - 12, 2);
  box(x, dl + 12, y(86), 18, 6, '#1a1c22', 'rgba(' + PAPER + ',.5)');
  for (let i = 0; i < 3; i++) { x.fillStyle = (Math.floor(t / 7) + i * 2) % 5 < 3 ? 'rgba(' + C + ',.9)' : 'rgba(' + C + ',.25)'; x.fillRect(dl + 15 + i * 4, y(84), 2, 1); }
  x.strokeStyle = 'rgba(' + PAPER + ',.25)';
  for (const [ox, sag] of [[16, 10], [24, 18], [50, 8]]) { x.beginPath(); x.moveTo(dl + ox, y(80)); x.quadraticCurveTo(dl + ox + 6, y(80 - sag * 2), dl + ox + 2, y(d.h + 2)); x.stroke(); }
  // a little box of tape rolls on the shelf
  box(x, dl + 46, y(86), 12, 6, '#2a1a10', 'rgba(' + O + ',.5)');
  // the desk
  x.fillStyle = 'rgba(' + O + ',.8)'; x.fillRect(dl, y(d.h), dw, 3);
  x.fillStyle = '#1e120a'; x.fillRect(dl, y(d.h) + 3, dw, 4);
  x.fillStyle = '#1a0e07'; x.fillRect(dl + 2, y(d.h - 7), 3, d.h - 7); x.fillRect(dl + dw - 5, y(d.h - 7), 3, d.h - 7);
  // three screens: the middle one says no, the side ones scroll Moth's last logs
  const screen = (cx: number, w: number, h: number, base: number, kind: 'lock' | 'log') => {
    box(x, cx - w / 2, y(base + h), w, h, '#0b1012', 'rgba(' + C + ',.7)');
    x.fillStyle = 'rgba(0,255,255,.1)'; x.fillRect(cx - w / 2 + 2, y(base + h - 2), w - 4, h - 4);
    if (kind === 'lock') {
      x.fillStyle = 'rgba(' + RED + ',.8)'; x.fillRect(cx - 3, y(base + h - 5), 6, 4);
      x.fillStyle = 'rgba(0,255,255,.55)'; x.fillRect(cx - w / 2 + 4, y(base + 7), w - 8, 1); x.fillRect(cx - w / 2 + 6, y(base + 4), w - 12, 1);
    } else {
      const off = Math.floor(t / 20);
      for (let i = 0; i < Math.floor((h - 4) / 3); i++) { x.fillStyle = 'rgba(0,255,255,.4)'; x.fillRect(cx - w / 2 + 3, y(base + h - 4) + i * 3, 3 + Math.floor(hash(i + off) * (w - 8)), 1); }
    }
    x.fillStyle = '#1a1410'; x.fillRect(cx - 2, y(base), 4, base - d.h);
  };
  screen(dc - 22, 18, 14, d.h + 8, 'log');
  screen(dc, 24, 18, d.h + 6, 'lock');
  screen(dc + 22, 18, 14, d.h + 8, 'log');
  // the webcam on top, taped over (and the spare beside it, also taped)
  box(x, dc - 3, y(d.h + 27), 6, 3, '#14100c', undefined);
  x.fillStyle = 'rgba(220,200,150,.85)'; x.fillRect(dc - 4, y(d.h + 26), 8, 2);
  x.fillStyle = 'rgba(220,200,150,.7)'; x.fillRect(dc + 30, y(d.h + 23), 5, 2);
  // keyboard, a mug, takeaway boxes stacked at the end
  box(x, dc - 12, y(d.h + 3), 24, 3, '#14100c', 'rgba(' + PAPER + ',.35)');
  box(x, dl + 4, y(d.h + 7), 5, 6, '#6a5a4a', 'rgba(' + PAPER + ',.4)');
  box(x, dl + dw - 13, y(d.h + 7), 10, 7, '#d8ccb4', 'rgba(' + PAPER + ',.5)');
  box(x, dl + dw - 12, y(d.h + 12), 9, 5, '#cfc2a8', 'rgba(' + PAPER + ',.5)');
  x.fillStyle = 'rgba(' + RED + ',.7)'; x.fillRect(dl + dw - 9, y(d.h + 5), 3, 1);
  // the chair, pushed back in a hurry
  const ch = dc + 8;
  x.fillStyle = '#1a0e07'; x.fillRect(ch - 8, y(16), 16, 3); x.fillRect(ch - 1, y(13), 3, 13); x.fillRect(ch + 7, y(34), 3, 20);
  x.fillStyle = 'rgba(' + O + ',.45)'; x.fillRect(ch - 8, y(16), 16, 1); x.fillRect(ch + 7, y(34), 1, 18);
  tell(x, t, dl + dw - 6, y(d.h - 3), 4);
  glow('desk', dl, y(62), dw, 62);

  // ---------- Sprat's tank on its cabinet ----------
  const k = L.tank, kl = sx(k.x - k.w / 2), fed = !!m.get('fed');
  box(x, kl + 2, y(k.base), k.w - 4, k.base, '#24160c', 'rgba(' + O + ',.6)');
  x.fillStyle = 'rgba(' + O + ',.3)'; x.fillRect(kl + k.w / 2, y(k.base - 3), 1, k.base - 6);
  // the water: lit from the lid
  const wt0 = y(k.base + k.h);
  box(x, kl, wt0, k.w, k.h, 'rgba(40,90,110,.35)', 'rgba(170,220,255,.55)');
  x.fillStyle = 'rgba(120,200,220,.15)'; x.fillRect(kl + 1, wt0 + 3, k.w - 2, 1);
  x.fillStyle = 'rgba(' + GREEN + ',.45)'; for (const [ox, hh] of [[6, 10], [9, 14], [36, 8]]) x.fillRect(kl + ox, y(k.base + hh), 1, hh);
  x.fillStyle = 'rgba(' + PAPER + ',.25)'; x.fillRect(kl + 2, y(k.base + 2), k.w - 4, 2);
  // Sprat: a small orange fish doing laps (faster once fed)
  const lap = (t * (fed ? 0.35 : 0.18)) % ((k.w - 12) * 2), fxp = lap < k.w - 12 ? lap : (k.w - 12) * 2 - lap, fdir = lap < k.w - 12 ? 1 : -1;
  const fy = y(k.base + 10 + Math.sin(t * 0.05) * 3);
  x.fillStyle = 'rgba(255,140,40,.95)'; x.fillRect(kl + 6 + fxp, fy, 5, 3);
  x.fillRect(kl + 6 + fxp + (fdir > 0 ? -2 : 5), fy - 1 + (Math.floor(t / 8) % 2), 2, 3);
  x.fillStyle = '#000'; x.fillRect(kl + 6 + fxp + (fdir > 0 ? 3 : 1), fy, 1, 1);
  // bubbles
  for (let i = 0; i < 3; i++) { const by = ((t * 0.3 + i * 8) % (k.h - 4)); x.fillStyle = 'rgba(200,240,255,.5)'; x.fillRect(kl + k.w - 8 + (i % 2), y(k.base + 2 + by), 1, 1); }
  // the lid and its heat lamp: warm, a little glow on the wall above it
  box(x, kl - 1, wt0 - 4, k.w + 2, 4, '#3a2a1a', 'rgba(' + O + ',.7)');
  const hg = x.createRadialGradient(sx(k.x), wt0 - 2, 1, sx(k.x), wt0 - 4, 30);
  hg.addColorStop(0, 'rgba(255,150,60,.16)'); hg.addColorStop(1, 'rgba(255,150,60,0)');
  x.fillStyle = hg; x.fillRect(kl - 10, wt0 - 34, k.w + 20, 34);
  // the feeder on the lid's corner, its cyan tell
  box(x, kl + k.w - 10, wt0 - 9, 8, 5, '#202024', 'rgba(' + C + ',.6)');
  tell(x, t, kl + k.w - 6, wt0 - 7, 5);
  glow('tank', kl, wt0 - 9, k.w, k.base + k.h + 9);

  // ---------- Fern, in the smart pot under the window ----------
  const ptx = sx(L.pot), wet = m.get('fern') === 'wet';
  box(x, ptx - 8, y(13), 16, 13, '#2a2a30', 'rgba(' + PAPER + ',.5)');
  x.fillStyle = wet ? 'rgba(' + GREEN + ',.95)' : 'rgba(' + RED + ',.8)'; x.fillRect(ptx - 1, y(6), 3, 2);
  tell(x, t, ptx + 5, y(4), 6);
  const leaf = wet ? 'rgba(80,190,90,.85)' : 'rgba(150,120,50,.75)';
  x.strokeStyle = leaf; x.lineWidth = 1.5;
  for (const [ang, len] of [[-0.6, 16], [-0.2, 20], [0.25, 18], [0.6, 14]]) {
    const droop = wet ? 0 : 0.9;
    x.beginPath(); x.moveTo(ptx, y(13));
    x.quadraticCurveTo(ptx + ang * len * 0.6, y(13 + len * (1 - droop * 0.4)), ptx + ang * len * (1 + droop * 0.5), y(13 + len * (1 - droop)));
    x.stroke();
  }
  x.lineWidth = 1;
  glow('pot', ptx - 10, y(34), 20, 34);

  // ---------- the answering machine on its side table ----------
  const phx = sx(L.phone), fresh = m.get('tape') === 0;
  box(x, phx - 11, y(22), 22, 3, '#3a2214', 'rgba(' + O + ',.8)');
  x.fillStyle = '#1e110a'; x.fillRect(phx - 9, y(19), 3, 19); x.fillRect(phx + 6, y(19), 3, 19);
  box(x, phx - 10, y(29), 20, 7, '#1a1a20', 'rgba(' + PAPER + ',.55)');
  box(x, phx - 8, y(34), 9, 5, '#242430', 'rgba(' + PAPER + ',.45)');
  x.strokeStyle = 'rgba(' + PAPER + ',.35)'; x.beginPath(); x.moveTo(phx - 8, y(31)); x.quadraticCurveTo(phx - 16, y(20), phx - 10, y(8)); x.stroke();
  // the message count: red while one is waiting
  x.fillStyle = fresh ? (Math.floor(t / 30) % 2 ? 'rgba(' + RED + ',.95)' : 'rgba(' + RED + ',.35)') : 'rgba(' + GREEN + ',.6)';
  x.fillRect(phx + 3, y(27), 4, 3);
  tell(x, t, phx + 6, y(32), 7);
  glow('phone', phx - 11, y(36), 22, 36);

  // ---------- the sofa bed, the takeaway boxes, the karaoke flyer ----------
  const s = L.sofa, sl = sx(s.x0), sw = s.x1 - s.x0;
  box(x, sl, y(16), sw, 16, '#2a1a24', 'rgba(' + O + ',.55)');
  box(x, sl, y(30), 8, 14, '#2a1a24', 'rgba(' + O + ',.55)');
  box(x, sl + 2, y(22), sw - 6, 7, '#4a3a5a', 'rgba(' + PAPER + ',.3)');
  box(x, sl + sw - 18, y(26), 14, 5, '#d8c8b0', undefined);
  x.fillStyle = 'rgba(' + PAPER + ',.12)'; for (let i = 6; i < sw - 20; i += 7) x.fillRect(sl + i, y(21), 3, 5);
  for (const [ox, w0, h0, col] of [[-22, 10, 6, '#d8ccb4'], [-20, 9, 5, '#cfc2a8'], [-12, 12, 3, '#b08a5a']] as [number, number, number, string][]) {
    const stack = ox === -20 ? 6 : 0;
    box(x, sl + ox, y(h0 + stack), w0, h0, col, 'rgba(' + PAPER + ',.45)');
  }
  // the flyer, pinned over the sofa
  const fx = sl + sw / 2;
  box(x, fx - 22, y(84), 44, 22, '#1a120b', 'rgba(' + O + ',.6)');
  text(x, 'KARAOKE', fx, y(78), 'rgba(' + PAPER + ',.85)', 7, '600');
  text(x, 'BOOTH 3 · THU', fx, y(69), 'rgba(' + PAPER + ',.55)', 7);
  x.fillStyle = 'rgba(' + RED + ',.9)'; x.fillRect(fx - 1, y(85), 2, 2);
}
