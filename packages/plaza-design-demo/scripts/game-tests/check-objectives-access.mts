import {PLACES,placeBlocked,seenPlace,placeOf,transportPermission} from '../../src/ssg/game/world/city';
import assert from 'node:assert/strict';
import downtownDocument from '../../src/ssg/game/scenes/downtown/scene.json';
import {currentObjective} from '../../src/ssg/game/engine/gameplay/objectives';
import {newSave} from '../../src/ssg/game/runtime/save';
import {evaluateAccess,validateAccess} from '../../src/ssg/game/engine/gameplay/access';
import {capabilityView,exitPermission,exitVisibility} from '../../src/ssg/game/world/access';
import {compileSceneDocument,validateSceneDocument} from '../../src/ssg/game/engine/gameplay/scene-document';
import {matches} from '../../src/ssg/game/engine/gameplay/queries';
import {HARBOR_SHED,HARBOR_GAMEPLAY} from './harbor-source-fixture.mts';
import {SCENES} from '../../src/ssg/game/scenes';
const SHIFT_SCENE=validateSceneDocument(HARBOR_SHED.scene,HARBOR_GAMEPLAY,{manifest:true,actors:true}),SHIFT_USES=SCENES['harbor-shed'].uses!,shiftGoal=SCENES['harbor-shed'].objective!,shiftAttention=SCENES['harbor-shed'].attention!;
import {demoContent,DEMO_GAMEPLAY,DEMO_COUNTER} from '../../src/ssg/game/demo';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {ConversationSession} from '../../src/ssg/game/engine/gameplay/conversation';
import type {GameplayState} from '../../src/ssg/game/engine/gameplay/types';
// Baseline oracle preserves the previous explicit Downtown stage order over every combination.
for(let mask=0;mask<64;mask++){
 const s=newSave();s.handle=mask&1?'name':'';s.flags.till=!!(mask&2);s.controlled=[...(mask&4?['0x2F']:[]),...(mask&16?['0x31']:[])];s.jump=!!(mask&8);s.flags.end=!!(mask&32);
 const old=!s.handle?'handle':!s.flags.till?'till':!s.controlled.includes('0x2F')?'box':!s.jump?'install':!s.controlled.includes('0x31')?'relay':!s.flags.end?'gate':'done';
 assert.equal(currentObjective(downtownDocument.objectives as any,{flags:s.flags,items:s.items,tokens:s.tokens,player:s})?.id,old);
}
const flags=[...new Set(JSON.stringify(SHIFT_SCENE.objectives).matchAll(/"state":"shift\.([^"]+)"/g).map(m=>m[1]))];
for(let mask=0;mask<2**flags.length;mask++){
 const state={flags:{},values:{shift:Object.fromEntries(flags.map((f,i)=>[f,!!(mask&(1<<i))]))},items:{},tokens:0};
 const old=SHIFT_SCENE.objectives.find(g=>matches(g.when,state))!;
 assert.equal(shiftGoal(state.flags,state),old.text);
 const attention=shiftAttention(state.flags,state);assert.equal(attention?.x,old.target?SHIFT_USES.find(u=>u.id===old.target)!.x:undefined);assert.equal(!!attention?.gentle,!!old.target&&!!old.gentle);
}
// Preserve the previous map refusal priority over seen/location/gate/harbor/ride combinations.
for(const p of PLACES)for(const scene of ['downtown','harbor'] as const)for(let mask=0;mask<16;mask++){
 const st={scene,seen:()=>!!(mask&1),exitAccess:()=>mask&2?{ok:true}:{ok:false,reason:'THE MARKET GATE IS SHUT'},gateOpen:!!(mask&2),harborOpen:!!(mask&4),ride:mask&8?{from:'downtown' as const,to:'galleria' as const,f:.5}:null};
 const old=!seenPlace(p,st.seen)?'NOT VISITED YET':p.scenes.includes(scene)?'YOU ARE HERE':p.district==='market'&&!st.gateOpen?'THE MARKET GATE IS SHUT':p.district==='harbor'&&!st.harborOpen&&placeOf(scene).district!=='harbor'?'HARBOR CLOSED · LINE 0 DOES NOT STOP':st.ride&&st.ride.f>0?'NOT FROM A MOVING METRO · GET OFF FIRST':'';
 assert.equal(placeBlocked(p,st as any),old);
}
let state:GameplayState={flags:{},items:{},tokens:8};const before=structuredClone(state);
assert.deepEqual(evaluateAccess([{when:{flag:'ready'},reason:'Need permission'}],{state}),{ok:false,reason:'Need permission',index:0,hidden:false});assert.deepEqual(state,before);
assert.equal(exitVisibility({requires:'door'},state.flags).ok,false);assert.equal(exitPermission({needs:{key:'chip',name:'Door',pages:['Need chip'],h:40}},['chip']).ok,true);assert.equal(transportPermission('harbor',false).ok,false);assert.equal(transportPermission('harbor',true).ok,true);assert.equal(transportPermission('downtown',false).ok,true);
const save=newSave();save.jump=true;save.programs=['scan.so'];save.keyring=['chip'];const caps=capabilityView(save,false,{scanProgram:'scan.so'});assert.equal(caps.jump,true);assert.equal(caps.network,false);caps.jump=false;assert.equal(save.jump,true);
for(const access of [[{when:{flag:'unknown'},reason:'x'}],[{command:'unknown',reason:'x'}],[{command:'demo.mission.start',reason:'x'}],[{capability:'unknown',reason:'x'}],[{reason:'x'}],[{when:{all:[]},reason:'x',script:'bad'}]])assert.throws(()=>validateAccess(access,DEMO_GAMEPLAY));
assert.throws(()=>validateSceneDocument({...DEMO_COUNTER,version:2},DEMO_GAMEPLAY));
const changed=structuredClone(DEMO_COUNTER);changed.uses[0].access=[{when:{tokensAtLeast:99},reason:'Need 99 tokens'}];const compiled=compileSceneDocument(validateSceneDocument(changed,DEMO_GAMEPLAY,{manifest:true,actors:true}),{buy:12},()=>({name:'',pages:[]}));
const session=new GameplaySession(DEMO_GAMEPLAY,{read:()=>state,write:v=>{state=v;}});const snapshot=structuredClone(session.state());assert.deepEqual(compiled.uses[0].use({gameplay:session,flags:state.flags} as any),['Need 99 tokens']);assert.deepEqual(session.state(),snapshot);
const content=demoContent(),talk=new ConversationSession(session,'demo.mission');assert(talk.choose('mission-start').ok);const blocked=structuredClone(session.state());assert.equal(content.shop.uses![0].eligibility!(state.flags,session).ok,false);content.shop.uses![0].use({gameplay:session,flags:state.flags} as any);assert.deepEqual(session.state(),blocked);assert.match(content.shop.objective!(state.flags),/permission/);
assert(talk.choose('permit').ok);assert.equal(content.shop.uses![0].eligibility!(state.flags,session).ok,true);assert.match(content.shop.objective!(state.flags),/Buy one/);content.shop.uses![0].use({gameplay:session,flags:state.flags} as any);assert.equal(state.items.blue,1);assert.equal(state.tokens,6);assert.equal(content.shop.objective!(state.flags),'Purchase task complete');
state=JSON.parse(JSON.stringify(state));const reloaded=new GameplaySession(DEMO_GAMEPLAY,{read:()=>state,write:v=>{state=v;}});assert.equal(content.shop.objective!(reloaded.state().flags),'Purchase task complete');
console.log(`ENG-05 PASS: 64 Downtown stages, ${2**flags.length} Harbor objective/attention snapshots, pure access/capabilities, invalid references, pending requirements, shared command refusal, optional demo mission and reload.`);
