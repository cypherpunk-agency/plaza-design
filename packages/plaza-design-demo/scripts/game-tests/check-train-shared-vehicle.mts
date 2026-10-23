/** The actual P14 Circuit drives shared vehicle floors/doors; there is no second brake simulation. */
import assert from 'node:assert/strict';
import {SCENES} from '../../src/ssg/game/scenes';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {attachNativeGameplay} from '../../src/ssg/game/engine/gameplay/native-bindings';
import {fixtureGameplayPort} from './model-gameplay-fixture.mts';
import {createTrainRules,boardRide} from '../../src/ssg/game/engine/gameplay/mechanisms/line-ride';
import {createLineSystem,CAR,DOORS,LOOP,SEG,SIDING} from '../../src/ssg/game/world/transport/line';
import {validateVehicle,type VehicleSource} from '../../src/ssg/game/world/vehicles';
import {levelArrive,levelStep,levelInteract,levelHints,type Level,type LevelSource} from '../../src/ssg/game/engine/level';
import {saveVehicle,restoreVehicle} from '../../src/ssg/game/engine/level-vehicles';
const scene=SCENES.train,dt=1000/60;
// A compact physical track fixture, not the final authored station/tunnel layout.
const vehicle:VehicleSource=validateVehicle({id:'line0',kind:'train',mover:CAR,doors:{mover:DOORS,open:.6},cars:[{id:'cab',width:300,doors:[{id:'exit',x:64,w:36}],seats:[]}],
 route:{ring:true,legs:[{zone:'here',from:{x:0,h:0},to:{x:LOOP,h:0},length:LOOP,facing:1}]},
 berths:[{id:'galleria',zone:'here',x:SEG,h:0,floor:'galleria'},{id:'siding',zone:'here',x:SIDING,h:0,floor:'siding'}]});
const source:LevelSource={floors:[{id:'galleria',x:SEG,w:500,h:0,building:'',label:'Galleria'},{id:'siding',x:SIDING,w:500,h:0,building:'',label:'Siding'}],links:[],doors:[],lifts:[],shells:{},interiors:{},low:0,high:0,vehicles:[{id:'line0',source:vehicle,x:0,h:0}]};
function rig(paid:boolean,rewire:boolean,openMs=Number(scene.data!.tuning.openMs)){
 const metro=createLineSystem();metro.lineOpen.harbor=false;
 let root:any={flags:{},items:paid?{'maglev.pass':1}:{},tokens:0};
 const data={...scene.data!,tuning:{...scene.data!.tuning,openMs}};
 const model=new SceneModel({say(){},open(){},changed(){},carry:item=>root.items[item]??0},data,createTrainRules(metro));
 const session=new GameplaySession(scene.gameplay!,fixtureGameplayPort(scene.gameplay!,{read:()=>root,write:s=>{root=s;}},()=>model));attachNativeGameplay(model,session);
 boardRide(model,'galleria',240);model.setPaused(false);
 const p={x:SEG+64,y:0,vy:0,face:1,onGround:true,moving:false},lv:Level={source,state:levelArrive(source,p,0)};
 levelStep(lv,p,0,1,model);assert(levelInteract(lv,'vehicle:line0',p,model),'board through the actual shared open-door rule');
 assert.notEqual(model.connect('train.position:harbor siding','train.brake','pull')[2],'err');
 if(rewire){const safety=model.links.find(l=>l.from==='train.brake:stopped'&&l.verb==='lock')!;assert(safety);model.cut(safety);assert.notEqual(model.connect('train.brake:stopped','train.doors','open')[2],'err');}
 const step=()=>{model.tick(dt,true);levelStep(lv,p,0,1,model);};
 return{metro,model,session,p,lv,step,state:()=>root};
}
// With no pass, the actual position signal reaches the brake but cannot stop the vehicle.
{
 const r=rig(false,true);let approach=false;
 for(let i=0;i<2200;i++){r.step();approach ||= r.model.movers.brakePreview(CAR).result==='braking'&&(r.model.movers.brakePreview(CAR) as any).where==='siding';assert(!['braking','halted'].includes(r.metro.ridePhase(r.model.movers)),'unregistered emergency is refused by native source permissions');}
 assert(approach);assert.equal(r.state().flags['harbor:open'],undefined);r.session.dispose();
}
for(const rewired of [false,true]){
 const r=rig(true,rewired),{model,metro,lv,p}=r;let stopped=false;
 for(let i=0;i<2200;i++){
  r.step();assert(Math.abs(p.x-(model.movers.position(CAR)!+64))<1e-6,'the existing level step carries the rider through braking');
  if(metro.rideAtSiding(model.movers)){stopped=true;break;}
 }
 assert(stopped,'the native position→brake cable catches the actual siding');
 for(let i=0;i<60;i++)r.step();
 assert.equal(model.movers.position(CAR),SIDING);assert.equal(lv.source.vehicleFrames![0].part.dx,SIDING,'the physical floor is stopped at the same siding');
 const exit=levelHints(lv,p,model).some(h=>h.id==='vehicle:line0'&&h.label==='[E] STEP OFF');
 assert.equal(exit,rewired,'the shared vehicle offers alighting only after the safety cable has been rewired');
 if(rewired){
  assert.equal(r.state().flags['harbor:open'],true,'the original source command unlocks the harbor');
  const ride=saveVehicle(lv,p,'train')!,snapshot=model.snapshot();
  const again=rig(true,false);again.model.restore(snapshot);
  assert(restoreVehicle(again.lv,again.p,again.model,ride),'the shared attachment reload reads the current train checkpoint');
  assert.equal(again.p.x,SEG+64,'the existing train checkpoint policy returns this ride to its departure station');again.session.dispose();
  assert(levelInteract(lv,'vehicle:line0',p,model));assert.equal(lv.state.floor,'siding');assert.equal(lv.state.vehicle,undefined);
 }else assert(!levelInteract(lv,'vehicle:line0',p,model),'a closed safety door cannot be bypassed by native interaction');
 r.session.dispose();
}
// A pending door-timing edit reaches physical alighting through the same source and mover.
for(const openMs of [600,1200]){
 const r=rig(true,true,openMs);
 for(let i=0;i<2200&&!r.metro.rideAtSiding(r.model.movers);i++)r.step();
 assert(r.metro.rideAtSiding(r.model.movers));for(let i=0;i<40;i++)r.step();
 assert.equal(levelHints(r.lv,r.p,r.model).some(h=>h.label==='[E] STEP OFF'),openMs===600,'source door duration controls when the shared threshold permits alighting');
 for(let i=0;i<60;i++)r.step();assert(levelHints(r.lv,r.p,r.model).some(h=>h.label==='[E] STEP OFF'));r.session.dispose();
}
console.log('P14 shared vehicle PASS: actual pass authorization, signal brake, carried floor, safety wiring, harbor unlock, native alighting and current checkpoint policy. Authored route migration remains separate.');
