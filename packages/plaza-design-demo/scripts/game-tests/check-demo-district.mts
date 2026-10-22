import assert from 'node:assert/strict';
import {projectDeviceBindings} from '../../src/ssg/game/engine/gameplay/device-bindings';
import {build} from 'esbuild';import vm from 'node:vm';
import {demoContent,DEMO_GAMEPLAY,DEMO_COUNTER,DEMO_DESK,validateDemoScene} from '../../src/ssg/game/demo';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {ConversationSession} from '../../src/ssg/game/engine/gameplay/conversation';
import type {GameplayState} from '../../src/ssg/game/engine/gameplay/types';
const content=demoContent();assert.equal(content.library.exits.length+content.shop.exits.length+content.sandbox.exits.length,0);assert.equal(content.library.data,undefined);
for(const scene of Object.values(content)){assert.equal(scene.readables?.length??0,0);assert.equal(scene.rests?.length??0,0);assert.equal(scene.platforms?.length??0,0);assert.equal(scene.intro.length,0);}
assert.deepEqual(content.library.people?.map(p=>p.id),['shelfe','librarian']);
assert.deepEqual(content.sandbox.data?.devices.map(d=>d.id).sort(),['button','counter','fan','hatch','lamp','plate','sensor']);
assert.equal(content.shop.people?.length??0,0);
assert.throws(()=>projectDeviceBindings({manifest:{devices:{absent:'absent'}}} as any,[],content.sandbox.data!,1040),/no world device/,'review subset must not weaken missing-device validation');
let state:GameplayState={flags:{},items:{},tokens:8};const port={read:()=>state,write:(v:GameplayState)=>{state=v;}};
let session=new GameplaySession(content.library.gameplay!,port),conversation=new ConversationSession(session,'demo.desk');
assert(conversation.choose('discount').ok);assert(conversation.choose('back').ok);assert(conversation.choose('fee').ok);assert(conversation.choose('back').ok);
assert.equal(session.quote('demo.goods').quote,1);assert.equal(session.quote('demo.goods').charge,3);assert(conversation.choose('buy').ok);assert.equal(state.tokens,5);assert.equal(state.items.blue,1);assert.equal(state.values!.demo.rotation,1);
state=JSON.parse(JSON.stringify(state));session.dispose();session=new GameplaySession(content.shop.gameplay!,port);assert.equal(session.state().values!.demo.rotation,1);assert(content.shop.uses![0].use({gameplay:session,flags:state.flags} as any));assert.equal(state.items.crisps,1);assert.equal(state.tokens,2);
conversation=new ConversationSession(session,'demo.desk');assert(conversation.choose('empty').ok);conversation.choose('back');const before=structuredClone(state);assert(!conversation.choose('buy').ok);assert.deepEqual(state,before);assert.equal(conversation.frame().speaker,'TEST DESK');conversation.close();
for(const bad of [structuredClone(DEMO_COUNTER),structuredClone(DEMO_DESK)]){bad.exits![0].to='downtown';assert.throws(()=>validateDemoScene(bad));}
// Run real save/slot/mode modules against a browser-like storage boundary; no player browser is touched.
const bundled=await build({stdin:{contents:`import {newSave,storeSave,loadSave} from './src/ssg/game/runtime/save';import {saveKey,resumeKey} from './src/ssg/game/runtime/play-profile';import {writeSlot,readSlot,slotKey} from './src/ssg/game/runtime/slots';const s=newSave();s.gameplay={demo:{rotation:2}};storeSave(s);writeSlot(1,s,'shop','Counter');globalThis.result={key:saveKey(),slot:slotKey(1),resume:resumeKey(),save:loadSave(),read:readSlot(1)};`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'browser',format:'iife'});
const memory=new Map<string,string>([['access-denied-save-v3','campaign-sentinel'],['access-denied-v3-slot-1','slot-sentinel'],['access-denied-harbor-shift-v1','harbor-sentinel']]),touched:string[]=[];
const storage={getItem:(k:string)=>{touched.push(k);return memory.get(k)??null;},setItem:(k:string,v:string)=>{touched.push(k);memory.set(k,v);},removeItem:(k:string)=>memory.delete(k)};
const win:any={name:'',addEventListener:()=>{}};win.parent=win;const context:any={window:win,location:{search:'?demo',reload:()=>{}},localStorage:storage,sessionStorage:storage,console,Date,performance,URLSearchParams,structuredClone};vm.runInNewContext('globalThis.structuredClone=v=>JSON.parse(JSON.stringify(v));'+bundled.outputFiles[0].text,context);
assert.equal(context.result.key,'access-denied-demo-v1');assert.equal(context.result.slot,'access-denied-v3-demo-slot-1');assert.equal(context.result.resume,'access-denied-demo-resume-v1');assert.equal(context.result.save.gameplay.demo.rotation,2);assert.equal(context.result.read.save.gameplay.demo.rotation,2);assert.equal(memory.get('access-denied-save-v3'),'campaign-sentinel');assert.equal(memory.get('access-denied-v3-slot-1'),'slot-sentinel');assert.equal(memory.get('access-denied-harbor-shift-v1'),'harbor-sentinel');assert(touched.every(k=>k.includes('demo')));
console.log('Test District PASS: compact native review areas, shared commerce/conversation commands, discount+fee, cross-area saved state, empty stock atomic failure, travel-free isolation, isolated actual save/slot/resume modules and campaign/Harbor sentinels.');
