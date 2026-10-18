/** Focused acceptance of the shared-gameplay pilot, not a campaign playthrough. */
import assert from 'node:assert/strict';
import { GameplaySession,cloneState } from '../../src/ssg/game/engine/gameplay/session';
import { ConversationSession } from '../../src/ssg/game/engine/gameplay/conversation';
import { validateGameplay } from '../../src/ssg/game/engine/gameplay/validation';
import { createGameplayPilot } from '../../src/ssg/game/authoring/gameplay-pilot-session';
import { SHIFT_GAMEPLAY } from '../../src/ssg/game/scenes/harbor-shift/gameplay';
import { SHIFT,SHIFT_USES,shiftGoal,shiftMinute } from '../../src/ssg/game/scenes/harbor-shift';
import type { GameplayDefinition,GameplayState } from '../../src/ssg/game/engine/gameplay/types';
import type { UseCtx,SceneUse } from '../../src/ssg/game/scenes/kit';
const fresh=():GameplayState=>({flags:{},items:{},tokens:0});
function session(def:unknown=SHIFT_GAMEPLAY,initial=fresh()){
 let state=cloneState(initial),writes=0;
 const gameplay=new GameplaySession(def,{read:()=>state,write:next=>{state=next;writes++;}});
 return{gameplay,state:()=>cloneState(state),writes:()=>writes};
}
const accepted=session(),dialogue=new ConversationSession(accepted.gameplay,'supervisor');
assert.equal(accepted.writes(),0);assert.equal(dialogue.frame().choices!.length,2);
dialogue.close();assert.equal(accepted.writes(),0,'closing a conversation cannot grant an assignment');
const later=new ConversationSession(accepted.gameplay,'supervisor');assert.equal(later.choose('later').ok,true);assert.equal(accepted.writes(),0);
const start=new ConversationSession(accepted.gameplay,'supervisor');assert.equal(start.choose('accept').ok,true);
assert.equal(accepted.writes(),1,'assignment and its reward commit once');assert.equal(accepted.state().items['shift.tag'],1);
assert.deepEqual(accepted.gameplay.events().map(e=>e.id),['assignment.accepted','work-tag.issued']);
assert.equal(start.choose('accept').ok,false);assert.equal(accepted.state().items['shift.tag'],1);
assert.equal(accepted.gameplay.dispatch('shift.credit-wages','signal').ok,false);assert.equal(accepted.state().tokens,0);
assert.equal(accepted.gameplay.dispatch('constructor','interaction').ok,false);
// Resource failure after an earlier staged mutation must roll the whole command back.
const broken=structuredClone(SHIFT_GAMEPLAY) as GameplayDefinition;
broken.commands['shift.collect'].actions=[{flag:'shift:parcel',value:true},{emit:'parcel.collected'},{item:'shift.parcel',add:-1}];
const atomic=session(broken,accepted.state());const before=atomic.state();
assert.deepEqual(atomic.gameplay.dispatch('shift.collect','interaction'),{ok:false,reason:'resources'});
assert.deepEqual(atomic.state(),before);assert.equal(atomic.writes(),0);assert.equal(atomic.gameplay.events().length,0);
// The same rollback applies to failing authored reactions and cyclic event chains.
const cyclic=structuredClone(SHIFT_GAMEPLAY) as GameplayDefinition;
cyclic.commands['shift.issue-tag'].actions.push({emit:'assignment.accepted'});
const bounded=session(cyclic);assert.deepEqual(bounded.gameplay.dispatch('shift.accept','conversation'),{ok:false,reason:'budget'});
assert.deepEqual(bounded.state(),fresh());assert.equal(bounded.writes(),0);
const observed=session();let sawCommitted=false;
observed.gameplay.observe(()=>{sawCommitted=observed.state().items['shift.tag']===1;assert.deepEqual(observed.gameplay.dispatch('shift.accept','conversation'),{ok:false,reason:'busy'});throw new Error('diagnostic failure');});
assert.equal(observed.gameplay.dispatch('shift.accept','conversation').ok,true);assert.equal(sawCommitted,true);
// Real SceneModel emits and delivers the cable, retaining its 150 ms native delay.
function ready(){const p=createGameplayPilot();p.talk('supervisor').choose('accept');p.gameplay.dispatch('shift.collect','interaction');return p;}
const wired=ready();wired.model.act('scanner','parcel','scan');wired.advance(149);assert.equal(wired.gameplay.state().flags[SHIFT.delivered],undefined);
wired.advance(1);assert.equal(wired.gameplay.state().flags[SHIFT.delivered],true);assert.equal(wired.gameplay.state().items['shift.parcel'],undefined);
assert.equal(wired.gameplay.events().find(e=>e.id==='parcel.transferred')!.source,'signal');
assert.equal(wired.gameplay.events().find(e=>e.id==='delivery.completed')!.source,'system');
wired.model.act('scanner','parcel','scan');wired.advance(150);assert.equal(wired.gameplay.events().filter(e=>e.id==='delivery.completed').length,1);
const ordinary=ready();assert.equal(ordinary.gameplay.dispatch('shift.deliver','interaction').ok,true);assert.deepEqual(ordinary.gameplay.state(),wired.gameplay.state());
const cut=ready();cut.model.cut(cut.model.links[0]);cut.model.act('scanner','parcel','scan');cut.advance(150);assert.equal(cut.gameplay.state().flags[SHIFT.delivered],undefined);
cut.model.connect('scanner.parcel:detected','terminal.delivery','deliver');cut.model.act('scanner','parcel','scan');cut.model.cut(cut.model.links[0]);cut.advance(150);assert.equal(cut.gameplay.state().flags[SHIFT.delivered],true,'cut preserves already-sent native signal');
const reset=ready();reset.model.act('scanner','parcel','scan');reset.reset();reset.advance(500);assert.deepEqual(reset.gameplay.state(),fresh());
// Preserve the complete ordinary harbor chain, messages, IDs and serialized legacy state.
const live=session();
function context():UseCtx{return{
 gameplay:live.gameplay,tokens:live.state().tokens,flags:live.state().flags,t:0,weather:'clear',min:0,
 pay:()=>{throw new Error('Legacy payment mutation');},give:()=>{throw new Error('Legacy reward mutation');},set:()=>{throw new Error('Legacy flag mutation');},
 add:()=>{throw new Error('Legacy inventory mutation');},take:()=>{throw new Error('Legacy inventory mutation');},has:(item,n=1)=>(live.state().items[item]??0)>=n,
};}
const use=(id:string)=>SHIFT_USES.find(u=>u.id===id)!;
const run=(id:string)=>use(id).use(context());
const pages=(result:ReturnType<SceneUse['use']>)=>Array.isArray(result)?result:result.pages;
assert.equal(shiftMinute(live.state().flags),1120);
assert.equal(pages(run('boss'))[0],'You are on transport. Here is your work tag.');run('boss');assert.equal(live.state().items['shift.tag'],1);
run('parcel');run('parcel');assert.equal(live.state().items['shift.parcel'],1);
assert.equal(pages(use('mara').items![0].use(context()))[0],'Thanks. Pump seals. Maybe the floor gets to stay dry tonight.');
assert.equal(shiftMinute(live.state().flags),1320);assert.match(shiftGoal(live.state().flags),/empty case/);
run('case');run('rack');run('boss');run('trolley');assert.equal(live.state().flags[SHIFT.inspected],true);
run('clamp');run('trolley');run('checkout');run('checkout');run('statement');
assert.equal(live.state().tokens,3);assert.equal(live.state().items['shift.tag'],undefined);assert.equal(live.state().flags[SHIFT.done],true);assert.equal(shiftMinute(live.state().flags),325);
const resumed=session(SHIFT_GAMEPLAY,JSON.parse(JSON.stringify(live.state())));assert.equal(resumed.gameplay.dispatch('shift.checkout','interaction').ok,false);assert.equal(resumed.state().tokens,3);
const lostTag=session(SHIFT_GAMEPLAY,{flags:{[SHIFT.assigned]:true},items:{},tokens:7});
const restoredContext={...context(),gameplay:lostTag.gameplay,flags:lostTag.state().flags,has:(item:string,n=1)=>(lostTag.state().items[item]??0)>=n};
assert.match(pages(use('boss').use(restoredContext))[0],/Pick up the blue parcel/);assert.equal(lostTag.state().items['shift.tag'],1);assert.equal(lostTag.state().tokens,7);
const failedReaction=structuredClone(SHIFT_GAMEPLAY) as GameplayDefinition;
failedReaction.commands['shift.credit-wages'].actions=[{tokens:-4}];
const unsettled=session(failedReaction,{flags:{[SHIFT.parked]:true},items:{'shift.tag':1},tokens:0});
const unsettledBefore=unsettled.state();assert.deepEqual(unsettled.gameplay.dispatch('shift.checkout','interaction'),{ok:false,reason:'resources'});assert.deepEqual(unsettled.state(),unsettledBefore,'failed wage reaction cannot consume tag or close shift');
for(const mutate of [
 (d:GameplayDefinition)=>{d.commands['shift.accept'].actions.push({flag:'unknown',value:true});},
 (d:GameplayDefinition)=>{d.commands['shift.accept'].sources=[];},
 (d:GameplayDefinition)=>{d.conversations.supervisor.nodes.offer.choices![0].next='missing';},
 (d:GameplayDefinition)=>{d.conversations.supervisor.nodes.offer.choices![0].command='shift.credit-wages';},
 (d:GameplayDefinition)=>{d.version=2 as 1;},
 (d:GameplayDefinition)=>{d.commands['shift.accept'].actions.push({tokens:Infinity});},
]){const bad=structuredClone(SHIFT_GAMEPLAY) as GameplayDefinition;mutate(bad);assert.throws(()=>validateGameplay(bad));}
assert.throws(()=>validateGameplay(JSON.parse('{"__proto__":{}}')));
for(const p of[wired,ordinary,cut,reset])p.dispose();for(const s of[accepted,atomic,bounded,observed,live,resumed,lostTag,unsettled])s.gameplay.dispose();
assert.deepEqual(live.gameplay.dispatch('shift.checkout','interaction'),{ok:false,reason:'disposed'});
console.log('Shared gameplay: conversation choices, transactional reactions, permissions, bounded cycles, native signal timing, reset, legacy harbor/save parity and validation passed.');
