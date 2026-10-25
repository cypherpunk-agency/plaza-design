/** Harbor pieces use authored geometry and immutable controller snapshots. */
import type { Element,Field,Properties,Value } from '../core/composition';
import type { View } from '../core/view';
import { container } from '../props/containers';
import { onScreen } from '../core/primitives';
import { validatePreparedCharacter } from '../characters/prepared';
import type { PreparedCharacter } from '../../runtime/characters';
import { createHarborPierArtwork,type HarborLayout,type HarborVisual } from './harbor-pier';
import {applyHarborMetadata} from './harbor-metadata';
import {harborFields,harborHutFields,harborHutSize} from './harbor-fields';
const num=(label:string,value=0):Field=>({kind:'number',label,default:value,min:-1e12,max:1e12,step:1});
const str=(label:string,value=''):Field=>({kind:'string',label,default:value});
const dimension=(label:string):Field=>({...num(label),min:0,max:10000,unit:'world units'});
const nil={visible:false,character:{x:0}};
const validateTree=(v:Value,path='snapshot'):void=>{if(v===null||typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))return;if(typeof v!=='object')throw new Error(path+': invalid value');for(const[k,q]of Object.entries(v))validateTree(q,path+'.'+k);};
const blank:HarborLayout={width:0,hut:{x:0,w:0,h:0},notice:0,arch:{x0:0,x1:0,h:0},podium:0,manifest:0,callBox:0,cranes:[{x:0,id:'sts1',phase:0},{x:0,id:'sts3',phase:0}],fish:{x:0,w:0},drinks:{x:0,w:0},den:0,fence:{x0:0,x1:0,gate:0},ghost:0,berth:0,rails:0,beacon:0,metro:0,terminal:0,taxi:0,ferry:0};
const visual:HarborVisual={cranes:[{twx:0,hang:0,carry:true,u:-1},{twx:0,hang:0,carry:true,u:-1}],forklift:{x:0,dir:1},bribed:false,weatherLine:''};
function shape(v:Value,example:unknown,path:string):void{if(Array.isArray(example)){if(!Array.isArray(v))throw new Error(path+': expected array');if(example.length)for(const q of v)shape(q,example[0],path+'[]');return;}if(example&&typeof example==='object'){if(!v||typeof v!=='object'||Array.isArray(v))throw new Error(path+': expected object');for(const[k,q]of Object.entries(example))shape((v as Record<string,Value>)[k],q,path+'.'+k);return;}if(typeof v!==typeof example||typeof v==='number'&&!Number.isFinite(v))throw new Error(path+': expected '+typeof example);}
const json=(label:string,value:Value,check:(v:Value)=>void):Field=>({kind:'json',label,default:value,validate:check});
const pose=json('Prepared stall vendor',nil,validatePreparedCharacter);
export const harborVisualFields:Record<string,Field>={forkliftOrigin:num('Forklift origin'),archVisible:{kind:'boolean',label:'Arch in view',default:true},bondedVisible:{kind:'boolean',label:'Bonded yard in view',default:true},stackOrigins:json('Stack culling origins',[],v=>{if(!Array.isArray(v)||v.some(q=>typeof q!=='number'||!Number.isFinite(q)))throw new Error('stackOrigins: expected finite positions');}),layout:json('Resolved source geometry',blank as unknown as Value,v=>shape(v,blank,'layout')),visual:json('Crane, forklift, gate and weather snapshot',visual as unknown as Value,v=>shape(v,visual,'visual')),fishPose:pose,teaPose:pose,loads:json('Crane loads',[],v=>{if(!Array.isArray(v))throw new Error('loads: expected array');for(const q of v){shape(q,{w:0,p:0,seed:0},'loads[]');validateTree(q);}})};
const origin={x:0,h:0,role:'origin' as const};
type Method=keyof ReturnType<typeof createHarborPierArtwork>;
function root(method:Method,L:HarborLayout,p:Properties):{x:number;h:number}{const ci=Number(p.index);if(method.startsWith('crane'))return{x:L.cranes[ci].x+(method==='craneLoad'?-64:0),h:method==='craneLoad'?-58:0};const names:Partial<Record<Method,keyof HarborLayout>>={noticePost:'notice',metroDoor:'metro',podium:'podium',manifest:'manifest',callBox:'callBox',denInside:'den',denTable:'den',denDoors:'den',denLamp:'den',drawTerminalGate:'terminal',berthSign:'berth',taxi:'taxi',ferryNotice:'ferry',rails:'rails',beacon:'beacon'};if(method.startsWith('arch'))return{x:L.arch.x0,h:0};const key=names[method];if(key)return{x:Number(L[key]),h:0};if(method.startsWith('hut'))return{x:L.hut.x,h:0};if(['bondedContainers','ghostMark','bondedFence'].includes(method))return{x:L.fence.x0,h:0};if(method==='fishStall')return{x:L.fish.x,h:0};if(method==='teaStall')return{x:L.drinks.x,h:0};return{x:0,h:0};}
function element(type:string,label:string,method?:Method):Element{
 const hut=method==='hutBack'||method==='hutFront';
 return{type:'harbor.'+type,bindingIdentity:'presentation',version:1,label,category:'harbor',coordinates:'world',fields:harborFields(type),visualFields:hut?harborHutFields:harborVisualFields,parts:[method==='frontBollard'?'foreground':'backdrop'],bounds:p=>({x:-80,h:Number(p.height)||150,w:Number(p.width)||160,tall:Number(p.height)||150}),anchors:()=>({origin}),draw(ctx,v,p,s,_pass,at){
 if(!method)return;
 if(method==='hutBack'||method==='hutFront'){
  const size=harborHutSize(p,s),L={...blank,hut:{x:at.x,...size}},raised=at.h?{...v,gy:v.gy-at.h,y:(h:number)=>v.y(h+at.h)}:v;
  createHarborPierArtwork({L,visual,fishPose:nil as unknown as PreparedCharacter,teaPose:nil as unknown as PreparedCharacter,loads:[]})[method](ctx,raised);return;
 }
 const L=s.layout as unknown as HarborLayout,vis=s.visual as unknown as HarborVisual,k=createHarborPierArtwork({L,visual:vis,fishPose:s.fishPose as unknown as PreparedCharacter,teaPose:s.teaPose as unknown as PreparedCharacter,loads:s.loads as any});let base=root(method,L,p);if(['drawLampBoat','drawFerry','drawPatrol','crates','fishingBox','portCamera','droneGull','forkliftBody','forkliftRoof'].includes(method)){const positions:Partial<Record<Method,[number,number]>>={drawLampBoat:[1650,56],drawFerry:[0,34],drawPatrol:[0,46],crates:[1112,0],fishingBox:[2112,0],portCamera:[156,136],droneGull:[1460,128],forkliftBody:[vis.forklift.x,0],forkliftRoof:[vis.forklift.x,0]};const pos=positions[method]!;base={x:pos[0],h:pos[1]};if(method.startsWith('forklift'))base.x=Number((s.forkliftOrigin as number)??0);}
 const dx=at.x-base.x,dh=at.h-base.h,V:View=dx===0&&dh===0?v:{...v,sx:(wx,depth=1)=>v.sx(wx+dx,depth),y:h=>v.y(h+dh),gy:v.gy-dh};
 if(method.startsWith('crane'))(k[method] as (ctx:CanvasRenderingContext2D,v:View,ci:number)=>void)(ctx,V,Number(p.index));else if(method==='bollard'||method==='frontBollard')k[method](ctx,v,at.x);else if(method==='rod')k.rod(ctx,v,at.x,at.h,Number(p.reach));else(k[method] as (ctx:CanvasRenderingContext2D,v:View)=>void)(ctx,V);
 }};}
const methods:Method[]=['drawLampBoat','drawPatrol','drawFerry','archChassis','archScan','archPortal','drawTerminalGate','craneFrame','craneCabBack','craneCabFront','craneCables','craneLoad','craneLight','denInside','denTable','denDoors','denLamp','bondedContainers','ghostMark','bondedFence','forkliftBody','forkliftRoof','hutBack','hutFront','fishStall','teaStall','farSky','horizon','water','flyingGulls','pierSlab','metroDoor','noticePost','podium','manifest','callBox','crates','bollard','rod','fishingBox','berthSign','taxi','ferryNotice','rails','beacon','portCamera','droneGull','nearWater','frontBollard'];
export const harborElements:Element[]=[...methods.map(m=>element(m,m.replace(/([A-Z])/g,' $1'),m)),{...element('container','Corrugated shipping container'),draw(ctx,v,p,s,_pass,at){const L=s.layout as unknown as HarborLayout,stack=Number(p.cullStack);if(p.cullRegion&&!s[String(p.cullRegion)+'Visible'])return;if(stack>=0){const start=(s.stackOrigins as number[])[stack];if(start!==undefined&&!onScreen(v,v.sx(start)-20,180))return;}container(ctx,v,at.x,at.h,{w:Number(p.width),h:Number(p.height),p:Number(p.paint),seed:Number(p.seed),...(p.code?{code:String(p.code)}:{}),...(p.label?{label:String(p.label)}:{})});void L;}},
 {type:'harbor.marker',version:1,label:'Harbor gameplay, light or shadow marker',category:'markers',coordinates:'world',fields:{role:str('Role'),width:dimension('Width'),height:dimension('Height'),kind:str('Light kind'),r:dimension('Radius'),color:str('Light color'),lightHeight:dimension('Window height')},parts:['backdrop'],bounds:p=>({x:0,h:Number(p.height),w:Number(p.width),tall:Number(p.height)}),anchors:()=>({origin}),draw(){}},
];
applyHarborMetadata(harborElements,(method,L,p)=>root(method as Method,L,p));
// Each of these fittings cancels its source datum before applying its own placement.
// Crane geometry, actor-bearing stalls and culling-dependent container rows remain contextual.
for(const e of harborElements)if(['denInside','denTable','denDoors','denLamp','metroDoor','noticePost','podium','manifest','callBox','crates','bollard','rod','fishingBox','berthSign','taxi','ferryNotice','rails','beacon','portCamera','drawTerminalGate','hutBack','hutFront'].includes(e.type.slice(7)))e.libraryUse='reusable';

// These source actors travel; machinery fixed to its rail remains part of the set.
const harborTravel={
 drawFerry:{x:-500,h:90,w:2800,tall:100,depth:.45},
 drawPatrol:{x:-640,h:100,w:3880,tall:110,depth:.5},
 flyingGulls:{x:-220,h:300,w:2840,tall:300,depth:.7},
 droneGull:{x:-80,h:40,w:160,tall:80,depth:.95},
 forkliftBody:{x:-240,h:65,w:480,tall:65,depth:1},
 forkliftRoof:{x:-240,h:65,w:480,tall:65,depth:1},
};
for(const e of harborElements){
 const travel=harborTravel[e.type.slice(7) as keyof typeof harborTravel];if(!travel)continue;
 e.mobility=()=>true;
 e.travelBounds=(_p,_s,c)=>{const origin=c?.placement.x??0;return{x:(origin+travel.x)/travel.depth-origin,h:travel.h,w:travel.w/travel.depth,tall:travel.tall};};
}
