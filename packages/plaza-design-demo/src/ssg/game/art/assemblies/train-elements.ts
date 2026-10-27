import {drawCabCeilingLight,drawCabAdvert,drawCabAdTell,drawCabCarPlate,drawCabRegistry,drawCabHandrail,drawCabStrap} from '../vehicles/train-fittings';
import {drawEmergencyBrake} from '../electronics/emergency-brake';
import {drawCabCamera,drawCabPole,drawCabWindow,drawCabStaffDoor,drawCabSeatBack,drawCabSeatFront} from '../vehicles/train-fittings';
/** Train-car pieces. Every draw consumes one explicit, serializable presentation frame. */
import type { AssetDefinition,Field,Properties,Placement,Value } from '../core/composition';
import type { View } from '../core/view';
import { createTrainInteriorArtwork,type ArtworkInputs,type TrainLayout,type TrainVisualState } from './train-interior';
import { drawRider,KINDS,type RiderKind } from '../characters/riders';
import { onScreen } from '../core/primitives';
export interface TrainRiderVisual{on:boolean;kind:RiderKind;sit:boolean;flip:boolean;phase:number;offset:number}
export interface TrainFrame extends ArtworkInputs{riders:Record<string,TrainRiderVisual>}
const num=(label:string,value=0):Field=>({kind:'number',label,default:value,min:-1e5,max:1e5,step:1});
const str=(label:string,value=''):Field=>({kind:'string',label,default:value});
const n=(p:Properties,k:string)=>Number(p[k]);
function validateFrame(v:Value){if(v===null)return;const f=v as unknown as TrainFrame;if(!f||typeof f!=='object'||!f.L||!f.visual||!f.roof||!f.riders||!Array.isArray(f.windows)||!Array.isArray(f.doors)||![f.L.width,f.L.ceil,f.visual.ride.pos,f.visual.ride.open,f.visual.run,f.roof.cove,f.roof.shell,f.roof.wire,f.roof.messenger].every(Number.isFinite)||typeof f.visual.home!=='boolean'||typeof f.visual.ride.phase!=='string'||!(f.hover===null||typeof f.hover==='string'))throw new Error('Invalid train presentation frame');for(const r of Object.values(f.riders))if(typeof r.on!=='boolean'||!KINDS.includes(r.kind)||![r.phase,r.offset].every(Number.isFinite)||typeof r.sit!=='boolean'||typeof r.flip!=='boolean')throw new Error('Invalid train rider snapshot');for(const w of f.windows)if(![w.x,w.h,w.width,w.h0,w.h1].every(Number.isFinite)||w.width<=0||w.h1<=w.h0)throw new Error('Invalid train window opening');}
const frame:Field={kind:'json',label:'Prepared train frame',default:null,validate:validateFrame};
const fields:Record<string,Field>={width:num('Width'),h0:num('Window sill'),h1:num('Window top'),index:num('Card index'),text:str('Card text'),actor:str('Actor id'),homeText:str('Morning card text'),mode:{kind:'select',label:'Rider role',default:'regular',options:['regular','seat','standing']},slot:num('Crowd slot'),kind:{kind:'select',label:'Regular rider',default:'suit',options:[...KINDS]},sit:{kind:'boolean',label:'Seated',default:false}};
const origin={x:0,h:0,role:'origin' as const};
type Method=keyof ReturnType<typeof createTrainInteriorArtwork>;
function base(method:Method,L:TrainLayout):{x:number;h:number}{const positions:Partial<Record<Method,number>>={lineMap:L.lineMap,staffDoor:L.staff,gangwayWall:L.gangway,gangwayDoor:L.gangDoor,brake:L.brake};return{x:positions[method]??0,h:0};}
function E(method:Method):AssetDefinition{return{type:'train.'+method,version:1,label:method.replace(/([A-Z])/g,' $1'),category:'metro car',bindingIdentity:'presentation',coordinates:'world',fields,visualFields:{frame,width:num('Source window width')},parts:['backdrop'],bounds:(p,s)=>{const f=s.frame as unknown as TrainFrame|null,ceil=f?.L.ceil??166,width=f?.L.width??1200;if(method==='windowFrame')return{x:0,h:Number(p.h1),w:Number(p.width),tall:Number(p.h1)-Number(p.h0)};if(method==='seatBack'||method==='seatFront')return{x:-4,h:method==='seatBack'?46:18,w:Number(s.width)+8,tall:method==='seatBack'?34:4};if(method==='drawPole')return{x:-1,h:ceil,w:3,tall:ceil};if(method==='door')return{x:-52,h:112,w:104,tall:112};if(method==='aircon')return{x:0,h:ceil+(f?.roof.cove??14)+(f?.roof.shell??12)+14,w:90,tall:14};if(method==='brake')return{x:-16,h:62,w:32,tall:44};if(['wall','outside','roofOutside','roofShell','floor'].includes(method))return{x:0,h:method==='floor'?0:ceil,w:width,tall:method==='floor'?80:ceil};return{x:-40,h:170,w:Number(p.width)||80,tall:170};},anchors:()=>({origin}),draw(ctx,v,p,s,_pass,at){if(s.frame===null)return;const f=s.frame as unknown as TrainFrame,k=createTrainInteriorArtwork(f),b=base(method,f.L),explicit=['windowFrame','aircon','pantograph','drawCam','drawPole','door','seatBack','seatFront'].includes(method),dh=at.h,dx=explicit?0:at.x-b.x,V:View=dx===0&&dh===0?v:{...v,gy:v.gy-dh,y:h=>v.y(h+dh),sx:(wx,par=1)=>v.sx(wx+dx,par)};
 switch(method){case'windowFrame':k.windowFrame(ctx,V,at.x,n(p,'width'),n(p,'h0'),n(p,'h1'));break;case'aircon':case'pantograph':case'drawCam':case'drawPole':case'door':k[method](ctx,V,at.x);break;case'seatBack':case'seatFront':k[method](ctx,V,at.x,n(s,'width'));break;default:(k[method] as(ctx:CanvasRenderingContext2D,v:View)=>void)(ctx,V);}
 }};}
const methods:Method[]=['outside','roofOutside','roofShell','aircon','pantograph','drawLineMap','drawDoorDisplay','drawCam','drawPole','fill','wall','windowFrame','lineMap','staffDoor','gangwayWall','gangwayDoor','brake','door','seatBack','seatFront','floor'];
export const trainElements:AssetDefinition[]=[...methods.filter(m=>!['drawLineMap','drawDoorDisplay'].includes(m)).map(E),{
 type:'train.rider',version:1,label:'Train passenger',category:'characters',coordinates:'world',fields,visualFields:{frame},parts:['backdrop'],bounds:()=>({x:-16,h:48,w:32,tall:48}),anchors:()=>({origin}),draw(ctx,v,p,s,_pass,at){if(s.frame===null)return;const f=s.frame as unknown as TrainFrame,key=String(p.actor),r=f.riders[key];if(!r)throw new Error('Missing train rider '+key);const sx=v.sx(at.x+r.offset);if(r.on&&onScreen(v,sx-16,32))drawRider(ctx,r.kind,sx,v.y(at.h),v.t,{sit:r.sit,flip:r.flip,phase:r.phase});}
 },{
 type:'train.marker',version:1,label:'Train interaction or shell marker',category:'markers',coordinates:'world',fields:{role:str('Role'),width:num('Width'),height:num('Height'),cove:num('Ceiling cove'),shell:num('Roof shell'),wire:num('Contact wire'),messenger:num('Messenger wire'),text:str('Text')},parts:['backdrop'],bounds:p=>({x:0,h:Number(p.height),w:Number(p.width),tall:Number(p.height)}),anchors:()=>({origin}),draw(){}
 }];
export type TrainPlacement=Readonly<Required<Placement>>;
export const trainFrameValue=(f:TrainFrame):Value=>f as unknown as Value;
export type {TrainVisualState};

const bool=(label:string):Field=>({kind:'boolean',label,default:false});
const pages=(label:string,value:string[][]):Field=>({kind:'json',label,default:value,validate(value){
 if(!Array.isArray(value)||!value.length||value.length>64||value.some(page=>!Array.isArray(page)||!page.length||page.length>12||page.some(line=>typeof line!=='string'||line.length>256)))throw Error('Screen pages require nonempty lists of text lines');
}});
const normalPages=[['KEEP YOUR ID','VISIBLE'],['ALL JOURNEYS','RECORDED'],['REPORT','IRREGULARITIES']];
const morningPages=[['REGISTRY AUDIT','COMPLETE'],['1,204 RECORDS','RETIRED'],['NO ACTION','NEEDED']];
// These fittings consume their own scalar inputs, including in the native train. They do not
// instantiate the room factory or require a prepared train frame in another scene.
for(const id of ['ceilingLight','advert','adTell','carPlate','registryScreen','handrail','strap']){
 const own:Record<string,Field>=id==='advert'?{text:str('Card text','CAMERAS OPERATE IN THIS CAR'),homeText:str('Morning card text','LINE 0 NEWS'),index:{...num('Card index'),min:0}}:
  id==='carPlate'?{text:str('Text','CAR 3 OF 3'),width:{...num('Width',66),min:20},height:{...num('Height',12),min:8}}:
  id==='registryScreen'?{pages:pages('Pages',normalPages),homePages:pages('Morning pages',morningPages)}:
  id==='ceilingLight'?{width:{...num('Width',1200),min:1},ceiling:{...num('Ceiling height',166),min:0}}:
  id==='handrail'?{width:{...num('Width',1200),min:1}}:{};
 const visual:Record<string,Field>=id==='advert'?{home:bool('Morning news'),news:str('News','LINE 0 NEWS')}:
  id==='registryScreen'?{home:bool('Morning audit')}:
  id==='strap'?{running:bool('Running'),run:{...num('Journey progress'),min:0,max:1,step:.01}}:
  id==='ceilingLight'?{width:{...num('Bound width'),min:0},ceiling:{...num('Bound ceiling',-1),min:-1}}:
  id==='handrail'?{width:{...num('Bound width'),min:0}}:{};
 trainElements.push({type:'train.'+id,version:1,label:id.replace(/([A-Z])/g,' $1'),category:'metro car',coordinates:'world',libraryUse:'reusable',fields:own,visualFields:visual,parts:['backdrop'],anchors:()=>({origin}),
  bindingChoices:doc=>doc.scene==='train'?Object.fromEntries(Object.keys(visual).map(key=>[key,['train.'+key]])):{},
  bounds(p,state){const width=Number(state.width)>0?Number(state.width):Number(p.width),ceiling=Number(state.ceiling)>=0?Number(state.ceiling):Number(p.ceiling);
   if(id==='ceilingLight')return{x:0,h:ceiling,w:width,tall:40};
   if(id==='advert')return{x:-72,h:156,w:144,tall:16};
   if(id==='adTell')return{x:53,h:160,w:24,tall:24};
   if(id==='carPlate')return{x:35-width/2-12,h:84,w:width+24,tall:Number(p.height)+24};
   if(id==='registryScreen')return{x:-24,h:147,w:118,tall:76};
   if(id==='handrail')return{x:0,h:0,w:width,tall:2};
   return{x:-8,h:-1,w:16,tall:18};
  },
  draw(ctx,v,p,state,_pass,at){const V=at.h===0?v:{...v,gy:v.gy-at.h,y:(h:number)=>v.y(h+at.h)},width=Number(state.width)>0?Number(state.width):Number(p.width),ceiling=Number(state.ceiling)>=0?Number(state.ceiling):Number(p.ceiling);
   switch(id){case'ceilingLight':drawCabCeilingLight(ctx,V,at.x,width,ceiling);break;
    case'advert':drawCabAdvert(ctx,V,at.x,String(p.text),String(p.homeText),Number(p.index),!!state.home,String(state.news));break;
    case'adTell':drawCabAdTell(ctx,V,at.x);break;
    case'carPlate':drawCabCarPlate(ctx,V,at.x,String(p.text),Number(p.width),Number(p.height));break;
    case'registryScreen':drawCabRegistry(ctx,V,at.x,(state.home?p.homePages:p.pages) as string[][]);break;
    case'handrail':drawCabHandrail(ctx,v,at.x,width,at.h);break;
    case'strap':drawCabStrap(ctx,v,at.x,at.h,!!state.running,Number(state.run));break;
   }
  }});
}

// Frame bindings carry presentation only; live source refs protect structural inputs.
for(const element of trainElements)element.bindingIdentity="presentation";

for(const element of trainElements)if(element.visualFields?.frame)element.bindingChoices=composition=>{
 if(composition.scene!=='train')return{};
 const flatten=(nodes:readonly import('../core/composition').AssetInstance[]):import('../core/composition').AssetInstance[]=>nodes.flatMap(n=>[n,...flatten(n.children??[])]);
 return{frame:['train.frame'],...(['train.seatBack','train.seatFront'].includes(element.type)?{width:flatten(composition.instances).filter(n=>n.type==='train.windowFrame').map(n=>'train.'+n.id+'.width')}: {})};
};

// The brake is an independent fitting; the prepared car frame supplies its native state/culling
// while standalone placement can preview the same state explicitly without a train controller.
const brakeIndex=trainElements.findIndex(e=>e.type==='train.brake');
trainElements[brakeIndex]={...trainElements[brakeIndex],libraryUse:'reusable',fields:{},
 visualFields:{frame,pulled:{kind:'boolean',label:'Brake pulled',default:false},highlight:{kind:'boolean',label:'Highlighted',default:false}},
 draw(ctx,v,_p,state,_pass,at){const f=state.frame as unknown as TrainFrame|null;
  if(f&&!onScreen(v,v.sx(f.L.gangway+at.x-f.L.brake),80))return;
  const h=at.h,V=h===0?v:{...v,gy:v.gy-h,y:(q:number)=>v.y(q+h)};
  drawEmergencyBrake(ctx,V,at.x,f?f.visual.ride.phase==='braking'||f.visual.ride.phase==='halted':!!state.pulled,f?f.hover==='train':!!state.highlight);
 }};

// Fittings have their own geometry. The native frame may supply the current ceiling/window
// width, but ordinary placement does not require a fabricated train layout or ride snapshot.
for(const id of ['drawCam','drawPole','windowFrame','staffDoor','seatBack','seatFront']){
 const index=trainElements.findIndex(e=>e.type==='train.'+id),seat=id.startsWith('seat'),ceiling=id==='drawCam'||id==='drawPole';
 trainElements[index]={...trainElements[index],libraryUse:'reusable',
  fields:id==='windowFrame'?{width:num('Window width',100),h0:num('Window sill',52),h1:num('Window top',128)}:seat?{width:num('Bench width',100)}:ceiling?{ceiling:num('Ceiling height',166)}:{},
  visualFields:{frame,...(seat?{width:num('Bound window width')}: {})},
  bounds(p,state){const f=state.frame as unknown as TrainFrame|null,h=f?.L.ceil??Number(p.ceiling??166),w=Number(state.width)||Number(p.width??100);
   if(id==='drawCam')return{x:-10,h,w:20,tall:14};
   if(id==='drawPole')return{x:-1,h,w:3,tall:h};
   if(id==='windowFrame')return{x:0,h:Number(p.h1),w:Number(p.width),tall:Number(p.h1)-Number(p.h0)};
   if(id==='staffDoor')return{x:-16,h:70,w:32,tall:70};
   return{x:-4,h:id==='seatBack'?46:18,w:w+8,tall:id==='seatBack'?34:4};
  },
  draw(ctx,v,p,state,_pass,at){const f=state.frame as unknown as TrainFrame|null,h=f?.L.ceil??Number(p.ceiling??166),w=Number(state.width)||Number(p.width??100),V=at.h===0?v:{...v,gy:v.gy-at.h,y:(q:number)=>v.y(q+at.h)};
   switch(id){case'drawCam':drawCabCamera(ctx,V,at.x,h);break;case'drawPole':drawCabPole(ctx,V,at.x,h);break;case'windowFrame':drawCabWindow(ctx,V,at.x,Number(p.width),Number(p.h0),Number(p.h1));break;case'staffDoor':drawCabStaffDoor(ctx,V,at.x);break;case'seatBack':drawCabSeatBack(ctx,V,at.x,w);break;case'seatFront':drawCabSeatFront(ctx,V,at.x,w);break;}
  }};
}
