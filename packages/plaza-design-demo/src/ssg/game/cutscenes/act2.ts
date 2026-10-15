/**
 * The ACT II card: the end of Act I. The bay at night from the stacks' quay:
 * NIGHT FERRY 7 pulling out with Moth in its last box, the Spire standing in
 * the water with the Registry's antenna blinking on top, and the act's title
 * set over it: ACT I · WHERE IS MOTH? FOUND. → ACT II · SEVEN FRAGMENTS.
 * The words under it are cutscenes.json's cards.
 */

import { drawSpire } from '../sets/spire';
import { placed } from '../sets/view';
import type { CutView } from './types';

const PAPER = '255,217,165', ORANGE = '255,136,0', RED = '255,42,68', GREEN = '34,197,94';
const rng = (seed: number) => { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };
const RIPPLES = (() => { const r = rng(5); return Array.from({ length: 120 }, () => [r(), r(), 0.3 + r()]); })();
const CITY = (() => { const r = rng(9); return Array.from({ length: 40 }, () => [r(), 0.04 + r() * 0.12, 0.015 + r() * 0.03]); })();

/** Fade in from `a` over `d` seconds. */
const fade = (t: number, a: number, d = 0.8) => Math.max(0, Math.min(1, (t - a) / d));

export function drawAct2(x: CanvasRenderingContext2D, v: CutView, t: number, duration: number) {
  const W = v.viewW, H = v.viewH, top = v.barTop, bottom = H - v.barBottom, hz = Math.round(top + (bottom - top) * 0.62);
  const a = v.reduced ? 6 : t;
  // sky, low orange from the city behind
  const sky = x.createLinearGradient(0, top, 0, hz);
  sky.addColorStop(0, '#02030a'); sky.addColorStop(1, '#170803');
  x.fillStyle = sky; x.fillRect(0, top, W, hz - top);
  // the far city low on the horizon, left
  for (const [cx, ch, cw] of CITY) {
    const px = cx * W * 0.7, bh = ch * (bottom - top), bw = cw * W;
    x.fillStyle = '#050201'; x.fillRect(Math.round(px), Math.round(hz - bh), Math.round(bw), Math.round(bh));
  }
  // the Spire: its foot in the bay, the deck, its towers, the antenna on the tallest
  const sx = Math.round(W * 0.74), unit = (hz - top) / 92;
  // the set piece (sets/spire.ts), scaled so its light sits about 81 units of sky up
  placed(x, sx, hz, (unit * 81) / 302, () => drawSpire(x, { t: a * 60, glow: true, windows: 1.6, edge: 0.18 }));
  // the water
  x.fillStyle = '#01040a'; x.fillRect(0, hz, W, bottom - hz);
  x.fillStyle = 'rgba(' + ORANGE + ',.12)'; x.fillRect(0, hz, W, 1);
  for (const [rx, ry, sp] of RIPPLES) {
    const py = hz + 2 + ry * (bottom - hz - 4), k = (py - hz) / (bottom - hz);
    const px = ((rx * W + a * 6 * sp * (0.3 + k)) % (W + 40)) - 20;
    x.fillStyle = 'rgba(170,210,255,' + (0.04 + 0.08 * k) + ')'; x.fillRect(Math.round(px), Math.round(py), Math.round(4 + 14 * k), 1);
  }
  for (let i = 0; i < 8; i++) { x.fillStyle = 'rgba(' + RED + ',' + 0.07 * (1 - i / 8) + ')'; x.fillRect(sx - 3 + Math.sin(a * 2 + i) * 2, hz + 3 + i * 5, 6, 1); }
  // NIGHT FERRY 7, pulling out across the bay towards open water, its lights on the water
  const u = Math.min(1, a / duration), fx = Math.round(W * (0.2 + 0.36 * u)), fy = Math.round(hz + (bottom - hz) * 0.28), fl = Math.max(26, Math.round(W * 0.07));
  x.fillStyle = '#0a0504'; x.beginPath(); x.moveTo(fx - fl, fy - 5); x.lineTo(fx + fl, fy - 5); x.lineTo(fx + fl - 5, fy); x.lineTo(fx - fl + 4, fy); x.closePath(); x.fill();
  x.fillRect(fx + fl * 0.4, fy - 13, fl * 0.5, 8);
  x.fillStyle = 'rgba(' + PAPER + ',.75)'; for (let i = -fl + 6; i < fl * 0.3; i += 7) x.fillRect(fx + i, fy - 9, 4, 3);
  x.fillStyle = '#c8c4b8'; x.fillRect(fx - fl * 0.15, fy - 12, fl * 0.45, 7);
  x.fillStyle = 'rgba(' + GREEN + ',.9)'; x.fillRect(fx + fl - 2, fy - 8, 2, 2);
  x.fillStyle = 'rgba(' + RED + ',.9)'; x.fillRect(fx - fl, fy - 8, 2, 2);
  for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(' + PAPER + ',' + (0.09 - i * 0.013) + ')'; x.fillRect(fx - fl * 0.8 + Math.sin(a * 2 + i) * 2, fy + 2 + i * 4, fl * 1.4, 1); }

  // the title, set over the picture: ACT I closes, ACT II opens
  x.save();
  x.textAlign = 'center'; x.textBaseline = 'middle';
  const small = Math.max(9, Math.round(H / 34)), big = Math.max(26, Math.round(H / 8));
  const ty = top + (hz - top) * 0.32;
  const one = fade(t, 0.8) * (1 - fade(t, 5.4, 0.7));
  if (one > 0) {
    x.globalAlpha = one;
    x.font = '600 ' + small + 'px "IBM Plex Mono", monospace';
    x.fillStyle = 'rgba(' + PAPER + ',.85)'; x.fillText('ACT I · WHERE IS MOTH?', W / 2, ty);
    const f = fade(t, 2.6, 0.4);
    if (f > 0) { x.globalAlpha = one * f; x.fillStyle = 'rgba(' + GREEN + ',.95)'; x.fillText('FOUND.', W / 2, ty + small * 1.6); }
  }
  const two = fade(t, 6, 1.2);
  if (two > 0) {
    x.globalAlpha = two;
    x.font = '700 ' + big + 'px "IBM Plex Mono", monospace';
    x.shadowColor = 'rgba(' + ORANGE + ',.8)'; x.shadowBlur = 14;
    x.fillStyle = 'rgba(' + ORANGE + ',.95)'; x.fillText('ACT II', W / 2, ty);
    x.shadowBlur = 0;
    const f = fade(t, 7.6, 1);
    if (f > 0) { x.globalAlpha = two * f; x.font = '600 ' + small + 'px "IBM Plex Mono", monospace'; x.fillStyle = 'rgba(' + PAPER + ',.9)'; x.fillText('SEVEN FRAGMENTS', W / 2, ty + big * 0.75); }
  }
  x.restore();
}
