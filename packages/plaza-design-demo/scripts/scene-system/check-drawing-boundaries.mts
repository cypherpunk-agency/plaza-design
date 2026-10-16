import {referenceView} from './reference-view';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import ts from 'typescript';
import {execFileSync} from 'node:child_process';
import {prepareCharacter} from '../../src/ssg/game/runtime/characters';
import {prepareDockworker} from '../../src/ssg/game/runtime/dockworker';
import {marketComposition,marketArt} from '../../src/ssg/game/scenes/market/composition.ts';
import {marketFrameEnvironment} from '../../src/ssg/game/scenes/market';
import type {EngineDraw} from '../../src/ssg/game/engine/host';
import {TICKER} from '../../src/ssg/game/art/signage/screens';
import {screenLine} from '../../src/ssg/game/world/weather';
import type {View} from '../../src/ssg/game/art/core/view';
import * as primitives from '../../src/ssg/game/art/core/primitives';
import {drawMarketEndWall} from '../../src/ssg/game/art/assemblies/market-details';
const root=path.resolve('../..'),arg=process.argv.indexOf('--reference-root'),referenceRoot=arg>=0?process.argv[arg+1]:root;
function load(file:string,globals:Record<string,unknown>,contents?:string){let source=contents??fs.readFileSync(file,'utf8');const sf=ts.createSourceFile(file,source,99,true);for(const n of sf.statements.filter(n=>ts.isImportDeclaration(n)||(ts.isExportDeclaration(n)&&n.moduleSpecifier)).reverse())source=source.slice(0,n.getStart(sf))+source.slice(n.end);const exports:Record<string,any>={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:99,module:ts.ModuleKind.CommonJS}}).outputText,{exports,...globals});return exports;}
let actual:unknown[]=[],expected:unknown[]=[];
const old=load(path.join(referenceRoot,'.scene-system/checkpoints/S5-all-scenes-native-pixels-map-integration/source/ssg/game/art/characters/dockworker.ts'),{drawCharacter:(_x:unknown,v:View,p:Parameters<typeof prepareCharacter>[0])=>{const q=prepareCharacter(p,v.t);if(q.visible)expected.push(['character',q.character,q.ready,q.pixelSize,q.frame,q.height]);},box:(...args:unknown[])=>expected.push(['box',...args.slice(1)])}).drawDockworker;
const current=load(path.join(root,'packages/plaza-design-demo/src/ssg/game/art/characters/dockworker.ts'),{drawCharacterFrame:(_x:unknown,_v:View,...args:unknown[])=>actual.push(['character',...args]),box:(...args:unknown[])=>actual.push(['box',...args.slice(1)])}).drawDockworker;
const normalize=(value:unknown)=>JSON.stringify(value,(key,value)=>key==='key'&&typeof value==='string'&&/^L\d+$/.test(value)?'appearance-cache-identity':value);
let cases=0,cacheKey:string|undefined;
for(const t of [0,1,137,500,1500])for(const wx of [-40,0,217,800])for(const face of [-1,1])for(const moving of [false,true])for(const carry of [null,'parcel','case'] as const){const v:View=referenceView({sx:x=>x-19,y:h=>300-h,gy:300,t,cam:19,viewW:640,viewH:360,flags:{}});actual=[];expected=[];old({},v,wx,face,moving,carry);const pose=prepareDockworker(wx,face,moving,t),before=JSON.stringify(pose);current({},v,pose,face,carry);if(pose.visible){cacheKey??=pose.ready.key;assert.equal(pose.ready.key,cacheKey,'worker appearance identity changed');}assert.equal(normalize(actual),normalize(expected));assert.equal(JSON.stringify(pose),before,'painting mutated prepared worker');cases++;}
const v:View=referenceView({sx:x=>x,y:h=>300-h,gy:300,t:137,cam:0,viewW:640,viewH:360,flags:{}});
const env=marketFrameEnvironment(v,{} as EngineDraw,marketComposition);assert.equal(env.bindings!['market.weather'],TICKER.map(l=>l==='WEATHER'?screenLine():l).join('   ·   '));assert.equal(marketComposition.instances.find(i=>i.type==='market.ticker')!.bindings!.text,'market.weather');

assert.equal(marketFrameEnvironment({...v,flags:{end:true}},{} as EngineDraw).bindings!['market.exitOpen'],true);
assert.equal(marketFrameEnvironment({...v,flags:{end:false}},{} as EngineDraw).bindings!['market.exitOpen'],false);
assert.equal(marketComposition.instances.find(i=>i.type==='market.end-wall')!.bindings!.open,'market.exitOpen');
assert.throws(()=>marketArt.visualProperties('market.end-wall',{open:'yes'}));
const oldWall=load('094d0ab-market-details.ts',primitives,execFileSync('git',['show','094d0ab:packages/plaza-design-demo/src/ssg/game/art/assemblies/market-details.ts'],{cwd:root,encoding:'utf8'})).drawMarketEndWall;
function recording(){const ops:unknown[]=[],target:Record<string,unknown>={};const ctx=new Proxy(target,{get(t,key:string){if(key==='measureText')return(value:string)=>({width:value.length*4.25});if(key.startsWith('create')&&key.endsWith('Gradient'))return(...args:unknown[])=>{ops.push([key,...args]);return{addColorStop:(...args:unknown[])=>ops.push(['stop',...args])};};return key in t?t[key]:(...args:unknown[])=>ops.push([key,...args]);},set(t,key:string,value){t[key]=value;ops.push(['set',key,value]);return true;}}) as CanvasRenderingContext2D;return{ctx,ops};}
let wallCases=0;
for(const end of [false,true])for(const cam of [0,1400,1900,2300])for(const t of [0,137,710])for(const gy of [170,440]){const view=referenceView({sx:(wx:number,p=1)=>Math.round(wx-cam*p),y:(h:number)=>gy-h,t,cam,gy,viewW:640,viewH:gy+80,flags:{end}}),a=recording(),b=recording();oldWall(a.ctx,view,1940,140,1986);drawMarketEndWall(b.ctx,{...view,flags:{end:!end}},1940,140,1986,end);assert.equal(JSON.stringify(b.ops),JSON.stringify(a.ops),'Market end-wall paint must consume explicit open snapshot');wallCases++;}
console.log(`Drawing boundary checks: ${cases} original/current worker comparisons; immutable prepared worker; ${wallCases} original/current Market end-wall command cases ignoring conflicting save flags; validated forecast/exit bindings.`);
