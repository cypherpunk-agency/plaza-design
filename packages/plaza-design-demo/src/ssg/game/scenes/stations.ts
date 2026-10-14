/**
 * LINE 0's other two platforms (Downtown's is metro.ts). Each belongs to its
 * district, with the station's name on its walls and the train on the shared
 * timetable (line.ts): you wait, it pulls in, the doors open for a few seconds.
 *
 * - Galleria: underground, under the mall. Far = the tiled tunnel wall across
 *   the track, GALLERIA on its frieze, posters between trains; middle = the
 *   ceiling beam, strip lights, tiled columns; play = platform, board, benches,
 *   a snack machine, the escalator up into the mall.
 * - Harbor: open air on the waterfront. Far = night sky, the far city, black
 *   water with the cranes' silhouettes; middle = the sea wall, the corrugated
 *   canopy on steel posts; play = platform, board, benches, the gate to the pier.
 */

import type { Station } from '../city';
import { box, C, drawTowers, figure, notice, O, onScreen, PAPER, RED, reflect, rng, tell, text, towers, type Scene, type View } from './kit';
import { drawDepartures, drawPlatformTrain, STOP, TRAIN } from './line';

// ---------- what both platforms share ----------

/** Heights up from the platform: the track bed's top (the train stands on it), the yellow line at the edge. */
const DECK = 14;

/** The track bed behind the platform edge: ballast, two rails, sleepers in the track's parallax, the train, the yellow line. */
function drawTrack(x: CanvasRenderingContext2D, v: View, st: Station, stop: number) {
  const { y, sx } = v;
  x.fillStyle = '#020101'; x.fillRect(0, y(DECK), v.viewW, DECK - 2);
  x.fillStyle = 'rgba(160,150,140,.35)'; x.fillRect(0, y(8), v.viewW, 1); x.fillRect(0, y(11), v.viewW, 1);
  for (let wx = 0; wx < 2600; wx += 14) { const s = sx(wx, TRAIN.track); if (s >= -4 && s <= v.viewW) { x.fillStyle = 'rgba(60,40,25,.6)'; x.fillRect(s, y(6), 8, 2); } }
  drawPlatformTrain(x, v, st, stop);
  x.fillStyle = 'rgba(255,210,58,.7)'; x.fillRect(0, y(2), v.viewW, 2);
}

/** The near floor strip: the slab you stand on with its warning, then the platform's face down into the dark. */
function drawSlab(x: CanvasRenderingContext2D, v: View, width: number, fill: string) {
  const { gy } = v;
  x.fillStyle = '#020101'; x.fillRect(0, gy, v.viewW, v.viewH - gy);
  x.fillStyle = fill; x.fillRect(0, gy, v.viewW, 16);
  x.fillStyle = 'rgba(' + O + ',.55)'; x.fillRect(0, gy, v.viewW, 1);
  x.fillStyle = 'rgba(' + O + ',.25)'; x.fillRect(0, gy + 15, v.viewW, 1);
  for (let wx = 0; wx < width; wx += 260) { const s = v.sx(wx + 140); if (onScreen(v, s - 40, 80)) text(x, 'MIND THE GAP', s, gy + 8, 'rgba(255,210,58,.6)', 7, '600'); }
  // the platform's face: tiles going down, dimmer the lower
  for (let i = 0; i < 4; i++) { x.fillStyle = 'rgba(' + O + ',' + (0.07 - i * 0.015) + ')'; x.fillRect(0, gy + 22 + i * 8, v.viewW, 1); }
}

/** The station's name on a plate: LINE 0's orange roundel, then the name. Hung on two rods from `roof` when given, else fixed to the wall. */
function nameplate(x: CanvasRenderingContext2D, v: View, s: number, h: number, name: string, roof?: number, alpha = 0.92) {
  const { y } = v, w = 40 + name.length * 7;
  if (!onScreen(v, s - w / 2 - 4, w + 8)) return;
  if (roof !== undefined) { x.fillStyle = 'rgba(' + O + ',.5)'; x.fillRect(s - w / 2 + 12, y(roof), 1, roof - h); x.fillRect(s + w / 2 - 13, y(roof), 1, roof - h); }
  box(x, s - w / 2, y(h), w, 20, '#0e0a08', 'rgba(' + O + ',' + (0.75 * alpha) + ')');
  box(x, s - w / 2 + 3, y(h - 3), 16, 14, 'rgba(' + O + ',' + (0.85 * alpha) + ')');
  text(x, '0', s - w / 2 + 11, y(h - 10), '#0e0a08', 9, '700');
  text(x, name, s + 10, y(h - 10), 'rgba(' + PAPER + ',' + alpha + ')', 9, '600');
}

/** A bench, maybe with someone who has given up waiting. */
function drawBench(x: CanvasRenderingContext2D, v: View, b: { x: number; who?: boolean }) {
  const { y } = v, s = v.sx(b.x);
  if (!onScreen(v, s - 30, 60)) return;
  if (b.who) figure(x, s + 10, y(10), 30, '#0b0807', 0, 'rgba(255,217,165,.3)');
  box(x, s - 26, y(24), 52, 3, '#2a160a', 'rgba(' + O + ',.6)');
  box(x, s - 26, y(14), 52, 4, '#2a160a', 'rgba(' + O + ',.8)');
  box(x, s - 22, y(10), 3, 10, '#2a160a'); box(x, s + 19, y(10), 3, 10, '#2a160a');
}

/** The way out: a cyan plate on a post, the LED that says you can use it. */
function exitPlate(x: CanvasRenderingContext2D, v: View, s: number, label: string) {
  const { y, t } = v, w = label.length * 5 + 16;
  box(x, s + 30, y(64), 3, 64, '#2a160a', 'rgba(' + O + ',.6)');
  box(x, s + 31 - w / 2, y(76), w, 13, '#04100f', 'rgba(' + C + ',.6)');
  text(x, label, s + 31, y(69.5), 'rgba(' + C + ',.95)', 7, '600');
  tell(x, t, s + 31, y(34), 2);
}

// ---------- Galleria: underground, under the mall ----------

const G = {
  width: 1200,
  spawn: 86,
  /** The escalator up into the mall, at the platform's left end. */
  exit: 40,
  /** Where you land stepping off the train. */
  boardAt: 365,
  /** The ceiling: the beam's underside and top; the frieze with the name on the far wall. */
  beam: { under: 176, top: 194 },
  frieze: { h0: 116, h1: 138, step: 280 },
  posters: [
    { x: 250, lines: ['NULL & VOID', 'LEVEL 2'] }, { x: 530, lines: ['MEMORY GARDEN', 'FORGET IN STYLE'] },
    { x: 810, lines: ['TERMS APPLY', 'TO YOU'] }, { x: 1090, lines: ['SECOND SKIN', 'NOW IN BEIGE'] },
  ],
  columns: [300, 700, 1100],
  lamps: [100, 240, 380, 520, 660, 800, 940, 1080],
  board: 520,
  benches: [{ x: 620, who: true }, { x: 940 }] as { x: number; who?: boolean }[],
  snacks: 820,
  /** The line map on its stand, between the last bench and the end column. */
  lineMap: 1040,
};
/** The far wall sits in this parallax (with the frieze and the posters on it). */
const WALL = 0.9;

function drawGalleriaWall(x: CanvasRenderingContext2D, v: View) {
  const { y, sx } = v, top = y(G.beam.top);
  // the tiled far wall across the track, up to the beam
  x.fillStyle = '#0c0907'; x.fillRect(0, Math.max(0, top), v.viewW, y(DECK) - Math.max(0, top));
  x.fillStyle = 'rgba(' + PAPER + ',.035)';
  for (let h = DECK + 8; h < G.beam.top; h += 8) x.fillRect(0, y(h), v.viewW, 1);
  for (let wx = -40; wx < 2600; wx += 16) { const s = sx(wx, WALL); if (s >= 0 && s <= v.viewW) x.fillRect(s, Math.max(0, top), 1, y(DECK) - Math.max(0, top)); }
  // posters between the trains, each in its frame with a strip light over it
  for (const p of G.posters) {
    const s = sx(p.x, WALL);
    if (!onScreen(v, s - 50, 100)) continue;
    box(x, s - 46, y(92), 92, 58, '#1a120b', 'rgba(' + O + ',.5)');
    box(x, s - 42, y(88), 84, 50, '#120c09');
    box(x, s - 40, y(96), 80, 2, 'rgba(255,240,215,.5)');
    p.lines.forEach((l, i) => text(x, l, s, y(72 - i * 14), 'rgba(' + PAPER + ',' + (i ? 0.45 : 0.65) + ')', 7, i ? '' : '600'));
  }
  // the frieze: a band of darker tile along the wall, the station's name on it again and again
  x.fillStyle = '#140d09'; x.fillRect(0, y(G.frieze.h1), v.viewW, G.frieze.h1 - G.frieze.h0);
  x.fillStyle = 'rgba(' + O + ',.4)'; x.fillRect(0, y(G.frieze.h1), v.viewW, 1); x.fillRect(0, y(G.frieze.h0), v.viewW, 1);
  for (let wx = 60; wx < 2600; wx += G.frieze.step) nameplate(x, v, sx(wx, WALL), G.frieze.h1 - 1, 'GALLERIA', undefined, 0.75);
}

/** Over the platform: the ceiling beam with its strip lights; on taller views the mall's foundations, ribbed concrete and cable trays. */
function drawGalleriaCeiling(x: CanvasRenderingContext2D, v: View) {
  const { y, sx, t } = v, B = G.beam;
  if (y(B.top) > 0) {
    x.fillStyle = '#060403'; x.fillRect(0, 0, v.viewW, y(B.top));
    x.fillStyle = 'rgba(' + O + ',.12)';
    for (let h = B.top + 40; y(h) > -2; h += 56) x.fillRect(0, y(h), v.viewW, 2);
    // cable trays and a vent grille, far and dim
    for (let wx = 80; wx < 2600; wx += 320) {
      const s = sx(wx, 0.8);
      if (!onScreen(v, s - 10, 120)) continue;
      x.fillStyle = 'rgba(' + O + ',.1)'; x.fillRect(s, y(B.top + 24), 110, 3);
      box(x, s + 20, y(B.top + 88), 40, 22, '#0a0705', 'rgba(' + O + ',.15)');
      for (let k = 3; k < 20; k += 4) { x.fillStyle = 'rgba(' + O + ',.08)'; x.fillRect(s + 22, y(B.top + 88) + k, 36, 1); }
    }
    // the mall's floor over it all: a faint warm glow through the joints
    if (y(B.top + 260) > 0) { x.fillStyle = 'rgba(255,190,110,.05)'; x.fillRect(0, y(B.top + 262), v.viewW, 2); }
  }
  box(x, 0, y(B.top), v.viewW, B.top - B.under, '#120d0a');
  x.fillStyle = 'rgba(' + O + ',.55)'; x.fillRect(0, y(B.under) - 1, v.viewW, 1);
  x.fillStyle = 'rgba(' + O + ',.35)'; x.fillRect(0, y(B.top - 5), v.viewW, 2);
  for (const wx of G.lamps) {
    const s = sx(wx);
    if (!onScreen(v, s - 40, 80)) continue;
    const g = x.createLinearGradient(0, y(B.under), 0, v.gy);
    g.addColorStop(0, 'rgba(255,230,190,.07)'); g.addColorStop(1, 'rgba(255,230,190,0)');
    x.fillStyle = g;
    x.beginPath(); x.moveTo(s - 14, y(B.under - 3)); x.lineTo(s + 14, y(B.under - 3)); x.lineTo(s + 40, v.gy); x.lineTo(s - 40, v.gy); x.closePath(); x.fill();
    box(x, s - 16, y(B.under), 32, 3, 'rgba(255,240,215,' + (wx === 940 && Math.floor(t) % 97 < 4 ? 0.3 : 0.85) + ')');
  }
}

/** A tiled column from the platform to the beam. */
function drawColumn(x: CanvasRenderingContext2D, v: View, wx: number) {
  const { y } = v, s = v.sx(wx), B = G.beam;
  if (!onScreen(v, s - 14, 28)) return;
  box(x, s - 12, y(B.under), 24, B.under, '#1a1410', 'rgba(' + O + ',.6)');
  x.fillStyle = 'rgba(' + PAPER + ',.06)'; for (let h = 12; h < B.under; h += 12) x.fillRect(s - 11, y(h), 22, 1);
  box(x, s - 15, y(10), 30, 10, '#201812', 'rgba(' + O + ',.5)');
}

/** The escalator up into the mall: an opening in the far wall, lit from above, the steps rising out of the view. */
function drawEscalator(x: CanvasRenderingContext2D, v: View, wx: number) {
  const { y, t } = v, s = v.sx(wx);
  if (!onScreen(v, s - 40, 120)) return;
  const top = G.beam.under;
  box(x, s - 30, y(top), 62, top, '#0a0807', 'rgba(' + O + ',.7)');
  const g = x.createLinearGradient(0, y(top), 0, y(0));
  g.addColorStop(0, 'rgba(255,230,190,.3)'); g.addColorStop(1, 'rgba(255,230,190,.04)');
  x.fillStyle = g; x.fillRect(s - 28, y(top - 2), 58, top - 2);
  // the steps, creeping upward to the left
  x.strokeStyle = 'rgba(' + O + ',.6)'; x.beginPath(); x.moveTo(s + 26, y(4)); x.lineTo(s - 26, y(top - 10)); x.stroke();
  x.fillStyle = 'rgba(' + PAPER + ',.35)';
  for (let k = 0; k < 12; k++) {
    const f = ((k + t * 0.02) % 12) / 12;
    x.fillRect(Math.round(s + 26 - 52 * f), Math.round(y(4 + (top - 14) * f)) - 2, 6, 1);
  }
  // the handrail, waist high, rising with it
  x.strokeStyle = 'rgba(' + O + ',.85)'; x.beginPath(); x.moveTo(s + 30, y(24)); x.lineTo(s - 22, y(top)); x.stroke();
  exitPlate(x, v, s, '^ GALLERIA MALL');
}

/** The snack machine: a lit front, rows of packets, a cyan coin slot. */
function drawSnacks(x: CanvasRenderingContext2D, v: View, wx: number) {
  const { y, t, gy } = v, s = v.sx(wx);
  if (!onScreen(v, s - 30, 60)) return;
  const g = x.createRadialGradient(s, gy, 2, s, gy, 40);
  g.addColorStop(0, 'rgba(255,217,165,.08)'); g.addColorStop(1, 'rgba(255,217,165,0)');
  x.fillStyle = g; x.fillRect(s - 40, gy - 30, 80, 36);
  box(x, s - 18, y(64), 36, 64, '#1a120b', 'rgba(' + O + ',.8)');
  box(x, s - 15, y(60), 22, 44, 'rgba(255,217,165,.16)', 'rgba(' + O + ',.4)');
  const r = rng(61);
  for (let row = 0; row < 4; row++) for (let k = 0; k < 3; k++) { x.fillStyle = r() < 0.3 ? 'rgba(' + RED + ',.5)' : 'rgba(255,190,110,.45)'; x.fillRect(s - 13 + k * 7, y(56 - row * 11), 5, 6); }
  box(x, s + 9, y(50), 6, 10, '#04100f', 'rgba(' + C + ',.7)');
  box(x, s - 15, y(13), 22, 6, '#050302');
  tell(x, t, s + 12, y(36), 1);
}

export const galleriaStation: Scene = {
  id: 'galleriaStation',
  name: 'Galleria Station',
  width: G.width,
  spawn: G.spawn,
  intro: ['Galleria station, under the mall. The ads followed me down.'],
  exits: [
    { id: 'mall', x: G.exit, to: 'mall', at: 'metro', label: '[E] UP · GALLERIA MALL', promptH: 92 },
    { id: 'train', x: G.boardAt, to: '', action: 'board', label: '[E] BOARD', promptH: 84 },
  ],
  readables: [
    { id: 'board', x: G.board, name: 'DEPARTURES', promptH: 120, pages: ['LINE 0 > HARBOR, then DOWNTOWN, then here again.', 'It is a loop. Missing your stop is a scenic route.'] },
    { id: 'snacks', x: G.snacks, name: 'SNACK MACHINE', promptH: 80, pages: ['CHIPS: SOLD OUT. CHIPS: SOLD OUT. CHIPS: SOLD OUT.', 'One bag left, wedged at an angle that defies physics and refunds.'] },
    { id: 'linemap', x: G.lineMap, name: 'LINE MAP', promptH: 86, pages: ['LINE 0: DOWNTOWN > GALLERIA > HARBOR > DOWNTOWN.', 'Someone has drawn a little exit on it, in pen, at the bottom. It goes nowhere.'] },
  ],

  drawBackdrop(x, v) {
    const { sx, y, t } = v;
    x.fillStyle = '#030201'; x.fillRect(0, 0, v.viewW, v.viewH);
    // far band: the tunnel wall across the track; play band: the track and the train
    drawGalleriaWall(x, v);
    drawTrack(x, v, 'galleria', STOP);
    // middle band: the ceiling, its lights, the columns
    drawGalleriaCeiling(x, v);
    for (const c of G.columns) drawColumn(x, v, c);
    // play band (the name is on the frieze): the board, the line map, benches, the machine, the way up
    drawDepartures(x, v, 'galleria', G.board, 112, G.beam.under);
    const lm = sx(G.lineMap);
    if (onScreen(v, lm - 30, 60)) { box(x, lm - 1, y(44), 3, 44, '#2a160a'); notice(x, t, lm, y(72), 50, 30, ['LINE', 'MAP'], 2); }
    for (const b of G.benches) drawBench(x, v, b);
    drawSnacks(x, v, G.snacks);
    drawEscalator(x, v, G.exit);
    drawSlab(x, v, G.width, '#0c0907');
    for (const wx of G.lamps) reflect(x, v, sx(wx), '255,230,190', 0.5, 20);
  },
};

// ---------- Harbor: open air, on the waterfront ----------

const H = {
  width: 1200,
  spawn: 86,
  /** The gate out to the pier, at the platform's left end. */
  exit: 40,
  boardAt: 365,
  /** The water's horizon and the sea wall's top behind the track. */
  horizon: 62,
  wall: 26,
  canopy: { under: 158, fascia: 168 },
  posts: [280, 680, 1080],
  lamps: [120, 360, 600, 840, 1080],
  /** Crane silhouettes far across the water: [x, height, phase]. */
  cranes: [[240, 150, 0], [620, 180, 1.7], [1180, 160, 3.1]] as [number, number, number][],
  board: 520,
  benches: [{ x: 760 }, { x: 980, who: true }] as { x: number; who?: boolean }[],
  tide: 1120,
};
const H_SKY = towers(141, 1800, [14, 34], [16, 60], 0.07);
const H_RIPPLES = (() => { const r = rng(143); return Array.from({ length: 60 }, () => [r() * 2000, r(), 4 + r() * 12]); })();

/** Far band: the far city on the horizon, the cranes across the water, their warning lights, black water with slow ripples. */
function drawWaterfront(x: CanvasRenderingContext2D, v: View) {
  const { y, t } = v, hz = y(H.horizon);
  const glow = x.createLinearGradient(0, y(H.horizon + 70), 0, hz);
  glow.addColorStop(0, 'rgba(194,65,12,0)'); glow.addColorStop(1, 'rgba(194,65,12,.12)');
  x.fillStyle = glow; x.fillRect(0, y(H.horizon + 70), v.viewW, 70);
  drawTowers(x, v, H_SKY, 0.1, hz, 0.1, '#030100', 1);
  for (const [cx, ch, ph] of H.cranes) {
    const s = v.sx(cx, 0.25);
    if (!onScreen(v, s - 90, 180)) continue;
    x.strokeStyle = 'rgba(' + O + ',.22)'; x.lineWidth = 2; x.beginPath();
    x.moveTo(s - 30, hz); x.lineTo(s - 30, hz - ch * 0.7); x.moveTo(s + 20, hz); x.lineTo(s + 20, hz - ch * 0.7);
    x.moveTo(s - 80, hz - ch * 0.62); x.lineTo(s + 60, hz - ch * 0.62); x.moveTo(s - 30, hz - ch * 0.7); x.lineTo(s - 6, hz - ch); x.lineTo(s + 20, hz - ch * 0.7);
    x.stroke(); x.lineWidth = 1;
    x.fillStyle = 'rgba(' + RED + ',' + (Math.sin(t * 0.04 + ph) > 0 ? 0.7 : 0.15) + ')'; x.fillRect(s - 7, hz - ch - 3, 3, 3);
  }
  x.fillStyle = '#01040a'; x.fillRect(0, hz, v.viewW, y(H.wall) - hz);
  x.fillStyle = 'rgba(' + O + ',.12)'; x.fillRect(0, hz, v.viewW, 1);
  const span = v.viewW + 40;
  for (const [rx, d, len] of H_RIPPLES) {
    const p = 0.12 + 0.3 * d, px = (((rx - v.cam * p + t * 0.08) % span) + span) % span - 20;
    x.fillStyle = 'rgba(170,210,255,' + (0.04 + 0.06 * d) + ')';
    x.fillRect(Math.round(px), Math.round(hz + 3 + d * (y(H.wall) - hz - 6)), Math.round(len), 1);
  }
  // middle band: the sea wall behind the track and a railing on it
  box(x, 0, y(H.wall), v.viewW, H.wall - DECK, '#0d0907');
  x.fillStyle = 'rgba(' + O + ',.4)'; x.fillRect(0, y(H.wall), v.viewW, 1);
  x.fillStyle = 'rgba(' + O + ',.3)'; x.fillRect(0, y(H.wall + 16), v.viewW, 1);
  for (let wx = -40; wx < 2600; wx += 22) { const s = v.sx(wx, 0.9); if (s >= -1 && s <= v.viewW) x.fillRect(s, y(H.wall + 16), 1, 16); }
}

/** The canopy over the platform on its posts, lamps under it (in front of the train). */
function drawCanopy(x: CanvasRenderingContext2D, v: View) {
  const { y, sx } = v, Cn = H.canopy;
  // the roof: corrugated, its edge rusty, lamps under it
  const a = Math.max(0, sx(-60)), b = Math.min(v.viewW, sx(H.width + 60));
  if (b > a) {
    box(x, a, y(Cn.fascia), b - a, Cn.fascia - Cn.under, '#140d09', 'rgba(' + O + ',.55)');
    x.fillStyle = 'rgba(' + O + ',.18)'; for (let wx = -60; wx < H.width + 60; wx += 6) { const s = sx(wx); if (s >= a && s <= b) x.fillRect(s, y(Cn.fascia) + 2, 1, Cn.fascia - Cn.under - 4); }
    x.fillStyle = 'rgba(' + O + ',.3)'; x.fillRect(a, y(Cn.fascia + 4), b - a, 4);
  }
  for (const wx of H.lamps) {
    const s = sx(wx);
    if (!onScreen(v, s - 40, 80)) continue;
    const g = x.createLinearGradient(0, y(Cn.under), 0, v.gy);
    g.addColorStop(0, 'rgba(255,230,190,.07)'); g.addColorStop(1, 'rgba(255,230,190,0)');
    x.fillStyle = g;
    x.beginPath(); x.moveTo(s - 10, y(Cn.under - 3)); x.lineTo(s + 10, y(Cn.under - 3)); x.lineTo(s + 34, v.gy); x.lineTo(s - 34, v.gy); x.closePath(); x.fill();
    box(x, s - 8, y(Cn.under), 16, 4, 'rgba(255,240,215,.85)');
  }
  for (const p of H.posts) {
    const s = sx(p);
    if (!onScreen(v, s - 30, 60)) continue;
    x.strokeStyle = 'rgba(' + O + ',.45)'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(s, y(Cn.under - 26)); x.lineTo(s - 26, y(Cn.under)); x.moveTo(s, y(Cn.under - 26)); x.lineTo(s + 26, y(Cn.under)); x.stroke(); x.lineWidth = 1;
    box(x, s - 5, y(Cn.under), 10, Cn.under, '#1c120c', 'rgba(' + O + ',.65)');
    x.fillStyle = 'rgba(' + O + ',.25)'; x.fillRect(s - 1, y(Cn.under), 2, Cn.under);
  }
}

/** The gate out to the pier: two posts, a turnstile, a light over it. */
function drawGate(x: CanvasRenderingContext2D, v: View, wx: number) {
  const { y } = v, s = v.sx(wx);
  if (!onScreen(v, s - 40, 120)) return;
  box(x, s - 28, y(72), 6, 72, '#1c120c', 'rgba(' + O + ',.7)');
  box(x, s + 20, y(72), 6, 72, '#1c120c', 'rgba(' + O + ',.7)');
  box(x, s - 28, y(78), 54, 6, '#1c120c', 'rgba(' + O + ',.7)');
  box(x, s - 12, y(26), 14, 26, '#16100c', 'rgba(' + O + ',.6)');
  x.fillStyle = 'rgba(' + O + ',.8)'; x.fillRect(s + 2, y(22), 16, 2); x.fillRect(s - 4, y(30), 2, 10);
  x.fillStyle = 'rgba(34,197,94,.9)'; x.fillRect(s - 8, y(22), 3, 3);
  exitPlate(x, v, s, '< HARBOR · PIER');
}

export const harborStation: Scene = {
  id: 'harborStation',
  name: 'Harbor Station',
  width: H.width,
  spawn: H.spawn,
  ambient: { sky: true, rain: true },
  intro: ['Harbor station. Salt, diesel, and a timetable nobody believes.'],
  exits: [
    { id: 'harbor', x: H.exit, to: 'harbor', at: 'metro', label: '[E] GATE · HARBOR PIER', promptH: 92 },
    { id: 'train', x: H.boardAt, to: '', action: 'board', label: '[E] BOARD', promptH: 84 },
  ],
  readables: [
    { id: 'board', x: H.board, name: 'DEPARTURES', promptH: 120, pages: ['LINE 0 > DOWNTOWN, then GALLERIA, then here again.', 'The last stop before the line remembers where it started.'] },
    { id: 'tide', x: H.tide, name: 'TIDE TABLE', promptH: 84, pages: ['HIGH TIDE: 03:12. LOW TIDE: 09:40.', 'Platform floods at high tide. Trains run anyway. So do you.'] },
  ],

  drawBackdrop(x, v) {
    const { sx, y, t } = v;
    // far band: the water and what is across it, the sea wall; play: the track, the train, the canopy over the platform
    drawWaterfront(x, v);
    drawTrack(x, v, 'harbor', STOP);
    drawCanopy(x, v);
    // play band: names on the canopy, the board, benches, the tide table, the gate
    for (const wx of [170, 900]) nameplate(x, v, sx(wx), 140, 'HARBOR', H.canopy.under);
    drawDepartures(x, v, 'harbor', H.board, 112, H.canopy.under);
    for (const b of H.benches) drawBench(x, v, b);
    const tx = sx(H.tide);
    if (onScreen(v, tx - 30, 60)) { box(x, tx - 1, y(44), 3, 44, '#2a160a'); notice(x, t, tx, y(74), 52, 30, ['TIDE', 'TABLE'], 1); }
    drawGate(x, v, H.exit);
    drawSlab(x, v, H.width, '#0b0806');
    for (const wx of H.lamps) reflect(x, v, sx(wx), '255,230,190', 0.8, 16);
  },
};
