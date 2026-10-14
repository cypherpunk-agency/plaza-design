/**
 * The street market: a row of stalls under striped awnings, strings of bulbs
 * across the street, tenements rising out of the view behind, a crowd in
 * silhouette. Bands: far = towers through the gaps; middle = tenements, light
 * strings and the back crowd; play = stalls, vendors, the wet street.
 */

import { box, DESIGN_TOP, drawTowers, exitDoor, figure, notice, O, onScreen, PAPER, RED, reflect, rng, sign, tell, towers, wetFloor, type Scene, type View } from './kit';

interface Stall { x: number; w: number; awning: number; sign: string; col: string; readable?: boolean }

/** Layout: positions in world units, heights up from the street. */
const L = {
  width: 1700,
  spawn: 86,
  stalls: [
    { x: 120, w: 124, awning: 0, sign: 'NOODLES (OTHER)', col: O },
    { x: 270, w: 112, awning: 1, sign: 'SIM CARDS', col: PAPER, readable: true },
    { x: 410, w: 130, awning: 2, sign: 'UMBRELLAS', col: O },
    { x: 620, w: 140, awning: 0, sign: 'USED IMPLANTS', col: RED, readable: true },
    { x: 790, w: 124, awning: 1, sign: 'FISH (FRESH)', col: PAPER, readable: true },
    { x: 960, w: 132, awning: 2, sign: 'REPAIRS', col: O },
    { x: 1120, w: 128, awning: 0, sign: 'FIRMWARE', col: PAPER },
    { x: 1276, w: 146, awning: 1, sign: 'DUMPLINGS', col: O },
    { x: 1452, w: 128, awning: 2, sign: 'CLOSING DOWN', col: RED },
  ] as Stall[],
  board: 575,
  /** Vertical signs on the tenements, in the middle band's coordinates. */
  blades: [{ x: 150, h: 210, text: 'HOTEL' }, { x: 520, h: 200, text: 'PAWN' }, { x: 860, h: 220, text: 'CLINIC' }, { x: 1180, h: 230, text: 'KARAOKE' }],
};

/** Counter height: about the player's waist. */
const COUNTER = 24;
const AWN = [['rgba(255,136,0,.85)', '#1a0a03'], ['rgba(255,217,165,.75)', '#160d07'], ['rgba(200,60,40,.85)', '#170704']];

const FAR = towers(51, 2000, [30, 60], [160, 320], 0.07);
const TENEMENTS = towers(53, 2700, [90, 170], [230, 420], 0.16);
/** Goods on each stall's counter: [dx, w, h, tone]. */
const GOODS = L.stalls.map((s, i) => { const r = rng(60 + i), g: number[][] = []; for (let dx = 10; dx < s.w - 14; dx += 5 + Math.round(r() * 8)) g.push([dx, 3 + Math.round(r() * 5), 3 + Math.round(r() * 7), Math.floor(r() * 3)]); return g; });
const TONES = ['rgba(255,217,165,.55)', 'rgba(255,136,0,.55)', 'rgba(170,140,110,.5)'];
/** The back crowd: [x, speed, height, phase]. */
const CROWD = (() => { const r = rng(57); return Array.from({ length: 16 }, () => [r() * 1900, (r() < 0.5 ? -1 : 1) * (0.15 + r() * 0.25), 32 + r() * 6, r() * 10]); })();
const NEAR = (() => { const r = rng(59); return Array.from({ length: 5 }, () => [r() * 2200, (r() < 0.5 ? -1 : 1) * (0.3 + r() * 0.2), 62 + r() * 8, r() * 10]); })();

function drawStall(x: CanvasRenderingContext2D, v: View, s: Stall, i: number) {
  const { sx, y, t } = v, s0 = sx(s.x), cx = s0 + s.w / 2;
  if (!onScreen(v, s0 - 20, s.w + 40)) return;
  // its own light first: a bulb under the awning lighting the stall and the street below
  const g = x.createRadialGradient(cx, y(66), 2, cx, y(30), s.w * 0.8);
  g.addColorStop(0, 'rgba(255,190,110,.22)'); g.addColorStop(1, 'rgba(255,190,110,0)');
  x.fillStyle = g; x.fillRect(s0 - s.w * 0.3, y(96), s.w * 1.6, 96);
  // back panel, a step lighter than the wall behind; poles
  box(x, s0 + 4, y(80), s.w - 8, 80 - COUNTER, '#2c170b', 'rgba(' + O + ',.35)');
  box(x, s0 + 2, y(86), 4, 86, '#2a160a', 'rgba(' + O + ',.7)'); box(x, s0 + s.w - 6, y(86), 4, 86, '#2a160a', 'rgba(' + O + ',.7)');
  // the vendor behind the counter
  figure(x, cx + (i % 2 ? 22 : -18), y(0), 46, '#050201', 0, 'rgba(255,190,110,.85)');
  // awning: stripes and a scalloped edge
  const [a, b] = AWN[s.awning], aw = s.w + 16, ax = s0 - 8;
  for (let k = 0; k < aw; k += 8) { x.fillStyle = (k / 8) % 2 ? b : a; x.fillRect(ax + k, y(94), Math.min(8, aw - k), 14); }
  for (let k = 0; k < aw; k += 8) { x.fillStyle = (k / 8) % 2 ? b : a; x.beginPath(); x.arc(ax + k + 4, y(80), 4, 0, Math.PI); x.fill(); }
  x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(ax, y(94), aw, 2);
  // bulb
  x.fillStyle = 'rgba(255,217,165,.95)'; x.fillRect(cx - 2, y(70), 4, 4);
  x.strokeStyle = 'rgba(' + PAPER + ',.4)'; x.beginPath(); x.moveTo(cx + 0.5, y(76)); x.lineTo(cx + 0.5, y(70)); x.stroke();
  // counter and what is on it
  box(x, s0, y(COUNTER), s.w, COUNTER, '#22120a', 'rgba(' + O + ',.85)');
  x.fillStyle = 'rgba(' + O + ',.9)'; x.fillRect(s0, y(COUNTER), s.w, 2);
  for (const [dx, w, h, tone] of GOODS[i]) { x.fillStyle = TONES[tone]; x.fillRect(s0 + dx, y(COUNTER + h), w, h); }
  // the sign on two hangers above the awning
  x.strokeStyle = 'rgba(' + O + ',.6)'; x.beginPath(); x.moveTo(cx - 20.5, y(94)); x.lineTo(cx - 20.5, y(102)); x.moveTo(cx + 20.5, y(94)); x.lineTo(cx + 20.5, y(102)); x.stroke();
  sign(x, t, s.sign, cx, y(108), s.col, { size: 8, phase: i * 37, dead: i === 3 ? 2 : -1 });
  if (s.readable) tell(x, t, cx, y(118), i);
  reflect(x, v, cx, '255,190,110', 0.8, 18);
}

export const market: Scene = {
  id: 'market',
  name: 'Street Market',
  width: L.width,
  spawn: L.spawn,
  ambient: { sky: true, rain: true },
  intro: ['The night market. Cash, noise and nobody looking up.'],
  exits: [{ id: 'downtown', x: 32, to: 'downtown', label: '[E] DOWNTOWN', promptH: 82 }],
  readables: [
    { id: 'sims', x: 326, name: 'SIM CARDS', promptH: 128, pages: ['Prepaid. Registered to nobody.', 'Nobody is the most popular name in the city.'] },
    { id: 'rules', x: L.board, name: 'MARKET RULES', promptH: 84, pages: ['1. No cameras. 2. See rule 1.', '3. Haggling is mandatory. 4. Prices are not.'] },
    { id: 'implants', x: 690, name: 'USED IMPLANTS', promptH: 128, pages: ['One previous owner.', 'Previous owner not included. Usually.'] },
    { id: 'fish', x: 852, name: 'FISHMONGER', label: '[E] TALK', promptH: 128, pages: ['Fresh today.', 'Which today, I did not say.'] },
  ],

  drawBackdrop(x, v) {
    const { sx, y, t } = v;
    // far band: towers seen through the gaps, barely there
    // both rows grow with the view, so a tall screen sees more storeys and the same strip of sky
    const grow = Math.max(0, v.gy - DESIGN_TOP);
    drawTowers(x, v, FAR, 0.25, y(0), 0.08, '#030100', 1, Math.round(grow * 0.8));
    // middle band: tenements leaving the top of the view, their blade signs and the light strings
    drawTowers(x, v, TENEMENTS, 0.7, y(0), 0.22, '#070302', 2, grow);
    for (const b of L.blades) {
      const bx = sx(b.x, 0.7);
      if (!onScreen(v, bx - 12, 24)) continue;
      x.strokeStyle = 'rgba(' + O + ',.35)'; x.beginPath(); x.moveTo(bx - 14, y(b.h + 6) + 0.5); x.lineTo(bx - 9, y(b.h + 6) + 0.5); x.stroke();
      box(x, bx - 9, y(b.h + 8), 18, b.text.length * 11 + 8, '#0d0604', 'rgba(' + O + ',.3)');
      x.save(); x.font = '600 9px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(255,136,0,.5)';
      for (let k = 0; k < b.text.length; k++) x.fillText(b.text[k], bx, y(b.h) + k * 11);
      x.restore();
    }
    // strings of bulbs slung across the street between the tenements
    for (let wx = 0; wx < L.width + 1400; wx += 220) {
      const a = sx(wx, 0.85), b = sx(wx + 220, 0.85);
      if (b < 0 || a > v.viewW) continue;
      x.strokeStyle = 'rgba(40,24,14,1)'; x.beginPath(); x.moveTo(a, y(150)); x.quadraticCurveTo((a + b) / 2, y(112), b, y(150)); x.stroke();
      for (let k = 1; k < 11; k++) {
        const f = k / 11, bx = a + (b - a) * f, by = (1 - f) * (1 - f) * y(150) + 2 * f * (1 - f) * y(112) + f * f * y(150);
        x.fillStyle = (k + Math.floor(t / 50)) % 7 === 0 ? 'rgba(255,217,165,.2)' : k % 2 ? 'rgba(255,190,110,.7)' : 'rgba(255,136,0,.6)';
        x.fillRect(Math.round(bx) - 1, Math.round(by) + 1, 2, 3);
      }
    }
    // the back crowd, dim, walking slowly between the stalls
    const span = 1900;
    for (const [cx, sp, h, ph] of CROWD) {
      const px = sx((((cx + t * sp) % span) + span) % span - 100, 0.9);
      if (!onScreen(v, px - 10, 20)) continue;
      figure(x, px, y(8), h, '#0d0705', Math.sin(t * 0.12 + ph) > 0 ? 1 : 0, 'rgba(255,136,0,.14)');
    }

    // play band
    wetFloor(x, v);
    exitDoor(x, v, 32, '#0a0603');
    L.stalls.forEach((s, i) => drawStall(x, v, s, i));
    const nb = sx(L.board);
    if (onScreen(v, nb - 30, 60)) { box(x, nb - 1, y(48), 3, 48, '#2a160a'); notice(x, t, nb, y(78), 56, 30, ['MARKET', 'RULES']); }
    // the end of the market: a wall with the last lamp
    const ew = sx(1610);
    if (onScreen(v, ew, 120)) {
      box(x, ew, y(130), 120, 130, '#140a06', 'rgba(' + O + ',.6)');
      for (let r = 6; r < 130; r += 8) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(ew + 1, y(130) + r, 118, 1); }
      sign(x, t, 'NO EXIT', ew + 50, y(70), RED, { size: 8, phase: 200 });
    }
  },

  drawFront(x, v) {
    // the near crowd: heads and shoulders passing along the bottom of the view
    const span = 2200;
    for (const [cx, sp, h, ph] of NEAR) {
      const px = v.sx((((cx + v.t * sp) % span) + span) % span - 200, 1.3);
      if (!onScreen(v, px - 20, 40)) continue;
      figure(x, px, v.gy + 58, h, '#010000', Math.sin(v.t * 0.1 + ph) > 0 ? 1 : 0, 'rgba(255,136,0,.45)');
    }
  },
};
