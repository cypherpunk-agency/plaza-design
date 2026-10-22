import type {Station} from '../city';
/**
 * Where a private Play (the editor's fixtures) puts the train when it starts: boarded at a station and brought to one of these
 * states by running the car's own movers (engine/gameplay/mechanisms/line-ride.ts `startRide`), and which stops LINE 0 stops at.
 * Not a copy of the ride: the ride is the Train scene's movers, saved with the scene.
 */
export const metroStartingStates=['at-station','running','braking','track-stop','siding','siding-open'] as const;
export type MetroStartingState=typeof metroStartingStates[number];
export interface MetroStart {version:1;start:MetroStartingState;station:Station;lineOpen:Record<Station,boolean>}
const stations=['downtown','galleria','harbor'] as const;
function fail(at:string):never{throw new Error('Invalid metro start: '+at);}
/** Pure validation of a fixture's train start; `line` (when known) names the stations the pending city has. */
export function validateMetroStart(value:unknown,line?:readonly Station[]):MetroStart{
 const d=value as Record<string,unknown>;
 if(!d||typeof d!=='object'||Array.isArray(d)||Object.keys(d).sort().join()!=='lineOpen,start,station,version')fail('fields');
 if(d.version!==1)fail('version');
 if(!metroStartingStates.includes(d.start as MetroStartingState))fail('start');
 if(!stations.includes(d.station as Station)||(line&&!line.includes(d.station as Station)))fail('station');
 const open=d.lineOpen as Record<string,unknown>;
 if(!open||typeof open!=='object'||Array.isArray(open)||Object.keys(open).sort().join()!==[...stations].sort().join()||stations.some(s=>typeof open[s]!=='boolean'))fail('lineOpen');
 return structuredClone(value) as MetroStart;
}
