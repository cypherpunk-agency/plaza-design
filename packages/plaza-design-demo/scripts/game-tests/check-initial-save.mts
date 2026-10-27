import assert from 'node:assert/strict';
import {createInitialSave} from '../../src/ssg/game/runtime/initial-save';
import {newSave,loadSave,storeSave} from '../../src/ssg/game/runtime/save';
import {startCheckpoint} from '../../src/ssg/game/runtime/play-profile';
import {defaultPlayFixture,fixtureSave,fixtureFlags} from '../../src/ssg/game/world/checkpoints';
const inputs={handle:'TEST',tokens:2,flags:{ready:true},items:{tea:1},modules:['timer.so'],programs:[],keyring:['test'],clock:{day:1,min:580,seed:7}};
const first=createInitialSave(inputs),second=createInitialSave(inputs);first.flags.ready=false;first.modules.push('switch.so');first.items.tea=3;first.clock.seed=9;
assert.equal(inputs.flags.ready,true);assert.equal(second.flags.ready,true);assert.deepEqual(second.modules,['timer.so']);assert.equal(second.items.tea,1);assert.equal(second.clock.seed,7);assert.deepEqual(second.controlled,[]);assert.deepEqual(second.scenes,{});assert.equal(second.jump,false);
const random=Math.random;let draws=0;Math.random=()=>{draws++;return .25;};
try{
 const fresh=newSave(),seed=startCheckpoint();assert.equal(draws,1,'Fresh runs retain their random weather seed policy');assert.equal(fresh.handle,seed.handle??'');assert.equal(fresh.tokens,seed.tokens);assert.deepEqual(fresh.flags,seed.flags);assert.deepEqual(fresh.modules,seed.modules);assert.equal(fresh.scene,undefined,'A fresh checkpoint is not a visited/resume position');
 const checkpoint=defaultPlayFixture('shop');checkpoint.tokens=4;checkpoint.seed=17;checkpoint.flags={[fixtureFlags[0]]:true};checkpoint.items={tea:2};draws=0;const saved=fixtureSave(checkpoint);assert.equal(draws,0,'Checkpoint construction does not generate and discard a random fresh-run clock');assert.equal(saved.clock.seed,17);assert.equal(saved.tokens,4);assert.equal(saved.handle,'');assert.deepEqual(saved.modules,checkpoint.modules);assert.equal(saved.scene,checkpoint.scene);saved.items.tea=5;assert.equal(checkpoint.items.tea,2);assert.deepEqual(saved.flags,checkpoint.flags);
}finally{Math.random=random;}
const storage=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),memory=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>memory.get(key)??null,setItem:(key:string,value:string)=>{memory.set(key,value);},removeItem:(key:string)=>memory.delete(key)}});
try{const current=newSave();current.tokens=19;current.modules=[];current.flags={retained:false};storeSave(current);const loaded=loadSave();assert.equal(loaded.tokens,19);assert.deepEqual(loaded.modules,[],'Resuming does not grant the starting checkpoint inventory again');assert.deepEqual(loaded.flags,{retained:false});assert.deepEqual(loaded.clock,current.clock);}finally{if(storage)Object.defineProperty(globalThis,'localStorage',storage);else delete (globalThis as any).localStorage;}
console.log('Initial save PASS: shared pure construction, detached state, fresh-run random clock policy and explicit deterministic checkpoint inputs without construct-then-overwrite.');process.exit(0);
