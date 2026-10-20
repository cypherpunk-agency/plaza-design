import bindingSource from '../../src/ssg/game/scenes/downtown/scene.json';
import type {SceneDocument} from '../../src/ssg/game/engine/gameplay/scene-document';
import type {SceneData as GeometryDeviceData} from '../../src/ssg/game/data/types';
import {projectDeviceBindings} from '../../src/ssg/game/engine/gameplay/device-bindings';
import {manifestGeometry} from '../../src/ssg/game/engine/gameplay/manifest-geometry';
import {referenceView} from './reference-view';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import ts from 'typescript';
import { downtownArt,downtownComposition,downtownGeometry,downtownLights,downtownCasters,renderDowntownCity,renderDowntownStreet,renderDowntownPeople,renderDowntownDevices,validateDowntownComposition,SMEARS } from '../../src/ssg/game/scenes/downtown/composition.ts';
import { downtownScene } from '../../src/ssg/game/scenes/downtown/index';
import { downtownPlacements,downtownDoors } from '../../src/ssg/game/scenes/downtown/placements';
import { FRONTS, STALL, LEVEL_W, PLATFORMS } from '../../src/ssg/game/scenes/downtown/layout';
import * as sprites from '../../src/ssg/game/art/core/sprites';
import * as light from '../../src/ssg/game/world/light';
import { glass } from '../../src/ssg/game/art/environment/sky';
import { addLight,castShadow,createLightingFrame,drawLights } from '../../src/ssg/game/art/atmosphere/lighting';
import { ticker,YELLOW } from '../../src/ssg/game/art/signage/screens';
import { screenLine,sceneClimate } from '../../src/ssg/game/world/weather';
import { drawLibraryFront } from '../../src/ssg/game/art/assemblies/library';
import { drawMetroStairs } from '../../src/ssg/game/art/architecture/metro-stairs';
import { drawTaxiPad } from '../../src/ssg/game/art/assemblies/taxi-pad';
import * as primitives from '../../src/ssg/game/art/core/primitives';
import devices from '../../src/ssg/game/scenes/downtown/devices.json';
import type { SceneData } from '../../src/ssg/game/data/types';
import type { SceneModel } from '../../src/ssg/game/engine/model';
import type { View } from '../../src/ssg/game/art/core/view';
const downtownDeviceData=(data:GeometryDeviceData,composition=downtownComposition)=>{const source=bindingSource as unknown as SceneDocument,rows=downtownGeometry(composition);return projectDeviceBindings(source,rows,data,manifestGeometry(source,rows,[],{groundSpawn:false}).width);};
const normalizeGeometry=(data:GeometryDeviceData)=>({...data,devices:data.devices.map(d=>({...d,...(d.layout?.spot?{layout:{...d.layout,spot:{y:0,...d.layout.spot}}}:{})}))});
const root=path.resolve('../..'),backup=path.join(root,'.scene-system/downtown-s5-original');
function methodBodies(file:string,name:string){const s=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true),c=s.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===name) as ts.ClassDeclaration;return new Map(c.members.filter(ts.isMethodDeclaration).map(n=>[n.name.getText(s),n.body!.getText(s).replaceAll('\r','')]));}
const immutableBodies=methodBodies(path.join(root,'.scene-system/baseline/source/ssg/game/game.ts'),'Game');
const savedBodies=methodBodies(path.join(backup,'art/assemblies/downtown.ts'),'DowntownArtwork');
const originalNames=['drawSkyline','drawAntenna','winsFor','neon','drawFronts','drawAlley','drawDoors','drawFront','drawWindow','drawBay','plate','drawStall','drawStreet','drawStallPeople'];
for(const name of originalNames)assert.equal(savedBodies.get(name),immutableBodies.get(name),'comparison source must match immutable pre-migration Game body '+name);
const currentBodies=methodBodies(path.join(root,'packages/plaza-design-demo/src/ssg/game/art/assemblies/downtown.ts'),'DowntownArtwork');
for(const name of ['neon','drawWindow','drawBay','plate'])assert.equal(currentBodies.get(name)!.replaceAll('windowLit(seed, this.v.lighting)','windowLit(seed)').replaceAll('glass(this.v.lighting)','glass(lightNow())').replaceAll('addLight(this.v, {','addLight({'),immutableBodies.get(name),'unchanged leaf body except explicit frame input '+name);
function load(file:string,globals:Record<string,unknown>) {
 let text=fs.readFileSync(file,'utf8');const sf=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
 for(const n of sf.statements.filter(ts.isImportDeclaration).reverse())text=text.slice(0,n.getStart(sf))+text.slice(n.end);
 const exports:Record<string,any>={};vm.runInNewContext(ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports,...globals});return exports;
}
const oldLayout=load(path.join(backup,'scenes/downtown/layout.ts'),{SPR:sprites.SPR});
assert.deepEqual(JSON.parse(JSON.stringify(FRONTS)),JSON.parse(JSON.stringify(oldLayout.FRONTS)));
assert.deepEqual(PLATFORMS,JSON.parse(JSON.stringify(oldLayout.PLATFORMS)));
assert.deepEqual(STALL,{x:oldLayout.STALL.x,w:oldLayout.STALL.w});assert.equal(downtownGeometry().find(r=>r.instance.id==='fixer')!.placement.x,oldLayout.STALL.fixerX);assert.equal(LEVEL_W,oldLayout.LEVEL_W);
let referenceViewForOld:View;
const before=load(path.join(backup,'art/assemblies/downtown.ts'),{...sprites,FRONTS:oldLayout.FRONTS,NPCS:oldLayout.NPCS,STALL:oldLayout.STALL,LEVEL_W:oldLayout.LEVEL_W,DOORS:downtownDoors,windowLit:light.windowLit,lightNow:light.light,glass,addLight:(source:Parameters<typeof addLight>[1])=>addLight(referenceViewForOld,source),castShadow,ticker,YELLOW,screenLine,sceneClimate});
const oldDevices=load(path.join(backup,'art/electronics/downtown-devices.ts'),primitives).createDowntownDevicesArtwork({MAP_KIOSK_X:1392});
assert.deepEqual(SMEARS,JSON.parse(JSON.stringify(before.SMEARS)));
assert.deepEqual(downtownDeviceData(devices as SceneData),normalizeGeometry(devices as SceneData));
const oldIndexFile=path.join(backup,'scenes/downtown/index.ts'),oldIndex=ts.createSourceFile(oldIndexFile,fs.readFileSync(oldIndexFile,'utf8'),ts.ScriptTarget.Latest,true);
function originalProperty(name:string):unknown{let code='';function visit(n:ts.Node){if(ts.isVariableDeclaration(n)&&n.name.getText(oldIndex)==='downtown')for(const p of (n.initializer as ts.ObjectLiteralExpression).properties)if(ts.isPropertyAssignment(p)&&p.name.getText(oldIndex)===name)code=p.initializer.getText(oldIndex);ts.forEachChild(n,visit);}visit(oldIndex);return vm.runInNewContext('('+code+')');}
assert.deepEqual(downtownLights(),JSON.parse(JSON.stringify(originalProperty('lights'))));
assert.deepEqual(downtownCasters(),JSON.parse(JSON.stringify(originalProperty('casters'))));
assert.deepEqual(validateDowntownComposition(JSON.parse(JSON.stringify(downtownComposition))),downtownComposition);
function recording(){const ops:unknown[]=[],values:Record<string,unknown>={globalAlpha:1};let gradient=0;return{ops,ctx:new Proxy(values,{get(target,key:string){if(key in target)return target[key];if(key==='measureText')return(s:string)=>{ops.push([key,s]);return{width:s.length*4.25};};if(key.startsWith('create')&&key.endsWith('Gradient'))return(...args:unknown[])=>{const id=++gradient;ops.push([key,...args]);return{id,addColorStop:(...args:unknown[])=>ops.push(['color',id,...args])};};return(...args:unknown[])=>ops.push([key,...args]);},set(target,key:string,value){ops.push(['set',key,value]);target[key]=value;return true;}}) as unknown as CanvasRenderingContext2D};}
Object.defineProperty(globalThis,'document',{value:{createElement:()=>({width:0,height:0,getContext:()=>recording().ctx})},configurable:true});
let comparisons=0;
function same(a:unknown[],b:unknown[],label:string){try{assert.equal(JSON.stringify(b),JSON.stringify(a));}catch{let first=0;while(JSON.stringify(a[first])===JSON.stringify(b[first])&&first<Math.max(a.length,b.length))first++;throw new Error(`${label}: first differing operation ${first}/${a.length}/${b.length}: original=${JSON.stringify(a[first])}; current=${JSON.stringify(b[first])}`);}comparisons++;}
for(const cam of [0,300,850,1400,1850])for(const gy of [170,280,440])for(const t of [0,137,237]){
 const v:View=referenceView({sx:(wx,p=1)=>Math.round(wx-cam*p),y:h=>gy-h,t,cam,gy,viewW:640,viewH:gy+80,flags:{}});
 const old=new before.DowntownArtwork(),a=recording(),b=recording();old.set(a.ctx,v);
 v.illumination=createLightingFrame(v.lighting);referenceViewForOld=v;old.drawSkyline(0.18,7,70,150,0.18,0.12);old.drawAntenna();old.drawSkyline(0.45,19,50,120,0.3,0.18);old.drawFronts();drawLights(a.ctx,v,undefined);
 v.illumination=createLightingFrame(v.lighting);referenceViewForOld=v;renderDowntownCity(b.ctx,v);drawLights(b.ctx,v,undefined);same(a.ops,b.ops,`city cam=${cam} gy=${gy} t=${t}`);
 const sa=recording(),sb=recording();old.set(sa.ctx,v);old.drawStreet(0.7,true);renderDowntownStreet(sb.ctx,v,0.7,true);same(sa.ops,sb.ops,'street');
 const pa=recording(),pb=recording();old.set(pa.ctx,v);old.drawStallPeople();downtownScene().drawActors!(pb.ctx,v);same(pa.ops,pb.ops,'people');
}
for(const on of [false,true])for(const cam of [0,600,1200,1800]){
 const v:View=referenceView({sx:(wx,p=1)=>Math.round(wx-cam*p),y:h=>280-h,t:137,cam,gy:280,viewW:640,viewH:360,flags:{}});
 const model={data:devices,now:()=>700,scratch:{signTest:on?50:-1e9,'pulse.sign':on?50:-1e9},value:()=>on,get:(k:string)=>k==='feed'?(on?'cam3':'ads'):k==='lock'?(on?'open':'shut'):k==='dlvAt'?(on?'driving':'home'):on,traceOf:()=>on?60:0,spots:()=>devices.devices.map(d=>({id:d.id,...d.layout.spot,y:'y'in d.layout.spot?d.layout.spot.y:0}))} as unknown as SceneModel;
 const a=recording(),b=recording();drawLibraryFront(a.ctx,v,downtownDoors.library);oldDevices.drawDowntown(a.ctx,model,v,'sign',1062);drawMetroStairs(a.ctx,v,downtownDoors.metro);drawTaxiPad(a.ctx,v,downtownDoors.taxi);renderDowntownDevices(b.ctx,v,model,'sign',1062);same(a.ops,b.ops,'devices '+cam+' '+on);
}
const changed=structuredClone(downtownComposition),wall=changed.instances.find(n=>n.id==='front-7')!;wall.placement.scale=1.5;wall.placement.facing=-1;wall.placement.x+=37;
const placed=downtownPlacements(changed),resolved=downtownGeometry(changed);
for(const row of resolved){const other=placed.get(row.instance.id);assert.deepEqual({x:other.x,h:other.h,scale:other.scale,facing:other.facing,parallax:other.parallax},row.placement,'JSON marker geometry must match renderer transforms '+row.instance.id);}
const modified=structuredClone(downtownComposition);modified.instances.find(n=>n.id==='device-box')!.placement.x+=17;
assert.equal(downtownDeviceData(devices as SceneData,modified).devices.find(d=>d.id==='box')!.layout!.spot!.x,347);
modified.instances.find(n=>n.id==='dumpster')!.props.width=60;modified.instances.find(n=>n.id==='dumpster')!.props.height=30;
const baselineScene=downtownScene(),editedScene=downtownScene(modified);
assert.deepEqual(editedScene.platforms![0],{x:1000,w:60,h:30});assert.deepEqual(editedScene.casters![0],{x:1030,h:30,w:60});
assert.deepEqual(editedScene.exits.map(({x,...rest})=>rest),baselineScene.exits.map(({x,...rest})=>rest),'marker edits must preserve destinations/rules');
const shared=structuredClone(downtownComposition);shared.instances.push({id:'shared-seat',type:'furniture.stool',props:{},placement:{x:500,h:0,scale:2,facing:-1},order:10000,pass:'backdrop'});
const shop=shared.instances.find(n=>n.id==='exit-shop')!;shop.attach={instance:'shared-seat',anchor:'seat'};shop.placement={x:10,h:0};
const coreShop=downtownGeometry(shared).find(r=>r.instance.id==='exit-shop')!.placement;
assert.equal(downtownPlacements(shared).get('exit-shop').x,coreShop.x,'shared-kit anchor uses same source/runtime geometry');
assert.equal(downtownScene(shared).exits.find(e=>e.id==='shop')!.x,coreShop.x);
const invalid=structuredClone(downtownComposition);invalid.instances.find(n=>n.id==='noodle-stall')!.props.mask=['wrong'];assert.throws(()=>validateDowntownComposition(invalid),/mask/);
assert.equal(oldLayout.NPCS.length,3);assert.equal(downtownArt.catalog().filter(e=>e.type.startsWith('downtown.')).length,38);
fs.writeFileSync(path.join(root,'.scene-system/evidence/S5-downtown-composition-contracts.json'),JSON.stringify({instances:downtownGeometry().length,elements:downtownArt.catalog().filter(e=>e.type.startsWith('downtown.')).length,commandComparisons:comparisons,comparisonBodiesMatchImmutableBaseline:originalNames,unchangedLeafBodies:['neon','drawWindow','drawBay','plate'],sourceLayoutEquivalent:true,deviceDataEquivalent:true,lightCasterMetadataEquivalent:true,markerTransformEquivalence:true,sharedKitAnchorEquivalence:true,markerRoundTrip:true,note:'Exact canvas command sequences supplement integrated pixel comparison; these are not pixel-renderer results.'},null,2));
console.log(`Downtown composition: ${comparisons} exact canvas-command cases, ${downtownGeometry().length} independently placed instances, unchanged source layout/device data, transform/marker contracts pass.`);
