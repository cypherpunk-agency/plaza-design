/** Independent intended-input oracle. No workbench preparation/paint helper is called here. */
import type {VehiclePreviewState}from'../../src/ssg/game/authoring/vehicle-workbench';
import {VEHICLE_FAMILIES,VEHICLE_MATRIX}from'../../src/ssg/game/authoring/inventories/S10';
import{drawCar,drawTruck,drawStraddle,drawReachStacker,drawForklift,type CarKind}from'../../src/ssg/game/art/vehicles/vehicles';
import{drawCraft,drawDrone,drawBlimp,type CraftKind}from'../../src/ssg/game/art/vehicles/air-traffic';
import{drawCab}from'../../src/ssg/game/art/vehicles/cab';
import{drawPlatformTrain}from'../../src/ssg/game/art/vehicles/platform-train';
import{drawMetroCar}from'../../src/ssg/game/art/vehicles/train-car';
import{drawSkyShips}from'../../src/ssg/game/art/environment/sky-ships';
import{SPR}from'../../src/ssg/game/art/core/sprites';
import{frameView}from'../../src/ssg/game/art/core/view';
import{lightAt}from'../../src/ssg/game/world/light';
import{createHarborPierArtwork}from'../../src/ssg/game/art/assemblies/harbor-pier';
import{harborLayout}from'../../src/ssg/game/scenes/harbor/composition';
import{openingFrame,paintOpeningPieces}from'../../src/ssg/game/art/sequences/opening/glide';
import{BOATER,drawCanalGlimpse}from'../../src/ssg/game/art/architecture/cutaway';
import{prepareCharacter}from'../../src/ssg/game/runtime/characters';
import{trainComposition,prepareTrainFrame,drawTrainComposition}from'../../src/ssg/game/scenes/train/composition';
export function intendedState(row:typeof VEHICLE_MATRIX[number]):VehiclePreviewState{
 const f=VEHICLE_FAMILIES.find(f=>f.id===row.id)!;
 const s:VehiclePreviewState={id:row.id,time:row.time,reduced:false,facing:1,speed:30,route:'stationary',cargo:true,passengers:true,doors:1,lights:true,paint:'#8a3a2a',pose:.5,seed:41,minute:580,camera:f.camera,panY:0,zoom:1};
 switch(row.case){case'reduced':s.reduced=true;break;case'facing':s.facing=-1;break;case'speed':s.route='linear';s.speed=47;break;case'route':case'route-culling':s.route='linear';break;case'cargo':s.cargo=false;break;case'passengers':s.passengers=false;break;case'doors':s.doors=0;break;case'lights':s.lights=false;break;case'paint':s.paint='#346789';break;case'pose':s.pose=.85;break;case'seed':s.seed=127;break;}
 return s;
}
export function paintVehicleNativeReference(ctx:CanvasRenderingContext2D,s:VehiclePreviewState,width=800,height=420){
 const family=VEHICLE_FAMILIES.find(f=>f.id===s.id)!,W=family.width,t=s.reduced?0:s.time*60,L=lightAt(1,s.minute,90,null),offset=family.controls.includes('route')&&s.route==='linear'?s.speed*(s.reduced?0:s.time):0;
 const v={...frameView(t,L),viewW:W,viewH:260,cam:s.camera,gy:210,sx:(x:number,p=1)=>Math.round(x-s.camera*p),y:(h:number)=>210-h},nil={visible:false as const,character:{x:0}},box={w:320,h:69,p:2,seed:71,code:'PLZU 610 0041'};
 ctx.save();try{ctx.clearRect(0,0,width,height);ctx.fillStyle='#0c0a12';ctx.fillRect(0,0,width,height);
 if(s.id.startsWith('opening.')){ctx.translate(width/2,height/2+s.panY);ctx.scale(s.zoom,s.zoom);ctx.translate(-width/2,-height/2);const f=openingFrame(ctx,{W:width,H:height,reduced:s.reduced,lighting:L},t/60,0,{x:s.camera,h:0,actors:{}});ctx.save();ctx.scale(f.scale,f.scale);paintOpeningPieces(ctx,f.parts.filter(p=>s.id==='opening.boats'?p.id==='boats':p.id.startsWith('coast.ship-')),f.drop);ctx.restore();return;}
 ctx.translate(width/2,height*.72+s.panY);const scale=Math.min(width/W,family.height!==260?height*.65/family.height:height/260)*s.zoom;ctx.scale(scale,scale);
 const local=s.id.startsWith('ground.')||s.id.startsWith('air.')||s.id==='train.metro'||s.id==='cab.legacy';
 if(local){ctx.translate(offset-s.camera,0);if(s.id==='train.metro')ctx.translate(-266,0);}else{ctx.translate(-W/2,-210);if(s.id==='canal.boat')ctx.translate(0,210);}
 const id=s.id.split('.')[1],common={t,still:s.reduced,face:s.facing,lights:s.lights};
 if(s.id.startsWith('ground.')){
  if(['sedan','hatch','van','cab','bus'].includes(id))drawCar(ctx,{...common,paint:s.paint,kind:id as CarKind,route:'7'});
  else if(id==='truck'||id==='yard')drawTruck(ctx,{...common,paint:s.paint,box:s.cargo?box:null,yard:id==='yard'});
  else if(id==='straddle')drawStraddle(ctx,{...common,box:s.cargo?box:null,lift:s.pose});
  else if(id==='stacker')drawReachStacker(ctx,{...common,box:s.cargo?box:null,reach:s.pose});
  else drawForklift(ctx,{...common,load:s.cargo,lift:s.pose});
 }else if(s.id.startsWith('air.')){
  if(id==='drone')drawDrone(ctx,{t,still:s.reduced,cargo:s.cargo});
  else if(id==='blimp')drawBlimp(ctx,{t,still:s.reduced});
  else drawCraft(ctx,id as CraftKind,{t,still:s.reduced,face:s.facing,scale,paint:s.paint,box:s.cargo?box:null,beam:s.lights});
 }else if(s.id==='cab.legacy')drawCab(ctx,0,0,1,t);
 else if(s.id.startsWith('fleet.'))drawSkyShips(ctx,v,[{sprite:SPR[id as 'spinner'|'freighter'|'drone'],ps:2,y:68,speed:s.speed/60,offset:W/2+130,flip:s.facing<0,depth:.55}]);
 else if(s.id==='train.platform')drawPlatformTrain(ctx,v,{x:40,open:s.doors,moving:s.doors===0,riderSeed:s.passengers?s.seed:0,destination:'GALLERIA'});
 else if(s.id==='train.metro')drawMetroCar(ctx,0,h=>-h,{t,c:0,seed:s.passengers?s.seed:s.seed+1,dest:'GALLERIA',ox:offset,plate:'CAR 3',still:s.reduced});
 else if(s.id==='train.interior'){
  const frame=prepareTrainFrame(trainComposition,v,null,{ride:{at:0,to:1,phase:s.doors>0?'dwell':'running',timer:0,dwell:330,pos:0,d:0,span:3000,frames:780,v:0,open:s.doors,doors:false,halt:null,haltFor:0,decel:.032,say:'DOWNTOWN'},lineOpen:{downtown:true,galleria:true,harbor:true},between:s.doors===0,atSiding:false,due:0,next:'galleria',open:s.doors>.6,run:0,lighting:L,home:false});if(!s.passengers)for(const r of Object.values(frame.riders))r.on=false;drawTrainComposition(ctx,v,frame,'backdrop');drawTrainComposition(ctx,v,frame,'foreground');
 }else if(s.id.startsWith('harbor.')){
  const layout=harborLayout(),k=createHarborPierArtwork({L:layout,visual:{cranes:[],forklift:{x:70,dir:1},bribed:false,weatherLine:''},fishPose:nil,teaPose:nil,loads:[]});
  if(id==='lamp')k.drawLampBoat(ctx,v);else if(id==='patrol')k.drawPatrol(ctx,v);else if(id==='ferry')k.drawFerry(ctx,v);else if(id==='forklift'){k.forkliftBody(ctx,v);k.forkliftRoof(ctx,v);}else{v.cam=layout.arch.x0-100;v.sx=(x,p=1)=>Math.round(x-v.cam*p);k.archChassis(ctx,v);}
 }else drawCanalGlimpse(ctx,900,{t,still:s.reduced,boatX:400,boatPose:s.passengers?prepareCharacter(BOATER,t):nil,lighting:L});
 }finally{ctx.restore();}
}
