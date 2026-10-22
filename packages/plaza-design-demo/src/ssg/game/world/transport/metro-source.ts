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
 /** Stations LINE 0 does not stop at until the named city lock (city.json `LOCKS`) is open. */
 locked:Partial<Record<'downtown'|'galleria'|'harbor',string>>;
}
function fail(at:string):never{throw new Error('Invalid metro source: '+at);}
function object(v:unknown,keys:string[],at:string):Record<string,unknown>{
 if(!v||typeof v!=='object'||Array.isArray(v)||![Object.prototype,null].includes(Object.getPrototypeOf(v))||Object.keys(v).length!==keys.length||keys.some(k=>!Object.prototype.hasOwnProperty.call(v,k)))fail(at+' fields');
 return v as Record<string,unknown>;
}
function number(v:unknown,at:string,min:number,max:number,whole=true){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max||whole&&!Number.isSafeInteger(v))fail(at+' range');return v;}
/** Small explicit schema; no executable code, implicit fields or source mutation. */
export function validateMetroSource(value:unknown):MetroSource{
 const d=object(value,['version','timetable','offset','locked'],'metro');if(d.version!==1)fail('version');
 const t=object(d.timetable,['loop','arrive','dwell','leave'],'timetable');for(const k of ['loop','arrive','dwell','leave'])number(t[k],'timetable.'+k,k==='dwell'?80:1,1000000);
 if(Number(t.loop)<Number(t.arrive)+Number(t.dwell)+Number(t.leave))fail('timetable loop must contain arrival, dwell and departure');
 const offsets=object(d.offset,['downtown','galleria','harbor'],'offset');for(const[k,v]of Object.entries(offsets))number(v,'offset.'+k,0,Number(t.loop)-1);
 {const l=d.locked;if(!l||typeof l!=='object'||Array.isArray(l)||Object.getPrototypeOf(l)!==Object.prototype)fail('locked fields');for(const[k,v]of Object.entries(l)){if(!['downtown','galleria','harbor'].includes(k))fail('locked station '+k);if(typeof v!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(v))fail('locked.'+k+' needs a lock id');}}
 return structuredClone(value) as MetroSource;
}
/** Every locked station names a lock the city declares (city.json `LOCKS`). */
export function validateMetroLocks(source:MetroSource,locks:Readonly<Record<string,unknown>>|undefined):MetroSource{
 for(const[station,lock]of Object.entries(source.locked))if(!locks||!Object.prototype.hasOwnProperty.call(locks,String(lock)))fail('locked.'+station+' names unknown city lock '+String(lock));
 return source;
}
export const METRO_SOURCE=validateMetroSource(source);
