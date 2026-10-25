import {screenBounds} from '../assemblies/static-bounds';
import {drawStreetSprite} from './street-sprite';
import {streetSpriteHeadHeight} from './presentation';
import {validateActorPresentation} from '../../engine/gameplay/actor-presentation';
import type {Element,Value} from '../core/composition';
import type {PreparedActor,PreparedRider,PreparedStreetSprite} from '../../engine/gameplay/actor-frame';
import {drawCharacterFrame} from './appearance';
import {drawRider} from './riders';
import {onScreen} from '../core/primitives';
import {validatePreparedCharacter} from './prepared';
export function validatePreparedActor(value:Value):void{
 if(value&&typeof value==='object'&&!Array.isArray(value)&&(value as Record<string,Value>).kind==='streetSprite'){const p=value as unknown as PreparedStreetSprite;validateActorPresentation(p.sprite);if(p.sprite.kind!=='streetSprite'||typeof p.visible!=='boolean'||!p.character||!Number.isFinite(p.character.x)||p.character.h!==undefined&&!Number.isFinite(p.character.h)||p.dim!==undefined&&(!Number.isFinite(p.dim)||p.dim<0||p.dim>1))throw new Error('Invalid prepared street sprite');return;}
 if(value&&typeof value==='object'&&!Array.isArray(value)&&(value as Record<string,Value>).kind==='rider'){
  const p=value as unknown as PreparedRider,r=p.rider;if(typeof p.visible!=='boolean'||!p.character||!Number.isFinite(p.character.x)||p.character.h!==undefined&&!Number.isFinite(p.character.h)||!r||!['phone','paper','suit','courier','elder','punk','inspector','sleeper'].includes(r.kind)||typeof r.sit!=='boolean'||typeof r.flip!=='boolean'||![r.phase,r.offset,r.ps].every(Number.isFinite)||r.ps<1||r.ps>5||p.dim!==undefined&&(!Number.isFinite(p.dim)||p.dim<0||p.dim>1))throw new Error('Invalid prepared rider');
 }else validatePreparedCharacter(value);
}
const actorVisible=(pose:PreparedActor):pose is Exclude<PreparedActor,{visible:false}>=>pose.visible;
const actorHiddenReason=(pose:PreparedActor)=>actorVisible(pose)?undefined:'Actor pose is hidden';
export function drawPreparedActor(ctx:CanvasRenderingContext2D,view:Parameters<Element['draw']>[1],pose:PreparedActor,cull=true){
 if(!actorVisible(pose))return;if('kind'in pose&&pose.kind==='streetSprite'){const draw=()=>drawStreetSprite(ctx,view,pose.sprite,pose.character.x,pose.character.h??0);if(pose.dim!==undefined){ctx.save();try{ctx.globalAlpha*=1-pose.dim;draw();}finally{ctx.restore();}}else draw();}
 else if('kind'in pose){const r=pose.rider,x=view.sx(pose.character.x+r.offset);if(cull&&!onScreen(view,x-16,32))return;const draw=()=>drawRider(ctx,r.kind,x,view.y(pose.character.h??0),view.t,{sit:r.sit,flip:r.flip,phase:r.phase,ps:r.ps});if(pose.dim!==undefined){ctx.save();try{ctx.globalAlpha*=1-pose.dim;draw();}finally{ctx.restore();}}else draw();}
 else drawCharacterFrame(ctx,view,pose.character,pose.ready,pose.pixelSize,pose.frame,pose.height);
}
export const preparedActorElement:Element={type:'actor.prepared',version:1,label:'Source actor',category:'characters',coordinates:'world',fields:{actor:{kind:'string',label:'Actor id',default:''}},visualFields:{pose:{kind:'json',label:'Native prepared actor',default:{visible:false,character:{x:0}},validate:validatePreparedActor}},parts:['backdrop'],hiddenReason:(_p,s)=>actorHiddenReason(s.pose as unknown as PreparedActor),bounds:(_p,s,c)=>{const pose=s.pose as unknown as PreparedActor;if(!actorVisible(pose))return{x:0,h:0,w:0,tall:0};const h='kind'in pose?(pose.kind==='streetSprite'?streetSpriteHeadHeight(pose.sprite):(pose.rider.sit?12:14)*pose.rider.ps):pose.height-(pose.character.h??0);const x='kind'in pose?pose.character.x+(pose.kind==='rider'?pose.rider.offset:0):pose.frame.x,ground=pose.character.h??0,fallback={x:x-(c?.placement.x??pose.character.x)-24,h,w:48,tall:h};return c?screenBounds(c,{x:c.view.sx(x,('parallax'in pose.character?pose.character.parallax:1)??1)-24,y:c.view.y(ground+h),w:48,h},fallback):fallback;},anchors:()=>({origin:{x:0,h:0,role:'origin'}}),draw(ctx,view,_p,s){drawPreparedActor(ctx,view,s.pose as unknown as PreparedActor);}};
