/**
 * The back yard: the first scene on the hacking system (devices → nouns →
 * verbs, cables between nouns). What is in it is data/yard.json; what is
 * left here is its own code: the crane and the parcel (effects.ts), CAM-1
 * (camera.ts) and the drawing (scene.ts). The engine in engine/ runs the rest.
 */

import { YARD } from '../data';
import type { SceneDef } from '../scenes/kit';
import { cameraPanel } from './camera';
import { YARD_RULES } from './effects';
import { drawYard, drawYardBackdrop, TRAY_X, YARD_SPAWN, YARD_W } from './scene';

export { YARD_SPAWN, YARD_W } from './scene';

/** What the fixer's parcel holds: Moth's key chip (flat 4C, MOTH-PC's drawer) and uplink.so (your deck past your building). */
export const PARCEL = ['moth.key', 'uplink'];

/** The yard, complete: data, rules, drawing, the way out. */
export const yard: SceneDef = {
  id: 'yard',
  name: 'the back yard',
  width: YARD_W,
  spawn: YARD_SPAWN,
  // the way out is the open passage at the left edge: walk into it, no E
  exits: [{ id: 'downtown', x: YARD_SPAWN, to: 'downtown', at: 'yard', label: '< DOWNTOWN', edge: 'left' }],
  intro: (touch) => [
    "The fixer's back yard. My parcel is in here somewhere.",
    'Tap a thing to use it.',
    touch
      ? 'HACK, top right: hack vision, every device and its guts at once. BOARD: wire them up, add timers and switches.'
      : 'H: hack vision, every device and its guts at once. B: the board, to wire them up and add timers and switches.',
  ],
  // boxed in by the backs of houses: no city behind the yard, the street's floor and the rain
  ambient: { street: true, weather: true },
  keepFace: true,
  pixel: 'along',
  data: YARD,
  rules: YARD_RULES,
  panels: { camera: cameraPanel },
  layers: true,
  /** The yard is walled in, so it draws its own backdrop (after the ground) instead of the open city. */
  drawBackdrop: (x, v, e) => { if (e.layer !== 'devices') drawYardBackdrop(x, v); drawYard(x, e.m, v, e.hover, e.layer); },
  targets: (m) => (m.get('parcelAt') === 'tray' ? [{ id: 'tray', x: TRAY_X, label: m.label('prompt.take'), promptH: 26 }] : []),
  use: (id, m, say) => {
    if (id === 'tray' && m.get('parcelAt') === 'tray') {
      m.set('parcelAt', 'taken'); m.goal('take');
      say(m.line('parcel.take'));
      // what was in it (LEVELS L2): Moth's key chip and uplink.so, onto the keyring
      for (const k of PARCEL) { const l = m.give(k); if (l) say(l); }
    }
  },
};
