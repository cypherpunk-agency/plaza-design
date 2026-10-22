/** Pure vehicle rules called by the existing level step. Movers own motion; LevelState owns boarding. */
import type {Resolved} from '../art/core/composition';
import type {Level,LevelSource,LevelPlayer,LevelHint,Movers,MoverModel} from './level';
import {validateVehicle,vehicleFrame,consistLevel,boardAt,alightAt,vehicleDoorsAt,vehicleSeatsAt,type VehicleSource,type VehicleFrame} from '../world/vehicles';
import {routeProblems} from '../world/vehicles';
import type {ZoneGraphSource} from '../world/zone-graph';
/** Validate the same prospective route graph used by native Play and protected source saves. */
export function validateWorldVehicles(scenes:Readonly<Record<string,{level?:LevelSource}>>,graph:ZoneGraphSource){
 for(const [owner,scene]of Object.entries(scenes))for(const v of scene.level?.vehicles??[]){
  if(v.lift)continue;
  const source={...v.source,route:{...v.source.route,legs:v.source.route.legs.map(l=>({...l,zone:l.zone==='here'?owner:l.zone}))},berths:v.source.berths.map(b=>({...b,zone:b.zone==='here'?owner:b.zone}))};
  const problems=routeProblems(source,graph,scenes);if(problems.length)throw Error(problems.join('; '));
  for(const berth of source.berths)if(berth.floor&&!scenes[berth.zone]?.level?.floors.some(f=>f.id===berth.floor))throw Error('Vehicle berth names a missing floor: '+berth.zone+'/'+berth.floor);
 }
}
export interface LevelVehicle {id:string;source:VehicleSource;zone?:string;x:number;h:number;lift?:string}
export interface VehicleAttachment {id:string;x:number;h:number;seat?:string;panel?:{lift:string;pick:number}}
export interface VehicleSave {owner:string;id:string;x:number;h:number;seat?:string}
/** The player's current place in the vehicle, independent of the world's floating origin. */
export function saveVehicle(lv:Level|undefined|null,p:LevelPlayer,here:string):VehicleSave|undefined{
 const rider=lv?.state.vehicle,definition=rider&&(lv!.source.vehicleBase??lv!.source).vehicles?.find(v=>v.id===rider.id);
 if(!rider||!definition||definition.lift)return;
 return{owner:definition.zone??here,id:definition.source.id,x:p.x-rider.x,h:p.y-rider.h,...(rider.seat?{seat:rider.seat}:{})};
}
/** Restore current-format attachment only after the existing model has restored its service movers. */
export function restoreVehicle(lv:Level,p:LevelPlayer,m:Movers,value:VehicleSave):boolean{
 if(!value||typeof value.owner!=='string'||typeof value.id!=='string'||!Number.isFinite(value.x)||!Number.isFinite(value.h))return false;
 const base=lv.source.vehicleBase??lv.source,definition=base.vehicles?.find(v=>(v.zone??value.owner)===value.owner&&v.source.id===value.id&&!v.lift);if(!definition)return false;
 stepLevelVehicles(lv,p,m);const frame=lv.source.vehicleFrames?.find(f=>f.vehicle.id===definition.id);
 const floor=frame?.part.source.floors.find(f=>value.x>=f.x&&value.x<=f.x+f.w&&Math.abs(value.h-f.h)<1);if(!frame||!floor)return false;
 const seat=typeof value.seat==='string'&&vehicleSeatsAt(frame).some(s=>s.id===value.seat)?value.seat:undefined;
 lv.state.vehicle={id:definition.id,x:frame.part.dx,h:frame.part.dh,...(seat?{seat}:{})};lv.state.floor=definition.id+'/'+floor.id;
 Object.assign(p,{x:frame.part.dx+value.x,y:frame.part.dh+floor.h,vy:0,onGround:true,moving:false});
 if(seat)model(m,definition.zone).playerSeat={vehicle:definition.source.id,seat};return true;
}
export function compileLevelVehicles(rows:readonly Resolved[]):LevelVehicle[]{
 const byId=new Map(rows.map(r=>[r.instance.id,r])),parents=new Map(rows.flatMap(r=>(r.instance.children??[]).map(c=>[c.id,r.instance.id] as const)));
 const attached=(id:string,owner:string)=>{let at:string|undefined=id;for(let i=0;at&&i<64;i++){if(at===owner)return true;at=byId.get(at)?.instance.attach?.instance??parents.get(at);}return false;};
 return rows.filter(r=>r.element.type==='vehicle.frame').map(r=>{
 const source=structuredClone(validateVehicle(r.props.vehicle));
 for(const car of source.cars)for(const seat of car.seats)if(seat.artwork){
  const furniture=rows.find(row=>row.instance.id===seat.artwork),carArt=rows.find(row=>row.instance.id===car.id);
  if(!furniture||furniture.element.type!=='vehicle.seat'||!carArt||!attached(car.id,r.instance.id)||!attached(furniture.instance.id,car.id))throw Error('Vehicle seat must reference registered seat artwork in its car: '+seat.id);
  if(furniture.placement.scale!==1||furniture.placement.facing!==1)throw Error('Linked vehicle seats use world scale and facing 1');
  const anchor=furniture.element.anchors(furniture.props,{})[seat.anchor!];
  if(!anchor)throw Error('Missing vehicle seat anchor: '+seat.anchor);
  seat.x=furniture.placement.x+anchor.x-carArt.placement.x;seat.h=furniture.placement.h+anchor.h-carArt.placement.h;
 }
 validateVehicle(source);
 if(r.placement.scale!==1||r.placement.facing!==1||r.placement.parallax!==1)throw Error('Walkable vehicle frames use world scale, facing and parallax 1');
 if(source.route.legs.some(l=>l.tilt||l.facing===-1))throw Error('Walkable vehicle floors do not yet support tilt or reversed frames');
 return{id:r.instance.id,source,x:r.placement.x,h:r.placement.h};
});}
const model=(m:Movers,zone?:string):MoverModel=>typeof m==='function'?m(zone):m;
/** No mutation: the live picture can read this without advancing a vehicle or a passenger. */
export function levelVehicleFrames(source:LevelSource,m:Movers):VehicleFrame[]{
 const base=source.vehicleBase??source,placed=new Map(Object.entries(base.vehicleZones??base.zones??{}).map(([id,z])=>[id,{dx:z.x,dh:z.h}]));
 return(base.vehicles??[]).flatMap(v=>{
  const placements=new Map(placed);
  if(v.zone&&placed.has(v.zone))placements.set('here',placed.get(v.zone)!);
  if(!base.zones&&!base.vehicleZones)for(const leg of v.source.route.legs)placements.set(leg.zone,{dx:0,dh:0});
  for(const[id,p]of placements)placements.set(id,{dx:p.dx+v.x,dh:p.dh+v.h});
  const framed={...v.source,id:v.id},frame=vehicleFrame(framed,model(m,v.zone),placements,consistLevel(framed));
  // An open doors mover cannot authorize boarding while the frame is still moving through a berth.
  const movers=model(m,v.zone).movers;
  if(frame&&(movers.travelling?.(v.source.mover)??movers.moving(v.source.mover)))frame.berth=undefined;
  if(frame)frame.occupied=model(m,v.zone).occupiedSeats?.(v.id.split('/').at(-1)!)??[];
  if(frame&&v.source.boardQuery)frame.boarding=model(m,v.zone).gameplayQuery?.(v.source.boardQuery)===true;
  return frame?[frame]:[];
 });
}
/** Rebuild only derived moving floors, then carry the player's existing vehicle-relative place. */
export function stepLevelVehicles(lv:Level,p:LevelPlayer,m:Movers){
 const base=lv.source.vehicleBase??lv.source;if(!base.vehicles?.length)return;
 const frames=levelVehicleFrames(base,m),floors=[...base.floors],shells={...base.shells},ghost={...base.ghost},revealSpeed={...base.revealSpeed};
 for(const f of frames){
  const id=f.vehicle.id,definition=base.vehicles.find(v=>v.id===id)!;
  for(const floor of f.part.source.floors){
   const landing=definition.lift?(f.berth?.floor?base.floors.find(fl=>fl.id===f.berth!.floor):lv.source.floors.find(fl=>fl.id===id+'/'+floor.id)):undefined;
   floors.push({...floor,id:id+'/'+floor.id,zone:id,building:definition.lift?(f.vehicle.inside?(definition.zone?definition.zone+'/':'')+f.vehicle.inside:''):id,x:floor.x+f.part.dx,h:floor.h+f.part.dh,...(landing?{label:landing.label}:{}),...(landing?.indoor?{indoor:true as const}:{})});
  }
  if(definition.lift)continue;
  const prefix=definition.zone?definition.zone+'/':'';
  shells[id]=(f.vehicle.shell??[]).map(s=>prefix+s);ghost[id]=f.vehicle.ghost??.12;revealSpeed[id]=f.vehicle.revealSpeed??.08;lv.state.reveal[id]??=0;
 }
 lv.source={...base,vehicleBase:base,vehicleFrames:frames,floors,shells,ghost,revealSpeed,low:Math.min(...floors.map(f=>f.h)),high:Math.max(...floors.map(f=>f.h))};
 const riding=lv.state.vehicle;if(!riding)return;
 const next=frames.find(f=>f.vehicle.id===riding.id);
 if(!next)throw Error('The occupied vehicle must remain resident: '+riding.id);
 p.x+=next.part.dx-riding.x;p.y+=next.part.dh-riding.h;
 riding.x=next.part.dx;riding.h=next.part.dh;
}
export function levelVehicleHints(lv:Level,p:LevelPlayer):LevelHint[]{
 if(lv.state.ride||!p.onGround)return[];
 const seated=lv.state.vehicle?.seat;
 if(seated)return[{id:'seat:'+seated,x:p.x,h:p.y,promptH:p.y+56,label:'[E] STAND UP'}];
 const seats=vehicleSeatHints(lv,p);
 return [...seats,...(lv.source.vehicleFrames??[]).flatMap(f=>{
  if(f.vehicle.kind==='lift')return[];
  const aboard=lv.state.vehicle?.id===f.vehicle.id;
  const floor=aboard?alightAt(lv.source,f,lv.state.floor,p.x):boardAt(lv.source,f,lv.state.floor,p.x);
  if(!floor)return[];
  const d=vehicleDoorsAt(f).find(d=>d.open&&Math.abs(p.x-d.x)<=d.w/2+4&&Math.abs(p.y-d.h)<=2);
  return d?[{id:'vehicle:'+f.vehicle.id,x:d.x,h:d.h,promptH:d.h+56,label:aboard?'[E] STEP OFF':'[E] STEP ABOARD'}]:[];
 })];
}
/** Seats are usable only after boarding, on the current deck; inspection never reserves one. */
function vehicleSeatHints(lv:Level,p:LevelPlayer):LevelHint[]{
 const frame=lv.source.vehicleFrames?.find(f=>f.vehicle.id===lv.state.vehicle?.id),floor=lv.source.floors.find(f=>f.id===lv.state.floor);
 if(!frame||!floor||!p.onGround||Math.abs(p.y-floor.h)>2)return[];
 return vehicleSeatsAt(frame).filter(s=>!frame.occupied?.includes(s.id)&&s.x>=floor.x&&s.x<=floor.x+floor.w&&Math.abs(s.h-floor.h)<=24&&Math.abs(s.x-p.x)<24).map(s=>({id:'seat:'+s.id,x:s.x,h:floor.h,promptH:floor.h+56,label:'[E] SIT'}));
}
export function levelSeatInteract(lv:Level,id:string,p:LevelPlayer,m?:Movers):boolean{
 if(!id.startsWith('seat:')||!levelVehicleHints(lv,p).some(h=>h.id===id)||!lv.state.vehicle)return false;
 const definition=(lv.source.vehicleBase??lv.source).vehicles?.find(v=>v.id===lv.state.vehicle!.id),owner=m?model(m,definition?.zone):undefined;
 if(lv.state.vehicle.seat){delete lv.state.vehicle.seat;if(owner)owner.playerSeat=undefined;return true;}
 const frame=lv.source.vehicleFrames!.find(f=>f.vehicle.id===lv.state.vehicle!.id)!,seat=vehicleSeatsAt(frame).find(s=>'seat:'+s.id===id)!;
 lv.state.vehicle.seat=seat.id;if(owner)owner.playerSeat={vehicle:frame.vehicle.id.split('/').at(-1)!,seat:seat.id};p.x=seat.x;p.vy=0;p.moving=false;return true;
}
/** The same level step anchors a seated player; there is no independent seat clock or state. */
export function stepVehicleSeat(lv:Level,p:LevelPlayer,walk:number,climb:number):boolean{
 const rider=lv.state.vehicle;if(!rider?.seat)return false;
 if(walk||climb){delete rider.seat;return false;}
 const frame=lv.source.vehicleFrames?.find(f=>f.vehicle.id===rider.id),seat=frame&&vehicleSeatsAt(frame).find(s=>s.id===rider.seat);
 if(!seat){delete rider.seat;return false;}
 p.x=seat.x;p.y=lv.source.floors.find(f=>f.id===lv.state.floor)!.h;p.vy=0;p.onGround=true;p.moving=false;return true;
}
export function vehicleSeatHeight(lv:Level):number|undefined{
 const rider=lv.state.vehicle;if(!rider?.seat)return undefined;
 const frame=lv.source.vehicleFrames?.find(f=>f.vehicle.id===rider.id),seat=frame&&vehicleSeatsAt(frame).find(s=>s.id===rider.seat),floor=lv.source.floors.find(f=>f.id===lv.state.floor);
 return seat&&floor?seat.h-floor.h:undefined;
}
export function levelVehicleInteract(lv:Level,id:string,p:LevelPlayer):boolean{
 if(!id.startsWith('vehicle:'))return false;
 if(!levelVehicleHints(lv,p).some(h=>h.id===id))return false;
 const f=lv.source.vehicleFrames!.find(f=>'vehicle:'+f.vehicle.id===id)!,aboard=lv.state.vehicle?.id===f.vehicle.id;
 const floor=aboard?alightAt(lv.source,f,lv.state.floor,p.x):boardAt(lv.source,f,lv.state.floor,p.x);if(!floor)return false;
 lv.state.floor=floor;
 if(aboard)delete lv.state.vehicle;else lv.state.vehicle={id:f.vehicle.id,x:f.part.dx,h:f.part.dh};
 p.vy=0;p.onGround=true;return true;
}
export function levelVehicleVisuals(source:LevelSource,m:Movers){return Object.fromEntries(levelVehicleFrames(source,m).filter(f=>f.vehicle.kind!=='lift').map(f=>{
 const v=(source.vehicleBase??source).vehicles!.find(v=>v.id===f.vehicle.id)!;
 const host=v.zone?source.zones?.[v.zone]:undefined,x=f.part.dx-(host?.x??0)-v.x,h=f.part.dh-(host?.h??0)-v.h;
 return[v.id,{x,h,open:f.doors}];
}));}
