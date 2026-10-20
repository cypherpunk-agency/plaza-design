/** Platform pieces shared by all metro stations. */
import type { View } from '../core/view';
import { box, C, O, onScreen, RED, tell, text } from '../core/primitives';
import { TRAIN } from '../../world/transport/line';
import { drawRider, SEAT_H, type RiderKind } from '../characters/riders';
import { sloganScreen } from '../signage/screens';


// ---------- what both platforms share ----------

/** Heights up from the platform: the track bed's top (the train stands on it), the yellow line at the edge. */
export const DECK = 14;


/** The track bed behind the platform edge: ballast, two rails, sleepers in the track's parallax, the train, the yellow line. */
export function drawTrackBase(x:CanvasRenderingContext2D,v:View){
  const { y, sx } = v;
  x.fillStyle = '#020101'; x.fillRect(0, y(DECK), v.viewW, DECK - 2);
  x.fillStyle = 'rgba(160,150,140,.35)'; x.fillRect(0, y(8), v.viewW, 1); x.fillRect(0, y(11), v.viewW, 1);
  for (let wx = 0; wx < 2600; wx += 14) { const s = sx(wx, TRAIN.track); if (s >= -4 && s <= v.viewW) { x.fillStyle = 'rgba(60,40,25,.6)'; x.fillRect(s, y(6), 8, 2); } }
}
export function drawTrackEdge(x:CanvasRenderingContext2D,v:View){const {y}=v;
  x.fillStyle = 'rgba(255,210,58,.7)'; x.fillRect(0, y(2), v.viewW, 2);
}

/** The near floor strip: the slab you stand on with its warning, then the platform's face down into the dark. */
export function drawSlab(x: CanvasRenderingContext2D, v: View, width: number, fill: string) {
  const { gy } = v;
  x.fillStyle = '#020101'; x.fillRect(0, gy, v.viewW, v.viewH - gy);
  x.fillStyle = fill; x.fillRect(0, gy, v.viewW, 16);
  x.fillStyle = 'rgba(' + O + ',.55)'; x.fillRect(0, gy, v.viewW, 1);
  x.fillStyle = 'rgba(' + O + ',.25)'; x.fillRect(0, gy + 15, v.viewW, 1);
  for (let wx = 0; wx < width; wx += 260) { const s = v.sx(wx + 140); if (onScreen(v, s - 40, 80)) text(x, 'MIND THE GAP', s, gy + 8, 'rgba(255,210,58,.6)', 7, '600'); }
  // the platform's face: tiles going down, dimmer the lower
  for (let i = 0; i < 4; i++) { x.fillStyle = 'rgba(' + O + ',' + (0.07 - i * 0.015) + ')'; x.fillRect(0, gy + 22 + i * 8, v.viewW, 1); }
}


/** The station's name plate lives in the sign kit. */
export { nameplate } from '../signage/kit';


/** A bench, maybe with someone on it (`who`: what kind of person) who has given up waiting. */
export function drawBench(x: CanvasRenderingContext2D, v: View, b: { x: number; who?: RiderKind }, sourceRider?:()=>void) {
  const { y, t } = v, s = v.sx(b.x);
  if (!onScreen(v, s - 30, 60)) return;
  box(x, s - 26, y(28), 52, 3, '#2a160a', 'rgba(' + O + ',.6)');
  box(x, s - 22, y(SEAT_H), 3, SEAT_H, '#2a160a'); box(x, s + 19, y(SEAT_H), 3, SEAT_H, '#2a160a');
  if(sourceRider)sourceRider();else if (b.who) drawRider(x, b.who, s + 8, y(0), t, { sit: true, phase: b.x });
  box(x, s - 26, y(SEAT_H + 2), 52, 4, '#2a160a', 'rgba(' + O + ',.8)');
}


/** A Registry screen hung on two rods from `roof`: its slogans, a scan line, a red REC light, the cyan tell. Pages through every three seconds (sign kit sloganScreen). */
export function drawScreen(x: CanvasRenderingContext2D, v: View, wx: number, h: number, roof: number, phase = 0) {
  sloganScreen(x, v, { x: wx, h: h - 32, w: 68, tall: 30, mount: 'hang', to: roof, phase: phase * 97, tell: phase });
}


/** A camera on a bracket at height `h`, watching the platform, its red light recording. */
export function drawCam(x: CanvasRenderingContext2D, v: View, wx: number, h: number, flip = false) {
  const { y, t } = v, s = v.sx(wx), d = flip ? -1 : 1;
  if (!onScreen(v, s - 24, 48)) return;
  box(x, s - 2, y(h + 4), 4, 8, '#100c0a', 'rgba(' + O + ',.5)');
  box(x, s + (flip ? -18 : 2), y(h + 2), 16, 8, '#100c0a', 'rgba(' + O + ',.7)');
  x.fillStyle = Math.floor((t + wx) / 30) % 2 ? 'rgba(' + RED + ',.95)' : 'rgba(' + RED + ',.3)'; x.fillRect(s + d * 13 - 1, y(h - 1), 2, 2);
}


/** The way out: a cyan plate on a post, the LED that says you can use it. */
export function exitPlate(x: CanvasRenderingContext2D, v: View, s: number, label: string) {
  const { y, t } = v, w = label.length * 5 + 16;
  box(x, s + 30, y(64), 3, 64, '#2a160a', 'rgba(' + O + ',.6)');
  box(x, s + 31 - w / 2, y(76), w, 13, '#04100f', 'rgba(' + C + ',.6)');
  text(x, label, s + 31, y(69.5), 'rgba(' + C + ',.95)', 7, '600');
  tell(x, t, s + 31, y(34), 2);
}
