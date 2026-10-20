import {TypedForm} from './typed-form';
import {NET,KEYRING,type SceneData,type NetData,type KeyItem} from '../data';
import type {NativeObservation,NativeObservations} from '../engine/native-observations';
/** Typed native projections; edits go through the same atomic source document transaction. */
export function renderNativeObservations(host:HTMLElement,form:TypedForm,data:SceneData,edit:(label:string,change:(d:SceneData)=>void)=>void,_derived:readonly string[]=[],net:NetData=NET,keyring:ReadonlyMap<string,KeyItem>=KEYRING){
 const source=data.observations??{aliases:{}},nodes=[...new Map([...net.nodes,...(data.nodes??[])].map(n=>[n.id,n])).values()],keys=[...new Set([...keyring.keys(),...(data.keyring??[]).map(k=>k.id)])];
 const update=(label:string,change:(o:NativeObservations)=>void)=>edit(label,d=>{d.observations??=structuredClone(source);change(d.observations);});
 const first=(kind:NativeObservation['kind']):NativeObservation=>kind==='goalComplete'?{kind,goal:data.goals[0]?.id??''}:kind==='keyHeld'?{kind,key:keys[0]??''}:kind==='sectorOpen'?{kind,node:nodes.find(n=>n.sectors?.length)?.id??'',sector:nodes.find(n=>n.sectors?.length)?.sectors?.[0].id??''}:{kind,node:nodes[0]?.id??''};
 for(const[id,o]of Object.entries(source.aliases)){const row=form.section(host,'Observation '+id);form.text(row,'Observation '+id+' alias',id,name=>update('Rename observation alias',s=>{if(name===id)return;if(Object.prototype.hasOwnProperty.call(s.aliases,name))throw Error('Observation alias already exists');s.aliases[name]=s.aliases[id];delete s.aliases[id];}));form.select(row,'Observation '+id+' kind',['nodeConnected','sectorOpen','keyHeld',...(data.goals.length?['goalComplete']:[])],o.kind,kind=>update('Change observation kind',s=>{s.aliases[id]=first(kind as NativeObservation['kind']);}));
  if(o.kind==='goalComplete')form.select(row,'Observation '+id+' goal',data.goals.map(g=>g.id),o.goal,goal=>update('Rebind observed goal',s=>{s.aliases[id]={kind:'goalComplete',goal};}));
  else if(o.kind==='keyHeld')form.select(row,'Observation '+id+' key',keys,o.key,key=>update('Rebind observed key',s=>{s.aliases[id]={kind:'keyHeld',key};}));
  else {form.select(row,'Observation '+id+' node',nodes.filter(n=>o.kind!=='sectorOpen'||n.sectors?.length).map(n=>n.id),o.node,node=>update('Rebind observed node',s=>{s.aliases[id]=o.kind==='sectorOpen'?{...o,node,sector:nodes.find(n=>n.id===node)!.sectors![0].id}:{...o,node};}));if(o.kind==='sectorOpen')form.select(row,'Observation '+id+' sector',nodes.find(n=>n.id===o.node)?.sectors?.map(s=>s.id)??[],o.sector,sector=>update('Rebind observed sector',s=>{s.aliases[id]={...o,sector};}));}
  form.button(row,'Remove observation '+id,()=>update('Remove observation',s=>{delete s.aliases[id];}));
 }
 form.button(host,'Add observation',()=>update('Add observation',s=>{let i=1;while(s.aliases['observed'+i])i++;s.aliases['observed'+i]=first(nodes.length?'nodeConnected':'keyHeld');}),!nodes.length&&!keys.length);
}
