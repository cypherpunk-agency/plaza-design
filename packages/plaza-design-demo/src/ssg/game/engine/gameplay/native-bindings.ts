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
 if(d.native===undefined)return;const b=fields(d.native,['verbs','events','goals','wires','reads','presentation','intervals','replies','triggers']);
 for(const[flag,key]of Object.entries(b.reads===undefined?{}:record(b.reads))){if(!d.flags.includes(flag))fail('read flag reference');name(key);if(Object.values(d.commands).some(c=>c.actions.some(a=>'flag'in a&&a.flag===flag)))fail('read-only native flag');}
 const routes=new Set<string>();if(!Array.isArray(b.verbs)||b.verbs.length>128)fail('verb list');
 for(const raw of b.verbs){const r=fields(raw,['device','noun','verb','cases','denied']);[r.device,r.noun,r.verb].forEach(name);const key=r.device+'.'+r.noun+':'+r.verb;if(routes.has(key))fail('duplicate verb');routes.add(key);if(!Array.isArray(r.cases)||!r.cases.length||r.cases.length>32)fail('cases');
  if(r.denied!==undefined&&(!Array.isArray(r.denied)||r.denied.length<2||r.denied.length>3||r.denied.slice(0,2).some((s:unknown)=>typeof s!=='string'||!s||s.length>2000)||r.denied[2]!==undefined&&!['ok','err','dim'].includes(r.denied[2])))fail('denied line');
  for(const[i,raw]of r.cases.entries()){const c=fields(raw,['when','sources','command','say','template']);if(c.template!==undefined&&(c.template!==true||c.say===null))fail('case template');if(c.sources!==undefined&&(!Array.isArray(c.sources)||!c.sources.length||c.sources.length>2||new Set(c.sources).size!==c.sources.length||c.sources.some((s:unknown)=>s!=='interaction'&&s!=='signal')))fail('case sources');if(c.when!==undefined)condition(c.when);else if(c.sources===undefined&&i!==r.cases.length-1)fail('fallback must be last');if(i===r.cases.length-1&&(c.when!==undefined||c.sources!==undefined))fail('final fallback required');if(!Object.prototype.hasOwnProperty.call(d.commands,c.command))fail('command reference');if(c.say!==null&&(!Array.isArray(c.say)||c.say.length<2||c.say.length>3||c.say.slice(0,2).some((s:unknown)=>typeof s!=='string'||!s||s.length>2000)||c.say[2]!==undefined&&!['ok','err','dim'].includes(c.say[2])))fail('line');if(c.template)validateGameplayText(c.say.slice(0,2).map((s:string)=>s.split('{via}').join('')),d);}
 }
 for(const[event,raw]of Object.entries(b.presentation===undefined?{}:record(b.presentation))){if(!d.events.includes(event))fail('presentation event reference');const p=fields(raw,['kind','target']);if(p.kind!=='pulse')fail('presentation kind');name(p.target);}
 for(const[event,key]of Object.entries(record(b.events))){if(!d.events.includes(event))fail('event reference');name(key);}
 for(const[flag,key]of Object.entries(record(b.goals))){if(!d.events.includes(flag))fail('goal event');name(key);}
 validateNativeWorkflowShape(d,condition);
 if(b.wires!==undefined&&(!Array.isArray(b.wires)||b.wires.length>128))fail('wire list');const ids=new Set<string>(),pairs=new Set<string>();for(const raw of b.wires??[]){const w=fields(raw,['id','from','to','verb','fixed']);[w.from,w.to,w.verb].forEach(name);if(w.id!==undefined)name(w.id);const identity=w.id??w.from+'>'+w.to;if(ids.has(identity)||pairs.has(w.from+'>'+w.to))fail('duplicate wire');ids.add(identity);pairs.add(w.from+'>'+w.to);if(w.fixed!==undefined&&typeof w.fixed!=='boolean')fail('fixed');}
}
function noun(data:SceneData,key:string){const i=key.indexOf('.');return [...data.devices,...(data.nodes??[])].find(d=>d.id===key.slice(0,i))?.nouns.find(n=>n.id===key.slice(i+1));}
export function nativeVocabulary(data:SceneData){return [...data.devices,...(data.nodes??[])].flatMap(d=>[...d.nouns.map(n=>({key:d.id+'.'+n.id,verbs:[...(n.clock?['start','stop']:[]),...(n.link?['scan',...Array.from(new Set([...(n.link.reach??[]),...(n.link.known??[])])).map(id=>'connect '+id)]:[]),...(n.verbs??[])],events:n.events??[]})),...(d.sectors??[]).filter(s=>'sequence'in s.seal).map(s=>({key:d.id+'.'+s.id,verbs:'sequence'in s.seal?s.seal.sequence:[],events:[]})),...((data.watchdog?.route??[]).includes(d.id)?[{key:d.id+'.watchdog',verbs:[],events:['arrives','leaves']}]:[])]);}
export function validateNativeBindings(d:GameplayDefinition,data:SceneData,derived:readonly string[]=[]):GameplayDefinition {
 validateGameplayQuerySources(d,data);
 for(const command of Object.values(data.camera?.actions??{}))if(!d.commands[command]?.sources.includes('interaction'))fail('camera interaction command '+command);
 const b=d.native;if(!b)return d;for(const key of Object.values(b.reads??{}))if(!Object.prototype.hasOwnProperty.call(data.state,key)&&!derived.includes(key)&&!Object.prototype.hasOwnProperty.call(data.observations?.aliases??{},key))fail('native read '+key);
 for(const r of b.verbs){const n=noun(data,r.device+'.'+r.noun);if(!n?.verbs?.includes(r.verb)||!['ACT','SENSE','STORE'].includes(n.kind))fail('unsupported native verb');}
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
export function nativeDeviceData(data:SceneData,d:GameplayDefinition,derived:readonly string[]=[]):SceneData {const projected=projectSceneState(data,d);validateNativeBindings(d,projected,derived);return projectNativeDeviceData(projected,d);}
/** Read-only observations and native goal effects; scalar values have one common owner. */
export function nativeGameplayPort(d:GameplayDefinition,port:StatePort,model:()=>SceneModel):StatePort{return{
 read(){const s=port.read(),m=model();return {...s,flags:{...s.flags,...Object.fromEntries(Object.entries(d.native?.reads??{}).map(([flag,key])=>[flag,!!m.value(key)]))}};},
 write(s,events=[]){const m=model(),flags={...s.flags};for(const flag of Object.keys(d.native?.reads??{}))delete flags[flag];port.write({...s,flags},events);for(const[flag,goal]of Object.entries(d.native?.goals??{}))if(events.some(e=>e.id===flag))m.goals.add(goal);}
};}
export function nativeRoute(d:GameplayDefinition,c:Pick<Ctx,'dev'|'noun'|'verb'>){return d.native?.verbs.find(r=>r.device===c.dev&&r.noun===c.noun&&r.verb===c.verb);}
/** Invoked after native watchdog/lock/seal checks. No legacy steps execute for a bound verb. */
export function attachNativeGameplay(model:SceneModel,session:GameplaySession){
 validateNativeBindings(session.definition as GameplayDefinition,model.data,Object.keys(model.rules.derived??{}));
 const queryIds=new Set(Object.keys(session.definition.queries??{})),readContext=()=>({tuning:model.data.tuning,labels:model.texts}),query=(id:string)=>queryIds.has(id)?session.query(id):undefined;session.readContext=readContext;model.gameplayQuery=query;model.gameplayQueryIds=queryIds;
 session.onDispose(()=>{if(session.readContext===readContext)session.readContext=undefined;if(model.gameplayQuery===query)model.gameplayQuery=undefined;if(model.gameplayQueryIds===queryIds)model.gameplayQueryIds=undefined;});
 const command=(id:string)=>session.dispatch(id,'interaction');model.gameplayCommand=command;
 session.onDispose(()=>{if(model.gameplayCommand===command)model.gameplayCommand=undefined;});
 session.authorize=(id,source)=>{for(const r of session.definition.native?.verbs??[])if(r.cases.some(c=>c.command===id)){const result=model.nativeEligibility(r.device,r.noun,r.verb,source==='signal');if(!result.ok)return result;}return{ok:true};};
 const unsubscribe=session.observe(e=>{nativeWorkflowEvent(model,session,e.id);const pulse=session.definition.native?.presentation?.[e.id];if(pulse)model.scratch['pulse.'+pulse.target]=model.now();const event=session.definition.native?.events[e.id];if(event)model.emit(event);});
 const tick=(dt:number,cause:(run:()=>void)=>void)=>nativeWorkflowTick(model,session,dt,cause);model.gameplayTick=tick;
 session.onDispose(()=>{unsubscribe();if(model.gameplayTick===tick)model.gameplayTick=undefined;});
 model.gameplayEligibility=c=>{const route=nativeRoute(session.definition as GameplayDefinition,c);if(!route)return undefined;const row=route.cases.find(row=>(!row.sources||row.sources.includes(c.bySignal?'signal':'interaction'))&&session.matches(row.when))!;return session.eligibility(row.command,c.bySignal?'signal':'interaction');};
 model.gameplay=(c)=>{const route=nativeRoute(session.definition as GameplayDefinition,c);if(!route)return undefined;const row=route.cases.find(row=>(!row.sources||row.sources.includes(c.bySignal?'signal':'interaction'))&&session.matches(row.when))!,source:Source=c.bySignal?'signal':'interaction',result=session.dispatch(row.command,source);
  if(!result.ok)return {result,line:route.denied??[(c.bySignal?'signal → ':'')+'use '+c.noun+' --'+c.verb,'ACTION REFUSED: '+result.reason+'.','err'] as Line};
  const line=row.say===null?null:row.say.map(s=>typeof s==='string'?s.split('{via}').join(c.bySignal?'signal → ':''):s) as Line;
  if(line&&row.template){const rendered=renderGameplayText([line[0],line[1]],session.state(),{},session.queryContext());line[0]=rendered[0];line[1]=rendered[1];}
  return{result,line};
 };
}
