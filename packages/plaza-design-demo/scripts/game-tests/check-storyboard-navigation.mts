import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {art} from '../../src/ssg/game/art';
import {ComposerModel} from '../../src/ssg/game/authoring/composer-model';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {sceneCatalogueProjection} from '../../src/ssg/game/authoring/scene-catalogue-projection';
import {storyboardLinks} from '../../src/ssg/game/authoring/storyboard-links';
import {validateStoryboard,type Storyboard} from '../../src/ssg/game/authoring/storyboard';
import {validatePendingFixtures} from '../../src/ssg/game/authoring/pending-fixtures';
import {defaultPlayFixture,type PlayFixture,type PlayFixtures} from '../../src/ssg/game/world/checkpoints';
import {createSequenceValidationContext} from '../../src/ssg/game/art/core/sequence-context';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import {pendingRegistry} from '../../src/ssg/game/authoring/pending-registry';
import {reconstructCheckpoint} from '../../src/ssg/game/authoring/checkpoint';

const root=path.resolve('src/ssg/game'),documents=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'test',value:JSON.parse(fs.readFileSync(path.join(root,d.file),'utf8'))}));
const values=new Map(documents.map(d=>[d.id,d.value])),references=storyboardLinks(values);
const command=references.transitions.find(t=>t.reference.scene==='boundary-west'&&t.reference.kind==='command'&&t.reference.id==='mark-pan')!,trigger=references.transitions.find(t=>t.reference.kind==='trigger')!;assert(command&&trigger);
const beat={id:'start',title:'Start',place:'Boundary',district:'',status:'exists' as const,happens:'An authored preview starting situation',teaches:'Continuity',note:'Keep this note',composition:'boundary-example',checkpoint:'boundary-review',sequence:'boundary-pan',branches:['next'],transitions:[command.reference,trigger.reference]};
const fixture={...defaultPlayFixture('boundary-west' as PlayFixture['scene']),id:'boundary-review',composition:'boundary-example',sequence:{id:'boundary-pan',time:3}};
const fixtures=structuredClone(values.get('play-fixtures')) as PlayFixtures;fixtures.fixtures.push(fixture);values.set('play-fixtures',fixtures);
const linked=storyboardLinks(values).links,story:Storyboard={version:1,acts:[{id:'review',title:'Review',arc:'An editor navigation example',beats:[beat,{id:'next',title:'Next',place:'Display',district:'',status:'new',happens:'',note:'Planning only'}]}]};
validateStoryboard(story,undefined,linked);assert.deepEqual(story.acts[0].beats[0].transitions,[command.reference,trigger.reference]);assert.equal(story.acts[0].beats[1].checkpoint,undefined);
for(const patch of [{composition:'missing'},{checkpoint:'missing'},{sequence:'missing'},{branches:['missing']},{transitions:[{scene:'boundary-west',kind:'trigger',id:'missing'}]},{checkpoint:'harbor-start',sequence:'boundary-pan'}]){const bad=structuredClone(story);Object.assign(bad.acts[0].beats[0],patch);assert.throws(()=>validateStoryboard(bad,undefined,linked));}
const make=()=>{const model=new ComposerModel(art,createSequenceValidationContext(art,{}),(doc,docs)=>{const source=new Map(docs.map(d=>[d.id,d.value]));if(doc.id==='play-fixtures')validatePendingFixtures(doc.value,source);if(doc.kind==='storyboard')validateStoryboard(doc.value,undefined,storyboardLinks(source).links);},[sceneCatalogueProjection]);model.load(documents);return model;};
const model=make();model.importDocuments([{id:'play-fixtures',value:fixtures},{id:'storyboard',value:story}],'Link checkpoint and storyboard atomically');
model.undo();assert(!(model.get('play-fixtures').value as PlayFixtures).fixtures.some(f=>f.id===fixture.id));model.redo();assert.deepEqual(model.get('storyboard').value,story);
const bundle=createDocumentBundle(model.edits(),model.list()),restored=make();restored.importDocuments(readDocumentBundle(bundle,restored.list()));assert.deepEqual(restored.get('storyboard').value,story);
const valid=JSON.stringify(model.list());assert.throws(()=>model.edit('play-fixtures','Delete referenced checkpoint',value=>{const d=value as PlayFixtures;d.fixtures=d.fixtures.filter(f=>f.id!==fixture.id);return d;}));assert.equal(JSON.stringify(model.list()),valid,'Cross-document reference deletion rejects atomically');
const output=path.resolve('../../.game-test-output'),disk=fs.mkdtempSync(path.join(output,'storyboard-checkpoint-'));
try{
 for(const d of sourceDocuments){const target=path.join(disk,d.file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,d.file),target);}
 const store=new AuthoringStore({root:disk,documents:sourceDocuments,validateAll:validateSourceDocuments});store.save(model.edits().map(d=>({...d,revision:store.read(d.id).revision})));
 const fresh=new AuthoringStore({root:disk,documents:sourceDocuments,validateAll:validateSourceDocuments}).list(),freshValues=new Map(fresh.map(d=>[d.id,d.value]));
 assert.deepEqual(freshValues.get('storyboard'),story);const checkpoint=(freshValues.get('play-fixtures') as PlayFixtures).fixtures.find(f=>f.id===fixture.id)!;assert.deepEqual(checkpoint,fixture);
 const reconstructed=reconstructCheckpoint(checkpoint,freshValues,pendingRegistry(freshValues));assert.equal(reconstructed.sequence!.time,3);assert(reconstructed.save.scenes['boundary-west']?.movers);
}finally{assert.equal(path.dirname(disk),output);fs.rmSync(disk,{recursive:true,force:true});}
console.log('Storyboard navigation: typed source links, planning branches, atomic references, history/bundle, protected Save and fresh native checkpoint inputs');
