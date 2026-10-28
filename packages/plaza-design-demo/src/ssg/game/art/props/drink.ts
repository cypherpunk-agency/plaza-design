import {shapeLength} from '../core/fields';
import {rectangleControls} from '../core/spatial';
/** The drink formerly embedded in the beach mixer, as an ordinary placeable object. */
import type {AssetDefinition} from '../core/composition';
export const drinkElement:AssetDefinition={type:'props.drink',version:1,label:'Drink with garnish',category:'props',coordinates:'world',libraryUse:'reusable',parts:['backdrop'],
 spatial:rectangleControls({width:'width',height:'height',offsetX:-2}),
 fields:{width:shapeLength({kind:'number',label:'Glass width',default:5,min:2,max:100,step:1}),height:shapeLength({kind:'number',label:'Glass height',default:6,min:2,max:100,step:1})},
 visualFields:{present:{kind:'boolean',label:'Drink present',default:true},visible:{kind:'boolean',label:'Visible',default:true}},
 bounds:p=>({x:-2,h:Number(p.height)+1,w:Math.max(6,Number(p.width)),tall:Number(p.height)+1}),
 anchors:p=>({origin:{x:0,h:0,role:'origin'},rim:{x:Number(p.width)/2-2,h:Number(p.height),role:'surface'}}),
 draw(x,v,p,s,_pass,at){if(!s.present||!s.visible)return;const cx=v.sx(at.x),top=at.h+Number(p.height);
  x.fillStyle='rgba(255,170,90,.85)';x.fillRect(cx-2,v.y(top),Number(p.width),Number(p.height));
  x.fillStyle='#7ab83a';x.fillRect(cx+2,v.y(top+1),2,2);
 }};
