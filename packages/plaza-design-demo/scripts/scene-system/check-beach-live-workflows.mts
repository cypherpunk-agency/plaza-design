/** Immutable behavior specification for the ordinary Beach workflow migration. */
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {SceneModel} from '../../src/ssg/game/engine/model';import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';import {attachNativeGameplay,nativeStatePort} from '../../src/ssg/game/engine/gameplay/native-bindings';import {beachScene} from '../../src/ssg/game/scenes/beach';
const frozen=path.resolve('../../.scene-system/all-game-baseline-2026-10-18/source'),originalModel=await import(pathToFileURL(path.join(frozen,'engine/model.ts')).href),originalRules=await import(pathToFileURL(path.join(frozen,'scenes/beach/rules.ts')).href),originalData=JSON.parse(fs.readFileSync(path.join(frozen,'scenes/beach/devices.json'),'utf8'));
const scene=beachScene(),gameplay=scene.gameplay!,rules=scene.rules as any;
const globals={setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout},nowDescriptor=Object.getOwnPropertyDescriptor(performance,'now');let now=10000,next=0;const pending=new Map<number,()=>void>();
(globalThis as any).setTimeout=(fn:()=>void)=>{const id=++next;pending.set(id,fn);return id;};(globalThis as any).clearTimeout=(id:number)=>pending.delete(id);Object.defineProperty(performance,'now',{configurable:true,value:()=>now});
interface Input{tokens:number;rented:boolean;billing:string;flag:string;elapsed?:number;short:boolean;signal:boolean}
function run(shared:boolean,input:Input){
 now=10000;pending.clear();let saved:any={flags:{},items:{},tokens:input.tokens},session:GameplaySession|undefined;const lines:unknown[]=[],checkpoints:unknown[]=[],Model=shared?SceneModel:originalModel.SceneModel,data=structuredClone(shared?scene.data:originalData);
 if(input.short){data.tuning.minuteMs=750;data.tuning.dangerMs=600;}
 const m=new Model({say:(line:unknown,from:unknown)=>lines.push([line,from]),open(){},changed(){},tokens:(n:number)=>saved.tokens+=n},data,shared?rules:originalRules.BEACH_RULES);
 m.set('rented',input.rented);m.set('billing',input.billing);m.set('flag',input.flag);m.set('billed',1000001);
 if(input.elapsed!==undefined){m.scratch.minute=input.elapsed;m.scratch.danger=input.elapsed;}
 if(shared){session=new GameplaySession(gameplay,nativeStatePort(gameplay,{read:()=>saved,write:s=>{saved=s;}},()=>m));attachNativeGameplay(m,session);}
 const capture=(label:string)=>{checkpoints.push({label,state:m.snapshot(),scratch:structuredClone(m.scratch),tokens:saved.tokens,lines:structuredClone(lines)});};
 const act=(device:string,noun:string,verb:string)=>{m.act(device,noun,verb,input.signal);capture(device+'.'+noun+':'+verb);};
 const tick=(dt:number,live=true)=>{now+=dt;m.tick(dt,live);capture('tick '+dt+' '+live);};
 const minute=data.tuning.minuteMs,danger=data.tuning.dangerMs;
 capture('initial');act('kiosk','rent','rent');act('kiosk','rent','rent');tick(minute-1);
 act('kiosk','meter','pause');tick(minute*3+19);act('kiosk','meter','run');tick(1);
 // Hidden scene updates continue native clocks but never charge or clear danger.
 tick(minute*2,false);act('kiosk','rent','end');tick(17);act('kiosk','rent','rent');
 // Actual paused host does not call the live update. Native time pauses too.
 const before=structuredClone(m.scratch);m.setPaused(true);now+=12345;assert.deepEqual(m.scratch,before);m.setPaused(false);capture('pause/resume');
 act('drone','flag','danger');tick(minute*5+31); // only one charge, overshoot discarded
 act('drone','flag','clear');tick(1);act('drone','flag','danger');tick(danger-1);tick(1);
 // A restored scene starts with no elapsed scratch, while rental/counter state stays saved.
 const snapshot=m.snapshot();m.restore(snapshot);capture('reload');tick(1);tick(minute-1);
 if(shared){for(const id of Object.keys(gameplay.native!.state))assert(!Object.prototype.hasOwnProperty.call(saved.values??{},id),'native state must have one saved owner');session!.dispose();const state=structuredClone(m.state),scratch=structuredClone(m.scratch),count=lines.length;m.tick(minute*3,true);assert.deepEqual(m.state,state,'disposed workflow must not change ordinary state');assert.deepEqual(m.scratch,scratch,'disposed workflow cannot advance elapsed time');assert.equal(lines.length,count);}
 m.reset();pending.clear();return checkpoints;
}
try{
 let cases=0;for(const tokens of [0,1,2,8])for(const rented of [false,true])for(const billing of ['run','pause'])for(const flag of ['clear','danger'])for(const elapsed of [undefined,0,59999,60050])for(const short of [false,true])for(const signal of [false,true]){const input={tokens,rented,billing,flag,elapsed,short,signal};assert.deepEqual(run(true,input),run(false,input),JSON.stringify(input));cases++;}
 assert.deepEqual(Object.keys(rules.effects),[],'ordinary effect bodies must be deleted');assert.equal(rules.tick,undefined,'ordinary Beach tick must be deleted');
 // Independent workflows in one live tick retain separate causal feedback identities.
 const receipts:any[]=[],data=structuredClone(scene.data!);data.tuning.minuteMs=1;data.tuning.dangerMs=1;const m=new SceneModel({say:(line,from,receipt)=>receipts.push({line,from,receipt}),open(){},changed(){}},data,rules);m.set('rented',true);m.set('flag','danger');let state:any={flags:{},items:{},tokens:3};const session=new GameplaySession(gameplay,nativeStatePort(gameplay,{read:()=>state,write:s=>{state=s;}},()=>m));attachNativeGameplay(m,session);m.tick(1,true);assert.equal(receipts.length,2);assert.deepEqual(receipts.map(r=>r.from),['kiosk','drone']);assert.notEqual(receipts[0].receipt.id,receipts[1].receipt.id);assert.notEqual(receipts[0].receipt.cueId,receipts[1].receipt.cueId);assert.deepEqual(m.inspect().time.pending,[],'live intervals do not create wall timers');session.dispose();m.reset();pending.clear();
 console.log(`Beach live workflows PASS: ${cases} immutable model/session comparisons covering manual/signal repeat/refusal, exact replies/order, billing hold, danger reset, dropped overshoot/one-fire, simultaneous due rows, live/offscreen, pause/reentry/reload, scratch/save ownership and disposal.`);
}finally{Object.assign(globalThis,globals);if(nowDescriptor)Object.defineProperty(performance,'now',nowDescriptor);else delete(performance as any).now;}
