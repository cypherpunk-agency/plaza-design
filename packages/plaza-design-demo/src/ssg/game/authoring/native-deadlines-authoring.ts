import type {GameplayDefinition} from '../engine/gameplay/types';
import type {GameplayBindingControls} from './gameplay-bindings-authoring';
export function renderNativeDeadlinesAuthoring(parent:HTMLElement,doc:GameplayDefinition,ui:GameplayBindingControls){
 const {data,form,section,edit,draft}=ui;if(!data||!doc.native)return;
 const box=section(parent,'Cancelable deadlines',true),system=Object.entries(doc.commands).filter(([,c])=>c.sources.length===1&&c.sources[0]==='system').map(([id])=>id),tuning=Object.entries(data.tuning).filter(([,n])=>n>0&&n<=1000000).map(([id])=>id);
 for(const[id,row]of Object.entries(doc.native.deadlines??{})){
  const host=section(box,'Deadline '+id,true),prefix='Deadline '+id;
  const change=(label:string,fn:(r:typeof row)=>void)=>edit(label,d=>fn(d.native!.deadlines![id]));
  form.text(host,prefix+' ID',id,next=>edit('Rename deadline',d=>{if(next!==id&&d.native!.deadlines![next])throw Error('Deadline already exists');d.native!.deadlines=Object.fromEntries(Object.entries(d.native!.deadlines!).map(([key,value])=>[key===id?next:key,value]));}));
  form.select(host,prefix+' duration',tuning,row.duration.tuning,tuning=>change('Rebind deadline duration',r=>{r.duration.tuning=tuning;}));
  form.text(host,prefix+' progress stamp',row.startedAt??'',key=>change('Rebind deadline progress',r=>{if(key)r.startedAt=key;else delete r.startedAt;}));
  form.condition(host,prefix+' arm condition',row.armWhen,condition=>change('Edit deadline arm condition',r=>{if(condition)r.armWhen=condition;else delete r.armWhen;}),doc);
  form.condition(host,prefix+' due condition',row.while,condition=>change('Edit deadline due condition',r=>{if(condition)r.while=condition;else delete r.while;}),doc);
  for(const key of ['startOn','cancelOn']as const){
   (row[key]??[]).forEach((event,i)=>{form.select(host,prefix+' '+key+' '+(i+1),doc.events,event,event=>change('Rebind deadline event',r=>{r[key]![i]=event;}));form.button(host,'Remove '+prefix+' '+key+' '+(i+1),()=>change('Remove deadline event',r=>{r[key]!.splice(i,1);if(!r[key]!.length&&key==='cancelOn')delete r.cancelOn;}),key==='startOn'&&row.startOn.length<=1);});
   form.select(host,prefix+' new '+key,['',...doc.events.filter(event=>!row[key]?.includes(event))],draft[id+'.'+key]??'',value=>{draft[id+'.'+key]=value;});form.button(host,'Add '+prefix+' '+key,()=>change('Add deadline event',r=>{const event=draft[id+'.'+key];if(!doc.events.includes(event)||r[key]?.includes(event))throw Error('Select unused event');(r[key]??=[]).push(event);}),row[key]?.length===64);
  }
  row.due.forEach((c,i)=>{const p=prefix+' outcome '+(i+1);if(i<row.due.length-1)form.condition(host,p+' condition',c.when,when=>change('Edit deadline outcome',r=>{if(!when)throw Error('Ordered condition required');r.due[i].when=when;}),doc);form.select(host,p+' command',system,c.command,command=>change('Rebind deadline outcome',r=>{r.due[i].command=command;}));if(i<row.due.length-1){form.button(host,'Remove '+p,()=>change('Remove deadline outcome',r=>{r.due.splice(i,1);}));for(const step of[-1,1])form.button(host,(step<0?'Move earlier ':'Move later ')+p,()=>change('Reorder deadline outcome',r=>{[r.due[i],r.due[i+step]]=[r.due[i+step],r.due[i]];}),i+step<0||i+step>=row.due.length-1);}});
  form.button(host,'Add '+prefix+' outcome',()=>change('Add deadline outcome',r=>{r.due.splice(r.due.length-1,0,{when:{tokensAtLeast:0},command:system[0]});}),!system.length||row.due.length>=32);
  const index=Object.keys(doc.native.deadlines!).indexOf(id),length=Object.keys(doc.native.deadlines!).length;for(const step of[-1,1])form.button(host,(step<0?'Move earlier ':'Move later ')+prefix,()=>edit('Reorder deadlines',g=>{const rows=Object.entries(g.native!.deadlines!);[rows[index],rows[index+step]]=[rows[index+step],rows[index]];g.native!.deadlines=Object.fromEntries(rows);}),index+step<0||index+step>=length);
  form.button(host,'Remove '+prefix,()=>edit('Remove deadline',d=>{delete d.native!.deadlines![id];}));
 }
 form.text(box,'New deadline ID',draft.deadline??'',id=>{draft.deadline=id;});form.button(box,'Add cancelable deadline',()=>edit('Add deadline',d=>{const id=draft.deadline??'';d.native!.deadlines??={};if(d.native!.deadlines[id])throw Error('Deadline already exists');d.native!.deadlines[id]={startOn:[d.events[0]],duration:{tuning:tuning[0]},due:[{command:system[0]}]};}),!doc.events.length||!tuning.length||!system.length||Object.keys(doc.native.deadlines??{}).length>=64);
}
