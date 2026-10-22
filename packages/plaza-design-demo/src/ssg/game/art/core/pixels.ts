/**
 * Coarse-pixel artwork through the shared View. Some kit pieces (the coast and shore kit, the far shore, the
 * sunset sky, the city's through-blocks: the title glide's hand-drawn panorama) are drawn in pixels of `ART`
 * world units, three to a world pixel at the player's scale, so a 1-pixel rail is 3 units thick wherever it
 * stands. The piece still draws through the frame's View: `sx`/`y` are the View's, divided by `ART`, and the
 * canvas is scaled by `ART` while it draws. Nothing here is a projection of its own.
 *
 * A piece places itself by its placement (world coordinates, `Element.coordinates: 'world'`): `ax`/`ay` are its
 * anchor on screen in these pixels, `u(dx)` a point `dx` pixels east of it. Placed facing -1 the composition
 * mirrors the canvas about the anchor; `onScreen` and the readable text context (`x`) account for it.
 */
import type { Placement } from './composition';
import type { View } from './view';
import type { Light } from '../../world/light';
import { readableMirror } from './mirror';

/** World units in one of the panorama's pixels (the player is 48 units, 16 pixels). */
export const ART = 3;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const smooth = (a: number, b: number, v: number) => { const f = clamp01((v - a) / (b - a)); return f * f * (3 - 2 * f); };
export const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
export const R = Math.round;
export const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const hex = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
/** Two #rrggbb colours mixed, as #rrggbb (so a mix can be mixed again). */
export const mixHex = (a: string, b: string, f: number) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => R(lerp(v, B[i], f)).toString(16).padStart(2, '0')).join(''); };

/** How warm the light is (1: sun up or just down, 0.35 deep dusk): the coast's tints follow it. */
export const warmth = (l: Light) => lerp(0.35, 1, smooth(-0.17, 0, l.sun.el));

/**
 * The shore's depth lines, in world units over the ground line (h 0, the back edge of the near strip): where a
 * thing stands on the strip between the ground line and the camera. The beach's sand, the pier's deck (above the
 * water), the road's two lanes, the pavement.
 */
export const SHORE = { back: -12, mid: -51, beach: -69, pier: 51, road0: -66, road1: -111, farLane: -87, nearLane: -111, shallows: -12, rocks: -6, bridge: -45, terrace: 162 } as const;
export type ShoreLine = keyof typeof SHORE;
export const SHORE_LINES = Object.keys(SHORE) as ShoreLine[];
/** The strip's own scale: the panorama's lines are 35 of these deep (`k` of the original strip). */
export const STRIP_K = 43 / 35;

export interface Pixels {
  /** The context to draw text on: it turns text back when the piece is placed facing -1. */
  x: CanvasRenderingContext2D;
  /** A world x to the screen, in pixels (`p`: a parallax other than the piece's). */
  sx: (wx: number, p?: number) => number;
  /** A height (world units over the ground line) to the screen, in pixels. */
  y: (h: number) => number;
  /** The anchor (the placement) on screen; `u(dx)` is `dx` pixels east of it. */
  ax: number; ay: number; u: (dx: number) => number;
  /** The view in pixels. */
  W: number; H: number;
  /** Frame clock (frames) and seconds; `still` holds what animates (reduced motion). */
  f: number; t: number; still: boolean;
  lighting: Light;
  /** The frame's own View (world units), for kit helpers that take one. */
  view: View;
  /** The light's warmth (see `warmth`). */
  warm: number;
  facing: 1 | -1;
  /** Is the pixel span s0..s1 (either order) within the view, give or take `pad`? Accounts for a mirrored placement. */
  onScreen: (s0: number, s1?: number, pad?: number) => boolean;
  /** The part of the view in this piece's pixels (left, right), unmirrored. */
  span: () => [number, number];
}

/** Draw `paint` in the panorama's pixels at a placement. */
export function inPixels(ctx: CanvasRenderingContext2D, view: View, at: Readonly<Required<Placement>>, paint: (p: Pixels) => void, still = false) {
  const p = at.parallax, ax = view.sx(at.x, p) / ART, ay = view.y(at.h) / ART, W = view.viewW / ART, H = view.viewH / ART, facing = at.facing;
  // mirrored about the anchor: a pixel s is drawn at 2·ax − s
  const shown = (s: number) => facing < 0 ? 2 * ax - s : s;
  const pix: Pixels = {
    x: facing < 0 ? readableMirror(ctx) : ctx,
    sx: (wx, q = p) => view.sx(wx, q) / ART, y: h => view.y(h) / ART, ax, ay, u: dx => ax + dx, W, H,
    f: view.t, t: view.t / 60, still, lighting: view.lighting, view, warm: warmth(view.lighting), facing,
    onScreen: (s0, s1 = s0, pad = 0) => { const a = shown(s0), b = shown(s1); return Math.max(a, b) >= -pad && Math.min(a, b) <= W + pad; },
    span: () => { const a = shown(0), b = shown(W); return [Math.min(a, b), Math.max(a, b)]; },
  };
  ctx.save(); ctx.scale(ART, ART);
  try { paint(pix); } finally { ctx.restore(); }
}
