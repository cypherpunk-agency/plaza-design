/**
 * The metro car is a Circuit mover of the Train scene's model (`train.car`, its doors `train.doors`, zones `tunnel` and `approach`), moved
 * by scene time on the model's tick: arrivals, departures, the siding's brake snap, halts, doors, the train home, the save, a fixture's
 * starting states. Time passes only through `model.tick(ms)`; nothing here uses a timer.
 */
import assert from 'node:assert/strict';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {SCENES} from '../../src/ssg/game/scenes';
import {createLineSystem,CAR,DOORS,LOOP,SEG,SIDING,TUNNEL_IN} from '../../src/ssg/game/world/transport/line';
import {boardRide,startRide,createTrainRules} from '../../src/ssg/game/engine/gameplay/mechanisms/line-ride';
import {validateMetroStart,metroStartingStates} from '../../src/ssg/game/world/transport/metro-start';
import {createCityModel} from '../../src/ssg/game/world/city';import citySource from '../../src/ssg/game/world/city.json';
import {METRO_SOURCE} from '../../src/ssg/game/world/transport/metro-source';
import {metroStartingState} from '../../src/ssg/game/authoring/metro-starting-state';
import {FRAME,advance} from './train-ride.mts';
const city=createCityModel(citySource);
/** Frame counts agree to a frame: scene time is the sum of the frames' ms. */
const near=(got:number|undefined,want:number,tolerance=1.5)=>assert(got!==undefined&&Math.abs(got-want)<=tolerance,'expected '+want+' got '+got);
const rig=(harborOpen=true)=>{const metro=createLineSystem(city);metro.lineOpen.harbor=harborOpen;const events:string[]=[],cues:string[]=[],m=new SceneModel({say(){},changed(){},open(){},cue:(c:string)=>cues.push(c)} as any,SCENES.train.data!,createTrainRules(metro,city));const emit=m.emit.bind(m);(m as any).emit=(key:string)=>{events.push(key+'@'+Math.round(m.now()/FRAME));emit(key);};return{metro,m,events,cues,mv:m.movers};};
/** One frame of the game loop's tick. */
const frame=(m:SceneModel)=>m.tick(FRAME,true);
const frames=(r:ReturnType<typeof rig>,n:number,each?:(i:number)=>void)=>{for(let i=0;i<n;i++){frame(r.m);each?.(i);}};

// ---- the ride cycles on scene time: stand, doors close, run, doors open, stand (arrivals, departures, a closed stop passed)
{
 const r=rig(false),{metro,m,mv}=r;m.setPaused(false);
 assert.equal(metro.ridePhase(mv),'dwell','a train that has not been boarded stands at the first stop with the doors open');assert.equal(metro.rideStop(mv),'downtown');assert.equal(metro.rideDoors(mv),1);
 boardRide(m,'galleria',240);assert.equal(metro.rideStop(mv),'galleria');assert.equal(metro.ridePos(mv),SEG);assert.equal(Math.round(metro.rideLeft(mv)),240);
 const seen=new Map<string,number>(),mark=(t:number)=>{const p=metro.ridePhase(mv)+'@'+metro.rideStop(mv);if(!seen.has(p))seen.set(p,t);};
 for(let t=1;t<=2600;t++){frame(m);mark(t);}
 // boarded with 240 frames of dwell left: closing at 240, running at 276; Galleria to Downtown passes the closed harbor stop: 1.6 times the run (1248 frames), opening 36, dwell 330
 near(seen.get('closing@galleria'),241);near(seen.get('running@galleria'),277);near(seen.get('opening@downtown'),277+1247);near(seen.get('dwell@downtown'),277+1247+36);
 assert.equal(metro.rideNext(mv),'galleria','the next stop from Downtown');
 // a stop with the harbor open: one stop's run (780 frames)
 const o=rig(true);o.m.setPaused(false);boardRide(o.m,'galleria',240);const t0=new Map<string,number>();for(let t=1;t<=1500;t++){frame(o.m);const p=o.metro.ridePhase(o.mv)+'@'+o.metro.rideStop(o.mv);if(!t0.has(p))t0.set(p,t);}
 near(t0.get('running@galleria'),277);near(t0.get('opening@harbor'),277+779);
 assert.equal(o.metro.rideNext(o.mv),'downtown');
}

// ---- sounds and events: the leg's cue plays as the doors shut and as it stops; depart/arrive are the car's own events
{
 const r=rig(true),{m}=r;m.setPaused(false);boardRide(m,'galleria',240);frames(r,1300);
 assert.deepEqual(r.cues.slice(0,2),['close','open'],'the doors close as it pulls out, open as it arrives');
 assert(r.events.some(e=>e.startsWith('train.car:depart@27')),'depart when the doors have shut');assert(r.events.some(e=>e.startsWith('train.car:arrive@')));
}

// ---- the emergency brake: the stopping point reaches the siding's approach, the car stops exactly at the siding, halts, then goes on to the stop it was heading for
for(const harborOpen of [false]){
 const r=rig(harborOpen),{metro,m,mv,events}=r;m.setPaused(false);boardRide(m,'galleria',240);
 let pulled=-1,halted=-1,resumed=-1,positionAtSiding=NaN;const approach:string[]=[];
 for(let t=1;t<=4000;t++){
  frame(m);
  const ph=metro.ridePhase(mv);
  if(pulled<0&&events.some(e=>e.startsWith('train.position:harbor siding'))){pulled=t;assert.equal(m.brake('train','car').result,'braking');}
  if(pulled>=0&&halted<0&&ph==='halted'){halted=t;positionAtSiding=metro.ridePos(mv);}
  if(halted>=0&&resumed<0&&ph==='resuming')resumed=t;
 }
 assert(pulled>0,'harbor siding was raised on the way');assert(Math.abs(positionAtSiding-SIDING)<1e-6,'the brake lands it exactly at the siding');near(resumed-halted,420,1.5);void 0;assert(true,'the halt at the siding lasts its time (frames)');
 assert(events.some(e=>e.startsWith('train.brake:stopped@'+halted)),'the brake part reports stopped as the car comes to rest');assert(events.some(e=>e.startsWith('train.car:resumed@'+resumed)));
 assert(events.some(e=>e.startsWith('train.position:tunnel@')),'the tunnel is raised on entering it');
}

// ---- a stop on the track: slows at the brake rate to rest where it would have stopped, halts 240 frames, goes on
{
 const r=rig(true),{metro,m,mv}=r;m.setPaused(false);boardRide(m,'downtown',240);frames(r,277+60);assert.equal(metro.ridePhase(mv),'running');
 const before=metro.ridePos(mv),result=m.brake('train','car');assert.deepEqual(result,{result:'braking',where:'track'});assert.equal(metro.ridePhase(mv),'braking');assert.equal(m.brake('train','car').result,'already');
 let t=0;while(metro.ridePhase(mv)==='braking'&&t<2000){frame(m);t++;}assert.equal(metro.ridePhase(mv),'halted');assert.equal(mv.halted(CAR),'track');
 const stopped=metro.ridePos(mv),speedAtPull=(()=>{const q=rig(true);q.m.setPaused(false);boardRide(q.m,'downtown',240);frames(q,277+60);const a=q.metro.ridePos(q.mv);frame(q.m);return(q.metro.ridePos(q.mv)-a)/FRAME*1000;})();
 const expected=speedAtPull**2/(2*115.2);assert(Math.abs(stopped-before-expected)<expected*.06+2,'it stops about v²/2a ahead ('+(stopped-before)+' vs '+expected+')');
 frames(r,239);assert.equal(metro.ridePhase(mv),'halted');frames(r,2);assert.equal(metro.ridePhase(mv),'resuming');
 assert.equal(m.brake('train','car').result,'braking','a train that is getting going again can be stopped again');
}
// a brake pulled while standing, or at the station, does nothing
{const r=rig(true);r.m.setPaused(false);assert.equal(r.m.brake('train','car').result,'standing');boardRide(r.m,'galleria',240);frames(r,100);assert.equal(r.m.brake('train','car').result,'standing');}

// ---- P14 end to end by the car's own parts: the safety cable keeps the doors locked; wire the stop to the doors instead and at the siding they open
{
 const locked=rig(false);locked.m.setPaused(false);boardRide(locked.m,'galleria',240);
 for(let t=0;t<4000&&!events(locked,'harbor siding');t++)frame(locked.m);
 locked.m.brake('train','car');frames(locked,400);assert(locked.metro.rideAtSiding(locked.mv));assert(!locked.metro.rideOpen(locked.mv),'the pre-wired safety cable keeps the doors shut at the siding');
 const r=rig(false),{metro,m,mv}=r;m.setPaused(false);boardRide(m,'galleria',240);
 const safety=m.links.find(l=>l.from==='train.brake:stopped'&&l.verb==='lock')!;assert(safety,'the safety cable is pre-wired');m.cut(safety);m.connect('train.brake:stopped','train.doors','open');
 for(let t=0;t<4000&&!events(r,'harbor siding');t++)frame(m);
 m.brake('train','car');let stopped=0;for(let t=0;t<2000&&metro.ridePhase(mv)!=='halted';t++){frame(m);stopped=t;}assert(metro.rideAtSiding(mv));
 frames(r,60);assert(metro.rideOpen(mv),'the stop reaches the doors by cable: they open and you can step out');assert(metro.rideAtSiding(mv));assert.equal(metro.rideView(mv).doors,true);
 assert.equal(mv.lastRun(CAR),'halt.siding.open');
 let t=60;while(metro.ridePhase(mv)==='halted'&&t<5000){frame(m);t++;}
 // released 150 ms (cable) after it stopped: halted until the doors have stood open their time (2400 frames) and shut again (36), then it goes on
 near(t,9+2400+36,3);assert.equal(metro.rideNext(mv),'downtown','it goes on to the stop it was heading for, though the harbor may be open now');assert(metro.rideDoors(mv)<1e-6);
 void stopped;
}
function events(r:ReturnType<typeof rig>,name:string){return r.events.some(e=>e.startsWith('train.position:'+name));}

// ---- the train home: its own path, begun part way through its run; doors shut; arrives, opens, stands until boarded again
{
 const r=rig(false),{metro,m,mv}=r;m.setPaused(false);assert.equal(m.runPath('train','car','home'),'started','the opening\'s scripted ride is the car\'s home path');frame(m);
 assert.equal(metro.rideStop(mv),'harbor');assert.equal(metro.rideNext(mv),'downtown');assert.equal(metro.ridePhase(mv),'running');assert.equal(metro.rideDoors(mv),0);assert.equal(metro.rideView(mv).say,'NEXT: DOWNTOWN');
 const f0=240/1800,d0=SEG*(1-Math.cos(Math.PI*f0))/2;assert(Math.abs(metro.rideRun(mv)-d0/SEG)<.01,'it joins its run 240 frames in');
 let end=-1;for(let t=0;t<1700&&end<0;t++){frame(m);if(metro.ridePhase(mv)==='opening')end=t+1;}assert(Math.abs(end-(1800-240-1))<3,'1560 frames of run in all ('+end+')');
 frames(r,100);assert.equal(metro.ridePhase(mv),'dwell','it stands at Downtown with its doors open');assert.equal(metro.rideStop(mv),'downtown');assert(metro.rideOpen(mv));
 frames(r,3000);assert.equal(metro.rideStop(mv),'downtown','and stays until boarded again');assert(metro.rideOpen(mv));
 boardRide(m,'galleria',240);assert.equal(metro.rideStop(mv),'galleria');
}

// ---- the car is saved with the scene: a train under way comes back where it set off, standing, its doors open
{
 const r=rig(true),{metro,m,mv}=r;m.setPaused(false);boardRide(m,'galleria',240);frames(r,500);assert.equal(metro.ridePhase(mv),'running');
 const snapshot=structuredClone(m.snapshot());assert.deepEqual(snapshot.movers![CAR],{at:'galleria'});assert(snapshot.movers![DOORS]);
 const again=rig(true);again.m.setPaused(false);again.m.restore(snapshot);assert.equal(again.metro.rideStop(again.mv),'galleria');assert.equal(again.metro.ridePhase(again.mv),'dwell');assert.equal(again.metro.ridePos(again.mv),SEG);
 // reset puts everything back, and the same objects stay
 const lineOpen=metro.lineOpen;m.reset();assert.equal(metro.rideStop(mv),'downtown');metro.lineOpen.harbor=false;metro.reset();assert.equal(metro.lineOpen,lineOpen);assert.equal(metro.lineOpen.harbor,true);
}

// ---- the stretches along the loop and the zones: the tunnel under the mall, the siding's approach
assert.equal(TUNNEL_IN,SEG-470);assert.equal(SIDING,2*SEG-650);assert.equal(LOOP,3*SEG);

// ---- a fixture's starting states run the car's own movers to them
for(const kind of metroStartingStates){
 const start=metroStartingState(kind,'galleria',city,METRO_SOURCE);assert.deepEqual(validateMetroStart(start,city.LINE),start);
 const r=rig(false),{metro,m,mv}=r;r.metro.lineOpen.harbor=false;startRide(m,metro,start);
 const phase=metro.ridePhase(mv);
 if(kind==='at-station'){assert.equal(phase,'dwell');assert.equal(metro.rideStop(mv),'galleria');assert.equal(Math.round(metro.rideLeft(mv)),330);}
 if(kind==='running'){assert.equal(phase,'running');assert(metro.rideRun(mv)>=.25&&metro.rideRun(mv)<.27);}
 if(kind==='braking')assert.equal(phase,'braking');
 if(kind==='track-stop'){assert.equal(phase,'halted');assert.equal(mv.halted(CAR),'track');}
 if(kind==='siding'||kind==='siding-open'){assert.equal(phase,'halted');assert(metro.rideAtSiding(mv));assert(Math.abs(metro.ridePos(mv)-SIDING)<1e-6);}
 if(kind==='siding-open')assert(metro.rideOpen(mv),'doors released');if(kind==='siding')assert(!metro.rideOpen(mv));
}
for(const mutate of [(s:any)=>s.start='nonsense',(s:any)=>s.station='nowhere',(s:any)=>s.lineOpen.harbor='yes',(s:any)=>s.extra='code',(s:any)=>s.version=2,(s:any)=>delete s.lineOpen.galleria]){const bad:any=structuredClone(metroStartingState('siding','galleria',city,METRO_SOURCE));mutate(bad);assert.throws(()=>validateMetroStart(bad,city.LINE));}
console.log('Train ride PASS: the car and its doors are movers of the Train scene on scene time (cycle, arrivals/departures, closed stop passed, cues, siding brake snap, halts, doors at the siding, train home, saved with the scene), fixture starting states, invalid starts rejected.');
void advance;
