import type {SceneData} from '../../data/types';import type {SceneModel} from '../model';
/** Finite inputs to the registered procedural pictures. These controllers only read state. */
export const visualStateTypes={moth:{fed:'boolean',fern:'string',tape:'number'},beach:{rented:'boolean',billing:'string',billed:'number',freeDrink:'boolean',flag:'string',lamps:'string'}} as const;
export interface MothVisualController {kind:'moth';version:1;state:Partial<Record<keyof typeof visualStateTypes.moth,string>>;values:{wet:string;fresh:number};record?:{device:string;noun:string}}
export interface BeachVisualController {kind:'beach';version:1;state:Partial<Record<keyof typeof visualStateTypes.beach,string>>;values:{billingPaused:string;danger:string;lampsOn:string}}
export type VisualController=MothVisualController|BeachVisualController;
export function visualControllerProblems(data:SceneData):string[]{
 const c=data.controller as VisualController,errors:string[]=[],object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
 if(!object(c)||!['moth','beach'].includes(c.kind)||c.kind!==data.id||c.version!==1||Object.keys(c).some(k=>!(c.kind==='moth'?['kind','version','state','values','record']:['kind','version','state','values']).includes(k)))return['Invalid registered visual controller'];
 if(!object(c.state)||!object(c.values))return['Visual controller state/values must be objects'];
 const types:Readonly<Record<string,string>>=visualStateTypes[c.kind];for(const[role,ref]of Object.entries(c.state))if(!(role in types)||typeof ref!=='string'||!Object.prototype.hasOwnProperty.call(data.state,ref)||typeof data.state[ref]!==types[role])errors.push('Visual controller state reference '+role);
 if(c.kind==='moth'){
  if(Object.keys(c.values).sort().join()!=='fresh,wet'||typeof c.values.wet!=='string'||c.values.wet.length>2000||typeof c.values.fresh!=='number'||!Number.isFinite(c.values.fresh))errors.push('Moth visual comparison values');
  if(c.record!==undefined&&(!object(c.record)||Object.keys(c.record).sort().join()!=='device,noun'||![...data.devices,...data.nodes??[]].find(d=>d.id===c.record!.device)?.nouns.find(n=>n.id===c.record!.noun)?.clock))errors.push('Moth record clock reference');
 }else if(Object.keys(c.values).sort().join()!=='billingPaused,danger,lampsOn'||Object.values(c.values).some(v=>typeof v!=='string'||v.length>2000))errors.push('Beach visual comparison values');
 return errors;
}
export function mothVisualSnapshot(m:SceneModel){
 const c=m.data.controller?.kind==='moth'?m.data.controller:undefined,state=c?.state??{},read=(role:keyof typeof visualStateTypes.moth)=>state[role]===undefined?undefined:m.get(state[role]!);
 const next=c?.record?m.clocks.next(c.record.device+'.'+c.record.noun):undefined;
 return{playing:!!next,nextMs:next?.ms??0,fed:!!read('fed'),wet:c!==undefined&&state.fern!==undefined&&read('fern')===c.values.wet,fresh:c!==undefined&&state.tape!==undefined&&read('tape')===c.values.fresh};
}
export function beachVisualSnapshot(m:SceneModel){
 const c=m.data.controller?.kind==='beach'?m.data.controller:undefined,state=c?.state??{},read=(role:keyof typeof visualStateTypes.beach)=>state[role]===undefined?undefined:m.get(state[role]!);
 return{rented:!!read('rented'),billingPaused:c!==undefined&&state.billing!==undefined&&read('billing')===c.values.billingPaused,billed:Number(read('billed')??0),freeDrink:!!read('freeDrink'),danger:c!==undefined&&state.flag!==undefined&&read('flag')===c.values.danger,lamps:c!==undefined&&state.lamps!==undefined&&read('lamps')===c.values.lampsOn};
}
