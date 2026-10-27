import {actorReactionIdentity} from './actor-identity';
import source from './bot-reactions.json';
import {BOT} from '../../art/characters/appearance';
import {botProfile,type Character} from '../../runtime/characters';
import {actorConversationId} from './scene-conversations';
import gameplaySource from './bot-gameplay.json';
import {addConversationInstance} from './conversation-instance';
import type {GameplayDefinition} from './types';
import {validateGameplay} from './validation';
import type {SceneDef} from '../../scenes/kit';
export interface BotReactionDocument {version:1;voices:{id:string;prompt:string;conversation:string}[]}
const empty:GameplayDefinition={version:1 as const,flags:[],items:[],events:[],commands:{},reactions:[],conversations:{}};
const roles=[...Object.keys(BOT).map(id=>'robot.'+id),'legacy.drone','legacy.cleaner','legacy.courier'];
export function validateBotReactions(value:unknown):BotReactionDocument {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid bot reaction document');
 const d=value as BotReactionDocument;if(d.version!==1||Object.keys(d).some(k=>!['version','voices'].includes(k))||!Array.isArray(d.voices)||JSON.stringify(d.voices.map(v=>v.id))!==JSON.stringify(roles))throw new Error('Bot voice identities/order are protected');
 for(const v of d.voices)if(Object.keys(v).some(k=>!['id','prompt','conversation'].includes(k))||typeof v.prompt!=='string'||!v.prompt.trim()||v.prompt.length>2000)throw new Error('Invalid bot voice fields');
 for(const v of d.voices)if(typeof v.conversation!=='string'||!/^[-a-zA-Z0-9_.:]{1,128}$/.test(v.conversation))throw Error('Invalid robot conversation binding');
 return structuredClone(d);
}
export const BOT_REACTIONS=validateBotReactions(source);
export function validateBotGameplay(value:unknown){const d=validateGameplay(value);if(d.native||d.checkpoint)throw Error('Robot conversation library cannot supply native bindings/checkpoint policies');return d;}
export const BOT_GAMEPLAY=validateBotGameplay(gameplaySource);
export function validateBotConversationBindings(catalog:BotReactionDocument,library:GameplayDefinition){for(const v of catalog.voices)if(!library.conversations[v.conversation])throw Error('Missing robot conversation '+v.conversation);}
export function botVoice(p:Character,catalog:BotReactionDocument=BOT_REACTIONS){const profile=botProfile(p);if(!profile)throw new Error('Character has no robot voice');const voice=catalog.voices.find(v=>v.id===profile.voice);if(!voice)throw new Error('Missing registered robot voice '+profile.voice);return{voice,label:voice.prompt,serial:profile.serial};}
export const botPersonId=(p:Character,index:number)=>'bot.'+(actorReactionIdentity(p)??p.id??'slot-'+index);
export const botConversationId=(scene:string,p:Character,index:number)=>actorConversationId(scene,botPersonId(p,index));
/** Bind normal reusable graphs to stable actor-local progress addresses. */
export function withBotConversations(scene:SceneDef,catalog:BotReactionDocument=BOT_REACTIONS,library:GameplayDefinition=BOT_GAMEPLAY):SceneDef {
 validateBotConversationBindings(catalog,library);let gameplay=scene.gameplay??empty,changed=false;const ids=new Set<string>();
 for(const[p,index]of(scene.people??[]).map((p,i)=>[p,i]as const)){
  if(p.conversation||!botProfile(p))continue;
  const id=botConversationId(scene.id,p,index);if(ids.has(id))throw Error('Procedural bot identity collision in '+scene.id);ids.add(id);
  const {voice,serial}=botVoice(p,catalog),graph=library.conversations[voice.conversation],speaker=graph.nodes[graph.entry[0].node].speaker,name=p.name??speaker+(serial===undefined?'':'-'+serial);
  gameplay=addConversationInstance(gameplay,library,voice.conversation,id,{from:speaker,to:name});changed=true;
 }
 return changed?{...scene,gameplay}:scene;
}
