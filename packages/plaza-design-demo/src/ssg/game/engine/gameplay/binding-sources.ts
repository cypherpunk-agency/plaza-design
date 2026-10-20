import type {Resolved,Value,Composition,Instance} from '../../art/core/composition';
import type {View} from '../../art/core/view';
import {art} from '../../art';
import {prepareCharacter,type Character,type PreparedCharacter} from '../../runtime/characters';
import {light} from '../../world/light';
import {onScreen} from '../../art/core/primitives';
import type {SceneDocument} from './scene-document';
import type {EngineDraw} from '../host';
import type {GameplayDefinition} from './types';
import {BINDING_PROVIDERS} from './binding-providers';
/**
 * Binding sources of declared scenes: the names a composition's `bindings` may use, each worked
 * out by the engine every frame. A scene's artwork asks for `actor.keeper.pose` or `world.light`;
 * nothing in the scene computes it. A name no source knows is refused when the scene is checked.
 *
 * - `world.light`: the world's light now (sun, weather, lamps).
 * - `actor.<id>.pose`: the actor's prepared pose, moved to wherever its artwork stands.
 * - `actor.<id>.clip`: the screen rectangle the actor is clipped to (stage `actors.clip`), or null.
 * - `device.<id>.hover`: whether the pointer is over that device.
 * - `value.<key>`: a scene value (gameplay values and device observations), as the model reads it.
 * - `artwork.<type>.spans`: where the rows of an artwork type stand, as [x, x + width] pairs.
 * - `<provider>.<key>`: a registered provider's value (binding-providers/).
 *
 * Stage actor rules (scene.json `stage.actors`) hide actors whose window or counter is off screen
 * and clip actors seen through a window.
 */
export interface StageActorRules {
 /** Actors of a presentation role are seen through an artwork role (a window): clipped to it, hidden when it is off screen. */
 clip?:{actors:string;to:string}[];
 /** An actor (presentation role) is hidden when an artwork role is off screen by more than `margin` px. */
 cull?:{actor:string;role:string;margin?:number}[];
}
export interface BindingContext {view:View;rows:readonly Resolved[];roles:Readonly<Record<string,Resolved>>;actors:Readonly<Record<string,Character>>;source:SceneDocument;gameplay?:GameplayDefinition;uses?:readonly import('../../scenes/kit').SceneUse[];engine?:EngineDraw}
const POSE=/^actor\.([-a-zA-Z0-9_.]+)\.pose$/,CLIP=/^actor\.([-a-zA-Z0-9_.]+)\.clip$/,HOVER=/^device\.([-a-zA-Z0-9_]+)\.hover$/,VALUE=/^value\.([-a-zA-Z0-9_.:]+)$/,SPANS=/^artwork\.([-a-zA-Z0-9_.]+)\.spans$/;
const providerOf=(name:string)=>{const dot=name.indexOf('.');return dot>0&&Object.prototype.hasOwnProperty.call(BINDING_PROVIDERS,name.slice(0,dot))?name.slice(0,dot):undefined;};
export const knownBindingSource=(name:string)=>name==='world.light'||[POSE,CLIP,HOVER,VALUE,SPANS].some(r=>r.test(name))||!!providerOf(name);
const flatten=(nodes:readonly Instance[]):Instance[]=>nodes.flatMap(n=>[n,...flatten(n.children??[])]);
/** Every binding name the composition uses, with its artwork field's default. */
export function bindingDefaults(doc:Composition):Record<string,Value>{const out:Record<string,Value>={};for(const node of flatten(doc.instances))for(const[field,source]of Object.entries(node.bindings??{}))out[source]=art.get(node.type).visualFields![field].default;return out;}
export function unknownBindingSources(doc:Composition):string[]{return [...new Set(flatten(doc.instances).flatMap(n=>Object.values(n.bindings??{})))].filter(s=>!knownBindingSource(s));}
const roleList=(source:SceneDocument,role:string):readonly string[]=>{const ref=(source.presentation?.actors as Record<string,unknown>|undefined)?.[role];return Array.isArray(ref)?ref as string[]:typeof ref==='string'?[ref]:[];};
/** This frame's values for every binding the composition uses. */
export function bindingValues(doc:Composition,ctx:BindingContext,rules:StageActorRules|undefined):Record<string,Value>{
 const out=bindingDefaults(doc),{view,rows,roles}=ctx,used=new Set(Object.keys(out));
 if(used.has('world.light'))out['world.light']=light() as unknown as Value;
 const provided=new Map<string,Record<string,Value>>();
 for(const name of used){let m:RegExpExecArray|null;const provider=providerOf(name);
  if(provider&&![POSE,CLIP,HOVER,VALUE,SPANS].some(r=>r.test(name))){if(!provided.has(provider))provided.set(provider,BINDING_PROVIDERS[provider](ctx));const v=provided.get(provider)![name.slice(provider.length+1)];if(v!==undefined)out[name]=v;continue;}
  if((m=HOVER.exec(name)))out[name]=ctx.engine?.hover===m[1];
  else if((m=VALUE.exec(name))){const v=ctx.engine?.m.value(m[1]);if(v!==undefined)out[name]=v;}
  else if((m=SPANS.exec(name))){const type=m[1];out[name]=rows.filter(r=>r.instance.type===type).map(r=>[r.placement.x,r.placement.x+Number(r.props.width)]);}}
 const span=(row:Resolved)=>{const p=row.placement,a=view.sx(p.x,p.parallax),b=view.sx(p.x+Number(row.props.width)*p.scale*p.facing,p.parallax);return{left:Math.min(a,b),width:Math.abs(b-a)};};
 const clipped=new Map<string,Resolved>(),culled=new Map<string,{row:Resolved;margin:number}>();
 for(const c of rules?.clip??[]){const row=roles[c.to];if(row)for(const id of roleList(ctx.source,c.actors))clipped.set(id,row);}
 for(const c of rules?.cull??[]){const row=roles[c.role];if(row)for(const id of roleList(ctx.source,c.actor))culled.set(id,{row,margin:c.margin??0});}
 for(const row of rows){
  const id=row.props.actor;if(typeof id!=='string'||!used.has('actor.'+id+'.pose')&&!used.has('actor.'+id+'.clip'))continue;
  const actor=ctx.actors[id];if(!actor)throw new Error('Unknown actor '+id);
  let pose:PreparedCharacter=prepareCharacter(actor,view.t);
  const window=clipped.get(id),cull=culled.get(id);
  if(window){const s=span(window);if(!onScreen(view,s.left,s.width))pose={visible:false,character:pose.character};}
  if(cull){const s=span(cull.row);if(!onScreen(view,s.left-cull.margin,s.width+2*cull.margin))pose={visible:false,character:pose.character};}
  if(pose.visible){const p=row.placement,dh=p.h-(actor.h??0);pose={...pose,character:{...pose.character,x:p.x,...(actor.h!==undefined||p.h!==0?{h:p.h}:{})},frame:{...pose.frame,x:pose.frame.x+p.x-actor.x},height:pose.height+dh};}
  if(used.has('actor.'+id+'.pose'))out['actor.'+id+'.pose']=pose as unknown as Value;
  if(used.has('actor.'+id+'.clip')){const w=window;if(w){const s=span(w),hh=Number(w.props.height)*w.placement.scale;out['actor.'+id+'.clip']=[s.left,view.y(w.placement.h+hh),s.width,hh];}else out['actor.'+id+'.clip']=null;}
 }
 return out;
}
