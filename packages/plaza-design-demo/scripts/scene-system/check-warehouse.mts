import {frameView} from '../../src/ssg/game/art/core/view';
import {warehouseLayout} from './warehouse-layout-fixture.mts';
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import ts from 'typescript';
import {warehouse,warehouseScene,WAREHOUSE_ACTORS} from '../../src/ssg/game/scenes/warehouse';
import {warehouseComposition,warehouseGeometry,warehouseLights,drawWarehouseComposition,validateWarehouseComposition} from '../../src/ssg/game/scenes/warehouse/composition';
import * as primitives from '../../src/ssg/game/art/core/primitives';import * as screens from '../../src/ssg/game/art/signage/screens';import * as characters from '../../src/ssg/game/runtime/characters';
import type {View} from '../../src/ssg/game/art/core/view';
const root=path.resolve('../..'),backup=path.join(root,'.scene-system/warehouse-s5-original');
function load(file:string,globals:Record<string,unknown>){let text=fs.readFileSync(file,'utf8');const sf=ts.createSourceFile(file,text,99,true);for(const n of sf.statements.filter(ts.isImportDeclaration).reverse())text=text.slice(0,n.getStart(sf))+text.slice(n.end);const exports:Record<string,any>={};vm.runInNewContext(ts.transpileModule(text,{compilerOptions:{target:99,module:ts.ModuleKind.CommonJS}}).outputText,{exports,...globals});return exports;}
const old=load(path.join(backup,'warehouse.ts'),{...primitives,...screens,...characters}).drawWarehouse;
const original=load(path.join(backup,'index.ts'),{drawWarehouse:old}).warehouse;
const layout=warehouseLayout(),people=Object.values(WAREHOUSE_ACTORS);
// The comparison function is tied to the immutable baseline, not a regenerated candidate.
const initial=ts.createSourceFile('original',fs.readFileSync(path.join(root,'.scene-system/baseline/source/ssg/game/scenes/warehouse.ts'),'utf8'),99,true);
let baselineBody='';const find=(node:ts.Node)=>{if(ts.isFunctionDeclaration(node)&&node.name?.text==='drawWarehouse')baselineBody=node.body!.getText(initial);ts.forEachChild(node,find);};find(initial);
const extracted=ts.createSourceFile('extracted',fs.readFileSync(path.join(backup,'warehouse.ts'),'utf8'),99,true);const body=extracted.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='drawWarehouse') as ts.FunctionDeclaration;
assert.equal(body.body!.getText(extracted).replace(/\s/g,''),baselineBody.replace(/\s/g,''),'original comparison body matches immutable source');
const json=(value:unknown)=>JSON.stringify(value);
for(const key of ['width','spawn','facing','ambient','shade','lights','casters','exits','intro','pixel','readables'])assert.deepEqual(JSON.parse(json((warehouse as any)[key])),JSON.parse(json(original[key])),key+' source metadata');
assert.deepEqual(JSON.parse(json(warehouseLights())),JSON.parse(json(original.lights)));assert.deepEqual(JSON.parse(json(warehouse.casters)),JSON.parse(json(original.casters)));
function recording(){const ops:unknown[]=[],values:Record<string,unknown>={globalAlpha:1};let gradient=0;return{ops,ctx:new Proxy(values,{get(target,key:string){if(key in target)return target[key];if(key==='measureText')return(s:string)=>{ops.push([key,s]);return{width:s.length*4.25};};if(key.startsWith('create')&&key.endsWith('Gradient'))return(...args:unknown[])=>{const id=++gradient;ops.push([key,...args]);return{id,addColorStop:(...args:unknown[])=>ops.push(['color',id,...args])};};return(...args:unknown[])=>ops.push([key,...args]);},set(target,key:string,value){ops.push(['set',key,value]);target[key]=value;return true;}}) as unknown as CanvasRenderingContext2D};}
Object.defineProperty(globalThis,'document',{value:{createElement:()=>({width:0,height:0,getContext:()=>recording().ctx})},configurable:true});
let cases=0;for(const cam of [0,130.5,260,480])for(const gy of [186,306,600])for(const t of [0,137,710]){const view:View={...frameView(t),sx:(wx,p=1)=>Math.round(wx-cam*p),y:h=>gy-h,t,cam,gy,viewW:640,viewH:gy+54,flags:{}};const a=recording(),b=recording();old(a.ctx,view,layout,people);drawWarehouseComposition(b.ctx,view,WAREHOUSE_ACTORS);if(json(a.ops)!==json(b.ops)){let index=0;while(json(a.ops[index])===json(b.ops[index]))index++;throw new Error(`cam${cam} gy${gy} t${t}: operation${index}: ${json(a.ops[index])} != ${json(b.ops[index])}`);}cases++;}
const edited=structuredClone(warehouseComposition);edited.instances.find(n=>n.id==='van')!.placement.x+=35;edited.instances.find(n=>n.id==='door')!.placement.h=10;edited.instances.find(n=>n.id==='dock')!.props.height=25;
const scene=warehouseScene(edited),geometry=warehouseGeometry(edited),get=(id:string)=>geometry.find(r=>r.instance.id===id)!;
assert.equal(scene.uses!.find(u=>u.id==='door')!.x,get('door').placement.x);assert.equal(scene.uses!.find(u=>u.id==='door')!.promptH,84);assert.equal(scene.uses!.find(u=>u.id==='door')!.h,10);assert.equal(warehouse.uses!.find(u=>u.id==='door')!.h,undefined);assert.equal(scene.lights!.find(l=>l.col==='255,60,60')!.h,72);assert.equal(scene.casters![0].x,warehouse.casters![0].x+35);assert.equal(scene.people!.find(p=>p.look==='pigeon')!.h,25);assert.equal(get('roller-1').placement.h,25);
assert.deepEqual(scene.exits.map(({x,...rest})=>rest),warehouse.exits.map(({x,...rest})=>rest));
const invalid=structuredClone(edited);invalid.instances=invalid.instances.filter(n=>n.id!=='door');assert.throws(()=>validateWarehouseComposition(invalid),/door|attachment/);
fs.writeFileSync(path.join(root,'.scene-system/evidence/S5-warehouse-contracts.json'),JSON.stringify({instances:warehouseGeometry().length,commandCases:cases,originalComparisonBodyVerified:true,sourceMetadataIdentical:true,editedGeometryVerified:true},null,2));
console.log(`Warehouse: ${cases} exact native command cases, ${warehouseGeometry().length} independent instances; source metadata and attached markers pass.`);
