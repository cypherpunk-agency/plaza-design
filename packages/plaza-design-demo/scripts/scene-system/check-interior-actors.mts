import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {build} from 'esbuild';
import {art,type Composition} from '../../src/ssg/game/art';
import {SCENES} from '../../src/ssg/game/scenes';
import {gameplayScene} from '../../src/ssg/game/authoring/gameplay-scenes';
import {ComposerModel} from '../../src/ssg/game/authoring/app';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {createSequenceValidationContext} from '../../src/ssg/game/authoring/sequence-preview';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';
import {pendingRegistry} from '../../src/ssg/game/authoring/pending-registry';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import type {SceneDocument} from '../../src/ssg/game/engine/gameplay/scene-document';
import {addSceneActor,duplicateSceneActor,removeSceneActor,setActorDialogue,bindSceneActor} from '../../src/ssg/game/engine/gameplay/actor-content';
import {SceneModel} from '../../src/ssg/game/engine/model';
import type {SceneDef} from '../../src/ssg/game/scenes/kit';
import type {EngineDraw} from '../../src/ssg/game/engine/host';
import {prepareCharacter} from '../../src/ssg/game/runtime/characters';
import {actorReactionIdentity} from '../../src/ssg/game/engine/gameplay/actor-identity';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {ConversationSession} from '../../src/ssg/game/engine/gameplay/conversation';
import {recorder} from './capture-actor-paint.mts';import {frameView} from '../../src/ssg/game/art/core/view';
const ids=['capsule','yard','moth'],root=path.resolve('src/ssg/game');
const documents=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'fixture',value:JSON.parse(fs.readFileSync(path.join(root,d.file),'utf8'))}));
const context=createSequenceValidationContext(art,{},Object.fromEntries(Object.entries(SCENES).map(([id,s])=>[id,s.exits.map(e=>e.id)])));
const make=()=>{const m=new ComposerModel(art,context,(d,docs)=>{if(d.id===documents[0].id)validateSourceDocuments(new Map(docs.map(d=>[d.id,d.value])));});m.load(documents);return m;};
const view={...frameView(137),sx:(x:number)=>x,y:(h:number)=>300-h,gy:300,t:137,cam:0,viewW:1200,viewH:360,flags:{}};
(globalThis as any).document={createElement:()=>{const r=recorder();return{width:0,height:0,paint:r.paints,getContext:()=>r.ctx};}};
function engine(scene:SceneDef,layer:EngineDraw['layer']='all'){const m=new SceneModel({say:()=>{},changed:()=>{},open:()=>{},keyring:()=>[],modules:()=>[]},scene.data!,scene.rules as any);m.setPaused(true);return {m,hover:null,layer} as EngineDraw;}
function pose(scene:SceneDef,e:EngineDraw,id:string){return scene.visualEnvironment!(view,e).bindings!['actor.'+id+'.pose'] as unknown as ReturnType<typeof prepareCharacter>;}
const model=make();
for(const id of ids){
 const source=model.get(id+'-scene').value as SceneDocument,composition=model.get(id).value as Composition,gameplay=model.get(id+'-gameplay').value as any;assert.deepEqual(source.actors,[]);
 const legacy=structuredClone(source);delete legacy.actors;const restored=gameplayScene(id).definition(composition,{},{},legacy,gameplay);assert.deepEqual(restored.people,[]);
 addSceneActor(source,composition,'review-human',{body:'old',garb:'robe',extras:['glasses']},180,0);
 addSceneActor(source,composition,'review-robot',{bot:'porter',paint:'#445566'},260,0,false);setActorDialogue(source,'review-robot',true);
 const robot=source.people!.find(p=>p.id==='review-robot')!;Object.assign(robot,{conversation:'review.'+id+'.graph'});delete robot.talk;
 gameplay.conversations['review.'+id+'.graph']={entry:[{node:'start'}],nodes:{start:{speaker:'PORTER',pages:['Interior graph reference.']}}};
 source.actors!.find(a=>a.id==='review-robot')!.follow='review-human';
 addSceneActor(source,composition,'review-cat','cat',330,0,false);
 duplicateSceneActor(source,composition,'review-human','review-copy');
 bindSceneActor(source,composition,'review-cat',id==='yard'?'chair':id==='capsule'?'desk':'desk',id==='yard'?'seat':'origin',12,6);
 model.importDocuments([{id,value:composition},{id:id+'-scene',value:source},{id:id+'-gameplay',value:gameplay}]);
 const initial=pendingRegistry(new Map(model.list().map(d=>[d.id,d.value])))[id],e=engine(initial);
 assert.equal(initial.people!.length,4);assert.equal(initial.people!.find(p=>p.id==='review-robot')!.follow,initial.people!.find(p=>p.id==='review-human'));
 const cat=initial.people!.find(p=>actorReactionIdentity(p)==='actor.review-cat')!,at={x:cat.x,h:cat.h};assert.notEqual(cat.x,330);assert.equal(pose(initial,e,'review-cat').character.x,cat.x);
 const robotBody=initial.people!.find(p=>p.id==='review-robot')!;let state:any={flags:{},items:{},tokens:0};const session=new GameplaySession(initial.gameplay!,{read:()=>state,write:s=>{state=s;}});assert.deepEqual(new ConversationSession(session,robotBody.conversation!).frame().pages,['Interior graph reference.']);session.dispose();
 const human=pose(initial,e,'review-human');assert(human.visible);assert.deepEqual(human.character,prepareCharacter(initial.people!.find(p=>p.id==='review-human')!,view.t).character);
 if(id==='yard'){
  assert.equal(pose(initial,{...e,layer:'devices'},'review-human').visible,false);assert.equal(pose(initial,{...e,layer:'world'},'review-human').visible,true);
  e.m.set('armAt','C-7');initial.preparePresentation!(view,e);const before=initial.presentationState!.capture();
  initial.visualEnvironment!(view,e);initial.drawBackdrop(recorder().ctx,view,e);initial.visualEnvironment!(view,e);assert.deepEqual(initial.presentationState!.capture(),before,'actor paint/queries cannot advance crane');
  initial.preparePresentation!(view,{...e,layer:'devices'});assert.notDeepEqual(initial.presentationState!.capture(),before,'only explicit prepare advances crane');
 }
 if(id==='capsule'){for(const at of ['bed','router','sun']){e.m.set('pixelAt',at);assert.deepEqual(initial.perch!(e.m),SCENES.capsule.perch!(e.m));}}
 e.m.reset();e.m.setPaused(true);
 const s=model.get(id+'-scene').value as SceneDocument,c=model.get(id).value as Composition;
 bindSceneActor(s,c,'review-cat','');removeSceneActor(s,c,'review-copy');model.importDocuments([{id,value:c},{id:id+'-scene',value:s}]);
 const next=pendingRegistry(new Map(model.list().map(d=>[d.id,d.value])))[id];assert.equal(next.people!.length,3);const detached=next.people!.find(p=>actorReactionIdentity(p)==='actor.review-cat')!;assert.deepEqual({x:detached.x,h:detached.h},at);
 const before=structuredClone(model.edits());
 for(const change of [
  (s:SceneDocument,c:Composition)=>removeSceneActor(s,c,'review-human'),
  (s:SceneDocument,c:Composition)=>bindSceneActor(s,c,'review-human','absent'),
  (s:SceneDocument,c:Composition)=>{c.instances.find(r=>r.id===s.actors![0].instance)!.bindings!.pose='missing';},
  (s:SceneDocument,c:Composition)=>{c.instances.find(r=>r.id===s.actors![0].instance)!.pass='foreground';},
  (s:SceneDocument,c:Composition)=>{c.instances=c.instances.filter(r=>r.id!==(id==='yard'?'crane':'door'));},
 ]){const source=model.get(id+'-scene').value as SceneDocument,composition=model.get(id).value as Composition;assert.throws(()=>{change(source,composition);model.importDocuments([{id,value:composition},{id:id+'-scene',value:source}]);});assert.deepEqual(model.edits(),before);}
}
function inspect(values:ReadonlyMap<string,unknown>){const registry=pendingRegistry(values);for(const id of ids){const native=registry[id];assert.equal(native.people!.length,3);assert(native.people!.some(p=>p.id==='review-human'));assert.equal(native.people!.find(p=>p.id==='review-robot')!.conversation,'review.'+id+'.graph');const e=engine(native);assert.equal(pose(native,e,'review-human').visible,true);native.drawBackdrop(recorder().ctx,view,e);e.m.reset();e.m.setPaused(true);}}
inspect(new Map(model.list().map(d=>[d.id,d.value])));
const receiver=make();receiver.importDocuments(readDocumentBundle(createDocumentBundle(model.edits(),model.list()),receiver.list()));inspect(new Map(receiver.list().map(d=>[d.id,d.value])));const edits=structuredClone(model.edits());model.undo();model.redo();assert.deepEqual(model.edits(),edits);
const scratch=path.resolve('../../.scene-system/interior-actors');fs.mkdirSync(scratch,{recursive:true});const dir=fs.mkdtempSync(path.join(scratch,'run-'));for(const d of sourceDocuments){const dest=path.join(dir,d.file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,d.file),dest);}
const store=new AuthoringStore({root:dir,documents:sourceDocuments,validateAll:validateSourceDocuments}),originals=Object.fromEntries(model.edits().map(({id})=>[id,fs.readFileSync(path.join(dir,sourceDocuments.find(d=>d.id===id)!.file),'utf8')]));
const saved=store.save(model.edits().map(e=>({...e,revision:store.read(e.id).revision})));inspect(new Map(store.list().map(d=>[d.id,d.value])));
const plugins=[{name:'saved-source-json',setup(builder:any){builder.onLoad({filter:/\.json$/},(args:any)=>{const relative=path.relative(root,args.path),file=path.join(dir,relative);if(!relative.startsWith('..')&&fs.existsSync(file))return{contents:fs.readFileSync(file,'utf8'),loader:'json'};});}}];
const fresh=path.join(dir,'fresh-interior-actors.mjs');await build({stdin:{contents:`import assert from 'node:assert/strict';import {SCENES} from ${JSON.stringify(path.join(root,'scenes/index.ts'))};for(const id of ${JSON.stringify(ids)}){assert.equal(SCENES[id].people.length,3);assert(SCENES[id].people.some(p=>p.id==='review-human'));assert(SCENES[id].people.some(p=>p.id==='review-robot'&&p.conversation==='review.'+id+'.graph'));}`,resolveDir:root,loader:'ts'},outfile:fresh,bundle:true,platform:'node',format:'esm',target:'es2022',logLevel:'warning',plugins});await import(pathToFileURL(fresh).href);
const sourceIds=ids.flatMap(id=>[id,id+'-scene']),savedBytes=new Map(sourceIds.map(id=>[id,fs.readFileSync(path.join(dir,sourceDocuments.find(d=>d.id===id)!.file),'utf8')]));
for(const id of ids){const source=store.read(id+'-scene').value as SceneDocument,composition=store.read(id).value as Composition;for(const a of source.actors!)delete a.follow;for(const a of [...source.actors!])removeSceneActor(source,composition,a.id);fs.writeFileSync(path.join(dir,'scenes',id,'scene.json'),JSON.stringify(source));fs.writeFileSync(path.join(dir,'scenes',id,'composition.json'),JSON.stringify(composition));}
const empty=path.join(dir,'fresh-empty-interior-actors.mjs');await build({stdin:{contents:`import assert from 'node:assert/strict';import {SCENES} from ${JSON.stringify(path.join(root,'scenes/index.ts'))};for(const id of ${JSON.stringify(ids)})assert.equal(SCENES[id].people.length,0);`,resolveDir:root,loader:'ts'},outfile:empty,bundle:true,platform:'node',format:'esm',target:'es2022',logLevel:'warning',plugins});await import(pathToFileURL(empty).href);
for(const id of sourceIds)fs.writeFileSync(path.join(dir,sourceDocuments.find(d=>d.id===id)!.file),savedBytes.get(id)!);
store.undo(saved.transaction,Object.fromEntries(saved.documents.map(d=>[d.id,d.revision])));for(const[id,bytes]of Object.entries(originals))assert.equal(fs.readFileSync(path.join(dir,sourceDocuments.find(d=>d.id===id)!.file),'utf8'),bytes);
fs.writeFileSync(path.join(dir,'evidence.json'),JSON.stringify({status:'PASS',scenes:ids,checks:['human robot animal actor creation','duplicate/remove','attach/detach','explicit graph references','same native bodies for pose and interaction','followers','Yard split-render visibility','unchanged Yard preparation recurrence','Capsule companion perches','legacy empty defaults','invalid source rejection','bundle/history','protected Save/native reload','fresh saved-source and empty-actor module imports','byte-exact Undo']},null,2)+'\n');
console.log('Interior actors PASS: Capsule/Yard/Moth source actor CRUD/rendering/conversations, shared native bodies, world/device layer policy, preserved perches/recurrence, protected source Save/bundle/fresh reload/Undo. Evidence: '+dir);
