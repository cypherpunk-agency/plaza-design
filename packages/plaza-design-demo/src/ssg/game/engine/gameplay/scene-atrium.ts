import type {Resolved,Value} from '../../art/core/composition';
import type {View} from '../../art/core/view';
import type {MallVisual} from '../../art/assemblies/mall-state';
import type {MallLayout} from '../../art/assemblies/mall-details';
import {presentationActorSlots} from './scene-presentation';
import type {SceneDocument} from './scene-document';
/**
 * The atrium (scene.json `stage.atrium`): adaptive storeys, a gallery slab and an escalator, measured from two
 * artwork roles. `room` carries the atrium's own parameters (ceil, fascia, slab, rail, far0, stepSpacing, floorHeight) and
 * `escalator` its position and size; the scene's width is the manifest's. Registered because the storey count
 * follows the view's height (the one calculation the artwork cannot state); everything else is the roles.
 *
 * - `{atrium: true}` (scene values): the atrium's layout, its storey heights and the light, as the atrium artwork paints them.
 * - presentation actors `far` (a storey slot each), `gallery` (a slab offset each) and `riders` (an escalator phase each)
 *   are placed by it: lifted to a storey, onto the gallery slab, or riding the escalator, which hides them while it is off screen.
 */
export interface SceneAtrium {room:string;escalator:string}
export interface AtriumFrame {layout:MallLayout;levels:number[]}
const widthOf=(source:SceneDocument,rows:readonly Resolved[])=>{const w=source.manifest?.width;return typeof w==='number'?w:Number(rows.find(r=>r.instance.id===w!.instance)!.props[w!.property]);};
/** The layout and storey ladder at this view, from the stage's two roles. */
export function atriumFrame(view:View,roles:Readonly<Record<string,Resolved>>,rows:readonly Resolved[],source:SceneDocument,a:SceneAtrium):AtriumFrame{
 const room=roles[a.room],escalator=roles[a.escalator];
 if(!room||!escalator)throw new Error('Atrium requires the artwork roles '+a.room+' and '+a.escalator);
 const s=room.props,layout:MallLayout={width:widthOf(source,rows),ceil:Number(s.ceil),fascia:Number(s.fascia),slab:Number(s.slab),rail:Number(s.rail),far0:Number(s.far0),step:Number(s.stepSpacing),storey:Number(s.floorHeight),escalator:{x:escalator.placement.x,h:escalator.placement.h,w:Number(escalator.props.width)*escalator.placement.scale*escalator.placement.facing}};
 const count=Math.max(2,Math.floor((view.gy-layout.far0-30)/layout.step));
 return{layout,levels:Array.from({length:count},(_,i)=>layout.far0+i*layout.step)};
}
export function atriumSnapshot(view:View,roles:Readonly<Record<string,Resolved>>,rows:readonly Resolved[],source:SceneDocument,a:SceneAtrium):Value{
 const{layout,levels}=atriumFrame(view,roles,rows,source,a);
 return{layout,levels,light:structuredClone(view.lighting)} as MallVisual as unknown as Value;
}
/** Where an atrium actor stands this frame: the artwork's place moved to its storey, slab or escalator step (and whether the escalator hides it). */
export function atriumPlace(frame:AtriumFrame,view:View,source:SceneDocument,id:string,at:{x:number;h:number}):{x:number;h:number;hidden:boolean}{
 const owns=(map:Readonly<Record<string,number>>)=>Object.prototype.hasOwnProperty.call(map,id),{layout,levels}=frame;
 const far=presentationActorSlots(source.presentation,'far'),gallery=presentationActorSlots(source.presentation,'gallery'),riders=presentationActorSlots(source.presentation,'riders');
 let{x,h}=at,hidden=false;
 if(owns(far))h+=levels[far[id]%levels.length]+8;
 if(owns(gallery))h+=layout.slab-gallery[id];
 if(owns(riders)){const f=(view.t*.0012+riders[id])%1;x+=layout.escalator.x+8+f*(layout.escalator.w-16);h+=layout.escalator.h+f*(layout.slab-4);hidden=view.sx(layout.escalator.x+layout.escalator.w)<-20||view.sx(layout.escalator.x)>view.viewW+20;}
 return{x,h,hidden};
}
