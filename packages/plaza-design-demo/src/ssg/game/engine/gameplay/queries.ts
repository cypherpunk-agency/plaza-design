import type {SceneData} from '../../data/types';
import type {Condition,GameplayDefinition,GameplayState,StateValue} from './types';
import {stateValue} from './state';
import {matches} from './validation';

/** Scalar reads are immutable expressions, never another state declaration or save block. */
export type ScalarRead={literal:StateValue}|{state:string}|{query:string};
export type CollectionQuery={kind:'collection';source:'camera.crates';id:ScalarRead;read:{kind:'exists'}|{kind:'lineRef';prefix:string;fallback:string}};
export type QueryDefinition=
 | CollectionQuery
 | {kind:'remainder';value:ScalarRead;divisor:number}
 | {kind:'sceneTime'}
 | {kind:'wirePresent';from:string;to:string;verb?:string}
 | {kind:'count';conditions:Condition[]}
 | {kind:'select';cases:{when?:Condition;value:ScalarRead}[]}
 | {kind:'tuning';key:string}
 | {kind:'label';key:string}
 | {kind:'duration';value:ScalarRead;unit:'seconds';round:'nearest'};
export interface GameplayReadContext {
 definition:Pick<GameplayDefinition,'queries'>;
 sceneTime?:number;
 cameraCrates?:readonly {id:string}[];
 cables?:readonly {from:string;to:string;verb:string}[];
 tuning?:Readonly<SceneData['tuning']>;
 labels?:Readonly<SceneData['texts']>;
 /** Evaluation-local recursion guard, not source content or retained state. */
 queryPath?:readonly string[];
}
const own=(o:object,key:string)=>Object.prototype.hasOwnProperty.call(o,key);
export function scalarRead(read:ScalarRead,state:Readonly<GameplayState>,context?:GameplayReadContext):StateValue|undefined{
 if('literal'in read)return read.literal;
 if('state'in read)return stateValue(state.values,read.state);
 return readQuery(read.query,state,context);
}
/** Every read sees its supplied transaction draft; there is deliberately no memoized result. */
export function readQuery(id:string,state:Readonly<GameplayState>,context?:GameplayReadContext):StateValue|undefined{
 const queries=context?.definition.queries;if(!queries||!own(queries,id))return undefined;
 const path=context?.queryPath??[];if(path.includes(id)||path.length>=32)throw Error('Gameplay query cycle/budget: '+id);
 const next={...context!,queryPath:[...path,id]},q=queries[id];
 if(q.kind==='remainder'){const value=scalarRead(q.value,state,next);return typeof value==='number'&&Number.isFinite(value)?value%q.divisor:undefined;}
 if(q.kind==='sceneTime')return Number.isFinite(context?.sceneTime)?context!.sceneTime:undefined;
 if(q.kind==='collection'){if(!context?.cameraCrates)return undefined;const id=scalarRead(q.id,state,next);if(typeof id!=='string')return undefined;const row=context.cameraCrates.find(row=>row.id===id);if(q.read.kind==='exists')return !!row;if(!row||!context.labels)return undefined;const candidate=q.read.prefix+row.id,key=own(context.labels,candidate)?candidate:q.read.fallback;return lineValue(context.labels[key])?key:undefined;}
 if(q.kind==='wirePresent')return context?.cables?.some(w=>w.from===q.from&&w.to===q.to&&(q.verb===undefined||w.verb===q.verb));
 if(q.kind==='count')return q.conditions.filter(c=>matches(c,state,next)).length;
 if(q.kind==='select'){const row=q.cases.find(r=>matches(r.when,state,next));return row?scalarRead(row.value,state,next):undefined;}
 if(q.kind==='tuning')return context?.tuning&&own(context.tuning,q.key)?context.tuning[q.key]:undefined;
 if(q.kind==='label'){const value=context?.labels?.[q.key];return typeof value==='string'?value:undefined;}
 const value=scalarRead(q.value,state,next);return typeof value==='number'?Math.round(value/1000):undefined;
}

const fail=(s:string):never=>{throw Error('Invalid gameplay query: '+s);};
const object=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype)fail('plain object');return v as Record<string,unknown>;};
const fields=(v:unknown,allowed:string[],required=allowed)=>{const r=object(v);if(Object.keys(r).some(k=>!allowed.includes(k))||required.some(k=>!own(r,k)))fail('fields');return r;};
const name=(v:unknown):string=>{if(typeof v!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(v)||['__proto__','constructor','prototype'].includes(v))fail('id');return v as string;};
export function validateScalarRead(read:unknown,d:GameplayDefinition){
 const r=fields(read,['literal','state','query'],[]);if(Object.keys(r).length!==1)fail('one scalar source required');
 if('literal'in r){if(r.literal!==null&&!['string','number','boolean'].includes(typeof r.literal)||typeof r.literal==='number'&&!Number.isFinite(r.literal)||typeof r.literal==='string'&&r.literal.length>2000)fail('finite bounded literal');}
 else if('state'in r){if(!own(d.state??{},name(r.state))&&!own(d.stateReads??{},name(r.state)))fail('state reference '+r.state);}
 else if(!own(d.queries??{},name(r.query)))fail('query reference '+r.query);
}
export function numericScalarRead(read:ScalarRead,d:GameplayDefinition,depth=0):boolean{
 if(depth>=32)return false;
 if('literal'in read)return typeof read.literal==='number';
 if('state'in read)return stateReadType(d,read.state)==='number';
 const q=d.queries?.[read.query];if(!q)return false;
 return q.kind==='remainder'||q.kind==='sceneTime'||q.kind==='count'||q.kind==='tuning'||q.kind==='duration'||q.kind==='select'&&Array.isArray(q.cases)&&q.cases.every(row=>row.value&&numericScalarRead(row.value,d,depth+1));
}
export function stringScalarRead(read:ScalarRead,d:GameplayDefinition,depth=0):boolean{
 if(depth>=32)return false;if('literal'in read)return typeof read.literal==='string';if('state'in read)return ['string','enum'].includes(stateReadType(d,read.state)??'');const q=d.queries?.[read.query];return q?.kind==='label'||q?.kind==='collection'&&q.read.kind==='lineRef'||q?.kind==='select'&&Array.isArray(q.cases)&&q.cases.every(row=>row.value&&stringScalarRead(row.value,d,depth+1));
}
export function validateGameplayQueries(d:GameplayDefinition,condition:(v:unknown)=>void){
 const queries=d.queries??{};object(queries);if(Object.keys(queries).length>64)fail('query count');
 for(const[id,raw]of Object.entries(queries)){
  name(id);if(own(d.state??{},id)||own(d.stateReads??{},id))fail('query shadows state '+id);const q=object(raw);
  if(q.kind==='remainder'){fields(q,['kind','value','divisor']);validateScalarRead(q.value,d);if(typeof q.divisor!=='number'||!Number.isFinite(q.divisor)||q.divisor===0)fail('finite nonzero divisor');}
  else if(q.kind==='sceneTime'){fields(q,['kind']);}
  else if(q.kind==='collection'){fields(q,['kind','source','id','read']);if(q.source!=='camera.crates')fail('registered collection source');validateScalarRead(q.id,d);if(!stringScalarRead(q.id as ScalarRead,d))fail('collection ID requires string read');const r=object(q.read);if(r.kind==='exists')fields(r,['kind']);else if(r.kind==='lineRef'){fields(r,['kind','prefix','fallback']);name(r.fallback);if(typeof r.prefix!=='string'||!/^[-a-zA-Z0-9_.:]{0,128}$/.test(r.prefix))fail('line prefix');}else fail('collection read');}
  else if(q.kind==='wirePresent'){fields(q,['kind','from','to','verb'],['kind','from','to']);name(q.from);name(q.to);if(q.verb!==undefined)name(q.verb);}
  else if(q.kind==='count'){fields(q,['kind','conditions']);if(!Array.isArray(q.conditions)||!q.conditions.length||q.conditions.length>128)fail('count rows');(q.conditions as unknown[]).forEach(condition);}
  else if(q.kind==='select'){fields(q,['kind','cases']);if(!Array.isArray(q.cases)||!q.cases.length||q.cases.length>32)fail('select rows');for(const[i,raw]of (q.cases as unknown[]).entries()){const r=fields(raw,['when','value'],['value']);if(i===(q.cases as unknown[]).length-1?r.when!==undefined:r.when===undefined)fail('select final fallback');if(r.when!==undefined)condition(r.when);validateScalarRead(r.value,d);}}
  else if(q.kind==='tuning'||q.kind==='label'){fields(q,['kind','key']);name(q.key);}
  else if(q.kind==='duration'){fields(q,['kind','value','unit','round']);if(q.unit!=='seconds'||q.round!=='nearest')fail('duration format');validateScalarRead(q.value,d);}
  else fail('kind');
 }
 const visiting=new Set<string>(),done=new Set<string>();
 function visit(id:string,depth=0){if(depth>=32||visiting.has(id))fail('cycle/budget '+id);if(done.has(id))return;visiting.add(id);function walk(v:unknown){if(!v||typeof v!=='object')return;if(own(v,'query'))visit(String((v as {query:unknown}).query),depth+1);for(const c of Object.values(v))walk(c);}walk(queries[id]);visiting.delete(id);done.add(id);}
 Object.keys(queries).forEach(id=>visit(id));
 for(const q of Object.values(queries))if((q.kind==='duration'||q.kind==='remainder')&&!numericScalarRead(q.value,d))fail('duration requires numeric milliseconds');
}
/** Validate only against the assembled prospective source, including unsaved tuning/label edits. */
export function validateGameplayQuerySources(d:GameplayDefinition,data:Pick<SceneData,'tuning'|'texts'> & Partial<Pick<SceneData,'devices'|'nodes'|'camera'>>){
 for(const q of Object.values(d.queries??{})){
  if(q.kind==='collection'){if(!data.camera||!Array.isArray(data.camera.crates)||new Set(data.camera.crates.map(row=>row.id)).size!==data.camera.crates.length)fail('camera collection source');if(q.read.kind==='lineRef'){if(!lineValue(data.texts[q.read.fallback]))fail('line fallback '+q.read.fallback);for(const row of data.camera!.crates){const key=q.read.prefix+row.id;if(own(data.texts,key)&&!lineValue(data.texts[key]))fail('optional collection line '+key);}}}
  if(q.kind==='wirePresent'){const nouns=[...(data.devices??[]),...(data.nodes??[])].flatMap(dev=>dev.nouns.map(noun=>({key:dev.id+'.'+noun.id,noun}))),at=q.from.lastIndexOf(':'),source=nouns.find(n=>n.key===q.from.slice(0,at)),target=nouns.find(n=>n.key===q.to);if(at<0||!source?.noun.events?.includes(q.from.slice(at+1))||!target)fail('wire endpoint reference');if(q.verb!==undefined&&![...(target!.noun.verbs??[]),...(target!.noun.clock?['start','stop']:[])].includes(q.verb))fail('wire verb reference');}
  if(q.kind==='tuning'&&(!own(data.tuning,q.key)||typeof data.tuning[q.key]!=='number'||!Number.isFinite(data.tuning[q.key])))fail('tuning reference '+q.key);
  if(q.kind==='label'&&(!own(data.texts,q.key)||typeof data.texts[q.key]!=='string'))fail('label reference '+q.key);
 }
}

/** Line metadata stays in the existing source library; no second formatter. */
export function lineValue(value:unknown):value is [string,string,('ok'|'err'|'dim')?]{return Array.isArray(value)&&value.length>=2&&value.length<=3&&value.slice(0,2).every((v,i)=>typeof v==='string'&&(i===0||v.length>0)&&v.length<=2000)&&(value[2]===undefined||['ok','err','dim'].includes(value[2]));}
export function lineReferenceQuery(d:Pick<GameplayDefinition,'queries'>,id:string){const q=d.queries?.[id];return q?.kind==='collection'&&q.read.kind==='lineRef';}

/** Type lookup never initializes a foreign block or permits writing it. */
export const stateReadType=(d:GameplayDefinition,id:string)=>d.state?.[id]?.type??d.stateReads?.[id];
export const stateReadIds=(d:GameplayDefinition)=>[...Object.keys(d.state??{}),...Object.keys(d.stateReads??{})];
