/** The coast glide as ordinary zones, composed by the game's one frame. No timeline or gameplay advances here. */
import {art} from '../art';
import {evaluateTimeline,type TimelineFrame} from '../art/core/timeline';
import {frameView,type View} from '../art/core/view';
import {SceneModel} from '../engine/model';
import {emptyData,NO_RULES,type EngineDraw} from '../engine/host';
import {SCENES} from '../scenes';
import type {SceneDef} from '../scenes/kit';
import {backdropDocuments,type BackdropDocument} from '../world/backdrops';
import type {Weather} from '../world/weather';
import {lightAt,type Light} from '../world/light';
import {directorFromTimeline,renderWorldFrame,type ZoneFrame} from './render-scene';
import type {OpeningDocuments} from '../story/title/documents';
import graphSource from '../world/zone-graph.json';
import {sequencePlacements,validateZoneGraph,type ZoneGraphSource} from '../world/zone-graph';

const worldGraph=validateZoneGraph(graphSource);
const inspectionModels=new WeakMap<SceneDef,SceneModel>();
function modelFor(scene:SceneDef){let model=inspectionModels.get(scene);if(!model){const forbidden=()=>{throw new Error('World sequence painting cannot execute gameplay');};model=new SceneModel({say:forbidden,open:forbidden,changed(){}},scene.data??emptyData(scene.id,scene.name),NO_RULES,undefined,undefined,undefined,undefined,scene.gameplay);inspectionModels.set(scene,model);}return model;}
export interface ZoneSequenceOptions {
  width:number;height:number;reduced:boolean;lighting:Light;ambientTime:number;
  playGround?:number;
  frame?:TimelineFrame;scenes?:Readonly<Record<string,SceneDef>>;documents?:ReadonlyMap<string,unknown>;graph?:ZoneGraphSource;backdrops?:ReadonlyMap<string,BackdropDocument>;
}
export function renderZoneSequenceFrame(context:CanvasRenderingContext2D,documents:OpeningDocuments,id:string,time:number,options:ZoneSequenceOptions){
  const frame=options.frame??evaluateTimeline(documents.timeline,id,time,{registry:art,compositions:{[documents.compositionId]:documents.composition}},{reduced:options.reduced});
  const settings=frame.composition.instances.find(n=>n.type==='sequence.world-control');
  if(!settings)throw Error('World sequence requires sequence.world-control settings');
  const props=art.properties(settings.type,settings.props),origin=String(props.origin),zones=props.zones as string[];
  const scenes=options.scenes??SCENES,nativeScale=Math.abs(context.getTransform().a)||1,pixel=Number(props.pixel);
  const placed=sequencePlacements(options.graph??worldGraph,origin,zones,scenes);
  const blend=Math.max(0,Math.min(1,Number(frame.state.sky?.playFit??0))),fit0=Math.max(1,Math.round(Math.min(options.height/Number(props.height),options.width/Number(props.width))*pixel*nativeScale))/nativeScale/pixel;
  const fit=fit0+(1-fit0)*blend,width=options.width/fit,height=options.height/fit;
  const ground0=Math.round(height/pixel*Number(props.ground))*pixel,gy=ground0+((options.playGround??height-54)-ground0)*blend;
  const handoff=documents.timeline.sequences.find(s=>s.id===id)?.handoff,landing=handoff&&scenes[handoff.scene],at=handoff&&placed.get(handoff.scene);
  const cam0=frame.camera.x+(Number(props.width)-width)/2,target=landing&&at?at.dx+landing.spawn-width*.45:cam0,cam=cam0+(target-cam0)*blend,centre=cam+width/2,minute=Number(frame.state.sky?.clock??1075);
  const placements=zones.map(id=>{const scene=scenes[id],at=placed.get(id);if(!scene||!at)throw Error('World sequence zone is missing or unjoined: '+id);return{scene,x:at.dx,h:at.dh};});
  const active=placements.find(z=>centre>=z.x&&centre<z.x+z.scene.width)??placements.at(-1)!;
  const intensity=Number(frame.state.sky?.rain??0),weather:Weather={kind:intensity?'rain':'clear',from:'clear',mix:intensity,cloud:intensity*.8,rain:intensity,storm:0,fog:0,smog:0,heat:0,wet:intensity,wind:intensity*.3};
  const lighting=lightAt(1,minute,active.scene.facing??270,null,true);
  const viewOf=(x:number,h=0):View=>({...frameView(options.ambientTime*60,lighting),viewW:width,viewH:height,cam:cam-x,gy,
    sx:(wx,p=1)=>Math.round(wx-(cam-x)*p),y:height=>Math.round(gy-height-h),flags:{}});
  const hostOf=(scene:SceneDef)=>{const model=modelFor(scene),engine:EngineDraw={m:model,hover:null,layer:'all'};return{visionOn:false,model,draw:(ctx:CanvasRenderingContext2D,v:View)=>scene.drawBackdrop(ctx,v,engine)};};
  const joined:ZoneFrame[]=placements.filter(z=>z!==active&&z.x+z.scene.width>cam-64&&z.x<cam+width+64).map(z=>({scene:z.scene,sceneId:z.scene.id,view:viewOf(z.x,z.h),host:hostOf(z.scene),lighting:()=>lighting,weather:()=>weather}));
  const localFrame={...frame,camera:{...frame.camera,x:cam-active.x,h:frame.camera.h}};
  const director=directorFromTimeline(localFrame,{scale:nativeScale*fit,clock:{minute,day:1},sequence:{time,state:frame.state},passes:{casters:false,actors:false,shade:false,grade:false,lights:false,prompts:false,bubbles:false,vision:false},overlays:{
    fades:frame.fades,cards:frame.text.map(card=>({text:card.text,opacity:1,x:card.x,y:-card.h})),
  }});
  renderWorldFrame({context,scale:nativeScale*fit,view:viewOf(active.x,active.h),scene:active.scene,sceneId:active.scene.id,host:hostOf(active.scene),joined,reduced:options.reduced,clock:options.ambientTime,
    lighting:()=>lighting,weather:()=>weather,backdrops:options.backdrops??backdropDocuments(options.documents),director});
  return frame;
}
