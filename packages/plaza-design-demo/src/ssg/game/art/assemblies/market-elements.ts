import {rectangleControls,fixedGeometry,atDepthControls} from '../core/spatial';
import {seconds} from "../core/fields";
import {textField} from '../core/fields';
import {appearanceColor,appearanceChoice,appearanceStructure,appearanceText,depthFactor,generationCount,generationSeed,semantic,shapeLength,shapePosition} from '../core/fields';
/** Independently authored market kit pieces. Vendor frames are explicit validated snapshots. */
import type {Bounds,BoundsContext,AssetDefinition,Field,Properties} from '../core/composition';
import type {PreparedCharacter} from '../../runtime/characters';
import {validatePreparedCharacter} from '../characters/prepared';
import {MARKET_BULB_PARALLAX,drawMarketLaundry,drawMarketBulbs,drawMarketRules,drawMarketEndWall,drawNoodleMenu,drawSaleScreen} from './market-details';
import {stall,booth,facade,lamp,stool,clutter,bin,stallBox,type StallSpec} from './construction';
import {DESIGN_TOP,drawTowers,exitDoor,towers,wetFloor} from '../core/primitives';
import {ticker,wantedScreen,adScreen,registryBoard,camera,bladeSign,oddsBoard,scoreDisplay} from '../signage/screens';
import {applyMarketMetadata} from './market-metadata';
const fixedNativeGeometry=fixedGeometry("This market component has no independently authored size. Its native kernel and prepared source layout determine its geometry. Edit the source layout or Transform rather than stretching its body.");
const n=(label:string,defaultValue:number):Field=>({kind:'number',label,default:defaultValue,min:-10000,max:10000,step:1});
const str=textField;
const list=(label:string,values:string[]):Field=>({kind:'json',label,default:values,editor:{kind:'array',item:appearanceText(textField('Text'))},validate:v=>{if(!Array.isArray(v)||v.some(q=>typeof q!=='string'))throw new Error('Expected string list');}});
const raised=(v:import('../core/view').View,h:number)=>h===0?v:({...v,gy:v.gy-h,y:(value:number)=>v.y(value+h)});
const el=(id:string,fields:Record<string,Field>,draw:AssetDefinition['draw'],bounds:AssetDefinition['bounds']=(p)=>({x:0,h:Number(p.height??100),w:Number(p.width??100),tall:Number(p.height??100)})):AssetDefinition=>({type:'market.'+id,version:1,label:id,category:'Market',bindingIdentity:'presentation',coordinates:'world',libraryUse:!['marker','far','wet-floor','stall','booth','ticker'].includes(id)?'reusable':undefined,fields,parts:['backdrop'],bounds,anchors:p=>({origin:{x:0,h:0,role:'origin'},center:{x:Number(p.width??0)/2,h:0,role:'origin'}}),draw});
const far=towers(51,2600,[30,60],[160,320],.07);
export const marketElements:AssetDefinition[]=[
{...el('marker',{role:semantic(str('Role'),{"group":"Appearance","quantity":"reference","unit":"identifier"}),width:shapeLength(n('Width',2080))},()=>{},()=>({x:-4,h:4,w:8,tall:8})),parts:[]},
({...el('far',{},(x,v)=>{const grow=Math.max(0,v.gy-DESIGN_TOP);drawTowers(x,v,far,.25,v.y(0),.08,'#030100',1,Math.round(grow*.8));}),spatial:fixedNativeGeometry}),
el('facade',{width:shapeLength(n('Width',128)),seed:generationSeed(n('Seed',300)),parallax:depthFactor(n('Parallax',.7)),opacity:semantic(n('Opacity',.4),{"group":"Visibility & Drawing","quantity":"ratio","unit":"ratio"})},(x,v,p,_s,_pass,at)=>facade(x,raised(v,at.h),{x:at.x,w:Number(p.width),seed:Number(p.seed),parallax:Number(p.parallax),alpha:Number(p.opacity)})),
el('bulbs',{width:shapeLength(n('Span',220))},(x,v,p,_s,_pass,at)=>drawMarketBulbs(x,raised(v,at.h),at.x,Number(p.width))),
({...el('wet-floor',{},(x,v)=>wetFloor(x,v)),spatial:fixedNativeGeometry}),
({...el('door',{label:appearanceText(str('Label','< MALL'))},(x,v,p,_s,_pass,at)=>exitDoor(x,raised(v,at.h),at.x,'#0a0603',String(p.label))),spatial:fixedNativeGeometry}),
({...el('lamp',{seed:generationSeed(n('Seed',1))},(x,v,p,_s,_pass,at)=>lamp(x,raised(v,at.h),{x:at.x,seed:Number(p.seed)})),spatial:fixedNativeGeometry}),
el('laundry',{width:shapeLength(n('Width',84)),doorOffset:shapeLength(n('Door offset',64))},(x,v,p,_s,_pass,at)=>drawMarketLaundry(x,raised(v,at.h),at.x,Number(p.width),at.x+Number(p.doorOffset))),
({...el('rules',{},(x,v,_p,_s,_pass,at)=>drawMarketRules(x,raised(v,at.h),at.x)),spatial:fixedNativeGeometry}),
({...el('stool',{seed:generationSeed(n('Seed',3))},(x,v,p,_s,_pass,at)=>stool(x,raised(v,at.h),{x:at.x,seed:Number(p.seed)})),spatial:fixedNativeGeometry}),
({...el('clutter',{seed:generationSeed(n('Seed',2)),count:generationCount(n('Count',2)),kinds:appearanceStructure(list('Kinds',['crate','box']))},(x,v,p,_s,_pass,at)=>clutter(x,raised(v,at.h),{x:at.x,seed:Number(p.seed),n:Number(p.count),kinds:p.kinds as Parameters<typeof clutter>[2]['kinds']})),spatial:fixedNativeGeometry}),
({...el('bin',{seed:generationSeed(n('Seed',4))},(x,v,p,_s,_pass,at)=>bin(x,raised(v,at.h),{x:at.x,seed:Number(p.seed)})),spatial:fixedNativeGeometry}),
{...el('end-wall',{width:shapeLength(n('Width',140)),doorOffset:shapeLength(n('Door offset',46))},(x,v,p,s,_pass,at)=>drawMarketEndWall(x,raised(v,at.h),at.x,Number(p.width),at.x+Number(p.doorOffset),!!s.open)),visualFields:{open:{kind:'boolean',label:'Downtown exit open',default:false}}},
];
const stallFields:Record<string,Field>={width:shapeLength(n('Width',128)),seed:generationSeed(n('Seed',1)),sign:appearanceText(str('Sign')),color:appearanceColor(str('Light color','255,136,0'),'RGB'),goods:appearanceChoice({kind:'select',label:'Goods',default:'junk',options:['fruit','fish','noodles','dumplings','umbrellas','sims','implants','tech','junk','bottles']}),awning:appearanceChoice({kind:'select',label:'Awning',default:'stripe',options:['stripe','scallop','tarp','tin','none']}),light:appearanceChoice({kind:'select',label:'Light',default:'bulb',options:['bulb','tube','lantern','none']}),damage:semantic(n('Damage',0),{"group":"Appearance","quantity":"factor","unit":"factor"}),note:appearanceStructure(list('Note',[])),back:appearanceChoice({kind:'select',label:'Back display',default:'none',options:['none','menu','sale']}),vendor:appearanceText(str('Vendor actor')),vendorX:shapePosition(n('Vendor offset',54)),vendorH:shapeLength(n('Vendor elevation',0))};
export function marketStallSpec(p:Properties,x:number):StallSpec{return{x,w:Number(p.width),seed:Number(p.seed),sign:String(p.sign),col:String(p.color),goods:p.goods as StallSpec['goods'],awning:p.awning as StallSpec['awning'],light:p.light as StallSpec['light'],damage:Number(p.damage),...(Array.isArray(p.note)&&p.note.length?{note:p.note as string[]}:{}),...(p.back==='menu'?{back:drawNoodleMenu}:p.back==='sale'?{back:drawSaleScreen}:{})};}
/** Physical assembly bounds exclude its broad light wash and wet-street reflection. */
export function marketStallBounds(kind:'stall'|'booth',props:Properties,state:Properties={},context?:BoundsContext):Bounds {
  const spec=marketStallSpec(props,0),shape=stallBox(spec),width=spec.w;
  const signWidth=spec.sign?spec.sign.length*8*.64+12:0;
  const fullWidth=Math.max(width+16,signWidth),awning=kind==='booth'?shape.panel+10:shape.awning;
  let left=(width-fullWidth)/2,right=left+fullWidth,top=spec.sign?(kind==='booth'?shape.panel+30:awning+22):awning,bottom=0;
  const pose=state.vendorPose as unknown as PreparedCharacter|undefined;
  // Booth vendors are clipped to the hatch; a stall vendor can extend beyond its frame.
  if(kind==='stall'&&pose?.visible){
    const x=context?pose.frame.x-context.placement.x:Number(props.vendorX);
    const h=context?pose.height-context.placement.h:pose.height-(pose.character.h??0)+Number(props.vendorH);
    left=Math.min(left,x-24);right=Math.max(right,x+24);top=Math.max(top,h);bottom=Math.min(bottom,Number(props.vendorH));
  }
  return{x:left,h:top,w:right-left,tall:top-bottom};
}
for(const id of ['stall','booth'] as const)marketElements.push({...el(id,stallFields,(x,v,p,state,_pass,at)=>{const spec=marketStallSpec(p,at.x);(id==='stall'?stall:booth)(x,raised(v,at.h),spec,{vendorPose:state.vendorPose as unknown as PreparedCharacter});},(p,s,c)=>marketStallBounds(id,p,s,c)),visualFields:{vendorPose:{kind:'json',label:'Vendor pose',default:{visible:false,character:{x:0}},validate:validatePreparedCharacter}},anchors:p=>{const b=stallBox(marketStallSpec(p,0)),width=Number(p.width),counter=b.counter+(id==='booth'?4:0),awning=id==='booth'?b.panel+10:b.awning;return{origin:{x:0,h:0,role:'origin'},counter:{x:width/2,h:counter,role:'surface'},counterLeft:{x:0,h:counter,role:'surface'},counterRight:{x:width,h:counter,role:'surface'},awning:{x:width/2,h:awning,role:'surface'},sign:{x:width/2,h:id==='booth'?b.panel+22:awning+14,role:'mount'},vendor:{x:Number(p.vendorX),h:Number(p.vendorH),role:'origin'},center:{x:width/2,h:0,role:'origin'}};}});
marketElements.push({...el('ticker',{width:shapeLength(n('Width',150)),height:shapeLength(n('Height',11)),parallax:depthFactor(n('parallax',0.7)),color:appearanceColor(str('Color RGB',"255,136,0"),'RGB')},(x,v,p,s,_pass,at)=>ticker(x,v,{...p,col:String(p.color),w:Number(p.width),tall:Number(p.height),x:at.x,h:at.h,text:String(s.text)} as unknown as Parameters<typeof ticker>[2])),visualFields:{text:str('Forecast text')}});
marketElements.push(el('wanted',{width:shapeLength(n('Width',90)),height:shapeLength(n('Height',54)),parallax:depthFactor(n('parallax',0.7))},(x,v,p,_s,_pass,at)=>wantedScreen(x,v,{...p,w:Number(p.width),tall:Number(p.height),x:at.x,h:at.h} as unknown as Parameters<typeof wantedScreen>[2])));
marketElements.push(el('ad',{width:shapeLength(n('Width',92)),height:shapeLength(n('Height',40)),parallax:depthFactor(n('parallax',0.7)),seed:generationSeed(n('seed',4)),timeOffset:seconds("Time offset",0,{"min":-166.66666666666666,"max":166.66666666666666,"step":0.016666666666666666})},(x,v,p,_s,_pass,at)=>adScreen(x,v,{...p,w:Number(p.width),tall:Number(p.height),phase:(Number(p.timeOffset)*60),x:at.x,h:at.h} as unknown as Parameters<typeof adScreen>[2])));
marketElements.push(el('registry',{width:shapeLength(n('Width',150)),height:shapeLength(n('Height',52)),parallax:depthFactor(n('parallax',0.7)),lines:appearanceStructure(list('lines',["TRADE WITHOUT LICENCE IS AN OFFENCE","CASH TRANSACTIONS ARE LOGGED","CURFEW 01:00–05:00"])),seed:generationSeed(n('seed',2))},(x,v,p,_s,_pass,at)=>registryBoard(x,v,{...p,w:Number(p.width),tall:Number(p.height),x:at.x,h:at.h} as unknown as Parameters<typeof registryBoard>[2])));
marketElements.push(({...el('camera',{parallax:depthFactor(n('parallax',0.7)),facing:semantic(n('facing',1),{"group":"Transform","quantity":"choice","unit":"choice"}),blinkTimeOffset:seconds("Blink time offset",0.16666666666666666,{"min":-166.66666666666666,"max":166.66666666666666,"step":0.016666666666666666})},(x,v,p,_s,_pass,at)=>camera(x,v,{...p,phase:(Number(p.blinkTimeOffset)*60),x:at.x,h:at.h} as unknown as Parameters<typeof camera>[2])),spatial:fixedNativeGeometry}));
marketElements.push(({...el('blade',{text:appearanceText(str('text',"HOTEL")),parallax:depthFactor(n('parallax',0.7)),dim:semantic(n('dim',0.55),{"group":"Appearance","quantity":"factor","unit":"factor"}),flickerTimeOffset:seconds("Flicker time offset",2.5,{"min":-166.66666666666666,"max":166.66666666666666,"step":0.016666666666666666})},(x,v,p,_s,_pass,at)=>bladeSign(x,v,{...p,phase:(Number(p.flickerTimeOffset)*60),x:at.x,h:at.h} as unknown as Parameters<typeof bladeSign>[2])),spatial:fixedNativeGeometry}));
marketElements.push(el('odds',{width:shapeLength(n('Width',76)),height:shapeLength(n('Height',52)),mount:appearanceText(str('mount',"pole")),title:appearanceText(str('title',"TONIGHT")),rows:appearanceStructure(list('rows',["RAIN 02:00","LINE 0 ON TIME","CURFEW RAID","POWER CUT"]))},(x,v,p,_s,_pass,at)=>oddsBoard(x,v,{...p,w:Number(p.width),tall:Number(p.height),x:at.x,h:at.h} as unknown as Parameters<typeof oddsBoard>[2])));
marketElements.push(el('score',{width:shapeLength(n('Width',76)),height:shapeLength(n('Height',32)),mount:appearanceText(str('mount',"pole")),name:appearanceText(str('name',"QUEUE BY SCORE")),score:semantic(n('score',712),{"group":"Appearance","quantity":"count","unit":"integer"})},(x,v,p,_s,_pass,at)=>scoreDisplay(x,v,{...p,w:Number(p.width),tall:Number(p.height),x:at.x,h:at.h} as unknown as Parameters<typeof scoreDisplay>[2])));
applyMarketMetadata(marketElements,far);

// Audited local fittings: optional scalar/pose inputs have standalone defaults.
for(const e of marketElements)if(["stall", "booth", "ticker"].includes(e.type.slice(7)))e.libraryUse='reusable';

// These controls follow native dimensions, not the broad emitted glow or vendor pose.
for(const e of marketElements){
 const id=e.type.slice(7);
 if(id==='laundry'||id==='end-wall')e.spatial=rectangleControls({width:'width',baseline:id==='laundry'?58:65});
 if(id==='stall'||id==='booth')e.spatial={...rectangleControls({width:'width'}),handles:p=>rectangleControls({width:'width',baseline:stallBox(marketStallSpec(p,0)).counter+(id==='booth'?4:0)}).handles(p)};
 if(id==='odds'||id==='score')e.spatial=rectangleControls({width:'width',height:'height',originX:.5});
 if(id==='marker')e.spatial=fixedGeometry('Chunk presentation marker: width configures its source extent, not drawn artwork. Edit the chunk layout instead.');
}

for(const e of marketElements){
 const id=e.type.slice(7);
 if(['ticker','wanted','ad','registry'].includes(id))e.spatial=atDepthControls(rectangleControls({width:'width',height:'height',originX:.5}),'parallax');
 if(id==='facade'){e.spatial=atDepthControls(rectangleControls({width:'width'}),'parallax');e.drawingNote=()=>"Width controls this facade; its native height fills up to the viewport's upper edge.";}
 if(id==='bulbs')e.spatial=atDepthControls(rectangleControls({width:'width',baseline:150}),MARKET_BULB_PARALLAX,'world');
 if(e.fields.parallax)e.fields.parallax={...e.fields.parallax,label:'Artwork parallax'};
}

for(const e of marketElements){
 if(['market.ticker','market.wanted','market.ad','market.registry','market.facade'].includes(e.type))e.fields.width={...e.fields.width,min:8};
 if(['market.ticker','market.wanted','market.ad','market.registry'].includes(e.type))e.fields.height={...e.fields.height,min:6};
 if(e.type==='market.bulbs')e.fields.width={...e.fields.width,min:1};
}
