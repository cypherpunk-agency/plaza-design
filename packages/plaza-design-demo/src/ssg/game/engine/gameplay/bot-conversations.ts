import {actorReactionIdentity} from './actor-identity';
import source from './bot-reactions.json';
import {BOT} from '../../art/characters/appearance';
import {botProfile,type Character} from '../../runtime/characters';
import {validateSceneDocument} from './scene-document';
import {withSceneConversations,actorConversationId} from './scene-conversations';
import {validateGameplay} from './validation';
import type {SceneDef} from '../../scenes/kit';
export interface BotReactionDocument {version:1;voices:{id:string;name:string;prompt:string;talk:string[][]}[]}
const empty={version:1 as const,flags:[],items:[],events:[],commands:{},reactions:[],conversations:{}};
const roles=[...Object.keys(BOT).map(id=>'robot.'+id),'legacy.drone','legacy.cleaner','legacy.courier'];
export function validateBotReactions(value:unknown):BotReactionDocument {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid bot reaction document');
 const d=value as BotReactionDocument;if(d.version!==1||Object.keys(d).some(k=>!['version','voices'].includes(k))||!Array.isArray(d.voices)||JSON.stringify(d.voices.map(v=>v.id))!==JSON.stringify(roles))throw new Error('Bot voice identities/order are protected');
 for(const v of d.voices)if(Object.keys(v).some(k=>!['id','name','prompt','talk'].includes(k))||typeof v.prompt!=='string'||!v.prompt.trim()||v.prompt.length>2000)throw new Error('Invalid bot voice fields');
 validateSceneDocument({version:1,id:'bot-voices',name:'Bot voices',intro:[],uses:[],people:d.voices.map(({prompt,...v})=>({...v,repeat:'cycle'}))},empty);
 return structuredClone(d);
}
export const BOT_REACTIONS=validateBotReactions(source);
export function botVoice(p:Character,catalog:BotReactionDocument=BOT_REACTIONS){const profile=botProfile(p);if(!profile)throw new Error('Character has no robot voice');const voice=catalog.voices.find(v=>v.id===profile.voice);if(!voice)throw new Error('Missing registered robot voice '+profile.voice);return{voice,label:voice.prompt,name:p.name??voice.name+(profile.serial===undefined?'':'-'+profile.serial)};}
export const botPersonId=(p:Character,index:number)=>'bot.'+(actorReactionIdentity(p)??p.id??'slot-'+index);
export const botConversationId=(scene:string,p:Character,index:number)=>actorConversationId(scene,botPersonId(p,index));
/** Compile procedural reactions with the same persistent cycling compiler as authored NPCs. */
export function withBotConversations(scene:SceneDef,catalog:BotReactionDocument=BOT_REACTIONS):SceneDef {
 const people=(scene.people??[]).flatMap((p,index)=>{if(p.talk||p.conversation||!botProfile(p))return[];const {voice,name}=botVoice(p,catalog);return[{id:botPersonId(p,index),name,talk:voice.talk,repeat:'cycle' as const}];});
 if(!people.length)return scene;
 if(new Set(people.map(p=>p.id)).size!==people.length)throw new Error('Procedural bot identity collision in '+scene.id);
 const gameplay=withSceneConversations(scene.gameplay??empty,{version:1,id:scene.id,name:scene.name,intro:[],uses:[],people});return{...scene,gameplay:validateGameplay(gameplay)};
}
