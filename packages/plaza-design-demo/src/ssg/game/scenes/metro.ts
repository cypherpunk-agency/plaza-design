/**
 * A metro platform: tiled walls, the track behind the platform edge and a train
 * that pulls in, opens its doors and leaves, on a loop. Bands: far = the tiled
 * wall across the track; middle = track and train; play = the platform,
 * pillars, the departure board, a bench.
 */

import { box, ceiling, exitDoor, figure, notice, O, onScreen, PAPER, RED, rng, tell, text, type Scene, type View } from './kit';

/** Layout: positions in world units, heights up from the platform. */
const L = {
  width: 1300,
  spawn: 86,
  ceil: 156,
  names: [120, 480, 840, 1200, 1560],
  posters: [300, 660, 1020, 1380],
  pillars: [{ x: 330, cam: true }, { x: 730 }, { x: 1130 }] as { x: number; cam?: boolean }[],
  board: 540,
  bench: 930,
  /** The train, in the track's parallax: where it stops, its cars, its loop in frames. */
  train: { stop: 150, cars: 3, car: 290, gap: 8, loop: 1600, arrive: 360, leave: 760, gone: 1100 },
};

const WALL = 0.86, TRACK = 0.94;
/** Who is riding, per window: true = someone in it. */
const RIDERS = (() => { const r = rng(91); return Array.from({ length: 30 }, () => r() < 0.4); })();

/** Where the train's nose is (track coordinates) and whether its doors are open, from the loop's clock. */
function trainAt(t: number): { x: number; open: number; moving: boolean } | null {
  const T = L.train, ph = t % T.loop;
  if (ph < T.arrive) { const f = ph / T.arrive; return { x: T.stop + 1900 * (1 - f) * (1 - f), open: 0, moving: true }; }
  if (ph < T.leave) { const f = (ph - T.arrive) / (T.leave - T.arrive); return { x: T.stop, open: Math.min(1, Math.min(f, 1 - f) * 8), moving: false }; }
  if (ph < T.gone) { const f = (ph - T.leave) / (T.gone - T.leave); return { x: T.stop - 2300 * f * f, open: 0, moving: true }; }
  return null;
}

function drawTrain(x: CanvasRenderingContext2D, v: View) {
  const at = trainAt(v.t);
  if (!at) return;
  const { y } = v, T = L.train, nose = v.sx(at.x, TRACK);
  // headlight on the wall ahead of it
  if (at.moving) {
    const g = x.createRadialGradient(nose, y(40), 2, nose, y(40), 120);
    g.addColorStop(0, 'rgba(255,230,190,.2)'); g.addColorStop(1, 'rgba(255,230,190,0)');
    x.fillStyle = g; x.fillRect(nose - 120, y(160), 240, 160);
  }
  for (let c = 0; c < T.cars; c++) {
    const c0 = nose + c * (T.car + T.gap);
    if (!onScreen(v, c0, T.car)) continue;
    box(x, c0, y(100), T.car, 86, '#14171a', 'rgba(' + O + ',.6)');
    x.fillStyle = 'rgba(' + O + ',.5)'; x.fillRect(c0 + 1, y(44), T.car - 2, 2);
    for (let i = 0; i < 6; i++) {
      const wx = c0 + 14 + i * 46;
      if (i === 1 || i === 4) {
        // doors: open shows the lit inside
        const d = Math.round(at.open * 13);
        box(x, wx, y(74), 32, 58, '#101316', 'rgba(' + O + ',.45)');
        if (d) { x.fillStyle = 'rgba(255,217,165,.45)'; x.fillRect(wx + 16 - d, y(72), d * 2, 56); }
        x.fillStyle = 'rgba(255,217,165,.25)'; x.fillRect(wx + 3 - d, y(66), 9, 14); x.fillRect(wx + 20 + d, y(66), 9, 14);
        continue;
      }
      x.fillStyle = 'rgba(255,217,165,.32)'; x.fillRect(wx, y(84), 32, 24);
      if (RIDERS[(c * 6 + i) % RIDERS.length]) figure(x, wx + 16, y(60), 22, '#0b0907');
    }
    if (c === 0) {
      x.fillStyle = 'rgba(255,240,215,.95)'; x.fillRect(c0 + 3, y(30), 5, 4);
      box(x, c0 + 6, y(98), 64, 11, '#050302');
      text(x, 'LINE 0', c0 + 38, y(92.5), 'rgba(255,136,0,.9)', 7, '600');
    }
  }
}

export const metro: Scene = {
  id: 'metro',
  name: 'Metro',
  width: L.width,
  spawn: L.spawn,
  intro: ['The metro. One line, one station, and a train that never says where it goes.'],
  exits: [{ id: 'downtown', x: 32, to: 'downtown', label: '[E] DOWNTOWN', promptH: 82 }],
  readables: [
    { id: 'board', x: L.board, name: 'DEPARTURES', promptH: 120, pages: ['NEXT TRAIN: NOW.', 'It has said NOW since the day it was installed. It beats the timetable.'] },
    { id: 'map', x: 730, name: 'LINE MAP', promptH: 92, pages: ['LINE 0. All stops: PLAZA CENTRAL.', 'A loop of one. Trains arrive, trains leave, nobody asks where.'] },
    { id: 'poster', x: 1130, name: 'POSTER', promptH: 92, pages: ['REGISTRY PREMIUM: your commute, counted.', 'Free for the first lifetime.'] },
  ],

  drawBackdrop(x, v) {
    const { sx, y, t, gy } = v;
    // far band: the tiled wall across the track
    x.fillStyle = '#0b0a09'; x.fillRect(0, 0, v.viewW, y(14));
    x.fillStyle = 'rgba(255,217,165,.05)';
    for (let h = 22; h < L.ceil; h += 8) x.fillRect(0, y(h), v.viewW, 1);
    for (let wx = 0; wx < 2600; wx += 12) { const s = sx(wx, WALL); if (s >= 0 && s <= v.viewW) x.fillRect(s, y(L.ceil), 1, L.ceil - 16); }
    x.fillStyle = 'rgba(' + O + ',.22)'; x.fillRect(0, y(70), v.viewW, 6);
    for (const n of L.names) {
      const s = sx(n, WALL);
      if (!onScreen(v, s - 50, 100)) continue;
      box(x, s - 48, y(104), 96, 16, '#14100c', 'rgba(' + O + ',.3)');
      text(x, 'PLAZA CENTRAL', s, y(96), 'rgba(' + PAPER + ',.5)', 8, '600');
    }
    for (const p of L.posters) {
      const s = sx(p, WALL);
      if (!onScreen(v, s - 30, 60)) continue;
      box(x, s - 28, y(130), 56, 44, '#120c08', 'rgba(' + O + ',.3)');
      x.fillStyle = 'rgba(255,190,110,.08)'; x.fillRect(s - 25, y(127), 50, 38);
      text(x, 'BE SEEN', s, y(110), 'rgba(' + PAPER + ',.35)', 7, '600');
    }
    // middle band: the track pit, rails and the train
    x.fillStyle = '#020101'; x.fillRect(0, y(14), v.viewW, 12);
    x.fillStyle = 'rgba(160,150,140,.35)'; x.fillRect(0, y(8), v.viewW, 1); x.fillRect(0, y(11), v.viewW, 1);
    for (let wx = 0; wx < 2600; wx += 14) { const s = sx(wx, TRACK); if (s >= -4 && s <= v.viewW) { x.fillStyle = 'rgba(60,40,25,.6)'; x.fillRect(s, y(6), 8, 2); } }
    drawTrain(x, v);

    // play band: the platform edge, the vault overhead, pillars and lamps
    x.fillStyle = 'rgba(255,210,58,.7)'; x.fillRect(0, y(2), v.viewW, 2);
    ceiling(x, v, L.ceil, '#060403');
    for (let wx = 100; wx < L.width; wx += 200) {
      const s = sx(wx);
      if (!onScreen(v, s - 20, 40)) continue;
      box(x, s - 16, y(L.ceil - 2), 32, 3, 'rgba(255,240,215,.85)');
    }
    exitDoor(x, v, 32, '#0a0603');
    for (const p of L.pillars) {
      const s = sx(p.x);
      if (!onScreen(v, s - 20, 40)) continue;
      box(x, s - 12, y(L.ceil), 24, L.ceil, '#181210', 'rgba(' + O + ',.8)');
      if (p.cam) {
        box(x, s + 10, y(134), 14, 8, '#100c0a', 'rgba(' + O + ',.6)');
        x.fillStyle = Math.floor(t / 30) % 2 ? 'rgba(' + RED + ',.95)' : 'rgba(' + RED + ',.3)'; x.fillRect(s + 19, y(131), 2, 2);
      }
    }
    // a line map and a poster on the pillars, both readable
    notice(x, t, sx(730), y(78), 44, 30, ['LINE', 'MAP'], 1);
    notice(x, t, sx(1130), y(78), 44, 30, ['ADS'], 2);

    // the departure board on two rods from the vault
    const bx = sx(L.board);
    if (onScreen(v, bx - 44, 88)) {
      x.strokeStyle = 'rgba(' + O + ',.5)'; x.beginPath(); x.moveTo(bx - 30.5, y(L.ceil)); x.lineTo(bx - 30.5, y(112)); x.moveTo(bx + 30.5, y(L.ceil)); x.lineTo(bx + 30.5, y(112)); x.stroke();
      box(x, bx - 42, y(112), 84, 26, '#050302', 'rgba(' + O + ',.7)');
      const at = trainAt(t), msg = at && !at.moving ? 'BOARDING' : 'NEXT: NOW';
      text(x, msg, bx, y(99), 'rgba(255,136,0,' + (0.75 + 0.2 * Math.sin(t * 0.06)) + ')', 9, '600');
      tell(x, t, bx + 36, y(90));
    }
    // a bench with someone who has given up waiting
    const bn = sx(L.bench);
    if (onScreen(v, bn - 30, 60)) {
      figure(x, bn + 10, y(10), 30, '#0b0807', 0, 'rgba(255,217,165,.3)');
      box(x, bn - 26, y(14), 52, 4, '#2a160a', 'rgba(' + O + ',.8)');
      box(x, bn - 22, y(10), 3, 10, '#2a160a'); box(x, bn + 19, y(10), 3, 10, '#2a160a');
    }

    // the platform floor, with the warning painted on it
    x.fillStyle = '#080605'; x.fillRect(0, gy, v.viewW, v.viewH - gy);
    x.fillStyle = 'rgba(' + O + ',.55)'; x.fillRect(0, gy, v.viewW, 1);
    for (let wx = 0; wx < L.width; wx += 260) { const s = sx(wx + 140); if (onScreen(v, s - 40, 80)) text(x, 'MIND THE GAP', s, gy + 10, 'rgba(255,210,58,.45)', 7, '600'); }
    for (let r = 0; r < 3; r++) { x.fillStyle = 'rgba(255,217,165,.03)'; x.fillRect(0, gy + 18 + r * 12, v.viewW, 1); }
  },

  drawFront(x, v) {
    // a near pillar sliding past
    const s = v.sx(900, 1.3);
    if (!onScreen(v, s - 24, 48)) return;
    box(x, s - 20, 0, 40, v.viewH, '#020100', 'rgba(' + O + ',.25)');
  },
};
