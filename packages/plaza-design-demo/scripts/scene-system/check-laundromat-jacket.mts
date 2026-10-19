/** Shared jacket transaction versus the immutable original native reward path. */
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {attachNativeGameplay} from '../../src/ssg/game/engine/gameplay/native-bindings';
import {laundromatScene} from '../../src/ssg/game/scenes/laundromat';
import {fixtureGameplayPort} from './model-gameplay-fixture.mts';
const frozen=path.resolve('../../.scene-system/all-game-baseline-2026-10-18/source');
const oldModel=await import(pathToFileURL(path.join(frozen,'engine/model.ts')).href),oldRules=await import(pathToFileURL(path.join(frozen,'scenes/laundromat/rules.ts')).href),oldData=JSON.parse(fs.readFileSync(path.join(frozen,'scenes/laundromat/devices.json'),'utf8'));
const scene=laundromatScene();let cases=0;
function run(current:boolean,washers:string[],jacket:boolean,passes:number,glove:boolean,signal:boolean,playerContext=true){
 let saved:any={flags:{unrelated:true},items:{soap:2,...(passes?{'maglev.pass':passes}:{})},tokens:4,player:{handle:'worker',jump:false,controlled:[],keyring:glove?['glove.right']:[]}};
 if(!playerContext)delete saved.player;
 const lines:unknown[]=[],receipts:string[]=[],snapshots:unknown[]=[];let giveCalls=0;
 const Model=current?SceneModel:oldModel.SceneModel,m=new Model({say:(line:any,from:any,receipt:any)=>{lines.push([structuredClone(line),from]);if(receipt)receipts.push(receipt.cueId);},open(){},changed(){},keyring:()=>saved.player?.keyring??[],give:(id:string)=>{giveCalls++;saved.player.keyring.push(id);},carry:(id:string,add=0)=>{const n=(saved.items[id]??0)+add;if(n)saved.items[id]=n;else delete saved.items[id];return n;},flag:(id:string)=>saved.flags[id]=true},current?scene.data:oldData,current?scene.rules:oldRules.LAUNDROMAT_RULES);
 m.setPaused(true);washers.forEach((value,i)=>m.set('w'+(i+1),value));m.set('jacket',jacket);
 let session:GameplaySession|undefined;
 if(current){session=new GameplaySession(scene.gameplay!,fixtureGameplayPort(scene.gameplay!,{read:()=>saved,write:s=>{saved=s;}},()=>m));attachNativeGameplay(m,session);}
 const before=structuredClone({state:m.state,items:saved.items,flags:saved.flags,player:saved.player});
 for(let i=0;i<3;i++){m.act('washer3','door','open',signal);snapshots.push(structuredClone({state:m.state,items:saved.items,flags:saved.flags,keyring:saved.player?.keyring,goals:[...m.goals],lines}));}
 if(current){assert.equal(giveCalls,0,'shared grants never call the mutating native give hook');assert.equal(saved.values.laundromat,m.state,'jacket state has the common root owner');}
 const result={snapshots,before,after:structuredClone({state:m.state,items:saved.items,flags:saved.flags,player:saved.player}),lines,receipts};session?.dispose();m.reset();m.setPaused(true);return result;
}
for(const a of ['idle','done'])for(const b of ['idle','done'])for(const c of ['idle','running','done'])for(const d of ['idle','done'])for(const jacket of [false,true])for(const passes of [0,1,3])for(const glove of [false,true])for(const signal of [false,true]){
 const input:[string[],boolean,number,boolean,boolean]=[[a,b,c,d],jacket,passes,glove,signal],actual=run(true,...input),expected=run(false,...input);
 assert.deepEqual(actual.snapshots,expected.snapshots,JSON.stringify(input));cases++;
 if(!jacket&&[a,b,c,d].every(v=>v==='done')){assert.equal(actual.receipts[0],actual.receipts[1],'one native action owns notice/grant/final cue');assert.equal(actual.after.player.keyring.filter((id:string)=>id==='glove.right').length,1);assert.equal(actual.after.items['maglev.pass'],passes||1);}
}
const refused=run(true,['done','done','done','done'],false,0,false,false,false);assert.deepEqual(refused.after,refused.before,'missing reward context rolls back jacket, pass and flag together');assert.equal(refused.lines.length,3,'each refused input has one refusal, no reward lines');
assert.equal('washer.take'in (scene.rules as any).effects,false);assert(!JSON.stringify(scene.data).includes('washer.take'));assert.equal(scene.data!.texts['jacket.take'],undefined);assert.equal(scene.data!.texts['jacket.pass'],undefined);
console.log('Laundromat jacket PASS: '+cases+' frozen/current door/queue/pass/glove/manual/signal histories; exact rewards/replies/order, repeated-input guard, no mutating grant callback, common owner and atomic missing-context refusal.');
