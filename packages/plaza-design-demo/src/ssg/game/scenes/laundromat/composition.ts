import {laundryController,laundryVisualSnapshot} from '../../engine/controllers/laundromat';
import type {GameplayDefinition} from '../../engine/gameplay/types';
import gameplaySource from './gameplay.json';
import {mutableActorArtwork} from '../../engine/gameplay/native-actor-bindings';
import { frameView } from '../../art/core/view';
/** Laundromat bindings: scene simulation to serializable visual state and canonical interaction geometry. */
import { art,drawComposition,resolveComposition,type Composition,type Environment,type Properties,type Value } from '../../art';
import { laundromatVisualFields } from '../../art/assemblies/laundromat-elements';
import type { View } from '../../art/core/view';
import { prepareCharacter,type Character,type PreparedCharacter } from '../../runtime/characters';
import type { EngineDraw } from '../../engine/host';
import type { SceneData } from '../../data/types';
import document from './composition.json';
export const laundromatArt=art;
export const laundromatComposition=art.validate(document);
const sources=new Set(['window.clip',...Object.keys(laundromatVisualFields).map(k=>'laundromat.'+k)]);
const flatten=(rows:Composition['instances']):Composition['instances']=>rows.flatMap(r=>[r,...flatten(r.children??[])]);
export function validateLaundromatComposition(input:unknown):Composition{const doc=art.validate(input);if(doc.scene!=='laundromat')throw new Error('Expected laundromat composition');for(const i of flatten(doc.instances)){for(const [field,source]of Object.entries(i.bindings??{}))if(!(i.type==='character.prepared'&&field==='pose'&&mutableActorArtwork('laundromat',i))&&!sources.has(source))throw new Error(i.id+': unknown laundromat binding '+source);if(i.type==='character.prepared'&&!mutableActorArtwork('laundromat',i))throw new Error(i.id+': invalid laundromat actor binding');}return doc;}
validateLaundromatComposition(laundromatComposition);
function defaults(doc:Composition):Record<string,Value>{const result:Record<string,Value>={};for(const i of flatten(doc.instances))for(const[field,source]of Object.entries(i.bindings??{}))result[source]=art.get(i.type).visualFields![field].default;return result;}
const geometryView:View={...frameView(0),sx:x=>x,y:h=>-h,gy:0,cam:0,t:0,viewW:640,viewH:360,flags:{}};
export function laundromatGeometry(doc:Composition=laundromatComposition){return resolveComposition(art,doc,{view:geometryView,state:{},bindings:defaults(doc),reduced:false});}
export function validateLaundryGeometry(data:SceneData,doc:Composition){const c=laundryController(data);if(!c)return;const rows=laundromatGeometry(doc);for(const[role,ref]of Object.entries(c.geometry)){const row=rows.find(r=>r.instance.id===ref);if(!row)throw Error('Laundromat '+role+' artwork reference '+ref);if(role==='window'&&(!Number.isFinite(row.props.width)||!Number.isFinite(row.props.height)||Number(row.props.width)<=0||Number(row.props.height)<=0))throw Error('Laundromat window requires rectangle dimensions');}}
export type LaundromatRenderOptions=Partial<Pick<Environment,'visibility'|'opacity'|'clips'|'sequenceTime'|'reduced'>>;
export function laundromatEnvironment(doc:Composition,view:View,engine:EngineDraw,actors:Readonly<Record<string,Character>>,gameplay:GameplayDefinition=gameplaySource as unknown as GameplayDefinition):Environment{const bindings=defaults(doc),m=engine.m,rows=laundromatGeometry(doc),get=(id:string)=>rows.find(r=>r.instance.id===id)!,c=laundryController(m.data);const values:Properties={hover:engine.hover??'',...laundryVisualSnapshot(m,gameplay),breakerX:c?get(c.geometry.breaker).placement.x:0,washerXs:[1,2,3,4].map(i=>c?get(c.geometry[('w'+i)as 'w1']).placement.x:0)};for(const[k,v]of Object.entries(values))bindings['laundromat.'+k]=v;const window=c?get(c.geometry.window):undefined;bindings['window.clip']=window?[view.sx(window.placement.x),view.y(window.placement.h+Number(window.props.height)),Number(window.props.width),Number(window.props.height)]:null;for(const row of rows.filter(r=>r.instance.type==='character.prepared')){const p=actors[String(row.props.actor)];let pose:PreparedCharacter=prepareCharacter(p,view.t);if(pose.visible){const dh=row.placement.h-(p.h??0);pose={...pose,character:{...pose.character,x:row.placement.x,h:row.placement.h},frame:{...pose.frame,x:pose.frame.x+row.placement.x-p.x},height:pose.height+dh};}bindings['actor.'+row.props.actor+'.pose']=pose as unknown as Value;}return{view,state:{},bindings,reduced:false};}
export function drawLaundromatComposition(ctx:CanvasRenderingContext2D,view:View,engine:EngineDraw,actors:Readonly<Record<string,Character>>,doc:Composition=laundromatComposition,state:Environment['state']={},options:LaundromatRenderOptions={},gameplay:GameplayDefinition=gameplaySource as unknown as GameplayDefinition){drawComposition(ctx,art,doc,{...laundromatEnvironment(doc,view,engine,actors,gameplay),state,...options},'backdrop');}
