import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';
import {art,type Composition} from '../../src/ssg/game/art';
import {SCENES} from '../../src/ssg/game/scenes';
import {manifestDemoScene,validateManifestSources} from '../../src/ssg/game/scenes/demo-manifest';
import {ComposerModel} from '../../src/ssg/game/authoring/app';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {createSequenceValidationContext} from '../../src/ssg/game/authoring/sequence-preview';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import {addManifestContent,removeManifestContent} from '../../src/ssg/game/engine/gameplay/manifest-content';
import {ConversationSession} from '../../src/ssg/game/engine/gameplay/conversation';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
const game=path.resolve('src/ssg/game'),documents=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'fixture',value:JSON.parse(fs.readFileSync(path.join(game,d.file),'utf8'))}));
const context=createSequenceValidationContext(art,{},Object.fromEntries(Object.entries(SCENES).map(([id,s])=>[id,s.exits.map(e=>e.id)])));
const validator=(d:any,docs:typeof documents)=>{if(d.id==='demo-manifest-scene')validateSourceDocuments(new Map(docs.map(row=>[row.id,row.value])));};
const model=new ComposerModel(art,context,validator);model.load(documents);
const composition=structuredClone(model.get('demo-manifest').value) as Composition;composition.instances.push({id:'new-checkpoint',type:'furniture.stool',props:{seed:7},placement:{x:360,h:0},order:2,layer:'set'});
const scene=structuredClone(model.get('demo-manifest-scene').value) as any;scene.manifest.uses.checkpoint='new-checkpoint';scene.objectives[0].text='Pending authored task';
composition.instances.push({id:'resident',type:'character.resident',props:{seed:23,kind:'human',act:'phone'},placement:{x:390,h:0},order:-1,layer:'playfield'});
for(const [group,id] of [['people','guide'],['readables','notice'],['rests','seat'],['exits','door']] as const)addManifestContent(scene,group,id,group==='people'?'resident':'new-checkpoint');
scene.people[0].talk=[['First visit.'],['Second visit.']];scene.exits[0].to='downtown';scene.exits[0].at='shop';
scene.time=[{minute:480}];

const counter=structuredClone(model.get('demo-counter-scene').value) as any;counter.uses[0].access=[{when:{tokensAtLeast:99},reason:'Pending authored refusal'}];
const harbor=structuredClone(model.get('harbor-shift-scene').value) as any;harbor.objectives[0].text='Pending harbor objective';
model.importDocuments([{id:'demo-manifest',value:composition},{id:'demo-manifest-scene',value:scene},{id:'demo-counter-scene',value:counter},{id:'harbor-shift-scene',value:harbor}]);
assert.equal(model.edits().length,4);model.undo();assert.equal(model.dirty(),false);model.redo();assert.equal(model.edits().length,4);
const receiver=new ComposerModel(art,context,validator);receiver.load(documents);receiver.importDocuments(readDocumentBundle(createDocumentBundle(model.edits(),model.list()),receiver.list()));
const def=manifestDemoScene(receiver.get('demo-manifest').value as Composition,{},{},receiver.get('demo-manifest-scene').value as any,receiver.get('demo-manifest-gameplay').value as any);
assert.equal(def.people![0].x,390);assert.equal(def.people![0].act,'phone');assert.equal(def.people![0].seed,23);
assert.equal(def.readables![0].x,360);assert.equal(def.readables![0].h,undefined);assert.equal(def.rests![0].kind,'stool');assert.equal(def.rests![0].x,360);
assert.equal(def.exits[0].to,'downtown');assert.equal(def.exits[0].at,'shop');assert.equal(def.exits[0].x,360);assert.equal(def.storyMinute!({}),480);assert.equal(def.uses![0].h,undefined);
let actorState:any={flags:{},items:{},tokens:0};const actorSession=()=>new GameplaySession(def.gameplay!,{read:()=>actorState,write:v=>{actorState=v;}});
assert.deepEqual(new ConversationSession(actorSession(),def.people![0].conversation!).frame().pages,['First visit.']);
assert.deepEqual(new ConversationSession(actorSession(),def.people![0].conversation!).frame().pages,['Second visit.']);
assert.equal(actorState.values['talk.shop.guide.cursor'],1);
const removed=structuredClone(scene);for(const group of ['people','readables','rests','exits'] as const)removeManifestContent(removed,group,({people:'guide',readables:'notice',rests:'seat',exits:'door'})[group]);
const removedDef=manifestDemoScene(composition,{},{},removed,receiver.get('demo-manifest-gameplay').value as any);assert.equal(removedDef.people!.length,0);assert.equal(removedDef.exits.length,0);assert.equal(removedDef.readables,undefined);assert.equal(removedDef.rests,undefined);
assert.throws(()=>addManifestContent(structuredClone(scene),'people','guide','resident'),/already exists/);
assert.throws(()=>addManifestContent(structuredClone(scene),'people','__proto__','resident'),/valid content ID/);
for(const change of [(d:any)=>{d.manifest.people.guide='new-checkpoint';},(d:any)=>{delete d.manifest.rests.seat;},(d:any)=>{d.manifest.exits.extra='new-checkpoint';},(d:any)=>{d.rests[0].kind='unknown';}]){const bad=structuredClone(scene);change(bad);assert.throws(()=>validateManifestSources(composition,bad,receiver.get('demo-manifest-gameplay').value));}
assert.equal((receiver.get('demo-counter-scene').value as any).uses[0].access[0].reason,'Pending authored refusal');assert.equal((receiver.get('harbor-shift-scene').value as any).objectives[0].text,'Pending harbor objective');assert.equal(def.uses![0].x,360);assert.equal(def.objective!({}),'Pending authored task');let state={flags:{},items:{},tokens:0};const session=new GameplaySession(def.gameplay!,{read:()=>state,write:v=>{state=v;}});def.uses![0].use({gameplay:session,flags:state.flags} as any);assert.equal(def.objective!(state.flags),'Sample task complete');assert.equal(Object.keys(SCENES).length,19);assert.equal('manifestDemo'in SCENES,false);
for(const exit of [{to:'missing'}, {to:'downtown',at:'missing'}]){const bad=structuredClone(scene);Object.assign(bad.exits[0],exit);const before=model.edits();assert.throws(()=>model.importDocuments([{id:'demo-manifest-scene',value:bad}]));assert.deepEqual(model.edits(),before);}
const bad=structuredClone(scene);bad.manifest.uses.checkpoint='missing';const edits=model.edits();assert.throws(()=>model.importDocuments([{id:'demo-manifest-scene',value:bad}]));assert.deepEqual(model.edits(),edits);
assert.throws(()=>validateManifestSources(composition,{...scene,manifest:{...scene.manifest,version:2}},def.gameplay));
const scratch=path.resolve('../../.scene-system/manifest-pilot-check');fs.mkdirSync(scratch,{recursive:true});const root=fs.mkdtempSync(path.join(scratch,'run-'));
try{
 for(const descriptor of sourceDocuments){const target=path.join(root,descriptor.file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(game,descriptor.file),target);}
 const store=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments});const saved=store.save(model.edits().map(e=>({...e,revision:store.read(e.id).revision})));assert.equal((store.read('demo-manifest-scene').value as any).manifest.uses.checkpoint,'new-checkpoint');
 const loaded=manifestDemoScene(store.read('demo-manifest').value as Composition,{},{},store.read('demo-manifest-scene').value as any,store.read('demo-manifest-gameplay').value as any);assert.equal(loaded.people![0].conversation,'talk.shop.guide');assert.equal(loaded.exits[0].at,'shop');assert.equal(loaded.rests![0].x,360);
 const before=store.list();assert.throws(()=>store.save([{id:'demo-manifest-scene',revision:store.read('demo-manifest-scene').revision,value:bad}]));assert.deepEqual(store.list(),before);store.undo(saved.transaction,Object.fromEntries(saved.documents.map(d=>[d.id,d.revision])));assert.deepEqual(store.read('demo-manifest-scene').value,documents.find(d=>d.id==='demo-manifest-scene')!.value);
}finally{assert(path.resolve(root).startsWith(scratch+path.sep));fs.rmSync(root,{recursive:true,force:true});}
console.log('Manifest pilot PASS: added registered art/people/readable/rest/exit, rebound interaction, persistent native actor conversation and story time without TypeScript edits, native completion, atomic missing-reference rejection, history/portable bundle/protected source save/reload/undo, campaign registry preserved.');
