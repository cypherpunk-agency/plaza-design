import type {TypedForm} from './typed-form';
import type {SceneDocument} from '../engine/gameplay/scene-document';
import type {Action,LineRef,Value} from '../data/types';
import {ENGINE,KEYRING,LOGIC,NET} from '../data';
import {SCENES} from '../scenes';
import {contractOf} from '../engine/rules';
/** Typed controls over the same native actions used by device verbs. No executable editor callbacks. */
export function renderNativeTarget(form:TypedForm,host:HTMLElement,doc:SceneDocument,index:number,edit:(label:string,fn:(doc:SceneDocument)=>void)=>void){
 const target=doc.nativeTargets![index],scene=SCENES[doc.id as keyof typeof SCENES],data=scene.data!;
 const rules=typeof scene.rules==='function'?undefined:scene.rules,contract=rules?contractOf(rules):undefined;
 const labels=Object.entries({...ENGINE.texts,...data.texts}).filter(([,v])=>typeof v==='string').map(([k])=>k),lines=Object.entries({...ENGINE.texts,...data.texts}).filter(([,v])=>Array.isArray(v)).map(([k])=>k);
 const change=(label:string,fn:(t:typeof target)=>void)=>edit(label,d=>fn(d.nativeTargets![index]));
 const condition=(parent:HTMLElement,name:string,value:string|undefined,set:(value:string|undefined)=>void)=>form.text(parent,name,value??'',v=>set(v.trim()||undefined));
 const setCondition=(row:{if?:string},value:string|undefined)=>{if(value)row.if=value;else delete row.if;};
 form.number(host,'Prompt height',target.promptH,promptH=>change('Edit engine target height',t=>{t.promptH=promptH;}),0,10000);
 condition(host,'Visible while',target.if,value=>change('Edit engine target visibility',t=>setCondition(t,value)));
 const anchor=document.createElement('p');anchor.className='muted';anchor.textContent='Layout anchor: '+target.anchor+'. Conditions use the device grammar: key, !key, key=value.';host.append(anchor);
 target.labels.forEach((label,i)=>{const box=form.section(host,'Prompt '+(i+1));form.select(box,'Label reference',labels,label.text,text=>change('Edit target label',t=>{t.labels[i].text=text;}));if(i<target.labels.length-1)condition(box,'Label condition',label.if,value=>change('Edit label condition',t=>setCondition(t.labels[i],value)));});
 function lineEditor(parent:HTMLElement,line:LineRef,set:(line:LineRef)=>void){
  form.select(parent,'Response kind',['reference','inline'],typeof line==='string'?'reference':'inline',kind=>set(kind==='reference'?lines[0]:['','New response','dim']));
  if(typeof line==='string')form.select(parent,'Response reference',lines,line,set);
  else{form.text(parent,'Response command',line[0],cmd=>set([cmd,line[1],line[2]??'dim']));form.text(parent,'Response text',line[1],reply=>set([line[0],reply,line[2]??'dim']),true);form.select(parent,'Response tone',['ok','err','dim'],line[2]??'dim',tone=>set([line[0],line[1],tone as 'ok'|'err'|'dim']));}
 }
 function actionEditor(parent:HTMLElement,a:Action,set:(a:Action)=>void){
  const keys=Object.keys(data.state),goals=data.goals.map(g=>g.id),gifts=[...KEYRING.keys(),...LOGIC.modules.map(m=>m.id),...(NET.programs??[]).map(p=>p.id),'tokens'];
  condition(parent,'Action condition',a.if,value=>{const next={...a};setCondition(next,value);set(next);});
  form.check(parent,'Limit action to time window',!!a.when,on=>{const next={...a};if(on)next.when={from:'18:00',to:'06:00'};else delete next.when;set(next);});
  if(a.when){form.text(parent,'Action from',a.when.from,from=>set({...a,when:{...a.when!,from}}));form.text(parent,'Action to',a.when.to,to=>set({...a,when:{...a.when!,to}}));}
  const options=[...(keys.length?['set']:[]),...(goals.length?['goal']:[]),'give','take',...(contract?.effects.length?['effect']:[]),...(contract?.panels.length?['open']:[])];
  const kind='set'in a?'set':'goal'in a?'goal':'give'in a?'give':'take'in a?'take':'effect'in a?'effect':'open'in a?'open':'unseal';
  form.select(parent,'Action kind',[...new Set([...options,kind])],kind,k=>{const base={...(a.if?{if:a.if}:{}),...(a.when?{when:a.when}:{})};set(k==='set'?{...base,set:keys[0],to:data.state[keys[0]]}:k==='goal'?{...base,goal:goals[0]}:k==='give'?{...base,give:gifts[0]}:k==='take'?{...base,take:'tea'}:k==='effect'?{...base,effect:contract!.effects[0]}:{...base,open:contract!.panels[0]});});
  if('set'in a){form.select(parent,'State key',keys,a.set,key=>set({...a,set:key,to:data.state[key]}));const type=a.to===null?'null':typeof a.to;form.select(parent,'Value type',['string','number','boolean','null'],type,t=>set({...a,to:t==='string'?'':t==='number'?0:t==='boolean'?false:null}));const value=(to:Value)=>set({...a,to});if(typeof a.to==='boolean')form.check(parent,'Value',a.to,value);else if(typeof a.to==='number')form.number(parent,'Value',a.to,value,-1000000,1000000);else if(typeof a.to==='string')form.text(parent,'Value',a.to,value);}
  else if('goal'in a)form.select(parent,'Goal',goals,a.goal,goal=>set({...a,goal}));
  else if('give'in a){form.select(parent,'Grant',gifts,a.give,give=>{const next={...a,give};if(give==='tokens')next.count=1;else delete next.count;set(next);});if(a.give==='tokens')form.number(parent,'Token quantity',a.count??1,count=>set({...a,count}),1);}
  else if('take'in a){form.select(parent,'Carried item',Object.keys(importedItems),a.take,take=>set({...a,take}));form.number(parent,'Item quantity',a.count??1,count=>set({...a,count}),1);}
  else if('effect'in a)form.select(parent,'Effect',contract?.effects??[a.effect],a.effect,effect=>set({...a,effect}));
  else if('open'in a){form.select(parent,'Panel',contract?.panels??[a.open],a.open,open=>{const next={...a,open};delete next.with;set(next);});if(a.open==='talk')form.select(parent,'Dialogue',['',...Object.keys(data.dialogue)],a.with??'',withId=>{const next={...a};if(withId)next.with=withId;else delete next.with;set(next);});}
  else if('unseal'in a)form.text(parent,'Sector',a.unseal,unseal=>set({...a,unseal}));
 }
 target.routes.forEach((route,i)=>{const box=form.section(host,'Outcome '+(i+1));if(i<target.routes.length-1)condition(box,'Outcome condition',route.if,value=>change('Edit target outcome condition',t=>setCondition(t.routes[i],value)));
  route.steps.forEach((step,j)=>{const part=form.section(box,'Step '+(j+1));
   if('say'in step)lineEditor(part,step.say,say=>change('Edit engine response',t=>{t.routes[i].steps[j]={say};}));
   else if('exit'in step)form.select(part,'Leave through',(doc.exits??[]).filter(e=>e.engine).map(e=>e.id),step.exit,exit=>change('Edit target exit',t=>{t.routes[i].steps[j]={exit};}));
   else if('reset'in step){const note=document.createElement('p');note.textContent='Reset the scene’s devices, cables, trace and pending actions. Player inventory is preserved.';part.append(note);}
   else step.do.forEach((action,k)=>{const row=form.section(part,'Action '+(k+1));actionEditor(row,action,action=>change('Edit engine action',t=>{const s=t.routes[i].steps[j];if('do'in s)s.do[k]=action;}));});
  });
 });
}
import {ITEMS as importedItems} from '../scenes/kit';
