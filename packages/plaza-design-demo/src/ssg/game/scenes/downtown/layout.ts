import {content,downtownBindingGroups} from './scene-document';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import {manifestGeometry} from '../../engine/gameplay/manifest-geometry';
/** Gameplay geometry derives from the editable artwork document, retaining stable ids and text. */
import type { Composition } from '../../art/core/composition';
import { downtownPlacements } from './placements';
import { downtownPositions,downtownGeometry } from './composition';
const geometry=downtownPlacements(),get=geometry.get;
const ordinary=manifestGeometry(content.scene,downtownGeometry(),downtownBindingGroups,{groundExits:false,transformedExits:true});
export const LEVEL_W=ordinary.width;
export const SPAWN_X=ordinary.spawn;
export type Bay=[dx:number,w:number,kind:'door'|'glass'|'shutter'|'sealed'];
export interface Front{x:number;w:number;h:number;roof?:boolean;bays?:Bay[]}
export const FRONTS:Front[]=geometry.rows().filter(r=>r.instance.type==='downtown.front').map(r=>({
 x:r.x,w:Number(r.instance.props.width),h:Number(r.instance.props.height),...(r.instance.props.roof?{roof:true}:{}),
 ...((r.instance.children??[]).some(n=>n.type==='downtown.bay')?{bays:r.instance.children!.filter(n=>n.type==='downtown.bay').map(n=>[n.placement.x,Number(n.props.width),n.props.kind] as Bay)}:{}),
}));
export const PLATFORMS=['platform-dumpster','platform-annex'].map(id=>{const row=get(id),owner=get(row.instance.attach!.instance);return{x:row.x,w:Number(owner.instance.props.width)*row.scale,h:row.h};});
export const STALL={x:get('noodle-stall').x,w:Number(get('noodle-stall').instance.props.width)};
export interface Readable{id:string;x:number;h:number;pages:string[]}
export const READABLES:Readable[]=(content.scene.readables??[]).map(r=>({id:r.id,x:ordinary.bindings.readables[r.id].x,h:ordinary.bindings.readables[r.id].h,pages:r.pages}));
/** Coordinate adapter for edited documents; it changes local positions while keeping gameplay ids. */
export function downtownLayout(document:Composition,source:SceneDocument=content.scene){
 const geometry=downtownPositions(document),get=geometry.get;
 const bindings=manifestGeometry(source,downtownGeometry(document),downtownBindingGroups,{groundExits:false,transformedExits:true}),exits=Object.fromEntries(Object.entries(bindings.bindings.exits).map(([id,p])=>[id,{x:p.x,h:p.h}]));
 const platforms=['platform-dumpster','platform-annex'].map(id=>{const row=get(id),owner=get(row.instance.attach!.instance),width=Number(owner.instance.props.width)*row.scale;return{x:row.facing===-1?row.x-width:row.x,w:width,h:row.h};});
 return{width:bindings.width,spawn:bindings.spawn,exits,platforms,readables:(source.readables??[]).map(r=>({...r,x:bindings.bindings.readables[r.id].x,h:bindings.bindings.readables[r.id].h})),
  stall:{x:get('noodle-stall').x,w:Number(get('noodle-stall').instance.props.width)*get('noodle-stall').scale},
 };
}
