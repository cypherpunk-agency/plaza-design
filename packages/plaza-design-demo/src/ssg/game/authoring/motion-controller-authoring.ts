import type {SceneData} from '../data/types';import {stacksController,downtownController,type StacksController,type DowntownController} from '../engine/controllers/motion';import type {TypedForm} from './typed-form';
export function renderMotionController(host:HTMLElement,form:TypedForm,data:SceneData,edit:(label:string,change:(d:SceneData)=>void)=>void){
 const c=data.id==='stacks'?stacksController(data):downtownController(data),update=(fn:(c:StacksController|DowntownController)=>void)=>edit('Edit motion controller',d=>{d.controller??=structuredClone(c);fn(d.controller as typeof c);});
 for(const[key,ref]of Object.entries(c.state))form.select(host,'Motion '+key+' state',Object.keys(data.state).filter(id=>typeof data.state[id]===typeof data.state[ref]),ref,value=>update(c=>{(c.state as Record<string,string>)[key]=value;}));
 if(c.kind==='stacks'){
  form.select(host,'Stacks mover',data.devices.flatMap(d=>d.nouns.filter(n=>n.mover).map(n=>d.id+'.'+n.id)),c.mover,value=>update(c=>{if(c.kind==='stacks')c.mover=value;}));
  form.select(host,'Stacks scanner device',data.devices.map(d=>d.id),c.scannerDevice,value=>update(c=>{if(c.kind==='stacks')c.scannerDevice=value;}));
 }else{
  for(const[key,ref]of Object.entries(c.devices))form.select(host,'Downtown '+key+' device',data.devices.filter(d=>d.layout?.spot).map(d=>d.id),ref,value=>update(c=>{if(c.kind==='downtown')c.devices[key as keyof typeof c.devices]=value;}));
  form.select(host,'Downtown mover',data.devices.flatMap(d=>d.nouns.filter(n=>n.mover).map(n=>d.id+'.'+n.id)),c.mover,value=>update(c=>{if(c.kind==='downtown')c.mover=value;}));
 }
}
