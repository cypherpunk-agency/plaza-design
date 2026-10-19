import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderGameplayQueriesAuthoring} from '../../src/ssg/game/authoring/gameplay-queries-authoring';
import {TypedForm} from '../../src/ssg/game/authoring/typed-form';
import {validateGameplay} from '../../src/ssg/game/engine/gameplay/validation';
import {validateDeviceDocument} from '../../src/ssg/game/engine/gameplay/device-source-validation';
import {laundromatScene} from '../../src/ssg/game/scenes/laundromat';
import {projectSceneState} from '../../src/ssg/game/engine/gameplay/scene-state';
import {readQuery} from '../../src/ssg/game/engine/gameplay/queries';
import type {GameplayDefinition} from '../../src/ssg/game/engine/gameplay/types';
const data=JSON.parse(fs.readFileSync('src/ssg/game/scenes/laundromat/devices.json','utf8')),scene=laundromatScene();
let draft=JSON.parse(fs.readFileSync('src/ssg/game/scenes/laundromat/gameplay.json','utf8')) as GameplayDefinition;
class Element{children:Element[]=[];attrs:Record<string,string>={};value='';checked=false;textContent='';onchange?:()=>void;onclick?:()=>void;append(...e:Element[]){this.children.push(...e);}setAttribute(k:string,v:string){this.attrs[k]=v;}}
const previous=globalThis.document;let host:Element,errors:unknown[]=[],history:GameplayDefinition[]=[],future:GameplayDefinition[]=[];const controls:Record<string,string>={};
(globalThis as any).document={createElement:()=>new Element()};
function validate(value:unknown){const g=validateGameplay(value);validateDeviceDocument('laundromat',data,{rules:scene.rules as any,gameplay:g,dialogue:scene.data!.dialogue});return g;}
function render(){host=new Element();renderGameplayQueriesAuthoring(host as any,draft,{data,form:new TypedForm(e=>errors.push(e)),draft:controls,refresh:render,section:(parent,title)=>{const child=new Element();child.textContent=title;(parent as any).append(child);return child as any;},edit:(_label,mutate)=>{const next=structuredClone(draft);mutate(next);validate(next);history.push(draft);future=[];draft=next;render();}});}
const all=(e:Element):Element[]=>[e,...e.children.flatMap(all)];
function set(name:string,value:string){const e=all(host).find(e=>e.attrs['aria-label']===name);assert(e,name);e.value=value;e.onchange!();}
function click(text:string){const e=all(host).find(e=>e.textContent===text&&e.onclick);assert(e,text);e.onclick!();}
const value=(id:string)=>readQuery(id,{values:{laundromat:{w1:'running',w2:'running',w3:'done',w4:'running',jacket:false}},flags:{},items:{},tokens:0},{definition:draft,tuning:data.tuning,labels:data.texts});
try{
 render();assert.equal(value('laundromat.running'),3);
 for(const row of[4,3,2])click('Remove Query laundromat.running row '+row);
 assert.equal(errors.length,0);assert.equal(value('laundromat.running'),1,'edited rows drive actual pure query');
 set('Query laundromat.name.washer1 label','name.washer2');assert.equal(value('laundromat.name.washer1'),'WASHER 2');
 set('Query laundromat.maxRunning tuning','cycleMs');assert.equal(value('laundromat.maxRunning'),5000);
 set('Query laundromat.cycleSeconds milliseconds source','literal');set('Query laundromat.cycleSeconds milliseconds literal','3500');assert.equal(value('laundromat.cycleSeconds'),4);
 set('Query laundromat.door3 case 3 condition operator','gte');set('Query laundromat.door3 case 3 condition right literal','2');assert.equal(value('laundromat.door3'),'held');
 set('Query laundromat.door3 case 3 condition right literal','9');assert.equal(value('laundromat.door3'),'open');
 set('New query ID','laundromat.review');set('New query kind','count');click('Add read-only query');assert.equal(value('laundromat.review'),1);click('Add Query laundromat.review row');assert.equal(value('laundromat.review'),2);click('Remove Query laundromat.review');assert(!draft.queries!['laundromat.review']);assert.equal(errors.length,0);
 // Cycle edit must be atomic through the same callback that backs the workbench.
 set('Query laundromat.cycleSeconds milliseconds source','query');const good=structuredClone(draft);set('Query laundromat.cycleSeconds milliseconds query','laundromat.cycleSeconds');assert.equal(errors.length,1);assert.deepEqual(draft,good);errors=[];
 // Referenced graph nodes cannot disappear while device status/conditions still use them.
 click('Remove Query laundromat.running');assert.equal(errors.length,1);assert.deepEqual(draft,good);errors=[];
 const after=JSON.stringify(draft),undo=history.pop()!;future.push(draft);draft=undo;render();assert.notEqual(JSON.stringify(draft),after);history.push(draft);draft=future.pop()!;render();assert.equal(JSON.stringify(draft),after,'undo/redo retain exact source graph');
 const projected=projectSceneState(data,draft);assert(!('laundromat.running'in projected.state));validate(draft);
 console.log('Laundromat query forms PASS: actual count-row CRUD, select compare controls, tuning/label rebinding, rounded duration, add/delete query, invalid cycle/device references atomic, byte-exact undo/redo and prospective source validation.');
}finally{globalThis.document=previous;}

export const editedLaundromatQueries=structuredClone(draft);
