import type {GameplayDefinition,StateDeclaration} from '../engine/gameplay/types';
import type {GameplayBindingControls} from './gameplay-bindings-authoring';
/** These are typed references, not declarations: only the owning document supplies defaults and writes. */
export function renderStateReadsAuthoring(parent:HTMLElement,doc:GameplayDefinition,ui:GameplayBindingControls){
 const {form,section,edit,draft}=ui,box=section(parent,'Read state from other owners',true),types=['boolean','number','string','enum'] as const;
 for(const[id,type]of Object.entries(doc.stateReads??{})){
  const row=section(box,id,true);
  form.select(row,'Read state '+id+' expected type',types,type,value=>edit('Edit read-only state type',d=>{d.stateReads![id]=value as StateDeclaration['type'];}));
  form.button(row,'Remove read state '+id,()=>edit('Remove read-only state reference',d=>{delete d.stateReads![id];}));
 }
 form.text(box,'Read state ID',draft.stateRead??'',value=>{draft.stateRead=value;});
 form.select(box,'Read state expected type',types,draft.stateReadType??'boolean',value=>{draft.stateReadType=value;});
 form.button(box,'Add read state reference',()=>edit('Add read-only state reference',d=>{const id=draft.stateRead??'';d.stateReads??={};if(id in d.stateReads)throw Error('State read already exists');d.stateReads[id]=(draft.stateReadType??'boolean') as StateDeclaration['type'];}));
}
