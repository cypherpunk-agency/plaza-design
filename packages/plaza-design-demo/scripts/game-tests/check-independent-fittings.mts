/** Current independent fitting contracts: one kernel, native dimensions, real editor history and protected source reload. */
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {build} from 'esbuild';
import {art,resolveComposition,type Composition} from '../../src/ssg/game/art';
import {frameView} from '../../src/ssg/game/art/core/view';
import {sourceProjection} from '../../src/ssg/game/art/core/geometry';
import {placementCoordinates,placeFrom} from '../../src/ssg/game/world/zone-graph';
import {createMallArtwork} from '../../src/ssg/game/art/assemblies/mall-details';
import {emptyMallVisual} from '../../src/ssg/game/art/assemblies/mall-state';
import {SCENES} from '../../src/ssg/game/scenes';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {createSequenceValidationContext} from '../../src/ssg/game/art/core/sequence-context';
import {ComposerModel} from '../../src/ssg/game/authoring/composer-model';
import {sceneCatalogueProjection} from '../../src/ssg/game/authoring/scene-catalogue-projection';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';
import {pendingRegistry} from '../../src/ssg/game/authoring/pending-registry';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import {NATIVE_TARGET_LIMITS,nativeTargetOperations} from '../../src/ssg/game/engine/gameplay/native-targets';
function record(){const ops:unknown[]=[],state:Record<string,unknown>={};return{ops,ctx:new Proxy(state,{get(o,k:string){if(k in o)return o[k];if(k==='measureText')return(text:string)=>({width:text.length*5});if(k.startsWith('create'))return(...a:unknown[])=>{ops.push([k,...a]);return{addColorStop:(...a:unknown[])=>ops.push(['stop',...a])};};return(...a:unknown[])=>ops.push([k,...a]);},set(o,k:string,v){o[k]=v;ops.push([k,v&&typeof v==='object'?'gradient':v]);return true;}})as CanvasRenderingContext2D};}
const ids=['mall.shop-front','mall.shop-interior','mall.shop-stock','mall.metro-door','mall.food-sign','mall.pillar','mall.escalator-back','mall.escalator-front','harbor.fishStall','harbor.teaStall','moth.monitor','moth.rig-shelf','capsule.plug'];
for(const type of ids)for(const x of [80,500,1000])for(const h of [0,25]){
 const e=art.get(type),p=art.properties(type,{}),s=art.visualProperties(type,{}),a=record(),b=record(),view={...frameView(137),viewW:640,viewH:360,gy:300,y:(h:number)=>300-h},at={x,h,scale:1,facing:1 as const,parallax:1};
 assert.equal(e.libraryUse,'reusable');e.draw(a.ctx,view,p,s,'backdrop',at);assert(a.ops.length||x>640,type+' has independently visible artwork');
 const box=e.bounds(p,s,{view,placement:at});assert(Object.values(box).every(Number.isFinite));assert(box.w>0&&box.tall>0);
 if(type.startsWith('mall.')){assert(!e.visualFields?.snapshot);const L={...emptyMallVisual.layout,ceil:Number(p.ceiling??112),fascia:Number(p.fascia??130),slab:Number(p.rise??144)},kernel=createMallArtwork({x,width:Number(p.width),shop:String(p.shop??'implants'),sign:'',tint:'',col:'',label:'',visual:{...emptyMallVisual,layout:L}}),V={...view,gy:300-h,y:(q:number)=>300-q-h};const method=type.slice(5).replaceAll('-','_') as keyof typeof kernel;kernel[method](b.ctx,V);assert.deepEqual(a.ops,b.ops,type+' shares native geometry');}
}
// Source dimensions follow native role edits, without restoring a whole-room dependency.
const mall=SCENES.mall,m=new SceneModel({say(){},open(){},changed(){}},mall.data!,typeof mall.rules==='function'?mall.rules({}as never):mall.rules,undefined,undefined,undefined,undefined,mall.gameplay);
const view={...frameView(137),viewW:640,viewH:360,gy:300,y:(h:number)=>300-h},env=mall.visualEnvironment!(view,{m,hover:null,layer:'all'});
assert.equal(env.bindings!['scene.shopCeiling'],112);assert.equal(env.bindings!['scene.escalatorRise'],144);
// Shared spatial arithmetic preserves depth and independent authoring-camera navigation.
const graph={version:1 as const,seams:[{id:'east',kind:'walk' as const,a:{zone:'west'},b:{zone:'east'},dx:900,dh:40}]},placed=placeFrom(graph,'west',Infinity);
assert.deepEqual(placementCoordinates(placed,{dx:900,dh:40}),{west:{x:-900,h:-40},east:{x:0,h:0}});
for(const cam of [0,123.25,900])for(const authored of [cam,400])for(const depth of [.3,1,1.35]){const p=sourceProjection({cam,gy:300},{dx:900,dh:40},1,authored,true);assert.equal(p.sx(71,depth),Math.round(71-(authored-900)*depth+authored-cam));assert.equal(p.y(25),235);}
assert.deepEqual(nativeTargetOperations({anchors:[],reset:false},true,false),['say','do']);assert.equal(NATIVE_TARGET_LIMITS.steps,64);
// Authoring uses the real registered types and prospective graph, with one physical catalogue owner.
const root=path.resolve('src/ssg/game'),documents=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'test',value:JSON.parse(fs.readFileSync(path.join(root,d.file),'utf8'))}));
const make=()=>{const model=new ComposerModel(art,createSequenceValidationContext(art,{},Object.fromEntries(Object.entries(SCENES).map(([id,s])=>[id,s.exits.map(e=>e.id)]))),(d,docs)=>{if(d.id==='authored-scenes')validateSourceDocuments(new Map(docs.filter(d=>!d.id.startsWith('authored.')).map(d=>[d.id,d.value])));},[sceneCatalogueProjection]);model.load(documents);return model;};
const model=make(),doc='authored.boundary-west';
for(const [i,type]of ids.entries()){const id=model.add(doc,type,{x:100+i*65,h:0});model.updateInstance(doc,id,'Move independent fitting',n=>{n.placement.x+=15;n.placement.h=12;const e=art.get(type);if(e.fields.width)n.props.width=200;if(type==='moth.monitor')n.props.standHeight=12;if(type==='capsule.plug')n.props.cableConnected=false;});const duplicate=model.duplicate(doc,id);assert.notEqual(duplicate,id);model.undo();model.redo();if(art.get(type).fields.width){const before=model.edits();assert.throws(()=>model.updateInstance(doc,id,'Reject invalid width',n=>{n.props.width=-1;}));assert.deepEqual(model.edits(),before);}}
const sceneId='authored.boundary-west-scene',logic=structuredClone(model.get(sceneId).value) as any,layout=structuredClone(model.get(doc).value) as Composition;
(logic.stage??={}).values={...logic.stage?.values,reviewPlugOn:true};layout.instances.find(n=>n.type==='capsule.plug')!.bindings={plugOn:'scene.reviewPlugOn'};
model.importDocuments([{id:sceneId,value:logic},{id:doc,value:layout}],'Bind independent visual input');model.undo();model.redo();
const edits=model.edits(),receiver=make();receiver.importDocuments(readDocumentBundle(createDocumentBundle(edits,model.list()),receiver.list()));assert.deepEqual(receiver.get(doc).value,model.get(doc).value);
const pending=pendingRegistry(new Map(receiver.list().map(d=>[d.id,d.value])));assert(pending['boundary-west']);const target=pending['boundary-west'],modelState=new SceneModel({say(){},open(){},changed(){}},target.data!,typeof target.rules==='function'?target.rules({}as never):target.rules,undefined,undefined,undefined,undefined,target.gameplay),native=target.visualEnvironment!(view,{m:modelState,hover:null,layer:'all'});assert.equal(resolveComposition(art,layout,native).find(r=>r.instance.type==='capsule.plug')!.state.plugOn,true,'the native frame resolves the edited visual binding');
const composition=model.get(doc).value as Composition,rows=resolveComposition(art,composition,native);for(const type of ids)assert.equal(rows.filter(r=>r.instance.type===type).length,2);
const disk=fs.mkdtempSync(path.resolve('../../.game-test-output/independent-fittings-'));for(const d of sourceDocuments){const file=path.join(disk,d.file);fs.mkdirSync(path.dirname(file),{recursive:true});fs.copyFileSync(path.join(root,d.file),file);}
const store=new AuthoringStore({root:disk,documents:sourceDocuments,validateAll:validateSourceDocuments}),transaction=store.save(edits.map(e=>({...e,revision:store.read(e.id).revision})));
assert.deepEqual((store.read('authored-scenes').value as any).scenes.find((s:any)=>s.scene.id==='boundary-west').composition,composition);
const fresh=path.join(disk,'fresh.mjs');await build({stdin:{contents:`import assert from 'node:assert/strict';import {art} from ${JSON.stringify(path.join(root,'art/index.ts'))};import {SCENES} from ${JSON.stringify(path.join(root,'scenes/index.ts'))};const types=${JSON.stringify(ids)};const scene=SCENES['boundary-west'];assert(scene.visualEnvironment);for(const t of types){assert.equal(art.get(t).libraryUse,'reusable');assert.equal(scene.artwork.instances.filter(r=>r.type===t).length,2);}const plug=scene.artwork.instances.find(r=>r.type==='capsule.plug');assert.equal(plug.bindings.plugOn,'scene.reviewPlugOn');assert.equal(plug.placement.h,12);assert(scene.width>0);`,resolveDir:root,loader:'ts'},outfile:fresh,bundle:true,format:'esm',platform:'node',target:'es2022',logLevel:'warning',plugins:[{name:'saved-current-sources',setup(b){b.onLoad({filter:/\.json$/},args=>{const rel=path.relative(root,args.path),file=path.join(disk,rel);if(!rel.startsWith('..')&&fs.existsSync(file))return{contents:fs.readFileSync(file,'utf8'),loader:'json'};});}}]});await import(pathToFileURL(fresh).href);
store.undo(transaction.transaction,Object.fromEntries(transaction.documents.map(d=>[d.id,d.revision])));assert.equal(fs.readFileSync(path.join(disk,'scenes/authored.json'),'utf8'),fs.readFileSync(path.join(root,'scenes/authored.json'),'utf8'));
console.log('Independent fittings PASS: 13 registered types, standalone/native kernels, scalar dimensions, shared projection, add/move/properties/duplicate/history/bundle/protected Save/fresh native reload.');
