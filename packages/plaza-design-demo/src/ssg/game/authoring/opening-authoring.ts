import {renameSharedFlagDocuments} from './world-flag-references';
import {mountGameplayAuthoring} from './gameplay-authoring';
import {validateGameplay} from '../engine/gameplay/validation';
import {validatePendingNetwork} from './pending-network';
import {registryLabels} from '../engine/gameplay/rewards';
import {TypedForm} from './typed-form';
import type {WorkbenchContext,WorkbenchHandle} from './app';
import {validateOpeningSource,type OpeningSource,type OpeningState} from '../story/opening-source';
import {pendingRegistry} from './pending-registry';
import type {GameplayDefinition} from '../engine/gameplay/types';
export interface OpeningHomeDraft {scene:string;jackDevice:string;kind:'rest'|'use'|'exit';anchorId:string;offsetX:number}
/** One typed transaction moves the registered home roles; unrelated authored scene content stays explicit. */
export function relocateOpeningHome(source:OpeningSource,draft:OpeningHomeDraft):OpeningSource{
 const d=structuredClone(source),before=d.CONTROLLER.home,local=d.CONTROLLER.sleep.target,oldKey=before.scene+'/'+local,newKey=draft.scene+'/'+local;
 for(const rows of Object.values(d.OPENING_TARGETS)){if(!rows?.[oldKey])continue;if(oldKey!==newKey&&rows[newKey])throw new Error('A story target already owns '+newKey);const target=rows[oldKey];delete rows[oldKey];const {x:point,...rest}=target;rows[newKey]={...rest,bind:{kind:draft.kind,id:draft.anchorId,offsetX:draft.offsetX}};}
 for(const rows of Object.values(d.OPENING_PINGS)){const ping=rows?.[before.scene];if(!ping||!('story'in ping&&ping.story===local||'device'in ping&&ping.device===before.jackDevice))continue;if(before.scene!==draft.scene&&rows![draft.scene])throw new Error('Guidance already owns '+draft.scene);delete rows![before.scene];rows![draft.scene]='device'in ping?{device:draft.jackDevice}:{story:local};}
 d.CONTROLLER.home={scene:draft.scene,jackDevice:draft.jackDevice};return validateOpeningSource(d);
}
/** Native opening inputs use the normal typed source/history/Save path, never executable editor code. */
export function mountOpeningAuthoring(host:HTMLElement,context:WorkbenchContext):WorkbenchHandle{
 const api=context.authoring!,error=document.createElement('p'),body=document.createElement('div');error.setAttribute('role','alert');host.replaceChildren(error,body);let disposed=false,category='Controller',phase:OpeningState='home';const newScenes:Record<string,string>={};let homeDraft:OpeningHomeDraft|undefined;const targetDrafts=new Map<string,{kind:'rest'|'use'|'exit';id:string;offsetX:number}>();
 let workflowEditor:ReturnType<typeof mountGameplayAuthoring>|undefined,refreshMilestones:(()=>void)|undefined;
 const form=new TypedForm(e=>{error.textContent=String(e);}),phases=['home','flat','deleted','uplinked','free'] as const;
 const groups:Record<string,string[]>={Controller:['CONTROLLER'],Workflows:['WORKFLOWS','GAMEPLAY'],Phases:['PHASE_RULES','PHASES','OPENING','OPENING_LEVELS'],Timing:['IDLE_PING','HOME_RUN','TURNSTILE','SLEEP','MORNING'],Intros:['OPENING_INTRO'],Goals:['OPENING_GOAL'],Dialogue:['OPENING_LINES'],Interactions:['OPENING_EVERYDAY'],Exits:['OPENING_EXITS'],Targets:['OPENING_TARGETS'],Guidance:['OPENING_PINGS'],Clock:['OPENING_TIME'],Messages:['WAKE_LINES','MOTH_MESSAGE','UPLINK_LINES'],Deck:['DECK_BEFORE']};
 const read=()=>validateOpeningSource(api.get('opening-story').value),at=(d:any,path:(string|number)[])=>path.reduce((r,k)=>r[k],d);
 function edit(label:string,change:(d:OpeningSource)=>void){const d=read();change(d);api.edit('opening-story',label,d);render();}
 const set=(path:(string|number)[],value:unknown)=>edit('Edit opening '+path.join('/'),d=>{if(path.join('/')==='CONTROLLER/sleep/target'){const before=d.CONTROLLER.sleep.target,next=String(value);for(const rows of Object.values(d.OPENING_TARGETS)){for(const ref of Object.keys(rows??{})){const[scene,id]=ref.split('/');if(id!==before||next===before)continue;const renamed=scene+'/'+next;if(renamed in rows!)throw new Error('A story target already owns '+renamed);rows![renamed]=rows![ref];delete rows![ref];}}for(const rows of Object.values(d.OPENING_PINGS))for(const ping of Object.values(rows??{}))if('story'in ping&&ping.story===before)ping.story=next;d.CONTROLLER.sleep.target=next;}else at(d,path.slice(0,-1))[path.at(-1)!]=value;});
 const remove=(path:(string|number)[])=>edit('Remove opening '+path.join('/'),d=>{const owner=at(d,path.slice(0,-1));if(Array.isArray(owner))owner.splice(Number(path.at(-1)),1);else delete owner[path.at(-1)!];});
 function line(parent:HTMLElement,value:any[],path:(string|number)[]){const name=path.join(' ');form.text(parent,name+' input',value[0],v=>set([...path,0],v));form.text(parent,name+' response',value[1],v=>set([...path,1],v),true);form.select(parent,name+' tone',['','ok','err','dim'],value[2]??'',v=>edit('Edit opening line tone',d=>{const l=at(d,path);if(v)l[2]=v;else l.length=2;}));}
 function walk(parent:HTMLElement,value:any,path:(string|number)[]){const name=path.join(' '),key=path.at(-1);
  if(path[0]==='PHASE_RULES'&&path.length===1){
   const d=read(),doc:GameplayDefinition={version:1,flags:Object.values(d.OPENING),items:[],events:[],commands:{},reactions:[],conversations:{}};
   d.PHASE_RULES.forEach((row,i)=>{
    const fallback=row.when===undefined,box=form.section(parent,'Phase rule '+(i+1)+(fallback?' fallback':''));
    form.select(box,'Phase rule '+(i+1)+' phase',phases,row.phase,v=>set(['PHASE_RULES',i,'phase'],v));
    if(!fallback){
     form.condition(box,'Phase rule '+(i+1)+' condition',row.when,v=>set(['PHASE_RULES',i,'when'],v),doc,true,1);
     const move=(offset:number)=>edit('Move opening phase rule',d=>{const[row]=d.PHASE_RULES.splice(i,1);d.PHASE_RULES.splice(i+offset,0,row);});
     form.button(box,'Move phase rule '+(i+1)+' up',()=>move(-1),i===0);
     form.button(box,'Move phase rule '+(i+1)+' down',()=>move(1),i>=d.PHASE_RULES.length-2);
     form.button(box,'Remove phase rule '+(i+1),()=>remove(['PHASE_RULES',i]));
    }
   });
   form.button(parent,'Add opening phase rule',()=>edit('Add opening phase rule',d=>{d.PHASE_RULES.splice(d.PHASE_RULES.length-1,0,{when:{flag:d.OPENING.home},phase:'home'});}),d.PHASE_RULES.length>=32);return;
  }
  if(path[0]==='OPENING'){for(const[role,flag]of Object.entries(read().OPENING))form.text(parent,'Opening role '+role+' flag',flag,next=>{const documents=new Map(context.documents.map(d=>[d.id,api.get(d.id).value])),changes=renameSharedFlagDocuments(documents,flag,next);if(api.editDocuments)api.editDocuments(changes,'Rename opening role '+role);else if(changes.length===1)api.edit(changes[0].id,'Rename opening role '+role,changes[0].value);else throw Error('Grouped source editing is unavailable');render();});return;}
  if(path.join('/')==='CONTROLLER/home'){
   const d=read(),target=d.OPENING_TARGETS.flat![value.scene+'/'+d.CONTROLLER.sleep.target],binding=target.bind;
   homeDraft??={scene:value.scene,jackDevice:value.jackDevice,kind:binding?.kind??'rest',anchorId:binding?.id??'',offsetX:binding?.offsetX??0};const draft=homeDraft;
   const def=registry[draft.scene],devices=[...def?.data?.devices??[],...def?.data?.nodes??[]].map(d=>d.id),anchors=(draft.kind==='rest'?def?.rests:draft.kind==='use'?def?.uses:def?.exits)??[];
   form.select(parent,'Home draft scene',sceneIds,draft.scene,v=>{draft.scene=v;draft.jackDevice='';draft.anchorId='';render();});
   form.select(parent,'Home draft jack device',['',...devices],draft.jackDevice,v=>{draft.jackDevice=v;render();});
   form.select(parent,'Home draft anchor kind',['rest','use','exit'],draft.kind,v=>{draft.kind=v as OpeningHomeDraft['kind'];draft.anchorId='';render();});
   form.select(parent,'Home draft anchor',['',...anchors.map(a=>a.id)],draft.anchorId,v=>{draft.anchorId=v;render();});
   form.decimal(parent,'Home draft target offset',draft.offsetX,v=>{draft.offsetX=v;},-1000000);
   form.button(parent,'Apply opening home relocation',()=>{const updated=relocateOpeningHome(read(),draft);api.edit('opening-story','Relocate opening home',updated);homeDraft=undefined;render();},!devices.includes(draft.jackDevice)||!anchors.some(a=>a.id===draft.anchorId));
   form.button(parent,'Discard opening home draft',()=>{homeDraft=undefined;render();});return;
  }
  if(path[0]==='OPENING_TARGETS'&&path.length===3&&value&&typeof value==='object'){
   const scene=String(path[2]).split('/')[0],def=registry[scene],draft=targetDrafts.get(name)??{kind:value.bind?.kind??'rest',id:value.bind?.id??'',offsetX:value.bind?.offsetX??0};targetDrafts.set(name,draft);
   const anchors=(draft.kind==='rest'?def?.rests:draft.kind==='use'?def?.uses:def?.exits)??[];
   form.select(parent,name+' anchor kind',['rest','use','exit'],draft.kind,v=>{draft.kind=v as OpeningHomeDraft['kind'];draft.id='';render();});
   form.select(parent,name+' anchor',['',...anchors.map(a=>a.id)],draft.id,v=>{draft.id=v;render();});
   form.decimal(parent,name+' offsetX',draft.offsetX,v=>{draft.offsetX=v;},-1000000);
   form.button(parent,'Apply '+name+' binding',()=>edit('Bind opening target',d=>{const row=at(d,path);delete row.x;row.bind={...draft};}),!anchors.some(a=>a.id===draft.id));
   if(value.x!==undefined)form.decimal(parent,name+' x',value.x,v=>set([...path,'x'],v),-1000000);
   form.text(parent,name+' label',value.label,v=>set([...path,'label'],v));form.decimal(parent,name+' promptH',value.promptH,v=>set([...path,'promptH'],v),0,10000);return;
  }
  if(Array.isArray(value)){
   if(key==='say'||key==='line'){line(parent,value,path);return;}
   if(value.every(v=>typeof v==='string')&&key!=='act'&&key!=='flags'){
    form.text(parent,name,value.join('\n\n'),v=>set(path,v.split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean)),true);return;
   }
   value.forEach((v,i)=>{const box=form.section(parent,name+' '+(i+1));walk(box,v,[...path,i]);if(key!=='act'&&key!=='set')form.button(box,'Remove '+name+' '+(i+1),()=>remove([...path,i]));});
   if(key==='resume')form.button(parent,'Add '+name+' conditional rule',()=>edit('Add opening resume rule',d=>{at(d,path).unshift({whenFlag:d.OPENING.street,destination:{scene:d.CONTROLLER.fallback.scene}});}));
   if(path[0]==='OPENING_EVERYDAY'&&path.length===3)form.button(parent,'Add '+name+' interaction',()=>edit('Add opening interaction',d=>{at(d,path).push({label:'look',say:['','New response.']});}));
   if(path[0]==='OPENING_LEVELS')form.button(parent,'Add opening level',()=>edit('Add opening level',d=>{let i=1;while(d.OPENING_LEVELS.some(l=>l.id==='opening-level-'+i))i++;d.OPENING_LEVELS.push({id:'opening-level-'+i,name:'New opening level',flags:[d.OPENING.home]});}));
   return;
  }
  if(value&&typeof value==='object'){
   if(path.join('/')==='CONTROLLER/homeRun'){const note=document.createElement('p');note.textContent='The train-car scene comes from World / City & travel / Transport boarding.';parent.append(note);}
   const keys=Object.keys(value);
   if(path[0]==='OPENING_EXITS'&&path.length===3){const kind=['say','react','turnstile','concierge'].find(k=>k in value)!;form.select(parent,name+' handler',['say','react','turnstile','concierge'],kind,k=>{const initial=k==='say'?{say:{name:'YOU',pages:['Not yet.']}}:k==='react'?{react:[...(registry[String(path[2]).split('/')[0]]?.data?.devices??[]),...(registry[String(path[2]).split('/')[0]]?.data?.nodes??[])][0]?.id??'',line:['','New response.']}:{[k]:true};set(path,initial);});}
   if(path[0]==='OPENING_PINGS'&&path.length===3){const scene=String(path[2]),story=Object.keys(read().OPENING_TARGETS[path[1] as OpeningState]??{}).filter(k=>k.startsWith(scene+'/')),devices=[...(registry[scene]?.data?.devices??[]),...(registry[scene]?.data?.nodes??[])],exits=registry[scene]?.exits??[],kind=keys[0],kinds=[...(exits.some(e=>e.action==='out')?['door']:[]),...(exits.length?['exit']:[]),...(devices.length?['device']:[]),...(story.length?['story']:[])];form.select(parent,name+' target kind',kinds,kind,k=>set(path,k==='door'?{door:true}:k==='exit'?{exit:exits[0].id}:k==='device'?{device:devices[0].id}:{story:story[0].slice(scene.length+1)}));}
   if(path[0]==='OPENING_INTRO'&&path.length===3&&!value.touchPages)form.button(parent,'Add '+name+' touch pages',()=>set([...path,'touchPages'],[...value.pages]));
   if(path[0]==='OPENING_INTRO'&&path.length===3)form.check(parent,name+' consume scene intro',!!value.consume,v=>set([...path,'consume'],v));
   if(path[0]==='OPENING_LINES'&&path.length===3&&!value.name)form.button(parent,'Add '+name+' speaker',()=>set([...path,'name'],'YOU'));
   if(path[0]==='OPENING_EVERYDAY'&&path.length===4){for(const k of['fail','mail'])if(!(k in value))form.check(parent,name+' '+k,false,v=>{if(v)set([...path,k],true);});if(!value.say)form.button(parent,'Add '+name+' response',()=>set([...path,'say'],['','New response.']));const[scene,dev]=String(path[2]).split('/'),device=[...(registry[scene]?.data?.devices??[]),...(registry[scene]?.data?.nodes??[])].find(d=>d.id===dev),noun=device?.nouns.find(n=>n.verbs?.length);if(!value.act)form.button(parent,'Add '+name+' device verb',()=>set([...path,'act'],[noun!.id,noun!.verbs![0]]),!noun);const state=Object.keys(registry[scene]?.data?.state??{}).find(k=>typeof registry[scene].data!.state[k]==='boolean');if(!value.set)form.button(parent,'Add '+name+' state change',()=>set([...path,'set'],[state,true]),!state);for(const k of['say','act','set'])if(value[k])form.button(parent,'Remove '+name+' '+k,()=>remove([...path,k]));}
   if(path[0]==='PHASES'&&path.at(-2)==='resume'){form.select(parent,name+' condition flag',['',...Object.values(read().OPENING)],value.whenFlag??'',flag=>edit('Edit opening resume condition',d=>{const r=at(d,path);if(flag)r.whenFlag=flag;else delete r.whenFlag;}));}
   if('scene'in value&&keys.every(k=>['scene','entrance'].includes(k)))form.select(parent,name+' arrival',['',...(registry[value.scene]?.exits??[]).map(e=>e.id)],value.entrance??'',v=>{if(v)set([...path,'entrance'],v);else if(value.entrance!==undefined)remove([...path,'entrance']);});
   for(const k of keys){if(k==='entrance'&&'scene'in value&&keys.every(k=>['scene','entrance'].includes(k)))continue;if(k==='consume'&&path[0]==='OPENING_INTRO'||k==='whenFlag')continue;const box=value[k]&&typeof value[k]==='object'?form.section(parent,name+' '+k):parent;walk(box,value[k],[...path,k]);}
   if(path[0]==='OPENING_INTRO'&&path.length===3&&value.touchPages)form.button(parent,'Use desktop pages for '+name+' touch',()=>remove([...path,'touchPages']));
   return;
  }
  if(typeof value==='boolean'){if((path[0]==='OPENING_EXITS'&&(key==='turnstile'||key==='concierge'))){const p=document.createElement('p');p.textContent='Registered native '+String(key)+' handler';parent.append(p);}else form.check(parent,name,value,v=>set(path,v));}
  else if(typeof value==='number')form.decimal(parent,name,value,v=>set(path,v),key==='x'?-1000000:0,key==='rainThreshold'?1:1000000);
  else if(typeof value==='string'){
   if(key==='scene')form.select(parent,name,sceneIds,value,v=>edit('Edit opening destination',d=>{const r=at(d,path.slice(0,-1));r.scene=v;if('entrance'in r)delete r.entrance;}));
   else if(key==='entrance'){const owner=at(read(),path.slice(0,-1));form.select(parent,name,['',...(registry[owner.scene]?.exits??[]).map(e=>e.id)],value,v=>{if(v)set(path,v);else remove(path);});}
   else if(key==='phase')form.select(parent,name,phases,value,v=>set(path,v));
   else if(key==='whenFlag'||path.at(-2)==='flags')form.select(parent,name,Object.values(read().OPENING),value,v=>set(path,v));
   else form.text(parent,name,value,v=>set(path,v),String(key)==='received'||String(key)==='whoami'||path.includes('files'));
  }
 }
 let registry:ReturnType<typeof pendingRegistry>={},sceneIds:string[]=[];
 function render(){if(disposed)return;if(category==='Workflows'&&workflowEditor){refreshMilestones?.();workflowEditor.refresh();return;}workflowEditor?.dispose();workflowEditor=undefined;body.replaceChildren();const d=read();registry=pendingRegistry(new Map(context.documents.map(x=>[x.id,api.get(x.id).value])));sceneIds=Object.keys(registry);
  form.select(body,'Opening input group',Object.keys(groups),category,v=>{category=v;render();});
  if(category==='Workflows'){
   const milestones=form.section(body,'Cinematic milestones');
   refreshMilestones=()=>{milestones.replaceChildren();const current=read(),commands=Object.entries(current.GAMEPLAY.commands).filter(([,c])=>c.sources.length===1&&c.sources[0]==='system').map(([id])=>id);for(const[role,command]of Object.entries(current.WORKFLOWS))form.select(milestones,'Opening milestone '+role,commands,command,v=>set(['WORKFLOWS',role],v));};refreshMilestones();
   const host=document.createElement('div');body.append(host);const documents=()=>new Map(context.documents.map(x=>[x.id,api.get(x.id).value]));
   workflowEditor=mountGameplayAuthoring(host,{document:()=>read().GAMEPLAY,validate:validateGameplay,onEdit:(value,label)=>edit(label,d=>{d.GAMEPLAY=value;}),undo:()=>api.undo(),redo:()=>api.redo(),save:()=>api.save(),reload:()=>api.reload(),dirty:()=>api.dirty('opening-story'),saveLabel:'Save story',keyringIdsSource:()=>[...validatePendingNetwork(documents(),registry).keyring.keys()],registryLabelsSource:()=>registryLabels(validatePendingNetwork(documents(),registry).net)});return;
  }
  const tables=groups[category].filter(k=>k.startsWith('OPENING_')&&!['OPENING_LEVELS'].includes(k));
  if(tables.length){form.select(body,'Opening phase',phases,phase,v=>{phase=v as OpeningState;render();});for(const table of tables){const section=form.section(body,table),rows=(d as any)[table][phase]??{};for(const[key,row]of Object.entries(rows)){const box=form.section(section,key);walk(box,row,[table,phase,key]);form.button(box,'Remove '+table+' '+key,()=>remove([table,phase,key]));}
   let selectedScene=newScenes[table]??sceneIds[0],rowId='';form.select(section,'New '+table+' scene',sceneIds,selectedScene,v=>{selectedScene=v;newScenes[table]=v;if(table==='OPENING_TARGETS')render();});if(['OPENING_LINES','OPENING_EVERYDAY','OPENING_EXITS'].includes(table))form.text(section,'New '+table+' local ID',rowId,v=>{rowId=v;});
   form.button(section,'Add '+table+' row',()=>edit('Add opening '+table+' row',d=>{const compound=['OPENING_LINES','OPENING_EVERYDAY','OPENING_EXITS','OPENING_TARGETS'].includes(table),key=selectedScene+(compound?'/'+(table==='OPENING_TARGETS'?d.CONTROLLER.sleep.target:rowId):'');if(!rowId&&compound&&table!=='OPENING_TARGETS')throw new Error('A local entity ID is required');const root=(d as any)[table];root[phase]??={};if(key in root[phase])throw new Error('An opening row already exists');root[phase][key]=table==='OPENING_TIME'?'09:40':table==='OPENING_GOAL'?'New goal':table==='OPENING_INTRO'?{pages:['New arrival.'],speaker:'YOU',height:46}:table==='OPENING_LINES'?{pages:['New line.']}:table==='OPENING_EVERYDAY'?[{label:'look',say:['','New response.']}]:table==='OPENING_EXITS'?{say:{name:'YOU',pages:['Not yet.']}}:table==='OPENING_TARGETS'?{x:80,label:'[E] SLEEP',promptH:46}:(()=>{const scene=registry[selectedScene],device=scene?.data?.devices[0];if(scene?.exits.some(e=>e.action==='out'))return{door:true};if(device)return{device:device.id};if(scene?.exits.length)return{exit:scene.exits[0].id};throw new Error('This scene has no registered guidance anchor');})();}),table==='OPENING_TARGETS'&&!!rows[selectedScene+'/'+d.CONTROLLER.sleep.target]);
  }}else for(const key of groups[category]){const section=form.section(body,key);walk(section,(d as any)[key],[key]);}
 }
 render();const dispose=(()=>{disposed=true;workflowEditor?.dispose();workflowEditor=undefined;host.replaceChildren();})as WorkbenchHandle;dispose.refresh=render;return dispose;
}
