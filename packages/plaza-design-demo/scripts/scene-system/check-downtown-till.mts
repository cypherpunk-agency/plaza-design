/** Source-owned till transaction against the immutable original scene. */
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {attachNativeGameplay} from '../../src/ssg/game/engine/gameplay/native-bindings';
import {downtownScene} from '../../src/ssg/game/scenes/downtown';
import {downtownRules} from '../../src/ssg/game/scenes/downtown/rules';
import {fixtureGameplayPort} from './model-gameplay-fixture.mts';
const frozen=path.resolve('../../.scene-system/all-game-baseline-2026-10-18/source');
const oldModel=await import(pathToFileURL(path.join(frozen,'engine/model.ts')).href),oldRules=await import(pathToFileURL(path.join(frozen,'scenes/downtown/rules.ts')).href),oldData=JSON.parse(fs.readFileSync(path.join(frozen,'scenes/downtown/devices.json'),'utf8'));
const scene=downtownScene();let cases=0;
function exercise(current:boolean,paid:boolean,handle:string,tokens:number,amount:number,signal:boolean,unlocked:boolean){
 let state:any={player:{handle,jump:false,controlled:[],keyring:[]},flags:{till:paid,unrelated:true},items:{soap:2},tokens};
 const player:any={save:()=>({...state,handle:state.player.handle,jump:false,controlled:[]}),persist(){},nodes:()=>0,granted(){},end(){}};
 // The original effects mutate the actual save object. Keep its top-level fields real.
 Object.assign(state,{handle,jump:false,controlled:[]});player.save=()=>state;
 const lines:any[]=[],data=structuredClone(current?scene.data:oldData);data.tuning.drawerTokens=amount;
 const Model=current?SceneModel:oldModel.SceneModel,m=new Model({say:(line:any,from:any)=>lines.push([structuredClone(line),from]),open(){},changed(){}},data,current?downtownRules(player):oldRules.downtownRules(player));m.setPaused(true);
 if(unlocked)m.passed.add('till.login');let session:GameplaySession|undefined;
 if(current){session=new GameplaySession(scene.gameplay!,fixtureGameplayPort(scene.gameplay!,{read:()=>state,write:s=>{state={...state,...s};}},()=>m));attachNativeGameplay(m,session);}
 const snapshots=[];for(let i=0;i<3;i++){m.act('till','drawer','open',signal);snapshots.push(structuredClone({tokens:state.tokens,items:state.items,flags:state.flags,goals:[...m.goals],lines}));}
 if(current)assert.equal(state.values.downtown,m.state);
 session?.dispose();m.reset();m.setPaused(true);return snapshots;
}
for(const paid of [false,true])for(const handle of ['', 'worker'])for(const tokens of [0,9])for(const amount of [0,1,5,23])for(const signal of [false,true])for(const unlocked of [false,true]){
 const args:[boolean,string,number,number,boolean,boolean]=[paid,handle,tokens,amount,signal,unlocked];assert.deepEqual(exercise(true,...args),exercise(false,...args),JSON.stringify(args));cases++;
}
assert(!('till.pay'in downtownRules({} as any).effects!));assert(!JSON.stringify(scene.data).includes('till.pay'));
console.log('Downtown till PASS: '+cases+' original/current guarded/manual/signal reward histories; tuning amounts, empty handles, repeated inputs, exact lines/goals/resource changes and common owner.');
