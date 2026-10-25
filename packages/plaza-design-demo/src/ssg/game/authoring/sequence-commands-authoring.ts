import type {Sequence,SequenceCommand,SequenceCommandMarker,TimelineContext} from '../art/core/timeline';
import {TypedForm} from './typed-form';
export function renderSequenceCommandFields(host:HTMLElement,value:SequenceCommand,targets:NonNullable<TimelineContext['commandTargets']>,form:TypedForm,change:(value:SequenceCommand)=>void){
 const scenes=Object.keys(targets).filter(id=>targets[id].length);
 form.select(host,'Command scene',scenes,value.scene,scene=>change({...value,scene,command:targets[scene][0]}));
 form.select(host,'System command',targets[value.scene]??[],value.command,command=>change({...value,command}));
}
export function renderSequenceCommandsAuthoring(host:HTMLElement,sequence:Sequence,targets:NonNullable<TimelineContext['commandTargets']>,edit:(label:string,change:(sequence:Sequence)=>void)=>void,report:(e:unknown)=>void){
 const form=new TypedForm(report),scene=Object.keys(targets).find(id=>targets[id].length);
 const ids=new Set([sequence.shots,sequence.tracks,sequence.text,sequence.fades,sequence.beats,sequence.commands??[],sequence.onComplete??[],sequence.onCancel??[]].flatMap(rows=>rows.map(row=>row.id)));
 const nextId=()=>{let n=1;while(ids.has('command-'+n))n++;return'command-'+n;};
 for(const [key,title]of [['commands','Command markers'],['onComplete','Completion commands'],['onCancel','Cancellation commands']] as const){const box=form.section(host,title);
  for(const value of sequence[key]??[]){const row=form.section(box,value.id),set=(next:SequenceCommand)=>edit('Edit sequence command',s=>{s[key]=s[key]!.map(c=>c.id===value.id?{...c,...next}:c) as never;});
   renderSequenceCommandFields(row,value,targets,form,set);
   if(key==='commands'){const marker=value as SequenceCommandMarker;form.decimal(row,'Command time',marker.time,time=>edit('Move command marker',s=>{s.commands!.find(c=>c.id===value.id)!.time=time;s.commands!.sort((a,b)=>a.time-b.time);}),0,sequence.duration);form.select(row,'When skipped',['run','omit'],marker.skip,skip=>edit('Edit command skip policy',s=>s.commands!.find(c=>c.id===value.id)!.skip=skip as 'run'|'omit'));}
   form.button(row,'Remove '+value.id,()=>edit('Remove sequence command',s=>{s[key]=s[key]!.filter(c=>c.id!==value.id) as never;}));
  }
  form.button(box,'Add '+title.toLowerCase(),()=>edit('Add sequence command',s=>{const command={id:nextId(),scene:scene!,command:targets[scene!][0]};if(key==='commands'){(s.commands??=[]).push({...command,time:0,skip:'run'});s.commands.sort((a,b)=>a.time-b.time);}else(s[key]??=[]).push(command);}),!scene||(sequence[key]?.length??0)>=64);
 }
}
