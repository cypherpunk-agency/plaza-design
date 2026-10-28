import assert from 'node:assert/strict';
import {art} from '../../src/ssg/game/art';
import {beginLayeredFrame,endLayeredFrame,drawComposition,drawCompositionSlot,type Properties} from '../../src/ssg/game/art/core/composition';
import type {CapturedArtwork} from '../../src/ssg/game/art/core/presentation';
import {frameView} from '../../src/ssg/game/art/core/view';
import {recorder} from './capture-actor-paint.mts';

const at={x:200,h:20,scale:1,facing:1 as const,parallax:1};
const view=(t:number,w=960)=>({...frameView(t),viewW:w,viewH:540,gy:486,cam:100,sx:(x:number,q=1)=>x-100*q,y:(h:number)=>486-h});
const configurations:Record<string,Properties>={'character.flock':{appearance:'white silhouette'},'vehicle.traffic-lane':{minX:0,maxX:2000,altitude:300,spacing:300,densityBefore:1,densityAfter:1}};
const generators=art.catalog().filter(e=>e.selection==='region');
assert.ok(generators.length>=16);
for(const e of generators){
 const props=art.properties(e.type,configurations[e.type]??{}),state=art.visualProperties(e.type,{});
 const first=e.bounds(props,state,{view:view(0),placement:at});
 for(const t of [1,60,600,1200,4000])assert.deepEqual(e.bounds(props,state,{view:view(t),placement:at}),first,e.type+' region must not follow current particles/time');
 if(['environment.cloud-layer','vehicle.traffic-lane','environment.sky-traffic','character.flock','character.flow','street.traffic','vehicle.ring-traffic','everyday.rain'].includes(e.type))assert.deepEqual(e.bounds(props,state,{view:view(600,12000),placement:at}),first,e.type+' culling must not resize its source region');
}
function capture(type:string,t:number,props:Properties={},state:Properties={},clip?:any){
 const doc=art.validate({version:1,scene:'generator-test',instances:[{id:'generator',type,props,placement:at,layer:art.get(type).framePhase==='sky'?'distance':'set',order:0,...(clip?{clip}:{})}]});
 const records:CapturedArtwork[]=[],r=recorder();r.ctx.getTransform=()=>({a:1,b:0,c:0,d:1,e:0,f:0} as DOMMatrix);beginLayeredFrame(a=>records.push(a));
 try{const env={view:view(t),state:{generator:state},reduced:false};if(art.get(type).framePhase==='sky')drawCompositionSlot(r.ctx,art,doc,env,'behind-player',undefined,'sky');else drawComposition(r.ctx,art,doc,env,'backdrop');}finally{endLayeredFrame();}
 return{record:records[0],paints:r.paints};
}
for(const type of ['environment.cloud-layer','environment.sky-traffic','vehicle.traffic-lane','character.flock','everyday.rain']){
 const a=capture(type,0,configurations[type]),b=capture(type,600,configurations[type]);assert.equal(a.record.boundsSource,'region');assert.deepEqual(a.record.bounds,b.record.bounds);assert.equal(a.record.pickable,true,type+JSON.stringify(a.record.bounds)+a.record.reason);
}
const shore=capture('coast.far-shore',0,{drawingMinX:4680});assert.equal(shore.record.pickable,true,'A restricted skyline retains its configured selection region');assert.ok(shore.record.bounds.width>1500);assert.equal(shore.record.drawingBounds?.width,0);assert.match(shore.record.row.element.drawingNote!(shore.record.row.props,shore.record.row.state)!,/4680/);
const noDrawing=capture('vehicle.scheduled-craft',0,{kind:'pod',altitude:300,startTime:20,endTime:30,startX:0,velocityX:1});
assert.equal(noDrawing.paints.length,0);assert.equal(noDrawing.record.pickable,true,'An authored generator remains selectable between emissions');
assert.throws(()=>art.get('vehicle.air-lanes'),/Unknown artwork type/,'The superseded bundle is removed, rather than retained as an alternate authoring path');
assert.notDeepEqual(capture('environment.cloud-layer',0).record.bounds,capture('environment.cloud-layer',0,{altitude:700}).record.bounds,'Editing the region changes its box');
const clipped=capture('everyday.rain',600,{}, {},{x:210,h:100,w:30,tall:40});assert.equal(clipped.record.bounds.width,30);assert.equal(clipped.record.bounds.height,40);
const e=art.get('environment.cloud-layer'),props=art.properties(e.type,{}),state=art.visualProperties(e.type,{}),plain=recorder();e.draw(plain.ctx,view(600),props,state,'backdrop',at);
assert.deepEqual(capture(e.type,600).paints,plain.paints,'Region capture preserves the exact single native paint');
console.log(`PASS: ${generators.length} generator definitions have time-stable regions; spatial fields ignore viewport culling; native capture, empty emission intervals, clipping and configuration edits agree.`);
