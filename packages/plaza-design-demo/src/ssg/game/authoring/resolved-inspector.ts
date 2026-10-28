/** Read-only live engine facts. Editing stays in the existing authored controls and timeline. */
import type {ArtworkInspection} from '../art/core/presentation';
import {visibilityMessage} from './visibility';
import {element,button} from './controls';
const number=(n:number)=>Number.isFinite(n)?String(Math.round(n*1000)/1000):'Unavailable';
const point=(p:{x:number;h:number})=>`X ${number(p.x)}, Y ${number(p.h)}`;
const rect=(r:{x:number;y:number;width:number;height:number})=>`X ${number(r.x)}, Y ${number(r.y)}, ${number(r.width)} × ${number(r.height)}`;
export interface VisibilityActions{missingReason?():string|undefined;showBoundary():void}
export function mountResolvedInspector(host:HTMLElement,read:()=>ArtworkInspection|undefined,edit:()=>void,state={open:false},actions?:VisibilityActions){
 const visibility=element('section','inspector-part');visibility.dataset.artworkVisibility='';
 const explanation=element('p'),restriction=element('p','muted');
 const boundary=button('Show visibility boundary',()=>actions?.showBoundary());
 visibility.append(element('h3','','Visibility'),explanation,restriction,boundary);host.append(visibility);
 const section=element('details','inspector-part');section.dataset.resolvedArtwork='';section.open=state.open;section.addEventListener('toggle',()=>{state.open=section.open;});
 section.append(element('summary','','Resolved rendering'));
 const list=element('dl'),values=new Map<string,HTMLElement>();
 section.append(list,element('p','muted','These are the engine’s current values. Change base values in Appearance; animation overrides are edited in timeline keyframes.'),button('Edit authored properties',edit));host.append(section);
 const row=(name:string,value:string)=>{let output=values.get(name);if(!output){output=element('dd');list.append(element('dt','',name),output);values.set(name,output);}if(output.textContent!==value)output.textContent=value;};
 return ()=>{
  if(!section.isConnected)return;
  const a=read();explanation.textContent=visibilityMessage(a,actions?.missingReason?.());restriction.textContent=a?.drawingNote??'';restriction.hidden=!a?.drawingNote;boundary.hidden=!actions||!a?.drawingWindow;

  list.hidden=!a;if(!a)return;
  row('Drawing restriction',a.drawingNote??'None declared');if(a.drawingBounds)row('Current drawing bounds',rect(a.drawingBounds));
  row('Source',a.source);row('Artwork',a.type);row('Authored position',point(a.authored));row('Resolved placement',point(a.placement));
  row('Scale / facing',`${number(a.placement.scale)} / ${a.placement.facing===1?'Right':'Left'}`);row('Placement parallax',number(a.placement.parallax));
  row('Opacity',number(a.opacity));row('Layer / authored order',`${a.layer} / ${number(a.order)}`);row('Paint order',a.paintOrder<0?'Not an artwork draw':String(a.paintOrder+1));
  row('Chunk ownership',a.mobile?'Travels independently of its source chunk':'Stays with source chunk');
  row('Screen bounds',rect(a.bounds));row('Bounds from',a.boundsSource==='region'?'Configured generator region':a.boundsSource==='drawing'?'Current drawing':a.boundsSource==='descendants'?'Visible group contents':'Declared editor handle');row('Clipping',a.clipSource+(a.clip?' · '+rect(a.clip):''));
  for(const {label,value}of Object.values(a.properties))if(value===null||typeof value!=='object')row('Property · '+label,value===null?'Unset':String(value));
  row('Animation bindings',Object.entries(a.bindings).map(([channel,clip])=>channel+' → '+clip).join(', ')||'None; timeline tracks can still override base values');
 };
}
