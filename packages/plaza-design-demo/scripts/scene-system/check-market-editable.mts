import {renderScenePresentation} from '../../src/ssg/game/authoring/scene-presentation-authoring';
import {TypedForm} from '../../src/ssg/game/authoring/typed-form';
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {build} from 'esbuild';
import {art,type Composition} from '../../src/ssg/game/art';
import {SCENES} from '../../src/ssg/game/scenes';
import {marketActors,marketScene} from '../../src/ssg/game/scenes/market/index.ts';
import {marketComposition,marketEnvironment,marketGeometry,validateMarketComposition} from '../../src/ssg/game/scenes/market/composition';
import {MARKET_SCENE,validateMarketScene} from '../../src/ssg/game/scenes/market/scene-document';import {MARKET_GAMEPLAY} from '../../src/ssg/game/scenes/market/gameplay';
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
import {talkTo} from '../../src/ssg/game/runtime/characters';
import {mountGameplayAuthoring} from '../../src/ssg/game/authoring/gameplay-authoring';
import {actorReactionIdentity,actorAppearanceSeed} from '../../src/ssg/game/engine/gameplay/actor-identity';
const baseline=JSON.parse(fs.readFileSync(new URL('./market-native-baseline.json',import.meta.url),'utf8'));
const clean=(value:unknown)=>JSON.parse(JSON.stringify(value, (key,v)=>key==='key'?undefined:v));
const actors=marketActors();assert.equal(Object.keys(actors).length,67);
const body=(p:any)=>{const value=JSON.parse(JSON.stringify(p));delete value.name;delete value.talk;delete value.conversation;return value;};
assert.deepEqual(marketScene().people!.map(body),baseline.people.map(body),'all original41 native interaction bodies');
assert.equal(actors['street-24'].follow,actors['street-21']);assert.equal(actors['street-25'].follow,actors['street-20']);
for(const test of baseline.poses){const gy=300,view={sx:(x:number,p=1)=>Math.round(x-500*p),y:(h:number)=>gy-h,gy,t:test.t,cam:500,viewW:640,viewH:360,flags:{}};
 const env=marketEnvironment(view,actors);for(const [key,old]of Object.entries(test.bindings)){
 const {character:_character,...pose}=env.bindings![key] as any;assert.deepEqual(clean(pose),old,'original native pose '+key+' @ '+test.t);
 }}
assert.equal(actorReactionIdentity(actors['street-0']),'slot-4');assert.equal(actorAppearanceSeed(actors['street-0']),1655);
const root=path.resolve('src/ssg/game'),documents=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'fixture',value:JSON.parse(fs.readFileSync(path.join(root,d.file),'utf8'))}));
const context=createSequenceValidationContext(art,{},Object.fromEntries(Object.entries(SCENES).map(([id,s])=>[id,s.exits.map(e=>e.id)])));
const make=()=>{const m=new ComposerModel(art,context,(d,docs)=>{if(d.id==='market-scene')validateSourceDocuments(new Map(docs.map(d=>[d.id,d.value])));});m.load(documents);return m;};
const model=make(),composition=model.get('market').value as Composition,scene=structuredClone(MARKET_SCENE);
const gameplay=JSON.parse(JSON.stringify(MARKET_GAMEPLAY).replaceAll('talk.market.cook.cursor','talk.market.cook.progress'));
// Rebind every actual dialogue/command reference while leaving the old declaration as an orphan.
scene.exits.find(e=>e.requires==='end')!.requires='market:umbrella';
gameplay.state['talk.market.cook.cursor']=structuredClone(MARKET_GAMEPLAY.state!['talk.market.cook.cursor']);

composition.instances.push({id:'review-stool',type:'furniture.stool',props:{seed:1},placement:{x:180,h:0},order:200,layer:'set'});
scene.manifest!.spawn='review-stool';scene.manifest!.exits!.mall={instance:'review-stool',promptH:82};scene.manifest!.uses.fortune={instance:'review-stool',promptH:98};
removeManifestContent(scene,'readables','rules');addManifestContent(scene,'readables','review-note','review-stool');scene.readables!.find(r=>r.id==='review-note')!.pages=['Pending test note.'];
scene.manifest!.rests!.stool={instance:'review-stool',promptH:50};scene.manifest!.uses.haggle={instance:'review-stool',promptH:70};
addManifestContent(scene,'uses','review-action','review-stool');scene.uses.find(u=>u.id==='review-action')!.routes=[{command:'review.grant',pages:['Two tokens.']}];
gameplay.commands['review.grant']={sources:['interaction'],actions:[{tokens:2}]};
composition.instances=composition.instances.filter(i=>!['exit-mall','rules','use-fortune','use-haggle','stool'].includes(i.id));
addSceneActor(scene,composition,'new-resident',{body:'old',garb:'robe'},240,8);duplicateSceneActor(scene,composition,'new-resident','resident-copy');bindSceneActor(scene,composition,'new-resident','scene','origin',240,8);setActorDialogue(scene,'resident-copy',false);
bindSceneActor(scene,composition,'cook','','origin',1940,0);removeSceneActor(scene,composition,'fortuneBot');removeSceneActor(scene,composition,'street-7');bindSceneActor(scene,composition,'brolly','','origin',480,0);composition.instances=composition.instances.filter(i=>i.id!=='stall-2');bindSceneActor(scene,composition,'street-0','','origin',350,0);
model.importDocuments([{id:'market',value:composition},{id:'market-scene',value:scene},{id:'market-gameplay',value:gameplay}]);
// Use the actual typed forms to remove unused historical entries; no canonical resurrection.
class Element{children:Element[]=[];attributes:Record<string,string>={};value='';checked=false;disabled=false;textContent='';onchange?:()=>void;onclick?:()=>void;append(...n:Element[]){this.children.push(...n);}replaceChildren(...n:Element[]){this.children=[...n];}setAttribute(k:string,v:string){this.attributes[k]=v;}remove(){}}
const previousDocument=globalThis.document;(globalThis as any).document={createElement:()=>new Element()};
try{const host=new Element(),editor=mountGameplayAuthoring(host as any,{document:()=>model.get('market-gameplay').value,validate:value=>{validateSourceDocuments(new Map(model.list().map(d=>[d.id,d.id==='market-gameplay'?value:d.value])));return structuredClone(value)as any;},onEdit:(value,label)=>{model.edit('market-gameplay',label,()=>value);editor.refresh();},undo(){},redo(){},save:async()=>{},reload:async()=>{},dirty:()=>true,saveLabel:'Save'}),all=(e:Element):Element[]=>[e,...e.children.flatMap(all)];
 const visualHost=new Element();renderScenePresentation(new TypedForm(error=>{throw error;}),visualHost as any,model.get('market-scene').value as SceneDocument,model.get('market-gameplay').value as any,(label,change)=>model.edit('market-scene',label,value=>{change(value as SceneDocument);return value;}),()=>{});const visualFlag=all(visualHost).find(e=>e.attributes['aria-label']==='Market visual exitOpen flag')!;assert(visualFlag);visualFlag.value='market:umbrella';visualFlag.onchange!();model.edit('market','Remove unreferenced exit-wall picture',value=>{const c=value as Composition,rows=marketGeometry(c);for(const i of c.instances)if(i.attach?.instance==='end-wall'){i.placement={...rows.find(r=>r.instance.id===i.id)!.placement};delete i.attach;}c.instances=c.instances.filter(i=>i.id!=='end-wall');return c;});
 for(const label of ['Remove flags end','Remove State talk.market.cook.cursor']){const button=all(host).find(e=>e.textContent===label&&e.onclick);assert(button,label);button.onclick!();assert(!all(host).find(e=>e.attributes.role==='alert')?.textContent,all(host).find(e=>e.attributes.role==='alert')?.textContent);}
 // A real referenced state still cannot be deleted, and failure leaves pending history unchanged.
 const before=structuredClone(model.edits()),button=all(host).find(e=>e.textContent==='Remove State talk.market.cook.progress'&&e.onclick);assert(button);button.onclick!();assert(all(host).find(e=>e.attributes.role==='alert')?.textContent);assert.deepEqual(model.edits(),before);editor.dispose();
}finally{globalThis.document=previousDocument;}

const inspect=(native:ReturnType<typeof marketScene>)=>{
 for(const [end,umbrella]of [[false,false],[false,true],[true,false],[true,true]]){const view={sx:(x:number)=>x,y:(h:number)=>300-h,gy:300,t:137,cam:0,viewW:640,viewH:360,flags:{end,'market:umbrella':umbrella}};assert.equal(native.visualEnvironment!(view,{}as any).bindings!['market.exitOpen'],umbrella);}
 assert(!native.gameplay!.flags.includes('end'));assert(!native.gameplay!.state!['talk.market.cook.cursor']);assert(native.gameplay!.state!['talk.market.cook.progress']);
 let dialogueState:any={flags:{},items:{},tokens:0};const cook=native.people!.find(p=>p.id==='cook')!;
 const dialogueSession=new GameplaySession(native.gameplay!,{read:()=>dialogueState,write:next=>{dialogueState=next;}});
 assert.equal(talkTo(cook,dialogueSession).pages[0],MARKET_GAMEPLAY.conversations['talk.market.cook'].nodes['visit-0'].pages[0]);
 assert.equal(dialogueSession.state().values!['talk.market.cook'].progress,1);assert.equal(dialogueSession.state().values!['talk.market.cook'].cursor,undefined);dialogueSession.dispose();

 assert.equal(native.spawn,180);assert.equal(native.exits.find(e=>e.id==='mall')!.x,180);assert.equal(native.uses!.find(u=>u.id==='fortune')!.x,180);assert.equal(native.rests![0].x,180);assert.equal(native.readables!.find(r=>r.id==='review-note')!.x,180);assert(!native.readables!.some(r=>r.id==='rules'));
 assert(native.people!.some(p=>p.id==='new-resident'&&p.x===240));assert(native.people!.some(p=>p.id==='resident-copy'&&!p.name));assert(!native.people!.some(p=>p.id==='kid'));assert(native.people!.some(p=>p.id==='cook'&&p.x===1940));
 const gy=300,view={sx:(x:number)=>x,y:(h:number)=>gy-h,gy,t:137,cam:0,viewW:2560,viewH:360,flags:{}},env=native.visualEnvironment!(view,{} as any);
 assert.equal((env.bindings!['market.actor.cook'] as any).visible,true);assert.equal((env.bindings!['market.vendor.stall-0'] as any).visible,false);assert.equal((env.bindings!['market.vendor.fortune'] as any).visible,false);
 assert.equal(actorAppearanceSeed(native.people!.find(p=>actorReactionIdentity(p)==='slot-4')!),1655);assert.equal(native.people!.find(p=>actorReactionIdentity(p)==='slot-28')!.follow,native.people!.find(p=>actorReactionIdentity(p)==='slot-25'));
 let state:any={flags:{},items:{},tokens:0};const session=new GameplaySession(native.gameplay!,{read:()=>state,write:s=>{state=s;}});assert.deepEqual(native.uses!.find(u=>u.id==='review-action')!.use({gameplay:session} as any),['Two tokens.']);assert.equal(state.tokens,2);session.dispose();
};
inspect(pendingRegistry(new Map(model.list().map(d=>[d.id,d.value]))).market);
const noPresentation=structuredClone(model.get('market-scene').value)as SceneDocument;delete noPresentation.presentation;assert.equal(marketScene(model.get('market').value as Composition,{},{},model.get('market-gameplay').value as any,noPresentation).visualEnvironment!({sx:x=>x,y:h=>300-h,gy:300,t:0,cam:0,viewW:640,viewH:360,flags:{end:true,'market:umbrella':true}},{}as any).bindings!['market.exitOpen'],false);

const edits=structuredClone(model.edits());
for(const invalid of [()=>{const d=structuredClone(composition);d.instances=d.instances.filter(i=>i.id!=='scene');model.importDocuments([{id:'market',value:d}]);},()=>{const d=structuredClone(model.get('market-scene').value)as SceneDocument;d.actors![0].reaction='invalid reaction!';model.importDocuments([{id:'market-scene',value:d}]);},()=>{const d=structuredClone(model.get('market-scene').value)as SceneDocument;d.manifest!.uses.fortune='missing';model.importDocuments([{id:'market-scene',value:d}]);}]){assert.throws(invalid);assert.deepEqual(model.edits(),edits);}
for(const field of ['actors','manifest']as const){const missing=structuredClone(MARKET_SCENE);delete missing[field];assert.throws(()=>marketScene(undefined,{},{},undefined,missing),'incomplete '+field+' source must be rejected');}
const empty=structuredClone(MARKET_SCENE),emptyArt=structuredClone(marketComposition);for(const a of empty.actors!)delete a.follow;for(const a of [...empty.actors!])removeSceneActor(empty,emptyArt,a.id);assert.equal(marketScene(emptyArt,{},{},undefined,empty).people!.length,0);marketScene(emptyArt,{},{},undefined,empty).visualEnvironment!({sx:x=>x,y:h=>300-h,gy:300,t:137,cam:0,viewW:640,viewH:360,flags:{}},{} as any);
const receiver=make();receiver.importDocuments(readDocumentBundle(createDocumentBundle(model.edits(),model.list()),receiver.list()));inspect(pendingRegistry(new Map(receiver.list().map(d=>[d.id,d.value]))).market);while(model.canUndo)model.undo();assert(!model.dirty());while(model.canRedo)model.redo();assert.deepEqual(model.edits(),edits);
const scratch=path.resolve('../../.scene-system/market-editable');fs.mkdirSync(scratch,{recursive:true});const dir=fs.mkdtempSync(path.join(scratch,'run-'));for(const d of sourceDocuments){const dest=path.join(dir,d.file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,d.file),dest);}
const store=new AuthoringStore({root:dir,documents:sourceDocuments,validateAll:validateSourceDocuments}),originals=Object.fromEntries(model.edits().map(({id})=>[id,fs.readFileSync(path.join(dir,sourceDocuments.find(d=>d.id===id)!.file),'utf8')]));
const saved=store.save(model.edits().map(e=>({...e,revision:store.read(e.id).revision})));inspect(marketScene(store.read('market').value as Composition,{},{},store.read('market-gameplay').value as any,store.read('market-scene').value as any));
// Loading saved source into a fresh graph must not depend on deleted original art or cached scene constants.
const fresh=path.join(dir,'fresh-market.mjs');
await build({stdin:{contents:`import assert from 'node:assert/strict';import {SCENES} from ${JSON.stringify(path.join(root,'scenes/index.ts'))};assert.equal(SCENES.market.visualEnvironment({sx:x=>x,y:h=>300-h,gy:300,t:137,cam:0,viewW:640,viewH:360,flags:{end:false,'market:umbrella':true}},{}).bindings['market.exitOpen'],true);assert.equal(SCENES.market.spawn,180);assert.equal(SCENES.market.exits.find(e=>e.id==='mall').x,180);assert(!SCENES.market.people.some(p=>p.id==='kid'));assert(SCENES.market.people.some(p=>p.id==='cook'&&p.x===1940));assert(!SCENES.market.gameplay.flags.includes('end'));assert(!SCENES.market.gameplay.state['talk.market.cook.cursor']);assert(SCENES.market.gameplay.state['talk.market.cook.progress']);`,resolveDir:root,loader:'ts'},outfile:fresh,bundle:true,platform:'node',format:'esm',target:'es2022',logLevel:'warning',plugins:[{name:'saved-source-json',setup(builder){builder.onLoad({filter:/\.json$/},args=>{const relative=path.relative(root,args.path),file=path.join(dir,relative);if(!relative.startsWith('..')&&fs.existsSync(file))return{contents:fs.readFileSync(file,'utf8'),loader:'json'};});}}]});
await import(pathToFileURL(fresh).href);
const savedBytes=new Map(['market','market-scene'].map(id=>[id,fs.readFileSync(path.join(dir,sourceDocuments.find(d=>d.id===id)!.file),'utf8')]));
const noActors=structuredClone(store.read('market-scene').value) as SceneDocument,noActorArt=structuredClone(store.read('market').value) as Composition;for(const a of noActors.actors!)delete a.follow;for(const a of [...noActors.actors!])removeSceneActor(noActors,noActorArt,a.id);
fs.writeFileSync(path.join(dir,'scenes/market/scene.json'),JSON.stringify(noActors));fs.writeFileSync(path.join(dir,'scenes/market/composition.json'),JSON.stringify(noActorArt));
const emptyFresh=path.join(dir,'fresh-empty-market.mjs');
await build({stdin:{contents:`import assert from 'node:assert/strict';import {SCENES} from ${JSON.stringify(path.join(root,'scenes/index.ts'))};assert.equal(SCENES.market.spawn,180);assert.equal(SCENES.market.people.length,0);SCENES.market.visualEnvironment({sx:x=>x,y:h=>300-h,gy:300,t:137,cam:0,viewW:640,viewH:360,flags:{}},{});`,resolveDir:root,loader:'ts'},outfile:emptyFresh,bundle:true,platform:'node',format:'esm',target:'es2022',logLevel:'warning',plugins:[{name:'saved-source-json',setup(builder){builder.onLoad({filter:/\.json$/},args=>{const relative=path.relative(root,args.path),file=path.join(dir,relative);if(!relative.startsWith('..')&&fs.existsSync(file))return{contents:fs.readFileSync(file,'utf8'),loader:'json'};});}}]});
await import(pathToFileURL(emptyFresh).href);
for(const id of ['market','market-scene'])fs.writeFileSync(path.join(dir,sourceDocuments.find(d=>d.id===id)!.file),savedBytes.get(id)!);
store.undo(saved.transaction,Object.fromEntries(saved.documents.map(d=>[d.id,d.revision])));for(const[id,bytes]of Object.entries(originals))assert.equal(fs.readFileSync(path.join(dir,sourceDocuments.find(d=>d.id===id)!.file),'utf8'),bytes);
fs.writeFileSync(path.join(dir,'evidence.json'),JSON.stringify({status:'PASS',checks:['67 actor bodies,41 original interactive bodies','3 native pose samples all bodies','ordinary CRUD/rebind and original markers removed','actor CRUD/dialogue/attach/detach','booth body removal and independent rendering','stable reaction/appearance','shared command','typed orphan end flag and cook state deletion without resurrection','rebound real cook conversation progress','referenced state deletion atomic rejection','incomplete source rejection','unreferenced end-wall removable, actual width/actor references protected','atomic history','bundle','protected Save','native reload','fresh saved-source and empty-actors module imports','exact byte Undo']},null,2)+'\n');
console.log('Market editable PASS: 67 actor bodies and native poses; ordinary and actor CRUD/rebind; source-bound booth poses; history/bundle/Save/reload/byte Undo. Evidence: '+dir);
