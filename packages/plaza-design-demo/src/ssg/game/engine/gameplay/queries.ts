import type {SceneData} from '../../data/types';
import type {Condition,GameplayDefinition,GameplayState,StateValue} from './types';
import {stateValue} from './state';
import {matches} from './validation';

/** Scalar reads are immutable expressions, never another state declaration or save block. */
export type ScalarRead={literal:StateValue}|{state:string}|{query:string};
export type QueryDefinition=
 | {kind:'wirePresent';from:string;to:string;verb?:string}
 | {kind:'count';conditions:Condition[]}
 | {kind:'select';cases:{when?:Condition;value:ScalarRead}[]}
 | {kind:'tuning';key:string}
 | {kind:'label';key:string}
 | {kind:'duration';value:ScalarRead;unit:'seconds';round:'nearest'};
export interface GameplayReadContext {
 definition:Pick<GameplayDefinition,'queries'>;
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
 else if('state'in r){if(!own(d.state??{},name(r.state)))fail('state reference '+r.state);}
 else if(!own(d.queries??{},name(r.query)))fail('query reference '+r.query);
}
export function numericScalarRead(read:ScalarRead,d:GameplayDefinition,depth=0):boolean{
 if(depth>=32)return false;
 if('literal'in read)return typeof read.literal==='number';
 if('state'in read)return d.state?.[read.state]?.type==='number';
 const q=d.queries?.[read.query];if(!q)return false;
 return q.kind==='count'||q.kind==='tuning'||q.kind==='duration'||q.kind==='select'&&Array.isArray(q.cases)&&q.cases.every(row=>row.value&&numericScalarRead(row.value,d,depth+1));
}
export function validateGameplayQueries(d:GameplayDefinition,condition:(v:unknown)=>void){
 const queries=d.queries??{};object(queries);if(Object.keys(queries).length>64)fail('query count');
 for(const[id,raw]of Object.entries(queries)){
  name(id);if(own(d.state??{},id))fail('query shadows state '+id);const q=object(raw);
  if(q.kind==='wirePresent'){fields(q,['kind','from','to','verb'],['kind','from','to']);name(q.from);name(q.to);if(q.verb!==undefined)name(q.verb);}
  else if(q.kind==='count'){fields(q,['kind','conditions']);if(!Array.isArray(q.conditions)||!q.conditions.length||q.conditions.length>128)fail('count rows');(q.conditions as unknown[]).forEach(condition);}
  else if(q.kind==='select'){fields(q,['kind','cases']);if(!Array.isArray(q.cases)||!q.cases.length||q.cases.length>32)fail('select rows');for(const[i,raw]of (q.cases as unknown[]).entries()){const r=fields(raw,['when','value'],['value']);if(i===(q.cases as unknown[]).length-1?r.when!==undefined:r.when===undefined)fail('select final fallback');if(r.when!==undefined)condition(r.when);validateScalarRead(r.value,d);}}
  else if(q.kind==='tuning'||q.kind==='label'){fields(q,['kind','key']);name(q.key);}
  else if(q.kind==='duration'){fields(q,['kind','value','unit','round']);if(q.unit!=='seconds'||q.round!=='nearest')fail('duration format');validateScalarRead(q.value,d);}
  else fail('kind');
 }
 const visiting=new Set<string>(),done=new Set<string>();
 function visit(id:string,depth=0){if(depth>=32||visiting.has(id))fail('cycle/budget '+id);if(done.has(id))return;visiting.add(id);function walk(v:unknown){if(!v||typeof v!=='object')return;if(own(v,'query'))visit(String((v as {query:unknown}).query),depth+1);for(const c of Object.values(v))walk(c);}walk(queries[id]);visiting.delete(id);done.add(id);}
 Object.keys(queries).forEach(id=>visit(id));
 for(const q of Object.values(queries))if(q.kind==='duration'&&!numericScalarRead(q.value,d))fail('duration requires numeric milliseconds');
}
/** Validate only against the assembled prospective source, including unsaved tuning/label edits. */
export function validateGameplayQuerySources(d:GameplayDefinition,data:Pick<SceneData,'tuning'|'texts'> & Partial<Pick<SceneData,'devices'|'nodes'>>){
 for(const q of Object.values(d.queries??{})){
  if(q.kind==='wirePresent'){const nouns=[...(data.devices??[]),...(data.nodes??[])].flatMap(dev=>dev.nouns.map(noun=>({key:dev.id+'.'+noun.id,noun}))),at=q.from.lastIndexOf(':'),source=nouns.find(n=>n.key===q.from.slice(0,at)),target=nouns.find(n=>n.key===q.to);if(at<0||!source?.noun.events?.includes(q.from.slice(at+1))||!target)fail('wire endpoint reference');if(q.verb!==undefined&&![...(target!.noun.verbs??[]),...(target!.noun.clock?['start','stop']:[])].includes(q.verb))fail('wire verb reference');}
  if(q.kind==='tuning'&&(!own(data.tuning,q.key)||typeof data.tuning[q.key]!=='number'||!Number.isFinite(data.tuning[q.key])))fail('tuning reference '+q.key);
  if(q.kind==='label'&&(!own(data.texts,q.key)||typeof data.texts[q.key]!=='string'))fail('label reference '+q.key);
 }
}
