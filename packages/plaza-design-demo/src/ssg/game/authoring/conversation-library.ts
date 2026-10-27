import {element,button,select} from './controls';
import {mountGameplayAuthoring,type GameplayAuthoring} from './gameplay-authoring';
import {registeredGameplayOptions} from './registered-gameplay';
import {gameplayScene} from './gameplay-scenes';
import {nativeGameplayScene} from './native-gameplay-scenes';
import type {WorkbenchContext,WorkbenchHandle,EditorDocument} from './contracts';
import type {GameplayDefinition} from '../engine/gameplay/types';
import {pendingRegistry} from './pending-registry';
import {validationSnapshot} from './validation-snapshot';
import {validateBotReactions,botVoice} from '../engine/gameplay/bot-conversations';
import {critterReaction,validateCritterReactions} from '../engine/gameplay/critter-reactions';
import {botProfile} from '../runtime/characters';

export interface ConversationSelection {document:string;conversation:string}
export function conversationSources(documents:readonly EditorDocument[]){return documents.filter(d=>{const value=d.value as Partial<GameplayDefinition>|undefined;return value?.version===1&&Array.isArray(value.flags)&&!!value.commands&&!!value.conversations&&Object.keys(value.conversations).length>0;});}
/** Authoring navigates ordinary gameplay sources; it never duplicates or executes their graphs. */
export function mountConversationLibrary(host:HTMLElement,context:WorkbenchContext,selection:ConversationSelection,publicEditor=false):WorkbenchHandle{
 const scenes=new Set(context.documents.filter(d=>d.kind==='composition').map(d=>(d.value as {scene:string}).scene));
 const api=context.authoring!,heading=element('div'),usages=element('details'),body=element('section');usages.append(element('summary','','Show usages'));host.replaceChildren(heading,usages,body);
 let editor:ReturnType<typeof mountGameplayAuthoring>|undefined,sourceId='',requested='',disposed=false;
 function usageList(graph:string){for(const node of [...usages.children].slice(1))node.remove();const list=element('ul');usages.append(list);
  for(const usage of conversationUsages(context.documents,sourceId,graph)){const row=element('li');row.append(element('span','',usage.document+' · '+usage.path));if(usage.scene&&scenes.has(usage.scene))row.append(button('Open context',()=>context.openScene(usage.scene!)));list.append(row);}
  if(!list.children.length)list.append(element('li','muted','No authored usages yet.'));
 }
 function refresh(){if(disposed)return;const documents=context.documents,sources=conversationSources(documents);if(!sources.some(d=>d.id===selection.document)){selection.document=sources.find(d=>d.id==='companion-gameplay')?.id??sources[0]?.id??'';selection.conversation='';}
  heading.replaceChildren(element('h2','','Conversations'),element('p','muted','Shared and character conversations use the same graph controls. Select a source, edit its graph, then test its pending behavior in private Play.'));
  if(!selection.document){editor?.dispose();editor=undefined;body.replaceChildren(element('p','muted','No conversation sources.'));return;}
  const picker=select(sources.map(d=>({value:d.id,label:d.id==='companion-gameplay'?'Shared companion conversations':d.id==='bot-gameplay'?'Robot conversations':d.id==='critter-gameplay'?'Animal conversations':d.id})),selection.document,id=>{selection.document=id;selection.conversation='';refresh();});picker.setAttribute('aria-label','Conversation source');heading.append(picker);
  if(sourceId===selection.document&&editor){if(selection.conversation&&selection.conversation!==requested){requested=selection.conversation;editor.selectConversation(requested);}else editor.refresh();return;}
  editor?.dispose();sourceId=selection.document;requested=selection.conversation;
  const sceneId=documents.filter(d=>d.kind==='composition').map(d=>(d.value as {scene:string}).scene).find(id=>{try{return(nativeGameplayScene(id)??gameplayScene(id,documents)).gameplayId===sourceId;}catch{return false;}});
  const options:GameplayAuthoring=sceneId?registeredGameplayOptions(context,nativeGameplayScene(sceneId)??gameplayScene(sceneId,documents),publicEditor):{
   document:()=>api.get(sourceId).value,sharedStateSource:()=>context.documents.some(d=>d.id==='state-owners')?api.get('state-owners').value:undefined,onEdit:(value,label)=>api.edit(sourceId,label,value),undo:api.undo,redo:api.redo,save:api.save,reload:api.reload,dirty:()=>api.dirty(sourceId),saveLabel:publicEditor?'Download edits':'Save to source',
  };
  body.replaceChildren();editor=mountGameplayAuthoring(body,{...options,initialConversation:requested,onConversationSelected:id=>{selection.conversation=requested=id;usageList(id);}});
 }
 refresh();const dispose=(()=>{disposed=true;editor?.dispose();host.replaceChildren();})as WorkbenchHandle;dispose.refresh=refresh;return dispose;
}

/** Resolve graph references in their actual gameplay source; equal local IDs in different
 * chunks are different definitions. Projected catalogue sources are counted once. */
export function conversationUsages(documents:readonly EditorDocument[],source:string,graph:string){
 const result:{document:string;path:string;scene?:string}[]=[];
 const sources=new Map(conversationSources(documents).map(d=>[d.id,d.value as GameplayDefinition]));
 for(const document of documents){if(document.id==='authored-scenes')continue;
  let local=document.id==='critter-reactions'?'critter-gameplay':document.id==='bot-reactions'?'bot-gameplay':document.kind==='gameplay'?document.id:undefined,scene:string|undefined;
  try{const registration=nativeGameplayScene(document.id)??gameplayScene(document.id,documents);local=registration.gameplayId;scene=registration.id;}catch{/* Global definitions have no chunk scope. */}
  const refers=()=>local&&sources.get(local)?.conversations[graph]?local===source:source==='companion-gameplay'&&!!sources.get(source)?.conversations[graph];
  const visit=(value:unknown,path:string)=>{if(!value||typeof value!=='object')return;
   for(const[key,item]of Object.entries(value)){const at=path?path+'.'+key:key;
    if(key==='conversation'&&item===graph&&refers())result.push({document:document.id,path:at,scene});
    else if(key==='conversations'&&item&&typeof item==='object'&&!('flags'in value)){if(Object.values(item).flatMap(v=>Array.isArray(v)?v:[v]).includes(graph)&&refers())result.push({document:document.id,path:at,scene});}
    else if(key!=='conversations')visit(item,at);
   }
  };visit(document.value,'');
 }
 if(source==='bot-gameplay'){const catalog=validateBotReactions(documents.find(d=>d.id==='bot-reactions')!.value);for(const[scene,definition]of Object.entries(pendingRegistry(validationSnapshot(documents))))for(const[p,index]of(definition.people??[]).map((p,i)=>[p,i]as const))if(!p.conversation&&botProfile(p)&&botVoice(p,catalog).voice.conversation===graph)result.push({document:scene,path:'people['+index+'] · default robot voice',scene});}
 if(source==='critter-gameplay'){const catalog=validateCritterReactions(documents.find(d=>d.id==='critter-reactions')!.value);for(const[scene,definition]of Object.entries(pendingRegistry(validationSnapshot(documents))))for(const[p,index]of(definition.people??[]).map((p,i)=>[p,i]as const))if(!p.conversation&&critterReaction(p,catalog)?.conversation===graph)result.push({document:scene,path:'people['+index+'] · default animal interaction',scene});}
 return result;
}
