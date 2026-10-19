import type {TypedForm} from './typed-form';
import type {SceneDocument} from '../engine/gameplay/scene-document';
import type {Action,LineRef,Value} from '../data/types';
import {ENGINE,LOGIC} from '../data';
import type {SceneDef} from '../scenes/kit';
import type {EngineNetworkContext} from '../engine/network-context';
import {contractOf} from '../engine/rules';
import type {NativeTargetDocument,NativeTargetStep} from '../engine/gameplay/native-targets';
type TargetContext={scene:SceneDef;network:EngineNetworkContext};
const availableLabels=(context:TargetContext)=>Object.entries({...ENGINE.texts,...context.scene.data!.texts}).filter(([,v])=>typeof v==='string').map(([key])=>key);
const freshId=(doc:SceneDocument,base:string,context:TargetContext)=>{const used=new Set([...(doc.nativeTargets??[]).map(t=>t.id),...context.scene.data!.devices.map(d=>d.id),...(context.scene.data!.nodes??[]).map(d=>d.id)]);let id=base,n=1;while(used.has(id))id=base+'-'+(++n);return id;};
const response=():NativeTargetStep=>({say:['look','New response','dim']});
/** Collection identity belongs to source. Only placement/reset capabilities belong to the primitive. */
export function renderNativeTargetCollection(form:TypedForm,host:HTMLElement,doc:SceneDocument,edit:(label:string,fn:(doc:SceneDocument)=>void)=>void,context:TargetContext,refresh:()=>void){
 const capabilities=context.scene.nativeTargetBindings;if(!capabilities)return;let id=freshId(doc,'target',context),anchor=capabilities.anchors[0];
 form.text(host,'New engine target ID',id,value=>{id=value;});form.select(host,'New engine target anchor',capabilities.anchors,anchor,value=>{anchor=value;});
 form.button(host,'Add engine target',()=>{edit('Add engine target',d=>{(d.nativeTargets??=[]).push({id,anchor,promptH:60,labels:[{text:availableLabels(context)[0]}],routes:[{steps:[response()]}]});});refresh();},(doc.nativeTargets?.length??0)>=32);
 for(const [index,target]of(doc.nativeTargets??[]).entries()){const row=form.section(host,'Target '+target.id);form.button(row,'Duplicate target '+target.id,()=>{edit('Duplicate engine target',d=>{const copy=structuredClone(d.nativeTargets![index]);copy.id=freshId(d,target.id+'-copy',context);d.nativeTargets!.splice(index+1,0,copy);});refresh();},doc.nativeTargets!.length>=32);form.button(row,'Remove target '+target.id,()=>{edit('Remove engine target',d=>{d.nativeTargets!.splice(index,1);});refresh();});for(const [label,offset]of[['earlier',-1],['later',1]]as const)form.button(row,'Move target '+target.id+' '+label,()=>{edit('Reorder engine targets',d=>{const rows=d.nativeTargets!,[moved]=rows.splice(index,1);rows.splice(index+offset,0,moved);});refresh();},index+offset<0||index+offset>=doc.nativeTargets!.length);}
}
/** Typed controls over the same native actions used by device verbs. No executable editor callbacks. */
export function renderNativeTarget(form:TypedForm,host:HTMLElement,doc:SceneDocument,index:number,edit:(label:string,fn:(doc:SceneDocument)=>void)=>void,context:TargetContext,refresh:(id?:string)=>void=()=>{}){
 const target=doc.nativeTargets![index],scene=context.scene,data=scene.data!,capabilities=scene.nativeTargetBindings;
 if(scene.id!==doc.id||!capabilities)throw new Error('Registered engine target capabilities required');
 const rules=typeof scene.rules==='function'?undefined:scene.rules,contract=rules?contractOf(rules,scene.gameplay?.native?.verbs,Object.keys(scene.gameplay?.queries??{})):undefined;
 const labels=Object.entries({...ENGINE.texts,...data.texts}).filter(([,v])=>typeof v==='string').map(([k])=>k),lines=Object.entries({...ENGINE.texts,...data.texts}).filter(([,v])=>Array.isArray(v)).map(([k])=>k);
 const change=(label:string,fn:(t:typeof target)=>void)=>edit(label,d=>fn(d.nativeTargets![index]));
 const structural=(label:string,fn:(target:NativeTargetDocument)=>void)=>{change(label,fn);refresh();};
 const firstCondition=Object.keys(data.state)[0]??Object.keys(scene.gameplay?.queries??{})[0];
 const move=<T,>(rows:T[],index:number,offset:number)=>{const [row]=rows.splice(index,1);rows.splice(index+offset,0,row);};
 const condition=(parent:HTMLElement,name:string,value:string|undefined,set:(value:string|undefined)=>void)=>form.text(parent,name,value??'',v=>set(v.trim()||undefined));
 const setCondition=(row:{if?:string},value:string|undefined)=>{if(value)row.if=value;else delete row.if;};
 form.text(host,'Target ID',target.id,id=>{change('Rename engine target',t=>{t.id=id;});refresh(id);});
 form.select(host,'Placement anchor',capabilities.anchors,target.anchor,anchor=>change('Rebind engine target',t=>{t.anchor=anchor;}));
 form.number(host,'Prompt height',target.promptH,promptH=>change('Edit engine target height',t=>{t.promptH=promptH;}),0,10000);
 condition(host,'Visible while',target.if,value=>change('Edit engine target visibility',t=>setCondition(t,value)));
 const anchor=document.createElement('p');anchor.className='muted';anchor.textContent='Layout anchor: '+target.anchor+'. Conditions use the device grammar: key, !key, key=value.';host.append(anchor);
 target.labels.forEach((label,i)=>{const box=form.section(host,'Prompt '+(i+1));form.select(box,'Label reference',labels,label.text,text=>change('Edit target label',t=>{t.labels[i].text=text;}));form.button(box,'Duplicate prompt '+(i+1),()=>structural('Duplicate target prompt',t=>{const copy=structuredClone(t.labels[i]);if(copy.if===undefined)copy.if=firstCondition;t.labels.splice(Math.min(i+1,t.labels.length-1),0,copy);}),target.labels.length>=32||i===target.labels.length-1&&!firstCondition);if(i<target.labels.length-1){condition(box,'Label condition',label.if,value=>change('Edit label condition',t=>setCondition(t.labels[i],value)));form.button(box,'Remove prompt '+(i+1),()=>structural('Remove conditional target prompt',t=>{t.labels.splice(i,1);}));for(const [direction,offset]of[['earlier',-1],['later',1]]as const)form.button(box,'Move prompt '+(i+1)+' '+direction,()=>structural('Reorder target prompts',t=>move(t.labels,i,offset)),i+offset<0||i+offset>=target.labels.length-1);}});
 form.button(host,'Add conditional prompt',()=>structural('Add conditional target prompt',t=>{t.labels.splice(t.labels.length-1,0,{if:firstCondition,text:t.labels.at(-1)!.text});}),!firstCondition||target.labels.length>=32);
 function lineEditor(parent:HTMLElement,line:LineRef,set:(line:LineRef)=>void){
  form.select(parent,'Response kind',['reference','inline'],typeof line==='string'?'reference':'inline',kind=>set(kind==='reference'?lines[0]:['','New response','dim']));
  if(typeof line==='string')form.select(parent,'Response reference',lines,line,set);
  else{form.text(parent,'Response command',line[0],cmd=>set([cmd,line[1],line[2]??'dim']));form.text(parent,'Response text',line[1],reply=>set([line[0],reply,line[2]??'dim']),true);form.select(parent,'Response tone',['ok','err','dim'],line[2]??'dim',tone=>set([line[0],line[1],tone as 'ok'|'err'|'dim']));}
 }
 function actionEditor(parent:HTMLElement,a:Action,set:(a:Action)=>void){
  const keys=Object.keys(data.state),goals=data.goals.map(g=>g.id),gifts=[...context.network.keyring.keys(),...LOGIC.modules.map(m=>m.id),...(context.network.net.programs??[]).map(p=>p.id),'tokens'];
  condition(parent,'Action condition',a.if,value=>{const next={...a};setCondition(next,value);set(next);});
  form.check(parent,'Limit action to time window',!!a.when,on=>{const next={...a};if(on)next.when={from:'18:00',to:'06:00'};else delete next.when;set(next);});
  if(a.when){form.text(parent,'Action from',a.when.from,from=>set({...a,when:{...a.when!,from}}));form.text(parent,'Action to',a.when.to,to=>set({...a,when:{...a.when!,to}}));form.text(parent,'Action days',(a.when.days??[]).join(','),text=>{const when={...a.when!};if(text.trim())when.days=text.split(',').map(day=>day.trim()).map(day=>day==='odd'||day==='even'?day:Number(day));else delete when.days;set({...a,when});});}
  const sectors=[...data.devices,...(data.nodes??[]),...context.network.net.nodes].flatMap(d=>(d.sectors??[]).map(s=>d.id+'/'+s.id));
  const options=[...(keys.length?['set']:[]),...(goals.length?['goal']:[]),'give','take',...(contract?.effects.length?['effect']:[]),...(contract?.panels.length?['open']:[]),...(sectors.length?['unseal']:[])];
  const kind='set'in a?'set':'goal'in a?'goal':'give'in a?'give':'take'in a?'take':'effect'in a?'effect':'open'in a?'open':'unseal';
  form.select(parent,'Action kind',[...new Set([...options,kind])],kind,k=>{const base={...(a.if?{if:a.if}:{}),...(a.when?{when:a.when}:{})};set(k==='set'?{...base,set:keys[0],to:data.state[keys[0]]}:k==='goal'?{...base,goal:goals[0]}:k==='give'?{...base,give:gifts[0]}:k==='take'?{...base,take:'tea'}:k==='unseal'?{...base,unseal:sectors[0]}:k==='effect'?{...base,effect:contract!.effects[0]}:{...base,open:contract!.panels[0]});});
  if('set'in a){form.select(parent,'State key',keys,a.set,key=>set({...a,set:key,to:data.state[key]}));const type=a.to===null?'null':typeof a.to;form.select(parent,'Value type',['string','number','boolean','null'],type,t=>set({...a,to:t==='string'?'':t==='number'?0:t==='boolean'?false:null}));const value=(to:Value)=>set({...a,to});if(typeof a.to==='boolean')form.check(parent,'Value',a.to,value);else if(typeof a.to==='number')form.number(parent,'Value',a.to,value,-1000000,1000000);else if(typeof a.to==='string')form.text(parent,'Value',a.to,value);}
  else if('goal'in a)form.select(parent,'Goal',goals,a.goal,goal=>set({...a,goal}));
  else if('give'in a){form.select(parent,'Grant',gifts,a.give,give=>{const next={...a,give};if(give==='tokens')next.count=1;else delete next.count;set(next);});if(a.give==='tokens')form.number(parent,'Token quantity',a.count??1,count=>set({...a,count}),1);}
  else if('take'in a){form.select(parent,'Carried item',Object.keys(importedItems),a.take,take=>set({...a,take}));form.number(parent,'Item quantity',a.count??1,count=>set({...a,count}),1);}
  else if('effect'in a)form.select(parent,'Effect',contract?.effects??[a.effect],a.effect,effect=>set({...a,effect}));
  else if('open'in a){form.select(parent,'Panel',contract?.panels??[a.open],a.open,open=>{const next={...a,open};delete next.with;set(next);});if(a.open==='talk')form.select(parent,'Dialogue',['',...Object.keys(data.dialogue)],a.with??'',withId=>{const next={...a};if(withId)next.with=withId;else delete next.with;set(next);});}
  else if('unseal'in a)form.select(parent,'Sector',sectors,a.unseal,unseal=>set({...a,unseal}));
 }
 const defaultAction=():Action=>{const key=Object.keys(data.state)[0];return key?{set:key,to:data.state[key]}:{give:'tokens',count:1};};
 target.routes.forEach((route,i)=>{const box=form.section(host,'Outcome '+(i+1));form.button(box,'Duplicate outcome '+(i+1),()=>structural('Duplicate target outcome',t=>{const copy=structuredClone(t.routes[i]);if(copy.if===undefined)copy.if=firstCondition;t.routes.splice(Math.min(i+1,t.routes.length-1),0,copy);}),target.routes.length>=32||i===target.routes.length-1&&!firstCondition);if(i<target.routes.length-1){condition(box,'Outcome condition',route.if,value=>change('Edit target outcome condition',t=>setCondition(t.routes[i],value)));form.button(box,'Remove outcome '+(i+1),()=>structural('Remove target outcome',t=>{t.routes.splice(i,1);}));for(const [direction,offset]of[['earlier',-1],['later',1]]as const)form.button(box,'Move outcome '+(i+1)+' '+direction,()=>structural('Reorder target outcomes',t=>move(t.routes,i,offset)),i+offset<0||i+offset>=target.routes.length-1);}
  route.steps.forEach((step,j)=>{const part=form.section(box,'Step '+(j+1)),kind='say'in step?'response':'do'in step?'actions':'exit'in step?'exit':'reset',exits=(doc.exits??[]).filter(e=>e.engine).map(e=>e.id),kinds=['response','actions',...(j===route.steps.length-1&&exits.length?['exit']:[]),...(capabilities.reset?['reset']:[])];
   form.select(part,'Outcome '+(i+1)+' step '+(j+1)+' kind',kinds,kind,value=>structural('Change engine target step',t=>{t.routes[i].steps[j]=value==='response'?response():value==='actions'?{do:[defaultAction()]}:value==='exit'?{exit:exits[0]}:{reset:true};}));
   if('say'in step)lineEditor(part,step.say,say=>change('Edit engine response',t=>{t.routes[i].steps[j]={say};}));
   else if('exit'in step)form.select(part,'Leave through',exits,step.exit,exit=>change('Edit target exit',t=>{t.routes[i].steps[j]={exit};}));
   else if('reset'in step){const note=document.createElement('p');note.textContent='Reset the scene’s devices, cables, trace and pending actions. Player inventory is preserved.';part.append(note);}
   else{step.do.forEach((action,k)=>{const row=form.section(part,'Action '+(k+1));actionEditor(row,action,action=>change('Edit engine action',t=>{const s=t.routes[i].steps[j];if('do'in s)s.do[k]=action;}));form.button(row,'Duplicate outcome '+(i+1)+' step '+(j+1)+' action '+(k+1),()=>structural('Duplicate engine target action',t=>{const step=t.routes[i].steps[j];if('do'in step)step.do.splice(k+1,0,structuredClone(step.do[k]));}),step.do.length>=64);form.button(row,'Remove outcome '+(i+1)+' step '+(j+1)+' action '+(k+1),()=>structural('Remove engine target action',t=>{const step=t.routes[i].steps[j];if('do'in step)step.do.splice(k,1);}),step.do.length===1);for(const [direction,offset]of[['earlier',-1],['later',1]]as const)form.button(row,'Move outcome '+(i+1)+' step '+(j+1)+' action '+(k+1)+' '+direction,()=>structural('Reorder engine target actions',t=>{const step=t.routes[i].steps[j];if('do'in step)move(step.do,k,offset);}),k+offset<0||k+offset>=step.do.length);});form.button(part,'Add outcome '+(i+1)+' step '+(j+1)+' action',()=>structural('Add engine target action',t=>{const step=t.routes[i].steps[j];if('do'in step)step.do.push(defaultAction());}),step.do.length>=64);}
   form.button(part,'Duplicate outcome '+(i+1)+' step '+(j+1),()=>structural('Duplicate engine target step',t=>{t.routes[i].steps.splice(j+1,0,structuredClone(t.routes[i].steps[j]));}),route.steps.length>=64||'exit'in step);
   form.button(part,'Remove outcome '+(i+1)+' step '+(j+1),()=>structural('Remove engine target step',t=>{t.routes[i].steps.splice(j,1);}),route.steps.length===1);
   for(const [direction,offset]of[['earlier',-1],['later',1]]as const)form.button(part,'Move outcome '+(i+1)+' step '+(j+1)+' '+direction,()=>structural('Reorder engine target steps',t=>move(t.routes[i].steps,j,offset)),j+offset<0||j+offset>=route.steps.length||'exit'in step||!!route.steps[j+offset]&&'exit'in route.steps[j+offset]);
  });
  form.button(box,'Add outcome '+(i+1)+' step',()=>structural('Add engine target step',t=>{const steps=t.routes[i].steps;steps.splice('exit'in steps.at(-1)!?steps.length-1:steps.length,0,response());}),route.steps.length>=64);
 });
 form.button(host,'Add conditional outcome',()=>structural('Add target outcome',t=>{t.routes.splice(t.routes.length-1,0,{if:firstCondition,steps:[response()]});}),!firstCondition||target.routes.length>=32);
}
import {ITEMS as importedItems} from '../scenes/kit';
