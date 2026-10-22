/**
 * Set piece (ART-GUIDE §12, TIME.md "Light"): the sky of the moment, from the city clock (light.ts).
 * Register: sets/index.ts (`sky`).
 *
 * - `drawSky`: the gradient by the sun's height (night → dawn → day → dusk; greyer under cloud),
 *   the twilight glow toward the sun, stars, the moon with its phase, and the sun: option A, a big
 *   slatted retrowave sun near the horizon whose slats close as it climbs, a small pale disc in haze
 *   high up. Where they are on screen comes from their azimuth and the scene's facing (`FOV` either
 *   side of ahead); a sun behind you is not drawn. Cloud softens them, rain and fog swallow them.
 * - `skyPos`: a body's screen position (for reflections and glows a scene draws itself).
 * - `sunPath`: the sun's (or the moon's) glitter on water under it, following its screen x.
 * - `seaCols`: water colours for the moment (the horizon picks up the sky).
 * - `drawPane`: the sky through an interior window (its own facing), with the sun or moon if they
 *   are in that direction, and a few towers whose windows follow the clock.
 * - `windowShaft`: the sun coming in through a window: a shaft and a patch on the floor whose colour
 *   and angle follow the sun; none at night or when the sun is on the other side of the building.
 * - `glass`: the colour a dark window pane reflects (the sky by day, nothing at night).
 *
 * Draws on a scene `View` (screen units of the view). Cheap: a few gradients a frame.
 */

import { FOV, lerp, rel, smooth, windowLit, type Body, type Light } from "../../world/light";
import type { View } from "../core/view";
import { drawSunsetSky } from "./sunset-sky";

type RGB = number[];
const R = Math.round, clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const mixc = (a: RGB, b: RGB, f: number): RGB => a.map((v, i) => R(v + (b[i] - v) * f));
const rgba = (c: RGB, a = 1) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ---------- colours ----------

/** Sky palettes: top, middle, the horizon. Night is near black, like the game always was. */
const SKY: Record<'night' | 'dawn' | 'dusk' | 'day' | 'grey' | 'greyNight', RGB[]> = {
  night: [[3, 2, 10], [8, 5, 20], [18, 9, 26]],
  dawn: [[22, 12, 46], [150, 46, 98], [255, 152, 76]],
  dusk: [[30, 12, 52], [168, 48, 108], [255, 112, 98]],
  day: [[52, 84, 150], [120, 148, 192], [210, 204, 196]],
  grey: [[84, 86, 96], [118, 118, 126], [150, 146, 146]],
  greyNight: [[12, 10, 16], [22, 16, 22], [46, 28, 26]],
};

/** The sky's three colours now. */
export function skyCols(l: Light): RGB[] {
  const el = l.sun.el, twi = l.morning ? SKY.dawn : SKY.dusk;
  let c: RGB[];
  if (el < -0.15) c = SKY.night;
  else if (el < 0.02) { const f = smooth(-0.15, 0.02, el); c = SKY.night.map((v, i) => mixc(v, twi[i], f)); }
  else { const f = smooth(0.06, 0.42, el); c = twi.map((v, i) => mixc(v, SKY.day[i], f)); }
  if (l.cover > 0.01) {
    const g = SKY.greyNight.map((v, i) => mixc(v, SKY.grey[i], l.daylight));
    const f = smooth(0, 1, l.cover) * 0.9;
    c = c.map((v, i) => mixc(v, g[i], f));
  }
  // a full moon lifts the night a touch
  if (l.night > 0.5 && l.moon.up) c = c.map((v) => mixc(v, [30, 34, 60], 0.12 * l.moon.lit * l.night));
  return c;
}

/** The colour a dark window pane reflects: the sky's middle by day ("r,g,b"), and how much (0..1). */
export function glass(l: Light): [string, number] {
  const c = skyCols(l)[1];
  return [c.join(','), 0.32 * l.daylight];
}

/** The water now: under the horizon, the middle, near (rgba strings). Night keeps the black water. */
export function seaCols(l: Light): string[] {
  const [, b, c] = skyCols(l), night: RGB = [1, 4, 10], f = l.daylight * 0.85 + (1 - l.daylight) * 0.25 * (1 - l.night);
  return [rgba(mixc(night, mixc(c, b, 0.45), f)), rgba(mixc(night, mixc(b, [20, 34, 52], 0.55), f)), rgba(mixc(night, [16, 26, 40], f))];
}

// ---------- where things are ----------

/** How far the sky drifts with the camera (it is at infinity; a touch of drift keeps it alive). */
const PAR = 0.02;

/** A body's screen position: x from its azimuth relative to the view, y from its height over `horizon` (screen y). */
export function skyPos(v: View, b: Body, relDeg: number, horizon: number, top = 0) {
  const span = Math.max(40, horizon - top);
  return { x: v.viewW / 2 + (relDeg / FOV) * (v.viewW / 2) - v.cam * PAR, y: horizon - b.el * span * 0.86, in: Math.abs(relDeg) < FOV + 12 };
}

// ---------- the sky ----------

export interface SkyOpts {
  /** The horizon's screen y (the sky is drawn above it; the sun sets behind it). */
  horizon: number;
  /** Where the sky's top is (screen y; default 0). */
  top?: number;
  /** Stars (default true). */
  stars?: boolean;
  /** Fill below the horizon with the horizon's colour down to here (screen y; default: the view's bottom). */
  fillTo?: number;
  /**
   * `sunset`: the coast's sky (the title glide's, Tommi's reviewed look): a sunset gradient mixed from the light
   * (night, the golden hour, day), a big slatted sun sinking into the sea with its glow, twinkling stars, thin
   * clouds. Opt-in (scene `skyStyle`); the default is the city sky below.
   */
  style?: 'city' | 'sunset';
  /** Sunset style: how much of the sky is the city's (0 the open coast .. 1 over Downtown: redder, hazier, fewer stars). */
  town?: number;
}

const STARS = Array.from({ length: 90 }, (_, i) => [hash(i) * 2400, hash(i + 0.37), 0.3 + hash(i + 0.71) * 0.7]);

/** The whole sky over a scene (the light's facing): gradient, glow, stars, moon, sun. */
export function drawSky(x: CanvasRenderingContext2D, v: View, l: Light, o: SkyOpts) {
  if (o.style === 'sunset') { drawSunsetSky(x, v, l, o); return; }
  const hz = Math.round(o.horizon), top = o.top ?? 0, [a, b, c] = skyCols(l);
  const g = x.createLinearGradient(0, top, 0, hz);
  g.addColorStop(0, rgba(a)); g.addColorStop(0.62, rgba(b)); g.addColorStop(1, rgba(c));
  x.fillStyle = g; x.fillRect(0, top, v.viewW, hz - top);
  x.fillStyle = rgba(c); x.fillRect(0, hz, v.viewW, (o.fillTo ?? v.viewH) - hz);
  // the twilight glow toward the sun, low on the horizon (even when it is behind the view's edge or under the horizon)
  const tw = l.sun.el > -0.18 && l.sun.el < 0.35 ? (1 - smooth(0.05, 0.35, l.sun.el)) * smooth(-0.18, -0.04, l.sun.el) * (1 - l.cover * 0.8) : 0;
  if (tw > 0.02 && Math.abs(l.sunRel) < 120) {
    const p = skyPos(v, l.sun, clamp(l.sunRel, -FOV * 1.4, FOV * 1.4), hz, top), r = v.viewW * 0.7;
    const gl = x.createRadialGradient(p.x, hz, 0, p.x, hz, r);
    const col = l.morning ? '255,160,90' : '255,110,110';
    gl.addColorStop(0, 'rgba(' + col + ',' + (0.42 * tw * (1 - Math.abs(l.sunRel) / 140)).toFixed(3) + ')'); gl.addColorStop(1, 'rgba(' + col + ',0)');
    x.fillStyle = gl; x.fillRect(0, top, v.viewW, hz - top);
  }
  // stars
  const sa = (o.stars ?? true) ? l.night * (1 - l.cover) : 0;
  if (sa > 0.03) {
    for (const [sx0, fy, k] of STARS) {
      const sx = ((sx0 - v.cam * 0.05) % 2400 + 2400) % 2400;
      if (sx > v.viewW) continue;
      const sy = top + fy * (hz - top) * 0.8;
      x.fillStyle = 'rgba(255,230,210,' + (sa * k * 0.7).toFixed(2) + ')'; x.fillRect(R(sx), R(sy), 1, 1);
    }
  }
  drawMoon(x, v, l, hz, top);
  drawSun(x, v, l, hz, top);
}

/** The moon with its phase: by night bright, by day a pale ghost; cloud hides it. */
function drawMoon(x: CanvasRenderingContext2D, v: View, l: Light, hz: number, top: number) {
  const m = l.moon;
  if (!m.up || m.el < 0.02 || m.lit < 0.04) return;
  const p = skyPos(v, m, l.moonRel, hz, top);
  if (!p.in || p.y > hz - 4) return;
  const a = lerp(0.3, 1, l.night) * (1 - smooth(0.2, 0.85, l.cover));
  if (a < 0.03) return;
  const r = R(clamp((hz - top) / 30, 5, 9));
  if (l.night > 0.3) {
    const gl = x.createRadialGradient(p.x, p.y, r, p.x, p.y, r * 5);
    gl.addColorStop(0, 'rgba(200,210,240,' + (0.16 * a * m.lit * l.night).toFixed(3) + ')'); gl.addColorStop(1, 'rgba(200,210,240,0)');
    x.fillStyle = gl; x.fillRect(p.x - r * 5, p.y - r * 5, r * 10, r * 10);
  }
  moonDisc(x, p.x, p.y, r, m.phase, a, l.night);
}

/** A pixel moon of radius r: lit part by phase (waxing lit on the right), the dark part faint at night. */
export function moonDisc(x: CanvasRenderingContext2D, mx: number, my: number, r: number, ph: number, a: number, night = 1) {
  const cx = R(mx), cy = R(my);
  for (let yy = -r; yy <= r; yy++) {
    const half = Math.sqrt(Math.max(0, r * r - yy * yy)), term = Math.cos(ph * Math.PI * 2) * half;
    let l0: number, r0: number;
    if (ph <= 0.5) { l0 = term; r0 = half; } else { l0 = -half; r0 = -term; }
    if (night > 0.2) { x.fillStyle = 'rgba(40,30,60,' + (a * 0.55 * night).toFixed(2) + ')'; x.fillRect(R(cx - half), cy + yy, Math.max(1, R(half * 2)), 1); }
    if (r0 > l0) { x.fillStyle = 'rgba(236,232,216,' + a.toFixed(2) + ')'; x.fillRect(R(cx + l0), cy + yy, Math.max(1, R(r0 - l0)), 1); }
  }
}

/**
 * The sun, option A: near the horizon a big slatted retrowave disc (gold top, pink bottom, the
 * slats cut through its lower half, thicker toward the horizon); as it climbs the slats close and
 * it shrinks to a small pale disc in haze. Behind you: not drawn (its light still is).
 */
function drawSun(x: CanvasRenderingContext2D, v: View, l: Light, hz: number, top: number) {
  const s = l.sun;
  if (s.el < -0.06) return;
  const p = skyPos(v, s, l.sunRel, hz, top);
  if (!p.in) return;
  const vis = 1 - smooth(0.3, 0.92, l.cover);
  if (vis < 0.03) {
    // swallowed: only a brighter patch in the cloud
    if (l.cover < 0.98 && s.up) {
      const gl = x.createRadialGradient(p.x, p.y, 2, p.x, p.y, 60);
      gl.addColorStop(0, 'rgba(255,240,220,' + (0.1 * (1 - l.cover) * 3).toFixed(3) + ')'); gl.addColorStop(1, 'rgba(255,240,220,0)');
      x.fillStyle = gl; x.fillRect(p.x - 60, p.y - 60, 120, 120);
    }
    return;
  }
  const low = 1 - smooth(0.04, 0.3, s.el), scale = clamp((hz - top) / 150, 0.8, 1.5);
  const r = lerp(9, 27, low) * scale, cy = p.y;
  const glowC = mixc([255, 250, 230], [255, 150, 80], low);
  const gl = x.createRadialGradient(p.x, cy, r * 0.5, p.x, cy, r * 3.6);
  gl.addColorStop(0, rgba(glowC, (0.36 + low * 0.12) * vis)); gl.addColorStop(1, rgba(glowC, 0));
  x.fillStyle = gl; x.fillRect(p.x - r * 3.6, Math.max(top, cy - r * 3.6), r * 7.2, Math.min(hz, cy + r * 3.6) - Math.max(top, cy - r * 3.6));
  x.save();
  x.beginPath(); x.rect(0, top, v.viewW, hz - top); x.clip();
  x.globalAlpha = vis;
  const ct = mixc([255, 255, 240], [255, 227, 106], low), cm = mixc([255, 250, 225], [255, 162, 58], low), cb = mixc([255, 240, 214], [255, 90, 122], low);
  const sg = x.createLinearGradient(0, cy - r, 0, cy + r);
  sg.addColorStop(0, rgba(ct)); sg.addColorStop(0.5, rgba(cm)); sg.addColorStop(1, rgba(cb));
  x.fillStyle = sg; x.beginPath(); x.arc(p.x, cy, r, 0, Math.PI * 2); x.fill();
  // the slats: lower half, thicker toward the bottom, closing as it climbs
  if (low > 0.03) {
    const [, b2, c2] = skyCols(l), gap = mixc(c2, b2, 0.3);
    x.fillStyle = rgba(gap, clamp(low * 1.2, 0, 1));
    for (let k = 0; k < 6; k++) {
      const yy = R(cy + r * (0.02 + k * 0.16)), hh = Math.max(1, R((1 + k * 0.6) * low * scale));
      const half = Math.sqrt(Math.max(0, r * r - (yy - cy) ** 2));
      if (half >= 1) x.fillRect(R(p.x - half), yy, R(half * 2), hh);
    }
  }
  x.restore();
}

// ---------- water ----------

/**
 * The sun's path on water between `top` (the horizon, screen y) and `bot`: glitter under the sun's
 * screen x, widening toward you, strongest when it is low. At night the moon's, paler. Nothing
 * when it is behind you or swallowed by cloud.
 */
export function sunPath(x: CanvasRenderingContext2D, v: View, l: Light, top: number, bot: number) {
  const h = bot - top;
  if (h < 4) return;
  const sun = l.sun.up && l.direct > 0.05, body = sun ? l.sun : l.moon, relD = sun ? l.sunRel : l.moonRel;
  if (!sun && (!l.moon.up || l.night < 0.4 || l.moon.lit < 0.2)) return;
  const p = skyPos(v, body, relD, top);
  if (Math.abs(relD) > FOV + 20) return;
  const low = sun ? clamp(1 - body.el * 1.3, 0.2, 1) : 0.5;
  const str = (sun ? 0.6 * l.direct : 0.3 * l.moon.lit * l.night) * (1 - l.cover * 0.8) * low;
  if (str < 0.02) return;
  const col = sun ? l.sunCol : '220,226,245', t = Math.floor(v.t / 9);
  for (let yy = top + 1; yy < bot; yy += 2) {
    const f = (yy - top) / h, w = 6 + f * 54, k = hash(yy * 3 + t);
    if (k < 0.42) continue;
    x.fillStyle = 'rgba(' + col + ',' + (str * (1 - f * 0.6) * k).toFixed(3) + ')';
    x.fillRect(R(p.x - w / 2 + (k - 0.7) * w), yy, R(w * (0.2 + k * 0.3)), 1);
  }
}

// ---------- windows, from inside ----------

/** What a window looks at, for `drawPane`. */
export interface PaneOpts {
  /** The compass direction the window looks out to. */
  facing: number;
  /** A seed for its towers (the same every visit). */
  seed: number;
  /** Towers across the way (default true): [x, w, top] as fractions of the pane. */
  towers?: number[][] | false;
  /** The pane's horizon as a fraction of its height from the top (default 0.85). */
  horizon?: number;
}

/** The sky through a window at (l, t, w, h) in screen units, with towers whose windows follow the clock. */
export function drawPane(x: CanvasRenderingContext2D, l0: number, t0: number, w: number, h: number, lt: Light, o: PaneOpts) {
  const [a, b, c] = skyCols(lt), hz = t0 + h * (o.horizon ?? 0.85);
  x.save();
  x.beginPath(); x.rect(l0, t0, w, h); x.clip();
  const g = x.createLinearGradient(0, t0, 0, hz);
  g.addColorStop(0, rgba(a)); g.addColorStop(0.6, rgba(b)); g.addColorStop(1, rgba(c));
  x.fillStyle = g; x.fillRect(l0, t0, w, h);
  const sRel = rel(lt.sun.az, o.facing), mRel = rel(lt.moon.az, o.facing), span = 48;
  // stars
  if (lt.night * (1 - lt.cover) > 0.1) {
    for (let i = 0; i < 10; i++) { x.fillStyle = 'rgba(255,230,210,' + (lt.night * (1 - lt.cover) * (0.3 + hash(o.seed + i) * 0.5)).toFixed(2) + ')'; x.fillRect(R(l0 + hash(o.seed + i * 3) * w), R(t0 + hash(o.seed + i * 7) * (hz - t0) * 0.7), 1, 1); }
  }
  // the moon
  if (lt.moon.up && Math.abs(mRel) < span && lt.moon.lit > 0.05) {
    const a2 = lerp(0.3, 1, lt.night) * (1 - smooth(0.2, 0.85, lt.cover));
    if (a2 > 0.03) moonDisc(x, l0 + w / 2 + (mRel / span) * w / 2, hz - lt.moon.el * (hz - t0) * 1.3, Math.max(3, R(h / 16)), lt.moon.phase, a2, lt.night);
  }
  // the sun: its glow, and a small disc (slatted when low)
  if (lt.sun.el > -0.08 && Math.abs(sRel) < span + 10) {
    const vis = 1 - smooth(0.3, 0.92, lt.cover), sx = l0 + w / 2 + (sRel / span) * w / 2, sy = hz - lt.sun.el * (hz - t0) * 1.3;
    const low = 1 - smooth(0.04, 0.3, lt.sun.el), r = lerp(4, 9, low) * Math.max(1, h / 60);
    const gl = x.createRadialGradient(sx, sy, 1, sx, sy, r * 4);
    gl.addColorStop(0, 'rgba(' + lt.sunCol + ',' + (0.6 * vis + 0.05).toFixed(2) + ')'); gl.addColorStop(1, 'rgba(' + lt.sunCol + ',0)');
    x.fillStyle = gl; x.fillRect(sx - r * 4, sy - r * 4, r * 8, r * 8);
    if (vis > 0.05) {
      x.globalAlpha = vis;
      x.fillStyle = rgba(mixc([255, 250, 230], [255, 170, 80], low)); x.beginPath(); x.arc(sx, sy, r, 0, Math.PI * 2); x.fill();
      if (low > 0.1) { x.fillStyle = rgba(mixc(c, b, 0.3)); for (let k = 0; k < 3; k++) x.fillRect(R(sx - r), R(sy + r * (0.15 + k * 0.3)), R(r * 2), Math.max(1, R(low * (1 + k)))); }
      x.globalAlpha = 1;
    }
  }
  // towers across the way, their windows on the city's clock
  const T = o.towers === false ? [] : o.towers ?? [[0, 0.28, 0.2], [0.1, 0.12, 0.45], [0.55, 0.2, 0.15], [0.74, 0.26, 0.3], [0.9, 0.1, 0.05]];
  const tc = mixc([18, 10, 16], mixc(b, [60, 58, 66], 0.6), lt.daylight * 0.6);
  for (const [fx, fw, fh] of T) {
    const tx = R(l0 + fx * w), tw = R(fw * w), ty = R(t0 + fh * h);
    x.fillStyle = rgba(tc); x.fillRect(tx, ty, tw, t0 + h - ty);
    for (let yy = ty + 4, j = 0; yy < t0 + h - 3; yy += 5) for (let xx = tx + 2; xx < tx + tw - 2; xx += 4, j++) {
      const sd = o.seed * 977 + fx * 1000 + j;
      if (hash(sd) < 0.3 && windowLit(sd, lt)) { x.fillStyle = 'rgba(255,170,90,' + (0.25 + 0.3 * lt.night).toFixed(2) + ')'; x.fillRect(xx, yy, 1, 2); }
    }
  }
  // weather on the glass: a grey veil under cloud and fog
  if (lt.cover > 0.05) { x.fillStyle = 'rgba(' + mixc([30, 26, 34], [150, 150, 158], lt.daylight).join(',') + ',' + (0.28 * lt.cover).toFixed(3) + ')'; x.fillRect(l0, t0, w, h); }
  x.restore();
}

/**
 * The sun through a window into a room. The window is `win` (screen units: left, right, top,
 * bottom), the floor line `floor` (screen y) and its near edge `near`. The window looks out to
 * `facing`. Returns false when no sun comes in (night, the sun on the other side, overcast).
 * By day without direct sun, a soft daylight glow round the window instead.
 */
export function windowShaft(x: CanvasRenderingContext2D, win: { l: number; r: number; t: number; b: number }, floor: number, near: number, lt: Light, facing: number, opts: { dust?: boolean; t?: number } = {}): boolean {
  const sRel = rel(lt.sun.az, facing), cx = (win.l + win.r) / 2, w = win.r - win.l;
  // the daylight from the window: a glow on the wall and the floor
  const day = lt.daylight * (1 - lt.cover * 0.5);
  if (day > 0.03) {
    const [cs] = glass(lt), gl = x.createRadialGradient(cx, (win.t + win.b) / 2, w * 0.3, cx, (win.t + win.b) / 2, w * 1.6);
    gl.addColorStop(0, 'rgba(' + cs + ',' + (0.12 * day).toFixed(3) + ')'); gl.addColorStop(1, 'rgba(' + cs + ',0)');
    x.fillStyle = gl; x.fillRect(cx - w * 1.6, win.t - w, w * 3.2, near - win.t + w);
  }
  const k = lt.direct * smooth(90, 60, Math.abs(sRel));
  if (k < 0.04) return false;
  // the shaft goes away from the sun: sideways by its azimuth, steeper the higher it is
  const ang = Math.max(0.12, lt.sun.el * 1.2), drop = floor - win.b, slope = Math.min(2.4, 1 / Math.tan(ang));
  const side = -Math.sin((sRel * Math.PI) / 180), off = side * slope * (drop + (win.b - win.t) * 0.5) * 0.6;
  const a = 0.2 * k, col = lt.sunCol;
  const g = x.createLinearGradient(0, win.t, 0, floor);
  g.addColorStop(0, 'rgba(' + col + ',' + (a * 0.8).toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + col + ',' + (a * 0.35).toFixed(3) + ')');
  x.fillStyle = g;
  x.beginPath(); x.moveTo(win.l, win.b); x.lineTo(win.r, win.b); x.lineTo(win.r + off, floor); x.lineTo(win.l + off, floor); x.closePath(); x.fill();
  // the patch on the floor, longer toward you when the sun is low
  const reach = Math.min(near - floor, 4 + (near - floor) * (1 - smooth(0.1, 0.6, lt.sun.el)));
  x.fillStyle = 'rgba(' + col + ',' + (a * 1.6).toFixed(3) + ')'; x.fillRect(R(win.l + off), floor - 1, R(w), 2);
  x.fillStyle = 'rgba(' + col + ',' + (a * 0.7).toFixed(3) + ')';
  x.beginPath(); x.moveTo(win.l + off, floor + 1); x.lineTo(win.r + off, floor + 1); x.lineTo(win.r + off * 1.3, floor + reach); x.lineTo(win.l + off * 1.3, floor + reach); x.closePath(); x.fill();
  if (opts.dust && opts.t !== undefined) {
    for (let i = 0; i < 6; i++) {
      const f = ((opts.t * 0.003 + hash(i)) % 1), dx = win.l + w * (0.2 + 0.6 * hash(i + 4)) + off * f + Math.sin(opts.t * 0.02 + i) * 3;
      x.fillStyle = 'rgba(255,235,200,' + (0.5 * k).toFixed(2) + ')'; x.fillRect(R(dx), R(win.b + (floor - win.b) * f), 1, 1);
    }
  }
  return true;
}
