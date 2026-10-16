/**
 * The intro's picture: the skyline (../skyline.ts) as a scene with no one in it,
 * a slow pan across the city with the wet floor under the horizon and a shower
 * passing through the middle of it.
 */

import { Skyline, type SkylineSnapshot } from "../environment/skyline";
import type { CutView } from "../core/view";

const city = new Skyline();
/** Time of the previous frame, to step the packets by real frames. */
let lastT = 0;

/** Draw the skyline at `t` seconds into a `duration`-second pan. */
export interface IntroOptions { cameraX?: number; rain?: number; city?: Skyline; step?: number }
export function introFrame(x: CanvasRenderingContext2D, v: CutView, t: number, duration: number, options: IntroOptions = {}) {
  const W = Math.ceil(v.viewW), H = Math.ceil(v.viewH), top = v.barTop;
  const horizon = Math.round(top + (H - top - v.barBottom) * 0.68), camMax = Math.round(W * 1.1);
  const still = v.reduced, a = still ? 240 : t * 60;
  // A slow pan, easing in and out; reduced motion holds the middle of it.
  const u = still ? 0.5 : Math.min(1, Math.max(0, t / duration));
  const cam = options.cameraX ?? Math.round(camMax * (0.5 - 0.5 * Math.cos(Math.PI * u)));
  const k = options.step ?? Math.min(3, Math.max(0, (t - lastT) * 60));
  if (options.step === undefined) lastT = t;
  // A shower passes through the middle of the scene.
  const wet = still ? 0.35 : Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, (t - 3) / (duration - 5))))) ** 1.4;
  const frame = { W, H, top, horizon, sunX: W * 0.6, camMax };
  const draw = { cam, a, k, still, floor: true, rain: options.rain ?? wet * 0.85 };
  return { parts: (options.city ?? city).parts(x, frame, draw), frame, draw };
}
export function drawSkyline(x: CanvasRenderingContext2D, v: CutView, t: number, duration: number) { for (const part of introFrame(x, v, t, duration).parts) part.draw(); }

/** Explicit deterministic seek session; the shipping continuous singleton remains untouched. */
export class IntroSeekSession {
  private city = new Skyline();
  private checkpoints = new Map<number, SkylineSnapshot>();
  private key = '';
  constructor(private initial?: SkylineSnapshot) {}
  parts(x: CanvasRenderingContext2D, v: CutView, time: number, duration: number, options: Omit<IntroOptions, 'city' | 'step'> = {}) {
    if (!Number.isFinite(time) || time < 0) throw new Error('Intro seek time must be finite and nonnegative');
    const prepared = introFrame(x, v, time, duration, { ...options, city: this.city, step: 0 });
    const key = JSON.stringify([prepared.frame, v.reduced]);
    if (key !== this.key) { this.key = key; this.checkpoints.clear(); if (this.initial) this.city.restore(this.initial); this.checkpoints.set(0, this.city.snapshot()); }
    const count = Math.floor(time * 60 + 1e-8), exact = Math.abs(time - count / 60) < 1e-8, before = exact ? count : count + 1;
    const start = Math.max(...[...this.checkpoints.keys()].filter(frame => frame <= before));
    this.city.restore(this.checkpoints.get(start)!);
    for (let frame = start; frame < before; frame++) {
      const step = frame === 0 ? 0 : Math.min(3, Math.max(0, (frame / 60 - (frame - 1) / 60) * 60));
      this.city.advance(x, prepared.frame, step, v.reduced);
      if ((frame + 1) % 60 === 0) this.checkpoints.set(frame + 1, this.city.snapshot());
    }
    const previousTime = before === 0 ? 0 : (before - 1) / 60;
    return introFrame(x, v, time, duration, { ...options, city: this.city, step: Math.min(3, Math.max(0, (time - previousTime) * 60)) }).parts;
  }
}
