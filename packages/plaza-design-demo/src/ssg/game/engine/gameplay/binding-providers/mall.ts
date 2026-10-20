import type {Value} from '../../../art/core/composition';
import type {MallVisual} from '../../../art/assemblies/mall-state';
import type {MallLayout} from '../../../art/assemblies/mall-details';
import {prepareCharacter,type PreparedCharacter} from '../../../runtime/characters';
import {light} from '../../../world/light';
import {presentationActor,presentationActorSlots} from '../scene-presentation';
import type {BindingProvider} from './index';
/**
 * The Mall atrium: adaptive storeys, the escalator and the people who stand on them.
 * - `mall.snapshot`: the atrium layout (read from the `room` and `escalator` artwork roles and the manifest width), its storey heights and the light.
 * - `mall.actor.<id>`: a prepared pose, lifted to its storey (`far`), gallery slab (`gallery`) or escalator ride (`riders`) by the scene's presentation.
 * - `mall.vendor.<role>`: a booth vendor (deckVendor, caseVendor) painted by the booth artwork instead of as an actor.
 * Booth-owned source bodies are hidden as actors; rebinding the booth detaches them into ordinary actor artwork.
 */
export const mallProvider:BindingProvider=ctx=>{
 const {view,rows,roles,actors,source}=ctx,room=roles.room,escalator=roles.escalator;
 if(!room||!escalator)throw new Error('Mall atrium requires room and escalator artwork roles');
 const w=source.manifest?.width,width=typeof w==='number'?w:Number(rows.find(r=>r.instance.id===w!.instance)!.props[w!.property]),s=room.props;
 const layout:MallLayout={width,ceil:Number(s.ceil),fascia:Number(s.fascia),slab:Number(s.slab),rail:Number(s.rail),far0:Number(s.far0),step:Number(s.step),storey:Number(s.storey),escalator:{x:escalator.placement.x,h:escalator.placement.h,w:Number(escalator.props.width)*escalator.placement.scale*escalator.placement.facing}};
 const count=Math.max(2,Math.floor((view.gy-layout.far0-30)/layout.step)),levels=Array.from({length:count},(_,i)=>layout.far0+i*layout.step);
 const out:Record<string,Value>={'snapshot':{layout,levels,light:structuredClone(light())} as MallVisual as unknown as Value};
 const far=presentationActorSlots(source.presentation,'far'),gallery=presentationActorSlots(source.presentation,'gallery'),riders=presentationActorSlots(source.presentation,'riders');
 const owns=(map:Readonly<Record<string,number>>,id:string)=>Object.prototype.hasOwnProperty.call(map,id);
 const nodes=rows.map(r=>r.instance);
 const booth=(id:string)=>{const actor=nodes.find(n=>n.type==='character.prepared'&&n.props.actor===id),owner=nodes.find(n=>n.id===actor?.attach?.instance),binding=owner?.bindings?.vendorPose;return ['deckVendor','caseVendor'].some(role=>binding==='mall.vendor.'+role&&presentationActor(source.presentation,role as 'deckVendor'|'caseVendor')===id);};
 for(const r of rows.filter(r=>r.instance.type==='character.prepared')){
  const id=String(r.props.actor),p=actors[id];if(!p)throw new Error('Unknown Mall actor '+id);
  let x=r.placement.x,h=r.placement.h;
  if(owns(far,id))h+=levels[far[id]%levels.length]+8;
  if(owns(gallery,id))h+=layout.slab-gallery[id];
  if(owns(riders,id)){const f=(view.t*.0012+riders[id])%1;x+=layout.escalator.x+8+f*(layout.escalator.w-16);h+=layout.escalator.h+f*(layout.slab-4);}
  let pose:PreparedCharacter=prepareCharacter(p,view.t);
  if(pose.visible){pose={...pose,character:{...pose.character,x,...(p.h!==undefined||h!==0?{h}:{})},frame:{...pose.frame,x:pose.frame.x+x-p.x},height:pose.height+h-(p.h??0)};}
  if(owns(riders,id)&&(view.sx(layout.escalator.x+layout.escalator.w)<-20||view.sx(layout.escalator.x)>view.viewW+20))pose={visible:false,character:pose.character};
  out['actor.'+id]=(booth(id)?{visible:false,character:pose.character}:pose) as unknown as Value;
 }
 for(const role of ['deckVendor','caseVendor'] as const){const id=presentationActor(source.presentation,role),p=id?actors[id]:undefined;if(p&&id&&booth(id))out['vendor.'+role]=prepareCharacter(p,view.t,{x:p.x,h:p.h??0}) as unknown as Value;}
 return out;
};
