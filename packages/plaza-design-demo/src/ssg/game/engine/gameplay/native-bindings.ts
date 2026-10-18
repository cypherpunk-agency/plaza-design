/** Native compatibility boundary: shared atomic commands, existing nouns/cables and scene time. */
import type {SceneData} from '../../data/types';
import type {Ctx,SceneModel,Line} from '../model';
import type {GameplayDefinition,GameplayState,Source,StatePort} from './types';
import type {GameplaySession} from './session';
import {validValue} from './state';

const fail=(s:string):never=>{throw new Error('Invalid native gameplay bindings: '+s);};
const record=(v:unknown):Record<string,any>=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype)fail('plain object');return v as Record<string,any>;};
const fields=(v:unknown,allowed:string[])=>{const r=record(v);if(Object.keys(r).some(k=>!allowed.includes(k)))fail('unsupported field');return r;};
const name=(s:unknown)=>{if(typeof s!=='string'||!s.trim()||s.length>128||['__proto__','constructor','prototype'].includes(s))fail('name');};
export function validateNativeShape(d:GameplayDefinition,condition:(v:unknown)=>void){
 if(d.native===undefined)return;const b=fields(d.native,['state','verbs','events','goals','wires']);
 const used=new Set<string>();for(const[id,key]of Object.entries(record(b.state))){name(key);if(!d.state?.[id]||d.state[id].lifetime!=='save'||used.has(String(key)))fail('state mapping');used.add(String(key));}
 const routes=new Set<string>();if(!Array.isArray(b.verbs)||b.verbs.length>128)fail('verb list');
 for(const raw of b.verbs){const r=fields(raw,['device','noun','verb','cases','denied']);[r.device,r.noun,r.verb].forEach(name);const key=r.device+'.'+r.noun+':'+r.verb;if(routes.has(key))fail('duplicate verb');routes.add(key);if(!Array.isArray(r.cases)||!r.cases.length||r.cases.length>32)fail('cases');
  if(r.denied!==undefined&&(!Array.isArray(r.denied)||r.denied.length<2||r.denied.length>3||r.denied.slice(0,2).some((s:unknown)=>typeof s!=='string'||!s||s.length>2000)||r.denied[2]!==undefined&&!['ok','err','dim'].includes(r.denied[2])))fail('denied line');
  for(const[i,raw]of r.cases.entries()){const c=fields(raw,['when','command','say']);if(c.when!==undefined)condition(c.when);else if(i!==r.cases.length-1)fail('fallback must be last');if(i===r.cases.length-1&&c.when!==undefined)fail('final fallback required');if(!Object.prototype.hasOwnProperty.call(d.commands,c.command))fail('command reference');if(!Array.isArray(c.say)||c.say.length<2||c.say.length>3||c.say.slice(0,2).some((s:unknown)=>typeof s!=='string'||!s||s.length>2000)||c.say[2]!==undefined&&!['ok','err','dim'].includes(c.say[2]))fail('line');}
 }
 for(const[event,key]of Object.entries(record(b.events))){if(!d.events.includes(event))fail('event reference');name(key);}
 for(const[flag,key]of Object.entries(record(b.goals))){if(!d.events.includes(flag))fail('goal event');name(key);}
 if(!Array.isArray(b.wires)||b.wires.length>128)fail('wire list');const ids=new Set<string>(),pairs=new Set<string>();for(const raw of b.wires){const w=fields(raw,['id','from','to','verb','fixed']);[w.id,w.from,w.to,w.verb].forEach(name);if(ids.has(w.id)||pairs.has(w.from+'>'+w.to))fail('duplicate wire');ids.add(w.id);pairs.add(w.from+'>'+w.to);if(w.fixed!==undefined&&typeof w.fixed!=='boolean')fail('fixed');}
}
function noun(data:SceneData,key:string){const i=key.indexOf('.');return [...data.devices,...(data.nodes??[])].find(d=>d.id===key.slice(0,i))?.nouns.find(n=>n.id===key.slice(i+1));}
export function nativeVocabulary(data:SceneData){return [...data.devices,...(data.nodes??[])].flatMap(d=>[...d.nouns.map(n=>({key:d.id+'.'+n.id,verbs:n.clock?['start','stop',...(n.verbs??[])]:n.verbs??[],events:n.events??[]})),...(d.sectors??[]).filter(s=>'sequence'in s.seal).map(s=>({key:d.id+'.'+s.id,verbs:'sequence'in s.seal?s.seal.sequence:[],events:[]}))]);}
export function validateNativeBindings(d:GameplayDefinition,data:SceneData):GameplayDefinition {
 const b=d.native;if(!b)return d;
 for(const[id,key]of Object.entries(b.state))if(!Object.prototype.hasOwnProperty.call(data.state,key)||!validValue(d.state![id],data.state[key]))fail('native state/default '+key);
 for(const r of b.verbs){const n=noun(data,r.device+'.'+r.noun);if(!n?.verbs?.includes(r.verb)||!['ACT','SENSE','STORE'].includes(n.kind))fail('unsupported native verb');}
 const event=(key:string)=>{const i=key.lastIndexOf(':');return i>0&&!!noun(data,key.slice(0,i))?.events?.includes(key.slice(i+1));};
 for(const key of Object.values(b.events))if(!event(key))fail('native event '+key);
 for(const key of Object.values(b.goals))if(!data.goals.some(g=>g.id===key))fail('native goal '+key);
 for(const w of b.wires)if(!event(w.from)||!nativeVocabulary(data).find(n=>n.key===w.to)?.verbs.includes(w.verb))fail('wire endpoint '+w.id);
 return d;
}
/** Only declared default cables are authored. Player cuts/rewires continue to live in SceneSave. */
export function nativeDeviceData(data:SceneData,d:GameplayDefinition):SceneData {validateNativeBindings(d,data);return d.native?{...data,cables:structuredClone(d.native.wires)}:data;}
export function readNativeValues(d:GameplayDefinition,state:Record<string,unknown>,values:GameplayState['values']){
 const out={...values};for(const[id,key]of Object.entries(d.native?.state??{})){const value=state[key];if(!validValue(d.state![id],value))fail('loaded native state '+key);out[id]=value as string|number|boolean;}return out;
}
/** Validate everything before touching either state store; native keys remain saved in SceneSave. */
export function nativeStatePort(d:GameplayDefinition,port:StatePort,model:()=>SceneModel):StatePort{return{
 read(){const s=port.read();return {...s,values:readNativeValues(d,model().state,s.values)};},
 write(s,events=[]){const m=model(),values={...s.values},patch:Record<string,string|number|boolean>={};for(const[id,key]of Object.entries(d.native?.state??{})){const value=values[id];if(!validValue(d.state![id],value))fail('state commit');patch[key]=value!;delete values[id];}port.write({...s,values},events);Object.assign(m.state,patch);for(const[flag,goal]of Object.entries(d.native?.goals??{}))if(events.some(e=>e.id===flag))m.goals.add(goal);}
};}
export function nativeRoute(d:GameplayDefinition,c:Pick<Ctx,'dev'|'noun'|'verb'>){return d.native?.verbs.find(r=>r.device===c.dev&&r.noun===c.noun&&r.verb===c.verb);}
/** Invoked after native watchdog/lock/seal checks. No legacy steps execute for a bound verb. */
export function attachNativeGameplay(model:SceneModel,session:GameplaySession){
 validateNativeBindings(session.definition as GameplayDefinition,model.data);
 session.authorize=(id,source)=>{for(const r of session.definition.native?.verbs??[])if(r.cases.some(c=>c.command===id)){const result=model.nativeEligibility(r.device,r.noun,r.verb,source==='signal');if(!result.ok)return result;}return{ok:true};};
 session.observe(e=>{const event=session.definition.native?.events[e.id];if(event)model.emit(event);});
 model.gameplayEligibility=c=>{const route=nativeRoute(session.definition as GameplayDefinition,c);if(!route)return undefined;const row=route.cases.find(row=>session.matches(row.when))!;return session.eligibility(row.command,c.bySignal?'signal':'interaction');};
 model.gameplay=(c)=>{const route=nativeRoute(session.definition as GameplayDefinition,c);if(!route)return undefined;const row=route.cases.find(row=>session.matches(row.when))!,source:Source=c.bySignal?'signal':'interaction',result=session.dispatch(row.command,source);
  if(!result.ok)return {result,line:route.denied??[(c.bySignal?'signal → ':'')+'use '+c.noun+' --'+c.verb,'ACTION REFUSED: '+result.reason+'.','err'] as Line};
  return{result,line:row.say.map(s=>typeof s==='string'?s.split('{via}').join(c.bySignal?'signal → ':''):s) as Line};
 };
}
