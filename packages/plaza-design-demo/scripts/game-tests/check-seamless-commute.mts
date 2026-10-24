import * as SceneLifecycle from '../../src/ssg/game/runtime/scene-lifecycle';
import {runtimeFixture} from './runtime-fixture.mts';
import assert from 'node:assert/strict';
import {SCENES} from '../../src/ssg/game/scenes';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {levelArrive,levelStep,levelHints,levelInteract,levelFloor,levelZone,mergeLevels,levelRejoin,levelUp,levelBounds,type Level} from '../../src/ssg/game/engine/level';
import {stepLevelVehicles,validateWorldVehicles,saveVehicle,restoreVehicle} from '../../src/ssg/game/engine/level-vehicles';
import {placeFrom,validateZoneGraph,worldProblems} from '../../src/ssg/game/world/zone-graph';
import graphSource from '../../src/ssg/game/world/zone-graph.json';
import {Game} from '../../src/ssg/game/runtime/game';
import {art,resolveComposition} from '../../src/ssg/game/art';
import {frameView} from '../../src/ssg/game/art/core/view';
import {levelView,splitLevelView} from '../../src/ssg/game/engine/level';
import catalogue from '../../src/ssg/game/scenes/authored.json';
import {authoredSceneAdapter} from '../../src/ssg/game/authoring/scene-adapters';
import {readQuery} from '../../src/ssg/game/engine/gameplay/queries';
import {resolveValues} from '../../src/ssg/game/engine/gameplay/state';
import fixtures from '../../src/ssg/game/authoring/play-fixtures.json';
import {fixtureSave} from '../../src/ssg/game/authoring/play-fixtures';
const graph=validateZoneGraph(graphSource),owner='harbor-station',scene=SCENES[owner];
validateWorldVehicles(SCENES,graph);assert.deepEqual(worldProblems(graph,SCENES),[]);
const commute=fixtureSave(fixtures.fixtures.find(f=>f.id==='harbor-commute') as never);assert.equal(commute.gameplay!.shift.statementRead,true,'the review fixture writes the shared owner directly');assert.equal(commute.gameplay![owner],undefined,'no second copy of shared state is placed under the scene');assert.equal(readQuery('commute.ready',{flags:commute.flags,items:commute.items,tokens:commute.tokens,values:commute.gameplay},{definition:scene.gameplay!}),true);
const adapter=authoredSceneAdapter(owner,new Map([['authored-scenes',catalogue]]))!;
assert(adapter.definition(catalogue.scenes.find(e=>e.scene.id===owner)!.composition as never,{},{}).gameplay!.state!['shift.parcelCollected'],'static authoring preview resolves shared state just like native Play');
const model=new SceneModel({say(){},open(){},changed(){}},scene.data!,undefined,undefined,undefined,undefined,undefined,scene.gameplay);
let statementRead=false;let flags:Record<string,boolean>={'prologue:started':true};model.gameplayQuery=id=>{const state={flags,items:{},tokens:0,values:{shift:{statementRead}}};return readQuery(id,{...state,values:resolveValues(scene.gameplay!,state)},{definition:scene.gameplay!});};
model.peopleSources=scene.peopleFlows!;model.peopleLevel={...scene.level!,vehicleZones:Object.fromEntries([...placeFrom(graph,owner,Infinity)].map(([id,p])=>[id,{x:p.dx,h:p.dh}]))};
let active=owner;
function joined(){const placed=placeFrom(graph,active,Infinity);const source=mergeLevels([owner,active,'metro','downtown'].filter((id,i,a)=>a.indexOf(id)===i).map(id=>({zone:id,source:SCENES[id].level!,dx:placed.get(id)!.dx,dh:placed.get(id)!.dh,width:SCENES[id].width})));source.vehicleZones=Object.fromEntries([...placed].map(([id,p])=>[id,{x:p.dx,h:p.dh}]));return source;}
// Keep the complete route resident in this frame-sized handoff fixture.
const source=joined(),p={x:84,y:0,vy:0,face:1,onGround:true,moving:false};let lv:Level={source,state:levelArrive(source,p,0)};
levelStep(lv,p,0,1,model);assert(!levelInteract(lv,'vehicle:'+owner+'/service',p,model),'the shift cannot be skipped by boarding early');statementRead=true;levelStep(lv,p,0,1,model);assert(levelInteract(lv,'vehicle:'+owner+'/service',p,model));
const relative=p.x-lv.state.vehicle!.x,visited=new Set([active]);let arrived=false;
// Use the actual Game seam handoff, including owner UI, instead of a parallel rebasing algorithm.
let ownerCloses=0,ordinaryCloses=0,ownerPopup=true;
const crossing:any=runtimeFixture(Game),ownerHost={model,persist(){},closeAll(){ownerCloses++;ownerPopup=false;}},ordinaryHost={model:{player:null},persist(){},closeAll(){ordinaryCloses++;}};
Object.assign(crossing,{content:SCENES,sources:{zoneGraph:graph},introduceScene(){},p,companionBody:{x:0,h:0},save:{flags:{},rooms:{},barriers:{}},movers:model,sceneDefinition:(id:string)=>SCENES[id],hostOf:(id:string)=>id===owner?ownerHost:ordinaryHost,markSeen(){},syncHud(){},persistSave(){},term:{print(){}},hints:{sceneChanged(){}},canvas:{setAttribute(){}},scenes:Object.assign(crossing.scenes,{here:active,level:lv}),camera:Object.assign(crossing.camera,{viewW:1000000,cam:-500000,camH:0,gyBase:300,gy:300})});
crossing.scenes.joinedZones=[...placeFrom(graph,active,Infinity)].filter(([z])=>z!==active).map(([id,p])=>({id,dx:p.dx,dh:p.dh}));
for(let i=0;i<2400;i++){
 model.tick(1000/60,true);levelStep(lv,p,0,1,model);
 assert(Math.abs(p.x-lv.state.vehicle!.x-relative)<1e-7,'the player retains their place in the moving car');
 const next=levelZone(lv)!;
 if(next!==active){crossing.scenes.level=lv;SceneLifecycle.crossInto(crossing.sceneLifecyclePort,next);active=crossing.scenes.here;lv=crossing.scenes.level;visited.add(active);assert(ownerPopup,'the source owner popup survives every native train seam handoff');}
 const [lo,hi]=levelBounds(lv,SCENES[active].width,p.x);p.x=Math.max(lo,Math.min(hi,p.x));assert(Math.abs(p.x-lv.state.vehicle!.x-relative)<1e-7,'normal Game walking bounds use the car walls, not the active zone edges');
 if(i===700){const snapshot=JSON.parse(JSON.stringify(model.snapshot())),ride=JSON.parse(JSON.stringify(saveVehicle(lv,p,active)));const restored=new SceneModel({say(){},open(){},changed(){}},scene.data!,undefined,undefined,undefined,undefined,undefined,scene.gameplay);restored.peopleSources=scene.peopleFlows!;restored.peopleLevel=model.peopleLevel;restored.gameplayQuery=model.gameplayQuery;restored.restore(snapshot);const q={x:800,y:0,vy:0,face:1,onGround:true,moving:false},source=joined(),checkpoint:Level={source,state:levelArrive(source,q,0)};assert(restoreVehicle(checkpoint,q,restored,ride));assert(Math.abs(q.x-p.x)<1e-7&&Math.abs(q.y-p.y)<1e-7,'reload keeps the occupied train and exact place in the tunnel');assert.equal(checkpoint.state.vehicle!.id,lv.state.vehicle!.id);assert.equal(Object.keys(restored.people.riders).length,Object.keys(model.people.riders).length);}
 if(active==='metro'&&levelHints(lv,p,model).some(h=>h.label==='[E] STEP OFF')){arrived=true;break;}
}
assert(arrived);assert.equal(visited.size,6,'the player travels through all four tunnel zones');
assert.equal(ownerCloses,0,'riding out of the source zone retains the vehicle owner UI');assert(ordinaryCloses>0,'leaving non-owner zones still closes their local UI');
assert(levelInteract(lv,'vehicle:'+owner+'/service',p,model));assert.equal(levelFloor(lv).id,'metro/floor-station');assert.equal(p.y,0);
assert(Object.values(model.people.riders).some(r=>r.out),'the same passengers alight through actual open doors');
// Native stairs link the platform floor to Downtown's street at exactly 150 units above it.
p.x=250;p.y=0;assert(levelUp(lv,p));
for(let i=0;i<400&&lv.state.ride;i++)levelStep(lv,p,-1,1,model,1);
assert.equal(levelFloor(lv).id,'downtown/floor-street');assert.equal(p.y,150);assert.equal(p.x,60);
const beforeWalking=ordinaryCloses;crossing.scenes.level=lv;SceneLifecycle.crossInto(crossing.sceneLifecyclePort,'downtown');active=crossing.scenes.here;
assert.equal(ordinaryCloses,beforeWalking+1,'the actual on-foot departure still closes the previous scene UI');
assert.equal(crossing.scenes.level.state.vehicle,undefined,'an on-foot seam does not fabricate a vehicle attachment');
const bad=structuredClone(graph);bad.seams.find(s=>s.id==='line-metro')!.dh+=10;assert.throws(()=>validateWorldVehicles(SCENES,bad),/leg/,'a discontinuous pending route is rejected');
// Exercise the real Game residency methods: the distant Circuit owner is hosted and drawn at Metro.
const game:any=runtimeFixture(Game);Object.assign(game,{content:SCENES,sources:{zoneGraph:graph},save:{rooms:{},barriers:{}},scenes:Object.assign(game.scenes,{compiledScenes:new Map(Object.entries(SCENES)),here:'metro',hosts:new Map(),gameplaySessions:new Map()}),camera:Object.assign(game.camera,{cam:476,viewW:640})});
game.hostOf=(id:string)=>{let host=game.scenes.hosts.get(id);if(!host){const s=SCENES[id],m=new SceneModel({say(){},open(){},changed(){}},s.data!,undefined,undefined,undefined,undefined,undefined,s.gameplay);m.peopleSources=s.peopleFlows??[];m.peopleLevel=s.level;host={model:m,dispose(retain=false){if(!retain)m.setPaused(true);},show(_on:boolean,visible:boolean){this.visible=visible;}};game.scenes.hosts.set(id,host);}return host;};
const joinedGame=SceneLifecycle.joinLevel(game.sceneLifecyclePort,'metro');SceneLifecycle.showHosts(game.sceneLifecyclePort);
assert(!game.scenes.hosts.has(owner),'distant source scenery does not stay hosted for a travelling train');
assert(game.scenes.mobiles.has(owner),'the actual mobile Circuit survives without its source host');
const service=game.scenes.mobiles.get(owner).model as SceneModel;
const modelOf=(z:string|undefined)=>game.scenes.mobiles.get(z??'metro')?.model??game.hostOf(z??'metro').model;service.moveTo('service','frame','east');service.moveTo('service','doors','open');
service.gameplayQuery=()=>true;
const q={x:764,y:0,vy:0,face:1,onGround:true,moving:false},native:Level={source:joinedGame,state:levelArrive(joinedGame,q,0)};levelStep(native,q,0,1,modelOf);
assert(levelHints(native,q,modelOf).some(h=>h.label==='[E] STEP ABOARD'));
const view={...frameView(0),cam:476-joinedGame.vehicleZones[owner].x,level:splitLevelView(levelView(native,modelOf,q),owner)},env=scene.visualEnvironment!(view,{m:service,hover:null,layer:'all'});
const car=resolveComposition(art,catalogue.scenes.find(e=>e.scene.id===owner)!.composition as never,env).find(r=>r.instance.id==='car1')!;
assert.equal(car.placement.x+joinedGame.vehicleZones[owner].x,700,'the owner artwork reaches the destination platform at the physical position');
assert(levelInteract(native,'vehicle:'+owner+'/service',q,modelOf));
Object.assign(game,{p:q,movers:modelOf,scenes:Object.assign(game.scenes,{level:native})});
const expectedFloor=native.state.floor,expectedPosition={x:q.x,y:q.y};
game.scenes.level.source.zones={...game.scenes.level.source.zones};delete game.scenes.level.source.zones.downtown;
SceneLifecycle.followResidency(game.sceneLifecyclePort);
assert.equal(levelFloor(game.scenes.level).id,expectedFloor,'residency changes rebuild the occupied moving floor in the same frame');assert.deepEqual({x:q.x,y:q.y},expectedPosition,'residency changes cannot clamp or displace the rider');
// The same alighted passengers climb the authored stairs and continue onto Downtown;
// their sink is beyond the street, rather than at the platform/chunk boundary.
model.peopleLevel={...model.peopleLevel!,zones:Object.fromEntries([...placeFrom(graph,owner,Infinity)].map(([id,p])=>[id,{x:p.dx,h:p.dh,w:SCENES[id].width}]))};
let streetPassenger=false,stairPassenger=false;const passengerLooks=new Map<string,string>();
for(let i=0;i<4800&&!streetPassenger;i++){
 model.tick(1000/60,true);
 for(const person of model.people.pictures.passengers??[]){
  if(passengerLooks.has(person.key))assert.equal(person.look,passengerLooks.get(person.key));else passengerLooks.set(person.key,person.look);
  stairPassenger||=person.h>model.peopleLevel!.zones!.metro.h&&person.h<model.peopleLevel!.zones!.downtown.h;
  streetPassenger||=person.zone==='downtown'&&person.h===model.peopleLevel!.zones!.downtown.h;
 }
}
assert(stairPassenger&&streetPassenger,'native alighted people traverse the real staircase and cross onto the street');
console.log('Seamless commute PASS: actual movers, boarding, all tunnel zones, floating origin, exact carry, alighting, live people, stairs to Downtown and route rejection.');
