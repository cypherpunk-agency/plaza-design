/** LINE 0 departure signs and scrolling notices. Drawing consumes data, never advances the timetable. */
import type { View } from '../core/view';
import { box, O, onScreen, PAPER, tell, text } from '../core/primitives';
import { clock } from '../../world/transport/line';
export interface DepartureVisual { open: boolean; station: string; destination: string; left: number; due: number; message: string }
export const TICKER = [
  'LINE 0 · DELAYS POSSIBLE · NO REASON WILL BE GIVEN',
  'IDENTITY CHECK AT ALL EXITS',
  'UNREGISTERED PASSENGERS WILL BE REMOVED AT THE NEXT STOP',
  'ALL JOURNEYS ARE RECORDED',
  'KEEP YOUR REGISTRY ID VISIBLE',
  'DO NOT HOLD THE DOORS',
];
export function ticker(x: CanvasRenderingContext2D, t: number, left: number, cy: number, w: number, lead: string, alpha = 0.8) {
  const msg = (lead ? lead + '   ·   ' : '') + TICKER.join('   ·   ') + '   ·   ';
  x.save(); x.beginPath(); x.rect(left, cy - 6, w, 12); x.clip();
  x.font = '600 7px "IBM Plex Mono", monospace'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(255,136,0,' + alpha + ')';
  const len = x.measureText(msg).width, off = (t * 0.5) % len;
  x.fillText(msg, Math.round(left + w - off), cy); x.fillText(msg, Math.round(left + w - off + len), cy);
  x.restore();
}
export function drawDepartures(x: CanvasRenderingContext2D, v: View, state: DepartureVisual, wx: number, h: number, roof: number) {
  const { y, t } = v, bx = v.sx(wx);
  if (!onScreen(v, bx - 62, 124)) return;
  x.strokeStyle = 'rgba(' + O + ',.5)'; x.beginPath();
  x.moveTo(bx - 40.5, y(roof)); x.lineTo(bx - 40.5, y(h)); x.moveTo(bx + 40.5, y(roof)); x.lineTo(bx + 40.5, y(h)); x.stroke();
  box(x, bx - 58, y(h), 116, 42, '#050302', 'rgba(' + O + ',.7)');
  if (!state.open) {
    // a closed station: no destination, no countdown
    text(x, 'LINE 0 · ' + state.station, bx, y(h - 8), 'rgba(' + PAPER + ',.8)', 7, '600');
    text(x, 'STATION CLOSED', bx, y(h - 20), 'rgba(255,90,80,.9)', 9, '600');
    x.fillStyle = 'rgba(' + O + ',.25)'; x.fillRect(bx - 54, y(h - 28), 108, 1);
    ticker(x, t, bx - 54, y(h - 35), 108, 'TRAINS DO NOT STOP AT THIS STATION · NO REASON WILL BE GIVEN', 0.55);
    tell(x, t, bx + 52, y(h - 4));
    return;
  }
  text(x, 'LINE 0 > ' + state.destination, bx, y(h - 8), 'rgba(' + PAPER + ',.8)', 7, '600');
  const { due, message: msg } = state;
  const hot = msg === 'BOARDING' || msg === 'CLOSING';
  text(x, msg, bx, y(h - 20), 'rgba(255,136,0,' + (hot ? 0.75 + 0.25 * Math.sin(t * 0.15) : 0.9) + ')', 9, '600');
  x.fillStyle = 'rgba(' + O + ',.25)'; x.fillRect(bx - 54, y(h - 28), 108, 1);
  ticker(x, t, bx - 54, y(h - 35), 108, due > 0 ? 'NEXT METRO ' + clock(due) : '', 0.55);
  tell(x, t, bx + 52, y(h - 4));
}
