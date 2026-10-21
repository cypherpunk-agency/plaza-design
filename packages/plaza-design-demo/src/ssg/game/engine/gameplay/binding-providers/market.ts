import type {Value} from '../../../art/core/composition';
import {prepareCharacter} from '../../../runtime/characters';
import {TICKER} from '../../../art/signage/screens';
import {screenLine} from '../../../world/weather';
import type {BindingContext} from '../binding-sources';
import {provide} from '../binding-keys';
/**
 * The street market's artwork values:
 * - `market.weather`: the ticker's text, the weather line standing in for WEATHER.
 * - `market.actor.<id>`: an actor's pose where its artwork stands; a vendor a stall or booth holds is
 *   hidden here because the stall paints them between its back and counter.
 * - `market.vendor.<stall>`: the vendor behind a stall or booth, prepared where the stall holds them.
 * Clips (`market.clip.<id>`) are never set: the crowd is not seen through anything.
 */
const holdsVendor=(type:string)=>type==='market.stall'||type==='market.booth';
const marketValues=(ctx:BindingContext):Record<string,Value>=>{
 const {view,rows,actors}=ctx,out:Record<string,Value>={weather:TICKER.map(l=>l==='WEATHER'?screenLine():l).join('   ·   ')};
 const attached=(owner:string)=>rows.find(r=>r.instance.type==='character.prepared'&&r.instance.attach?.instance===owner&&r.instance.attach.anchor==='vendor');
 for(const r of rows){
  if(r.instance.type==='character.prepared'){
   const id=String(r.props.actor),p=actors[id];if(!p)throw new Error('Unknown Market actor '+id);
   let pose=prepareCharacter(p,view.t);
   if(pose.visible){const dh=r.placement.h-(p.h??0);pose={...pose,character:{...pose.character,x:r.placement.x,...(p.h!==undefined||r.placement.h!==0?{h:r.placement.h}:{})},frame:{...pose.frame,x:pose.frame.x+r.placement.x-p.x},height:pose.height+dh};}
   const owner=r.instance.attach?.anchor==='vendor'?rows.find(a=>a.instance.id===r.instance.attach!.instance):undefined;
   out['actor.'+id]=(owner&&holdsVendor(owner.instance.type)?{visible:false,character:pose.character}:pose) as unknown as Value;
  }else if(holdsVendor(r.instance.type)){
   const row=attached(r.instance.id),p=row?actors[String(row.props.actor)]:undefined;
   out['vendor.'+r.instance.id]=(p?prepareCharacter(p,view.t,{x:p.x,h:p.h??0}):{visible:false,character:{x:0}}) as unknown as Value;
  }
 }
 return out;
};
export const marketBindings=provide(['weather','actor.<actor>','clip.<actor>','vendor.<instance:market.stall>','vendor.<instance:market.booth>'],marketValues);
