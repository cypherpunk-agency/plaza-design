import {controllerSpeakers} from '../engine/controllers';
import type {GameplayDefinition,NativeReplyLine,Condition} from '../engine/gameplay/types';
import type {GameplayBindingControls} from './gameplay-bindings-authoring';
export function renderNativeRepliesAuthoring(parent:HTMLElement,doc:GameplayDefinition,ui:GameplayBindingControls){
 const {data,form,section,edit,draft}=ui;if(!data||!doc.native)return;
 const replies=section(parent,'Committed device replies',true),devices=[...new Set([...data.devices,...data.nodes??[]].map(d=>d.id).concat(controllerSpeakers(data)))];
 for(const[event,binding]of Object.entries(doc.native.replies??{})){
  const host=section(replies,'Reply '+event,true),prefix='Reply '+event;
  form.select(host,prefix+' mode',['single','ordered'],'cases'in binding?'ordered':'single',mode=>edit('Change reply selection',g=>{const old=g.native!.replies![event];g.native!.replies![event]=mode==='ordered'?{cases:['cases'in old?old.cases.at(-1)!:old]}:('cases'in old?(({when:_,...line})=>line)(old.cases.at(-1)!):old);}));
  const rows:(NativeReplyLine&{when?:Condition})[]='cases'in binding?binding.cases:[binding];
  rows.forEach((row,i)=>{
   const p='cases'in binding?prefix+' case '+(i+1):prefix;
   const change=(label:string,fn:(r:NativeReplyLine&{when?:Condition})=>void)=>edit(label,g=>{const current=g.native!.replies![event];fn('cases'in current?current.cases[i]:current);});
   if('cases'in binding&&i<rows.length-1)form.condition(host,p+' condition',row.when,when=>change('Edit reply condition',r=>{if(!when)throw Error('Ordered condition required');r.when=when;}),doc);
   form.select(host,p+' device',devices,row.from,from=>change('Rebind reply device',r=>{r.from=from;}));
   form.text(host,p+' input',row.say[0],text=>change('Edit committed reply input',r=>{r.say[0]=text;}));form.text(host,p+' response',row.say[1],text=>change('Edit committed reply',r=>{r.say[1]=text;}),true);
   form.select(host,p+' tone',['','ok','err','dim'],row.say[2]??'',tone=>change('Edit reply tone',r=>{r.say=tone?[r.say[0],r.say[1],tone as 'ok'|'err'|'dim']:[r.say[0],r.say[1]];}));
   form.check(host,p+' template',!!row.template,on=>change('Edit reply template',r=>{if(on)r.template=true;else delete r.template;}));
   if('cases'in binding&&i<rows.length-1){form.button(host,'Remove '+p,()=>edit('Remove reply case',g=>{const r=g.native!.replies![event];if('cases'in r)r.cases.splice(i,1);}));for(const step of[-1,1])form.button(host,(step<0?'Move earlier ':'Move later ')+p,()=>edit('Reorder reply case',g=>{const r=g.native!.replies![event];if('cases'in r)[r.cases[i],r.cases[i+step]]=[r.cases[i+step],r.cases[i]];}),i+step<0||i+step>=rows.length-1);}
  });
  if('cases'in binding)form.button(host,'Add '+prefix+' case',()=>edit('Add reply case',g=>{const r=g.native!.replies![event];if('cases'in r)r.cases.splice(r.cases.length-1,0,{when:{tokensAtLeast:0},from:devices[0],say:['reply','Device replied.']});}),binding.cases.length>=32);
  form.button(host,'Remove '+prefix,()=>edit('Remove committed reply',g=>{delete g.native!.replies![event];}));
 }
 form.select(replies,'New reply event',['',...doc.events.filter(id=>!doc.native!.replies?.[id])],draft.reply??'',value=>{draft.reply=value;});form.button(replies,'Add committed reply',()=>edit('Add committed reply',g=>{const event=draft.reply??'';if(!doc.events.includes(event)||g.native!.replies?.[event])throw Error('Select an unused declared event');g.native!.replies??={};g.native!.replies[event]={from:devices[0],say:['reply','Device replied.']};}),!devices.length||Object.keys(doc.native.replies??{}).length>=64);
}
