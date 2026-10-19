import type {SceneData} from '../../data/types';
import type {SceneModel,Line} from '../model';
import type {GameplayDefinition} from './types';
import type {GameplaySession} from './session';
import {renderGameplayText,validateGameplayText} from './text-template';
const fail=(s:string):never=>{throw Error('Invalid native workflow: '+s);};
const object=(v:unknown,keys:string[],required=keys):Record<string,any>=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype||Object.keys(v).some(k=>!keys.includes(k))||required.some(k=>!Object.prototype.hasOwnProperty.call(v,k)))fail('object fields');return v as Record<string,any>;};
const name=(v:unknown)=>{if(typeof v!=='string'||!/^[-a-zA-Z0-9_.]{1,128}$/.test(v)||['__proto__','constructor','prototype'].includes(v))fail('reference name');};
const entries=(v:unknown)=>{const d=object(v,Object.keys(v&&typeof v==='object'?v:{}));if(Object.keys(d).length>64)fail('at most 64 bindings');return Object.entries(d);};
export function validateNativeWorkflowShape(d:GameplayDefinition,condition:(value:unknown)=>void){
 const elapsed=new Set<string>();
 for(const[id,raw]of entries(d.native?.intervals??{})){
  name(id);const r=object(raw,['kind','elapsed','duration','active','inactive','resetOn','due'],['kind','elapsed','duration','active','inactive','due']);
  if(r.kind!=='liveInterval'||!['hold','reset'].includes(r.inactive))fail('interval policy');name(r.elapsed);if(elapsed.has(r.elapsed))fail('duplicate elapsed owner');elapsed.add(r.elapsed);
  const duration=object(r.duration,['tuning']);name(duration.tuning);condition(r.active);
  if(r.resetOn!==undefined&&(!Array.isArray(r.resetOn)||r.resetOn.length>64||new Set(r.resetOn).size!==r.resetOn.length||r.resetOn.some((event:unknown)=>!d.events.includes(String(event)))))fail('reset event');
  if(!Array.isArray(r.due)||!r.due.length||r.due.length>32)fail('due cases');
  r.due.forEach((raw:unknown,i:number)=>{const c=object(raw,['when','command'],['command']);if(c.when!==undefined){condition(c.when);if(i===r.due.length-1)fail('final fallback required');}else if(i!==r.due.length-1)fail('fallback must be last');const command=d.commands[c.command];if(!command||command.sources.length!==1||command.sources[0]!=='system')fail('due command must be system-only');});
 }
 for(const[event,raw]of entries(d.native?.replies??{})){
  if(!d.events.includes(event))fail('reply event');const r=object(raw,['from','say','template'],['from','say']);name(r.from);
  if(!Array.isArray(r.say)||r.say.length<2||r.say.length>3||r.say.slice(0,2).some((s:unknown)=>typeof s!=='string'||!s||s.length>2000)||r.say[2]!==undefined&&!['ok','err','dim'].includes(r.say[2]))fail('reply line');
  if(r.template!==undefined&&r.template!==true)fail('reply template');if(r.template)validateGameplayText(r.say.slice(0,2),d);
 }
}
export function validateNativeWorkflowBindings(d:GameplayDefinition,data:SceneData){
 for(const row of Object.values(d.native?.intervals??{})){const ms=data.tuning[row.duration.tuning];if(typeof ms!=='number'||!Number.isFinite(ms)||ms<=0||ms>1000000)fail('positive duration tuning '+row.duration.tuning);}
 for(const row of Object.values(d.native?.replies??{}))if(![...data.devices,...data.nodes??[]].some(dev=>dev.id===row.from))fail('reply device '+row.from);
}
/** Post-commit reset and communication only; all gameplay writes belong to commands. */
export function nativeWorkflowEvent(model:SceneModel,session:GameplaySession,event:string){
 for(const row of Object.values(session.definition.native?.intervals??{}))if(row.resetOn?.includes(event))model.scratch[row.elapsed]=0;
 const reply=session.definition.native?.replies?.[event];if(!reply)return;
 const line=[...reply.say] as Line;if(reply.template){const text=renderGameplayText([line[0],line[1]],session.state());line[0]=text[0];line[1]=text[1];}model.reply(line,reply.from);
}
/** At most one due command per row/tick; resetting to zero deliberately discards overshoot. */
export function nativeWorkflowTick(model:SceneModel,session:GameplaySession,dt:number,cause:(run:()=>void)=>void){
 for(const row of Object.values(session.definition.native?.intervals??{})){
  if(!session.matches(row.active)){if(row.inactive==='reset')model.scratch[row.elapsed]=0;continue;}
  const elapsed=(model.scratch[row.elapsed]??0)+dt;model.scratch[row.elapsed]=elapsed;
  if(elapsed<model.data.tuning[row.duration.tuning])continue;
  model.scratch[row.elapsed]=0;
  cause(()=>{const c=row.due.find(c=>session.matches(c.when))!;if(session.dispatch(c.command,'system').ok)model.changed();});
 }
}
