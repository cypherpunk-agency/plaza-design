import {rectangleControls,combineControls,axisControl,radiusControl,conditionalControls} from '../core/spatial';
import {fixedGeometry} from '../core/spatial';
import {textField,booleanField} from '../core/fields';
import {numericFields} from '../core/fields';
import {appearanceBoolean,appearanceChoice,appearanceColor,appearanceRatio,semantic,shapeLength} from '../core/fields';
/** Independently placed beach artwork; controllers supply named visual snapshots. */
import type { AssetDefinition,Field,Properties,Placement } from '../core/composition';
import { placed,type View } from '../core/view';
import { menuBoard } from '../signage/screens';
import { createBeachArtwork,type BeachLayout,type BeachVisualState } from './beach';
import { saltUnder,saltBack,saltShell,saltCounter,saltLights } from './beach-bar';
import {applyBeachMetadata} from './beach-metadata';
const fixedNativeGeometry=fixedGeometry("This beach component has no independently authored size. Its native kernel and prepared source layout determine its geometry. Edit the source layout or Transform rather than stretching its body.");
const num=numericFields({value:0,min:-1e12,max:1e12,step:1});
const str=textField;
const bool=booleanField;
const n=(p:Properties,k:string)=>Number(p[k]);
export const beachVisualFields:Record<string,Field>={limeVisible:bool('Native LIME sprite',true),limeX:num('LIME source body X'),limeH:num('LIME source body height'),palette:num('Daylight palette'),horizon:shapeLength(num('Horizon height')),waterline:shapeLength(num('Waterline height')),rented:bool('Bed rented'),billingPaused:bool('Billing paused'),billed:num('Bill'),freeDrink:bool('Drink poured'),danger:bool('Danger flag'),lamps:bool('Pier lights'),gullShooed:num('Gull last shooed',-1e9),hover:str('Hovered device'),barVisible:bool('Bar in view',true),barWidth:shapeLength(num('Bar width')),towerVisible:bool('Tower in view',true),pierVisible:bool('Pier in view',true),boardwalkVisible:bool('Boardwalk in view',true),shore:num('Shore edge'),lampPositions:{kind:'json',label:'Reflection lamp positions',default:[],validate:v=>{if(!Array.isArray(v)||v.some(q=>typeof q!=='number'||!Number.isFinite(q)))throw new Error('Expected finite lamp positions');}}};
const common=Object.keys(beachVisualFields).filter(key=>key!=='barWidth');
type Draw=(x:CanvasRenderingContext2D,v:View,p:Properties,s:Properties,at:Required<Placement>)=>void;
const origin={x:0,h:0,role:'origin' as const};
function element(type:string,label:string,fields:Record<string,Field>,draw:Draw,keys:string[]=common):AssetDefinition{return{type:'beach.'+type,bindingIdentity:'presentation',version:1,label,category:type==='marker'?'markers':'beach',coordinates:'world',fields,visualFields:Object.fromEntries(keys.map(k=>[k,beachVisualFields[k]])),parts:['backdrop'],bounds:p=>({x:-80,h:Number(p.height??150),w:Number(p.width??160),tall:Number(p.height??150)}),anchors:()=>({origin}),draw(x,v,p,s,_pass,at){draw(x,v,p,s,at);}};}
const blank:BeachLayout={stairs:0,board:0,boardwalk:0,kiosk:0,sunbeds:[],mine:0,shack:{x0:0,x1:0},jukebox:0,lime:0,order:0,mixer:0,crab:0,tower:0,drone:0,net:0,castle:0,surfer:0,shore:0,pier0:0,pierLights:0,fisher:0,gull:0,boat:0};
const kernel=(s:Properties,L:Partial<BeachLayout>={},width=0)=>createBeachArtwork({HORIZON:n(s,'horizon'),WATERLINE:n(s,'waterline'),L:{...blank,...L},BEACH_W:width});
const state=(s:Properties):BeachVisualState=>({rented:!!s.rented,billingPaused:!!s.billingPaused,billed:n(s,'billed'),freeDrink:!!s.freeDrink,danger:!!s.danger,lamps:!!s.lamps,gullShooed:n(s,'gullShooed')});
const raised=(v:View,h:number):View=>h===0?v:{...v,gy:v.gy-h,y:q=>v.y(q+h)};
const barFields={width:{...shapeLength(num('Width',226)),min:40,max:4000,stateOverride:{state:'barWidth',space:'world'} as const}};
const bar=(fn:(x:CanvasRenderingContext2D,w:number,p:number,t:number)=>void):Draw=>(x,v,p,s,at)=>{if(s.barVisible)placed(x,v.sx(at.x),v.y(at.h),1,()=>fn(x,n(p,'width'),n(s,'palette'),v.t));};
const ordinary=(method:'kiosk'|'lime'|'crab'|'volleyball'|'castle'|'board'|'rod'|'boat'|'postGull'|'publicNotice'|'jukebox'|'tower'|'drone'|'pierController',field:keyof BeachLayout):Draw=>(x,v,_p,s,at)=>{
 if(['lime','jukebox'].includes(method)&&!s.barVisible||method==='drone'&&!s.towerVisible||method==='publicNotice'&&!s.boardwalkVisible||method==='pierController'&&!s.pierVisible)return;
 const k=kernel(s,{[field]:at.x-(method==='board'?12:0)}),V=raised(v,at.h),st=state(s),hover=String(s.hover)||null,p=n(s,'palette');
 switch(method){case'kiosk':k.kiosk(x,V,st,hover);break;case'lime':k.lime(x,V);break;case'crab':k.crab(x,V);break;case'volleyball':k.volleyball(x,V);break;case'castle':k.castle(x,V,p);break;case'board':k.board(x,V);break;case'rod':k.rod(x,V);break;case'boat':k.boat(x,V,hover,p);break;case'postGull':k.postGull(x,V,st);break;case'publicNotice':k.publicNotice(x,V);break;case'jukebox':k.jukebox(x,V,hover);break;case'tower':k.tower(x,V,st);break;case'drone':k.drone(x,V,st,hover);break;case'pierController':k.pierController(x,V,st,hover);}
};
export const beachElements:AssetDefinition[]=[
 element('marker','Beach gameplay marker',{role:semantic(str('Role'),{"group":"Appearance","quantity":"reference","unit":"identifier"}),width:shapeLength(num('Width')),height:shapeLength(num('Height'))},()=>{},[]),
 element('light','Scene light source',{kind:appearanceChoice({kind:'select',label:'Kind',default:'lamp',options:['lamp','neon','window']}),radius:shapeLength(num('Radius')),color:appearanceColor(str('RGB color'),"RGB"),width:shapeLength(num('Window width')),height:shapeLength(num('Window height')),lightOpacity:semantic(num('Alpha',1),{"group":"Visibility & Drawing","quantity":"ratio","unit":"ratio"})},()=>{},[]),
 ({...element('sky','Sun, sky and clouds',{},(x,v,_p,s,at)=>kernel(s).sky(x,raised(v,at.h),n(s,'palette'))),spatial:fixedNativeGeometry}),
 ({...element('city','Distant city skyline',{},(x,v,_p,s,at)=>kernel(s).city(x,raised(v,at.h),n(s,'palette'))),spatial:fixedNativeGeometry}),
 ({...element('sea','Waves and sea',{},(x,v,_p,s,at)=>kernel(s).seaBase(x,raised(v,at.h),n(s,'palette'))),spatial:fixedNativeGeometry}),
 ({...element('buoy','Swim-zone buoy',{},(x,v,_p,s,at)=>kernel(s).buoy(x,v,at.x,at.h)),spatial:fixedNativeGeometry}),
 ({...element('surfing','Surfer on a swell',{},(x,v,_p,s,at)=>kernel(s).surfing(x,raised(v,at.h),at.x)),spatial:fixedNativeGeometry}),
 ({...element('swimmer','Swimmer in the water',{waterDepthFraction:appearanceRatio(num('Distance from horizon')),variation:semantic({...num('Swimmer variation'),min:0,step:1},{group:'Appearance',quantity:'index',unit:'integer'})},(x,v,p,s,at)=>{if(!s.danger)kernel(s).swimmer(x,raised(v,at.h),n(p,'variation'),{x:at.x,d:n(p,'waterDepthFraction')});}),spatial:fixedNativeGeometry}),
 ({...element('shore','Sand and wash',{},(x,v,_p,s,at)=>kernel(s).shore(x,raised(v,at.h),n(s,'palette'))),spatial:fixedNativeGeometry}),
 ({...element('gulls','Wheeling sea gulls',{},(x,v,_p,s,at)=>kernel(s).gulls(x,raised(v,at.h))),spatial:fixedNativeGeometry}),
 ({...element('stairs','Promenade wall and harbor stairs',{},(x,v,_p,s,at)=>{const V=raised(v,at.h);kernel(s).stairs(x,{...V,sx:(wx,par=1)=>V.sx(wx+at.x,par)},n(s,'palette'));}),spatial:fixedNativeGeometry}),
 element('boardwalk','Boardwalk planks',{width:shapeLength(num('Width'))},(x,v,p,s,at)=>kernel(s,{boardwalk:at.x+n(p,'width')}).boardwalk(x,raised(v,at.h),n(s,'palette'),at.x)),
 ({...element('public-notice','Registry beach notice',{},ordinary('publicNotice','board')),spatial:fixedNativeGeometry}),
 ({...element('sunbed','Sunbed and parasol',{index:semantic({...num('Bed index'),step:1},{group:'Appearance',quantity:'index',unit:'integer'}),color:appearanceColor({kind:'color',label:'Fabric',default:'#c83a2a'}),rentable:appearanceBoolean(bool('Rental bed'))},(x,v,p,s,at)=>kernel(s).sunbed(x,raised(v,at.h),at.x,n(p,'index'),String(p.color),!!p.rentable,state(s),n(s,'palette'))),spatial:fixedNativeGeometry}),
 ({...element('kiosk','Sunbed rental kiosk',{},ordinary('kiosk','kiosk')),spatial:fixedNativeGeometry}),
 element('bar-under','SALT stilts and warm light',barFields,bar((x,w)=>saltUnder(x,w)),['barVisible','barWidth','palette']),
 element('bar-back','SALT back shelves',barFields,bar((x,w)=>saltBack(x,w)),['barVisible','barWidth','palette']),
 ({...element('bar-photo','Moth photo behind the gin',{},(x,v,_p,s,at)=>{if(s.barVisible)kernel(s).barPhoto(x,raised(v,at.h),at.x);}),spatial:fixedNativeGeometry}),
 ({...element('lime','LIME robot bartender',{},(x,v,p,s,at)=>{if(s.limeVisible)ordinary('lime','lime')(x,v,p,{...s,barVisible:true},{...at,x:n(s,'limeX'),h:n(s,'limeH')});}),spatial:fixedNativeGeometry}),
 element('bar-shell','SALT shack, ladder and neon',barFields,bar(saltShell),['barVisible','barWidth','palette']),
 element('bar-counter','SALT counter',barFields,bar((x,w)=>saltCounter(x,w)),['barVisible','barWidth','palette']),
 ({...element('menu','SALT menu board',{},(x,v,_p,s,at)=>{if(s.barVisible)menuBoard(x,raised(v,at.h),{x:at.x,h:36,w:66,tall:22,mount:'hang',to:64,items:[['HOUSE','2T'],['WATER','2T']],phase:70});}),spatial:fixedNativeGeometry}),
 ({...element('bar-stool','SALT stool',{},(x,v,_p,s,at)=>{if(s.barVisible)kernel(s).barStool(x,raised(v,at.h),at.x);}),spatial:fixedNativeGeometry}),
 element('bar-lights','SALT string lights',barFields,bar((x,w,_p,t)=>saltLights(x,w,t)),['barVisible','barWidth','palette']),
 ({...element('jukebox','SALT jukebox',{},ordinary('jukebox','jukebox')),spatial:fixedNativeGeometry}),
 ({...element('mixer','SALT drink mixer',{},(x,v,_p,s,at)=>{if(s.barVisible)kernel(s,{mixer:at.x}).mixer(x,raised(v,at.h),state(s),String(s.hover)||null);}),spatial:fixedNativeGeometry}),
 ({...element('crab','Crab on the sand',{},ordinary('crab','crab')),spatial:fixedNativeGeometry}),
 ({...element('tower','Lifeguard tower and flag',{},ordinary('tower','tower')),spatial:fixedNativeGeometry}),
 ({...element('drone','Registry rescue drone',{},ordinary('drone','drone')),spatial:fixedNativeGeometry}),
 ({...element('volleyball','Volleyball net',{},ordinary('volleyball','net')),spatial:fixedNativeGeometry}),
 ({...element('castle','Registry sandcastle',{},ordinary('castle','castle')),spatial:fixedNativeGeometry}),
 ({...element('board','Surfer board',{},ordinary('board','surfer')),spatial:fixedNativeGeometry}),
 ({...element('boat','Moth boat and harbor notice',{},ordinary('boat','boat')),spatial:fixedNativeGeometry}),
 element('pier-deck','Pier piles, planks and railing',{width:shapeLength(num('Width')),railingLength:shapeLength(num('Railing length'))},(x,v,p,s,at)=>kernel(s,{pier0:at.x},at.x+n(p,'width')-20).pierDeck(x,raised(v,at.h),n(s,'palette'),at.x+n(p,'railingLength'))),
 ({...element('pier-lamp','Pier lamp and light cone',{},(x,v,_p,s,at)=>{if(s.pierVisible)kernel(s).pierLamp(x,raised(v,at.h),at.x,!!s.lamps);}),spatial:fixedNativeGeometry}),
 ({...element('pier-controller','Pier lamp schedule controller',{},ordinary('pierController','pierLights')),spatial:fixedNativeGeometry}),
 ({...element('berth-sign','Harbor berth permit sign',{},(x,v,_p,s,at)=>{if(s.pierVisible)kernel(s).berthSign(x,raised(v,at.h),at.x);}),spatial:fixedNativeGeometry}),
 ({...element('rod','Fishing rod and line',{},ordinary('rod','fisher')),spatial:fixedNativeGeometry}),
 ({...element('post-gull','Gull on its pier post',{},ordinary('postGull','gull')),spatial:fixedNativeGeometry}),
 ({...element('foreground','Near sand, water and lamp reflections',{},(x,v,_p,s,at)=>kernel(s,{shore:n(s,'shore')}).foreground(x,raised(v,at.h),state(s),n(s,'palette'),s.lampPositions as number[])),spatial:fixedNativeGeometry}),
];
applyBeachMetadata(beachElements);
// Self-contained objects; scenery spans, bar-wide pieces and placed drink/actor snapshots
// still need their explicit scene context. No live controller is read by these kernels.
for(const e of beachElements)if(['buoy','sunbed','kiosk','crab','tower','drone','volleyball','castle','board','boat','rod','post-gull','public-notice','menu','bar-photo','bar-stool','pier-lamp','berth-sign','pier-controller'].includes(e.type.slice(6)))e.libraryUse='reusable';

for(const e of beachElements)if(['bar-under','bar-back','bar-shell','bar-counter','bar-lights'].includes(e.type.slice(6)))e.libraryUse='reusable';

beachElements.find(e=>e.type==='beach.mixer')!.libraryUse='reusable';
beachElements.find(e=>e.type==='beach.jukebox')!.libraryUse='reusable';

// Audited local fittings: optional scalar/pose inputs have standalone defaults.
for(const e of beachElements)if(["stairs"].includes(e.type.slice(6)))e.libraryUse='reusable';

const gulls=beachElements.find(e=>e.type==='beach.gulls')!;
gulls.mobility=()=>true;
gulls.travelBounds=()=>({x:-120,h:230,w:1740,tall:120});

beachElements.find(e=>e.type==='beach.marker')!.spatial=fixedGeometry('This non-drawing marker supplies gameplay or chunk-layout parameters. Edit its typed fields; it has no visible body to resize.');

beachElements.find(e=>e.type==='beach.boardwalk')!.spatial=rectangleControls({width:'width',baseline:1});
beachElements.find(e=>e.type==='beach.bar-under')!.spatial=rectangleControls({width:'width',baseline:32});

for(const e of beachElements)if(['bar-back','bar-shell','bar-counter','bar-lights'].includes(e.type.slice(6)))e.spatial=rectangleControls({width:'width',baseline:e.type==='beach.bar-shell'?64:32});

const pier=beachElements.find(e=>e.type==='beach.pier-deck')!;
pier.spatial=combineControls(rectangleControls({width:'width',baseline:3}),axisControl('railingLength','x',24,'Railing endpoint'));
const beachLight=beachElements.find(e=>e.type==='beach.light')!;
beachLight.selection='region';
beachLight.drawingNote=()=>"The shared lighting pass draws this source's glow. Its controls edit the configured light region.";
beachLight.spatial=combineControls(radiusControl('radius'),conditionalControls(rectangleControls({width:'width',height:'height',originX:.5,originY:.5}),(p,key)=>p.kind==='window'&&Number(p[key])>0));
