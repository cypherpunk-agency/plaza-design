/**
 * Set pieces (ART-GUIDE §12): the city's ground vehicles, side on. A car, a box truck or a
 * container truck (its box is the containers set), and the port's machines: the straddle carrier
 * (a box hanging between its legs), the reach stacker (a box on the end of its arm) and a forklift
 * with a pallet. Every one has its lights: headlights and tail lights, amber beacons on the port
 * machines. Register: sets/index.ts (`vehicles`).
 *
 * Drawn in its own frame, in the scenes' units (the player is about 48 tall): origin at the middle
 * of the vehicle where its wheels meet the ground, heights up (y = -h). `face` 1 drives right,
 * -1 left. `t` is the animation clock in frames (beacons, the stacker's arm); `still` holds it.
 */

import { container, type Crate } from './containers';
import { frameView } from './view';

const y = (h: number) => -h;
const R = Math.round;

interface Common { t: number; face?: 1 | -1; still?: boolean; lights?: boolean }

function mirror(x: CanvasRenderingContext2D, face: number | undefined, draw: () => void) {
  x.save(); if ((face ?? 1) < 0) x.scale(-1, 1); draw(); x.restore();
}
/** A container (the containers set) with its bottom-left at (left, bottom height), reading the right way round even on a mirrored vehicle. */
function boxAt(x: CanvasRenderingContext2D, o: Common, left: number, bottom: number, b: Crate) {
  x.save(); x.translate(left, y(bottom));
  if ((o.face ?? 1) < 0) { x.translate(b.w, 0); x.scale(-1, 1); }
  container(x, frameView(o.t), 0, 0, b); x.restore();
}
function wheel(x: CanvasRenderingContext2D, cx: number, r: number) {
  x.fillStyle = '#0a0808'; x.beginPath(); x.arc(cx, y(r), r, 0, 7); x.fill();
  x.fillStyle = '#5a5a60'; x.fillRect(R(cx - r * 0.35), R(y(r) - r * 0.35), R(r * 0.7), R(r * 0.7));
}
function beacon(x: CanvasRenderingContext2D, bx: number, bh: number, t: number, still?: boolean) {
  const on = still || Math.floor(t / 10) % 2 === 0;
  x.fillStyle = on ? '#ffa020' : '#5a2a00'; x.fillRect(bx, y(bh + 4), 4, 4);
  if (on) { const g = x.createRadialGradient(bx + 2, y(bh + 2), 0, bx + 2, y(bh + 2), 14); g.addColorStop(0, 'rgba(255,160,32,.35)'); g.addColorStop(1, 'rgba(255,160,32,0)'); x.fillStyle = g; x.fillRect(bx - 12, y(bh + 16), 28, 28); }
}
function headlight(x: CanvasRenderingContext2D, fx: number, h: number, beam: boolean) {
  x.fillStyle = '#ffe9a0'; x.fillRect(fx - 2, y(h + 3), 3, 3);
  if (beam) { const g = x.createLinearGradient(fx, 0, fx + 60, 0); g.addColorStop(0, 'rgba(255,230,170,.28)'); g.addColorStop(1, 'rgba(255,230,170,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(fx, y(h + 3)); x.lineTo(fx + 60, y(h + 10)); x.lineTo(fx + 60, y(0)); x.lineTo(fx, y(h - 1)); x.closePath(); x.fill(); }
}

/** A car: body, cabin with windows, wheels, the lights (beams when `lights`). */
export function drawCar(x: CanvasRenderingContext2D, o: Common & { paint: string; kind?: 'sedan' | 'hatch' | 'van' | 'cab' }) {
  mirror(x, o.face, () => {
    const k = o.kind ?? 'sedan', p = o.paint;
    const len = k === 'van' ? 64 : 54, l = -len / 2, cabT = k === 'van' ? 34 : 27;
    x.fillStyle = p; x.fillRect(l, y(18), len, 12);
    // the cabin: a trapezoid of roof and pillars
    x.beginPath();
    if (k === 'van') { x.moveTo(l + 2, y(18)); x.lineTo(l + 2, y(cabT)); x.lineTo(l + len - 16, y(cabT)); x.lineTo(l + len - 4, y(19)); }
    else if (k === 'hatch') { x.moveTo(l + 4, y(18)); x.lineTo(l + 8, y(cabT)); x.lineTo(l + len - 22, y(cabT)); x.lineTo(l + len - 12, y(18)); }
    else { x.moveTo(l + 10, y(18)); x.lineTo(l + 16, y(cabT)); x.lineTo(l + len - 22, y(cabT)); x.lineTo(l + len - 13, y(18)); }
    x.closePath(); x.fill();
    // windows, the sky in them
    x.fillStyle = 'rgba(150,200,235,.45)';
    if (k === 'van') x.fillRect(l + len - 20, y(cabT - 3), 10, 10);
    else { x.fillRect(l + (k === 'hatch' ? 9 : 17), y(cabT - 2), 12, 6); x.fillRect(l + (k === 'hatch' ? 23 : 31), y(cabT - 2), len - (k === 'hatch' ? 47 : 55), 6); }
    // a lit top edge, the sill, the bumpers
    x.fillStyle = 'rgba(255,220,180,.35)'; x.fillRect(l + 1, y(18), len - 2, 1);
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(l, y(9), len, 2);
    if (k === 'cab') { x.fillStyle = '#ffd23a'; x.fillRect(-6, y(cabT + 3), 12, 3); x.fillStyle = '#1a1208'; x.fillRect(-4, y(cabT + 2), 8, 1); }
    wheel(x, l + 11, 6); wheel(x, l + len - 11, 6);
    headlight(x, l + len, 12, !!o.lights);
    x.fillStyle = '#ff2a44'; x.fillRect(l, y(15), 2, 3);
  });
}

/** A truck: the tractor's cab, the chassis, and its load (a container from the containers set, or nothing). */
export function drawTruck(x: CanvasRenderingContext2D, o: Common & { paint: string; box?: Crate | null }) {
  mirror(x, o.face, () => {
    const len = 176, l = -len / 2, cab = 42;
    // the trailer's chassis, its wheels
    x.fillStyle = '#26262c'; x.fillRect(l, y(18), len - cab - 4, 6);
    x.fillStyle = 'rgba(255,200,60,.5)'; for (let i = l + 4; i < l + len - cab - 8; i += 14) x.fillRect(i, y(16), 6, 2);
    for (const wx of [l + 14, l + 30, l + len - cab - 34]) wheel(x, wx, 7);
    // the box on it
    if (o.box) boxAt(x, o, l + 2, 18, o.box);
    // the cab: a tall box with a window, the sleeper, the exhaust
    const c0 = l + len - cab;
    x.fillStyle = o.paint; x.fillRect(c0, y(58), cab, 46); x.fillRect(c0 - 6, y(48), 8, 30);
    x.fillStyle = 'rgba(255,220,180,.4)'; x.fillRect(c0, y(58), cab, 1);
    x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(c0, y(22), cab, 3); x.fillRect(c0 + 8, y(50), 1, 36);
    x.fillStyle = 'rgba(150,200,235,.5)'; x.fillRect(c0 + 22, y(54), 16, 14);
    x.fillStyle = '#3a3a40'; x.fillRect(c0 - 4, y(70), 3, 22);
    x.fillStyle = '#1a1a1e'; x.fillRect(c0 + cab - 4, y(30), 6, 14);
    wheel(x, c0 + 10, 8); wheel(x, c0 + cab - 8, 8);
    headlight(x, l + len + 2, 20, !!o.lights);
    x.fillStyle = '#ff2a44'; x.fillRect(l, y(22), 2, 4);
  });
}

/** A straddle carrier: four tall legs on wheels, the frame over the box it carries, the cab up top. `lift` 0..1 raises the box. */
export function drawStraddle(x: CanvasRenderingContext2D, o: Common & { box?: Crate | null; lift?: number }) {
  mirror(x, o.face, () => {
    const W = 144, l = -W / 2, top = 120, paint = '#c88a1a', dark = '#7a4e10';
    // the far legs, dimmer
    x.fillStyle = dark; x.fillRect(l + 10, y(top - 4), 5, top - 14); x.fillRect(l + W - 14, y(top - 4), 5, top - 14);
    // the box, between the legs
    const lift = o.lift ?? 0.5;
    if (o.box) { const bh = 14 + lift * 26; boxAt(x, o, -64, bh, o.box);
      x.strokeStyle = 'rgba(255,217,165,.5)'; x.lineWidth = 1; x.beginPath(); for (const cx of [-50, 50]) { x.moveTo(cx, y(top - 8)); x.lineTo(cx, y(bh + 58)); } x.stroke(); }
    // the frame: the near legs, the top beams, the cab on one end
    x.fillStyle = paint;
    x.fillRect(l + 4, y(top), 7, top - 10); x.fillRect(l + W - 11, y(top), 7, top - 10);
    x.fillRect(l, y(top), W, 9); x.fillRect(l + 2, y(36), 12, 5); x.fillRect(l + W - 14, y(36), 12, 5);
    x.fillStyle = 'rgba(255,230,170,.5)'; x.fillRect(l, y(top), W, 1);
    x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(l, y(top - 7), W, 2);
    // hazard stripes on the legs' feet
    for (const lx of [l + 4, l + W - 11]) for (let k = 0; k < 3; k++) { x.fillStyle = k % 2 ? '#1a1206' : '#ffd23a'; x.fillRect(lx, y(26 - k * 5), 7, 5); }
    const cx = l + W - 40;
    x.fillStyle = paint; x.fillRect(cx, y(top + 22), 30, 22);
    x.fillStyle = 'rgba(150,200,235,.55)'; x.fillRect(cx + 4, y(top + 18), 14, 10);
    x.fillStyle = 'rgba(255,230,170,.5)'; x.fillRect(cx, y(top + 22), 30, 1);
    for (const wx of [l + 7, l + W - 8]) wheel(x, wx, 8);
    beacon(x, cx + 22, top + 22, o.t, o.still);
  });
}

/** A reach stacker: the heavy body on big wheels, the cab, the telescopic arm reaching up to a box. `reach` 0..1 lifts the arm. */
export function drawReachStacker(x: CanvasRenderingContext2D, o: Common & { box?: Crate | null; reach?: number }) {
  mirror(x, o.face, () => {
    const paint = '#b8441a', l = -52;
    // the arm: from the back of the body up and forward to the spreader
    const a = 0.32 + (o.reach ?? 0.5) * 0.4, len = 120, px = l + 30, ph = 36;
    const ex = px + Math.cos(a) * len, eh = ph + Math.sin(a) * len;
    x.strokeStyle = paint; x.lineWidth = 10; x.beginPath(); x.moveTo(px, y(ph)); x.lineTo(ex, y(eh)); x.stroke();
    x.strokeStyle = 'rgba(255,220,180,.35)'; x.lineWidth = 1; x.beginPath(); x.moveTo(px, y(ph + 5)); x.lineTo(ex, y(eh + 5)); x.stroke();
    // the box, held from its top at the arm's end
    if (o.box) boxAt(x, o, ex - 64, eh - 62, o.box);
    x.fillStyle = '#2a2a30'; x.fillRect(R(ex - 66), R(y(eh - 2)), 132, 5);
    // the body, the cab, the counterweight
    x.fillStyle = paint; x.fillRect(l, y(30), 104, 22); x.fillRect(l - 6, y(36), 20, 28);
    x.fillStyle = 'rgba(255,220,180,.4)'; x.fillRect(l, y(30), 104, 1);
    x.fillStyle = paint; x.fillRect(l + 40, y(56), 26, 26);
    x.fillStyle = 'rgba(150,200,235,.55)'; x.fillRect(l + 44, y(52), 18, 12);
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(l, y(12), 104, 3);
    wheel(x, l + 14, 11); wheel(x, l + 86, 11);
    beacon(x, l + 50, 56, o.t + 5, o.still);
  });
}

/** A forklift: the body and its counterweight, the mast and forks, a pallet of crates. */
export function drawForklift(x: CanvasRenderingContext2D, o: Common & { load?: boolean; lift?: number }) {
  mirror(x, o.face, () => {
    const paint = '#e0a820', l = -22, lift = (o.lift ?? 0) * 18;
    x.fillStyle = paint; x.fillRect(l, y(20), 32, 14); x.fillRect(l - 4, y(26), 10, 20);
    x.fillStyle = '#2a2a30'; x.fillRect(l + 6, y(46), 2, 26); x.fillRect(l + 24, y(46), 2, 26); x.fillRect(l + 6, y(46), 20, 2);
    x.fillStyle = 'rgba(255,230,170,.45)'; x.fillRect(l, y(20), 32, 1);
    // the mast and forks
    x.fillStyle = '#3a3a40'; x.fillRect(l + 33, y(52), 4, 50);
    x.fillStyle = '#5a5a60'; x.fillRect(l + 35, y(5 + lift), 22, 2);
    if (o.load ?? true) {
      x.fillStyle = '#7a5a34'; x.fillRect(l + 36, y(9 + lift), 22, 4);
      for (let k = 0; k < 2; k++) { x.fillStyle = ['#a0703c', '#8a6034'][k]; x.fillRect(l + 37 + k * 10, y(21 + lift), 10, 12); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(l + 37 + k * 10, y(15 + lift), 10, 1); }
    }
    wheel(x, l + 4, 5); wheel(x, l + 26, 6);
    beacon(x, l + 14, 46, o.t + 3, o.still);
  });
}
