import {validateGameplay} from '../../src/ssg/game/engine/gameplay/validation';
import {validateNativeBindings} from '../../src/ssg/game/engine/gameplay/native-bindings';
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {SceneModel} from '../../src/ssg/game/engine/model';import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';import {attachNativeGameplay} from '../../src/ssg/game/engine/gameplay/native-bindings';import {fixtureGameplayPort} from './model-gameplay-fixture.mts';import {laundromatScene} from '../../src/ssg/game/scenes/laundromat';
const frozen=path.resolve('../../.scene-system/all-game-baseline-2026-10-18/source'),oldModule=await import(pathToFileURL(path.join(frozen,'engine/model.ts')).href),oldRules=await import(pathToFileURL(path.join(frozen,'scenes/laundromat/rules.ts')).href),oldData=JSON.parse(fs.readFileSync(path.join(frozen,'scenes/laundromat/devices.json'),'utf8')),scene=laundromatScene();
const descriptor=Object.getOwnPropertyDescriptor(performance,'now'),timers={setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};let now=10000,serial=0;const scheduled=new Map<number,{at:number;run:()=>void}>();Object.defineProperty(performance,'now',{configurable:true,value:()=>now});(globalThis as any).setTimeout=(run:()=>void,delay=0)=>{const id=++serial;scheduled.set(id,{at:now+Number(delay),run});return id;};(globalThis as any).clearTimeout=(id:number)=>scheduled.delete(id);
function exercise(shared:boolean,setup:Record<string,any>,steps:(f:any)=>void,duration=5000){
 now=10000;scheduled.clear();const events:any[]=[],lines:any[]=[],data=structuredClone(shared?scene.data!:oldData);data.tuning.cycleMs=duration;const Model=shared?SceneModel:oldModule.SceneModel,m=new Model({say:(l:any,from:any)=>lines.push({at:now-10000,line:l,from}),open(){},changed(){}},data,shared?scene.rules:oldRules.LAUNDROMAT_RULES);let state:any={flags:{},items:{},tokens:0};const session=shared?new GameplaySession(scene.gameplay!,fixtureGameplayPort(scene.gameplay!,{read:()=>state,write:s=>{state=s;}},()=>m)):undefined;if(session)attachNativeGameplay(m,session);
 const emit=m.emit.bind(m);m.emit=(event:string)=>{events.push({at:now-10000,event});emit(event);};for(const[k,v]of Object.entries(setup))m.set(k,v);
 const frames:any[]=[];const capture=(label:string)=>{const scratch=Object.fromEntries(Object.entries(m.scratch).filter(([key])=>!key.startsWith('run.')));frames.push({label,state:structuredClone(m.state),scratch:structuredClone(scratch),goals:[...m.goals],lines:structuredClone(lines),events:structuredClone(events)});};
 function advance(ms:number){const target=now+ms;let budget=0;for(;;){const next=[...scheduled.entries()].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!next)break;if(++budget>1000)throw Error('Timer budget');now=next[1].at;scheduled.delete(next[0]);next[1].run();}now=target;}
 const f={m,session,state:()=>state,act:(dev:string,verb:string,signal=true)=>m.act(dev,'drum',verb,signal),advance,capture,live:(dt:number,live=true)=>m.tick(dt,live)};
 try{steps(f);return frames;}finally{session?.dispose();m.reset();m.setPaused(true);scheduled.clear();}
}
try{
 let cases=0;for(const w1 of['idle','running','done'])for(const w2 of['idle','running','done'])for(const w3 of['idle','running','done'])for(const w4 of['idle','running','done'])for(const breaker of['on','tripped'])for(const signal of[false,true])for(const dev of['washer1','washer2','washer3','washer4'])for(const verb of['start','stop']){
  const setup={w1,w2,w3,w4,breaker,jacket:false},steps=(f:any)=>{f.act(dev,verb,signal);f.capture('action');};assert.deepEqual(exercise(true,setup,steps),exercise(false,setup,steps),JSON.stringify({setup,signal,dev,verb}));cases++;
 }
 let timelines=0;const check=(name:string,setup:Record<string,any>,steps:(f:any)=>void,duration=5000)=>{assert.deepEqual(exercise(true,setup,steps,duration),exercise(false,setup,steps,duration),name);timelines++;};
 for(const dev of['washer1','washer2','washer3','washer4'])for(const duration of[37,37.5,5000])check('normal completion '+dev+' '+duration,{w1:'idle',w2:'idle',w3:'idle',w4:'idle',breaker:'on'},f=>{f.act(dev,'start');f.capture('start');f.advance(duration-1);f.capture('before');f.advance(1);f.capture('complete');f.advance(150);f.capture('cables');},duration);
 for(const dev of['washer1','washer2','washer3','washer4'])check('stop/restart '+dev,{breaker:'on'},f=>{f.act(dev,'start');f.advance(100);f.act(dev,'stop');f.capture('stopped');f.advance(100);f.act(dev,'start');f.capture('restarted');f.advance(4800);f.capture('old deadline');f.advance(200);f.capture('new deadline');});
 for(const dev of['washer1','washer2','washer3','washer4'])for(const jacket of[false,true])check('queue clear '+dev+' '+jacket,{w1:'done',w2:'done',w3:'done',w4:'done',breaker:'on',jacket},f=>{f.m.set('w'+dev.slice(-1),'idle');f.act(dev,'start');f.advance(5000);f.capture('completed');});
 // Prior cycles are allowed to finish inside the 150ms trip-wire latency. New overloaded cycle never arms.
 check('trip latency preserves earlier completion',{breaker:'on'},f=>{f.act('washer1','start');f.advance(4990);f.act('washer2','start');f.act('washer3','start');f.capture('overload');f.advance(10);f.capture('first completes while tripped');f.advance(140);f.capture('conduits stop running');f.advance(5000);f.capture('no phantom overloaded completion');});
 check('pause/resume and hidden scene deadline',{breaker:'on'},f=>{f.act('washer3','start');f.advance(1000);f.m.setPaused(true);f.advance(9000);f.capture('paused');f.m.setPaused(false);f.advance(3999);f.live(3999,false);f.capture('hidden before');f.advance(1);f.capture('hidden complete');});
 for(const transition of['reset','restore'])check(transition+' cancels pending deadline',{breaker:'on'},f=>{f.act('washer3','start');f.advance(100);if(transition==='reset')f.m.reset();else f.m.restore(f.m.snapshot());f.capture(transition);f.advance(10000);f.capture('after canceled deadline');});
 // Disposal is an explicit session lifecycle policy: outstanding named SceneTime jobs are cancelled.
 exercise(true,{breaker:'on'},f=>{f.act('washer3','start');assert(f.m.time.inspect().pending.some((p:any)=>p.detail.kind==='gameplayDeadline'));f.session.dispose();assert(!f.m.time.inspect().pending.some((p:any)=>p.detail.kind==='gameplayDeadline'));f.advance(5000);assert.equal(f.m.get('w3'),'running');});
 const source=JSON.parse(fs.readFileSync('src/ssg/game/scenes/laundromat/gameplay.json','utf8'));
 for(const mutate of[
  (g:any)=>{g.native.deadlines['laundromat.washer1'].startOn=['missing'];},
  (g:any)=>{g.native.deadlines['laundromat.washer1'].cancelOn=['missing'];},
  (g:any)=>{g.native.deadlines['laundromat.washer1'].due=[];},
  (g:any)=>{g.native.deadlines['laundromat.washer1'].due[0].command='laundromat.washer1.begin';},
  (g:any)=>{g.native.deadlines['laundromat.washer1'].startedAt='tripped';},
  (g:any)=>{g.native.deadlines['laundromat.washer1'].duration.tuning='missing';},
  (g:any)=>{g.native.replies['laundromat.washer1.complete'].cases.at(-1).when={tokensAtLeast:0};},
  (g:any)=>{g.native.replies['laundromat.washer1.complete'].cases[0].from='missing';},
 ]){const invalid=structuredClone(source);mutate(invalid);assert.throws(()=>validateNativeBindings(validateGameplay(invalid),scene.data!));}
 assert.deepEqual(Object.keys((scene.rules as any).effects),[],'replaced ordinary bodies deleted, including the later shared jacket reward');
 console.log(`Laundromat deadlines PASS: ${cases} immutable manual/signal start/stop cases and ${timelines} exact reply/event/timing timelines, trip latency, queue clearance, fractional durations, stop/restart, pause/offscreen, reset/restore and disposal.`);
}finally{Object.assign(globalThis,timers);if(descriptor)Object.defineProperty(performance,'now',descriptor);else delete(performance as any).now;}
