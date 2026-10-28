import {fixedGeometry,viewportElevationControls,rectangleControls,combineControls,axisControl,repetitionExtentControl} from '../core/spatial';
import {degrees} from "../core/fields";
import {numericFields} from '../core/fields';
import {appearanceBoolean,appearanceText,semantic,shapeLength,shapePosition} from '../core/fields';
/** Elevated-platform pieces. Transport and skyline evolution arrive as explicit snapshots. */
import type { AssetDefinition,Field,Properties } from '../core/composition';
import type { View } from '../core/view';
import { createDowntownPlatformArtwork,type MetroLayout } from './downtown-platform';
import { notice } from '../core/primitives';
const fixedNativeGeometry=fixedGeometry("This metro component has no independently authored size. Its native kernel and prepared source layout determine its geometry. Edit the source layout or Transform rather than stretching its body.");
const num=numericFields({value:0,min:-1e5,max:1e5,step:1});
const n=(p:Properties,k:string)=>Number(p[k]);
const origin={x:0,h:0,role:'origin' as const};
const raised=(v:View,h:number):View=>h===0?v:{...v,gy:v.gy-h,y:q=>v.y(q+h)};
const blank:MetroLayout={width:0,spawn:0,canopy:{under:0,fascia:0,truss:0},deck:0,horizon:0,signs:[],cityMap:0,pillars:[],lamps:[],board:0,benches:[],pierStep:1,boardAt:0,screen:0,waiting:[]};
const kernels=(p:Properties,s:Properties)=>createDowntownPlatformArtwork({L:{...blank,width:Number(p.width??s.width??0),deck:Number(p.deck??0),canopy:{under:Number(p.under??s.roof??0),fascia:Number(p.fascia??0),truss:Number(p.truss??0)}}});
type Draw=(x:CanvasRenderingContext2D,v:View,p:Properties,s:Properties,at:{x:number;h:number})=>void;
function E(type:string,label:string,fields:Record<string,Field>,draw:Draw,visualFields:Record<string,Field>={}):AssetDefinition{return{type:'metro.'+type,version:1,label,category:'elevated metro',coordinates:'world',fields,visualFields,parts:['backdrop'],bounds:p=>({x:-Number(p.width??120)/2,h:Number(p.height??180),w:Number(p.width??120),tall:Number(p.height??180)}),anchors:()=>({origin}),draw(ctx,v,p,s,_pass,at){draw(ctx,raised(v,at.h),p,s,at);}};}
export const metroElements:AssetDefinition[]=[
 E('marker','Metro gameplay marker',{role:semantic({kind:'string',label:'Role',default:''},{"group":"Appearance","quantity":"reference","unit":"identifier"}),width:shapeLength(num('Width')),height:shapeLength(num('Height'))},()=>{}),
 ({...E('city-wash','City daylight wash',{roofOnly:appearanceBoolean({kind:'boolean',label:'Above canopy only',default:false})},(ctx,v,p,s)=>{ctx.fillStyle='rgba(2,1,0,'+(p.roofOnly?.3*(1-.7*n(s,'daylight')):.55*(1-.75*n(s,'daylight'))).toFixed(3)+')';ctx.fillRect(0,0,v.viewW,p.roofOnly?Math.max(0,v.y(n(s,'truss'))):v.viewH);},{daylight:num('Daylight'),truss:num('Truss height')}),spatial:fixedNativeGeometry}),
 E('far-rail','Viaduct far rail',{deck:shapePosition(num('Deck height'))},(ctx,v,p,s)=>kernels(p,s).drawFarRail(ctx,v)),
 E('track-base','Track ballast and rails',{deck:shapePosition(num('Deck height'))},(ctx,v,p,s)=>kernels(p,s).drawTrackBase(ctx,v)),
 ({...E('track-edge','Track yellow edge',{},(ctx,v,p,s)=>kernels(p,s).drawTrackEdge(ctx,v)),spatial:fixedNativeGeometry}),
 E('canopy','Canopy truss and fascia',{width:shapeLength(num('Width')),under:shapePosition(num('Underside')),fascia:shapePosition(num('Fascia')),truss:shapePosition(num('Truss'))},(ctx,v,p,s,at)=>kernels(p,s).drawCanopy(ctx,at.x===0?v:{...v,sx:(wx,par=1)=>v.sx(wx+at.x,par)})),
 ({...E('lamp','Canopy strip lamp and light cone',{},(ctx,v,p,s,at)=>kernels(p,s).drawLamp(ctx,v,at.x),{roof:shapeLength(num('Canopy underside'))}),spatial:fixedNativeGeometry}),
 ({...E('pillar','Braced canopy pillar',{camera:appearanceBoolean({kind:'boolean',label:'CCTV',default:false})},(ctx,v,p,s,at)=>kernels(p,s).drawPillar(ctx,v,{x:at.x,...(p.camera?{cam:true}:{})}),{roof:shapeLength(num('Canopy underside'))}),spatial:fixedNativeGeometry}),
 ({...E('sign','Downtown station name',{},(ctx,v,p,s,at)=>kernels(p,s).drawSign(ctx,v,at.x),{roof:shapeLength(num('Canopy underside'))}),spatial:fixedNativeGeometry}),
 ({...E('notice','Line map or advertising notice',{first:appearanceText({kind:'string',label:'First line',default:''}),second:appearanceText({kind:'string',label:'Second line',default:''}),highlightPhaseAngle:degrees("Highlight phase",0,{group:'Motion',"min":-5729577.951308233,"max":5729577.951308233,"step":57.29577951308232})},(ctx,v,p,_s,at)=>notice(ctx,v.t,v.sx(at.x),v.y(0),44,30,p.second?[String(p.first),String(p.second)]:[String(p.first)],(n(p,'highlightPhaseAngle')*Math.PI/180))),spatial:fixedNativeGeometry}),
 ({...E('below','Street glow far below the viaduct',{},(ctx,v,p,s)=>kernels(p,s).drawBelow(ctx,v)),spatial:fixedNativeGeometry}),
 ({...E('pier','Viaduct support pier',{},(ctx,v,p,s,at)=>kernels(p,s).drawPier(ctx,v,at.x)),spatial:fixedNativeGeometry}),
 E('girder','Riveted deck girder',{width:shapeLength(num('Width'))},(ctx,v,p,s)=>kernels(p,s).drawGirder(ctx,v)),
 E('slab','Platform slab and gap warnings',{width:shapeLength(num('Width'))},(ctx,v,p,s)=>kernels(p,s).drawSlab(ctx,v)),
 ({...E('city-map','Backlit city map',{},(ctx,v,p,s,at)=>kernels(p,s).drawCityMap(ctx,v,at.x)),spatial:fixedNativeGeometry}),
 ({...E('stairs','Stairs to Downtown',{},(ctx,v,p,s,at)=>kernels(p,s).drawStairs(ctx,v,at.x)),spatial:fixedNativeGeometry}),
 ({...E('turnstile','Exit identity reader and flap',{},(ctx,v,p,s,at)=>kernels(p,s).drawTurnstile(ctx,v,at.x)),spatial:fixedNativeGeometry}),
];

for(const element of metroElements){element.bindingIdentity='presentation';element.bindingChoices=composition=>{
 if(composition.scene!=='metro')return{};
 const sources:Record<string,string[]>={daylight:['station.daylight'],truss:['station.truss'],roof:['station.roofLocal','station.roof']};
 return Object.fromEntries(Object.keys(element.visualFields??{}).filter(key=>sources[key]).map(key=>[key,sources[key]]));
};}
// Full-width platform passes retain context; these individual fittings use their placement.
for(const e of metroElements)if(['notice','pier','city-map','stairs','turnstile'].includes(e.type.slice(6)))e.libraryUse='reusable';

metroElements.find(e=>e.type==='metro.marker')!.spatial=fixedGeometry('This non-drawing marker supplies gameplay or chunk-layout parameters. Edit its typed fields; it has no visible body to resize.');

for(const e of metroElements){const id=e.type.slice('metro.'.length);
 if(id==='far-rail'||id==='track-base')e.spatial=viewportElevationControls('deck');
 if(id==='canopy'){
  e.spatial=combineControls(rectangleControls({width:'width',baseline:'under'}),axisControl('under','h'),axisControl('fascia','h'),axisControl('truss','h'));
  e.validateProperties=p=>{if(Number(p.under)>Number(p.fascia)||Number(p.fascia)>Number(p.truss))throw Error('Canopy elevations must be ordered: underside, fascia, truss');};
 }
}

for(const id of ['girder','slab']){
 const e=metroElements.find(e=>e.type==='metro.'+id)!;
 e.fields.width=semantic({...e.fields.width,label:id==='slab'?'Warning repeat extent':'Rivet repeat extent',min:0},{group:'Generation',quantity:'length',unit:'world units',space:'world'});
 e.spatial=repetitionExtentControl('width',id==='slab'?-7:-20,id==='girder'?300:0);
}
