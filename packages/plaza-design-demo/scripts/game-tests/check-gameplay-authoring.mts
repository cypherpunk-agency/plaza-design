/** Current harbor pending documents, ordinary/cabled commands, history and protected source Save. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createSequenceValidationContext} from '../../src/ssg/game/art/core/sequence-context';
import {ComposerModel} from '../../src/ssg/game/authoring/composer-model';
import {art} from '../../src/ssg/game/art';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {pendingRegistry} from '../../src/ssg/game/authoring/pending-registry';
import {AuthoringStore,StoreError} from '../../src/ssg/game/authoring/server/store';
import {startAuthoringServer} from '../../src/ssg/game/authoring/server/http';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';
import {validateGameplay} from '../../src/ssg/game/engine/gameplay/validation';
import {createDeliveryGameplayFixture} from './delivery-gameplay-fixture.mts';
import type {SceneCatalogue} from '../../src/ssg/game/engine/gameplay/scene-catalogue';
const id='authored-scenes',game=path.resolve('src/ssg/game');
const documents=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'fixture',value:JSON.parse(fs.readFileSync(path.join(game,d.file),'utf8'))}));
const original=structuredClone(documents.find(d=>d.id===id)!.value) as SceneCatalogue,edited=structuredClone(original);
const shed=edited.scenes.find(s=>s.scene.id==='harbor-shed')!;
shed.gameplay.conversations['supervisor-shift'].nodes.assigned.pages=['A revised delivery assignment.'];
shed.gameplay.commands['shift.accept'].when={all:[{state:'shift.tagReceived',is:false},{tokensAtLeast:0}]};
shed.gameplay.commands['shift.issue-tag'].actions[0]={item:'shift.tag',add:2};
shed.gameplay.reactions.push({event:'parcel.collected',command:'shift.issue-tag'});
const validate=(doc:{id:string},all:typeof documents)=>{if(doc.id===id)validateSourceDocuments(new Map(all.map(d=>[d.id,d.value])));};
const model=new ComposerModel(art,createSequenceValidationContext(art,{}),validate);model.load(documents);
model.edit(id,'Revise delivery assignment',()=>edited);assert(model.dirty(id));
model.undo();assert.deepEqual(model.get(id).value,original);assert(!model.dirty(id));model.redo();
const receiver=new ComposerModel(art,createSequenceValidationContext(art,{}),validate);receiver.load(documents);
receiver.importDocuments(readDocumentBundle(JSON.stringify(createDocumentBundle(model.edits(),model.list())),receiver.list()));
assert.deepEqual(receiver.get(id).value,edited);receiver.undo();assert.deepEqual(receiver.get(id).value,original);receiver.redo();
const invalid=structuredClone(edited);invalid.scenes.find(s=>s.scene.id==='harbor-shed')!.gameplay.commands['shift.accept'].when={flag:'missing'};
const before=receiver.list();assert.throws(()=>receiver.edit(id,'Break reference',()=>invalid),/unknown reference/);assert.deepEqual(receiver.list(),before);
assert.throws(()=>receiver.importDocuments([{id,value:invalid}]),/unknown reference/);assert.deepEqual(receiver.list(),before);
function exercise(value:SceneCatalogue,signal:boolean,page='A revised delivery assignment.'){
 const registry=pendingRegistry(new Map(documents.map(d=>[d.id,d.id===id?value:d.value])));
 const definitions=['harbor-shed','harbor-yard','harbor-checkout'].map(id=>registry[id].gameplay!);
 // The test laboratory joins current definitions; production keeps one session per zone.
 const definition=validateGameplay({version:1,sharedState:['shift'],flags:[...new Set(definitions.flatMap(d=>d.flags))],items:[...new Set(definitions.flatMap(d=>d.items))],events:[...new Set(definitions.flatMap(d=>d.events))],commands:Object.assign({},...definitions.map(d=>d.commands)),reactions:definitions.flatMap(d=>d.reactions),conversations:Object.assign({},...definitions.map(d=>d.conversations))});
 const pilot=createDeliveryGameplayFixture(undefined,definition,'shift.deliver');
 try{
  const conversation=pilot.talk('supervisor-shift');assert.equal(conversation.frame().pages[0],page);conversation.close();
  assert.equal(pilot.gameplay.state().items['shift.tag'],2);
  assert(pilot.gameplay.dispatch('shift.collect','interaction').ok);assert.equal(pilot.gameplay.state().items['shift.tag'],4,'pending reaction invokes edited action');
  if(signal){pilot.model.act('scanner','parcel','scan');pilot.advance(149);assert.equal(pilot.gameplay.state().values!.shift.parcelDelivered,false);pilot.advance(1);}
  else assert(pilot.gameplay.dispatch('shift.deliver','interaction').ok);
  assert.equal(pilot.gameplay.state().values!.shift.parcelDelivered,true);
  return pilot.gameplay.state();
 }finally{pilot.dispose();}
}
assert.deepEqual(exercise(edited,false),exercise(edited,true));
const scratch=path.resolve('../../.game-test-output/gameplay-authoring-tests');fs.mkdirSync(scratch,{recursive:true});const root=fs.mkdtempSync(path.join(scratch,'run-'));
const descriptor=sourceDocuments.find(d=>d.id===id)!,sourceBefore=fs.readFileSync(path.join(game,descriptor.file),'utf8');
try{
 for(const doc of sourceDocuments){const target=path.join(root,doc.file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(game,doc.file),target);}
 const store=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments}),loaded=store.read(id);
 const saved=store.save([{id,revision:loaded.revision,value:edited}]);
 const reloaded=store.read(id).value as SceneCatalogue;assert.deepEqual(reloaded,edited);assert.deepEqual(exercise(reloaded,false),exercise(reloaded,true));
 assert.throws(()=>store.save([{id,revision:loaded.revision,value:original}]),(e:unknown)=>e instanceof StoreError&&e.code==='conflict');
 const composition=store.read('downtown'),comp=structuredClone(composition.value) as {instances:{placement:{x:number}}[]};comp.instances[0].placement.x+=1;
 const allBefore=store.list();assert.throws(()=>store.save([{id:'downtown',revision:composition.revision,value:comp},{id,revision:store.read(id).revision,value:invalid}]),(e:unknown)=>e instanceof StoreError&&e.code==='invalid');assert.deepEqual(store.list(),allBefore);
 const undo=store.undo(saved.transaction,{[id]:saved.documents[0].revision});assert.deepEqual(store.read(id).value,original);store.undo(undo.transaction,{[id]:undo.documents[0].revision});assert.deepEqual(store.read(id).value,edited);
 if(process.argv.includes('--http')){
  const api=await startAuthoringServer({store,editorOrigin:'http://127.0.0.1:4202'});
  try{
   const headers={Origin:'http://127.0.0.1:4202','x-authoring-token':api.token,'Content-Type':'application/json'};
   assert.equal((await fetch(api.url+'/documents',{headers:{Origin:headers.Origin}})).status,403);
   const current=await(await fetch(api.url+'/documents/'+id,{headers})).json() as {revision:string;value:SceneCatalogue};
   const httpEdit=structuredClone(current.value),page='Protected HTTP save round trip.';
   httpEdit.scenes.find(s=>s.scene.id==='harbor-shed')!.gameplay.conversations['supervisor-shift'].nodes.assigned.pages=[page];
   const body=JSON.stringify({edits:[{id,revision:current.revision,value:httpEdit}]});
   assert.equal((await fetch(api.url+'/save',{method:'POST',headers,body})).status,200);
   assert.equal((await fetch(api.url+'/save',{method:'POST',headers,body})).status,409);
   const after=await(await fetch(api.url+'/documents/'+id,{headers})).json() as {revision:string;value:SceneCatalogue};
   assert.deepEqual(exercise(after.value,false,page),exercise(after.value,true,page));
   assert.equal((await fetch(api.url+'/save',{method:'POST',headers,body:JSON.stringify({edits:[{id,revision:after.revision,value:invalid}]})})).status,422);
   assert.deepEqual(store.read(id).value,httpEdit);
  }finally{await api.close();}
 }
 assert.equal(fs.readFileSync(path.join(game,descriptor.file),'utf8'),sourceBefore);
 console.log('Current harbor gameplay authoring PASS: pending dialogue/action/reaction, delayed cabled delivery, undo/redo, bundle, protected Save/reload/conflict and grouped rejection.');
}finally{const resolved=fs.realpathSync(root),allowed=fs.realpathSync(scratch);assert(resolved.startsWith(allowed+path.sep));fs.rmSync(resolved,{recursive:true,force:true});}
