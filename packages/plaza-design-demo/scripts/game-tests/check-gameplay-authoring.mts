/** Focused pending-document and protected-source acceptance. Never changes repository source. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ComposerModel } from '../../src/ssg/game/authoring/app';
import { art } from '../../src/ssg/game/art';
import { sourceDocuments,validateSourceDocuments } from '../../src/ssg/game/authoring/source-documents';
import { AuthoringStore,StoreError } from '../../src/ssg/game/authoring/server/store';
import { startAuthoringServer } from '../../src/ssg/game/authoring/server/http';
import { createDocumentBundle,readDocumentBundle } from '../../src/ssg/game/authoring/document-bundle';
import { validateShiftGameplay } from '../../src/ssg/game/scenes/harbor-shift/gameplay-contract';
import { SHIFT_GAMEPLAY } from '../../src/ssg/game/scenes/harbor-shift/gameplay';
import { createGameplayPilot } from './shift-pilot-fixture.mts';
import type { GameplayDefinition } from '../../src/ssg/game/engine/gameplay/types';
const id='harbor-shift-gameplay';
const descriptor=sourceDocuments.find(d=>d.id===id)!;assert.equal(descriptor.kind,'gameplay');
const original=structuredClone(SHIFT_GAMEPLAY),edited=structuredClone(original);
edited.conversations.supervisor.nodes.offer.pages=['A revised delivery assignment.'];
edited.conversations.supervisor.nodes.offer.choices![0].label='Accept revised assignment';
edited.conversations.supervisor.nodes.offer.choices![0].when={flag:'shift:checked',is:false};
edited.commands['shift.accept'].when={all:[{flag:'shift:assigned',is:false},{tokensAtLeast:0}]};
edited.commands['shift.issue-tag'].actions[0]={item:'shift.tag',add:2};
edited.reactions.push({event:'case.collected',command:'shift.issue-tag'});
validateShiftGameplay(edited);
const validate=(doc:{kind:string;id:string;value:unknown})=>{if(doc.kind==='gameplay'){assert.equal(doc.id,id);validateShiftGameplay(doc.value);}};
const model=new ComposerModel(art,{},validate);
model.load([{id,kind:'gameplay',revision:'original-source',value:original}]);
assert.throws(()=>new ComposerModel(art).load(model.list()),/validator/);
model.edit(id,'Revise delivery assignment',()=>edited);assert.equal(model.dirty(id),true);
model.undo();assert.deepEqual(model.get(id).value,original);assert.equal(model.dirty(id),false);model.redo();assert.deepEqual(model.get(id).value,edited);
const bundle=createDocumentBundle(model.edits(),model.list());assert.equal(bundle.documents[0].kind,'gameplay');
const receiver=new ComposerModel(art,{},validate);receiver.load([{id,kind:'gameplay',revision:'receiving-source',value:original}]);
receiver.importDocuments(readDocumentBundle(JSON.stringify(bundle),receiver.list()));assert.deepEqual(receiver.get(id).value,edited);assert.equal(receiver.get(id).revision,'receiving-source');receiver.undo();assert.deepEqual(receiver.get(id).value,original);receiver.redo();
const before=receiver.list(),invalid=structuredClone(edited);invalid.commands['shift.credit-wages'].when={flag:'missing'};
assert.throws(()=>receiver.edit(id,'Break condition reference',()=>invalid),/unknown reference/);assert.deepEqual(receiver.list(),before);
assert.throws(()=>receiver.importDocuments([{id,value:invalid}]),/unknown reference/);assert.deepEqual(receiver.list(),before);
const missing=structuredClone(edited);delete missing.commands['shift.deliver'];assert.doesNotThrow(()=>validateShiftGameplay(missing),'cross-document interaction refs validate at assembly');
const duplicate=structuredClone(edited);duplicate.reactions.push(duplicate.reactions[0]);assert.doesNotThrow(()=>validateShiftGameplay(duplicate),'same shared reaction semantics as all scenes');
function exercise(definition:GameplayDefinition,signal:boolean){
 const pilot=createGameplayPilot(undefined,definition);
 try{
  const conversation=pilot.talk('supervisor');assert.equal(conversation.frame().pages[0],'A revised delivery assignment.');assert.equal(conversation.frame().choices![0].label,'Accept revised assignment');
  assert.equal(conversation.choose('accept').ok,true);assert.equal(pilot.gameplay.state().items['shift.tag'],2);
  pilot.gameplay.dispatch('shift.collect','interaction');
  if(signal){pilot.model.act('scanner','parcel','scan');pilot.advance(150);}else assert.equal(pilot.gameplay.dispatch('shift.deliver','interaction').ok,true);
  assert.equal(pilot.gameplay.state().flags['shift:delivered'],true);
  pilot.gameplay.dispatch('shift.collect-case','interaction');assert.equal(pilot.gameplay.state().items['shift.tag'],4,'edited event wiring invokes the edited action');
  return pilot.gameplay.state();
 }finally{pilot.dispose();}
}
assert.deepEqual(exercise(edited,false),exercise(edited,true));
const game=path.resolve('src/ssg/game'),scratch=path.resolve('../../.game-test-output/gameplay-authoring-tests');fs.mkdirSync(scratch,{recursive:true});const root=fs.mkdtempSync(path.join(scratch,'run-'));
const sourceBefore=fs.readFileSync(path.join(game,descriptor.file),'utf8');
try{
 for(const doc of sourceDocuments){const target=path.join(root,doc.file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(game,doc.file),target);}
 const store=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments}),loaded=store.read(id);
 const saved=store.save([{id,revision:loaded.revision,value:edited}]);assert.equal(store.read(id).kind,'gameplay');
 const reloaded=validateShiftGameplay(store.read(id).value);assert.deepEqual(reloaded,edited);assert.deepEqual(exercise(reloaded,false),exercise(reloaded,true));
 assert.throws(()=>store.save([{id,revision:loaded.revision,value:original}]),(error:unknown)=>error instanceof StoreError&&error.code==='conflict');
 const composition=store.read('harborShift'),comp=structuredClone(composition.value) as {instances:{placement:{x:number}}[]};comp.instances[0].placement.x+=1;
 const allBefore=store.list();assert.throws(()=>store.save([{id:'harborShift',revision:composition.revision,value:comp},{id,revision:store.read(id).revision,value:invalid}]),(error:unknown)=>error instanceof StoreError&&error.code==='invalid');assert.deepEqual(store.list(),allBefore,'grouped invalid save writes neither document');
 const undo=store.undo(saved.transaction,{[id]:saved.documents[0].revision});assert.deepEqual(store.read(id).value,original);store.undo(undo.transaction,{[id]:undo.documents[0].revision});assert.deepEqual(store.read(id).value,edited);
 if(process.argv.includes('--http')){
  const api=await startAuthoringServer({store,editorOrigin:'http://127.0.0.1:4202'});
  try{
   const headers={Origin:'http://127.0.0.1:4202','x-authoring-token':api.token,'Content-Type':'application/json'};
   assert.equal((await fetch(api.url+'/documents',{headers:{Origin:headers.Origin}})).status,403,'session token required');
   const current=await(await fetch(api.url+'/documents/'+id,{headers})).json() as {revision:string;value:GameplayDefinition};
   const httpEdit=structuredClone(current.value);httpEdit.conversations.supervisor.nodes.offer.pages=['Protected HTTP save round trip.'];
   const body=JSON.stringify({edits:[{id,revision:current.revision,value:httpEdit}]});
   assert.equal((await fetch(api.url+'/save',{method:'POST',headers,body})).status,200);
   assert.equal((await fetch(api.url+'/save',{method:'POST',headers,body})).status,409,'stale browser save conflicts');
   const after=await(await fetch(api.url+'/documents/'+id,{headers})).json() as {revision:string;value:GameplayDefinition};
   const p=createGameplayPilot(undefined,after.value);assert.equal(p.talk('supervisor').frame().pages[0],'Protected HTTP save round trip.');p.dispose();
   assert.equal((await fetch(api.url+'/save',{method:'POST',headers,body:JSON.stringify({edits:[{id,revision:after.revision,value:invalid}]})})).status,422,'dangling flag rejected by HTTP service');
   assert.deepEqual(store.read(id).value,httpEdit);
   console.log('Protected gameplay HTTP PASS: token enforcement, Save→GET reload→native conversation, stale revision 409 and invalid reference 422.');
  }finally{await api.close();}
 }
 assert.equal(fs.readFileSync(path.join(game,descriptor.file),'utf8'),sourceBefore,'repository source preserved');
 console.log('Gameplay authoring PASS: actual ComposerModel undo/redo and atomic import, strict actual references, pending native ordinary/wired parity, source save/reload/conflict/group rollback/source undo-redo.');
}finally{const resolved=fs.realpathSync(root),allowed=fs.realpathSync(scratch);assert.ok(resolved.startsWith(allowed+path.sep));fs.rmSync(resolved,{recursive:true,force:true});}
