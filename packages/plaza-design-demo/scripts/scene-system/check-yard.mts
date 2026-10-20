import bindingSource from '../../src/ssg/game/scenes/yard/scene.json';
import type {SceneDocument} from '../../src/ssg/game/engine/gameplay/scene-document';
import {projectDeviceBindings} from '../../src/ssg/game/engine/gameplay/device-bindings';
import {manifestGeometry} from '../../src/ssg/game/engine/gameplay/manifest-geometry';
import assert from 'node:assert/strict';
import {yardComposition,yardArt,yardGeometry,validateYardComposition,createYardPresentationState,prepareYardFrame,yardVisualSnapshot,yardEnvironment,drawYardComposition} from '../../src/ssg/game/scenes/yard/composition';
import {yardScene} from '../../src/ssg/game/scenes/yard';
import type {EngineDraw} from '../../src/ssg/game/engine/host';
import type {SceneData} from '../../src/ssg/game/data/types';
import devices from '../../src/ssg/game/scenes/yard/devices.json';
const yardDeviceData=(data:SceneData,composition=yardComposition,source=bindingSource as unknown as SceneDocument)=>{const rows=yardGeometry(composition);return projectDeviceBindings(source,rows,data,manifestGeometry(source,rows,[],{groundSpawn:false}).width);};
const normalize=(data:SceneData)=>({...data,devices:data.devices.map(d=>({...d,...(d.layout?.spot?{layout:{...d.layout,spot:{y:0,...d.layout.spot}}}:{})}))});
const doc=validateYardComposition(structuredClone(yardComposition));assert.deepEqual(doc,yardComposition);assert.deepEqual(yardDeviceData(devices as SceneData),normalize(devices as SceneData));
const edit=structuredClone(doc);edit.instances.find(i=>i.id==='crane')!.placement.x+=20;edit.instances.find(i=>i.id==='tray')!.placement.x+=8;
assert.equal(yardDeviceData(devices as SceneData,edit).devices.find(d=>d.id==='crane')!.layout!.spot!.x,370);assert.equal(yardScene(edit).targets!({get:()=> 'tray',label:()=> 'take',cond:()=>true} as never)[0].x,676);
const values:Record<string,unknown>={armAt:'C-7',parcelAt:'hook',pan:1,gateAllowed:true};
const model={get:(key:string)=>values[key],value:()=>false,now:()=>1000,scratch:{slideStart:0},data:{...devices,tuning:{...devices.tuning,slideMs:2500}}};const engine={m:model,hover:null,layer:'all'} as unknown as EngineDraw;
const state=createYardPresentationState();assert.equal(state.hookX,350);const first=prepareYardFrame(state,engine);assert.equal(first.hookX,354.8);assert.deepEqual(first.parcel,[354.8,51]);const frozen=structuredClone(state);yardVisualSnapshot(state,engine);assert.deepEqual(state,frozen);assert.equal(prepareYardFrame(state,{...engine,layer:'world'}).hookX,354.8);assert.equal(prepareYardFrame(state,{...engine,layer:'devices'}).hookX,359.216);
const replay=()=>{const state=createYardPresentationState();for(let i=0;i<20;i++)prepareYardFrame(state,engine);return state;};assert.deepEqual(replay(),replay());assert.equal(createYardPresentationState().hookX,350);
const bad=structuredClone(doc);bad.instances.find(i=>i.id==='camera')!.bindings!.pan='absent';assert.throws(()=>validateYardComposition(bad),/unknown Yard/);assert.throws(()=>yardArt.visualProperties('yard.parcel',{parcel:[1,'oops']}),/coordinate pair/);
const view={sx:(x:number)=>Math.round(x),y:(h:number)=>300-h,gy:300,t:137,cam:0,viewW:640,viewH:360,flags:{}};const snapshot=yardVisualSnapshot(state,engine);assert.equal(yardEnvironment(view,snapshot).bindings!['yard.hookX'],359.216);
export function commands(draw:(x:CanvasRenderingContext2D)=>void){const rows:unknown[][]=[];let gradient=0;const context=new Proxy({}, {set:(_target,key,value)=>{rows.push(['set',key,value&&typeof value==='object'?{id:value.id}:value]);return true;},get:(_target,key)=>(...args:unknown[])=>{rows.push([key,...args]);if(String(key).startsWith('create')){const id=gradient++;return {id,addColorStop:(...a:unknown[])=>rows.push(['addColorStop',id,...a])};}}}) as CanvasRenderingContext2D;draw(context);return rows;}
assert.deepEqual(commands(x=>drawYardComposition(x,view,snapshot)),commands(x=>drawYardComposition(x,view,snapshot)));assert.deepEqual(state,{hookX:359.216,hookVisible:true},'painting must not advance controller');
const native=yardScene();native.preparePresentation!(view,engine);
const captured=native.presentationState!.capture(),restored=yardScene();restored.presentationState!.restore(captured);assert.deepEqual(restored.presentationState!.capture(),captured,'presentation JSON restores an isolated controller');
assert.throws(()=>restored.presentationState!.restore({hookX:NaN,hookVisible:true}),/Invalid Yard/);assert.throws(()=>restored.presentationState!.restore({hookX:350,hookVisible:true,extra:1}),/Invalid Yard/);
const prepared=native.visualEnvironment!(view,engine).bindings!['yard.hookX'];assert.equal(prepared,354.8);
commands(x=>native.drawBackdrop(x,view,engine));commands(x=>native.drawBackdrop(x,view,{...engine,layer:'world'}));
assert.equal(native.visualEnvironment!(view,engine).bindings!['yard.hookX'],prepared,'native paint/bounds cannot advance presentation history');
native.preparePresentation!(view,{...engine,layer:'devices'});assert.equal(native.visualEnvironment!(view,engine).bindings!['yard.hookX'],359.216,'explicit frame preparation preserves the original recurrence');
console.log('Yard checks passed:source roundtrip;exact3 device spots;crane/tray geometry;explicit prepare schedule;pure repeated painting/bindings;isolated replay controllers;invalid state rejected.');


// The old fixture's unsupported pickup label produced NaN and permanently hid the moving hook.
const poisoned=createYardPresentationState();values.armAt='pickup';const invisible=prepareYardFrame(poisoned,engine);assert.equal(invisible.hookVisible,false);assert.equal(Number.isFinite(invisible.hookX),true);assert.equal(invisible.parcel,null);assert.doesNotThrow(()=>drawYardComposition(new Proxy({},{set:()=>true,get:()=>()=>({addColorStop:()=>{}})}) as CanvasRenderingContext2D,view,invisible));values.armAt='C-7';assert.equal(prepareYardFrame(poisoned,engine).hookVisible,false,'preserve legacy poisoned history after later valid states');assert.equal(createYardPresentationState().hookVisible,true,'separate scene controllers remain isolated');
// Game and isolated native preview start from the same captured controller history.
for(const armAt of ['home','pickup','C-7'])for(const layer of ['all','devices']as const){
 values.armAt=armAt;const game=yardScene(),preview=yardScene();
 game.preparePresentation!(view,{...engine,layer});
 const captured=game.presentationState!.capture();preview.presentationState!.restore(structuredClone(captured));
 game.preparePresentation!(view,{...engine,layer});preview.preparePresentation!(view,{...engine,layer});
 for(const pass of ['all','world','devices']as const)assert.deepEqual(game.visualEnvironment!(view,{...engine,layer:pass}),preview.visualEnvironment!(view,{...engine,layer:pass}),`native frame snapshots ${armAt}/${layer}/${pass}`);
 assert.deepEqual(game.presentationState!.capture(),preview.presentationState!.capture());
}
