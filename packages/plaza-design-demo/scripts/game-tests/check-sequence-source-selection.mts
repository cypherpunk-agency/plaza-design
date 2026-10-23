/** Sequence inspection selects actual source objects; edits use ordinary history and protected Save. */
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {art,type Composition} from '../../src/ssg/game/art';
import {ComposerModel} from '../../src/ssg/game/authoring/app';
import {createNativePreview} from '../../src/ssg/game/authoring/native-preview';
import {nativeSceneAdapters} from '../../src/ssg/game/authoring/scene-adapters';
import {createSequenceValidationContext} from '../../src/ssg/game/art/core/sequence-context';
import {sceneCatalogueProjection} from '../../src/ssg/game/authoring/scene-catalogue-projection';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import {createRuntimeSequenceDocuments} from '../../src/ssg/game/story/sequence-documents';
import {pendingDestinations} from '../../src/ssg/game/authoring/pending-destinations';

const root=path.resolve('src/ssg/game');
const documents=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'test',value:JSON.parse(fs.readFileSync(path.join(root,d.file),'utf8'))}));
const make=()=>{const model=new ComposerModel(art,createSequenceValidationContext(art,{}),()=>{},[sceneCatalogueProjection]);model.load(documents);return model;};
const model=make(),preview=createNativePreview(nativeSceneAdapters);
function canvas(){const calls:unknown[]=[],values:Record<string,unknown>={getTransform:()=>({a:1}),measureText:(s:string)=>({width:s.length*6})};const context=new Proxy(values,{get(o,key:string){if(key in o)return o[key];if(key==='getImageData'||key==='createImageData')return()=>({data:new Uint8ClampedArray(4)});if(key.startsWith('create'))return()=>({addColorStop(){}});return(...args:unknown[])=>calls.push([key,...args]);},set(o,key:string,value){o[key]=value;calls.push(['set',key,value]);return true;}});return{width:1280,height:720,getContext:()=>context,calls};}
Object.assign(globalThis,{document:{createElement:canvas}});
function inspect(m=model,time=0,pending?:ReadonlyMap<string,unknown>){const target=canvas(),documents=pending??new Map(m.list().map(d=>[d.id,d.value]));const composition=m.get('sequence-opening').value as Composition;const result=preview.render(target as unknown as HTMLCanvasElement,{composition,documents,time,reduced:false,overlays:false,environment:{}});return{...result,calls:target.calls};}
const before=inspect();assert(before.bounds.length>5,'ordinary world objects have selectable bounds');
const chosen=before.bounds.find(b=>{const source=before.sources![b.id],doc=model.get(source.document).value as Composition;return doc.instances.some(n=>n.id===source.instance&&n.type==='props.lounger');});
assert(chosen,'the opening beach has selectable loungers');
const owner=before.sources![chosen.id],original=structuredClone(model.get(owner.document).value) as Composition;
const delta=before.deltaToLocal!(chosen.id,30,-12);assert(delta.x>0&&delta.h>0,'drag deltas use the rendered source projection');
const transient=structuredClone(original),dragged=transient.instances.find(n=>n.id===owner.instance)!;
dragged.placement.x+=delta.x;dragged.placement.h+=delta.h;
const during=inspect(model,0,model.previewDocuments(owner.document,transient));
assert(Math.abs(during.bounds.find(b=>b.id===chosen.id)!.x-chosen.x-30)<1.01,'projected source movement is visible before pointer release');
assert.equal(model.dirty(),false,'transient drag does not mutate source/history');
model.edit(owner.document,'Move selected sequence scenery',value=>{const c=structuredClone(value) as Composition,n=c.instances.find(n=>n.id===owner.instance)!;n.placement.x+=delta.x;n.placement.h+=delta.h;return c;});
const moved=inspect(),box=moved.bounds.find(b=>b.id===chosen.id)!;assert(box);assert(Math.abs(box.x-chosen.x-30)<1.01);assert(Math.abs(box.y-chosen.y+12)<1.01);
assert.notDeepEqual(moved.calls,before.calls,'source movement changes the actual sequence picture');
model.undo();assert.deepEqual(model.get(owner.document).value,original);model.redo();
const oldDuration=(model.get('sequence-opening').value as Composition).sequence!.duration;
model.edit('sequence-opening','Extend sequence',value=>{const c=structuredClone(value) as Composition;c.sequence!.duration+=1;return c;});
model.undo();assert.equal((model.get('sequence-opening').value as Composition).sequence!.duration,oldDuration);model.redo();
const imported=make();imported.importDocuments(readDocumentBundle(createDocumentBundle(model.edits(),model.list()),imported.list()));assert.deepEqual(inspect(imported).bounds,moved.bounds);
const disk=fs.mkdtempSync(path.resolve('../../.game-test-output/sequence-source-'));
for(const d of sourceDocuments){const target=path.join(disk,d.file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,d.file),target);}
const store=new AuthoringStore({root:disk,documents:sourceDocuments,validateAll:validateSourceDocuments});store.save(model.edits().map(d=>({...d,revision:store.read(d.id).revision})));
const fresh=make();fresh.load(new AuthoringStore({root:disk,documents:sourceDocuments,validateAll:validateSourceDocuments}).list());assert.deepEqual(inspect(fresh).bounds,moved.bounds,'fresh source reload retains selection and native picture geometry');
const values=new Map(fresh.list().map(d=>[d.id,d.value])),context=createSequenceValidationContext(art,Object.fromEntries(fresh.list().filter(d=>d.kind==='composition').map(d=>[d.id,d.value as Composition])),pendingDestinations(values));
const native=createRuntimeSequenceDocuments(values,context).opening.composition.sequence!;
assert.equal(native.id,'glide','native Play consumes the unified source');assert.equal(native.duration,oldDuration+1,'source timing edit survives bundle, protected Save and native reload alongside scenery');
assert(!sourceDocuments.some(d=>String(d.kind)==='timeline'),'no separately stored timeline documents remain');
assert.throws(()=>model.edit('sequence-opening','Invalid duration',value=>{const c=structuredClone(value) as Composition;c.sequence!.duration=-1;return c;}));
console.log('Sequence source selection PASS: actual world bounds, source-owned drag geometry, picture change, undo/redo, bundle, protected Save/fresh reload and native unified documents.');

for(const [id,time,target] of [['act2',8,'ferry'],['taxi',1.5,'cab']] as const){
 const document='sequence-'+id,composition=model.get(document).value as Composition,documents=new Map(model.list().map(d=>[d.id,d.value])),surface=canvas();
 const initial=preview.render(surface as unknown as HTMLCanvasElement,{composition,documents,time,reduced:false,overlays:false,environment:{}});
 const key=Object.keys(initial.sources!).find(key=>initial.sources![key].document===document&&initial.sources![key].instance===target);assert(key,id+' has selectable native artwork');
 const original=initial.bounds.find(b=>b.id===key)!;
 model.updateInstance(document,target,'Move cinematic object',node=>node.placement.x+=24);
 const moved=model.get(document).value as Composition,next=preview.render(canvas() as unknown as HTMLCanvasElement,{composition:moved,documents:new Map(model.list().map(d=>[d.id,d.value])),time,reduced:false,overlays:false,environment:{}});
 assert(Math.abs(next.bounds.find(b=>b.id===key)!.x-original.x-24)<.001,id+' selection follows edited cinematic artwork');
 model.undo();
}
