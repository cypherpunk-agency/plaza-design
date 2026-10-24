/** Verified context-free families use the ordinary editor and native source compilation. */
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';
import authored from '../../src/ssg/game/scenes/authored.json';
import {art,resolveComposition,type Composition,type Value} from '../../src/ssg/game/art';
import {frameView} from '../../src/ssg/game/art/core/view';
import {ComposerModel} from '../../src/ssg/game/authoring/composer-model';
import {sceneCatalogueProjection} from '../../src/ssg/game/authoring/scene-catalogue-projection';
import {createSceneRegistry,type SceneCatalogue} from '../../src/ssg/game/engine/gameplay/scene-catalogue';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import {SceneModel} from '../../src/ssg/game/engine/model';
const sourceId='authored-scenes',id='authored.vehicle-lab';
const source={version:1,scenes:[structuredClone(authored.scenes.find(s=>s.scene.id==='vehicle-lab')!)]} as unknown as SceneCatalogue;
const descriptor={id:sourceId,file:'scenes/authored.json',kind:'scene' as const,validate:(value:unknown)=>{createSceneRegistry({},value);return value;}};
const dir=path.resolve('../../.game-test-output/independent-art-authoring');fs.mkdirSync(dir,{recursive:true});const root=fs.mkdtempSync(path.join(dir,'run-')),file=path.join(root,descriptor.file);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(source));
const store=new AuthoringStore({root,documents:[descriptor]}),initial=store.list();
const make=()=>{const m=new ComposerModel(art,{},d=>{if(d.id===sourceId)descriptor.validate(d.value);},[sceneCatalogueProjection]);m.load(initial);return m;};
const model=make(),types=art.catalog().filter(e=>(['warehouse','library','market','moth','capsule','landmark','laundromat','downtown','shop','beach','harbor','metro','yard','mall','sandbox','station','dockwork','terminal','shift','train'].includes(e.type.split('.')[0])||['furniture.shelf','furniture.strip-light','shop.upstairs-room','props.drink'].includes(e.type))&&e.libraryUse==='reusable'),added:string[]=[];
const propertyEdits=new Map<string,[string,Value]>();
for(const e of types){
 const instance=model.add(id,e.type,{x:140,h:10});added.push(instance);
 model.updateInstance(id,instance,'Move artwork',n=>{n.placement={x:240,h:30};});
 model.undo();assert.equal((model.get(id).value as Composition).instances.find(n=>n.id===instance)!.placement.x,140,e.type+' movement undo');model.redo();
 const duplicate=model.duplicate(id,instance);added.push(duplicate);
 assert.equal((model.get(id).value as Composition).instances.find(n=>n.id===duplicate)!.placement.x,252,e.type+' duplicate has an independent position');
 const properties=art.properties(e.type,{});let change:[string,Value]|undefined;
 for(const [key,field] of Object.entries(e.fields)){
  const candidates:Value[]=field.kind==='string'?['TEST']:field.kind==='color'?['#bada55']:field.kind==='boolean'?[!properties[key]]:field.kind==='select'?(field.options??[]):field.kind==='number'?[Number(properties[key])+(field.step??1),Number(properties[key])-(field.step??1)]:[];
  for(const next of candidates){if(next===properties[key])continue;try{art.properties(e.type,{...properties,[key]:next});change=[key,next];break;}catch{/* A constrained field may require a different supported value. */}}
  if(change)break;
 }
 if(!change&&e.type==='train.registryScreen')change=['pages',[['EDITED PAGE']]];
 if(change){const [key,value]=change;model.updateInstance(id,instance,'Edit artwork property',n=>{n.props[key]=value;});propertyEdits.set(instance,change);}
}
const receiver=make();receiver.importDocuments(readDocumentBundle(JSON.stringify(createDocumentBundle(model.edits(),model.list())),receiver.list()));
store.save(receiver.edits());assert.deepEqual(store.read(sourceId).value,model.get(sourceId).value);
const scene=createSceneRegistry({},store.read(sourceId).value)['vehicle-lab'];
const m=new SceneModel({say(){},open(){},changed(){}},scene.data!,undefined,undefined,undefined,undefined,undefined,scene.gameplay);
const view={...frameView(137),viewW:640,viewH:360,gy:300,y:(h:number)=>300-h};
const env=scene.visualEnvironment!(view,{m,hover:null,layer:'all'}),composition=(model.get(id).value as Composition),rows=resolveComposition(art,composition,env);
for(const instance of added){const row=rows.find(r=>r.instance.id===instance)!;assert(row,instance+' compiles in another native scene');assert.equal(Object.keys(row.instance.bindings??{}).length,0,'no hidden source-scene binding');assert(Number.isFinite(row.element.bounds(row.props,row.state,{view,placement:row.placement}).w));}
for(const [instance,[key,value]] of propertyEdits)assert.deepEqual(rows.find(r=>r.instance.id===instance)!.props[key],value,'edited typed property reaches native compilation after bundle and protected Save');
const ops:unknown[]=[],target:Record<string,unknown>={globalAlpha:1,getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),measureText:(text:string)=>({width:String(text).length*5})};
const ctx=new Proxy(target,{get(o,k:string){if(k in o)return o[k];if(k.startsWith('create'))return()=>({addColorStop(){}});return(...args:unknown[])=>ops.push([k,...args]);},set(o,k:string,v){o[k]=v;return true;}}) as CanvasRenderingContext2D;
const originalDocument=globalThis.document;Object.assign(globalThis,{document:{createElement:(tag:string)=>{assert.equal(tag,'canvas');return{width:0,height:0,getContext:()=>ctx};}}});
const saved=JSON.stringify(store.read(sourceId).value);try{scene.drawBackdrop!(ctx,view,{m,hover:null,layer:'all'});}finally{Object.assign(globalThis,{document:originalDocument});}assert(ops.length>100,'the actual native scene draws the added pieces');assert(ops.some((op:any)=>op[0]==='fillText'&&op[1]==='EDITED PAGE'),'edited Registry pages reach actual native painting after bundle and Save');assert.equal(JSON.stringify(store.read(sourceId).value),saved,'native drawing cannot write source');
console.log(`Independent artwork authoring PASS: ${types.length} types added, moved, duplicated and edited in another scene; history, bundle, protected Save, native reload and actual scene painting.`);
