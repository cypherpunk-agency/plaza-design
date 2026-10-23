import type {Resolved,Value,Composition,Instance} from '../../art/core/composition';
import type {View} from '../../art/core/view';
import {art} from '../../art';
import {prepareCharacter,type Character,type PreparedCharacter} from '../../runtime/characters';
import {onScreen} from '../../art/core/primitives';
import type {SceneDocument} from './scene-document';
import type {EngineDraw} from '../host';
import type {GameplayDefinition} from './types';
import {BINDING_PROVIDERS} from './binding-providers';
import type {CityModel} from '../../world/city';
import type {LineSystem} from '../../world/transport/line';
import type {PresentationSignals} from './presentation-signals';
import {bindingKeyProblem,bindingKeyScope,type BindingKeyScope} from './binding-keys';
import {evaluateValue,valueSignals,type ValueEnv,type ValueExpr} from './scene-values';
import {atriumFrame,atriumPlace,type AtriumFrame} from './scene-atrium';
/**
 * Binding sources of declared scenes: the names a composition's `bindings` may use, each worked
 * out by the engine every frame. A scene's artwork asks for `actor.keeper.pose` or `world.light`;
 * nothing in the scene computes it. A name no source knows is refused when the scene is checked.
 *
 * - `world.light`: the world's light now (sun, weather, lamps).
 * - `actor.<id>.pose`: the actor's prepared pose, moved to wherever its artwork stands.
 * - `actor.<id>.clip`: the screen rectangle the actor is clipped to (stage `actors.clip`), or null.
 * - `held.<instance>`: the pose of the actor held by that artwork (a stall's vendor, a booth's clerk), prepared where the actor stands; its own `actor.<id>.pose` is hidden while the holder paints it (stage `actors.held`).
 * - `device.<id>.hover`: whether the pointer is over that device.
 * - `value.<key>`: a scene value (gameplay values and device observations), as the model reads it.
 * - `artwork.<type>.spans`: where the rows of an artwork type stand, as [x, x + width] pairs.
 * - `scene.<name>`: a value the scene declares as data (scene.json `stage.values`, scene-values.ts).
 * - `<provider>.<key>`: a registered provider's value (binding-providers/).
 *
 * Stage actor rules (scene.json `stage.actors`) hide actors whose window or counter is off screen, clip actors
 * seen through a window, let a holder paint its actor (`held`) and hide an actor while a value holds (`hide`).
 * A stage atrium (`stage.atrium`) lifts its `far`, `gallery` and `riders` actors to their storey, slab or escalator step.
 */
export interface StageActorRules {
 /** Actors of a presentation role are seen through an artwork role (a window): clipped to it, hidden when it is off screen. */
 clip?:{actors:string;to:string}[];
 /** An actor (presentation role) is hidden when an artwork role is off screen by more than `margin` px. */
 cull?:{actor:string;role:string;margin?:number}[];
 /** Artwork of this type (or id) paints the actor attached to it, instead of the actor's own artwork, while it binds `held.<its id>`; `anchor` limits which attachment counts. */
 held?:{type?:string;instance?:string;anchor?:string}[];
 /** Actors of a presentation role are hidden while the value holds. */
 hide?:{actors:string;when:ValueExpr}[];
}
/** `world`: the city and line system a world-bound scene was rebuilt with (a scene mechanism with `world`, scene-mechanisms.ts); absent until the game binds them. */
export interface BindingContext {view:View;rows:readonly Resolved[];roles:Readonly<Record<string,Resolved>>;actors:Readonly<Record<string,Character>>;source:SceneDocument;gameplay?:GameplayDefinition;uses?:readonly import('../../scenes/kit').SceneUse[];engine?:EngineDraw;world?:{city:CityModel;metro:LineSystem};signals?:PresentationSignals;
 /** The one store of state the scene's mechanisms keep for its providers, under each mechanism's key (scene-mechanisms.ts SceneMechanismContext.shared). */
 shared?:ReadonlyMap<string,unknown>;
 /** Work the values of one frame share (the controller's picture), and the keys of this provider the composition binds. */
 memo?:Map<string,unknown>;wanted?:ReadonlySet<string>}
const POSE=/^actor\.([-a-zA-Z0-9_.]+)\.pose$/,CLIP=/^actor\.([-a-zA-Z0-9_.]+)\.clip$/,HOVER=/^device\.([-a-zA-Z0-9_]+)\.hover$/,VALUE=/^value\.([-a-zA-Z0-9_.:]+)$/,SPANS=/^artwork\.([-a-zA-Z0-9_.]+)\.spans$/,HELD=/^held\.([-a-zA-Z0-9_.]+)$/;
const BUILT_IN=[POSE,CLIP,HOVER,VALUE,SPANS,HELD];
const providerOf=(name:string)=>{const dot=name.indexOf('.');return dot>0&&Object.prototype.hasOwnProperty.call(BINDING_PROVIDERS,name.slice(0,dot))?name.slice(0,dot):undefined;};
export const knownBindingSource=(name:string)=>name==='world.light'||BUILT_IN.some(r=>r.test(name))||!!providerOf(name);
const flatten=(nodes:readonly Instance[]):Instance[]=>nodes.flatMap(n=>[n,...flatten(n.children??[])]);
/** Every binding name the composition uses, with its artwork field's default. */
export function bindingDefaults(doc:Composition):Record<string,Value>{const out:Record<string,Value>={};for(const node of flatten(doc.instances))for(const[field,source]of Object.entries(node.bindings??{}))out[source]=art.get(node.type).visualFields![field].default;return out;}
/** Presentation dependencies do not depend on the presence of an unrelated native mechanism. */
export function worldBindings(doc:Composition):boolean{return Object.keys(bindingDefaults(doc)).some(name=>{const provider=providerOf(name);return provider?BINDING_PROVIDERS[provider].world===true:false;});}
/** The presentation signals (name and starting stamp) the composition's providers and the scene's values offer: the targets a scene's cues may name. */
export function providerSignals(doc:Composition,values?:Parameters<typeof valueSignals>[0]):Record<string,number>{const out:Record<string,number>={};for(const name of Object.keys(bindingDefaults(doc))){const p=providerOf(name);if(p)Object.assign(out,BINDING_PROVIDERS[p].signals);}return{...out,...valueSignals(values)};}
/**
 * Composition bindings a registered provider does not offer, each as a message naming the instance, its field and the binding.
 * A provider's `keys` (binding-keys.ts) say what it offers; a hole names something of this scene (an actor, an artwork instance,
 * a value of the stage), which must exist. A `held.<instance>` names artwork of the composition.
 */
export function unofferedBindings(doc:Composition,scene:Parameters<typeof bindingKeyScope>[1],scope:BindingKeyScope=bindingKeyScope(doc.instances,scene)):string[]{
 const out:string[]=[];
 for(const node of flatten(doc.instances))for(const[field,source]of Object.entries(node.bindings??{})){
  const held=HELD.exec(source);
  if(held){if(!scope.instances.has(held[1]))out.push('Instance "'+node.id+'" ('+node.type+') binds '+field+' to "'+source+'": the composition has no artwork instance "'+held[1]+'"');continue;}
  const provider=providerOf(source);if(!provider)continue;
  const problem=bindingKeyProblem(BINDING_PROVIDERS[provider].keys,source.slice(provider.length+1),scope);
  if(problem)out.push('Instance "'+node.id+'" ('+node.type+') binds '+field+' to "'+source+'": '+problem);
 }
 return out;
}
export function unknownBindingSources(doc:Composition):string[]{return [...new Set(flatten(doc.instances).flatMap(n=>Object.values(n.bindings??{})))].filter(s=>!knownBindingSource(s));}
const roleList=(source:SceneDocument,role:string):readonly string[]=>{const ref=(source.presentation?.actors as Record<string,unknown>|undefined)?.[role];return Array.isArray(ref)?ref as string[]:typeof ref==='string'?[ref]:[];};
/** This frame's values for every binding the composition uses. */
export function bindingValues(doc:Composition,ctx:BindingContext,rules:StageActorRules|undefined):Record<string,Value>{
 const out=bindingDefaults(doc),{view,rows,roles}=ctx,used=new Set(Object.keys(out)),memo=ctx.memo??new Map<string,unknown>();
 if(used.has('world.light'))out['world.light']=view.lighting as unknown as Value;
 const wanted=new Map<string,Set<string>>();
 for(const name of used){let m:RegExpExecArray|null;const provider=providerOf(name);
  if(provider&&!BUILT_IN.some(r=>r.test(name))){if(!wanted.has(provider))wanted.set(provider,new Set());wanted.get(provider)!.add(name.slice(provider.length+1));continue;}
  if((m=HOVER.exec(name)))out[name]=ctx.engine?.hover===m[1];
  else if((m=VALUE.exec(name))){const v=ctx.engine?.m.value(m[1]);if(v!==undefined)out[name]=v;}
  else if((m=SPANS.exec(name))){const type=m[1];out[name]=rows.filter(r=>r.instance.type===type).map(r=>[r.placement.x,r.placement.x+Number(r.props.width)]);}}
 for(const[provider,keys]of wanted){const values=BINDING_PROVIDERS[provider]({...ctx,memo,wanted:keys});for(const key of keys){const v=values[key];if(v!==undefined)out[provider+'.'+key]=v;}}
 const span=(row:Resolved)=>{const p=row.placement,a=view.sx(p.x,p.parallax),b=view.sx(p.x+Number(row.props.width)*p.scale*p.facing,p.parallax);return{left:Math.min(a,b),width:Math.abs(b-a)};};
 const clipped=new Map<string,Resolved>(),culled=new Map<string,{row:Resolved;margin:number}>(),hidden=new Set<string>();
 for(const c of rules?.clip??[]){const row=roles[c.to];if(row)for(const id of roleList(ctx.source,c.actors))clipped.set(id,row);}
 for(const c of rules?.cull??[]){const row=roles[c.role];if(row)for(const id of roleList(ctx.source,c.actor))culled.set(id,{row,margin:c.margin??0});}
 const env:ValueEnv={...ctx,presentation:ctx.source.presentation,flags:view.flags,values:view.values,memo};
 for(const h of rules?.hide??[])if(evaluateValue(h.when,env))for(const id of roleList(ctx.source,h.actors))hidden.add(id);
 // artwork that holds its actor (a stall's vendor): the actor's own artwork shows nothing while the holder paints it
 const holders=rules?.held??[],byId=holders.length?new Map(rows.map(r=>[r.instance.id,r])):undefined;
 const holderOf=(row:Resolved)=>{const at=row.instance.attach,owner=at&&byId?.get(at.instance);
  return owner&&holders.some(h=>(h.type!==undefined?owner.instance.type===h.type:owner.instance.id===h.instance)&&(h.anchor===undefined||at.anchor===h.anchor))&&Object.values(owner.instance.bindings??{}).includes('held.'+owner.instance.id)?owner:undefined;};
 for(const name of used){const m=HELD.exec(name);if(m&&holders.length)out[name]={visible:false,character:{x:0}};}
 const atrium=ctx.source.stage?.atrium;let frame:AtriumFrame|undefined;
 for(const row of rows){
  const id=row.props.actor;if(typeof id!=='string')continue;
  const owner=holderOf(row),poseUsed=used.has('actor.'+id+'.pose'),clipUsed=used.has('actor.'+id+'.clip'),heldUsed=owner&&used.has('held.'+owner.instance.id);
  if(!poseUsed&&!clipUsed&&!heldUsed)continue;
  const actor=ctx.actors[id];if(!actor)throw new Error('Unknown actor '+id);
  if(heldUsed)out['held.'+owner!.instance.id]=prepareCharacter(actor,view.t,{x:actor.x,h:actor.h??0}) as unknown as Value;
  let pose:PreparedCharacter=hidden.has(id)?{visible:false,character:{x:actor.x}} as PreparedCharacter:prepareCharacter(actor,view.t);
  const window=clipped.get(id),cull=culled.get(id);
  if(window){const s=span(window);if(!onScreen(view,s.left,s.width))pose={visible:false,character:pose.character};}
  if(cull){const s=span(cull.row);if(!onScreen(view,s.left-cull.margin,s.width+2*cull.margin))pose={visible:false,character:pose.character};}
  let offscreen=false;
  if(pose.visible){
   let p:{x:number;h:number}=row.placement;
   if(atrium){frame??=atriumFrame(view,roles,rows,ctx.source,atrium);const at=atriumPlace(frame,view,ctx.source,id,p);p=at;offscreen=at.hidden;}
   const dh=p.h-(actor.h??0);
   pose={...pose,character:{...pose.character,x:p.x,...(actor.h!==undefined||p.h!==0?{h:p.h}:{})},frame:{...pose.frame,x:pose.frame.x+p.x-actor.x},height:pose.height+dh};
  }
  if(offscreen||owner)pose={visible:false,character:pose.character};
  if(poseUsed)out['actor.'+id+'.pose']=pose as unknown as Value;
  if(clipUsed){const w=window;if(w){const s=span(w),hh=Number(w.props.height)*w.placement.scale;out['actor.'+id+'.clip']=[s.left,view.y(w.placement.h+hh),s.width,hh];}else out['actor.'+id+'.clip']=null;}
 }
 return out;
}
