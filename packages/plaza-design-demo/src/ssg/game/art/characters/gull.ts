import { RED } from '../core/primitives';


/** A gull in flight, wings beating: white body, grey wings, 2 px a cell. */
export function gullFlying(x: CanvasRenderingContext2D, sx: number, sy: number, t: number, dir: number, robot = false) {
  const up = Math.floor(t / 7) % 2 === 0, c = Math.round(sx), r = Math.round(sy);
  x.fillStyle = robot ? '#6a6e78' : '#8a8e96';
  if (up) { x.fillRect(c - 7, r - 4, 2, 2); x.fillRect(c - 5, r - 2, 3, 2); x.fillRect(c + 2, r - 2, 3, 2); x.fillRect(c + 5, r - 4, 2, 2); }
  else { x.fillRect(c - 7, r + 1, 3, 2); x.fillRect(c - 4, r, 2, 2); x.fillRect(c + 2, r, 2, 2); x.fillRect(c + 4, r + 1, 3, 2); }
  x.fillStyle = robot ? '#9a9ea8' : '#e8e4dc'; x.fillRect(c - 2, r - 1, 5, 3);
  x.fillStyle = robot ? 'rgba(' + RED + ',.95)' : '#e8b030'; x.fillRect(c + (dir > 0 ? 3 : -4), r, 2, 1);
  if (robot) { x.fillStyle = '#3a3e46'; x.fillRect(c, r - 3, 1, 2); }
}