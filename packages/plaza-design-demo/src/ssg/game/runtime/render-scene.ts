import {copyTransform} from '../art/core/geometry';
import {inCameraSpace} from '../art/core/camera-space';
import {prepareFrame,type FrameSource} from './prepare-frame';
import {perfBegin,perfEnd} from './diagnostics/performance';
import {drawTimelineOverlay} from '../art/core/timeline-overlay';
/** Shared native frame orchestration. Game and composer provide state, never duplicate artwork. */
import type { View } from '../art/core/view';

import type { SceneHost } from '../engine/host';
import type {SceneDef} from '../scenes/kit';


import { clearWorld } from '../art/core/canvas';
import { drawSky } from '../art/environment/sky';
import { puddles, weatherFront, weatherMid, weatherSky } from '../art/atmosphere/weather';
import { createLightingFrame, drawCasters, drawGrade, drawLights, drawShade } from '../art/atmosphere/lighting';
import { muteWorld } from '../art/atmosphere/hack-vision';
import { beginLayeredFrame, endLayeredFrame, flushLayeredSlot } from '../art/core/composition';
import { lightAt } from '../world/light';

import {art,drawCompositionSlot} from '../art';
import {backdropDocuments,type BackdropDocument} from '../world/backdrops';

import {type FrameDirector,type WorldFrame,type ZoneFrame} from './frame';
import {renderPolicy} from '../world/render-policy';
import {source as defaultCitySource} from '../world/city';
import type {RenderPass} from '../world/render-settings';
const passOn=(view:View,pass:RenderPass)=>view.rendering?.values[pass]!==false;
/** The one frame renderer, for a scene alone or with the zones joined to it (docs/design/SEAMLESS-WORLD.md §3). */
export function renderWorldFrame(input:WorldFrame|FrameSource){const frame=prepareFrame(input),span=perfBegin('render.total',frame.sceneId);try{renderMeasuredFrame(frame);return frame;}finally{endLayeredFrame();perfEnd(span);}}
function renderMeasuredFrame(frame: WorldFrame) {
  let pass=perfBegin('render.prepare');
  frame.artwork=frame.capture?[]:undefined;frame.helpers=frame.capture?[]:undefined;
  beginLayeredFrame(frame.artwork?row=>frame.artwork!.push(row):undefined,frame.helpers?row=>frame.helpers!.push(row):undefined);
  const d = frame.director, x = frame.context, k = d?.scale ?? frame.scale, s = frame.scene, zh = frame.host, amb = s.ambient ?? {};
  x.setTransform(k, 0, 0, k, 0, 0);
  const v = { ...(d?.camera ? directedView(frame.view, d.camera) : frame.view), zoneWindow: undefined as View['zoneWindow'],reduced:frame.reduced };
  clearWorld(x, v.viewW, v.viewH,frame.background);
  const zoom = d?.camera?.zoom ?? 1;
  if (zoom !== 1) { x.translate(v.viewW / 2, v.viewH / 2); x.scale(zoom, zoom); x.translate(-v.viewW / 2, -v.viewH / 2); }
  const joined=(frame.joined??[]).map(z=>({...z,view:{...(d?.camera?directedView(z.view,{...d.camera,x:z.view.cam+d.camera.x-frame.view.cam}):z.view),reduced:frame.reduced,...(d?.sequence?{sequence:d.sequence}:{})}}));
  const travelling=(frame.mobiles??[]).map(z=>({...z,view:{...z.view,reduced:frame.reduced}}));
  const policy=(scene:typeof s)=>renderPolicy(scene,frame.citySource??defaultCitySource,frame.worldCompositions,d?.rendering,frame.compositionId,frame.unavailablePasses);
  v.rendering=policy(s);v.weatherSource=frame.citySource??defaultCitySource;
  for(const z of [...joined,...travelling]){z.view.rendering=policy(z.scene);z.view.weatherSource=v.weatherSource;}
  const split=!!(joined.length||travelling.length);
  if(split){v.artworkScope='static';for(const z of joined)z.view.artworkScope='static';}
  const vision = (zh.visionOn&&passOn(v,'vision')) || [...joined,...travelling].some(z=>z.host.visionOn&&passOn(z.view,'vision'));
  const ordered=split, deferred:{mid:(()=>void)[];actors:(()=>void)[];shade:(()=>void)[];weather:(()=>void)[];vision:(()=>void)[]}={mid:[],actors:[],shade:[],weather:[],vision:[]};
  v.sharedLayers=ordered;for(const z of [...joined,...travelling])z.view.sharedLayers=ordered;
  if(d?.sequence)v.sequence=d.sequence;
  const W = amb.weather && passOn(v, 'weather') ? frame.weather() : null;
  const covers = amb.covers?.map(c => [v.sx(c.from), v.sx(c.to), v.y(c.under)] as [number, number, number]);
  // each joined zone is lit by its own facing; the scene's light is installed last, as it is the one the frame shares
  for (const z of [...joined,...travelling]) { const weather=z.scene.ambient?.weather&&passOn(z.view,'weather')?(z.weather?.()??W):null,given=z.lighting(weather),ZL=d?.clock?lightAt(d.clock.day??given.day,d.clock.minute,given.facing,weather,given.outdoor):given; z.view.lighting = ZL; z.view.illumination = createLightingFrame(ZL, z.scene.lights, ZL.outdoor ? z.scene.shade : undefined, z.scene.width, true); z.preparePresentation?.(z.view); }
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
  const casters = !vision && passOn(v, 'casters'), shade = !vision && passOn(v, 'shade');
  perfEnd(pass);pass=perfBegin('render.world');
  const backdrops = frame.backdrops ?? backdropDocuments();
  const seenBackdrops = new Set<string>(),backdropFrames:{doc:BackdropDocument;view:View}[]=[];
  for(const zone of [{scene:s,view:v},...joined]){
    const ref=zone.scene.backdrop;if(!ref||seenBackdrops.has(ref.id))continue;
    const doc=backdrops.get(ref.id);if(!doc)throw new Error('Missing world backdrop '+ref.id);seenBackdrops.add(ref.id);
    const local=zone.view;
    const offset=(v:View):View=>({...v,zoneWindow:undefined,artworkScope:undefined,sharedLayers:false,cam:v.cam+ref.x,sx:(wx,p=1)=>v.sx(wx-ref.x*p,p),y:h=>v.y(h-(ref.h??0))});
    const view=offset(local);if(local.cameraFrame)view.cameraFrame={...local.cameraFrame,view:offset(local.cameraFrame.view)};backdropFrames.push({doc,view});
  }
  if(frame.capture){const transform=copyTransform(x.getTransform()),viewport={width:v.viewW*k,height:v.viewH*k};frame.inspection=[{scene:s,view:v},...joined.map(z=>({scene:z.scene,view:z.view})),...travelling.map(z=>({scene:z.scene,view:z.view}))].map(scope=>({...scope,rendering:scope.view.rendering!,transform,viewport}));}
  if (amb.sky && passOn(v, 'sky')) {
    const backdropSky=backdropFrames.find(({doc})=>doc.instances.some(n=>n.type==='environment.sky'));
    const sourceSky=s.artwork?.instances.some(n=>n.type==='environment.sky');
    if(backdropSky)inCameraSpace(x,backdropSky.view,camera=>drawCompositionSlot(x,art,backdropSky.doc,{view:camera,reduced:frame.reduced,state:{}},'behind-player',r=>r.element.type==='environment.sky','sky'));
    else if(sourceSky){const env=s.visualEnvironment?.(v,{m:zh.model,hover:null,layer:'all'})??{view:v,reduced:frame.reduced,state:{}};drawCompositionSlot(x,art,s.artwork!,env,'behind-player',r=>r.element.type==='environment.sky','sky');}
    else drawSky(x,v,L,{horizon:v.y(s.horizon??0)});
    if (look) atmosphere(x,v,(camera,weather)=>weatherSky(x,camera,weather));
    inCameraSpace(x,v,view=>s.drawSkyArtwork?.(x,{...view,skyCam:view.cam+(s.backdrop?.x??0)}));
    for(const {doc,view} of backdropFrames)inCameraSpace(x,view,camera=>drawCompositionSlot(x,art,doc,{view:camera,reduced:frame.reduced,state:{}},'behind-player',r=>r.element.type!=='environment.sky','sky'));
  }
  if (amb.city) (s.artworkFrame?.city??frame.city)?.(x, v);
  if (amb.street) (s.artworkFrame?.street??frame.street)?.(x, v, rain, !!amb.city);
  // An independent backdrop paints once through world coordinates, never clipped to a zone's window.
  for (const {doc,view} of backdropFrames) drawCompositionSlot(x,art,doc,{view,reduced:frame.reduced,state:{}},'behind-player');
  v.zoneWindow={left:v.sx(0),right:v.sx(s.width)};
  // a zone below this one (stacked by a stairs seam) is further back: drawn before the zone's own artwork, which stands over it
  for (const z of joined) if (z.below) drawJoined(x, z, look, rain, vision,deferred);
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
  for (const z of joined) if (!z.below) drawJoined(x, z, look, rain, vision,deferred);
  const mobileFrames=split?[{scene:s,view:v,host:zh},...joined,...travelling]:[];
  const mobileView=(z:Pick<ZoneFrame,'view'|'scene'>):View=>({...z.view,artworkScope:'mobile',zoneWindow:{left:z.view.sx(0),right:z.view.sx(z.scene.width)}});
  for(const z of mobileFrames){if(!z.scene.artwork)continue;drawZoneHost(x,mobileView(z),z);}
  // Scene actors contribute composition commands before the shared behind-player flush.
  // Collect both scopes: a person's mobility is independent of the scene's static art.
  if(ordered){
    for(const draw of deferred.actors)draw();
    if(passOn(v,'actors'))s.drawActors?.(x,v);
    for(const z of mobileFrames)if(passOn(z.view,'actors'))z.scene.drawActors?.(x,mobileView(z));
  }
  if(ordered){flushLayeredSlot('behind-player');mid();if(casters)drawCasters(x,v,s.casters);for(const draw of deferred.mid)draw();
    if(vision){
      if(look)atmosphere(x,v,(camera,weather)=>weatherFront(x,camera,{...weather,still:true}));
      const keep=[{host:zh,view:v},...joined,...travelling].flatMap(z=>z.host.visionOn?z.host.model.spots().map(p=>({...p,x:p.x+v.cam-z.view.cam,y:p.y+v.gy-z.view.gy})):[]);
      muteWorld(x,v,keep);
    }
    for(const draw of deferred.vision)draw();
  }
  if(!ordered)for(const draw of deferred.actors)draw();
  perfEnd(pass);pass=perfBegin('render.actors');
  if (passOn(v, 'actors')) {
    frame.roomWash?.(x, v);
    if(!ordered)s.drawActors?.(x, v);
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
  if (!vision) {
    // Resolve the existing horizontal chunk windows in scenery paint order. A pixel receives
    // at most one grade, including where joined windows overlap. No spawning-source clip is
    // applied to a travelling light: its current projected position selects the local policy.
    const scopes=[...joined.filter(z=>z.below),{scene:s,view:v},...joined.filter(z=>!z.below)];
    const windows=postEffectWindows(scopes,v.viewW);
    for(const {zone,left,right}of windows){
      const local=zone.view;
      if(passOn(local,'grade')){
        x.save();x.beginPath();x.rect(left,0,right-left,local.viewH);x.clip();
        try{inCameraSpace(x,local,camera=>{x.save();x.beginPath();x.rect(0,0,camera.viewW,camera.viewH);x.clip();try{drawGrade(x,camera,local.lighting);}finally{x.restore();}});}finally{x.restore();}
      }
    }
    // Static sources keep their authored geometry. Dynamic additions are consumed once,
    // separately, so clipping the scenery cannot cut a headlight at its original chunk edge.
    const dynamic=[{scene:s,view:v},...joined,...travelling].flatMap(zone=>{const lights=zone.view.illumination.extra.map(light=>({light,view:zone.view}));zone.view.illumination.extra=[];return lights;});
    for(const zone of scopes)if(passOn(zone.view,'lights'))inZoneWindow(x,{...zone.view,zoneWindow:{left:zone.view.sx(0),right:zone.view.sx(zone.scene.width)}},()=>drawLights(x,zone.view,zone.scene.lights,zone.view.lighting));
    for(const {light,view}of dynamic){const screen=view.sx(light.x,light.par??1),local=windows.find(w=>screen>=w.left&&screen<w.right)?.zone.view??v;
      if(passOn(local,'lights'))drawLights(x,{...view,illumination:{...view.illumination,extra:[]}},[light],local.lighting);
    }
  }
  for(const draw of deferred.weather)draw();
  if (look && !vision) inZoneWindow(x,v,()=>atmosphere(x,v,(camera,weather)=>weatherFront(x,camera,weather)));
  if (zoom !== 1) x.setTransform(k, 0, 0, k, 0, 0);
  if (passOn(v, 'prompts')) frame.prompts?.(x, v);
  if (passOn(v, 'bubbles')) frame.bubbles?.(x, v);
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
function drawJoined(x: CanvasRenderingContext2D, z: ZoneFrame, look: Parameters<typeof weatherMid>[2] | null, rain: number, vision: boolean,deferred:{mid:(()=>void)[];actors:(()=>void)[];shade:(()=>void)[];weather:(()=>void)[];vision:(()=>void)[]}) {
  const s = z.scene, amb = s.ambient ?? {}, left = z.view.sx(0), right = z.view.sx(s.width), v:View={...z.view,zoneWindow:{left,right}};
  if(z.weather&&amb.weather&&passOn(v,'weather')){const weather=z.weather();look={w:weather,t:v.t,still:!!v.reduced,day:v.lighting.daylight,covers:amb.covers?.map(c=>[v.sx(c.from),v.sx(c.to),v.y(c.under)] as [number,number,number])};}
  rain=look&&amb.weather&&passOn(v,'weather')?look.w.wet:0;
  if((right<=0||left>=v.viewW)&&!s.artworkVisible?.(v,z.host.model as SceneHost['model']))return;
  // A set row may still be on screen when the logical zone rect has just left it.
  x.save();
  if (amb.city) s.artworkFrame?.city?.(x, v);
  if (amb.street) s.artworkFrame?.street?.(x, v, rain, !!amb.city);
  const ownVision=vision&&z.host.visionOn&&passOn(v,'vision');
  if(ownVision&&s.layers){drawZoneHost(x,v,z,'world');const devices=()=>{if(!v.sharedLayers)inZoneWindow(x,v,()=>muteWorld(x,v));drawZoneHost(x,{...v,sharedLayers:false},z,'devices');};if(v.sharedLayers)deferred.vision.push(devices);else devices();}
  else drawZoneHost(x,v,z);
  const effects={
    mid:()=>{if(look&&amb.weather&&passOn(v,'weather'))inZoneWindow(x,v,()=>{puddles(x,v,look!,{width:s.width,seed:z.sceneId.length*97+s.width,lights:amb.city?s.artworkFrame?.reflections:undefined});weatherMid(x,v,look!);});if(!vision&&passOn(v,'casters'))inZoneWindow(x,v,()=>drawCasters(x,v,s.casters));},
    actors:()=>{if(passOn(v,'actors'))s.drawActors?.(x,v);},
    shade:()=>{if(!vision&&passOn(v,'shade'))inZoneWindow(x,v,()=>drawShade(x,v));},
    weather:()=>{if(z.weather&&look&&amb.weather&&passOn(v,'weather')&&!vision)inZoneWindow(x,v,()=>weatherFront(x,v,look!));},
  };
  for(const key of ['mid','actors','shade','weather'] as const)if(v.sharedLayers)deferred[key].push(effects[key]);else effects[key]();
  if(vision&&!(ownVision&&s.layers)){const wash=()=>inZoneWindow(x,v,()=>muteWorld(x,v,ownVision?z.host.model.spots():undefined));if(!v.sharedLayers)wash();}
  x.restore();
}

/** Existing chunk-window ownership; later scenery wins overlap, without double grading. */
function postEffectWindows<T extends{scene:SceneDef;view:View}>(scopes:readonly T[],width:number){
 const claimed:{left:number;right:number}[]=[],result:{zone:T;left:number;right:number}[]=[];
 for(const zone of [...scopes].reverse()){
  const left=Math.max(0,zone.view.sx(0)),right=Math.min(width,zone.view.sx(zone.scene.width));if(right<=left)continue;
  let pieces=[{left,right}];
  for(const covered of claimed)pieces=pieces.flatMap(p=>covered.right<=p.left||covered.left>=p.right?[p]:[...(p.left<covered.left?[{left:p.left,right:covered.left}]:[]),...(p.right>covered.right?[{left:covered.right,right:p.right}]:[])]);
  for(const piece of pieces)result.push({zone,...piece});claimed.push({left,right});
 }
 return result;
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
