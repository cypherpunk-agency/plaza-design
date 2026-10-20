/**
 * Seeded sky traffic drawn from explicit actor positions and a view: an atmosphere layer of small, dark
 * craft far off (pods, haulers, delivery drones), drawn through the vehicle kit's air class and looping
 * their sky lanes with its lane helper (vehicles/kit.ts `laneAt`).
 */
import type { View } from '../core/view';
import { drawAircraft } from '../vehicles/air-traffic';
import { laneAt } from '../vehicles/kit';

export type SkyShipKind = 'pod' | 'hauler' | 'drone';
/** `ps` is the old sprite pixel size (1 or 2): how big it is on screen. */
export interface Ship { kind: SkyShipKind; ps: number; y: number; speed: number; offset: number; flip: boolean; depth: number }
/** Screen units per craft unit for each kind at ps 1 (a pod about 16 pixels long, a hauler 28, a drone 10). */
const SCALE: Record<SkyShipKind, number> = { pod: 16 / 140, hauler: 28 / 470, drone: 10 / 26 };
/** The far hull: dark, so the lane stays calmer than the play band. */
const HULL = '#30343e';

/** Same seeded fleet for the game and the isolated scene composer. */
export function createSkyShips(seed = 3): Ship[] {
  let state = seed;
  const random = () => (state = (state * 9301 + 49297) % 233280) / 233280;
  const kinds: SkyShipKind[] = ['pod', 'pod', 'hauler', 'drone'];
  return Array.from({ length: 9 }, (_, i) => {
    const depth = 0.15 + (i / 9) * 0.5;
    return { kind: kinds[i % kinds.length], ps: depth > 0.45 ? 2 : 1, y: 18 + random() * 120, speed: 0.04 + depth * 0.12, offset: random() * 3000, flip: random() < 0.5, depth };
  });
}
export function drawSkyShips(x: CanvasRenderingContext2D, v: View, ships: readonly Ship[]) {
  const span = v.viewW + 260;
  ships.forEach((s, i) => {
    const sc = SCALE[s.kind] * s.ps, dir = s.flip ? -1 : 1;
    const px = laneAt({ mode: 'loop', dir, speed: s.speed, length: span, start: s.offset - v.cam * s.depth }, v.t).offset - 130, cy = Math.round(s.y + 12);
    x.save(); x.translate(Math.round(px), cy); x.scale(sc, sc);
    drawAircraft(x, s.kind, { t: v.t, face: dir as 1 | -1, scale: sc, paint: HULL, cargo: false, box: null, phase: i * 13 });
    x.restore();
    if (s.kind === 'drone' && s.ps > 1) {
      // a delivery drone near enough to see its light on the street under it
      const beam = x.createLinearGradient(0, cy, 0, cy + 80);
      beam.addColorStop(0, 'rgba(255,230,140,.16)'); beam.addColorStop(1, 'rgba(255,230,140,0)');
      x.fillStyle = beam;
      x.beginPath(); x.moveTo(px - 2, cy); x.lineTo(px - 26, cy + 80); x.lineTo(px + 26, cy + 80); x.lineTo(px + 2, cy); x.closePath(); x.fill();
    }
  });
}
