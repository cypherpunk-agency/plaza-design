import { frameView } from '../../art/core/view';
/** Harbor authoring adapter: geometry and visual simulation resolve before artwork paints. */
import { art } from '../../art';
import { drawComposition,resolveComposition,type Composition,type Environment,type Value } from '../../art/core/composition';
import type { View } from '../../art/core/view';
import { prepareCharacter,type Character,type PreparedCharacter } from '../../runtime/characters';
import type { HarborLayout,HarborVisual,CraneVisual } from '../../art/assemblies/harbor-pier';
import { onScreen } from '../../art/core/primitives';
import { screenLine } from '../../world/weather';
import type { SceneDef } from '../kit';
import source from './composition.json';
export type HarborRenderOptions=Partial<Pick<Environment,'visibility'|'opacity'|'clips'|'sequenceTime'|'reduced'>>;
export const harborMarkerPolicy={exitAxes:['x'] as const,description:'Exits use horizontal triggers. Other interaction, light and shadow markers resolve their authored heights.'};
const geometryView:View={...frameView(0),sx:x=>x,y:h=>-h,gy:0,cam:0,t:0,viewW:960,viewH:360,flags:{}};
const required=new Map(source.instances.map(n=>[n.id,n.type]));
const actors=source.instances.filter(n=>n.type==='character.prepared').map(n=>String(n.props.actor));
const bindings=new Set(['layout','visual','fishPose','teaPose','loads','stackOrigins','forkliftOrigin','archVisible','bondedVisible'].map(k=>'harbor.'+k).concat(actors.map(k=>'actor.'+k+'.pose'),['clip.hut','clip.crane0','clip.crane1']));
export function validateHarborComposition(input:unknown):Composition{const doc=art.validate(input);if(doc.scene!=='harbor')throw new Error('Expected harbor composition');for(const[id,type]of required)if(doc.instances.find(n=>n.id===id)?.type!==type)throw new Error('harbor: missing/changed instance '+id);for(const n of doc.instances){for(const b of Object.values(n.bindings??{}))if(!bindings.has(b))throw new Error(n.id+': unknown harbor binding '+b);if(n.type==='character.prepared'&&(!actors.includes(String(n.props.actor))||n.bindings?.pose!=='actor.'+n.props.actor+'.pose'))throw new Error(n.id+': invalid harbor actor binding');}return doc;}
export const harborComposition=validateHarborComposition(source);
function defaults(doc:Composition){const out:Record<string,Value>={};for(const n of doc.instances)for(const[k,b]of Object.entries(n.bindings??{}))out[b]=art.get(n.type).visualFields![k].default;return out;}
export function harborGeometry(doc:Composition=harborComposition){return resolveComposition(art,doc,{view:geometryView,state:{},bindings:defaults(doc),reduced:false});}
export function harborLayout(doc:Composition=harborComposition):HarborLayout{
 const rows=harborGeometry(doc),get=(id:string)=>rows.find(r=>r.instance.id===id)!,x=(id:string)=>get(id).placement.x,arch=get('arch'),hut=get('hut'),bonded=get('bonded');
 return{width:Number(get('scene').props.width),spawn:x('spawn'),hut:{x:x('hut'),w:Number(hut.props.width),h:Number(hut.props.height)},notice:x('notice'),arch:{x0:x('arch'),x1:x('arch')+Number(arch.props.width),h:Number(arch.props.height)},podium:x('podium'),manifest:x('manifest'),callBox:x('call-box'),cranes:[0,1].map(i=>({x:x('crane'+i),id:String(get('crane'+i).props.gantry) as 'sts1'|'sts3',phase:Number(get('crane'+i).props.phase)})),fish:{x:x('fish'),w:Number(get('fish').props.width),use:x('fish-use')},drinks:{x:x('drinks'),w:Number(get('drinks').props.width),use:x('drink-use')},den:x('den'),fence:{x0:x('bonded'),x1:x('bonded')+Number(bonded.props.width),gate:x('bonded-gate')},ghost:x('ghost'),bribe:x('bribe-use'),ghostUse:x('ghost-use'),bollards:rows.filter(r=>r.instance.type==='harbor.bollard').map(r=>r.placement.x),berth:x('berth'),rails:x('rails'),beacon:x('beacon'),metro:x('metro'),terminal:x('terminal'),taxi:x('taxi'),ferry:x('ferry')};
}
/** The established tea visit and forklift shuttle, now a pure controller snapshot. */
export function harborVisual(layout:HarborLayout,t:number,craneCall:number,bribed:boolean,forklift:{x:number;travel:number}):HarborVisual{
 const cranes:CraneVisual[]=layout.cranes.map((c,ci)=>{let twx=c.x-40+Math.sin(t*.004+c.phase)*150,hang=128+Math.round(Math.sin(t*.01+c.phase)*6),carry=true;const u=t-craneCall,CALL=820;if(ci===0&&u>=0&&u<CALL){const k=u<160?u/160:u<CALL-160?1:(CALL-u)/160,ease=k*k*(3-2*k);twx=twx+(layout.callBox+14-twx)*ease;const dn=u<160?0:u<360?(u-160)/200:u<470?1:u<660?1-(u-470)/190:0;hang=Math.round(hang+(14-hang)*dn*dn*(3-2*dn));carry=false;}return{twx,hang,carry,u};});
 const u=t%1500,k=u<500?u/500:u<750?1:u<1250?1-(u-750)/500:0;
 return{cranes,forklift:{x:forklift.x+forklift.travel*k*k*(3-2*k),dir:u<500||u>=1250?1:-1},bribed,weatherLine:screenLine('harbor')};
}
const value=(v:unknown)=>v as Value;
export function harborEnvironment(doc:Composition,view:View,actorMap:Readonly<Record<string,Character>>,craneCall:number):Environment{
 const rows=harborGeometry(doc),get=(id:string)=>rows.find(r=>r.instance.id===id)!,L=harborLayout(doc),fork=get('forklift'),vis=harborVisual(L,view.t,craneCall,!!view.flags['harbor:bribed'],{x:fork.placement.x,travel:Number(fork.props.travel)}),b=defaults(doc);
 b['harbor.archVisible']=onScreen(view,view.sx(L.arch.x0)-20,view.sx(L.arch.x1)-view.sx(L.arch.x0)+60);b['harbor.bondedVisible']=onScreen(view,view.sx(L.fence.x0)-20,view.sx(L.fence.x1)-view.sx(L.fence.x0)+40);b['harbor.layout']=value(L);b['harbor.visual']=value(vis);b['harbor.stackOrigins']=[0,1,2,3].map(i=>get('stack'+i).placement.x);b['harbor.forkliftOrigin']=fork.placement.x;
 b['harbor.loads']=[0,1].map(i=>{const p=get('crane'+i+'-load').props;return{w:Number(p.width),p:Number(p.paint),seed:Number(p.seed),code:String(p.code),label:String(p.label)};});
 for(const row of rows.filter(r=>r.instance.type==='character.prepared')){
  const id=String(row.props.actor),actor=actorMap[id];if(!actor)throw new Error('Missing harbor actor '+id);let at={...row.placement},override:Parameters<typeof prepareCharacter>[2];let visible=true;
  if(id.startsWith('operator')){const i=Number(id.slice(-1)),c=L.cranes[i],cv=vis.cranes[i];at.x+=cv.twx-c.x;visible=onScreen(view,view.sx(c.x-230),460);override={x:at.x,h:at.h};}
  if(id==='driver'){at.x+=vis.forklift.x-fork.placement.x+(vis.forklift.dir<0?8:0);visible=onScreen(view,view.sx(vis.forklift.x)-50,100);override={x:at.x,h:at.h,facing:vis.forklift.dir};}
  if(id==='watchman')visible=onScreen(view,view.sx(L.hut.x),L.hut.w);
  if(id.startsWith('den-person'))visible=onScreen(view,view.sx(L.den)-60,248);
  if(id==='guard')override={act:vis.bribed?'smoke':'stand',facing:vis.bribed?1:-1};
  let pose:PreparedCharacter=visible?prepareCharacter(actor,view.t,override):{visible:false,character:{x:actor.x}};
  if(pose.visible&&!id.startsWith('operator')&&id!=='driver'){const dx=at.x-actor.x,dh=at.h-(actor.h??0);pose={...pose,character:{...pose.character,x:at.x,h:at.h},frame:{...pose.frame,x:pose.frame.x+dx},height:pose.height+dh};}
  b['actor.'+id+'.pose']=value(pose);
 }
 b['harbor.fishPose']=value(prepareCharacter(actorMap.fishSeller,view.t,{x:get('fishSeller').placement.x,h:get('fishSeller').placement.h}));
 b['harbor.teaPose']=value(prepareCharacter(actorMap.teaMan,view.t,{x:get('teaMan').placement.x,h:get('teaMan').placement.h}));
 b['clip.hut']=[view.sx(L.hut.x)+41,view.y(60)+1,26,22];for(const i of[0,1])b['clip.crane'+i]=[view.sx(vis.cranes[i].twx)-41,view.y(188)+4,20,22];
 return{view,state:{},bindings:b,reduced:false};
}
export function drawHarborComposition(ctx:CanvasRenderingContext2D,view:View,actorMap:Readonly<Record<string,Character>>,craneCall:number,pass:'backdrop'|'foreground',doc=harborComposition,state:Environment['state']={},options:HarborRenderOptions={}){drawComposition(ctx,art,doc,{...harborEnvironment(doc,view,actorMap,craneCall),state,...options},pass);}
export function harborLights(doc:Composition=harborComposition):NonNullable<SceneDef['lights']>{return harborGeometry(doc).filter(r=>r.props.role==='light').map(r=>({x:r.placement.x,h:r.placement.h,kind:r.props.kind as 'lamp'|'window'|'neon',r:Number(r.props.r),...(r.props.color?{col:String(r.props.color)}:{}),...(r.props.width?{w:Number(r.props.width),hh:Number(r.props.lightHeight)}:{})}));}
export function harborCasters(doc:Composition=harborComposition):NonNullable<SceneDef['casters']>{return harborGeometry(doc).filter(r=>r.props.role==='caster').map(r=>({x:r.placement.x,h:r.placement.h,w:Number(r.props.width)}));}
export function adaptHarbor(scene:Omit<SceneDef,'drawBackdrop'|'drawFront'>,actorMap:Readonly<Record<string,Character>>,call:()=>number,document=harborComposition,state:Environment['state']={},options:HarborRenderOptions={}):SceneDef{
 const doc=validateHarborComposition(document),rows=harborGeometry(doc),get=(id:string)=>rows.find(r=>r.instance.id===id)!,at=(id:string)=>get(id).placement,uses={fish:'fish-use',drink:'drink-use',crane:'call-box',bribe:'bribe-use',mark:'ghost-use',cat:'cat-use'} as Record<string,string>,exits={metro:'metro',taxi:'taxi',stacks:'terminal',beach:'beach-exit'} as Record<string,string>;
 return{...scene,width:Number(get('scene').props.width),spawn:at('spawn').x,horizon:at('horizon-height').h,shade:{back:{h:at('shade0').h,gaps:rows.filter(r=>r.props.role==='shade-gap').map(r=>[r.placement.x,r.placement.x+Number(r.props.width)] as [number,number])}},lights:harborLights(doc),casters:harborCasters(doc),exits:scene.exits.map(e=>({...e,x:at(exits[e.id]).x})),readables:scene.readables?.map(r=>({...r,x:at(r.id).x,...(at(r.id).h!==0?{h:at(r.id).h,promptH:(r.promptH??0)+at(r.id).h}:{})})),uses:scene.uses?.map(u=>({...u,x:at(uses[u.id]).x,...(at(uses[u.id]).h!==0?{h:(u.h??0)+at(uses[u.id]).h,promptH:(u.promptH??0)+at(uses[u.id]).h}:{})})),people:scene.people?.map(p=>{const id=Object.keys(actorMap).find(id=>actorMap[id]===p);if(!id)return p;const row=at(id);return{...p,x:row.x,...(p.h!==undefined||row.h!==0?{h:row.h}:{})};}),drawBackdrop:(ctx,v)=>drawHarborComposition(ctx,v,actorMap,call(),'backdrop',doc,state,options),drawFront:(ctx,v)=>drawHarborComposition(ctx,v,actorMap,call(),'foreground',doc,state,options)};
}
