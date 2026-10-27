import {worldVariables} from './world-variables';
import {TypedForm} from './typed-form';
import {element} from './controls';
import {renderStateDeclarationsAuthoring} from './state-declarations-authoring';
import {stateAddress} from '../engine/gameplay/state';
import type {WorkbenchContext,WorkbenchHandle} from './contracts';
import type {GameplayDefinition} from '../engine/gameplay/types';

/** Source inspection and edits only: live campaign values never enter this workbench. */
export function mountWorldVariableAuthoring(host:HTMLElement,context:WorkbenchContext):WorkbenchHandle{
 const api=context.authoring!,error=element('p');error.setAttribute('role','alert');const form=new TypedForm(e=>{error.textContent=String(e);});let selected='',filter='',disposed=false,newId='world.variable';
 function render(){
  if(disposed)return;host.replaceChildren(error,element('h2','','World variables'),element('p','muted','Declarations and authored uses across chunks and shared libraries. Values below are defaults and explicit checkpoint overrides, not the live campaign save.'));
  const all=worldVariables(context.documents),rows=all.filter(v=>[v.id,v.address,v.document].some(s=>s.toLowerCase().includes(filter.toLowerCase()))),key=(v:typeof all[number])=>v.document+' / '+v.id;
  form.text(host,'Filter variables',filter,value=>{filter=value;render();});
  if(context.documents.some(d=>d.id==='state-owners')){const add=form.section(host,'New world variable');form.text(add,'New world variable ID',newId,value=>{newId=value;});form.button(add,'Add world variable',()=>{const source=structuredClone(api.get('state-owners').value)as GameplayDefinition;if(source.state?.[newId])throw Error('Variable already exists');const[prefix]=stateAddress(newId);source.state??={};source.state[newId]={owner:prefix,type:'boolean',lifetime:'save',default:false};api.edit('state-owners','Add world variable',source);filter='';selected='state-owners / '+newId;error.textContent='';render();});}
  if(!rows.length){host.append(element('p','muted','No matching variables.'));return;}
  if(!rows.some(v=>key(v)===selected))selected=key(rows[0]);form.select(host,'Variable',rows.map(key),selected,value=>{selected=value;render();});
  const row=rows.find(v=>key(v)===selected)!;
  host.append(element('p','',`Source: ${row.document} · Storage key: ${row.address} · Type: ${row.declaration.type}`));
  const value=api.get(row.document).value;let graph=value as GameplayDefinition;for(const part of row.path)graph=(graph as any)[part];
  const edit=(label:string,change:(d:GameplayDefinition)=>void)=>{const value=structuredClone(api.get(row.document).value);let graph=value as GameplayDefinition;for(const part of row.path)graph=(graph as any)[part];change(graph);api.edit(row.document,label,value);error.textContent='';render();};
  form.prefix='State '+row.id+' ';
  renderStateDeclarationsAuthoring(host,graph,{form,draft:{},edit,refresh:render,section:(parent,title)=>form.section(parent,title)},undefined,row.id);
  form.prefix=undefined;
  const list=element('ul');host.append(element('h3','','Authored usages and checkpoint values'),list);
  for(const usage of row.usages){const li=element('li','',`${usage.document} · ${usage.path} · ${usage.kind}${usage.kind==='checkpoint'?' = '+JSON.stringify(usage.value):''}`);if(usage.scene)form.button(li,'Open '+usage.scene,()=>context.openScene(usage.scene!));list.append(li);}
  if(!row.usages.length)list.append(element('li','muted','No authored references.'));
 }
 render();const dispose=(()=>{disposed=true;host.replaceChildren();})as WorkbenchHandle;dispose.refresh=render;return dispose;
}
