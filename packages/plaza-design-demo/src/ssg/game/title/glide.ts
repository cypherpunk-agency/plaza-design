/**
 * The opening's picture (ROADMAP "The opening", storyboard frames 1–5): one shot from the title to
 * the tunnel, no cut. The title is the bar at the edge of the sea: a dawn over a glassy sea (the
 * mirror and the pixel swell, sets/sea.ts), SALT with its string lights, the DJ bot and people
 * dancing, a bonfire with people round it, parasols and loungers, palms of every height. NEW GAME:
 * the camera glides west along ONE continuous coast (Tommi, 2026-10-15: no seams): the pier with
 * people on it against the sun, the port gate, the harbor (cranes with their booms up, STS-2 working,
 * the stacks, the port's machines, dockers in hi-vis, trucks), the bay bridge, the Galleria on its
 * plinth, Downtown's towers closing in until they hide the sun, the first rain; the camera drops to
 * the street and catches LINE 0 diving into its tunnel. Handover unchanged (title/index.ts).
 *
 * One ground line runs the whole way (coast.ts): only its material changes (sand, quay, the bridge's
 * deck, the plaza, the street), each change bridged by a piece that belongs to both sides, and a
 * big dark thing passes close to the camera at every seam. One road runs from the port gate to the
 * tunnel with traffic on it. Life everywhere: people, robots, vehicles, drones, air taxis, a blimp.
 *
 * Every recurring thing in it is a set piece (sets/): this file and coast.ts lay them out and move
 * the camera.
 *
 * Geometry: the picture is drawn in view units `D` (about 195 tall; the drafts' units), snapped so a
 * unit is a whole number of device pixels. The camera's distance west is `g`; a thing at depth `p`
 * (1: the near coast) and position `X` (west of the start) is at screen x = W/2 + p·(g − X). The
 * near coast draws the scenes' sets at a third of their size (`S`): the player's scale there is
 * about 16 view units. The drop at the end lifts each depth by `p · drop`.
 */

import { drawCharacter, type Character } from '../characters';
import { type View } from '../scenes/kit';
import { crowd } from '../scenes/riders';
import { drawAirTaxi, drawBlimp } from '../sets/air-traffic';
import { drawSea } from '../sets/sea';
import { drawSpire } from '../sets/spire';
import { CAR, drawTrainCar } from '../sets/train-car';
import { frameView, placed } from '../sets/view';
import { CUTTING, drawCoast, drawForeground, RAMP, S, type CoastView, PLACES } from './coast';

/** Seconds from NEW GAME to the handover; the last second is the dark of the tunnel. */
export const GLIDE = 54;
/**
 * Seconds of the sunrise before the menu: the sun comes up from under the sea and settles half up
 * on the horizon, the sky warming from night to dawn. The title's clock `t` runs from 0; from RISE
 * on the shot is settled (the menu pops in, NEW GAME's glide starts from it).
 */
export const RISE = 7;
/** When the sun starts and stops moving, inside the rise (it rests a moment before the menu). */
const SUN_FROM = 0.4, SUN_TO = 6.5;
/** The camera's top speed (view units a second at depth 1), and when it eases in and out. */
const SPEED = 64, EASE_IN = 5, CRUISE_END = 45, EASE_OUT = 6;

const PAPER = '255,217,165', ORANGE = '255,136,0', RED = '255,42,68';
const smooth = (a: number, b: number, v: number) => { const f = Math.max(0, Math.min(1, (v - a) / (b - a))); return f * f * (3 - 2 * f); };
const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
const rng = (seed: number) => { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };
const hex = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
/** Two #rrggbb colours mixed, as #rrggbb (so a mix can be mixed again). */
const mixHex = (a: string, b: string, f: number) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], f)).toString(16).padStart(2, '0')).join(''); };

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
/** When the camera is over world position X (depth doesn't matter: anything at X is at the middle of the view). */
const tauAt = (X: number) => { let a = 0, b = GLIDE; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (glideDist(m) < X) a = m; else b = m; } return Math.round(b * 10) / 10; };

/** The sunrise's progress (0 at night, 1 settled) at title time `t`: the sun's ease, and the sky's (a little ahead of it). */
const sunUp = (t: number) => smooth(SUN_FROM, SUN_TO, t);
const warmth = (t: number) => smooth(0, SUN_TO + 0.2, t);
/** Where the sun's middle sits below the horizon, in sun radii: from well under the sea to a tenth under (half up). */
const sunDepth = (t: number) => lerp(1.25, 0.1, sunUp(t));
/** When the sun's top breaks the waterline (its reflections start there). */
const WATERLINE = (() => { let a = 0, b = RISE; for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (sunDepth(m) > 1) a = m; else b = m; } return Math.round(b * 10) / 10; })();

/** The portal of LINE 0's tunnel (west of where the camera stops, so it sits left of the middle). */
const PORTAL = CUTTING + RAMP;
/** The camera's drop to the street, and the train's run into the portal (glide seconds). */
const DROP_FROM = 44, DROP_TO = 49.5, TRAIN_FROM = 44;
/** Downtown: the sky turns the city's, then the first rain. */
const CITY_FROM = tauAt(PLACES.plaza[0] + 200), CITY_TO = tauAt(PLACES.street + 230);
const RAIN_FROM = tauAt(PLACES.street + 90), RAIN_TO = tauAt(PLACES.street + 240);

/** Named moments, for sudo's time control (transport.ts): the sunrise's, and the glide's (where the camera is). */
export const RISE_BEATS = [{ at: 0, name: 'NIGHT' }, { at: WATERLINE, name: 'WATERLINE' }, { at: SUN_TO, name: 'SETTLED' }];
export const GLIDE_BEATS = [
  { at: 0, name: 'BEACH' },
  { at: tauAt((PLACES.pier[0] + PLACES.pier[1]) / 2), name: 'PIER' },
  { at: tauAt(PLACES.gate), name: 'PORT GATE' },
  { at: tauAt(PLACES.harbor), name: 'HARBOR' },
  { at: tauAt((PLACES.bridge[0] + PLACES.bridge[1]) / 2), name: 'BAY BRIDGE' },
  { at: tauAt(PLACES.galleria), name: 'GALLERIA' },
  { at: tauAt(PLACES.street + 150), name: 'DOWNTOWN' },
  { at: 46.5, name: 'TUNNEL' },
];

// ---------- the far layers (laid out once) ----------

/** Boats far out on the sea: X (at depth 0.2), length, a mast or a stack. */
const BOATS: [number, number, number][] = [[-160, 22, 0], [-40, 12, 1], [300, 14, 1], [700, 34, 0], [1400, 26, 0], [2100, 18, 1]];
/** The far shore across the bay: low city along the horizon (X at depth 0.12, height, width), taller toward Downtown. */
const FAR = (() => { const r = rng(17), out: [number, number, number, number][] = []; for (let X = 1850; X < 5200; X += 40 + r() * 90) out.push([X, 3 + r() * 7 + Math.max(0, X - 2600) * 0.006, 4 + r() * 12, r()]); return out; })();
const CLOUDS = (() => { const r = rng(5); return Array.from({ length: 9 }, () => [r() * 2, 0.12 + r() * 0.4, 30 + r() * 70]); })();
const STARS = (() => { const r = rng(11); return Array.from({ length: 60 }, () => [r(), r() * 0.45, 0.25 + r() * 0.5, r() * 6]); })();
const DROPS = (() => { const r = rng(23); return Array.from({ length: 240 }, () => [r(), r(), 0.5 + r() * 0.5]); })();
/** Sky lanes: height (of the view), direction, speed (view units a frame), spacing, paint. */
const LANES: [number, number, number, number, string][] = [[0.17, 1, 0.55, 230, '#e8e0d0'], [0.22, -1, 0.45, 260, '#ffd23a'], [0.28, 1, 0.7, 300, '#c8c0b0'], [0.33, -1, 0.6, 210, '#e8e0d0']];
/** People on the street at the end (characters.ts at the player's scale, drawn at a third: ps 3 in the line's frame). */
const STREET: Character[] = [
  { seed: 9101, look: { body: 'avg', hair: 'beanie', garb: 'jacket', extras: ['bag'] }, x: 60, act: 'walk', range: [20, 200], speed: 0.35 },
  { seed: 9102, look: { body: 'slim', hair: 'long', garb: 'coat', extras: ['umbrella'] }, x: 160, act: 'walk', range: [80, 260], speed: 0.28, facing: -1 },
  { seed: 9103, look: { body: 'old', hair: 'brim', garb: 'coat', extras: [] }, x: 250, act: 'stand', facing: 1 },
  { look: 'drone', x: 120, h: 44, act: 'scan', range: [60, 240], speed: 0.4 },
];
const RIDERS = crowd(4511, 18);

export interface GlideView { W: number; H: number; reduced: boolean }

/**
 * Draw the shot. `t`: seconds since the title came up (the sun rises until RISE, the water moves);
 * `tau`: seconds into the glide, or null on the title (the camera idles). A pure function of the
 * two: any (t, tau) draws the same frame (sudo's time control seeks on it).
 */
export function drawGlide(x: CanvasRenderingContext2D, v: GlideView, t: number, tau: number | null) {
  // view units: the drafts' scale, snapped to whole device pixels so the pixels stay crisp
  const k = Math.abs(x.getTransform().a) || 1, raw = Math.min(v.H / 195, v.W / 420);
  const d = Math.max(1, Math.round(raw * k)) / k;
  const W = v.W / d, H = v.H / d;
  x.save(); x.scale(d, d);
  frame(x, W, H, v.reduced, t, tau);
  x.restore();
}

function frame(x: CanvasRenderingContext2D, W: number, H: number, still: boolean, t: number, tau: number | null) {
  const gt = tau ?? 0, f = still ? 0 : t * 60;
  // the camera: a gentle idle on the title, fading out as the glide takes over (no jump)
  const idle = still ? 0 : Math.sin(t * 0.25) * 5 * (1 - smooth(0, 3, gt));
  const g = glideDist(gt) - idle;
  const hz = Math.round(H * 0.56), GY = Math.round(H * 0.82);
  const drop = H * 0.3 * smooth(DROP_FROM, DROP_TO, gt);
  const city = smooth(CITY_FROM, CITY_TO, gt), rain = smooth(RAIN_FROM, RAIN_TO, gt);
  const warm = warmth(t), up = sunUp(t);
  const sx = (X: number, p: number) => W / 2 + p * (g - X);
  const lift = (p: number) => -drop * p;

  // ---------- sky, stars, clouds ----------
  // each stop: night (before the sun), dawn (the title), Downtown's (the glide's end)
  const skyTop = hz + lift(0.1);
  const sk = x.createLinearGradient(0, 0, 0, skyTop);
  const stop = (at: number, night: string, dawn: string, town: string) => sk.addColorStop(at, mixHex(mixHex(night, dawn, warm), town, city));
  stop(0, '#05040e', '#140a2a', '#120a20');
  stop(0.38, '#0b0820', '#3a1250', '#2c1240');
  stop(0.68, '#1a0f34', '#a3266a', '#7a2a50');
  stop(0.9, '#3a1846', '#ff7a3c', '#c8583c');
  stop(1, '#5a2240', '#ffb04a', '#e08a48');
  x.fillStyle = sk; x.fillRect(0, 0, W, skyTop + 1);
  const starK = lerp(1.9, 1, warm) * (1 - city * 0.7);
  for (const [sxr, syr, a, ph] of STARS) {
    const tw = still ? 1 : 0.6 + 0.4 * Math.sin(t * 1.3 + ph);
    x.fillStyle = 'rgba(' + PAPER + ',' + Math.min(1, a * tw * starK * (1 - syr * 1.6)).toFixed(2) + ')'; x.fillRect(Math.round(sxr * W), Math.round(syr * hz), 1, 1);
  }
  for (const [cx, cy, cw] of CLOUDS) {
    const px = ((cx * W * 1.4 + 0.03 * g + (still ? 0 : t * 1.2)) % (W * 1.6)) - W * 0.3, py = Math.round(hz * cy);
    x.fillStyle = 'rgba(255,150,120,' + ((0.18 + (cy * 0.4)) * lerp(0.25, 1, warm) * (1 - city * 0.3)).toFixed(3) + ')'; x.fillRect(Math.round(px), py, Math.round(cw), 1);
    x.fillStyle = 'rgba(40,10,50,.35)'; x.fillRect(Math.round(px + 6), py + 1, Math.round(cw * 0.7), 1);
  }

  // ---------- the sun, low and slatted, and its glow ----------
  // it comes up out of the sea and settles half up (the horizon clips what is under it); far off, it drifts slowly
  const R = Math.round(H * 0.15), sunX = W / 2 + 18 + 0.06 * g + idle * 0.06, sunY = hz + lift(0.02) + R * sunDepth(t);
  const glow = x.createRadialGradient(sunX, sunY, R * 0.5, sunX, sunY, R * 3.3);
  glow.addColorStop(0, 'rgba(255,170,90,' + (0.4 * (1 - city * 0.5) * lerp(0.15, 1, up)).toFixed(3) + ')'); glow.addColorStop(1, 'rgba(255,120,80,0)');
  x.fillStyle = glow; x.fillRect(0, 0, W, skyTop);
  x.save();
  x.beginPath(); x.rect(0, 0, W, skyTop); x.clip();
  x.beginPath();
  // solid at the top, slatted from a little above its middle, the slats thicker toward the sea
  x.rect(sunX - R, sunY - R, R * 2, R * 0.55);
  for (let i = 0, yy = sunY - R * 0.45; yy < sunY + R; i++) { const bar = Math.max(1.5, R * (0.14 - i * 0.016)); x.rect(sunX - R, yy, R * 2, bar); yy += bar + Math.max(1, R * 0.035 + i * R * 0.014); }
  x.clip();
  const sg = x.createLinearGradient(0, sunY - R, 0, sunY + R * 0.2);
  sg.addColorStop(0, '#ffe36a'); sg.addColorStop(0.55, '#ffa23a'); sg.addColorStop(1, '#ff5a7a');
  x.fillStyle = sg; x.beginPath(); x.arc(sunX, sunY, R, 0, Math.PI * 2); x.fill();
  x.restore();

  // ---------- the far shore, the ad blimp, the Spire in the bay, the sky lanes ----------
  for (const [X, h, w, r] of FAR) {
    const s = sx(X, 0.12), base = hz + lift(0.12);
    if (s + w < 0 || s > W) continue;
    x.fillStyle = mixHex('#140a1e', '#3a1640', warm * (1 - city * 0.4)); x.fillRect(Math.round(s - w), Math.round(base - h), Math.round(w), Math.round(h) + 1);
    if (r > 0.55) { x.fillStyle = 'rgba(255,160,90,.4)'; x.fillRect(Math.round(s - w + 2), Math.round(base - h + 2), 1, 1); }
  }
  // the blimp drifting east over the bay, its ads changing
  { const X = 1500 - f * 0.08, s = sx(X, 0.25), by = Math.round(H * 0.15) + lift(0.25);
    if (s > -60 && s < W + 60) placed(x, Math.round(s), Math.round(by), 0.36, () => drawBlimp(x, { t: f, still })); }
  // the Spire: the monolith in the bay, nameless; its halo of traffic, one red light (sets/spire.ts)
  const spX = sx(1640, 0.3), spBase = hz + 2 + lift(0.3), spS = (H * 0.5) / 300;
  if (spX > -60 && spX < W + 60) placed(x, Math.round(spX), Math.round(spBase), spS, () => drawSpire(x, { t: f, fill: mixHex('#08040c', '#1a0c26', warm), edge: 0.2, windows: 0.9, still, glow: true }));
  // air taxis on their sky lanes: more of them the nearer the city
  const lanesK = smooth(500, 1400, g);
  if (lanesK > 0) for (const [hy, dir, sp, gap, paint] of LANES) {
    const off = still ? 0 : f * sp * dir, p = 0.5;
    const base = sx(0, p) + off, first = Math.floor((-base - 40) / gap), ly = Math.round(H * hy) + lift(p);
    for (let i = first; i < first + Math.ceil((W + 80) / gap) + 1; i++) {
      const X = i * gap, s = base + X;
      if (s < -30 || s > W + 30) continue;
      // the lane is quieter toward the beach: some slots stay empty there
      if (((i * 7919) % 13) / 13 > lanesK) continue;
      placed(x, Math.round(s), ly + ((i * 37) % 5) - 2, 0.3, () => drawAirTaxi(x, { t: f + i * 13, face: dir as 1 | -1, paint, still }));
    }
  }

  // ---------- the sea ----------
  const seaTop = hz + lift(0.1), seaBot = GY + lift(1);
  const refl = smooth(0, 0.45, 1 - sunDepth(t)) * (1 - city * 0.8);
  drawSea(x, { W, top: seaTop, bottom: Math.max(seaTop + 4, seaBot + 2), sunX, sunR: R, refl, t: f, still, warm, haze: city * 0.6, shift: -g * 0.4 });
  // the Spire's light and its dark shape lying on the water
  if (spX > -40 && spX < W + 40) {
    x.fillStyle = 'rgba(8,3,14,.35)'; x.fillRect(Math.round(spX - 8 * spS * 2), seaTop + 1, Math.round(32 * spS * 2), Math.round((seaBot - seaTop) * 0.4));
    for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(' + RED + ',' + (0.12 * (1 - i / 6)).toFixed(3) + ')'; x.fillRect(Math.round(spX - 2 + (still ? 0 : Math.sin(t * 2 + i) * 1.5)), seaTop + 2 + i * 3, 3, 1); }
  }
  for (const [X, len, mast] of BOATS) {
    const s = sx(X, 0.2), by = seaTop + 3;
    if (s < -len || s > W + len) continue;
    const bob = still ? 0 : Math.round(Math.sin(t * 1.4 + X) * 0.6);
    x.fillStyle = '#12061a'; x.fillRect(Math.round(s), by + bob, len, 2); x.fillRect(Math.round(s) + 2, by + 2 + bob, len - 4, 1);
    if (mast) { x.fillRect(Math.round(s + len / 2), by - 12 + bob, 1, 12); x.beginPath(); x.moveTo(s + len / 2 + 1, by - 11 + bob); x.lineTo(s + len / 2 + 7, by - 1 + bob); x.lineTo(s + len / 2 + 1, by - 1 + bob); x.fill(); }
    else { x.fillRect(Math.round(s + 3), by - 3 + bob, 6, 3); x.fillStyle = 'rgba(255,217,165,.5)'; x.fillRect(Math.round(s + 4), by - 2 + bob, 1, 1); }
  }

  // ---------- the near coast: one ground line from the beach to the tunnel (coast.ts) ----------
  const cv: CoastView = { W, H, GY, hz, g, f, t, gt, still, warm, city, rain, sx: (X) => sx(X, 1), sunX };
  x.save(); x.translate(0, Math.round(-drop));
  drawCoast(x, cv);
  line0(x, cv, gt);
  drawForeground(x, cv);
  x.restore();

  // ---------- rain, and the dark of the tunnel ----------
  if (rain > 0) {
    x.strokeStyle = 'rgba(190,200,255,' + (0.24 * rain).toFixed(2) + ')'; x.lineWidth = 0.6; x.beginPath();
    const n = Math.round(DROPS.length * rain);
    for (let i = 0; i < n; i++) {
      const [rx, ry, dd] = DROPS[i], fall = still ? 0 : t * 150 * dd;
      const px = ((rx * (W + 40) - fall * 0.25) % (W + 40) + W + 40) % (W + 40) - 10, py = ((ry * H + fall) % H);
      x.moveTo(px, py); x.lineTo(px - 1.2 * dd, py + 5 * dd);
    }
    x.stroke();
  }
  const dark = smooth(GLIDE - 1.6, GLIDE - 0.4, gt);
  if (dark > 0) { x.fillStyle = 'rgba(0,0,0,' + dark + ')'; x.fillRect(0, 0, W, H); }
}

/**
 * The end of the glide: the street, LINE 0's cutting coming up out of the harbor's direction and
 * diving under Downtown, the portal with its plate, and the train (three cars, sets/train-car.ts)
 * running down into it. The camera is easing to a stop with car 3 going in. Drawn in the scenes'
 * units at the near coast's scale, its street level on the ground line.
 */
function line0(x: CanvasRenderingContext2D, c: CoastView, gt: number) {
  const px = c.sx(PORTAL), f = c.f;
  if (px > c.W + 120 || px < -500) return;
  const slope = Math.tan((12 * Math.PI) / 180), cut = 112, run = RAMP / S;
  const floor = (lx: number) => (lx < 0 ? cut : lx < run ? cut - lx * slope : 0);
  x.save(); x.translate(Math.round(px), c.GY); x.scale(S, S);
  // the cutting: the street opens, a ramp falls from street level to the portal's floor
  x.fillStyle = '#07040a'; x.beginPath(); x.moveTo(0, 0); x.lineTo(run, 0); x.lineTo(0, cut); x.closePath(); x.fill();
  // the ground under the ramp, down to the bottom (the street's strip goes on past the cutting's top)
  x.fillStyle = '#140c14'; x.fillRect(-1, cut, run + 1, 900);
  x.beginPath(); x.moveTo(0, cut); x.lineTo(run, 0); x.lineTo(run, cut); x.closePath(); x.fill();
  // the cutting's retaining wall, lit by the street above
  x.fillStyle = 'rgba(' + ORANGE + ',.18)'; for (let k = 40; k < run; k += 60) x.fillRect(k, 4, 1, cut - k * slope - 6);
  // the rail down the ramp, sleepers
  x.strokeStyle = 'rgba(170,110,70,.8)'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, cut - 2); x.lineTo(run, -2); x.lineTo(run + 400, -2); x.stroke(); x.lineWidth = 1;
  x.fillStyle = 'rgba(90,58,36,.9)'; for (let k = 10; k < run; k += 16) x.fillRect(k, cut - k * slope - 1, 8, 3);
  // the train, running down into the portal: hidden past the portal's face
  const tv = 200, nose = run - tv * (gt - 46.3);
  if (gt > TRAIN_FROM) {
    x.save(); x.beginPath(); x.rect(4, -400, 4000, 800); x.clip();
    for (let k = 0; k < 3; k++) {
      // each car sits on the rail under both its ends: placed by its middle, turned to the line between its bogies
      const c0 = nose + k * (CAR.len + 8), a = c0 + 40, b = c0 + CAR.len - 40, ya = floor(a), yb = floor(b);
      x.save(); x.translate((a + b) / 2, (ya + yb) / 2); x.rotate(Math.atan2(yb - ya, b - a)); x.translate(-CAR.len / 2, 0);
      for (const kk of [40, CAR.len - 40]) { x.fillStyle = '#0a0a0c'; x.fillRect(kk - 18, -14, 36, 12); x.fillStyle = '#26262a'; x.beginPath(); x.arc(kk - 9, -4, 4, 0, 7); x.arc(kk + 9, -4, 4, 0, 7); x.fill(); }
      drawTrainCar(x, 0, (h) => -h, { t: f, c: k, riders: RIDERS, open: 0, dest: 'DOWNTOWN' });
      if (k === 2) { x.fillStyle = '#050302'; x.fillRect(CAR.len - 46, -98, 36, 11); x.fillStyle = 'rgba(' + PAPER + ',.8)'; x.font = '600 7px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('CAR 3', CAR.len - 28, -92.5); }
      x.restore();
    }
    // the headlight's beam on the ramp ahead
    if (nose > 0) { const hg = x.createRadialGradient(nose, cut - nose * slope - 30, 2, nose, cut - nose * slope - 30, 140); hg.addColorStop(0, 'rgba(255,230,190,.25)'); hg.addColorStop(1, 'rgba(255,230,190,0)'); x.fillStyle = hg; x.fillRect(nose - 140, cut - nose * slope - 170, 280, 280); }
    x.restore();
  }
  // the portal: a concrete headwall from the street down to the floor, a black arch, LINE 0 on a plate
  x.fillStyle = '#0a0606'; x.fillRect(-6000, -1, 5960, 900);
  x.fillStyle = '#1e1418'; x.fillRect(-40, -1, 46, cut + 3);
  x.strokeStyle = 'rgba(' + ORANGE + ',.55)'; x.strokeRect(-39.5, -0.5, 45, cut + 2);
  x.fillStyle = '#000'; x.beginPath(); x.moveTo(-30, cut); x.lineTo(-30, 30); x.quadraticCurveTo(-30, 8, -8, 8); x.lineTo(6, 8); x.lineTo(6, cut); x.closePath(); x.fill();
  x.fillStyle = 'rgba(255,220,160,.9)'; x.fillRect(-14, 3, 8, 2);
  // the street over the tunnel and past the cutting (the cutting itself is open), its railing
  x.fillStyle = 'rgba(' + ORANGE + ',.9)'; x.fillRect(-6000, -1, 6006, 3);
  x.fillStyle = 'rgba(' + ORANGE + ',.4)'; for (let k = 20; k < run; k += 30) x.fillRect(k, -14, 2, 14); x.fillRect(10, -14, run - 10, 2);
  x.fillStyle = '#0d0705'; x.fillRect(-34, -22, 46, 15); x.strokeStyle = 'rgba(' + ORANGE + ',.7)'; x.strokeRect(-33.5, -21.5, 45, 14);
  x.fillStyle = 'rgba(' + ORANGE + ',.4)'; x.fillRect(-28, -7, 2, 7); x.fillRect(4, -7, 2, 7);
  x.save(); x.font = '600 9px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(' + ORANGE + ',.95)'; x.shadowColor = 'rgba(' + ORANGE + ',.8)'; x.shadowBlur = c.still ? 0 : 6; x.fillText('LINE 0', -11, -14); x.restore();
  // the people on the street over the tunnel, and a Registry drone checking them
  const sv: View = { ...frameView(f), sx: (wx) => Math.round(wx - 340), y: (h) => -h };
  for (const p of STREET) drawCharacter(x, sv, p);
  x.restore();
}
