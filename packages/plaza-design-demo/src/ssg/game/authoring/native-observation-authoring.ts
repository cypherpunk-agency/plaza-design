import {TypedForm} from './typed-form';
import {NET,KEYRING,type SceneData,type NetData,type KeyItem} from '../data';
import type {NativeObservation,NativeObservations} from '../engine/native-observations';
/** Typed native projections; edits go through the same atomic source document transaction. */
export function renderNativeObservations(host:HTMLElement,form:TypedForm,data:SceneData,edit:(label:string,change:(d:SceneData)=>void)=>void,derived:readonly string[]=[],net:NetData=NET,keyring:ReadonlyMap<string,KeyItem>=KEYRING){
 const source=data.observations??{aliases:{},goals:[]},nodes=[...new Map([...net.nodes,...(data.nodes??[])].map(n=>[n.id,n])).values()],keys=[...new Set([...keyring.keys(),...(data.keyring??[]).map(k=>k.id)])];
 const update=(label:string,change:(o:NativeObservations)=>void)=>edit(label,d=>{d.observations??=structuredClone(source);change(d.observations);});
 const first=(kind:NativeObservation['kind']):NativeObservation=>kind==='keyHeld'?{kind,key:keys[0]??''}:kind==='sectorOpen'?{kind,node:nodes.find(n=>n.sectors?.length)?.id??'',sector:nodes.find(n=>n.sectors?.length)?.sectors?.[0].id??''}:{kind,node:nodes[0]?.id??''};
 for(const[id,o]of Object.entries(source.aliases)){const row=form.section(host,'Observation '+id);form.text(row,'Observation '+id+' alias',id,name=>update('Rename observation alias',s=>{if(name===id)return;if(Object.prototype.hasOwnProperty.call(s.aliases,name))throw Error('Observation alias already exists');s.aliases[name]=s.aliases[id];delete s.aliases[id];for(const g of s.goals){const neg=g.when.startsWith('!'),parts=g.when.slice(neg?1:0).split('=');if(parts[0]===id)g.when=(neg?'!':'')+name+(parts.length>1?'='+parts.slice(1).join('='):'');}}));form.select(row,'Observation '+id+' kind',['nodeConnected','sectorOpen','keyHeld'],o.kind,kind=>update('Change observation kind',s=>{s.aliases[id]=first(kind as NativeObservation['kind']);}));
  if(o.kind==='keyHeld')form.select(row,'Observation '+id+' key',keys,o.key,key=>update('Rebind observed key',s=>{s.aliases[id]={kind:'keyHeld',key};}));
  else {form.select(row,'Observation '+id+' node',nodes.filter(n=>o.kind!=='sectorOpen'||n.sectors?.length).map(n=>n.id),o.node,node=>update('Rebind observed node',s=>{s.aliases[id]=o.kind==='sectorOpen'?{...o,node,sector:nodes.find(n=>n.id===node)!.sectors![0].id}:{...o,node};}));if(o.kind==='sectorOpen')form.select(row,'Observation '+id+' sector',nodes.find(n=>n.id===o.node)?.sectors?.map(s=>s.id)??[],o.sector,sector=>update('Rebind observed sector',s=>{s.aliases[id]={...o,sector};}));}
  form.button(row,'Remove observation '+id,()=>update('Remove observation',s=>{delete s.aliases[id];}));
 }
 form.button(host,'Add observation',()=>update('Add observation',s=>{let i=1;while(s.aliases['observed'+i])i++;s.aliases['observed'+i]=first(nodes.length?'nodeConnected':'keyHeld');}),!nodes.length&&!keys.length);
 const known=[...new Set([...Object.keys(data.state),...derived,...Object.keys(source.aliases),'weather','hour','day'])];
 source.goals.forEach((g,i)=>{const row=form.section(host,'Observed goal '+(i+1)),negative=g.when.startsWith('!'),[key,want]=g.when.slice(negative?1:0).split('=');
  const condition=(k:string,neg=negative,w=want)=>update('Edit observed goal condition',s=>{s.goals[i].when=(neg?'!':'')+k+(w===undefined?'':'='+w);});
  form.select(row,'Observed goal '+(i+1)+' condition',known,key,k=>condition(k));form.check(row,'Observed goal '+(i+1)+' negate',negative,neg=>condition(key,neg));form.check(row,'Observed goal '+(i+1)+' compare value',want!==undefined,on=>update('Edit observed goal comparison',s=>{s.goals[i].when=(negative?'!':'')+key+(on?'=true':'');}));if(want!==undefined)form.text(row,'Observed goal '+(i+1)+' equals',want,w=>condition(key,negative,w));
  form.select(row,'Observed goal '+(i+1)+' target',data.goals.map(g=>g.id),g.goal,goal=>update('Rebind observed goal',s=>{s.goals[i].goal=goal;}));form.button(row,'Remove observed goal '+(i+1),()=>update('Remove observed goal',s=>{s.goals.splice(i,1);}));
 });
 form.button(host,'Add observed goal',()=>update('Add observed goal',s=>{s.goals.push({when:known[0],goal:data.goals[0].id});}),!known.length||!data.goals.length);
}
