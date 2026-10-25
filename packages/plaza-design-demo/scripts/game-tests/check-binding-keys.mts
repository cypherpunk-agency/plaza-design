/** Binding keys: every folder scene's providers return only keys they declare, every composition binding is one its provider offers, and a typo is refused (folder-scene build and the composer's save) with a message naming the instance and binding. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {BINDING_PROVIDERS} from '../../src/ssg/game/engine/gameplay/binding-providers';
import {bindingKeyProblem,bindingKeyScope,offeredNames} from '../../src/ssg/game/engine/gameplay/binding-keys';
import {FOLDER_SOURCES} from '../../src/ssg/game/scenes/folder-scenes';
import {sceneSourceDefinition} from '../../src/ssg/game/engine/gameplay/folder-scene';
import {unofferedBindings,knownBindingSource} from '../../src/ssg/game/engine/gameplay/binding-sources';
import {art} from '../../src/ssg/game/art';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {emptyData} from '../../src/ssg/game/engine/empty-data';
import {newSave} from '../../src/ssg/game/runtime/save';
import {referenceView} from './reference-view';
import {sourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {pendingRegistry} from '../../src/ssg/game/authoring/pending-registry';
import {ComposerModel} from '../../src/ssg/game/authoring/composer-model';
import {createSequenceValidationContext} from '../../src/ssg/game/art/core/sequence-context';
import type {SceneDef} from '../../src/ssg/game/scenes/kit';
import type {Composition,Instance} from '../../src/ssg/game/art/core/composition';

performance.now=()=>1000;
(globalThis as Record<string,unknown>).document??={createElement(){const ctx=new Proxy({canvas:{width:1600,height:900}} as Record<string,unknown>,{get(o,k){if(k in o)return o[k as string];if(k==='getTransform')return()=>({a:1,b:0,c:0,d:1,e:0,f:0});if(k==='measureText')return(s:string)=>({width:String(s).length*5});if(k==='createLinearGradient'||k==='createRadialGradient'||k==='createConicGradient'||k==='createPattern')return()=>({addColorStop(){}});if(k==='getImageData')return()=>({data:new Uint8ClampedArray(4)});return()=>undefined;},set(o,k,v){o[k as string]=v;return true;}});return{width:0,height:0,style:{},getContext:()=>ctx};}};
const flat=(ns:Instance[]):Instance[]=>ns.flatMap(n=>[n,...flat(n.children??[])]);

// 1. Every provider declares keys, and a declaration is well formed.
for(const[name,provider]of Object.entries(BINDING_PROVIDERS)){assert.ok(Array.isArray(provider.keys)&&provider.keys.length,name+' declares the keys it offers');assert.equal(new Set(provider.keys).size,provider.keys.length,name+' declares no key twice');}

// 2. What every provider returns at runtime, for every folder scene, matches its declaration.
const seen=new Map<string,Set<string>>(),current={scene:''};
for(const[name,original]of Object.entries(BINDING_PROVIDERS)){
 (BINDING_PROVIDERS as Record<string,unknown>)[name]=Object.assign((ctx:Parameters<typeof original>[0])=>{
  const out=original(ctx),scope=bindingKeyScope(art.validate(FOLDER_SOURCES[current.scene as keyof typeof FOLDER_SOURCES].composition).instances,ctx.source as never);
  for(const key of Object.keys(out)){const problem=bindingKeyProblem(original.keys,key,scope);assert.equal(problem,null,`${current.scene}: provider ${name} returned "${key}", which it does not declare: ${problem}`);if(!seen.has(name))seen.set(name,new Set());seen.get(name)!.add(key);}
  return out;},{keys:original.keys,...(original.signals?{signals:original.signals}:{})});
}
const player=new Proxy({save:()=>newSave()} as Record<string,unknown>,{get(o,k){return k in o?o[k as string]:()=>undefined;}});
let scenes=0;
for(const id of Object.keys(FOLDER_SOURCES)){
 current.scene=id;
 const src=FOLDER_SOURCES[id as keyof typeof FOLDER_SOURCES],scene:SceneDef=sceneSourceDefinition(id,src);
 const rules=typeof scene.rules==='function'?scene.rules(player as never):scene.rules??{effects:{}},m=new SceneModel({say(){},changed(){},open(){}} as never,scene.data??emptyData(scene.id,scene.name),rules as never,undefined,undefined,undefined,undefined,scene.gameplay);m.setPaused(true);
 // every binding the composition uses is offered (also the builder's job; asserted here by name)
 const doc=art.validate(src.composition) as Composition;
 assert.deepEqual(unofferedBindings(doc,src.scene as never),[],id+': bindings offered');
 for(const layer of ['all','world','devices'] as const)for(const cam of [0,.5,1])for(const t of [0,4321]){
  const view=referenceView({sx:(wx:number,p=1)=>Math.round(wx-Math.max(0,(scene.width-960)*cam)*p),y:(h:number)=>300-h,t,cam:Math.max(0,(scene.width-960)*cam),gy:300,viewW:960,viewH:390,flags:{end:cam===1}}),engine={m,hover:null,layer};
  scene.preparePresentation?.(view,engine);scene.visualEnvironment?.(view,engine);
 }
 scenes++;
}
console.log('Runtime keys: '+scenes+' folder scenes; '+[...seen].map(([p,k])=>p+':'+k.size).join(' '));

// 3. A binding its provider does not offer is refused, with a message naming the instance and the binding.
type Match=(source:string)=>boolean;
const bound=(prefix:string|RegExp):Match=>typeof prefix==='string'?s=>s.startsWith(prefix):s=>prefix.test(s);
/** Rebinds the first binding that matches to `source`: the instance, its field and the corrupted composition. */
const rebind=(composition:Composition,match:Match,source:string)=>{
 const node=flat(composition.instances).find(n=>Object.values(n.bindings??{}).some(match))!;assert.ok(node,'a binding to corrupt');
 const field=Object.keys(node.bindings!).find(k=>match(node.bindings![k]))!;node.bindings![field]=source;return node;
};
const refused=(id:keyof typeof FOLDER_SOURCES,match:Match,source:string,reason:RegExp)=>{
 const composition=structuredClone(FOLDER_SOURCES[id].composition) as unknown as Composition,node=rebind(composition,match,source);
 assert.throws(()=>sceneSourceDefinition(id,{...FOLDER_SOURCES[id],composition}),(e:Error)=>e.message.includes('Binding not offered')&&e.message.includes('"'+node.id+'"')&&e.message.includes('"'+source+'"')&&reason.test(e.message),`${id}: ${source} is refused with a clear message`);
};
// downtown: a front/window/trim name that is not one, and a misspelt key
refused('downtown',bound('downtown.front.'),'downtown.front.nope.metrics',/no downtown\.front artwork instance "nope"/);
refused('downtown',bound('downtown.window.'),'downtown.window.nope.enabled',/no downtown\.window artwork instance "nope"/);
refused('downtown',bound('downtown.window.'),'downtown.windows.x.enabled',/does not offer it/);
refused('downtown',bound('downtown.pose.'),'downtown.pose.nobody',/no actor "nobody"/);
refused('downtown',bound('downtown.smear.'),'downtown.smear.open-sign.x',/does not offer it/);
// stations: an unknown station binding, and an embedded rider naming no actor
for(const id of ['metro','galleriaStation','harborStation'] as const){
 // Underground Metro no longer binds a canopy roof; corrupt a real station binding.
 refused(id,bound('station.'),'station.roofs',/does not offer it/);
 refused(id,bound('station.pose.'),'station.pose.nobody',/no actor "nobody"/);
 refused(id,bound('station.pose.regular.embedded'),'station.pose.nobody.embedded',/no actor "nobody"/);
}
refused('train',bound('train.frame'),'train.frames',/does not offer it/);
refused('train',bound(/^train\..*\.width$/),'train.nope.width',/no train\.windowFrame artwork instance "nope"/);
// scene values: a name the scene's stage does not declare, and held artwork that is not in the composition
refused('moth',bound('scene.fed'),'scene.notAValue',/declares no value "notAValue"/);
refused('moth',bound('scene.fed'),'scene.cue.nope',/declares no value "cue.nope"/);
refused('moth',bound('scene.fed'),'scene.fedd',/declares no value "fedd"/);
refused('laundromat',bound('scene.w1'),'scene.washer9',/declares no value "washer9"/);
refused('mall',bound('held.'),'held.nowhere',/no artwork instance "nowhere"/);
refused('market',bound('held.'),'held.nowhere',/no artwork instance "nowhere"/);
// a name no registered provider owns is still the old refusal
assert.equal(knownBindingSource('nowhere.x'),false);

// 4. The composer refuses the same edit on save (the pending registry validates the declared scene).
const base=new Map(sourceDocuments.map(d=>[d.id,JSON.parse(fs.readFileSync('src/ssg/game/'+d.file,'utf8'))]));
for(const[scene,pick,source]of [['downtown',bound('downtown.window.'),'downtown.window.nope.enabled'],['metro',bound('station.pose.regular.embedded'),'station.pose.nobody.embedded'],['moth',bound('scene.fed'),'scene.notAValue']] as const){
 const docId=scene;
 const model=new ComposerModel(art,createSequenceValidationContext(art,{}),(d,all)=>{if(d.id===docId)pendingRegistry(new Map(all.map(x=>[x.id,x.value])));});
 model.load(sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'fixture',value:structuredClone(base.get(d.id))})));
 const before=JSON.stringify(model.edits()),composition=structuredClone(model.get(docId).value) as Composition,node=rebind(composition,pick,source);
 assert.throws(()=>model.edit(docId,'Bind a name the provider does not offer',()=>composition),(e:Error)=>e.message.includes('"'+node.id+'"')&&e.message.includes('"'+source+'"'),scene+': the composer refuses '+source);
 assert.equal(JSON.stringify(model.edits()),before,scene+': the refused edit changed nothing');
}

// 5. The editor can list what a provider offers in a scene: the scene provider offers exactly the values the stage declares.
{
 const src=FOLDER_SOURCES.moth,doc=art.validate(src.composition),scope=bindingKeyScope(doc.instances,src.scene as never),names=offeredNames(BINDING_PROVIDERS.scene.keys,scope);
 assert.deepEqual([...names].sort(),Object.keys((src.scene as {stage:{values:object}}).stage.values).sort(),'scene names list the stage values');
 assert.ok(names.includes('fed'));
}
// the inspector's binding choices (art registry bindingChoices) are all offered by their providers
let choices=0;
for(const[id,src]of Object.entries(FOLDER_SOURCES)){
 const doc=art.validate(src.composition) as Composition,scope=bindingKeyScope(doc.instances,src.scene as never);
 for(const type of new Set(flat(doc.instances).map(n=>n.type)))for(const[field,names]of Object.entries(art.get(type).bindingChoices?.(doc)??{}))for(const name of names){
  const dot=name.indexOf('.'),provider=name.slice(0,dot);choices++;
  assert.ok(provider in BINDING_PROVIDERS,`${id}: ${type}.${field} offers ${name}, which no provider owns`);
  assert.equal(bindingKeyProblem(BINDING_PROVIDERS[provider].keys,name.slice(dot+1),scope),null,`${id}: ${type}.${field} offers ${name}, which its provider does not`);
 }
}
assert.ok(choices>0,'binding choices were checked');
console.log('Binding keys PASS: providers declare what they offer; '+scenes+' folder scenes return only declared keys; typos refused at build and on save.');
process.exit(0);
