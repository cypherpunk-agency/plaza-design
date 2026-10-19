import type {View} from '../core/view';
/** Neutral review surface; examples supply only the pieces relevant to the current exercise. */
export function drawReviewRoom(ctx:CanvasRenderingContext2D,v:View){
 ctx.save();ctx.fillStyle='#151d26';ctx.fillRect(0,0,v.viewW,v.viewH);
 ctx.fillStyle='#26323b';ctx.fillRect(0,v.gy,v.viewW,v.viewH-v.gy);
 ctx.fillStyle='#647787';ctx.fillRect(0,v.gy,v.viewW,1);ctx.restore();
}
