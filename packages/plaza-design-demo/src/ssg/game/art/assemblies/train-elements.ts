/** Train-car pieces. Every draw consumes one explicit, serializable presentation frame. */
import type { Element,Field,Properties,Placement,Value } from '../core/composition';
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
function base(method:Method,L:TrainLayout):{x:number;h:number}{const positions:Partial<Record<Method,number>>={lineMap:L.lineMap,staffDoor:L.staff,gangwayWall:L.gangway,gangwayDoor:L.gangDoor,carPlate:L.gangway,brake:L.brake,registryScreen:L.gangway};return{x:positions[method]??0,h:method==='handrail'||method==='strap'?L.bar:0};}
function E(method:Method):Element{return{type:'train.'+method,version:1,label:method.replace(/([A-Z])/g,' $1'),category:'metro car',bindingIdentity:'presentation',coordinates:'world',fields,visualFields:{frame,width:num('Source window width')},parts:['backdrop'],bounds:(p,s)=>{const f=s.frame as unknown as TrainFrame|null,ceil=f?.L.ceil??166,width=f?.L.width??1200;if(method==='windowFrame')return{x:0,h:Number(p.h1),w:Number(p.width),tall:Number(p.h1)-Number(p.h0)};if(method==='seatBack'||method==='seatFront')return{x:-4,h:method==='seatBack'?46:18,w:Number(s.width)+8,tall:method==='seatBack'?34:4};if(method==='drawPole')return{x:-1,h:ceil,w:3,tall:ceil};if(method==='door')return{x:-52,h:112,w:104,tall:112};if(method==='advert')return{x:-72,h:156,w:144,tall:16};if(method==='aircon')return{x:0,h:ceil+(f?.roof.cove??14)+(f?.roof.shell??12)+14,w:90,tall:14};if(method==='brake')return{x:-16,h:62,w:32,tall:44};if(['wall','outside','roofOutside','roofShell','floor','handrail','ceilingLight'].includes(method))return{x:0,h:method==='handrail'||method==='floor'?0:ceil,w:width,tall:method==='floor'?80:ceil};return{x:-40,h:170,w:Number(p.width)||80,tall:170};},anchors:()=>({origin}),draw(ctx,v,p,s,_pass,at){if(s.frame===null)return;const f=s.frame as unknown as TrainFrame,k=createTrainInteriorArtwork(f),b=base(method,f.L),explicit=['windowFrame','advert','aircon','pantograph','drawCam','drawPole','door','seatBack','seatFront','adTell'].includes(method),dh=at.h-(explicit?0:b.h),dx=explicit||method==='strap'?0:at.x-b.x,V:View=dx===0&&dh===0?v:{...v,gy:v.gy-dh,y:h=>v.y(h+dh),sx:(wx,par=1)=>v.sx(wx+dx,par)};
 switch(method){case'windowFrame':k.windowFrame(ctx,V,at.x,n(p,'width'),n(p,'h0'),n(p,'h1'));break;case'advert':k.advert(ctx,V,{x:at.x,text:String(p.text)},n(p,'index'));break;case'aircon':case'pantograph':case'drawCam':case'drawPole':case'door':case'adTell':k[method](ctx,V,at.x);break;case'seatBack':case'seatFront':k[method](ctx,V,at.x,n(s,'width'));break;case'strap':k.strap(ctx,V,at.x);break;default:(k[method] as(ctx:CanvasRenderingContext2D,v:View)=>void)(ctx,V);}
 }};}
const methods:Method[]=['outside','roofOutside','roofShell','aircon','pantograph','drawLineMap','drawDoorDisplay','drawCam','drawPole','fill','wall','windowFrame','ceilingLight','advert','adTell','lineMap','staffDoor','gangwayWall','gangwayDoor','carPlate','brake','registryScreen','door','seatBack','seatFront','handrail','strap','floor'];
export const trainElements:Element[]=[...methods.filter(m=>!['drawLineMap','drawDoorDisplay'].includes(m)).map(E),{
 type:'train.rider',version:1,label:'Train passenger',category:'characters',coordinates:'world',fields,visualFields:{frame},parts:['backdrop'],bounds:()=>({x:-16,h:48,w:32,tall:48}),anchors:()=>({origin}),draw(ctx,v,p,s,_pass,at){if(s.frame===null)return;const f=s.frame as unknown as TrainFrame,key=String(p.actor),r=f.riders[key];if(!r)throw new Error('Missing train rider '+key);const sx=v.sx(at.x+r.offset);if(r.on&&onScreen(v,sx-16,32))drawRider(ctx,r.kind,sx,v.y(at.h),v.t,{sit:r.sit,flip:r.flip,phase:r.phase});}
 },{
 type:'train.marker',version:1,label:'Train interaction or shell marker',category:'markers',coordinates:'world',fields:{role:str('Role'),width:num('Width'),height:num('Height'),cove:num('Ceiling cove'),shell:num('Roof shell'),wire:num('Contact wire'),messenger:num('Messenger wire'),text:str('Text')},parts:['backdrop'],bounds:p=>({x:0,h:Number(p.height),w:Number(p.width),tall:Number(p.height)}),anchors:()=>({origin}),draw(){}
 }];
export type TrainPlacement=Readonly<Required<Placement>>;
export const trainFrameValue=(f:TrainFrame):Value=>f as unknown as Value;
export type {TrainVisualState};

// Frame bindings carry presentation only; live source refs protect structural inputs.
for(const element of trainElements)element.bindingIdentity="presentation";

for(const element of trainElements)if(element.visualFields?.frame)element.bindingChoices=composition=>{
 if(composition.scene!=='train')return{};
 const flatten=(nodes:readonly import('../core/composition').Instance[]):import('../core/composition').Instance[]=>nodes.flatMap(n=>[n,...flatten(n.children??[])]);
 return{frame:['train.frame'],...(['train.seatBack','train.seatFront'].includes(element.type)?{width:flatten(composition.instances).filter(n=>n.type==='train.windowFrame').map(n=>'train.'+n.id+'.width')}: {})};
};
