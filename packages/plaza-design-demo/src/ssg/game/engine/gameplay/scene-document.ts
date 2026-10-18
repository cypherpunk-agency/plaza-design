import {withSceneConversations,actorConversationId} from './scene-conversations';
import type {Condition,GameplayDefinition} from './types';
import {matches,validateGameplay} from './validation';
import type {SceneDef,SceneUse,UseCtx,ItemId,SceneSaid} from '../../scenes/kit';

export interface InteractionRoute {when?:Condition;command?:string;conversation?:string;pages?:string[];failure?:string[]}
export interface UseDocument {id:string;name:string;label:string;price?:number;purchase?:string;cycleState?:string;act?:string;cycle?:boolean;when?:Condition;routes:InteractionRoute[];items?:{item:string;label:string;routes:InteractionRoute[]}[]}
export interface SceneDocument {
  version:1;id:string;name:string;intro:string[];
  objectives?:{id:string;text:string;when?:Condition;target?:string;gentle?:boolean}[];
  time?:{when?:Condition;minute:number}[];
  uses:UseDocument[];
  readables?:{id:string;name:string;pages:string[];label?:string}[];
  people?:{id:string;name:string;talk:string[][];repeat?:'last'|'cycle'}[];
  exits?:{id:string;to:string;at?:string;label:string}[];
}
const fail=(m:string):never=>{throw new Error('Invalid scene document: '+m);};
const object=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype)fail('plain object required');return v as Record<string,unknown>;};
const fields=(v:unknown,allowed:string[],required:string[]=[])=>{const o=object(v);if(Object.keys(o).some(k=>!allowed.includes(k))||required.some(k=>!(k in o)))fail('unexpected or missing field');return o;};
const text=(v:unknown)=>{if(typeof v!=='string'||!v.trim()||v.length>2000)fail('bounded nonempty text required');};
const list=(v:unknown,max=32)=>{if(!Array.isArray(v)||!v.length||v.length>max)fail('bounded nonempty array required');return v as unknown[];};
const pages=(v:unknown)=>list(v,16).forEach(text);
export function validateSceneDocument(value:unknown,gameplay:GameplayDefinition):SceneDocument {
  const seen=new Set<object>();function plain(v:unknown,depth=0):void{if(depth>24)fail('nesting limit');if(v===null||['string','boolean'].includes(typeof v)||typeof v==='number'&&Number.isFinite(v))return;if(!v||typeof v!=='object'||seen.has(v))fail('finite JSON required');if(!Array.isArray(v))object(v);seen.add(v as object);for(const[k,child]of Object.entries(v as object)){if(['__proto__','prototype','constructor'].includes(k))fail('reserved field');plain(child,depth+1);}seen.delete(v as object);}plain(value);
  if(JSON.stringify(value).length>128000)fail('size limit');
  const d=fields(value,['version','id','name','intro','objectives','time','uses','readables','people','exits'],['version','id','name','intro','uses']);if(d.version!==1)fail('version');text(d.id);text(d.name);pages(d.intro);
  const condition=(c:unknown,flagsOnly=false)=>{if(c===undefined)return;validateGameplay({version:1,flags:gameplay.flags,items:gameplay.items,...(gameplay.state?{state:gameplay.state}:{}),events:[],commands:{check:{sources:['interaction'],when:c,actions:[]}},reactions:[],conversations:{}});const flags=(v:Condition):boolean=>'flag'in v||'all'in v&&v.all.every(flags)||'any'in v&&v.any.every(flags)||'not'in v&&flags(v.not);if(flagsOnly&&!flags(c as Condition))fail('availability/objectives/time use flags only');};
  function ordered(rows:unknown[]){if(object(rows.at(-1)).when!==undefined||rows.slice(0,-1).some(r=>object(r).when===undefined))fail('ordered routes require exactly one final fallback');}
  function routes(value:unknown,cycle=false){const rows=list(value);if(cycle){if(rows.some(r=>object(r).when!==undefined||object(r).conversation!==undefined))fail('cycles require unconditional command/page routes');}else ordered(rows);for(const row of rows){const r=fields(row,['when','command','conversation','pages','failure']);condition(r.when);if(r.conversation!==undefined){if(!Object.prototype.hasOwnProperty.call(gameplay.conversations,String(r.conversation))||r.command!==undefined||r.pages!==undefined||r.failure!==undefined)fail('conversation reference');}else{pages(r.pages);if(r.command!==undefined&&!gameplay.commands[String(r.command)]?.sources.includes('interaction'))fail('interaction command permission/reference');if(r.failure!==undefined){if(r.command===undefined)fail('failure requires command');pages(r.failure);}}}}
  const ids=new Set<string>();for(const row of list(d.uses,32)){const u=fields(row,['id','name','label','price','purchase','cycleState','act','cycle','when','routes','items'],['id','name','label','routes']);text(u.id);if(ids.has(String(u.id)))fail('duplicate interaction');ids.add(String(u.id));text(u.name);text(u.label);condition(u.when,true);if(u.purchase!==undefined&&(!gameplay.purchases?.[String(u.purchase)]||u.price!==undefined))fail('purchase binding or duplicated price');if(u.cycleState!==undefined&&(!u.cycle||gameplay.state?.[String(u.cycleState)]?.type!=='number'))fail('cycle state reference');if(u.price!==undefined&&(!Number.isSafeInteger(u.price)||Number(u.price)<0||Number(u.price)>1000000))fail('price range');if(u.act!==undefined)text(u.act);if(u.cycle!==undefined&&typeof u.cycle!=='boolean')fail('cycle boolean');routes(u.routes,u.cycle===true);if(u.items!==undefined){if(!Array.isArray(u.items)||u.items.length>2)fail('at most two carried-item actions');const items=new Set<string>();for(const row of u.items as unknown[]){const i=fields(row,['item','label','routes'],['item','label','routes']);if(!gameplay.items.includes(String(i.item))||items.has(String(i.item)))fail('item reference/duplicate');items.add(String(i.item));text(i.label);routes(i.routes);}}}
  if(d.objectives!==undefined){const objectives=list(d.objectives);ordered(objectives);const goals=new Set<string>();for(const row of objectives){const g=fields(row,['id','text','when','target','gentle'],['id','text']);text(g.id);if(goals.has(String(g.id)))fail('duplicate objective');goals.add(String(g.id));text(g.text);condition(g.when,true);if(g.target!==undefined&&!ids.has(String(g.target)))fail('guidance target');if(g.gentle!==undefined&&typeof g.gentle!=='boolean')fail('gentle boolean');}}
  if(d.time!==undefined){const time=list(d.time);ordered(time);for(const row of time){const t=fields(row,['when','minute'],['minute']);condition(t.when,true);if(!Number.isInteger(t.minute)||Number(t.minute)<0||Number(t.minute)>1439)fail('minute range');}}
  for(const key of ['readables','people','exits'] as const){if(d[key]===undefined)continue;const rows=list(d[key]),seen=new Set<string>();for(const row of rows){const r=fields(row,key==='readables'?['id','name','pages','label']:key==='people'?['id','name','talk','repeat']:['id','to','at','label'],key==='readables'?['id','name','pages']:key==='people'?['id','name','talk']:['id','to','label']);text(r.id);if(seen.has(String(r.id)))fail('duplicate '+key);seen.add(String(r.id));if(key==='readables'){text(r.name);pages(r.pages);if(r.label!==undefined)text(r.label);}else if(key==='people'){text(r.name);list(r.talk,32).forEach(pages);if(r.repeat!==undefined&&!['last','cycle'].includes(String(r.repeat)))fail('conversation repeat policy');}else{text(r.to);if(r.at!==undefined)text(r.at);if(typeof r.label!=='string'||r.label.length>2000)fail('exit label');}}}
  const result=structuredClone(value) as SceneDocument;withSceneConversations(gameplay,result);return result;
}
/** Rotations are presentation-session state, deliberately separate from persistent player resources. */
export interface SceneCompileOptions {cycle?:{read(id:string):number;advance(id:string):void}}
export interface CompiledSceneDocument {uses:SceneUse[];objective?:(flags:Readonly<Record<string,boolean>>)=>string;attention?:(flags:Readonly<Record<string,boolean>>,positions?:Record<string,number>)=>{x:number;gentle?:boolean}|null;minute?:(flags:Readonly<Record<string,boolean>>)=>number}
export function compileSceneDocument(doc:SceneDocument & Required<Pick<SceneDocument,'objectives'|'time'>>,positions:Record<string,number>,talk:(c:UseCtx,id:string,goal:string)=>SceneSaid,options?:SceneCompileOptions):Required<CompiledSceneDocument>;
export function compileSceneDocument(doc:SceneDocument,positions:Record<string,number>,talk:(c:UseCtx,id:string,goal:string)=>SceneSaid,options?:SceneCompileOptions):CompiledSceneDocument;
export function compileSceneDocument(doc:SceneDocument,positions:Record<string,number>,talk:(c:UseCtx,id:string,goal:string)=>SceneSaid,options:SceneCompileOptions={}) {
  const test=(when:Condition|undefined,flags:Readonly<Record<string,boolean>>)=>matches(when,{flags:flags as Record<string,boolean>,items:{},tokens:0});
  const objectiveRow=(flags:Readonly<Record<string,boolean>>)=>doc.objectives!.find(g=>test(g.when,flags))!;
  const objective=(flags:Readonly<Record<string,boolean>>)=>objectiveRow(flags).text;
  const attention=(flags:Readonly<Record<string,boolean>>,at=positions)=>{const g=objectiveRow(flags);return g.target?{x:at[g.target],...(g.gentle?{gentle:true}:{})}:null;};
  const minute=(flags:Readonly<Record<string,boolean>>)=>doc.time!.find(t=>test(t.when,flags))!.minute;
  const execute=(routes:InteractionRoute[],c:UseCtx,cycle?:string,cycleState?:string):SceneSaid=>{
    if(!c.gameplay)throw new Error('Scene requires its gameplay session');
    const step=cycleState?Number(c.gameplay.state().values?.[cycleState]):cycle?(options.cycle?.read(cycle)??local.get(cycle)??0):0;
    const r=cycle?routes[step%routes.length]:routes.find(r=>matches(r.when,c.gameplay!.state()))!;
    if(r.conversation)return talk(c,r.conversation,doc.objectives?objective(c.flags):'');
    const ok=!r.command||c.gameplay.dispatch(r.command,'interaction').ok;
    if(ok&&cycle&&!cycleState){if(options.cycle)options.cycle.advance(cycle);else local.set(cycle,step+1);}
    return [...(!ok&&r.failure?r.failure:r.pages!)];
  };
  const local=new Map<string,number>();
  const uses:SceneUse[]=doc.uses.map(u=>({id:u.id,x:positions[u.id],name:u.name,label:u.label,...(u.purchase?{price:(_flags:Readonly<Record<string,boolean>>,session?:import('./session').GameplaySession)=>{if(!session)throw new Error('Purchase requires gameplay session');return session.quote(u.purchase!).quote;}}:u.price!==undefined?{price:u.price}:{}),...(u.act!==undefined?{act:u.act}:{}),...(u.when?{available:(flags:Readonly<Record<string,boolean>>)=>test(u.when,flags)}:{}),use:c=>execute(u.routes,c,u.cycle?u.id:undefined,u.cycleState),...(u.items?{items:u.items.map(i=>({item:i.item as ItemId,label:i.label,use:(c:UseCtx)=>execute(i.routes,c)}))}:{})}));
  return {uses,...(doc.objectives?{objective,attention}:{}),...(doc.time?{minute}:{})};
}
/** Authored text/routes bind to native geometry and actors; painting and actor order stay native. */
export function applyScenePresentation(scene:SceneDef,doc:SceneDocument):SceneDef {
  const merge=<T extends {id?:string}>(native:T[]|undefined,authored:{id:string}[]|undefined):T[]|undefined=>{
    if(!authored)return native;
    for(const row of authored)if(!native?.some(n=>n.id===row.id))throw new Error('Unknown scene binding: '+row.id);
    return native?.map(row=>({...row,...authored.find(a=>a.id===row.id)}));
  };
  const people=merge(scene.people,doc.people);if(doc.people)for(const person of people??[])if(person.id&&doc.people.some(p=>p.id===person.id))person.conversation=actorConversationId(doc.id,person.id);
  return {...scene,...(scene.gameplay?{gameplay:withSceneConversations(scene.gameplay,doc)}:{}),name:doc.name,intro:[...doc.intro],
    ...(doc.exits?{exits:merge(scene.exits,doc.exits)!}:{}),
    ...(doc.readables?{readables:merge(scene.readables,doc.readables)}:{}),
    ...(doc.people?{people}:{})};
}
