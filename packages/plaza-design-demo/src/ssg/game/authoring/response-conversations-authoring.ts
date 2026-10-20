import type {GameplayDefinition} from '../engine/gameplay/types';
import type {GameplayBindingControls} from './gameplay-bindings-authoring';
/** Response bindings reuse the ordinary conversation graph editor for their words and progress. */
export function renderResponseConversationsAuthoring(parent:HTMLElement,doc:GameplayDefinition,ui:GameplayBindingControls){
 const{data,form,section,edit,draft}=ui;if(!data||!doc.native)return;
 const box=section(parent,'Response conversations',true),texts=Object.entries(data.texts).filter(([,v])=>Array.isArray(v)).map(([id])=>id),graphs=Object.entries(doc.conversations).filter(([,c])=>!c.free&&Object.values(c.nodes).every(n=>n.pages.length===1&&!n.choices?.length&&!n.completion)).map(([id])=>id);
 for(const[ref,row]of Object.entries(doc.native.responseConversations??{})){
  const host=section(box,'Response '+ref,true),prefix='Response '+ref;
  form.select(host,prefix+' text',texts,ref,value=>edit('Rebind response text',g=>{if(value!==ref&&g.native!.responseConversations![value])throw Error('Response already bound');g.native!.responseConversations=Object.fromEntries(Object.entries(g.native!.responseConversations!).map(([key,r])=>[key===ref?value:key,r]));}));
  form.select(host,prefix+' conversation',graphs,row.conversation,conversation=>edit('Rebind response conversation',g=>{g.native!.responseConversations![ref].conversation=conversation;}));
  form.text(host,prefix+' variable',row.variable,variable=>edit('Edit response slot',g=>{g.native!.responseConversations![ref].variable=variable;}));
  form.button(host,'Remove '+prefix,()=>edit('Remove response binding',g=>{delete g.native!.responseConversations![ref];}));
 }
 form.select(box,'New response text',['',...texts],draft.responseText??'',v=>{draft.responseText=v;});
 form.select(box,'New response conversation',['',...graphs],draft.responseGraph??'',v=>{draft.responseGraph=v;});
 form.text(box,'New response variable',draft.responseVariable??'',v=>{draft.responseVariable=v;});
 form.button(box,'Add response conversation',()=>edit('Add response binding',g=>{const ref=draft.responseText??'';g.native!.responseConversations??={};if(g.native!.responseConversations[ref])throw Error('Response already bound');g.native!.responseConversations[ref]={conversation:draft.responseGraph??'',variable:draft.responseVariable??''};}),!graphs.length||!texts.length);
}
