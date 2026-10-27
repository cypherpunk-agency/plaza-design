import gameplaySource from './critter-gameplay.json';
import {validateGameplay} from './validation';
import type {GameplayDefinition} from './types';
import source from './critter-reactions.json';
import {CRITTERS} from '../../art/characters/appearance';
import type {Character} from '../../runtime/characters';
export interface CritterReaction {id:string;look:string;prompt:string;conversation:string}
export interface CritterReactionDocument {version:1;critters:CritterReaction[]}
const fail=(why:string):never=>{throw new Error('Invalid critter reactions: '+why);};
const text=(v:unknown,what:string)=>{if(typeof v!=='string'||!v.trim()||v.length>2000)fail(what+' needs bounded text');};
export function validateCritterReactions(value:unknown):CritterReactionDocument{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)fail('plain object required');
 const d=value as CritterReactionDocument;if(d.version!==1||Object.keys(d).some(k=>!['version','critters'].includes(k))||!Array.isArray(d.critters)||d.critters.length>16)fail('fields');
 const ids=new Set<string>(),looks=new Set<string>();
 for(const c of d.critters){
  if(!c||typeof c!=='object'||Object.keys(c).sort().join()!==['id','look','prompt','conversation'].sort().join())fail('critter fields');
  if(typeof c.id!=='string'||!/^[a-z][a-z0-9_.-]{0,63}$/.test(c.id)||ids.has(c.id))fail('critter id');ids.add(c.id);
  if(typeof c.look!=='string'||!Object.prototype.hasOwnProperty.call(CRITTERS,c.look))fail('look '+String(c.look)+' is not a registered critter');if(looks.has(c.look))fail('one reaction per look: '+c.look);looks.add(c.look);
  text(c.prompt,'prompt');text(c.conversation,'conversation');
 }
 return structuredClone(d);
}
export const CRITTER_REACTIONS=validateCritterReactions(source);
/** The reaction for this person's look, if animals of that look react. */
export function critterReaction(p:Pick<Character,'look'>,catalog:CritterReactionDocument=CRITTER_REACTIONS):CritterReaction|undefined{
 return typeof p.look==='string'?catalog.critters.find(c=>c.look===p.look):undefined;
}

export function validateCritterGameplay(value:unknown){const d=validateGameplay(value);if(d.native||d.checkpoint)throw Error('Critter conversations cannot supply native bindings/checkpoint policies');return d;}
export const CRITTER_GAMEPLAY=validateCritterGameplay(gameplaySource);
export function validateCritterConversations(catalog:CritterReactionDocument,library:GameplayDefinition){for(const c of catalog.critters)if(!library.conversations[c.conversation])throw Error('Missing critter conversation '+c.conversation);}
