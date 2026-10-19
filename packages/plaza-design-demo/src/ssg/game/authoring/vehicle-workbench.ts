/** Viewing only. Native paint kernels consume explicit, disposable presentation inputs. */
import { VEHICLE_FAMILIES,type VehicleFamily } from './inventories/S10';
import { WorkbenchPlayback,mountWorkbenchPlayback } from './workbench-playback';
import { drawCar,drawTruck,drawStraddle,drawReachStacker,drawForklift,type CarKind } from '../art/vehicles/vehicles';
import { drawCraft,drawDrone,drawBlimp,type CraftKind } from '../art/vehicles/air-traffic';
import { drawCab } from '../art/vehicles/cab';
import { drawPlatformTrain,type PlatformTrainVisual } from '../art/vehicles/platform-train';
import { drawMetroCar } from '../art/vehicles/train-car';
import { drawSkyShips,type Ship } from '../art/environment/sky-ships';
import { SPR } from '../art/core/sprites';
import { frameView,type View } from '../art/core/view';
import { lightAt } from '../world/light';
import { BOX40,type Crate } from '../art/props/containers';
import { createHarborPierArtwork,type ArtworkInputs } from '../art/assemblies/harbor-pier';
import { harborLayout } from '../scenes/harbor/composition';
import { openingFrame,paintOpeningPieces } from '../art/sequences/opening/glide';
import { BOATER,drawCanalGlimpse } from '../art/architecture/cutaway';
import { prepareCharacter } from '../runtime/characters';
import { trainComposition,prepareTrainFrame,drawTrainComposition } from '../scenes/train/composition';
import type { TrainVisualState } from '../art/assemblies/train-interior';
import { paintRoadVehicle,roadVehicleKinds } from '../art/vehicles/road-vehicle';
import { SIZE,M } from '../art/vehicles/vehicles';
import { drawPlayer } from '../art/characters/player';
import { DEPTH_BANDS,DEPTH_ORDER,type DepthBand } from '../art/core/depth';

export interface VehiclePreviewState {
 id:string;time:number;reduced:boolean;facing:1|-1;speed:number;route:'stationary'|'linear';
 cargo:boolean;passengers:boolean;doors:number;lights:boolean;paint:string;pose:number;
 seed:number;minute:number;camera:number;panY:number;zoom:number;
}
export const DEFAULT_VEHICLE_STATE:VehiclePreviewState={id:'ground.sedan',time:0,reduced:false,facing:1,speed:30,route:'stationary',cargo:true,passengers:true,doors:1,lights:true,paint:'#8a3a2a',pose:.5,seed:41,minute:580,camera:0,panY:0,zoom:1};
export interface VehicleJob { renderer:string; paint:(ctx:CanvasRenderingContext2D)=>void; inputs:unknown }
export interface PreparedVehiclePreview { state:Readonly<VehiclePreviewState>;family:VehicleFamily;view:View;width:number;height:number;offset:number;jobs:VehicleJob[] }
const LOAD:Crate={...BOX40,p:2,seed:71,code:'PLZU 610 0041'};
const nil={visible:false as const,character:{x:0}};
export function vehicleFamily(id:string){const f=VEHICLE_FAMILIES.find(f=>f.id===id);if(!f)throw new Error('Unknown vehicle family: '+id);return f;}
export function vehicleState(id:string):VehiclePreviewState{const f=vehicleFamily(id);return{...DEFAULT_VEHICLE_STATE,id,camera:f.camera};}
export function validateVehicleState(input:VehiclePreviewState):VehiclePreviewState{
 vehicleFamily(input.id);for(const k of ['time','speed','doors','pose','seed','minute','camera','panY','zoom'] as const)if(!Number.isFinite(input[k]))throw new Error('Invalid vehicle '+k);
 if(input.time<0||input.time>300||input.speed<0||input.speed>300||input.doors<0||input.doors>1||input.pose<0||input.pose>1||input.zoom<.1||input.zoom>8||!Number.isInteger(input.seed)||input.seed<0||input.seed>1000000||input.minute<0||input.minute>=1440||![1,-1].includes(input.facing)||!['stationary','linear'].includes(input.route)||!/^#[a-fA-F0-9]{6}$/.test(input.paint))throw new Error('Unsupported vehicle preview input');
 for(const k of ['reduced','cargo','passengers','lights'] as const)if(typeof input[k]!=='boolean')throw new Error('Invalid vehicle '+k);
 return{...input};
}
/** Build inputs only. No timetable advance, save read, singleton writes, or canvas work. */
export function prepareVehiclePreview(input:VehiclePreviewState,width=800,height=420):PreparedVehiclePreview{
 const state=validateVehicleState(input),family=vehicleFamily(state.id);if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1)throw new Error('Invalid vehicle viewport');
 const t=state.reduced?0:state.time*60,lighting=lightAt(1,state.minute,90,null),W=family.width,H=260;
 const view:View={...frameView(t,lighting),viewW:W,viewH:H,cam:state.camera,gy:210,sx:(x,p=1)=>Math.round(x-state.camera*p),y:h=>210-h};
 const offset=family.controls.includes('route')&&state.route==='linear'?state.speed*(state.reduced?0:state.time):0;
 const jobs:VehicleJob[]=[],job=(renderer:string,inputs:unknown,paint:VehicleJob['paint'])=>jobs.push({renderer,inputs,paint});
 const kind=state.id.split('.')[1],common={t,still:state.reduced,face:state.facing,lights:state.lights};
 if(state.id.startsWith('ground.')){
  if(['sedan','hatch','van','cab','bus'].includes(kind)){const driving=state.route==='linear',o={...common,paint:state.paint,kind:kind as CarKind,route:'7',...(driving?{roll:offset,exhaust:true}:{door:state.doors})};job('drawCar',o,x=>drawCar(x,o));}
  else if(kind==='truck'||kind==='yard'){const o={...common,paint:state.paint,box:state.cargo?{...LOAD}:null,yard:kind==='yard',...(state.route==='linear'?{roll:offset}:{})};job('drawTruck',o,x=>drawTruck(x,o));}
  else if(kind==='straddle'){const o={...common,box:state.cargo?{...LOAD}:null,lift:state.pose};job('drawStraddle',o,x=>drawStraddle(x,o));}
  else if(kind==='stacker'){const o={...common,box:state.cargo?{...LOAD}:null,reach:state.pose};job('drawReachStacker',o,x=>drawReachStacker(x,o));}
  else{const o={...common,load:state.cargo,lift:state.pose};job('drawForklift',o,x=>drawForklift(x,o));}
 }else if(state.id.startsWith('air.')){
  if(kind==='drone'){const o={t,still:state.reduced,cargo:state.cargo};job('drawDrone',o,x=>drawDrone(x,o));}
  else if(kind==='blimp'){const o={t,still:state.reduced};job('drawBlimp',o,x=>drawBlimp(x,o));}
  else{const o={t,still:state.reduced,face:state.facing,scale:Math.min(width/W,height/H)*state.zoom,paint:state.paint,box:state.cargo?{...LOAD}:null,beam:state.lights};job('drawCraft',{kind,...o},x=>drawCraft(x,kind as CraftKind,o));}
 }else if(state.id==='cab.legacy'){job('drawCab',{cx:0,base:0,k:1,t},x=>drawCab(x,0,0,1,t));
 }else if(state.id.startsWith('fleet.')){
  const ship:Ship={sprite:SPR[kind as 'spinner'|'freighter'|'drone'],ps:2,y:68,speed:state.speed/60,offset:W/2+130,flip:state.facing<0,depth:.55};job('drawSkyShips',{ships:[ship]},x=>drawSkyShips(x,view,[ship]));
 }else if(state.id==='train.platform'){
  // Existing renderer only takes seeded crowd; an explicit rider seed is the supported passenger variation.
  const train:PlatformTrainVisual={x:40,open:state.doors,moving:state.doors===0,riderSeed:state.passengers?state.seed:0,destination:'GALLERIA'};
  job('drawPlatformTrain',train,x=>drawPlatformTrain(x,view,train));
 }else if(state.id==='train.metro'){
  const o={t,c:0,seed:state.passengers?state.seed:state.seed+1,dest:'GALLERIA',ox:offset,plate:'CAR 3',still:state.reduced};job('drawMetroCar',o,x=>drawMetroCar(x,0,h=>-h,o));
 }else if(state.id==='train.interior'){
  const visual:TrainVisualState={ride:{at:0,to:1,phase:state.doors>0?'dwell':'running',timer:0,dwell:330,pos:0,d:0,span:3000,frames:780,v:0,open:state.doors,doors:false,halt:null,haltFor:0,decel:.032,say:'DOWNTOWN'},lineOpen:{downtown:true,galleria:true,harbor:true},between:state.doors===0,atSiding:false,due:0,next:'galleria',open:state.doors>.6,run:0,lighting,home:false};
  const f=prepareTrainFrame(trainComposition,view,null,visual);if(!state.passengers)for(const rider of Object.values(f.riders))rider.on=false;
  job('drawTrainComposition',f,x=>{drawTrainComposition(x,view,f,'backdrop');drawTrainComposition(x,view,f,'foreground');});
 }else if(state.id.startsWith('harbor.')){
  const L=harborLayout(),inputs:ArtworkInputs={L,visual:{cranes:[],forklift:{x:70,dir:1},bribed:false,weatherLine:''},fishPose:nil,teaPose:nil,loads:[]},k=createHarborPierArtwork(inputs);
  if(kind==='lamp')job('drawLampBoat',{view},x=>k.drawLampBoat(x,view));
  else if(kind==='patrol')job('drawPatrol',{view},x=>k.drawPatrol(x,view));
  else if(kind==='ferry')job('drawFerry',{view},x=>k.drawFerry(x,view));
  else if(kind==='forklift'){job('forkliftBody',{view,visual:inputs.visual},x=>k.forkliftBody(x,view));job('forkliftRoof',{view,visual:inputs.visual},x=>k.forkliftRoof(x,view));}
  else{view.cam=L.arch.x0-100;view.sx=(x,p=1)=>Math.round(x-view.cam*p);job('archChassis',{view,layout:L.arch},x=>k.archChassis(x,view));}
 }else if(state.id.startsWith('opening.')){
  job('openingFrame '+kind,{time:t/60,camera:state.camera},x=>{const frame=openingFrame(x,{W:width,H:height,reduced:state.reduced,lighting},t/60,0,{x:state.camera,h:0,actors:{}}),parts=frame.parts.filter(p=>kind==='boats'?p.id==='boats':p.id.startsWith('coast.ship-'));x.save();x.scale(frame.scale,frame.scale);paintOpeningPieces(x,parts,frame.drop);x.restore();});
 }else{
  const boatPose=state.passengers?prepareCharacter(BOATER,t):nil,o={t,still:state.reduced,boatX:400,boatPose,lighting};job('drawCanalGlimpse',o,x=>drawCanalGlimpse(x,900,o));
 }
 return{state:Object.freeze(state),family,view,width,height,offset,jobs};
}
/** Canonical workbench framing; all artwork below is dispatched to shipping kernels. */
export function paintVehiclePreview(ctx:CanvasRenderingContext2D,p:PreparedVehiclePreview){
 ctx.save();try{
  ctx.clearRect(0,0,p.width,p.height);ctx.fillStyle='#0c0a12';ctx.fillRect(0,0,p.width,p.height);
  if(p.state.id.startsWith('opening.')){ctx.translate(p.width/2,p.height/2+p.state.panY);ctx.scale(p.state.zoom,p.state.zoom);ctx.translate(-p.width/2,-p.height/2);for(const job of p.jobs)job.paint(ctx);return;}
  const scale=Math.min(p.width/p.family.width,p.family.height!==260?p.height*.65/p.family.height:p.height/260)*p.state.zoom;
  ctx.translate(p.width/2,p.height*.72+p.state.panY);ctx.scale(scale,scale);
  const local=p.state.id.startsWith('ground.')||p.state.id.startsWith('air.')||p.state.id==='train.metro'||p.state.id==='cab.legacy';
  if(local){ctx.translate(p.offset-p.state.camera,0);if(p.state.id==='train.metro')ctx.translate(-266,0);
   if(p.state.id.startsWith('ground.')){const len=SIZE[p.state.id.split('.')[1] as keyof typeof SIZE]??120,px=len/2+30-p.offset;drawPlayer(ctx,{...p.view,sx:x=>x,y:h=>-h,cam:0,gy:0},SPR.stand,{x:px,y:0,face:-1},undefined,0);}}
  else{ctx.translate(-p.family.width/2,-210);if(p.state.id==='canal.boat')ctx.translate(0,210);}
  for(const job of p.jobs)job.paint(ctx);
 }finally{ctx.restore();}}

/** The placeable road vehicles side by side at true scale, the player first, on a metre ruler. Returns each vehicle's span in canvas pixels. */
export function paintVehicleLineup(ctx:CanvasRenderingContext2D,width:number,height:number,o:{depth:DepthBand;t:number;moving:boolean;lights:boolean;paint:string;minute:number}):{kind:string;x0:number;x1:number}[]{
 const gap=36,start=60,kinds=roadVehicleKinds,band=DEPTH_BANDS[o.depth],total=start+kinds.reduce((sum,k)=>sum+SIZE[k]*band.scale+gap,0)+20;
 const scale=Math.min(width/total,height*.62/(130)),ground=Math.round(height*.78),spans:{kind:string;x0:number;x1:number}[]=[],view={...frameView(o.t,lightAt(1,o.minute,90,null)),viewW:width,viewH:height,cam:0,gy:0,sx:(x:number)=>x,y:(h:number)=>-h};
 ctx.save();ctx.clearRect(0,0,width,height);ctx.fillStyle='#0c0a12';ctx.fillRect(0,0,width,height);
 ctx.fillStyle='#493425';ctx.fillRect(0,ground,width,1);ctx.fillStyle='#6f5a48';ctx.font='10px "IBM Plex Mono", monospace';
 for(let m=0;m*M*scale<width;m++){const x=Math.round(m*M*scale);ctx.fillRect(x,ground+1,1,m%5===0?6:3);if(m%5===0&&m)ctx.fillText(m+' m',x+3,ground+15);}
 ctx.translate(0,ground);ctx.scale(scale,scale);
 drawPlayer(ctx,view,SPR.stand,{x:start/2,y:0,face:1},undefined,0);
 let x=start;for(const kind of kinds){const len=SIZE[kind]*band.scale,cx=x+len/2;ctx.save();ctx.translate(cx,0);
  paintRoadVehicle(ctx,{kind,paint:o.paint,depth:o.depth,motion:o.moving?'driving':'parked',direction:'right',speed:2,lane:1400,lights:o.lights,door:0,route:'7'},o.t,1,o.moving?o.t*2:0);ctx.restore();
  spans.push({kind,x0:x*scale,x1:(x+len)*scale});x+=len+gap;}
 ctx.restore();
 ctx.fillStyle='rgba(143,162,185,.6)';ctx.font='10px "IBM Plex Mono", monospace';for(const s of spans)ctx.fillText(s.kind,s.x0,ground+28);
 return spans;
}
export function mountVehicleWorkbench(host:HTMLElement):()=>void{
 const root=document.createElement('section'),heading=document.createElement('h2'),select=document.createElement('select'),details=document.createElement('p'),controls=document.createElement('div'),transport=document.createElement('div'),canvas=document.createElement('canvas'),status=document.createElement('output');
 const modes=document.createElement('div'),lineupControls=document.createElement('div');modes.className='segmented';modes.setAttribute('role','group');modes.setAttribute('aria-label','View');modes.style.margin='8px 0';
 heading.textContent='Vehicle workbench';select.setAttribute('aria-label','Vehicle family');canvas.width=960;canvas.height=360;canvas.style.maxWidth='100%';canvas.style.background='#0c0a12';
 for(const f of VEHICLE_FAMILIES){const option=document.createElement('option');option.value=f.id;option.textContent=f.group+' / '+f.label;select.append(option);}
 root.append(heading,modes,lineupControls,select,details,controls,transport,canvas,status);host.append(root);let state=vehicleState(select.value),disposed=false,raf=0,mode:'lineup'|'single'='lineup',spans:{kind:string;x0:number;x1:number}[]=[];
 const line={depth:'play' as DepthBand,moving:true,lights:false,paint:'#3f5f7a'};
 const ctx=canvas.getContext('2d')!;let ui:ReturnType<typeof mountWorkbenchPlayback>|undefined;
 const draw=()=>{if(disposed)return;state.time=clock.time;state.reduced=clock.reduced;try{
  if(mode==='lineup'){spans=paintVehicleLineup(ctx,canvas.width,canvas.height,{...line,t:clock.reduced?0:clock.time*60,minute:state.minute});status.value='Road vehicles you can place in a scene (Library › Artwork › Road vehicle), at true scale next to the player. Click one to inspect it.';}
  else{paintVehiclePreview(ctx,prepareVehiclePreview(state,canvas.width,canvas.height));status.value='Time '+clock.time.toFixed(3)+' s · temporary preview; player state untouched';}
 }catch(e){status.value=String(e);}ui?.refresh();};
 const clock=new WorkbenchPlayback(50,draw);ui=mountWorkbenchPlayback(transport,clock);
 const label=(text:string,input:HTMLElement,host:HTMLElement=controls)=>{const l=document.createElement('label');l.style.marginRight='12px';l.append(text+' ',input);host.append(l);};
 const setMode=(next:'lineup'|'single')=>{mode=next;for(const b of modes.children)b.setAttribute('aria-pressed',String((b as HTMLElement).dataset.mode===mode));// style.display, not hidden: the workbench stylesheet sets display on these rows
  for(const n of [select,details,controls])n.style.display=mode==='lineup'?'none':'';lineupControls.style.display=mode==='lineup'?'':'none';draw();};
 for(const [id,text] of [['lineup','Lineup'],['single','Single']] as const){const b=document.createElement('button');b.type='button';b.textContent=text;b.dataset.mode=id;b.onclick=()=>setMode(id);modes.append(b);}
 {const depth=document.createElement('select');for(const d of DEPTH_ORDER){const o=document.createElement('option');o.value=d;o.textContent=DEPTH_BANDS[d].label;depth.append(o);}depth.value=line.depth;depth.onchange=()=>{line.depth=depth.value as DepthBand;draw();};label('Depth',depth,lineupControls);
  const moving=document.createElement('input');moving.type='checkbox';moving.checked=line.moving;moving.onchange=()=>{line.moving=moving.checked;draw();};label('Driving (wheels turn, exhaust)',moving,lineupControls);
  const lights=document.createElement('input');lights.type='checkbox';lights.checked=line.lights;lights.onchange=()=>{line.lights=lights.checked;draw();};label('Lights',lights,lineupControls);
  const paint=document.createElement('input');paint.type='color';paint.value=line.paint;paint.oninput=()=>{line.paint=paint.value;draw();};label('Paint',paint,lineupControls);}
 canvas.onclick=event=>{if(mode!=='lineup')return;const r=canvas.getBoundingClientRect(),x=(event.clientX-r.left)*canvas.width/r.width,hit=spans.find(s=>x>=s.x0&&x<s.x1);if(!hit)return;const id='ground.'+hit.kind;if(!VEHICLE_FAMILIES.some(f=>f.id===id))return;select.value=id;state=vehicleState(id);refresh();setMode('single');};
 const refresh=()=>{const f=vehicleFamily(state.id);controls.replaceChildren();details.textContent=f.source+' → '+f.renderer+'. '+(f.note??'Shipping renderer, explicit presentation inputs.')+' Route: '+(f.route==='native'?'native or fixed snapshot':'stationary / linear inspection transform')+'. Unsupported controls are disabled.';
  const numeric=(key:'speed'|'doors'|'pose'|'seed'|'minute'|'camera'|'panY'|'zoom',title:string,min:number,max:number,step:number,enabled=true)=>{const el=document.createElement('input');el.type='number';el.value=String(state[key]);el.min=String(min);el.max=String(max);el.step=String(step);el.disabled=!enabled;el.onchange=()=>{state={...state,[key]:Number(el.value)};draw();};label(title,el);};
  const toggle=(key:'cargo'|'passengers'|'lights',title:string)=>{const el=document.createElement('input');el.type='checkbox';el.checked=state[key];el.disabled=!f.controls.includes(key);el.onchange=()=>{state={...state,[key]:el.checked};draw();};label(title,el);};
  const facing=document.createElement('select');for(const[n,v]of [['Right','1'],['Left','-1']]){const o=document.createElement('option');o.value=v;o.textContent=n;facing.append(o);}facing.value=String(state.facing);facing.disabled=!f.controls.includes('facing');facing.onchange=()=>{state.facing=Number(facing.value) as 1|-1;draw();};label('Facing',facing);
  const route=document.createElement('select');for(const [id,text] of [['stationary','parked'],['linear','driving']]){const o=document.createElement('option');o.value=id;o.textContent=text;route.append(o);}route.value=state.route;route.disabled=!f.controls.includes('route');route.onchange=()=>{state.route=route.value as VehiclePreviewState['route'];draw();};label('Motion',route);
  const car=['ground.sedan','ground.hatch','ground.van','ground.cab'].includes(f.id);
  numeric('speed','Speed',0,300,1,f.controls.includes('speed'));numeric('doors',car?'Driver door (parked)':'Doors',0,1,.1,f.controls.includes('doors')||car);
  const machinery=['ground.straddle','ground.stacker','ground.forklift'].includes(f.id);numeric('pose','Lift / reach',0,1,.1,machinery);
  toggle('cargo','Cargo');toggle('passengers',f.id==='train.platform'||f.id==='train.metro'?'Alternate rider seed':'Passengers');toggle('lights','Lights / patrol beam');
  const paint=document.createElement('input');paint.type='color';paint.value=state.paint;paint.disabled=!f.controls.includes('paint');paint.onchange=()=>{state.paint=paint.value;draw();};label('Paint',paint);
  numeric('seed','Passenger seed',0,1000000,1,f.controls.includes('seed'));numeric('minute','Minute of day',0,1439,1,f.id==='train.interior'||f.id.startsWith('opening.')||f.id==='canal.boat');numeric('camera','Camera X',-20000,20000,10);numeric('panY','Camera vertical',-1000,1000,10);numeric('zoom','Zoom',.1,8,.1);
  const reset=document.createElement('button');reset.textContent='Reset camera';reset.onclick=()=>{state={...state,camera:f.camera,panY:0,zoom:1};refresh();draw();};controls.append(reset);draw();};
 select.onchange=()=>{state=vehicleState(select.value);refresh();};refresh();setMode('lineup');const loop=(now:number)=>{if(disposed)return;clock.tick(now);raf=requestAnimationFrame(loop);};raf=requestAnimationFrame(loop);
 return()=>{disposed=true;cancelAnimationFrame(raf);clock.dispose();ui?.dispose();root.remove();};
}
