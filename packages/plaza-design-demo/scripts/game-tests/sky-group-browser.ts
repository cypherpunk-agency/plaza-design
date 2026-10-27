/** The registered sky group must paint the existing kernel identically in source and workspace cameras. */
import {skyElement,skyTown,type SkyRegion} from '../../src/ssg/game/art/environment/sky-element';
import {drawSky} from '../../src/ssg/game/art/environment/sky';
import {frameView,type View} from '../../src/ssg/game/art/core/view';
import {lightAt} from '../../src/ssg/game/world/light';
export function checkSkyGroup(){
 const results:{id:string;ok:boolean;differences:number}[]=[],regions:SkyRegion[]=[{from:4140,to:11820,enter:1320,leave:1740,town:1}];
 for(const width of [640,960])for(const minute of [580,1080,1200])for(const x of [0,7890,13290])for(const workspace of [false,true]){
  const W=width,H=width*9/16,lighting=lightAt(1,minute,270,null),ref={x,h:x===13290?160:0};
  const base:View={...frameView(420,lighting),viewW:W,viewH:H,cam:400,gy:H*.82,sx:(x,p=1)=>Math.round(x-400*p),y:h=>H*.82-h};
  if(workspace)base.cameraFrame={view:{...base,viewW:W*.8,viewH:H*.8,cam:880,sx:(x,p=1)=>x-880*p,y:h=>H*.7-h},x:53,y:26};
  const offset=(v:View):View=>({...v,cam:v.cam+ref.x,sx:(x,p=1)=>v.sx(x-ref.x*p,p),y:h=>v.y(h-ref.h)});
  const placed=offset(base);if(base.cameraFrame)placed.cameraFrame={...base.cameraFrame,view:offset(base.cameraFrame.view)};
  const a=document.createElement('canvas'),b=document.createElement('canvas');a.width=b.width=W;a.height=b.height=H;
  drawSky(a.getContext('2d')!,base,lighting,{horizon:base.y(189-ref.h),style:'sunset',town:skyTown(regions,(base.cameraFrame?.view.cam??base.cam)+ref.x+(base.cameraFrame?.view.viewW??W)/2)});
  skyElement.draw(b.getContext('2d')!,placed,{horizon:189,style:'sunset',town:0,regions:regions as any},{},'backdrop',{x:0,h:0,scale:1,facing:1,parallax:1});
  const aa=a.getContext('2d')!.getImageData(0,0,W,H).data,bb=b.getContext('2d')!.getImageData(0,0,W,H).data;let differences=0;for(let i=0;i<aa.length;i+=4)if(aa[i]!==bb[i]||aa[i+1]!==bb[i+1]||aa[i+2]!==bb[i+2]||aa[i+3]!==bb[i+3])differences++;
  results.push({id:`sky-group-${W}-${minute}-${x}-${workspace?'workspace':'camera'}`,ok:!differences,differences});
 }
 return results;
}
