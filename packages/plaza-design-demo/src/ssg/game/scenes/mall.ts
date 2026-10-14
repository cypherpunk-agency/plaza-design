/**
 * The shopping mall: an atrium floor with a fountain, benches and pillars; across
 * the atrium levels of storefronts (three, more on tall screens) joined by escalators, banners hanging
 * from the skylight. Bands: far = the far side of the atrium and the skylight;
 * middle = escalators and banners; play = the atrium floor and its furniture.
 */

import { box, C, exitDoor, figure, GREEN, notice, O, onScreen, PAPER, rng, sign, tell, text, type Scene, type View } from './kit';

/** Layout: positions in world units, heights up from the atrium floor. */
const L = {
  width: 1700,
  spawn: 86,
  /** The far side: storey floors (heights) and the shops on them. */
  levels: [14, 100, 186],
  storey: 66,
  shops: ['MEMORY GARDEN', 'NULL & VOID', 'SECOND SKIN', 'GHOST SUPPLY', 'TERMS APPLY', 'CLOUD PHARMACY', 'LAST SEASON', 'IDENTITY OUTLET', 'ALMOST NEW', 'OPT-OUT'],
  /** Escalators between levels; the upper ones only show on screens tall enough for those levels. */
  escalators: [{ x: 280, from: 14, to: 100 }, { x: 760, from: 100, to: 186 }, { x: 1160, from: 14, to: 100 }, { x: 420, from: 186, to: 272 }, { x: 1020, from: 272, to: 358 }, { x: 600, from: 358, to: 444 }],
  banners: [{ x: 420, text: 'SALE' }, { x: 900, text: 'NEW YOU' }, { x: 1380, text: 'FOREVER' }],
  pillars: [430, 1290],
  benches: [{ x: 570, sitter: true }, { x: 1110, sitter: false }],
  planters: [690, 1010],
  fountain: { x: 850, w: 150 },
  kiosk: 300,
  escSign: 1440,
  /** Doors at play level: the Galleria metro station, the stairs to the roof's taxi pad, the service corridor to the market. */
  metro: 32,
  roof: 1220,
  service: 1630,
};

const SHOP_W = 118;
const FAR = 0.55;
/** Shoppers on the far levels: [x, speed, level, phase]. */
const SHOPPERS = (() => { const r = rng(81); return Array.from({ length: 14 }, () => [r() * 2400, (r() < 0.5 ? -1 : 1) * (0.1 + r() * 0.2), Math.floor(r() * 3), r() * 10]); })();
/** Water drops in the fountain's arcs: [side, phase]. */
const DROPS = (() => { const r = rng(83); return Array.from({ length: 40 }, (_, i) => [i % 2 ? 1 : -1, r()]); })();

/** The level floors for this view: at least the three of the layout; taller screens see more storeys, the skylight always just over the top one. */
function levelsFor(v: View): number[] {
  const step = L.levels[1] - L.levels[0], n = Math.max(L.levels.length, Math.floor((v.gy - L.levels[0] - 40) / step));
  return Array.from({ length: n }, (_, i) => L.levels[0] + i * step);
}

function drawFarSide(x: CanvasRenderingContext2D, v: View) {
  const { y } = v, levels = levelsFor(v), roofH = levels[levels.length - 1] + L.storey + 18;
  // the skylight, high above: glass in a steel truss, the city's glow on the clouds through it
  const sky = y(roofH);
  if (sky > 0) {
    x.fillStyle = '#03050a'; x.fillRect(0, 0, v.viewW, sky);
    const glow = x.createLinearGradient(0, 0, 0, sky);
    glow.addColorStop(0, 'rgba(194,65,12,.03)'); glow.addColorStop(1, 'rgba(194,65,12,.09)');
    x.fillStyle = glow; x.fillRect(0, 0, v.viewW, sky);
    x.strokeStyle = 'rgba(' + O + ',.15)';
    for (let wx = 0; wx < 2600; wx += 40) { const s = v.sx(wx, 0.4); if (s < -2 || s > v.viewW + 2) continue; x.beginPath(); x.moveTo(s + 0.5, 0); x.lineTo(s + 0.5, sky); x.stroke(); }
    // the truss along the skylight's foot, a lattice like the cranes'
    x.fillStyle = '#0d0907'; x.fillRect(0, sky - 14, v.viewW, 14);
    x.strokeStyle = 'rgba(' + O + ',.22)'; x.strokeRect(-1, sky - 13.5, v.viewW + 2, 13);
    x.beginPath(); for (let wx = 0; wx < 2600; wx += 20) { const s = v.sx(wx, 0.4); if (s < -20 || s > v.viewW) continue; x.moveTo(s, sky - 1); x.lineTo(s + 10, sky - 13); x.lineTo(s + 20, sky - 1); } x.stroke();
  }
  // levels of storefronts, lit behind glass
  x.fillStyle = '#0a0706'; x.fillRect(0, Math.max(0, sky), v.viewW, y(14) - Math.max(0, sky));
  levels.forEach((lv, li) => {
    for (let i = 0; i < 22; i++) {
      const s = v.sx(i * (SHOP_W + 6) - 40, FAR);
      if (!onScreen(v, s, SHOP_W)) continue;
      const lit = (i * 7 + li * 3) % 5 !== 0, top = y(lv + L.storey - 8);
      box(x, s, top, SHOP_W, L.storey - 8, lit ? '#140d08' : '#070504', 'rgba(' + O + ',.22)');
      if (lit) { x.fillStyle = 'rgba(255,190,110,.08)'; x.fillRect(s + 2, top + 12, SHOP_W - 4, L.storey - 22); }
      x.fillStyle = 'rgba(' + O + ',.18)'; for (let m = 30; m < SHOP_W; m += 30) x.fillRect(s + m, top + 12, 1, L.storey - 20);
      box(x, s + 10, top + 2, SHOP_W - 20, 9, '#0c0806');
      text(x, L.shops[(i + li * 4) % L.shops.length], s + SHOP_W / 2, top + 6.5, 'rgba(' + PAPER + ',' + (lit ? 0.45 : 0.18) + ')', 7);
    }
    // the floor slab and its glass railing
    if (li > 0) {
      x.fillStyle = '#120b07'; x.fillRect(0, y(lv), v.viewW, 8);
      x.fillStyle = 'rgba(' + O + ',.3)'; x.fillRect(0, y(lv), v.viewW, 1);
      x.fillStyle = 'rgba(170,210,255,.04)'; x.fillRect(0, y(lv + 12), v.viewW, 12);
      x.fillStyle = 'rgba(' + O + ',.25)'; x.fillRect(0, y(lv + 12), v.viewW, 1);
    }
  });
  // shoppers on the far levels; on tall screens every other one is three levels up
  SHOPPERS.forEach(([sx0, sp, lv0, ph], i) => {
    const px = v.sx((((sx0 + v.t * sp) % 2400) + 2400) % 2400 - 100, FAR), lv = (lv0 + (i % 2 ? 3 : 0)) % levels.length;
    if (!onScreen(v, px - 6, 12)) return;
    figure(x, px, y(levels[lv] + (lv ? 8 : 0)), 26, '#060403', Math.sin(v.t * 0.1 + ph) > 0 ? 1 : 0, 'rgba(255,190,110,.18)');
  });
}

function drawEscalator(x: CanvasRenderingContext2D, v: View, e: { x: number; from: number; to: number }) {
  const { y } = v, a = v.sx(e.x, 0.7), b = v.sx(e.x + 120, 0.7);
  if (b < -10 || a > v.viewW + 10) return;
  const y0 = y(e.from), y1 = y(e.to + 8);
  x.fillStyle = 'rgba(170,210,255,.05)';
  x.beginPath(); x.moveTo(a, y0); x.lineTo(b, y1); x.lineTo(b, y1 - 16); x.lineTo(a, y0 - 16); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(' + O + ',.45)'; x.beginPath(); x.moveTo(a, y0 - 16); x.lineTo(b, y1 - 16); x.moveTo(a, y0); x.lineTo(b, y1); x.stroke();
  // steps creeping up
  x.fillStyle = 'rgba(' + O + ',.3)';
  for (let k = 0; k < 12; k++) {
    const f = ((k + v.t * 0.01) % 12) / 12;
    x.fillRect(Math.round(a + (b - a) * f), Math.round(y0 + (y1 - y0) * f) - 3, 4, 1);
  }
}

export const mall: Scene = {
  id: 'mall',
  name: 'Mall',
  width: L.width,
  spawn: L.spawn,
  intro: ['The mall. Warm, dry and recording everything I look at.'],
  exits: [
    { id: 'metro', x: L.metro, to: 'train', label: '[E] METRO · GALLERIA', promptH: 82 },
    { id: 'taxi', x: L.roof, to: '', action: 'taxi', label: '[E] ROOF PAD · HAIL TAXI', promptH: 82 },
    { id: 'market', x: L.service, to: 'market', at: 'mall', label: '[E] SERVICE CORRIDOR', promptH: 82 },
  ],
  readables: [
    { id: 'kiosk', x: L.kiosk, name: 'DIRECTORY', promptH: 70, pages: ['YOU ARE HERE.', '"Here" is defined loosely. Exits are not listed, for your comfort.'] },
    { id: 'fountain', x: L.fountain.x, name: 'WISHING FOUNTAIN', promptH: 66, pages: ['Wishes are processed in the order received.', 'Current queue: 1,204,577. Estimated wait: yes.'] },
    { id: 'escalator', x: L.escSign, name: 'ESCALATOR B', promptH: 76, pages: ['UP ONLY.', 'There is no down. Management regrets nothing.'] },
  ],

  drawBackdrop(x, v) {
    const { sx, y, t, gy } = v;
    drawFarSide(x, v);
    // middle band: escalators and banners on cables from the skylight
    const lvs = levelsFor(v), top = lvs[lvs.length - 1];
    for (const e of L.escalators) if (e.to <= top) drawEscalator(x, v, e);
    for (const b of L.banners) {
      const bx = sx(b.x, 0.8);
      if (!onScreen(v, bx - 16, 32)) continue;
      x.strokeStyle = 'rgba(' + O + ',.3)'; x.beginPath(); x.moveTo(bx - 10.5, 0); x.lineTo(bx - 10.5, y(234)); x.moveTo(bx + 10.5, 0); x.lineTo(bx + 10.5, y(234)); x.stroke();
      box(x, bx - 14, y(234), 28, b.text.length * 11 + 12, '#1a0b05', 'rgba(' + O + ',.4)');
      x.save(); x.font = '600 9px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(255,136,0,.6)';
      for (let k = 0; k < b.text.length; k++) x.fillText(b.text[k], bx, y(234) + 10 + k * 11);
      x.restore();
    }

    // play band: the atrium floor's back edge
    x.fillStyle = '#0d0907'; x.fillRect(0, y(14), v.viewW, 14);
    x.fillStyle = 'rgba(' + O + ',.4)'; x.fillRect(0, y(14), v.viewW, 1);
    exitDoor(x, v, L.metro, '#0a0603', '< METRO');
    exitDoor(x, v, L.roof, '#0a0603', 'SKY TAXI ^');
    exitDoor(x, v, L.service, '#0a0603', 'SERVICE >');

    // pillars running up out of the view
    for (const px of L.pillars) {
      const s = sx(px);
      if (!onScreen(v, s - 16, 32)) continue;
      box(x, s - 14, 0, 28, gy, '#160d08', 'rgba(' + O + ',.8)');
      box(x, s - 18, y(14), 36, 14, '#1e110a', 'rgba(' + O + ',.8)');
    }

    // the directory kiosk: a screen you can read, so cyan
    const kx = sx(L.kiosk);
    if (onScreen(v, kx - 20, 40)) {
      box(x, kx - 3, y(30), 6, 30, '#1e110a', 'rgba(' + O + ',.7)');
      box(x, kx - 14, y(60), 28, 32, '#0d1416', 'rgba(' + C + ',.7)');
      x.fillStyle = 'rgba(' + C + ',.3)'; for (let r = 0; r < 4; r++) x.fillRect(kx - 10, y(54) + r * 6, 14 + ((r * 5) % 7), 2);
      x.fillStyle = Math.floor(t / 30) % 2 ? 'rgba(255,42,68,.9)' : 'rgba(255,42,68,.3)'; x.fillRect(kx + 6, y(40), 3, 3);
      tell(x, t, kx + 10, y(32));
    }

    // benches and planters
    L.benches.forEach((b) => {
      const s = sx(b.x);
      if (!onScreen(v, s - 30, 60)) return;
      if (b.sitter) {
        figure(x, s, y(14), 30, '#0a0605', 0, 'rgba(255,190,110,.35)');
        x.fillStyle = 'rgba(170,210,255,.6)'; x.fillRect(s - 3, y(34), 6, 3);
      }
      box(x, s - 26, y(16), 52, 4, '#2a160a', 'rgba(' + O + ',.8)');
      box(x, s - 22, y(12), 3, 12, '#2a160a'); box(x, s + 19, y(12), 3, 12, '#2a160a');
    });
    for (const p of L.planters) {
      const s = sx(p);
      if (!onScreen(v, s - 24, 48)) continue;
      x.fillStyle = '#0b1209';
      for (let k = -3; k <= 3; k++) { x.beginPath(); x.ellipse(s + k * 5, y(40 - Math.abs(k) * 3), 4, 14, k * 0.25, 0, 7); x.fill(); }
      box(x, s - 18, y(22), 36, 22, '#1e110a', 'rgba(' + O + ',.8)');
    }

    // the fountain: basin, column, arcs of water lit from below
    const F = L.fountain, fx = sx(F.x);
    if (onScreen(v, fx - 90, 180)) {
      const g = x.createRadialGradient(fx, y(20), 4, fx, y(30), 110);
      g.addColorStop(0, 'rgba(170,210,255,.12)'); g.addColorStop(1, 'rgba(170,210,255,0)');
      x.fillStyle = g; x.fillRect(fx - 110, y(120), 220, 120);
      box(x, fx - 4, y(44), 8, 30, '#1e110a', 'rgba(' + O + ',.7)');
      box(x, fx - 16, y(46), 32, 4, '#1e110a', 'rgba(' + O + ',.7)');
      for (const [side, ph] of DROPS) {
        const f = (ph + t * 0.012) % 1, dx = side * f * 56, dh = 46 + 34 * f - 70 * f * f;
        x.fillStyle = 'rgba(200,225,255,' + (0.7 - f * 0.4) + ')'; x.fillRect(Math.round(fx + dx), y(dh), 2, 2);
      }
      box(x, fx - F.w / 2, y(18), F.w, 18, '#1e110a', 'rgba(' + O + ',.85)');
      x.fillStyle = 'rgba(170,210,255,' + (0.35 + 0.1 * Math.sin(t * 0.08)) + ')'; x.fillRect(fx - F.w / 2 + 4, y(18), F.w - 8, 2);
      box(x, fx - 22, y(13), 44, 10, '#1a120b', 'rgba(' + O + ',.6)');
      text(x, 'WISHES', fx, y(8), 'rgba(' + PAPER + ',.85)', 7, '600');
      tell(x, t, fx + 18, y(4));
    }

    // the escalator sign on its stand
    const es = sx(L.escSign);
    if (onScreen(v, es - 30, 60)) { box(x, es - 1, y(44), 3, 44, '#2a160a'); notice(x, t, es, y(72), 56, 30, ['UP', 'ONLY'], 2); }
    // a green EXIT over the way out, on a rod from the ceiling
    box(x, sx(32) - 1, 0, 3, y(102), '#2a160a');
    sign(x, t, 'EXIT', sx(32), y(96), GREEN, { size: 8, phase: 60 });

    // polished floor with the fountain's light in it
    x.fillStyle = '#070504'; x.fillRect(0, gy, v.viewW, v.viewH - gy);
    x.fillStyle = 'rgba(' + O + ',.55)'; x.fillRect(0, gy, v.viewW, 1);
    for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(170,210,255,' + 0.05 * (1 - i / 6) + ')'; x.fillRect(fx - 60, gy + 3 + i * 5, 120, 2); }
    for (const px of L.pillars) { const s = sx(px); x.fillStyle = 'rgba(' + O + ',.06)'; x.fillRect(s - 14, gy + 2, 28, 30); }
  },

  drawFront(x, v) {
    // a near pillar sliding past
    const s = v.sx(1060, 1.35);
    if (!onScreen(v, s - 24, 48)) return;
    box(x, s - 22, 0, 44, v.viewH, '#020100', 'rgba(' + O + ',.25)');
  },
};
