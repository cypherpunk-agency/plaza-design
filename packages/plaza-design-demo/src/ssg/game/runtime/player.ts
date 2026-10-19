import type {FeedbackReceipt} from '../engine/feedback-receipt';
/** Shared services available to scene rules. No dependency on any scene. */
/** The parts of the game's save Downtown reads and writes (runtime/save.ts `Save`). */
export interface PlayerState {
  handle: string;
  tokens: number;
  jump: boolean;
  controlled: string[];
  flags: Record<string, boolean>;
}

/** How scene rules reach the player: the save, and the game around it. */
export interface PlayerServices {
  save: () => PlayerState;
  /** Write the save and refresh the HUD (tokens, NODES). */
  persist: () => void;
  /** NODES: how many run outside the Registry (yours count). */
  nodes: () => number;
  /** The ACCESS GRANTED chime. */
  granted: (receipt?:FeedbackReceipt) => void;
  /** Downtown is cleared: the end screen. */
  end: () => void;
  /**
   * A story beat asks for a cutscene (the stacks' ACT II card): the game plays it once the screen
   * is free (no talk, panel or bubble open), then the player is back where they were.
   */
  cutscene?: (id: string) => void;
  /** Another scene's state key, as its save has it (the stacks ask Moth's place whether Sprat was fed). */
  sceneState?: (scene: string, key: string) => unknown;
}
