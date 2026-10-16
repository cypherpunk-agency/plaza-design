import type { Anchor, Bounds, Properties } from '../core/composition';
export interface CinematicGeometry { bounds: Bounds; anchors: Record<string, Anchor> }
const n=(p:Properties,key:string,fallback:number)=>typeof p[key]==='number'?p[key] as number:fallback;
const box=(x:number,y:number,w:number,tall:number,anchors:Record<string,Anchor>={}):CinematicGeometry=>({bounds:{x,h:-y,w,tall},anchors:{origin:{x,h:-(y+tall),role:'origin'},...anchors}});
/** Native geometry, including decorative glows/reflections; text uses conservative monospace extents. */
export function cinematicGeometry(sequence:string,part:string,props:Properties,state:Properties):CinematicGeometry{
  const W=n(state,'width',640),H=n(state,'height',360),time=n(state,'time',0),size=Math.max(10,Math.min(18,Math.round(H/26))),top=Math.round(Math.max(16,H*.09)),bottom=H-Math.round(Math.max(size*3.6,H*.16));
  const hz=Math.round(top+(bottom-top)*(sequence==='intro'?.68:.62));
  if(part==='screen-fade'||part==='fade')return n(state,'amount',0)>0?box(0,0,W,H):box(0,0,0,0);
  if(sequence==='taxi'){
    if(part==='cab'){const x=Math.round(n(state,'x',W/2)),y=Math.round(n(state,'y',H*.45+Math.sin(n(state,'ambient',time*60)*.08)*3));return box(x-32,y-32,64,68,{roof:{x,h:32-y,role:'mount'},cabin:{x,h:16-y,role:'mount'}});}
    if(part==='destination'){const message='SKY TAXI  >>  '+String(props.destination||'DOWNTOWN'),width=message.length*9*.65;return box(W/2-width/2,H*.45+23,width,14,{label:{x:W/2,h:-(H*.45+30),role:'origin'}});}
    if(part==='towers')return box(-W*.3,H*.55,W*1.6,H*.45);
    if(part==='lights')return box(-10,H*.35,W+20,H*.6+2);
    return box(0,0,W,H);
  }
  if(sequence==='act2'){
    if(part==='sky')return box(0,top,W,hz-top);
    if(part==='city')return box(0,hz-(bottom-top)*.16,W*.7,(bottom-top)*.16);
    if(part==='water')return box(0,hz,W,bottom-hz,{waterline:{x:W/2,h:-hz,role:'surface'}});
    if(part==='spire'){const scale=((hz-top)/92*81)/302,x=Math.round(W*.74);return box(x-44*scale,hz-344*scale,88*scale,344*scale,{foot:{x,h:-hz,role:'surface'},antenna:{x,h:302*scale-hz,role:'mount'}});}
    if(part==='ferry'){const progress=n(state,'amount',Math.min(1,(state.reduced?6:time)/16)),x=Math.round(W*(.2+.36*progress)),y=Math.round(hz+(bottom-hz)*.28),length=Math.max(26,Math.round(W*.07));return box(x-length,y-13,length*2,36,{deck:{x,h:5-y,role:'surface'},bow:{x:x+length,h:5-y,role:'mount'}});}
    if(part==='titles'){const one=n(state,'one',0),two=n(state,'two',0);if(one<=0&&two<=0)return box(0,0,0,0);const small=Math.max(9,Math.round(H/34)),big=Math.max(26,Math.round(H/8)),ty=top+(hz-top)*.32,width=two>0?Math.max(String(props.actTwo??'ACT II').length*big*.65,String(props.subtitle??'SEVEN FRAGMENTS').length*small*.65)+28:Math.max(String(props.actOne??'ACT I · WHERE IS MOTH?').length,String(props.found??'FOUND.').length)*small*.65;return box(W/2-width/2,ty-(two>0?big/2+14:small/2),width,two>0?big*1.4+28:small*2.7,{title:{x:W/2,h:-ty,role:'origin'}});}
  }
  if(sequence==='intro'){
    if(part==='fill')return box(0,0,W,H);
    if(part==='floor')return box(0,hz,W,H-hz,{waterline:{x:W/2,h:-hz,role:'surface'}});
    if(part==='horizon')return box(0,hz-14,W,28,{horizon:{x:W/2,h:-hz,role:'origin'}});
    if(part==='sun'){const radius=(hz-top)*.34,x=Math.round(W*.6-n(state,'cameraX',0)*.08);return box(x-radius*2.2,hz-radius*2.2,radius*4.4,radius*2.2,{sun:{x,h:-hz,role:'origin'}});}
    if(part==='rain')return n(state,'amount',0)>0?box(0,top,W,H-top):box(0,0,0,0);
    if(part==='sky')return box(0,top,W,hz-top);
    return box(0,top,W,hz-top);
  }
  return box(0,0,W,H);
}
