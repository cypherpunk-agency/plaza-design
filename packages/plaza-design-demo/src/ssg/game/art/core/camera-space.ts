import type {View} from './view';
/** Screen-relative artwork keeps game-camera layout; editor navigation only transforms its result. */
export function inCameraSpace(ctx:CanvasRenderingContext2D,view:View,draw:(view:View)=>void){
 const frame=view.cameraFrame;if(!frame){draw(view);return;}
 ctx.save();try{ctx.translate(frame.x,frame.y);draw({...frame.view,lighting:view.lighting,illumination:view.illumination,reduced:view.reduced,sequence:view.sequence,weatherSource:view.weatherSource,rendering:view.rendering});}finally{ctx.restore();}
}
