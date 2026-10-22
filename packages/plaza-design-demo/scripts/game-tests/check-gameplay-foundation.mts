/** Focused acceptance of the shared-gameplay pilot, not a campaign playthrough. */
import assert from 'node:assert/strict';
import { GameplaySession,cloneState } from '../../src/ssg/game/engine/gameplay/session';
import { ConversationSession } from '../../src/ssg/game/engine/gameplay/conversation';
import { validateGameplay } from '../../src/ssg/game/engine/gameplay/validation';
import {createDeliveryGameplayFixture,DELIVERY_GAMEPLAY} from './delivery-gameplay-fixture.mts';
const SHIFT_GAMEPLAY=DELIVERY_GAMEPLAY;
const SHIFT={delivered:'delivery:delivered',parked:'delivery:parked'};
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
assert.equal(accepted.writes(),1,'assignment and its reward commit once');assert.equal(accepted.state().items['delivery.tag'],1);
assert.deepEqual(accepted.gameplay.events().map(e=>e.id),['assignment.accepted','work-tag.issued']);
assert.equal(start.choose('accept').ok,false);assert.equal(accepted.state().items['delivery.tag'],1);
assert.equal(accepted.gameplay.dispatch('delivery.credit-wages','signal').ok,false);assert.equal(accepted.state().tokens,0);
assert.equal(accepted.gameplay.dispatch('constructor','interaction').ok,false);
// Resource failure after an earlier staged mutation must roll the whole command back.
const broken=structuredClone(SHIFT_GAMEPLAY) as GameplayDefinition;
broken.commands['delivery.collect'].actions=[{flag:'delivery:parcel',value:true},{emit:'parcel.collected'},{item:'delivery.parcel',add:-1}];
const atomic=session(broken,accepted.state());const before=atomic.state();
assert.deepEqual(atomic.gameplay.dispatch('delivery.collect','interaction'),{ok:false,reason:'resources'});
assert.deepEqual(atomic.state(),before);assert.equal(atomic.writes(),0);assert.equal(atomic.gameplay.events().length,0);
// The same rollback applies to failing authored reactions and cyclic event chains.
const cyclic=structuredClone(SHIFT_GAMEPLAY) as GameplayDefinition;
cyclic.commands['delivery.issue-tag'].actions.push({emit:'assignment.accepted'});
const bounded=session(cyclic);assert.deepEqual(bounded.gameplay.dispatch('delivery.accept','conversation'),{ok:false,reason:'budget'});
assert.deepEqual(bounded.state(),fresh());assert.equal(bounded.writes(),0);
const observed=session();let sawCommitted=false;
observed.gameplay.observe(()=>{sawCommitted=observed.state().items['delivery.tag']===1;assert.deepEqual(observed.gameplay.dispatch('delivery.accept','conversation'),{ok:false,reason:'busy'});throw new Error('diagnostic failure');});
assert.equal(observed.gameplay.dispatch('delivery.accept','conversation').ok,true);assert.equal(sawCommitted,true);
// Real SceneModel emits and delivers the cable, retaining its 150 ms native delay.
function ready(){const p=createDeliveryGameplayFixture();p.talk('supervisor').choose('accept');p.gameplay.dispatch('delivery.collect','interaction');return p;}
const wired=ready();wired.model.act('scanner','parcel','scan');wired.advance(149);assert.equal(wired.gameplay.state().flags[SHIFT.delivered],undefined);
wired.advance(1);assert.equal(wired.gameplay.state().flags[SHIFT.delivered],true);assert.equal(wired.gameplay.state().items['delivery.parcel'],undefined);
assert.equal(wired.gameplay.events().find(e=>e.id==='parcel.transferred')!.source,'signal');
assert.equal(wired.gameplay.events().find(e=>e.id==='delivery.completed')!.source,'system');
wired.model.act('scanner','parcel','scan');wired.advance(150);assert.equal(wired.gameplay.events().filter(e=>e.id==='delivery.completed').length,1);
const ordinary=ready();assert.equal(ordinary.gameplay.dispatch('delivery.deliver','interaction').ok,true);assert.deepEqual(ordinary.gameplay.state(),wired.gameplay.state());
const cut=ready();cut.model.cut(cut.model.links[0]);cut.model.act('scanner','parcel','scan');cut.advance(150);assert.equal(cut.gameplay.state().flags[SHIFT.delivered],undefined);
cut.model.connect('scanner.parcel:detected','terminal.delivery','deliver');cut.model.act('scanner','parcel','scan');cut.model.cut(cut.model.links[0]);cut.advance(150);assert.equal(cut.gameplay.state().flags[SHIFT.delivered],true,'cut preserves already-sent native signal');
const reset=ready();reset.model.act('scanner','parcel','scan');reset.reset();reset.advance(500);assert.deepEqual(reset.gameplay.state(),fresh());
const failedReaction=structuredClone(SHIFT_GAMEPLAY) as GameplayDefinition;
failedReaction.commands['delivery.credit-wages'].actions=[{tokens:-4}];
const unsettled=session(failedReaction,{flags:{[SHIFT.parked]:true},items:{'delivery.tag':1},tokens:0});
const unsettledBefore=unsettled.state();assert.deepEqual(unsettled.gameplay.dispatch('delivery.checkout','interaction'),{ok:false,reason:'resources'});assert.deepEqual(unsettled.state(),unsettledBefore,'failed wage reaction cannot consume tag or close shift');
for(const mutate of [
 (d:GameplayDefinition)=>{d.commands['delivery.accept'].actions.push({flag:'unknown',value:true});},
 (d:GameplayDefinition)=>{d.commands['delivery.accept'].sources=[];},
 (d:GameplayDefinition)=>{d.conversations.supervisor.nodes.offer.choices![0].next='missing';},
 (d:GameplayDefinition)=>{d.conversations.supervisor.nodes.offer.choices![0].command='delivery.credit-wages';},
 (d:GameplayDefinition)=>{d.version=2 as 1;},
 (d:GameplayDefinition)=>{d.commands['delivery.accept'].actions.push({tokens:Infinity});},
]){const bad=structuredClone(SHIFT_GAMEPLAY) as GameplayDefinition;mutate(bad);assert.throws(()=>validateGameplay(bad));}
assert.throws(()=>validateGameplay(JSON.parse('{"__proto__":{}}')));
for(const p of[wired,ordinary,cut,reset])p.dispose();for(const s of[accepted,atomic,bounded,observed,unsettled])s.gameplay.dispose();
assert.deepEqual(accepted.gameplay.dispatch('delivery.checkout','interaction'),{ok:false,reason:'disposed'});
console.log('Shared gameplay: conversation choices, transactional reactions, permissions, bounded cycles, native signal timing, reset, atomic wage failure and validation passed.');
