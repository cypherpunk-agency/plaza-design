/**
 * Capsule 7B: your flat, where the game starts. What is in it is
 * data/capsule.json; what is left here is its own code: the flat's clock,
 * the router and Pixel (rules.ts) and the drawing (scene.ts). The engine in
 * engine/ runs the rest. The way out is the door, once CONCIERGE unlocks it.
 */

import { CAPSULE } from '../data';
import type { SceneDef } from '../scenes/kit';
import { CAPSULE_RULES } from './rules';
import { CAPSULE_SPAWN, CAPSULE_W, capsulePerch, DOOR_X, drawCapsule } from './scene';

export { CAPSULE_SPAWN, CAPSULE_W, capsulePerch, DOOR_X } from './scene';

/** The flat, complete: data, rules, drawing, the door. */
export const capsule: SceneDef = {
  id: 'capsule',
  name: 'Capsule 7B',
  width: CAPSULE_W,
  // by the bed; coming in from Downtown you land just inside the door
  spawn: CAPSULE_SPAWN,
  exits: [{ id: 'door', x: DOOR_X + 20, to: 'downtown', at: 'capsule', label: '', engine: true, sets: 'pixel' }],
  intro: (touch) => [
    'Capsule 7B. Home: four walls, one window, rent "pending".',
    "Door's locked, the router's dark, and Pixel is asleep on the bed, as is tradition.",
    touch
      ? 'Tap a thing to use it. HACK, top right: hack vision. BOARD: wire things up.'
      : 'Tap a thing to use it. H: hack vision. B: the board, to wire things up.',
  ],
  pixel: 'home',
  perch: capsulePerch,
  data: CAPSULE,
  rules: CAPSULE_RULES,
  drawBackdrop: (x, v, e) => drawCapsule(x, e.m, v, e.hover),
  // the door: locked until CONCIERGE says otherwise, then the way to Downtown
  targets: (m) => [{ id: 'door', x: DOOR_X, label: m.label(m.get('doorOpen') ? 'prompt.out' : 'prompt.door'), promptH: 66 }],
  use: (id, m, say) => {
    if (id !== 'door') return;
    if (!m.get('doorOpen')) { say(m.line('door.locked')); return; }
    m.goal('out');
    return 'door';
  },
};
