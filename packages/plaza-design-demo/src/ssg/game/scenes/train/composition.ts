import {resolveArtworkRoles} from '../../engine/gameplay/artwork-roles';
import {projectDeviceBindings} from '../../engine/gameplay/device-bindings';
import {transitActors,transitActorBindings,validateTransitActorNode} from '../metro/transit-actors';
import {prepareActor} from '../../engine/gameplay/actor-frame';
import type {Character} from '../../runtime/characters';
import type {CityModel} from '../../world/city';
import {content,transitBindingGroups} from './scene-document';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import {manifestGeometry} from '../../engine/gameplay/manifest-geometry';
import type {LineSystem} from '../../world/transport/line';
import { frameView } from '../../art/core/view';
/** Canonical train composition, geometry, immutable ride/rider frame and scene adapter. */
import { art } from '../../art';
import { drawComposition,resolveComposition,type Composition,type Environment,type Value } from '../../art/core/composition';
import type { View } from '../../art/core/view';
import type { TrainLayout,TrainRoof } from '../../art/assemblies/train-interior';
import { trainFrameValue,type TrainFrame,type TrainVisualState,type TrainRiderVisual } from '../../art/assemblies/train-elements';
import {type RiderKind } from '../../art/characters/riders';
import { trainVisualState } from '../../world/transport/line';
import { light } from '../../world/light';
import { openingState } from '../../story/opening';
import type { EngineDraw } from '../../engine';
import type { SceneDef } from '../kit';
import source from './composition.json';
export type TrainRenderOptions=Partial<Pick<Environment,'visibility'|'opacity'|'clips'|'sequenceTime'|'reduced'>> & {visual?:TrainVisualState;metro?:LineSystem;city?:CityModel};
export const trainMarkerPolicy={exitAxes:['x'] as const,description:'Exit triggers use horizontal geometry. Brake device and passenger markers follow their local composition placements.'};
const geometryView:View={...frameView(0),sx:x=>x,y:h=>-h,gy:0,cam:0,t:0,viewW:960,viewH:360,flags:{}};
function flatten(nodes:Composition['instances']):Composition['instances']{return nodes.flatMap(n=>[n,...flatten(n.children??[])]);}
function defaults(doc:Composition){const out:Record<string,Value>={};for(const n of flatten(doc.instances))for(const[k,b]of Object.entries(n.bindings??{}))out[b]=art.get(n.type).visualFields![k].default;return out;}
export function trainGeometry(doc:Composition=trainComposition){return resolveComposition(art,doc,{view:geometryView,state:{},bindings:defaults(doc),reduced:false});}
export function validateTrainComposition(input:unknown):Composition{const doc=art.validate(input);if(doc.scene!=='train')throw new Error('Expected train composition');for(const n of flatten(doc.instances)){if(validateTransitActorNode('train',n))continue;for(const b of Object.values(n.bindings??{})){if(b==='train.frame')continue;const ref=b.match(/^train\.([-a-zA-Z0-9_.]+)\.width$/)?.[1];if(!ref||!flatten(doc.instances).some(row=>row.id===ref&&row.type==='train.windowFrame'))throw new Error(n.id+': unknown train binding '+b);}if(n.type==='train.windowFrame'&&(!(Number(n.props.width)>6)||!(Number(n.props.h1)>Number(n.props.h0)+6)))throw new Error(n.id+': invalid window opening');}return doc;}
export const trainComposition=validateTrainComposition(source);
export function trainArtworkRoles(doc:Composition=trainComposition,sceneDocument:SceneDocument=content.scene,rows=trainGeometry(doc)){const roles=resolveArtworkRoles('train',sceneDocument.manifest?.artwork,rows);for(const role of ['ceiling','roof','news','windowStyle','lineMap','handrail','staff','gangway','gangDoor','brake'])if(!roles[role])throw Error('Train requires artwork role '+role);if(Number(roles.windowStyle.props.h1)<=Number(roles.windowStyle.props.h0)+6||Number(roles.windowStyle.props.width)<=6)throw Error('Train requires a valid window style');return roles;}
export function trainLayout(doc:Composition=trainComposition,sceneDocument:SceneDocument=content.scene):TrainLayout{
 const rows=trainGeometry(doc),ordinary=manifestGeometry(sceneDocument,rows,transitBindingGroups,{groundExits:false}),get=(id:string)=>rows.find(r=>r.instance.id===id)!,x=(id:string)=>get(id).placement.x,of=(type:string)=>rows.filter(r=>r.instance.type==='train.'+type),roles=trainArtworkRoles(doc,sceneDocument,rows),window=roles.windowStyle;
 const people=(sceneDocument.actors??[]).flatMap(a=>{const r=a.presentation;if(r?.kind!=='rider'||!r.regular)return[];const readable=sceneDocument.readables?.find(p=>p.id===a.id);return[{id:a.id,kind:r.rider as RiderKind,x:x(a.instance),sit:r.sit??false,name:readable?.name??'PASSENGER',pages:readable?.pages??[]}];});
 return{width:ordinary.width,spawn:ordinary.spawn,ceil:roles.ceiling.placement.h,windows:of('windowFrame').map(r=>r.placement.x),winW:Number(window.props.width),win:{h0:Number(window.props.h0),h1:Number(window.props.h1)},doors:of('door').map(r=>r.placement.x),lineMap:roles.lineMap.placement.x,ads:of('advert').map(r=>({x:r.placement.x,text:String(r.props.text)})),adsHome:of('advert').map(r=>String(r.props.homeText)),news:String(roles.news.props.text),people,poles:of('drawPole').filter(r=>r.instance.layer!=='foreground').map(r=>r.placement.x),frontPoles:of('drawPole').filter(r=>r.instance.layer==='foreground').map(r=>r.placement.x),bar:roles.handrail.placement.h,standing:(sceneDocument.actors??[]).filter(a=>a.presentation?.kind==='rider'&&a.presentation.controller?.kind==='trainCrowd'&&a.presentation.controller.standing).map(a=>x(a.instance)),cams:of('drawCam').map(r=>r.placement.x),staff:roles.staff.placement.x,gangway:roles.gangway.placement.x,gangDoor:roles.gangDoor.placement.x,brake:roles.brake.placement.x};
}
export function prepareTrainFrame(doc:Composition,view:View,hover:string|null,visual:TrainVisualState={...trainVisualState(),lighting:light(),home:openingState(view.flags)==='home'},sceneDocument:SceneDocument=content.scene,actors:Readonly<Record<string,Character>>=transitActors(sceneDocument,trainGeometry(doc)),context:Pick<TrainRenderOptions,'metro'|'city'>={}):TrainFrame{
 const rows=trainGeometry(doc),L=trainLayout(doc,sceneDocument),riders:Record<string,TrainRiderVisual>={},windows=rows.filter(r=>r.instance.type==='train.windowFrame');
 for(const actor of sceneDocument.actors??[]){const pose=prepareActor(actors[actor.id],view,{...context,trainAt:visual.ride.at,regulars:L.people});if('kind'in pose&&pose.kind==='rider'){const r=pose.rider;riders[actor.id]={on:pose.visible,kind:r.kind,sit:r.sit,flip:r.flip,phase:r.phase,offset:r.offset};}}
 const roof=trainArtworkRoles(doc,sceneDocument,rows).roof.props;
 return{L,visual:structuredClone(visual),hover,roof:{cove:Number(roof.cove),shell:Number(roof.shell),wire:Number(roof.wire),messenger:Number(roof.messenger)} satisfies TrainRoof,windows:windows.map(r=>({x:r.placement.x,h:r.placement.h,width:Number(r.props.width),h0:Number(r.props.h0),h1:Number(r.props.h1)})),doors:rows.filter(r=>r.instance.type==='train.door').map(r=>({x:r.placement.x,h:r.placement.h})),riders};
}
export function trainEnvironment(doc:Composition,view:View,frame:TrainFrame,sceneDocument:SceneDocument=content.scene,actors?:Readonly<Record<string,Character>>,options:TrainRenderOptions={}):Environment{const b=defaults(doc);Object.assign(b,transitActorBindings(sceneDocument,trainGeometry(doc),view,{metro:options.metro,city:options.city,trainAt:frame.visual.ride.at,regulars:frame.L.people},actors));b['train.frame']=trainFrameValue(frame);for(const row of trainGeometry(doc).filter(r=>r.instance.type==='train.windowFrame'))b['train.'+row.instance.id+'.width']=Number(row.props.width);return{view,state:{},bindings:b,reduced:false};}
export function drawTrainComposition(ctx:CanvasRenderingContext2D,view:View,frame:TrainFrame,pass:'backdrop'|'foreground',doc=trainComposition,state:Environment['state']={},options:TrainRenderOptions={},sceneDocument:SceneDocument=content.scene,actors?:Readonly<Record<string,Character>>){const{visual:_visual,metro:_metro,city:_city,...renderOptions}=options;drawComposition(ctx,art,doc,{...trainEnvironment(doc,view,frame,sceneDocument,actors,options),state,...renderOptions},pass);}
export function adaptTrain(scene:Omit<SceneDef,'drawBackdrop'|'drawFront'>,doc=trainComposition,state:Environment['state']={},options:TrainRenderOptions={},sceneDocument:SceneDocument=content.scene):SceneDef{
 const document=validateTrainComposition(doc),actors=transitActors(sceneDocument,trainGeometry(document));trainArtworkRoles(document,sceneDocument);let prepared:TrainFrame|undefined;
 const sample=(v:View,e:EngineDraw)=>prepareTrainFrame(document,v,e.hover,options.visual??(options.metro?{...options.metro.trainVisualState(),lighting:light(),home:openingState(v.flags)==='home'}:undefined),sceneDocument,actors,options);
 return{...scene,people:(sceneDocument.actors??[]).filter(a=>a.band==='world').map(a=>actors[a.id]),data:scene.data?projectDeviceBindings(sceneDocument,trainGeometry(document),scene.data,scene.width):undefined,preparePresentation:(v,e)=>{prepared=sample(v,e);},visualEnvironment:(v,e)=>trainEnvironment(document,v,prepared??sample(v,e),sceneDocument,actors,options),drawBackdrop:(ctx,v,e)=>drawTrainComposition(ctx,v,prepared??sample(v,e),'backdrop',document,state,options,sceneDocument,actors),drawFront:(ctx,v)=>drawTrainComposition(ctx,v,prepared??prepareTrainFrame(document,v,null,options.visual??(options.metro?{...options.metro.trainVisualState(),lighting:light(),home:openingState(v.flags)==='home'}:undefined),sceneDocument,actors,options),'foreground',document,state,options,sceneDocument,actors)};
}
