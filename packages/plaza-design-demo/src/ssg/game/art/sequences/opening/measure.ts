/** Conservative native extents from the actual common-kit drawing operations, without pixels. */
export interface Measured { x:number; y:number; width:number; height:number }
type Matrix=[number,number,number,number,number,number];
interface State { matrix:Matrix;lineWidth:number;globalAlpha:number;fillStyle:unknown;strokeStyle:unknown;font:string;shadowBlur:number;shadowOffsetX:number;shadowOffsetY:number;clip:Measured|null }
export function measureArtwork(draw:(ctx:CanvasRenderingContext2D)=>void):Measured {
  let state:State={matrix:[1,0,0,1,0,0],lineWidth:1,globalAlpha:1,fillStyle:'#000',strokeStyle:'#000',font:'10px monospace',shadowBlur:0,shadowOffsetX:0,shadowOffsetY:0,clip:null};
  const stack:State[]=[];let path:Measured|null=null,bounds:Measured|null=null;
  const union=(a:Measured|null,b:Measured):Measured=>a?{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.max(a.x+a.width,b.x+b.width)-Math.min(a.x,b.x),height:Math.max(a.y+a.height,b.y+b.height)-Math.min(a.y,b.y)}:b;
  const point=(x:number,y:number)=>({x:state.matrix[0]*x+state.matrix[2]*y+state.matrix[4],y:state.matrix[1]*x+state.matrix[3]*y+state.matrix[5]});
  const rectangle=(x:number,y:number,w:number,h:number):Measured=>{const ps=[point(x,y),point(x+w,y),point(x,y+h),point(x+w,y+h)];const xs=ps.map(p=>p.x),ys=ps.map(p=>p.y);return{x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};};
  const paint=(rect:Measured|null,stroke=false)=>{
    if(!rect||state.globalAlpha<=0)return;const style=stroke?state.strokeStyle:state.fillStyle;
    if(typeof style==='string'&&/rgba\([^)]*,\s*0(?:\.0+)?\)$/.test(style))return;
    const scale=Math.max(Math.hypot(state.matrix[0],state.matrix[1]),Math.hypot(state.matrix[2],state.matrix[3])),pad=(stroke?state.lineWidth*scale/2:0)+state.shadowBlur;
    let box={x:rect.x-pad+Math.min(0,state.shadowOffsetX),y:rect.y-pad+Math.min(0,state.shadowOffsetY),width:rect.width+pad*2+Math.abs(state.shadowOffsetX),height:rect.height+pad*2+Math.abs(state.shadowOffsetY)};
    if(state.clip){const x=Math.max(box.x,state.clip.x),y=Math.max(box.y,state.clip.y),r=Math.min(box.x+box.width,state.clip.x+state.clip.width),b=Math.min(box.y+box.height,state.clip.y+state.clip.height);if(r<x||b<y)return;box={x,y,width:r-x,height:b-y};}bounds=union(bounds,box);
  };
  const multiply=(m:Matrix)=>{const a=state.matrix;state.matrix=[a[0]*m[0]+a[2]*m[1],a[1]*m[0]+a[3]*m[1],a[0]*m[2]+a[2]*m[3],a[1]*m[2]+a[3]*m[3],a[0]*m[4]+a[2]*m[5]+a[4],a[1]*m[4]+a[3]*m[5]+a[5]];};
  const methods:Record<string,(...args:any[])=>unknown>={
    save:()=>stack.push({...state,matrix:[...state.matrix] as Matrix,clip:state.clip?{...state.clip}:null}),restore:()=>{if(stack.length)state=stack.pop()!;},translate:(x:number,y:number)=>multiply([1,0,0,1,x,y]),scale:(x:number,y:number)=>multiply([x,0,0,y,0,0]),rotate:(a:number)=>multiply([Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0]),transform:(...m:Matrix)=>multiply(m),setTransform:(...m:Matrix)=>{state.matrix=m;},resetTransform:()=>{state.matrix=[1,0,0,1,0,0];},getTransform:()=>({a:state.matrix[0],b:state.matrix[1],c:state.matrix[2],d:state.matrix[3],e:state.matrix[4],f:state.matrix[5]}),
    beginPath:()=>{path=null;},closePath:()=>{},moveTo:(x:number,y:number)=>{const p=point(x,y);path=union(path,{...p,width:0,height:0});},lineTo:(x:number,y:number)=>methods.moveTo(x,y),rect:(x:number,y:number,w:number,h:number)=>{path=union(path,rectangle(x,y,w,h));},roundRect:(x:number,y:number,w:number,h:number)=>methods.rect(x,y,w,h),arc:(x:number,y:number,r:number)=>{path=union(path,rectangle(x-r,y-r,r*2,r*2));},ellipse:(x:number,y:number,rx:number,ry:number)=>{path=union(path,rectangle(x-rx,y-ry,rx*2,ry*2));},quadraticCurveTo:(cx:number,cy:number,x:number,y:number)=>{methods.moveTo(cx,cy);methods.moveTo(x,y);},bezierCurveTo:(x1:number,y1:number,x2:number,y2:number,x:number,y:number)=>{methods.moveTo(x1,y1);methods.moveTo(x2,y2);methods.moveTo(x,y);},fill:()=>paint(path),stroke:()=>paint(path,true),clip:()=>{state.clip=path?{...path}:null;},
    fillRect:(x:number,y:number,w:number,h:number)=>paint(rectangle(x,y,w,h)),strokeRect:(x:number,y:number,w:number,h:number)=>paint(rectangle(x,y,w,h),true),clearRect:()=>{},setLineDash:()=>{},getLineDash:()=>[],createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),
    measureText:(text:string)=>({width:text.length*(Number(/([\d.]+)px/.exec(state.font)?.[1]??10))*.65}),fillText:(text:string,x:number,y:number)=>{const size=Number(/([\d.]+)px/.exec(state.font)?.[1]??10),w=text.length*size*.65;paint(rectangle(x-w/2,y-size/2,w,size));},drawImage:(image:{width:number;height:number},...args:number[])=>{if(args.length===2)paint(rectangle(args[0],args[1],image.width,image.height));else if(args.length===4)paint(rectangle(args[0],args[1],args[2],args[3]));else paint(rectangle(args[4],args[5],args[6],args[7]));},
  };
  const context=new Proxy({}, {get(_target,key:string){if(key in methods)return methods[key];if(key in state)return state[key as keyof State];throw new Error(`Bounds measurement does not support Canvas.${key}`);},set(_target,key:string,value){(state as unknown as Record<string,unknown>)[key]=value;return true;}}) as CanvasRenderingContext2D;
  draw(context);return bounds??{x:0,y:0,width:0,height:0};
}
