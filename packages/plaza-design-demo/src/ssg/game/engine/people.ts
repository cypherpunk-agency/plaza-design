/** Shared people-flow source compilation and model-owned boarding memory. No scheduler or drawing. */
import type {Resolved,Properties} from '../art/core/composition';
import type {LevelSource,MoverModel} from './level';
import {levelVehicleFrames} from './level-vehicles';
import {vehicleDoorsAt,vehicleSeatsAt} from '../world/vehicles';
import {flowPeople,flowProblems,walkAfterRide,type FlowSource,type FlowVehicle,type DoorWindow,type PersonAboard,type Waypoint} from '../world/people-flow';
import {EMPTY_ZONE_GRAPH} from '../world/zone-graph';
export interface PeopleSource {id:string;flow:FlowSource;frame:string;board:string;alight:string;exit:Waypoint[];x:number;h:number}
export interface FlowPicture {key:string;look:string;phase:number;x:number;h:number;facing:1|-1;act:'walk'|'stand'|'queue'|'sit';seat?:number}
interface Window extends DoorWindow {berth:string}
interface Rider {person:PersonAboard;source:string;seat?:string;out?:{time:number;x:number;h:number};finished?:number}
export interface PeopleState {offset:number;time:number;wall:number;windows:Record<string,Window[]>;riders:Record<string,Rider>;pictures:Record<string,FlowPicture[]>}
export const emptyPeople=():PeopleState=>({offset:0,time:0,wall:0,windows:{},riders:{},pictures:{}});
export function compilePeople(rows:readonly Resolved[],level:LevelSource|undefined,scene:string):PeopleSource[]{
 return rows.filter(r=>r.element.type==='character.flow'&&!!(r.props.vehicle as Properties|null)?.frame).map(r=>{
  const ref=r.props.vehicle as {frame:string;board:string;alight:string},vehicle=level?.vehicles?.find(v=>v.id===ref.frame);
  if(!vehicle)throw Error('Flow '+r.instance.id+' references a missing vehicle frame');
  for(const id of [ref.board,ref.alight])if(!vehicle.source.berths.some(b=>b.id===id))throw Error('Flow berth does not exist: '+id);
  const boardZone=vehicle.source.berths.find(b=>b.id===ref.board)!.zone,boarding=boardZone==='here'?scene:boardZone;
  const raw=r.props.flow as unknown as FlowSource,flow:FlowSource={...raw,spawn:{...raw.spawn,...(raw.spawn.kind==='interval'?{start:0}:{})},id:r.instance.id,clock:'scene',looks:(r.props.looks as unknown[]).map((_,i)=>String(i)),route:raw.route.map(w=>({...w,zone:boarding,x:w.x+r.placement.x,h:(w.h??0)+r.placement.h,...(w.kind==='board'?{vehicle:ref.frame}:{})}))};
  const dummy:FlowVehicle={id:ref.frame,tripAt:()=>0,doors:()=>null},problems=flowProblems(flow,{graph:EMPTY_ZONE_GRAPH,vehicles:{[ref.frame]:dummy}});if(problems.length)throw Error(problems.join('; '));
  if(flow.spawn.kind!=='interval'||flow.spawn.every<=0||!Number.isFinite(flow.spawn.every)||flow.spawn.every<1)throw Error('Live passenger flow uses an interval of at least one second');
  const bounded=(v:number|undefined,lo:number,hi:number)=>v!==undefined&&Number.isFinite(v)&&v>=lo&&v<=hi;
  if(!Number.isInteger(flow.seed)||!bounded(flow.seed,0,1000000)||flow.speed!==undefined&&!bounded(flow.speed,1,120)||flow.maxWait!==undefined&&!bounded(flow.maxWait,1,120))throw Error('Passenger seed, speed or wait limit is out of range');
  for(const w of flow.route){if(!bounded(w.x,-100000,100000)||!bounded(w.h??0,-100000,100000))throw Error('Passenger waypoints need finite coordinates');if(w.kind==='board'&&(!Number.isInteger(w.slots??3)||!bounded(w.slots??3,1,12)||!bounded(w.spacing??18,.1,120)||!bounded(w.gap??.6,.1,120)))throw Error('Passenger queue size, spacing or boarding gap is out of range');}
  if(flow.route.filter(w=>w.kind==='board').length!==1)throw Error('A live passenger route has one boarding point');
  const exitRaw=(r.props.exit as unknown as Waypoint[]|undefined)??[{kind:'leave',x:300,h:0}];
  if(!exitRaw.length||exitRaw.length>24||exitRaw.at(-1)?.kind!=='leave'||exitRaw.some(w=>!['walk','wait','leave'].includes(w.kind)||!bounded(w.x,-100000,100000)||!bounded(w.h??0,-100000,100000)))throw Error('Passenger exit route ends with a leave point and uses finite coordinates');
  const zone=vehicle.source.berths.find(b=>b.id===ref.alight)!.zone,exitZone=zone==='here'?scene:zone;
  return{id:r.instance.id,flow,frame:ref.frame,board:ref.board,alight:ref.alight,exit:exitRaw.map(w=>({...w,zone:exitZone,x:w.x+(exitZone===scene?r.placement.x:0),h:(w.h??0)+(exitZone===scene?r.placement.h:0)})),x:r.placement.x,h:r.placement.h};
 });
}
/** Called only by SceneModel.tick. Actual open doors authorize boarding; recorded riders never re-roll. */
export function stepPeople(state:PeopleState,sources:readonly PeopleSource[],level:LevelSource,m:MoverModel){
 const t=m.now()/1000+state.offset;state.time=t;
 const frames=levelVehicleFrames(level,m),pictures:Record<string,FlowPicture[]>={};
 for(const frame of frames){
  const id=frame.vehicle.id,windows=state.windows[id]??=[];
  const open=frame.berth&&frame.doors>=frame.vehicle.doors.open;
  let last=windows.at(-1);
  if(open){
   if(!last||last.close<=t||last.berth!==frame.berth!.id){last={trip:(last?.trip??-1)+1,open:t,close:t+180,berth:frame.berth!.id,doors:vehicleDoorsAt(frame).map(d=>({zone:sources.find(s=>s.frame===id)?.flow.route[0].zone??'here',x:d.x,h:d.h}))};windows.push(last);}
   last.close=t+180;
  }else if(last&&last.close>t)last.close=t;
  if(windows.length>16)windows.splice(0,windows.length-16);
 }
 for(const source of sources){
  const frame=frames.find(f=>f.vehicle.id===source.frame);if(!frame)continue;
  const boarding=source.flow.route[0].zone;
  const history=state.windows[source.frame]??[],windows=history.filter(w=>w.berth===source.board).map(w=>({...w,doors:w.doors.map(d=>({...d,zone:boarding}))}));
  // An unknown next opening only arranges the waiting line. Actual open doors still authorize boarding.
  if(frame.berth?.id!==source.board||frame.doors<frame.vehicle.doors.open){
   const berth=frame.vehicle.berths.find(b=>b.id===source.board)!,at=level.vehicleZones?.[berth.zone];
   const doors=vehicleDoorsAt({...frame,part:{...frame.part,dx:berth.x+(at?.x??0),dh:(berth.h??0)+(at?.h??0)}});
   windows.push({trip:(history.at(-1)?.trip??-1)+1,open:t+30,close:t+45,berth:source.board,doors:doors.map(d=>({zone:source.flow.route[0].zone,x:d.x,h:d.h}))});
  }
  const adapter:FlowVehicle={id:source.frame,tripAt:at=>windows.find(w=>w.close>at)?.trip??((windows.at(-1)?.trip??-1)+1),doors:trip=>windows.find(w=>w.trip===trip)??null};
  const projected={...source.flow,route:source.flow.route.map(w=>{const at=level.vehicleZones?.[w.zone];return{...w,x:w.x+(at?.x??0),h:(w.h??0)+(at?.h??0)};})};
  const people=flowPeople(projected,{graph:EMPTY_ZONE_GRAPH,vehicles:{[source.frame]:adapter}},t).filter(p=>p.index>=0);const out:FlowPicture[]=pictures[source.id]=[];
  for(const p of people){
   if(state.riders[p.key])continue;
   if(p.state==='aboard'){
    if(Object.keys(state.riders).length>=128)continue;
    if(frame.berth?.id!==source.board||frame.doors<frame.vehicle.doors.open)continue;
    const used=new Set(Object.values(state.riders).filter(r=>r.person.vehicle===source.frame&&!r.out).map(r=>r.seat));
    if(m.playerSeat?.vehicle===source.frame)used.add(m.playerSeat.seat);
    const seat=vehicleSeatsAt(frame).find(s=>!used.has(s.id));state.riders[p.key]={person:p,source:source.id,...(seat?{seat:seat.id}:{})};
   }else out.push({...p,x:p.x-source.x,h:p.h-source.h});
  }
  for(const rider of Object.values(state.riders).filter(r=>r.source===source.id)){
   if(rider.finished!==undefined)continue;
   if(!rider.out&&frame.berth?.id===source.alight&&frame.doors>=frame.vehicle.doors.open){const doors=vehicleDoorsAt(frame);const door=doors[rider.person.door%doors.length];if(door)rider.out={time:t,x:door.x,h:door.h};}
   if(rider.out){
    const route=source.exit.map(w=>{const at=level.vehicleZones?.[w.zone];return{...w,zone:source.flow.route[0].zone,x:w.x+(at?.x??0),h:(w.h??0)+(at?.h??0)};});
    const person=walkAfterRide(rider.person,{zone:source.flow.route[0].zone,x:rider.out.x,h:rider.out.h},route,rider.out.time,t,source.flow.speed);
    if(person)out.push({...person,x:person.x-source.x,h:person.h-source.h});else rider.finished=t;
   }else{
    const seat=vehicleSeatsAt(frame).find(s=>s.id===rider.seat),door=vehicleDoorsAt(frame)[rider.person.door];
    out.push({...rider.person,x:(seat?.x??door?.x??frame.part.dx)-source.x,h:frame.part.dh-source.h,facing:1,act:seat?'sit':'stand',...(seat?{seat:seat.h-frame.part.dh}:{})});
   }
  }
 }
 for(const [key,rider]of Object.entries(state.riders))if(rider.finished!==undefined&&t-rider.finished>180)delete state.riders[key];
 state.pictures=pictures;
}
/** Short-lived scene memory. Restore only the current format; the scene clock remains the sole clock. */
export function restorePeople(value:PeopleState|undefined,now:number,wall:number):PeopleState{
 const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v),record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
 if(!value||!finite(value.time)||!finite(value.wall)||wall-value.wall>60000||wall<value.wall||!record(value.windows)||!record(value.riders)||Object.keys(value.windows).length>32||Object.keys(value.riders).length>128)return emptyPeople();
 for(const list of Object.values(value.windows))if(!Array.isArray(list)||list.length>16||list.some(w=>!w||!Number.isInteger(w.trip)||!finite(w.open)||!finite(w.close)||typeof w.berth!=='string'||!Array.isArray(w.doors)||w.doors.length>64||w.doors.some(d=>!d||typeof d.zone!=='string'||!finite(d.x)||!finite(d.h))))return emptyPeople();
 for(const r of Object.values(value.riders))if(!r||typeof r.source!=='string'||!r.person||r.person.state!=='aboard'||typeof r.person.key!=='string'||typeof r.person.look!=='string'||typeof r.person.vehicle!=='string'||!finite(r.person.phase)||!Number.isInteger(r.person.index)||!Number.isInteger(r.person.door)||r.person.door<0||!Number.isInteger(r.person.trip)||r.out&&(!finite(r.out.time)||!finite(r.out.x)||!finite(r.out.h))||r.finished!==undefined&&!finite(r.finished))return emptyPeople();
 const next=structuredClone(value);next.offset=next.time-now/1000;next.pictures={};return next;
}
