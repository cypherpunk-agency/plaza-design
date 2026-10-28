import {numericFields} from '../core/fields';
import {bandControls} from '../core/spatial';
import {generationSeed,semantic,shapeLength,shapePosition} from '../core/fields';
/** A finite, seeded cloud layer in world space. Camera movement never reseeds or resizes it. */
import type {AssetDefinition} from '../core/composition';
import {hash,warmth} from '../core/pixels';
import {screenBounds} from '../assemblies/static-bounds';
const number=numericFields({step:1});
export const cloudLayerElement:AssetDefinition={
 type:'environment.cloud-layer', selection:'region',version:1,label:'Cloud layer',category:'Atmosphere',coordinates:'world',libraryUse:'reusable',defaultLayer:'distance',parts:['backdrop'],
 spatial:bandControls('minX','maxX','altitude','altitudeVariation'),validateProperties:p=>{if(Number(p.maxX)<=Number(p.minX))throw Error('Cloud area right edge must be after its left edge.');},
 fields:{minX:shapePosition(number('From X',-300,-1e6,1e6)),maxX:shapePosition(number('To X',2400,-1e6,1e6)),altitude:shapePosition(number('Altitude',550,-1000,10000)),altitudeVariation:shapeLength(number('Height variation',150,0,3000)),cloudWidth:shapeLength(number('Cloud width',150,3,2000)),spacing:shapeLength(number('Spacing',120,3,10000)),velocityX:{...semantic(number('Drift (units per second)',.36,-100,100),{"group":"Motion","quantity":"speed","unit":"world units / second","space":"local"}),step:.01},seed:generationSeed(number('Seed',5,0,1e6)),opacity:semantic({kind:'number',label:'Opacity',default:.3,min:0,max:1,step:.01},{"group":"Visibility & Drawing","quantity":"ratio","unit":"ratio"})},
 bounds:(p,_s,c)=>{const q=c?.placement.parallax??1,from=Number(p.minX),to=Number(p.maxX),height=Number(p.altitude),spread=Number(p.altitudeVariation),pad=Number(p.cloudWidth)*1.3+20;const b={x:from-pad,h:height+spread+2,w:to-from+pad*2,tall:spread*2+10};return c?screenBounds(c,{x:c.view.sx(c.placement.x+b.x,q),y:c.view.y(c.placement.h+b.h),w:b.w,h:b.tall},b):b;},
 anchors:()=>({origin:{x:0,h:0,role:'origin'}}),
 draw(ctx,v,p,_s,_pass,at){const from=Number(p.minX),to=Number(p.maxX),gap=Number(p.spacing),q=at.parallax,seed=Number(p.seed),time=v.reduced?0:v.t/60,shift=((time*Number(p.velocityX))%gap+gap)%gap;if(to<=from)return;
  const origin=v.sx(at.x,q),padding=Number(p.cloudWidth)*1.3,first=Math.max(Math.floor(from/gap)-1,Math.floor((-origin-padding-shift)/gap)),last=Math.min(Math.ceil(to/gap),Math.ceil((v.viewW-origin-shift)/gap));
  for(let k=first;k<=last;k++){const u=k*gap+shift;if(u<from||u>to)continue;const fade=Math.min(1,(u-from)/gap,(to-u)/gap),x=Math.round(v.sx(at.x+u,q)/3)*3,y=Math.round(v.y(at.h+Number(p.altitude)+(hash(k*7+seed)*2-1)*Number(p.altitudeVariation))/3)*3,w=Math.round(Number(p.cloudWidth)*(.7+hash(k*13+seed)*.6)/3)*3;
   if(x+w<0||x>v.viewW)continue;ctx.save();ctx.globalAlpha*=Number(p.opacity)*fade;ctx.fillStyle=`rgba(255,150,120,${warmth(v.lighting)})`;ctx.fillRect(x,y,w,3);ctx.fillStyle='rgba(40,10,50,.35)';ctx.fillRect(x+18,y+3,w*.7,3);ctx.restore();
  }
 }
};
