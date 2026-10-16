import assert from 'node:assert/strict';
import {art} from '../../src/ssg/game/art';
import {frameView,type View} from '../../src/ssg/game/art/core/view';
import type {Bounds,Placement,Properties} from '../../src/ssg/game/art/core/composition';
const placement:Required<Placement>={x:430,h:24,scale:1,facing:1,parallax:1};
const view:View={...frameView(137),sx:(x,p=1)=>x-173*p,y:h=>400-h*1.25,cam:173,gy:400,viewW:640,viewH:460};
const context={view,placement};
function resolved(type:string,props:Properties={},state:Properties={}){const e=art.get(type),p=art.properties(type,props),s=art.visualProperties(type,state);return{e,p,s,b:e.bounds(p,s,context)};}
function projected(b:Bounds){const ox=view.sx(placement.x),oy=view.y(placement.h);return{x:ox+b.x,y:oy-b.h*1.25,w:b.w,h:b.tall*1.25};}
const stool=resolved('market.stool');assert.deepEqual(projected(stool.b),{x:view.sx(430)-7,y:view.y(24)-10,w:14,h:10});assert.equal(stool.e.anchors(stool.p,stool.s).seat.h,10);
const camera=resolved('market.camera',{facing:-1,parallax:.7});assert.deepEqual(projected(camera.b),{x:view.sx(430,.7)-14,y:view.y(24)-13,w:17,h:16});
const ticker=resolved('market.ticker',{w:150,tall:11,parallax:.7});const screen=projected(ticker.b);assert.equal(screen.x,Math.round(view.sx(430,.7)-75)-2);assert.equal(screen.y,Math.round(view.y(35))-2);assert.equal(screen.w,157);
const score=resolved('market.score');const pole=projected(score.b);assert.equal(pole.y+pole.h,view.y(0),'pole reaches real native ground, independent of authored screen height');
const facade=resolved('market.facade',{width:134});assert.equal(projected(facade.b).y,0);assert.equal(projected(facade.b).h,view.y(24));
const floor=projected(resolved('market.wet-floor').b);assert.deepEqual(floor,{x:0,y:400,w:640,h:60});
const hover=resolved('downtown.device-hover');assert.deepEqual(hover.b,{x:0,h:0,w:0,tall:0},'no hover has finite empty bounds');
const snapshot=structuredClone(hover.s.snapshot) as Record<string,unknown>;snapshot.hoverSpot={x:500,y:20,w:30,h:40};
const active=resolved('downtown.device-hover',{}, {snapshot:snapshot as never});assert.deepEqual(active.b,{x:52,h:63,w:36,tall:46});
const courier=resolved('downtown.device-dlv9',{}, {position:800});assert.equal(courier.b.x,800-430-15,'moving device selection follows its resolved route position');
for(const e of art.catalog().filter(e=>e.type.startsWith('market.'))){
 const p=art.properties(e.type,{}),s=art.visualProperties(e.type,{});
 for(const c of [undefined,context]){const b=e.bounds(p,s,c);assert.ok(Object.values(b).every(Number.isFinite),e.type+' finite bounds');assert.ok(b.w>=0&&b.tall>=0,e.type+' nonnegative bounds');}
}
for(let seed=0;seed<50;seed++){
 const a=resolved('market.clutter',{seed,count:5,kinds:['crate']}),b=resolved('market.clutter',{seed,count:5,kinds:['crate']});assert.deepEqual(a.b,b.b);assert.ok(a.b.w>0&&a.b.h>0);
}
console.log('Static metadata checks passed: seeded Market pieces, native parallax and y projection, screen poles, viewport facade/floor, finite hover state and moving courier bounds.');
