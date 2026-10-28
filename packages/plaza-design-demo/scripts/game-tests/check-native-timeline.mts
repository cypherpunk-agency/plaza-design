import assert from 'node:assert/strict';
import{art}from'../../src/ssg/game/art';
import{createNativePreview}from'../../src/ssg/game/authoring/native-preview';
import{evaluateTimeline,validateTimeline,type TimelineProgram}from'../../src/ssg/game/art/core/timeline';
import{drawTimelineOverlay}from'../../src/ssg/game/art/core/timeline-overlay';
import type{ChunkDocument}from'../../src/ssg/game/art/core/composition';
import type {PreviewRequest} from '../../src/ssg/game/authoring/contracts';
import {prepareFrame} from '../../src/ssg/game/runtime/prepare-frame';
import {lightAt} from '../../src/ssg/game/world/light';
const composition:ChunkDocument={version:1,scene:'native-overlay-fixture',instances:[]};
const timeline:TimelineProgram={version:1,sequences:[{id:'authored-on-native-scene',duration:6,composition:'room',shots:[{id:'single',from:0,to:6,camera:{x:120,h:30,zoom:2}}],tracks:[],text:[{id:'caption',from:1,to:3,text:'OPEN THE GATE\nTHEN WAIT',x:24,h:-36}],fades:[{id:'fade',from:1,to:3,color:'#123456',start:0,end:1}],beats:[]}]};
const context={registry:art,compositions:{room:composition}};validateTimeline(timeline,context);
function recorder(){const commands:unknown[][]=[],paints:any[]=[];let state:any={globalAlpha:1,globalCompositeOperation:'source-over',fillStyle:'#000',matrix:[1,0,0,1,0,0]},stack:any[]=[];const ctx=new Proxy({}, {get(_t,k:string){if(k in state)return state[k];if(k==='getTransform')return()=>({a:state.matrix[0]});if(k==='save')return()=>{stack.push({...state,matrix:[...state.matrix]});commands.push(['save']);};if(k==='restore')return()=>{state=stack.pop();commands.push(['restore']);};if(k==='setTransform')return(...args:number[])=>{state.matrix=args;commands.push([k,...args]);};if(k.startsWith('create'))return()=>({addColorStop(){}});return(...args:unknown[])=>{commands.push([k,...args]);if(['fillRect','fillText'].includes(k))paints.push({kind:k,args,alpha:state.globalAlpha,fill:state.fillStyle,matrix:[...state.matrix]});};},set(_t,k:string,value){state[k]=value;commands.push(['set',k,value]);return true;}})as unknown as CanvasRenderingContext2D;return{ctx,commands,paints,state:()=>({...state,matrix:[...state.matrix]})};}
const preview=createNativePreview({'native-overlay-fixture':{validate:doc=>art.validate(doc),definition:()=>({id:'native-overlay-fixture',name:'Native overlay test',width:900,spawn:0,exits:[],drawBackdrop:(ctx,v)=>{ctx.fillStyle='#abcdef';ctx.fillRect(v.sx(25),v.y(0),8,8);}}),environment:(_doc,view)=>({view,state:{},reduced:false})}});
function render(time:number,reduced=false,withFrame=true){const r=recorder(),canvas={width:640,height:360,getContext:()=>r.ctx}as unknown as HTMLCanvasElement;const frame=evaluateTimeline(timeline,'authored-on-native-scene',time,context,{reduced});const request:PreviewRequest={composition,time,reduced,overlays:false,environment:{renderScale:2},...(withFrame?{frame}:{})};preview.render(canvas,request);return r;}
for(const reduced of[false,true]){const mid=render(2,reduced),world=mid.paints.find(p=>p.fill==='#abcdef'),fade=mid.paints.find(p=>p.fill==='#123456'),captions=mid.paints.filter(p=>p.kind==='fillText');assert.deepEqual(world.matrix,[4,0,0,4,0,0],'Native camera zoom is a canvas transform (render scale 2 × zoom 2)');assert.deepEqual(world.args.map((n:number)=>n*world.matrix[0]),[-380,372,32,32],'Native camera still affects world artwork: positions as before, and its size zooms with the camera');assert.equal(fade.alpha,.5);assert.deepEqual(fade.args,[0,0,320,180],'Fade covers logical viewport');assert.deepEqual(fade.matrix,[2,0,0,2,0,0]);assert.deepEqual(captions.map(p=>p.args),[['OPEN THE GATE',24,36],['THEN WAIT',24,54]],'Cards use fixed viewport coordinates above the fade');assert.ok(mid.paints.indexOf(fade)<mid.paints.indexOf(captions[0]));assert.ok(!render(0,reduced).paints.some(p=>p.fill==='#123456'||p.kind==='fillText'));const atEnd=render(3,reduced);assert.equal(atEnd.paints.find(p=>p.fill==='#123456').alpha,1);assert.ok(!atEnd.paints.some(p=>p.kind==='fillText'));assert.ok(!render(4,reduced).paints.some(p=>p.fill==='#123456'||p.kind==='fillText'));}
const staticRender=render(0,false,false),emptyFrame=recorder(),frame=evaluateTimeline(timeline,'authored-on-native-scene',0,context);frame.camera={x:0,h:0,zoom:1};preview.render({width:640,height:360,getContext:()=>emptyFrame.ctx}as unknown as HTMLCanvasElement,{composition,time:0,reduced:false,overlays:false,environment:{renderScale:2},frame});assert.deepEqual(emptyFrame.commands,staticRender.commands,'Static and empty overlays issue identical canvas operations');
const isolated=recorder();isolated.ctx.globalAlpha=.25;isolated.ctx.fillStyle='#ffeedd';isolated.ctx.setTransform(7,0,0,7,9,11);const before=isolated.state();drawTimelineOverlay(isolated.ctx,{width:320,height:180,scale:2},evaluateTimeline(timeline,'authored-on-native-scene',2,context));assert.deepEqual(isolated.state(),before,'Overlay restores caller canvas state');
// Opening/closing a timeline changes available editor space, not the world's scale or centre.
const workspacePicture=(height:number)=>{const r=recorder(),c={width:640,height,getContext:()=>r.ctx}as unknown as HTMLCanvasElement;const result=preview.render(c,{composition,time:0,reduced:false,overlays:false,viewport:{width:640,height:360,scale:2},workspace:{x:12,h:9,zoom:1,anchorX:0,anchorH:0},environment:{renderScale:2}});return{result,paint:r.paints.find(p=>p.fill==='#abcdef')};};
const small=workspacePicture(360),tall=workspacePicture(660);
assert.deepEqual(small.paint.matrix,tall.paint.matrix);assert.equal(small.paint.args[0],tall.paint.args[0]);assert.equal(tall.paint.args[1]-small.paint.args[1],75,'Artwork moves only by half the added logical viewport height');
assert.equal(small.result.camera!.width,tall.result.camera!.width);assert.equal(small.result.camera!.height,tall.result.camera!.height);assert.equal(small.result.camera!.width,640,'The game camera keeps its authored dimensions while the editor grows');
const zoomed=recorder(),zoomedResult=preview.render({width:640,height:360,getContext:()=>zoomed.ctx}as unknown as HTMLCanvasElement,{composition,time:0,reduced:false,overlays:false,viewport:{width:640,height:360,scale:4,ground:63},workspace:{x:12,h:9,zoom:1,anchorX:0,anchorH:0},environment:{renderScale:2,zoom:2}});
assert.deepEqual(zoomed.paints.find(p=>p.fill==='#abcdef').args,small.paint.args,'Game-camera zoom does not pan or zoom the independent workspace');assert.equal(zoomedResult.camera!.width,320,'Only the camera guide changes size');
console.log('Native timeline overlays passed through real preview/shared renderer: arbitrary sequence, midpoint/boundary fades, multiline cards, camera/scale, reduced motion, unchanged static commands and restored canvas state.');

const {composition: _reference, ...settings}=timeline.sequences[0];
composition.sequence=structuredClone(settings);
const compositionWorkspace=(width:number,height:number)=>prepareFrame({kind:'sequence',context:recorder().ctx,documents:{compositions:{room:composition},timeline},composition,sequenceId:timeline.sequences[0].id,time:2,width,height,scale:1,reduced:false,lighting:lightAt(1,600,270,null),workspace:{anchorX:0,anchorH:0,x:12,h:9,zoom:1,basis:{width:640,height:360,ground:306}}});
const compact=compositionWorkspace(640,360),expanded=compositionWorkspace(1000,660);
assert.equal(compact.cameraGuide!.width,expanded.cameraGuide!.width);assert.equal(compact.cameraGuide!.x-320,expanded.cameraGuide!.x-500);assert.equal(compact.cameraGuide!.y-180,expanded.cameraGuide!.y-330,'Standalone cinematic workspaces preserve the same centre/scale as world workspaces');
for(const [width,height]of [[640,360],[1000,660]]){
 const followed=prepareFrame({kind:'sequence',context:recorder().ctx,documents:{compositions:{room:composition},timeline},composition,sequenceId:timeline.sequences[0].id,time:2,width,height,scale:1,reduced:false,lighting:lightAt(1,600,270,null),workspace:{anchorX:0,anchorH:0,x:900,h:120,zoom:.2,followCamera:true,basis:{width:640,height:360,ground:306}}});
 const guide=followed.cameraGuide!;
 assert.ok(Math.abs(guide.x+guide.width/2-width/2)<1e-8);
 assert.ok(Math.abs(guide.y+guide.height/2-height/2)<1e-8);
 assert.ok(guide.width<=width*.9+1e-8&&guide.height<=height*.9+1e-8);
 const r=recorder(),native=preview.render({width,height,getContext:()=>r.ctx}as unknown as HTMLCanvasElement,{composition,time:2,reduced:false,overlays:false,viewport:{width:640,height:360,scale:2},workspace:{x:900,h:120,zoom:.2,followCamera:true,anchorX:0,anchorH:0},environment:{renderScale:2}}).camera!;
 assert.ok(Math.abs(native.x+native.width/2-width/2)<1e-8);
 assert.ok(Math.abs(native.y+native.height/2-height/2)<1e-8);
}
for(const reduced of [false,true])for(const time of [0,2,3,4]){
  assert.deepEqual(render(time,reduced,false).commands,render(time,reduced,true).commands,
    'A normal scene with embedded sequence controls uses its native adapter and evaluates an omitted frame');
}
