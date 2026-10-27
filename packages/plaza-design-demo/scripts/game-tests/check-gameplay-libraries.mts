import assert from 'node:assert/strict';
import {validateGameplay} from '../../src/ssg/game/engine/gameplay/validation';
import {mergeGameplayLibrary} from '../../src/ssg/game/engine/gameplay/libraries';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {ConversationSession} from '../../src/ssg/game/engine/gameplay/conversation';
import type {GameplayState} from '../../src/ssg/game/engine/gameplay/types';

const empty=validateGameplay({version:1,flags:[],items:[],events:[],commands:{},reactions:[],conversations:{}});
const library=validateGameplay({...empty,state:{'chatter.visits':{owner:'chatter',lifetime:'save',type:'number',default:0,min:0,max:100}},queries:{'chatter.turn':{kind:'remainder',value:{state:'chatter.visits'},divisor:2}},commands:{advance:{sources:['conversation'],actions:[{state:'chatter.visits',add:1}]}},conversations:{hello:{entry:[{when:{compare:{left:{query:'chatter.turn'},op:'eq',right:{literal:0}}},node:'first'},{node:'again'}],nodes:{first:{speaker:'CAT',pages:['Hello {state:chatter.visits}.'],template:true,onEnter:'advance'},again:{speaker:'CAT',pages:['Again.'],onEnter:'advance'}}}}});
const before=JSON.stringify(library),linked=mergeGameplayLibrary(empty,library);let state:GameplayState={flags:{},items:{},tokens:0};
const session=new GameplaySession(linked,{read:()=>state,write:next=>state=next});
assert.deepEqual(new ConversationSession(session,'hello').frame().pages,['Hello 1.']);assert.deepEqual(new ConversationSession(session,'hello').frame().pages,['Again.']);assert.deepEqual(new ConversationSession(session,'hello').frame().pages,['Hello 3.']);assert.equal(JSON.stringify(library),before,'Linking does not rewrite the shared source');
assert.throws(()=>mergeGameplayLibrary(linked,library),/identity collision/);
assert.throws(()=>mergeGameplayLibrary(empty,{...library,checkpoint:[]}),/scene-specific/);
const queryCollision=validateGameplay({...empty,queries:{'chatter.turn':{kind:'sceneTime'}}});assert.throws(()=>mergeGameplayLibrary(queryCollision,library),/identity collision/);
console.log('Gameplay libraries: shared queries/state/commands/templates run in the ordinary conversation session, immutable source and explicit collision guards PASS');
