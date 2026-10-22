import {validateScenePresentation,type ScenePresentation} from './scene-presentation';
import {stateValue} from './state';
import {validateSceneCompanion,type SceneCompanion} from './scene-companion';
import {validateSceneEnvironment,type SceneEnvironment} from './scene-environment';
import {validateActors,type ActorDefinition} from './actors';
import {windowProblem} from '../../world/clock';
import {WEATHER_KINDS,type WeatherKind} from '../../world/weather';
import type {TimeWindow} from '../../data/types';
import {validateManifest,type SceneManifest} from './manifest-contract';
import {validateSceneStage,type SceneStage} from './scene-stage';
import {currentObjective,objectiveAttention,type ObjectiveDefinition} from './objectives';
import {evaluateAccess,validateAccess,type AccessRequirement} from './access';
import {withSceneConversations,actorConversationId} from './scene-conversations';
import type {Condition,GameplayDefinition} from './types';
import {matches,validateGameplay} from './validation';
import {sourceGameplay} from './shared-state';
import type {SceneDef,SceneUse,UseCtx,ItemId,SceneSaid} from '../../scenes/kit';
import type {NativeTargetDocument} from './native-targets';
import type {PresentationCue} from './presentation-signals';
import {validateGameplayText,renderGameplayText} from './text-template';
import {validateScenePhases,validateWash} from '../../story/story-shapes';
import type {ScenePhase,WashRule} from '../../story/story-rules';

export interface InteractionRoute {speaker?:string;template?:true;when?:Condition;command?:string;conversation?:string;pages?:string[];failure?:string[]}
/** Rotation cursors are ordinary declared state; no compiler-local progress is retained. */
export function rotationStateIds(gameplay:GameplayDefinition){return Object.entries(gameplay.state??{}).filter(([,s])=>s.type==='number'&&s.integer!==false&&!s.nullable&&typeof s.default==='number'&&Number.isSafeInteger(s.default)&&s.default>=0&&(s.min??-1000000)>=0).map(([id])=>id);}
export interface UseDocument {targetOrder?:'before-devices'|'after-devices';pricedLabel?:string;conversationPresentation?:'bubble'|'panel';promptH?:number;h?:number;speakerKind?:'character'|'device'|'system';id:string;name:string;label:string;price?:number;purchase?:string;cycleState?:string;act?:string;cycle?:boolean;when?:Condition;access?:AccessRequirement[];routes:InteractionRoute[];items?:{item:string;label:string;routes:InteractionRoute[]}[]}
export type ScenePerson={id:string;name:string;promptH?:number}&({talk:string[][];lines?:{when?:TimeWindow;weather?:WeatherKind[];condition?:Condition;pages:string[]}[];repeat?:'last'|'cycle';conversation?:never}|{conversation:string;talk?:never;lines?:never;repeat?:never});
export interface SceneDocument {
  version:1;id:string;name:string;intro:string[];introTouch?:string[];manifest?:SceneManifest;
  /** What the scene takes from its artwork: facing, shade, lights, casters, actor rules (scene-stage.ts). */
  stage?:SceneStage;
  /** What this scene says and does in each phase of the story (story/story-rules.ts `ScenePhase`; the phase ids are the story's `PHASES`). */
  phases?:Record<string,ScenePhase>;
  /** The room's light cue: the first rule that holds sets the wash (story-rules.ts `washTone`). */
  wash?:WashRule[];
  environment?:SceneEnvironment;companion?:SceneCompanion;presentation?:ScenePresentation;
  actors?:ActorDefinition[];
  nativeTargets?:NativeTargetDocument[];
  cues?:PresentationCue[];
  objectives?:ObjectiveDefinition[];
  /**
   * The story clock, first matching row: `minute` pins the city clock there; `rate` lets it run on from where it is (no jump),
   * at `rate` times the city's usual speed, holding once it reaches `until` (a minute of the day) if given.
   */
  time?:{when?:Condition;minute?:number;rate?:number;until?:number}[];
  /** The story's day, first matching row; the final fallback may leave `day` out: the clock's own day (a running clock passes midnight itself). */
  timeDay?:{when?:Condition;day?:number}[];
  uses:UseDocument[];
  rests?:{id:string;kind:'bench'|'stool'|'bed';promptH?:number;h?:number}[];
  readables?:{id:string;name:string;pages:string[];label?:string;promptH?:number}[];
  people?:ScenePerson[];
  exits?:{id:string;to:string;at?:string;label:string;promptH?:number;action?:'board'|'out'|'taxi'|'map';engine?:boolean;sets?:string;edge?:'left'|'right';requires?:string;needs?:{key:string;name:string;pages:string[];h:number}}[];
}
const fail=(m:string):never=>{throw new Error('Invalid scene document: '+m);};
const object=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype)fail('plain object required');return v as Record<string,unknown>;};
const fields=(v:unknown,allowed:string[],required:string[]=[])=>{const o=object(v);if(Object.keys(o).some(k=>!allowed.includes(k))||required.some(k=>!(k in o)))fail('unexpected or missing field');return o;};
const text=(v:unknown)=>{if(typeof v!=='string'||!v.trim()||v.length>2000)fail('bounded nonempty text required');};
const list=(v:unknown,max=32)=>{if(!Array.isArray(v)||!v.length||v.length>max)fail('bounded nonempty array required');return v as unknown[];};
const pages=(v:unknown)=>list(v,16).forEach(text);
const responsePages=(v:unknown)=>{if(Array.isArray(v)&&v.length===0)return;pages(v);};
export function validateSceneDocument(value:unknown,gameplay:GameplayDefinition,options:{actors?:boolean;manifest?:boolean;nativeTargets?:(doc:SceneDocument,gameplay:GameplayDefinition)=>void;presentationTargets?:readonly string[]}={}):SceneDocument {
  const seen=new Set<object>();function plain(v:unknown,depth=0):void{if(depth>24)fail('nesting limit');if(v===null||['string','boolean'].includes(typeof v)||typeof v==='number'&&Number.isFinite(v))return;if(!v||typeof v!=='object'||seen.has(v))fail('finite JSON required');if(!Array.isArray(v))object(v);seen.add(v as object);for(const[k,child]of Object.entries(v as object)){if(['__proto__','prototype','constructor'].includes(k))fail('reserved field');plain(child,depth+1);}seen.delete(v as object);}plain(value);
  if(JSON.stringify(value).length>128000)fail('size limit');
  const d=fields(value,['version','id','name','intro','introTouch','environment','stage','phases','wash','presentation','companion','actors','nativeTargets','cues','manifest','objectives','time','timeDay','uses','readables','people','exits','rests'],['version','id','name','intro','uses']);if(d.version!==1)fail('version');text(d.id);text(d.name);responsePages(d.intro);if(d.introTouch!==undefined)pages(d.introTouch);if(d.nativeTargets!==undefined&&!options.nativeTargets)fail('engine targets require their registered adapter');if(d.manifest!==undefined){if(!options.manifest)fail('manifest requires its registered declared-scene adapter');validateManifest(d.manifest);}
  if(d.companion!==undefined)validateSceneCompanion(d.companion);
  if(d.stage!==undefined)validateSceneStage(d.stage);
  if(d.phases!==undefined)validateScenePhases(d.phases);
  if(d.wash!==undefined)validateWash(d.wash);
  if(d.environment!==undefined)validateSceneEnvironment(d.environment,String(d.id));
  if(d.actors!==undefined){if(!options.actors)fail('actors require their registered adapter');validateActors(d.actors);}
  if(d.presentation!==undefined)validateScenePresentation(d.presentation,String(d.id),gameplay,((d.actors??[])as ActorDefinition[]).map(a=>a.id));
  const condition=(c:unknown,flagsOnly=false)=>{if(c===undefined)return;const own=sourceGameplay(gameplay);validateGameplay({version:1,flags:gameplay.flags,items:gameplay.items,...(own.state?{state:own.state}:{}),...(gameplay.sharedState?{sharedState:gameplay.sharedState}:{}),...(gameplay.queries?{queries:gameplay.queries}:{}),...(gameplay.stateReads?{stateReads:gameplay.stateReads}:{}),events:[],commands:{check:{sources:['interaction'],when:c,actions:[]}},reactions:[],conversations:{}});const flags=(v:Condition):boolean=>'flag'in v||'state'in v||'all'in v&&v.all.every(flags)||'any'in v&&v.any.every(flags)||'not'in v&&flags(v.not);if(flagsOnly&&!flags(c as Condition))fail('availability and time read flags and saved state only');};
  function ordered(rows:unknown[]){if(object(rows.at(-1)).when!==undefined||rows.slice(0,-1).some(r=>object(r).when===undefined))fail('ordered routes require exactly one final fallback');}
  function routes(value:unknown,cycle=false){const rows=list(value);if(cycle){if(rows.some(r=>object(r).when!==undefined||object(r).conversation!==undefined))fail('cycles require unconditional command/page routes');}else ordered(rows);for(const row of rows){const r=fields(row,['when','command','conversation','pages','failure','template','speaker']);condition(r.when);if(r.speaker!==undefined)text(r.speaker);if(r.template!==undefined&&r.template!==true)fail('text template boolean');if(r.conversation!==undefined){if(!Object.prototype.hasOwnProperty.call(gameplay.conversations,String(r.conversation))||r.command!==undefined||r.pages!==undefined||r.failure!==undefined||r.template!==undefined||r.speaker!==undefined)fail('conversation reference');}else{responsePages(r.pages);if(r.command!==undefined&&!gameplay.commands[String(r.command)]?.sources.includes('interaction'))fail('interaction command permission/reference');if(r.failure!==undefined){if(r.command===undefined)fail('failure requires command');responsePages(r.failure);}if(r.template){validateGameplayText(r.pages as string[],gameplay);if(r.failure)validateGameplayText(r.failure as string[],gameplay);}}}}
  const objectiveIds=new Set((d.objectives as ObjectiveDefinition[]|undefined)?.map(o=>o.id)??[]);
  const checkConditionObjectives=(c:unknown,insideObjective=false):void=>{if(!c||typeof c!=='object')return;const condition=c as Condition;if('objective'in condition){if(insideObjective)fail('objective rules cannot depend on their own objective context');if(!objectiveIds.has(condition.objective))fail('unknown objective condition reference');}else if('not'in condition)checkConditionObjectives(condition.not,insideObjective);else if('all'in condition||'any'in condition)for(const child of 'all'in condition?condition.all:condition.any)checkConditionObjectives(child,insideObjective);};
  const checkObjectives=(value:unknown):void=>{if(!value||typeof value!=='object')return;for(const[key,child]of Object.entries(value)){if(key==='when')checkConditionObjectives(child);checkObjectives(child);}};
  checkObjectives(gameplay);for(const interval of Object.values(gameplay.native?.intervals??{}))checkConditionObjectives(interval.active);for(const deadline of Object.values(gameplay.native?.deadlines??{})){checkConditionObjectives(deadline.armWhen);checkConditionObjectives(deadline.while);}for(const person of d.people as ScenePerson[]|undefined??[])for(const line of person.lines??[])checkConditionObjectives(line.condition);for(const row of d.objectives as ObjectiveDefinition[]|undefined??[])checkConditionObjectives(row.when,true);for(const[key,value]of Object.entries(d))if(key!=='objectives')checkObjectives(value);
  const ids=new Set<string>();for(const row of (Array.isArray(d.uses)&&d.uses.length===0?[]:list(d.uses,32))){const u=fields(row,['id','name','label','pricedLabel','conversationPresentation','targetOrder','speakerKind','promptH','h','price','purchase','cycleState','act','cycle','when','access','routes','items'],['id','name','label','routes']);for(const key of ['promptH','h'])if(u[key]!==undefined&&(typeof u[key]!=='number'||!Number.isFinite(u[key])||Number(u[key])<0||Number(u[key])>10000))fail('interaction height');if(u.speakerKind!==undefined&&!['character','device','system'].includes(String(u.speakerKind)))fail('speaker kind');text(u.id);if(ids.has(String(u.id)))fail('duplicate interaction');ids.add(String(u.id));text(u.name);text(u.label);if(u.targetOrder!==undefined&&!['before-devices','after-devices'].includes(String(u.targetOrder)))fail('interaction target order');if(u.pricedLabel!==undefined)text(u.pricedLabel);if(u.conversationPresentation!==undefined&&!['bubble','panel'].includes(String(u.conversationPresentation)))fail('conversation presentation');condition(u.when,true);if(u.access!==undefined)validateAccess(u.access,gameplay);if(u.purchase!==undefined&&(!gameplay.purchases?.[String(u.purchase)]||u.price!==undefined))fail('purchase binding or duplicated price');if(u.cycle===true&&!rotationStateIds(gameplay).includes(String(u.cycleState))||u.cycleState!==undefined&&!u.cycle)fail('rotation requires an explicit non-negative integer state');if(u.price!==undefined&&(!Number.isSafeInteger(u.price)||Number(u.price)<0||Number(u.price)>1000000))fail('price range');if(u.act!==undefined)text(u.act);if(u.cycle!==undefined&&typeof u.cycle!=='boolean')fail('cycle boolean');routes(u.routes,u.cycle===true);if(u.items!==undefined){if(!Array.isArray(u.items)||u.items.length>2)fail('at most two carried-item actions');const items=new Set<string>();for(const row of u.items as unknown[]){const i=fields(row,['item','label','routes'],['item','label','routes']);if(!gameplay.items.includes(String(i.item))||items.has(String(i.item)))fail('item reference/duplicate');items.add(String(i.item));text(i.label);routes(i.routes);}}}
  if(d.objectives!==undefined){const objectives=list(d.objectives);ordered(objectives);const goals=new Set<string>();for(const row of objectives){const g=fields(row,['id','text','when','target','gentle'],['id','text']);text(g.id);if(goals.has(String(g.id)))fail('duplicate objective');goals.add(String(g.id));text(g.text);condition(g.when);if(g.target!==undefined&&!ids.has(String(g.target)))fail('guidance target');if(g.gentle!==undefined&&typeof g.gentle!=='boolean')fail('gentle boolean');}}
  if(d.timeDay!==undefined){const rows=list(d.timeDay);ordered(rows);for(const [i,row]of rows.entries()){const t=fields(row,['when','day'],i===rows.length-1?[]:['day']);condition(t.when,true);if(t.day!==undefined&&(!Number.isSafeInteger(t.day)||Number(t.day)<1||Number(t.day)>10000))fail('day range');}}
  if(d.time!==undefined){const time=list(d.time);ordered(time);for(const row of time){const t=fields(row,['when','minute','rate','until']);condition(t.when,true);if((t.minute===undefined)===(t.rate===undefined))fail('story clock row: a minute (pin) or a rate (runs)');const minute=(m:unknown)=>{if(!Number.isInteger(m)||Number(m)<0||Number(m)>1439)fail('minute range');};if(t.minute!==undefined)minute(t.minute);if(t.rate!==undefined&&(typeof t.rate!=='number'||!Number.isFinite(t.rate)||t.rate<=0||t.rate>60))fail('clock rate range');if(t.until!==undefined){if(t.rate===undefined)fail('until requires a rate');minute(t.until);}}}
  if(d.rests!==undefined){const seen=new Set<string>();for(const row of list(d.rests)){const r=fields(row,['id','kind','promptH','h'],['id','kind']);text(r.id);if(seen.has(String(r.id)))fail('duplicate rest');seen.add(String(r.id));if(!['bench','stool','bed'].includes(String(r.kind)))fail('rest kind');for(const key of ['promptH','h'])if(r[key]!==undefined&&(typeof r[key]!=='number'||!Number.isFinite(r[key])||Number(r[key])<0||Number(r[key])>10000))fail('rest height');}}
  for(const key of ['readables','people','exits'] as const){if(d[key]===undefined)continue;const rows=list(d[key]),seen=new Set<string>();for(const row of rows){const r=fields(row,key==='readables'?['id','name','pages','label','promptH']:key==='people'?['id','name','promptH','talk','repeat','lines','conversation']:['id','to','at','label','action','promptH','engine','sets','edge','requires','needs'],key==='readables'?['id','name','pages']:key==='people'?['id','name']:['id','to','label']);if(r.promptH!==undefined&&(typeof r.promptH!=='number'||!Number.isFinite(r.promptH)||r.promptH<0||r.promptH>10000))fail('prompt height');text(r.id);if(seen.has(String(r.id)))fail('duplicate '+key);seen.add(String(r.id));if(key==='readables'){text(r.name);pages(r.pages);if(r.label!==undefined)text(r.label);}else if(key==='people'){text(r.name);if(r.conversation!==undefined){text(r.conversation);if(!Object.prototype.hasOwnProperty.call(gameplay.conversations,String(r.conversation))||r.talk!==undefined||r.repeat!==undefined||r.lines!==undefined)fail('person conversation reference requires one existing graph and no duplicate pages');}else list(r.talk,32).forEach(pages);if(r.lines!==undefined){for(const raw of list(r.lines,32)){const line=fields(raw,['when','weather','condition','pages'],['pages']);pages(line.pages);condition(line.condition);if(line.when!==undefined&&windowProblem(line.when))fail('actor time window');if(line.weather!==undefined&&(!Array.isArray(line.weather)||!line.weather.length||line.weather.some(w=>!WEATHER_KINDS.includes(w as WeatherKind))))fail('actor weather');}}if(r.repeat!==undefined&&!['last','cycle'].includes(String(r.repeat)))fail('conversation repeat policy');}else{if(r.requires!==undefined&&!gameplay.flags.includes(String(r.requires)))fail('exit flag reference');if(r.needs!==undefined){const n=fields(r.needs,['key','name','pages','h'],['key','name','pages','h']);text(n.key);text(n.name);pages(n.pages);if(typeof n.h!=='number'||!Number.isFinite(n.h)||n.h<0||n.h>10000)fail('exit refusal height');}if(r.engine!==undefined&&typeof r.engine!=='boolean')fail('engine exit boolean');if(r.sets!==undefined)text(r.sets);if(r.edge!==undefined&&!['left','right'].includes(String(r.edge)))fail('exit edge');if(r.action!==undefined&&!['board','out','taxi','map'].includes(String(r.action)))fail('exit action');if(r.to!==''||r.action===undefined)text(r.to);if(r.at!==undefined)text(r.at);if(typeof r.label!=='string'||r.label.length>2000)fail('exit label');}}}
  if(d.cues!==undefined){if(!options.presentationTargets)fail('presentation cues require a registered adapter');if(!Array.isArray(d.cues)||d.cues.length>32)fail('cue list');const seen=new Set<string>();for(const row of d.cues as unknown[]){const c=fields(row,['event','target'],['event','target']);if(!gameplay.events.includes(String(c.event))||!options.presentationTargets!.includes(String(c.target)))fail('presentation cue reference');const key=JSON.stringify([c.event,c.target]);if(seen.has(key))fail('duplicate presentation cue');seen.add(key);}}
  const result=structuredClone(value) as SceneDocument;options.nativeTargets?.(result,gameplay);withSceneConversations(gameplay,result);return result;
}
export interface CompiledSceneDocument {uses:SceneUse[];objectives?:readonly ObjectiveDefinition[];objective?:(flags:Readonly<Record<string,boolean>>,state?:import('./types').GameplayState)=>string;attention?:(flags:Readonly<Record<string,boolean>>,positions?:Record<string,number>,state?:import('./types').GameplayState)=>{x:number;gentle?:boolean}|null;minute?:(flags:Readonly<Record<string,boolean>>,state?:import('./types').GameplayState)=>number|undefined;day?:(flags:Readonly<Record<string,boolean>>,state?:import('./types').GameplayState)=>number|undefined;run?:(flags:Readonly<Record<string,boolean>>,state?:import('./types').GameplayState)=>{rate:number;until?:number}|undefined}
export function compileSceneDocument(doc:SceneDocument & Required<Pick<SceneDocument,'objectives'|'time'>>,positions:Record<string,number>,talk:(c:UseCtx,id:string,goal:string)=>SceneSaid):Required<Omit<CompiledSceneDocument,'day'>> & Pick<CompiledSceneDocument,'day'>;
export function compileSceneDocument(doc:SceneDocument,positions:Record<string,number>,talk:(c:UseCtx,id:string,goal:string)=>SceneSaid):CompiledSceneDocument;
export function compileSceneDocument(doc:SceneDocument,positions:Record<string,number>,talk:(c:UseCtx,id:string,goal:string)=>SceneSaid):CompiledSceneDocument {
  // availability and the story clock read flags and saved state (a world-level owner's too, e.g. the shift's `shift.*`): `state` is the session's
  // (`state` defaults to undefined rather than being optional, so these functions keep their one required argument)
  const test=(when:Condition|undefined,flags:Readonly<Record<string,boolean>>,state?:import('./types').GameplayState)=>matches(when,state??{flags:flags as Record<string,boolean>,items:{},tokens:0});
  const objectiveRow=(flags:Readonly<Record<string,boolean>>,state?:import('./types').GameplayState)=>currentObjective(doc.objectives!,state??{flags:flags as Record<string,boolean>,items:{},tokens:0})!;
  const objective=(flags:Readonly<Record<string,boolean>>,state?:import('./types').GameplayState)=>objectiveRow(flags,state).text;
  const attention=(flags:Readonly<Record<string,boolean>>,at=positions,state?:import('./types').GameplayState)=>{return objectiveAttention(objectiveRow(flags,state),at);};
  const day=(flags:Readonly<Record<string,boolean>>,state:import('./types').GameplayState|undefined=undefined)=>doc.timeDay!.find(t=>test(t.when,flags,state))!.day;
  /** The story clock's row: a pin (`minute`) or a run (`rate`, `until`). */
  const clockRow=(flags:Readonly<Record<string,boolean>>,state:import('./types').GameplayState|undefined=undefined)=>doc.time!.find(t=>test(t.when,flags,state))!;
  const minute=(flags:Readonly<Record<string,boolean>>,state:import('./types').GameplayState|undefined=undefined)=>clockRow(flags,state).minute;
  const run=(flags:Readonly<Record<string,boolean>>,state:import('./types').GameplayState|undefined=undefined)=>{const r=clockRow(flags,state);return r.rate===undefined?undefined:{rate:r.rate,...(r.until!==undefined?{until:r.until}:{})};};
  const execute=(routes:InteractionRoute[],c:UseCtx,cycle?:string,cycleState?:string,access:AccessRequirement[]=[]):SceneSaid=>{
    const permission=evaluateAccess(access,{state:c.gameplay?.state()??{flags:c.flags,items:{},tokens:0},reads:c.gameplay?.queryContext(),eligibility:id=>c.gameplay?.eligibility(id,'interaction')??{ok:false}});if(!permission.ok)return [permission.reason];
    if(!c.gameplay)throw new Error('Scene requires its gameplay session');
    const step=cycleState?stateValue(c.gameplay.state().values,cycleState):0;
    if(cycle&&!cycleState||typeof step!=='number'||!Number.isSafeInteger(step)||step<0)throw Error('Interaction rotation requires non-negative integer state: '+cycleState);
    const r=cycle?routes[step%routes.length]:routes.find(r=>c.gameplay!.matches(r.when))!;
    if(r.conversation)return talk(c,r.conversation,doc.objectives?objective(c.flags,c.gameplay.state()):'');
    const ok=!r.command||c.gameplay.dispatch(r.command,'interaction').ok;
    const pages=!ok&&r.failure?r.failure:r.pages!,rendered=r.template?renderGameplayText(pages,c.gameplay.state(),{},c.gameplay.queryContext()):[...pages];return r.speaker?{name:r.speaker,pages:rendered}:rendered;
  };
  const uses:SceneUse[]=doc.uses.map(u=>({id:u.id,x:positions[u.id],name:u.name,label:u.label,...(u.targetOrder?{targetOrder:u.targetOrder}:{}),...(u.pricedLabel!==undefined?{pricedLabel:u.pricedLabel}:{}),...(u.conversationPresentation?{conversationPresentation:u.conversationPresentation}:{}),...(u.promptH!==undefined?{promptH:u.promptH}:{}),...(u.h!==undefined?{h:u.h}:{}),...(u.speakerKind?{speakerKind:u.speakerKind}:{}),...(u.access?{eligibility:(flags:Readonly<Record<string,boolean>>,session?:import('./session').GameplaySession)=>evaluateAccess(u.access!,{state:session?.state()??{flags:flags as Record<string,boolean>,items:{},tokens:0},reads:session?.queryContext(),eligibility:id=>session?.eligibility(id,'interaction')??{ok:false}})}:{}),...(u.purchase?{price:(_flags:Readonly<Record<string,boolean>>,session?:import('./session').GameplaySession)=>{if(!session)throw new Error('Purchase requires gameplay session');return session.quote(u.purchase!).quote;}}:u.price!==undefined?{price:u.price}:{}),...(u.act!==undefined?{act:u.act}:{}),...(u.when?{available:(flags:Readonly<Record<string,boolean>>,state:import('./types').GameplayState|undefined=undefined)=>test(u.when,flags,state)}:{}),use:c=>execute(u.routes,c,u.cycle?u.id:undefined,u.cycleState,u.access),...(u.items?{items:u.items.map(i=>({item:i.item as ItemId,label:i.label,use:(c:UseCtx)=>execute(i.routes,c,undefined,undefined,u.access)}))}:{})}));
  return {uses,...(doc.objectives?{objectives:doc.objectives,objective,attention}:{}),...(doc.time?{minute,run}:{}),...(doc.timeDay?{day}:{})};
}
/** Authored text/routes bind to native geometry and actors; painting and actor order stay native. */
export function applyScenePresentation(scene:SceneDef,doc:SceneDocument):SceneDef {
  const merge=<T extends {id?:string}>(native:T[]|undefined,authored:{id:string}[]|undefined):T[]|undefined=>{
    if(!authored)return native;
    for(const row of authored)if(!native?.some(n=>n.id===row.id))throw new Error('Unknown scene binding: '+row.id);
    return native?.map(row=>({...row,...authored.find(a=>a.id===row.id)}));
  };
  const people=merge(scene.people,doc.people);if(doc.people)for(const person of people??[])if(person.id&&doc.people.some(p=>p.id===person.id)){const source=doc.people.find(p=>p.id===person.id)!;person.conversation=source.conversation??actorConversationId(doc.id,person.id);if(source.conversation!==undefined){person.talk=[];delete person.lines;}}
  return {...scene,...(scene.gameplay?{gameplay:withSceneConversations(scene.gameplay,doc)}:{}),name:doc.name,intro:doc.introTouch?(touch:boolean)=>[...(touch?doc.introTouch!:doc.intro)]:doc.intro.length?[...doc.intro]:undefined,
    ...(doc.exits?{exits:merge(scene.exits,doc.exits)!}:{}),
    ...(doc.readables?{readables:merge(scene.readables,doc.readables)}:{}),
    ...(doc.rests?{rests:merge(scene.rests,doc.rests)}:{}),
    ...(doc.people?{people}:{})};
}
