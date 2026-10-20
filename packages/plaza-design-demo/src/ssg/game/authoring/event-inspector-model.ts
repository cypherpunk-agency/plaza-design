import {FOLDER_SOURCES} from '../scenes/folder-scenes';
import {stateAddress} from '../engine/gameplay/state';
import authoredCatalogue from '../scenes/authored.json';
import {projectSceneState} from '../engine/gameplay/scene-state';
import {defaultNetworkContext,type EngineNetworkContext} from '../engine/network-context';
import type {GameplayDefinition} from '../engine/gameplay/types';
import {deviceSceneIds,deviceDocumentId,validateDeviceSource,applyDeviceSource} from './device-sources';
import{sourceDocuments}from'./source-documents';

/** Read-only projection of the actual registries. This module never constructs or calls SceneModel. */

import {SCENES}from'../scenes';

import {LOGIC}from'../data';

import type{Action,Case,DeviceData,SceneData}from'../data/types';

import {ENGINE_EFFECTS,type SceneRules}from'../engine/rules';

import {DOWNTOWN_RULES_SHAPE}from'../scenes/downtown/rules';

import {STACKS_RULES_SHAPE}from'../scenes/stacks/rules';

import type{Composition,Instance}from'../art/core/composition';

import type{TimelineDocument}from'../art/core/timeline';

import type{EditorDocument}from'./app';



export type InspectionStatus='declared'|'active'|'inactive'|'blocked'|'missing'|'unbound'|'opaque';

export type ConnectionKind='contains'|'trigger'|'conditional'|'action'|'signal'|'network'|'travel'|'attachment'|'handoff';

export interface EventSource{file:string;pointer?:string;symbol?:string}

export interface EventNode{id:string;scene:string;kind:string;label:string;status:InspectionStatus;reason:string;source:EventSource;details:unknown;instanceId?:string}

export interface EventEdge{id:string;scene:string;kind:ConnectionKind;from:string;to:string;label:string;status:InspectionStatus;reason:string;source:EventSource}

/** Prepared by a trusted runtime probe outside this inspector; expression/context must match exactly. */

export interface CapturedCondition{origin:'captured-runtime';scene:string;device?:string;noun?:string;expression:string;result:boolean}

export interface EventInspectorSnapshots{conditions?:Readonly<Record<string,CapturedCondition>>;states?:Readonly<Record<string,{origin:'captured-runtime';scene:string;status:'active'|'inactive'|'blocked';reason:string}>>}

export interface EventInspectionOptions{documents?:readonly EditorDocument[];network?:EngineNetworkContext;snapshots?:EventInspectorSnapshots}

export interface EventInspection{nodes:EventNode[];edges:EventEdge[];scenes:string[];diagnostics:string[];coverage:{sceneCount:number;declarativeScenes:number;compositionDocuments:number;timelineSequences:number;opaqueNodes:number;missingNodes:number;conditionCount:number}}

const dirs=(id:string)=>id==='harborShift'?'harbor-shift':id;

const source=(scene:string,pointer?:string):EventSource=>AUTHORED.has(scene)?{file:'scenes/authored.json',pointer:'/scenes/'+AUTHORED.get(scene)+'/devices'+(pointer??'')}:scene==='library'&&pointer?.startsWith('/dialogue/catalog')?{file:'scenes/library/gameplay.json',pointer:'/conversations/catalog'}:({file:scene==='@net'?'data/net.json':scene==='@logic'?'data/logic.json':`scenes/${dirs(scene)}/devices.json`,...(pointer?{pointer}:{})});

/** Catalogue scenes have no code of their own: their source is their entry in scenes/authored.json. */
const AUTHORED=new Map((authoredCatalogue as {scenes:{scene:{id:string}}[]}).scenes.map((s,i)=>[s.scene.id,i]));
/** Folder scenes have no code either: their source is their scene document. */
const FOLDER=new Set(Object.keys(FOLDER_SOURCES));
const code=(scene:string,symbol:string):EventSource=>AUTHORED.has(scene)?{file:'scenes/authored.json',pointer:'/scenes/'+AUTHORED.get(scene),symbol}:FOLDER.has(scene)?{file:`scenes/${scene}/scene.json`,symbol}:({file:`scenes/${dirs(scene)}/${symbol.startsWith('SceneRules')?(scene==='yard'?'effects':'rules'):'index'}.ts`,symbol});

const pointer=(part:string|number)=>String(part).replace(/~/g,'~0').replace(/\//g,'~1');

const nodeKey=(scene:string,device:string,noun?:string)=>noun===undefined?`device:${scene}:${device}`:`noun:${scene}:${device}.${noun}`;

const eventKey=(scene:string,device:string,noun:string,event:string)=>`event:${scene}:${device}.${noun}:${event}`;

const plain=(value:unknown):unknown=>{if(typeof value==='function')return'[opaque code callback]';if(Array.isArray(value))return value.map(plain);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,plain(v)]));return value;};

const actions=['set','open','emit','goal','effect','give','take','trace','unseal']as const;

export function buildEventInspection(options:EventInspectionOptions={}):EventInspection{
 const network=options.network??defaultNetworkContext,net=network.net;

 const nodes:EventNode[]=[],edges:EventEdge[]=[],all=new Map<string,EventNode>(),diagnostics:string[]=[],definitions=new Map<string,DeviceData>(),shapes:Record<string,SceneRules>={downtown:DOWNTOWN_RULES_SHAPE,stacks:STACKS_RULES_SHAPE};

 const documentSources=new Map(sourceDocuments.map(d=>[d.id,d.file]));

 const docs=options.documents??[],compositions=docs.filter(d=>d.kind==='composition'),sequences=docs.filter(d=>d.kind==='timeline').flatMap(d=>(d.value as TimelineDocument).sequences.map((sequence,index)=>({sequence,index,document:d.id})));

 const put=(id:string,scene:string,kind:string,label:string,src:EventSource,details:unknown={},status:InspectionStatus='declared',reason='Source declaration; no execution is implied.')=>{const existing=all.get(id);if(existing&&kind==='missing-reference')return existing;const captured=options.snapshots?.states?.[id];const node:EventNode={id,scene,kind,label,source:src,details:plain(details),status,reason};if(captured?.origin==='captured-runtime'&&captured.scene===scene&&status!=='missing'&&status!=='opaque'){node.status=captured.status;node.reason=captured.reason;}if(existing){Object.assign(existing,node);return existing;}nodes.push(node);all.set(id,node);return node;};

 const requireRef=(id:string,scene:string,src:EventSource)=>all.get(id)??put(id,scene,'missing-reference',id,src,{},'missing','Referenced source definition does not exist in the frozen registries.');

 const edge=(scene:string,kind:ConnectionKind,from:string,to:string,label:string,src:EventSource)=>{const a=requireRef(from,scene,src),b=requireRef(to,scene,src),status:InspectionStatus=a.status==='missing'||b.status==='missing'?'missing':a.status==='blocked'||b.status==='blocked'?'blocked':a.status==='inactive'||b.status==='inactive'?'inactive':a.status==='opaque'||b.status==='opaque'?'opaque':'unbound';edges.push({id:`edge:${scene}:${kind}:${src.file}:${src.pointer??src.symbol??''}:${from}>${to}:${label}`,scene,kind,from,to,label,source:src,status,reason:status==='unbound'?'Declared relationship; runtime activation is not bound.':`${a.reason} ${b.reason}`});};

 const condition=(scene:string,parent:string,value:unknown,src:EventSource,device?:string,noun?:string)=>{if(value===undefined)return;const expression=typeof value==='string'?value:JSON.stringify(value),id=`condition:${scene}:${src.pointer??parent}`,captured=options.snapshots?.conditions?.[id];const trusted=captured?.origin==='captured-runtime'&&captured.scene===scene&&captured.device===device&&captured.noun===noun&&captured.expression===expression;put(id,scene,'condition',expression,src,{expression,device,noun},trusted?(captured.result?'active':'blocked'):'unbound',trusted?`Captured runtime condition is ${captured.result}; ordered case selection is still separate.`:'No exact matching captured runtime evaluation; expression is not executed.');edge(scene,'conditional',parent,id,src.pointer?.endsWith('/when')?'time window':'condition',src);};

 const nativeDocs=new Map<string,{definition:GameplayDefinition;file:string}>();for(const[id,def]of Object.entries(SCENES))if(def.gameplay?.native||def.gameplay?.checkpoint?.length){const descriptor=sourceDocuments.find(d=>d.id===id+'-gameplay')!,draft=docs.find(d=>d.id===descriptor.id);let definition=def.gameplay;try{if(draft)definition=descriptor.validate(draft.value) as GameplayDefinition;}catch{diagnostics.push('Rejected native gameplay draft for '+id+'; showing registered bindings.');}nativeDocs.set(id,{definition,file:descriptor.file});}
 const sceneData=new Map<string,SceneData>();
 for(const[id,def]of Object.entries(SCENES)){put('scene:'+id,id,'scene',def.name,code(id,'SceneDef'),{width:def.width,spawn:def.spawn});if(!def.data)continue;
  const definition=nativeDocs.get(id)?.definition??def.gameplay,seed={...def,gameplay:definition};let data=def.data;
  const candidate=deviceSceneIds.includes(id)?docs.find(d=>d.id===deviceDocumentId(id)):undefined;
  if(candidate)try{const composition=docs.find(d=>d.kind==='composition'&&(d.value as Composition).scene===id);data=composition?applyDeviceSource(id,seed,composition.value as Composition,candidate.value,network).data!:{...projectSceneState(validateDeviceSource(id,candidate.value,seed,network.net,network.keyring),definition??{}),dialogue:def.data.dialogue};}catch(error){diagnostics.push((id==='sandbox'?'Rejected Sandbox behavior draft: ':'Rejected device draft for '+id+': ')+(error instanceof Error?error.message:String(error))+'; showing registered source declarations.');}
  sceneData.set(id,definition?.native?.wires?{...data,cables:definition.native.wires}:data);
 }

 const actual=Object.keys(SCENES);


 for(const[id,data]of sceneData)for(const[item,i]of(data.keyring??[]).map((k,i)=>[k,i]as const))put(`item:${item.id}`,id,'keyring-item',item.label,source(id,'/keyring/'+i),item);

 net.keyring.forEach((item,i)=>put(`item:${item.id}`,'@net','keyring-item',item.label,source('@net','/keyring/'+i),item));

 net.programs.forEach((item,i)=>put(`item:${item.id}`,'@net','program',item.id,source('@net','/programs/'+i),item));

 LOGIC.modules.forEach((item,i)=>put(`item:${item.id}`,'@logic','logic-module',item.id,source('@logic','/modules/'+i),{start:item.start,foundIn:item.foundIn}));

 const registerDevice=(scene:string,d:DeviceData,path:string,latent=false)=>{const src=source(scene,path),id=nodeKey(scene,d.id);definitions.set(id,d);put(id,scene,latent?'latent-device':'device',`${d.id} · ${d.name}`,src,{id:d.id,name:d.name,state:d.state,layout:d.layout},latent?'unbound':'declared',latent?'Defined latent node/template; connection or placement needs a captured runtime snapshot.':'Device source declaration.');for(const[n,index]of d.nouns.map((n,i)=>[n,i]as const)){const np=path+'/nouns/'+index,nid=nodeKey(scene,d.id,n.id);put(nid,scene,'noun',`${d.id}.${n.id} · ${n.function}`,source(scene,np),n);edge(scene,'contains',id,nid,'noun',src);for(const[event,i]of(n.events??[]).map((e,i)=>[e,i]as const)){const eid=eventKey(scene,d.id,n.id,event);put(eid,scene,'event',`${d.id}.${n.id}:${event}`,source(scene,np+'/events/'+i),{event});edge(scene,'contains',nid,eid,'declares event',src);}}

  for(const[sector,i]of(d.sectors??[]).map((s,i)=>[s,i]as const))if('sequence'in sector.seal){const nid=nodeKey(scene,d.id,sector.id);put(nid,scene,'engine-noun',`${d.id}.${sector.id} · SEAL`,source(scene,path+'/sectors/'+i+'/seal'),{providedBy:'SceneModel.build',verbs:[...new Set(sector.seal.sequence)],implementation:{file:'engine/model.ts',symbol:'SceneModel.build'}},'unbound','Sequence seal noun generated by the engine; progress is not bound.');edge(scene,'contains',id,nid,'generated seal noun',src);}

  for(const[key,value]of Object.entries(d.state??{}))put(`state:${scene}:${d.id}:${key}`,scene,'state',`${d.id}.${key}`,source(scene,path+'/state/'+pointer(key)),{initial:value});};

 for(const[id,data]of sceneData){for(const[key,value]of Object.entries(data.state)){const shared=nativeDocs.get(id),qualified=id+'.'+key;put(`state:${id}:${key}`,id,'state',key,shared?{file:shared.file,pointer:'/state/'+pointer(qualified)}:code(id,'SceneDef.gameplay'),{initial:value});}data.devices.forEach((d,i)=>registerDevice(id,d,'/devices/'+i));data.nodes?.forEach((d,i)=>registerDevice(id,d,'/nodes/'+i,true));data.goals.forEach((g,i)=>put(`goal:${id}:${g.id}`,id,'goal',g.text,source(id,'/goals/'+i),g));}

 net.nodes.forEach((d,i)=>registerDevice('@net',d,'/nodes/'+i,true));LOGIC.modules.forEach((m,i)=>{put(`module:${m.id}`,'@logic','logic-template',m.id,source('@logic','/modules/'+i),{start:m.start,foundIn:m.foundIn,instancePolicy:'Runtime generates placed instance ids; this is the source template.'});registerDevice('@logic',m.part,'/modules/'+i+'/part',true);});

 const rulesFor=(scene:string)=>{const r=SCENES[scene as keyof typeof SCENES]?.rules;return typeof r==='object'?r:shapes[scene];};

 const registerWatch=(scene:string,route:string[]|undefined)=>{for(const device of route??[]){const own=all.has(nodeKey(scene,device))?scene:'@net',nid=nodeKey(own,device,'watchdog'),src:EventSource={file:'engine/model.ts',symbol:'SceneModel.build'};put(nid,own,'engine-noun',device+'.watchdog · WATCH',src,{verbs:['read'],routeSource:source(scene,'/watchdog')},'unbound','Engine-generated route noun; current watchdog position is not bound.');edge(own,'contains',nodeKey(own,device),nid,'generated watchdog noun',src);for(const event of['arrives','leaves']){const eid=eventKey(own,device,'watchdog',event);put(eid,own,'engine-event',device+'.watchdog:'+event,{file:'engine/watchdog.ts',symbol:'Watchdogs.tick'},{event},'unbound','Engine-generated event; no active route snapshot.');edge(own,'contains',nid,eid,'route event',src);}}};for(const[scene,data]of sceneData)registerWatch(scene,data.watchdog?.route);registerWatch('@net',net.watchdog?.route);

 const resolveNoun=(scene:string,raw:string,src:EventSource)=>{const dot=raw.indexOf('.'),device=raw.slice(0,dot),noun=raw.slice(dot+1);const local=nodeKey(scene,device,noun);return all.has(local)?local:all.has(nodeKey('@net',device,noun))?nodeKey('@net',device,noun):requireRef(local,scene,src).id;};

 const resolveEvent=(scene:string,raw:string,src:EventSource)=>{const split=raw.lastIndexOf(':'),noun=raw.slice(0,split),event=raw.slice(split+1),nid=resolveNoun(scene,noun,src);const node=all.get(nid)!;const dot=noun.indexOf('.'),device=noun.slice(0,dot),nounId=noun.slice(dot+1);const id=eventKey(node.scene,device,nounId,event);if(all.has(id))return id;return requireRef(id,scene,src).id;};

 const actionList=(scene:string,parent:string,list:Action[]|undefined,path:string,device='',noun='')=>{for(const[a,index]of(list??[]).map((a,i)=>[a,i]as const)){const p=path+'/'+index,kind=actions.find(k=>k in a)??'unknown',src=source(scene,p),id=`action:${scene}:${p}`;put(id,scene,'action',`${kind}: ${String((a as unknown as Record<string,unknown>)[kind])}`,src,a);edge(scene,'action',parent,id,`${index+1} · ${kind}`,src);condition(scene,id,a.if,source(scene,p+'/if'),device||undefined,noun||undefined);condition(scene,id,a.when,source(scene,p+'/when'),device||undefined,noun||undefined);let target:string|undefined;

   if('set'in a){const local=`state:${scene}:${device}:${a.set}`;target=all.has(local)?local:`state:${scene}:${a.set}`;}

   else if('emit'in a)target=eventKey(scene,device,noun,a.emit);

   else if('goal'in a)target=`goal:${scene}:${a.goal}`;

   else if('effect'in a){target=`effect:${scene}:${a.effect}`;if(!all.has(target)&&(a.effect in ENGINE_EFFECTS||a.effect in(rulesFor(scene)?.effects??{})))put(target,scene,'opaque-effect',a.effect,a.effect in ENGINE_EFFECTS?{file:'engine/rules.ts',symbol:'ENGINE_EFFECTS.'+a.effect}:code(scene,'SceneRules.effects.'+a.effect),{},'opaque','Named controller effect; not executed or editable here.');}

   else if('open'in a){target=`panel:${scene}:${a.open}`;if(a.open==='talk'||rulesFor(scene)?.panels?.includes(a.open))put(target,scene,'opaque-panel',a.open,a.open==='talk'?{file:'engine/panels.ts',symbol:'Panels.talk'}:code(scene,'panel.'+a.open),{dialogue:'with'in a?a.with:undefined},'opaque','Controller UI action; not invoked.');if(a.open==='talk'){const name=a.with;if(name)edge(scene,'trigger',id,`dialogue:${scene}:${name}`,'opens dialogue',src);}}

   else if('unseal'in a){const[d,s]=a.unseal.includes('/')?a.unseal.split('/'):[device,a.unseal];target=`sector:${scene}:${d}/${s}`;}

   else if('give'in a||'take'in a||'trace'in a){if('give'in a&&a.give!=='tokens')edge(scene,'action',id,`item:${a.give}`,'resource',src);target=`engine-action:${scene}:${kind}`;put(target,scene,'opaque-engine-action',kind,{file:'engine/model.ts',symbol:'SceneModel.doAction'},a,'opaque','Player-owned resources/trace remain read-only.');}

   if(target)edge(scene,'action',id,target,'target',src);

  }};

 const cases=(scene:string,parent:string,value:Case|Case[],path:string,device:string,noun:string)=>{for(const[k,index]of(Array.isArray(value)?value:[value]).map((k,i)=>[k,i]as const)){const p=Array.isArray(value)?path+'/'+index:path,id=`case:${scene}:${p}`,src=source(scene,p);put(id,scene,'case',`Case ${index+1} · first matching case runs`,src,k);edge(scene,'trigger',parent,id,'ordered case',src);condition(scene,id,k.if,source(scene,p+'/if'),device,noun);condition(scene,id,k.when,source(scene,p+'/when'),device,noun);actionList(scene,id,k.do,p+'/do',device,noun);}};

 for(const[scene,{definition,file}]of nativeDocs){
  for(const[i,row]of(definition.checkpoint??[]).entries()){const id='checkpoint:'+scene+':'+i,src={file,pointer:'/checkpoint/'+i};put(id,scene,'checkpoint','Checkpoint '+(i+1),src,row,'unbound','Ordered state-only normalization on a copied current checkpoint; not executed by the inspector.');edge(scene,'action',id,'shared-command:'+scene+':'+row.command,'checkpoint command',src);condition(scene,id,row.when,{file,pointer:src.pointer+'/when'});}
  for(const[id,command]of Object.entries(definition.commands)){const src={file,pointer:'/commands/'+pointer(id)},key='shared-command:'+scene+':'+id;put(key,scene,'shared-command',id,src,command,'unbound','Atomic shared command; sources and conditions are evaluated only by the runtime.');condition(scene,key,command.when,{file,pointer:src.pointer+'/when'});for(const[i,action]of command.actions.entries()){const a='shared-action:'+scene+':'+id+':'+i,p={file,pointer:src.pointer+'/actions/'+i};put(a,scene,'shared-action',JSON.stringify(action),p,action);edge(scene,'action',key,a,'atomic action',p);if('state'in action){const[owner,local]=stateAddress(action.state);const stateId='state:'+scene+':'+(owner===scene?local:action.state);if(owner!==scene)put(stateId,scene,'state',action.state,{file,pointer:'/state/'+pointer(action.state)},definition.state?.[action.state]);edge(scene,'action',a,stateId,'shared state owner',p);}if('emit'in action){const native=definition.native?.events[action.emit];if(native)edge(scene,'signal',a,resolveEvent(scene,native,p),'committed native event',p);const goal=definition.native?.goals[action.emit];if(goal)edge(scene,'action',a,'goal:'+scene+':'+goal,'committed native goal',p);}}}
 }
 // Project shared device conversations from their real source, not generated legacy metadata.
 for(const [scene,data]of sceneData){const shared=nativeDocs.get(scene);if(!shared)continue;for(const name of Object.keys(data.dialogue)){const conversation=shared.definition.conversations[name];if(!conversation)continue;const base='/conversations/'+pointer(name),root='dialogue:'+scene+':'+name,src={file:shared.file,pointer:base};put(root,scene,'dialogue',name,src,conversation,'unbound','Shared conversation runner; generated native metadata is not another execution path.');
  for(const [key,node]of Object.entries(conversation.nodes)){const id='dialogue-node:'+scene+':'+name+':'+key,p=base+'/nodes/'+pointer(key),source={file:shared.file,pointer:p};put(id,scene,'dialogue-node',name+'/'+key,source,node);edge(scene,'contains',root,id,'shared dialogue node',source);if(node.onEnter)edge(scene,'action',id,'shared-command:'+scene+':'+node.onEnter,'node entry',source);for(const [i,choice]of(node.choices??[]).entries()){const c={file:shared.file,pointer:p+'/choices/'+i};condition(scene,id,choice.when,{...c,pointer:c.pointer+'/when'});edge(scene,'trigger',id,'dialogue-node:'+scene+':'+name+':'+choice.next,choice.label,c);if(choice.command)edge(scene,'action',id,'shared-command:'+scene+':'+choice.command,'choice command',c);}for(const [i,redirect]of(node.redirect??[]).entries()){const r={file:shared.file,pointer:p+'/redirect/'+i};condition(scene,id,redirect.when,{...r,pointer:r.pointer+'/when'});edge(scene,'conditional',id,'dialogue-node:'+scene+':'+name+':'+redirect.node,'redirect',r);}}
  for(const [i,entry]of conversation.entry.entries()){const e={file:shared.file,pointer:base+'/entry/'+i};condition(scene,root,entry.when,{...e,pointer:e.pointer+'/when'});edge(scene,'trigger',root,'dialogue-node:'+scene+':'+name+':'+entry.node,'entry',e);}if(conversation.free){const free='dialogue-free:'+scene+':'+name,f={file:shared.file,pointer:base+'/free'};put(free,scene,'free-input','Literal free-text fragments',f,conversation.free,'unbound','Literal shared matcher, never evaluated by the inspector.');edge(scene,'trigger',root,free,'free input',f);edge(scene,'trigger',free,'dialogue-node:'+scene+':'+name+':'+conversation.free.next,'literal match',f);edge(scene,'trigger',free,'dialogue-node:'+scene+':'+name+':'+conversation.free.retryNext,'retry',f);}
 }}
 const decorateDevice=(scene:string,d:DeviceData,path:string)=>{const did=nodeKey(scene,d.id);d.nouns.forEach((n,i)=>{const np=path+'/nouns/'+i,nid=nodeKey(scene,d.id,n.id);for(const[verb,value]of Object.entries({...Object.fromEntries((nativeDocs.get(scene)?.definition.native?.verbs??[]).filter(r=>r.device===d.id&&r.noun===n.id).map(r=>[r.verb,undefined])),...(n.on??{})})){const vid=`verb:${scene}:${d.id}.${n.id}:${verb}`;put(vid,scene,'verb',`${d.id}.${n.id} → ${verb}`,source(scene,np+'/on/'+pointer(verb)),{verb,function:n.function});edge(scene,'trigger',nid,vid,'invocation',source(scene,np));const shared=nativeDocs.get(scene),binding=shared?.definition.native?.verbs.findIndex(r=>r.device===d.id&&r.noun===n.id&&r.verb===verb)??-1;
 if(shared&&binding>=0){const route=shared.definition.native!.verbs[binding];all.get(vid)!.source={file:shared.file,pointer:'/native/verbs/'+binding};all.get(vid)!.reason='Shared binding replaces legacy native steps for this verb.';for(const[i,c]of route.cases.entries()){const src={file:shared.file,pointer:'/native/verbs/'+binding+'/cases/'+i},key='shared-case:'+scene+':'+binding+':'+i;put(key,scene,'shared-case','First matching shared route '+(i+1),src,c);edge(scene,'trigger',vid,key,'ordered case',src);condition(scene,key,c.when,{file:shared.file,pointer:src.pointer+'/when'},d.id,n.id);if(c.sources)condition(scene,key,{sources:c.sources},{file:shared.file,pointer:src.pointer+'/sources'},d.id,n.id);edge(scene,'action',key,'shared-command:'+scene+':'+c.command,'dispatch command',src);}}else if(value!==undefined)cases(scene,vid,value,np+'/on/'+pointer(verb),d.id,n.id);}for(const key of['guard','log','link','clock']as const){const value=n[key];if(!value)continue;const id=`${key}:${scene}:${d.id}.${n.id}`,src=source(scene,np+'/'+key);put(id,scene,key,`${d.id}.${n.id} · ${key}`,src,value);edge(scene,'contains',nid,id,key,src);if(key==='guard')actionList(scene,id,n.guard?.do,np+'/guard/do',d.id,n.id);if(key==='log'){condition(scene,id,n.log?.when,source(scene,np+'/log/when'),d.id,n.id);if(n.log?.archive)edge(scene,'signal',id,resolveNoun(scene,n.log.archive,src),'archive cable dependency',src);}if(key==='clock')for(const event of n.events??[])edge(scene,'trigger',id,eventKey(scene,d.id,n.id,event),'scheduled clock event',src);if(key==='link'){condition(scene,id,n.link?.when,source(scene,np+'/link/when'),d.id,n.id);for(const name of[...(n.link?.known??[]),...(n.link?.reach??[])]){const target=all.has(nodeKey(scene,name))?nodeKey(scene,name):nodeKey('@net',name);edge(scene,'network',id,target,'known/reachable node',src);}}}});

  for(const[n,i]of d.nouns.map((n,i)=>[n,i]as const))if(n.sector)edge(scene,'conditional',nodeKey(scene,d.id,n.id),`sector:${scene}:${d.id}/${n.sector}`,'sector access',source(scene,path+'/nouns/'+i+'/sector'));
  d.sectors?.forEach((sector,i)=>{const p=path+'/sectors/'+i,id=`sector:${scene}:${d.id}/${sector.id}`,src=source(scene,p);put(id,scene,'sector',`${d.id}/${sector.id}`,src,sector);edge(scene,'conditional',did,id,'sealed sector',src);if('if'in sector.seal)condition(scene,id,sector.seal.if,source(scene,p+'/seal/if'),d.id);if('key'in sector.seal)edge(scene,'conditional',id,`item:${sector.seal.key}`,'key seal',src);if('guard'in sector.seal)edge(scene,'conditional',id,resolveNoun(scene,d.id+'.'+sector.seal.guard,src),'guard seal',src);});

  d.items?.forEach((item,i)=>cases(scene,did,item.on,path+'/items/'+i+'/on',d.id,item.noun));d.everyday?.forEach((item,i)=>edge(scene,'trigger',did,resolveNoun(scene,d.id+'.'+item.noun,source(scene,path+'/everyday/'+i)),`everyday ${item.verb}`,source(scene,path+'/everyday/'+i)));for(const changed of d.affects??[])edge(scene,'conditional',did,nodeKey(scene,changed),'declared visual/game dependency',source(scene,path+'/affects'));

 };

 for(const[id,data]of sceneData){data.devices.forEach((d,i)=>decorateDevice(id,d,'/devices/'+i));data.nodes?.forEach((d,i)=>decorateDevice(id,d,'/nodes/'+i));for(const[name,dialogue]of Object.entries(data.dialogue)){if(nativeDocs.get(id)?.definition.conversations[name])continue;const root=`dialogue:${id}:${name}`,base='/dialogue/'+pointer(name);put(root,id,'dialogue',name,source(id,base),dialogue);for(const[key,value]of Object.entries(dialogue.nodes)){const parent=`dialogue-node:${id}:${name}:${key}`,p=base+'/nodes/'+pointer(key);put(parent,id,'dialogue-node',`${name}/${key}`,source(id,p),value);edge(id,'contains',root,parent,'dialogue node',source(id,p));for(const[n,i]of(Array.isArray(value)?value:[value]).map((n,i)=>[n,i]as const)){const variant=Array.isArray(value)?p+'/'+i:p,vid=Array.isArray(value)?parent+':'+i:parent;if(vid!==parent){put(vid,id,'dialogue-variant',`${name}/${key} variant ${i+1}`,source(id,variant),n);edge(id,'conditional',parent,vid,'first matching variant',source(id,variant));}condition(id,vid,n.if,source(id,variant+'/if'));condition(id,vid,n.when,source(id,variant+'/when'));actionList(id,vid,n.do,variant+'/do');for(const[label,target]of n.choices??[])edge(id,'trigger',vid,`dialogue-node:${id}:${name}:${target}`,label,source(id,variant+'/choices'));}}

   edge(id,'trigger',root,`dialogue-node:${id}:${name}:${dialogue.start}`,'starts at',source(id,base+'/start'));if(dialogue.free)put(`dialogue-regex:${id}:${name}`,id,'opaque-regex',`${name} free-text matcher`,source(id,base+'/free'),dialogue.free,'opaque','Declared regex is displayed but never compiled or executed.');}

 }

 net.nodes.forEach((d,i)=>decorateDevice('@net',d,'/nodes/'+i));LOGIC.modules.forEach((m,i)=>decorateDevice('@logic',m.part,'/modules/'+i+'/part'));

 const cables=(scene:string,list:typeof net.cables)=>list.forEach((c,i)=>{const shared=nativeDocs.get(scene),src=shared?.definition.native?.wires!==undefined?{file:shared.file,pointer:'/native/wires/'+i}:source(scene,'/cables/'+i),id=`cable:${scene}:${c.id??c.from+'>'+c.to}`;put(id,scene,'cable',`${c.from} → ${c.to} ${c.verb}`,src,c);edge(scene,'signal',resolveEvent(scene,c.from,src),id,'event (150ms delivery)',src);edge(scene,'signal',id,resolveNoun(scene,c.to,src),c.verb+(c.fixed?' · fixed':''),src);});for(const[id,data]of sceneData)cables(id,data.cables);cables('@net',net.cables);

 const watchdog=(scene:string,value:typeof net.watchdog)=>{if(!value)return;const id=`watchdog:${scene}:${value.id??'route'}`,src=source(scene,'/watchdog');put(id,scene,'watchdog','Watchdog route',src,value);for(const device of value.route)edge(scene,'conditional',id,all.has(nodeKey(scene,device))?nodeKey(scene,device):nodeKey('@net',device),'route visit/freeze',src);};for(const[id,data]of sceneData)watchdog(id,data.watchdog);watchdog('@net',net.watchdog);

 for(const[networkRow,index]of net.networks.map((n,i)=>[n,i]as const)){const id=`network:${networkRow.id}`,src=source('@net','/networks/'+index);put(id,'@net','network',networkRow.name,src,networkRow);for(const[rule,i]of networkRow.from.map((r,i)=>[r,i]as const)){const p='/networks/'+index+'/from/'+i;if('port'in rule){const split=rule.port.indexOf(':'),scene=rule.port.slice(0,split),target=resolveNoun(scene,rule.port.slice(split+1),source('@net',p));edge('@net','network',target,id,'port access',source('@net',p));}else if('net'in rule)edge('@net','network',`network:${rule.net}`,id,'network access',source('@net',p));else{const ref=`controlled:${rule.controlled}`;put(ref,'@net','opaque-access',rule.controlled,source('@net',p),rule,'unbound','Requires explicit captured player-control snapshot.');edge('@net','network',ref,id,'controlled-node access',src);}}for(const machine of networkRow.machines)for(const scene of machine.in)edge('@net','network',id,scene==='net'?nodeKey('@net',machine.id):nodeKey(scene,machine.id),'machine membership',src);}

 for(const[id,def]of Object.entries(SCENES)){const rules=typeof def.rules==='object'?def.rules:shapes[id];if(typeof def.rules==='function')put(`callback:${id}:rules-factory`,id,'opaque-callback','SceneRules factory',code(id,'SceneRules factory'),{},'opaque','Player-service-dependent controller; registered contract shape is inspected without invoking the factory.');for(const[name,fn]of Object.entries(ENGINE_EFFECTS)){void fn;put(`effect:${id}:${name}`,id,'opaque-effect',name,{file:'engine/rules.ts',symbol:'ENGINE_EFFECTS.'+name},{},'opaque','Engine effect implementation; not invoked.');}for(const name of Object.keys(rules?.effects??{}))put(`effect:${id}:${name}`,id,'opaque-effect',name,code(id,'SceneRules.effects.'+name),{},'opaque','Registered named controller effect; not invoked.');for(const name of Object.keys(rules?.derived??{}))put(`derived:${id}:${name}`,id,'opaque-derived',name,code(id,'SceneRules.derived.'+name),{},'opaque','Registered derived function; not evaluated.');for(const key of['tick','place','check']as const)if(typeof rules?.[key]==='function')put(`callback:${id}:${key}`,id,'opaque-callback',`SceneRules.${key}`,code(id,'SceneRules.'+key),{},'opaque','Controller-owned behavior; not invoked.');for(const[key,value]of Object.entries(def))if(typeof value==='function'&&!['drawBackdrop','drawFront','visualEnvironment','rules'].includes(key))put(`callback:${id}:${key}`,id,'opaque-callback',`SceneDef.${key}`,code(id,'SceneDef.'+key),{},'opaque','Controller callback; source linked without execution.');

  for(const exit of def.exits){const eid=`exit:${id}:${exit.id}`,src=code(id,'SceneDef.exits.'+exit.id);put(eid,id,'exit',exit.label||exit.id,src,exit);edge(id,'contains',`scene:${id}`,eid,'exit',src);if(exit.to){edge(id,'travel',eid,`scene:${exit.to}`,exit.at?'entrance '+exit.at:'spawn',src);if(exit.at)edge(id,'travel',eid,`exit:${exit.to}:${exit.at}`,'destination entrance',src);}else put(`callback:${id}:exit-${exit.id}`,id,'opaque-callback',`exit action ${exit.action??exit.id}`,{file:'runtime/game.ts',symbol:'Game.exit'},exit,'opaque','Travel/map/board action belongs to game controller.');if(exit.requires)condition(id,eid,exit.requires,{...src,pointer:FOLDER.has(id)?'/exits/'+def.exits.indexOf(exit)+'/requires':'/requires'});}

  for(const use of def.uses??[]){const uid=`use:${id}:${use.id}`,src=code(id,'SceneDef.uses.'+use.id);put(uid,id,'opaque-use',use.label,src,use,'opaque','Use callback can change story/player state; never executed by inspector.');edge(id,'trigger',`scene:${id}`,uid,'physical use',src);for(const[k,v]of Object.entries(use))if(typeof v==='function'){const cid=`callback:${id}:use-${use.id}-${k}`;put(cid,id,'opaque-callback',`use ${use.id}.${k}`,code(id,'SceneDef.uses.'+use.id+'.'+k),{},'opaque','Nested interaction callback; not invoked.');edge(id,'action',uid,cid,k,src);}for(const[item,i]of(use.items??[]).map((n,i)=>[n,i]as const)){const cid=`callback:${id}:use-${use.id}-item-${i}`;put(cid,id,'opaque-callback',`${use.id} - ${item.label}`,code(id,'SceneDef.uses.'+use.id+'.items.'+i),item,'opaque','Inventory-item interaction callback; not invoked.');edge(id,'action',uid,cid,'item '+item.item,src);}}
  for(const readable of def.readables??[]){const rid=`readable:${id}:${readable.id}`,src=code(id,'SceneDef.readables.'+readable.id);put(rid,id,'readable',readable.name,src,readable);edge(id,'trigger',`scene:${id}`,rid,'read interaction',src);}
  for(const[person,i]of(def.people??[]).map((p,i)=>[p,i]as const))if(person.talk){const pid=`person:${id}:${person.id??i}`,src=code(id,'SceneDef.people.'+i+'.talk');put(pid,id,'person-dialogue',person.name??person.id??String(i),src,{id:person.id,talk:person.talk});edge(id,'trigger',`scene:${id}`,pid,'physical talk',src);}

 }

 for(const doc of compositions){const composition=doc.value as Composition,scene=composition.scene,srcFile=documentSources.get(doc.id)??`provided-document:${doc.id}`;const flat:Instance[]=[];const walk=(rows:Instance[],parent?:string,path='/instances')=>rows.forEach((row,i)=>{const p=path+'/'+i,id=`instance:${doc.id}:${row.id}`;flat.push(row);put(id,scene,'instance',row.id,{file:srcFile,pointer:p},{type:row.type,placement:row.placement,layer:row.layer,bindings:row.bindings});all.get(id)!.instanceId=row.id;if(parent)edge(scene,'attachment',`instance:${doc.id}:${parent}`,id,'inherited parent transform',{file:srcFile,pointer:p});if(row.attach)edge(scene,'attachment',`instance:${doc.id}:${row.attach.instance}`,id,'anchor '+row.attach.anchor,{file:srcFile,pointer:p+'/attach'});walk(row.children??[],row.id,p+'/children');});walk(composition.instances);for(const n of nodes.filter(n=>n.scene===scene&&n.kind==='device')){const d=(n.details as {id:string}).id;const row=flat.find(r=>r.id===d||r.props.device===d);if(row)n.instanceId=row.id;}}

 for(const{sequence,index,document}of sequences){const id=`sequence:${document}:${sequence.id}`,src:EventSource={file:documentSources.get(document)??`provided-document:${document}`,pointer:'/sequences/'+index};put(id,'@sequences','sequence',sequence.id,src,sequence);if(sequence.handoff){const handoff=sequence.handoff,to=`scene:${handoff.scene}`;edge('@sequences','handoff',id,to,handoff.entrance?'entrance '+handoff.entrance:'spawn',src);if(handoff.entrance)edge('@sequences','handoff',id,`exit:${handoff.scene}:${handoff.entrance}`,'destination entrance',src);}}

 if(!compositions.length)diagnostics.push('No composition documents supplied: spatial attachment inspection is unavailable.');if(!sequences.length)diagnostics.push('No timeline documents supplied: sequence handoff inspection is unavailable.');

 for(const item of edges){const a=all.get(item.from)!,b=all.get(item.to)!;item.status=a.status==='missing'||b.status==='missing'?'missing':a.status==='blocked'||b.status==='blocked'?'blocked':a.status==='inactive'||b.status==='inactive'?'inactive':a.status==='opaque'||b.status==='opaque'?'opaque':'unbound';item.reason=item.status==='unbound'?'Declared relationship; runtime activation is not bound.':`${a.reason} ${b.reason}`;}

 return{nodes,edges,scenes:actual,diagnostics,coverage:{sceneCount:actual.length,declarativeScenes:sceneData.size,compositionDocuments:compositions.length,timelineSequences:sequences.length,opaqueNodes:nodes.filter(n=>n.status==='opaque').length,missingNodes:nodes.filter(n=>n.status==='missing').length,conditionCount:nodes.filter(n=>n.kind==='condition').length}};

}
