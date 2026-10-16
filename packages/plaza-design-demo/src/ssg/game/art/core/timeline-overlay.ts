/** Evaluated timeline overlays in logical viewport coordinates, above the completed native scene. */
import type {TimelineFrame} from './timeline';
export type TimelineOverlay=Pick<TimelineFrame,'text'|'fades'>;
export interface TimelineViewport{width:number;height:number;scale:number}
/** Text uses the timeline convention x right, h up from the viewport origin (screen y = -h). */
export function drawTimelineOverlay(ctx:CanvasRenderingContext2D,viewport:TimelineViewport,overlay:TimelineOverlay){
 if(!overlay.text.length&&!overlay.fades.some(f=>f.opacity>0))return;
 ctx.save();
 try{
  ctx.setTransform(viewport.scale,0,0,viewport.scale,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
  for(const fade of overlay.fades)if(fade.opacity>0){ctx.globalAlpha=fade.opacity;ctx.fillStyle=fade.color;ctx.fillRect(0,0,viewport.width,viewport.height);}
  ctx.globalAlpha=1;ctx.fillStyle='#ffdfb5';ctx.font='600 12px "IBM Plex Mono", monospace';ctx.textAlign='left';ctx.textBaseline='alphabetic';
  for(const card of overlay.text)for(const[line,text]of card.text.split('\n').entries())ctx.fillText(text,card.x,-card.h+line*18);
 }finally{ctx.restore();}
}
