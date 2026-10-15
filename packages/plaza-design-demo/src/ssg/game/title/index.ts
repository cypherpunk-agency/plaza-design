/**
 * The opening (ROADMAP "The opening: intro and tutorial", step 1): the title screen and the glide.
 *
 * Launching the game shows a sunrise over the sea with the main menu over it (menu.ts,
 * `showTitle`). NEW GAME: the menu fades and the same shot starts moving west (glide.ts), not
 * skippable, about 54 s, into LINE 0's tunnel. CONTINUE and LOAD GAME cut straight into the save.
 *
 * THE HANDOVER (to the story half of the opening, opening.ts: the train home, Downtown before,
 * the flat, the morning you are deleted). When the glide ends, game.ts `openingDone()`:
 *
 *     save = newSave()        // a fresh save (sudo: unlockAll(newSave())), every scene reset
 *     startOpening()          // game.ts: sets `opening:home` and enters `train` (car 3);
 *                             // entering it in that state runs `rideHome()`: LINE 0 on its run
 *                             // from the harbor's closed stop into Downtown, doors shut
 *
 * Nothing is reset before that: leave mid-glide (QUIT TO HOMEPAGE) and the old run is still there.
 */

import { drawGlide, GLIDE } from './glide';

export { GLIDE } from './glide';

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
