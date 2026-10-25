import {validateResponseConversations} from './response-validation';
import type {NativeReadType} from './queries';
import {validateNativeCommandSteps} from './native-command-steps';
import {attachResponseConversations} from './response-conversations';
import {validateYardGameplayBindings} from '../controllers/yard';
import {validateDowntownVisualBindings} from '../controllers/downtown-visual';
import {validateLaundryGameplayBindings} from '../controllers/laundromat';
import engineSource from '../../data/engine.json';
import {nativeBindable} from '../../data/types';
import {validateNativeTextQueries,validateNativeSaySources,nativeSayKey,nativeSourceLine} from './native-text-source';
import {validateNativeInputSources,dispatchNativeInput} from './native-inputs';
import {validateCheckpointOwner} from './checkpoint-source';
import {clearNativeLiveConditions} from './native-live-conditions';
import {nativeDeadlines} from './native-deadlines';
import {validateGameplayQuerySources} from './queries';
import {validateNativeWorkflowBindings,nativeWorkflowEvent,nativeWorkflowTick} from './native-workflows';
import {renderGameplayText} from './text-template';
/** Shared device commands, observations, cables and native scene lifecycle. */
import type {SceneData,MechanismDevice} from '../../data/types';
import type {Ctx,SceneModel,Line} from '../model';
import type {GameplayDefinition,Source,StatePort} from './types';
import type {GameplaySession} from './session';
import {projectSceneState} from './scene-state';

const fail=(s:string):never=>{throw new Error('Invalid native gameplay bindings: '+s);};

function noun(data:SceneData,key:string){const i=key.indexOf('.');return [...data.devices,...(data.nodes??[])].find(d=>d.id===key.slice(0,i))?.nouns.find(n=>n.id===key.slice(i+1));}
/** Every cable endpoint: the parts of the scene's devices and nodes, then those of its engine mechanisms (`SceneRules.mechanisms`, which the document does not hold). */
export function nativeVocabulary(data:SceneData,mechanisms:readonly MechanismDevice[]=[]){return [...[...data.devices,...(data.nodes??[])].flatMap(d=>[...d.nouns.map(n=>({key:d.id+'.'+n.id,verbs:[...(n.clock?['start','stop']:[]),...(n.link?['scan',...Array.from(new Set([...(n.link.reach??[]),...(n.link.known??[])])).map(id=>'connect '+id)]:[]),...(n.verbs??[])],events:n.events??[]})),...(d.sectors??[]).filter(s=>'sequence'in s.seal).map(s=>({key:d.id+'.'+s.id,verbs:'sequence'in s.seal?s.seal.sequence:[],events:[]})),...((data.watchdog?.route??[]).includes(d.id)?[{key:d.id+'.watchdog',verbs:[],events:['arrives','leaves']}]:[])]),...mechanisms.flatMap(m=>m.parts.map(p=>({key:m.id+'.'+p.id,verbs:[...p.verbs],events:[...p.events]})))];}
export function validateNativeBindings(d:GameplayDefinition,data:SceneData,derived:readonly string[]=[],physical:readonly string[]=[],nativeReads:Readonly<Record<string,NativeReadType>>={},mechanisms:readonly MechanismDevice[]=[]):GameplayDefinition {
 validateResponseConversations(d,data);
 validateYardGameplayBindings(data,d);
 validateDowntownVisualBindings(data,d);
 validateLaundryGameplayBindings(data,d);
 validateNativeInputSources(d,data,physical);validateNativeCommandSteps(d,data);validateNativeTextQueries(d,data);
 for(const key of Object.keys(nativeReads))if(!derived.includes(key))fail('registered native read provider '+key);
 validateGameplayQuerySources(d,{...data,texts:{...engineSource.texts,...data.texts}as unknown as SceneData['texts']},nativeReads);
 validateCheckpointOwner(d,data.id);
 for(const command of Object.values(data.camera?.actions??{}))if(!d.commands[command]?.sources.includes('interaction'))fail('camera interaction command '+command);
 const vocab=nativeVocabulary(data);
 for(const command of Object.values(d.commands))for(const action of command.actions){
  if('wire'in action){const w=action.wire,at=w.from.lastIndexOf(':'),event=vocab.find(n=>n.key===w.from.slice(0,at));if(!event?.events.includes(w.from.slice(at+1))||!vocab.some(n=>n.key===w.to))fail('wire action endpoint');if(w.op==='connect'&&!vocab.find(n=>n.key===w.to)?.verbs.includes(w.verb))fail('wire action verb');}
  if('trace'in action&&![...data.devices,...data.nodes??[]].some(dev=>dev.id===action.trace.device))fail('trace action device');
  if('mover'in action){const move=action.mover,n=[...data.devices,...data.nodes??[]].find(d=>d.id===move.device)?.nouns.find(n=>n.id===move.noun);if(!n?.mover?.paths?.[move.path])fail('mover action requires an existing named path');}
 }
 for(const device of [...data.devices,...data.nodes??[]])if(device.targetQuery!==undefined&&!Object.prototype.hasOwnProperty.call(d.queries??{},device.targetQuery))fail('interaction target query '+device.targetQuery);
 for(const device of data.devices){const ref=device.layout?.spot?.presence;if(ref!==undefined&&!Object.prototype.hasOwnProperty.call(d.queries??{},ref))fail('world presence query '+ref);}
 const b=d.native;if(!b)return d;for(const key of Object.values(b.reads??{}))if(!Object.prototype.hasOwnProperty.call(data.state,key)&&!derived.includes(key)&&!Object.prototype.hasOwnProperty.call(data.observations?.aliases??{},key))fail('native read '+key);
 for(const r of b.verbs){for(const c of r.cases)validateNativeSaySources(c.say,{...engineSource.texts,...data.texts}as unknown as SceneData['texts']);const n=noun(data,r.device+'.'+r.noun);if(!n?.verbs?.includes(r.verb)||!nativeBindable(n))fail('unsupported native verb');}
 const vocabulary=nativeVocabulary(data,mechanisms),event=(key:string)=>{const i=key.lastIndexOf(':');return i>0&&!!vocabulary.find(n=>n.key===key.slice(0,i))?.events.includes(key.slice(i+1));};
 for(const p of Object.values(b.presentation??{}))if(!data.devices.some(d=>d.id===p.target)&&!vocabulary.some(n=>n.key===p.target))fail('presentation target '+p.target);
 for(const key of Object.values(b.events))if(!event(key))fail('native event '+key);
 for(const key of Object.values(b.goals))if(!data.goals.some(g=>g.id===key))fail('native goal '+key);
 for(const w of b.wires??[])if(!event(w.from)||!vocabulary.find(n=>n.key===w.to)?.verbs.includes(w.verb))fail('wire endpoint '+w.id);
 validateNativeWorkflowBindings(d,data);
 return d;
}
/** Only declared default cables are authored. Player cuts/rewires continue to live in SceneSave. */
export function projectNativeDeviceData(data:SceneData,d:GameplayDefinition):SceneData{return d.native?.wires?{...data,cables:structuredClone(d.native.wires)}:data;}
/** Validate after all pending device and gameplay sources have been assembled. */
export function nativeDeviceData(data:SceneData,d:GameplayDefinition,derived:readonly string[]=[],physical:readonly string[]=[],nativeReads:Readonly<Record<string,NativeReadType>>={},mechanisms:readonly MechanismDevice[]=[]):SceneData {const projected=projectSceneState(data,d);validateNativeBindings(d,projected,derived,physical,nativeReads,mechanisms);return projectNativeDeviceData(projected,d);}
/** Read-only observations and native goal effects; scalar values have one common owner. */
export function nativeGameplayPort(d:GameplayDefinition,port:StatePort,model:()=>SceneModel):StatePort{return{
 prepareWorld:port.prepareWorld,
 read(){const s=port.read(),m=model();return {...s,flags:{...s.flags,...Object.fromEntries(Object.entries(d.native?.reads??{}).map(([flag,key])=>[flag,!!m.value(key)]))}};},
 write(s,events=[]){const m=model(),flags={...s.flags};for(const flag of Object.keys(d.native?.reads??{}))delete flags[flag];port.write({...s,flags},events);for(const[flag,goal]of Object.entries(d.native?.goals??{}))if(events.some(e=>e.id===flag))m.goals.add(goal);}
};}
export function nativeRoute(d:GameplayDefinition,c:Pick<Ctx,'dev'|'noun'|'verb'>){return d.native?.verbs.find(r=>r.device===c.dev&&r.noun===c.noun&&r.verb===c.verb);}
/** Invoked after native watchdog/lock/seal checks. No legacy steps execute for a bound verb. */
export function attachNativeGameplay(model:SceneModel,session:GameplaySession){
 const inspect=()=>({triggers:Object.entries(session.definition.native?.triggers??{}).map(([id,row])=>({id,condition:row.when,command:row.command,phase:row.phase??'afterNative',mode:row.once?'once':row.edge??'level',active:session.matches(row.when),completed:!!row.once&&model.triggerHistory.has(id),activationCount:model.triggerStatus[id]?.count??(row.once&&model.triggerHistory.has(id)?1:0),last:model.triggerStatus[id]}))});
 model.gameplayInspect=inspect;session.onDispose(()=>{if(model.gameplayInspect===inspect)model.gameplayInspect=undefined;});
 model.installGameplaySource(session.definition as GameplayDefinition);
 validateNativeBindings(session.definition as GameplayDefinition,model.data,Object.keys(model.rules.derived??{}),model.rules.inputs,model.rules.derivedTypes,model.rules.mechanisms);
 attachResponseConversations(model,session);
 const domain=()=>model.beginDomainTransaction();session.domain=domain;session.onDispose(()=>{if(session.domain===domain)session.domain=undefined;});
 const queryIds=new Set(Object.keys(session.definition.queries??{})),readContext=()=>({tuning:model.data.tuning,labels:model.texts,cables:model.links,sceneTime:model.now(),cameraCrates:model.data.camera?.crates,nativeRead:(key:string)=>model.rules.derivedTypes?.[key]?model.rules.derived?.[key]?.(model):undefined}),query=(id:string)=>queryIds.has(id)?session.query(id):undefined;session.readContext=readContext;model.gameplayQuery=query;model.gameplayQueryIds=queryIds;
 session.onDispose(()=>{if(session.readContext===readContext)session.readContext=undefined;if(model.gameplayQuery===query)model.gameplayQuery=undefined;if(model.gameplayQueryIds===queryIds)model.gameplayQueryIds=undefined;});
 const input=(id:string,origin:import('./native-inputs').NativeInputOrigin)=>dispatchNativeInput(model,session,id,origin);model.gameplayInput=input;session.onDispose(()=>{if(model.gameplayInput===input)model.gameplayInput=undefined;});
 const previousKeyringKnown=session.keyringKnown,previousControlledKnown=session.controlledKnown,labels=new Set(model.registryLabels());session.keyringKnown=id=>!!model.item(id);session.controlledKnown=id=>labels.has(id);
 const grantCleanup=session.observeGrants(grant=>{if(grant.kind==='keyring')model.presentKeyGrant(grant.id);});session.onDispose(()=>{grantCleanup();session.keyringKnown=previousKeyringKnown;session.controlledKnown=previousControlledKnown;});
 const step=(c:Ctx,id:string,preview:boolean)=>{const native=model.nativeEligibility(c.dev,c.noun,c.verb,c.bySignal);return native.ok?(preview?session.eligibility(id,c.bySignal?'signal':'interaction'):session.dispatch(id,c.bySignal?'signal':'interaction')):native;};model.gameplayStep=step;session.onDispose(()=>{if(model.gameplayStep===step)model.gameplayStep=undefined;});
 const command=(id:string)=>session.dispatch(id,'interaction');model.gameplayCommand=command;
 session.onDispose(()=>{if(model.gameplayCommand===command)model.gameplayCommand=undefined;});
 const previousAuthorize=session.authorize,authorize:NonNullable<GameplaySession['authorize']>=(id,source,domain)=>{for(const r of session.definition.native?.verbs??[])if(r.cases.some(c=>c.command===id)){const result=domain?domain.authorizeRoute({dev:r.device,noun:r.noun,verb:r.verb,bySignal:source==='signal'}):model.nativeEligibility(r.device,r.noun,r.verb,source==='signal');if(!result.ok)return result;}return{ok:true};};session.authorize=authorize;
 session.onDispose(()=>{if(session.authorize===authorize)session.authorize=previousAuthorize;});
 const deadlines=nativeDeadlines(model,session);
 const unsubscribe=session.observe(e=>{deadlines.event(e.id);nativeWorkflowEvent(model,session,e.id);const pulse=session.definition.native?.presentation?.[e.id];if(pulse)model.scratch['pulse.'+pulse.target]=model.now();const event=session.definition.native?.events[e.id];if(event)model.emit(event);});
 const tick=(dt:number,cause:(run:()=>void)=>void,phase:'beforeNative'|'afterNative')=>nativeWorkflowTick(model,session,dt,cause,phase);model.gameplayTick=tick;
 session.onDispose(()=>{clearNativeLiveConditions(model);deadlines.dispose();unsubscribe();if(model.gameplayTick===tick)model.gameplayTick=undefined;});
 const eligibility:NonNullable<SceneModel['gameplayEligibility']>=c=>{const route=nativeRoute(session.definition as GameplayDefinition,c);if(!route)return undefined;const row=route.cases.find(row=>(!row.sources||row.sources.includes(c.bySignal?'signal':'interaction'))&&session.matches(row.when))!;if(row.say!==null&&!Array.isArray(row.say)&&nativeSayKey(row.say,session,model)===undefined)return{ok:false,reason:'resources'};return session.eligibility(row.command,c.bySignal?'signal':'interaction');};model.gameplayEligibility=eligibility;
 const gameplay:NonNullable<SceneModel['gameplay']>=(c)=>{const route=nativeRoute(session.definition as GameplayDefinition,c);if(!route)return undefined;const row=route.cases.find(row=>(!row.sources||row.sources.includes(c.bySignal?'signal':'interaction'))&&session.matches(row.when))!,source:Source=c.bySignal?'signal':'interaction',text=row.say!==null&&!Array.isArray(row.say)?nativeSayKey(row.say,session,model):undefined,result=row.say!==null&&!Array.isArray(row.say)&&text===undefined?{ok:false as const,reason:'resources' as const}:session.dispatch(row.command,source);
  if(!result.ok)return {result,line:route.denied??[(c.bySignal?'signal → ':'')+'use '+c.noun+' --'+c.verb,'ACTION REFUSED: '+result.reason+'.','err'] as Line};
  const line=row.say===null?null:Array.isArray(row.say)?row.say.map(s=>typeof s==='string'?s.split('{via}').join(c.bySignal?'signal → ':''):s) as Line:nativeSourceLine(text!,model,c);
  if(line&&row.template){const rendered=renderGameplayText([line[0],line[1]],session.state(),{},session.queryContext());line[0]=rendered[0];line[1]=rendered[1];}
  return{result,line};
 };model.gameplay=gameplay;
 session.onDispose(()=>{if(model.gameplayEligibility===eligibility)model.gameplayEligibility=undefined;if(model.gameplay===gameplay)model.gameplay=undefined;});
}
