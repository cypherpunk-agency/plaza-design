import type {GameplayDefinition} from './types';
import type {SceneDocument} from './scene-document';
import {validateGameplay} from './validation';
export const actorConversationId=(scene:string,person:string)=>'talk.'+scene+'.'+person;
/** Simple chatter compiles into the same graph as choices: one authoritative authored text source. */
export function withSceneConversations(definition:GameplayDefinition,scene:SceneDocument):GameplayDefinition{
 const def=structuredClone(definition);if(!scene.people?.length)return def;
 def.state??={};for(const p of scene.people){const id=actorConversationId(scene.id,p.id),cursor=id+'.cursor';
 if(def.conversations[id]||def.state[cursor])throw new Error('Generated conversation identity collision');
 def.state[cursor]={owner:'talk.'+scene.id+'.'+p.id,lifetime:'save',type:'number',default:0,min:0,max:p.talk.length-1};
 const nodes:GameplayDefinition['conversations'][string]['nodes']={};
 p.talk.forEach((pages,i)=>{const command=id+'.advance-'+i;def.commands[command]={sources:['conversation'],actions:[{state:cursor,set:p.repeat==='cycle'?(i+1)%p.talk.length:Math.min(i+1,p.talk.length-1)}]};nodes['visit-'+i]={speaker:p.name,pages:[...pages],onEnter:command};});
 def.conversations[id]={entry:p.talk.map((_,i)=>({...((i<p.talk.length-1)?{when:{state:cursor,is:i}}:{}),node:'visit-'+i})),nodes};
 }return validateGameplay(def);
}
