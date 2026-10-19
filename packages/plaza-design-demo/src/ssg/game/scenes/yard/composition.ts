import {manifestGeometry} from '../../engine/gameplay/manifest-geometry';
import {actorPresentationDefaults,actorPresentationBindings,validateActorPresentationNode} from '../../engine/gameplay/actor-presentation';
import {yardController,yardRead,type YardController} from '../../engine/controllers/yard';
import type {GameplayDefinition} from '../../engine/gameplay/types';
import deviceSource from './devices.json';
import gameplaySource from './gameplay.json';
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
export function validateYardComposition(input:unknown):Composition{const doc=art.validate(input);if(doc.scene!=='yard')throw new Error('Expected yard composition');for(const i of flatten(doc.instances)){if(i.type==='character.prepared'){validateActorPresentationNode('yard',i);continue;}for(const[k,v]of Object.entries(i.bindings??{}))if(v!=='yard.'+k||!(k in yardVisualFields))throw new Error(i.id+': unknown Yard visual binding '+v);}return doc;}
validateYardComposition(yardComposition);
const defaults=(doc:Composition)=>({...Object.fromEntries(Object.entries(yardVisualFields).map(([k,f])=>['yard.'+k,f.default])),...actorPresentationDefaults('yard',doc)});
const geometryView:View={...frameView(0),sx:x=>x,y:h=>-h,gy:0,cam:0,t:0,viewW:640,viewH:360,flags:{}};
export function yardGeometry(doc:Composition=yardComposition){return resolveComposition(art,doc,{view:geometryView,state:{},bindings:defaults(doc),reduced:false});}
export function yardPlacement(id:string,doc:Composition=yardComposition){const row=yardGeometry(doc).find(r=>r.instance.id===id);if(!row)throw new Error('Unknown Yard instance '+id);return row.placement;}
export function yardWidth(doc:Composition=yardComposition){return manifestGeometry(sceneSource as unknown as SceneDocument,yardGeometry(doc),[],{groundSpawn:false}).width;}
export function yardDeviceData(source:SceneData,doc:Composition=yardComposition,scene?:Pick<SceneDocument,'manifest'>):SceneData{const result=structuredClone(source),rows=yardGeometry(doc);for(const d of result.devices){if(scene?.manifest?.devices?.[d.id])continue;const p=rows.find(row=>row.instance.id==='device-'+d.id)?.placement,spot=d.layout?.spot;if(!p||!spot)continue;spot.x=p.x;if(spot.y!==undefined||p.h!==0)spot.y=p.h;}return result;}
export interface YardPresentationState {hookX:number;hookVisible:boolean}
const defaultController=deviceSource.controller as unknown as YardController,defaultGameplay=gameplaySource as unknown as GameplayDefinition;
export const createYardPresentationState=(doc:Composition=yardComposition,c:YardController|null=defaultController):YardPresentationState=>({hookX:c?yardPlacement(c.slots[c.places.home],doc).x:0,hookVisible:!!c});
export function validateYardControllerGeometry(c:YardController|undefined,doc:Composition){if(!c)return;const rows=yardGeometry(doc);for(const ref of Object.values(c.slots))if(!rows.some(r=>r.instance.id===ref))throw Error('Yard slot artwork reference '+ref);for(const[role,ref]of Object.entries(c.anchors))if(!rows.some(r=>r.instance.id===ref&&r.instance.type==='yard.'+role))throw Error('Yard '+role+' artwork reference '+ref);}
export function yardSlots(doc:Composition=yardComposition,c:YardController|null=defaultController):Record<string,number>{return c?Object.fromEntries(Object.entries(c.slots).map(([id,ref])=>[id,yardPlacement(ref,doc).x])):{};}
function parcelPosition(model:SceneModel,hookX:number,doc:Composition,gameplay:GameplayDefinition):[number,number]|null{
 const c=yardController(model.data);if(!c)return null;
 const at=yardRead(model,'parcelAt'),slots=yardSlots(doc,c),chute=yardGeometry(doc).find(r=>r.instance.id===c.anchors.chute)!,x0=chute.placement.x,h0=chute.placement.h+Number(chute.props.height),x1=x0+Number(chute.props.width),h1=chute.placement.h+Number(chute.props.endHeight);
 if(typeof at==='string'&&c.cargoSlots.includes(at))return[slots[at],yardPlacement(c.slots[at],doc).h+22];
 if(at===c.places.hook)return[hookX,yardPlacement(c.anchors.crane,doc).h+51];if(at===c.places.chute)return[x0,h0];
 if(at===c.places.sliding){const deadline=c.slideDeadline?gameplay.native?.deadlines?.[c.slideDeadline]:undefined;if(!deadline?.startedAt)return null;const f=Math.min(1,(model.now()-(model.scratch[deadline.startedAt]??0))/(model.data.tuning[deadline.duration.tuning]+(deadline.duration.offsetMs??0)));return[x0+(x1-x0)*f,h0+(h1-h0)*f];}
 if(at===c.places.bounced)return[x1-4,h1];if(at===c.places.tray){const p=yardPlacement(c.anchors.tray,doc);return[p.x,p.h+8];}return null;
}
/** Pure binding evaluation; bounds queries and repeated painting never advance the controller. */
export function yardVisualSnapshot(controller:Readonly<YardPresentationState>,engine:EngineDraw,doc:Composition=yardComposition,gameplay:GameplayDefinition=defaultGameplay):YardVisual{const l=light(),c=yardController(engine.m.data),held=c!==undefined&&yardRead(engine.m,'parcelAt')===c.places.hook;return{layer:engine.layer,highlight:engine.hover??'',pan:Number(yardRead(engine.m,'pan')??0),gateOpen:!!(c?.gateOpen&&engine.m.value(c.gateOpen)),gateAllowed:!!yardRead(engine.m,'gateAllowed'),held,hookVisible:controller.hookVisible,hookX:controller.hookX,parcel:held&&!controller.hookVisible?null:parcelPosition(engine.m,controller.hookX,doc,gameplay),night:l.night*(1-l.cover)};}
/** Explicit compatibility preparation: the legacy recurrence ran once for every all/devices draw.
 * The controller belongs to the caller. Art, bounds and environment evaluation never call this.
 * A deterministic editor seek can recreate a controller and replay its known presentation frames.
 */
export function prepareYardFrame(controller:YardPresentationState,engine:EngineDraw,doc:Composition=yardComposition,gameplay:GameplayDefinition=defaultGameplay):YardVisual{const c=yardController(engine.m.data);if(engine.layer!=='world'){const target=yardSlots(doc,c??null)[String(yardRead(engine.m,'armAt'))];// An unsupported original arm label poisoned NaN permanently. Keep its nonpainting result as explicit finite state.
if(!Number.isFinite(target))controller.hookVisible=false;
if(controller.hookVisible)controller.hookX+=(target-controller.hookX)*(c?.hookEase??0);}return yardVisualSnapshot(controller,engine,doc,gameplay);}
export type YardRenderOptions=Partial<Pick<Environment,'visibility'|'opacity'|'clips'|'sequenceTime'|'reduced'>>;
export function yardEnvironment(view:View,snapshot:YardVisual,doc:Composition=yardComposition,actors:Readonly<Record<string,Character>>=compileSceneActors(sceneSource as unknown as SceneDocument,yardGeometry(doc))):Environment{return{view,state:{},bindings:{...Object.fromEntries(Object.entries(snapshot).map(([k,v])=>['yard.'+k,v as Value])),...actorPresentationBindings('yard',actors,view.t,snapshot.layer!=='devices')},reduced:false};}
export function drawYardComposition(ctx:CanvasRenderingContext2D,view:View,snapshot:YardVisual,doc:Composition=yardComposition,state:Environment['state']={},options:YardRenderOptions={},actors?:Readonly<Record<string,Character>>){drawComposition(ctx,art,doc,{...yardEnvironment(view,snapshot,doc,actors),state,...options},'backdrop');}
