import {TypedForm} from './typed-form';
import {validateCheckpointOwner,validateCheckpointShape} from '../engine/gameplay/checkpoint-source';
import type {GameplayDefinition} from '../engine/gameplay/types';
/** Policies reference the same editable system commands used by the shared transaction engine. */
export function renderCheckpointAuthoring(parent:HTMLElement,doc:GameplayDefinition,ui:{section(parent:HTMLElement,title:string,collapsed?:boolean):HTMLElement;edit(label:string,change:(d:GameplayDefinition)=>void):void;report(error:unknown):void;owner?:string}){
 const box=ui.section(parent,'Current checkpoint policies',true),form=new TypedForm(ui.report);form.stateOnly=true;
 const commands=Object.keys(doc.commands).filter(id=>{try{const candidate={...doc,checkpoint:[{command:id}]};validateCheckpointShape(candidate,()=>{});if(ui.owner)validateCheckpointOwner(candidate,ui.owner);return true;}catch{return false;}});
 const conditionDoc={...doc,state:Object.fromEntries(Object.entries(doc.state??{}).filter(([,d])=>!ui.owner||d.owner===ui.owner))};
 const note=document.createElement('p');note.textContent='Run these state-only system commands in order on the copied checkpoint. Live simulation values stay unchanged.';box.append(note);
 for(const[i,row]of(doc.checkpoint??[]).entries()){const title='Checkpoint '+(i+1),section=ui.section(box,title,true);form.select(section,title+' command',commands,row.command,command=>ui.edit('Change checkpoint command',d=>{d.checkpoint![i].command=command;}));form.condition(section,title+' condition',row.when,when=>ui.edit('Change checkpoint condition',d=>{if(when)d.checkpoint![i].when=when;else delete d.checkpoint![i].when;}),conditionDoc);form.button(section,'Remove '+title,()=>ui.edit('Remove checkpoint policy',d=>{d.checkpoint!.splice(i,1);}));form.button(section,'Move '+title+' up',()=>ui.edit('Reorder checkpoint policies',d=>{const rows=d.checkpoint!;[rows[i-1],rows[i]]=[rows[i],rows[i-1]];}),i===0);}
 form.button(box,'Add checkpoint policy',()=>ui.edit('Add checkpoint policy',d=>{d.checkpoint??=[];d.checkpoint.push({command:commands[0]});}),!commands.length||(doc.checkpoint?.length??0)>=32);
}
