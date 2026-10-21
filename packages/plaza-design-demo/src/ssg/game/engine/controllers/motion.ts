import stacksDefaults from './stacks-defaults.json';import downtownDefaults from './downtown-defaults.json';import type {SceneData} from '../../data/types';
import {downtownVisualProblems,type DowntownVisualBindings} from './downtown-visual';
export interface StacksController {kind:'stacks';version:1;lift:Record<'overMs'|'hoistMs'|'travelMs'|'lowerMs',number>;returnMs:number;scannerDevice:string;state:Record<'boxAt'|'departed'|'box'|'loaded'|'found',string>}
export interface DowntownController {kind:'downtown';version:1;outside:number;inside:number;signalMs:number;devices:Record<'gate'|'vehicle',string>;state:{at:string};speedTuning:string;visual?:DowntownVisualBindings}
export const stacksController=(data:Pick<SceneData,'controller'>):StacksController=>(data.controller??stacksDefaults)as StacksController;
export const downtownController=(data:Pick<SceneData,'controller'>):DowntownController=>(data.controller??downtownDefaults)as DowntownController;
export function motionControllerProblems(data:SceneData,reads:readonly string[]=[]):string[]{
 const errs:string[]=[],c=data.controller?.kind==='stacks'?stacksController(data):downtownController(data),defaults=data.controller?.kind==='stacks'?stacksDefaults:downtownDefaults,object=(v:unknown)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
 const shape=(v:unknown,expected:object)=>{if(!object(v)||Object.keys(v as object).sort().join()!==Object.keys(expected).sort().join())errs.push('motion controller fields');};shape(c.kind==='downtown'?Object.fromEntries(Object.entries(c).filter(([k])=>k!=='visual')):c,defaults);if(!object(c))return errs;if(c.kind!==data.id||c.version!==1)errs.push('motion controller kind/version');shape(c.state,defaults.state);if(errs.length)return errs;
 const state=(role:string,ref:string,type:string)=>{if(typeof ref!=='string'||typeof data.state[ref]!==type)errs.push('motion state '+role);};
 const number=(v:unknown,key:string)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<=0||v>1000000)errs.push('motion parameter '+key);};
 const device=(ref:string,spot=false)=>{const d=data.devices.find(d=>d.id===ref);if(!d||spot&&!d.layout?.spot)errs.push('motion device '+ref);};
 if(c.kind==='stacks'){shape(c.lift,stacksDefaults.lift);if(object(c.lift))for(const[k,v]of Object.entries(c.lift))number(v,k);number(c.returnMs,'returnMs');device(c.scannerDevice);for(const[k,v]of Object.entries(c.state))state(k,v,k==='departed'||k==='found'?'boolean':k==='loaded'?'number':'string');if(!data.camera?.crates.some(k=>k.id===data.state[c.state.box]))errs.push('motion cargo crate');}
 else if(c.kind==='downtown'){shape(c.devices,downtownDefaults.devices);if(object(c.devices))for(const ref of Object.values(c.devices))device(ref,true);for(const key of ['outside','inside','signalMs']as const)number(c[key],key);state('at',c.state.at,'string');if(typeof c.speedTuning!=='string')errs.push('motion speed reference');else number(data.tuning[c.speedTuning],'speed');}
 if(c.kind==='downtown')errs.push(...downtownVisualProblems(data,c.visual,reads));return errs;
}
