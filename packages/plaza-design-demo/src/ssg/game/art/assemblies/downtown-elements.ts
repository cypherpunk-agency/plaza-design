import {appearanceColor} from '../core/fields';
import {fixedGeometry} from '../core/spatial';
import {seconds} from "../core/fields";
import {booleanField,textField} from '../core/fields';
import {numericFields} from '../core/fields';
import {rectangleControls,radiusControl,axisControl,viewportElevationControls} from '../core/spatial';
import {appearanceBoolean,appearanceChoice,appearanceRatio,appearanceText,depthFactor,generationSeed,semantic,shapeLength,shapePosition} from '../core/fields';
/** Reusable Downtown pieces. Scene layout and simulation snapshots are explicit inputs. */
import { DowntownArtwork, type Front } from './downtown';
import { drawLibraryFront } from './library';
import { drawMetroStairs } from '../architecture/metro-stairs';
import { drawTaxiPad } from './taxi-pad';
import { ticker, YELLOW } from '../signage/screens';
import { neonPlate } from '../signage/kit';
import { windowMask } from '../signage/kit-elements';
import type { Anchor, Bounds, AssetDefinition, Field, Placement, Properties, Value } from '../core/composition';
import type { View } from '../core/view';
import * as devices from '../electronics/downtown-devices';
const fixedNativeGeometry=fixedGeometry("This downtown component has no independently authored size. Its native kernel and prepared source layout determine its geometry. Edit the source layout or Transform rather than stretching its body.");
const num=numericFields({value:0,min:-10000,max:10000,step:1});
const bool=booleanField;
const str=textField;
const n=(p:Properties,k:string)=>Number(p[k]);
const origin:Anchor={x:0,h:0,role:'origin'};
const box=(w:number,h:number,x=0):Bounds=>({x,h,w,tall:h});
const raised=(v:View,h:number):View=>h===0?v:{...v,gy:v.gy-h,y:q=>v.y(q+h)};
const kernel=new DowntownArtwork();
// These kernels consume only their own properties, placement and explicit visual state.
// Parent metrics, screen fills and the routed delivery sprite retain their context contract.
const independent=new Set(['front','window','bay','penthouse','neon-sign','weather-ticker','billboard','stall','fence','alley','dumpster','entrance','fixer','counter','pedestrian','library-front','metro-stairs','taxi-pad',...['sign','box','till','relay','gate','fence','scan','cam3','billboard','map'].map(id=>'device-'+id)]);
type Draw=(x:CanvasRenderingContext2D,v:View,p:Properties,s:Properties,at:Required<Placement>)=>void;
function element(type:string,label:string,category:string,fields:Record<string,Field>,bounds:AssetDefinition['bounds'],draw:Draw,visualFields:Record<string,Field>={}):AssetDefinition {
 return {type:'downtown.'+type,version:1,label,category,coordinates:'world',libraryUse:independent.has(type)?'reusable':undefined,fields,visualFields,parts:['backdrop'],bounds,anchors:p=>({origin,top:{x:0,h:Number(p.height??0),role:'surface'},right:{x:Number(p.width??0),h:0,role:'mount'},topCenter:{x:Number(p.width??0)/2,h:Number(p.height??0),role:'surface'}}),
  draw(x,v,p,s,_pass,at){kernel.set(x,raised(v,at.h));draw(x,v,p,s,at);}};
}
const mask:Field=windowMask;
const enabled={enabled:bool('Visible on parent front',true)};
const metrics:Field={kind:'json',label:'Resolved parent dimensions and visibility',default:[0,0,false,true],validate:v=>{if(!Array.isArray(v)||v.length!==4||typeof v[0]!=='number'||typeof v[1]!=='number'||typeof v[2]!=='boolean'||typeof v[3]!=='boolean')throw new Error('Invalid front metrics');}};
const front=(s:Properties,at:Required<Placement>):Front=>{const m=s.metrics as Value[];return{x:at.x,w:Number(m[0]),h:Number(m[1]),roof:!!m[2]};};
export const downtownElements:AssetDefinition[]=[
 element('marker','Gameplay marker','markers',{role:semantic(str('Role','exit'),{"group":"Appearance","quantity":"reference","unit":"identifier"}),width:shapeLength(num('Width')),height:shapeLength(num('Height'))},p=>box(n(p,'width'),n(p,'height')),()=>{}),
 element('light','Attached scene light','atmosphere',{kind:appearanceChoice({kind:'select',label:'Light kind',default:'lamp',options:['lamp','window','neon','screen','head']}),radius:shapeLength(num('Radius',56,1)),color:appearanceColor(str('Optional RGB'),"RGB"),lightOpacity:semantic(num('Optional alpha',-1,-1,1),{"group":"Visibility & Drawing","quantity":"ratio","unit":"ratio"})},p=>({x:-n(p,'radius'),h:n(p,'radius'),w:n(p,'radius')*2,tall:n(p,'radius')*2}),()=>{}),
 element('skyline','Seeded skyline lane','environment',{parallax:depthFactor(num('Parallax',0.18,0,2)),seed:generationSeed(num('Seed',7,0)),minHeight:shapeLength(num('Minimum height',70,0)),maxHeight:shapeLength(num('Maximum height',150,0)),edgeOpacity:semantic(num('Edge alpha',0.18,0,1),{"group":"Visibility & Drawing","quantity":"ratio","unit":"ratio"}),litChance:appearanceRatio(num('Window probability',0.12,0,1))},()=>box(2000,260),(x,v,p,s,at)=>{kernel.set(x,{...raised(v,at.h),cam:v.cam-at.x});kernel.drawSkyline(n(p,'parallax'),n(p,'seed'),n(p,'minHeight'),n(p,'maxHeight'),n(p,'edgeOpacity'),n(p,'litChance'),n(s,'width'));},{width:num('Street width',2000,1)}),
 ({...element('antenna','Street antenna','architecture',{},()=>box(44,400,-22),(_x,_v,_p,_s,at)=>kernel.drawAntenna(at.x)),spatial:fixedNativeGeometry}),
 ({...element('front','Street wall and storey bands','architecture',{width:shapeLength(num('Width',150,1)),height:shapeLength(num('Height',340,1)),roof:appearanceBoolean(bool('Climbable roof')),seed:generationSeed(num('Stable front seed',0,0))},p=>box(n(p,'width'),n(p,'height')),(_x,v,p,_s,at)=>{const sx=v.sx(at.x),end=sx+n(p,'width')*at.scale*at.facing;if(Math.max(sx,end)+4*at.scale<0||Math.min(sx,end)-4*at.scale>v.viewW)return;kernel.drawFrontBody({x:at.x,w:n(p,'width'),h:n(p,'height'),roof:!!p.roof},sx);}), spatial:rectangleControls({width:'width',height:'height'})}),
 ({...element('front-trim','Cornice and shop fascia','architecture',{},(_p,s)=>box(Number((s.metrics as Value[])[0]),Number((s.metrics as Value[])[1])),(_x,v,_p,s,at)=>{if(!(s.metrics as Value[])[3])return;kernel.drawFrontTrim(front(s,at),v.sx(at.x));},{metrics}),spatial:fixedNativeGeometry}),
 ({...element('window','Storey window, blinds and AC','architecture',{light:semantic(num('Room light variation',-1,-1,8),{group:'Appearance',quantity:'factor',unit:'factor',description:'Native window light variation; -1 is unlit. Fractional values preserve the authored room appearance.'}),ac:appearanceBoolean(bool('Air conditioner')),seed:generationSeed(num('Stable light seed',0,0,1000000000))},()=>({x:-1,h:0,w:16,tall:38}),(_x,v,p,s,at)=>{kernel.set(_x,v);if(s.enabled)kernel.drawWindow(v.sx(at.x),v.y(at.h),n(p,'light'),!!p.ac,n(p,'seed'));},enabled),spatial:fixedNativeGeometry}),
 ({...element('bay','Ground-floor opening','architecture',{width:shapeLength(num('Width',24,1)),kind:appearanceChoice({kind:'select',label:'Opening',default:'door',options:['door','glass','shutter','sealed']})},p=>box(n(p,'width'),64),(_x,v,p,s,at)=>{if(s.enabled)kernel.drawBay(v.sx(at.x),n(p,'width'),p.kind as 'door'|'glass'|'shutter'|'sealed');},enabled), spatial:rectangleControls({width:'width'})}),
 ({...element('penthouse','Penthouse window and plate','architecture',{},()=>box(60,280,-30),(_x,_v,_p,_s,at)=>kernel.drawPenthouse(at.x)),spatial:fixedNativeGeometry}),
 ({...element('neon-sign','Bolted neon plate','signage',{width:shapeLength(num('Plate width',96,1)),height:shapeLength(num('Plate height',15,1)),text:appearanceText(str('Letters')),color:appearanceColor(str('RGB color','0,255,255'),"RGB"),fontSize:semantic(num('Letter size',10,1,64),{"group":"Appearance","quantity":"length","unit":"artwork pixels","space":"artwork"}),flickerTimeOffset:seconds("Flicker time offset",0,{"min":-166.66666666666666,"max":166.66666666666666,"step":0.016666666666666666}),dead:semantic(num('Burnt-out letter (-1 none)',-1,-1,64),{"group":"Appearance","quantity":"index","unit":"integer"}),mask,smear:appearanceBoolean(bool('Street reflection'))},p=>box(n(p,'width'),n(p,'height'),-n(p,'width')/2),(x,v,p,_s,at)=>neonPlate(x,v.t,v.sx(at.x),v.y(at.h),{text:String(p.text),col:String(p.color),size:n(p,'fontSize'),w:n(p,'width'),h:n(p,'height'),phase:(n(p,'flickerTimeOffset')*60),dead:n(p,'dead')})), spatial:rectangleControls({width:'width',height:'height',originX:.5,originY:.5})}),
 ({...element('weather-ticker','Registry weather ticker','signage',{width:shapeLength(num('Width',80,1)),height:shapeLength(num('Height',11,1)),mask,smear:appearanceBoolean(bool('Street reflection'))},p=>box(n(p,'width'),n(p,'height'),-n(p,'width')/2),(x,v,p,s,at)=>ticker(x,v,{x:at.x,h:at.h,w:n(p,'width'),tall:n(p,'height'),text:String(s.text),col:YELLOW,speed:0.4,phase:60}),{text:str('Live weather text')}), spatial:rectangleControls({width:'width',height:'height',originX:.5})}),
 ({...element('billboard','Registry billboard frame','signage',{mask,smearColor:appearanceColor(str('Reflection RGB'),"RGB")},()=>box(132,160,-66),(_x,_v,_p,_s,at)=>kernel.drawBillboard(at.x)),spatial:fixedNativeGeometry}),
 ({...element('stall','Noodle stall and lamps','furniture',{width:shapeLength(num('Width',140,1)),mask},p=>box(n(p,'width')+40,150,-20),(_x,_v,p,_s,at)=>kernel.drawStall({x:at.x,w:n(p,'width')})), spatial:rectangleControls({width:'width'})}),
 ({...element('fence','Antenna fence','architecture',{},()=>box(120,44),(_x,_v,_p,_s,at)=>kernel.drawFence(at.x)),spatial:fixedNativeGeometry}),
 element('alley','Lit yard passage','architecture',{doorOffset:shapePosition(num('Passage door X',22))},()=>box(150,190,-40),(_x,_v,p,_s,at)=>kernel.drawAlley(at.x,n(p,'doorOffset'))),
 ({...element('dumpster','Climbable dumpster','props',{width:shapeLength(num('Width',40,1)),height:shapeLength(num('Height',22,1))},p=>box(n(p,'width'),n(p,'height')),(_x,_v,p,_s,at)=>kernel.drawDumpster(at.x,n(p,'width'),n(p,'height'))), spatial:rectangleControls({width:'width',height:'height'})}),
 ({...element('entrance','Door plate and reader','architecture',{kind:appearanceChoice({kind:'select',label:'Door kind',default:'shop',options:['shop','capsule','moth']}),smearColor:appearanceColor(str('Reflection RGB'),"RGB")},()=>box(72,90,-36),(_x,_v,p,_s,at)=>{if(p.kind==='shop')kernel.drawShopDoor(at.x);else if(p.kind==='capsule')kernel.drawCapsuleDoor(at.x);else kernel.drawMothDoor(at.x);}),spatial:fixedNativeGeometry}),
 ({...element('street','Wet street surface','surfaces',{},()=>box(2000,60),()=>kernel.drawStreetSurface()),spatial:fixedNativeGeometry}),
 ({...element('stall-pool','Noodle stall light spill','atmosphere',{},()=>box(180,34),(_x,_v,_p,s)=>{if(s.city){const m=s.metrics as Value[];kernel.drawStallPool(n(s,'rain'),{x:Number(m[0]),w:Number(m[1])});}},{metrics:{kind:'json',label:'Stall x and width',default:[0,140],validate:v=>{if(!Array.isArray(v)||v.length!==2||v.some(q=>typeof q!=='number'))throw new Error('Invalid stall metrics');}},rain:num('Wetness',0,0,1),city:bool('City reflections')}),spatial:fixedNativeGeometry}),
 ({...element('smear','Wet street neon reflection','atmosphere',{source:appearanceText(str('Light instance'))},()=>box(16,44,-8),(_x,_v,_p,s)=>{if(s.city)kernel.drawSmear(n(s,'x'),String(s.color),n(s,'rain'));},{x:num('Resolved lamp x'),color:str('Resolved RGB'),rain:num('Wetness',0,0,1),city:bool('City reflections')}),spatial:fixedNativeGeometry}),
 ({...element('fixer','Noodle stall fixer','characters',{},()=>box(36,60,-18),(_x,_v,_p,_s,at)=>kernel.drawFixer(at.x)),spatial:fixedNativeGeometry}),
 ({...element('counter','Stall counter and steam','furniture',{},(_p,s)=>box(Number((s.metrics as Value[])[1]),66),(_x,_v,_p,s,at)=>kernel.drawCounter({x:at.x,w:Number((s.metrics as Value[])[1])}),{metrics:{kind:'json',label:'Stall x and width',default:[0,140],validate:v=>{if(!Array.isArray(v)||v.length!==2||v.some(q=>typeof q!=='number'))throw new Error('Invalid counter metrics');}}}),spatial:fixedNativeGeometry}),
 ({...element('pedestrian','Street resident','characters',{sprite:appearanceChoice({kind:'select',label:'Appearance',default:'hood',options:['hood','umbrella','hat']}),mirrored:semantic(bool('Face left'),{"group":"Transform","quantity":"boolean","unit":"boolean"})},()=>box(48,60,-24),(_x,_v,p,_s,at)=>kernel.drawPedestrian(at.x,p.sprite as 'hood'|'umbrella'|'hat',!!p.mirrored)),spatial:fixedNativeGeometry}),
 ({...element('library-front','Public library entrance','architecture',{},()=>box(100,120,-50),(x,v,_p,_s,at)=>drawLibraryFront(x,raised(v,at.h),at.x)),spatial:fixedNativeGeometry}),
 ({...element('metro-stairs','Metro street stairs','architecture',{mask},()=>box(100,110,-50),(x,v,_p,_s,at)=>drawMetroStairs(x,raised(v,at.h),at.x)),spatial:fixedNativeGeometry}),
 ({...element('taxi-pad','Sky taxi street stand','vehicles',{mask},()=>box(120,130,-60),(x,v,_p,_s,at)=>drawTaxiPad(x,raised(v,at.h),at.x)),spatial:fixedNativeGeometry}),
];
const devicePainters={sign:devices.drawDeviceSign,box:devices.drawDeviceBox,till:devices.drawDeviceTill,relay:devices.drawDeviceRelay,gate:devices.drawDeviceGate,fence:devices.drawDeviceFence,scan:devices.drawDeviceScan,cam3:devices.drawDeviceCam3,billboard:devices.drawDeviceBillboard,dlv9:devices.drawDeviceDlv9,map:devices.drawDeviceMap,hover:devices.drawDeviceHover};
const empty:devices.DowntownDeviceState={controlled:false,gateHeld:false,lock:'shut',scanned:false,feed:'ads',dlvAt:'home',trace:0,signTestMs:3000,signSince:1e9,visible:true,hoverSpot:null};
export function validateDowntownDeviceSnapshot(value:Value):void {
 const s=value as unknown as devices.DowntownDeviceState;
 if(!s||typeof s!=='object'||Array.isArray(s))throw new Error('Invalid Downtown device snapshot');
 for(const key of Object.keys(s))if(!(key in empty))throw new Error('Unknown Downtown snapshot field '+key);
 for(const key of Object.keys(empty))if(!(key in s)||typeof s[key as keyof typeof s]!==typeof empty[key as keyof typeof empty])throw new Error('Invalid Downtown snapshot field '+key);
 if(s.hoverSpot&&Object.keys(s.hoverSpot).some(k=>!['x','y','w','h'].includes(k)))throw new Error('Unknown Downtown hover spot field');
 if(s.hoverSpot&&(!['x','y','w','h'].every(k=>Number.isFinite(s.hoverSpot![k as keyof typeof s.hoverSpot]))))throw new Error('Invalid Downtown hover spot');
}
for(const id of ['sign','box','till','relay','gate','fence','scan','cam3','billboard','dlv9','map','hover'] as const) {
 const draw=devicePainters[id];
 downtownElements.push({...element('device-'+id,'Downtown '+id,'electronics',id==='hover'?{}:{spotY:shapePosition(num('Spot bottom')),spotWidth:shapeLength(num('Spot width',30,1)),spotHeight:shapeLength(num('Spot height',40,1)),...(id==='sign'?{mask}:{})},(p,s,c)=>{
  if(id==='hover'){
   const spot=(s.snapshot as unknown as devices.DowntownDeviceState|undefined)?.hoverSpot;
   if(!spot)return{x:0,h:0,w:0,tall:0};
   // The hover kernel takes its world center from the live snapshot, not its instance.
   return{x:spot.x-(c?.placement.x??0)-spot.w/2-3,h:spot.y+spot.h+3,w:spot.w+6,tall:spot.h+6};
  }
  const offset=id==='dlv9'&&c?Number(s.position)-c.placement.x:0;
  return{x:offset-n(p,'spotWidth')/2,h:n(p,'spotY')+n(p,'spotHeight'),w:n(p,'spotWidth'),tall:n(p,'spotHeight')};
 },(x,v,_p,s,at)=>draw(x,raised(v,at.h),id==='dlv9'?n(s,'position'):at.x,s.snapshot as unknown as devices.DowntownDeviceState),{snapshot:{kind:'json',label:'Live device snapshot',default:empty as unknown as Value,validate:validateDowntownDeviceSnapshot},...(id==='dlv9'?{position:num('Current route position')}: {})}),bindingIdentity:'presentation'});
}

// Snapshot consumers are presentation; source manifests protect actual live references.
for(const element of downtownElements)element.bindingIdentity="presentation";

downtownElements.find(e=>e.type==='downtown.marker')!.spatial=fixedGeometry('This non-drawing marker supplies gameplay or chunk-layout parameters. Edit its typed fields; it has no visible body to resize.');

for(const e of downtownElements){
 if(e.type==='downtown.device-hover')e.spatial=fixedGeometry('This device highlight follows the prepared interaction target rectangle. Change the device interaction region; this overlay has no independent body size.');
 if(e.type==='downtown.light'){e.selection='region';e.drawingNote=()=>"The shared lighting pass draws this source's glow. Its controls edit the configured light region.";e.spatial=radiusControl('radius');}
 if(e.type.startsWith('downtown.device-')&&e.fields.spotWidth)e.spatial=fixedGeometry('The device artwork has a fixed shape. Spot bottom/width/height define its gameplay interaction region, not the visible body. Edit those region fields without stretching this artwork.');
}

downtownElements.find(e=>e.type==='downtown.alley')!.spatial=axisControl('doorOffset','x',12,'Passage door');

// The skyline fills its native camera band. Height limits edit its generation, not a fake width.
const streetSkyline=downtownElements.find(e=>e.type==='downtown.skyline')!;
streetSkyline.spatial={fields:['minHeight','maxHeight'],validate:p=>{if(Number(p.minHeight)>Number(p.maxHeight))throw Error('Minimum skyline height must not exceed maximum height');},handles:(p,c)=>viewportElevationControls('minHeight','maxHeight').handles({...p,minHeight:Number(p.minHeight)+4,maxHeight:Number(p.maxHeight)+4},c).map(h=>({...h,label:h.fields[0]==='minHeight'?'Minimum skyline height':'Maximum skyline height',edit:d=>({props:{[h.fields[0]]:Number(p[h.fields[0]])+d.h}})}))};
streetSkyline.drawingNote=()=>"This native background fills the camera band. Height limits generate towers above its fixed four-unit skyline datum; scene width supplies repetition extent.";
