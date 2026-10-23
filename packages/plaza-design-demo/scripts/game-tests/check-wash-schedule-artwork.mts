/** The timer is independent; its native optional cable retains exact geometry and paint order. */
import assert from 'node:assert/strict';
import {art,resolveComposition} from '../../src/ssg/game/art';
import {frameView} from '../../src/ssg/game/art/core/view';
import {RUST} from '../../src/ssg/game/art/core/primitives';
import {drawWashSchedule} from '../../src/ssg/game/art/electronics/wash-schedule';
import {declaredScene} from '../../src/ssg/game/engine/gameplay/declared-scene';
import {SceneModel} from '../../src/ssg/game/engine/model';
import composition from '../../src/ssg/game/scenes/laundromat/composition.json';
import sceneSource from '../../src/ssg/game/scenes/laundromat/scene.json';
import gameplay from '../../src/ssg/game/scenes/laundromat/gameplay.json';
import devices from '../../src/ssg/game/scenes/laundromat/devices.json';
function record(){const ops:any[][]=[],values:Record<string,unknown>={};return{ops,ctx:new Proxy(values,{get(o,k:string){if(k in o)return o[k];return(...a:unknown[])=>ops.push([k,...a]);},set(o,k:string,v){o[k]=v;ops.push([k,v]);return true;}}) as CanvasRenderingContext2D};}
const e=art.get('laundromat.schedule');assert.equal(e.libraryUse,'reusable');
assert.deepEqual(Object.keys(e.visualFields!).sort(),['cableConnected','cableTo','hover','nextMs','nextRunning']);
for(const cam of [0,75,1000])for(const h of [0,25])for(const next of [null,1000,23000])for(const hover of [false,true]){
 const view={...frameView(137),viewW:640,viewH:360,gy:300,cam,sx:(x:number,p=1)=>Math.round(x-cam*p),y:(q:number)=>300-q},at={x:178,h,scale:1,facing:1 as const,parallax:1},V=h?{...view,gy:300-h,y:(q:number)=>view.y(q+h)}:view;
 const state=art.visualProperties(e.type,{hover:hover?'clock':'',nextRunning:next!==null,nextMs:next??0,cableConnected:true,cableTo:267}),before=JSON.stringify(state),a=record(),b=record();
 drawWashSchedule(a.ctx,V,at.x,next===null?null:{ms:next},hover,267);e.draw(b.ctx,view,{},state,'backdrop',at);assert.deepEqual(a.ops,b.ops,'registered/native scalar inputs use the same local kernel');assert.equal(JSON.stringify(state),before);
 const cable=b.ops.findIndex(op=>op[0]==='fillStyle'&&op[1]==='rgba('+RUST+',.6)');
 if(cam===1000){assert.equal(cable,-1,'original body culling also culls its connected wire');continue;}
 const s=view.sx(at.x-17);assert.deepEqual(b.ops.slice(cable,cable+4),[['fillStyle','rgba('+RUST+',.6)'],['fillRect',s+33,V.y(60),1,2],['fillRect',s+33,V.y(58),1,46],['fillRect',s+33,V.y(12),view.sx(267)-(s+33),1]],'exact original cable coordinates/colors');
 const highlight=b.ops.findIndex(op=>op[0]==='strokeStyle'&&op[1]==='rgba(255,61,242,.85)');assert.equal(highlight>cable,hover,'hover must be painted after the cable, never underneath it');
 const disconnected=record();e.draw(disconnected.ctx,view,{}, {...state,cableConnected:false},'backdrop',at);assert(!disconnected.ops.some(op=>op[0]==='fillStyle'&&op[1]==='rgba('+RUST+',.6)'),'unbound object paints no fabricated cable');
 const bounds=e.bounds({},state,{view,placement:at});assert(bounds.x<=-23&&bounds.x+bounds.w>=267-at.x,'selection includes the explicit endpoint');
}
for(const washerX of [290,330]){
 const source=structuredClone(composition);source.instances.find(n=>n.id==='washer1')!.placement.x=washerX;
 const scene=declaredScene(sceneSource as never,source,gameplay as never,{},devices as never),rules=typeof scene.rules==='function'?scene.rules({} as never):scene.rules,m=new SceneModel({say(){},open(){},changed(){}},scene.data!,rules,undefined,undefined,undefined,undefined,scene.gameplay),view={...frameView(137),gy:300,y:(h:number)=>300-h,viewW:640,viewH:360};
 const env=scene.visualEnvironment!(view,{m,hover:'clock',layer:'all'}),clock=resolveComposition(art,source as never,env).find(r=>r.instance.id==='clock')!;
 assert.equal(clock.state.cableConnected,true);assert.equal(clock.state.cableTo,washerX-23,'pending native washer movement drives the actual endpoint');assert.equal(clock.state.hover,'clock');
}
console.log('Wash schedule artwork PASS: independent body, explicit native endpoint, disconnect preview, exact cable/hover order, culling, bounds and pending source geometry.');
