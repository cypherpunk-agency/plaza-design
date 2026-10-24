import assert from 'node:assert/strict';
import {centerNativePreview} from '../../src/ssg/game/authoring/native-camera';
import type {PreviewRequest,PreviewResult} from '../../src/ssg/game/authoring/contracts';
const canvas={width:960,height:540} as HTMLCanvasElement;
let cases=0;
for(const depth of [0,.1,.3,.7,1,1.4])for(const scale of [.5,1,4]){
 const request:PreviewRequest={composition:{version:1,scene:'camera',instances:[]},time:1,reduced:false,overlays:false,environment:{cameraX:30,cameraH:-12,renderScale:scale}};
 const before=JSON.stringify(request);let calls=0;
 const render=(_canvas:HTMLCanvasElement,input:PreviewRequest):PreviewResult=>{calls++;return{bounds:[{id:'piece',x:(2300-Number(input.environment.cameraX)*depth)*scale,y:(88+Number(input.environment.cameraH))*scale,width:40*scale,height:70*scale}]};};
 const focused=centerNativePreview(render,canvas,request,r=>r.bounds[0]);const b=focused.result.bounds[0];
 if(depth){assert.ok(Math.abs(b.x+b.width/2-480)<=1);assert.ok(Number.isFinite(focused.request.environment.cameraX));}
 else assert.equal(focused.request.environment.cameraX,30,'camera-insensitive artwork must not invent an infinite camera');
 assert.ok(Math.abs(b.y+b.height/2-270)<=1);assert.equal(JSON.stringify(request),before);assert.ok(calls<=7);cases++;
 const offset=centerNativePreview(render,canvas,request,r=>r.bounds[0],{x:20,h:10});
 assert.ok(Math.abs(Number(offset.request.environment.cameraX)-Number(focused.request.environment.cameraX)-20)<1e-8);assert.ok(Math.abs(Number(offset.request.environment.cameraH)-Number(focused.request.environment.cameraH)-10)<1e-8);
}
console.log(JSON.stringify({status:'PASS',cases,proof:['native camera response including renderer-owned parallax','renderScale','finite insensitive camera','post-focus pan','unchanged request','bounded calls']}));
