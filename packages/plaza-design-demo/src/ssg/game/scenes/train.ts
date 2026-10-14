/**
 * Inside a train carriage: bench seats under the windows, the city sliding past
 * outside, handrails and swaying straps, a few riders. Bands: far = the city
 * through the windows; middle = the carriage wall and ad cards; play = seats,
 * riders, poles and straps.
 */

import { box, ceiling, exitDoor, O, onScreen, PAPER, RED, rng, tell, text, towers, type Scene, type View } from './kit';

/** Layout: positions in world units, heights up from the carriage floor. */
const L = {
  width: 1200,
  spawn: 86,
  ceil: 150,
  /** Windows (left edges) with a bench seat under each; doors (centres) between them. */
  windows: [70, 200, 460, 590, 860, 990],
  winW: 100,
  win: { h0: 58, h1: 112 },
  doors: [380, 780],
  /** Ad cards over the windows. */
  ads: [{ x: 250, text: 'LOSE WEIGHT: DELETE PROFILE' }, { x: 640, text: 'AD SPACE · YOU ARE READING IT' }, { x: 1040, text: 'SMILE · YOU ARE ON CAMERA' }],
  poles: [180, 330, 560, 720, 950],
  frontPoles: [430, 880],
  bar: 126,
  /** Riders on the benches: [x, phone]. */
  riders: [[96, 0], [150, 1], [520, 0], [628, 0], [906, 1], [1060, 0]],
  gangway: 1130,
  gangDoor: 56,
  brake: 1145,
};

const SKY = towers(97, 2400, [24, 70], [40, 130], 0.12);
const MID = (() => { const r = rng(99); return Array.from({ length: 14 }, (_, i) => [i * 170 + r() * 80, 20 + r() * 40, 30 + r() * 30]); })();
const STREAKS = (() => { const r = rng(101); return Array.from({ length: 18 }, () => [r() * 1200, r() * 54]); })();

function drawOutside(x: CanvasRenderingContext2D, v: View) {
  const { y, t } = v, top = y(L.win.h1), bottom = y(L.win.h0);
  x.save(); x.beginPath();
  for (const wx of L.windows) { const s = v.sx(wx); if (onScreen(v, s, L.winW)) x.rect(s + 3, top + 3, L.winW - 6, bottom - top - 6); }
  for (const d of L.doors) { const s = v.sx(d); x.rect(s - 18, y(56), 12, 22); x.rect(s + 6, y(56), 12, 22); }
  x.clip();
  x.fillStyle = '#04030a'; x.fillRect(0, top, v.viewW, bottom - top);
  // far: the skyline, sliding slowly
  const span = 2400, off = t * 0.6 + v.cam * 0.2;
  for (const b of SKY) {
    const s = ((b.x - off) % span + span) % span - 100;
    if (s > v.viewW || s + b.w < 0) continue;
    x.fillStyle = '#0a0503'; x.fillRect(s, bottom - b.h * 0.45, b.w, b.h * 0.45);
    x.fillStyle = 'rgba(255,136,0,.35)';
    for (let i = 0; i < b.lit.length; i += 4) x.fillRect(s + b.lit[i], bottom - b.h * 0.45 + b.lit[i + 1] * 0.45, 2, 1);
  }
  // nearer: blocks and pylons racing past
  const off2 = t * 5 + v.cam;
  for (const [mx, h, w] of MID) {
    const s = ((mx - off2) % span + span) % span - 100;
    if (s > v.viewW || s + w < 0) continue;
    x.fillStyle = '#020101'; x.fillRect(s, bottom - h, w, h);
    x.fillStyle = 'rgba(255,190,110,.2)'; x.fillRect(s + 4, bottom - h + 6, 3, 2);
    x.fillStyle = '#020101'; x.fillRect(s + w + 30, top, 4, bottom - top);
  }
  // rain on the glass, blown sideways
  x.strokeStyle = 'rgba(170,210,255,.18)';
  for (const [sx0, sy] of STREAKS) {
    const s = ((sx0 - t * 3) % 1200 + 1200) % 1200 - 50;
    x.beginPath(); x.moveTo(s, top + sy); x.lineTo(s + 6, top + sy + 1); x.stroke();
  }
  x.restore();
}

export const train: Scene = {
  id: 'train',
  name: 'Train',
  width: L.width,
  spawn: L.spawn,
  intro: ['On the train. Nobody checked a ticket, which means somebody checked everything else.'],
  exits: [{ id: 'downtown', x: 32, to: 'downtown', label: '[E] DOWNTOWN', promptH: 82 }],
  readables: [
    { id: 'map', x: 380, name: 'LINE MAP', promptH: 96, pages: ['LINE 0: PLAZA CENTRAL → PLAZA CENTRAL.', 'Journey time varies. The destination does not.'] },
    { id: 'ad', x: 640, name: 'AD CARD', promptH: 156, pages: ['ADVERTISING SPACE AVAILABLE.', 'You are reading this, so it works.'] },
    { id: 'brake', x: L.brake, name: 'EMERGENCY BRAKE', promptH: 86, pages: ['Pull only in an emergency.', 'Emergencies must be registered at least 48 hours in advance.'] },
  ],

  drawBackdrop(x, v) {
    const { sx, y, t, gy } = v, w0 = sx(0), w1 = sx(L.width);
    x.fillStyle = '#020101'; x.fillRect(0, 0, v.viewW, v.viewH);
    // middle band: the carriage wall, windows cut into it
    box(x, w0, y(L.ceil), w1 - w0, L.ceil, '#0e0a08');
    box(x, w0, y(L.win.h0), w1 - w0, L.win.h0, '#130d0a');
    drawOutside(x, v);
    for (const wx of L.windows) {
      const s = sx(wx);
      if (!onScreen(v, s, L.winW)) continue;
      x.strokeStyle = 'rgba(' + O + ',.75)'; x.lineWidth = 3; x.strokeRect(s + 1.5, y(L.win.h1) + 1.5, L.winW - 3, L.win.h1 - L.win.h0 - 3); x.lineWidth = 1;
    }
    ceiling(x, v, L.ceil);
    box(x, w0, y(L.ceil - 2), w1 - w0, 3, 'rgba(255,240,215,.75)');
    const g = x.createLinearGradient(0, y(L.ceil), 0, y(L.ceil - 40));
    g.addColorStop(0, 'rgba(255,240,215,.08)'); g.addColorStop(1, 'rgba(255,240,215,0)');
    x.fillStyle = g; x.fillRect(w0, y(L.ceil), w1 - w0, 40);
    for (const a of L.ads) {
      const s = sx(a.x);
      if (!onScreen(v, s - 72, 144)) continue;
      box(x, s - 70, y(144), 140, 16, '#1a120b', 'rgba(' + O + ',.5)');
      text(x, a.text, s - 2, y(136), 'rgba(' + PAPER + ',.75)', 7, '600');
    }
    tell(x, t, sx(640) + 65, y(136));

    // the end door you came in by, and the gangway at the far end
    exitDoor(x, v, 32, '#0a0603');
    const gw = sx(L.gangway);
    if (onScreen(v, gw, 80)) {
      box(x, gw, y(L.ceil), L.width - L.gangway, L.ceil, '#16100c', 'rgba(' + O + ',.8)');
      const D = L.gangDoor, bk = sx(L.brake);
      box(x, gw + 30, y(D), 34, D, '#0c0806', 'rgba(' + O + ',.6)');
      x.fillStyle = 'rgba(255,217,165,.3)'; x.fillRect(gw + 35, y(D - 6), 24, 20);
      box(x, gw + 2, y(D + 18), 66, 12, '#1a120b', 'rgba(' + O + ',.5)');
      text(x, 'CAR 3 OF 3', gw + 35, y(D + 12), 'rgba(' + PAPER + ',.8)', 7, '600');
      // the emergency brake: a red handle on a plate
      box(x, bk - 8, y(52), 16, 22, '#1a0a0a', 'rgba(' + RED + ',.8)');
      x.fillStyle = 'rgba(' + RED + ',.95)'; x.fillRect(bk - 4, y(46), 8, 3);
      tell(x, t, bk + 4, y(34), 2);
    }

    // doors, with the line map over the first
    for (const d of L.doors) {
      const s = sx(d);
      if (!onScreen(v, s - 26, 52)) continue;
      box(x, s - 24, y(66), 48, 66, '#100c0a', 'rgba(' + O + ',.8)');
      x.fillStyle = 'rgba(' + O + ',.5)'; x.fillRect(s, y(66), 1, 66);
      x.strokeStyle = 'rgba(' + O + ',.6)'; x.strokeRect(s - 18.5, y(56) + 0.5, 12, 22); x.strokeRect(s + 6.5, y(56) + 0.5, 12, 22);
    }
    const mp = sx(380);
    if (onScreen(v, mp - 44, 88)) {
      box(x, mp - 40, y(86), 80, 16, '#1a120b', 'rgba(' + O + ',.6)');
      x.fillStyle = 'rgba(' + PAPER + ',.5)'; x.fillRect(mp - 32, y(78), 64, 1);
      for (let i = 0; i < 5; i++) { x.fillStyle = i === 2 && Math.floor(t / 25) % 2 ? 'rgba(255,136,0,1)' : 'rgba(' + PAPER + ',.6)'; x.fillRect(mp - 33 + i * 16, y(80), 3, 4); }
      tell(x, t, mp + 36, y(74), 1);
    }

    // play band: benches under the windows, the riders on them
    for (const wx of L.windows) {
      const s = sx(wx);
      if (!onScreen(v, s - 4, L.winW + 8)) continue;
      box(x, s - 2, y(52), L.winW + 4, 28, '#14262a', 'rgba(' + O + ',.6)');
      box(x, s - 4, y(24), L.winW + 8, 6, '#1c3237', 'rgba(' + O + ',.8)');
      box(x, s + 4, y(18), L.winW - 8, 18, '#0a0706');
    }
    for (const [rx, phone] of L.riders) {
      const s = sx(rx);
      if (!onScreen(v, s - 10, 20)) continue;
      x.fillStyle = '#0a0605';
      x.fillRect(s - 7, y(50), 14, 26); x.fillRect(s - 4, y(60), 9, 10);
      x.fillRect(s - 6, y(24), 4, 24); x.fillRect(s + 2, y(24), 4, 24);
      x.fillStyle = 'rgba(255,217,165,.3)'; x.fillRect(s - 4, y(60), 9, 1);
      if (phone) { x.fillStyle = 'rgba(170,210,255,.7)'; x.fillRect(s - 2, y(38), 5, 4); x.fillStyle = 'rgba(170,210,255,.25)'; x.fillRect(s - 4, y(58), 9, 7); }
    }
    // handrail and the straps on it, swaying with the track
    x.fillStyle = 'rgba(255,190,110,.6)'; x.fillRect(w0, y(L.bar), w1 - w0, 2);
    for (let wx = 60; wx < L.gangway; wx += 30) {
      const s = sx(wx);
      if (s < -6 || s > v.viewW + 6) continue;
      const sw = Math.round(Math.sin(t * 0.05 + wx * 0.02) * 2);
      x.strokeStyle = 'rgba(255,190,110,.4)'; x.beginPath(); x.moveTo(s + 0.5, y(L.bar - 2)); x.lineTo(s + 0.5 + sw, y(L.bar - 12)); x.stroke();
      x.strokeRect(s - 2.5 + sw, y(L.bar - 12) + 0.5, 6, 5);
    }
    for (const p of L.poles) drawPole(x, v, p);

    // the floor
    x.fillStyle = '#070504'; x.fillRect(w0, gy, w1 - w0, v.viewH - gy);
    x.fillStyle = 'rgba(' + O + ',.55)'; x.fillRect(w0, gy, w1 - w0, 1);
    for (let i = 0; i < 4; i++) { x.fillStyle = 'rgba(255,217,165,.035)'; x.fillRect(w0, gy + 6 + i * 10, w1 - w0, 2); }
  },

  drawFront(x, v) {
    for (const p of L.frontPoles) drawPole(x, v, p);
  },
};

function drawPole(x: CanvasRenderingContext2D, v: View, wx: number) {
  const s = v.sx(wx);
  if (s < -4 || s > v.viewW + 4) return;
  box(x, s - 1, v.y(L.ceil), 3, L.ceil, 'rgba(255,190,110,.55)');
  x.fillStyle = 'rgba(255,240,215,.7)'; x.fillRect(s - 1, v.y(L.ceil), 1, L.ceil);
}
