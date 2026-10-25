import type {GameplayDefinition,Condition} from './types';
import type {SceneDocument} from './scene-document';
import {validateGameplay} from './validation';
export const actorConversationId=(scene:string,person:string)=>'talk.'+scene+'.'+person;
/** Simple chatter compiles into the same graph as choices: one authoritative authored text source. */
export function withSceneConversations(definition:GameplayDefinition,scene:SceneDocument,sharedState?:unknown):GameplayDefinition{
 const def=structuredClone(definition);if(!scene.people?.length)return def;
 for(const p of scene.people){if(p.conversation!==undefined){if(!Object.prototype.hasOwnProperty.call(def.conversations,p.conversation))throw new Error('Missing person conversation graph: '+p.conversation);continue;}def.state??={};const id=actorConversationId(scene.id,p.id),cursor=id+'.cursor';
 if(def.conversations[id]||def.state[cursor])throw new Error('Generated conversation identity collision');
 def.state[cursor]={owner:'talk.'+scene.id+'.'+p.id,lifetime:'save',type:'number',default:0,min:0,max:p.talk.length-1};
 const nodes:GameplayDefinition['conversations'][string]['nodes']={};
 p.talk.forEach((pages,i)=>{const command=id+'.advance-'+i;def.commands[command]={sources:['conversation'],actions:[{state:cursor,set:p.repeat==='cycle'?(i+1)%p.talk.length:Math.min(i+1,p.talk.length-1)}]};nodes['visit-'+i]={speaker:p.name,pages:[...pages],onEnter:command};});
 const variants=(p.lines??[]).map((line,i)=>{const node='variant-'+i;nodes[node]={speaker:p.name,pages:[...line.pages]};const conditions:Condition[]=[...(line.condition?[line.condition]:[]),...(line.when?[{time:line.when} as Condition]:[]),...(line.weather?[{weather:line.weather} as Condition]:[])];return{when:{all:conditions} as Condition,node};});
 def.conversations[id]={entry:[...variants,...p.talk.map((_,i)=>({...((i<p.talk.length-1)?{when:{state:cursor,is:i}}:{}),node:'visit-'+i}))],nodes};
 }return validateGameplay(def,sharedState);
}
