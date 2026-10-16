import assert from 'node:assert/strict';
import {art,drawComposition,type Composition} from '../../src/ssg/game/art';
import {box,onScreen} from '../../src/ssg/game/art/core/primitives';
import {frameView,type View} from '../../src/ssg/game/art/core/view';
import {emptyMallVisual} from '../../src/ssg/game/art/assemblies/mall-state';
import {mallComposition,mallGeometry,validateMallComposition} from '../../src/ssg/game/scenes/mall/composition';
import {harborComposition,validateHarborComposition} from '../../src/ssg/game/scenes/harbor/composition';
function recorder(){const ops:unknown[][]=[],state:Record<string,unknown>={globalAlpha:1};const ctx=new Proxy(state,{get(t,k:string){if(k in t)return t[k];return(...args:unknown[])=>ops.push([k,...args]);},set(t,k:string,v){t[k]=v;ops.push(['set',k,v]);return true;}}) as unknown as CanvasRenderingContext2D;return{ctx,ops};}
// Exact pre-extraction table body, including both seats and their original canvas state order.
function legacyTable(x:CanvasRenderingContext2D,v:View,wx:number){const s=v.sx(wx),{y}=v;if(!onScreen(v,s-40,80))return;
 for(const d of [-24,24]){x.fillStyle='#2a1a10';x.fillRect(s+d-1,y(9),2,9);box(x,s+d-7,y(11),14,3,'#8a2a1a','rgba(255,170,90,.5)');}
 x.fillStyle='#2a1d14';x.fillRect(s-1,y(20),3,20);box(x,s-18,y(22),36,3,'#3a2a1e','rgba(255,190,120,.6)');x.fillStyle='#e8e0d0';x.fillRect(s-8,y(25),6,3);x.fillStyle='#d84a2a';x.fillRect(s+4,y(26),4,4);
}
const tableIds=['table-0','table-1','table-2'],stools=mallComposition.instances.filter(n=>n.type==='mall.table-stool');assert.equal(stools.length,6);
const env=(view:View)=>({view,state:{},bindings:{'mall.snapshot':emptyMallVisual as never},reduced:false});
let exact=0;
for(const id of tableIds){
 const table=mallComposition.instances.find(n=>n.id===id)!,children=stools.filter(n=>n.attach?.instance===id);assert.equal(children.length,2);assert.ok(children.every(n=>n.order<table.order&&n.order>table.order-1));
 const doc:Composition={version:1,scene:'mall',instances:[...children,table]};
 for(const offset of [0,.25,.75]){const cam=table.placement.x-250+offset,view:View={...frameView(137),sx:(x,p=1)=>Math.round(x-cam*p),y:h=>300-h,gy:300,cam,viewW:640,viewH:360},old=recorder(),current=recorder();legacyTable(old.ctx,view,table.placement.x);drawComposition(current.ctx,art,doc,env(view),'backdrop');assert.deepEqual(current.ops,old.ops,'exact paint/state order for '+id+' fractional camera '+offset);exact++;}
}
const moved=structuredClone(mallComposition),left=moved.instances.find(n=>n.id==='table-0-stool-left')!,right=moved.instances.find(n=>n.id==='table-0-stool-right')!,table=moved.instances.find(n=>n.id==='table-0')!;left.placement.x-=12;left.props.seatPaint='#123456';table.placement.x+=30;validateMallComposition(moved);
const geometry=mallGeometry(moved),at=(id:string)=>geometry.find(r=>r.instance.id===id)!.placement;
assert.equal(at(left.id).x,1974+30-24-12);assert.equal(at(right.id).x,1974+30+24);assert.equal(right.props.seatPaint,undefined,'independent stool appearance');
const drawn=recorder(),onlyStools:Composition={version:1,scene:'mall',instances:[{...left,attach:undefined,placement:{x:100,h:0}},{...right,attach:undefined,placement:{x:150,h:0}}]};drawComposition(drawn.ctx,art,onlyStools,env(frameView(0)),'backdrop');assert.ok(drawn.ops.some(op=>op[0]==='set'&&op[2]==='#123456'));assert.ok(drawn.ops.some(op=>op[0]==='set'&&op[2]==='#8a2a1a'));
assert.deepEqual(validateHarborComposition(structuredClone(harborComposition)),harborComposition,'existing Harbor source survives per-type schemas unchanged');
for(const value of [-1,.5,2,99])assert.throws(()=>art.properties('harbor.craneFrame',{index:value}),/invalid select/);
for(const value of [-1,.5,8,99])assert.throws(()=>art.properties('harbor.container',{paint:value}),/invalid select/);
for(const key of ['width','height','paint','travel','gantry'])assert.throws(()=>art.properties('harbor.denTable',{[key]:1}),/unknown property/);
assert.deepEqual(Object.keys(art.get('harbor.hutBack').fields),['width','height']);assert.deepEqual(Object.keys(art.get('harbor.forkliftBody').fields),['travel']);
for(const type of ['harbor.container','harbor.craneLoad'])assert.equal(art.properties(type,{paint:7}).paint,7);
assert.equal(mallGeometry().filter(r=>r.instance.type==='mall.table-stool').length,6);
for(const key of ['width','height','r','lightHeight'])assert.throws(()=>art.properties('harbor.marker',{[key]:-1}),/invalid number/);
console.log('G4 furniture checks passed: '+exact+' exact legacy paint/state table cases; six independent attached stools, separate appearance and relocation; unchanged Harbor source; supported per-type controls; fractional and out-of-range crane/PAL edits rejected.');
