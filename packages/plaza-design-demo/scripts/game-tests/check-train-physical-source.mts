import * as InteractionRouting from '../../src/ssg/game/runtime/interaction-routing';
import {runtimeFixture} from './runtime-fixture.mts';
/** P14 uses the shipping train composition's shared vehicle and the shipping siding level. */
import assert from 'node:assert/strict';
import composition from '../../src/ssg/game/scenes/train/composition.json';
import {compileGameWorld} from '../../src/ssg/game/world/compiled-world';
import {SCENES} from '../../src/ssg/game/scenes';
import * as city from '../../src/ssg/game/world/city';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {Game} from '../../src/ssg/game/runtime/game';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {attachNativeGameplay} from '../../src/ssg/game/engine/gameplay/native-bindings';
import {fixtureGameplayPort} from './model-gameplay-fixture.mts';
import {createLineSystem,CAR,SIDING} from '../../src/ssg/game/world/transport/line';
import {startRide,boardRide} from '../../src/ssg/game/engine/gameplay/mechanisms/line-ride';
import {mergeLevels,levelArrive,levelStep,levelInteract,levelHints,levelZone,type Level} from '../../src/ssg/game/engine/level';
import {placeFrom} from '../../src/ssg/game/world/zone-graph';
import {arriveVehicleLevel,saveVehicle,restoreVehicle,validateWorldVehicles,levelVehicleFrames} from '../../src/ssg/game/engine/level-vehicles';
import {movingInteractions} from '../../src/ssg/game/engine/gameplay/moving-interactions';
import {art,resolveComposition} from '../../src/ssg/game/art';
import {frameView} from '../../src/ssg/game/art/core/view';
import {readQuery} from '../../src/ssg/game/engine/gameplay/queries';
import {fixtureSceneRules} from './model-gameplay-fixture.mts';
import {routeAt,routeParamAt} from '../../src/ssg/game/world/vehicles';
const graph=compileGameWorld(SCENES),scene=SCENES.train,places=placeFrom(graph as any,'train',Infinity),sidingOffset=places.get('metro-siding')!.dx,source=mergeLevels([...places].map(([zone,at])=>({zone,source:SCENES[zone].level!,dx:at.dx,dh:at.dh,width:SCENES[zone].width}))),vehicleZones=Object.fromEntries([...places].map(([id,p])=>[id,{x:p.dx,h:p.dh}]));
assert.equal(scene.level!.floors.length,0,'no stationary copy of the car floor');
assert.equal(scene.level!.vehicles!.length,1);validateWorldVehicles(SCENES,graph as any);
const vehicle=scene.level!.vehicles![0];
assert.equal(routeParamAt(vehicle.source.route,'here',{x:5173,h:0}),5173,'long straight track is projected exactly, not to a sample grid');
for(const paid of [false,true])for(const rewire of [false,true]){
 const metro=createLineSystem();metro.lineOpen.harbor=false;let root:any={flags:{},items:paid?{'maglev.pass':1}:{},tokens:0};
 const bound=scene.bindWorld!({city,metro}),rules=typeof bound.rules==='function'?bound.rules({save:()=>root,persist(){},nodes:()=>42,granted(){},end(){}} as any):bound.rules;
 const model=new SceneModel({say(){},changed(){},open(){},carry:id=>root.items[id]??0},bound.data!,rules);
 const session=new GameplaySession(scene.gameplay!,fixtureGameplayPort(scene.gameplay!,{read:()=>root,write:value=>{root=value;}},()=>model));attachNativeGameplay(model,session);model.peopleLevel={...scene.level!,vehicleZones};
 boardRide(model,'galleria',240);model.setPaused(false);
 const p={x:780,y:0,vy:0,face:1,onGround:true,moving:false},lv=arriveVehicleLevel(source,p,()=>model,'train','line0',0);
 assert(Math.abs(p.x-3780)<1e-6);assert.equal(lv.state.vehicle!.id,'train/cab-frame');
 model.connect('train.position:harbor siding','train.brake','pull');
 if(rewire){model.cut(model.links.find(l=>l.from==='train.brake:stopped'&&l.verb==='lock')!);model.connect('train.brake:stopped','train.doors','open');}
 let stopped=false;
 for(let i=0;i<2200;i++){
  model.tick(1000/60,true);levelStep(lv,p,0,1,()=>model);
  const pose=routeAt(vehicle.source.route,model.movers.position(CAR)!);
  assert(Math.abs(p.x-(pose.x+(vehicleZones[pose.zone]?.x??0)+780))<1e-6,'the actual car floor carries the passenger');
  if(metro.rideAtSiding(model.movers)){stopped=true;break;}
 }
 assert.equal(stopped,paid);
 if(!paid){assert.equal(root.flags['harbor:open'],undefined);session.dispose();continue;}
 for(let i=0;i<60;i++){model.tick(1000/60,true);levelStep(lv,p,0,1,()=>model);}
 assert.equal(model.movers.position(CAR),SIDING);assert.equal(levelZone(lv),'metro-siding');assert.equal(p.x,SIDING+780);
 const id='vehicle:train/cab-frame';assert.equal(levelHints(lv,p,()=>model).some(h=>h.id===id&&h.label==='[E] STEP OFF'),rewire);
 const view={...frameView(0),cam:SIDING,viewW:640,viewH:360};bound.preparePresentation!(view,{m:model,hover:null,layer:'all'} as any);
 const env=bound.visualEnvironment!(view,{m:model,hover:null,layer:'all'} as any),rows=resolveComposition(art,composition as any,env);
 assert.equal(rows.find(r=>r.instance.id==='door1')!.placement.x,p.x,'door artwork and physical doorway coincide');
 assert.equal(movingInteractions(scene,model).exits.find(e=>e.id==='out')!.x,p.x,'existing door prompt follows the same frame');
 for(const actor of ['suit','courier','elder','punk'])assert.equal((env.bindings!['train.pose.'+actor] as any).character.x,rows.find(r=>r.instance.id===actor)!.placement.x,'prepared regular follows its moving source placement');
 const checkpoint=saveVehicle(lv,p,'train')!;assert.equal(checkpoint.x,780);
 assert(restoreVehicle(lv,p,()=>model,checkpoint));assert.equal(p.x,SIDING+780);
 const game=runtimeFixture(Game) as any,spoken:unknown[]=[];
 (Object.defineProperties(game,{def:{value:SCENES['metro-siding']},p:{value:p},movers:{value:()=>model},save:{value:{flags:{}}},hints:{value:{done(){}}},interactionHost:{value:{acknowledgmentPending:false}},nearest:{value:()=>levelHints(lv,p,()=>model).some(h=>h.id===id)?{kind:'level',id}:undefined},passBarrier:{value:()=>false},persistSave:{value:()=>{}},say:{value:(speaker:string,pages:string[])=>spoken.push({speaker,pages})}}),Object.defineProperties(game.scenes,{here:{value:'metro-siding'},level:{value:lv}}),Object.defineProperties(game.presentation,{bubble:{value:null,writable:true}}));
 game.introduceScene();assert.deepEqual(spoken,[],'passing through aboard does not consume the siding response');
 assert.equal(game.save.flags['scene:metro-siding'],undefined);
 InteractionRouting.interact(game.interactionRoutingPort);assert.equal(!lv.state.vehicle,rewire,'actual native E cannot bypass closed safety doors');
 assert.equal(spoken.length,rewire?1:0,'only legitimate alighting speaks the response');
 if(rewire){assert.deepEqual(spoken,[{speaker:'YOU',pages:SCENES['metro-siding'].intro}]);game.introduceScene();assert.equal(spoken.length,1,'the original two pages fire once');}
 if(rewire){assert.equal(lv.state.floor,'metro-siding/floor-siding');assert.equal(lv.state.vehicle,undefined);assert.equal(p.x,SIDING+780,'stepping onto the ledge does not teleport');assert.equal(root.flags['harbor:open'],true);}
 session.dispose();
}
// Story presence uses the same pure query for physical floors and every attached drawing.
for(const flags of [{},{'prologue:started':true},{'prologue:started':true,'opening:home':true},{'prologue:started':true,'opening:home':true,'opening:street':true},{'prologue:started':true,'opening:home':true,'opening:street':true,'opening:flat':true}]){
 for(const id of ['train','harbor-station']){
  const scene=SCENES[id].bindWorld?.({city,metro:createLineSystem()})??SCENES[id];
  const m=new SceneModel({say(){},open(){},changed(){}},scene.data!,fixtureSceneRules(scene));
  m.gameplayQuery=id=>readQuery(id,{flags,items:{},tokens:0},{definition:scene.gameplay!});
  const present=id==='train'?(!flags['prologue:started']||!!flags['opening:flat']):(!!flags['prologue:started']&&!flags['opening:flat']);
  assert.equal(levelVehicleFrames(scene.level!,m).filter(f=>f.vehicle.kind!=='lift').length,present?1:0,'absent service has no floors or physical doors');
  const view=frameView(0),env=scene.visualEnvironment!(view,{m,hover:null,layer:'all'});
  const frame=id==='train'?'cab-frame':'service';assert.equal(env.visibility![frame],present,'artwork inherits the same physical presence');
 }
}
// Ordinary boarding and alighting use the same car; a closed Harbor is passed with no step-off.
for(const harborOpen of [false,true]){
 const metro=createLineSystem();metro.lineOpen.harbor=harborOpen;let root:any={flags:harborOpen?{'harbor:open':true}:{},items:{},tokens:0};
 const bound=scene.bindWorld!({city,metro}),rules=typeof bound.rules==='function'?bound.rules({save:()=>root,persist(){},nodes:()=>42,granted(){},end(){}} as any):bound.rules;
 const model=new SceneModel({say(){},changed(){},open(){}},bound.data!,rules),session=new GameplaySession(bound.gameplay!,fixtureGameplayPort(bound.gameplay!,{read:()=>root,write:value=>{root=value;}},()=>model));attachNativeGameplay(model,session);
 model.peopleLevel={...scene.level!,vehicleZones};boardRide(model,'galleria',330);model.setPaused(false);
 const p={x:places.get('galleriaStation')!.dx+930,y:0,vy:0,face:1,onGround:true,moving:false},lv:Level={source,state:levelArrive(source,p,0)};
 levelStep(lv,p,0,1,()=>model);assert.equal(lv.state.floor,'galleriaStation/platform-floor');
 assert(levelInteract(lv,'vehicle:train/cab-frame',p,()=>model),'Galleria boards through the actual shared doorway');
 let arrival=false;
 for(let i=0;i<3000;i++){
  model.tick(1000/60,true);levelStep(lv,p,0,1,()=>model);
  const at=metro.rideStop(model.movers),phase=metro.ridePhase(model.movers);
  if(!harborOpen)assert(!lv.source.vehicleFrames!.some(f=>f.berth?.id==='harbor'&&f.doors>.6),'a locked Harbor never offers a stationary open berth');
  if(at!== 'galleria'&&phase==='dwell'&&metro.rideOpen(model.movers)){
   assert.equal(at,harborOpen?'harbor':'downtown');arrival=true;break;
  }
 }
 assert(arrival);
 const destination=harborOpen?'harborStation':'metro';assert.equal(levelZone(lv),destination);const at=p.x;
 assert(levelInteract(lv,'vehicle:train/cab-frame',p,()=>model));assert.equal(lv.state.floor,destination+'/'+(harborOpen?'platform-floor':'floor-station'));assert.equal(p.x,at,'station alighting does not cut or reposition');
 assert(levelInteract(lv,'vehicle:train/cab-frame',p,()=>model));assert.equal(lv.state.floor,'train/cab-frame/car3.deck');assert.equal(p.x,at,'station reboarding retains the same physical doorway');
 session.dispose();
}
// Each actual source queue hands the same people to the car and its destination platform.
for(const station of ['downtown','galleria','harbor'] as const){
 const flow=station+'-passengers';
 const metro=createLineSystem();metro.lineOpen.harbor=station==='harbor';let root:any={flags:station==='harbor'?{'harbor:open':true}:{},items:{},tokens:0};
 const bound=scene.bindWorld!({city,metro}),model=new SceneModel({say(){},changed(){},open(){}},bound.data!,fixtureSceneRules(bound));
 const session=new GameplaySession(bound.gameplay!,fixtureGameplayPort(bound.gameplay!,{read:()=>root,write:value=>{root=value;}},()=>model));attachNativeGameplay(model,session);
 model.peopleSources=bound.peopleFlows!;model.peopleLevel={...bound.level!,vehicleZones};
 assert.equal(model.peopleSources.find(s=>s.id===flow)!.flow.route[0].zone,city.STATIONS[station].scene);
 boardRide(model,station,330);model.setPaused(false);
 for(let i=0;i<360;i++)model.tick(1000/60,true);
 const aboard=Object.values(model.people.riders).filter(r=>r.source===flow);assert(aboard.length>0,'the real ${station} queue boards while its actual doors stand open');
 const identities=aboard.map(r=>({key:r.person.key,look:r.person.look,phase:r.person.phase}));
 const saved=structuredClone(model.snapshot());model.restore(saved);
 assert.deepEqual(Object.values(model.people.riders).filter(r=>r.source===flow).map(r=>({key:r.person.key,look:r.person.look,phase:r.person.phase})),identities,'current-format reload retains the passenger identities');
 let alighted=false;
 for(let i=0;i<3000;i++){model.tick(1000/60,true);if(identities.every(p=>model.people.riders[p.key]?.out)){alighted=true;break;}}
 assert(alighted,'the original riders alight through the actual destination doors');
 for(const p of identities){const rider=model.people.riders[p.key];assert.equal(rider.person.look,p.look);assert.equal(rider.person.phase,p.phase);assert.equal(rider.out!.h,0);}
 assert(!SCENES.galleriaStation.people?.some(p=>p.id?.startsWith('waiting-')),'no second Galleria platform crowd remains');
 session.dispose();
}
console.log('Physical train source PASS: shipping vehicle-only floor, exact route, pass/safety wiring, moving art/regulars/exits, current attachment and continuous siding/Galleria/Harbor/Downtown boarding and alighting.');

// Native reload must preserve a conditional travel leg and both siding halt paths.
for(const start of ['running','siding','siding-open'] as const){
 const metro=createLineSystem(),bound=scene.bindWorld!({city,metro});
 const make=()=>{const m=new SceneModel({say(){},changed(){},open(){},carry:()=>1},bound.data!,fixtureSceneRules(bound));m.peopleLevel={...bound.level!,vehicleZones};m.gameplayQuery=id=>readQuery(id,{flags:{'harbor:open':true},items:{'maglev.pass':1},tokens:0},{definition:bound.gameplay!});return m;};
 const original=make();startRide(original,metro,{version:1,start,station:'galleria',lineOpen:{downtown:true,galleria:true,harbor:true}});
 const saved=original.snapshot(),position=original.movers.position(CAR),phase=metro.ridePhase(original.movers),halt=original.movers.halted(CAR);
 assert(saved.movers?.[CAR].path,'physical vehicle saves its current authored path');
 const restored=make();restored.restore(saved);
 assert.equal(restored.movers.position(CAR),position,start+' keeps physical position');
 assert.equal(metro.ridePhase(restored.movers),phase,start+' keeps phase');
 assert.equal(restored.movers.halted(CAR),halt,start+' keeps siding identity');
 assert.equal(restored.movers.position('train.doors'),original.movers.position('train.doors'),start+' keeps door position');
 original.tick(100,true);restored.tick(100,true);
 assert.equal(restored.movers.position(CAR),original.movers.position(CAR),start+' resumes the same authored leg');
 const invalid=structuredClone(saved);invalid.movers![CAR].path!.nested=[2,0];assert.doesNotThrow(()=>make().restore(invalid),'invalid branch address is rejected without executing saved steps');
}
