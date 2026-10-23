/** Wash timer: local body plus an explicitly optional endpoint on the same wall. No room/controller reads. */
import type {View} from '../core/view';
import {box,C,O,onScreen,PAPER,RUST,tell,text} from '../core/primitives';
export function drawWashSchedule(x:CanvasRenderingContext2D,v:View,wx:number,next:{ms:number}|null,hover:boolean,cableTo:number|null){
 const{sx,y,t}=v,s=sx(wx-17),top=y(88);
 if(!onScreen(v,s-20,74))return;
 box(x,s-6,y(104),46,12,'#1a120b','rgba('+O+',.7)');
 text(x,'06:00–02:00',s+17,y(98),'rgba('+PAPER+',.9)',7,'600');
 box(x,s,top,34,30,'#241a12','rgba('+PAPER+',.5)');
 box(x,s+3,top+3,28,15,'#041416','rgba('+C+',.6)');
 const secs=next?String(Math.ceil(next.ms/1000)).padStart(2,'0'):'--';
 text(x,next?'SLOT '+secs:'STOPPED',s+17,top+10.5,next&&next.ms<3000?'rgba(255,210,58,.95)':'rgba('+C+',.9)',7,'600');
 for(let k=0;k<3;k++){x.fillStyle='rgba('+PAPER+',.35)';x.fillRect(s+6+k*9,top+22,5,3);}
 tell(x,t,s+31,top+27,3);
 if(cableTo!==null){x.fillStyle='rgba('+RUST+',.6)';x.fillRect(s+33,y(60),1,2);x.fillRect(s+33,y(58),1,46);x.fillRect(s+33,y(12),sx(cableTo)-(s+33),1);}
 if(hover){x.save();x.strokeStyle='rgba(255,61,242,.85)';x.shadowColor='rgba(255,61,242,.8)';x.shadowBlur=8;x.strokeRect(s-3.5,top-3.5,41,37);x.restore();}
}
