import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {mergeValues} from '../../src/ssg/game/engine/gameplay/state';
import {matches,validateGameplay} from '../../src/ssg/game/engine/gameplay/validation';
import {renderGameplayText} from '../../src/ssg/game/engine/gameplay/text-template';
import {nativeGameplayPort,attachNativeGameplay,validateNativeBindings} from '../../src/ssg/game/engine/gameplay/native-bindings';
import {projectSceneState} from '../../src/ssg/game/engine/gameplay/scene-state';
import {laundromatScene} from '../../src/ssg/game/scenes/laundromat';
import type {GameplayDefinition,GameplayState} from '../../src/ssg/game/engine/gameplay/types';
const frozen=path.resolve('../../.scene-system/all-game-baseline-2026-10-18/source'),oldModel=await import(pathToFileURL(path.join(frozen,'engine/model.ts')).href),oldRules=await import(pathToFileURL(path.join(frozen,'scenes/laundromat/rules.ts')).href),oldData=JSON.parse(fs.readFileSync(path.join(frozen,'scenes/laundromat/devices.json'),'utf8'));
const scene=laundromatScene(),shipping=JSON.parse(fs.readFileSync('src/ssg/game/scenes/laundromat/gameplay.json','utf8')) as GameplayDefinition;
function fixture(definition=shipping,data=structuredClone(scene.data!)){
 const block:Record<string,any>={},lines:any[]=[];let state:GameplayState={flags:{},items:{},tokens:0,values:{laundromat:block}};
 const model=new SceneModel({say:(line,from)=>{lines.push([line,from]);},open(){},changed(){}},data,scene.rules as any,undefined,undefined,undefined,block);model.setPaused(true);
 const session=new GameplaySession(definition,nativeGameplayPort(definition,{read:()=>state,write:next=>{mergeValues(state.values!,next.values!);state={...next,values:state.values};}},()=>model));attachNativeGameplay(model,session);
 return{model,session,lines,state:()=>state,dispose(){session.dispose();model.reset();model.setPaused(true);}};
}
const f=fixture(),old=new oldModel.SceneModel({say(){},open(){},changed(){}},oldData,oldRules.LAUNDROMAT_RULES);old.setPaused(true);let cases=0;
try{
 for(const w1 of['idle','running','done'])for(const w2 of['idle','running','done'])for(const w3 of['idle','running','done'])for(const w4 of['idle','running','done'])for(const jacket of[false,true]){
  for(const [key,value]of Object.entries({w1,w2,w3,w4,jacket})){f.model.set(key,value);old.set(key,value);}
  for(const id of['running','waiting','door3'])assert.equal(f.model.value('laundromat.'+id),old.value(id),JSON.stringify({w1,w2,w3,w4,jacket,id}));cases++;
 }
 for(const milliseconds of[1,499,500,999,1499,1500,4999.5,5000,5000.5,999999]){f.model.data.tuning.cycleMs=milliseconds;assert.equal(f.session.query('laundromat.cycleSeconds'),Math.round(milliseconds/1000));}
 for(let i=1;i<=4;i++)assert.equal(f.session.query('laundromat.name.washer'+i),old.label('name.washer'+i));
 f.model.texts['name.washer2']='EDITED WASHER';assert.equal(f.session.query('laundromat.name.washer2'),'EDITED WASHER');
 assert.throws(()=>f.model.set('laundromat.running',99),/read-only/);assert(!('laundromat.running'in f.model.state));
 assert.equal((scene.rules as any).derived,undefined,'ordinary derived callbacks deleted');
 assert(!JSON.stringify(f.state().values).includes('laundromat.running'),'queries are never stored');
 // No supplied read context means unknown, even under not; missing context never grants a permission.
 assert.equal(matches({not:{compare:{left:{query:'laundromat.running'},op:'gt',right:{literal:0}}}},f.session.state()),false);
}finally{f.dispose();old.reset();old.setPaused(true);}
const modified=structuredClone(shipping);modified.events.push('review.start');modified.commands['review.start']={sources:['interaction'],actions:[{state:'laundromat.w3',set:'running'},{emit:'review.start'}]};modified.commands['review.trip']={sources:['system'],when:{compare:{left:{query:'laundromat.running'},op:'gt',right:{query:'laundromat.maxRunning'}}},actions:[{state:'laundromat.breaker',set:'tripped'}]};modified.reactions.push({event:'review.start',command:'review.trip'});modified.native!.replies!['review.start']={from:'breaker',say:['review','{query:laundromat.running} running / {query:laundromat.cycleSeconds}s','dim'],template:true};
const draft=fixture(modified);try{draft.model.set('w1','running');draft.model.set('w2','running');assert(draft.session.dispatch('review.start','interaction').ok,'query in reaction sees earlier draft write');assert.equal(draft.model.get('breaker'),'tripped');assert.deepEqual(draft.lines.at(-1),[['review','3 running / 5s','dim'],'breaker']);assert.equal(renderGameplayText(['{query:laundromat.door3}'],draft.session.state(),{},draft.session.queryContext())[0],'locked');const queryHook=draft.model.gameplayQuery;draft.session.dispose();assert(queryHook);assert.equal(draft.model.gameplayQuery,undefined);assert.equal(draft.model.gameplayQueryIds,undefined);assert.equal(draft.session.readContext,undefined);}finally{draft.dispose();}
for(const mutate of[
 (g:GameplayDefinition)=>{g.queries!['laundromat.running']={kind:'select',cases:[{value:{query:'missing'}}]};},
 (g:GameplayDefinition)=>{g.queries!['laundromat.running']={kind:'select',cases:[{value:{query:'laundromat.waiting'}}]};g.queries!['laundromat.waiting']={kind:'select',cases:[{value:{query:'laundromat.running'}}]};},
 (g:GameplayDefinition)=>{g.queries!['review.self']={kind:'select',cases:[{when:{compare:{left:{query:'review.self'},op:'eq',right:{literal:0}}},value:{literal:1}},{value:{literal:0}}]};},
 (g:GameplayDefinition)=>{g.queries!['review.invalid']={kind:'duration',unit:'seconds',round:'nearest',value:{literal:'oops'}};},
 (g:GameplayDefinition)=>{g.queries!['review.invalid']={kind:'count',conditions:[]};},
 (g:GameplayDefinition)=>{g.commands['review.invalid']={sources:['system'],when:{compare:{left:{literal:'a'},op:'gt',right:{literal:'b'}}},actions:[]};},
]){const g=structuredClone(shipping);mutate(g);assert.throws(()=>validateGameplay(g));}
for(const kind of['label','tuning']as const){const g=structuredClone(shipping);g.queries!['review.invalid']={kind,key:'missing'};const data=projectSceneState(structuredClone(scene.data!),g);assert.throws(()=>validateNativeBindings(validateGameplay(g),data),/reference/);const model=new SceneModel({say(){},open(){},changed(){}},data,scene.rules as any);model.setPaused(true);const session=new GameplaySession(g,{read:()=>({flags:{},items:{},tokens:0}),write(){}});assert.throws(()=>attachNativeGameplay(model,session),/reference/);assert.equal(model.gameplayQuery,undefined,'invalid attachment must not install any hook');assert.equal(model.gameplayTick,undefined);assert.equal(model.gameplayCommand,undefined);assert.equal(session.readContext,undefined);session.dispose();model.reset();model.setPaused(true);}
console.log(`Laundromat queries PASS: ${cases} immutable washer/jacket combinations, editable labels/tuning, exact rounded seconds, transactional reaction/reply reads, readonly/no saved owner, invalid graph/context/source rejection, clean disposal and failed attachment.`);
