/** Platform pieces shared by all metro stations. */
import type { View } from '../core/view';
import { box, C, O, onScreen, PAPER, RED, tell, text } from '../core/primitives';
import { TRAIN } from '../../world/transport/line';
import { drawRider, SEAT_H, type RiderKind } from '../characters/riders';


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


/** The station's name on a plate: LINE 0's orange roundel, then the name. Hung on two rods from `roof` when given, else fixed to the wall. */
export function nameplate(x: CanvasRenderingContext2D, v: View, s: number, h: number, name: string, roof?: number, alpha = 0.92) {
  const { y } = v, w = 40 + name.length * 7;
  if (!onScreen(v, s - w / 2 - 4, w + 8)) return;
  if (roof !== undefined) { x.fillStyle = 'rgba(' + O + ',.5)'; x.fillRect(s - w / 2 + 12, y(roof), 1, roof - h); x.fillRect(s + w / 2 - 13, y(roof), 1, roof - h); }
  box(x, s - w / 2, y(h), w, 20, '#0e0a08', 'rgba(' + O + ',' + (0.75 * alpha) + ')');
  box(x, s - w / 2 + 3, y(h - 3), 16, 14, 'rgba(' + O + ',' + (0.85 * alpha) + ')');
  text(x, '0', s - w / 2 + 11, y(h - 10), '#0e0a08', 9, '700');
  text(x, name, s + 10, y(h - 10), 'rgba(' + PAPER + ',' + alpha + ')', 9, '600');
}


/** A bench, maybe with someone on it (`who`: what kind of person) who has given up waiting. */
export function drawBench(x: CanvasRenderingContext2D, v: View, b: { x: number; who?: RiderKind }) {
  const { y, t } = v, s = v.sx(b.x);
  if (!onScreen(v, s - 30, 60)) return;
  box(x, s - 26, y(28), 52, 3, '#2a160a', 'rgba(' + O + ',.6)');
  box(x, s - 22, y(SEAT_H), 3, SEAT_H, '#2a160a'); box(x, s + 19, y(SEAT_H), 3, SEAT_H, '#2a160a');
  if (b.who) drawRider(x, b.who, s + 8, y(0), t, { sit: true, phase: b.x });
  box(x, s - 26, y(SEAT_H + 2), 52, 4, '#2a160a', 'rgba(' + O + ',.8)');
}


/** What the Registry's screens say, a pair of lines at a time. */
const SLOGANS = [['COMPLIANCE', 'IS COMFORT'], ['REGISTRY ID', 'REQUIRED'], ['ALL JOURNEYS', 'ARE RECORDED'], ['REPORT', 'IRREGULARITIES'], ['STAND BEHIND', 'THE LINE']];


/** A Registry screen hung on two rods from `roof`: its slogans, a scan line, a red REC light. Pages through every three seconds. */
export function drawScreen(x: CanvasRenderingContext2D, v: View, wx: number, h: number, roof: number, phase = 0) {
  const { y, t } = v, s = v.sx(wx);
  if (!onScreen(v, s - 40, 80)) return;
  x.fillStyle = 'rgba(' + O + ',.5)'; x.fillRect(s - 24, y(roof), 1, roof - h); x.fillRect(s + 23, y(roof), 1, roof - h);
  const g = x.createRadialGradient(s, y(h - 17), 2, s, y(h - 17), 60);
  g.addColorStop(0, 'rgba(255,200,170,.08)'); g.addColorStop(1, 'rgba(255,200,170,0)');
  x.fillStyle = g; x.fillRect(s - 60, y(h + 40), 120, 100);
  box(x, s - 36, y(h), 72, 34, '#0c0605', 'rgba(' + O + ',.7)');
  box(x, s - 33, y(h - 3), 66, 28, '#1a0d0a');
  const lines = SLOGANS[Math.floor((t + phase * 97) / 180) % SLOGANS.length];
  text(x, lines[0], s, y(h - 11), 'rgba(255,205,175,.9)', 7, '600'); text(x, lines[1], s, y(h - 21), 'rgba(255,205,175,.9)', 7, '600');
  x.fillStyle = 'rgba(255,205,175,.06)'; x.fillRect(s - 33, Math.round(y(h - 3) + ((t * 0.4) % 28)), 66, 2);
  x.fillStyle = Math.floor(t / 30) % 2 ? 'rgba(' + RED + ',.95)' : 'rgba(' + RED + ',.3)'; x.fillRect(s + 28, y(h - 5), 2, 2);
  tell(x, t, s - 30, y(h - 30), phase);
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
