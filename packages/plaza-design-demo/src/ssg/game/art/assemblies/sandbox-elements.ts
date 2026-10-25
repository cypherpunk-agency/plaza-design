import {screenBounds}from './static-bounds';
/** Independent QA machines, furnishing kits and architecture. Device state is a validated visual snapshot. */
import { createSandboxArtwork,type ArtworkInputs,type SandboxLayout } from './sandbox';
import { emptySandboxSnapshot,validateSandboxSnapshot,type SandboxSnapshot } from './sandbox-state';
import type { Anchor,Bounds,Element,Field,Placement,Properties,Value } from '../core/composition';
import type { View } from '../core/view';
import { exitDoor,notice,onScreen,text } from '../core/primitives';
import { camera,ticker } from '../signage/screens';
import { ALARM } from '../signage/kit';
const num=(label:string,value:number,min=-10000):Field=>({kind:'number',label,default:value,min,max:10000,step:1});
const str=(label:string,value=''):Field=>({kind:'string',label,default:value});
const n=(p:Properties,k:string)=>Number(p[k]);
const origin:Anchor={x:0,h:0,role:'origin'};
const raised=(v:View,h:number):View=>h===0?v:({...v,gy:v.gy-h,y:value=>v.y(value+h)});
export const sandboxVisualFields:Record<string,Field>={snapshot:{kind:'json',label:'QA visual snapshot',default:emptySandboxSnapshot as unknown as Value,validate:validateSandboxSnapshot}};
function layout():SandboxLayout{return{door:0,spawn:0,plan:0,reset:0,dispenser:0,radiator:0,bench:0,window:{x0:0,x1:260,h0:30,h1:152},end:0};}
type Kernels=ReturnType<typeof createSandboxArtwork>;
const cache=new Map<string,{inputs:ArtworkInputs;art:Kernels}>();
function kernel(snapshot:SandboxSnapshot,extra:Partial<Omit<ArtworkInputs,'visual'>>={}){const config={SB:layout(),STATIONS:[],SANDBOX_W:3740,...extra},key=JSON.stringify(config);let had=cache.get(key);if(!had){const inputs={...config,visual:snapshot};had={inputs,art:createSandboxArtwork(inputs)};if(cache.size>=2048)cache.clear();cache.set(key,had);}had.inputs.visual=snapshot;return had.art;}
const visual=(s:Properties)=>s.snapshot as unknown as SandboxSnapshot;
type Draw=(x:CanvasRenderingContext2D,v:View,p:Properties,s:SandboxSnapshot,at:Required<Placement>)=>void;
function element(id:string,label:string,category:string,fields:Record<string,Field>,bounds:(p:Properties)=>Bounds,draw:Draw,anchors:(p:Properties)=>Record<string,Anchor>=()=>({origin})):Element{return{type:'sandbox.'+id,bindingIdentity:'presentation',version:1,label,category,coordinates:'world',fields,visualFields:sandboxVisualFields,parts:['backdrop'],bounds,anchors,draw:(x,v,p,s,_pass,at)=>draw(x,v,p,visual(s),at)};}
const box=(w:number,h:number,x=0):Bounds=>({x,h,w,tall:h});
export const sandboxPieceDefinitions: {id:string;method:keyof Kernels;device?:string}[]=[
  {id: "server-cables",method:"drawServerCables"},
  {id:"spool-cable",method:"drawSpoolCable",device:"spool"},
  {
    "id": "header",
    "method": "drawHeader"
  },
  {
    "id": "reset",
    "method": "drawReset"
  },
  {
    "id": "sensor",
    "method": "drawSensor",
    "device": "sensor"
  },
  {
    "id": "lamp",
    "method": "drawLamp",
    "device": "lamp"
  },
  {
    "id": "memo",
    "method": "drawMemo",
    "device": "memo"
  },
  {
    "id": "port",
    "method": "drawPort",
    "device": "port"
  },
  {
    "id": "unit7",
    "method": "drawUnit7",
    "device": "unit7"
  },
  {
    "id": "metronome",
    "method": "drawMetronome",
    "device": "metronome"
  },
  {
    "id": "recorder",
    "method": "drawRecorder",
    "device": "recorder"
  },
  {
    "id": "button-counter-conduit",
    "method": "drawButtonCounterConduit",
    "device": "button"
  },
  {
    "id": "button",
    "method": "drawButton",
    "device": "button"
  },
  {
    "id": "beacon",
    "method": "drawBeacon",
    "device": "beacon"
  },
  {
    "id": "horn",
    "method": "drawHorn",
    "device": "horn"
  },
  {
    "id": "counter",
    "method": "drawCounter",
    "device": "counter"
  },
  {
    "id": "plate",
    "method": "drawPlate",
    "device": "plate"
  },
  {
    "id": "hatch",
    "method": "drawHatch",
    "device": "hatch"
  },
  {
    "id": "fan",
    "method": "drawFan",
    "device": "fan"
  },
  {
    "id": "login",
    "method": "drawLogin",
    "device": "login"
  },
  {
    "id": "rings",
    "method": "drawRings",
    "device": "rings"
  },
  {
    "id": "cipher",
    "method": "drawCipher",
    "device": "cipher"
  },
  {
    "id": "cryptex",
    "method": "drawCryptex",
    "device": "cryptex"
  },
  {
    "id": "morse",
    "method": "drawMorse",
    "device": "morse"
  },
  {
    "id": "cutter",
    "method": "drawCutter",
    "device": "cutter"
  },
  {
    "id": "cabinet",
    "method": "drawCabinet",
    "device": "cabinet"
  },
  {
    "id": "rgb",
    "method": "drawRgb",
    "device": "rgb"
  },
  {
    "id": "mains",
    "method": "drawMains",
    "device": "mains"
  },
  {
    "id": "audit",
    "method": "drawAudit",
    "device": "audit"
  },
  {
    "id": "spool",
    "method": "drawSpool",
    "device": "spool"
  },
  {
    "id": "trace-meter",
    "method": "drawTraceMeter"
  },
  {
    "id": "netjack",
    "method": "drawNetjack",
    "device": "netjack"
  },
  {
    "id": "server-rack",
    "method": "drawServerRack"
  },
  {
    "id": "bell",
    "method": "drawBell",
    "device": "bell"
  },
  {
    "id": "printer",
    "method": "drawPrinter",
    "device": "printer"
  },
  {
    "id": "stamp",
    "method": "drawStamp",
    "device": "stamp"
  },
  {
    "id": "conveyor",
    "method": "drawConveyor",
    "device": "conveyor"
  },
  {
    "id": "siren",
    "method": "drawSiren",
    "device": "siren"
  },
  {
    "id": "coffee",
    "method": "drawCoffee",
    "device": "coffee"
  },
  {
    "id": "reader",
    "method": "drawReader",
    "device": "reader"
  },
  {
    "id": "chip-dispenser",
    "method": "drawChipDispenser"
  },
  {
    "id": "till",
    "method": "drawTill",
    "device": "till"
  },
  {
    "id": "radiator",
    "method": "drawRadiator"
  },
  {
    "id": "tea-table",
    "method": "drawTeaTable"
  },
  {
    "id":"tea-stool","method":"drawTeaStool"
  },
  {"id":"tea-plant","method":"drawTeaPlant"
  },
  {"id": "room-notices",
    "method": "drawRoomNotices"
  },
  {
    "id": "nightlight",
    "method": "drawNightlight",
    "device": "nightlight"
  },
  {
    "id": "rain",
    "method": "drawRain",
    "device": "rain"
  },
  {
    "id": "vent",
    "method": "drawVent",
    "device": "vent"
  },
  {
    "id": "wait-bench",
    "method": "drawWaitBench"
  },
  {
    "id": "end-wall",
    "method": "drawEndWall"
  }
];
export const sandboxElements:Element[]=sandboxPieceDefinitions.map(piece=>element(piece.id,piece.id.split('-').join(' '),piece.device?'electronics':'props',piece.device?{width:num('Device width',30,1),height:num('Device height',40,1)}:{},p=>piece.device?{x:-n(p,'width')/2-70,h:n(p,'height')+80,w:n(p,'width')+140,tall:n(p,'height')+80}:box(300,170,-150),(x,v,p,s,at)=>{if(piece.id==='button-counter-conduit'&&(!s.spots.button||!s.spots.counter))return;let frame=s;if(piece.device)frame={...s,spots:{...s.spots,[piece.device]:{x:at.x,y:at.h,w:n(p,'width'),h:n(p,'height')}}};const k=kernel(frame,{decorX:at.x});(k[piece.method] as (x:CanvasRenderingContext2D,v:View,m:SandboxSnapshot)=>void)(x,piece.device?v:raised(v,at.h),frame);}));
const roomFields={width:num('Width',3740,1),ceiling:num('Ceiling',170,1)};
const windowFields={width:num('Width',260,1),height:num('Height',122,1)};
function windowKernel(p:Properties,at:Required<Placement>,s:SandboxSnapshot){const SB=layout();SB.window={x0:at.x,x1:at.x+n(p,'width'),h0:at.h,h1:at.h+n(p,'height')};return kernel(s,{SB});}
sandboxElements.push(
{...element('marker','QA gameplay marker','markers',{role:str('Role'),width:num('Width',0,0),number:num('Station number',0,0)},()=>box(8,8,-4),()=>{}),parts:[],visualFields:{}},
element('background','QA overhead ducts','architecture',roomFields,p=>box(n(p,'width'),n(p,'ceiling')),(x,v,p,s,at)=>{x.fillStyle='#020101';x.fillRect(0,0,v.viewW,v.viewH);kernel(s,{SANDBOX_W:n(p,'width'),ceiling:n(p,'ceiling'),originX:at.x}).overhead(x,raised(v,at.h),v.sx(at.x),v.sx(at.x+n(p,'width')));}),
element('hall','QA hall panels and ceiling','architecture',roomFields,p=>box(n(p,'width'),n(p,'ceiling')),(x,v,p,s,at)=>kernel(s,{SANDBOX_W:n(p,'width'),ceiling:n(p,'ceiling'),originX:at.x}).hall(x,raised(v,at.h),v.sx(at.x),v.sx(at.x+n(p,'width')))),
element('tube','QA fluorescent tube','electronics',{flicker:{kind:'boolean',label:'Intermittent tube',default:false}},()=>({x:-90,h:4,w:180,tall:170}),(x,v,p,s,at)=>kernel(s,{ceiling:at.h+2}).tube(x,v,at.x,!!p.flicker)),
element('left-edge','QA entrance wall edge','architecture',{},()=>box(1,170),(x,v,_p,_s,at)=>{x.fillStyle='rgba(255,136,0,.7)';x.fillRect(v.sx(at.x),0,1,v.gy-at.h);}),
element('pillar','QA hazard pillar','architecture',{height:num('Height',170,1)},p=>box(10,n(p,'height'),-5),(x,v,p,s,at)=>kernel(s,{ceiling:n(p,'height')}).pillar(x,raised(v,at.h),at.x)),
element('station-sign','Hanging QA station sign','signage',{number:num('Station number',1,1),title:str('Title'),subtitle:str('Subtitle')},()=>box(400,170,-200),(x,v,p,s,at)=>kernel(s).stationSign(x,raised(v,at.h),{n:n(p,'number'),x0:at.x,x1:at.x,sign:0,title:String(p.title),sub:String(p.subtitle)})),
element('test-card','QA test card','signage',{number:num('Station number',1,1)},()=>box(18,52,-9),(x,v,p,s,at)=>{const center=s.stationCenters[String(p.number)]??at.x;kernel(s).stationCard(x,raised(v,at.h),{n:n(p,'number'),x0:center,x1:center,sign:at.x,title:'',sub:''});}),
element('workbench','QA machine workbench','furniture',{width:num('Width',100,1),height:num('Height',28,4)},p=>box(n(p,'width'),n(p,'height')),(x,v,p,s,at)=>kernel(s).bench(x,raised(v,at.h),at.x,at.x+n(p,'width'),n(p,'height')),p=>({origin,top:{x:0,h:n(p,'height'),role:'surface'}})),
element('door','QA exit door','architecture',{},()=>box(36,74,-18),(x,v,_p,_s,at)=>exitDoor(x,raised(v,at.h),at.x,'#0a0705','< EXIT'),()=>({origin,entrance:{...origin,role:'entrance'}})),
element('plan','QA test plan notice','signage',{},()=>({x:-23,h:0,w:46,tall:30}),(x,v,_p,_s,at)=>notice(x,v.t,v.sx(at.x),v.y(at.h),46,30,['TEST','PLAN'])),
element('ticker','QA scrolling information','signage',{width:num('Width',150,1),text:str('Text'),speed:num('Scroll speed',.4,0)},p=>box(n(p,'width'),10),(x,v,p,_s,at)=>ticker(x,v,{x:at.x,h:at.h,w:n(p,'width'),tall:10,mount:'wall',text:String(p.text),col:ALARM,speed:n(p,'speed')})),
element('camera','QA surveillance camera','electronics',{phase:num('Idle phase',3),direction:{kind:'select',label:'Direction',default:1,options:[-1,1]}},()=>box(28,16,-14),(x,v,p,_s,at)=>camera(x,v,{x:at.x,h:at.h,facing:n(p,'direction') as 1|-1,phase:n(p,'phase')})),
element('window-back','QA window sky, skyline and weather','architecture',windowFields,p=>box(n(p,'width'),n(p,'height')),(x,v,p,s,at)=>windowKernel(p,at,s).windowBack(x,v,s)),
element('window-front','QA window frame and sill','architecture',windowFields,p=>box(n(p,'width'),n(p,'height')),(x,v,p,s,at)=>windowKernel(p,at,s).windowFront(x,v)),
element('clock','QA wall clock','electronics',{},()=>box(30,170,-15),(x,v,_p,s,at)=>{if(s.windowVisible)kernel(s,{decorX:at.x}).wallClock(x,raised(v,at.h),s);}),
element('forecast','QA forecast ticker','signage',{width:num('Width',200,1)},p=>box(n(p,'width'),10),(x,v,p,s,at)=>{if(s.windowVisible)ticker(x,v,{x:at.x,h:at.h,w:n(p,'width'),tall:10,mount:'wall',text:s.forecast,col:'0,255,255',speed:.3});}),
element('hover','QA device hover outline','interface-world',{},()=>box(0,0),(x,v,_p,s)=>{const p=s.hoverSpot;if(p){const l=v.sx(p.x-p.w/2),t=v.y(p.y+p.h);x.save();x.strokeStyle='rgba(255,61,242,.85)';x.shadowColor='rgba(255,61,242,.8)';x.shadowBlur=8;x.strokeRect(l-3.5,t-3.5,p.w+7,p.h+7);x.restore();}}),
element('floor','QA concrete floor','surfaces',{width:num('Width',3740,1)},p=>box(n(p,'width'),0),(x,v,p,_s,at)=>{const w0=v.sx(at.x),w1=v.sx(at.x+n(p,'width')),gy=v.gy-at.h;x.fillStyle='#080606';x.fillRect(w0,gy,w1-w0,v.viewH-gy);x.fillStyle='rgba(255,136,0,.6)';x.fillRect(w0,gy,w1-w0,1);x.fillStyle='rgba(255,210,58,.22)';x.fillRect(w0,gy+4,w1-w0,1);}),
element('bay-line','QA floor bay line','surfaces',{},()=>({x:0,h:-4,w:1,tall:30}),(x,v,_p,_s,at)=>{const sx=v.sx(at.x);if(onScreen(v,sx,2)){x.fillStyle='rgba(255,210,58,.22)';x.fillRect(sx,v.gy+4-at.h,1,30);}}),
element('floor-number','QA floor number stencil','surfaces',{number:num('Station number',1,1)},()=>({x:-20,h:-16,w:40,tall:16}),(x,v,p,_s,at)=>{const cx=v.sx(at.x);if(onScreen(v,cx-20,40))text(x,String(p.number).padStart(2,'0'),cx,v.gy+16-at.h,'rgba(255,210,58,.32)',12,'600');}),
element('wiring-hint','QA wiring floor hint','surfaces',{},()=>({x:-120,h:-30,w:240,tall:10}),(x,v,_p,_s,at)=>{const a=v.sx(at.x-40),b=v.sx(at.x+40);if(onScreen(v,a-80,b-a+160))text(x,'PLATE → TIMER → SWITCH → HATCH',v.sx(at.x),v.gy+30-at.h,'rgba(255,210,58,.45)',7,'600');}),
element('watchdog-route','QA watchdog floor route','surfaces',{},()=>({x:-120,h:-8,w:240,tall:30}),(x,v,_p,_s,at)=>{const ra=v.sx(at.x);if(onScreen(v,ra-120,240)){for(let k=v.sx(at.x-115);k<v.sx(at.x+115);k+=10){x.fillStyle='rgba(255,42,68,.25)';x.fillRect(k,v.gy+8-at.h,6,2);}text(x,'QA-WD ROUTE',ra,v.gy+32-at.h,'rgba(255,42,68,.45)',7,'600');}}),
);

const sandboxFixed:Record<string,Bounds>={header:{x:-56,h:170,w:112,tall:36},reset:{x:-20,h:48,w:40,tall:48},radiator:{x:-22,h:26,w:44,tall:26},'tea-table':{x:-14,h:40,w:28,tall:40},'tea-stool':{x:-7,h:16,w:14,tall:16},'tea-plant':{x:-6,h:30,w:14,tall:30},'trace-meter':{x:-18,h:128,w:36,tall:84},'server-rack':{x:-24,h:104,w:48,tall:104},'chip-dispenser':{x:-30,h:92,w:60,tall:53},'room-notices':{x:-87,h:110,w:147,tall:40},'wait-bench':{x:-34,h:14,w:68,tall:14}};
// A device supplies its own spot from the placement before invoking the shared kernel.
// Cross-device wires, screen fills and source-station cards keep their context requirement.
const independent=new Set([...sandboxPieceDefinitions.filter(p=>p.device&&!['button-counter-conduit','spool-cable'].includes(p.id)).map(p=>p.id),'reset','radiator','tea-table','tea-stool','tea-plant','server-rack','chip-dispenser','room-notices','wait-bench','tube','pillar','station-sign','workbench','door','plan','ticker','camera','window-back','window-front','bay-line','floor-number','wiring-hint','watchdog-route']);
for(const e of sandboxElements)if(independent.has(e.type.slice(8)))e.libraryUse='reusable';
for(const id of ['server-cables','spool-cable']){
 const e=sandboxElements.find(e=>e.type==='sandbox.'+id)!;
 e.bounds=(p,state,context)=>{
  const s=visual(state),at=context?.placement??{x:0,h:0},points:{x:number;h:number}[]=[];
  if(id==='server-cables'){
   const j=s.spots.netjack,b=s.spots.bell;if(!j||!b)return{x:0,h:0,w:0,tall:0};
   points.push({x:j.x+j.w/2,h:j.y+j.h-12+at.h},{x:at.x-24,h:j.y-14+at.h},{x:at.x-17,h:60+at.h},{x:at.x+17,h:80+at.h},{x:b.x-b.w/2,h:b.y+b.h-10+at.h});
  }else{
   const d=s.spots.audit;if(!d)return{x:0,h:0,w:0,tall:0};
   points.push({x:d.x+d.w/2-8,h:d.y+d.h-6},{x:d.x+d.w/2+10,h:at.h-16},{x:at.x-Number(p.width)/2,h:at.h+Number(p.height)/2});
  }
  const left=Math.min(...points.map(q=>q.x))-1,right=Math.max(...points.map(q=>q.x))+1,top=Math.max(...points.map(q=>q.h))+1,bottom=Math.min(...points.map(q=>q.h))-1;
  return{x:left-at.x,h:top-at.h,w:right-left,tall:top-bottom};
 };
}
for(const e of sandboxElements){const id=e.type.slice(8),piece=sandboxPieceDefinitions.find(p=>p.id===id);if(piece?.device){e.bounds=p=>({x:-n(p,'width')/2,h:n(p,'height')+18,w:n(p,'width'),tall:n(p,'height')+18});e.anchors=p=>({origin,surface:{x:0,h:n(p,'height'),role:'surface'},control:{x:0,h:n(p,'height')/2,role:'handle'}});}if(sandboxFixed[id])e.bounds=()=>sandboxFixed[id];if(id==='tea-table')e.anchors=()=>({origin,top:{x:0,h:27,role:'surface'}});if(id==='tea-stool')e.anchors=()=>({origin,seat:{x:0,h:16,role:'surface'}});if(id==='tea-plant')e.anchors=()=>({origin});if(id==='wait-bench')e.anchors=()=>({origin,seat:{x:0,h:14,role:'surface'}});if(id==='end-wall')e.bounds=(_p,_s,c)=>c?screenBounds(c,{x:c.view.sx(c.placement.x),y:0,w:40,h:c.view.gy-c.placement.h},{x:0,h:306,w:40,tall:306}):{x:0,h:306,w:40,tall:306};}

// Audited local fittings: optional scalar/pose inputs have standalone defaults.
for(const e of sandboxElements)if(["trace-meter"].includes(e.type.slice(8)))e.libraryUse='reusable';
