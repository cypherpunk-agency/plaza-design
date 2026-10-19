import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Panels} from '../../src/ssg/game/engine/panels';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {ConversationSession} from '../../src/ssg/game/engine/gameplay/conversation';
import {nativeStatePort} from '../../src/ssg/game/engine/gameplay/native-bindings';
import {nativeDialogue} from '../../src/ssg/game/engine/gameplay/native-dialogue';
import {capsuleScene} from '../../src/ssg/game/scenes/capsule';
import {content} from '../../src/ssg/game/scenes/capsule/scene-document';
import {CAPSULE} from '../../src/ssg/game/data';
import type {GameplayDefinition,GameplayState} from '../../src/ssg/game/engine/gameplay/types';
const fixture=JSON.parse(fs.readFileSync('scripts/scene-system/fixtures/capsule-conversation-baseline.json','utf8'));
assert.deepEqual(CAPSULE.dialogue.concierge,fixture.dialogue);assert.deepEqual(CAPSULE.cables,fixture.cables);
const raw=JSON.parse(fs.readFileSync('src/ssg/game/scenes/capsule/devices.json','utf8'));assert.deepEqual(raw.dialogue,{});assert.deepEqual(raw.cables,[]);
function harness(def:GameplayDefinition=content.gameplay,open=false){const scene=capsuleScene(undefined,{}, {},content.scene,def);let state:GameplayState={flags:{},items:{},tokens:0};let writes=0;
 const m=new SceneModel({say:()=>{},changed:()=>{},open:()=>{}},scene.data!,scene.rules as any);m.setPaused(true);m.state.doorOpen=open;
 const session=new GameplaySession(def,nativeStatePort(def,{read:()=>state,write:s=>{state=s;writes++;}},()=>m));
 return {m,session,state:()=>state,writes:()=>writes,dispose(){session.dispose();m.reset();m.setPaused(true);}};
}
let nodes=0,choices=0;
for(const open of [false,true])for(const[id,value]of Object.entries(fixture.dialogue.nodes)){
 const gp=structuredClone(content.gameplay);gp.conversations.concierge.entry=[{node:id}];const h=harness(content.validateGameplay(gp),open),talk=new ConversationSession(h.session,'concierge');
 const expected=([value].flat() as any[]).find(n=>!n.if||h.m.cond(n.if));assert.equal(talk.sayCommand,fixture.dialogue.sayCmd);assert.equal(talk.frame().speaker,fixture.dialogue.speaker);assert.deepEqual(talk.frame().pages,[expected.text]);assert.deepEqual(talk.frame().choices?.map(c=>[c.label,c.next]),expected.choices);assert.equal(talk.frame().acceptsText,expected.choices?true:undefined);nodes++;
 const snapshot=h.m.snapshot();for(let i=0;i<5;i++)talk.frame();assert.deepEqual(h.m.snapshot(),snapshot);assert.equal(h.writes(),0);
 for(const [index,choice]of (expected.choices??[]).entries()){const fresh=new ConversationSession(h.session,'concierge');assert(fresh.choose('choice-'+(index+1)).ok);const destination=([fixture.dialogue.nodes[choice[1]]].flat() as any[]).find(n=>!n.if||h.m.cond(n.if));assert.deepEqual(fresh.frame().pages,[destination.text]);choices++;}
 assert.equal(h.m.state.doorOpen,open);assert.equal(h.state().values?.['capsule.doorOpen'],undefined,'native value must not acquire a second save owner');h.dispose();
}
const h=harness(undefined,true),talk=new ConversationSession(h.session,'concierge');assert(talk.submit('nonsense').ok);assert.deepEqual(talk.frame().pages,[fixture.dialogue.free.miss]);assert.equal(talk.frame().choices![0].echo,false);assert(talk.choose('free-input-retry').ok);assert.deepEqual(talk.frame().pages,[fixture.dialogue.nodes.start[0].text]);assert(talk.submit('THANK you').ok);assert.deepEqual(talk.frame().pages,[fixture.dialogue.nodes.manners.text]);assert.equal(h.m.state.doorOpen,true);h.dispose();
const pending=structuredClone(content.gameplay);pending.conversations.concierge.nodes.manners.pages=['Pending response'];pending.conversations.concierge.free!.containsAny=['custom'];pending.native!.wires=[];
const p=harness(content.validateGameplay(pending));assert.deepEqual(p.m.data.cables,[]);const custom=new ConversationSession(p.session,'concierge');assert(custom.submit('custom input').ok);assert.deepEqual(custom.frame().pages,['Pending response']);p.dispose();
for(const mutate of [(d:any)=>{d.native.state['capsule.doorOpen']='rent';},(d:any)=>{d.conversations.concierge.nodes.start.redirect[0].when={flag:'unregistered'};},(d:any)=>{d.native.wires[0].to='absent.power';}]){const bad=structuredClone(content.gameplay);mutate(bad);assert.throws(()=>content.validateGameplay(bad));}
assert.deepEqual(nativeDialogue(content.gameplay,'concierge'),fixture.dialogue);
// Exercise the real talk dispatch: a bare terminal `talk` must use the shared graph too.
for(const target of [undefined,'concierge']){const h=harness();let presented=0;const echoes:unknown[]=[];Panels.prototype.talk.call({m:h.m,say:(l:unknown)=>echoes.push(l),conversation:(id:string)=>{assert.equal(id,'concierge');return new ConversationSession(h.session,id);},presentConversation:(run:ConversationSession,echo:(s:string)=>void)=>{presented++;assert.deepEqual(run.frame().pages,[fixture.dialogue.nodes.start[1].text]);echo('Hello.');}} as any,target);assert.equal(presented,1);assert.deepEqual(echoes,[[fixture.dialogue.sayCmd.replace('{line}','Hello.'),'','dim']]);h.dispose();}

console.log(`Capsule shared conversation PASS: ${nodes} original node/state cases, ${choices} original choice transitions, native door-state ownership, literal free input/miss/retry, pending response/matcher/wires and protected malformed bindings.`);
