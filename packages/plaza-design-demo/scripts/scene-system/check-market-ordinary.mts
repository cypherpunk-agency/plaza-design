import assert from 'node:assert/strict';import fs from 'node:fs';
import baseline from './fixtures/market-ordinary-baseline.json';
import {marketScene,marketComposition} from '../../src/ssg/game/scenes/market';
import {MARKET_SCENE} from '../../src/ssg/game/scenes/market/scene-document';
import {MARKET_GAMEPLAY} from '../../src/ssg/game/scenes/market/gameplay';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {ConversationSession} from '../../src/ssg/game/engine/gameplay/conversation';
import {sourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import type {GameplayState} from '../../src/ssg/game/engine/gameplay/types';
const scene=marketScene();let saved:GameplayState={flags:{},items:{},tokens:0};const session=new GameplaySession(scene.gameplay!,{read:()=>saved,write:s=>{saved=s;}});
for(const test of baseline.cases){saved={flags:{...test.before.flags},items:{...test.before.items},tokens:test.before.tokens,values:saved.values};const use=scene.uses!.find(u=>u.id===test.id)!;
 assert.equal(typeof use.price==='function'?use.price(saved.flags,session):use.price??0,test.price,test.id+' prompt price');assert.deepEqual(use.use({gameplay:session,flags:saved.flags} as any),test.pages,test.id+' response');
 assert.deepEqual({flags:saved.flags,items:saved.items,tokens:saved.tokens},{flags:test.after.flags,items:test.after.items,tokens:test.after.tokens});
 if(test.id==='fortune')assert.equal(session.state().values!.market.fortune,(test.after as any).values?.['market.fortune']??0);
}
const reload=new GameplaySession(scene.gameplay!,{read:()=>saved,write:s=>{saved=s;}});assert.equal(reload.state().values!.market.haggle,4);assert.equal(reload.state().values!.market.fortune,1);
const original=JSON.parse(fs.readFileSync('../../.scene-system/all-game-baseline-2026-10-18/manifest.json','utf8')).rows.find((r:any)=>r.id==='market').baseline;
assert.equal(scene.width,original.width);assert.equal(scene.spawn,original.spawn);assert.deepEqual(scene.exits,original.exits);assert.deepEqual(scene.readables,original.readables);
let pages=0;for(const row of MARKET_SCENE.people!.filter(p=>p.talk)){const actor=scene.people!.find(p=>p.id===row.id)!;const old=original.people.find((p:any)=>p.id===row.id);assert.ok(actor.conversation);for(let i=0;i<old.talk.length+1;i++){const c=new ConversationSession(session,actor.conversation!);assert.deepEqual(c.frame().pages,old.talk[Math.min(i,old.talk.length-1)]);c.close();pages++;}}
const pending=structuredClone(MARKET_SCENE);pending.uses[0].routes[1].pages=['Pending haggling'];const pendingPerson=pending.people!.find(p=>p.id==='regular')!;pendingPerson.talk![0]=['Pending Market actor'];
const edited=marketScene(marketComposition,{},{},MARKET_GAMEPLAY,pending),privateSession=new GameplaySession(edited.gameplay!,{read:()=>({flags:{},items:{},tokens:0}),write:()=>{}});assert.deepEqual(edited.uses![0].use({gameplay:privateSession,flags:{}} as any),['Pending haggling']);assert.deepEqual(new ConversationSession(privateSession,'talk.market.'+pendingPerson.id).frame().pages,['Pending Market actor']);
assert.equal(new Set(sourceDocuments.map(d=>d.id)).size,sourceDocuments.length,'full scene registration must not duplicate native gameplay documents');
console.log(`Market ordinary PASS: ${baseline.cases.length} original interactions/charges/resources, ${pages} remaining NPC page cases, persistent haggle/fortune, pending native content and unique source registration.`);
