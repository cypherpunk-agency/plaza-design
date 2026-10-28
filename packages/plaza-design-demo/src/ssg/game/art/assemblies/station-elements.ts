import {appearanceColor,colorField} from '../core/fields';
import {fixedGeometry} from '../core/spatial';
import {rectangleControls,combineControls,verticalRangeControls,viewportElevationControls,repetitionExtentControl} from '../core/spatial';
import {degrees,seconds} from "../core/fields";
import {textField,booleanField} from '../core/fields';
import {appearanceBoolean,appearanceChoice,appearanceText,semantic,shapeLength,shapePosition} from '../core/fields';
import {drawPreparedActor,validatePreparedActor} from '../characters/prepared-actor';
import type {PreparedActor} from '../../engine/gameplay/actor-frame';
/** Shared platform pieces and specialized station architecture. No element reads transport state. */
import type { Anchor, Bounds, AssetDefinition, Field, Placement, Properties } from '../core/composition';
import type { View } from '../core/view';
import { box,notice,onScreen,RED,reflect } from '../core/primitives';
import { drawRider,KINDS,type RiderKind } from '../characters/riders';
import { drawPlatformTrain,type PlatformTrainVisual } from '../vehicles/rail';
import { drawDepartures,type DepartureVisual } from '../signage/line-departures';
import { drawBench,drawCam,drawScreen,drawSlab,drawTrackBase,drawTrackEdge,nameplate } from './station-platform';
import { createStationArtwork as galleriaKernels,type StationLayout as GLayout } from './galleria-station';
import { createStationArtwork as harborKernels,type StationLayout as HLayout } from './harbor-station';
const fixedNativeGeometry=fixedGeometry("This station component has no independently authored size. Its native kernel and prepared source layout determine its geometry. Edit the source layout or Transform rather than stretching its body.");
const num=(label:string,defaultValue=0,min=-10000,max=10000):Field=>({kind:'number',label,default:defaultValue,min,max,step:1});
const str=textField;
const bool=booleanField;
const n=(p:Properties,k:string)=>Number(p[k]);
const raised=(v:View,h:number):View=>h===0?v:{...v,gy:v.gy-h,y:q=>v.y(q+h)};
const origin:Anchor={x:0,h:0,role:'origin'};
type Draw=(x:CanvasRenderingContext2D,v:View,p:Properties,s:Properties,at:Required<Placement>)=>void;
function element(type:string,label:string,category:string,fields:Record<string,Field>,bounds:(p:Properties,s:Properties)=>Bounds,draw:Draw,visualFields:Record<string,Field>={}):AssetDefinition{return{type:'station.'+type,version:1,label,category,bindingIdentity:'presentation',coordinates:'world',fields,visualFields,parts:['backdrop'],bounds,anchors:p=>({origin,top:{x:0,h:Number(p.height??0),role:'surface'},underside:{x:0,h:Number(p.under??0),role:'mount'}}),draw(x,v,p,s,_pass,at){draw(x,v,p,s,at);}};}
const bounds=(w:number,h:number,x=-w/2):Bounds=>({x,h,w,tall:h});
function G(beam={under:0,top:0},frieze={h0:0,h1:0,step:1}){return galleriaKernels({width:0,spawn:0,exit:0,boardAt:0,beam,frieze,posters:[],columns:[],lamps:[],board:0,benches:[],snacks:0,lineMap:0,screen:0,cams:[],waiting:[]} satisfies GLayout);}
function H(width=0,canopy={under:0,fascia:0},horizon=0,wall=0){return harborKernels({width,spawn:0,exit:0,boardAt:0,horizon,wall,canopy,posts:[],lamps:[],cranes:[],board:0,benches:[],tide:0,screen:0,cam:0,checkpoint:0,waiting:[]} satisfies HLayout);}
const train:Field={kind:'json',label:'Current platform train',default:null,validate:v=>{if(v===null)return;const p=v as unknown as PlatformTrainVisual;if(!p||typeof p!=='object'||!Number.isFinite(p.x)||!Number.isFinite(p.open)||p.open<0||p.open>1||typeof p.moving!=='boolean'||!Number.isFinite(p.riderSeed)||typeof p.destination!=='string')throw new Error('Invalid platform train snapshot');}};
const departure:Field={kind:'json',label:'Departure board snapshot',default:{open:true,station:'',destination:'',left:0,due:0,message:''},validate:v=>{const p=v as unknown as DepartureVisual;if(!p||typeof p!=='object'||typeof p.open!=='boolean'||typeof p.station!=='string'||typeof p.destination!=='string'||typeof p.message!=='string'||!Number.isFinite(p.left)||!Number.isFinite(p.due))throw new Error('Invalid departure snapshot');}};
const rider:Field={kind:'json',label:'Waiting passenger snapshot',default:{on:false,kind:'phone',flip:false,phase:0},validate:v=>{const p=v as unknown as {on:boolean;kind:RiderKind;flip:boolean;phase:number};if(!p||typeof p!=='object'||typeof p.on!=='boolean'||!KINDS.includes(p.kind)||typeof p.flip!=='boolean'||!Number.isFinite(p.phase))throw new Error('Invalid waiting rider snapshot');}};
export const stationElements:AssetDefinition[]=[
 element('marker','Station gameplay marker','markers',{role:semantic(str('Role'),{"group":"Appearance","quantity":"reference","unit":"identifier"}),width:shapeLength(num('Scene width'))},p=>bounds(n(p,'width'),0,0),()=>{}),
 ({...element('background','Platform interior fill','surfaces',{fillColor:appearanceColor(colorField('Fill','#030201'))},()=>bounds(1200,400,0),(x,v,p)=>{x.fillStyle=String(p.fillColor);x.fillRect(0,0,v.viewW,v.viewH);}),spatial:fixedNativeGeometry}),
 element('galleria-wall','Tiled tunnel wall','architecture',{height:shapeLength(num('Wall height',194,1))},p=>bounds(2600,n(p,'height'),0),(x,v,p,_s,at)=>G({under:0,top:n(p,'height')}).drawTiledWall(x,raised(v,at.h))),
 ({...element('poster','Framed advertising poster','signage',{first:appearanceText(str('Headline')),second:appearanceText(str('Second line')),red:appearanceBoolean(bool('Warning red'))},()=>bounds(100,100),(x,v,p,_s,at)=>G().drawPoster(x,raised(v,at.h),{x:at.x,lines:[String(p.first),String(p.second)],red:!!p.red})),spatial:fixedNativeGeometry}),
 element('frieze','Station tiled name band','architecture',{height:shapeLength(num('Band height',22,1))},p=>bounds(2600,n(p,'height'),0),(x,v,p,_s,at)=>G(undefined,{h0:at.h,h1:at.h+n(p,'height'),step:1}).drawFrieze(x,v)),
 ({...element('nameplate','LINE 0 station name','signage',{name:appearanceText(str('Station name')),textOpacity:semantic(num('Text alpha',0.92,0,1),{"group":"Visibility & Drawing","quantity":"ratio","unit":"ratio"}),hang:appearanceBoolean(bool('Hanging rods',true))},()=>bounds(120,20),(x,v,p,s,at)=>nameplate(x,v,v.sx(at.x),at.h,String(p.name),p.hang?n(s,'roof'):undefined,n(p,'textOpacity')),{roof:num('Roof underside')}),spatial:fixedNativeGeometry}),
 ({...element('track-base','Ballast, rails and sleepers','surfaces',{},()=>bounds(2600,14,0),(x,v,_p,_s,at)=>drawTrackBase(x,raised(v,at.h))),spatial:fixedNativeGeometry}),
 ({...element('train','Platform train','vehicles',{},()=>bounds(900,100,0),(x,v,_p,s,at)=>drawPlatformTrain(x,raised(v,at.h),s.train as unknown as PlatformTrainVisual|null),{train}),spatial:fixedNativeGeometry}),
 ({...element('track-edge','Track yellow edge','surfaces',{},()=>bounds(2600,2,0),(x,v,_p,_s,at)=>drawTrackEdge(x,raised(v,at.h))),spatial:fixedNativeGeometry}),
 element('galleria-ceiling','Beam and mall foundations','architecture',{under:shapePosition(num('Beam underside',176,1)),top:shapePosition(num('Beam top',194,1))},p=>bounds(2600,n(p,'top')+300,0),(x,v,p,_s,at)=>G({under:n(p,'under'),top:n(p,'top')}).drawCeiling(x,raised(v,at.h))),
 ({...element('strip-lamp','Platform strip lamp and light cone','electronics',{flicker:appearanceBoolean(bool('Intermittent tube'))},()=>bounds(80,180),(x,v,p,_s,at)=>G({under:at.h,top:at.h}).drawStripLamp(x,v,at.x,!!p.flicker)),spatial:fixedNativeGeometry}),
 ({...element('column','Tiled platform column','architecture',{},()=>bounds(30,190),(x,v,_p,_s,at)=>G({under:at.h,top:at.h}).drawColumn(x,v,at.x)),spatial:fixedNativeGeometry}),
 ({...element('camera','Platform camera on bracket','electronics',{mirrored:semantic(bool('Face left'),{"group":"Transform","quantity":"boolean","unit":"boolean"})},()=>bounds(48,12),(x,v,p,_s,at)=>drawCam(x,v,at.x,at.h,!!p.mirrored)),spatial:fixedNativeGeometry}),
 ({...element('screen','Hanging Registry display','signage',{displayTimeOffset:seconds('Display time offset',0,{min:-10000*97/60,max:10000*97/60,step:1/60}),indicatorPhaseAngle:degrees('Indicator phase',0,{group:'Motion',min:-10000*180/Math.PI,max:10000*180/Math.PI,step:1})},()=>bounds(120,100),(x,v,p,s,at)=>drawScreen(x,v,at.x,at.h,n(s,'roof'),n(p,'displayTimeOffset')*60,n(p,'indicatorPhaseAngle')*Math.PI/180),{roof:num('Roof underside')}),spatial:fixedNativeGeometry}),
 ({...element('departures','Hanging departure board','signage',{},()=>bounds(124,42),(x,v,_p,s,at)=>drawDepartures(x,v,s.departure as unknown as DepartureVisual,at.x,at.h,n(s,'roof')),{roof:num('Roof underside'),departure}),spatial:fixedNativeGeometry}),
 element('notice-stand','Notice on a platform post','signage',{width:shapeLength(num('Notice width',50,1)),height:shapeLength(num('Notice height',30,1)),first:appearanceText(str('First line')),second:appearanceText(str('Second line')),highlightPhaseAngle:degrees("Highlight phase",0,{group:'Motion',"min":-572957.7951308233,"max":572957.7951308233,"step":57.29577951308232}),red:appearanceBoolean(bool('Warning tab'))},p=>bounds(n(p,'width'),n(p,'height')),(x,v,p,_s,at)=>{const {y,t}=v,s=v.sx(at.x);if(!onScreen(v,s-30,60))return;box(x,s-1,y(44),3,44,'#2a160a');notice(x,t,s,y(at.h),n(p,'width'),n(p,'height'),[String(p.first),String(p.second)],(n(p,'highlightPhaseAngle')*Math.PI/180));if(p.red){x.fillStyle='rgba('+RED+',.85)';x.fillRect(s-30,y(at.h-3),6,3);}}),
 ({...element('bench','Platform bench and regular','furniture',{who:appearanceChoice({kind:'select',label:'Legacy seated regular',default:'',options:['',...KINDS]}),sourceRider:appearanceBoolean(bool('Actor source owns rider',false))},()=>bounds(60,48),(x,v,p,s,at)=>drawBench(x,raised(v,at.h),{x:at.x,who:p.who? p.who as RiderKind:undefined},p.sourceRider?()=>{if(s.rider!==null)drawPreparedActor(x,v,s.rider as unknown as PreparedActor,false);}:undefined),{rider:{kind:'json',label:'Source actor in bench',default:null,validate:v=>{if(v!==null)validatePreparedActor(v);}}}),spatial:fixedNativeGeometry}),
 ({...element('snacks','Lit snack machine','electronics',{},()=>bounds(80,80),(x,v,_p,_s,at)=>G().drawSnacks(x,raised(v,at.h),at.x)),spatial:fixedNativeGeometry}),
 ({...element('waiting-passenger','Waiting platform passenger','characters',{},()=>bounds(32,48),(x,v,_p,s,at)=>{const r=s.rider as unknown as {on:boolean;kind:RiderKind;flip:boolean;phase:number},cx=v.sx(at.x);if(r.on&&onScreen(v,cx-16,32))drawRider(x,r.kind,cx,v.y(at.h),v.t,{flip:r.flip,phase:r.phase});},{rider}),spatial:fixedNativeGeometry}),
 ({...element('escalator','Moving escalator to mall','architecture',{},()=>bounds(120,190),(x,v,_p,s,at)=>G({under:n(s,'roof'),top:n(s,'roof')}).drawEscalator(x,raised(v,at.h),at.x),{roof:num('Escalator rise',176)}),spatial:fixedNativeGeometry}),
 element('slab','Near platform slab and warning','surfaces',{width:shapeLength(num('Platform width',1200,1)),fillColor:appearanceColor(colorField('Slab color','#0c0907'))},()=>bounds(1200,60,0),(x,v,p,_s,at)=>drawSlab(x,raised(v,at.h),n(p,'width'),String(p.fillColor))),
 element('reflection','Platform lamp floor reflection','atmosphere',{opacity:semantic(num('Strength',0.5,0,1),{"group":"Visibility & Drawing","quantity":"ratio","unit":"ratio"}),width:shapeLength(num('Width',20,1))},p=>bounds(n(p,'width'),40),(x,v,p,_s,at)=>reflect(x,raised(v,at.h),v.sx(at.x),'255,230,190',n(p,'opacity'),n(p,'width'))),
 ({...element('harbor-horizon','Distant city and horizon glow','environment',{},()=>bounds(2000,150,0),(x,v,_p,_s,at)=>H(0,undefined,at.h).drawHorizon(x,v)),spatial:fixedNativeGeometry}),
 element('harbor-crane','Far harbor crane silhouette','machinery',{height:shapeLength(num('Crane height',150,1)),highlightPhaseAngle:degrees("Highlight phase",0,{group:'Motion',"min":-572957.7951308233,"max":572957.7951308233,"step":57.29577951308232})},p=>bounds(180,n(p,'height')),(x,v,p,_s,at)=>H(0,undefined,at.h).drawCrane(x,v,at.x,n(p,'height'),(n(p,'highlightPhaseAngle')*Math.PI/180))),
 element('harbor-water','Sea, reflections and sea wall','environment',{horizon:shapePosition(num('Horizon',62)),wall:shapePosition(num('Sea wall',26))},p=>bounds(2600,n(p,'horizon')+80,0),(x,v,p,_s,at)=>H(0,undefined,n(p,'horizon'),n(p,'wall')).drawWater(x,raised(v,at.h))),
 element('harbor-canopy','Corrugated canopy roof','architecture',{width:shapeLength(num('Canopy width',1200,1)),under:shapePosition(num('Canopy underside',158,1)),top:shapePosition(num('Canopy fascia',168,1))},p=>bounds(n(p,'width')+120,n(p,'top')+4,-60),(x,v,p,_s,at)=>H(n(p,'width'),{under:n(p,'under'),fascia:n(p,'top')}).drawCanopyShell(x,raised(v,at.h))),
 ({...element('canopy-lamp','Harbor canopy lamp and cone','electronics',{},()=>bounds(80,180),(x,v,_p,_s,at)=>H(0,{under:at.h,fascia:at.h}).drawCanopyLamp(x,v,at.x)),spatial:fixedNativeGeometry}),
 ({...element('canopy-post','Braced harbor canopy post','architecture',{},()=>bounds(60,180),(x,v,_p,_s,at)=>H(0,{under:at.h,fascia:at.h}).drawCanopyPost(x,v,at.x)),spatial:fixedNativeGeometry}),
 element('closed-notice','Closed-platform notice','signage',{width:shapeLength(num('Width',70,1)),height:shapeLength(num('Height',32,1)),first:appearanceText(str('First line')),second:appearanceText(str('Second line')),highlightPhaseAngle:degrees("Highlight phase",114.59155902616465,{group:'Motion',"min":-572957.7951308233,"max":572957.7951308233,"step":57.29577951308232})},p=>bounds(n(p,'width'),n(p,'height')),(x,v,p,s,at)=>{if(!s.closed)return;const cx=v.sx(at.x);if(onScreen(v,cx-40,80))notice(x,v.t,cx,v.y(at.h),n(p,'width'),n(p,'height'),[String(p.first),String(p.second)],(n(p,'highlightPhaseAngle')*Math.PI/180));},{closed:bool('Harbor closed')}),
 ({...element('pier-gate','Platform pier gate','architecture',{},()=>bounds(120,90),(x,v,_p,_s,at)=>H().drawGate(x,raised(v,at.h),at.x)),spatial:fixedNativeGeometry}),
];

for(const element of stationElements)element.bindingChoices=composition=>{
 if(!['metro','galleriaStation','harborStation'].includes(composition.scene))return{};
 const sources:Record<string,string[]>={departure:['station.departure'],roof:['station.roof'],...(composition.scene==='harborStation'?{closed:['station.closed']}:{})};
 return Object.fromEntries(Object.keys(element.visualFields??{}).filter(key=>sources[key]).map(key=>[key,sources[key]]));
};

// Individual fittings use local placement; platform spans, route trains and prepared passengers retain context.
for(const e of stationElements)if(['poster','camera','bench','snacks','escalator','reflection','harbor-crane','pier-gate'].includes(e.type.slice(8)))e.libraryUse='reusable';

// Audited local fittings: optional scalar/pose inputs have standalone defaults.
for(const e of stationElements)if(["nameplate", "screen", "departures", "notice-stand", "strip-lamp", "column", "canopy-lamp", "canopy-post"].includes(e.type.slice(8)))e.libraryUse='reusable';

// Bounds include the real suspension/ground span; these fittings' height is their mounting point.
for(const id of ['nameplate','screen','departures','notice-stand','strip-lamp','column','canopy-lamp','canopy-post']){
 const e=stationElements.find(e=>e.type==='station.'+id)!;
 e.bounds=(p,state,context)=>{
  const h=context?.placement.h??0,roof=Number(state.roof??0);
  const span=(x:number,w:number,top:number,bottom:number)=>({x,h:top-h,w,tall:Math.max(0,top-bottom)});
  if(id==='nameplate'){const w=40+String(p.name).length*7;return span(-w/2,w,p.hang?Math.max(h,roof):h,p.hang?Math.min(h-20,roof):h-20);}
  if(id==='departures')return span(-62,124,Math.max(h,roof),Math.min(h-42,roof));
  if(id==='screen')return span(-38,76,Math.max(h,roof),Math.min(h-64,roof));
  if(id==='notice-stand'){const w=Math.max(Number(p.width),p.red?60:0);return span(-w/2,w,Math.max(44,h),Math.min(0,h-Number(p.height)));}
  if(id==='column')return span(-15,30,Math.max(10,h),Math.min(0,h));
  if(id==='canopy-post')return span(-27,54,h+1,Math.min(0,h-27));
  const w=id==='strip-lamp'?80:68;return span(-w/2,w,h,Math.min(0,h-4));
 };
}

for(const e of stationElements){const id=e.type.slice('station.'.length);
 if(['frieze','harbor-crane'].includes(id))e.spatial=rectangleControls({height:'height'});
 if(['notice-stand','closed-notice'].includes(id))e.spatial=rectangleControls({width:'width',height:'height',originX:.5,originY:1});
 if(id==='harbor-canopy')e.spatial=combineControls(rectangleControls({width:'width',baseline:'under'}),verticalRangeControls('under','top'));
}

stationElements.find(e=>e.type==='station.marker')!.spatial=fixedGeometry('This non-drawing marker supplies gameplay or chunk-layout parameters. Edit its typed fields; it has no visible body to resize.');

for(const e of stationElements){const id=e.type.slice('station.'.length);
 if(id==='galleria-wall')e.spatial=viewportElevationControls('height');
 if(id==='galleria-ceiling'){
  e.spatial=viewportElevationControls('under','top');
  e.validateProperties=p=>{if(Number(p.top)<Number(p.under))throw Error('Beam top must not be below its underside');};
 }
 if(id==='harbor-water'){
  e.spatial=viewportElevationControls('wall','horizon');
  e.validateProperties=p=>{if(Number(p.horizon)<Number(p.wall))throw Error('Horizon must not be below the sea wall');};
 }
 if(id==='reflection')e.spatial=rectangleControls({width:'width',originX:.5,baseline:-19});
}

const slab=stationElements.find(e=>e.type==='station.slab')!;
slab.fields.width=semantic({...slab.fields.width,label:'Warning repeat extent'},{group:'Generation',quantity:'length',unit:'world units',space:'world'});
slab.spatial=repetitionExtentControl('width',-8);
