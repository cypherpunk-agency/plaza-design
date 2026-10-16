import type {View} from '../core/view';
import {box,C,notice,O,onScreen,PAPER,RED,reflect,sign,tell,exitDoor} from '../core/primitives';
import {camera,taped} from '../signage/screens';
export {drawNoodleMenu,drawSaleScreen} from './neon-market';
export function drawMarketLaundry(x:CanvasRenderingContext2D,v:View,origin:number,width:number,door:number) {
  const { sx, y, t } = v, F = {x0:origin,x1:origin+width,door}, a = sx(F.x0), w = F.x1 - F.x0;
  if (!onScreen(v, a - 20, w + 40)) return;
  // the shop's wall, up past the stalls' awnings
  box(x, a, y(116), w, 116, '#130d0a', 'rgba(' + O + ',.6)');
  x.fillStyle = 'rgba(' + O + ',.12)'; for (let hy = 8; hy < 116; hy += 8) x.fillRect(a + 1, y(hy), w - 2, 1);
  // a long window high in the wall: cold white light, the washers' portholes, one turning
  const wx = a + 4, ww = w - 8, wt = y(96), wh = 16;
  box(x, wx, wt, ww, wh, 'rgba(210,230,245,.22)', 'rgba(' + O + ',.8)');
  for (let k = 0; k < 4; k++) {
    const px = wx + 10 + k * 19, py = wt + 9;
    x.fillStyle = 'rgba(200,200,210,.35)'; x.fillRect(px - 7, wt + 2, 14, wh - 2);
    x.strokeStyle = 'rgba(30,40,50,.9)'; x.beginPath(); x.arc(px, py, 4, 0, 7); x.stroke();
    if (k === 2) { const a2 = t * 0.25; x.fillStyle = 'rgba(70,96,154,.9)'; x.fillRect(Math.round(px + Math.cos(a2) * 2) - 1, Math.round(py + Math.sin(a2) * 2) - 1, 3, 3); }
  }
  // the door: glass, lit from inside, the cyan handle; the hours taped on it
  const dx = sx(F.door) - 13;
  box(x, dx - 2, y(56), 30, 56, '#020100', 'rgba(' + O + ',.75)');
  box(x, dx, y(52), 26, 52, 'rgba(200,225,240,.18)', 'rgba(' + PAPER + ',.35)');
  x.fillStyle = 'rgba(' + C + ',.85)'; x.fillRect(dx + 4, y(28), 2, 7);
  tell(x, t, dx + 22, y(30), 6);
  taped(x, v, { x: F.door, h: 36, text: ['06–02'], tilt: 0.05 });
  // the light it throws on the wet street
  reflect(x, v, sx(F.door), '210,230,245', 1.2, 30);
  // its name on a plate over the window, a camera over the door
  sign(x, t, 'LAUNDRY', sx(F.x0 + w / 2), y(106), C, { size: 8, phase: 70 });
  camera(x, v, { x: F.door - 2, h: 64, facing: -1, phase: 12 });
}
export function drawMarketBulbs(x:CanvasRenderingContext2D,v:View,origin:number,width:number){const {sx,y,t}=v,a=sx(origin,.85),b=sx(origin+width,.85);if(b<0||a>v.viewW)return;
x.strokeStyle='rgba(40,24,14,1)';x.beginPath();x.moveTo(a,y(150));x.quadraticCurveTo((a+b)/2,y(112),b,y(150));x.stroke();
for(let k=1;k<11;k++){const f=k/11,bx=a+(b-a)*f,by=(1-f)*(1-f)*y(150)+2*f*(1-f)*y(112)+f*f*y(150);x.fillStyle=(k+Math.floor(t/50))%7===0?'rgba(255,217,165,.2)':k%2?'rgba(255,190,110,.7)':'rgba(255,136,0,.6)';x.fillRect(Math.round(bx)-1,Math.round(by)+1,2,3);}}
export function drawMarketRules(x:CanvasRenderingContext2D,v:View,origin:number){const nb=v.sx(origin);if(onScreen(v,nb-40,80))notice(x,v.t,nb,v.y(78),44,30,['MARKET','RULES']);}
export function drawMarketEndWall(x:CanvasRenderingContext2D,v:View,origin:number,width:number,door:number,open:boolean){const ew=v.sx(origin),{y,t}=v;if(onScreen(v,ew,width)){box(x,ew,y(130),width,130,'#140a06','rgba('+O+',.6)');for(let r=6;r<130;r+=8){x.fillStyle='rgba(0,0,0,.35)';x.fillRect(ew+1,y(130)+r,width-2,1);}if(open)exitDoor(x,v,door,'#0a0603','DOWNTOWN >');else sign(x,t,'NO EXIT',ew+50,y(70),RED,{size:8,phase:200});}}
