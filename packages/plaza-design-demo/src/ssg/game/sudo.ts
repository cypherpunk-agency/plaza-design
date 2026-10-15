/**
 * Sudo mode: `?sudo` in the URL, for building and testing the game.
 *
 * - The pause menu gets LEVELS: every scene and cutscene; pick one to go there. SANDBOX first: the
 *   engine's test bay (sandbox/), one bench per feature, reachable only here and by `?sudo&play=sandbox`.
 *   OPENING · TRAIN
 *   HOME (and · MORNING, DELETED) play the opening; it locks hacking until uplink.so, even here.
 * - Everything is unlocked: every logic module, every program (scan.so; `&noscan` leaves it out), legs.so, every keyring item,
 *   the items a later level asks for (the maglev pass), tokens to spare, every place on the city map, the market gate open.
 *   Puzzles themselves stay unsolved, so they can still be played.
 * - A time control (transport.ts) over the title's sunrise, the glide and every cutscene:
 *   timecode and beat, play/pause, step, speed, a scrubber. Space, `,` `.`, `[` `]`, Home, 1–9.
 * - Sudo plays on its own save and slots (`SUDO` in level.ts picks the keys),
 *   so the real run is never touched.
 */

import { DISTRICTS, HARBOR_FLAG, heardFlag, mappedFlag } from './city';
import { CUTSCENES } from './cutscenes';
import { KEYRING, LOGIC, NET } from './data';
import type { Save } from './level';
import { SCENES, sceneTitle, type ItemId, type SceneId } from './scenes';
import { boardRide } from './scenes/line';
import { OPENING_LEVELS } from './opening';

export { SUDO } from './level';

export interface Level { id: string; name: string; note: string }

/** `?sudo&locked`: test the harbor lock (P14 unsolved, no maglev pass) with everything else unlocked. */
const LOCKED = (() => { try { return new URLSearchParams(location.search).has('locked'); } catch { return false; } })();
/** `?sudo&noscan`: test the net before the library (no scan.so: LINKs only connect to what they know, no NET) with everything else unlocked. */
const NOSCAN = (() => { try { return new URLSearchParams(location.search).has('noscan'); } catch { return false; } })();

/**
 * Story levels that start somewhere particular, not at a scene's spawn: `start` sets the world up
 * and returns the scene to enter. P14: on the train at Galleria, doors about to close, the run past
 * the siding next.
 */
const STORY: Record<string, { name: string; start: () => SceneId }> = {
  // P16, the first hacking job: the library's reading room (add &noscan to play it without scan.so already owned)
  p16: { name: 'P16 · LONG OVERDUE (THE LIBRARY)', start: () => 'library' },
  p14: { name: "P14 · THE STOP THAT ISN'T ON THE MAP", start: () => { boardRide('galleria', 240); return 'train'; } },
  // P15, the end of Act I: the stacks at the gate booth (the scene keeps its progress; its watchdog starts on PORT AUTHORITY)
  p15: { name: 'P15 · NRLU 404 0451 (ACT I FINALE)', start: () => 'stacks' },
};
/** A story level's start (null: not one, `id` is a scene or cutscene). */
export const startLevel = (id: string): SceneId | null => STORY[id]?.start() ?? null;

/** Every place the game can start in, in the order you'd meet them. */
export function levels(): Level[] {
  return [
    // the opening: the title screen over the sunrise; its NEW GAME plays the glide into the train home (title/)
    // the engine's test bay (sandbox/): sudo only, its own scene save (RESET BAY 3 inside, or `reset sandbox --yes`)
    { id: 'sandbox', name: 'SANDBOX · QA BAY 3 (ENGINE TEST)', note: 'LEVEL' },
    { id: 'title', name: 'OPENING · TITLE AND GLIDE', note: 'LEVEL' },
    // the opening (opening.ts): hacking stays locked while you play it, sudo or not, until Moth's uplink.so
    ...OPENING_LEVELS.map((l) => ({ id: l.id, name: l.name, note: 'LEVEL' })),
    ...Object.entries(STORY).map(([id, l]) => ({ id, name: l.name, note: 'LEVEL' })),
    ...Object.values(CUTSCENES).map((c) => ({ id: c.id, name: c.id.toUpperCase(), note: 'CUTSCENE' })),
    ...Object.entries(SCENES).filter(([id]) => id !== 'sandbox').map(([id, s]) => ({ id, name: sceneTitle(s), note: 'SCENE' })),
  ];
}

/** Items (scenes/kit.ts `ITEMS`) that unlock a later level: sudo carries them from the start. */
const SUDO_ITEMS: ItemId[] = ['maglev.pass'];

/** Give the save everything there is to own. Scene progress stays as it is. */
export function unlockAll(s: Save) {
  if (!s.handle) s.handle = 'root';
  s.jump = true;
  for (const m of LOGIC.modules) if (!s.modules.includes(m.id)) s.modules.push(m.id);
  // the programs (scan.so); `?sudo&noscan` leaves them out, to test the net before the library
  if (NOSCAN) s.programs = s.programs.filter((p) => !NET.programs.some((x) => x.id === p));
  else for (const p of NET.programs) if (!s.programs.includes(p.id)) s.programs.push(p.id);
  for (const k of KEYRING.keys()) if (!s.keyring.includes(k)) s.keyring.push(k);
  s.tokens = Math.max(s.tokens, 99);
  // what story levels hand you to carry, so the next one can be played on its own (P13's maglev pass for P14's brake)
  for (const item of SUDO_ITEMS) if (!s.items[item]) s.items[item] = 1;
  for (const id of Object.keys(SCENES)) s.flags['seen:' + id] = true;
  // the whole city on the map: every district heard of and on record (the Spire and the Undercity too)
  for (const d of DISTRICTS) { s.flags[heardFlag(d.id)] = true; s.flags[mappedFlag(d.id)] = true; }
  s.flags.end = true; // the market gate stands open
  // the harbor open (P14); `?sudo&locked` tests the lock instead: harbor shut, and no maglev pass
  if (LOCKED) { delete s.flags[HARBOR_FLAG]; delete s.items['maglev.pass']; }
  else s.flags[HARBOR_FLAG] = true;
  return s;
}
