/** Station artwork, parameterized by its layout. */
import type { View } from '../core/view';
import type { RiderKind } from '../characters/riders';
import { light } from '../../world/light';
import { seaCols, sunPath } from '../environment/sky';
import { box, drawTowers, O, onScreen, RED, rng, towers } from '../core/primitives';
import { DECK, exitPlate } from './station-platform';
export type StationLayout = { width: number; spawn: number; exit: number; boardAt: number; horizon: number; wall: number; canopy: { under: number; fascia: number; }; posts: number[]; lamps: number[]; cranes: [number, number, number][]; board: number; benches: { x: number; who?: RiderKind; }[]; tide: number; screen: number; cam: number; checkpoint: number; waiting: number[]; };

const H_SKY = towers(141, 1800, [14, 34], [16, 60], 0.07);

const H_RIPPLES = (() => { const r = rng(143); return Array.from({ length: 60 }, () => [r() * 2000, r(), 4 + r() * 12]); })();
export function createStationArtwork(H:StationLayout){
function drawHorizon(x:CanvasRenderingContext2D,v:View){
  const { y } = v, hz = y(H.horizon);
  const glow = x.createLinearGradient(0, y(H.horizon + 70), 0, hz);
  glow.addColorStop(0, 'rgba(194,65,12,0)'); glow.addColorStop(1, 'rgba(194,65,12,.12)');
  x.fillStyle = glow; x.fillRect(0, y(H.horizon + 70), v.viewW, 70);
  drawTowers(x, v, H_SKY, 0.1, hz, 0.1, '#030100', 1);
  }
function drawCrane(x:CanvasRenderingContext2D,v:View,cx:number,ch:number,ph:number) { const {y,t}=v,hz=y(H.horizon);
    const s = v.sx(cx, 0.25);
    if (!onScreen(v, s - 90, 180)) return;
    x.strokeStyle = 'rgba(' + O + ',.22)'; x.lineWidth = 2; x.beginPath();
    x.moveTo(s - 30, hz); x.lineTo(s - 30, hz - ch * 0.7); x.moveTo(s + 20, hz); x.lineTo(s + 20, hz - ch * 0.7);
    x.moveTo(s - 80, hz - ch * 0.62); x.lineTo(s + 60, hz - ch * 0.62); x.moveTo(s - 30, hz - ch * 0.7); x.lineTo(s - 6, hz - ch); x.lineTo(s + 20, hz - ch * 0.7);
    x.stroke(); x.lineWidth = 1;
    x.fillStyle = 'rgba(' + RED + ',' + (Math.sin(t * 0.04 + ph) > 0 ? 0.7 : 0.15) + ')'; x.fillRect(s - 7, hz - ch - 3, 3, 3);
   }
function drawWater(x:CanvasRenderingContext2D,v:View){const {y,t}=v,hz=y(H.horizon);
  const lt = light(), [c0, c1, c2] = seaCols(lt), wg = x.createLinearGradient(0, hz, 0, y(H.wall));
  wg.addColorStop(0, c0); wg.addColorStop(0.4, c1); wg.addColorStop(1, c2);
  x.fillStyle = wg; x.fillRect(0, hz, v.viewW, y(H.wall) - hz);
  sunPath(x, v, lt, hz, y(H.wall));
  x.fillStyle = 'rgba(' + O + ',.12)'; x.fillRect(0, hz, v.viewW, 1);
  const span = v.viewW + 40;
  for (const [rx, d, len] of H_RIPPLES) {
    const p = 0.12 + 0.3 * d, px = (((rx - v.cam * p + t * 0.08) % span) + span) % span - 20;
    x.fillStyle = 'rgba(170,210,255,' + (0.04 + 0.06 * d) + ')';
    x.fillRect(Math.round(px), Math.round(hz + 3 + d * (y(H.wall) - hz - 6)), Math.round(len), 1);
  }
  // middle band: the sea wall behind the track and a railing on it
  box(x, 0, y(H.wall), v.viewW, H.wall - DECK, '#0d0907');
  x.fillStyle = 'rgba(' + O + ',.4)'; x.fillRect(0, y(H.wall), v.viewW, 1);
  x.fillStyle = 'rgba(' + O + ',.3)'; x.fillRect(0, y(H.wall + 16), v.viewW, 1);
  for (let wx = -40; wx < 2600; wx += 22) { const s = v.sx(wx, 0.9); if (s >= -1 && s <= v.viewW) x.fillRect(s, y(H.wall + 16), 1, 16); }
}
function drawCanopyShell(x:CanvasRenderingContext2D,v:View){
  const { y, sx } = v, Cn = H.canopy;
  // the roof: corrugated, its edge rusty, lamps under it
  const a = Math.max(0, sx(-60)), b = Math.min(v.viewW, sx(H.width + 60));
  if (b > a) {
    box(x, a, y(Cn.fascia), b - a, Cn.fascia - Cn.under, '#140d09', 'rgba(' + O + ',.55)');
    x.fillStyle = 'rgba(' + O + ',.18)'; for (let wx = -60; wx < H.width + 60; wx += 6) { const s = sx(wx); if (s >= a && s <= b) x.fillRect(s, y(Cn.fascia) + 2, 1, Cn.fascia - Cn.under - 4); }
    x.fillStyle = 'rgba(' + O + ',.3)'; x.fillRect(a, y(Cn.fascia + 4), b - a, 4);
  }
  }
function drawCanopyLamp(x:CanvasRenderingContext2D,v:View,wx:number) { const {sx,y}=v,Cn=H.canopy;
    const s = sx(wx);
    if (!onScreen(v, s - 40, 80)) return;
    const g = x.createLinearGradient(0, y(Cn.under), 0, v.gy);
    g.addColorStop(0, 'rgba(255,230,190,.07)'); g.addColorStop(1, 'rgba(255,230,190,0)');
    x.fillStyle = g;
    x.beginPath(); x.moveTo(s - 10, y(Cn.under - 3)); x.lineTo(s + 10, y(Cn.under - 3)); x.lineTo(s + 34, v.gy); x.lineTo(s - 34, v.gy); x.closePath(); x.fill();
    box(x, s - 8, y(Cn.under), 16, 4, 'rgba(255,240,215,.85)');
   }
function drawCanopyPost(x:CanvasRenderingContext2D,v:View,p:number){const {sx,y}=v,Cn=H.canopy;
    const s = sx(p);
    if (!onScreen(v, s - 30, 60)) return;
    x.strokeStyle = 'rgba(' + O + ',.45)'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(s, y(Cn.under - 26)); x.lineTo(s - 26, y(Cn.under)); x.moveTo(s, y(Cn.under - 26)); x.lineTo(s + 26, y(Cn.under)); x.stroke(); x.lineWidth = 1;
    box(x, s - 5, y(Cn.under), 10, Cn.under, '#1c120c', 'rgba(' + O + ',.65)');
    x.fillStyle = 'rgba(' + O + ',.25)'; x.fillRect(s - 1, y(Cn.under), 2, Cn.under);
  }
function drawGate(x: CanvasRenderingContext2D, v: View, wx: number) {
  const { y } = v, s = v.sx(wx);
  if (!onScreen(v, s - 40, 120)) return;
  box(x, s - 28, y(72), 6, 72, '#1c120c', 'rgba(' + O + ',.7)');
  box(x, s + 20, y(72), 6, 72, '#1c120c', 'rgba(' + O + ',.7)');
  box(x, s - 28, y(78), 54, 6, '#1c120c', 'rgba(' + O + ',.7)');
  box(x, s - 12, y(26), 14, 26, '#16100c', 'rgba(' + O + ',.6)');
  x.fillStyle = 'rgba(' + O + ',.8)'; x.fillRect(s + 2, y(22), 16, 2); x.fillRect(s - 4, y(30), 2, 10);
  x.fillStyle = 'rgba(34,197,94,.9)'; x.fillRect(s - 8, y(22), 3, 3);
  exitPlate(x, v, s, '< HARBOR · PIER');
}
return {drawHorizon,drawCrane,drawWater,drawCanopyShell,drawCanopyLamp,drawCanopyPost,drawGate};
}
