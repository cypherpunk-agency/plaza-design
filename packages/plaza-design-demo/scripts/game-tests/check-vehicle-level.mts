/** Current authored vehicle running through the actual level and Circuit mover code. */
import assert from 'node:assert/strict';
import {SCENES} from '../../src/ssg/game/scenes';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {levelArrive,levelStep,levelHints,levelInteract,levelUp,levelFloor,levelBounds,levelView,levelVisualState,levelOpacity,mergeLevels,splitLevelView,type Level,type LevelPlayer} from '../../src/ssg/game/engine/level';
import {vehicleSeatHeight} from '../../src/ssg/game/engine/level-vehicles';
import {preparePlayerPerson} from '../../src/ssg/game/runtime/avatars';
import {SHIPPED_PROFILES} from '../../src/ssg/game/runtime/play-profile';
const worker=SHIPPED_PROFILES.profiles.find(p=>p.id==='harborShift')!.player;
const sitter=preparePlayerPerson(worker,null,397,1,false,10,0,14);assert.equal(sitter.character.act,'sit');assert.equal(sitter.character.seat,14);
assert.equal(preparePlayerPerson(worker,null,397,1,false,10).character.act,'stand','standing restores the shared normal pose');
const scene=SCENES['vehicle-lab'],model=new SceneModel({say(){},open(){},changed(){}},scene.data!,typeof scene.rules==='function'?scene.rules({} as never):scene.rules,undefined,undefined,undefined,undefined,scene.gameplay);
const p:LevelPlayer={x:224,y:0,vy:0,face:1,moving:false,onGround:true};
const lv:Level={source:scene.level!,state:levelArrive(scene.level!,p,0)};
const tick=(n=1)=>{for(let i=0;i<n;i++){model.tick(1000/60,true);levelStep(lv,p,0,1,model);}};
tick();assert.equal(levelFloor(lv).id,'platform');assert(levelHints(lv,p,model).some(h=>h.id==='vehicle:shuttle'));
assert(!levelHints(lv,{...p,x:397},model).some(h=>h.id.startsWith('seat:')),'seats cannot be used from outside the car');
assert(levelInteract(lv,'vehicle:shuttle',p,model));assert.equal(lv.state.vehicle?.id,'shuttle');assert.equal(levelFloor(lv).id,'shuttle/car1.deck');
const origin=p.x;tick(100);assert.equal(p.x,origin,'stationary dwell does not drift');
const boundary=levelBounds(lv,scene.width,p.x);assert.deepEqual(boundary,[166,1240]);
p.x=760;tick();assert.equal(levelFloor(lv).id,'shuttle/car1.deck','the gangway is one walkable floor');
p.x=397;tick();const seat=levelHints(lv,p,model).find(h=>h.label==='[E] SIT')!;assert(seat,'a drawn bench offers sitting');
assert(levelInteract(lv,seat.id,p,model));assert.equal(vehicleSeatHeight(lv),14);assert(lv.state.vehicle?.seat);
assert(levelStep(lv,p,0,1,model),'sitting holds the ordinary player walk');assert.equal(p.moving,false);
assert(levelUp(lv,p),'up stands instead of boarding a nearby static flight');assert(!lv.state.vehicle?.seat);
assert(levelInteract(lv,seat.id,p,model));levelStep(lv,p,1,1,model);assert(!lv.state.vehicle?.seat,'walking stands before normal movement');
assert(levelInteract(lv,seat.id,p,model));
const relative=p.x-model.movers.position('shuttle.frame')!;
let moved=false,arrived=false;
for(let i=0;i<1800;i++){
 tick();assert(Math.abs(p.x-model.movers.position('shuttle.frame')!-relative)<1e-7,'carrying preserves position while the mover runs');
 if(model.movers.travelling('shuttle.frame')){moved=true;assert(!levelHints(lv,p,model).some(h=>h.id==='vehicle:shuttle'));}
 if(moved&&model.movers.position('shuttle.frame')===800&&model.movers.position('shuttle.doors')===1){arrived=true;break;}
}
assert(moved&&arrived,'the real automatic service reaches its second berth and opens');
assert(lv.state.vehicle?.seat,'the player stayed seated throughout the ride');
assert(levelInteract(lv,seat.id,p,model));assert(!lv.state.vehicle?.seat,'E stands up without alighting');
p.x=1024;tick();assert(levelHints(lv,p,model).some(h=>h.label==='[E] STEP OFF'));
assert(levelInteract(lv,'vehicle:shuttle',p,model));assert.equal(levelFloor(lv).id,'platform');assert(!lv.state.vehicle);
const at=levelVisualState(levelView(lv,model,p)).shuttle;assert.equal(at.x,960);assert.equal(at.open,1);
// An arbitrary position away from a door cannot board, even with doors open.
p.x=1100;assert(!levelInteract(lv,'vehicle:shuttle',p,model));
const before=JSON.stringify({p,state:lv.state});for(let i=0;i<5;i++){levelView(lv,model,p);levelHints(lv,p,model);}assert.equal(JSON.stringify({p,state:lv.state}),before,'render/eligibility reads are pure');
// The same frame lives in a joined level without changing ids, pose or owning-model lookup.
const joined=mergeLevels([{zone:'vehicle-lab',source:scene.level!,dx:500,dh:80,width:scene.width}]);
const q={...p,x:1524,y:80};const jl:Level={source:joined,state:levelArrive(joined,q,80)};
levelStep(jl,q,0,1,zone=>{assert.equal(zone,'vehicle-lab');return model;});
assert(levelInteract(jl,'vehicle:vehicle-lab/shuttle',q,model));
assert.equal(splitLevelView(levelView(jl,model,q),'vehicle-lab').vehicles!.shuttle.x,960);
assert.equal(levelOpacity(scene.level!,{...levelView(lv,model),reveal:{shuttle:1}})['car1-door0'],.12);
console.log('Vehicle level PASS: real automatic movers, boarding, seats and standing, gangway walking, bounded floors, exact seated carry, travelling refusal, alighting, joined ownership, shell state and pure inspection.');
