/**
 * Title and eastward coast glide. This controller owns playback only; the authored zones, world
 * backdrop and timeline draw through runtime/render-scene.ts. The title's decorative clock keeps
 * moving while the menu waits; the glide has a separate seekable timeline. Painting never advances
 * either clock or commits its handoff. The closing shot blends into the playable Harbor platform.
 */

import type { Timeline } from "../../ui/transport";
import {renderOpeningDocument}from'./render';
import{lightAt,type Light}from'../../world/light';
import { openingDocuments } from './documents';
import type {OpeningDocuments} from './documents';

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
  skipped=false;
  /** The title's time when the glide started. */
  private t0 = 0;
  private titleTl: Timeline | null = null;
  private glideTl: Timeline | null = null;

  constructor(private reduced: boolean,private documents:OpeningDocuments=openingDocuments,private world:Pick<import('../../runtime/prepare-frame').ZoneSequenceOptions,'scenes'|'graph'|'backdrops'|'model'|'flags'|'compositions'|'citySource'>={}) { this.t = reduced ? this.rise : 0; }
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
  /** Explicit player skip: finish the active glide through its ordinary runtime handoff. */
  skip() {
    if (!this.gliding) return;
    this.skipped=true;
    this.tau = this.glide;
    this.t = this.t0 + this.glide;
    this.done = true;
  }
  /** The glide's current beat (composition.sequence), for diagnostics; null on the title. */
  get beat() { if (this.tau === null) return null; let id = ''; for (const b of this.glideSequence.beats) if (b.time <= this.tau) id = b.id; return id; }
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
  draw(x: CanvasRenderingContext2D, W: number, H: number,playGround?:number,lighting:Light=lightAt(1,580,90,null)) {
    x.save();
    const frame=renderOpeningDocument(x, { W, H, reduced: this.reduced,lighting }, this.documents, this.tau === null ? 'title' : 'glide', this.tau ?? this.t, { ...this.world,ambientTime: this.t,playGround });
    x.restore();return frame;
  }
}
