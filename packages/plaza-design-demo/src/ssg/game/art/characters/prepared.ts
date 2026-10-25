/** Prepared character artwork. Controllers resolve schedules/poses; optional screen-space clip belongs to its containing window. */
import type { PreparedCharacter } from '../../runtime/characters';
import { drawCharacterFrame } from './appearance';
import {screenBounds} from '../assemblies/static-bounds';
import type { Element, Value } from '../core/composition';
export function validatePreparedCharacter(value: Value): void {
  const p = value as unknown as PreparedCharacter;
  if (!p || typeof p !== 'object' || typeof p.visible !== 'boolean' || !p.character || !Number.isFinite(p.character.x)) throw new Error('Invalid prepared character');
  if (p.visible && (!p.ready || !p.frame || !Number.isFinite(p.frame.x) || !Number.isFinite(p.frame.bob) || ![1,-1].includes(p.frame.face) || typeof p.frame.moving !== 'boolean' || typeof p.frame.legs !== 'string' || typeof p.frame.arms !== 'string' || !(p.pixelSize > 0) || !Number.isFinite(p.height) || typeof p.ready.key !== 'string' || ![p.ready.ph,p.ready.seed,p.ready.a,p.ready.b].every(Number.isFinite) || !(p.ready.full || p.ready.bot || p.ready.critter))) throw new Error('Incomplete prepared character');
}
export const preparedCharacterElement: Element = {
  type:'character.prepared',version:1,label:'Person, robot or animal',category:'characters',coordinates:'world',parts:['backdrop'],
  fields:{actor:{kind:'string',label:'Actor id',default:''}},
  visualFields:{pose:{kind:'json',label:'Prepared pose',default:{visible:false,character:{x:0}},validate:validatePreparedCharacter},clip:{kind:'json',label:'Containing window clip',default:null,validate:value=>{if(value!==null&&(!Array.isArray(value)||value.length!==4||value.some(n=>typeof n!=='number'||!Number.isFinite(n))))throw new Error('Invalid actor clipping rectangle');}}},
  bounds:(_p,state,c)=>{const pose=state.pose as unknown as PreparedCharacter;if(!pose?.visible)return{x:-24,h:64,w:48,tall:64};const h=pose.height-(pose.character.h??0),fallback={x:pose.frame.x-(c?.placement.x??pose.character.x)-24,h,w:48,tall:h};return c?screenBounds(c,{x:c.view.sx(pose.frame.x,pose.character.parallax??1)-24,y:c.view.y(pose.height),w:48,h},fallback):fallback;},
  anchors:()=>({origin:{x:0,h:0,role:'origin'}}),
  draw(ctx,view,_props,state){const p=state.pose as unknown as PreparedCharacter;if(!p.visible)return;const clip=state.clip as number[]|null;if(clip){ctx.save();ctx.beginPath();ctx.rect(clip[0],clip[1],clip[2],clip[3]);ctx.clip();}try{drawCharacterFrame(ctx,view,p.character,p.ready,p.pixelSize,p.frame,p.height);}finally{if(clip)ctx.restore();}},
};
