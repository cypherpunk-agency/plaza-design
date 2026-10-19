import {addManifestContent} from '../../src/ssg/game/engine/gameplay/manifest-content';
import {manifestCompositionRows} from '../../src/ssg/game/engine/gameplay/manifest-geometry';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {art,type Composition,type Instance} from '../../src/ssg/game/art';
import {SCENES} from '../../src/ssg/game/scenes';
import {warehouseScene} from '../../src/ssg/game/scenes/warehouse';
import {ComposerModel} from '../../src/ssg/game/authoring/app';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {createSequenceValidationContext} from '../../src/ssg/game/authoring/sequence-preview';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';
import {pendingRegistry} from '../../src/ssg/game/authoring/pending-registry';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import type {SceneDocument} from '../../src/ssg/game/engine/gameplay/scene-document';
import {actorRemovalImpact,addSceneActor,duplicateSceneActor,removeSceneActor,setActorDialogue,bindSceneActor} from '../../src/ssg/game/engine/gameplay/actor-content';
import {actorReactionIdentity,actorAppearanceSeed} from '../../src/ssg/game/engine/gameplay/actor-identity';

const root=path.resolve('src/ssg/game');
const documents=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'fixture',value:JSON.parse(fs.readFileSync(path.join(root,d.file),'utf8'))}));
const context=createSequenceValidationContext(art,{},Object.fromEntries(Object.entries(SCENES).map(([id,s])=>[id,s.exits.map(e=>e.id)])));
const make=()=>{const m=new ComposerModel(art,context,(d,docs)=>{if(d.id==='warehouse-scene')validateSourceDocuments(new Map(docs.map(d=>[d.id,d.value])));});m.load(documents);return m;};
const model=make(),prefix=(id:string)=>id==='harborShift'?'harbor-shift':id;
// No canonical actor is secretly required by a renderer after its source/dialogue/artwork is removed.
const emptyDocuments=new Map(documents.map(d=>[d.id,structuredClone(d.value)]));
for(const id of ['warehouse','shop','library','laundromat','sandbox','stacks','beach','mall','harbor','market','harborShift','capsule','yard','moth','metro','galleriaStation','harborStation','train','downtown']){
 const source=emptyDocuments.get(prefix(id)+'-scene') as SceneDocument,composition=emptyDocuments.get(id) as Composition;
 const actorArtwork=new Set(source.actors!.map(a=>a.instance)),rows=manifestCompositionRows(composition);
 const detach=(nodes:Instance[])=>{for(const n of nodes){if(!actorArtwork.has(n.id)&&n.attach&&actorArtwork.has(n.attach.instance)){const p=rows.find(r=>r.instance.id===n.id)!.placement;delete n.attach;n.placement={...n.placement,x:p.x,h:p.h};}detach(n.children??[]);}};detach(composition.instances);
 for(const actor of source.actors!)delete actor.follow;
 for(const actor of [...source.actors!])removeSceneActor(source,composition,actor.id);
}
validateSourceDocuments(emptyDocuments);
const emptyRegistry=pendingRegistry(emptyDocuments);
for(const id of ['warehouse','shop','library','laundromat','sandbox','stacks','beach','mall','harbor','market','harborShift','capsule','yard','moth','metro','galleriaStation','harborStation','train','downtown'])assert.equal((emptyRegistry[id].people??[]).length,0);
const mutate=(fn:(s:SceneDocument,c:Composition)=>void,id='warehouse')=>{const s=model.get(prefix(id)+'-scene').value as SceneDocument,c=model.get(id).value as Composition;fn(s,c);model.importDocuments([{id:prefix(id)+'-scene',value:s},{id,value:c}]);};
const native=()=>pendingRegistry(new Map(model.list().map(d=>[d.id,d.value]))).warehouse;
const original=native(),originalMech=original.people!.find(a=>actorReactionIdentity(a)==='slot-3')!;
assert.equal(actorAppearanceSeed(originalMech),3923);
mutate((s,c)=>addSceneActor(s,c,'new-resident',{body:'tall',garb:'coat'},220,12));
let created=native().people!.find(a=>a.id==='new-resident')!;
assert.equal(created.x,220);assert.equal(created.h,12);assert.equal(created.name,'RESIDENT');assert.equal(actorReactionIdentity(created),'actor.new-resident');
mutate((s,c)=>bindSceneActor(s,c,'new-resident','dock','origin',23,4));
created=native().people!.find(a=>a.id==='new-resident')!;
const bound={x:created.x,h:created.h};assert.notEqual(bound.x,220);
mutate((s,c)=>bindSceneActor(s,c,'new-resident',''));
created=native().people!.find(a=>a.id==='new-resident')!;assert.deepEqual({x:created.x,h:created.h},bound);
mutate((s,c)=>duplicateSceneActor(s,c,'new-resident','resident-copy'));
const copy=native().people!.find(a=>a.id==='resident-copy')!;assert.equal(copy.x,bound.x+24);assert.deepEqual(copy.look,created.look);assert.equal(actorReactionIdentity(copy),'actor.resident-copy');
mutate((s,c)=>duplicateSceneActor(s,c,'mech','mech-copy'));
const robot=native().people!.find(a=>actorReactionIdentity(a)==='actor.mech-copy')!;assert.equal(robot.seed,3923);assert.deepEqual(robot.look,originalMech.look);
mutate((s,c)=>bindSceneActor(s,c,'mech','','origin',700,0));assert.equal(actorAppearanceSeed(native().people!.find(a=>actorReactionIdentity(a)==='slot-3')!),3923);
mutate(s=>setActorDialogue(s,'mech',true));assert(native().people!.some(a=>a.id==='mech'&&a.name==='RESIDENT'));
mutate(s=>setActorDialogue(s,'mech',false));assert(native().people!.some(a=>a.id==='mech'&&!a.name));
mutate((s,c)=>removeSceneActor(s,c,'gull'));assert(!native().people!.some(a=>a.id==='gull'));
mutate(s=>{s.actors!.find(a=>a.id==='resident-copy')!.follow='new-resident';});
for(const id of ['shop','library','laundromat','sandbox','stacks','beach','mall','harbor','market','harborShift','capsule','yard','moth','metro','galleriaStation','harborStation','train','downtown']){
 mutate((s,c)=>addSceneActor(s,c,'new-resident',{garb:'hivis'},260,0),id);
 mutate((s,c)=>{duplicateSceneActor(s,c,'new-resident','resident-copy');bindSceneActor(s,c,'new-resident',['capsule','moth'].includes(id)?'neighbors':id==='yard'?'sky':id==='shop'?'wall':id==='sandbox'?'hall':['stacks','beach','mall','harbor','market','harborShift','capsule','yard','moth','metro','galleriaStation','harborStation','train','downtown'].includes(id)?'scene':'room','origin',240,0);},id);
 const pending=pendingRegistry(new Map(model.list().map(d=>[d.id,d.value])))[id];
 assert(pending.people!.some(p=>p.id==='new-resident'));assert(pending.people!.some(p=>p.id==='resident-copy'));
 mutate((s,c)=>removeSceneActor(s,c,'resident-copy'),id);
 assert(!pendingRegistry(new Map(model.list().map(d=>[d.id,d.value])))[id].people!.some(p=>p.id==='resident-copy'));
}
// Owned ordinary content is removed consistently; decorative attachments retain world placement.
mutate((s,c)=>{addSceneActor(s,c,'dependency-owner',{},360,0);const actor=s.actors!.find(a=>a.id==='dependency-owner')!;
 for(const group of ['uses','readables','rests','exits']as const)addManifestContent(s,group,'owned-'+group,actor.instance);
 const decoration=structuredClone(c.instances.find(n=>n.type==='train.advert')!);decoration.id='owned-decoration';decoration.attach={instance:actor.instance,anchor:'origin'};decoration.placement={x:6,h:4};c.instances.push(decoration);
},'train');
validateSourceDocuments(new Map(model.list().map(d=>[d.id,d.value])));
const ownedSource=model.get('train-scene').value as SceneDocument,ownedArt=model.get('train').value as Composition;
const impact=actorRemovalImpact(ownedSource,ownedArt,'dependency-owner');assert.deepEqual(impact.content.map(r=>r.group).sort(),['exits','readables','rests','uses']);assert(impact.attachments.includes('owned-decoration'));
const decorationBefore=manifestCompositionRows(ownedArt).find(r=>r.instance.id==='owned-decoration')!.placement;
mutate((s,c)=>removeSceneActor(s,c,'dependency-owner'),'train');
const removed=model.get('train-scene').value as SceneDocument,detached=model.get('train').value as Composition;
for(const group of ['uses','readables','rests','exits']as const)assert(!removed[group]?.some(r=>r.id==='owned-'+group));
assert.equal(detached.instances.find(n=>n.id==='owned-decoration')!.attach,undefined);assert.deepEqual(manifestCompositionRows(detached).find(r=>r.instance.id==='owned-decoration')!.placement,decorationBefore);
validateSourceDocuments(new Map(model.list().map(d=>[d.id,d.value])));
for(const structural of ['spawn','width']as const){const s=structuredClone(ownedSource),c=structuredClone(ownedArt),instance=s.actors!.find(a=>a.id==='dependency-owner')!.instance;if(structural==='spawn')s.manifest!.spawn=instance;else s.manifest!.width={instance,property:'width'};const unchanged=structuredClone([s,c]);assert.throws(()=>removeSceneActor(s,c,'dependency-owner'),/Rebind/);assert.deepEqual([s,c],unchanged,'structural owner blocks removal before mutation');}
const before=structuredClone(model.edits());
assert.throws(()=>mutate((s,c)=>removeSceneActor(s,c,'new-resident')),/follower/);assert.deepEqual(model.edits(),before);
for(const invalid of [
 (s:SceneDocument,c:Composition)=>bindSceneActor(s,c,'new-resident','missing'),
 (s:SceneDocument,c:Composition)=>bindSceneActor(s,c,'new-resident',s.actors!.find(a=>a.id==='new-resident')!.instance),
 (s:SceneDocument,c:Composition)=>bindSceneActor(s,c,'new-resident','dock','missing'),
 (s:SceneDocument,c:Composition)=>{s.actors!.find(a=>a.id==='mech')!.reaction='changed';},
 (s:SceneDocument,c:Composition)=>{c.instances=c.instances.filter(a=>a.id!==s.actors!.find(a=>a.id==='new-resident')!.instance);},
 (s:SceneDocument,c:Composition)=>addSceneActor(s,c,'new-resident',{}),
]){assert.throws(()=>mutate(invalid));assert.deepEqual(model.edits(),before);}
const receiver=make();receiver.importDocuments(readDocumentBundle(createDocumentBundle(model.edits(),model.list()),receiver.list()));
const received=pendingRegistry(new Map(receiver.list().map(d=>[d.id,d.value]))).warehouse;assert.deepEqual(received.people,native().people);
const scratch=path.resolve('../../.scene-system/actor-entities');fs.mkdirSync(scratch,{recursive:true});const dir=fs.mkdtempSync(path.join(scratch,'run-'));
for(const d of sourceDocuments){const dest=path.join(dir,d.file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,d.file),dest);}
const store=new AuthoringStore({root:dir,documents:sourceDocuments,validateAll:validateSourceDocuments});
const originals=Object.fromEntries(model.edits().map(({id})=>[id,fs.readFileSync(path.join(dir,sourceDocuments.find(d=>d.id===id)!.file),'utf8')]));
const saved=store.save(model.edits().map(e=>({...e,revision:store.read(e.id).revision})));
const reloaded=warehouseScene(store.read('warehouse').value as Composition,{},{},store.read('warehouse-scene').value as SceneDocument);
assert.deepEqual(reloaded.people,native().people);
assert.equal(actorAppearanceSeed(reloaded.people!.find(a=>actorReactionIdentity(a)==='slot-3')!),3923);
const savedRegistry=pendingRegistry(new Map(store.list().map(d=>[d.id,d.value])));
for(const id of ['shop','library','laundromat','sandbox','stacks','beach','mall','harbor','market','harborShift','capsule','yard','moth','metro','galleriaStation','harborStation','train','downtown'])assert(savedRegistry[id].people!.some(p=>p.id==='new-resident'));
model.undo();model.redo();assert.deepEqual(model.edits(),before);
store.undo(saved.transaction,Object.fromEntries(saved.documents.map(d=>[d.id,d.revision])));
for(const[id,bytes]of Object.entries(originals))assert.equal(fs.readFileSync(path.join(dir,sourceDocuments.find(d=>d.id===id)!.file),'utf8'),bytes);
fs.writeFileSync(path.join(dir,'evidence.json'),JSON.stringify({status:'PASS',scenes:['warehouse','shop','library','laundromat','sandbox','stacks','beach','mall','harbor','market','harborShift','capsule','yard','moth','metro','galleriaStation','harborStation','train','downtown'],checks:['create','duplicate human and implicit-seed robot','remove named actor','conversation toggle','attach and detach','stable reaction and appearance','follower and dangling reference rejection','atomic history','bundle','protected Save','native reload','exact byte Undo']},null,2)+'\n');
console.log('Actor entities PASS: nineteen-scene CRUD/binding/dialogue/identity, atomic rejection, history/bundle/protected Save/native reload/byte Undo. Evidence: '+dir);
