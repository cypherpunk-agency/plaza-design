import assert from 'node:assert/strict';
import fs from 'node:fs';
import baseline from './fixtures/mall-interactions-baseline.json';
import {mallScene,mallComposition} from '../../src/ssg/game/scenes/mall';
import {MALL_SCENE,MALL_GAMEPLAY,validateMallGameplay} from '../../src/ssg/game/scenes/mall/scene-document';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {ConversationSession} from '../../src/ssg/game/engine/gameplay/conversation';
import type {GameplayState} from '../../src/ssg/game/engine/gameplay/types';
const scene=mallScene();let saved:GameplayState={flags:{},items:{},tokens:0};
const session=new GameplaySession(scene.gameplay!,{read:()=>saved,write:s=>{saved=s;}});
for(const test of baseline.cases){
 saved={...structuredClone(test.before),values:saved.values};
 const use=scene.uses!.find(u=>u.id===test.id)!;
 const quoted=typeof use.price==='function'?use.price(saved.flags,session):use.price??0;
 assert.equal(quoted,test.price,test.id+' displayed price');
 assert.deepEqual(use.use({gameplay:session,flags:saved.flags} as any),test.pages,test.id+' response');
 assert.deepEqual({flags:saved.flags,items:saved.items,tokens:saved.tokens},test.after,test.id+' resources and flags');
}
// Paid service failures are atomic and do not silently create fake inventory goods.
saved={...saved,tokens:0};const before=structuredClone(saved);assert.equal(session.dispatch('mall.deck.again','interaction').ok,false);assert.deepEqual(saved,before);
const reload=new GameplaySession(scene.gameplay!,{read:()=>saved,write:s=>{saved=s;}});
assert.equal(reload.state().values!['mall.meal'],1,'food rotation survives reload');
assert.equal(scene.uses!.find(u=>u.id==='kiosk')!.speakerKind,'device');
const invalid=structuredClone(MALL_GAMEPLAY);invalid.purchases!['mall.deck'].goods=[{item:'basil',quantity:1}];assert.throws(()=>validateMallGameplay(invalid),/service/);
const pending=structuredClone(MALL_SCENE);pending.uses[0].routes[0].pages=['Pending implant introduction'];pending.people![0].talk[0]=['Pending chatter'];
const edited=mallScene(mallComposition,{},{},pending,MALL_GAMEPLAY);let privateState:GameplayState={flags:{},items:{},tokens:20};const privateSession=new GameplaySession(edited.gameplay!,{read:()=>privateState,write:s=>{privateState=s;}});
assert.deepEqual(edited.uses![0].use({gameplay:privateSession,flags:{}} as any),['Pending implant introduction']);
assert.deepEqual(new ConversationSession(privateSession,'talk.mall.teen').frame().pages,['Pending chatter']);
const original=JSON.parse(fs.readFileSync('../../.scene-system/all-game-baseline-2026-10-18/manifest.json','utf8')).rows.find((r:any)=>r.id==='mall').baseline;
assert.deepEqual(scene.readables,original.readables);assert.deepEqual(scene.exits,original.exits);assert.equal(scene.spawn,original.spawn);assert.equal(scene.width,original.width);
console.log(`Mall PASS: ${baseline.cases.length} immutable native interactions/prices/resources, paid service atomicity, saved rotation, pending actor/use content and original geometry.`);
