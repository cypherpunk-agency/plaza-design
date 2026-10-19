import type {GameplayDefinition,Condition} from './types';
import type {GameplaySession} from './session';
import type {SceneModel} from '../model';
import type {SceneData} from '../../data/types';

export interface NativeDeadline {
 startOn:string[];cancelOn?:string[];duration:{tuning:string};
 /** Cosmetic progress origin on the existing scene clock, even when arming is refused. */
 startedAt?:string;
 armWhen?:Condition;
 /** Rechecked only when due; distinct from the condition used when arming. */
 while?:Condition;
 due:{when?:Condition;command:string}[];
}
const fail=(s:string):never=>{throw Error('Invalid native deadline: '+s);};
const own=(o:object,k:string)=>Object.prototype.hasOwnProperty.call(o,k);
const record=(v:unknown,allowed?:string[],required:string[]=[]):Record<string,any>=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype||allowed&&Object.keys(v).some(k=>!allowed.includes(k))||required.some(k=>!own(v,k)))fail('object fields');return v as Record<string,any>;};
const name=(v:unknown)=>{if(typeof v!=='string'||!/^[-a-zA-Z0-9_.]{1,128}$/.test(v)||['__proto__','constructor','prototype'].includes(v))fail('reference name');};
export function validateNativeDeadlinesShape(d:GameplayDefinition,condition:(v:unknown)=>void){
 const rows=record(d.native?.deadlines??{});if(Object.keys(rows).length>64)fail('binding count');const stamps=new Set<string>(Object.values(d.native?.intervals??{}).map(row=>row.elapsed));
 for(const[id,raw]of Object.entries(rows)){
  name(id);const r=record(raw,['startOn','cancelOn','duration','startedAt','armWhen','while','due'],['startOn','duration','due']);
  for(const key of['startOn','cancelOn']){const events=r[key];if(key==='cancelOn'&&events===undefined)continue;if(!Array.isArray(events)||!events.length||events.length>64||new Set(events).size!==events.length||events.some(e=>!d.events.includes(e)))fail('event references');}
  const duration=record(r.duration,['tuning'],['tuning']);name(duration.tuning);
  if(r.startedAt!==undefined){name(r.startedAt);if(stamps.has(r.startedAt))fail('duplicate progress stamp owner');stamps.add(r.startedAt);}
  if(r.armWhen!==undefined)condition(r.armWhen);if(r.while!==undefined)condition(r.while);
  if(!Array.isArray(r.due)||!r.due.length||r.due.length>32)fail('due cases');
  for(const[i,raw]of r.due.entries()){const c=record(raw,['when','command'],['command']);if(i===r.due.length-1?c.when!==undefined:c.when===undefined)fail('ordered fallback');if(c.when!==undefined)condition(c.when);const command=d.commands[c.command];if(!command||command.sources.length!==1||command.sources[0]!=='system')fail('system-only due command');}
 }
}
export function validateNativeDeadlineSources(d:GameplayDefinition,data:SceneData){for(const row of Object.values(d.native?.deadlines??{})){const ms=data.tuning[row.duration.tuning];if(typeof ms!=='number'||!Number.isFinite(ms)||ms<=0||ms>1000000)fail('positive duration tuning '+row.duration.tuning);}}

/** Named cancellation handles on SceneTime. This does not own another clock or tick loop. */
export function nativeDeadlines(model:SceneModel,session:GameplaySession){
 const pending=new Map<string,()=>void>();let disposed=false;
 const cancel=(id:string)=>{const release=pending.get(id);pending.delete(id);release?.();};
 return{
  event(event:string){if(disposed)return;for(const[id,row]of Object.entries(session.definition.native?.deadlines??{})){
   if(row.cancelOn?.includes(event))cancel(id);
   if(!row.startOn.includes(event))continue;
   cancel(id);if(row.startedAt)model.scratch[row.startedAt]=model.now();
   if(!session.matches(row.armWhen))continue;
   let release:()=>void;const forget=()=>{if(pending.get(id)===release)pending.delete(id);};
   release=model.later(model.data.tuning[row.duration.tuning],()=>{forget();if(disposed||!session.matches(row.while))return;const choice=row.due.find(c=>session.matches(c.when))!;if(session.dispatch(choice.command,'system').ok)model.changed();},{kind:'gameplayDeadline',id},forget);pending.set(id,release);
  }},
  dispose(){if(disposed)return;disposed=true;for(const id of [...pending.keys()])cancel(id);},
 };
}
