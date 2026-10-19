import originalLaundromat from '../../../../.scene-system/all-game-baseline-2026-10-18/source/scenes/laundromat';
import assert from 'node:assert/strict';
import {laundromatScene,laundromatComposition,LAUNDROMAT_GAMEPLAY,LAUNDROMAT_SCENE,validateLaundromatGameplay,validateLaundromatScene,LAUNDROMAT_RULES} from '../../src/ssg/game/scenes/laundromat';
import {laundromatPeople} from '../../src/ssg/game/scenes/laundromat/scene';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {attachNativeGameplay,nativeStatePort} from '../../src/ssg/game/engine/gameplay/native-bindings';
import type {GameplayState} from '../../src/ssg/game/engine/gameplay/types';
import type {UseCtx} from '../../src/ssg/game/scenes/kit';
import type {EngineDraw} from '../../src/ssg/game/engine/host';
import {frameView} from '../../src/ssg/game/art/core/view';

const success=['1 SACHET DISPENSED. SCENT: STANDARD.','PURCHASE LOGGED TO YOUR IDENTITY. IDENTITY NOT FOUND. PURCHASE LOGGED ANYWAY.'];
const refusal=['INSERT 1 TOKEN.','NO TOKEN DETECTED. NO SOAP DISPENSED. ATTEMPT LOGGED.'];
// Captured pre-migration ordinary-use callback: repeatable, no flag and no stock limit.
function legacy(state:GameplayState){if(state.tokens<1)return refusal;state.tokens--;state.items.soap=(state.items.soap??0)+1;return success;}
const scene=laundromatScene();
const original=originalLaundromat.laundromat as typeof scene;const plain=(v:unknown)=>JSON.parse(JSON.stringify(v,(k,v)=>k==='conversation'?undefined:v));for(const key of ['people','readables','exits','width','spawn','facing'] as const)assert.deepEqual(plain(scene[key]),plain(original[key]),'Immutable original Laundromat '+key);

assert.equal(scene.rules,LAUNDROMAT_RULES);
assert.equal(scene.objective,undefined);assert.equal(scene.attention,undefined);assert.equal(scene.storyMinute,undefined);
assert.deepEqual(scene.exits,[{id:'market',x:30,to:'market',at:'laundromat',label:'[E] MARKET',promptH:82}]);
assert.equal(typeof scene.uses![0].price==='function'?scene.uses![0].price({},new GameplaySession(LAUNDROMAT_GAMEPLAY,{read:()=>({flags:{},items:{},tokens:1}),write:()=>{}})):scene.uses![0].price,1);assert.equal(scene.uses![0].h,76);assert.equal(scene.uses![0].promptH,92);
assert.deepEqual(scene.people!.map(({name,talk,conversation,...actor})=>actor),laundromatPeople().map(({name,talk,conversation,...actor})=>actor));
assert.deepEqual(scene.people!.map(p=>p.id),['blue','folder','gran','sleeper',undefined]);
assert.deepEqual(scene.people!.filter(p=>p.talk).map(({id,name,talk})=>({id,name,talk})),LAUNDROMAT_SCENE.people);
let cases=0;
for(const tokens of [0,1,2,3,17])for(const soap of [0,1,9]){
  let actual:GameplayState={flags:{pixel:true,p13:true},items:{fish:2,...(soap?{soap}:{})},tokens,values:{}};
  const expected=structuredClone(actual);
  const model=new SceneModel({say(){},changed(){},open(){}},scene.data!,LAUNDROMAT_RULES);
  const session=new GameplaySession(LAUNDROMAT_GAMEPLAY,nativeStatePort(LAUNDROMAT_GAMEPLAY,{read:()=>actual,write:s=>{actual=s;}},()=>model));attachNativeGameplay(model,session);
  for(let repeat=0;repeat<5;repeat++){
    const c={gameplay:session,flags:actual.flags,tokens:actual.tokens} as UseCtx;
    assert.deepEqual(scene.uses![0].use(c),legacy(expected));
    assert.deepEqual(actual,expected);cases++;
  }
  // Equivalent saved/reloaded plain state has no hidden purchase counter.
  actual=JSON.parse(JSON.stringify(actual));
  assert.deepEqual(scene.uses![0].use({gameplay:session,flags:actual.flags,tokens:actual.tokens} as UseCtx),legacy(expected));
  assert.deepEqual(actual,expected);
  session.dispose();
  model.reset();model.setPaused(true);
}
const moved=structuredClone(laundromatComposition);
for(const id of ['soap','notice','socks','exit-market'])moved.instances.find(i=>i.id===id)!.placement.x+=13;
moved.instances.find(i=>i.id==='soap')!.placement.h+=7;
const shifted=laundromatScene(moved);
assert.equal(shifted.uses![0].x,scene.uses![0].x+13);assert.equal(shifted.uses![0].h,83);assert.equal(shifted.uses![0].promptH,99);
assert.equal(shifted.exits[0].x,scene.exits[0].x+13);
assert.deepEqual(shifted.readables!.map(r=>r.x),scene.readables!.map(r=>r.x+13));
const edit=structuredClone(LAUNDROMAT_SCENE);edit.name='Pending laundry';edit.intro=['Pending arrival'];edit.people![0].talk=[['Pending talk']];edit.readables![0].pages=['Pending notice'];edit.exits![0].label='[E] BACK';edit.uses[0].routes[0].pages=['Pending soap'];
const pending=laundromatScene(undefined,{}, {},edit);
assert.equal(pending.name,'Pending laundry');assert.deepEqual(pending.intro,['Pending arrival']);assert.deepEqual(pending.people![0].talk,[['Pending talk']]);assert.equal(pending.readables![0].pages[0],'Pending notice');assert.equal(pending.exits[0].label,'[E] BACK');
const view=frameView(0),engine={m:{get:()=>false,value:()=>0,scratch:{},now:()=>0,clocks:{next:()=>null},data:{tuning:{cycleMs:5000}}}} as unknown as EngineDraw;
const prepared=pending.visualEnvironment!(view,engine).bindings!['actor.blue.pose'] as unknown as {character:{name:string;talk:string[][]}};
assert.equal(prepared.character.name,pending.people![0].name);assert.deepEqual(prepared.character.talk,[['Pending talk']]);
const regular=pending.visualEnvironment!(view,engine).bindings!['actor.gran.pose'] as unknown as {character:{key:boolean;talk:string[][]}};
assert.equal(regular.character.key,true);assert.ok(regular.character.talk.length);
const bad=structuredClone(LAUNDROMAT_SCENE);bad.actors![0].reaction='changed';assert.throws(()=>validateLaundromatScene(bad),/protected/);
const wrong=structuredClone(LAUNDROMAT_GAMEPLAY);wrong.commands['laundromat.buy-soap'].sources.push('signal');assert.throws(()=>validateLaundromatGameplay(wrong),/protected/);
const unknown=structuredClone(LAUNDROMAT_SCENE);unknown.uses[0].routes[0].command='missing';assert.throws(()=>validateLaundromatScene(unknown),/permission\/reference/);
console.log(`Laundromat gameplay checks passed: ${cases} legacy purchase boundaries/repeats, reload, unrelated resources, protected identities/permissions, pending narrative and unchanged native rules/actor/anchor geometry.`);
