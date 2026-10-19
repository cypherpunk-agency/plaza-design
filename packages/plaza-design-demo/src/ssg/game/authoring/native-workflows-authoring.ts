import {renderNativeLiveConditionsAuthoring} from './native-live-conditions-authoring';
import type {GameplayDefinition} from '../engine/gameplay/types';
import type {GameplayBindingControls} from './gameplay-bindings-authoring';
/** All edits use the owning workbench's prospective source validator. */
export function renderNativeWorkflowAuthoring(parent:HTMLElement,doc:GameplayDefinition,ui:GameplayBindingControls){
 const{data,form,section,edit,draft}=ui;if(!data||!doc.native)return;
 const system=Object.entries(doc.commands).filter(([,c])=>c.sources.length===1&&c.sources[0]==='system').map(([id])=>id),tuning=Object.entries(data.tuning).filter(([,v])=>Number.isFinite(v)&&v>0&&v<=1000000).map(([id])=>id);
 renderNativeLiveConditionsAuthoring(parent,doc,ui);
 const box=section(parent,'Live workflows',true),entries=Object.entries(doc.native.intervals??{});
 for(const[id,row]of entries){const host=section(box,'Interval '+id,true),prefix='Interval '+id;
  form.text(host,prefix+' ID',id,value=>edit('Rename live interval',g=>{if(value!==id&&g.native!.intervals![value])throw Error('Interval already exists');g.native!.intervals=Object.fromEntries(Object.entries(g.native!.intervals!).map(([key,r])=>[key===id?value:key,r]));}));
  form.text(host,prefix+' elapsed key',row.elapsed,elapsed=>edit('Rebind elapsed time',g=>{g.native!.intervals![id].elapsed=elapsed;}));
  form.select(host,prefix+' duration',tuning,row.duration.tuning,value=>edit('Rebind interval duration',g=>{g.native!.intervals![id].duration.tuning=value;}));
  form.condition(host,prefix+' active',row.active,active=>edit('Edit interval activation',g=>{if(!active)throw Error('Activation condition required');g.native!.intervals![id].active=active;}),doc);
  form.select(host,prefix+' inactive',['hold','reset'],row.inactive,value=>edit('Edit inactive elapsed policy',g=>{g.native!.intervals![id].inactive=value as 'hold'|'reset';}));
  for(const[eventIndex,event]of(row.resetOn??[]).entries()){form.select(host,prefix+' reset '+(eventIndex+1),doc.events,event,value=>edit('Rebind interval reset',g=>{g.native!.intervals![id].resetOn![eventIndex]=value;}));form.button(host,'Remove '+prefix+' reset '+(eventIndex+1),()=>edit('Remove interval reset',g=>{g.native!.intervals![id].resetOn!.splice(eventIndex,1);}));}
  form.select(host,prefix+' new reset event',['',...doc.events],draft[prefix+'reset']??'',value=>{draft[prefix+'reset']=value;});form.button(host,'Add '+prefix+' reset',()=>edit('Add interval reset',g=>{const event=draft[prefix+'reset']??'';if(!doc.events.includes(event))throw Error('Select reset event');(g.native!.intervals![id].resetOn??=[]).push(event);}));
  row.due.forEach((c,i)=>{const cp=prefix+' due '+(i+1);if(i<row.due.length-1)form.condition(host,cp+' condition',c.when,when=>edit('Edit interval outcome condition',g=>{if(!when)throw Error('Ordered condition required');g.native!.intervals![id].due[i].when=when;}),doc);form.select(host,cp+' command',system,c.command,command=>edit('Rebind interval outcome',g=>{g.native!.intervals![id].due[i].command=command;}));if(i<row.due.length-1)form.button(host,'Remove '+cp,()=>edit('Remove interval outcome',g=>{g.native!.intervals![id].due.splice(i,1);}));});
  form.button(host,'Add '+prefix+' outcome',()=>edit('Add interval outcome',g=>{const due=g.native!.intervals![id].due;due.splice(due.length-1,0,{when:{tokensAtLeast:1},command:system[0]});}),!system.length||row.due.length>=32);
  for(const direction of[-1,1]){const index=entries.findIndex(([key])=>key===id);form.button(host,(direction<0?'Move earlier ':'Move later ')+prefix,()=>edit('Reorder live interval',g=>{const rows=Object.entries(g.native!.intervals!);[rows[index],rows[index+direction]]=[rows[index+direction],rows[index]];g.native!.intervals=Object.fromEntries(rows);}),index+direction<0||index+direction>=entries.length);}
  form.button(host,'Remove '+prefix,()=>edit('Remove live interval',g=>{delete g.native!.intervals![id];}));
 }
 form.text(box,'New interval ID',draft.interval??'',value=>{draft.interval=value;});form.button(box,'Add live interval',()=>edit('Add live interval',g=>{const id=draft.interval??'';g.native!.intervals??={};if(g.native!.intervals[id])throw Error('Interval already exists');g.native!.intervals[id]={kind:'liveInterval',elapsed:'interval.'+id,duration:{tuning:tuning[0]},active:{tokensAtLeast:0},inactive:'hold',due:[{command:system[0]}]};}),!system.length||!tuning.length||entries.length>=64);
 const replies=section(parent,'Committed device replies',true),devices=[...data.devices,...data.nodes??[]].map(d=>d.id);
 for(const[event,row]of Object.entries(doc.native.replies??{})){const host=section(replies,'Reply '+event,true),prefix='Reply '+event;
  form.select(host,prefix+' device',devices,row.from,from=>edit('Rebind reply device',g=>{g.native!.replies![event].from=from;}));
  form.text(host,prefix+' input',row.say[0],text=>edit('Edit committed reply input',g=>{g.native!.replies![event].say[0]=text;}));form.text(host,prefix+' response',row.say[1],text=>edit('Edit committed reply',g=>{g.native!.replies![event].say[1]=text;}),true);
  form.select(host,prefix+' tone',['','ok','err','dim'],row.say[2]??'',tone=>edit('Edit reply tone',g=>{const r=g.native!.replies![event];r.say=tone?[r.say[0],r.say[1],tone as 'ok'|'err'|'dim']:[r.say[0],r.say[1]];}));
  form.check(host,prefix+' template',!!row.template,on=>edit('Edit reply template',g=>{if(on)g.native!.replies![event].template=true;else delete g.native!.replies![event].template;}));
  form.button(host,'Remove '+prefix,()=>edit('Remove committed reply',g=>{delete g.native!.replies![event];}));
 }
 form.select(replies,'New reply event',['',...doc.events.filter(id=>!doc.native!.replies?.[id])],draft.reply??'',value=>{draft.reply=value;});form.button(replies,'Add committed reply',()=>edit('Add committed reply',g=>{const event=draft.reply??'';if(!doc.events.includes(event)||g.native!.replies?.[event])throw Error('Select an unused declared event');g.native!.replies??={};g.native!.replies[event]={from:devices[0],say:['reply','Device replied.']};}),!devices.length||Object.keys(doc.native.replies??{}).length>=64);
}
