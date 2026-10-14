/**
 * The back yard on the canvas: the fixer's yard behind the noodle stall,
 * boxed in by the backs of houses. World units match the street: x along the
 * yard, h above the ground. Where the devices stand (for tapping, E and hack
 * vision) is in yard.json (`layout.spot`); this draws them there.
 */

import type { ZoneModel } from '../zone/model';
import type { ParcelAt } from './effects';

export const YARD_W = 760;
export const YARD_SPAWN = 48;
export const YARD_EXIT_X = 18;
export const TRAY_X = 668;

const SLOT: Record<string, number> = { home: 350, 'A-3': 290, 'B-5': 350, 'C-7': 410, chute: 452 };
const CHUTE = { x0: 452, h0: 40, x1: 604, h1: 14 };

interface View { sx: (wx: number) => number; y: (h: number) => number; t: number; viewW: number }
let hookX = SLOT.home;

/** The yard's back corners, where the backs of the houses meet the buildings on either side. */
const LX = 8, RX = YARD_W - 8;
/** The back door to the alley, under the DOWNTOWN sign. */
const EXIT_DOOR = 34;
/** A storey is about 1.6× the player. */
const STOREY = 70;

/**
 * The backs of the houses that box the yard in, left to right: their span, how
 * far below the top of the view their roofs sit (only a strip of sky shows),
 * brick or concrete, and the window columns from the first floor that has any.
 */
const BACKS = [
  { x0: LX, x1: 150, roof: 20, brick: true, cols: [30, 76, 122], from: 146 },
  { x0: 150, x1: 250, roof: 30, brick: false, cols: [178, 222], from: 90 },
  { x0: 250, x1: 452, roof: 14, brick: true, cols: [276, 314, 352, 390, 428], from: 140 },
  { x0: 452, x1: 596, roof: 26, brick: false, cols: [476, 514, 552], from: 90 },
  { x0: 596, x1: RX, roof: 22, brick: true, cols: [670, 706, 738], from: 90 },
];

/** Stable noise, so the walls look the same on every frame. */
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/**
 * Behind the yard: the backs of houses on all sides, a strip of sky at the top.
 * This is the middle band, so it stays dim and still; the crane, crates, hatch
 * and camera in front keep the bright rims. Draw after the ground, before drawYard.
 */
export function drawYardBackdrop(x: CanvasRenderingContext2D, v: View & { viewH: number }) {
  const { sx, y, viewW, viewH } = v, gy = y(0);
  const wash = (cx: number, cy: number, r: number, a: number) => {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(255,170,90,' + a + ')'); g.addColorStop(1, 'rgba(255,170,90,0)');
    x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  };

  // the strip of sky over the roofs: city glow from somewhere else, a few stars
  const sky = x.createLinearGradient(0, 0, 0, 34);
  sky.addColorStop(0, 'rgba(255,100,0,0)'); sky.addColorStop(1, 'rgba(255,100,0,.08)');
  x.fillStyle = sky; x.fillRect(0, 0, viewW, 34);
  for (let i = 0; i < 18; i++) {
    const px = ((hash(i * 3 + 1) * viewW + sx(0) * 0.05) % viewW + viewW) % viewW;
    x.fillStyle = 'rgba(255,217,165,' + (0.15 + hash(i * 3 + 3) * 0.3) + ')';
    x.fillRect(Math.round(px), 1 + Math.floor(hash(i * 3 + 2) * 12), 1, 1);
  }

  // the back walls
  BACKS.forEach((b, i) => {
    const l = sx(b.x0), r = sx(b.x1), top = b.roof;
    if (r < 0 || l > viewW) return;
    x.fillStyle = b.brick ? '#0b0503' : '#090604'; x.fillRect(l, top, r - l, gy - top);
    if (b.brick) {
      x.fillStyle = 'rgba(194,65,12,.07)';
      for (let yy = top + 4; yy < gy; yy += 4) x.fillRect(l, yy, r - l, 1);
      // joints only in a few patches, so the wall stays calm
      x.fillStyle = 'rgba(194,65,12,.13)';
      for (let k = 0; k < 3; k++) {
        const px = sx(b.x0 + 6 + Math.floor(hash(i * 7 + k) * (b.x1 - b.x0 - 40)));
        const py = top + 4 + Math.floor((hash(i * 13 + k) * (gy - top - 30)) / 4) * 4;
        for (let row = 0; row < 4; row++) for (let jx = (row % 2) * 4; jx < 28; jx += 8) x.fillRect(px + jx, py + row * 4 + 1, 1, 3);
      }
    } else {
      // cast concrete: panel seams
      x.fillStyle = 'rgba(255,217,165,.04)';
      for (let h = 35; y(h) > top; h += 35) x.fillRect(l, y(h), r - l, 1);
      for (let wx = b.x0 + 48; wx < b.x1 - 4; wx += 48) x.fillRect(sx(wx), top, 1, gy - top);
    }
    x.strokeStyle = 'rgba(194,65,12,.3)'; x.strokeRect(l + 0.5, top + 0.5, r - l - 1, gy - top);
    x.fillStyle = 'rgba(194,65,12,.5)'; x.fillRect(l, top, r - l, 2);

    // small windows, one row per storey; a few are lit from inside
    for (let h = b.from, row = 0; y(h + 14) >= top + 6; h += STOREY, row++) {
      b.cols.forEach((c, ci) => {
        const wx = sx(c) - 5, wy = y(h + 14), lit = hash(i * 31 + row * 7 + ci) < 0.3;
        x.fillStyle = lit ? 'rgba(255,136,0,.22)' : '#030100'; x.fillRect(wx, wy, 10, 14);
        if (lit) { x.fillStyle = 'rgba(255,217,165,.12)'; x.fillRect(wx + 1, wy + 1, 3, 12); }
        x.strokeStyle = 'rgba(194,65,12,.35)'; x.strokeRect(wx + 0.5, wy + 0.5, 9, 13);
        x.fillStyle = 'rgba(194,65,12,.5)'; x.fillRect(wx - 1, wy + 14, 12, 1);
        if (!b.brick) { x.fillStyle = 'rgba(194,65,12,.06)'; x.fillRect(wx + 4, wy + 15, 2, 16); }
      });
    }
  });

  // rooftop clutter against the sky: a vent, a water tank, a chimney, an aerial
  x.fillStyle = '#050301'; x.strokeStyle = 'rgba(194,65,12,.35)';
  const roofBox = (wx: number, top: number, w: number, h: number) => { const l = sx(wx); x.fillRect(l, top - h, w, h); x.strokeRect(l + 0.5, top - h + 0.5, w - 1, h - 1); };
  roofBox(38, 20, 4, 7);
  roofBox(380, 10, 22, 9); x.fillStyle = 'rgba(194,65,12,.35)'; x.fillRect(sx(383), 10, 1, 4); x.fillRect(sx(398), 10, 1, 4);
  x.fillStyle = '#050301'; roofBox(500, 26, 8, 9);
  const ax = sx(690);
  x.fillStyle = 'rgba(194,65,12,.4)'; x.fillRect(ax, 6, 1, 16); x.fillRect(ax - 5, 9, 11, 1); x.fillRect(ax - 3, 13, 7, 1);

  // drainpipes between the houses
  [147, 594].forEach((wx) => {
    const px = sx(wx);
    x.fillStyle = 'rgba(201,138,63,.28)'; x.fillRect(px, 20, 2, gy - 20);
    x.fillStyle = 'rgba(201,138,63,.4)'; for (let yy = gy - 30; yy > 24; yy -= 40) x.fillRect(px - 1, yy, 4, 1);
  });

  // the back door to the alley: open, with street light falling in from Downtown
  const d = sx(EXIT_DOOR);
  x.fillStyle = '#000'; x.fillRect(d - 14, y(52), 28, 52);
  const spill = x.createLinearGradient(0, y(52), 0, gy);
  spill.addColorStop(0, 'rgba(255,136,0,0)'); spill.addColorStop(1, 'rgba(255,136,0,.18)');
  x.fillStyle = spill; x.fillRect(d - 13, y(51), 26, 51);
  x.fillStyle = 'rgba(194,65,12,.3)'; x.fillRect(d - 13, y(30), 26, 1);
  x.strokeStyle = 'rgba(255,136,0,.6)'; x.strokeRect(d - 13.5, y(52) + 0.5, 27, 52);
  x.fillStyle = '#1a0c04'; x.fillRect(d + 14, y(52), 5, 52); x.strokeStyle = 'rgba(194,65,12,.6)'; x.strokeRect(d + 14.5, y(52) + 0.5, 4, 51);
  for (let i = 0; i < 4; i++) { x.fillStyle = 'rgba(255,136,0,' + (0.12 - i * 0.025) + ')'; x.fillRect(d - 12 + i * 3, gy + 1 + i * 3, 24 - i * 6, 2); }

  // the lamp over the yard sign lights the brick around it
  wash(sx(78), y(126), 70, 0.07);

  // fire escape on the concrete house: landings one storey apart, stairs between, a drop ladder
  const fe0 = 156, fe1 = 244, feTop = BACKS[1].roof + 6;
  x.lineWidth = 1;
  for (let h = 86, i = 0; y(h + 10) >= feTop; h += STOREY, i++) {
    const l = sx(fe0), w = fe1 - fe0;
    x.fillStyle = 'rgba(194,65,12,.7)'; x.fillRect(l, y(h), w, 2);
    x.fillStyle = 'rgba(194,65,12,.4)'; x.fillRect(l, y(h + 10), w, 1);
    for (let xx = 0; xx <= w; xx += 6) x.fillRect(l + xx, y(h + 10), 1, 10);
    if (y(h + STOREY + 10) >= feTop) {
      const a = i % 2 ? fe0 + 10 : fe1 - 10, b = i % 2 ? fe0 + 48 : fe1 - 48;
      x.strokeStyle = 'rgba(194,65,12,.5)'; x.beginPath(); x.moveTo(sx(a) + 0.5, y(h)); x.lineTo(sx(b) + 0.5, y(h + STOREY)); x.stroke();
    }
  }
  x.fillStyle = 'rgba(194,65,12,.45)';
  x.fillRect(sx(237), y(86), 1, 34); x.fillRect(sx(242), y(86), 1, 34);
  for (let h = 54; h < 86; h += 5) x.fillRect(sx(237), y(h), 6, 1);

  // the roller shutter of the fixer's store room, behind the crates
  const s0 = sx(300);
  x.fillStyle = '#070402'; x.fillRect(s0, y(60), 100, 60);
  x.fillStyle = 'rgba(194,65,12,.16)'; for (let yy = y(60) + 2; yy < gy; yy += 3) x.fillRect(s0 + 1, yy, 98, 1);
  x.fillStyle = '#140a04'; x.fillRect(s0 - 3, y(66), 106, 6); x.strokeStyle = 'rgba(194,65,12,.45)'; x.strokeRect(s0 - 2.5, y(66) + 0.5, 105, 5);
  x.fillStyle = 'rgba(194,65,12,.4)'; x.fillRect(s0 - 2, y(60), 2, 60); x.fillRect(s0 + 100, y(60), 2, 60);

  // AC units hung under windows
  [[476, 70], [552, 70], [706, 70]].forEach(([wx, h]) => {
    const c = sx(wx);
    x.fillStyle = '#140a04'; x.fillRect(c - 7, y(h + 10), 14, 10); x.strokeStyle = 'rgba(194,65,12,.5)'; x.strokeRect(c - 6.5, y(h + 10) + 0.5, 13, 9);
    x.fillStyle = 'rgba(194,65,12,.3)'; for (let k = -4; k <= 4; k += 3) x.fillRect(c + k, y(h + 8), 1, 6);
    x.fillStyle = 'rgba(194,65,12,.08)'; x.fillRect(c - 1, y(h), 2, 18);
  });

  // where the workbench was: someone's smoking corner. Lived in, nothing to use.
  // A barred kitchen window, lit from inside, throws light on it.
  const kw = sx(214);
  x.fillStyle = 'rgba(255,136,0,.24)'; x.fillRect(kw, y(40), 18, 18);
  x.strokeStyle = 'rgba(194,65,12,.5)'; x.strokeRect(kw + 0.5, y(40) + 0.5, 17, 17);
  x.fillStyle = 'rgba(40,20,5,.9)'; for (let k = 3; k < 18; k += 4) x.fillRect(kw + k, y(40) + 1, 1, 16);
  wash(kw + 9, y(30), 36, 0.06);
  x.fillStyle = 'rgba(255,136,0,.06)'; x.fillRect(kw - 30, gy + 1, 70, 3);
  // broom against the wall
  x.strokeStyle = 'rgba(201,138,63,.45)'; x.beginPath(); x.moveTo(sx(158) + 0.5, y(46)); x.lineTo(sx(162) + 0.5, y(8)); x.stroke();
  x.fillStyle = 'rgba(201,138,63,.35)'; x.fillRect(sx(158), y(8), 9, 8);
  // plastic chair
  const ch = sx(180);
  x.fillStyle = '#2a1608'; x.fillRect(ch - 6, y(14), 13, 2); x.fillRect(ch + 5, y(30), 2, 16); x.fillRect(ch - 1, y(30), 8, 2);
  x.fillRect(ch - 6, y(12), 1, 12); x.fillRect(ch + 6, y(12), 1, 12);
  // cable spool for a table, an ashtray and a mug on it
  const sp = sx(200);
  x.fillStyle = '#22120a'; x.fillRect(sp - 4, y(12), 8, 12); x.fillRect(sp - 8, y(14), 16, 2); x.fillRect(sp - 8, y(2), 16, 2);
  x.fillStyle = 'rgba(255,217,165,.4)'; x.fillRect(sp + 2, y(18), 3, 4); x.fillStyle = 'rgba(194,65,12,.6)'; x.fillRect(sp - 6, y(15), 5, 1);

  // the dumpster under a caged wall lamp
  wash(sx(731), y(66), 50, 0.08);
  x.fillStyle = 'rgba(255,217,165,.7)'; x.fillRect(sx(729), y(68), 4, 3);
  x.fillStyle = 'rgba(194,65,12,.6)'; x.fillRect(sx(728), y(70), 6, 1); x.fillRect(sx(728), y(65), 6, 1);
  const du = sx(712);
  x.fillStyle = '#141008'; x.fillRect(du, y(24), 38, 24); x.strokeStyle = 'rgba(194,65,12,.55)'; x.strokeRect(du + 0.5, y(24) + 0.5, 37, 23);
  x.fillStyle = '#1e1609'; x.fillRect(du - 1, y(27), 40, 3);
  x.fillStyle = '#080503'; x.fillRect(du + 4, y(31), 10, 4); x.fillRect(du + 20, y(30), 8, 3);
  x.fillStyle = 'rgba(255,136,0,.06)'; x.fillRect(du - 10, gy + 1, 58, 3);

  // a washing line across the far end, sheets and shirts left out in the rain
  const lh = Math.min(150, gy - 60), l0 = 466, l1 = 742;
  const lineY = (u: number) => y(lh) + Math.round(10 * 4 * u * (1 - u));
  x.strokeStyle = 'rgba(255,217,165,.2)'; x.beginPath();
  for (let wx = l0; wx <= l1; wx += 4) { const u = (wx - l0) / (l1 - l0); wx === l0 ? x.moveTo(sx(wx), lineY(u) + 0.5) : x.lineTo(sx(wx), lineY(u) + 0.5); }
  x.stroke();
  x.fillStyle = 'rgba(194,65,12,.6)'; x.fillRect(sx(l0) - 1, y(lh) - 1, 3, 3); x.fillRect(sx(l1) - 1, y(lh) - 1, 3, 3);
  ([[0.14, 10, 12, 'rgba(255,217,165,.22)'], [0.27, 8, 9, 'rgba(194,65,12,.4)'], [0.4, 14, 16, 'rgba(255,217,165,.16)'],
    [0.6, 8, 9, 'rgba(201,138,63,.3)'], [0.72, 4, 6, 'rgba(255,217,165,.25)'], [0.8, 4, 6, 'rgba(255,217,165,.25)']] as const)
    .forEach(([u, w, h, col]) => { const cx = sx(l0 + u * (l1 - l0)); x.fillStyle = col; x.fillRect(cx - w / 2, lineY(u) + 1, w, h); });

  // the side walls: the buildings left and right of the yard, seen edge-on, running toward you
  const vx = viewW / 2, vy = y(90);
  const side = (cx0: number, edge: number) => {
    const out = (py: number, s: number) => [cx0 + (cx0 - vx) * s, py + (py - vy) * s];
    const [jx] = out(gy, (viewH - gy) / (gy - vy));
    x.fillStyle = '#050201'; x.beginPath();
    x.moveTo(cx0, -1); x.lineTo(cx0, gy); x.lineTo(jx, viewH + 1);
    const far = edge < cx0 ? Math.min(jx, edge) : Math.max(jx, edge);
    x.lineTo(far, viewH + 1); x.lineTo(far, -1); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(194,65,12,.1)'; x.beginPath();
    for (let h = 9; y(h) > -40; h += 9) { const [ex, ey] = out(y(h), 3); x.moveTo(cx0, y(h) + 0.5); x.lineTo(ex, ey + 0.5); }
    x.stroke();
    const [px, pb] = out(gy, 0.35);
    x.fillStyle = 'rgba(201,138,63,.18)'; x.fillRect(Math.round(px), 0, 2, pb);
    x.strokeStyle = 'rgba(194,65,12,.4)'; x.beginPath(); x.moveTo(cx0, gy + 0.5); x.lineTo(jx, viewH + 0.5); x.stroke();
    x.fillStyle = 'rgba(194,65,12,.45)'; x.fillRect(cx0, 0, 1, gy);
  };
  if (sx(LX) > 0) side(sx(LX), -1);
  if (sx(RX) < viewW) side(sx(RX), viewW + 1);
}

export function drawYard(x: CanvasRenderingContext2D, m: ZoneModel, v: View, highlight: string | null) {
  const { sx, y, t } = v;
  const armAt = m.get('armAt') as string, pan = m.get('pan') as number;
  const mono = (size: number, weight = '') => (weight ? weight + ' ' : '') + size + 'px "IBM Plex Mono", monospace';
  const text = (s: string, cx: number, cy: number, col: string, size = 7, weight = '') => {
    x.save(); x.font = mono(size, weight); x.textAlign = 'center'; x.fillStyle = col; x.fillText(s, cx, cy); x.restore();
  };
  const glow = (id: string, x0: number, top: number, w: number, h: number) => {
    if (highlight !== id) return;
    x.save(); x.strokeStyle = 'rgba(255,61,242,.85)'; x.shadowColor = 'rgba(255,61,242,.8)'; x.shadowBlur = 8;
    x.strokeRect(x0 - 3.5, top - 3.5, w + 7, h + 7); x.restore();
  };

  // the yard sign, a plate bolted to the wall over the camera, lit by its own lamp
  const sg = sx(78);
  x.fillStyle = '#1a0c04'; x.fillRect(sg - 67, y(126), 134, 15);
  x.strokeStyle = 'rgba(255,136,0,.7)'; x.strokeRect(sg - 66.5, y(126) + 0.5, 133, 14);
  x.fillStyle = 'rgba(255,217,165,.5)'; [-63, 62].forEach((d) => { x.fillRect(sg + d, y(124), 1, 1); x.fillRect(sg + d, y(114), 1, 1); });
  x.fillStyle = '#4a2408'; x.fillRect(sg - 1, y(134), 2, 8); x.fillRect(sg - 6, y(134), 12, 2);
  x.fillStyle = 'rgba(255,217,165,.85)'; x.fillRect(sg - 4, y(132), 8, 1);
  text("FIXER'S YARD · NO LOGS KEPT", sg, y(115), 'rgba(255,136,0,.9)', 8, '600');
  // the exit sign over the back door to the alley
  const ex = sx(EXIT_DOOR);
  x.fillStyle = '#4a2408'; x.fillRect(ex - 18, y(56), 1, 3); x.fillRect(ex + 17, y(56), 1, 3);
  x.fillStyle = '#04100f'; x.fillRect(ex - 26, y(68), 52, 12); x.strokeStyle = 'rgba(0,255,255,.55)'; x.strokeRect(ex - 25.5, y(68) + 0.5, 51, 11);
  text('< DOWNTOWN', ex, y(59), 'rgba(0,255,255,.9)', 8, '600');

  // CAM-1 on its pole: a lit pole with a rim so it reads against the brick
  const cx = sx(90);
  x.fillStyle = '#000'; x.fillRect(cx - 2, y(72), 5, 72);
  x.fillStyle = '#4a2408'; x.fillRect(cx - 1, y(72), 3, 72); x.fillStyle = 'rgba(255,136,0,.55)'; x.fillRect(cx - 1, y(72), 1, 72);
  x.fillStyle = '#2a1405'; x.fillRect(cx - 5, y(2), 11, 2);
  x.fillStyle = '#1a0c04'; x.fillRect(cx - 12, y(84), 24, 12); x.strokeStyle = 'rgba(255,217,165,.6)'; x.strokeRect(cx - 11.5, y(84) + 0.5, 23, 11);
  x.fillStyle = Math.floor(t / 30) % 2 ? 'rgba(255,42,68,.95)' : 'rgba(255,42,68,.3)'; x.fillRect(cx - 9 + pan * 3, y(80), 3, 3);
  glow('cam', cx - 12, y(86), 24, 86);

  // crates under the crane
  (['A-3', 'B-5', 'C-7'] as const).forEach((id) => {
    const c = sx(SLOT[id]);
    x.fillStyle = '#5a3410'; x.fillRect(c - 13, y(22), 26, 22); x.strokeStyle = 'rgba(201,138,63,.9)'; x.strokeRect(c - 12.5, y(22) + 0.5, 25, 21);
    x.beginPath(); x.moveTo(c - 12, y(22)); x.lineTo(c + 12, y(0)); x.moveTo(c + 12, y(22)); x.lineTo(c - 12, y(0)); x.strokeStyle = 'rgba(40,20,5,.8)'; x.stroke();
    x.fillStyle = '#ffd9a5'; x.fillRect(c - 9, y(19), 18, 7); text(id, c, y(13.5), '#1d0e05', 6, '600');
  });

  // the crane: gantry, trolley, hook
  const g0 = sx(262), g1 = sx(438);
  x.fillStyle = '#000'; x.fillRect(g0 - 1, y(129), 6, 129); x.fillRect(g1 - 5, y(129), 6, 129); x.fillRect(g0 - 1, y(129), g1 - g0 + 2, 7);
  x.fillStyle = '#4a2408'; x.fillRect(g0, y(128), 4, 128); x.fillRect(g1 - 4, y(128), 4, 128); x.fillRect(g0, y(128), g1 - g0, 5);
  x.fillStyle = 'rgba(255,136,0,.6)'; x.fillRect(g0, y(128), g1 - g0, 1); x.fillRect(g0, y(127), 1, 127); x.fillRect(g1 - 4, y(127), 1, 127);
  hookX += (SLOT[armAt] - hookX) * 0.08;
  const hx = sx(hookX);
  x.fillStyle = '#ff8800'; x.fillRect(hx - 6, y(124), 12, 4);
  x.strokeStyle = 'rgba(201,168,127,.9)'; x.beginPath(); x.moveTo(hx + 0.5, y(120)); x.lineTo(hx + 0.5, y(66)); x.stroke();
  x.beginPath(); x.moveTo(hx - 5, y(66)); x.lineTo(hx - 5, y(62)); x.lineTo(hx + 5, y(62)); x.lineTo(hx + 5, y(66)); x.stroke();
  glow('crane', g0, y(128), g1 - g0, 128);

  // a stretch of chain-link closes off the pickup corner; the hatch is the way through
  const f0 = sx(586), f1 = sx(644);
  x.save(); x.beginPath(); x.rect(f0, y(74), f1 - f0, 74); x.clip();
  x.strokeStyle = 'rgba(194,65,12,.3)'; x.beginPath();
  for (let d = -74; d < f1 - f0; d += 6) { x.moveTo(f0 + d, y(0)); x.lineTo(f0 + d + 74, y(74)); x.moveTo(f0 + d + 74, y(0)); x.lineTo(f0 + d, y(74)); }
  x.stroke(); x.restore();
  x.fillStyle = '#4a2408'; x.fillRect(f0 - 1, y(76), 3, 76); x.fillRect(f1 - 2, y(76), 3, 76); x.fillRect(f0, y(75), f1 - f0, 2);

  // chute down to the hatch
  x.strokeStyle = 'rgba(255,136,0,.55)'; x.lineWidth = 3;
  x.beginPath(); x.moveTo(sx(CHUTE.x0), y(CHUTE.h0 - 4)); x.lineTo(sx(CHUTE.x1), y(CHUTE.h1 - 4)); x.stroke(); x.lineWidth = 1;
  x.fillStyle = '#2a1405'; x.fillRect(sx(CHUTE.x0) - 2, y(CHUTE.h0 - 4), 3, CHUTE.h0 - 4);

  // the hatch in the fence, HINGE's face on it, with a dark gap around it
  const gx = sx(615), open = !!m.value('gateOpen');
  x.fillStyle = '#000'; x.fillRect(gx - 18, y(66), 36, 66);
  x.fillStyle = open ? '#000' : '#1d0e05'; x.fillRect(gx - 16, y(64), 32, 64);
  x.strokeStyle = open ? 'rgba(34,197,94,.9)' : 'rgba(255,136,0,.75)'; x.strokeRect(gx - 15.5, y(64) + 0.5, 31, 63);
  if (!open) { for (let i = 0; i < 4; i++) { x.fillStyle = 'rgba(255,136,0,.18)'; x.fillRect(gx - 14, y(60) + i * 15, 28, 2); } }
  text(open ? '◕‿◕' : m.get('gateAllowed') ? '◔_◔' : '◔︵◔', gx, y(40), open ? 'rgba(34,197,94,.95)' : 'rgba(255,136,0,.95)', 9);
  glow('gate', gx - 16, y(64), 32, 64);

  // pickup tray past the hatch
  const tx = sx(TRAY_X);
  x.fillStyle = '#1a0c04'; x.fillRect(tx - 14, y(8), 28, 8); x.strokeStyle = 'rgba(34,197,94,.6)'; x.strokeRect(tx - 13.5, y(8) + 0.5, 27, 7);
  x.fillStyle = '#4a2408'; x.fillRect(tx + 15, y(36), 2, 36);
  x.fillStyle = '#071209'; x.fillRect(tx + 2, y(46), 28, 10); x.strokeStyle = 'rgba(34,197,94,.6)'; x.strokeRect(tx + 2.5, y(46) + 0.5, 27, 9);
  text('PICKUP', tx + 16, y(38.5), 'rgba(34,197,94,.85)', 7);

  // the parcel
  const p = parcelPos(m);
  if (p) {
    const px = sx(p[0]);
    x.fillStyle = '#c98a3f'; x.fillRect(px - 7, y(p[1] + 10), 14, 10); x.strokeStyle = '#ffd9a5'; x.strokeRect(px - 6.5, y(p[1] + 10) + 0.5, 13, 9);
    x.fillStyle = '#6a3f12'; x.fillRect(px - 7, y(p[1] + 6), 14, 2);
  }
}

function parcelPos(m: ZoneModel): [number, number] | null {
  const a = m.get('parcelAt') as ParcelAt;
  if (a === 'A-3' || a === 'B-5' || a === 'C-7') return [SLOT[a], 22];
  if (a === 'hook') return [hookX, 51];
  if (a === 'chute') return [CHUTE.x0, CHUTE.h0];
  if (a === 'sliding') {
    const f = Math.min(1, (m.now() - (m.scratch.slideStart ?? 0)) / m.zone.tuning.slideMs);
    return [CHUTE.x0 + (CHUTE.x1 - CHUTE.x0) * f, CHUTE.h0 + (CHUTE.h1 - CHUTE.h0) * f];
  }
  if (a === 'bounced') return [CHUTE.x1 - 4, CHUTE.h1];
  if (a === 'tray') return [TRAY_X, 8];
  return null;
}
