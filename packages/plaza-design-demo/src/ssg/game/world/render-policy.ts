import {resolveRenderSettings,type RenderSettings,type RenderLimits} from './render-settings';
import {worldRenderLayers,type WorldCompositions} from './compositions';
import type {CitySource} from './city';
import type {Sequence} from '../art/core/timeline';
/** Read current membership and source references. Rendering, inspection and forms use this same order. */
export function renderPolicy(scene:{id:string;rendering?:RenderSettings},city:CitySource,world?:WorldCompositions,sequence?:Pick<Sequence,'id'|'rendering'|'memberRendering'>,composition?:string,limits?:RenderLimits){
 const place=city.PLACES.find(p=>(p.scenes as readonly string[]).includes(scene.id)),district=city.DISTRICTS.find(d=>d.id===place?.district);
 return resolveRenderSettings([
  {source:district?{kind:'district',id:district.id}:{kind:'default'},settings:district?.rendering},
  {source:{kind:'chunk',id:scene.id},settings:scene.rendering},
  ...(world?worldRenderLayers(world,scene.id,composition):[]),
  ...(sequence?[{source:{kind:'sequence' as const,id:sequence.id},settings:sequence.rendering},{source:{kind:'sequence-member' as const,id:sequence.id,chunk:scene.id},settings:sequence.memberRendering?.[scene.id]}]:[]),
 ],limits);
}
