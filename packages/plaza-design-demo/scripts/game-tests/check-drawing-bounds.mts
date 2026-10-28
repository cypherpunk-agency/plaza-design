import assert from 'node:assert/strict';
import {art} from '../../src/ssg/game/art';
import {ArtRegistry,drawComposition,beginLayeredFrame,endLayeredFrame,type AssetDefinition,type ChunkDocument} from '../../src/ssg/game/art/core/composition';
import {measureArtwork,registerBitmapBounds,withoutArtworkBounds} from '../../src/ssg/game/art/core/measure';
import type {CapturedArtwork} from '../../src/ssg/game/art/core/presentation';
import {frameView} from '../../src/ssg/game/art/core/view';
import {frameSelection} from '../../src/ssg/game/authoring/native-preview';
import {recorder} from './capture-actor-paint.mts';

const view={...frameView(600),viewW:960,viewH:540,gy:486,sx:(x:number)=>x,y:(h:number)=>486-h};
function capture(doc:ChunkDocument,registry=art,state:Record<string,any>={}){
 const records:CapturedArtwork[]=[],helpers:CapturedArtwork[]=[];
 measureArtwork(ctx=>{beginLayeredFrame(r=>records.push(r),r=>helpers.push(r));try{drawComposition(ctx,registry,doc,{view,state,reduced:false},'backdrop');drawComposition(ctx,registry,doc,{view,state,reduced:false},'foreground');}finally{endLayeredFrame();}});
 return{records,helpers};
}
const instance=(type:string,props={},placement={x:200,h:0})=>({id:'item',type,props,placement,layer:'set' as const,order:0});
const doc=(type:string,props={})=>art.validate({version:1,scene:'bounds-fixture',instances:[instance(type,props)]});
const stool=capture(doc('furniture.stool')).records[0];assert.deepEqual(stool.bounds,{x:193,y:476,width:14,height:10});
const trolley=capture(doc('shift.trolley'),art,{item:{x:600}}).records[0];assert.ok(trolley.bounds.x>=569&&trolley.bounds.x+trolley.bounds.width<=632,'Trolley outline follows state position, not placement');
const sign=capture(doc('shift.sign')).records[0];assert.ok(sign.bounds.height<60,'Wall sign does not reserve nonexistent post/chains');

let draws=0;
const element:AssetDefinition={type:'probe',version:1,label:'Probe',category:'test',parts:['backdrop'],fields:{},bounds:()=>({x:-999,h:999,w:1998,tall:1998}),anchors:()=>({}),draw(ctx,_v,_p,_s,pass){draws++;ctx.fillRect(pass==='backdrop'?0:40,-20,20,20);}};
const registry=new ArtRegistry().register(element),source=registry.validate({version:1,scene:'probe-scene',instances:[instance('probe')]});
const result=capture(source,registry);assert.equal(draws,1,'The asset paints once during capture');result.records.push({...result.records[0],bounds:{...result.records[0].bounds,x:240},paintOrder:1});
const selection=frameSelection({artwork:result.records,helpers:[],sceneId:source.scene} as any,{composition:source,time:0,reduced:false,overlays:false,environment:{}},false);
assert.deepEqual(selection.bounds[0],{id:'item',x:200,y:466,width:60,height:20},'Parts combine into the complete asset outline');
const clipped=registry.validate({...source,instances:[{...source.instances[0],clip:{x:205,h:15,w:8,tall:10}}]});
const clippedParts=capture(clipped,registry).records;assert.deepEqual(clippedParts[0].bounds,{x:205,y:471,width:8,height:10});assert.equal(clippedParts[0].pickable,true);
registry.register(art.get('assembly.group'));
const grouped=registry.validate({version:1,scene:'group-scene',instances:[{id:'group',type:'assembly.group',props:{},placement:{x:50,h:0},layer:'set',order:0,children:[instance('probe')]}]});
const groupFrame=capture(grouped,registry),groupSelection=frameSelection({artwork:groupFrame.records,helpers:groupFrame.helpers,sceneId:grouped.scene}as any,{composition:grouped,time:0,reduced:false,overlays:false,environment:{}},false);
assert.deepEqual(groupSelection.bounds.find(b=>b.id==='group'),{id:'group',x:250,y:466,width:20,height:20},'Assembly outline derives from its visible contents');

const bitmap={width:100,height:100};registerBitmapBounds(bitmap,{x:30,y:10,width:20,height:40});
assert.deepEqual(measureArtwork(ctx=>ctx.drawImage(bitmap as any,200,300,200,200)),{x:260,y:320,width:40,height:80},'Transparent sprite padding is excluded, including resized images');
const shadow=measureArtwork(ctx=>{withoutArtworkBounds(ctx,()=>ctx.fillRect(-100,-100,200,200));ctx.fillRect(0,-20,10,20);});assert.deepEqual(shadow,{x:0,y:-20,width:10,height:20});
const rotated=measureArtwork(ctx=>{ctx.beginPath();ctx.ellipse(30,40,20,5,Math.PI/2,0,Math.PI*2);ctx.fill();});assert.ok(Math.abs(rotated.width-10)<1e-8&&Math.abs(rotated.height-40)<1e-8,'Rotated ellipses use the drawn axes');
assert.deepEqual(measureArtwork(ctx=>{ctx.beginPath();ctx.rect(0,0,10,10);ctx.clip();ctx.beginPath();ctx.rect(-100,-100,200,200);ctx.clip();ctx.fillRect(-100,-100,200,200);}),{x:0,y:0,width:10,height:10},'Nested clips intersect rather than replacing the previous mask');

const plain=recorder(),observed=recorder();const paint=(ctx:CanvasRenderingContext2D)=>{ctx.save();ctx.translate(20,30);ctx.fillStyle='#123456';ctx.fillRect(0,0,20,30);withoutArtworkBounds(ctx,()=>ctx.fillRect(40,40,10,10));ctx.restore();};paint(plain.ctx);measureArtwork(paint,observed.ctx);assert.deepEqual(observed.paints,plain.paints,'Observation preserves the actual drawing transcript');
console.log('PASS: drawing-derived outlines, current state, clipping, parts, sprite margins, shadow exclusion, nested masks and unchanged single-pass painting.');
