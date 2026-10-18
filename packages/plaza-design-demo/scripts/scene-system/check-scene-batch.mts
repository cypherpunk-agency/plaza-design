import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
/** Focused migration integration: pending source/history, protected saves and fixtures. */
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';
import {SCENES} from '../../src/ssg/game/scenes';
import {createSequenceValidationContext} from '../../src/ssg/game/authoring/sequence-preview';
import {art} from '../../src/ssg/game/art';
import {ComposerModel} from '../../src/ssg/game/authoring/app';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {gameplayScenes} from '../../src/ssg/game/authoring/gameplay-scenes';
import {playScenes,validatePlayFixtures,defaultPlayFixture} from '../../src/ssg/game/authoring/play-fixtures';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import {nativeSceneAdapters} from '../../src/ssg/game/authoring/scene-adapters';
import type {Composition} from '../../src/ssg/game/art';
const game=path.resolve('src/ssg/game');
const docs=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'test',value:JSON.parse(fs.readFileSync(path.join(game,d.file),'utf8'))}));
const validate=(doc:any,documents:typeof docs)=>{if(doc.id===docs[0].id)validateSourceDocuments(new Map(documents.map(d=>[d.id,d.value])));};
const context=createSequenceValidationContext(art,{},Object.fromEntries(Object.entries(SCENES).map(([id,s])=>[id,s.exits.map(e=>e.id)])));
const model=new ComposerModel(art,context,validate);model.load(docs);
for(const s of gameplayScenes.filter(s=>['shop','library','laundromat'].includes(s.id))){
 const id=s.prefix+'-scene',d=structuredClone(model.get(id).value) as any;d.uses[0].routes[0].pages=['Pending '+s.id];d.people[0].talk[0]=['Pending speaker '+s.id];model.edit(id,'Edit '+s.id,()=>d);
 const content=s.validateScene(model.get(id).value,s.validateGameplay(model.get(s.prefix+'-gameplay').value));
 const def=s.definition(model.get(s.id).value as Composition,{},{},content,s.validateGameplay(model.get(s.prefix+'-gameplay').value));
 assert.equal(def.people!.find(p=>p.id===content.people![0].id)!.talk![0][0],'Pending speaker '+s.id);
 assert.equal(def.objective,undefined);assert.equal(def.storyMinute,undefined);
 assert.deepEqual(def.data,nativeSceneAdapters[s.id].definition(model.get(s.id).value as Composition,{},{reduced:false}).data);
}
const shopGame=structuredClone(model.get('shop-gameplay').value) as any;shopGame.purchases['shop.goods'].basePrice=4;model.edit('shop-gameplay','Edit shared purchase',()=>shopGame);
const demoGame=structuredClone(model.get('demo-counter-gameplay').value) as any;demoGame.purchases['demo.goods'].basePrice=3;demoGame.state['demo.stock'].default=7;model.edit('demo-counter-gameplay','Edit demo purchase/state',()=>demoGame);
const session=new GameplaySession(shopGame,{read:()=>({flags:{},items:{},tokens:20}),write:()=>{}});assert.equal(session.quote('shop.goods').quote,4);
const legacy=structuredClone(shopGame);delete legacy.state;delete legacy.purchases;for(const[id,c]of Object.entries(legacy.commands) as any){c.actions=[{tokens:-1},{item:id.replace('shop.buy-',''),add:1}];}const beforeLegacy=model.edits();assert.throws(()=>model.importDocuments([{id:'shop-gameplay',value:legacy}]),/migration/);assert.deepEqual(model.edits(),beforeLegacy);
const bundle=createDocumentBundle(model.edits(),model.list()),receiver=new ComposerModel(art,context,validate);receiver.load(docs);receiver.importDocuments(readDocumentBundle(bundle,receiver.list()));assert.equal(receiver.edits().length,5);receiver.undo();assert.equal(receiver.dirty(),false);receiver.redo();assert.equal(receiver.edits().length,5);
for(const scene of playScenes)assert.equal(validatePlayFixtures({version:1,fixtures:[defaultPlayFixture(scene)]},true).fixtures[0].scene,scene);
const scratch=path.resolve('../../.scene-system/scene-batch-check');fs.mkdirSync(scratch,{recursive:true});const root=fs.mkdtempSync(path.join(scratch,'run-'));
try{for(const descriptor of sourceDocuments){const target=path.join(root,descriptor.file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(game,descriptor.file),target);}
 const store=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments});const edits=model.edits().map(e=>({...e,revision:store.read(e.id).revision}));const saved=store.save(edits);for(const e of edits)assert.deepEqual(store.read(e.id).value,e.value);
 const sceneEdit=edits.find(e=>e.id==='library-scene')!;const before=store.list(),bad=structuredClone(sceneEdit.value) as any;bad.people[0].id='unknown';assert.throws(()=>store.save([{id:edits[0].id,revision:store.read(edits[0].id).revision,value:docs.find(d=>d.id===edits[0].id)!.value},{id:sceneEdit.id,revision:store.read(sceneEdit.id).revision,value:bad}]));assert.deepEqual(store.list(),before);
 store.undo(saved.transaction,Object.fromEntries(saved.documents.map(d=>[d.id,d.revision])));for(const e of edits)assert.deepEqual(store.read(e.id).value,docs.find(d=>d.id===e.id)!.value);
}finally{assert.ok(path.resolve(root).startsWith(scratch+path.sep));fs.rmSync(root,{recursive:true,force:true});}
console.log('Scene batch PASS: three pending native factories, purchase/state edits, legacy edit rejection, portable atomic history, five fixtures, grouped protected save/reload/rejection/undo.');
