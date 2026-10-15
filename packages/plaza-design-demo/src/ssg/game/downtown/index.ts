/**
 * Downtown, the first street, on the engine: every machine is a device on
 * the board with nouns and verbs, hack vision (H) and the board (B) work here
 * like in the yard, and the deck's keyboard stays as the last resort.
 * What is on the street is data/downtown.json; its own code is the effects
 * and save bridge (rules.ts, save.ts), CAM-3 (camera.ts), the drawing
 * (scene.ts) and the typed commands (shell.ts). The street's walls, people,
 * the fixer and travel stay in game.ts and level.ts.
 */

import { DOWNTOWN } from '../data';
import type { EngineDef } from '../engine';
import { cam3Panel } from './camera';
import { downtownRules, dlvX, type Player } from './rules';
import { drawDowntown } from './scene';

export { MAP_KIOSK_X } from './scene';
export { reconcile, syncGoals } from './save';
export { sceneShell, type SceneShell } from './shell';
export type { Player } from './rules';

/** Downtown, complete, for this player's save. The game hosts it with `new SceneHost(…, downtownZone(player))`. */
export function downtownZone(player: Player): EngineDef {
  const home = DOWNTOWN.devices.find((d) => d.id === 'dlv9')?.layout?.spot?.x ?? 0;
  return {
    data: DOWNTOWN,
    rules: downtownRules(player),
    view: {
      panels: { cam3: cam3Panel },
      draw: (x, m, v, hover) => drawDowntown(x, m, v, hover, dlvX(m, home)),
    },
  };
}
