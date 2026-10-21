import source from './critter-reactions.json';
import {CRITTERS} from '../../art/characters/appearance';
import type {Character} from '../../runtime/characters';
/**
 * What an animal answers when you press E (a cat to pet, a pigeon to shoo): one source document, modelled on
 * the robot reactions (bot-conversations.ts). `look` is the Character look that gets the reaction; the game
 * offers the prompt over such a person (when they have no `talk`) and says the reply, cycling through `talk`.
 */
export interface CritterReaction {id:string;look:string;name:string;prompt:string;talk:string[][]}
export interface CritterReactionDocument {version:1;critters:CritterReaction[]}
const fail=(why:string):never=>{throw new Error('Invalid critter reactions: '+why);};
const text=(v:unknown,what:string)=>{if(typeof v!=='string'||!v.trim()||v.length>2000)fail(what+' needs bounded text');};
export function validateCritterReactions(value:unknown):CritterReactionDocument{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)fail('plain object required');
 const d=value as CritterReactionDocument;if(d.version!==1||Object.keys(d).some(k=>!['version','critters'].includes(k))||!Array.isArray(d.critters)||d.critters.length>16)fail('fields');
 const ids=new Set<string>(),looks=new Set<string>();
 for(const c of d.critters){
  if(!c||typeof c!=='object'||Object.keys(c).sort().join()!==['id','look','name','prompt','talk'].sort().join())fail('critter fields');
  if(typeof c.id!=='string'||!/^[a-z][a-z0-9_.-]{0,63}$/.test(c.id)||ids.has(c.id))fail('critter id');ids.add(c.id);
  if(typeof c.look!=='string'||!Object.prototype.hasOwnProperty.call(CRITTERS,c.look))fail('look '+String(c.look)+' is not a registered critter');if(looks.has(c.look))fail('one reaction per look: '+c.look);looks.add(c.look);
  text(c.name,'name');text(c.prompt,'prompt');
  if(!Array.isArray(c.talk)||!c.talk.length||c.talk.length>32)fail('talk needs 1-32 replies');
  for(const pages of c.talk){if(!Array.isArray(pages)||!pages.length||pages.length>16)fail('a reply needs 1-16 pages');pages.forEach(p=>text(p,'page'));}
 }
 return structuredClone(d);
}
export const CRITTER_REACTIONS=validateCritterReactions(source);
/** The reaction for this person's look, if animals of that look react. */
export function critterReaction(p:Pick<Character,'look'>,catalog:CritterReactionDocument=CRITTER_REACTIONS):CritterReaction|undefined{
 return typeof p.look==='string'?catalog.critters.find(c=>c.look===p.look):undefined;
}
/** The reply for the n-th time somebody reacted, cycling through the document's replies. */
export const critterReply=(c:CritterReaction,n:number)=>c.talk[n%c.talk.length];
