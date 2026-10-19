import assert from 'node:assert/strict';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {attachGameplayHandoffs} from '../../src/ssg/game/engine/gameplay/handoffs';
import {validateGameplay} from '../../src/ssg/game/engine/gameplay/validation';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {SceneTime} from '../../src/ssg/game/engine/time';
import type {GameplayState} from '../../src/ssg/game/engine/gameplay/types';
const def=validateGameplay({version:1,flags:[],items:[],events:['finished'],commands:{finish:{sources:['conversation'],when:{state:'test.done',is:false},actions:[{state:'test.done',set:true},{emit:'finished'}]},depart:{sources:['system'],actions:[{state:'test.departed',set:true}]}},state:{'test.done':{owner:'test',type:'boolean',lifetime:'save',default:false},'test.departed':{owner:'test',type:'boolean',lifetime:'save',default:false}},reactions:[],conversations:{},handoffs:[{event:'finished',cutscene:'act2',after:[{ms:1500,command:'depart'}]}]});
const original={performance:globalThis.performance,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};let now=0,id=0;const timers=new Map<number,{at:number;run:()=>void}>();
Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>now}});globalThis.setTimeout=((run:()=>void,ms:number)=>{const serial=++id;timers.set(serial,{at:now+ms,run});return serial;}) as any;globalThis.clearTimeout=((id:number)=>{timers.delete(id);}) as any;
try{
 const clock=new SceneTime();let state:GameplayState={flags:{},items:{},tokens:0},refuse=false;const cuts:string[]=[],session=new GameplaySession(def,{read:()=>state,write:s=>{if(refuse)throw new Error('Failed source commit');state=s;}});
 attachGameplayHandoffs(session,{schedule:(ms,run,canceled,detail)=>clock.later(ms,run,detail,canceled),cutscene:id=>cuts.push(id)});
 const advance=(ms:number)=>{const end=now+ms;for(;;){const next=[...timers.entries()].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;now=next[1].at;timers.delete(next[0]);next[1].run();}now=end;};
 assert(session.eligibility('finish','conversation').ok);assert.equal(timers.size,0);assert.deepEqual(cuts,[]);refuse=true;assert(!session.dispatch('finish','conversation').ok);assert.equal(timers.size,0);refuse=false;assert(session.dispatch('finish','conversation').ok);assert.deepEqual(cuts,['act2']);assert.equal(timers.size,1);assert(!session.dispatch('finish','conversation').ok);assert.equal(timers.size,1);advance(1499);assert.equal(state.values!['test.departed'],false);clock.pause(true);advance(9000);assert.equal(state.values!['test.departed'],false);clock.pause(false);advance(1);assert.equal(state.values!['test.departed'],true);
 for(let i=0;i<100;i++){state={flags:{},items:{},tokens:0};assert(session.dispatch('finish','conversation').ok);assert.equal(timers.size,1);clock.clear();assert.equal(timers.size,0);advance(1600);assert.equal(state.values!['test.departed'],false);}
 state={flags:{},items:{},tokens:0};assert(session.dispatch('finish','conversation').ok);session.dispose();assert.equal(timers.size,0);advance(1500);assert.equal(state.values!['test.departed'],false);session.dispose();clock.clear();
 // Exercise the actual SceneModel cancellation owner, including restore and reset reuse.
 const model=new SceneModel({say:()=>{},changed:()=>{},open:()=>{}},{id:'fixture',name:'Fixture',state:{},tuning:{},devices:[],cables:[],dialogue:{},goals:[],texts:{}},{effects:{}});model.setPaused(true);
 let nativeState:GameplayState={flags:{},items:{},tokens:0};const nativeSession=new GameplaySession(def,{read:()=>nativeState,write:s=>{nativeState=s;}});
 attachGameplayHandoffs(nativeSession,{schedule:(ms,run,canceled,detail)=>model.later(ms,run,detail,canceled),cutscene:()=>{}});
 for(let i=0;i<100;i++){nativeState={flags:{},items:{},tokens:0};assert(nativeSession.dispatch('finish','conversation').ok);if(i%2)model.restore(model.snapshot());else model.reset();model.setPaused(true);advance(2000);assert.equal(nativeState.values!['test.departed'],false);}
 nativeSession.dispose();model.reset();model.setPaused(true);assert.equal(timers.size,0);
 for(const mutate of [(d:any)=>{d.handoffs[0].cutscene='absent';},(d:any)=>{d.handoffs[0].after[0].command='finish';},(d:any)=>{d.handoffs[0].after[0].ms=0;},(d:any)=>{d.handoffs.push(d.handoffs[0]);},(d:any)=>{d.handoffs[0].after=[];}]){const bad=structuredClone(def);mutate(bad);assert.throws(()=>validateGameplay(bad));}
 console.log('Shared handoffs PASS: real SceneTime 1499/1500ms boundary, pause/resume, read-only eligibility, failed commit isolation, repeat guard, 100 clock-clear/reuse cycles, disposal cancellation and strict event/command/cinematic/delay references.');
}finally{Object.defineProperty(globalThis,'performance',{configurable:true,value:original.performance});globalThis.setTimeout=original.setTimeout;globalThis.clearTimeout=original.clearTimeout;}
