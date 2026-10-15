/**
 * Drawing a set piece in its own frame. The scenes draw their sets in world units on their
 * camera; a cutscene (the opening glide) places one with a translate and a scale and draws
 * it in local units: x to the right, heights up from the foot (0), so `y(h) = -h`.
 */

import type { View } from '../scenes/kit';

/** A `View` for drawing in a set piece's own frame (after `translate` to its foot): no camera, nothing culled. */
export function frameView(t: number): View {
  return { sx: (wx) => Math.round(wx), y: (h) => -h, t, viewW: 1e5, viewH: 1e5, cam: 0, gy: 0, flags: {} };
}

/** Run `draw` with the origin at (`sx`, `sy`) and everything scaled by `s`. */
export function placed(x: CanvasRenderingContext2D, sx: number, sy: number, s: number, draw: () => void) {
  x.save();
  x.translate(sx, sy);
  if (s !== 1) x.scale(s, s);
  draw();
  x.restore();
}
