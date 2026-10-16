/** Gameplay geometry derives from the editable artwork document, retaining stable ids and text. */
import { SPR, type Sprite } from '../../art/core/sprites';
import type { Composition } from '../../art/core/composition';
import { downtownPlacements } from './placements';
import { downtownPositions } from './composition';
const geometry=downtownPlacements(),get=geometry.get;
export const LEVEL_W=Number(get('scene').instance.props.width);
export const SPAWN_X=get('spawn').x;
export type Bay=[dx:number,w:number,kind:'door'|'glass'|'shutter'|'sealed'];
export interface Front{x:number;w:number;h:number;roof?:boolean;bays?:Bay[]}
export const FRONTS:Front[]=geometry.rows().filter(r=>r.instance.type==='downtown.front').map(r=>({
 x:r.x,w:Number(r.instance.props.width),h:Number(r.instance.props.height),...(r.instance.props.roof?{roof:true}:{}),
 ...((r.instance.children??[]).some(n=>n.type==='downtown.bay')?{bays:r.instance.children!.filter(n=>n.type==='downtown.bay').map(n=>[n.placement.x,Number(n.props.width),n.props.kind] as Bay)}:{}),
}));
export const PLATFORMS=['platform-dumpster','platform-annex'].map(id=>{const row=get(id),owner=get(row.instance.attach!.instance);return{x:row.x,w:Number(owner.instance.props.width)*row.scale,h:row.h};});
export interface Npc{id:string;sprite:Sprite;x:number;flip:boolean}
export const NPCS:Npc[]=['hood','umbrella','hat'].map(id=>{const row=get('npc-'+id);return{id,sprite:SPR[row.instance.props.sprite as 'hood'|'umbrella'|'hat'],x:row.x,flip:!!row.instance.props.flip};});
export const STALL={x:get('noodle-stall').x,w:Number(get('noodle-stall').instance.props.width),fixerX:get('fixer').x};
export interface Readable{id:string;x:number;h:number;pages:string[]}
export const READABLES:Readable[]=[{id:'plaque',x:get('readable-plaque').x,h:get('readable-plaque').h,pages:['PENTHOUSE · BY INVITATION','The door has no handle. Only a window, very high up.']}];
/** Coordinate adapter for edited documents; it changes local positions while keeping gameplay ids. */
export function downtownLayout(document:Composition){
 const geometry=downtownPositions(document),get=geometry.get;
 const exits=Object.fromEntries(['market','shop','library','yard','capsule','metro','moth','taxi','map'].map(id=>{const p=get('exit-'+id);return[id,{x:p.x,h:p.h}];}));
 const platforms=['platform-dumpster','platform-annex'].map(id=>{const row=get(id),owner=get(row.instance.attach!.instance),width=Number(owner.instance.props.width)*row.scale;return{x:row.facing===-1?row.x-width:row.x,w:width,h:row.h};});
 return{width:Number(get('scene').instance.props.width),spawn:get('spawn').x,exits,platforms,readables:READABLES.map(r=>({...r,x:get('readable-'+r.id).x,h:get('readable-'+r.id).h})),
  stall:{x:get('noodle-stall').x,w:Number(get('noodle-stall').instance.props.width)*get('noodle-stall').scale,fixerX:get('fixer').x},
  npcs:NPCS.map(n=>({...n,x:get('npc-'+n.id).x,flip:!!get('npc-'+n.id).instance.props.flip})),
 };
}
