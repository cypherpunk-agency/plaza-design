/** Pure, grouped edits of a consist and its ordinary attached artwork. */
import type {ChunkDocument,AssetInstance} from '../art';
import {legLength,type VehicleSource} from '../world/vehicles';
export const vehicleNodes=(nodes:AssetInstance[]):AssetInstance[]=>nodes.flatMap(n=>[n,...vehicleNodes(n.children??[])]);
function owned(doc:ChunkDocument,id:string){
 const nodes=vehicleNodes(doc.instances),byId=new Map(nodes.map(n=>[n.id,n])),parents=new Map(nodes.flatMap(n=>(n.children??[]).map(c=>[c.id,n.id] as const)));
 return new Set(nodes.filter(n=>{let at:string|undefined=n.id;for(let i=0;at&&i<64;i++){if(at===id)return true;at=byId.get(at)?.attach?.instance??parents.get(at);}return false;}).map(n=>n.id));
}
function unique(doc:ChunkDocument,base:string){const used=new Set(vehicleNodes(doc.instances).map(n=>n.id));let id=base,n=2;while(used.has(id))id=base+'-'+n++;return id;}
export function appendVehicleCar(doc:ChunkDocument,v:VehicleSource){
 if(v.cars.length>=8)throw Error('A consist supports up to eight cars');
 const donor=v.cars.at(-1)!,nodes=vehicleNodes(doc.instances),root=nodes.find(n=>n.id===donor.id);
 if(!root||root.type!=='vehicle.car')throw Error('Add a car requires a registered vehicle.car to copy');
 if(!doc.instances.includes(root))throw Error('Consist collection tools require top-level car artwork');
 const id=unique(doc,'car'+(v.cars.length+1)),ids=owned(doc,donor.id),mapping=new Map([...ids].map(old=>[old,unique(doc,old===donor.id?id:old.startsWith(donor.id+'-')?id+old.slice(donor.id.length):id+'-'+old)]));
 const clones=doc.instances.filter(n=>ids.has(n.id)).map(n=>structuredClone(n));
 for(const n of vehicleNodes(clones)){n.id=mapping.get(n.id)!;if(n.attach&&mapping.has(n.attach.instance))n.attach.instance=mapping.get(n.attach.instance)!;}
 const gap=unique(doc,id+'-gangway');
 const bridge:AssetInstance={id:gap,type:'vehicle.gangway',props:{face:'far',length:v.gap??0},placement:{x:0,h:0},layer:root.layer,order:root.order+1,attach:{instance:donor.id,anchor:'end'}};
 // The same binding that controls the existing gangways controls the new one.
 const previous=nodes.find(n=>n.type==='vehicle.gangway'&&n.attach?.instance===v.cars[0].id);if(previous?.bindings)bridge.bindings=structuredClone(previous.bindings);
 const copied=vehicleNodes(clones).find(n=>n.id===mapping.get(donor.id))!;copied.attach={instance:gap,anchor:'end'};copied.placement={x:0,h:0};copied.props.plate='CAR '+(v.cars.length+1);
 const car=structuredClone(donor);car.id=mapping.get(donor.id)!;for(const seat of car.seats)if(seat.artwork)seat.artwork=mapping.get(seat.artwork)!;
 for(const old of [...v.shell??[]])if(mapping.has(old))(v.shell??=[]).push(mapping.get(old)!);
 v.cars.push(car);doc.instances.push(bridge,...clones);
}
export function removeVehicleCar(doc:ChunkDocument,v:VehicleSource,index:number){
 if(v.cars.length<=1)throw Error('Keep at least one car');
 const car=v.cars[index];if(!car)throw Error('Unknown car');
 const nodes=vehicleNodes(doc.instances),root=nodes.find(n=>n.id===car.id);if(!root)throw Error('Missing car artwork');
 const remove=owned(doc,car.id),incoming=root.attach&&nodes.find(n=>n.id===root.attach!.instance&&n.type==='vehicle.gangway');
 // Descendants through the next gangway belong to later cars; retain and reconnect them.
 const later=v.cars.slice(index+1);for(const c of later)for(const id of owned(doc,c.id))remove.delete(id);
 const next=later[0]&&nodes.find(n=>n.id===later[0].id),nextBridge=next?.attach&&nodes.find(n=>n.id===next.attach!.instance&&n.type==='vehicle.gangway');
 if(next&&nextBridge){
  if(index===0){next.attach=structuredClone(root.attach!);remove.add(nextBridge.id);}
  else{remove.delete(nextBridge.id);nextBridge.attach={instance:v.cars[index-1].id,anchor:'end'};}
 }
 if(incoming)remove.add(incoming.id);
 const prune=(ns:AssetInstance[]):AssetInstance[]=>ns.filter(n=>!remove.has(n.id)).map(n=>{if(n.children)n.children=prune(n.children);return n;});
 doc.instances=prune(doc.instances);v.cars.splice(index,1);if(v.shell)v.shell=v.shell.filter(id=>!remove.has(id));
}
export function setVehicleCars(doc:ChunkDocument,v:VehicleSource,count:number){
 if(!Number.isInteger(count)||count<1||count>8)throw Error('Choose one to eight cars');
 while(v.cars.length<count)appendVehicleCar(doc,v);
 while(v.cars.length>count)removeVehicleCar(doc,v,v.cars.length-1);
}
/** Splitting is exact for a line or quadratic curve; declared route units retain the mover's range. */
export function splitVehicleLeg(v:VehicleSource,index:number){
 const leg=v.route.legs[index];if(!leg)throw Error('Unknown route leg');if(leg.drop)throw Error('Split a falling leg after changing it to a line or curve');
 const mid=(a:{x:number;h:number},b:{x:number;h:number})=>({x:(a.x+b.x)/2,h:(a.h+b.h)/2});
 const a=structuredClone(leg),b=structuredClone(leg),length=legLength(leg);
 if(leg.via){const left=mid(leg.from,leg.via),right=mid(leg.via,leg.to),point=mid(left,right);a.to=point;a.via=left;b.from=point;b.via=right;}else a.to=b.from=mid(leg.from,leg.to);
 const la=legLength({...a,length:undefined}),lb=legLength({...b,length:undefined});a.length=length*la/(la+lb);b.length=length-a.length;
 v.route.legs.splice(index,1,a,b);
}
