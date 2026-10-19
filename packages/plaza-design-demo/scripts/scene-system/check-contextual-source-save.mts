/** Paired scene/gameplay edits must survive every protected authoring boundary. */
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {AuthoringStore,StoreError} from '../../src/ssg/game/authoring/server/store';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {ComposerModel} from '../../src/ssg/game/authoring/app';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';
import {createSequenceValidationContext} from '../../src/ssg/game/authoring/sequence-preview';
import {art} from '../../src/ssg/game/art';import {SCENES} from '../../src/ssg/game/scenes';
import {pendingScene} from '../../src/ssg/game/authoring/pending-scene';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import type {GameplayState} from '../../src/ssg/game/engine/gameplay/types';
const base=path.resolve('../../.scene-system/contextual-source-save');fs.mkdirSync(base,{recursive:true});const root=fs.mkdtempSync(path.join(base,'run-'));
for(const d of sourceDocuments){const file=path.resolve(root,d.file);assert.ok(file.startsWith(root+path.sep));fs.mkdirSync(path.dirname(file),{recursive:true});fs.copyFileSync(path.join('src/ssg/game',d.file),file);}
const options={root,documents:sourceDocuments,validateAll:validateSourceDocuments},store=new AuthoringStore(options),initial=store.list();
const scene=structuredClone(initial.find(d=>d.id==='sandbox-scene')!.value) as any,gameplay=structuredClone(initial.find(d=>d.id==='sandbox-gameplay')!.value) as any;
gameplay.commands['sandbox.pending-command']={sources:['interaction'],actions:[{item:'blankchip',add:2}]};scene.uses[0].routes[0].command='sandbox.pending-command';scene.uses[0].routes[0].pages=['Pending paired source'];
const changes=[{id:'sandbox-scene',value:scene},{id:'sandbox-gameplay',value:gameplay}],ctx=createSequenceValidationContext(art,{},Object.fromEntries(Object.entries(SCENES).map(([id,s])=>[id,s.exits.map(e=>e.id)])));
const validate=(d:{id:string},rows:typeof initial)=>{if(d.id===initial[0].id)validateSourceDocuments(new Map(rows.map(d=>[d.id,d.value])));};
const model=new ComposerModel(art,ctx,validate);model.load(initial);model.importDocuments(changes);assert.equal(model.edits().length,2);model.undo();assert.equal(model.dirty(),false);model.redo();assert.equal(model.edits().length,2);
const receiver=new ComposerModel(art,ctx,validate);receiver.load(initial);receiver.importDocuments(readDocumentBundle(createDocumentBundle(model.edits(),model.list()),receiver.list()));assert.equal(receiver.edits().length,2);
const sourceBytes=()=>sourceDocuments.map(d=>fs.readFileSync(path.join(root,d.file),'utf8')),original=sourceBytes();
assert.throws(()=>store.save([{id:'sandbox-scene',revision:initial.find(d=>d.id==='sandbox-scene')!.revision,value:scene}]),(e:unknown)=>e instanceof StoreError&&e.code==='invalid');assert.deepEqual(sourceBytes(),original,'dangling command cannot partially enter source');
const saved=store.save(changes.map(d=>({...d,revision:initial.find(v=>v.id===d.id)!.revision})));assert.equal(saved.documents.length,2);
const reloaded=new AuthoringStore(options).list(),lookup=new Map(reloaded.map(d=>[d.id,d.value]));assert.equal((lookup.get('sandbox-scene') as any).uses[0].routes[0].command,'sandbox.pending-command');
const native=pendingScene('sandbox',lookup.get('sandbox'),{sceneDocument:lookup.get('sandbox-scene'),gameplay:lookup.get('sandbox-gameplay'),behavior:lookup.get('sandbox-behavior')});let state:GameplayState={flags:{},items:{},tokens:0};const session=new GameplaySession(native.gameplay!,{read:()=>state,write:s=>{state=s;}});assert.deepEqual(native.uses![0].use({gameplay:session} as any),['Pending paired source']);assert.equal(state.items.blankchip,2);
const undone=store.undo(saved.transaction,Object.fromEntries(saved.documents.map(d=>[d.id,d.revision])));assert.deepEqual(sourceBytes(),original,'undo restores exact original bytes across the pair');store.undo(undone.transaction,Object.fromEntries(undone.documents.map(d=>[d.id,d.revision])));assert.equal((store.read('sandbox-scene').value as any).uses[0].routes[0].command,'sandbox.pending-command');
const current=store.list(),snapshot=sourceBytes(),broken=structuredClone(gameplay);delete broken.commands['sandbox.pending-command'];assert.throws(()=>store.save([{id:'sandbox-gameplay',revision:current.find(d=>d.id==='sandbox-gameplay')!.revision,value:broken}]));assert.deepEqual(sourceBytes(),snapshot);
// Fail the second replacement; the first file must return to its paired original bytes.
const nextScene=structuredClone(scene),nextGameplay=structuredClone(gameplay);nextScene.uses[0].routes[0].command='sandbox.next-command';nextGameplay.commands['sandbox.next-command']={sources:['interaction'],actions:[{item:'blankchip',add:3}]};
const next=[{id:'sandbox-scene',value:nextScene},{id:'sandbox-gameplay',value:nextGameplay}];
const failing=new AuthoringStore({...options,beforeReplace(i){if(i===1)throw new Error('Second replacement failure');}});assert.throws(()=>failing.save(next.map(d=>({...d,revision:current.find(v=>v.id===d.id)!.revision}))),(e:unknown)=>e instanceof StoreError&&e.code==='io');assert.deepEqual(sourceBytes(),snapshot);
// A crash may leave a scene referencing a command not yet replaced. Recovery validates the
// whole restored snapshot rather than requiring the interrupted intermediate pair to be valid.
const transaction=randomUUID(),entries=next.map(d=>{const descriptor=sourceDocuments.find(s=>s.id===d.id)!;return{id:d.id,before:fs.readFileSync(path.join(root,descriptor.file),'utf8'),after:JSON.stringify(d.value,null,2)+'\n'};});
fs.writeFileSync(path.join(root,'.authoring-history',transaction+'.json'),JSON.stringify({version:1,transaction,state:'prepared',entries}));fs.writeFileSync(path.join(root,sourceDocuments.find(s=>s.id==='sandbox-scene')!.file),entries[0].after);
new AuthoringStore(options);assert.deepEqual(sourceBytes(),snapshot);assert.equal(JSON.parse(fs.readFileSync(path.join(root,'.authoring-history',transaction+'.json'),'utf8')).state,'rolled-back');
console.log('Contextual source Save PASS: new command + scene route atomically import/history/bundle/Save/reload/native Play; dangling references rejected before writes; exact-byte undo/redo, second-replacement rollback, and partial-pair crash recovery. Evidence: '+root);
