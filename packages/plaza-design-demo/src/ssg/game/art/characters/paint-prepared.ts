import type {PreparedCharacter} from '../../runtime/characters';
import {drawCharacterFrame} from './appearance';
import type {View} from '../core/view';
/**
 * Paint a prepared pose at the current origin. The kit skips a body whose own x is more than 40 units left of
 * the origin (drawCharacterFrame's view test, made for scene coordinates); here the origin is the actor's anchor,
 * so a walker 40 units west of it would vanish mid-screen. The pose is painted from its own place instead.
 */
export function paintPreparedAtOrigin(x:CanvasRenderingContext2D,v:View,pose:PreparedCharacter|undefined,id:string){
  if(!pose)throw new Error('Missing prepared actor '+id);
  if(!pose.visible)return;
  const T=Math.round(pose.frame.x);
  if(T===0){drawCharacterFrame(x,v,pose.character,pose.ready,pose.pixelSize,pose.frame,pose.height);return;}
  x.save();x.translate(T,0);
  try{drawCharacterFrame(x,v,pose.character,pose.ready,pose.pixelSize,{...pose.frame,x:pose.frame.x-T},pose.height);}finally{x.restore();}
}
