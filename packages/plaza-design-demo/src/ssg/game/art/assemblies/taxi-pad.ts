/** Shared world artwork extracted without changing drawing bodies. */
import type { View } from '../core/view';
import { box, C, O, onScreen, sign, tell } from '../core/primitives';
import { drawCab } from '../vehicles/cab';



// ---------- stands and stairs in the play band ----------

/** A sky-taxi stand: a landing pad on the ground, a pole with its SKY TAXI plate and a call box, a cab waiting over the pad. */
export function drawTaxiPad(x: CanvasRenderingContext2D, v: View, wx: number) {
  const { y, t } = v, s = v.sx(wx);
  if (!onScreen(v, s - 60, 120)) return;
  // the pad: a low deck with hazard stripes and landing lights
  box(x, s - 32, y(5), 80, 5, '#1a120b', 'rgba(' + O + ',.85)');
  for (let i = 0; i < 80; i += 8) { x.fillStyle = 'rgba(255,210,58,.55)'; x.fillRect(s - 32 + i, y(3), 4, 2); }
  for (let i = 0; i < 6; i++) {
    const on = Math.floor(t / 12) % 6 === i;
    x.fillStyle = on ? 'rgba(255,240,215,.95)' : 'rgba(255,190,110,.3)'; x.fillRect(s - 26 + i * 13, y(6), 2, 1);
  }
  // the pole, its plate on top, the call box on it
  box(x, s - 30, y(92), 3, 87, '#2a160a', 'rgba(' + O + ',.6)');
  sign(x, t, 'SKY TAXI', s - 18, y(100), C, { size: 8, phase: 140 });
  box(x, s - 36, y(54), 10, 14, '#0d1416', 'rgba(' + C + ',.7)');
  x.fillStyle = 'rgba(' + C + ',.35)'; x.fillRect(s - 34, y(51), 6, 4);
  tell(x, t, s - 31, y(44), 1);
  // a cab waiting over the pad, beside where you stand to hail it
  drawCab(x, s + 28, y(20 + Math.sin(t * 0.04) * 2), 1, t);
}