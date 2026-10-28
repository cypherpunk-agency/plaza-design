import {appearanceBoolean,shapeLength,numericFields} from '../core/fields';
import {axisControl,combineControls,rectangleControls} from '../core/spatial';
/** Ceiling fixture and light cone. Its flicker is authored, not chosen by a scene-array index. */
import {box} from '../core/primitives';
import type {AssetDefinition} from '../core/composition';
const size=numericFields({min:1,max:2000,step:1});
export const stripLightElement:AssetDefinition={type:'furniture.strip-light',version:1,label:'Ceiling strip light',category:'electronics',libraryUse:'reusable',coordinates:'world',parts:['backdrop'],
 fields:{length:shapeLength(size('Tube length',60)),coneDepth:shapeLength(size('Light cone depth below tube',158)),coneWidth:shapeLength(size('Light cone width',220)),flicker:appearanceBoolean({kind:'boolean',label:'Failing tube',default:false})},
 spatial:combineControls(rectangleControls({width:'length',originX:.5}),rectangleControls({width:'coneWidth',originX:.5,baseline:p=>-Number(p.coneDepth)}),axisControl('coneDepth','h',0,'Light cone bottom',{direction:-1})),
 bounds:p=>({x:-Math.max(Number(p.length),Number(p.coneWidth))/2,h:2,w:Math.max(Number(p.length),Number(p.coneWidth)),tall:Number(p.coneDepth)+2}),
 anchors:()=>({origin:{x:0,h:0,role:'origin'}}),
 draw(x,v,p,_s,_pass,at){const lx=v.sx(at.x),bottom=at.h-Number(p.coneDepth),dying=p.flicker&&(v.t%200>180||(v.t%200>150&&Math.floor(v.t)%6<3)),half=Number(p.length)/2,cone=Number(p.coneWidth)/2;
  const g=x.createLinearGradient(0,v.y(at.h-2),0,v.y(bottom));g.addColorStop(0,'rgba(255,230,190,'+(dying?.04:.12)+')');g.addColorStop(1,'rgba(255,230,190,0)');
  x.fillStyle=g;x.beginPath();x.moveTo(lx-half,v.y(at.h-2));x.lineTo(lx-cone,v.y(bottom));x.lineTo(lx+cone,v.y(bottom));x.lineTo(lx+half,v.y(at.h-2));x.closePath();x.fill();
  box(x,lx-half,v.y(at.h),Number(p.length),3,dying?'rgba(255,230,190,.25)':'rgba(255,240,215,.9)');}};
