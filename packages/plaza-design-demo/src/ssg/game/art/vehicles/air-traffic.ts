/**
 * Set pieces (ART-GUIDE §12): the traffic in the city's sky (CITY.md "Ways to move: flying"). Each
 * kind has its look and its job, so a lane reads at a glance:
 *
 * - `pod`: a private air taxi (rounded pod on four ducted fans, white nav light ahead, red behind);
 * - `taxi`: a public sky taxi between pads, yellow, its TAXI light on the roof;
 * - `patrol`: a Registry patrol, black and angular, red and blue strobes, a searchlight;
 * - `shuttle`: a corporate shuttle to and from the Spire, a long pale wedge with a lit window strip;
 * - `hauler`: a slow, low cargo hauler, four big fans and a 40 ft box slung under it;
 * - `medevac`: white, a red band, red and white strobes, fast;
 * - `dropship`: military, a heavy grey hull on two tilted engines, skids, a dim red bay light;
 * - `escort`: a military escort drone, a dark wedge with one red eye.
 *
 * Plus the delivery `drone` (quad rotors, a parcel), and the ad blimp cycling the Registry's adverts.
 *
 * TRUE TO THE PLAYER'S SCALE (vehicles.ts: a metre is about 26.7 units): `CRAFT_LEN` is each one's
 * length. Drawn in its own frame, origin at the craft's middle, heights up (y = -h); `face` 1 flies
 * right. `t` is the animation clock in frames; `still` holds rotors and strobes. `scale`: the screen
 * size of one unit (the caller's), so the lights never shrink below a pixel or two far off.
 *
 * The AIR class of the vehicle kit: `drawAircraft` takes any kind (the craft, the drone, the blimp);
 * `livery` (kit.ts) adds a fleet stripe, number, QR plate and the autonomy cues; `thrust` lights the
 * fans of a hovering pod; `phase` offsets its strobes. `drawCab` is the same sky taxi at a stand's
 * small scale (the taxi pads and the taxi flight). Placeable as `vehicle.air` (air-vehicle.ts).
 */

import { box, O, PAPER, RED } from '../core/primitives';
import { drawSprite, HULL, SPR } from '../core/sprites';
import { BOX40, container, type Crate } from "../props/containers";
import { frameView } from "../core/view";
import { drawLivery, type Livery, type LiveryBox, type Extent } from "./kit";

const R = Math.round;

export type CraftKind = 'pod' | 'taxi' | 'patrol' | 'shuttle' | 'hauler' | 'medevac' | 'dropship' | 'escort';
/** Each craft's length in scene units (5 m pod .. 26 m dropship). */
export const CRAFT_LEN: Record<CraftKind, number> = { pod: 140, taxi: 160, patrol: 180, shuttle: 380, hauler: 470, medevac: 240, dropship: 700, escort: 150 };

export interface CraftLook {
  t: number;
  face?: 1 | -1;
  still?: boolean;
  /** The hull's paint (pods come in colours; the rest have their own). */
  paint?: string;
  /** Screen units per frame unit (the caller's scale): lights keep a minimum size. */
  scale?: number;
  /** The hauler's load (a 40 ft box); null flies empty. */
  box?: Crate | null;
  /** The patrol's searchlight on. */
  beam?: boolean;
  /** Fleet livery and autonomy cues. */
  livery?: Livery;
  /** Hovering: the fans glow and flicker under a pod. */
  thrust?: boolean;
  /** Frames added to the strobes' clock, so a lane of craft does not blink in step. */
  phase?: number;
}

/** Each craft's extent (units, heights up), for bounds and the depth bands' darkening. Light washes are outside it. */
export const CRAFT_EXTENT: Record<CraftKind, Extent> = {
  pod: { x0: -70, x1: 70, top: 47, bottom: 33 }, taxi: { x0: -80, x1: 80, top: 54, bottom: 38 },
  patrol: { x0: -90, x1: 90, top: 36, bottom: 22 }, shuttle: { x0: -190, x1: 190, top: 44, bottom: 6 },
  hauler: { x0: -235, x1: 235, top: 54, bottom: 139 }, medevac: { x0: -120, x1: 120, top: 50, bottom: 18 },
  dropship: { x0: -350, x1: 350, top: 102, bottom: 46 }, escort: { x0: -75, x1: 75, top: 34, bottom: 10 },
};
/** Where a livery sits on each hull. */
function liveryBox(kind: CraftKind): Omit<LiveryBox, 'face' | 't' | 'still'> {
  if (kind === 'pod' || kind === 'taxi') { const k = kind === 'taxi' ? 4.2 : 3.7; return { l: -16 * k, len: 32 * k, belt: 2 * k, roof: 10 * k }; }
  const L = CRAFT_LEN[kind] / 2;
  return ({ patrol: { l: -L + 10, len: 2 * L - 40, belt: 8, roof: 27 }, shuttle: { l: -L + 20, len: 2 * L - 80, belt: 16, roof: 39 },
    hauler: { l: -L + 60, len: 2 * L - 120, belt: 4, roof: 46 }, medevac: { l: -L + 10, len: 2 * L - 20, belt: 24, roof: 41 },
    dropship: { l: -L + 40, len: 2 * L - 120, belt: 30, roof: 94 }, escort: { l: -L + 10, len: 2 * L - 30, belt: 2, roof: 16 } } as const)[kind];
}

/** A light at (lx, ly), at least `min` screen units across. */
function dot(x: CanvasRenderingContext2D, lx: number, ly: number, col: string, size: number, o: CraftLook, min = 1.4) {
  const s = Math.max(size, min / (o.scale ?? 1));
  x.fillStyle = col; x.fillRect(lx - s / 2, ly - s / 2, s, s);
}
/** A soft glow round a light (strobes, beacons). */
function halo(x: CanvasRenderingContext2D, lx: number, ly: number, rgb: string, r: number, a: number) {
  const g = x.createRadialGradient(lx, ly, 0, lx, ly, r); g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
  x.fillStyle = g; x.fillRect(lx - r, ly - r, r * 2, r * 2);
}
const blinkOn = (o: CraftLook, period: number, phase = 0) => o.still || Math.floor((o.t + phase) / period) % 2 === 0;

/** Any craft of the city's sky, by kind. */
export function drawCraft(x: CanvasRenderingContext2D, kind: CraftKind, look: CraftLook) {
  const o = look.phase ? { ...look, t: look.t + look.phase } : look;
  x.save(); if ((o.face ?? 1) < 0) x.scale(-1, 1);
  if (kind === 'pod' || kind === 'taxi') pod(x, o, kind === 'taxi');
  else if (kind === 'patrol') patrol(x, o);
  else if (kind === 'shuttle') shuttle(x, o);
  else if (kind === 'hauler') hauler(x, o);
  else if (kind === 'medevac') medevac(x, o);
  else if (kind === 'dropship') dropship(x, o);
  else escort(x, o);
  drawLivery(x, o.livery, { ...liveryBox(kind), face: o.face ?? 1, t: o.t, still: o.still });
  x.restore();
}

/** A pod: rounded body, cabin glass, ducted fans fore and aft, a warm trail. The taxi: yellow, the TAXI light. */
function pod(x: CanvasRenderingContext2D, o: CraftLook, taxi: boolean) {
  const k = taxi ? 4.2 : 3.7, p = taxi ? o.paint ?? '#e8b830' : o.paint ?? '#e8e0d0';
  if (o.thrust) {
    // the fans' downwash, lit warm, flickering
    const on = o.still || Math.sin(o.t * 0.3) > 0, a = on ? 0.38 : 0.26;
    for (const fx of [-15 * k, 13 * k]) { const g = x.createRadialGradient(fx, 9 * k, 1, fx, 9 * k, 7 * k); g.addColorStop(0, 'rgba(255,190,110,' + a + ')'); g.addColorStop(1, 'rgba(255,190,110,0)'); x.fillStyle = g; x.fillRect(fx - 7 * k, 2 * k, 14 * k, 14 * k); }
  }
  const g = x.createLinearGradient(-40 * k, 0, -14 * k, 0); g.addColorStop(0, 'rgba(255,120,170,0)'); g.addColorStop(1, 'rgba(255,120,170,.4)');
  x.fillStyle = g; x.fillRect(-40 * k, 1 * k, 26 * k, 3 * k);
  x.save(); x.scale(k, k);
  x.fillStyle = p; x.beginPath(); x.moveTo(-16, 4); x.lineTo(-18, -2); x.quadraticCurveTo(-8, -12, 8, -10); x.quadraticCurveTo(18, -6, 18, 2); x.lineTo(14, 6); x.lineTo(-14, 6); x.closePath(); x.fill();
  x.fillStyle = 'rgba(126,210,240,.75)'; x.beginPath(); x.moveTo(-2, -9); x.quadraticCurveTo(10, -9, 15, -3); x.lineTo(-2, -3); x.closePath(); x.fill();
  if (taxi) { x.fillStyle = 'rgba(255,240,200,.6)'; x.fillRect(-12, -6, 9, 3); x.fillStyle = '#1a1208'; for (let i = -13; i < 12; i += 4) x.fillRect(i, 1, 2, 1); }
  x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(-14, 3, 28, 2);
  const spin = o.still ? 0 : Math.floor(o.t / 2) % 2;
  for (const fx of [-15, 13]) { x.fillStyle = '#3a3a42'; x.fillRect(fx - 5, 5, 10, 3); x.fillStyle = 'rgba(220,230,255,.45)'; x.fillRect(fx - 6 + spin * 2, 8, 8, 1); }
  x.restore();
  if (taxi) { dot(x, -6 * k, -12 * k, '#ffe680', 6, o, 1.6); }
  dot(x, 18 * k, -1 * k, '#fff6d0', 6, o);
  dot(x, -19 * k, -2 * k, blinkOn(o, 12) ? 'rgba(' + RED + ',1)' : 'rgba(' + RED + ',.3)', 6, o);
}

/** The Registry's patrol: an angular black hull, red and blue strobes taking turns, a searchlight cone. */
function patrol(x: CanvasRenderingContext2D, o: CraftLook) {
  const L = CRAFT_LEN.patrol / 2;
  if (o.beam) {
    const g = x.createLinearGradient(0, 10, 0, 320); g.addColorStop(0, 'rgba(220,235,255,.22)'); g.addColorStop(1, 'rgba(220,235,255,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(20, 10); x.lineTo(-70, 320); x.lineTo(150, 320); x.lineTo(34, 10); x.closePath(); x.fill();
  }
  x.fillStyle = '#121218'; x.beginPath(); x.moveTo(-L, -6); x.lineTo(-L + 30, -26); x.lineTo(L - 50, -28); x.lineTo(L, -4); x.lineTo(L - 20, 14); x.lineTo(-L + 10, 14); x.closePath(); x.fill();
  x.fillStyle = 'rgba(190,200,230,.25)'; x.fillRect(-L + 30, -26, L * 2 - 80, 2);
  x.fillStyle = 'rgba(140,170,220,.5)'; x.beginPath(); x.moveTo(L - 66, -24); x.lineTo(L - 40, -24); x.lineTo(L - 22, -6); x.lineTo(L - 66, -6); x.closePath(); x.fill();
  x.fillStyle = '#2a2a34'; x.fillRect(-L + 16, 12, 40, 10); x.fillRect(L - 70, 12, 40, 10);
  x.fillStyle = 'rgba(232,222,196,.55)'; x.fillRect(-L + 40, -2, 70, 6);
  const ph = o.still ? 0 : Math.floor(o.t / 6) % 4, red = ph === 0 || ph === 1, blue = ph === 2 || ph === 3;
  dot(x, -14, -32, red ? 'rgba(' + RED + ',1)' : 'rgba(' + RED + ',.25)', 10, o, 2);
  dot(x, 14, -32, blue ? 'rgba(80,140,255,1)' : 'rgba(80,140,255,.25)', 10, o, 2);
  if (!o.still) { if (red) halo(x, -14, -32, RED, 46, 0.35); else halo(x, 14, -32, '80,140,255', 46, 0.35); }
  dot(x, L, -2, '#fff6d0', 5, o);
}

/** A corporate shuttle: a long pale wedge, a strip of lit windows, a soft engine glow aft. */
function shuttle(x: CanvasRenderingContext2D, o: CraftLook) {
  const L = CRAFT_LEN.shuttle / 2;
  const g = x.createLinearGradient(-L - 120, 0, -L, 0); g.addColorStop(0, 'rgba(160,220,255,0)'); g.addColorStop(1, 'rgba(160,220,255,.35)');
  x.fillStyle = g; x.fillRect(-L - 120, -12, 120, 12);
  x.fillStyle = o.paint ?? '#d8d4cc'; x.beginPath(); x.moveTo(-L, -20); x.lineTo(-L + 40, -38); x.lineTo(L - 90, -40); x.quadraticCurveTo(L, -30, L, -8); x.lineTo(L - 30, 6); x.lineTo(-L + 20, 6); x.closePath(); x.fill();
  x.fillStyle = '#1a1a20'; x.fillRect(-L + 20, 0, L * 2 - 60, 6);
  x.fillStyle = 'rgba(255,240,210,.8)'; for (let i = -L + 70; i < L - 100; i += 22) x.fillRect(i, -28, 12, 8);
  x.fillStyle = 'rgba(120,180,220,.6)'; x.beginPath(); x.moveTo(L - 80, -36); x.quadraticCurveTo(L - 20, -30, L - 10, -14); x.lineTo(L - 80, -14); x.closePath(); x.fill();
  x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(-L + 30, -12, L * 2 - 70, 2);
  dot(x, L - 2, -10, '#fff6d0', 6, o);
  dot(x, -L + 4, -22, blinkOn(o, 20, 7) ? 'rgba(' + RED + ',1)' : 'rgba(' + RED + ',.3)', 6, o);
  dot(x, -L + 40, -42, blinkOn(o, 30) ? 'rgba(240,250,255,1)' : 'rgba(240,250,255,.2)', 5, o);
}

/** A cargo hauler: a flat frame on four big fans, slow and low, a 40 ft box slung under it on four cables. */
function hauler(x: CanvasRenderingContext2D, o: CraftLook) {
  const L = CRAFT_LEN.hauler / 2;
  if (o.box !== null) {
    const b: Crate = { ...(o.box ?? { w: BOX40.w, p: 6, seed: 707 }), w: BOX40.w, h: BOX40.h };
    x.strokeStyle = 'rgba(255,217,165,.45)'; x.lineWidth = 2; x.beginPath();
    for (const cx of [-140, 140]) { x.moveTo(cx * 0.7, 14); x.lineTo(cx, 70); }
    x.stroke();
    container(x, frameView(o.t), -b.w / 2, -70 - b.h!, b);
  }
  x.fillStyle = '#2a2420'; x.fillRect(-L + 60, -18, L * 2 - 120, 30);
  x.fillStyle = '#3a3028'; x.fillRect(-60, -46, 140, 30);
  x.fillStyle = 'rgba(255,214,150,.6)'; x.fillRect(30, -40, 36, 14);
  x.fillStyle = 'rgba(255,200,60,.5)'; for (let i = -L + 70; i < L - 70; i += 36) x.fillRect(i, 8, 18, 3);
  const spin = o.still ? 0 : Math.floor(o.t / 3) % 2;
  for (const fx of [-L + 30, -L + 110, L - 110, L - 30]) {
    x.fillStyle = '#1c1814'; x.fillRect(fx - 34, -30, 68, 22);
    x.fillStyle = 'rgba(220,230,255,.35)'; x.fillRect(fx - 30 + spin * 8, -8, 52, 2);
  }
  dot(x, L, -16, '#fff6d0', 6, o);
  dot(x, -L, -16, blinkOn(o, 16) ? 'rgba(' + RED + ',1)' : 'rgba(' + RED + ',.3)', 6, o);
  dot(x, 0, -50, blinkOn(o, 10, 3) ? '#ffa020' : '#5a2a00', 8, o, 1.6);
}

/** The medevac: white, the red band, a red and white strobe, a lit cabin. */
function medevac(x: CanvasRenderingContext2D, o: CraftLook) {
  const L = CRAFT_LEN.medevac / 2;
  x.fillStyle = '#e8e4dc'; x.beginPath(); x.moveTo(-L, -10); x.lineTo(-L + 30, -40); x.lineTo(L - 50, -42); x.quadraticCurveTo(L, -34, L, -6); x.lineTo(L - 20, 10); x.lineTo(-L + 20, 10); x.closePath(); x.fill();
  x.fillStyle = '#c8202a'; x.fillRect(-L + 10, -14, L * 2 - 20, 8);
  x.fillStyle = 'rgba(255,240,220,.7)'; x.fillRect(-40, -34, 60, 14);
  x.fillStyle = 'rgba(120,180,220,.6)'; x.fillRect(L - 46, -36, 30, 18);
  x.fillStyle = '#2a2a30'; x.fillRect(-L + 20, 10, 50, 8); x.fillRect(L - 80, 10, 50, 8);
  const on = blinkOn(o, 8);
  dot(x, -10, -46, on ? 'rgba(' + RED + ',1)' : 'rgba(255,255,255,1)', 10, o, 2);
  if (!o.still) halo(x, -10, -46, on ? RED : '255,255,255', 50, 0.4);
  dot(x, L, -6, '#fff6d0', 6, o);
}

/** The dropship: a heavy grey hull, two tilted engines with their glow, skids, a dim red light in the bay. */
function dropship(x: CanvasRenderingContext2D, o: CraftLook) {
  const L = CRAFT_LEN.dropship / 2;
  for (const ex of [-L + 120, L - 160]) {
    const g = x.createLinearGradient(0, 30, 0, 160); g.addColorStop(0, 'rgba(160,190,255,.3)'); g.addColorStop(1, 'rgba(160,190,255,0)');
    x.fillStyle = g; x.fillRect(ex - 30, 30, 60, 130);
  }
  x.fillStyle = '#26282c'; x.beginPath(); x.moveTo(-L, -30); x.lineTo(-L + 60, -90); x.lineTo(L - 160, -96); x.lineTo(L - 40, -60); x.lineTo(L, -20); x.lineTo(L - 50, 26); x.lineTo(-L + 40, 26); x.closePath(); x.fill();
  x.fillStyle = 'rgba(200,210,220,.18)'; x.fillRect(-L + 60, -90, L * 2 - 220, 3);
  x.fillStyle = 'rgba(0,0,0,.35)'; for (let i = -L + 80; i < L - 60; i += 70) x.fillRect(i, -84, 2, 104);
  x.fillStyle = 'rgba(255,60,50,.35)'; x.fillRect(-120, -40, 180, 50);
  x.fillStyle = 'rgba(140,170,200,.45)'; x.beginPath(); x.moveTo(L - 130, -86); x.lineTo(L - 56, -60); x.lineTo(L - 40, -40); x.lineTo(L - 130, -40); x.closePath(); x.fill();
  for (const ex of [-L + 120, L - 160]) { x.save(); x.translate(ex, 10); x.rotate(-0.18); x.fillStyle = '#1c1e22'; x.fillRect(-36, -30, 72, 60); x.fillStyle = 'rgba(160,190,255,.5)'; x.fillRect(-30, 26, 60, 4); x.restore(); }
  x.fillStyle = '#1a1a1e'; x.fillRect(-L + 70, 40, L * 2 - 180, 6); x.fillRect(-L + 90, 26, 6, 16); x.fillRect(L - 130, 26, 6, 16);
  dot(x, -L + 2, -30, blinkOn(o, 24) ? 'rgba(' + RED + ',1)' : 'rgba(' + RED + ',.25)', 8, o, 1.8);
  dot(x, L - 2, -20, 'rgba(255,246,208,.9)', 6, o);
  dot(x, 0, -98, blinkOn(o, 24, 12) ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,.2)', 7, o, 1.6);
}

/** An escort drone: a dark wedge, short wings, one red eye. */
function escort(x: CanvasRenderingContext2D, o: CraftLook) {
  const L = CRAFT_LEN.escort / 2;
  x.fillStyle = '#1e2024'; x.beginPath(); x.moveTo(-L, -4); x.lineTo(-L + 30, -20); x.lineTo(L - 20, -12); x.lineTo(L, 0); x.lineTo(L - 30, 10); x.lineTo(-L + 10, 8); x.closePath(); x.fill();
  x.fillStyle = '#2a2c32'; x.beginPath(); x.moveTo(-30, -6); x.lineTo(-60, -34); x.lineTo(-10, -12); x.closePath(); x.fill();
  x.fillStyle = 'rgba(160,190,255,.35)'; x.fillRect(-L - 30, -6, 30, 6);
  dot(x, L - 14, -4, 'rgba(' + RED + ',1)', 6, o, 1.6);
}

/** A delivery drone (about 1 m): four rotors on arms, the body, a blinking light, a parcel on a line. */
export function drawDrone(x: CanvasRenderingContext2D, o: { t: number; still?: boolean; cargo?: boolean }) {
  const s = o.still ? 0 : Math.floor(o.t / 2) % 2;
  x.fillStyle = '#2a2d33'; x.fillRect(-6, -2, 12, 4); x.fillRect(-10, -3, 20, 1);
  x.fillStyle = 'rgba(200,220,255,.5)'; x.fillRect(-13 + s, -5, 6, 1); x.fillRect(7 - s, -5, 6, 1);
  x.fillStyle = '#4a4e56'; x.fillRect(-11, -4, 2, 2); x.fillRect(9, -4, 2, 2);
  x.fillStyle = o.still || Math.floor(o.t / 8) % 2 ? 'rgba(' + RED + ',.95)' : 'rgba(255,190,120,.8)'; x.fillRect(-1, 2, 2, 2);
  if (o.cargo) { x.strokeStyle = 'rgba(255,217,165,.4)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, 2); x.lineTo(0, 10); x.stroke(); x.fillStyle = '#a0703c'; x.fillRect(-4, 10, 8, 7); }
}

/** The Registry's dry adverts the blimp cycles through (one message per panel). */
const ADS = ['REGISTRY · VERIFY TODAY', 'SCORE 600+ · PRIORITY LANE', 'UNREGISTERED? REPORT TO SECTOR 4', 'PREMIUM CITIZENSHIP · 12T/MONTH'];
/** The blimp's frame units to scene units: it is about 70 m long. */
export const BLIMP_SCALE = 10;

/** The ad blimp (in its own units, `BLIMP_SCALE` to the scene's): the envelope with fins, the gondola under it, a lit panel down its side. */
export function drawBlimp(x: CanvasRenderingContext2D, o: { t: number; still?: boolean }) {
  const L = 92, Hh = 24;
  x.fillStyle = '#2a1830'; x.beginPath(); x.ellipse(0, 0, L, Hh, 0, 0, Math.PI * 2); x.fill();
  // fins at the tail
  x.beginPath(); x.moveTo(-L + 8, -4); x.lineTo(-L - 10, -Hh - 4); x.lineTo(-L - 4, -2); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(-L + 8, 4); x.lineTo(-L - 10, Hh + 4); x.lineTo(-L - 4, 2); x.closePath(); x.fill();
  // the dawn on its back, a seam along it
  x.strokeStyle = 'rgba(255,170,120,.4)'; x.lineWidth = 1; x.beginPath(); x.ellipse(0, 0, L - 1, Hh - 1, 0, Math.PI * 1.08, Math.PI * 1.92); x.stroke();
  x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(-L + 10, 2, L * 2 - 20, 1);
  // the gondola, lit
  x.fillStyle = '#1a0e20'; x.fillRect(-14, Hh - 2, 28, 9); x.fillStyle = 'rgba(255,210,150,.6)'; for (let i = -11; i < 11; i += 5) x.fillRect(i, Hh + 1, 3, 3);
  // the ad panel: a dark screen on the envelope, a message every few seconds
  const n = o.still ? 0 : Math.floor(o.t / 240) % ADS.length, msg = ADS[n];
  x.fillStyle = '#0c0610'; x.fillRect(-58, -9, 116, 16);
  x.strokeStyle = 'rgba(255,136,0,.45)'; x.strokeRect(-57.5, -8.5, 115, 15);
  x.save(); x.font = '600 7px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = n % 2 ? 'rgba(255,217,165,.9)' : 'rgba(255,150,40,.95)'; x.fillText(msg, 0, -1, 108); x.restore();
  x.fillStyle = o.still || Math.floor(o.t / 20) % 2 ? 'rgba(' + RED + ',1)' : 'rgba(' + RED + ',.3)'; x.fillRect(R(L - 3), -1, 2, 2);
}

/**
 * The city's classic sky ships: pixel-sprite craft that fly the far sky lanes of every outdoor scene
 * (the `spinner` car, the long `freighter`, the red-eyed `skydrone`), and the old sky `cab` of the taxi
 * stands (a squat cab with a warm lit cabin, a yellow roof light and glowing thrusters). They keep their
 * own hand-drawn look inside the air class. `SPRITE_PX` units per sprite pixel puts a spinner near a pod's length.
 */
const SPRITE_PX = 9;
const SPRITE_SHIPS = { spinner: { rows: SPR.spinner, glow: 'rgba(0,255,255,.3)' }, freighter: { rows: SPR.freighter, glow: 'rgba(0,255,255,.3)' }, skydrone: { rows: SPR.drone, glow: 'rgba(255,42,68,.5)' } } as const;
type SpriteShip = keyof typeof SPRITE_SHIPS;
/** Units per pixel of the old cab drawing (about 30 pixels across). */
const CAB_K = 4.2;
/** The air class: every kind the kit flies. */
export type AirKind = CraftKind | 'drone' | 'blimp' | SpriteShip | 'cab';
export const AIR_KINDS: readonly AirKind[] = ['pod', 'taxi', 'patrol', 'shuttle', 'hauler', 'medevac', 'dropship', 'escort', 'drone', 'blimp', 'spinner', 'freighter', 'skydrone', 'cab'];
const spriteExtent = (rows: readonly string[]): Extent => ({ x0: -rows[0].length * SPRITE_PX / 2, x1: rows[0].length * SPRITE_PX / 2, top: rows.length * SPRITE_PX / 2, bottom: rows.length * SPRITE_PX / 2 });
/** Each kind's extent in units (the drone about 1 m, the blimp about 70 m). */
export const AIR_EXTENT: Record<AirKind, Extent> = { ...CRAFT_EXTENT, drone: { x0: -13, x1: 13, top: 6, bottom: 17 }, blimp: { x0: -1020, x1: 920, top: 280, bottom: 310 },
  spinner: spriteExtent(SPR.spinner), freighter: spriteExtent(SPR.freighter), skydrone: spriteExtent(SPR.drone), cab: { x0: -16 * CAB_K, x1: 16 * CAB_K, top: 17 * CAB_K, bottom: 3 * CAB_K } };
/** Height of a sprite ship in sprite pixels (its frame's middle sits half of this above its underside). */
export const spriteShipRows = (kind: AirKind) => kind in SPRITE_SHIPS ? SPRITE_SHIPS[kind as SpriteShip].rows.length : 0;
/** Any aircraft by kind, in its own frame (origin at its middle). The drone and blimp take no facing (the blimp's adverts stay readable). */
export function drawAircraft(x: CanvasRenderingContext2D, kind: AirKind, o: CraftLook & { cargo?: boolean }) {
  const t = o.t + (o.phase ?? 0);
  if (kind in SPRITE_SHIPS) { const ship = SPRITE_SHIPS[kind as SpriteShip]; drawSprite(x, ship.rows, 0, ship.rows.length * SPRITE_PX / 2, { ps: SPRITE_PX, flip: (o.face ?? 1) < 0, pal: HULL, glow: ship.glow }); return; }
  if (kind === 'cab') { drawCab(x, 0, 0, CAB_K, t); return; }
  if (kind === 'drone') drawDrone(x, { t, still: o.still, cargo: o.cargo });
  else if (kind === 'blimp') { x.save(); x.scale(BLIMP_SCALE, BLIMP_SCALE); drawBlimp(x, { t, still: o.still }); x.restore(); }
  else drawCraft(x, kind as CraftKind, kind === 'hauler' && o.cargo === false ? { ...o, box: null } : o);
}

/** A sky taxi: a small hovering cab, warm lit cabin, its roof light, thrusters glowing under it (the taxi stands' cab). */
export function drawCab(x: CanvasRenderingContext2D, cx: number, base: number, k = 1, t = 0) {
  const u = (n: number) => Math.round(n * k), c = Math.round(cx), b = Math.round(base);
  const g = x.createRadialGradient(c, b + u(3), 1, c, b + u(3), u(16));
  g.addColorStop(0, 'rgba(255,190,110,.35)'); g.addColorStop(1, 'rgba(255,190,110,0)');
  x.fillStyle = g; x.fillRect(c - u(16), b - u(4), u(32), u(22));
  box(x, c - u(15), b - u(8), u(30), u(8), '#2a1608', 'rgba(' + O + ',.9)');
  box(x, c - u(8), b - u(14), u(15), u(7), '#1a0e06', 'rgba(' + O + ',.8)');
  x.fillStyle = 'rgba(' + PAPER + ',.55)'; x.fillRect(c - u(6), b - u(12), u(5), u(4)); x.fillRect(c + u(1), b - u(12), u(4), u(4));
  x.fillStyle = 'rgba(255,210,58,.95)'; x.fillRect(c - u(3), b - u(16), u(6), u(2));
  const on = Math.sin(t * 0.3) > 0;
  x.fillStyle = on ? 'rgba(255,220,170,.95)' : 'rgba(255,170,80,.7)';
  x.fillRect(c - u(12), b, u(5), Math.max(1, u(1))); x.fillRect(c + u(7), b, u(5), Math.max(1, u(1)));
  x.fillStyle = 'rgba(255,240,215,.95)'; x.fillRect(c + u(13), b - u(6), u(2), u(2));
}
