import {referenceView} from './reference-view';
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import ts from 'typescript';
import { beach,beachScene } from '../../src/ssg/game/scenes/beach/index';
import { beachComposition,beachGeometry,beachLayout,beachLights,beachCasters,beachDeviceData,drawBeachComposition,validateBeachComposition } from '../../src/ssg/game/scenes/beach/composition.ts';
import { BEACH_ACTORS,GULL } from '../../src/ssg/game/scenes/beach/scene';
import * as primitives from '../../src/ssg/game/art/core/primitives';import * as sky from '../../src/ssg/game/art/environment/sky';import * as bar from '../../src/ssg/game/art/assemblies/beach-bar';import * as screens from '../../src/ssg/game/art/signage/screens';import * as chars from '../../src/ssg/game/runtime/characters';
import { placed } from '../../src/ssg/game/art/core/view';import { drawLounger } from '../../src/ssg/game/art/props/beach-party';import { light } from '../../src/ssg/game/world/light';import { BEACH } from '../../src/ssg/game/data/index';
import type { View } from '../../src/ssg/game/art/core/view';import type { SceneModel } from '../../src/ssg/game/engine/model';
const root=path.resolve('../..'),backup=path.join(root,'.scene-system/beach-s5-original');
function bodies(file:string){const sf=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),99,true),out=new Map<string,string>();function visit(n:ts.Node){if(ts.isFunctionDeclaration(n)&&n.name&&n.body)out.set(n.name.text,n.body.getText(sf).replaceAll('\r',''));ts.forEachChild(n,visit);}visit(sf);return out;}
const immutable=bodies(path.join(root,'.scene-system/baseline/source/ssg/game/beach/scene.ts')),saved=bodies(path.join(backup,'art/assemblies/beach.ts'));
for(const[name,body]of immutable)if(saved.has(name))assert.equal(saved.get(name),body,'comparison body must match immutable baseline '+name);
function load(file:string,globals:Record<string,unknown>){let text=fs.readFileSync(file,'utf8');const sf=ts.createSourceFile(file,text,99,true);for(const n of sf.statements.filter(n=>ts.isImportDeclaration(n)||(ts.isExportDeclaration(n)&&!!n.moduleSpecifier)).reverse())text=text.slice(0,n.getStart(sf))+text.slice(n.end);const compat=ts.createSourceFile(file,text,99,true),edits:{start:number;end:number;text:string}[]=[];function attach(n:ts.Node){if(ts.isVariableDeclaration(n)&&n.type?.getText(compat)==='View'&&n.initializer&&ts.isObjectLiteralExpression(n.initializer))edits.push({start:n.initializer.getStart(compat),end:n.initializer.end,text:'referenceView('+n.initializer.getText(compat)+')'});ts.forEachChild(n,attach);}attach(compat);for(const e of edits.sort((a,b)=>b.start-a.start))text=text.slice(0,e.start)+e.text+text.slice(e.end);const exports:Record<string,any>={};vm.runInNewContext(ts.transpileModule(text,{compilerOptions:{target:99,module:ts.ModuleKind.CommonJS}}).outputText,{exports,referenceView,...globals});return exports;}
const oldArtwork=load(path.join(backup,'art/assemblies/beach.ts'),{...primitives,...sky,...bar,...screens,...chars,placed,drawLounger,light}).createBeachArtwork;
let oldInputs:any;const oldScene=load(path.join(backup,'scenes/beach/scene.ts'),{createBeachArtwork:(input:unknown)=>{oldInputs=input;return oldArtwork(input);}});
const L=beachLayout();
const a=(id:string)=>BEACH_ACTORS[id];
const original=oldArtwork({...oldInputs,GULL,ASHORE:[0,1,2,3,4,5,6].map(i=>a('ashore-'+i)),SUNBEDS:[a('sunbed-person-0'),a('sunbed-person-1')],sunbather:a('sunbather'),lifeguard:a('guard'),BEACHGOERS:[0,1,2,3,4,5,6].map(i=>a('beachgoer-'+i)),volley:a('volley'),kid:a('kid'),surfer:a('surfer'),fisher:a('fisher'),PEOPLE:[a('cat')]});
function json(v:unknown){return JSON.stringify(v);}
assert.equal(json(L),json(oldScene.L));assert.equal(json(beachLayout()),json(oldScene.L));assert.equal(json(beachDeviceData(BEACH)),json(BEACH));
const before=load(path.join(backup,'scenes/beach/index.ts'),{...oldScene,BEACH,BEACH_RULES:{}}).beach;
for(const k of ['id','name','width','spawn','exits','intro','keepFace','ambient','facing','lights','casters','pixel'])assert.deepEqual(JSON.parse(json((beach as any)[k])),JSON.parse(json(before[k])),k+' metadata');
assert.deepEqual(JSON.parse(json(beachLights())),JSON.parse(json(before.lights)));assert.equal(json(beachCasters()),json(before.casters));
function recording(){const ops:unknown[]=[],values:Record<string,unknown>={globalAlpha:1};let gradient=0;return{ops,ctx:new Proxy(values,{get(target,key:string){if(key in target)return target[key];if(key==='measureText')return(s:string)=>{ops.push([key,s]);return{width:s.length*4.25};};if(key.startsWith('create')&&key.endsWith('Gradient'))return(...args:unknown[])=>{const id=++gradient;ops.push([key,...args]);return{id,addColorStop:(...args:unknown[])=>ops.push(['color',id,...args])};};return(...args:unknown[])=>ops.push([key,...args]);},set(target,key:string,value){ops.push(['set',key,value]);target[key]=value;return true;}}) as unknown as CanvasRenderingContext2D};}
Object.defineProperty(globalThis,'document',{value:{createElement:()=>({width:0,height:0,getContext:()=>recording().ctx})},configurable:true});
let cases=0;
for(const cam of [0,300,750,1100,1500])for(const gy of [170,280])for(const t of [0,137,710])for(const danger of [false,true]){
 const v:View=referenceView({sx:(wx,p=1)=>Math.round(wx-cam*p),y:h=>gy-h,t,cam,gy,viewW:640,viewH:gy+80,flags:{}});
 const data:Record<string,unknown>={flag:danger?'danger':'clear',rented:danger,billing:danger?'pause':'run',billed:17,freeDrink:danger,lamps:danger?'off':'on'};const m={data:BEACH,get:(k:string)=>data[k]} as unknown as SceneModel;
 const old=recording(),now=recording();original.drawBeach(old.ctx,m,v,'mixer');drawBeachComposition(now.ctx,v,m,'mixer',BEACH_ACTORS,GULL);
 if(json(old.ops)!==json(now.ops)){let first=0;while(json(old.ops[first])===json(now.ops[first]))first++;throw new Error(`cam${cam} gy${gy} t${t} danger${danger}: op${first}/${old.ops.length}/${now.ops.length}: ${json(old.ops[first])} != ${json(now.ops[first])}`);}cases++;
}
const doc=validateBeachComposition(structuredClone(beachComposition)),barNode=doc.instances.find(n=>n.id==='bar')!;barNode.placement.x+=35;barNode.placement.h+=10;// Shared physical bindings require unit scale and normal facing.
const scaled=structuredClone(doc);scaled.instances.find(n=>n.id==='bar')!.placement.scale=1.5;assert.throws(()=>beachScene(scaled),/unit scale/);

const rows=beachGeometry(doc),r=(id:string)=>rows.find(r=>r.instance.id===id)!,scene=beachScene(doc);
assert.equal(scene.data!.devices.find(d=>d.id==='mixer')!.layout!.spot!.x,r('device-mixer').placement.x);assert.equal(scene.data!.devices.find(d=>d.id==='mixer')!.layout!.spot!.y,r('device-mixer').placement.h);assert.equal(scene.uses!.find(u=>u.id==='order')!.x,r('order').placement.x);assert.equal(scene.uses!.find(u=>u.id==='order')!.h,r('order').placement.h);
assert.deepEqual(scene.exits.map(({x,...rest})=>rest),beach.exits.map(({x,...rest})=>rest));assert.equal(scene.people!.find(p=>p.id==='lime')!.x,r('lime-talk').placement.x);
const invalid=structuredClone(doc);invalid.instances.find(n=>n.id==='mixer')!.bindings!.hover='wrong';assert.throws(()=>validateBeachComposition(invalid),/unknown Beach binding/);
fs.writeFileSync(path.join(root,'.scene-system/evidence/S5-beach-composition-contracts.json'),JSON.stringify({instances:beachGeometry().length,commandCases:cases,comparisonBodiesMatchImmutableBaseline:true,sourceLayoutDeviceDataLightsCastersIdentical:true,barInterleavingPreserved:true,attachedMarkerGeometry:true,note:'Exact canvas command comparison supplements integrated pixels; no gameplay playthrough.'},null,2));
console.log(`Beach: ${cases} exact command cases, ${beachGeometry().length} independent instances; source metadata and attached physical markers pass.`);
