/** Original port sky, horizon and water shared by both harbor scenes. */
import { drawTowers, towers, rng, O, RED, GREEN } from '../core/primitives';
import type { View } from '../core/view';
import { seaCols, sunPath } from './sky';


/** The horizon: water from the pier's back edge up to here. */
export const HZ = 84;

/** The tall towers of the far city, further off still, behind the low skyline. */
const SPIRES = towers(45, 2200, [12, 30], [60, 190], 0.05);

/** Cloud banks lit from below by the city: [x, width, height offset, thickness], laid out once. */
const CLOUDS = (() => { const r = rng(47); return Array.from({ length: 40 }, () => [r() * 2400, 120 + r() * 260, r() * 30, 6 + r() * 10]); })();

const ripples: [number, number, number][] = (() => { const r = rng(43); return Array.from({ length: 110 }, () => [r() * 2000, 4 + r() * (HZ - 8), 4 + r() * 14]); })();

/** Ships on the horizon: [x, length, height of the stacks], far band. */
const SHIPS = [[300, 230, 16], [1150, 300, 20], [1900, 180, 12]];


// ---------- drawing ----------

/**
 * The sky over the water, so a tall screen sees more night rather than a dead band:
 * the far city's spires with their warning lights, and banks of cloud lit orange
 * from below by the city, dimmer the higher they are. Far band only.
 */
export function drawSkyDepth(x: CanvasRenderingContext2D, v: View) {
  const { y, t } = v, top = v.gy;
  drawTowers(x, v, SPIRES, 0.06, y(HZ), 0.06, '#020100', 1);
  for (const b of SPIRES) {
    if (b.h < 150) continue;
    const s = v.sx(b.x, 0.06) + Math.floor(b.w / 2);
    if (s < 0 || s > v.viewW) continue;
    x.fillStyle = 'rgba(' + RED + ',' + (Math.sin(t * 0.03 + b.x) > 0.3 ? 0.55 : 0.12) + ')'; x.fillRect(s - 1, y(HZ + b.h) - 2, 2, 2);
  }
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


/** Ships riding at anchor on the horizon and the far terminal's cranes: dim, still, far band. */
export function drawHorizon(x: CanvasRenderingContext2D, v: View) {
  const { y, t } = v, base = y(HZ);
  // the far container terminal's cranes, a row of dim A-frames
  x.strokeStyle = 'rgba(194,65,12,.16)'; x.beginPath();
  for (let wx = 120; wx < 2600; wx += 210) {
    const s = v.sx(wx, 0.14);
    if (s < -40 || s > v.viewW + 40) continue;
    x.moveTo(s, base); x.lineTo(s, base - 34); x.moveTo(s + 16, base); x.lineTo(s + 16, base - 34);
    x.moveTo(s - 20, base - 30); x.lineTo(s + 40, base - 30); x.moveTo(s + 8, base - 44); x.lineTo(s - 20, base - 30); x.moveTo(s + 8, base - 44); x.lineTo(s + 40, base - 30);
  }
  x.stroke();
  for (const [sx0, len, sh] of SHIPS) {
    const s = v.sx(sx0, 0.1);
    if (s > v.viewW || s + len < 0) continue;
    x.fillStyle = '#040302';
    x.beginPath(); x.moveTo(s, base - 9); x.lineTo(s + len, base - 9); x.lineTo(s + len - 10, base); x.lineTo(s + 6, base); x.closePath(); x.fill();
    for (let k = 14; k < len - 40; k += 9) x.fillRect(s + k, base - 9 - sh + ((k * 7) % 5), 8, sh - ((k * 7) % 5));
    x.fillRect(s + len - 34, base - 9 - sh - 12, 16, sh + 12);
    x.strokeStyle = 'rgba(194,65,12,.18)'; x.strokeRect(s + 0.5, base - 9.5, len, 1);
    x.fillStyle = 'rgba(255,217,165,.35)'; x.fillRect(s + len - 30, base - 9 - sh - 8, 2, 1); x.fillRect(s + len - 24, base - 9 - sh - 8, 2, 1);
    x.fillStyle = Math.sin(t * 0.03 + sx0) > 0.4 ? 'rgba(' + RED + ',.7)' : 'rgba(' + RED + ',.15)'; x.fillRect(s + len - 26, base - 9 - sh - 16, 2, 2);
    x.fillStyle = 'rgba(' + GREEN + ',.45)'; x.fillRect(s + 2, base - 11, 2, 2);
  }
}


/** The water: dark, with slow ripples further off and a swell that runs under the lights. */
export function drawWater(x: CanvasRenderingContext2D, v: View) {
  const { y, t, gy } = v;
  // the water takes the sky of the moment (black at night, as it always was), and the sun's path lies on it
  const L = v.lighting, [c0, c1, c2] = seaCols(L), wg = x.createLinearGradient(0, y(HZ), 0, gy);
  wg.addColorStop(0, c0); wg.addColorStop(0.35, c1); wg.addColorStop(1, c2);
  x.fillStyle = wg; x.fillRect(0, y(HZ), v.viewW, gy - y(HZ));
  sunPath(x, v, L, y(HZ), gy);
  x.fillStyle = 'rgba(' + O + ',.12)'; x.fillRect(0, y(HZ), v.viewW, 1);
  const span = v.viewW + 40;
  for (const [rx, rh, len] of ripples) {
    const p = 0.12 + 0.5 * (1 - rh / HZ), sw = Math.sin(t * 0.02 + rx) * 3;
    const px = (((rx - v.cam * p + t * 0.08) % span) + span) % span - 20;
    x.fillStyle = 'rgba(170,210,255,' + (0.04 + 0.07 * (1 - rh / HZ)) + ')';
    x.fillRect(Math.round(px + sw), y(rh), Math.round(len * (0.8 + 0.3 * Math.sin(t * 0.03 + rh))), 1);
  }
  // the city's glow lying on the water near the horizon
  for (let i = 0; i < 4; i++) { x.fillStyle = 'rgba(194,65,12,' + (0.05 - i * 0.01) + ')'; x.fillRect(0, y(HZ - 2 - i * 3), v.viewW, 1); }
}


/** Shared water and distant port for the working harbor and the shift prototype. */
export function drawHarborDistance(x: CanvasRenderingContext2D, v: View) {
  drawSkyDepth(x, v);
  drawHorizon(x, v);
  drawWater(x, v);
}