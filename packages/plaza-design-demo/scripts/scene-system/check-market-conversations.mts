import {recorder} from './capture-actor-paint.mts';
import {frameView} from '../../src/ssg/game/art/core/view';
import {lightAt} from '../../src/ssg/game/world/light';
import assert from 'node:assert/strict';
import baseline from './fixtures/market-conversation-baseline.json';
import {market,marketScene,marketComposition} from '../../src/ssg/game/scenes/market';
import {MARKET_GAMEPLAY,validateMarketGameplay} from '../../src/ssg/game/scenes/market/gameplay';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {talkTo,drawCharacter,type Character} from '../../src/ssg/game/runtime/characters';
import type {GameplayState} from '../../src/ssg/game/engine/gameplay/types';
let state:GameplayState={flags:{unrelated:true},items:{fish:2},tokens:9,values:{market:{fortune:2},foreign:{retained:77}}};
const port={read:()=>state,write:(value:GameplayState)=>{state=value;}};
for(const original of baseline.people){
 const actor=market.people!.find(p=>p.id===original.id)!;
 const visual=JSON.parse(JSON.stringify(actor));delete visual.talk;delete visual.conversation;
 const before=structuredClone(original) as any;delete before.talk;assert.deepEqual(visual,before);
 assert.equal(actor.conversation,'talk.market.'+original.id);assert.deepEqual(actor.talk??[],[]);
 for(let visit=0;visit<original.talk.length+2;visit++){
  const session=new GameplaySession(MARKET_GAMEPLAY,port);
  assert.deepEqual(talkTo(actor,session),{name:original.name,pages:original.talk[Math.min(visit,original.talk.length-1)]});
  assert.equal(session.state().values!.market.fortune,2);assert.equal(state.values!.foreign.retained,77);assert.equal(state.tokens,9);assert.equal(state.items.fish,2);assert.equal(state.flags.unrelated,true);
  session.dispose();state=JSON.parse(JSON.stringify(state));
 }
}
// Appearance metadata is backed by actual native drawing transcripts, including nested character caches.
(globalThis as any).document={createElement:()=>{const r=recorder();return{width:0,height:0,paint:r.paints,getContext:()=>r.ctx};}};
let paints=0;
for(const original of baseline.people)for(const t of [0,137,300,601])for(const minute of [0,580,1100,1300]){
 const actor=market.people!.find(p=>p.id===original.id)!,view={...frameView(t,lightAt(1,minute,180,null,false)),cam:0,gy:300,viewW:2080,viewH:360,sx:(x:number)=>x,y:(h:number)=>300-h};
 const a=recorder(),b=recorder();drawCharacter(a.ctx,view,original as Character);drawCharacter(b.ctx,view,actor);assert(JSON.stringify(a.paints)===JSON.stringify(b.paints),'actor paint mismatch '+original.id+' t='+t+' minute='+minute);paints++;
}
const pending=structuredClone(MARKET_GAMEPLAY);pending.conversations['talk.market.cook'].nodes['visit-0'].pages=['Pending authored greeting'];
const edited=marketScene(marketComposition,{},{},validateMarketGameplay(pending));let fresh:GameplayState={flags:{},items:{},tokens:1};const session=new GameplaySession(edited.gameplay!,{read:()=>fresh,write:v=>{fresh=v;}});assert.deepEqual(talkTo(edited.people!.find(p=>p.id==='cook')!,session).pages,['Pending authored greeting']);
console.log('Market batch PASS: four legacy page sequences/final-repeat, preserved actor geometry/appearance metadata, saved progress through reload, unrelated state/resources and fortune cursor retained, pending authored text in native factory; '+paints+' exact native actor paint transcripts.');
