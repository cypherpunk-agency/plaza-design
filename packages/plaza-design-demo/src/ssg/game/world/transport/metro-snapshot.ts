import type {Station} from '../city';
import type {MetroSource} from './metro-source';
export type RidePhase='dwell'|'closing'|'running'|'opening'|'braking'|'halted'|'resuming';
export interface MetroRide {
 at:number;to:number;phase:RidePhase;timer:number;dwell:number;pos:number;d:number;span:number;frames:number;v:number;
 open:number;doors:boolean;halt:null|'track'|'siding';haltFor:number;decel:number;say:string;
}
export interface MetroSnapshot {version:1;line:Station[];ride:MetroRide;shift:Record<Station,number>;lineOpen:Record<Station,boolean>}
const stations=['downtown','galleria','harbor'] as const;
function fail(at:string):never{throw new Error('Invalid metro snapshot: '+at);}
function object(value:unknown,keys:string[],at:string):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))||Object.keys(value).length!==keys.length||keys.some(k=>!Object.prototype.hasOwnProperty.call(value,k)))fail(at+' fields');return value as Record<string,unknown>;
}
function number(value:unknown,at:string,min:number,max:number){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)fail(at+' range');return value;}
/** Pure validation precedes any mutation; snapshots name their route to prevent index reinterpretation. */
export function validateMetroSnapshot(value:unknown,context?:{line:readonly Station[];source:MetroSource}):MetroSnapshot{
 const d=object(value,['version','line','ride','shift','lineOpen'],'snapshot');if(d.version!==1)fail('version');
 if(!Array.isArray(d.line)||d.line.length!==3||new Set(d.line).size!==3||d.line.some(id=>!stations.includes(id))||stations.some(id=>!(d.line as unknown[]).includes(id)))fail('line');
 if(context&&d.line.join()!==context.line.join())fail('line order differs from pending world');
 const shift=object(d.shift,[...stations],'shift'),open=object(d.lineOpen,[...stations],'lineOpen');for(const id of stations){number(shift[id],'shift.'+id,0,context?context.source.timetable.loop-Number.EPSILON:1000000);if(context&&Number(shift[id])>=context.source.timetable.loop)fail('shift.'+id);if(typeof open[id]!=='boolean')fail('lineOpen.'+id);}
 const r=object(d.ride,['at','to','phase','timer','dwell','pos','d','span','frames','v','open','doors','halt','haltFor','decel','say'],'ride');
 for(const key of ['at','to'])if(!Number.isInteger(number(r[key],'ride.'+key,0,2)))fail('ride.'+key);
 if(typeof r.phase!=='string'||!['dwell','closing','running','opening','braking','halted','resuming'].includes(r.phase))fail('ride.phase');
 for(const key of ['timer','dwell','frames','haltFor'])number(r[key],'ride.'+key,key==='frames'?1:0,10000000);
 number(r.pos,'ride.pos',0,9000);if(r.pos===9000)fail('ride.pos');number(r.span,'ride.span',3000,9000);if(Number(r.span)%3000!==0)fail('ride.span');number(r.d,'ride.d',0,Number(r.span));
 if(Math.abs((Number(r.at)*3000+Number(r.d))%9000-Number(r.pos))>.000001)fail('ride position and distance disagree');
 number(r.v,'ride.v',0,1000000);number(r.open,'ride.open',0,1);number(r.decel,'ride.decel',Number.MIN_VALUE,1000000);
 if(typeof r.doors!=='boolean'||![null,'track','siding'].includes(r.halt as any)||typeof r.say!=='string'||r.say.length>500||r.say.includes('\0'))fail('ride doors/halt/announcement');
 if((r.phase==='braking'||r.phase==='halted')!==!!r.halt)fail('ride phase/halt');
 if(r.doors&&(r.phase!=='halted'||r.halt!=='siding'))fail('doors require a siding halt');
 return structuredClone(value) as MetroSnapshot;
}
