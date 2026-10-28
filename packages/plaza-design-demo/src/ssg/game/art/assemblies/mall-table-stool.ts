import {fixedGeometry} from '../core/spatial';
import {appearanceColor} from '../core/fields';
/** The two seats beside a Galleria table are independent composition children. */
import type {AssetDefinition} from '../core/composition';
import {box,onScreen} from '../core/primitives';
const fixedNativeGeometry=fixedGeometry("This mall table stool component has no independently authored size. Its native kernel and prepared source layout determine its geometry. Edit the source layout or Transform rather than stretching its body.");
export const mallTableStool:AssetDefinition={spatial:fixedNativeGeometry,type:'mall.table-stool',version:1,label:'Food court stool',category:'Mall',coordinates:'world',
 fields:{legPaint:appearanceColor({kind:'color',label:'Leg paint',default:'#2a1a10'}),seatPaint:appearanceColor({kind:'color',label:'Seat paint',default:'#8a2a1a'})},parts:['backdrop'],
 bounds:()=>({x:-7,h:11,w:14,tall:11}),anchors:()=>({origin:{x:0,h:0,role:'origin'},seat:{x:0,h:11,role:'surface'}}),
 draw(x,v,p,_s,_pass,at){const s=v.sx(at.x);if(!onScreen(v,s-8,16))return;x.fillStyle=String(p.legPaint);x.fillRect(s-1,v.y(at.h+9),2,9);box(x,s-7,v.y(at.h+11),14,3,String(p.seatPaint),'rgba(255,170,90,.5)');}
};
