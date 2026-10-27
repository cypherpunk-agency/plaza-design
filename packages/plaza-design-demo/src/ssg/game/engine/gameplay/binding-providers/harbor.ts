import {art} from '../../../art';
import {resolveComposition,type ChunkDocument,type AssetInstance,type Resolved,type Value} from '../../../art/core/composition';
import {frameView} from '../../../art/core/view';
import {onScreen} from '../../../art/core/primitives';
import type {HarborLayout,HarborVisual,CraneVisual} from '../../../art/assemblies/harbor-pier';
import {prepareCharacter,type PreparedCharacter} from '../../../runtime/characters';
import {screenLine} from '../../../world/weather';
import {manifestGeometry} from '../manifest-geometry';
import {presentationActor,presentationActors,presentationFlag,type ScenePresentationActorRole} from '../scene-presentation';
import type {SceneDocument} from '../scene-document';
import type {BindingContext} from '../binding-sources';
import {provide} from '../binding-keys';
/**
 * Harbor's binding provider: where the pier stands (layout), what moves on it (cranes, forklift,
 * the tea visit), the stall vendors, the crane loads, and its people, who ride the cranes and the
 * forklift, sit in the hut and the den, and are seen through the hut window. Every position comes
 * from the artwork roles of scene.json; the crane call arrives as the `craneCall` signal.
 */
export const harborSignals={craneCall:-1e9} as const;
const value=(v:unknown)=>v as Value;
const roleRow=(roles:Readonly<Record<string,Resolved>>,role:string)=>{const r=roles[role];if(!r)throw Error('Harbor requires artwork role '+role);return r;};
export function harborLayoutOf(roles:Readonly<Record<string,Resolved>>,width:number):HarborLayout{
 const get=(role:string)=>roleRow(roles,role),x=(role:string)=>get(role).placement.x,arch=get('arch'),hut=get('hut'),bonded=get('bonded');
 return{width,hut:{x:x('hut'),w:Number(hut.props.width),h:Number(hut.props.height)},notice:x('notice'),arch:{x0:x('arch'),x1:x('arch')+Number(arch.props.width),h:Number(arch.props.height)},podium:x('podium'),manifest:x('manifest'),callBox:x('call-box'),cranes:[0,1].map(i=>({x:x('crane'+i),id:String(get('crane'+i).props.gantry) as 'sts1'|'sts2'|'sts3',phase:Number(get('crane'+i).props.phase)})),fish:{x:x('fish'),w:Number(get('fish').props.width)},drinks:{x:x('drinks'),w:Number(get('drinks').props.width)},den:x('den'),fence:{x0:x('bonded'),x1:x('bonded')+Number(bonded.props.width),gate:x('bonded-gate')},ghost:x('ghost'),berth:x('berth'),rails:x('rails'),beacon:x('beacon'),metro:x('metro'),terminal:x('terminal'),taxi:x('taxi'),ferry:x('ferry')};
}
const flatten=(nodes:AssetInstance[]):AssetInstance[]=>nodes.flatMap(n=>[n,...flatten(n.children??[])]);
/** The pier's layout from its composition and scene documents (the vehicle workbench draws the pier with it). */
export function harborLayout(composition:unknown,scene:SceneDocument):HarborLayout{
 const doc=art.validate(composition) as ChunkDocument,bindings:Record<string,Value>={};
 for(const n of flatten(doc.instances))for(const[k,b]of Object.entries(n.bindings??{}))bindings[b]=art.get(n.type).visualFields![k].default;
 const rows=resolveComposition(art,doc,{view:{...frameView(0),sx:x=>x,y:h=>-h,gy:0,cam:0,t:0,viewW:960,viewH:360,flags:{}},state:{},bindings,reduced:false}),geometry=manifestGeometry(scene,rows,[],{groundExits:false});
 return harborLayoutOf(geometry.artwork,geometry.width);
}
/** The established tea visit and forklift shuttle, a pure snapshot of time. */
export function harborVisual(layout:HarborLayout,t:number,craneCall:number,bribed:boolean,forklift:{x:number;travel:number}):HarborVisual{
 const cranes:CraneVisual[]=layout.cranes.map((c,ci)=>{let twx=c.x-40+Math.sin(t*.004+c.phase)*150,hang=128+Math.round(Math.sin(t*.01+c.phase)*6),carry=true;const u=t-craneCall,CALL=820;if(ci===0&&u>=0&&u<CALL){const k=u<160?u/160:u<CALL-160?1:(CALL-u)/160,ease=k*k*(3-2*k);twx=twx+(layout.callBox+14-twx)*ease;const dn=u<160?0:u<360?(u-160)/200:u<470?1:u<660?1-(u-470)/190:0;hang=Math.round(hang+(14-hang)*dn*dn*(3-2*dn));carry=false;}return{twx,hang,carry,u};});
 const u=t%1500,k=u<500?u/500:u<750?1:u<1250?1-(u-750)/500:0;
 return{cranes,forklift:{x:forklift.x+forklift.travel*k*k*(3-2*k),dir:u<500||u>=1250?1:-1},bribed,weatherLine:screenLine('harbor')};
}
const provider=(ctx:BindingContext):Record<string,Value>=>{
 const {view,rows,roles,source,actors}=ctx,get=(role:string)=>roleRow(roles,role);
 const width=typeof source.manifest!.width==='number'?source.manifest!.width:Number(rows.find(r=>r.instance.id===(source.manifest!.width as {instance:string}).instance)!.props[(source.manifest!.width as {property:string}).property]);
 const L=harborLayoutOf(roles,width),fork=get('forklift'),attached=(row:Resolved,role:string)=>row.instance.attach?.instance===get(role).instance.id;
 const vis=harborVisual(L,view.t,ctx.signals?ctx.signals.read('craneCall'):harborSignals.craneCall,presentationFlag(source.presentation,view.flags,'bribed'),{x:fork.placement.x,travel:Number(fork.props.travel)});
 const out:Record<string,Value>={};
 out.archVisible=onScreen(view,view.sx(L.arch.x0)-20,view.sx(L.arch.x1)-view.sx(L.arch.x0)+60);out.bondedVisible=onScreen(view,view.sx(L.fence.x0)-20,view.sx(L.fence.x1)-view.sx(L.fence.x0)+40);out.layout=value(L);out.visual=value(vis);out.stackOrigins=[0,1,2,3].map(i=>get('stack'+i).placement.x);out.forkliftOrigin=fork.placement.x;
 out.loads=[0,1].map(i=>{const p=get('crane'+i+'-load').props;return{w:Number(p.width),p:Number(p.paint),seed:Number(p.seed),code:String(p.code),label:String(p.label)};});
 const actorRole=(role:ScenePresentationActorRole)=>presentationActor(source.presentation,role),denGuests=new Set(presentationActors(source.presentation,'denGuests'));
 for(const row of rows.filter(r=>r.instance.type==='character.prepared')){
  const id=String(row.props.actor),actor=actors[id];if(!actor)throw new Error('Missing harbor actor '+id);let at={...row.placement},override:Parameters<typeof prepareCharacter>[2],clip:Value=null,visible=true;
  const ci=[0,1].find(i=>actorRole(i===0?'operator0':'operator1')===id&&attached(row,'crane'+i)),driving=actorRole('driver')===id&&attached(row,'forklift');
  if(ci!==undefined){const c=L.cranes[ci],cv=vis.cranes[ci];at.x+=cv.twx-c.x;visible=onScreen(view,view.sx(c.x-230),460);override={x:at.x,h:at.h};clip=[view.sx(cv.twx)-41,view.y(get('crane'+ci).placement.h+188)+4,20,22];}
  if(driving){at.x+=vis.forklift.x-fork.placement.x+(vis.forklift.dir<0?8:0);visible=onScreen(view,view.sx(vis.forklift.x)-50,100);override={x:at.x,h:at.h,facing:vis.forklift.dir};}
  if(actorRole('watchman')===id&&attached(row,'hut')){visible=onScreen(view,view.sx(L.hut.x),L.hut.w);clip=[view.sx(L.hut.x)+41,view.y(get('hut').placement.h+60)+1,26,22];}
  if(denGuests.has(id)&&attached(row,'den'))visible=onScreen(view,view.sx(L.den)-60,248);
  if(actorRole('guard')===id)override={act:vis.bribed?'smoke':'stand',facing:vis.bribed?1:-1};
  let pose:PreparedCharacter=visible?prepareCharacter(actor,view.t,override):{visible:false,character:{x:actor.x}};
  if(pose.visible&&ci===undefined&&!driving){const dx=at.x-actor.x,dh=at.h-(actor.h??0);pose={...pose,character:{...pose.character,x:at.x,h:at.h},frame:{...pose.frame,x:pose.frame.x+dx},height:pose.height+dh};}
  out['actor.'+id]=value((actorRole('fishVendor')===id&&attached(row,'fish')||actorRole('teaVendor')===id&&attached(row,'drinks'))?{visible:false,character:{x:actor.x}}:pose);out['clip.'+id]=clip;
 }
 const vendor=(role:'fishVendor'|'teaVendor',owner:string):PreparedCharacter=>{const id=actorRole(role),row=rows.find(r=>r.instance.type==='character.prepared'&&r.props.actor===id&&attached(r,owner)),actor=id?actors[id]:undefined;return row&&actor?prepareCharacter(actor,view.t,{x:row.placement.x,h:row.placement.h}):{visible:false,character:{x:0}};};
 out.fishPose=value(vendor('fishVendor','fish'));out.teaPose=value(vendor('teaVendor','drinks'));
 return out;
};

export const harborProvider=provide(['archVisible','bondedVisible','layout','visual','stackOrigins','forkliftOrigin','loads','actor.<actor>','clip.<actor>','fishPose','teaPose'],provider,harborSignals);
