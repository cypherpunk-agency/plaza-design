/**
 * Set pieces (ART-GUIDE §12): the city's ground vehicles, side on. Cars (sedan, hatch, van, cab), the
 * bus, a truck (a road tractor with a container or an empty chassis, or the port's yard tractor), and
 * the port's machines: the straddle carrier (a box hanging between its legs), the reach stacker (a box
 * on the end of its arm) and a forklift with a pallet. Every one has its lights: headlights and tail
 * lights, amber beacons on the port machines. Register: sets/index.ts (`vehicles`).
 *
 * TRUE TO THE PLAYER'S SCALE (Tommi, 2026-10-15: one scale). The player is 48 units = 1.8 m, so a metre
 * is about 26.7 units: a sedan is 4.5 m long and 1.5 m tall (120 x 40), the bus 12 m, a road truck
 * with its 40 ft box about 17.5 m (the box itself 12.2 m, containers.ts `BOX40`), a straddle carrier
 * 14 m long and 13.5 m tall. `M` is the metre, `SIZE` each vehicle's length (for spacing them).
 *
 * Drawn in its own frame: origin at the middle of the vehicle where its wheels meet the ground, heights
 * up (y = -h). `face` 1 drives right, -1 left. `t` is the animation clock in frames (beacons, the
 * stacker's arm); `still` holds it.
 *
 * Optional motion (left out, every vehicle draws exactly as before): `roll` is the distance driven, in
 * units, and turns the wheel hubs; cars and cabs take `door` (0 shut .. 1 open, the driver's door) and
 * `exhaust` (puffs from the tailpipe while the engine runs).
 *
 * `livery` (kit.ts): fleet stripe, number, QR plate, printed decal (a van with a decal gets a solid cargo
 * panel instead of its rear window) and the autonomy cues. `drawTruck` with `tractor: false` is a parked
 * trailer chassis on its landing legs; `drawForklift` draws its `part` ('body' or 'roof', the overhead
 * guard that goes over its driver) when a scene layers the two around a person.
 * Placeable through `vehicle.road` (road-vehicle.ts); the other classes: air-vehicle.ts, boats.ts, rail.ts.
 */

import { BOX40, container, type Crate } from "../props/containers";
import { frameView } from "../core/view";
import { drawLivery, type Livery } from "./kit";

/** A metre in scene units (the player, 48, is 1.8 m). */
export const M = 48 / 1.8;
/** Each vehicle's length (scene units), for whoever spaces them on a road. */
export const SIZE = { sedan: 120, hatch: 108, van: 140, cab: 124, bus: 320, truck: 470, yard: 400, trailer: 344, straddle: 380, stacker: 330, forklift: 95 };

/**
 * The port scenes (harbor, terminal) are drawn below true scale: their boxes are 128 units for BOX40's 320.
 * Kit vehicles placed there are scaled by this; a trailer's deck then sits at their chassis height (14).
 */
export const PORT_SCALE = 0.4, PORT_TRAILER_SCALE = 14 / 34;

const y = (h: number) => -h;
const R = Math.round;

interface Common { t: number; face?: 1 | -1; still?: boolean; lights?: boolean; roll?: number; livery?: Livery }
/** The distance driven for the vehicle being drawn (wheels read it); undefined draws still hubs. */
let rolling: number | undefined;

function mirror(x: CanvasRenderingContext2D, face: number | undefined, draw: () => void, roll?: number) {
  x.save(); if ((face ?? 1) < 0) x.scale(-1, 1); rolling = roll; try { draw(); } finally { rolling = undefined; x.restore(); }
}
/** A container (the containers set) with its bottom-left at (left, bottom height), reading the right way round even on a mirrored vehicle. */
function boxAt(x: CanvasRenderingContext2D, o: Common, left: number, bottom: number, b: Crate) {
  x.save(); x.translate(left, y(bottom));
  if ((o.face ?? 1) < 0) { x.translate(b.w, 0); x.scale(-1, 1); }
  container(x, frameView(o.t), 0, 0, b); x.restore();
}
/** A box at the true scale: the scenes' crates keep their paint and seed, take BOX40's size. */
const trueBox = (b: Crate): Crate => ({ ...b, w: b.w > 200 ? b.w : b.w > 100 ? BOX40.w : BOX40.w / 2, h: b.h ?? BOX40.h });
function wheel(x: CanvasRenderingContext2D, cx: number, r: number) {
  x.fillStyle = '#0a0808'; x.beginPath(); x.arc(cx, y(r), r, 0, 7); x.fill();
  x.fillStyle = '#4a4a50'; x.beginPath(); x.arc(cx, y(r), r * 0.5, 0, 7); x.fill();
  if (rolling === undefined) { x.fillStyle = '#1a1a1e'; x.fillRect(R(cx - 1), R(y(r) - 1), 2, 2); return; }
  // three lug marks on the hub, turned by the distance driven (one turn per 2πr)
  const a = rolling / r, hub = r * 0.32; x.fillStyle = '#1a1a1e';
  for (let k = 0; k < 3; k++) { const ang = a + k * 2.094; x.fillRect(R(cx + Math.cos(ang) * hub - 1), R(y(r) + Math.sin(ang) * hub - 1), 2, 2); }
}
function beacon(x: CanvasRenderingContext2D, bx: number, bh: number, t: number, still?: boolean) {
  const on = still || Math.floor(t / 10) % 2 === 0;
  x.fillStyle = on ? '#ffa020' : '#5a2a00'; x.fillRect(bx, y(bh + 8), 8, 8);
  if (on) { const g = x.createRadialGradient(bx + 4, y(bh + 4), 0, bx + 4, y(bh + 4), 34); g.addColorStop(0, 'rgba(255,160,32,.35)'); g.addColorStop(1, 'rgba(255,160,32,0)'); x.fillStyle = g; x.fillRect(bx - 30, y(bh + 38), 68, 68); }
}
/** A headlight at the front (fx), its beam on the road ahead when `beam`. */
function headlight(x: CanvasRenderingContext2D, fx: number, h: number, beam: boolean) {
  x.fillStyle = '#ffe9a0'; x.fillRect(fx - 4, y(h + 5), 5, 5);
  if (beam) { const g = x.createLinearGradient(fx, 0, fx + 150, 0); g.addColorStop(0, 'rgba(255,230,170,.26)'); g.addColorStop(1, 'rgba(255,230,170,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(fx, y(h + 5)); x.lineTo(fx + 150, y(h + 22)); x.lineTo(fx + 150, y(0)); x.lineTo(fx, y(h - 2)); x.closePath(); x.fill(); }
}
function taillight(x: CanvasRenderingContext2D, bx: number, h: number, lit: boolean) {
  x.fillStyle = '#ff2a44'; x.fillRect(bx, y(h + 5), 4, 6);
  if (lit) { const g = x.createRadialGradient(bx, y(h + 2), 0, bx, y(h + 2), 18); g.addColorStop(0, 'rgba(255,42,68,.35)'); g.addColorStop(1, 'rgba(255,42,68,0)'); x.fillStyle = g; x.fillRect(bx - 18, y(h + 20), 36, 36); }
}

export type CarKind = 'sedan' | 'hatch' | 'van' | 'cab' | 'bus';

/** A car (or the bus): body, cabin with windows (the city in them), wheels, the lights (beams when `lights`). */
export function drawCar(x: CanvasRenderingContext2D, o: Common & { paint: string; kind?: CarKind; route?: string; door?: number; exhaust?: boolean }) {
  const k = o.kind ?? 'sedan';
  if (k === 'bus') { drawBus(x, o); return; }
  mirror(x, o.face, () => {
    const p = o.paint, len = SIZE[k], l = -len / 2, belt = k === 'van' ? 30 : 24, roof = k === 'van' ? 54 : 40;
    // the lower body
    x.fillStyle = p; x.beginPath(); x.moveTo(l + 2, y(8)); x.lineTo(l, y(belt - 6)); x.lineTo(l + 4, y(belt)); x.lineTo(l + len - 6, y(belt)); x.lineTo(l + len, y(belt - 8)); x.lineTo(l + len - 1, y(8)); x.closePath(); x.fill();
    // the cabin: roof and pillars
    x.beginPath();
    if (k === 'van') { x.moveTo(l + 3, y(belt)); x.lineTo(l + 3, y(roof)); x.lineTo(l + len - 34, y(roof)); x.lineTo(l + len - 12, y(belt + 2)); }
    else if (k === 'hatch') { x.moveTo(l + 6, y(belt)); x.lineTo(l + 12, y(roof)); x.lineTo(l + len - 46, y(roof)); x.lineTo(l + len - 26, y(belt)); }
    else { x.moveTo(l + 18, y(belt)); x.lineTo(l + 32, y(roof)); x.lineTo(l + len - 48, y(roof)); x.lineTo(l + len - 28, y(belt)); }
    x.closePath(); x.fill();
    // the windows: the sky in them, a pillar between
    x.fillStyle = 'rgba(150,190,230,.42)';
    if (k === 'van') { x.fillRect(l + len - 40, y(roof - 4), 22, 18); if (!o.livery?.decal?.length) x.fillRect(l + 10, y(roof - 4), 36, 14); }
    else {
      const w0 = k === 'hatch' ? l + 14 : l + 32, w1 = l + len - (k === 'hatch' ? 30 : 34);
      x.beginPath(); x.moveTo(w0, y(belt + 2)); x.lineTo(w0 + 4, y(roof - 3)); x.lineTo(w1 - 12, y(roof - 3)); x.lineTo(w1, y(belt + 2)); x.closePath(); x.fill();
      x.fillStyle = p; x.fillRect(R((w0 + w1) / 2) - 2, y(roof - 2), 4, roof - belt - 3);
    }
    // a lit top edge, the sill, the door line, the bumpers
    x.fillStyle = 'rgba(255,220,180,.32)'; x.fillRect(l + 4, y(belt), len - 10, 1); x.fillRect(l + 30, y(roof), len - 80, 1);
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(l, y(11), len, 3); x.fillRect(R(l + len * 0.5), y(belt - 2), 1, belt - 12);
    if (k === 'cab') { x.fillStyle = '#ffd23a'; x.fillRect(-12, y(roof + 7), 24, 7); x.fillStyle = '#1a1208'; x.fillRect(-9, y(roof + 5), 18, 2); x.fillStyle = '#1a1208'; for (let i = l + 36; i < l + len - 40; i += 8) x.fillRect(i, y(belt - 6), 4, 2); }
    drawLivery(x, o.livery, { l, len, belt, roof, face: o.face ?? 1, t: o.t, still: o.still });
    if (o.door) carDoor(x, p, R(l + len * 0.5), belt, roof, o.door);
    wheel(x, l + 22, 9); wheel(x, l + len - 24, 9);
    headlight(x, l + len, 14, !!o.lights);
    taillight(x, l, 14, !!o.lights);
    if (o.exhaust) exhaustPuffs(x, l - 2, 7, o.t, o.still);
  }, o.roll);
}

/** The driver's door swung open toward the viewer: the dark cabin behind it, the door foreshortened, hinged at the front. */
function carDoor(x: CanvasRenderingContext2D, paint: string, rear: number, belt: number, roof: number, open: number) {
  const w = 30, gap = R(w * Math.min(1, open)), front = rear + w;
  x.fillStyle = '#0c0a0e'; x.fillRect(front - gap, y(roof - 3), gap, roof - 14);
  const panel = Math.max(3, R(w * (1 - 0.8 * open)));
  x.fillStyle = paint; x.fillRect(front, y(belt + 2), panel, belt - 8);
  x.fillStyle = 'rgba(150,190,230,.42)'; x.fillRect(front, y(roof - 4), panel, roof - belt - 6);
  x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(front, y(belt + 2), 1, roof - 12);
}
/** Exhaust: three puffs leaving the tailpipe at (px, h), drifting back and up and thinning out. */
function exhaustPuffs(x: CanvasRenderingContext2D, px: number, h: number, t: number, still?: boolean) {
  const clock = still ? 0 : t;
  for (let k = 0; k < 3; k++) {
    const u = ((clock + k * 14) % 42) / 42, r = 2 + u * 4;
    x.fillStyle = `rgba(190,190,200,${(0.32 * (1 - u)).toFixed(3)})`;
    x.beginPath(); x.arc(px - u * 26, y(h + u * 10), r, 0, 7); x.fill();
  }
}

/** Bus 7 (or any route): a 12 m bus, its windows lit, the route on the front board. */
function drawBus(x: CanvasRenderingContext2D, o: Common & { paint: string; route?: string; livery?: Livery }) {
  mirror(x, o.face, () => {
    const len = SIZE.bus, l = -len / 2, top = 86;
    x.fillStyle = o.paint; x.fillRect(l, y(top), len, top - 10);
    x.fillStyle = 'rgba(255,220,180,.3)'; x.fillRect(l, y(top), len, 1);
    // the windows: lit warm, a few heads
    x.fillStyle = 'rgba(255,214,150,.5)'; x.fillRect(l + 10, y(top - 10), len - 50, 30);
    x.fillStyle = 'rgba(20,10,16,.55)'; for (let i = 0; i < 6; i++) { const hx = l + 26 + i * 41 + (i % 2) * 9; if (i % 3 === 2) continue; x.beginPath(); x.arc(hx, y(top - 30), 5, 0, 7); x.fill(); x.fillRect(hx - 7, y(top - 36), 14, 6); }
    x.fillStyle = o.paint; for (let i = l + 10 + 54; i < l + len - 40; i += 54) x.fillRect(i, y(top - 10), 3, 30);
    // the door, the windscreen, the route board
    x.fillStyle = 'rgba(150,190,230,.45)'; x.fillRect(l + len - 34, y(top - 8), 28, 44);
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(l + len - 70, y(top - 10), 30, 66); x.fillRect(l, y(14), len, 4);
    x.fillStyle = '#0a0606'; x.fillRect(l + len - 34, y(top - 2), 30, 8);
    x.save(); x.font = '600 7px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(255,170,60,.95)';
    if ((o.face ?? 1) < 0) { x.translate(l + len - 19, y(top - 6)); x.scale(-1, 1); x.fillText(o.route ?? '7', 0, 0.5); } else x.fillText(o.route ?? '7', l + len - 19, y(top - 6) + 0.5);
    x.restore();
    drawLivery(x, o.livery, { l, len, belt: 30, roof: top, face: o.face ?? 1, t: o.t, still: o.still });
    wheel(x, l + 44, 12); wheel(x, l + len - 60, 12);
    headlight(x, l + len, 16, !!o.lights);
    taillight(x, l, 16, !!o.lights);
  }, o.roll);
}

/**
 * A truck: a road tractor and its trailer chassis with the load (a 40 ft box from the containers set,
 * or the empty skeleton chassis); `yard`: the port's terminal tractor, a squat one-seat cab with a beacon.
 * `tractor: false`: the trailer alone (`SIZE.trailer`, centred on the origin), parked on its landing legs.
 */
export function drawTruck(x: CanvasRenderingContext2D, o: Common & { paint: string; box?: Crate | null; yard?: boolean; tractor?: boolean }) {
  mirror(x, o.face, () => {
    const len = o.yard ? SIZE.yard : SIZE.truck, l = -len / 2, cab = o.yard ? 92 : 150, chassis = 34, trailer = len - cab + 24;
    if (o.tractor === false) x.translate(-(l + trailer / 2), 0);
    // the trailer's chassis (under the coupling, it runs into the tractor), its wheels
    x.fillStyle = '#26262c'; x.fillRect(l, y(chassis), trailer, 8);
    x.fillStyle = 'rgba(255,200,60,.45)'; for (let i = l + 8; i < l + trailer - 10; i += 30) x.fillRect(i, y(chassis - 2), 12, 3);
    x.fillStyle = '#1c1c20'; x.fillRect(l + 12, y(chassis - 8), 70, 6);
    for (const wx of [l + 24, l + 52, l + 80]) wheel(x, wx, 13);
    // the box on it (true size), or the empty skeleton
    if (o.box) boxAt(x, o, l + 4, chassis + 8, trueBox(o.box));
    else { x.fillStyle = '#3a3a40'; x.fillRect(l + 4, y(chassis + 10), 4, 10); x.fillRect(l + trailer - 34, y(chassis + 10), 4, 10); }
    taillight(x, l, chassis - 4, !!o.lights);
    if (o.tractor === false) {
      // the landing legs at the front, wound down, and the kingpin plate
      const g = l + trailer - 46;
      x.fillStyle = '#3a3a40'; x.fillRect(g, y(chassis - 8), 4, chassis - 10); x.fillRect(g - 3, y(3), 10, 3);
      x.fillStyle = '#1c1c20'; x.fillRect(l + trailer - 22, y(chassis - 8), 16, 3);
      return;
    }
    // the tractor: the cab, its window, the sleeper, the stacks, the tank
    const c0 = l + len - cab;
    if (o.yard) {
      x.fillStyle = o.paint; x.fillRect(c0 + 30, y(56), cab - 30, 34); x.fillRect(c0 + 40, y(100), 48, 44);
      x.fillStyle = 'rgba(150,200,235,.5)'; x.fillRect(c0 + 52, y(94), 30, 24);
      x.fillStyle = 'rgba(255,220,180,.4)'; x.fillRect(c0 + 40, y(100), 48, 1);
      beacon(x, c0 + 60, 100, o.t, o.still);
      drawLivery(x, o.livery, { l: c0 + 30, len: cab - 30, belt: 46, roof: 100, face: o.face ?? 1, t: o.t, still: o.still });
      wheel(x, c0 + 44, 14); wheel(x, l + len - 20, 14);
      headlight(x, l + len, 30, !!o.lights);
      return;
    }
    x.fillStyle = o.paint; x.fillRect(c0 + 40, y(100), cab - 40, 82); x.fillRect(c0 + 6, y(92), 40, 66);
    x.fillStyle = 'rgba(255,220,180,.4)'; x.fillRect(c0 + 40, y(100), cab - 40, 1);
    x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(c0 + 6, y(30), cab - 6, 6); x.fillRect(c0 + 60, y(92), 1, 60);
    x.fillStyle = 'rgba(150,200,235,.5)'; x.fillRect(c0 + 96, y(92), 46, 32);
    x.fillStyle = '#3a3a40'; x.fillRect(c0 + 44, y(126), 6, 46);
    x.fillStyle = '#5a5a60'; x.fillRect(c0 + 70, y(36), 40, 14);
    x.fillStyle = '#1a1a1e'; x.fillRect(c0 + cab - 8, y(54), 10, 26);
    drawLivery(x, o.livery, { l: c0 + 40, len: cab - 40, belt: 52, roof: 100, face: o.face ?? 1, t: o.t, still: o.still });
    wheel(x, c0 + 30, 15); wheel(x, c0 + 62, 15); wheel(x, c0 + cab - 24, 15);
    headlight(x, l + len + 2, 34, !!o.lights);
  }, o.roll);
}

/** A straddle carrier: four tall legs on wheels, the frame over the box it carries, the cab up top. `lift` 0..1 raises the box. */
export function drawStraddle(x: CanvasRenderingContext2D, o: Common & { box?: Crate | null; lift?: number; paint?: string }) {
  mirror(x, o.face, () => {
    const W = SIZE.straddle, l = -W / 2, top = 330, paint = o.paint ?? '#c88a1a', dark = 'rgba(0,0,0,.42)';
    // the far legs, dimmer
    for (const fx of [l + 26, l + W - 38]) { x.fillStyle = paint; x.fillRect(fx, y(top - 8), 12, top - 30); x.fillStyle = dark; x.fillRect(fx, y(top - 8), 12, top - 30); }
    // the box, between the legs, on its cables
    const lift = o.lift ?? 0.5;
    if (o.box) { const b = trueBox(o.box), bh = 26 + lift * 150; boxAt(x, o, -b.w / 2, bh, b);
      x.strokeStyle = 'rgba(255,217,165,.5)'; x.lineWidth = 2; x.beginPath(); for (const cx of [-130, 130]) { x.moveTo(cx, y(top - 20)); x.lineTo(cx, y(bh + b.h! + 6)); } x.stroke();
      x.fillStyle = '#2a2a30'; x.fillRect(-b.w / 2 - 4, y(bh + b.h! + 10), b.w + 8, 6); }
    // the frame: the near legs, the top beams, the cab on one end
    x.fillStyle = paint;
    x.fillRect(l + 8, y(top), 16, top - 22); x.fillRect(l + W - 24, y(top), 16, top - 22);
    x.fillRect(l, y(top), W, 22); x.fillRect(l + 2, y(80), 30, 12); x.fillRect(l + W - 32, y(80), 30, 12);
    x.fillStyle = 'rgba(255,230,170,.5)'; x.fillRect(l, y(top), W, 2);
    x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(l, y(top - 18), W, 4);
    // hazard stripes on the legs' feet
    for (const lx of [l + 8, l + W - 24]) for (let k = 0; k < 4; k++) { x.fillStyle = k % 2 ? '#1a1206' : '#ffd23a'; x.fillRect(lx, y(66 - k * 12), 16, 12); }
    const cx = l + W - 92;
    x.fillStyle = paint; x.fillRect(cx, y(top + 64), 70, 64);
    x.fillStyle = 'rgba(150,200,235,.55)'; x.fillRect(cx + 10, y(top + 54), 36, 28);
    x.fillStyle = 'rgba(255,230,170,.5)'; x.fillRect(cx, y(top + 64), 70, 2);
    drawLivery(x, o.livery, { l, len: W, belt: top - 2, roof: top + 64, face: o.face ?? 1, t: o.t, still: o.still });
    for (const wx of [l + 16, l + W - 16]) wheel(x, wx, 18);
    beacon(x, cx + 52, top + 64, o.t, o.still);
  }, o.roll);
}

/** A reach stacker: the heavy body on big wheels, the cab, the telescopic arm reaching up to a box. `reach` 0..1 lifts the arm. */
export function drawReachStacker(x: CanvasRenderingContext2D, o: Common & { box?: Crate | null; reach?: number }) {
  mirror(x, o.face, () => {
    const paint = '#b8441a', l = -SIZE.stacker / 2;
    // the arm: from the back of the body up and forward to the spreader
    const a = 0.3 + (o.reach ?? 0.5) * 0.36, len = 330, px = l + 70, ph = 96;
    const ex = px + Math.cos(a) * len, eh = ph + Math.sin(a) * len;
    x.strokeStyle = paint; x.lineWidth = 26; x.beginPath(); x.moveTo(px, y(ph)); x.lineTo(ex, y(eh)); x.stroke();
    x.strokeStyle = 'rgba(255,220,180,.35)'; x.lineWidth = 2; x.beginPath(); x.moveTo(px, y(ph + 13)); x.lineTo(ex, y(eh + 13)); x.stroke();
    // the box, held from its top at the arm's end
    if (o.box) { const b = trueBox(o.box); boxAt(x, o, ex - b.w / 2, eh - b.h! - 6, b); x.fillStyle = '#2a2a30'; x.fillRect(R(ex - b.w / 2 - 4), R(y(eh - 2)), b.w + 8, 10); }
    // the body, the cab, the counterweight
    x.fillStyle = paint; x.fillRect(l, y(84), SIZE.stacker, 58); x.fillRect(l - 14, y(100), 50, 74);
    x.fillStyle = 'rgba(255,220,180,.4)'; x.fillRect(l, y(84), SIZE.stacker, 2);
    x.fillStyle = paint; x.fillRect(l + 130, y(150), 70, 66);
    x.fillStyle = 'rgba(150,200,235,.55)'; x.fillRect(l + 140, y(140), 50, 34);
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(l, y(36), SIZE.stacker, 6);
    wheel(x, l + 46, 28); wheel(x, l + SIZE.stacker - 50, 28);
    beacon(x, l + 160, 150, o.t + 5, o.still);
  }, o.roll);
}

/**
 * A forklift: the body and its counterweight, the overhead guard, the mast and forks, a pallet of crates.
 * `part`: only the 'body' (everything under the driver) or only the 'roof' (the guard and its beacon).
 */
export function drawForklift(x: CanvasRenderingContext2D, o: Common & { load?: boolean; lift?: number; part?: 'body' | 'roof'; paint?: string }) {
  mirror(x, o.face, () => {
    const paint = o.paint ?? '#e0a820', l = -SIZE.forklift / 2, lift = (o.lift ?? 0) * 46;
    if (o.part !== 'body') { x.fillStyle = '#2a2a30'; x.fillRect(l + 18, y(96), 3, 52); x.fillRect(l + 60, y(96), 3, 52); x.fillRect(l + 18, y(96), 46, 4); beacon(x, l + 36, 96, o.t + 3, o.still); }
    if (o.part === 'roof') return;
    x.fillStyle = paint; x.fillRect(l + 6, y(44), 64, 32); x.fillRect(l, y(56), 22, 44);
    x.fillStyle = 'rgba(255,230,170,.45)'; x.fillRect(l + 6, y(44), 64, 1);
    // the mast and forks
    x.fillStyle = '#3a3a40'; x.fillRect(l + 70, y(110), 7, 106);
    x.fillStyle = '#5a5a60'; x.fillRect(l + 74, y(8 + lift), 42, 3);
    if (o.load ?? true) {
      x.fillStyle = '#7a5a34'; x.fillRect(l + 76, y(14 + lift), 40, 6);
      for (let k = 0; k < 2; k++) { x.fillStyle = ['#a0703c', '#8a6034'][k]; x.fillRect(l + 77 + k * 19, y(40 + lift), 19, 26); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(l + 77 + k * 19, y(28 + lift), 19, 1); }
    }
    wheel(x, l + 16, 11); wheel(x, l + 60, 12);
  }, o.roll);
}
