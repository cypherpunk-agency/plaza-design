/** Typed source controls. All mutations return through the caller's ComposerModel edit. */
import type {AssetInstance,Properties} from '../art/core/composition';
import {element,label,select,button} from './controls';
type Edit=(name:string,change:(node:AssetInstance)=>void)=>void;
type NumberInput=(value:number,apply:(n:number)=>void,min?:number,step?:string)=>HTMLInputElement;
export function clippingControls(host:HTMLElement,node:AssetInstance,edit:Edit,number:NumberInput){
 const mode=node.clip===undefined?'default':typeof node.clip==='object'?'rectangle':node.clip;
 host.append(label('Artwork clipping',select([{value:'default',label:'Layer default (joined backgrounds: chunk; objects: none)'},{value:'none',label:'No clip · may cross chunk boundary'},{value:'chunk',label:'Clip to source chunk'},{value:'rectangle',label:'Explicit clip rectangle'}],mode,value=>edit('Change artwork clipping',n=>{if(value==='default')delete n.clip;else n.clip=value==='rectangle'?{x:n.placement.x,h:n.placement.h+100,w:100,tall:100}:value as 'none'|'chunk';}))));
 if(typeof node.clip==='object')for(const[key,title]of [['x','Clip left'],['h','Clip top height'],['w','Clip width'],['tall','Clip height']] as const)host.append(label(title,number(node.clip[key],value=>edit('Change '+title,n=>{if(typeof n.clip==='object')n.clip[key]=value;}),key==='w'||key==='tall' ? .01 : undefined)));
 host.append(element('p','muted',node.layer==='foreground'?'Foreground artwork occludes people and vehicles across chunks. Its visible shape, not the chunk border, hides them.':'Chunk borders describe authored space. Set Foreground for artwork that should cover crossing people or vehicles.'));
}
export function peopleControls(host:HTMLElement,node:AssetInstance,zones:readonly string[],edit:Edit,number:NumberInput){
 const flow=node.props.flow as Properties,spawn=flow.spawn as Properties;
 const change=(name:string,run:(flow:Properties)=>void)=>edit(name,n=>run(n.props.flow as Properties));
 for(const[key,title,value,min]of [['seed','Person seed',flow.seed,0],['speed','Walking speed',flow.speed??21,1],['maxWait','Maximum wait (seconds)',flow.maxWait??120,1]] as const)host.append(label(title,number(Number(value),value=>change('Change '+title,f=>f[key]=value),min)));
 host.append(element('p','muted','A person keeps the same identity and appearance along this route. The last Leave point is its explicit sink. Waypoints without a chunk are relative to this flow placement; named chunk coordinates are local to that chunk.'));
 if(spawn.kind==='interval')for(const[key,title,value,min]of [['every','Spawn interval (seconds)',spawn.every,1],['start','First spawn (seconds)',spawn.start??0,0],['jitter','Spawn timing variation',spawn.jitter??0,0]] as const)host.append(label(title,number(Number(value),value=>change('Change '+title,f=>(f.spawn as Properties)[key]=value),min)));
 const route=(field:'route'|'exit')=>{
  const points=(field==='route'?flow.route:node.props.exit) as Properties[];if(!Array.isArray(points))return;
  host.append(element('h4','',field==='route'?'Route · spawn to sink':'After alighting · to sink'));
  const set=(name:string,run:(points:Properties[])=>void)=>edit(name,n=>run((field==='route'?(n.props.flow as Properties).route:n.props.exit) as Properties[]));
  points.forEach((point,index)=>{
   const row=element('details'),body=element('div');row.open=index===0;row.append(element('summary','',`${index+1}. ${point.kind} · ${point.zone??'source chunk'} (${point.x}, ${point.h??0})`),body);host.append(row);
   body.append(label('Waypoint action',select(['walk','wait',...(field==='route'&&node.props.vehicle?['queue','board']:[]),'leave'].map(value=>({value,label:value})),String(point.kind),value=>set('Change waypoint action',points=>points[index]={...points[index],kind:value,...(value==='wait'?{dwell:1}:{}),...(value==='queue'?{every:10,slots:3,spacing:18,gap:.6}:{})}))));
   body.append(label('Waypoint chunk',select([{value:'',label:'Source chunk'},...zones.map(value=>({value,label:value}))],String(point.zone??''),value=>set('Change waypoint chunk',points=>{if(value)points[index].zone=value;else delete points[index].zone;}))));
   for(const[key,title]of [['x','Waypoint X'],['h','Waypoint height']] as const)body.append(label(title,number(Number(point[key]??0),value=>set('Move waypoint',points=>points[index][key]=value))));
   if(point.kind==='wait')body.append(label('Wait (seconds)',number(Number(point.dwell??1),value=>set('Change waypoint wait',points=>points[index].dwell=value),0)));
   if(point.kind==='board'||point.kind==='queue')for(const[key,title,value]of [['slots','Queue places',point.slots??3],['spacing','Queue spacing',point.spacing??18],['gap','Boarding interval',point.gap??.6]] as const)body.append(label(title,number(Number(value),value=>set('Change '+title,points=>points[index][key]=value),.1)));
   const remove=button('Remove waypoint',()=>set('Remove waypoint',points=>points.splice(index,1)));remove.disabled=points.length<=1;body.append(remove);
  });
  host.append(button('Add walk waypoint',()=>set('Add walk waypoint',points=>{const last=points.at(-1)??{x:0,h:0};points.splice(Math.max(0,points.length-1),0,{...last,kind:'walk'});})),button('Add wait waypoint',()=>set('Add wait waypoint',points=>{const last=points.at(-1)??{x:0,h:0};points.splice(Math.max(0,points.length-1),0,{...last,kind:'wait',dwell:1});})));
 };
 route('route');if(node.props.vehicle&&typeof node.props.vehicle==='object'&&!Array.isArray(node.props.vehicle)&&(node.props.vehicle as Properties).frame)route('exit');
}
