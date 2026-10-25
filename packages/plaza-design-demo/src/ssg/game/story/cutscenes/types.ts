/**
 * Cutscenes: short, non-interactive scenes (no player, no HUD) with typed text
 * cards in letterbox bars. Any key or tap skips. See cutscenes/index.ts.
 */

/** What a cutscene's draw function gets every frame, in world units (game pixels). */
export type { CutView } from '../../art/core/view';
import type { CutView } from '../../art/core/view';

/** One line of text, typed out in the bottom bar from `at` to `until` (seconds). */
export interface TextCard {
  at: number;
  until: number;
  text: string;
  /** Optional local text-card placement offsets, authored by the timeline composer. */
  x?: number;
  h?: number;
}

/** The editable half of a cutscene (data/cutscenes.json). */
export interface CutsceneData {
  /** Shown in the window header while it plays. */
  title: string;
  /** Seconds; it hands over when this runs out. */
  duration: number;
  /** The scene it hands over to by default: 'downtown', 'yard', 'capsule' or a scene id. */
  next: string;
  /** Full authored destination; next remains the compatibility scene alias. */
  handoff?:import('../../art/core/timeline').Handoff;
  cards: TextCard[];
  /** Named moments in the picture, for sudo's time control (transport.ts); without them the cards are the beats. */
  beats?: { at: number; name: string }[];
}

export interface Cutscene extends CutsceneData {
  id: string;
  /** Direction of resident world models keeps the normal engine tick running. */
  liveWorld?:boolean;
  /** JSON compositions own their exact transition envelope; custom pictures retain the default. */
  ownsFade?: boolean;
  /** Existing cutscene player owns animation advancement; painting only reads prepared pictures. */
  advance?: (time:number) => void;
  seek?: (time:number) => void;
  prepare?: (context:CanvasRenderingContext2D,view:CutView,time:number) => void;
  /**
   * Draw the frame at `t` seconds through the one frame (runtime/render-scene.ts renderWorldFrame) at `scale`, adding
   * `director` (the player's letterbox and default fade) to the sequence's own direction.
   */
  render: (x: CanvasRenderingContext2D, view: CutView, t: number, scale: number, director: import('../../runtime/frame').FrameDirector) => void;
}
