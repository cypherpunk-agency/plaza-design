/** Read-only projections of the native model. No state, scheduler or condition evaluator. */
import type {SceneData,DeviceData,Cond} from '../data/types';
import type {SceneModel} from './model';
export type NativeObservation={kind:'nodeConnected';node:string}|{kind:'sectorOpen';node:string;sector:string}|{kind:'keyHeld';key:string};
export interface NativeObservations {aliases:Record<string,NativeObservation>;goals:{when:Cond;goal:string}[]}
const fail=(s:string):never=>{throw Error('Invalid native observations: '+s);};
const reserved=new Set(['__proto__','constructor','prototype','signal','weather','hour','day','verb','via']);
const name=(v:unknown)=>{if(typeof v!=='string'||!/^[-a-zA-Z0-9_.]{1,128}$/.test(v)||reserved.has(v))fail('reference name');};
const object=(v:unknown,keys:string[])=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype||Object.keys(v).some(k=>!keys.includes(k))||keys.some(k=>!Object.prototype.hasOwnProperty.call(v,k)))fail('plain object fields');return v as Record<string,unknown>;};
export function observationAliases(data:SceneData):string[]{if(data.observations===undefined)return[];try{validateObservationShape(data.observations);return Object.keys(data.observations.aliases);}catch{return[];}}
export function validateObservationShape(value:unknown):asserts value is NativeObservations{
 const d=object(value,['aliases','goals']);if(!d.aliases||typeof d.aliases!=='object'||Array.isArray(d.aliases)||Object.getPrototypeOf(d.aliases)!==Object.prototype||Object.keys(d.aliases).length>128)fail('aliases');
 for(const[id,raw]of Object.entries(d.aliases as Record<string,unknown>)){name(id);if(!raw||typeof raw!=='object')fail('alias recipe');const kind=(raw as NativeObservation).kind,o=object(raw,kind==='nodeConnected'?['kind','node']:kind==='sectorOpen'?['kind','node','sector']:kind==='keyHeld'?['kind','key']:[]);if(!['nodeConnected','sectorOpen','keyHeld'].includes(String(kind)))fail('kind');for(const[k,v]of Object.entries(o))if(k!=='kind')name(v);}
 if(!Array.isArray(d.goals)||d.goals.length>128)fail('goals');for(const row of d.goals as unknown[]){const g=object(row,['when','goal']);name(g.goal);if(typeof g.when!=='string'||!g.when.trim()||g.when.length>256)fail('goal condition');}
}
export function observationProblems(data:SceneData,derived:readonly string[],context:{nodes:ReadonlyMap<string,DeviceData>;keys:ReadonlySet<string>}):string[]{
 if(data.observations===undefined)return[];try{validateObservationShape(data.observations);}catch(e){return[String(e)];}
 const out:string[]=[],own=[...data.devices,...(data.nodes??[])],knownNodes=new Map([...context.nodes,...(data.nodes??[]).map(n=>[n.id,n] as const)]),blocked=new Set([...Object.keys(data.state),...derived,...[...own,...context.nodes.values()].flatMap(n=>Object.keys(n.state??{}))]);
 for(const[id,o]of Object.entries(data.observations.aliases)){if(blocked.has(id))out.push('observations alias shadows state/derived '+id);if(o.kind==='keyHeld'){if(!context.keys.has(o.key)&&!data.keyring?.some(k=>k.id===o.key))out.push('observations unknown key '+o.key);}else{const node=knownNodes.get(o.node);if(!node)out.push('observations unknown node '+o.node);else if(o.kind==='sectorOpen'&&!node.sectors?.some(s=>s.id===o.sector))out.push('observations unknown sector '+o.node+'/'+o.sector);}}
 for(const g of data.observations.goals)if(!data.goals.some(row=>row.id===g.goal))out.push('observations unknown goal '+g.goal);return out;
}
export function readObservation(o:NativeObservation,m:SceneModel):boolean{return o.kind==='nodeConnected'?m.net.get(o.node)==='connected':o.kind==='sectorOpen'?m.opened.has(o.node+'/'+o.sector):m.keyring().includes(o.key);}
