import { frameView } from '../../art/core/view';
/** Warehouse gameplay markers and visual snapshots share one source geometry. */
import source from './composition.json';
import { art, drawComposition, resolveComposition, type Composition, type Environment, type Instance, type Value } from '../../art';
import type { View } from '../../art/core/view';
import { prepareCharacter, type Character, type PreparedCharacter } from '../../runtime/characters';
import type { SceneLight, Caster } from '../../art/atmosphere/lighting';
const flatten=(nodes:Instance[]):Instance[]=>nodes.flatMap(n=>[n,...flatten(n.children??[])]);
const actorIds=['mender','gull','pigeon','mech'];
const sourceTypes=new Map(flatten(source.instances as Instance[]).map(n=>[n.id,n.type]));
const required=['scene','spawn','passage','exit-stacks','wall','dock','door','plaque','notice','van','shoe','crate',...actorIds];
export function validateWarehouseComposition(value:unknown):Composition{
  const doc=art.validate(value);if(doc.scene!=='warehouse')throw new Error('Expected warehouse composition');const all=flatten(doc.instances);
  for(const id of required){const node=all.find(n=>n.id===id);if(!node||node.type!==sourceTypes.get(id))throw new Error('Missing/changed warehouse gameplay instance '+id);}
  for(const node of all){for(const name of Object.values(node.bindings??{}))if(!actorIds.some(id=>name==='actor.'+id+'.pose'))throw new Error(node.id+': unknown warehouse binding '+name);if(node.type==='character.prepared'&&(!actorIds.includes(String(node.props.actor))||node.bindings?.pose!=='actor.'+node.props.actor+'.pose'))throw new Error(node.id+': invalid warehouse actor');}
  for(const id of actorIds)if(all.filter(n=>n.type==='character.prepared'&&n.props.actor===id).length!==1)throw new Error('Warehouse actor needs exactly one instance: '+id);
  return doc;
}
export const warehouseComposition=validateWarehouseComposition(source);
const view:View={...frameView(0),sx:x=>x,y:h=>-h,gy:0,cam:0,t:0,viewW:640,viewH:360,flags:{}};
const defaults=(doc:Composition):Record<string,Value>=>Object.fromEntries(flatten(doc.instances).flatMap(node=>Object.entries(node.bindings??{}).map(([key,name])=>[name,art.get(node.type).visualFields![key].default])));
export const warehouseGeometry=(doc:Composition=warehouseComposition)=>resolveComposition(art,doc,{view,state:{},bindings:defaults(doc),reduced:false});
export function warehousePosition(id:string,doc:Composition=warehouseComposition){const row=warehouseGeometry(doc).find(row=>row.instance.id===id);if(!row)throw new Error('Missing warehouse geometry: '+id);return row;}
export function warehouseLayout(doc:Composition=warehouseComposition){const get=(id:string)=>warehousePosition(id,doc),x=(id:string)=>get(id).placement.x,dock=get('dock'),wall=get('wall'),van=get('van');return{width:Number(get('scene').props.width),back:x('passage'),spawn:x('spawn'),mender:x('mender'),dock:{x0:dock.placement.x,x1:dock.placement.x+Number(dock.props.width)*dock.placement.scale,h:dock.placement.h+Number(dock.props.height)*dock.placement.scale},door:x('door'),plaque:x('plaque'),board:x('notice'),van:{x:van.placement.x,w:Number(van.props.width)*van.placement.scale},shoe:x('shoe'),wall:{x0:wall.placement.x,x1:wall.placement.x+Number(wall.props.width)*wall.placement.scale,h:wall.placement.h+Number(wall.props.height)*wall.placement.scale}};}
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
