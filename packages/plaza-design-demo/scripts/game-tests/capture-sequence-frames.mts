/**
 * Effective paint of the cutscenes (intro, act2) and the taxi flight, as the game plays them and as the editor's
 * sequence preview shows them, at several times per sequence. Prints one hash per frame (canonical paint: the
 * effective draw commands with their absolute transform, alpha, clip and style, so equivalent save/restore and
 * transform nesting compare equal). Run it before and after a change to the frame path and diff the output:
 *   npx tsx scripts/game-tests/capture-sequence-frames.mts > before.txt
 * Leading opaque full-screen black fills are dropped (the one frame clears first, and the skyline's own first piece is
 * the same black fill: repeated, they paint the same pixels).
 */
import {createHash} from 'node:crypto';
import {canonicalPaint} from './canonical-paint.mts';
function recorder(){const commands:unknown[][]=[];let gradient=0;const stack:Record<string,unknown>[]=[];const values:Record<string,unknown>={globalAlpha:1,lineWidth:1,font:'',imageSmoothingEnabled:true,getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),measureText:(text:string)=>({width:String(text).length*6}),getImageData:(_x:number,_y:number,w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h})};
 const ctx=new Proxy(values,{get(t,k:string){if(k in t)return t[k];if(k==='save')return()=>{stack.push({...t});commands.push(['save']);};if(k==='restore')return()=>{const r=stack.pop();if(!r)throw new Error('Unbalanced restore');Object.keys(t).forEach(key=>delete t[key]);Object.assign(t,r);commands.push(['restore']);};if(k==='createLinearGradient'||k==='createRadialGradient'||k==='createPattern')return(...args:unknown[])=>{const id=++gradient;commands.push([k,...args,id]);return{id,addColorStop:(...a:unknown[])=>commands.push(['stop',id,...a]),setTransform:()=>{}};};return(...args:unknown[])=>{commands.push([k,...args]);};},set(t,k:string,value){t[k]=value;commands.push(['set',k,value]);return true;}});
 return{ctx:ctx as unknown as CanvasRenderingContext2D,commands};}
(globalThis as any).document??={createElement:()=>{const rec=recorder();return{width:0,height:0,getContext:()=>rec.ctx,style:{}};},fonts:{load:async()=>[],ready:Promise.resolve()},documentElement:{classList:{add(){},remove(){},toggle(){}}}};
performance.now=()=>1000;
const {lightAt}=await import('../../src/ssg/game/world/light.ts');
const {CutscenePlay,CUTSCENES}=await import('../../src/ssg/game/story/cutscenes/index.ts');
const {drawFlight}=await import('../../src/ssg/game/story/cutscenes/taxi.ts');
const {createSequencePreview}=await import('../../src/ssg/game/authoring/sequence-preview.ts');
const {art}=await import('../../src/ssg/game/art/index.ts');
const {cinematicDocuments}=await import('../../src/ssg/game/story/cutscenes/documents.ts');

const round=(v:unknown):unknown=>typeof v==='number'?Math.round(v*1000)/1000:Array.isArray(v)?v.map(round):v&&typeof v==='object'?Object.fromEntries(Object.entries(v as object).map(([k,x])=>[k,round(x)])):v;
export function paintHash(commands:unknown[][],W:number,H:number,k:number){
 const paints=canonicalPaint(commands) as any[];
 const clear=(p:any)=>p&&p[0]==='fillRect'&&p[1]===0&&p[2]===0&&p[3]===W&&p[4]===H&&p[5]?.style==='#000'&&p[5].alpha===1&&!p[5].clip&&p[5].matrix.join()===[k,0,0,k,0,0].join();
 while(clear(paints[0]))paints.shift();
 return createHash('sha1').update(JSON.stringify(round(paints))).digest('hex').slice(0,16)+' ('+paints.length+' paints)';
}
const L=lightAt(1,580,90,null);
/** OLD=1: the frame paths before the move onto renderWorldFrame (the caller set the transform and cleared). */
const OLD=!!process.env.OLD;
const sizes=[{W:640,H:360,k:2},{W:390,H:844,k:1}];
const lines:string[]=[];
for(const {W,H,k} of sizes){
 // the game's cutscene playback: every frame from 0 (the intro's packets advance with the frames), recorded at the marks
 for(const id of ['intro','act2'] as const)for(const reduced of [false,true]){
  const scene=id==='intro'?(await import('../../src/ssg/game/story/cutscenes/index.ts')).createCutscenes(cinematicDocuments).intro:CUTSCENES[id];
  const play=new CutscenePlay(scene,{reduced,touch:false}),marks=id==='intro'?[0,1,5,12.5,20,25.5]:[0,1,3,6.5,9,15.5];
  for(let frame=0;frame<=Math.round(scene.duration*60);frame++){
   const t=frame/60,mark=marks.find(m=>Math.abs(m-t)<1e-9);
   const r=recorder();play.t=t;if(OLD)r.ctx.setTransform(k,0,0,k,0,0);play.draw(r.ctx,W,H,L,k);
   if(mark!==undefined)lines.push(`play ${id} ${W}x${H} reduced=${reduced} t=${mark}: ${paintHash(r.commands,W,H,k)}`);
  }
 }
 // the game's taxi flight
 for(const progress of [0,0.1,0.5,0.9,1]){const r=recorder();flight(r.ctx,W,H,k,progress,1234+progress*200,'DOWNTOWN');lines.push(`flight ${W}x${H} f=${progress}: ${paintHash(r.commands,W,H,k)}`);}
 // the editor's sequence preview (seeks: the intro's packets are replayed deterministically)
 const preview=createSequencePreview(art);
 for(const id of ['intro','act2','taxi'] as const)for(const time of id==='taxi'?[0,1,2.5]:[0,2,7,14]){
  const r=recorder(),composition=cinematicDocuments.compositions['sequence-'+id];
  preview.render({width:W*k,height:H*k,getContext:()=>r.ctx} as unknown as HTMLCanvasElement,{composition,time,reduced:false,overlays:false,lighting:L,environment:{renderScale:k,ambientClock:time*60,destination:'DOWNTOWN'}} as any);
  lines.push(`preview ${id} ${W}x${H} t=${time}: ${paintHash(r.commands,W,H,k)}`);
 }
}
/** What the game does for a flight frame. */
function flight(x:CanvasRenderingContext2D,W:number,H:number,k:number,progress:number,ambient:number,dest:string){
 x.imageSmoothingEnabled=false;
 if(OLD){x.setTransform(k,0,0,k,0,0);x.fillStyle='#000';x.fillRect(0,0,W,H);}
 drawFlight(x,W,H,progress,ambient,dest,L,cinematicDocuments,k);
}
console.log(lines.join('\n'));
