/** Shared emergency-brake artwork; behavior belongs to the device/mover, never painting. */
import type {View} from '../core/view';
import {box,O,PAPER,RED,tell,text} from '../core/primitives';
export function drawEmergencyBrake(x:CanvasRenderingContext2D,v:View,wx:number,pulled:boolean,highlight=false){
 const bk=v.sx(wx),{y,t}=v;
      box(x, bk - 12, y(60), 24, 8, '#1a120b', 'rgba(' + O + ',.5)');
      text(x, 'EMERGENCY', bk, y(56), 'rgba(' + PAPER + ',.75)', 5, '600');
      box(x, bk - 8, y(52), 16, 22, '#1a0a0a', 'rgba(' + RED + ',.8)');
      x.fillStyle = 'rgba(' + RED + ',.95)'; x.fillRect(bk - 4, y(pulled ? 37 : 46), 8, 3);
      box(x, bk - 6, y(28), 12, 6, '#0d1416', 'rgba(' + O + ',.5)');
      x.fillStyle = pulled ? 'rgba(34,197,94,.9)' : 'rgba(' + O + ',.6)'; x.fillRect(bk - 4, y(26), 2, 2);
      tell(x, t, bk + 4, y(34), 2);
      if (highlight) { x.save(); x.strokeStyle = 'rgba(255,61,242,.85)'; x.shadowColor = 'rgba(255,61,242,.8)'; x.shadowBlur = 8; x.strokeRect(bk - 15.5, y(62) - 3.5, 31, 47); x.restore(); }

}
