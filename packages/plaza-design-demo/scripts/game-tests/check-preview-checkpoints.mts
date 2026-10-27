import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {PROMPT_REACH} from '../../src/ssg/game/engine/level';
import {art} from '../../src/ssg/game/art';
import {ComposerModel} from '../../src/ssg/game/authoring/composer-model';
import {sourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {sceneCatalogueProjection} from '../../src/ssg/game/authoring/scene-catalogue-projection';
import {pendingRegistry} from '../../src/ssg/game/authoring/pending-registry';
import {defaultPlayFixture,type PlayFixture,type PlayFixtures} from '../../src/ssg/game/world/checkpoints';
import {validatePendingFixtures} from '../../src/ssg/game/authoring/pending-fixtures';
import {checkpointSeed,reconstructCheckpoint} from '../../src/ssg/game/authoring/checkpoint';
import {createSequenceValidationContext} from '../../src/ssg/game/art/core/sequence-context';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';

const documents=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'test',value:JSON.parse(fs.readFileSync(path.join('src/ssg/game',d.file),'utf8'))}));
const values=new Map(documents.map(d=>[d.id,d.value])),registry=pendingRegistry(values),before=JSON.stringify([...values]);
const fixture:PlayFixture={...defaultPlayFixture('boundary-west' as PlayFixture['scene']),id:'boundary-checkpoint',composition:'boundary-example',sequence:{id:'boundary-pan',time:3},tokens:37,state:{doorOpen:true}};
const seed=checkpointSeed(fixture,values,registry);assert.equal(seed.seed.state.tokens,37);
const zero=reconstructCheckpoint({...fixture,sequence:{id:'boundary-pan',time:0}},values,registry),middle=reconstructCheckpoint(fixture,values,registry);
assert.equal(middle.sequence?.time,3);assert.deepEqual(middle.sequence!.receipts,[],'No past markers exist in this camera-only sequence');assert.equal(middle.save.tokens,37);
assert.equal(middle.save.gameplay!['boundary-door'].open,true,'Reconstruction preserves the explicitly bound world-state value');assert.equal(middle.save.gameplay!['boundary-west'].doorOpen,undefined,'No scalar alias is serialized at the local declaration');
const glide=reconstructCheckpoint({...defaultPlayFixture('harbor-station'),sequence:{id:'glide',time:44}},values,registry);assert(glide.sequence!.receipts.length===2,'Real opening markers are reconstructed before private Play starts');
const glideZero=reconstructCheckpoint({...defaultPlayFixture('harbor-station'),sequence:{id:'glide',time:0}},values,registry);
assert.notDeepEqual(glide.save.scenes,glideZero.save.scenes,'Checkpoint reconstructs real opening movers at the authored time');
assert.notDeepEqual(middle.save.scenes,zero.save.scenes,'The real ambient vehicle path continues during camera-only direction');
assert.deepEqual(reconstructCheckpoint(fixture,values,registry),middle,'Reconstruction is deterministic and isolated');
assert.equal(JSON.stringify([...values]),before,'Reconstruction never writes authored sources');
const all=structuredClone(values.get('play-fixtures')) as PlayFixtures;all.fixtures.push(fixture);validatePendingFixtures(all,values);
for(const patch of [{sequence:{id:'missing',time:0}},{sequence:{id:'boundary-pan',time:10000}},{composition:'missing'},{spawn:1e5},{membership:{'boundary-example':[]}}]){
 const bad=structuredClone(all);Object.assign(bad.fixtures.at(-1)!,patch);assert.throws(()=>validatePendingFixtures(bad,values));
}
const make=()=>{const model=new ComposerModel(art,createSequenceValidationContext(art,{}),(doc,docs)=>{if(doc.id==='play-fixtures')validatePendingFixtures(doc.value,new Map(docs.map(d=>[d.id,d.value])));},[sceneCatalogueProjection]);model.load(documents);return model;};
const model=make();model.edit('play-fixtures','Author checkpoint',()=>all);assert.equal((model.get('play-fixtures').value as PlayFixtures).fixtures.at(-1)!.sequence!.time,3);
const bundle=createDocumentBundle(model.edits(),model.list()),restored=make();restored.importDocuments(readDocumentBundle(bundle,restored.list()));assert.deepEqual((restored.get('play-fixtures').value as PlayFixtures).fixtures.at(-1),fixture);
const valid=JSON.stringify(model.list());assert.throws(()=>model.edit('play-fixtures','Broken link',value=>{(value as PlayFixtures).fixtures.at(-1)!.sequence!.id='missing';return value;}));assert.equal(JSON.stringify(model.list()),valid,'Invalid edits reject atomically');
model.undo();assert(!(model.get('play-fixtures').value as PlayFixtures).fixtures.some(f=>f.id===fixture.id));model.redo();assert((model.get('play-fixtures').value as PlayFixtures).fixtures.some(f=>f.id===fixture.id));
console.log('Checkpoint reconstruction: seeded state, real movers, receipts, invalid starts, source identity, history and bundle');

const review=all.fixtures.filter(f=>f.id.startsWith('review-'));assert.equal(review.length,5);
for(const f of review){const restored=reconstructCheckpoint(f,values,registry);assert.equal(restored.save.scene,f.scene);if(f.sequence)assert.equal(restored.sequence!.time,f.sequence.time);}
const impossible=structuredClone(all),arrival=impossible.fixtures.find(f=>f.id==='review-arrival')!;arrival.membership=structuredClone(review.find(f=>f.id==='review-world')!.membership);assert.throws(()=>validatePendingFixtures(impossible,values),/origin is not mounted/);

const firstTask=review.find(f=>f.id==='review-first-task')!;assert(Math.abs(firstTask.spawn!-registry[firstTask.scene].uses.find(u=>u.id==='boss')!.x)<PROMPT_REACH,'the first-task review starts beside the resolved supervisor, including asset attachments');
