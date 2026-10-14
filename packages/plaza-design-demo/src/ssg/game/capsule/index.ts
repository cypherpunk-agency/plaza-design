/**
 * Capsule 7B: your flat, where the game starts. What is in it is
 * data/capsule.json; what is left here is its own code: the flat's clock,
 * the router and Pixel (rules.ts) and the drawing (scene.ts). The engine in
 * zone/ runs the rest. The way out is the door, once CONCIERGE unlocks it.
 */

import { CAPSULE } from '../data';
import type { ZoneDef } from '../zone';
import { CAPSULE_RULES } from './rules';
import { DOOR_X, drawCapsule } from './scene';

export { CAPSULE_SPAWN, CAPSULE_W, capsulePerch, DOOR_X } from './scene';

/** The flat, complete: data, rules, view. The game hosts it with `new ZoneHost(…, CAPSULE_ZONE)`. */
export const CAPSULE_ZONE: ZoneDef = {
  data: CAPSULE,
  rules: CAPSULE_RULES,
  view: {
    draw: (x, m, v, hover) => drawCapsule(x, m, v, hover),
    // the door: locked until CONCIERGE says otherwise, then the way to Downtown
    targets: (m) => [{ id: 'door', x: DOOR_X, label: m.label(m.get('doorOpen') ? 'prompt.out' : 'prompt.door'), promptH: 66 }],
    use: (id, m, say) => {
      if (id !== 'door') return;
      if (!m.get('doorOpen')) { say(m.line('door.locked')); return; }
      m.goal('out');
      return 'exit';
    },
  },
};
