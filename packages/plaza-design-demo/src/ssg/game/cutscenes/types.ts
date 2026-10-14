/**
 * Cutscenes: short, non-interactive scenes (no player, no HUD) with typed text
 * cards in letterbox bars. Any key or tap skips. See cutscenes/index.ts.
 */

/** What a cutscene's draw function gets every frame, in world units (game pixels). */
export interface CutView {
  viewW: number;
  viewH: number;
  /** Height of the top and bottom letterbox bars: the picture lives between them. */
  barTop: number;
  barBottom: number;
  /** `prefers-reduced-motion`: hold the camera and the animation still (cards still play). */
  reduced: boolean;
}

/** One line of text, typed out in the bottom bar from `at` to `until` (seconds). */
export interface TextCard {
  at: number;
  until: number;
  text: string;
}

/** The editable half of a cutscene (data/cutscenes.json). */
export interface CutsceneData {
  /** Shown in the window header while it plays. */
  title: string;
  /** Seconds; it hands over when this runs out. */
  duration: number;
  /** The zone it hands over to by default: 'downtown', 'yard' or a scene id. */
  next: string;
  cards: TextCard[];
}

export interface Cutscene extends CutsceneData {
  id: string;
  /** Draw the picture at `t` seconds. Lay things out once per view size, not per frame. */
  draw: (x: CanvasRenderingContext2D, view: CutView, t: number) => void;
}
