/** Panels and the toys have no clock of their own: the game loop's tick (SceneHost.tick -> Panels.step) is their frame, scene time their delay. */
import assert from 'node:assert/strict';
import {SCENES} from '../../src/ssg/game/scenes/index';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {Panels} from '../../src/ssg/game/engine/panels';
import {sceneRuleContract} from '../../src/ssg/game/engine/scene-rule-contract';
import {Hints} from '../../src/ssg/game/ui/hints';
import {DialogueElement} from './dialogue-authoring-fixture.mts';
import fs from 'node:fs';
import path from 'node:path';

const timers:string[]=[];
for(const name of ['requestAnimationFrame','setTimeout','setInterval'])(globalThis as any)[name]=()=>{timers.push(name);return 0;};
(globalThis as any).cancelAnimationFrame=()=>{};
(globalThis as any).document={createElement:()=>new DialogueElement()};

const scene=SCENES.library,m=new SceneModel({say(){},changed(){},open(){}},scene.data!,sceneRuleContract(scene));
const frames:[number,number][]=[],fired:number[]=[];
let kitLater!:(ms:number,fn:()=>void)=>()=>void;
const panels=new Panels(new DialogueElement() as any,m,()=>{},{probe:kit=>{
  kitLater=kit.later;
  kit.frame((dt,t)=>{frames.push([dt,t]);});
  kit.later(100,()=>fired.push(m.now()));
  const cancelled=kit.later(50,()=>fired.push(-1));cancelled();
}});
panels.open('probe');
assert.deepEqual(frames,[],'nothing runs before the game loop ticks');
m.tick(40,true);panels.step(40);
m.tick(40,true);panels.step(40);
assert.deepEqual(frames,[[40,40],[40,80]],'frame gets dt and time since opening from the loop');
assert.deepEqual(fired,[],'a delayed action waits for scene time');
m.tick(40,true);panels.step(40);
assert.deepEqual(fired,[100],'a delayed action runs on the model tick at its own scene time');
m.setPaused(true);
m.tick(500,true);
assert.deepEqual(fired,[100]);
m.setPaused(false);
const pending=kitLater(1000,()=>fired.push(-2));void pending;
panels.close();
m.tick(2000,true);panels.step(2000);
assert.deepEqual(fired,[100],'closing the panel drops its frame and cancels its delayed actions');
assert.equal(frames.length,3);
assert.deepEqual(timers,[],'no browser timer or animation frame drives a panel');

// the hint lane reads only the communication lane's readable time

assert.equal(Hints.prototype.step.length,1,'step has a required time argument and no wall-clock default');
const source=fs.readFileSync(path.resolve('src/ssg/game/ui/hints.ts'),'utf8');
assert.ok(!/performance\.now|Date\.now/.test(source),'hints.ts reads no wall clock');
for(const file of ['engine/panels.ts','engine/camera-panel.ts','engine/toys/rings.ts','engine/toys/morse.ts','engine/toys/cipher.ts','engine/toys/common.ts']){
  const text=fs.readFileSync(path.resolve('src/ssg/game',file),'utf8');
  assert.ok(!/requestAnimationFrame|setTimeout|setInterval|performance\.now|Date\.now/.test(text),file+' has no timer, loop or wall clock');
}
console.log('Panel frame PASS: panels, toys and the camera step on the game loop tick and scene time; no timer, animation frame or wall clock; hints read readable time only.');
process.exit(0);
