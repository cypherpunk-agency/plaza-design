/** Independent car fittings. Layout and simulation are caller-supplied scalar inputs. */
import type {View} from '../core/view';
import {box,O,PAPER,RED,tell,text,onScreen} from '../core/primitives';
import {SEAT_H} from '../characters/riders';
import {paperSign,scroll} from '../signage/kit';
import {sloganScreen} from '../signage/screens';
export function drawCabCamera(x:CanvasRenderingContext2D,v:View,wx:number,ceiling:number){
  const { y, t } = v, s = v.sx(wx);
  if (!onScreen(v, s - 10, 20)) return;
  box(x, s - 7, y(ceiling - 1), 14, 5, '#100c0a', 'rgba(' + O + ',.6)');
  x.fillStyle = '#16100c'; x.beginPath(); x.arc(s, y(ceiling - 6), 5, 0, Math.PI); x.fill();
  x.fillStyle = Math.floor((t + wx) / 30) % 2 ? 'rgba(' + RED + ',.95)' : 'rgba(' + RED + ',.3)'; x.fillRect(s - 1, y(ceiling - 8), 2, 2);
}

export function drawCabPole(x:CanvasRenderingContext2D,v:View,wx:number,ceiling:number){
  const s = v.sx(wx);
  if (s < -4 || s > v.viewW + 4) return;
  box(x, s - 1, v.y(ceiling), 3, ceiling, 'rgba(255,190,110,.55)');
  x.fillStyle = 'rgba(255,240,215,.7)'; x.fillRect(s - 1, v.y(ceiling), 1, ceiling);
}

export function drawCabWindow(x:CanvasRenderingContext2D,v:View,wx:number,width:number,h0:number,h1:number){const s=v.sx(wx),y=v.y;if(!onScreen(v,s,width))return;      x.strokeStyle = 'rgba(' + O + ',.75)'; x.lineWidth = 3; x.strokeRect(s + 1.5, y(h1) + 1.5, width - 3, h1 - h0 - 3); x.lineWidth = 1;

}

export function drawCabStaffDoor(x:CanvasRenderingContext2D,v:View,wx:number){const {y,t}=v,ed=v.sx(wx);
    if (onScreen(v, ed - 16, 32)) {
      box(x, ed - 14, y(56), 28, 56, '#020100', 'rgba(' + O + ',.6)');
      box(x, ed - 11, y(52), 22, 52, '#0a0603', 'rgba(' + O + ',.35)');
      box(x, ed - 12, y(70), 24, 10, '#1a120b', 'rgba(' + O + ',.5)');
      text(x, 'STAFF', ed, y(65), 'rgba(' + PAPER + ',.7)', 7, '600');
      x.fillStyle = 'rgba(' + RED + ',.9)'; x.fillRect(ed + 6, y(32), 3, 3);
      tell(x, t, ed + 10, y(66), 1);
    }

}

export function drawCabSeatBack(x:CanvasRenderingContext2D,v:View,wx:number,width:number){const s=v.sx(wx),y=v.y;if(!onScreen(v,s-4,width+8))return;      box(x, s - 2, y(46), width + 4, 34, '#14262a', 'rgba(' + O + ',.6)');
      box(x, s + 4, y(SEAT_H - 3), width - 8, SEAT_H - 3, '#0a0706');

}

export function drawCabSeatFront(x:CanvasRenderingContext2D,v:View,wx:number,width:number){const s=v.sx(wx);if(onScreen(v,s-4,width+8))box(x,s-4,v.y(SEAT_H+1),width+8,4,'#1c3237','rgba('+O+',.8)');
}

export function drawCabCeilingLight(x:CanvasRenderingContext2D,v:View,wx:number,width:number,ceiling:number){
 const {y}=v,w0=v.sx(wx),w1=v.sx(wx+width);
 box(x,w0,y(ceiling-2),w1-w0,3,'rgba(255,240,215,.75)');
 const g=x.createLinearGradient(0,y(ceiling),0,y(ceiling-40));
 g.addColorStop(0,'rgba(255,240,215,.08)');g.addColorStop(1,'rgba(255,240,215,0)');
 x.fillStyle=g;x.fillRect(w0,y(ceiling),w1-w0,40);
}
export function drawCabAdvert(x:CanvasRenderingContext2D,v:View,wx:number,card:string,homeCard:string,index:number,home:boolean,news:string){
 const {y,t}=v,s=v.sx(wx);if(!onScreen(v,s-72,144))return;
 box(x,s-70,y(156),140,16,'#1a120b','rgba('+O+',.5)');
 if(home&&index===1){text(x,'NEWS',s-56,y(148),'rgba('+PAPER+',.9)',7,'600');scroll(x,t,news+'   ·   ',s-44,y(148),108,{col:'255,200,170',alpha:.85,speed:.4});}
 else text(x,home?homeCard:card,s-2,y(148),'rgba('+PAPER+',.75)',7,'600');
}
export function drawCabAdTell(x:CanvasRenderingContext2D,v:View,wx:number){tell(x,v.t,v.sx(wx)+65,v.y(148));}
export function drawCabCarPlate(x:CanvasRenderingContext2D,v:View,wx:number,label:string,width=66,height=12){
 const gw=v.sx(wx);if(!onScreen(v,gw,80))return;
 paperSign(x,v.t,gw+35,v.y(74),width,height,{lines:[label],edge:'rgba('+O+',.5)',ink:'rgba('+PAPER+',.8)',tell:3,tellAt:[29,10]});
}
export function drawCabRegistry(x:CanvasRenderingContext2D,v:View,wx:number,pages:string[][]){
 if(!onScreen(v,v.sx(wx),80))return;
 sloganScreen(x,v,{x:wx+35,h:96,w:58,tall:26,ads:pages,cols:['255,200,170'],scan:false});
}
export function drawCabHandrail(x:CanvasRenderingContext2D,v:View,wx:number,width:number,height:number){
 x.fillStyle='rgba(255,190,110,.6)';x.fillRect(v.sx(wx),v.y(height),v.sx(wx+width)-v.sx(wx),2);
}
export function drawCabStrap(x:CanvasRenderingContext2D,v:View,wx:number,height:number,running:boolean,run:number){
 const {y,t}=v,s=v.sx(wx),swing=running?2+2*Math.sin(Math.PI*run):1;if(s< -6||s>v.viewW+6)return;
 const sw=Math.round(Math.sin(t*.05+wx*.02)*swing);
 x.strokeStyle='rgba(255,190,110,.4)';x.beginPath();x.moveTo(s+.5,y(height-2));x.lineTo(s+.5+sw,y(height-12));x.stroke();
 x.strokeRect(s-2.5+sw,y(height-12)+.5,6,5);
}
