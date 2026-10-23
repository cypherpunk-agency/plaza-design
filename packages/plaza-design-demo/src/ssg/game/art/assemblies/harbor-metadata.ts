/** Physical bounds for port machinery and furniture, using the same explicit visual snapshots. */
import type {Anchor,Bounds,Element,Properties} from '../core/composition';
import {frameView,type View} from '../core/view';
import {GANTRIES} from '../machinery/crane';
import {CH,type Crate} from '../props/containers';
import {HZ} from '../environment/harbor-distance';
import {rng} from '../core/primitives';
import {stallBox} from './construction';
import {HARBOR_FLOCK,droneGullAt,type HarborLayout,type HarborVisual} from './harbor-pier';
import {flockRects} from '../characters/flock';
import type {PreparedCharacter} from '../../runtime/characters';
import {screenBounds} from './static-bounds';
import {harborHutSize} from './harbor-fields';
type Rect={x:number;y:number;w:number;h:number};
const n=(p:Properties,k:string)=>Number(p[k]??0);
const union=(rows:Rect[]):Rect=>{if(!rows.length)return{x:0,y:0,w:0,h:0};const x=Math.min(...rows.map(r=>r.x)),y=Math.min(...rows.map(r=>r.y));return{x,y,w:Math.max(...rows.map(r=>r.x+r.w))-x,h:Math.max(...rows.map(r=>r.y+r.h))-y};};
const fallbackView=()=>({...frameView(0),viewW:640,viewH:360,gy:300,y:(h:number)=>300-h});
type Inputs={p:Properties;s:Properties;v:View;L:HarborLayout;vis:HarborVisual;x:number;h:number};
type Geometry=(a:Inputs)=>Rect;
const rect=(v:View,wx:number,h:number,w:number,tall:number,dx=0,par=1):Rect=>({x:v.sx(wx,par)+dx,y:v.y(h),w,h:Math.max(tall,v.y(h-tall)-v.y(h))});
const at=(dx:number,h:number,w:number,tall=h):Geometry=>a=>rect(a.v,a.x,a.h+h,w,tall,dx);
const origin:Anchor={x:0,h:0,role:'origin'};
function stallBounds(a:Inputs,tea:boolean):Rect{
 const spec=tea?a.L.drinks:a.L.fish,seed=tea?34:31,shape=stallBox({x:spec.x,w:spec.w,seed}),signWidth=(tea?10:4)*8*.64+12,fullWidth=Math.max(spec.w+16,signWidth),r=rect(a.v,spec.x,shape.awning+22,fullWidth,shape.awning+22,(spec.w-fullWidth)/2);
 const pose=a.s[tea?'teaPose':'fishPose'] as unknown as PreparedCharacter|undefined;
 if(!pose?.visible)return r;
 return union([r,{x:a.v.sx(pose.frame.x)-24,y:a.v.y(pose.height),w:48,h:Math.max(1,a.v.y(pose.character.h??0)-a.v.y(pose.height))}]);
}
export function applyHarborMetadata(elements:Element[],root:(method:string,L:HarborLayout,p:Properties)=>{x:number;h:number}):void{
 const get=(id:string)=>elements.find(e=>e.type==='harbor.'+id)!;
 const shapes:Record<string,Geometry>={
  drawLampBoat:a=>{const v=a.v,bob=Math.round(Math.sin(v.t*.03));return{x:v.sx(1650,.3)-22,y:v.y(56)-24+bob,w:44,h:25};},
  drawPatrol:a=>{const v=a.v,u=v.t%2600;if(u>1700)return{x:0,y:0,w:0,h:0};return{x:v.sx(-500+u/1700*3600,.5)-67,y:v.y(46)-43+Math.round(Math.sin(v.t*.05)),w:138,h:45};},
  drawFerry:a=>({x:a.v.sx((a.v.t*.16)%2600-400,.45)-97,y:a.v.y(34)-50,w:194,h:51}),
  archChassis:a=>rect(a.v,a.L.arch.x0+11,12,136,13,-4),
  archScan:a=>rect(a.v,a.L.arch.x0+11,14+CH,132,CH+2,-2),
  archPortal:a=>{const A=a.L.arch,w=a.v.sx(A.x1)-a.v.sx(A.x0);return rect(a.v,A.x0,Math.max(100,A.h+44),Math.max(w+46,128),Math.max(100,A.h+44),-10);},
  drawTerminalGate:at(-30,100,60),
  craneFrame:a=>{const c=a.L.cranes[n(a.p,'index')],g=GANTRIES[c.id],left=Math.min(g.boom.x0,...g.stays.map(q=>q[0]),...g.legs.map(q=>q+g.wheel[0]))-1,right=Math.max(g.boom.x1,...g.stays.map(q=>q[0]),...g.legs.map(q=>q+g.wheel[0]+g.wheel[1]))+1,top=Math.max(g.apex.h+4,g.house.h,...g.lights.map(q=>q[1]+q[2]));return{x:a.v.sx(c.x)+left,y:a.v.y(0)-top,w:right-left,h:top+1};},
  craneCabBack:a=>{const c=a.vis.cranes[n(a.p,'index')];return union([rect(a.v,c.twx,194,20,9,-10),rect(a.v,c.twx,188,26,30,-44)]);},
  craneCabFront:a=>{const c=a.vis.cranes[n(a.p,'index')];return rect(a.v,c.twx,184,20,17,-41);},
  craneCables:a=>{const c=a.vis.cranes[n(a.p,'index')],top=Math.max(188,c.hang+4),bottom=Math.min(188,c.hang);return{x:a.v.sx(c.twx)-66,y:a.v.y(top)-1,w:132,h:Math.max(4,a.v.y(bottom)-a.v.y(top)+2)};},
  craneLoad:a=>{const ci=n(a.p,'index'),c=a.vis.cranes[ci],load=(a.s.loads as unknown as Crate[])[ci];if(c.carry){const height=load?.h??CH;return rect(a.v,c.twx-64+(load?.dx??0),c.hang-CH+height,load?.w??n(a.p,'width'),height);}return c.u>360&&c.u<600?rect(a.v,c.twx,c.hang+14,6,10,-3):{x:0,y:0,w:0,h:0};},
  craneLight:a=>{const c=a.L.cranes[n(a.p,'index')];return{x:a.v.sx(c.x)-6,y:a.v.y(170)+8,w:12,h:4};},
  denInside:at(0,CH+2,128),denTable:at(52,23,26),denDoors:at(-10,CH+14,148,CH+14),denLamp:at(144,86,13),
  bondedContainers:a=>union([rect(a.v,a.L.ghost,CH,128,CH),rect(a.v,a.L.ghost+12,CH*2,66,CH)]),
  ghostMark:a=>rect(a.v,a.L.ghost,CH-2,85,CH+2,9),
  bondedFence:a=>{const F=a.L.fence,left=Math.min(a.v.sx(F.x0)-2,a.v.sx(F.gate)-4),right=Math.max(a.v.sx(F.x1)+40,a.v.sx(F.gate)+82);return{x:left,y:a.v.y(104),w:right-left,h:Math.max(104,a.v.y(0)-a.v.y(104))};},
  forkliftBody:a=>{const f=a.vis.forklift;return rect(a.v,f.x,46,64,47,f.dir>0?-24:-40);},
  forkliftRoof:a=>rect(a.v,a.vis.forklift.x,60,28,43,-15),
  fishStall:a=>stallBounds(a,false),teaStall:a=>stallBounds(a,true),
  farSky:a=>({x:0,y:0,w:a.v.viewW,h:Math.max(0,a.v.y(HZ)+1)}),
  horizon:a=>({x:0,y:a.v.y(HZ)-45,w:a.v.viewW,h:48}),
  water:a=>({x:0,y:a.v.y(HZ),w:a.v.viewW,h:Math.max(0,a.v.y(0)-a.v.y(HZ)+1)}),
  flyingGulls:a=>union(flockRects(a.v,HARBOR_FLOCK)),
  pierSlab:a=>({x:0,y:a.v.y(6),w:a.v.viewW,h:6}),metroDoor:at(-30,70,60),noticePost:at(-26,72,52),podium:at(-11,44,22),manifest:at(-15,46,30,26),callBox:at(-8,62,16),
  crates:a=>{const r=rng(41*19+3),rows:Rect[]=[];let x=1112;for(let i=0;i<2;i++){r();const w=16+Math.round(r()*8),h=12+Math.round(r()*8),stack=r()<.4;rows.push(rect(a.v,x,h,w,h));if(stack){const offset=Math.round((r()-.5)*6);rows.push(rect(a.v,x,2*h,w-4,h,offset));}x+=w+2;}return union(rows);},bollard:at(-7,12,14),
  rod:a=>{const reach=n(a.p,'reach'),v=a.v,top=v.y(a.h+34)-1,bottom=v.gy+30+Math.sin(v.t*.03+a.x)*3+2;return{x:v.sx(a.x)-1,y:Math.min(top,bottom),w:Math.max(0,reach+8),h:Math.abs(bottom-top)};},
  fishingBox:at(0,8,12),berthSign:at(-24,104,48),taxi:at(-46,110,120),ferryNotice:at(-37,96,79),rails:at(-1,25,78),beacon:at(-3,116,7),portCamera:at(-3,13,16,16),
  droneGull:a=>{const g=droneGullAt(a.v.t);return{x:Math.round(a.v.sx(g.x,.95))-7,y:Math.round(a.v.y(g.h))-5,w:14,h:7};},
  nearWater:a=>({x:0,y:a.v.gy,w:a.v.viewW,h:Math.max(0,a.v.viewH-a.v.gy)}),
  frontBollard:a=>({x:a.v.sx(a.x,1.3)-14,y:a.v.gy+15,w:135,h:32}),
  container:a=>rect(a.v,a.x,a.h+n(a.p,'height'),n(a.p,'width'),n(a.p,'height')),
 };
 for(const e of elements){const id=e.type.slice(7);if(id==='marker'){e.parts=[];continue;}
  if(id==='hutBack'||id==='hutFront'){
   e.bounds=(p,s)=>{const{w,h}=harborHutSize(p,s);if(id==='hutBack'){const top=Math.max(60,h);return{x:0,h:top,w:Math.max(68,w),tall:top};}const top=Math.max(59,h+4),bottom=Math.min(34,h-1);return{x:-4,h:top,w:Math.max(72,w+8),tall:top-bottom};};
   continue;
  }
  const shape=shapes[id];if(!shape)throw new Error('Missing harbor metadata: '+id);
  e.bounds=(p,s,c)=>{
   const v=c?.view??fallbackView(),a=c?.placement??{x:0,h:0,scale:1,facing:1,parallax:1},L=s.layout as unknown as HarborLayout,vis=s.visual as unknown as HarborVisual;
   let base=id==='container'?{x:a.x,h:a.h}:root(id,L,p);
   const positions:Record<string,[number,number]>={drawLampBoat:[1650,56],drawFerry:[0,34],drawPatrol:[0,46],crates:[1112,0],fishingBox:[2112,0],portCamera:[156,136],droneGull:[1460,128],forkliftBody:[n(s,'forkliftOrigin'),0],forkliftRoof:[n(s,'forkliftOrigin'),0]};
   if(positions[id])base={x:positions[id][0],h:positions[id][1]};
   const dx=a.x-base.x,dh=a.h-base.h,shift=!['bollard','frontBollard','rod','container'].includes(id),V=shift?{...v,sx:(x:number,par=1)=>v.sx(x+dx,par),y:(h:number)=>v.y(h+dh),gy:v.gy-dh}:v;
   const r=shape({p,s,v:V,L,vis,x:shift?base.x:a.x,h:shift?base.h:a.h}),fallback:Bounds={x:r.x-v.sx(a.x),h:v.y(a.h)-r.y,w:Math.max(0,r.w),tall:Math.max(0,r.h)};
   return screenBounds(c,{...r,w:Math.max(0,r.w),h:Math.max(0,r.h)},fallback);
  };
 }
 const anchors:Record<string,Record<string,Anchor>>={denTable:{table:{x:65,h:20,role:'surface'}},denInside:{floor:{x:64,h:0,role:'surface'},shelf:{x:106,h:CH-12,role:'surface'}},denDoors:{door:{x:0,h:0,role:'entrance'}},denLamp:{lamp:{x:150,h:82,role:'mount'}},metroDoor:{door:{x:0,h:0,role:'entrance'}},drawTerminalGate:{door:{x:0,h:0,role:'entrance'}},callBox:{screen:{x:0,h:43,role:'surface'}},podium:{screen:{x:0,h:37,role:'surface'}},noticePost:{notice:{x:0,h:57,role:'surface'}},manifest:{notice:{x:0,h:33,role:'surface'}},berthSign:{sign:{x:0,h:96,role:'mount'}},beacon:{lamp:{x:0,h:113,role:'mount'}},bollard:{rope:{x:0,h:12,role:'mount'}},rails:{rail:{x:38,h:24,role:'surface'}},taxi:{pad:{x:8,h:5,role:'surface'},call:{x:-31,h:47,role:'handle'}},forkliftRoof:{roof:{x:0,h:56,role:'surface'}}};
 for(const[id,points]of Object.entries(anchors))get(id).anchors=()=>({origin,...points});
 get('container').anchors=p=>({origin,top:{x:n(p,'width')/2,h:n(p,'height'),role:'surface'},left:{x:0,h:0,role:'origin'},right:{x:n(p,'width'),h:0,role:'origin'}});
 for(const id of ['fishStall','teaStall'])get(id).anchors=(_p,s)=>{const L=s.layout as unknown as HarborLayout|undefined,tea=id==='teaStall',w=(tea?L?.drinks.w:L?.fish.w)??0,shape=stallBox({x:0,w,seed:tea?34:31});return{origin,counter:{x:w/2,h:shape.counter,role:'surface'},awning:{x:w/2,h:shape.awning,role:'mount'}};};
 for(const id of ['hutBack','hutFront'])get(id).anchors=(p,s)=>{const{w,h}=harborHutSize(p,s);return{origin,window:{x:54,h:48,role:'surface'},roof:{x:w/2,h:h+4,role:'surface'}};};
 for(const id of ['craneFrame','craneCabBack','craneCabFront','craneCables','craneLoad','craneLight'])get(id).anchors=(p,s):Record<string,Anchor>=>{
  const L=s.layout as unknown as HarborLayout|undefined,vis=s.visual as unknown as HarborVisual|undefined,ci=n(p,'index'),base=L?.cranes[ci]?.x??0,c=vis?.cranes[ci],dx=(c?.twx??base)-base;
  if(id==='craneFrame')return{origin,rail:{x:0,h:0,role:'surface'},boom:{x:0,h:206,role:'mount'}};
  if(id==='craneLight')return{origin,lamp:{x:0,h:160,role:'mount'}};
  if(id==='craneLoad')return{origin,top:{x:dx+64,h:(c?.hang??0)+CH,role:'surface'}};
  if(id==='craneCables')return{origin,hook:{x:dx,h:c?.hang??0,role:'mount'}};
  return{origin,cab:{x:dx-31,h:170,role:'surface'}};
 };
 get('forkliftBody').anchors=(_p,s)=>{const vis=s.visual as unknown as HarborVisual|undefined,dx=(vis?.forklift.x??0)-n(s,'forkliftOrigin'),dir=vis?.forklift.dir??1;return{origin,forks:{x:dx+dir*31,h:6,role:'surface'},driver:{x:dx,h:18,role:'surface'}};};
}
