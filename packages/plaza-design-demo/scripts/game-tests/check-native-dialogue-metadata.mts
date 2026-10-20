import {Panels} from '../../src/ssg/game/engine/panels';import {DialogueElement} from './dialogue-authoring-fixture.mts';
/** Current metadata consistency and explicit dispatch; not a pixel/text preservation baseline. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import * as current from '../../src/ssg/game/data';
import {SCENES} from '../../src/ssg/game/scenes';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {sceneRuleContract} from '../../src/ssg/game/engine/scene-rule-contract';
import {nativeDeviceDialogues} from '../../src/ssg/game/engine/gameplay/native-dialogue';
import {reviewGraphSource} from './check-conversation-structure.mts';
const names=['CAPSULE','YARD','STACKS','SANDBOX','BEACH','MOTH','LIBRARY','LAUNDROMAT']as const;
for(const name of names)assert.deepEqual(SCENES[current[name].id].data!.dialogue,current[name].dialogue,name+' current bootstrap/shipping metadata');
// Every currently declared talk action must carry and dispatch its explicit graph ID.
const targets:Array<{scene:string;graph:string}>=[];
for(const scene of ['capsule','yard','stacks','sandbox','library','laundromat']){
 const s=SCENES[scene],opened:Array<[string,string|undefined]>=[];
 const m=new SceneModel({say(){},changed(){},open:(panel,id)=>opened.push([panel,id])},s.data!,sceneRuleContract(s));m.setPaused(true);
 const walk=(value:any)=>{
  if(!value||typeof value!=='object')return;
  if(value.open==='talk'){
   assert.equal(typeof value.with,'string','Native talk must name its graph');
   const graph=value.with;assert.ok(s.gameplay!.conversations[graph]);
   m.apply([value]);assert.deepEqual(opened.at(-1),['talk',graph]);
   const missing=structuredClone(s.gameplay!);delete missing.conversations[graph];
   assert.throws(()=>nativeDeviceDialogues(missing,s.data!),/Missing native conversation/);
   targets.push({scene,graph});
  }
  for(const child of Object.values(value))walk(child);
 };
 for(const device of [...s.data!.devices,...s.data!.nodes??[]])for(const noun of device.nouns)walk(noun);
 m.reset();m.setPaused(true);
}
assert.ok(targets.length>0);
const source=structuredClone(reviewGraphSource),data=structuredClone(current.MOTH);data.devices.push({id:'review',name:'Review',look:'Review',nouns:[{id:'first',kind:'DAEMON',verbs:['talk'],on:{talk:{do:[{open:'talk',with:'review'}]}}}]});
const projection=nativeDeviceDialogues(source,data);assert.deepEqual(Object.keys(projection),['review']);assert.equal(projection.review.nodes.weather.do,undefined,'metadata cannot execute common rewards');assert(!Array.isArray(projection.review.nodes.base),'common comparison is not a fake native fallback');
const implicit=structuredClone(data);delete (implicit.devices.at(-1)!.nouns[0].on!.talk as any).do[0].with;assert.throws(()=>nativeDeviceDialogues(source,implicit),/Missing native conversation undefined/);
const missing=structuredClone(data);missing.devices.at(-1)!.nouns[0].on!.talk={do:[{open:'talk',with:'absent'}]};assert.throws(()=>nativeDeviceDialogues(source,missing),/Missing native conversation absent/);
assert.throws(()=>nativeDeviceDialogues({...source,conversations:{}},data),/Missing native conversation/);
const previousDocument=globalThis.document;(globalThis as any).document={createElement:()=>new DialogueElement()};try{const scene=SCENES.library,m=new SceneModel({say(){},changed(){},open(){}},scene.data!,sceneRuleContract(scene));m.setPaused(true);let requests=0;const panels=new Panels(new DialogueElement() as any,m,()=>{}, {},()=>{requests++;throw Error('Missing graph must not choose another conversation');});panels.open('talk');assert.equal(requests,0);assert.equal(panels.isOpen,false);panels.close();m.reset();m.setPaused(true);}finally{globalThis.document=previousDocument;}
console.log('Native dialogue metadata PASS: eight current bootstrap/shipping projections; current explicit graph targets verified through actual native dispatch; referenced deletion/implicit/missing graph refusal; descriptive projection only.');
