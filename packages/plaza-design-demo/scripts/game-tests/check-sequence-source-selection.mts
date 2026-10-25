import {measureArtwork} from '../../src/ssg/game/art/core/measure';
import {prepareFrame} from '../../src/ssg/game/runtime/prepare-frame';
import {sunsetSun} from '../../src/ssg/game/art/environment/sunset-sky';
import {lightAt} from '../../src/ssg/game/world/light';
import {frameTimelineContext} from '../../src/ssg/game/art/core/sequence-context';
import {evaluateTimeline} from '../../src/ssg/game/art/core/timeline';
import {outlineDocuments} from '../../src/ssg/game/authoring/outline-documents';
import {moveKey} from '../../src/ssg/game/authoring/timeline-view';
/** Sequence inspection selects actual source objects; edits use ordinary history and protected Save. */
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {art,type Composition} from '../../src/ssg/game/art';
import {ComposerModel} from '../../src/ssg/game/authoring/composer-model';
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
function canvas(){let tracker!:CanvasRenderingContext2D;measureArtwork(ctx=>{tracker=ctx;});const transforms=new Set(['getTransform','save','restore','translate','scale','rotate','transform','setTransform','resetTransform']);const calls:unknown[]=[],values:Record<string,unknown>={globalAlpha:1,measureText:(s:string)=>({width:s.length*6})};const context=new Proxy(values,{get(o,key:string){if(transforms.has(key))return(...args:unknown[])=>{if(key!=='getTransform')calls.push([key,...args]);return (tracker as any)[key](...args);};if(key in o)return o[key];if(key==='getImageData'||key==='createImageData')return()=>({data:new Uint8ClampedArray(4)});if(key.startsWith('create'))return()=>({addColorStop(){}});return(...args:unknown[])=>calls.push([key,...args]);},set(o,key:string,value){o[key]=value;calls.push(['set',key,value]);return true;}});return{width:1280,height:720,getContext:()=>context,calls};}
Object.assign(globalThis,{document:{createElement:canvas}});
function inspect(m=model,time=0,pending?:ReadonlyMap<string,unknown>,transient?:{document:string;composition:Composition}){const target=canvas(),documents=pending??new Map(m.list().map(d=>[d.id,d.value]));const composition=m.get('sequence-opening').value as Composition;const result=preview.render(target as unknown as HTMLCanvasElement,{composition,documents,transient,sourceVersion:pending&&!transient?undefined:m.sourceVersion,time,reduced:false,overlays:false,environment:{}});return{...result,calls:target.calls};}
const outline=outlineDocuments(model.get('sequence-opening'),model.list()),membership=outline.map(doc=>doc.id);
assert(membership.includes('authored.glide-beach')&&membership.includes('backdrop-glide-coast'),'assembled outline contains referenced scene and backdrop sources before selection');
for(const time of [0,18,55,68]){const frame=inspect(model,time);for(const source of Object.values(frame.sources??{}))assert(membership.includes(source.document),'every selectable painted source has an outline owner: '+source.document);}
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
const cached=inspect(model,0,model.previewDocuments(owner.document,transient),{document:owner.document,composition:transient});assert.equal(cached.calls.length,during.calls.length);for(let i=0;i<cached.calls.length;i++)assert.equal(JSON.stringify(cached.calls[i]),JSON.stringify(during.calls[i]),'cached drag paint differs at operation '+i);
assert(cached.regions?.some(r=>r.active&&r.scene==='glide-beach'),'sequence reports active scene and boundary metadata');
model.edit(owner.document,'Move selected sequence scenery',value=>{const c=structuredClone(value) as Composition,n=c.instances.find(n=>n.id===owner.instance)!;n.placement.x+=delta.x;n.placement.h+=delta.h;return c;});
const moved=inspect(),box=moved.bounds.find(b=>b.id===chosen.id)!;assert(box);assert(Math.abs(box.x-chosen.x-30)<1.01);assert(Math.abs(box.y-chosen.y+12)<1.01);
assert.notDeepEqual(moved.calls,before.calls,'source movement changes the actual sequence picture');
model.undo();assert.deepEqual(model.get(owner.document).value,original);model.redo();
assert.deepEqual(outlineDocuments(model.get('sequence-opening'),model.list()).map(d=>d.id),membership,'selection/edit history cannot change sequence outline membership');
const oldDuration=(model.get('sequence-opening').value as Composition).sequence!.duration;
model.edit('sequence-opening','Extend sequence',value=>{const c=structuredClone(value) as Composition;c.sequence!.duration+=1;return c;});
model.undo();assert.equal((model.get('sequence-opening').value as Composition).sequence!.duration,oldDuration);model.redo();
const oldKeyTime=(model.get('sequence-opening').value as Composition).sequence!.tracks.find(t=>t.id==='camera-east')!.keys[1].time;
model.edit('sequence-opening','Retime camera key',value=>{const c=value as Composition;moveKey({...c.sequence!,composition:c.scene},'camera-east',1,oldKeyTime+1);return c;});
const imported=make();imported.importDocuments(readDocumentBundle(createDocumentBundle(model.edits(),model.list()),imported.list()));assert.deepEqual(inspect(imported).bounds,moved.bounds);
const disk=fs.mkdtempSync(path.resolve('../../.game-test-output/sequence-source-'));
for(const d of sourceDocuments){const target=path.join(disk,d.file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,d.file),target);}
const store=new AuthoringStore({root:disk,documents:sourceDocuments,validateAll:validateSourceDocuments});store.save(model.edits().map(d=>({...d,revision:store.read(d.id).revision})));
const fresh=make();fresh.load(new AuthoringStore({root:disk,documents:sourceDocuments,validateAll:validateSourceDocuments}).list());assert.deepEqual(inspect(fresh).bounds,moved.bounds,'fresh source reload retains selection and native picture geometry');
const values=new Map(fresh.list().map(d=>[d.id,d.value])),context=createSequenceValidationContext(art,Object.fromEntries(fresh.list().filter(d=>d.kind==='composition').map(d=>[d.id,d.value as Composition])),pendingDestinations(values));
const native=createRuntimeSequenceDocuments(values,context).opening.composition.sequence!;
assert.equal(native.id,'glide','native Play consumes the unified source');assert.equal(native.duration,oldDuration+1,'source timing edit survives bundle, protected Save and native reload alongside scenery');assert.equal(native.tracks.find(t=>t.id==='camera-east')!.keys[1].time,oldKeyTime+1,'visual-grid retiming survives protected Save/fresh native reload');
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

// The editor workspace remains fixed while the actual sequence camera changes framing.
function workspaceAt(time:number){const surface=canvas();surface.width=960;surface.height=540;return preview.render(surface as unknown as HTMLCanvasElement,{composition:model.get('sequence-opening').value as Composition,documents:new Map(model.list().map(d=>[d.id,d.value])),sourceVersion:model.sourceVersion,time,reduced:false,overlays:false,workspace:{x:0,h:0,zoom:1},environment:{}});}
const workspaceStart=workspaceAt(0),workspaceEnd=workspaceAt(68),staticKey=Object.keys(workspaceStart.sources!).find(key=>workspaceStart.sources![key].document===owner.document&&workspaceStart.sources![key].instance===owner.instance)!;
assert.deepEqual(workspaceStart.bounds.find(b=>b.id===staticKey),workspaceEnd.bounds.find(b=>b.id===staticKey),'camera animation cannot move static scenery in the editor workspace');
assert.notDeepEqual(workspaceStart.camera,workspaceEnd.camera,'authored camera frame changes independently');assert.equal(workspaceStart.workspaceScale,workspaceEnd.workspaceScale,'playFit cannot change editor scale');assert(workspaceEnd.camera!.width<workspaceStart.camera!.width,'player zoom changes the camera frame size');
console.log('Independent workspace PASS: stable world-object bounds/scale at 0 and 68 seconds while the actual camera moves and zooms.');

// Real frame preparation keeps camera-relative sky layout independent of workspace navigation.
const opening=createRuntimeSequenceDocuments(values,context).opening,skyLight=lightAt(1,1075,270,null,true);
const liveContext=frameTimelineContext(context,{time:0,reduced:false,sequenceId:'glide',environment:{},viewport:{width:960,height:540},timeline:opening.timeline});
const skyFrame=evaluateTimeline(opening.timeline,'glide',0,liveContext,{reduced:false});
function skyAt(zoom:number,x=0,h=0){
 const surface=canvas(),prepared=prepareFrame({kind:'sequence',context:surface.getContext() as unknown as CanvasRenderingContext2D,documents:opening,sequenceId:'glide',frame:skyFrame,composition:skyFrame.composition,time:0,width:960,height:540,scale:1,reduced:false,lighting:skyLight,workspace:{anchorX:skyFrame.camera.x,anchorH:skyFrame.camera.h,x,h,zoom}});
 const view=prepared.view,sun=sunsetSun(view,skyLight,view.y(prepared.scene.horizon??0));
 return{sun,parallax:view.sx(1200,.2)+view.cam,x:sun.x+view.cam,h:view.y(0)-sun.y,layout:view.cameraFrame!.view,scale:prepared.workspaceScale!};
}
const skyWide=skyAt(.5),skyNear=skyAt(2,700,80);
assert.equal(skyWide.sun.r,skyNear.sun.r,'editor zoom must not recompute sun radius from workspace viewport size');
assert(Math.abs(skyWide.x-skyNear.x)<1e-8&&Math.abs(skyWide.h-skyNear.h)<1e-8,'workspace pan cannot rearrange the camera-relative sky');
assert.equal(skyNear.scale/skyWide.scale,4,'sun and world artwork magnify by the same editor zoom ratio');
assert.equal(skyWide.parallax,skyNear.parallax,'editor panning must translate distant artwork without applying game-camera parallax');
assert.equal(skyWide.layout.viewH,skyNear.layout.viewH);assert.equal(skyWide.layout.viewW,skyNear.layout.viewW);
console.log('Camera-relative sky PASS: stable authored sun size/position, layout and world zoom ratio across independent workspace pan/zoom.');
