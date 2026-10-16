/**
 * Set piece (ART-GUIDE §12): a LINE 0 car from outside. A dark body with an orange rim and a
 * waist stripe, six bays: two doors (sliding open onto the lit inside) and four lit windows with
 * whoever rides in them; the lead car carries the headlight and its destination board.
 * Register: sets/index.ts (`train-car`). The inside of car 3 is the `train` scene.
 *
 * Drawn with the caller's `y` (heights above the platform edge, or above the rail) and the car's
 * left edge in screen x, so a platform draws it on its own camera and a cutscene in a scaled frame.
 */

import { box, O, rng, text } from '../core/primitives';
import { drawRider, type RiderKind } from "../characters/riders";

/** A car's layout: length, the six bays (pitch, first offset, width), which bays are doors. Height 86 (top at 100). */
export const CAR = { len: 290, bay: 46, bay0: 14, bayW: 32, doorBays: [1, 4], top: 100, tall: 86 };

/** Who sits in a window this time (scenes/riders.ts `crowd`). */
export interface Rider { on: boolean; kind: RiderKind; flip: boolean; phase: number }

export interface CarLook {
  /** Animation clock (frames), for the riders. */
  t: number;
  /** Which car this is (0 leads), and everyone on the train, six seats a car. */
  c: number;
  riders: Rider[];
  /** The doors, 0 (shut) .. 1 (open). */
  open: number;
  /** The lead car's board: where it runs to. */
  dest?: string;
}

/** One car, its left edge at screen x `c0`. */
export function drawTrainCar(x: CanvasRenderingContext2D, c0: number, y: (h: number) => number, o: CarLook) {
  const T = CAR, riders = o.riders;
  box(x, c0, y(T.top), T.len, T.tall, '#14171a', 'rgba(' + O + ',.6)');
  x.fillStyle = 'rgba(' + O + ',.5)'; x.fillRect(c0 + 1, y(44), T.len - 2, 2);
  for (let i = 0; i < 6; i++) {
    const wx = c0 + T.bay0 + i * T.bay;
    if (T.doorBays.includes(i)) {
      // doors: open shows the lit inside, and a step of light on the platform edge
      const d = Math.round(o.open * 13);
      box(x, wx, y(74), T.bayW, 58, '#101316', 'rgba(' + O + ',.45)');
      if (d) {
        x.fillStyle = 'rgba(255,217,165,.45)'; x.fillRect(wx + 16 - d, y(72), d * 2, 56);
        x.fillStyle = 'rgba(255,217,165,.12)'; x.fillRect(wx + 16 - d - 4, y(16), d * 2 + 8, 14);
      }
      x.fillStyle = 'rgba(255,217,165,.25)'; x.fillRect(wx + 3 - d, y(66), 9, 14); x.fillRect(wx + 20 + d, y(66), 9, 14);
      continue;
    }
    // a lit window and whoever sits in it this time: nobody, one person, now and then two
    x.fillStyle = 'rgba(255,217,165,.32)'; x.fillRect(wx, y(84), 32, 24);
    const who = riders[o.c * 6 + i];
    if (who?.on) {
      x.save(); x.beginPath(); x.rect(wx, y(84), 32, 24); x.clip();
      const two = who.phase > 7.5;
      drawRider(x, who.kind, wx + (two ? 9 : 16), y(60), o.t, { sit: true, flip: who.flip, ps: 2, phase: who.phase });
      if (two) drawRider(x, riders[(o.c * 6 + i + 7) % riders.length].kind, wx + 23, y(60), o.t, { sit: true, flip: !who.flip, ps: 2, phase: who.phase + 3 });
      x.restore();
    }
  }
  if (o.c === 0) {
    x.fillStyle = 'rgba(255,240,215,.95)'; x.fillRect(c0 + 3, y(30), 5, 4);
    box(x, c0 + 6, y(98), 104, 11, '#050302');
    if (o.dest) text(x, '0 > ' + o.dest, c0 + 58, y(92.5), 'rgba(255,136,0,.9)', 7, '600');
  }
}

/**
 * A LINE 0 car true to the player's scale (Tommi, 2026-10-15: one scale; the riders in the windows must
 * look natural): 20 m long (533), 3.75 m from the rail to the roof, the floor 1.1 m up. Four doors a side,
 * long windows between them from sill height (0.9 m over the floor) to just under the ceiling, and the
 * inside seen through them: warm light, the ceiling's light strip, seat backs, the far side's windows
 * with the city in them, and the riders at their real size and place, seated (head and shoulders over
 * the sill) or standing by the doors holding a strap, some looking at a phone, some seats empty;
 * reflections slide across the glass. The opening glide's train (title/finale.ts). The platforms keep
 * `drawTrainCar` (their cars are drawn to the platform scenes' own scale).
 */
export const METRO = { len: 533, top: 100, floor: 30, sill: 54, head: 84, doors: [0.12, 0.37, 0.63, 0.88], doorW: 36 };

export interface MetroLook {
  /** Animation clock (frames): standing riders sway, a phone lights a face. */
  t: number;
  /** Which car (0 leads), and a seed for who rides in it. */
  c: number;
  seed?: number;
  /** The lead car's destination board. */
  dest?: string;
  /** Where the car is (its world x): the reflections slide across the glass as it moves. */
  ox?: number;
  /** A plate by the last door (CAR 3). */
  plate?: string;
  still?: boolean;
}

const SKIN = ['#d8a880', '#b07850', '#8a5a38', '#e0b890', '#6a4228'];
const CLOTH = ['#2a2430', '#3a2a2a', '#22303a', '#3a3424', '#4a2030', '#2a3a2e', '#1e1e24'];

/** One rider inside, seen through the glass: standing by a door or seated, facing left or right. `top` is the head's top. */
function rider(x: CanvasRenderingContext2D, cx: number, top: number, r: () => number, stand: boolean, t: number, still: boolean) {
  const skin = SKIN[Math.floor(r() * SKIN.length)], cloth = CLOTH[Math.floor(r() * CLOTH.length)], face = r() < 0.5 ? -1 : 1;
  const hair = Math.floor(r() * 5), phone = r() < 0.35, sway = still || !stand ? 0 : Math.round(Math.sin(t * 0.03 + cx) * 0.6);
  const hx = cx + sway;
  // drawn a fifth under the scenes' chunky heads, so a rider reads as a person of 1.8 m in a 20 m car
  x.save(); x.translate(hx, top); x.scale(0.8, 0.8); x.translate(-hx, -top);
  // shoulders and the body going down out of sight under the sill
  x.fillStyle = cloth; x.beginPath(); x.moveTo(hx - 13, top + 40); x.lineTo(hx - 12, top + 22); x.quadraticCurveTo(hx, top + 16, hx + 12, top + 22); x.lineTo(hx + 13, top + 40); x.closePath(); x.fill();
  x.fillStyle = 'rgba(255,200,140,.18)'; x.fillRect(hx - 12 * face - (face > 0 ? 0 : 1), top + 22, 1, 14);
  // the neck, the head
  x.fillStyle = skin; x.fillRect(hx - 2, top + 13, 5, 6);
  x.beginPath(); x.ellipse(hx, top + 7.5, 6, 7.5, 0, 0, 7); x.fill();
  x.fillRect(hx + face * 5, top + 7, 2, 2);
  // hair: short, long, a bun, a cap, a hood
  const hc = ['#1a1210', '#3a2418', '#0e0c10', '#5a4030', '#2a2a2e'][hair];
  x.fillStyle = hc;
  if (hair === 0) { x.beginPath(); x.ellipse(hx - face, top + 4, 6.5, 4.5, 0, Math.PI, 0); x.fill(); }
  else if (hair === 1) { x.beginPath(); x.ellipse(hx - face, top + 5, 6.8, 5, 0, Math.PI, 0); x.fill(); x.fillRect(hx - face * 6 - 2, top + 4, 4, 14); }
  else if (hair === 2) { x.beginPath(); x.ellipse(hx - face, top + 4, 6.5, 4.5, 0, Math.PI, 0); x.fill(); x.beginPath(); x.arc(hx - face * 6, top + 2, 3, 0, 7); x.fill(); }
  else if (hair === 3) { x.fillStyle = cloth; x.fillRect(hx - 7, top, 13, 4); x.fillRect(Math.min(hx + face * 4, hx + face * 10), top + 3, 6, 2); }
  else { x.fillStyle = cloth; x.beginPath(); x.ellipse(hx, top + 6, 8, 9, 0, Math.PI * 0.9, Math.PI * 2.1); x.fill(); }
  // a phone: held up, its light on the face
  if (phone) {
    x.fillStyle = 'rgba(210,225,255,.85)'; x.fillRect(hx + face * 7 - 1, top + 20, 3, 4);
    x.fillStyle = 'rgba(200,220,255,.18)'; x.fillRect(hx - 6, top + 6, 12, 8);
  }
  // standing: the arm up to the strap
  if (stand) { x.fillStyle = cloth; x.fillRect(hx - face * 9 - 1, top - 6, 3, 28); x.fillStyle = skin; x.fillRect(hx - face * 9 - 1, top - 9, 3, 4); }
  x.restore();
}

/** A metro car true to scale, its left edge at `c0`, heights from the rail through `y`. */
export function drawMetroCar(x: CanvasRenderingContext2D, c0: number, y: (h: number) => number, o: MetroLook) {
  const T = METRO, L = T.len, r = rng((o.seed ?? 31) * 97 + o.c * 13), still = !!o.still;
  const doorX = T.doors.map((d) => Math.round(c0 + d * L - T.doorW / 2));
  // the body: dark, the rounded nose on the lead car
  x.fillStyle = '#14171a'; x.beginPath();
  if (o.c === 0) { x.moveTo(c0 + 26, y(T.top)); x.lineTo(c0 + L, y(T.top)); x.lineTo(c0 + L, y(14)); x.lineTo(c0 + 6, y(14)); x.quadraticCurveTo(c0, y(60), c0 + 26, y(T.top)); }
  else x.rect(c0, y(T.top), L, T.top - 14);
  x.fill();
  // the inside, through the window band (one long strip; the pillars and doors go over it)
  const wTop = y(T.head), wBot = y(T.sill), w0 = c0 + (o.c === 0 ? 34 : 8), w1 = c0 + L - 8;
  x.save(); x.beginPath(); x.rect(w0, wTop, w1 - w0, wBot - wTop); x.clip();
  const g = x.createLinearGradient(0, wTop, 0, wBot); g.addColorStop(0, '#ffe2b0'); g.addColorStop(0.25, '#e8b878'); g.addColorStop(1, '#a8703c');
  x.fillStyle = g; x.fillRect(w0, wTop, w1 - w0, wBot - wTop);
  // the far side: its windows (the city's dark and lights in them), the ceiling's light strip
  x.fillStyle = 'rgba(40,24,40,.55)'; for (let k = w0 + 10; k < w1; k += 64) x.fillRect(k, wTop + 6, 50, 18);
  x.fillStyle = 'rgba(255,200,120,.45)'; for (let k = w0 + 14; k < w1; k += 23) x.fillRect(k + ((k * 7) % 11), wTop + 8 + ((k * 13) % 12), 2, 2);
  x.fillStyle = 'rgba(255,250,230,.95)'; x.fillRect(w0, wTop, w1 - w0, 2);
  x.fillStyle = 'rgba(120,100,90,.5)'; x.fillRect(w0, wTop + 4, w1 - w0, 1);
  // straps from the rail, near the doors
  for (const d of doorX) for (const k of [-34, -18, T.doorW + 10, T.doorW + 26]) { x.fillStyle = 'rgba(60,50,50,.7)'; x.fillRect(d + k, wTop + 4, 1, 8); x.fillRect(d + k - 2, wTop + 12, 5, 4); }
  // the riders: seated between the doors (seat backs, some empty), standing by the doors
  for (let s = 0; s < 3; s++) {
    const a = doorX[s] + T.doorW + 10, b = doorX[s + 1] - 10;
    x.fillStyle = 'rgba(70,40,40,.6)'; for (let k = a; k + 22 < b; k += 30) x.fillRect(k, wBot - 6, 24, 6);
    for (let k = a + 12; k < b - 8; k += 30) if (r() < 0.55) rider(x, k + Math.round(r() * 4), y(T.floor + 38), r, false, o.t, still);
  }
  for (const d of doorX) for (const side of [-1, 1]) if (r() < 0.45) rider(x, d + T.doorW / 2 + side * (T.doorW / 2 + 14), y(T.floor + 48), r, true, o.t, still);
  // the glass: a cool sheen at the top, reflections sliding past
  const sh = x.createLinearGradient(0, wTop, 0, wBot); sh.addColorStop(0, 'rgba(150,190,230,.18)'); sh.addColorStop(0.5, 'rgba(150,190,230,0)');
  x.fillStyle = sh; x.fillRect(w0, wTop, w1 - w0, wBot - wTop);
  const off = ((((o.ox ?? 0) * 0.6) % 240) + 240) % 240;
  x.fillStyle = 'rgba(255,240,220,.16)';
  for (let k = w0 - 240 + off; k < w1 + 40; k += 240) { x.beginPath(); x.moveTo(k, wBot); x.lineTo(k + 14, wBot); x.lineTo(k + 34, wTop); x.lineTo(k + 20, wTop); x.closePath(); x.fill(); x.fillRect(k + 40, wTop, 4, wBot - wTop); }
  x.restore();
  // the pillars between the panes
  x.fillStyle = '#14171a'; for (let k = w0 + 96; k < w1 - 20; k += 96) x.fillRect(k, wTop, 3, wBot - wTop);
  // the doors: shut, their windows onto the same warm inside
  for (const d of doorX) {
    x.fillStyle = '#101316'; x.fillRect(d, y(T.floor + 52), T.doorW, 52 + T.floor - 16);
    x.fillStyle = 'rgba(255,214,160,.55)'; x.fillRect(d + 3, y(T.floor + 48), T.doorW / 2 - 5, 26); x.fillRect(d + T.doorW / 2 + 2, y(T.floor + 48), T.doorW / 2 - 5, 26);
    x.fillStyle = 'rgba(' + O + ',.55)'; x.fillRect(d + T.doorW / 2, y(T.floor + 52), 1, 52 + T.floor - 16);
  }
  // the rim, the waist stripe under the windows, the roof line, the skirt
  x.strokeStyle = 'rgba(' + O + ',.6)'; x.lineWidth = 1.5; x.strokeRect(c0 + 0.5, y(T.top) + 0.5, L - 1, T.top - 15);
  x.fillStyle = 'rgba(' + O + ',.55)'; x.fillRect(c0 + (o.c === 0 ? 10 : 1), y(T.sill - 6), L - (o.c === 0 ? 11 : 2), 3);
  x.fillStyle = 'rgba(255,200,150,.25)'; x.fillRect(c0 + 26, y(T.top), L - 27, 1);
  x.fillStyle = '#0a0b0d'; x.fillRect(c0 + 4, y(18), L - 8, 6);
  // the 0 roundel by the first door, a plate by the last
  const rx = doorX[0] + T.doorW + 18;
  x.strokeStyle = 'rgba(' + O + ',.8)'; x.lineWidth = 2; x.beginPath(); x.arc(rx, y(T.sill - 22), 7, 0, 7); x.stroke();
  text(x, '0', rx, y(T.sill - 22) + 0.5, 'rgba(' + O + ',.9)', 8, '600');
  if (o.plate) { box(x, doorX[3] - 46, y(T.sill - 14), 38, 12, '#050302'); text(x, o.plate, doorX[3] - 27, y(T.sill - 8) + 0.5, 'rgba(255,217,165,.8)', 7, '600'); }
  if (o.c === 0) {
    x.fillStyle = 'rgba(255,240,215,.95)'; x.fillRect(c0 + 6, y(34), 7, 6);
    x.fillStyle = 'rgba(150,190,230,.4)'; x.beginPath(); x.moveTo(c0 + 26, y(T.top - 6)); x.lineTo(c0 + 34, y(T.top - 6)); x.lineTo(c0 + 34, y(T.sill + 2)); x.lineTo(c0 + 10, y(T.sill + 2)); x.closePath(); x.fill();
    box(x, c0 + 40, y(T.top - 2), 110, 11, '#050302');
    if (o.dest) text(x, '0 > ' + o.dest, c0 + 95, y(T.top - 7.5), 'rgba(255,136,0,.9)', 7, '600');
  }
}
