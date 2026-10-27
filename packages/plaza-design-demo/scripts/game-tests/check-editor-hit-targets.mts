import assert from 'node:assert/strict';
import {hitTestArtwork} from '../../src/ssg/game/authoring/selection';
import fs from 'node:fs';
const box={id:'flow',x:100,y:100,width:300,height:200};
let pixelProbes=0;
const preview={bounds:[{id:'background',x:0,y:0,width:1000,height:1000},box],pick:()=>{pixelProbes++;return undefined;}};
for(const point of [{x:110,y:110},{x:250,y:150},{x:390,y:290}])assert.equal(hitTestArtwork(preview,point,16)?.id,'flow','The whole highlighted group is a target, including gaps between painted bodies');
assert.equal(pixelProbes,0,'A known bounding target must not replay artwork to decide the click');
assert.equal(hitTestArtwork({bounds:[{...box,id:'behind'},{...box,id:'front'}]},{x:200,y:200},0)?.id,'front','Equal-area ties preserve paint order');
assert.equal(hitTestArtwork({bounds:[{...box,clip:{x:150,y:100,width:100,height:200}}]},{x:110,y:110},0),undefined,'Clipped portions are never hit targets');
assert.equal(hitTestArtwork({bounds:[{id:'small',x:10,y:10,width:2,height:2}]},{x:6,y:6},16)?.id,'small','Small handles retain a usable click target');
const repaint={bounds:[],pick:()=> 'outside',resolved:{outside:{bounds:{x:0,y:0,width:20,height:20}}}} as any;
assert.equal(hitTestArtwork(repaint,{x:5,y:5},0)?.id,'outside','Native pixel fallback still reaches paint beyond a conservative rectangle');
const input=fs.readFileSync('src/ssg/game/authoring/viewport-input.ts','utf8');assert(!/hitTest\([^;]*,\s*true\)/.test(input),'Press must not select a stricter target than hover');
console.log('Editor hit targets: shared hover/press regions, sparse groups, clipped pieces, small handles, cross-source paint ties and native fallback PASS');

// A blocked edit must never enter the transient preview; rejection on release must repaint immediately.
const {mountViewportInput,createViewportState}=await import('../../src/ssg/game/authoring/viewport-input');
const surface=()=>Object.assign(new EventTarget(),{dataset:{},focus(){},setPointerCapture(){},hasPointerCapture(){return false;},releasePointerCapture(){}});
const canvas=surface() as any,stage=surface() as any,compareCanvas=surface() as any;
const composition={version:1,scene:'test',instances:[{id:'floor',type:'level.floor',placement:{x:0,h:0},props:{},layer:'logic',order:0}]} as any;
const doc={id:'test',kind:'composition',value:composition} as any;
let rejectPreview=true,rejectCommit=false,commits=0,draws=0,warnings=0;
const viewport=createViewportState();
const port:any={viewport,canvas,stage,compareCanvas,selectedId:'floor',navigable:()=>true,sequenceNav:{x:0,y:0,zoom:1},closePicker(){},select_(){},compositionDocument:()=>doc,coordinates:(e:any)=>({x:e.clientX,y:e.clientY}),hitTest:()=>({id:'floor'}),preview:{deltaToLocal:(_id:string,x:number,y:number)=>({x,h:-y})},snap:0,
 validateDrag(){if(rejectPreview)throw Error('Connected floor cannot move');},notice(){warnings++;},draw:async()=>{draws++;},commitDrag(){commits++;if(rejectCommit)throw Error('Commit rejected');},placeHover(){},placeJoined(){},refreshOptions(){},config:{}};
const dispose=mountViewportInput(port),event=(x:number,y:number)=>({pointerType:'mouse',pointerId:1,button:0,clientX:x,clientY:y,preventDefault(){}} as any);
canvas.onpointerdown(event(0,0));canvas.onpointermove(event(10,10));canvas.onpointermove(event(20,20));
assert.deepEqual(viewport.dragging!.pending,composition,'A blocked drag never changes the preview position');assert.equal(warnings,1,'Repeated blocked samples do not rebuild the inspector');
canvas.onpointerup(event(20,20));assert.equal(commits,0);assert.equal(draws,1);assert.equal(viewport.dragging,undefined);
rejectPreview=false;canvas.onpointerdown(event(0,0));canvas.onpointermove(event(10,10));assert.equal(viewport.dragging!.pending.instances[0].placement.x,10,'Allowed objects still preview movement');
rejectCommit=true;assert.throws(()=>canvas.onpointerup(event(10,10)),/Commit rejected/);assert.equal(viewport.dragging,undefined);assert.equal(draws,2,'Even a failed commit immediately repaints the committed source');dispose();
console.log('Viewport drag constraints: blocked previews stay put, allowed moves preview and rejected commits repaint PASS');
