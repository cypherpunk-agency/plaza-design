import source from './metro.json';
/**
 * The platforms' timetable (frames of the station scene's own time): how long a train takes to run in, stands with its doors open and
 * runs out, how often one is due, and how far along each platform's clock starts. The ride itself (dwell, doors, run, brake, halt) is
 * the Train scene's: tuning and paths of its movers in scenes/train/devices.json.
 */
export interface MetroSource {
 version:1;
 timetable:{loop:number;arrive:number;dwell:number;leave:number};
 offset:{downtown:number;galleria:number;harbor:number};
}
function fail(at:string):never{throw new Error('Invalid metro source: '+at);}
function object(v:unknown,keys:string[],at:string):Record<string,unknown>{
 if(!v||typeof v!=='object'||Array.isArray(v)||![Object.prototype,null].includes(Object.getPrototypeOf(v))||Object.keys(v).length!==keys.length||keys.some(k=>!Object.prototype.hasOwnProperty.call(v,k)))fail(at+' fields');
 return v as Record<string,unknown>;
}
function number(v:unknown,at:string,min:number,max:number,whole=true){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max||whole&&!Number.isSafeInteger(v))fail(at+' range');return v;}
/** Small explicit schema; no executable code, implicit fields or source mutation. */
export function validateMetroSource(value:unknown):MetroSource{
 const d=object(value,['version','timetable','offset'],'metro');if(d.version!==1)fail('version');
 const t=object(d.timetable,['loop','arrive','dwell','leave'],'timetable');for(const k of ['loop','arrive','dwell','leave'])number(t[k],'timetable.'+k,k==='dwell'?80:1,1000000);
 if(Number(t.loop)<Number(t.arrive)+Number(t.dwell)+Number(t.leave))fail('timetable loop must contain arrival, dwell and departure');
 const offsets=object(d.offset,['downtown','galleria','harbor'],'offset');for(const[k,v]of Object.entries(offsets))number(v,'offset.'+k,0,Number(t.loop)-1);
 return structuredClone(value) as MetroSource;
}
export const METRO_SOURCE=validateMetroSource(source);
