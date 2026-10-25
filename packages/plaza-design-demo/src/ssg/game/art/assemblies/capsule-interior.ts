/** Extracted artwork. Scene-owned layout, actors and visual inputs are supplied explicitly. */
import type { View as DrawView } from "../core/view";
import { type Light,rel } from "../../world/light";
import { box,C,GREEN,O,PAPER,RED,RUST,tell,text } from "../core/primitives";
import { paperSign } from '../signage/kit';
import { drawPane,glass,windowShaft } from "../environment/sky";
export interface ArtworkInputs { originX?: number; ceiling?: number; slab?: number; wall?: number; posterX?: number; CAPSULE_W: number;
CAPSULE_FACING: number;
L: { lock: number; fridge: { x: number; w: number; h: number; }; counter: { x0: number; x1: number; h: number; }; kettle: number; window: { x: number; w: number; h0: number; h1: number; }; desk: { x0: number; x1: number; h: number; }; pc: number; plug: number; router: number; bed: { x0: number; x1: number; }; sun: { x0: number; x1: number; }; };
DOOR_X: number }
export interface CapsuleVisualState { hover: string; plugOn: boolean; up: boolean; sun: boolean; open: boolean; hot: boolean; temp: number; steam: boolean; pixelAt: string }
function glow(x: CanvasRenderingContext2D, hover: string, id: string, x0: number, top: number, w: number, h: number) {
  if (hover !== id) return;
  x.save(); x.strokeStyle = 'rgba(255,61,242,.85)'; x.shadowColor = 'rgba(255,61,242,.8)'; x.shadowBlur = 8;
  x.strokeRect(x0 - 3.5, top - 3.5, w + 7, h + 7); x.restore();
}
export function createCapsuleInteriorArtwork(inputs: ArtworkInputs) {
const { CAPSULE_W, CAPSULE_FACING, L, DOOR_X } = inputs;

const CEIL = inputs.ceiling ?? 104, SLAB = inputs.slab ?? 12, WALL = inputs.wall ?? 8, originX = inputs.originX ?? 0;


/** Stable noise, so the tower looks the same on every frame. */
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };


const CELL_W = 130, CELL_H = CEIL + SLAB;


/**
 * Everything around the flat: the neighbours' capsules in cutaway (to the
 * sides, above, and the tops of the ones below), on every row the view
 * reaches. Far band: dark cells, dim rims, a few warm lights, nothing cyan.
 */
function drawTower(x: CanvasRenderingContext2D, v: DrawView) {
  const { sx, y, viewW, viewH, t } = v;
  x.fillStyle = '#030201'; x.fillRect(0, 0, viewW, viewH);
  const left = -sx(0), right = left + viewW;
  const c0 = Math.floor(left / CELL_W) - 1, c1 = Math.ceil(right / CELL_W) + 1;
  // rows from the one below (k = -1) up past the top of the view
  for (let k = -1; y(k * CELL_H) > -CELL_H; k++) {
    for (let c = c0; c <= c1; c++) {
      const x0 = c * CELL_W;
      if (k === 0 && x0 >= 0 && x0 < CAPSULE_W) continue;
      const l = sx(x0) + 2, top = y(k * CELL_H + CEIL), w = CELL_W - 4;
      if (l > viewW || l + w < 0) continue;
      const n = hash(c * 17 + k * 131);
      x.fillStyle = n < 0.25 ? '#080504' : '#050302'; x.fillRect(l, top, w, CEIL);
      x.strokeStyle = 'rgba(' + RUST + ',.12)'; x.lineWidth = 1; x.strokeRect(l + 0.5, top + 0.5, w - 1, CEIL - 1);
      // a hint of who lives there: a bed, a screen's glow, a bulb
      const floor = y(k * CELL_H);
      x.fillStyle = 'rgba(' + RUST + ',.08)'; x.fillRect(l + 8 + Math.floor(n * 40), floor - 12, 44, 12);
      if (n < 0.3) {
        const gx = l + 70 + Math.floor(n * 100) % 40, g = x.createRadialGradient(gx, floor - 40, 1, gx, floor - 40, 40);
        g.addColorStop(0, 'rgba(255,170,90,.06)'); g.addColorStop(1, 'rgba(255,170,90,0)');
        x.fillStyle = g; x.fillRect(l, top, w, CEIL);
        x.fillStyle = 'rgba(255,217,165,.25)'; x.fillRect(gx - 1, top + 14, 2, 2);
      } else if (n > 0.8) {
        x.fillStyle = 'rgba(150,170,220,' + (0.05 + 0.03 * Math.sin(t * 0.05 + n * 9)) + ')'; x.fillRect(l + 84, floor - 30, 16, 11);
      }
      // the hatch each capsule has on the corridor side
      x.fillStyle = 'rgba(' + RUST + ',.1)'; x.fillRect(l + w - 22, floor - 50, 14, 50);
    }
    // the slab under this row
    x.fillStyle = '#0a0604'; x.fillRect(0, y(k * CELL_H), viewW, SLAB);
    x.fillStyle = 'rgba(' + RUST + ',.2)'; x.fillRect(0, y(k * CELL_H), viewW, 1);
  }
}


/** Where the window looks out: the sky of the moment between the towers across the way (sets/sky.ts), and a far drone. */
function drawOutside(x: CanvasRenderingContext2D, l: number, top: number, w: number, h: number, t: number, lighting: Light) {
  drawPane(x, l, top, w, h, lighting, { facing: CAPSULE_FACING, seed: 7, horizon: 0.95 });
  // a far drone drifting past
  const dx = l + ((t * 0.15) % (w + 20)) - 10;
  x.fillStyle = 'rgba(255,42,68,.6)'; x.fillRect(Math.round(dx), top + 8, 2, 1);
}


function drawShell(x: CanvasRenderingContext2D, v: DrawView, _state: CapsuleVisualState) {
  const { sx, y } = v;
  const gy = y(0);
  // ---------- the flat's shell (middle band) ----------
  const fl = sx(originX), fr = sx(originX + CAPSULE_W), top = y(CEIL);
  x.fillStyle = '#170d07'; x.fillRect(fl, top, fr - fl, CEIL);
  // back wall panels and a skirting board
  x.fillStyle = 'rgba(' + O + ',.05)';
  for (let wx = originX + WALL + 52; wx < originX + CAPSULE_W - WALL; wx += 52) x.fillRect(sx(wx), top, 1, CEIL);
  x.fillStyle = '#1a0e07'; x.fillRect(fl, y(5), fr - fl, 5); x.fillStyle = 'rgba(' + O + ',.25)'; x.fillRect(fl, y(5), fr - fl, 1);
  // the ceiling: a strip light, dim and warm
  x.fillStyle = '#0d0805'; x.fillRect(fl, y(CEIL + SLAB), fr - fl, SLAB);
  x.fillStyle = 'rgba(' + O + ',.45)'; x.fillRect(fl, top, fr - fl, 1);
  const lampX = sx(originX + 200);
  x.fillStyle = 'rgba(255,217,165,.75)'; x.fillRect(lampX - 20, top + 1, 40, 2);
  const lg = x.createRadialGradient(lampX, top, 2, lampX, top + 20, 150);
  lg.addColorStop(0, 'rgba(255,190,120,.12)'); lg.addColorStop(1, 'rgba(255,190,120,0)');
  x.fillStyle = lg; x.fillRect(fl, top, fr - fl, CEIL);
  // the side walls, edge-on
  x.fillStyle = '#0a0604'; x.fillRect(fl, top, WALL, CEIL); x.fillRect(fr - WALL, top, WALL, CEIL);
  x.fillStyle = 'rgba(' + O + ',.4)'; x.fillRect(fl + WALL - 1, top, 1, CEIL); x.fillRect(fr - WALL, top, 1, CEIL);
  // the floor: a slab, then the near strip in front of the play band
  x.fillStyle = '#0a0604'; x.fillRect(fl, gy, fr - fl, v.viewH - gy);
  x.fillStyle = 'rgba(' + O + ',.55)'; x.fillRect(fl, gy, fr - fl, 1);
  x.fillStyle = 'rgba(' + O + ',.08)'; for (let i = 1; i < 4; i++) x.fillRect(fl, gy + i * 5 + i * i, fr - fl, 1);

  // the flat's outline, so your cell stands out of the tower
  x.strokeStyle = 'rgba(' + O + ',.5)'; x.strokeRect(fl - 0.5, y(CEIL + SLAB) - 0.5, fr - fl + 1, CEIL + SLAB + 1);
}

function drawPoster(x: CanvasRenderingContext2D, v: DrawView, _state: CapsuleVisualState) {
  const { sx, y } = v;
  // a poster over the bed: the metro line (Moth's "follow the trains")
  const px = sx(inputs.posterX ?? 487);
  paperSign(x, v.t, px, y(86), 36, 26, { fill: '#1c120b', edge: 'rgba(' + PAPER + ',.35)', first: 7, lines: [{ text: 'LINE 0', ink: 'rgba(' + PAPER + ',.6)' }] });
  x.fillStyle = 'rgba(' + PAPER + ',.45)'; x.fillRect(px - 12, y(70), 24, 1);
  [-12, 0, 12].forEach((d) => { x.fillStyle = 'rgba(' + PAPER + ',.6)'; x.fillRect(px + d - 1, y(71), 3, 3); });
  x.fillStyle = 'rgba(' + PAPER + ',.5)'; x.fillRect(px - 1, y(87), 2, 2);
}

function drawWindow(x: CanvasRenderingContext2D, v: DrawView, state: CapsuleVisualState) {
  const { sx, y, t } = v;
  const gy = y(0);
  const { sun } = state;
  // ---------- the window, the city outside, the blinds ----------
  const W0 = L.window, wl = sx(W0.x - W0.w / 2), wt = y(W0.h1), wh = W0.h1 - W0.h0;
  box(x, wl - 3, wt - 3, W0.w + 6, wh + 6, '#1a0e07', 'rgba(' + O + ',.6)');
  drawOutside(x, wl, wt, W0.w, wh, t, v.lighting);
  x.fillStyle = '#1a0e07'; x.fillRect(wl + W0.w / 2 - 1, wt, 2, wh); x.fillRect(wl, wt + wh / 2 - 1, W0.w, 2);
  if (sun) {
    // rolled up into the box at the top
    box(x, wl - 4, wt - 8, W0.w + 8, 8, '#2a1a10', 'rgba(' + O + ',.7)');
    // the light falling in (sets/sky.ts windowShaft): the sun's when it is on this side, its colour and angle by the hour
    const lt = v.lighting, win = { l: wl, r: wl + W0.w, t: wt, b: wt + wh };
    if (!windowShaft(x, win, gy, Math.min(v.viewH, gy + 14), lt, CAPSULE_FACING, { dust: true, t })) {
      // no sun: the sky's own light (or the city's at night) still makes a pale patch where the sun would lie
      const [gc, ga] = glass(lt), b0 = sx(L.sun.x0), b1 = sx(L.sun.x1), a = Math.max(0.05, ga * 0.6);
      const col = lt.daylight > 0.2 ? gc : '150,160,210';
      x.fillStyle = 'rgba(' + col + ',' + (a * 0.5).toFixed(3) + ')'; x.beginPath(); x.moveTo(wl, wt + wh); x.lineTo(wl + W0.w, wt + wh); x.lineTo(b1, gy); x.lineTo(b0, gy); x.closePath(); x.fill();
      x.fillStyle = 'rgba(' + col + ',' + a.toFixed(3) + ')'; x.fillRect(b0, gy - 1, b1 - b0, 2);
    }
  } else {
    // closed: slats, with the light of the hour leaking through the gaps (the sun's when it is on this side)
    const lt = v.lighting, sunIn = lt.direct * (Math.abs(rel(lt.sun.az, CAPSULE_FACING)) < 80 ? 1 : 0), [gc, ga] = glass(lt);
    const leak = sunIn > 0.05 ? 'rgba(' + lt.sunCol + ',' + (0.12 + 0.14 * sunIn).toFixed(3) + ')' : 'rgba(' + (lt.daylight > 0.2 ? gc : '120,130,180') + ',' + Math.max(0.06, ga * 0.6).toFixed(3) + ')';
    x.fillStyle = '#24160d'; x.fillRect(wl - 2, wt - 2, W0.w + 4, wh + 4);
    for (let yy = wt; yy < wt + wh; yy += 4) {
      x.fillStyle = 'rgba(' + O + ',.18)'; x.fillRect(wl - 2, yy, W0.w + 4, 1);
      x.fillStyle = leak; x.fillRect(wl, yy + 3, W0.w, 1);
    }
    x.strokeStyle = 'rgba(' + O + ',.55)'; x.strokeRect(wl - 1.5, wt - 1.5, W0.w + 3, wh + 3);
    // thin warm lines on the floor under the window
    x.fillStyle = leak; x.globalAlpha = 0.5; x.fillRect(sx(L.sun.x0), gy - 1, sx(L.sun.x1) - sx(L.sun.x0), 1); x.globalAlpha = 1;
  }
  // the blinds' motor box, with its cyan tell
  box(x, wl + W0.w + 4, wt + 4, 8, 12, '#0d1416', 'rgba(' + C + ',.6)');
  tell(x, t, wl + W0.w + 8, wt + 10, 1);
  glow(x, state.hover, 'blinds', wl - 3, wt - 8, W0.w + 14, wh + 11);
}

function drawDoor(x: CanvasRenderingContext2D, v: DrawView, state: CapsuleVisualState) {
  const { sx, y } = v;
  const gy = y(0);
  const { open } = state;
  // ---------- the door and its lock panel ----------
  const dx = sx(DOOR_X);
  box(x, dx - 16, y(56), 32, 56, '#020100', 'rgba(' + O + ',.75)');
  if (open) {
    // unlocked and ajar: the corridor's light in the gap
    x.fillStyle = 'rgba(255,200,130,.35)'; x.fillRect(dx - 13, y(53), 5, 53);
    box(x, dx - 8, y(53), 21, 53, '#2a1a10', 'rgba(' + O + ',.6)');
    x.fillStyle = 'rgba(255,200,130,.1)'; x.fillRect(dx - 13, gy + 1, 40, 4);
  } else {
    box(x, dx - 13, y(53), 26, 53, '#22140b', 'rgba(' + O + ',.5)');
    x.fillStyle = 'rgba(' + O + ',.15)'; x.fillRect(dx - 10, y(48), 20, 18); x.fillRect(dx - 10, y(26), 20, 18);
  }
  x.fillStyle = 'rgba(' + PAPER + ',.7)'; x.fillRect(dx + (open ? 9 : 8), y(28), 2, 5);
  box(x, dx - 7, y(62), 14, 9, '#0d0805', 'rgba(' + PAPER + ',.45)');
  text(x, '7B', dx, y(57.5), 'rgba(' + PAPER + ',.85)', 7, '600');
}

function drawLock(x: CanvasRenderingContext2D, v: DrawView, state: CapsuleVisualState) {
  const { sx, y, t } = v;
  const { open } = state;
  const lx = sx(L.lock);
  box(x, lx - 6, y(48), 12, 18, '#0d1416', 'rgba(' + C + ',.65)');
  x.fillStyle = open ? 'rgba(' + GREEN + ',.95)' : Math.floor(t / 40) % 2 ? 'rgba(' + RED + ',.95)' : 'rgba(' + RED + ',.4)';
  x.fillRect(lx - 2, y(44), 4, 3);
  x.fillStyle = 'rgba(' + C + ',.35)'; x.fillRect(lx - 4, y(39), 8, 5);
  tell(x, t, lx, y(33), 2);
  glow(x, state.hover, 'lock', lx - 6, y(48), 12, 18);
}

function drawFridge(x: CanvasRenderingContext2D, v: DrawView, state: CapsuleVisualState) {
  const { sx, y, t } = v;
  // ---------- the kitchenette: fridge, counter, kettle, a shelf ----------
  const f = L.fridge, fx = sx(f.x - f.w / 2);
  x.fillStyle = '#000'; x.fillRect(fx - 2, y(f.h + 2), f.w + 4, f.h + 2);
  box(x, fx, y(f.h), f.w, f.h, '#2a2a2e', 'rgba(' + PAPER + ',.55)');
  x.fillStyle = 'rgba(' + PAPER + ',.35)'; x.fillRect(fx + 1, y(44), f.w - 2, 1);
  x.fillStyle = 'rgba(' + PAPER + ',.6)'; x.fillRect(fx + f.w - 5, y(60), 2, 10); x.fillRect(fx + f.w - 5, y(38), 2, 12);
  // the note, on a magnet
  x.save(); x.translate(fx + 9, y(58)); x.rotate(-0.06);
  x.fillStyle = 'rgba(255,233,200,.85)'; x.fillRect(-6, -5, 13, 12);
  x.fillStyle = 'rgba(60,30,10,.7)'; for (let i = 0; i < 4; i++) x.fillRect(-4, -2 + i * 2.5, 8 - (i % 2) * 3, 1);
  x.fillStyle = 'rgba(' + RED + ',.9)'; x.fillRect(-1, -6, 3, 2);
  x.restore();
  tell(x, t, fx + 4, y(8), 3);
  glow(x, state.hover, 'fridge', fx, y(f.h), f.w, f.h);
}

function drawCounter(x: CanvasRenderingContext2D, v: DrawView, _state: CapsuleVisualState) {
  const { sx, y } = v;
  const c = L.counter, cl = sx(c.x0), cw = c.x1 - c.x0;
  box(x, cl, y(c.h), cw, c.h, '#1e120a', 'rgba(' + O + ',.6)');
  x.fillStyle = 'rgba(' + O + ',.8)'; x.fillRect(cl - 2, y(c.h), cw + 4, 2);
  x.fillStyle = 'rgba(' + O + ',.25)'; x.fillRect(cl + cw / 2, y(c.h - 4), 1, c.h - 6);
  x.fillStyle = 'rgba(' + PAPER + ',.4)'; x.fillRect(cl + cw / 2 - 5, y(18), 3, 2); x.fillRect(cl + cw / 2 + 3, y(18), 3, 2);
  // the shelf: jars, a cup, a plant that is mostly a stick
  x.fillStyle = 'rgba(' + O + ',.6)'; x.fillRect(cl + 4, y(70), cw - 8, 2);
  [[8, 8, 'rgba(255,217,165,.3)'], [18, 10, 'rgba(255,136,0,.3)'], [30, 6, 'rgba(255,217,165,.25)']].forEach(([ox, hh, col]) => { x.fillStyle = col as string; x.fillRect(cl + (ox as number), y(70 + (hh as number)), 6, hh as number); });
  x.fillStyle = 'rgba(' + GREEN + ',.35)'; x.fillRect(cl + 52, y(84), 1, 12); x.fillRect(cl + 50, y(84), 2, 1);
  x.fillStyle = 'rgba(' + O + ',.4)'; x.fillRect(cl + 48, y(72), 8, 2);
}

function drawKettle(x: CanvasRenderingContext2D, v: DrawView, state: CapsuleVisualState) {
  const { sx, y, t } = v;
  const c = L.counter;
  const { steam } = state;
  // the kettle
  const kx = sx(L.kettle);
  box(x, kx - 9, y(c.h + 3), 18, 3, '#14100c', 'rgba(' + O + ',.6)');
  box(x, kx - 7, y(c.h + 17), 14, 14, '#3a3e48', 'rgba(' + PAPER + ',.6)');
  x.fillStyle = '#3a3e48'; x.fillRect(kx + 7, y(c.h + 13), 4, 2); x.fillRect(kx - 3, y(c.h + 19), 6, 2);
  x.strokeStyle = 'rgba(' + PAPER + ',.5)'; x.strokeRect(kx - 10.5, y(c.h + 15) + 0.5, 3, 8);
  x.fillStyle = steam ? 'rgba(255,90,60,.95)' : 'rgba(' + C + ',.8)'; x.fillRect(kx - 2, y(c.h + 6), 4, 1);
  if (steam) {
    for (let i = 0; i < 3; i++) {
      x.strokeStyle = 'rgba(255,255,255,' + (0.18 + 0.06 * Math.sin(t * 0.1 + i)) + ')'; x.beginPath();
      for (let j = 0; j < 14; j++) { const yy = y(c.h + 16) - j * 2, xx = kx + 10 + i * 3 + Math.sin(t * 0.08 + i + j * 0.4) * 2.5; j ? x.lineTo(xx, yy) : x.moveTo(xx, yy); }
      x.stroke();
    }
  }
  tell(x, t, kx, y(c.h + 10), 4);
  glow(x, state.hover, 'kettle', kx - 11, y(c.h + 19), 22, 19);


}

function drawPcGlow(x: CanvasRenderingContext2D, v: DrawView, _state: CapsuleVisualState) {
  const { sx, y } = v;
  const pcx = sx(L.pc);
  // the PC's screen lights the wall and the desk

  const sg = x.createRadialGradient(pcx, y(L.desk.h + 16), 2, pcx, y(L.desk.h + 16), 70);
  sg.addColorStop(0, 'rgba(0,255,255,.07)'); sg.addColorStop(1, 'rgba(0,255,255,0)');
  x.fillStyle = sg; x.fillRect(pcx - 70, y(L.desk.h + 80), 140, 110);
}

function drawDesk(x: CanvasRenderingContext2D, v: DrawView, _state: CapsuleVisualState) {
  const { sx, y } = v;
  const d = L.desk;
  const dl = sx(d.x0), dw = d.x1 - d.x0;
  x.fillStyle = 'rgba(' + O + ',.8)'; x.fillRect(dl, y(d.h), dw, 3);
  x.fillStyle = '#1e120a'; x.fillRect(dl, y(d.h) + 3, dw, 4);
  x.fillStyle = '#1a0e07'; x.fillRect(dl + 2, y(d.h - 7), 3, d.h - 7); x.fillRect(dl + dw - 5, y(d.h - 7), 3, d.h - 7);
  x.fillStyle = 'rgba(' + O + ',.4)'; x.fillRect(dl + 2, y(d.h - 7), 1, d.h - 7); x.fillRect(dl + dw - 5, y(d.h - 7), 1, d.h - 7);
}

function drawStool(x: CanvasRenderingContext2D, v: DrawView, _state: CapsuleVisualState) {
  const { sx, y } = v;
  // a stool
  x.fillStyle = '#1a0e07'; x.fillRect(sx(L.pc) - 8, y(18), 16, 3); x.fillRect(sx(L.pc) - 1, y(15), 3, 15);
  x.fillStyle = 'rgba(' + O + ',.45)'; x.fillRect(sx(L.pc) - 8, y(18), 16, 1);
}

function drawPc(x: CanvasRenderingContext2D, v: DrawView, state: CapsuleVisualState) {
  const { sx, y, t } = v;
  const d = L.desk;
  const pcx = sx(L.pc);
  const { open } = state;
  // HOME-PC: monitor on a stand, keyboard
  box(x, pcx - 16, y(d.h + 30), 32, 22, '#0b1012', 'rgba(' + C + ',.7)');
  x.fillStyle = 'rgba(0,255,255,.12)'; x.fillRect(pcx - 14, y(d.h + 28), 28, 18);
  x.fillStyle = 'rgba(0,255,255,.55)'; for (let i = 0; i < 4; i++) x.fillRect(pcx - 11, y(d.h + 25) + i * 4, i === 1 ? 14 : 20 - i * 3, 1);
  if (!open && Math.floor(t / 30) % 2) { x.fillStyle = 'rgba(' + O + ',.9)'; x.fillRect(pcx + 8, y(d.h + 26), 3, 3); }
  x.fillStyle = '#1a1410'; x.fillRect(pcx - 2, y(d.h + 8), 4, 5); x.fillRect(pcx - 8, y(d.h + 3), 16, 2);
  box(x, pcx + 10, y(d.h + 3), 16, 3, '#14100c', 'rgba(' + PAPER + ',.35)');
  glow(x, state.hover, 'pc', pcx - 16, y(d.h + 30), 32, 30);
}

function drawPlug(x: CanvasRenderingContext2D, v: DrawView, state: CapsuleVisualState, cable=true) {
  const { sx, y, t } = v;
  const d = L.desk;
  const { plugOn } = state;
  // the smart plug in the wall socket under the desk, its cable up to the router
  const plx = sx(L.plug);
  box(x, plx - 6, y(22), 12, 16, '#141210', 'rgba(' + PAPER + ',.5)');
  box(x, plx - 4, y(18), 8, 9, '#202024', 'rgba(' + C + ',.6)');
  x.fillStyle = plugOn ? 'rgba(' + GREEN + ',.95)' : 'rgba(' + RED + ',.8)'; x.fillRect(plx - 1, y(16), 2, 2);
  if(cable){x.strokeStyle = 'rgba(' + PAPER + ',.35)'; x.beginPath(); x.moveTo(plx + 0.5, y(9)); x.quadraticCurveTo(plx + 20, y(2), sx(L.router) - 6, y(8));
  x.lineTo(sx(d.x1) - 4, y(d.h - 2)); x.stroke();}
  tell(x, t, plx + 9, y(20), 5);
  glow(x, state.hover, 'plug', plx - 6, y(22), 12, 16);
}

function drawRouter(x: CanvasRenderingContext2D, v: DrawView, state: CapsuleVisualState) {
  const { sx, y, t } = v;
  const d = L.desk;
  const { plugOn, up, hot, temp, pixelAt } = state;
  // the router: lights by state, a heat shimmer when hot
  const rx = sx(L.router), rt = y(d.h + 8);
  box(x, rx - 11, rt, 22, 8, '#1a1c22', 'rgba(' + PAPER + ',.55)');
  x.fillStyle = 'rgba(' + PAPER + ',.5)'; x.fillRect(rx - 9, y(d.h + 20), 1, 12); x.fillRect(rx + 8, y(d.h + 18), 1, 10);
  for (let i = 0; i < 4; i++) {
    let col = 'rgba(80,80,80,.5)';
    if (up) col = (Math.floor(t / 6) + i * 3) % 7 < 4 ? 'rgba(' + C + ',.95)' : 'rgba(' + C + ',.3)';
    else if (plugOn) col = Math.floor(t / 10) % 2 ? 'rgba(255,170,60,.95)' : 'rgba(255,170,60,.25)';
    x.fillStyle = col; x.fillRect(rx - 8 + i * 5, rt + 3, 2, 2);
  }
  if (plugOn && temp > 55) {
    const a = Math.min(0.35, (temp - 55) / 50);
    for (let i = 0; i < 3; i++) {
      x.strokeStyle = 'rgba(255,90,60,' + a + ')'; x.beginPath();
      for (let j = 0; j < 8; j++) { const yy = rt - 4 - j * 2, xx = rx - 6 + i * 6 + Math.sin(t * 0.15 + i * 2 + j * 0.7) * 1.5; j ? x.lineTo(xx, yy) : x.moveTo(xx, yy); }
      x.stroke();
    }
  }
  if (plugOn && !up && pixelAt === 'router' && hot) { x.fillStyle = 'rgba(' + RED + ',.9)'; x.fillRect(rx + 8, rt + 3, 2, 2); }
  glow(x, state.hover, 'router', rx - 11, y(d.h + 20), 22, 20);
}

function drawBed(x: CanvasRenderingContext2D, v: DrawView, _state: CapsuleVisualState) {
  const { sx, y } = v;
  // ---------- the bed ----------
  const b = L.bed, bl = sx(b.x0), bw = b.x1 - b.x0;
  box(x, bl, y(14), bw, 14, '#24140b', 'rgba(' + O + ',.6)');
  box(x, bl + 1, y(22), bw - 2, 8, '#3a2a40', 'rgba(' + PAPER + ',.35)');
  box(x, bl + bw - 14, y(26), 12, 5, '#d8c8b0', undefined);
  x.fillStyle = 'rgba(' + PAPER + ',.12)'; for (let i = 6; i < bw - 16; i += 7) x.fillRect(bl + i, y(21), 3, 6);
}

return { drawTower, drawShell, drawPoster, drawWindow, drawDoor, drawLock, drawFridge, drawCounter, drawKettle, drawPcGlow, drawDesk, drawStool, drawPc, drawPlug, drawRouter, drawBed };
}
