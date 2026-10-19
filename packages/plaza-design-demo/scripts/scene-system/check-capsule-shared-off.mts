import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {SCENES} from '../../src/ssg/game/scenes';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {attachNativeGameplay,nativeStatePort} from '../../src/ssg/game/engine/gameplay/native-bindings';
import {validateGameplay} from '../../src/ssg/game/engine/gameplay/validation';
import type {GameplayDefinition,GameplayState} from '../../src/ssg/game/engine/gameplay/types';
import {mountGameplayAuthoring} from '../../src/ssg/game/authoring/gameplay-authoring';
const frozen=path.resolve('../../.scene-system/all-game-baseline-2026-10-18/source');
const oldRules=(await import(pathToFileURL(path.join(frozen,'scenes/capsule/rules.ts')).href)).CAPSULE_RULES;
const oldData=JSON.parse(fs.readFileSync(path.join(frozen,'scenes/capsule/devices.json'),'utf8'));
const scene=SCENES.capsule,definition=scene.gameplay!;
function create(shared:boolean,plugOn:boolean){
 const lines:unknown[]=[],data=structuredClone(shared?scene.data!:oldData);
 const model=new SceneModel({say:(line,from)=>lines.push({line,from}),open:()=>{},changed:()=>{}},data,shared?scene.rules!:oldRules);
 model.set('plugOn',plugOn);
 let state:GameplayState={flags:{},items:{},tokens:0};
 if(shared){const port=nativeStatePort(definition,{read:()=>state,write:s=>{state=s;}},()=>model);attachNativeGameplay(model,new GameplaySession(definition,port));}
 return{model,lines,state:()=>state};
}
let cases=0;
for(const initial of [false,true])for(const signal of [false,true]){
 const old=create(false,initial),now=create(true,initial);
 for(let i=0;i<3;i++){
  assert.equal(now.model.eligibility('plug','power','off',signal).ok,true);
  old.model.act('plug','power','off',signal);now.model.act('plug','power','off',signal);
  assert.deepEqual(now.model.snapshot(),old.model.snapshot());assert.deepEqual(now.lines,old.lines);
  assert(!Object.prototype.hasOwnProperty.call(now.state().values??{},'capsule.plugOn'),'save stays owned by native scene');
  cases++;
 }
 const reloaded=create(true,true);reloaded.model.restore(old.model.snapshot());assert.equal(reloaded.model.get('plugOn'),false);
}
assert(!('plug.off' in scene.rules!.effects),'replaced custom effect deleted');
assert(!scene.data!.devices.find(d=>d.id==='plug')!.nouns.find(n=>n.id==='power')!.on?.off,'no duplicate legacy steps');
for(const sources of [[],['system'],['signal','signal'],['interaction','signal','interaction']]){const d=structuredClone(definition) as any;d.native.verbs[0].cases[0].sources=sources;assert.throws(()=>validateGameplay(d));}
const bad=structuredClone(definition);bad.native!.verbs[0].cases.at(-1)!.sources=['signal'];assert.throws(()=>validateGameplay(bad),'unconditional fallback required');
const missing=structuredClone(definition) as any;delete missing.native.verbs[0].cases[0].say;assert.throws(()=>validateGameplay(missing),'silence is explicit null');
class Element{children:Element[]=[];attributes:Record<string,string>={};value='';checked=false;textContent='';onchange?:()=>void;onclick?:()=>void;append(...nodes:Element[]){this.children.push(...nodes);}replaceChildren(...nodes:Element[]){this.children=[...nodes];}setAttribute(k:string,v:string){this.attributes[k]=v;}remove(){}}
const prior=globalThis.document;(globalThis as any).document={createElement:()=>new Element()};
try{
 const host=new Element(),all=(e:Element):Element[]=>[e,...e.children.flatMap(all)];let pending=structuredClone(definition);
 const mounted=mountGameplayAuthoring(host as any,{nativeDataSource:()=>scene.data!,document:()=>pending,validate:validateGameplay,onEdit(d){pending=d;mounted.refresh();},undo(){},redo(){},save:async()=>{},reload:async()=>{},dirty:()=>false,saveLabel:'Save'});
 const change=(name:string,value:string|boolean)=>{const e=all(host).find(e=>e.attributes['aria-label']===name);assert(e,name);if(typeof value==='boolean')e.checked=value;else e.value=value;e.onchange!();};
 change('plug.power off case 1 source','interaction');assert.deepEqual(pending.native!.verbs[0].cases[0].sources,['interaction']);
 change('plug.power off case 1 silent',false);assert(Array.isArray(pending.native!.verbs[0].cases[0].say));
 change('plug.power off case 1 silent',true);assert.equal(pending.native!.verbs[0].cases[0].say,null);
}finally{(globalThis as any).document=prior;}
console.log('Capsule shared plug off PASS: '+cases+' real-model original comparisons, manual/signal replies and silence, repeated action, native save ownership/reload, deleted legacy execution and source validation.');
