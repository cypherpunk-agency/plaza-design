/**
 * The intro's picture: the skyline (../skyline.ts) as a scene with no one in it,
 * a slow pan across the city with the wet floor under the horizon and a shower
 * passing through the middle of it.
 */

import { Skyline } from '../skyline';
import type { CutView } from './types';

const city = new Skyline();
/** Time of the previous frame, to step the packets by real frames. */
let lastT = 0;

/** Draw the skyline at `t` seconds into a `duration`-second pan. */
export function drawSkyline(x: CanvasRenderingContext2D, v: CutView, t: number, duration: number) {
  const W = Math.ceil(v.viewW), H = Math.ceil(v.viewH), top = v.barTop;
  const horizon = Math.round(top + (H - top - v.barBottom) * 0.68), camMax = Math.round(W * 1.1);
  const still = v.reduced, a = still ? 240 : t * 60;
  // A slow pan, easing in and out; reduced motion holds the middle of it.
  const u = still ? 0.5 : Math.min(1, Math.max(0, t / duration));
  const cam = Math.round(camMax * (0.5 - 0.5 * Math.cos(Math.PI * u)));
  const k = Math.min(3, Math.max(0, (t - lastT) * 60));
  lastT = t;
  // A shower passes through the middle of the scene.
  const wet = still ? 0.35 : Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, (t - 3) / (duration - 5))))) ** 1.4;
  city.draw(x, { W, H, top, horizon, sunX: W * 0.6, camMax }, { cam, a, k, still, floor: true, rain: wet * 0.85 });
}
