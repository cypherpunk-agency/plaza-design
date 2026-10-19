/**
 * The opening (ROADMAP "The opening: intro and tutorial", step 1): the title screen and the glide.
 *
 * Launching the game shows a sunrise over the sea: the sun comes up out of it (RISE, about 7 s;
 * any key or click skips it) and settles half up on the horizon, then the main menu pops in over it
 * (menu.ts, `showTitle`). Reduced motion: settled from the start. NEW GAME: the menu fades and the
 * same shot starts moving west (glide.ts), not skippable, about 78 s: the coast, the harbor, the
 * Spire across the bay, the Galleria, Downtown, and LINE 0 out of its tower and down under the street,
 * the camera following it into a cutaway of the ground to a glimpse of the Undercity, then the dark.
 * CONTINUE and LOAD GAME cut straight into the save.
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

import type { Timeline } from "../../ui/transport";
import {renderOpeningDocument}from'./render';
import{light}from'../../world/light';
import { openingDocuments } from './documents';
import type {OpeningDocuments} from '../../art/sequences/opening/sequence';

const titleSequence = openingDocuments.timeline.sequences.find(s => s.id === 'title')!;
const glideSequence = openingDocuments.timeline.sequences.find(s => s.id === 'glide')!;
export const RISE = titleSequence.duration, GLIDE = glideSequence.duration;

/**
 * The title shot and the glide: one picture, two clocks. game.ts steps and draws it instead of the
 * world while it runs. `t` is the title's (the sunrise until RISE, then the water moving); NEW GAME
 * notes it (`t0`) and the glide's `tau` runs from 0, with `t = t0 + tau` from then on. The frame is
 * a function of (t, tau) alone, so sudo's time control (transport.ts) can seek either.
 */
export class Opening {
  /** Seconds since the title came up (reduced motion: already settled). */
  t: number;
  /** Seconds into the glide; null while the title waits for a choice. */
  tau: number | null = null;
  done = false;
  /** The title's time when the glide started. */
  private t0 = 0;
  private titleTl: Timeline | null = null;
  private glideTl: Timeline | null = null;

  constructor(private reduced: boolean,private documents:OpeningDocuments=openingDocuments) { this.t = reduced ? this.rise : 0; }
  private get titleSequence(){return this.documents.timeline.sequences.find(s=>s.id==='title')!;}
  private get glideSequence(){return this.documents.timeline.sequences.find(s=>s.id==='glide')!;}
  private get rise(){return this.titleSequence.duration;}
  private get glide(){return this.glideSequence.duration;}

  /** The sun has settled on the horizon: the menu is up. */
  get risen() { return this.t >= this.rise; }

  /** Any key or click during the sunrise: straight to the settled shot. */
  skipRise() { if (this.tau === null && this.t < this.rise) this.t = this.rise; }

  /** NEW GAME: the same shot starts moving (from the settled one, if the sun was still coming up). */
  go() {
    if (this.tau !== null) return;
    this.skipRise();
    this.t0 = this.t;
    this.tau = 0;
  }

  get gliding() { return this.tau !== null; }
  /** Only the runtime controller commits this destination; drawing and seeking never do. */
  get handoff() { return this.glideSequence.handoff ? { ...this.glideSequence.handoff } : undefined; }

  /** Advance by `dt` seconds of play. The glide is done once play runs it to its end (a seek never ends it). */
  step(dt: number) {
    if (dt <= 0) return;
    if (this.tau === null) { this.t += dt; return; }
    this.tau = Math.min(this.glide, this.tau + dt);
    this.t = this.t0 + this.tau;
    if (this.tau >= this.glide) this.done = true;
  }

  /** Sudo's time control: the sunrise, or once NEW GAME is pressed, the glide. */
  get timeline(): Timeline {
    if (this.tau === null) {
      return this.titleTl ??= {
        id: 'title', label: 'TITLE', duration: this.rise, beats: this.titleSequence.beats.map(b=>({at:b.time,name:b.id})),
        time: () => this.t,
        seek: (s) => { if (this.tau === null) this.t = Math.max(0, s); },
      };
    }
    return this.glideTl ??= {
      id: 'glide', label: 'GLIDE', duration: this.glide, beats: this.glideSequence.beats.map(b=>({at:b.time,name:b.id})),
      time: () => this.tau ?? 0,
      seek: (s) => { if (this.tau === null) return; this.tau = Math.max(0, Math.min(this.glide, s)); this.t = this.t0 + this.tau; },
    };
  }

  /** Draw a frame into a context already scaled to world units. */
  draw(x: CanvasRenderingContext2D, W: number, H: number) {
    x.save();
    renderOpeningDocument(x, { W, H, reduced: this.reduced,lighting:light() }, this.documents, this.tau === null ? 'title' : 'glide', this.tau ?? this.t, { ambientTime: this.t });
    x.restore();
  }
}
