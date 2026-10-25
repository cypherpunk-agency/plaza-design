/**
 * Seeded sky traffic drawn from explicit actor positions and a view: the city's classic far sky ships
 * (spinner cars, freighters, red-eyed drones), drawn through the vehicle kit's air class and looping
 * their sky lanes with its lane helper (vehicles/kit.ts `laneAt`).
 */
import type { View } from '../core/view';
import { drawAircraft, spriteShipRows } from '../vehicles/air-traffic';
import { laneAt } from '../vehicles/kit';

export type SkyShipKind = 'spinner' | 'freighter' | 'skydrone';
/** `ps` is the sprite pixel size on screen (1 or 2). */
export interface Ship { kind: SkyShipKind; ps: number; y: number; speed: number; offset: number; flip: boolean; depth: number }
/** Units per sprite pixel inside the air class (air-traffic.ts SPRITE_PX). */
const SPRITE_PX = 9;

/** Same seeded fleet for the game and the isolated scene composer. */
export function createSkyShips(seed = 3): Ship[] {
  let state = seed;
  const random = () => (state = (state * 9301 + 49297) % 233280) / 233280;
  const kinds: SkyShipKind[] = ['spinner', 'spinner', 'freighter', 'skydrone'];
  return Array.from({ length: 9 }, (_, i) => {
    const depth = 0.15 + (i / 9) * 0.5;
    return { kind: kinds[i % kinds.length], ps: depth > 0.45 ? 2 : 1, y: 18 + random() * 120, speed: 0.04 + depth * 0.12, offset: random() * 3000, flip: random() < 0.5, depth };
  });
}
export function drawSkyShips(x: CanvasRenderingContext2D, v: View, ships: readonly Ship[]) {
  const span = v.viewW + 260;
  ships.forEach((s, i) => {
    const sc = s.ps / SPRITE_PX, dir = s.flip ? -1 : 1, bottom = s.y + 10;
    const px = laneAt({ mode: 'loop', dir, speed: s.speed, length: span, start: s.offset - (v.skyCam??v.cam) * s.depth }, v.t).offset - 130;
    // the sprite's frame is centred, so its underside lands where the old sprite stood
    x.save(); x.translate(Math.round(px), bottom - spriteShipRows(s.kind) * s.ps / 2); x.scale(sc, sc);
    drawAircraft(x, s.kind, { t: v.t, face: dir as 1 | -1, scale: sc, phase: i * 13 });
    x.restore();
    if (s.kind === 'skydrone' && s.ps > 1) {
      // a drone near enough to see its light on the street under it
      const beam = x.createLinearGradient(0, bottom, 0, bottom + 80);
      beam.addColorStop(0, 'rgba(255,230,140,.16)'); beam.addColorStop(1, 'rgba(255,230,140,0)');
      x.fillStyle = beam;
      x.beginPath(); x.moveTo(px - 2, bottom); x.lineTo(px - 26, bottom + 80); x.lineTo(px + 26, bottom + 80); x.lineTo(px + 2, bottom); x.closePath(); x.fill();
    }
  });
}
