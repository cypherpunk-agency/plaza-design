import {inCameraSpace} from '../art/core/camera-space';
import {prepareFrame,type FrameSource} from './prepare-frame';
import {perfBegin,perfEnd} from './diagnostics/performance';
import {drawTimelineOverlay} from '../art/core/timeline-overlay';
/** Shared native frame orchestration. Game and composer provide state, never duplicate artwork. */
import type { View } from '../art/core/view';

import type { SceneHost } from '../engine/host';


import { clearWorld } from '../art/core/canvas';
import { drawSky } from '../art/environment/sky';
import { puddles, weatherFront, weatherMid, weatherSky } from '../art/atmosphere/weather';
import { createLightingFrame, drawCasters, drawGrade, drawLights, drawShade } from '../art/atmosphere/lighting';
import { muteWorld } from '../art/atmosphere/hack-vision';
import { beginLayeredFrame, flushLayeredSlot } from '../art/core/composition';
import { lightAt } from '../world/light';

import {art,drawCompositionSlot} from '../art';
import {backdropDocuments,backdropTown,type BackdropDocument} from '../world/backdrops';

import {passOn,type WorldFrame,type FrameDirector,type ZoneFrame} from './frame';
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
  const travelling=(frame.mobiles??[]).map(z=>({...z,view:{...z.view,reduced:frame.reduced}}));
  const split=!!(joined.length||travelling.length);
  if(split){v.artworkScope='static';for(const z of joined)z.view.artworkScope='static';}
  const vision = (zh.visionOn || [...joined,...travelling].some(z=>z.host.visionOn)) && passOn(d, 'vision');
  const ordered=split, deferred:{mid:(()=>void)[];actors:(()=>void)[];shade:(()=>void)[];weather:(()=>void)[];vision:(()=>void)[]}={mid:[],actors:[],shade:[],weather:[],vision:[]};
  v.sharedLayers=ordered;for(const z of [...joined,...travelling])z.view.sharedLayers=ordered;
  if(d?.sequence)v.sequence=d.sequence;
  const W = amb.weather && passOn(d, 'weather') ? frame.weather() : null;
  const covers = amb.covers?.map(c => [v.sx(c.from), v.sx(c.to), v.y(c.under)] as [number, number, number]);
  // each joined zone is lit by its own facing; the scene's light is installed last, as it is the one the frame shares
  for (const z of [...joined,...travelling]) { const weather=z.scene.ambient?.weather&&passOn(d,'weather')?(z.weather?.()??W):null,given=z.lighting(weather),ZL=d?.clock?lightAt(d.clock.day??given.day,d.clock.minute,given.facing,weather,given.outdoor):given; z.view.lighting = ZL; z.view.illumination = createLightingFrame(ZL, z.scene.lights, ZL.outdoor ? z.scene.shade : undefined, z.scene.width, true); z.preparePresentation?.(z.view); }
  const given = frame.lighting(W);
  const L = d?.clock ? lightAt(d.clock.day ?? given.day, d.clock.minute, given.facing, W, given.outdoor) : given;
  v.lighting = L;
  v.illumination = createLightingFrame(L, s.lights, L.outdoor ? s.shade : undefined, s.width, true);
  frame.view.lighting=L; frame.view.illumination=v.illumination;
  frame.preparePresentation?.(v);
  const look = W ? { w: W, t: frame.reduced ? frame.clock * 0.35 : v.t, still: frame.reduced, covers, day: L.daylight } : null;
  // Atmosphere uses game-camera layout too; workspace navigation only transforms its picture.
  const atmosphere=(ctx:CanvasRenderingContext2D,view:View,paint:(camera:View,weather:NonNullable<typeof look>)=>void)=>{
    if(!look)return;const offset=view.cameraFrame;
    inCameraSpace(ctx,view,camera=>paint(camera,offset?{...look,covers:look.covers?.map(([a,b,h])=>[a-offset.x,b-offset.x,h-offset.y] as [number,number,number])}:look));
  };
  const rain = W?.wet ?? 0;
  const casters = !vision && passOn(d, 'casters'), shade = !vision && passOn(d, 'shade');
  perfEnd(pass);pass=perfBegin('render.world');
  const backdrops = frame.backdrops ?? backdropDocuments(), sharedBackdrop=s.backdrop?backdrops.get(s.backdrop.id):undefined, sharedSky=sharedBackdrop?.sky;
  const seenBackdrops = new Set<string>(),backdropFrames:{doc:BackdropDocument;view:View}[]=[];
  for(const zone of [{scene:s,view:v},...joined]){
    const ref=zone.scene.backdrop;if(!ref||seenBackdrops.has(ref.id))continue;
    const doc=backdrops.get(ref.id);if(!doc)throw new Error('Missing world backdrop '+ref.id);seenBackdrops.add(ref.id);
    const local=zone.view;
    const offset=(v:View):View=>({...v,zoneWindow:undefined,artworkScope:undefined,sharedLayers:false,cam:v.cam+ref.x,sx:(wx,p=1)=>v.sx(wx-ref.x*p,p),y:h=>v.y(h-(ref.h??0))});
    const view=offset(local);if(local.cameraFrame)view.cameraFrame={...local.cameraFrame,view:offset(local.cameraFrame.view)};backdropFrames.push({doc,view});
  }
  if(frame.capture)frame.inspection=[{scene:s,view:v,model:zh.model,scale:k,zoom},...joined.map(z=>({scene:z.scene,view:z.view,model:z.host.model,scale:k,zoom})),...travelling.map(z=>({scene:z.scene,view:z.view,model:z.host.model,scale:k,zoom})),...backdropFrames.map(z=>({composition:z.doc,view:z.view,scale:k,zoom}))];
  if (amb.sky && passOn(d, 'sky')) { drawSky(x, v, L, { horizon: v.y(sharedSky ? sharedSky.horizon-(s.backdrop!.h??0) : s.horizon ?? 0),...(sharedSky?{style:sharedSky.style,town:backdropTown(sharedBackdrop,(v.cameraFrame?.view.cam??v.cam)+(s.backdrop?.x??0)+(v.cameraFrame?.view.viewW??v.viewW)/2)}:{}) }); if (look) atmosphere(x,v,(camera,weather)=>weatherSky(x,camera,weather)); inCameraSpace(x,v,view=>s.drawSkyArtwork?.(x,{...view,skyCam:view.cam+(s.backdrop?.x??0)}));for(const {doc,view} of backdropFrames)inCameraSpace(x,view,camera=>drawCompositionSlot(x,art,doc,{view:camera,reduced:frame.reduced,state:{}},'behind-player',undefined,'sky')); }
  if (amb.city) (s.artworkFrame?.city??frame.city)?.(x, v);
  if (amb.street) (s.artworkFrame?.street??frame.street)?.(x, v, rain, !!amb.city);
  // An independent backdrop paints once through world coordinates, never clipped to a zone's window.
  for (const {doc,view} of backdropFrames) drawCompositionSlot(x,art,doc,{view,reduced:frame.reduced,state:{}},'behind-player');
  v.zoneWindow={left:v.sx(0),right:v.sx(s.width)};
  // a zone below this one (stacked by a stairs seam) is further back: drawn before the zone's own artwork, which stands over it
  for (const z of joined) if (z.below) drawJoined(x, z, look, rain, vision,d,deferred);
  const mid = () => { if (look) inZoneWindow(x,v,()=>{ atmosphere(x,v,(camera,weather)=>{puddles(x,camera,weather,{width:s.width,seed:frame.sceneId.length*97+s.width,lights:amb.city?s.artworkFrame?.reflections??frame.reflections:undefined});weatherMid(x,camera,weather);}); }); };
  if (vision && zh.visionOn && s.layers) {
    zh.draw(x, v, 'world');
    if(!ordered)mid();
    if (look&&!ordered) atmosphere(x,v,(camera,weather)=>weatherFront(x,camera,{...weather,still:true}));
    const devices=()=>{if(!ordered)muteWorld(x,v);zh.draw(x,{...v,sharedLayers:false},'devices');};
    if(ordered)deferred.vision.push(devices);else devices();
  } else {
    zh.draw(x, v);
    if(!ordered)mid();
    if (vision) { const wash=()=>{if(look)atmosphere(x,v,(camera,weather)=>weatherFront(x,camera,{...weather,still:true}));muteWorld(x,v,zh.visionOn?zh.model.spots():undefined);};if(!ordered)wash(); }
  }
  if (casters&&!ordered) drawCasters(x, v, s.casters);
  for (const z of joined) if (!z.below) drawJoined(x, z, look, rain, vision,d,deferred);
  const mobileFrames=split?[{scene:s,view:v,host:zh},...joined,...travelling]:[];
  const mobileView=(z:Pick<ZoneFrame,'view'|'scene'>):View=>({...z.view,artworkScope:'mobile',zoneWindow:{left:z.view.sx(0),right:z.view.sx(z.scene.width)}});
  for(const z of mobileFrames){if(!z.scene.artwork)continue;drawZoneHost(x,mobileView(z),z);}
  if(ordered){flushLayeredSlot('behind-player');mid();if(casters)drawCasters(x,v,s.casters);for(const draw of deferred.mid)draw();
    if(vision){
      if(look)atmosphere(x,v,(camera,weather)=>weatherFront(x,camera,{...weather,still:true}));
      const keep=[{host:zh,view:v},...joined,...travelling].flatMap(z=>z.host.visionOn?z.host.model.spots().map(p=>({...p,x:p.x+v.cam-z.view.cam,y:p.y+v.gy-z.view.gy})):[]);
      muteWorld(x,v,keep);
    }
    for(const draw of deferred.vision)draw();
  }
  for(const draw of deferred.actors)draw();
  perfEnd(pass);pass=perfBegin('render.actors');
  if (passOn(d, 'actors')) {
    frame.roomWash?.(x, v);
    s.drawActors?.(x, v);
    frame.actors?.(x, v);
  }
  flushLayeredSlot('over-player');
  perfEnd(pass);pass=perfBegin('render.finish');
  if (shade) inZoneWindow(x,v,()=>drawShade(x, v));
  for(const draw of deferred.shade)draw();
  // All foreground occluders share the final slot, independent of the active chunk.
  for(const z of joined)z.scene.drawFront?.(x,z.view,{m:z.host.model,hover:null,layer:'all'});
  s.drawFront?.(x, v, {m:zh.model,hover:null,layer:'all'});
  for(const z of mobileFrames)z.scene.drawFront?.(x,mobileView(z),{m:z.host.model,hover:null,layer:'all'});
  flushLayeredSlot('foreground');
  if (!vision) { if (passOn(d, 'grade')) drawGrade(x, v, L); if (passOn(d, 'lights')) drawLights(x, v, s.lights, L); }
  for(const draw of deferred.weather)draw();
  if (look && !vision) inZoneWindow(x,v,()=>atmosphere(x,v,(camera,weather)=>weatherFront(x,camera,weather)));
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
function drawJoined(x: CanvasRenderingContext2D, z: ZoneFrame, look: Parameters<typeof weatherMid>[2] | null, rain: number, vision: boolean,d:FrameDirector|undefined,deferred:{mid:(()=>void)[];actors:(()=>void)[];shade:(()=>void)[];weather:(()=>void)[];vision:(()=>void)[]}) {
  const s = z.scene, amb = s.ambient ?? {}, left = z.view.sx(0), right = z.view.sx(s.width), v:View={...z.view,zoneWindow:{left,right}};
  if(z.weather&&amb.weather&&passOn(d,'weather')){const weather=z.weather();look={w:weather,t:v.t,still:!!v.reduced,day:v.lighting.daylight,covers:amb.covers?.map(c=>[v.sx(c.from),v.sx(c.to),v.y(c.under)] as [number,number,number])};}
  if((right<=0||left>=v.viewW)&&!s.artworkVisible?.(v,z.host.model as SceneHost['model']))return;
  // A set row may still be on screen when the logical zone rect has just left it.
  x.save();
  if (amb.city) s.artworkFrame?.city?.(x, v);
  if (amb.street) s.artworkFrame?.street?.(x, v, rain, !!amb.city);
  const ownVision=vision&&z.host.visionOn;
  if(ownVision&&s.layers){drawZoneHost(x,v,z,'world');const devices=()=>{if(!v.sharedLayers)inZoneWindow(x,v,()=>muteWorld(x,v));drawZoneHost(x,{...v,sharedLayers:false},z,'devices');};if(v.sharedLayers)deferred.vision.push(devices);else devices();}
  else drawZoneHost(x,v,z);
  const effects={
    mid:()=>{if(look&&amb.weather&&passOn(d,'weather'))inZoneWindow(x,v,()=>{puddles(x,v,look!,{width:s.width,seed:z.sceneId.length*97+s.width,lights:amb.city?s.artworkFrame?.reflections:undefined});weatherMid(x,v,look!);});if(!vision&&passOn(d,'casters'))inZoneWindow(x,v,()=>drawCasters(x,v,s.casters));},
    actors:()=>{if(passOn(d,'actors'))s.drawActors?.(x,v);},
    shade:()=>{if(!vision&&passOn(d,'shade'))inZoneWindow(x,v,()=>drawShade(x,v));},
    weather:()=>{if(z.weather&&look&&amb.weather&&!vision)inZoneWindow(x,v,()=>weatherFront(x,v,look!));},
  };
  for(const key of ['mid','actors','shade','weather'] as const)if(v.sharedLayers)deferred[key].push(effects[key]);else effects[key]();
  if(vision&&!(ownVision&&s.layers)){const wash=()=>inZoneWindow(x,v,()=>muteWorld(x,v,ownVision?z.host.model.spots():undefined));if(!v.sharedLayers)wash();}
  x.restore();
}

/** Effects belong to the zone; artwork rows decide their own overhang. */
function inZoneWindow(x:CanvasRenderingContext2D,v:View,draw:()=>void){
 const window=v.zoneWindow;if(!window||(window.left<=0&&window.right>=v.viewW)){draw();return;}
 x.save();x.beginPath();x.rect(window.left,0,window.right-window.left,v.viewH);x.clip();try{draw();}finally{x.restore();}
}

/** A model can outlive the chunk UI; both use the same scene painting inside this renderer. */
function drawZoneHost(ctx:CanvasRenderingContext2D,view:View,zone:Pick<ZoneFrame,'scene'|'host'>,layer:Parameters<SceneHost['draw']>[2]='all'){
 if(zone.host.draw)zone.host.draw(ctx,view,layer);else zone.scene.drawBackdrop(ctx,view,{m:zone.host.model,hover:null,layer});
}
