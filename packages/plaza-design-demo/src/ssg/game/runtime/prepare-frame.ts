import {assetPictureLimits} from '../world/render-settings';
import {sourceProjection} from '../art/core/geometry';
/** Prepare ordinary and temporally directed scene inputs for the single frame renderer. */
import {art} from '../art';
import {drawComposition,resolveComposition,compositionAppearance,type ArtRegistry,type ChunkDocument,type Environment,type AssetInstance,type Properties} from '../art/core/composition';
import {evaluateTimeline,type TimelineFrame,type TimelineProgram} from '../art/core/timeline';
import {frameView,type View} from '../art/core/view';
import {cinematicRegistry,cinematicTimelineContext,cutView,isScreenFade,type CinematicDocuments} from '../art/sequences/cinematics';
import type {SceneModel} from '../engine/model';
import type {EngineDraw} from '../engine/host';
import {SCENES} from '../scenes';
import type {SceneDef} from '../scenes/kit';
import {backdropDocuments,type BackdropDocument} from '../world/backdrops';
import type {Weather} from '../world/weather';
import {lightAt,type Light} from '../world/light';
import {directorFromTimeline,type WorldFrame,type FrameDirector,type ZoneFrame,type WorkspaceCamera,type CameraGuide} from './frame';
import type {OpeningDocuments} from '../story/title/documents';
import {compileGameWorld,worldCompositionContext} from '../world/compiled-world';
import {compileWorldComposition,type WorldCompositions} from '../world/compositions';
import worldCompositionSource from '../world/compositions.json';
import {placementCoordinates,sequencePlacements,type ZoneGraphSource} from '../world/zone-graph';


export interface FrameSource {
  background?:string;
  kind:'sequence';context:CanvasRenderingContext2D;capture?:boolean;
  workspace?:WorkspaceCamera;
  world?:Partial<ZoneSequenceOptions>;
  documents: CinematicDocuments; sequenceId: string;
  /** Pending editor documents in place of the shipping ones. */
  timeline?: TimelineProgram; composition?: ChunkDocument; registry?: ArtRegistry;
  /** An already evaluated timeline frame (the editor's scrub); else evaluated here at `time`. */
  frame?: TimelineFrame;
  scale: number; width: number; height: number; reduced: boolean; lighting: Light;
  /** Sequence seconds. */
  time: number;
  /** The decorative clock (60 per second; default `time` × 60), the flight's progress (0 → 1) and its stand's name. */
  ambient?: number; progress?: number; destination?: string;
  /** The intro's prepared skyline (story/cutscenes/skyline-session.ts). */
  skyline?: View['skyline'];
  /** What the controller adds to the timeline's direction: the letterbox, fades after the timeline's own. */
  director?: FrameDirector;
  /** Draw the timeline's text cards as frame cards (default). A cutscene types them in its bar instead (CutscenePlay). */
  cards?: boolean;
}

const flat = (nodes: readonly AssetInstance[]): AssetInstance[] => nodes.flatMap(n => [n, ...flat(n.children ?? [])]);
const own = (v: object, k: string) => Object.prototype.hasOwnProperty.call(v, k);



export interface ZoneSequenceOptions {
  width:number;height:number;reduced:boolean;lighting:Light;ambientTime:number;
  playGround?:number;workspace?:WorkspaceCamera;flags?:Readonly<Record<string,boolean>>;
  compositions?:WorldCompositions;citySource?:import('../world/city').CitySource;
  /** Pure lookup of resident models, or explicit isolated editor reconstruction. Painting creates none. */
  model?:(id:string)=>SceneModel|undefined;
  frame?:TimelineFrame;scenes?:Readonly<Record<string,SceneDef>>;documents?:ReadonlyMap<string,unknown>;graph?:ZoneGraphSource;backdrops?:ReadonlyMap<string,BackdropDocument>;
}
/** Pure directed-camera layout, also used by the normal lifecycle before painting. */
export function sequenceWorldLayout(documents:OpeningDocuments,id:string,time:number,options:ZoneSequenceOptions,nativeScale:number){
  const referenced=Object.fromEntries([...Object.values(options.scenes??SCENES).flatMap(scene=>scene.artwork?[[scene.artwork.scene,scene.artwork] as const]:[]),...[...(options.backdrops??backdropDocuments(options.documents)).values()].map(doc=>[doc.scene,doc] as const)]);
  const frame=options.frame??evaluateTimeline(documents.timeline,id,time,{registry:art,compositions:{...referenced,...documents.compositions,[documents.timeline.sequences.find(s=>s.id===id)?.composition??documents.compositionId]:documents.composition}},{reduced:options.reduced});
  const settings=frame.composition.instances.find(n=>n.type==='sequence.world-control');
  if(!settings)throw Error('World sequence requires sequence.world-control settings');
  const props=art.properties(settings.type,settings.props),origin=String(props.origin);
  const scenes=options.scenes??SCENES,pixel=Number(props.pixel);
  const zones=sequenceWorldZones(props,scenes,options.compositions);
  const placed=sequencePlacements(options.graph??compileGameWorld(scenes),origin,zones,scenes);
  const state=frame.state[settings.id]??{},blend=Math.max(0,Math.min(1,Number(state.playFit??0))),fit0=Math.max(1,Math.round(Math.min(options.height/Number(props.height),options.width/Number(props.width))*pixel*nativeScale))/nativeScale/pixel;
  let fit=fit0+(1-fit0)*blend,width=options.width/fit,height=options.height/fit;
  const ground0=Math.round(height/pixel*Number(props.ground))*pixel;let gy=ground0+((options.playGround??height-54)-ground0)*blend;
  const handoff=documents.timeline.sequences.find(s=>s.id===id)?.handoff,landing=handoff&&scenes[handoff.scene],at=handoff&&placed.get(handoff.scene);
  const cam0=frame.camera.x+(Number(props.width)-width)/2,target=landing&&at?at.dx+landing.spawn-width*.45:cam0,authoredCam=cam0+(target-cam0)*blend,minute=Number(state.clock??1075);
  const authoredCentre=authoredCam+width/2;
  const cameraScene=zones.map(id=>({scene:scenes[id],at:placed.get(id)!})).find(row=>authoredCentre>=row.at.dx&&authoredCentre<row.at.dx+row.scene.width)?.scene??scenes[zones.at(-1)!];
  return{frame,props,state,origin,zones,scenes,pixel,placed,fit0,fit,width,height,gy,authoredCam,minute,cameraScene};
}
/** Sequence scope follows current composition membership, not a second copy of group members. */
export function sequenceWorldZones(props:Properties,scenes:Readonly<Record<string,SceneDef>>,compositions:WorldCompositions=worldCompositionSource as WorldCompositions){
 if(props.worldComposition&&(props.zones as string[]).length)throw Error('World sequence scope uses a composition or explicit zones, not both');
 // Camera-region precedence follows spatial order, independently of which member the editor
 // opens first. Stable ties retain authored precedence for vertically overlapping chunks.
 return props.worldComposition?compileWorldComposition(compositions,String(props.worldComposition),worldCompositionContext(scenes)).chunks.sort((a,b)=>a.x-b.x).map(c=>c.chunk):props.zones as string[];
}
function prepareWorld(context:CanvasRenderingContext2D,documents:OpeningDocuments,id:string,time:number,options:ZoneSequenceOptions):WorldFrame{
  const nativeScale=Math.abs(context.getTransform().a)||1;
  const basis=options.workspace?.basis;
  const layout=sequenceWorldLayout(documents,id,time,basis?{...options,width:basis.width,height:basis.height}:options,nativeScale);
  const {frame,props,zones,scenes,pixel,placed,fit0,authoredCam,minute,cameraScene}=layout;
  let {fit,width,height,gy}=layout;
  const cameraZoom=frame.camera.zoom,authoredWidth=width/cameraZoom,authoredHeight=height/cameraZoom,authoredLeft=authoredCam+(width-authoredWidth)/2,authoredTop=gy+frame.camera.h-(height-authoredHeight)/2;
  const authoredLayout={width,height,ground:gy};
  let cam=authoredCam,guide:CameraGuide|undefined;


  if(options.workspace){
    let workspace=options.workspace;const basisFit=workspace.basis?1:fit0,baseHeight=workspace.basis?.height??options.height/fit0,baseGround=workspace.basis?.ground??Math.round(baseHeight/pixel*Number(props.ground))*pixel,baseCentreH=baseGround-baseHeight/2,baseCentreX=workspace.anchorX+(workspace.basis?.width??Number(props.width))/2;
    const focus={x:authoredLeft+authoredWidth/2-baseCentreX,h:authoredTop-authoredHeight/2-baseCentreH,zoom:Math.min(options.width/(authoredWidth*basisFit),options.height/(authoredHeight*basisFit))*.9};
    if(workspace.followCamera)workspace={...workspace,...focus};
    fit=basisFit*workspace.zoom;width=options.width/fit;height=options.height/fit;
    cam=baseCentreX-width/2+workspace.x;gy=height/2+baseCentreH+workspace.h;
    guide={x:(authoredLeft-cam)*nativeScale*fit,y:(gy-authoredTop)*nativeScale*fit,width:authoredWidth*nativeScale*fit,height:authoredHeight*nativeScale*fit,scene:cameraScene.id,label:cameraScene.name,focus};
  }
  const centre=cam+width/2;
  const placements=zones.map(id=>{const scene=scenes[id],at=placed.get(id);if(!scene||!at)throw Error('World sequence zone is missing or unjoined: '+id);return{scene,x:at.dx,h:at.dh};});
  const active=(options.workspace?placements.find(z=>z.scene===cameraScene):placements.find(z=>centre>=z.x&&centre<z.x+z.scene.width))??placements.at(-1)!;
  const intensity=Number(layout.state.rain??0),weather:Weather={kind:intensity?'rain':'clear',from:'clear',mix:intensity,cloud:intensity*.8,rain:intensity,storm:0,fog:0,smog:0,heat:0,wet:intensity,wind:intensity*.3};
  const lighting=lightAt(1,minute,cameraScene.facing??270,null,true);
  const viewOf=(x:number,h=0):View=>{
    const base={...frameView(options.ambientTime*60,lighting),worldZones:placementCoordinates(placed,{dx:x,dh:h},scenes),viewW:width,viewH:height,gy,
      ...sourceProjection({cam,gy},{dx:x,dh:h},1,options.workspace?.anchorX??cam,true),flags:options.flags??{}};
    if(!options.workspace)return base;
    const ground=authoredLayout.ground+frame.camera.h;
    const cameraView:View={...base,viewW:authoredLayout.width,viewH:authoredLayout.height,gy:ground,
      ...sourceProjection({cam:authoredCam,gy:ground},{dx:x,dh:h},1,authoredCam,true)};
    return{...base,cameraFrame:{view:cameraView,x:authoredCam-cam,y:gy-ground}};
  };
  const modelAt=(scene:SceneDef)=>options.model?.(scene.id);
  const hostOf=(scene:SceneDef)=>{const model=modelAt(scene);if(!model)throw Error('Directed frame is missing a resident model: '+scene.id);const engine:EngineDraw={m:model,hover:null,layer:'all'};return{visionOn:false,model,draw:(ctx:CanvasRenderingContext2D,v:View)=>scene.drawBackdrop(ctx,v,engine)};};
  const joined:ZoneFrame[]=placements.filter(z=>z!==active&&(z.x+z.scene.width>cam&&z.x<cam+width||z.scene.artworkVisible?.(viewOf(z.x,z.h),modelAt(z.scene)))).map(z=>({scene:z.scene,sceneId:z.scene.id,view:viewOf(z.x,z.h),host:hostOf(z.scene),lighting:()=>lighting,weather:()=>weather}));
  // World camera height follows the game's height-up coordinates. The director's
  // picture offset has the opposite sign; it is not another world-space height.
  const localFrame={...frame,camera:{...frame.camera,x:cam-active.x,h:options.workspace?0:-frame.camera.h,zoom:options.workspace?1:frame.camera.zoom}};
  const director=directorFromTimeline(localFrame,{scale:nativeScale*fit,clock:{minute,day:1},sequence:{time,state:frame.state,artwork:frame.artwork},rendering:documents.timeline.sequences.find(s=>s.id===id),overlays:{
    fades:frame.fades,cards:frame.text.map(card=>({text:card.text,opacity:1,x:card.x,y:-card.h})),
  }});
  if(options.workspace)director.overlays={fades:[],cards:[]};
  return {citySource:options.citySource,worldCompositions:options.compositions,compositionId:String(props.worldComposition||'')||undefined,cameraGuide:guide,workspaceScale:options.workspace?nativeScale*fit:undefined,evaluation:frame,context,scale:nativeScale*fit,view:viewOf(active.x,active.h),scene:active.scene,sceneId:active.scene.id,host:hostOf(active.scene),joined,reduced:options.reduced,clock:options.ambientTime,
    lighting:()=>lighting,weather:()=>weather,backdrops:options.backdrops??backdropDocuments(options.documents),director};
}

function prepareComposition(ctx: CanvasRenderingContext2D, o: FrameSource): WorldFrame {
  const timeline = o.timeline ?? o.documents.timeline, sequence = timeline.sequences.find(s => s.id === o.sequenceId);
  if (!sequence) throw new Error(`Unknown cinematic: ${o.sequenceId}`);
  const composition = o.composition ?? o.documents.compositions[sequence.composition], registry = o.registry ?? cinematicRegistry;
  const W = o.workspace?.basis?.width??o.width, H = o.workspace?.basis?.height??o.height, ambient = o.ambient ?? o.time * 60;
  const context = cinematicTimelineContext(cutView(W, H, o.reduced, o.lighting), { timeline, compositions: { ...o.documents.compositions, [sequence.composition]: composition } }, { sequenceId: o.sequenceId, ambient, ...(o.progress !== undefined ? { progress: o.progress } : {}), ...(o.registry ? { registry: o.registry } : {}) });
  const frame = o.frame ?? evaluateTimeline(timeline, o.sequenceId, o.time, context, { reduced: o.reduced });
  const nodes = flat(frame.composition.instances);
  // the frame's inputs each cinematic piece declares (its clock, motion preference, viewport, the flight's stand)
  const inputs: Properties = { time: o.time, ambient, reduced: o.reduced, width: W, height: H, cameraX:o.workspace?.anchorX??frame.camera.x, place: o.destination ?? '' };
  const state: Record<string, Properties> = {};
  for (const node of nodes) {
    const fields = node.type.startsWith('sequence.') ? registry.get(node.type).visualFields ?? {} : {};
    const given = Object.fromEntries(Object.entries(inputs).filter(([k]) => own(fields, k)));
    if (Object.keys(given).length || frame.state[node.id]) state[node.id] = { ...given, ...frame.state[node.id] };
  }
  // the black screen fades are the frame's fade overlays, under the timeline's own; the world leaves them out
  const fadeIds = nodes.filter(n => isScreenFade(n.type)).map(n => n.id), visibility = { ...frame.visibility, ...Object.fromEntries(fadeIds.map(id => [id, false])) };
  const view: View = { ...frameView(ambient, o.lighting), viewW: o.workspace?o.width:W, viewH: o.workspace?o.height:H, cam: 0, gy: 0, t: ambient, flags: {}, sx: x => x, y: h => -h, ...(o.skyline ? { skyline: o.skyline } : {}) };
  const env = (v: View): Environment => ({ view: v, state, visibility, opacity: frame.opacity, clips: frame.clips, sequenceTime: o.time, reduced: o.reduced, lighting: v.lighting });
  const fades: { color: string; opacity: number }[] = [];
  if (fadeIds.length) {
    const appearance = compositionAppearance(frame.composition, { visibility: frame.visibility, opacity: frame.opacity });
    for (const row of resolveComposition(registry, frame.composition, env(view))) {
      const look = appearance.get(row.instance.id)!, amount = Number(row.state.amount ?? 0);
      if (isScreenFade(row.instance.type) && look.visible && look.opacity > 0 && amount > 0) fades.push({ color: 'rgba(0,0,0,' + Math.min(1, amount) + ')', opacity: look.opacity });
    }
  }
  const scene: SceneDef = { id: composition.scene, name: sequence.id, width: W, spawn: 0, exits: [], ambient: {}, visualEnvironment:(v)=>env(v), drawBackdrop: (x, v) => drawComposition(x, registry, frame.composition, env(v), 'backdrop') };
  const timed = directorFromTimeline(frame), extra = o.director ?? {};
  const director: FrameDirector = { ...timed, ...extra, rendering:sequence,
    overlays: { fades: [...fades, ...timed.overlays!.fades!, ...extra.overlays?.fades ?? []], cards: o.cards === false ? extra.overlays?.cards ?? [] : [...timed.overlays!.cards!, ...extra.overlays?.cards ?? []], ...(extra.overlays?.letterbox ? { letterbox: extra.overlays.letterbox } : {}) } };
  let cameraGuide:CameraGuide|undefined;
  let workspaceScale:number|undefined;
  if(o.workspace){let w=o.workspace;const z=frame.camera.zoom,aw=W/z,ah=H/z,left=frame.camera.x+(W-aw)/2,top=-frame.camera.h-(H-ah)/2;
    const focus={x:left+aw/2-(w.anchorX+W/2),h:top-ah/2-(-w.anchorH-H/2),zoom:Math.min(o.width/aw,o.height/ah)*.9};if(w.followCamera)w={...w,...focus};
    const camX=w.anchorX+w.x+(W-o.width)/2,camH=w.anchorH-w.h+(H-o.height)/2;workspaceScale=o.scale*w.zoom;
    cameraGuide={x:((left-camX-o.width/2)*w.zoom+o.width/2)*o.scale,y:((-top-camH-o.height/2)*w.zoom+o.height/2)*o.scale,width:aw*w.zoom*o.scale,height:ah*w.zoom*o.scale,scene:composition.scene,label:sequence.id,focus};
    director.camera={x:camX,h:camH,zoom:w.zoom};director.overlays={cards:[],fades:[]};
  }
  return {unavailablePasses:assetPictureLimits,cameraGuide,workspaceScale, evaluation:frame, context: ctx, scale: o.scale, view, scene, sceneId: scene.id, reduced: o.reduced, clock: ambient,
    host: { visionOn: false, model: { spots: () => [] } as never, draw: (x, v) => scene.drawBackdrop(x, v, {} as never) },
    weather: () => { throw new Error('A sequence has no weather pass'); }, lighting: () => o.lighting, director };
}

export function prepareFrame(input:WorldFrame|FrameSource):WorldFrame{
  if(!('kind' in input))return input;
  const o=input,sequence=(o.timeline??o.documents.timeline).sequences.find(s=>s.id===o.sequenceId);
  if(!sequence)throw Error('Unknown sequence '+o.sequenceId);
  const composition=o.composition??o.documents.compositions[sequence.composition];
  if(composition.instances.some(n=>n.type==='sequence.world-control')){
    const frame=prepareWorld(o.context,{timeline:o.timeline??o.documents.timeline,compositionId:sequence.composition,composition,compositions:o.documents.compositions},o.sequenceId,o.time,{...o.world,workspace:o.workspace,frame:o.frame,width:o.width,height:o.height,reduced:o.reduced,lighting:o.lighting,ambientTime:o.world?.ambientTime??o.ambient??o.time});frame.capture=o.capture;frame.background=o.background;return frame;
  }
  const frame=prepareComposition(o.context,o);frame.capture=o.capture;frame.background=o.background;return frame;
}
