import {downtownVisualSnapshot} from '../../engine/controllers/downtown-visual';
import {downtownController} from '../../engine/controllers/motion';
import {validateActorPresentationNode} from '../../engine/gameplay/actor-presentation';
import {prepareActor} from '../../engine/gameplay/actor-frame';
import type {Character} from '../../runtime/characters';
/** Downtown layout and state adapter. All drawing follows the same editable composition path. */
import { drawComposition, resolveComposition, type Composition, type Environment, type Instance, type Properties, type Value } from '../../art/core/composition';
import { art as downtownArt } from '../../art';
import type { DowntownDeviceState } from '../../art/electronics/downtown-devices';
import { frameView, type View } from '../../art/core/view';
import type { SceneModel } from '../../engine/model';
import type { SceneLight, Caster } from '../../art/atmosphere/lighting';
import { screenLine, sceneClimate } from '../../world/weather';
import { downtownSource } from './source';
export { downtownArt };
const visit=(nodes:Instance[]):Instance[]=>nodes.flatMap(n=>[n,...visit(n.children??[])]);
// DLV's moving picture explicitly consumes its authored home marker. Other electronics
// are ordinary presentation; their required world spots belong to the device source.
const required=['scene','noodle-stall','dumpster','platform-dumpster','platform-annex','yard-alley','map',...['shop','library','capsule','metro','moth','taxi'].map(id=>'exit-'+id),'device-dlv9'];
const allowed=(source:string)=>/^actor\.[-a-zA-Z0-9_.]+\.pose$/.test(source)||source==='scene.width'||source==='weather.text'||source==='weather.rain'||source==='street.city'||source==='stall.metrics'||source==='alley.doorOffset'||/^front\.front-\d+\.(metrics|visible)$/.test(source)||/^window\.front-\d+-window-\d+-\d+\.enabled$/.test(source)||/^smear\.[\w-]+\.(x|color)$/.test(source)||/^device\.(sign|box|till|relay|gate|fence|scan|cam3|billboard|dlv9|map|hover)\.(snapshot|position)$/.test(source);
export function validateDowntownComposition(input:unknown):Composition {
 const doc=downtownArt.validate(input);if(doc.scene!=='downtown')throw new Error('Expected Downtown composition');
 const all=visit(doc.instances),ids=new Set(all.map(n=>n.id));
 for(const id of required)if(!ids.has(id))throw new Error('Missing gameplay-bound Downtown instance: '+id);
 const original=new Map(visit(downtownSource.instances).map(n=>[n.id,n.type]));
 const owners=new Map<string,string>();const parents=(nodes:Instance[],parent?:string)=>nodes.forEach(n=>{if(parent)owners.set(n.id,parent);parents(n.children??[],n.id);});parents(doc.instances);
 for(const node of all){
  validateActorPresentationNode('downtown',node);
  if(required.includes(node.id)&&node.type!==original.get(node.id))throw new Error(node.id+': gameplay-bound element type changed');
  for(const source of Object.values(node.bindings??{})){
   if(!allowed(source))throw new Error(node.id+': unknown Downtown binding '+source);
   const ref=source.match(/^(?:front|window|smear)\.([\w-]+)\./)?.[1];
   if(ref&&!ids.has(ref))throw new Error(node.id+': missing binding source instance '+ref);
  }
  if(node.type==='downtown.window'&&node.bindings?.enabled!=='window.'+node.id+'.enabled')throw new Error(node.id+': window needs its visibility binding');
  if(node.type==='downtown.front-trim'&&node.bindings?.metrics!=='front.'+owners.get(node.id)+'.metrics')throw new Error(node.id+': trim needs parent-front metrics');
  if(node.type==='downtown.bay'&&node.bindings?.enabled!=='front.'+owners.get(node.id)+'.visible')throw new Error(node.id+': bay needs parent-front visibility');
  if(node.type.startsWith('downtown.device-')){const id=node.type.slice('downtown.device-'.length);if(node.bindings?.snapshot!=='device.'+id+'.snapshot')throw new Error(node.id+': missing typed device snapshot binding');}
 }
 return doc;
}
export const downtownComposition=validateDowntownComposition(downtownSource);
const baseView:View={...frameView(0),sx:x=>x,y:h=>-h,t:0,gy:0,cam:0,viewW:2000,viewH:360,flags:{}};
function defaults(doc:Composition):Record<string,Value>{const result:Record<string,Value>={};for(const node of visit(doc.instances))for(const[field,source]of Object.entries(node.bindings??{}))result[source]=downtownArt.get(node.type).visualFields![field].default;return result;}
export function downtownGeometry(doc=downtownComposition){return resolveComposition(downtownArt,doc,{view:baseView,state:{},bindings:defaults(doc),reduced:false});}
/** Core geometry is authoritative for edited documents, including anchors from other shared kits. */
export function downtownPositions(doc:Composition=downtownComposition){const rows=downtownGeometry(doc).map(row=>({instance:row.instance,props:row.props,...row.placement})),byId=new Map(rows.map(row=>[row.instance.id,row]));return{rows:()=>rows,get:(id:string)=>{const row=byId.get(id);if(!row)throw new Error('Missing Downtown position: '+id);return row;}};}
const smearOrder=['device-sign','noodle-stall','billboard-frame','market-neon','spaceport-neon','open-neon','exit-metro','exit-taxi','exit-shop','weather-ticker'];
function reflections(doc:Composition):[number,string][]{
 const g=downtownPositions(doc),get=(id:string)=>g.get(id);
 return smearOrder.map(id=>{const row=get(id),p=row.instance.props;let x=row.x,color=String(p.color??p.smearColor??'0,255,255');if(id==='noodle-stall')x+=Number(p.width)*row.scale*row.facing/2;if(id==='exit-metro')x+=31*row.scale*row.facing;if(id==='exit-taxi')x-=18*row.scale*row.facing;if(id==='weather-ticker')color='255,210,58';return[x,color];});
}
/** Shipping puddle/reflection input derives from the same authored lights. */
export const SMEARS=reflections(downtownComposition);
export const downtownReflections=reflections;
/** Lamps/casters attach to authored surfaces, so moving an assembly moves its lighting too. */
export function downtownLights(doc:Composition=downtownComposition):SceneLight[]{return downtownPositions(doc).rows().filter(row=>row.instance.type==='downtown.light').map(row=>{const p=row.props;return{x:row.x,h:row.h,kind:p.kind as SceneLight['kind'],r:Number(p.radius)*row.scale,...(p.color?{col:String(p.color)}:{}),...(Number(p.alpha)>=0?{a:Number(p.alpha)}:{})};});}
export function downtownCasters(doc:Composition=downtownComposition):Caster[]{const g=downtownPositions(doc),row=g.get('caster-dumpster'),owner=g.get(row.instance.attach!.instance);return[{x:row.x,h:row.h,w:Number(owner.props.width)*row.scale}];}
const empty:DowntownDeviceState={controlled:false,gateHeld:false,lock:'shut',scanned:false,feed:'ads',dlvAt:'home',trace:0,signTestMs:3000,signSince:1e9,visible:true,hoverSpot:null};
export type DowntownRenderOptions=Partial<Pick<Environment,'visibility'|'opacity'|'clips'|'sequenceTime'|'reduced'>>;
export interface DowntownRenderState { model?:SceneModel;hover?:string|null;dlv?:number|null;rain?:number;city?:boolean;overrides?:Readonly<Record<string,Properties>>;options?:DowntownRenderOptions;actors?:Readonly<Record<string,Character>> }
/** Rebuild named visual bindings from a frame snapshot; no simulation is advanced by drawing. */
export function downtownEnvironment(doc:Composition,view:View,input:DowntownRenderState={}):Environment {
 const bindings=defaults(doc),geometry=resolveComposition(downtownArt,doc,{view,state:{},bindings,reduced:false}),byId=new Map(geometry.map(row=>[row.instance.id,row]));
 const get=(id:string)=>{const row=byId.get(id);if(!row)throw new Error('Missing Downtown visual instance: '+id);return row;};
 bindings['scene.width']=Number(get('scene').props.width);bindings['weather.text']=screenLine(sceneClimate('downtown'));bindings['weather.rain']=input.rain??0;bindings['street.city']=input.city??true;
 const stall=get('noodle-stall');bindings['stall.metrics']=[stall.placement.x,Number(stall.props.width)];bindings['alley.doorOffset']=Number(get('yard-alley').props.doorOffset);
 const masks=geometry.filter(row=>Array.isArray(row.props.mask)&&(row.props.mask as Value[]).length===4).map(row=>{const m=row.props.mask as number[],p=row.placement,a=p.x+m[0]*p.scale*p.facing,b=p.x+m[1]*p.scale*p.facing;return[Math.min(a,b),Math.max(a,b),p.h+m[2]*p.scale,p.h+m[3]*p.scale];});
 for(const row of geometry.filter(row=>row.instance.type==='downtown.front')){
  const p=row.placement,w=Number(row.props.width),sx=view.sx(p.x),end=sx+w*p.scale*p.facing,visible=!(Math.max(sx,end)+4*p.scale<0||Math.min(sx,end)-4*p.scale>view.viewW);
  bindings['front.'+row.instance.id+'.metrics']=[w,Number(row.props.height),!!row.props.roof,visible];bindings['front.'+row.instance.id+'.visible']=visible;
 }
 for(const row of geometry.filter(row=>row.instance.type==='downtown.window')){
  const id=row.instance.id,parent=id.match(/^(front-\d+)-/)![1],p=row.placement,a=p.x,b=a+14*p.scale*p.facing,x0=Math.min(a,b),x1=Math.max(a,b),h0=p.h-28*p.scale;
  bindings['window.'+id+'.enabled']=!!bindings['front.'+parent+'.visible']&&h0<=view.gy&&!masks.some(([a,b,c,d])=>x0<b&&x1>a&&h0<d&&p.h>c);
 }
 reflections(doc).forEach(([x,color],i)=>{bindings['smear.'+smearOrder[i]+'.x']=x;bindings['smear.'+smearOrder[i]+'.color']=color;});
 for(const[id,body]of Object.entries(input.actors??{}))bindings['actor.'+id+'.pose']=prepareActor(body,view) as unknown as Value;
 const model=input.model;
 for(const id of ['sign','box','till','relay','gate','fence','scan','cam3','billboard','dlv9','map','hover']){
  const snapshot:DowntownDeviceState={...empty};
  if(model){Object.assign(snapshot,downtownVisualSnapshot(model,id));snapshot.dlvAt=String(model.get(downtownController(model.data).state.at));snapshot.visible=input.dlv!==null;
   if(id==='hover'&&input.hover){const spot=model.spots().find(p=>p.id===input.hover);if(spot)snapshot.hoverSpot={x:spot.x,y:spot.y,w:spot.w,h:spot.h};}
  }
  bindings['device.'+id+'.snapshot']=snapshot as unknown as Value;
 }
 const dlv=get('device-dlv9');bindings['device.dlv9.position']=input.dlv??dlv.placement.x;
 return{view,state:input.overrides??{},bindings,reduced:false,...input.options};
}
export function renderDowntownCity(ctx:CanvasRenderingContext2D,view:View,doc=downtownComposition,overrides?:Readonly<Record<string,Properties>>,options:DowntownRenderOptions={}){drawComposition(ctx,downtownArt,doc,downtownEnvironment(doc,view,{overrides,options}),'backdrop');}
export function renderDowntownStreet(ctx:CanvasRenderingContext2D,view:View,rain:number,city:boolean,doc=downtownComposition,overrides?:Readonly<Record<string,Properties>>,options:DowntownRenderOptions={}){drawComposition(ctx,downtownArt,doc,downtownEnvironment(doc,view,{rain,city,overrides,options}),'foreground');}
export function renderDowntownPeople(ctx:CanvasRenderingContext2D,view:View,doc=downtownComposition,overrides?:Readonly<Record<string,Properties>>,options:DowntownRenderOptions={},actors:Readonly<Record<string,Character>>={}){drawComposition(ctx,downtownArt,doc,downtownEnvironment(doc,view,{overrides,options,actors}),'people');}
export function renderDowntownDevices(ctx:CanvasRenderingContext2D,view:View,model:SceneModel,hover:string|null,dlv:number|null,doc=downtownComposition,overrides?:Readonly<Record<string,Properties>>,options:DowntownRenderOptions={}){drawComposition(ctx,downtownArt,doc,downtownEnvironment(doc,view,{model,hover,dlv,overrides,options}),'devices');}
