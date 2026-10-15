/**
 * The opening (ROADMAP "The opening: intro and tutorial", step 1): the title screen and the glide.
 *
 * Launching the game shows a sunrise over the sea with the main menu over it (menu.ts,
 * `showTitle`). NEW GAME: the menu fades and the same shot starts moving west (glide.ts), not
 * skippable, about 54 s, into LINE 0's tunnel. CONTINUE and LOAD GAME cut straight into the save.
 *
 * THE HANDOVER (agreed with the story half of the opening: the train home, Downtown before, the
 * flat, the morning you are deleted). When the glide ends, game.ts calls:
 *
 *     save = newSave()                // a fresh save (sudo: unlockAll(newSave()))
 *     save.flags['opening:home'] = true   // OPENING_FLAG: the train, Downtown and the flat play "before"
 *     rideHome()                      // below: LINE 0 already running HARBOR → DOWNTOWN, doors shut
 *     enter('train')                  // the metro car (it is car 3 of 3), at its spawn
 *
 * `rideHome` uses the ride API that exists (scenes/line.ts): `boardRide('harbor', …)`, the same
 * call sudo's P14 makes for Galleria, then puts the train straight into its run to Downtown
 * (`ride.phase = 'running'`), so it pulls in at Downtown about 13 s later with its doors opening.
 * The harbor stays closed in a new save; the train never stands there with its doors open.
 */

import { LINE } from '../city';
import { boardRide, ride, RUN, SEG } from '../scenes/line';
import { drawGlide, GLIDE } from './glide';

export { GLIDE } from './glide';

/** The save flag the opening hands over with: you are on your way home, the night before you are deleted. */
export const OPENING_FLAG = 'opening:home';

/** LINE 0, car 3, already on its way from the harbor to Downtown, doors shut. */
export function rideHome() {
  boardRide('harbor', 120);
  Object.assign(ride, { phase: 'running', timer: 0, open: 0, to: LINE.indexOf('downtown'), d: 0, span: SEG, frames: RUN, halt: null, doors: false, say: 'NEXT: DOWNTOWN' });
}

/** The title shot and the glide: one picture, one clock. game.ts steps and draws it instead of the world while it runs. */
export class Opening {
  /** Seconds since the title came up. */
  t = 0;
  /** Seconds into the glide; null while the title waits for a choice. */
  tau: number | null = null;
  done = false;

  constructor(private reduced: boolean) {}

  /** NEW GAME: the same shot starts moving. */
  go() { if (this.tau === null) this.tau = 0; }

  get gliding() { return this.tau !== null; }

  step(dt: number) {
    this.t += dt;
    if (this.tau !== null) { this.tau += dt; if (this.tau >= GLIDE) this.done = true; }
  }

  /** Draw a frame into a context already scaled to world units. */
  draw(x: CanvasRenderingContext2D, W: number, H: number) {
    x.save();
    drawGlide(x, { W, H, reduced: this.reduced }, this.t, this.tau);
    x.restore();
  }
}
