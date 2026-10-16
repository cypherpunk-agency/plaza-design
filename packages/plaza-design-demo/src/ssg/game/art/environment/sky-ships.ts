/** Seeded sky traffic drawn from explicit actor positions and a view. */
import type { View } from '../core/view';
import { drawSprite, HULL, SPR, type Sprite } from '../core/sprites';
export interface Ship { sprite: Sprite; ps: number; y: number; speed: number; offset: number; flip: boolean; depth: number }
/** Same seeded fleet for the game and the isolated scene composer. */
export function createSkyShips(seed = 3): Ship[] {
  let state = seed;
  const random = () => (state = (state * 9301 + 49297) % 233280) / 233280;
  const hulls = [SPR.spinner, SPR.spinner, SPR.freighter, SPR.drone];
  return Array.from({ length: 9 }, (_, i) => {
    const depth = 0.15 + (i / 9) * 0.5;
    return { sprite: hulls[i % hulls.length], ps: depth > 0.45 ? 2 : 1, y: 18 + random() * 120, speed: 0.04 + depth * 0.12, offset: random() * 3000, flip: random() < 0.5, depth };
  });
}
export function drawSkyShips(x: CanvasRenderingContext2D, v: View, ships: readonly Ship[]) {
    const span = v.viewW + 260;
    for (const s of ships) {
      const px = ((s.offset + v.t * s.speed * (s.flip ? -1 : 1) - v.cam * s.depth) % span + span) % span - 130;
      const glow = s.sprite === SPR.drone ? 'rgba(255,42,68,.5)' : 'rgba(0,255,255,.3)';
      drawSprite(x, s.sprite, px, s.y + 10, { ps: s.ps, flip: s.flip, pal: HULL, glow });
      if (s.sprite === SPR.drone && s.ps > 1) {
        const beam = x.createLinearGradient(0, s.y + 10, 0, s.y + 90);
        beam.addColorStop(0, 'rgba(255,230,140,.16)');
        beam.addColorStop(1, 'rgba(255,230,140,0)');
        x.fillStyle = beam;
        x.beginPath(); x.moveTo(px - 2, s.y + 10); x.lineTo(px - 26, s.y + 90); x.lineTo(px + 26, s.y + 90); x.lineTo(px + 2, s.y + 10); x.closePath(); x.fill();
      }
    }
  }
