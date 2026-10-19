import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {pathToFileURL} from 'node:url';
import {SCENES} from '../../src/ssg/game/scenes';
import {art} from '../../src/ssg/game/art';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {pendingRegistry} from '../../src/ssg/game/authoring/pending-registry';
import {ComposerModel} from '../../src/ssg/game/authoring/app';
import {createSequenceValidationContext} from '../../src/ssg/game/authoring/sequence-preview';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import {validateSceneEnvironment,environmentArtworkOwners,sceneEnvironmentKeys} from '../../src/ssg/game/engine/gameplay/scene-environment';
import type {SceneDocument} from '../../src/ssg/game/engine/gameplay/scene-document';
import type {SceneDef} from '../../src/ssg/game/scenes/kit';

const root=path.resolve('src/ssg/game'),baseline=path.resolve('../../.scene-system/all-game-baseline-2026-10-18'),manifest=JSON.parse(fs.readFileSync(path.join(baseline,'manifest.json'),'utf8'));
for(const[file,hash]of Object.entries(manifest.files))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(baseline,'source',file))).digest('hex'),hash,'immutable original '+file);
const original=await import(pathToFileURL(path.join(baseline,'source/scenes/index.ts')).href);
const metadata=(scene:SceneDef)=>Object.fromEntries(sceneEnvironmentKeys.filter(key=>Object.hasOwn(scene,key)).map(key=>[key,scene[key]]));
for(const[id,scene]of Object.entries(SCENES))assert.deepEqual(metadata(scene),metadata(original.SCENES[id]),'original native atmosphere '+id);
const documents=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'fixture',value:JSON.parse(fs.readFileSync(path.join(root,d.file),'utf8'))})),values=new Map(documents.map(d=>[d.id,d.value]));
const prefix=(id:string)=>id==='harborShift'?'harbor-shift':id;
const context=createSequenceValidationContext(art,{},Object.fromEntries(Object.entries(SCENES).map(([id,s])=>[id,s.exits.map(e=>e.id)])));
const make=()=>{const model=new ComposerModel(art,context,(d,docs)=>{if(d.id==='library-scene')validateSourceDocuments(new Map(docs.map(d=>[d.id,d.value])));});model.load(documents);return model;};
const model=make(),updates:{id:string;value:SceneDocument}[]=[];
for(const[id,scene]of Object.entries(SCENES)){
 const key=prefix(id)+'-scene',source=structuredClone(model.get(key).value) as SceneDocument,owners=environmentArtworkOwners[id];
 assert(source.environment,'canonical source environment '+id);
 source.environment={...source.environment,ambient:{...source.environment.ambient,weather:!scene.ambient?.weather},keepFace:!scene.keepFace,outdoor:true};
 if(!owners?.facing)source.environment.facing=129.75;
 if(!owners?.horizon)source.environment.horizon=33;
 if(!owners?.shade)source.environment.shade={back:{h:100,gaps:[[10,30]]},depth:120};
 if(!owners?.covers)source.environment.ambient!.covers=[{from:10,to:100,under:120}];
 updates.push({id:key,value:source});
}
model.importDocuments(updates);console.log('Environment: all19 pending edits validated atomically.');
const pending=pendingRegistry(new Map(model.list().map(d=>[d.id,d.value])));
for(const[id,scene]of Object.entries(SCENES)){
 const source=updates.find(d=>d.id===prefix(id)+'-scene')!.value,compiled=pending[id],owners=environmentArtworkOwners[id];
 assert.equal(compiled.ambient?.weather,!scene.ambient?.weather,id+' pending weather');assert.equal(compiled.keepFace,!scene.keepFace);assert.equal(compiled.outdoor,true);
 if(!owners?.facing)assert.equal(compiled.facing,129.75);else assert.equal(compiled.facing,scene.facing);
 if(!owners?.horizon)assert.equal(compiled.horizon,33);else assert.equal(compiled.horizon,scene.horizon);
 if(!owners?.shade)assert.deepEqual(compiled.shade,source.environment!.shade);else assert.deepEqual(compiled.shade,scene.shade);
 if(!owners?.covers)assert.deepEqual(compiled.ambient?.covers,source.environment!.ambient!.covers);else assert.deepEqual(compiled.ambient?.covers,scene.ambient?.covers);
}
// One prospective world transaction also verifies compatibility for all pre-environment documents.
const old=new Map(values);for(const id of Object.keys(SCENES)){const key=prefix(id)+'-scene',legacy=structuredClone(values.get(key)) as SceneDocument;delete legacy.environment;old.set(key,legacy);}validateSourceDocuments(old);const legacyRegistry=pendingRegistry(old);
for(const[id,scene]of Object.entries(SCENES))assert.deepEqual(metadata(legacyRegistry[id]),metadata(scene),'legacy source '+id);

console.log('Environment: original metadata and legacy defaults verified for all19.');
const before=structuredClone(model.edits());
for(const invalid of [{facing:361},{ambient:{weather:'yes'}},{ambient:{covers:[{from:10,to:1,under:20}]}},{shade:{front:{h:10,gaps:[[5,4]]}}},{shade:{depth:Infinity}},{ambient:{extra:true}},{unknown:0}])assert.throws(()=>validateSceneEnvironment(invalid));
for(const[scene,owners]of Object.entries(environmentArtworkOwners))for(const key of Object.keys(owners))assert.throws(()=>validateSceneEnvironment(key==='covers'?{ambient:{covers:[]}}:{[key]:key==='shade'?{}:0},scene),'one geometry owner '+scene+'/'+key);
const bad=structuredClone(model.get('downtown-scene').value) as SceneDocument;bad.environment!.facing=361;assert.throws(()=>model.importDocuments([{id:'downtown-scene',value:bad}]));assert.deepEqual(model.edits(),before,'invalid environment import is atomic');
const receiver=make();receiver.importDocuments(readDocumentBundle(createDocumentBundle(model.edits(),model.list()),receiver.list()));
assert.deepEqual(receiver.edits().map(d=>[d.id,d.value]),model.edits().map(d=>[d.id,d.value]));
const scratch=path.resolve('../../.scene-system/scene-environment');fs.mkdirSync(scratch,{recursive:true});const dir=fs.mkdtempSync(path.join(scratch,'run-'));
for(const d of sourceDocuments){const dest=path.join(dir,d.file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,d.file),dest);}
const store=new AuthoringStore({root:dir,documents:sourceDocuments,validateAll:validateSourceDocuments}),originalBytes=new Map(model.edits().map(d=>[d.id,fs.readFileSync(path.join(dir,sourceDocuments.find(s=>s.id===d.id)!.file))]));
const saved=store.save(model.edits().map(d=>({...d,revision:store.read(d.id).revision}))),reloaded=pendingRegistry(new Map(store.list().map(d=>[d.id,d.value])));
for(const id of Object.keys(SCENES))assert.deepEqual(metadata(reloaded[id]),metadata(pending[id]),'saved native environment '+id);
store.undo(saved.transaction,Object.fromEntries(saved.documents.map(d=>[d.id,d.revision])));for(const[id,bytes]of originalBytes)assert.deepEqual(fs.readFileSync(path.join(dir,sourceDocuments.find(d=>d.id===id)!.file)),bytes,'byte Undo '+id);
fs.writeFileSync(path.join(dir,'evidence.json'),JSON.stringify({status:'PASS',scenes:Object.keys(SCENES),baseline:manifest.sourceFingerprint,checks:['immutable baseline metadata','pending native weather/light/shade/face','single artwork geometry owner','legacy source defaults','invalid atomic import','bundle','protected Save/native reload','byte Undo']},null,2)+'\n');
console.log('Scene environment PASS: 19 native defaults match immutable originals; pending weather/orientation/shade and geometry ownership; legacy source, atomic bundle/Save/reload/Undo. '+dir);
