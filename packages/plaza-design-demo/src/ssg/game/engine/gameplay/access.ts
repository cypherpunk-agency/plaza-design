import type {GameplayReadContext} from './queries';
import type {Condition,GameplayDefinition,GameplayState} from './types';
import {matches} from './queries';
import {validateGameplay} from './validation';

/** Requirements compose capabilities and common conditions; evaluation never mutates progress. */
export interface AccessRequirement {when?:Condition;capability?:string;command?:string;reason:string;hidden?:boolean}
export type AccessResult={ok:true}|{ok:false;reason:string;index:number;hidden:boolean};
export interface AccessContext {state:GameplayState;reads?:GameplayReadContext;capabilities?:Readonly<Record<string,boolean>>;eligibility?:(command:string)=>{ok:boolean}}
export function evaluateAccess(requirements:readonly AccessRequirement[],context:AccessContext):AccessResult {
  for(let index=0;index<requirements.length;index++){
    const rule=requirements[index];
    if(!matches(rule.when,context.state,context.reads)||(rule.capability!==undefined&&context.capabilities?.[rule.capability]!==true)||(rule.command!==undefined&&context.eligibility?.(rule.command).ok!==true))
      return {ok:false,reason:rule.reason,index,hidden:!!rule.hidden};
  }
  return {ok:true};
}
export function validateAccess(value:unknown,gameplay:GameplayDefinition,capabilities:readonly string[]=[]):AccessRequirement[]{
  if(!Array.isArray(value)||value.length>32)throw new Error('Access requires a bounded requirement list');
  for(const raw of value){
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.getPrototypeOf(raw)!==Object.prototype)throw new Error('Access requirement must be a plain object');
    const rule=raw as AccessRequirement;
    if(Object.keys(raw).some(k=>!['when','capability','command','reason','hidden'].includes(k))||typeof rule.reason!=='string'||!rule.reason.trim()||rule.reason.length>2000||rule.hidden!==undefined&&typeof rule.hidden!=='boolean'||rule.when===undefined&&rule.capability===undefined&&rule.command===undefined)throw new Error('Invalid access requirement');
    if(rule.capability!==undefined&&!capabilities.includes(rule.capability))throw new Error('Unknown access capability');
    if(rule.command!==undefined&&!gameplay.commands[rule.command]?.sources.includes('interaction'))throw new Error('Unknown or forbidden access command');
    if(rule.when!==undefined)validateGameplay({version:1,flags:gameplay.flags,items:gameplay.items,...(gameplay.state?{state:gameplay.state}:{}),...(gameplay.queries?{queries:gameplay.queries}:{}),events:[],commands:{check:{sources:['interaction'],when:rule.when,actions:[]}},reactions:[],conversations:{}});
  }
  return structuredClone(value);
}
/** Bridge existing native checks while retaining their order and refusal messages. */
export function nativeAccess(rows:readonly {allowed:boolean;reason:string;hidden?:boolean}[]):AccessResult {
  const capabilities=Object.fromEntries(rows.map((r,i)=>[String(i),r.allowed]));
  return evaluateAccess(rows.map((r,i)=>({capability:String(i),reason:r.reason,hidden:r.hidden})),{state:{flags:{},items:{},tokens:0},capabilities});
}
