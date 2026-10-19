import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {pathToFileURL} from 'node:url';import {build} from 'esbuild';
import {art,type Composition} from '../../src/ssg/game/art';
import {SCENES} from '../../src/ssg/game/scenes';
import {harborScene,harborActors} from '../../src/ssg/game/scenes/harbor';
import {harborEnvironment,harborComposition} from '../../src/ssg/game/scenes/harbor/composition';
import {content} from '../../src/ssg/game/scenes/harbor/scene-document';
import {ComposerModel} from '../../src/ssg/game/authoring/app';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {createSequenceValidationContext} from '../../src/ssg/game/authoring/sequence-preview';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';
import {pendingRegistry} from '../../src/ssg/game/authoring/pending-registry';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import {addManifestContent,removeManifestContent} from '../../src/ssg/game/engine/gameplay/manifest-content';
import {addSceneActor,duplicateSceneActor,removeSceneActor,bindSceneActor,setActorDialogue} from '../../src/ssg/game/engine/gameplay/actor-content';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {actorReactionIdentity,actorAppearanceSeed} from '../../src/ssg/game/engine/gameplay/actor-identity';
import {frameView} from '../../src/ssg/game/art/core/view';
const root=path.resolve('src/ssg/game'),documents=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'fixture',value:JSON.parse(fs.readFileSync(path.join(root,d.file),'utf8'))}));
const context=createSequenceValidationContext(art,{},Object.fromEntries(Object.entries(SCENES).map(([id,s])=>[id,s.exits.map(e=>e.id)])));
const make=()=>{const m=new ComposerModel(art,context,(d,docs)=>{if(d.id==='harbor-scene')validateSourceDocuments(new Map(docs.map(d=>[d.id,d.value])));});m.load(documents);return m;};
const model=make(),composition=model.get('harbor').value as Composition,scene=structuredClone(content.scene),gameplay=structuredClone(content.gameplay);
const raised=structuredClone(harborComposition);raised.instances.find(n=>n.id==='notice')!.placement.h+=17;raised.instances.find(n=>n.id==='fish-use')!.placement.h+=9;const raisedNative=harborScene(raised);assert.equal(raisedNative.readables!.find(r=>r.id==='notice')!.h,17);assert.equal(raisedNative.readables!.find(r=>r.id==='notice')!.promptH,95);assert.equal(raisedNative.uses!.find(r=>r.id==='fish')!.h,9);
composition.instances.push({id:'review-stool',type:'furniture.stool',props:{seed:1},placement:{x:180,h:0},order:200,pass:'backdrop'});
scene.manifest!.spawn='review-stool';scene.manifest!.exits!.beach={instance:'review-stool'};scene.manifest!.uses.fish={instance:'review-stool',promptH:92,responseH:0,responseAboveFloor:true};
removeManifestContent(scene,'readables','manifest');addManifestContent(scene,'readables','review-note','review-stool');scene.readables!.find(r=>r.id==='review-note')!.pages=['Pending dock notice.'];
addManifestContent(scene,'uses','review-action','review-stool');scene.uses.find(u=>u.id==='review-action')!.routes=[{command:'review.grant',pages:['Two fish.']}];
gameplay.commands['review.grant']={sources:['interaction'],actions:[{item:'fish',add:2}]};
composition.instances=composition.instances.filter(i=>!['spawn','beach-exit','fish-use'].includes(i.id));
addSceneActor(scene,composition,'new-resident',{body:'old',garb:'robe'},210,0);duplicateSceneActor(scene,composition,'new-resident','resident-copy');bindSceneActor(scene,composition,'new-resident','fish','origin',42,4);
setActorDialogue(scene,'fishSeller',true);scene.actors!.find(a=>a.id==='fishSeller')!.band='world';bindSceneActor(scene,composition,'fishSeller','','origin',2300,6);
removeSceneActor(scene,composition,'bird5');
model.importDocuments([{id:'harbor',value:composition},{id:'harbor-scene',value:scene},{id:'harbor-gameplay',value:gameplay}]);
const inspect=(native:ReturnType<typeof harborScene>)=>{
 assert.equal(native.spawn,180);assert.equal(native.exits.find(e=>e.id==='beach')!.x,180);assert.equal(native.uses!.find(u=>u.id==='fish')!.x,180);assert.equal(native.readables!.find(r=>r.id==='review-note')!.x,180);assert(!native.readables!.some(r=>r.id==='manifest'));
 const resident=native.people!.find(p=>p.id==='new-resident')!;assert.deepEqual(resident.look,{body:'old',garb:'robe'});assert.equal(actorReactionIdentity(resident),'actor.new-resident');assert(native.people!.some(p=>p.id==='resident-copy'));assert(!native.people!.some(p=>actorReactionIdentity(p)==='slot-10'));
 const vendor=native.people!.find(p=>p.id==='fishSeller')!;assert.equal(vendor.x,2300);assert.equal(vendor.h,6);assert.equal(vendor.conversation,'talk.harbor.fishSeller');
 const environment=native.visualEnvironment!(frameView(100),{} as any);assert.equal((environment.bindings!['harbor.fishPose'] as any).visible,false);assert.equal((environment.bindings!['actor.fishSeller.pose'] as any).character.x,2300);assert.equal((environment.bindings!['actor.fishSeller.pose'] as any).visible,true);
 let state:any={flags:{},items:{},tokens:0};const session=new GameplaySession(native.gameplay!,{read:()=>state,write:s=>{state=s;}});assert.deepEqual(native.uses!.find(u=>u.id==='review-action')!.use({gameplay:session} as any),['Two fish.']);assert.equal(state.items.fish,2);session.dispose();
};
inspect(pendingRegistry(new Map(model.list().map(d=>[d.id,d.value]))).harbor);
const edits=structuredClone(model.edits());
for(const mutate of [(d:any)=>{d.instances=d.instances.filter((i:any)=>i.id!=='crane0');},(d:any)=>{d.instances.find((i:any)=>i.id==='crane0').type='furniture.stool';}]){const invalid=structuredClone(composition);mutate(invalid);assert.throws(()=>model.importDocuments([{id:'harbor',value:invalid}]));assert.deepEqual(model.edits(),edits);}
const badIdentity=structuredClone(scene);badIdentity.actors!.find(a=>a.id==='customs')!.reaction='invalid reaction!';assert.throws(()=>content.validateScene(badIdentity,gameplay),/reaction|identity/i);
for(const field of ['actors','manifest']as const){const missing=structuredClone(content.scene);delete missing[field];assert.throws(()=>harborScene(undefined,{},{},missing),'incomplete '+field+' source must be rejected');}
// Every original body can be removed, including the two assembly-painted vendor bodies.
const emptyScene=structuredClone(content.scene),emptyArt=structuredClone(harborComposition);removeManifestContent(emptyScene,'uses','cat');emptyArt.instances=emptyArt.instances.filter(n=>n.id!=='cat-use');for(const a of [...emptyScene.actors!])removeSceneActor(emptyScene,emptyArt,a.id);const empty=harborScene(emptyArt,{},{},emptyScene);assert.equal(empty.people!.length,0);const emptyEnv=empty.visualEnvironment!(frameView(0),{} as any);assert.equal((emptyEnv.bindings!['harbor.fishPose'] as any).visible,false);assert.equal((emptyEnv.bindings!['harbor.teaPose'] as any).visible,false);
// Source-owned implicit seeds survive moving artwork; vendor rebind uses the selected source instance.
const actors=harborActors();assert.equal(actorAppearanceSeed(actors['pier-person6']),1655);
const detachedSource=structuredClone(content.scene),detachedArt=structuredClone(harborComposition);bindSceneActor(detachedSource,detachedArt,'operator0','','origin',2300,0);const detached=harborScene(detachedArt,{},{},detachedSource).visualEnvironment!(frameView(500),{} as any);assert.equal((detached.bindings!['actor.operator0.pose'] as any).character.x,2300);assert.equal(detached.bindings!['clip.crane0'],null);
const reboundScene=structuredClone(content.scene),reboundArt=structuredClone(harborComposition),fishArt=reboundArt.instances.find(n=>n.id==='fishSeller')!;fishArt.id='vendor-new-art';reboundScene.actors!.find(a=>a.id==='fishSeller')!.instance='vendor-new-art';const rebound=harborScene(reboundArt,{},{},reboundScene).visualEnvironment!(frameView(0),{} as any);assert.equal((rebound.bindings!['harbor.fishPose'] as any).visible,false);assert.equal((rebound.bindings!['actor.fishSeller.pose'] as any).visible,true);
const receiver=make();receiver.importDocuments(readDocumentBundle(createDocumentBundle(model.edits(),model.list()),receiver.list()));inspect(pendingRegistry(new Map(receiver.list().map(d=>[d.id,d.value]))).harbor);model.undo();assert(!model.dirty());model.redo();assert.deepEqual(model.edits(),edits);
const scratch=path.resolve('../../.scene-system/harbor-manifest-save');fs.mkdirSync(scratch,{recursive:true});const dir=fs.mkdtempSync(path.join(scratch,'run-'));for(const d of sourceDocuments){const dest=path.join(dir,d.file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,d.file),dest);}
const store=new AuthoringStore({root:dir,documents:sourceDocuments,validateAll:validateSourceDocuments}),originals=Object.fromEntries(model.edits().map(({id})=>[id,fs.readFileSync(path.join(dir,sourceDocuments.find(d=>d.id===id)!.file),'utf8')]));
const saved=store.save(model.edits().map(e=>({...e,revision:store.read(e.id).revision})));inspect(harborScene(store.read('harbor').value as Composition,{},{},store.read('harbor-scene').value as any,store.read('harbor-gameplay').value as any));
// Import a completely new module graph using only the protected saved JSON, so eager
// default exports cannot hide references to removed original artwork or actor definitions.
const fresh=path.join(dir,'fresh-harbor.mjs');
await build({stdin:{contents:`import assert from 'node:assert/strict';import {SCENES} from ${JSON.stringify(path.join(root,'scenes/index.ts'))};import {HARBOR_ACTORS} from ${JSON.stringify(path.join(root,'scenes/harbor/index.ts'))};const s=SCENES.harbor;assert.equal(s.spawn,180);assert.equal(s.exits.find(e=>e.id==='beach').x,180);assert.equal(s.uses.find(e=>e.id==='fish').x,180);assert.equal(HARBOR_ACTORS.fishSeller.x,2300);assert(s.people.some(a=>a.id==='new-resident'));assert(!HARBOR_ACTORS.bird5);`,resolveDir:root,loader:'ts'},outfile:fresh,bundle:true,platform:'node',format:'esm',target:'es2022',logLevel:'warning',plugins:[{name:'saved-harbor-source-json',setup(builder){builder.onLoad({filter:/\.json$/},args=>{const relative=path.relative(root,args.path),file=path.join(dir,relative);if(!relative.startsWith('..')&&fs.existsSync(file))return{contents:fs.readFileSync(file,'utf8'),loader:'json'};});}}]});
await import(pathToFileURL(fresh).href);
store.undo(saved.transaction,Object.fromEntries(saved.documents.map(d=>[d.id,d.revision])));for(const[id,bytes]of Object.entries(originals))assert.equal(fs.readFileSync(path.join(dir,sourceDocuments.find(d=>d.id===id)!.file),'utf8'),bytes);
fs.writeFileSync(path.join(dir,'evidence.json'),JSON.stringify({status:'PASS',checks:['ordinary add/remove/rebind','original markers removed','actor add/duplicate/remove/attach/detach','vendor source movement and separate artwork rebind','all canonical actors removable','stable reaction and appearance identities','shared command','incomplete source rejection','protected crane identity','atomic history','bundle','protected Save','native reload','fresh saved-source module graph','exact byte Undo']},null,2)+'\n');
console.log('Harbor manifest/actor Save PASS: ordinary CRUD/rebinding, 30 source bodies and vendor rebinds, shared commands, stable identities, incomplete source rejection, protected controllers, grouped history/bundle/Save/reload/byte Undo. Evidence: '+dir);
