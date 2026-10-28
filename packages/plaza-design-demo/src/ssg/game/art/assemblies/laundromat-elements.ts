import {fixedGeometry} from '../core/spatial';
import {degrees} from "../core/fields";
import {textField,booleanField} from '../core/fields';
import {numericFields} from '../core/fields';
import {rectangleControls} from '../core/spatial';
import {appearanceChoice,appearanceText,semantic,shapeLength} from '../core/fields';
/** Laundromat catalogue. Each furnishing/device and each clipped resident is editable separately. */
import { createLaundromatArtwork, type ArtworkInputs } from './laundromat';
import {drawWashSchedule} from '../electronics/wash-schedule';
import type { Anchor, Bounds, AssetDefinition, Field, Placement, Properties } from '../core/composition';
import type { View } from '../core/view';
import { box, exitDoor, notice } from '../core/primitives';
import { adScreen,camera,taped,ticker } from '../signage/screens';
import { ALARM } from '../signage/kit';
const fixedNativeGeometry=fixedGeometry("This laundromat component has no independently authored size. Its native kernel and prepared source layout determine its geometry. Edit the source layout or Transform rather than stretching its body.");
const num=numericFields({min:-10000,max:10000,step:1});
const str=textField;
const bool=booleanField;
const n=(p:Properties,k:string)=>Number(p[k]);
const origin:Anchor={x:0,h:0,role:'origin'};
const raised=(v:View,h:number):View=>h===0?v:({...v,gy:v.gy-h,y:value=>v.y(value+h)});
export const laundromatVisualFields:Record<string,Field>={hover:str('Hovered device'),tripped:bool('Breaker tripped'),clear:bool('Queue clear'),nextRunning:bool('Schedule running'),nextMs:{...num('Next slot in ms',0),max:1000000000},door3:str('Washer 3 door'),breakerX:num('Breaker position',530),washerXs:{kind:'json',label:'Washer cable targets',default:[290,350,410,470],validate:v=>{if(!Array.isArray(v)||v.length!==4||v.some(x=>typeof x!=='number'||!Number.isFinite(x)))throw new Error('Invalid washer targets');}}};
for(let i=1;i<=4;i++){laundromatVisualFields['w'+i]=str('Washer '+i+' status');laundromatVisualFields['p'+i]=num('Washer '+i+' progress',0);}
function layout():ArtworkInputs['L']{return{door:0,spawn:0,notice:0,soap:0,washers:[0,0,0,0],breaker:0,suds:0,table:{x0:0,x1:60,h:26},folder:0,bench:{x0:0,x1:82,h:10},gran:0,sleeper:0,window:{x0:0,x1:192,h0:40,h1:124},cat:0,socks:0,tubes:[]};}
const cache=new Map<string,ReturnType<typeof createLaundromatArtwork>>();
function kernel(L=layout(),width=880,originX=0,ceiling=150,facing=180){const key=JSON.stringify([L,width,originX,ceiling,facing]);let k=cache.get(key);if(!k){k=createLaundromatArtwork({L,LAUNDROMAT_W:width,LAUNDROMAT_FACING:facing,originX,ceiling});if(cache.size>=2048)cache.clear();cache.set(key,k);}return k;}
type Draw=(x:CanvasRenderingContext2D,v:View,p:Properties,s:Properties,at:Required<Placement>)=>void;
function element(id:string,label:string,category:string,fields:Record<string,Field>,bounds:(p:Properties)=>Bounds,draw:Draw,anchors:(p:Properties)=>Record<string,Anchor>=()=>({origin})):AssetDefinition{return{type:'laundromat.'+id,version:1,label,category,coordinates:'world',libraryUse:!['marker','background','room','floor','conduits','puddle','schedule'].includes(id)?'reusable':undefined,bindingIdentity:'presentation',fields,visualFields:laundromatVisualFields,parts:['backdrop'],bounds,anchors,draw:(x,v,p,s,_pass,at)=>draw(x,v,p,s,at)};}
const rectangle=(w:number,h:number,x=0):Bounds=>({x,h,w,tall:h});
const roomFields={width:shapeLength(num('Width',880,1)),height:shapeLength(num('Ceiling',150,1))};
const windowFields={width:shapeLength(num('Width',192,1)),height:shapeLength(num('Height',84,1)),bearing:semantic(num('Compass bearing',180,0),{"group":"Transform","quantity":"angle","unit":"degrees"})};
function windowKernel(p:Properties,at:Required<Placement>){const L=layout();L.window={x0:at.x,x1:at.x+n(p,'width'),h0:at.h,h1:at.h+n(p,'height')};return kernel(L,undefined,undefined,undefined,n(p,'bearing'));}
export const laundromatElements:AssetDefinition[]=[
{...({...element('marker','Laundromat gameplay marker','markers',{role:semantic(str('Role'),{"group":"Appearance","quantity":"reference","unit":"identifier"})},()=>rectangle(8,8,-4),()=>{}),spatial:fixedNativeGeometry}),parts:[],visualFields:{}},
({...element('background','Laundromat upstairs','architecture',roomFields,p=>rectangle(n(p,'width'),n(p, 'height')),(x,v,p,_s,at)=>{const k=kernel(undefined,n(p,'width'),at.x,n(p, 'height'));k.clear(x,v);k.upstairs(x,raised(v,at.h),v.sx(at.x),v.sx(at.x+n(p,'width')));}), spatial:rectangleControls({width:'width',height:'height'})}),
({...element('room','Tiled shop walls and ceiling','architecture',roomFields,p=>rectangle(n(p,'width'),n(p, 'height')),(x,v,p,_s,at)=>kernel(undefined,n(p,'width'),at.x,n(p, 'height')).room(x,raised(v,at.h))), spatial:rectangleControls({width:'width',height:'height'})}),
({...element('window-back','Market window scenery','architecture',windowFields,p=>rectangle(n(p,'width'),n(p,'height')),(x,v,p,_s,at)=>windowKernel(p,at).frontWindowBack(x,v)), spatial:rectangleControls({width:'width',height:'height'})}),
({...element('window-front','Market window glass, frame and light','architecture',windowFields,p=>rectangle(n(p,'width'),n(p,'height')),(x,v,p,_s,at)=>windowKernel(p,at).frontWindowFront(x,v)), spatial:rectangleControls({width:'width',height:'height'})}),
({...element('tube','Fluorescent tube','electronics',{index:appearanceChoice({kind:'select',label:'Tube number',default:0,options:[0,1,2,3]})},()=>({x:-100,h:4,w:200,tall:150}),(x,v,p,s,at)=>{const i=n(p,'index'),dim=(i===1&&(!!s.tripped||(!!s.nextRunning&&n(s,'nextMs')>23000)))||(i===3&&v.t%260>248);kernel(undefined,undefined,undefined,at.h+2).tube(x,v,at.x,dim);}),spatial:fixedNativeGeometry}),
({...element('ticker','Wash identity information strip','signage',{width:shapeLength(num('Width',300,1)),text:appearanceText(str('Text','WASH CYCLES ARE LOGGED TO YOUR IDENTITY   ·   WATER 40 L PER CYCLE PER ID   ·   UNATTENDED LAUNDRY IS REPORTED AFTER 72 H   ·   ABANDONED PROPERTY IS SCANNED FOR IDENTITY'))},p=>rectangle(n(p,'width'),10),(x,v,p,_s,at)=>ticker(x,v,{x:at.x,h:at.h,w:n(p,'width'),tall:10,text:String(p.text),col:ALARM,speed:.4})), spatial:rectangleControls({width:'width',originX:.5})}),
({...element('advert','Laundromat wall television','electronics',{width:shapeLength(num('Width',70,1)),height:shapeLength(num('Height',22,1))},p=>rectangle(n(p,'width'),n(p,'height')),(x,v,p,_s,at)=>adScreen(x,v,{x:at.x,h:at.h,w:n(p,'width'),tall:n(p,'height'),mount:'wall',ads:[['REGISTRY PREMIUM','PRIORITY SLOTS'],['DETERGENT','TAXED AT SOURCE'],['VERIFIED RESIDENTS','WASH FIRST']],period:260})), spatial:rectangleControls({width:'width',height:'height',originX:.5})}),
({...element('camera','Washer surveillance camera','electronics',{},()=>rectangle(28,16,-14),(x,v,_p,_s,at)=>camera(x,v,{x:at.x,h:at.h,facing:1,phase:7})),spatial:fixedNativeGeometry}),
({...element('dryer','Dead stacked dryer','electronics',{index:appearanceChoice({kind:'select',label:'Dryer number',default:0,options:[0,1,2,3]})},()=>rectangle(46,40,-23),(x,v,p,_s,at)=>kernel().dryer(x,raised(v,at.h-60),at.x,n(p,'index'))),spatial:fixedNativeGeometry}),
({...element('door','Market exit door','architecture',{},()=>rectangle(36,74,-18),(x,v,_p,_s,at)=>exitDoor(x,raised(v,at.h),at.x,'#0a0603','< MARKET'),()=>({origin,entrance:{...origin,role:'entrance'}})),spatial:fixedNativeGeometry}),
({...element('notice','Registry laundry notice','signage',{},()=>({x:-20,h:0,w:40,tall:30}),(x,v,_p,_s,at)=>notice(x,v.t,v.sx(at.x),v.y(at.h),40,30,['REGISTRY','NOTICE'])),spatial:fixedNativeGeometry}),
({...element('soap','Soap dispenser','electronics',{},()=>rectangle(36,88,-18),(x,v,_p,_s,at)=>{const L=layout();L.soap=at.x;kernel(L).soap(x,raised(v,at.h));}),spatial:fixedNativeGeometry}),
{...({...element('schedule','Wash schedule controller','electronics',{},()=>rectangle(54,104,-23),(x,v,_p,s,at)=>drawWashSchedule(x,raised(v,at.h),at.x,s.nextRunning?{ms:n(s,'nextMs')}:null,s.hover==='clock',s.cableConnected?n(s,'cableTo'):null)),spatial:fixedNativeGeometry}),libraryUse:'reusable',
 visualFields:{hover:laundromatVisualFields.hover,nextRunning:laundromatVisualFields.nextRunning,nextMs:laundromatVisualFields.nextMs,cableConnected:bool('Draw cable'),cableTo:num('Cable endpoint X on the same wall',0)},
 bounds(_p,s,c){const target=s.cableConnected?n(s,'cableTo')-(c?.placement.x??0):0,left=Math.min(-23,target),right=Math.max(31,target);return{x:left,h:104,w:right-left,tall:104};}},
({...element('conduits','Breaker washer conduits','electronics',{},()=>rectangle(260,56),(x,v,_p,s,at)=>{const L=layout();L.washers=(s.washerXs as number[]).map(x=>x+at.x);L.breaker=n(s,'breakerX')+at.x;kernel(L).conduits(x,raised(v,at.h),!!s.tripped);}),spatial:fixedNativeGeometry}),
({...element('washer','Working front-load washer','electronics',{index:appearanceChoice({kind:'select',label:'Washer number',default:0,options:[0,1,2,3]})},()=>rectangle(56,54,-28),(x,v,p,s,at)=>{const i=n(p,'index'),L=layout();L.washers[i]=at.x;kernel(L).washer(x,raised(v,at.h),String(s['w'+(i+1)]),String(s.door3),n(s,'p'+(i+1)),i,s.hover==='washer'+(i+1));}),spatial:fixedNativeGeometry}),
({...element('note','Taped washer note','signage',{first:appearanceText(str('First line')),second:appearanceText(str('Second line')),tiltAngle:degrees("Tilt",0,{"min":-572957.7951308233,"max":572957.7951308233,"step":57.29577951308232})},()=>({x:-20,h:0,w:40,tall:24}),(x,v,p,_s,at)=>taped(x,v,{x:at.x,h:at.h,text:[String(p.first),String(p.second)],tilt:(n(p,'tiltAngle')*Math.PI/180)})),spatial:fixedNativeGeometry}),
({...element('breaker','Laundry breaker box','electronics',{},()=>rectangle(32,78,-16),(x,v,_p,s,at)=>{const L=layout();L.breaker=at.x;kernel(L).breaker(x,raised(v,at.h),!!s.tripped,s.hover==='breaker');}),spatial:fixedNativeGeometry}),
({...element('suds','SUDS queue assistant','electronics',{},()=>rectangle(80,80,-40),(x,v,_p,s,at)=>{const L=layout();L.suds=at.x;kernel(L).suds(x,raised(v,at.h),!!s.tripped,!!s.clear,s.hover==='suds');}),spatial:fixedNativeGeometry}),
({...element('table','Folding table and towel','furniture',{width:shapeLength(num('Width',60,1)),height:shapeLength(num('Height',26,4))},p=>rectangle(n(p,'width'),n(p,'height')+12),(x,v,p,_s,at)=>{const L=layout();L.table={x0:at.x,x1:at.x+n(p,'width'),h:n(p,'height')};kernel(L).table(x,raised(v,at.h));},p=>({origin,top:{x:0,h:n(p,'height'),role:'surface'}})), spatial:rectangleControls({width:'width',height:'height'})}),
({...element('bench','Waiting bench','furniture',{width:shapeLength(num('Width',82,1)),height:shapeLength(num('Height',10,4))},p=>rectangle(n(p,'width'),n(p,'height')),(x,v,p,_s,at)=>{const L=layout();L.bench={x0:at.x,x1:at.x+n(p,'width'),h:n(p,'height')};kernel(L).benchUnderWindow(x,raised(v,at.h));},p=>({origin,seat:{x:0,h:n(p,'height'),role:'surface'}})), spatial:rectangleControls({width:'width',height:'height'})}),
({...element('socks','Lost sock board','signage',{},()=>rectangle(36,108,-18),(x,v,_p,_s,at)=>{const L=layout();L.socks=at.x;kernel(L).sockBoard(x,raised(v,at.h));}),spatial:fixedNativeGeometry}),
({...element('floor','Laundromat floor tiles','surfaces',{width:shapeLength(num('Width',880,1))},p=>rectangle(n(p,'width'),0),(x,v,p,_s,at)=>kernel(undefined,n(p,'width'),at.x).floor(x,raised(v,at.h))), spatial:rectangleControls({width:'width'})}),
({...element('puddle','Washer puddle','surfaces',{},()=>({x:0,h:-2,w:120,tall:6}),(x,v,_p,s,at)=>{const xs=s.washerXs as number[];x.fillStyle='rgba(150,190,230,.08)';x.fillRect(v.sx(xs[1]+at.x),v.gy+2-at.h,v.sx(xs[3]+at.x)-v.sx(xs[1]+at.x),6);}),spatial:fixedNativeGeometry}),
({...element('reflection','Tube reflection','surfaces',{},()=>({x:-20,h:-4,w:40,tall:1}),(x,v,_p,_s,at)=>{x.fillStyle='rgba(235,245,255,'+(.06+.03*Math.sin(v.t*.04))+')';x.fillRect(v.sx(at.x)-20,v.gy+4-at.h,40,1);}),spatial:fixedNativeGeometry}),
({...element('drain','Floor drain','props',{},()=>({x:-8,h:-6,w:16,tall:4}),(x,v,_p,_s,at)=>box(x,v.sx(at.x)-8,v.gy+6-at.h,16,4,'#020101','rgba(255,217,165,.2)')),spatial:fixedNativeGeometry}),
];
