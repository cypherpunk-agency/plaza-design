import assert from 'node:assert/strict';
import {compileActors,validateActors,moveSceneActor} from '../../src/ssg/game/engine/gameplay/actors';
import {actorReactionIdentity} from '../../src/ssg/game/engine/gameplay/actor-identity';
import {withBotConversations,botConversationId,botVoice} from '../../src/ssg/game/engine/gameplay/bot-conversations';
import {ConversationSession} from '../../src/ssg/game/engine/gameplay/conversation';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {shopScene} from '../../src/ssg/game/scenes/shop';
import {SHOP_SCENE,validateShopScene} from '../../src/ssg/game/scenes/shop/scene-document';
import {shopGeometry} from '../../src/ssg/game/scenes/shop/composition';
import {SCENES} from '../../src/ssg/game/scenes';
import {botProfile} from '../../src/ssg/game/runtime/characters';
let checked=0;for(const [id,scene]of Object.entries(SCENES))for(const [index,p]of(scene.people??[]).entries())if(!p.talk&&botProfile(p)){assert.equal(botConversationId(id,p,index),'talk.'+id+'.bot.'+(p.id??'slot-'+index));checked++;}assert.equal(checked,17);
let saved:any={flags:{unrelated:true},items:{soap:2},tokens:4};const port={read:()=>saved,write:(v:any)=>{saved=v;}};
const original=withBotConversations(shopScene()),p=original.people![4],key=botConversationId('shop',p,4);assert.equal(key,'talk.shop.bot.slot-4');let session=new GameplaySession(original.gameplay!,port);let talk=new ConversationSession(session,key);assert.deepEqual(talk.frame().pages,botVoice(p).voice.talk[0]);talk.close();session.dispose();saved=JSON.parse(JSON.stringify(saved));
const reordered=structuredClone(SHOP_SCENE);moveSceneActor(reordered,'stockbot',-1);validateShopScene(reordered);const next=withBotConversations(shopScene(undefined,{},{},reordered)),index=reordered.actors!.filter(a=>a.band==='world').findIndex(a=>a.id==='stockbot'),robot=next.people![index];assert.equal(index,3);assert.equal(botConversationId('shop',robot,index),key);assert.equal(actorReactionIdentity(robot),'slot-4');assert(!Object.hasOwn(robot,'reaction'));assert(!JSON.stringify(robot).includes('slot-4'));session=new GameplaySession(next.gameplay!,port);talk=new ConversationSession(session,key);assert.deepEqual(talk.frame().pages,botVoice(robot).voice.talk[1%botVoice(robot).voice.talk.length]);talk.close();session.dispose();assert.equal(saved.tokens,4);assert.deepEqual(saved.items,{soap:2});assert.deepEqual(saved.flags,{unrelated:true});
// Old source arrays have no identity field: backfill by actor ID, never by their current array slot.
const legacy=structuredClone(reordered);for(const a of legacy.actors!)delete a.reaction;const oldSource=withBotConversations(shopScene(undefined,{},{},legacy));assert.equal(botConversationId('shop',oldSource.people![3],3),key);
const defs:any[]=[{id:'new-bot',instance:'browser',band:'world',look:'servbot',seed:73},{id:'new-helper',instance:'person-1',band:'world',look:'android',seed:74}];let actors=compileActors(defs,shopGeometry());assert.equal(botConversationId('shop',actors['new-bot'],0),'talk.shop.bot.actor.new-bot');defs.reverse();actors=compileActors(defs,shopGeometry());assert.equal(botConversationId('shop',actors['new-bot'],1),'talk.shop.bot.actor.new-bot');
for(const mutate of [(d:any)=>d.actors[0].reaction='changed',(d:any)=>d.actors[0].reaction=null,(d:any)=>d.actors[1].reaction=d.actors[0].reaction]){const bad=structuredClone(SHOP_SCENE);mutate(bad);assert.throws(()=>validateShopScene(bad));}
assert.throws(()=>validateActors([{id:'a',instance:'a',band:'world'},{id:'b',instance:'b',band:'world',reaction:'actor.a'}]));assert.throws(()=>moveSceneActor(reordered,'missing',1));assert.throws(()=>moveSceneActor(reordered,reordered.actors![0].id,-1));
console.log('Actor identities PASS:17 original bot keys, saved dialogue across actual native reorder/reload, old source identity backfill by ID, new actor namespaces, unchanged Character metadata, identity/collision/bounds rejection.');
