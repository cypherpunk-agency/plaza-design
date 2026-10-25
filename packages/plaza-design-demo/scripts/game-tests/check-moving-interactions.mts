import {resolveUse,useAccess} from '../../src/ssg/game/runtime/interaction-targets';
import * as StoryTransitions from '../../src/ssg/game/runtime/story-transitions';
import * as InteractionRouting from '../../src/ssg/game/runtime/interaction-routing';
import {runtimeFixture} from './runtime-fixture.mts';
/** Ordinary authored uses/readables/rests keep their native behavior while following a car. */
import assert from 'node:assert/strict';
import authored from '../../src/ssg/game/scenes/authored.json';
import {createSceneRegistry,type SceneCatalogue} from '../../src/ssg/game/engine/gameplay/scene-catalogue';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {movingInteractions} from '../../src/ssg/game/engine/gameplay/moving-interactions';
import {Game} from '../../src/ssg/game/runtime/game';
import {levelArrive,levelStep,levelInteract,type Level} from '../../src/ssg/game/engine/level';
const entry=structuredClone(authored.scenes.find(s=>s.scene.id==='vehicle-lab')!) as unknown as SceneCatalogue['scenes'][number];
entry.scene.uses=[{id:'speaker',label:'[E] ANNOUNCE',name:'SPEAKER',speakerKind:'device',routes:[{pages:['Doors and boarding are controlled by the actual car.']}]}];
entry.scene.readables=[{id:'speaker',name:'ROUTE',pages:['The same local ID in another manifest group is independent.']}];
entry.scene.rests=[{id:'bench',kind:'bench'}];
entry.scene.manifest!.uses={speaker:{instance:'cab-panel',promptH:24}};
entry.scene.manifest!.readables={speaker:{instance:'cab-panel',x:20,promptH:24}};
entry.scene.manifest!.rests={bench:{instance:'cab-panel',x:40,h:-46,promptH:60}};
const frame=entry.composition.instances.find(n=>n.id==='shuttle')!,vehicle=frame.props.vehicle as any;
vehicle.route.legs[0].to.h=-100;const berth=vehicle.berths.find((b:any)=>b.id==='east');berth.h=-100;berth.floor='lower-platform';
entry.composition.instances.push({id:'lower-platform',type:'level.floor',props:{width:2500,label:'Lower platform'},placement:{x:0,h:-100},layer:'logic',order:100});
const scene=createSceneRegistry({},{version:1,scenes:[entry]})['vehicle-lab'],rules=typeof scene.rules==='function'?scene.rules({} as never):scene.rules;
const make=()=>{const m=new SceneModel({say(){},open(){},changed(){}},scene.data!,rules,undefined,undefined,undefined,undefined,scene.gameplay);m.peopleLevel=scene.level;return m;};
const model=make(),source=JSON.stringify(entry),before=movingInteractions(scene,model),p={x:224,y:0,vy:0,face:1,onGround:true,moving:false},lv:Level={source:scene.level!,state:levelArrive(scene.level!,p,0)};
levelStep(lv,p,0,1,model);assert(levelInteract(lv,'vehicle:shuttle',p,model));
for(let i=0;i<1100;i++){model.tick(1000/60,true);levelStep(lv,p,0,1,model);}
const moved=movingInteractions(scene,model),dx=moved.uses![0].x-before.uses![0].x,dh=moved.uses![0].h!-before.uses![0].h!;
assert(dx>50&&dh< -10,'fixture actually moves horizontally and descends');
for(const group of ['uses','readables','rests'] as const){assert.equal(moved[group]![0].x-before[group]![0].x,dx);assert.equal(moved[group]![0].h!-before[group]![0].h!,dh);assert.equal(moved[group]![0].promptH!-before[group]![0].promptH!,dh);}
assert.notEqual(moved.uses![0].x,moved.readables![0].x,'same IDs in different groups retain their own anchors');
assert.equal(moved.uses![0].use,scene.uses![0].use,'geometry cannot replace ordinary gameplay dispatch');
assert.equal(moved.uses![0].eligibility,scene.uses![0].eligibility);
const checkpoint=JSON.stringify(model.snapshot());for(let i=0;i<4;i++)movingInteractions(scene,model);assert.equal(JSON.stringify(model.snapshot()),checkpoint,'inspection never ticks a mover');assert.equal(JSON.stringify(entry),source,'source never changes during queries');
const restored=make();restored.restore(model.snapshot());assert.deepEqual(movingInteractions(scene,restored),moved,'ordinary current mover reload restores all interaction geometry');
const probe:any=runtimeFixture(Game,{def:scene,zh:{model},save:{flags:{}},gameplayFor:()=>undefined,useLabel:(u:any)=>u.label,promptFloor:Game.prototype['promptFloor' as never],scenes:{here:scene.id,level:lv}});
const targets=(Game.prototype as any).lifeTargets.call(probe,scene);
for(const id of ['use:speaker','read:speaker']){const t=targets.find((r:any)=>r.id===id);assert(t);assert(Math.abs(t.h-p.y)<1e-7,'native target stands on the actual descending car floor');}
let said:unknown[]=[];
InteractionRouting.useLife(runtimeFixture(Game,{...probe,story:'',say:(...args:unknown[])=>said=args}).interactionRoutingPort,'read:speaker');
assert.deepEqual(said,[moved.readables![0].name,moved.readables![0].pages,moved.readables![0].x,moved.readables![0].h],'native reading answers at the live attachment');
let called=false;const use={...scene.uses![0],use:()=>{called=true;return{pages:[]};}};
InteractionRouting.useLife(runtimeFixture(Game,{...probe,def:{...scene,uses:[use]},story:'',save:{flags:{},items:{},tokens:0},persistSave(){},syncHud(){},say(){},weatherHere:()=>({kind:'clear'})}).interactionRoutingPort,'use:speaker');
assert(called,'native E invokes the existing use callback');
let rest:any;InteractionRouting.useLife({...runtimeFixture(Game,{...probe}).interactionRoutingPort,offerWait:(r:unknown)=>rest=r},'rest:bench');assert.equal(rest.x,moved.rests![0].x);assert.equal(rest.h,moved.rests![0].h,'native resting receives the live car attachment');
const itemUse={...scene.uses![0],items:[{item:'parcel',label:'GIVE',use:scene.uses![0].use}]};
let popup:any;
InteractionRouting.useLife(runtimeFixture(Game,{...probe,def:{...scene,uses:[itemUse]},save:{flags:{},items:{parcel:1}},zh:{model,choose:(_id:string,_name:string,_items:unknown,box:unknown)=>popup=box},usePrice:()=>0}).interactionRoutingPort,'use:speaker');
assert.equal(popup.x,moved.uses![0].x);assert.equal(popup.y,p.y,'an item-use popup anchors to its actual moving deck');
assert.equal(popup.y+popup.h,moved.uses![0].promptH!-24,'moving popup extents do not double-count absolute height');
let restBox:any,followRest:any;
StoryTransitions.offerWait(runtimeFixture(Game,{...probe,zh:{model,choose:(_id:string,_name:string,_items:unknown,box:unknown,follow:unknown)=>{restBox=box;followRest=follow;}}}).storyTransitionsPort,moved.rests![0]);
assert.equal(restBox.x,moved.rests![0].x);
for(let i=0;i<100;i++)model.tick(1000/60,true);
const nextRest=movingInteractions(scene,model).rests![0];
assert.notEqual(followRest().x,restBox.x,'native rest menu follows later Circuit motion');
assert.equal(followRest().x,nextRest.x);assert.equal(followRest().y,nextRest.floorH);
console.log('Moving interactions PASS: grouped anchors, native E prompts/reading/use, descending floors, pure source/state and current mover reload.');

const unavailable={...scene.uses![0],available:()=>false,eligibility:()=>{throw Error('Unavailable target cannot query authorization');},price:()=>{throw Error('Hidden target cannot query a menu price');}};
assert.equal(resolveUse(unavailable,{},0).visible,false);assert.equal(useAccess(unavailable,{}).available,false);

// A retained target cannot bypass current exit visibility when the player invokes it later.
let departures=0;const flags:Record<string,boolean>={},exit={id:'review-exit',x:100,to:'vehicle-lab',label:'LEAVE',requires:'reviewPermit'};
const exitPort=runtimeFixture(Game,{...probe,def:{...scene,exits:[exit]},save:{flags,keyring:[],tokens:0},story:'',hasScene:()=>true,travel:()=>departures++}).interactionRoutingPort;
InteractionRouting.useExit(exitPort,exit);assert.equal(departures,0);flags.reviewPermit=true;InteractionRouting.useExit(exitPort,exit);assert.equal(departures,1);
