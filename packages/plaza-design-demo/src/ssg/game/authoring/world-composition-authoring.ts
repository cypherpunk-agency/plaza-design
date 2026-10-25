import type {WorkbenchContext,WorkbenchHandle} from './contracts';
import {TypedForm} from './typed-form';
import {pendingRegistry} from './pending-registry';
import {worldCompositionContext} from '../world/compiled-world';
import {compileWorldComposition,validateWorldCompositions,type WorldComposition,type WorldCompositions,type WorldEndpoint,type WorldMember} from '../world/compositions';
import {SEAM_KINDS} from '../world/zone-graph';
import {zoneInfo} from './zone-graph-context';

/** World source edits use ordinary ComposerModel history and grouped source validation. */
export function mountWorldCompositionAuthoring(host:HTMLElement,context:WorkbenchContext):WorkbenchHandle {
 const api=context.authoring!;let disposed=false,section:'compositions'|'groups'='compositions',selected='';
 const error=document.createElement('p');error.setAttribute('role','alert');
 const form=new TypedForm(e=>error.textContent=e instanceof Error?e.message:String(e));
 const read=()=>validateWorldCompositions(api.get('world-compositions').value);
 const values=()=>new Map(context.documents.map(d=>[d.id,api.get(d.id).value]));
 const nextId=(used:readonly string[],prefix:string)=>{let i=1;while(used.includes(prefix+'-'+i))i++;return prefix+'-'+i;};
 function edit(label:string,change:(source:WorldCompositions)=>void){const d=read();change(d);api.edit('world-compositions',label,validateWorldCompositions(d));error.textContent='';}
 function render(){
  if(disposed)return;host.replaceChildren(error);const d=read(),ids=Object.keys(d[section]);if(!ids.includes(selected))selected=ids[0]??'';
  form.select(host,'Definition type',['compositions','groups'],section,s=>{section=s as typeof section;selected='';render();});
  form.select(host,'Definition',ids,selected,s=>{selected=s;render();});
  form.button(host,'Add '+(section==='groups'?'group':'composition'),()=>edit('Add world definition',s=>{selected=nextId(Object.keys(s[section]),section==='groups'?'group':'world');s[section][selected]={name:selected,members:[],connections:[],...(section==='groups'?{exports:{}}:{})};}));
  if(!selected)return;const def=d[section][selected];
  const update=(label:string,fn:(def:WorldComposition)=>void)=>edit(label,s=>fn(s[section][selected]));
  form.text(host,'Name',def.name,name=>update('Rename world definition',def=>def.name=name));
  form.button(host,'Remove definition',()=>edit('Remove world definition',s=>{delete s[section][selected];}));
  const sceneIds=Object.keys(zoneInfo(values()));
  for(const member of def.members){const box=form.section(host,member.id+' · '+(member.chunk??member.group));
   const change=(label:string,fn:(m:WorldMember)=>void)=>update(label,def=>fn(def.members.find(m=>m.id===member.id)!));
   form.text(box,'Member ID',member.id,id=>update('Rename world member',def=>{if(def.connections.some(c=>c.a.member===member.id||c.b.member===member.id)||'exports'in def&&Object.values(def.exports as Record<string,WorldEndpoint>).some(e=>e.member===member.id))throw Error('Disconnect member before renaming');def.members.find(m=>m.id===member.id)!.id=id;}));
   if(member.chunk)form.select(box,'Chunk',sceneIds,member.chunk,chunk=>change('Change member chunk',m=>{m.chunk=chunk;}));
   else form.select(box,'Group',Object.keys(d.groups),member.group!,group=>change('Change member group',m=>{m.group=group;}));
   form.decimal(box,'X',member.placement.x,x=>change('Move world member',m=>m.placement.x=x),-10000000,10000000);
   form.decimal(box,'Height',member.placement.h,h=>change('Move world member',m=>m.placement.h=h),-10000000,10000000);
   if(member.chunk)form.button(box,'Open chunk',()=>context.openScene(member.chunk!));
   form.button(box,'Remove member',()=>update('Remove world member',def=>{def.members=def.members.filter(m=>m.id!==member.id);}));
  }
  form.button(host,'Add chunk',()=>update('Add chunk to world',def=>def.members.push({id:nextId(def.members.map(m=>m.id),'chunk'),chunk:sceneIds[0],placement:{x:0,h:0}})));
  if(section==='compositions'&&Object.keys(d.groups).length)form.button(host,'Add group',()=>update('Add group to world',def=>def.members.push({id:nextId(def.members.map(m=>m.id),'group'),group:Object.keys(d.groups)[0],placement:{x:0,h:0}})));
  const endpoint=(box:HTMLElement,label:string,e:WorldEndpoint,set:(e:WorldEndpoint)=>void)=>{
   form.select(box,label+' member',def.members.map(m=>m.id),e.member,member=>{const m=def.members.find(m=>m.id===member)!;set(m.group?{member,export:Object.keys(d.groups[m.group].exports)[0]??'origin'}:{member,instance:'platform',anchor:'origin'});});
   if(e.export!==undefined)form.select(box,label+' export',Object.keys(d.groups[def.members.find(m=>m.id===e.member)!.group!].exports),e.export,value=>set({member:e.member,export:value}));
   else{form.text(box,label+' artwork',e.instance,value=>set({...e,instance:value}));form.text(box,label+' anchor',e.anchor,value=>set({...e,anchor:value}));}
  };
  for(const connection of def.connections){const box=form.section(host,'Connection '+connection.id);
   const change=(fn:(c:typeof connection)=>void)=>update('Edit world connection',def=>fn(def.connections.find(c=>c.id===connection.id)!));
   form.select(box,'Kind',SEAM_KINDS,connection.kind,kind=>change(c=>c.kind=kind as typeof c.kind));
   endpoint(box,'From',connection.a,e=>change(c=>c.a=e));endpoint(box,'To',connection.b,e=>change(c=>c.b=e));
   form.button(box,'Remove connection',()=>update('Remove world connection',def=>def.connections=def.connections.filter(c=>c.id!==connection.id)));
  }
  const defaultEnd=(member:WorldMember):WorldEndpoint=>member.group?{member:member.id,export:Object.keys(d.groups[member.group].exports)[0]??'origin'}:{member:member.id,instance:'platform',anchor:'origin'};
  if(def.members.length>1)form.button(host,'Add connection',()=>update('Connect world members',def=>def.connections.push({id:nextId(def.connections.map(c=>c.id),'connection'),kind:'walk',a:defaultEnd(def.members[0]),b:defaultEnd(def.members[1])})));
  if(section==='groups'){
   for(const [key,e] of Object.entries(d.groups[selected].exports)){const box=form.section(host,'Export '+key);endpoint(box,'Anchor',e,e=>edit('Edit group export',s=>s.groups[selected].exports[key]=e));form.button(box,'Remove export',()=>edit('Remove group export',s=>{delete s.groups[selected].exports[key];}));}
   if(def.members.length)form.button(host,'Add export',()=>edit('Add group export',s=>{const group=s.groups[selected];group.exports[nextId(Object.keys(group.exports),'anchor')]=defaultEnd(group.members[0]);}));
  }else{
   const list=document.createElement('p');
   try{const compiled=compileWorldComposition(d,selected,worldCompositionContext(pendingRegistry(values())));list.textContent=compiled.chunks.map(c=>`${c.path}: ${c.chunk} (${c.x}, ${c.h})`).join(' · ')||'Empty composition';}catch(e){list.textContent=e instanceof Error?e.message:String(e);list.setAttribute('role','alert');}
   host.append(list);
  }
 }
 render();const dispose=(()=>{disposed=true;host.replaceChildren();}) as WorkbenchHandle;dispose.refresh=render;return dispose;
}
