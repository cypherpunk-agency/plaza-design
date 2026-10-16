/** Closed, serializable visual snapshot for QA devices. These queries cannot execute rules or mutate simulation. */
import type { Value } from '../core/composition';
export interface SandboxSpot { x:number;y:number;w:number;h:number }
export interface SandboxSnapshot { values:Record<string,Value>;derived:Record<string,Value>;net:Record<string,string>;clocks:Record<string,{ms:number}|null>;pulses:Record<string,number>;frozen:string[];opened:string[];traces:Record<string,number>;lockouts:Record<string,number>;links:{from:string}[];spots:Record<string,SandboxSpot>;minute:number;daylight:number;forecast:string;hourLabel:string;weather:{cloud:number;smog:number;rain:number;storm:number;fog:number;heat:number;wind:number};stationCenters:Record<string,number>;windowVisible:boolean;hoverSpot:SandboxSpot|null }
export const emptySandboxSnapshot:SandboxSnapshot={values:{},derived:{},net:{},clocks:{},pulses:{},frozen:[],opened:[],traces:{},lockouts:{},links:[],spots:{},minute:0,daylight:0,forecast:'',hourLabel:'',weather:{cloud:0,smog:0,rain:0,storm:0,fog:0,heat:0,wind:0},stationCenters:{},windowVisible:false,hoverSpot:null};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function validateSandboxSnapshot(value:Value):void {
 if(!object(value))throw new Error('Expected Sandbox visual snapshot');
 const keys=Object.keys(emptySandboxSnapshot);if(Object.keys(value).some(k=>!keys.includes(k))||keys.some(k=>!(k in value)))throw new Error('Unknown/missing Sandbox snapshot field');
 for(const key of ['values','derived','net','clocks','pulses','traces','lockouts','spots','weather','stationCenters'])if(!object(value[key]))throw new Error('Invalid Sandbox '+key);
 for(const key of ['pulses','traces','lockouts','stationCenters'])if(Object.values(value[key] as object).some(v=>typeof v!=='number'||!Number.isFinite(v)))throw new Error('Invalid Sandbox numeric map '+key);
 for(const key of ['frozen','opened'])if(!Array.isArray(value[key])||(value[key] as unknown[]).some(v=>typeof v!=='string'))throw new Error('Invalid Sandbox '+key);
 if(!Array.isArray(value.links)||value.links.some(v=>!object(v)||typeof v.from!=='string'))throw new Error('Invalid Sandbox cable snapshot');
 if(Object.values(value.net as object).some(v=>typeof v!=='string'))throw new Error('Invalid Sandbox net status');
 if(Object.values(value.clocks as object).some(v=>v!==null&&(!object(v)||typeof v.ms!=='number'||!Number.isFinite(v.ms))))throw new Error('Invalid Sandbox clock snapshot');
 if(value.hoverSpot!==null&&(!object(value.hoverSpot)||!['x','y','w','h'].every(k=>typeof (value.hoverSpot as Record<string,unknown>)[k]==='number'&&Number.isFinite((value.hoverSpot as Record<string,unknown>)[k]))))throw new Error('Invalid Sandbox hover rectangle');
 for(const spot of Object.values(value.spots as object))if(!object(spot)||!['x','y','w','h'].every(k=>typeof spot[k]==='number'&&Number.isFinite(spot[k]))||Number(spot.w)<=0||Number(spot.h)<=0)throw new Error('Invalid Sandbox device placement');
 for(const k of Object.keys(emptySandboxSnapshot.weather))if(typeof (value.weather as Record<string,unknown>)[k]!=='number'||!Number.isFinite((value.weather as Record<string,unknown>)[k]))throw new Error('Invalid Sandbox weather');
 if(typeof value.minute!=='number'||!Number.isFinite(value.minute)||typeof value.daylight!=='number'||!Number.isFinite(value.daylight)||typeof value.forecast!=='string'||typeof value.hourLabel!=='string'||typeof value.windowVisible!=='boolean')throw new Error('Invalid Sandbox environment');
}
export class SandboxViewState {
 constructor(readonly snapshot:SandboxSnapshot){}
 get=(key:string)=>this.snapshot.values[key];
 value=(key:string)=>this.snapshot.derived[key];
 net={get:(key:string)=>this.snapshot.net[key]};
 clocks={next:(key:string)=>this.snapshot.clocks[key]??null};
 opened={has:(key:string)=>this.snapshot.opened.includes(key)};
 get links(){return this.snapshot.links;}
 frozen=(id:string)=>this.snapshot.frozen.includes(id);
 traceOf=(id:string)=>this.snapshot.traces[id]??0;
 lockLeft=(id:string)=>this.snapshot.lockouts[id]??0;
}
export const sandboxPulse=(model:SandboxViewState,key:string)=>model.snapshot.pulses[key]??0;
