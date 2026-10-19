import type {Character} from '../../runtime/characters';
/** Runtime-only metadata: retain original Character snapshots and serialized player save shapes. */
const reactions=new WeakMap<Character,string>();
export function bindActorReactionIdentity(actor:Character,key:string):void{reactions.set(actor,key);}
export function actorReactionIdentity(actor:Character):string|undefined{return reactions.get(actor);}

const appearanceSeeds=new WeakMap<Character,number>();
export function bindActorAppearanceSeed(actor:Character,seed:number):void{appearanceSeeds.set(actor,seed);}
export function actorAppearanceSeed(actor:Character):number|undefined{return appearanceSeeds.get(actor);}
