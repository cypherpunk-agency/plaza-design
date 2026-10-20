import {presentationFlag,type ScenePresentation} from '../../engine/gameplay/scene-presentation';
import sceneSource from './scene.json';
import { frameView } from '../../art/core/view';
import {TICKER} from '../../art/signage/screens';
import {screenLine} from '../../world/weather';
/** Market source geometry and explicit prepared vendor/crowd bindings. */
import { art,drawComposition,resolveComposition,type Composition,type Environment,type Instance,type Value } from '../../art';
import { marketStallSpec } from '../../art/assemblies/market-elements';
import type { View } from '../../art/core/view';
import { prepareCharacter,type Character } from '../../runtime/characters';
import document from './composition.json';
export const marketArt=art,marketComposition=art.validate(document);
const flatten=(nodes:Instance[]):Instance[]=>nodes.flatMap(n=>[n,...flatten(n.children??[])]);
export function validateMarketComposition(input:unknown):Composition{const doc=art.validate(input);if(doc.scene!=='market')throw new Error('Expected market composition');for(const i of flatten(doc.instances))for(const[k,source]of Object.entries(i.bindings??{})){const expected=k==='open'&&i.type==='market.end-wall'?'market.exitOpen':k==='text'&&i.type==='market.ticker'?'market.weather':k==='vendorPose'?'market.vendor.'+i.id:k==='pose'?'market.actor.'+i.props.actor:'market.clip.'+i.props.actor;if(source!==expected)throw new Error(i.id+': unknown Market binding '+source);}const vendors=new Set<string>();for(const i of flatten(doc.instances))if(i.type==='character.prepared'&&i.attach?.anchor==='vendor'){if(vendors.has(i.attach.instance))throw new Error('One vendor actor per assembly');vendors.add(i.attach.instance);}return doc;}
validateMarketComposition(marketComposition);
function defaults(doc:Composition){const b:Record<string,Value>={"market.weather":"","market.exitOpen":false};for(const i of flatten(doc.instances)){if(i.type==='character.prepared'){b['market.actor.'+i.props.actor]={visible:false,character:{x:0}};b['market.clip.'+i.props.actor]=null;}if(i.type==='market.stall'||i.type==='market.booth')b['market.vendor.'+i.id]={visible:false,character:{x:0}};}return b;}
const geometryView:View={...frameView(0),sx:x=>x,y:h=>-h,gy:0,cam:0,t:0,viewW:640,viewH:360,flags:{}};
export function marketGeometry(doc:Composition=marketComposition){return resolveComposition(art,doc,{view:geometryView,state:{},bindings:defaults(doc),reduced:false});}
export function marketPlacement(id:string,doc:Composition=marketComposition){const row=marketGeometry(doc).find(r=>r.instance.id===id);if(!row)throw new Error('Unknown Market instance '+id);return row.placement;}
export function marketStalls(doc:Composition=marketComposition){return marketGeometry(doc).filter(r=>r.instance.type==='market.stall').map(r=>({...marketStallSpec(r.props,r.placement.x),elevation:r.placement.h}));}
export type MarketRenderOptions=Partial<Pick<Environment,'visibility'|'opacity'|'clips'|'sequenceTime'|'reduced'>>;
/** One source actor attached at a vendor anchor is painted between the assembly back and counter. */
function vendorActor(rows:ReturnType<typeof marketGeometry>,assembly:string){return rows.find(r=>r.instance.type==='character.prepared'&&r.instance.attach?.instance===assembly&&r.instance.attach.anchor==='vendor');}
export function marketEnvironment(view:View,actors:Readonly<Record<string,Character>>,doc:Composition=marketComposition,presentation:ScenePresentation|null=sceneSource.presentation as ScenePresentation):Environment{
 const bindings=defaults(doc),rows=marketGeometry(doc);bindings['market.exitOpen']=presentationFlag(presentation,view.flags,'exitOpen');bindings['market.weather']=TICKER.map(l=>l==='WEATHER'?screenLine():l).join('   ·   ');
 for(const r of rows){if(r.instance.type==='character.prepared'){
  const p=actors[String(r.props.actor)];if(!p)throw new Error('Unknown Market actor '+r.props.actor);let pose=prepareCharacter(p,view.t);
  if(pose.visible){const dh=r.placement.h-(p.h??0);pose={...pose,character:{...pose.character,x:r.placement.x,...(p.h!==undefined||r.placement.h!==0?{h:r.placement.h}:{})},frame:{...pose.frame,x:pose.frame.x+r.placement.x-p.x},height:pose.height+dh};}
  const owner=r.instance.attach?.anchor==='vendor'?rows.find(a=>a.instance.id===r.instance.attach!.instance):undefined;
  bindings['market.actor.'+r.props.actor]=(owner&&(owner.instance.type==='market.stall'||owner.instance.type==='market.booth')?{visible:false,character:pose.character}:pose) as unknown as Value;
 }else if(r.instance.type==='market.stall'||r.instance.type==='market.booth'){
  const row=vendorActor(rows,r.instance.id),p=row?actors[String(row.props.actor)]:undefined;
  bindings['market.vendor.'+r.instance.id]=(p?prepareCharacter(p,view.t,{x:p.x,h:p.h??0}):{visible:false,character:{x:0}}) as unknown as Value;
 }}return{view,state:{},bindings,reduced:false};
}
export function drawMarketComposition(ctx:CanvasRenderingContext2D,view:View,actors:Readonly<Record<string,Character>>,doc:Composition=marketComposition,state:Environment['state']={},options:MarketRenderOptions={},presentation:ScenePresentation|null=sceneSource.presentation as ScenePresentation){drawComposition(ctx,art,doc,{...marketEnvironment(view,actors,doc,presentation),state,...options},'backdrop');}
export function drawMarketForeground(ctx:CanvasRenderingContext2D,view:View,actors:Readonly<Record<string,Character>>,doc:Composition=marketComposition,state:Environment['state']={},options:MarketRenderOptions={},presentation:ScenePresentation|null=sceneSource.presentation as ScenePresentation){drawComposition(ctx,art,doc,{...marketEnvironment(view,actors,doc,presentation),state,...options},'foreground');}
