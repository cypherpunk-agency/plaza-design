/**
 * The beach and SALT, its bar: a real beach at sunset, west of the harbor,
 * with Moth's boat moored at the end of the pier.
 *
 * Built as a scene on the hacking engine: its devices (the sunbed kiosk, the
 * jukebox, SALT's mixer, the lifeguard drone, the pier's lamp schedule, the
 * boat) are data/beach.json; the kiosk's billing and the drone's flag running
 * out are rules.ts; the drawing is scene.ts. Its life (people who talk, the
 * cat, ordering a drink, a gull to shoo, a crab, the Registry's notice) uses
 * the same shape as the explorable scenes (`people`, `uses`, `readables` on
 * the view), which the game hosts for any scene.
 *
 * Ways out: the stairs at the left end (E) and the left edge itself (walk
 * off) lead up to the promenade and the harbor (city.ts `EDGES.beach`).
 */

import { BEACH } from '../data';
import type { EngineDef } from '../engine';
import { BEACH_RULES } from './rules';
import { CRAB, drawBeach, GULL, L, PEOPLE } from './scene';

export { BEACH_RULES } from './rules';
export { BEACH_EDGE_X, BEACH_SPAWN, BEACH_W } from './scene';

/** The beach, complete: data, rules, view. The game hosts it with `hostZone(BEACH_ZONE)`. */
export const BEACH_ZONE: EngineDef = {
  data: BEACH,
  rules: BEACH_RULES,
  view: {
    draw: (x, m, v, hover) => drawBeach(x, m, v, hover),
    targets: (m) => [{ id: 'stairs', x: L.stairs, label: m.label('prompt.out'), promptH: 116 }],
    use: (id, m, say) => {
      if (id !== 'stairs') return;
      say(m.line('stairs.out'));
      return 'exit';
    },
    people: PEOPLE,
    readables: [
      { id: 'notice', x: L.board, name: 'PUBLIC BEACH', promptH: 102, pages: [
        'PUBLIC BEACH. OPEN TO VERIFIED PERSONS 06:00–22:00.',
        'TOWELS MUST DISPLAY A VALID ID. SAND IS MUNICIPAL PROPERTY. DO NOT REMOVE.',
        'UNVERIFIED BATHERS: SECTOR 4 (THE ROCKS). SWIMMING BEYOND THE BUOY IS NOT RECORDED AND NOT ADVISED.',
      ] },
    ],
    uses: [
      { id: 'order', x: L.order, label: '[E] ORDER · 2 TOKENS', name: 'LIME', promptH: 70, h: 70, use: (c) => {
        if (!c.pay(2)) return ['Two tokens. You have ' + c.tokens + '. I would lend you one, but I remember everything.', 'The jukebox is free. Just saying. Nobody listens to the bartender.'];
        c.set('beach:drink');
        return ['One SALT SPECIAL. Mostly lime. Do not tell the lime.', "Moth's usual was water with a slice of me in it. Cheaper. Moth was always cheaper."];
      } },
      { id: 'gull', x: L.gull, label: '[E] SHOO', name: 'GULL', promptH: 62, h: 50, use: (c) => {
        GULL.shooed = c.t;
        return GULL.n++ % 2 === 0
          ? ['The gull looks at your hands, finds no chips, and leaves in disgust.']
          : ['The gull circles once and lands back on its post. It was always going to come back.'];
      } },
      { id: 'crab', x: L.crab, label: '[E] POKE', name: 'CRAB', promptH: 24, h: 16, use: () => (CRAB.n++ % 2 === 0
        ? ['The crab raises one claw. You lower your hand. Fair.']
        : ['The crab walks off sideways, which is the only way it knows, then comes back the same way.']) },
    ],
  },
};

