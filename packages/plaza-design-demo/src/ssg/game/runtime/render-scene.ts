import {prepareFrame,type FrameSource} from './prepare-frame';
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
import { lightAt } from '../world/light';
import type { TimelineFrame } from '../art/core/timeline';
import {art,drawCompositionSlot,type Composition} from '../art';
import {backdropDocuments,backdropTown,type BackdropDocument} from '../world/backdrops';

type Draw = (ctx: CanvasRenderingContext2D, view: View) => void;
/**
 * A neighbouring zone joined by a seam (world/zone-graph.ts), drawn in the same frame: its own view (the camera moved
 * by where it lies), scene, host and light (its own facing, the city's weather). Clipped to its window.
 */
export interface ZoneFrame {
  view: View; scene: SceneDef; sceneId: string;
  host: Pick<SceneHost, 'draw' | 'model'> & Partial<Pick<SceneHost,'visionOn'>>;
  lighting: (weather: Weather | null) => Light;
  preparePresentation?: (view:View) => void;
  weather?: () => Weather;
  /** It lies below the zone the player is in (a quay under a raised platform): drawn first, behind that zone's own artwork. */
  below?: boolean;
}
/** A pass of the one frame that a director can switch off (all run by default, as in play). */
export type FramePass = 'sky' | 'weather' | 'casters' | 'actors' | 'shade' | 'grade' | 'lights' | 'prompts' | 'bubbles' | 'vision';
/**
 * The configuration of the one frame for a sequence (the title glide, a cutscene, the taxi flight): where the camera is,
 * which passes run, what is drawn over the world, the time of day and the pixel scale. A sequence is never a second
 * renderer; it is this frame, directed (docs/design/SEAMLESS-WORLD.md, Principles "One renderer"; decision 23).
 * Absent, the frame is drawn exactly as in play.
 */
export interface FrameDirector {
  /**
   * Camera from a timeline (world units of the frame's zone) instead of the player follow. `x` is the camera's left edge
   * (`view.cam`), `h` the timeline's camera height (the picture moves up by `h`, as the timeline's camera track has
   * always meant), `zoom` scales the world about the middle of the viewport (overlays stay unzoomed).
   */
  camera?: { x: number; h: number; zoom?: number };
  /** Which passes run (default: all on, as play). Sequences switch off what they don't have. */
  passes?: Partial<Record<FramePass, boolean>>;
  /**
   * Drawn over the world, under nothing (in logical viewport coordinates, unzoomed), in this order: full-screen fades,
   * the letterbox bars, then text cards (the glide's district names). A card without `x` is centred; `y` is the
   * alphabetic baseline from the top (default the middle).
   */
  overlays?: { fades?: { color: string; opacity: number }[]; cards?: { text: string; opacity: number; x?: number; y?: number }[]; letterbox?: { top: number; bottom: number } };
  /** Time of day for the light (city clock minute/day) when the sequence sets it: the frame's light at that minute, same facing, outdoors and weather. */
  clock?: { minute: number; day?: number };
  /** Pixel scale override (a sequence's own fit), else the game's. */
  scale?: number;
  sequence?: View['sequence'];
}
/** Does the director let this pass run? */
export const passOn = (d: FrameDirector | undefined, pass: FramePass) => d?.passes?.[pass] !== false;

/**
 * The one bridge from timelines to the frame: an evaluated timeline frame (art/core/timeline.ts `evaluateTimeline`) as
 * a director. The shot camera and the camera tracks become the camera, the timeline's fades and text cards the
 * overlays (a card's `h` is up from the viewport's top edge, as the timeline stores it), a piece's `clock` state (a city
 * minute, -1 none) the time of day. `base` adds what the timeline does not own (passes, letterbox, scale) and wins.
 */
export function directorFromTimeline(frame: Pick<TimelineFrame, 'camera' | 'fades' | 'text' | 'state'>, base: FrameDirector = {}): FrameDirector {
  const director: FrameDirector = {
    camera: { x: frame.camera.x, h: frame.camera.h, zoom: frame.camera.zoom },
    overlays: {
      fades: frame.fades.map(f => ({ color: f.color, opacity: f.opacity })),
      cards: frame.text.map(card => ({ text: card.text, opacity: 1, x: card.x, y: -card.h })),
    },
  };
  for (const state of Object.values(frame.state)) {
    const minute = state.clock;
    if (typeof minute === 'number' && Number.isFinite(minute) && minute >= 0) { director.clock = { minute, ...(typeof state.day === 'number' ? { day: state.day } : {}) }; break; }
  }
  return { ...director, ...base, overlays: { ...director.overlays, ...base.overlays } };
}

/** One frame of the world: the zone the player is in (the scene) and the zones joined to it that are on screen. */
export interface FrameInspection { scene?:SceneDef; composition?:Composition; view:View; model?:SceneHost['model']; scale:number; zoom:number }
export interface WorldFrame {
  evaluation?:TimelineFrame;
  capture?:boolean;
  inspection?:FrameInspection[];
  context: CanvasRenderingContext2D; scale: number; view: View; scene: SceneDef; sceneId: string;
  /** A camera zoom already folded into `scale` (the world drawn larger; `view` is in zoomed units): overlays in logical
   * viewport coordinates draw at `scale / zoom`. Default 1. */
  zoom?: number;
  host: Pick<SceneHost, 'visionOn' | 'draw' | 'model'>;
  reduced: boolean; clock: number; weather: () => Weather;
  /** Also installs native shared light/shade inputs before any artwork runs. */
  lighting: (weather: Weather | null) => Light;
  /** Caller-owned controller evaluation. All subsequent artwork consumes prepared snapshots. */
  preparePresentation?: (view:View) => void;
  reflections?: [number, string][];
  city?: Draw;
  street?: (ctx: CanvasRenderingContext2D, view: View, rain: number, lit: boolean) => void;
  roomWash?: Draw; actors?: Draw; prompts?: Draw; bubbles?: Draw;
  /** Evaluated authoring/playback overlays, in logical viewport coordinates. */
  timeline?:TimelineOverlay;
  /** Zones joined to this one by seams, on screen this frame. None: a scene drawn alone, exactly as ever. */
  joined?: readonly ZoneFrame[];
  /** A sequence's configuration of this frame (camera, passes, overlays, clock, scale). None: play. */
  director?: FrameDirector;
  backdrops?: ReadonlyMap<string,BackdropDocument>;
}

/** The one frame renderer, for a scene alone or with the zones joined to it (docs/design/SEAMLESS-WORLD.md §3). */
export function renderWorldFrame(input:WorldFrame|FrameSource){const frame=prepareFrame(input),span=perfBegin('render.total',frame.sceneId);try{renderMeasuredFrame(frame);return frame;}finally{perfEnd(span);}}
function renderMeasuredFrame(frame: WorldFrame) {
  let pass=perfBegin('render.prepare');
  beginLayeredFrame();
  const d = frame.director, x = frame.context, k = d?.scale ?? frame.scale, s = frame.scene, zh = frame.host, amb = s.ambient ?? {};
  x.setTransform(k, 0, 0, k, 0, 0);
  const v = { ...(d?.camera ? directedView(frame.view, d.camera) : frame.view), zoneWindow: undefined as View['zoneWindow'],reduced:frame.reduced };
  clearWorld(x, v.viewW, v.viewH);
  const zoom = d?.camera?.zoom ?? 1;
  if (zoom !== 1) { x.translate(v.viewW / 2, v.viewH / 2); x.scale(zoom, zoom); x.translate(-v.viewW / 2, -v.viewH / 2); }
  const joined=(frame.joined??[]).map(z=>({...z,view:{...(d?.camera?directedView(z.view,{...d.camera,x:z.view.cam+d.camera.x-frame.view.cam}):z.view),reduced:frame.reduced,...(d?.sequence?{sequence:d.sequence}:{})}}));
  const vision = (zh.visionOn || joined.some(z=>z.host.visionOn)) && passOn(d, 'vision');
  if(d?.sequence)v.sequence=d.sequence;
  const W = amb.weather && passOn(d, 'weather') ? frame.weather() : null;
  const covers = amb.covers?.map(c => [v.sx(c.from), v.sx(c.to), v.y(c.under)] as [number, number, number]);
  // each joined zone is lit by its own facing; the scene's light is installed last, as it is the one the frame shares
  for (const z of joined) { const weather=z.scene.ambient?.weather&&passOn(d,'weather')?(z.weather?.()??W):null,given=z.lighting(weather),ZL=d?.clock?lightAt(d.clock.day??given.day,d.clock.minute,given.facing,weather,given.outdoor):given; z.view.lighting = ZL; z.view.illumination = createLightingFrame(ZL, z.scene.lights, ZL.outdoor ? z.scene.shade : undefined, z.scene.width, true); z.preparePresentation?.(z.view); }
  const given = frame.lighting(W);
  const L = d?.clock ? lightAt(d.clock.day ?? given.day, d.clock.minute, given.facing, W, given.outdoor) : given;
  v.lighting = L;
  v.illumination = createLightingFrame(L, s.lights, L.outdoor ? s.shade : undefined, s.width, true);
  frame.view.lighting=L; frame.view.illumination=v.illumination;
  frame.preparePresentation?.(v);
  const look = W ? { w: W, t: frame.reduced ? frame.clock * 0.35 : v.t, still: frame.reduced, covers, day: L.daylight } : null;
  const rain = W?.wet ?? 0;
  const casters = !vision && passOn(d, 'casters'), shade = !vision && passOn(d, 'shade');
  perfEnd(pass);pass=perfBegin('render.world');
  const backdrops = frame.backdrops ?? backdropDocuments(), sharedBackdrop=s.backdrop?backdrops.get(s.backdrop.id):undefined, sharedSky=sharedBackdrop?.sky;
  const seenBackdrops = new Set<string>(),backdropFrames:{doc:BackdropDocument;view:View}[]=[];
  for(const zone of [{scene:s,view:v},...joined]){
    const ref=zone.scene.backdrop;if(!ref||seenBackdrops.has(ref.id))continue;
    const doc=backdrops.get(ref.id);if(!doc)throw new Error('Missing world backdrop '+ref.id);seenBackdrops.add(ref.id);
    const local=zone.view,view:View={...local,zoneWindow:undefined,cam:local.cam+ref.x,
      sx:(wx,p=1)=>local.sx(wx-ref.x*p,p),y:h=>local.y(h-(ref.h??0))};backdropFrames.push({doc,view});
  }
  if(frame.capture)frame.inspection=[{scene:s,view:v,model:zh.model,scale:k,zoom},...joined.map(z=>({scene:z.scene,view:z.view,model:z.host.model,scale:k,zoom})),...backdropFrames.map(z=>({composition:z.doc,view:z.view,scale:k,zoom}))];
  if (amb.sky && passOn(d, 'sky')) { drawSky(x, v, L, { horizon: v.y(sharedSky ? sharedSky.horizon-(s.backdrop!.h??0) : s.horizon ?? 0),...(sharedSky?{style:sharedSky.style,town:backdropTown(sharedBackdrop,v.cam+(s.backdrop?.x??0)+v.viewW/2)}:{}) }); if (look) weatherSky(x, v, look); s.drawSkyArtwork?.(x, v);for(const {doc,view} of backdropFrames)drawCompositionSlot(x,art,doc,{view,reduced:frame.reduced,state:{}},'behind-player',undefined,'sky'); }
  if (amb.city) (s.artworkFrame?.city??frame.city)?.(x, v);
  if (amb.street) (s.artworkFrame?.street??frame.street)?.(x, v, rain, !!amb.city);
  // An independent backdrop paints once through world coordinates, never clipped to a zone's window.
  for (const {doc,view} of backdropFrames) drawCompositionSlot(x,art,doc,{view,reduced:frame.reduced,state:{}},'behind-player');
  if (joined.length) v.zoneWindow={left:v.sx(0),right:v.sx(s.width)};
  // a zone below this one (stacked by a stairs seam) is further back: drawn before the zone's own artwork, which stands over it
  for (const z of joined) if (z.below) drawJoined(x, z, look, rain, vision,d);
  const mid = () => { if (look) inZoneWindow(x,v,()=>{ puddles(x, v, look, { width: s.width, seed: frame.sceneId.length * 97 + s.width, lights: amb.city ? s.artworkFrame?.reflections??frame.reflections : undefined }); weatherMid(x, v, look); }); };
  if (vision && zh.visionOn && s.layers) {
    zh.draw(x, v, 'world');
    mid();
    if (look) weatherFront(x, v, { ...look, still: true });
    muteWorld(x, v);
    zh.draw(x, v, 'devices');
  } else {
    zh.draw(x, v);
    mid();
    if (vision) { if (look) weatherFront(x, v, { ...look, still: true }); muteWorld(x, v, zh.visionOn ? zh.model.spots() : undefined); }
  }
  if (casters) drawCasters(x, v, s.casters);
  for (const z of joined) if (!z.below) drawJoined(x, z, look, rain, vision,d);
  perfEnd(pass);pass=perfBegin('render.actors');
  if (passOn(d, 'actors')) {
    frame.roomWash?.(x, v);
    s.drawActors?.(x, v);
    frame.actors?.(x, v);
  }
  flushLayeredSlot('over-player');
  perfEnd(pass);pass=perfBegin('render.finish');
  if (shade) inZoneWindow(x,v,()=>drawShade(x, v));
  s.drawFront?.(x, v, {m:zh.model,hover:null,layer:'all'});
  flushLayeredSlot('foreground');
  if (!vision) { if (passOn(d, 'grade')) drawGrade(x, v, L); if (passOn(d, 'lights')) drawLights(x, v, s.lights, L); }
  if (look && !vision) inZoneWindow(x,v,()=>weatherFront(x, v, look));
  if (zoom !== 1) x.setTransform(k, 0, 0, k, 0, 0);
  if (passOn(d, 'prompts')) frame.prompts?.(x, v);
  if (passOn(d, 'bubbles')) frame.bubbles?.(x, v);
  if(frame.timeline){const z=frame.zoom??1;drawTimelineOverlay(x,{width:v.viewW*z,height:v.viewH*z,scale:k/z},frame.timeline);}
  if (d?.overlays) { const z = frame.zoom ?? 1; drawDirectorOverlays(x, v.viewW * z, v.viewH * z, k / z, d.overlays); }
  perfEnd(pass);
}

/** The frame's view under a director's camera: the camera's left edge at `x`, the picture moved up by `h` (zoom is a canvas transform). */
function directedView(v: View, camera: NonNullable<FrameDirector['camera']>): View {
  const dx = camera.x - v.cam;
  return { ...v, cam: camera.x, sx: (wx, parallax = 1) => v.sx(wx - dx * parallax, parallax), y: h => v.y(h + camera.h) };
}

const RUST = '194,65,12';
/** Fades, letterbox bars (each with a thin rust edge so the picture reads as framed), then cards: over everything else. */
function drawDirectorOverlays(x: CanvasRenderingContext2D, W: number, H: number, scale: number, overlays: NonNullable<FrameDirector['overlays']>) {
  x.save();
  try {
    x.setTransform(scale, 0, 0, scale, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    for (const fade of overlays.fades ?? []) if (fade.opacity > 0) { x.globalAlpha = Math.min(1, fade.opacity); x.fillStyle = fade.color; x.fillRect(0, 0, W, H); }
    x.globalAlpha = 1;
    const bars = overlays.letterbox;
    if (bars) {
      x.fillStyle = '#000';
      x.fillRect(0, 0, W, bars.top);
      x.fillRect(0, H - bars.bottom, W, bars.bottom);
      x.fillStyle = 'rgba(' + RUST + ',.55)';
      x.fillRect(0, bars.top - 1, W, 1);
      x.fillRect(0, H - bars.bottom, W, 1);
    }
    const cards = overlays.cards?.filter(c => c.opacity > 0 && c.text) ?? [];
    if (cards.length) {
      x.fillStyle = '#ffdfb5'; x.font = '600 12px "IBM Plex Mono", monospace'; x.textBaseline = 'alphabetic';
      for (const card of cards) {
        x.globalAlpha = Math.min(1, card.opacity); x.textAlign = card.x === undefined ? 'center' : 'left';
        for (const [line, text] of card.text.split('\n').entries()) x.fillText(text, card.x ?? W / 2, (card.y ?? H / 2) + line * 18);
      }
    }
  } finally { x.restore(); }
}

/**
 * A joined zone over the scene, inside its window: its own city and street layers, artwork, actors, wet ground, casters,
 * shade and front. The sky, the grade, the weather in front and the overlays are the frame's, drawn once.
 * Hack vision follows its owning host, including a vehicle whose source zone is a neighbour.
 */
function drawJoined(x: CanvasRenderingContext2D, z: ZoneFrame, look: Parameters<typeof weatherMid>[2] | null, rain: number, vision: boolean,d?:FrameDirector) {
  const s = z.scene, amb = s.ambient ?? {}, left = z.view.sx(0), right = z.view.sx(s.width), v:View={...z.view,zoneWindow:{left,right}};
  if(z.weather&&amb.weather&&passOn(d,'weather')){const weather=z.weather();look={w:weather,t:v.t,still:!!v.reduced,day:v.lighting.daylight,covers:amb.covers?.map(c=>[v.sx(c.from),v.sx(c.to),v.y(c.under)] as [number,number,number])};}
  if((right<=0||left>=v.viewW)&&!s.artworkVisible?.(v,z.host.model as SceneHost['model']))return;
  // A set row may still be on screen when the logical zone rect has just left it.
  x.save();
  if (amb.city) s.artworkFrame?.city?.(x, v);
  if (amb.street) s.artworkFrame?.street?.(x, v, rain, !!amb.city);
  // its rows over the player and in front wait in the frame's shared queue: take its own and draw them here, clipped
  const before = { over: layeredDocs('over-player'), front: layeredDocs('foreground') };
  const ownVision=vision&&z.host.visionOn;
  if(ownVision&&s.layers){z.host.draw(x,v,'world');muteWorld(x,v);z.host.draw(x,v,'devices');}
  else z.host.draw(x, v);
  const own = (slot: 'over-player' | 'foreground', had: Set<unknown>) => new Set([...layeredDocs(slot)].filter(d => !had.has(d)));
  const over = own('over-player', before.over), front = own('foreground', before.front);
  if (look&&amb.weather&&passOn(d,'weather')) inZoneWindow(x,v,()=>{puddles(x, v, look, { width: s.width, seed: z.sceneId.length * 97 + s.width, lights: amb.city ? s.artworkFrame?.reflections : undefined }); weatherMid(x, v, look);});
  if (!vision&&passOn(d,'casters')) inZoneWindow(x,v,()=>drawCasters(x, v, s.casters));
  if(passOn(d,'actors'))s.drawActors?.(x, v);
  flushLayeredDocs('over-player', over);
  if (!vision&&passOn(d,'shade')) inZoneWindow(x,v,()=>drawShade(x, v));
  s.drawFront?.(x, v, {m:z.host.model,hover:null,layer:'all'});
  flushLayeredDocs('foreground', front);
  if(z.weather&&look&&amb.weather&&!vision)inZoneWindow(x,v,()=>weatherFront(x,v,look!));
  if (vision&&!(ownVision&&s.layers)) inZoneWindow(x,v,()=>muteWorld(x, v, ownVision?z.host.model.spots():undefined));
  x.restore();
}

/** Effects belong to the zone; artwork rows decide their own overhang. */
function inZoneWindow(x:CanvasRenderingContext2D,v:View,draw:()=>void){
 const window=v.zoneWindow;if(!window||(window.left<=0&&window.right>=v.viewW)){draw();return;}
 x.save();x.beginPath();x.rect(window.left,0,window.right-window.left,v.viewH);x.clip();try{draw();}finally{x.restore();}
}
