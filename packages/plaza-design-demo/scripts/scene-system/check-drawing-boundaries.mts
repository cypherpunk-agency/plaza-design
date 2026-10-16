import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import ts from 'typescript';
import {prepareCharacter} from '../../src/ssg/game/runtime/characters';
import {prepareDockworker} from '../../src/ssg/game/runtime/dockworker';
import {marketComposition} from '../../src/ssg/game/scenes/market/composition.ts';
import {marketFrameEnvironment} from '../../src/ssg/game/scenes/market';
import type {EngineDraw} from '../../src/ssg/game/engine/host';
import {TICKER} from '../../src/ssg/game/art/signage/screens';
import {screenLine,sceneClimate} from '../../src/ssg/game/world/weather';
import type {View} from '../../src/ssg/game/art/core/view';
const root=path.resolve('../..');
function load(file:string,globals:Record<string,unknown>){let source=fs.readFileSync(file,'utf8');const sf=ts.createSourceFile(file,source,99,true);for(const n of sf.statements.filter(ts.isImportDeclaration).reverse())source=source.slice(0,n.getStart(sf))+source.slice(n.end);const exports:Record<string,any>={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:99,module:ts.ModuleKind.CommonJS}}).outputText,{exports,...globals});return exports;}
let actual:unknown[]=[],expected:unknown[]=[];
const old=load(path.join(root,'.scene-system/checkpoints/S5-all-scenes-native-pixels-map-integration/source/ssg/game/art/characters/dockworker.ts'),{drawCharacter:(_x:unknown,v:View,p:Parameters<typeof prepareCharacter>[0])=>{const q=prepareCharacter(p,v.t);if(q.visible)expected.push(['character',q.character,q.ready,q.pixelSize,q.frame,q.height]);},box:(...args:unknown[])=>expected.push(['box',...args.slice(1)])}).drawDockworker;
const current=load(path.join(root,'packages/plaza-design-demo/src/ssg/game/art/characters/dockworker.ts'),{drawCharacterFrame:(_x:unknown,_v:View,...args:unknown[])=>actual.push(['character',...args]),box:(...args:unknown[])=>actual.push(['box',...args.slice(1)])}).drawDockworker;
const normalize=(value:unknown)=>JSON.stringify(value,(key,value)=>key==='key'&&typeof value==='string'&&/^L\d+$/.test(value)?'appearance-cache-identity':value);
let cases=0,cacheKey:string|undefined;
for(const t of [0,1,137,500,1500])for(const wx of [-40,0,217,800])for(const face of [-1,1])for(const moving of [false,true])for(const carry of [null,'parcel','case'] as const){const v:View={sx:x=>x-19,y:h=>300-h,gy:300,t,cam:19,viewW:640,viewH:360,flags:{}};actual=[];expected=[];old({},v,wx,face,moving,carry);const pose=prepareDockworker(wx,face,moving,t),before=JSON.stringify(pose);current({},v,pose,face,carry);if(pose.visible){cacheKey??=pose.ready.key;assert.equal(pose.ready.key,cacheKey,'worker appearance identity changed');}assert.equal(normalize(actual),normalize(expected));assert.equal(JSON.stringify(pose),before,'painting mutated prepared worker');cases++;}
const v:View={sx:x=>x,y:h=>300-h,gy:300,t:137,cam:0,viewW:640,viewH:360,flags:{}};
const env=marketFrameEnvironment(v,{} as EngineDraw,marketComposition);assert.equal(env.bindings!['market.weather'],TICKER.map(l=>l==='WEATHER'?screenLine(sceneClimate('market')):l).join('   ·   '));assert.equal(marketComposition.instances.find(i=>i.type==='market.ticker')!.bindings!.text,'market.weather');
console.log(`Drawing boundary checks: ${cases} original/current dockworker presentation+paint comparisons; immutable prepared worker; Market explicit forecast source binding.`);
