/** Conservative native extents from the actual common-kit drawing operations, without pixels. */
export interface Measured { x:number; y:number; width:number; height:number }
const bitmapBounds=new WeakMap<object,Measured>();
/** Opaque content of an existing cached bitmap, in source pixels (no repeated readback). */
export function registerBitmapBounds(image:object,bounds:Measured){bitmapBounds.set(image,bounds);}
const exclusions=new WeakMap<object,{depth:number}>();
export function isMeasuringArtwork(ctx:CanvasRenderingContext2D){return exclusions.has(ctx);}
/** Cast shadows are lighting, not the selectable body of the asset. Drawing is unchanged. */
export function withoutArtworkBounds(ctx:CanvasRenderingContext2D,draw:()=>void){const control=exclusions.get(ctx);if(control)control.depth++;try{draw();}finally{if(control)control.depth--;}}
type Matrix=[number,number,number,number,number,number];
interface State { matrix:Matrix;lineWidth:number;globalAlpha:number;fillStyle:unknown;strokeStyle:unknown;font:string;shadowBlur:number;shadowOffsetX:number;shadowOffsetY:number;clip:Measured|null }
export function measureArtwork(draw:(ctx:CanvasRenderingContext2D)=>void,target?:CanvasRenderingContext2D):Measured {
  let state:State={matrix:[1,0,0,1,0,0],lineWidth:1,globalAlpha:1,fillStyle:'#000',strokeStyle:'#000',font:'10px monospace',shadowBlur:0,shadowOffsetX:0,shadowOffsetY:0,clip:null};
  if(target){const m=target.getTransform();state.matrix=[m.a,m.b??0,m.c??0,m.d??m.a,m.e??0,m.f??0];for(const key of ['lineWidth','globalAlpha','fillStyle','strokeStyle','font','shadowBlur','shadowOffsetX','shadowOffsetY']as const){const value=target[key];if(typeof value==='number'?Number.isFinite(value):typeof value==='string'||value!==null&&typeof value==='object')(state as any)[key]=value;}}
  const control={depth:0};
  const stack:State[]=[];let path:Measured|null=null,bounds:Measured|null=null;
  const union=(a:Measured|null,b:Measured):Measured=>a?{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.max(a.x+a.width,b.x+b.width)-Math.min(a.x,b.x),height:Math.max(a.y+a.height,b.y+b.height)-Math.min(a.y,b.y)}:b;
  const point=(x:number,y:number)=>({x:state.matrix[0]*x+state.matrix[2]*y+state.matrix[4],y:state.matrix[1]*x+state.matrix[3]*y+state.matrix[5]});
  const rectangle=(x:number,y:number,w:number,h:number):Measured=>{const m=state.matrix;if(!m[1]&&!m[2]){const x0=m[0]*x+m[4],x1=x0+m[0]*w,y0=m[3]*y+m[5],y1=y0+m[3]*h;return{x:Math.min(x0,x1),y:Math.min(y0,y1),width:Math.abs(x1-x0),height:Math.abs(y1-y0)};}const ps=[point(x,y),point(x+w,y),point(x,y+h),point(x+w,y+h)];const xs=ps.map(p=>p.x),ys=ps.map(p=>p.y);return{x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};};
  const paint=(rect:Measured|null,stroke=false)=>{
    if(!rect||control.depth||state.globalAlpha<=0)return;const style=stroke?state.strokeStyle:state.fillStyle;
    if(typeof style==='string'&&/rgba\([^)]*,\s*0(?:\.0+)?\)$/.test(style))return;
    const scale=Math.max(Math.hypot(state.matrix[0],state.matrix[1]),Math.hypot(state.matrix[2],state.matrix[3])),pad=(stroke?state.lineWidth*scale/2:0)+state.shadowBlur;
    let box={x:rect.x-pad+Math.min(0,state.shadowOffsetX),y:rect.y-pad+Math.min(0,state.shadowOffsetY),width:rect.width+pad*2+Math.abs(state.shadowOffsetX),height:rect.height+pad*2+Math.abs(state.shadowOffsetY)};
    if(state.clip){const x=Math.max(box.x,state.clip.x),y=Math.max(box.y,state.clip.y),r=Math.min(box.x+box.width,state.clip.x+state.clip.width),b=Math.min(box.y+box.height,state.clip.y+state.clip.height);if(r<x||b<y)return;box={x,y,width:r-x,height:b-y};}bounds=union(bounds,box);
  };
  const multiply=(m:Matrix)=>{const a=state.matrix;state.matrix=[a[0]*m[0]+a[2]*m[1],a[1]*m[0]+a[3]*m[1],a[0]*m[2]+a[2]*m[3],a[1]*m[2]+a[3]*m[3],a[0]*m[4]+a[2]*m[5]+a[4],a[1]*m[4]+a[3]*m[5]+a[5]];};
  const ellipse=(x:number,y:number,rx:number,ry:number,rotation=0,start=0,end=Math.PI*2,anticlockwise=false)=>{
    const m=state.matrix,c=Math.cos(rotation),s=Math.sin(rotation),o=point(x,y),ax=rx*(m[0]*c+m[2]*s),bx=ry*(-m[0]*s+m[2]*c),ay=rx*(m[1]*c+m[3]*s),by=ry*(-m[1]*s+m[3]*c),tau=Math.PI*2;
    const norm=(a:number)=>(a%tau+tau)%tau,span=anticlockwise?norm(start-end):norm(end-start),full=Math.abs(end-start)>=tau;
    const candidates=[start,end,Math.atan2(bx,ax),Math.atan2(bx,ax)+Math.PI,Math.atan2(by,ay),Math.atan2(by,ay)+Math.PI];
    for(const a of candidates)if(full||(anticlockwise?norm(start-a):norm(a-start))<=span+1e-10){const p={x:o.x+ax*Math.cos(a)+bx*Math.sin(a),y:o.y+ay*Math.cos(a)+by*Math.sin(a),width:0,height:0};path=union(path,p);}
  };
  const paintText=(text:string,x:number,y:number,max?:number,stroke=false)=>{
    const metrics=target?.measureText(text);
    if(metrics&&[metrics.actualBoundingBoxLeft,metrics.actualBoundingBoxRight,metrics.actualBoundingBoxAscent,metrics.actualBoundingBoxDescent].every(Number.isFinite)){
      const k=max!==undefined&&metrics.width>max?max/metrics.width:1;
      paint(rectangle(x-metrics.actualBoundingBoxLeft*k,y-metrics.actualBoundingBoxAscent,(metrics.actualBoundingBoxLeft+metrics.actualBoundingBoxRight)*k,metrics.actualBoundingBoxAscent+metrics.actualBoundingBoxDescent),stroke);
    }else{const size=Number(/([\d.]+)px/.exec(state.font)?.[1]??10),w=text.length*size*.65;paint(rectangle(x-w/2,y-size/2,w,size),stroke);}
  };
  const methods:Record<string,(...args:any[])=>unknown>={
    save:()=>stack.push({...state,matrix:[...state.matrix] as Matrix,clip:state.clip?{...state.clip}:null}),restore:()=>{if(stack.length)state=stack.pop()!;},translate:(x:number,y:number)=>multiply([1,0,0,1,x,y]),scale:(x:number,y:number)=>multiply([x,0,0,y,0,0]),rotate:(a:number)=>multiply([Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0]),transform:(...m:Matrix)=>multiply(m),setTransform:(...m:Matrix)=>{state.matrix=m;},resetTransform:()=>{state.matrix=[1,0,0,1,0,0];},getTransform:()=>({a:state.matrix[0],b:state.matrix[1],c:state.matrix[2],d:state.matrix[3],e:state.matrix[4],f:state.matrix[5]}),
    beginPath:()=>{path=null;},closePath:()=>{},moveTo:(x:number,y:number)=>{const p=point(x,y);path=union(path,{...p,width:0,height:0});},lineTo:(x:number,y:number)=>methods.moveTo(x,y),rect:(x:number,y:number,w:number,h:number)=>{path=union(path,rectangle(x,y,w,h));},roundRect:(x:number,y:number,w:number,h:number)=>methods.rect(x,y,w,h),arc:(x:number,y:number,r:number,start=0,end=Math.PI*2,ccw=false)=>ellipse(x,y,r,r,0,start,end,ccw),ellipse,quadraticCurveTo:(cx:number,cy:number,x:number,y:number)=>{methods.moveTo(cx,cy);methods.moveTo(x,y);},bezierCurveTo:(x1:number,y1:number,x2:number,y2:number,x:number,y:number)=>{methods.moveTo(x1,y1);methods.moveTo(x2,y2);methods.moveTo(x,y);},fill:()=>paint(path),stroke:()=>paint(path,true),clip:()=>{if(path){const a=state.clip;if(!a)state.clip={...path};else{const x=Math.max(a.x,path.x),y=Math.max(a.y,path.y);state.clip={x,y,width:Math.max(0,Math.min(a.x+a.width,path.x+path.width)-x),height:Math.max(0,Math.min(a.y+a.height,path.y+path.height)-y)};}}},
    fillRect:(x:number,y:number,w:number,h:number)=>paint(rectangle(x,y,w,h)),strokeRect:(x:number,y:number,w:number,h:number)=>paint(rectangle(x,y,w,h),true),clearRect:()=>{},setLineDash:()=>{},getLineDash:()=>[],createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),
    measureText:(text:string)=>({width:text.length*(Number(/([\d.]+)px/.exec(state.font)?.[1]??10))*.65}),fillText:paintText,strokeText:(text:string,x:number,y:number,max?:number)=>paintText(text,x,y,max,true),drawImage:(image:{width:number;height:number},...args:number[])=>{const known=bitmapBounds.get(image),source=args.length===8?{x:args[0],y:args[1],width:args[2],height:args[3]}:{x:0,y:0,width:image.width,height:image.height};const dest=args.length===2?{x:args[0],y:args[1],width:image.width,height:image.height}:args.length===4?{x:args[0],y:args[1],width:args[2],height:args[3]}:{x:args[4],y:args[5],width:args[6],height:args[7]};if(!known){paint(rectangle(dest.x,dest.y,dest.width,dest.height));return;}const l=Math.max(source.x,known.x),t=Math.max(source.y,known.y),r=Math.min(source.x+source.width,known.x+known.width),b=Math.min(source.y+source.height,known.y+known.height);if(r<=l||b<=t)return;paint(rectangle(dest.x+(l-source.x)*dest.width/source.width,dest.y+(t-source.y)*dest.height/source.height,(r-l)*dest.width/source.width,(b-t)*dest.height/source.height));},
  };
  const forwarded=new Map<PropertyKey,unknown>();
  const context=new Proxy({}, {get(_target,key:string){if(target){const value=(target as any)[key];if(typeof value!=='function')return value;if(!forwarded.has(key))forwarded.set(key,(...args:any[])=>{methods[key]?.(...args);return value.apply(target,args);});return forwarded.get(key);}if(key in methods)return methods[key];if(key in state)return state[key as keyof State];throw new Error(`Bounds measurement does not support Canvas.${key}`);},set(_target,key:string,value){(state as unknown as Record<string,unknown>)[key]=value;if(target)(target as any)[key]=value;return true;}}) as CanvasRenderingContext2D;
  exclusions.set(context,control);try{draw(context);}finally{exclusions.delete(context);}return bounds??{x:0,y:0,width:0,height:0};
}
