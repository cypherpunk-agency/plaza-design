import {fixedGeometry} from '../core/spatial';
import {rectangleControls,combineControls,verticalRangeControls,axisControl} from '../core/spatial';
import {textPagesEditor} from '../core/fields';
import {textField,booleanField} from '../core/fields';
import {numericFields} from '../core/fields';
import {appearanceBoolean,appearanceStructure,appearanceText,semantic,shapeLength,shapePosition} from '../core/fields';
import {drawCabCeilingLight,drawCabAdvert,drawCabAdTell,drawCabCarPlate,drawCabRegistry,drawCabHandrail,drawCabStrap} from '../vehicles/train-fittings';
import {drawEmergencyBrake} from '../electronics/emergency-brake';
import {drawCabCamera,drawCabPole,drawCabWindow,drawCabStaffDoor,drawCabSeatBack,drawCabSeatFront} from '../vehicles/train-fittings';
/** Train-car pieces. Every draw consumes one explicit, serializable presentation frame. */
import type { AssetDefinition,Field,Placement,Value } from '../core/composition';
import type { View } from '../core/view';
import { createTrainInteriorArtwork,type ArtworkInputs,type TrainLayout,type TrainVisualState } from './train-interior';
import { drawRider,KINDS,type RiderKind } from '../characters/riders';
import { onScreen } from '../core/primitives';
const fixedNativeGeometry=fixedGeometry("This train-interior layer follows the prepared car frame or its fixed native fitting. Edit the source car geometry and supported scalar links; this layer has no independently authored size.");
export interface TrainRiderVisual{on:boolean;kind:RiderKind;sit:boolean;flip:boolean;phase:number;offset:number}
export interface TrainFrame extends ArtworkInputs{riders:Record<string,TrainRiderVisual>}
const num=numericFields({value:0,min:-1e5,max:1e5,step:1});
const str=textField;
function validateFrame(v:Value){if(v===null)return;const f=v as unknown as TrainFrame;if(!f||typeof f!=='object'||!f.L||!f.visual||!f.roof||!f.riders||!Array.isArray(f.windows)||!Array.isArray(f.doors)||![f.L.width,f.L.ceil,f.visual.ride.pos,f.visual.ride.open,f.visual.run,f.roof.cove,f.roof.shell,f.roof.wire,f.roof.messenger].every(Number.isFinite)||typeof f.visual.home!=='boolean'||typeof f.visual.ride.phase!=='string'||!(f.hover===null||typeof f.hover==='string'))throw new Error('Invalid train presentation frame');for(const r of Object.values(f.riders))if(typeof r.on!=='boolean'||!KINDS.includes(r.kind)||![r.phase,r.offset].every(Number.isFinite)||typeof r.sit!=='boolean'||typeof r.flip!=='boolean')throw new Error('Invalid train rider snapshot');for(const w of f.windows)if(![w.x,w.h,w.width,w.h0,w.h1].every(Number.isFinite)||w.width<=0||w.h1<=w.h0)throw new Error('Invalid train window opening');}
const frame:Field={kind:'json',label:'Prepared train frame',default:null,validate:validateFrame};
const origin={x:0,h:0,role:'origin' as const};
// These existing scalar bindings replace a local fallback through the shared resolver.
const linkedWidth=(field:Field):Field=>({...field,stateOverride:{state:'width',space:'world'}});
const linkedCeiling=(field:Field):Field=>({...field,stateOverride:{state:'ceiling',space:'local',allowZero:true}});
type Method=keyof ReturnType<typeof createTrainInteriorArtwork>;
function base(method:Method,L:TrainLayout):{x:number;h:number}{const positions:Partial<Record<Method,number>>={lineMap:L.lineMap,staffDoor:L.staff,gangwayWall:L.gangway,gangwayDoor:L.gangDoor,brake:L.brake};return{x:positions[method]??0,h:0};}
// These pieces consume the prepared car geometry; they advertise no unrelated authored sizes.
const methods:Method[]=['outside','roofOutside','roofShell','aircon','pantograph','fill','wall','lineMap','gangwayWall','gangwayDoor','door','floor'];
function E(method:Method):AssetDefinition{return{
 spatial:fixedNativeGeometry,type:'train.'+method,version:1,label:method.replace(/([A-Z])/g,' $1'),category:'metro car',coordinates:'world',fields:{},visualFields:{frame},parts:['backdrop'],
 bounds:(_p,state)=>{const f=state.frame as unknown as TrainFrame|null,ceil=f?.L.ceil??166,width=f?.L.width??1200;
  if(method==='door')return{x:-52,h:112,w:104,tall:112};
  if(method==='aircon')return{x:0,h:ceil+(f?.roof.cove??14)+(f?.roof.shell??12)+14,w:90,tall:14};
  if(['wall','outside','roofOutside','roofShell','floor'].includes(method))return{x:0,h:method==='floor'?0:ceil,w:width,tall:method==='floor'?80:ceil};
  return{x:-40,h:170,w:80,tall:170};
 },anchors:()=>({origin}),
 draw(ctx,v,_p,state,_pass,at){if(state.frame===null)return;const f=state.frame as unknown as TrainFrame,k=createTrainInteriorArtwork(f),b=base(method,f.L),explicit=['aircon','pantograph','door'].includes(method),dh=at.h,dx=explicit?0:at.x-b.x;
  const V:View=dx===0&&dh===0?v:{...v,gy:v.gy-dh,y:h=>v.y(h+dh),sx:(wx,par=1)=>v.sx(wx+dx,par)};
  if(method==='aircon'||method==='pantograph'||method==='door')k[method](ctx,V,at.x);else(k[method] as(ctx:CanvasRenderingContext2D,v:View)=>void)(ctx,V);
 }
};}
export const trainElements:AssetDefinition[]=[...methods.map(E),{spatial:fixedNativeGeometry,
 type:'train.rider',version:1,label:'Train passenger',category:'characters',coordinates:'world',fields:{actor:semantic({...str('Actor id'),animatable:false},{group:'Appearance',quantity:'reference',unit:'identifier'})},visualFields:{frame},parts:['backdrop'],bounds:()=>({x:-16,h:48,w:32,tall:48}),anchors:()=>({origin}),draw(ctx,v,p,s,_pass,at){if(s.frame===null)return;const f=s.frame as unknown as TrainFrame,key=String(p.actor),r=f.riders[key];if(!r)throw new Error('Missing train rider '+key);const sx=v.sx(at.x+r.offset);if(r.on&&onScreen(v,sx-16,32))drawRider(ctx,r.kind,sx,v.y(at.h),v.t,{sit:r.sit,flip:r.flip,phase:r.phase});}
 },{
 type:'train.marker',version:1,label:'Train interaction or shell marker',category:'markers',coordinates:'world',fields:{role:semantic(str('Role'),{"group":"Appearance","quantity":"reference","unit":"identifier"}),width:shapeLength(num('Width')),height:shapeLength(num('Height')),cove:shapeLength(num('Ceiling cove')),shell:shapeLength(num('Roof shell')),wire:shapeLength(num('Contact wire')),messenger:shapeLength(num('Messenger wire')),text:appearanceText(str('Text'))},parts:['backdrop'],bounds:p=>({x:0,h:Number(p.height),w:Number(p.width),tall:Number(p.height)}),anchors:()=>({origin}),draw(){}
 }];
export type TrainPlacement=Readonly<Required<Placement>>;
export const trainFrameValue=(f:TrainFrame):Value=>f as unknown as Value;
export type {TrainVisualState};

const bool=booleanField;
const pages=(label:string,value:string[][]):Field=>({kind:'json',label,default:value,validate(value){
 if(!Array.isArray(value)||!value.length||value.length>64||value.some(page=>!Array.isArray(page)||!page.length||page.length>12||page.some(line=>typeof line!=='string'||line.length>256)))throw Error('Screen pages require nonempty lists of text lines');
}});
const normalPages=[['KEEP YOUR ID','VISIBLE'],['ALL JOURNEYS','RECORDED'],['REPORT','IRREGULARITIES']];
const morningPages=[['REGISTRY AUDIT','COMPLETE'],['1,204 RECORDS','RETIRED'],['NO ACTION','NEEDED']];
// These fittings consume their own scalar inputs, including in the native train. They do not
// instantiate the room factory or require a prepared train frame in another scene.
for(const id of ['ceilingLight','advert','adTell','carPlate','registryScreen','handrail','strap']){
 const own:Record<string,Field>=id==='advert'?{text:appearanceText(str('Card text','CAMERAS OPERATE IN THIS CAR')),homeText:appearanceText(str('Morning card text','LINE 0 NEWS')),index:{...semantic(num('Card index'),{group:'Appearance',quantity:'index',unit:'integer'}),min:0}}:
  id==='carPlate'?{text:appearanceText(str('Text','CAR 3 OF 3')),width:{...shapeLength(num('Width',66)),min:20},height:{...shapeLength(num('Height',12)),min:8}}:
  id==='registryScreen'?{pages:appearanceStructure(textPagesEditor(pages('Pages',normalPages))),homePages:appearanceStructure(textPagesEditor(pages('Morning pages',morningPages)))}:
  id==='ceilingLight'?{width:linkedWidth({...shapeLength(num('Width',1200)),min:1}),ceilingHeight:linkedCeiling({...shapePosition(num('Ceiling height',166)),min:0})}:
  id==='handrail'?{width:linkedWidth({...shapeLength(num('Width',1200)),min:1})}:{};
 const visual:Record<string,Field>=id==='advert'?{home:bool('Morning news'),news:str('News','LINE 0 NEWS')}:
  id==='registryScreen'?{home:bool('Morning audit')}:
  id==='strap'?{running:appearanceBoolean(bool('Running')),run:{...num('Journey progress'),min:0,max:1,step:.01}}:
  id==='ceilingLight'?{width:{...num('Bound width'),min:0},ceiling:{...num('Bound ceiling',-1),min:-1}}:
  id==='handrail'?{width:{...num('Bound width'),min:0}}:{};
 trainElements.push({spatial:fixedNativeGeometry,type:'train.'+id,version:1,label:id.replace(/([A-Z])/g,' $1'),category:'metro car',coordinates:'world',libraryUse:'reusable',fields:own,visualFields:visual,parts:['backdrop'],anchors:()=>({origin}),
  bindingChoices:doc=>doc.scene==='train'?Object.fromEntries(Object.keys(visual).map(key=>[key,['train.'+key]])):{},
  bounds(p){const width=Number(p.width),ceiling=Number(p.ceilingHeight);
   if(id==='ceilingLight')return{x:0,h:ceiling,w:width,tall:40};
   if(id==='advert')return{x:-72,h:156,w:144,tall:16};
   if(id==='adTell')return{x:53,h:160,w:24,tall:24};
   if(id==='carPlate')return{x:35-width/2-12,h:84,w:width+24,tall:Number(p.height)+24};
   if(id==='registryScreen')return{x:-24,h:147,w:118,tall:76};
   if(id==='handrail')return{x:0,h:0,w:width,tall:2};
   return{x:-8,h:-1,w:16,tall:18};
  },
  draw(ctx,v,p,state,_pass,at){const V=at.h===0?v:{...v,gy:v.gy-at.h,y:(h:number)=>v.y(h+at.h)},width=Number(p.width),ceiling=Number(p.ceilingHeight);
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

// The brake is an independent fitting; the prepared car frame supplies its native state/culling
// while standalone placement can preview the same state explicitly without a train controller.
trainElements.push({spatial:fixedNativeGeometry,type:'train.brake',version:1,label:'Emergency brake',category:'metro car',coordinates:'world',parts:['backdrop'],anchors:()=>({origin}),bounds:()=>({x:-16,h:62,w:32,tall:44}),libraryUse:'reusable',fields:{},
 visualFields:{frame,pulled:{kind:'boolean',label:'Brake pulled',default:false},highlight:{kind:'boolean',label:'Highlighted',default:false}},
 draw(ctx,v,_p,state,_pass,at){const f=state.frame as unknown as TrainFrame|null;
  if(f&&!onScreen(v,v.sx(f.L.gangway+at.x-f.L.brake),80))return;
  const h=at.h,V=h===0?v:{...v,gy:v.gy-h,y:(q:number)=>v.y(q+h)};
  drawEmergencyBrake(ctx,V,at.x,f?f.visual.ride.phase==='braking'||f.visual.ride.phase==='halted':!!state.pulled,f?f.hover==='train':!!state.highlight);
 }});

// Fittings have their own geometry. The native frame may supply the current ceiling/window
// width, but ordinary placement does not require a fabricated train layout or ride snapshot.
for(const id of ['drawCam','drawPole','windowFrame','staffDoor','seatBack','seatFront']){
 const seat=id.startsWith('seat'),ceiling=id==='drawCam'||id==='drawPole';
 trainElements.push({spatial:fixedNativeGeometry,type:'train.'+id,version:1,label:id.replace(/([A-Z])/g,' $1'),category:'metro car',coordinates:'world',parts:['backdrop'],anchors:()=>({origin}),libraryUse:'reusable',
  fields:id==='windowFrame'?{width:shapeLength(num('Window width',100)),bottomY:shapePosition(num('Window bottom Y',52)),topY:shapePosition(num('Window top Y',128))}:seat?{width:linkedWidth({...shapeLength(num('Width',100)),min:8})}:ceiling?{ceilingHeight:linkedCeiling({...shapePosition(num('Ceiling height',166)),min:0})}:{},
  visualFields:ceiling?{ceiling:{...num('Bound ceiling',-1),min:-1}}:seat?{width:num('Bound window width')}:{},
  bounds(p){const h=Number(p.ceilingHeight??166),w=Number(p.width??100);
   if(id==='drawCam')return{x:-10,h,w:20,tall:14};
   if(id==='drawPole')return{x:-1,h,w:3,tall:h};
   if(id==='windowFrame')return{x:0,h:Number(p.topY),w:Number(p.width),tall:Number(p.topY)-Number(p.bottomY)};
   if(id==='staffDoor')return{x:-16,h:70,w:32,tall:70};
   return{x:-4,h:id==='seatBack'?46:18,w:w+8,tall:id==='seatBack'?34:4};
  },
  draw(ctx,v,p,_state,_pass,at){const h=Number(p.ceilingHeight??166),w=Number(p.width??100),V=at.h===0?v:{...v,gy:v.gy-at.h,y:(q:number)=>v.y(q+at.h)};
   switch(id){case'drawCam':drawCabCamera(ctx,V,at.x,h);break;case'drawPole':drawCabPole(ctx,V,at.x,h);break;case'windowFrame':drawCabWindow(ctx,V,at.x,Number(p.width),Number(p.bottomY),Number(p.topY));break;case'staffDoor':drawCabStaffDoor(ctx,V,at.x);break;case'seatBack':drawCabSeatBack(ctx,V,at.x,w);break;case'seatFront':drawCabSeatFront(ctx,V,at.x,w);break;}
  }});
}

// Frame bindings carry presentation only; live source refs protect structural inputs.
for(const element of trainElements)element.bindingIdentity="presentation";

for(const element of trainElements)if(element.visualFields?.frame||['train.seatBack','train.seatFront'].includes(element.type))element.bindingChoices=composition=>{
 if(composition.scene!=='train')return{};
 const flatten=(nodes:readonly import('../core/composition').AssetInstance[]):import('../core/composition').AssetInstance[]=>nodes.flatMap(n=>[n,...flatten(n.children??[])]);
 return{...(element.visualFields?.frame?{frame:['train.frame']}:{}),...(['train.seatBack','train.seatFront'].includes(element.type)?{width:flatten(composition.instances).filter(n=>n.type==='train.windowFrame').map(n=>'train.'+n.id+'.width')}: {})};
};


// Direct controls follow dimensions actually read by these native fittings.
const windowFrame=trainElements.find(e=>e.type==='train.windowFrame')!;
windowFrame.spatial=combineControls(rectangleControls({width:'width',baseline:'bottomY'}),verticalRangeControls('bottomY','topY'));
windowFrame.fields.width={...windowFrame.fields.width,min:4};
windowFrame.validateProperties=p=>{if(Number(p.topY)-Number(p.bottomY)<4)throw Error('Window opening must fit its border (at least 4 units high)');};
trainElements.find(e=>e.type==='train.carPlate')!.spatial=rectangleControls({width:'width',height:'height',originX:.5,originY:1,offsetX:35,baseline:74});

trainElements.find(e=>e.type==='train.marker')!.spatial=fixedGeometry('This non-drawing marker supplies gameplay or chunk-layout parameters. Edit its typed fields; it has no visible body to resize.');

for(const id of ['handrail','seatBack','seatFront'])trainElements.find(e=>e.type==='train.'+id)!.spatial=rectangleControls({width:'width',baseline:id==='seatBack'?29:id==='seatFront'?16:0});

for(const id of ['ceilingLight','drawCam','drawPole']){
 const fitting=trainElements.find(e=>e.type==='train.'+id)!;
 fitting.spatial=id==='ceilingLight'?combineControls(rectangleControls({width:'width',baseline:'ceilingHeight'}),axisControl('ceilingHeight','h',p=>Number(p.width)/2,'Ceiling elevation')):axisControl('ceilingHeight','h',0,'Ceiling elevation');
 const prior=fitting.bindingChoices;fitting.bindingChoices=doc=>({...prior?.(doc),...(doc.scene==='train'?{ceiling:['scene.trainCeiling']}: {})});
}
