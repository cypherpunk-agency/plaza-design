/** Focused appearance gate: shared conversation metadata must not change native actor painting. */
import assert from 'node:assert/strict';
import {frameView} from '../../src/ssg/game/art/core/view';
import {libraryScene} from '../../src/ssg/game/scenes/library';
import {drawLibrary} from '../../src/ssg/game/scenes/library/scene';
import {laundromatScene} from '../../src/ssg/game/scenes/laundromat';
import {drawLaundromat} from '../../src/ssg/game/scenes/laundromat/scene';
import {SceneModel} from '../../src/ssg/game/engine/model';
import type {EngineDraw} from '../../src/ssg/game/engine/host';
import {lightAt} from '../../src/ssg/game/world/light';
function recorder(){const paints:unknown[][]=[],values:Record<string,unknown>={globalAlpha:1,lineWidth:1,font:'',getTransform:()=>({a:2}),measureText:(s:string)=>({width:s.length*6})},stack:Record<string,unknown>[]=[];let gradient=0,path:unknown[][]=[];const ctx=new Proxy(values,{get(t,k:string){if(k in t)return t[k];if(k==='save')return()=>stack.push({...t});if(k==='restore')return()=>{const last=stack.pop();if(last){Object.keys(t).forEach(k=>delete t[k]);Object.assign(t,last);}};if(k.startsWith('create'))return(...args:unknown[])=>{const g={gradient:++gradient,args,stops:[] as unknown[][],addColorStop(...stop:unknown[]){g.stops.push(stop);}};return g;};return(...args:unknown[])=>{if(k==='beginPath')path=[];if(['moveTo','lineTo','arc','ellipse','quadraticCurveTo','bezierCurveTo','closePath'].includes(k))path.push([k,...args]);if(['fillRect','strokeRect','fill','stroke','fillText','drawImage'].includes(k)){const stroke=k.startsWith('stroke');paints.push([k,...args,...(['fill','stroke'].includes(k)?[structuredClone(path)]:[]),{style:t[stroke?'strokeStyle':'fillStyle'],alpha:t.globalAlpha,...(stroke?{width:t.lineWidth}:{}),...(k==='fillText'?{font:t.font,align:t.textAlign,baseline:t.textBaseline}:{} )}]);}};},set(t,k:string,v){t[k]=v;return true;}}) as unknown as CanvasRenderingContext2D;return{ctx,paints};}

(globalThis as any).document={createElement:()=>{const r=recorder();return{width:0,height:0,paint:r.paints,getContext:()=>r.ctx};}};
const plain=(v:unknown)=>JSON.stringify(v,(_key,value)=>typeof value==='function'?undefined:value);
let cases=0;
for(const [factory,canonical]of [[libraryScene,drawLibrary],[laundromatScene,drawLaundromat]] as const){const scene=factory(),model=new SceneModel({say:()=>{},open:()=>{},changed:()=>{}},scene.data!,scene.rules as import('../../src/ssg/game/engine/rules').SceneRules);model.setPaused(true);model.now=()=>1000;const engine={m:model,hover:null,layer:'all'} as unknown as EngineDraw;
 for(const [w,h,cam,t,min]of [[640,360,0,0,0],[960,540,200,137,580],[1280,720,500,300,1100],[400,900,440,198,1200]]){const v={...frameView(t,lightAt(1,min,scene.facing??0,null,false)),cam,gy:h-60,t,viewW:w,viewH:h,flags:{},sx:(x:number,p=1)=>x-cam*p+w/2,y:(height:number)=>h-60-height};const a=recorder(),b=recorder();canonical(a.ctx,v,engine);scene.drawBackdrop!(b.ctx,v,engine);assert.equal(plain(b.paints),plain(a.paints),scene.id+' native actor paint changed');cases++;}
 model.reset();model.setPaused(true);
}
console.log('Authored actor paint PASS: '+cases+' exact native paint transcripts, including nested character canvases, across camera/time/light/height cases.');
