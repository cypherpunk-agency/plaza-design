import type {StateDeclaration,StateValue,GameplayDefinition,GameplayState,StateValues} from './types';
export function validStateNumber(d:Pick<StateDeclaration,'integer'>,value:unknown):value is number{return typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<=Number.MAX_SAFE_INTEGER&&(d.integer===false||Number.isSafeInteger(value));}
/** A valid non-null editor value when a nullable field is made concrete. */
export function concreteStateValue(d:StateDeclaration):Exclude<StateValue,null>{if(d.default!==null)return d.default;if(d.type==='boolean')return false;if(d.type==='enum')return d.options![0];if(d.type==='string')return '';return Math.max(d.min??-1000000,Math.min(d.max??1000000,0));}
export function validValue(d:StateDeclaration,v:unknown):v is StateValue {
 if(v===null)return d.nullable===true;
 if(d.type==='boolean')return typeof v==='boolean';
 if(d.type==='string')return typeof v==='string'&&v.length<=(d.maxLength??2000);
 if(d.type==='enum')return typeof v==='string'&&!!d.options?.includes(v);
 return validStateNumber(d,v)&&v>=(d.min??-1000000)&&v<=(d.max??1000000);
}
/** Public IDs address one owner block; blocks are the live mutable state identity. */
export function stateAddress(id:string){const i=id.lastIndexOf('.');if(i<1||i===id.length-1)throw new Error('State ID must be qualified: '+id);return [id.slice(0,i),id.slice(i+1)] as const;}
export function stateBinding(id:string,definition?:Pick<GameplayDefinition,'state'>){return definition?.state?.[id]?.binding??id;}
export function stateValue(values:StateValues|undefined,id:string,definition?:Pick<GameplayDefinition,'state'>):StateValue|undefined{const[owner,key]=stateAddress(stateBinding(id,definition));return values?.[owner]?.[key];}
export function setStateValue(values:StateValues,id:string,value:StateValue,definition?:Pick<GameplayDefinition,'state'>){const[owner,key]=stateAddress(stateBinding(id,definition));(values[owner]??={})[key]=value;}
export function deleteStateValue(values:StateValues,id:string){const[owner,key]=stateAddress(id);if(values[owner])delete values[owner][key];}
export function cloneValues(values:StateValues|undefined):StateValues{return Object.fromEntries(Object.entries(values??{}).map(([owner,block])=>[owner,{...block}]));}
/** Patch in place so models holding an owner block retain their identity. */
export function mergeValues(target:StateValues,source:StateValues){for(const owner of Object.keys(target))if(!(owner in source))for(const key of Object.keys(target[owner]))delete target[owner][key];for(const[owner,block]of Object.entries(source)){const live=target[owner]??={};for(const key of Object.keys(live))if(!(key in block))delete live[key];Object.assign(live,block);}return target;}
/** Existing foreign state is retained; declarations initialize only their owned keys. */
export function resolveValues(def:GameplayDefinition,state:GameplayState){
 const values=cloneValues(state.values);for(const[id,d]of Object.entries(def.state??{})){const current=d.lifetime==='interaction'?undefined:stateValue(values,id,def);setStateValue(values,id,validValue(d,current)?current:d.default,def);}return values;
}
