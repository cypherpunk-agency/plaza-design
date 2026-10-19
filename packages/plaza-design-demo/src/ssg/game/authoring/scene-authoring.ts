import {scenePresentationRoles,scenePresentationActorRoles} from '../engine/gameplay/scene-presentation';
import {renderScenePresentation} from './scene-presentation-authoring';
import {pendingScene} from './pending-scene';
import {emptyDeviceSource} from '../engine/empty-data';
import {projectSceneState} from '../engine/gameplay/scene-state';
import {deviceSourceIdentity} from './device-document-ids';
import {renderSceneCompanion} from './scene-companion-authoring';
import {COMPANION_GAMEPLAY} from '../engine/gameplay/companion-conversations';
import {SCENES} from '../scenes';
import {renderSceneEnvironment} from './scene-environment-authoring';
import {actorConversationId} from '../engine/gameplay/scene-conversations';
import {actorAxes} from '../engine/gameplay/actors';
import {actorBindingController} from '../engine/gameplay/native-actor-bindings';
import {addSceneActor,addSceneRider,addSceneStreetSprite} from '../engine/gameplay/actor-content';
import type {Composition} from '../art';
import {addManifestObjective,removeManifestObjective,addManifestTime,removeManifestTime} from '../engine/gameplay/manifest-milestones';
import {renderActor} from './actor-authoring';
import {renderManifestTarget,renderArtworkRoles,renderManifestWidth} from './manifest-target-authoring';
import {manifestCompositionRows} from '../engine/gameplay/manifest-geometry';
import {manifestGroups} from '../engine/gameplay/manifest-contract';
import {addManifestContent,removeManifestContent} from '../engine/gameplay/manifest-content';
import {addInteractionOutcome,removeInteractionOutcome,moveInteractionOutcome,setInteractionRotation,addCarriedInteraction} from './interaction-content';
import {pendingNetworkContext} from './pending-network';
import {pendingDestinations} from './pending-destinations';
import {gameplayScenes,gameplayScene} from './gameplay-scenes';
import {TypedForm} from './typed-form';
import {renderNativeTarget,renderNativeTargetCollection} from './native-target-authoring';
import type {WorkbenchContext,WorkbenchHandle} from './app';
import type {SceneDocument,InteractionRoute} from '../engine/gameplay/scene-document';

interface Entry {key:string;group:string;label:string;detail?:string;prefix?:string|RegExp;render(host:HTMLElement):void}
/**
 * Focused view for the Scene inspector: only the listed entry keys and/or groups, stacked as
 * collapsible sections without the index. `empty` is shown when nothing matches.
 */
export interface SceneLogicFocus {only?:readonly string[];groups?:readonly string[];empty?:string}
/** One part of the scene document at a time: a grouped list on the left, its fields on the right. */
export function mountSceneAuthoring(host:HTMLElement,context:WorkbenchContext,selection:{scene?:string;use?:string;item?:string;fixed?:boolean;focus?:SceneLogicFocus}={}):WorkbenchHandle {
 const api=context.authoring!,error=document.createElement('p'),body=document.createElement('section');error.setAttribute('role','alert');error.className='error';host.replaceChildren(error,body);let use=selection.use??'boss';
 const form=new TypedForm(e=>error.textContent=e instanceof Error?e.message:String(e)),focusOpen=new Map<string,boolean>();
 const selected=()=>gameplayScene(selection.scene??'harborShift',context.documents);
 const gameplay=()=>selected().validateGameplay(api.get(selected().gameplayId).value);
 const pendingDocuments=()=>new Map(context.documents.filter(row=>!row.id.startsWith('authored.')).map(row=>[row.id,api.get(row.id).value]));
 const targetContext=(source:unknown)=>{const documents=pendingDocuments(),identity=deviceSourceIdentity(selected().id),network=pendingNetworkContext(documents);return{scene:pendingScene(selected().id,documents.get(identity.composition),{sceneDocument:source,gameplay:gameplay(),devices:documents.get(identity.devices)},network),network};};
 const validate=(source:unknown)=>{if((source as SceneDocument)?.nativeTargets!==undefined){const assembled=targetContext(source);return selected().validateScene(source,gameplay(),{phase:'assembled',data:assembled.scene.data!,network:assembled.network});}return selected().validateScene(source,gameplay());};
 const doc=()=>validate(api.get(selected().prefix+'-scene').value);
 const edit=(label:string,fn:(d:SceneDocument)=>void)=>{const d=doc();fn(d);validate(d);error.textContent='';api.edit(selected().prefix+'-scene',label,d);};
 const actorTransaction=(label:string,fn:(source:SceneDocument,composition:Composition)=>void)=>{if(!api.editDocuments)throw new Error('Actor editing requires grouped source history');const s=doc(),c=api.get(selected().prefix).value as Composition;fn(s,c);api.editDocuments([{id:selected().prefix,value:c},{id:selected().prefix+'-scene',value:s}],label);};
 const note=(parent:HTMLElement,text:string)=>{const p=document.createElement('p');p.className='muted';p.textContent=text;parent.append(p);};
 const pages=(v:string)=>v.split(/\n\s*\n/).filter(Boolean);
 function refresh(){body.replaceChildren();if(!selection.fixed)form.select(body,'Logic scene',gameplayScenes.map(s=>s.id),selected().id,id=>{selection.scene=id;selection.use=undefined;selection.item=undefined;use='';refresh();});const d=doc(),g=gameplay(),destinations=d.manifest?pendingDestinations(new Map(context.documents.filter(row=>!row.id.startsWith('authored.')).map(row=>[row.id,api.get(row.id).value]))):{};if(!d.uses.some(u=>u.id===use))use=d.uses[0]?.id??'';selection.use=use;
  form.objectiveIds=d.objectives?.map(o=>o.id)??[];
  const keys=[...pendingNetworkContext(new Map(context.documents.filter(row=>!row.id.startsWith('authored.')).map(row=>[row.id,api.get(row.id).value]))).keyring.keys()];
  const entries:Entry[]=[];
  entries.push({key:'environment',group:'Scene',label:'Environment',render:h=>{note(h,'These overrides control the same native lighting and weather in the game and preview. Omitted values follow the registered artwork or controller.');renderSceneEnvironment(form,h,d.environment,(label,change)=>edit(label,d=>{change(d.environment??={});}),refresh,d.id);}});
  if(Object.prototype.hasOwnProperty.call(scenePresentationRoles,d.id))entries.push({key:'presentation',group:'Scene',label:scenePresentationActorRoles[d.id as keyof typeof scenePresentationRoles]?'Actor presentation':'Visual flag bindings',render:h=>renderScenePresentation(form,h,d,g,edit,refresh)});
  if(d.manifest)entries.push({key:'companion',group:'Scene',label:'Companion',render:h=>{const rows=manifestCompositionRows(api.get(selected().prefix).value as Composition),deviceId=deviceSourceIdentity(d.id).devices,native=projectSceneState(context.documents.some(row=>row.id===deviceId)?api.get(deviceId).value as import('../data').SceneData:SCENES[d.id]?.data??emptyDeviceSource(d.id,d.name),g),library=context.documents.some(row=>row.id==='companion-gameplay')?api.get('companion-gameplay').value as import('../engine/gameplay/types').GameplayDefinition:COMPANION_GAMEPLAY;renderSceneCompanion(form,h,d,rows,Object.entries(native?.state??{}).filter(([,v])=>typeof v==='string').map(([k])=>k),Object.keys({...library.conversations,...g.conversations}),g,edit,refresh);}});
  const mutableActors=!!actorBindingController(d.id)?.mutable&&!!api.editDocuments;
  if(mutableActors)entries.push({key:'actor-collection',group:'Scene',label:'Actor collection',render:h=>{let id='actor-1',n=1;while(d.actors?.some(a=>a.id===id))id='actor-'+(++n);let family='human',x=180,height=0,dialogue=true;
   note(h,'Create the actor and its artwork together. Position can be changed here, in Layout or by attaching its placement to an artwork anchor.');
   form.text(h,'New actor ID',id,value=>{id=value;});form.select(h,'New actor family',['human',...(actorBindingController(d.id)?.element==='actor.prepared'?['rider','streetSprite']:[]),...actorAxes.critter,...actorAxes.bot],family,value=>{family=value;});form.decimal(h,'New actor X',x,value=>{x=value;},-10000,10000);form.decimal(h,'New actor height',height,value=>{height=value;},-10000,10000);form.check(h,'New actor has conversation',dialogue,value=>{dialogue=value;});
   form.button(h,'Add actor',()=>{actorTransaction('Add actor',(s,c)=>family==='streetSprite'?addSceneStreetSprite(s,c,id,{kind:'streetSprite',sprite:'hood'},x,height,dialogue):family==='rider'?addSceneRider(s,c,id,{kind:'rider',rider:'phone',phase:0},x,height,dialogue):addSceneActor(s,c,id,family==='human'?{}:family as import('../runtime/characters').Character['look'],x,height,dialogue));selection.item='actor:'+id;refresh();},(d.actors?.length??0)>=128);
  }});
  d.actors?.forEach((a,i)=>entries.push({key:'actor:'+a.id,group:'Actors',label:a.id,detail:a.band,render:h=>renderActor(form,h,d,i,edit,refresh,mutableActors?{composition:api.get(selected().prefix).value as Composition,transaction:actorTransaction}:undefined)}));
  if(d.manifest)entries.push({key:'manifest',group:'Scene',label:'Content & bindings',render:h=>{
   const composition=api.get(selected().prefix).value as import('../art').Composition,instances:import('../art').Instance[]=[];
   const walk=(nodes:typeof composition.instances)=>{for(const n of nodes){instances.push(n);walk(n.children??[]);}};walk(composition.instances);
   const ids=instances.map(n=>n.id),rows=manifestCompositionRows(composition),registration=selected(),groups='bindingGroups'in registration?registration.bindingGroups:manifestGroups;
   renderManifestWidth(form,h,d.manifest!.width,rows,width=>edit('Edit scene width binding',d=>{d.manifest!.width=width;}));
   renderArtworkRoles(form,h,d.id,d.manifest!,rows,(role,instance)=>edit('Rebind scene '+role,d=>{if(instance)(d.manifest!.artwork??={})[role]=instance;else if(d.manifest!.artwork)delete d.manifest!.artwork[role];}));
   renderManifestTarget(form,h,'Spawn',d.manifest!.spawn,rows,target=>edit('Edit manifest spawn',d=>{d.manifest!.spawn=target;}),undefined,'none');
   for(const group of groups){const box=form.section(h,group.charAt(0).toUpperCase()+group.slice(1)),choices=group==='people'?instances.filter(n=>n.type==='character.resident'&&n.pass==='people').map(n=>n.id):ids;
    for(const row of d[group]??[]){renderManifestTarget(form,box,group+' '+row.id,d.manifest![group]![row.id],rows,target=>edit('Bind '+group+' artwork',d=>{d.manifest![group]![row.id]=target;}),choices,group==='people'?'none':group==='exits'||group==='rests'?'prompt':'both');
     form.button(box,'Remove '+group+' '+row.id,()=>{edit('Remove '+group,d=>removeManifestContent(d,group,row.id));refresh();});}
    let id='',instance=choices[0]??'';
    form.text(box,'New '+group+' ID',id,value=>{id=value;});form.select(box,'New '+group+' artwork',choices,instance,value=>{instance=value;});
    form.button(box,'Add '+group,()=>{edit('Add '+group,d=>addManifestContent(d,group,id,instance));refresh();},!choices.length||(d[group]?.length??0)>=32);
    if(!choices.length)note(box,'Add an authored person, animal or robot through Layout first.');
   }
   note(h,'Bindings use artwork positions. Removing content keeps its artwork; Layout manages artwork separately.');
  }});

  if(d.manifest)entries.push({key:'milestones',group:'Scene',label:'Goals & time',render:h=>{
   note(h,'The last entry is the fallback. New entries are inserted before it; set their flag condition before relying on progression. Removing the fallback makes the preceding entry the new fallback. Removing all entries restores the scene’s default goal/time behavior.');
   const goals=form.section(h,'Objectives');
   for(const [i,goal]of(d.objectives??[]).entries()){note(goals,(i+1)+'. '+goal.text+(i===d.objectives!.length-1?' (fallback)':''));form.button(goals,'Remove objective '+(i+1),()=>{edit('Remove objective',d=>removeManifestObjective(d,i));refresh();});}
   form.button(goals,'Add objective',()=>{edit('Add objective',d=>{addManifestObjective(d);});refresh();},(d.objectives?.length??0)>=32);
   const time=form.section(h,'Story clock');
   for(const [i,m]of(d.time??[]).entries()){note(time,(i+1)+'. minute '+m.minute+(i===d.time!.length-1?' (fallback)':''));form.button(time,'Remove story time '+(i+1),()=>{edit('Remove story time',d=>removeManifestTime(d,i));refresh();});}
   form.button(time,'Add story time',()=>{edit('Add story time',d=>addManifestTime(d));refresh();},(d.time?.length??0)>=32);
  }});
  entries.push({key:'arrival',group:'Scene',label:'Arrival',detail:d.name,render:h=>{form.text(h,'Scene name',d.name,name=>edit('Rename scene',d=>{d.name=name;}));form.text(h,'Arrival pages',d.intro.join('\n\n'),v=>edit('Edit scene arrival',d=>{d.intro=pages(v);}),true);form.check(h,'Separate touch arrival',!!d.introTouch,on=>{edit('Set touch arrival',d=>{if(on)d.introTouch=d.intro.length?[...d.intro]:['New arrival.'];else delete d.introTouch;});refresh();});if(d.introTouch)form.text(h,'Touch arrival pages',d.introTouch.join('\n\n'),v=>edit('Edit touch arrival',d=>{d.introTouch=pages(v);}),true);note(h,'Separate pages with a blank line.');}});
  const cueTargets=SCENES[d.id]?.presentationTargets??[];
  if(cueTargets.length)entries.push({key:'presentation-cues',group:'Scene',label:'Presentation cues',render:h=>{
   const next=cueTargets.flatMap(target=>g.events.map(event=>({event,target}))).find(pair=>!d.cues?.some(cue=>cue.event===pair.event&&cue.target===pair.target));
   note(h,'Make registered artwork react to a gameplay event. Edit the event and artwork on each cue.');
   form.button(h,'Add presentation cue',()=>{if(!next)throw Error('Declare another gameplay event before adding a cue');const index=d.cues?.length??0;edit('Add presentation cue',d=>{d.cues??=[];d.cues.push(next);});selection.item='cue:'+index;focusOpen.set('cue:'+index,true);refresh();},!next||(d.cues?.length??0)>=32);
  }});
  d.cues?.forEach((cue,i)=>entries.push({key:'cue:'+i,group:'Presentation cues',label:cue.target,detail:cue.event,render:h=>{
   form.select(h,'Trigger event',g.events,cue.event,event=>edit('Edit presentation event',d=>{d.cues![i].event=event;}));
   form.select(h,'Cue artwork',cueTargets,cue.target,target=>edit('Edit presentation artwork',d=>{d.cues![i].target=target;}));
   form.button(h,'Remove presentation cue',()=>{edit('Remove presentation cue',d=>{d.cues!.splice(i,1);});selection.item='presentation-cues';refresh();});
  }}));
  if(SCENES[d.id]?.nativeTargetBindings)entries.push({key:'native-target-collection',group:'Engine targets',label:'Target collection',render:h=>renderNativeTargetCollection(form,h,d,edit,targetContext(d),refresh)});
  d.nativeTargets?.forEach((target,i)=>entries.push({key:'target:'+target.id,group:'Engine targets',label:target.id,detail:target.anchor,render:h=>renderNativeTarget(form,h,d,i,edit,targetContext(d),id=>{if(id)selection.item='target:'+id;refresh();})}));
  if(d.id==='harborShift'||d.timeDay)entries.push({key:'time-day',group:'Scene',label:'Story day',render:h=>{d.timeDay?.forEach((t,i)=>{form.number(h,'Day rule '+(i+1)+' day',t.day,day=>edit('Edit story day',d=>{d.timeDay![i].day=day;}),1,10000);if(i<d.timeDay!.length-1)form.condition(h,'Day rule '+(i+1)+' condition',t.when,when=>edit('Edit story day condition',d=>{d.timeDay![i].when=when??{tokensAtLeast:0};}),g,true);form.button(h,'Remove day rule '+(i+1),()=>{edit('Remove story day',d=>{d.timeDay!.splice(i,1);if(!d.timeDay!.length)delete d.timeDay;});refresh();});});form.button(h,'Add story day',()=>{edit('Add story day',d=>{if(!d.timeDay)d.timeDay=[{day:1}];else d.timeDay.splice(d.timeDay.length-1,0,{when:g.flags.length?{flag:g.flags[0]}:{all:[]},day:1});});refresh();},(d.timeDay?.length??0)>=32);}});
  if(d.time?.length)entries.push({key:'time',group:'Scene',label:'Story clock',detail:d.time.length+' milestones',render:h=>{d.time!.forEach((t,i)=>{form.number(h,'Time '+(i+1)+' minute',t.minute,minute=>edit('Edit story time',d=>{d.time![i].minute=minute;}),0,1439);if(i<d.time!.length-1)form.condition(h,'Time '+(i+1)+' condition',t.when,when=>edit('Edit story time condition',d=>{if(when)d.time![i].when=when;else delete d.time![i].when;}),g,true);});}});
  d.objectives?.forEach((goal,i)=>{const name='Objective '+(i+1);entries.push({key:'objective:'+i,group:'Objectives',label:(i+1)+'. '+goal.text,prefix:name+' ',render:h=>{
   form.text(h,name+' text',goal.text,text=>edit('Edit objective',d=>{d.objectives![i].text=text;}),true);
   form.select(h,name+' target',['',...d.uses.map(u=>u.id)],goal.target??'',target=>edit('Edit guidance',d=>{if(target)d.objectives![i].target=target;else delete d.objectives![i].target;}));
   form.check(h,name+' gentle',!!goal.gentle,gentle=>edit('Edit guidance urgency',d=>{d.objectives![i].gentle=gentle;}));
   if(i<d.objectives!.length-1){form.allowObjectiveContext=false;form.condition(h,name+' condition',goal.when,when=>edit('Edit objective condition',d=>{if(when)d.objectives![i].when=when;else delete d.objectives![i].when;}),g,false);form.allowObjectiveContext=true;}else note(h,'The last objective applies once the earlier ones are complete.');}});});
  for(const u of d.uses)entries.push({key:'use:'+u.id,group:'Interactions',label:u.name||u.id,detail:u.id,prefix:/^(Interaction |Use route \d+ |Item \d+ route \d+ |Carried item \d+ )/,render:h=>{const uid=u.id;use=u.id;selection.use=u.id;
   if(u.promptH!==undefined)form.number(h,'Interaction prompt height',u.promptH,height=>edit('Edit interaction prompt height',d=>{d.uses.find(v=>v.id===uid)!.promptH=height;}),0,10000);if(u.h!==undefined)form.number(h,'Interaction response height',u.h,height=>edit('Edit interaction response height',d=>{d.uses.find(v=>v.id===uid)!.h=height;}),0,10000);
   form.select(h,'Interaction purchase',['',...Object.keys(g.purchases??{})],u.purchase??'',purchase=>{edit('Bind interaction purchase',d=>{const row=d.uses.find(v=>v.id===uid)!;if(purchase){row.purchase=purchase;delete row.price;}else delete row.purchase;});refresh();});
   if(u.purchase)note(h,'The prompt quotes this shared purchase. Choose an outcome command that performs the same purchase to charge it. Edit its goods and price in Commands & dialogue.');
   if(!u.purchase){form.check(h,'Interaction fixed displayed price',u.price!==undefined,on=>{edit('Set displayed price',d=>{const row=d.uses.find(v=>v.id===uid)!;if(on)row.price=0;else delete row.price;});refresh();});if(u.price!==undefined){form.number(h,'Displayed price',u.price,price=>edit('Edit interaction price',d=>{d.uses.find(u=>u.id===uid)!.price=price;}));note(h,'Displayed price labels the prompt. Set the actual charge in Commands & dialogue.');}}
   form.check(h,'Interaction rotating outcomes',!!u.cycle,on=>{edit('Set interaction rotation',d=>setInteractionRotation(d.uses.find(v=>v.id===uid)!,on));refresh();});
   note(h,u.cycle?'Turning rotation off creates always-matching conditions before the final fallback; edit these conditions to choose the desired order.':'Rotation requires command/page outcomes with no conditions or conversations. The final ordered outcome is the fallback and stays last.');
   if(u.cycle){note(h,'Rotating outcomes advance after successful actions. Choose a numeric state advanced by these outcome commands to keep this position across sessions.');form.select(h,'Interaction rotation state',['',...Object.entries(g.state??{}).filter(([,v])=>v.type==='number').map(([id])=>id)],u.cycleState??'',id=>edit('Bind interaction rotation state',d=>{const row=d.uses.find(v=>v.id===uid)!;if(id)row.cycleState=id;else delete row.cycleState;}));}
   form.select(h,'Interaction target order',['after-devices','before-devices'],u.targetOrder??'after-devices',value=>edit('Edit interaction target order',d=>{d.uses.find(v=>v.id===uid)!.targetOrder=value as 'after-devices'|'before-devices';}));
   form.text(h,'Priced prompt label',u.pricedLabel??'',value=>edit('Edit priced interaction label',d=>{const row=d.uses.find(v=>v.id===uid)!;if(value)row.pricedLabel=value;else delete row.pricedLabel;}));
   form.select(h,'Conversation presentation',['panel','bubble'],u.conversationPresentation??'panel',value=>edit('Edit interaction conversation presentation',d=>{d.uses.find(v=>v.id===uid)!.conversationPresentation=value as 'panel'|'bubble';}));
   form.select(h,'Interaction speaker type',['character','device','system'],u.speakerKind??'character',kind=>edit('Edit interaction source',d=>{d.uses.find(v=>v.id===uid)!.speakerKind=kind as 'character'|'device'|'system';}));
   form.text(h,'Interaction name',u.name,name=>edit('Edit interaction speaker',d=>{d.uses.find(u=>u.id===uid)!.name=name;}));form.text(h,'Interaction prompt',u.label,label=>edit('Edit interaction prompt',d=>{d.uses.find(u=>u.id===uid)!.label=label;}));form.condition(h,'Interaction availability',u.when,when=>edit('Edit interaction availability',d=>{const u=d.uses.find(u=>u.id===uid)!;if(when)u.when=when;else delete u.when;}),g,true);
  const access=form.section(h,'Access requirements');
  u.access?.forEach((rule,i)=>{const change=(fn:(r:NonNullable<typeof u.access>[number])=>void)=>edit('Edit interaction access',d=>fn(d.uses.find(v=>v.id===uid)!.access![i]));form.select(access,'Access '+(i+1)+' command',['',...Object.entries(g.commands).filter(([,c])=>c.sources.includes('interaction')).map(([id])=>id)],rule.command??'',command=>change(r=>{if(command)r.command=command;else delete r.command;if(!r.command&&!r.when)r.when={all:[]};}));form.condition(access,'Access '+(i+1)+' condition',rule.when,when=>change(r=>{if(when)r.when=when;else r.when={all:[]};}),g);form.check(access,'Access '+(i+1)+' hide while refused',!!rule.hidden,hidden=>change(r=>{r.hidden=hidden;}));form.text(access,'Access '+(i+1)+' refusal',rule.reason,reason=>change(r=>{r.reason=reason;}));form.button(access,'Remove access '+(i+1),()=>edit('Remove access requirement',d=>{d.uses.find(v=>v.id===uid)!.access!.splice(i,1);}));});
  form.button(access,'Add access requirement',()=>edit('Add access requirement',d=>{const row=d.uses.find(v=>v.id===uid)!;(row.access??=[]).push({when:{all:[]},reason:'This action is not available yet.'});}), (u.access?.length??0)>=32);
   const routes=(parent:HTMLElement,name:string,rows:InteractionRoute[],get:(d:SceneDocument)=>InteractionRoute[],rotating=false)=>{rows.forEach((r,i)=>{const row=form.section(parent,(name==='Use'?'Outcome ':name+' outcome ')+(i+1)+(r.conversation?' · '+r.conversation:r.command?' · '+r.command:'')),change=(fn:(r:InteractionRoute)=>void)=>edit('Edit interaction route',d=>fn(get(d)[i]));if(!rotating&&i<rows.length-1)form.condition(row,name+' route '+(i+1)+' condition',r.when,when=>change(r=>{r.when=when??{tokensAtLeast:0};}),g);
    if(!rotating)form.select(row,name+' route '+(i+1)+' conversation',['',...Object.keys(g.conversations)],r.conversation??'',conversation=>change(r=>{if(conversation){r.conversation=conversation;delete r.command;delete r.pages;delete r.failure;delete r.template;delete r.speaker;}else{delete r.conversation;r.pages=['Nothing happens.'];}}));
    if(!r.conversation){form.text(row,name+' route '+(i+1)+' speaker override',r.speaker??'',speaker=>change(r=>{if(speaker.trim())r.speaker=speaker;else delete r.speaker;}));form.check(row,name+' route '+(i+1)+' text templates',!!r.template,on=>change(r=>{if(on)r.template=true;else delete r.template;}));if(r.template)note(row,'Read-only fields: {tokens}, {item:ID}, {state:ID}.');form.select(row,name+' route '+(i+1)+' command',['',...Object.entries(g.commands).filter(([,c])=>c.sources.includes('interaction')).map(([id])=>id)],r.command??'',command=>change(r=>{if(command)r.command=command;else{delete r.command;delete r.failure;}}));form.text(row,name+' route '+(i+1)+' pages',(r.pages??[]).join('\n\n'),v=>change(r=>{r.pages=pages(v);}),true);if(r.command)form.text(row,name+' route '+(i+1)+' failure',(r.failure??[]).join('\n\n'),v=>change(r=>{if(v.trim())r.failure=pages(v);else delete r.failure;}),true);}
    form.button(row,'Remove '+name+' outcome '+(i+1),()=>{edit('Remove interaction outcome',d=>removeInteractionOutcome(get(d),i,rotating));refresh();},rows.length<=1);
    const limit=rows.length-(rotating?0:1);for(const[direction,label]of [[-1,'up'],[1,'down']]as const)form.button(row,'Move '+name+' outcome '+(i+1)+' '+label,()=>{edit('Reorder interaction outcomes',d=>moveInteractionOutcome(get(d),i,direction,rotating));refresh();},i>=limit||i+direction<0||i+direction>=limit);
   });form.button(parent,'Add '+name+' outcome',()=>{edit('Add interaction outcome',d=>addInteractionOutcome(get(d),rotating));refresh();},rows.length>=32);};
   const heading=document.createElement('h3');heading.textContent=u.cycle?'Outcomes, in rotation':'Outcomes, first match wins';h.append(heading);
   routes(h,'Use',u.routes,d=>d.uses.find(u=>u.id===uid)!.routes,!!u.cycle);
   u.items?.forEach((item,i)=>{const row=form.section(h,'With carried item '+item.item);form.select(row,'Carried item '+(i+1)+' ID',g.items.filter(id=>id===item.item||!u.items?.some(r=>r.item===id)),item.item,id=>edit('Edit carried-item interaction',d=>{d.uses.find(u=>u.id===uid)!.items![i].item=id;}));form.text(row,'Carried item '+(i+1)+' label',item.label,label=>edit('Edit carried-item label',d=>{d.uses.find(u=>u.id===uid)!.items![i].label=label;}));routes(row,'Item '+(i+1),item.routes,d=>d.uses.find(u=>u.id===uid)!.items![i].routes);form.button(row,'Remove carried item '+(i+1),()=>{edit('Remove carried-item interaction',d=>{const use=d.uses.find(v=>v.id===uid)!;use.items!.splice(i,1);if(!use.items!.length)delete use.items;});refresh();});});
   const availableItems=g.items.filter(id=>!u.items?.some(r=>r.item===id));let newItem=availableItems[0]??'';form.select(h,'New carried item',availableItems,newItem,id=>{newItem=id;});form.button(h,'Add carried-item interaction',()=>{edit('Add carried-item interaction',d=>addCarriedInteraction(d.uses.find(v=>v.id===uid)!,newItem));refresh();},!availableItems.length||(u.items?.length??0)>=2);
  }});
  d.people?.forEach((p,i)=>entries.push({key:'person:'+p.id,group:'People',label:p.name||p.id,detail:p.conversation??p.talk!.length+' conversations',prefix:'Person '+p.id+' ',render:h=>{
   const change=(label:string,fn:(p:NonNullable<SceneDocument['people']>[number])=>void)=>edit(label,d=>fn(d.people![i]));
   form.text(h,'Person '+p.id+' name',p.name,name=>change('Edit person name',p=>{p.name=name;}));
   const graphs=Object.keys(g.conversations);
   form.select(h,'Person '+p.id+' dialogue source',[...(!g.conversations[actorConversationId(d.id,p.id)]?['pages']:[]),...(graphs.length?['graph']:[])],p.conversation?'graph':'pages',mode=>edit('Change person dialogue source',d=>{const previous=d.people![i];d.people![i]=mode==='graph'?{id:previous.id,name:previous.name,conversation:graphs[0]}:{id:previous.id,name:previous.name,talk:[['Hello.']]};}));
   if(p.conversation!==undefined){form.select(h,'Person '+p.id+' conversation',graphs,p.conversation,conversation=>edit('Bind person conversation',d=>{d.people![i]={id:p.id,name:p.name,conversation};}));note(h,'This person uses the existing graph in Commands & dialogue. Its pages, choices and saved progress belong to that graph.');return;}
   form.select(h,'Person '+p.id+' repetition',['last','cycle'],p.repeat??'last',repeat=>change('Edit conversation repetition',p=>{p.repeat=repeat as 'last'|'cycle';}));
   note(h,'“last” repeats the final conversation; “cycle” starts again from the first.');
   p.talk.forEach((talk,j)=>{form.text(h,'Person '+p.id+' dialogue '+(j+1),talk.join('\n\n'),v=>change('Edit person dialogue',p=>{p.talk![j]=pages(v);}),true);if(p.talk.length>1)form.button(h,'Remove dialogue '+(j+1),()=>change('Remove person dialogue',p=>{p.talk!.splice(j,1);}));});
   form.button(h,'Add dialogue',()=>change('Add person dialogue',p=>{p.talk!.push(['New conversation']);}),p.talk.length>=32);
   p.lines?.forEach((line,j)=>{const box=form.section(h,'Contextual response '+(j+1)),prefix='Person '+p.id+' response '+(j+1);
    form.text(box,prefix+' pages',line.pages.join('\n\n'),text=>change('Edit contextual response',p=>{p.lines![j].pages=pages(text);}),true);
    const condition=line.condition??{all:[...(line.when?[{time:line.when}]:[]),...(line.weather?[{weather:line.weather}]:[])]};
    form.condition(box,prefix+' condition',condition,condition=>change('Edit response condition',p=>{const row=p.lines![j];delete row.when;delete row.weather;if(condition)row.condition=condition;else delete row.condition;}),g);
    form.button(box,'Remove contextual response '+(j+1),()=>change('Remove contextual response',p=>{p.lines!.splice(j,1);if(!p.lines!.length)delete p.lines;}));
   });
   form.button(h,'Add contextual response',()=>change('Add contextual response',p=>{(p.lines??=[]).push({condition:{weather:['rain']},pages:['New contextual response']});}),(p.lines?.length??0)>=32);
  }}));
  d.readables?.forEach((r,i)=>entries.push({key:'readable:'+r.id,group:'Readables',label:r.name||r.id,detail:r.id,prefix:'Readable '+r.id+' ',render:h=>{form.text(h,'Readable '+r.id+' name',r.name,name=>edit('Edit readable speaker',d=>{d.readables![i].name=name;}));if(r.promptH!==undefined)form.number(h,'Readable '+r.id+' prompt height',r.promptH,height=>edit('Edit readable prompt height',d=>{d.readables![i].promptH=height;}),0,10000);form.text(h,'Readable '+r.id+' pages',r.pages.join('\n\n'),v=>edit('Edit readable pages',d=>{d.readables![i].pages=pages(v);}),true);}}));
  d.rests?.forEach((r,i)=>entries.push({key:'rest:'+r.id,group:'Resting places',label:r.id,render:h=>{
   form.select(h,'Rest '+r.id+' kind',['bench','stool','bed'],r.kind,kind=>edit('Edit rest kind',d=>{d.rests![i].kind=kind as 'bench'|'stool'|'bed';}));
   form.number(h,'Rest '+r.id+' prompt height',r.promptH??60,height=>edit('Edit rest prompt height',d=>{d.rests![i].promptH=height;}),0,10000);
  }}));
  d.exits?.forEach((e,i)=>entries.push({key:'exit:'+e.id,group:'Exits',label:e.label||e.id,detail:'→ '+e.to,prefix:'Exit '+e.id+' ',render:h=>{form.text(h,'Exit '+e.id+' prompt',e.label,label=>edit('Edit exit prompt',d=>{d.exits![i].label=label;}));if(e.promptH!==undefined)form.number(h,'Exit '+e.id+' prompt height',e.promptH,height=>edit('Edit exit prompt height',d=>{d.exits![i].promptH=height;}),0,10000);
   form.select(h,'Exit '+e.id+' required flag',['',...g.flags],e.requires??'',flag=>edit('Edit exit flag',d=>{if(flag)d.exits![i].requires=flag;else delete d.exits![i].requires;}));
   form.check(h,'Exit '+e.id+' key required',!!e.needs,on=>edit('Edit exit key requirement',d=>{if(on){if(!keys.length)throw Error('Create a key in Network before requiring it here');d.exits![i].needs={key:keys[0],name:'DOOR',pages:['Present a key.'],h:52};}else delete d.exits![i].needs;}));
   if(e.needs){form.select(h,'Exit '+e.id+' key',keys,e.needs.key,key=>edit('Edit exit key',d=>{d.exits![i].needs!.key=key;}));form.text(h,'Exit '+e.id+' refusal speaker',e.needs.name,name=>edit('Edit exit refusal source',d=>{d.exits![i].needs!.name=name;}));form.text(h,'Exit '+e.id+' refusal pages',e.needs.pages.join('\n\n'),text=>edit('Edit exit refusal',d=>{d.exits![i].needs!.pages=pages(text);}),true);form.number(h,'Exit '+e.id+' refusal height',e.needs.h,height=>edit('Edit exit refusal height',d=>{d.exits![i].needs!.h=height;}),0,10000);}
   if(d.manifest){form.select(h,'Exit '+e.id+' destination',Object.keys(destinations),e.to,to=>{edit('Edit exit destination',d=>{d.exits![i].to=to;delete d.exits![i].at;});refresh();});form.select(h,'Exit '+e.id+' arrival',['',...(e.to===d.id?(d.exits??[]).map(row=>row.id):destinations[e.to]??[])],e.at??'',at=>edit('Edit exit arrival',d=>{if(at)d.exits![i].at=at;else delete d.exits![i].at;}));}else note(h,'Destination: '+e.to+(e.at?' / '+e.at:'')+' (protected)');}}));
  if(selection.focus){const focus=selection.focus,shown=entries.filter(e=>focus.only?.includes(e.key)||focus.groups?.includes(e.group));
   if(!shown.length){note(body,focus.empty??'Nothing in this scene’s logic refers to this.');return;}
   for(const entry of shown){const box=document.createElement('details'),summary=document.createElement('summary'),detail=document.createElement('div');box.className='inspector-section';detail.className='logic-detail';
    summary.textContent=entry.group==='Scene'?entry.label:entry.group.replace(/s$/,'')+' · '+entry.label;box.append(summary,detail);box.open=focusOpen.get(entry.key)??shown.length<=2;body.append(box);
    // Render on demand: closed sections stay cheap, and an interaction's form is only built once it is visible.
    const draw=()=>{if(detail.childElementCount)return;form.prefix=entry.prefix;try{entry.render(detail);}finally{form.prefix=undefined;}};
    box.ontoggle=()=>{focusOpen.set(entry.key,box.open);if(box.open)draw();};if(box.open)draw();}
   return;
  }
  if(!entries.some(e=>e.key===selection.item))selection.item=entries.find(e=>e.key==='use:'+selection.use)?.key??entries[0].key;
  const layout=document.createElement('div'),nav=document.createElement('nav'),detail=document.createElement('section');layout.className='logic-layout';nav.className='logic-nav';nav.setAttribute('aria-label','Scene logic parts');detail.className='logic-detail';layout.append(nav,detail);body.append(layout);
  for(const group of [...new Set(entries.map(e=>e.group))]){const title=document.createElement('h3'),members=entries.filter(e=>e.group===group);title.textContent=group+' · '+members.length;nav.append(title);
   for(const entry of members){const b=document.createElement('button');b.type='button';b.setAttribute('aria-pressed',String(entry.key===selection.item));const label=document.createElement('span');label.textContent=entry.label;b.append(label);if(entry.detail){const small=document.createElement('small');small.textContent=entry.detail;b.append(small);}b.onclick=()=>{selection.item=entry.key;error.textContent='';refresh();};nav.append(b);}}
  const entry=entries.find(e=>e.key===selection.item)!,title=document.createElement('h2');title.textContent=entry.group+' · '+entry.label;detail.append(title);
  form.prefix=entry.prefix;try{entry.render(detail);}finally{form.prefix=undefined;}
 }
 refresh();const dispose=(()=>host.replaceChildren()) as WorkbenchHandle;dispose.refresh=refresh;return dispose;
}
