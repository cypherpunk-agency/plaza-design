/**
 * The opening's picture (ROADMAP "The opening", storyboard frames 1–5): one shot from the title
 * to the tunnel, no cut. A retrowave sunrise over the sea (slatted sun, its reflection, a pink
 * grid on the water, palms), then the camera glides west along the coast: the beach and SALT,
 * the harbor (STS-1, STS-2, STS-3, the stacks, NRLU 404 0451 in a row of boxes), the Spire's
 * foot in the bay (no name, one red light), the Galleria's dome, Downtown's towers closing in
 * until they hide the sun, the first rain; the camera drops to the street and catches LINE 0
 * diving into its tunnel.
 *
 * Every recurring thing in it is a set piece (sets/): this file lays them out and moves the camera.
 *
 * Geometry: the camera's distance west `g` (world units at depth 1); a thing at depth `p` and
 * position `X` (west of the start) is at screen x = W/2 + p·(g − X). Depth also sets where it
 * stands: `ground(p)` runs from the horizon (p = 0) to the near ground (p = 1). The drop at the end
 * lifts each depth by `p · drop`.
 */

import { drawCharacter, type Character } from '../characters';
import { type View } from '../scenes/kit';
import { crowd } from '../scenes/riders';
import { saltLights, saltShell, saltUnder, SALT } from '../sets/beach-bar';
import { stack, type Crate } from '../sets/containers';
import { drawGantry, GANTRIES } from '../sets/crane';
import { drawTower, towerRow, type Tower } from '../sets/downtown-towers';
import { drawGalleriaDome } from '../sets/galleria-dome';
import { drawPalm } from '../sets/palm';
import { drawSpire } from '../sets/spire';
import { CAR, drawTrainCar } from '../sets/train-car';
import { frameView, placed } from '../sets/view';

/** Seconds from NEW GAME to the handover; the last second is the dark of the tunnel. */
export const GLIDE = 54;
/** The camera's top speed (world units a second at depth 1), and when it eases in and out. */
const SPEED = 130, EASE_IN = 5, CRUISE_END = 45, EASE_OUT = 6;
/** Where the regions start, west of the start (the beach is east of 0 too). */
const HARBOR_X = 1250, BAY_X = 3350, CITY_X = 3650;
/** The sand's waterline (depth): low, so the title is mostly sea. */
const BEACH_TOP = 0.88;

const PAPER = '255,217,165', ORANGE = '255,136,0', PINK = '255,61,242', RED = '255,42,68', DAWN = '255,150,90';
const smooth = (a: number, b: number, v: number) => { const f = Math.max(0, Math.min(1, (v - a) / (b - a))); return f * f * (3 - 2 * f); };
const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
const rng = (seed: number) => { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };
const hex = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mixHex = (a: string, b: string, f: number) => { const A = hex(a), B = hex(b); return 'rgb(' + A.map((v, i) => Math.round(lerp(v, B[i], f))).join(',') + ')'; };

/** How far west the camera has come at `tau` seconds into the glide (eases in, cruises, eases out). */
const DIST = (() => {
  const step = 1 / 30, out: number[] = [0];
  let g = 0;
  for (let t = step; t <= GLIDE + step; t += step) {
    const v = t < EASE_IN ? smooth(0, EASE_IN, t) : t < CRUISE_END ? 1 : 1 - smooth(CRUISE_END, CRUISE_END + EASE_OUT, t);
    g += SPEED * v * step; out.push(g);
  }
  return out;
})();
export const glideDist = (tau: number) => { const i = Math.max(0, tau) * 30, k = Math.floor(i), f = i - k; return k + 1 >= DIST.length ? DIST[DIST.length - 1] : lerp(DIST[k], DIST[k + 1], f); };
const G_END = glideDist(GLIDE);

// ---------- what stands where (laid out once) ----------

/** Containers in the stacks under STS-2 (depth 0.62): the code that matters sits in the bottom row of the third, not lit, not framed. */
const STACKS: { X: number; boxes: Crate[] }[] = [
  { X: 1520, boxes: [{ w: 128, p: 0, seed: 81, code: 'MRDU 220 1180' }, { w: 128, p: 5, seed: 82, dx: -4 }, { w: 66, p: 3, seed: 83, dx: 30 }] },
  { X: 1700, boxes: [{ w: 128, p: 1, seed: 84, code: 'TDLU 404 7710' }, { w: 128, p: 2, seed: 85, dx: 5 }] },
  { X: 2060, boxes: [{ w: 128, p: 6, seed: 86, code: 'NRLU 404 0451' }, { w: 128, p: 7, seed: 87, dx: -6 }, { w: 128, p: 0, seed: 88, dx: 4 }] },
  { X: 2230, boxes: [{ w: 128, p: 4, seed: 89, code: 'KSNU 118 0090' }] },
  { X: 2560, boxes: [{ w: 128, p: 3, seed: 90 }, { w: 128, p: 1, seed: 91, dx: 6 }] },
  { X: 2900, boxes: [{ w: 66, p: 2, seed: 92 }, { w: 66, p: 5, seed: 93, dx: 2 }] },
];
/** Boats far out on the sea: X, length, a mast or a stack. */
const BOATS: [number, number, number][] = [[-260, 46, 1], [380, 30, 1], [980, 70, 0], [1900, 120, 0], [2700, 90, 0]];
/** The far shore west of the bay: low city along the horizon. */
const FAR = (() => { const r = rng(17), out: [number, number, number][] = []; for (let X = CITY_X - 500; X < G_END + 3000; X += 10 + r() * 30) out.push([X, 8 + r() * 22, 10 + r() * 30]); return out; })();
const CLOUDS = (() => { const r = rng(5); return Array.from({ length: 9 }, () => [r() * 2, 0.12 + r() * 0.4, 60 + r() * 140]); })();
const STARS = (() => { const r = rng(11); return Array.from({ length: 46 }, () => [r(), r() * 0.45, 0.25 + r() * 0.5, r() * 6]); })();
const DROPS = (() => { const r = rng(23); return Array.from({ length: 240 }, () => [r(), r(), 0.5 + r() * 0.5]); })();
const SIGNS = [
  { text: 'NOODLES · NO LOGS KEPT', col: ORANGE }, { text: 'REGISTRY PREMIUM', col: ORANGE }, { text: 'CAPSULE 7B', col: PAPER },
  { text: 'IDENTITY CHECK AHEAD', col: PAPER }, { text: 'CREDIT 24H', col: ORANGE }, { text: 'QUEUE 4', col: PAPER },
];
/** Downtown, three rows deep: far (dim, behind the dome), middle, near (tall, signs, they swallow the sun). */
const ROWS: { p: number; X: number; towers: (Tower & { x: number })[]; fill: string; edge: number; lit: number; glow: number; hk: number }[] = [
  { p: 0.3, X: 3700, towers: towerRow(41, 46, [26, 60], [50, 120]), fill: '#2a1434', edge: 0.22, lit: 0.07, glow: 0.4, hk: 1 },
  { p: 0.55, X: 4250, towers: towerRow(43, 34, [40, 90], [110, 210], SIGNS.slice(3)), fill: '#1b0e22', edge: 0.3, lit: 0.09, glow: 0.55, hk: 1 },
  { p: 0.86, X: 4700, towers: towerRow(47, 26, [70, 130], [220, 400], SIGNS.slice(0, 3)), fill: '#0f0812', edge: 0.4, lit: 0.11, glow: 0.7, hk: 1 },
];
/** Palms near the camera (depth 1.1), on the beach: X, height (of the view's), lean, seed. The first two frame the title. */
const PALMS: [number, number, number, number][] = [[470, 0.62, 26, 3], [640, 0.72, -30, 4], [1060, 0.58, 22, 5], [1200, 0.66, -18, 6]];
/** People on the street at the end (characters.ts, small: ps 1). */
const STREET: Character[] = [
  { seed: 9101, look: { body: 'avg', hair: 'beanie', garb: 'jacket', extras: ['bag'] }, x: 60, act: 'walk', range: [20, 200], speed: 0.35, ps: 1 },
  { seed: 9102, look: { body: 'slim', hair: 'long', garb: 'coat', extras: ['umbrella'] }, x: 160, act: 'walk', range: [80, 260], speed: 0.28, ps: 1, facing: -1 },
  { seed: 9103, look: { body: 'old', hair: 'brim', garb: 'coat', extras: [] }, x: 250, act: 'stand', ps: 1, facing: 1 },
  { look: 'drone', x: 120, h: 44, act: 'scan', range: [60, 240], speed: 0.4 },
];
const RIDERS = crowd(4511, 18);

export interface GlideView { W: number; H: number; reduced: boolean }

/**
 * Draw the shot. `t`: seconds since the title came up (the sun rises, the water moves);
 * `tau`: seconds into the glide, or null on the title (the camera idles).
 */
export function drawGlide(x: CanvasRenderingContext2D, v: GlideView, t: number, tau: number | null) {
  const { W, H, reduced } = v, still = reduced, u = H / 300, gt = tau ?? 0, f = still ? 0 : t * 60;
  // the camera: a gentle idle on the title, fading out as the glide takes over (no jump)
  const idle = still ? 0 : Math.sin(t * 0.25) * 10 * u * (1 - smooth(0, 3, gt));
  const g = glideDist(gt) - idle;
  const hz = Math.round(H * 0.6), gy0 = Math.round(H * 0.84), D = gy0 - Math.round(H * 0.56);
  const drop = D * smooth(43, 49, gt);
  const ground = (p: number) => hz + (gy0 - hz) * Math.pow(Math.max(0, p), 0.85) - drop * p;
  const sx = (X: number, p: number) => W / 2 + p * (g - X);
  const city = smooth(27, 42, gt), rain = smooth(37, 43, gt), grid = 1 - smooth(0.5, 7, gt);

  // ---------- sky, stars, clouds ----------
  const sk = x.createLinearGradient(0, 0, 0, hz);
  sk.addColorStop(0, mixHex('#140a2a', '#120a20', city));
  sk.addColorStop(0.34, mixHex('#3a1250', '#2c1240', city));
  sk.addColorStop(0.62, mixHex('#a3266a', '#7a2a50', city));
  sk.addColorStop(0.86, mixHex('#ff7a3c', '#c8583c', city));
  sk.addColorStop(1, mixHex('#ffb04a', '#e08a48', city));
  x.fillStyle = sk; x.fillRect(0, 0, W, hz + 1);
  for (const [sxr, syr, a, ph] of STARS) {
    const tw = still ? 1 : 0.6 + 0.4 * Math.sin(t * 1.3 + ph);
    x.fillStyle = 'rgba(' + PAPER + ',' + (a * tw * (1 - city * 0.7)).toFixed(2) + ')'; x.fillRect(Math.round(sxr * W), Math.round(syr * hz * 0.7), 1, 1);
  }
  for (const [cx, cy, cw] of CLOUDS) {
    const px = ((cx * W * 1.4 + 0.03 * g + (still ? 0 : t * 2)) % (W * 1.6)) - W * 0.3, py = Math.round(hz * cy);
    x.fillStyle = 'rgba(255,170,120,' + (0.18 + 0.1 * (1 - city)) + ')'; x.fillRect(Math.round(px), py, Math.round(cw * u), 2);
    x.fillStyle = 'rgba(255,210,160,.14)'; x.fillRect(Math.round(px + cw * u * 0.2), py + 2, Math.round(cw * u * 0.5), 1);
  }

  // ---------- the sun, low and slatted, and its glow ----------
  const R = Math.round(H * 0.19), sunX = W / 2 + 0.04 * g + idle * 0.04, sunY = hz + R * 0.1 - Math.min(t, 180) * 0.05 * u;
  const glow = x.createRadialGradient(sunX, sunY, R * 0.4, sunX, sunY, R * 2.6);
  glow.addColorStop(0, 'rgba(255,160,80,' + (0.45 * (1 - city * 0.5)) + ')'); glow.addColorStop(1, 'rgba(255,120,60,0)');
  x.fillStyle = glow; x.fillRect(sunX - R * 2.6, sunY - R * 2.6, R * 5.2, Math.min(R * 5.2, hz - (sunY - R * 2.6)));
  x.save();
  x.beginPath(); x.rect(0, 0, W, hz);
  x.clip();
  x.beginPath();
  x.rect(sunX - R, sunY - R, R * 2, R * 1.04);
  for (let k = 0, yy = sunY + R * 0.06; yy < sunY + R; k++) { const bar = Math.max(2, R * (0.12 - k * 0.018)); x.rect(sunX - R, yy, R * 2, bar); yy += bar + Math.max(2, R * 0.03 + k * R * 0.012); }
  x.clip();
  const sg = x.createLinearGradient(0, sunY - R, 0, sunY + R);
  sg.addColorStop(0, '#ffe36a'); sg.addColorStop(0.55, '#ffa23a'); sg.addColorStop(1, '#ff4f8a');
  x.fillStyle = sg; x.beginPath(); x.arc(sunX, sunY, R, 0, Math.PI * 2); x.fill();
  x.restore();

  // ---------- far: the shore to the west, the Spire in the bay, boats ----------
  for (const [X, h, w] of FAR) {
    const s = sx(X, 0.1);
    if (s + w < 0 || s > W) continue;
    x.fillStyle = '#26122e'; x.fillRect(Math.round(s - w), Math.round(hz - h * u), Math.round(w), Math.round(h * u) + 1);
  }
  // the Spire: nameless, its foot in the water, one red light (sets/spire.ts)
  const spX = sx(BAY_X - 180, 0.16);
  if (spX > -120 && spX < W + 120) placed(x, Math.round(spX), Math.round(ground(0.14)), 0.58 * u, () => drawSpire(x, { t: f, fill: '#1a0c2a', edge: 0.16, windows: 0.6, still, glow: true }));

  // ---------- the sea ----------
  const sea = x.createLinearGradient(0, hz, 0, H);
  sea.addColorStop(0, '#2a0f3a'); sea.addColorStop(0.6, '#120624'); sea.addColorStop(1, '#08030f');
  x.fillStyle = sea; x.fillRect(0, hz, W, H - hz);
  x.fillStyle = 'rgba(255,170,100,.35)'; x.fillRect(0, hz, W, 1);
  // the grid on the water (the title's): lines running to the sun, rows rolling in
  if (grid > 0.01) {
    x.save(); x.globalAlpha = 0.5 * grid; x.strokeStyle = 'rgba(' + PINK + ',.45)'; x.lineWidth = 1; x.beginPath();
    const roll = still ? 0 : (t * 0.35) % 1;
    for (let i = 0; i < 12; i++) { const k = (i + roll) / 12, yy = Math.round(hz + (H - hz) * k * k) + 0.5; x.moveTo(0, yy); x.lineTo(W, yy); }
    const shift = (g * 0.6) % 40;
    for (let i = -16; i <= 16; i++) { const bx = W / 2 + (i * 40 + shift) * u; x.moveTo(W / 2 + (bx - W / 2) * 0.08, hz); x.lineTo(W / 2 + (bx - W / 2) * 3, H); }
    x.stroke(); x.restore();
  }
  // the sun on the water: bars under it, shimmering
  for (let i = 0; i < 7; i++) {
    const yy = Math.round(hz + 3 + i * i * 1.6 * u + i * 3 * u), ww = R * 1.4 * (1 - i / 8) * (still ? 1 : 1 + 0.14 * Math.sin(t * 2.2 + i * 1.3));
    if (yy > H) break;
    x.fillStyle = 'rgba(255,154,74,' + ((0.75 - i * 0.08) * (still ? 1 : 0.8 + 0.2 * Math.sin(t * 3 + i))).toFixed(2) + ')';
    x.fillRect(Math.round(sunX - ww / 2), yy, Math.round(ww), Math.max(1, Math.round(2 * u)));
  }
  // the Spire's light lying on the water
  if (spX > -40 && spX < W + 40) for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(' + RED + ',' + 0.08 * (1 - i / 6) + ')'; x.fillRect(Math.round(spX - 3 + (still ? 0 : Math.sin(t * 2 + i) * 2)), hz + 3 + i * 4, 6, 1); }
  for (const [X, len, mast] of BOATS) {
    const s = sx(X, 0.2), by = ground(0.12);
    if (s < -len * u || s > W + len * u) continue;
    const L = len * u, bob = still ? 0 : Math.sin(t * 1.4 + X) * u;
    x.fillStyle = '#0c0410'; x.beginPath(); x.moveTo(s - L / 2, by - 4 * u + bob); x.lineTo(s + L / 2, by - 4 * u + bob); x.lineTo(s + L / 2 - 4 * u, by + bob); x.lineTo(s - L / 2 + 3 * u, by + bob); x.closePath(); x.fill();
    if (mast) x.fillRect(Math.round(s), Math.round(by - 22 * u + bob), Math.max(1, Math.round(u)), Math.round(18 * u));
    else { x.fillRect(Math.round(s + L * 0.15), Math.round(by - 12 * u + bob), Math.round(L * 0.25), Math.round(8 * u)); x.fillStyle = 'rgba(255,217,165,.5)'; x.fillRect(Math.round(s + L * 0.18), Math.round(by - 10 * u + bob), 2, 1); }
  }

  // ---------- the land, by region: sand, the quay, a promenade round the bay, the city ----------
  // (each region's seams stand upright, at the depth of its edge, so a seam never cuts across the view)
  const region = (Xe: number, Xw: number, top: number, fill: string, edge: string) => {
    const at = top > 0.1 ? top : 0.5, l = Math.round(sx(Xw, at)), r = Math.round(sx(Xe, at)), yt = Math.round(ground(top));
    if (r < 0 || l > W) return;
    x.fillStyle = fill; x.fillRect(l, yt, r - l, H - yt);
    x.fillStyle = edge; x.fillRect(l, yt, r - l, 1);
  };
  region(-1e5, HARBOR_X, BEACH_TOP, '#3a1a2c', 'rgba(255,217,165,.55)');
  region(HARBOR_X, BAY_X, 0.42, '#1a0c16', 'rgba(' + ORANGE + ',.6)');
  region(BAY_X, CITY_X, 0.92, '#140a12', 'rgba(' + ORANGE + ',.5)');
  region(CITY_X, 1e5, 0.0, '#120a12', 'rgba(' + ORANGE + ',.4)');
  // surf along the sand
  { const yy = Math.round(ground(BEACH_TOP)) + 1, l = Math.max(0, sx(HARBOR_X, BEACH_TOP)), r = W, roll = still ? 0 : (t * 18) % 60;
    x.fillStyle = 'rgba(255,217,165,.6)'; for (let px = l - 60 + roll; px < r; px += 60) if (px + 34 > l) x.fillRect(Math.round(Math.max(l, px)), yy, Math.round(Math.min(34, r - px)), 1); }

  // ---------- Galleria's dome, Downtown's far rows ----------
  const dX = sx(CITY_X + 380, 0.3);
  rows(x, ROWS[0], sx, ground, W, H, f, still, sunX);
  if (dX > -120 * u && dX < W + 120 * u) placed(x, Math.round(dX), Math.round(ground(0.3)) + 1, 0.95 * u, () => drawGalleriaDome(x, { fill: '#241020', lit: 1.4 }));

  // ---------- the harbor: cranes behind, the stacks ----------
  const cranes: [keyof typeof GANTRIES, number, number][] = [['sts1', 1640, 0], ['sts2', 2250, 1.3], ['sts3', 2780, 2.1]];
  for (const [id, X, ph] of cranes) {
    const s = sx(X, 0.45), sc = 0.5 * u;
    if (s < -800 * sc || s > W + 600 * sc) continue;
    placed(x, Math.round(s), Math.round(ground(0.45)), sc, () => {
      const gtr = GANTRIES[id];
      drawGantry(x, id === 'sts2' ? { ...gtr, boom: { ...gtr.boom, x0: -300, x1: 640 }, stays: [[-296, 0], [636, 0], [400, 4]] } : gtr, f, 'all', ph, still);
      // the trolley parked on the boom, a box on the spreader
      const tx = id === 'sts2' ? 360 : -60;
      x.fillStyle = '#2a160a'; x.fillRect(tx - 10, -(gtr.boom.low - 2), 20, 6);
      x.strokeStyle = 'rgba(' + PAPER + ',.35)'; x.beginPath(); x.moveTo(tx - 4.5, -(gtr.boom.low - 6)); x.lineTo(tx - 4.5, -132); x.moveTo(tx + 4.5, -(gtr.boom.low - 6)); x.lineTo(tx + 4.5, -132); x.stroke();
    });
  }
  ROWS.slice(1).forEach((r) => rows(x, r, sx, ground, W, H, f, still, sunX));
  for (const s of STACKS) {
    const px = sx(s.X, 0.62), sc = 0.5 * u;
    if (px < -200 * sc || px > W + 10) continue;
    placed(x, Math.round(px), Math.round(ground(0.62)), sc, () => stack(x, frameView(f), 0, s.boxes));
  }

  // ---------- the beach: SALT on its stilts, the palms ----------
  { const s = sx(840, 0.9), sc = 0.62 * u;
    if (s > -360 * sc && s < W + 120 * sc) placed(x, Math.round(s), Math.round(ground(0.92)), sc, () => {
      saltUnder(x, 226);
      x.fillStyle = '#24140c'; x.fillRect(8, -(SALT.floor - 2), 210, SALT.floor - 30);
      x.fillStyle = '#3a2414'; x.fillRect(2, -26, 222, 26); x.fillStyle = 'rgba(255,190,110,.9)'; x.fillRect(2, -26, 222, 2);
      saltShell(x, 226, 0.05, f);
      saltLights(x, 226, f, still);
    }); }
  // gulls over the beach and the harbor
  for (let i = 0; i < 6; i++) {
    const X = 300 + i * 420, s = sx(X, 0.7) + (still ? 0 : Math.sin(t * 0.5 + i) * 30 * u), yy = hz - (40 + i * 13 % 50) * u + (still ? 0 : Math.sin(t * 1.7 + i) * 4 * u);
    if (s < -10 || s > W + 10) continue;
    const up = still ? 0 : Math.floor(t * 4 + i) % 2;
    x.fillStyle = 'rgba(30,10,30,.85)'; x.fillRect(Math.round(s - 4 * u), Math.round(yy - (up ? 2 : 0)), Math.round(4 * u), 1); x.fillRect(Math.round(s), Math.round(yy), Math.round(4 * u), 1);
  }

  // ---------- the street at the end: LINE 0's cutting, the portal, the train ----------
  // the street along the city's edge, nearest the camera
  { const r = Math.min(W, sx(CITY_X, 1)), yy = Math.round(ground(1));
    if (r > 0) { x.fillStyle = '#0a0606'; x.fillRect(0, yy, Math.round(r), H - yy); x.fillStyle = 'rgba(' + ORANGE + ',.8)'; x.fillRect(0, yy - 1, Math.round(r), 2); } }
  line0(x, v, sx, ground, g, gt, f, u, still);

  // ---------- near: the palms on the sand, quay bollards, street lamps ----------
  for (let i = -2; i < PALMS.length; i++) {
    // the first two: the title's frame (left and right of the sun)
    const [X, h, lean, seed] = i === -2 ? [(0.5 - 0.09) * W / 1.1, 0.8, 24, 1] : i === -1 ? [(0.5 - 0.91) * W / 1.1, 0.66, -20, 2] : PALMS[i];
    const s = sx(X, 1.1);
    if (s < -H * 0.5 || s > W + H * 0.5) continue;
    placed(x, Math.round(s), H + 6 - drop, 1, () => drawPalm(x, { h: h * H, lean: lean * u, seed, t: f, still, rim: DAWN, side: sunX > s ? 1 : -1 }));
  }
  for (let X = HARBOR_X + 80; X < BAY_X; X += 240) {
    const s = sx(X, 1);
    if (s < -10 || s > W + 10) continue;
    x.fillStyle = '#0c060a'; x.fillRect(Math.round(s - 3 * u), Math.round(ground(1) - 6 * u), Math.round(6 * u), Math.round(6 * u));
    x.fillStyle = 'rgba(' + ORANGE + ',.45)'; x.fillRect(Math.round(s - 3 * u), Math.round(ground(1) - 6 * u), Math.round(6 * u), 1);
  }
  for (let X = CITY_X + 60; X < G_END + 2000; X += 300) {
    const s = sx(X, 1), base = ground(1);
    if (s < -30 || s > W + 30) continue;
    x.fillStyle = '#0a0608'; x.fillRect(Math.round(s), Math.round(base - 70 * u), Math.max(2, Math.round(2 * u)), Math.round(70 * u));
    x.fillRect(Math.round(s), Math.round(base - 70 * u), Math.round(12 * u), Math.max(2, Math.round(2 * u)));
    const lg = x.createRadialGradient(s + 11 * u, base - 66 * u, 1, s + 11 * u, base - 66 * u, 40 * u);
    lg.addColorStop(0, 'rgba(255,200,130,.35)'); lg.addColorStop(1, 'rgba(255,200,130,0)');
    x.fillStyle = lg; x.fillRect(s - 30 * u, base - 106 * u, 82 * u, 106 * u);
    x.fillStyle = 'rgba(255,220,160,.95)'; x.fillRect(Math.round(s + 9 * u), Math.round(base - 68 * u), Math.round(5 * u), Math.max(1, Math.round(2 * u)));
  }

  // ---------- rain, and the dark of the tunnel ----------
  if (rain > 0) {
    x.strokeStyle = 'rgba(190,200,255,' + (0.22 * rain).toFixed(2) + ')'; x.lineWidth = 1; x.beginPath();
    const n = Math.round(DROPS.length * rain);
    for (let i = 0; i < n; i++) {
      const [rx, ry, d] = DROPS[i], fall = still ? 0 : t * 260 * d * u;
      const px = ((rx * (W + 60) - fall * 0.25) % (W + 60) + W + 60) % (W + 60) - 20, py = ((ry * H + fall) % H);
      x.moveTo(px, py); x.lineTo(px - 2 * u * d, py + 9 * u * d);
    }
    x.stroke();
  }
  const dark = smooth(GLIDE - 1.6, GLIDE - 0.4, gt);
  if (dark > 0) { x.fillStyle = 'rgba(0,0,0,' + dark + ')'; x.fillRect(0, 0, W, H); }
}

/** One of Downtown's rows of towers (sets/downtown-towers.ts), standing on their depth's ground and running to the bottom of the view. */
function rows(x: CanvasRenderingContext2D, r: typeof ROWS[number], sx: (X: number, p: number) => number, ground: (p: number) => number, W: number, H: number, f: number, still: boolean, sunX: number) {
  const base = Math.round(ground(r.p)), u = H / 300;
  for (const b of r.towers) {
    // a row runs west from its X, each tower its own width (and gap) along it, at this depth
    const s = sx(r.X + (b.x * u) / r.p, r.p) - b.w * u;
    if (s > W + 4 || s + b.w * u < -4) continue;
    placed(x, Math.round(s), base, u, () => drawTower(x, b, { t: f, still, fill: r.fill, edge: r.edge * (Math.abs(s - sunX) < W * 0.4 ? 1.3 : 1), lit: r.lit, glow: r.glow, below: (H - base) / u + 4 }));
  }
}

/**
 * The end of the glide: the street, LINE 0's cutting coming up out of the harbor's direction and
 * diving under Downtown, the portal with its plate, and the train (three cars, sets/train-car.ts)
 * running down into it. The camera is easing to a stop with car 3 going in.
 */
function line0(x: CanvasRenderingContext2D, v: GlideView, sx: (X: number, p: number) => number, ground: (p: number) => number, g: number, gt: number, f: number, u: number, still: boolean) {
  const { W } = v, sc = 0.5 * u, P = G_END + 0.12 * W;
  const px = sx(P, 1), street = ground(1);
  if (px > W + 700 * sc || px < -1400 * sc) return;
  const slope = Math.tan((7 * Math.PI) / 180), cut = 112, run = cut / slope;
  const floor = (lx: number) => (lx < 0 ? cut : lx < run ? cut - lx * slope : 0);
  // the cutting: the street opens, a ramp falls from street level to the portal's floor
  x.save(); x.translate(Math.round(px), Math.round(street)); x.scale(sc, sc);
  x.fillStyle = '#07040a'; x.beginPath(); x.moveTo(0, 0); x.lineTo(run, 0); x.lineTo(0, cut); x.closePath(); x.fill();
  x.fillStyle = '#140c14'; x.fillRect(-1, cut, run + 400, 400);
  x.beginPath(); x.moveTo(0, cut); x.lineTo(run, 0); x.lineTo(run + 400, 0); x.lineTo(run + 400, cut); x.closePath(); x.fill();
  // the rail down the ramp, sleepers
  x.strokeStyle = 'rgba(170,110,70,.8)'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, cut - 2); x.lineTo(run, -2); x.lineTo(run + 400, -2); x.stroke(); x.lineWidth = 1;
  x.fillStyle = 'rgba(90,58,36,.9)'; for (let k = 10; k < run; k += 16) x.fillRect(k, cut - k * slope - 1, 8, 3);
  // the train, running down into the portal: hidden past the portal's face
  const tv = 230, nose = 900 - tv * (gt - 45);
  if (gt > 44) {
    x.save(); x.beginPath(); x.rect(4, -400, 4000, 800); x.clip();
    for (let c = 0; c < 3; c++) {
      // each car sits on the rail under both its ends: placed by its middle, turned to the line between its bogies
      const c0 = nose + c * (CAR.len + 8), a = c0 + 40, b = c0 + CAR.len - 40, ya = floor(a), yb = floor(b);
      x.save(); x.translate((a + b) / 2, (ya + yb) / 2); x.rotate(Math.atan2(yb - ya, b - a)); x.translate(-CAR.len / 2, 0);
      for (const k of [40, CAR.len - 40]) { x.fillStyle = '#0a0a0c'; x.fillRect(k - 18, -14, 36, 12); x.fillStyle = '#26262a'; x.beginPath(); x.arc(k - 9, -4, 4, 0, 7); x.arc(k + 9, -4, 4, 0, 7); x.fill(); }
      drawTrainCar(x, 0, (h) => -h, { t: f, c, riders: RIDERS, open: 0, dest: 'DOWNTOWN' });
      if (c === 2) { x.fillStyle = '#050302'; x.fillRect(CAR.len - 46, -98, 36, 11); x.fillStyle = 'rgba(' + PAPER + ',.8)'; x.font = '600 7px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('CAR 3', CAR.len - 28, -92.5); }
      x.restore();
    }
    // the headlight's beam on the ramp ahead
    if (nose > 0) { const hg = x.createRadialGradient(nose, cut - nose * slope - 30, 2, nose, cut - nose * slope - 30, 140); hg.addColorStop(0, 'rgba(255,230,190,.25)'); hg.addColorStop(1, 'rgba(255,230,190,0)'); x.fillStyle = hg; x.fillRect(nose - 140, cut - nose * slope - 170, 280, 280); }
    x.restore();
  }
  // the portal: a concrete headwall from the street down to the floor, a black arch, LINE 0 on a plate
  x.fillStyle = '#0a0606'; x.fillRect(-6000, -1, 5960, 500);
  x.fillStyle = '#1e1418'; x.fillRect(-40, -1, 46, cut + 3);
  x.strokeStyle = 'rgba(' + ORANGE + ',.55)'; x.strokeRect(-39.5, -0.5, 45, cut + 2);
  // the mouth: black inside, a lamp over it
  x.fillStyle = '#000'; x.beginPath(); x.moveTo(-30, cut); x.lineTo(-30, 30); x.quadraticCurveTo(-30, 8, -8, 8); x.lineTo(6, 8); x.lineTo(6, cut); x.closePath(); x.fill();
  x.fillStyle = 'rgba(255,220,160,.9)'; x.fillRect(-14, 3, 8, 2);
  // the street over the tunnel and past the cutting (the cutting itself is open)
  x.fillStyle = 'rgba(' + ORANGE + ',.9)'; x.fillRect(-6000, -1, 6006, 3); x.fillRect(run, -1, 3000, 3);
  x.fillStyle = '#0d0705'; x.fillRect(-34, -22, 46, 15); x.strokeStyle = 'rgba(' + ORANGE + ',.7)'; x.strokeRect(-33.5, -21.5, 45, 14);
  x.fillStyle = 'rgba(' + ORANGE + ',.4)'; x.fillRect(-28, -7, 2, 7); x.fillRect(4, -7, 2, 7);
  x.save(); x.font = '600 9px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(' + ORANGE + ',.95)'; x.shadowColor = 'rgba(' + ORANGE + ',.8)'; x.shadowBlur = still ? 0 : 6; x.fillText('LINE 0', -11, -14); x.restore();
  // the people on the street over the tunnel, and a Registry drone checking them
  const sv: View = { ...frameView(f), sx: (wx) => Math.round(wx - 340), y: (h) => -h };
  for (const c of STREET) drawCharacter(x, sv, { ...c, ps: 2 });
  x.restore();
  void g;
}
