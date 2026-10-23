/** Native train fittings and independent placement use the same parameterized drawing kernels. */
import assert from 'node:assert/strict';
import {art} from '../../src/ssg/game/art';
import {frameView} from '../../src/ssg/game/art/core/view';
import {createTrainInteriorArtwork} from '../../src/ssg/game/art/assemblies/train-interior';
import type {TrainFrame} from '../../src/ssg/game/art/assemblies/train-elements';
function record(){const ops:unknown[]=[],state:Record<string,unknown>={};return{ops,ctx:new Proxy(state,{get(o,k:string){if(k in o)return o[k];return(...args:unknown[])=>ops.push([k,...args]);},set(o,k:string,value){o[k]=value;ops.push([k,value]);return true;}}) as CanvasRenderingContext2D};}
for(const id of ['drawCam','drawPole','windowFrame','staffDoor','seatBack','seatFront'] as const)for(const ceiling of [120,166,220])for(const width of [80,160])for(const x of [70,500,1000])for(const h of [0,25]){
 const frame={L:{width:1200,ceil:ceiling,staff:x},visual:{ride:{phase:'running',pos:0,open:0},run:0,home:false},roof:{cove:14,shell:12,wire:0,messenger:0},windows:[],doors:[],hover:null,riders:{}} as unknown as TrainFrame;
 const view={...frameView(137),viewW:640,viewH:360,gy:300,y:(q:number)=>300-q},nativeView={...view,gy:300-h,y:(q:number)=>300-q-h};
 const element=art.get('train.'+id),props=art.properties(element.type,id==='windowFrame'?{width,h0:40,h1:100}:id.startsWith('seat')?{width}:id==='drawCam'||id==='drawPole'?{ceiling}:{}),state=art.visualProperties(element.type,{frame:frame as never,...(id.startsWith('seat')?{width}:{})}),before=JSON.stringify(frame);
 const kernel=createTrainInteriorArtwork(frame),a=record(),b=record(),c=record();
 switch(id){case'windowFrame':kernel.windowFrame(a.ctx,nativeView,x,width,40,100);break;case'staffDoor':kernel.staffDoor(a.ctx,nativeView);break;case'seatBack':case'seatFront':kernel[id](a.ctx,nativeView,x,width);break;default:kernel[id](a.ctx,nativeView,x);}
 const placement={x,h,scale:1,facing:1 as const,parallax:1};element.draw(b.ctx,view,props,state,'backdrop',placement);
 assert.deepEqual(b.ops,a.ops,id+' preserves native geometry/culling at '+x+'/'+h);
 element.draw(c.ctx,view,props,art.visualProperties(element.type,{}),'backdrop',placement);
 assert.deepEqual(c.ops,a.ops,id+' standalone properties agree with prepared native state');
 assert.equal(JSON.stringify(frame),before,'drawing never writes the native frame');
 assert.equal(element.libraryUse,'reusable');
}
console.log('Train fittings PASS: cameras, poles, windows, staff doors and seats preserve native/standalone commands across dimensions, placements and culling.');
