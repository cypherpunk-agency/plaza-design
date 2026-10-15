/**
 * Set piece (ART-GUIDE §12): the Spire, from far off: the monolith. A black slab standing in the
 * bay on its plinth, thin seams of cold light running up it, a crown band, a pointed top with the
 * Registry's antenna and its red light, and a halo ring of air traffic circling it (the far side
 * of the ring passes behind it). No windows to speak of: it owns the skyline by being the one
 * thing that does not look lived in. Seen only from a distance (the overworld is out of reach in
 * Act I), so it is a silhouette: in the opening glide it has no name at all. Register:
 * sets/index.ts (`spire`).
 *
 * Drawn in its own frame: origin where its foot meets the water, x to the right, heights up
 * (y = -h). About 300 units to the antenna's light at scale 1 (the stacks' far band).
 */

import { O, RED } from '../scenes/kit';

export interface SpireLook {
  /** Animation clock in frames (the light blinks, the seams breathe, the halo turns). */
  t: number;
  /** The silhouette's fill (night: near black; dawn: a deep purple against the sky). */
  fill?: string;
  /** Outline alpha (orange) on the plinth and the slab's edges. */
  edge?: number;
  /** How bright the seams of light are (0: dark). */
  windows?: number;
  /** Light held on, halo still (reduced motion). */
  still?: boolean;
  /** A red glow round the light while it is on. */
  glow?: boolean;
  /** The ring of air traffic (default on). */
  halo?: boolean;
}

/** The antenna light's height and x, for whoever draws its reflection on the water. */
export const SPIRE_LIGHT = { x: 0, h: 300 };

/** The slab's half-width, its height to the shoulders, the point's top, the halo's height and radius. */
const HW = 23, SLAB = 248, PEAK = 282, HALO_H = 186, HALO_R = 54;
const SEAM = '170,225,235';

export function drawSpire(x: CanvasRenderingContext2D, o: SpireLook) {
  const y = (h: number) => -h, edge = o.edge ?? 0.12, win = o.windows ?? 1, fill = o.fill ?? '#040203';
  const t = o.still ? 0 : o.t;
  // the halo: craft circling the slab; the far half first (behind it)
  const halo = (front: boolean) => {
    if (o.halo === false) return;
    // the lane itself: a faint ring of light
    x.strokeStyle = 'rgba(255,200,170,' + (front ? 0.22 : 0.12) + ')'; x.lineWidth = 1; x.beginPath();
    x.ellipse(0, y(HALO_H), HALO_R, 7, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); x.stroke();
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + t * 0.004, s = Math.sin(a);
      if (front !== s > 0) continue;
      const px = Math.cos(a) * HALO_R, py = HALO_H - s * 7;
      if (!front && Math.abs(px) < HW) continue;
      const k = front ? 0.95 : 0.55;
      x.fillStyle = i % 4 === 0 ? 'rgba(255,61,90,' + k + ')' : 'rgba(255,225,190,' + k + ')';
      x.fillRect(Math.round(px) - 1, Math.round(y(py)) - 1, i % 5 === 0 ? 5 : 3, 2);
    }
  };
  halo(false);
  // the plinth in the water, and the slab's foot on it
  x.fillStyle = fill;
  x.fillRect(-46, y(12), 92, 12); x.fillRect(-34, y(20), 68, 8);
  x.strokeStyle = 'rgba(' + O + ',' + edge + ')'; x.lineWidth = 1; x.strokeRect(-45.5, y(12) + 0.5, 91, 11);
  // the slab and its point (a little off-centre, so it reads as a blade, not a roof)
  x.beginPath(); x.moveTo(-HW, y(20)); x.lineTo(-HW, y(SLAB)); x.lineTo(-4, y(PEAK)); x.lineTo(HW, y(SLAB + 10)); x.lineTo(HW, y(20)); x.closePath(); x.fill();
  // the edges catch a little light on the lit side
  x.fillStyle = 'rgba(' + O + ',' + edge * 1.4 + ')'; x.fillRect(HW - 1, y(SLAB + 10), 1, SLAB - 10);
  x.fillStyle = 'rgba(' + O + ',' + edge * 0.7 + ')'; x.fillRect(-HW, y(SLAB), 1, SLAB - 20);
  if (win > 0) {
    // the seams: thin vertical lines of cold light, breathing slowly, out of step
    for (let k = 0; k < 5; k++) {
      const sx = -HW + 6 + k * ((HW * 2 - 12) / 4), a = (0.22 + 0.16 * Math.sin(t * 0.03 + k * 1.7)) * win;
      x.fillStyle = 'rgba(' + SEAM + ',' + Math.min(0.9, a).toFixed(3) + ')';
      x.fillRect(Math.round(sx), y(SLAB - 16), 1, SLAB - 52);
    }
    // the crown band under the point, and a few dim floor lines
    x.fillStyle = 'rgba(' + SEAM + ',' + Math.min(0.9, 0.5 * win).toFixed(3) + ')'; x.fillRect(-HW + 2, y(SLAB - 8), HW * 2 - 4, 1);
  }
  halo(true);
  // the antenna on the point, and the red light
  x.fillStyle = fill; x.fillRect(-5, y(PEAK + 16), 2, 18);
  x.fillStyle = 'rgba(' + O + ',.2)'; x.fillRect(-5, y(PEAK + 16), 1, 16);
  const on = o.still || Math.sin(o.t * 0.05) > 0.2;
  x.fillStyle = on ? 'rgba(' + RED + ',.95)' : 'rgba(' + RED + ',.2)'; x.fillRect(-6, y(SPIRE_LIGHT.h + 1), 4, 3);
  if (on && o.glow) {
    const g = x.createRadialGradient(-4, y(SPIRE_LIGHT.h), 1, -4, y(SPIRE_LIGHT.h), 22);
    g.addColorStop(0, 'rgba(' + RED + ',.3)'); g.addColorStop(1, 'rgba(' + RED + ',0)');
    x.fillStyle = g; x.fillRect(-26, y(SPIRE_LIGHT.h + 22), 44, 44);
  }
}
