import {actorPresentationDefaults,actorPresentationBindings,validateActorPresentationNode} from '../../engine/gameplay/actor-presentation';
import {compileSceneActors} from '../../engine/gameplay/actors';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import type {Character} from '../../runtime/characters';
import sceneSource from './scene.json';
import { frameView } from '../../art/core/view';
/** Yard composition source, pure bindings, and the explicit legacy presentation controller. */
import {art,drawComposition,resolveComposition,type Composition,type Environment,type Instance,type Value} from '../../art';
import {yardVisualFields} from '../../art/assemblies/yard-elements';
import type {YardVisual} from '../../art/assemblies/fixer-yard';
import type {View} from '../../art/core/view';
import type {EngineDraw} from '../../engine/host';
import type {SceneData} from '../../data/types';
import type {SceneModel} from '../../engine/model';
import {light} from '../../world/light';
import document from './composition.json';
export const yardArt=art;
export const yardComposition=art.validate(document);
const flatten=(nodes:Instance[]):Instance[]=>nodes.flatMap(n=>[n,...flatten(n.children??[])]);
const required=['sky','side-walls','passage','camera','crane','hatch','tray','chute','parcel','A-3','B-5','C-7','slot-home','slot-chute','device-cam','device-crane','device-gate'];
export function validateYardComposition(input:unknown):Composition{const doc=art.validate(input);if(doc.scene!=='yard')throw new Error('Expected yard composition');for(const id of required)if(!flatten(doc.instances).some(i=>i.id===id))throw new Error('Missing gameplay-bound Yard instance '+id);for(const i of flatten(doc.instances)){if(i.type==='character.prepared'){validateActorPresentationNode('yard',i);continue;}for(const[k,v]of Object.entries(i.bindings??{}))if(v!=='yard.'+k||!(k in yardVisualFields))throw new Error(i.id+': unknown Yard visual binding '+v);}return doc;}
validateYardComposition(yardComposition);
const defaults=(doc:Composition)=>({...Object.fromEntries(Object.entries(yardVisualFields).map(([k,f])=>['yard.'+k,f.default])),...actorPresentationDefaults('yard',doc)});
const geometryView:View={...frameView(0),sx:x=>x,y:h=>-h,gy:0,cam:0,t:0,viewW:640,viewH:360,flags:{}};
export function yardGeometry(doc:Composition=yardComposition){return resolveComposition(art,doc,{view:geometryView,state:{},bindings:defaults(doc),reduced:false});}
export function yardPlacement(id:string,doc:Composition=yardComposition){const row=yardGeometry(doc).find(r=>r.instance.id===id);if(!row)throw new Error('Unknown Yard instance '+id);return row.placement;}
export function yardWidth(doc:Composition=yardComposition){return Number(yardGeometry(doc).find(r=>r.instance.id==='side-walls')!.props.width);}
export function yardDeviceData(source:SceneData,doc:Composition=yardComposition):SceneData{const result=structuredClone(source);for(const id of ['cam','crane','gate']){const p=yardPlacement('device-'+id,doc),spot=result.devices.find(d=>d.id===id)!.layout!.spot!;spot.x=p.x;if(spot.y!==undefined||p.h!==0)spot.y=p.h;}return result;}
export interface YardPresentationState {hookX:number;hookVisible:boolean}
export const createYardPresentationState=(doc:Composition=yardComposition):YardPresentationState=>({hookX:yardPlacement('slot-home',doc).x,hookVisible:true});
export function yardSlots(doc:Composition=yardComposition):Record<string,number>{return Object.fromEntries(['home','A-3','B-5','C-7','chute'].map(id=>[id,yardPlacement(id==='home'?'slot-home':id==='chute'?'slot-chute':id,doc).x]));}
function parcelPosition(model:SceneModel,hookX:number,doc:Composition):[number,number]|null{const at=model.get('parcelAt'),slots=yardSlots(doc),chute=yardGeometry(doc).find(r=>r.instance.id==='chute')!,x0=chute.placement.x,h0=chute.placement.h+Number(chute.props.height),x1=x0+Number(chute.props.width),h1=chute.placement.h+Number(chute.props.endHeight);if(at==='A-3'||at==='B-5'||at==='C-7')return[slots[at],yardPlacement(at,doc).h+22];if(at==='hook')return[hookX,yardPlacement('crane',doc).h+51];if(at==='chute')return[x0,h0];if(at==='sliding'){const f=Math.min(1,(model.now()-(model.scratch.slideStart??0))/model.data.tuning.slideMs);return[x0+(x1-x0)*f,h0+(h1-h0)*f];}if(at==='bounced')return[x1-4,h1];if(at==='tray'){const p=yardPlacement('tray',doc);return[p.x,p.h+8];}return null;}
/** Pure binding evaluation; bounds queries and repeated painting never advance the controller. */
export function yardVisualSnapshot(controller:Readonly<YardPresentationState>,engine:EngineDraw,doc:Composition=yardComposition):YardVisual{const l=light();return{layer:engine.layer,highlight:engine.hover??'',pan:Number(engine.m.get('pan')),gateOpen:!!engine.m.value('gateOpen'),gateAllowed:!!engine.m.get('gateAllowed'),held:engine.m.get('parcelAt')==='hook',hookVisible:controller.hookVisible,hookX:controller.hookX,parcel:engine.m.get('parcelAt')==='hook'&&!controller.hookVisible?null:parcelPosition(engine.m,controller.hookX,doc),night:l.night*(1-l.cover)};}
/** Explicit compatibility preparation: the legacy recurrence ran once for every all/devices draw.
 * The controller belongs to the caller. Art, bounds and environment evaluation never call this.
 * A deterministic editor seek can recreate a controller and replay its known presentation frames.
 */
export function prepareYardFrame(controller:YardPresentationState,engine:EngineDraw,doc:Composition=yardComposition):YardVisual{if(engine.layer!=='world'){const target=yardSlots(doc)[String(engine.m.get('armAt'))];// An unsupported legacy arm label poisoned NaN permanently. Keep its nonpainting result as explicit finite state.
if(!Number.isFinite(target))controller.hookVisible=false;
if(controller.hookVisible)controller.hookX+=(target-controller.hookX)*.08;}return yardVisualSnapshot(controller,engine,doc);}
export type YardRenderOptions=Partial<Pick<Environment,'visibility'|'opacity'|'clips'|'sequenceTime'|'reduced'>>;
export function yardEnvironment(view:View,snapshot:YardVisual,doc:Composition=yardComposition,actors:Readonly<Record<string,Character>>=compileSceneActors(sceneSource as unknown as SceneDocument,yardGeometry(doc))):Environment{return{view,state:{},bindings:{...Object.fromEntries(Object.entries(snapshot).map(([k,v])=>['yard.'+k,v as Value])),...actorPresentationBindings('yard',actors,view.t,snapshot.layer!=='devices')},reduced:false};}
export function drawYardComposition(ctx:CanvasRenderingContext2D,view:View,snapshot:YardVisual,doc:Composition=yardComposition,state:Environment['state']={},options:YardRenderOptions={},actors?:Readonly<Record<string,Character>>){drawComposition(ctx,art,doc,{...yardEnvironment(view,snapshot,doc,actors),state,...options},'backdrop');}
