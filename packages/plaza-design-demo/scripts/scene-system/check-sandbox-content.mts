import assert from 'node:assert/strict';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {sandboxScene,sandboxComposition} from '../../src/ssg/game/scenes/sandbox';
import {content} from '../../src/ssg/game/scenes/sandbox/scene-document';
import {pendingScene} from '../../src/ssg/game/authoring/pending-scene';
import {behaviorNoun} from './legacy-s13/behavior-validation';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {ConversationSession} from '../../src/ssg/game/engine/gameplay/conversation';
import type {GameplayState} from '../../src/ssg/game/engine/gameplay/types';
import {inWindow} from '../../src/ssg/game/world/clock';
const {sandbox:old}=await import(pathToFileURL(path.resolve('../../.scene-system/all-game-baseline-2026-10-18/source/scenes/sandbox/index.ts')).href),scene=sandboxScene();
// These five ordinary implementations moved to shared commands; their runtime parity is
// independently checked against immutable original code in check-sandbox-ordinary.mts.
const originalData=structuredClone(old.data);for(const[dev,noun,verb]of [['counter','count','count'],['stamp','press','stamp'],['coffee','cup','brew'],['reader','slot','insert'],['till','drawer','pay']])delete originalData.devices.find((d:any)=>d.id===dev).nouns.find((n:any)=>n.id===noun).on[verb];
for(const key of ['count.up','stamp.ok','brew.ok','chip.none','chip.ok','till.broke','till.ok'])delete originalData.texts[key];
assert.equal(scene.width,old.width);assert.equal(scene.spawn,old.spawn);assert.deepEqual(scene.intro,old.intro);assert.deepEqual(scene.exits,old.exits);assert.deepEqual(scene.rests,old.rests);assert.deepEqual(scene.readables,old.readables);assert.deepEqual(scene.data,originalData);
for(const actor of scene.people!){const original=old.people.find((p:any)=>p.seed===actor.seed),{talk,lines,name,conversation,...visual}=actor,{talk:ot,lines:ol,name:on,conversation:oc,...originalVisual}=original;assert.deepEqual(visual,originalVisual);if(actor.id)assert.equal(name,on);}
let saved:GameplayState={flags:{},items:{},tokens:0,world:{day:1,minute:720,weather:'clear'}};
const gp=new GameplaySession(scene.gameplay!,{read:()=>saved,write:s=>{saved=s;}}),oldItems:Record<string,number>={};
for(let i=0;i<3;i++){const expected=old.uses[0].use({add:(item:string)=>{oldItems[item]=(oldItems[item]??0)+1;}});assert.deepEqual(scene.uses![0].use({gameplay:gp} as any),expected);assert.deepEqual(saved.items,oldItems);}
assert.equal(gp.dispatch('sandbox.dispense','signal').ok,false);
let talks=0;
for(const actor of scene.people!.filter(p=>p.conversation)){const original=old.people.find((p:any)=>p.id===actor.id);for(let i=0;i<original.talk.length+1;i++){const c=new ConversationSession(gp,actor.conversation!);assert.deepEqual(c.frame().pages,original.talk[Math.min(i,original.talk.length-1)]);c.close();talks++;}}
for(const weather of ['clear','rain','storm'] as const)for(const minute of [240,720,1200]){
 const state:GameplayState={flags:{},items:{},tokens:0,world:{day:1,minute,weather}},session=new GameplaySession(scene.gameplay!,{read:()=>state,write:s=>Object.assign(state,s)}),tech=old.people.find((p:any)=>p.id==='tech');
 const variant=tech.lines.find((l:any)=>(!l.weather||l.weather.includes(weather))&&(!l.when||inWindow(l.when,1,minute)));
 const talk=new ConversationSession(session,'talk.sandbox.tech');assert.deepEqual(talk.frame().pages,variant?.pages??tech.talk[0]);talk.close();assert.equal(Number(session.state().values?.['talk.sandbox.tech']?.cursor??0),variant?0:1);
}
function resetRun(def:typeof scene){const lines:unknown[]=[],inventory={blankchip:3},m=new SceneModel({say:l=>lines.push(l),changed:()=>{},open:()=>{},carry:(id,n)=>inventory[id as 'blankchip']+=n},def.data!,def.rules as any);let leaked=false;m.set('lampOn',true);m.goal('first');m.cut(m.links[0]);m.later(200,()=>{leaked=true;});const targets=def.targets!(m);def.use!('reset',m,l=>lines.push(l));m.tick(300);return {targets,lines,save:m.snapshot(),inventory,leaked,pending:m.inspect().time.pending};}
const clockDescriptor=Object.getOwnPropertyDescriptor(performance,'now');Object.defineProperty(performance,'now',{configurable:true,value:()=>1000});
try{assert.deepEqual(resetRun(scene),resetRun(old));assert.equal(resetRun(scene).leaked,false);assert.deepEqual(resetRun(scene).pending,[]);}finally{if(clockDescriptor)Object.defineProperty(performance,'now',clockDescriptor);else delete (performance as any).now;}
const pending=structuredClone(content.scene),gameplay=structuredClone(content.gameplay),behavior=structuredClone(scene.data!);pending.readables![0].name='Pending plan';pending.readables![0].pages=['Pending instructions'];pending.people![0].talk[0]=['Pending QA'];pending.uses[0].routes[0].pages=['Pending chip'];gameplay.commands['sandbox.dispense'].actions=[{item:'blankchip',add:2}];
behaviorNoun(behavior,'lamp.lamp').on!.on={do:[{set:'lampOn',to:false}],say:['lamp on','PENDING LAMP','dim']};
const preview=pendingScene('sandbox',sandboxComposition,{sceneDocument:pending,gameplay,behavior});assert.deepEqual(preview.readables![0].pages,['Pending instructions']);assert.equal(preview.readables![0].name,'Pending plan');
let fresh:GameplayState={flags:{},items:{},tokens:0};const session=new GameplaySession(preview.gameplay!,{read:()=>fresh,write:s=>{fresh=s;}});assert.deepEqual(new ConversationSession(session,'talk.sandbox.lead').frame().pages,['Pending QA']);assert.deepEqual(preview.uses![0].use({gameplay:session} as any),['Pending chip']);assert.equal(fresh.items.blankchip,2);
const responses:unknown[]=[],native=new SceneModel({say:l=>responses.push(l),open:()=>{},changed:()=>{}},preview.data!,preview.rules as any);native.act('lamp','lamp','on');assert.equal(native.get('lampOn'),false);assert.ok(responses.some((l:any)=>l[1]==='PENDING LAMP'));
const invalid=structuredClone(content.scene);invalid.nativeTargets![0].routes[0].steps[0]={reset:false} as any;assert.throws(()=>content.validateScene(invalid));
console.log('Sandbox content PASS: immutable original geometry/readables/actor appearance, chip grant/permission, '+talks+' NPC pages and nine context cases, native reset/timer cancellation/inventory preservation; private Play combines pending content, commands and device behavior.');
