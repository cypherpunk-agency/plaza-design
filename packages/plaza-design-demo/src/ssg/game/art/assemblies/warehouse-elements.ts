/** Warehouse kits retain their original native paint operations and explicit placements. */
import type { Bounds, Element, Field, Placement, Properties } from '../core/composition';
import type { View } from '../core/view';
import { box, O, sign, text } from '../core/primitives';
import { camera, taped, ticker } from '../signage/screens';
import { ALARM } from '../signage/kit';
import { drawWarehousePiece } from './warehouse';
const num=(label:string,value=0,min=-10000):Field=>({kind:'number',label,default:value,min,max:10000,step:1});
const str=(label:string,value=''):Field=>({kind:'string',label,default:value});
const n=(p:Properties,key:string)=>Number(p[key]);
const origin={x:0,h:0,role:'origin' as const};
type Paint=(x:CanvasRenderingContext2D,v:View,p:Properties,at:Required<Placement>)=>void;
const rectangle=(w:number,h:number,x=0,bottom=0):Bounds=>({x,h,w,tall:h-bottom});
function item(type:string,label:string,category:string,fields:Record<string,Field>,bounds:(p:Properties)=>Bounds,paint?:Paint):Element {
  return {type:'warehouse.'+type,version:1,label,category,coordinates:'world',fields,parts:['backdrop'],bounds,anchors:p=>({origin,topLeft:{x:0,h:n(p,'height')||0,role:'surface'},seat:{x:0,h:n(p,'height')||0,role:'surface'},shadow:{x:n(p,'width')/2||0,h:46,role:'mount'}}),
    draw(x,v,p,_state,_pass,at){if(paint){paint(x,v,p,at);return;}const local:View={...v,sx:(wx,depth=at.parallax)=>v.sx(wx+at.x,depth),y:h=>v.y(h+at.h),gy:v.gy-at.h};drawWarehousePiece(type,x,local,p);}};
}
const silent:Paint=()=>{};
export const warehouseElements:Element[]=[
  item('marker','Warehouse gameplay marker','markers',{role:str('Role'),width:num('Scene width'),facing:num('Facing degrees',270)},()=>rectangle(14,24,-7),silent),
  item('city','Distant city behind the stacks','environment',{},()=>rectangle(1200,110)),
  item('crane','Distant STS crane silhouette','machinery',{},()=>rectangle(360,220)),
  item('spire','Spire antenna silhouette','architecture',{},()=>rectangle(22,266,-10,40)),
  item('stack','Container silhouette','environment',{height:num('Height',60,1)},p=>rectangle(64,n(p,'height'))),
  item('wall','Corrugated warehouse and gable','architecture',{width:num('Width',740,1),height:num('Wall height',240,1)},p=>rectangle(n(p,'width'),n(p,'height')+50)),
  item('label','Painted warehouse lettering','signage',{text:str('Text'),color:str('Canvas color','rgba(255,217,165,.5)'),size:num('Font size',16,1),weight:{kind:'select',label:'Font weight',default:'700',options:['400','500','600','700']}},p=>rectangle(String(p.text).length*n(p,'size')*.65,n(p,'size'),-String(p.text).length*n(p,'size')*.325,-4),(x,v,p,at)=>text(x,String(p.text),v.sx(at.x),v.y(at.h),String(p.color),n(p,'size'),String(p.weight))),
  item('office','Lit office window and clerk lamp','architecture',{},()=>rectangle(30,0,0,-22)),
  item('dark-window','Unlit warehouse window','architecture',{},()=>rectangle(30,0,0,-22)),
  item('camera','Warehouse surveillance camera','electronics',{direction:{kind:'select',label:'Direction',default:1,options:[1,-1]},phase:num('Sweep phase',21)},()=>rectangle(48,12,-24,-12),(x,v,p,at)=>camera(x,v,{x:at.x,h:at.h,facing:n(p,'direction') as 1|-1,phase:n(p,'phase')})),
  item('passage','Lane back to the stacks','architecture',{},()=>rectangle(48,78,-24)),
  item('dock','Loading dock and warning stripe','architecture',{width:num('Dock width',250,1),height:num('Dock height',16,1)},p=>rectangle(n(p,'width'),n(p,'height'))),
  item('roller','Sealed warehouse roller door','architecture',{number:{kind:'select',label:'Dock number',default:1,options:[1,2]}},()=>rectangle(120,104,-10)),
  item('door','Personnel door and warrant reader','architecture',{},()=>rectangle(65,90,-30)),
  item('plaque','Evidence custody plaque','signage',{},()=>rectangle(52,72,-26,42)),
  item('notice','Registry custody notice','signage',{},()=>rectangle(100,92,-50)),
  item('ticker','Evidence intake ticker','signage',{text:str('Text'),width:num('Width',110,1),speed:num('Scroll speed',.3)},p=>rectangle(n(p,'width'),10,-n(p,'width')/2),(x,v,p,at)=>ticker(x,v,{x:at.x,h:at.h,w:n(p,'width'),tall:10,mount:'wall',text:String(p.text),col:ALARM,speed:n(p,'speed')})),
  item('van','Registry evidence van','vehicles',{width:num('Van width',120,60)},p=>rectangle(n(p,'width'),44,-n(p,'width')/2)),
  item('shoe','Single tagged shoe','props',{},()=>rectangle(26,12,-6)),
  item('taped','Mender paper notice','signage',{lines:{kind:'json',label:'Notice lines',default:['NETS MENDED','ASK INSIDE',"(DON'T)"],validate:value=>{if(!Array.isArray(value)||value.some(v=>typeof v!=='string'))throw new Error('Expected notice text lines');}},tilt:num('Tilt radians',.04)},()=>rectangle(90,14,-45,-28),(x,v,p,at)=>taped(x,v,{x:at.x,h:at.h,text:p.lines as string[],tilt:n(p,'tilt')})),
  item('crate','Mender wooden crate','props',{width:num('Crate width',20,1),height:num('Crate height',10,1)},p=>rectangle(n(p,'width'),n(p,'height'),-n(p,'width')/2),(x,v,p,at)=>box(x,v.sx(at.x)-n(p,'width')/2,v.y(at.h+n(p,'height')),n(p,'width'),n(p,'height'),'#4a3420','rgba(255,190,110,.4)')),
  item('neon','No-entry warning sign','signage',{text:str('Text','NO ENTRY'),size:num('Font size',7,1),phase:num('Flicker phase',12)},p=>rectangle(String(p.text).length*n(p,'size')*.7,n(p,'size'),-String(p.text).length*n(p,'size')*.35,-4),(x,v,p,at)=>sign(x,v.t,String(p.text),v.sx(at.x),v.y(at.h),O,{size:n(p,'size'),phase:n(p,'phase')})),
  item('floor','Forecourt floor and parking marks','surfaces',{from:num('Parking stripe start',600),to:num('Parking stripe end',820)},()=>rectangle(900,0,0,-100)),
  item('light','Attached warehouse light','atmosphere',{kind:{kind:'select',label:'Light kind',default:'lamp',options:['lamp','window']},width:num('Window width'),height:num('Window height'),radius:num('Radius',40,1),color:str('Optional RGB'),alpha:num('Optional alpha',-1,-1)},p=>rectangle(n(p,'radius')*2,n(p,'radius'),-n(p,'radius'),-n(p,'radius')),silent),
  item('caster','Van shadow marker','atmosphere',{},()=>rectangle(12,12,-6),silent),
];
