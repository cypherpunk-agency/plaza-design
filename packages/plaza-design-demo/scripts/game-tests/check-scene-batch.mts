/** All-scene content integration: current pending source, history, bundles and protected Save. */
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {build} from 'esbuild';
import {NATIVE_SCENES,SCENES} from '../../src/ssg/game/scenes';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {addManifestContent,removeManifestContent} from '../../src/ssg/game/engine/gameplay/manifest-content';
import {targetInstance} from '../../src/ssg/game/engine/gameplay/manifest-contract';
import {createSequenceValidationContext} from '../../src/ssg/game/art/core/sequence-context';
import {art} from '../../src/ssg/game/art';
import {ComposerModel} from '../../src/ssg/game/authoring/app';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {deviceSourceIdentity} from '../../src/ssg/game/authoring/device-document-ids';
import {pendingRegistry} from '../../src/ssg/game/authoring/pending-registry';
import {playScenes,validatePlayFixtures,defaultPlayFixture} from '../../src/ssg/game/authoring/play-fixtures';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import {gameSourceIdentity} from '../scene-system/source-identity.mts';
const game=path.resolve('src/ssg/game'),ids=Object.keys(NATIVE_SCENES);assert.equal(ids.length,19,'Current folder catalogue: retired one-room Harbor Shift is excluded');
const docs=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'test',value:JSON.parse(fs.readFileSync(path.join(game,d.file),'utf8'))}));
const context=createSequenceValidationContext(art,{},Object.fromEntries(Object.entries(SCENES).map(([id,s])=>[id,s.exits.map(e=>e.id)])));
const make=()=>{const model=new ComposerModel(art,context,(doc,documents)=>{if(doc.id===docs[0].id)validateSourceDocuments(new Map(documents.map(d=>[d.id,d.value])));});model.load(docs);return model;},model=make();
const edits:any[]=[];
for(const id of ids){
 const ref=deviceSourceIdentity(id),scene=structuredClone(model.get(ref.scene).value)as any,g=structuredClone(model.get(ref.gameplay).value)as any;
 const spawn=scene.manifest.spawn,instance=targetInstance(spawn),binding=typeof spawn==='string'?{instance:spawn}:structuredClone(spawn);binding.x=(binding.x??0)+37;
 for(const group of ['uses','readables','rests','exits']as const){addManifestContent(scene,group,'review-'+group,instance);scene.manifest[group]['review-'+group]=structuredClone(binding);}
 scene.uses.find((u:any)=>u.id==='review-uses').routes=[{when:{flag:'review:allowed'},command:'review.grant',pages:['Pending '+id]},{pages:['Denied '+id]}];
 scene.readables.find((r:any)=>r.id==='review-readables').pages=['Pending note '+id];
 g.flags.push('review:allowed','review:used');g.commands['review.grant']={sources:['interaction'],when:{flag:'review:allowed'},actions:[{tokens:3},{flag:'review:used',value:true}]};
 edits.push({id:ref.scene,value:scene},{id:ref.gameplay,value:g});
}
model.importDocuments(edits);
/** Execute the actual compiled ordinary use, with its real shared permission and transaction engine. */
function inspect(registry:any,ids:string[]){for(const id of ids){const scene=registry[id],use=scene.uses.find((u:any)=>u.id==='review-uses');assert(use,id+' compiled use');assert.equal(use.x,scene.spawn+37,id+' pending binding');
 for(const group of ['readables','rests','exits'])assert.equal(scene[group].find((r:any)=>r.id==='review-'+group).x,use.x,id+'/'+group+' pending binding');
 assert.deepEqual(scene.readables.find((r:any)=>r.id==='review-readables').pages,['Pending note '+id]);assert.equal(scene.exits.find((r:any)=>r.id==='review-exits').to,id);
 let state:any={flags:{},items:{},tokens:10};const session=new GameplaySession(scene.gameplay,{read:()=>state,write:next=>{state=next;}});try{
 const ctx:any={gameplay:session,flags:state.flags,has:()=>false};assert.deepEqual(use.use(ctx),['Denied '+id]);assert.equal(state.tokens,10);assert.equal(state.flags['review:used'],undefined);
 state.flags['review:allowed']=true;assert.deepEqual(use.use({...ctx,flags:state.flags}),['Pending '+id]);assert.equal(state.tokens,13);assert.equal(state.flags['review:used'],true);
 assert.equal(session.events().length,0,'ordinary grant creates no invented simulation event');
 }finally{session.dispose();}
}}
const values=(m:ComposerModel)=>new Map(m.list().map(d=>[d.id,d.value]));inspect(pendingRegistry(values(model)),ids);
const safe=structuredClone(model.edits()),broken=structuredClone(edits[0].value);broken.uses.find((u:any)=>u.id==='review-uses').routes[0].command='missing-command';assert.throws(()=>model.importDocuments([{id:edits[0].id,value:broken}]));assert.deepEqual(model.edits(),safe,'invalid grouped edit is atomic');
const bundle=createDocumentBundle(model.edits(),model.list()),receiver=make();receiver.importDocuments(readDocumentBundle(bundle,receiver.list()));assert.equal(receiver.edits().length,ids.length*2);inspect(pendingRegistry(values(receiver)),ids);receiver.undo();assert.equal(receiver.dirty(),false);receiver.redo();inspect(pendingRegistry(values(receiver)),ids);
for(const id of ids){const ref=deviceSourceIdentity(id),scene=structuredClone(receiver.get(ref.scene).value)as any;for(const group of ['uses','readables','rests','exits']as const)removeManifestContent(scene,group,'review-'+group);receiver.edit(ref.scene,'Delete review content',()=>scene);}
const removed=pendingRegistry(values(receiver));for(const id of ids)for(const group of ['uses','readables','rests','exits'])assert(!removed[id][group]?.some((r:any)=>r.id==='review-'+group));for(const id of ids)receiver.undo();inspect(pendingRegistry(values(receiver)),ids);
for(const scene of playScenes)assert.equal(validatePlayFixtures({version:1,fixtures:[defaultPlayFixture(scene)]},true).fixtures[0].scene,scene);
const scratch=path.resolve('../../.game-test-output/scene-batch-check');fs.mkdirSync(scratch,{recursive:true});const root=fs.mkdtempSync(path.join(scratch,'run-'));
for(const descriptor of sourceDocuments){const target=path.join(root,descriptor.file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(game,descriptor.file),target);}
const store=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments}),before=store.list(),revisions=new Map(before.map(d=>[d.id,d.revision])),originals=new Map(model.edits().map(d=>[d.id,fs.readFileSync(path.join(root,sourceDocuments.find(s=>s.id===d.id)!.file),'utf8')]));
const bad=structuredClone(model.edits());(bad[1].value as any).commands['review.grant'].actions=[{item:'missing-item',add:1}];assert.throws(()=>store.save(bad.map(e=>({...e,revision:revisions.get(e.id)!}))));assert.deepEqual(store.list(),before,'invalid 38-document Save leaves every revision unchanged');
const saved=store.save(model.edits().map(e=>({...e,revision:revisions.get(e.id)!}))),savedValues=new Map(store.list().map(d=>[d.id,d.value]));inspect(pendingRegistry(savedValues),ids);
const fresh=path.join(root,'fresh.mjs');await build({stdin:{contents:`import assert from 'node:assert/strict';import {SCENES} from ${JSON.stringify(path.join(game,'scenes/index.ts'))};import {GameplaySession} from ${JSON.stringify(path.join(game,'engine/gameplay/session.ts'))};const __name=(value,name)=>value;(${inspect.toString()})(SCENES,${JSON.stringify(ids)});`,resolveDir:game,loader:'ts'},outfile:fresh,bundle:true,platform:'node',format:'esm',target:'es2022',logLevel:'warning',plugins:[{name:'saved-scene-batch',setup(b){b.onLoad({filter:/\.json$/},a=>{const relative=path.relative(game,a.path),file=path.join(root,relative);if(!relative.startsWith('..')&&fs.existsSync(file))return{contents:fs.readFileSync(file,'utf8'),loader:'json'};});}}]});await import(pathToFileURL(fresh).href);
store.undo(saved.transaction,Object.fromEntries(saved.documents.map(d=>[d.id,d.revision])));for(const[id,bytes]of originals)assert.equal(fs.readFileSync(path.join(root,sourceDocuments.find(d=>d.id===id)!.file),'utf8'),bytes);
const report={status:'PASS',source:gameSourceIdentity(game),scenes:ids,documents:38,checks:['all19 pending use/readable/rest/exit creation and rebinding','actual compiled uses shared refusal and atomic grant','all19 content removal and undo','portable bundle grouped Undo/Redo','invalid grouped edit and Save atomicity','protected 38-document Save and pending reload','fresh saved JSON shipping imports all19','exact-byte transaction Undo','registered Play fixtures'],scope:'ordinary content integration; actor/device/controller/world/raster/lifecycle acceptance requires its own evidence'};fs.writeFileSync(path.join(root,'evidence.json'),JSON.stringify(report,null,2)+'\n');console.log('Scene batch PASS: all19 pending ordinary-content CRUD/rebind, actual shared use permissions/outcomes, bundle/history, protected38-document Save/fresh shipping/byte Undo. Evidence: '+root);
