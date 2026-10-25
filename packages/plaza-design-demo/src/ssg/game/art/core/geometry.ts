/** Shared projection arithmetic. View supplies the authoritative camera; callers own lifecycle. */
import type {Instance} from './composition';
import type {View} from './view';
/** Replay an object's drawing in its captured source coordinate space. */
export function withCanvasTransform(ctx:CanvasRenderingContext2D,transform:Pick<DOMMatrix,'a'|'b'|'c'|'d'|'e'|'f'>,draw:()=>void){
 ctx.save();
 try{ctx.setTransform(transform.a,transform.b,transform.c,transform.d,transform.e,transform.f);draw();}
 finally{ctx.restore();}
}
export function projectX(x:number,camera:number,parallax=1,pixelScale=1){return Math.round((x-camera*parallax)*pixelScale)/pixelScale;}
/** Source-local camera projection, including an independently navigated editor camera.
 * Pixel snapping and height snapping stay explicit because native play and sequences differ. */
export function sourceProjection(camera:{cam:number;gy:number},at:{dx:number;dh:number},pixelScale=1,authoredCam=camera.cam,snapHeight=false){
 return{cam:camera.cam-at.dx,sx:(x:number,p=1)=>projectX(x+(authoredCam-camera.cam),authoredCam-at.dx,p,pixelScale),
  y:(h:number)=>snapHeight?Math.round(camera.gy-h-at.dh):camera.gy-h-at.dh};
}
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

/** A projected rectangle through the actual canvas transform (frame scale, camera zoom and source placement). */
export function transformRect(r:{x:number;y:number;width:number;height:number},m:Pick<DOMMatrix,'a'|'b'|'c'|'d'|'e'|'f'>){
 const points=[[r.x,r.y],[r.x+r.width,r.y],[r.x,r.y+r.height],[r.x+r.width,r.y+r.height]].map(([x,y])=>({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f}));
 const xs=points.map(p=>p.x),ys=points.map(p=>p.y),x=Math.min(...xs),y=Math.min(...ys);
 return {x,y,width:Math.max(...xs)-x,height:Math.max(...ys)-y};
}

/** Height-up bounds from named edges, avoiding accidental bottom-as-top rectangles. */
export function boundsFromEdges({left,right,bottom,top}:{left:number;right:number;bottom:number;top:number}){
 if(![left,right,bottom,top].every(Number.isFinite)||right<left||top<bottom)throw Error('Invalid artwork bounds edges');
 return {x:left,h:top,w:right-left,tall:top-bottom};
}

/** Clip coordinates belong to the source chunk, independently of an object's transform. */
export function artworkClip(instance:Instance,view:View):{x:number;y:number;width:number;height:number}|undefined{
 const policy=instance.clip??(view.artworkScope==='static'&&['distance','backdrop'].includes(instance.layer)?'chunk':'none');
 if(typeof policy==='object')return{x:view.sx(policy.x),y:view.y(policy.h),width:view.sx(policy.x+policy.w)-view.sx(policy.x),height:view.y(policy.h-policy.tall)-view.y(policy.h)};
 const window=policy==='chunk'&&view.zoneWindow;return window?{x:window.left,y:0,width:window.right-window.left,height:view.viewH}:undefined;
}

export type CanvasTransform=Pick<DOMMatrix,'a'|'b'|'c'|'d'|'e'|'f'>;
export function copyTransform(m:CanvasTransform):CanvasTransform{return {a:m.a,b:m.b,c:m.c,d:m.d,e:m.e,f:m.f};}
export interface DragProjection {xUnit:number;hUnit:number;parentScale:number;parentFacing:number}
export function dragProjection(view:View,p:{x:number;h:number;parallax:number},parent?:{scale:number;facing:number}):DragProjection {
 return {xUnit:(view.sx(p.x+1000,p.parallax)-view.sx(p.x,p.parallax))/1000,hUnit:(view.y(p.h+1000)-view.y(p.h))/1000,parentScale:parent?.scale??1,parentFacing:parent?.facing??1};
}
export function dragFromCanvas(p:DragProjection,m:CanvasTransform,dx:number,dy:number){
 const det=m.a*m.d-m.b*m.c;if(!det||!p.xUnit||!p.hUnit)throw Error('Preview transform is not invertible');
 return {x:(m.d*dx-m.c*dy)/det/p.xUnit/p.parentScale/p.parentFacing,h:(-m.b*dx+m.a*dy)/det/p.hUnit/p.parentScale};
}
