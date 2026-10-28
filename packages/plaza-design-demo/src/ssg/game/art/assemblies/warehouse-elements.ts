import {appearanceColor} from '../core/fields';
import {fixedGeometry} from '../core/spatial';
import {rectangleControls,rangeControls,radiusControl,combineControls,conditionalControls} from '../core/spatial';
import {seconds,velocity,degrees} from "../core/fields";
import {textField} from '../core/fields';
import {numericFields} from '../core/fields';
import {appearanceChoice,appearanceStructure,appearanceText,semantic,shapeLength,shapePosition} from '../core/fields';
/** Warehouse kits retain their original native paint operations and explicit placements. */
import type { Bounds, AssetDefinition, Field, Placement, Properties } from '../core/composition';
import type { View } from '../core/view';
import { box, O, sign, text } from '../core/primitives';
import { camera, taped, ticker } from '../signage/screens';
import { ALARM } from '../signage/kit';
import { drawWarehousePiece } from './warehouse';
const fixedNativeGeometry=fixedGeometry("This warehouse component has no independently authored size. Its native kernel and prepared source layout determine its geometry. Edit the source layout or Transform rather than stretching its body.");
const num=numericFields({value:0,min:-10000,max:10000,step:1});
const str=textField;
const n=(p:Properties,key:string)=>Number(p[key]);
const origin={x:0,h:0,role:'origin' as const};
type Paint=(x:CanvasRenderingContext2D,v:View,p:Properties,at:Required<Placement>)=>void;
const rectangle=(w:number,h:number,x=0,bottom=0):Bounds=>({x,h,w,tall:h-bottom});
function item(type:string,label:string,category:string,fields:Record<string,Field>,bounds:(p:Properties)=>Bounds,paint?:Paint):AssetDefinition {
  return {type:'warehouse.'+type,version:1,label,category,coordinates:'world',libraryUse:!['marker','light','caster','city','floor'].includes(type)?'reusable':undefined,fields,parts:['backdrop'],bounds,anchors:p=>({origin,topLeft:{x:0,h:n(p,'height')||0,role:'surface'},seat:{x:0,h:n(p,'height')||0,role:'surface'},shadow:{x:n(p,'width')/2||0,h:46,role:'mount'}}),
    draw(x,v,p,_state,_pass,at){if(paint){paint(x,v,p,at);return;}const local:View={...v,sx:(wx,depth=at.parallax)=>v.sx(wx+at.x,depth),y:h=>v.y(h+at.h),gy:v.gy-at.h};drawWarehousePiece(type,x,local,p);}};
}
const silent:Paint=()=>{};
export const warehouseElements:AssetDefinition[]=[
  item('marker','Warehouse gameplay marker','markers',{role:semantic(str('Role'),{"group":"Appearance","quantity":"reference","unit":"identifier"}),width:shapeLength(num('Scene width')),bearing:semantic(num('Compass bearing',270),{"group":"Transform","quantity":"angle","unit":"degrees"})},()=>rectangle(14,24,-7),silent),
  ({...item('city','Distant city behind the stacks','environment',{},()=>rectangle(1200,110)),spatial:fixedNativeGeometry}),
  ({...item('crane','Distant STS crane silhouette','machinery',{},()=>rectangle(360,220)),spatial:fixedNativeGeometry}),
  ({...item('spire','Spire antenna silhouette','architecture',{},()=>rectangle(22,266,-10,40)),spatial:fixedNativeGeometry}),
  item('stack','Container silhouette','environment',{height:shapeLength(num('Height',60,1))},p=>rectangle(64,n(p,'height'))),
  item('wall','Corrugated warehouse and gable','architecture',{width:shapeLength(num('Width',740,1)),height:shapeLength(num('Wall height',240,1))},p=>rectangle(n(p,'width'),n(p,'height')+50)),
  item('label','Painted warehouse lettering','signage',{text:appearanceText(str('Text','WAREHOUSE')),color:appearanceColor(str('Canvas color','rgba(255,217,165,.5)'),"CSS color"),fontSize:semantic(num('Font size',16,1),{"group":"Appearance","quantity":"length","unit":"artwork pixels","space":"artwork"}),weight:appearanceChoice({kind:'select',label:'Font weight',default:'700',options:['400','500','600','700']})},p=>rectangle(String(p.text).length*n(p,'fontSize')*.65,n(p,'fontSize'),-String(p.text).length*n(p,'fontSize')*.325,-4),(x,v,p,at)=>text(x,String(p.text),v.sx(at.x),v.y(at.h),String(p.color),n(p,'fontSize'),String(p.weight))),
  ({...item('office','Lit office window and clerk lamp','architecture',{},()=>rectangle(30,0,0,-22)),spatial:fixedNativeGeometry}),
  ({...item('dark-window','Unlit warehouse window','architecture',{},()=>rectangle(30,0,0,-22)),spatial:fixedNativeGeometry}),
  ({...item('camera','Warehouse surveillance camera','electronics',{direction:appearanceChoice({kind:'select',label:'Direction',default:1,options:[1,-1]}),blinkTimeOffset:seconds("Blink time offset",0.35,{"min":-166.66666666666666,"max":166.66666666666666,"step":0.016666666666666666})},()=>rectangle(48,12,-24,-12),(x,v,p,at)=>camera(x,v,{x:at.x,h:at.h,facing:n(p,'direction') as 1|-1,phase:(n(p,'blinkTimeOffset')*60)})),spatial:fixedNativeGeometry}),
  ({...item('passage','Lane back to the stacks','architecture',{},()=>rectangle(48,78,-24)),spatial:fixedNativeGeometry}),
  item('dock','Loading dock and warning stripe','architecture',{width:shapeLength(num('Dock width',250,1)),height:shapeLength(num('Dock height',16,1))},p=>rectangle(n(p,'width'),n(p,'height'))),
  ({...item('roller','Sealed warehouse roller door','architecture',{number:appearanceChoice({kind:'select',label:'Dock number',default:1,options:[1,2]})},()=>rectangle(120,104,-10)),spatial:fixedNativeGeometry}),
  ({...item('door','Personnel door and warrant reader','architecture',{},()=>rectangle(65,90,-30)),spatial:fixedNativeGeometry}),
  ({...item('plaque','Evidence custody plaque','signage',{},()=>rectangle(52,72,-26,42)),spatial:fixedNativeGeometry}),
  ({...item('notice','Registry custody notice','signage',{},()=>rectangle(100,92,-50)),spatial:fixedNativeGeometry}),
  item('ticker','Evidence intake ticker','signage',{text:appearanceText(str('Text')),width:shapeLength(num('Width',110,1)),scrollSpeed:velocity("Scroll speed",18,{"min":-600000,"max":600000,"step":60})},p=>rectangle(n(p,'width'),10,-n(p,'width')/2),(x,v,p,at)=>ticker(x,v,{x:at.x,h:at.h,w:n(p,'width'),tall:10,mount:'wall',text:String(p.text),col:ALARM,speed:(n(p,'scrollSpeed')/60)})),
  item('van','Registry evidence van','vehicles',{width:shapeLength(num('Van width',120,60))},p=>rectangle(n(p,'width'),44,-n(p,'width')/2)),
  ({...item('shoe','Single tagged shoe','props',{},()=>rectangle(26,12,-6)),spatial:fixedNativeGeometry}),
  ({...item('taped','Mender paper notice','signage',{lines:appearanceStructure({kind:'json',label:'Notice lines',default:['NETS MENDED','ASK INSIDE',"(DON'T)"],validate:value=>{if(!Array.isArray(value)||value.some(v=>typeof v!=='string'))throw new Error('Expected notice text lines');},editor:{kind:'array',item:appearanceText(textField('Line'))}}),tiltAngle:degrees("Tilt",2.291831180523293,{"min":-572957.7951308233,"max":572957.7951308233,"step":57.29577951308232})},()=>rectangle(90,14,-45,-28),(x,v,p,at)=>taped(x,v,{x:at.x,h:at.h,text:p.lines as string[],tilt:(n(p,'tiltAngle')*Math.PI/180)})),spatial:fixedNativeGeometry}),
  item('crate','Mender wooden crate','props',{width:shapeLength(num('Crate width',20,1)),height:shapeLength(num('Crate height',10,1))},p=>rectangle(n(p,'width'),n(p,'height'),-n(p,'width')/2),(x,v,p,at)=>box(x,v.sx(at.x)-n(p,'width')/2,v.y(at.h+n(p,'height')),n(p,'width'),n(p,'height'),'#4a3420','rgba(255,190,110,.4)')),
  item('neon','No-entry warning sign','signage',{text:appearanceText(str('Text','NO ENTRY')),fontSize:semantic(num('Font size',7,1),{"group":"Appearance","quantity":"length","unit":"artwork pixels","space":"artwork"}),flickerTimeOffset:seconds("Flicker time offset",0.2,{"min":-166.66666666666666,"max":166.66666666666666,"step":0.016666666666666666})},p=>rectangle(String(p.text).length*n(p,'fontSize')*.7,n(p,'fontSize'),-String(p.text).length*n(p,'fontSize')*.35,-4),(x,v,p,at)=>sign(x,v.t,String(p.text),v.sx(at.x),v.y(at.h),O,{size:n(p,'fontSize'),phase:(n(p,'flickerTimeOffset')*60)})),
  item('floor','Forecourt floor and parking marks','surfaces',{from:shapePosition(num('Parking stripe start',600)),to:shapePosition(num('Parking stripe end',820))},()=>rectangle(900,0,0,-100)),
  item('light','Attached warehouse light','atmosphere',{kind:appearanceChoice({kind:'select',label:'Light kind',default:'lamp',options:['lamp','window']}),width:shapeLength(num('Window width')),height:shapeLength(num('Window height')),radius:shapeLength(num('Radius',40,1)),color:appearanceColor(str('Optional RGB'),"RGB"),lightOpacity:semantic(num('Optional alpha',-1,-1),{"group":"Visibility & Drawing","quantity":"ratio","unit":"ratio"})},p=>rectangle(n(p,'radius')*2,n(p,'radius'),-n(p,'radius'),-n(p,'radius')),silent),
  ({...item('caster','Van shadow marker','atmosphere',{},()=>rectangle(12,12,-6),silent),spatial:fixedNativeGeometry}),
];

for(const e of warehouseElements){const id=e.type.slice('warehouse.'.length);
 if(['wall','dock'].includes(id))e.spatial=rectangleControls({width:'width',height:'height'});
 if(id==='crate')e.spatial=rectangleControls({width:'width',height:'height',originX:.5});
 if(id==='stack')e.spatial=rectangleControls({height:'height'});
 if(id==='ticker')e.spatial=rectangleControls({width:'width',originX:.5});
 if(id==='floor')e.spatial=rangeControls('from','to',-4);
}

warehouseElements.find(e=>e.type==='warehouse.marker')!.spatial=fixedGeometry('This non-drawing marker supplies gameplay or chunk-layout parameters. Edit its typed fields; it has no visible body to resize.');

for(const e of warehouseElements){
 if(['warehouse.label','warehouse.neon'].includes(e.type))e.spatial=fixedGeometry('Lettering uses text and font size, not independent physical width and height. Edit its typography controls; no box-stretch handles.');
 if(e.type==='warehouse.van')e.spatial=fixedGeometry('This is a fixed vehicle drawing scaled by its Width setting. It does not regenerate body geometry; use Width or placement Scale rather than invented body-edge handles.');
 if(e.type==='warehouse.light'){
  e.selection='region';e.drawingNote=()=>"The shared lighting pass draws this source's glow. Its controls edit the configured light region.";
  e.spatial=combineControls(radiusControl('radius'),conditionalControls(rectangleControls({width:'width',height:'height',originX:.5,originY:.5}),(p,key)=>p.kind==='window'&&Number(p[key])>0));
  e.bounds=p=>{const r=n(p,'radius'),w=p.kind==='window'?(n(p,'width')||12):0,h=p.kind==='window'?(n(p,'height')||20):0;return{x:-r-w/2,h:r+h/2,w:2*r+w,tall:2*r+h};};
 }
}
