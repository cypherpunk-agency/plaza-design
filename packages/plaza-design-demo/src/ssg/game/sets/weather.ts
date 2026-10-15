/**
 * Set piece (ART-GUIDE §12): the weather, drawn over any outdoor scene from its levels
 * (weather.ts `Weather`: cloud, rain, storm, fog, smog, heat, wet, wind; 0..1, already faded
 * between forecast blocks). Register: sets/index.ts (`weather`).
 *
 * Three layers, so the weather sits in the scene rather than on the glass:
 * - `weatherSky`: behind the scene, over the engine's stars (scenes with `ambient.sky`): the cloud
 *   deck, and lightning bolts in a storm.
 * - `weatherMid`: over the scene's backdrop, under the people: puddles that hold the neon (`puddles`),
 *   the smog's brown haze, fog banks drifting at three heights.
 * - `weatherFront`: in front of everything: rain (slanted by the wind, splashes, rings in the
 *   puddles), a low fog wisp at your feet, heat shimmer over the ground, a storm's flash.
 *
 * Reduced motion (`still`): no lightning or flashes, half the rain, falling slowly; no shimmer (only
 * the warm tint). Draws on a scene `View` (screen units of the view; `gy` the ground).
 */

import type { View } from '../scenes/kit';
import type { Weather } from '../weather';

export interface WeatherLook {
  w: Weather;
  /** Animation clock (frames). With reduced motion the game passes a slow one. */
  t: number;
  /** Reduced motion: calm rain, no flashes, no shimmer. */
  still?: boolean;
  /** Roofs it doesn't rain under, in screen units: x from, x to, the underside's y. */
  covers?: [number, number, number][];
}

const rnd = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/** Rain drops: x and y in a 2000 × 600 tile, depth (0 far … 1 near), a seed. */
const DROPS: [number, number, number, number][] = Array.from({ length: 330 }, (_, i) => [rnd(i) * 2000, rnd(i + 0.5) * 600, 0.4 + rnd(i + 0.25) * 0.6, rnd(i + 0.75)]);

/** The lightning now: a flash's age (frames, -1 none) and where its bolt strikes (0..1 across the view). */
function lightning(o: WeatherLook): { age: number; at: number; seed: number } {
  if (o.still || o.w.storm < 0.4) return { age: -1, at: 0, seed: 0 };
  const P = 260, slot = Math.floor(o.t / P);
  if (rnd(slot * 1.31) > 0.6 * o.w.storm) return { age: -1, at: 0, seed: 0 };
  const start = slot * P + rnd(slot * 2.7) * 140, age = o.t - start;
  return { age: age >= 0 && age < 16 ? age : -1, at: 0.1 + rnd(slot * 3.3) * 0.8, seed: slot };
}

/** Behind the scene: the cloud deck over the stars, and a storm's bolts. */
export function weatherSky(x: CanvasRenderingContext2D, v: View, o: WeatherLook) {
  const w = o.w, top = v.gy;
  if (w.cloud > 0.02) {
    const g = x.createLinearGradient(0, 0, 0, top);
    g.addColorStop(0, 'rgba(14,12,20,' + 0.75 * w.cloud + ')');
    g.addColorStop(0.7, 'rgba(26,18,26,' + 0.45 * w.cloud + ')');
    g.addColorStop(1, 'rgba(60,34,30,' + 0.2 * w.cloud + ')');
    x.fillStyle = g; x.fillRect(0, 0, v.viewW, top);
    // the deck's underside, lit orange by the city below, drifting with the wind
    const drift = o.t * (0.04 + 0.25 * w.wind);
    for (let i = 0; i < 9; i++) {
      const span = v.viewW + 400, cx = ((rnd(i) * span + drift * (0.6 + rnd(i + 9) * 0.6) - v.cam * 0.04) % span + span) % span - 200;
      const cy = top * (0.1 + rnd(i + 3) * 0.45), rx = 90 + rnd(i + 5) * 120, ry = 14 + rnd(i + 7) * 16;
      x.save(); x.translate(cx, cy); x.scale(1, ry / rx);
      const b = x.createRadialGradient(0, 0, 0, 0, 0, rx);
      b.addColorStop(0, 'rgba(70,46,52,' + 0.3 * w.cloud + ')'); b.addColorStop(1, 'rgba(70,46,52,0)');
      x.fillStyle = b; x.fillRect(-rx, -rx, rx * 2, rx * 2);
      x.restore();
    }
  }
  const L = lightning(o);
  if (L.age >= 0 && L.age < 9) {
    const a = L.age < 3 ? 0.95 : L.age < 5 ? 0.2 : 0.7 * (1 - (L.age - 5) / 4);
    // the cloud lights up round the strike, then the bolt: a jagged line with a fork
    const bx = v.viewW * L.at, g = x.createRadialGradient(bx, top * 0.15, 4, bx, top * 0.15, top * 0.7);
    g.addColorStop(0, 'rgba(200,210,255,' + 0.35 * a + ')'); g.addColorStop(1, 'rgba(200,210,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, v.viewW, top);
    x.strokeStyle = 'rgba(235,240,255,' + a + ')'; x.lineWidth = 1.5;
    x.beginPath();
    let px = bx, py = 0;
    x.moveTo(px, py);
    const end = top * (0.55 + rnd(L.seed + 4) * 0.25);
    for (let i = 1; py < end; i++) {
      px += (rnd(L.seed * 7 + i) - 0.5) * 22; py += 8 + rnd(L.seed * 5 + i) * 14;
      x.lineTo(px, py);
      if (i === 3) { x.moveTo(px, py); x.lineTo(px + 18, py + 26); x.lineTo(px + 26, py + 40); x.moveTo(px, py); }
    }
    x.stroke(); x.lineWidth = 1;
  }
}

/** Puddles along a scene's floor, seeded per scene: where the neon and the sky land. */
export interface PuddleSpec {
  /** The scene's width (world units) and a seed (the same puddles every visit). */
  width: number;
  seed: number;
  /** Lights over the floor whose colour the puddles under them hold: world x, an rgb triple. */
  lights?: [number, string][];
}
const PUDDLE_COLS = ['0,255,255', '255,136,0', '255,90,110', '255,217,165'];
const puddleCache = new Map<string, { x: number; w: number; d: number; col: string }[]>();
function puddlesOf(p: PuddleSpec) {
  const key = p.seed + ':' + p.width;
  let list = puddleCache.get(key);
  if (!list) {
    list = [];
    for (let wx = 20 + rnd(p.seed) * 80, i = 0; wx < p.width - 20; i++) {
      const w = 18 + rnd(p.seed + i * 1.7) * 46;
      list.push({ x: wx, w, d: 3 + rnd(p.seed + i * 2.9) * 22, col: PUDDLE_COLS[Math.floor(rnd(p.seed + i * 4.1) * PUDDLE_COLS.length)] });
      wx += w + 50 + rnd(p.seed + i * 3.3) * 160;
    }
    puddleCache.set(key, list);
  }
  return list;
}

/** Puddles on the near floor (under `gy`), as wet as the ground is; rain rings in them. */
export function puddles(x: CanvasRenderingContext2D, v: View, o: WeatherLook, p: PuddleSpec) {
  const w = o.w;
  if (w.wet < 0.05) return;
  const floor = v.viewH - v.gy;
  if (floor < 8) return;
  for (const q of puddlesOf(p)) {
    const sx = v.sx(q.x), y = v.gy + Math.min(floor - 3, q.d);
    if (sx + q.w < -4 || sx > v.viewW + 4) continue;
    const near = p.lights?.find(([lx]) => Math.abs(lx - (q.x + q.w / 2)) < q.w / 2 + 40);
    const col = near ? near[1] : q.col, a = w.wet * (near ? 1 : 0.6);
    const h = Math.max(2, q.w * 0.12);
    x.fillStyle = 'rgba(0,0,0,' + 0.3 * a + ')';
    x.beginPath(); x.ellipse(sx + q.w / 2, y, q.w / 2, h, 0, 0, Math.PI * 2); x.fill();
    // the light lying in it, a sheen that wobbles with the wind
    const wob = Math.sin(o.t * 0.05 + q.x) * (0.5 + w.wind * 1.5);
    x.fillStyle = 'rgba(' + col + ',' + 0.26 * a + ')';
    x.fillRect(Math.round(sx + q.w * 0.2 + wob), Math.round(y - 1), Math.round(q.w * 0.6), 1);
    x.fillStyle = 'rgba(' + col + ',' + 0.12 * a + ')';
    x.fillRect(Math.round(sx + q.w * 0.3 - wob), Math.round(y + 1), Math.round(q.w * 0.4), 1);
    if (w.rain > 0.1) {
      // rings where drops land
      for (let k = 0; k < 2; k++) {
        const ph = ((o.t * 0.025 + rnd(q.x + k) * 7) % 1), rx = sx + q.w * (0.2 + 0.6 * rnd(q.x * 3 + k + Math.floor(o.t * 0.025 + rnd(q.x + k) * 7)));
        x.strokeStyle = 'rgba(200,225,255,' + 0.3 * w.rain * (1 - ph) + ')';
        x.beginPath(); x.ellipse(rx, y, 1 + ph * 6, 0.5 + ph * 1.4, 0, 0, Math.PI * 2); x.stroke();
      }
    }
  }
}

/** Over the backdrop, under the people: the smog's haze and the fog banks. */
export function weatherMid(x: CanvasRenderingContext2D, v: View, o: WeatherLook) {
  const w = o.w;
  if (w.smog > 0.02) {
    const g = x.createLinearGradient(0, 0, 0, v.viewH);
    g.addColorStop(0, 'rgba(120,92,36,' + 0.34 * w.smog + ')');
    g.addColorStop(0.6, 'rgba(100,76,30,' + 0.2 * w.smog + ')');
    g.addColorStop(1, 'rgba(60,44,20,' + 0.08 * w.smog + ')');
    x.fillStyle = g; x.fillRect(0, 0, v.viewW, v.viewH);
  }
  if (w.fog > 0.02) {
    // a veil over the distance, thickest a little above the ground
    const g = x.createLinearGradient(0, 0, 0, v.gy + 10);
    g.addColorStop(0, 'rgba(130,135,150,' + 0.18 * w.fog + ')');
    g.addColorStop(0.75, 'rgba(150,150,165,' + 0.42 * w.fog + ')');
    g.addColorStop(1, 'rgba(150,150,165,' + 0.12 * w.fog + ')');
    x.fillStyle = g; x.fillRect(0, 0, v.viewW, v.gy + 10);
    fogBanks(x, v, o, [24, 70, 130], 0.42 * w.fog);
  }
}

/** Soft banks of fog drifting sideways at these heights (world units over the ground). */
function fogBanks(x: CanvasRenderingContext2D, v: View, o: WeatherLook, heights: number[], alpha: number) {
  const span = v.viewW + 480;
  heights.forEach((h, j) => {
    for (let i = 0; i < 4; i++) {
      const n = j * 10 + i, speed = 0.08 + rnd(n + 1) * 0.12;
      const cx = ((rnd(n) * span + o.t * speed - v.cam * (0.3 + j * 0.2)) % span + span) % span - 240;
      const cy = v.y(h + rnd(n + 2) * 16), rx = 120 + rnd(n + 3) * 110, ry = 12 + rnd(n + 4) * 12;
      x.save(); x.translate(cx, cy); x.scale(1, ry / rx);
      const b = x.createRadialGradient(0, 0, 0, 0, 0, rx);
      b.addColorStop(0, 'rgba(170,172,186,' + alpha + ')'); b.addColorStop(1, 'rgba(170,172,186,0)');
      x.fillStyle = b; x.fillRect(-rx, -rx, rx * 2, rx * 2);
      x.restore();
    }
  });
}

/** In front of everything: rain, a low fog wisp, heat shimmer, a storm's flash. */
export function weatherFront(x: CanvasRenderingContext2D, v: View, o: WeatherLook) {
  const w = o.w;
  if (w.fog > 0.02) {
    const g = x.createLinearGradient(0, v.y(30), 0, v.viewH);
    g.addColorStop(0, 'rgba(160,162,176,0)'); g.addColorStop(0.5, 'rgba(160,162,176,' + 0.14 * w.fog + ')'); g.addColorStop(1, 'rgba(160,162,176,' + 0.06 * w.fog + ')');
    x.fillStyle = g; x.fillRect(0, v.y(30), v.viewW, v.viewH - v.y(30));
    fogBanks(x, v, o, [4], 0.14 * w.fog);
  }
  if (w.heat > 0.02) heat(x, v, o);
  if (w.rain > 0.02) rain(x, v, o);
  const L = lightning(o);
  if (L.age >= 0 && L.age < 9) {
    const a = L.age < 2 ? 0.2 : L.age < 4 ? 0 : L.age < 6 ? 0.1 : 0.03;
    if (a) { x.fillStyle = 'rgba(205,215,255,' + a * w.storm + ')'; x.fillRect(0, 0, v.viewW, v.viewH); }
  }
}

/** Rain: streaks slanted by the wind, more and harder with the level; splashes on the ground. */
function rain(x: CanvasRenderingContext2D, v: View, o: WeatherLook) {
  const w = o.w, still = !!o.still, t = o.t;
  const wind = (0.15 + 0.4 * w.wind + 0.12 * Math.sin(t * 0.004)) * (still ? 0.6 : 1);
  const n = Math.floor(DROPS.length * Math.min(1, w.rain * (0.75 + 0.25 * w.storm)) * (still ? 0.5 : 1));
  const H = v.viewH + 40, W = v.viewW;
  for (let i = 0; i < n; i++) {
    const [dx, dy, depth, seed] = DROPS[i];
    const fall = (2.5 + depth * 4.5) * (1 + 0.4 * w.storm), len = (4 + depth * 8) * (still ? 0.7 : 1);
    const yy = ((dy + t * fall) % H + H) % H - 20;
    const xx = ((dx - t * fall * wind - v.cam * depth * 0.6) % W + W) % W;
    if (o.covers && yy > -20 && o.covers.some(([a, b, under]) => xx >= a && xx <= b && yy + len > under)) continue;
    x.strokeStyle = 'rgba(170,210,255,' + (0.08 + depth * 0.22) + ')';
    x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx - len * wind, yy + len); x.stroke();
    // a splash where a near drop meets the street
    if (depth > 0.75 && yy > v.gy - 6 && yy < v.gy + 2) {
      x.fillStyle = 'rgba(200,230,255,.35)'; x.fillRect(xx - 2, v.gy - 1, 1, 1); x.fillRect(xx + 2, v.gy - 2, 1, 1);
    }
    if (depth > 0.8 && seed < 0.15 && v.viewH - v.gy > 14) {
      const ph = (t * 0.02 + seed * 50) % 1;
      x.strokeStyle = 'rgba(255,136,0,' + 0.25 * (1 - ph) + ')';
      x.beginPath(); x.ellipse((dx * 1.7) % W, v.gy + 8 + (seed * 200) % (v.viewH - v.gy - 12), ph * 10, ph * 2, 0, 0, 7); x.stroke();
    }
  }
}

/** Heat: a warm tint low down and the air over the ground wobbling (strips of the frame shifted sideways). */
function heat(x: CanvasRenderingContext2D, v: View, o: WeatherLook) {
  const w = o.w, top = v.y(80);
  const g = x.createLinearGradient(0, top, 0, v.gy);
  g.addColorStop(0, 'rgba(255,170,90,0)'); g.addColorStop(1, 'rgba(255,170,90,' + 0.1 * w.heat + ')');
  x.fillStyle = g; x.fillRect(0, top, v.viewW, v.gy - top);
  if (o.still) return;
  const c = x.canvas, m = x.getTransform(), y0 = Math.max(0, Math.round(m.d * top + m.f)), y1 = Math.min(c.height, Math.round(m.d * v.gy + m.f));
  const strip = Math.max(2, Math.round(m.d * 2)), amp = 1.2 * w.heat * m.a;
  x.save(); x.setTransform(1, 0, 0, 1, 0, 0);
  for (let yy = y0; yy < y1; yy += strip) {
    const k = (yy - y0) / Math.max(1, y1 - y0), off = Math.round(Math.sin(o.t * 0.09 + yy * 0.21) * amp * k);
    if (off) x.drawImage(c, 0, yy, c.width, strip, off, yy, c.width, strip);
  }
  x.restore();
}
