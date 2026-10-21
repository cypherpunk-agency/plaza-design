/** ENG-04 finite behavior, security, source-history and save acceptance. No campaign playthrough. */
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';
import {SceneModel,type Line} from '../../src/ssg/game/engine/model';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {ConversationSession} from '../../src/ssg/game/engine/gameplay/conversation';
import {attachNativeGameplay} from '../../src/ssg/game/engine/gameplay/native-bindings';import {fixtureGameplayPort} from './model-gameplay-fixture.mts';
import {FOLDER_SOURCES} from '../../src/ssg/game/scenes/folder-scenes';
import {folderSceneDefinition} from '../../src/ssg/game/engine/gameplay/folder-scene';
import {validateGameplay} from '../../src/ssg/game/engine/gameplay/validation';
const MARKET_GAMEPLAY=validateGameplay(FOLDER_SOURCES.market.gameplay),marketScene=()=>folderSceneDefinition('market',FOLDER_SOURCES.market);
const BEACH_GAMEPLAY=validateGameplay(FOLDER_SOURCES.beach.gameplay),validateBeachGameplay=validateGameplay,beachScene=()=>folderSceneDefinition('beach',FOLDER_SOURCES.beach);
import {BEACH} from '../../src/ssg/game/data';
import {WORKSHOP_GAMEPLAY,workshopScene,validateWorkshopGameplay} from '../../src/ssg/game/demo/workshop';
import {demoContent} from '../../src/ssg/game/demo';
import type {GameplayState} from '../../src/ssg/game/engine/gameplay/types';
import type {SceneDef} from '../../src/ssg/game/scenes/kit';
import {ComposerModel} from '../../src/ssg/game/authoring/app';
import {SCENES} from '../../src/ssg/game/scenes';
import {createSequenceValidationContext} from '../../src/ssg/game/authoring/sequence-preview';
import {buildEventInspection} from '../../src/ssg/game/authoring/event-inspector-model';
import {art} from '../../src/ssg/game/art';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';

function harness(scene:SceneDef,shared=true){
 let state:GameplayState={flags:{},items:{soap:2},tokens:8},now=0;const lines:Line[]=[],queue:{at:number;run:()=>void}[]=[];
 const m=new SceneModel({say:l=>lines.push(l),open:()=>{},changed:()=>{},tokens:n=>(state.tokens+=n),modules:()=>['timer.so','switch.so']},scene.data!,scene.rules as SceneDef['rules'] as never);m.setPaused(true);m.now=()=>now;m.wall=()=>1000;
 m.later=(ms,run)=>{queue.push({at:now+ms,run});};
 const port={read:()=>state,write:(next:GameplayState)=>{state=next;}};
 const session=shared?new GameplaySession(scene.gameplay!,fixtureGameplayPort(scene.gameplay!,port,()=>m)):undefined;if(session)attachNativeGameplay(m,session);
 const advance=(ms:number)=>{const end=now+ms;let budget=0;while(true){queue.sort((a,b)=>a.at-b.at);if(!queue.length||queue[0].at>end)break;if(++budget>200)throw new Error('Unbounded fixture signal');const next=queue.shift()!;now=next.at;next.run();}now=end;};
 return{m,lines,session,state:()=>state,advance,queue,dispose(){session?.dispose();m.reset();m.setPaused(true);queue.length=0;}};
}
// Native Beach parity: default/repeated state, both invocation routes, manual lockout and exact lines.
let parity=0;
for(const free of [false,true])for(const billing of ['run','pause'])for(const locked of [false,true])for(const signal of [false,true])for(const[device,noun,verb]of [['kiosk','meter','run'],['kiosk','meter','pause'],['mixer','pump','pour']]){
 const legacy=harness({...beachScene(),data:BEACH},false),current=harness(beachScene());
 for(const h of [legacy,current]){h.m.state.freeDrink=free;h.m.state.billing=billing;if(locked)h.m.locks.set(device,6000);h.m.act(device,noun,verb,signal);}
 assert.deepEqual(current.m.state,legacy.m.state);assert.deepEqual([...current.m.goals],[...legacy.m.goals]);assert.deepEqual(current.lines,legacy.lines);assert.equal(current.state().tokens,legacy.state().tokens);assert.deepEqual(current.state().items,{soap:2});parity++;
 legacy.dispose();current.dispose();
}
// Shared eligibility is a dry transaction: no event history, port writes, native effects or timers.
const w=harness(workshopScene()),s=w.session!;const before=()=>JSON.stringify({save:w.state(),native:w.m.snapshot(),events:s.events(),queue:w.queue.map(p=>p.at)});
const pure=before();for(let i=0;i<4;i++){assert(s.eligibility('workshop.hatch.open','interaction').ok);assert(w.m.eligibility('hatch','hatch','open').ok);}assert.equal(before(),pure);
w.m.locks.set('hatch',6000);assert.deepEqual(w.m.eligibility('hatch','hatch','open'),{ok:false,reason:'lockout'});const blocked=before();assert(!s.dispatch('workshop.hatch.open','conversation').ok);assert.equal(before(),blocked);
assert(w.m.eligibility('hatch','hatch','open',true).ok);w.m.locks.clear();
// Counter reuses the authored shared operation for both direct use and the fixed button cable.
w.m.act('counter','count','count');assert.equal(w.m.get('count'),1);assert.equal(w.state().values!.sandbox,w.m.state);assert(w.lines.some(l=>l[1]==='COUNTER: 1.'));assert(Object.hasOwn(w.m.scratch,'pulse.counter'));assert(Object.hasOwn(w.m.scratch,'pulse.counter.count'));w.m.act('button','button','press');w.advance(150);assert.equal(w.m.get('count'),2);assert(w.lines.some(l=>l[0]==='signal → count'&&l[1]==='COUNTER: 2.'));
// Direct, dialogue and signal routes call the same operation, and emitted events feed native chains.
const talk=new ConversationSession(s,'workshop.operator');assert(talk.choose('deny').ok);const refusal=before();assert(!talk.choose('open').ok);assert.equal(before(),refusal);assert(!w.m.eligibility('hatch','hatch','open',true).ok);assert(talk.choose('allow').ok);assert(talk.choose('open').ok);assert.equal(w.m.state.hatchOpen,true);assert.equal(w.m.state.fanOn,false);w.advance(149);assert.equal(w.m.state.fanOn,false);w.advance(1);assert.equal(w.m.state.fanOn,true);
w.m.act('hatch','hatch','shut');w.m.act('fan','fan','stop');
const timer=w.m.addLogic('timer')!,gate=w.m.addLogic('switch')!;assert(timer&&gate);
for(const[from,to,verb]of [['plate.plate:pressed',timer+'.timer','wait 1 s'],[timer+'.timer:done',gate+'.switch','pass'],[gate+'.switch:out','hatch.hatch','open']])assert.notEqual(w.m.connect(from,to,verb)[2],'err');
w.m.act('plate','plate','step');w.advance(1600);assert.equal(w.m.state.hatchOpen,false,'off switch must stop chain');
w.m.act(gate,'switch','turn on');w.m.act('plate','plate','step');w.advance(1449);assert.equal(w.m.state.hatchOpen,false);w.advance(1);assert.equal(w.m.state.hatchOpen,true);w.advance(150);assert.equal(w.m.state.fanOn,true);
const links=structuredClone(w.m.links);assert.equal(w.m.connect('plate.plate:missing','hatch.hatch','open')[2],'err');assert.deepEqual(w.m.links,links);assert.equal(w.m.connect('plate.plate:pressed','hatch.hatch','typo')[2],'err');assert.deepEqual(w.m.links,links);
const fixed=w.m.links.find(l=>l.fixed)!;assert.equal(w.m.cut(fixed)[2],'err');assert.equal(w.m.connect(fixed.from,fixed.to,'open')[2],'err');
const snapshot=JSON.parse(JSON.stringify(w.m.snapshot()));w.m.restore(snapshot);assert.equal(w.m.state.hatchOpen,true);assert(w.m.links.some(l=>l.to===timer+'.timer'));assert(w.m.devices.has(gate));assert.equal(s.state().values!.sandbox.hatchOpen,true);assert.equal(w.state().values!.sandbox,w.m.state,'native and shared state have one live owner');
// Native security stays authoritative for other input adapters too.
const frozen=w.m.frozen;w.m.frozen=id=>id==='hatch';assert.equal(s.dispatch('workshop.hatch.open','signal').ok,false);w.m.frozen=frozen;
assert.equal(w.m.devices.has('cabinet'),false,'review fixture excludes unrelated QA stations');
w.dispose();
// A failed late resource action rolls back native state, resources, goals and success emissions.
const failure=structuredClone(WORKSHOP_GAMEPLAY);failure.commands['workshop.hatch.open'].actions.push({tokens:-99});const failHarness=harness({...workshopScene(),gameplay:failure});const failedBefore=JSON.stringify({state:failHarness.state(),native:failHarness.m.snapshot()});assert(!failHarness.session!.eligibility('workshop.hatch.open','interaction').ok);failHarness.m.act('hatch','hatch','open');assert.equal(JSON.stringify({state:failHarness.state(),native:failHarness.m.snapshot()}),failedBefore);assert.equal(failHarness.session!.events().length,0);assert.equal(failHarness.queue.length,0);failHarness.dispose();
// Beach billing still observes migrated native meter state; recurring charge and danger timer stay native.
const b=harness(beachScene());b.m.state.rented=true;b.m.state.billed=1;b.m.act('kiosk','meter','pause');b.m.tick(60000,true);assert.equal(b.state().tokens,8);b.m.act('kiosk','meter','run');b.m.tick(60000,true);assert.equal(b.state().tokens,7);assert.equal(b.m.state.billed,2);b.m.state.flag='danger';b.m.tick(40000,true);assert.equal(b.m.state.flag,'clear');
const denied=JSON.stringify(b.m.snapshot());assert(!b.session!.eligibility('beach.pour','interaction').ok);assert.equal(JSON.stringify(b.m.snapshot()),denied);b.dispose();
// Paid Market fortune advances only on successful payment and survives session/factory reconstruction.
let saved:GameplayState={flags:{},items:{},tokens:2};const marketPort={read:()=>saved,write:(v:GameplayState)=>{saved=v;}};let market=new GameplaySession(MARKET_GAMEPLAY,marketPort);const use=marketScene().uses!.find(u=>u.id==='fortune')!;const ctx=()=>({gameplay:market,flags:saved.flags,tokens:saved.tokens} as any);
const first=use.use(ctx());saved=JSON.parse(JSON.stringify(saved));market.dispose();market=new GameplaySession(MARKET_GAMEPLAY,marketPort);const second=marketScene().uses!.find(u=>u.id==='fortune')!.use(ctx());assert.notDeepEqual(second,first);assert.equal(saved.tokens,0);const noMoney=structuredClone(saved);use.use(ctx());assert.deepEqual(saved,noMoney);assert.equal(saved.values!.market.fortune,2);market.dispose();
// Protected source contracts and history/bundle transactions use the production validators.
const editable=structuredClone(BEACH_GAMEPLAY);editable.commands['beach.pour'].sources.push('interaction');assert(validateBeachGameplay(editable).commands['beach.pour'].sources.includes('interaction'),'supported invocation permissions are authored content');const invalid=structuredClone(BEACH_GAMEPLAY);invalid.commands['beach.pour'].sources.push('untrusted' as any);assert.throws(()=>validateBeachGameplay(invalid));
const badWire=structuredClone(WORKSHOP_GAMEPLAY);badWire.native!.wires[0].to='missing.noun';assert.throws(()=>validateWorkshopGameplay(badWire),/endpoint/);
const alteredFixed=structuredClone(WORKSHOP_GAMEPLAY);alteredFixed.native!.wires=alteredFixed.native!.wires.filter(w=>!w.fixed);assert.throws(()=>validateWorkshopGameplay(alteredFixed),/protected/);
const game=path.resolve('src/ssg/game'),docs=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'fixture',value:JSON.parse(fs.readFileSync(path.join(game,d.file),'utf8'))}));
// Validate each prospective document graph once, rather than repeating the full graph for every row.
const validate=(doc:{id:string},all:typeof docs)=>{if(doc.id===docs[0].id)validateSourceDocuments(new Map(all.map(d=>[d.id,d.value])));};
const model=new ComposerModel(art,createSequenceValidationContext(art,{},Object.fromEntries(Object.entries(SCENES).map(([id,d])=>[id,d.exits.map(e=>e.id)]))),validate);
model.load(docs);const edit=structuredClone(BEACH_GAMEPLAY);edit.native!.wires[0].to='mixer.pump';edit.native!.wires[0].verb='pour';model.edit('beach-gameplay','Wire jukebox to pump',()=>edit);model.undo();assert(!model.dirty());model.redo();assert(model.dirty());
const bundle=createDocumentBundle(model.edits(),model.list());model.undo();model.importDocuments(readDocumentBundle(bundle,model.list()));assert.deepEqual(model.get('beach-gameplay').value,edit);const graph=buildEventInspection({documents:model.list()});assert(graph.nodes.some(n=>n.id==='shared-command:beach:beach.pour'));assert.equal(graph.nodes.find(n=>n.id==='verb:beach:kiosk.meter:pause')!.source.file,'scenes/beach/gameplay.json');assert.equal((graph.nodes.find(n=>n.kind==='cable'&&n.scene==='beach')!.details as any).to,'mixer.pump');const stable=model.list();assert.throws(()=>model.importDocuments([{id:'beach-gameplay',value:invalid},{id:'demo-workshop-gameplay',value:badWire}]));assert.deepEqual(model.list(),stable);
const scratch=path.resolve('../../.game-test-output/eng04-source');fs.mkdirSync(scratch,{recursive:true});const root=fs.mkdtempSync(path.join(scratch,'run-'));
try{for(const descriptor of sourceDocuments){const p=path.join(root,descriptor.file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,fs.readFileSync(path.join(game,descriptor.file)));}const store=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments}),before=store.list();const workshopEdit=structuredClone(WORKSHOP_GAMEPLAY);workshopEdit.native!.wires[0].to='hatch.hatch';workshopEdit.native!.wires[0].verb='open';const committed=store.save([{id:'beach-gameplay',revision:store.read('beach-gameplay').revision,value:edit},{id:'demo-workshop-gameplay',revision:store.read('demo-workshop-gameplay').revision,value:workshopEdit}]);assert.deepEqual(new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments}).read('beach-gameplay').value,edit);const stableSources=store.list();assert.throws(()=>store.save([{id:'demo-workshop-gameplay',revision:store.read('demo-workshop-gameplay').revision,value:WORKSHOP_GAMEPLAY},{id:'beach-gameplay',revision:store.read('beach-gameplay').revision,value:invalid}]));assert.deepEqual(store.list(),stableSources);assert.deepEqual(store.read('beach-gameplay').value,edit);store.undo(committed.transaction,Object.fromEntries(committed.documents.map(d=>[d.id,d.revision])));assert.deepEqual(store.list(),before);}finally{assert(root.startsWith(scratch+path.sep));fs.rmSync(root,{recursive:true,force:true});}
// Exercise the actual pausable scene time (moved by the model's tick), not just the deterministic timing fixture.
let realState:GameplayState={flags:{},items:{},tokens:8};const def=workshopScene();const real=new SceneModel({say:()=>{},open:()=>{},changed:()=>{}},def.data!,def.rules as never);real.setPaused(true);const realSession=new GameplaySession(def.gameplay!,fixtureGameplayPort(def.gameplay!,{read:()=>realState,write:s=>{realState=s;}},()=>real));attachNativeGameplay(real,realSession);
real.act('hatch','hatch','open');real.tick(180,false);assert.equal(real.state.fanOn,false);real.setPaused(false);real.tick(190,false);assert.equal(real.state.fanOn,true);
real.reset();real.setPaused(true);real.act('hatch','hatch','open');real.reset();real.setPaused(false);real.tick(180,false);assert.equal(real.state.fanOn,false,'reset cancels in-flight native signals');realSession.dispose();real.reset();real.setPaused(true);
const district=demoContent();assert.equal(district.library.exits.length+district.sandbox.exits.length,0);assert.deepEqual(district.sandbox.gameplay,WORKSHOP_GAMEPLAY);
console.log('ENG-04 PASS: '+parity+' Beach legacy cases, pure eligibility, native security, manual/dialogue/signal operations, 150ms chain, timer/switch, billing/danger parity, saved native ownership/logic/wires, Market reload, protected source/history/bundle round-trip and connected Workshop.');
