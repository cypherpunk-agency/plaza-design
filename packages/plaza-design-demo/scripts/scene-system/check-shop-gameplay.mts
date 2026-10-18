import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {shopScene} from '../../src/ssg/game/scenes/shop';
import {SHOP_GAMEPLAY,SHOP_SCENE,validateShopGameplay,validateShopScene} from '../../src/ssg/game/scenes/shop/scene-document';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import type {GameplayState} from '../../src/ssg/game/engine/gameplay/types';
import type {UseCtx} from '../../src/ssg/game/scenes/kit';
const a=shopScene(),b=shopScene();
// Recorded from the unmodified Shop factory before this migration. Includes every actor property,
// readable/exit coordinate and prompt height; use fields are projected in their legacy property order.
const snapshot=JSON.parse(JSON.stringify({width:a.width,spawn:a.spawn,facing:a.facing,exits:a.exits,readables:a.readables,people:a.people!.map(({conversation,...p})=>p),uses:a.uses!.map(u=>({id:u.id,x:u.x,label:u.label,price:typeof u.price==='function'?u.price({},new GameplaySession(SHOP_GAMEPLAY,{read:()=>({flags:{},items:{},tokens:1}),write:()=>{}})):u.price,name:u.name,promptH:u.promptH}))}));
assert.equal(createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'),'8ce90de2a8c785f8acde1d78c86d038bf19a3af76913208321ab72de7b5497de','Legacy Shop metadata/actor geometry changed');
const goods=['blue','crisps','noodlecup','gum'];let state:GameplayState={flags:{},items:{},tokens:0};
const session=new GameplaySession(SHOP_GAMEPLAY,{read:()=>state,write:s=>{state=s;}});
const ctx=()=>({gameplay:session,flags:state.flags,tokens:state.tokens,t:0,min:0,weather:'clear',pay:()=>{throw new Error('Legacy pay bypassed shared commands');},give:()=>{},set:()=>{},take:()=>false,add:()=>{},has:()=>false}) as UseCtx;
const failure=SHOP_SCENE.uses[0].routes[0].failure;
for(let turn=0;turn<12;turn++){
  state.tokens=0;const before=structuredClone(state);for(let retry=0;retry<3;retry++){assert.deepEqual((retry%2?a:b).uses![0].use(ctx()),failure);assert.deepEqual(state,before,'Insufficient funds must not mutate resources or flags');}
  state.tokens=1;const item=goods[turn%4],n=state.items[item]??0;
  // Constructing another scene must neither reset nor fork the saved purchase cursor.
  const scene=turn%3===0?shopScene():turn%2?a:b;
  assert.deepEqual(scene.uses![0].use(ctx()),SHOP_SCENE.uses[0].routes[turn%4].pages);
  assert.equal(state.items[item],n+1);assert.equal(state.tokens,0);assert.equal(state.flags['shop:bought'],true);
}
session.dispose();
const edited=structuredClone(SHOP_SCENE);edited.name='Local shop';edited.people![0].talk=[['Edited keeper']];edited.readables![0].pages=['Edited shelf'];edited.exits![0].label='[E] HOME';
const pending=shopScene(undefined,{}, {},edited);assert.equal(pending.name,'Local shop');assert.deepEqual(pending.people![0].talk,[['Edited keeper']]);assert.deepEqual(pending.readables![0].pages,['Edited shelf']);assert.equal(pending.exits[0].label,'[E] HOME');assert.equal(pending.exits[0].x,a.exits[0].x);assert.equal(pending.people![0].look&&JSON.stringify(pending.people![0].look),JSON.stringify(a.people![0].look));
for(const mutate of [(d:any)=>{d.exits[0].to='harbor';},(d:any)=>{d.people.reverse();},(d:any)=>{d.uses[0].routes.reverse();},(d:any)=>{d.uses[0].cycle=false;}]){const bad=structuredClone(SHOP_SCENE);mutate(bad);assert.throws(()=>validateShopScene(bad));}
const bad=structuredClone(SHOP_GAMEPLAY);bad.commands['shop.buy-blue'].sources=['signal'];assert.throws(()=>validateShopGameplay(bad));
assert.equal(a.rules,undefined);assert.equal(a.data,undefined);
console.log('Shop preserves legacy actors/geometry/prompts, 12 cyclic purchases across factories, 36 failed attempts with no mutation, and protected typed presentation/gameplay contracts.');
