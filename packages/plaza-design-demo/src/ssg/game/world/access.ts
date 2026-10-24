import type {NetData} from '../data';
import {ownsScanner} from '../engine/net';
import {nativeAccess} from '../engine/gameplay/access';
import {matches} from '../engine/gameplay/queries';
import {validateGameplay} from '../engine/gameplay/validation';
import type {Condition,GameplayDefinition,GameplayState} from '../engine/gameplay/types';
import {activeSharedState} from '../engine/gameplay/shared-state';
import {resolveValues} from '../engine/gameplay/state';
import type {SceneExit} from '../scenes/kit';
import type {LevelBarrier} from '../engine/level';

export interface CapabilitySource {jump:boolean;modules:readonly string[];programs:readonly string[];keyring:readonly string[];controlled:readonly string[]}
/** A detached view over existing owners; it never persists another copy of ability state. */
export function capabilityView(source:CapabilitySource,hacking:boolean,network:Pick<NetData,'scanProgram'>){
  return Object.fromEntries([
    ['jump',source.jump],['hack',hacking],['network',hacking&&ownsScanner(source.programs,network.scanProgram)],
    ...source.modules.map(id=>['module:'+id,true]),...source.programs.map(id=>['program:'+id,true]),
    ...source.keyring.map(id=>['key:'+id,true]),...source.controlled.map(id=>['control:'+id,true]),
  ]) as Record<string,boolean>;
}
export function exitVisibility(exit:Pick<SceneExit,'requires'>,flags:Readonly<Record<string,boolean>>){
  return nativeAccess(exit.requires?[{allowed:!!flags[exit.requires],reason:exit.requires,hidden:true}]:[]);
}
export function exitPermission(exit:Pick<SceneExit,'needs'>,keys:readonly string[]){
  return nativeAccess(exit.needs?[{allowed:keys.includes(exit.needs.key),reason:exit.needs.pages.join('\n')}]:[]);
}
/** Foreign keys resolve against the assembled source registry, alongside scene destinations (a level barrier's key too). */
export function validateExitKeyReferences(scene:{id:string;exits?:readonly Pick<SceneExit,'id'|'needs'>[];level?:{barriers?:readonly Pick<LevelBarrier,'id'|'key'|'when'>[]}},keys:{has(id:string):boolean}){
 for(const exit of scene.exits??[])if(exit.needs&&!keys.has(exit.needs.key))throw Error('Unknown exit key reference: '+scene.id+'/'+exit.id+' -> '+exit.needs.key);
 for(const barrier of scene.level?.barriers??[]){
  if(barrier.key&&!keys.has(barrier.key))throw Error('Unknown barrier key reference: '+scene.id+'/'+barrier.id+' -> '+barrier.key);
  if(barrier.when!==undefined)try{validateBarrierCondition(barrier.when);}catch(e){throw Error('Invalid barrier condition: '+scene.id+'/'+barrier.id+': '+(e instanceof Error?e.message:String(e)));}
 }
}
/** The saved states a condition names. */
function conditionStates(c:Condition|undefined,out:string[]=[]):string[]{
 if(!c)return out;
 if('state'in c){if(!out.includes(c.state))out.push(c.state);}else if('not'in c)conditionStates(c.not,out);else if('all'in c)c.all.forEach(x=>conditionStates(x,out));else if('any'in c)c.any.forEach(x=>conditionStates(x,out));
 return out;
}
/** The flags and items a condition names (a barrier's `when`), in order of appearance. */
export function conditionNames(c:Condition|undefined,out:{flags:string[];items:string[]}={flags:[],items:[]}){
 if(!c)return out;
 if('flag'in c){if(!out.flags.includes(c.flag))out.flags.push(c.flag);}else if('item'in c){if(!out.items.includes(c.item))out.items.push(c.item);}
 else if('not'in c)conditionNames(c.not,out);else if('all'in c)c.all.forEach(x=>conditionNames(x,out));else if('any'in c)c.any.forEach(x=>conditionNames(x,out));
 return out;
}
/** The world-level state owners (world/state-owners.json, the shift's `shift.*`): saved state that is the save's, not one scene's. */
const sharedOwners=():Pick<GameplayDefinition,'state'>=>(activeSharedState() as Pick<GameplayDefinition,'state'>)??{};
/**
 * A barrier's `when`: one gameplay condition over what the game always knows when E is pressed there (flags, items,
 * tokens, the player, the time and weather, and the world-level shared state such as `shift.checkedOut`), not a scene's
 * own state, queries or objective. Its shape is the gameplay validator's own; any flag or item it names may be any of
 * the save's (they are a save's, not one scene's), and a state it names must be declared by world/state-owners.json.
 */
export function validateBarrierCondition(when:unknown):Condition{
 const shared=sharedOwners().state??{};
 const scan=(c:unknown,depth=0):void=>{if(depth>12||!c||typeof c!=='object'||Array.isArray(c))return;const r=c as Record<string,unknown>;
  if('state'in r&&!(typeof r.state==='string'&&Object.prototype.hasOwnProperty.call(shared,r.state))||'objective'in r)throw Error('a barrier condition reads flags, items, tokens, the player, time, weather and shared state (world/state-owners.json)');
  if('compare'in r&&JSON.stringify(r.compare).match(/"(state|query)"\s*:/))throw Error('a barrier comparison reads literals only');
  for(const k of['not'])if(k in r)scan(r[k],depth+1);for(const k of['all','any'])if(Array.isArray(r[k]))(r[k] as unknown[]).forEach(x=>scan(x,depth+1));};
 scan(when);
 const names=conditionNames(when as Condition);
 const owners=[...new Set(conditionStates(when as Condition).map(id=>shared[id].owner))];
 validateGameplay({version:1,flags:names.flags,items:names.items,...(owners.length?{sharedState:owners}:{}),events:[],commands:{check:{sources:['interaction'],when,actions:[]}},reactions:[],conversations:{}});
 return structuredClone(when) as Condition;
}
/** Taxi, map and metro share the city's destination locks (city.json `LOCKS`); fare charging and animations retain their owners. `lock` is the one holding the destination shut, if any. */
export function lockedTransport(lock:{reason:string}|undefined,open:boolean){
  return nativeAccess([{allowed:!lock||open,reason:lock?.reason??''}]);
}

/** The same exit owner supplies walking visibility, permission and world-map access. */
export function sceneExitAccess(exit:Pick<SceneExit,'requires'|'needs'>|undefined,flags:Readonly<Record<string,boolean>>,keys:readonly string[]){
 if(!exit)return nativeAccess([{allowed:false,reason:'EXIT UNAVAILABLE'}]);
 const visible=exitVisibility(exit,flags);return visible.ok?exitPermission(exit,keys):visible;
}

/**
 * An in-world barrier (engine/level.ts `LevelBarrier`: a turnstile, gate or locked door) asks the exits' own rule:
 * its `flag` must be set (an exit's `requires`), its `key` carried (an exit's `needs`) and its `when` hold over the
 * gameplay state (`state`, its shared values read with their declared defaults; without one, a `when` refuses). All refuse with the barrier's words; a barrier stands in
 * plain sight, so none is hidden. Pure: it commits nothing; the level opens it on `ok`. The composer's Test the rule panel
 * calls this same function over a fixture.
 */
export function barrierAccess(barrier:Pick<LevelBarrier,'flag'|'key'|'when'|'refuse'>,flags:Readonly<Record<string,boolean>>,keys:readonly string[],state?:Readonly<GameplayState>){
 const read=state&&{...state,values:resolveValues(sharedOwners() as GameplayDefinition,state)};
 return nativeAccess([...(barrier.flag?[{allowed:!!flags[barrier.flag],reason:barrier.refuse}]:[]),...(barrier.key?[{allowed:keys.includes(barrier.key),reason:barrier.refuse}]:[]),...(barrier.when?[{allowed:!!read&&matches(barrier.when,read),reason:barrier.refuse}]:[])]);
}
