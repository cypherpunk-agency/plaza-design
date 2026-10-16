/** Shared world artwork extracted without changing drawing bodies. */
import type { View } from '../core/view';
import { box, C, O, onScreen, PAPER, sign, tell } from '../core/primitives';



/** Metro stairs going down from the street: an opening in the pavement, railings, and a METRO plate on a post. */
export function drawMetroStairs(x: CanvasRenderingContext2D, v: View, wx: number) {
  const { y, t, gy } = v, s = v.sx(wx);
  if (!onScreen(v, s - 50, 100)) return;
  // the stairwell, lit from below
  x.fillStyle = '#000'; x.fillRect(s - 30, gy, 60, 40);
  const g = x.createLinearGradient(0, gy + 40, 0, gy);
  g.addColorStop(0, 'rgba(255,230,190,.28)'); g.addColorStop(1, 'rgba(255,230,190,0)');
  x.fillStyle = g; x.fillRect(s - 30, gy, 60, 40);
  for (let i = 0; i < 7; i++) {
    x.fillStyle = 'rgba(' + PAPER + ',' + (0.2 + i * 0.05) + ')'; x.fillRect(s - 30 + i * 8, gy + 3 + i * 5, 9, 1);
    x.fillStyle = 'rgba(' + O + ',.25)'; x.fillRect(s - 30 + i * 8, gy + 3 + i * 5, 1, 5);
  }
  x.fillStyle = 'rgba(' + O + ',.8)'; x.fillRect(s - 31, gy, 2, 40); x.fillRect(s + 29, gy, 2, 40);
  // railings round the opening, waist high
  x.fillStyle = 'rgba(' + O + ',.85)';
  x.fillRect(s - 31, y(24), 62, 2);
  for (const px of [s - 31, s - 1, s + 29]) x.fillRect(px, y(24), 2, 24);
  x.fillStyle = 'rgba(' + O + ',.35)'; x.fillRect(s - 31, y(12), 62, 1);
  // the post with its plate
  box(x, s + 30, y(76), 3, 76, '#2a160a', 'rgba(' + O + ',.6)');
  sign(x, t, 'METRO', s + 31, y(84), C, { size: 9, phase: 60 });
  tell(x, t, s + 31, y(34), 2);
}