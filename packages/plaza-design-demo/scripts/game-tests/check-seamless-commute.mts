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
const source=joined(),p={x:84,y:0,vy:0,face:1,onGround:true,moving:false};let lv:Level={source,state:levelArrive(source,p,0)};
levelStep(lv,p,0,1,model);assert(!levelInteract(lv,'vehicle:'+owner+'/service',p,model),'the shift cannot be skipped by boarding early');statementRead=true;levelStep(lv,p,0,1,model);assert(levelInteract(lv,'vehicle:'+owner+'/service',p,model));
const relative=p.x-lv.state.vehicle!.x,visited=new Set([active]);let arrived=false;
// Use the actual Game seam handoff, including owner UI, instead of a parallel rebasing algorithm.
let ownerCloses=0,ordinaryCloses=0,ownerPopup=true;
const crossing:any=Object.create(Game.prototype),ownerHost={model,persist(){},closeAll(){ownerCloses++;ownerPopup=false;}},ordinaryHost={model:{player:null},persist(){},closeAll(){ordinaryCloses++;}};
Object.assign(crossing,{here:active,level:lv,p,cam:0,camH:0,gyBase:300,gy:300,companionBody:{x:0,h:0},save:{flags:{},rooms:{},barriers:{}},movers:model,
 sceneDefinition:(id:string)=>SCENES[id],hostOf:(id:string)=>id===owner?ownerHost:ordinaryHost,seenRooms:()=>undefined,
 showHost(){},markSeen(){},syncHud(){},persistSave(){},term:{print(){}},hints:{sceneChanged(){}},canvas:{setAttribute(){}},
 joinLevel(id:string){active=id;this.joinedZones=[...placeFrom(graph,id,Infinity)].filter(([z])=>z!==id).map(([id,p])=>({id,dx:p.dx,dh:p.dh}));return joined();},
});
crossing.joinedZones=[...placeFrom(graph,active,Infinity)].filter(([z])=>z!==active).map(([id,p])=>({id,dx:p.dx,dh:p.dh}));
for(let i=0;i<2400;i++){
 model.tick(1000/60,true);levelStep(lv,p,0,1,model);
 assert(Math.abs(p.x-lv.state.vehicle!.x-relative)<1e-7,'the player retains their place in the moving car');
 const next=levelZone(lv)!;
 if(next!==active){crossing.level=lv;crossing.crossInto(next);lv=crossing.level;visited.add(active);assert(ownerPopup,'the source owner popup survives every native train seam handoff');}
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
const beforeWalking=ordinaryCloses;crossing.level=lv;crossing.crossInto('downtown');
assert.equal(ordinaryCloses,beforeWalking+1,'the actual on-foot departure still closes the previous scene UI');
assert.equal(crossing.level.state.vehicle,undefined,'an on-foot seam does not fabricate a vehicle attachment');
const bad=structuredClone(graph);bad.seams.find(s=>s.id==='line-metro')!.dh+=10;assert.throws(()=>validateWorldVehicles(SCENES,bad),/leg/,'a discontinuous pending route is rejected');
// Exercise the real Game residency methods: the distant Circuit owner is hosted and drawn at Metro.
const game:any=Object.create(Game.prototype);Object.assign(game,{content:SCENES,compiledScenes:new Map(Object.entries(SCENES)),sources:{zoneGraph:graph},here:'metro',cam:476,viewW:640,hosts:new Map(),save:{rooms:{},barriers:{}},gameplaySessions:new Map()});
game.hostOf=(id:string)=>{let host=game.hosts.get(id);if(!host){const s=SCENES[id],m=new SceneModel({say(){},open(){},changed(){}},s.data!,undefined,undefined,undefined,undefined,undefined,s.gameplay);m.peopleSources=s.peopleFlows??[];m.peopleLevel=s.level;host={model:m,dispose(){m.setPaused(true);},show(_on:boolean,visible:boolean){this.visible=visible;}};game.hosts.set(id,host);}return host;};
const joinedGame=(Game.prototype as any).joinLevel.call(game,'metro');(Game.prototype as any).showHost.call(game);
assert(game.hosts.get(owner).visible,'the distant vehicle owner stays live and drawable');
const service=game.hosts.get(owner).model as SceneModel;service.moveTo('service','frame','east');service.moveTo('service','doors','open');
service.gameplayQuery=()=>true;
const q={x:764,y:0,vy:0,face:1,onGround:true,moving:false},native:Level={source:joinedGame,state:levelArrive(joinedGame,q,0)};levelStep(native,q,0,1,z=>game.hostOf(z??'metro').model);
assert(levelHints(native,q,z=>game.hostOf(z??'metro').model).some(h=>h.label==='[E] STEP ABOARD'));
const view={...frameView(0),cam:476-joinedGame.zones[owner].x,level:splitLevelView(levelView(native,z=>game.hostOf(z??'metro').model,q),owner)},env=scene.visualEnvironment!(view,{m:service,hover:null,layer:'all'});
const car=resolveComposition(art,catalogue.scenes.find(e=>e.scene.id===owner)!.composition as never,env).find(r=>r.instance.id==='car1')!;
assert.equal(car.placement.x+joinedGame.zones[owner].x,700,'the owner artwork reaches the destination platform at the physical position');
assert(levelInteract(native,'vehicle:'+owner+'/service',q,z=>game.hostOf(z??'metro').model));
Object.assign(game,{level:native,p:q,movers:(z:string|undefined)=>game.hostOf(z??'metro').model});
const expectedFloor=native.state.floor,expectedPosition={x:q.x,y:q.y};
game.level.source.zones={...game.level.source.zones};delete game.level.source.zones.downtown;
(Game.prototype as any).followResidency.call(game);
assert.equal(levelFloor(game.level).id,expectedFloor,'residency changes rebuild the occupied moving floor in the same frame');assert.deepEqual({x:q.x,y:q.y},expectedPosition,'residency changes cannot clamp or displace the rider');
console.log('Seamless commute PASS: actual movers, boarding, all tunnel zones, floating origin, exact carry, alighting, live people, stairs to Downtown and route rejection.');
