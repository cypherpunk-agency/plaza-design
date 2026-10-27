import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {Element} from './rules-harness.mts';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';
import {ComposerModel} from '../../src/ssg/game/authoring/composer-model';
import {art} from '../../src/ssg/game/art';
import {createSequenceValidationContext} from '../../src/ssg/game/art/core/sequence-context';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {sceneCatalogueProjection} from '../../src/ssg/game/authoring/scene-catalogue-projection';
import {mountSceneAuthoring} from '../../src/ssg/game/authoring/scene-authoring';
import {pendingRegistry} from '../../src/ssg/game/authoring/pending-registry';
const documents=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'fixture',value:JSON.parse(fs.readFileSync(path.join('src/ssg/game',d.file),'utf8'))}));
const model=new ComposerModel(art,createSequenceValidationContext(art,{}),()=>{},[sceneCatalogueProjection]);model.load(documents);
let opened:string[]=[];
const context:any={get documents(){return model.inspectDocuments();},authoring:{snapshot:()=>model.inspectDocuments(),get:(id:string)=>model.get(id),edit:(id:string,label:string,value:unknown)=>model.edit(id,label,()=>value)},openConversation:(...args:string[])=>opened=args};
const host=new Element(),rows=(e:Element):Element[]=>[e,...e.children.flatMap(rows)];
// Selecting a real catalogue actor used to call the native-only assembler and throw.
let handle=mountSceneAuthoring(host as any,context,{scene:'harbor-shed',fixed:true,focus:{only:['actor:boss']}});
assert(rows(host).some(e=>e.attributes['aria-label']==='Actor action'),'Catalogue actor inspector mounts through the ordinary source assembler');handle();
handle=mountSceneAuthoring(host as any,context,{scene:'harbor-shed',fixed:true,focus:{only:['use:boss']}});
const link=rows(host).find(e=>e.textContent==='Edit conversation definition'&&e.onclick);assert(link);link.onclick!();assert.deepEqual(opened,['authored.harbor-shed-gameplay','supervisor-shift'],'An interaction opens its actual graph without a second dialogue editor');
const prompt=rows(host).find(e=>e.attributes['aria-label']==='Interaction prompt')!;assert(prompt);prompt.value='[E] REVIEW SUPERVISOR';prompt.onchange!();
const snapshot=new Map(model.inspectDocuments().filter(d=>!d.id.startsWith('authored.')).map(d=>[d.id,d.value]));validateSourceDocuments(snapshot);
const source=pendingRegistry(snapshot)['harbor-shed'];assert.equal(source.uses!.find(u=>u.id==='boss')!.label,'[E] REVIEW SUPERVISOR','The edited catalogue source reaches the shipping scene compiler');
model.undo();assert.equal(pendingRegistry(new Map(model.inspectDocuments().filter(d=>!d.id.startsWith('authored.')).map(d=>[d.id,d.value])))['harbor-shed'].uses!.find(u=>u.id==='boss')!.label,'[E] TALK TO SUPERVISOR');handle();
console.log('Catalogue inspector: actual supervisor actor, contextual interaction graph navigation, projected source edit, native reconstruction and Undo PASS');

// Roundtrip the seven real authoring sources through one portable, protected transaction.
model.redo();
model.edit('authored.harbor-shed-gameplay','Change supervisor line',(raw:any)=>{raw.conversations['supervisor-shift'].nodes.assigned.pages[0]='REVIEW SUPERVISOR';return raw;});
model.edit('authored.harbor-shed-scene','Change first objective',(raw:any)=>{raw.objectives[0].text='REVIEW OBJECTIVE';return raw;});
model.edit('sequence-opening','Change opening camera',(raw:any)=>{raw.sequence.tracks.find((t:any)=>t.id==='camera-east').keys[1].value=1970;return raw;});
model.edit('authored.harbor-station','Change vehicle and passengers',(raw:any)=>{raw.instances.find((n:any)=>n.id==='service').props.vehicle.doors.open=.85;raw.instances.find((n:any)=>n.id==='passengers').props.flow.spawn.every=9;return raw;});
model.edit('play-fixtures','Change morning checkpoint',(raw:any)=>{raw.fixtures.find((f:any)=>f.id==='harbor-commute').tokens=11;return raw;});
model.edit('world-compositions','Change membership and endpoint',(raw:any)=>{raw.groups['boundary-display-original'].members[0].placement.x=40;raw.groups['boundary-street'].connections[0].a.instance='surface';return raw;});
const receiver=new ComposerModel(art,createSequenceValidationContext(art,{}),()=>{},[sceneCatalogueProjection]);receiver.load(documents);receiver.importDocuments(readDocumentBundle(createDocumentBundle(model.edits(),model.list()),receiver.list()));
const output=path.resolve('../../.game-test-output'),root=fs.mkdtempSync(path.join(output,'prologue-source-save-'));
try{
 for(const d of sourceDocuments){const file=path.join(root,d.file);fs.mkdirSync(path.dirname(file),{recursive:true});fs.copyFileSync(path.join('src/ssg/game',d.file),file);}
 const store=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments});
 const transaction=store.save(receiver.edits().map(d=>({...d,revision:store.read(d.id).revision}))),fresh=new Map(store.list().map(d=>[d.id,d.value])),native=pendingRegistry(fresh);
 const station=native['harbor-station'];assert.equal(station.level!.vehicles!.find(v=>v.id==='service')!.source.doors.open,.85);assert.equal(station.peopleFlows![0].flow.spawn.every,9);
 assert.equal(native['harbor-shed'].uses!.find(u=>u.id==='boss')!.label,'[E] REVIEW SUPERVISOR');assert.equal(native['harbor-shed'].gameplay!.conversations['supervisor-shift'].nodes.assigned.pages[0],'REVIEW SUPERVISOR');
 const source=fresh.get('authored-scenes') as any;assert.equal(source.scenes.find((e:any)=>e.scene.id==='harbor-shed').scene.objectives[0].text,'REVIEW OBJECTIVE');
 assert.equal((fresh.get('sequence-opening') as any).sequence.tracks.find((t:any)=>t.id==='camera-east').keys[1].value,1970);
 assert.equal((fresh.get('play-fixtures') as any).fixtures.find((f:any)=>f.id==='harbor-commute').tokens,11);
 const world=fresh.get('world-compositions') as any;assert.equal(world.groups['boundary-display-original'].members[0].placement.x,40);assert.equal(world.groups['boundary-street'].connections[0].a.instance,'surface');
 store.undo(transaction.transaction,Object.fromEntries(transaction.documents.map(d=>[d.id,d.revision])));
 for(const d of sourceDocuments)assert.equal(fs.readFileSync(path.join(root,d.file),'utf8'),fs.readFileSync(path.join('src/ssg/game',d.file),'utf8'),'Protected Undo restores the original source bytes');
}finally{assert(root.startsWith(output+path.sep));fs.rmSync(root,{recursive:true,force:true});}
console.log('Prologue source persistence PASS: camera, chunk/connection, supervisor objective/dialogue, vehicle, passenger and checkpoint bundle/protected Save/native reconstruction/byte Undo');
