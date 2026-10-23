/** The actual P14 fitting and independent placement share one kernel and explicit state. */
import assert from 'node:assert/strict';
import {art} from '../../src/ssg/game/art';
import {frameView} from '../../src/ssg/game/art/core/view';
import {createTrainInteriorArtwork,type ArtworkInputs} from '../../src/ssg/game/art/assemblies/train-interior';
import type {TrainFrame} from '../../src/ssg/game/art/assemblies/train-elements';
function record(){const ops:unknown[]=[],state:Record<string,unknown>={};return{ops,ctx:new Proxy(state,{get(o,k:string){if(k in o)return o[k];return(...args:unknown[])=>ops.push([k,...args]);},set(o,k:string,value){o[k]=value;ops.push([k,value]);return true;}}) as CanvasRenderingContext2D};}
const element=art.get('train.brake');assert.equal(element.libraryUse,'reusable');
for(const phase of ['running','braking','halted','dwell'])for(const hover of [null,'train'])for(const cam of [0,750,1000,1200]){
 const frame={L:{width:1200,ceil:166,brake:1030,gangway:1000},visual:{ride:{phase,pos:0,open:0},run:0,home:false},roof:{cove:14,shell:12,wire:0,messenger:0},windows:[],doors:[],hover,riders:{}} as unknown as TrainFrame;
 const view={...frameView(137),cam,viewW:640,viewH:360,gy:300,y:(h:number)=>300-h,sx:(x:number,depth=1)=>Math.round(x-cam*depth)};
 const a=record(),b=record(),before=JSON.stringify(frame);
 createTrainInteriorArtwork(frame as ArtworkInputs).brake(a.ctx,view);
 element.draw(b.ctx,view,{},art.visualProperties(element.type,{frame:frame as never}),'backdrop',{x:1030,h:0,scale:1,facing:1,parallax:1});
 assert.deepEqual(b.ops,a.ops,'native fitting preserves commands/culling for '+phase+' at '+cam);
 assert.equal(JSON.stringify(frame),before,'painting does not advance or mutate the ride');
 if(cam===1000){const c=record();element.draw(c.ctx,view,{},art.visualProperties(element.type,{pulled:phase==='braking'||phase==='halted',highlight:hover==='train'}),'backdrop',{x:1030,h:0,scale:1,facing:1,parallax:1});assert.deepEqual(c.ops,a.ops,'standalone state preview agrees with the real device picture');}
}
console.log('Brake artwork PASS: native/standalone parity in four phases, hover, cameras and immutable prepared state.');
