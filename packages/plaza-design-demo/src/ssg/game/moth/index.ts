/**
 * Moth's place (story Level 3): flat 4C, reached from Downtown's east end
 * with Moth's key chip. What is in it, FRIENDNET and MOTH-PC included, is
 * data/moth.json; the code is two derived values and a few goals (rules.ts)
 * and the drawing (scene.ts). The engine in engine/ runs the rest: the drawer's
 * key seal (P09), the journal's song seal and the Registry's watchdog (P10).
 * The way out is the door, back onto the street.
 */

import { MOTH } from '../data';
import type { SceneDef } from '../scenes/kit';
import { MOTH_RULES } from './rules';
import { drawMoth, MOTH_DOOR_X, MOTH_SPAWN, MOTH_W } from './scene';

export { MOTH_KEY, UPLINK } from './rules';
export { MOTH_DOOR_X, MOTH_SPAWN, MOTH_W } from './scene';

/** The flat, complete: data, rules, drawing, the door. */
export const moth: SceneDef = {
  id: 'moth',
  name: "Moth's place",
  // facing (light.ts): the window looks west over the street: the evening sun
  facing: 270,
  width: MOTH_W,
  spawn: MOTH_SPAWN,
  exits: [{ id: 'door', x: MOTH_SPAWN, to: 'downtown', at: 'moth', label: '', engine: true }],
  intro: [
    "Moth's place. Lights on, record playing, nobody home.",
    'Takeaway boxes, a thirsty plant, a fish. Moth left in a hurry. Or Moth always lives like this. Both, probably.',
    "Moth's computer is the way in. It always is.",
  ],
  pixel: 'along',
  data: MOTH,
  rules: MOTH_RULES,
  drawBackdrop: (x, v, e) => drawMoth(x, e.m, v, e.hover),
  targets: (m) => [{ id: 'door', x: MOTH_DOOR_X, label: m.label('prompt.out'), promptH: 88 }],
  use: (id, m, say) => {
    if (id !== 'door') return;
    say(m.line('door.out'));
    return 'door';
  },
};
