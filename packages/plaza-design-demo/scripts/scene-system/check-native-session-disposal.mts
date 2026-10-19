import assert from 'node:assert/strict';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {emptyData} from '../../src/ssg/game/engine/empty-data';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {attachNativeGameplay,nativeGameplayPort} from '../../src/ssg/game/engine/gameplay/native-bindings';
import {mergeValues} from '../../src/ssg/game/engine/gameplay/state';
import type {GameplayDefinition,GameplayState} from '../../src/ssg/game/engine/gameplay/types';

// A disposed session must release model entrypoints, not leave a closed session's
// route claiming the next interaction. Reuse the real model across replacements.
const definition:GameplayDefinition={version:1,flags:[],items:[],events:[],
 state:{'cleanup.count':{owner:'cleanup',lifetime:'save',type:'number',default:0,min:0,max:100}},
 commands:{increment:{sources:['interaction','signal'],actions:[{state:'cleanup.count',add:1}]}},
 reactions:[],conversations:{},native:{verbs:[{device:'machine',noun:'button',verb:'push',cases:[{command:'increment',say:['push','ACK','ok']}]}],events:{},goals:{}}};
const lines:string[]=[],data={...emptyData('cleanup','Cleanup'),state:{count:0},devices:[{id:'machine',name:'Machine',look:'',nouns:[{id:'button',kind:'ACT' as const,verbs:['push']}]}]};
const model=new SceneModel({say:line=>lines.push(line[1]),changed(){},open(){}},data,{effects:{}});
let state:GameplayState={flags:{},items:{},tokens:0,values:{cleanup:model.state}};
const port={read:()=>state,write:(next:GameplayState)=>{mergeValues(state.values!,next.values??{});state={...next,values:state.values};}};
for(let cycle=0;cycle<20;cycle++){
 const session=new GameplaySession(definition,nativeGameplayPort(definition,port,()=>model));
 const previousAuthorize=()=>({ok:true as const});session.authorize=previousAuthorize;
 attachNativeGameplay(model,session);
 assert.equal(model.eligibility('machine','button','push').ok,true);
 model.act('machine','button','push',cycle%2===1);
 assert.equal(model.get('count'),cycle+1);assert.equal(lines.length,cycle+1);
 session.dispose();session.dispose();
 for(const key of ['gameplay','gameplayEligibility','gameplayStep','gameplayCommand','gameplayInput','gameplayQuery','gameplayQueryIds','gameplayTick'] as const)assert.equal(model[key],undefined,key+' released');
 assert.equal(session.readContext,undefined);assert.equal(session.authorize,previousAuthorize);
 assert.deepEqual(session.dispatch('increment','interaction'),{ok:false,reason:'disposed'});
 assert.deepEqual(session.events(),[]);
 assert.equal(model.get('count'),cycle+1);assert.equal(lines.length,cycle+1);
}
model.reset();model.setPaused(true);
console.log('Native session disposal PASS: 20 actual model/session replacements, manual/signal state and replies, all owned entrypoints released, prior authorization restored, idempotent disposal and no closed-session writes.');
