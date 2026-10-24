import * as PresentationFrame from '../../src/ssg/game/runtime/presentation-frame';
import {runtimeFixture} from './runtime-fixture.mts';
/** Scene ids out of the loop and the controllers: the jack cable for any open schematic, the per-person prompt height, controller rules by kind. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Element} from './rules-harness.mts';
import {Game} from '../../src/ssg/game/runtime/game';
import {AVATAR_PAINTERS} from '../../src/ssg/game/runtime/avatars';
import {playProfile} from '../../src/ssg/game/runtime/play-profile';
import {newSave} from '../../src/ssg/game/runtime/save';
import {BOT_REACTIONS} from '../../src/ssg/game/engine/gameplay/bot-conversations';
import {cameraBindingRoles,cameraBindingProblems} from '../../src/ssg/game/engine/controllers/camera-bindings';
import {controllerProblems} from '../../src/ssg/game/engine/controllers';
import {validateSceneDocument,type SceneDocument} from '../../src/ssg/game/engine/gameplay/scene-document';
import {FOLDER_SOURCES} from '../../src/ssg/game/scenes/folder-scenes';
import {SCENES} from '../../src/ssg/game/scenes';
import path from 'node:path';
import {ComposerModel} from '../../src/ssg/game/authoring/composer-model';
import {createSequenceValidationContext} from '../../src/ssg/game/art/core/sequence-context';
import {art} from '../../src/ssg/game/art';
import {sourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {mountSceneAuthoring} from '../../src/ssg/game/authoring/scene-authoring';
import {pendingRegistry} from '../../src/ssg/game/authoring/pending-registry';

// ---- the deck's jack cable: drawn for whatever scene's schematic is open and stood at
const frames:any[]=[];
const real=AVATAR_PAINTERS[playProfile().player.avatar];AVATAR_PAINTERS[playProfile().player.avatar]=(f:any)=>{frames.push({jack:f.jack,face:f.p.face});};
const scene:any={id:'somewhere',name:'Somewhere',width:400,spawn:10,exits:[]};
const game:any=runtimeFixture(Game);
const host:any={viewing:'box',visionOn:false,model:{attachmentOffsets:()=>undefined,spots:()=>[{id:'box',x:120,y:0},{id:'other',x:300,y:0},{id:'high',x:100,y:60}]}};
Object.assign(game,{save:newSave(),content:{somewhere:scene},sources:{},botReactions:BOT_REACTIONS,x:{},p:{x:100,y:0,face:1,onGround:true},hostOf:()=>host,view:()=>({}),scenes:Object.assign(game.scenes,{here:'somewhere',compiledScenes:new Map(),hosts:new Map(),gameplaySessions:new Map()}),timing:Object.assign(game.timing,{t:0})});
PresentationFrame.drawCharacters(game.presentationFramePort);assert.equal(frames[0].jack?.id,'box','a scene that is not Downtown gets the cable');assert.equal(frames[0].face,1);
game.p.x=200;PresentationFrame.drawCharacters(game.presentationFramePort);assert.equal(frames[1].jack,undefined,'too far from the machine');
game.p.x=100;host.viewing=null;PresentationFrame.drawCharacters(game.presentationFramePort);assert.equal(frames[2].jack,undefined,'no schematic open');
host.viewing='box';game.p.x=140;game.p.face=1;PresentationFrame.drawCharacters(game.presentationFramePort);assert.equal(frames[3].jack?.id,'box');
game.p.x=130;host.model.spots=()=>[{id:'box',x:90,y:0}];PresentationFrame.drawCharacters(game.presentationFramePort);assert.equal(frames[4].face,-1,'the player turns to the machine');
AVATAR_PAINTERS[playProfile().player.avatar]=real;
const gameSource=fs.readFileSync('src/ssg/game/runtime/game.ts','utf8');
assert(!/here === 'downtown'|this\.downtown/.test(gameSource),'no Downtown id for the jack');

// ---- per-person prompt height
const doc=structuredClone(FOLDER_SOURCES.sandbox.scene) as SceneDocument,gameplay={version:1,flags:[],items:[],events:[],commands:{},reactions:[],conversations:{}} as never;
assert(doc.people!.length>0);
const withHeight=structuredClone(doc);withHeight.people![0].promptH=88;
for(const [name,value] of Object.entries({negative:-1,huge:100000,text:'tall',nan:Number.NaN})){const bad=structuredClone(doc);(bad.people![0] as any).promptH=value;assert.throws(()=>validateSceneDocument(bad,gameplay,{actors:true,manifest:true,nativeTargets:()=>{}}),undefined,name);}
// the talk target stands at the declared height, else over the head (+16), exactly as before
const person:any={id:'tall',x:50,look:'cat',talk:[['Hi.']]},standard=game.lifeTargets({...scene,people:[person]}).find((t:any)=>t.id==='talk:tall');
const declared=game.lifeTargets({...scene,people:[{...person,promptH:99}]}).find((t:any)=>t.id==='talk:tall');
assert.equal(declared.promptH,99);assert.notEqual(standard.promptH,99);assert(Number.isFinite(standard.promptH));
assert(!/'fixer'/.test(gameSource),'no fixer id in the loop');
// the editor offers the control and keeps it through dialogue source switches
{const docs=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'fixture',value:JSON.parse(fs.readFileSync(path.join('src/ssg/game',d.file),'utf8'))})),model=new ComposerModel(art,createSequenceValidationContext(art,{},Object.fromEntries(Object.entries(SCENES).map(([id,s])=>[id,s.exits.map(e=>e.id)]))),()=>{});model.load(docs);
 const ui=new Element();let handle:ReturnType<typeof mountSceneAuthoring>;const ctx:any={documents:model.list(),authoring:{get:(id:string)=>model.get(id),edit:(id:string,label:string,value:unknown)=>model.edit(id,label,()=>value)}};
 const rows=(e:Element):Element[]=>[e,...e.children.flatMap(rows)],set=(name:string,value:string)=>{const f=rows(ui).find(e=>e.attributes['aria-label']===name);assert(f,'field '+name);f.value=value;f.onchange!();ctx.documents=model.list();handle.refresh!();};
 handle=mountSceneAuthoring(ui as any,ctx,{scene:'sandbox',fixed:true,focus:{only:['person:lead']}});
 const lead=()=>(model.get('sandbox-scene').value as SceneDocument).people!.find(p=>p.id==='lead')!;
 set('Person lead prompt height','88');assert.equal(lead().promptH,88);
 const compiled=pendingRegistry(new Map(model.list().filter(d=>!d.id.startsWith('authored.')).map(d=>[d.id,d.value]))).sandbox.people!.find(p=>p.id==='lead')!;assert.equal(compiled.promptH,88,'the pending scene carries it into the loop');
 set('Person lead prompt height','0');assert.equal(lead().promptH,undefined,'zero keeps the default');}

// ---- controllers: rules by kind, never by scene id
assert.deepEqual(cameraBindingRoles({kind:'yard'}),['pan','parcel']);assert.deepEqual(cameraBindingRoles({kind:'downtown'}),['feed','loop']);assert.deepEqual(cameraBindingRoles({kind:'stacks'}),['reefers']);
assert.deepEqual(cameraBindingRoles({kind:'sandbox'}),[]);assert.deepEqual(cameraBindingRoles(undefined),[]);
const yard=structuredClone(SCENES.yard.data!) as any;
assert.deepEqual(cameraBindingProblems(yard),[]);
const renamed={...yard,id:'annex'};assert.deepEqual(cameraBindingRoles(renamed.controller),['pan','parcel'],'a renamed scene keeps its controller\'s roles');
const noController={...structuredClone(SCENES.yard.data!),controller:undefined} as any;assert.deepEqual(cameraBindingRoles(noController.controller),[]);
noController.camera={...noController.camera,bindings:{pan:{state:'x',scale:1}}};assert.deepEqual(cameraBindingProblems(noController),['camera.bindings: registered roles required'],'without a controller kind no bindings are registered, whatever the id');
for(const id of ['capsule','stacks','downtown']){const data={...structuredClone(SCENES[id as 'capsule'].data!),controller:undefined} as any;assert.deepEqual(controllerProblems(data),[],id+' without a controller is not judged by its id');}
for(const id of ['yard','capsule','laundromat','moth','beach'])assert.deepEqual(controllerProblems(structuredClone(SCENES[id as 'yard'].data!) as any),[],id+' validates by its controller kind');
const src=fs.readFileSync('src/ssg/game/engine/controllers/index.ts','utf8')+fs.readFileSync('src/ssg/game/engine/controllers/camera-bindings.ts','utf8');
assert(!/data\.id===|scene==='|\(scene:string\)/.test(src),'no scene id branches in controller dispatch');
console.log('Loop scene ids PASS: jack cable in any scene, per-person prompt height, controller rules by kind.');
process.exit(0);
