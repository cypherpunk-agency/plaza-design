/**
 * Sudo mode: `?sudo` in the URL, for building and testing the game.
 *
 * - The pause menu gets LEVELS: every scene and cutscene; pick one to go there.
 * - Everything is unlocked: every logic module, legs.so, every keyring item,
 *   tokens to spare, every place on the city map, the market gate open.
 *   Puzzles themselves stay unsolved, so they can still be played.
 * - Sudo plays on its own save and slots (`SUDO` in level.ts picks the keys),
 *   so the real run is never touched.
 */

import { DISTRICTS, HARBOR_FLAG, heardFlag, mappedFlag } from './city';
import { CUTSCENES } from './cutscenes';
import { KEYRING, LOGIC } from './data';
import type { Save } from './level';
import { SCENES, sceneTitle, type SceneId } from './scenes';
import { boardRide } from './scenes/line';

export { SUDO } from './level';

export interface Level { id: string; name: string; note: string }

/** `?sudo&locked`: test the harbor lock (P14 unsolved, no maglev pass) with everything else unlocked. */
const LOCKED = (() => { try { return new URLSearchParams(location.search).has('locked'); } catch { return false; } })();

/**
 * Story levels that start somewhere particular, not at a scene's spawn: `start` sets the world up
 * and returns the scene to enter. P14: on the train at Galleria, doors about to close, the run past
 * the siding next.
 */
const STORY: Record<string, { name: string; start: () => SceneId }> = {
  p14: { name: "P14 · THE STOP THAT ISN'T ON THE MAP", start: () => { boardRide('galleria', 240); return 'train'; } },
};
/** A story level's start (null: not one, `id` is a scene or cutscene). */
export const startLevel = (id: string): SceneId | null => STORY[id]?.start() ?? null;

/** Every place the game can start in, in the order you'd meet them. */
export function levels(): Level[] {
  return [
    ...Object.entries(STORY).map(([id, l]) => ({ id, name: l.name, note: 'LEVEL' })),
    ...Object.values(CUTSCENES).map((c) => ({ id: c.id, name: c.id.toUpperCase(), note: 'CUTSCENE' })),
    ...Object.entries(SCENES).map(([id, s]) => ({ id, name: sceneTitle(s), note: 'SCENE' })),
  ];
}

/** Give the save everything there is to own. Scene progress stays as it is. */
export function unlockAll(s: Save) {
  if (!s.handle) s.handle = 'root';
  s.jump = true;
  for (const m of LOGIC.modules) if (!s.modules.includes(m.id)) s.modules.push(m.id);
  for (const k of KEYRING.keys()) if (!s.keyring.includes(k)) s.keyring.push(k);
  s.tokens = Math.max(s.tokens, 99);
  for (const id of Object.keys(SCENES)) s.flags['seen:' + id] = true;
  // the whole city on the map: every district heard of and on record (the Spire and the Undercity too)
  for (const d of DISTRICTS) { s.flags[heardFlag(d.id)] = true; s.flags[mappedFlag(d.id)] = true; }
  s.flags.end = true; // the market gate stands open
  // the harbor open (P14) and Moth's maglev pass (P13's jacket) in your pocket; `?sudo&locked` tests the lock: neither
  if (LOCKED) { delete s.flags[HARBOR_FLAG]; delete s.items['maglev.pass']; }
  else { s.flags[HARBOR_FLAG] = true; s.items['maglev.pass'] = Math.max(1, s.items['maglev.pass'] ?? 0); }
  return s;
}
