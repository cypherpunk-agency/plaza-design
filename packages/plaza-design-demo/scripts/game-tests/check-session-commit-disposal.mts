import assert from 'node:assert/strict';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {attachGameplayHandoffs} from '../../src/ssg/game/engine/gameplay/handoffs';
import type {GameplayDefinition,GameplayState} from '../../src/ssg/game/engine/gameplay/types';
const definition:GameplayDefinition={version:1,flags:[],items:[],events:['stop','late'],commands:{run:{sources:['interaction'],actions:[{tokens:1},{emit:'stop'},{emit:'late'}]}},reactions:[],conversations:{}};
const make=(d=definition,after=()=>{})=>{let state:GameplayState={flags:{},items:{},tokens:0,player:{handle:'',jump:false,keyring:[],controlled:[]}};const session=new GameplaySession(d,{read:()=>state,write:next=>{state=next;}},after,[],{controlled:new Set(['node'])});return{session,read:()=>state};};
for(let i=0;i<20;i++){
 const {session,read}=make();let called=0;session.observe(()=>session.dispose());session.observe(()=>called++);
 assert(session.dispatch('run','interaction').ok);assert.equal(read().tokens,1,'committed state is retained');assert.equal(called,0,'disposal cancels remaining observer notifications in this commit');assert.deepEqual(session.events(),[],'disposed history stays cleared');
}
{
 const {session}=make();let called=0,release=()=>{};session.observe(()=>release());release=session.observe(()=>called++);
 session.dispatch('run','interaction');assert.equal(called,0,'unsubscribe is effective before a later observer runs');session.dispose();
}
{
 const d=structuredClone(definition);d.commands.run.actions.push({grant:{controlled:'node'}});const {session,read}=make(d);let granted=0;session.observe(()=>session.dispose());session.observeGrants(()=>granted++);session.dispatch('run','interaction');assert.deepEqual(read().player!.controlled,['node']);assert.equal(granted,0,'committed grant does not notify a disposed presenter');
}
{
 let session:GameplaySession;const made=make(definition,()=>session.dispose());session=made.session;let called=0;session.observe(()=>called++);session.dispatch('run','interaction');assert.equal(called,0);assert.deepEqual(session.events(),[]);
}
{
 const d=structuredClone(definition);d.commands.run.actions.push({trace:{device:'machine',add:100}});const {session}=make(d);let committed=0,notified=0,refreshed=0;
 session.domain=()=>({reduce:()=>({ok:true}),context:()=>({cables:[]}),authorizeRoute:()=>({ok:true}),commit:()=>{committed++;},takeNotices:()=>[{kind:'kick',device:'machine',span:1000}],notify:()=>{notified++;},refresh:()=>{refreshed++;}});
 session.observe(()=>session.dispose());session.dispatch('run','interaction');assert.equal(committed,1,'atomic prepared canonical state still commits');assert.equal(notified,0);assert.equal(refreshed,0,'disposed host gets no stale refresh');
}
{
 const d=structuredClone(definition);d.commands.later={sources:['system'],actions:[]};d.handoffs=[{event:'stop',cutscene:'intro',after:[{ms:10,command:'later'}]}];
 const {session}=make(d);let scheduled=0;attachGameplayHandoffs(session,{cutscene:()=>session.dispose(),schedule:()=>{scheduled++;return()=>{};}});
 session.dispatch('run','interaction');assert.equal(scheduled,0,'a handoff disposed by its own takeover cannot schedule new delayed work');
}
console.log('Commit disposal PASS: 20 repeated synchronous disposal cases, immediate unsubscribe, grants/domain notifications, afterCommit disposal, committed state retained, no post-disposal handoff scheduling.');
