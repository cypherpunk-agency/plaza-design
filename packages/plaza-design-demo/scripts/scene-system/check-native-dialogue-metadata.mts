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
// Immutable immediate pre-change source: verify that making references explicit does not change targets.
const before='b629f31',targets:Array<{scene:string;graph:string}>=[];
for(const scene of ['capsule','yard','stacks','sandbox','library','laundromat']){
 const prior=JSON.parse(execFileSync('git',['show',before+':packages/plaza-design-demo/src/ssg/game/scenes/'+scene+'/devices.json'],{encoding:'utf8'})),s=SCENES[scene],opened:Array<[string,string|undefined]>=[],m=new SceneModel({say(){},changed(){},open:(panel,id)=>opened.push([panel,id])},s.data!,sceneRuleContract(s));m.setPaused(true);
 for(const device of [...prior.devices,...prior.nodes??[]])for(const noun of device.nouns){
  const live=[...s.data!.devices,...s.data!.nodes??[]].find(d=>d.id===device.id)!.nouns.find(n=>n.id===noun.id)!;
  const walk=(old:any,next:any)=>{if(!old||typeof old!=='object')return;if(old.open==='talk'){const graph=old.with??(noun.id in s.gameplay!.conversations?noun.id:Object.keys(s.gameplay!.conversations)[0]);assert.equal(next.with,graph,scene+' preserved pre-change graph target');m.apply([next]);assert.deepEqual(opened.at(-1),['talk',graph]);const missing=structuredClone(s.gameplay!);delete missing.conversations[graph];assert.throws(()=>nativeDeviceDialogues(missing,s.data!),/Missing native conversation/);targets.push({scene,graph});}for(const[k,v]of Object.entries(old))walk(v,next?.[k]);};walk(noun,live);
 }
 m.reset();m.setPaused(true);
}
assert.equal(targets.length,6);
const source=structuredClone(reviewGraphSource),data=structuredClone(current.MOTH);data.devices.push({id:'review',name:'Review',look:'Review',nouns:[{id:'first',kind:'DAEMON',verbs:['talk'],on:{talk:{do:[{open:'talk',with:'review'}]}}}]});
const projection=nativeDeviceDialogues(source,data);assert.deepEqual(Object.keys(projection),['review']);assert.equal(projection.review.nodes.weather.do,undefined,'metadata cannot execute common rewards');assert(!Array.isArray(projection.review.nodes.base),'common comparison is not a fake native fallback');
const implicit=structuredClone(data);delete (implicit.devices.at(-1)!.nouns[0].on!.talk as any).do[0].with;assert.throws(()=>nativeDeviceDialogues(source,implicit),/Missing native conversation undefined/);
const missing=structuredClone(data);missing.devices.at(-1)!.nouns[0].on!.talk={do:[{open:'talk',with:'absent'}]};assert.throws(()=>nativeDeviceDialogues(source,missing),/Missing native conversation absent/);
assert.throws(()=>nativeDeviceDialogues({...source,conversations:{}},data),/Missing native conversation/);
const previousDocument=globalThis.document;(globalThis as any).document={createElement:()=>new DialogueElement()};try{const scene=SCENES.library,m=new SceneModel({say(){},changed(){},open(){}},scene.data!,sceneRuleContract(scene));m.setPaused(true);let requests=0;const panels=new Panels(new DialogueElement() as any,m,()=>{}, {},()=>{requests++;throw Error('Missing graph must not choose another conversation');});panels.open('talk');assert.equal(requests,0);assert.equal(panels.isOpen,false);panels.close();m.reset();m.setPaused(true);}finally{globalThis.document=previousDocument;}
console.log('Native dialogue metadata PASS: eight current bootstrap/shipping projections; six immutable pre-change targets preserved through actual native dispatch; referenced deletion/implicit/missing graph refusal; descriptive projection only.');
