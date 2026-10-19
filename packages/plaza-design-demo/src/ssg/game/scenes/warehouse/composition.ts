import {actorPoseSource} from '../../engine/gameplay/native-actor-bindings';
import { frameView } from '../../art/core/view';
/** Warehouse gameplay markers and visual snapshots share one source geometry. */
import source from './composition.json';
import { art, drawComposition, resolveComposition, type Composition, type Environment, type Instance, type Value } from '../../art';
import type { View } from '../../art/core/view';
import { prepareCharacter, type Character, type PreparedCharacter } from '../../runtime/characters';
import type { SceneLight, Caster } from '../../art/atmosphere/lighting';
const flatten=(nodes:Instance[]):Instance[]=>nodes.flatMap(n=>[n,...flatten(n.children??[])]);
const sourceTypes=new Map(flatten(source.instances as Instance[]).map(n=>[n.id,n.type]));
const required=['scene','wall','dock','van'];
export function validateWarehouseComposition(value:unknown):Composition{
  const doc=art.validate(value);if(doc.scene!=='warehouse')throw new Error('Expected warehouse composition');const all=flatten(doc.instances);
  for(const id of required){const node=all.find(n=>n.id===id);if(!node||node.type!==sourceTypes.get(id))throw new Error('Missing/changed warehouse gameplay instance '+id);}
  for(const node of all){if(node.type==='character.prepared'){if(typeof node.props.actor!=='string'||!/^[-a-zA-Z0-9_.]{1,96}$/.test(node.props.actor)||node.bindings?.pose!==actorPoseSource('warehouse',node.props.actor)||Object.keys(node.bindings).some(k=>k!=='pose'))throw new Error(node.id+': invalid warehouse actor');}else if(Object.keys(node.bindings??{}).length)throw new Error(node.id+': unknown warehouse binding');}
  return doc;
}
export const warehouseComposition=validateWarehouseComposition(source);
const view:View={...frameView(0),sx:x=>x,y:h=>-h,gy:0,cam:0,t:0,viewW:640,viewH:360,flags:{}};
const defaults=(doc:Composition):Record<string,Value>=>Object.fromEntries(flatten(doc.instances).flatMap(node=>Object.entries(node.bindings??{}).map(([key,name])=>[name,art.get(node.type).visualFields![key].default])));
export const warehouseGeometry=(doc:Composition=warehouseComposition)=>resolveComposition(art,doc,{view,state:{},bindings:defaults(doc),reduced:false});
export function warehousePosition(id:string,doc:Composition=warehouseComposition){const row=warehouseGeometry(doc).find(row=>row.instance.id===id);if(!row)throw new Error('Missing warehouse geometry: '+id);return row;}
export function warehouseLights(doc:Composition=warehouseComposition):SceneLight[]{return warehouseGeometry(doc).filter(row=>row.instance.type==='warehouse.light').map(row=>{const p=row.props,at=row.placement;return{x:at.x,h:at.h,kind:p.kind as SceneLight['kind'],r:Number(p.radius)*at.scale,...(Number(p.width)?{w:Number(p.width)*at.scale}:{}),...(Number(p.height)?{hh:Number(p.height)*at.scale}:{}),...(p.color?{col:String(p.color)}:{}),...(Number(p.alpha)>=0?{a:Number(p.alpha)}:{})};});}
export function warehouseCasters(doc:Composition=warehouseComposition):Caster[]{const rows=warehouseGeometry(doc),van=rows.find(r=>r.instance.id==='van')!;return rows.filter(r=>r.instance.type==='warehouse.caster').map(row=>({x:row.placement.x,h:row.placement.h,w:Number(van.props.width)*van.placement.scale}));}
export type WarehouseRenderOptions=Partial<Pick<Environment,'visibility'|'opacity'|'clips'|'sequenceTime'|'reduced'>>;
export function warehouseEnvironment(doc:Composition,view:View,actors:Readonly<Record<string,Character>>):Environment{
  const bindings=defaults(doc);
  for(const row of warehouseGeometry(doc).filter(row=>row.instance.type==='character.prepared')){
    const actor=actors[String(row.props.actor)],p=row.placement;let pose:PreparedCharacter=prepareCharacter(actor,view.t);
    if(pose.visible){const dx=p.x-actor.x,dh=p.h-(actor.h??0);pose={...pose,character:{...pose.character,x:p.x,...(actor.h!==undefined||p.h!==0?{h:p.h}:{})},frame:{...pose.frame,x:pose.frame.x+dx},height:pose.height+dh};}
    bindings['actor.'+row.props.actor+'.pose']=pose as unknown as Value;
  }
  return{view,state:{},bindings,reduced:false};
}
export function drawWarehouseComposition(ctx:CanvasRenderingContext2D,view:View,actors:Readonly<Record<string,Character>>,doc=warehouseComposition,state:Environment['state']={},options:WarehouseRenderOptions={}){drawComposition(ctx,art,doc,{...warehouseEnvironment(doc,view,actors),state,...options},'backdrop');}
