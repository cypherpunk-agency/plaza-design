import { placed, type View } from '../core/view';
import { drawCar, SIZE } from '../vehicles/vehicles';
import type { Properties } from '../core/composition';
import {box,drawTowers,O,PAPER,RED,text,towers} from '../core/primitives';
import { paperSign } from '../signage/kit';
import {YELLOW} from '../signage/screens';
const FAR=towers(77,1200,[14,36],[20,60],.06);
export function drawWarehousePiece(part:string,x:CanvasRenderingContext2D,v:View,props:Properties){
 const {sx,y,t,gy}=v;void sx;void y;void t;void gy;void props;
 switch(part){case 'city':{drawTowers(x, v, FAR, 0.15, y(40), 0.1, '#030100', 1);
break;}
case 'crane':{const cb = sx(0);
x.strokeStyle = 'rgba(' + O + ',.18)';
x.beginPath();
x.moveTo(cb, y(170));
x.lineTo(cb + 360, y(170));
x.moveTo(cb + 120, y(170));
x.lineTo(cb + 150, y(220));
x.lineTo(cb + 180, y(170));
x.stroke();
break;}
case 'spire':{const sp = sx(0);
x.fillStyle = '#040203';
x.fillRect(sp - 10, y(260), 22, 220);
x.fillStyle = Math.sin(t * 0.05) > 0.2 ? 'rgba(' + RED + ',.8)' : 'rgba(' + RED + ',.2)';
x.fillRect(sp - 1, y(266), 3, 3);
break;}
case 'stack':{const s=sx(0);box(x,s,y(Number(props.height)),64,Number(props.height),'#0c0806','rgba('+O+',.15)');
break;}
case 'wall':{const L={wall:{x0:0,x1:Number(props.width),h:Number(props.height)}};
const W = L.wall, w0 = sx(W.x0), w1 = sx(W.x1);
x.fillStyle = '#100907';
x.fillRect(w0, y(W.h), w1 - w0, W.h);
x.fillStyle = 'rgba(' + O + ',.06)';
for (let i = w0 + 4; i < w1; i += 6) x.fillRect(i, y(W.h), 1, W.h);
x.strokeStyle = 'rgba(' + O + ',.4)';
x.strokeRect(w0 + 0.5, y(W.h) + 0.5, w1 - w0, W.h);
x.fillStyle = '#0c0705';
x.beginPath();
x.moveTo(w0, y(W.h));
x.lineTo((w0 + w1) / 2, y(W.h + 50));
x.lineTo(w1, y(W.h));
x.closePath();
x.fill();
x.strokeStyle = 'rgba(' + O + ',.3)';
x.stroke();
break;}
case 'office':{box(x, sx(0), y(0), 30, 22, 'rgba(255,200,130,.2)', 'rgba(' + O + ',.5)');
x.fillStyle = 'rgba(255,200,130,.5)';
x.fillRect(sx(4), y(-14), 4, 6);
break;}
case 'dark-window':{box(x,sx(0),y(0),30,22,'#060403','rgba('+O+',.35)');
break;}
case 'passage':{const L={back:0};
const bl = sx(L.back);
box(x, bl - 24, y(64), 48, 64, '#0a0603', 'rgba(' + O + ',.55)');
text(x, '< STACKS', bl, y(70), 'rgba(' + PAPER + ',.7)', 7, '600');
break;}
case 'dock':{const L={dock:{x0:0,x1:Number(props.width),h:Number(props.height)}};
const D = L.dock, d0 = sx(D.x0), d1 = sx(D.x1);
box(x, d0, y(D.h), d1 - d0, D.h, '#1a120b', 'rgba(' + O + ',.8)');
for (let i = d0; i < d1; i += 10) { x.fillStyle = 'rgba(' + YELLOW + ',.45)'; x.fillRect(i, y(D.h) + 1, 5, 2); }
break;}
case 'roller':{const D={h:0};const rx=Number(props.number)===1?200:316;
const r = sx(0);
box(x, r, y(D.h + 92), 100, 92, '#1e1a16', 'rgba(220,200,160,.5)');
x.fillStyle = 'rgba(0,0,0,.3)';
for (let k = 4; k < 92; k += 5) x.fillRect(r + 1, y(D.h + 92) + k, 98, 1);
x.save();
x.translate(r + 50, y(D.h + 46));
x.rotate(-0.25);
for (let k = -60; k < 60; k += 12) { x.fillStyle = (k / 12) % 2 ? 'rgba(' + RED + ',.75)' : 'rgba(240,230,215,.75)'; x.fillRect(k, -3, 12, 6); }
x.restore();
text(x, rx === 200 ? 'DOCK 1' : 'DOCK 2', r + 50, y(D.h + 100), 'rgba(' + PAPER + ',.55)', 7, '600');
break;}
case 'door':{const L={door:0};
const dr = sx(L.door);
box(x, dr - 14, y(54), 28, 54, '#16110e', 'rgba(220,200,160,.6)');
x.fillStyle = 'rgba(220,200,160,.4)';
x.fillRect(dr + 8, y(28), 3, 4);
box(x, dr + 18, y(40), 10, 14, '#120606', 'rgba(' + RED + ',.7)');
x.fillStyle = Math.floor(t / 40) % 2 ? 'rgba(' + RED + ',.95)' : 'rgba(' + RED + ',.35)';
x.fillRect(dr + 20, y(37), 6, 2);
x.fillStyle = 'rgba(' + RED + ',.9)';
x.fillRect(dr - 3, y(62), 6, 3);
const g = x.createRadialGradient(dr, y(61), 1, dr, y(61), 30);
g.addColorStop(0, 'rgba(' + RED + ',.16)');
g.addColorStop(1, 'rgba(' + RED + ',0)');
x.fillStyle = g;
x.fillRect(dr - 30, y(90), 60, 60);
break;}
case 'plaque':{const L={plaque:0};
const pl = sx(L.plaque);
paperSign(x, v.t, pl, y(72), 52, 30, { style: 'paper', lineH: 8, first: 8, lines: [{ text: 'EVIDENCE', ink: 'rgba(110,20,20,.95)' }, { text: 'CUSTODY', ink: 'rgba(110,20,20,.95)' }, 'REGISTRY'] });
break;}
case 'notice':{const L={board:0};
const nb = sx(L.board);
box(x, nb - 1, y(36), 3, 36, '#2a2622');
paperSign(x, v.t, nb, y(92), 100, 56, { style: 'paper', fill: '#d8d0bc', header: 'REGISTRY NOTICE', first: 9, ink: 'rgba(30,18,8,.9)', weight: '600', lines: ['SEIZED PROPERTY', 'HELD PENDING REVIEW', 'BACKLOG: 4 YEARS', 'CLAIMS NOT ACCEPTED'] });
break;}
case 'van':{const L={van:{x:0,w:Number(props.width)}};
// the kit's van (vehicles.ts) scaled to the piece's width, in the Registry's livery
placed(x, sx(L.van.x), y(0), L.van.w / SIZE.van, () => drawCar(x, { t: v.t, kind: 'van', paint: '#c8c4b8', face: 1, livery: { stripe: '#c8203a', decal: ['REGISTRY', 'EVIDENCE TRANSPORT'], number: 'RX 114', qr: true } }));
break;}
case 'shoe':{const L={shoe:0};
const sh = sx(L.shoe);
box(x, sh - 6, y(5), 12, 5, '#3a2a1e', 'rgba(255,217,165,.4)');
box(x, sh - 6, y(9), 5, 4, '#3a2a1e');
x.strokeStyle = 'rgba(240,230,215,.6)';
x.beginPath();
x.moveTo(sh + 6, y(4));
x.lineTo(sh + 12, y(8));
x.stroke();
box(x, sh + 11, y(12), 8, 5, '#e8dcc0');
break;}
case 'floor':{x.fillStyle = '#0c0805';
x.fillRect(0, gy, v.viewW, v.viewH - gy);
x.fillStyle = 'rgba(' + O + ',.5)';
x.fillRect(0, gy, v.viewW, 1);
x.fillStyle = 'rgba(' + YELLOW + ',.2)';
for (let i = sx(Number(props.from)); i < sx(Number(props.to)); i += 14) x.fillRect(i, gy + 6, 8, 1);
break;}
 default:throw new Error('Unknown warehouse piece '+part);}
}
