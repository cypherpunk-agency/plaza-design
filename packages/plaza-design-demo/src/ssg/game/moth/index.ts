/**
 * Moth's place (story Level 3): flat 4C, reached from Downtown's east end
 * with Moth's key chip. What is in it, FRIENDNET and MOTH-PC included, is
 * data/moth.json; the code is two derived values and a few goals (rules.ts)
 * and the drawing (scene.ts). The engine in scene/ runs the rest: the drawer's
 * key seal (P09), the journal's song seal and the Registry's watchdog (P10).
 * The way out is the door, back onto the street.
 */

import { MOTH } from '../data';
import type { EngineDef } from '../engine';
import { MOTH_RULES } from './rules';
import { drawMoth, MOTH_DOOR_X } from './scene';

export { MOTH_KEY, UPLINK } from './rules';
export { MOTH_DOOR_X, MOTH_SPAWN, MOTH_W } from './scene';

/** The flat, complete: data, rules, view. The game hosts it with `hostZone(MOTH_ZONE)`. */
export const MOTH_ZONE: EngineDef = {
  data: MOTH,
  rules: MOTH_RULES,
  view: {
    draw: (x, m, v, hover) => drawMoth(x, m, v, hover),
    targets: (m) => [{ id: 'door', x: MOTH_DOOR_X, label: m.label('prompt.out'), promptH: 88 }],
    use: (id, m, say) => {
      if (id !== 'door') return;
      say(m.line('door.out'));
      return 'exit';
    },
  },
};
