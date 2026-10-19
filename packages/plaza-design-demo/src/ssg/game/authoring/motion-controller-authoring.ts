import type {SceneData} from '../data/types';import {stacksController,downtownController,type StacksController,type DowntownController} from '../engine/controllers/motion';import type {TypedForm} from './typed-form';
export function renderMotionController(host:HTMLElement,form:TypedForm,data:SceneData,edit:(label:string,change:(d:SceneData)=>void)=>void){
 const c=data.id==='stacks'?stacksController(data):downtownController(data),update=(fn:(c:StacksController|DowntownController)=>void)=>edit('Edit motion controller',d=>{d.controller??=structuredClone(c);fn(d.controller as typeof c);});
 for(const[key,ref]of Object.entries(c.state))form.select(host,'Motion '+key+' state',Object.keys(data.state).filter(id=>typeof data.state[id]===typeof data.state[ref]),ref,value=>update(c=>{(c.state as Record<string,string>)[key]=value;}));
 if(c.kind==='stacks'){
  for(const[key,ms]of Object.entries(c.lift))form.decimal(host,'Stacks '+key,ms,value=>update(c=>{if(c.kind==='stacks')c.lift[key as keyof typeof c.lift]=value;}),.000001,1000000);
  form.decimal(host,'Stacks return ms',c.returnMs,value=>update(c=>{if(c.kind==='stacks')c.returnMs=value;}),.000001,1000000);
  form.select(host,'Stacks scanner device',data.devices.map(d=>d.id),c.scannerDevice,value=>update(c=>{if(c.kind==='stacks')c.scannerDevice=value;}));
 }else{
  for(const key of ['outside','inside','signalMs']as const)form.decimal(host,'Downtown '+key,c[key],value=>update(c=>{if(c.kind==='downtown')c[key]=value;}),.000001,1000000);
  for(const[key,ref]of Object.entries(c.devices))form.select(host,'Downtown '+key+' device',data.devices.filter(d=>d.layout?.spot).map(d=>d.id),ref,value=>update(c=>{if(c.kind==='downtown')c.devices[key as keyof typeof c.devices]=value;}));
  form.select(host,'Downtown speed tuning',Object.keys(data.tuning),c.speedTuning,value=>update(c=>{if(c.kind==='downtown')c.speedTuning=value;}));
 }
}
