/** Declared world targets use the device engine's conditions, actions and text references.
 * This is a binding adapter, not another content evaluator or state owner. */
import type {Action,Cond,LineRef,SceneData} from '../../data/types';
import {ENGINE,KEYRING,LOGIC,NET} from '../../data';
import {checkSceneInteractionRows} from '../../data/check';
import {contractOf,type SceneRules} from '../rules';
import type {SceneDef} from '../../scenes/kit';
import type {SceneDocument} from './scene-document';
import type {GameplayDefinition} from './types';
import {projectSceneState} from './scene-state';
import type {EngineNetworkContext} from '../network-context';
export interface NativeTargetBindings {readonly anchors:readonly string[];readonly reset:boolean}
export type NativeTargetValidator=((doc:SceneDocument,gameplay?:GameplayDefinition,context?:NativeTargetValidationContext)=>void)&{readonly bindings:NativeTargetBindings};
export type NativeTargetValidationContext={phase:'structural'}|{phase:'assembled';data:SceneData;network:EngineNetworkContext};

/** Source limits and operation names are shared by validation and typed authoring. */
export const NATIVE_TARGET_LIMITS=Object.freeze({targets:32,branches:32,steps:64,actions:64,text:2000,promptHeight:10000});
export const NATIVE_TARGET_OPERATIONS=['say','do','exit','reset'] as const;
export function nativeTargetOperations(bindings:NativeTargetBindings,hasExit:boolean,final:boolean){
 return NATIVE_TARGET_OPERATIONS.filter(op=>op==='reset'?bindings.reset:op==='exit'?hasExit&&final:true);
}
export type NativeTargetStep={do:Action[]}|{say:LineRef}|{exit:string}|{reset:true};
export interface NativeTargetDocument {
 id:string;anchor:string;promptH:number;if?:Cond;
 labels:{if?:Cond;text:string}[];
 routes:{if?:Cond;steps:NativeTargetStep[]}[];
}
const fail=(s:string):never=>{throw new Error('Invalid engine target: '+s);};
const rows=(v:unknown,max:number=NATIVE_TARGET_LIMITS.branches):Record<string,unknown>[]=>{
 if(!Array.isArray(v)||!v.length||v.length>max)fail('bounded nonempty list required');
 return (v as unknown[]).map(o=>{if(!o||typeof o!=='object'||Array.isArray(o))fail('object required');return o as Record<string,unknown>;});
};
const fields=(o:Record<string,unknown>,allowed:string[],required:string[])=>{if(Object.keys(o).some(k=>!allowed.includes(k))||required.some(k=>!(k in o)))fail('unexpected or missing field');};
const text=(v:unknown)=>{if(typeof v!=='string'||!v.trim()||v.length>NATIVE_TARGET_LIMITS.text)fail('bounded text required');};
const ordered=(r:Record<string,unknown>[])=>{if(r.at(-1)!.if!==undefined||r.slice(0,-1).some(x=>x.if===undefined))fail('exactly one final fallback required');};
export function nativeTargetValidator(data:SceneData,rules:SceneRules,anchors:readonly string[],permissions:{reset?:boolean}={}):NativeTargetValidator{
 const bindings:NativeTargetBindings=Object.freeze({anchors:Object.freeze([...anchors]),reset:permissions.reset===true});
 const validate=(doc:SceneDocument,gameplay?:GameplayDefinition,context?:NativeTargetValidationContext)=>{
  if(doc.nativeTargets===undefined)return;
  const current=context?.phase==='assembled'?context.data:data;
  if(current.id!==data.id||doc.id!==data.id)fail('scene context identity');
  if(!Array.isArray(doc.nativeTargets)||doc.nativeTargets.length>NATIVE_TARGET_LIMITS.targets)fail('bounded target list required');
  const targets=doc.nativeTargets.length?rows(doc.nativeTargets):[],ids=new Set<string>(),cases:{if?:Cond;do?:Action[];say?:LineRef}[]=[];
  const label=(v:unknown)=>{text(v);if(context?.phase!=='structural'&&typeof ({...ENGINE.texts,...current.texts})[String(v)]!=='string')fail('unknown label '+v);};
  for(const t of targets){
   fields(t,['id','anchor','promptH','if','labels','routes'],['id','anchor','promptH','labels','routes']);text(t.id);text(t.anchor);
   if(ids.has(String(t.id)))fail('duplicate id');ids.add(String(t.id));
   if(context?.phase!=='structural'&&[...current.devices,...(current.nodes??[])].some(d=>d.id===t.id))fail('target identity conflicts with device '+t.id);
   if(!bindings.anchors.includes(String(t.anchor)))fail('unknown placement anchor '+t.anchor);
   if(typeof t.promptH!=='number'||!Number.isFinite(t.promptH)||t.promptH<0||t.promptH>NATIVE_TARGET_LIMITS.promptHeight)fail('prompt height');
   if(t.if!==undefined)cases.push({if:t.if as Cond});
   const labels=rows(t.labels);ordered(labels);
   for(const l of labels){fields(l,['if','text'],['text']);label(l.text);cases.push({...(l.if!==undefined?{if:l.if as Cond}:{})});}
   const routes=rows(t.routes);ordered(routes);
   for(const r of routes){fields(r,['if','steps'],['steps']);cases.push({...(r.if!==undefined?{if:r.if as Cond}:{})});
    const steps=rows(r.steps,NATIVE_TARGET_LIMITS.steps);
    steps.forEach((s,i)=>{
     if(Object.keys(s).length!==1)fail('one operation per step');
     const operation=Object.keys(s)[0] as typeof NATIVE_TARGET_OPERATIONS[number];
     if(!nativeTargetOperations(bindings,!!doc.exits?.some(e=>e.engine),i===steps.length-1).includes(operation))fail(operation==='reset'?'reset permission':operation==='exit'?'exit must be final and reference an engine exit':'unknown operation');
     if('do'in s){const actions=rows(s.do,NATIVE_TARGET_LIMITS.actions);cases.push({do:actions as Action[]});}
     else if('say'in s)cases.push({say:s.say as LineRef});
     else if('exit'in s){if(typeof s.exit!=='string'||!doc.exits?.some(e=>e.id===s.exit&&e.engine))fail('engine exit reference');}
     else if('reset'in s){if(s.reset!==true)fail('reset permission');}
    });
   }
  }
  if(context?.phase==='structural')return;
  const network=context?.phase==='assembled'?context.network:{net:NET,keyring:KEYRING};
  const errors=checkSceneInteractionRows(gameplay?projectSceneState(current,gameplay):current,contractOf(rules,gameplay?.native?.verbs,Object.keys(gameplay?.queries??{})),{engine:ENGINE,logic:LOGIC,net:network.net,keyring:network.keyring},cases);
  if(errors.length)fail(errors.join('\n'));
 };
 return Object.assign(validate,{bindings});
}
export function compileNativeTargets(doc:SceneDocument,placements:Readonly<Record<string,{x:number;h?:number}>>,bindings?:NativeTargetBindings):Pick<SceneDef,'targets'|'use'|'nativeTargetBindings'>{
 if(bindings&&bindings.anchors.some(anchor=>!placements[anchor]))throw new Error('Registered target capability requires its placement');
 const rows=doc.nativeTargets??[];
 for(const t of rows)if(!placements[t.anchor])throw new Error('Missing engine target placement '+t.anchor);
 return {
  ...(bindings?{nativeTargetBindings:bindings}:{}),
  targets:m=>rows.filter(t=>t.if===undefined||m.cond(t.if)).map(t=>({id:t.id,x:placements[t.anchor].x,promptH:t.promptH+(placements[t.anchor].h??0),label:m.label(t.labels.find(l=>l.if===undefined||m.cond(l.if))!.text)})),
  use:(id,m,say)=>{
   const t=rows.find(t=>t.id===id);if(!t||t.if!==undefined&&!m.cond(t.if))return;
   const route=t.routes.find(r=>r.if===undefined||m.cond(r.if))!;
   for(const step of route.steps){if('do'in step)m.apply(step.do,say);else if('say'in step)say(m.line(step.say));else if('reset'in step)m.reset();else return step.exit;}
  },
 };
}
