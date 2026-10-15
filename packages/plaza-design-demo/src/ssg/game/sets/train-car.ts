/**
 * Set piece (ART-GUIDE §12): a LINE 0 car from outside. A dark body with an orange rim and a
 * waist stripe, six bays: two doors (sliding open onto the lit inside) and four lit windows with
 * whoever rides in them; the lead car carries the headlight and its destination board.
 * Register: sets/index.ts (`train-car`). The inside of car 3 is the `train` scene.
 *
 * Drawn with the caller's `y` (heights above the platform edge, or above the rail) and the car's
 * left edge in screen x, so a platform draws it on its own camera and a cutscene in a scaled frame.
 */

import { box, O, text } from '../scenes/kit';
import { drawRider, type RiderKind } from '../scenes/riders';

/** A car's layout: length, the six bays (pitch, first offset, width), which bays are doors. Height 86 (top at 100). */
export const CAR = { len: 290, bay: 46, bay0: 14, bayW: 32, doorBays: [1, 4], top: 100, tall: 86 };

/** Who sits in a window this time (scenes/riders.ts `crowd`). */
export interface Rider { on: boolean; kind: RiderKind; flip: boolean; phase: number }

export interface CarLook {
  /** Animation clock (frames), for the riders. */
  t: number;
  /** Which car this is (0 leads), and everyone on the train, six seats a car. */
  c: number;
  riders: Rider[];
  /** The doors, 0 (shut) .. 1 (open). */
  open: number;
  /** The lead car's board: where it runs to. */
  dest?: string;
}

/** One car, its left edge at screen x `c0`. */
export function drawTrainCar(x: CanvasRenderingContext2D, c0: number, y: (h: number) => number, o: CarLook) {
  const T = CAR, riders = o.riders;
  box(x, c0, y(T.top), T.len, T.tall, '#14171a', 'rgba(' + O + ',.6)');
  x.fillStyle = 'rgba(' + O + ',.5)'; x.fillRect(c0 + 1, y(44), T.len - 2, 2);
  for (let i = 0; i < 6; i++) {
    const wx = c0 + T.bay0 + i * T.bay;
    if (T.doorBays.includes(i)) {
      // doors: open shows the lit inside, and a step of light on the platform edge
      const d = Math.round(o.open * 13);
      box(x, wx, y(74), T.bayW, 58, '#101316', 'rgba(' + O + ',.45)');
      if (d) {
        x.fillStyle = 'rgba(255,217,165,.45)'; x.fillRect(wx + 16 - d, y(72), d * 2, 56);
        x.fillStyle = 'rgba(255,217,165,.12)'; x.fillRect(wx + 16 - d - 4, y(16), d * 2 + 8, 14);
      }
      x.fillStyle = 'rgba(255,217,165,.25)'; x.fillRect(wx + 3 - d, y(66), 9, 14); x.fillRect(wx + 20 + d, y(66), 9, 14);
      continue;
    }
    // a lit window and whoever sits in it this time: nobody, one person, now and then two
    x.fillStyle = 'rgba(255,217,165,.32)'; x.fillRect(wx, y(84), 32, 24);
    const who = riders[o.c * 6 + i];
    if (who?.on) {
      x.save(); x.beginPath(); x.rect(wx, y(84), 32, 24); x.clip();
      const two = who.phase > 7.5;
      drawRider(x, who.kind, wx + (two ? 9 : 16), y(60), o.t, { sit: true, flip: who.flip, ps: 2, phase: who.phase });
      if (two) drawRider(x, riders[(o.c * 6 + i + 7) % riders.length].kind, wx + 23, y(60), o.t, { sit: true, flip: !who.flip, ps: 2, phase: who.phase + 3 });
      x.restore();
    }
  }
  if (o.c === 0) {
    x.fillStyle = 'rgba(255,240,215,.95)'; x.fillRect(c0 + 3, y(30), 5, 4);
    box(x, c0 + 6, y(98), 104, 11, '#050302');
    if (o.dest) text(x, '0 > ' + o.dest, c0 + 58, y(92.5), 'rgba(255,136,0,.9)', 7, '600');
  }
}
