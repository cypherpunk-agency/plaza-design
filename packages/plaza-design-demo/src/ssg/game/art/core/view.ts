/**
 * Drawing a set piece in its own frame. The scenes draw their sets in world units on their
 * camera; a cutscene (the opening glide) places one with a translate and a scale and draws
 * it in local units: x to the right, heights up from the foot (0), so `y(h) = -h`.
 */

export interface View {
  /** World x to screen x; `parallax` < 1 for things further away, > 1 for the foreground. */
  sx: (wx: number, parallax?: number) => number;
  /** Height above the ground to screen y. */
  y: (h: number) => number;
  t: number;
  viewW: number;
  viewH: number;
  cam: number;
  /** Screen y of the ground; the strip below it (about 54 units) is the near floor. */
  gy: number;
  /** The save's flags (read only), for doors that open later (e.g. `end`: Downtown cleared, the market gate is open). */
  flags: Readonly<Record<string, boolean>>;
}

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

/** Viewport and motion preference for cinematic artwork. */
export interface CutView {
  viewW: number;
  viewH: number;
  /** Height of the top and bottom letterbox bars: the picture lives between them. */
  barTop: number;
  barBottom: number;
  /** `prefers-reduced-motion`: hold the camera and the animation still (cards still play). */
  reduced: boolean;
}
