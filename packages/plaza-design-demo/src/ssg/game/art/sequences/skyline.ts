/**
 * The intro's picture: the skyline (../skyline.ts) as a scene with no one in it,
 * a slow pan across the city with the wet floor under the horizon and a shower
 * passing through the middle of it. Each part is one registered piece
 * (`sequence.intro.*`, cinematics.ts) drawn by the one frame.
 */

import type { Skyline } from "../environment/skyline";
import type { CutView } from "../core/view";

/** The skyline at `t` seconds into a `duration`-second pan: its layout frame, draw inputs and parts. */
export interface IntroOptions { cameraX?: number; rain?: number; city:Skyline }
export function introLayout(v:CutView){
  const W = Math.ceil(v.viewW), H = Math.ceil(v.viewH), top = v.barTop;
  const horizon = Math.round(top + (H - top - v.barBottom) * 0.68), camMax = Math.round(W * 1.1);
  return { W, H, top, horizon, sunX: W * 0.6, camMax };
}
export function introFrame(x: CanvasRenderingContext2D, v: CutView, t: number, duration: number, options:IntroOptions) {
  const frame=introLayout(v),{camMax}=frame;
  const still = v.reduced, a = still ? 240 : t * 60;
  // A slow pan, easing in and out; reduced motion holds the middle of it.
  const u = still ? 0.5 : Math.min(1, Math.max(0, t / duration));
  const cam = options.cameraX ?? Math.round(camMax * (0.5 - 0.5 * Math.cos(Math.PI * u)));
  // A shower passes through the middle of the scene.
  const wet = still ? 0.35 : Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, (t - 3) / (duration - 5))))) ** 1.4;
  const draw = { cam, a, still, floor: true, rain: options.rain ?? wet * 0.85 };
  return { parts: options.city.parts(x, frame, draw), frame, draw };
}
/** One part of the intro at the camera's pan `cameraX` (its rain only for the `rain` part). */
export function drawIntroPart(x: CanvasRenderingContext2D, v: CutView, part: string, t: number, options: IntroOptions & { cameraX: number; rain: number }) {
  const found = introFrame(x, v, t, 1, options).parts.find(p => p.id === part);
  if (!found) throw new Error(`Unknown intro part: ${part}`);
  found.draw();
}
