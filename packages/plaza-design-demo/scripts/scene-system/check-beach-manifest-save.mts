import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {pathToFileURL} from 'node:url';import {build} from 'esbuild';
import {art,type Composition} from '../../src/ssg/game/art';
import {SCENES} from '../../src/ssg/game/scenes';
import {beachScene} from '../../src/ssg/game/scenes/beach';
import {beachComposition,beachEnvironment,beachGeometry,validateBeachComposition} from '../../src/ssg/game/scenes/beach/composition';
import {beachActors} from '../../src/ssg/game/scenes/beach/scene';
import {content} from '../../src/ssg/game/scenes/beach/scene-document';
import {ComposerModel} from '../../src/ssg/game/authoring/app';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {createSequenceValidationContext} from '../../src/ssg/game/authoring/sequence-preview';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';
import {pendingRegistry} from '../../src/ssg/game/authoring/pending-registry';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import {addManifestContent,removeManifestContent} from '../../src/ssg/game/engine/gameplay/manifest-content';
import {addSceneActor,removeSceneActor,duplicateSceneActor,bindSceneActor} from '../../src/ssg/game/engine/gameplay/actor-content';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {actorReactionIdentity} from '../../src/ssg/game/engine/gameplay/actor-identity';
import {frameView} from '../../src/ssg/game/art/core/view';
import {recorder} from './capture-actor-paint.mts';
import {SceneModel} from '../../src/ssg/game/engine/model';
const root=path.resolve('src/ssg/game'),documents=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'fixture',value:JSON.parse(fs.readFileSync(path.join(root,d.file),'utf8'))}));
const context=createSequenceValidationContext(art,{},Object.fromEntries(Object.entries(SCENES).map(([id,s])=>[id,s.exits.map(e=>e.id)])));
const make=()=>{const m=new ComposerModel(art,context,(d,docs)=>{if(d.id==='beach-scene')validateSourceDocuments(new Map(docs.map(d=>[d.id,d.value])));});m.load(documents);return m;};
const scene=structuredClone(content.scene),composition=structuredClone(beachComposition),gameplay=structuredClone(content.gameplay);
composition.instances.push({id:'review-stool',type:'furniture.stool',props:{seed:1},placement:{x:180,h:0},order:200,pass:'backdrop'});
scene.manifest!.spawn='review-stool';scene.manifest!.exits!.harbor='review-stool';scene.manifest!.uses.order={instance:'review-stool',promptH:70,responseH:70};
removeManifestContent(scene,'readables','notice');addManifestContent(scene,'readables','review-note','review-stool');scene.readables!.find(r=>r.id==='review-note')!.pages=['Pending test note.'];
addManifestContent(scene,'uses','review-action','review-stool');scene.uses.find(u=>u.id==='review-action')!.routes=[{command:'review.grant',pages:['Two chips.']}];gameplay.commands['review.grant']={sources:['interaction'],actions:[{tokens:2}]};
const caster=composition.instances.find(i=>i.id==='caster-board')!;delete caster.attach;caster.placement={x:118,h:0};
composition.instances=composition.instances.filter(i=>!['spawn','edge-exit','notice','order'].includes(i.id));
addSceneActor(scene,composition,'review-human',{garb:'robe'},200,0,true);addSceneActor(scene,composition,'review-animal','cat',220,0,false);addSceneActor(scene,composition,'review-robot',{bot:'loader'},240,0,true);duplicateSceneActor(scene,composition,'review-human','review-copy');removeSceneActor(scene,composition,'review-copy');
bindSceneActor(scene,composition,'lime-talk','review-stool','origin',30,14);
const inspect=(native:ReturnType<typeof beachScene>)=>{assert.equal(native.spawn,180);assert.equal(native.exits.find(e=>e.id==='harbor')!.x,180);assert.equal(native.uses!.find(u=>u.id==='order')!.x,180);assert.equal(native.readables!.find(r=>r.id==='review-note')!.x,180);assert(!native.readables!.some(r=>r.id==='notice'));assert.equal(native.people!.find(p=>p.id==='lime')!.x,210);assert.equal(native.people!.find(p=>p.id==='lime')!.h,14);assert.equal(actorReactionIdentity(native.people!.find(p=>p.id==='lime')!),'lime');let state:any={flags:{},items:{},tokens:0};const session=new GameplaySession(native.gameplay!,{read:()=>state,write:s=>{state=s;}});assert.deepEqual(native.uses!.find(u=>u.id==='review-action')!.use({gameplay:session} as any),['Two chips.']);assert.equal(state.tokens,2);session.dispose();};
inspect(beachScene(composition,{},{},gameplay,scene));
const m=new SceneModel({say:()=>{},open:()=>{},changed:()=>{}},SCENES.beach.data!,SCENES.beach.rules as any),view=frameView(175);
const env=()=>beachEnvironment(composition,view,m,null,beachActors(composition,scene),{shooed:100});
let bindings=env().bindings!;assert.equal(bindings['beach.limeVisible'],true);assert.equal(bindings['beach.limeX'],210);assert.equal(bindings['beach.limeH'],10);assert.equal((bindings['actor.lime-talk.pose'] as any).visible,false);
bindSceneActor(scene,composition,'lime-talk','',undefined,300,24);bindings=env().bindings!;assert.equal(bindings['beach.limeX'],300);assert.equal(bindings['beach.limeH'],20);
// A detached native bartender remains visible when the bar is outside the camera.
bindSceneActor(scene,composition,'lime-talk','',undefined,1200,24);
const offView={...view,sx:(x:number)=>x-1000,cam:1000,viewW:400},offEnv=beachEnvironment(composition,offView,m,null,beachActors(composition,scene),{shooed:100});assert.equal(offEnv.bindings!['beach.barVisible'],false);
const paint=recorder(),visual=Object.fromEntries(Object.entries(offEnv.bindings!).filter(([k])=>k.startsWith('beach.')).map(([k,v])=>[k.slice(6),v]));art.get('beach.lime').draw(paint.ctx,offEnv.view,{},visual as any,'backdrop',{x:532,h:0,scale:1,facing:1,parallax:1});assert(paint.paints.length>0,'detached native bartender renders with bar offscreen');
bindSceneActor(scene,composition,'lime-talk','',undefined,300,24);
scene.actors!.find(a=>a.id==='lime-talk')!.look={bot:'waiter'};bindings=env().bindings!;assert.equal(bindings['beach.limeVisible'],false);assert.equal((bindings['actor.lime-talk.pose'] as any).visible,true);
delete scene.actors!.find(a=>a.id==='lime-talk')!.look;bindSceneActor(scene,composition,'lime-talk','review-stool','origin',30,14);
// The original 7 ashore people remain driven by the lifeguard flag, with their source bodies editable.
bindings=env().bindings!;for(let i=0;i<7;i++)assert.equal((bindings['actor.ashore-'+i+'.pose'] as any).visible,false);
m.set('flag','danger');bindings=env().bindings!;for(let i=0;i<7;i++)assert.equal((bindings['actor.ashore-'+i+'.pose'] as any).visible,true);
const removed=structuredClone(scene),removedArt=structuredClone(composition);removeSceneActor(removed,removedArt,'lime-talk');assert.equal(beachEnvironment(removedArt,view,m,null,beachActors(removedArt,removed),{shooed:0}).bindings!['beach.limeVisible'],false);assert(!beachScene(removedArt,{},{},gameplay,removed).people!.some(p=>p.id==='lime'));
const actorInstances=new Set(removed.actors!.map(a=>a.instance));for(const row of beachGeometry(removedArt)){if(row.instance.attach&&actorInstances.has(row.instance.attach.instance)){const node=removedArt.instances.find(n=>n.id===row.instance.id)!;delete node.attach;node.placement={x:row.placement.x,h:row.placement.h};}}
for(const a of [...removed.actors!])removeSceneActor(removed,removedArt,a.id);assert.equal(beachScene(removedArt,{},{},gameplay,removed).people!.length,0);
const model=make();model.importDocuments([{id:'beach',value:composition},{id:'beach-scene',value:scene},{id:'beach-gameplay',value:gameplay}]);inspect(pendingRegistry(new Map(model.list().map(d=>[d.id,d.value]))).beach);const edits=structuredClone(model.edits());
for(const id of ['stairs-exit','gull','tower','drone']){const invalid=structuredClone(composition);invalid.instances=invalid.instances.filter(i=>i.id!==id);assert.throws(()=>model.importDocuments([{id:'beach',value:invalid}]));assert.deepEqual(model.edits(),edits);}
const legacy=structuredClone(content.scene);delete legacy.actors;delete legacy.manifest;assert.deepEqual(beachScene(undefined,{},{},undefined,legacy).people,beachScene().people);
const receiver=make();receiver.importDocuments(readDocumentBundle(createDocumentBundle(model.edits(),model.list()),receiver.list()));inspect(pendingRegistry(new Map(receiver.list().map(d=>[d.id,d.value]))).beach);model.undo();assert(!model.dirty());model.redo();assert.deepEqual(model.edits(),edits);
const scratch=path.resolve('../../.scene-system/beach-manifest-save');fs.mkdirSync(scratch,{recursive:true});const dir=fs.mkdtempSync(path.join(scratch,'run-'));for(const d of sourceDocuments){const dest=path.join(dir,d.file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,d.file),dest);}
const store=new AuthoringStore({root:dir,documents:sourceDocuments,validateAll:validateSourceDocuments}),originals=Object.fromEntries(model.edits().map(({id})=>[id,fs.readFileSync(path.join(dir,sourceDocuments.find(d=>d.id===id)!.file),'utf8')]));
const saved=store.save(model.edits().map(e=>({...e,revision:store.read(e.id).revision})));inspect(beachScene(store.read('beach').value as Composition,{},{},store.read('beach-gameplay').value as any,store.read('beach-scene').value as any));// Fresh graph reload must survive deleted original markers and every actor removed.
for(const [label,sc,comp] of [['saved',scene,composition],['empty',removed,removedArt]] as const){
 const fresh=path.join(dir,'fresh-'+label+'.mjs');
 await build({stdin:{contents:`import assert from 'node:assert/strict';import {SCENES} from ${JSON.stringify(path.join(root,'scenes/index.ts'))};import {BEACH_SPAWN,BEACH_EDGE_X} from ${JSON.stringify(path.join(root,'scenes/beach/scene.ts'))};assert.equal(SCENES.beach.spawn,180);assert.equal(BEACH_SPAWN,180);assert.equal(BEACH_EDGE_X,180);assert.equal(SCENES.beach.people.length,${label==='empty'?0:11});`,resolveDir:root,loader:'ts'},outfile:fresh,bundle:true,platform:'node',format:'esm',target:'es2022',logLevel:'warning',plugins:[{name:'saved-beach-json',setup(builder){builder.onLoad({filter:/\.json$/},args=>{const relative=path.relative(root,args.path);if(relative===path.join('scenes','beach','scene.json'))return{contents:JSON.stringify(sc),loader:'json'};if(relative===path.join('scenes','beach','composition.json'))return{contents:JSON.stringify(comp),loader:'json'};const file=path.join(dir,relative);if(!relative.startsWith('..')&&fs.existsSync(file))return{contents:fs.readFileSync(file,'utf8'),loader:'json'};});}}]});await import(pathToFileURL(fresh).href);
}
store.undo(saved.transaction,Object.fromEntries(saved.documents.map(d=>[d.id,d.revision])));for(const[id,bytes]of Object.entries(originals))assert.equal(fs.readFileSync(path.join(dir,sourceDocuments.find(d=>d.id===id)!.file),'utf8'),bytes);
fs.writeFileSync(path.join(dir,'evidence.json'),JSON.stringify({status:'PASS',checks:['ordinary add/remove/rebind','original ordinary artwork removed','all24 actors editable/removable','human animal robot creation','Lime native sprite move/rebind/delete/appearance switch','danger ashore visibility','shared command','legacy defaults','protected native controllers','pending native source','atomic history','bundle','protected Save','native reload','exact byte Undo','fresh saved-source and all-actors-empty module graphs','detached native Lime visible with bar offscreen']},null,2)+'\n');console.log('Beach manifest and 24 actor Save PASS. Evidence: '+dir);
