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

type Draw = (ctx: CanvasRenderingContext2D, view: View) => void;
export interface SceneFrame {
  context: CanvasRenderingContext2D; scale: number; view: View; scene: SceneDef; sceneId: string;
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
}

export function renderSceneFrame(frame:SceneFrame){const span=perfBegin('render.total',frame.sceneId);try{renderMeasuredFrame(frame);}finally{perfEnd(span);}}
function renderMeasuredFrame(frame: SceneFrame) {
  let pass=perfBegin('render.prepare');
  const x = frame.context, k = frame.scale, s = frame.scene, zh = frame.host, amb = s.ambient ?? {};
  x.setTransform(k, 0, 0, k, 0, 0);
  const v = frame.view;
  clearWorld(x, v.viewW, v.viewH);
  const vision = zh.visionOn;
  const W = amb.weather ? frame.weather() : null;
  const covers = amb.covers?.map(c => [v.sx(c.from), v.sx(c.to), v.y(c.under)] as [number, number, number]);
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
  perfEnd(pass);pass=perfBegin('render.actors');
  frame.roomWash?.(x, v);
  s.drawActors?.(x, v);
  frame.actors?.(x, v);
  perfEnd(pass);pass=perfBegin('render.finish');
  if (!vision) drawShade(x, v);
  s.drawFront?.(x, v);
  if (!vision) { drawGrade(x, v, L); drawLights(x, v, s.lights, L); }
  if (look && !vision) weatherFront(x, v, look);
  frame.prompts?.(x, v);
  frame.bubbles?.(x, v);
  if(frame.timeline)drawTimelineOverlay(x,{width:v.viewW,height:v.viewH,scale:k},frame.timeline);
  perfEnd(pass);
}
