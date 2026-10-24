/** Shared projection arithmetic. View supplies the authoritative camera; callers own lifecycle. */
import type {View} from './view';
/** Replay an object's drawing in its captured source coordinate space. */
export function withCanvasTransform(ctx:CanvasRenderingContext2D,transform:Pick<DOMMatrix,'a'|'b'|'c'|'d'|'e'|'f'>,draw:()=>void){
 ctx.save();
 try{ctx.setTransform(transform.a,transform.b,transform.c,transform.d,transform.e,transform.f);draw();}
 finally{ctx.restore();}
}
export function projectX(x:number,camera:number,parallax=1,pixelScale=1){return Math.round((x-camera*parallax)*pixelScale)/pixelScale;}
export function canvasPoint(point:{clientX:number;clientY:number},rect:{left:number;top:number;width:number;height:number},width:number,height:number){return{x:(point.clientX-rect.left)*width/rect.width,y:(point.clientY-rect.top)*height/rect.height};}
export function projectedBounds(view:View,p:{x:number;h:number;scale:number;facing:number;parallax:number},b:{x:number;h:number;w:number;tall:number}){
 const x1=view.sx(p.x+b.x*p.scale*p.facing,p.parallax),x2=view.sx(p.x+(b.x+b.w)*p.scale*p.facing,p.parallax);
 const y1=view.y(p.h+b.h*p.scale),y2=view.y(p.h+(b.h-b.tall)*p.scale);
 return{x:Math.min(x1,x2),y:Math.min(y1,y2),width:Math.abs(x2-x1),height:Math.abs(y2-y1)};
}

/** Immutable world-to-canvas viewport; camera controllers retain their own mutable state. */
export interface CameraProjection {readonly k:number;readonly viewW:number;readonly viewH:number;readonly gy:number;readonly cam:number}
export function cameraProjection(base:CameraProjection,vision?:{readonly zoom:number;readonly x:number}):CameraProjection{
 const z=vision?.zoom??1;
 return{k:base.k*z,viewW:base.viewW/z,viewH:base.viewH/z,gy:base.gy/z,cam:vision?.x??base.cam};
}
