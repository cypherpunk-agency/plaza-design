import {validateNativeCommandSteps} from './native-command-steps';
import {validateYardGameplayBindings} from '../controllers/yard';
import {validateDowntownVisualBindings} from '../controllers/downtown-visual';
import {validateLaundryGameplayBindings} from '../controllers/laundromat';
import engineSource from '../../data/engine.json';
import {validateNativeTextQueries,validateNativeSayShape,validateNativeSaySources,nativeSayKey,nativeSourceLine} from './native-text-source';
import {validateNativeInputsShape,validateNativeInputSources,dispatchNativeInput} from './native-inputs';
import {validateCheckpointOwner} from './checkpoint-source';
import {clearNativeLiveConditions} from './native-live-conditions';
import {nativeDeadlines} from './native-deadlines';
import {validateGameplayQuerySources} from './queries';
import {validateNativeWorkflowShape,validateNativeWorkflowBindings,nativeWorkflowEvent,nativeWorkflowTick} from './native-workflows';
import {renderGameplayText,validateGameplayText} from './text-template';
/** Shared device commands, observations, cables and native scene lifecycle. */
import type {SceneData} from '../../data/types';
import type {Ctx,SceneModel,Line} from '../model';
import type {GameplayDefinition,Source,StatePort} from './types';
import type {GameplaySession} from './session';
import {projectSceneState} from './scene-state';

const fail=(s:string):never=>{throw new Error('Invalid native gameplay bindings: '+s);};
const record=(v:unknown):Record<string,any>=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype)fail('plain object');return v as Record<string,any>;};
const fields=(v:unknown,allowed:string[])=>{const r=record(v);if(Object.keys(r).some(k=>!allowed.includes(k)))fail('unsupported field');return r;};
const name=(s:unknown)=>{if(typeof s!=='string'||!s.trim()||s.length>128||['__proto__','constructor','prototype'].includes(s))fail('name');};
export function validateNativeShape(d:GameplayDefinition,condition:(v:unknown)=>void){
 if(d.native===undefined)return;const b=fields(d.native,['verbs','events','goals','wires','reads','presentation','intervals','replies','triggers','deadlines','inputs']);
 for(const[flag,key]of Object.entries(b.reads===undefined?{}:record(b.reads))){if(!d.flags.includes(flag))fail('read flag reference');name(key);if(Object.values(d.commands).some(c=>c.actions.some(a=>'flag'in a&&a.flag===flag)))fail('read-only native flag');}
 const routes=new Set<string>();if(!Array.isArray(b.verbs)||b.verbs.length>128)fail('verb list');
 for(const raw of b.verbs){const r=fields(raw,['device','noun','verb','cases','denied']);[r.device,r.noun,r.verb].forEach(name);const key=r.device+'.'+r.noun+':'+r.verb;if(routes.has(key))fail('duplicate verb');routes.add(key);if(!Array.isArray(r.cases)||!r.cases.length||r.cases.length>32)fail('cases');
  if(r.denied!==undefined&&(!Array.isArray(r.denied)||r.denied.length<2||r.denied.length>3||r.denied.slice(0,2).some((s:unknown)=>typeof s!=='string'||!s||s.length>2000)||r.denied[2]!==undefined&&!['ok','err','dim'].includes(r.denied[2])))fail('denied line');
  for(const[i,raw]of r.cases.entries()){const c=fields(raw,['when','sources','command','say','template']);if(c.template!==undefined&&(c.template!==true||!Array.isArray(c.say)))fail('case template');if(c.sources!==undefined&&(!Array.isArray(c.sources)||!c.sources.length||c.sources.length>2||new Set(c.sources).size!==c.sources.length||c.sources.some((s:unknown)=>s!=='interaction'&&s!=='signal')))fail('case sources');if(c.when!==undefined)condition(c.when);else if(c.sources===undefined&&i!==r.cases.length-1)fail('fallback must be last');if(i===r.cases.length-1&&(c.when!==undefined||c.sources!==undefined))fail('final fallback required');if(!Object.prototype.hasOwnProperty.call(d.commands,c.command))fail('command reference');validateNativeSayShape(c.say,d);if(c.template)validateGameplayText(c.say.slice(0,2).map((s:string)=>s.split('{via}').join('')),d);}
 }
 for(const[event,raw]of Object.entries(b.presentation===undefined?{}:record(b.presentation))){if(!d.events.includes(event))fail('presentation event reference');const p=fields(raw,['kind','target']);if(p.kind!=='pulse')fail('presentation kind');name(p.target);}
 for(const[event,key]of Object.entries(record(b.events))){if(!d.events.includes(event))fail('event reference');name(key);}
 for(const[flag,key]of Object.entries(record(b.goals))){if(!d.events.includes(flag))fail('goal event');name(key);}
 validateNativeWorkflowShape(d,condition);validateNativeInputsShape(d,condition);
 if(b.wires!==undefined&&(!Array.isArray(b.wires)||b.wires.length>128))fail('wire list');const ids=new Set<string>(),pairs=new Set<string>();for(const raw of b.wires??[]){const w=fields(raw,['id','from','to','verb','fixed']);[w.from,w.to,w.verb].forEach(name);if(w.id!==undefined)name(w.id);const identity=w.id??w.from+'>'+w.to;if(ids.has(identity)||pairs.has(w.from+'>'+w.to))fail('duplicate wire');ids.add(identity);pairs.add(w.from+'>'+w.to);if(w.fixed!==undefined&&typeof w.fixed!=='boolean')fail('fixed');}
}
function noun(data:SceneData,key:string){const i=key.indexOf('.');return [...data.devices,...(data.nodes??[])].find(d=>d.id===key.slice(0,i))?.nouns.find(n=>n.id===key.slice(i+1));}
export function nativeVocabulary(data:SceneData){return [...data.devices,...(data.nodes??[])].flatMap(d=>[...d.nouns.map(n=>({key:d.id+'.'+n.id,verbs:[...(n.clock?['start','stop']:[]),...(n.link?['scan',...Array.from(new Set([...(n.link.reach??[]),...(n.link.known??[])])).map(id=>'connect '+id)]:[]),...(n.verbs??[])],events:n.events??[]})),...(d.sectors??[]).filter(s=>'sequence'in s.seal).map(s=>({key:d.id+'.'+s.id,verbs:'sequence'in s.seal?s.seal.sequence:[],events:[]})),...((data.watchdog?.route??[]).includes(d.id)?[{key:d.id+'.watchdog',verbs:[],events:['arrives','leaves']}]:[])]);}
export function validateNativeBindings(d:GameplayDefinition,data:SceneData,derived:readonly string[]=[],physical:readonly string[]=[]):GameplayDefinition {
 validateYardGameplayBindings(data,d);
 validateDowntownVisualBindings(data,d);
 validateLaundryGameplayBindings(data,d);
 validateNativeInputSources(d,data,physical);validateNativeCommandSteps(d,data);validateNativeTextQueries(d,data);
 validateGameplayQuerySources(d,{...data,texts:{...engineSource.texts,...data.texts}as unknown as SceneData['texts']});
 validateCheckpointOwner(d,data.id);
 for(const command of Object.values(data.camera?.actions??{}))if(!d.commands[command]?.sources.includes('interaction'))fail('camera interaction command '+command);
 const vocab=nativeVocabulary(data);
 for(const command of Object.values(d.commands))for(const action of command.actions){
  if('wire'in action){const w=action.wire,at=w.from.lastIndexOf(':'),event=vocab.find(n=>n.key===w.from.slice(0,at));if(!event?.events.includes(w.from.slice(at+1))||!vocab.some(n=>n.key===w.to))fail('wire action endpoint');if(w.op==='connect'&&!vocab.find(n=>n.key===w.to)?.verbs.includes(w.verb))fail('wire action verb');}
  if('trace'in action&&![...data.devices,...data.nodes??[]].some(dev=>dev.id===action.trace.device))fail('trace action device');
 }
 const b=d.native;if(!b)return d;for(const key of Object.values(b.reads??{}))if(!Object.prototype.hasOwnProperty.call(data.state,key)&&!derived.includes(key)&&!Object.prototype.hasOwnProperty.call(data.observations?.aliases??{},key))fail('native read '+key);
 for(const r of b.verbs){for(const c of r.cases)validateNativeSaySources(c.say,{...engineSource.texts,...data.texts}as unknown as SceneData['texts']);const n=noun(data,r.device+'.'+r.noun);if(!n?.verbs?.includes(r.verb)||!['ACT','SENSE','STORE'].includes(n.kind))fail('unsupported native verb');}
 const vocabulary=nativeVocabulary(data),event=(key:string)=>{const i=key.lastIndexOf(':');return i>0&&!!vocabulary.find(n=>n.key===key.slice(0,i))?.events.includes(key.slice(i+1));};
 for(const p of Object.values(b.presentation??{}))if(!data.devices.some(d=>d.id===p.target)&&!vocabulary.some(n=>n.key===p.target))fail('presentation target '+p.target);
 for(const key of Object.values(b.events))if(!event(key))fail('native event '+key);
 for(const key of Object.values(b.goals))if(!data.goals.some(g=>g.id===key))fail('native goal '+key);
 for(const w of b.wires??[])if(!event(w.from)||!nativeVocabulary(data).find(n=>n.key===w.to)?.verbs.includes(w.verb))fail('wire endpoint '+w.id);
 validateNativeWorkflowBindings(d,data);
 return d;
}
/** Only declared default cables are authored. Player cuts/rewires continue to live in SceneSave. */
export function projectNativeDeviceData(data:SceneData,d:GameplayDefinition):SceneData{return d.native?.wires?{...data,cables:structuredClone(d.native.wires)}:data;}
/** Validate after all pending device and gameplay sources have been assembled. */
export function nativeDeviceData(data:SceneData,d:GameplayDefinition,derived:readonly string[]=[],physical:readonly string[]=[]):SceneData {const projected=projectSceneState(data,d);validateNativeBindings(d,projected,derived,physical);return projectNativeDeviceData(projected,d);}
/** Read-only observations and native goal effects; scalar values have one common owner. */
export function nativeGameplayPort(d:GameplayDefinition,port:StatePort,model:()=>SceneModel):StatePort{return{
 read(){const s=port.read(),m=model();return {...s,flags:{...s.flags,...Object.fromEntries(Object.entries(d.native?.reads??{}).map(([flag,key])=>[flag,!!m.value(key)]))}};},
 write(s,events=[]){const m=model(),flags={...s.flags};for(const flag of Object.keys(d.native?.reads??{}))delete flags[flag];port.write({...s,flags},events);for(const[flag,goal]of Object.entries(d.native?.goals??{}))if(events.some(e=>e.id===flag))m.goals.add(goal);}
};}
export function nativeRoute(d:GameplayDefinition,c:Pick<Ctx,'dev'|'noun'|'verb'>){return d.native?.verbs.find(r=>r.device===c.dev&&r.noun===c.noun&&r.verb===c.verb);}
/** Invoked after native watchdog/lock/seal checks. No legacy steps execute for a bound verb. */
export function attachNativeGameplay(model:SceneModel,session:GameplaySession){
 model.installGameplaySource(session.definition as GameplayDefinition);
 validateNativeBindings(session.definition as GameplayDefinition,model.data,Object.keys(model.rules.derived??{}),model.rules.inputs);
 const domain=()=>model.beginDomainTransaction();session.domain=domain;session.onDispose(()=>{if(session.domain===domain)session.domain=undefined;});
 const queryIds=new Set(Object.keys(session.definition.queries??{})),readContext=()=>({tuning:model.data.tuning,labels:model.texts,cables:model.links,sceneTime:model.now(),cameraCrates:model.data.camera?.crates}),query=(id:string)=>queryIds.has(id)?session.query(id):undefined;session.readContext=readContext;model.gameplayQuery=query;model.gameplayQueryIds=queryIds;
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
