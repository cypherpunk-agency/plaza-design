import {perfBegin,perfEnd} from './diagnostics/performance';
import{drawTimelineOverlay,type TimelineOverlay}from'../art/core/timeline-overlay';
/** Shared native frame orchestration. Game and composer provide state, never duplicate artwork. */
import type { View } from '../art/core/view';
import type { SceneDef } from '../scenes/kit';
import type { SceneHost } from '../engine/host';
import type { Weather } from '../world/weather';
import type { Light } from '../world/light';
import { clearWorld } from '../art/core/canvas';
import { drawSky } from '../art/environment/sky';
import { puddles, weatherFront, weatherMid, weatherSky } from '../art/atmosphere/weather';
import { createLightingFrame, drawCasters, drawGrade, drawLights, drawShade } from '../art/atmosphere/lighting';
import { muteWorld } from '../art/atmosphere/hack-vision';
import { beginLayeredFrame, flushLayeredDocs, flushLayeredSlot, layeredDocs } from '../art/core/composition';

type Draw = (ctx: CanvasRenderingContext2D, view: View) => void;
/**
 * A neighbouring zone joined by a seam (world/zone-graph.ts), drawn in the same frame: its own view (the camera moved
 * by where it lies), scene, host and light (its own facing, the city's weather). Clipped to its window.
 */
export interface ZoneFrame {
  view: View; scene: SceneDef; sceneId: string;
  host: Pick<SceneHost, 'draw' | 'model'>;
  lighting: (weather: Weather | null) => Light;
  preparePresentation?: () => void;
  /** It lies below the zone the player is in (a quay under a raised platform): drawn first, behind that zone's own artwork. */
  below?: boolean;
}
/** One frame of the world: the zone the player is in (the scene) and the zones joined to it that are on screen. */
export interface WorldFrame {
  context: CanvasRenderingContext2D; scale: number; view: View; scene: SceneDef; sceneId: string;
  /** A camera zoom already folded into `scale` (the world drawn larger; `view` is in zoomed units): overlays in logical
   * viewport coordinates draw at `scale / zoom`. Default 1. */
  zoom?: number;
  host: Pick<SceneHost, 'visionOn' | 'draw' | 'model'>;
  reduced: boolean; clock: number; weather: () => Weather;
  /** Also installs native shared light/shade inputs before any artwork runs. */
  lighting: (weather: Weather | null) => Light;
  /** Caller-owned controller evaluation. All subsequent artwork consumes prepared snapshots. */
  preparePresentation?: () => void;
  reflections?: [number, string][];
  skyTraffic?: Draw; city?: Draw;
  street?: (ctx: CanvasRenderingContext2D, view: View, rain: number, lit: boolean) => void;
  roomWash?: Draw; actors?: Draw; prompts?: Draw; bubbles?: Draw;
  /** Evaluated authoring/playback overlays, in logical viewport coordinates. */
  timeline?:TimelineOverlay;
  /** Zones joined to this one by seams, on screen this frame. None: a scene drawn alone, exactly as ever. */
  joined?: readonly ZoneFrame[];
}

/** The one frame renderer, for a scene alone or with the zones joined to it (docs/design/SEAMLESS-WORLD.md §3). */
export function renderWorldFrame(frame:WorldFrame){const span=perfBegin('render.total',frame.sceneId);try{renderMeasuredFrame(frame);}finally{perfEnd(span);}}
function renderMeasuredFrame(frame: WorldFrame) {
  let pass=perfBegin('render.prepare');
  beginLayeredFrame();
  const x = frame.context, k = frame.scale, s = frame.scene, zh = frame.host, amb = s.ambient ?? {};
  x.setTransform(k, 0, 0, k, 0, 0);
  const v = frame.view;
  clearWorld(x, v.viewW, v.viewH);
  const vision = zh.visionOn;
  const W = amb.weather ? frame.weather() : null;
  const covers = amb.covers?.map(c => [v.sx(c.from), v.sx(c.to), v.y(c.under)] as [number, number, number]);
  // each joined zone is lit by its own facing; the scene's light is installed last, as it is the one the frame shares
  for (const z of frame.joined ?? []) { const ZL = z.lighting(W); z.view.lighting = ZL; z.view.illumination = createLightingFrame(ZL, z.scene.lights, ZL.outdoor ? z.scene.shade : undefined, z.scene.width, true); z.preparePresentation?.(); }
  const L = frame.lighting(W);
  v.lighting = L;
  v.illumination = createLightingFrame(L, s.lights, L.outdoor ? s.shade : undefined, s.width, true);
  frame.preparePresentation?.();
  const look = W ? { w: W, t: frame.reduced ? frame.clock * 0.35 : v.t, still: frame.reduced, covers, day: L.daylight } : null;
  const rain = W?.wet ?? 0;
  perfEnd(pass);pass=perfBegin('render.world');
  if (amb.sky) { drawSky(x, v, L, { horizon: v.y(s.horizon ?? 0) }); if (look) weatherSky(x, v, look); frame.skyTraffic?.(x, v); }
  if (amb.city) (s.artworkFrame?.city??frame.city)?.(x, v);
  if (amb.street) (s.artworkFrame?.street??frame.street)?.(x, v, rain, !!amb.city);
  // a zone below this one (stacked by a stairs seam) is further back: drawn before the zone's own artwork, which stands over it
  for (const z of frame.joined ?? []) if (z.below) drawJoined(x, z, look, rain, vision);
  const mid = () => { if (look) { puddles(x, v, look, { width: s.width, seed: frame.sceneId.length * 97 + s.width, lights: amb.city ? s.artworkFrame?.reflections??frame.reflections : undefined }); weatherMid(x, v, look); } };
  if (vision && s.layers) {
    zh.draw(x, v, 'world');
    mid();
    if (look) weatherFront(x, v, { ...look, still: true });
    muteWorld(x, v);
    zh.draw(x, v, 'devices');
  } else {
    zh.draw(x, v);
    mid();
    if (vision) { if (look) weatherFront(x, v, { ...look, still: true }); muteWorld(x, v, zh.model.spots()); }
  }
  if (!vision) drawCasters(x, v, s.casters);
  for (const z of frame.joined ?? []) if (!z.below) drawJoined(x, z, look, rain, vision);
  perfEnd(pass);pass=perfBegin('render.actors');
  frame.roomWash?.(x, v);
  s.drawActors?.(x, v);
  frame.actors?.(x, v);
  flushLayeredSlot('over-player');
  perfEnd(pass);pass=perfBegin('render.finish');
  if (!vision) drawShade(x, v);
  s.drawFront?.(x, v);
  flushLayeredSlot('foreground');
  if (!vision) { drawGrade(x, v, L); drawLights(x, v, s.lights, L); }
  if (look && !vision) weatherFront(x, v, look);
  frame.prompts?.(x, v);
  frame.bubbles?.(x, v);
  if(frame.timeline){const z=frame.zoom??1;drawTimelineOverlay(x,{width:v.viewW*z,height:v.viewH*z,scale:k/z},frame.timeline);}
  perfEnd(pass);
}

/**
 * A joined zone over the scene, inside its window: its own city and street layers, artwork, actors, wet ground, casters,
 * shade and front. The sky, the grade, the weather in front and the overlays are the frame's, drawn once.
 * In hack vision a neighbour is muted whole: hacking is in the zone the player is in.
 */
function drawJoined(x: CanvasRenderingContext2D, z: ZoneFrame, look: Parameters<typeof weatherMid>[2] | null, rain: number, vision: boolean) {
  const v = z.view, s = z.scene, amb = s.ambient ?? {}, left = v.sx(0), right = v.sx(s.width);
  if (right <= 0 || left >= v.viewW) return;
  x.save(); x.beginPath(); x.rect(left, 0, right - left, v.viewH); x.clip();
  if (amb.city) s.artworkFrame?.city?.(x, v);
  if (amb.street) s.artworkFrame?.street?.(x, v, rain, !!amb.city);
  // its rows over the player and in front wait in the frame's shared queue: take its own and draw them here, clipped
  const before = { over: layeredDocs('over-player'), front: layeredDocs('foreground') };
  z.host.draw(x, v);
  const own = (slot: 'over-player' | 'foreground', had: Set<unknown>) => new Set([...layeredDocs(slot)].filter(d => !had.has(d)));
  const over = own('over-player', before.over), front = own('foreground', before.front);
  if (look) { puddles(x, v, look, { width: s.width, seed: z.sceneId.length * 97 + s.width, lights: amb.city ? s.artworkFrame?.reflections : undefined }); weatherMid(x, v, look); }
  if (!vision) drawCasters(x, v, s.casters);
  s.drawActors?.(x, v);
  flushLayeredDocs('over-player', over);
  if (!vision) drawShade(x, v);
  s.drawFront?.(x, v);
  flushLayeredDocs('foreground', front);
  if (vision) muteWorld(x, v);
  x.restore();
}
