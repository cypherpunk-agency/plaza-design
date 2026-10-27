/** Typed edits of the source read by physical boarding and the moving artwork. */
import {TypedForm} from './typed-form';
import {art,type ChunkDocument,type AssetInstance} from '../art';
import {validateVehicle,type VehicleSource} from '../world/vehicles';
import type {WorkbenchContext} from './contracts';
import {appendVehicleCar,removeVehicleCar,setVehicleCars,splitVehicleLeg} from './vehicle-composition';
import {legLength,routeLength} from '../world/vehicles';
const flat=(ns:AssetInstance[]):AssetInstance[]=>ns.flatMap(n=>[n,...flat(n.children??[])]);
const belongs=(node:AssetInstance,doc:ChunkDocument,frame:string)=>{
 const ns=flat(doc.instances),byId=new Map(ns.map(n=>[n.id,n])),parents=new Map(ns.flatMap(n=>(n.children??[]).map(c=>[c.id,n.id] as const)));
 let id:string|undefined=node.id;
 for(let depth=0;id&&depth<64;depth++){if(id===frame)return true;id=byId.get(id)?.attach?.instance??parents.get(id);}
 return false;
};
export function mountVehicleAuthoring(host:HTMLElement,context:WorkbenchContext,documentId:string,instanceId:string,scene:string){
 const api=context.authoring!,error=document.createElement('p');error.setAttribute('role','alert');
 const form=new TypedForm(e=>{error.textContent=e instanceof Error?e.message:String(e);});
 const read=()=>api.get(documentId).value as ChunkDocument;
 function edit(label:string,change:(v:VehicleSource,doc:ChunkDocument)=>void){const doc=structuredClone(read()),node=flat(doc.instances).find(n=>n.id===instanceId)!;change(node.props.vehicle as unknown as VehicleSource,doc);validateVehicle(node.props.vehicle);api.edit(documentId,label,doc);render();}
 function render(){host.replaceChildren(error);error.textContent='';const doc=read(),v=validateVehicle(flat(doc.instances).find(n=>n.id===instanceId)!.props.vehicle);
  form.text(host,'Frame mover (device.part)',v.mover,value=>edit('Set vehicle frame mover',v=>{v.mover=value;}));
  form.text(host,'Boarding query (optional)',v.boardQuery??'',value=>edit('Set boarding query',v=>{if(value)v.boardQuery=value;else delete v.boardQuery;}));
  form.text(host,'Presence query (optional)',v.presenceQuery??'',value=>edit('Set vehicle presence query',v=>{if(value)v.presenceQuery=value;else delete v.presenceQuery;}));
  form.decimal(host,'Door threshold',v.doors.open,value=>edit('Set vehicle boarding threshold',v=>{v.doors.open=value;}),.01,1);
  if('mover'in v.doors)form.text(host,'Doors mover (device.part)',v.doors.mover,value=>edit('Set vehicle doors mover',v=>{v.doors={mover:value,open:v.doors.open};}));
  else form.decimal(host,'Trip door time (ms)',v.doors.trip,value=>edit('Set trip doors',v=>{v.doors={trip:value,open:v.doors.open};}),1,60000);
  form.decimal(host,'Gap between cars',v.gap??0,value=>edit('Set vehicle gangway length',(v,doc)=>{v.gap=value;for(const n of flat(doc.instances))if(n.type==='vehicle.gangway'&&belongs(n,doc,instanceId))n.props.length=value;}),6,80);
  form.check(host,'Walk between cars',v.gangways!==false,value=>edit('Set gangway access',v=>{v.gangways=value;}));
  form.select(host,'Consist preset',['1 car','2 cars','3 cars',v.cars.length+' cars'].filter((s,i,a)=>a.indexOf(s)===i),v.cars.length===1?'1 car':v.cars.length+' cars',value=>edit('Set consist preset',(v,doc)=>setVehicleCars(doc,v,Number(value.split(' ')[0]))));
  form.button(host,'Add car',()=>edit('Add vehicle car',(v,doc)=>appendVehicleCar(doc,v)),v.cars.length>=8);
  v.cars.forEach((car,i)=>{const box=form.section(host,'Car '+car.id);
   form.button(box,'Remove car '+car.id,()=>edit('Remove vehicle car',(v,doc)=>removeVehicleCar(doc,v,i)),v.cars.length<=1);
   form.decimal(box,'Car '+car.id+' width',car.width,width=>edit('Resize vehicle car',(v,doc)=>{
    const car=v.cars[i],old=car.width,artwork=flat(doc.instances).find(n=>n.id===car.id&&n.type==='vehicle.car');car.width=width;for(const seat of car.seats)seat.x=seat.x*width/old;
    if(artwork){artwork.props.length=width;const anchors=art.get('vehicle.car').anchors(art.properties('vehicle.car',artwork.props),{});for(const[d,door]of car.doors.entries()){const a=anchors['door'+d];if(a){const doorArt=flat(doc.instances).find(n=>n.id===car.id+'-door'+d);door.x=a.x+(doorArt?.placement.x??0);}}}
   }),120,1200);
   car.doors.forEach((door,j)=>{const part=form.section(box,'Door '+door.id);
    form.decimal(part,'Door '+car.id+'.'+door.id+' centre',door.x,x=>edit('Move vehicle door',(v,doc)=>{v.cars[i].doors[j].x=x;const ns=flat(doc.instances),carArt=ns.find(n=>n.id===car.id&&n.type==='vehicle.car'),doorArt=ns.find(n=>n.id===car.id+'-door'+j);if(carArt&&doorArt){const a=art.get('vehicle.car').anchors(art.properties('vehicle.car',carArt.props),{})['door'+j];if(a)doorArt.placement.x=x-a.x;}}),0,car.width);
    form.decimal(part,'Door '+car.id+'.'+door.id+' width',door.w,w=>edit('Resize vehicle door',(v,doc)=>{v.cars[i].doors[j].w=w;const node=flat(doc.instances).find(n=>n.id===car.id+'-door'+j);if(node)node.props.width=w;}),16,80);
   });
   const benches=new Set<string>();
   car.seats.forEach((seat,j)=>{
    if(seat.artwork){
     if(benches.has(seat.artwork))return;benches.add(seat.artwork);
     const artwork=flat(doc.instances).find(n=>n.id===seat.artwork);if(!artwork)return;
     const part=form.section(box,'Seats '+seat.artwork);
     for(const axis of ['x','h'] as const)form.decimal(part,'Seats '+seat.artwork+' '+axis,artwork.placement[axis],value=>edit('Move vehicle bench',(v,doc)=>{
      const art=flat(doc.instances).find(n=>n.id===seat.artwork)!,delta=value-art.placement[axis];art.placement[axis]=value;
      for(const s of v.cars[i].seats)if(s.artwork===seat.artwork)s[axis]=(s[axis]??0)+delta;
     }),-1200,1200);
    }else{
     const part=form.section(box,'Seat '+seat.id);
     for(const axis of ['x','h'] as const)form.decimal(part,'Seat '+car.id+'.'+seat.id+' '+axis,seat[axis]??0,value=>edit('Move vehicle seat',v=>{v.cars[i].seats[j][axis]=value;}),0,axis==='x'?car.width:24);
    }
   });
  });
  const route=form.section(host,'Route');
  const strip=document.createElement('p');strip.textContent=v.route.legs.map((l,i)=>'Leg '+(i+1)+' · '+l.zone+' · '+Math.round(legLength(l))+' units').join(' → ')+' · total '+Math.round(routeLength(v.route));strip.setAttribute('aria-label','Route strip');route.append(strip);
  form.decimal(route,'Route mover origin',v.route.origin??0,value=>edit('Set route origin',v=>{v.route.origin=value;}),-100000,100000);
  v.route.legs.forEach((leg,i)=>{const row=form.section(route,'Leg '+(i+1));
   form.button(row,'Split leg '+(i+1),()=>edit('Split vehicle route',v=>splitVehicleLeg(v,i)),!!leg.drop||v.route.legs.length>=24);
   form.button(row,'Remove leg '+(i+1),()=>edit('Remove vehicle route leg',v=>{v.route.legs.splice(i,1);}),v.route.legs.length<=1);
   const zones=[...new Set([scene,'here',...context.documents.flatMap(d=>{const v=d.value as {id?:string;manifest?:unknown;scenes?:{scene:{id:string}}[]};return v?.manifest&&v.id?[v.id]:(v?.scenes??[]).map(e=>e.scene.id);}),...v.route.legs.map(l=>l.zone)])];
   form.select(row,'Leg '+(i+1)+' zone',zones,leg.zone,value=>edit('Set route zone',v=>{v.route.legs[i].zone=value;}));
   for(const side of ['from','to'] as const)for(const axis of ['x','h'] as const)form.decimal(row,'Leg '+(i+1)+' '+side+' '+axis,leg[side][axis],value=>edit('Edit vehicle route',v=>{v.route.legs[i][side][axis]=value;}),-100000,100000);
   form.check(row,'Leg '+(i+1)+' curved',!!leg.via,on=>edit('Set route curve',v=>{const l=v.route.legs[i];if(on){l.via={x:(l.from.x+l.to.x)/2,h:(l.from.h+l.to.h)/2};delete l.drop;}else delete l.via;}));
   if(leg.via)for(const axis of ['x','h'] as const)form.decimal(row,'Leg '+(i+1)+' via '+axis,leg.via[axis],value=>edit('Edit route curve',v=>{v.route.legs[i].via![axis]=value;}),-100000,100000);
   form.check(row,'Leg '+(i+1)+' falling',!!leg.drop,on=>edit('Set route drop',v=>{const l=v.route.legs[i];if(on){l.drop=true;delete l.via;}else delete l.drop;}));
  });
  form.button(route,'Extend route',()=>edit('Extend vehicle route',v=>{const last=v.route.legs.at(-1)!;v.route.legs.push({zone:last.zone,from:{...last.to},to:{x:last.to.x+160,h:last.to.h},length:160,facing:1});}),v.route.legs.length>=24||!!v.route.ring);
  const berths=form.section(host,'Berths');
  v.berths.forEach((b,i)=>{const box=form.section(berths,'Berth '+b.id);form.select(box,'Berth '+b.id+' zone',[...new Set([scene,'here',...v.route.legs.map(l=>l.zone)])],b.zone,value=>edit('Set berth zone',v=>{v.berths[i].zone=value;}));form.text(box,'Berth '+b.id+' floor',b.floor??'',value=>edit('Set berth floor',v=>{if(value)v.berths[i].floor=value;else delete v.berths[i].floor;}));for(const axis of ['x','h'] as const)form.decimal(box,'Berth '+b.id+' '+axis,b[axis]??0,value=>edit('Move vehicle berth',v=>{v.berths[i][axis]=value;}),-100000,100000);});
  const note=document.createElement('p');note.textContent='The Circuit frame mover runs along this route. Its paths, stops and door timing are edited in Logic → Devices. Motion stays on the scene clock and pauses with the game.';host.append(note);
 }
 render();return()=>host.replaceChildren();
}
