/** Project source-owned interactions without mutating their callbacks, eligibility or coordinates. */
import type {SceneDef} from '../../scenes/kit';
import type {SceneModel} from '../model';
export function movingInteractions(scene:SceneDef,model:SceneModel):SceneDef{
 const offsets=model.attachmentOffsets();if(!offsets)return scene;
 const shift=<T extends {id:string;x:number;h?:number;promptH?:number}>(rows:T[]|undefined,group:'uses'|'readables'|'rests'|'exits',response:number,prompt:number)=>rows?.map(row=>{
  const delta=offsets[group]?.[row.id];return delta?{...row,x:row.x+delta.dx,h:(row.h??response)+delta.dh,promptH:(row.promptH??prompt)+delta.dh,...(delta.floorH!==undefined?{floorH:delta.floorH}:{})}:row;
 });
 return{...scene,uses:shift(scene.uses,'uses',60,70),readables:shift(scene.readables,'readables',70,70),rests:shift(scene.rests,'rests',0,60),exits:shift(scene.exits,'exits',0,70)!};
}
