import {cameraFeed} from './camera-bindings';
import type {SceneData} from '../../data/types';import type {SceneModel} from '../model';import type {GameplayDefinition} from '../gameplay/types';import type {DowntownDeviceState} from '../../art/electronics/downtown-devices';
export const downtownVisualStateTypes={lock:'string',scanned:'boolean'} as const;
export interface DowntownVisualBindings {state:Partial<Record<keyof typeof downtownVisualStateTypes,string>>;controlled:Partial<Record<'box'|'relay'|'other',string>>;lockOpenValue:string;feedFromCamera:boolean;gateHeld?:string;traceDevice?:string;sign:{tuning?:string;target?:string}}
export function downtownVisualProblems(data:SceneData,c:DowntownVisualBindings|undefined,reads:readonly string[]):string[]{
 if(c===undefined)return[];const errors:string[]=[],object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype,known=new Set([...Object.keys(data.state),...Object.keys(data.observations?.aliases??{}),...reads]);
 if(!object(c)||Object.keys(c).some(k=>!['state','controlled','lockOpenValue','feedFromCamera','gateHeld','traceDevice','sign'].includes(k))||!object(c.state)||!object(c.controlled)||!object(c.sign))return['Invalid Downtown picture bindings'];
 if(typeof c.lockOpenValue!=='string'||c.lockOpenValue.length>2000||typeof c.feedFromCamera!=='boolean')errors.push('Downtown picture values');
 for(const[role,ref]of Object.entries(c.state))if(!Object.prototype.hasOwnProperty.call(downtownVisualStateTypes,role)||typeof ref!=='string'||!Object.prototype.hasOwnProperty.call(data.state,ref)||typeof data.state[ref]!==downtownVisualStateTypes[role as keyof typeof downtownVisualStateTypes])errors.push('Downtown picture state '+role);
 for(const[role,ref]of Object.entries(c.controlled))if(!['box','relay','other'].includes(role)||typeof ref!=='string'||!known.has(ref))errors.push('Downtown controlled read '+role);
 if(c.gateHeld!==undefined&&(typeof c.gateHeld!=='string'||!known.has(c.gateHeld)))errors.push('Downtown gate-held read');
 if(c.traceDevice!==undefined&&![...data.devices,...data.nodes??[]].some(d=>d.id===c.traceDevice))errors.push('Downtown trace device');
 if(Object.keys(c.sign).some(k=>!['tuning','target'].includes(k)))errors.push('Downtown sign fields');
 if(c.sign.tuning!==undefined&&(typeof c.sign.tuning!=='string'||!Number.isFinite(data.tuning[c.sign.tuning])||data.tuning[c.sign.tuning]<=0))errors.push('Downtown sign tuning');
 if(c.sign.target!==undefined&&(typeof c.sign.target!=='string'||!/^[-a-zA-Z0-9_.]{1,128}$/.test(c.sign.target)))errors.push('Downtown sign pulse target');
 return errors;
}
export function validateDowntownVisualBindings(data:SceneData,g:GameplayDefinition){const c=data.controller?.kind==='downtown'?data.controller.visual:undefined;if(c?.sign.target!==undefined&&!Object.values(g.native?.presentation??{}).some(p=>p.target===c.sign.target))throw Error('Downtown picture requires a current pulse target');}
export function downtownVisualSnapshot(m:SceneModel,kind:string):Pick<DowntownDeviceState,'controlled'|'gateHeld'|'lock'|'scanned'|'feed'|'trace'|'signTestMs'|'signSince'>{
 const c=m.data.controller?.kind==='downtown'?m.data.controller.visual:undefined,role=kind==='box'?'box':kind==='relay'?'relay':'other',ref=c?.controlled[role],state=c?.state??{};
 return{controlled:ref!==undefined&&!!m.value(ref),gateHeld:c?.gateHeld!==undefined&&!!m.value(c.gateHeld),lock:state.lock!==undefined&&m.get(state.lock)===c!.lockOpenValue?'open':'shut',scanned:state.scanned!==undefined&&!!m.get(state.scanned),feed:c?.feedFromCamera&&cameraFeed(m)?'cam3':'ads',trace:c?.traceDevice===undefined?0:m.traceOf(c.traceDevice),signTestMs:c?.sign.tuning===undefined?3000:m.data.tuning[c.sign.tuning],signSince:c?.sign.target===undefined?1e9:m.now()-(m.scratch['pulse.'+c.sign.target]??-1e9)};
}
