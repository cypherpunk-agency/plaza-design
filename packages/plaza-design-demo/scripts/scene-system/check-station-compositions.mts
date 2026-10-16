import {referenceView} from './reference-view';
import * as riders from '../../src/ssg/game/art/characters/riders';
import { drawPlatformTrain } from '../../src/ssg/game/art/vehicles/platform-train';
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import ts from 'typescript';
import { galleriaStation,galleriaStationScene } from '../../src/ssg/game/scenes/galleriaStation/index';
import { harborStation,harborStationScene } from '../../src/ssg/game/scenes/harborStation/index';
import { galleriaStationAdapter as G } from '../../src/ssg/game/scenes/galleriaStation/composition.ts';
import { harborStationAdapter as H } from '../../src/ssg/game/scenes/harborStation/composition.ts';
import * as platform from '../../src/ssg/game/art/assemblies/station-platform';
import * as primitives from '../../src/ssg/game/art/core/primitives';
import { drawDepartures } from '../../src/ssg/game/art/signage/line-departures';
import * as line from '../../src/ssg/game/world/transport/line';
import { light } from '../../src/ssg/game/world/light';
import { seaCols,sunPath } from '../../src/ssg/game/art/environment/sky';
import { harborOpen } from '../../src/ssg/game/world/city';
import type { View } from '../../src/ssg/game/art/core/view';
const root=path.resolve('../..'),backup=path.join(root,'.scene-system/station-s5-original');
function load(file:string,globals:Record<string,unknown>){let text=fs.readFileSync(file,'utf8');const sf=ts.createSourceFile(file,text,99,true);for(const n of sf.statements.filter(ts.isImportDeclaration).reverse())text=text.slice(0,n.getStart(sf))+text.slice(n.end);const exports:Record<string,any>={};vm.runInNewContext(ts.transpileModule(text,{compilerOptions:{target:99,module:ts.ModuleKind.CommonJS}}).outputText,{exports,...globals});return exports;}
const legacyPlatform=load(path.join(backup,'art/assemblies/station-platform.ts'),{...primitives,...line,...riders,drawPlatformTrain});
const common={...platform,...legacyPlatform,...primitives,...line,drawDepartures,light,seaCols,sunPath,harborOpen};
const oldG=load(path.join(backup,'art/assemblies/galleria-station.ts'),common).createStationArtwork;
const oldH=load(path.join(backup,'art/assemblies/harbor-station.ts'),common).createStationArtwork;
const beforeG=load(path.join(backup,'scenes/galleriaStation/index.ts'),{createStationArtwork:oldG}).galleriaStation;
const beforeH=load(path.join(backup,'scenes/harborStation/index.ts'),{createStationArtwork:oldH}).harborStation;
function json(v:unknown){return JSON.stringify(v);}
for(const[before,after]of[[beforeG,galleriaStation],[beforeH,harborStation]])for(const key of ['id','name','facing','width','spawn','rests','exits','readables','ambient','horizon','intro'])assert.equal(json(before[key]),json((after as unknown as Record<string,unknown>)[key]),after.id+' '+key+' changed');
function recording(){const ops:unknown[]=[],values:Record<string,unknown>={globalAlpha:1};let gradient=0;return{ops,ctx:new Proxy(values,{get(target,key:string){if(key in target)return target[key];if(key==='measureText')return(s:string)=>{ops.push([key,s]);return{width:s.length*4.25};};if(key.startsWith('create')&&key.endsWith('Gradient'))return(...args:unknown[])=>{const id=++gradient;ops.push([key,...args]);return{id,addColorStop:(...args:unknown[])=>ops.push(['color',id,...args])};};return(...args:unknown[])=>ops.push([key,...args]);},set(target,key:string,value){ops.push(['set',key,value]);target[key]=value;return true;}}) as unknown as CanvasRenderingContext2D};}
let cases=0;
for(const[oldScene,adapter]of[[beforeG,G],[beforeH,H]] as const)for(const open of [false,true])for(const cam of [0,400,850])for(const gy of [170,280,440])for(const t of [0,137,700,1500]){
 line.lineOpen.harbor=open;
 const v:View=referenceView({sx:(wx,p=1)=>Math.round(wx-cam*p),y:h=>gy-h,t,cam,gy,viewW:640,viewH:gy+80,flags:{'harbor:open':open}});
 const a=recording(),b=recording();oldScene.drawBackdrop(a.ctx,v);adapter.draw(b.ctx,v);
 if(json(a.ops)!==json(b.ops)){let first=0;while(json(a.ops[first])===json(b.ops[first]))first++;throw new Error(`${oldScene.id} open=${open} cam=${cam} gy=${gy} t=${t}: op ${first}/${a.ops.length}/${b.ops.length}: ${json(a.ops[first])} != ${json(b.ops[first])}`);}cases++;
}
for(const[adapter,factory,base]of[[G,galleriaStationScene,galleriaStation],[H,harborStationScene,harborStation]] as const){
 const doc=adapter.validate(JSON.parse(json(adapter.composition)));assert.deepEqual(doc,adapter.composition);
 const changed=structuredClone(doc);changed.instances.find(n=>n.id==='street-exit')!.placement.x+=17;changed.instances.find(n=>n.id==='bench0')!.placement.x+=20;
 const scene=factory(changed);assert.equal(scene.exits[0].x,base.exits[0].x+17);assert.equal(scene.rests![0].x,base.rests![0].x+20);
 assert.deepEqual(scene.exits.map(({x,...rest})=>rest),base.exits.map(({x,...rest})=>rest),'world destinations/rules changed');
 const movedStop=structuredClone(doc);movedStop.instances.find(n=>n.id==='platform-train')!.placement.x+=23;adapter.validate(movedStop);const movedScene=factory(movedStop);assert.equal(movedScene.platformStop,base.platformStop!+23);assert.equal(movedScene.exits.find(e=>e.id==='train')!.x,base.exits.find(e=>e.id==='train')!.x+23);const invalid=structuredClone(doc);invalid.instances.find(n=>n.id==='platform-train')!.placement.h=1;assert.throws(()=>adapter.validate(invalid),/horizontal stop edits only/);
 const roof=changed.instances.find(n=>n.id==='roof')!;roof.placement.h+=10;const g=adapter.geometry(changed),baseline=adapter.geometry(doc);assert.equal(g.find(r=>r.instance.id==='lamp-0')!.placement.h,baseline.find(r=>r.instance.id==='lamp-0')!.placement.h+10);
}
fs.writeFileSync(path.join(root,'.scene-system/evidence/S5-station-composition-contracts.json'),JSON.stringify({commandCases:cases,galleriaInstances:G.geometry().length,harborInstances:H.geometry().length,sourceSceneMetadataEquivalent:true,exitRestMarkerRoundTrips:true,roofAttachments:true,transportStopHorizontalEdits:true,unsupportedTransportTransformsRejected:true,note:'Exact command checks supplement integrated pixel verification; no gameplay playthrough.'},null,2));
console.log(`Station compositions: ${cases} exact command cases; ${G.geometry().length}+${H.geometry().length} instances, metadata and marker contracts pass.`);
