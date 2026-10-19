import source from './metro.json';
export interface MetroSource {
 version:1;
 timetable:{loop:number;arrive:number;dwell:number;leave:number};
 offset:{downtown:number;galleria:number;harbor:number};
 dwell:number;close:number;run:number;open:number;longRun:number;
 brake:{decel:number;window:number;accel:number;lead:number};
 halt:{track:number;siding:number;open:number};
}
function fail(at:string):never{throw new Error('Invalid metro source: '+at);}
function object(v:unknown,keys:string[],at:string):Record<string,unknown>{
 if(!v||typeof v!=='object'||Array.isArray(v)||![Object.prototype,null].includes(Object.getPrototypeOf(v))||Object.keys(v).length!==keys.length||keys.some(k=>!Object.prototype.hasOwnProperty.call(v,k)))fail(at+' fields');
 return v as Record<string,unknown>;
}
function number(v:unknown,at:string,min:number,max:number,whole=true){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max||whole&&!Number.isSafeInteger(v))fail(at+' range');return v;}
/** Small explicit schema; no executable code, implicit fields or source mutation. */
export function validateMetroSource(value:unknown):MetroSource{
 const d=object(value,['version','timetable','offset','dwell','close','run','open','longRun','brake','halt'],'metro');if(d.version!==1)fail('version');
 const t=object(d.timetable,['loop','arrive','dwell','leave'],'timetable');for(const k of ['loop','arrive','dwell','leave'])number(t[k],'timetable.'+k,k==='dwell'?80:1,1000000);
 if(Number(t.loop)<Number(t.arrive)+Number(t.dwell)+Number(t.leave))fail('timetable loop must contain arrival, dwell and departure');
 const offsets=object(d.offset,['downtown','galleria','harbor'],'offset');for(const[k,v]of Object.entries(offsets))number(v,'offset.'+k,0,Number(t.loop)-1);
 for(const k of ['dwell','close','run','open'])number(d[k],k,1,1000000);number(d.longRun,'longRun',1,10,false);
 const brake=object(d.brake,['decel','window','accel','lead'],'brake');number(brake.decel,'brake.decel',0.000001,100,false);number(brake.accel,'brake.accel',0.000001,100,false);for(const k of ['window','lead'])number(brake[k],'brake.'+k,0,3000,false);
 const halt=object(d.halt,['track','siding','open'],'halt');for(const[k,v]of Object.entries(halt))number(v,'halt.'+k,1,1000000);
 return structuredClone(value) as MetroSource;
}
export const METRO_SOURCE=validateMetroSource(source);
