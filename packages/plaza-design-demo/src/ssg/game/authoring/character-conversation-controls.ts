import {botVoice,validateBotReactions} from '../engine/gameplay/bot-conversations';
import {critterReaction,validateCritterReactions} from '../engine/gameplay/critter-reactions';
import {CRITTERS} from '../art/characters/appearance';
import {botProfile,type Character} from '../runtime/characters';
import type {WorkbenchContext} from './contracts';
import type {TypedForm} from './typed-form';
import type {GameplayDefinition} from '../engine/gameplay/types';
/** Metadata binds an interaction to a normal graph; speaker/pages have one source. */
function renderBinding(form:TypedForm,host:HTMLElement,context:WorkbenchContext,kind:'Robot'|'Animal',voice:{id:string;prompt:string;conversation:string},graphDocument:string,edit:(key:'prompt'|'conversation',value:string)=>void){
 const api=context.authoring!,library=api.get(graphDocument).value as GameplayDefinition,graph=library.conversations[voice.conversation],speaker=graph.nodes[graph.entry[0].node].speaker,box=form.section(host,'Shared '+kind.toLowerCase()+' voice · '+voice.id);
 const note=document.createElement('p');note.className='muted';note.textContent=kind==='Robot'?'Changes affect every robot using this voice; each robot retains independent saved progress.':'Changes affect animals using this binding. Default animal graphs share the authored visit counter for this run.';box.append(note);
 form.text(box,kind+' speaker name',speaker,value=>{const next=api.get(graphDocument).value as GameplayDefinition;for(const node of Object.values(next.conversations[voice.conversation].nodes))if(node.speaker===speaker)node.speaker=value;api.edit(graphDocument,'Edit shared '+kind.toLowerCase()+' speaker',next);});
 form.text(box,kind+' interaction prompt',voice.prompt,value=>edit('prompt',value));
 form.select(box,kind+' conversation',Object.keys(library.conversations),voice.conversation,value=>edit('conversation',value));
 if(context.openConversation)form.button(box,'Edit '+kind.toLowerCase()+' conversation definition',()=>context.openConversation!(graphDocument,voice.conversation));
}
/** Shared default interaction controls belong to the selected physical character. */
export function renderCharacterConversation(form:TypedForm,host:HTMLElement,context:WorkbenchContext,character:Character){
 if(character.conversation)return;
 const api=context.authoring!;
 if(botProfile(character)){
  const catalog=validateBotReactions(api.get('bot-reactions').value),voice=botVoice(character,catalog).voice;
  renderBinding(form,host,context,'Robot',voice,'bot-gameplay',(key,value)=>{const next=validateBotReactions(api.get('bot-reactions').value);next.voices.find(v=>v.id===voice.id)![key]=value;api.edit('bot-reactions','Edit shared robot '+key,validateBotReactions(next));});return;
 }
 if(typeof character.look!=='string'||!Object.prototype.hasOwnProperty.call(CRITTERS,character.look))return;
 const look=character.look,catalog=validateCritterReactions(api.get('critter-reactions').value),voice=critterReaction(character,catalog);
 if(!voice){form.button(host,'Enable shared animal interaction',()=>{
  if(!api.editDocuments)throw Error('Animal interaction requires grouped source history');
  const next=validateCritterReactions(api.get('critter-reactions').value),library=api.get('critter-gameplay').value as GameplayDefinition,id='critter.'+look;
  if(!library.conversations[id])library.conversations[id]={entry:[{node:'reply'}],nodes:{reply:{speaker:look.toUpperCase(),pages:['It looks at you.'],...(library.commands['critter.advance']?{onEnter:'critter.advance'}:{})}}};
  next.critters.push({id:look,look,prompt:'[E] PET',conversation:id});api.editDocuments([{id:'critter-reactions',value:validateCritterReactions(next)},{id:'critter-gameplay',value:library}],'Enable shared animal interaction');
 },catalog.critters.length>=16);return;}
 renderBinding(form,host,context,'Animal',voice,'critter-gameplay',(key,value)=>{const next=validateCritterReactions(api.get('critter-reactions').value);next.critters.find(v=>v.id===voice.id)![key]=value;api.edit('critter-reactions','Edit shared animal '+key,validateCritterReactions(next));});
 form.button(host,'Remove shared animal interaction',()=>{const next=validateCritterReactions(api.get('critter-reactions').value);next.critters=next.critters.filter(v=>v.id!==voice.id);api.edit('critter-reactions','Remove shared animal interaction',next);});
}
