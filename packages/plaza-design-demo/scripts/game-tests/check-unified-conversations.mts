import assert from 'node:assert/strict';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {ConversationSession} from '../../src/ssg/game/engine/gameplay/conversation';
import {talkTo} from '../../src/ssg/game/runtime/characters';
import {FOLDER_SOURCES} from '../../src/ssg/game/scenes/folder-scenes';
import {sceneSourceDefinition} from '../../src/ssg/game/engine/gameplay/folder-scene';
const shopScene=()=>sceneSourceDefinition('shop',FOLDER_SOURCES.shop),libraryScene=()=>sceneSourceDefinition('library',FOLDER_SOURCES.library),laundromatScene=()=>sceneSourceDefinition('laundromat',FOLDER_SOURCES.laundromat);
import type {GameplayDefinition,GameplayState} from '../../src/ssg/game/engine/gameplay/types';
import {LIBRARY} from '../../src/ssg/game/data';
for(const scene of [shopScene(),libraryScene(),laundromatScene()]){
 let state:GameplayState={flags:{},items:{},tokens:13};const port={read:()=>state,write:(v:GameplayState)=>{state=v;}};let session=new GameplaySession(scene.gameplay!,port);
 for(const p of scene.people!.filter(p=>p.conversation)){const sets=p.talk as string[][];for(let i=0;i<sets.length+2;i++){assert.deepEqual(talkTo(p,session),{name:p.name,pages:sets[Math.min(i,sets.length-1)]});const before=structuredClone(state);state=JSON.parse(JSON.stringify(state));session.dispose();session=new GameplaySession(scene.gameplay!,port);assert.deepEqual(state,before);}assert.equal(state.tokens,13);assert.deepEqual(state.items,{});}
 session.dispose();
}
const library=libraryScene();let state:GameplayState={flags:{'library:renewed':false},items:{},tokens:0};const session=new GameplaySession(library.gameplay!,{read:()=>state,write:v=>{state=v;}});
let catalog=new ConversationSession(session,'catalog');const legacy=LIBRARY.dialogue.catalog;
assert.deepEqual(catalog.frame().pages,[(legacy.nodes.start as any[])[1].text]);const snapshot=structuredClone(state);catalog.frame();catalog.frame();catalog.close();assert.deepEqual(state,snapshot);
state.flags['library:renewed']=true;catalog=new ConversationSession(session,'catalog');assert.deepEqual(catalog.frame().pages,[(legacy.nodes.start as any[])[0].text]);assert(catalog.choose('choice-2').ok);assert.equal(catalog.frame().pages[0],(legacy.nodes.more as any).text);catalog.close();
const def:GameplayDefinition={version:1,flags:['accepted'],items:[],events:['paid'],commands:{accept:{sources:['conversation'],actions:[{flag:'accepted',value:true},{tokens:1},{emit:'paid'}]},fail:{sources:['conversation'],actions:[{tokens:-99}]}},reactions:[],conversations:{test:{entry:[{node:'offer'}],nodes:{offer:{speaker:'TEST',pages:['Offer'],choices:[{id:'accept',label:'Accept',command:'accept',next:'route'}]},route:{speaker:'TEST',pages:['Before'],redirect:[{when:{flag:'accepted'},node:'after'}]},after:{speaker:'TEST',pages:['After'],onEnter:'fail'}}}}};
state={flags:{},items:{},tokens:0};const transactional=new GameplaySession(def,{read:()=>state,write:v=>{state=v;}}),conversation=new ConversationSession(transactional,'test');assert(!conversation.choose('accept').ok);assert.deepEqual(state,{flags:{},items:{},tokens:0});assert.deepEqual(transactional.events(),[]);assert.equal(conversation.frame().pages[0],'Offer');conversation.close();
const once:GameplayDefinition={version:1,flags:['claimed'],items:[],events:[],commands:{reward:{sources:['conversation'],when:{flag:'claimed',is:false},actions:[{flag:'claimed',value:true},{tokens:1}]}},reactions:[],conversations:{once:{entry:[{when:{flag:'claimed',is:false},node:'first'},{node:'again'}],nodes:{first:{speaker:'TEST',pages:['A gift'],onEnter:'reward'},again:{speaker:'TEST',pages:['Already given']}}}}};
state={flags:{},items:{},tokens:0};const onceSession=new GameplaySession(once,{read:()=>state,write:v=>{state=v;}});const first=new ConversationSession(onceSession,'once');assert.equal(state.tokens,1);first.frame();first.frame();first.close();state=JSON.parse(JSON.stringify(state));new ConversationSession(onceSession,'once').close();assert.equal(state.tokens,1);
console.log('Unified conversations PASS: persistent NPC progress in three scenes, sequential/final-repeat behavior, pure frames/close, live Library catalog variants/choices, and atomic choice+post-choice redirect+entry rollback.');
