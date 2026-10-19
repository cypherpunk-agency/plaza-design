/** Synchronize authored device goal markers with current player progress. */
import type { SceneModel } from "../../engine/model";
import type { PlayerState } from "../../runtime/player";

/** Which goals the save says are reached (the same order as level.ts `objective`). */
export function reached(s: PlayerState): Record<string, boolean> {
  return {
    handle: !!s.handle,
    till: !!s.flags.till,
    box: s.controlled.includes('0x2F'),
    install: !!s.jump,
    relay: s.controlled.includes('0x31'),
    gate: !!s.flags.end,
  };
}

/** Tick the scene's goals the save has reached (the GOAL line follows them). */
export function syncGoals(m: SceneModel, s: PlayerState) {
  for (const [id, ok] of Object.entries(reached(s))) if (ok && m.data.goals.some((g) => g.id === id)) m.goal(id);
}
