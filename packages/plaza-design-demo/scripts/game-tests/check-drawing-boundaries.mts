import {referenceView} from './reference-view';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import ts from 'typescript';
import {execFileSync} from 'node:child_process';
import {prepareCharacter} from '../../src/ssg/game/runtime/characters';
import {prepareDockworker} from '../../src/ssg/game/runtime/dockworker';
import {art as marketArt} from '../../src/ssg/game/art';
import {FOLDER_SOURCES} from '../../src/ssg/game/scenes/folder-scenes';
import {folderSceneDefinition} from '../../src/ssg/game/engine/gameplay/folder-scene';
const marketComposition=marketArt.validate(FOLDER_SOURCES.market.composition),marketFrameEnvironment=(view:any,engine:any)=>folderSceneDefinition('market',FOLDER_SOURCES.market).visualEnvironment!(view,engine);
import type {EngineDraw} from '../../src/ssg/game/engine/host';
import {TICKER} from '../../src/ssg/game/art/signage/screens';
import {screenLine} from '../../src/ssg/game/world/weather';
import type {View} from '../../src/ssg/game/art/core/view';
import * as primitives from '../../src/ssg/game/art/core/primitives';
import {drawMarketEndWall} from '../../src/ssg/game/art/assemblies/market-details';
const root=path.resolve('../..'),arg=process.argv.indexOf('--reference-root'),referenceRoot=arg>=0?process.argv[arg+1]:root;
function load(file:string,globals:Record<string,unknown>,contents?:string){let source=contents??fs.readFileSync(file,'utf8');const sf=ts.createSourceFile(file,source,99,true);for(const n of sf.statements.filter(n=>ts.isImportDeclaration(n)||(ts.isExportDeclaration(n)&&n.moduleSpecifier)).reverse())source=source.slice(0,n.getStart(sf))+source.slice(n.end);const exports:Record<string,any>={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:99,module:ts.ModuleKind.CommonJS}}).outputText,{exports,...globals});return exports;}
let actual:unknown[]=[],expected:unknown[]=[];
const current=load(path.join(root,'packages/plaza-design-demo/src/ssg/game/art/characters/dockworker.ts'),{drawCharacterFrame:(_x:unknown,_v:View,...args:unknown[])=>actual.push(['character',...args]),box:(...args:unknown[])=>actual.push(['box',...args.slice(1)])}).drawDockworker;
const normalize=(value:unknown)=>JSON.stringify(value,(key,value)=>key==='key'&&typeof value==='string'&&/^L\d+$/.test(value)?'appearance-cache-identity':value);
let cases=0,cacheKey:string|undefined;
for(const t of [0,1,137,500,1500])for(const wx of [-40,0,217,800])for(const face of [-1,1])for(const moving of [false,true])for(const carry of [null,'parcel','case'] as const){const v:View=referenceView({sx:x=>x-19,y:h=>300-h,gy:300,t,cam:19,viewW:640,viewH:360,flags:{}});actual=[];expected=[];const pose=prepareDockworker(wx,face,moving,t),before=JSON.stringify(pose);current({},v,pose,face,carry);if(pose.visible){cacheKey??=pose.ready.key;assert.equal(pose.ready.key,cacheKey,'worker appearance identity changed');}const first=normalize(actual);actual=[];current({},v,pose,face,carry);assert.equal(normalize(actual),first,'prepared pose replay is deterministic');assert.equal(JSON.stringify(pose),before,'painting mutated prepared worker');cases++;}
const v:View=referenceView({sx:x=>x,y:h=>300-h,gy:300,t:137,cam:0,viewW:640,viewH:360,flags:{}});
const env=marketFrameEnvironment(v,{m:{value:()=>false}} as unknown as EngineDraw);assert.equal(env.bindings!['scene.ticker'],TICKER.map(l=>l==='WEATHER'?screenLine():l).join('   ·   '));assert.equal(marketComposition.instances.find(i=>i.type==='market.ticker')!.bindings!.text,'scene.ticker');

assert.equal(marketFrameEnvironment({...v,flags:{end:true}},{m:{value:()=>false}} as unknown as EngineDraw).bindings!['scene.exitOpen'],true);
assert.equal(marketFrameEnvironment({...v,flags:{end:false}},{m:{value:()=>false}} as unknown as EngineDraw).bindings!['scene.exitOpen'],false);
assert.equal(marketComposition.instances.find(i=>i.type==='market.end-wall')!.bindings!.open,'scene.exitOpen');
assert.throws(()=>marketArt.visualProperties('market.end-wall',{open:'yes'}));
function recording(){const ops:unknown[]=[],target:Record<string,unknown>={};const ctx=new Proxy(target,{get(t,key:string){if(key==='measureText')return(value:string)=>({width:value.length*4.25});if(key.startsWith('create')&&key.endsWith('Gradient'))return(...args:unknown[])=>{ops.push([key,...args]);return{addColorStop:(...args:unknown[])=>ops.push(['stop',...args])};};return key in t?t[key]:(...args:unknown[])=>ops.push([key,...args]);},set(t,key:string,value){t[key]=value;ops.push(['set',key,value]);return true;}}) as CanvasRenderingContext2D;return{ctx,ops};}
let wallCases=0;
for(const end of [false,true])for(const cam of [0,1400,1900,2300])for(const t of [0,137,710])for(const gy of [170,440]){const view=referenceView({sx:(wx:number,p=1)=>Math.round(wx-cam*p),y:(h:number)=>gy-h,t,cam,gy,viewW:640,viewH:gy+80,flags:{end}}),a=recording(),b=recording();drawMarketEndWall(a.ctx,view,1940,140,1986,end);drawMarketEndWall(b.ctx,{...view,flags:{end:!end}},1940,140,1986,end);assert.equal(JSON.stringify(b.ops),JSON.stringify(a.ops),'Market end-wall paint must consume explicit open snapshot');wallCases++;}
console.log(`Drawing boundary checks: ${cases} prepared worker replays; immutable prepared worker; ${wallCases} current Market end-wall command cases ignoring conflicting save flags; validated forecast/exit bindings.`);
