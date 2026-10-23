/** Independently authored market kit pieces. Vendor frames are explicit validated snapshots. */
import type {Bounds,BoundsContext,Element,Field,Properties} from '../core/composition';
import type {PreparedCharacter} from '../../runtime/characters';
import {validatePreparedCharacter} from '../characters/prepared';
import {drawMarketLaundry,drawMarketBulbs,drawMarketRules,drawMarketEndWall,drawNoodleMenu,drawSaleScreen} from './market-details';
import {stall,booth,facade,lamp,stool,clutter,bin,stallBox,type StallSpec} from './construction';
import {DESIGN_TOP,drawTowers,exitDoor,towers,wetFloor} from '../core/primitives';
import {ticker,wantedScreen,adScreen,registryBoard,camera,bladeSign,oddsBoard,scoreDisplay} from '../signage/screens';
import {applyMarketMetadata} from './market-metadata';
const n=(label:string,defaultValue:number):Field=>({kind:'number',label,default:defaultValue,min:-10000,max:10000,step:1});
const str=(label:string,defaultValue=''):Field=>({kind:'string',label,default:defaultValue});
const list=(label:string,values:string[]):Field=>({kind:'json',label,default:values,validate:v=>{if(!Array.isArray(v)||v.some(q=>typeof q!=='string'))throw new Error('Expected string list');}});
const raised=(v:import('../core/view').View,h:number)=>h===0?v:({...v,gy:v.gy-h,y:(value:number)=>v.y(value+h)});
const el=(id:string,fields:Record<string,Field>,draw:Element['draw'],bounds:Element['bounds']=(p)=>({x:0,h:Number(p.height??100),w:Number(p.width??100),tall:Number(p.height??100)})):Element=>({type:'market.'+id,version:1,label:id,category:'Market',bindingIdentity:'presentation',coordinates:'world',libraryUse:!['marker','far','wet-floor','stall','booth','ticker'].includes(id)?'reusable':undefined,fields,parts:['backdrop'],bounds,anchors:p=>({origin:{x:0,h:0,role:'origin'},center:{x:Number(p.width??0)/2,h:0,role:'origin'}}),draw});
const far=towers(51,2600,[30,60],[160,320],.07);
export const marketElements:Element[]=[
{...el('marker',{role:str('Role'),width:n('Width',2080)},()=>{},()=>({x:-4,h:4,w:8,tall:8})),parts:[]},
el('far',{},(x,v)=>{const grow=Math.max(0,v.gy-DESIGN_TOP);drawTowers(x,v,far,.25,v.y(0),.08,'#030100',1,Math.round(grow*.8));}),
el('facade',{width:n('Width',128),seed:n('Seed',300),parallax:n('Parallax',.7),alpha:n('Opacity',.4)},(x,v,p,_s,_pass,at)=>facade(x,raised(v,at.h),{x:at.x,w:Number(p.width),seed:Number(p.seed),parallax:Number(p.parallax),alpha:Number(p.alpha)})),
el('bulbs',{width:n('Span',220)},(x,v,p,_s,_pass,at)=>drawMarketBulbs(x,raised(v,at.h),at.x,Number(p.width))),
el('wet-floor',{},(x,v)=>wetFloor(x,v)),
el('door',{label:str('Label','< MALL')},(x,v,p,_s,_pass,at)=>exitDoor(x,raised(v,at.h),at.x,'#0a0603',String(p.label))),
el('lamp',{seed:n('Seed',1)},(x,v,p,_s,_pass,at)=>lamp(x,raised(v,at.h),{x:at.x,seed:Number(p.seed)})),
el('laundry',{width:n('Width',84),doorOffset:n('Door offset',64)},(x,v,p,_s,_pass,at)=>drawMarketLaundry(x,raised(v,at.h),at.x,Number(p.width),at.x+Number(p.doorOffset))),
el('rules',{},(x,v,_p,_s,_pass,at)=>drawMarketRules(x,raised(v,at.h),at.x)),
el('stool',{seed:n('Seed',3)},(x,v,p,_s,_pass,at)=>stool(x,raised(v,at.h),{x:at.x,seed:Number(p.seed)})),
el('clutter',{seed:n('Seed',2),count:n('Count',2),kinds:list('Kinds',['crate','box'])},(x,v,p,_s,_pass,at)=>clutter(x,raised(v,at.h),{x:at.x,seed:Number(p.seed),n:Number(p.count),kinds:p.kinds as Parameters<typeof clutter>[2]['kinds']})),
el('bin',{seed:n('Seed',4)},(x,v,p,_s,_pass,at)=>bin(x,raised(v,at.h),{x:at.x,seed:Number(p.seed)})),
{...el('end-wall',{width:n('Width',140),doorOffset:n('Door offset',46)},(x,v,p,s,_pass,at)=>drawMarketEndWall(x,raised(v,at.h),at.x,Number(p.width),at.x+Number(p.doorOffset),!!s.open)),visualFields:{open:{kind:'boolean',label:'Downtown exit open',default:false}}},
];
const stallFields:Record<string,Field>={width:n('Width',128),seed:n('Seed',1),sign:str('Sign'),col:str('Light color','255,136,0'),goods:{kind:'select',label:'Goods',default:'junk',options:['fruit','fish','noodles','dumplings','umbrellas','sims','implants','tech','junk','bottles']},awning:{kind:'select',label:'Awning',default:'stripe',options:['stripe','scallop','tarp','tin','none']},light:{kind:'select',label:'Light',default:'bulb',options:['bulb','tube','lantern','none']},damage:n('Damage',0),note:list('Note',[]),back:{kind:'select',label:'Back display',default:'none',options:['none','menu','sale']},vendor:str('Vendor actor'),vendorX:n('Vendor offset',54),vendorH:n('Vendor elevation',0)};
export function marketStallSpec(p:Properties,x:number):StallSpec{return{x,w:Number(p.width),seed:Number(p.seed),sign:String(p.sign),col:String(p.col),goods:p.goods as StallSpec['goods'],awning:p.awning as StallSpec['awning'],light:p.light as StallSpec['light'],damage:Number(p.damage),...(Array.isArray(p.note)&&p.note.length?{note:p.note as string[]}:{}),...(p.back==='menu'?{back:drawNoodleMenu}:p.back==='sale'?{back:drawSaleScreen}:{})};}
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
marketElements.push({...el('ticker',{w:n('w',150),tall:n('tall',11),parallax:n('parallax',0.7),col:str('col',"255,136,0")},(x,v,p,s,_pass,at)=>ticker(x,v,{...p,x:at.x,h:at.h,text:String(s.text)} as unknown as Parameters<typeof ticker>[2])),visualFields:{text:str('Forecast text')}});
marketElements.push(el('wanted',{w:n('w',90),tall:n('tall',54),parallax:n('parallax',0.7)},(x,v,p,_s,_pass,at)=>wantedScreen(x,v,{...p,x:at.x,h:at.h} as unknown as Parameters<typeof wantedScreen>[2])));
marketElements.push(el('ad',{w:n('w',92),tall:n('tall',40),parallax:n('parallax',0.7),seed:n('seed',4),phase:n('phase',0)},(x,v,p,_s,_pass,at)=>adScreen(x,v,{...p,x:at.x,h:at.h} as unknown as Parameters<typeof adScreen>[2])));
marketElements.push(el('registry',{w:n('w',150),tall:n('tall',52),parallax:n('parallax',0.7),lines:list('lines',["TRADE WITHOUT LICENCE IS AN OFFENCE","CASH TRANSACTIONS ARE LOGGED","CURFEW 01:00–05:00"]),seed:n('seed',2)},(x,v,p,_s,_pass,at)=>registryBoard(x,v,{...p,x:at.x,h:at.h} as unknown as Parameters<typeof registryBoard>[2])));
marketElements.push(el('camera',{parallax:n('parallax',0.7),facing:n('facing',1),phase:n('phase',10)},(x,v,p,_s,_pass,at)=>camera(x,v,{...p,x:at.x,h:at.h} as unknown as Parameters<typeof camera>[2])));
marketElements.push(el('blade',{text:str('text',"HOTEL"),parallax:n('parallax',0.7),dim:n('dim',0.55),phase:n('phase',150)},(x,v,p,_s,_pass,at)=>bladeSign(x,v,{...p,x:at.x,h:at.h} as unknown as Parameters<typeof bladeSign>[2])));
marketElements.push(el('odds',{w:n('w',76),tall:n('tall',52),mount:str('mount',"pole"),title:str('title',"TONIGHT"),rows:list('rows',["RAIN 02:00","LINE 0 ON TIME","CURFEW RAID","POWER CUT"])},(x,v,p,_s,_pass,at)=>oddsBoard(x,v,{...p,x:at.x,h:at.h} as unknown as Parameters<typeof oddsBoard>[2])));
marketElements.push(el('score',{w:n('w',76),tall:n('tall',32),mount:str('mount',"pole"),name:str('name',"QUEUE BY SCORE"),score:n('score',712)},(x,v,p,_s,_pass,at)=>scoreDisplay(x,v,{...p,x:at.x,h:at.h} as unknown as Parameters<typeof scoreDisplay>[2])));
applyMarketMetadata(marketElements,far);

// Audited local fittings: optional scalar/pose inputs have standalone defaults.
for(const e of marketElements)if(["stall", "booth", "ticker"].includes(e.type.slice(7)))e.libraryUse='reusable';
