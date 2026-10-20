import {drawPreparedActor,validatePreparedActor} from '../characters/prepared-actor';
import type {PreparedActor} from '../../engine/gameplay/actor-frame';
/** Shared platform pieces and specialized station architecture. No element reads transport state. */
import type { Anchor, Bounds, Element, Field, Placement, Properties } from '../core/composition';
import type { View } from '../core/view';
import { box,notice,onScreen,RED,reflect } from '../core/primitives';
import { drawRider,KINDS,type RiderKind } from '../characters/riders';
import { drawPlatformTrain,type PlatformTrainVisual } from '../vehicles/rail';
import { drawDepartures,type DepartureVisual } from '../signage/line-departures';
import { drawBench,drawCam,drawScreen,drawSlab,drawTrackBase,drawTrackEdge,nameplate } from './station-platform';
import { createStationArtwork as galleriaKernels,type StationLayout as GLayout } from './galleria-station';
import { createStationArtwork as harborKernels,type StationLayout as HLayout } from './harbor-station';
const num=(label:string,defaultValue=0,min=-10000,max=10000):Field=>({kind:'number',label,default:defaultValue,min,max,step:1});
const str=(label:string,value=''):Field=>({kind:'string',label,default:value});
const bool=(label:string,value=false):Field=>({kind:'boolean',label,default:value});
const n=(p:Properties,k:string)=>Number(p[k]);
const raised=(v:View,h:number):View=>h===0?v:{...v,gy:v.gy-h,y:q=>v.y(q+h)};
const origin:Anchor={x:0,h:0,role:'origin'};
type Draw=(x:CanvasRenderingContext2D,v:View,p:Properties,s:Properties,at:Required<Placement>)=>void;
function element(type:string,label:string,category:string,fields:Record<string,Field>,bounds:(p:Properties,s:Properties)=>Bounds,draw:Draw,visualFields:Record<string,Field>={}):Element{return{type:'station.'+type,version:1,label,category,bindingIdentity:'presentation',coordinates:'world',fields,visualFields,parts:['backdrop'],bounds,anchors:p=>({origin,top:{x:0,h:Number(p.height??0),role:'surface'},underside:{x:0,h:Number(p.under??0),role:'mount'}}),draw(x,v,p,s,_pass,at){draw(x,v,p,s,at);}};}
const bounds=(w:number,h:number,x=-w/2):Bounds=>({x,h,w,tall:h});
function G(beam={under:0,top:0},frieze={h0:0,h1:0,step:1}){return galleriaKernels({width:0,spawn:0,exit:0,boardAt:0,beam,frieze,posters:[],columns:[],lamps:[],board:0,benches:[],snacks:0,lineMap:0,screen:0,cams:[],waiting:[]} satisfies GLayout);}
function H(width=0,canopy={under:0,fascia:0},horizon=0,wall=0){return harborKernels({width,spawn:0,exit:0,boardAt:0,horizon,wall,canopy,posts:[],lamps:[],cranes:[],board:0,benches:[],tide:0,screen:0,cam:0,checkpoint:0,waiting:[]} satisfies HLayout);}
const train:Field={kind:'json',label:'Current platform train',default:null,validate:v=>{if(v===null)return;const p=v as unknown as PlatformTrainVisual;if(!p||typeof p!=='object'||!Number.isFinite(p.x)||!Number.isFinite(p.open)||p.open<0||p.open>1||typeof p.moving!=='boolean'||!Number.isFinite(p.riderSeed)||typeof p.destination!=='string')throw new Error('Invalid platform train snapshot');}};
const departure:Field={kind:'json',label:'Departure board snapshot',default:{open:true,station:'',destination:'',left:0,due:0,message:''},validate:v=>{const p=v as unknown as DepartureVisual;if(!p||typeof p!=='object'||typeof p.open!=='boolean'||typeof p.station!=='string'||typeof p.destination!=='string'||typeof p.message!=='string'||!Number.isFinite(p.left)||!Number.isFinite(p.due))throw new Error('Invalid departure snapshot');}};
const rider:Field={kind:'json',label:'Waiting passenger snapshot',default:{on:false,kind:'phone',flip:false,phase:0},validate:v=>{const p=v as unknown as {on:boolean;kind:RiderKind;flip:boolean;phase:number};if(!p||typeof p!=='object'||typeof p.on!=='boolean'||!KINDS.includes(p.kind)||typeof p.flip!=='boolean'||!Number.isFinite(p.phase))throw new Error('Invalid waiting rider snapshot');}};
export const stationElements:Element[]=[
 element('marker','Station gameplay marker','markers',{role:str('Role'),width:num('Scene width')},p=>bounds(n(p,'width'),0,0),()=>{}),
 element('background','Platform interior fill','surfaces',{fill:str('Fill','#030201')},()=>bounds(1200,400,0),(x,v,p)=>{x.fillStyle=String(p.fill);x.fillRect(0,0,v.viewW,v.viewH);}),
 element('galleria-wall','Tiled tunnel wall','architecture',{height:num('Wall height',194,1)},p=>bounds(2600,n(p,'height'),0),(x,v,p,_s,at)=>G({under:0,top:n(p,'height')}).drawTiledWall(x,raised(v,at.h))),
 element('poster','Framed advertising poster','signage',{first:str('Headline'),second:str('Second line'),red:bool('Warning red')},()=>bounds(100,100),(x,v,p,_s,at)=>G().drawPoster(x,raised(v,at.h),{x:at.x,lines:[String(p.first),String(p.second)],red:!!p.red})),
 element('frieze','Station tiled name band','architecture',{height:num('Band height',22,1)},p=>bounds(2600,n(p,'height'),0),(x,v,p,_s,at)=>G(undefined,{h0:at.h,h1:at.h+n(p,'height'),step:1}).drawFrieze(x,v)),
 element('nameplate','LINE 0 station name','signage',{name:str('Station name'),alpha:num('Text alpha',0.92,0,1),hang:bool('Hanging rods',true)},()=>bounds(120,20),(x,v,p,s,at)=>nameplate(x,v,v.sx(at.x),at.h,String(p.name),p.hang?n(s,'roof'):undefined,n(p,'alpha')),{roof:num('Roof underside')}),
 element('track-base','Ballast, rails and sleepers','surfaces',{},()=>bounds(2600,14,0),(x,v,_p,_s,at)=>drawTrackBase(x,raised(v,at.h))),
 element('train','Platform train','vehicles',{},()=>bounds(900,100,0),(x,v,_p,s,at)=>drawPlatformTrain(x,raised(v,at.h),s.train as unknown as PlatformTrainVisual|null),{train}),
 element('track-edge','Track yellow edge','surfaces',{},()=>bounds(2600,2,0),(x,v,_p,_s,at)=>drawTrackEdge(x,raised(v,at.h))),
 element('galleria-ceiling','Beam and mall foundations','architecture',{under:num('Beam underside',176,1),top:num('Beam top',194,1)},p=>bounds(2600,n(p,'top')+300,0),(x,v,p,_s,at)=>G({under:n(p,'under'),top:n(p,'top')}).drawCeiling(x,raised(v,at.h))),
 element('strip-lamp','Platform strip lamp and light cone','electronics',{flicker:bool('Intermittent tube')},()=>bounds(80,180),(x,v,p,_s,at)=>G({under:at.h,top:at.h}).drawStripLamp(x,v,at.x,!!p.flicker)),
 element('column','Tiled platform column','architecture',{},()=>bounds(30,190),(x,v,_p,_s,at)=>G({under:at.h,top:at.h}).drawColumn(x,v,at.x)),
 element('camera','Platform camera on bracket','electronics',{flip:bool('Face left')},()=>bounds(48,12),(x,v,p,_s,at)=>drawCam(x,v,at.x,at.h,!!p.flip)),
 element('screen','Hanging Registry display','signage',{phase:num('Display phase')},()=>bounds(120,100),(x,v,p,s,at)=>drawScreen(x,v,at.x,at.h,n(s,'roof'),n(p,'phase')),{roof:num('Roof underside')}),
 element('departures','Hanging departure board','signage',{},()=>bounds(124,42),(x,v,_p,s,at)=>drawDepartures(x,v,s.departure as unknown as DepartureVisual,at.x,at.h,n(s,'roof')),{roof:num('Roof underside'),departure}),
 element('notice-stand','Notice on a platform post','signage',{width:num('Notice width',50,1),height:num('Notice height',30,1),first:str('First line'),second:str('Second line'),phase:num('Phase'),red:bool('Warning tab')},p=>bounds(n(p,'width'),n(p,'height')),(x,v,p,_s,at)=>{const {y,t}=v,s=v.sx(at.x);if(!onScreen(v,s-30,60))return;box(x,s-1,y(44),3,44,'#2a160a');notice(x,t,s,y(at.h),n(p,'width'),n(p,'height'),[String(p.first),String(p.second)],n(p,'phase'));if(p.red){x.fillStyle='rgba('+RED+',.85)';x.fillRect(s-30,y(at.h-3),6,3);}}),
 element('bench','Platform bench and regular','furniture',{who:{kind:'select',label:'Legacy seated regular',default:'',options:['',...KINDS]},sourceRider:bool('Actor source owns rider',false)},()=>bounds(60,48),(x,v,p,s,at)=>drawBench(x,raised(v,at.h),{x:at.x,who:p.who? p.who as RiderKind:undefined},p.sourceRider?()=>{if(s.rider!==null)drawPreparedActor(x,v,s.rider as unknown as PreparedActor,false);}:undefined),{rider:{kind:'json',label:'Source actor in bench',default:null,validate:v=>{if(v!==null)validatePreparedActor(v);}}}),
 element('snacks','Lit snack machine','electronics',{},()=>bounds(80,80),(x,v,_p,_s,at)=>G().drawSnacks(x,raised(v,at.h),at.x)),
 element('waiting-passenger','Waiting platform passenger','characters',{},()=>bounds(32,48),(x,v,_p,s,at)=>{const r=s.rider as unknown as {on:boolean;kind:RiderKind;flip:boolean;phase:number},cx=v.sx(at.x);if(r.on&&onScreen(v,cx-16,32))drawRider(x,r.kind,cx,v.y(at.h),v.t,{flip:r.flip,phase:r.phase});},{rider}),
 element('escalator','Moving escalator to mall','architecture',{},()=>bounds(120,190),(x,v,_p,s,at)=>G({under:n(s,'roof'),top:n(s,'roof')}).drawEscalator(x,raised(v,at.h),at.x),{roof:num('Escalator rise',176)}),
 element('slab','Near platform slab and warning','surfaces',{width:num('Platform width',1200,1),fill:str('Slab color','#0c0907')},()=>bounds(1200,60,0),(x,v,p,_s,at)=>drawSlab(x,raised(v,at.h),n(p,'width'),String(p.fill))),
 element('reflection','Platform lamp floor reflection','atmosphere',{alpha:num('Strength',0.5,0,1),width:num('Width',20,1)},p=>bounds(n(p,'width'),40),(x,v,p,_s,at)=>reflect(x,raised(v,at.h),v.sx(at.x),'255,230,190',n(p,'alpha'),n(p,'width'))),
 element('harbor-horizon','Distant city and horizon glow','environment',{},()=>bounds(2000,150,0),(x,v,_p,_s,at)=>H(0,undefined,at.h).drawHorizon(x,v)),
 element('harbor-crane','Far harbor crane silhouette','machinery',{height:num('Crane height',150,1),phase:num('Warning light phase')},p=>bounds(180,n(p,'height')),(x,v,p,_s,at)=>H(0,undefined,at.h).drawCrane(x,v,at.x,n(p,'height'),n(p,'phase'))),
 element('harbor-water','Sea, reflections and sea wall','environment',{horizon:num('Horizon',62),wall:num('Sea wall',26)},p=>bounds(2600,n(p,'horizon')+80,0),(x,v,p,_s,at)=>H(0,undefined,n(p,'horizon'),n(p,'wall')).drawWater(x,raised(v,at.h))),
 element('harbor-canopy','Corrugated canopy roof','architecture',{width:num('Canopy width',1200,1),under:num('Canopy underside',158,1),top:num('Canopy fascia',168,1)},p=>bounds(n(p,'width')+120,n(p,'top')+4,-60),(x,v,p,_s,at)=>H(n(p,'width'),{under:n(p,'under'),fascia:n(p,'top')}).drawCanopyShell(x,raised(v,at.h))),
 element('canopy-lamp','Harbor canopy lamp and cone','electronics',{},()=>bounds(80,180),(x,v,_p,_s,at)=>H(0,{under:at.h,fascia:at.h}).drawCanopyLamp(x,v,at.x)),
 element('canopy-post','Braced harbor canopy post','architecture',{},()=>bounds(60,180),(x,v,_p,_s,at)=>H(0,{under:at.h,fascia:at.h}).drawCanopyPost(x,v,at.x)),
 element('closed-notice','Closed-platform notice','signage',{width:num('Width',70,1),height:num('Height',32,1),first:str('First line'),second:str('Second line'),phase:num('Phase',2)},p=>bounds(n(p,'width'),n(p,'height')),(x,v,p,s,at)=>{if(!s.closed)return;const cx=v.sx(at.x);if(onScreen(v,cx-40,80))notice(x,v.t,cx,v.y(at.h),n(p,'width'),n(p,'height'),[String(p.first),String(p.second)],n(p,'phase'));},{closed:bool('Harbor closed')}),
 element('pier-gate','Platform pier gate','architecture',{},()=>bounds(120,90),(x,v,_p,_s,at)=>H().drawGate(x,raised(v,at.h),at.x)),
];

for(const element of stationElements)element.bindingChoices=composition=>{
 if(!['metro','galleriaStation','harborStation'].includes(composition.scene))return{};
 const metro=composition.scene==='metro',sources:Record<string,string[]>={train:[metro?'transit.train':'station.train'],departure:[metro?'transit.departure':'station.departure'],roof:[metro?'metro.roof':'station.roof'],...(composition.scene==='harborStation'?{closed:['station.closed']}:{})};
 return Object.fromEntries(Object.keys(element.visualFields??{}).filter(key=>sources[key]).map(key=>[key,sources[key]]));
};
