/** Local fixture: record canonical paint for one scene's native preview, for before/after layer migrations. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import {canonicalPaint} from './canonical-paint.mts';
const [scene='library',out]=process.argv.slice(2);
function recorder(){const commands:unknown[][]=[];let gradient=0;const values:Record<string,unknown>={globalAlpha:1,lineWidth:1,font:'',getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),measureText:(text:string)=>({width:text.length*6}),getImageData:(_x:number,_y:number,w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h})};const ctx=new Proxy(values,{get(t,k:string){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient'||k==='createPattern')return(...args:unknown[])=>{const id=++gradient;commands.push([k,...args,id]);return{id,addColorStop:(...a:unknown[])=>commands.push(['stop',id,...a]),setTransform:()=>{}};};return(...args:unknown[])=>{commands.push([k,...args]);};},set(t,k:string,value){t[k]=value;commands.push(['set',k,value]);return true;}});return{ctx,commands};}
const canvases:{width:number;height:number;rec:ReturnType<typeof recorder>}[]=[];
(globalThis as any).document={createElement:()=>{const rec=recorder(),c={width:0,height:0,rec,getContext:()=>rec.ctx,style:{}};return c;},fonts:{load:async()=>[],ready:Promise.resolve()}};
const {createNativePreview}=await import('../../src/ssg/game/authoring/native-preview.ts');
const {nativeSceneAdapters}=await import('../../src/ssg/game/authoring/scene-adapters.ts');
const dir=scene==='harborShift'?'harbor-shift':scene;
const composition=JSON.parse(fs.readFileSync(`src/ssg/game/scenes/${dir}/composition.json`,'utf8'));
const configs=[{width:640,height:360,minute:580,time:0,weather:'clear',reduced:false,hack:false},{width:960,height:540,minute:0,time:2.25,weather:'rain',reduced:false,hack:false},{width:1280,height:720,minute:1100,time:5,weather:'storm',reduced:false,hack:false},{width:400,height:900,minute:1200,time:3.3,weather:'fog',reduced:true,hack:false},{width:960,height:540,minute:580,time:1,weather:'clear',reduced:false,hack:true}];
const result:Record<string,string>={};const paints:unknown[]=[];
for(const [index,c]of configs.entries()){const rec=recorder(),canvas={width:c.width,height:c.height,getContext:()=>rec.ctx,style:{}};
 createNativePreview(nativeSceneAdapters).render(canvas as any,{composition,time:c.time,reduced:c.reduced,overlays:false,environment:{day:1,minute:c.minute,seed:3,weather:c.weather,cameraX:index%2?150:0,zoom:1,flags:'{}',state:'{}',hack:c.hack,hover:''}} as any);
 const p=canonicalPaint(rec.commands);paints.push(p);result[index]=crypto.createHash('sha256').update(JSON.stringify(p)).digest('hex').slice(0,16)+' ('+p.length+' paints)';}
console.log(scene,result);
if(out)fs.writeFileSync(out,JSON.stringify(paints));
