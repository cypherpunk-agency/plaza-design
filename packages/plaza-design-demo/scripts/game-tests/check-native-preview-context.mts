/** Regression: full native editor frames must not inherit prior canvas/probe paint state. */
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {createNativePreview} from '../../src/ssg/game/authoring/native-preview';import {nativeSceneAdapters} from '../../src/ssg/game/authoring/scene-adapters';import {libraryComposition} from '../../src/ssg/game/scenes/library/composition';
class Canvas {
 private w=960; height=540;resets=0;operations:unknown[]=[];
 private initial(){return{globalAlpha:1,globalCompositeOperation:'source-over',fillStyle:'#000000',strokeStyle:'#000000',lineWidth:1,lineCap:'butt',lineJoin:'miter',miterLimit:10,font:'10px sans-serif',textAlign:'start',textBaseline:'alphabetic',shadowBlur:0,shadowColor:'rgba(0, 0, 0, 0)',shadowOffsetX:0,shadowOffsetY:0,imageSmoothingEnabled:true,transform:[] as unknown[],clipped:false};}
 state:Record<string,unknown>=this.initial();private stack:Record<string,unknown>[]=[];private path:unknown[]=[];
 private normalize=(v:unknown):unknown=>v instanceof Canvas?{canvas:[v.width,v.height]}:v&&typeof v==='object'&&'addColorStop'in v?'gradient':v;
 private call=(key:string,args:unknown[])=>{this.operations.push([key,...args.map(this.normalize),Object.fromEntries(Object.entries({...this.state,transform:[...this.state.transform as unknown[]]}).map(([k,v])=>[k,this.normalize(v)]))]);};
 context=new Proxy({},{get:(_o,key)=>{
  if(key==='canvas')return this;if(key in this.state)return this.state[String(key)];
  if(key==='save')return()=>this.stack.push({...this.state,transform:[...this.state.transform as unknown[]]});if(key==='restore')return()=>{const state=this.stack.pop();if(state)this.state=state;};
  if(key==='getTransform')return()=>({a:1,b:0,c:0,d:1,e:0,f:0});if(key==='measureText')return(s:string)=>({width:s.length*6});
  if(key==='getImageData'||key==='createImageData')return(...args:number[])=>({data:new Uint8ClampedArray((args.length===2?args[0]*args[1]:args[2]*args[3])*4)});
  if(key==='createLinearGradient'||key==='createRadialGradient')return(...args:unknown[])=>{this.call(String(key),args);return{addColorStop:()=>{}};};
  if(key==='setTransform'||key==='resetTransform')return(...args:unknown[])=>{this.state.transform=[key,...args];};if(key==='translate'||key==='scale'||key==='rotate'||key==='transform')return(...args:unknown[])=>{this.state.transform=[...this.state.transform as unknown[],key,...args];};
  if(key==='beginPath')return()=>{this.path=[];};if(key==='clip')return()=>{this.state.clipped=true;};
  return(...args:unknown[])=>{if(['moveTo','lineTo','rect','arc','ellipse','bezierCurveTo','quadraticCurveTo','closePath'].includes(String(key)))this.path.push([key,...args]);this.call(String(key),args);};
 },set:(_o,key,value)=>{this.state[String(key)]=value;return true;}}) as CanvasRenderingContext2D;
 get width(){return this.w;}set width(value:number){this.w=value;this.resets++;this.state=this.initial();this.stack=[];this.path=[];this.operations=[];}
 getContext(){return this.context;}
}
Object.assign(globalThis,{document:{createElement:()=>new Canvas()},localStorage:{sentinel:'preserved'},sessionStorage:{sentinel:'preserved'}});
const canvas=new Canvas(),preview=createNativePreview(nativeSceneAdapters),request={composition:libraryComposition,time:2.283333333333333,reduced:false,overlays:false,environment:{day:1,minute:580,seed:41,cameraX:0,cameraH:0,zoom:1,flags:'{}',state:'{}',weather:'clear'}},source=JSON.stringify(libraryComposition),stored=JSON.stringify({localStorage,sessionStorage});
preview.render(canvas as unknown as HTMLCanvasElement,request);const baseline=structuredClone(canvas.operations),resets=canvas.resets;
// Real canvas state not covered by clearRect, including an outstanding save and clip.
const context=canvas.context;context.save();context.globalAlpha=.25;context.globalCompositeOperation='multiply';context.lineCap='round';context.lineJoin='bevel';context.lineWidth=9;context.font='44px serif';context.shadowBlur=12;context.shadowColor='red';context.imageSmoothingEnabled=false;context.translate(80,40);context.beginPath();context.rect(5,5,10,10);context.clip();
preview.render(canvas as unknown as HTMLCanvasElement,request);assert.equal(canvas.resets,resets+1);assert.deepEqual(canvas.operations,baseline,'native full-frame commands/effective canvas state match a fresh frame despite contaminated context');
preview.render(canvas as unknown as HTMLCanvasElement,{...request,environment:{...request.environment,cameraX:100,cameraH:100}});preview.render(canvas as unknown as HTMLCanvasElement,request);assert.deepEqual(canvas.operations,baseline,'camera probe history must not alter the returned native frame');assert.equal(JSON.stringify(libraryComposition),source);assert.equal(JSON.stringify({localStorage,sessionStorage}),stored);
const result={status:'PASS',scope:'Actual native Library full-frame paint commands with effective canvas state, fresh versus contaminated context and camera-probe replay; raw browser pixel gate separately owned by primary',commands:baseline.length,canvasResets:canvas.resets,contamination:['alpha','composite','lineCap','lineJoin','lineWidth','font','shadow','smoothing','transform','clip','outstanding save'],sourceStoragePreserved:true};fs.mkdirSync(path.resolve('../../.game-test-output/evidence'),{recursive:true});fs.writeFileSync(path.resolve('../../.game-test-output/evidence/native-preview-context-history-contract.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
