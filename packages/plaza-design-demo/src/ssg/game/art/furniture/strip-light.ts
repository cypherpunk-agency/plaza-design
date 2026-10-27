/** Ceiling fixture and light cone. Its flicker is authored, not chosen by a scene-array index. */
import {box} from '../core/primitives';
import type {AssetDefinition,Field} from '../core/composition';
const size=(label:string,value:number):Field=>({kind:'number',label,default:value,min:1,max:2000,step:1});
export const stripLightElement:AssetDefinition={type:'furniture.strip-light',version:1,label:'Ceiling strip light',category:'electronics',libraryUse:'reusable',coordinates:'world',parts:['backdrop'],
 fields:{length:size('Tube length',60),drop:size('Light cone drop',158),spread:size('Light cone spread',220),flicker:{kind:'boolean',label:'Failing tube',default:false}},
 bounds:p=>({x:-Math.max(Number(p.length),Number(p.spread))/2,h:2,w:Math.max(Number(p.length),Number(p.spread)),tall:Number(p.drop)+2}),
 anchors:()=>({origin:{x:0,h:0,role:'origin'}}),
 draw(x,v,p,_s,_pass,at){const lx=v.sx(at.x),bottom=at.h-Number(p.drop),dying=p.flicker&&(v.t%200>180||(v.t%200>150&&Math.floor(v.t)%6<3)),half=Number(p.length)/2,cone=Number(p.spread)/2;
  const g=x.createLinearGradient(0,v.y(at.h-2),0,v.y(bottom));g.addColorStop(0,'rgba(255,230,190,'+(dying?.04:.12)+')');g.addColorStop(1,'rgba(255,230,190,0)');
  x.fillStyle=g;x.beginPath();x.moveTo(lx-half,v.y(at.h-2));x.lineTo(lx-cone,v.y(bottom));x.lineTo(lx+cone,v.y(bottom));x.lineTo(lx+half,v.y(at.h-2));x.closePath();x.fill();
  box(x,lx-half,v.y(at.h),Number(p.length),3,dying?'rgba(255,230,190,.25)':'rgba(255,240,215,.9)');}};
