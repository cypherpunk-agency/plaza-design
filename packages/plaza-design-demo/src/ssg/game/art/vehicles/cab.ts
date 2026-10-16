/** Shared world artwork extracted without changing drawing bodies. */
import { box, O, PAPER } from '../core/primitives';



/** A sky taxi: a small hovering cab, warm lit cabin, its roof light, thrusters glowing under it. */
export function drawCab(x: CanvasRenderingContext2D, cx: number, base: number, k = 1, t = 0) {
  const u = (n: number) => Math.round(n * k), c = Math.round(cx), b = Math.round(base);
  const g = x.createRadialGradient(c, b + u(3), 1, c, b + u(3), u(16));
  g.addColorStop(0, 'rgba(255,190,110,.35)'); g.addColorStop(1, 'rgba(255,190,110,0)');
  x.fillStyle = g; x.fillRect(c - u(16), b - u(4), u(32), u(22));
  box(x, c - u(15), b - u(8), u(30), u(8), '#2a1608', 'rgba(' + O + ',.9)');
  box(x, c - u(8), b - u(14), u(15), u(7), '#1a0e06', 'rgba(' + O + ',.8)');
  x.fillStyle = 'rgba(' + PAPER + ',.55)'; x.fillRect(c - u(6), b - u(12), u(5), u(4)); x.fillRect(c + u(1), b - u(12), u(4), u(4));
  x.fillStyle = 'rgba(255,210,58,.95)'; x.fillRect(c - u(3), b - u(16), u(6), u(2));
  const on = Math.sin(t * 0.3) > 0;
  x.fillStyle = on ? 'rgba(255,220,170,.95)' : 'rgba(255,170,80,.7)';
  x.fillRect(c - u(12), b, u(5), Math.max(1, u(1))); x.fillRect(c + u(7), b, u(5), Math.max(1, u(1)));
  x.fillStyle = 'rgba(255,240,215,.95)'; x.fillRect(c + u(13), b - u(6), u(2), u(2));
}