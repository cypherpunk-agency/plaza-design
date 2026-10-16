/** A platform train, rendered from the transport simulation's visual snapshot. */
import type { View } from '../core/view';
import { onScreen } from '../core/primitives';
import { crowd } from '../characters/riders';
import { CAR, drawTrainCar } from './train-car';
export const PLATFORM_TRAIN = { cars: 3, car: CAR.len, gap: 8, track: 0.94, doorBays: CAR.doorBays, bay: CAR.bay, bay0: CAR.bay0, bayW: CAR.bayW };
export interface PlatformTrainVisual { x: number; open: number; moving: boolean; riderSeed: number; destination: string }
export function drawPlatformTrain(x: CanvasRenderingContext2D, v: View, state: PlatformTrainVisual | null) {
  const at = state;
  if (!at) return;
  const { y } = v, T = PLATFORM_TRAIN, nose = v.sx(at.x, T.track), riders = crowd(state!.riderSeed, T.cars * 6);
  if (at.moving) {
    const g = x.createRadialGradient(nose, y(40), 2, nose, y(40), 120);
    g.addColorStop(0, 'rgba(255,230,190,.2)'); g.addColorStop(1, 'rgba(255,230,190,0)');
    x.fillStyle = g; x.fillRect(nose - 120, y(160), 240, 160);
  }
  for (let c = 0; c < T.cars; c++) {
    const c0 = nose + c * (T.car + T.gap);
    if (!onScreen(v, c0, T.car)) continue;
    drawTrainCar(x, c0, y, { t: v.t, c, riders, open: at.open, dest: state!.destination });
  }
}
