/** Physical selection geometry for the market kit. Light wash and reflections are excluded. */
import type {Bounds,BoundsContext,AssetDefinition,Properties} from '../core/composition';
import {DESIGN_TOP,rng,type Tower} from '../core/primitives';
import {screenBounds} from './static-bounds';
const box=(x:number,h:number,w:number,tall=h):Bounds=>({x,h,w,tall});
const number=(p:Properties,key:string)=>Number(p[key]);
/** Native kit dimensions are pixels, even when a scene view changes its y projection. */
function physical(c:BoundsContext|undefined,b:Bounds,parallax=1):Bounds{
 if(!c)return b;
 const {view:v,placement:a}=c;
 return screenBounds(c,{x:v.sx(a.x,parallax)+b.x,y:v.y(a.h)-b.h,w:b.w,h:b.tall},b);
}
function clutterBounds(p:Properties):Bounds{
 const r=rng(number(p,'seed')*19+3),kinds=p.kinds as string[];
 let at=0,left=0,right=0,top=0,bottom=0;
 const include=(x:number,h:number,w:number,tall=h)=>{left=Math.min(left,x);right=Math.max(right,x+w);top=Math.max(top,h);bottom=Math.min(bottom,h-tall);};
 for(let i=0;i<number(p,'count');i++){
  const kind=kinds[Math.floor(r()*kinds.length)];
  if(kind==='crate'){
   const w=16+Math.round(r()*8),h=12+Math.round(r()*8),stack=r()<.4;
   include(at,h,w);if(stack){const offset=Math.round((r()-.5)*6);include(at+offset,h*2,w-4,h);}at+=w+2;
  }else if(kind==='barrel'){r();include(at,18,12);at+=15;}
  else if(kind==='box'){const w=10+Math.round(r()*10),h=8+Math.round(r()*8);include(at,h,w);at+=w+1;}
  else if(kind==='bag'){r();include(at-1,11,16);at+=15;}
  else{include(at-1,9,18,10);at+=16;}
 }
 return box(left,top,right-left,top-bottom);
}
function lampBounds(p:Properties):Bounds{
 const r=rng(number(p,'seed')*29+7),h=90+Math.round(r()*20);r();const arm=r()<.5?1:-1;
 const left=Math.min(-4,arm*12-5),right=Math.max(5,arm*12+5);
 return box(left,h,right-left);
}
function mounted(p:Properties,c?:BoundsContext):Bounds{
 const w=number(p,'w'),tall=number(p,'tall'),pole=p.mount==='pole';
 if(!c)return box(-w/2-2,tall+2,w+7,tall+2+(pole?2:15));
 const {view:v,placement:a}=c,cx=v.sx(a.x,Number(p.parallax??1)),top=Math.round(v.y(a.h+tall)),left=Math.round(cx-w/2)-2;
 const bottom=pole?Math.max(top+tall+2,v.y(0)):top+tall+15;
 return screenBounds(c,{x:left,y:top-2,w:w+7,h:bottom-top+2},box(-w/2-2,tall+2,w+7,tall+17));
}
export function applyMarketMetadata(elements:AssetDefinition[],far:readonly Tower[]):void{
 const find=(id:string)=>elements.find(e=>e.type==='market.'+id)!;
 const fixed:Record<string,(p:Properties)=>Bounds>={
  door:()=>box(-30,70,60),lamp:lampBounds,laundry:p=>box(Math.min(0,number(p,'doorOffset')-16),116,Math.max(number(p,'width'),number(p,'doorOffset')+15)-Math.min(0,number(p,'doorOffset')-16)),
  rules:()=>box(-22,78,44,30),stool:()=>box(-7,10,14),clutter:clutterBounds,bin:()=>box(0,26,26),
  'end-wall':p=>box(0,130,number(p,'width')),
 };
 for(const [id,geometry] of Object.entries(fixed))find(id).bounds=(p,_s,c)=>physical(c,geometry(p));
 for(const id of ['ticker','wanted','ad','registry','odds','score']){
  const e=find(id);e.bounds=(p,_s,c)=>mounted(p,c);
  e.anchors=p=>({origin:{x:0,h:0,role:'origin'},screen:{x:0,h:number(p,'tall')/2,role:'surface'},top:{x:0,h:number(p,'tall'),role:'mount'}});
 }
 find('camera').bounds=(p,_s,c)=>physical(c,number(p,'facing')<0?box(-14,13,17,16):box(-3,13,16,16),number(p,'parallax'));
 find('camera').anchors=()=>({origin:{x:0,h:0,role:'mount'},lens:{x:0,h:8,role:'surface'}});
 find('blade').bounds=(p,_s,c)=>physical(c,box(-16,0,25,String(p.text).length*11+8),number(p,'parallax'));
 find('blade').anchors=p=>({origin:{x:0,h:0,role:'mount'},sign:{x:0,h:-(String(p.text).length*11+8)/2,role:'surface'}});
 find('bulbs').bounds=(p,_s,c)=>{
  const w=number(p,'width'),fallback=box(0,151,w,24);
  if(!c)return fallback;
  const {view:v,placement:a}=c,l=v.sx(a.x,.85),right=v.sx(a.x+w,.85);
  return screenBounds(c,{x:l,y:v.y(a.h+150)-1,w:right-l,h:25},fallback);
 };
 find('bulbs').anchors=p=>({origin:{x:0,h:0,role:'origin'},left:{x:0,h:150,role:'mount'},right:{x:number(p,'width'),h:150,role:'mount'}});
 find('stool').anchors=()=>({origin:{x:0,h:0,role:'origin'},seat:{x:0,h:10,role:'surface'}});
 find('laundry').anchors=p=>({origin:{x:0,h:0,role:'origin'},door:{x:number(p,'doorOffset'),h:0,role:'origin'},sign:{x:number(p,'width')/2,h:106,role:'mount'}});
 find('end-wall').anchors=p=>({origin:{x:0,h:0,role:'origin'},door:{x:number(p,'doorOffset'),h:0,role:'origin'},top:{x:number(p,'width')/2,h:130,role:'surface'}});
 find('rules').anchors=()=>({origin:{x:0,h:0,role:'origin'},notice:{x:0,h:63,role:'surface'}});
 find('facade').bounds=(p,_s,c)=>{
  const width=number(p,'width'),fallback=box(0,300,width+2);
  if(!c)return fallback;
  const {view:v,placement:a}=c;
  return screenBounds(c,{x:v.sx(a.x,number(p,'parallax')),y:0,w:width+2,h:Math.max(0,v.y(a.h))},fallback);
 };
 find('facade').anchors=p=>({origin:{x:0,h:0,role:'origin'},street:{x:number(p,'width')/2,h:0,role:'surface'}});
 find('far').bounds=(_p,_s,c)=>{
  const left=Math.min(...far.map(b=>b.x)),right=Math.max(...far.map(b=>b.x+b.w)),height=Math.max(...far.map(b=>b.h));
  const fallback=box(left,height,right-left);
  if(!c)return fallback;
  const v=c.view,grow=Math.round(Math.max(0,v.gy-DESIGN_TOP)*.8),x=Math.min(...far.map(b=>v.sx(b.x,.25))),end=Math.max(...far.map(b=>v.sx(b.x,.25)+b.w));
  return screenBounds(c,{x,y:v.y(0)-height-grow,w:end-x,h:height+grow+1},fallback);
 };
 find('wet-floor').bounds=(_p,_s,c)=>c?screenBounds(c,{x:0,y:c.view.gy,w:c.view.viewW,h:Math.max(0,c.view.viewH-c.view.gy)},box(0,0,640,60)):box(0,0,640,60);
}
