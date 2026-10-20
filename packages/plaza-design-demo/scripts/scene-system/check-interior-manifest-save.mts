import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';
import {pathToFileURL} from 'node:url';import {build} from 'esbuild';
import {art,type Composition} from '../../src/ssg/game/art';
import {SCENES} from '../../src/ssg/game/scenes';
import {gameplayScene} from '../../src/ssg/game/authoring/gameplay-scenes';
import {ComposerModel} from '../../src/ssg/game/authoring/app';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {createSequenceValidationContext} from '../../src/ssg/game/authoring/sequence-preview';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';
import {pendingRegistry} from '../../src/ssg/game/authoring/pending-registry';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import {addManifestContent,removeManifestContent} from '../../src/ssg/game/engine/gameplay/manifest-content';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import type {SceneDocument} from '../../src/ssg/game/engine/gameplay/scene-document';
import type {GameplayDefinition} from '../../src/ssg/game/engine/gameplay/types';
const root=path.resolve('src/ssg/game'),documents=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'fixture',value:JSON.parse(fs.readFileSync(path.join(root,d.file),'utf8'))}));
const context=createSequenceValidationContext(art,{},Object.fromEntries(Object.entries(SCENES).map(([id,s])=>[id,s.exits.map(e=>e.id)])));
const make=()=>{const m=new ComposerModel(art,context,(d,docs)=>{if(d.id===documents[0].id)validateSourceDocuments(new Map(docs.map(d=>[d.id,d.value])));});m.load(documents);return m;};
const model=make(),ids=['capsule','yard','moth'];
for(const id of ids){
 const composition=structuredClone(model.get(id).value) as Composition,scene=structuredClone(model.get(id+'-scene').value) as SceneDocument,gameplay=structuredClone(model.get(id+'-gameplay').value) as GameplayDefinition;
 composition.instances.push({id:'review-stool',type:'furniture.stool',props:{seed:1},placement:{x:180,h:0},order:200,layer:'set'});
 scene.manifest!.spawn='review-stool';scene.manifest!.exits![scene.exits![0].id]='review-stool';
 if(id==='capsule')scene.manifest!.rests!.bed={instance:'review-stool',promptH:46};
 addManifestContent(scene,'readables','review-note','review-stool');scene.readables![0].pages=['Pending test note.'];
 addManifestContent(scene,'uses','review-action','review-stool');scene.uses[0].routes=[{command:'review.grant',pages:['Two tokens.']}];
 gameplay.commands['review.grant']={sources:['interaction'],actions:[{tokens:2}]};
 composition.instances=composition.instances.filter(i=>!['exit-door','exit-downtown','rest-bed'].includes(i.id));
 model.importDocuments([{id,value:composition},{id:id+'-scene',value:scene},{id:id+'-gameplay',value:gameplay}]);
 const edits=structuredClone(model.edits());
 const invalid=structuredClone(composition);invalid.instances=invalid.instances.filter(i=>i.id!==(id==='yard'?'crane':'door'));
 assert.throws(()=>model.importDocuments([{id,value:invalid}]));assert.deepEqual(model.edits(),edits);
 const missing=structuredClone(scene);missing.manifest!.spawn='absent';assert.throws(()=>model.importDocuments([{id:id+'-scene',value:missing}]));assert.deepEqual(model.edits(),edits);
 const incomplete=structuredClone(documents.find(d=>d.id===id+'-scene')!.value);delete incomplete.manifest;
 const registered=gameplayScene(id);assert.throws(()=>registered.definition(undefined,{},{},registered.validateScene(incomplete,gameplay),gameplay),'missing source manifest must be rejected');
}
function inspect(values:ReadonlyMap<string,unknown>){const registry=pendingRegistry(values);for(const id of ids){const native=registry[id];assert.equal(native.spawn,180);assert.equal(native.exits[0].x,180);assert.equal(native.readables![0].x,180);assert.equal(native.uses![0].x,180);if(id==='capsule'){assert.equal(native.rests![0].x,180);assert.equal(native.rests![0].promptH,46);}
 let state:any={flags:{},items:{},tokens:0};const session=new GameplaySession(native.gameplay!,{read:()=>state,write:s=>{state=s;}});assert.deepEqual(native.uses![0].use({gameplay:session} as any),['Two tokens.']);assert.equal(state.tokens,2);session.dispose();
}}
inspect(new Map(model.list().map(d=>[d.id,d.value])));
const receiver=make();receiver.importDocuments(readDocumentBundle(createDocumentBundle(model.edits(),model.list()),receiver.list()));inspect(new Map(receiver.list().map(d=>[d.id,d.value])));
const edits=structuredClone(receiver.edits());receiver.undo();assert(!receiver.dirty());receiver.redo();assert.deepEqual(receiver.edits(),edits);
// New ordinary entries may also be deleted without affecting protected native targets.
for(const id of ids){const scene=structuredClone(receiver.get(id+'-scene').value) as SceneDocument;removeManifestContent(scene,'uses','review-action');removeManifestContent(scene,'readables','review-note');receiver.importDocuments([{id:id+'-scene',value:scene}]);}
const scratch=path.resolve('../../.scene-system/interior-manifest-save');fs.mkdirSync(scratch,{recursive:true});const dir=fs.mkdtempSync(path.join(scratch,'run-'));for(const d of sourceDocuments){const dest=path.join(dir,d.file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,d.file),dest);}
const store=new AuthoringStore({root:dir,documents:sourceDocuments,validateAll:validateSourceDocuments}),originals=Object.fromEntries(model.edits().map(({id})=>[id,fs.readFileSync(path.join(dir,sourceDocuments.find(d=>d.id===id)!.file),'utf8')]));
const saved=store.save(model.edits().map(e=>({...e,revision:store.read(e.id).revision})));inspect(new Map(sourceDocuments.map(d=>[d.id,store.read(d.id).value])));
// Rebundle from saved JSON into a fresh module graph: cached shipping imports must not hide
// module-level references to removed original spawn markers.
const fresh=path.join(dir,'fresh-scenes.mjs');
await build({stdin:{contents:`import assert from 'node:assert/strict';import {SCENES} from ${JSON.stringify(path.join(root,'scenes/index.ts'))};import {CAPSULE_SPAWN} from ${JSON.stringify(path.join(root,'scenes/capsule/scene.ts'))};import {MOTH_SPAWN} from ${JSON.stringify(path.join(root,'scenes/moth/scene.ts'))};import {YARD_SPAWN} from ${JSON.stringify(path.join(root,'scenes/yard/scene.ts'))};for(const id of ['capsule','yard','moth']){assert.equal(SCENES[id].spawn,180);assert.equal(SCENES[id].exits[0].x,180);}assert.deepEqual([CAPSULE_SPAWN,MOTH_SPAWN,YARD_SPAWN],[180,180,180]);`,resolveDir:root,loader:'ts'},outfile:fresh,bundle:true,platform:'node',format:'esm',target:'es2022',logLevel:'warning',plugins:[{name:'saved-source-json',setup(builder){builder.onLoad({filter:/\.json$/},args=>{const relative=path.relative(root,args.path),file=path.join(dir,relative);if(!relative.startsWith('..')&&fs.existsSync(file))return{contents:fs.readFileSync(file,'utf8'),loader:'json'};});}}]});
await import(pathToFileURL(fresh).href);
store.undo(saved.transaction,Object.fromEntries(saved.documents.map(d=>[d.id,d.revision])));for(const[id,bytes]of Object.entries(originals))assert.equal(fs.readFileSync(path.join(dir,sourceDocuments.find(d=>d.id===id)!.file),'utf8'),bytes);
fs.writeFileSync(path.join(dir,'evidence.json'),JSON.stringify({status:'PASS',scenes:ids,checks:['ordinary add/remove/rebind','original markers removed','shared command','incomplete source rejection','protected controllers','invalid bindings atomic rejection','grouped history','bundle','protected Save','native reload','fresh saved-source module graph','exact byte Undo']},null,2)+'\n');
console.log('Interior manifest Save PASS: Capsule/Yard/Moth ordinary content creation/removal/rebinding, original marker removal, commands, incomplete source rejection, controller protection, atomic history/bundle/source Save/native reload/byte Undo. Evidence: '+dir);
