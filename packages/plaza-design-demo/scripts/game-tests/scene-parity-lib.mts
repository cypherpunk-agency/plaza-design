/**
 * Scene parity: a fingerprint of everything a scene gives the game (its compiled content: exits,
 * spawn, uses, readables, rests, people, devices, lights, environment) and of what it paints, in
 * several views. Recorded from the scene as built by its own code before a migration
 * (scene-parity-record.mts), compared after (check-scene-parity.mts), so a move to the shared
 * declared path is proven to change nothing.
 */
import {createHash} from 'node:crypto';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {emptyData} from '../../src/ssg/game/engine/empty-data';
import {newSave} from '../../src/ssg/game/runtime/save';
import {referenceView} from './reference-view';
import type {SceneDef} from '../../src/ssg/game/scenes/kit';
import type {View} from '../../src/ssg/game/art/core/view';

/** The views a scene is painted in: camera at the start, the middle and the end; two times; two screen sizes; with and without the end flag. */
export const PARITY_CASES=[
 {id:'start',cam:0,t:0,gy:180,viewW:640,end:false},
 {id:'middle-night',cam:.5,t:4321,gy:420,viewW:1280,end:false},
 {id:'end',cam:1,t:137,gy:260,viewW:960,end:true},
 {id:'phone',cam:.25,t:900,gy:520,viewW:390,end:false},
 {id:'wide-late',cam:.75,t:20000,gy:300,viewW:1600,end:true},
] as const;

function recording(){const ops:unknown[]=[],values:Record<string,unknown>={canvas:{width:1600,height:900}},gradient={addColorStop(...args:unknown[]){ops.push(['stop',...args]);}};
 const ctx=new Proxy(values,{get(o,k){if(k==='getTransform')return()=>({a:1,b:0,c:0,d:1,e:0,f:0});if(k==='measureText')return(s:string)=>({width:String(s).length*5});if(k==='createLinearGradient'||k==='createRadialGradient'||k==='createConicGradient')return(...a:unknown[])=>{ops.push([k,...a]);return gradient;};if(k==='createPattern')return()=>gradient;if(k==='getImageData')return()=>({data:new Uint8ClampedArray(4)});if(k in o)return o[String(k)];return(...a:unknown[])=>{ops.push([k,...a]);};},set(o,k,v){o[String(k)]=v;ops.push(['set',k,v===gradient?'gradient':v]);return true;}}) as unknown as CanvasRenderingContext2D;
 return{ctx,ops};}
// scene time stands still (a clock's next beat, a deadline's progress), so every run paints the same
performance.now=()=>1000;
// offscreen sprites (cached canvases) draw into their own recordings; the drawImage that places them is what counts
(globalThis as Record<string,unknown>).document??={createElement(){const r=recording();return{width:0,height:0,style:{},getContext(){return r.ctx;}};}};
const round=(v:unknown):unknown=>typeof v==='number'?Math.round(v*1000)/1000:Array.isArray(v)?v.map(round):v&&typeof v==='object'?Object.fromEntries(Object.entries(v as object).map(([k,x])=>[k,round(x)])):v;
const hash=(v:unknown)=>createHash('sha1').update(JSON.stringify(round(v))??'undefined').digest('hex').slice(0,16);
/** JSON of a value with functions as their arity (a scene's hooks show up as present or not). */
function plain(v:unknown,seen=new WeakSet<object>()):unknown{
 if(typeof v==='function')return '[fn/'+v.length+']';
 if(!v||typeof v!=='object')return typeof v==='number'?Math.round(v*1000)/1000:v;
 if(seen.has(v))return '[cycle]';seen.add(v);
 if(Array.isArray(v))return v.map(x=>plain(x,seen));
 return Object.fromEntries(Object.keys(v).sort().map(k=>[k,plain((v as Record<string,unknown>)[k],seen)]));
}
const player=new Proxy({save:()=>newSave()} as Record<string,unknown>,{get(o,k){return k in o?o[k as string]:()=>undefined;}});
function modelFor(scene:SceneDef){
 const rules=typeof scene.rules==='function'?scene.rules(player as never):scene.rules??{effects:{}};
 return new SceneModel({say(){},changed(){},open(){}} as never,scene.data??emptyData(scene.id,scene.name),rules as never,undefined,undefined,undefined,undefined,scene.gameplay);
}
export interface ParitySnapshot{fields:Record<string,string>;paint:Record<string,string>}
/** The fields compared one by one; drawing hooks are compared by what they paint. */
const PAINT_HOOKS=new Set(['drawBackdrop','drawFront','drawActors','visualEnvironment','preparePresentation','artworkFrame']);
export function sceneSnapshot(scene:SceneDef,detail?:Record<string,unknown>):ParitySnapshot{
 const fields:Record<string,string>={};
 for(const key of Object.keys(scene).sort()){if(PAINT_HOOKS.has(key))continue;const value=plain((scene as unknown as Record<string,unknown>)[key]);fields[key]=hash(value);if(detail)detail['field:'+key]=value;}
 const paint:Record<string,string>={},m=modelFor(scene);
 for(const c of PARITY_CASES){
  const cam=Math.max(0,(scene.width-c.viewW)*c.cam),view:View=referenceView({sx:(wx:number,p=1)=>Math.round(wx-cam*p),y:(h:number)=>c.gy-h,t:c.t,cam,gy:c.gy,viewW:c.viewW,viewH:c.gy+90,flags:{end:c.end}});
  const engine={m,hover:null,layer:'all' as const},{ctx,ops}=recording();
  try{scene.preparePresentation?.(view,engine);scene.drawBackdrop(ctx,view,engine);ops.push('--front--');scene.drawFront?.(ctx,view);ops.push('--actors--');scene.drawActors?.(ctx,view);ops.push('--frame--');const f=scene.artworkFrame;f?.city?.(ctx,view);f?.street?.(ctx,view,.5,true);if(f?.reflections)ops.push(['reflections',f.reflections]);}catch(e){ops.push('error:'+(e as Error).message);}
  paint[c.id]=hash(ops);if(detail)detail['paint:'+c.id]=ops;
 }
 return{fields,paint};
}
export function compareSnapshots(want:ParitySnapshot,got:ParitySnapshot):string[]{
 const out:string[]=[];
 // rules that change nothing are the same as none (the engine falls back to NO_RULES)
 const noRules=new Set([{effects:{}},{effects:{},needs:{devices:[]}}].map(r=>hash(plain(r))));
 for(const k of new Set([...Object.keys(want.fields),...Object.keys(got.fields)]))if(want.fields[k]!==got.fields[k]&&!(k==='rules'&&noRules.has(want.fields[k]??got.fields[k])&&!(k in want.fields&&k in got.fields)))out.push('field '+k+(k in want.fields?k in got.fields?' differs':' missing':' added'));
 for(const k of Object.keys(want.paint))if(want.paint[k]!==got.paint[k])out.push('paint '+k+' differs');
 return out;
}
