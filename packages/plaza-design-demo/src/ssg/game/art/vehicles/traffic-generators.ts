import {generationSeed,semantic,type FieldSemantics} from '../core/fields';
/** Independently selectable air streams and vehicles; pure kernels on the existing frame clock. */
import type {AssetDefinition,Field,Properties,Value,BoundsContext} from '../core/composition';
import {routeControls,endpointControls,type SpatialContract} from '../core/spatial';
import type {View} from '../core/view';
import {placed} from '../core/view';
import {ART,R,smooth,lerp} from '../core/pixels';
import {AIR_EXTENT,BLIMP_SCALE,drawBlimp,drawCraft,drawDrone,type CraftKind} from './air-traffic';
import {screenBounds} from '../assemblies/static-bounds';
const KINDS:CraftKind[]=['pod','taxi','patrol','shuttle','hauler','medevac','dropship','escort'];
const n=(p:Readonly<Properties>,k:string)=>Number(p[k]);
const number=(label:string,value:number,quantity:FieldSemantics['quantity'],group:FieldSemantics['group'],unit:string,range:{min?:number;max?:number;step?:number}={}):Field=>semantic({kind:'number',label,default:value,step:1,...range},{quantity,group,unit,...(['length','position','speed'].includes(quantity)?{space:'local' as const}:{})});
const position=(label:string,value:number)=>number(label,value,'position','Shape / Area','world units');
const length=(label:string,value:number,min=0)=>number(label,value,'length','Shape / Area','world units',{min});
const speed=(label:string,value:number)=>number(label,value,'speed','Motion','world units / second',{step:.1});
const ratio=(label:string,value:number)=>number(label,value,'ratio','Generation','ratio',{min:0,max:1,step:.01});
const parallaxField=number('Parallax',.5,'factor','Depth','factor',{min:.01,max:1,step:.01});
const kind=semantic({kind:'select',label:'Craft',default:'pod',options:KINDS},{quantity:'choice',group:'Appearance',unit:'craft kind'});
const seed=generationSeed(number('Seed',3,'seed','Generation','integer',{min:0,max:1e9}));
const direction=semantic({kind:'select',label:'Direction',default:1,options:[-1,1]},{quantity:'choice',group:'Motion',unit:'left / right'});
const h01=(k:number)=>{let h=(k*374761393)|0;h=(h^(h>>>13))*1274126177;return((h^(h>>>16))>>>0)/4294967296;};
const list=(label:string,item:Record<string,Field>):Field=>semantic({kind:'json',label,default:[],editor:{kind:'list',item},validate(value:Value){if(!Array.isArray(value)||value.length>40||value.some(r=>!r||typeof r!=='object'||Array.isArray(r)))throw Error(label+': expected object rows');for(const row of value as Properties[])for(const[key,f]of Object.entries(item)){const v=row[key]??f.default;if(f.kind==='number'&&(typeof v!=='number'||!Number.isFinite(v)||f.min!==undefined&&v<f.min||f.max!==undefined&&v>f.max))throw Error(label+'.'+key+': invalid value');}}},{quantity:'structured',group:'Visibility & Drawing',unit:'typed regions'});
function frame(ctx:CanvasRenderingContext2D,v:View,ox:number,oh:number,q:number){
 const at=(u:number,depth=q)=>v.sx(ox+u,depth);
 const cameraAt=(depth=q)=>v.viewW/2-at(0,depth);
 const craft=(type:CraftKind,u:number,h:number,face:1|-1,options:{paint?:string;t?:number;beam?:boolean}={})=>{
  const sx=at(u);if(sx< -120*ART||sx>v.viewW+120*ART)return;
  placed(ctx,R(sx/ART)*ART,R(v.y(oh+h)/ART)*ART,q,()=>drawCraft(ctx,type,{t:options.t??v.t,face,still:false,paint:options.paint,scale:q*(1/ART),beam:options.beam}));
 };
 return{q,at,cameraAt,craft};
}
function region(_p:Properties,c:BoundsContext|undefined,from:number,to:number,low:number,high:number,type:keyof typeof AIR_EXTENT){
 const q=c?.placement.parallax??1,e=AIR_EXTENT[type],project=(u:number)=>c?c.view.sx(c.placement.x+u,q):u;
 const left=Math.min(project(from),project(to))+e.x0*q-3,right=Math.max(project(from),project(to))+e.x1*q+3,top=high+e.top*q+3,bottom=low-e.bottom*q-3;
 const b={x:left,h:top,w:right-left,tall:top-bottom};return c?screenBounds(c,{x:left,y:c.view.y(c.placement.h+top),w:right-left,h:top-bottom},b):b;
}
const define=(type:string,label:string,fields:Record<string,Field>,rest:Omit<AssetDefinition,'type'|'version'|'label'|'fields'|'category'|'parts'|'coordinates'|'libraryUse'|'anchors'>):AssetDefinition=>({type,version:1,label,fields,category:'vehicles',coordinates:'world',libraryUse:'reusable',parts:['backdrop'],anchors:()=>({origin:{x:0,h:0,role:'origin'}}),...rest});
const laneFields={minX:position('Route starts at X',-4000),maxX:position('Route ends at X',26000),altitude:position('Altitude',480),kind,direction,speed:speed('Speed',270),spacing:length('Spacing',1800,90),seed,
 densityStartX:position('Density ramp starts at X',4000),densityEndX:position('Density ramp ends at X',9000),densityBefore:ratio('Density before ramp',.2),densityAfter:ratio('Density after ramp',.8),quietBelowX:position('Thin traffic below X',-1e7),quietFadeDistance:length('Thinning distance',1200,1),
 clearance:list('Landmark clearance',{centerX:position('Landmark X',1000),parallax:parallaxField,halfWidth:length('Half width',210),cameraMinX:position('Camera range start',-4000),cameraMaxX:position('Camera range end',26000)})};
export const trafficLaneElement=define('vehicle.traffic-lane','Air traffic lane',laneFields,{
 selection:'region',spatial:routeControls('minX','maxX','altitude'),
 validateProperties:p=>{if(n(p,'maxX')<=n(p,'minX'))throw Error('Route end must be after route start.');},
 bounds:(p,_s,c)=>region(p,c,n(p,'minX'),n(p,'maxX'),n(p,'altitude')-8*ART,n(p,'altitude')+8*ART,p.kind as CraftKind),
 draw(x,v,p,_s,_pass,placement){
  const f=frame(x,v,placement.x,placement.h,placement.parallax),gap=n(p,'spacing'),off=n(p,'direction')*v.t*(n(p,'speed')/60),cu=f.cameraAt(),reach=v.viewW/2+160*ART;
  for(let k=Math.floor((Math.max(n(p,'minX'),cu-reach)-off)/gap);k<=Math.ceil((Math.min(n(p,'maxX'),cu+reach)-off)/gap);k++){
   const u=k*gap+off;if(u<n(p,'minX')||u>n(p,'maxX'))continue;
   const busy=n(p,'densityBefore')+(n(p,'densityAfter')-n(p,'densityBefore'))*smooth(n(p,'densityStartX'),n(p,'densityEndX'),u),quiet=n(p,'quietBelowX'),thin=u<quiet?lerp(1,.2,Math.min(1,(quiet-u)/n(p,'quietFadeDistance'))):1;
   if(h01(k*31+n(p,'seed'))>busy*thin)continue;
   if(p.kind!=='shuttle'&&(p.clearance as Properties[]).some(c=>{const camera=f.cameraAt(n(c,'parallax'));return camera>n(c,'cameraMinX')&&camera<n(c,'cameraMaxX')&&Math.abs(f.at(u)-f.at(n(c,'centerX'),n(c,'parallax')))<n(c,'halfWidth');}))continue;
   f.craft(p.kind as CraftKind,u,n(p,'altitude')-(((k*37)%5)-2)*ART-Math.sin(v.t*.03+k)*1.2*ART,n(p,'direction')as 1|-1,{t:v.t+k*13});
  }
 }
});
const patrolSpatial:SpatialContract={fields:['centerX','altitude','radiusX','radiusY'],handles:p=>[
 {id:'radiusX',label:'Horizontal patrol radius',point:{x:n(p,'centerX')+n(p,'radiusX'),h:n(p,'altitude')},fields:['radiusX'],cursor:'ew-resize',edit:d=>({props:{radiusX:n(p,'radiusX')+d.x}})},
 {id:'radiusY',label:'Vertical patrol radius',point:{x:n(p,'centerX'),h:n(p,'altitude')+n(p,'radiusY')},fields:['radiusY'],cursor:'ns-resize',edit:d=>({props:{radiusY:n(p,'radiusY')+d.h}})},
 {id:'center',label:'Patrol centre',point:{x:n(p,'centerX'),h:n(p,'altitude')},fields:['centerX','altitude'],cursor:'move',edit:d=>({props:{centerX:n(p,'centerX')+d.x,altitude:n(p,'altitude')+d.h}})}
]};
export const patrolElement=define('vehicle.air-patrol','Air patrol loop',{centerX:position('Patrol centre X',8700),altitude:position('Altitude',480),radiusX:length('Horizontal radius',600),radiusY:length('Vertical radius',30),beamRange:length('Searchlight activation range',360),loopDuration:number('Loop duration',800/60,'duration','Motion','seconds',{min:.01,step:.1}),beamMode:semantic({kind:'select',label:'Searchlight',default:1,options:[0,1,2]},{group:'Appearance',quantity:'choice',unit:'off / landmark / intermittent'})},{
 selection:'region',spatial:patrolSpatial,bounds:(p,_s,c)=>region(p,c,n(p,'centerX')-n(p,'radiusX'),n(p,'centerX')+n(p,'radiusX'),n(p,'altitude')-n(p,'radiusY'),n(p,'altitude')+n(p,'radiusY'),'patrol'),
 draw(x,v,p,_s,_pass,at){const f=frame(x,v,at.x,at.h,at.parallax),a=(v.t/(n(p,'loopDuration')*60))*Math.PI*2,u=n(p,'centerX')+Math.cos(a)*n(p,'radiusX'),beam=n(p,'beamMode');f.craft('patrol',u,n(p,'altitude')-Math.sin(a)*n(p,'radiusY'),Math.sin(a)>0?-1:1,{beam:beam>0&&(beam===2?Math.cos(a*3)>.6:Math.abs(u-n(p,'centerX'))<n(p,'beamRange'))});}
});
const streamSpatial:SpatialContract={fields:['startX','endX','startAltitude','endAltitude'],handles:p=>['start','end'].map(end=>({id:end,label:end==='start'?'Drone launch point':'Drone destination',fields:[end+'X',end+'Altitude'],point:{x:n(p,end+'X'),h:n(p,end+'Altitude')},cursor:'move',edit:d=>({props:{[end+'X']:n(p,end+'X')+d.x,[end+'Altitude']:n(p,end+'Altitude')+d.h}})}))};
export const droneStreamElement=define('vehicle.drone-stream','Delivery drone stream',{startX:position('Launch X',16500),endX:position('Destination X',8500),startAltitude:position('Launch altitude',300),endAltitude:position('Cruising altitude',480),climbDistance:length('Climb distance',480,1),fadeDistance:length('Fade distance',480,1),spacing:length('Spacing',1800,90),speed:speed('Speed',270)},{
 selection:'region',spatial:streamSpatial,validateProperties:p=>{if(n(p,'startX')<=n(p,'endX'))throw Error('Drone destination must be west of its launch point.');},
 bounds:(p,_s,c)=>region(p,c,n(p,'startX'),n(p,'endX'),Math.min(n(p,'startAltitude'),n(p,'endAltitude')-43)-2*ART,Math.max(n(p,'startAltitude'),n(p,'endAltitude'))+2*ART,'drone'),
 draw(x,v,p,_s,_pass,at){const f=frame(x,v,at.x,at.h,at.parallax),gap=n(p,'spacing'),off=-v.t*(n(p,'speed')/60),cu=f.cameraAt();for(let k=Math.floor((cu-1800*f.q-off)/gap);k<=Math.ceil((cu+1800*f.q-off)/gap);k++){
  const u=k*gap+off,d=n(p,'startX')-u;if(d<0||u<n(p,'endX'))continue;const sx=f.at(u);if(sx< -20*ART||sx>v.viewW+20*ART)continue;
  const climb=smooth(0,n(p,'climbDistance'),d),fade=Math.min(1,(u-n(p,'endX'))/n(p,'fadeDistance')),h=lerp(n(p,'startAltitude'),n(p,'endAltitude')-h01(k*5)*43,climb)-Math.sin(k)*2*ART;
  x.save();x.globalAlpha*=fade;placed(x,R(sx/ART)*ART,R(v.y(at.h+h)/ART)*ART,f.q,()=>drawDrone(x,{t:v.t+k*7,still:false,cargo:true}));x.restore();
 }}
});
export const blimpElement=define('vehicle.ad-blimp','Advertising blimp',{startX:position('Starting X',1000),altitude:position('Altitude',480),velocityX:speed('Horizontal velocity',-14.4)},{
 spatial:endpointControls('startX','altitude',0,'Starting point'),
 drawingNote:()=>"The handle edits the flight's starting point. Horizontal velocity moves the blimp away from it over time; it does not resize the craft.",
 bounds:(p,_s,c)=>region(p,c,n(p,'startX'),n(p,'startX'),n(p,'altitude'),n(p,'altitude'),'blimp'),
 draw(x,v,p,_s,_pass,at){const f=frame(x,v,at.x,at.h,at.parallax),u=n(p,'startX')+v.t*(n(p,'velocityX')/60),sx=f.at(u);if(sx> -80*ART&&sx<v.viewW+80*ART)placed(x,R(sx/ART)*ART,R(v.y(at.h+n(p,'altitude'))/ART)*ART,f.q*BLIMP_SCALE,()=>drawBlimp(x,{t:v.t,still:false}));}
});
export const scheduledCraftElement=define('vehicle.scheduled-craft','Scheduled aircraft',{kind,startX:position('Starting X',0),altitude:position('Altitude',480),velocityX:speed('Horizontal velocity',90),facing:direction,startTime:number('Start time',0,'duration','Motion','seconds',{min:0}),endTime:number('End time',10,'duration','Motion','seconds',{min:0})},{
 selection:'region',
 spatial:endpointControls('startX','altitude',0,'Flight start'),
 drawingNote:()=>"The handle edits the scheduled flight's starting point. Its end follows velocity and start/end time; move the whole generator through its placement.",
 visualFields:{sequenceTime:semantic({kind:'number',label:'Sequence time',default:-1,animatable:true},{group:'Motion',quantity:'duration',unit:'seconds'})},
 validateProperties:p=>{if(n(p,'endTime')<=n(p,'startTime'))throw Error('Flight end time must follow start time.');},
 bounds:(p,_s,c)=>region(p,c,n(p,'startX'),n(p,'startX')+n(p,'velocityX')*(n(p,'endTime')-n(p,'startTime')),n(p,'altitude'),n(p,'altitude'),p.kind as CraftKind),
 draw(x,v,p,state,_pass,at){const tau=n(state,'sequenceTime');if(tau<=n(p,'startTime')||tau>=n(p,'endTime'))return;frame(x,v,at.x,at.h,at.parallax).craft(p.kind as CraftKind,n(p,'startX')+n(p,'velocityX')*(tau-n(p,'startTime')),n(p,'altitude'),n(p,'facing')as 1|-1);}
});
export const trafficGeneratorElements=[trafficLaneElement,patrolElement,droneStreamElement,blimpElement,scheduledCraftElement];
