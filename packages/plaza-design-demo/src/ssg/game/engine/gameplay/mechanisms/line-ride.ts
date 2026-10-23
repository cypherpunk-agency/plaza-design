/**
 * Mechanism `lineRide` (scene.json `stage.mechanisms`): the metro car you ride on LINE 0. TRAIN-0, the code side of the metro car's one device (data/train.json): P14, "the stop that
 * isn't on the map". The train is not code: it is two Circuit movers of TRAIN-0 in devices.json, `car` (the train on the loop: stops
 * downtown / galleria / harbor / siding, the paths `board`, `stand`, `go`, `home`, `halt`, `halt.siding`, `halt.siding.open`, its
 * emergency stop) and `doors` (shut and open, driven by the car's legs), with two zones on the car: `tunnel` and `approach` (where the car
 * would stop if the brake were pulled now: it reaches the siding). The car's times are the scene's tuning. Scene time moves it, on the
 * model's tick; the picture and the read-outs below read the movers (world/transport/line.ts `rideView`). What is left in code is
 * the three physical orders that send them, and the reads.
 *
 * - `position` raises `tunnel` as the car runs into the tunnel under the mall (the zone `tunnel` relays its `enters`), and `harbor
 *   siding` at the moment an emergency stop would land it at the old siding before the harbor (the zone `approach` relays it; the
 *   siding is on no map and flashes past in under a second, so by hand you are always too early or too late). Wired to `brake pull`, the brake
 *   catches it.
 * - `brake pull` (`train.brake`) is only taken from a passenger the emergency is registered to:
 *   Moth registered #0451 for "a friend", and Moth's maglev pass (P13's jacket, the save's item
 *   `maglev.pass`) says you are the friend. The effect asks the car to brake (`SceneModel.brake`); the car's brake snaps to the siding when it would
 *   stop within the window of it. When it comes to a stand it raises `stopped` (the brake part relays it) and reports `train.halted`; when it
 *   gets going again, `resumed` (`train.resumed`).
 * - `doors`: the pre-wired safety cable `brake:stopped → doors lock` keeps them shut. Replace it
 *   with `brake:stopped → doors open` and at the siding they open: the harbor flag
 *   (`HARBOR_FLAG`) is set for good and the step out leads up a service stair to the pier.
 *
 * Pure: no DOM, so node can run it (the build's check).
 */

import * as defaultCity from '../../../world/city';
import type {CityModel} from '../../../world/city';
import type {Effect, SceneRules} from "../../rules";
import type {SceneModel} from '../../model';
import type {SceneData} from '../../../data/types';
import type {MetroStart} from '../../../world/transport/metro-start';
import * as defaultMetro from '../../../world/transport/line';
import {CAR,DOORS} from '../../../world/transport/line';
import type {LineSystem} from '../../../world/transport/line';
import type {SceneMechanism} from '../scene-mechanisms';
import {trainLayoutOf,prepareTrainFrame,trainVisual,TRAIN_LAYOUT_KEY,TRAIN_FRAME_KEY} from '../binding-providers/train';

/** The save's item that makes the brake take your pull (P13 hands it over). */
export const PASS = 'maglev.pass';

const split=(key:string):[string,string]=>{const i=key.indexOf('.');return[key.slice(0,i),key.slice(i+1)];};
const [CAR_DEVICE,CAR_NOUN]=split(CAR),[,DOORS_NOUN]=split(DOORS);
/** One frame, ms: the boarding's `left` and the opening's timings count in frames. */
const FRAME=1000/60;

/**
 * You board the car at `st` with the doors open `left` more frames (the train you stepped onto at the platform): its `board` path
 * begins from that stop, already part way through the dwell. A boarding never has less than two seconds to go.
 */
export function boardRide(m:SceneModel,st:string,left:number){
 const dwell=Number(m.data.tuning.dwellMs);
 if(m.runPath(CAR_DEVICE,CAR_NOUN,'board',{from:st,ahead:dwell-Math.max(120,left)*FRAME})!=='started')throw new Error('The metro car has no path board');
}

/**
 * A private Play's start (the editor's fixtures, `MetroStart`): the car is boarded at the start's station and run, on the model's own
 * tick, to the state asked for: standing at the station, a quarter of the way along its run, braking, stopped on the track, stopped at the
 * old siding, or at the siding with its doors let open. The caller gives the model's time back to the game (`setPaused`) afterwards.
 */
export function startRide(m:SceneModel,metro:LineSystem,start:MetroStart){
 const mv=m.movers,tune=(k:string)=>Number(m.data.tuning[k]),step=(ms:number)=>m.tick(ms,false),phase=()=>metro.ridePhase(mv);
 boardRide(m,start.station,tune('dwellMs')/FRAME);
 if(start.start==='at-station')return;
 m.setPaused(false);
 step(tune('dwellMs')+tune('closeMs')+1);
  if(start.start==='track-stop')step(40);else for(let i=0;metro.rideRun(mv)<.25&&i<5000;i++)step(20);
 if(start.start==='running')return;
 if(start.start==='siding'||start.start==='siding-open')for(let i=0;mv.brakePreview(CAR).result!=='braking'||(mv.brakePreview(CAR) as {where?:string}).where!=='siding';i++){if(i>5000)throw new Error('The metro car never comes to the siding');step(10);}
 m.brake(CAR_DEVICE,CAR_NOUN);
 if(start.start==='braking')return;
 for(let i=0;phase()!=='halted'&&i<5000;i++)step(20);
  // (the safety cable's signal takes 150 ms to lock the doors; they are let open after it)
 if(start.start==='siding-open'){step(200);m.runPath(CAR_DEVICE,CAR_NOUN,'halt.siding.open');step(tune('openMs')+1);}
}

/** What the scene's code relies on in the Train scene's devices.json (problems, one message each). */
export function trainSourceProblems(z:SceneData):string[]{
 const out:string[]=[],car=z.devices.find(d=>d.id===CAR_DEVICE)?.nouns.find(n=>n.id===CAR_NOUN)?.mover,doors=z.devices.find(d=>d.id===CAR_DEVICE)?.nouns.find(n=>n.id===DOORS_NOUN)?.mover;
 if(!car)out.push('TRAIN-0 needs the mover part '+CAR);
 else{
  for(const p of ['board','home','halt.siding.open'])if(!car.paths?.[p])out.push('The metro car needs the path '+p);
  if(!car.brake)out.push('The metro car needs a brake');
  if(!car.ring)out.push('The metro car runs on a ring');
  for(const s of ['downtown','galleria','harbor','siding'])if(!(s in car.stops))out.push('The metro car needs the stop '+s);
  if(car.brake&&!car.brake.snap?.some(x=>x.stop==='siding'))out.push('The metro car brake snaps to the stop siding');
  for(const k of ['dwellMs'])if(typeof z.tuning[k]!=='number')out.push('TRAIN-0 needs the tuning value '+k);
 }
 if(!doors)out.push('TRAIN-0 needs the mover part '+DOORS);
 else for(const p of ['open','shut','set.open','set.shut'])if(!doors.paths?.[p])out.push('The doors need the path '+p);
 return out;
}

export function createTrainRules(metro:LineSystem=defaultMetro,city:CityModel=defaultCity):SceneRules{
 const {STATIONS,LINE}=city;
 const {between,rideAtSiding,rideDoors,rideNext,rideStop,SEG,LOOP,TUNNEL_IN,SIDING}=metro;
/** Physical region only; wording belongs to source labels. */
function region(pos: number): string {
  // the stretches train.ts lays along the loop (a district reaches 900 either side of its stop)
  const u = ((pos % LOOP) + LOOP) % LOOP;
  if (u >= TUNNEL_IN && u < 2 * SEG - TUNNEL_IN) return 'tunnel';
  if (u >= SEG + 900 && u < 2 * SEG - 900) return 'bridge';
  if (u >= 2 * SEG - 900 && u < 2 * SEG + 900) return 'containers';
  if (u >= 2 * SEG + 900 && u < 3 * SEG - 900) return 'towers';
  if (u >= 900 && u < SEG - 900) return 'viaduct';
  if (u >= SEG - 900 && u < SEG + 900) return 'mall';
  return 'downtown';
}

/** The stops after this one, counting to the one the car runs to: more than one is a closed station passed. */
const segments=(m:SceneModel)=>{const at=LINE.indexOf(rideStop(m.movers)),to=LINE.indexOf(metro.nextStation(rideStop(m.movers)));return((to-at+LINE.length-1)%LINE.length)+1;};

/** TRAIN-0's rules. The pass is an item the player carries and the harbor flag a save flag: the model's `carry` and `flag` reach the save. */


  const effects: Record<string, Effect> = {
    'train.brake': (w) => {
      // The physical operation owns acceptance and its redraw. Source cases own replies.
      w.m.brake(CAR_DEVICE,CAR_NOUN);
    },
    // Permission cases, goal and reply belong to the shared source evaluator.
    // Physical opening reports a milestone; the shared command owns the city flag.
    'train.doors': (w) => {
      if(rideAtSiding(w.m.movers))w.m.runPath(CAR_DEVICE,CAR_NOUN,'halt.siding.open');
      w.input('train.doors.opened');
    },
    'train.lock': (w) => { if(rideDoors(w.m.movers)>0)w.m.runPath(CAR_DEVICE,DOORS_NOUN,'shut'); },
  };

  return {
    effects,
    inputs:['train.halted','train.resumed','train.doors.opened'],
    /** Where the car's stops and its zones' edges are measured from: the loop in LINE's order, the siding and the tunnel. */
    places:{...Object.fromEntries(LINE.map((id,i)=>[id,{x:i*SEG,h:0}])),siding:{x:SIDING,h:0},tunnelIn:{x:TUNNEL_IN,h:0},tunnelOut:{x:2*SEG-TUNNEL_IN,h:0}},
    check:trainSourceProblems,
    derivedTypes: {
      trainBetween:'boolean', trainAtStation:'boolean', trainStopName:'string', trainNextName:'string',
      trainKilometres:'string', trainDoorsOpen:'boolean', trainStanding:'boolean', trainBraking:'boolean',
      trainCanBrake:'boolean', trainHalted:'boolean', trainAtSiding:'boolean', trainHaltSiding:'boolean', trainRegion:'string',
      trainNext:'string', trainHeading:'string', trainPass:'boolean', trainDoorsAjar:'boolean',
    },
    derived: {
      /** Physical observations; permissions remain editable native source cases. */
      trainBetween: (m) => between(m.movers),
      trainAtStation: (m) => !between(m.movers),
      trainStopName: (m) => STATIONS[rideStop(m.movers)].name,
      trainNextName: (m) => STATIONS[rideNext(m.movers)].name,
      trainKilometres: (m) => (metro.ridePos(m.movers) / 1000).toFixed(1),
      trainDoorsOpen: (m) => rideDoors(m.movers) > 0.5,
      trainStanding: (m) => { const p = metro.ridePhase(m.movers); return p !== 'running' && p !== 'resuming' && p !== 'braking'; },
      trainBraking: (m) => metro.ridePhase(m.movers) === 'braking',
      trainCanBrake: (m) => { const p = metro.ridePhase(m.movers); return p === 'running' || p === 'resuming'; },
      trainHalted: (m) => metro.ridePhase(m.movers) === 'halted',
      trainAtSiding: (m) => rideAtSiding(m.movers),
      trainHaltSiding: (m) => m.movers.halted(CAR) === 'siding',
      trainRegion: (m) => region(metro.ridePos(m.movers)),
      /** What the car's paths ask: the station it runs to (a closed one is passed), whether that passes one, the stop it was heading for, whether its doors are open at all. */
      trainNext: (m) => metro.nextStation(rideStop(m.movers)),
      trainPass: (m) => segments(m) > 1,
      trainHeading: (m) => m.movers.target(CAR) ?? rideStop(m.movers),
      trainDoorsAjar: (m) => rideDoors(m.movers) > 1e-6,
    },
    needs: {
      devices:[{id:'train',nouns:[{id:'position',function:'sense',events:['tunnel','harbor siding']},{id:'brake',function:'act',events:['stopped']},{id:'car',function:'act'},{id:'doors',function:'act'}]}],
    },

  };
}

/** The ride and its car: the brake, doors and tunnel rules over the car's movers, the car's layout and the frame it paints (the `train` binding provider reads both). The scene's artwork roles place the car's fittings. */
export const lineRide:SceneMechanism={
 face:{function:'act'},
 label:'LINE 0 car (ride, brake, doors, passengers)',
 requires:['ceiling','roof','news','windowStyle','lineMap','staff','gangway','gangDoor','brake'],world:true,ownsRoom:true,
 rulesShape:()=>createTrainRules(),
 check:({roles})=>{const w=roles.windowStyle;if(Number(w.props.h1)<=Number(w.props.h0)+6||Number(w.props.width)<=6)throw Error('Train requires a valid window style');},
 apply:({scene,rows,roles,actors,width,content,world,shared})=>{
  const layout=trainLayoutOf(scene,rows,roles,width,content.spawn);
  shared.set(TRAIN_LAYOUT_KEY,layout);
  return{
   rules:createTrainRules(world?.metro,world?.city),
   presentation:{prepare:(v,e)=>{shared.set(TRAIN_FRAME_KEY,prepareTrainFrame({source:scene,rows,roles,actors,layout},v,e.hover,trainVisual(v,world,e.m.movers)));}},
  };
 },
};
