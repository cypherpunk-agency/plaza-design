import {appearanceText,textField} from '../../src/ssg/game/art/core/fields';
import {fixedGeometry} from '../../src/ssg/game/art/core/spatial';
import assert from 'node:assert/strict';
import {art,drawComposition,type ChunkDocument} from '../../src/ssg/game/art';
import {frameView,type View} from '../../src/ssg/game/art/core/view';
import {renderWorldFrame} from '../../src/ssg/game/runtime/render-scene';
import {lightAt} from '../../src/ssg/game/world/light';
import {validateBackdrop,type BackdropDocument} from '../../src/ssg/game/world/backdrops';
import type {SceneDef} from '../../src/ssg/game/scenes/kit';
const painted:{id:string;x:number;h:number;clipped:boolean}[]=[];let clip=0;const stack:number[]=[];
const ctx:any=new Proxy({save(){stack.push(clip);},restore(){clip=stack.pop()??0;},clip(){clip++;},getTransform(){return {a:1,b:0,c:0,d:1,e:0,f:0};},setTransform(){},fillRect(){},beginPath(){},rect(){}},{get:(o,k)=>k in o?(o as any)[k]:()=>{}});
art.register({type:'check.seam-piece',version:1,label:'test',category:'test',parts:['backdrop'],coordinates:'world',fields:{name:appearanceText(textField('Name'))},spatial:fixedGeometry('Fixture draws a fixed marker'),bounds:()=>({x:0,h:10,w:20,tall:10}),anchors:()=>({}),draw(_x,v,p,_state,_pass,at){painted.push({id:String(p.name),x:v.sx(at.x),h:v.y(at.h),clipped:clip>0});}});
const composition=(id:string):ChunkDocument=>({version:1,scene:id,instances:[{id:'ground',type:'check.seam-piece',props:{name:id+'-ground'},placement:{x:0,h:0},order:0,layer:'distance'},{id:'overhang',type:'check.seam-piece',props:{name:id+'-overhang'},placement:{x:350,h:0},order:1,layer:'set'}]});
const backdrop:BackdropDocument={version:1,scene:'backdrop-review',instances:[{id:'landmark',type:'check.seam-piece',props:{name:'landmark'},placement:{x:300,h:50,parallax:.3},order:0,layer:'distance'}]};validateBackdrop(backdrop,'review');
const scene=(id:string,x:number,h=0):SceneDef=>({id,name:id,width:400,spawn:20,exits:[],intro:[],backdrop:{id:'review',x,h},drawBackdrop(x,v){drawComposition(x,art,composition(id),{view:v,state:{}},'backdrop');}});
const A=scene('a',0),B=scene('b',400),L=lightAt(1,1140,180,null),view=(cam:number,gy=300):View=>({...frameView(0,L),cam,gy,viewW:600,viewH:400,sx:(x,p=1)=>x-cam*p,y:h=>gy-h});
const host=(s:SceneDef)=>({visionOn:false,model:{spots:()=>[]} as any,draw:(x:any,v:View)=>s.drawBackdrop(x,v,{} as any)});
function draw(s:SceneDef,v:View,other:SceneDef,ov:View){painted.length=0;renderWorldFrame({context:ctx,scale:1,view:v,scene:s,sceneId:s.id,host:host(s),joined:[{view:ov,scene:other,sceneId:other.id,host:host(other),lighting:()=>L}],reduced:false,clock:0,weather:()=>null as any,lighting:()=>L,backdrops:new Map([['review',backdrop]]),director:{rendering:{id:'fixture-direction',rendering:{sky:false,weather:false,casters:false,actors:false,shade:false,grade:false,lights:false,prompts:false,bubbles:false,vision:false}}}});return structuredClone(painted);}
const before=draw(A,view(250),B,view(-150)),after=draw(B,view(-150),A,view(250));
assert.equal(before.filter(p=>p.id==='landmark').length,1,'shared backdrop paints once');assert.deepEqual(after.find(p=>p.id==='landmark'),before.find(p=>p.id==='landmark'),'floating-origin crossing preserves backdrop position');
for(const p of before){if(p.id.endsWith('-ground'))assert(p.clipped,p.id);else assert(!p.clipped,p.id+' must overhang without a zone clip');}
const raised=scene('raised',-100,160);const upper=draw(raised,view(350,140),A,view(250,300));assert.deepEqual(upper.find(p=>p.id==='landmark'),before.find(p=>p.id==='landmark'),'raised zone shares the same world backdrop height');
assert.equal(stack.length,0,'canvas saves balance');
console.log('Shared backdrop once, floating origin, raised seam and unclipped set rows PASS');
