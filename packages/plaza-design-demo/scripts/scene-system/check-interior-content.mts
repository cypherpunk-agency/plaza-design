import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {gameplayScene} from '../../src/ssg/game/authoring/gameplay-scenes';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {ComposerModel} from '../../src/ssg/game/authoring/app';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';
import {createSequenceValidationContext} from '../../src/ssg/game/authoring/sequence-preview';
import {art} from '../../src/ssg/game/art';import {SCENES} from '../../src/ssg/game/scenes';
import type {SceneDef} from '../../src/ssg/game/scenes/kit';
const frozen=path.resolve('../../.scene-system/all-game-baseline-2026-10-18/source');
const docs=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'fixture',value:JSON.parse(fs.readFileSync('src/ssg/game/'+d.file,'utf8'))}));
const ctx=createSequenceValidationContext(art,{},Object.fromEntries(Object.entries(SCENES).map(([id,s])=>[id,s.exits.map(e=>e.id)])));
const validate=(d:{id:string},rows:typeof docs)=>{if(d.id===docs[0].id)validateSourceDocuments(new Map(rows.map(d=>[d.id,d.value])));};
const model=new ComposerModel(art,ctx,validate);model.load(docs);
function create(scene:SceneDef){const lines:unknown[]=[],gifts:string[]=[],modules:string[]=[];
 const rules=scene.rules;if(!rules||typeof rules==='function')throw new Error('Expected static interior rules');
 const m=new SceneModel({say:l=>lines.push(l),changed:()=>{},open:()=>{},keyring:()=>gifts,give:id=>gifts.push(id),modules:()=>modules,grant:id=>modules.push(id)},scene.data!,rules);
 return {m,lines,gifts,modules};
}
function exercise(scene:SceneDef,state:Record<string,string|boolean>,ids:string[]){const run=create(scene);for(const[k,v]of Object.entries(state))run.m.set(k,v);
 const targets=scene.targets!(run.m),exits=ids.map(id=>scene.use!(id,run.m,l=>run.lines.push(l))),after=scene.targets!(run.m);
 return {targets,exits,after,state:run.m.state,goals:[...run.m.goals],lines:run.lines,gifts:run.gifts,modules:run.modules,save:run.m.snapshot()};
}
function baselineProjection(result:ReturnType<typeof exercise>,id:string){const value=structuredClone(result);if(id==='yard'){assert.equal(value.state.gateUntil,0);delete value.state.gateUntil;delete value.save.state.gateUntil;}return value;}
let cases=0;
for(const id of ['capsule','yard','moth']){
 const original=(await import(pathToFileURL(path.join(frozen,'scenes',id,'index.ts')).href))[id] as SceneDef,registered=gameplayScene(id);
 const composition=model.get(id).value as any,doc=model.get(id+'-scene').value as any,gp=model.get(id+'-gameplay').value as any;
 const scene=registered.definition(composition,{},{},doc,gp);
 assert.equal(scene.name,original.name);assert.deepEqual(scene.exits,original.exits);assert.equal(scene.spawn,original.spawn);assert.equal(scene.width,original.width);assert.deepEqual(scene.rests,original.rests); // Rule bodies now belong to shared source commands; compare actual outcomes below.
 for(const touch of [false,true])assert.deepEqual(typeof scene.intro==='function'?scene.intro(touch):scene.intro,typeof original.intro==='function'?original.intro(touch):original.intro);
 const states=id==='capsule'?[{doorOpen:false},{doorOpen:true}]:id==='yard'?['A-3','hook','chute','sliding','bounced','tray','taken'].map(parcelAt=>({parcelAt})):[{}];
 for(const state of states){const uses=id==='yard'?['tray','tray','missing']:['door','door','missing'],expected=exercise(original,state,uses),actual=exercise(scene,state,uses);assert.deepEqual(baselineProjection(actual,id),expected,id+' '+JSON.stringify(state));
  const reloaded=create(scene);reloaded.m.restore(actual.save);assert.deepEqual(reloaded.m.snapshot(),actual.save);cases++;
 }
 // Pending edits execute from content and keep the geometry tied to the composition.
 const pending=structuredClone(doc);pending.intro=['Pending arrival'];if(pending.introTouch)pending.introTouch=['Pending touch'];pending.nativeTargets[0].promptH+=9;
 const response=pending.nativeTargets[0].routes.flatMap((r:any)=>r.steps).find((s:any)=>'say'in s);response.say=['pending','Pending device response','dim'];
 model.edit(id+'-scene','Edit interior target',()=>pending);
 const edited=registered.definition(composition,{},{},registered.validateScene(model.get(id+'-scene').value,gp),gp);
 const state=id==='yard'?{parcelAt:'tray'}:id==='capsule'?{doorOpen:false}:{};
 const old=exercise(scene,state,[id==='yard'?'tray':'door']),next=exercise(edited,state,[id==='yard'?'tray':'door']);assert.equal(next.targets[0].promptH,old.targets[0].promptH!+9);assert.ok(next.lines.some((l:any)=>l[1]==='Pending device response'));
 if(id!=='yard'){const moved=structuredClone(composition),door=moved.instances.find((n:any)=>n.id==='door');door.placement.x+=17;door.placement.h+=13;const translated=registered.definition(moved,{},{},pending,gp),r=create(translated);assert.equal(translated.targets!(r.m)[0].x,next.targets[0].x+17);assert.equal(translated.targets!(r.m)[0].promptH,next.targets[0].promptH!+13);}
 for(const mutate of [
  (d:any)=>{d.nativeTargets[0].anchor='absent';},
  (d:any)=>{d.nativeTargets[0].if='unregisteredState';},
  (d:any)=>{d.nativeTargets[0].labels[0].text='missing-label';},
  (d:any)=>{d.nativeTargets[0].routes[0].steps=[{do:[{goal:'missing-goal'}]}];},
  (d:any)=>{d.nativeTargets[0].routes[0].steps=[{do:[{give:'missing-gift'}]}];},
  (d:any)=>{d.nativeTargets[0].routes[0].steps=[{do:[{set:Object.keys(scene.data!.state)[0],to:[]}]}];},
  (d:any)=>{d.nativeTargets[0].routes[0].steps=[{exit:'not-an-engine-exit'}];},
  (d:any)=>{d.nativeTargets[0].routes[0].steps=[{say:'missing-response'}];},
  (d:any)=>{d.nativeTargets[0].routes[0].steps=[{do:[{goal:'missing',give:'tokens',count:1}]}];},
 ]){const invalid=structuredClone(doc);mutate(invalid);assert.throws(()=>registered.validateScene(invalid,gp));}
}
const receiver=new ComposerModel(art,ctx,validate);receiver.load(docs);receiver.importDocuments(readDocumentBundle(createDocumentBundle(model.edits(),model.list()),receiver.list()));assert.equal(receiver.edits().length,3);receiver.undo();assert.equal(receiver.dirty(),false);receiver.redo();assert.equal(receiver.edits().length,3);
const before=receiver.list(),invalid=structuredClone(receiver.get('yard-scene').value) as any;invalid.nativeTargets[0].routes[0].steps=[{do:[{set:'parcelAt',to:'taken'},{give:'missing'}]}];assert.throws(()=>receiver.importDocuments([{id:'yard-scene',value:invalid}]));assert.deepEqual(receiver.list(),before);
console.log('Interior content PASS: '+cases+' immutable original state/outcome/repeat/current-save cases, exact geometry and touch/desktop arrivals; pending target text/heights and translated anchors; invalid operations rejected; three-document atomic bundle/history.');
