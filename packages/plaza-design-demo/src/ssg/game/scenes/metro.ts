/**
 * Downtown station: an elevated platform on a viaduct, open to the city. A
 * train pulls in, opens its doors and leaves, on a loop. Bands: far = the
 * skyline at night (../skyline.ts, the intro's city, dimmed: the banded sun low
 * between the towers, the antenna, rooftop cables with packets, beacons, the
 * star mesh, ships); middle = the viaduct's far railing, the canopy roof on its
 * pillars, the girder and piers under the deck; play = the track and the train,
 * the platform, the departure board, signs, benches, the stairs.
 */

import { Skyline } from '../skyline';
import { box, notice, O, onScreen, PAPER, RED, rng, tell, text, type SceneDef, type View } from './kit';
import { drawDepartures, drawPlatformTrain, STOP } from './line';
import type { RiderKind } from './riders';
import { drawBench, drawScreen, drawWaiting } from './stations';
import { TURNSTILE } from '../opening';

/** Layout: positions in world units, heights up from the platform. */
const L = {
  width: 1300,
  spawn: 86,
  /** The canopy: its underside, the fascia's top, the truss's top chord. */
  canopy: { under: 168, fascia: 178, truss: 196 },
  /** The viaduct's deck (the track bed's top) and the horizon just over it. */
  deck: 14,
  horizon: 16,
  signs: [118, 990],
  /** The city map: a lit board on legs, between the stairs and where you board. */
  cityMap: 210,
  pillars: [{ x: 330, cam: true }, { x: 730 }, { x: 1130 }] as { x: number; cam?: boolean }[],
  lamps: [100, 300, 500, 700, 900, 1100, 1300],
  board: 540,
  benches: [{ x: 930, who: 'paper' }, { x: 1235 }] as { x: number; who?: RiderKind }[],
  /** Piers under the viaduct, in the near floor strip. */
  pierStep: 260,
  /** Where you board: in front of the second door of the first car while the train is in (and where you land stepping off). */
  boardAt: 365,
  /** The Registry's screen under the canopy, and where people wait. */
  screen: 850,
  waiting: [460, 640, 1060, 1180],
};

const RAIL = 0.9;
/** The city drifts at this fraction of the camera (its own bands drift slower still), and how much it is dimmed: far band, calm. */
const SKY_PAR = 0.5, SKY_DIM = 0.55;

const city = new Skyline();
/** The frame the city was last drawn at, to step its packets by real frames (slower than the cutscene's). */
let cityT = -1;

/** The city behind the station: the shared skyline, its horizon just over the deck, dimmed under a wash. */
function drawCity(x: CanvasRenderingContext2D, v: View) {
  const W = Math.ceil(v.viewW), H = Math.ceil(v.viewH), horizon = v.y(L.horizon);
  const k = cityT < 0 ? 0 : Math.min(3, Math.max(0, v.t - cityT)) * 0.6;
  cityT = v.t;
  city.draw(
    x,
    { W, H, top: 0, horizon, sky: Math.min(horizon, 400), sunX: W * 0.58, camMax: Math.round(L.width * SKY_PAR) },
    { cam: Math.max(0, Math.round(v.cam * SKY_PAR)), a: v.t, k, still: false, floor: false, rain: 0 },
  );
  x.fillStyle = 'rgba(2,1,0,' + SKY_DIM + ')'; x.fillRect(0, 0, v.viewW, v.viewH);
  // over the roof, calmer still: the star mesh and the beams must not pull the eye off the platform
  x.fillStyle = 'rgba(2,1,0,.3)'; x.fillRect(0, 0, v.viewW, Math.max(0, v.y(L.canopy.truss)));
}

/** Street lights far below the viaduct, seen between the piers: [x, depth]. */
const BELOW = (() => { const r = rng(95); return Array.from({ length: 26 }, () => [r() * 2600, r()]); })();

/** The viaduct's far edge behind the track: a girder lip and a waist-high railing, against the city. */
function drawFarRail(x: CanvasRenderingContext2D, v: View) {
  const { y } = v;
  x.fillStyle = 'rgba(' + O + ',.32)';
  x.fillRect(0, y(L.deck + 18), v.viewW, 1); x.fillRect(0, y(L.deck + 10), v.viewW, 1);
  for (let wx = -40; wx < 2600; wx += 18) { const s = v.sx(wx, RAIL); if (s >= -1 && s <= v.viewW) x.fillRect(s, y(L.deck + 18), 1, 18); }
  box(x, 0, y(L.deck + 2), v.viewW, 3, '#0d0907');
  x.fillStyle = 'rgba(' + O + ',.4)'; x.fillRect(0, y(L.deck + 2), v.viewW, 1);
}

/** The canopy over the platform: a truss on top, the fascia with the line's stripe, lamps underneath. */
function drawCanopy(x: CanvasRenderingContext2D, v: View) {
  const { y } = v, C = L.canopy, s0 = v.sx(-60), s1 = v.sx(L.width + 60);
  const a = Math.max(0, s0), b = Math.min(v.viewW, s1);
  if (b <= a) return;
  // the truss: top chord, diagonals, in the middle band's dim rust
  if (y(C.truss) > -2) {
    x.fillStyle = '#060403'; x.fillRect(a, y(C.truss), b - a, C.truss - C.fascia);
    x.strokeStyle = 'rgba(' + O + ',.28)'; x.lineWidth = 1;
    x.beginPath();
    x.moveTo(a, y(C.truss) + 0.5); x.lineTo(b, y(C.truss) + 0.5);
    for (let wx = -60; wx < L.width + 60; wx += 40) {
      const p = v.sx(wx), q = v.sx(wx + 20), r = v.sx(wx + 40);
      if (r < 0 || p > v.viewW) continue;
      x.moveTo(p + 0.5, y(C.fascia)); x.lineTo(q + 0.5, y(C.truss)); x.lineTo(r + 0.5, y(C.fascia));
    }
    x.stroke();
  }
  // the fascia: the roof's edge, with LINE 0's orange stripe along it
  box(x, a, y(C.fascia), b - a, C.fascia - C.under, '#120d0a', 'rgba(' + O + ',.55)');
  x.fillStyle = 'rgba(' + O + ',.35)'; x.fillRect(a, y(C.fascia - 4), b - a, 2);
  // lamps under the roof, and the light they drop on the platform
  for (const wx of L.lamps) {
    const s = v.sx(wx);
    if (!onScreen(v, s - 40, 80)) continue;
    const g = x.createLinearGradient(0, y(C.under), 0, v.gy);
    g.addColorStop(0, 'rgba(255,230,190,.07)'); g.addColorStop(1, 'rgba(255,230,190,0)');
    x.fillStyle = g;
    x.beginPath(); x.moveTo(s - 14, y(C.under - 3)); x.lineTo(s + 14, y(C.under - 3)); x.lineTo(s + 40, v.gy); x.lineTo(s - 40, v.gy); x.closePath(); x.fill();
    box(x, s - 16, y(C.under), 32, 3, 'rgba(255,240,215,.85)');
  }
}

/** A pillar holding the roof, with its braces; the first carries a camera. */
function drawPillar(x: CanvasRenderingContext2D, v: View, p: { x: number; cam?: boolean }) {
  const { y, t } = v, s = v.sx(p.x), C = L.canopy;
  if (!onScreen(v, s - 44, 88)) return;
  x.strokeStyle = 'rgba(' + O + ',.45)'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(s - 8, y(C.under - 34)); x.lineTo(s - 40, y(C.under)); x.moveTo(s + 8, y(C.under - 34)); x.lineTo(s + 40, y(C.under)); x.stroke();
  x.lineWidth = 1;
  box(x, s - 10, y(C.under), 20, C.under, '#16110d', 'rgba(' + O + ',.6)');
  box(x, s - 14, y(8), 28, 8, '#1c1510', 'rgba(' + O + ',.5)');
  if (p.cam) {
    // CCTV, recording
    box(x, s + 8, y(140), 4, 6, '#100c0a');
    box(x, s + 10, y(146), 16, 8, '#100c0a', 'rgba(' + O + ',.7)');
    x.fillStyle = Math.floor(t / 30) % 2 ? 'rgba(' + RED + ',.95)' : 'rgba(' + RED + ',.3)'; x.fillRect(s + 21, y(143), 2, 2);
  }
}

/** The station's name on a plate hung from the roof. */
function drawSign(x: CanvasRenderingContext2D, v: View, wx: number) {
  const { y } = v, s = v.sx(wx), C = L.canopy;
  if (!onScreen(v, s - 60, 120)) return;
  x.fillStyle = 'rgba(' + O + ',.5)'; x.fillRect(s - 40, y(C.under), 1, C.under - 152); x.fillRect(s + 39, y(C.under), 1, C.under - 152);
  box(x, s - 52, y(152), 104, 20, '#0e0a08', 'rgba(' + O + ',.75)');
  box(x, s - 49, y(149), 16, 14, 'rgba(' + O + ',.85)');
  text(x, '0', s - 41, y(142), '#0e0a08', 9, '700');
  text(x, 'DOWNTOWN', s + 8, y(142), 'rgba(' + PAPER + ',.92)', 9, '600');
}

/**
 * The city map: a backlit board on two legs, lit from inside and throwing its
 * light on the slab. The districts as dim blocks, LINE 0 across them with its
 * three stops, YOU ARE HERE blinking at Downtown; a cyan edge and LED: usable.
 */
function drawCityMap(x: CanvasRenderingContext2D, v: View, wx: number) {
  const { y, t, gy } = v, s = v.sx(wx);
  if (!onScreen(v, s - 50, 100)) return;
  const w = 64, h = 40, top = y(66), left = s - w / 2;
  // its glow on the platform
  const g = x.createRadialGradient(s, gy, 2, s, gy, 46);
  g.addColorStop(0, 'rgba(0,255,255,.1)'); g.addColorStop(1, 'rgba(0,255,255,0)');
  x.fillStyle = g; x.fillRect(s - 46, gy - 30, 92, 40);
  // legs and the frame
  box(x, left + 6, y(26), 3, 26, '#2a160a', 'rgba(' + O + ',.6)'); box(x, left + w - 9, y(26), 3, 26, '#2a160a', 'rgba(' + O + ',.6)');
  box(x, left - 2, top - 12, w + 4, h + 14, '#120d0a', 'rgba(' + O + ',.8)');
  text(x, 'CITY MAP', s, top - 6, 'rgba(' + PAPER + ',.9)', 7, '600');
  // the lit face
  box(x, left + 2, top, w - 4, h - 2, '#0b1a1a', 'rgba(0,255,255,.55)');
  x.fillStyle = 'rgba(' + PAPER + ',.12)';
  for (const [bx, by, bw, bh] of [[6, 5, 12, 9], [21, 4, 10, 12], [36, 6, 16, 8], [8, 22, 14, 10], [27, 21, 8, 12], [40, 20, 14, 12]]) x.fillRect(left + bx, top + by, bw, bh);
  // LINE 0: Downtown, Galleria, Harbor
  x.fillStyle = 'rgba(' + O + ',.9)'; x.fillRect(left + 10, top + 17, 44, 2);
  for (const sx of [10, 32, 54]) x.fillRect(left + sx - 2, top + 16, 4, 4);
  if (Math.sin(t * 0.08) > -0.2) { x.fillStyle = 'rgba(' + RED + ',.95)'; x.fillRect(left + 9, top + 23, 3, 3); }
  tell(x, t, left + w - 6, top + h - 6, 3);
}

/** The stairs down to the street at the platform's end: a lit stairwell, its railing, a cyan plate on a post. */
function drawStairs(x: CanvasRenderingContext2D, v: View, wx: number) {
  const { y, t, gy } = v, s = v.sx(wx), d = Math.min(40, v.viewH - gy);
  if (!onScreen(v, s - 40, 110)) return;
  x.fillStyle = '#000'; x.fillRect(s - 30, gy, 60, d);
  const g = x.createLinearGradient(0, gy + d, 0, gy);
  g.addColorStop(0, 'rgba(255,230,190,.26)'); g.addColorStop(1, 'rgba(255,230,190,0)');
  x.fillStyle = g; x.fillRect(s - 30, gy, 60, d);
  for (let i = 0; i < 7; i++) {
    x.fillStyle = 'rgba(' + PAPER + ',' + (0.2 + i * 0.05) + ')'; x.fillRect(s - 30 + i * 8, gy + 3 + i * 5, 9, 1);
    x.fillStyle = 'rgba(' + O + ',.25)'; x.fillRect(s - 30 + i * 8, gy + 3 + i * 5, 1, 5);
  }
  x.fillStyle = 'rgba(' + O + ',.8)'; x.fillRect(s - 31, gy, 2, d); x.fillRect(s + 29, gy, 2, d);
  // the railing round the opening, waist high
  x.fillStyle = 'rgba(' + O + ',.85)';
  x.fillRect(s - 31, y(24), 62, 2);
  for (const px of [s - 31, s - 1, s + 29]) x.fillRect(px, y(24), 2, 24);
  x.fillStyle = 'rgba(' + O + ',.35)'; x.fillRect(s - 31, y(12), 62, 1);
  // the post with its plate: the way out, so cyan
  box(x, s + 30, y(64), 3, 64, '#2a160a', 'rgba(' + O + ',.6)');
  box(x, s + 2, y(76), 62, 13, '#04100f', 'rgba(0,255,255,.6)');
  text(x, '< DOWNTOWN', s + 33, y(69.5), 'rgba(0,255,255,.95)', 7, '600');
  tell(x, t, s + 31, y(34), 2);
}

/**
 * The exit turnstile by the stairs (IDENTITY CHECK AT ALL EXITS): a waist-high post with a key
 * reader and a flap, standing on the slab. It lets you through; on the opening's dawn it takes
 * a beat too long (game.ts draws its "verifying").
 */
function drawTurnstile(x: CanvasRenderingContext2D, v: View, wx: number) {
  const { y, t } = v, s = v.sx(wx);
  if (!onScreen(v, s - 30, 60)) return;
  box(x, s - 6, y(34), 12, 34, '#16110d', 'rgba(' + O + ',.75)');
  box(x, s - 4, y(31), 8, 7, '#06191b', 'rgba(0,255,255,.6)');
  x.fillStyle = 'rgba(0,255,255,' + (0.5 + 0.3 * Math.sin(t * 0.05)) + ')'; x.fillRect(s - 2, y(28), 4, 1);
  // the flap, folded back towards the stairs, and a second post across the way
  box(x, s - 26, y(22), 20, 3, '#2a160a', 'rgba(' + O + ',.8)');
  box(x, s - 30, y(26), 4, 26, '#16110d', 'rgba(' + O + ',.6)');
}

/** The near floor strip: the platform's slab, then the viaduct's girder and piers with the street glowing far below. */
function drawDeck(x: CanvasRenderingContext2D, v: View) {
  const { gy, t } = v, bottom = v.viewH;
  // far below: the street's glow and its lights, between the piers
  x.fillStyle = '#020101'; x.fillRect(0, gy, v.viewW, bottom - gy);
  const g = x.createLinearGradient(0, gy + 24, 0, bottom);
  g.addColorStop(0, 'rgba(' + O + ',0)'); g.addColorStop(1, 'rgba(' + O + ',.1)');
  x.fillStyle = g; x.fillRect(0, gy + 24, v.viewW, bottom - gy - 24);
  for (const [bx, dp] of BELOW) {
    const s = Math.round(((bx - v.cam * (0.4 + dp * 0.3)) % 2600 + 2600) % 2600 - 200);
    if (s < 0 || s > v.viewW) continue;
    x.fillStyle = 'rgba(255,190,110,' + (0.25 + 0.15 * Math.sin(t * 0.02 + bx)) + ')'; x.fillRect(s, bottom - 4 - Math.round(dp * 10), 2, 1);
  }
  // piers
  for (let wx = -100; wx < L.width + 300; wx += L.pierStep) {
    const s = v.sx(wx);
    if (!onScreen(v, s - 18, 36)) continue;
    box(x, s - 16, gy + 24, 32, bottom - gy - 24, '#0b0807', 'rgba(' + O + ',.3)');
  }
  // the girder under the slab, riveted
  box(x, 0, gy + 14, v.viewW, 12, '#110c09');
  x.fillStyle = 'rgba(' + O + ',.4)'; x.fillRect(0, gy + 25, v.viewW, 1);
  x.fillStyle = 'rgba(' + O + ',.3)';
  for (let wx = 0; wx < L.width + 300; wx += 16) { const s = v.sx(wx); if (s >= 0 && s <= v.viewW) { x.fillRect(s, gy + 17, 1, 1); x.fillRect(s, gy + 22, 1, 1); } }
  // the slab you stand on, the warning painted on it
  x.fillStyle = '#0a0806'; x.fillRect(0, gy, v.viewW, 14);
  x.fillStyle = 'rgba(' + O + ',.55)'; x.fillRect(0, gy, v.viewW, 1);
  x.fillStyle = 'rgba(' + O + ',.25)'; x.fillRect(0, gy + 13, v.viewW, 1);
  for (let wx = 0; wx < L.width; wx += 260) { const s = v.sx(wx + 140); if (onScreen(v, s - 40, 80)) text(x, 'MIND THE GAP', s, gy + 7, 'rgba(255,210,58,.6)', 7, '600'); }
}

export const metro: SceneDef = {
  id: 'metro',
  name: 'Downtown metro',
  width: L.width,
  spawn: L.spawn,
  ambient: { weather: true },
  // the benches: sit and let the trains go by (TIME.md, waiting)
  rests: L.benches.map((b, i) => ({ id: 'bench' + i, x: b.x - (b.who ? 12 : 0), kind: 'bench' as const })),
  intro: ['The metro. One line, three stops, round and round. Getting off at the right one is my problem.'],
  exits: [
    { id: 'downtown', x: 32, to: 'downtown', at: 'metro', label: '[E] STAIRS DOWN · DOWNTOWN', promptH: 82 },
    { id: 'train', x: L.boardAt, to: '', action: 'board', label: '[E] BOARD', promptH: 84 },
    { id: 'citymap', x: L.cityMap, to: '', action: 'map', label: '[E] CITY MAP', promptH: 90 },
  ],
  readables: [
    { id: 'board', x: L.board, name: 'DEPARTURES', promptH: 120, pages: ['LINE 0 · A TRAIN EVERY 25 SECONDS.', 'DOORS OPEN FOR A LIMITED TIME. DO NOT HOLD THE DOORS.'] },
    { id: 'map', x: 730, name: 'LINE MAP', promptH: 92, pages: ['LINE 0: DOWNTOWN · GALLERIA · HARBOR.', 'LOOP SERVICE. TRAINS STOP AT EVERY STATION.'] },
    { id: 'screen', x: L.screen, name: 'REGISTRY SCREEN', promptH: 170, pages: ['COMPLIANCE IS COMFORT.', 'THIS MESSAGE IS BROUGHT TO YOU BY THE REGISTRY.'] },
    { id: 'regular', x: 938, name: 'MAN WITH A PAPER', label: '[E] TALK', promptH: 54, pages: ['The paper says the metro runs on time.', "It's yesterday's paper. It ran on time yesterday too. Allegedly."] },
    { id: 'poster', x: 1130, name: 'POSTER', promptH: 92, pages: ['REGISTRY PREMIUM.', 'PRIORITY IDENTITY CHECKS AT ALL EXITS.'] },
  ],

  drawBackdrop(x, v) {
    const { sx, y, t } = v;
    // far band: the city at night
    drawCity(x, v);
    // middle band: the viaduct's far railing; play band: the track bed, rails and the train
    drawFarRail(x, v);
    x.fillStyle = '#020101'; x.fillRect(0, y(L.deck), v.viewW, L.deck - 2);
    x.fillStyle = 'rgba(160,150,140,.35)'; x.fillRect(0, y(8), v.viewW, 1); x.fillRect(0, y(11), v.viewW, 1);
    for (let wx = 0; wx < 2600; wx += 14) { const s = sx(wx, 0.94); if (s >= -4 && s <= v.viewW) { x.fillStyle = 'rgba(60,40,25,.6)'; x.fillRect(s, y(6), 8, 2); } }
    drawPlatformTrain(x, v, 'downtown', STOP);
    x.fillStyle = 'rgba(255,210,58,.7)'; x.fillRect(0, y(2), v.viewW, 2);

    // middle band: the canopy and its pillars
    drawCanopy(x, v);
    for (const p of L.pillars) drawPillar(x, v, p);

    // play band: signs, the board, notices, benches, the stairs, the floor
    for (const s of L.signs) drawSign(x, v, s);
    notice(x, t, sx(730), y(78), 44, 30, ['LINE', 'MAP'], 1);
    notice(x, t, sx(1130), y(78), 44, 30, ['ADS'], 2);
    // the departure board on two rods from the roof
    drawDepartures(x, v, 'downtown', L.board, 112, L.canopy.under);
    drawScreen(x, v, L.screen, 160, L.canopy.under);
    for (const b of L.benches) drawBench(x, v, b);
    drawWaiting(x, v, 'downtown', L.waiting);
    drawDeck(x, v);
    drawCityMap(x, v, L.cityMap);
    drawStairs(x, v, 32);
    drawTurnstile(x, v, TURNSTILE.x);
  },
};
