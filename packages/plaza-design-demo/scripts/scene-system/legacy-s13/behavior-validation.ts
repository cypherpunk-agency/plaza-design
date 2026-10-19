/** Strict finite authoring boundary for the existing Sandbox training handlers. */
import baseline from '../../../src/ssg/game/scenes/sandbox/devices.json';
import { ENGINE, KEYRING, LOGIC, NET, SANDBOX } from '../../../src/ssg/game/data';
import type { SceneData, Case, Action, NounData } from '../../../src/ssg/game/data';
import { checkScene } from '../../../src/ssg/game/data/check';
import { contractOf } from '../../../src/ssg/game/engine/rules';
import { SANDBOX_RULES } from '../../../src/ssg/game/scenes/sandbox/rules';
export const behaviorHandlers: Record<string, readonly string[]> = {'sensor.eye':['wave','read'],'lamp.lamp':['on','off'],'memo.memo':['read','write'],'hatch.hatch':['open','shut'],'fan.fan':['spin','stop']};
export const behaviorCableIds = ['sbx.motion','sbx.hatch.fan'] as const;
export const behaviorStateKeys = ['lampOn','memo','hatchOpen','fanOn'] as const;
export const cloneBehavior = <T>(value:T):T => JSON.parse(JSON.stringify(value));
const stable = (v:unknown):string => JSON.stringify(v,(_k,x)=>x && !Array.isArray(x) && typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
function fail(message:string):never {throw new Error(message);}
const object = (v:unknown):Record<string,unknown> => {if(!v||Array.isArray(v)||typeof v!=='object'||Object.getPrototypeOf(v)!==Object.prototype)fail('Expected plain JSON object');return v as Record<string,unknown>;};
const keys = (v:Record<string,unknown>,allowed:string[]) => {for(const k of Object.keys(v))if(!allowed.includes(k))fail('Unsupported behavior property: '+k);};
export function behaviorNoun(data:SceneData,key:string):NounData {const i=key.indexOf('.');return data.devices.find(d=>d.id===key.slice(0,i))!.nouns.find(n=>n.id===key.slice(i+1))!;}
function protectedShape(data:SceneData){const copy=cloneBehavior(data);if(Object.keys(copy.dialogue).length&&stable(copy.dialogue)!==stable(SANDBOX.dialogue))fail('Sandbox dialogue belongs to its gameplay source');copy.dialogue={};const original=baseline as unknown as SceneData;for(const key of Object.keys(behaviorHandlers))behaviorNoun(copy,key).on=cloneBehavior(behaviorNoun(original,key).on);for(const id of behaviorCableIds){const c=copy.cables?.find(c=>c.id===id),b=original.cables?.find(c=>c.id===id);if(!c||!b)fail('Stable cable missing');c.from=b.from;c.to=b.to;c.verb=b.verb;}return copy;}
export function preserveSandboxBehavior(before:unknown,after:unknown){if(stable(protectedShape(before as SceneData))!==stable(protectedShape(after as SceneData)))fail('Protected Sandbox data changed');}
function condition(value:unknown){if(value===undefined)return;if(typeof value!=='string'||!/^!?(lampOn|memo|hatchOpen|fanOn|signal)(=(true|false|0|1|2))?$/.test(value))fail('Unsupported condition');const [,name,literal]=/^!?([^=]+)(?:=(.*))?$/.exec(value)!;if(literal!==undefined&&(name==='memo'?!['0','1','2'].includes(literal):!['true','false'].includes(literal)))fail('Condition literal has wrong state type');}
function line(value:unknown){if(!Array.isArray(value)||value.length<2||value.length>3||value.slice(0,2).some(v=>typeof v!=='string'||v.length>500)||value.length===3&&!['ok','err','dim'].includes(value[2]))fail('Response must be [command, reply, optional tone]');for(const text of value.slice(0,2))for(const match of text.matchAll(/\{([^{}]+)\}/g))if(!['via','verb',...behaviorStateKeys].includes(match[1]))fail('Unsupported response placeholder');}
/** No copied evaluator: this only rejects edits outside the frozen native subset. */
export function validateSandboxBehavior(value:unknown):SceneData {
 const seen=new Set<object>();const json=(v:unknown):void=>{if(v===null||typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))return;if(typeof v!=='object'||seen.has(v)||!Array.isArray(v)&&Object.getPrototypeOf(v)!==Object.prototype)fail('Only finite plain JSON behavior data');seen.add(v);for(const [key,child] of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(key))fail('Reserved JSON key');json(child);}seen.delete(v);};json(value);
 const data=cloneBehavior(value) as SceneData;object(data);preserveSandboxBehavior(baseline,data);
 let pulse=0;
 for(const [key,verbs] of Object.entries(behaviorHandlers)){
  const noun=behaviorNoun(data,key),on=object(noun.on);if(stable(Object.keys(on).sort())!==stable([...verbs].sort()))fail('Verb inventory is protected');
  for(const verb of verbs){const cases=Array.isArray(on[verb])?on[verb] as unknown[]:[on[verb]];if(!cases.length||cases.length>8)fail('Handler requires 1..8 cases');for(const candidate of cases){const c=object(candidate);keys(c,['if','do','say']);condition(c.if);if(c.say!==undefined)line(c.say);if(c.do!==undefined){if(!Array.isArray(c.do)||c.do.length>8)fail('At most eight actions');for(const candidateAction of c.do){const a=object(candidateAction);condition(a.if);if('set'in a){keys(a,['set','to','if']);if(!behaviorStateKeys.includes(a.set as typeof behaviorStateKeys[number]))fail('Unsupported state key');if(a.set==='memo'?!(Number.isInteger(a.to)&&Number(a.to)>=0&&Number(a.to)<=2):typeof a.to!=='boolean')fail('Literal state value has wrong type/range');}else if('emit'in a){keys(a,['emit','if']);if(typeof a.emit!=='string'||!noun.events?.includes(a.emit))fail('Event must be declared on the same noun');}else if('effect'in a){if(key!=='sensor.eye'||verb!=='wave'||stable(a)!==stable({effect:'sbx.pulse'}))fail('Effects are protected');pulse++;}else fail('Unsupported action');}}}}
 }
 if(pulse!==1)fail('The existing native sbx.pulse effect must remain exactly once');
 const endpoints=new Map(Object.keys(behaviorHandlers).map(k=>[k,behaviorNoun(data,k)]));
 for(const id of behaviorCableIds){const cable=data.cables!.find(c=>c.id===id)!;const i=cable.from.lastIndexOf(':'),source=endpoints.get(cable.from.slice(0,i));if(!source?.events?.includes(cable.from.slice(i+1)))fail('Cable source must be an existing supported event');if(!endpoints.has(cable.to)||!behaviorHandlers[cable.to].includes(cable.verb))fail('Cable target must be an existing supported verb');}
 assertBehaviorSignalGraph(data,data.cables??[]);
 const world={keyring:new Map([...KEYRING].map(([id,item])=>[id,{item,file:'keyring'}])),netNodes:new Map(NET.nodes.map(n=>[n.id,n])),logic:LOGIC,gives:new Map<string,Set<string>>(),nets:NET.networks??[],programs:new Set((NET.programs??[]).map(p=>p.id))};
 const problems=[...checkScene({...data,dialogue:SANDBOX.dialogue},contractOf(SANDBOX_RULES),world,ENGINE,NET),...(SANDBOX_RULES.check?.(data)??[])];if(problems.length)fail(problems.join('\n'));data.dialogue={};return data;
}
export type BehaviorCase = Case;


/** Actual restored links may differ from source defaults; preview validates both separately. */
export function assertBehaviorSignalGraph(data:SceneData,links:readonly {from:string;to:string;verb:string}[]){
 const graph=new Map<string,string[]>();for(const [key,verbs] of Object.entries(behaviorHandlers))for(const verb of verbs){const on=behaviorNoun(data,key).on![verb];const events=(Array.isArray(on)?on:[on]).flatMap(c=>(c.do??[]).filter((a):a is Action&{emit:string}=>'emit'in a).map(a=>a.emit));graph.set(key+':'+verb,links.filter(c=>events.some(e=>c.from===key+':'+e)).map(c=>c.to+':'+c.verb));}
 const active=new Set<string>(),done=new Set<string>();const visit=(node:string)=>{if(active.has(node))fail('Unsafe potential signal cycle');if(done.has(node))return;active.add(node);for(const next of graph.get(node)??[])visit(next);active.delete(node);done.add(node);};for(const node of graph.keys())visit(node);
}
