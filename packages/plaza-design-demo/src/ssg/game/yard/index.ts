/**
 * The back yard: the first zone on the hacking system (devices → nouns →
 * verbs, cables between nouns). What is in it is data/yard.json; what is
 * left here is its own code: the crane and the parcel (effects.ts), CAM-1
 * (camera.ts) and the drawing (scene.ts). The engine in zone/ runs the rest.
 */

import { YARD } from '../data';
import type { ZoneDef } from '../zone';
import { cameraPanel } from './camera';
import { YARD_RULES } from './effects';
import { drawYard, drawYardBackdrop, TRAY_X } from './scene';

export { YARD_SPAWN, YARD_W } from './scene';

/** The yard, complete: data, rules, view. The game hosts it with `new ZoneHost(…, YARD_ZONE)`. */
export const YARD_ZONE: ZoneDef = {
  data: YARD,
  rules: YARD_RULES,
  view: {
    panels: { camera: cameraPanel },
    /** The yard is walled in, so it draws its own backdrop (after the ground) instead of the open city. */
    draw: (x, m, v, hover, layer = 'all') => { if (layer !== 'devices') drawYardBackdrop(x, v); drawYard(x, m, v, hover, layer); },
    // the way out is the open passage at the left edge: walk into it (city.ts EDGES), no E
    targets: (m) => (m.get('parcelAt') === 'tray' ? [{ id: 'tray', x: TRAY_X, label: m.label('prompt.take'), promptH: 26 }] : []),
    use: (id, m, say) => {
      if (id === 'tray' && m.get('parcelAt') === 'tray') {
        m.set('parcelAt', 'taken'); m.goal('take');
        say(m.line('parcel.take'));
      }
    },
  },
};
