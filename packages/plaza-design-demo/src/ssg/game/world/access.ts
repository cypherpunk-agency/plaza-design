import type {NetData} from '../data';
import {ownsScanner} from '../engine/net';
import {nativeAccess} from '../engine/gameplay/access';
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
export function validateExitKeyReferences(scene:{id:string;exits?:readonly Pick<SceneExit,'id'|'needs'>[];level?:{barriers?:readonly Pick<LevelBarrier,'id'|'key'>[]}},keys:{has(id:string):boolean}){
 for(const exit of scene.exits??[])if(exit.needs&&!keys.has(exit.needs.key))throw Error('Unknown exit key reference: '+scene.id+'/'+exit.id+' -> '+exit.needs.key);
 for(const barrier of scene.level?.barriers??[])if(barrier.key&&!keys.has(barrier.key))throw Error('Unknown barrier key reference: '+scene.id+'/'+barrier.id+' -> '+barrier.key);
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
 * its `flag` must be set (an exit's `requires`) and its `key` carried (an exit's `needs`). Both refuse with the barrier's
 * words; a barrier stands in plain sight, so neither is hidden. Pure: it commits nothing; the level opens it on `ok`.
 */
export function barrierAccess(barrier:Pick<LevelBarrier,'flag'|'key'|'refuse'>,flags:Readonly<Record<string,boolean>>,keys:readonly string[]){
 return nativeAccess([...(barrier.flag?[{allowed:!!flags[barrier.flag],reason:barrier.refuse}]:[]),...(barrier.key?[{allowed:keys.includes(barrier.key),reason:barrier.refuse}]:[])]);
}
