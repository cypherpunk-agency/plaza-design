import type {GameplayDefinition} from '../engine/gameplay/types';
import type {GameplayBindingControls} from './gameplay-bindings-authoring';
/** Conditions use the shared typed predicate controls and the owning atomic source transaction. */
export function renderNativeLiveConditionsAuthoring(parent:HTMLElement,doc:GameplayDefinition,ui:GameplayBindingControls){
 if(!doc.native)return;const{form,section,edit,draft}=ui,box=section(parent,'Live condition triggers',true),rows=Object.entries(doc.native.triggers??{}),commands=Object.entries(doc.commands).filter(([,c])=>c.sources.length===1&&c.sources[0]==='system').map(([id])=>id);
 for(const[id,row]of rows){const host=section(box,'Trigger '+id,true),prefix='Trigger '+id;
  form.select(host,prefix+' phase',['beforeNative','afterNative','onPersist'],row.phase??'afterNative',phase=>edit('Edit live workflow phase',g=>{g.native!.triggers![id].phase=phase as 'beforeNative'|'afterNative'|'onPersist';}));
  form.text(host,prefix+' ID',id,value=>edit('Rename live condition trigger',g=>{if(value!==id&&g.native!.triggers![value])throw Error('Trigger already exists');g.native!.triggers=Object.fromEntries(Object.entries(g.native!.triggers!).map(([key,row])=>[key===id?value:key,row]));}));
  form.condition(host,prefix+' condition',row.when,when=>edit('Edit live trigger condition',g=>{if(!when)throw Error('Trigger condition required');g.native!.triggers![id].when=when;}),doc);
  form.select(host,prefix+' mode',['level','rising'],row.edge??'level',mode=>edit('Edit live trigger mode',g=>{if(mode==='rising')g.native!.triggers![id].edge='rising';else delete g.native!.triggers![id].edge;}));
  form.check(host,prefix+' once per run',!!row.once,once=>edit('Edit trigger activation policy',g=>{if(once)g.native!.triggers![id].once=true;else delete g.native!.triggers![id].once;}));
  form.select(host,prefix+' command',commands,row.command,command=>edit('Rebind live trigger command',g=>{g.native!.triggers![id].command=command;}));
  const index=rows.findIndex(([key])=>key===id);for(const direction of[-1,1])form.button(host,(direction<0?'Move earlier ':'Move later ')+prefix,()=>edit('Reorder live condition triggers',g=>{const entries=Object.entries(g.native!.triggers!);[entries[index],entries[index+direction]]=[entries[index+direction],entries[index]];g.native!.triggers=Object.fromEntries(entries);}),index+direction<0||index+direction>=rows.length);
  form.button(host,'Remove '+prefix,()=>edit('Remove live condition trigger',g=>{delete g.native!.triggers![id];}));
 }
 form.text(box,'New live trigger ID',draft.liveTrigger??'',value=>{draft.liveTrigger=value;});
 form.button(box,'Add live condition trigger',()=>edit('Add live condition trigger',g=>{const id=draft.liveTrigger??'';g.native!.triggers??={};if(g.native!.triggers[id])throw Error('Trigger already exists');g.native!.triggers[id]={when:{tokensAtLeast:0},command:commands[0]};}),!commands.length||rows.length>=64);
}
