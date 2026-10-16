/**
 * Set piece (ART-GUIDE §12): the Galleria's glass dome, the mall's landmark on the skyline. A
 * half-ellipse of glass on a base block, its ribs lit warm from inside, GALLERIA on the base.
 * Register: sets/index.ts (`galleria-dome`).
 *
 * Drawn in its own frame: origin at the middle of its base, heights up (y = -h). 160 wide, 74 tall.
 * `lit`: how much the ribs glow (1 at night; the morning glide runs it a little brighter).
 */

import { text } from '../core/primitives';

export function drawGalleriaDome(x: CanvasRenderingContext2D, o: { fill?: string; lit?: number; label?: boolean } = {}) {
  const lit = o.lit ?? 1;
  x.fillStyle = o.fill ?? '#0e0806'; x.beginPath(); x.ellipse(0, -40, 70, 34, 0, Math.PI, 0); x.fill(); x.fillRect(-80, -40, 160, 40);
  x.strokeStyle = 'rgba(255,190,110,' + 0.4 * lit + ')'; x.lineWidth = 1; x.beginPath(); x.ellipse(0, -40, 70, 34, 0, Math.PI, 0); x.stroke();
  x.fillStyle = 'rgba(255,190,110,' + 0.16 * lit + ')'; for (let k = -60; k <= 60; k += 15) x.fillRect(k, -40 - Math.sqrt(Math.max(0, 1 - (k / 70) ** 2)) * 30, 1, 30);
  if (o.label !== false) text(x, 'GALLERIA', 0, -28, 'rgba(255,217,165,.5)', 7, '600');
}
