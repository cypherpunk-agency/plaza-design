import {NET,LOGIC,ENGINE} from '../data';
import type {NetData} from '../data/types';import {checkGame,type SceneCheck} from '../data/check';
export {createNetworkContext} from '../engine/network-context';
/** Shape and budgets first: the existing semantic checker then validates the prospective whole world. */
export function validateNetworkShape(value:unknown):NetData{
 const seen=new Set<object>();function json(v:unknown,depth=0):void{if(depth>48)throw Error('Network source nesting limit');if(v===null||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))return;if(typeof v==='string'){if(v.length>8000)throw Error('Network source string limit');return;}if(!v||typeof v!=='object'||seen.has(v)||!Array.isArray(v)&&Object.getPrototypeOf(v)!==Object.prototype)throw Error('Network source requires finite plain JSON');seen.add(v);if(Array.isArray(v)&&v.length>512)throw Error('Network source array limit');for(const[k,c]of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(k))throw Error('Reserved network source key');json(c,depth+1);}seen.delete(v);}json(value);if(JSON.stringify(value).length>512000)throw Error('Network source size limit');
 const d=structuredClone(value)as NetData;if(!d||typeof d!=='object'||Array.isArray(d))throw Error('Network source must be an object');for(const k of ['nodes','cables','keyring','networks','programs']as const)if(!Array.isArray(d[k]))throw Error('Network source requires '+k+' array');
 for(const [kind,rows,baseline]of [['network',d.networks,NET.networks],['program',d.programs,NET.programs]]as const){const ids=new Set<string>();for(const row of rows){if(!row||typeof row!=='object'||typeof row.id!=='string'||ids.has(row.id))throw Error('Duplicate/invalid '+kind+' identity');ids.add(row.id);}for(const row of baseline)if(!ids.has(row.id))throw Error('Protected saved '+kind+' identity '+row.id);}
 return d;
}
export function validateNetworkSource(value:unknown,scenes:readonly SceneCheck[]):NetData{
 const d=validateNetworkShape(value);
 let problems:string[];try{problems=checkGame([...scenes],LOGIC,d,ENGINE);}catch(e){throw Error('Invalid network source shape: '+String(e));}if(problems.length)throw Error(problems.join('\n'));return d;
}
