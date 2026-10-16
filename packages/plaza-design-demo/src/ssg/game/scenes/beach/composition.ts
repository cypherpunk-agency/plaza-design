/** Beach source composition and explicit runtime/preview bindings. No preview writes game state. */
import { art } from '../../art';
import { drawComposition,resolveComposition,type Composition,type Environment,type Value } from '../../art/core/composition';
import type { View } from '../../art/core/view';
import { onScreen } from '../../art/core/primitives';
import { beachVisualFields } from '../../art/assemblies/beach-elements';
import type { BeachLayout } from '../../art/assemblies/beach';
import { prepareCharacter,type Character,type PreparedCharacter } from '../../runtime/characters';
import type { DrawView,SceneModel } from '../../engine/index';
import type { SceneData } from '../../data/types';
import type { SceneDef } from '../kit';
import { light } from '../../world/light';
import source from './composition.json';
export const beachArt=art;
const geometryView:View={sx:x=>x,y:h=>-h,gy:0,t:0,cam:0,viewW:960,viewH:360,flags:{}};
export type BeachRenderOptions=Partial<Pick<Environment,'visibility'|'opacity'|'clips'|'sequenceTime'|'reduced'>>;
export const beachMarkerPolicy={exitAxes:['x'] as const,description:'Exits are horizontal gameplay triggers; local device, use, person, light and shadow heights follow their source markers.'};
const raw=source as unknown as Composition;
const required=new Map(raw.instances.map(r=>[r.id,r.type]));
const actorIds=raw.instances.filter(r=>r.type==='character.prepared').map(r=>String(r.props.actor));
const sources=new Set([...Object.keys(beachVisualFields).map(k=>'beach.'+k),...actorIds.map(k=>'actor.'+k+'.pose')]);
export function validateBeachComposition(input:unknown):Composition{const doc=art.validate(input);if(doc.scene!=='beach')throw new Error('Expected beach composition');for(const[id,type]of required){if(doc.instances.find(r=>r.id===id)?.type!==type)throw new Error('beach: missing or changed required instance '+id);}for(const row of doc.instances){for(const name of Object.values(row.bindings??{}))if(!sources.has(name))throw new Error(row.id+': unknown Beach binding '+name);if(row.type==='character.prepared'&&(!actorIds.includes(String(row.props.actor))||row.bindings?.pose!=='actor.'+row.props.actor+'.pose'))throw new Error(row.id+': unknown/missing Beach actor binding');}return doc;}
export const beachComposition=validateBeachComposition(source);
function defaults(doc:Composition):Record<string,Value>{const result:Record<string,Value>={};for(const row of doc.instances)for(const[field,name]of Object.entries(row.bindings??{}))result[name]=art.get(row.type).visualFields![field].default;return result;}
export function beachGeometry(doc:Composition=beachComposition){return resolveComposition(art,doc,{view:geometryView,state:{},bindings:defaults(doc),reduced:false});}
export function beachPlacement(id:string,doc:Composition=beachComposition){const row=beachGeometry(doc).find(r=>r.instance.id===id);if(!row)throw new Error('Missing Beach instance '+id);return row.placement;}
export function beachLayout(doc:Composition=beachComposition):BeachLayout{const rows=beachGeometry(doc),get=(id:string)=>rows.find(r=>r.instance.id===id)!,x=(id:string)=>get(id).placement.x;return{stairs:x('stairs-exit'),board:x('notice'),boardwalk:x('boardwalk')+Number(get('boardwalk').props.width),kiosk:x('kiosk'),sunbeds:[0,1,2,3].map(i=>x('sunbed-'+i)),mine:x('sunbed-3'),shack:{x0:x('bar'),x1:x('bar')+Number(get('bar').props.width)},jukebox:x('jukebox'),lime:x('bartender'),order:x('order'),mixer:x('mixer'),crab:x('crab'),tower:x('tower'),drone:x('drone'),net:x('net'),castle:x('castle'),surfer:x('surfer'),shore:x('shore-edge'),pier0:x('pier'),pierLights:x('pier-controller'),fisher:x('fisher'),gull:x('gull'),boat:x('boat')};}
export const beachWidth=Number(beachGeometry().find(r=>r.instance.id==='scene')!.props.width);
export function beachDeviceData(data:SceneData,doc:Composition=beachComposition):SceneData{const result=structuredClone(data),rows=beachGeometry(doc);for(const d of result.devices){const r=rows.find(r=>r.instance.id==='device-'+d.id);if(!r)continue;const spot=d.layout!.spot!;spot.x=r.placement.x;if(spot.y!==undefined||r.placement.h!==0)spot.y=r.placement.h;spot.w=Number(r.props.width)*r.placement.scale;spot.h=Number(r.props.height)*r.placement.scale;}return result;}
export function beachLights(doc:Composition=beachComposition):NonNullable<SceneDef['lights']>{return beachGeometry(doc).filter(r=>r.instance.type==='beach.light').map(r=>({x:r.placement.x,h:r.placement.h,kind:r.props.kind as 'window'|'neon'|'lamp',r:Number(r.props.radius)*r.placement.scale,...(r.props.width?{w:Number(r.props.width)*r.placement.scale,hh:Number(r.props.lightHeight)*r.placement.scale}:{}),...(r.props.color?{col:String(r.props.color)}:{}),...(Number(r.props.alpha)!==1?{a:Number(r.props.alpha)}:{})}));}
export function beachCasters(doc:Composition=beachComposition):NonNullable<SceneDef['casters']>{return beachGeometry(doc).filter(r=>r.props.role==='caster').map(r=>({x:r.placement.x,h:r.placement.h,w:Number(r.props.width)*r.placement.scale}));}
export function bindBeachActors(actors:Readonly<Record<string,Character>>,doc:Composition=beachComposition){for(const row of beachGeometry(doc)){const actor=actors[row.instance.id];if(!actor)continue;const dx=row.placement.x-actor.x;if(Array.isArray(actor.range))actor.range=[actor.range[0]+dx,actor.range[1]+dx];actor.x=row.placement.x;if(actor.h!==undefined||row.placement.h!==0)actor.h=row.placement.h;}}
export function beachEnvironment(doc:Composition,d:DrawView,m:SceneModel,hover:string|null,actors:Readonly<Record<string,Character>>,gull:{shooed:number}):Environment{
 const cam=-d.sx(0),view:View={sx:(wx,par=1)=>Math.round(wx-cam*par),y:d.y,t:d.t,viewW:d.viewW,viewH:d.viewH,cam,gy:d.y(0),flags:{}},rows=beachGeometry(doc),get=(id:string)=>rows.find(r=>r.instance.id===id)!,x=(id:string)=>get(id).placement.x;
 const bindings=defaults(doc),danger=m.get('flag')==='danger',bar=get('bar'),pier=get('pier'),walk=get('boardwalk');
 const values:Record<string,Value>={palette:Math.min(1,light().night*.9+(1-light().daylight)*.1),horizon:get('horizon').placement.h,waterline:get('waterline').placement.h,rented:!!m.get('rented'),billingPaused:m.get('billing')==='pause',billed:Number(m.get('billed')??0),freeDrink:!!m.get('freeDrink'),danger,lamps:m.get('lamps')==='on',gullShooed:gull.shooed,hover:hover??'',barVisible:!(view.sx(bar.placement.x+Number(bar.props.width))<-60||view.sx(bar.placement.x)>view.viewW+60),barWidth:Number(bar.props.width),towerVisible:onScreen(view,view.sx(x('tower'))-70,140),pierVisible:!(view.sx(pier.placement.x+Number(pier.props.width))<0||view.sx(pier.placement.x)>view.viewW),boardwalkVisible:!(view.sx(walk.placement.x+Number(walk.props.width))<-4||view.sx(walk.placement.x)>view.viewW+4),drinkX:x('drink'),drinkH:get('drink').placement.h,shore:x('shore-edge'),lampPositions:rows.filter(r=>r.instance.type==='beach.pier-lamp').map(r=>r.placement.x)};
 for(const[k,v]of Object.entries(values))bindings['beach.'+k]=v;
 for(const row of rows.filter(r=>r.instance.type==='character.prepared')){const id=String(row.props.actor),actor=actors[id];if(!actor)throw new Error('Missing Beach actor '+id);let pose:PreparedCharacter=id.startsWith('ashore-')&&!danger?{visible:false,character:{x:actor.x}} as PreparedCharacter:prepareCharacter(actor,view.t);if(pose.visible){const dx=row.placement.x-actor.x,dh=row.placement.h-(actor.h??0);pose={...pose,character:{...pose.character,x:row.placement.x,h:row.placement.h},frame:{...pose.frame,x:pose.frame.x+dx},height:pose.height+dh};}bindings['actor.'+id+'.pose']=pose as unknown as Value;}
 return{view,state:{},bindings,reduced:false};
}
export function drawBeachComposition(ctx:CanvasRenderingContext2D,d:DrawView,m:SceneModel,hover:string|null,actors:Readonly<Record<string,Character>>,gull:{shooed:number},doc=beachComposition,state:Environment['state']={},options:BeachRenderOptions={}){drawComposition(ctx,art,doc,{...beachEnvironment(doc,d,m,hover,actors,gull),state,...options},'backdrop');}
