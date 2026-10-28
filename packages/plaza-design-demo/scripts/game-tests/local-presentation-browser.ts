/** Bounded native pixel checks for local post-effects. Uses the production renderer and light kernel. */
import {renderWorldFrame} from '../../src/ssg/game/runtime/render-scene';
import {frameView,type View} from '../../src/ssg/game/art/core/view';
import {lightAt} from '../../src/ssg/game/world/light';
import {drawGrade,addLight} from '../../src/ssg/game/art/atmosphere/lighting';
import type {SceneDef} from '../../src/ssg/game/scenes/kit';
const results:{case:string;ok:boolean}[]=[],L=lightAt(1,1080,270,null,true),base='#183350';
const equal=(a:Uint8ClampedArray,b:Uint8ClampedArray)=>a.every((n,i)=>n===b[i]);
const pixel=(canvas:HTMLCanvasElement,x:number,y:number)=>canvas.getContext('2d')!.getImageData(x,y,1,1).data;
const make=()=>{const c=document.createElement('canvas');c.width=240;c.height=120;return c;};
const reference=make(),rx=reference.getContext('2d')!;rx.fillStyle=base;rx.fillRect(0,0,240,120);
const raw=pixel(reference,0,0);drawGrade(rx,{...frameView(0,L),viewW:240,viewH:120},L);const graded=pixel(reference,0,0);
function picture({offset=120,rightGrade=false,camera=false,light=false,rightLights=true}:{offset?:number;rightGrade?:boolean;camera?:boolean;light?:boolean;rightLights?:boolean}={}){
 const canvas=make(),ctx=canvas.getContext('2d')!;
 const view=(at:number):View=>({...frameView(0,L),viewW:240,viewH:120,gy:100,cam:-at,sx:x=>x+at,y:h=>100-h,...(camera?{cameraFrame:{x:40,y:20,view:{...frameView(0,L),viewW:120,viewH:80,gy:80,cam:40-at,sx:x=>x+at-40,y:h=>80-h}}}:{})});
 const scene=(id:string,grade:boolean,lights:boolean):SceneDef=>({id,name:id,width:120,spawn:0,exits:[],ambient:{},outdoor:true,rendering:{sky:false,weather:false,casters:false,actors:false,shade:false,grade,lights,prompts:false,bubbles:false,vision:false},drawBackdrop(){}});
 const left=scene('left',true,!light),right=scene('right',rightGrade,rightLights);
 const host=(id:string)=>({model:{spots:()=>[]} as never,visionOn:false,draw:(x:CanvasRenderingContext2D,v:View)=>{x.fillStyle=base;x.fillRect(v.sx(0),30,120,50);if(light&&id==='left')addLight(v,{kind:'head',x:135,h:20,r:40});}});
 const frame=renderWorldFrame({context:ctx,scale:1,view:view(0),scene:left,sceneId:left.id,host:host('left'),joined:[{view:view(offset),scene:right,sceneId:right.id,host:host('right'),lighting:()=>L}],lighting:()=>L,weather:()=>{throw Error('Weather not enabled');},clock:0,reduced:false,capture:true,background:'#101722',backdrops:new Map()});
 document.body.append(canvas);return {canvas,frame};
}
try{
 const adjacent=picture();results.push({case:'Adjacent chunks keep independent grading switches',ok:equal(pixel(adjacent.canvas,30,40),graded)&&equal(pixel(adjacent.canvas,150,40),raw)});
 const overlap=picture({offset:60,rightGrade:true});results.push({case:'Overlapping chunk windows apply one grade',ok:equal(pixel(overlap.canvas,80,40),graded)});
 const off=picture({offset:60,rightGrade:false});results.push({case:'Foreground overlapping chunk can disable grading',ok:equal(pixel(off.canvas,80,40),raw)&&equal(pixel(off.canvas,30,40),graded)});
 const workspace=picture({camera:true});results.push({case:'Independent workspace outside game camera is not graded',ok:equal(pixel(workspace.canvas,30,40),raw)&&equal(pixel(workspace.canvas,60,40),graded)&&equal(pixel(workspace.canvas,60,5),new Uint8ClampedArray([16,23,34,255]))});
 const crossing=picture({light:true}),unlit=picture({light:true,rightLights:false});results.push({case:'Crossing light follows current region, independent of disabled source',ok:!equal(pixel(crossing.canvas,137,80),pixel(unlit.canvas,137,80))});
 results.push({case:'Inspection consumes resolved native setting and typed source',ok:adjacent.frame.inspection!.find(s=>s.scene.id==='right')!.rendering.values.grade===false&&adjacent.frame.inspection!.find(s=>s.scene.id==='right')!.rendering.sources.grade.kind==='chunk'});
}catch(error){results.push({case:String(error),ok:false});}
document.querySelector('pre')!.textContent=JSON.stringify(results,null,2);
(window as any).localPresentationResults=results;
