import type {StateDeclaration,StateValue,GameplayDefinition,GameplayState} from './types';
export function validValue(d:StateDeclaration,v:unknown):v is StateValue {
 if(d.type==='boolean')return typeof v==='boolean';
 if(d.type==='string')return typeof v==='string'&&v.length<=(d.maxLength??2000);
 if(d.type==='enum')return typeof v==='string'&&!!d.options?.includes(v);
 return typeof v==='number'&&Number.isSafeInteger(v)&&v>=(d.min??-1000000)&&v<=(d.max??1000000);
}
/** Existing foreign state is retained; declarations initialize only their owned keys. */
export function resolveValues(def:GameplayDefinition,state:GameplayState,temporary:Record<string,StateValue>={}){
 const values={...state.values};for(const[id,d]of Object.entries(def.state??{})){const current=d.lifetime==='save'?values[id]:d.lifetime==='session'?temporary[id]:undefined;values[id]=validValue(d,current)?current:d.default;}return values;
}
