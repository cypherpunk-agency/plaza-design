import assert from 'node:assert/strict';
import {SCENES} from '../../src/ssg/game/scenes';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {restorePeople} from '../../src/ssg/game/engine/people';
const scene=SCENES['vehicle-lab'];
function create(){const m=new SceneModel({say(){},open(){},changed(){}},scene.data!,undefined,undefined,undefined,undefined,undefined,scene.gameplay);m.peopleSources=scene.peopleFlows!;m.peopleLevel=scene.level!;return m;}
const m=create(),looks=new Map<string,string>();let queued=false,aboard=false,alighted=false,left=false;
for(let i=0;i<3600;i++){
 m.tick(1000/60,true);
 const pictures=m.people.pictures.passengers??[];
 for(const p of pictures){if(looks.has(p.key))assert.equal(p.look,looks.get(p.key),'the same person keeps their appearance');else looks.set(p.key,p.look);queued||=p.act==='queue';}
 const riders=Object.values(m.people.riders);aboard||=riders.some(r=>!r.out);alighted||=riders.some(r=>!!r.out);left||=riders.some(r=>r.finished!==undefined);
 const seated=riders.filter(r=>!r.out&&r.seat).map(r=>r.seat);assert.equal(new Set(seated).size,seated.length,'passengers occupy distinct places');
}
assert(queued&&aboard&&alighted&&left,JSON.stringify({queued,aboard,alighted,left}));
const saved=m.snapshot();assert(saved.people);assert.equal(restorePeople(saved.people,0,saved.people.wall+1000).time,m.people.time,'short-lived memory keeps current passengers');
assert.deepEqual(restorePeople(saved.people,0,saved.people.wall+61000).riders,saved.people.riders,'chunk absence cannot replace the current passengers');
const restored=create();restored.restore(saved);assert.equal(Object.keys(restored.people.riders).length,Object.keys(m.people.riders).length);
for(const key of ['shuttle.frame','shuttle.doors'])assert.equal(restored.movers.position(key),m.movers.position(key),'vehicle service checkpoints keep the exact current mover position');
for(let i=0;i<60;i++){m.tick(1000/60,true);restored.tick(1000/60,true);}assert(Math.abs(m.movers.position('shuttle.frame')!-restored.movers.position('shuttle.frame')!)<1e-7,'a restored service follows the same remaining source path');
const blocked=create();blocked.moveTo('shuttle','doors','closed');for(let i=0;i<600;i++)blocked.tick(1000/60,true);assert.equal(Object.keys(blocked.people.riders).length,0,'closed actual doors cannot board scheduled people');
const before=JSON.stringify(m.people);scene.visualEnvironment?.({t:0} as never,{m,hover:null,layer:'all'});assert.equal(JSON.stringify(m.people),before,'inspection cannot advance or commit people');
const reserved=create();reserved.playerSeat={vehicle:'shuttle',seat:'car1.s0'};for(let i=0;i<600;i++)reserved.tick(1000/60,true);assert(Object.keys(reserved.people.riders).length);assert(!Object.values(reserved.people.riders).some(r=>r.seat==='car1.s0'),'NPCs leave the player seat reserved');
const invalid=structuredClone(saved.people);invalid.riders.bad={source:'passengers',person:{state:'aboard',door:NaN}} as never;assert.equal(Object.keys(restorePeople(invalid,0,saved.people.wall).riders).length,0,'malformed current-format memory is discarded');
console.log('Live people PASS: actual doors, queue, identity, unique seats, riding, alighting, leaving, short memory/save restore and pure inspection.');
