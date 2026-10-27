/** Read-only live engine facts. Editing stays in the existing authored controls and timeline. */
import type {ArtworkInspection} from '../art/core/presentation';
import {element,button} from './controls';
const number=(n:number)=>Number.isFinite(n)?String(Math.round(n*1000)/1000):'Unavailable';
const point=(p:{x:number;h:number})=>`X ${number(p.x)}, Y ${number(p.h)}`;
const rect=(r:{x:number;y:number;width:number;height:number})=>`X ${number(r.x)}, Y ${number(r.y)}, ${number(r.width)} × ${number(r.height)}`;
export function mountResolvedInspector(host:HTMLElement,read:()=>ArtworkInspection|undefined,edit:()=>void,state={open:false}){
 const section=element('details','inspector-part');section.dataset.resolvedArtwork='';section.open=state.open;section.addEventListener('toggle',()=>{state.open=section.open;});
 section.append(element('summary','','Resolved rendering'));
 const status=element('p','muted'),list=element('dl'),values=new Map<string,HTMLElement>();
 section.append(status,list,element('p','muted','These are the engine’s current values. Change base values in Appearance; animation overrides are edited in timeline keyframes.'),button('Edit authored properties',edit));host.append(section);
 const row=(name:string,value:string)=>{let output=values.get(name);if(!output){output=element('dd');list.append(element('dt','',name),output);values.set(name,output);}if(output.textContent!==value)output.textContent=value;};
 return ()=>{
  if(!section.isConnected)return;
  const a=read();const message=a?(a.visible?(a.paintOrder<0?'Editor helper (no artwork draw)':'Visible in this frame'):a.reason??'Hidden'):'Not submitted to this preview frame. Its render phase may be disabled or outside the loaded sources.';if(status.textContent!==message)status.textContent=message;
  list.hidden=!a;if(!a)return;
  row('Source',a.source);row('Artwork',a.type);row('Authored position',point(a.authored));row('Resolved placement',point(a.placement));
  row('Scale / facing',`${number(a.placement.scale)} / ${a.placement.facing===1?'Right':'Left'}`);row('Placement parallax',number(a.placement.parallax));
  row('Opacity',number(a.opacity));row('Layer / authored order',`${a.layer} / ${number(a.order)}`);row('Paint order',a.paintOrder<0?'Not an artwork draw':String(a.paintOrder+1));
  row('Chunk ownership',a.mobile?'Travels independently of its source chunk':'Stays with source chunk');
  row('Screen bounds',rect(a.bounds));row('Clipping',a.clipSource+(a.clip?' · '+rect(a.clip):''));
  for(const {label,value}of Object.values(a.properties))if(value===null||typeof value!=='object')row('Property · '+label,value===null?'Unset':String(value));
  row('Animation bindings',Object.entries(a.bindings).map(([channel,clip])=>channel+' → '+clip).join(', ')||'None; timeline tracks can still override base values');
 };
}
