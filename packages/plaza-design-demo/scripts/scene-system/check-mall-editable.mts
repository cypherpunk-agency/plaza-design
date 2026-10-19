import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {build} from 'esbuild';
import {art,type Composition} from '../../src/ssg/game/art';
import {SCENES} from '../../src/ssg/game/scenes';
import {mallActors,mallScene} from '../../src/ssg/game/scenes/mall/index.ts';
import {mallComposition,mallEnvironment,validateMallComposition} from '../../src/ssg/game/scenes/mall/composition';
import {MALL_SCENE,MALL_GAMEPLAY,validateMallScene} from '../../src/ssg/game/scenes/mall/scene-document';
import type {SceneDocument} from '../../src/ssg/game/engine/gameplay/scene-document';
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
const baseline=JSON.parse(fs.readFileSync(new URL('./mall-native-baseline.json',import.meta.url),'utf8'));
const clean=(value:unknown)=>JSON.parse(JSON.stringify(value, (key,v)=>key==='key'?undefined:v));
const actors=mallActors();assert.equal(Object.keys(actors).length,77);
for(const [id,original]of Object.entries(baseline.actors)){
 const body=structuredClone(actors[id]) as any;delete body.id;delete body.name;delete body.talk;delete body.conversation;
 const expected=structuredClone(original) as any;delete expected.id;delete expected.name;delete expected.talk;
 assert.deepEqual(body,expected,'original body '+id);
}
for(const test of baseline.poses){const gy=test.gy,view={sx:(x:number,p=1)=>Math.round(x-500*p),y:(h:number)=>gy-h,gy,t:test.t,cam:500,viewW:640,viewH:gy+60,flags:{}};
 const env=mallEnvironment(view,actors);for(const [key,old]of Object.entries(test.bindings)){
 const {character:_character,...pose}=env.bindings![key] as any;assert.deepEqual(clean(pose),old,'original native pose '+key+' @ '+test.t+'/'+gy);
 }}
assert.equal(actorReactionIdentity(actors.pigeon),'slot-5');assert.equal(actorAppearanceSeed(actors['floor-7']),6023);
const root=path.resolve('src/ssg/game'),documents=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'fixture',value:JSON.parse(fs.readFileSync(path.join(root,d.file),'utf8'))}));
const context=createSequenceValidationContext(art,{},Object.fromEntries(Object.entries(SCENES).map(([id,s])=>[id,s.exits.map(e=>e.id)])));
const make=()=>{const m=new ComposerModel(art,context,(d,docs)=>{if(d.id==='mall-scene')validateSourceDocuments(new Map(docs.map(d=>[d.id,d.value])));});m.load(documents);return m;};
const model=make(),composition=model.get('mall').value as Composition,scene=structuredClone(MALL_SCENE),gameplay=structuredClone(MALL_GAMEPLAY);
composition.instances.push({id:'review-stool',type:'furniture.stool',props:{seed:1},placement:{x:180,h:0},order:200,pass:'backdrop'});
scene.manifest!.spawn='review-stool';scene.manifest!.exits!.metro={instance:'review-stool',promptH:82};scene.manifest!.uses.kiosk={instance:'review-stool',promptH:96};
removeManifestContent(scene,'readables','kiosk');addManifestContent(scene,'readables','review-note','review-stool');scene.readables!.find(r=>r.id==='review-note')!.pages=['Pending test note.'];
addManifestContent(scene,'rests','review-seat','review-stool');
addManifestContent(scene,'uses','review-action','review-stool');scene.uses.find(u=>u.id==='review-action')!.routes=[{command:'review.grant',pages:['Two chips.']}];
gameplay.commands['review.grant']={sources:['interaction'],actions:[{item:'blankchip',add:2}]};
composition.instances=composition.instances.filter(i=>!['spawn','exit-metro','read-kiosk','use-kiosk'].includes(i.id));
addSceneActor(scene,composition,'new-resident',{body:'old',garb:'robe'},240,8);duplicateSceneActor(scene,composition,'new-resident','resident-copy');bindSceneActor(scene,composition,'new-resident','fountain','origin',20,0);setActorDialogue(scene,'resident-copy',false);
bindSceneActor(scene,composition,'teen','','origin',1540,0);removeSceneActor(scene,composition,'deckTech');removeSceneActor(scene,composition,'kid');
model.importDocuments([{id:'mall',value:composition},{id:'mall-scene',value:scene},{id:'mall-gameplay',value:gameplay}]);
const inspect=(native:ReturnType<typeof mallScene>)=>{
 assert.equal(native.spawn,180);assert.equal(native.exits.find(e=>e.id==='metro')!.x,180);assert.equal(native.uses!.find(u=>u.id==='kiosk')!.x,180);assert.equal(native.rests![0].x,180);assert.equal(native.readables!.find(r=>r.id==='review-note')!.x,180);assert(!native.readables!.some(r=>r.id==='kiosk'));
 assert(native.people!.some(p=>p.id==='new-resident'&&p.x===980));assert(native.people!.some(p=>p.id==='resident-copy'&&!p.name));assert(!native.people!.some(p=>p.id==='kid'));assert(native.people!.some(p=>p.id==='teen'&&p.x===1540));
 const gy=300,view={sx:(x:number)=>x,y:(h:number)=>gy-h,gy,t:137,cam:0,viewW:2560,viewH:360,flags:{}},env=native.visualEnvironment!(view,{} as any);
 assert.equal((env.bindings!['mall.actor.teen'] as any).visible,true);assert.equal((env.bindings!['mall.vendor.teen'] as any).visible,false);assert.equal((env.bindings!['mall.vendor.deckTech'] as any).visible,false);
 let state:any={flags:{},items:{},tokens:0};const session=new GameplaySession(native.gameplay!,{read:()=>state,write:s=>{state=s;}});assert.deepEqual(native.uses!.find(u=>u.id==='review-action')!.use({gameplay:session} as any),['Two chips.']);assert.equal(state.items.blankchip,2);session.dispose();
};
inspect(pendingRegistry(new Map(model.list().map(d=>[d.id,d.value]))).mall);
const edits=structuredClone(model.edits());
for(const invalid of [()=>{const d=structuredClone(composition);d.instances=d.instances.filter(i=>i.id!=='escalator');model.importDocuments([{id:'mall',value:d}]);},()=>{const d=structuredClone(scene);d.actors![0].reaction='changed';model.importDocuments([{id:'mall-scene',value:d}]);},()=>{const d=structuredClone(scene);d.manifest!.uses.kiosk='missing';model.importDocuments([{id:'mall-scene',value:d}]);}]){assert.throws(invalid);assert.deepEqual(model.edits(),edits);}
const legacy=structuredClone(MALL_SCENE);delete legacy.actors;delete legacy.manifest;assert.deepEqual(mallScene(undefined,{},{},legacy).people,mallScene().people);
const empty=structuredClone(MALL_SCENE),emptyArt=structuredClone(mallComposition);for(const a of [...empty.actors!])removeSceneActor(empty,emptyArt,a.id);assert.equal(mallScene(emptyArt,{},{},empty).people!.length,0);mallScene(emptyArt,{},{},empty).visualEnvironment!({sx:x=>x,y:h=>300-h,gy:300,t:137,cam:0,viewW:640,viewH:360,flags:{}},{} as any);
const receiver=make();receiver.importDocuments(readDocumentBundle(createDocumentBundle(model.edits(),model.list()),receiver.list()));inspect(pendingRegistry(new Map(receiver.list().map(d=>[d.id,d.value]))).mall);model.undo();assert(!model.dirty());model.redo();assert.deepEqual(model.edits(),edits);
const scratch=path.resolve('../../.scene-system/mall-editable');fs.mkdirSync(scratch,{recursive:true});const dir=fs.mkdtempSync(path.join(scratch,'run-'));for(const d of sourceDocuments){const dest=path.join(dir,d.file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,d.file),dest);}
const store=new AuthoringStore({root:dir,documents:sourceDocuments,validateAll:validateSourceDocuments}),originals=Object.fromEntries(model.edits().map(({id})=>[id,fs.readFileSync(path.join(dir,sourceDocuments.find(d=>d.id===id)!.file),'utf8')]));
const saved=store.save(model.edits().map(e=>({...e,revision:store.read(e.id).revision})));inspect(mallScene(store.read('mall').value as Composition,{},{},store.read('mall-scene').value as any,store.read('mall-gameplay').value as any));
// Loading saved source into a fresh graph must not depend on deleted original art or cached scene constants.
const fresh=path.join(dir,'fresh-mall.mjs');
await build({stdin:{contents:`import assert from 'node:assert/strict';import {SCENES} from ${JSON.stringify(path.join(root,'scenes/index.ts'))};assert.equal(SCENES.mall.spawn,180);assert.equal(SCENES.mall.exits.find(e=>e.id==='metro').x,180);assert(!SCENES.mall.people.some(p=>p.id==='kid'));assert(SCENES.mall.people.some(p=>p.id==='teen'&&p.x===1540));`,resolveDir:root,loader:'ts'},outfile:fresh,bundle:true,platform:'node',format:'esm',target:'es2022',logLevel:'warning',plugins:[{name:'saved-source-json',setup(builder){builder.onLoad({filter:/\.json$/},args=>{const relative=path.relative(root,args.path),file=path.join(dir,relative);if(!relative.startsWith('..')&&fs.existsSync(file))return{contents:fs.readFileSync(file,'utf8'),loader:'json'};});}}]});
await import(pathToFileURL(fresh).href);
const savedBytes=new Map(['mall','mall-scene'].map(id=>[id,fs.readFileSync(path.join(dir,sourceDocuments.find(d=>d.id===id)!.file),'utf8')]));
const noActors=structuredClone(store.read('mall-scene').value) as SceneDocument,noActorArt=structuredClone(store.read('mall').value) as Composition;for(const a of [...noActors.actors!])removeSceneActor(noActors,noActorArt,a.id);
fs.writeFileSync(path.join(dir,'scenes/mall/scene.json'),JSON.stringify(noActors));fs.writeFileSync(path.join(dir,'scenes/mall/composition.json'),JSON.stringify(noActorArt));
const emptyFresh=path.join(dir,'fresh-empty-mall.mjs');
await build({stdin:{contents:`import assert from 'node:assert/strict';import {SCENES} from ${JSON.stringify(path.join(root,'scenes/index.ts'))};assert.equal(SCENES.mall.spawn,180);assert.equal(SCENES.mall.people.length,0);SCENES.mall.visualEnvironment({sx:x=>x,y:h=>300-h,gy:300,t:137,cam:0,viewW:640,viewH:360,flags:{}},{});`,resolveDir:root,loader:'ts'},outfile:emptyFresh,bundle:true,platform:'node',format:'esm',target:'es2022',logLevel:'warning',plugins:[{name:'saved-source-json',setup(builder){builder.onLoad({filter:/\.json$/},args=>{const relative=path.relative(root,args.path),file=path.join(dir,relative);if(!relative.startsWith('..')&&fs.existsSync(file))return{contents:fs.readFileSync(file,'utf8'),loader:'json'};});}}]});
await import(pathToFileURL(emptyFresh).href);
for(const id of ['mall','mall-scene'])fs.writeFileSync(path.join(dir,sourceDocuments.find(d=>d.id===id)!.file),savedBytes.get(id)!);
store.undo(saved.transaction,Object.fromEntries(saved.documents.map(d=>[d.id,d.revision])));for(const[id,bytes]of Object.entries(originals))assert.equal(fs.readFileSync(path.join(dir,sourceDocuments.find(d=>d.id===id)!.file),'utf8'),bytes);
fs.writeFileSync(path.join(dir,'evidence.json'),JSON.stringify({status:'PASS',checks:['77 original bodies','6 native pose samples all bodies','ordinary CRUD/rebind and original markers removed','actor CRUD/dialogue/attach/detach','booth body removal and independent rendering','stable reaction/appearance','shared command','legacy omission migration','protected escalator','atomic history','bundle','protected Save','native reload','fresh saved-source and empty-actors module imports','exact byte Undo']},null,2)+'\n');
console.log('Mall editable PASS: 77 original bodies and native poses; ordinary and actor CRUD/rebind; source-bound booth poses; history/bundle/Save/reload/byte Undo. Evidence: '+dir);
