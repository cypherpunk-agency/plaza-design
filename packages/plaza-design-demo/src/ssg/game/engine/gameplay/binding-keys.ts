import type {Value,Instance} from '../../art/core/composition';
import type {BindingContext} from './binding-sources';
/**
 * The keys a binding provider offers (binding-providers/). A provider declares them next to its
 * code as a list of key patterns; a pattern is an exact key (`snapshot`) or a key with one typed
 * hole between angle brackets:
 *
 * - `<actor>`: an actor id of the scene (scene.actors).
 * - `<instance>` / `<instance:type>`: an artwork instance id of the composition, of that artwork type when given.
 * - `<role>`: a presentation flag role (scene.json `presentation.flags`).
 * - `<use>`: an interaction id (scene.json `uses`).
 *
 * Declared-scene validation refuses a composition binding its provider does not offer, and checks
 * that a hole names something that exists. The binding-keys check runs every folder scene and
 * compares what each provider returns with its declaration, so the two cannot drift.
 */
export type BindingKeys=readonly string[];
/** What a hole can name in one scene. */
export interface BindingKeyScope {actors:ReadonlySet<string>;instances:ReadonlyMap<string,string>;roles:ReadonlySet<string>;uses:ReadonlySet<string>}
export type BindingProvider=((ctx:BindingContext)=>Record<string,Value>)&{
 /** The keys the provider offers (patterns, see binding-keys.ts). */
 keys:BindingKeys;
 /** The presentation signals the provider reads (name and starting stamp); a scene's cues may target them. */
 signals?:Readonly<Record<string,number>>};
/** Declares a provider with the keys it offers (and the signals it reads). */
export function provide(keys:BindingKeys,fn:(ctx:BindingContext)=>Record<string,Value>,signals?:Readonly<Record<string,number>>):BindingProvider{
 for(const k of keys)parsePattern(k);
 return Object.assign(fn,{keys},signals?{signals}:{});
}
/** Compile-time completeness: a key list naming every key of `T` (an object the provider returns whole, e.g. a snapshot) and no other. */
export const keysOf=<T>()=><const K extends readonly (keyof T&string)[]>(keys:Exclude<keyof T&string,K[number]> extends never?K:never):BindingKeys=>keys;
interface Pattern {prefix:string;hole?:{kind:'actor'|'instance'|'role'|'use';type?:string};suffix:string}
const HOLE=/<(actor|instance|role|use)(?::([^>]+))?>/g;
function parsePattern(pattern:string):Pattern{
 const holes=[...pattern.matchAll(HOLE)];
 if(holes.length>1)throw new Error('A binding key has at most one hole: '+pattern);
 if(!holes.length){if(pattern.includes('<')||pattern.includes('>'))throw new Error('Unknown binding key hole: '+pattern);return{prefix:pattern,suffix:''};}
 const h=holes[0];return{prefix:pattern.slice(0,h.index),hole:{kind:h[1] as 'actor',...(h[2]?{type:h[2]}:{})},suffix:pattern.slice(h.index!+h[0].length)};
}
const missing=(hole:NonNullable<Pattern['hole']>,name:string)=>hole.kind==='actor'?'the scene has no actor "'+name+'" (scene.actors)':hole.kind==='role'?'the scene presentation names no flag role "'+name+'"':hole.kind==='use'?'the scene has no use "'+name+'"':'the composition has no '+(hole.type?hole.type+' ':'')+'artwork instance "'+name+'"';
const exists=(scope:BindingKeyScope,hole:NonNullable<Pattern['hole']>,name:string)=>hole.kind==='actor'?scope.actors.has(name):hole.kind==='role'?scope.roles.has(name):hole.kind==='use'?scope.uses.has(name):hole.type?scope.instances.get(name)===hole.type:scope.instances.has(name);
/** Why a key is not offered, or null when it is. `keys` are the provider's patterns, `key` the name after `<provider>.`. */
export function bindingKeyProblem(keys:BindingKeys,key:string,scope:BindingKeyScope):string|null{
 let hint:string|null=null,hintScore=-1;
 for(const text of keys){
  const p=parsePattern(text);
  if(!p.hole){if(text===key)return null;continue;}
  if(key.length>p.prefix.length+p.suffix.length&&key.startsWith(p.prefix)&&key.endsWith(p.suffix)){
   const name=key.slice(p.prefix.length,key.length-p.suffix.length);
   if(exists(scope,p.hole,name))return null;
   if(p.prefix.length+p.suffix.length>hintScore){hint=missing(p.hole,name);hintScore=p.prefix.length+p.suffix.length;}
  }
 }
 return hint??'the provider does not offer it (it offers '+keys.join(', ')+')';
}
const flatten=(nodes:readonly Instance[]):Instance[]=>nodes.flatMap(n=>[n,...flatten(n.children??[])]);
/** What the holes of one scene can name, from its composition and scene documents. */
export function bindingKeyScope(instances:readonly Instance[],scene:{actors?:readonly{id:string}[];presentation?:{flags?:Readonly<Record<string,unknown>>};uses?:readonly{id:string}[]}):BindingKeyScope{
 return{actors:new Set((scene.actors??[]).map(a=>a.id)),instances:new Map(flatten(instances).map(n=>[n.id,n.type])),roles:new Set(Object.keys(scene.presentation?.flags??{})),uses:new Set((scene.uses??[]).map(u=>u.id))};
}
/** The concrete names a provider offers in one scene: every exact key and every hole filled with what exists. The editor lists them. */
export function offeredNames(keys:BindingKeys,scope:BindingKeyScope):string[]{
 const out:string[]=[];
 for(const text of keys){
  const p=parsePattern(text);
  if(!p.hole){out.push(text);continue;}
  const hole=p.hole,pool=hole.kind==='actor'?[...scope.actors]:hole.kind==='role'?[...scope.roles]:hole.kind==='use'?[...scope.uses]:[...scope.instances].filter(([,t])=>!hole.type||t===hole.type).map(([id])=>id);
  for(const name of pool)out.push(p.prefix+name+p.suffix);
 }
 return out;
}
