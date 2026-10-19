import {createLineSystem} from '../world/transport/line';
import {validateMetroSnapshot} from '../world/transport/metro-snapshot';
import type {CityModel,Station} from '../world/city';
import type {MetroSource} from '../world/transport/metro-source';
export const metroStartingStates=['at-station','running','braking','track-stop','siding','siding-open'] as const;
export type MetroStartingState=typeof metroStartingStates[number];
/** Convenient authored states use the production controller's route/phase configuration. */
export function metroStartingState(kind:MetroStartingState,station:Station,world:CityModel,source:MetroSource){
 const metro=createLineSystem(world,source);metro.lineOpen.harbor=false;metro.boardRide(station,source.dwell);
 if(kind==='at-station')return metro.capture();
 metro.stepRide(metro.ride.dwell);metro.stepRide(metro.CLOSE);
 const r=metro.ride,mark=metro.sidingAlong(),fraction=.25;
 r.d=r.span*fraction;r.pos=(r.at*metro.SEG+r.d)%metro.LOOP;r.timer=Math.acos(1-2*fraction)/Math.PI*r.frames;
 if(kind==='braking')metro.brakeRide();
 if(kind==='track-stop'){r.phase='halted';r.halt='track';r.timer=0;r.v=0;r.haltFor=metro.HALT.track;r.say='STOPPED · PLEASE WAIT';}
 if(kind==='siding'||kind==='siding-open'){
  if(mark===null)throw new Error('This run does not pass the siding. Choose Galleria on the original route.');
  r.d=mark;r.pos=(r.at*metro.SEG+mark)%metro.LOOP;r.phase='halted';r.halt='siding';r.timer=0;r.v=0;r.doors=kind==='siding-open';r.open=r.doors?1:0;r.haltFor=r.doors?metro.HALT.open:metro.HALT.siding;r.say='STOPPED · NOT A STATION';
 }
 return validateMetroSnapshot(metro.capture(),{line:world.LINE,source});
}
