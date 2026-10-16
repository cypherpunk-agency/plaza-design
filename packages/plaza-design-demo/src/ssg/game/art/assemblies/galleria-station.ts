/** Station artwork, parameterized by its layout. */
import type { View } from '../core/view';
import type { RiderKind } from '../characters/riders';
import { box, C, O, onScreen, PAPER, RED, rng, tell, text } from '../core/primitives';
import { DECK, exitPlate } from './station-platform';
const WALL = 0.9;
export type StationLayout = { width: number; spawn: number; exit: number; boardAt: number; beam: { under: number; top: number; }; frieze: { h0: number; h1: number; step: number; }; posters: { x: number; lines: string[]; red?: boolean; }[]; columns: number[]; lamps: number[]; board: number; benches: { x: number; who?: RiderKind; }[]; snacks: number; lineMap: number; screen: number; cams: number[]; waiting: number[]; };

export function createStationArtwork(G:StationLayout){
function drawTiledWall(x:CanvasRenderingContext2D,v:View){
  const { y, sx } = v, top = y(G.beam.top);
  // the tiled far wall across the track, up to the beam
  x.fillStyle = '#0c0907'; x.fillRect(0, Math.max(0, top), v.viewW, y(DECK) - Math.max(0, top));
  x.fillStyle = 'rgba(' + PAPER + ',.035)';
  for (let h = DECK + 8; h < G.beam.top; h += 8) x.fillRect(0, y(h), v.viewW, 1);
  for (let wx = -40; wx < 2600; wx += 16) { const s = sx(wx, WALL); if (s >= 0 && s <= v.viewW) x.fillRect(s, Math.max(0, top), 1, y(DECK) - Math.max(0, top)); }
  // posters between the trains, each in its frame with a strip light over it
  }
function drawPoster(x:CanvasRenderingContext2D,v:View,p: {x:number;lines:string[];red?:boolean}) { const {sx,y}=v;
    const s = sx(p.x, WALL);
    if (!onScreen(v, s - 50, 100)) return;
    box(x, s - 46, y(92), 92, 58, '#1a120b', 'rgba(' + O + ',.5)');
    box(x, s - 42, y(88), 84, 50, '#120c09');
    box(x, s - 40, y(96), 80, 2, 'rgba(255,240,215,.5)');
    p.lines.forEach((l, i) => text(x, l, s, y(72 - i * 14), i || !p.red ? 'rgba(' + PAPER + ',' + (i ? 0.5 : 0.65) + ')' : 'rgba(' + RED + ',.8)', 7, i ? '' : '600'));
   }
function drawFrieze(x:CanvasRenderingContext2D,v:View){const {y}=v;
  // the frieze: a band of darker tile along the wall, the station's name on it again and again
  x.fillStyle = '#140d09'; x.fillRect(0, y(G.frieze.h1), v.viewW, G.frieze.h1 - G.frieze.h0);
  x.fillStyle = 'rgba(' + O + ',.4)'; x.fillRect(0, y(G.frieze.h1), v.viewW, 1); x.fillRect(0, y(G.frieze.h0), v.viewW, 1);
}
function drawCeiling(x:CanvasRenderingContext2D,v:View){
  const { y, sx } = v, B = G.beam;
  if (y(B.top) > 0) {
    x.fillStyle = '#060403'; x.fillRect(0, 0, v.viewW, y(B.top));
    x.fillStyle = 'rgba(' + O + ',.12)';
    for (let h = B.top + 40; y(h) > -2; h += 56) x.fillRect(0, y(h), v.viewW, 2);
    // cable trays and a vent grille, far and dim
    for (let wx = 80; wx < 2600; wx += 320) {
      const s = sx(wx, 0.8);
      if (!onScreen(v, s - 10, 120)) continue;
      x.fillStyle = 'rgba(' + O + ',.1)'; x.fillRect(s, y(B.top + 24), 110, 3);
      box(x, s + 20, y(B.top + 88), 40, 22, '#0a0705', 'rgba(' + O + ',.15)');
      for (let k = 3; k < 20; k += 4) { x.fillStyle = 'rgba(' + O + ',.08)'; x.fillRect(s + 22, y(B.top + 88) + k, 36, 1); }
    }
    // the mall's floor over it all: a faint warm glow through the joints
    if (y(B.top + 260) > 0) { x.fillStyle = 'rgba(255,190,110,.05)'; x.fillRect(0, y(B.top + 262), v.viewW, 2); }
  }
  box(x, 0, y(B.top), v.viewW, B.top - B.under, '#120d0a');
  x.fillStyle = 'rgba(' + O + ',.55)'; x.fillRect(0, y(B.under) - 1, v.viewW, 1);
  x.fillStyle = 'rgba(' + O + ',.35)'; x.fillRect(0, y(B.top - 5), v.viewW, 2);
  }
function drawStripLamp(x:CanvasRenderingContext2D,v:View,wx:number,flicker:boolean) { const {sx,y,t}=v,B=G.beam;
    const s = sx(wx);
    if (!onScreen(v, s - 40, 80)) return;
    const g = x.createLinearGradient(0, y(B.under), 0, v.gy);
    g.addColorStop(0, 'rgba(255,230,190,.07)'); g.addColorStop(1, 'rgba(255,230,190,0)');
    x.fillStyle = g;
    x.beginPath(); x.moveTo(s - 14, y(B.under - 3)); x.lineTo(s + 14, y(B.under - 3)); x.lineTo(s + 40, v.gy); x.lineTo(s - 40, v.gy); x.closePath(); x.fill();
    box(x, s - 16, y(B.under), 32, 3, 'rgba(255,240,215,' + (flicker && Math.floor(t) % 97 < 4 ? 0.3 : 0.85) + ')');
   }
function drawColumn(x: CanvasRenderingContext2D, v: View, wx: number) {
  const { y } = v, s = v.sx(wx), B = G.beam;
  if (!onScreen(v, s - 14, 28)) return;
  box(x, s - 12, y(B.under), 24, B.under, '#1a1410', 'rgba(' + O + ',.6)');
  x.fillStyle = 'rgba(' + PAPER + ',.06)'; for (let h = 12; h < B.under; h += 12) x.fillRect(s - 11, y(h), 22, 1);
  box(x, s - 15, y(10), 30, 10, '#201812', 'rgba(' + O + ',.5)');
}
function drawEscalator(x: CanvasRenderingContext2D, v: View, wx: number) {
  const { y, t } = v, s = v.sx(wx);
  if (!onScreen(v, s - 40, 120)) return;
  const top = G.beam.under;
  box(x, s - 30, y(top), 62, top, '#0a0807', 'rgba(' + O + ',.7)');
  const g = x.createLinearGradient(0, y(top), 0, y(0));
  g.addColorStop(0, 'rgba(255,230,190,.3)'); g.addColorStop(1, 'rgba(255,230,190,.04)');
  x.fillStyle = g; x.fillRect(s - 28, y(top - 2), 58, top - 2);
  // the steps, creeping upward to the left
  x.strokeStyle = 'rgba(' + O + ',.6)'; x.beginPath(); x.moveTo(s + 26, y(4)); x.lineTo(s - 26, y(top - 10)); x.stroke();
  x.fillStyle = 'rgba(' + PAPER + ',.35)';
  for (let k = 0; k < 12; k++) {
    const f = ((k + t * 0.02) % 12) / 12;
    x.fillRect(Math.round(s + 26 - 52 * f), Math.round(y(4 + (top - 14) * f)) - 2, 6, 1);
  }
  // the handrail, waist high, rising with it
  x.strokeStyle = 'rgba(' + O + ',.85)'; x.beginPath(); x.moveTo(s + 30, y(24)); x.lineTo(s - 22, y(top)); x.stroke();
  exitPlate(x, v, s, '^ GALLERIA MALL');
}
function drawSnacks(x: CanvasRenderingContext2D, v: View, wx: number) {
  const { y, t, gy } = v, s = v.sx(wx);
  if (!onScreen(v, s - 30, 60)) return;
  const g = x.createRadialGradient(s, gy, 2, s, gy, 40);
  g.addColorStop(0, 'rgba(255,217,165,.08)'); g.addColorStop(1, 'rgba(255,217,165,0)');
  x.fillStyle = g; x.fillRect(s - 40, gy - 30, 80, 36);
  box(x, s - 18, y(64), 36, 64, '#1a120b', 'rgba(' + O + ',.8)');
  box(x, s - 15, y(60), 22, 44, 'rgba(255,217,165,.16)', 'rgba(' + O + ',.4)');
  const r = rng(61);
  for (let row = 0; row < 4; row++) for (let k = 0; k < 3; k++) { x.fillStyle = r() < 0.3 ? 'rgba(' + RED + ',.5)' : 'rgba(255,190,110,.45)'; x.fillRect(s - 13 + k * 7, y(56 - row * 11), 5, 6); }
  box(x, s + 9, y(50), 6, 10, '#04100f', 'rgba(' + C + ',.7)');
  box(x, s - 15, y(13), 22, 6, '#050302');
  tell(x, t, s + 12, y(36), 1);
}
return {drawTiledWall,drawPoster,drawFrieze,drawCeiling,drawStripLamp,drawColumn,drawEscalator,drawSnacks};
}
