/** Metadata-only conversion for native viewport kernels. Painting remains untouched. */
import type {Bounds,BoundsContext}from '../core/composition';
export function screenBounds(context:BoundsContext|undefined,rect:{x:number;y:number;w:number;h:number},fallback:Bounds):Bounds{
 if(!context)return fallback;
 const {view,placement:p}=context,ox=view.sx(p.x,p.parallax),oy=view.y(p.h),ux=(view.sx(p.x+1000,p.parallax)-ox)/1000,uy=(view.y(p.h+1000)-oy)/1000;
 if(!ux||!uy)return fallback;
 const x0=(rect.x-ox)/ux,x1=(rect.x+rect.w-ox)/ux,h0=(rect.y-oy)/uy,h1=(rect.y+rect.h-oy)/uy;
 return{x:Math.min(x0,x1),h:Math.max(h0,h1),w:Math.abs(x1-x0),tall:Math.abs(h1-h0)};
}
