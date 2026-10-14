/**
 * The harbor at night: a pier with container stacks and two gantry cranes, black
 * water behind it with the far city on the horizon, and a ferry crossing slowly.
 * Bands: far = skyline and water; middle = the ferry; play = pier, containers, cranes.
 */

import { drawTaxiPad } from '../city';
import { box, drawTowers, exitDoor, figure, notice, O, onScreen, PAPER, RED, rng, sign, text, towers, type Scene, type View } from './kit';

/** The horizon: water from the pier's back edge up to here. */
const HZ = 84;

/** Layout: positions in world units, heights up from the pier. */
const L = {
  width: 1500,
  spawn: 76,
  hut: { x: 0, w: 74, h: 72 },
  /** Container stacks: `x` is the left edge, each tier is a palette index. */
  stacks: [
    { x: 170, tiers: [0, 2, 1] }, { x: 304, tiers: [3, 0] }, { x: 438, tiers: [1] },
    { x: 780, tiers: [2, 3] }, { x: 914, tiers: [0, 1] }, { x: 1048, tiers: [3] },
  ],
  cranes: [{ x: 640, name: 'STS-2', phase: 0 }, { x: 1206, name: 'STS-3', phase: 2.1 }],
  bollards: [140, 560, 740, 1010, 1250],
  stencils: ['NULLROUTE LOGISTICS', 'CONTENTS: UNDECLARED', 'THIS SIDE UP (ANY)', 'NRLU 404 0451'],
  beacon: 1484,
  /** Play-level ways out: the metro station door in the guard hut, the sky-taxi pad on the pier. */
  metro: 26,
  taxi: 1335,
};

const CW = 128, CH = 58;
const FILL = ['#1c0e06', '#0c1313', '#170b12', '#15110a'];
const EDGE = ['rgba(255,136,0,.75)', 'rgba(150,170,160,.6)', 'rgba(200,120,150,.55)', 'rgba(220,180,90,.6)'];

const SKYLINE = towers(41, 1700, [16, 40], [18, 70], 0.08);
/** The tall towers of the far city, further off still, behind the low skyline. */
const SPIRES = towers(45, 2200, [12, 30], [60, 190], 0.05);
/** Cloud banks lit from below by the city: [x, width, height offset, thickness], laid out once. */
const CLOUDS = (() => { const r = rng(47); return Array.from({ length: 40 }, () => [r() * 2400, 120 + r() * 260, r() * 30, 6 + r() * 10]); })();
/** Crane apex: height of the A-frame's top. */
const APEX = 320;

/**
 * The sky over the water, so a tall screen sees more night rather than a dead band:
 * the far city's spires with their warning lights, and banks of cloud lit orange
 * from below by the city, dimmer the higher they are. Far band only.
 */
function drawSkyDepth(x: CanvasRenderingContext2D, v: View) {
  const { y, t } = v, top = v.gy;
  drawTowers(x, v, SPIRES, 0.06, y(HZ), 0.06, '#020100', 1);
  for (const b of SPIRES) {
    if (b.h < 150) continue;
    const s = v.sx(b.x, 0.06) + Math.floor(b.w / 2);
    if (s < 0 || s > v.viewW) continue;
    x.fillStyle = 'rgba(' + RED + ',' + (Math.sin(t * 0.03 + b.x) > 0.3 ? 0.55 : 0.12) + ')'; x.fillRect(s - 1, y(HZ + b.h) - 2, 2, 2);
  }
  // cloud banks, one layer every 70 units up to the top of the view
  const span = 2400;
  for (let k = 0, h = HZ + 120; h < top - 6; k++, h += 70) {
    const a = 0.07 * Math.max(0.35, 1 - k * 0.2);
    for (let i = k % 2; i < CLOUDS.length; i += 2) {
      const [cx, w, dh, th] = CLOUDS[i];
      const s = (((cx + k * 530 - t * 0.03 * (1 + k * 0.3) - v.cam * (0.04 + k * 0.01)) % span) + span) % span - 300;
      if (s > v.viewW || s + w < 0) continue;
      const cy = y(h + dh);
      x.fillStyle = 'rgba(194,65,12,' + a * 0.6 + ')'; x.beginPath(); x.ellipse(s + w / 2, cy, w / 2, th, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(255,136,0,' + a * 0.5 + ')'; x.fillRect(Math.round(s + w * 0.2), Math.round(cy + th * 0.6), Math.round(w * 0.6), 1);
    }
  }
}
const ripples: [number, number, number][] = (() => { const r = rng(43); return Array.from({ length: 90 }, () => [r() * 2000, 4 + r() * (HZ - 8), 4 + r() * 14]); })();

function drawContainer(x: CanvasRenderingContext2D, sx: number, top: number, kind: number, label: string) {
  box(x, sx, top, CW, CH, FILL[kind], EDGE[kind]);
  x.fillStyle = 'rgba(0,0,0,.35)';
  for (let i = 6; i < CW - 4; i += 5) x.fillRect(sx + i, top + 3, 1, CH - 6);
  x.fillStyle = 'rgba(' + O + ',.25)'; x.fillRect(sx + CW - 14, top + 6, 2, CH - 12); x.fillRect(sx + CW - 9, top + 6, 2, CH - 12);
  text(x, label, sx + (CW - 18) / 2, top + CH / 2, 'rgba(' + PAPER + ',.5)', 7);
}

function drawCrane(x: CanvasRenderingContext2D, v: View, cx: number, name: string, phase: number) {
  const { sx, y, t } = v, l0 = sx(cx - 80), l1 = sx(cx + 74);
  if (!onScreen(v, sx(cx - 230), 460)) return;
  const steel = '#21110a', edge = 'rgba(' + O + ',.8)';
  // the A-frame over the legs and its stays out to both ends of the boom; it leaves the top of a short view
  const ap = sx(cx - 20), b0 = sx(cx - 230), b1 = sx(cx + 150);
  x.strokeStyle = 'rgba(' + O + ',.5)'; x.lineWidth = 3; x.beginPath();
  x.moveTo(l0 + 3, y(232)); x.lineTo(ap, y(APEX)); x.lineTo(l1 + 3, y(232)); x.stroke(); x.lineWidth = 1;
  x.strokeStyle = 'rgba(' + O + ',.3)'; x.beginPath();
  x.moveTo(ap, y(APEX)); x.lineTo(b0 + 4, y(206)); x.moveTo(ap, y(APEX - 4)); x.lineTo(sx(cx - 130), y(206));
  x.moveTo(ap, y(APEX)); x.lineTo(b1 - 4, y(206)); x.stroke();
  box(x, ap - 6, y(APEX + 6), 12, 6, steel, edge);
  x.fillStyle = Math.sin(t * 0.04 + phase + 1) > 0 ? 'rgba(' + RED + ',.9)' : 'rgba(' + RED + ',.2)'; x.fillRect(ap - 1, y(APEX + 9), 3, 3);
  // legs, sill and portal beam
  for (const lx of [l0, l1]) box(x, lx, y(232), 6, 232, steel, edge);
  box(x, l0, y(48), l1 - l0 + 6, 6, steel, edge);
  box(x, l0, y(170), l1 - l0 + 6, 8, steel, edge);
  x.strokeStyle = 'rgba(' + O + ',.35)'; x.beginPath();
  x.moveTo(l0 + 6, y(54)); x.lineTo(l1, y(162)); x.moveTo(l1, y(54)); x.lineTo(l0 + 6, y(162)); x.stroke();
  // the boom out over the water, a lattice
  box(x, b0, y(206), b1 - b0, 4, steel, edge); box(x, b0, y(194), b1 - b0, 3, steel, edge);
  x.strokeStyle = 'rgba(' + O + ',.4)'; x.beginPath();
  for (let i = b0; i < b1 - 10; i += 12) { x.moveTo(i, y(191)); x.lineTo(i + 12, y(203)); }
  x.stroke();
  // machinery house with its name plate
  box(x, sx(cx - 40), y(232), 80, 26, '#1a0e08', edge);
  text(x, name, sx(cx), y(219), 'rgba(' + PAPER + ',.75)', 8, '600');
  x.fillStyle = Math.sin(t * 0.04 + phase) > 0 ? 'rgba(' + RED + ',1)' : 'rgba(' + RED + ',.25)';
  x.fillRect(sx(cx) - 2, y(238), 4, 4);
  // trolley, cable and a container on the spreader, moving slowly along the boom
  const tx = sx(cx - 40 + Math.sin(t * 0.004 + phase) * 150), hang = 128 + Math.round(Math.sin(t * 0.01 + phase) * 6);
  box(x, tx - 10, y(194) + 3, 20, 6, '#2a160a', edge);
  x.strokeStyle = 'rgba(' + PAPER + ',.45)'; x.beginPath(); x.moveTo(tx - 4.5, y(188)); x.lineTo(tx - 4.5, y(hang + 4)); x.moveTo(tx + 4.5, y(188)); x.lineTo(tx + 4.5, y(hang + 4)); x.stroke();
  box(x, tx - CW / 2 - 2, y(hang + 4), CW + 4, 4, '#2a160a', edge);
  drawContainer(x, tx - CW / 2, y(hang), (phase > 1 ? 2 : 0), 'IN TRANSIT');
  // floodlight under the portal beam, lighting the pier below
  const fx = sx(cx);
  const g = x.createLinearGradient(0, y(166), 0, y(0));
  g.addColorStop(0, 'rgba(255,217,165,.16)'); g.addColorStop(1, 'rgba(255,217,165,.03)');
  x.fillStyle = g; x.beginPath(); x.moveTo(fx - 4, y(166)); x.lineTo(fx - 70, y(0)); x.lineTo(fx + 70, y(0)); x.lineTo(fx + 4, y(166)); x.closePath(); x.fill();
  box(x, fx - 6, y(170) + 8, 12, 4, '#ffd9a5');
}

export const harbor: Scene = {
  id: 'harbor',
  name: 'Harbor',
  width: L.width,
  spawn: L.spawn,
  ambient: { sky: true, rain: true },
  intro: ['The harbor. Everything here is in a box, and nobody asks what.'],
  exits: [
    { id: 'metro', x: L.metro, to: 'harborStation', at: 'harbor', label: '[E] TO THE METRO', promptH: 82 },
    { id: 'taxi', x: L.taxi, to: '', action: 'taxi', label: '[E] HAIL TAXI', promptH: 122 },
  ],
  readables: [
    { id: 'notice', x: 118, name: 'PORT AUTHORITY', promptH: 78, pages: ['All cargo is inspected.', 'Inspected: someone looked at the outside of it.'] },
    { id: 'manifest', x: 470, name: 'MANIFEST', promptH: 74, pages: ['1 container. Contents: yes.', 'Origin: redacted. Destination: redacted. Insurance: void.'] },
    { id: 'ferry', x: 1400, name: 'NIGHT FERRY', promptH: 78, pages: ['Departs when full. Arrives eventually.', 'Tickets are not sold. They are inferred.'] },
  ],

  drawBackdrop(x, v) {
    const { sx, y, t, gy } = v;
    // far band: smog glow on the horizon, the far city, black water with slow ripples
    const glow = x.createLinearGradient(0, y(HZ + 70), 0, y(HZ));
    glow.addColorStop(0, 'rgba(194,65,12,0)'); glow.addColorStop(1, 'rgba(194,65,12,.12)');
    x.fillStyle = glow; x.fillRect(0, y(HZ + 70), v.viewW, 70);
    drawSkyDepth(x, v);
    drawTowers(x, v, SKYLINE, 0.12, y(HZ), 0.12, '#030100', 1);
    x.fillStyle = '#01040a'; x.fillRect(0, y(HZ), v.viewW, gy - y(HZ));
    x.fillStyle = 'rgba(' + O + ',.12)'; x.fillRect(0, y(HZ), v.viewW, 1);
    const span = v.viewW + 40;
    for (const [rx, rh, len] of ripples) {
      const p = 0.12 + 0.5 * (1 - rh / HZ);
      const px = (((rx - v.cam * p + t * 0.08) % span) + span) % span - 20;
      x.fillStyle = 'rgba(170,210,255,' + (0.04 + 0.06 * (1 - rh / HZ)) + ')';
      x.fillRect(Math.round(px), y(rh), Math.round(len), 1);
    }

    // middle band: the ferry, crossing on a long loop, and its reflection
    const fspan = 2600, fx = ((t * 0.16) % fspan) - 400, f = v.sx(fx, 0.45), wl = y(30);
    if (onScreen(v, f - 100, 200)) {
      x.fillStyle = '#0a0705'; x.beginPath(); x.moveTo(f - 96, wl - 14); x.lineTo(f + 96, wl - 14); x.lineTo(f + 84, wl); x.lineTo(f - 88, wl); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(' + O + ',.45)'; x.stroke();
      box(x, f - 60, wl - 28, 120, 14, '#0c0806', 'rgba(' + O + ',.35)');
      box(x, f - 36, wl - 38, 64, 10, '#0c0806', 'rgba(' + O + ',.35)');
      x.fillStyle = 'rgba(255,217,165,.55)';
      for (let i = -54; i < 56; i += 8) x.fillRect(f + i, wl - 24, 4, 4);
      for (let i = -30; i < 24; i += 8) x.fillRect(f + i, wl - 35, 4, 3);
      x.fillStyle = 'rgba(255,217,165,.9)'; x.fillRect(f + 20, wl - 48, 2, 10); x.fillRect(f + 19, wl - 50, 4, 2);
      text(x, 'NIGHT FERRY 7', f, wl - 8, 'rgba(' + PAPER + ',.45)', 7);
      for (let i = 0; i < 5; i++) { x.fillStyle = 'rgba(255,217,165,' + (0.07 - i * 0.012) + ')'; x.fillRect(f - 56 + Math.sin(t * 0.05 + i) * 2, wl + 2 + i * 3, 112, 1); }
    }

    // play band: the pier deck, its back edge lit
    x.fillStyle = '#0e0905'; x.fillRect(0, y(6), v.viewW, 6);
    x.fillStyle = 'rgba(' + O + ',.6)'; x.fillRect(0, y(6), v.viewW, 1);

    // the guard hut with the way back
    const hx = sx(L.hut.x);
    if (onScreen(v, hx, L.hut.w)) {
      box(x, hx, y(L.hut.h), L.hut.w, L.hut.h, '#140b06', 'rgba(' + O + ',.8)');
      box(x, hx + 46, y(56), 20, 18, 'rgba(255,217,165,.22)', 'rgba(' + O + ',.6)');
      figure(x, hx + 56, y(38), 17, '#140b06');
      box(x, hx - 4, y(L.hut.h + 4), L.hut.w + 8, 5, '#1c0f07', 'rgba(' + O + ',.8)');
    }
    exitDoor(x, v, L.metro, '#0a0603', '< METRO');

    // crane legs stand behind the stacks
    for (const c of L.cranes) drawCrane(x, v, c.x, c.name, c.phase);

    L.stacks.forEach((s, si) => {
      const s0 = sx(s.x);
      if (!onScreen(v, s0, CW)) return;
      s.tiers.forEach((kind, i) => drawContainer(x, s0, y((i + 1) * CH), kind, L.stencils[(si + i) % L.stencils.length]));
    });

    for (const bx of L.bollards) {
      const b = sx(bx);
      if (!onScreen(v, b - 8, 16)) continue;
      box(x, b - 5, y(10), 10, 10, '#1a0f08', 'rgba(' + O + ',.7)'); box(x, b - 7, y(12), 14, 3, '#24140a', 'rgba(' + O + ',.7)');
    }

    // readables: a notice on a post, a paper manifest on a container door, the ferry timetable
    const nx = sx(118);
    if (onScreen(v, nx - 30, 60)) { box(x, nx - 1, y(44), 3, 44, '#2a160a'); notice(x, t, nx, y(72), 52, 30, ['PORT', 'AUTHORITY']); }
    const mx = sx(470);
    if (onScreen(v, mx - 20, 40)) notice(x, t, mx, y(44), 30, 26, ['MANI', 'FEST'], 1);
    const tx = sx(1400);
    if (onScreen(v, tx - 30, 60)) { box(x, tx - 1, y(44), 3, 44, '#2a160a'); notice(x, t, tx, y(74), 58, 32, ['FERRY', 'TIMES'], 2); }

    // end of the pier: railing and a beacon on its mast
    const ex = sx(L.beacon);
    if (onScreen(v, ex - 40, 60)) {
      x.strokeStyle = 'rgba(' + O + ',.6)'; x.beginPath(); x.moveTo(ex - 40, y(24) + 0.5); x.lineTo(ex + 16, y(24) + 0.5); x.stroke();
      for (let i = -40; i <= 16; i += 14) { x.beginPath(); x.moveTo(ex + i + 0.5, y(0)); x.lineTo(ex + i + 0.5, y(24)); x.stroke(); }
      box(x, ex - 1, y(110), 3, 110, '#2a160a', 'rgba(' + O + ',.6)');
      x.fillStyle = Math.sin(t * 0.03) > 0.6 ? 'rgba(255,217,165,.2)' : 'rgba(255,217,165,.9)'; x.fillRect(ex - 3, y(116), 7, 6);
    }
    drawTaxiPad(x, v, L.taxi);
    sign(x, t, 'BERTH 9', sx(1210), y(96), O, { size: 8, phase: 30 });
    box(x, sx(1210) - 1, y(88), 3, 88, '#2a160a');

    // the pier's face and the black water in front of it
    x.fillStyle = '#0c0805'; x.fillRect(0, gy, v.viewW, 12);
    x.fillStyle = 'rgba(' + O + ',.55)'; x.fillRect(0, gy, v.viewW, 1);
    x.fillStyle = '#01030a'; x.fillRect(0, gy + 12, v.viewW, v.viewH - gy - 12);
    for (let wx = 60; wx < L.width; wx += 180) {
      const s = sx(wx);
      if (!onScreen(v, s - 8, 16)) continue;
      x.strokeStyle = 'rgba(40,30,25,1)'; x.lineWidth = 3; x.beginPath(); x.arc(s, gy + 9, 5, 0, 7); x.stroke(); x.lineWidth = 1;
    }
    for (const c of L.cranes) {
      const s = sx(c.x);
      for (let i = 0; i < 8; i++) { x.fillStyle = 'rgba(255,217,165,' + 0.08 * (1 - i / 8) + ')'; x.fillRect(s - 8 + Math.sin(t * 0.05 + i) * 2, gy + 16 + i * 4, 16, 2); }
    }
  },

  drawFront(x, v) {
    // a near bollard with its rope, passing at the bottom of the view
    for (const fx of [360, 1040]) {
      const s = v.sx(fx, 1.3), base = v.gy + 46;
      if (!onScreen(v, s - 20, 40)) continue;
      box(x, s - 10, base - 18, 20, 18, '#020100', 'rgba(' + O + ',.3)'); box(x, s - 14, base - 22, 28, 5, '#020100', 'rgba(' + O + ',.3)');
      x.strokeStyle = 'rgba(120,90,60,.5)'; x.lineWidth = 2; x.beginPath(); x.moveTo(s + 10, base - 14); x.quadraticCurveTo(s + 60, base - 2, s + 120, base - 30); x.stroke(); x.lineWidth = 1;
    }
  },
};
