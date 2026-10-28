import {fixedGeometry} from '../core/spatial';
import {rectangleControls,combineControls,axisControl,endpointControls,screenBaselineControls,screenInsetControl} from '../core/spatial';
import {positionListEditor} from '../core/fields';
import {booleanField} from '../core/fields';
import {numericFields} from '../core/fields';
import {appearanceBoolean,appearanceStructure,appearanceText,generationSeed,semantic,shapeLength,shapePosition} from '../core/fields';
/** Named yard architecture and machines. No simulation access or render-time state updates. */
import {screenBounds}from './static-bounds';
import type { AssetDefinition,Field,Value,Bounds,Properties } from '../core/composition';
import { createFixerYardArtwork,type YardArtworkInputs } from './fixer-yard';
const fixedNativeGeometry=fixedGeometry("This yard component has no independently authored size. Its native kernel and prepared source layout determine its geometry. Edit the source layout or Transform rather than stretching its body.");
const number=numericFields({min:-10000,max:10000,step:1});
const flag=booleanField;
export const yardVisualFields:Record<string,Field>={layer:{kind:'select',label:'Render layer',default:'all',options:['all','world','devices']},highlight:{kind:'string',label:'Highlighted device',default:''},pan:number('Camera pan',0),gateOpen:flag('Open hatch'),gateAllowed:flag('Hatch allowed'),held:flag('Parcel held'),hookVisible:flag('Hook visible',true),hookX:number('Hook position',350),night:number('Stars intensity',0),parcel:{kind:'json',label:'Parcel position',default:null,validate:v=>{if(v!==null&&(!Array.isArray(v)||v.length!==2||v.some(n=>typeof n!=='number'||!Number.isFinite(n))))throw new Error('Expected parcel coordinate pair or null');}}};
const columns=(v:Value)=>{if(!Array.isArray(v)||v.some(n=>typeof n!=='number'||!Number.isFinite(n)))throw new Error('Expected wall window columns');};
const raised=(v:import('../core/view').View,h:number)=>h===0?v:({...v,gy:v.gy-h,y:(value:number)=>v.y(value+h)});
type YardMethod=keyof ReturnType<typeof createFixerYardArtwork>;
// These pure native factories retain no frame state. Edited dimensions must not accumulate
// in a serialized-key cache; definitions declare only inputs their kernel consumes.
function E(id:string,method:YardMethod,fields:Record<string,Field>,hidden=(s:Properties)=>s.layer==='devices',inputs?:(p:Properties)=>Partial<YardArtworkInputs>):AssetDefinition{
 return{type:'yard.'+id,version:1,label:id,category:'Yard',coordinates:'world',fields,visualFields:yardVisualFields,parts:['backdrop'],
  bounds:()=>({x:0,h:0,w:0,tall:0}),anchors:()=>({origin:{x:0,h:0,role:'origin'}}),
  draw(x,v,p,s,_pass,at){if(hidden(s))return;const native=createFixerYardArtwork({x:at.x,width:Number(p.width??0),height:Number(p.height??0),endHeight:Number(p.endHeight??0),roof:Number(p.roof??0),label:String(p.label??''),visual:s as unknown as YardArtworkInputs['visual'],...inputs?.(p)});native[method](x,raised(v,at.h));}};
}
export const yardElements:AssetDefinition[]=[
{spatial:fixedNativeGeometry,type:'yard.marker',version:1,label:'Yard gameplay marker',category:'markers',fields:{role:semantic({kind:'string',label:'Role',default:''},{"group":"Appearance","quantity":"reference","unit":"identifier"})},parts:[],bounds:()=>({x:-4,h:4,w:8,tall:8}),anchors:()=>({origin:{x:0,h:0,role:'origin'}}),draw:()=>{}},
 ({...E('sky','sky',{}),spatial:fixedNativeGeometry}),
 E('back-wall','back_wall',{width:shapeLength(number('Width',142)),roof:shapeLength(number('Roof screen inset',20)),brick:appearanceBoolean(flag('Brick',true)),columns:positionListEditor(appearanceStructure({kind:'json',label:'Window columns',default:[22,68,114],validate:columns}),'Column X'),from:shapeLength(number('First window height',146)),seed:generationSeed(number('Window seed',0))},s=>s.layer==='devices',p=>({wall:{width:Number(p.width),roof:Number(p.roof),brick:!!p.brick,cols:p.columns as number[],from:Number(p.from),seed:Number(p.seed)}})),
 ({...E('drainpipe','drainpipe',{}),spatial:fixedNativeGeometry}),
 ({...E('passage','passage',{}),spatial:fixedNativeGeometry}),
 ({...E('sign-wash','sign_wash',{}),spatial:fixedNativeGeometry}),
 E('fire-escape','fire_escape',{roof:shapeLength(number('Roof screen inset',30))}),
 ({...E('shutter','shutter',{}),spatial:fixedNativeGeometry}),
 E('air-conditioner','air_conditioner',{elevation:shapeLength(number('Elevation',70))},s=>s.layer==='devices',p=>({height:Number(p.elevation)})),
 ({...E('kitchen-window','kitchen_window',{}),spatial:fixedNativeGeometry}),
 ({...E('broom','broom',{}),spatial:fixedNativeGeometry}),
 ({...E('chair','chair',{}),spatial:fixedNativeGeometry}),
 ({...E('spool-table','spool_table',{}),spatial:fixedNativeGeometry}),
 ({...E('dumpster-lamp','dumpster_lamp',{}),spatial:fixedNativeGeometry}),
 ({...E('dumpster','dumpster',{}),spatial:fixedNativeGeometry}),
 ({...E('washing-line','washing_line',{}),spatial:fixedNativeGeometry}),
 E('side-walls','side_walls',{width:shapeLength(number('Width',760))}),
 ({...E('yard-sign','yard_sign',{}),spatial:fixedNativeGeometry}),
 ({...E('street-sign','street_sign',{}),spatial:fixedNativeGeometry}),
 ({...E('crate','crate',{label:appearanceText({kind:'string',label:'Crate label',default:'A-3'})}),spatial:fixedNativeGeometry}),
 ({...E('fence','fence',{}),spatial:fixedNativeGeometry}),
 E('chute','chute',{width:shapeLength(number('Width',152)),height:shapeLength(number('Height',40)),endHeight:shapeLength(number('Chute end height',14))}),
 ({...E('camera','camera',{},s=>s.layer==='world'),spatial:fixedNativeGeometry}),
 E('crane','crane',{width:shapeLength(number('Width',176))},s=>s.layer==='world'),
 ({...E('hatch','hatch',{},s=>s.layer==='world'),spatial:fixedNativeGeometry}),
 ({...E('tray','tray',{}),spatial:fixedNativeGeometry}),
 ({...E('parcel','parcel',{},s=>s.layer==='devices'&&!s.held||s.layer==='world'&&!!s.held),spatial:fixedNativeGeometry})
];

/** Fixed-size details expose only controls used by their kernel; bounds describe their actual furniture. */
const yardBoxes:Record<string,Bounds>={shutter:{x:-3,h:66,w:106,tall:66},'air-conditioner':{x:-7,h:80,w:14,tall:28},'kitchen-window':{x:0,h:40,w:18,tall:18},broom:{x:0,h:46,w:9,tall:46},chair:{x:-6,h:30,w:13,tall:30},'spool-table':{x:-8,h:18,w:16,tall:18},'dumpster-lamp':{x:-3,h:70,w:6,tall:8},dumpster:{x:-1,h:31,w:40,tall:31},'yard-sign':{x:-67,h:134,w:134,tall:23},'street-sign':{x:-18,h:90,w:48,tall:20},crate:{x:-13,h:22,w:26,tall:22},fence:{x:-1,h:76,w:60,tall:76},camera:{x:-12,h:84,w:25,tall:84},hatch:{x:-18,h:66,w:36,tall:66},tray:{x:-14,h:46,w:46,tall:46},'sign-wash':{x:-70,h:196,w:140,tall:140}};
const yardState:Record<string,string[]>={sky:['night'],camera:['highlight','pan'],crane:['highlight','hookX','hookVisible'],hatch:['highlight','gateOpen','gateAllowed'],parcel:['held','hookVisible','parcel']};
for(const e of yardElements){const id=e.type.slice(5);if(id==='marker')continue;e.visualFields=Object.fromEntries(['layer',...(yardState[id]??[])].map(k=>[k,yardVisualFields[k]]));
 e.anchors=()=>({origin:{x:0,h:0,role:'origin'}});
 if(yardBoxes[id])e.bounds=()=>yardBoxes[id];
 if(id==='sky')e.bounds=(_p,_s,c)=>screenBounds(c,{x:0,y:0,w:c?.view.viewW??640,h:34},{x:0,h:306,w:640,tall:34});
 if(id==='back-wall')e.bounds=(p,_s,c)=>{const w=Number(p.width),top=Number(p.roof);return c?screenBounds(c,{x:c.view.sx(c.placement.x),y:top,w,h:c.view.y(c.placement.h)-top},{x:0,h:306-top,w,tall:306-top}):{x:0,h:306-top,w,tall:306-top};};
 if(id==='drainpipe')e.bounds=(_p,_s,c)=>c?screenBounds(c,{x:c.view.sx(c.placement.x)-1,y:20,w:4,h:c.view.y(c.placement.h)-20},{x:-1,h:286,w:4,tall:286}):{x:-1,h:286,w:4,tall:286};
 if(id==='passage'){e.bounds=()=>({x:-18,h:70,w:38,tall:80});e.anchors=()=>({origin:{x:0,h:0,role:'origin'},entrance:{x:0,h:0,role:'entrance'}});}
 if(id==='fire-escape')e.bounds=(p,_s,c)=>c?screenBounds(c,{x:c.view.sx(c.placement.x),y:Number(p.roof)+6,w:88,h:c.view.y(c.placement.h+52)-Number(p.roof)-6},{x:0,h:270,w:88,tall:218}):{x:0,h:270,w:88,tall:218};
 if(id==='air-conditioner')e.bounds=p=>({x:-7,h:Number(p.elevation)+10,w:14,tall:28});
 if(id==='washing-line')e.bounds=(_p,_s,c)=>({x:-2,h:Math.min(150,(c?.view.gy??306)-(c?.placement.h??0)-60)+1,w:280,tall:28});
 if(id==='side-walls')e.bounds=(_p,_s,c)=>screenBounds(c,{x:0,y:0,w:c?.view.viewW??640,h:c?.view.viewH??360},{x:0,h:306,w:760,tall:360});
 if(id==='chute'){e.bounds=p=>({x:-2,h:Number(p.height),w:Number(p.width)+4,tall:Number(p.height)});e.anchors=p=>({origin:{x:0,h:0,role:'origin'},start:{x:0,h:Number(p.height),role:'surface'},end:{x:Number(p.width),h:Number(p.endHeight),role:'surface'}});}
 if(id==='crane'){e.bounds=(p,state,c)=>{const hook=Number(state.hookX)-(c?.placement.x??262),left=Math.min(-1,state.hookVisible?hook-6:-1),right=Math.max(Number(p.width)+1,state.hookVisible?hook+6:0);return{x:left,h:129,w:right-left,tall:129};};e.anchors=p=>({origin:{x:0,h:0,role:'origin'},beam:{x:Number(p.width)/2,h:128,role:'mount'}});}
 if(id==='crate')e.anchors=()=>({origin:{x:0,h:0,role:'origin'},top:{x:0,h:22,role:'surface'}});
 if(id==='chair')e.anchors=()=>({origin:{x:0,h:0,role:'origin'},seat:{x:0,h:14,role:'surface'}});
 if(id==='spool-table')e.anchors=()=>({origin:{x:0,h:0,role:'origin'},top:{x:0,h:14,role:'surface'}});
 if(id==='tray')e.anchors=()=>({origin:{x:0,h:0,role:'origin'},pickup:{x:0,h:8,role:'surface'}});
 if(id==='parcel'){e.bounds=(_p,state)=>{const pos=state.parcel as number[]|null;return pos?{x:pos[0]-7,h:pos[1]+10,w:14,tall:10}:{x:-7,h:10,w:14,tall:10};};}
}

// Rooftop fittings are independent props; each retains the original absolute roof inset.
for(const [id,label,roof,width,height,kind]of [['roof-vent','Roof vent',20,4,7,'roof_vent'],['water-tank','Roof water tank',10,22,9,'roof_tank'],['chimney','Roof chimney',26,8,9,'roof_vent'],['aerial','Roof aerial',6,11,16,'roof_aerial']]as const){
 yardElements.push({type:'yard.'+id,version:1,label,category:'Yard rooftop',coordinates:'world',fields:{roof:shapeLength(number('Roof screen inset',roof)),...(id==='aerial'?{}:{width:{...shapeLength(number('Width',width)),min:1},height:{...shapeLength(number('Height',height)),min:1}})},visualFields:{layer:yardVisualFields.layer},parts:['backdrop'],bounds:(p,_s,c)=>{const w=Number(p.width??width),h=Number(p.height??height),top=Number(p.roof)-(id==='aerial'?0:h),extra=id==='water-tank'?4:0;return c?screenBounds(c,{x:c.view.sx(c.placement.x)-(id==='aerial'?5:0),y:top,w,h:h+extra},{x:id==='aerial'?-5:0,h:306-top,w,tall:h+extra}):{x:id==='aerial'?-5:0,h:306-top,w,tall:h+extra};},anchors:()=>({origin:{x:0,h:0,role:'origin'}}),draw:(x,v,p,state,_pass,at)=>{if(state.layer==='devices')return;const art=createFixerYardArtwork({x:at.x,width:Number(p.width??width),height:Number(p.height??height),endHeight:0,roof:Number(p.roof),label:'',visual:state as unknown as YardArtworkInputs['visual']});art[kind](x,raised(v,at.h));}});
}
// Pictures consume snapshots. Authored controller/manifest references validate their geometry.
for(const element of yardElements)element.bindingIdentity='presentation';
// Screen-top architecture, coupled hook/parcel geometry and ambient washes retain context.
for(const e of yardElements)if(['passage','shutter','air-conditioner','kitchen-window','broom','chair','spool-table','tray','crate','dumpster','dumpster-lamp','street-sign','yard-sign','fence','hatch','chute','camera'].includes(e.type.slice(5)))e.libraryUse='reusable';

for(const e of yardElements){const id=e.type.slice(5);
 if(e.fields.roof)e.fields.roof=semantic(e.fields.roof,{group:'Shape / Area',quantity:'position',unit:'render pixels',space:'screen'});
 if(id==='back-wall'){
  e.fields.width={...e.fields.width,min:1};e.fields.from=shapePosition(e.fields.from);
  e.spatial=combineControls(screenBaselineControls(rectangleControls({width:'width'}),'roof'),screenInsetControl('roof',p=>Number(p.width)/2));
 }
 if(id==='fire-escape'||id==='aerial')e.spatial=screenInsetControl('roof',id==='fire-escape'?44:0,id==='fire-escape'?6:0);
 if(id==='air-conditioner'){e.fields.elevation=shapePosition(e.fields.elevation);e.spatial=axisControl('elevation','h');}
 if(id==='side-walls'||id==='crane'){
  e.fields.width={...e.fields.width,min:id==='side-walls'?16:12};e.spatial=rectangleControls({width:'width',baseline:id==='crane'?126:90});
 }
 if(id==='chute'){
  e.fields.height=shapePosition({...e.fields.height,label:'Start Y',min:4});e.fields.endHeight=shapePosition({...e.fields.endHeight,label:'End Y'});
  e.spatial=combineControls(axisControl('height','h'),endpointControls('width','endHeight',-4));
 }
 if(['roof-vent','water-tank','chimney'].includes(id))e.spatial=combineControls(screenBaselineControls(rectangleControls({width:'width',height:'height'}),'roof'),screenInsetControl('roof',p=>Number(p.width)+8));
}
