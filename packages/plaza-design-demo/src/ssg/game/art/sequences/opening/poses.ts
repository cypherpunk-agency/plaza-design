/** Pure prepared-pose paint helper; controllers resolve schedules and appearances. */
import type{PreparedCharacter}from'../../../runtime/characters';
import{drawCharacterFrame}from'../../characters/appearance';
import type{View}from'../../core/view';
export type OpeningActors=Readonly<Record<string,PreparedCharacter>>;
/** A person a people flow places (story/title/actors.ts): the prepared pose, and where the flow has them in the flow's own units. */
export type FlowActor=PreparedCharacter&{flow:{x:number;h:number}};
/** Where a flow has this person, or undefined for an authored actor. */
export const flowPlace=(pose:PreparedCharacter|undefined)=>(pose as Partial<FlowActor>|undefined)?.flow;
/** How far (local units, before the coast's scale) a prepared walker stands from its anchor now. */
export const actorOffset=(pose:PreparedCharacter|undefined)=>pose?.visible?pose.frame.x:0;
/**
 * Paint a prepared pose at the current origin. The kit skips a body whose own x is more than 40 units left of
 * the origin (drawCharacterFrame's view test, made for scene coordinates); here the origin is the actor's anchor,
 * so a walker 40 units west of it would vanish mid-screen. The pose is painted from its own place instead.
 */
export function paintOpeningActor(x:CanvasRenderingContext2D,v:View,pose:PreparedCharacter|undefined,id:string){
  if(!pose)throw new Error('Missing prepared opening actor '+id);
  if(!pose.visible)return;
  const T=Math.round(pose.frame.x);
  if(T===0){drawCharacterFrame(x,v,pose.character,pose.ready,pose.pixelSize,pose.frame,pose.height);return;}
  x.save();x.translate(T,0);
  try{drawCharacterFrame(x,v,pose.character,pose.ready,pose.pixelSize,{...pose.frame,x:pose.frame.x-T},pose.height);}finally{x.restore();}
}
