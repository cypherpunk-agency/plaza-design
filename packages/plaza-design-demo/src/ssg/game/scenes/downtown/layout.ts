import {content,downtownBindingGroups} from './scene-document';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import {manifestGeometry} from '../../engine/gameplay/manifest-geometry';
/** Gameplay geometry derives from the editable artwork document, retaining stable ids and text. */
import type { Composition } from '../../art/core/composition';
import { downtownPlacements } from './placements';
import { downtownComposition,downtownGeometry,downtownArtworkRoles } from './composition';
const geometry=downtownPlacements();
const ordinary=manifestGeometry(content.scene,downtownGeometry(),downtownBindingGroups,{groundExits:false,transformedExits:true});
export const LEVEL_W=ordinary.width;
export const SPAWN_X=ordinary.spawn;
export type Bay=[dx:number,w:number,kind:'door'|'glass'|'shutter'|'sealed'];
export interface Front{x:number;w:number;h:number;roof?:boolean;bays?:Bay[]}
export const FRONTS:Front[]=geometry.rows().filter(r=>r.instance.type==='downtown.front').map(r=>({
 x:r.x,w:Number(r.instance.props.width),h:Number(r.instance.props.height),...(r.instance.props.roof?{roof:true}:{}),
 ...((r.instance.children??[]).some(n=>n.type==='downtown.bay')?{bays:r.instance.children!.filter(n=>n.type==='downtown.bay').map(n=>[n.placement.x,Number(n.props.width),n.props.kind] as Bay)}:{}),
}));
export const PLATFORMS=downtownLayout(downtownComposition,content.scene).platforms;
export const STALL=downtownLayout(downtownComposition,content.scene).stall;
export interface Readable{id:string;x:number;h:number;pages:string[]}
export const READABLES:Readable[]=(content.scene.readables??[]).map(r=>({id:r.id,x:ordinary.bindings.readables[r.id].x,h:ordinary.bindings.readables[r.id].h,pages:r.pages}));
/** Coordinate adapter for edited documents; it changes local positions while keeping gameplay ids. */
export function downtownLayout(document:Composition,source:SceneDocument=content.scene){
 const rows=downtownGeometry(document),bindings=manifestGeometry(source,rows,downtownBindingGroups,{groundExits:false,transformedExits:true}),roles=downtownArtworkRoles(document,source,rows),exits=Object.fromEntries(Object.entries(bindings.bindings.exits).map(([id,p])=>[id,{x:p.x,h:p.h}]));
 const platforms=[['dumpsterPlatform','dumpsterWidth'],['annexPlatform','annexWidth']].map(([point,extent])=>{const row=roles[point],at=row.placement,width=Number(roles[extent].props.width)*at.scale;return{x:at.facing===-1?at.x-width:at.x,w:width,h:at.h};});
 return{width:bindings.width,spawn:bindings.spawn,exits,platforms,readables:(source.readables??[]).map(r=>({...r,x:bindings.bindings.readables[r.id].x,h:bindings.bindings.readables[r.id].h})),
  stall:{x:roles.stall.placement.x,w:Number(roles.stall.props.width)*roles.stall.placement.scale},
 };
}
