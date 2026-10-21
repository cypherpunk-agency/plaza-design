import type {Resolved,Value} from '../../../art/core/composition';
import type {View} from '../../../art/core/view';
import type {TrainLayout,TrainRoof} from '../../../art/assemblies/train-interior';
import {trainFrameValue,type TrainFrame,type TrainVisualState,type TrainRiderVisual} from '../../../art/assemblies/train-elements';
import type {RiderKind} from '../../../art/characters/riders';
import type {Character} from '../../../runtime/characters';
import * as defaultMetro from '../../../world/transport/line';
import type {LineSystem} from '../../../world/transport/line';
import type {CityModel} from '../../../world/city';
import {light} from '../../../world/light';
import {openingState} from '../../../story/opening';
import {prepareActor} from '../actor-frame';
import {transitActorBindings} from '../transit-actors';
import type {SceneDocument} from '../scene-document';
import type {BindingContext} from '../binding-sources';
import {provide} from '../binding-keys';
/**
 * `train.*`: what the metro car paints from the ride, for the scene that names the `lineRide`
 * mechanism (mechanisms/line-ride.ts), which keeps the car's layout and each frame's prepared
 * state in the scene's shared state.
 *
 * - `train.frame`: the prepared frame (layout, ride and line state, roof, windows, doors, riders).
 * - `train.<window>.width`: a window frame's width, for the seat artwork that follows it.
 * - `train.pose.<actor>`: each source actor's prepared rider (the crowd depends on the ride).
 *
 * The car's fittings come from artwork roles (ceiling, roof, news, windowStyle, lineMap, handrail,
 * staff, gangway, gangDoor, brake) and from rows of the train artwork types, so moving the artwork
 * moves the fitting.
 */
export const TRAIN_LAYOUT_KEY='trainLayout',TRAIN_FRAME_KEY='trainFrame';
const value=(v:unknown)=>v as Value;
export interface TrainScenery {source:SceneDocument;rows:readonly Resolved[];roles:Readonly<Record<string,Resolved>>;actors:Readonly<Record<string,Character>>;layout:TrainLayout}
/** The car as artwork lays it out; `width` and `spawn` are the scene's. */
export function trainLayoutOf(source:SceneDocument,rows:readonly Resolved[],roles:Readonly<Record<string,Resolved>>,width:number,spawn:number):TrainLayout{
 const get=(id:string)=>rows.find(r=>r.instance.id===id)!,x=(id:string)=>get(id).placement.x,of=(type:string)=>rows.filter(r=>r.instance.type==='train.'+type),window=roles.windowStyle;
 const people=(source.actors??[]).flatMap(a=>{const r=a.presentation;if(r?.kind!=='rider'||!r.regular)return[];const readable=source.readables?.find(p=>p.id===a.id);return[{id:a.id,kind:r.rider as RiderKind,x:x(a.instance),sit:r.sit??false,name:readable?.name??'PASSENGER',pages:readable?.pages??[]}];});
 return{width,spawn,ceil:roles.ceiling.placement.h,windows:of('windowFrame').map(r=>r.placement.x),winW:Number(window.props.width),win:{h0:Number(window.props.h0),h1:Number(window.props.h1)},doors:of('door').map(r=>r.placement.x),lineMap:roles.lineMap.placement.x,ads:of('advert').map(r=>({x:r.placement.x,text:String(r.props.text)})),adsHome:of('advert').map(r=>String(r.props.homeText)),news:String(roles.news.props.text),people,poles:of('drawPole').filter(r=>r.instance.layer!=='foreground').map(r=>r.placement.x),frontPoles:of('drawPole').filter(r=>r.instance.layer==='foreground').map(r=>r.placement.x),bar:roles.handrail.placement.h,standing:(source.actors??[]).filter(a=>a.presentation?.kind==='rider'&&a.presentation.controller?.kind==='trainCrowd'&&a.presentation.controller.standing).map(a=>x(a.instance)),cams:of('drawCam').map(r=>r.placement.x),staff:roles.staff.placement.x,gangway:roles.gangway.placement.x,gangDoor:roles.gangDoor.placement.x,brake:roles.brake.placement.x};
}
/** The ride and line state the car paints now (the world the game bound, else the line module). */
export function trainVisual(view:View,world?:{metro:LineSystem}):TrainVisualState{return{...(world?.metro??defaultMetro).trainVisualState(),lighting:light(),home:openingState(view.flags)==='home'};}
export interface TrainWorld {metro?:LineSystem;city?:CityModel}
/** One frame of the car: the layout, the ride, the roof, windows, doors and each rider's look. */
export function prepareTrainFrame(sc:TrainScenery,view:View,hover:string|null,visual:TrainVisualState=trainVisual(view),context:TrainWorld={}):TrainFrame{
 const {rows,roles,source,actors,layout:L}=sc,riders:Record<string,TrainRiderVisual>={};
 for(const actor of source.actors??[]){const pose=prepareActor(actors[actor.id],view,{...context,trainAt:visual.ride.at,regulars:L.people});if('kind'in pose&&pose.kind==='rider'){const r=pose.rider;riders[actor.id]={on:pose.visible,kind:r.kind,sit:r.sit,flip:r.flip,phase:r.phase,offset:r.offset};}}
 const roof=roles.roof.props;
 return{L,visual:structuredClone(visual),hover,roof:{cove:Number(roof.cove),shell:Number(roof.shell),wire:Number(roof.wire),messenger:Number(roof.messenger)} satisfies TrainRoof,windows:rows.filter(r=>r.instance.type==='train.windowFrame').map(r=>({x:r.placement.x,h:r.placement.h,width:Number(r.props.width),h0:Number(r.props.h0),h1:Number(r.props.h1)})),doors:rows.filter(r=>r.instance.type==='train.door').map(r=>({x:r.placement.x,h:r.placement.h})),riders};
}
/** The provider's values for a prepared frame (keys without the `train.` prefix). */
export function trainValues(sc:TrainScenery,view:View,frame:TrainFrame,context:TrainWorld={}):Record<string,Value>{
 const out:Record<string,Value>={frame:value(trainFrameValue(frame))};
 for(const row of sc.rows.filter(r=>r.instance.type==='train.windowFrame'))out[row.instance.id+'.width']=Number(row.props.width);
 for(const[key,v]of Object.entries(transitActorBindings(sc.source,sc.rows,view,{...context,trainAt:frame.visual.ride.at,regulars:frame.L.people},sc.actors)))out[key.replace(/^train\./,'')]=v;
 return out;
}
const provider=(ctx:BindingContext):Record<string,Value>=>{
 const layout=ctx.shared?.get(TRAIN_LAYOUT_KEY) as TrainLayout|undefined;if(!layout)return{};
 const sc:TrainScenery={source:ctx.source,rows:ctx.rows,roles:ctx.roles,actors:ctx.actors,layout},context:TrainWorld={metro:ctx.world?.metro,city:ctx.world?.city};
 const frame=(ctx.shared!.get(TRAIN_FRAME_KEY) as TrainFrame|undefined)??prepareTrainFrame(sc,ctx.view,ctx.engine?.hover??null,trainVisual(ctx.view,ctx.world),context);
 return trainValues(sc,ctx.view,frame,context);
};

export const trainProvider=provide(['frame','<instance:train.windowFrame>.width','pose.<actor>','pose.<actor>.embedded'],provider);
