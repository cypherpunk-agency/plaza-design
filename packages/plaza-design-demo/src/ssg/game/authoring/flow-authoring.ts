import {TypedForm} from './typed-form';
import {vehicleNodes} from './vehicle-composition';
import type {Composition} from '../art';
import type {VehicleSource} from '../world/vehicles';
import type {WorkbenchContext} from './contracts';
import {KINDS} from '../art/characters/riders';
/** The same flow source that native Play compiles; no editor-side movement evaluator. */
export function mountFlowAuthoring(host:HTMLElement,context:WorkbenchContext,documentId:string,id:string){
 const api=context.authoring!,error=document.createElement('p');error.setAttribute('role','alert');const form=new TypedForm(e=>error.textContent=String(e));
 const read=()=>api.get(documentId).value as Composition;
 const edit=(label:string,change:(props:any)=>void)=>{const doc=structuredClone(read());change(vehicleNodes(doc.instances).find(n=>n.id===id)!.props);api.edit(documentId,label,doc);render();};
 function render(){host.replaceChildren(error);error.textContent='';const doc=read(),p=vehicleNodes(doc.instances).find(n=>n.id===id)!.props as any,flow=p.flow,ref=p.vehicle;
  if(!ref?.frame){const note=document.createElement('p');note.textContent='This is an ambient visual flow. Its source fields remain under Appearance.';host.append(note);return;}
  const frames=vehicleNodes(doc.instances).filter(n=>n.type==='vehicle.frame');
  form.select(host,'Passenger vehicle',frames.map(n=>n.id),ref.frame,value=>edit('Bind passenger vehicle',p=>{p.vehicle.frame=value;}));
  const vehicle=frames.find(n=>n.id===ref.frame)?.props.vehicle as unknown as VehicleSource;
  for(const key of ['board','alight'])form.select(host,'Passenger '+key+' berth',vehicle?.berths.map(b=>b.id)??[],ref[key],value=>edit('Bind passenger berth',p=>{p.vehicle[key]=value;}));
  form.number(host,'Passenger seed',flow.seed,value=>edit('Set passenger seed',p=>{p.flow.seed=value;}),0,1000000);
  form.decimal(host,'Passenger spawn interval',flow.spawn.every,value=>edit('Set passenger interval',p=>{p.flow.spawn.every=value;}),1,120);
  form.decimal(host,'Passenger walking speed',flow.speed??38,value=>edit('Set passenger speed',p=>{p.flow.speed=value;}),1,120);
  p.looks.forEach((look:any,i:number)=>{if(!look.rider)return;const box=form.section(host,'Passenger look '+(i+1));
   form.select(box,'Passenger '+(i+1)+' appearance',KINDS,look.rider,value=>edit('Set passenger appearance',p=>{p.looks[i].rider=value;}));
   form.decimal(box,'Passenger '+(i+1)+' clothing phase',look.phase??0,value=>edit('Set passenger clothing',p=>{p.looks[i].phase=value;}),0,1000000);
   form.number(box,'Passenger '+(i+1)+' size',look.ps??3,value=>edit('Set passenger size',p=>{p.looks[i].ps=value;}),1,6);
  });
  for(const list of ['route','exit'] as const){const points=list==='route'?flow.route:p.exit,box=form.section(host,list==='route'?'Approach and queue':'After alighting');
   points.forEach((point:any,i:number)=>{const row=form.section(box,list+' point '+(i+1));for(const axis of ['x','h'])form.decimal(row,list+' '+(i+1)+' '+axis,point[axis]??0,value=>edit('Move passenger waypoint',p=>{(list==='route'?p.flow.route:p.exit)[i][axis]=value;}),-100000,100000);
    if(point.kind==='board')for(const key of ['slots','spacing','gap'])form.decimal(row,'Queue '+key,point[key],value=>edit('Set queue '+key,p=>{p.flow.route[i][key]=value;}),key==='slots'?1:0.1,key==='slots'?12:120);
    else form.button(row,'Remove '+list+' point '+(i+1),()=>edit('Remove passenger waypoint',p=>{(list==='route'?p.flow.route:p.exit).splice(i,1);}),points.length<=1||list==='route'&&i===0);
   });
   form.button(box,'Add '+list+' waypoint',()=>edit('Add passenger waypoint',p=>{const points=list==='route'?p.flow.route:p.exit,index=list==='route'?points.findIndex((w:any)=>w.kind==='board'):points.length-1,previous=points[Math.max(0,index-1)];points.splice(index,0,{kind:'walk',x:previous.x+40,h:previous.h??0});}),points.length>=24);
  }
  const note=document.createElement('p');note.textContent='Approach points use the boarding platform’s coordinates; exit points use the destination platform’s coordinates. Use Play scene to see people queue, board and alight through the actual doors, keeping their appearance during the ride.';host.append(note);
 }
 render();return()=>host.replaceChildren();
}
