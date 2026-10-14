/**
 * Sudo mode: `?sudo` in the URL, for building and testing the game.
 *
 * - The pause menu gets LEVELS: every zone, scene and cutscene; pick one to go there.
 * - Everything is unlocked: every logic module, legs.so, every keyring item,
 *   tokens to spare, every place on the city map, the market gate open.
 *   Puzzles themselves stay unsolved, so they can still be played.
 * - Sudo plays on its own save and slots (`SUDO` in level.ts picks the keys),
 *   so the real run is never touched.
 */

import { CUTSCENES } from './cutscenes';
import { KEYRING, LOGIC } from './data';
import type { Save } from './level';
import { SCENES } from './scenes';

export { SUDO } from './level';

export interface Level { id: string; name: string; note: string }

/** Every place the game can start in, in the order you'd meet them. */
export function levels(): Level[] {
  return [
    ...Object.values(CUTSCENES).map((c) => ({ id: c.id, name: c.id.toUpperCase(), note: 'CUTSCENE' })),
    { id: 'capsule', name: 'CAPSULE 7B', note: 'ZONE' },
    { id: 'downtown', name: 'DOWNTOWN', note: 'ZONE' },
    { id: 'yard', name: 'BACK YARD', note: 'ZONE' },
    { id: 'moth', name: "MOTH'S PLACE", note: 'ZONE' },
    ...Object.entries(SCENES).map(([id, s]) => ({ id, name: s.name.toUpperCase(), note: 'SCENE' })),
  ];
}

/** Give the save everything there is to own. Zone progress stays as it is. */
export function unlockAll(s: Save) {
  if (!s.handle) s.handle = 'root';
  s.jump = true;
  for (const m of LOGIC.modules) if (!s.modules.includes(m.id)) s.modules.push(m.id);
  for (const k of KEYRING.keys()) if (!s.keyring.includes(k)) s.keyring.push(k);
  s.tokens = Math.max(s.tokens, 99);
  for (const z of ['capsule', 'downtown', 'yard', 'moth', ...Object.keys(SCENES)]) s.flags['seen:' + z] = true;
  s.flags.end = true; // the market gate stands open
  return s;
}
