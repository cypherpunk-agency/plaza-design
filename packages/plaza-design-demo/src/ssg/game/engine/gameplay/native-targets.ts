/** Declared world targets use the device engine's conditions, actions and text references.
 * This is a binding adapter, not another content evaluator or state owner. */
import type {Action,Cond,LineRef,SceneData} from '../../data/types';
import {ENGINE,KEYRING,LOGIC,NET} from '../../data';
import {checkSceneInteractionRows} from '../../data/check';
import {contractOf,type SceneRules} from '../rules';
import type {SceneDef} from '../../scenes/kit';
import type {SceneDocument} from './scene-document';

export type NativeTargetStep={do:Action[]}|{say:LineRef}|{exit:string}|{reset:true};
export interface NativeTargetDocument {
 id:string;anchor:string;promptH:number;if?:Cond;
 labels:{if?:Cond;text:string}[];
 routes:{if?:Cond;steps:NativeTargetStep[]}[];
}
const fail=(s:string):never=>{throw new Error('Invalid engine target: '+s);};
const rows=(v:unknown,max=32):Record<string,unknown>[]=>{
 if(!Array.isArray(v)||!v.length||v.length>max)fail('bounded nonempty list required');
 return (v as unknown[]).map(o=>{if(!o||typeof o!=='object'||Array.isArray(o))fail('object required');return o as Record<string,unknown>;});
};
const fields=(o:Record<string,unknown>,allowed:string[],required:string[])=>{if(Object.keys(o).some(k=>!allowed.includes(k))||required.some(k=>!(k in o)))fail('unexpected or missing field');};
const text=(v:unknown)=>{if(typeof v!=='string'||!v.trim()||v.length>2000)fail('bounded text required');};
const ordered=(r:Record<string,unknown>[])=>{if(r.at(-1)!.if!==undefined||r.slice(0,-1).some(x=>x.if===undefined))fail('exactly one final fallback required');};
export function nativeTargetValidator(data:SceneData,rules:SceneRules,anchors:readonly string[],permissions:{reset?:boolean}={}){
 return (doc:SceneDocument)=>{
  if(doc.nativeTargets===undefined)return;
  const targets=rows(doc.nativeTargets),ids=new Set<string>(),cases:{if?:Cond;do?:Action[];say?:LineRef}[]=[];
  const label=(v:unknown)=>{text(v);if(typeof ({...ENGINE.texts,...data.texts})[String(v)]!=='string')fail('unknown label '+v);};
  for(const t of targets){
   fields(t,['id','anchor','promptH','if','labels','routes'],['id','anchor','promptH','labels','routes']);text(t.id);text(t.anchor);
   if(ids.has(String(t.id)))fail('duplicate id');ids.add(String(t.id));
   if(!anchors.includes(String(t.anchor)))fail('unknown placement anchor '+t.anchor);
   if(typeof t.promptH!=='number'||!Number.isFinite(t.promptH)||t.promptH<0||t.promptH>10000)fail('prompt height');
   if(t.if!==undefined)cases.push({if:t.if as Cond});
   const labels=rows(t.labels);ordered(labels);
   for(const l of labels){fields(l,['if','text'],['text']);label(l.text);cases.push({...(l.if!==undefined?{if:l.if as Cond}:{})});}
   const routes=rows(t.routes);ordered(routes);
   for(const r of routes){fields(r,['if','steps'],['steps']);cases.push({...(r.if!==undefined?{if:r.if as Cond}:{})});
    const steps=rows(r.steps,64);
    steps.forEach((s,i)=>{
     if(Object.keys(s).length!==1)fail('one operation per step');
     if('do'in s){const actions=rows(s.do,64);cases.push({do:actions as Action[]});}
     else if('say'in s)cases.push({say:s.say as LineRef});
     else if('exit'in s){if(typeof s.exit!=='string'||!doc.exits?.some(e=>e.id===s.exit&&e.engine))fail('engine exit reference');if(i!==steps.length-1)fail('exit must be final');}
     else if('reset'in s){if(s.reset!==true||!permissions.reset)fail('reset permission');}
     else fail('unknown operation');
    });
   }
  }
  const errors=checkSceneInteractionRows(data,contractOf(rules),{engine:ENGINE,logic:LOGIC,net:NET,keyring:KEYRING},cases);
  if(errors.length)fail(errors.join('\n'));
 };
}
export function compileNativeTargets(doc:SceneDocument,placements:Readonly<Record<string,{x:number;h?:number}>>):Pick<SceneDef,'targets'|'use'>{
 const rows=doc.nativeTargets??[];
 for(const t of rows)if(!placements[t.anchor])throw new Error('Missing engine target placement '+t.anchor);
 return {
  targets:m=>rows.filter(t=>t.if===undefined||m.cond(t.if)).map(t=>({id:t.id,x:placements[t.anchor].x,promptH:t.promptH+(placements[t.anchor].h??0),label:m.label(t.labels.find(l=>l.if===undefined||m.cond(l.if))!.text)})),
  use:(id,m,say)=>{
   const t=rows.find(t=>t.id===id);if(!t||t.if!==undefined&&!m.cond(t.if))return;
   const route=t.routes.find(r=>r.if===undefined||m.cond(r.if))!;
   for(const step of route.steps){if('do'in step)m.apply(step.do,say);else if('say'in step)say(m.line(step.say));else if('reset'in step)m.reset();else return step.exit;}
  },
 };
}
