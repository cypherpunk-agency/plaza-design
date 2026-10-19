/** Verify shared dialogue commands against the actual original native action interpreter. */
import assert from 'node:assert/strict';import fs from 'node:fs';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {ConversationSession} from '../../src/ssg/game/engine/gameplay/conversation';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {nativeStatePort} from '../../src/ssg/game/engine/gameplay/native-bindings';
import {nativeDialogue} from '../../src/ssg/game/engine/gameplay/native-dialogue';
import {gameplayScene} from '../../src/ssg/game/authoring/gameplay-scenes';
import {SCENES} from '../../src/ssg/game/scenes';
import type {GameplayDefinition,GameplayState} from '../../src/ssg/game/engine/gameplay/types';
import type {SceneDef} from '../../src/ssg/game/scenes/kit';
function harness(scene:SceneDef,definition:GameplayDefinition,open:boolean,key:string){let saved:GameplayState={flags:{},items:{},tokens:0},writes=0;const m=new SceneModel({say:()=>{},changed:()=>{},open:()=>{}},scene.data!,scene.rules as any);m.setPaused(true);m.state[key]=open;const session=new GameplaySession(definition,nativeStatePort(definition,{read:()=>saved,write:s=>{saved=s;writes++;}},()=>m));return{m,session,saved:()=>saved,writes:()=>writes,dispose(){session.dispose();m.reset();m.setPaused(true);}};}
let cases=0,transitions=0;
for(const[sceneId,id,key]of [['yard','hinge','gateAllowed'],['sandbox','unit7','lampOn']] as const){
 const scene=SCENES[sceneId],registered=gameplayScene(sceneId),definition=registered.validateGameplay(JSON.parse(fs.readFileSync('src/ssg/game/scenes/'+sceneId+'/gameplay.json','utf8'))),fixture=JSON.parse(fs.readFileSync('scripts/scene-system/fixtures/'+sceneId+'-conversation-baseline.json','utf8')),original=fixture.dialogue;
 assert.deepEqual(nativeDialogue(definition,id),original);assert.deepEqual(scene.data!.dialogue[id],original);assert.deepEqual(scene.data!.cables,fixture.cables);
 assert.deepEqual(JSON.parse(fs.readFileSync('src/ssg/game/scenes/'+sceneId+'/devices.json','utf8')).dialogue,{});
 for(const open of [false,true])for(const[nodeId,rows]of Object.entries(original.nodes)){
  const gp=structuredClone(definition);gp.conversations[id].entry=[{node:nodeId}];const h=harness(scene,registered.validateGameplay(gp),open,key),legacy=harness(scene,gp,open,key);
  const pick=(target:string,m:SceneModel)=>([original.nodes[target]].flat() as any[]).find(n=>!n.if||m.cond(n.if));
  const expected=pick(nodeId,legacy.m);if(expected.do)legacy.m.apply(expected.do);const talk=new ConversationSession(h.session,id);
  assert.deepEqual(talk.frame().pages,[expected.text]);assert.deepEqual(talk.frame().choices?.map(c=>[c.label,c.next]),expected.choices);assert.deepEqual(h.m.state,legacy.m.state);assert.deepEqual([...h.m.goals],[...legacy.m.goals]);
  const committed=h.writes();for(let i=0;i<8;i++)talk.frame();assert.equal(h.writes(),committed,'rendering never repeats an entry command');assert.equal(h.saved().values?.[sceneId+'.'+key],undefined);cases++;
  for(const[index,choice]of (expected.choices??[]).entries()){
   const current=harness(scene,gp,open,key),native=harness(scene,gp,open,key);if(expected.do)native.m.apply(expected.do);const run=new ConversationSession(current.session,id);assert(run.choose('choice-'+(index+1)).ok);const destination=pick(choice[1],native.m);if(destination.do)native.m.apply(destination.do);assert.deepEqual(run.frame().pages,[destination.text]);assert.deepEqual(current.m.state,native.m.state);assert.deepEqual([...current.m.goals],[...native.m.goals]);transitions++;current.dispose();native.dispose();
  }
  h.dispose();legacy.dispose();
 }
 const h=harness(scene,definition,false,key),talk=new ConversationSession(h.session,id);const before=structuredClone(h.m.state);assert(talk.submit('zzzz').ok);assert.deepEqual(talk.frame().pages,[original.free.miss]);assert.deepEqual(h.m.state,before);assert.equal(h.writes(),0);assert(talk.choose('free-input-retry').ok);assert(talk.submit(original.free.match.split('|')[0].toUpperCase()).ok);assert.deepEqual(talk.frame().pages,[original.nodes[original.free.goto].text]);h.dispose();
 const edited=structuredClone(definition);edited.conversations[id].nodes.start.pages=['Pending shared source'];edited.conversations[id].nodes.start.redirect=[];registered.validateGameplay(edited);const pending=harness(scene,edited,false,key);assert.deepEqual(new ConversationSession(pending.session,id).frame().pages,['Pending shared source']);pending.dispose();
 // Old native snapshots retain the permission/lamp value after a shared command commit.
 const committed=harness(scene,definition,false,key),run=new ConversationSession(committed.session,id);
 if(sceneId==='yard'){assert(run.choose('choice-1').ok);assert(run.choose('choice-1').ok);assert(run.choose('choice-1').ok);assert(committed.m.goals.has('talk'));assert.equal(committed.m.state.gateAllowed,true);}
 else {assert(run.choose('choice-2').ok);assert.equal(committed.m.state.lampOn,true);}
 const old=committed.m.snapshot(),restored=harness(scene,definition,false,key);restored.m.restore(old);assert.equal(restored.session.state().values![sceneId+'.'+key],true);assert.equal(committed.saved().values?.[sceneId+'.'+key],undefined);committed.dispose();restored.dispose();
}
console.log(`Native conversation actions PASS: ${cases} original node/state cases, ${transitions} choice/action transitions, shared/native state and goal parity, pure frames, free input/retry, pending dialogue and original native save reload.`);
