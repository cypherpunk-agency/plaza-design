/**
 * Test helper: brings the Train scene's car (a Circuit mover of the scene model) into a phase by the model's own tick,
 * the way the game loop would, never by writing the ride. Time passes only through `model.tick(ms)`.
 */
import {boardRide} from '../../src/ssg/game/engine/gameplay/mechanisms/line-ride';
import {CAR,DOORS} from '../../src/ssg/game/world/transport/line';
import type {SceneModel} from '../../src/ssg/game/engine/model';
import type {LineSystem} from '../../src/ssg/game/world/transport/line';

export const FRAME=1000/60;
export type TrainPhase='dwell'|'closing'|'running'|'opening'|'braking'|'halted'|'siding'|'resuming';

/** Scene time on by `ms` (the model is unpaused for it, paused again after). */
export function advance(m:SceneModel,ms:number){m.setPaused(false);try{m.tick(ms,true);}finally{m.setPaused(true);}}

/** Run the scene's time on until `done`, in steps. */
export function tickUntil(m:SceneModel,done:()=>boolean,step=20,limit=20000){
 for(let i=0;!done();i++){if(i>limit)throw new Error('The train never got there');advance(m,step);}
}

/**
 * Board the car at `station` (default galleria, the harbor stop closed, so its next run passes the siding) and bring it to `phase`:
 * `braking` and `halted` are an emergency stop on the track soon after the run began; `siding` is stopped at the old siding;
 * `resuming` has got going again. `doors` (0 to 1) then puts the doors at that opening, by their own mover.
 */
export function driveTrain(m:SceneModel,metro:LineSystem,phase:TrainPhase,opts:{station?:string;doors?:number}={}){
 const mv=m.movers,now=()=>metro.ridePhase(mv);
 metro.lineOpen.harbor=false;
 boardRide(m,opts.station??'galleria',240);
 if(phase==='closing'||phase==='opening')tickUntil(m,()=>now()===phase);
 else if(phase!=='dwell'){
  tickUntil(m,()=>now()==='running');
  if(phase!=='running'){
   if(phase==='siding')tickUntil(m,()=>{const b=mv.brakePreview(CAR);return b.result==='braking'&&b.where==='siding';},10);
   else advance(m,40);
   m.brake('train','car');
   if(phase!=='braking')tickUntil(m,()=>now()==='halted');
   if(phase==='resuming')tickUntil(m,()=>now()==='resuming');
  }
 }
  // (a cable's signal takes 150 ms to arrive: let those settle before the doors are put where asked)
 if(opts.doors!==undefined){
  advance(m,200);
  m.runPath('train','doors','set.shut');
  if(m.runPath('train','doors','open')!=='started')throw new Error('The doors cannot open');
  advance(m,opts.doors*Number(m.data.tuning.openMs));
  if(Math.abs((mv.position(DOORS)??0)-opts.doors)>.01)throw new Error('doors at '+mv.position(DOORS));
 }
}
