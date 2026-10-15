/**
 * Set piece (ART-GUIDE §12): the Spire, from far off. Its foot standing in the bay, the deck on
 * it, three towers on the deck, the Registry's antenna on the tallest with its red light, a few
 * lit windows. Seen only from a distance (the overworld is out of reach in Act I), so it is a
 * silhouette: in the opening glide it has no name at all. Register: sets/index.ts (`spire`).
 *
 * Drawn in its own frame: origin where its foot meets the water, x to the right, heights up
 * (y = -h). About 300 units to the antenna's light at scale 1 (the stacks' far band).
 */

import { O, PAPER, RED } from '../scenes/kit';

export interface SpireLook {
  /** Animation clock in frames (the light blinks). */
  t: number;
  /** The silhouette's fill (night: near black; dawn: a deep purple against the sky). */
  fill?: string;
  /** Outline alpha (orange) on the foot and the deck. */
  edge?: number;
  /** How bright the windows are (0: dark). */
  windows?: number;
  /** Light held on (reduced motion). */
  still?: boolean;
  /** A red glow round the light while it is on. */
  glow?: boolean;
}

/** The antenna light's height and x, for whoever draws its reflection on the water. */
export const SPIRE_LIGHT = { x: -2, h: 300 };

export function drawSpire(x: CanvasRenderingContext2D, o: SpireLook) {
  const y = (h: number) => -h, edge = o.edge ?? 0.12, win = o.windows ?? 1;
  x.fillStyle = o.fill ?? '#040203';
  x.fillRect(-8, y(150), 26, 150); x.fillRect(-60, y(172), 130, 22);
  x.fillRect(-50, y(230), 22, 58); x.fillRect(-18, y(260), 30, 88); x.fillRect(24, y(214), 24, 42);
  x.strokeStyle = 'rgba(' + O + ',' + edge + ')'; x.lineWidth = 1; x.strokeRect(-60.5, y(172) + 0.5, 130, 22); x.strokeRect(-7.5, y(150) + 0.5, 26, 150);
  x.fillStyle = 'rgba(' + O + ',.18)'; x.fillRect(-3, y(300), 2, 40);
  const on = o.still || Math.sin(o.t * 0.05) > 0.2;
  x.fillStyle = on ? 'rgba(' + RED + ',.85)' : 'rgba(' + RED + ',.2)'; x.fillRect(-4, y(302), 4, 3);
  if (on && o.glow) {
    const g = x.createRadialGradient(-2, y(300), 1, -2, y(300), 22);
    g.addColorStop(0, 'rgba(' + RED + ',.3)'); g.addColorStop(1, 'rgba(' + RED + ',0)');
    x.fillStyle = g; x.fillRect(-24, y(322), 44, 44);
  }
  if (win > 0) for (let i = 0; i < 12; i++) { x.fillStyle = 'rgba(' + PAPER + ',' + (0.08 + 0.1 * ((i * 7) % 3) / 2) * win + ')'; x.fillRect(-14 + (i % 4) * 7, y(250 - Math.floor(i / 4) * 22), 3, 2); }
}
