import {TypedForm} from './typed-form';
import type {WorkbenchContext,WorkbenchHandle} from './app';
import {validateBotReactions,type BotReactionDocument} from '../engine/gameplay/bot-conversations';
import {withSceneConversations,actorConversationId} from '../engine/gameplay/scene-conversations';
import {GameplaySession} from '../engine/gameplay/session';
import {ConversationSession} from '../engine/gameplay/conversation';
import type {GameplayState} from '../engine/gameplay/types';
/** Shared robot voice source with an isolated preview using the production conversation runner. */
export function mountBotReactionAuthoring(host:HTMLElement,context:WorkbenchContext):WorkbenchHandle {
 const api=context.authoring!;let voice='robot.android',disposed=false,session:GameplaySession|undefined,state:GameplayState={flags:{},items:{},tokens:0};
 const error=document.createElement('p');error.setAttribute('role','alert');const form=new TypedForm(e=>{error.textContent=String(e);});
 function edit(label:string,change:(d:BotReactionDocument)=>void){const d=validateBotReactions(api.get('bot-reactions').value);change(d);api.edit('bot-reactions',label,validateBotReactions(d));}
 function render(){if(disposed)return;session?.dispose();const d=validateBotReactions(api.get('bot-reactions').value),v=d.voices.find(v=>v.id===voice)??d.voices[0];voice=v.id;host.replaceChildren(error);
  form.select(host,'Robot voice',d.voices.map(v=>v.id),voice,id=>{voice=id;render();});
  form.text(host,'Robot speaker name',v.name,name=>edit('Edit robot speaker',d=>{d.voices.find(v=>v.id===voice)!.name=name;}));
  form.text(host,'Robot interaction prompt',v.prompt,prompt=>edit('Edit robot prompt',d=>{d.voices.find(v=>v.id===voice)!.prompt=prompt;}));
  v.talk.forEach((pages,i)=>{const section=form.section(host,'Reply '+(i+1));pages.forEach((text,j)=>{form.text(section,'Reply '+(i+1)+' page '+(j+1),text,text=>edit('Edit robot reply',d=>{d.voices.find(v=>v.id===voice)!.talk[i][j]=text;}),true);form.button(section,'Remove reply '+(i+1)+' page '+(j+1),()=>edit('Remove robot page',d=>{d.voices.find(v=>v.id===voice)!.talk[i].splice(j,1);}),pages.length===1);});form.button(section,'Add page to reply '+(i+1),()=>edit('Add robot page',d=>{d.voices.find(v=>v.id===voice)!.talk[i].push('New page');}),pages.length>=16);form.button(section,'Remove reply '+(i+1),()=>edit('Remove robot reply',d=>{d.voices.find(v=>v.id===voice)!.talk.splice(i,1);}),v.talk.length===1);});
  form.button(host,'Add robot reply',()=>edit('Add robot reply',d=>{d.voices.find(v=>v.id===voice)!.talk.push(['New reply']);}),v.talk.length>=32);
  const preview=form.section(host,'Conversation preview'),output=document.createElement('p');preview.append(output);const gameplay=withSceneConversations({version:1,flags:[],items:[],events:[],commands:{},reactions:[],conversations:{}},{version:1,id:'bot-preview',name:'Bot preview',intro:[],uses:[],people:[{id:voice,name:v.name,talk:v.talk,repeat:'cycle'}]});session=new GameplaySession(gameplay,{read:()=>state,write:s=>{state=s;}});
  form.button(preview,'Speak next reply',()=>{const talk=new ConversationSession(session!,actorConversationId('bot-preview',voice));const frame=talk.frame();talk.close();output.textContent=frame.speaker+': '+frame.pages.join('\n');});form.button(preview,'Reset preview progress',()=>{state={flags:{},items:{},tokens:0};output.textContent='';});
 }
 render();const dispose=(()=>{disposed=true;session?.dispose();host.replaceChildren();}) as WorkbenchHandle;dispose.refresh=render;return dispose;
}
