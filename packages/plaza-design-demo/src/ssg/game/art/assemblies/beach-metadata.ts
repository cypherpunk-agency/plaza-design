/** Selection geometry follows the native beach pieces; ambient glows are not furniture bounds. */
import type {Anchor,Bounds,Element,Properties} from '../core/composition';
import {frameView,type View} from '../core/view';
import {screenBounds} from './static-bounds';
type Rect={x:number;y:number;w:number;h:number};
const n=(p:Properties,k:string)=>Number(p[k]??0);
const hash=(n:number)=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
const union=(rows:Rect[]):Rect=>{if(!rows.length)return{x:0,y:0,w:0,h:0};const x=Math.min(...rows.map(r=>r.x)),y=Math.min(...rows.map(r=>r.y));return{x,y,w:Math.max(...rows.map(r=>r.x+r.w))-x,h:Math.max(...rows.map(r=>r.y+r.h))-y};};
const fallbackView=()=>({...frameView(0),viewW:640,viewH:360,gy:300,y:(h:number)=>300-h});
type Geometry=(p:Properties,s:Properties,v:View,x:number,h:number)=>Rect;
const origin:Anchor={x:0,h:0,role:'origin'};
/** A local pixel rectangle, for artwork placed with canvas translation rather than View.y. */
const pixels=(x:number,h:number,w:number,tall:number):Geometry=>(_p,_s,v,wx,wh)=>({x:v.sx(wx)+x,y:v.y(wh)-h,w,h:tall});
/** Native world height above the authored foot, followed by pixel-size details. */
const body=(x:number,h:number,w:number,tall:number):Geometry=>(_p,_s,v,wx,wh)=>({x:v.sx(wx)+x,y:v.y(wh+h),w,h:Math.max(tall,v.y(wh+h-tall)-v.y(wh+h))});
export function applyBeachMetadata(elements:Element[]):void{
 const get=(id:string)=>elements.find(e=>e.type==='beach.'+id)!;
 const shapes:Record<string,Geometry>={
  marker:(p,_s,v,x,h)=>({x:v.sx(x),y:v.y(h+n(p,'height')),w:n(p,'width'),h:n(p,'height')}),
  light:(p,_s,v,x,h)=>{const r=n(p,'radius');return{x:v.sx(x)-r,y:v.y(h)-r,w:Math.max(r*2,n(p,'width')),h:Math.max(r*2,n(p,'lightHeight'))};},
  sky:(_p,s,v,_x,h)=>({x:0,y:0,w:v.viewW,h:Math.max(0,v.y(h+n(s,'horizon'))+1)}),
  city:(_p,s,v,_x,h)=>({x:0,y:v.y(h+n(s,'horizon'))-48,w:v.viewW,h:50}),
  sea:(_p,s,v,_x,h)=>({x:0,y:v.y(h+n(s,'horizon')),w:v.viewW,h:Math.max(0,v.y(h+n(s,'waterline'))-v.y(h+n(s,'horizon'))+1)}),
  shore:(_p,s,v,_x,h)=>({x:0,y:v.y(h+n(s,'waterline'))-4,w:v.viewW,h:Math.max(0,v.gy-h-v.y(h+n(s,'waterline'))+4)}),
  foreground:(_p,_s,v,_x,h)=>({x:0,y:v.gy-h,w:v.viewW,h:Math.max(60,v.viewH-v.gy+h)}),
  buoy:(_p,_s,v,x,h)=>({x:v.sx(x,.55)-3,y:v.y(h)+Math.round(Math.sin(v.t*.05)*1.2)-12,w:6,h:12}),
  surfing:(_p,s,v,x,h)=>{const top=v.y(h+n(s,'horizon')),height=v.y(h+n(s,'waterline'))-top,c=v.sx(x+Math.sin(v.t*.004)*220,.6),y=Math.round(top+height*.62*.62)-1,face=Math.cos(v.t*.004)>0?1:-1;return union([{x:c-5,y:y-8,w:10,h:9},{x:c-10*face-4,y:y+1,w:10,h:1}]);},
  swimmer:(p,s,v,x,h)=>{if(s.danger)return{x:0,y:0,w:0,h:0};const d=n(p,'depth'),i=n(p,'phase'),top=v.y(h+n(s,'horizon')),height=v.y(h+n(s,'waterline'))-top,c=v.sx(x+Math.sin(v.t*.006+i)*12,.45+d*.4),y=Math.round(top+height*d*d)+Math.round(Math.sin(v.t*.04+i*2));return{x:c-4,y:y-4,w:8,h:7};},
  gulls:(_p,_s,v,_x,h)=>union(Array.from({length:7},(_,i)=>{const r=hash(i+50),cx=r*1600+Math.sin(v.t*.004+i)*120-v.cam*(.3+r*.5),x=((cx%1700)+1700)%1700-100,s=r>.6?2:1;return{x:x-5*s,y:Math.round(v.y(h+130+hash(i+70)*80)+Math.sin(v.t*.02+i*2)*8)-2,w:11*s,h:5};}).filter(r=>r.x+r.w>=-10&&r.x<=v.viewW+10)),
  stairs:body(-200,108,400,108),
  boardwalk:(p,_s,v,x,h)=>({x:v.sx(x),y:v.y(h+4),w:v.sx(x+n(p,'width'))-v.sx(x),h:6}),
  'public-notice':body(-66,96,135,96),sunbed:pixels(-32,53,48,53),kiosk:body(-40,76,80,76),
  'bar-under':(_p,s,v,x,h)=>({x:v.sx(x)+4,y:v.y(h)-64,w:Math.max(153,n(s,'barWidth')-5)-4,h:64}),
  'bar-back':(_p,s,v,x,h)=>({x:v.sx(x)+8,y:v.y(h)-62,w:Math.max(0,n(s,'barWidth')-16),h:34}),
  'bar-shell':(_p,s,v,x,h)=>({x:v.sx(x)-16,y:v.y(h)-134,w:n(s,'barWidth')+32,h:134}),
  'bar-counter':(_p,s,v,x,h)=>({x:v.sx(x)+2,y:v.y(h)-26,w:Math.max(0,n(s,'barWidth')-4),h:26}),
  'bar-lights':(_p,s,v,x,h)=>({x:v.sx(x)-41,y:v.y(h)-99,w:n(s,'barWidth')+89,h:99}),
  'bar-photo':body(-4,58,8,9),lime:pixels(-14,65,36,48),menu:body(-35,64,70,30),'bar-stool':body(-5,16,10,16),jukebox:body(-13,72,31,72),
  mixer:(_p,s,v,x,h)=>{const rect={x:v.sx(x)-11,y:v.y(h+52),w:22,h:26};return s.freeDrink?union([rect,{x:v.sx(n(s,'drinkX'))-2,y:v.y(33+n(s,'drinkH')),w:6,h:7}]):rect;},
  crab:(_p,_s,v,x,h)=>({x:v.sx(x+Math.sin(v.t*.01)*10)-6,y:v.y(h+6),w:12,h:6}),
  tower:body(-31,130,55,131),drone:(_p,_s,v,x,h)=>({x:v.sx(x)-15,y:v.y(h+124)+Math.round(Math.sin(v.t*.06)*2)-1,w:30,h:10}),
  volleyball:body(-39,92,78,92),castle:body(-49,32,80,32),board:body(-3,50,6,50),
  boat:(_p,_s,v,x,h)=>({x:v.sx(x)-77,y:v.y(h)+Math.round(Math.sin(v.t*.03)*1.5)-89,w:142,h:90}),
  'pier-deck':(p,_s,v,x,h)=>({x:v.sx(x),y:v.y(h+24),w:Math.max(v.sx(x+n(p,'width'))-v.sx(x),v.sx(x+n(p,'railingLength'))-v.sx(x)+1),h:Math.max(v.y(h+3)+6,v.y(h)+v.viewH-v.gy+h)-v.y(h+24)}),
  'pier-lamp':body(-3,60,6,60),'pier-controller':body(-9,36,18,36),'berth-sign':body(-34,44,68,44),
  rod:(_p,s,v,x,h)=>{const top=Math.max(52,n(s,'waterline')+6),bottom=Math.min(0,n(s,'waterline')+1);return{x:v.sx(x)-5,y:v.y(h+top)-1,w:63,h:v.y(h+bottom)-v.y(h+top)+2};},
  'post-gull':(_p,s,v,x,h)=>{const since=v.t-n(s,'gullShooed');if(since>=600)return{x:v.sx(x)-4,y:v.y(h+39),w:11,h:39};const f=since/600,out=f<.5?f*2:2-f*2,gx=v.sx(x)+out*160,gy=v.y(h+32+out*90);return union([{x:v.sx(x)-3,y:v.y(h+30),w:6,h:30},{x:Math.round(gx)-5,y:Math.round(gy)-2,w:11,h:4}]);},
 };
 for(const e of elements){const id=e.type.slice(6),shape=shapes[id];if(!shape)throw new Error('Missing beach metadata: '+id);e.bounds=(p,s,c)=>{
  const v=c?.view??fallbackView(),at=c?.placement??{x:0,h:0,scale:1,facing:1,parallax:1},r=shape(p,s,v,at.x,at.h);
  const fallback:Bounds={x:r.x-v.sx(at.x),h:v.y(at.h)-r.y,w:Math.max(0,r.w),tall:Math.max(0,r.h)};
  return screenBounds(c,{...r,w:Math.max(0,r.w),h:Math.max(0,r.h)},fallback);
 };}
 const anchors:Record<string,Record<string,Anchor>>={sunbed:{seat:{x:0,h:10,role:'surface'},parasol:{x:-12,h:52,role:'mount'}},'bar-stool':{seat:{x:0,h:16,role:'surface'}},'bar-counter':{counter:{x:0,h:26,role:'surface'}},'bar-back':{shelf:{x:12,h:49,role:'surface'}},'bar-shell':{floor:{x:0,h:64,role:'surface'},roof:{x:0,h:134,role:'surface'}},kiosk:{screen:{x:0,h:37,role:'surface'},reader:{x:0,h:23,role:'handle'}},mixer:{screen:{x:0,h:37,role:'surface'}},jukebox:{controls:{x:0,h:16,role:'handle'}},tower:{platform:{x:0,h:60,role:'surface'},roof:{x:0,h:108,role:'surface'}},'pier-controller':{screen:{x:0,h:29,role:'surface'}},'pier-lamp':{lamp:{x:0,h:57,role:'mount'}},stairs:{promenade:{x:0,h:64,role:'surface'},entrance:{x:34,h:64,role:'entrance'}},boat:{hatch:{x:-1,h:38,role:'entrance'}},'bar-photo':{photo:{x:0,h:54,role:'surface'}}};
 for(const[id,points]of Object.entries(anchors))get(id).anchors=()=>({origin,...points});
 for(const id of ['marker','light']){get(id).parts=[];get(id).category=id==='marker'?'markers':'atmosphere';}
}
