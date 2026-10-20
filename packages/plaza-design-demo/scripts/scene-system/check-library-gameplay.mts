import assert from 'node:assert/strict';
import fs from 'node:fs';
import {libraryScene} from '../../src/ssg/game/scenes/library/index';
import {libraryComposition} from '../../src/ssg/game/scenes/library/composition';
import {LIBRARY_GAMEPLAY,LIBRARY_SCENE,validateLibraryGameplay,validateLibraryScene} from '../../src/ssg/game/scenes/library/scene-document';
import {LIBRARY_RULES} from '../../src/ssg/game/scenes/library/rules';
import {PEOPLE,libraryFrameEnvironment} from '../../src/ssg/game/scenes/library/scene';
import {frameView} from '../../src/ssg/game/art/core/view';
import {light} from '../../src/ssg/game/world/light';
import type {EngineDraw} from '../../src/ssg/game/engine/host';
import {talkTo} from '../../src/ssg/game/runtime/characters';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import type {UseCtx} from '../../src/ssg/game/scenes/kit';
const legacy=JSON.parse(fs.readFileSync(new URL('./fixtures/library-before.json',import.meta.url),'utf8'));
const plain=(v:unknown)=>JSON.parse(JSON.stringify(v,(key,value)=>key==='conversation'?undefined:value));
const scene=libraryScene();
// The original renderer treated omitted spot.y as zero; talk now names its formerly implicit graph.
// Keep the original fixture immutable and account for these two explicit schema representations.
const expectedData=structuredClone(legacy.data);for(const device of expectedData.devices){if(device.layout?.spot)device.layout.spot.y??=0;}
let explicitTargets=0;const explicitTalk=(value:any)=>{if(!value||typeof value!=='object')return;if(value.open==='talk'){assert.equal(value.with,undefined);value.with='catalog';explicitTargets++;}for(const child of Object.values(value))explicitTalk(child);};explicitTalk(expectedData);assert.equal(explicitTargets,1);

const originalData=(value:any)=>{const {observations,...data}=plain(value);assert.deepEqual(observations,{aliases:{catalogConnected:{kind:'nodeConnected',node:'catalog'},lendingConnected:{kind:'nodeConnected',node:'lending'},'goal.lan':{kind:'goalComplete',goal:'lan'}}},'source observation replacement is explicit');return data;};
for(const key of ['id','name','width','spawn','people','readables','exits','data'] as const)assert.deepEqual(key==='data'?originalData(scene[key]):plain(scene[key]),key==='data'?expectedData:legacy[key],key+' parity');
assert.equal(scene.rules,LIBRARY_RULES);
assert.equal(scene.objective,undefined);assert.equal(scene.storyMinute,undefined);
assert.equal(typeof scene.intro,'function');
assert.deepEqual((scene.intro as Function)(false),legacy.intro[0]);
assert.deepEqual((scene.intro as Function)(true),legacy.intro[1]);
let state={flags:{'unrelated:kept':true},items:{'shift.tag':1},tokens:13},writes=0;
const session=new GameplaySession(LIBRARY_GAMEPLAY,{read:()=>state,write:next=>{writes++;state=next as typeof state;}});
const before=structuredClone(state),ctx={gameplay:session,flags:state.flags,tokens:state.tokens} as UseCtx;
for(const use of scene.uses!){const expected=legacy.uses.find((row:any)=>row.id===use.id);assert.deepEqual(plain({...use,pages:use.use(ctx)}),expected);}
assert.deepEqual(state,before);assert.equal(writes,0);assert.deepEqual(session.events(),[]);session.dispose();
let talkState:any={flags:{},items:{},tokens:0};const chatter=()=>new GameplaySession(scene.gameplay!,{read:()=>talkState,write:next=>{talkState=next;}});const talkSession=chatter();
for(const person of scene.people!.filter(person=>person.talk)){
 const expected=legacy.people.find((row:any)=>row.id===person.id);
 for(let i=0;i<expected.talk.length+3;i++)assert.deepEqual(talkTo(person,talkSession),{name:expected.name,pages:expected.talk[Math.min(i,expected.talk.length-1)]});
}
// Rebuilding identities preserves the explicitly approved saved conversation progress.
talkSession.dispose();const resumed=chatter();for(const person of libraryScene().people!.filter(person=>person.talk)){const pages=legacy.people.find((row:any)=>row.id===person.id).talk;assert.deepEqual(talkTo(person,resumed).pages,pages.at(-1));}resumed.dispose();
const pending=structuredClone(LIBRARY_SCENE);
pending.people![0].talk[0]=['Pending robot dialogue'];pending.readables![0].pages=['Pending notice'];pending.uses[0].routes[0].pages=['Pending chair'];pending.exits![0].label='[E] PENDING EXIT';
const edited=libraryScene(libraryComposition,{}, {},pending);
const pendingSession=new GameplaySession(edited.gameplay!,{read:()=>({flags:{},items:{},tokens:0}),write:()=>{}});assert.deepEqual(talkTo(edited.people![0],pendingSession).pages,['Pending robot dialogue']);pendingSession.dispose();assert.deepEqual(edited.readables![0].pages,['Pending notice']);assert.deepEqual(edited.uses![0].use(ctx),['Pending chair']);assert.equal(edited.exits[0].label,'[E] PENDING EXIT');
assert.deepEqual(originalData(edited.data),expectedData);
const view={...frameView(0,light()),sx:(x:number)=>x,y:(h:number)=>280-h,t:10,cam:0,gy:280,viewW:960,viewH:360,flags:{}};
const engine={hover:null,m:{value:()=>false}} as unknown as EngineDraw;
assert.ok(PEOPLE.find(person=>person.id==='librarian')!.talk,'Default render-bound librarian retains the hint mark');
const defaultPose=libraryFrameEnvironment(view,engine).bindings['actor.librarian.pose'] as any;
assert.ok(defaultPose.character.key&&defaultPose.character.talk,'Prepared default hint mark prerequisites');
const pendingPose=edited.visualEnvironment!(view,engine).bindings['actor.shelfe.pose'] as any;
assert.deepEqual(pendingPose.character.talk,[['Pending robot dialogue'],...pending.people![0].talk.slice(1)],'Pending dialogue reaches the exact actors prepared for painting');
for(const change of [
 (d:any)=>d.people[0].id='unbound',(d:any)=>d.readables.pop(),(d:any)=>d.manifest.exits.downtown='' ,
 (d:any)=>d.id='shop',(d:any)=>d.time=[{minute:-1}],(d:any)=>d.uses[0].routes[0].command='grant',
]){const bad=structuredClone(LIBRARY_SCENE);change(bad);assert.throws(()=>validateLibraryScene(bad));}
assert.throws(()=>validateLibraryGameplay({...LIBRARY_GAMEPLAY,flags:[]}));
assert.doesNotThrow(()=>validateLibraryGameplay({...LIBRARY_GAMEPLAY,commands:{...LIBRARY_GAMEPLAY.commands,grant:{sources:['interaction'],actions:[{tokens:1}]}}}));
console.log('Library authored scene: legacy content/geometry/device parity, persistent shared dialogue, pure chair/resources, pending bindings and protected contracts passed.');
