/**
 * Drawing a set piece in its own frame. The scenes draw their sets in world units on their
 * camera; a cutscene (the opening glide) places one with a translate and a scale and draws
 * it in local units: x to the right, heights up from the foot (0), so `y(h) = -h`.
 */

import { lightAt, type Light } from '../../world/light';
import { createLightingFrame, type LightingFrame } from '../atmosphere/lighting';
export interface View {
  /** Explicit frame inputs. World controllers replace them before painting. */
  lighting: Light;
  illumination: LightingFrame;
  /** World x to screen x; `parallax` < 1 for things further away, > 1 for the foreground. */
  sx: (wx: number, parallax?: number) => number;
  /** Height above the ground to screen y. */
  y: (h: number) => number;
  t: number;
  /** Authored game-camera layout, translated into the independently navigated editor view. */
  cameraFrame?: {view:View;x:number;y:number};
  viewW: number;
  viewH: number;
  cam: number;
  /** Stable shared-backdrop camera for screen-space sky lanes; sx retains source-local coordinates. */
  skyCam?:number;
  /** Explicit animation preference shared by play, sequences and editor artwork. */
  reduced?:boolean;
  /** Joined-zone window. Only ground/background rows clip here; set/playfield artwork can overhang a seam. */
  zoneWindow?: {left:number;right:number};
  /** The shared frame separates travelling artwork from chunk-local scenery. */
  artworkScope?: 'static'|'mobile';
  /** All joined artwork uses the existing frame's common layer slots. */
  sharedLayers?:boolean;
  /** Connected chunk coordinates relative to this source; shared by route drawing and bounds. */
  worldZones?:Readonly<Record<string,{x:number;h:number;w?:number}>>;
  /** Evaluated timeline inputs prepared by the shared frame director; painting never advances them. */
  sequence?: {artwork?:Readonly<Record<string,import('./timeline').TimelineArtwork>>;time:number;state:Readonly<Record<string,import('./composition').Properties>>};
  /** Screen y of the ground; the strip below it (about 54 units) is the near floor. */
  gy: number;
  /** The save's flags (read only), for doors that open later (e.g. `end`: Downtown cleared, the market gate is open). */
  flags: Readonly<Record<string, boolean>>;
  /** The save's gameplay values (Save.gameplay, read only), for scene values that read saved state (`{state}`). */
  values?: Readonly<Record<string, Readonly<Record<string, string | number | boolean | null>>>>;
  /** A scene with a level (engine/level.ts): how open each building is and where its lift cars are. */
  level?: import('../../engine/level').LevelView;

  /** Native station observation, prepared from the existing train Circuit before artwork reads it. */
  transit?: {station:string;departure:import('../signage/line-departures').DepartureVisual};
  /**
   * The intro's prepared skyline (art/environment/skyline.ts). Its existing playback/seek owner
   * advances packets before the frame; artwork only consumes the resulting picture.
   */
  skyline?: { city: import('../environment/skyline').Skyline };
}

/** A `View` for drawing in a set piece's own frame (after `translate` to its foot): no camera, nothing culled. */
export function frameView(t: number, lighting: Light = lightAt(1, 580, 90, null)): View {
  return { lighting, illumination: createLightingFrame(lighting), sx: (wx) => Math.round(wx), y: (h) => -h, t, viewW: 1e5, viewH: 1e5, cam: 0, gy: 0, flags: {} };
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
  lighting: Light;
  viewW: number;
  viewH: number;
  /** Height of the top and bottom letterbox bars: the picture lives between them. */
  barTop: number;
  barBottom: number;
  /** `prefers-reduced-motion`: hold the camera and the animation still (cards still play). */
  reduced: boolean;
}
