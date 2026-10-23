/** Reusable Downtown pieces. Scene layout and simulation snapshots are explicit inputs. */
import { DowntownArtwork, type Front } from './downtown';
import { drawLibraryFront } from './library';
import { drawMetroStairs } from '../architecture/metro-stairs';
import { drawTaxiPad } from './taxi-pad';
import { ticker, YELLOW } from '../signage/screens';
import { neonPlate } from '../signage/kit';
import { windowMask } from '../signage/kit-elements';
import type { Anchor, Bounds, Element, Field, Placement, Properties, Value } from '../core/composition';
import type { View } from '../core/view';
import * as devices from '../electronics/downtown-devices';
const num=(label:string,value=0,min=-10000,max=10000):Field=>({kind:'number',label,default:value,min,max,step:1});
const bool=(label:string,value=false):Field=>({kind:'boolean',label,default:value});
const str=(label:string,value=''):Field=>({kind:'string',label,default:value});
const n=(p:Properties,k:string)=>Number(p[k]);
const origin:Anchor={x:0,h:0,role:'origin'};
const box=(w:number,h:number,x=0):Bounds=>({x,h,w,tall:h});
const raised=(v:View,h:number):View=>h===0?v:{...v,gy:v.gy-h,y:q=>v.y(q+h)};
const kernel=new DowntownArtwork();
// These kernels consume only their own properties, placement and explicit visual state.
// Parent metrics, screen fills and the routed delivery sprite retain their context contract.
const independent=new Set(['front','window','bay','penthouse','neon-sign','weather-ticker','billboard','stall','fence','alley','dumpster','entrance','fixer','counter','pedestrian','library-front','metro-stairs','taxi-pad',...['sign','box','till','relay','gate','fence','scan','cam3','billboard','map'].map(id=>'device-'+id)]);
type Draw=(x:CanvasRenderingContext2D,v:View,p:Properties,s:Properties,at:Required<Placement>)=>void;
function element(type:string,label:string,category:string,fields:Record<string,Field>,bounds:Element['bounds'],draw:Draw,visualFields:Record<string,Field>={}):Element {
 return {type:'downtown.'+type,version:1,label,category,coordinates:'world',libraryUse:independent.has(type)?'reusable':undefined,fields,visualFields,parts:['backdrop'],bounds,anchors:p=>({origin,top:{x:0,h:Number(p.height??0),role:'surface'},right:{x:Number(p.width??0),h:0,role:'mount'},topCenter:{x:Number(p.width??0)/2,h:Number(p.height??0),role:'surface'}}),
  draw(x,v,p,s,_pass,at){kernel.set(x,raised(v,at.h));draw(x,v,p,s,at);}};
}
const mask:Field=windowMask;
const enabled={enabled:bool('Visible on parent front',true)};
const metrics:Field={kind:'json',label:'Resolved parent dimensions and visibility',default:[0,0,false,true],validate:v=>{if(!Array.isArray(v)||v.length!==4||typeof v[0]!=='number'||typeof v[1]!=='number'||typeof v[2]!=='boolean'||typeof v[3]!=='boolean')throw new Error('Invalid front metrics');}};
const front=(s:Properties,at:Required<Placement>):Front=>{const m=s.metrics as Value[];return{x:at.x,w:Number(m[0]),h:Number(m[1]),roof:!!m[2]};};
export const downtownElements:Element[]=[
 element('marker','Gameplay marker','markers',{role:str('Role','exit'),width:num('Width'),height:num('Height')},p=>box(n(p,'width'),n(p,'height')),()=>{}),
 element('light','Attached scene light','atmosphere',{kind:{kind:'select',label:'Light kind',default:'lamp',options:['lamp','window','neon','screen','head']},radius:num('Radius',56,1),color:str('Optional RGB'),alpha:num('Optional alpha',-1,-1,1)},p=>({x:-n(p,'radius'),h:n(p,'radius'),w:n(p,'radius')*2,tall:n(p,'radius')*2}),()=>{}),
 element('skyline','Seeded skyline lane','environment',{parallax:num('Parallax',0.18,0,2),seed:num('Seed',7,0),minHeight:num('Minimum height',70,0),maxHeight:num('Maximum height',150,0),alpha:num('Edge alpha',0.18,0,1),litChance:num('Window probability',0.12,0,1)},()=>box(2000,260),(x,v,p,s,at)=>{kernel.set(x,{...raised(v,at.h),cam:v.cam-at.x});kernel.drawSkyline(n(p,'parallax'),n(p,'seed'),n(p,'minHeight'),n(p,'maxHeight'),n(p,'alpha'),n(p,'litChance'),n(s,'width'));},{width:num('Street width',2000,1)}),
 element('antenna','Street antenna','architecture',{},()=>box(44,400,-22),(_x,_v,_p,_s,at)=>kernel.drawAntenna(at.x)),
 element('front','Street wall and storey bands','architecture',{width:num('Width',150,1),height:num('Height',340,1),roof:bool('Climbable roof'),seed:num('Stable front seed',0,0)},p=>box(n(p,'width'),n(p,'height')),(_x,v,p,_s,at)=>{const sx=v.sx(at.x),end=sx+n(p,'width')*at.scale*at.facing;if(Math.max(sx,end)+4*at.scale<0||Math.min(sx,end)-4*at.scale>v.viewW)return;kernel.drawFrontBody({x:at.x,w:n(p,'width'),h:n(p,'height'),roof:!!p.roof},sx);}),
 element('front-trim','Cornice and shop fascia','architecture',{},(_p,s)=>box(Number((s.metrics as Value[])[0]),Number((s.metrics as Value[])[1])),(_x,v,_p,s,at)=>{if(!(s.metrics as Value[])[3])return;kernel.drawFrontTrim(front(s,at),v.sx(at.x));},{metrics}),
 element('window','Storey window, blinds and AC','architecture',{light:num('Seeded room light',-1,-1,8),ac:bool('Air conditioner'),seed:num('Stable light seed',0,0,1000000000)},()=>({x:-1,h:0,w:16,tall:38}),(_x,v,p,s,at)=>{kernel.set(_x,v);if(s.enabled)kernel.drawWindow(v.sx(at.x),v.y(at.h),n(p,'light'),!!p.ac,n(p,'seed'));},enabled),
 element('bay','Ground-floor opening','architecture',{width:num('Width',24,1),kind:{kind:'select',label:'Opening',default:'door',options:['door','glass','shutter','sealed']}},p=>box(n(p,'width'),64),(_x,v,p,s,at)=>{if(s.enabled)kernel.drawBay(v.sx(at.x),n(p,'width'),p.kind as 'door'|'glass'|'shutter'|'sealed');},enabled),
 element('penthouse','Penthouse window and plate','architecture',{},()=>box(60,280,-30),(_x,_v,_p,_s,at)=>kernel.drawPenthouse(at.x)),
 element('neon-sign','Bolted neon plate','signage',{width:num('Plate width',96,1),height:num('Plate height',15,1),text:str('Letters'),color:str('RGB color','0,255,255'),size:num('Letter size',10,1,64),phase:num('Flicker phase'),dead:num('Burnt-out letter (-1 none)',-1,-1,64),mask,smear:bool('Street reflection')},p=>box(n(p,'width'),n(p,'height'),-n(p,'width')/2),(x,v,p,_s,at)=>neonPlate(x,v.t,v.sx(at.x),v.y(at.h),{text:String(p.text),col:String(p.color),size:n(p,'size'),w:n(p,'width'),h:n(p,'height'),phase:n(p,'phase'),dead:n(p,'dead')})),
 element('weather-ticker','Registry weather ticker','signage',{width:num('Width',80,1),height:num('Height',11,1),mask,smear:bool('Street reflection')},p=>box(n(p,'width'),n(p,'height'),-n(p,'width')/2),(x,v,p,s,at)=>ticker(x,v,{x:at.x,h:at.h,w:n(p,'width'),tall:n(p,'height'),text:String(s.text),col:YELLOW,speed:0.4,phase:60}),{text:str('Live weather text')}),
 element('billboard','Registry billboard frame','signage',{mask,smearColor:str('Reflection RGB')},()=>box(132,160,-66),(_x,_v,_p,_s,at)=>kernel.drawBillboard(at.x)),
 element('stall','Noodle stall and lamps','furniture',{width:num('Width',140,1),mask},p=>box(n(p,'width')+40,150,-20),(_x,_v,p,_s,at)=>kernel.drawStall({x:at.x,w:n(p,'width')})),
 element('fence','Antenna fence','architecture',{},()=>box(120,44),(_x,_v,_p,_s,at)=>kernel.drawFence(at.x)),
 element('alley','Lit yard passage','architecture',{doorOffset:num('Passage door drawing offset',22)},()=>box(150,190,-40),(_x,_v,_p,s,at)=>kernel.drawAlley(at.x,n(s,'doorOffset')),{doorOffset:num('Yard door offset',22)}),
 element('dumpster','Climbable dumpster','props',{width:num('Width',40,1),height:num('Height',22,1)},p=>box(n(p,'width'),n(p,'height')),(_x,_v,p,_s,at)=>kernel.drawDumpster(at.x,n(p,'width'),n(p,'height'))),
 element('entrance','Door plate and reader','architecture',{kind:{kind:'select',label:'Door kind',default:'shop',options:['shop','capsule','moth']},smearColor:str('Reflection RGB')},()=>box(72,90,-36),(_x,_v,p,_s,at)=>{if(p.kind==='shop')kernel.drawShopDoor(at.x);else if(p.kind==='capsule')kernel.drawCapsuleDoor(at.x);else kernel.drawMothDoor(at.x);}),
 element('street','Wet street surface','surfaces',{},()=>box(2000,60),()=>kernel.drawStreetSurface()),
 element('stall-pool','Noodle stall light spill','atmosphere',{},()=>box(180,34),(_x,_v,_p,s)=>{if(s.city){const m=s.metrics as Value[];kernel.drawStallPool(n(s,'rain'),{x:Number(m[0]),w:Number(m[1])});}},{metrics:{kind:'json',label:'Stall x and width',default:[0,140],validate:v=>{if(!Array.isArray(v)||v.length!==2||v.some(q=>typeof q!=='number'))throw new Error('Invalid stall metrics');}},rain:num('Wetness',0,0,1),city:bool('City reflections')}),
 element('smear','Wet street neon reflection','atmosphere',{source:str('Light instance')},()=>box(16,44,-8),(_x,_v,_p,s)=>{if(s.city)kernel.drawSmear(n(s,'x'),String(s.color),n(s,'rain'));},{x:num('Resolved lamp x'),color:str('Resolved RGB'),rain:num('Wetness',0,0,1),city:bool('City reflections')}),
 element('fixer','Noodle stall fixer','characters',{},()=>box(36,60,-18),(_x,_v,_p,_s,at)=>kernel.drawFixer(at.x)),
 element('counter','Stall counter and steam','furniture',{},(_p,s)=>box(Number((s.metrics as Value[])[1]),66),(_x,_v,_p,s,at)=>kernel.drawCounter({x:at.x,w:Number((s.metrics as Value[])[1])}),{metrics:{kind:'json',label:'Stall x and width',default:[0,140],validate:v=>{if(!Array.isArray(v)||v.length!==2||v.some(q=>typeof q!=='number'))throw new Error('Invalid counter metrics');}}}),
 element('pedestrian','Street resident','characters',{sprite:{kind:'select',label:'Appearance',default:'hood',options:['hood','umbrella','hat']},flip:bool('Face left')},()=>box(48,60,-24),(_x,_v,p,_s,at)=>kernel.drawPedestrian(at.x,p.sprite as 'hood'|'umbrella'|'hat',!!p.flip)),
 element('library-front','Public library entrance','architecture',{},()=>box(100,120,-50),(x,v,_p,_s,at)=>drawLibraryFront(x,raised(v,at.h),at.x)),
 element('metro-stairs','Metro street stairs','architecture',{mask},()=>box(100,110,-50),(x,v,_p,_s,at)=>drawMetroStairs(x,raised(v,at.h),at.x)),
 element('taxi-pad','Sky taxi street stand','vehicles',{mask},()=>box(120,130,-60),(x,v,_p,_s,at)=>drawTaxiPad(x,raised(v,at.h),at.x)),
];
const empty:devices.DowntownDeviceState={controlled:false,gateHeld:false,lock:'shut',scanned:false,feed:'ads',dlvAt:'home',trace:0,signTestMs:3000,signSince:1e9,visible:true,hoverSpot:null};
export function validateDowntownDeviceSnapshot(value:Value):void {
 const s=value as unknown as devices.DowntownDeviceState;
 if(!s||typeof s!=='object'||Array.isArray(s))throw new Error('Invalid Downtown device snapshot');
 for(const key of Object.keys(s))if(!(key in empty))throw new Error('Unknown Downtown snapshot field '+key);
 for(const key of Object.keys(empty))if(!(key in s)||typeof s[key as keyof typeof s]!==typeof empty[key as keyof typeof empty])throw new Error('Invalid Downtown snapshot field '+key);
 if(s.hoverSpot&&Object.keys(s.hoverSpot).some(k=>!['x','y','w','h'].includes(k)))throw new Error('Unknown Downtown hover spot field');
 if(s.hoverSpot&&(!['x','y','w','h'].every(k=>Number.isFinite(s.hoverSpot![k as keyof typeof s.hoverSpot]))))throw new Error('Invalid Downtown hover spot');
}
for(const id of ['sign','box','till','relay','gate','fence','scan','cam3','billboard','dlv9','map','hover']) {
 const name='drawDevice'+id[0].toUpperCase()+id.slice(1),draw=devices[name as keyof typeof devices] as (x:CanvasRenderingContext2D,v:View,wx:number,state:devices.DowntownDeviceState)=>void;
 downtownElements.push({...element('device-'+id,'Downtown '+id,'electronics',id==='hover'?{}:{spotY:num('Spot bottom'),spotWidth:num('Spot width',30,1),spotHeight:num('Spot height',40,1),...(id==='sign'?{mask}:{})},(p,s,c)=>{
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
